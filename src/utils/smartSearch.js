/**
 * Smart Search Utility & Semantic Synonym Engine for MarketU
 */

// Comprehensive Campus Synonym Clusters — granular grouping to avoid false positives
const SYNONYM_CLUSTERS = [
  // Skincare & Beauty
  {
    category: 'Health & Beauty',
    synonyms: ['cream', 'lotion', 'skincare', 'moisturizer', 'body butter', 'vaseline', 'nivea', 'cerave', 'face wash', 'soap', 'serum', 'sunscreen', 'cosmetics', 'beauty', 'perfume', 'fragrance', 'cologne', 'body spray', 'makeup', 'hair', 'wig', 'oil', 'ointment', 'shea butter', 'powder']
  },
  // Phones & Mobile Tech
  {
    category: 'Electronics',
    synonyms: ['phone', 'iphone', 'samsung', 'android', 'smartphone', 'mobile', 'airpods', 'redmi', 'tecno', 'infinix', 'pixel', 'ios', 'gadget', 'charger', 'powerbank', 'earbuds', 'case', 'screen protector', 'earphones', 'headphone', 'headphones']
  },
  // Laptops & Computing
  {
    category: 'Electronics',
    synonyms: ['laptop', 'macbook', 'computer', 'pc', 'dell', 'lenovo', 'thinkpad', 'asus', 'acer', 'desktop', 'monitor', 'keyboard', 'mouse', 'drive', 'pendrive', 'flashdrive', 'hard drive', 'ssd', 'ram']
  },
  // Footwear & Shoes
  {
    category: 'Fashion',
    synonyms: ['shoe', 'shoes', 'sneaker', 'sneakers', 'kick', 'kicks', 'dunk', 'dunks', 'nike', 'adidas', 'puma', 'slide', 'slides', 'crocs', 'boot', 'boots', 'heel', 'heels', 'footwear', 'sandal', 'sandals', 'palm', 'slippers', 'loafers']
  },
  // Bags & Carriers
  {
    category: 'Fashion',
    synonyms: ['bag', 'bags', 'backpack', 'tote', 'purse', 'handbag', 'duffle', 'satchel', 'fanny pack', 'laptop bag', 'school bag', 'luggage', 'suitcase']
  },
  // Accessories (Jewelry, Watches, Hats)
  {
    category: 'Fashion',
    synonyms: ['cap', 'hat', 'watch', 'watches', 'jewelry', 'chain', 'ring', 'rings', 'bracelet', 'necklace', 'earring', 'earrings', 'sunglasses', 'glasses', 'belt', 'belts', 'tie', 'scarf']
  },
  // Clothes & Apparel
  {
    category: 'Fashion',
    synonyms: ['clothe', 'clothes', 'dress', 'shirt', 't-shirt', 'top', 'pant', 'pants', 'trousers', 'jean', 'jeans', 'hoodie', 'jacket', 'gown', 'outfit', 'wear', 'skirt', 'short', 'shorts', 'sweatshirt', 'jersey', 'suit', 'blouse', 'ankara', 'thrift']
  },
  // Food & Groceries
  {
    category: 'Food & Groceries',
    synonyms: ['food', 'snack', 'snacks', 'drink', 'drinks', 'meal', 'lunch', 'dinner', 'noodle', 'noodles', 'indomie', 'rice', 'biscuit', 'beverage', 'groceries', 'bread', 'egg', 'eggs', 'spaghetti', 'pasta', 'shawarma', 'pizza', 'burger', 'chicken', 'cake', 'pastry']
  },
  // Accommodation & Housing
  {
    category: 'Hostels & Rooms',
    synonyms: ['hostel', 'room', 'apartment', 'sublet', 'lodge', 'rent', 'accommodation', 'bed', 'mattress', 'pillow', 'drawer', 'closet', 'fan', 'curtain']
  },
  // Books & Stationery
  {
    category: 'Books & Stationery',
    synonyms: ['book', 'books', 'textbook', 'notebook', 'novel', 'stationery', 'pdf', 'pen', 'calculator', 'casio', 'ruler', 'journal', 'hardcopy', 'softcopy']
  },
  // Campus Services
  {
    category: 'Services',
    synonyms: ['service', 'services', 'tutor', 'tutoring', 'lesson', 'assignment', 'design', 'graphic', 'logo', 'edit', 'editing', 'print', 'printing', 'haircut', 'barber', 'braids', 'hairstylist', 'makeup artist', 'developer', 'coding', 'typing', 'project', 'photography', 'video']
  }
];

