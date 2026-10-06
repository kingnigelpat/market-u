import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, addDoc, orderBy, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Send, ShoppingBag, ExternalLink, User, ChevronRight } from 'lucide-react';
import { sendPushNotification } from '../utils/notifications';

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
    const { currentUser, isSeller } = useAuth();
    const navigate = useNavigate();
    const [chats, setChats] = useState([]);
    const [activeChatId, setActiveChatId] = useState(null);
    const [loading, setLoading] = useState(() => Boolean(currentUser?.uid && isSeller));

    useEffect(() => {
        if (!currentUser?.uid || !isSeller) {
            return;
        }

        // Query by sellerId. Sort client-side to prevent missing composite index errors.
        const q = query(
            collection(db, 'chats'),
            where('sellerId', '==', currentUser.uid)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const chatList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            
            // Client-side sort by updatedAt / createdAt desc
            chatList.sort((a, b) => {
                const getMs = (item) => {
                    if (item.updatedAt?.toMillis) return item.updatedAt.toMillis();
                    if (item.updatedAt?.seconds) return item.updatedAt.seconds * 1000;
                    if (item.createdAt?.toMillis) return item.createdAt.toMillis();
                    if (item.createdAt?.seconds) return item.createdAt.seconds * 1000;
                    return 0;
                };
                return getMs(b) - getMs(a);
            });

            setChats(chatList);
            setLoading(false);
        }, (err) => {
            console.error('Error fetching chats:', err);
            setLoading(false);
        });

        return () => unsub();
    }, [currentUser, isSeller]);

    if (!currentUser || !isSeller) {
        return (
            <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
                <div className="card" style={{ maxWidth: '480px', margin: '0 auto', padding: '2.5rem' }}>
                    <MessageCircle size={40} style={{ color: 'var(--primary)', margin: '0 auto 1rem' }} />
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.5rem' }}>Seller Access Required</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                        You must have an active seller account to view buyer inquiries.
                    </p>
                    <Link to="/dashboard" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                        Go to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    const activeChat = chats.find(c => c.id === activeChatId);

    return (
        <div className="container messages-page" style={{ paddingTop: '1.25rem', paddingBottom: '3rem', maxWidth: '1080px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <button
                    onClick={() => navigate(-1)}
                    className="btn"
                    style={{ color: 'var(--text-secondary)', paddingLeft: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                    <ArrowLeft size={18} /> Back
                </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.5rem' }}>
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
                        Buyer Messages
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                        Inquiries and questions from potential buyers
                    </p>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    Loading conversations...
                </div>
            ) : chats.length === 0 ? (
                <div className="card" style={{
                    textAlign: 'center', padding: '4rem 2rem', borderRadius: 'var(--radius-xl)'
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
                        When interested students ask questions about your listings, they will show up right here.
                    </p>
                    <Link to="/add-product" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        List More Products
                    </Link>
                </div>
            ) : (
                <div className="messages-layout">
                    {/* Conversations List Column */}
                    <div className={`messages-sidebar ${activeChatId ? 'messages-sidebar--hidden-mobile' : ''}`}>
                        <div className="messages-sidebar-header">
                            <span style={{ fontWeight: '800', fontSize: '0.9375rem' }}>Active Chats</span>
                            <span className="badge" style={{ fontSize: '0.75rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '0.2rem 0.5rem', borderRadius: '999px', fontWeight: '700' }}>
                                {chats.length}
                            </span>
                        </div>

                        <div className="messages-sidebar-list">
                            {chats.map(chat => {
                                const isSelected = activeChatId === chat.id;
                                const isUnreadByMe = chat.lastSenderId && chat.lastSenderId !== currentUser.uid;

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
                                                        {chat.buyerName || 'Buyer'}
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
                                    Choose a buyer from the list on the left to review their inquiry and reply.
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
    const messagesEndRef = useRef(null);

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

    const handleSend = async (e) => {
        e.preventDefault();
        if (!text.trim() || !chat.id) return;

        const msgText = text.trim();
        setText('');

        try {
            await addDoc(collection(db, 'chats', chat.id, 'messages'), {
                senderId: currentUser.uid,
                senderName: userName || currentUser.displayName || 'Seller',
                text: msgText,
                createdAt: serverTimestamp()
            });

            await updateDoc(doc(db, 'chats', chat.id), {
                updatedAt: serverTimestamp(),
                lastMessage: msgText,
                lastSenderId: currentUser.uid
            });

            // If buyer has FCM tokens, notify them of seller reply
            if (chat.buyerId) {
                try {
                    const buyerDoc = await getDoc(doc(db, 'users', chat.buyerId));
                    if (buyerDoc.exists()) {
                        const buyerData = buyerDoc.data() || {};
                        let fcmTokens = buyerData.fcmTokens || [];
                        if (fcmTokens.length === 0 && buyerData.fcmToken) {
                            fcmTokens = [buyerData.fcmToken];
                        }
                        if (fcmTokens.length > 0) {
                            sendPushNotification(
                                fcmTokens,
                                userName || currentUser.displayName || 'Seller',
                                chat.productName || 'Your inquired item'
                            ).catch(e => console.warn('Could not notify buyer of reply:', e));
                        }
                    }
                } catch (pushErr) {
                    console.warn('Error fetching buyer tokens:', pushErr);
                }
            }
        } catch (error) {
            console.error("Error sending seller message:", error);
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
                            {chat.buyerName || 'Buyer'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <ShoppingBag size={12} />
                            <span>{chat.productName || 'Product'}</span>
                        </div>
                    </div>
                </div>

                {chat.productId && (
                    <Link
                        to={`/product/${chat.productId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-full)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                        <ExternalLink size={12} /> View Product
                    </Link>
                )}
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
                    placeholder="Reply to buyer..."
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
