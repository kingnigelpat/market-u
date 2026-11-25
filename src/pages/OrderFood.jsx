import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import AuthPromptModal from '../components/AuthPromptModal';
import {
    callFoodOrderApi,
    FOOD_ORDER_STATUS,
    DEFAULT_FOOD_ORDER_FEE,
    formatNaira
} from '../utils/foodService';
import {
    Utensils,
    Send,
    Clock,
    MapPin,
    CheckCircle2,
    ShieldCheck,
    AlertCircle,
    Loader,
    GraduationCap,
    ChevronRight,
    Plus,
    Minus,
    User,
    ShoppingBag,
    Wallet,
    MessageSquare
} from 'lucide-react';

const WDU_NAME = 'Western Delta University';
const FOOD_LAUNCH_LIVE = false; // Flip to true when launching WDU Food next year

const OrderFood = () => {
    const { currentUser, isAuthenticated, userName, userPhone, userSchoolName, isAdmin } = useAuth();
    const [adminBypassTeaser, setAdminBypassTeaser] = useState(false);
    const [vendors, setVendors] = useState([]);
    const [loadingVendors, setLoadingVendors] = useState(true);
    const [dispatchConfig, setDispatchConfig] = useState({
        acceptingOrders: true,
        openHours: '9:00 AM – 9:00 PM',
        closedMessage: 'WDU Food Dispatch is currently closed. Please check back during open hours.',
        orderFee: DEFAULT_FOOD_ORDER_FEE,
        paymentDetails: '',
    });

    // Selected vendor + menu cart ({ [itemId]: qty }) + optional custom request
    const [selectedVendorId, setSelectedVendorId] = useState('');
    const [cart, setCart] = useState({});
    const [customRequest, setCustomRequest] = useState('');
    const [note, setNote] = useState('');

    // Minimal checkout fields: Name, Room Number, Gender ONLY
    const [studentName, setStudentName] = useState('');
    const [nameEdited, setNameEdited] = useState(false);
    const [roomNumber, setRoomNumber] = useState('');
    const [gender, setGender] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', text: '' });
    const [showAuthModal, setShowAuthModal] = useState(false);

    // Student's own live food orders
    const [myOrders, setMyOrders] = useState([]);

    useEffect(() => {
        document.title = 'Order Food (WDU) | Market-U';
    }, []);

    // Subscribe to WDU food vendors
    useEffect(() => {
        const q = query(collection(db, 'food_vendors'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(
            q,
            (snap) => {
                setVendors(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
                setLoadingVendors(false);
            },
            (err) => {
                console.error('Error loading food vendors:', err);
                setLoadingVendors(false);
            }
        );
        return () => unsub();
    }, []);

    // Subscribe to global dispatch Open/Closed toggle, orderFee, paymentDetails
    useEffect(() => {
        const unsub = onSnapshot(
            doc(db, 'settings', 'food_dispatch'),
            (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    const parsedFee = Number(data.orderFee);
                    setDispatchConfig({
                        acceptingOrders: data.acceptingOrders !== false,
                        openHours: data.openHours || '9:00 AM – 9:00 PM',
                        closedMessage:
                            data.closedMessage ||
                            'WDU Food Dispatch is currently closed. Please check back during open hours.',
                        orderFee: Number.isFinite(parsedFee) && parsedFee >= 0 ? Math.round(parsedFee) : DEFAULT_FOOD_ORDER_FEE,
                        paymentDetails: String(data.paymentDetails || '').trim(),
                    });
                }
            },
            () => {}
        );
        return () => unsub();
    }, []);

    // Subscribe to current student's food orders
    useEffect(() => {
        if (!currentUser) {
            setMyOrders([]);
            return;
        }
        const q = query(
            collection(db, 'food_orders'),
            where('studentId', '==', currentUser.uid)
        );
        const unsub = onSnapshot(
            q,
            (snap) => {
                const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
                list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                setMyOrders(list);
            },
            (err) => console.warn('Could not subscribe to food orders:', err)
        );
        return () => unsub();
    }, [currentUser]);

    const selectedVendor = vendors.find((v) => v.id === selectedVendorId) || null;
    const vendorMenu = useMemo(
        () => (Array.isArray(selectedVendor?.menuItems) ? selectedVendor.menuItems : []),
        [selectedVendor]
    );
    const isOtherSchool = Boolean(
        userSchoolName &&
        userSchoolName !== WDU_NAME &&
        !userSchoolName.toLowerCase().includes('western delta')
    );

    const handleSelectVendor = (vendorId) => {
        if (vendorId === selectedVendorId) {
            setSelectedVendorId('');
            setCart({});
            return;
        }
        setSelectedVendorId(vendorId);
        setCart({});
    };

    const updateQty = (itemId, delta) => {
        setCart((prev) => {
            const current = prev[itemId] || 0;
            const next = Math.min(20, Math.max(0, current + delta));
            const copy = { ...prev };
            if (next <= 0) delete copy[itemId];
            else copy[itemId] = next;
            return copy;
        });
    };

    const selectedItems = useMemo(() => {
        return vendorMenu
            .filter((item) => item.available !== false && (cart[item.id] || 0) > 0)
            .map((item) => {
                const qty = cart[item.id];
                const unitPrice = Math.max(0, Math.round(Number(item.price) || 0));
                return {
                    id: item.id,
                    name: item.name,
                    unitPrice,
                    qty,
                    lineTotal: unitPrice * qty,
                };
            });
    }, [vendorMenu, cart]);

    const foodSubtotal = selectedItems.reduce((sum, it) => sum + it.lineTotal, 0);
    const cleanCustom = customRequest.trim();
    const hasMenuItemsSelected = selectedItems.length > 0;
    const hasCustom = cleanCustom.length > 0;
    const fixedTotal = hasMenuItemsSelected && !hasCustom ? foodSubtotal + dispatchConfig.orderFee : null;
    const displayName = nameEdited ? studentName : (userName || currentUser?.displayName || studentName);

    const handleSendOrder = async (e) => {
        e.preventDefault();
        if (!isAuthenticated) {
            setShowAuthModal(true);
            return;
        }
        if (!dispatchConfig.acceptingOrders) {
            setFeedback({ type: 'error', text: dispatchConfig.closedMessage });
            return;
        }
        if (!hasMenuItemsSelected && cleanCustom.length < 3) {
            setFeedback({
                type: 'error',
                text: 'Pick at least one item from the menu or type what food you want below.',
            });
            return;
        }
        if (!displayName.trim()) {
            setFeedback({ type: 'error', text: 'Please enter your name.' });
            return;
        }
        if (!roomNumber.trim()) {
            setFeedback({ type: 'error', text: 'Please enter your hostel & room number.' });
            return;
        }
        if (gender !== 'Male' && gender !== 'Female') {
            setFeedback({ type: 'error', text: 'Please select your gender (Male or Female).' });
            return;
        }

        setSubmitting(true);
        setFeedback({ type: '', text: '' });
        try {
            const res = await callFoodOrderApi('create', {
                vendorId: selectedVendor ? selectedVendor.id : '',
                vendorName: selectedVendor ? selectedVendor.name : 'Any Available WDU Vendor',
                items: selectedItems.map((it) => ({ id: it.id, qty: it.qty })),
                customRequest: cleanCustom,
                note: note.trim(),
                studentName: displayName.trim(),
                roomNumber: roomNumber.trim(),
                gender,
                studentPhone: userPhone || '',
            });
            setCart({});
            setCustomRequest('');
            setNote('');
            const priceText = res.needsPriceConfirm
                ? `We received your custom request and will confirm the food price + ${formatNaira(res.orderFee)} order fee here shortly.`
                : `Total: ${formatNaira(res.totalAmount)} (includes ${formatNaira(res.orderFee)} order fee). Your order has been sent to dispatch!`;
            setFeedback({
                type: 'success',
                text: `Order ${res.orderCode} sent! ${priceText}`,
            });
        } catch (err) {
            setFeedback({ type: 'error', text: err.message || 'Could not send food order. Try again.' });
        } finally {
            setSubmitting(false);
        }
    };

    if (!FOOD_LAUNCH_LIVE && !(isAdmin && adminBypassTeaser)) {
        return (
            <div className="container" style={{ maxWidth: '720px', padding: '2rem 1rem 4rem' }}>
                <div style={{
                    padding: '2.25rem 1.5rem',
                    borderRadius: '26px',
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.14) 0%, rgba(37, 99, 235, 0.12) 100%)',
                    border: '1.5px solid rgba(245, 158, 11, 0.4)',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.9rem',
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '18px',
                        background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 10px 24px rgba(217, 119, 6, 0.35)',
                    }}>
                        <Utensils size={30} />
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.85rem', borderRadius: '999px', background: 'rgba(245, 158, 11, 0.2)', color: '#B45309', fontSize: '0.75rem', fontWeight: 900 }}>
                        <GraduationCap size={14} /> WESTERN DELTA UNIVERSITY • COMING SOON NEXT YEAR
                    </div>
                    <h1 style={{ margin: 0, fontSize: 'clamp(1.6rem, 5vw, 2.25rem)', fontWeight: 900, letterSpacing: '-0.03em' }}>
                        Something Big is Coming to WDU
                    </h1>
                    <p style={{ margin: 0, maxWidth: '520px', fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        We are partnering with verified restaurants outside <strong>Western Delta University</strong> so you can order your favorite meals straight to your hostel room when school resumes next year. Stay tuned!
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.5rem' }}>
                        <Link
                            to="/market"
                            className="btn btn-primary"
                            style={{ padding: '0.85rem 1.4rem', borderRadius: '14px', fontWeight: 900, textDecoration: 'none' }}
                        >
                            Back to Marketplace
                        </Link>
                        {isAdmin && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setAdminBypassTeaser(true)}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.85rem 1.2rem', borderRadius: '14px', fontWeight: 800 }}
                                >
                                    Admin: Preview Order Form
                                </button>
                                <Link
                                    to="/admin/food"
                                    className="btn btn-secondary"
                                    style={{ padding: '0.85rem 1.2rem', borderRadius: '14px', fontWeight: 800, textDecoration: 'none' }}
                                >
                                    Admin Food Panel
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container" style={{ maxWidth: '920px', padding: '1.25rem 1rem 4rem' }}>
            {/* Hero Banner */}
            <div style={{
                padding: '1.5rem',
                borderRadius: 'var(--radius-2xl)',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.14) 0%, rgba(37, 99, 235, 0.12) 100%)',
                border: '1.5px solid rgba(245, 158, 11, 0.35)',
                marginBottom: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.3rem 0.75rem', borderRadius: '999px', background: 'var(--surface-elevated)', border: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)' }}>
                        <GraduationCap size={14} /> Western Delta University (Oghara)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.3rem 0.75rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            background: 'rgba(245, 158, 11, 0.18)',
                            color: '#B45309',
                        }}>
                            Flat {formatNaira(dispatchConfig.orderFee)} Order Fee
                        </span>
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.3rem 0.75rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            background: dispatchConfig.acceptingOrders ? 'rgba(16, 185, 129, 0.16)' : 'rgba(239, 68, 68, 0.14)',
                            color: dispatchConfig.acceptingOrders ? '#059669' : '#DC2626',
                        }}>
                            <Clock size={13} />
                            {dispatchConfig.acceptingOrders ? `OPEN • ${dispatchConfig.openHours}` : 'DISPATCH CLOSED'}
                        </span>
                        {isAdmin && (
                            <Link
                                to="/admin/food"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    padding: '0.3rem 0.75rem',
                                    borderRadius: '999px',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    background: 'var(--primary)',
                                    color: '#fff',
                                    textDecoration: 'none',
                                }}
                            >
                                Manage Vendors &amp; Orders <ChevronRight size={13} />
                            </Link>
                        )}
                    </div>
                </div>

                <div>
                    <h1 style={{ fontSize: 'clamp(1.45rem, 4.5vw, 2rem)', fontWeight: 900, margin: '0 0 0.35rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Utensils size={24} color="#D97706" /> Order Food from Outside WDU
                    </h1>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        Pick a restaurant to view fixed menu prices and order straight away — or type a custom food request if it's not on the menu. Just enter your <strong>name, room number, and gender</strong>.
                    </p>
                </div>
            </div>

            {isOtherSchool && (
                <div style={{
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-lg)',
                    background: 'rgba(37, 99, 235, 0.08)',
                    border: '1px solid rgba(37, 99, 235, 0.25)',
                    marginBottom: '1.25rem',
                    fontSize: '0.825rem',
                    color: 'var(--text)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.55rem',
                }}>
                    <AlertCircle size={17} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <span>
                        <strong>Note:</strong> Outside food delivery is currently live for <strong>Western Delta University (WDU)</strong> first. Other Delta &amp; Edo campuses are launching soon!
                    </span>
                </div>
            )}

            {/* Outside Food Vendors Directory */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                        1. Choose an Outside Vendor (WDU)
                    </h2>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Tap any vendor to see their menu prices
                    </span>
                </div>

                {loadingVendors ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        Loading WDU food vendors...
                    </div>
                ) : vendors.length === 0 ? (
                    <div style={{
                        padding: '1.25rem',
                        borderRadius: 'var(--radius-xl)',
                        background: 'var(--surface)',
                        border: '1px dashed var(--border)',
                        textAlign: 'center',
                        color: 'var(--text-secondary)',
                        fontSize: '0.875rem',
                    }}>
                        No restaurants added yet — type any food you want in the custom order box below and we will get it &amp; confirm the price for you!
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.85rem' }}>
                        {vendors.map((v) => {
                            const isSelected = selectedVendorId === v.id;
                            const isOpen = v.isOpen !== false;
                            const vItems = Array.isArray(v.menuItems)
                                ? v.menuItems.filter((it) => it.available !== false)
                                : [];
                            const minPrice = vItems.length > 0
                                ? Math.min(...vItems.map((it) => Math.round(Number(it.price) || 0)))
                                : null;

                            return (
                                <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => handleSelectVendor(v.id)}
                                    style={{
                                        textAlign: 'left',
                                        padding: '1rem',
                                        borderRadius: 'var(--radius-xl)',
                                        background: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'var(--surface-elevated)',
                                        border: isSelected ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                                        cursor: 'pointer',
                                        opacity: isOpen ? 1 : 0.65,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.45rem',
                                        transition: 'all 0.15s ease',
                                        color: 'var(--text)',
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                        <span style={{ fontWeight: 800, fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                            {v.name}
                                            <ShieldCheck size={15} color="var(--primary)" />
                                        </span>
                                        <span style={{
                                            fontSize: '0.68rem',
                                            fontWeight: 800,
                                            padding: '0.18rem 0.5rem',
                                            borderRadius: '999px',
                                            background: isOpen ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.12)',
                                            color: isOpen ? '#059669' : '#DC2626',
                                            flexShrink: 0,
                                        }}>
                                            {isOpen ? 'OPEN' : 'CLOSED'}
                                        </span>
                                    </div>
                                    {v.location && (
                                        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <MapPin size={12} /> {v.location}
                                        </div>
                                    )}
                                    {v.menuSummary && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.4 }}>
                                            {v.menuSummary}
                                        </div>
                                    )}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        paddingTop: '0.5rem',
                                        marginTop: 'auto',
                                        borderTop: '1px solid var(--border)',
                                        fontSize: '0.74rem',
                                        color: 'var(--text-secondary)',
                                        fontWeight: 700,
                                    }}>
                                        <span style={{ color: '#059669' }}>
                                            ✓ {Number(v.completedOrdersCount || 0)} delivered
                                        </span>
                                        <span>
                                            {vItems.length > 0
                                                ? `${vItems.length} items • From ${formatNaira(minPrice)}`
                                                : (v.openHours || 'Custom order')}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Order Form Card (Menu Picker + Custom Fallback + Name / Room / Gender + Cost Breakdown) */}
            <form
                onSubmit={handleSendOrder}
                style={{
                    padding: '1.35rem',
                    borderRadius: 'var(--radius-2xl)',
                    background: 'var(--surface-elevated)',
                    border: '1.5px solid var(--border)',
                    boxShadow: 'var(--shadow-md)',
                    marginBottom: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.15rem',
                }}
            >
                {!dispatchConfig.acceptingOrders && (
                    <div style={{
                        padding: '0.85rem 1rem',
                        borderRadius: 'var(--radius-lg)',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: 'var(--danger)',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                    }}>
                        {dispatchConfig.closedMessage}
                    </div>
                )}

                {/* Vendor Menu Picker */}
                {selectedVendor && vendorMenu.length > 0 && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.65rem' }}>
                            <h2 style={{ fontSize: '1.05rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <ShoppingBag size={18} color="var(--primary)" /> {selectedVendor.name} Menu
                            </h2>
                            <span style={{ fontSize: '0.73rem', fontWeight: 700, color: '#059669', background: 'rgba(16, 185, 129, 0.12)', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                                Fixed prices — no confirmation delay
                            </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {vendorMenu.map((item) => {
                                const isSoldOut = item.available === false;
                                const qty = cart[item.id] || 0;
                                return (
                                    <div
                                        key={item.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '0.75rem',
                                            padding: '0.75rem 0.9rem',
                                            borderRadius: 'var(--radius-lg)',
                                            background: qty > 0 ? 'rgba(37, 99, 235, 0.07)' : 'var(--surface)',
                                            border: qty > 0 ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                                            opacity: isSoldOut ? 0.55 : 1,
                                        }}
                                    >
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>{item.name}</div>
                                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--primary)' }}>
                                                {formatNaira(item.price)}
                                            </div>
                                        </div>

                                        {isSoldOut ? (
                                            <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#DC2626' }}>
                                                Sold Out
                                            </span>
                                        ) : qty === 0 ? (
                                            <button
                                                type="button"
                                                disabled={!dispatchConfig.acceptingOrders || selectedVendor.isOpen === false}
                                                onClick={() => updateQty(item.id, 1)}
                                                className="btn btn-secondary"
                                                style={{ fontSize: '0.78rem', fontWeight: 800, padding: '0.4rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                            >
                                                <Plus size={14} /> Add
                                            </button>
                                        ) : (
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => updateQty(item.id, -1)}
                                                    aria-label={`Remove one ${item.name}`}
                                                    style={{
                                                        width: '30px',
                                                        height: '30px',
                                                        borderRadius: '8px',
                                                        border: '1px solid var(--border)',
                                                        background: 'var(--surface-elevated)',
                                                        color: 'var(--text)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 900, fontSize: '0.9rem' }}>
                                                    {qty}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => updateQty(item.id, 1)}
                                                    aria-label={`Add one ${item.name}`}
                                                    style={{
                                                        width: '30px',
                                                        height: '30px',
                                                        borderRadius: '8px',
                                                        border: 'none',
                                                        background: 'var(--primary)',
                                                        color: '#fff',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Custom In-App Fallback Request */}
                <div>
                    <label style={{ fontSize: '0.88rem', fontWeight: 800, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <MessageSquare size={16} color="#D97706" />
                        {selectedVendor && vendorMenu.length > 0
                            ? 'Not on the Menu? Request Custom Food (Optional)'
                            : 'Type What You Want to Eat'}
                    </label>
                    <p style={{ margin: '0 0 0.45rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Can't find what you want on the menu? Type it here and we'll get it from outside and confirm the price for you in-app.
                    </p>
                    <textarea
                        rows={2}
                        value={customRequest}
                        onChange={(e) => setCustomRequest(e.target.value)}
                        placeholder="e.g., 1 plate of pounded yam with egusi and goat meat..."
                        disabled={!dispatchConfig.acceptingOrders || submitting}
                        style={{
                            width: '100%',
                            padding: '0.7rem 0.85rem',
                            borderRadius: 'var(--radius-lg)',
                            border: '1.5px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--text)',
                            fontSize: '0.9rem',
                            fontFamily: 'inherit',
                            resize: 'vertical',
                        }}
                    />
                </div>

                {/* Optional Extra Note */}
                <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.25rem', display: 'block' }}>
                        Extra Cooking / Delivery Note (Optional)
                    </label>
                    <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="e.g., Little pepper, extra stew, put meat separately"
                        disabled={!dispatchConfig.acceptingOrders || submitting}
                        style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: 'var(--radius-lg)',
                            border: '1.5px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--text)',
                            fontSize: '0.88rem',
                        }}
                    />
                </div>

                {/* Minimal Checkout Fields: Name + Room Number + Gender ONLY */}
                <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 900, margin: '0 0 0.65rem' }}>
                        2. Your Delivery Details
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <User size={13} /> Your Name *
                            </label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => {
                                    setNameEdited(true);
                                    setStudentName(e.target.value);
                                }}
                                placeholder="e.g., Emeka / Tolu"
                                disabled={!dispatchConfig.acceptingOrders || submitting}
                                style={{
                                    width: '100%',
                                    padding: '0.7rem 0.85rem',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '1.5px solid var(--border)',
                                    background: 'var(--surface)',
                                    color: 'var(--text)',
                                    fontSize: '0.9rem',
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <MapPin size={13} /> Hostel &amp; Room Number *
                            </label>
                            <input
                                type="text"
                                value={roomNumber}
                                onChange={(e) => setRoomNumber(e.target.value)}
                                placeholder="e.g., Hostel B, Room 14"
                                disabled={!dispatchConfig.acceptingOrders || submitting}
                                style={{
                                    width: '100%',
                                    padding: '0.7rem 0.85rem',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '1.5px solid var(--border)',
                                    background: 'var(--surface)',
                                    color: 'var(--text)',
                                    fontSize: '0.9rem',
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem', display: 'block' }}>
                                Gender *
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                {['Male', 'Female'].map((g) => {
                                    const active = gender === g;
                                    return (
                                        <button
                                            key={g}
                                            type="button"
                                            disabled={!dispatchConfig.acceptingOrders || submitting}
                                            onClick={() => setGender(g)}
                                            style={{
                                                padding: '0.68rem',
                                                borderRadius: 'var(--radius-lg)',
                                                border: active ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                                                background: active ? 'var(--primary-light)' : 'var(--surface)',
                                                color: active ? 'var(--primary)' : 'var(--text)',
                                                fontWeight: 800,
                                                fontSize: '0.88rem',
                                                cursor: 'pointer',
                                                fontFamily: 'inherit',
                                            }}
                                        >
                                            {g}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Cost Breakdown + Optional Payment Instructions */}
                <div style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-xl)',
                    background: 'var(--surface)',
                    border: '1.5px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem',
                }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 900, marginBottom: '0.15rem' }}>
                        Order Summary
                    </div>
                    {hasMenuItemsSelected && selectedItems.map((it) => (
                        <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                            <span>{it.qty}× {it.name}</span>
                            <span style={{ fontWeight: 700 }}>{formatNaira(it.lineTotal)}</span>
                        </div>
                    ))}
                    {hasCustom && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: '#B45309', gap: '0.5rem' }}>
                            <span>Custom: {cleanCustom.slice(0, 60)}{cleanCustom.length > 60 ? '...' : ''}</span>
                            <span style={{ fontWeight: 800, flexShrink: 0 }}>Price to confirm</span>
                        </div>
                    )}
                    {!hasMenuItemsSelected && !hasCustom && (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            Select menu items above or type a custom food request to see your total.
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', paddingTop: '0.35rem', borderTop: '1px dashed var(--border)' }}>
                        <span>WDU Order &amp; Delivery Fee</span>
                        <span style={{ fontWeight: 800 }}>{formatNaira(dispatchConfig.orderFee)}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.98rem', fontWeight: 900, paddingTop: '0.3rem', borderTop: '1px solid var(--border)' }}>
                        <span>Total</span>
                        {fixedTotal !== null ? (
                            <span style={{ color: 'var(--primary)' }}>{formatNaira(fixedTotal)}</span>
                        ) : hasCustom ? (
                            <span style={{ fontSize: '0.82rem', color: '#D97706' }}>
                                {formatNaira(dispatchConfig.orderFee)} fee + custom item price (confirmed in-app)
                            </span>
                        ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>{formatNaira(dispatchConfig.orderFee)} + food</span>
                        )}
                    </div>

                    {dispatchConfig.paymentDetails && (
                        <div style={{
                            marginTop: '0.45rem',
                            padding: '0.65rem 0.8rem',
                            borderRadius: 'var(--radius-md)',
                            background: 'rgba(16, 185, 129, 0.09)',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.45rem',
                        }}>
                            <Wallet size={15} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div>
                                <strong style={{ display: 'block', color: '#059669' }}>Payment Details:</strong>
                                <span style={{ whiteSpace: 'pre-wrap' }}>{dispatchConfig.paymentDetails}</span>
                            </div>
                        </div>
                    )}
                </div>

                {feedback.text && (
                    <div style={{
                        padding: '0.8rem 1rem',
                        borderRadius: 'var(--radius-lg)',
                        background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.3)'}`,
                        color: feedback.type === 'success' ? '#059669' : '#DC2626',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                    }}>
                        {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        <span>{feedback.text}</span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={!dispatchConfig.acceptingOrders || submitting}
                    style={{
                        width: '100%',
                        padding: '0.95rem 1.25rem',
                        borderRadius: 'var(--radius-xl)',
                        border: 'none',
                        background: !dispatchConfig.acceptingOrders
                            ? 'var(--border)'
                            : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                        color: '#ffffff',
                        fontSize: '0.98rem',
                        fontWeight: 900,
                        cursor: !dispatchConfig.acceptingOrders || submitting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        boxShadow: dispatchConfig.acceptingOrders ? '0 8px 20px -4px rgba(217, 119, 6, 0.45)' : 'none',
                    }}
                >
                    {submitting ? <Loader size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={18} />}
                    <span>
                        {submitting
                            ? 'Sending Order...'
                            : fixedTotal !== null
                            ? `Send Food Order • ${formatNaira(fixedTotal)}`
                            : 'Send Food Order Now'}
                    </span>
                </button>
            </form>

            {/* Student's Live Order History */}
            {isAuthenticated && (
                <div>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.75rem' }}>
                        Your Live Food Orders ({myOrders.length})
                    </h2>
                    {myOrders.length === 0 ? (
                        <div style={{
                            padding: '1.25rem',
                            borderRadius: 'var(--radius-xl)',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-secondary)',
                            fontSize: '0.85rem',
                        }}>
                            You haven't placed a food order yet. Pick menu items or type a custom craving above and track delivery live right here.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {myOrders.map((ord) => {
                                const st = FOOD_ORDER_STATUS[ord.status] || FOOD_ORDER_STATUS.new;
                                const hasItems = Array.isArray(ord.items) && ord.items.length > 0;
                                const fee = Number.isFinite(Number(ord.orderFee)) ? Number(ord.orderFee) : DEFAULT_FOOD_ORDER_FEE;
                                const room = ord.roomNumber || ord.hostelLocation || '';
                                const foodCost = ord.confirmedFoodPrice !== null && ord.confirmedFoodPrice !== undefined
                                    ? Number(ord.confirmedFoodPrice)
                                    : ord.foodSubtotal > 0 && !ord.needsPriceConfirm
                                    ? Number(ord.foodSubtotal)
                                    : null;

                                return (
                                    <div
                                        key={ord.id}
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
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            <span style={{ fontWeight: 900, fontSize: '0.9rem' }}>
                                                {ord.orderCode} • {ord.vendorName}
                                            </span>
                                            <span style={{
                                                fontSize: '0.74rem',
                                                fontWeight: 800,
                                                padding: '0.22rem 0.65rem',
                                                borderRadius: '999px',
                                                background: st.bg,
                                                color: st.color,
                                            }}>
                                                {st.label}
                                            </span>
                                        </div>

                                        {hasItems && (
                                            <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                                {ord.items.map((it, idx) => (
                                                    <div key={it.id || idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span>{it.qty}× {it.name}</span>
                                                        <span style={{ fontWeight: 700 }}>{formatNaira(it.lineTotal)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {ord.customRequest && (
                                            <div style={{ fontSize: '0.86rem', color: 'var(--text)' }}>
                                                <strong>Custom request:</strong> {ord.customRequest}
                                            </div>
                                        )}
                                        {!hasItems && !ord.customRequest && ord.orderMessage && (
                                            <div style={{ fontSize: '0.88rem', color: 'var(--text)' }}>
                                                {ord.orderMessage}
                                            </div>
                                        )}
                                        {ord.note && (
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                                <strong>Note:</strong> {ord.note}
                                            </div>
                                        )}

                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.85rem', flexWrap: 'wrap', paddingTop: '0.35rem', borderTop: '1px dashed var(--border)' }}>
                                            <span><strong>Room:</strong> {room}</span>
                                            {ord.gender && <span><strong>Gender:</strong> {ord.gender}</span>}
                                            <span>
                                                <strong>Total:</strong>{' '}
                                                {ord.totalAmount !== null && ord.totalAmount !== undefined
                                                    ? `${formatNaira(ord.totalAmount)} (Food ${formatNaira(foodCost)} + Fee ${formatNaira(fee)})`
                                                    : `Awaiting price confirmation (+ ${formatNaira(fee)} fee)`}
                                            </span>
                                        </div>

                                        {(ord.adminNote || (ord.confirmedFoodPrice !== null && ord.confirmedFoodPrice !== undefined)) && (
                                            <div style={{
                                                marginTop: '0.2rem',
                                                padding: '0.6rem 0.75rem',
                                                borderRadius: 'var(--radius-md)',
                                                background: 'rgba(16, 185, 129, 0.1)',
                                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                                color: '#047857',
                                                fontSize: '0.82rem',
                                                fontWeight: 700,
                                            }}>
                                                {ord.confirmedFoodPrice !== null && ord.confirmedFoodPrice !== undefined && (
                                                    <div>
                                                        Confirmed Price: Food {formatNaira(ord.confirmedFoodPrice)} + Order Fee {formatNaira(fee)} = Total {formatNaira(ord.totalAmount)}
                                                    </div>
                                                )}
                                                {ord.adminNote && <div>Update from Market-U: {ord.adminNote}</div>}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            <AuthPromptModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                message="Log in or sign up to send your WDU food order and track delivery."
            />
        </div>
    );
};

export default OrderFood;
