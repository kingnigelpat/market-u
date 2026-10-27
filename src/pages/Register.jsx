import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { UserPlus, Bell, CheckCircle2 } from 'lucide-react';
import PhoneNumberField from '../components/PhoneNumberField';
import SchoolSelector from '../components/SchoolSelector';
import { useAuth } from '../context/AuthContext';
import { generateReferralCode, recordSignupReferral, GIVEAWAY_ENABLED } from '../utils/referralService';

const Register = () => {
    const { setUserRole } = useAuth();
    const location = useLocation();

    const [formData, setFormData] = useState(() => {
        const params = new URLSearchParams(location.search);
        return {
            name: '',
            email: '',
            phone: '',
            password: '',
            role: params.get('role') === 'seller' ? 'seller' : 'buyer',
            promoCode: (params.get('ref') || params.get('promo') || '').toUpperCase()
        };
    });
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [schoolError, setSchoolError] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const [registeredData, setRegisteredData] = useState(null);

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

            const userReferralCode = generateReferralCode(user.uid);
            const trimmedPromo = GIVEAWAY_ENABLED && formData.promoCode ? formData.promoCode.trim().toUpperCase() : '';

            // 3. Save private user details to Firestore
            await setDoc(doc(db, 'users', user.uid), {
                name: trimmedName,
                email: trimmedEmail,
                phone: trimmedPhone,
                role: formData.role,
                schoolName: selectedSchool.name,
                referralCode: userReferralCode,
                referredBy: trimmedPromo || null,
                createdAt: new Date(),
                verified: false // Sellers start unverified
            });

            // 3b. Create public profile for marketplace & store viewing
            try {
                await setDoc(doc(db, 'publicProfiles', user.uid), {
                    name: trimmedName,
                    phone: trimmedPhone,
                    schoolName: selectedSchool.name,
                    referralCode: userReferralCode,
                    verified: false,
                    createdAt: new Date()
                });
            } catch (pubErr) {
                console.warn('Could not initialize public profile:', pubErr);
            }

            // 3c. If a promo/referral code was entered, record referral
            if (trimmedPromo) {
                try {
                    await recordSignupReferral({
                        referredUserId: user.uid,
                        refCode: trimmedPromo,
                        phone: trimmedPhone
                    });
                } catch (refErr) {
                    console.warn('Could not record signup referral:', refErr);
                }
            }

            // Save selected school to localStorage immediately so the campus switcher & market see it
            if (selectedSchool?.name) {
                localStorage.setItem('marketu_selected_campus', selectedSchool.name);
            }

            // Optimistically update role in context so destination page sees correct role immediately
            setUserRole(formData.role);

            // 4. Show Welcome Guidance Modal to lead user to Settings & Push Notifications
            setRegisteredData({
                name: trimmedName,
                schoolName: selectedSchool.name,
                role: formData.role
            });
            setShowWelcomeModal(true);
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

                    {GIVEAWAY_ENABLED && <div className="form-group" style={{ marginTop: '0.75rem' }}>
                        <label htmlFor="promoCode" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: '700' }}>
                            <span>🎁 Referral / Promo Code <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontWeight: 'normal' }}>(Optional)</span></span>
                        </label>
                        <input
                            type="text"
                            id="promoCode"
                            name="promoCode"
                            value={formData.promoCode}
                            onChange={(e) => setFormData({ ...formData, promoCode: e.target.value.toUpperCase() })}
                            placeholder="e.g. MU-AB12CD"
                            maxLength={16}
                            style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                            Invited by a friend? Enter their code so they get credit toward the ₦1,000 giveaway!
                        </span>
                    </div>}

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

            {/* ── Post-Registration Guidance Modal ── */}
            {showWelcomeModal && registeredData && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.65)',
                    backdropFilter: 'blur(6px)',
                    zIndex: 99999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1.25rem',
                    animation: 'fadeIn 0.25s ease'
                }}>
                    <div style={{
                        backgroundColor: 'var(--surface, #fff)',
                        borderRadius: 'var(--radius-xl)',
                        width: '100%',
                        maxWidth: '480px',
                        padding: '2rem',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                        border: '1px solid var(--border)',
                        textAlign: 'center',
                        position: 'relative',
                        animation: 'slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--primary), #6366F1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.25rem',
                            boxShadow: '0 8px 24px -4px rgba(37,99,235,0.4)',
                            color: '#fff'
                        }}>
                            <Bell size={30} />
                        </div>

                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.8rem', fontWeight: '800', marginBottom: '0.75rem' }}>
                            <CheckCircle2 size={14} /> Account Created!
                        </div>

                        <h2 style={{ fontSize: '1.5rem', fontWeight: '900', margin: '0 0 0.5rem 0', letterSpacing: '-0.02em', color: 'var(--text)' }}>
                            Welcome to Market-U, {registeredData.name}!
                        </h2>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>
                            Your account is ready for <strong>{registeredData.schoolName}</strong>. Complete your setup in <strong>Account Settings</strong>:
                        </p>

                        <div style={{
                            textAlign: 'left',
                            backgroundColor: 'var(--bg, #f8fafc)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '1.25rem',
                            border: '1px solid var(--border)',
                            marginBottom: '1.75rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '800', flexShrink: 0 }}>
                                    1
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text)' }}>
                                        Activate Push Notifications
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                        Turn on browser notifications so you receive instant alerts on your phone whenever buyers WhatsApp you or prices drop.
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#10B981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '800', flexShrink: 0 }}>
                                    2
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text)' }}>
                                        Push a Live Test Alert
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                        In Settings, tap <em>"Send Test Push Notification"</em> to test and verify your device receives push alerts immediately.
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#8B5CF6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '800', flexShrink: 0 }}>
                                    3
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text)' }}>
                                        {registeredData.role === 'seller' ? 'Post Items for Free' : 'Start Campus Shopping'}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                        {registeredData.role === 'seller' 
                                            ? 'Upload photos of your textbooks, gadget, or dorm items and start receiving direct inquiries.'
                                            : 'Explore deals, message sellers, and get verified student items.'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <button
                                type="button"
                                onClick={() => navigate('/profile?welcome=true#notifications')}
                                className="btn btn-primary"
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 1.25rem',
                                    fontSize: '1rem',
                                    fontWeight: '700',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    boxShadow: '0 8px 20px -4px rgba(37,99,235,0.4)'
                                }}
                            >
                                <Bell size={18} />
                                Go to Settings & Activate Notifications
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate(`/?school=${encodeURIComponent(registeredData.schoolName)}`)}
                                className="btn btn-secondary"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1.25rem',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    justifyContent: 'center',
                                    color: 'var(--text-secondary)'
                                }}
                            >
                                Skip to Marketplace
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Register;