/**
 * Extracts numeric budget limits from search query (e.g. "cream under 5k" -> 5000)
 */
export function parseQueryBudget(queryStr) {
  if (!queryStr) return null;
  const lower = queryStr.toLowerCase();
  // Require explicit budget indicator (e.g. "under 50k", "₦50000", "50k", "50000 naira")
  const match = lower.match(/(?:under|below|<|budget|less than|max|up to|\bngn\b|₦)\s*(\d+(?:[kK]|000)?)|(\d+)\s*(?:[kK]|naira)/);
  if (!match) return null;

  const rawVal = (match[1] || match[2]).toLowerCase();
  if (rawVal.endsWith('k')) {
    return parseFloat(rawVal) * 1000;
  }
  const num = parseFloat(rawVal);
  if (num < 1000 && num > 0 && (lower.includes('under') || lower.includes('below') || lower.includes('<') || lower.includes('max') || lower.includes('k'))) {
    return num * 1000;
  }
  return num > 1000 ? num : null;
}

/**
 * Checks if a search term matches a synonym using exact word boundary matching.
 * Prevents "bag" from matching "backpack" via substring, while still allowing
 * exact matches like "bag" === "bag" and multi-word matches like "laptop bag".
 */
function termMatchesSynonym(term, synonym) {
  if (term === synonym) return true;
  // Check if term is a whole word within the synonym (e.g. "bag" in "laptop bag")
  const wordBoundary = new RegExp(`\\b${escapeRegex(term)}\\b`, 'i');
  return wordBoundary.test(synonym);
}

/** Escape regex special characters in a string */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Expands a single query term to all related semantic synonyms.
 * Uses exact word matching to prevent false positives.
 */
export function getExpandedTerms(term) {
  const cleanTerm = term.toLowerCase().trim();
  if (!cleanTerm || cleanTerm.length < 2) return [];

  const expanded = new Set([cleanTerm]);

  for (const cluster of SYNONYM_CLUSTERS) {
    // Only match if the term is an exact match to one of the synonyms in this cluster
    const matchesCluster = cluster.synonyms.some(s => termMatchesSynonym(cleanTerm, s.toLowerCase()));
    if (matchesCluster) {
      cluster.synonyms.forEach(s => expanded.add(s.toLowerCase()));
      if (cluster.category) expanded.add(cluster.category.toLowerCase());
    }
  }

  return Array.from(expanded);
}

/**
 * Smart matches a product against a search query string.
 * Supports title, description, category, and budget checks!
 */
export function smartMatchesProduct(product, searchQuery) {
  if (!searchQuery || !searchQuery.trim()) return true;
  if (!product) return false;

  const lowerQuery = searchQuery.toLowerCase().trim();
  const budget = parseQueryBudget(lowerQuery);

  // If budget limit is present in search and product exceeds budget, reject
  if (budget && parseFloat(product.price) > budget) {
    return false;
  }

  // Clean search query of price/budget tokens to extract pure text keywords
  const textQuery = lowerQuery
    .replace(/(?:under|below|<|budget|less than|max|up to)?\s*(?:ngn|₦)?\s*\d+(?:[kK]|000)?/gi, '')
    .trim();

  // If search was only a budget query (e.g. "under 50k"), match all products within budget
  if (!textQuery) {
    return true;
  }

  const pTitle = (product.title || '').toLowerCase();
  const pDesc = (product.description || '').toLowerCase();
  const pCat = (product.category || '').toLowerCase();

  // 1. Direct Substring Match
  if (pTitle.includes(textQuery) || pDesc.includes(textQuery) || pCat.includes(textQuery)) {
    return true;
  }

  // 2. Tokenized & Expanded Synonym Match
  const tokens = textQuery.split(/\s+/).filter(t => t.length >= 2);
  for (const token of tokens) {
    const synonyms = getExpandedTerms(token);
    for (const syn of synonyms) {
      if (pTitle.includes(syn) || pDesc.includes(syn) || pCat.includes(syn)) {
        return true;
      }
    }
  }

  return false;
}
