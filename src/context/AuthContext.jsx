import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { auth, db, messaging } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { requestNotificationPermission } from '../utils/notifications';

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
    const [loading, setLoading] = useState(true);
    const notifRequestedRef = useRef(false); // prevent multiple permission prompts per session

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUser(user);
                // Fetch user role, name, phone from Firestore
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        const role = data.role || 'buyer';
                        setUserRole(role);
                        setUserName(data.name || '');
                        setUserPhone(data.phone || '');

                        // Request FCM notification permission for sellers (once per session)
                        if ((role === 'seller' || role === 'admin') && !notifRequestedRef.current) {
                            notifRequestedRef.current = true;
                            // Small delay so the UI settles before the browser prompt appears
                            setTimeout(() => {
                                requestNotificationPermission(user.uid, messaging);
                            }, 2000);
                        }
                    } else {
                        setUserRole('buyer');
                        setUserName('');
                        setUserPhone('');
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    setUserRole('buyer');
                    setUserName('');
                    setUserPhone('');
                }
            } else {
                setCurrentUser(null);
                setUserRole(null);
                setUserName('');
                setUserPhone('');
                notifRequestedRef.current = false;
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userRole,
        userName,
        userPhone,
        isAuthenticated: !!currentUser,
        isSeller: userRole === 'seller' || userRole === 'admin',
        isAdmin: userRole === 'admin'
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
