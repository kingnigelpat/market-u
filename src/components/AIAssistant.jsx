import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Bot, X, Send, ShoppingBag, HelpCircle, ChevronRight, ExternalLink, Sparkles, AlertCircle, ShieldCheck, ArrowRight, CheckCircle, RefreshCw } from 'lucide-react';
import { optimizeImage } from '../utils/cloudinary';
import VerifiedBadge from './VerifiedBadge';

const SUPPORT_PHONE = '2347073544811';

// Category Keyword Map
const CATEGORY_MAP = {
  Electronics: ['laptop', 'phone', 'tech', 'computer', 'macbook', 'iphone', 'airpods', 'ipad', 'headphone', 'charger', 'electronics', 'gadget', 'screen', 'tv', 'ps4', 'ps5', 'xbox', 'console', 'powerbank', 'monitor', 'keyboard', 'mouse', 'audio', 'speaker'],
  Fashion: ['shoe', 'clothe', 'wear', 'dress', 'shirt', 'sneaker', 'dunk', 'nike', 'adidas', 'fashion', 'hoodie', 'jacket', 'pants', 'trousers', 'cap', 'bag', 'backpack', 'watch', 'jewelry', 'crocs', 'slides', 'heel'],
  'Health & Beauty': ['skincare', 'perfume', 'makeup', 'fragrance', 'lotion', 'hair', 'wig', 'beauty', 'cream', 'soap', 'cologne'],
  'Home & Kitchen': ['fan', 'cooker', 'pot', 'bed', 'mattress', 'chair', 'table', 'desk', 'lamp', 'blender', 'fridge', 'refrigerator', 'utensil', 'plate', 'iron'],
  'Books & Stationery': ['book', 'textbook', 'notebook', 'pen', 'calculator', 'stationery', 'novel', 'pdf', 'journal'],
  'Food & Groceries': ['food', 'groceries', 'snack', 'drink', 'cook', 'meal', 'lunch', 'dinner', 'noodles', 'rice', 'oil', 'beverage'],
  Services: ['service', 'design', 'edit', 'print', 'photography', 'tutor', 'lesson', 'services', 'haircut', 'braids', 'developer', 'code', 'typing'],
  'Hostels & Rooms': ['hostel', 'room', 'apartment', 'sublet', 'rent', 'accommodation', 'lodge'],
};

// FAQ Knowledge Base
const FAQ_INTENTS = {
  create_account: {
    keywords: ['create account', 'make account', 'how to register', 'how to sign up', 'signup', 'create an account', 'register as buyer', 'register as seller'],
    response: 'Creating an account on MarketU takes less than a minute! 🚀\n\n1️⃣ Tap **Sign Up** in the navigation menu.\n2️⃣ Choose your account type:\n   • **Buyer** (to browse and buy on campus)\n   • **Seller** (to list items and receive WhatsApp leads)\n3️⃣ Enter your name, email, phone number, and password.\n4️⃣ Tap **Create Account**!',
    action: { label: 'Create Account Now', path: '/register' },
  },
  how_to_buy: {
    keywords: ['how to buy', 'how do i buy', 'how can i buy', 'how to purchase', 'how to order', 'buying', 'order process'],
    response: 'Buying on MarketU is safe and easy! 🛒\n\n1️⃣ Browse the market or use me to search for what you need.\n2️⃣ Tap on any product to open details.\n3️⃣ Tap **"I\'m Interested ❤️"**.\n4️⃣ The seller receives an instant alert and will contact you directly on WhatsApp to arrange campus pickup!',
    action: { label: 'Browse Market Now', path: '/market' },
  },
  how_to_sell: {
    keywords: ['how to sell', 'how do i sell', 'how can i sell', 'selling', 'list an item', 'post an item', 'become a seller', 'post product'],
    response: 'Start selling your items on campus for free! 🏷️\n\n1️⃣ Create a **Seller** account or switch to seller in settings.\n2️⃣ Tap **"Post Item ➕"** from the navigation bar.\n3️⃣ Upload clear photos, set your price, pick a category, and publish!\n4️⃣ Whenever a student is interested, you\'ll receive instant WhatsApp leads!',
    action: { label: 'Start Selling Free', path: '/register?role=seller' },
  },
  verification: {
    keywords: ['verified', 'verification', 'trust', 'scam', 'safe', 'security', 'legit', 'fake', 'safety'],
    response: 'MarketU is built for student safety 🛡️\n\n• **Verified Sellers**: Look for the ⭐ **Verified** badge on trusted campus sellers.\n• **Campus Pickup**: Always meet in a public campus location (library, cafeteria, student center).\n• **Inspect First**: Check the item in person before making payment!',
    action: null,
  },
  payment: {
    keywords: ['payment', 'pay', 'how to pay', 'price', 'cost', 'fee', 'charge', 'money', 'cash', 'transfer'],
    response: 'Payments on MarketU are direct and transparent 💰\n\n• You pay the seller directly upon meeting on campus (via cash or instant bank transfer).\n• MarketU charges **0% commission** on student trades.\n• **Safety Rule**: Never send money in advance before seeing the item in person!',
    action: null,
  },
  contact: {
    keywords: ['contact', 'support', 'help', 'admin', 'customer service', 'report', 'complain', 'issue', 'human', 'real person', 'talk to someone'],
    response: 'Need human assistance? Our support team is ready to help! 💬\n\nTap below to connect with MarketU Support directly on WhatsApp:',
    action: { label: 'Chat with Support on WhatsApp', external: true },
  },
  account: {
    keywords: ['account', 'login', 'sign in', 'password', 'forgot', 'profile', 'delete account', 'logout', 'log out'],
    response: 'You can manage your profile, phone number, password, and notification settings directly on your **Account Settings** page.',
    action: { label: 'Go to Profile', path: '/profile' },
  },
};

