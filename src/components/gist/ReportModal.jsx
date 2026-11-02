import { useState } from 'react';
import { reportContent } from '../../utils/gistService';
import { Flag, X, Check, AlertCircle } from 'lucide-react';

const REPORT_REASONS = [
    { key: 'harassment', label: 'Harassment or Bullying', desc: 'Attacking, insulting, or intimidating someone' },
    { key: 'personal_info', label: 'Personal Information / Doxxing', desc: 'Sharing phone numbers, real names, or private info' },
    { key: 'defamation', label: 'False or Harmful Accusations', desc: 'Unproven allegations harming someone\'s reputation' },
    { key: 'spam', label: 'Spam or Repetitive Posting', desc: 'Excessive identical or scam posts' },
    { key: 'inappropriate', label: 'Inappropriate or Explicit Content', desc: 'Sexually suggestive, graphic, or illegal content' },
    { key: 'other', label: 'Other Concern', desc: 'Violates campus safety guidelines' },
];

export default function ReportModal({ isOpen, onClose, targetId, targetType = 'post', currentUser }) {
    const [selectedReason, setSelectedReason] = useState('');
    const [details, setDetails] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedReason) {
            setError('Please select a reason for reporting.');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            await reportContent({
                targetId,
                targetType,
                reason: selectedReason,
                details,
                user: currentUser
            });
            setSubmitted(true);
            setTimeout(() => {
                setSubmitted(false);
                setSelectedReason('');
                setDetails('');
                onClose();
            }, 1800);
        } catch (err) {
            console.error('Error reporting content:', err);
            setError(err.message || 'Failed to submit report. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="gist-modal-overlay" onClick={onClose}>
            <div className="gist-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: 'var(--danger)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Flag size={18} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800 }}>
                            Report {targetType === 'post' ? 'Gist' : 'Comment'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="gist-icon-btn" aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                {submitted ? (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                        <div style={{
                            width: '54px',
                            height: '54px',
                            borderRadius: '50%',
                            background: 'rgba(34, 197, 94, 0.12)',
                            color: 'var(--success)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1rem'
                        }}>
                            <Check size={28} />
                        </div>
                        <h4 style={{ margin: '0 0 0.5rem', fontWeight: 800 }}>Thank you for reporting</h4>
                        <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            Our moderation team has been alerted and will review this content shortly.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            Help us keep Market-U safe and enjoyable for all students. What is the issue with this content?
                        </p>

                        {error && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.625rem 0.875rem',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--danger)',
                                fontSize: '0.8125rem'
                            }}>
                                <AlertCircle size={16} />
                                <span>{error}</span>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '240px', overflowY: 'auto' }}>
                            {REPORT_REASONS.map(r => (
                                <label
                                    key={r.key}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '0.625rem',
                                        padding: '0.625rem 0.75rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: `1.5px solid ${selectedReason === r.key ? 'var(--primary)' : 'var(--border)'}`,
                                        background: selectedReason === r.key ? 'var(--primary-light)' : 'var(--surface)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="report_reason"
                                        value={r.key}
                                        checked={selectedReason === r.key}
                                        onChange={() => { setSelectedReason(r.key); setError(''); }}
                                        style={{ marginTop: '3px' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)' }}>
                                            {r.label}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {r.desc}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                                Additional Details (Optional)
                            </label>
                            <textarea
                                value={details}
                                onChange={e => setDetails(e.target.value)}
                                placeholder="Describe why this post violates community guidelines..."
                                rows={2}
                                style={{ width: '100%', fontSize: '0.8125rem' }}
                                maxLength={300}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn btn-secondary"
                                style={{ fontSize: '0.8125rem', padding: '0.45rem 1rem' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || !selectedReason}
                                className="btn btn-primary"
                                style={{
                                    fontSize: '0.8125rem',
                                    padding: '0.45rem 1.25rem',
                                    background: 'var(--danger)',
                                    borderColor: 'var(--danger)'
                                }}
                            >
                                {submitting ? 'Submitting...' : 'Submit Report'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
