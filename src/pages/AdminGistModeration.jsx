import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    fetchAdminReportedItems,
    resolveReport,
    deleteGistPost,
    deleteComment,
    fetchGistPostById,
    fetchGistCommentById,
    fetchPrivateAuthorForAdmin,
    fetchRecentAnonymousPostsForAdmin,
    fetchModerationActions,
    setUserGistSuspension,
    formatGistTime
} from '../utils/gistService';
import {
    ShieldAlert,
    Check,
    X,
    Trash2,
    ArrowLeft,
    EyeOff,
    Ban,
    History,
    Flag
} from 'lucide-react';

export default function AdminGistModeration() {
    const { currentUser, isAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'anonymous' | 'logs'
    const [reports, setReports] = useState([]);
    const [anonPosts, setAnonPosts] = useState([]);
    const [modLogs, setModLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Inspection state
    const [selectedReport, setSelectedReport] = useState(null);
    const [targetContent, setTargetContent] = useState(null);
    const [privateAuthor, setPrivateAuthor] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [filterCategory, setFilterCategory] = useState('all');

    useEffect(() => {
        let isMounted = true;
        async function loadData() {
            setLoading(true);
            try {
                if (activeTab === 'reports') {
                    const list = await fetchAdminReportedItems();
                    if (isMounted) setReports(list);
                } else if (activeTab === 'anonymous') {
                    const list = await fetchRecentAnonymousPostsForAdmin();
                    if (isMounted) setAnonPosts(list);
                } else if (activeTab === 'logs') {
                    const list = await fetchModerationActions();
                    if (isMounted) setModLogs(list);
                }
            } catch (err) {
                console.error('Failed to load moderation data:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        loadData();
        return () => { isMounted = false; };
    }, [activeTab]);

    // Load full details when a report is selected
    const handleSelectReport = async (report) => {
        setSelectedReport(report);
        setTargetContent(null);
        setPrivateAuthor(null);

        try {
            if (report.targetType === 'post') {
                const postData = await fetchGistPostById(report.targetId);
                setTargetContent(postData);
                if (postData?.isAnonymous || !postData?.authorId) {
                    const priv = await fetchPrivateAuthorForAdmin(report.targetId);
                    setPrivateAuthor(priv);
                }
            } else {
                const commentData = await fetchGistCommentById(report.targetId);
                setTargetContent(commentData);
                if (commentData?.isAnonymous || !commentData?.authorId) {
                    const priv = await fetchPrivateAuthorForAdmin(report.targetId);
                    setPrivateAuthor(priv);
                }
            }
        } catch (err) {
            console.error('Failed to load reported target:', err);
        }
    };

    const resolvedOffenderId = targetContent?.authorId || privateAuthor?.authorId || null;

    // Action: Remove content & resolve report
    const handleRemoveContent = async (report) => {
        if (!window.confirm('Confirm content removal? This will hide the post/comment from all students.')) return;
        setActionLoading(true);

        try {
            if (report.targetType === 'post') {
                await deleteGistPost(report.targetId, currentUser, true);
            } else {
                await deleteComment(report.targetId, targetContent?.postId || null, currentUser, true);
            }
            await resolveReport(report.id, 'content_removed', currentUser, {
                targetId: report.targetId,
                targetType: report.targetType,
                offenderId: resolvedOffenderId,
                reason: report.reason
            });

            setReports(prev => prev.filter(r => r.id !== report.id));
            setSelectedReport(null);
            setTargetContent(null);
            setPrivateAuthor(null);
            alert('Content removed and moderation action logged.');
        } catch (err) {
            console.error('Error removing content:', err);
            alert('Failed to remove content: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    // Action: Suspend Offender & Remove Content
    const handleSuspendUser = async (uid, reason = 'Repeated or severe community guideline violation') => {
        if (!uid) {
            alert('Author UID could not be resolved for this item.');
            return;
        }
        if (!window.confirm(`Suspend Gist posting privileges for user UID: ${uid}?`)) return;
        setActionLoading(true);
        try {
            await setUserGistSuspension(uid, true, reason, currentUser);
            alert(`User ${uid.slice(0, 8)}... has been suspended from posting on Gist.`);
        } catch (err) {
            console.error('Error suspending user:', err);
            alert('Failed to suspend user: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    // Action: Dismiss report
    const handleDismissReport = async (report) => {
        setActionLoading(true);
        try {
            await resolveReport(report.id, 'dismiss', currentUser, {
                targetId: report.targetId,
                targetType: report.targetType,
                offenderId: resolvedOffenderId,
                reason: report.reason
            });
            setReports(prev => prev.filter(r => r.id !== report.id));
            setSelectedReport(null);
            setTargetContent(null);
            setPrivateAuthor(null);
        } catch (err) {
            console.error('Error dismissing report:', err);
            alert('Failed to dismiss report.');
        } finally {
            setActionLoading(false);
        }
    };

    // Inspect an anonymous submission directly from the Anonymous Audit tab
    const handleInspectAnonPost = async (post) => {
        const priv = await fetchPrivateAuthorForAdmin(post.id);
        const uid = post.authorId || priv?.authorId || 'Unknown';
        const name = priv?.realName || post.authorName || 'Student';
        const email = priv?.authorEmail || 'N/A';
        alert(`Anonymous Post Investigation:\n\nPost ID: ${post.id}\nAuthor UID: ${uid}\nAccount Name: ${name}\nEmail: ${email}\nSchool: ${post.schoolName}`);
    };

    if (!isAdmin) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
                <ShieldAlert size={48} style={{ color: 'var(--danger)', margin: '0 auto 1rem' }} />
                <h2>Access Denied</h2>
                <p>Only administrators can access Gist moderation controls.</p>
                <Link to="/gist" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                    Return to Gist
                </Link>
            </div>
        );
    }

    const filteredReports = reports.filter(r => {
        if (filterCategory === 'all') return true;
        return r.reason === filterCategory;
    });

    // Compute repeat offenders from moderation logs
    const offenderCounts = {};
    modLogs.forEach(log => {
        if (log.offenderId && log.actionType === 'content_removed') {
            offenderCounts[log.offenderId] = (offenderCounts[log.offenderId] || 0) + 1;
        }
    });

    return (
        <div className="container" style={{ maxWidth: '980px', padding: '2rem 1rem 5rem 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Link to="/gist" className="gist-icon-btn" title="Back to Gist">
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ShieldAlert size={24} style={{ color: 'var(--danger)' }} />
                            Gist Moderation Center
                        </h1>
                        <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            Review student reports, investigate anonymous abuses, suspend repeat offenders & audit logs
                        </p>
                    </div>
                </div>

                {activeTab === 'reports' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select
                            value={filterCategory}
                            onChange={e => setFilterCategory(e.target.value)}
                            className="gist-sort-select"
                        >
                            <option value="all">All Reasons ({reports.length})</option>
                            <option value="harassment">Harassment / Bullying</option>
                            <option value="personal_info">Personal Info / Doxxing</option>
                            <option value="defamation">Defamation</option>
                            <option value="spam">Spam</option>
                            <option value="inappropriate">Inappropriate</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Moderation Navigation Tabs */}
            <div className="gist-scope-bar" style={{ marginBottom: '1.5rem' }}>
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`gist-scope-btn ${activeTab === 'reports' ? 'gist-scope-btn--active' : ''}`}
                >
                    <Flag size={15} />
                    <span>Pending Reports ({reports.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab('anonymous')}
                    className={`gist-scope-btn ${activeTab === 'anonymous' ? 'gist-scope-btn--active' : ''}`}
                >
                    <EyeOff size={15} />
                    <span>Anonymous Submissions</span>
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`gist-scope-btn ${activeTab === 'logs' ? 'gist-scope-btn--active' : ''}`}
                >
                    <History size={15} />
                    <span>Moderation Logs & Offenders</span>
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    Loading moderation data...
                </div>
            ) : activeTab === 'reports' ? (
                filteredReports.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '4rem 1.5rem',
                        background: 'var(--surface-elevated)',
                        borderRadius: 'var(--radius-xl)',
                        border: '1px solid var(--border)'
                    }}>
                        <Check size={40} style={{ color: 'var(--success)', margin: '0 auto 1rem' }} />
                        <h3 style={{ margin: '0 0 0.5rem', fontWeight: 800 }}>All Clear! No Pending Reports</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            Campus feeds are healthy and running cleanly according to community guidelines.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: selectedReport ? '1fr 1fr' : '1fr', gap: '1.25rem' }}>
                        {/* Reports List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {filteredReports.map(report => {
                                const isSelected = selectedReport?.id === report.id;
                                return (
                                    <div
                                        key={report.id}
                                        onClick={() => handleSelectReport(report)}
                                        style={{
                                            padding: '1rem',
                                            background: isSelected ? 'var(--primary-light)' : 'var(--surface-elevated)',
                                            border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                                            borderRadius: 'var(--radius-lg)',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                                            <span style={{
                                                fontWeight: 800,
                                                fontSize: '0.75rem',
                                                textTransform: 'uppercase',
                                                color: 'var(--danger)',
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                padding: '0.15rem 0.5rem',
                                                borderRadius: 'var(--radius-full)'
                                            }}>
                                                {report.reason?.replace('_', ' ')}
                                            </span>
                                            <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                                                {formatGistTime(report.createdAt)}
                                            </span>
                                        </div>

                                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)' }}>
                                            Target: {report.targetType === 'post' ? 'Gist Post' : 'Comment'}
                                        </div>

                                        {report.details && (
                                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                                &quot;{report.details}&quot;
                                            </div>
                                        )}

                                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: '0.35rem' }}>
                                            Reporter UID: {report.reporterId?.slice(0, 8)}...
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Report Inspection & Action Drawer */}
                        {selectedReport && (
                            <div style={{
                                padding: '1.25rem',
                                background: 'var(--surface-elevated)',
                                border: '1.5px solid var(--border)',
                                borderRadius: 'var(--radius-xl)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                height: 'fit-content'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800 }}>
                                        Report Inspection
                                    </h3>
                                    <button onClick={() => setSelectedReport(null)} className="gist-icon-btn">
                                        <X size={16} />
                                    </button>
                                </div>

                                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                    <div><strong>Target Type:</strong> {selectedReport.targetType}</div>
                                    <div><strong>Report Reason:</strong> {selectedReport.reason}</div>
                                    <div><strong>Reporter Details:</strong> {selectedReport.details || 'None provided'}</div>
                                </div>

                                {/* Content preview */}
                                <div style={{
                                    padding: '0.875rem',
                                    background: 'var(--surface)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '1px solid var(--border)',
                                    fontSize: '0.875rem'
                                }}>
                                    <div style={{ fontWeight: 800, marginBottom: '0.35rem', color: 'var(--text)' }}>
                                        Content Preview
                                    </div>
                                    {targetContent ? (
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                                Public Display Name: {targetContent.authorName}
                                                {targetContent.schoolName ? ` (${targetContent.schoolName})` : ''}
                                                {targetContent.isAnonymous && ' [Anonymous Mode]'}
                                            </div>
                                            {/* Privileged Admin-only view of true Author UID */}
                                            <div style={{
                                                fontSize: '0.6875rem',
                                                color: '#a855f7',
                                                fontWeight: 700,
                                                background: 'rgba(168, 85, 247, 0.1)',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '6px',
                                                marginBottom: '0.5rem',
                                                display: 'inline-block'
                                            }}>
                                                True Author UID: {resolvedOffenderId || 'Unresolved'}
                                                {privateAuthor?.realName ? ` • (${privateAuthor.realName})` : ''}
                                                {privateAuthor?.authorEmail ? ` • ${privateAuthor.authorEmail}` : ''}
                                            </div>
                                            {targetContent.title && <div style={{ fontWeight: 700 }}>{targetContent.title}</div>}
                                            <div style={{ marginTop: '0.25rem', color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                                                {targetContent.content}
                                            </div>
                                            {targetContent.imageUrl && (
                                                <img
                                                    src={targetContent.imageUrl}
                                                    alt="Reported media"
                                                    style={{ maxWidth: '100%', maxHeight: '180px', marginTop: '0.5rem', borderRadius: '8px' }}
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                                            Target ID: {selectedReport.targetId}
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                                    <div style={{ display: 'flex', gap: '0.625rem' }}>
                                        <button
                                            onClick={() => handleRemoveContent(selectedReport)}
                                            disabled={actionLoading}
                                            className="btn btn-primary"
                                            style={{
                                                flex: 1,
                                                justifyContent: 'center',
                                                background: 'var(--danger)',
                                                borderColor: 'var(--danger)',
                                                fontSize: '0.8125rem'
                                            }}
                                        >
                                            <Trash2 size={15} /> Remove Content
                                        </button>
                                        <button
                                            onClick={() => handleDismissReport(selectedReport)}
                                            disabled={actionLoading}
                                            className="btn btn-secondary"
                                            style={{
                                                flex: 1,
                                                justifyContent: 'center',
                                                fontSize: '0.8125rem'
                                            }}
                                        >
                                            <Check size={15} /> Dismiss
                                        </button>
                                    </div>

                                    {resolvedOffenderId && (
                                        <button
                                            onClick={() => handleSuspendUser(resolvedOffenderId, `Reported for ${selectedReport.reason}`)}
                                            disabled={actionLoading}
                                            className="btn btn-secondary"
                                            style={{
                                                width: '100%',
                                                justifyContent: 'center',
                                                fontSize: '0.75rem',
                                                color: 'var(--danger)',
                                                borderColor: 'rgba(239, 68, 68, 0.3)'
                                            }}
                                        >
                                            <Ban size={14} /> Suspend Author Posting Privileges
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )
            ) : activeTab === 'anonymous' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {anonPosts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                            No anonymous confessions found.
                        </div>
                    ) : (
                        anonPosts.map(post => (
                            <div
                                key={post.id}
                                style={{
                                    padding: '1rem',
                                    background: 'var(--surface-elevated)',
                                    border: '1px solid var(--border)',
                                    borderLeft: '3.5px solid #a855f7',
                                    borderRadius: 'var(--radius-lg)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    gap: '1rem',
                                    flexWrap: 'wrap'
                                }}
                            >
                                <div style={{ flex: 1, minWidth: '240px' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                        <strong>{post.schoolName}</strong> • {formatGistTime(post.createdAt)} • Status: <strong>{post.status}</strong>
                                    </div>
                                    {post.title && <div style={{ fontWeight: 800, marginBottom: '0.2rem' }}>{post.title}</div>}
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text)' }}>{post.content}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => handleInspectAnonPost(post)}
                                        className="btn btn-secondary"
                                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                                    >
                                        <EyeOff size={13} /> Reveal Author
                                    </button>
                                    {post.status !== 'removed' && (
                                        <button
                                            onClick={async () => {
                                                if (!window.confirm('Remove this anonymous confession?')) return;
                                                await deleteGistPost(post.id, currentUser, true);
                                                setAnonPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: 'removed' } : p));
                                            }}
                                            className="btn btn-secondary"
                                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', color: 'var(--danger)' }}
                                        >
                                            <Trash2 size={13} /> Remove
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Repeat Offenders Summary */}
                    {Object.keys(offenderCounts).length > 0 && (
                        <div style={{
                            padding: '1rem',
                            background: 'rgba(239, 68, 68, 0.06)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: 'var(--radius-xl)'
                        }}>
                            <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9375rem', fontWeight: 800, color: 'var(--danger)' }}>
                                🚨 Flagged Offenders (Content Removals)
                            </h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {Object.entries(offenderCounts).map(([uid, count]) => (
                                    <div
                                        key={uid}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            padding: '0.35rem 0.75rem',
                                            background: 'var(--surface-elevated)',
                                            borderRadius: 'var(--radius-full)',
                                            border: '1px solid var(--border)',
                                            fontSize: '0.75rem',
                                            fontWeight: 700
                                        }}
                                    >
                                        <span>UID: {uid.slice(0, 10)}... ({count} {count === 1 ? 'strike' : 'strikes'})</span>
                                        <button
                                            onClick={() => handleSuspendUser(uid, `${count} moderation strikes`)}
                                            style={{
                                                background: 'var(--danger)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: 'var(--radius-full)',
                                                padding: '0.15rem 0.5rem',
                                                fontSize: '0.6875rem',
                                                fontWeight: 800,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Suspend
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Audit Log List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {modLogs.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                No moderation actions recorded yet.
                            </div>
                        ) : (
                            modLogs.map(log => (
                                <div
                                    key={log.id}
                                    style={{
                                        padding: '0.75rem 1rem',
                                        background: 'var(--surface-elevated)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-lg)',
                                        fontSize: '0.8125rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: '0.5rem'
                                    }}
                                >
                                    <div>
                                        <strong style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: 'var(--primary)' }}>
                                            {log.actionType?.replace('_', ' ')}
                                        </strong>
                                        <span style={{ marginLeft: '0.5rem', color: 'var(--text)' }}>
                                            Target: {log.targetType} ({log.targetId?.slice(0, 8)}...)
                                        </span>
                                        {log.offenderId && (
                                            <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>
                                                • User: {log.offenderId.slice(0, 8)}...
                                            </span>
                                        )}
                                        {log.reason && (
                                            <span style={{ marginLeft: '0.5rem', color: 'var(--text-tertiary)' }}>
                                                ({log.reason})
                                            </span>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                                        {formatGistTime(log.createdAt)}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
