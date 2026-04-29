import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { UserPlus } from 'lucide-react';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'buyer'
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const user = userCredential.user;

            // Save user details to Firestore
            await setDoc(doc(db, 'users', user.uid), {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                role: formData.role,
                createdAt: new Date(),
                verified: false // Sellers start unverified
            });

            navigate('/');
        } catch (err) {
            setError(err.message || 'Failed to register.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card animate-fade-in-up">
                <div className="auth-header">
                    <div className="auth-icon">
                        <UserPlus size={28} />
                    </div>
                    <h2>Join Market U</h2>
                    <p>Start buying and selling on campus</p>
                </div>

                {error && (
                    <div style={{ 
                        backgroundColor: 'rgba(239, 68, 68, 0.08)', 
                        color: 'var(--danger-color)', 
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
                        <label htmlFor="phone">Phone Number (WhatsApp)</label>
                        <input 
                            type="tel" 
                            id="phone" 
                            name="phone" 
                            required 
                            placeholder="+234..." 
                            value={formData.phone} 
                            onChange={handleChange} 
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
                                border: formData.role === 'buyer' ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
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
                                border: formData.role === 'seller' ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
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
                    Already have an account? <Link to="/login" style={{ color: 'var(--primary-color)', fontWeight: '700' }}>Log in</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
