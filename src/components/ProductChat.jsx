import { useState, useEffect, useRef, useMemo } from 'react';
import { collection, query, addDoc, serverTimestamp, orderBy, onSnapshot, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { X, Send, AlertTriangle, Store, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sendPushNotification } from '../utils/notifications';

const ProductChat = ({ product, onClose }) => {
    const { currentUser, userName } = useAuth();
    // Deterministic chat ID: 1-to-1 conversation per product and buyer
    const chatId = product?.id && currentUser?.uid ? `${product.id}_${currentUser.uid}` : null;
    const [allMessages, setAllMessages] = useState([]);
    const [clearedAt, setClearedAt] = useState(null);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState('');
    const messagesEndRef = useRef(null);
    const chatIdRef = useRef(null);

    // Keep ref in sync for cleanup on unmount
    useEffect(() => {
        chatIdRef.current = chatId;
    }, [chatId]);

    // Cleanup: clear buyer's chat view whenever they close or leave the page
    useEffect(() => {
        return () => {
            if (chatIdRef.current) {
                updateDoc(doc(db, 'chats', chatIdRef.current), {
                    buyerClearedAt: serverTimestamp()
                }).catch(err => {
                    console.warn("Could not set buyerClearedAt on unmount:", err);
                });
            }
        };
    }, []);

    // Ensure chat doc exists in Firestore
    useEffect(() => {
        if (!chatId || !product?.id || !currentUser?.uid) return;

        let isMounted = true;
        const ensureChatDoc = async () => {
            try {
                const chatRef = doc(db, 'chats', chatId);
                const snap = await getDoc(chatRef);
                if (!snap.exists()) {
                    await setDoc(chatRef, {
                        productId: product.id,
                        buyerId: currentUser.uid,
                        sellerId: product.sellerId || '',
                        buyerName: userName || currentUser.displayName || 'A buyer',
                        productName: product.title || 'Product',
                        productPrice: product.price || '',
                        productImage: product.images?.[0] || product.image || '',
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                        buyerClearedAt: null,
                    });
                }
            } catch (err) {
                console.warn("Notice: Chat doc check:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        ensureChatDoc();
        return () => { isMounted = false; };
    }, [chatId, product.id, product.sellerId, currentUser.uid, currentUser.displayName, userName, product.title, product.price, product.images, product.image]);

    // Subscribe to chat metadata (buyerClearedAt) and messages
    useEffect(() => {
        if (!chatId) return;

        // 1. Listen to chat doc to get buyerClearedAt
        const unsubChat = onSnapshot(doc(db, 'chats', chatId), (chatSnap) => {
            if (chatSnap.exists()) {
                const data = chatSnap.data();
                const cTime = data.buyerClearedAt?.toMillis
                    ? data.buyerClearedAt.toMillis()
                    : (data.buyerClearedAt?.seconds ? data.buyerClearedAt.seconds * 1000 : null);
                setClearedAt(cTime);
            }
        }, (err) => {
            console.error("Error listening to chat doc:", err);
        });

        // 2. Listen to messages subcollection
        const qMessages = query(
            collection(db, 'chats', chatId, 'messages'),
            orderBy('createdAt', 'asc')
        );

        const unsubMessages = onSnapshot(qMessages, (snapshot) => {
            const msgs = [];
            snapshot.forEach(docSnap => {
                msgs.push({ id: docSnap.id, ...docSnap.data() });
            });
            setAllMessages(msgs);
            setLoading(false);
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }, (err) => {
            console.error("Error listening to messages:", err);
            setLoading(false);
        });

        return () => {
            unsubChat();
            unsubMessages();
        };
    }, [chatId]);

    // Messages visible to buyer (filtered by buyerClearedAt)
    const visibleMessages = useMemo(() => {
        if (!clearedAt) return allMessages;
        return allMessages.filter(msg => {
            const msgTime = msg.createdAt?.toMillis
                ? msg.createdAt.toMillis()
                : (msg.createdAt?.seconds ? msg.createdAt.seconds * 1000 : (msg.createdAt ? new Date(msg.createdAt).getTime() : Infinity));
            return msgTime > clearedAt;
        });
    }, [allMessages, clearedAt]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!text.trim() || !chatId || sending) return;

        const msgText = text.trim();
        setText('');
        setSending(true);
        setSendError('');

        try {
            // Atomically ensure parent chat document exists and record last message
            await setDoc(doc(db, 'chats', chatId), {
                productId: product.id,
                buyerId: currentUser.uid,
                sellerId: product.sellerId || '',
                buyerName: userName || currentUser.displayName || 'A buyer',
                productName: product.title || 'Product',
                productPrice: product.price || '',
                productImage: product.images?.[0] || product.image || '',
                updatedAt: serverTimestamp(),
                lastMessage: msgText,
                lastSenderId: currentUser.uid
            }, { merge: true });

            // Add new message to subcollection
            await addDoc(collection(db, 'chats', chatId, 'messages'), {
                senderId: currentUser.uid,
                senderName: userName || currentUser.displayName || 'Buyer',
                text: msgText,
                createdAt: serverTimestamp()
            });

            // If seller has fcm tokens, send push notification
            if (product.sellerId) {
                try {
                    const sellerDoc = await getDoc(doc(db, 'users', product.sellerId));
                    if (sellerDoc.exists()) {
                        const sellerData = sellerDoc.data() || {};
                        let fcmTokens = sellerData.fcmTokens || [];
                        if (fcmTokens.length === 0 && sellerData.fcmToken) {
                            fcmTokens = [sellerData.fcmToken];
                        }
                        if (fcmTokens.length > 0) {
                            sendPushNotification(
                                fcmTokens,
                                userName || currentUser.displayName || 'A buyer',
                                product.title
                            ).catch(pushErr => console.warn('Push error on chat:', pushErr));
                        }
                    }
                } catch (pushErr) {
                    console.warn('Could not send push notification to seller:', pushErr);
                }
            }
        } catch (error) {
            console.error("Error sending message:", error);
            setText(msgText); // Restore input so user doesn't lose text
            setSendError(error.code === 'permission-denied'
                ? 'Permission denied. Please verify your Firestore rules in Firebase Console.'
                : 'Failed to send message. Please check your internet connection.');
        } finally {
            setSending(false);
        }
    };

    const handleClose = async () => {
        if (chatId) {
            try {
                await updateDoc(doc(db, 'chats', chatId), {
                    buyerClearedAt: serverTimestamp()
                });
            } catch (error) {
                console.error("Error clearing chat history on close:", error);
            }
        }
        onClose();
    };

    return (
        <div style={{
            marginTop: '1.5rem',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            backgroundColor: 'var(--surface)',
            display: 'flex',
            flexDirection: 'column',
            height: '420px',
            boxShadow: 'var(--shadow-md)',
            animation: 'fadeInUp 0.25s ease'
        }}>
            {/* Header */}
            <div style={{
                padding: '0.875rem 1.25rem',
                backgroundColor: 'var(--surface-elevated)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div style={{
                        width: '32px', height: '32px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary-light)',
                        color: 'var(--primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Store size={16} />
                    </div>
                    <div>
                        <span style={{ fontWeight: '800', fontSize: '0.9375rem', display: 'block', color: 'var(--text)' }}>
                            Chat with Seller
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {product.title}
                        </span>
                    </div>
                </div>
                <button 
                    onClick={handleClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        padding: '0.35rem',
                        borderRadius: 'var(--radius-full)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s'
                    }}
                    title="Close Chat"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Warning Banner */}
            <div style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                color: '#d97706',
                fontSize: '0.75rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderBottom: '1px solid rgba(245, 158, 11, 0.2)'
            }}>
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                <span>Notice: Leaving or closing this chat clears your conversation history.</span>
            </div>

            {/* Messages Area */}
            <div style={{
                flex: 1,
                padding: '1rem',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                backgroundColor: 'var(--background)'
            }}>
                {loading ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2.5rem', fontSize: '0.875rem' }}>
                        <div className="spinner" style={{ margin: '0 auto 0.75rem' }} />
                        Loading conversation...
                    </div>
                ) : visibleMessages.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        color: 'var(--text-secondary)',
                        margin: 'auto 0',
                        padding: '1.5rem',
                        fontSize: '0.875rem'
                    }}>
                        <p style={{ fontWeight: '700', color: 'var(--text)', marginBottom: '0.25rem' }}>Ask a question!</p>
                        <p style={{ margin: 0, fontSize: '0.8125rem' }}>Inquire about availability, pickup location, or negotiation.</p>
                    </div>
                ) : (
                    visibleMessages.map(msg => {
                        const isMine = msg.senderId === currentUser.uid;
                        return (
                            <div key={msg.id} style={{
                                alignSelf: isMine ? 'flex-end' : 'flex-start',
                                backgroundColor: isMine ? 'var(--primary)' : 'var(--surface-elevated)',
                                color: isMine ? 'white' : 'var(--text)',
                                padding: '0.625rem 1rem',
                                borderRadius: '1rem',
                                borderBottomRightRadius: isMine ? '0.25rem' : '1rem',
                                borderBottomLeftRadius: !isMine ? '0.25rem' : '1rem',
                                maxWidth: '82%',
                                fontSize: '0.9375rem',
                                boxShadow: 'var(--shadow-sm)',
                                wordBreak: 'break-word',
                                border: isMine ? 'none' : '1px solid var(--border)'
                            }}>
                                {msg.text}
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Error Banner */}
            {sendError && (
                <div style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: 'var(--danger)',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    borderTop: '1px solid rgba(239, 68, 68, 0.2)'
                }}>
                    ⚠️ {sendError}
                </div>
            )}

            {/* Input Area */}
            <form onSubmit={handleSend} style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--surface)',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center'
            }}>
                <input 
                    type="text" 
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type your question..."
                    style={{
                        flex: 1,
                        padding: '0.625rem 1rem',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--border)',
                        outline: 'none',
                        backgroundColor: 'var(--background)',
                        color: 'var(--text)',
                        fontSize: '0.875rem'
                    }}
                    disabled={sending}
                />
                <button 
                    type="submit"
                    disabled={!text.trim() || sending}
                    style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        backgroundColor: (text.trim() && !sending) ? 'var(--primary)' : 'var(--surface-elevated)',
                        color: (text.trim() && !sending) ? 'white' : 'var(--text-tertiary)',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: (text.trim() && !sending) ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s',
                        flexShrink: 0
                    }}
                    title="Send"
                >
                    {sending ? (
                        <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                        <Send size={16} style={{ marginLeft: '-2px' }} />
                    )}
                </button>
            </form>
        </div>
    );
};

export default ProductChat;
