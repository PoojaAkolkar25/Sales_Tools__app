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
                            fontWeight: 600,
                            border: 'none',
                            background: '#0061fe',
                            color: 'white',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            minWidth: '100px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '0.9';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '1';
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
                            fontWeight: 600,
                            border: 'none',
                            background: '#f1f5f9',
                            color: '#475569',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            minWidth: '100px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#e2e8f0';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#f1f5f9';
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
