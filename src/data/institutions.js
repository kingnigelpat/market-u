/**
 * Nigerian Tertiary Institutions
 *
 * Universities: National Universities Commission (NUC) — https://www.nuc.edu.ng
 * Polytechnics: National Board for Technical Education (NBTE) — https://nbte.gov.ng
 *
 * All tertiary institutions are now fully supported across Market-U!
 */

export const DEFAULT_CAMPUS = 'All Campuses';
export const SUPPORTED_SCHOOL = 'Western Delta University';

/**
 * @typedef {Object} Institution
 * @property {string} name - Full institution name
 * @property {'University' | 'Polytechnic'} type
 * @property {'Federal University' | 'State University' | 'Private University' | 'Federal Polytechnic' | 'State Polytechnic'} category
 * @property {string} [short] - Common abbreviation or acronym
 * @property {boolean} supported - Always true
 */

/** @type {Institution[]} */
export const INSTITUTIONS = [
    // ─── PINNED / POPULAR HUBS ───────────────────────────────────────────────
    { name: 'Western Delta University', type: 'University', category: 'Private University', short: 'WDU', supported: true },
    { name: 'University of Benin', type: 'University', category: 'Federal University', short: 'UNIBEN', supported: true },
    { name: 'University of Lagos', type: 'University', category: 'Federal University', short: 'UNILAG', supported: true },
    { name: 'Delta State University, Abraka', type: 'University', category: 'State University', short: 'DELSU', supported: true },
    { name: 'Obafemi Awolowo University, Ile-Ife', type: 'University', category: 'Federal University', short: 'OAU', supported: true },
    { name: 'University of Ibadan', type: 'University', category: 'Federal University', short: 'UI', supported: true },
    { name: 'University of Nigeria, Nsukka', type: 'University', category: 'Federal University', short: 'UNN', supported: true },
    { name: 'University of Port Harcourt', type: 'University', category: 'Federal University', short: 'UNIPORT', supported: true },
    { name: 'University of Ilorin', type: 'University', category: 'Federal University', short: 'UNILORIN', supported: true },
    { name: 'Lagos State University', type: 'University', category: 'State University', short: 'LASU', supported: true },
    { name: 'Covenant University, Ota', type: 'University', category: 'Private University', short: 'CU', supported: true },
    { name: 'Federal University of Petroleum Resources, Effurun', type: 'University', category: 'Federal University', short: 'FUPRE', supported: true },
    { name: 'Federal University of Technology, Akure', type: 'University', category: 'Federal University', short: 'FUTA', supported: true },
    { name: 'Federal University of Technology, Owerri', type: 'University', category: 'Federal University', short: 'FUTO', supported: true },
    { name: 'Federal University of Technology, Minna', type: 'University', category: 'Federal University', short: 'FUTMINNA', supported: true },
    { name: 'Yaba College of Technology, Lagos', type: 'Polytechnic', category: 'Federal Polytechnic', short: 'YABATECH', supported: true },
    { name: 'Auchi Polytechnic, Auchi', type: 'Polytechnic', category: 'Federal Polytechnic', short: 'AUCHI POLY', supported: true },

    // ─── FEDERAL UNIVERSITIES (NUC) ──────────────────────────────────────────
    { name: 'Ahmadu Bello University, Zaria', type: 'University', category: 'Federal University', short: 'ABU', supported: true },
    { name: 'Alex Ekwueme Federal University, Ndufu-Alike', type: 'University', category: 'Federal University', short: 'AE-FUNAI', supported: true },
    { name: 'Bayero University, Kano', type: 'University', category: 'Federal University', short: 'BUK', supported: true },
    { name: 'Federal University of Agriculture, Abeokuta', type: 'University', category: 'Federal University', short: 'FUNAAB', supported: true },
    { name: 'Federal University of Agriculture, Makurdi', type: 'University', category: 'Federal University', short: 'FUAM', supported: true },
    { name: 'Federal University of Health Sciences, Ila-Orangun', type: 'University', category: 'Federal University', short: 'FUHSI', supported: true },
    { name: 'Federal University of Health Sciences, Otukpo', type: 'University', category: 'Federal University', short: 'FUHSO', supported: true },
    { name: 'Federal University, Birnin Kebbi', type: 'University', category: 'Federal University', short: 'FUBK', supported: true },
    { name: 'Federal University, Dutse', type: 'University', category: 'Federal University', short: 'FUD', supported: true },
    { name: 'Federal University, Dutsin-Ma', type: 'University', category: 'Federal University', short: 'FUDMA', supported: true },
    { name: 'Federal University, Gashua', type: 'University', category: 'Federal University', short: 'FUGA', supported: true },
    { name: 'Federal University, Gusau', type: 'University', category: 'Federal University', short: 'FUGUS', supported: true },
    { name: 'Federal University, Kashere', type: 'University', category: 'Federal University', short: 'FUKASHERE', supported: true },
    { name: 'Federal University, Lafia', type: 'University', category: 'Federal University', short: 'FULAFIA', supported: true },
    { name: 'Federal University, Lokoja', type: 'University', category: 'Federal University', short: 'FULOKOJA', supported: true },
    { name: 'Federal University, Otuoke', type: 'University', category: 'Federal University', short: 'FUOTUOKE', supported: true },
    { name: 'Federal University, Oye-Ekiti', type: 'University', category: 'Federal University', short: 'FUOYE', supported: true },
    { name: 'Federal University, Wukari', type: 'University', category: 'Federal University', short: 'FUWUKARI', supported: true },
    { name: 'Michael Okpara University of Agriculture, Umudike', type: 'University', category: 'Federal University', short: 'MOUAU', supported: true },
    { name: 'Modibbo Adama University, Yola', type: 'University', category: 'Federal University', short: 'MAU', supported: true },
    { name: 'National Open University of Nigeria', type: 'University', category: 'Federal University', short: 'NOUN', supported: true },
    { name: 'Nigerian Army University, Biu', type: 'University', category: 'Federal University', short: 'NAUB', supported: true },
    { name: 'Nigerian Defence Academy, Kaduna', type: 'University', category: 'Federal University', short: 'NDA', supported: true },
    { name: 'Nnamdi Azikiwe University, Awka', type: 'University', category: 'Federal University', short: 'UNIZIK', supported: true },
    { name: 'University of Abuja', type: 'University', category: 'Federal University', short: 'UNIABUJA', supported: true },
    { name: 'University of Calabar', type: 'University', category: 'Federal University', short: 'UNICAL', supported: true },
    { name: 'University of Jos', type: 'University', category: 'Federal University', short: 'UNIJOS', supported: true },
    { name: 'University of Maiduguri', type: 'University', category: 'Federal University', short: 'UNIMAID', supported: true },
    { name: 'University of Uyo', type: 'University', category: 'Federal University', short: 'UNIUYO', supported: true },
    { name: 'Usman Dan Fodio University, Sokoto', type: 'University', category: 'Federal University', short: 'UDUS', supported: true },

    // ─── STATE UNIVERSITIES (NUC) ────────────────────────────────────────────
    { name: 'Abia State University, Uturu', type: 'University', category: 'State University', short: 'ABSU', supported: true },
    { name: 'Adekunle Ajasin University, Akungba', type: 'University', category: 'State University', short: 'AAUA', supported: true },
    { name: 'Akwa Ibom State University', type: 'University', category: 'State University', short: 'AKSU', supported: true },
    { name: 'Ambrose Alli University, Ekpoma', type: 'University', category: 'State University', short: 'AAU', supported: true },
    { name: 'Anambra State University', type: 'University', category: 'State University', short: 'COOU', supported: true },
    { name: 'Benue State University, Makurdi', type: 'University', category: 'State University', short: 'BSUM', supported: true },
    { name: 'Cross River University of Technology', type: 'University', category: 'State University', short: 'CRUTECH', supported: true },
    { name: 'Ebonyi State University', type: 'University', category: 'State University', short: 'EBSU', supported: true },
    { name: 'Ekiti State University', type: 'University', category: 'State University', short: 'EKSU', supported: true },
    { name: 'Enugu State University of Science and Technology', type: 'University', category: 'State University', short: 'ESUT', supported: true },
    { name: 'Ibrahim Badamosi Babangida University, Lapai', type: 'University', category: 'State University', short: 'IBBU', supported: true },
    { name: 'Imo State University, Owerri', type: 'University', category: 'State University', short: 'IMSU', supported: true },
    { name: 'Kaduna State University', type: 'University', category: 'State University', short: 'KASU', supported: true },
    { name: 'Kebbi State University of Science and Technology, Aliero', type: 'University', category: 'State University', short: 'KSUSTA', supported: true },
    { name: 'Kogi State University, Anyigba', type: 'University', category: 'State University', short: 'PAAU', supported: true },
    { name: 'Kwara State University, Malete', type: 'University', category: 'State University', short: 'KWASU', supported: true },
    { name: 'Ladoke Akintola University of Technology, Ogbomoso', type: 'University', category: 'State University', short: 'LAUTECH', supported: true },
    { name: 'Niger Delta University, Wilberforce Island', type: 'University', category: 'State University', short: 'NDU', supported: true },
    { name: 'Olabisi Onabanjo University, Ago-Iwoye', type: 'University', category: 'State University', short: 'OOU', supported: true },
    { name: 'Osun State University', type: 'University', category: 'State University', short: 'UNIOSUN', supported: true },
    { name: 'PAMO University of Medical Sciences, Port Harcourt', type: 'University', category: 'Private University', short: 'PAMO', supported: true },
    { name: 'Plateau State University, Bokkos', type: 'University', category: 'State University', short: 'PLASU', supported: true },
    { name: 'Rivers State University', type: 'University', category: 'State University', short: 'RSU', supported: true },
    { name: 'Sokoto State University', type: 'University', category: 'State University', short: 'SSU', supported: true },
    { name: 'Tai Solarin University of Education, Ijebu Ode', type: 'University', category: 'State University', short: 'TASUED', supported: true },
    { name: 'Taraba State University, Jalingo', type: 'University', category: 'State University', short: 'TSU', supported: true },
    { name: 'Umaru Musa Yar\'adua University, Katsina', type: 'University', category: 'State University', short: 'UMYU', supported: true },
    { name: 'Yobe State University, Damaturu', type: 'University', category: 'State University', short: 'YSU', supported: true },
    { name: 'Zamfara State University', type: 'University', category: 'State University', short: 'ZAMSU', supported: true },

    // ─── PRIVATE UNIVERSITIES (NUC) ──────────────────────────────────────────
    { name: 'Achievers University, Owo', type: 'University', category: 'Private University', short: 'ACHIEVERS', supported: true },
    { name: 'Adeleke University, Ede', type: 'University', category: 'Private University', short: 'AUE', supported: true },
    { name: 'Afe Babalola University, Ado-Ekiti', type: 'University', category: 'Private University', short: 'ABUAD', supported: true },
    { name: 'African University of Science and Technology, Abuja', type: 'University', category: 'Private University', short: 'AUST', supported: true },
    { name: 'Ajayi Crowther University, Ibadan', type: 'University', category: 'Private University', short: 'ACU', supported: true },
    { name: 'Al-Hikmah University, Ilorin', type: 'University', category: 'Private University', short: 'AL-HIKMAH', supported: true },
    { name: 'Al-Qalam University, Katsina', type: 'University', category: 'Private University', short: 'AUK', supported: true },
    { name: 'American University of Nigeria, Yola', type: 'University', category: 'Private University', short: 'AUN', supported: true },
    { name: 'Anchor University, Lagos', type: 'University', category: 'Private University', short: 'AUL', supported: true },
    { name: 'Augustine University, Ilara-Epe', type: 'University', category: 'Private University', short: 'AUI', supported: true },
    { name: 'Babcock University, Ilishan-Remo', type: 'University', category: 'Private University', short: 'BABCOCK', supported: true },
    { name: 'Bells University of Technology, Ota', type: 'University', category: 'Private University', short: 'BELLS', supported: true },
    { name: 'Benson Idahosa University, Benin City', type: 'University', category: 'Private University', short: 'BIU', supported: true },
    { name: 'Bingham University, Karu', type: 'University', category: 'Private University', short: 'BINGHAM', supported: true },
    { name: 'Bowen University, Iwo', type: 'University', category: 'Private University', short: 'BOWEN', supported: true },
    { name: 'Caleb University, Lagos', type: 'University', category: 'Private University', short: 'CALEB', supported: true },
    { name: 'Caritas University, Enugu', type: 'University', category: 'Private University', short: 'CARITAS', supported: true },
    { name: 'Chrisland University, Abeokuta', type: 'University', category: 'Private University', short: 'CHRISLAND', supported: true },
    { name: 'Christopher University, Mowo', type: 'University', category: 'Private University', short: 'UNICHRIS', supported: true },
    { name: 'Clifford University, Owerrinta', type: 'University', category: 'Private University', short: 'CLU', supported: true },
    { name: 'Coal City University, Enugu', type: 'University', category: 'Private University', short: 'CCU', supported: true },
    { name: 'Crawford University, Igbesa', type: 'University', category: 'Private University', short: 'CRAWFORD', supported: true },
    { name: 'Crescent University, Abeokuta', type: 'University', category: 'Private University', short: 'CRESCENT', supported: true },
    { name: 'Crown Hill University, Ilorin', type: 'University', category: 'Private University', short: 'CHU', supported: true },
    { name: 'Dominican University, Ibadan', type: 'University', category: 'Private University', short: 'DU', supported: true },
    { name: 'Edwin Clark University, Kiagbodo', type: 'University', category: 'Private University', short: 'ECU', supported: true },
    { name: 'Elizade University, Ilara-Mokin', type: 'University', category: 'Private University', short: 'ELIZADE', supported: true },
    { name: 'Evangel University, Akaeze', type: 'University', category: 'Private University', short: 'EVANGEL', supported: true },
    { name: 'Fountain University, Oshogbo', type: 'University', category: 'Private University', short: 'FUO', supported: true },
    { name: 'Glorious Vision University, Ogwa', type: 'University', category: 'Private University', short: 'GVU', supported: true },
    { name: 'Gregory University, Uturu', type: 'University', category: 'Private University', short: 'GUU', supported: true },
    { name: 'Hallmark University, Ijebu Itele', type: 'University', category: 'Private University', short: 'HALLMARK', supported: true },
    { name: 'Hezekiah University, Umudi', type: 'University', category: 'Private University', short: 'UNIHEZ', supported: true },
    { name: 'Igbinedion University, Okada', type: 'University', category: 'Private University', short: 'IUO', supported: true },
    { name: 'Joseph Ayo Babalola University, Ikeji-Arakeji', type: 'University', category: 'Private University', short: 'JABU', supported: true },
    { name: 'Kings University, Ode-Omu', type: 'University', category: 'Private University', short: 'KU', supported: true },
    { name: 'Kola Daisi University, Ibadan', type: 'University', category: 'Private University', short: 'KDU', supported: true },
    { name: 'Kwararafa University, Wukari', type: 'University', category: 'Private University', short: 'KUW', supported: true },
    { name: 'Landmark University, Omu-Aran', type: 'University', category: 'Private University', short: 'LANDMARK', supported: true },
    { name: 'Lead City University, Ibadan', type: 'University', category: 'Private University', short: 'LCU', supported: true },
    { name: 'Legacy University, Okija', type: 'University', category: 'Private University', short: 'LUO', supported: true },
    { name: 'Madonna University, Okija', type: 'University', category: 'Private University', short: 'MADONNA', supported: true },
    { name: 'McPherson University, Seriki Sotayo', type: 'University', category: 'Private University', short: 'MCU', supported: true },
    { name: 'Michael and Cecilia Ibru University, Agbarha-Otor', type: 'University', category: 'Private University', short: 'MCIU', supported: true },
    { name: 'Mountain Top University, Lagos', type: 'University', category: 'Private University', short: 'MTU', supported: true },
    { name: 'Nile University of Nigeria, Abuja', type: 'University', category: 'Private University', short: 'NILE', supported: true },
    { name: 'Novena University, Ogume', type: 'University', category: 'Private University', short: 'NOVENA', supported: true },
    { name: 'Oduduwa University, Ipetumodu', type: 'University', category: 'Private University', short: 'OUI', supported: true },
    { name: 'Pan-Atlantic University, Lagos', type: 'University', category: 'Private University', short: 'PAU', supported: true },
    { name: 'Paul University, Awka', type: 'University', category: 'Private University', short: 'PUA', supported: true },
    { name: 'Redeemer\'s University, Ede', type: 'University', category: 'Private University', short: 'RUN', supported: true },
    { name: 'Renaissance University, Enugu', type: 'University', category: 'Private University', short: 'RNU', supported: true },
    { name: 'Rhema University, Obeama-Asa', type: 'University', category: 'Private University', short: 'RHEMA', supported: true },
    { name: 'Salem University, Lokoja', type: 'University', category: 'Private University', short: 'SALEM', supported: true },
    { name: 'Samuel Adegboyega University, Ogwa', type: 'University', category: 'Private University', short: 'SAU', supported: true },
    { name: 'Spiritan University, Nneochi', type: 'University', category: 'Private University', short: 'SPIRITAN', supported: true },
    { name: 'Summit University, Offa', type: 'University', category: 'Private University', short: 'SUN', supported: true },
    { name: 'Tansian University, Umunya', type: 'University', category: 'Private University', short: 'TANSIAN', supported: true },
    { name: 'Trinity University, Lagos', type: 'University', category: 'Private University', short: 'TRINITY', supported: true },
    { name: 'University of Mkar, Gboko', type: 'University', category: 'Private University', short: 'UMM', supported: true },
    { name: 'Veritas University, Abuja', type: 'University', category: 'Private University', short: 'VERITAS', supported: true },
    { name: 'Wellspring University, Evbuobanosa', type: 'University', category: 'Private University', short: 'WELLSPRING', supported: true },
    { name: 'Wesley University of Science and Technology, Ondo', type: 'University', category: 'Private University', short: 'WUSTO', supported: true },
    { name: 'Westland University, Iwo', type: 'University', category: 'Private University', short: 'WESTLAND', supported: true },

    // ─── FEDERAL POLYTECHNICS (NBTE) ─────────────────────────────────────────
    { name: 'Federal Polytechnic, Ado-Ekiti', type: 'Polytechnic', category: 'Federal Polytechnic', short: 'FEDPOLYADO', supported: true },
    { name: 'Federal Polytechnic, Bali', type: 'Polytechnic', category: 'Federal Polytechnic', short: 'FEDPOLYBALI', supported: true },
    { name: 'Federal Polytechnic, Bauchi', type: 'Polytechnic', category: 'Federal Polytechnic', short: 'FPTB', supported: true },
    { name: 'Federal Polytechnic, Bida', type: 'Polytechnic', category: 'Federal Polytechnic', short: 'FEDPOLYBIDA', supported: true },
    { name: 'Federal Polytechnic, Damaturu', type: 'Polytechnic', category: 'Federal Polytechnic', short: 'FEDPOLYDAM', supported: true },
    { name: 'Federal Polytechnic, Ede', type: 'Polytechnic', category: 'Federal Polytechnic', short: 'FEDPOLYEDE', supported: true },
    { name: 'Federal Polytechnic, Ekowe', type: 'Polytechnic', category: 'Federal Polytechnic', short: 'FEDPOLYEKOWE', supported: true },
    { name: 'Federal Polytechnic, Idah', type: 'Polytechnic', category: 'Federal Polytechnic', short: 'FPI', supported: true },
    { name: 'Federal Polytechnic, Ile-Oluji', type: 'Polytechnic', category: 'Federal Polytechnic', short: 'FEDPOLEL', supported: true },
    { name: 'Federal Polytechnic, Illela', type: 'Polytechnic', category: 'Federal Polytechnic', short: 'FEDPOLYILLELA', supported: true },
    { name: 'Federal Polytechnic, Mubi', type: 'Polytechnic', category: 'Federal Polytechnic', short: 'FPM', supported: true },
    { name: 'Federal Polytechnic, Namoda', type: 'Polytechnic', category: 'Federal Polytechnic', short: 'FEDPOLYNAMODA', supported: true },
    { name: 'Federal Polytechnic, Nasarawa', type: 'Polytechnic', category: 'Federal Polytechnic', short: 'FEDPOLYNASS', supported: true },
    { name: 'Federal Polytechnic, Nekede', type: 'Polytechnic', category: 'Federal Polytechnic', short: 'FPNO', supported: true },
    { name: 'Federal Polytechnic, Nyak', type: 'Polytechnic', category: 'Federal Polytechnic', short: 'FEDPOLYNYAK', supported: true },
    { name: 'Federal Polytechnic, Offa', type: 'Polytechnic', category: 'Federal Polytechnic', short: 'FEDPOFFA', supported: true },
    { name: 'Federal Polytechnic, Oko', type: 'Polytechnic', category: 'Federal Polytechnic', short: 'OKOPOLY', supported: true },
    { name: 'Federal Polytechnic, Ukana', type: 'Polytechnic', category: 'Federal Polytechnic', short: 'FEDPOLYUKANA', supported: true },
    { name: 'Federal Polytechnic, Unwana', type: 'Polytechnic', category: 'Federal Polytechnic', short: 'FEDPOLYUNWANA', supported: true },
    { name: 'Federal Polytechnic, Wurno', type: 'Polytechnic', category: 'Federal Polytechnic', short: 'FEDPOLYWURNO', supported: true },
    { name: 'Kaduna Polytechnic', type: 'Polytechnic', category: 'Federal Polytechnic', short: 'KADPOLY', supported: true },
    { name: 'Waziri Umaru Federal Polytechnic, Birnin Kebbi', type: 'Polytechnic', category: 'Federal Polytechnic', short: 'WUFPBK', supported: true },

    // ─── STATE POLYTECHNICS (NBTE) ───────────────────────────────────────────
    { name: 'Abraham Adesanya Polytechnic, Ijebu-Igbo', type: 'Polytechnic', category: 'State Polytechnic', short: 'AAPOLY', supported: true },
    { name: 'Abia State Polytechnic, Aba', type: 'Polytechnic', category: 'State Polytechnic', short: 'ABIAPOLY', supported: true },
    { name: 'Adamawa State Polytechnic, Yola', type: 'Polytechnic', category: 'State Polytechnic', short: 'ADAMAWAPOLY', supported: true },
    { name: 'Akanu Ibiam Federal Polytechnic, Unwana', type: 'Polytechnic', category: 'Federal Polytechnic', short: 'AIFPU', supported: true },
    { name: 'Akwa Ibom State Polytechnic', type: 'Polytechnic', category: 'State Polytechnic', short: 'AKWAPOLY', supported: true },
    { name: 'Benue State Polytechnic, Ugbokolo', type: 'Polytechnic', category: 'State Polytechnic', short: 'BENPOLY', supported: true },
    { name: 'Delta State Polytechnic, Ogwashi-Uku', type: 'Polytechnic', category: 'State Polytechnic', short: 'DSPG', supported: true },
    { name: 'Delta State Polytechnic, Otefe-Oghara', type: 'Polytechnic', category: 'State Polytechnic', short: 'DESPO', supported: true },
    { name: 'Delta State Polytechnic, Ozoro', type: 'Polytechnic', category: 'State Polytechnic', short: 'DSPZ', supported: true },
    { name: 'Enugu State Polytechnic, Iwollo', type: 'Polytechnic', category: 'State Polytechnic', short: 'ESPOLY', supported: true },
    { name: 'Gateway ICT Polytechnic, Saapade', type: 'Polytechnic', category: 'State Polytechnic', short: 'GAPOSA', supported: true },
    { name: 'Ibarapa Polytechnic, Eruwa', type: 'Polytechnic', category: 'State Polytechnic', short: 'IBARAPAPOLY', supported: true },
    { name: 'Imo State Polytechnic, Umuagwo', type: 'Polytechnic', category: 'State Polytechnic', short: 'IMOPOLY', supported: true },
    { name: 'Institute of Management and Technology, Enugu', type: 'Polytechnic', category: 'State Polytechnic', short: 'IMT', supported: true },
    { name: 'Interlink Polytechnic, Ijebu-Jesa', type: 'Polytechnic', category: 'State Polytechnic', short: 'INTERLINK', supported: true },
    { name: 'Kano State Polytechnic', type: 'Polytechnic', category: 'State Polytechnic', short: 'KANOPOLY', supported: true },
    { name: 'Kogi State Polytechnic, Lokoja', type: 'Polytechnic', category: 'State Polytechnic', short: 'KSP', supported: true },
    { name: 'Kwara State Polytechnic, Ilorin', type: 'Polytechnic', category: 'State Polytechnic', short: 'KWARAPOLY', supported: true },
    { name: 'Lagos City Polytechnic', type: 'Polytechnic', category: 'State Polytechnic', short: 'LCP', supported: true },
    { name: 'Moshood Abiola Polytechnic, Abeokuta', type: 'Polytechnic', category: 'State Polytechnic', short: 'MAPOLY', supported: true },
    { name: 'Nasarawa State Polytechnic, Lafia', type: 'Polytechnic', category: 'State Polytechnic', short: 'NASPOLY', supported: true },
    { name: 'Niger State Polytechnic, Zungeru', type: 'Polytechnic', category: 'State Polytechnic', short: 'NIGERPOLY', supported: true },
    { name: 'Nuhu Bamalli Polytechnic, Zaria', type: 'Polytechnic', category: 'State Polytechnic', short: 'NUBAPOLY', supported: true },
    { name: 'Ogun State Institute of Technology, Igbesa', type: 'Polytechnic', category: 'State Polytechnic', short: 'OGITECH', supported: true },
    { name: 'Osun State College of Technology, Esa-Oke', type: 'Polytechnic', category: 'State Polytechnic', short: 'OSCOTECH', supported: true },
    { name: 'Plateau State Polytechnic, Barkin-Ladi', type: 'Polytechnic', category: 'State Polytechnic', short: 'PLAPOLY', supported: true },
    { name: 'Ramat Polytechnic, Maiduguri', type: 'Polytechnic', category: 'State Polytechnic', short: 'RAMATPOLY', supported: true },
    { name: 'Rivers State Polytechnic, Bori', type: 'Polytechnic', category: 'State Polytechnic', short: 'RIVPOLY', supported: true },
    { name: 'Rufus Giwa Polytechnic, Owo', type: 'Polytechnic', category: 'State Polytechnic', short: 'RUGIPO', supported: true },
    { name: 'The Polytechnic, Ibadan', type: 'Polytechnic', category: 'State Polytechnic', short: 'POLY IBADAN', supported: true },
    { name: 'The Polytechnic Igbo-Owu', type: 'Polytechnic', category: 'State Polytechnic', short: 'TPI', supported: true },
    { name: 'Zamfara State College of Arts and Science', type: 'Polytechnic', category: 'State Polytechnic', short: 'ZACAS', supported: true },
];

/**
 * Common popular launch campuses
 */
export const POPULAR_SCHOOLS = [
    'Western Delta University',
    'University of Benin',
    'University of Lagos',
    'Delta State University, Abraka',
    'Obafemi Awolowo University, Ile-Ife',
    'University of Ibadan',
    'University of Port Harcourt',
    'Federal University of Technology, Akure',
    'Yaba College of Technology, Lagos',
    'Auchi Polytechnic, Auchi'
];

/**
 * Search institutions by keyword or acronym
 */
export function searchInstitutions(term) {
    if (!term || !term.trim()) return INSTITUTIONS;
    const clean = term.trim().toLowerCase();
    return INSTITUTIONS.filter(inst => {
        return (
            inst.name.toLowerCase().includes(clean) ||
            (inst.short && inst.short.toLowerCase().includes(clean)) ||
            (inst.category && inst.category.toLowerCase().includes(clean))
        );
    });
}
