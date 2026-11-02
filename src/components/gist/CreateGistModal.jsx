import { useState, useEffect } from 'react';
import { collection, query, getDocs, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { createGistPost, checkVerifiedPurchase } from '../../utils/gistService';
import { uploadImageToCloudinary } from '../../utils/cloudinary';
import { SUPPORTED_SCHOOL, DEFAULT_CAMPUS } from '../../data/institutions';
import {
    X,
    Image as ImageIcon,
    Flame,
    EyeOff,
    Star,
    Plus,
    Trash2,
    AlertCircle,
    Search,
    ShoppingBag,
    CheckCircle,
    Tag
} from 'lucide-react';

const POST_TYPES = [
    { key: 'gist', label: 'Campus Gist', emoji: '🗣️', desc: 'Share relatable campus moments or news' },
    { key: 'confession', label: 'Confession', emoji: '🎭', desc: 'Post anonymously — your identity is hidden' },
    { key: 'hot_take', label: 'Hot Take', emoji: '🌶️', desc: 'Drop a controversial opinion or campus debate' },
    { key: 'poll', label: 'Poll', emoji: '📊', desc: 'Ask a question & let students vote' },
    { key: 'review', label: 'Product Review', emoji: '⭐', desc: 'Drop a funny or real review of a campus item' },
];

export default function CreateGistModal({
    isOpen,
    onClose,
    currentUser,
    userName,
    userRole,
    userSchoolName,
    onPostCreated,
    initialProduct = null,
    initialType = 'gist'
}) {
    const [activeType, setActiveType] = useState(initialType || 'gist');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    // Poll State
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);
    const [pollDays, setPollDays] = useState('3');

    // Product Review / Product Tagging State
    const [selectedProduct, setSelectedProduct] = useState(initialProduct);
    const [showProductPicker, setShowProductPicker] = useState(Boolean(initialProduct));
    const [productSearch, setProductSearch] = useState('');
    const [availableProducts, setAvailableProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [rating, setRating] = useState(5);
    const [isVerifiedBuyer, setIsVerifiedBuyer] = useState(false);
    const [checkingPurchase, setCheckingPurchase] = useState(false);

    // Submission & Feedback
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (initialProduct) {
            setSelectedProduct(initialProduct);
            setShowProductPicker(true);
        }
    }, [initialProduct]);

    useEffect(() => {
        if (initialType) {
            setActiveType(initialType);
        }
    }, [initialType]);

    // Check genuine purchase status when a product is selected for review
    useEffect(() => {
        let isMounted = true;
        async function verifyBuyer() {
            if (!selectedProduct?.id || !currentUser?.uid) {
                if (isMounted) setIsVerifiedBuyer(false);
                return;
            }
            setCheckingPurchase(true);
            try {
                const verified = await checkVerifiedPurchase(
                    currentUser.uid,
                    selectedProduct.id,
                    selectedProduct.sellerId
                );
                if (isMounted) setIsVerifiedBuyer(verified);
            } catch {
                if (isMounted) setIsVerifiedBuyer(false);
            } finally {
                if (isMounted) setCheckingPurchase(false);
            }
        }
        verifyBuyer();
        return () => { isMounted = false; };
    }, [selectedProduct, currentUser?.uid]);

    // Fetch products when review tab is active or product picker is opened
    useEffect(() => {
        if ((activeType !== 'review' && !showProductPicker) || selectedProduct) return;

        let isMounted = true;
        const searchProducts = async () => {
            setLoadingProducts(true);
            try {
                const q = query(collection(db, 'products'), limit(25));
                const snap = await getDocs(q);
                if (isMounted) {
                    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    setAvailableProducts(list);
                }
            } catch (err) {
                console.error('Error fetching products for review:', err);
            } finally {
                if (isMounted) setLoadingProducts(false);
            }
        };

        searchProducts();
        return () => { isMounted = false; };
    }, [activeType, showProductPicker, selectedProduct]);

    if (!isOpen) return null;

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be under 5MB.');
            return;
        }

        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        setError('');
    };

    const removeImage = () => {
        setImageFile(null);
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
    };

    // Poll Option Handlers
    const handleAddPollOption = () => {
        if (pollOptions.length >= 4) return;
        setPollOptions(prev => [...prev, '']);
    };

    const handleRemovePollOption = (idx) => {
        if (pollOptions.length <= 2) return;
        setPollOptions(prev => prev.filter((_, i) => i !== idx));
    };

    const handlePollOptionChange = (idx, val) => {
        setPollOptions(prev => {
            const next = [...prev];
            next[idx] = val;
            return next;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!currentUser) {
            setError('You must be logged in to create a Gist.');
            return;
        }

        if (!content.trim() && activeType !== 'poll') {
            setError('Please enter some text for your post.');
            return;
        }

        if (activeType === 'poll') {
            if (!pollQuestion.trim() && !content.trim()) {
                setError('Please provide a question for your poll.');
                return;
            }
            const filledOptions = pollOptions.map(o => o.trim()).filter(Boolean);
            if (filledOptions.length < 2) {
                setError('Polls need at least 2 non-empty options.');
                return;
            }
        }

        if (activeType === 'review' && !selectedProduct) {
            setError('Please choose a product to review.');
            return;
        }

        if (activeType === 'review' && selectedProduct?.sellerId === currentUser.uid) {
            setError('You cannot review your own product! Switch to "Campus Gist" to hype or share your listing.');
            return;
        }

        setSubmitting(true);

        try {
            let uploadedImageUrl = null;
            if (imageFile) {
                uploadedImageUrl = await uploadImageToCloudinary(imageFile);
            }

            let pollData = null;
            if (activeType === 'poll') {
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + parseInt(pollDays, 10));
                pollData = {
                    question: pollQuestion.trim() || content.trim(),
                    options: pollOptions.map(o => o.trim()).filter(Boolean),
                    expiresAt
                };
            }

            let productData = null;
            if (selectedProduct && (activeType === 'review' || showProductPicker)) {
                productData = {
                    id: selectedProduct.id,
                    title: selectedProduct.title || selectedProduct.name,
                    price: selectedProduct.price || 0,
                    imageUrl: Array.isArray(selectedProduct.images) ? selectedProduct.images[0] : (selectedProduct.imageUrl || ''),
                    sellerId: selectedProduct.sellerId || '',
                    sellerName: selectedProduct.sellerName || '',
                    rating: activeType === 'review' ? rating : null,
                    isVerifiedPurchase: activeType === 'review' ? Boolean(isVerifiedBuyer) : false
                };
            }

            const school = userSchoolName && userSchoolName !== DEFAULT_CAMPUS ? userSchoolName : SUPPORTED_SCHOOL;

            const post = await createGistPost({
                title,
                content: content.trim() || (activeType === 'poll' ? pollQuestion.trim() : ''),
                type: activeType,
                isAnonymous: activeType === 'confession',
                schoolName: school,
                imageUrl: uploadedImageUrl,
                pollData,
                productData,
                user: currentUser,
                userName,
                userRole
            });

            // Reset form state so next open is clean
            setTitle('');
            setContent('');
            setImageFile(null);
            setImagePreview(null);
            setPollQuestion('');
            setPollOptions(['', '']);
            setSelectedProduct(null);
            setShowProductPicker(false);

            if (onPostCreated) onPostCreated(post);
            onClose();
        } catch (err) {
            console.error('Failed to create post:', err);
            setError(err.message || 'Error creating post. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredAvailableProducts = availableProducts.filter(p => {
        if (!productSearch) return true;
        const titleStr = (p.title || p.name || '').toLowerCase();
        return titleStr.includes(productSearch.toLowerCase());
    });

    const trustedCampusDisplay = userSchoolName && userSchoolName !== DEFAULT_CAMPUS ? userSchoolName : SUPPORTED_SCHOOL;

    return (
        <div className="gist-modal-overlay" onClick={onClose}>
            <div
                className="gist-modal-content"
                onClick={e => e.stopPropagation()}
                style={{ maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto' }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1rem',
                    paddingBottom: '0.75rem',
                    borderBottom: '1px solid var(--border)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'var(--gradient-primary)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800
                        }}>
                            <Flame size={18} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800 }}>Create Gist</h3>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                Posting as {activeType === 'confession' ? 'Anonymous Student' : (userName || 'Student')} • {trustedCampusDisplay}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="gist-icon-btn" aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                {/* Post Type Selector Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '0.35rem',
                    overflowX: 'auto',
                    paddingBottom: '0.5rem',
                    marginBottom: '1rem'
                }} className="hide-scrollbar">
                    {POST_TYPES.map(t => {
                        const isActive = activeType === t.key;
                        return (
                            <button
                                key={t.key}
                                type="button"
                                onClick={() => { setActiveType(t.key); setError(''); }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    padding: '0.45rem 0.75rem',
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    border: `1.5px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
                                    background: isActive ? 'var(--primary-light)' : 'var(--surface)',
                                    color: isActive ? 'var(--primary)' : 'var(--text)',
                                    whiteSpace: 'nowrap',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <span>{t.emoji}</span>
                                <span>{t.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Anonymous Confession Safety Notice */}
                {activeType === 'confession' && (
                    <div style={{
                        padding: '0.75rem',
                        marginBottom: '1rem',
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        borderRadius: 'var(--radius-lg)',
                        fontSize: '0.8125rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#a855f7', fontWeight: 800, marginBottom: '0.2rem' }}>
                            <EyeOff size={16} /> Anonymous Confession Mode
                        </div>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                            Your public identity is hidden from all students. Phone numbers, personal emails, doxxing, or targeted harassment are automatically blocked.
                        </p>
                    </div>
                )}

                {/* Hot Take Flame Highlight */}
                {activeType === 'hot_take' && (
                    <div style={{
                        padding: '0.75rem',
                        marginBottom: '1rem',
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: 'var(--radius-lg)',
                        fontSize: '0.8125rem',
                        color: 'var(--accent-hover)'
                    }}>
                        <strong>🔥 Drop a Hot Take:</strong> Post an interesting opinion or question that gets students talking and debating!
                    </div>
                )}

                {/* Error Banner */}
                {error && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.625rem 0.875rem',
                        marginBottom: '1rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--danger)',
                        fontSize: '0.8125rem'
                    }}>
                        <AlertCircle size={16} style={{ flexShrink: 0 }} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    {/* Optional Title */}
                    <div>
                        <input
                            type="text"
                            placeholder={
                                activeType === 'hot_take' ? "Your bold take (e.g., 'Campus haircut shouldn't cost ₦5k')" :
                                activeType === 'confession' ? "Confession headline (optional)" :
                                activeType === 'poll' ? "Poll title / context (optional)" :
                                "Title (optional)"
                            }
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            maxLength={100}
                            style={{ width: '100%', fontSize: '0.9375rem', fontWeight: 600 }}
                        />
                    </div>

                    {/* Poll Questions & Options */}
                    {activeType === 'poll' && (
                        <div style={{
                            padding: '0.875rem',
                            background: 'var(--surface)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem'
                        }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                                    Poll Question *
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., Hostel life vs Off-campus?"
                                    value={pollQuestion}
                                    onChange={e => setPollQuestion(e.target.value)}
                                    maxLength={140}
                                    style={{ width: '100%', fontSize: '0.875rem' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                                    Poll Choices (2 to 4)
                                </label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {pollOptions.map((opt, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <input
                                                type="text"
                                                placeholder={`Option ${idx + 1}`}
                                                value={opt}
                                                onChange={e => handlePollOptionChange(idx, e.target.value)}
                                                maxLength={50}
                                                style={{ flex: 1, fontSize: '0.8125rem' }}
                                            />
                                            {pollOptions.length > 2 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemovePollOption(idx)}
                                                    className="gist-icon-btn"
                                                    style={{ color: 'var(--danger)', padding: '6px' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {pollOptions.length < 4 && (
                                    <button
                                        type="button"
                                        onClick={handleAddPollOption}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.35rem',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            color: 'var(--primary)',
                                            marginTop: '0.5rem',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Plus size={14} /> Add another option
                                    </button>
                                )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                    Poll duration:
                                </label>
                                <select
                                    value={pollDays}
                                    onChange={e => setPollDays(e.target.value)}
                                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                >
                                    <option value="1">24 Hours</option>
                                    <option value="3">3 Days</option>
                                    <option value="7">7 Days</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Product Review / Product Attachment Picker */}
                    {(activeType === 'review' || showProductPicker) && (
                        <div style={{
                            padding: '0.875rem',
                            background: 'var(--surface)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                    {activeType === 'review' ? 'Link a Marketplace Product *' : 'Attached Marketplace Product'}
                                </label>
                                {activeType !== 'review' && (
                                    <button
                                        type="button"
                                        onClick={() => { setShowProductPicker(false); setSelectedProduct(null); }}
                                        style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
                                    >
                                        Remove attachment
                                    </button>
                                )}
                            </div>

                            {selectedProduct ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '0.625rem 0.75rem',
                                        background: 'var(--surface-elevated)',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1.5px solid var(--primary)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '8px',
                                                background: '#e2e8f0',
                                                overflow: 'hidden',
                                                flexShrink: 0
                                            }}>
                                                {selectedProduct.imageUrl || (selectedProduct.images && selectedProduct.images[0]) ? (
                                                    <img
                                                        src={selectedProduct.imageUrl || selectedProduct.images[0]}
                                                        alt={selectedProduct.title || selectedProduct.name}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                ) : (
                                                    <ShoppingBag size={20} style={{ margin: '10px', color: 'var(--text-secondary)' }} />
                                                )}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text)' }}>
                                                    {selectedProduct.title || selectedProduct.name}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>
                                                    ₦{(Number(selectedProduct.price) || 0).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedProduct(null)}
                                            className="gist-icon-btn"
                                            style={{ color: 'var(--danger)' }}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>

                                    {/* Verified Purchase Status Indicator */}
                                    {activeType === 'review' && (
                                        <div style={{
                                            fontSize: '0.75rem',
                                            padding: '0.45rem 0.65rem',
                                            borderRadius: 'var(--radius-md)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem',
                                            background: checkingPurchase
                                                ? 'var(--surface-elevated)'
                                                : isVerifiedBuyer
                                                ? 'rgba(16, 185, 129, 0.1)'
                                                : 'rgba(37, 99, 235, 0.06)',
                                            color: isVerifiedBuyer ? 'var(--success)' : 'var(--text-secondary)',
                                            fontWeight: 600
                                        }}>
                                            {checkingPurchase ? (
                                                <span>Checking purchase history...</span>
                                            ) : isVerifiedBuyer ? (
                                                <>
                                                    <CheckCircle size={14} />
                                                    <span>Verified Buyer! Your review will display a Verified Buyer badge.</span>
                                                </>
                                            ) : (
                                                <span>Community Review (Verified Buyer badge is reserved for confirmed buyers).</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                                        <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-secondary)' }} />
                                        <input
                                            type="text"
                                            placeholder="Search campus products..."
                                            value={productSearch}
                                            onChange={e => setProductSearch(e.target.value)}
                                            style={{ width: '100%', paddingLeft: '32px', fontSize: '0.8125rem' }}
                                        />
                                    </div>

                                    <div style={{
                                        maxHeight: '160px',
                                        overflowY: 'auto',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.35rem'
                                    }}>
                                        {loadingProducts ? (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '0.5rem', textAlign: 'center' }}>
                                                Loading products...
                                            </div>
                                        ) : filteredAvailableProducts.length === 0 ? (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '0.5rem', textAlign: 'center' }}>
                                                No matching products found.
                                            </div>
                                        ) : (
                                            filteredAvailableProducts.map(p => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => setSelectedProduct(p)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '0.45rem 0.65rem',
                                                        borderRadius: 'var(--radius-md)',
                                                        background: 'var(--surface-elevated)',
                                                        border: '1px solid var(--border)',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8125rem'
                                                    }}
                                                >
                                                    <span style={{ fontWeight: 600 }}>{p.title || p.name}</span>
                                                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                                                        ₦{(Number(p.price) || 0).toLocaleString()}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Star Rating Selector (for reviews) */}
                            {activeType === 'review' && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                        Rating (1 to 5 Stars)
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setRating(star)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    padding: '2px',
                                                    color: star <= rating ? '#F59E0B' : 'var(--border)',
                                                    transition: 'transform 0.1s'
                                                }}
                                            >
                                                <Star size={24} fill={star <= rating ? '#F59E0B' : 'none'} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Main Content Textarea */}
                    <div>
                        <textarea
                            placeholder={
                                activeType === 'confession' ? "Confess something funny, real, or secret from your campus life..." :
                                activeType === 'hot_take' ? "Explain your hot take or stir up the debate..." :
                                activeType === 'review' ? "Drop your honest or funny product review (e.g. 'Bought this perfume. Even my landlord now greets me with respect.')..." :
                                activeType === 'poll' ? "Additional context or debate details (optional)..." :
                                "What's happening on campus today? Spill the gist..."
                            }
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            rows={4}
                            maxLength={1000}
                            style={{ width: '100%', fontSize: '0.875rem', resize: 'vertical' }}
                        />
                        <div style={{ textAlign: 'right', fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                            {content.length}/1000
                        </div>
                    </div>

                    {/* Image Attachment Preview */}
                    {imagePreview && (
                        <div style={{
                            position: 'relative',
                            borderRadius: 'var(--radius-lg)',
                            overflow: 'hidden',
                            border: '1px solid var(--border)',
                            maxHeight: '220px'
                        }}>
                            <img
                                src={imagePreview}
                                alt="Attachment preview"
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                            <button
                                type="button"
                                onClick={removeImage}
                                style={{
                                    position: 'absolute',
                                    top: '8px',
                                    right: '8px',
                                    background: 'rgba(0,0,0,0.65)',
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: '28px',
                                    height: '28px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    {/* Bottom Actions Bar */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '0.5rem',
                        borderTop: '1px solid var(--border)',
                        flexWrap: 'wrap',
                        gap: '0.5rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {/* Image file button */}
                            <label style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                cursor: 'pointer',
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                color: 'var(--primary)',
                                padding: '0.4rem 0.65rem',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--surface)'
                            }}>
                                <ImageIcon size={17} />
                                <span>{imageFile ? 'Change Photo' : 'Photo'}</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    style={{ display: 'none' }}
                                />
                            </label>

                            {/* Tag a Product button (for non-review posts) */}
                            {activeType !== 'review' && !showProductPicker && (
                                <button
                                    type="button"
                                    onClick={() => setShowProductPicker(true)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        cursor: 'pointer',
                                        fontSize: '0.8125rem',
                                        fontWeight: 600,
                                        color: '#d97706',
                                        padding: '0.4rem 0.65rem',
                                        borderRadius: 'var(--radius-md)',
                                        background: 'rgba(245, 158, 11, 0.1)',
                                        border: 'none'
                                    }}
                                >
                                    <Tag size={15} />
                                    <span>Tag Product</span>
                                </button>
                            )}
                        </div>

                        {/* Submit Button */}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                                disabled={submitting}
                                className="btn btn-primary"
                                style={{
                                    fontSize: '0.8125rem',
                                    padding: '0.45rem 1.25rem',
                                    borderRadius: 'var(--radius-full)'
                                }}
                            >
                                {submitting ? 'Posting...' : 'Post Gist'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
