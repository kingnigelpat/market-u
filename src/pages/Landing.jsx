import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/landing.css';
import { useAuth } from '../context/AuthContext';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import ProductCard from '../components/ProductCard';

const parseQuery = (text) => {
  const lowerText = text.toLowerCase();
  let budget = null;
  let keyword = lowerText;

  // Catch phrases like "under 50k", "< 50000", "below 10000"
  const budgetMatch = lowerText.match(/(?:under|below|<)\s*(?:ngn|₦)?\s*(\d+(?:k|m)?)/);
  if (budgetMatch) {
    const rawVal = budgetMatch[1];
    if (rawVal.includes('k')) budget = parseFloat(rawVal) * 1000;
    else if (rawVal.includes('m')) budget = parseFloat(rawVal) * 1000000;
    else budget = parseFloat(rawVal);

    keyword = lowerText.replace(/(?:under|below|<)\s*(?:ngn|₦)?\s*(\d+(?:k|m)?)/, '').trim();
  } else {
    // catch numbers at the end
    const numMatch = lowerText.match(/(\d+(?:k|m)?)$/);
    if (numMatch) {
      const rawVal = numMatch[1];
      if (rawVal.includes('k')) budget = parseFloat(rawVal) * 1000;
      else if (rawVal.includes('m')) budget = parseFloat(rawVal) * 1000000;
      else budget = parseFloat(rawVal);
      keyword = lowerText.replace(/(\d+(?:k|m)?)$/, '').trim();
    }
  }

  // clean up extra spaces
  keyword = keyword.replace(/\s+/g, ' ').trim();
  return { keyword, budget };
};

const Landing = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState({ exact: [], alternatives: [] });

  if (authLoading) return null;

  const handleSearchSubmit = async (e) => {
    if (e.key === 'Enter' && searchInput.trim()) {
      setIsSearching(true);
      setHasSearched(true);

      const { keyword, budget } = parseQuery(searchInput);

      try {
        const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(100));
        const querySnapshot = await getDocs(q);
        const products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const matchedProducts = products.filter(p => {
          if (!keyword) return true;
          const titleMatch = p.title.toLowerCase().includes(keyword);
          const catMatch = p.category && p.category.toLowerCase().includes(keyword);
          return titleMatch || catMatch;
        });

        if (budget) {
          const exact = matchedProducts.filter(p => p.price <= budget);
          const alternatives = matchedProducts.filter(p => p.price > budget);

          if (exact.length === 0 && alternatives.length === 0) {
            const budgetAlts = products.filter(p => p.price <= budget).slice(0, 4);
            // If there aren't even products in budget, just show latest 4
            setResults({ exact: [], alternatives: budgetAlts.length > 0 ? budgetAlts : products.slice(0, 4) });
          } else {
            setResults({ exact, alternatives });
          }
        } else {
          if (matchedProducts.length === 0) {
            // Fallback to showing latest items instead of empty state
            setResults({ exact: [], alternatives: products.slice(0, 4) });
          } else {
            setResults({ exact: matchedProducts, alternatives: [] });
          }
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }
  };

  return (
    <div className="landing-wrapper">
      <div className="landing-bg-glow" />

      <div className="landing-content">
        {!hasSearched && (
          <div className="landing-header-section animate-fade-in-up">
            <h1 className="landing-title">What do you need?</h1>
            <p className="landing-subtitle">Type naturally. e.g. "iPhone under 500k"</p>
          </div>
        )}

        <div className={`circle-container ${hasSearched ? 'expanded' : ''}`}>
          <div className="glimmer-circle" />
          <div className="circle-inner">
            {hasSearched && <Sparkles size={20} className="text-purple-400 mr-3 shrink-0" />}
            <input
              type="text"
              className="smart-input"
              placeholder={hasSearched ? "Ask anything..." : "Tell me..."}
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={handleSearchSubmit}
              autoFocus
            />
          </div>
        </div>

        {isSearching && (
          <div className="mt-8 text-purple-400">Searching campus...</div>
        )}

        {hasSearched && !isSearching && (
          <div className="results-container">
            {results.exact.length > 0 && (
              <div className="results-section">
                <h3><Sparkles size={20} className="text-green-400" /> In Your Budget</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {results.exact.map(product => (
                    <ProductCard key={product.id} product={product} index={0} />
                  ))}
                </div>
              </div>
            )}

            {results.alternatives.length > 0 && (
              <div className="results-section">
                <h3><AlertCircle size={20} className="text-yellow-400" /> {results.exact.length === 0 ? "You Might Like" : "Alternatives"}</h3>
                <p className="text-sm text-gray-400 mb-4">
                  {results.exact.length === 0
                    ? "We couldn't find an exact match, but here are some top picks you might like."
                    : "These match your keyword but might be outside the budget."}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {results.alternatives.map(product => (
                    <ProductCard key={product.id} product={product} index={0} />
                  ))}
                </div>
              </div>
            )}

            {results.exact.length === 0 && results.alternatives.length === 0 && (
              <div className="text-center mt-12">
                <p className="text-gray-400 mb-6">We couldn't find exactly what you're looking for.</p>
              </div>
            )}

            <div className="text-center mt-8 pt-8 border-t border-gray-800">
              <Link to="/market" className="market-link-btn">
                Browse Full Market <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        )}

        {!hasSearched && (
          <div className="mt-12 animate-fade-in-up delay-200">
            <Link to="/market" className="market-link-btn">
              Or View Full Market <ArrowRight size={18} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Landing;
