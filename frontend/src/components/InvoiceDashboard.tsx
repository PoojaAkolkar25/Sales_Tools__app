import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Header Area */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '4px', height: '18px', background: '#FF6B00', borderRadius: '2px' }}></div>
                    <h1 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1a1f36', margin: 0 }}>
                        Invoices
                    </h1>
                </div>
                <button onClick={() => setView('form')} className="ae-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', fontSize: '0.8rem' }}>
                    <Plus size={16} /> Create Invoice
                </button>
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
