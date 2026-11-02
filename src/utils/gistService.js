import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    serverTimestamp,
    increment,
    runTransaction,
    writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { INSTITUTIONS, DEFAULT_CAMPUS, SUPPORTED_SCHOOL } from '../data/institutions';

// ── Rate-limit trackers (in-memory per session + localStorage) ────────────────
const POST_COOLDOWN_MS = 20000; // 20 seconds between posts
const COMMENT_COOLDOWN_MS = 6000; // 6 seconds between comments

// ── Safety & Anti-Doxxing Filter ──────────────────────────────────────────────
const PHONE_REGEX = /(?:\+?234|0)[789][01]\d[\s-]?\d{3}[\s-]?\d{4}|\b\d{10,14}\b/;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const BLOCKED_PATTERNS = [
    /\b(kill\s+yourself|kys|rape|suicide|lynch|acid\s+attack|leak\s+nudes|sex\s+tape|revenge\s+porn)\b/i,
    /\b(doxx|drop\s+his\s+number|drop\s+her\s+number|expose\s+her\s+address|expose\s+his\s+address)\b/i
];

export function validateGistContent(text = '', title = '', isAnonymous = false) {
    const combined = `${title} ${text}`.trim();
    if (!combined) {
        return { valid: false, reason: 'Content cannot be empty.' };
    }
    if (PHONE_REGEX.test(combined)) {
        return {
            valid: false,
            reason: 'For campus safety and anti-doxxing, phone numbers or bank account digits are not allowed in Gist posts.'
        };
    }
    if (isAnonymous && EMAIL_REGEX.test(combined)) {
        return {
            valid: false,
            reason: 'Personal email addresses cannot be shared in anonymous posts.'
        };
    }
    for (const pattern of BLOCKED_PATTERNS) {
        if (pattern.test(combined)) {
            return {
                valid: false,
                reason: 'This post contains language that violates Market-U Campus Safety & Anti-Harassment Guidelines.'
            };
        }
    }
    return { valid: true };
}

// ── Institution short name resolver ──────────────────────────────────────────
export function getSchoolShort(schoolName) {
    if (!schoolName) return 'WDU';
    const found = INSTITUTIONS.find(i => i.name.toLowerCase() === schoolName.toLowerCase());
    return found?.short || schoolName.slice(0, 5).toUpperCase();
}

// ── Time-decay Trending Algorithm ──────────────────────────────────────────
// Score = (Reactions*2 + Comments*3 + Shares*2 + Votes*1.5) / ((Hours + 2) ^ 1.35)
export function calculateTrendingScore(post) {
    if (!post) return 0;
    const reactions = (post.reactionsCount?.love || 0) +
        (post.reactionsCount?.haha || 0) +
        (post.reactionsCount?.fire || 0) +
        (post.reactionsCount?.wild || 0) +
        (post.likesCount || 0);
    const comments = post.commentsCount || 0;
    const shares = post.sharesCount || 0;
    const totalVotes = post.poll?.totalVotes || 0;

    const engagement = (reactions * 2) + (comments * 3) + (shares * 2) + (totalVotes * 1.5);

    const createdAtDate = post.createdAt?.toDate ? post.createdAt.toDate() : (post.createdAt ? new Date(post.createdAt) : new Date());
    const hoursAgo = Math.max(0, (Date.now() - createdAtDate.getTime()) / (1000 * 60 * 60));

    return engagement / Math.pow(hoursAgo + 2, 1.35);
}

