import React, { useState, useEffect } from 'react';
import { Save, Loader2, Calendar } from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { formatToAppDate } from '../utils/dateUtils';

interface RevenueContractFormProps {
    id: number | null;
    onBack: () => void;
    onSave: () => void;
}

const REVENUE_TYPES = [
    { value: 'LICENSE_PERIOD', label: 'License subscription on period basis' },
    { value: 'LICENSE_CONSUMPTION', label: 'License subscription on consumption basis' },
    { value: 'LICENSE_PERPETUAL', label: 'License subscription on perpetual basis' },
    { value: 'AMC_PERPETUAL', label: 'Annual maintenance fees against perpetual license' },
    { value: 'PS_FIXED_BID', label: 'Professional services – Fixed Bid' },
    { value: 'PS_TM', label: 'Professional services – Time & Material' }
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AED', 'SAR'];

const RevenueContractForm: React.FC<RevenueContractFormProps> = ({ id, onBack, onSave }) => {
    const { showNotification, showConfirm } = useNotification();
    const [loading, setLoading] = useState(false);
    const [isCancelActive, setIsCancelActive] = useState(false);
    const [deals, setDeals] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        contract_id: '',
        revenue_type: 'LICENSE_PERIOD',
        deal: '',
        customer: '',
        total_amount: '',
        currency: 'USD',
        start_date: '',
        end_date: '',
        notes: '',
        status: 'DRAFT'
    });

    useEffect(() => {
        fetchDeals();
        fetchCustomers();
        if (id) {
            fetchContractDetails();
        }
    }, [id]);

    const fetchDeals = async () => {
        try {
            const response = await api.get('/deals/');
            setDeals(response.data);
        } catch (error) {
            console.error('Error fetching deals', error);
        }
    };

    const fetchCustomers = async () => {
        try {
            const response = await api.get('/finance/customer-partners/');
            setCustomers(response.data);
        } catch (error) {
            console.error('Error fetching customers', error);
        }
    };

    const fetchContractDetails = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/revenue/contracts/${id}/`);
            const data = response.data;
            setFormData({
                contract_id: data.contract_id,
                revenue_type: data.revenue_type,
                deal: data.deal || '',
                customer: data.customer || '',
                total_amount: data.total_amount,
                currency: data.currency,
                start_date: data.start_date,
                end_date: data.end_date,
                notes: data.notes || '',
                status: data.status
            });
        } catch (error) {
            showNotification('Error fetching contract details', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (id) {
                await api.put(`/revenue/contracts/${id}/`, formData);
                showNotification('Revenue contract updated successfully', 'success');
            } else {
                await api.post('/revenue/contracts/', formData);
                showNotification('Revenue contract created successfully', 'success');
            }
            onSave();
        } catch (error: any) {
            const errorMsg = error.response?.data ? Object.values(error.response.data).join(', ') : 'Error saving contract';
            showNotification(errorMsg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const SectionHeader = ({ title, extra }: { title: string, extra?: React.ReactNode }) => (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            marginTop: title === 'Basic Information' ? '0' : '32px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                    width: '4px',
                    height: '18px',
                    background: 'var(--ae-blue)',
                    borderRadius: '2px'
                }}></span>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--theme-primary)', margin: 0 }}>
                    {title}
                </h3>
            </div>
            {extra}
        </div>
    );

    return (
        <div className="space-y-6" style={{ padding: '4px' }}>
            <div style={{
                background: 'white',
                border: '1px solid #E0E6ED',
                borderRadius: '12px',
                width: '100%',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                padding: '24px'
            }}>
                <form onSubmit={handleSubmit} className="space-y-0">
                    {/* Basic Info */}
                    <section>
                        <SectionHeader title="Basic Information" />
                        <div className="ae-grid-5">
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Contract ID (Internal Reference)</label>
                                <input
                                    type="text"
                                    name="contract_id"
                                    value={formData.contract_id}
                                    onChange={handleInputChange}
                                    className="ae-input"
                                    style={{ minHeight: '34px' }}
                                    placeholder="e.g. REV-2024-001"
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Revenue Type</label>
                                <select
                                    name="revenue_type"
                                    value={formData.revenue_type}
                                    onChange={handleInputChange}
                                    className="ae-input"
                                    style={{ minHeight: '34px' }}
                                >
                                    {REVENUE_TYPES.map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Link to Deal</label>
                                <select
                                    name="deal"
                                    value={formData.deal}
                                    onChange={handleInputChange}
                                    className="ae-input"
                                    style={{ minHeight: '34px' }}
                                >
                                    <option value="">-- Select Deal --</option>
                                    {deals.map(deal => (
                                        <option key={deal.id} value={deal.id}>{deal.deal_no} - {deal.deal_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Customer</label>
                                <select
                                    name="customer"
                                    value={formData.customer}
                                    onChange={handleInputChange}
                                    className="ae-input"
                                    style={{ minHeight: '34px' }}
                                >
                                    <option value="">-- Select Customer --</option>
                                    {customers.map(cust => (
                                        <option key={cust.id} value={cust.id}>{cust.company_name || cust.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>

                    <div style={{ height: '1px', background: '#E0E6ED', margin: '32px 0' }} />

                    {/* Financials and Period */}
                    <section>
                        <SectionHeader title="Financials & Timeline" />

                        <div className="ae-grid-5">
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Total Amount</label>
                                <input
                                    type="number"
                                    name="total_amount"
                                    value={formData.total_amount}
                                    onChange={handleInputChange}
                                    required
                                    step="0.01"
                                    className="ae-input"
                                    style={{ minHeight: '34px' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Currency</label>
                                <select
                                    name="currency"
                                    value={formData.currency}
                                    onChange={handleInputChange}
                                    className="ae-input"
                                    style={{ minHeight: '34px' }}
                                >
                                    {CURRENCIES.map(curr => <option key={curr} value={curr}>{curr}</option>)}
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Start Date</label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        value={formData.start_date ? formatToAppDate(formData.start_date) : ''}
                                        readOnly
                                        className="ae-input"
                                        style={{ backgroundColor: 'white', cursor: 'pointer', paddingRight: '32px' }}
                                        onClick={(e) => {
                                            const dateInput = e.currentTarget.nextElementSibling as HTMLInputElement;
                                            if (dateInput) dateInput.showPicker();
                                        }}
                                        placeholder="Select Date"
                                    />
                                    <input
                                        name="start_date"
                                        type="date"
                                        value={formData.start_date || ''}
                                        onChange={handleInputChange}
                                        style={{
                                            position: 'absolute',
                                            visibility: 'hidden',
                                            width: 0,
                                            height: 0
                                        }}
                                    />
                                    <Calendar size={14} style={{ position: 'absolute', right: '10px', color: '#718096', pointerEvents: 'none' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>End Date</label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        value={formData.end_date ? formatToAppDate(formData.end_date) : ''}
                                        readOnly
                                        className="ae-input"
                                        style={{ backgroundColor: 'white', cursor: 'pointer', paddingRight: '32px' }}
                                        onClick={(e) => {
                                            const dateInput = e.currentTarget.nextElementSibling as HTMLInputElement;
                                            if (dateInput) dateInput.showPicker();
                                        }}
                                        placeholder="Select Date"
                                    />
                                    <input
                                        name="end_date"
                                        type="date"
                                        value={formData.end_date || ''}
                                        onChange={handleInputChange}
                                        style={{
                                            position: 'absolute',
                                            visibility: 'hidden',
                                            width: 0,
                                            height: 0
                                        }}
                                    />
                                    <Calendar size={14} style={{ position: 'absolute', right: '10px', color: '#718096', pointerEvents: 'none' }} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Current Status</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                    className="ae-input"
                                    style={{ minHeight: '34px' }}
                                >
                                    <option value="DRAFT">Draft</option>
                                    <option value="ACTIVE">Active</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    <div style={{ height: '1px', background: '#E0E6ED', margin: '32px 0' }} />

                    {/* Notes */}
                    <section>
                        <SectionHeader title="Internal Notes" />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                                rows={4}
                                className="ae-input"
                                placeholder="Additional details about the contract or recognition terms..."
                                style={{ resize: 'vertical', minHeight: '80px' }}
                            />
                        </div>
                    </section>

                    {/* Submit Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                        <div style={{
                            display: 'flex',
                            background: 'white',
                            padding: '4px',
                            borderRadius: '12px',
                            border: '1px solid var(--border-primary)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                        }}>
                            {/* Save — orange when not cancelling */}
                            <button
                                type="submit"
                                disabled={loading}
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
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: isCancelActive ? 'transparent' : 'var(--theme-primary)',
                                    color: isCancelActive ? 'var(--text-secondary)' : 'white',
                                    boxShadow: isCancelActive ? 'none' : '0 2px 8px rgba(187, 77, 0, 0.3)'
                                }}
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                <span>{loading ? 'Saving...' : id ? 'Update Contract' : 'Create Contract'}</span>
                            </button>

                            {/* Cancel — orange when active */}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCancelActive(true);
                                    showConfirm({
                                        title: 'Are you sure you want to exit?',
                                        onConfirm: () => onBack(),
                                        onCancel: () => setIsCancelActive(false)
                                    });
                                }}
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
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: isCancelActive ? 'var(--theme-primary)' : 'transparent',
                                    color: isCancelActive ? 'white' : 'var(--text-secondary)',
                                    boxShadow: isCancelActive ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isCancelActive) {
                                        e.currentTarget.style.background = 'rgba(255, 107, 0, 0.05)';
                                        e.currentTarget.style.color = 'var(--ae-orange)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isCancelActive) {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = 'var(--text-secondary)';
                                    }
                                }}
                            >
                                <span style={{ fontSize: '16px', lineHeight: '16px', fontWeight: 700 }}>×</span>
                                <span>Cancel</span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RevenueContractForm;
