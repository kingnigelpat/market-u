import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import {
    Megaphone, Upload, Store, Package, Globe, CheckCircle2, Copy, MessageCircle,
    Eye, MousePointerClick, Clock, Image as ImageIcon, Sparkles, ShieldCheck, Target, X
} from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { uploadImageToCloudinary, optimizeImage } from '../utils/cloudinary';
import { createAd, subscribeToMyAds, updateAdPaymentRef, getEffectiveStatus, getDaysLeft } from '../utils/adService';
import { SUPPORTED_SCHOOL } from '../data/institutions';
import {
    AD_PRICE_PER_WEEK, AD_MAX_WEEKS, AD_MAX_IMAGE_BYTES, AD_ALLOWED_IMAGE_TYPES,
    AD_RECOMMENDED_SIZE, AD_BANK_DETAILS, hasBankDetails, SUPPORT_WHATSAPP, formatNaira
} from '../config/ads';

const STATUS_META = {
    pending_payment: { label: 'Awaiting payment', color: '#F59E0B' },
    active: { label: 'Live', color: '#10B981' },
    expired: { label: 'Ended', color: '#64748B' },
    rejected: { label: 'Rejected', color: '#EF4444' },
};

const whatsappLink = (ad) => {
    const msg = `Hi MarketU 👋 I just booked a banner ad.\n\nAd ID: ${ad.id}\nTitle: ${ad.title}\nDuration: ${ad.weeks} week(s)\nAmount: ${formatNaira(ad.amount)}\n\nHere is my payment proof:`;
    return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(msg)}`;
};

const Advertise = () => {
    const { currentUser, isAuthenticated, isSeller, userName, userSchoolName } = useAuth();
    const schoolName = userSchoolName || SUPPORTED_SCHOOL;

    const [advertiserType, setAdvertiserType] = useState(isSeller ? 'seller' : 'business');
    const [advertiserName, setAdvertiserName] = useState('');
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [linkType, setLinkType] = useState(isSeller ? 'store' : 'external');
    const [productId, setProductId] = useState('');
    const [externalUrl, setExternalUrl] = useState('');
    const [weeks, setWeeks] = useState(1);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [myProducts, setMyProducts] = useState([]);
    const [myAds, setMyAds] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [justCreated, setJustCreated] = useState(null);
    const [copied, setCopied] = useState(false);
    const fileRef = useRef(null);

    useEffect(() => {
        if (userName && !advertiserName) setAdvertiserName(userName);
    }, [userName]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!currentUser) return;
        return subscribeToMyAds(currentUser.uid, setMyAds);
    }, [currentUser]);

    useEffect(() => {
        if (!currentUser || !isSeller) return;
        getDocs(query(collection(db, 'products'), where('sellerId', '==', currentUser.uid)))
            .then((snap) => setMyProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
            .catch(() => setMyProducts([]));
    }, [currentUser, isSeller]);

    useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); }, [imagePreview]);

    const total = weeks * AD_PRICE_PER_WEEK;

    const handleFile = (file) => {
        setError('');
        if (!file) return;
        if (!AD_ALLOWED_IMAGE_TYPES.includes(file.type)) return setError('Please upload a JPG, PNG or WebP image.');
        if (file.size > AD_MAX_IMAGE_BYTES) return setError('Image must be 2 MB or smaller.');
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const resolveLink = () => {
        if (linkType === 'store') return `/seller/${currentUser.uid}`;
        if (linkType === 'product') return productId ? `/product/${productId}` : '';
        return externalUrl.trim();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const linkUrl = resolveLink();
        if (!imageFile) return setError('Please upload a banner image.');
        if (!advertiserName.trim()) return setError('Please enter the store or business name.');
        if (!title.trim()) return setError('Please add a headline.');
        if (linkType === 'product' && !linkUrl) return setError('Please pick the product to promote.');
        if (linkType === 'external' && !/^https:\/\/[^\s]+\.[^\s]+/i.test(linkUrl)) {
            return setError('Website link must start with https://');
        }

        setSubmitting(true);
        try {
            const imageUrl = await uploadImageToCloudinary(imageFile);
            const id = await createAd({
                ownerId: currentUser.uid,
                advertiserName,
                advertiserType,
                title,
                subtitle,
                imageUrl,
                linkType,
                linkUrl,
                schoolName,
                weeks,
            });
            setJustCreated({ id, title: title.trim(), weeks, amount: total });
            setTitle(''); setSubtitle(''); setExternalUrl(''); setProductId('');
            setImageFile(null); setImagePreview(''); setWeeks(1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error('Ad submit failed:', err);
            setError('Something went wrong while submitting your ad. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const copyAccount = async () => {
        try {
            await navigator.clipboard.writeText(AD_BANK_DETAILS.accountNumber);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (_) { /* ignore */ }
    };

    const PaymentBox = ({ ad }) => (
        <div className="adv-pay">
            <div className="adv-pay-amount">
                <span>Amount to pay</span>
                <strong>{formatNaira(ad.amount)}</strong>
                <small>{ad.weeks} week{ad.weeks > 1 ? 's' : ''} · Ad ID <code>{ad.id.slice(0, 8)}</code></small>
            </div>
            {hasBankDetails() ? (
                <div className="adv-bank">
                    <div><span>Bank</span><strong>{AD_BANK_DETAILS.bankName}</strong></div>
                    <div>
                        <span>Account number</span>
                        <strong className="adv-acct">
                            {AD_BANK_DETAILS.accountNumber}
                            <button type="button" onClick={copyAccount} className="adv-copy" aria-label="Copy account number">
                                {copied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                            </button>
                        </strong>
                    </div>
                    <div><span>Account name</span><strong>{AD_BANK_DETAILS.accountName}</strong></div>
                </div>
            ) : (
                <p className="adv-muted">Tap the button below and we'll send you payment details on WhatsApp.</p>
            )}
            <a href={whatsappLink(ad)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp adv-wa" id={`ad-whatsapp-${ad.id}`}>
                <MessageCircle size={18} /> I've paid – send proof on WhatsApp
            </a>
            <p className="adv-muted adv-small">Your banner goes live as soon as we confirm payment (usually within a few hours).</p>
        </div>
    );

    return (
        <div className="adv-page">
            {/* ── Hero ── */}
            <section className="adv-hero">
                <div className="container adv-hero-inner">
                    <span className="adv-chip"><Sparkles size={13} /> MarketU Ads</span>
                    <h1 className="adv-h1">Put your brand on the <span>campus homepage</span></h1>
                    <p className="adv-lead">
                        Posting and verification on MarketU are <strong>100% free</strong>. Want more eyes?
                        Run a banner ad seen by every student who opens the market.
                    </p>
                    <div className="adv-price-card">
                        <div className="adv-price">{formatNaira(AD_PRICE_PER_WEEK)}<span>/week</span></div>
                        <ul>
                            <li><Target size={15} /> Shown to students at {schoolName}</li>
                            <li><Eye size={15} /> Track views &amp; clicks</li>
                            <li><ShieldCheck size={15} /> Reviewed before going live</li>
                        </ul>
                    </div>
                </div>
            </section>

            <div className="container adv-body">
                {!isAuthenticated ? (
                    <div className="adv-card adv-auth">
                        <Megaphone size={36} />
                        <h2>Create a free account to advertise</h2>
                        <p className="adv-muted">Students, sellers and local businesses can all run ads. It takes less than a minute.</p>
                        <div className="adv-auth-actions">
                            <Link to="/register" className="btn btn-primary" id="advertise-register">Create account</Link>
                            <Link to="/login" className="btn btn-secondary" id="advertise-login">Log in</Link>
                        </div>
                    </div>
                ) : (
                    <>
                        {justCreated && (
                            <div className="adv-card adv-success">
                                <button className="adv-close" onClick={() => setJustCreated(null)} aria-label="Dismiss"><X size={18} /></button>
                                <div className="adv-success-head">
                                    <CheckCircle2 size={26} />
                                    <div>
                                        <h2>Ad submitted! One last step 🎉</h2>
                                        <p className="adv-muted">Pay to get "{justCreated.title}" live on the homepage.</p>
                                    </div>
                                </div>
                                <PaymentBox ad={justCreated} />
                            </div>
                        )}

                        <div className="adv-grid">
                            {/* ── Form ── */}
                            <form className="adv-card adv-form" onSubmit={handleSubmit} noValidate>
                                <h2 className="adv-h2">Create your banner</h2>

                                <label className="adv-label">Who's advertising?</label>
                                <div className="adv-seg">
                                    {isSeller && (
                                        <button type="button" id="adv-type-seller"
                                            className={advertiserType === 'seller' ? 'is-active' : ''}
                                            onClick={() => { setAdvertiserType('seller'); setLinkType('store'); }}>
                                            <Store size={15} /> My MarketU store
                                        </button>
                                    )}
                                    <button type="button" id="adv-type-business"
                                        className={advertiserType === 'business' ? 'is-active' : ''}
                                        onClick={() => { setAdvertiserType('business'); setLinkType('external'); }}>
                                        <Globe size={15} /> A business / brand
                                    </button>
                                </div>

                                <label className="adv-label" htmlFor="adv-name">
                                    {advertiserType === 'seller' ? 'Store name' : 'Business name'}
                                </label>
                                <input id="adv-name" value={advertiserName} maxLength={40}
                                    onChange={(e) => setAdvertiserName(e.target.value)} placeholder="e.g. Tolu's Kicks" />

                                <label className="adv-label">Banner image <span className="adv-hint">({AD_RECOMMENDED_SIZE}, max 2 MB)</span></label>
                                <div
                                    className={`adv-drop ${imagePreview ? 'has-img' : ''}`}
                                    onClick={() => fileRef.current?.click()}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
                                    role="button" tabIndex={0} id="adv-image-drop"
                                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileRef.current?.click()}
                                >
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Banner preview" />
                                    ) : (
                                        <div className="adv-drop-empty">
                                            <Upload size={22} />
                                            <span>Click or drop an image</span>
                                        </div>
                                    )}
                                    <input ref={fileRef} type="file" accept={AD_ALLOWED_IMAGE_TYPES.join(',')} hidden
                                        onChange={(e) => handleFile(e.target.files?.[0])} />
                                </div>

                                <label className="adv-label" htmlFor="adv-title">Headline</label>
                                <input id="adv-title" value={title} maxLength={50}
                                    onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Fresh sneakers just landed 🔥" />

                                <label className="adv-label" htmlFor="adv-sub">Short description <span className="adv-hint">(optional)</span></label>
                                <input id="adv-sub" value={subtitle} maxLength={90}
                                    onChange={(e) => setSubtitle(e.target.value)} placeholder="e.g. 10% off for students this week" />

                                <label className="adv-label">Where should the banner link to?</label>
                                <div className="adv-seg">
                                    {advertiserType === 'seller' && (
                                        <>
                                            <button type="button" id="adv-link-store" className={linkType === 'store' ? 'is-active' : ''} onClick={() => setLinkType('store')}>
                                                <Store size={15} /> My store
                                            </button>
                                            <button type="button" id="adv-link-product" className={linkType === 'product' ? 'is-active' : ''} onClick={() => setLinkType('product')}>
                                                <Package size={15} /> A product
                                            </button>
                                        </>
                                    )}
                                    <button type="button" id="adv-link-external" className={linkType === 'external' ? 'is-active' : ''} onClick={() => setLinkType('external')}>
                                        <Globe size={15} /> Website
                                    </button>
                                </div>
                                {linkType === 'product' && (
                                    <select id="adv-product" value={productId} onChange={(e) => setProductId(e.target.value)}>
                                        <option value="">{myProducts.length ? 'Select a product…' : 'You have no products yet'}</option>
                                        {myProducts.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                                    </select>
                                )}
                                {linkType === 'external' && (
                                    <input id="adv-url" type="url" value={externalUrl}
                                        onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://your-site.com" />
                                )}

                                <label className="adv-label">How long?</label>
                                <div className="adv-weeks">
                                    {Array.from({ length: AD_MAX_WEEKS }, (_, i) => i + 1).map((w) => (
                                        <button type="button" key={w} id={`adv-weeks-${w}`}
                                            className={weeks === w ? 'is-active' : ''} onClick={() => setWeeks(w)}>
                                            <strong>{w} wk{w > 1 ? 's' : ''}</strong>
                                            <span>{formatNaira(w * AD_PRICE_PER_WEEK)}</span>
                                        </button>
                                    ))}
                                </div>

                                {error && <div className="adv-error" role="alert">{error}</div>}

                                <button type="submit" className="btn btn-primary adv-submit" disabled={submitting} id="adv-submit">
                                    {submitting ? 'Submitting…' : <>Continue to payment · {formatNaira(total)}</>}
                                </button>
                            </form>

                            {/* ── Live preview ── */}
                            <aside className="adv-preview-col">
                                <p className="adv-label">Live preview</p>
                                <div className="adv-preview">
                                    {imagePreview
                                        ? <img src={imagePreview} alt="" />
                                        : <div className="adv-preview-ph"><ImageIcon size={28} /></div>}
                                    <div className="adv-preview-shade" />
                                    <span className="adv-preview-sp">Sponsored</span>
                                    <div className="adv-preview-body">
                                        <small>{advertiserName || 'Your brand'}</small>
                                        <strong>{title || 'Your headline here'}</strong>
                                        {subtitle && <span>{subtitle}</span>}
                                    </div>
                                </div>
                                <p className="adv-muted adv-small">
                                    Ads rotate in the homepage carousel for students at <strong>{schoolName}</strong>.
                                </p>
                            </aside>
                        </div>

                        {/* ── My ads ── */}
                        <section className="adv-card adv-mine">
                            <h2 className="adv-h2">My ads</h2>
                            {myAds.length === 0 ? (
                                <p className="adv-muted">You haven't booked any ads yet.</p>
                            ) : (
                                <div className="adv-list">
                                    {myAds.map((ad) => {
                                        const status = getEffectiveStatus(ad);
                                        const meta = STATUS_META[status];
                                        const days = getDaysLeft(ad);
                                        return (
                                            <div key={ad.id} className="adv-row">
                                                <img src={optimizeImage(ad.imageUrl, 240)} alt="" className="adv-row-img" />
                                                <div className="adv-row-main">
                                                    <div className="adv-row-top">
                                                        <strong>{ad.title}</strong>
                                                        <span className="adv-status" style={{ color: meta.color, background: `${meta.color}1F` }}>{meta.label}</span>
                                                    </div>
                                                    <div className="adv-row-stats">
                                                        <span>{formatNaira(ad.amount)} · {ad.weeks} wk{ad.weeks > 1 ? 's' : ''}</span>
                                                        <span><Eye size={13} /> {ad.impressions || 0}</span>
                                                        <span><MousePointerClick size={13} /> {ad.clicks || 0}</span>
                                                        {status === 'active' && days !== null && <span><Clock size={13} /> {days} day{days !== 1 ? 's' : ''} left</span>}
                                                    </div>
                                                    {status === 'rejected' && ad.rejectionReason && (
                                                        <p className="adv-reject">Reason: {ad.rejectionReason}</p>
                                                    )}
                                                    {status === 'pending_payment' && (
                                                        <div className="adv-row-pay">
                                                            <input
                                                                defaultValue={ad.paymentRef || ''}
                                                                placeholder="Transfer reference (optional)"
                                                                onBlur={(e) => e.target.value !== (ad.paymentRef || '') && updateAdPaymentRef(ad.id, e.target.value).catch(() => {})}
                                                                maxLength={60}
                                                            />
                                                            <a href={whatsappLink(ad)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp">
                                                                <MessageCircle size={15} /> Send proof
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </div>

            <style>{`
                .adv-page { padding-bottom: 4rem; }
                .adv-hero {
                    position: relative; overflow: hidden;
                    background: radial-gradient(1200px 400px at 85% -10%, rgba(245, 158, 11, 0.25), transparent 60%),
                                linear-gradient(135deg, #0B1B4D 0%, #1D4ED8 60%, #3B82F6 100%);
                    color: #fff;
                    padding: 3rem 0 4.5rem;
                }
                .adv-hero-inner { display: flex; flex-direction: column; align-items: flex-start; gap: 1rem; }
                .adv-chip {
                    display: inline-flex; align-items: center; gap: 0.35rem;
                    padding: 0.3rem 0.8rem; border-radius: var(--radius-full);
                    background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.25);
                    font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
                }
                .adv-h1 {
                    font-family: var(--font-display);
                    font-size: clamp(2rem, 5vw, 3.25rem); line-height: 1.04; letter-spacing: -0.03em;
                    max-width: 720px; margin: 0;
                }
                .adv-h1 span { background: linear-gradient(90deg, #FDE68A, #F59E0B); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
                .adv-lead { max-width: 560px; font-size: 1.05rem; line-height: 1.55; color: rgba(255,255,255,0.88); }
                .adv-price-card {
                    display: flex; flex-wrap: wrap; align-items: center; gap: 1.25rem 2rem;
                    margin-top: 0.5rem; padding: 1.1rem 1.5rem;
                    background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
                    border-radius: var(--radius-xl);
                    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
                }
                .adv-price { font-family: var(--font-display); font-size: 2.4rem; font-weight: 800; line-height: 1; }
                .adv-price span { font-size: 0.95rem; font-weight: 600; opacity: 0.8; margin-left: 0.2rem; }
                .adv-price-card ul { list-style: none; display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.875rem; }
                .adv-price-card li { display: flex; align-items: center; gap: 0.45rem; color: rgba(255,255,255,0.92); }

                .adv-body { margin-top: -2.5rem; position: relative; z-index: 2; display: flex; flex-direction: column; gap: 1.5rem; }
                .adv-card {
                    background: var(--surface-elevated); border: 1px solid var(--border);
                    border-radius: var(--radius-2xl); padding: 1.75rem; box-shadow: var(--shadow-md);
                }
                .adv-h2 { font-family: var(--font-display); font-size: 1.35rem; font-weight: 800; margin-bottom: 1rem; }
                .adv-muted { color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5; }
                .adv-small { font-size: 0.8rem; margin-top: 0.75rem; }
                .adv-auth { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 3rem 1.5rem; color: var(--primary); }
                .adv-auth h2 { color: var(--text); font-family: var(--font-display); font-size: 1.5rem; }
                .adv-auth-actions { display: flex; gap: 0.75rem; margin-top: 0.5rem; }

                .adv-grid { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 1.5rem; align-items: start; }
                .adv-form { display: flex; flex-direction: column; gap: 0.5rem; }
                .adv-form input, .adv-form select { width: 100%; }
                .adv-label { font-size: 0.8rem; font-weight: 700; color: var(--text); margin-top: 0.75rem; }
                .adv-hint { font-weight: 500; color: var(--text-tertiary); }
                .adv-seg { display: flex; flex-wrap: wrap; gap: 0.5rem; }
                .adv-seg button, .adv-weeks button {
                    display: inline-flex; align-items: center; gap: 0.4rem;
                    padding: 0.55rem 0.95rem; border-radius: var(--radius-md);
                    border: 1.5px solid var(--border); background: var(--surface);
                    font-size: 0.85rem; font-weight: 600; color: var(--text);
                    transition: all 0.2s;
                }
                .adv-seg button:hover, .adv-weeks button:hover { border-color: var(--primary); }
                .adv-seg button.is-active, .adv-weeks button.is-active {
                    border-color: var(--primary); background: var(--primary-light); color: var(--primary);
                    box-shadow: 0 0 0 3px var(--primary-light);
                }
                .adv-weeks { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; }
                .adv-weeks button { flex-direction: column; gap: 0.1rem; padding: 0.7rem 0.4rem; }
                .adv-weeks span { font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); }
                .adv-weeks button.is-active span { color: var(--primary); }

                .adv-drop {
                    position: relative; aspect-ratio: 3 / 1; width: 100%;
                    border: 2px dashed var(--border); border-radius: var(--radius-lg);
                    background: var(--surface); cursor: pointer; overflow: hidden;
                    display: flex; align-items: center; justify-content: center;
                    transition: border-color 0.2s, background 0.2s;
                }
                .adv-drop:hover { border-color: var(--primary); background: var(--primary-light); }
                .adv-drop.has-img { border-style: solid; }
                .adv-drop img { width: 100%; height: 100%; object-fit: cover; }
                .adv-drop-empty { display: flex; flex-direction: column; align-items: center; gap: 0.35rem; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600; }

                .adv-error { margin-top: 0.75rem; padding: 0.65rem 0.9rem; border-radius: var(--radius-md); background: rgba(239,68,68,0.1); color: var(--danger); font-size: 0.85rem; font-weight: 600; }
                .adv-submit { margin-top: 1.25rem; padding: 0.9rem 1.25rem; font-size: 0.95rem; }
                .adv-submit:disabled { opacity: 0.7; cursor: wait; transform: none; }

                .adv-preview-col { position: sticky; top: 90px; }
                .adv-preview {
                    position: relative; aspect-ratio: 3 / 1.35; border-radius: var(--radius-xl);
                    overflow: hidden; background: #0F172A; margin-top: 0.5rem; box-shadow: var(--shadow-lg);
                }
                .adv-preview img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
                .adv-preview-ph { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #334155; background: linear-gradient(135deg, #1E293B, #0F172A); }
                .adv-preview-shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(2,6,23,0.85), rgba(2,6,23,0.2) 70%); }
                .adv-preview-sp { position: absolute; top: 0.6rem; right: 0.6rem; font-size: 0.55rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #FDE68A; padding: 0.2rem 0.5rem; border-radius: var(--radius-full); background: rgba(15,23,42,0.6); border: 1px solid rgba(253,230,138,0.35); }
                .adv-preview-body { position: absolute; left: 1rem; top: 0; bottom: 0; right: 35%; display: flex; flex-direction: column; justify-content: center; gap: 0.2rem; color: #fff; }
                .adv-preview-body small { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.75; }
                .adv-preview-body strong { font-family: var(--font-display); font-size: 1.15rem; line-height: 1.1; }
                .adv-preview-body span { font-size: 0.72rem; opacity: 0.85; }

                .adv-success { position: relative; border-color: rgba(16,185,129,0.4); }
                .adv-success-head { display: flex; gap: 0.85rem; align-items: flex-start; color: var(--success); margin-bottom: 1.25rem; }
                .adv-success-head h2 { color: var(--text); font-family: var(--font-display); font-size: 1.3rem; }
                .adv-close { position: absolute; top: 1rem; right: 1rem; color: var(--text-secondary); }
                .adv-pay { display: grid; gap: 1rem; }
                .adv-pay-amount { display: flex; flex-direction: column; gap: 0.15rem; padding: 1rem 1.25rem; border-radius: var(--radius-lg); background: var(--gradient-primary); color: #fff; }
                .adv-pay-amount span { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.85; }
                .adv-pay-amount strong { font-family: var(--font-display); font-size: 2rem; line-height: 1.1; }
                .adv-pay-amount small { font-size: 0.78rem; opacity: 0.85; }
                .adv-pay-amount code { background: rgba(255,255,255,0.18); padding: 0.05rem 0.35rem; border-radius: 4px; }
                .adv-bank { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem; padding: 1rem 1.25rem; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--surface); }
                .adv-bank span { display: block; font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em; }
                .adv-bank strong { font-size: 1rem; }
                .adv-acct { display: inline-flex; align-items: center; gap: 0.4rem; font-variant-numeric: tabular-nums; }
                .adv-copy { color: var(--primary); display: inline-flex; }
                .adv-wa { justify-self: start; padding: 0.8rem 1.3rem; }

                .adv-list { display: flex; flex-direction: column; gap: 0.75rem; }
                .adv-row { display: flex; gap: 1rem; padding: 0.85rem; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--surface); }
                .adv-row-img { width: 120px; aspect-ratio: 3 / 1.4; object-fit: cover; border-radius: var(--radius-md); flex-shrink: 0; background: #0F172A; }
                .adv-row-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.4rem; }
                .adv-row-top { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
                .adv-row-top strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .adv-status { font-size: 0.7rem; font-weight: 800; padding: 0.2rem 0.6rem; border-radius: var(--radius-full); white-space: nowrap; }
                .adv-row-stats { display: flex; flex-wrap: wrap; gap: 0.35rem 1rem; font-size: 0.8rem; color: var(--text-secondary); }
                .adv-row-stats span { display: inline-flex; align-items: center; gap: 0.25rem; }
                .adv-reject { font-size: 0.8rem; color: var(--danger); }
                .adv-row-pay { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.25rem; }
                .adv-row-pay input { flex: 1; min-width: 160px; font-size: 0.85rem; padding: 0.45rem 0.7rem; }
                .adv-row-pay .btn { padding: 0.45rem 0.9rem; font-size: 0.8rem; }

                @media (max-width: 860px) {
                    .adv-grid { grid-template-columns: 1fr; }
                    .adv-preview-col { position: static; order: -1; }
                    .adv-card { padding: 1.25rem; }
                    .adv-hero { padding: 2rem 0 3.5rem; }
                    .adv-row-img { width: 84px; }
                }
            `}</style>
        </div>
    );
};

export default Advertise;
