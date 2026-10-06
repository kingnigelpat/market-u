import { useState, useEffect, useRef } from 'react';
import { INSTITUTIONS, POPULAR_SCHOOLS, searchInstitutions, DEFAULT_CAMPUS } from '../data/institutions';
import { GraduationCap, ChevronDown, Search, X, Check, Globe, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const CampusSwitcher = ({ selectedCampus, onSelectCampus, showDirectoryLink = true }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('All'); // 'All' | 'University' | 'Polytechnic'
    const modalRef = useRef(null);
    const inputRef = useRef(null);

    const handleCloseModal = () => {
        setOpen(false);
        setSearch('');
        setTypeFilter('All');
    };

    // Auto-focus search input when opened
    useEffect(() => {
        if (open) {
            const timer = setTimeout(() => inputRef.current?.focus(), 150);
            return () => clearTimeout(timer);
        }
    }, [open]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (modalRef.current && !modalRef.current.contains(e.target)) {
                handleCloseModal();
            }
        };
        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [open]);

    const filteredInstitutions = searchInstitutions(search).filter(inst => {
        if (typeFilter === 'All') return true;
        return inst.type === typeFilter;
    });

    const handleSelect = (campusName) => {
        onSelectCampus(campusName);
        handleCloseModal();
    };

    const isAllCampuses = !selectedCampus || selectedCampus === DEFAULT_CAMPUS;

    return (
        <div className="campus-switcher-root">
            {/* Trigger Pill */}
            <div className="campus-switcher-bar">
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="campus-switcher-pill"
                    title="Change campus marketplace"
                >
                    <div className="campus-switcher-pill-icon">
                        {isAllCampuses ? <Globe size={15} /> : <GraduationCap size={15} />}
                    </div>
                    <div className="campus-switcher-pill-text">
                        <span className="campus-label-sub">Campus</span>
                        <span className="campus-label-title">
                            {isAllCampuses ? 'All Campuses (Universal)' : selectedCampus}
                        </span>
                    </div>
                    <ChevronDown size={14} className="campus-switcher-chevron" />
                </button>

                {showDirectoryLink && (
                    <Link to="/schools" className="campus-hub-link">
                        <Sparkles size={13} />
                        <span>Schools Directory</span>
                    </Link>
                )}
            </div>

            {/* Modal */}
            {open && (
                <div className="campus-modal-overlay animate-fade-in">
                    <div className="campus-modal-card" ref={modalRef}>
                        {/* Header */}
                        <div className="campus-modal-header">
                            <div>
                                <h3 className="campus-modal-title">Select Your Campus</h3>
                                <p className="campus-modal-desc">
                                    Shop listings & connect with student sellers at your institution
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="campus-modal-close"
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="campus-search-box">
                            <Search size={16} className="campus-search-icon" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search school name or acronym (UNILAG, UNIBEN, DELSU)..."
                                className="campus-search-input"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="campus-search-clear"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Type Filters */}
                        <div className="campus-type-tabs">
                            {['All', 'University', 'Polytechnic'].map((tab) => (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => setTypeFilter(tab)}
                                    className={`campus-type-tab ${typeFilter === tab ? 'active' : ''}`}
                                >
                                    {tab === 'All' ? 'All Institutions' : `${tab}s`}
                                </button>
                            ))}
                        </div>

                        {/* Quick Universal All-Campuses Option */}
                        <div style={{ padding: '0.5rem 1.25rem 0' }}>
                            <button
                                type="button"
                                onClick={() => handleSelect(DEFAULT_CAMPUS)}
                                className={`campus-quick-card ${isAllCampuses ? 'active' : ''}`}
                            >
                                <div className="campus-quick-icon">
                                    <Globe size={18} />
                                </div>
                                <div style={{ flex: 1, textAlign: 'left' }}>
                                    <div style={{ fontWeight: '800', fontSize: '0.9375rem', color: 'var(--text)' }}>
                                        All Campuses (Universal Market)
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                        View every deal across all universities & polytechnics
                                    </div>
                                </div>
                                {isAllCampuses && <Check size={18} color="var(--primary)" />}
                            </button>
                        </div>

                        {/* Popular Quick Pills (if not searching) */}
                        {!search && (
                            <div className="campus-popular-section">
                                <span className="campus-popular-label">Popular Hubs:</span>
                                <div className="campus-popular-chips">
                                    {POPULAR_SCHOOLS.slice(0, 6).map((sch) => {
                                        const inst = INSTITUTIONS.find(i => i.name === sch);
                                        const label = inst?.short || sch.split(' ')[0];
                                        const isSelected = selectedCampus === sch;
                                        return (
                                            <button
                                                key={sch}
                                                type="button"
                                                onClick={() => handleSelect(sch)}
                                                className={`campus-chip ${isSelected ? 'active' : ''}`}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Institution Scroll List */}
                        <div className="campus-list-wrap">
                            {filteredInstitutions.length === 0 ? (
                                <div className="campus-empty-state">
                                    <p style={{ fontWeight: '700', marginBottom: '0.25rem' }}>No school found</p>
                                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                        Try searching with a shorter name or common abbreviation
                                    </p>
                                </div>
                            ) : (
                                filteredInstitutions.map((inst) => {
                                    const isSelected = selectedCampus === inst.name;
                                    return (
                                        <button
                                            key={inst.name}
                                            type="button"
                                            onClick={() => handleSelect(inst.name)}
                                            className={`campus-list-row ${isSelected ? 'active' : ''}`}
                                        >
                                            <div className="campus-row-icon">
                                                <GraduationCap size={16} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                                <div className="campus-row-title">
                                                    <span>{inst.name}</span>
                                                    {inst.short && (
                                                        <span className="campus-row-short">({inst.short})</span>
                                                    )}
                                                </div>
                                                <div className="campus-row-meta">
                                                    <span>{inst.category}</span>
                                                </div>
                                            </div>
                                            {isSelected ? (
                                                <div className="campus-selected-check">
                                                    <Check size={16} />
                                                </div>
                                            ) : (
                                                <span className="campus-select-btn">Select</span>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        <div className="campus-modal-footer">
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                Covering 220+ Nigerian institutions
                            </span>
                            <Link
                                to="/schools"
                                onClick={() => setOpen(false)}
                                className="campus-view-all-link"
                            >
                                Open Schools Dashboard →
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .campus-switcher-root {
                    margin-bottom: 1rem;
                }

                .campus-switcher-bar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 0.75rem;
                    flex-wrap: wrap;
                }

                .campus-switcher-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.65rem;
                    padding: 0.45rem 0.875rem 0.45rem 0.55rem;
                    background: var(--surface-elevated);
                    border: 1.5px solid var(--border);
                    border-radius: var(--radius-full);
                    cursor: pointer;
                    transition: all 0.2s ease;
                    box-shadow: var(--shadow-xs);
                    text-align: left;
                }

                .campus-switcher-pill:hover {
                    border-color: var(--primary);
                    background: var(--surface);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
                }

                .campus-switcher-pill-icon {
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    background: var(--primary-light);
                    color: var(--primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .campus-switcher-pill-text {
                    display: flex;
                    flex-direction: column;
                    line-height: 1.1;
                }

                .campus-label-sub {
                    font-size: 0.65rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--text-secondary);
                }

                .campus-label-title {
                    font-size: 0.875rem;
                    font-weight: 800;
                    color: var(--text);
                    max-width: 220px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .campus-switcher-chevron {
                    color: var(--text-secondary);
                    margin-left: 0.25rem;
                    flex-shrink: 0;
                }

                .campus-hub-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    font-size: 0.8125rem;
                    font-weight: 700;
                    color: var(--primary);
                    padding: 0.45rem 0.875rem;
                    border-radius: var(--radius-full);
                    background: var(--primary-light);
                    text-decoration: none;
                    transition: all 0.2s ease;
                }

                .campus-hub-link:hover {
                    background: var(--primary);
                    color: white;
                }

                .campus-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(15, 23, 42, 0.65);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    z-index: 2000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1rem;
                }

                .campus-modal-card {
                    width: 100%;
                    max-width: 580px;
                    max-height: 88vh;
                    background: var(--surface-elevated);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-2xl);
                    box-shadow: var(--shadow-2xl);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    animation: zoomIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .campus-modal-header {
                    padding: 1.25rem 1.5rem;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                }

                .campus-modal-title {
                    font-size: 1.25rem;
                    font-weight: 900;
                    letter-spacing: -0.02em;
                    margin: 0 0 0.25rem 0;
                    color: var(--text);
                }

                .campus-modal-desc {
                    margin: 0;
                    font-size: 0.8125rem;
                    color: var(--text-secondary);
                }

                .campus-modal-close {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    padding: 0.25rem;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .campus-modal-close:hover {
                    color: var(--text);
                    background: var(--surface);
                }

                .campus-search-box {
                    position: relative;
                    padding: 1rem 1.25rem 0.5rem;
                }

                .campus-search-input {
                    width: 100%;
                    padding: 0.75rem 2.5rem 0.75rem 2.75rem;
                    border-radius: var(--radius-xl);
                    border: 1.5px solid var(--border);
                    background: var(--bg);
                    color: var(--text);
                    font-size: 0.9375rem;
                    outline: none;
                    box-sizing: border-box;
                    transition: border-color 0.2s;
                }

                .campus-search-input:focus {
                    border-color: var(--primary);
                }

                .campus-search-icon {
                    position: absolute;
                    left: 2.1rem;
                    top: 50%;
                    transform: translateY(-20%);
                    color: var(--text-secondary);
                }

                .campus-search-clear {
                    position: absolute;
                    right: 2.1rem;
                    top: 50%;
                    transform: translateY(-20%);
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    padding: 0.2rem;
                }

                .campus-type-tabs {
                    display: flex;
                    gap: 0.5rem;
                    padding: 0.25rem 1.25rem 0.5rem;
                }

                .campus-type-tab {
                    padding: 0.35rem 0.75rem;
                    border-radius: var(--radius-full);
                    border: 1px solid var(--border);
                    background: var(--surface);
                    color: var(--text-secondary);
                    font-size: 0.75rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .campus-type-tab.active {
                    background: var(--primary);
                    color: white;
                    border-color: var(--primary);
                }

                .campus-quick-card {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem 1rem;
                    border-radius: var(--radius-lg);
                    border: 1.5px solid var(--border);
                    background: var(--surface);
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .campus-quick-card:hover {
                    border-color: var(--primary);
                    background: var(--primary-light);
                }

                .campus-quick-card.active {
                    border-color: var(--primary);
                    background: var(--primary-light);
                }

                .campus-quick-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: var(--surface-elevated);
                    color: var(--primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .campus-popular-section {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1.25rem;
                    overflow-x: auto;
                    white-space: nowrap;
                }

                .campus-popular-label {
                    font-size: 0.72rem;
                    font-weight: 800;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    flex-shrink: 0;
                }

                .campus-popular-chips {
                    display: flex;
                    gap: 0.35rem;
                }

                .campus-chip {
                    padding: 0.25rem 0.6rem;
                    border-radius: var(--radius-full);
                    border: 1px solid var(--border);
                    background: var(--surface);
                    color: var(--text);
                    font-size: 0.75rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.15s;
                }

                .campus-chip:hover {
                    border-color: var(--primary);
                    color: var(--primary);
                }

                .campus-chip.active {
                    background: var(--primary);
                    color: white;
                    border-color: var(--primary);
                }

                .campus-list-wrap {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0.5rem 1.25rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.4rem;
                }

                .campus-list-row {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem 0.875rem;
                    border-radius: var(--radius-lg);
                    border: 1px solid transparent;
                    background: var(--bg);
                    cursor: pointer;
                    transition: all 0.15s;
                    width: 100%;
                }

                .campus-list-row:hover {
                    background: var(--surface);
                    border-color: var(--border);
                }

                .campus-list-row.active {
                    background: var(--primary-light);
                    border-color: rgba(37, 99, 235, 0.3);
                }

                .campus-row-icon {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    background: var(--surface-elevated);
                    color: var(--text-secondary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .campus-list-row.active .campus-row-icon {
                    color: var(--primary);
                    background: var(--surface-elevated);
                }

                .campus-row-title {
                    font-size: 0.875rem;
                    font-weight: 700;
                    color: var(--text);
                    display: flex;
                    align-items: center;
                    gap: 0.35rem;
                    flex-wrap: wrap;
                }

                .campus-row-short {
                    font-size: 0.75rem;
                    color: var(--primary);
                    font-weight: 800;
                }

                .campus-row-meta {
                    font-size: 0.72rem;
                    color: var(--text-secondary);
                    margin-top: 0.15rem;
                }

                .campus-selected-check {
                    color: var(--primary);
                    padding: 0.25rem;
                }

                .campus-select-btn {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: var(--text-secondary);
                    padding: 0.25rem 0.6rem;
                    border-radius: var(--radius-full);
                    background: var(--surface-elevated);
                    border: 1px solid var(--border);
                }

                .campus-empty-state {
                    padding: 3rem 1rem;
                    text-align: center;
                    color: var(--text);
                }

                .campus-modal-footer {
                    padding: 0.875rem 1.5rem;
                    border-top: 1px solid var(--border);
                    background: var(--surface);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .campus-view-all-link {
                    font-size: 0.8125rem;
                    font-weight: 800;
                    color: var(--primary);
                    text-decoration: none;
                }

                .campus-view-all-link:hover {
                    text-decoration: underline;
                }

                @keyframes zoomIn {
                    from { opacity: 0; transform: scale(0.96); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default CampusSwitcher;
