import React, { useState } from 'react';
import { CreditCard, FileText, Settings } from 'lucide-react';
import ReceiptVoucherForm from './ReceiptVoucherForm';
import BankTransactionsDashboard from './BankTransactionsDashboard';
import BankConnectionSetup from './BankConnectionSetup';
import ReceiptVoucherDashboard from './ReceiptVoucherDashboard';

const Payment: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'BANK_TX' | 'RECEIPT' | 'BANK_SETUP'>('RECEIPT');
    const [receiptView, setReceiptView] = useState<'DASHBOARD' | 'FORM'>('DASHBOARD');
    const [voucherId, setVoucherId] = useState<number | null>(null);

    const handleViewVoucher = (id: number) => {
        setVoucherId(id);
        setReceiptView('FORM');
    };

    const handleBackToDashboard = () => {
        setVoucherId(null);
        setReceiptView('DASHBOARD');
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'BANK_TX':
                return <BankTransactionsDashboard />;
            case 'RECEIPT':
                return receiptView === 'DASHBOARD' ? (
                    <ReceiptVoucherDashboard
                        onCreateNew={() => { setVoucherId(null); setReceiptView('FORM'); }}
                        onView={handleViewVoucher}
                    />
                ) : (
                    <ReceiptVoucherForm id={voucherId} onBack={handleBackToDashboard} />
                );
            case 'BANK_SETUP':
                return <BankConnectionSetup />;
            default:
                return <BankTransactionsDashboard />;
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100%' }}>
            {/* Horizontal Sub-Navigation Area */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 8px',
                marginBottom: '12px',
                gap: '24px'
            }}>
                <div style={{
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'center',
                    background: 'white',
                    padding: '6px',
                    borderRadius: '12px',
                    border: '1px solid #E0E6ED',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                }}>
                    <button
                        onClick={() => { setActiveTab('RECEIPT'); setReceiptView('DASHBOARD'); }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 16px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: activeTab === 'RECEIPT' ? '#FF6B00' : 'transparent',
                            color: activeTab === 'RECEIPT' ? 'white' : '#718096',
                            boxShadow: activeTab === 'RECEIPT' ? '0 2px 8px rgba(255, 107, 0, 0.3)' : 'none'
                        }}
                    >
                        <FileText size={18} /> Receipt Vouchers
                    </button>

                    <button
                        onClick={() => { setActiveTab('BANK_TX'); setReceiptView('DASHBOARD'); }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 16px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: activeTab === 'BANK_TX' ? '#FF6B00' : 'transparent',
                            color: activeTab === 'BANK_TX' ? 'white' : '#718096',
                            boxShadow: activeTab === 'BANK_TX' ? '0 2px 8px rgba(255, 107, 0, 0.3)' : 'none'
                        }}
                    >
                        <CreditCard size={18} /> Bank Transactions
                    </button>

                    <button
                        onClick={() => { setActiveTab('BANK_SETUP'); setReceiptView('DASHBOARD'); }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 16px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: activeTab === 'BANK_SETUP' ? '#FF6B00' : 'transparent',
                            color: activeTab === 'BANK_SETUP' ? 'white' : '#718096',
                            boxShadow: activeTab === 'BANK_SETUP' ? '0 2px 8px rgba(255, 107, 0, 0.3)' : 'none'
                        }}
                    >
                        <Settings size={18} /> Bank Setup
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
                <div style={{ maxWidth: '1600px' }}>
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default Payment;
