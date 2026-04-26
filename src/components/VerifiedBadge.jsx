import { ShieldCheck } from 'lucide-react';

const VerifiedBadge = ({ size = 20, className = '' }) => {
    return (
        <div
            className={`verified-badge ${className}`}
            style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--primary-color)' }}
            title="Verified Seller"
        >
            <ShieldCheck size={size} fill="currentColor" color="white" />
        </div>
    );
};

export default VerifiedBadge;
