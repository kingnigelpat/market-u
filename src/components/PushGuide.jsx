import { useEffect, useState } from 'react';
import { BellRing, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { messagingReady } from '../firebase';
import { requestNotificationPermission } from '../utils/notifications';

const DISMISS_KEY = 'marketu_push_guide_dismissed_at';
const DISMISS_MS = 3 * 24 * 60 * 60 * 1000; // re-show after 3 days

const detectPlatform = () => {
    const ua = navigator.userAgent || '';
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const standalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    if (isIOS) return standalone ? 'ios-app' : 'ios-browser';
    if (/android/i.test(ua)) return 'android';
    return 'desktop';
};

const STEPS = {
    'ios-browser': [
        'Tap the Share button (square with arrow) at the bottom of Safari.',
        'Choose "Add to Home Screen", then tap "Add".',
        'Open Market-U from your Home Screen icon.',
        'Tap "Turn on notifications" below and choose "Allow".',
    ],
    'ios-app': [
        'Tap "Turn on notifications" below and choose "Allow".',
        'If you blocked it before: Settings → Notifications → Market-U → Allow Notifications.',
    ],
    android: [
        'Tap "Turn on notifications" below and choose "Allow".',
        'If you blocked it before: tap the 🔒 lock icon next to the address bar → Permissions → Notifications → Allow.',
        'Tip: tap ⋮ menu → "Add to Home screen" for the best experience.',
    ],
    desktop: [
        'Click "Turn on notifications" below and choose "Allow".',
        'If you blocked it before: click the 🔒 lock icon left of the address bar → Notifications → Allow, then refresh.',
    ],
};

const PushGuide = () => {
    const { currentUser } = useAuth();
    const [visible, setVisible] = useState(false);
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState('idle'); // idle | loading | done | blocked
    const platform = detectPlatform();

    useEffect(() => {
        const supported = 'Notification' in window || platform === 'ios-browser';
        if (!supported) return;
        if ('Notification' in window && Notification.permission === 'granted') return;
        const dismissedAt = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
        if (Date.now() - dismissedAt < DISMISS_MS) return;
        const t = setTimeout(() => setVisible(true), 4000);
        return () => clearTimeout(t);
    }, [platform]);

    const dismiss = () => {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        setVisible(false);
    };

    const enable = async () => {
        if (!('Notification' in window)) { setOpen(true); return; }
        setStatus('loading');
        try {
            if (currentUser) {
                const msg = await messagingReady;
                await requestNotificationPermission(currentUser.uid, msg);
            } else {
                await Notification.requestPermission();
            }
            if (Notification.permission === 'granted') {
                setStatus('done');
                setTimeout(() => setVisible(false), 2000);
            } else {
                setStatus('blocked');
                setOpen(true);
            }
        } catch {
            setStatus('blocked');
            setOpen(true);
        }
    };

    if (!visible) return null;

    return (
        <aside className="push-guide" role="dialog" aria-label="Turn on push notifications" id="push-guide">
            <button className="pg-close" onClick={dismiss} aria-label="Dismiss" id="push-guide-close"><X size={16} /></button>
            <div className="pg-head">
                <div className="pg-icon"><BellRing size={20} /></div>
                <div>
                    <strong>Turn on notifications</strong>
                    <p>Get messages from buyers/sellers and campus deals instantly.</p>
                </div>
            </div>

            {status === 'done' ? (
                <div className="pg-ok">✅ Notifications are on!</div>
            ) : (
                <>
                    {status === 'blocked' && (
                        <div className="pg-warn">Notifications are blocked. Follow the steps below to allow them.</div>
                    )}
                    <button className="pg-toggle" onClick={() => setOpen((o) => !o)} id="push-guide-steps">
                        How to turn it on {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {open && (
                        <ol className="pg-steps">
                            {STEPS[platform].map((s, i) => <li key={i}>{s}</li>)}
                        </ol>
                    )}
                    {platform !== 'ios-browser' && (
                        <button className="btn btn-primary pg-btn" onClick={enable} disabled={status === 'loading'} id="push-guide-enable">
                            {status === 'loading' ? 'Enabling…' : 'Turn on notifications'}
                        </button>
                    )}
                </>
            )}

            <style>{`
                .push-guide { position: fixed; z-index: 1500; right: 1rem; bottom: 10rem; width: min(360px, calc(100vw - 2rem));
                    background: var(--surface-elevated); border: 1px solid var(--border); border-radius: var(--radius-xl);
                    box-shadow: var(--shadow-xl); padding: 1rem 1.1rem; animation: fadeInUp 0.35s ease; }
                .pg-close { position: absolute; top: 0.6rem; right: 0.6rem; background: none; border: none; color: var(--text-secondary); cursor: pointer; }
                .pg-head { display: flex; gap: 0.75rem; align-items: flex-start; padding-right: 1.25rem; }
                .pg-head strong { font-size: 0.95rem; }
                .pg-head p { margin: 0.15rem 0 0; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4; }
                .pg-icon { width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
                    color: #fff; background: linear-gradient(135deg, #f59e0b, #ef4444); box-shadow: 0 4px 14px rgba(245,158,11,0.35); }
                .pg-toggle { margin-top: 0.75rem; background: none; border: none; color: var(--primary); font-weight: 700; font-size: 0.8rem;
                    display: inline-flex; align-items: center; gap: 0.25rem; cursor: pointer; padding: 0; }
                .pg-steps { margin: 0.5rem 0 0; padding-left: 1.1rem; font-size: 0.8rem; color: var(--text); line-height: 1.5; display: flex; flex-direction: column; gap: 0.3rem; }
                .pg-btn { width: 100%; margin-top: 0.85rem; justify-content: center; }
                .pg-warn { margin-top: 0.75rem; font-size: 0.78rem; font-weight: 600; color: var(--warning); }
                .pg-ok { margin-top: 0.75rem; font-weight: 700; color: var(--success); }
            `}</style>
        </aside>
    );
};

export default PushGuide;
