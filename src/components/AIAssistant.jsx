import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, getDocs, limit, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Bot, X, Send, MessageSquare, ShoppingBag, HelpCircle, ChevronRight, ExternalLink, Sparkles, AlertCircle } from 'lucide-react';

const SUPPORT_PHONE = '2347073544811';

const CATEGORY_KEYWORDS = {
  electronics: ['laptop', 'phone', 'tech', 'computer', 'macbook', 'iphone', 'airpods', 'ipad', 'headphone', 'charger', 'Electronics'],
  fashion: ['shoe', 'clothe', 'wear', 'dress', 'shirt', 'sneaker', 'dunk', 'nike', 'adidas', 'Fashion'],
  services: ['service', 'design', 'edit', 'print', 'photography', 'tutor', 'lesson', 'Services'],
  'Food & Groceries': ['food', 'groceries', 'snack', 'drink', 'cook', 'meal', 'lunch', 'dinner', 'Food & Groceries'],
};

const FAQ_RESPONSES = {
  how_to_buy: {
    keywords: ['how to buy', 'how do i buy', 'how can i buy', 'how to purchase', 'how to order', 'buying'],
    response: 'To buy an item: 1) Browse the market or search for what you need. 2) Click on a product to view details. 3) Tap "I\'m Interested" to notify the seller. 4) The seller will contact you via WhatsApp within 45 seconds to arrange pickup on campus!',
    action: { label: 'Browse Market', path: '/market' },
  },
  how_to_sell: {
    keywords: ['how to sell', 'how do i sell', 'how can i sell', 'selling', 'list an item', 'post an item', 'become a seller'],
    response: 'To start selling: 1) Create an account and select "Seller" during signup. 2) From your dashboard, tap "Post Product". 3) Add photos, set a price, and publish. 4) When a buyer is interested, you\'ll get a notification instantly! It\'s completely free to start.',
    action: { label: 'Start Selling', path: '/register?role=seller' },
  },
  verification: {
    keywords: ['verified', 'verification', 'trust', 'scam', 'safe', 'security', 'legit', 'fake'],
    response: 'Every seller on MarketU is verified as a real student. We use school email verification and manual checks to ensure no fake profiles. Buy with confidence — if anything goes wrong, our support team has your back!',
    action: null,
  },
  payment: {
    keywords: ['payment', 'pay', 'how to pay', 'price', 'cost', 'fee', 'charge', 'money', 'cash'],
    response: 'Payments are handled directly between you and the seller — we recommend cash on pickup for safety. Meet on campus in a public spot (library, cafeteria, etc.). Never send money before seeing the item in person!',
    action: null,
  },
  contact: {
    keywords: ['contact', 'support', 'help', 'admin', 'customer service', 'report', 'complain', 'issue'],
    response: 'Need help? Our support team is ready to assist you. For urgent issues, tap the button below to chat with us on WhatsApp — we typically reply within a few minutes.',
    action: { label: 'Contact Support', external: true },
  },
  account: {
    keywords: ['account', 'login', 'sign in', 'sign up', 'register', 'password', 'forgot', 'profile', 'delete account'],
    response: 'You can manage your account from the Profile page — update your name, phone number, change password, or delete your account. If you forgot your password, contact our support via WhatsApp for help.',
    action: { label: 'Profile', path: '/profile' },
  },
};

const INITIAL_MESSAGE = {
  role: 'assistant',
  text: "Hey there! I'm MarketU AI 🤖\n\nI can help you:\n• Find products you'll love\n• Answer questions about the platform\n• Guide you through buying & selling\n\nWhat are you looking for?",
};

const SUPPORT_ESCAPE = {
  keywords: ['too much', 'confus', 'complicated', 'don\'t understand', 'can\'t find', 'not working', 'error', 'bug', 'broken', 'stuck', 'frustrat', 'annoying', 'manual', 'human', 'real person', 'agent', 'talk to someone'],
  response: "I understand this might need a human touch! Let me connect you with our support team who can help you personally.",
};

