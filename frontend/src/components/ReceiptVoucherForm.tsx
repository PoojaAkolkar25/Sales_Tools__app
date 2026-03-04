
import React, { useState, useEffect } from 'react';
import { Save, Calendar, DollarSign, Paperclip, File as FileIcon, Download, Trash2, Eye, Check } from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import SearchableDropdown from './SearchableDropdown';
import { formatToAppDate } from '../utils/dateUtils';

interface ReceiptVoucherFormProps {
    id: number | null;
    onBack: () => void;
}

const ReceiptVoucherForm: React.FC<ReceiptVoucherFormProps> = ({ id, onBack }) => {
    const { showNotification, showConfirm } = useNotification();
    const [leads, setLeads] = useState<any[]>([]);
    const [bankConnections, setBankConnections] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeAction, setActiveAction] = useState<'save' | 'cancel' | null>('save');

    const [formData, setFormData] = useState({
        customer_name: '', // Changed from lead to customer_name
        payment_date: new Date().toISOString().split('T')[0],
        reference_number: '',
        payment_method: 'Bank Transfer (NEFT)',
        deposit_to: '',
        amount_received: '',
        tds_receivable: '',
        tds_percentage: '',
        bank_charges: '',
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
                amount_received: voucher.amount_received || '',
                tds_receivable: voucher.tds_receivable || '',
                tds_percentage: '',
                bank_charges: '',
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

    const SectionHeader = ({ title, extra }: { title: string, extra?: React.ReactNode }) => (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                    width: '4px',
                    height: '20px',
                    background: 'var(--ae-blue)',
                    borderRadius: '2px',
                    flexShrink: 0
                }}></span>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--theme-primary)', margin: 0 }}>
                    {title}
                </h3>
            </div>
            {extra}
        </div>
    );

    return (
        <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Dashboard Style Heading */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{
                    width: '4px',
                    height: '24px',
                    background: 'var(--ae-blue)',
                    borderRadius: '2px'
                }}></span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Receipt vouchers
                </h2>
            </div>

            {/* Form Container (Card) */}
            <div style={{
                background: 'white',
                border: '1px solid #E0E6ED',
                borderRadius: '12px',
                width: '100%',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                padding: '24px'
            }}>
                {/* Main Form Area - Single Column Stack */}
                <div className="space-y-0">
                    {/* 1. Basic Info Section */}
                    <section>
                        <SectionHeader title={id ? 'Edit Receipt Voucher' : 'Create Receipt Voucher'} />
                        <div className="ae-grid-responsive-5" style={{ gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Customer Name</label>
                                <SearchableDropdown
                                    options={uniqueCustomers.map(name => ({
                                        value: name,
                                        label: name
                                    }))}
                                    value={formData.customer_name}
                                    onChange={(val) => setFormData({ ...formData, customer_name: val.toString() })}
                                    placeholder="Select Customer"
                                    className="w-full"
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Payment Date</label>
                                <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        readOnly
                                        className="ae-input"
                                        value={formData.payment_date ? formatToAppDate(formData.payment_date) : ''}
                                        placeholder="Enter date"
                                        style={{
                                            width: '100%', padding: '4px 32px 4px 12px',
                                            borderRadius: '8px', fontSize: '0.82rem', fontWeight: 500, color: '#1a1f36',
                                            background: 'white', cursor: 'pointer', height: '34px'
                                        }}
                                        onClick={(e) => {
                                            const dateInput = e.currentTarget.nextElementSibling as HTMLInputElement;
                                            if (dateInput) dateInput.showPicker();
                                        }}
                                    />
                                    <input
                                        type="date"
                                        value={formData.payment_date}
                                        onChange={e => setFormData({ ...formData, payment_date: e.target.value })}
                                        style={{
                                            position: 'absolute',
                                            width: '100%',
                                            height: '100%',
                                            opacity: 0,
                                            cursor: 'pointer',
                                            zIndex: 1,
                                            left: 0,
                                            top: 0
                                        }}
                                    />
                                    <Calendar size={14} style={{ position: 'absolute', right: '12px', color: '#A0AEC0', pointerEvents: 'none', zIndex: 2 }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Reference Number</label>
                                <input
                                    className="ae-input"
                                    style={{ width: '100%', padding: '4px 12px', background: 'white', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 500, color: '#1a1f36', height: '34px' }}
                                    placeholder="Cheque / UTR / Ref No"
                                    value={formData.reference_number}
                                    onChange={e => setFormData({ ...formData, reference_number: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Payment Method</label>
                                <SearchableDropdown
                                    options={[
                                        { value: 'Bank Transfer (NEFT)', label: 'Bank Transfer (NEFT)' },
                                        { value: 'Cheque', label: 'Cheque' },
                                        { value: 'Cash', label: 'Cash' },
                                        { value: 'Credit Card', label: 'Credit Card' }
                                    ]}
                                    value={formData.payment_method}
                                    onChange={(val) => setFormData({ ...formData, payment_method: val.toString() })}
                                    placeholder="Select Payment Method"
                                    className="w-full"
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Deposit To (Bank)</label>
                                <SearchableDropdown
                                    options={bankConnections.map(b => ({
                                        value: b.id,
                                        label: `${b.bank_name} - ${b.account_number}`
                                    }))}
                                    value={formData.deposit_to}
                                    onChange={(val) => setFormData({ ...formData, deposit_to: val.toString() })}
                                    placeholder="Select Bank Account"
                                    className="w-full"
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Amount Received</label>
                                <div style={{ position: 'relative' }}>
                                    <DollarSign size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0', pointerEvents: 'none' }} />
                                    <input
                                        type="number"
                                        className="ae-input"
                                        style={{ width: '100%', padding: '4px 12px 4px 32px', background: 'white', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 500, color: '#1a1f36', height: '34px' }}
                                        value={formData.amount_received}
                                        onChange={e => setFormData({ ...formData, amount_received: e.target.value })}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Bank Charges</label>
                                <div style={{ position: 'relative' }}>
                                    <DollarSign size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0', pointerEvents: 'none' }} />
                                    <input
                                        type="number"
                                        className="ae-input"
                                        style={{ width: '100%', padding: '4px 12px 4px 32px', background: 'white', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 500, color: '#1a1f36', height: '34px' }}
                                        value={formData.bank_charges}
                                        onChange={e => setFormData({ ...formData, bank_charges: e.target.value })}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>TDS Receivable</label>
                                <div style={{ position: 'relative' }}>
                                    <DollarSign size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0', pointerEvents: 'none' }} />
                                    <input
                                        type="number"
                                        className="ae-input"
                                        style={{ width: '100%', padding: '4px 12px 4px 32px', background: '#F8FAFC', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 500, color: '#2D3748', height: '34px' }}
                                        value={formData.tds_receivable}
                                        readOnly
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>TDS (%)</label>
                                <input
                                    type="number"
                                    className="ae-input"
                                    style={{ width: '100%', padding: '4px 12px', background: 'white', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 500, color: '#1a1f36', height: '34px' }}
                                    value={formData.tds_percentage}
                                    onChange={e => setFormData({ ...formData, tds_percentage: e.target.value })}
                                    placeholder="0"
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Exchange Rate</label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    className="ae-input"
                                    style={{ width: '100%', padding: '4px 12px', background: 'white', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 500, color: '#1a1f36', height: '34px' }}
                                    value={formData.exchange_rate}
                                    onChange={e => setFormData({ ...formData, exchange_rate: e.target.value })}
                                />
                            </div>
                        </div>
                    </section>

                    {/* 2. Outstanding Transactions Section */}
                    <section style={{ borderTop: '1px solid #E0E6ED', paddingTop: '24px', marginTop: '24px' }}>
                        <SectionHeader title="Outstanding Transactions" />

                        <div className="ae-table-wrapper" style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-accent)' }}>
                                        <th style={{ padding: '10px 4px', width: '40px', borderBottom: '1px solid #E0E6ED' }}></th>
                                        <th style={{ width: '120px', padding: '10px 4px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED' }}>Inv. No</th>
                                        <th style={{ padding: '10px 4px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED' }}>Project</th>
                                        <th style={{ width: '120px', padding: '10px 4px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED' }}>Date</th>
                                        <th style={{ width: '120px', padding: '10px 4px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED' }}>Due Date</th>
                                        <th style={{ width: '120px', padding: '10px 4px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED' }}>Orig. Amt</th>
                                        <th style={{ width: '120px', padding: '10px 4px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED' }}>Open Bal.</th>
                                        <th style={{ width: '110px', padding: '10px 4px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED' }}>Payment</th>
                                        <th style={{ width: '110px', padding: '10px 4px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED' }}>TDS</th>
                                        <th style={{ width: '120px', padding: '10px 4px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED' }}>Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} style={{ textAlign: 'center', padding: '24px 4px', color: '#718096', fontSize: '0.85rem' }}>
                                                {formData.customer_name ? 'No outstanding invoices for this customer.' : 'Select a customer to see invoices.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        invoices.map((inv, index) => {
                                            const adjustment = formData.adjustments.find(a => a.invoice === inv.id);
                                            const paymentAmt = parseFloat(adjustment?.payment_amount || '0');
                                            const tdsAmt = parseFloat(adjustment?.tds_amount || '0');
                                            const bankChargesAmt = parseFloat(adjustment?.bank_charges || '0');
                                            const remainingBalance = parseFloat(inv.open_balance) - paymentAmt - tdsAmt - bankChargesAmt;

                                            const isSelected = !!adjustment;

                                            return (
                                                <tr key={inv.id} style={{ borderBottom: index === invoices.length - 1 ? 'none' : '1px solid #E0E6ED', background: isSelected ? 'rgba(255, 107, 0, 0.05)' : 'transparent' }}>
                                                    <td style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                        <div
                                                            onClick={() => {
                                                                if (isSelected) {
                                                                    setFormData({
                                                                        ...formData,
                                                                        adjustments: formData.adjustments.filter(a => a.invoice !== inv.id)
                                                                    });
                                                                } else {
                                                                    handleAdjustmentChange(inv.id, 'payment_amount', '0');
                                                                }
                                                            }}
                                                            style={{
                                                                width: '20px',
                                                                height: '20px',
                                                                borderRadius: '4px',
                                                                border: `2px solid ${isSelected ? 'var(--ae-blue)' : '#CBD5E1'}`,
                                                                background: isSelected ? 'var(--ae-blue)' : 'white',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer',
                                                                margin: '0 auto',
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            {isSelected && <Check size={12} color="white" strokeWidth={4} />}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '6px 4px', fontSize: '0.85rem', fontWeight: 600, color: '#4A5568', verticalAlign: 'middle' }}>{inv.invoice_no}</td>
                                                    <td style={{ padding: '6px 4px', fontSize: '0.85rem', color: '#4A5568', verticalAlign: 'middle' }}>{inv.project_name}</td>
                                                    <td style={{ padding: '6px 4px', fontSize: '0.85rem', color: '#4A5568', verticalAlign: 'middle' }}>{formatToAppDate(inv.invoice_date)}</td>
                                                    <td style={{ padding: '6px 4px', fontSize: '0.85rem', color: '#4A5568', verticalAlign: 'middle' }}>{formatToAppDate(inv.due_date)}</td>
                                                    <td style={{ padding: '6px 4px', fontSize: '0.85rem', textAlign: 'right', fontWeight: 600, color: '#4A5568', verticalAlign: 'middle' }}>${parseFloat(inv.total_amount).toLocaleString()}</td>
                                                    <td style={{ padding: '6px 4px', fontSize: '0.85rem', textAlign: 'right', fontWeight: 700, color: '#E53E3E', verticalAlign: 'middle' }}>${parseFloat(inv.open_balance).toLocaleString()}</td>
                                                    <td style={{ padding: '6px 4px', verticalAlign: 'middle' }}>
                                                        <input
                                                            type="number"
                                                            className="ae-input"
                                                            style={{ width: '100%', height: '30px', fontSize: '0.85rem', textAlign: 'right', padding: '4px 8px', borderRadius: '6px' }}
                                                            placeholder="0.00"
                                                            value={adjustment?.payment_amount || ''}
                                                            onChange={e => handleAdjustmentChange(inv.id, 'payment_amount', e.target.value)}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '6px 4px', verticalAlign: 'middle' }}>
                                                        <input
                                                            type="number"
                                                            className="ae-input"
                                                            style={{ width: '100%', height: '30px', fontSize: '0.85rem', textAlign: 'right', padding: '4px 8px', borderRadius: '6px' }}
                                                            placeholder="0.00"
                                                            value={adjustment?.tds_amount || ''}
                                                            onChange={e => handleAdjustmentChange(inv.id, 'tds_amount', e.target.value)}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '6px 4px', fontSize: '0.85rem', textAlign: 'right', fontWeight: 700, color: remainingBalance <= 0 ? '#00C853' : '#4A5568', verticalAlign: 'middle' }}>
                                                        ${remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                                {invoices.length > 0 && (
                                    <tfoot>
                                        <tr style={{ background: 'var(--bg-accent)', borderTop: '1px solid #E0E6ED' }}>
                                            <td colSpan={7} style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 800, fontSize: '0.85rem', color: '#1A202C' }}>TOTALS</td>
                                            <td style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 800, fontSize: '0.95rem', color: 'var(--theme-primary)' }}>${totalAdjusted.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 800, fontSize: '0.95rem', color: 'var(--theme-primary)' }}>${totalTdsAdjusted.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td style={{ padding: '12px 16px' }}></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </section>

                    {/* 3. Attachments & Verification Section */}
                    <section style={{ borderTop: '1px solid #E0E6ED', paddingTop: '24px', marginTop: '24px' }}>
                        <SectionHeader title="Attachments & Verification" />

                        <div style={{ marginBottom: '24px' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                padding: '4px 12px',
                                background: '#F8FAFC',
                                borderRadius: '12px',
                                border: '1px solid #E0E6ED',
                                width: 'fit-content',
                                minWidth: 'fit-content'
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
                                    type="button"
                                    onClick={() => document.getElementById('file-upload')?.click()}
                                    className="ae-btn-secondary"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        height: '30px',
                                        padding: '0 16px',
                                        borderRadius: '20px',
                                        fontWeight: 700,
                                        fontSize: '0.72rem'
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
                                                background: 'rgba(255, 107, 0, 0.05)',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255, 107, 0, 0.2)',
                                                minWidth: 'fit-content'
                                            }}>
                                                <FileIcon size={12} style={{ color: 'var(--ae-orange)' }} />
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
                                                        title="View"
                                                    >
                                                        <Eye size={10} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const url = URL.createObjectURL(file);
                                                            const a = document.createElement('a');
                                                            a.href = url;
                                                            a.download = file.name;
                                                            a.click();
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
                                                        title="Download"
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
                                        <span style={{ fontSize: '0.85rem', color: '#A0AEC0', fontStyle: 'italic', marginLeft: '10px' }}>No attachments yet</span>
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
                            border: '1px solid #E2E8F0',
                            flexWrap: 'wrap'
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
                    </section>
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
                marginLeft: 'auto',
                marginTop: '16px'
            }}>
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 20px',
                        height: '32px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        background: activeAction === 'save' ? 'var(--theme-primary)' : 'transparent',
                        color: activeAction === 'save' ? 'white' : 'var(--text-secondary)',
                        boxShadow: activeAction === 'save' ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                    }}
                    onMouseEnter={() => setActiveAction('save')}
                    onMouseLeave={() => setActiveAction(null)}
                >
                    {loading ? <Save className="animate-spin" size={18} /> : <Save size={18} />}
                    {id ? 'Update Receipt' : 'Save Receipt'}
                </button>
                <button
                    onClick={() => {
                        showConfirm({
                            title: 'Are you sure you want to exit?',
                            onConfirm: () => onBack(),
                            onCancel: () => { }
                        });
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 18px',
                        height: '32px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: activeAction === 'cancel' ? 'var(--theme-primary)' : 'transparent',
                        color: activeAction === 'cancel' ? 'white' : 'var(--text-secondary)',
                        boxShadow: activeAction === 'cancel' ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                    }}
                    onMouseEnter={() => setActiveAction('cancel')}
                    onMouseLeave={() => setActiveAction(null)}
                >
                    <span style={{ fontSize: '18px', lineHeight: '10px' }}>×</span>
                    <span>Cancel</span>
                </button>
            </div>
        </div>
    );
};

export default ReceiptVoucherForm;
