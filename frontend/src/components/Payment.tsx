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
            {/* Horizontal Header Navigation */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '25px 41px',
                borderBottom: '1px solid #E2E8F0',
                background: '#F8FAFC'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <h2 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1a1f36', textTransform: 'uppercase', letterSpacing: '1.5px', margin: 0 }}>
                        Payment Module
                    </h2>

                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        background: 'white',
                        padding: '4px',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
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
                                boxShadow: activeTab === 'RECEIPT' ? '0 4px 12px rgba(255, 107, 0, 0.25)' : 'none'
                            }}
                            onMouseEnter={(e) => {
                                if (activeTab !== 'RECEIPT') {
                                    e.currentTarget.style.background = '#F7FAFC';
                                    e.currentTarget.style.color = '#FF6B00';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeTab !== 'RECEIPT') {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = '#718096';
                                }
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
                                boxShadow: activeTab === 'BANK_TX' ? '0 4px 12px rgba(255, 107, 0, 0.25)' : 'none'
                            }}
                            onMouseEnter={(e) => {
                                if (activeTab !== 'BANK_TX') {
                                    e.currentTarget.style.background = '#F7FAFC';
                                    e.currentTarget.style.color = '#FF6B00';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeTab !== 'BANK_TX') {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = '#718096';
                                }
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
                                boxShadow: activeTab === 'BANK_SETUP' ? '0 4px 12px rgba(255, 107, 0, 0.25)' : 'none'
                            }}
                            onMouseEnter={(e) => {
                                if (activeTab !== 'BANK_SETUP') {
                                    e.currentTarget.style.background = '#F7FAFC';
                                    e.currentTarget.style.color = '#FF6B00';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeTab !== 'BANK_SETUP') {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = '#718096';
                                }
                            }}
                        >
                            <Settings size={18} /> Bank Setup
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, padding: '32px 41px', overflowY: 'auto', background: 'white' }}>
                <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default Payment;
