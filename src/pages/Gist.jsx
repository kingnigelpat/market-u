import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
    fetchGistPosts,
    fetchGistPostById,
    fetchUserReactionsForPosts,
    fetchUserVotesForPosts,
    fetchUserSavedPostIds,
    fetchUserAnonymousIds
} from '../utils/gistService';
import GistCard from '../components/gist/GistCard';
import CreateGistModal from '../components/gist/CreateGistModal';
import GistCommentsModal from '../components/gist/GistCommentsModal';
import ReportModal from '../components/gist/ReportModal';
import CommunityGuidelinesModal from '../components/gist/CommunityGuidelinesModal';
import CampusSwitcher from '../components/CampusSwitcher';
import { SUPPORTED_SCHOOL, DEFAULT_CAMPUS } from '../data/institutions';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import '../styles/gist.css';
import {
    Flame,
    Compass,
    Bookmark,
    Plus,
    RefreshCw,
    ShieldCheck,
    AlertCircle
} from 'lucide-react';

const TYPE_FILTERS = [
    { key: 'all', label: 'All Gist', emoji: '🔥' },
    { key: 'gist', label: 'Campus Gist', emoji: '🗣️' },
    { key: 'confession', label: 'Confessions', emoji: '🎭' },
    { key: 'hot_take', label: 'Hot Takes', emoji: '🌶️' },
    { key: 'poll', label: 'Polls', emoji: '📊' },
    { key: 'review', label: 'Reviews', emoji: '⭐' },
];