const INITIAL_MESSAGE = {
  role: 'assistant',
  text: "Hey there! I'm MarketU AI 🤖\n\nI can help you:\n• Find products on campus (e.g. *'laptop under 100k'*, *'shoes'*, *'verified sellers'*)\n• Guide you on buying & selling\n• Answer any questions\n\nWhat are you looking for today?",
  pills: [
    { label: '💻 Laptops & Tech', query: 'show me laptops under 150k' },
    { label: '👕 Shoes & Fashion', query: 'show me fashion under 25k' },
    { label: '⭐ Verified Sellers', query: 'show products from verified sellers' },
    { label: '❓ How to buy?', query: 'how do i buy an item?' },
  ]
};

// Parsing helpers
function parseUserPrompt(text, currentContext = {}) {
  const lower = text.toLowerCase().trim();
  
  // 1. Budget extraction
  let budget = null;
  const budgetMatch = lower.match(/(?:under|below|<|budget|less than|max|up to)?\s*(?:ngn|₦)?\s*(\d+(?:[kK]|000)?)/);
  if (budgetMatch) {
    const rawVal = budgetMatch[1].toLowerCase();
    if (rawVal.endsWith('k')) {
      budget = parseFloat(rawVal) * 1000;
    } else {
      budget = parseFloat(rawVal);
      if (budget < 1000 && budget > 0) budget = budget * 1000; // treat "50" as 50k in campus context
    }
  }

  // 2. Category extraction
  let detectedCategory = null;
  for (const [cat, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(kw => lower.includes(kw))) {
      detectedCategory = cat;
      break;
    }
  }

  // Fallback to previous context category if follow-up
  if (!detectedCategory && currentContext.category) {
    if (budget || lower.includes('cheaper') || lower.includes('more') || lower.includes('verified') || lower.includes('show')) {
      detectedCategory = currentContext.category;
    }
  }

  // 3. Verified filter check
  const wantsVerified = lower.includes('verified') || lower.includes('trusted') || lower.includes('star');

  // 4. Intent scoring for FAQs
  let bestFaq = null;
  let maxScore = 0;
  for (const [key, faq] of Object.entries(FAQ_INTENTS)) {
    let score = 0;
    for (const kw of faq.keywords) {
      if (lower.includes(kw)) score += kw.length;
    }
    if (score > maxScore) {
      maxScore = score;
      bestFaq = { key, ...faq };
    }
  }

  return {
    lower,
    category: detectedCategory,
    budget,
    wantsVerified,
    faq: maxScore >= 4 ? bestFaq : null,
    isSearchQuery: Boolean(detectedCategory || budget || wantsVerified || lower.includes('find') || lower.includes('search') || lower.includes('looking for') || lower.includes('want') || lower.includes('buy') || lower.includes('need') || lower.includes('recommend')),
  };
}

