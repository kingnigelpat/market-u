import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../firebase';
import { addDoc, collection, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useRef } from 'react';

const Waitlist = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [name, setName] = useState('');
    const [school, setSchool] = useState('');
    const [whatsapp, setWhatsApp] = useState('');
    const [showForm, setShowForm] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState('pending');
    const [waitlist, setWaitlist] = useState([]);
    const [duplicateWarning, setDuplicateWarning] = useState(false);
    const lastEmitted = useRef(location.pathname);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || !school || !whatsapp) {
            setStatus('error');
            setTimeout(() => setStatus('pending'), 3000);
            return;
        }
        setSubmitting(true);
        const dup = waitlist.some(item => item.whatsapp === whatsapp && item.status === 'pending');
        if (dup) {
            setDuplicateWarning(true);
            setSubmitting(false);
            return;
        }
        try {
            await addDoc(collection(db, 'waitlist'), {
                name,
                school,
                whatsapp,
                createdAt: serverTimestamp(),
                status: 'pending',
            });
            setName('');
            setSchool('');
            setWhatsApp('');
            setShowForm(false);
            setStatus('success');
            setTimeout(() => {
                setShowForm(true);
                setStatus('pending');
                navigate('/');
            }, 3000);
        } catch (error) {
            setStatus('error');
            console.error(error);
        }
        setSubmitting(false);
    };

    useEffect(() => {
        if (location.pathname !== lastEmitted.current) {
            const unsub = onSnapshot(collection(db, 'waitlist'), (snapshot) => {
                setWaitlist(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
            lastEmitted.current = location.pathname;
            return unsub;
        }
    }, [location.pathname]);

    return (
        <div className="waitlist-page">
            <div className="container">
                {isAuthenticated && (
                    <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                        <span style={{ marginRight: '0.5rem' }} /> Not a Western Delta University student? 👀
                        <p style={{ margin: '0' }}>Market-U is coming to more campuses soon. Join the waitlist and tell us your school. Your interest could help decide which campus we launch next.</p>
                    </div>
                )}

                {showForm && !isAuthenticated ? (
                    <div style={{ marginBottom: '2rem' }}>
                        <h3>Join the Waitlist 🚀</h3>
                        <p>Be the first to know when Market-U comes to your campus.</p>
                        <form onSubmit={handleSubmit}>
                            <input
                                type="tel"
                                inputMode="numeric"
                                placeholder="Your WhatsApp number (e.g. 8012345678)"
                                value={whatsapp}
                                onChange={(e) => setWhatsApp(e.target.value)}
                                style={{ width: '100%', padding: '0.875rem 1rem', fontSize: '0.9375rem', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text)', marginBottom: '0.5rem' }}
                            />
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                style={{ width: '100%', padding: '0.875rem 1rem', fontSize: '0.9375rem', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text)', marginBottom: '0.5rem' }}
                            />
                            <input
                                type="text"
                                placeholder="School/Institution"
                                value={school}
                                onChange={(e) => setSchool(e.target.value)}
                                style={{ width: '100%', padding: '0.875rem 1rem', fontSize: '0.9375rem', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text)' }}
                            />
                            <button type="submit" disabled={submitting} style={{ width: '100%', padding: '1rem', fontSize: '1.125rem', fontWeight: '700', borderRadius: 'var(--radius-lg)', backgroundColor: submitting ? 'var(--primary-glow)' : 'var(--primary)', color: 'white', border: 'none', cursor: submitting ? 'default' : 'pointer', transition: 'all 0.2s' }}>
                                {submitting ? 'Saving...' : 'JOIN THE WAITLIST 🚀'}
                            </button>
                        </form>
                        {duplicateWarning && (
                            <p style={{ marginTop: '1rem', color: 'var(--danger)', fontSize: '0.875rem' }}>
                                A waitlist submission with this WhatsApp number already exists.
                            </p>
                        )}
                    </div>
                ) : isAuthenticated ? (
                    <div style={{ marginBottom: '2rem' }}>
                        <h3>Join the Waitlist 🚀</h3>
                        <p>You're already signed in.</p>
                        <form onSubmit={handleSubmit}>
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                style={{ width: '100%', padding: '0.875rem 1rem', fontSize: '0.9375rem', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text)', marginBottom: '0.5rem' }}
                            />
                            <input
                                type="text"
                                placeholder="School/Institution"
                                value={school}
                                onChange={(e) => setSchool(e.target.value)}
                                style={{ width: '100%', padding: '0.875rem 1rem', fontSize: '0.9375rem', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text)' }}
                            />
                            <button type="submit" disabled={submitting} style={{ width: '100%', padding: '1rem', fontSize: '1.125rem', fontWeight: '700', borderRadius: 'var(--radius-lg)', backgroundColor: submitting ? 'var(--primary-glow)' : 'var(--primary)', color: 'white', border: 'none', cursor: submitting ? 'default' : 'pointer', transition: 'all 0.2s' }}>
                                {submitting ? 'Saving...' : 'JOIN THE WAITLIST 🚀'}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div style={{ marginBottom: '2rem' }}>
                        <h3>Join the Waitlist 🚀</h3>
                        <p>Sign up or log in to join the waitlist.</p>
                        <a href="/register?role=buyer" style={{ display: 'block', width: '100%', padding: '1rem', fontSize: '1rem', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--primary)', color: 'white', textAlign: 'center', marginTop: '1rem', textDecoration: 'none' }}>
                            Create an Account (Buyer)
                        </a>
                    </div>
                )}

                {status === 'success' && (
                    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                        <h3>You're on the list! 🎉</h3>
                        <p>We're watching which campuses want Market-U next.</p>
                        <p>Your school could be next. 👀</p>
                    </div>
                )}
                {status === 'error' && (
                    <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--danger)' }}>
                        <p>Something went wrong. Please try again.</p>
                    </div>
                )}
                {duplicateWarning && status !== 'success' && (
                    <p style={{ marginTop: '1rem', color: 'var(--danger)', fontSize: '0.875rem' }}>
                        A waitlist submission with this WhatsApp number already exists.
                    </p>
                )}

                <div style={{ marginTop: '2rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <p>The more students from your school join, the sooner we may launch there.</p>
                </div>
            </div>
        </div>
    );
};

export default Waitlist;