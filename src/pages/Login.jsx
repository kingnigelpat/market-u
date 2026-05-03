import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { LogIn } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetSent, setResetSent] = useState(false);
    const navigate = useNavigate();

    const handleForgotPassword = async () => {
        if (!email) {
            setError('Please enter your email address to reset password.');
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email);
            setResetSent(true);
            setError('');
        } catch (err) {
            setError('Failed to send reset email. Make sure your email is correct.');
            console.error(err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/');
        } catch (err) {
            setError('Failed to sign in. Please check your credentials.');
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
                        <LogIn size={28} />
                    </div>
                    <h2>Welcome back</h2>
                    <p>Log in to your Market-U account</p>
                </div>

                {resetSent && (
                    <div style={{ 
                        backgroundColor: 'rgba(34, 197, 94, 0.08)', 
                        color: '#16a34a', 
                        padding: '1rem', 
                        borderRadius: 'var(--radius-lg)', 
                        marginBottom: '1.5rem', 
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        border: '1px solid rgba(34, 197, 94, 0.15)',
                        textAlign: 'center'
                    }}>
                        Password reset link sent! Check your email to create a new password.
                    </div>
                )}

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
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            placeholder="name@example.com"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <label htmlFor="password" style={{ marginBottom: 0 }}>Password</label>
                            <button 
                                type="button" 
                                onClick={handleForgotPassword}
                                style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    color: 'var(--primary-color)', 
                                    fontSize: '0.875rem', 
                                    cursor: 'pointer',
                                    padding: 0,
                                    fontWeight: '500'
                                }}
                            >
                                Forgot password?
                            </button>
                        </div>
                        <input
                            type="password"
                            id="password"
                            placeholder="••••••••"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="btn btn-primary" 
                        style={{ 
                            width: '100%', 
                            marginTop: '1rem', 
                            padding: '1rem', 
                            fontSize: '1.125rem',
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: '0 8px 20px -6px rgba(37, 99, 235, 0.3)'
                        }}
                    >
                        {loading ? 'Logging in...' : 'Log in'}
                    </button>
                </form>

                <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
                    Don't have an account? <Link to="/register" style={{ color: 'var(--primary-color)', fontWeight: '700' }}>Create an account</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
