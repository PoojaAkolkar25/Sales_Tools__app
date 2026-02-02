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
    Upload,
    Clock,
    XCircle,
    ThumbsUp,
    ThumbsDown,
    Mail
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

    // Email Modal State
    const [emailModal, setEmailModal] = useState<{
        open: boolean;
        to: string;
        cc: string;
        bcc: string;
        subject: string;
        body: string;
    }>({
        open: false,
        to: '',
        cc: '',
        bcc: '',
        subject: '',
        body: ''
    });
    const [sendingEmail, setSendingEmail] = useState(false);

    const openEmailModal = () => {
        const clientName = estimate.customer_name || 'Client';
        const projectName = estimate.project_name || 'Project';

        setEmailModal({
            open: true,
            to: estimate.customer_email || '',
            cc: '',
            bcc: '',
            subject: `Proposal / Estimate - ${estimate.estimate_id}`,
            body: `Dear ${clientName},\n\nPlease find attached the proposal for ${projectName}.\n\nBest regards,\nSales Team`
        });
    };

    const handleSendEmail = async () => {
        setSendingEmail(true);
        try {
            await api.post(`/estimates/${id}/send_email/`, {
                to: emailModal.to,
                cc: emailModal.cc,
                bcc: emailModal.bcc,
                subject: emailModal.subject,
                body: emailModal.body
            });
            showNotification('Email sent successfully', 'success');
            setEmailModal({ ...emailModal, open: false });
        } catch (error: any) {
            console.error('Error sending email', error);
            showNotification(error.response?.data?.error || 'Failed to send email', 'error');
        } finally {
            setSendingEmail(false);
        }
    };

    const isReadOnly = estimate?.approval_status === 'APPROVED' || estimate?.status === 'SUBMITTED';

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
            const response = await api.post('/proposals/', formDataFile, {
                headers: { 'Content-Type': 'multipart/form-data ' }
            });
            showNotification('Proposal attached successfully', 'success');
            // Update estimate state directly instead of refetching
            setEstimate((prev: any) => ({
                ...prev,
                proposals: [...(prev.proposals || []), response.data]
            }));
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
            showNotification('Estimate rewound. New version created requiring approval.', 'success');
            onBack(); // Go back to dashboard to see new version
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Failed to rewind estimate', 'error');
        }
    };

    const handleRequestApproval = async () => {
        try {
            await api.post(`/estimates/${id}/request_approval/`);
            showNotification('Approval requested successfully', 'success');
            fetchEstimateDetails();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Failed to request approval', 'error');
        }
    };

    const handleApprove = async () => {
        const notes = prompt('Approval notes (optional):');
        try {
            await api.post(`/estimates/${id}/approve/`, { notes });
            showNotification('Estimate approved successfully', 'success');
            fetchEstimateDetails();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Failed to approve estimate', 'error');
        }
    };

    const handleReject = async () => {
        const notes = prompt('Rejection notes (required):');
        if (!notes) {
            showNotification('Rejection notes are required', 'error');
            return;
        }
        try {
            await api.post(`/estimates/${id}/reject/`, { notes });
            showNotification('Estimate rejected', 'success');
            fetchEstimateDetails();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Failed to reject estimate', 'error');
        }
    };

    const getApprovalStatusBadge = () => {
        if (!estimate) return null;

        const statusConfig: any = {
            'PENDING': { color: '#FFA500', bg: '#FFF4E5', icon: Clock, label: 'Pending Approval' },
            'APPROVED': { color: '#38A169', bg: '#E6F7ED', icon: CheckCircle2, label: 'Approved' },
            'REJECTED': { color: '#E53E3E', bg: '#FFF5F5', icon: XCircle, label: 'Rejected' }
        };

        const config = statusConfig[estimate.approval_status];
        if (!config) return null;

        const Icon = config.icon;

        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                background: config.bg,
                borderRadius: '6px',
                border: `1px solid ${config.color}`
            }}>
                <Icon size={16} color={config.color} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: config.color }}>
                    {config.label}
                </span>
                {estimate.approved_by_name && (
                    <span style={{ fontSize: '0.75rem', color: '#666', marginLeft: '4px' }}>
                        by {estimate.approved_by_name}
                    </span>
                )}
            </div>
        );
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
            {/* Read Only Banner */}
            {isReadOnly && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r shadow-sm flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-full">
                        <CheckCircle2 size={20} className="text-blue-600" />
                    </div>
                    <div>
                        <p className="font-bold text-blue-900 text-sm">Read Only Mode</p>
                        <p className="text-blue-700 text-xs mt-0.5">
                            This estimate is <strong>{estimate.approval_status === 'APPROVED' ? 'Approved' : 'Submitted'}</strong> and cannot be edited.
                            {estimate.approval_status === 'APPROVED' && " Use Rewind to create a new version for negotiation."}
                        </p>
                    </div>
                </div>
            )}

            {/* Header Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={onBack} className="ae-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ChevronLeft size={18} /> Back
                    </button>
                    {getApprovalStatusBadge()}
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    {/* Approval Actions for Sales Head/Finance Manager */}
                    {estimate.approval_status === 'PENDING' && (
                        <>
                            <button onClick={handleApprove} className="ae-btn-secondary" style={{ color: '#38A169', borderColor: '#38A169' }}>
                                <ThumbsUp size={18} /> Approve
                            </button>
                            <button onClick={handleReject} className="ae-btn-secondary" style={{ color: '#E53E3E', borderColor: '#E53E3E' }}>
                                <ThumbsDown size={18} /> Reject
                            </button>
                        </>
                    )}

                    {/* Request Approval Button */}
                    {(estimate.status === 'DRAFT' || estimate.status === 'NEGOTIATION') && estimate.approval_status !== 'PENDING' && estimate.approval_status !== 'APPROVED' && (
                        <button onClick={handleRequestApproval} className="ae-btn-secondary" style={{ color: '#0066CC', borderColor: '#0066CC' }}>
                            <Clock size={18} /> Request Approval
                        </button>
                    )}

                    {/* Rewind Button */}
                    {estimate.is_latest && estimate.version < 2 && (
                        <button onClick={handleRewind} className="ae-btn-secondary" style={{ color: '#FF6B00', borderColor: '#FF6B00' }}>
                            <History size={18} /> Rewind
                        </button>
                    )}

                    {/* Save Button - Hidden if Read Only */}
                    {!isReadOnly && (
                        <button onClick={handleSave} disabled={saving} className="ae-btn-secondary">
                            <Save size={18} /> {saving ? 'Saving...' : 'Save Draft'}
                        </button>
                    )}

                    {/* Submit button - only enabled if approved */}
                    <button
                        onClick={handleSubmit}
                        className="ae-btn-primary"
                        disabled={estimate.approval_status !== 'APPROVED'}
                        style={{ opacity: estimate.approval_status !== 'APPROVED' ? 0.5 : 1 }}
                    >
                        <Send size={18} /> Submit to Customer
                    </button>

                    {/* Send Email Button */}
                    {(estimate.status === 'SUBMITTED' || estimate.approval_status === 'APPROVED') && (
                        <button
                            onClick={openEmailModal}
                            className="ae-btn-primary"
                            disabled={!estimate.proposals?.length}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: '#38A169',
                                opacity: !estimate.proposals?.length ? 0.5 : 1
                            }}
                            title={!estimate.proposals?.length ? "Attach a proposal first" : "Send Email"}
                        >
                            <Mail size={18} /> Send Email
                        </button>
                    )}
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
                    <div style={{ padding: '8px', gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#4a5568' }}>
                                Proposal Attachments (Versioning) <span style={{ color: '#E53E3E' }}>*</span>
                            </label>
                            <input
                                type="file"
                                id="proposal-upload"
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                                disabled={isReadOnly}
                            />
                            {!isReadOnly && (
                                <label htmlFor="proposal-upload" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#0066CC', fontWeight: 600 }}>
                                    <Upload size={14} /> Upload New Version
                                </label>
                            )}
                        </div>
                        <div style={{ maxHeight: '100px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px', background: 'white' }}>
                            {!estimate.proposals?.length ? (
                                <div style={{ padding: '8px', fontSize: '0.85rem', color: '#E53E3E', fontWeight: 600 }}>No proposal attached. Please upload one.</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    {[...estimate.proposals].reverse().map((prop: any, idx: number) => (
                                        <div key={prop.id} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            padding: '6px 8px',
                                            borderBottom: idx === estimate.proposals.length - 1 ? 'none' : '1px solid #f1f5f9',
                                            background: idx === 0 ? '#f0fff4' : 'transparent'
                                        }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2d3748' }}>{prop.filename} (v{prop.version})</span>
                                                <span style={{ fontSize: '0.7rem', color: '#718096' }}>
                                                    By: {prop.uploaded_by_name || 'System'} | {new Date(prop.uploaded_at).toLocaleString()}
                                                </span>
                                            </div>
                                            <a href={prop.file} target="_blank" rel="noopener noreferrer" style={{ alignSelf: 'center', color: '#0066CC' }}>
                                                <CheckCircle2 size={16} />
                                            </a>
                                        </div>
                                    ))}
                                </div>
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
                            style={{ flex: 1, border: 'none', padding: '12px', minHeight: '100px', outline: 'none', background: isReadOnly ? '#f7fafc' : 'transparent' }}
                            placeholder="Type here..."
                            value={formData.description_memo || ''}
                            onChange={(e) => setFormData({ ...formData, description_memo: e.target.value })}
                            disabled={isReadOnly}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ background: '#dce6f1', padding: '8px', borderBottom: '1px solid #99b6d8', fontWeight: 700 }}>Terms & Conditions</div>
                        <textarea
                            style={{ flex: 1, border: 'none', padding: '12px', minHeight: '100px', outline: 'none', background: isReadOnly ? '#f7fafc' : 'transparent' }}
                            placeholder="Type here..."
                            value={formData.terms_conditions || ''}
                            onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                            disabled={isReadOnly}
                        />
                    </div>
                </div>
            </div>

            {/* Email Modal */}
            {emailModal.open && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000
                }}>
                    <div style={{
                        background: 'white',
                        padding: '32px',
                        borderRadius: '16px',
                        width: '600px',
                        maxWidth: '95%',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1A202C' }}>Compose Proposal Email</h3>
                                <p style={{ color: '#718096', fontSize: '0.85rem', marginTop: '4px' }}>Combined Estimate and Proposal will be attached automatically.</p>
                            </div>
                            <button
                                onClick={() => setEmailModal({ ...emailModal, open: false })}
                                style={{ padding: '8px', borderRadius: '50%', background: '#F7FAFC', border: 'none', cursor: 'pointer' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', alignItems: 'center', gap: '12px' }}>
                                <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#4A5568' }}>To:</label>
                                <input
                                    className="ae-input"
                                    value={emailModal.to}
                                    onChange={(e) => setEmailModal({ ...emailModal, to: e.target.value })}
                                    placeholder="recipient@example.com"
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', alignItems: 'center', gap: '12px' }}>
                                <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#4A5568' }}>CC:</label>
                                <input
                                    className="ae-input"
                                    value={emailModal.cc}
                                    onChange={(e) => setEmailModal({ ...emailModal, cc: e.target.value })}
                                    placeholder="cc@example.com (comma separated)"
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', alignItems: 'center', gap: '12px' }}>
                                <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#4A5568' }}>Subject:</label>
                                <input
                                    className="ae-input"
                                    value={emailModal.subject}
                                    onChange={(e) => setEmailModal({ ...emailModal, subject: e.target.value })}
                                    placeholder="Enter subject"
                                />
                            </div>

                            <div style={{ marginTop: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem', color: '#4A5568' }}>Message Body</label>
                                <textarea
                                    className="ae-input"
                                    value={emailModal.body}
                                    onChange={(e) => setEmailModal({ ...emailModal, body: e.target.value })}
                                    style={{ width: '100%', minHeight: '180px', padding: '12px', resize: 'vertical' }}
                                    placeholder="Write your message here..."
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
                            <button
                                className="ae-btn-secondary"
                                onClick={() => setEmailModal({ ...emailModal, open: false })}
                                disabled={sendingEmail}
                                style={{ padding: '10px 24px' }}
                            >
                                Cancel
                            </button>
                            <button
                                className="ae-btn-primary"
                                onClick={handleSendEmail}
                                disabled={sendingEmail}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 32px',
                                    background: '#38A169'
                                }}
                            >
                                {sendingEmail ? <RefreshCw className="animate-spin" size={18} /> : <Mail size={18} />}
                                {sendingEmail ? 'Sending...' : 'Send Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default EstimateForm;
