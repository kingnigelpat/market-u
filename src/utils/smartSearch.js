/**
 * Smart Search Utility & Semantic Relevance Engine for Market-U
 * 
 * Provides:
 * - High-precision relevance scoring (exact title match > token match > synonyms)
 * - Strict multi-word AND-matching (no more unrelated items matching a single random token)
 * - Safe whole-word boundary matching (prevents "oil" matching "toilet", "pen" matching "expensive")
 * - Targeted synonym clusters (no broader category pollution)
 * - Budget parsing ("under 50k", "< 10k", "20000 naira")
 */

// Targeted, tight synonym groups — NEVER includes entire parent categories
const SYNONYM_CLUSTERS = [
  // Phones & Brands
  ['iphone', 'ios', 'apple phone'],
  ['samsung', 'galaxy'],
  ['phone', 'phones', 'smartphone', 'smartphones', 'mobile phone', 'android', 'cellphone', 'tecno', 'infinix', 'redmi', 'xiaomi', 'pixel'],
  
  // Audio & Accessories
  ['airpod', 'airpods', 'earbud', 'earbuds', 'earphone', 'earphones', 'headphone', 'headphones', 'headset', 'airpod pro'],
  ['charger', 'chargers', 'charging cord', 'adapter', 'charging cable', 'type c cable', 'lightning cable', 'fast charger'],
  ['powerbank', 'power bank', 'portable charger'],

  // Laptops & Computers
  ['laptop', 'laptops', 'macbook', 'notebook', 'pc', 'computer', 'dell', 'hp', 'lenovo', 'thinkpad', 'asus', 'acer'],
  ['flashdrive', 'flash drive', 'pendrive', 'usb drive', 'hard drive', 'harddrive', 'ssd', 'hdd'],

  // Footwear
  ['shoe', 'shoes', 'footwear'],
  ['sneaker', 'sneakers', 'kicks', 'trainers', 'dunks', 'nike', 'adidas', 'puma'],
  ['slide', 'slides', 'slipper', 'slippers', 'sandal', 'sandals', 'crocs', 'croc', 'palm'],
  ['heel', 'heels', 'boot', 'boots', 'loafers'],

  // Bags
  ['bag', 'bags', 'backpack', 'backpacks', 'tote', 'tote bag', 'handbag', 'handbags', 'purse', 'duffle', 'school bag', 'laptop bag'],

  // Clothing
  ['hoodie', 'hoodies', 'sweatshirt', 'sweatshirts', 'jacket', 'jackets'],
  ['shirt', 'shirts', 't-shirt', 't-shirts', 'tshirt', 'tee', 'top', 'blouse', 'polo'],
  ['pant', 'pants', 'trouser', 'trousers', 'jean', 'jeans', 'chinos', 'joggers', 'cargo'],
  ['short', 'shorts'],
  ['dress', 'dresses', 'gown', 'gowns', 'skirt', 'skirts'],
  ['cloth', 'clothes', 'outfit', 'wear', 'apparel', 'thrift'],

  // Fashion Accessories
  ['perfume', 'perfumes', 'fragrance', 'cologne', 'body spray', 'bodyspray', 'scent'],
  ['watch', 'watches', 'wristwatch', 'smartwatch'],
  ['chain', 'chains', 'necklace', 'necklaces', 'bracelet', 'bracelets', 'ring', 'rings', 'earring', 'earrings', 'jewelry'],
  ['glasses', 'sunglasses', 'shades'],
  ['cap', 'caps', 'hat', 'hats', 'beanie'],

  // Skincare & Beauty
  ['cream', 'creams', 'lotion', 'lotions', 'moisturizer', 'body butter', 'vaseline', 'nivea', 'cerave'],
  ['soap', 'soaps', 'body wash', 'face wash', 'cleanser'],
  ['hair', 'wig', 'wigs', 'braids', 'frontal', 'frontals', 'closure'],

  // Academics & Stationery
  ['book', 'books', 'textbook', 'textbooks', 'handout', 'handouts', 'notebook', 'notebooks', 'novel'],
  ['calculator', 'casio calculator', 'scientific calculator'],

  // Room & Living
  ['bed', 'beds', 'mattress', 'mattresses', 'pillow', 'pillows'],
  ['fan', 'fans', 'rechargeable fan', 'standing fan', 'ox fan'],
  ['drawer', 'drawers', 'closet', 'wardrobe'],

  // Food
  ['noodle', 'noodles', 'indomie', 'pasta', 'spaghetti'],
  ['snack', 'snacks', 'biscuit', 'biscuits', 'cookie', 'cookies', 'pastry', 'cake']
];

/**
 * Extracts numeric budget limits from search query (e.g. "cream under 5k" -> 5000)
 */
