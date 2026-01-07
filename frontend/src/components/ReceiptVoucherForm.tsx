
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Receipt as ReceiptIcon, Calendar, DollarSign, Upload } from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';

interface ReceiptVoucherFormProps {
    id: number | null;
    onBack: () => void;
}

const ReceiptVoucherForm: React.FC<ReceiptVoucherFormProps> = ({ id, onBack }) => {
    const { showNotification } = useNotification();
    const [leads, setLeads] = useState<any[]>([]);
    const [bankConnections, setBankConnections] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        customer_name: '', // Changed from lead to customer_name
        payment_date: new Date().toISOString().split('T')[0],
        reference_number: '',
        payment_method: 'Bank Transfer (NEFT)',
        deposit_to: '',
        amount_received: '0',
        tds_receivable: '0',
        exchange_rate: '1',
        adjustments: [] as any[],
        attachments: [] as File[]
    });

    useEffect(() => {
        fetchLeads();
        fetchBankConnections();
        if (id) {
            fetchVoucher(id);
        }
    }, [id]);

    useEffect(() => {
        if (formData.customer_name) {
            fetchInvoices(formData.customer_name);
        } else {
            setInvoices([]);
        }
    }, [formData.customer_name]);

    const fetchLeads = async () => {
        try {
            const response = await api.get('/leads/');
            setLeads(response.data);
        } catch (error) {
            console.error('Error fetching leads', error);
        }
    };

    const fetchBankConnections = async () => {
        try {
            const response = await api.get('/finance/bank-connections/');
            setBankConnections(response.data);
        } catch (error) {
            console.error('Error fetching banks', error);
        }
    };

    const fetchInvoices = async (customerName: string) => {
        try {
            console.log('Fetching invoices for customer:', customerName);
            const response = await api.get(`/finance/invoices/?customer_name=${encodeURIComponent(customerName)}`);
            console.log('Invoices response:', response.data);
            // Filter for invoices with open balance on the frontend
            const openInvoices = response.data.filter((inv: any) => parseFloat(inv.open_balance) > 0);
            console.log('Open invoices:', openInvoices);
            setInvoices(openInvoices);
        } catch (error) {
            console.error('Error fetching invoices', error);
        }
    };

    const fetchVoucher = async (voucherId: number) => {
        try {
            const response = await api.get(`/finance/receipt-vouchers/${voucherId}/`);
            const voucher = response.data;

            // Populate form with voucher data
            setFormData({
                customer_name: voucher.customer_name || '',
                payment_date: voucher.payment_date || '',
                reference_number: voucher.reference_number || '',
                payment_method: voucher.payment_method || 'Bank Transfer (NEFT)',
                deposit_to: voucher.deposit_to || '',
                amount_received: voucher.amount_received || '0',
                tds_receivable: voucher.tds_receivable || '0',
                exchange_rate: voucher.exchange_rate || '1',
                adjustments: voucher.adjustments || [],
                attachments: [] // Attachments not loaded for now, can be added if API supports
            });
        } catch (error) {
            console.error('Error fetching voucher', error);
            showNotification('Error loading receipt voucher', 'error');
        }
    };

    // Derive unique customer names from leads
    const uniqueCustomers = Array.from(new Set(leads.map(l => l.customer_name))).sort();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = new FormData();
            data.append('customer_name', formData.customer_name);
            data.append('payment_date', formData.payment_date);
            data.append('reference_number', formData.reference_number);
            data.append('payment_method', formData.payment_method);
            data.append('deposit_to', formData.deposit_to);
            data.append('amount_received', formData.amount_received);
            data.append('tds_receivable', formData.tds_receivable);
            data.append('exchange_rate', formData.exchange_rate);

            // Adjustments need to be sent as JSON string due to FormData limitations with nested arrays
            data.append('adjustments', JSON.stringify(formData.adjustments));

            formData.attachments.forEach(file => {
                data.append('attachments', file);
            });

            await api.post('/finance/receipt-vouchers/', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showNotification('Receipt Voucher created successfully', 'success');
            onBack();
        } catch (error) {
            console.error('Error creating receipt voucher', error);
            showNotification('Error creating receipt voucher', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAdjustmentChange = (invoiceId: number, field: string, value: string) => {
        const existing = formData.adjustments.find(a => a.invoice === invoiceId);
        let newAdjustments;
        if (existing) {
            newAdjustments = formData.adjustments.map(a =>
                a.invoice === invoiceId ? { ...a, [field]: value } : a
            );
        } else {
            newAdjustments = [...formData.adjustments, { invoice: invoiceId, [field]: value }];
        }
        setFormData({ ...formData, adjustments: newAdjustments });
    };

    const totalAdjusted = formData.adjustments.reduce((sum, a) => sum + parseFloat(a.payment_amount || 0), 0);
    const totalTdsAdjusted = formData.adjustments.reduce((sum, a) => sum + parseFloat(a.tds_amount || 0), 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#718096', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    <ArrowLeft size={18} /> Back to Dashboard
                </button>
                <button onClick={handleSubmit} disabled={loading} className="ae-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Save size={18} /> {loading ? 'Saving...' : 'Save Receipt'}
                </button>
            </div>

            <div className="glass-card" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255, 107, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ReceiptIcon size={20} color="#FF6B00" />
                    </div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1a1f36', margin: 0 }}>Create Receipt Voucher</h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '40px' }}>
                    <div className="ae-input-group">
                        <label className="ae-label">Customer Name</label>
                        <select
                            className="ae-input"
                            value={formData.customer_name}
                            onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                        >
                            <option value="">Select Customer</option>
                            {uniqueCustomers.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="ae-input-group">
                        <label className="ae-label">Payment Date</label>
                        <div style={{ position: 'relative' }}>
                            <Calendar size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0', pointerEvents: 'none' }} />
                            <input
                                type="date"
                                className="ae-input"
                                style={{ paddingLeft: '44px' }}
                                value={formData.payment_date}
                                onChange={e => setFormData({ ...formData, payment_date: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="ae-input-group">
                        <label className="ae-label">Reference Number</label>
                        <input
                            className="ae-input"
                            placeholder="Cheque / UTR / Ref No"
                            value={formData.reference_number}
                            onChange={e => setFormData({ ...formData, reference_number: e.target.value })}
                        />
                    </div>
                    <div className="ae-input-group">
                        <label className="ae-label">Payment Method</label>
                        <select
                            className="ae-input"
                            value={formData.payment_method}
                            onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
                        >
                            <option>Bank Transfer (NEFT)</option>
                            <option>Cheque</option>
                            <option>Cash</option>
                            <option>Credit Card</option>
                        </select>
                    </div>
                    <div className="ae-input-group">
                        <label className="ae-label">Deposit To (Bank)</label>
                        <select
                            className="ae-input"
                            value={formData.deposit_to}
                            onChange={e => setFormData({ ...formData, deposit_to: e.target.value })}
                        >
                            <option value="">Select Bank Account</option>
                            {bankConnections.map(b => <option key={b.id} value={b.id}>{b.bank_name} - {b.account_number}</option>)}
                        </select>
                    </div>
                    <div className="ae-input-group">
                        <label className="ae-label">Amount Received</label>
                        <div style={{ position: 'relative' }}>
                            <DollarSign size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0', pointerEvents: 'none' }} />
                            <input
                                type="number"
                                className="ae-input"
                                style={{ paddingLeft: '44px' }}
                                value={formData.amount_received}
                                onChange={e => setFormData({ ...formData, amount_received: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="ae-input-group">
                        <label className="ae-label">TDS Receivable</label>
                        <div style={{ position: 'relative' }}>
                            <DollarSign size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0', pointerEvents: 'none' }} />
                            <input
                                type="number"
                                className="ae-input"
                                style={{ paddingLeft: '44px' }}
                                value={formData.tds_receivable}
                                onChange={e => setFormData({ ...formData, tds_receivable: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="ae-input-group">
                        <label className="ae-label">Exchange Rate</label>
                        <input
                            type="number"
                            step="0.0001"
                            className="ae-input"
                            value={formData.exchange_rate}
                            onChange={e => setFormData({ ...formData, exchange_rate: e.target.value })}
                        />
                    </div>
                </div>

                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '32px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#2D3748', marginBottom: '20px' }}>Outstanding Transactions</h3>

                    <div className="ae-table-container">
                        <table className="ae-table" style={{ background: 'white' }}>
                            <thead>
                                <tr>
                                    <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                                    <th>Inv. No</th>
                                    <th>Project</th>
                                    <th>Date</th>
                                    <th>Due Date</th>
                                    <th style={{ textAlign: 'right' }}>Orig. Amt</th>
                                    <th style={{ textAlign: 'right' }}>Open Bal.</th>
                                    <th style={{ width: '120px', textAlign: 'right' }}>Payment</th>
                                    <th style={{ width: '120px', textAlign: 'right' }}>TDS</th>
                                    <th style={{ width: '120px', textAlign: 'right' }}>Charges</th>
                                    <th style={{ width: '120px', textAlign: 'right' }}>Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
                                            {formData.customer_name ? 'No outstanding invoices for this customer.' : 'Select a customer to see invoices.'}
                                        </td>
                                    </tr>
                                ) : (
                                    invoices.map(inv => {
                                        const adjustment = formData.adjustments.find(a => a.invoice === inv.id);
                                        const paymentAmt = parseFloat(adjustment?.payment_amount || '0');
                                        const tdsAmt = parseFloat(adjustment?.tds_amount || '0');
                                        const bankChargesAmt = parseFloat(adjustment?.bank_charges || '0');
                                        const remainingBalance = parseFloat(inv.open_balance) - paymentAmt - tdsAmt - bankChargesAmt;

                                        const isSelected = !!adjustment;

                                        return (
                                            <tr key={inv.id} style={{ background: isSelected ? 'rgba(255, 107, 0, 0.05)' : 'transparent' }}>
                                                <td style={{ textAlign: 'center' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                handleAdjustmentChange(inv.id, 'payment_amount', '0');
                                                            } else {
                                                                setFormData({
                                                                    ...formData,
                                                                    adjustments: formData.adjustments.filter(a => a.invoice !== inv.id)
                                                                });
                                                            }
                                                        }}
                                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                    />
                                                </td>
                                                <td style={{ fontWeight: 600 }}>{inv.invoice_no}</td>
                                                <td style={{ fontSize: '0.85rem' }}>{inv.project_name}</td>
                                                <td>{inv.invoice_date}</td>
                                                <td>{inv.due_date}</td>
                                                <td style={{ textAlign: 'right' }}>${parseFloat(inv.total_amount).toLocaleString()}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 700, color: '#E53E3E' }}>${parseFloat(inv.open_balance).toLocaleString()}</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="ae-input"
                                                        style={{ height: '32px', fontSize: '12px', textAlign: 'right' }}
                                                        placeholder="0.00"
                                                        value={adjustment?.payment_amount || ''}
                                                        onChange={e => handleAdjustmentChange(inv.id, 'payment_amount', e.target.value)}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="ae-input"
                                                        style={{ height: '32px', fontSize: '12px', textAlign: 'right' }}
                                                        placeholder="0.00"
                                                        value={adjustment?.tds_amount || ''}
                                                        onChange={e => handleAdjustmentChange(inv.id, 'tds_amount', e.target.value)}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="ae-input"
                                                        style={{ height: '32px', fontSize: '12px', textAlign: 'right' }}
                                                        placeholder="0.00"
                                                        value={adjustment?.bank_charges || ''}
                                                        onChange={e => handleAdjustmentChange(inv.id, 'bank_charges', e.target.value)}
                                                    />
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 700, color: remainingBalance <= 0 ? '#00C853' : '#4A5568' }}>
                                                    ${remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                            {invoices.length > 0 && (
                                <tfoot>
                                    <tr style={{ background: '#F7FAFC' }}>
                                        <td colSpan={5} style={{ textAlign: 'right', fontWeight: 700 }}>Totals:</td>
                                        <td></td>
                                        <td style={{ fontWeight: 800, color: '#FF6B00', textAlign: 'right' }}>${totalAdjusted.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td style={{ fontWeight: 800, color: '#FF6B00', textAlign: 'right' }}>${totalTdsAdjusted.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td style={{ fontWeight: 800, color: '#FF6B00', textAlign: 'right' }}>
                                            ${formData.adjustments.reduce((sum, a) => sum + parseFloat(a.bank_charges || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>

                <div className="ae-input-group" style={{ marginBottom: '20px' }}>
                    <label className="ae-label">Attachments</label>
                    <div style={{ padding: '20px', border: '2px dashed #E2E8F0', borderRadius: '12px', textAlign: 'center' }}>
                        <input
                            type="file"
                            multiple
                            style={{ display: 'none' }}
                            id="file-upload"
                            onChange={e => {
                                if (e.target.files) {
                                    setFormData({ ...formData, attachments: Array.from(e.target.files) });
                                }
                            }}
                        />
                        <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <Upload size={24} color="#CBD5E0" />
                            <span style={{ color: '#718096', fontWeight: 600 }}>Click to upload files</span>
                            <span style={{ fontSize: '0.8rem', color: '#A0AEC0' }}>
                                {formData.attachments.length > 0
                                    ? `${formData.attachments.length} file(s) selected`
                                    : 'Supports documents, images and PDFs'}
                            </span>
                        </label>
                    </div>
                </div>

                <div style={{
                    marginTop: '32px',
                    padding: '24px',
                    background: '#F8FAFC',
                    borderRadius: '12px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '40px'
                }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: '#718096', marginBottom: '4px' }}>TDS Difference:</div>
                        <div style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: Math.abs(parseFloat(formData.tds_receivable) - totalTdsAdjusted) < 0.01 ? '#00C853' : '#E53E3E'
                        }}>
                            ${(parseFloat(formData.tds_receivable) - totalTdsAdjusted).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: '#718096', marginBottom: '4px' }}>Amount Difference:</div>
                        <div style={{
                            fontSize: '1.25rem',
                            fontWeight: 800,
                            color: Math.abs(parseFloat(formData.amount_received) - totalAdjusted) < 0.01 ? '#00C853' : '#E53E3E'
                        }}>
                            ${(parseFloat(formData.amount_received) - totalAdjusted).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReceiptVoucherForm;
