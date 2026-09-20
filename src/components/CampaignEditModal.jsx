import { useState, useEffect } from 'react';
import { X, Save, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { saveCampaignToFirestore } from '../utils/campaignService';

const AVAILABLE_CATEGORIES = [
    'Fashion',
    'Electronics',
    'Home & Kitchen',
    'Health & Beauty',
    'Food & Groceries',
    'Services',
    'Hostels & Rooms',
    'Books & Stationery'
];

const CampaignEditModal = ({ isOpen, onClose, currentCampaign }) => {
    const [formData, setFormData] = useState({
        title: '',
        subtitle: '',
        badgeText: '',
        ctaText: '',
        ctaTarget: 'resumption',
        active: true,
        priority: 10,
        targetCategories: ['Fashion', 'Electronics', 'Home & Kitchen'],
        bannerImageUrl: '',
        startDate: '',
        endDate: ''
    });

    const [saving, setSaving] = useState(false);
    const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

    useEffect(() => {
        if (currentCampaign) {
            setFormData({
                id: currentCampaign.id || 'resumption-campaign',
                title: currentCampaign.title || '',
                subtitle: currentCampaign.subtitle || '',
                badgeText: currentCampaign.badgeText || '',
                ctaText: currentCampaign.ctaText || '',
                ctaTarget: currentCampaign.ctaTarget || 'resumption',
                active: currentCampaign.active !== false,
                priority: currentCampaign.priority ?? 10,
                targetCategories: currentCampaign.targetCategories || ['Fashion', 'Electronics', 'Home & Kitchen'],
                bannerImageUrl: currentCampaign.bannerImageUrl || '',
                startDate: currentCampaign.startDate || '',
                endDate: currentCampaign.endDate || ''
            });
        }
    }, [currentCampaign]);

    if (!isOpen) return null;

    const handleCategoryToggle = (cat) => {
        setFormData(prev => {
            const exists = prev.targetCategories.includes(cat);
            return {
                ...prev,
                targetCategories: exists
                    ? prev.targetCategories.filter(c => c !== cat)
                    : [...prev.targetCategories, cat]
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setStatusMsg({ type: '', text: '' });

        try {
            await saveCampaignToFirestore(formData);
            setStatusMsg({ type: 'success', text: 'Campaign updated live in Firestore!' });
            setTimeout(() => {
                onClose();
            }, 1200);
        } catch (err) {
            console.error('Error saving campaign:', err);
            setStatusMsg({
                type: 'error',
                text: err.message || 'Failed to update campaign. Make sure you are logged in as an admin.'
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="campaign-modal-backdrop" onClick={onClose}>
            <div
                className="campaign-modal-card card animate-fade-in-up"
                onClick={e => e.stopPropagation()}
            >
                <div className="campaign-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Sparkles size={18} className="text-primary" />
                        <h2 className="campaign-modal-title">Edit Homepage Campaign</h2>
                    </div>
                    <button onClick={onClose} className="campaign-modal-close" aria-label="Close modal">
                        <X size={20} />
                    </button>
                </div>

                {statusMsg.text && (
                    <div className={`campaign-status-banner campaign-status--${statusMsg.type}`}>
                        {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        <span>{statusMsg.text}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="campaign-form">
                    {/* Active Status */}
                    <div className="campaign-field-row">
                        <label className="campaign-switch-label">
                            <input
                                type="checkbox"
                                checked={formData.active}
                                onChange={e => setFormData({ ...formData, active: e.target.checked })}
                                className="campaign-checkbox"
                            />
                            <span className="campaign-switch-text">
                                Campaign Active (visible on homepage)
                            </span>
                        </label>
                    </div>

                    {/* Title */}
                    <div className="form-group">
                        <label htmlFor="camp-title">Campaign Headline</label>
                        <input
                            id="camp-title"
                            type="text"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., BACK TO CAMPUS, NEW DROPS, FRESHERS' PICKS"
                            required
                        />
                    </div>

                    {/* Subtitle */}
                    <div className="form-group">
                        <label htmlFor="camp-subtitle">Supporting Subtitle</label>
                        <input
                            id="camp-subtitle"
                            type="text"
                            value={formData.subtitle}
                            onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                            placeholder="e.g., New semester? Find the things you actually need."
                            required
                        />
                    </div>

                    {/* Badge Text & Priority */}
                    <div className="campaign-grid-2">
                        <div className="form-group">
                            <label htmlFor="camp-badge">Tag / Badge Text</label>
                            <input
                                id="camp-badge"
                                type="text"
                                value={formData.badgeText}
                                onChange={e => setFormData({ ...formData, badgeText: e.target.value })}
                                placeholder="e.g., CAMPUS RESUMPTION"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="camp-priority">Priority (Higher = Displayed First)</label>
                            <input
                                id="camp-priority"
                                type="number"
                                value={formData.priority}
                                onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value, 10) || 0 })}
                            />
                        </div>
                    </div>

                    {/* CTA Text & Target */}
                    <div className="campaign-grid-2">
                        <div className="form-group">
                            <label htmlFor="camp-cta">CTA Button Text</label>
                            <input
                                id="camp-cta"
                                type="text"
                                value={formData.ctaText}
                                onChange={e => setFormData({ ...formData, ctaText: e.target.value })}
                                placeholder="e.g., Shop Resumption Essentials"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="camp-target">CTA Destination</label>
                            <select
                                id="camp-target"
                                value={formData.ctaTarget}
                                onChange={e => setFormData({ ...formData, ctaTarget: e.target.value })}
                            >
                                <option value="resumption">Resumption Discovery</option>
                                <option value="Fashion">Fashion Category</option>
                                <option value="Electronics">Tech / Electronics</option>
                                <option value="Home & Kitchen">Hostel & Living</option>
                                <option value="all">All Products</option>
                            </select>
                        </div>
                    </div>

                    {/* Target Categories to feature */}
                    <div className="form-group">
                        <label>Target Categories (Used for dynamic product showcase)</label>
                        <div className="campaign-cat-chips">
                            {AVAILABLE_CATEGORIES.map(cat => {
                                const selected = formData.targetCategories.includes(cat);
                                return (
                                    <button
                                        type="button"
                                        key={cat}
                                        onClick={() => handleCategoryToggle(cat)}
                                        className={`campaign-cat-chip ${selected ? 'campaign-cat-chip--selected' : ''}`}
                                    >
                                        {cat}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Custom Image URL (Optional) */}
                    <div className="form-group">
                        <label htmlFor="camp-img">Custom Banner Image URL (Optional)</label>
                        <input
                            id="camp-img"
                            type="url"
                            value={formData.bannerImageUrl}
                            onChange={e => setFormData({ ...formData, bannerImageUrl: e.target.value })}
                            placeholder="Leave empty to dynamically feature real products"
                        />
                        <small style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                            If left blank, the banner automatically highlights real products from your selected categories.
                        </small>
                    </div>

                    {/* Start and End Date */}
                    <div className="campaign-grid-2">
                        <div className="form-group">
                            <label htmlFor="camp-start">Start Date (Optional)</label>
                            <input
                                id="camp-start"
                                type="date"
                                value={formData.startDate}
                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="camp-end">End Date (Optional)</label>
                            <input
                                id="camp-end"
                                type="date"
                                value={formData.endDate}
                                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="campaign-modal-actions">
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving} className="btn btn-primary">
                            <Save size={16} />
                            <span>{saving ? 'Saving...' : 'Save Campaign'}</span>
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                .campaign-modal-backdrop {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(15, 23, 42, 0.7);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    padding: 1.5rem;
                }

                .campaign-modal-card {
                    width: 100%;
                    max-width: 620px;
                    max-height: 90vh;
                    overflow-y: auto;
                    padding: 1.75rem;
                    background: var(--surface-elevated);
                    border: 1px solid var(--border);
                    box-shadow: var(--shadow-xl);
                }

                .campaign-modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 1.25rem;
                    padding-bottom: 0.75rem;
                    border-bottom: 1px solid var(--border);
                }

                .campaign-modal-title {
                    font-family: var(--font-display);
                    font-size: 1.25rem;
                    font-weight: 800;
                    margin: 0;
                }

                .campaign-modal-close {
                    color: var(--text-tertiary);
                    padding: 0.25rem;
                    border-radius: var(--radius-full);
                    transition: all 0.2s;
                }
                .campaign-modal-close:hover {
                    color: var(--text);
                    background: var(--surface);
                }

                .campaign-status-banner {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1rem;
                    border-radius: var(--radius-md);
                    margin-bottom: 1.25rem;
                    font-size: 0.85rem;
                    font-weight: 600;
                }

                .campaign-status--success {
                    background: rgba(16, 185, 129, 0.12);
                    color: var(--success);
                    border: 1px solid rgba(16, 185, 129, 0.3);
                }

                .campaign-status--error {
                    background: rgba(239, 68, 68, 0.12);
                    color: var(--danger);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                }

                .campaign-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1.15rem;
                }

                .campaign-grid-2 {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                }

                @media (max-width: 540px) {
                    .campaign-grid-2 {
                        grid-template-columns: 1fr;
                    }
                }

                .campaign-switch-label {
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                    cursor: pointer;
                    user-select: none;
                }

                .campaign-checkbox {
                    width: 18px;
                    height: 18px;
                    accent-color: var(--primary);
                    cursor: pointer;
                }

                .campaign-switch-text {
                    font-weight: 700;
                    font-size: 0.9rem;
                    color: var(--text);
                }

                .campaign-cat-chips {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.45rem;
                    margin-top: 0.4rem;
                }

                .campaign-cat-chip {
                    padding: 0.35rem 0.75rem;
                    border-radius: var(--radius-full);
                    border: 1.5px solid var(--border);
                    background: var(--surface);
                    color: var(--text-secondary);
                    font-size: 0.775rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .campaign-cat-chip:hover {
                    border-color: var(--primary);
                    color: var(--primary);
                }

                .campaign-cat-chip--selected {
                    background: var(--primary-light);
                    border-color: var(--primary);
                    color: var(--primary);
                    font-weight: 700;
                }

                .campaign-modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.75rem;
                    margin-top: 0.5rem;
                    padding-top: 1rem;
                    border-top: 1px solid var(--border);
                }
            `}</style>
        </div>
    );
};

export default CampaignEditModal;
