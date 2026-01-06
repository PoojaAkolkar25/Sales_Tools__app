import React, { useState, useEffect } from 'react';
import { FileText, Plus, RefreshCw } from 'lucide-react';
import api from '../api';
import InvoiceForm from './InvoiceForm';

const InvoiceDashboard: React.FC = () => {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'dashboard' | 'form'>('dashboard');

    useEffect(() => {
        if (view === 'dashboard') {
            fetchInvoices();
        }
    }, [view]);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const response = await api.get('/finance/invoices/');
            setInvoices(response.data);
        } catch (error) {
            console.error('Error fetching invoices', error);
        } finally {
            setLoading(false);
        }
    };

    if (view === 'form') {
        return <InvoiceForm onBack={() => setView('dashboard')} />;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="ae-hero" style={{ padding: '24px 32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: 'rgba(255, 107, 0, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <FileText size={24} color="#FF6B00" />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FF6B00', margin: 0 }}>
                                Invoices
                            </h1>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                                Manage customer invoices and balances
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setView('form')} className="ae-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={18} /> Create Invoice
                    </button>
                </div>
            </div>

            <div className="ae-table-container">
                <table className="ae-table">
                    <thead>
                        <tr>
                            <th>Invoice No</th>
                            <th>Customer</th>
                            <th>Date</th>
                            <th>Due Date</th>
                            <th>Amount</th>
                            <th>Balance</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '100px' }}><RefreshCw className="animate-spin" style={{ margin: '0 auto' }} /></td></tr>
                        ) : invoices.length === 0 ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '100px', color: '#718096' }}>No invoices found.</td></tr>
                        ) : (
                            invoices.map(inv => (
                                <tr key={inv.id}>
                                    <td style={{ fontWeight: 700, color: '#FF6B00' }}>{inv.invoice_no}</td>
                                    <td style={{ fontWeight: 600 }}>{inv.customer_name}</td>
                                    <td>{inv.invoice_date}</td>
                                    <td>{inv.due_date}</td>
                                    <td style={{ fontWeight: 700 }}>${parseFloat(inv.total_amount).toLocaleString()}</td>
                                    <td style={{ fontWeight: 700, color: inv.status === 'PAID' ? '#00C853' : '#E53E3E' }}>
                                        ${parseFloat(inv.open_balance).toLocaleString()}
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '10px',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            background: inv.status === 'PAID' ? 'rgba(0, 200, 83, 0.1)' : 'rgba(255, 107, 0, 0.1)',
                                            color: inv.status === 'PAID' ? '#00C853' : '#FF6B00'
                                        }}>
                                            {inv.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InvoiceDashboard;
