import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { UserPlus, Rocket } from 'lucide-react';
import PhoneNumberField from '../components/PhoneNumberField';
import SchoolSelector from '../components/SchoolSelector';
import { SUPPORTED_SCHOOL } from '../data/institutions';

const Register = () => {
    const location = useLocation();

    const [formData, setFormData] = useState(() => {
        const params = new URLSearchParams(location.search);
        return {
            name: '',
            email: '',
            phone: '',
            password: '',
            role: params.get('role') === 'seller' ? 'seller' : 'buyer'
        };
    });
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [schoolError, setSchoolError] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // "coming soon" state — shown after successful registration for unsupported schools
    const [waitlistSuccess, setWaitlistSuccess] = useState(false);

    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSchoolError('');
        setLoading(true);

        // Sanitize inputs
        const trimmedName = formData.name.trim();
        const trimmedEmail = formData.email.trim().toLowerCase();
        const trimmedPhone = formData.phone.trim();

        if (!trimmedName) {
            setError('Please enter your full name.');
            setLoading(false);
            return;
        }
        if (!trimmedPhone.startsWith('+') || trimmedPhone.replace(/\D/g, '').length < 8) {
            setError('Please enter a valid phone number with your country code.');
            setLoading(false);
            return;
        }
        if (!selectedSchool) {
            setSchoolError('Please select your school to continue.');
            setLoading(false);
            return;
        }

        try {
            // 1. Create Firebase Auth account
            const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, formData.password);
            const user = userCredential.user;

            // 2. Update Auth display name
            await updateProfile(user, {
                displayName: trimmedName
            });

            // 3. Save user details to Firestore — always include schoolName
            await setDoc(doc(db, 'users', user.uid), {
                name: trimmedName,
                email: trimmedEmail,
                phone: trimmedPhone,
                role: formData.role,
                schoolName: selectedSchool.name,
                createdAt: new Date(),
                verified: false // Sellers start unverified
            });

            // 4. Handle supported vs unsupported school
            if (selectedSchool.supported) {
                // Normal Market-U flow
                if (formData.role === 'seller') {
                    navigate('/dashboard');
                } else {
                    navigate('/');
                }
            } else {
                // Unsupported school — add to waitlist (deduplicated by userId + schoolName)
                try {
                    const waitlistRef = collection(db, 'waitlist');
                    const dupQuery = query(
                        waitlistRef,
                        where('userId', '==', user.uid),
                        where('schoolName', '==', selectedSchool.name)
                    );
                    const existing = await getDocs(dupQuery);

                    if (existing.empty) {
                        await addDoc(waitlistRef, {
                            schoolName: selectedSchool.name,
                            email: trimmedEmail,
                            userId: user.uid,
                            createdAt: serverTimestamp(),
                        });
                    }
                } catch (waitlistErr) {
                    // Non-fatal — user account was created successfully
                    console.warn('Waitlist write failed:', waitlistErr);
                }

                // Show "coming soon" screen instead of redirecting
                setWaitlistSuccess(true);
            }
        } catch (err) {
            if (err.code === 'auth/email-already-in-use') {
                setError('An account with this email already exists. Please log in instead.');
            } else {
                setError(err.message || 'Failed to register.');
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // ── "Coming soon" screen for unsupported schools ──────────────────────────
    if (waitlistSuccess) {
        return (
            <div className="auth-container">
                <div className="auth-card animate-fade-in-up" style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(99,102,241,0.18))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                    }}>
                        <Rocket size={32} color="var(--primary)" />
                    </div>

                    <h2 style={{ marginBottom: '0.75rem' }}>Market-U is coming to your school soon! 🚀</h2>

                    <p style={{
                        color: 'var(--text-secondary)',
                        fontSize: '1rem',
                        lineHeight: '1.6',
                        marginBottom: '0.5rem',
                    }}>
                        You&apos;ve been added to our waitlist for
                    </p>
                    <p style={{
                        fontWeight: '700',
                        fontSize: '1.0625rem',
                        color: 'var(--text)',
                        marginBottom: '1.25rem',
                    }}>
                        {selectedSchool?.name}
                    </p>

                    <p style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.9375rem',
                        lineHeight: '1.65',
                        marginBottom: '2rem',
                    }}>
                        We&apos;ll let you know as soon as Market-U launches at your school.
                        Market-U currently operates at <strong>Western Delta University</strong> and
                        is expanding campus by campus based on demand.
                    </p>

                    <div style={{
                        padding: '1rem 1.25rem',
                        borderRadius: 'var(--radius-lg)',
                        backgroundColor: 'rgba(37,99,235,0.06)',
                        border: '1px solid rgba(37,99,235,0.15)',
                        marginBottom: '2rem',
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                    }}>
                        💡 The more students from your school join the waitlist, the sooner we may launch there.
                        Share Market-U with your coursemates!
                    </div>

                    <Link
                        to="/"
                        className="btn btn-primary"
                        style={{
                            display: 'block',
                            width: '100%',
                            padding: '1rem',
                            fontSize: '1rem',
                            borderRadius: 'var(--radius-lg)',
                            textAlign: 'center',
                            textDecoration: 'none',
                            boxShadow: '0 8px 20px -6px rgba(37, 99, 235, 0.3)',
                        }}
                    >
                        Go to Home
                    </Link>
                </div>
            </div>
        );
    }

    // ── Normal registration form ──────────────────────────────────────────────
    return (
        <div className="auth-container">
            <div className="auth-card animate-fade-in-up">
                <div className="auth-header">
                    <div className="auth-icon">
                        <UserPlus size={28} />
                    </div>
                    <h2>Join Market-U</h2>
                    <p>Start buying and selling on campus</p>
                </div>

                {error && (
                    <div style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.08)',
                        color: 'var(--danger)',
                        padding: '1rem',
                        borderRadius: 'var(--radius-lg)',
                        marginBottom: '1.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        border: '1px solid rgba(239, 68, 68, 0.15)',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="name">Full Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            placeholder="John Doe"
                            required
                            value={formData.name}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            placeholder="name@example.com"
                            required
                            value={formData.email}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="phone">WhatsApp Number</label>
                        <PhoneNumberField
                            id="phone"
                            value={formData.phone}
                            onChange={(v) => setFormData({ ...formData, phone: v })}
                            placeholder="e.g. 801 234 5678 (number after the country code)"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="school-search">Which school do you attend?</label>
                        <SchoolSelector
                            value={selectedSchool}
                            onChange={(school) => {
                                setSelectedSchool(school);
                                if (school) setSchoolError('');
                            }}
                            error={schoolError}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            placeholder="Min. 6 characters"
                            required
                            minLength="6"
                            value={formData.password}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label>Account Type</label>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                            <label style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontWeight: '500',
                                cursor: 'pointer',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-lg)',
                                border: formData.role === 'buyer' ? '2px solid var(--primary)' : '1px solid var(--border)',
                                backgroundColor: formData.role === 'buyer' ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                                transition: 'all 0.2s'
                            }}>
                                <input type="radio" name="role" value="buyer" checked={formData.role === 'buyer'} onChange={handleChange} style={{ width: 'auto' }} />
                                Buyer
                            </label>
                            <label style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontWeight: '500',
                                cursor: 'pointer',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-lg)',
                                border: formData.role === 'seller' ? '2px solid var(--primary)' : '1px solid var(--border)',
                                backgroundColor: formData.role === 'seller' ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                                transition: 'all 0.2s'
                            }}>
                                <input type="radio" name="role" value="seller" checked={formData.role === 'seller'} onChange={handleChange} style={{ width: 'auto' }} />
                                Seller
                            </label>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary"
                        style={{
                            width: '100%',
                            marginTop: '1.5rem',
                            padding: '1rem',
                            fontSize: '1.125rem',
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: '0 8px 20px -6px rgba(37, 99, 235, 0.3)'
                        }}
                    >
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
                    Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '700' }}>Log in</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
