import React, { useState } from 'react';
import { CreditCard, FileText, Settings } from 'lucide-react';
import ReceiptVoucherForm from './ReceiptVoucherForm';
import BankTransactionsDashboard from './BankTransactionsDashboard';
import BankConnectionSetup from './BankConnectionSetup';
import ReceiptVoucherDashboard from './ReceiptVoucherDashboard';

const Payment: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'BANK_TX' | 'RECEIPT' | 'BANK_SETUP'>('BANK_TX');
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
        <div className="ae-container" style={{ display: 'flex' }}>
            {/* Sidebar Navigation */}
            <div style={{
                width: '280px',
                background: 'white',
                borderRight: '1px solid #E2E8F0',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                height: 'calc(100vh - 100px)',
                position: 'sticky',
                top: '0'
            }}>
                <h2 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#A0AEC0', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', paddingLeft: '12px' }}>
                    Payment Module
                </h2>

                <button
                    onClick={() => { setActiveTab('BANK_TX'); setReceiptView('DASHBOARD'); }}
                    className={`ae-nav-item ${activeTab === 'BANK_TX' ? 'active' : ''}`}
                >
                    <CreditCard size={18} /> Bank Transactions
                </button>

                <button
                    onClick={() => { setActiveTab('RECEIPT'); setReceiptView('DASHBOARD'); }}
                    className={`ae-nav-item ${activeTab === 'RECEIPT' ? 'active' : ''}`}
                >
                    <FileText size={18} /> Receipt Vouchers
                </button>

                <button
                    onClick={() => { setActiveTab('BANK_SETUP'); setReceiptView('DASHBOARD'); }}
                    className={`ae-nav-item ${activeTab === 'BANK_SETUP' ? 'active' : ''}`}
                >
                    <Settings size={18} /> Bank Setup
                </button>
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
                {renderContent()}
            </div>
        </div>
    );
};

export default Payment;
