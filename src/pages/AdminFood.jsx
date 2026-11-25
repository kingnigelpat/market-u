import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    setDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
    callFoodOrderApi,
    FOOD_ORDER_STATUS,
    DEFAULT_FOOD_ORDER_FEE,
    formatNaira
} from '../utils/foodService';
import { formatWhatsAppNumber } from '../utils/phoneUtils';
import {
    ArrowLeft,
    Utensils,
    PlusCircle,
    Trash2,
    CheckCircle2,
    XCircle,
    Settings,
    Send,
    Loader,
    Clock,
    MapPin,
    Phone,
    ShieldCheck,
    AlertCircle,
    Edit3,
    MessageSquare
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';

function makeItemId() {
    return 'item_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
}

function buildVendorForwardMessage(ord) {
    const hasItems = Array.isArray(ord.items) && ord.items.length > 0;
    const room = ord.roomNumber || ord.hostelLocation || '';
    const genderPart = ord.gender ? `${ord.gender} — ` : '';
    const isFixedMenu = ord.orderType === 'menu' || (hasItems && !ord.customRequest && !ord.needsPriceConfirm);

    const lines = [`Hello ${ord.vendorName}, new Market-U order (${ord.orderCode}):`];
    if (hasItems) {
        ord.items.forEach((it) => {
            lines.push(`• ${it.qty}x ${it.name} (${formatNaira(it.lineTotal)})`);
        });
    }
    if (isFixedMenu) {
        lines.push(`Food total: ${formatNaira(ord.foodSubtotal)}`);
    } else if (ord.customRequest) {
        lines.push(`Custom request: ${ord.customRequest}`);
    } else if (!hasItems && ord.orderMessage) {
        lines.push(ord.orderMessage);
    }
    if (ord.note) lines.push(`Note: ${ord.note}`);
    lines.push(`Deliver to WDU: ${room} (${genderPart}${ord.studentName})`);
    lines.push(
        isFixedMenu
            ? 'Please prepare & confirm ready time.'
            : 'Please confirm availability & price.'
    );
    return lines.join('\n');
}

const VendorInlineEditor = ({ vendor, onStatus }) => {
    const [newName, setNewName] = useState('');
    const [newPrice, setNewPrice] = useState('');
    const [editPhone, setEditPhone] = useState(vendor.vendorPhone || '');
    const [saving, setSaving] = useState(false);

    const items = Array.isArray(vendor.menuItems) ? vendor.menuItems : [];

    const handleAddItem = async () => {
        const clean = newName.trim();
        const priceNum = Math.round(Number(newPrice));
        if (!clean || !Number.isFinite(priceNum) || priceNum < 0) return;
        setSaving(true);
        try {
            const updated = [...items, { id: makeItemId(), name: clean, price: priceNum, available: true }];
            await updateDoc(doc(db, 'food_vendors', vendor.id), { menuItems: updated });
            setNewName('');
            setNewPrice('');
        } catch (err) {
            onStatus('error', err.message || 'Could not add menu item.');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleAvailable = async (itemId) => {
        const updated = items.map((it) =>
            it.id === itemId ? { ...it, available: it.available === false } : it
        );
        try {
            await updateDoc(doc(db, 'food_vendors', vendor.id), { menuItems: updated });
        } catch (err) {
            onStatus('error', err.message || 'Could not update item.');
        }
    };

    const handleRemoveItem = async (itemId) => {
        const updated = items.filter((it) => it.id !== itemId);
        try {
            await updateDoc(doc(db, 'food_vendors', vendor.id), { menuItems: updated });
        } catch (err) {
            onStatus('error', err.message || 'Could not remove item.');
        }
    };

    const handleSavePhone = async () => {
        setSaving(true);
        try {
            await updateDoc(doc(db, 'food_vendors', vendor.id), { vendorPhone: editPhone.trim() });
            onStatus('success', `Updated WhatsApp number for ${vendor.name}.`);
        } catch (err) {
            onStatus('error', err.message || 'Could not update phone.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{
            marginTop: '0.5rem',
            padding: '0.85rem',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
        }}>
            <div>
                <label style={{ fontSize: '0.73rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                    Vendor WhatsApp Number (for 1-tap order forward)
                </label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="080..."
                        style={{ flex: 1, minWidth: 0, padding: '0.45rem 0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface-elevated)', color: 'var(--text)', fontSize: '0.82rem' }}
                    />
                    <button
                        type="button"
                        disabled={saving}
                        onClick={handleSavePhone}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.4rem 0.7rem', fontWeight: 700 }}
                    >
                        Save Phone
                    </button>
                </div>
            </div>

            <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.35rem' }}>
                    Menu Items &amp; Prices ({items.length})
                </div>
                {items.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.5rem' }}>
                        {items.map((it) => {
                            const isAvail = it.available !== false;
                            return (
                                <div
                                    key={it.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '0.5rem',
                                        padding: '0.4rem 0.6rem',
                                        borderRadius: 'var(--radius-md)',
                                        background: 'var(--surface-elevated)',
                                        border: '1px solid var(--border)',
                                        fontSize: '0.8rem',
                                        opacity: isAvail ? 1 : 0.6,
                                    }}
                                >
                                    <span style={{ fontWeight: 700 }}>
                                        {it.name} — <span style={{ color: 'var(--primary)' }}>{formatNaira(it.price)}</span>
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <button
                                            type="button"
                                            onClick={() => handleToggleAvailable(it.id)}
                                            style={{
                                                padding: '0.2rem 0.45rem',
                                                borderRadius: '6px',
                                                border: '1px solid var(--border)',
                                                background: isAvail ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.12)',
                                                color: isAvail ? '#059669' : '#DC2626',
                                                fontSize: '0.7rem',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {isAvail ? 'Available' : 'Sold Out'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem(it.id)}
                                            aria-label={`Remove ${it.name}`}
                                            style={{
                                                padding: '0.2rem 0.4rem',
                                                borderRadius: '6px',
                                                border: 'none',
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                color: '#DC2626',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                            }}
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem(); } }}
                        placeholder="Item name (e.g., Jollof Rice)"
                        style={{ flex: '2 1 140px', minWidth: 0, padding: '0.45rem 0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface-elevated)', color: 'var(--text)', fontSize: '0.8rem' }}
                    />
                    <input
                        type="number"
                        min="0"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem(); } }}
                        placeholder="Price ₦"
                        style={{ flex: '1 1 85px', minWidth: 0, padding: '0.45rem 0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface-elevated)', color: 'var(--text)', fontSize: '0.8rem' }}
                    />
                    <button
                        type="button"
                        disabled={saving || !newName.trim() || newPrice === ''}
                        onClick={handleAddItem}
                        className="btn btn-primary"
                        style={{ fontSize: '0.75rem', padding: '0.45rem 0.75rem', fontWeight: 800 }}
                    >
                        + Add
                    </button>
                </div>
            </div>
        </div>
    );
};

const OrderReplyForm = ({ order, onStatus }) => {
    const [open, setOpen] = useState(Boolean(order.needsPriceConfirm));
    const [confirmedPrice, setConfirmedPrice] = useState(
        order.confirmedFoodPrice !== null && order.confirmedFoodPrice !== undefined
            ? String(order.confirmedFoodPrice)
            : order.foodSubtotal > 0
            ? String(order.foodSubtotal)
            : ''
    );
    const [adminNote, setAdminNote] = useState(order.adminNote || '');
    const [saving, setSaving] = useState(false);

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                style={{
                    alignSelf: 'flex-start',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.35rem 0.7rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--primary)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                }}
            >
                <MessageSquare size={13} /> {order.adminNote ? 'Edit Reply / Confirm Price' : 'Reply / Confirm Price'}
            </button>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await callFoodOrderApi('admin_reply', {
                orderId: order.id,
                confirmedFoodPrice: confirmedPrice !== '' ? Number(confirmedPrice) : undefined,
                adminNote: adminNote.trim(),
            });
            onStatus('success', `Sent price/update to ${order.studentName} (${order.orderCode}).`);
            if (!order.needsPriceConfirm) setOpen(false);
        } catch (err) {
            onStatus('error', err.message || 'Could not send reply.');
        } finally {
            setSaving(false);
        }
    };

    const fee = Number.isFinite(Number(order.orderFee)) ? Number(order.orderFee) : DEFAULT_FOOD_ORDER_FEE;
    const previewTotal = confirmedPrice !== '' && Number.isFinite(Number(confirmedPrice))
        ? Math.round(Number(confirmedPrice)) + fee
        : null;

    return (
        <form
            onSubmit={handleSubmit}
            style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-lg)',
                background: order.needsPriceConfirm ? 'rgba(245, 158, 11, 0.08)' : 'var(--surface)',
                border: `1px solid ${order.needsPriceConfirm ? 'rgba(245, 158, 11, 0.35)' : 'var(--border)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.55rem',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', fontWeight: 800 }}>
                <span>
                    {order.needsPriceConfirm
                        ? 'Custom Order — Confirm Food Price for Student'
                        : 'Send In-App Update to Student'}
                </span>
                {!order.needsPriceConfirm && (
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                        Close
                    </button>
                )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                    type="number"
                    min="0"
                    value={confirmedPrice}
                    onChange={(e) => setConfirmedPrice(e.target.value)}
                    placeholder="Food price ₦ (excl. ₦550 fee)"
                    style={{ flex: '1 1 170px', minWidth: 0, padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface-elevated)', color: 'var(--text)', fontSize: '0.82rem' }}
                />
                <input
                    type="text"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Message to student (e.g. Available! Ready in 20 mins)"
                    style={{ flex: '2 1 220px', minWidth: 0, padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface-elevated)', color: 'var(--text)', fontSize: '0.82rem' }}
                />
                <button
                    type="submit"
                    disabled={saving}
                    className="btn btn-primary"
                    style={{ fontSize: '0.76rem', padding: '0.5rem 0.85rem', fontWeight: 800 }}
                >
                    {saving ? 'Sending...' : previewTotal !== null ? `Send (${formatNaira(previewTotal)} total)` : 'Send Update'}
                </button>
            </div>
        </form>
    );
};

const AdminFood = () => {
    const { isAdmin } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'vendors' | 'settings'
    const [orders, setOrders] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [updatingOrderId, setUpdatingOrderId] = useState(null);
    const [editingVendorId, setEditingVendorId] = useState(null);

    // Add Vendor form + Menu Items builder
    const [vName, setVName] = useState('');
    const [vLocation, setVLocation] = useState('');
    const [vMenu, setVMenu] = useState('');
    const [vHours, setVHours] = useState('9:00 AM – 9:00 PM');
    const [vPhone, setVPhone] = useState('');
    const [vMenuItems, setVMenuItems] = useState([]);
    const [draftItemName, setDraftItemName] = useState('');
    const [draftItemPrice, setDraftItemPrice] = useState('');
    const [savingVendor, setSavingVendor] = useState(false);

    // Dispatch settings (public) + alert secrets (private, admin-only)
    const [acceptingOrders, setAcceptingOrders] = useState(true);
    const [openHours, setOpenHours] = useState('9:00 AM – 9:00 PM');
    const [closedMessage, setClosedMessage] = useState('WDU Food Dispatch is currently closed. Please check back during open hours.');
    const [orderFee, setOrderFee] = useState(String(DEFAULT_FOOD_ORDER_FEE));
    const [paymentDetails, setPaymentDetails] = useState('');
    const [telegramBotToken, setTelegramBotToken] = useState('');
    const [telegramChatIds, setTelegramChatIds] = useState('');
    const [adminWhatsApp, setAdminWhatsApp] = useState('2348057278708');
    const [callMeBotApiKey, setCallMeBotApiKey] = useState('');
    const [detectedChats, setDetectedChats] = useState([]);
    const [detecting, setDetecting] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [testingWa, setTestingWa] = useState(false);
    const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

    useEffect(() => {
        document.title = 'Admin Food Vendors & Orders | Market-U';
    }, []);

    useEffect(() => {
        if (!isAdmin) return;
        const qOrders = query(collection(db, 'food_orders'), orderBy('createdAt', 'desc'));
        const unsubOrders = onSnapshot(qOrders, (snap) => {
            setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }, (err) => console.error('Orders snapshot error:', err));

        const qVendors = query(collection(db, 'food_vendors'), orderBy('createdAt', 'desc'));
        const unsubVendors = onSnapshot(qVendors, (snap) => {
            setVendors(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }, (err) => console.error('Vendors snapshot error:', err));

        const unsubSettings = onSnapshot(doc(db, 'settings', 'food_dispatch'), (snap) => {
            if (snap.exists()) {
                const d = snap.data();
                setAcceptingOrders(d.acceptingOrders !== false);
                if (d.openHours) setOpenHours(d.openHours);
                if (d.closedMessage) setClosedMessage(d.closedMessage);
                if (d.orderFee !== undefined && d.orderFee !== null) setOrderFee(String(d.orderFee));
                if (d.paymentDetails !== undefined) setPaymentDetails(d.paymentDetails);
            }
        });

        const unsubPrivate = onSnapshot(doc(db, 'private_settings', 'food_dispatch'), (snap) => {
            if (snap.exists()) {
                const d = snap.data();
                if (d.telegramBotToken !== undefined) setTelegramBotToken(d.telegramBotToken);
                if (d.telegramChatIds !== undefined) setTelegramChatIds(d.telegramChatIds);
                if (d.adminWhatsApp) setAdminWhatsApp(d.adminWhatsApp);
                if (d.callMeBotApiKey !== undefined) setCallMeBotApiKey(d.callMeBotApiKey);
            }
        }, () => {});

        return () => {
            unsubOrders();
            unsubVendors();
            unsubSettings();
            unsubPrivate();
        };
    }, [isAdmin]);

    if (!isAdmin) {
        return (
            <div className="container" style={{ maxWidth: '600px', padding: '4rem 1rem', textAlign: 'center' }}>
                <AlertCircle size={40} color="var(--danger)" style={{ margin: '0 auto 0.75rem' }} />
                <h2>Admin Access Required</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Only Market-U administrators can manage food vendors and orders.</p>
            </div>
        );
    }

    const handleAddDraftMenuItem = () => {
        const clean = draftItemName.trim();
        const priceNum = Math.round(Number(draftItemPrice));
        if (!clean || draftItemPrice === '' || !Number.isFinite(priceNum) || priceNum < 0) return;
        setVMenuItems((prev) => [...prev, { id: makeItemId(), name: clean, price: priceNum, available: true }]);
        setDraftItemName('');
        setDraftItemPrice('');
    };

    const handleAddVendor = async (e) => {
        e.preventDefault();
        if (!vName.trim()) return;
        setSavingVendor(true);
        setStatusMsg({ type: '', text: '' });

        // Include pending typed item if user filled both fields without clicking "+ Add Item"
        const finalItems = [...vMenuItems];
        const pendingName = draftItemName.trim();
        const pendingPrice = Math.round(Number(draftItemPrice));
        if (pendingName && draftItemPrice !== '' && Number.isFinite(pendingPrice) && pendingPrice >= 0) {
            finalItems.push({ id: makeItemId(), name: pendingName, price: pendingPrice, available: true });
        }

        try {
            await addDoc(collection(db, 'food_vendors'), {
                name: vName.trim(),
                location: vLocation.trim() || 'Outside WDU Main Gate',
                menuSummary: vMenu.trim(),
                menuItems: finalItems,
                openHours: vHours.trim() || '9:00 AM – 9:00 PM',
                vendorPhone: vPhone.trim(),
                schoolName: 'Western Delta University',
                isOpen: true,
                completedOrdersCount: 0,
                createdAt: serverTimestamp(),
            });
            setVName('');
            setVLocation('');
            setVMenu('');
            setVPhone('');
            setVMenuItems([]);
            setDraftItemName('');
            setDraftItemPrice('');
            setStatusMsg({ type: 'success', text: `Food vendor added to Western Delta University (${finalItems.length} menu item${finalItems.length === 1 ? '' : 's'}).` });
        } catch (err) {
            setStatusMsg({ type: 'error', text: err.message || 'Could not add vendor.' });
        } finally {
            setSavingVendor(false);
        }
    };

    const handleToggleVendorOpen = async (vendor) => {
        try {
            await updateDoc(doc(db, 'food_vendors', vendor.id), {
                isOpen: vendor.isOpen === false,
            });
        } catch (err) {
            alert(err.message || 'Could not update vendor status.');
        }
    };

    const handleDeleteVendor = async (vendor) => {
        if (!window.confirm(`Remove "${vendor.name}" from WDU food vendors?`)) return;
        try {
            await deleteDoc(doc(db, 'food_vendors', vendor.id));
        } catch (err) {
            alert(err.message || 'Could not delete vendor.');
        }
    };

    const handleOrderStatus = async (orderId, nextStatus) => {
        setUpdatingOrderId(orderId);
        try {
            await callFoodOrderApi('update_status', { orderId, status: nextStatus });
        } catch (err) {
            alert(err.message || 'Could not update order status.');
        } finally {
            setUpdatingOrderId(null);
        }
    };

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setSavingSettings(true);
        setStatusMsg({ type: '', text: '' });
        const parsedFee = Number(orderFee);
        const safeFee = Number.isFinite(parsedFee) && parsedFee >= 0 ? Math.round(parsedFee) : DEFAULT_FOOD_ORDER_FEE;
        try {
            await setDoc(
                doc(db, 'settings', 'food_dispatch'),
                {
                    acceptingOrders,
                    openHours: openHours.trim(),
                    closedMessage: closedMessage.trim(),
                    orderFee: safeFee,
                    paymentDetails: paymentDetails.trim(),
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );
            await setDoc(
                doc(db, 'private_settings', 'food_dispatch'),
                {
                    telegramBotToken: telegramBotToken.trim(),
                    telegramChatIds: telegramChatIds.trim(),
                    adminWhatsApp: adminWhatsApp.trim(),
                    callMeBotApiKey: callMeBotApiKey.trim(),
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );
            setOrderFee(String(safeFee));
            setStatusMsg({ type: 'success', text: 'Food Dispatch & Order Alert settings saved!' });
        } catch (err) {
            setStatusMsg({ type: 'error', text: err.message || 'Could not save settings.' });
        } finally {
            setSavingSettings(false);
        }
    };

    const handleDetectTelegram = async () => {
        setDetecting(true);
        setStatusMsg({ type: '', text: '' });
        try {
            const res = await callFoodOrderApi('telegram_detect', { botToken: telegramBotToken.trim() });
            setDetectedChats(res.chats || []);
            if (!res.chats || res.chats.length === 0) {
                setStatusMsg({ type: 'error', text: 'No chats found yet. Open your bot in Telegram, tap START (or send "hi"), then click Detect again.' });
            } else {
                setStatusMsg({ type: 'success', text: `Found ${res.chats.length} chat(s). Tap "Use" to add it, then Save.` });
            }
        } catch (err) {
            setStatusMsg({ type: 'error', text: err.message || 'Could not reach Telegram.' });
        } finally {
            setDetecting(false);
        }
    };

    const addChatId = (id) => {
        const list = telegramChatIds.split(/[,\s]+/).filter(Boolean);
        if (!list.includes(id)) list.push(id);
        setTelegramChatIds(list.join(', '));
    };

    const handleTestAlert = async () => {
        setTestingWa(true);
        setStatusMsg({ type: '', text: '' });
        try {
            const res = await callFoodOrderApi('test_alert');
            if (res.ok) {
                setStatusMsg({ type: 'success', text: 'Test order alert sent! Check your Telegram (and WhatsApp if CallMeBot is set).' });
            } else {
                setStatusMsg({
                    type: 'error',
                    text: `Test alert failed (${(res.reasons || []).join(', ') || 'no channel configured'}). Save your settings first, then test again.`,
                });
            }
        } catch (err) {
            setStatusMsg({ type: 'error', text: err.message || 'Test failed.' });
        } finally {
            setTestingWa(false);
        }
    };

    const pendingCount = orders.filter((o) => o.status === 'new' || o.status === 'accepted' || o.status === 'preparing').length;

    return (
        <div className="container" style={{ maxWidth: '980px', padding: '1.25rem 1rem 4rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                        onClick={() => navigate(-1)}
                        className="btn btn-ghost"
                        style={{ padding: '0.5rem', borderRadius: '50%' }}
                        aria-label="Back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <Utensils size={21} color="#D97706" /> WDU Food Vendors &amp; Dispatch Panel
                        </h1>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Manage Western Delta University menus, ₦{orderFee || DEFAULT_FOOD_ORDER_FEE} order fee, live orders &amp; Telegram alerts
                        </span>
                    </div>
                </div>
                <Link to="/order-food" className="btn btn-secondary" style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                    View Student Page
                </Link>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1.25rem', overflowX: 'auto' }}>
                <button
                    type="button"
                    onClick={() => { setActiveTab('orders'); setStatusMsg({ type: '', text: '' }); }}
                    className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.84rem', fontWeight: 800 }}
                >
                    Live Orders ({pendingCount} active)
                </button>
                <button
                    type="button"
                    onClick={() => { setActiveTab('vendors'); setStatusMsg({ type: '', text: '' }); }}
                    className={`btn ${activeTab === 'vendors' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.84rem', fontWeight: 800 }}
                >
                    WDU Food Vendors ({vendors.length})
                </button>
                <button
                    type="button"
                    onClick={() => { setActiveTab('settings'); setStatusMsg({ type: '', text: '' }); }}
                    className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.84rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                    <Settings size={15} /> Dispatch &amp; Alerts
                </button>
            </div>

            {statusMsg.text && (
                <div style={{
                    padding: '0.8rem 1rem',
                    borderRadius: 'var(--radius-lg)',
                    marginBottom: '1rem',
                    background: statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.3)'}`,
                    color: statusMsg.type === 'success' ? '#059669' : '#DC2626',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                }}>
                    {statusMsg.text}
                </div>
            )}

            {/* TAB 1: LIVE ORDERS */}
            {activeTab === 'orders' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                    {orders.length === 0 ? (
                        <div style={{ padding: '2.5rem', textAlign: 'center', background: 'var(--surface)', borderRadius: 'var(--radius-xl)', border: '1px dashed var(--border)', color: 'var(--text-secondary)' }}>
                            No WDU food orders yet. When a student places an order on <code>/order-food</code>, it appears here live AND pings your Telegram agent.
                        </div>
                    ) : (
                        orders.map((ord) => {
                            const st = FOOD_ORDER_STATUS[ord.status] || FOOD_ORDER_STATUS.new;
                            const cleanStuPhone = formatWhatsAppNumber(ord.studentPhone);
                            const isBusy = updatingOrderId === ord.id;
                            const hasItems = Array.isArray(ord.items) && ord.items.length > 0;
                            const fee = Number.isFinite(Number(ord.orderFee)) ? Number(ord.orderFee) : DEFAULT_FOOD_ORDER_FEE;
                            const room = ord.roomNumber || ord.hostelLocation || '—';
                            const effectiveFoodPrice = ord.confirmedFoodPrice !== null && ord.confirmedFoodPrice !== undefined
                                ? Number(ord.confirmedFoodPrice)
                                : ord.foodSubtotal > 0 && !ord.needsPriceConfirm
                                ? Number(ord.foodSubtotal)
                                : null;

                            const typeBadge = ord.needsPriceConfirm
                                ? { text: 'Custom Request — Confirm Price', color: '#D97706', bg: 'rgba(245, 158, 11, 0.14)' }
                                : ord.orderType === 'mixed'
                                ? { text: 'Menu + Custom (Price Confirmed)', color: '#7C3AED', bg: 'rgba(124, 58, 237, 0.12)' }
                                : hasItems
                                ? { text: 'Fixed Menu', color: '#059669', bg: 'rgba(16, 185, 129, 0.14)' }
                                : { text: 'Order Request', color: '#2563EB', bg: 'rgba(37, 99, 235, 0.12)' };

                            return (
                                <div
                                    key={ord.id}
                                    style={{
                                        padding: '1.15rem',
                                        borderRadius: 'var(--radius-xl)',
                                        background: 'var(--surface-elevated)',
                                        border: '1.5px solid var(--border)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.65rem',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: 900, fontSize: '0.95rem' }}>{ord.orderCode}</span>
                                            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                                                {ord.vendorName}
                                            </span>
                                            <span style={{
                                                fontSize: '0.7rem',
                                                fontWeight: 800,
                                                padding: '0.18rem 0.55rem',
                                                borderRadius: '999px',
                                                background: typeBadge.bg,
                                                color: typeBadge.color,
                                            }}>
                                                {typeBadge.text}
                                            </span>
                                            <span style={{
                                                fontSize: '0.7rem',
                                                fontWeight: 800,
                                                padding: '0.18rem 0.55rem',
                                                borderRadius: '999px',
                                                background: ord.alertSent ? 'rgba(37, 211, 102, 0.14)' : 'rgba(148, 163, 184, 0.16)',
                                                color: ord.alertSent ? '#16A34A' : 'var(--text-secondary)',
                                            }}>
                                                {ord.alertSent ? 'Alert Sent ✓' : 'In-App Only'}
                                            </span>
                                        </div>
                                        <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '0.25rem 0.7rem', borderRadius: '999px', background: st.bg, color: st.color }}>
                                            {st.label}
                                        </span>
                                    </div>

                                    {/* Student Info Row */}
                                    <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                        <span><strong>Student:</strong> {ord.studentName}</span>
                                        {ord.gender && (
                                            <span style={{
                                                fontSize: '0.72rem',
                                                fontWeight: 800,
                                                padding: '0.12rem 0.5rem',
                                                borderRadius: '999px',
                                                background: ord.gender === 'Female' ? 'rgba(236, 72, 153, 0.14)' : 'rgba(37, 99, 235, 0.14)',
                                                color: ord.gender === 'Female' ? '#DB2777' : '#2563EB',
                                            }}>
                                                {ord.gender}
                                            </span>
                                        )}
                                        <span><strong>Room:</strong> {room}</span>
                                        {ord.studentPhone && <span><strong>Phone:</strong> {ord.studentPhone}</span>}
                                    </div>

                                    {/* Order Details Box */}
                                    <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                        {hasItems && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                {ord.items.map((it, idx) => (
                                                    <div key={it.id || idx} style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                                        <span>{it.qty}× {it.name}</span>
                                                        <span style={{ fontWeight: 800 }}>{formatNaira(it.lineTotal)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {ord.customRequest && (
                                            <div style={{ fontWeight: 600 }}>
                                                <strong>Custom Request:</strong> {ord.customRequest}
                                            </div>
                                        )}
                                        {!hasItems && !ord.customRequest && ord.orderMessage && (
                                            <div style={{ fontWeight: 600 }}>{ord.orderMessage}</div>
                                        )}
                                        {ord.note && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                <strong>Note:</strong> {ord.note}
                                            </div>
                                        )}

                                        {/* Totals Row */}
                                        <div style={{
                                            display: 'flex',
                                            gap: '1rem',
                                            flexWrap: 'wrap',
                                            paddingTop: '0.4rem',
                                            marginTop: '0.2rem',
                                            borderTop: '1px dashed var(--border)',
                                            fontSize: '0.8rem',
                                        }}>
                                            <span>
                                                Food: <strong>{effectiveFoodPrice !== null ? formatNaira(effectiveFoodPrice) : 'Pending confirmation'}</strong>
                                            </span>
                                            <span>
                                                Order Fee: <strong>{formatNaira(fee)}</strong>
                                            </span>
                                            <span>
                                                Total: <strong style={{ color: 'var(--primary)' }}>
                                                    {ord.totalAmount !== null && ord.totalAmount !== undefined
                                                        ? formatNaira(ord.totalAmount)
                                                        : 'Pending'}
                                                </strong>
                                            </span>
                                        </div>
                                    </div>

                                    {ord.adminNote && !ord.needsPriceConfirm && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                                            <strong>Reply sent to student:</strong> {ord.adminNote}
                                        </div>
                                    )}

                                    <OrderReplyForm
                                        order={ord}
                                        onStatus={(type, text) => setStatusMsg({ type, text })}
                                    />

                                    <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', paddingTop: '0.45rem', borderTop: '1px solid var(--border)' }}>
                                        {['accepted', 'preparing', 'out_for_delivery', 'completed', 'cancelled'].map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                disabled={isBusy || ord.status === s}
                                                onClick={() => handleOrderStatus(ord.id, s)}
                                                style={{
                                                    padding: '0.4rem 0.75rem',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: '1px solid var(--border)',
                                                    background: ord.status === s ? 'var(--primary)' : 'var(--surface)',
                                                    color: ord.status === s ? '#fff' : 'var(--text)',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    cursor: isBusy || ord.status === s ? 'default' : 'pointer',
                                                }}
                                            >
                                                {FOOD_ORDER_STATUS[s].label}
                                            </button>
                                        ))}
                                        {(() => {
                                            const v = vendors.find((x) => x.id === ord.vendorId);
                                            const vPhone = formatWhatsAppNumber(v?.vendorPhone);
                                            if (!vPhone) return null;
                                            const vText = buildVendorForwardMessage(ord);
                                            return (
                                                <a
                                                    href={`https://wa.me/${vPhone}?text=${encodeURIComponent(vText)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        marginLeft: 'auto',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.35rem',
                                                        padding: '0.4rem 0.75rem',
                                                        borderRadius: 'var(--radius-md)',
                                                        background: '#D97706',
                                                        color: '#fff',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 800,
                                                        textDecoration: 'none',
                                                    }}
                                                >
                                                    <FaWhatsapp size={14} /> Send to Vendor
                                                </a>
                                            );
                                        })()}
                                        {cleanStuPhone && (
                                            <a
                                                href={`https://wa.me/${cleanStuPhone}?text=${encodeURIComponent(`Hi ${ord.studentName}, regarding your Market-U WDU Food Order (${ord.orderCode}): `)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.35rem',
                                                    padding: '0.4rem 0.75rem',
                                                    borderRadius: 'var(--radius-md)',
                                                    background: '#25D366',
                                                    color: '#fff',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 800,
                                                    textDecoration: 'none',
                                                }}
                                            >
                                                <FaWhatsapp size={14} /> Chat Student
                                            </a>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* TAB 2: MANAGE WDU VENDORS */}
            {activeTab === 'vendors' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
                    {/* Add Vendor Form */}
                    <form
                        onSubmit={handleAddVendor}
                        style={{
                            padding: '1.25rem',
                            borderRadius: 'var(--radius-xl)',
                            background: 'var(--surface-elevated)',
                            border: '1.5px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.8rem',
                        }}
                    >
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <PlusCircle size={18} color="var(--primary)" /> Add WDU Outside Food Vendor
                        </h3>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', background: 'rgba(245, 158, 11, 0.1)', padding: '0.5rem 0.7rem', borderRadius: 'var(--radius-md)' }}>
                            Standard <strong>{formatNaira(orderFee || DEFAULT_FOOD_ORDER_FEE)} order fee</strong> applies to all WDU orders (editable in Dispatch &amp; Alerts).
                        </div>
                        <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Restaurant / Kitchen Name *</label>
                            <input
                                type="text"
                                required
                                value={vName}
                                onChange={(e) => setVName(e.target.value)}
                                placeholder="e.g., Mama T's Kitchen & Shawarma"
                                style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                            <div>
                                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Location Outside WDU</label>
                                <input
                                    type="text"
                                    value={vLocation}
                                    onChange={(e) => setVLocation(e.target.value)}
                                    placeholder="e.g., Main Gate"
                                    style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Opening Hours</label>
                                <input
                                    type="text"
                                    value={vHours}
                                    onChange={(e) => setVHours(e.target.value)}
                                    style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                                />
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                                Vendor WhatsApp Number * <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>(for 1-tap order forward)</span>
                            </label>
                            <input
                                type="tel"
                                value={vPhone}
                                onChange={(e) => setVPhone(e.target.value)}
                                placeholder="e.g., 0803 123 4567"
                                style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Short Description (Optional)</label>
                            <input
                                type="text"
                                value={vMenu}
                                onChange={(e) => setVMenu(e.target.value)}
                                placeholder="e.g., Fast rice, grills & cold drinks near gate"
                                style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                            />
                        </div>

                        {/* Menu Items & Prices Builder */}
                        <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 800, display: 'block', marginBottom: '0.35rem' }}>
                                Menu Items &amp; Fixed Prices ({vMenuItems.length})
                            </label>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                                <input
                                    type="text"
                                    value={draftItemName}
                                    onChange={(e) => setDraftItemName(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddDraftMenuItem(); } }}
                                    placeholder="e.g., Jollof Rice (1 portion)"
                                    style={{ flex: '2 1 150px', minWidth: 0, padding: '0.55rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.85rem' }}
                                />
                                <input
                                    type="number"
                                    min="0"
                                    value={draftItemPrice}
                                    onChange={(e) => setDraftItemPrice(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddDraftMenuItem(); } }}
                                    placeholder="Price ₦"
                                    style={{ flex: '1 1 85px', minWidth: 0, padding: '0.55rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.85rem' }}
                                />
                                <button
                                    type="button"
                                    onClick={handleAddDraftMenuItem}
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.78rem', fontWeight: 800, padding: '0.5rem 0.75rem' }}
                                >
                                    + Add Item
                                </button>
                            </div>
                            {vMenuItems.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    {vMenuItems.map((it) => (
                                        <div
                                            key={it.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '0.4rem 0.65rem',
                                                borderRadius: 'var(--radius-md)',
                                                background: 'var(--surface)',
                                                border: '1px solid var(--border)',
                                                fontSize: '0.8rem',
                                            }}
                                        >
                                            <span><strong>{it.name}</strong> — {formatNaira(it.price)}</span>
                                            <button
                                                type="button"
                                                onClick={() => setVMenuItems((prev) => prev.filter((x) => x.id !== it.id))}
                                                style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem' }}
                                                aria-label={`Remove ${it.name}`}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button type="submit" disabled={savingVendor} className="btn btn-primary" style={{ justifyContent: 'center', fontWeight: 800 }}>
                            {savingVendor ? 'Adding...' : 'Add Food Vendor to WDU'}
                        </button>
                    </form>

                    {/* Vendors List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {vendors.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--surface)', borderRadius: 'var(--radius-xl)', border: '1px dashed var(--border)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                No WDU food vendors added yet. Use the form on the left to add your first outside restaurant and its menu prices.
                            </div>
                        ) : (
                            vendors.map((v) => {
                                const isOpen = v.isOpen !== false;
                                const vItems = Array.isArray(v.menuItems) ? v.menuItems : [];
                                const isEditing = editingVendorId === v.id;
                                return (
                                    <div
                                        key={v.id}
                                        style={{
                                            padding: '1rem',
                                            borderRadius: 'var(--radius-xl)',
                                            background: 'var(--surface-elevated)',
                                            border: '1.5px solid var(--border)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.45rem',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontWeight: 900, fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                                {v.name} <ShieldCheck size={15} color="var(--primary)" />
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                <span style={{
                                                    fontSize: '0.68rem',
                                                    fontWeight: 800,
                                                    padding: '0.18rem 0.5rem',
                                                    borderRadius: '999px',
                                                    background: 'rgba(37, 99, 235, 0.12)',
                                                    color: 'var(--primary)',
                                                }}>
                                                    {vItems.length} menu {vItems.length === 1 ? 'item' : 'items'}
                                                </span>
                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    fontWeight: 800,
                                                    padding: '0.18rem 0.55rem',
                                                    borderRadius: '999px',
                                                    background: isOpen ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.12)',
                                                    color: isOpen ? '#059669' : '#DC2626',
                                                }}>
                                                    {isOpen ? 'OPEN' : 'CLOSED'}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                            {v.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><MapPin size={12} /> {v.location}</span>}
                                            {v.vendorPhone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Phone size={12} /> {v.vendorPhone}</span>}
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Clock size={12} /> {v.openHours}</span>
                                        </div>
                                        {v.menuSummary && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{v.menuSummary}</div>}

                                        {!isEditing && vItems.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.15rem' }}>
                                                {vItems.slice(0, 5).map((it) => (
                                                    <span
                                                        key={it.id}
                                                        style={{
                                                            fontSize: '0.72rem',
                                                            fontWeight: 700,
                                                            padding: '0.2rem 0.5rem',
                                                            borderRadius: '6px',
                                                            background: 'var(--surface)',
                                                            border: '1px solid var(--border)',
                                                            opacity: it.available === false ? 0.5 : 1,
                                                        }}
                                                    >
                                                        {it.name}: {formatNaira(it.price)}
                                                    </span>
                                                ))}
                                                {vItems.length > 5 && (
                                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>
                                                        +{vItems.length - 5} more
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {isEditing && (
                                            <VendorInlineEditor
                                                vendor={v}
                                                onStatus={(type, text) => setStatusMsg({ type, text })}
                                            />
                                        )}

                                        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', paddingTop: '0.45rem', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
                                            <button
                                                type="button"
                                                onClick={() => setEditingVendorId(isEditing ? null : v.id)}
                                                className="btn btn-secondary"
                                                style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem', fontWeight: 700 }}
                                            >
                                                <Edit3 size={13} /> {isEditing ? 'Done Editing' : 'Edit Menu'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleToggleVendorOpen(v)}
                                                className="btn btn-secondary"
                                                style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
                                            >
                                                {isOpen ? <><XCircle size={13} /> Mark Closed</> : <><CheckCircle2 size={13} /> Mark Open</>}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteVendor(v)}
                                                className="btn"
                                                style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                            >
                                                <Trash2 size={13} /> Remove
                                            </button>
                                            <span style={{ marginLeft: 'auto', fontSize: '0.74rem', fontWeight: 700, color: '#059669' }}>
                                                ✓ {Number(v.completedOrdersCount || 0)} delivered
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* TAB 3: DISPATCH CONTROLS & TELEGRAM ORDER AGENT */}
            {activeTab === 'settings' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <form
                        onSubmit={handleSaveSettings}
                        style={{
                            padding: '1.35rem',
                            borderRadius: 'var(--radius-xl)',
                            background: 'var(--surface-elevated)',
                            border: '1.5px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border)' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900 }}>Master Food Dispatch Switch</h3>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    Turn OFF when your phone is going off or after hours so students see a clear closed notice.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAcceptingOrders((prev) => !prev)}
                                style={{
                                    padding: '0.55rem 1rem',
                                    borderRadius: '999px',
                                    border: 'none',
                                    fontWeight: 900,
                                    fontSize: '0.82rem',
                                    cursor: 'pointer',
                                    background: acceptingOrders ? '#059669' : '#DC2626',
                                    color: '#fff',
                                }}
                            >
                                {acceptingOrders ? 'ACCEPTING ORDERS (OPEN)' : 'PAUSED (CLOSED)'}
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                            <div>
                                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Order &amp; Delivery Fee (₦)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={orderFee}
                                    onChange={(e) => setOrderFee(e.target.value)}
                                    style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Display Open Hours</label>
                                <input
                                    type="text"
                                    value={openHours}
                                    onChange={(e) => setOpenHours(e.target.value)}
                                    style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Closed Message (shown when paused)</label>
                                <input
                                    type="text"
                                    value={closedMessage}
                                    onChange={(e) => setClosedMessage(e.target.value)}
                                    style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                                Payment Instructions / Account Details (Shown to Students)
                            </label>
                            <textarea
                                rows={2}
                                value={paymentDetails}
                                onChange={(e) => setPaymentDetails(e.target.value)}
                                placeholder="e.g., Opay • 8057278708 • Rae Tech Services — Send Food Total + ₦550 order fee"
                                style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit' }}
                            />
                        </div>

                        <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                            <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.92rem', fontWeight: 800 }}>Telegram Order Agent (Recommended — free &amp; instant)</h4>
                            <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                Every new order is sent to these Telegram chats. Add your own chat plus a partner/runner's chat so someone always sees it, even if your phone is off.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Telegram Bot Token (from @BotFather)</label>
                                    <input
                                        type="password"
                                        value={telegramBotToken}
                                        onChange={(e) => setTelegramBotToken(e.target.value)}
                                        placeholder="123456789:AA..."
                                        autoComplete="off"
                                        style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Chat IDs to alert (comma separated)</label>
                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                        <input
                                            type="text"
                                            value={telegramChatIds}
                                            onChange={(e) => setTelegramChatIds(e.target.value)}
                                            placeholder="Click Detect after messaging your bot"
                                            style={{ flex: 1, minWidth: 0, padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleDetectTelegram}
                                            disabled={detecting}
                                            className="btn btn-secondary"
                                            style={{ fontSize: '0.78rem', fontWeight: 800, whiteSpace: 'nowrap' }}
                                        >
                                            {detecting ? 'Detecting...' : 'Detect'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            {detectedChats.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.6rem' }}>
                                    {detectedChats.map((c) => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => addChatId(c.id)}
                                            style={{ padding: '0.35rem 0.7rem', borderRadius: '999px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                        >
                                            Use: {c.name}{c.username ? ` (@${c.username})` : ''} — {c.id}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.92rem', fontWeight: 800 }}>Optional: WhatsApp via CallMeBot (unreliable — only if it ever replies)</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Your WhatsApp Number</label>
                                    <input
                                        type="text"
                                        value={adminWhatsApp}
                                        onChange={(e) => setAdminWhatsApp(e.target.value)}
                                        placeholder="2348057278708"
                                        style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>CallMeBot API Key</label>
                                    <input
                                        type="text"
                                        value={callMeBotApiKey}
                                        onChange={(e) => setCallMeBotApiKey(e.target.value)}
                                        placeholder="Paste 6-7 digit key from CallMeBot"
                                        style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <button type="submit" disabled={savingSettings} className="btn btn-primary" style={{ fontWeight: 800 }}>
                                {savingSettings ? 'Saving...' : 'Save Dispatch Settings'}
                            </button>
                            <button
                                type="button"
                                onClick={handleTestAlert}
                                disabled={testingWa}
                                className="btn btn-secondary"
                                style={{ fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                            >
                                {testingWa ? <Loader size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={15} />}
                                Send Test Order Alert
                            </button>
                        </div>
                    </form>

                    {/* 2-Minute Telegram Setup Guide */}
                    <div style={{
                        padding: '1.15rem',
                        borderRadius: 'var(--radius-xl)',
                        background: 'rgba(37, 99, 235, 0.06)',
                        border: '1px solid rgba(37, 99, 235, 0.2)',
                        fontSize: '0.84rem',
                        lineHeight: 1.6,
                    }}>
                        <strong style={{ display: 'block', marginBottom: '0.35rem' }}>How to set up your Telegram Order Agent (2 minutes):</strong>
                        <ol style={{ margin: 0, paddingLeft: '1.2rem' }}>
                            <li>Install Telegram and search for <strong>@BotFather</strong> (blue tick). Tap Start.</li>
                            <li>Send <code>/newbot</code>, name it e.g. <code>MarketU Food Agent</code>, and pick a username ending in <code>bot</code> (e.g. <code>marketu_food_bot</code>).</li>
                            <li>BotFather replies with a <strong>token</strong> like <code>123456789:AAH...</code>. Paste it in <strong>Telegram Bot Token</strong> above.</li>
                            <li>Open your new bot in Telegram and tap <strong>START</strong> (or send "hi").</li>
                            <li>Click <strong>Detect</strong> → tap <strong>Use</strong> on your name → <strong>Save Dispatch Settings</strong> → <strong>Send Test Order Alert</strong>.</li>
                            <li>Want a partner/runner/vendor alerted too? Have them START the same bot, click Detect again, and add their chat.</li>
                        </ol>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminFood;