const AIAssistant = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState({});
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const addMessage = (msgObj) => {
    setMessages(prev => [...prev, msgObj]);
  };

  const handleProductSearch = async (parsed) => {
    setLoading(true);
    try {
      // Fetch latest products from Firestore
      const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(100));
      const snap = await getDocs(q);
      let products = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Filter by category
      if (parsed.category) {
        products = products.filter(p => p.category === parsed.category || (p.title && p.title.toLowerCase().includes(parsed.category.toLowerCase())));
      }

      // Filter by search terms if any
      const searchTerms = parsed.lower
        .replace(/(?:under|below|<|budget|less than|max|up to)?\s*(?:ngn|₦)?\s*\d+(?:[kK]|000)?/g, '')
        .replace(/(?:show|find|looking for|want|need|search|recommend|verified|only)/g, '')
        .trim();

      if (searchTerms.length > 2) {
        products = products.filter(p => 
          p.title.toLowerCase().includes(searchTerms) || 
          (p.description && p.description.toLowerCase().includes(searchTerms)) ||
          (p.category && p.category.toLowerCase().includes(searchTerms))
        );
      }

      // Filter by verified
      if (parsed.wantsVerified) {
        products = products.filter(p => p.sellerVerified === true);
      }

      // Filter by budget
      if (parsed.budget) {
        products = products.filter(p => parseFloat(p.price) <= parsed.budget);
      }

      // Sort by popularity/views
      products.sort((a, b) => (b.views || 0) - (a.views || 0));

      setLoading(false);

      if (products.length === 0) {
        addMessage({
          role: 'assistant',
          text: `I couldn't find any exact matches for your request right now 😅\n\nTry broadening your budget or clearing filters:`,
          pills: [
            { label: '🛍️ Browse All Market Items', path: '/market' },
            { label: '⭐ Show All Verified Items', query: 'show verified sellers' },
          ]
        });
        setContext({});
        return;
      }

      const topProducts = products.slice(0, 4);
      let summaryText = `I found **${products.length} item${products.length > 1 ? 's' : ''}** for you! 🎯`;
      if (parsed.budget) summaryText += ` (Under ₦${parsed.budget.toLocaleString()})`;

      addMessage({
        role: 'assistant',
        text: summaryText,
        products: topProducts,
        pills: [
          parsed.budget ? { label: '💰 Show All Prices', query: `show ${parsed.category || 'all'} without budget limit` } : null,
          !parsed.wantsVerified ? { label: '⭐ Only Verified Sellers', query: `verified ${parsed.category || 'items'}` } : null,
          { label: '🛍️ View All in Market', path: '/market' },
        ].filter(Boolean)
      });

      setContext({ category: parsed.category, budget: parsed.budget });

    } catch (err) {
      console.error('AI Product Search error:', err);
      setLoading(false);
      addMessage({
        role: 'assistant',
        text: "Oops! I ran into an issue loading live market items. Please try browsing the market directly:",
        pills: [{ label: '🛍️ Open Market', path: '/market' }]
      });
    }
  };

  const processQuery = async (queryText) => {
    if (!queryText.trim() || loading) return;

    addMessage({ role: 'user', text: queryText });
    setInput('');
    setLoading(true);

    await new Promise(r => setTimeout(r, 350));

    const parsed = parseUserPrompt(queryText, context);

    // 1. FAQ matching
    if (parsed.faq && !parsed.category && !parsed.budget) {
      setLoading(false);
      const faq = parsed.faq;
      const pills = [];
      if (faq.action) {
        if (faq.action.external) {
          pills.push({ label: '💬 Chat on WhatsApp', url: `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent("Hi Support, I need help: " + queryText)}` });
        } else {
          pills.push({ label: `👉 ${faq.action.label}`, path: faq.action.path });
        }
      }
      addMessage({
        role: 'assistant',
        text: faq.response,
        pills,
      });
      setContext({});
      return;
    }

    // 2. Product Search Query
    if (parsed.isSearchQuery || parsed.category || parsed.budget || parsed.wantsVerified) {
      await handleProductSearch(parsed);
      return;
    }

    // 3. Fallback smart response
    setLoading(false);
    addMessage({
      role: 'assistant',
      text: `I'm here to help you navigate MarketU! Here is what I can do for you:`,
      pills: [
        { label: '💻 Laptops & Tech', query: 'laptops under 150k' },
        { label: '👕 Shoes & Fashion', query: 'fashion under 25k' },
        { label: '⭐ Verified Sellers', query: 'verified sellers' },
        { label: '❓ How to buy?', query: 'how do i buy an item?' },
        { label: '💬 Talk to Support', url: `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent("Hi Support, I need help: " + queryText)}` },
      ]
    });
  };

  const handlePillClick = (pill) => {
    if (pill.path) {
      navigate(pill.path);
      setIsOpen(false);
    } else if (pill.url) {
      window.open(pill.url, '_blank');
    } else if (pill.query) {
      processQuery(pill.query);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      processQuery(input);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="ai-fab"
        aria-label="Open AI Assistant"
      >
        <Bot size={28} />
      </button>

      {/* Modal Chat Drawer */}
      {isOpen && (
        <div className="ai-overlay" onClick={() => setIsOpen(false)}>
          <div className="ai-modal" onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="ai-header">
              <div className="ai-header-left">
                <div className="ai-header-icon">
                  <Sparkles size={18} />
                </div>
                <div>
                  <div className="ai-header-title">MarketU AI Assistant</div>
                  <div className="ai-header-status">
                    <span className="ai-status-dot" /> Online • Live Campus Search
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="ai-close-btn" aria-label="Close">
                <X size={20} />
              </button>
            </div>

            {/* Message Feed */}
            <div className="ai-messages">
              {messages.map((msg, i) => (
                <div key={i} className={`ai-msg ai-msg--${msg.role}`}>
                  {msg.role === 'assistant' && (
                    <div className="ai-avatar">
                      <Sparkles size={14} />
                    </div>
                  )}

                  <div className="ai-msg-content">
                    {/* Bubble Text */}
                    {msg.text && (
                      <div className={`ai-msg-bubble ai-msg-bubble--${msg.role}`}>
                        <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span>
                      </div>
                    )}

                    {/* Inline Product Cards */}
                    {msg.products && msg.products.length > 0 && (
                      <div className="ai-products-grid">
                        {msg.products.map((p) => (
                          <div
                            key={p.id}
                            className="ai-product-card"
                            onClick={() => {
                              navigate(`/product/${p.id}`);
                              setIsOpen(false);
                            }}
                          >
                            <div className="ai-product-img-wrap">
                              <img
                                src={p.images?.length > 0 ? optimizeImage(p.images[0], 200) : 'https://via.placeholder.com/200'}
                                alt={p.title}
                                className="ai-product-img"
                              />
                              {p.sellerVerified && (
                                <span className="ai-product-badge">
                                  <VerifiedBadge size={12} /> Verified
                                </span>
                              )}
                            </div>
                            <div className="ai-product-info">
                              <div className="ai-product-title">{p.title}</div>
                              <div className="ai-product-price">
                                ₦{parseFloat(p.price).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                              </div>
                              <div className="ai-product-cta">
                                View Item <ArrowRight size={12} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Pills */}
                    {msg.pills && msg.pills.length > 0 && (
                      <div className="ai-pills-wrap">
                        {msg.pills.map((pill, pIdx) => (
                          <button
                            key={pIdx}
                            onClick={() => handlePillClick(pill)}
                            className="ai-pill-btn"
                          >
                            {pill.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="ai-msg ai-msg--assistant">
                  <div className="ai-avatar">
                    <Sparkles size={14} />
                  </div>
                  <div className="ai-msg-bubble ai-msg-bubble--assistant ai-loading">
                    <span className="ai-dot" />
                    <span className="ai-dot" />
                    <span className="ai-dot" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="ai-input-wrap">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything (e.g. laptop under 100k)..."
                className="ai-input"
                disabled={loading}
              />
              <button
                onClick={() => processQuery(input)}
                disabled={!input.trim() || loading}
                className="ai-send-btn"
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Styles */}
      <style>{`
        .ai-fab {
          position: fixed;
          right: 1.5rem;
          bottom: 5.5rem;
          width: 56px;
          height: 56px;
          background: var(--gradient-primary);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px var(--primary-glow);
          z-index: 9998;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          border: none;
        }

        .ai-fab:hover {
          transform: scale(1.08) rotate(-4deg);
          box-shadow: 0 8px 28px var(--primary-glow);
        }

        .ai-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          z-index: 10000;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 1rem;
          animation: aiFadeIn 0.2s ease;
        }

        @keyframes aiFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .ai-modal {
          width: 100%;
          max-width: 440px;
          height: min(620px, 85vh);
          background: var(--surface-elevated);
          border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-xl);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid var(--border);
          animation: aiSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes aiSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .ai-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--border);
          background: var(--surface);
          flex-shrink: 0;
        }

        .ai-header-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .ai-header-icon {
          width: 36px;
          height: 36px;
          background: var(--gradient-primary);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 2px 10px var(--primary-glow);
        }

        .ai-header-title {
          font-weight: 800;
          font-size: 0.9375rem;
          color: var(--text);
          font-family: var(--font-display);
        }

        .ai-header-status {
          font-size: 0.6875rem;
          color: var(--secondary);
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        .ai-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--secondary);
        }

        .ai-close-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-tertiary);
          transition: all 0.2s;
          border: none;
          background: none;
          cursor: pointer;
        }

        .ai-close-btn:hover {
          background: var(--surface);
          color: var(--text);
        }

        .ai-messages {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .ai-msg {
          display: flex;
          gap: 0.625rem;
          max-width: 95%;
        }

        .ai-msg--user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .ai-msg--assistant {
          align-self: flex-start;
        }

        .ai-avatar {
          width: 28px;
          height: 28px;
          background: var(--gradient-primary);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
          margin-top: 0.2rem;
        }

        .ai-msg-content {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .ai-msg-bubble {
          padding: 0.875rem 1.125rem;
          font-size: 0.875rem;
          line-height: 1.6;
          border-radius: 18px;
        }

        .ai-msg-bubble--user {
          background: var(--gradient-primary);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .ai-msg-bubble--assistant {
          background: var(--surface);
          color: var(--text);
          border-bottom-left-radius: 4px;
          border: 1px solid var(--border);
        }

        .ai-products-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.625rem;
          margin-top: 0.25rem;
        }

        .ai-product-card {
          background: var(--surface-elevated);
          border: 1.5px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
        }

        .ai-product-card:hover {
          transform: translateY(-2px);
          border-color: var(--primary);
          box-shadow: var(--shadow-md);
        }

        .ai-product-img-wrap {
          position: relative;
          padding-top: 75%;
          background: var(--surface);
          overflow: hidden;
        }

        .ai-product-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .ai-product-badge {
          position: absolute;
          top: 0.35rem;
          left: 0.35rem;
          background: rgba(16, 185, 129, 0.9);
          color: white;
          font-size: 0.625rem;
          font-weight: 800;
          padding: 0.15rem 0.4rem;
          border-radius: 99px;
          display: flex;
          align-items: center;
          gap: 0.2rem;
          backdrop-filter: blur(4px);
        }

        .ai-product-info {
          padding: 0.625rem;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .ai-product-title {
          font-size: 0.75rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
          color: var(--text);
        }

        .ai-product-price {
          font-size: 0.8125rem;
          font-weight: 800;
          color: var(--primary);
          margin-bottom: 0.35rem;
        }

        .ai-product-cta {
          font-size: 0.6875rem;
          font-weight: 700;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 0.25rem;
          margin-top: auto;
        }

        .ai-pills-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin-top: 0.25rem;
        }

        .ai-pill-btn {
          padding: 0.4rem 0.75rem;
          background: var(--primary-light);
          color: var(--primary);
          border: 1px solid rgba(124, 58, 237, 0.2);
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .ai-pill-btn:hover {
          background: var(--gradient-primary);
          color: white;
          border-color: transparent;
        }

        .ai-loading {
          display: flex;
          gap: 0.35rem;
          padding: 0.75rem 1rem;
        }

        .ai-dot {
          width: 8px;
          height: 8px;
          background: var(--primary);
          border-radius: 50%;
          animation: aiBounce 1.4s infinite ease-in-out;
        }

        .ai-dot:nth-child(2) { animation-delay: 0.2s; }
        .ai-dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes aiBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }

        .ai-input-wrap {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-top: 1px solid var(--border);
          background: var(--surface-elevated);
          flex-shrink: 0;
        }

        .ai-input {
          flex: 1;
          border: 1.5px solid var(--border);
          border-radius: var(--radius-full);
          padding: 0.625rem 1rem;
          font-size: 0.875rem;
          background: var(--surface);
          color: var(--text);
          outline: none;
          transition: all 0.2s;
        }

        .ai-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-light);
        }

        .ai-send-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--gradient-primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .ai-send-btn:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 4px 12px var(--primary-glow);
        }

        .ai-send-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        @media (max-width: 480px) {
          .ai-overlay {
            padding: 0;
            align-items: flex-end;
          }
          .ai-modal {
            max-width: 100%;
            height: min(100%, 92vh);
            border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
          }
          .ai-products-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </>
  );
};

export default AIAssistant;
