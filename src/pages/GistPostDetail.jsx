import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    fetchGistPostById,
    fetchUserReactionsForPosts,
    fetchUserVotesForPosts,
    fetchUserSavedPostIds,
    fetchUserAnonymousIds
} from '../utils/gistService';
import GistCard from '../components/gist/GistCard';
import GistCommentsModal from '../components/gist/GistCommentsModal';
import ReportModal from '../components/gist/ReportModal';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import '../styles/gist.css';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export default function GistPostDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser, userName, isAdmin } = useAuth();

    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [userReaction, setUserReaction] = useState(null);
    const [userVote, setUserVote] = useState(null);
    const [isSaved, setIsSaved] = useState(false);
    const [isOwnAnonymous, setIsOwnAnonymous] = useState(false);

    // Modals
    const [showComments, setShowComments] = useState(false);
    const [reportTargetId, setReportTargetId] = useState(null);
    const [reportTargetType, setReportTargetType] = useState('post');

    useEffect(() => {
        let isMounted = true;
        async function loadPost() {
            setLoading(true);
            setError('');
            try {
                const found = await fetchGistPostById(id);
                if (!found || found.status === 'removed') {
                    if (isMounted) setError('This Gist post was not found or has been removed.');
                    return;
                }
                if (isMounted) setPost(found);

                if (currentUser?.uid) {
                    const [reactions, votes, savedIds, anonMap] = await Promise.all([
                        fetchUserReactionsForPosts(currentUser.uid, [id]),
                        fetchUserVotesForPosts(currentUser.uid, [id]),
                        fetchUserSavedPostIds(currentUser.uid),
                        fetchUserAnonymousIds(currentUser.uid)
                    ]);
                    if (isMounted) {
                        setUserReaction(reactions[id] || null);
                        setUserVote(votes[id] || null);
                        setIsSaved(savedIds.includes(id));
                        setIsOwnAnonymous(Boolean(anonMap[id]));
                    }
                }
            } catch (err) {
                console.error('Error fetching post:', err);
                if (isMounted) setError('Failed to load post. Please try again.');
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        loadPost();
        return () => { isMounted = false; };
    }, [id, currentUser?.uid]);

    return (
        <div className="gist-page-container">
            <div style={{ marginBottom: '1.25rem' }}>
                <button
                    onClick={() => navigate('/gist')}
                    className="btn btn-secondary"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.8125rem',
                        borderRadius: 'var(--radius-full)',
                        padding: '0.4rem 0.875rem'
                    }}
                >
                    <ArrowLeft size={16} /> Back to Gist Feed
                </button>
            </div>

            {loading ? (
                <div className="gist-card">
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <Skeleton circle width={38} height={38} />
                        <div style={{ flex: 1 }}>
                            <Skeleton width={120} height={14} />
                            <Skeleton width={80} height={10} style={{ marginTop: '4px' }} />
                        </div>
                    </div>
                    <Skeleton height={20} width="70%" style={{ marginBottom: '8px' }} />
                    <Skeleton count={3} height={14} />
                </div>
            ) : error ? (
                <div style={{
                    textAlign: 'center',
                    padding: '3rem 1.5rem',
                    background: 'var(--surface-elevated)',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--border)'
                }}>
                    <AlertCircle size={36} style={{ color: 'var(--danger)', margin: '0 auto 1rem' }} />
                    <h3 style={{ margin: '0 0 0.5rem', fontWeight: 800 }}>{error}</h3>
                    <Link to="/gist" className="btn btn-primary" style={{ marginTop: '1rem', borderRadius: 'var(--radius-full)' }}>
                        Explore More Gists
                    </Link>
                </div>
            ) : post ? (
                <>
                    <GistCard
                        post={post}
                        currentUser={currentUser}
                        userReaction={userReaction}
                        userVote={userVote}
                        isSaved={isSaved}
                        isOwnAnonymous={isOwnAnonymous}
                        isAdmin={isAdmin}
                        onOpenComments={() => setShowComments(true)}
                        onOpenReport={(pId) => { setReportTargetId(pId); setReportTargetType('post'); }}
                        onDeletePost={() => navigate('/gist')}
                        onEditPost={(pId, updated) => setPost(prev => ({ ...prev, ...updated }))}
                        onReactionUpdate={(pId, type, counts) => {
                            setUserReaction(type);
                            setPost(prev => ({ ...prev, reactionsCount: counts }));
                        }}
                        onVoteSuccess={(pId, optionId) => setUserVote(optionId)}
                        onSaveToggle={(pId, nextState) => setIsSaved(nextState)}
                    />

                    <GistCommentsModal
                        isOpen={showComments}
                        onClose={() => setShowComments(false)}
                        post={post}
                        currentUser={currentUser}
                        userName={userName}
                        isAdmin={isAdmin}
                        onReportComment={(commentId) => {
                            setReportTargetId(commentId);
                            setReportTargetType('comment');
                        }}
                        onCommentAdded={() => {
                            setPost(prev => ({
                                ...prev,
                                commentsCount: (prev.commentsCount || 0) + 1
                            }));
                        }}
                        onCommentDeleted={() => {
                            setPost(prev => ({
                                ...prev,
                                commentsCount: Math.max(0, (prev.commentsCount || 0) - 1)
                            }));
                        }}
                    />

                    <ReportModal
                        isOpen={Boolean(reportTargetId)}
                        onClose={() => setReportTargetId(null)}
                        targetId={reportTargetId}
                        targetType={reportTargetType}
                        currentUser={currentUser}
                    />
                </>
            ) : null}
        </div>
    );
}
