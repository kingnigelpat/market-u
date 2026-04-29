import { MessageCircle } from 'lucide-react';

const SupportButton = () => {
    const supportPhone = '2347073544811';
    const message = encodeURIComponent("Hi Market-U Support, I need help with...");
    const whatsappUrl = `https://wa.me/${supportPhone}?text=${message}`;

    return (
        <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="support-floating-btn"
            style={{
                position: 'fixed',
                right: '1.5rem',
                bottom: '1.5rem',
                width: '60px',
                height: '60px',
                backgroundColor: '#25D366',
                color: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                zIndex: 9999,
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
        >
            <MessageCircle size={32} />
            <style>{`
                .support-floating-btn:hover {
                    transform: scale(1.1) rotate(5deg);
                    boxShadow: 0 6px 16px rgba(0, 0, 0, 0.2);
                }
                .support-floating-btn:active {
                    transform: scale(0.95);
                }
            `}</style>
        </a>
    );
};

export default SupportButton;
