import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, DollarSign, FileText } from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';

const InvoiceForm: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { showNotification } = useNotification();
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        invoice_no: '',
        lead: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        total_amount: '',
        open_balance: '',
    });

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        try {
            const response = await api.get('/leads/');
            setLeads(response.data);
        } catch (error) {
            console.error('Error fetching leads', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Auto-set open_balance to total_amount if not set
            const submissionData = {
                ...formData,
                open_balance: formData.open_balance || formData.total_amount
            };
            await api.post('/finance/invoices/', submissionData);
            showNotification('Invoice created successfully', 'success');
            onBack();
        } catch (error) {
            console.error('Error creating invoice', error);
            showNotification('Error creating invoice', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#718096', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    <ArrowLeft size={18} /> Back to Dashboard
                </button>
                <button onClick={handleSubmit} disabled={loading} className="ae-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Save size={18} /> {loading ? 'Saving...' : 'Save Invoice'}
                </button>
            </div>

            <div className="glass-card" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255, 107, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={20} color="#FF6B00" />
                    </div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1a1f36', margin: 0 }}>Create New Invoice</h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                    <div className="ae-input-group">
                        <label className="ae-label">Invoice Number</label>
                        <input
                            className="ae-input"
                            placeholder="e.g. INV-2024-001"
                            required
                            value={formData.invoice_no}
                            onChange={e => setFormData({ ...formData, invoice_no: e.target.value })}
                        />
                    </div>
                    <div className="ae-input-group">
                        <label className="ae-label">Customer</label>
                        <select
                            className="ae-input"
                            required
                            value={formData.lead}
                            onChange={e => setFormData({ ...formData, lead: e.target.value })}
                        >
                            <option value="">Select Customer</option>
                            {/* Display unique customer names */}
                            {Array.from(new Map(leads.map(lead => [lead.customer_name, lead])).values()).map((l: any) => (
                                <option key={l.id} value={l.id}>{l.customer_name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="ae-input-group">
                        <label className="ae-label">Invoice Date</label>
                        <input
                            type="date"
                            className="ae-input"
                            required
                            value={formData.invoice_date}
                            onChange={e => setFormData({ ...formData, invoice_date: e.target.value })}
                        />
                    </div>
                    <div className="ae-input-group">
                        <label className="ae-label">Due Date</label>
                        <input
                            type="date"
                            className="ae-input"
                            required
                            value={formData.due_date}
                            onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                        />
                    </div>
                    <div className="ae-input-group">
                        <label className="ae-label">Total Amount</label>
                        <div style={{ position: 'relative' }}>
                            <DollarSign size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0' }} />
                            <input
                                type="number"
                                className="ae-input"
                                style={{ paddingLeft: '36px' }}
                                required
                                value={formData.total_amount}
                                onChange={e => setFormData({ ...formData, total_amount: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceForm;