// ── Relative Time Formatter ────────────────────────────────────────────────
export function formatGistTime(timestamp) {
    if (!timestamp) return 'just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 45) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

// ── Poll Remaining Time Formatter ──────────────────────────────────────────
export function getPollExpiryStatus(expiresAt) {
    if (!expiresAt) return { expired: false, label: 'Open Poll' };
    const expDate = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
    const diffMs = expDate.getTime() - Date.now();
    if (diffMs <= 0) {
        return { expired: true, label: 'Poll Ended' };
    }
    const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
    if (hoursLeft < 1) {
        const minsLeft = Math.max(1, Math.floor(diffMs / (1000 * 60)));
        return { expired: false, label: `${minsLeft}m left` };
    }
    if (hoursLeft < 24) {
        return { expired: false, label: `${hoursLeft}h left` };
    }
    const daysLeft = Math.ceil(hoursLeft / 24);
    return { expired: false, label: `${daysLeft}d left` };
}

// ── Check if user is suspended from Gist ──────────────────────────────────
export async function checkUserGistEligibility(userId) {
    if (!userId) return { allowed: false, reason: 'Not signed in' };
    try {
        const userSnap = await getDoc(doc(db, 'users', userId));
        if (userSnap.exists()) {
            const data = userSnap.data();
            if (data.gistSuspended === true) {
                return {
                    allowed: false,
                    reason: data.gistSuspendedReason || 'Your Gist posting privileges have been suspended due to community guideline violations.'
                };
            }
            return { allowed: true, trustedSchool: data.schoolName || null };
        }
        return { allowed: true, trustedSchool: null };
    } catch {
        return { allowed: true, trustedSchool: null };
    }
}

// ── Verify Genuine Purchase / Marketplace Interaction for Product Reviews ──
export async function checkVerifiedPurchase(userId, productId, sellerId) {
    if (!userId || !productId) return false;
    if (sellerId && userId === sellerId) return false; // Sellers cannot self-verify their own product

    try {
        // 1. Check if buyer expressed interest in this product (single-field query to avoid composite index requirement)
        const interestQ = query(
            collection(db, 'interests'),
            where('buyerId', '==', userId),
            limit(50)
        );
        const interestSnap = await getDocs(interestQ);
        const hasValidInterest = interestSnap.docs.some(d => {
            const data = d.data();
            return data.productId === productId && !data.canceled;
        });
        if (hasValidInterest) {
            return true;
        }

        // 2. Check if buyer has an active chat with seller about this product
        const chatSnap = await getDoc(doc(db, 'chats', `${productId}_${userId}`));
        if (chatSnap.exists() && chatSnap.data().lastMessage) {
            return true;
        }

        return false;
    } catch {
        return false;
    }
}

// ── Fetch Posts ────────────────────────────────────────────────────────────
export async function fetchGistPosts({
    scope = 'campus', // 'campus' | 'across'
    schoolName = SUPPORTED_SCHOOL,
    sort = 'trending', // 'trending' | 'latest' | 'most_discussed'
    filterType = 'all', // 'all' | 'gist' | 'confession' | 'hot_take' | 'poll' | 'review'
    lastVisible = null,
    pageSize = 15
} = {}) {
    try {
        const postsRef = collection(db, 'gist_posts');
        // Query using a single orderBy('createdAt', 'desc') constraint and filter in memory
        // so Firestore never throws a missing composite index error for any filter/campus combination.
        const fetchLimit = Math.max(pageSize * 4, 50);
        const constraints = [orderBy('createdAt', 'desc'), limit(fetchLimit)];

        if (lastVisible) {
            constraints.push(startAfter(lastVisible));
        }

        const q = query(postsRef, ...constraints);
        const snapshot = await getDocs(q);

        let posts = snapshot.docs
            .map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            }))
            .filter(p => p.status !== 'removed');

        if (scope === 'campus' && schoolName && schoolName !== DEFAULT_CAMPUS) {
            posts = posts.filter(p => p.schoolName === schoolName);
        }

        if (filterType && filterType !== 'all') {
            posts = posts.filter(p => p.type === filterType);
        }

        if (sort === 'trending') {
            posts = posts.sort((a, b) => calculateTrendingScore(b) - calculateTrendingScore(a));
        } else if (sort === 'most_discussed') {
            posts = posts.sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0));
        }

        const newLastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

        return {
            posts: posts.slice(0, pageSize),
            lastVisible: newLastVisible,
            hasMore: snapshot.docs.length === fetchLimit
        };
    } catch (error) {
        console.error('Error fetching gist posts:', error);
        throw error;
    }
}

// ── Fetch Product Gist Reviews (For ProductDetail Page) ─────────────────────
export async function fetchGistReviewsForProduct(productId) {
    if (!productId) return [];
    try {
        const q = query(
            collection(db, 'gist_posts'),
            where('product.id', '==', productId),
            limit(12)
        );
        const snap = await getDocs(q);
        return snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(p => p.status !== 'removed')
            .slice(0, 6);
    } catch {
        return [];
    }
}

