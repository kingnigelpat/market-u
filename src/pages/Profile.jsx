import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase';
import {
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    deleteUser,
} from 'firebase/auth';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import {
    User, Phone, Lock, Trash2, ArrowLeft,
    CheckCircle, AlertCircle, Eye, EyeOff, Save, ShieldAlert,
} from 'lucide-react';

// ── Tiny reusable alert ────────────────────────────────────────────────────────
function Alert({ type, message }) {
    if (!message) return null;
    const isError = type === 'error';
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: isError ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
            border: `1px solid ${isError ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`,
            color: isError ? 'var(--danger-color)' : 'var(--success-color)',
            fontSize: '0.875rem', fontWeight: '600',
            marginBottom: '1rem',
            animation: 'fadeInUp 0.3s ease',
        }}>
            {isError ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
            {message}
        </div>
    );
}

// ── Section card wrapper ───────────────────────────────────────────────────────
function Section({ icon, title, subtitle, children, danger }) {
    return (
        <div style={{
            backgroundColor: 'var(--surface-color)',
            border: `1px solid ${danger ? 'rgba(239,68,68,0.2)' : 'var(--border-color)'}`,
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            marginBottom: '1.25rem',
        }}>
            {/* Section header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '1.25rem 1.5rem',
                borderBottom: `1px solid ${danger ? 'rgba(239,68,68,0.15)' : 'var(--border-color)'}`,
                backgroundColor: danger ? 'rgba(239,68,68,0.03)' : 'transparent',
            }}>
                <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    backgroundColor: danger ? 'rgba(239,68,68,0.1)' : 'rgba(37,99,235,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: danger ? 'var(--danger-color)' : 'var(--primary-color)',
                    flexShrink: 0,
                }}>
                    {icon}
                </div>
                <div>
                    <div style={{ fontWeight: '800', fontSize: '0.9375rem', color: danger ? 'var(--danger-color)' : 'var(--text-primary)' }}>
                        {title}
                    </div>
                    {subtitle && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                            {subtitle}
                        </div>
                    )}
                </div>
            </div>
            {/* Section body */}
            <div style={{ padding: '1.5rem' }}>
                {children}
            </div>
        </div>
    );
}

