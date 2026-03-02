import React from 'react';

interface ConfirmModalProps {
    title: string;
    message?: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    title,
    onConfirm,
    onCancel,
    confirmText = 'Yes',
    cancelText = 'No'
}) => {
    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            animation: 'modal-fade 0.2s ease-out'
        }}>
            <style>
                {`
                    @keyframes modal-fade {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes modal-pop {
                        from { transform: scale(0.95); opacity: 0; }
                        to { transform: scale(1); opacity: 1; }
                    }
                `}
            </style>
            <div style={{
                background: 'white',
                padding: '32px',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '450px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                animation: 'modal-pop 0.2s ease-out'
            }}>
                {/* Body */}
                <div style={{ marginBottom: '32px' }}>
                    <h2 style={{
                        margin: 0,
                        fontSize: '1.4rem',
                        fontWeight: 600,
                        color: '#1a1f36',
                        lineHeight: 1.4
                    }}>
                        {title}
                    </h2>
                </div>

                {/* Footer */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px'
                }}>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '10px 32px',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontWeight: 700,
                            border: 'none',
                            background: 'var(--theme-primary, #FF6B00)',
                            color: 'white',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            minWidth: '100px',
                            boxShadow: '0 4px 12px rgba(255, 107, 0, 0.2)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--ae-orange-dark, #e66000)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(187, 77, 0, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--theme-primary, #FF6B00)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 0, 0.2)';
                        }}
                    >
                        {confirmText}
                    </button>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '10px 32px',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontWeight: 700,
                            border: '1px solid var(--ae-gray-100, #E2E8F0)',
                            background: 'white',
                            color: '#475569',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            minWidth: '100px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 107, 0, 0.05)';
                            e.currentTarget.style.color = 'var(--ae-orange, #FF6B00)';
                            e.currentTarget.style.borderColor = 'rgba(255, 107, 0, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.color = '#475569';
                            e.currentTarget.style.borderColor = 'var(--ae-gray-100, #E2E8F0)';
                        }}
                    >
                        {cancelText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
