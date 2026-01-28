import React, { useState, useEffect } from 'react';
import {
    ChevronLeft,
    Save,
    Send,
    Plus,
    RefreshCw,
    CheckCircle2,
    X,
    History,
    Upload
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';

interface EstimateFormProps {
    id: number;
    onBack: () => void;
}

const EstimateForm: React.FC<EstimateFormProps> = ({ id, onBack }) => {
    const { showNotification } = useNotification();
    const [estimate, setEstimate] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<any>({
        estimate_date: new Date().toISOString().split('T')[0],
        description_memo: '',
        terms_conditions: '',
        items: [
            { id: Date.now(), sr_no: 1, particulars: '', description: '', qty: 0, rate: 0, amount: 0 }
        ]
    });

    useEffect(() => {
        fetchEstimateDetails();
    }, [id]);

    const fetchEstimateDetails = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/estimates/${id}/`);
            setEstimate(response.data);
            setFormData({
                estimate_date: response.data.estimate_date || new Date().toISOString().split('T')[0],
                description_memo: response.data.description_memo || '',
                terms_conditions: response.data.terms_conditions || '',
                items: response.data.items?.length > 0 ? response.data.items : [
                    { id: Date.now(), sr_no: 1, particulars: '', description: '', qty: 0, rate: 0, amount: 0 }
                ]
            });
        } catch (error) {
            console.error('Error fetching estimate', error);
            showNotification('Error loading estimate details', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = () => {
        const nextSrNo = formData.items.length + 1;
        setFormData({
            ...formData,
            items: [...formData.items, { id: Date.now(), sr_no: nextSrNo, particulars: '', description: '', qty: 0, rate: 0, amount: 0 }]
        });
    };

    const handleRemoveItem = (id: number) => {
        if (formData.items.length === 1) return;
        const filtered = formData.items.filter((item: any) => item.id !== id);
        // Re-index sr_no
        const reindexed = filtered.map((item: any, index: number) => ({ ...item, sr_no: index + 1 }));
        setFormData({ ...formData, items: reindexed });
    };

    const handleItemChange = (id: number, field: string, value: any) => {
        const updated = formData.items.map((item: any) => {
            if (item.id === id) {
                const newItem = { ...item, [field]: value };
                if (field === 'qty' || field === 'rate') {
                    newItem.amount = (newItem.qty || 0) * (newItem.rate || 0);
                }
                return newItem;
            }
            return item;
        });
        setFormData({ ...formData, items: updated });
    };

    const calculateTotal = () => {
        return formData.items.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formDataFile = new FormData();
        formDataFile.append('file', file);
        formDataFile.append('estimate', id.toString());
        formDataFile.append('filename', file.name);

        try {
            await api.post('/proposals/', formDataFile, {
                headers: { 'Content-Type': 'multipart/form-data ' }
            });
            showNotification('Proposal attached successfully', 'success');
            fetchEstimateDetails();
        } catch (error) {
            console.error('Error uploading proposal', error);
            showNotification('Failed to upload proposal', 'error');
        }
    };

    const handleSave = async () => {
        const total = calculateTotal();
        const costSheetPrice = parseFloat(estimate.total_price); // Snapshot of CS price in estimate

        if (total < costSheetPrice) {
            showNotification(`Total Estimate ($${total.toLocaleString()}) cannot be less than Cost Sheet Price ($${costSheetPrice.toLocaleString()})`, 'error');
            return;
        }

        if (!estimate.proposals?.length) {
            showNotification('Please attach a proposal file before saving.', 'error');
            return;
        }

        setSaving(true);
        // Prepare data for saving
        const payload = {
            ...formData,
            // Ensure qty and rate are numeric
            items: formData.items.map((item: any) => ({
                ...item,
                qty: parseFloat(item.qty) || 0,
                rate: parseFloat(item.rate) || 0
            }))
        };
        try {
            await api.patch(`/estimates/${id}/`, payload);
            showNotification('Estimate updated successfully', 'success');
            fetchEstimateDetails();
        } catch (error: any) {
            const errorMsg = error.response?.data?.items || 'Failed to update estimate';
            showNotification(errorMsg, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async () => {
        const total = calculateTotal();
        const costSheetPrice = parseFloat(estimate.total_price);

        // Client-side validation for Amount
        if (total < costSheetPrice) {
            showNotification(`Total Estimate ($${total.toLocaleString()}) cannot be less than Cost Sheet Price ($${costSheetPrice.toLocaleString()})`, 'error');
            return;
        }

        // Client-side validation for Proposal
        if (!estimate.proposals?.length) {
            showNotification('Please attach a proposal file before submitting to the customer.', 'error');
            return;
        }

        if (!window.confirm('Are you sure you want to submit this estimate to the customer?')) return;
        try {
            await api.post(`/estimates/${id}/submit/`);
            showNotification('Estimate submitted successfully', 'success');
            fetchEstimateDetails();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Failed to submit estimate', 'error');
        }
    };

    const handleRewind = async () => {
        if (!window.confirm('Rewinding will create a new version for negotiation. The current version will be archived. Continue?')) return;
        try {
            await api.post(`/estimates/${id}/rewind/`);
            showNotification('Estimate rewound. New version created.', 'success');
            onBack(); // Go back to dashboard to see new version
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Failed to rewind estimate', 'error');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <RefreshCw className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6" style={{ background: '#fff', color: '#333' }}>
            {/* Header Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button onClick={onBack} className="ae-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ChevronLeft size={18} /> Back
                </button>
                <div style={{ display: 'flex', gap: '12px' }}>
                    {estimate.is_latest && estimate.version < 2 && (
                        <button onClick={handleRewind} className="ae-btn-secondary" style={{ color: '#FF6B00', borderColor: '#FF6B00' }}>
                            <History size={18} /> Rewind
                        </button>
                    )}
                    <button onClick={handleSave} disabled={saving} className="ae-btn-secondary">
                        <Save size={18} /> {saving ? 'Saving...' : 'Save Draft'}
                    </button>
                    <button onClick={handleSubmit} className="ae-btn-primary">
                        <Send size={18} /> Submit to Customer
                    </button>
                </div>
            </div>

            {/* Excel-like Grid Layout */}
            <div className="ae-card" style={{ padding: '0', overflow: 'hidden', border: '1px solid #99b6d8' }}>
                {/* Top Information Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', background: '#dce6f1', borderBottom: '1px solid #99b6d8' }}>
                    <div style={{ padding: '8px', borderRight: '1px solid #99b6d8' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#4a5568' }}>Deal No.</label>
                        <div style={{ fontWeight: 600 }}>{estimate.deal_id || 'XXXX'}</div>
                    </div>
                    <div style={{ padding: '8px', borderRight: '1px solid #99b6d8' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#4a5568' }}>Cost Sheet No.</label>
                        <div style={{ fontWeight: 600 }}>{estimate.cost_sheet_no || 'XXXX'}</div>
                    </div>
                    <div style={{ padding: '8px', borderRight: '1px solid #99b6d8' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#4a5568' }}>Estimate No.</label>
                        <div style={{ fontWeight: 600 }}>{estimate.estimate_id || 'XXXX'}</div>
                    </div>
                    <div style={{ padding: '8px', borderRight: '1px solid #99b6d8' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#4a5568' }}>Estimate Date</label>
                        <input
                            type="date"
                            style={{ width: '100%', border: 'none', background: 'transparent', fontWeight: 600, padding: 0 }}
                            value={formData.estimate_date}
                            onChange={(e) => setFormData({ ...formData, estimate_date: e.target.value })}
                        />
                    </div>
                    <div style={{ padding: '8px', borderRight: '1px solid #99b6d8', background: !estimate.proposals?.length ? '#FFF5F5' : 'transparent' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#4a5568' }}>
                            Attach Proposal <span style={{ color: '#E53E3E' }}>*</span>
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                type="file"
                                id="proposal-upload"
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                            />
                            <label htmlFor="proposal-upload" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Upload size={16} color={!estimate.proposals?.length ? '#E53E3E' : '#0066CC'} />
                                <span style={{
                                    fontSize: '0.85rem',
                                    color: !estimate.proposals?.length ? '#E53E3E' : '#2D3748',
                                    fontWeight: !estimate.proposals?.length ? 700 : 500
                                }}>
                                    {estimate.proposals?.[0]?.filename || 'Click to attach...'}
                                </span>
                            </label>
                            {estimate.proposals?.length > 0 && (
                                <CheckCircle2 size={14} color="#38A169" />
                            )}
                        </div>
                    </div>
                    <div style={{ padding: '8px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#4a5568' }}>Customer Name</label>
                        <div style={{ fontWeight: 600 }}>{estimate.customer_name || 'XXXX'}</div>
                    </div>
                </div>

                {/* Line Items Table */}
                <div style={{ minHeight: '300px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#dce6f1', borderBottom: '1px solid #99b6d8' }}>
                                <th style={{ width: '60px', padding: '10px', textAlign: 'left', borderRight: '1px solid #99b6d8' }}>Sr.No.</th>
                                <th style={{ width: '200px', padding: '10px', textAlign: 'left', borderRight: '1px solid #99b6d8' }}>Particulars</th>
                                <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid #99b6d8' }}>Description</th>
                                <th style={{ width: '100px', padding: '10px', textAlign: 'center', borderRight: '1px solid #99b6d8' }}>Qty</th>
                                <th style={{ width: '120px', padding: '10px', textAlign: 'right', borderRight: '1px solid #99b6d8' }}>Rate</th>
                                <th style={{ width: '150px', padding: '10px', textAlign: 'right', borderRight: '1px solid #99b6d8' }}>Amount</th>
                                <th style={{ width: '50px', padding: '10px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {formData.items.map((item: any) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fbff' }}>
                                    <td style={{ padding: '8px', borderRight: '1px solid #99b6d8', textAlign: 'center' }}>{item.sr_no}</td>
                                    <td style={{ padding: '8px', borderRight: '1px solid #99b6d8' }}>
                                        <input
                                            className="ae-input"
                                            style={{ background: 'transparent', border: 'none', padding: '4px' }}
                                            value={item.particulars || ''}
                                            onChange={(e) => handleItemChange(item.id, 'particulars', e.target.value)}
                                        />
                                    </td>
                                    <td style={{ padding: '8px', borderRight: '1px solid #99b6d8' }}>
                                        <textarea
                                            className="ae-input"
                                            style={{ background: 'transparent', border: 'none', padding: '4px', minHeight: '40px' }}
                                            value={item.description || ''}
                                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                        />
                                    </td>
                                    <td style={{ padding: '8px', borderRight: '1px solid #99b6d8' }}>
                                        <input
                                            type="number"
                                            className="ae-input"
                                            style={{ background: 'transparent', border: 'none', padding: '4px', textAlign: 'center' }}
                                            value={item.qty || 0}
                                            onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                                        />
                                    </td>
                                    <td style={{ padding: '8px', borderRight: '1px solid #99b6d8' }}>
                                        <input
                                            type="number"
                                            className="ae-input"
                                            style={{ background: 'transparent', border: 'none', padding: '4px', textAlign: 'right' }}
                                            value={item.rate || 0}
                                            onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                                        />
                                    </td>
                                    <td style={{ padding: '12px', borderRight: '1px solid #99b6d8', textAlign: 'right', fontWeight: 700 }}>
                                        {parseFloat(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'center' }}>
                                        <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700">
                                            <X size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {/* Add Row Button Row */}
                            <tr style={{ background: '#f1f5f9' }}>
                                <td colSpan={7} style={{ padding: '8px' }}>
                                    <button onClick={handleAddItem} className="ae-btn-secondary" style={{ padding: '4px 12px', fontSize: '0.8rem', width: '100%', justifyContent: 'center' }}>
                                        <Plus size={16} /> Add Item
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr style={{ background: '#dce6f1', fontWeight: 900 }}>
                                <td colSpan={5} style={{ padding: '12px', textAlign: 'right', borderRight: '1px solid #99b6d8' }}>Total</td>
                                <td style={{ padding: '12px', textAlign: 'right', borderRight: '1px solid #99b6d8', color: '#FF6B00', fontSize: '1.2rem' }}>
                                    {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Bottom Sections */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', borderTop: '1px solid #99b6d8' }}>
                    <div style={{ borderRight: '1px solid #99b6d8', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ background: '#dce6f1', padding: '8px', borderBottom: '1px solid #99b6d8', fontWeight: 700 }}>Description / Memo</div>
                        <textarea
                            style={{ flex: 1, border: 'none', padding: '12px', minHeight: '100px', outline: 'none' }}
                            placeholder="Type here..."
                            value={formData.description_memo || ''}
                            onChange={(e) => setFormData({ ...formData, description_memo: e.target.value })}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ background: '#dce6f1', padding: '8px', borderBottom: '1px solid #99b6d8', fontWeight: 700 }}>Terms & Conditions</div>
                        <textarea
                            style={{ flex: 1, border: 'none', padding: '12px', minHeight: '100px', outline: 'none' }}
                            placeholder="Type here..."
                            value={formData.terms_conditions || ''}
                            onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                        />
                    </div>
                </div>
            </div>

        </div>
    );
};

export default EstimateForm;
