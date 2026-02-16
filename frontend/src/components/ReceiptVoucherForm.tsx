
import React, { useState, useEffect } from 'react';
import { Save, Calendar, DollarSign, Paperclip, File as FileIcon, Download, Trash2 } from 'lucide-react';
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
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        customer_name: '', // Changed from lead to customer_name
        payment_date: new Date().toISOString().split('T')[0],
        reference_number: '',
        payment_method: 'Bank Transfer (NEFT)',
        deposit_to: '',
        amount_received: '0',
        tds_receivable: '0',
        tds_percentage: '0',
        bank_charges: '0',
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

    useEffect(() => {
        if (invoices.length > 0) {
            const amountReceived = parseFloat(formData.amount_received || '0');
            const totalBankCharges = parseFloat(formData.bank_charges || '0');
            const tdsPercent = parseFloat(formData.tds_percentage || '0');

            let remainingPool = amountReceived + totalBankCharges;
            let totalTds = 0;
            const newAdjustments: any[] = [];

            // Proportion factors to split allocated pool back into payment and charges
            const totalRemittance = amountReceived + totalBankCharges;
            const paymentRatio = totalRemittance > 0 ? amountReceived / totalRemittance : 1;
            const chargesRatio = totalRemittance > 0 ? totalBankCharges / totalRemittance : 0;

            // Sort invoices by date (FIFO)
            const sortedInvoices = [...invoices].sort((a, b) =>
                new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime()
            );

            for (const inv of sortedInvoices) {
                if (remainingPool <= 0 && tdsPercent === 0) break;
                if (remainingPool <= 0 && newAdjustments.length >= sortedInvoices.length) break;

                const openBalance = parseFloat(inv.open_balance);
                const totalAmount = parseFloat(inv.total_amount);
                const tdsFactor = tdsPercent / 100;

                // Calculate the target TDS for the ENTIRE invoice
                const fullInvoiceTds = totalAmount * tdsFactor;

                // The amount of TDS we can still take for this invoice is limited by the open balance
                const targetTds = Math.min(openBalance, fullInvoiceTds);
                const targetNet = openBalance - targetTds;

                let allocatedPool = 0;
                let allocatedTds = 0;

                if (remainingPool >= targetNet) {
                    allocatedPool = targetNet;
                    allocatedTds = targetTds;
                } else {
                    allocatedPool = remainingPool;
                    // Pro-rate the TDS if we can't even cover the target net
                    if (targetNet > 0) {
                        allocatedTds = (allocatedPool / targetNet) * targetTds;
                    } else {
                        // If targetNet is 0, it means openBalance is entirely TDS
                        allocatedTds = targetTds;
                    }
                }

                if (allocatedPool > 0 || allocatedTds > 0) {
                    // Split allocatedPool into payment and charges based on ratios
                    const paymentPart = allocatedPool * paymentRatio;
                    const chargesPart = allocatedPool * chargesRatio;

                    newAdjustments.push({
                        invoice: inv.id,
                        payment_amount: paymentPart.toFixed(2),
                        tds_amount: allocatedTds.toFixed(2),
                        bank_charges: chargesPart.toFixed(2)
                    });
                }

                remainingPool -= allocatedPool;
                totalTds += allocatedTds;
            }

            setFormData(prev => ({
                ...prev,
                adjustments: newAdjustments,
                tds_receivable: totalTds.toFixed(2)
            }));
        }
    }, [formData.amount_received, formData.tds_percentage, formData.bank_charges, invoices]);

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
                tds_percentage: '0',
                bank_charges: '0',
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
    const totalChargesAdjusted = formData.adjustments.reduce((sum, a) => sum + parseFloat(a.bank_charges || 0), 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Dashboard Style Heading */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '4px', height: '18px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        Receipt Vouchers
                    </h2>
                </div>
            </div>

            {/* Form Container (Card) */}
            <div style={{
                background: 'white',
                border: '1px solid #E0E6ED',
                borderRadius: '12px',
                width: '100%',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Replicated Control Bar from Dashboard */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderBottom: '1px solid #F1F5F9'
                }}>
                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        background: 'white',
                        padding: '6px',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}>
                        <button
                            onClick={onBack}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: 'transparent',
                                color: '#64748B'
                            }}
                        >
                            FOR REVIEW
                        </button>
                        <button
                            onClick={onBack}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: 'transparent',
                                color: '#64748B'
                            }}
                        >
                            RECONCILED
                        </button>
                    </div>

                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        background: 'white',
                        padding: '6px',
                        borderRadius: '12px',
                        border: '1px solid #E0E6ED',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                    }}>
                        <button
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 16px',
                                height: '32px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'default',
                                transition: 'all 0.2s',
                                background: 'var(--theme-primary)',
                                color: 'white',
                                boxShadow: 'var(--shadow-md)'
                            }}
                        >
                            {id ? 'View Receipt' : 'Create Receipt'}
                        </button>
                    </div>
                </div>

                {/* Main Form Content */}
                <div style={{ padding: '24px', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                        <span style={{
                            width: '4px',
                            height: '18px',
                            background: 'var(--ae-blue)',
                            borderRadius: '2px'
                        }}></span>
                        <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', margin: 0 }}>
                            {id ? 'Edit Receipt Voucher' : 'Create Receipt Voucher'}
                        </h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Customer Name</label>
                            <select
                                style={{ width: '100%', padding: '6px 12px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none', height: '38px' }}
                                value={formData.customer_name}
                                onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                            >
                                <option value="">Select Customer</option>
                                {uniqueCustomers.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Payment Date</label>
                            <div style={{ position: 'relative' }}>
                                <Calendar size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0', pointerEvents: 'none' }} />
                                <input
                                    type="date"
                                    style={{ width: '100%', padding: '6px 12px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none', height: '38px' }}
                                    value={formData.payment_date}
                                    onChange={e => setFormData({ ...formData, payment_date: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Reference Number</label>
                            <input
                                style={{ width: '100%', padding: '6px 12px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none', height: '38px' }}
                                placeholder="Cheque / UTR / Ref No"
                                value={formData.reference_number}
                                onChange={e => setFormData({ ...formData, reference_number: e.target.value })}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Payment Method</label>
                            <select
                                style={{ width: '100%', padding: '6px 12px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none', height: '38px' }}
                                value={formData.payment_method}
                                onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
                            >
                                <option>Bank Transfer (NEFT)</option>
                                <option>Cheque</option>
                                <option>Cash</option>
                                <option>Credit Card</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Deposit To (Bank)</label>
                            <select
                                style={{ width: '100%', padding: '6px 12px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none', height: '38px' }}
                                value={formData.deposit_to}
                                onChange={e => setFormData({ ...formData, deposit_to: e.target.value })}
                            >
                                <option value="">Select Bank Account</option>
                                {bankConnections.map(b => <option key={b.id} value={b.id}>{b.bank_name} - {b.account_number}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Amount Received</label>
                            <div style={{ position: 'relative' }}>
                                <DollarSign size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0', pointerEvents: 'none' }} />
                                <input
                                    type="number"
                                    style={{ width: '100%', padding: '6px 12px 6px 32px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none', height: '38px' }}
                                    value={formData.amount_received}
                                    onChange={e => setFormData({ ...formData, amount_received: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Bank Charges</label>
                            <div style={{ position: 'relative' }}>
                                <DollarSign size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0', pointerEvents: 'none' }} />
                                <input
                                    type="number"
                                    style={{ width: '100%', padding: '6px 12px 6px 32px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none', height: '38px' }}
                                    value={formData.bank_charges}
                                    onChange={e => setFormData({ ...formData, bank_charges: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>TDS Receivable</label>
                            <div style={{ position: 'relative' }}>
                                <DollarSign size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0', pointerEvents: 'none' }} />
                                <input
                                    type="number"
                                    style={{ width: '100%', padding: '6px 12px 6px 32px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500, color: '#2D3748', outline: 'none', height: '38px' }}
                                    value={formData.tds_receivable}
                                    readOnly
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>TDS (%)</label>
                            <input
                                type="number"
                                style={{ width: '100%', padding: '6px 12px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none', height: '38px' }}
                                value={formData.tds_percentage}
                                onChange={e => setFormData({ ...formData, tds_percentage: e.target.value })}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Exchange Rate</label>
                            <input
                                type="number"
                                step="0.0001"
                                style={{ width: '100%', padding: '6px 12px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none', height: '38px' }}
                                value={formData.exchange_rate}
                                onChange={e => setFormData({ ...formData, exchange_rate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '24px', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#2D3748', marginBottom: '16px' }}>Outstanding Transactions</h3>

                        <div className="ae-table-container" style={{ maxHeight: '40vh', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                            <table className="ae-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '32px', textAlign: 'center' }}>#</th>
                                        <th>Inv. No</th>
                                        <th>Project</th>
                                        <th>Date</th>
                                        <th>Due Date</th>
                                        <th style={{ textAlign: 'right' }}>Orig. Amt</th>
                                        <th style={{ textAlign: 'right' }}>Open Bal.</th>
                                        <th style={{ width: '100px', textAlign: 'right' }}>Payment</th>
                                        <th style={{ width: '100px', textAlign: 'right' }}>TDS</th>
                                        <th style={{ width: '100px', textAlign: 'right' }}>Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: '#718096', fontSize: '0.85rem' }}>
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
                                                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                        />
                                                    </td>
                                                    <td style={{ fontWeight: 600 }}>{inv.invoice_no}</td>
                                                    <td>{inv.project_name}</td>
                                                    <td>{inv.invoice_date}</td>
                                                    <td>{inv.due_date}</td>
                                                    <td style={{ textAlign: 'right' }}>${parseFloat(inv.total_amount).toLocaleString()}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#E53E3E' }}>${parseFloat(inv.open_balance).toLocaleString()}</td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            style={{ width: '100%', height: '28px', fontSize: '12px', textAlign: 'right', padding: '4px 8px', border: '1px solid #E2E8F0', borderRadius: '6px', outline: 'none' }}
                                                            placeholder="0.00"
                                                            value={adjustment?.payment_amount || ''}
                                                            onChange={e => handleAdjustmentChange(inv.id, 'payment_amount', e.target.value)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            style={{ width: '100%', height: '28px', fontSize: '12px', textAlign: 'right', padding: '4px 8px', border: '1px solid #E2E8F0', borderRadius: '6px', outline: 'none' }}
                                                            placeholder="0.00"
                                                            value={adjustment?.tds_amount || ''}
                                                            onChange={e => handleAdjustmentChange(inv.id, 'tds_amount', e.target.value)}
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
                                            <td colSpan={7} style={{ textAlign: 'right', fontWeight: 700, padding: '12px', fontSize: '0.85rem' }}>Totals:</td>
                                            <td style={{ fontWeight: 800, color: '#FF6B00', textAlign: 'right', padding: '12px', fontSize: '0.85rem' }}>${totalAdjusted.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td style={{ fontWeight: 800, color: '#FF6B00', textAlign: 'right', padding: '12px', fontSize: '0.85rem' }}>${totalTdsAdjusted.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td style={{ padding: '12px' }}></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>

                    {/* Attachments Section */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '8px' }}>
                            Attachments
                        </label>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            padding: '4px 12px',
                            background: '#F8FAFC',
                            borderRadius: '12px',
                            border: '1px solid #E0E6ED',
                            width: 'fit-content',
                            minWidth: 'fit-content',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                        }}>
                            <input
                                type="file"
                                id="file-upload"
                                multiple
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                    if (e.target.files) {
                                        setFormData(prev => ({
                                            ...prev,
                                            attachments: [...prev.attachments, ...Array.from(e.target.files || [])]
                                        }));
                                    }
                                }}
                            />
                            <button
                                onClick={() => document.getElementById('file-upload')?.click()}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: 'white',
                                    color: '#1a1f36',
                                    border: '1px solid #E0E6ED',
                                    height: '34px',
                                    padding: '0 16px',
                                    borderRadius: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    whiteSpace: 'nowrap'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#FF6B00';
                                    e.currentTarget.style.color = 'white';
                                    e.currentTarget.style.borderColor = '#FF6B00';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'white';
                                    e.currentTarget.style.color = '#1a1f36';
                                    e.currentTarget.style.borderColor = '#E0E6ED';
                                }}
                            >
                                <Paperclip size={14} /> Attachments
                            </button>

                            {/* File List pills */}
                            <div style={{
                                flex: 1,
                                display: 'flex',
                                gap: '8px',
                                overflowX: 'auto',
                                padding: '4px 0',
                                alignItems: 'center'
                            }}>
                                {formData.attachments.length > 0 ? (
                                    formData.attachments.map((file, index) => (
                                        <div key={index} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '4px 10px',
                                            background: 'white',
                                            borderRadius: '8px',
                                            border: '1px solid #E0E6ED',
                                            minWidth: 'fit-content'
                                        }}>
                                            <FileIcon size={12} style={{ color: '#FF6B00' }} />
                                            <span style={{
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                color: '#1a1f36',
                                                maxWidth: '120px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {file.name}
                                            </span>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const url = URL.createObjectURL(file);
                                                        window.open(url, '_blank');
                                                        // Note: we should revoke object URL eventually, but for this quick view it's okay, or we can handle it better. 
                                                        // For simplicity in this context, we just open it.
                                                    }}
                                                    style={{
                                                        width: '22px',
                                                        height: '22px',
                                                        borderRadius: '50%',
                                                        border: 'none',
                                                        background: '#f1f5f9',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        color: '#475569'
                                                    }}
                                                    title="View/Download"
                                                >
                                                    <Download size={10} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            attachments: prev.attachments.filter((_, i) => i !== index)
                                                        }));
                                                    }}
                                                    style={{
                                                        width: '22px',
                                                        height: '22px',
                                                        borderRadius: '50%',
                                                        border: 'none',
                                                        background: '#fee2e2',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        color: '#ef4444'
                                                    }}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={10} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <span style={{ fontSize: '0.9rem', color: '#A0AEC0', fontStyle: 'italic', marginLeft: '10px' }}>No attachments yet</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{
                        padding: '16px 24px',
                        background: '#F8FAFC',
                        borderRadius: '12px',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '32px',
                        border: '1px solid #E2E8F0'
                    }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.75rem', color: '#718096', marginBottom: '4px', fontWeight: 600 }}>Bank Charges Diff:</div>
                            <div style={{
                                fontSize: '0.95rem',
                                fontWeight: 800,
                                color: Math.abs(parseFloat(formData.bank_charges) - totalChargesAdjusted) < 0.01 ? '#00C853' : '#E53E3E'
                            }}>
                                ${(parseFloat(formData.bank_charges) - totalChargesAdjusted).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.75rem', color: '#718096', marginBottom: '4px', fontWeight: 600 }}>TDS Difference:</div>
                            <div style={{
                                fontSize: '0.95rem',
                                fontWeight: 800,
                                color: Math.abs(parseFloat(formData.tds_receivable) - totalTdsAdjusted) < 0.01 ? '#00C853' : '#E53E3E'
                            }}>
                                ${(parseFloat(formData.tds_receivable) - totalTdsAdjusted).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.75rem', color: '#718096', marginBottom: '4px', fontWeight: 600 }}>Amount Difference:</div>
                            <div style={{
                                fontSize: '1.15rem',
                                fontWeight: 900,
                                color: Math.abs(parseFloat(formData.amount_received) - totalAdjusted) < 0.01 ? '#00C853' : '#E53E3E'
                            }}>
                                ${(parseFloat(formData.amount_received) - totalAdjusted).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'white',
                padding: '8px',
                borderRadius: '12px',
                border: '1px solid #E0E6ED',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                width: 'fit-content',
                marginLeft: 'auto'
            }}>
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 24px',
                        background: (!hoveredBtn || hoveredBtn === 'save') && !showCancelModal ? 'var(--theme-primary)' : 'transparent',
                        color: showCancelModal ? '#CBD5E0' : ((!hoveredBtn || hoveredBtn === 'save') ? 'white' : 'var(--text-secondary)'),
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        fontWeight: 800,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: (!hoveredBtn || hoveredBtn === 'save') && !showCancelModal ? '0 4px 12px rgba(187, 77, 0, 0.2)' : 'none'
                    }}
                    onMouseEnter={() => setHoveredBtn('save')}
                    onMouseLeave={() => setHoveredBtn(null)}
                >
                    {loading ? <Save className="animate-spin" size={18} /> : <Save size={18} />}
                    {id ? 'Update Receipt' : 'Save Receipt'}
                </button>
                <button
                    onClick={() => setShowCancelModal(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 20px',
                        background: showCancelModal || hoveredBtn === 'cancel' ? 'var(--theme-primary)' : 'transparent',
                        color: showCancelModal || hoveredBtn === 'cancel' ? 'white' : 'var(--text-secondary)',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: showCancelModal || hoveredBtn === 'cancel' ? '0 4px 12px rgba(187, 77, 0, 0.2)' : 'none'
                    }}
                    onMouseEnter={() => setHoveredBtn('cancel')}
                    onMouseLeave={() => setHoveredBtn(null)}
                >
                    <span style={{ fontSize: '18px', lineHeight: '10px' }}>×</span>
                    <span>Cancel</span>
                </button>
            </div>

            {/* Cancel Confirmation Modal */}
            {showCancelModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(255, 255, 255, 0.4)',
                    backdropFilter: 'blur(1px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        background: 'white',
                        width: '100%',
                        maxWidth: '500px',
                        borderRadius: '12px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        border: '1px solid #E2E8F0',
                        overflow: 'hidden',
                        animation: 'modalScale 0.2s ease-out'
                    }}>
                        <div style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: '#FFF5F5',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 9V11M12 15H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0378 2.66667 10.268 4L3.33978 16C2.56998 17.3333 3.53223 19 5.07183 19Z" stroke="#E53E3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', fontWeight: 800, color: '#1a1f36' }}>
                                        Leave this page?
                                    </h3>
                                    <p style={{ margin: 0, color: '#4A5568', fontSize: '0.95rem', lineHeight: 1.5 }}>
                                        If you leave, your unsaved changes will be discarded.
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '32px' }}>
                                <button
                                    onClick={() => setShowCancelModal(false)}
                                    style={{
                                        flex: 1,
                                        padding: '10px 16px',
                                        borderRadius: '8px',
                                        background: '#3B82F6',
                                        color: 'white',
                                        border: 'none',
                                        fontSize: '0.9rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        height: '40px'
                                    }}
                                >
                                    Stay Here
                                </button>
                                <button
                                    onClick={() => {
                                        setShowCancelModal(false);
                                        onBack();
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '10px 16px',
                                        borderRadius: '8px',
                                        background: 'white',
                                        color: '#1a1f36',
                                        border: '1px solid #E2E8F0',
                                        fontSize: '0.9rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        height: '40px'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#F7FAFC'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                >
                                    Leave & Discard Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReceiptVoucherForm;
