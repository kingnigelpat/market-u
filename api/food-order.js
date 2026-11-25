import { getFirebaseAdmin, verifyAuth, verifyAdmin } from './_firebase.js';

// Secrets (bot tokens / API keys) live in private_settings/food_dispatch (admin-only),
// NOT in the publicly readable settings/food_dispatch document.

const DEFAULT_ORDER_FEE = 550;

function formatNaira(amount) {
    return '₦' + Math.round(Number(amount) || 0).toLocaleString('en-NG');
}

function normalizePhone(raw) {
    if (!raw) return '';
    let digits = String(raw).replace(/\D/g, '');
    if (digits.startsWith('0') && digits.length === 11) digits = '234' + digits.slice(1);
    return digits;
}

function parseChatIds(raw) {
    return String(raw || '')
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
}

async function sendTelegram(botToken, chatId, text) {
    const token = String(botToken || '').trim();
    if (!token || !chatId) return { sent: false, reason: 'missing_telegram_config' };
    try {
        const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok || !data.ok) {
            return { sent: false, reason: data.description || `http_${resp.status}` };
        }
        return { sent: true };
    } catch (err) {
        return { sent: false, reason: err.message };
    }
}

async function sendCallMeBot(phone, apiKey, text) {
    const cleanPhone = normalizePhone(phone);
    const key = String(apiKey || '').trim();
    if (!cleanPhone || !key) return { sent: false, reason: 'missing_callmebot_config' };
    try {
        const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(cleanPhone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(key)}`;
        const resp = await fetch(url);
        return resp.ok ? { sent: true } : { sent: false, reason: `http_${resp.status}` };
    } catch (err) {
        return { sent: false, reason: err.message };
    }
}

async function sendPushToTokens(adminApp, tokens, title, body, link) {
    const unique = [...new Set((tokens || []).filter(Boolean))];
    if (unique.length === 0) return;
    try {
        await adminApp.messaging().sendEachForMulticast({
            tokens: unique,
            notification: { title, body },
            webpush: { fcmOptions: { link }, notification: { title, body, icon: '/icon-192x192.png' } },
            data: { link, type: 'food_order' },
        });
    } catch (err) {
        console.warn('[FOOD-ORDER] FCM push warning:', err.message);
    }
}

async function loadConfig(db) {
    const [pubSnap, privSnap] = await Promise.all([
        db.collection('settings').doc('food_dispatch').get(),
        db.collection('private_settings').doc('food_dispatch').get(),
    ]);
    const pub = pubSnap.exists ? pubSnap.data() : {};
    const priv = privSnap.exists ? privSnap.data() : {};
    const parsedFee = Number(pub.orderFee);
    return {
        acceptingOrders: pub.acceptingOrders !== false,
        closedMessage: pub.closedMessage,
        orderFee: Number.isFinite(parsedFee) && parsedFee >= 0 ? Math.round(parsedFee) : DEFAULT_ORDER_FEE,
        paymentDetails: String(pub.paymentDetails || '').trim(),
        telegramBotToken: priv.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '',
        telegramChatIds: parseChatIds(priv.telegramChatIds || process.env.TELEGRAM_CHAT_ID || ''),
        adminWhatsApp: priv.adminWhatsApp || process.env.FOOD_ADMIN_WHATSAPP || '',
        callMeBotApiKey: priv.callMeBotApiKey || process.env.CALLMEBOT_API_KEY || '',
    };
}

// Sends the alert to every configured channel. Returns true if at least one succeeded.
async function broadcastAlert(cfg, text, extraTelegramChatIds = []) {
    const chatIds = [...new Set([...cfg.telegramChatIds, ...extraTelegramChatIds.filter(Boolean)])];
    const results = await Promise.all([
        ...chatIds.map((id) => sendTelegram(cfg.telegramBotToken, id, text)),
        sendCallMeBot(cfg.adminWhatsApp, cfg.callMeBotApiKey, text),
    ]);
    return { anySent: results.some((r) => r.sent), results };
}

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { action } = req.body || {};
        const adminApp = getFirebaseAdmin();
        const db = adminApp.firestore();

        // ── 1. STUDENT CREATES A WDU FOOD ORDER ───────────────────────────────
        if (action === 'create') {
            const authUser = await verifyAuth(req);
            const {
                vendorId = '',
                vendorName = 'Any Available WDU Vendor',
                items = [],
                customRequest = '',
                note = '',
                orderMessage = '',
                roomNumber = '',
                hostelLocation = '',
                gender = '',
                studentPhone = '',
                studentName = '',
            } = req.body || {};

            const cleanRoom = String(roomNumber || hostelLocation || '').trim();
            const cleanGender = String(gender || '').trim();
            const cleanCustom = String(customRequest || orderMessage || '').trim();
            const cleanNote = String(note || '').trim();

            if (!cleanRoom) {
                return res.status(400).json({ error: 'Please enter your hostel & room number.' });
            }
            if (cleanGender !== 'Male' && cleanGender !== 'Female') {
                return res.status(400).json({ error: 'Please select your gender (Male or Female).' });
            }

            const cfg = await loadConfig(db);
            if (!cfg.acceptingOrders) {
                return res.status(400).json({
                    error: cfg.closedMessage || 'WDU Food Dispatch is currently closed. Please check back during open hours.',
                });
            }

            // Resolve student name & optional profile phone
            let cleanName = String(studentName || '').trim();
            let cleanPhone = String(studentPhone || '').trim();
            if (!cleanName || !cleanPhone) {
                const userSnap = await db.collection('users').doc(authUser.uid).get();
                if (userSnap.exists) {
                    const uData = userSnap.data() || {};
                    if (!cleanName) cleanName = String(uData.name || '').trim();
                    if (!cleanPhone && uData.phone) cleanPhone = String(uData.phone).trim();
                }
            }
            if (!cleanName) {
                return res.status(400).json({ error: 'Please enter your name.' });
            }

            // Vendor lookup + authoritative menu item pricing
            let vendorTelegramChatId = '';
            let vendorPhone = '';
            let resolvedVendorName = String(vendorName || 'Any Available WDU Vendor');
            let vendorMenu = [];

            if (vendorId) {
                const vSnap = await db.collection('food_vendors').doc(String(vendorId)).get();
                if (vSnap.exists) {
                    const vData = vSnap.data() || {};
                    resolvedVendorName = vData.name || resolvedVendorName;
                    vendorPhone = normalizePhone(vData.vendorPhone || '');
                    vendorMenu = Array.isArray(vData.menuItems) ? vData.menuItems : [];
                    const vPriv = await db.collection('private_food_vendors').doc(String(vendorId)).get();
                    if (vPriv.exists) vendorTelegramChatId = vPriv.data().telegramChatId || '';
                }
            }

            // Resolve submitted menu items against server menu
            const qtyById = new Map();
            if (Array.isArray(items)) {
                for (const it of items) {
                    const itemId = String(it?.id || '').trim();
                    const rawQty = Math.floor(Number(it?.qty));
                    if (!itemId || !Number.isFinite(rawQty) || rawQty < 1) continue;
                    const prev = qtyById.get(itemId) || 0;
                    qtyById.set(itemId, Math.min(20, prev + rawQty));
                }
            }

            const resolvedItems = [];
            for (const [itemId, qty] of qtyById.entries()) {
                const menuItem = vendorMenu.find((m) => String(m?.id || '') === itemId && m?.available !== false);
                if (!menuItem) continue;
                const unitPrice = Math.max(0, Math.round(Number(menuItem.price) || 0));
                resolvedItems.push({
                    id: String(menuItem.id),
                    name: String(menuItem.name || 'Menu Item'),
                    unitPrice,
                    qty,
                    lineTotal: unitPrice * qty,
                });
            }

            const foodSubtotal = resolvedItems.reduce((sum, item) => sum + item.lineTotal, 0);
            const hasMenu = resolvedItems.length > 0;
            const hasCustom = cleanCustom.length > 0;

            if (!hasMenu && cleanCustom.length < 3) {
                return res.status(400).json({ error: 'Please pick at least one menu item or type what you want.' });
            }

            const orderFee = cfg.orderFee;
            const orderType = hasMenu && hasCustom ? 'mixed' : hasMenu ? 'menu' : 'custom';
            const needsPriceConfirm = hasCustom;
            const totalAmount = hasCustom ? null : foodSubtotal + orderFee;

            const summaryParts = [];
            if (hasMenu) {
                summaryParts.push(resolvedItems.map((i) => `${i.qty}x ${i.name} (${formatNaira(i.lineTotal)})`).join(', '));
            }
            if (hasCustom) {
                summaryParts.push(`Custom: ${cleanCustom}`);
            }
            if (cleanNote) {
                summaryParts.push(`Note: ${cleanNote}`);
            }
            const orderSummary = summaryParts.join(' | ');

            const orderCode = `WDU-${Math.floor(1000 + Math.random() * 9000)}`;
            const orderRef = db.collection('food_orders').doc();
            await orderRef.set({
                orderCode,
                studentId: authUser.uid,
                studentName: cleanName,
                gender: cleanGender,
                roomNumber: cleanRoom,
                hostelLocation: cleanRoom,
                studentPhone: cleanPhone,
                vendorId: String(vendorId || ''),
                vendorName: resolvedVendorName,
                orderType,
                needsPriceConfirm,
                items: resolvedItems,
                customRequest: cleanCustom.slice(0, 1000),
                note: cleanNote.slice(0, 500),
                orderMessage: orderSummary.slice(0, 1000),
                foodSubtotal,
                orderFee,
                confirmedFoodPrice: null,
                totalAmount,
                adminNote: '',
                schoolName: 'Western Delta University',
                status: 'new',
                alertSent: false,
                createdAt: adminApp.firestore.FieldValue.serverTimestamp(),
                updatedAt: adminApp.firestore.FieldValue.serverTimestamp(),
            });

            // Build WhatsApp forward message for the vendor
            const vendorLines = resolvedItems.map((it) => `• ${it.qty}x ${it.name} (${formatNaira(it.lineTotal)})`);
            const vendorBodyLines = [
                `Hello ${resolvedVendorName}, new Market-U order (${orderCode}):`,
                ...vendorLines,
            ];
            if (orderType === 'menu') {
                vendorBodyLines.push(`Food total: ${formatNaira(foodSubtotal)}`);
            } else {
                vendorBodyLines.push(`Custom request: ${cleanCustom}`);
            }
            if (cleanNote) vendorBodyLines.push(`Note: ${cleanNote}`);
            vendorBodyLines.push(`Deliver to WDU: ${cleanRoom} (${cleanGender} — ${cleanName})`);
            vendorBodyLines.push(
                orderType === 'menu'
                    ? 'Please prepare & confirm ready time.'
                    : 'Please confirm availability & price.'
            );
            const vendorText = vendorBodyLines.join('\n');

            const forwardLink = vendorPhone
                ? `\n\n👉 Forward to vendor (1 tap): https://wa.me/${vendorPhone}?text=${encodeURIComponent(vendorText)}`
                : '';

            // Build Telegram Agent alert for Admin
            const modeLabel = orderType === 'menu'
                ? 'FIXED MENU'
                : orderType === 'mixed'
                ? 'MENU + CUSTOM REQUEST — CONFIRM PRICE'
                : 'CUSTOM REQUEST — CONFIRM PRICE';

            const agentLines = [
                '🍽️ MARKET-U FOOD AGENT — NEW ORDER',
                `Order ID: ${orderCode}`,
                `Mode: ${modeLabel}`,
                `Vendor: ${resolvedVendorName}`,
                `Student: ${cleanName} (${cleanGender})`,
                `Room: ${cleanRoom}`,
            ];
            if (cleanPhone) agentLines.push(`Phone: ${cleanPhone}`);
            if (hasMenu) {
                agentLines.push('Items:');
                agentLines.push(...vendorLines);
            }
            if (hasCustom) agentLines.push(`Custom request: ${cleanCustom}`);
            if (cleanNote) agentLines.push(`Note: ${cleanNote}`);
            if (orderType === 'menu') {
                agentLines.push(`Food: ${formatNaira(foodSubtotal)} + Order fee: ${formatNaira(orderFee)} = Total: ${formatNaira(totalAmount)}`);
            } else {
                const foodLine = hasMenu ? `Menu food: ${formatNaira(foodSubtotal)} + custom item to confirm` : 'Custom food price to confirm';
                agentLines.push(`${foodLine} | Order fee: ${formatNaira(orderFee)}`);
            }

            const agentMessage =
                agentLines.join('\n') +
                forwardLink +
                `\n\nManage: https://market-u.vercel.app/admin/food`;

            const { anySent } = await broadcastAlert(cfg, agentMessage, [vendorTelegramChatId]);
            await orderRef.update({ alertSent: anySent });

            // Admin push notification as a backup channel
            try {
                const adminsSnap = await db.collection('users').where('role', '==', 'admin').get();
                const tokens = [];
                adminsSnap.forEach((d) => {
                    const data = d.data();
                    if (Array.isArray(data.fcmTokens)) tokens.push(...data.fcmTokens);
                    else if (data.fcmToken) tokens.push(data.fcmToken);
                });
                await sendPushToTokens(
                    adminApp,
                    tokens,
                    `New WDU Food Order (${orderCode})`,
                    `${cleanName} (${cleanGender}, ${cleanRoom}): ${orderSummary.slice(0, 80)}`,
                    '/admin/food'
                );
            } catch (e) {
                console.warn('[FOOD-ORDER] Admin push error:', e.message);
            }

            return res.status(200).json({
                ok: true,
                orderId: orderRef.id,
                orderCode,
                foodSubtotal,
                orderFee,
                totalAmount,
                needsPriceConfirm,
            });
        }

        // ── 2. ADMIN CONFIRMS PRICE / SENDS IN-APP REPLY TO STUDENT ───────────
        if (action === 'admin_reply') {
            await verifyAdmin(req);
            const { orderId, adminNote = '', confirmedFoodPrice } = req.body || {};
            if (!orderId) return res.status(400).json({ error: 'Missing orderId.' });

            const orderRef = db.collection('food_orders').doc(orderId);
            const snap = await orderRef.get();
            if (!snap.exists) return res.status(404).json({ error: 'Food order not found.' });
            const prev = snap.data() || {};

            const cleanNote = String(adminNote || '').trim().slice(0, 600);
            const updatePayload = {
                adminNote: cleanNote,
                updatedAt: adminApp.firestore.FieldValue.serverTimestamp(),
            };

            let updatedTotal = prev.totalAmount ?? null;
            if (confirmedFoodPrice !== undefined && confirmedFoodPrice !== '' && confirmedFoodPrice !== null) {
                const parsed = Number(confirmedFoodPrice);
                if (!Number.isFinite(parsed) || parsed < 0) {
                    return res.status(400).json({ error: 'Invalid confirmed food price.' });
                }
                const price = Math.max(0, Math.round(parsed));
                const fee = Number.isFinite(Number(prev.orderFee)) ? Number(prev.orderFee) : DEFAULT_ORDER_FEE;
                updatedTotal = price + fee;
                updatePayload.confirmedFoodPrice = price;
                updatePayload.totalAmount = updatedTotal;
                updatePayload.needsPriceConfirm = false;
            }

            await orderRef.update(updatePayload);

            // Push notification to student
            if (prev.studentId) {
                try {
                    const stu = await db.collection('users').doc(prev.studentId).get();
                    if (stu.exists) {
                        const s = stu.data();
                        const tokens = Array.isArray(s.fcmTokens) ? s.fcmTokens : s.fcmToken ? [s.fcmToken] : [];
                        const parts = [];
                        if (updatedTotal !== null) parts.push(`Total confirmed: ${formatNaira(updatedTotal)}`);
                        if (cleanNote) parts.push(cleanNote);
                        const body = parts.join(' — ') || 'Admin updated your food order.';
                        await sendPushToTokens(adminApp, tokens, `Food Order ${prev.orderCode}`, body.slice(0, 140), '/order-food');
                    }
                } catch (e) {
                    console.warn('[FOOD-ORDER] Student push warning:', e.message);
                }
            }

            return res.status(200).json({ ok: true });
        }

        // ── 3. ADMIN UPDATES ORDER STATUS ─────────────────────────────────────
        if (action === 'update_status') {
            await verifyAdmin(req);
            const { orderId, status } = req.body || {};
            const allowed = ['new', 'accepted', 'preparing', 'out_for_delivery', 'completed', 'cancelled'];
            if (!orderId || !allowed.includes(status)) return res.status(400).json({ error: 'Invalid orderId or status.' });

            const orderRef = db.collection('food_orders').doc(orderId);
            const snap = await orderRef.get();
            if (!snap.exists) return res.status(404).json({ error: 'Food order not found.' });
            const prev = snap.data();

            await orderRef.update({ status, updatedAt: adminApp.firestore.FieldValue.serverTimestamp() });

            if (status === 'completed' && prev.status !== 'completed' && prev.vendorId) {
                try {
                    await db.collection('food_vendors').doc(prev.vendorId).update({
                        completedOrdersCount: adminApp.firestore.FieldValue.increment(1),
                    });
                } catch (e) {
                    console.warn('[FOOD-ORDER] Could not increment vendor count:', e.message);
                }
            }

            const labels = {
                accepted: 'Your WDU food order has been accepted!',
                preparing: 'Your food is now being prepared.',
                out_for_delivery: 'Your food is on the way to your room!',
                completed: 'Your food order is marked as delivered. Enjoy!',
                cancelled: 'Your food order was cancelled. Check Market-U for details.',
            };
            if (labels[status] && prev.studentId) {
                try {
                    const stu = await db.collection('users').doc(prev.studentId).get();
                    if (stu.exists) {
                        const s = stu.data();
                        const tokens = Array.isArray(s.fcmTokens) ? s.fcmTokens : s.fcmToken ? [s.fcmToken] : [];
                        await sendPushToTokens(adminApp, tokens, `Food Order ${prev.orderCode}`, labels[status], '/order-food');
                    }
                } catch (e) {
                    console.warn('[FOOD-ORDER] Student push warning:', e.message);
                }
            }
            return res.status(200).json({ ok: true, status });
        }

        // ── 4. ADMIN: DETECT TELEGRAM CHAT IDs (after sending /start to the bot) ─
        if (action === 'telegram_detect') {
            await verifyAdmin(req);
            const token = String(req.body?.botToken || '').trim() || (await loadConfig(db)).telegramBotToken;
            if (!token) return res.status(400).json({ error: 'Paste your Telegram bot token first.' });

            const resp = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
            const data = await resp.json().catch(() => ({}));
            if (!data.ok) return res.status(400).json({ error: data.description || 'Invalid Telegram bot token.' });

            const chats = new Map();
            (data.result || []).forEach((u) => {
                const chat = u.message?.chat || u.my_chat_member?.chat || u.channel_post?.chat;
                if (chat?.id) {
                    chats.set(String(chat.id), {
                        id: String(chat.id),
                        name: chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.username || 'Unknown',
                        username: chat.username || '',
                    });
                }
            });
            return res.status(200).json({ ok: true, chats: [...chats.values()] });
        }

        // ── 5. ADMIN: SEND TEST ALERT TO ALL CHANNELS ─────────────────────────
        if (action === 'test_alert') {
            await verifyAdmin(req);
            const cfg = await loadConfig(db);
            const { anySent, results } = await broadcastAlert(
                cfg,
                '✅ Market-U Food Agent is connected! New WDU student food orders will arrive here automatically.'
            );
            const reasons = results.filter((r) => !r.sent).map((r) => r.reason);
            return res.status(200).json({ ok: anySent, reasons });
        }

        return res.status(400).json({ error: 'Unknown action.' });
    } catch (err) {
        console.error('[FOOD-ORDER] Error:', err);
        return res.status(err.statusCode || 500).json({ error: err.message || 'Internal server error' });
    }
}