export default function Gist() {
    const { currentUser, userRole, userName, userSchoolName, isAdmin } = useAuth();
    const location = useLocation();

    // Scope: 'campus' | 'across' | 'saved'
    const [scope, setScope] = useState('campus');
    const [filterType, setFilterType] = useState('all');
    const [sort, setSort] = useState('trending');

    // Selected campus for filtering (defaults to user's trusted school or fallback)
    const [selectedCampus, setSelectedCampus] = useState(() => {
        if (userSchoolName && userSchoolName !== DEFAULT_CAMPUS) return userSchoolName;
        const saved = localStorage.getItem('marketu_gist_campus') || localStorage.getItem('marketu_selected_campus');
        return saved && saved !== DEFAULT_CAMPUS ? saved : SUPPORTED_SCHOOL;
    });

    useEffect(() => {
        if (userSchoolName && userSchoolName !== DEFAULT_CAMPUS) {
            setSelectedCampus(userSchoolName);
        }
    }, [userSchoolName]);

    const handleSelectCampus = (campusName) => {
        const target = campusName === DEFAULT_CAMPUS ? SUPPORTED_SCHOOL : campusName;
        setSelectedCampus(target);
        localStorage.setItem('marketu_gist_campus', target);
    };

    // Feed State
    const [posts, setPosts] = useState([]);
    const [savedPostIds, setSavedPostIds] = useState([]);
    const [userReactions, setUserReactions] = useState({});
    const [userVotes, setUserVotes] = useState({});
    const [ownAnonIds, setOwnAnonIds] = useState({});
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const lastDocRef = useRef(null);
    const [hasMore, setHasMore] = useState(false);
    const [error, setError] = useState(null);

    // Modals & Deep-linked product state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createModalType, setCreateModalType] = useState('gist');
    const [preselectedProduct, setPreselectedProduct] = useState(null);
    const [activeCommentPost, setActiveCommentPost] = useState(null);
    const [reportTargetId, setReportTargetId] = useState(null);
    const [reportTargetType, setReportTargetType] = useState('post');
    const [showRulesModal, setShowRulesModal] = useState(false);

    // Initial query params e.g. /gist?type=review&create=true&productId=xyz
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const qType = params.get('type');
        const qScope = params.get('scope');
        const qProductId = params.get('productId');

        if (qScope && ['campus', 'across', 'saved'].includes(qScope)) {
            setScope(qScope);
        }
        if (qType && TYPE_FILTERS.some(f => f.key === qType)) {
            if (params.get('create') === 'true') {
                setCreateModalType(qType);
            } else {
                setFilterType(qType);
            }
        }
        if (params.get('create') === 'true') {
            setShowCreateModal(true);
        }
        if (qProductId) {
            getDoc(doc(db, 'products', qProductId))
                .then(snap => {
                    if (snap.exists()) {
                        setPreselectedProduct({ id: snap.id, ...snap.data() });
                    }
                })
                .catch(err => console.warn('Could not load deep-linked product:', err));
        }
    }, [location.search]);

    // Load Posts
    const loadPosts = useCallback(async (isFresh = true) => {
        if (isFresh) {
            setLoading(true);
            setError(null);
            lastDocRef.current = null;
        } else {
            setLoadingMore(true);
        }

        try {
            if (scope === 'saved') {
                if (!currentUser?.uid) {
                    setPosts([]);
                    setLoading(false);
                    return;
                }
                const [ids, anonMap] = await Promise.all([
                    fetchUserSavedPostIds(currentUser.uid),
                    fetchUserAnonymousIds(currentUser.uid)
                ]);
                setSavedPostIds(ids);
                setOwnAnonIds(anonMap);

                if (ids.length === 0) {
                    setPosts([]);
                    setLoading(false);
                    return;
                }

                const savedPosts = await Promise.all(
                    ids.slice(0, 20).map(id => fetchGistPostById(id).catch(() => null))
                );
                const validPosts = savedPosts.filter(Boolean).filter(p => p.status !== 'removed');
                setPosts(validPosts);
                setHasMore(false);

                if (validPosts.length > 0) {
                    const postIds = validPosts.map(p => p.id);
                    const [reactionsMap, votesMap] = await Promise.all([
                        fetchUserReactionsForPosts(currentUser.uid, postIds),
                        fetchUserVotesForPosts(currentUser.uid, postIds)
                    ]);
                    setUserReactions(prev => ({ ...prev, ...reactionsMap }));
                    setUserVotes(prev => ({ ...prev, ...votesMap }));
                }
            } else {
                const res = await fetchGistPosts({
                    scope,
                    schoolName: selectedCampus,
                    sort,
                    filterType,
                    lastVisible: isFresh ? null : lastDocRef.current,
                    pageSize: 12
                });

                lastDocRef.current = res.lastVisible;
                setHasMore(res.hasMore);
                setPosts(prev => (isFresh ? res.posts : [...prev, ...res.posts]));

                if (currentUser?.uid && res.posts.length > 0) {
                    const postIds = res.posts.map(p => p.id);

                    const [reactionsMap, votesMap, savedIds, anonMap] = await Promise.all([
                        fetchUserReactionsForPosts(currentUser.uid, postIds),
                        fetchUserVotesForPosts(currentUser.uid, postIds),
                        fetchUserSavedPostIds(currentUser.uid),
                        fetchUserAnonymousIds(currentUser.uid)
                    ]);

                    setUserReactions(prev => ({ ...prev, ...reactionsMap }));
                    setUserVotes(prev => ({ ...prev, ...votesMap }));
                    setSavedPostIds(savedIds);
                    setOwnAnonIds(anonMap);
                }
            }
        } catch (err) {
            console.error('Error in loadPosts:', err);
            setError('Could not load gists. Please check your connection and try again.');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [scope, selectedCampus, sort, filterType, currentUser]);

    useEffect(() => {
        loadPosts(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scope, selectedCampus, sort, filterType]);

    const handlePostCreated = (newPost) => {
        setPosts(prev => [newPost, ...prev]);
        if (newPost._isOwnAnonymous && newPost.id) {
            setOwnAnonIds(prev => ({ ...prev, [newPost.id]: true }));
        }
        setShowCreateModal(false);
        setPreselectedProduct(null);
    };

    const handleDeletePost = (postId) => {
        setPosts(prev => prev.filter(p => p.id !== postId));
    };

    const handleEditPost = (postId, updatedPost) => {
        setPosts(prev => prev.map(p => (p.id === postId ? { ...p, ...updatedPost } : p)));
    };

    const handleReactionUpdate = (postId, type, counts) => {
        setUserReactions(prev => ({ ...prev, [postId]: type }));
        setPosts(prev => prev.map(p => (p.id === postId ? { ...p, reactionsCount: counts } : p)));
    };

    const handleVoteSuccess = (postId, optionId) => {
        setUserVotes(prev => ({ ...prev, [postId]: optionId }));
    };

    const handleSaveToggle = (postId, isNowSaved) => {
        if (isNowSaved) {
            setSavedPostIds(prev => [...prev, postId]);
        } else {
            setSavedPostIds(prev => prev.filter(id => id !== postId));
            if (scope === 'saved') {
                setPosts(prev => prev.filter(p => p.id !== postId));
            }
        }
    };

    const handleCommentAdded = (postId) => {
        setPosts(prev => prev.map(p => (
            p.id === postId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p
        )));
    };

    const handleCommentDeleted = (postId) => {
        setPosts(prev => prev.map(p => (
            p.id === postId ? { ...p, commentsCount: Math.max(0, (p.commentsCount || 0) - 1) } : p
        )));
    };

    return (
        <div className="gist-page-container">
            {/* ── Hero Banner ── */}
            <div className="gist-hero">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                        <h1 className="gist-hero-title">
                            Market-U Gist 🔥
                        </h1>
                        <p className="gist-hero-subtitle">
                            {scope === 'across'
                                ? 'Trending campus banter, viral polls & unfiltered stories across all Nigerian universities'
                                : 'Campus stories, hot takes, polls & hilarious product reviews at your institution'}
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => {
                                setCreateModalType(filterType !== 'all' ? filterType : 'gist');
                                setShowCreateModal(true);
                            }}
                            className="btn btn-primary"
                            style={{
                                fontSize: '0.8125rem',
                                padding: '0.45rem 1rem',
                                borderRadius: 'var(--radius-full)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                fontWeight: 800
                            }}
                        >
                            <Plus size={16} /> Spill Gist
                        </button>

                        <button
                            onClick={() => setShowRulesModal(true)}
                            className="btn btn-secondary"
                            style={{
                                fontSize: '0.75rem',
                                padding: '0.4rem 0.85rem',
                                borderRadius: 'var(--radius-full)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                            }}
                        >
                            <ShieldCheck size={14} style={{ color: 'var(--success)' }} /> Rules
                        </button>
                    </div>
                </div>

                {/* Campus switcher inside hero when viewing Campus scope */}
                {scope === 'campus' && (
                    <div style={{ marginTop: '1rem' }}>
                        <CampusSwitcher
                            selectedCampus={selectedCampus}
                            onSelectCampus={handleSelectCampus}
                        />
                    </div>
                )}
            </div>

            {/* ── Always-Visible "Spill Gist" Composer Box ── */}
            <div
                onClick={() => {
                    setCreateModalType(filterType !== 'all' ? filterType : 'gist');
                    setShowCreateModal(true);
                }}
                style={{
                    background: 'var(--surface-elevated)',
                    border: '1.5px solid var(--border)',
                    borderRadius: 'var(--radius-2xl)',
                    padding: '1rem 1.15rem',
                    marginBottom: '1.25rem',
                    boxShadow: 'var(--shadow-sm)',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div className="gist-avatar" style={{ width: '40px', height: '40px', fontSize: '0.95rem' }}>
                        {(userName || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div style={{
                        flex: 1,
                        padding: '0.65rem 1rem',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.875rem',
                        fontWeight: 600
                    }}>
                        What&apos;s the gist on campus today? Tap to spill... 🔥
                    </div>
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.4rem',
                    paddingTop: '0.65rem',
                    borderTop: '1px solid var(--border)',
                    overflowX: 'auto'
                }} className="hide-scrollbar">
                    {[
                        { key: 'gist', label: 'Spill Gist', emoji: '🗣️' },
                        { key: 'confession', label: 'Confess', emoji: '🎭' },
                        { key: 'hot_take', label: 'Hot Take', emoji: '🌶️' },
                        { key: 'poll', label: 'Poll', emoji: '📊' },
                        { key: 'review', label: 'Review', emoji: '⭐' }
                    ].map(item => (
                        <button
                            key={item.key}
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setCreateModalType(item.key);
                                setShowCreateModal(true);
                            }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.35rem 0.7rem',
                                borderRadius: 'var(--radius-full)',
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: 'var(--text)',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer'
                            }}
                        >
                            <span>{item.emoji}</span>
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Scope Tabs: Your Campus | Across Campuses | Saved ── */}
            <div className="gist-scope-bar">
                <button
                    onClick={() => setScope('campus')}
                    className={`gist-scope-btn ${scope === 'campus' ? 'gist-scope-btn--active' : ''}`}
                >
                    <span>🏫</span>
                    <span>Your Campus</span>
                </button>
                <button
                    onClick={() => setScope('across')}
                    className={`gist-scope-btn ${scope === 'across' ? 'gist-scope-btn--active' : ''}`}
                >
                    <Compass size={16} />
                    <span>Across Campuses</span>
                </button>
                {currentUser && (
                    <button
                        onClick={() => setScope('saved')}
                        className={`gist-scope-btn ${scope === 'saved' ? 'gist-scope-btn--active' : ''}`}
                    >
                        <Bookmark size={16} />
                        <span>Saved ({savedPostIds.length})</span>
                    </button>
                )}
            </div>

            {/* ── Post Type Filter Chips & Sort Controls ── */}
            {scope !== 'saved' && (
                <div className="gist-controls-bar">
                    <div className="gist-filter-chips hide-scrollbar">
                        {TYPE_FILTERS.map(f => {
                            const isActive = filterType === f.key;
                            return (
                                <button
                                    key={f.key}
                                    onClick={() => setFilterType(f.key)}
                                    className={`gist-chip ${isActive ? 'gist-chip--active' : ''}`}
                                >
                                    <span>{f.emoji}</span>
                                    <span>{f.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <select
                        value={sort}
                        onChange={e => setSort(e.target.value)}
                        className="gist-sort-select"
                        aria-label="Sort gists"
                    >
                        <option value="trending">🔥 Trending</option>
                        <option value="latest">⏱️ Latest</option>
                        <option value="most_discussed">💬 Most Discussed</option>
                    </select>
                </div>
            )}

            {/* ── Error Banner ── */}
            {error && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.875rem 1.25rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: 'var(--radius-xl)',
                    marginBottom: '1.25rem',
                    color: 'var(--danger)',
                    fontSize: '0.875rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={() => loadPosts(true)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
                    >
                        <RefreshCw size={12} /> Retry
                    </button>
                </div>
            )}

            {/* ── Feed List ── */}
            <div className="gist-feed">
                {loading ? (
                    [1, 2, 3].map(n => (
                        <div key={n} className="gist-card">
                            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                <Skeleton circle width={38} height={38} />
                                <div style={{ flex: 1 }}>
                                    <Skeleton width={120} height={14} />
                                    <Skeleton width={80} height={10} style={{ marginTop: '4px' }} />
                                </div>
                            </div>
                            <Skeleton height={18} width="85%" style={{ marginBottom: '8px' }} />
                            <Skeleton count={2} height={14} />
                            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                                <Skeleton width={60} height={20} />
                                <Skeleton width={60} height={20} />
                            </div>
                        </div>
                    ))
                ) : posts.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '4rem 1.5rem',
                        background: 'var(--surface-elevated)',
                        borderRadius: 'var(--radius-2xl)',
                        border: '1px solid var(--border)'
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: 'var(--primary-light)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.25rem'
                        }}>
                            <Flame size={32} />
                        </div>
                        <h3 style={{ margin: '0 0 0.5rem', fontWeight: 800, fontSize: '1.25rem' }}>
                            {scope === 'saved' ? 'No saved gists yet' : 'No gists here yet'}
                        </h3>
                        <p style={{ margin: '0 auto 1.5rem', maxWidth: '380px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            {scope === 'saved'
                                ? 'Bookmark funny posts, hot takes, or campus debates to view them here later!'
                                : scope === 'campus'
                                ? `Be the first student to drop a story, confession, or debate for ${selectedCampus}!`
                                : 'Check back soon for trending conversations across Nigerian campuses!'}
                        </p>
                        {scope !== 'saved' && (
                            <button
                                onClick={() => {
                                    setCreateModalType(filterType !== 'all' ? filterType : 'gist');
                                    setShowCreateModal(true);
                                }}
                                className="btn btn-primary"
                                style={{ borderRadius: 'var(--radius-full)', padding: '0.65rem 1.5rem' }}
                            >
                                <Plus size={16} /> Spill First Gist
                            </button>
                        )}
                    </div>
                ) : (
                    posts.map(post => (
                        <GistCard
                            key={post.id}
                            post={post}
                            currentUser={currentUser}
                            userReaction={userReactions[post.id] || null}
                            userVote={userVotes[post.id] || null}
                            isSaved={savedPostIds.includes(post.id)}
                            isOwnAnonymous={Boolean(ownAnonIds[post.id])}
                            isAdmin={isAdmin}
                            onOpenComments={(p) => setActiveCommentPost(p)}
                            onOpenReport={(pId) => { setReportTargetId(pId); setReportTargetType('post'); }}
                            onDeletePost={handleDeletePost}
                            onEditPost={handleEditPost}
                            onReactionUpdate={handleReactionUpdate}
                            onVoteSuccess={handleVoteSuccess}
                            onSaveToggle={handleSaveToggle}
                        />
                    ))
                )}
            </div>

            {/* ── Pagination / Load More ── */}
            {hasMore && !loading && (
                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                    <button
                        onClick={() => loadPosts(false)}
                        disabled={loadingMore}
                        className="btn btn-secondary"
                        style={{
                            borderRadius: 'var(--radius-full)',
                            padding: '0.6rem 1.75rem',
                            fontSize: '0.875rem'
                        }}
                    >
                        {loadingMore ? 'Loading more...' : 'Load Older Gists'}
                    </button>
                </div>
            )}

            {/* ── Floating "Create Gist" Button ── */}
            <button
                onClick={() => {
                    setCreateModalType(filterType !== 'all' ? filterType : 'gist');
                    setShowCreateModal(true);
                }}
                className="gist-floating-btn"
                aria-label="Create new Gist"
            >
                <Plus size={20} />
                <span>Spill Gist</span>
            </button>

            {/* ── Create Gist Modal ── */}
            <CreateGistModal
                isOpen={showCreateModal}
                onClose={() => { setShowCreateModal(false); setPreselectedProduct(null); }}
                currentUser={currentUser}
                userName={userName}
                userRole={userRole}
                userSchoolName={(userSchoolName && userSchoolName !== DEFAULT_CAMPUS) ? userSchoolName : selectedCampus}
                onPostCreated={handlePostCreated}
                initialProduct={preselectedProduct}
                initialType={createModalType}
            />

            {/* ── Comments Modal / Drawer ── */}
            <GistCommentsModal
                isOpen={Boolean(activeCommentPost)}
                onClose={() => setActiveCommentPost(null)}
                post={activeCommentPost}
                currentUser={currentUser}
                userName={userName}
                isAdmin={isAdmin}
                onReportComment={(commentId) => {
                    setReportTargetId(commentId);
                    setReportTargetType('comment');
                }}
                onCommentAdded={handleCommentAdded}
                onCommentDeleted={handleCommentDeleted}
            />

            {/* ── Report Modal ── */}
            <ReportModal
                isOpen={Boolean(reportTargetId)}
                onClose={() => setReportTargetId(null)}
                targetId={reportTargetId}
                targetType={reportTargetType}
                currentUser={currentUser}
            />

            {/* ── Community Guidelines Modal ── */}
            <CommunityGuidelinesModal
                isOpen={showRulesModal}
                onClose={() => setShowRulesModal(false)}
            />
        </div>
    );
}
