import { useState, useEffect, useRef } from 'react';
import {
    fetchPostComments,
    fetchUserAnonymousIds,
    addComment,
    deleteComment,
    formatGistTime
} from '../../utils/gistService';
import {
    MessageCircle,
    X,
    Send,
    Trash2,
    Flag,
    Sparkles,
    CornerDownRight
} from 'lucide-react';

export default function GistCommentsModal({
    isOpen,
    onClose,
    post,
    currentUser,
    userName,
    isAdmin,
    onReportComment,
    onCommentAdded,
    onCommentDeleted
}) {
    const [comments, setComments] = useState([]);
    const [ownAnonIds, setOwnAnonIds] = useState({});
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null); // { id, authorName, authorId }
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const commentsEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (!isOpen || !post?.id) return;
        let isMounted = true;

        async function loadComments() {
            setLoading(true);
            try {
                const [list, anonMap] = await Promise.all([
                    fetchPostComments(post.id),
                    currentUser?.uid ? fetchUserAnonymousIds(currentUser.uid) : Promise.resolve({})
                ]);
                if (isMounted) {
                    setComments(list);
                    setOwnAnonIds(anonMap);
                }
            } catch (err) {
                console.error('Failed to load comments:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        loadComments();
        return () => { isMounted = false; };
    }, [isOpen, post?.id, currentUser?.uid]);

    const handleSendComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim() || submitting) return;

        if (!currentUser) {
            alert('Please log in or sign up to comment on Market-U Gist.');
            return;
        }

        setSubmitting(true);
        try {
            const newComment = await addComment({
                postId: post.id,
                content: commentText.trim(),
                isAnonymous,
                user: currentUser,
                userName: userName || 'Student',
                parentId: replyingTo?.id || null,
                replyToName: replyingTo?.authorName || null,
                replyToAuthorId: replyingTo?.authorId || null,
                postAuthorId: post?.authorId || null,
                postTitle: post?.title || post?.content || ''
            });

            setComments(prev => [...prev, newComment]);
            if (isAnonymous && newComment.id) {
                setOwnAnonIds(prev => ({ ...prev, [newComment.id]: true }));
            }
            setCommentText('');
            setReplyingTo(null);
            if (onCommentAdded) onCommentAdded(post.id);

            setTimeout(() => {
                commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (err) {
            console.error('Error posting comment:', err);
            alert(err.message || 'Failed to post comment.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (commentId) => {
        if (!window.confirm('Delete this comment?')) return;
        setDeletingId(commentId);
        try {
            await deleteComment(commentId, post.id, currentUser, isAdmin);
            setComments(prev => prev.filter(c => c.id !== commentId));
            if (onCommentDeleted) onCommentDeleted(post.id);
        } catch (err) {
            console.error('Error deleting comment:', err);
            alert('Failed to delete comment.');
        } finally {
            setDeletingId(null);
        }
    };

    const handleStartReply = (c) => {
        setReplyingTo({
            id: c.parentId || c.id, // keep 1-level threading clean
            authorName: c.isAnonymous ? 'Anonymous' : c.authorName,
            authorId: c.authorId
        });
        inputRef.current?.focus();
    };

    if (!isOpen) return null;

    // Group comments into top-level and replies
    const topLevelComments = comments.filter(c => !c.parentId);
    const repliesByParent = {};
    comments.forEach(c => {
        if (c.parentId) {
            if (!repliesByParent[c.parentId]) repliesByParent[c.parentId] = [];
            repliesByParent[c.parentId].push(c);
        }
    });

    const renderCommentItem = (c, isReply = false) => {
        const isMine = Boolean(
            currentUser?.uid && (
                c.authorId === currentUser.uid ||
                c._isOwnAnonymous ||
                ownAnonIds[c.id]
            )
        );

        return (
            <div
                key={c.id}
                style={{
                    display: 'flex',
                    gap: '0.625rem',
                    padding: isReply ? '0.5rem 0.65rem' : '0.625rem 0.75rem',
                    marginLeft: isReply ? '1.75rem' : 0,
                    background: isMine ? 'rgba(37, 99, 235, 0.04)' : 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    position: 'relative'
                }}
            >
                <div style={{
                    width: isReply ? '26px' : '32px',
                    height: isReply ? '26px' : '32px',
                    borderRadius: '50%',
                    background: c.isAnonymous
                        ? 'linear-gradient(135deg, #6366f1, #a855f7)'
                        : 'var(--gradient-primary)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: isReply ? '0.65rem' : '0.75rem',
                    flexShrink: 0
                }}>
                    {c.isAnonymous ? '🎭' : (c.authorName?.[0]?.toUpperCase() || 'U')}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '0.2rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text)' }}>
                                {c.isAnonymous ? 'Anonymous' : c.authorName}
                            </span>
                            {c.isAnonymous && (
                                <span style={{
                                    fontSize: '0.625rem',
                                    background: 'rgba(168, 85, 247, 0.12)',
                                    color: '#a855f7',
                                    fontWeight: 700,
                                    padding: '0.1rem 0.35rem',
                                    borderRadius: 'var(--radius-full)'
                                }}>
                                    Incognito
                                </span>
                            )}
                            <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                                • {formatGistTime(c.createdAt)}
                            </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            {currentUser && (
                                <button
                                    type="button"
                                    onClick={() => handleStartReply(c)}
                                    className="gist-action-btn"
                                    style={{ padding: '2px 6px', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--primary)' }}
                                    title="Reply to comment"
                                >
                                    Reply
                                </button>
                            )}
                            {(isMine || isAdmin) && (
                                <button
                                    onClick={() => handleDelete(c.id)}
                                    disabled={deletingId === c.id}
                                    className="gist-action-btn"
                                    style={{ padding: '2px 4px', color: 'var(--danger)' }}
                                    title="Delete comment"
                                >
                                    <Trash2 size={13} />
                                </button>
                            )}
                            {!isMine && onReportComment && (
                                <button
                                    onClick={() => onReportComment(c.id)}
                                    className="gist-action-btn"
                                    style={{ padding: '2px 4px' }}
                                    title="Report comment"
                                >
                                    <Flag size={13} />
                                </button>
                            )}
                        </div>
                    </div>

                    <p style={{
                        margin: 0,
                        fontSize: '0.8125rem',
                        color: 'var(--text)',
                        lineHeight: 1.45,
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap'
                    }}>
                        {c.replyToName && (
                            <span style={{ color: 'var(--primary)', fontWeight: 700, marginRight: '0.3rem' }}>
                                @{c.replyToName}
                            </span>
                        )}
                        {c.content}
                    </p>
                </div>
            </div>
        );
    };

    return (
        <div className="gist-modal-overlay" onClick={onClose}>
            <div
                className="gist-modal-content gist-modal-drawer"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '0.875rem',
                    borderBottom: '1px solid var(--border)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MessageCircle size={18} style={{ color: 'var(--primary)' }} />
                        <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800 }}>
                            Comments ({comments.length})
                        </h3>
                    </div>
                    <button onClick={onClose} className="gist-icon-btn" aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                {/* Original Post Snippet */}
                {post && (
                    <div style={{
                        padding: '0.625rem 0.875rem',
                        margin: '0.75rem 0',
                        background: 'var(--surface)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.8125rem',
                        borderLeft: '3px solid var(--primary)'
                    }}>
                        <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '0.2rem' }}>
                            {post.authorName} • {post.schoolShort}
                        </div>
                        <div style={{
                            color: 'var(--text-secondary)',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                        }}>
                            {post.title ? `${post.title} — ` : ''}{post.content}
                        </div>
                    </div>
                )}

                {/* Comments List */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    minHeight: '180px',
                    maxHeight: '420px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem',
                    paddingRight: '0.25rem'
                }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                            <div className="spinner" style={{ margin: '0 auto 0.75rem' }} />
                            Loading comments...
                        </div>
                    ) : comments.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem 1rem',
                            color: 'var(--text-secondary)'
                        }}>
                            <Sparkles size={28} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9375rem' }}>No comments yet</p>
                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem' }}>Be the first student to drop a thought!</p>
                        </div>
                    ) : (
                        topLevelComments.map(c => (
                            <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {renderCommentItem(c, false)}
                                {(repliesByParent[c.id] || []).map(reply => renderCommentItem(reply, true))}
                            </div>
                        ))
                    )}
                    <div ref={commentsEndRef} />
                </div>

                {/* Comment Input */}
                <form onSubmit={handleSendComment} style={{
                    marginTop: '0.75rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--border)'
                }}>
                    {replyingTo && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.35rem 0.65rem',
                            marginBottom: '0.45rem',
                            background: 'var(--primary-light)',
                            color: 'var(--primary)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.75rem',
                            fontWeight: 700
                        }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <CornerDownRight size={13} /> Replying to @{replyingTo.authorName}
                            </span>
                            <button
                                type="button"
                                onClick={() => setReplyingTo(null)}
                                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '0.4rem',
                        fontSize: '0.75rem'
                    }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            cursor: 'pointer',
                            color: isAnonymous ? '#a855f7' : 'var(--text-secondary)',
                            fontWeight: 600
                        }}>
                            <input
                                type="checkbox"
                                checked={isAnonymous}
                                onChange={e => setIsAnonymous(e.target.checked)}
                                style={{ accentColor: '#a855f7' }}
                            />
                            <span>🎭 Reply anonymously</span>
                        </label>
                        <span style={{ color: 'var(--text-tertiary)' }}>
                            {commentText.length}/280
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                            ref={inputRef}
                            type="text"
                            value={commentText}
                            onChange={e => setCommentText(e.target.value.slice(0, 280))}
                            placeholder={
                                !currentUser
                                    ? "Log in to join the conversation"
                                    : replyingTo
                                    ? `Reply to @${replyingTo.authorName}...`
                                    : "Drop your reply, banter, or thoughts..."
                            }
                            disabled={!currentUser || submitting}
                            style={{
                                flex: 1,
                                fontSize: '0.875rem',
                                padding: '0.6rem 0.875rem',
                                borderRadius: 'var(--radius-full)'
                            }}
                        />
                        <button
                            type="submit"
                            disabled={!currentUser || !commentText.trim() || submitting}
                            className="btn btn-primary"
                            style={{
                                borderRadius: 'var(--radius-full)',
                                padding: '0.6rem 1rem',
                                flexShrink: 0
                            }}
                        >
                            <Send size={15} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
