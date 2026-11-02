import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    reactToGistPost,
    voteInPoll,
    toggleSavePost,
    recordPostShare,
    formatGistTime,
    getPollExpiryStatus,
    deleteGistPost,
    updateGistPost
} from '../../utils/gistService';
import { optimizeImage } from '../../utils/cloudinary';
import {
    MessageCircle,
    Share2,
    Bookmark,
    MoreHorizontal,
    Trash2,
    Edit3,
    Flag,
    CheckCircle,
    ShoppingBag,
    Star,
    EyeOff,
    Check,
    Clock,
    Zap
} from 'lucide-react';

const REACTION_EMOJIS = [
    { type: 'fire', emoji: '🔥', label: 'Fire' },
    { type: 'love', emoji: '❤️', label: 'Love' },
    { type: 'haha', emoji: '😂', label: 'Haha' },
    { type: 'wild', emoji: '🤯', label: 'Wild' },
];

export default function GistCard({
    post,
    currentUser,
    userReaction,
    userVote,
    isSaved = false,
    isOwnAnonymous = false,
    isAdmin = false,
    onOpenComments,
    onOpenReport,
    onDeletePost,
    onEditPost,
    onVoteSuccess,
    onReactionUpdate,
    onSaveToggle
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [currentReaction, setCurrentReaction] = useState(userReaction);
    const [reactionsCount, setReactionsCount] = useState(post.reactionsCount || { love: 0, haha: 0, fire: 0, wild: 0 });
    const [votedOption, setVotedOption] = useState(userVote);
    const [pollData, setPollData] = useState(post.poll);
    const [saved, setSaved] = useState(isSaved);
    const [voting, setVoting] = useState(false);
    const [copiedToast, setCopiedToast] = useState(false);
    const [expandedText, setExpandedText] = useState(false);

    // Inline Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(post.title || '');
    const [editContent, setEditContent] = useState(post.content || '');
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState('');

    const menuRef = useRef(null);
    const pickerRef = useRef(null);

    useEffect(() => {
        setCurrentReaction(userReaction);
    }, [userReaction]);

    useEffect(() => {
        setVotedOption(userVote);
    }, [userVote]);

    useEffect(() => {
        setSaved(isSaved);
    }, [isSaved]);

    useEffect(() => {
        setReactionsCount(post.reactionsCount || { love: 0, haha: 0, fire: 0, wild: 0 });
    }, [post.reactionsCount]);

    useEffect(() => {
        setPollData(post.poll);
    }, [post.poll]);

    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
            if (pickerRef.current && !pickerRef.current.contains(e.target)) {
                setPickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const isAuthor = Boolean(
        currentUser?.uid && (
            post.authorId === currentUser.uid ||
            post._isOwnAnonymous ||
            isOwnAnonymous
        )
    );

    // Total reactions
    const totalReactions = (reactionsCount?.love || 0) +
        (reactionsCount?.haha || 0) +
        (reactionsCount?.fire || 0) +
        (reactionsCount?.wild || 0) +
        (post.likesCount || 0);

    // Reaction handler
    const handleReact = async (type = 'fire') => {
        if (!currentUser) {
            alert('Please log in or sign up to react to campus gists!');
            return;
        }

        setPickerOpen(false);
        const previousReaction = currentReaction;
        const previousCounts = { ...reactionsCount };

        if (currentReaction === type) {
            setCurrentReaction(null);
            setReactionsCount(prev => ({
                ...prev,
                [type]: Math.max(0, (prev[type] || 0) - 1)
            }));
        } else {
            setCurrentReaction(type);
            setReactionsCount(prev => {
                const updated = { ...prev };
                if (previousReaction) updated[previousReaction] = Math.max(0, (updated[previousReaction] || 0) - 1);
                updated[type] = (updated[type] || 0) + 1;
                return updated;
            });
        }

        try {
            const res = await reactToGistPost(post.id, currentUser, type, currentUser.displayName || 'A student');
            if (onReactionUpdate) onReactionUpdate(post.id, res.type, res.counts);
        } catch (err) {
            console.error('Reaction failed:', err);
            setCurrentReaction(previousReaction);
            setReactionsCount(previousCounts);
        }
    };

    // Poll Vote handler
    const pollStatus = pollData ? getPollExpiryStatus(pollData.expiresAt) : { expired: false, label: '' };
    const showPollResults = Boolean(votedOption || pollStatus.expired);

    const handleVote = async (optionId) => {
        if (!currentUser) {
            alert('Please log in to cast your vote.');
            return;
        }
        if (votedOption || voting || pollStatus.expired) return;

        setVoting(true);
        try {
            const res = await voteInPoll(post.id, optionId, currentUser);
            setVotedOption(res.optionId);
            setPollData(prev => ({
                ...prev,
                options: res.options,
                totalVotes: res.totalVotes
            }));
            if (onVoteSuccess) onVoteSuccess(post.id, res.optionId);
        } catch (err) {
            console.error('Error voting:', err);
            alert(err.message || 'Failed to submit vote.');
        } finally {
            setVoting(false);
        }
    };

    // Save toggle handler
    const handleToggleSave = async () => {
        if (!currentUser) {
            alert('Please log in to save posts.');
            return;
        }
        const nextState = !saved;
        setSaved(nextState);
        try {
            await toggleSavePost(post.id, currentUser.uid);
            if (onSaveToggle) onSaveToggle(post.id, nextState);
        } catch (err) {
            console.error('Save failed:', err);
            setSaved(!nextState);
        }
    };

    // Share handler
    const handleShare = async () => {
        const shareUrl = `${window.location.origin}/gist/post/${post.id}`;
        recordPostShare(post.id);

        if (navigator.share) {
            try {
                await navigator.share({
                    title: post.title || 'Market-U Gist',
                    text: post.content ? post.content.slice(0, 100) + '...' : 'Check out this gist on Market-U!',
                    url: shareUrl
                });
                return;
            } catch (err) {
                if (err.name !== 'AbortError') console.warn('Share error:', err);
            }
        }

        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopiedToast(true);
            setTimeout(() => setCopiedToast(false), 2200);
        } catch {
            prompt('Copy link to share this Gist:', shareUrl);
        }
    };

    // Save Edit handler
    const handleSaveEdit = async (e) => {
        e.preventDefault();
        setEditError('');
        setEditSaving(true);
        try {
            const updated = await updateGistPost(post.id, { title: editTitle, content: editContent }, currentUser);
            setIsEditing(false);
            if (onEditPost) onEditPost(post.id, updated);
        } catch (err) {
            setEditError(err.message || 'Could not update post.');
        } finally {
            setEditSaving(false);
        }
    };

    // Delete handler
    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this post?')) return;
        setMenuOpen(false);
        try {
            await deleteGistPost(post.id, currentUser, isAdmin);
            if (onDeletePost) onDeletePost(post.id);
        } catch (err) {
            console.error('Delete failed:', err);
            alert('Failed to delete post.');
        }
    };

    // Truncate text logic
    const isLongText = (post.content || '').length > 280;
    const displayText = isLongText && !expandedText
        ? post.content.slice(0, 280) + '...'
        : post.content;

    // Badge styling by post type
    const getTypeBadge = () => {
        switch (post.type) {
            case 'confession':
                return {
                    label: 'Confession',
                    emoji: '🎭',
                    color: '#a855f7'
                };
            case 'hot_take':
                return {
                    label: 'Hot Take',
                    emoji: '🌶️',
                    color: '#d97706'
                };
            case 'poll':
                return {
                    label: 'Campus Poll',
                    emoji: '📊',
                    color: '#059669'
                };
            case 'review':
                return {
                    label: 'Product Review',
                    emoji: '⭐',
                    color: 'var(--primary)'
                };
            default:
                return {
                    label: 'Campus Gist',
                    emoji: '🗣️',
                    color: 'var(--text-secondary)'
                };
        }
    };

    const typeBadge = getTypeBadge();

    return (
        <article className={`gist-card ${post.isAnonymous ? 'gist-card--anonymous' : ''}`}>
            {/* ── Header ── */}
            <div className="gist-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div className={`gist-avatar ${post.isAnonymous ? 'gist-avatar--anonymous' : ''}`}>
                        {post.isAnonymous ? (
                            <EyeOff size={16} />
                        ) : (
                            <span>{post.authorName?.[0]?.toUpperCase() || 'U'}</span>
                        )}
                    </div>

                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--text)' }}>
                                {post.authorName}
                            </span>
                            {post.isAnonymous && (
                                <span style={{
                                    fontSize: '0.625rem',
                                    fontWeight: 800,
                                    padding: '0.1rem 0.45rem',
                                    borderRadius: 'var(--radius-full)',
                                    background: 'rgba(168, 85, 247, 0.14)',
                                    color: '#a855f7'
                                }}>
                                    Anonymous
                                </span>
                            )}
                            <span className="gist-school-badge" title={post.schoolName}>
                                🎓 {post.schoolShort || 'Campus'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                            <span>{formatGistTime(post.createdAt)}</span>
                            {post.isEdited && <span>(edited)</span>}
                            <span>•</span>
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                                color: typeBadge.color,
                                fontWeight: 700
                            }}>
                                {typeBadge.emoji} {typeBadge.label}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Top Right Actions / Three-dot */}
                <div style={{ position: 'relative' }} ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen(prev => !prev)}
                        className="gist-icon-btn"
                        aria-label="Post options"
                    >
                        <MoreHorizontal size={18} />
                    </button>

                    {menuOpen && (
                        <div className="gist-dropdown-menu">
                            <button onClick={() => { setMenuOpen(false); handleShare(); }} className="gist-dropdown-item">
                                <Share2 size={15} /> Share Post
                            </button>
                            <button onClick={() => { setMenuOpen(false); handleToggleSave(); }} className="gist-dropdown-item">
                                <Bookmark size={15} /> {saved ? 'Remove Bookmark' : 'Save Post'}
                            </button>
                            {isAuthor && (
                                <button
                                    onClick={() => {
                                        setMenuOpen(false);
                                        setEditTitle(post.title || '');
                                        setEditContent(post.content || '');
                                        setIsEditing(true);
                                    }}
                                    className="gist-dropdown-item"
                                >
                                    <Edit3 size={15} /> Edit Post
                                </button>
                            )}
                            {!isAuthor && onOpenReport && (
                                <button
                                    onClick={() => { setMenuOpen(false); onOpenReport(post.id); }}
                                    className="gist-dropdown-item gist-dropdown-item--danger"
                                >
                                    <Flag size={15} /> Report Content
                                </button>
                            )}
                            {(isAuthor || isAdmin) && (
                                <button
                                    onClick={handleDelete}
                                    className="gist-dropdown-item gist-dropdown-item--danger"
                                >
                                    <Trash2 size={15} /> Delete Post
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Card Content Body ── */}
            <div className="gist-card-body">
                {isEditing ? (
                    <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '0.75rem' }}>
                        {editError && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>
                                ⚠️ {editError}
                            </div>
                        )}
                        <input
                            type="text"
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            placeholder="Title (optional)"
                            maxLength={100}
                            style={{ width: '100%', fontSize: '0.875rem', fontWeight: 700 }}
                        />
                        <textarea
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            rows={3}
                            maxLength={1000}
                            style={{ width: '100%', fontSize: '0.875rem' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="btn btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={editSaving}
                                className="btn btn-primary"
                                style={{ fontSize: '0.75rem', padding: '0.35rem 0.9rem' }}
                            >
                                {editSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <>
                        {post.title && (
                            <h3 className="gist-card-title">
                                {post.title}
                            </h3>
                        )}

                        {post.content && (
                            <div className="gist-card-text">
                                {displayText}
                                {isLongText && (
                                    <button
                                        onClick={() => setExpandedText(prev => !prev)}
                                        style={{
                                            marginLeft: '0.35rem',
                                            color: 'var(--primary)',
                                            fontWeight: 700,
                                            fontSize: '0.8125rem',
                                            background: 'none',
                                            border: 'none',
                                            padding: 0,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {expandedText ? 'Show less' : 'Read more'}
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* ── Poll Module ── */}
                {post.type === 'poll' && pollData && (
                    <div className="gist-poll-module">
                        {pollData.question && pollData.question !== post.content && (
                            <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.625rem', color: 'var(--text)' }}>
                                📊 {pollData.question}
                            </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {pollData.options?.map(opt => {
                                const total = pollData.totalVotes || 0;
                                const percent = total > 0 ? Math.round(((opt.votes || 0) / total) * 100) : 0;
                                const isUserChoice = votedOption === opt.id;

                                return (
                                    <div
                                        key={opt.id}
                                        onClick={() => !showPollResults && handleVote(opt.id)}
                                        className={`gist-poll-option ${showPollResults ? 'gist-poll-option--voted' : ''} ${isUserChoice ? 'gist-poll-option--selected' : ''}`}
                                    >
                                        {showPollResults && (
                                            <div
                                                className="gist-poll-fill"
                                                style={{
                                                    width: `${percent}%`,
                                                    background: isUserChoice ? 'var(--primary-light)' : 'rgba(148, 163, 184, 0.15)'
                                                }}
                                            />
                                        )}

                                        <div className="gist-poll-content">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                {isUserChoice && <Check size={14} style={{ color: 'var(--primary)' }} />}
                                                <span style={{ fontWeight: isUserChoice ? 800 : 600 }}>{opt.text}</span>
                                            </div>
                                            {showPollResults && (
                                                <span style={{ fontWeight: 700, fontSize: '0.8125rem' }}>{percent}%</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: '0.6rem',
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            flexWrap: 'wrap',
                            gap: '0.35rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 700 }}>
                                    {pollData.totalVotes || 0} {(pollData.totalVotes === 1 ? 'vote' : 'votes')}
                                </span>
                                {pollData.expiresAt && (
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.2rem',
                                        padding: '0.1rem 0.45rem',
                                        borderRadius: 'var(--radius-full)',
                                        background: pollStatus.expired ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface-elevated)',
                                        color: pollStatus.expired ? 'var(--danger)' : 'var(--text-secondary)',
                                        fontWeight: 700,
                                        fontSize: '0.6875rem'
                                    }}>
                                        <Clock size={11} /> {pollStatus.label}
                                    </span>
                                )}
                            </div>
                            {votedOption ? (
                                <span style={{ color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <CheckCircle size={12} /> Vote recorded
                                </span>
                            ) : pollStatus.expired ? (
                                <span style={{ color: 'var(--danger)', fontWeight: 700 }}>Final Results</span>
                            ) : (
                                <span>Tap an option to vote</span>
                            )}
                        </div>
                    </div>
                )}

                {/* ── High-Conversion Linked Product Spotlight Card ── */}
                {post.product && post.product.id && (
                    <div className="gist-product-review-card" style={{
                        background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(245, 158, 11, 0.07) 100%)',
                        border: '1.5px solid rgba(37, 99, 235, 0.22)',
                        borderRadius: 'var(--radius-xl)',
                        padding: '0.875rem',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {post.type === 'review' && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.35rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#F59E0B' }}>
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <Star
                                            key={star}
                                            size={15}
                                            fill={star <= (post.product.rating || 5) ? '#F59E0B' : 'none'}
                                        />
                                    ))}
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text)', marginLeft: '0.25rem' }}>
                                        {post.product.rating || 5}.0 / 5
                                    </span>
                                </div>

                                {post.product.isVerifiedPurchase ? (
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        fontSize: '0.6875rem',
                                        fontWeight: 800,
                                        color: '#059669',
                                        background: 'rgba(16, 185, 129, 0.14)',
                                        padding: '0.18rem 0.55rem',
                                        borderRadius: 'var(--radius-full)',
                                        border: '1px solid rgba(16, 185, 129, 0.3)'
                                    }}>
                                        <CheckCircle size={12} /> Verified Campus Buyer
                                    </span>
                                ) : (
                                    <span style={{
                                        fontSize: '0.6875rem',
                                        fontWeight: 700,
                                        color: 'var(--text-secondary)',
                                        background: 'var(--surface-elevated)',
                                        padding: '0.15rem 0.5rem',
                                        borderRadius: 'var(--radius-full)',
                                        border: '1px solid var(--border)'
                                    }}>
                                        Campus Review
                                    </span>
                                )}
                            </div>
                        )}

                        <Link
                            to={`/product/${post.product.id}`}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.75rem',
                                padding: '0.65rem 0.75rem',
                                background: 'var(--surface-elevated)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--border)',
                                textDecoration: 'none',
                                color: 'inherit',
                                boxShadow: 'var(--shadow-sm)',
                                transition: 'transform 0.2s ease, border-color 0.2s ease'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                                <div style={{
                                    width: '54px',
                                    height: '54px',
                                    borderRadius: '10px',
                                    background: 'var(--surface)',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    border: '1px solid var(--border)',
                                    position: 'relative'
                                }}>
                                    {post.product.imageUrl ? (
                                        <img
                                            src={optimizeImage(post.product.imageUrl, 140)}
                                            alt={post.product.title}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <ShoppingBag size={22} style={{ margin: '15px', color: 'var(--primary)' }} />
                                    )}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.2rem',
                                        fontSize: '0.625rem',
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.04em',
                                        color: '#d97706',
                                        marginBottom: '0.1rem'
                                    }}>
                                        🔥 Campus Drop {post.product.sellerName ? `• by ${post.product.sellerName}` : ''}
                                    </div>
                                    <div style={{
                                        fontSize: '0.9rem',
                                        fontWeight: 800,
                                        color: 'var(--text)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {post.product.title}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 900 }}>
                                        ₦{(Number(post.product.price) || 0).toLocaleString('en-NG')}
                                    </div>
                                </div>
                            </div>

                            <span
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    background: 'var(--gradient-primary)',
                                    color: 'white',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    padding: '0.5rem 0.9rem',
                                    borderRadius: 'var(--radius-full)',
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 4px 12px var(--primary-glow)',
                                    flexShrink: 0
                                }}
                            >
                                <Zap size={13} fill="currentColor" /> Grab Deal
                            </span>
                        </Link>
                    </div>
                )}

                {/* ── Image Attachment ── */}
                {post.imageUrl && (
                    <div className="gist-card-media">
                        <img
                            src={optimizeImage(post.imageUrl, 800)}
                            alt={post.title || 'Gist attachment'}
                            loading="lazy"
                        />
                    </div>
                )}
            </div>

            {/* ── Footer / Social Interaction Bar ── */}
            <div className="gist-card-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', position: 'relative', flexWrap: 'wrap' }}>
                    {/* Reaction Button & Picker */}
                    <div ref={pickerRef} style={{ position: 'relative' }}>
                        <button
                            onClick={() => setPickerOpen(prev => !prev)}
                            onDoubleClick={() => handleReact(currentReaction || 'fire')}
                            className={`gist-action-btn ${currentReaction ? 'gist-action-btn--reacted' : ''}`}
                            title="Tap to choose reaction"
                        >
                            <span>
                                {currentReaction
                                    ? (REACTION_EMOJIS.find(r => r.type === currentReaction)?.emoji || '🔥')
                                    : '🔥'}
                            </span>
                            <span style={{ fontWeight: 700 }}>
                                {totalReactions > 0 ? totalReactions : 'React'}
                            </span>
                        </button>

                        {pickerOpen && (
                            <div className="gist-reaction-picker">
                                {REACTION_EMOJIS.map(r => (
                                    <button
                                        key={r.type}
                                        type="button"
                                        onClick={() => handleReact(r.type)}
                                        className={`gist-reaction-option ${currentReaction === r.type ? 'gist-reaction-option--active' : ''}`}
                                        title={r.label}
                                    >
                                        <span style={{ fontSize: '1.25rem' }}>{r.emoji}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick Reaction Breakdown Pills */}
                    {totalReactions > 0 && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {REACTION_EMOJIS.filter(r => (reactionsCount?.[r.type] || 0) > 0).map(r => (
                                <span
                                    key={r.type}
                                    onClick={() => handleReact(r.type)}
                                    style={{
                                        cursor: 'pointer',
                                        padding: '0.1rem 0.35rem',
                                        borderRadius: 'var(--radius-full)',
                                        background: 'var(--surface)',
                                        fontSize: '0.7rem',
                                        fontWeight: 700
                                    }}
                                >
                                    {r.emoji} {reactionsCount[r.type]}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Comments Button */}
                    <button
                        onClick={() => onOpenComments && onOpenComments(post)}
                        className="gist-action-btn"
                        title="View comments"
                    >
                        <MessageCircle size={18} />
                        <span style={{ fontWeight: 700 }}>
                            {post.commentsCount || 0}
                        </span>
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <button
                        onClick={handleShare}
                        className="gist-action-btn"
                        title="Share gist"
                    >
                        <Share2 size={17} />
                    </button>

                    <button
                        onClick={handleToggleSave}
                        className={`gist-action-btn ${saved ? 'gist-action-btn--saved' : ''}`}
                        title={saved ? 'Saved' : 'Save post'}
                    >
                        <Bookmark size={17} fill={saved ? 'var(--primary)' : 'none'} />
                    </button>
                </div>
            </div>

            {copiedToast && (
                <div className="gist-toast animate-fade-in-up">
                    <Check size={14} /> Link copied to clipboard!
                </div>
            )}
        </article>
    );
}