// ── Fetch Single Post ──────────────────────────────────────────────────────
export async function fetchGistPostById(postId) {
    try {
        const docRef = doc(db, 'gist_posts', postId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return null;
        return { id: docSnap.id, ...docSnap.data() };
    } catch (error) {
        console.error('Error fetching gist post:', error);
        throw error;
    }
}

// ── Fetch Single Comment (For Admin Moderation) ────────────────────────────
export async function fetchGistCommentById(commentId) {
    try {
        const docRef = doc(db, 'gist_comments', commentId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return null;
        return { id: docSnap.id, ...docSnap.data() };
    } catch (error) {
        console.error('Error fetching gist comment:', error);
        return null;
    }
}

// ── Fetch User's Own Anonymous Post/Comment IDs ────────────────────────────
export async function fetchUserAnonymousIds(userId) {
    if (!userId) return {};
    try {
        const q = query(
            collection(db, 'gist_private_authors'),
            where('authorId', '==', userId)
        );
        const snap = await getDocs(q);
        const map = {};
        snap.forEach(d => {
            map[d.id] = true;
        });
        return map;
    } catch {
        return {};
    }
}

// ── Create Post ────────────────────────────────────────────────────────────
export async function createGistPost({
    title = '',
    content,
    type = 'gist', // 'gist' | 'confession' | 'hot_take' | 'poll' | 'review'
    isAnonymous = false,
    schoolName,
    imageUrl = null,
    pollData = null,
    productData = null,
    user,
    userName = 'Student',
    userRole = 'buyer'
}) {
    if (!user?.uid) throw new Error('Authentication required to create a post.');

    // 1. Rate Limit Check
    const lastPostTs = Number(localStorage.getItem(`gist_last_post_${user.uid}`) || 0);
    if (Date.now() - lastPostTs < POST_COOLDOWN_MS) {
        const waitSec = Math.ceil((POST_COOLDOWN_MS - (Date.now() - lastPostTs)) / 1000);
        throw new Error(`Please wait ${waitSec}s before posting again.`);
    }

    // 2. Content Validation & Safety Filter
    const safety = validateGistContent(content, title, isAnonymous);
    if (!safety.valid) {
        throw new Error(safety.reason);
    }

    // 3. Check Suspension & Trusted School from Profile
    const eligibility = await checkUserGistEligibility(user.uid);
    if (!eligibility.allowed) {
        throw new Error(eligibility.reason);
    }

    // Enforce trusted institution from user profile if available
    const trustedSchoolName = (eligibility.trustedSchool && eligibility.trustedSchool !== DEFAULT_CAMPUS)
        ? eligibility.trustedSchool
        : (schoolName && schoolName !== DEFAULT_CAMPUS ? schoolName : SUPPORTED_SCHOOL);
    const schoolShort = getSchoolShort(trustedSchoolName);

    // 4. If Product Review: prevent seller self-review & verify genuine purchase
    let verifiedPurchaseFlag = false;
    if (type === 'review' && productData?.id) {
        if (productData.sellerId && productData.sellerId === user.uid) {
            throw new Error('You cannot write a buyer review for your own product listing. Use "Campus Gist" to share your product instead!');
        }
        verifiedPurchaseFlag = await checkVerifiedPurchase(user.uid, productData.id, productData.sellerId);
    }

    // 5. Anonymous Privacy Architecture:
    // Never expose author's UID on public document when isAnonymous is true.
    // Record real UID privately in `gist_private_authors/{postId}` for moderation & author self-delete.
    const authorDisplayName = isAnonymous ? 'Anonymous Student' : (userName || 'Student');
    const authorDisplayRole = isAnonymous ? 'Student' : userRole;

    const newPost = {
        title: title.trim(),
        content: content.trim(),
        type,
        isAnonymous: Boolean(isAnonymous),
        authorId: isAnonymous ? null : user.uid,
        authorName: authorDisplayName,
        authorRole: authorDisplayRole,
        schoolName: trustedSchoolName,
        schoolShort,
        imageUrl: imageUrl || null,
        reactionsCount: {
            love: 0,
            haha: 0,
            fire: 0,
            wild: 0
        },
        commentsCount: 0,
        sharesCount: 0,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    if (type === 'poll' && pollData?.options) {
        newPost.poll = {
            question: pollData.question?.trim() || content.trim(),
            options: pollData.options.map((opt, idx) => ({
                id: `opt_${idx}`,
                text: typeof opt === 'string' ? opt.trim() : opt.text.trim(),
                votes: 0
            })),
            totalVotes: 0,
            expiresAt: pollData.expiresAt || null
        };
    }

    if (productData && productData.id) {
        newPost.product = {
            id: productData.id || '',
            title: productData.title || '',
            price: productData.price || 0,
            imageUrl: productData.imageUrl || '',
            sellerId: productData.sellerId || '',
            sellerName: productData.sellerName || '',
            rating: type === 'review' ? (Number(productData.rating) || 5) : null,
            isVerifiedPurchase: type === 'review' ? Boolean(verifiedPurchaseFlag) : false
        };
    }

    const docRef = await addDoc(collection(db, 'gist_posts'), newPost);

    // If anonymous, store private author mapping for admin moderation & author self-management
    if (isAnonymous) {
        await setDoc(doc(db, 'gist_private_authors', docRef.id), {
            targetId: docRef.id,
            targetType: 'post',
            authorId: user.uid,
            authorEmail: user.email || '',
            realName: userName || '',
            schoolName: trustedSchoolName,
            createdAt: serverTimestamp()
        });
    }

    localStorage.setItem(`gist_last_post_${user.uid}`, Date.now().toString());
    return { id: docRef.id, ...newPost, _isOwnAnonymous: isAnonymous };
}

// ── Edit Post ──────────────────────────────────────────────────────────────
export async function updateGistPost(postId, { title = '', content = '' }, user) {
    if (!user?.uid) throw new Error('Authentication required.');
    const postRef = doc(db, 'gist_posts', postId);
    const snap = await getDoc(postRef);
    if (!snap.exists()) throw new Error('Post not found.');

    const data = snap.data();
    const safety = validateGistContent(content, title, data.isAnonymous);
    if (!safety.valid) throw new Error(safety.reason);

    await updateDoc(postRef, {
        title: title.trim(),
        content: content.trim(),
        isEdited: true,
        updatedAt: serverTimestamp()
    });

    return {
        ...data,
        id: postId,
        title: title.trim(),
        content: content.trim(),
        isEdited: true
    };
}

// ── Delete Post ────────────────────────────────────────────────────────────
export async function deleteGistPost(postId, user, isAdmin = false) {
    if (!user?.uid) throw new Error('Unauthorized');
    const postRef = doc(db, 'gist_posts', postId);
    const snap = await getDoc(postRef);
    if (!snap.exists()) return;

    const data = snap.data();
    let isOwner = data.authorId === user.uid;

    if (!isOwner && data.isAnonymous) {
        try {
            const privSnap = await getDoc(doc(db, 'gist_private_authors', postId));
            if (privSnap.exists() && privSnap.data().authorId === user.uid) {
                isOwner = true;
            }
        } catch { /* ignore */ }
    }

    if (!isOwner && !isAdmin) {
        throw new Error('You do not have permission to delete this post.');
    }

    await updateDoc(postRef, {
        status: 'removed',
        removedAt: serverTimestamp(),
        removedBy: user.uid
    });
}

// ── Gist Social Notifications Helper ───────────────────────────────────────
async function createGistNotification({
    recipientId,
    actorId,
    actorName,
    postId,
    postTitle,
    type, // 'gist_comment' | 'gist_reply' | 'gist_reaction' | 'gist_vote'
    previewText = ''
}) {
    if (!recipientId || !actorId || recipientId === actorId) return;
    try {
        // Deduplicate reaction/vote notifications per actor+post+type
        const notifId = (type === 'gist_reaction' || type === 'gist_vote')
            ? `${type}_${postId}_${actorId}`
            : `${type}_${postId}_${actorId}_${Date.now()}`;

        await setDoc(doc(db, 'gist_notifications', notifId), {
            recipientId,
            actorId,
            actorName: actorName || 'A student',
            postId,
            postTitle: (postTitle || '').slice(0, 80),
            type,
            previewText: (previewText || '').slice(0, 120),
            read: false,
            createdAt: serverTimestamp()
        });
    } catch {
        // Non-critical if notification creation fails
    }
}

export async function fetchUserGistNotifications(userId) {
    if (!userId) return [];
    try {
        const q = query(
            collection(db, 'gist_notifications'),
            where('recipientId', '==', userId),
            limit(50)
        );
        const snap = await getDocs(q);
        return snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
            .slice(0, 30);
    } catch {
        return [];
    }
}

export async function markGistNotificationsRead(userId, notifIds = []) {
    if (!userId || notifIds.length === 0) return;
    try {
        const batch = writeBatch(db);
        notifIds.slice(0, 25).forEach(id => {
            batch.update(doc(db, 'gist_notifications', id), { read: true });
        });
        await batch.commit();
    } catch {
        // Ignore
    }
}

// ── Reactions ──────────────────────────────────────────────────────────────
export async function reactToGistPost(postId, user, reactionType = 'fire', userName = 'A student') {
    if (!user?.uid) throw new Error('Authentication required to react.');

    const reactionDocId = `${postId}_${user.uid}`;
    const reactionRef = doc(db, 'gist_reactions', reactionDocId);
    const postRef = doc(db, 'gist_posts', postId);

    const res = await runTransaction(db, async (transaction) => {
        const reactionSnap = await transaction.get(reactionRef);
        const postSnap = await transaction.get(postRef);

        if (!postSnap.exists()) throw new Error('Post not found');

        const postData = postSnap.data();
        const counts = { ...(postData.reactionsCount || { love: 0, haha: 0, fire: 0, wild: 0 }) };

        if (reactionSnap.exists()) {
            const currentType = reactionSnap.data().type;
            if (currentType === reactionType) {
                counts[currentType] = Math.max(0, (counts[currentType] || 0) - 1);
                transaction.delete(reactionRef);
                transaction.update(postRef, { reactionsCount: counts });
                return { action: 'removed', type: null, counts, postData };
            } else {
                counts[currentType] = Math.max(0, (counts[currentType] || 0) - 1);
                counts[reactionType] = (counts[reactionType] || 0) + 1;
                transaction.update(reactionRef, {
                    type: reactionType,
                    updatedAt: serverTimestamp()
                });
                transaction.update(postRef, { reactionsCount: counts });
                return { action: 'switched', type: reactionType, counts, postData };
            }
        } else {
            counts[reactionType] = (counts[reactionType] || 0) + 1;
            transaction.set(reactionRef, {
                postId,
                userId: user.uid,
                type: reactionType,
                createdAt: serverTimestamp()
            });
            transaction.update(postRef, { reactionsCount: counts });
            return { action: 'added', type: reactionType, counts, postData };
        }
    });

    if (res.action === 'added' && res.postData?.authorId) {
        createGistNotification({
            recipientId: res.postData.authorId,
            actorId: user.uid,
            actorName: userName,
            postId,
            postTitle: res.postData.title || res.postData.content,
            type: 'gist_reaction',
            previewText: `Reacted with ${reactionType.toUpperCase()} to your gist`
        });
    }

    return { action: res.action, type: res.type, counts: res.counts };
}

export async function fetchUserReactionsForPosts(userId, postIds) {
    if (!userId || !postIds || postIds.length === 0) return {};
    const results = {};

    const chunks = [];
    for (let i = 0; i < postIds.length; i += 30) {
        chunks.push(postIds.slice(i, i + 30));
    }

    for (const chunk of chunks) {
        const q = query(
            collection(db, 'gist_reactions'),
            where('userId', '==', userId),
            where('postId', 'in', chunk)
        );
        const snap = await getDocs(q);
        snap.forEach(d => {
            const data = d.data();
            results[data.postId] = data.type;
        });
    }

    return results;
}

// ── Poll Voting ────────────────────────────────────────────────────────────
export async function voteInPoll(postId, optionId, user) {
    if (!user?.uid) throw new Error('Authentication required to vote.');

    const voteDocId = `${postId}_${user.uid}`;
    const voteRef = doc(db, 'gist_votes', voteDocId);
    const postRef = doc(db, 'gist_posts', postId);

    const res = await runTransaction(db, async (transaction) => {
        const voteSnap = await transaction.get(voteRef);
        if (voteSnap.exists()) {
            throw new Error('You have already voted in this poll.');
        }

        const postSnap = await transaction.get(postRef);
        if (!postSnap.exists()) throw new Error('Poll not found');

        const postData = postSnap.data();
        if (postData.type !== 'poll' || !postData.poll) {
            throw new Error('This post is not an active poll.');
        }

        if (postData.poll.expiresAt) {
            const expDate = postData.poll.expiresAt.toDate ? postData.poll.expiresAt.toDate() : new Date(postData.poll.expiresAt);
            if (Date.now() > expDate.getTime()) {
                throw new Error('This poll has ended.');
            }
        }

        const updatedOptions = postData.poll.options.map(opt => {
            if (opt.id === optionId) {
                return { ...opt, votes: (opt.votes || 0) + 1 };
            }
            return opt;
        });

        const totalVotes = (postData.poll.totalVotes || 0) + 1;

        transaction.set(voteRef, {
            postId,
            userId: user.uid,
            optionId,
            votedAt: serverTimestamp()
        });

        transaction.update(postRef, {
            'poll.options': updatedOptions,
            'poll.totalVotes': totalVotes
        });

        return {
            optionId,
            options: updatedOptions,
            totalVotes,
            postData
        };
    });

    // Notify poll author on milestone votes (1st, 5th, 10th, 25th vote) to avoid notification spam
    if (res.postData?.authorId && [1, 5, 10, 25, 50].includes(res.totalVotes)) {
        createGistNotification({
            recipientId: res.postData.authorId,
            actorId: user.uid,
            actorName: 'Students',
            postId,
            postTitle: res.postData.poll?.question || res.postData.title || res.postData.content,
            type: 'gist_vote',
            previewText: `Your campus poll just reached ${res.totalVotes} ${res.totalVotes === 1 ? 'vote' : 'votes'}!`
        });
    }

    return {
        optionId: res.optionId,
        options: res.options,
        totalVotes: res.totalVotes
    };
}

export async function fetchUserVotesForPosts(userId, postIds) {
    if (!userId || !postIds || postIds.length === 0) return {};
    const results = {};

    const chunks = [];
    for (let i = 0; i < postIds.length; i += 30) {
        chunks.push(postIds.slice(i, i + 30));
    }

    for (const chunk of chunks) {
        const q = query(
            collection(db, 'gist_votes'),
            where('userId', '==', userId),
            where('postId', 'in', chunk)
        );
        const snap = await getDocs(q);
        snap.forEach(d => {
            const data = d.data();
            results[data.postId] = data.optionId;
        });
    }

    return results;
}

// ── Comments & Replies ─────────────────────────────────────────────────────
export async function fetchPostComments(postId) {
    try {
        const q = query(
            collection(db, 'gist_comments'),
            where('postId', '==', postId),
            limit(150)
        );
        const snap = await getDocs(q);
        return snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(c => c.status !== 'removed')
            .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
            .slice(0, 100);
    } catch (error) {
        console.error('Error fetching comments:', error);
        return [];
    }
}

export async function addComment({
    postId,
    content,
    isAnonymous = false,
    user,
    userName = 'Student',
    parentId = null,
    replyToName = null,
    replyToAuthorId = null,
    postAuthorId = null,
    postTitle = ''
}) {
    if (!user?.uid) throw new Error('Authentication required to comment.');

    // 1. Rate Limit Check
    const lastCommentTs = Number(localStorage.getItem(`gist_last_comment_${user.uid}`) || 0);
    if (Date.now() - lastCommentTs < COMMENT_COOLDOWN_MS) {
        throw new Error('Slow down a bit! Please wait a few seconds before sending another comment.');
    }

    // 2. Safety & Anti-Doxxing Check
    const safety = validateGistContent(content, '', isAnonymous);
    if (!safety.valid) {
        throw new Error(safety.reason);
    }

    // 3. Suspension Check
    const eligibility = await checkUserGistEligibility(user.uid);
    if (!eligibility.allowed) {
        throw new Error(eligibility.reason);
    }

    const authorDisplayName = isAnonymous ? 'Anonymous' : (userName || 'Student');

    const commentData = {
        postId,
        content: content.trim(),
        authorId: isAnonymous ? null : user.uid,
        authorName: authorDisplayName,
        isAnonymous: Boolean(isAnonymous),
        parentId: parentId || null,
        replyToName: replyToName || null,
        likesCount: 0,
        status: 'active',
        createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'gist_comments'), commentData);

    if (isAnonymous) {
        await setDoc(doc(db, 'gist_private_authors', docRef.id), {
            targetId: docRef.id,
            targetType: 'comment',
            postId,
            authorId: user.uid,
            authorEmail: user.email || '',
            realName: userName || '',
            createdAt: serverTimestamp()
        });
    }

    const postRef = doc(db, 'gist_posts', postId);
    await updateDoc(postRef, {
        commentsCount: increment(1)
    }).catch(err => console.warn('Could not increment commentsCount:', err));

    // Notify parent comment author if this is a reply
    if (parentId && replyToAuthorId && replyToAuthorId !== user.uid) {
        createGistNotification({
            recipientId: replyToAuthorId,
            actorId: user.uid,
            actorName: authorDisplayName,
            postId,
            postTitle,
            type: 'gist_reply',
            previewText: content.trim()
        });
    } else if (postAuthorId && postAuthorId !== user.uid) {
        createGistNotification({
            recipientId: postAuthorId,
            actorId: user.uid,
            actorName: authorDisplayName,
            postId,
            postTitle,
            type: 'gist_comment',
            previewText: content.trim()
        });
    }

    localStorage.setItem(`gist_last_comment_${user.uid}`, Date.now().toString());
    return { id: docRef.id, ...commentData, _isOwnAnonymous: isAnonymous };
}

export async function deleteComment(commentId, postId, user, isAdmin = false) {
    if (!user?.uid) throw new Error('Unauthorized');
    const commentRef = doc(db, 'gist_comments', commentId);
    const snap = await getDoc(commentRef);
    if (!snap.exists()) return;

    const data = snap.data();
    let isOwner = data.authorId === user.uid;

    if (!isOwner && data.isAnonymous) {
        try {
            const privSnap = await getDoc(doc(db, 'gist_private_authors', commentId));
            if (privSnap.exists() && privSnap.data().authorId === user.uid) {
                isOwner = true;
            }
        } catch { /* ignore */ }
    }

    if (!isOwner && !isAdmin) {
        throw new Error('Permission denied.');
    }

    await updateDoc(commentRef, {
        status: 'removed',
        removedAt: serverTimestamp(),
        removedBy: user.uid
    });

    const targetPostId = postId || data.postId;
    if (targetPostId) {
        const postRef = doc(db, 'gist_posts', targetPostId);
        await updateDoc(postRef, {
            commentsCount: increment(-1)
        }).catch(err => console.warn('Could not decrement commentsCount:', err));
    }
}

// ── Saved / Bookmarked Posts ───────────────────────────────────────────────
export async function toggleSavePost(postId, userId) {
    if (!userId) throw new Error('Authentication required.');

    const docId = `${userId}_${postId}`;
    const saveRef = doc(db, 'gist_saved', docId);
    const snap = await getDoc(saveRef);

    if (snap.exists()) {
        await deleteDoc(saveRef);
        return false; // un-saved
    } else {
        await setDoc(saveRef, {
            userId,
            postId,
            savedAt: serverTimestamp()
        });
        return true; // saved
    }
}

export async function fetchUserSavedPostIds(userId) {
    if (!userId) return [];
    try {
        const q = query(
            collection(db, 'gist_saved'),
            where('userId', '==', userId)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => d.data().postId);
    } catch (error) {
        console.error('Error fetching saved gists:', error);
        return [];
    }
}

// ── Reporting & Moderation ─────────────────────────────────────────────────
export async function reportContent({
    targetId,
    targetType = 'post', // 'post' | 'comment'
    reason,
    details = '',
    user
}) {
    if (!user?.uid) throw new Error('Authentication required to submit a report.');
    if (!reason) throw new Error('Please select a reason.');

    // Prevent duplicate spam reporting of the same target by the same user
    try {
        const existingQ = query(
            collection(db, 'gist_reports'),
            where('reporterId', '==', user.uid),
            limit(30)
        );
        const existingSnap = await getDocs(existingQ);
        const alreadyReported = existingSnap.docs.some(d => d.data().targetId === targetId);
        if (alreadyReported) {
            throw new Error('You have already submitted a report for this content. Our team is reviewing it.');
        }
    } catch (err) {
        if (err.message?.includes('already submitted')) throw err;
    }

    const reportData = {
        targetId,
        targetType,
        reason,
        details: details.trim(),
        reporterId: user.uid,
        status: 'pending', // 'pending' | 'resolved' | 'dismissed'
        createdAt: serverTimestamp()
    };

    return await addDoc(collection(db, 'gist_reports'), reportData);
}

export async function fetchAdminReportedItems() {
    try {
        const q = query(
            collection(db, 'gist_reports'),
            where('status', '==', 'pending'),
            limit(80)
        );
        const snap = await getDocs(q);
        return snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
            .slice(0, 50);
    } catch (error) {
        console.error('Error fetching reports:', error);
        return [];
    }
}

export async function fetchPrivateAuthorForAdmin(targetId) {
    if (!targetId) return null;
    try {
        const snap = await getDoc(doc(db, 'gist_private_authors', targetId));
        if (!snap.exists()) return null;
        return snap.data();
    } catch {
        return null;
    }
}

export async function recordModerationAction({
    actionType, // 'content_removed' | 'report_dismissed' | 'user_suspended' | 'user_unsuspended'
    targetId,
    targetType,
    offenderId = null,
    reason = '',
    adminUser
}) {
    if (!adminUser?.uid) return;
    try {
        await addDoc(collection(db, 'gist_moderation_actions'), {
            actionType,
            targetId: targetId || '',
            targetType: targetType || 'post',
            offenderId: offenderId || null,
            reason: reason || '',
            adminId: adminUser.uid,
            adminEmail: adminUser.email || '',
            createdAt: serverTimestamp()
        });
    } catch (err) {
        console.warn('Could not log moderation action:', err);
    }
}

export async function fetchModerationActions() {
    try {
        const q = query(
            collection(db, 'gist_moderation_actions'),
            orderBy('createdAt', 'desc'),
            limit(40)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {
        return [];
    }
}

export async function setUserGistSuspension(targetUserId, suspended, reason = '', adminUser) {
    if (!adminUser?.uid || !targetUserId) throw new Error('Missing admin or target user ID.');
    await updateDoc(doc(db, 'users', targetUserId), {
        gistSuspended: Boolean(suspended),
        gistSuspendedReason: suspended ? (reason || 'Community guideline violation') : '',
        gistSuspendedAt: suspended ? serverTimestamp() : null,
        gistSuspendedBy: adminUser.uid
    });

    await recordModerationAction({
        actionType: suspended ? 'user_suspended' : 'user_unsuspended',
        targetId: targetUserId,
        targetType: 'user',
        offenderId: targetUserId,
        reason,
        adminUser
    });
}

export async function fetchRecentAnonymousPostsForAdmin() {
    try {
        const q = query(
            collection(db, 'gist_posts'),
            where('isAnonymous', '==', true),
            limit(60)
        );
        const snap = await getDocs(q);
        return snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
            .slice(0, 30);
    } catch {
        return [];
    }
}

export async function resolveReport(reportId, action, adminUser, extra = {}) {
    if (!adminUser?.uid) throw new Error('Admin authorization required.');
    const reportRef = doc(db, 'gist_reports', reportId);
    await updateDoc(reportRef, {
        status: action === 'dismiss' ? 'dismissed' : 'resolved',
        resolvedBy: adminUser.uid,
        actionTaken: action,
        resolvedAt: serverTimestamp()
    });

    await recordModerationAction({
        actionType: action === 'dismiss' ? 'report_dismissed' : 'content_removed',
        targetId: extra.targetId || reportId,
        targetType: extra.targetType || 'post',
        offenderId: extra.offenderId || null,
        reason: extra.reason || '',
        adminUser
    });
}

// ── Increment Shares ───────────────────────────────────────────────────────
export async function recordPostShare(postId) {
    try {
        const postRef = doc(db, 'gist_posts', postId);
        await updateDoc(postRef, {
            sharesCount: increment(1)
        });
    } catch (err) {
        console.warn('Failed to record share count:', err);
    }
}