// ── Password input with show/hide ──────────────────────────────────────────────
function PasswordInput({ id, value, onChange, placeholder }) {
    const [show, setShow] = useState(false);
    return (
        <div style={{ position: 'relative' }}>
            <input
                id={id}
                type={show ? 'text' : 'password'}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                style={{
                    width: '100%', padding: '0.875rem 3rem 0.875rem 1rem',
                    fontSize: '0.9375rem', borderRadius: 'var(--radius-lg)',
                    border: '1.5px solid var(--border-color)',
                    backgroundColor: 'var(--bg-color)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={e => {
                    e.target.style.borderColor = 'var(--primary-color)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)';
                }}
                onBlur={e => {
                    e.target.style.borderColor = 'var(--border-color)';
                    e.target.style.boxShadow = 'none';
                }}
            />
            <button
                type="button"
                onClick={() => setShow(s => !s)}
                style={{
                    position: 'absolute', right: '0.875rem', top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-secondary)', background: 'none', border: 'none',
                    cursor: 'pointer', display: 'flex', padding: '4px',
                }}
            >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
const Profile = () => {
    const { currentUser, userName, userPhone, userRole } = useAuth();
    const navigate = useNavigate();

    // Edit name
    const [name, setName] = useState(userName || '');
    const [nameStatus, setNameStatus] = useState({ type: '', msg: '' });
    const [savingName, setSavingName] = useState(false);

    // Edit phone
    const [phone, setPhone] = useState(userPhone || '');
    const [phoneStatus, setPhoneStatus] = useState({ type: '', msg: '' });
    const [savingPhone, setSavingPhone] = useState(false);

    // Change password
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [pwStatus, setPwStatus] = useState({ type: '', msg: '' });
    const [savingPw, setSavingPw] = useState(false);

    // Delete account
    const [deletePw, setDeletePw] = useState('');
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deleteStatus, setDeleteStatus] = useState({ type: '', msg: '' });
    const [deleting, setDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // ── Save name ────────────────────────────────────────────────────────────
    const handleSaveName = async (e) => {
        e.preventDefault();
        if (!name.trim()) return setNameStatus({ type: 'error', msg: 'Name cannot be empty.' });
        if (name.trim() === userName) return setNameStatus({ type: 'error', msg: 'This is already your name.' });
        setSavingName(true);
        setNameStatus({ type: '', msg: '' });
        try {
            await updateDoc(doc(db, 'users', currentUser.uid), { name: name.trim() });
            setNameStatus({ type: 'success', msg: 'Name updated! Refresh to see it in the navbar.' });
        } catch {
            setNameStatus({ type: 'error', msg: 'Failed to update name. Try again.' });
        } finally {
            setSavingName(false);
        }
    };

    // ── Save phone ───────────────────────────────────────────────────────────
    const handleSavePhone = async (e) => {
        e.preventDefault();
        const cleaned = phone.trim();
        if (!cleaned) return setPhoneStatus({ type: 'error', msg: 'Phone cannot be empty.' });
        if (cleaned === userPhone) return setPhoneStatus({ type: 'error', msg: 'This is already your phone number.' });
        setSavingPhone(true);
        setPhoneStatus({ type: '', msg: '' });
        try {
            await updateDoc(doc(db, 'users', currentUser.uid), { phone: cleaned });
            setPhoneStatus({ type: 'success', msg: 'Phone number updated successfully.' });
        } catch {
            setPhoneStatus({ type: 'error', msg: 'Failed to update phone. Try again.' });
        } finally {
            setSavingPhone(false);
        }
    };

    // ── Change password ──────────────────────────────────────────────────────
    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPwStatus({ type: '', msg: '' });
        if (!currentPw) return setPwStatus({ type: 'error', msg: 'Enter your current password.' });
        if (newPw.length < 6) return setPwStatus({ type: 'error', msg: 'New password must be at least 6 characters.' });
        if (newPw !== confirmPw) return setPwStatus({ type: 'error', msg: 'New passwords do not match.' });
        if (newPw === currentPw) return setPwStatus({ type: 'error', msg: 'New password must be different from current.' });
        setSavingPw(true);
        try {
            const credential = EmailAuthProvider.credential(currentUser.email, currentPw);
            await reauthenticateWithCredential(currentUser, credential);
            await updatePassword(currentUser, newPw);
            setPwStatus({ type: 'success', msg: 'Password changed successfully.' });
            setCurrentPw(''); setNewPw(''); setConfirmPw('');
        } catch (err) {
            const msg = err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential'
                ? 'Current password is incorrect.'
                : 'Failed to change password. Try again.';
            setPwStatus({ type: 'error', msg });
        } finally {
            setSavingPw(false);
        }
    };

    // ── Delete account ───────────────────────────────────────────────────────
    const handleDeleteAccount = async (e) => {
        e.preventDefault();
        setDeleteStatus({ type: '', msg: '' });
        if (deleteConfirmText !== 'DELETE') {
            return setDeleteStatus({ type: 'error', msg: 'Type DELETE exactly to confirm.' });
        }
        if (!deletePw) return setDeleteStatus({ type: 'error', msg: 'Enter your password to confirm.' });
        setDeleting(true);
        try {
            const credential = EmailAuthProvider.credential(currentUser.email, deletePw);
            await reauthenticateWithCredential(currentUser, credential);
            // Delete Firestore user doc first, then the auth account
            await deleteDoc(doc(db, 'users', currentUser.uid));
            await deleteUser(currentUser);
            navigate('/');
        } catch (err) {
            const msg = err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential'
                ? 'Password is incorrect.'
                : 'Failed to delete account. Try again.';
            setDeleteStatus({ type: 'error', msg });
        } finally {
            setDeleting(false);
        }
    };

    const inputStyle = {
        width: '100%', padding: '0.875rem 1rem',
        fontSize: '0.9375rem', borderRadius: 'var(--radius-lg)',
        border: '1.5px solid var(--border-color)',
        backgroundColor: 'var(--bg-color)',
        color: 'var(--text-primary)',
        outline: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
    };
    const inputFocus = (e) => {
        e.target.style.borderColor = 'var(--primary-color)';
        e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)';
    };
    const inputBlur = (e) => {
        e.target.style.borderColor = 'var(--border-color)';
        e.target.style.boxShadow = 'none';
    };

    return (
        <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '4rem', maxWidth: '620px' }}>

            {/* Back button */}
            <button
                onClick={() => navigate(-1)}
                className="btn"
                style={{ color: 'var(--text-secondary)', paddingLeft: 0, marginBottom: '1.5rem' }}
            >
                <ArrowLeft size={18} /> Back
            </button>

            {/* Page header */}
            <div style={{ marginBottom: '2rem' }}>
                {/* Avatar */}
                <div style={{
                    width: '64px', height: '64px', borderRadius: '18px',
                    background: 'linear-gradient(135deg, var(--primary-color), #6366F1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '1rem',
                    boxShadow: '0 8px 24px -4px rgba(37,99,235,0.35)',
                }}>
                    <User size={30} color="white" />
                </div>
                <h1 style={{ fontSize: '1.625rem', fontWeight: '900', letterSpacing: '-0.03em', marginBottom: '0.25rem' }}>
                    Account Settings
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {currentUser?.email} &nbsp;·&nbsp;
                    <span style={{
                        display: 'inline-block',
                        fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase',
                        letterSpacing: '0.06em', padding: '0.15rem 0.5rem',
                        borderRadius: '99px',
                        backgroundColor: 'rgba(37,99,235,0.1)', color: 'var(--primary-color)',
                    }}>
                        {userRole}
                    </span>
                </p>
            </div>

            {/* ── Edit Name ── */}
            <Section icon={<User size={18} />} title="Display Name" subtitle="Shown to buyers and on your listings">
                <Alert type={nameStatus.type} message={nameStatus.msg} />
                <form onSubmit={handleSaveName}>
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label htmlFor="profile-name" style={{ display: 'block', fontWeight: '600', fontSize: '0.8125rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                            Full Name
                        </label>
                        <input
                            id="profile-name"
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Your name"
                            style={inputStyle}
                            onFocus={inputFocus}
                            onBlur={inputBlur}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={savingName}
                        className="btn btn-primary"
                        style={{ gap: '0.5rem', opacity: savingName ? 0.7 : 1 }}
                    >
                        <Save size={15} />
                        {savingName ? 'Saving…' : 'Save Name'}
                    </button>
                </form>
            </Section>

            {/* ── Edit Phone ── */}
            <Section icon={<Phone size={18} />} title="Phone Number" subtitle="Used for WhatsApp buyer contact">
                <Alert type={phoneStatus.type} message={phoneStatus.msg} />
                <form onSubmit={handleSavePhone}>
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label htmlFor="profile-phone" style={{ display: 'block', fontWeight: '600', fontSize: '0.8125rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                            Phone Number
                        </label>
                        <input
                            id="profile-phone"
                            type="tel"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="e.g. 08012345678"
                            style={inputStyle}
                            onFocus={inputFocus}
                            onBlur={inputBlur}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={savingPhone}
                        className="btn btn-primary"
                        style={{ gap: '0.5rem', opacity: savingPhone ? 0.7 : 1 }}
                    >
                        <Save size={15} />
                        {savingPhone ? 'Saving…' : 'Save Phone'}
                    </button>
                </form>
            </Section>

            {/* ── Change Password ── */}
            <Section icon={<Lock size={18} />} title="Change Password" subtitle="Must be at least 6 characters">
                <Alert type={pwStatus.type} message={pwStatus.msg} />
                <form onSubmit={handleChangePassword}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1rem' }}>
                        <div>
                            <label htmlFor="current-pw" style={{ display: 'block', fontWeight: '600', fontSize: '0.8125rem', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                                Current Password
                            </label>
                            <PasswordInput
                                id="current-pw"
                                value={currentPw}
                                onChange={e => setCurrentPw(e.target.value)}
                                placeholder="Enter current password"
                            />
                        </div>
                        <div>
                            <label htmlFor="new-pw" style={{ display: 'block', fontWeight: '600', fontSize: '0.8125rem', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                                New Password
                            </label>
                            <PasswordInput
                                id="new-pw"
                                value={newPw}
                                onChange={e => setNewPw(e.target.value)}
                                placeholder="Min 6 characters"
                            />
                        </div>
                        <div>
                            <label htmlFor="confirm-pw" style={{ display: 'block', fontWeight: '600', fontSize: '0.8125rem', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                                Confirm New Password
                            </label>
                            <PasswordInput
                                id="confirm-pw"
                                value={confirmPw}
                                onChange={e => setConfirmPw(e.target.value)}
                                placeholder="Repeat new password"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={savingPw}
                        className="btn btn-primary"
                        style={{ gap: '0.5rem', opacity: savingPw ? 0.7 : 1 }}
                    >
                        <Lock size={15} />
                        {savingPw ? 'Updating…' : 'Change Password'}
                    </button>
                </form>
            </Section>

            {/* ── Danger Zone ── */}
            <Section
                icon={<ShieldAlert size={18} />}
                title="Danger Zone"
                subtitle="Permanent and irreversible actions"
                danger
            >
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.6 }}>
                    Deleting your account will permanently remove your profile, all your listings, and all your data from Market-U. <strong style={{ color: 'var(--danger-color)' }}>This cannot be undone.</strong>
                </p>
                <button
                    id="open-delete-modal"
                    onClick={() => { setShowDeleteModal(true); setDeleteStatus({ type: '', msg: '' }); }}
                    className="btn btn-danger"
                    style={{ gap: '0.5rem' }}
                >
                    <Trash2 size={15} />
                    Delete My Account
                </button>
            </Section>

            {/* ── Delete Confirm Modal ── */}
            {showDeleteModal && (
                <div
                    onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '1rem',
                        backdropFilter: 'blur(4px)',
                        animation: 'fadeInUp 0.2s ease',
                    }}
                >
                    <div style={{
                        backgroundColor: 'var(--bg-color)',
                        borderRadius: 'var(--radius-xl)',
                        padding: '2rem',
                        width: '100%', maxWidth: '440px',
                        border: '1px solid rgba(239,68,68,0.25)',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
                        animation: 'fadeInUp 0.25s cubic-bezier(0.16,1,0.3,1)',
                    }}>
                        {/* Modal header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                            <div style={{
                                width: '42px', height: '42px', borderRadius: '12px',
                                backgroundColor: 'rgba(239,68,68,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--danger-color)', flexShrink: 0,
                            }}>
                                <Trash2 size={20} />
                            </div>
                            <div>
                                <div style={{ fontWeight: '900', fontSize: '1rem', color: 'var(--danger-color)' }}>Delete Account</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>This action cannot be undone</div>
                            </div>
                        </div>

                        <Alert type={deleteStatus.type} message={deleteStatus.msg} />

                        <form onSubmit={handleDeleteAccount}>
                            <div style={{ marginBottom: '0.875rem' }}>
                                <label htmlFor="delete-confirm-text" style={{ display: 'block', fontWeight: '600', fontSize: '0.8125rem', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                                    Type <strong style={{ color: 'var(--danger-color)' }}>DELETE</strong> to confirm
                                </label>
                                <input
                                    id="delete-confirm-text"
                                    type="text"
                                    value={deleteConfirmText}
                                    onChange={e => setDeleteConfirmText(e.target.value)}
                                    placeholder="DELETE"
                                    style={{ ...inputStyle, borderColor: deleteConfirmText === 'DELETE' ? 'var(--danger-color)' : 'var(--border-color)' }}
                                    onFocus={inputFocus}
                                    onBlur={inputBlur}
                                    autoComplete="off"
                                />
                            </div>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label htmlFor="delete-pw" style={{ display: 'block', fontWeight: '600', fontSize: '0.8125rem', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                                    Your Password
                                </label>
                                <PasswordInput
                                    id="delete-pw"
                                    value={deletePw}
                                    onChange={e => setDeletePw(e.target.value)}
                                    placeholder="Enter your password"
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteModal(false)}
                                    className="btn btn-secondary"
                                    style={{ flex: 1 }}
                                >
                                    Cancel
                                </button>
                                <button
                                    id="confirm-delete-btn"
                                    type="submit"
                                    disabled={deleting || deleteConfirmText !== 'DELETE'}
                                    className="btn btn-danger"
                                    style={{ flex: 1, gap: '0.5rem', opacity: (deleting || deleteConfirmText !== 'DELETE') ? 0.6 : 1 }}
                                >
                                    <Trash2 size={15} />
                                    {deleting ? 'Deleting…' : 'Delete Forever'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
