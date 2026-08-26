import { useState, useRef, useEffect } from 'react';
import { INSTITUTIONS, SUPPORTED_SCHOOL } from '../data/institutions';

/**
 * SchoolSelector
 *
 * Searchable institution picker for the registration form.
 *
 * Props:
 *   value      – currently selected institution object (or null)
 *   onChange   – called with { name, type, supported } when user picks a school
 *   error      – optional validation error string to display
 */
const SchoolSelector = ({ value, onChange, error }) => {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Filter institutions based on search query
    const filtered = query.trim().length === 0
        ? INSTITUTIONS
        : INSTITUTIONS.filter(inst =>
            inst.name.toLowerCase().includes(query.toLowerCase())
        );

    const universities = filtered.filter(i => i.type === 'University');
    const polytechnics = filtered.filter(i => i.type === 'Polytechnic');

    // Close dropdown on outside click
    useEffect(() => {
        const handleOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    const handleSelect = (institution) => {
        onChange(institution);
        setOpen(false);
        setQuery('');
    };

    const handleInputChange = (e) => {
        setQuery(e.target.value);
        setOpen(true);
        // Clear current selection when user types again
        if (value) onChange(null);
    };

    const handleInputFocus = () => {
        setOpen(true);
    };

    const displayValue = value ? value.name : query;

    const hasResults = universities.length > 0 || polytechnics.length > 0;

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            {/* Input */}
            <div style={{ position: 'relative' }}>
                <input
                    ref={inputRef}
                    type="text"
                    id="school-search"
                    placeholder="Search for your university or polytechnic..."
                    value={displayValue}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    autoComplete="off"
                    style={{
                        width: '100%',
                        padding: '0.875rem 2.75rem 0.875rem 1rem',
                        fontSize: '0.9375rem',
                        borderRadius: 'var(--radius-lg)',
                        border: error
                            ? '1.5px solid var(--danger)'
                            : value
                                ? '1.5px solid var(--primary)'
                                : '1.5px solid var(--border)',
                        backgroundColor: 'var(--bg)',
                        color: 'var(--text)',
                        boxSizing: 'border-box',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                    }}
                />
                {/* Right-side icon: checkmark if selected, chevron otherwise */}
                <span style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    fontSize: '1rem',
                    color: value ? 'var(--primary)' : 'var(--text-secondary)',
                }}>
                    {value ? '✓' : '▾'}
                </span>
            </div>

            {/* Selected school pill */}
            {value && (
                <div style={{
                    marginTop: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.875rem',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: value.supported
                        ? 'rgba(37, 99, 235, 0.07)'
                        : 'rgba(100, 100, 120, 0.07)',
                    border: value.supported
                        ? '1px solid rgba(37, 99, 235, 0.25)'
                        : '1px solid var(--border)',
                    fontSize: '0.875rem',
                    color: 'var(--text)',
                }}>
                    <span style={{ flex: 1, fontWeight: '500' }}>{value.name}</span>
                    <span style={{
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '999px',
                        backgroundColor: value.supported ? 'var(--primary)' : 'var(--border)',
                        color: value.supported ? 'white' : 'var(--text-secondary)',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                    }}>
                        {value.supported ? '✓ Supported' : value.type}
                    </span>
                    <button
                        type="button"
                        onClick={() => { onChange(null); setQuery(''); }}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            fontSize: '1rem',
                            padding: '0',
                            lineHeight: 1,
                        }}
                        aria-label="Clear school selection"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Dropdown list */}
            {open && !value && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    maxHeight: '280px',
                    overflowY: 'auto',
                    backgroundColor: 'var(--bg)',
                    border: '1.5px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 8px 30px -4px rgba(0,0,0,0.18)',
                    zIndex: 999,
                }}>
                    {!hasResults && (
                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            No matching institution found.
                        </div>
                    )}

                    {universities.length > 0 && (
                        <div>
                            <div style={{
                                padding: '0.5rem 1rem',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                color: 'var(--text-secondary)',
                                backgroundColor: 'rgba(0,0,0,0.03)',
                                borderBottom: '1px solid var(--border)',
                                position: 'sticky',
                                top: 0,
                            }}>
                                Universities
                            </div>
                            {universities.map((inst) => (
                                <button
                                    key={inst.name}
                                    type="button"
                                    onClick={() => handleSelect(inst)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: '1px solid rgba(0,0,0,0.04)',
                                        cursor: 'pointer',
                                        color: 'var(--text)',
                                        fontSize: '0.9rem',
                                        textAlign: 'left',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(37,99,235,0.05)'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <span>{inst.name}</span>
                                    {inst.supported && (
                                        <span style={{
                                            fontSize: '0.7rem',
                                            padding: '0.2rem 0.45rem',
                                            borderRadius: '999px',
                                            backgroundColor: 'var(--primary)',
                                            color: 'white',
                                            fontWeight: '700',
                                            marginLeft: '0.5rem',
                                            whiteSpace: 'nowrap',
                                            flexShrink: 0,
                                        }}>
                                            ✓ Supported
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {polytechnics.length > 0 && (
                        <div>
                            <div style={{
                                padding: '0.5rem 1rem',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                color: 'var(--text-secondary)',
                                backgroundColor: 'rgba(0,0,0,0.03)',
                                borderTop: universities.length > 0 ? '1px solid var(--border)' : 'none',
                                borderBottom: '1px solid var(--border)',
                                position: 'sticky',
                                top: 0,
                            }}>
                                Polytechnics
                            </div>
                            {polytechnics.map((inst) => (
                                <button
                                    key={inst.name}
                                    type="button"
                                    onClick={() => handleSelect(inst)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: '1px solid rgba(0,0,0,0.04)',
                                        cursor: 'pointer',
                                        color: 'var(--text)',
                                        fontSize: '0.9rem',
                                        textAlign: 'left',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(37,99,235,0.05)'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <span>{inst.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {error && (
                <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.35rem', marginBottom: 0 }}>
                    {error}
                </p>
            )}
        </div>
    );
};

export default SchoolSelector;
