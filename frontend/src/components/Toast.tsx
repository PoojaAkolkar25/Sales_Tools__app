import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { type NotificationType } from '../context/NotificationContext';

interface ToastProps {
    message: string;
    type: NotificationType;
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    const getStyles = () => {
        switch (type) {
            case 'success':
                return { background: '#DEF7EC', border: '#31C48D', color: '#03543F', icon: <CheckCircle size={20} color="#31C48D" /> };
            case 'error':
                return { background: '#FDE8E8', border: '#F98080', color: '#9B1C1C', icon: <XCircle size={20} color="#F98080" /> };
            case 'warning':
                return { background: '#FEF3C7', border: '#FBBF24', color: '#92400E', icon: <AlertCircle size={20} color="#FBBF24" /> };
            default:
                return { background: '#E1EFFE', border: '#76A9FA', color: '#1E429F', icon: <Info size={20} color="#76A9FA" /> };
        }
    };

    const styles = getStyles();

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 20px',
            background: styles.background,
            borderLeft: `4px solid ${styles.border}`,
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            color: styles.color,
            fontSize: '0.875rem',
            fontWeight: 600,
            minWidth: '300px',
            maxWidth: '450px',
            transform: isVisible ? 'translateX(0)' : 'translateX(100px)',
            opacity: isVisible ? 1 : 0,
            transition: 'all 0.3s ease-out',
            pointerEvents: 'auto',
            animation: 'toast-in 0.3s ease-out'
        }}>
            <style>
                {`
                    @keyframes toast-in {
                        from { transform: translateX(100px); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                `}
            </style>
            <div style={{ flexShrink: 0 }}>{styles.icon}</div>
            <div style={{ flexGrow: 1 }}>{message}</div>
            <button
                onClick={() => {
                    setIsVisible(false);
                    setTimeout(onClose, 300);
                }}
                style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    color: 'inherit',
                    opacity: 0.6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
            >
                <X size={16} />
            </button>
        </div>
    );
};

export default Toast;
