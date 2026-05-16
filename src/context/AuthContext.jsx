import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null); // 'buyer', 'seller', 'admin'
    const [userName, setUserName] = useState('');
    const [savedItems, setSavedItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUser(user);
                // Fetch user role and name from Firestore
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setUserRole(data.role || 'buyer');
                        setUserName(data.name || '');
                        setSavedItems(data.savedItems || []);
                    } else {
                        setUserRole('buyer');
                        setUserName('');
                        setSavedItems([]);
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    setUserRole('buyer');
                    setUserName('');
                    setSavedItems([]);
                }
            } else {
                setCurrentUser(null);
                setUserRole(null);
                setUserName('');
                setSavedItems([]);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const toggleSavedItem = async (productId) => {
        if (!currentUser) return false;
        
        const isSaved = savedItems.includes(productId);
        const userRef = doc(db, 'users', currentUser.uid);
        
        try {
            if (isSaved) {
                await updateDoc(userRef, {
                    savedItems: arrayRemove(productId)
                });
                setSavedItems(prev => prev.filter(id => id !== productId));
            } else {
                await updateDoc(userRef, {
                    savedItems: arrayUnion(productId)
                });
                setSavedItems(prev => [...prev, productId]);
            }
            return true;
        } catch (error) {
            console.error("Error toggling saved item:", error);
            return false;
        }
    };

    const value = {
        currentUser,
        userRole,
        userName,
        savedItems,
        toggleSavedItem,
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