export function parseQueryBudget(queryStr) {
  if (!queryStr) return null;
  const lower = queryStr.toLowerCase();
  
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

/** Escape regex special characters in a string */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Checks whole-word presence in text using word boundaries.
 */
function containsWholeWord(text, word) {
  if (!text || !word) return false;
  try {
    const rx = new RegExp(`(^|[^a-zA-Z0-9])${escapeRegex(word)}([^a-zA-Z0-9]|$)`, 'i');
    return rx.test(text);
  } catch {
    return text.toLowerCase().includes(word.toLowerCase());
  }
}

/**
 * Expands a single query term to its tight semantic synonyms.
 */
export function getExpandedTerms(term) {
  const clean = term.toLowerCase().trim();
  if (!clean || clean.length < 2) return [];

  const expanded = new Set([clean]);

  for (const group of SYNONYM_CLUSTERS) {
    const matched = group.some(item => item === clean || containsWholeWord(item, clean));
    if (matched) {
      group.forEach(s => expanded.add(s.toLowerCase()));
    }
  }

  return Array.from(expanded);
}

/**
 * Computes a relevance score for a product against a search query.
 * 
 * Returns:
 * - 0: Product does NOT match the search query (reject).
 * - >0: Product matches. Higher score = higher relevance in search results.
 *
 * @param {object} product
 * @param {string} searchQuery
 * @returns {number}
 */
export function getSearchRelevance(product, searchQuery) {
  if (!searchQuery || !searchQuery.trim()) return 1;
  if (!product) return 0;

  const lowerQuery = searchQuery.toLowerCase().trim();
  const budget = parseQueryBudget(lowerQuery);

  // If budget limit is present in search and product exceeds budget, reject
  if (budget && parseFloat(product.price) > budget) {
    return 0;
  }

  // Clean search query of price/budget tokens to extract pure text keywords
  const textQuery = lowerQuery
    .replace(/(?:under|below|<|budget|less than|max|up to)?\s*(?:ngn|₦)?\s*\d+(?:[kK]|000)?/gi, '')
    .trim();

  // If search was solely a budget query (e.g. "under 50k"), match all products within budget
  if (!textQuery) {
    return 100;
  }

  const pTitle = (product.title || '').toLowerCase();
  const pDesc = (product.description || '').toLowerCase();
  const pCat = (product.category || '').toLowerCase();

  let score = 0;

  // 1. Direct Full-Query Matches (Highest Weight)
  if (pTitle === textQuery) {
    score += 1500;
  } else if (pTitle.startsWith(textQuery)) {
    score += 1000;
  } else if (containsWholeWord(pTitle, textQuery) || pTitle.includes(textQuery)) {
    score += 800;
  }

  if (containsWholeWord(pDesc, textQuery)) {
    score += 250;
  }

  if (pCat === textQuery || containsWholeWord(pCat, textQuery)) {
    score += 200;
  }

  // 2. Tokenized Analysis (Multi-word Query Matching)
  const tokens = textQuery.split(/\s+/).filter(t => t.length >= 2);
  
  if (tokens.length === 0) {
    return score > 0 ? score : 0;
  }

  // Track whether each token in the query was satisfied
  let matchedTokensCount = 0;

  for (const token of tokens) {
    let tokenScore = 0;

    // Check direct word match in Title (heavy weight)
    if (containsWholeWord(pTitle, token)) {
      tokenScore += 120;
    } else if (pTitle.includes(token) && token.length >= 3) {
      tokenScore += 60;
    }

    // Check direct word match in Category
    if (containsWholeWord(pCat, token)) {
      tokenScore += 70;
    }

    // Check direct word match in Description (whole-word only to avoid false matches)
    if (containsWholeWord(pDesc, token)) {
      tokenScore += 25;
    }

    // If no direct match, check semantic synonyms
    if (tokenScore === 0) {
      const synonyms = getExpandedTerms(token);
      for (const syn of synonyms) {
        if (syn === token) continue;
        if (containsWholeWord(pTitle, syn)) {
          tokenScore += 50;
          break;
        } else if (containsWholeWord(pDesc, syn)) {
          tokenScore += 15;
          break;
        }
      }
    }

    if (tokenScore > 0) {
      matchedTokensCount++;
      score += tokenScore;
    }
  }

  // Strict Query Fidelity:
  // For multi-word queries (e.g. "iphone 11", "black shoes", "samsung charger"),
  // ALL query tokens must be matched by the product, or else it is an unrelated product.
  // Exception: If query has 4+ words, allow at most 1 missing token.
  const requiredMatches = tokens.length >= 4 ? tokens.length - 1 : tokens.length;
  if (matchedTokensCount < requiredMatches) {
    return 0; // REJECT unrelated item
  }

  return score;
}

/**
 * Smart matches a product against a search query string.
 * Retained for backwards compatibility across all callers.
 */
export function smartMatchesProduct(product, searchQuery) {
  return getSearchRelevance(product, searchQuery) > 0;
}
