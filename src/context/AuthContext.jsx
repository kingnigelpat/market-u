import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { auth, db, messagingReady } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { requestNotificationPermission, listenForForegroundMessages } from '../utils/notifications';
import { SUPPORTED_SCHOOL } from '../data/institutions';

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null); // 'buyer', 'seller', 'admin'
    const [userName, setUserName] = useState('');
    const [userPhone, setUserPhone] = useState('');
    const [userSchoolName, setUserSchoolName] = useState('');
    const [joinedGroupChat, setJoinedGroupChat] = useState(false);
    const [loading, setLoading] = useState(true);
    const notifRequestedRef = useRef(false); // prevent multiple permission prompts per session
    const unlistenForegroundRef = useRef(null); // cleanup foreground listener
    const unlistenUserDocRef = useRef(null); // cleanup Firestore user doc listener

    // Prime Web Audio context on first user interaction (required by browser autoplay policy)
    useEffect(() => {
        let primed = false;
        const prime = () => {
            if (primed) return;
            primed = true;
            try {
                // Create & immediately suspend a silent AudioContext to unlock future plays
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                ctx.resume().then(() => ctx.close()).catch(() => {});
            } catch (_) {}
            document.removeEventListener('click', prime);
            document.removeEventListener('touchstart', prime);
        };
        document.addEventListener('click', prime);
        document.addEventListener('touchstart', prime);
        return () => {
            document.removeEventListener('click', prime);
            document.removeEventListener('touchstart', prime);
        };
    }, []);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            // Clean up any previous user doc listener
            if (unlistenUserDocRef.current) {
                unlistenUserDocRef.current();
                unlistenUserDocRef.current = null;
            }

            if (user) {
                setCurrentUser(user);

                // Subscribe to real-time updates for this user in Firestore
                const userDocRef = doc(db, 'users', user.uid);
                unlistenUserDocRef.current = onSnapshot(userDocRef, async (userDoc) => {
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        let role = (data.role || '').trim().toLowerCase();

                        // Treat approved seller request as seller
                        if (role !== 'admin' && (role === 'seller' || data.sellerRequestStatus === 'approved')) {
                            role = 'seller';
                        }

                        // Fallback check: if role isn't seller or admin, verify if they already have product listings
                        if (role !== 'seller' && role !== 'admin') {
                            try {
                                const prodQ = query(
                                    collection(db, 'products'),
                                    where('sellerId', '==', user.uid),
                                    limit(1)
                                );
                                const prodSnap = await getDocs(prodQ);
                                if (!prodSnap.empty) {
                                    role = 'seller';
                                }
                            } catch (_) {
                                // Silent catch if rules or offline restrict
                            }
                        }

                        const resolvedRole = role || 'buyer';
                        setUserRole(resolvedRole);
                        setUserName(data.name || '');
                        setUserPhone(data.phone || '');
                        setUserSchoolName(data.schoolName || SUPPORTED_SCHOOL);
                        setJoinedGroupChat(!!data.joinedGroupChat);
                        setLoading(false);

                        // Request FCM notification permission for sellers (once per session)
                        if ((resolvedRole === 'seller' || resolvedRole === 'admin') && !notifRequestedRef.current) {
                            notifRequestedRef.current = true;
                            // Small delay so the UI settles before the browser prompt appears
                            setTimeout(async () => {
                                const msg = await messagingReady;
                                if (!msg) return;
                                requestNotificationPermission(user.uid, msg);
                                // Set up foreground push listener (plays chime + shows notification)
                                if (unlistenForegroundRef.current) unlistenForegroundRef.current();
                                unlistenForegroundRef.current = listenForForegroundMessages(msg, null);
                            }, 2000);
                        }
                    } else {
                        // User doc doesn't exist yet (e.g., setDoc is currently in flight during signup)
                        setUserRole(prev => prev || 'buyer');
                        setUserName('');
                        setUserPhone('');
                        setUserSchoolName('');
                        setLoading(false);
                    }
                }, (error) => {
                    console.error("Error listening to user data:", error);
                    setUserRole(prev => prev || 'buyer');
                    setLoading(false);
                });
            } else {
                setCurrentUser(null);
                setUserRole(null);
                setUserName('');
                setUserPhone('');
                setUserSchoolName('');
                setJoinedGroupChat(false);
                notifRequestedRef.current = false;
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unlistenUserDocRef.current) unlistenUserDocRef.current();
            if (unlistenForegroundRef.current) unlistenForegroundRef.current();
        };
    }, []);

    const normalizedRole = (userRole || '').trim().toLowerCase();

    const value = {
        currentUser,
        userRole: normalizedRole || null,
        setUserRole,
        userName,
        userPhone,
        userSchoolName,
        // true only when the user's school is the supported one (WDU)
        // also true for unauthenticated visitors (they can browse freely)
        isSchoolSupported: !userSchoolName || userSchoolName === SUPPORTED_SCHOOL,
        joinedGroupChat,
        setJoinedGroupChat,
        isAuthenticated: !!currentUser,
        isSeller: normalizedRole === 'seller' || normalizedRole === 'admin',
        isAdmin: normalizedRole === 'admin',
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