function findBestIntent(input, intents) {
  const lower = input.toLowerCase();
  const scores = [];

  for (const [key, intent] of Object.entries(intents)) {
    let score = 0;
    for (const kw of intent.keywords) {
      if (lower.includes(kw)) {
        score += kw.length;
      }
    }
    if (score > 0) {
      scores.push({ key, score, intent });
    }
  }

  scores.sort((a, b) => b.score - a.score);
  return scores.length > 0 ? scores[0] : null;
}

function findCategory(input) {
  const lower = input.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) return cat;
    }
  }
  return null;
}

function extractBudget(input) {
  const numbers = input.match(/\d+[kK]?/g);
  if (!numbers) return null;
  let maxBudget = 0;
  for (const n of numbers) {
    if (n.includes('k') || n.includes('K')) {
      maxBudget = Math.max(maxBudget, parseInt(n) * 1000);
    } else {
      maxBudget = Math.max(maxBudget, parseInt(n));
    }
  }
  return maxBudget || null;
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
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const addMessage = (role, text) => {
    setMessages(prev => [...prev, { role, text }]);
  };

  const handleProductSearch = async (category, budget) => {
    setLoading(true);
    try {
      const q = category && category !== 'all'
        ? query(collection(db, 'products'), where('category', '==', category), orderBy('createdAt', 'desc'), limit(10))
        : query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(10));
      const snap = await getDocs(q);
      const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLoading(false);

      if (products.length === 0) {
        addMessage('assistant', "Hmm, I couldn't find any products in that category right now. Try checking the market for everything available, or let me know what else you're looking for!");
        setContext({});
        return;
      }

      let filtered = products;
      if (budget) {
        filtered = products.filter(p => parseFloat(p.price) <= budget);
      }

      if (filtered.length === 0) {
        addMessage('assistant', `I found some items in that category, but they're all above your ₦${budget.toLocaleString()} budget. Would you like to see everything available in this category instead?`);
        setContext({ awaitingBudgetConfirm: true, category, allProducts: products });
        return;
      }

      const productList = filtered.slice(0, 5).map((p, i) =>
        `${i + 1}. ${p.title} — ₦${parseFloat(p.price).toLocaleString('en-NG')}`
      ).join('\n');

      const extra = filtered.length > 5 ? `\n\n...and ${filtered.length - 5} more items!` : '';

      addMessage('assistant', `Here's what I found for you 🎯\n\n${productList}${extra}\n\nWould you like to see details on any of these? Just tell me the number, or I can help you refine your search!`);
      setContext({ showingProducts: true, products: filtered, category });
    } catch {
      setLoading(false);
      addMessage('assistant', "Oops! I had trouble searching right now. Please try again or browse the market directly.");
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    addMessage('user', text);
    setLoading(true);

    await new Promise(r => setTimeout(r, 400));

    const lower = text.toLowerCase();
    const number = parseInt(text);

    if (context.showingProducts && !isNaN(number) && number >= 1 && number <= context.products.length) {
      const product = context.products[number - 1];
      addMessage('assistant', `Great choice! Opening **${product.title}** for you...`);
      setContext({});
      setLoading(false);
      setTimeout(() => {
        navigate(`/product/${product.id}`);
        setIsOpen(false);
      }, 800);
      return;
    }

    if (context.awaitingBudgetConfirm && (lower.includes('yes') || lower.includes('show') || lower.includes('sure') || lower.includes('ok') || lower.includes('see'))) {
      const productList = context.allProducts.slice(0, 5).map((p, i) =>
        `${i + 1}. ${p.title} — ₦${parseFloat(p.price).toLocaleString('en-NG')}`
      ).join('\n');
      addMessage('assistant', `Sure! Here are all items in that category:\n\n${productList}\n\nTap any number to view details!`);
      setContext({ showingProducts: true, products: context.allProducts, category: context.category });
      setLoading(false);
      return;
    }

    const escapeMatch = findBestIntent(lower, { support_escape: SUPPORT_ESCAPE });
    if (escapeMatch) {
      const msg = SUPPORT_ESCAPE.response;
      const whatsappUrl = `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent("Hi MarketU Support, I need help with: " + text)}`;
      addMessage('assistant', `${msg}\n\n[Connect on WhatsApp](${whatsappUrl}) — I'll send them your message so you don't have to repeat yourself.`);
      setContext({});
      setLoading(false);
      return;
    }

    const category = findCategory(lower);
    const budget = extractBudget(lower);

    if (category || lower.includes('find') || lower.includes('looking for') || lower.includes('want') || lower.includes('need') || lower.includes('search') || lower.includes('recommend') || lower.includes('suggest')) {
      if (category && budget) {
        await handleProductSearch(category, budget);
        return;
      }
      if (category) {
        addMessage('assistant', `Great, I see you're interested in **${category}**! Do you have a budget in mind? (e.g., "under ₦100k" or "show me all")`);
        setContext({ awaitingBudget: true, category });
        setLoading(false);
        return;
      }
      if (!category) {
        addMessage('assistant', "I'd love to help you find something! What kind of item are you looking for? (e.g., laptops, shoes, clothes, food, services)");
        setContext({ awaitingCategory: true });
        setLoading(false);
        return;
      }
    }

    if (context.awaitingBudget && context.category) {
      const budgetVal = extractBudget(lower);
      if (budgetVal) {
        await handleProductSearch(context.category, budgetVal);
        return;
      }
      if (lower.includes('all') || lower.includes('any') || lower.includes('show') || lower.includes('yes') || lower.includes('sure')) {
        await handleProductSearch(context.category, null);
        return;
      }
      addMessage('assistant', "No problem! Just tell me your budget like 'under ₦50k' or say 'show me all' to see everything.");
      setLoading(false);
      return;
    }

    if (context.awaitingCategory) {
      const detectedCat = findCategory(lower);
      if (detectedCat) {
        addMessage('assistant', `**${detectedCat}** — nice choice! Do you have a budget in mind? (e.g., "under ₦100k" or "show me all")`);
        setContext({ awaitingBudget: true, category: detectedCat });
        setLoading(false);
        return;
      }
      await handleProductSearch(null, null);
      return;
    }

    const faqMatch = findBestIntent(lower, FAQ_RESPONSES);
    if (faqMatch) {
      const faq = faqMatch.intent;
      let response = faq.response;
      addMessage('assistant', response);
      if (faq.action) {
        if (faq.action.external) {
          const whatsappUrl = `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent("Hi MarketU Support, I need help!")}`;
          addMessage('assistant', `👉 [Contact Support on WhatsApp](${whatsappUrl})`);
        } else {
          addMessage('assistant', `👉 Want to go there now? I'll take you!`);
          setContext({});
          setLoading(false);
          setTimeout(() => {
            navigate(faq.action.path);
            setIsOpen(false);
          }, 600);
          return;
        }
      }
      setContext({});
      setLoading(false);
      return;
    }

    addMessage('assistant', "I'm not sure I understood that fully. Could you rephrase?\n\nHere's what I can help with:\n• **Find products** — tell me what you're looking for\n• **How to buy** — learn the buying process\n• **How to sell** — start selling on campus\n• **Account help** — login, password, profile\n• **Contact support** — talk to a real person");
    setContext({});
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMessage = (msg, i) => {
    if (msg.role === 'user') {
      return (
        <div key={i} className="ai-msg ai-msg--user">
          <div className="ai-msg-bubble ai-msg-bubble--user">{msg.text}</div>
        </div>
      );
    }

    const parts = msg.text.split(/(\[.*?\]\(.*?\))/g);
    const isFirst = i === 0;

    return (
      <div key={i} className="ai-msg ai-msg--assistant">
        {isFirst && (
          <div className="ai-avatar">
            <Sparkles size={16} />
          </div>
        )}
        <div className="ai-msg-bubble ai-msg-bubble--assistant">
          {parts.map((part, j) => {
            const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
            if (linkMatch) {
              return (
                <a key={j} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="ai-link" onClick={(e) => {
                  e.preventDefault();
                  window.open(linkMatch[2], '_blank');
                }}>
                  {linkMatch[1]} <ExternalLink size={12} />
                </a>
              );
            }
            return <span key={j} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>;
          })}
        </div>
      </div>
    );
  };

  const quickActions = [
    { label: 'Find Products', icon: <ShoppingBag size={14} />, action: () => { setInput('I want to find something'); handleSend(); } },
    { label: 'How to Buy', icon: <HelpCircle size={14} />, action: () => { setInput('How do I buy something?'); handleSend(); } },
    { label: 'Contact Support', icon: <AlertCircle size={14} />, action: () => { setInput('I need help, this is too much'); handleSend(); } },
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="ai-fab"
        aria-label="Open AI Assistant"
      >
        <Bot size={28} />
      </button>

      {isOpen && (
        <div className="ai-overlay" onClick={() => setIsOpen(false)}>
          <div className="ai-modal" onClick={e => e.stopPropagation()}>
            <div className="ai-header">
              <div className="ai-header-left">
                <div className="ai-header-icon">
                  <Sparkles size={16} />
                </div>
                <div>
                  <div className="ai-header-title">MarketU AI</div>
                  <div className="ai-header-status">Online • Ready to help</div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="ai-close-btn">
                <X size={20} />
              </button>
            </div>

            <div className="ai-messages">
              {messages.map(renderMessage)}
              {loading && (
                <div className="ai-msg ai-msg--assistant">
                  <div className="ai-msg-bubble ai-msg-bubble--assistant ai-loading">
                    <span className="ai-dot" />
                    <span className="ai-dot" />
                    <span className="ai-dot" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {messages.length === 1 && (
              <div className="ai-quick-actions">
                {quickActions.map((qa, i) => (
                  <button key={i} className="ai-quick-btn" onClick={qa.action}>
                    {qa.icon} {qa.label} <ChevronRight size={12} />
                  </button>
                ))}
              </div>
            )}

            <div className="ai-input-wrap">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className="ai-input"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="ai-send-btn"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

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
          transform: scale(1.1) rotate(-5deg);
          box-shadow: 0 8px 30px var(--primary-glow);
        }

        .ai-fab:active {
          transform: scale(0.95);
        }

        .ai-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.3);
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
          max-width: 420px;
          height: min(580px, 85vh);
          background: var(--surface-elevated);
          border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-xl);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: aiSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes aiSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
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
        }

        .ai-header-title {
          font-weight: 800;
          font-size: 0.9375rem;
          color: var(--text);
        }

        .ai-header-status {
          font-size: 0.6875rem;
          color: var(--secondary);
          font-weight: 600;
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
          gap: 0.75rem;
        }

        .ai-msg {
          display: flex;
          gap: 0.5rem;
          max-width: 90%;
        }

        .ai-msg--user {
          align-self: flex-end;
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
          margin-top: 0.25rem;
        }

        .ai-msg-bubble {
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          line-height: 1.6;
        }

        .ai-msg-bubble--user {
          background: var(--gradient-primary);
          color: white;
          border-radius: 18px 18px 4px 18px;
        }

        .ai-msg-bubble--assistant {
          background: var(--surface);
          color: var(--text);
          border-radius: 18px 18px 18px 4px;
        }

        .ai-link {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          color: var(--primary);
          font-weight: 700;
          text-decoration: none;
          padding: 0.375rem 0.75rem;
          background: var(--primary-light);
          border-radius: var(--radius-full);
          margin: 0.25rem 0;
          transition: all 0.2s;
        }

        .ai-link:hover {
          background: var(--primary);
          color: white;
        }

        .ai-loading {
          display: flex;
          gap: 0.25rem;
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

        .ai-quick-actions {
          display: flex;
          gap: 0.5rem;
          padding: 0 1rem 0.75rem;
          flex-wrap: wrap;
        }

        .ai-quick-btn {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.875rem;
          background: var(--primary-light);
          color: var(--primary);
          border: 1px solid transparent;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }

        .ai-quick-btn:hover {
          background: var(--primary);
          color: white;
          border-color: transparent;
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
            height: min(100%, 90vh);
            border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
          }
        }
      `}</style>
    </>
  );
};

export default AIAssistant;
