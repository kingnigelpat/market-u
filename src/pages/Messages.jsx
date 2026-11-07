import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, serverTimestamp, addDoc, orderBy, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Send, ShoppingBag, ExternalLink, User, ChevronRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import { sendPushNotification } from '../utils/notifications';
import { logEvent } from '../utils/analyticsService';

const formatTime = (ts) => {
    if (!ts) return '';
    try {
        const date = ts.toDate ? ts.toDate() : (ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts));
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
        return '';
    }
};

const Messages = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [sellerChats, setSellerChats] = useState([]);
    const [buyerChats, setBuyerChats] = useState([]);
    const [activeChatId, setActiveChatId] = useState(null);
    const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'selling' | 'buying'
    const [loading, setLoading] = useState(() => Boolean(currentUser?.uid));

    useEffect(() => {
        if (!currentUser?.uid) {
            return;
        }

        let sellerLoaded = false;
        let buyerLoaded = false;

        const qSeller = query(
            collection(db, 'chats'),
            where('sellerId', '==', currentUser.uid)
        );
        const qBuyer = query(
            collection(db, 'chats'),
            where('buyerId', '==', currentUser.uid)
        );

        const unsubSeller = onSnapshot(qSeller, (snapshot) => {
            setSellerChats(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            sellerLoaded = true;
            if (buyerLoaded) setLoading(false);
        }, (err) => {
            console.error('Error fetching seller chats:', err);
            sellerLoaded = true;
            if (buyerLoaded) setLoading(false);
        });

        const unsubBuyer = onSnapshot(qBuyer, (snapshot) => {
            setBuyerChats(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            buyerLoaded = true;
            if (sellerLoaded) setLoading(false);
        }, (err) => {
            console.error('Error fetching buyer chats:', err);
            buyerLoaded = true;
            if (sellerLoaded) setLoading(false);
        });

        return () => {
            unsubSeller();
            unsubBuyer();
        };
    }, [currentUser]);

    if (!currentUser) {
        return null;
    }

    // Merge and deduplicate chats
    const mergedMap = new Map();
    sellerChats.forEach(c => mergedMap.set(c.id, c));
    buyerChats.forEach(c => mergedMap.set(c.id, c));

    const allChats = Array.from(mergedMap.values()).sort((a, b) => {
        const getMs = (item) => {
            if (item.updatedAt?.toMillis) return item.updatedAt.toMillis();
            if (item.updatedAt?.seconds) return item.updatedAt.seconds * 1000;
            if (item.createdAt?.toMillis) return item.createdAt.toMillis();
            if (item.createdAt?.seconds) return item.createdAt.seconds * 1000;
            return 0;
        };
        return getMs(b) - getMs(a);
    });

    const chats = allChats.filter(c => {
        if (roleFilter === 'selling') return c.sellerId === currentUser.uid;
        if (roleFilter === 'buying') return c.buyerId === currentUser.uid;
        return true;
    });

    const activeChat = allChats.find(c => c.id === activeChatId);

    return (
        <div className="container messages-page" style={{ paddingTop: '1rem', paddingBottom: '1.5rem', maxWidth: '1080px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <button
                    onClick={() => navigate(-1)}
                    className="btn"
                    style={{ color: 'var(--text-secondary)', paddingLeft: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                    <ArrowLeft size={18} /> Back
                </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.875rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <div style={{
                        width: '46px', height: '46px',
                        backgroundColor: 'rgba(37, 99, 235, 0.12)',
                        borderRadius: '14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--primary)',
                        flexShrink: 0
                    }}>
                        <MessageCircle size={24} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: '900', letterSpacing: '-0.02em', margin: 0, color: 'var(--text)' }}>
                            Messages
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                            Chat with buyers and sellers on campus
                        </p>
                    </div>
                </div>

                {allChats.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {[
                            { key: 'all', label: `All (${allChats.length})` },
                            { key: 'selling', label: `Selling (${sellerChats.length})` },
                            { key: 'buying', label: `Buying (${buyerChats.length})` },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setRoleFilter(tab.key)}
                                style={{
                                    padding: '0.4rem 0.85rem',
                                    borderRadius: '99px',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    border: '1px solid var(--border)',
                                    backgroundColor: roleFilter === tab.key ? 'var(--primary)' : 'var(--surface)',
                                    color: roleFilter === tab.key ? '#fff' : 'var(--text-secondary)',
                                    cursor: 'pointer'
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    Loading conversations...
                </div>
            ) : allChats.length === 0 ? (
                <div className="card" style={{
                    textAlign: 'center', padding: '3.5rem 2rem', borderRadius: 'var(--radius-xl)'
                }}>
                    <div style={{
                        width: '56px', height: '56px', borderRadius: '50%',
                        backgroundColor: 'var(--surface-elevated)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1.25rem', color: 'var(--text-tertiary)'
                    }}>
                        <MessageCircle size={28} />
                    </div>
                    <h3 style={{ fontWeight: '800', fontSize: '1.25rem', marginBottom: '0.5rem' }}>No messages yet</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', maxWidth: '380px', margin: '0 auto 1.5rem' }}>
                        When you message a seller about a product or a buyer messages you, the conversation appears here.
                    </p>
                    <Link to="/market" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        Browse Market
                    </Link>
                </div>
            ) : (
                <div className="messages-layout">
                    {/* Conversations List Column */}
                    <div className={`messages-sidebar ${activeChatId ? 'messages-sidebar--hidden-mobile' : ''}`}>
                        <div className="messages-sidebar-header">
                            <span style={{ fontWeight: '800', fontSize: '0.9375rem' }}>Conversations</span>
                            <span className="badge" style={{ fontSize: '0.75rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '0.2rem 0.5rem', borderRadius: '999px', fontWeight: '700' }}>
                                {chats.length}
                            </span>
                        </div>

                        <div className="messages-sidebar-list">
                            {chats.map(chat => {
                                const isSelected = activeChatId === chat.id;
                                const isUnreadByMe = chat.lastSenderId && chat.lastSenderId !== currentUser.uid;
                                const amISeller = chat.sellerId === currentUser.uid;
                                const partnerLabel = amISeller ? (chat.buyerName || 'Buyer') : (chat.sellerName || 'Seller');

                                return (
                                    <button
                                        key={chat.id}
                                        onClick={() => setActiveChatId(chat.id)}
                                        className={`chat-list-item ${isSelected ? 'chat-list-item--active' : ''}`}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', width: '100%' }}>
                                            <div className="chat-avatar">
                                                <User size={16} />
                                            </div>

                                            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                                                    <span style={{ fontWeight: '700', fontSize: '0.9375rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {partnerLabel}
                                                    </span>
                                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', flexShrink: 0, marginLeft: '0.5rem' }}>
                                                        {formatTime(chat.updatedAt || chat.createdAt)}
                                                    </span>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
                                                    <ShoppingBag size={12} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {chat.productName || 'Product'}
                                                    </span>
                                                    {chat.saleCompleted && (
                                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#059669', backgroundColor: 'rgba(16, 185, 129, 0.12)', padding: '0.1rem 0.4rem', borderRadius: '99px', flexShrink: 0 }}>
                                                            ✓ Sold
                                                        </span>
                                                    )}
                                                </div>

                                                <p style={{
                                                    fontSize: '0.8125rem',
                                                    color: isUnreadByMe ? 'var(--text)' : 'var(--text-secondary)',
                                                    fontWeight: isUnreadByMe ? '600' : '400',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    margin: 0
                                                }}>
                                                    {chat.lastMessage || 'Started a conversation'}
                                                </p>
                                            </div>

                                            <ChevronRight size={16} className="hide-on-desktop" style={{ color: 'var(--text-tertiary)', alignSelf: 'center', flexShrink: 0 }} />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Active Chat Conversation Area */}
                    <div className={`messages-main ${!activeChatId ? 'messages-main--hidden-mobile' : ''}`}>
                        {activeChat ? (
                            <ActiveChatView
                                chat={activeChat}
                                onBack={() => setActiveChatId(null)}
                            />
                        ) : (
                            <div className="messages-empty-placeholder">
                                <div style={{
                                    width: '64px', height: '64px',
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--surface)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--text-tertiary)',
                                    marginBottom: '1rem'
                                }}>
                                    <MessageCircle size={32} />
                                </div>
                                <h3 style={{ fontWeight: '800', fontSize: '1.125rem', marginBottom: '0.35rem' }}>Select a conversation</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '300px' }}>
                                    Choose a conversation from the left to read messages and reply.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                .messages-layout {
                    display: flex;
                    height: 640px;
                    background-color: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-xl);
                    overflow: hidden;
                    box-shadow: var(--shadow-sm);
                }

                .messages-sidebar {
                    width: 360px;
                    border-right: 1px solid var(--border);
                    display: flex;
                    flex-direction: column;
                    background-color: var(--surface-elevated);
                    flex-shrink: 0;
                }

                .messages-sidebar-header {
                    padding: 1rem 1.25rem;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .messages-sidebar-list {
                    flex: 1;
                    overflow-y: auto;
                }

                .chat-list-item {
                    display: block;
                    width: 100%;
                    padding: 1rem 1.25rem;
                    background: none;
                    border: none;
                    border-bottom: 1px solid var(--border);
                    cursor: pointer;
                    transition: background 0.15s ease;
                }

                .chat-list-item:hover {
                    background-color: var(--surface);
                }

                .chat-list-item--active {
                    background-color: var(--primary-light) !important;
                    border-left: 3px solid var(--primary);
                }

                .chat-avatar {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: var(--surface);
                    color: var(--text-secondary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .messages-main {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    background-color: var(--background);
                }

                .messages-empty-placeholder {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 2rem;
                }

                @media (max-width: 768px) {
                    .messages-layout {
                        height: 75vh;
                    }
                    .messages-sidebar {
                        width: 100%;
                        border-right: none;
                    }
                    .messages-sidebar--hidden-mobile {
                        display: none !important;
                    }
                    .messages-main--hidden-mobile {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
};

const ActiveChatView = ({ chat, onBack }) => {
    const { currentUser, userName } = useAuth();
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const [markingSale, setMarkingSale] = useState(false);
    const messagesEndRef = useRef(null);

    const amISeller = chat?.sellerId === currentUser?.uid;
    const partnerName = amISeller ? (chat.buyerName || 'Buyer') : (chat.sellerName || 'Seller');

    useEffect(() => {
        if (!chat?.id) return;

        const q = query(
            collection(db, 'chats', chat.id, 'messages'),
            orderBy('createdAt', 'asc')
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const msgs = [];
            snapshot.forEach(docSnap => {
                msgs.push({ id: docSnap.id, ...docSnap.data() });
            });
            setMessages(msgs);
            setLoading(false);
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }, (err) => {
            console.error("Error listening to messages:", err);
            setLoading(false);
        });

        return () => unsub();
    }, [chat.id]);

    const handleMarkSaleCompleted = async () => {
        if (!amISeller || chat.saleCompleted || markingSale) return;
        setMarkingSale(true);
        try {
            await updateDoc(doc(db, 'chats', chat.id), {
                saleCompleted: true,
                completedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            try {
                await setDoc(doc(db, 'publicProfiles', currentUser.uid), {
                    completedSalesCount: increment(1)
                }, { merge: true });
            } catch (e) {
                console.warn('Could not increment public completedSalesCount:', e);
            }
            try {
                await updateDoc(doc(db, 'users', currentUser.uid), {
                    completedSalesCount: increment(1)
                });
            } catch (e) {
                console.warn('Could not increment user completedSalesCount:', e);
            }
        } catch (err) {
            console.error('Error marking sale completed:', err);
        } finally {
            setMarkingSale(false);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!text.trim() || !chat.id) return;

        const msgText = text.trim();
        setText('');

        try {
            await addDoc(collection(db, 'chats', chat.id, 'messages'), {
                senderId: currentUser.uid,
                senderName: userName || currentUser.displayName || (amISeller ? 'Seller' : 'Buyer'),
                text: msgText,
                createdAt: serverTimestamp()
            });

            await updateDoc(doc(db, 'chats', chat.id), {
                updatedAt: serverTimestamp(),
                lastMessage: msgText,
                lastSenderId: currentUser.uid
            });

            if (amISeller) {
                logEvent({
                    eventType: 'seller_replied',
                    userId: currentUser.uid,
                    sellerId: currentUser.uid,
                    productId: chat.productId || null,
                    metadata: { chatId: chat.id, buyerId: chat.buyerId }
                });
            }

            const recipientId = amISeller ? chat.buyerId : chat.sellerId;
            if (recipientId) {
                sendPushNotification({
                    recipientUserId: recipientId,
                    type: 'chat_message',
                    buyerName: userName || currentUser.displayName || (amISeller ? 'Seller' : 'Buyer'),
                    productName: chat.productName || 'Your inquired item',
                    text: msgText,
                    productId: chat.productId || null,
                    link: chat.productId ? `/product/${chat.productId}?chat=true` : '/messages',
                }).catch(e => console.warn('Could not notify recipient of reply:', e));
            }
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Active Chat Header */}
            <div style={{
                padding: '0.875rem 1.25rem',
                backgroundColor: 'var(--surface-elevated)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                        onClick={onBack}
                        className="hide-on-desktop"
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--text)' }}>
                            {partnerName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <ShoppingBag size={12} />
                            <span>{chat.productName || 'Product'}</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    {amISeller && (
                        chat.saleCompleted ? (
                            <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                padding: '0.35rem 0.75rem',
                                borderRadius: 'var(--radius-full)',
                                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                                color: '#059669',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                            }}>
                                <CheckCircle2 size={13} /> Sale Completed
                            </span>
                        ) : (
                            <button
                                type="button"
                                onClick={handleMarkSaleCompleted}
                                disabled={markingSale}
                                style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    padding: '0.35rem 0.75rem',
                                    borderRadius: 'var(--radius-full)',
                                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                                    color: '#059669',
                                    border: '1px solid rgba(16, 185, 129, 0.35)',
                                    cursor: markingSale ? 'not-allowed' : 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem'
                                }}
                                title="Confirm that you completed this sale with the buyer"
                            >
                                <CheckCircle2 size={13} /> {markingSale ? 'Saving...' : 'Mark Sale Completed'}
                            </button>
                        )
                    )}
                    {chat.productId && (
                        <Link
                            to={`/product/${chat.productId}`}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-full)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                            <ExternalLink size={12} /> View Product
                        </Link>
                    )}
                </div>
            </div>

            {/* Safety Tip Strip */}
            <div style={{
                padding: '0.45rem 1rem',
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.74rem',
                color: 'var(--text)'
            }}>
                <ShieldAlert size={14} color="#d97706" style={{ flexShrink: 0 }} />
                <span>
                    <strong>Safety Tip:</strong> Meet in a public campus spot, confirm the item &amp; price before paying, and report suspicious sellers.
                </span>
            </div>

            {/* Messages Body */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                backgroundColor: 'var(--background)'
            }}>
                {loading ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '3rem' }}>
                        <div className="spinner" style={{ margin: '0 auto 0.75rem' }} />
                        Loading conversation...
                    </div>
                ) : messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: 'auto 0', padding: '1rem', fontSize: '0.875rem' }}>
                        No messages recorded in this chat yet.
                    </div>
                ) : (
                    messages.map(msg => {
                        const isMine = msg.senderId === currentUser.uid;
                        return (
                            <div key={msg.id} style={{
                                alignSelf: isMine ? 'flex-end' : 'flex-start',
                                maxWidth: '75%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: isMine ? 'flex-end' : 'flex-start'
                            }}>
                                <div style={{
                                    backgroundColor: isMine ? 'var(--primary)' : 'var(--surface-elevated)',
                                    color: isMine ? 'white' : 'var(--text)',
                                    padding: '0.625rem 1rem',
                                    borderRadius: '1.125rem',
                                    borderBottomRightRadius: isMine ? '0.2rem' : '1.125rem',
                                    borderBottomLeftRadius: !isMine ? '0.2rem' : '1.125rem',
                                    fontSize: '0.9375rem',
                                    boxShadow: 'var(--shadow-sm)',
                                    border: isMine ? 'none' : '1px solid var(--border)',
                                    wordBreak: 'break-word'
                                }}>
                                    {msg.text}
                                </div>
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: '0.2rem', padding: '0 0.35rem' }}>
                                    {formatTime(msg.createdAt)}
                                </span>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <form onSubmit={handleSend} style={{
                padding: '0.875rem 1.25rem',
                backgroundColor: 'var(--surface-elevated)',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                gap: '0.625rem',
                alignItems: 'center'
            }}>
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={`Message ${partnerName}...`}
                    style={{
                        flex: 1,
                        padding: '0.6875rem 1.125rem',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--border)',
                        outline: 'none',
                        backgroundColor: 'var(--background)',
                        color: 'var(--text)',
                        fontSize: '0.9375rem'
                    }}
                />
                <button
                    type="submit"
                    disabled={!text.trim()}
                    style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        backgroundColor: text.trim() ? 'var(--primary)' : 'var(--surface)',
                        color: text.trim() ? 'white' : 'var(--text-tertiary)',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: text.trim() ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s',
                        flexShrink: 0
                    }}
                    title="Send Reply"
                >
                    <Send size={18} style={{ marginLeft: '-2px' }} />
                </button>
            </form>
        </div>
    );
};

export default Messages;
