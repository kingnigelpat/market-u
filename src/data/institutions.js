/**
 * Market-U Curated Institutions
 * 
 * 10 Supported Campuses:
 * - 7 from Delta State
 * - 1 Polytechnic from Oghara (Delta State Polytechnic, Otefe-Oghara)
 * - 2 from Benin City (University of Benin, Benson Idahosa University)
 */

export const DEFAULT_CAMPUS = 'All Campuses';
export const SUPPORTED_SCHOOL = 'Western Delta University';
export const ADMIN_WHATSAPP = '2347073544811';

/**
 * Generate a WhatsApp URL for students to message the admin to add their school
 */
export const getAddSchoolWhatsAppUrl = (schoolName = '') => {
    const text = schoolName && schoolName.trim()
        ? `Hello Market-U Admin, I would like to request my school "${schoolName.trim()}" to be added to Market-U.`
        : `Hello Market-U Admin, I would like to request my school to be added to Market-U.`;
    return `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(text)}`;
};

/**
 * @typedef {Object} Institution
 * @property {string} name - Full institution name
 * @property {'University' | 'Polytechnic'} type
 * @property {'Federal University' | 'State University' | 'Private University' | 'State Polytechnic' | 'Federal Polytechnic'} category
 * @property {string} [short] - Common abbreviation or acronym
 * @property {string} state - Nigerian State (e.g. 'Delta', 'Edo')
 * @property {boolean} supported - Always true for supported campuses
 */

/** @type {Institution[]} */
export const INSTITUTIONS = [
    // ─── DELTA STATE (7 Institutions) ──────────────────────────────────────
    { 
        name: 'Western Delta University', 
        type: 'University', 
        category: 'Private University', 
        short: 'WDU', 
        state: 'Delta', 
        supported: true 
    },
    { 
        name: 'Delta State University, Abraka', 
        type: 'University', 
        category: 'State University', 
        short: 'DELSU', 
        state: 'Delta', 
        supported: true 
    },
    { 
        name: 'Federal University of Petroleum Resources, Effurun', 
        type: 'University', 
        category: 'Federal University', 
        short: 'FUPRE', 
        state: 'Delta', 
        supported: true 
    },
    { 
        name: 'University of Delta, Agbor', 
        type: 'University', 
        category: 'State University', 
        short: 'UNIDEL', 
        state: 'Delta', 
        supported: true 
    },
    { 
        name: 'Dennis Osadebay University, Asaba', 
        type: 'University', 
        category: 'State University', 
        short: 'DOU', 
        state: 'Delta', 
        supported: true 
    },
    { 
        name: 'Delta State University of Science and Technology, Ozoro', 
        type: 'University', 
        category: 'State University', 
        short: 'DSUST', 
        state: 'Delta', 
        supported: true 
    },
    { 
        name: 'Novena University, Ogume', 
        type: 'University', 
        category: 'Private University', 
        short: 'Novena', 
        state: 'Delta', 
        supported: true 
    },

    // ─── POLYTECHNIC FROM OGHARA (1 Institution) ───────────────────────────
    { 
        name: 'Delta State Polytechnic, Otefe-Oghara', 
        type: 'Polytechnic', 
        category: 'State Polytechnic', 
        short: 'DESPO', 
        state: 'Delta', 
        supported: true 
    },

    // ─── BENIN CITY / EDO STATE (2 Institutions) ───────────────────────────
    { 
        name: 'University of Benin', 
        type: 'University', 
        category: 'Federal University', 
        short: 'UNIBEN', 
        state: 'Edo', 
        supported: true 
    },
    { 
        name: 'Benson Idahosa University', 
        type: 'University', 
        category: 'Private University', 
        short: 'BIU', 
        state: 'Edo', 
        supported: true 
    },
];

/**
 * Common launch campuses list
 */
export const POPULAR_SCHOOLS = INSTITUTIONS.map(i => i.name);

/**
 * Search institutions by keyword, acronym, or state
 */
export function searchInstitutions(term) {
    if (!term || !term.trim()) return INSTITUTIONS;
    const clean = term.trim().toLowerCase();
    return INSTITUTIONS.filter(inst => {
        return (
            inst.name.toLowerCase().includes(clean) ||
            (inst.short && inst.short.toLowerCase().includes(clean)) ||
            (inst.category && inst.category.toLowerCase().includes(clean)) ||
            (inst.state && inst.state.toLowerCase().includes(clean))
        );
    });
}
