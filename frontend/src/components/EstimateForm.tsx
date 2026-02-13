import React, { useState, useEffect } from 'react';
import {
    Save,
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
    Mail,
    Eye,
    Trash2,
    Pencil,
    Sparkles,
    PlusCircle
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';

interface EstimateFormProps {
    id: number;
    onBack: () => void;
    onSave?: () => void;
}

const getInitialFormData = () => ({
    estimate_date: new Date().toISOString().split('T')[0],
    subscription_from: '',
    subscription_to: '',
    description_memo: '',
    terms_conditions: '',
    deal: '',
    cost_sheet: '',
    items: [
        { id: Date.now(), sr_no: 1, particulars: '', description: '', qty: 0, rate: 0, amount: 0 }
    ],
    column_labels: {
        sr_no: 'Sr.No.',
        particulars: 'Particulars',
        description: 'Description',
        qty: 'Qty',
        rate: 'Rate',
        amount: 'Amount'
    }
});

const EstimateForm: React.FC<EstimateFormProps> = ({ id, onBack, onSave }) => {
    const { showNotification } = useNotification();
    const [estimate, setEstimate] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<any>(getInitialFormData());

    const [deals, setDeals] = useState<any[]>([]);
    const [costSheets, setCostSheets] = useState<any[]>([]);
    const [companyProfile, setCompanyProfile] = useState<any>(null);

    // Email Modal State
    const [emailModal, setEmailModal] = useState<{
        open: boolean;
        to: string;
        cc: string;
        bcc: string;
        subject: string;
        body: string;
        templateType: 'standard' | 'followup' | 'revised';
    }>({
        open: false,
        to: '',
        cc: '',
        bcc: '',
        subject: '',
        body: '',
        templateType: 'standard'
    });
    const [sendingEmail, setSendingEmail] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [editingColumn, setEditingColumn] = useState<string | null>(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectComment, setRejectComment] = useState('');

    const EMAIL_TEMPLATES = {
        standard: {
            name: 'Standard Proposal',
            subject: (projectName: string, companyName: string) => `Proposal for ${projectName} - ${companyName}`,
            body: (clientName: string, projectName: string, companyName: string, expirationDate: string, yourName: string) =>
                `Dear ${clientName},\n\nGreetings from ${companyName} !!\n\nIt was a pleasure discussing ${projectName} with you. Based on our conversation, I’ve attached a detailed proposal including estimates / quotation for the services and license we discussed.\n\nYou can find the full breakdown of costs and timelines in the attached PDF.\n\nThis proposal is valid until ${expirationDate}. Please let me know if you have any questions or if you’d like to move forward.\n\nBest regards,\n${yourName}`
        },
        followup: {
            name: 'Follow-Up',
            subject: (projectName: string) => `Quick question about your ${projectName} proposal`,
            body: (clientName: string, _projectName: string, sentDate: string, yourName: string) =>
                `Hi ${clientName},\n\nI’m checking in to see if you had a chance to review the proposal I sent on ${sentDate}. I’ve re-attached it here for your convenience.\n\nAre there any specific details or technical aspects I can clarify for you? I’m happy to hop on a 5-minute call to walk you through it.\n\nLooking forward to your thoughts.\n\nBest,\n${yourName}`
        },
        revised: {
            name: 'Revised Quotation',
            subject: (projectName: string, companyName: string) => `Updated Quote for ${projectName} - ${companyName}`,
            body: (clientName: string, _projectName: string, _companyName: string, revisionDetails: string, yourName: string) =>
                `Dear ${clientName},\n\nThank you for your feedback on the initial proposal. As discussed, I have revised the scope to include ${revisionDetails} and adjusted the pricing accordingly.\n\nYou will find the updated proposal attached. Let me know if this aligns better with your current budget and requirements.\n\nKind regards,\n${yourName}`
        }
    };

    const openEmailModal = (type: keyof typeof EMAIL_TEMPLATES = 'standard') => {
        const clientName = estimate?.customer_name || '[Client Name]';
        const projectName = estimate?.project_name || '[Project Name]';
        const companyName = companyProfile?.name || "Automation Edge";
        const yourName = "Your Name"; // Should ideally be from user profile
        const expirationDate = "[Expiration Date]";
        const sentDate = "[Date]";
        const revisionDetails = "[specific change]";

        let subject = "";
        let body = "";

        if (type === 'standard') {
            subject = EMAIL_TEMPLATES.standard.subject(projectName, companyName);
            body = EMAIL_TEMPLATES.standard.body(clientName, projectName, companyName, expirationDate, yourName);
        } else if (type === 'followup') {
            subject = EMAIL_TEMPLATES.followup.subject(projectName);
            body = EMAIL_TEMPLATES.followup.body(clientName, projectName, sentDate, yourName);
        } else if (type === 'revised') {
            subject = EMAIL_TEMPLATES.revised.subject(projectName, companyName);
            body = EMAIL_TEMPLATES.revised.body(clientName, projectName, companyName, revisionDetails, yourName);
        }

        setEmailModal({
            open: true,
            to: estimate?.customer_email || (estimate?.customer?.email) || '',
            cc: '',
            bcc: '',
            subject: subject,
            body: body,
            templateType: type
        });
    };

    const handleTemplateChange = (type: keyof typeof EMAIL_TEMPLATES) => {
        const clientName = estimate?.customer_name || '[Client Name]';
        const projectName = estimate?.project_name || '[Project Name]';
        const companyName = companyProfile?.name || "Automation Edge";
        const yourName = "Your Name";
        const expirationDate = "[Expiration Date]";
        const sentDate = "[Date]";
        const revisionDetails = "[specific change]";

        let subject = "";
        let body = "";

        if (type === 'standard') {
            subject = EMAIL_TEMPLATES.standard.subject(projectName, companyName);
            body = EMAIL_TEMPLATES.standard.body(clientName, projectName, companyName, expirationDate, yourName);
        } else if (type === 'followup') {
            subject = EMAIL_TEMPLATES.followup.subject(projectName);
            body = EMAIL_TEMPLATES.followup.body(clientName, projectName, sentDate, yourName);
        } else if (type === 'revised') {
            subject = EMAIL_TEMPLATES.revised.subject(projectName, companyName);
            body = EMAIL_TEMPLATES.revised.body(clientName, projectName, companyName, revisionDetails, yourName);
        }

        setEmailModal({
            ...emailModal,
            subject: subject,
            body: body,
            templateType: type
        });
    };

    const handlePreview = () => {
        if (!id) {
            showNotification('Please save the estimate first to preview PDF', 'info');
            return;
        }
        window.open(`${api.defaults.baseURL}/estimates/${id}/preview_pdf/`, '_blank');
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

            // If estimate is not yet submitted, trigger the submit status change
            if (estimate?.status !== 'SUBMITTED') {
                try {
                    await api.post(`/estimates/${id}/submit/`);
                } catch (subErr) {
                    console.error('Status update failed after email', subErr);
                }
            }

            setEmailModal({ ...emailModal, open: false });
            fetchEstimateDetails(); // Refresh to show new status
        } catch (error: any) {
            console.error('Error sending email', error);
            showNotification(error.response?.data?.error || 'Failed to send email', 'error');
        } finally {
            setSendingEmail(false);
        }
    };

    const isReadOnly = estimate?.approval_status === 'APPROVED' || estimate?.status === 'PENDING_APPROVAL' || estimate?.status === 'SUBMITTED';

    const SectionHeader = ({ title, extra }: { title: string, extra?: React.ReactNode }) => (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                    width: '4px',
                    height: '18px',
                    background: '#0066CC',
                    borderRadius: '2px'
                }}></span>
                <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#FF6B00', margin: 0 }}>
                    {title}
                </h2>
            </div>
            {extra}
        </div>
    );

    const getCurrencySymbol = (currency: string) => {
        switch (currency) {
            case 'INR': return '₹';
            case 'USD': return '$';
            case 'EURO': return '€';
            default: return currency;
        }
    };

    const handleSaveAndSubmit = () => handleSave(true);

    useEffect(() => {
        if (id) {
            fetchEstimateDetails();
        } else {
            // Creating new estimate - reset form and set loading to false
            setLoading(false);
            setEstimate(null);
            setFormData(getInitialFormData());
            fetchInitialData();
        }
    }, [id]);

    const fetchInitialData = async () => {
        try {
            const [dealsRes, csRes, companyRes] = await Promise.all([
                api.get('/deals/'),
                api.get('/cost-sheets/?status=APPROVED'),
                api.get('/finance/company-profile/')
            ]);
            setDeals(dealsRes.data);
            setCostSheets(csRes.data);
            setCompanyProfile(companyRes.data[0]); // Get first company profile
        } catch (error) {
            console.error('Error fetching initial data', error);
            showNotification('Error loading deals or cost sheets', 'error');
        }
    };

    const fetchEstimateDetails = async () => {
        if (!id) return;

        setLoading(true);
        try {
            const [response, companyRes] = await Promise.all([
                api.get(`/estimates/${id}/`),
                api.get('/finance/company-profile/')
            ]);
            setEstimate(response.data);
            setCompanyProfile(companyRes.data[0]); // Get first company profile
            setFormData({
                estimate_date: response.data.estimate_date || new Date().toISOString().split('T')[0],
                subscription_from: response.data.subscription_from || '',
                subscription_to: response.data.subscription_to || '',
                description_memo: response.data.description_memo || '',
                terms_conditions: response.data.terms_conditions || '',
                deal: response.data.deal || '',
                cost_sheet: response.data.cost_sheet || '',
                items: response.data.items?.length > 0 ? response.data.items : [
                    { id: Date.now(), sr_no: 1, particulars: '', description: '', qty: 0, rate: 0, amount: 0 }
                ],
                column_labels: response.data.column_labels || {
                    sr_no: 'Sr.No.',
                    particulars: 'Particulars',
                    description: 'Description',
                    qty: 'Qty',
                    rate: 'Rate',
                    amount: 'Amount'
                }
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

    const handleHeaderChange = (field: string, value: string) => {
        setFormData({
            ...formData,
            column_labels: {
                ...formData.column_labels,
                [field]: value
            }
        });
    };

    const handleItemChange = (id: number, field: string, value: any) => {
        const updated = formData.items.map((item: any) => {
            if (item.id === id) {
                const newItem = { ...item, [field]: value };
                if (field === 'qty' || field === 'rate') {
                    newItem.amount = (newItem.qty || 0) * (newItem.rate || 0);
                } else if (field === 'amount') {
                    // If amount is edited manually, reverse calculate the rate
                    const qty = parseFloat(newItem.qty) || 0;
                    if (qty > 0) {
                        newItem.rate = Number(((parseFloat(value) || 0) / qty).toFixed(2));
                    }
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

        if (!id) {
            // Queue file for upload after estimate creation
            setPendingFile(file);
            showNotification(`File "${file.name}" selected and will be uploaded when you save.`, 'info');
            return;
        }

        const formDataFile = new FormData();
        formDataFile.append('file', file);
        formDataFile.append('estimate', id.toString());
        formDataFile.append('filename', file.name);

        try {
            const response = await api.post('/proposals/', formDataFile);
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
    const handleRemoveProposal = async (proposalId: number) => {
        if (!window.confirm('Are you sure you want to remove this attachment?')) return;

        try {
            await api.delete(`/proposals/${proposalId}/`);
            showNotification('Proposal attachment removed', 'success');
            // Update state to remove the proposal
            setEstimate((prev: any) => ({
                ...prev,
                proposals: prev.proposals.filter((p: any) => p.id !== proposalId)
            }));
        } catch (error: any) {
            console.error('Error removing proposal', error);
            showNotification(error.response?.data?.error || 'Failed to remove proposal', 'error');
        }
    };

    const handleSave = async (shouldSubmit = false) => {
        const total = calculateTotal();
        const costSheetPrice = parseFloat(estimate?.total_price || '0'); // Snapshot of CS price in estimate

        if (total < costSheetPrice) {
            showNotification(`Total Estimate ($${total.toLocaleString()}) cannot be less than Cost Sheet Price ($${costSheetPrice.toLocaleString()})`, 'error');
            return;
        }

        if ((id || shouldSubmit) && !estimate?.proposals?.length && !pendingFile) {
            showNotification('Please attach a proposal file before submitting for approval.', 'error');
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
            })),
            column_labels: formData.column_labels
        };
        try {
            let savedId = id;
            if (id) {
                await api.patch(`/estimates/${id}/`, payload);
            } else {
                const response = await api.post('/estimates/', payload);
                savedId = response.data.id;

                // If there's a pending file, upload it now
                if (pendingFile) {
                    const formDataFile = new FormData();
                    formDataFile.append('file', pendingFile);
                    formDataFile.append('estimate', savedId.toString());
                    formDataFile.append('filename', pendingFile.name);

                    try {
                        await api.post('/proposals/', formDataFile);
                    } catch (fileErr) {
                        console.error('File upload failed after creation', fileErr);
                        showNotification('Estimate created but proposal upload failed', 'warning');
                    }
                }
            }

            if (shouldSubmit) {
                await api.post(`/estimates/${savedId}/request_approval/`);
                showNotification('Estimate saved and submitted for approval successfully', 'success');
            } else {
                showNotification(id ? 'Estimate updated successfully' : 'Estimate created successfully', 'success');
            }

            if (onSave) {
                onSave();
            } else {
                onBack();
            }
        } catch (error: any) {
            console.error('Save error details:', error.response?.data);

            let errorMsg = 'Failed to save estimate';
            const errorData = error.response?.data;

            if (errorData) {
                if (typeof errorData === 'string') {
                    errorMsg = errorData;
                } else if (errorData.error) {
                    errorMsg = errorData.error;
                } else if (errorData.items) {
                    // Handle nested items errors
                    if (Array.isArray(errorData.items)) {
                        const firstError = errorData.items.find((item: any) => item && Object.keys(item).length > 0);
                        if (firstError) {
                            const field = Object.keys(firstError)[0];
                            const message = firstError[field];
                            errorMsg = `Item error (${field}): ${Array.isArray(message) ? message[0] : message}`;
                        } else if (typeof errorData.items[0] === 'string') {
                            errorMsg = errorData.items[0];
                        }
                    } else if (typeof errorData.items === 'string') {
                        errorMsg = errorData.items;
                    }
                } else if (errorData.proposals) {
                    errorMsg = Array.isArray(errorData.proposals) ? errorData.proposals[0] : errorData.proposals;
                } else {
                    // Fallback: extract first available error message
                    const firstKey = Object.keys(errorData)[0];
                    const firstVal = errorData[firstKey];
                    errorMsg = `${firstKey}: ${Array.isArray(firstVal) ? firstVal[0] : firstVal}`;
                }
            }

            showNotification(String(errorMsg), 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleRewind = async () => {
        if (!window.confirm('Rewinding will create a new version (copy) of this estimate starting as a Draft. Continue?')) return;
        setLoading(true); // User feedback
        try {
            await api.post(`/estimates/${id}/rewind/`);
            showNotification('Estimate rewarded (new version created)', 'success');
            onBack();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Failed to rewind estimate', 'error');
        } finally {
            setLoading(false);
        }
    };




    const handleApprove = async () => {
        try {
            await api.post(`/estimates/${id}/approve/`, { notes: 'Approved' });
            showNotification('Estimate approved successfully', 'success');
            fetchEstimateDetails();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Failed to approve estimate', 'error');
        }
    };

    const handleReject = async () => {
        if (!rejectComment) {
            showNotification('Rejection comments are required', 'error');
            return;
        }
        try {
            await api.post(`/estimates/${id}/reject/`, { notes: rejectComment });
            showNotification('Estimate rejected successfully', 'success');
            setShowRejectModal(false);
            setRejectComment('');
            fetchEstimateDetails();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Failed to reject estimate', 'error');
        }
    };

    const getApprovalStatusBadge = () => {
        if (!estimate) return null;

        // Hide Pending Approval badge for Draft/Negotiation
        if (estimate.approval_status === 'PENDING' && (estimate.status === 'DRAFT' || estimate.status === 'NEGOTIATION')) {
            return null;
        }

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
                    {getApprovalStatusBadge()}
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    {/* Approval Actions for Sales Head/Finance Manager - ONLY visible after saving (ID exists) */}
                    {id && estimate?.status === 'PENDING_APPROVAL' && (
                        <>
                            <button onClick={handleApprove} className="ae-btn-secondary" style={{ color: '#38A169', borderColor: '#38A169' }}>
                                <ThumbsUp size={18} /> Approve
                            </button>
                            <button onClick={() => setShowRejectModal(true)} className="ae-btn-secondary" style={{ color: '#E53E3E', borderColor: '#E53E3E' }}>
                                <ThumbsDown size={18} /> Reject
                            </button>
                        </>
                    )}

                    {/* Rejection Comments Banner */}
                    {estimate?.approval_status === 'REJECTED' && estimate?.approval_notes && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.04)',
                            border: '1px solid rgba(239, 68, 68, 0.1)',
                            borderLeft: '4px solid #EF4444',
                            borderRadius: '16px',
                            padding: '12px 20px',
                            margin: '0 24px 20px 24px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444', marginBottom: '8px' }}>
                                <XCircle size={16} strokeWidth={2.5} />
                                <span style={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rejection Comments</span>
                            </div>
                            <div style={{
                                background: 'white',
                                padding: '10px 16px',
                                borderRadius: '12px',
                                border: '1px solid rgba(239, 68, 68, 0.08)',
                                color: '#1e293b',
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                lineHeight: 1.4,
                                fontStyle: 'italic',
                                position: 'relative'
                            }}>
                                <span style={{ color: '#EF4444', fontSize: '1.2rem', fontWeight: 900, position: 'absolute', top: '4px', left: '6px', opacity: 0.2 }}>"</span>
                                {estimate.approval_notes}
                                <span style={{ color: '#EF4444', fontSize: '1.2rem', fontWeight: 900, position: 'absolute', bottom: '-4px', right: '6px', opacity: 0.2 }}>"</span>
                            </div>
                        </div>
                    )}

                    {/* Submit for Approval Button */}
                    {id && !isReadOnly && (
                        <button
                            onClick={handlePreview}
                            className="ae-btn-secondary flex items-center gap-2"
                            title="Preview PDF"
                            style={{ padding: '6px 16px', color: '#718096', borderColor: '#E2E8F0' }}
                        >
                            <Eye size={16} /> Preview
                        </button>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>

                        {/* Unapprove/Reopen button removed - Approved estimates are now locked */}

                        {/* Rewind Logic: Visible if Latest Version AND Approved (per user request) */}
                        {id && estimate?.is_latest && estimate?.approval_status === 'APPROVED' && (
                            <button
                                onClick={handleRewind}
                                disabled={saving}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 16px',
                                    borderRadius: '8px',
                                    background: '#EBF8FF',
                                    color: '#3182CE',
                                    border: '1px solid #BEE3F8',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer'
                                }}
                            >
                                <History size={16} /> Rewind (New Version)
                            </button>
                        )}

                        {/* Unapprove Button - Visible for Approved/Rejected estimates if latest */}

                    </div>



                    {/* Submit to Customer button (via Email Modal) */}
                    {(estimate?.status === 'SUBMITTED' || estimate?.approval_status === 'APPROVED') && (
                        <button
                            onClick={() => openEmailModal()}
                            className="ae-btn-primary"
                            disabled={estimate?.approval_status !== 'APPROVED'}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: '#38A169',
                                opacity: (estimate?.approval_status !== 'APPROVED') ? 0.5 : 1,
                                cursor: (estimate?.approval_status !== 'APPROVED') ? 'not-allowed' : 'pointer'
                            }}
                            title={estimate?.approval_status !== 'APPROVED' ? "Estimate must be approved to send email" : "Submit to Customer"}
                        >
                            <Mail size={18} /> Submit to Customer
                        </button>
                    )}
                </div>
            </div>

            {/* Excel-like Grid Layout */}
            <div style={{ padding: '24px', background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                {/* First Row: Cost Sheet, Deal, Customer Name */}
                <div className="ae-grid-3" style={{ marginBottom: '24px', gap: '16px' }}>
                    <div className="ae-input-group">
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: 'black', marginBottom: '4px' }}>
                            Cost Sheet Amount <span style={{ color: '#FF6B00' }}>*</span>
                            {(estimate?.cost_sheet_price || (formData.cost_sheet && (costSheets.find(cs => cs.id.toString() === formData.cost_sheet.toString())?.total_estimated_price))) && (
                                <span style={{ marginLeft: '8px', color: '#2b6cb0', fontWeight: 600 }}>
                                    (CS Amt:₹{parseFloat(estimate?.cost_sheet_price || costSheets.find(cs => cs.id.toString() === formData.cost_sheet.toString())?.total_estimated_price || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })})
                                </span>
                            )}
                        </label>
                        {!id ? (
                            <select
                                className="ae-input"
                                style={{ height: '34px', padding: '6px 10px', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500 }}
                                value={formData.cost_sheet}
                                onChange={async (e) => {
                                    const csId = e.target.value;
                                    if (!csId) {
                                        setFormData({ ...formData, cost_sheet: '', deal: '', items: [{ id: Date.now(), sr_no: 1, particulars: '', description: '', qty: 0, rate: 0, amount: 0 }] });
                                        setEstimate(null);
                                        return;
                                    }

                                    try {
                                        const response = await api.get(`/cost-sheets/${csId}/`);
                                        const csData = response.data;

                                        // Map cost categories to estimate items
                                        const newItems: any[] = [];
                                        let srNo = 1;

                                        const addCategory = (name: string, price: number) => {
                                            if (price > 0) {
                                                newItems.push({
                                                    id: Date.now() + srNo,
                                                    sr_no: srNo++,
                                                    particulars: name,
                                                    description: `${name} as per Cost Sheet ${csData.cost_sheet_no}`,
                                                    qty: 1,
                                                    rate: price,
                                                    amount: price
                                                });
                                            }
                                        };

                                        // Summarize by category
                                        const licPrice = (csData.license_items || []).reduce((sum: number, i: any) => sum + parseFloat(i.estimated_price), 0);
                                        const implPrice = (csData.implementation_items || []).reduce((sum: number, i: any) => sum + parseFloat(i.estimated_price), 0);
                                        const suppPrice = (csData.support_items || []).reduce((sum: number, i: any) => sum + parseFloat(i.estimated_price), 0);
                                        const infraPrice = (csData.infra_items || []).reduce((sum: number, i: any) => sum + parseFloat(i.estimated_price), 0);
                                        const otherPrice = (csData.other_items || []).reduce((sum: number, i: any) => sum + parseFloat(i.estimated_price), 0);

                                        addCategory('License Cost', licPrice);
                                        addCategory('Implementation Services', implPrice);
                                        addCategory('Support Services', suppPrice);
                                        addCategory('Infrastructure Cost', infraPrice);
                                        addCategory('Other Costs', otherPrice);

                                        if (newItems.length === 0) {
                                            newItems.push({ id: Date.now(), sr_no: 1, particulars: '', description: '', qty: 0, rate: 0, amount: 0 });
                                        }

                                        setFormData({
                                            ...formData,
                                            cost_sheet: csId,
                                            deal: csData.deal || '',
                                            items: newItems
                                        });

                                        setEstimate({
                                            customer_name: csData.customer_name,
                                            cost_sheet_no: csData.cost_sheet_no,
                                            deal_id: csData.deal_no,
                                            deal_amount: csData.deal_amount,
                                            total_price: csData.total_estimated_price // For validation
                                        });

                                    } catch (error) {
                                        console.error('Error fetching cost sheet details', error);
                                        showNotification('Failed to fetch cost sheet details', 'error');
                                    }
                                }}
                            >
                                <option value="">Select Cost Sheet</option>
                                {costSheets.map(cs => (
                                    <option key={cs.id} value={cs.id}>{cs.cost_sheet_no} - {cs.project_name}</option>
                                ))}
                            </select>
                        ) : (
                            <div style={{ padding: '6px 10px', background: '#F7FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '0.85rem', fontWeight: 600, height: '34px', display: 'flex', alignItems: 'center' }}>{estimate?.cost_sheet_no || 'XXXX'}</div>
                        )}
                    </div>
                    <div className="ae-input-group">
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: 'black', marginBottom: '4px' }}>
                            Deal No.
                            {(estimate?.deal_amount || (formData.deal && (deals.find(d => d.id.toString() === formData.deal.toString())?.deal_amount))) && (
                                <span style={{ marginLeft: '8px', color: '#38A169', fontWeight: 600 }}>
                                    (Deal Amt: ₹{parseFloat(estimate?.deal_amount || deals.find(d => d.id.toString() === formData.deal.toString())?.deal_amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })})
                                </span>
                            )}
                        </label>
                        {!id ? (
                            <select
                                className="ae-input"
                                style={{ height: '34px', padding: '6px 10px', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500 }}
                                value={formData.deal}
                                onChange={(e) => setFormData({ ...formData, deal: e.target.value })}
                            >
                                <option value="">Select Deal</option>
                                {deals.map(deal => (
                                    <option key={deal.id} value={deal.id}>{deal.deal_id} - {deal.deal_name}</option>
                                ))}
                            </select>
                        ) : (
                            <div style={{ padding: '6px 10px', background: '#F7FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '0.85rem', fontWeight: 600, height: '34px', display: 'flex', alignItems: 'center' }}>{estimate?.deal_id || 'XXXX'}</div>
                        )}
                    </div>
                    <div className="ae-input-group">
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: 'black', marginBottom: '4px' }}>Customer Name</label>
                        <div style={{ padding: '6px 10px', background: '#F7FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '0.85rem', fontWeight: 600, color: '#1a1f36', height: '34px', display: 'flex', alignItems: 'center' }}>{estimate?.customer_name || 'Select Cost Sheet'}</div>
                    </div>
                </div>

                {/* Second Row: Estimate No, Estimate Date, Subscription Period */}
                <div className="ae-grid-3" style={{ marginBottom: '24px', gap: '16px' }}>
                    <div className="ae-input-group">
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: 'black', marginBottom: '4px' }}>Estimate No.</label>
                        <div style={{ padding: '6px 10px', background: '#F7FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '0.85rem', fontWeight: 600, color: '#718096', height: '34px', display: 'flex', alignItems: 'center' }}>{estimate?.estimate_id || 'Generating...'}</div>
                    </div>
                    <div className="ae-input-group">
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: 'black', marginBottom: '4px' }}>Estimate Date</label>
                        <input
                            type="date"
                            style={{ height: '34px', padding: '6px 10px', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, background: 'white', width: '100%' }}
                            value={formData.estimate_date}
                            onChange={(e) => setFormData({ ...formData, estimate_date: e.target.value })}
                        />
                    </div>
                    <div className="ae-input-group">
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: 'black', marginBottom: '4px' }}>Subscription Period</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                type="date"
                                style={{ height: '34px', padding: '6px 10px', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, background: 'white', flex: 1 }}
                                value={formData.subscription_from}
                                onChange={(e) => setFormData({ ...formData, subscription_from: e.target.value })}
                                disabled={isReadOnly}
                                placeholder="From"
                            />
                            <span style={{ color: '#718096' }}>to</span>
                            <input
                                type="date"
                                style={{ height: '34px', padding: '6px 10px', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, background: 'white', flex: 1 }}
                                value={formData.subscription_to}
                                onChange={(e) => setFormData({ ...formData, subscription_to: e.target.value })}
                                disabled={isReadOnly}
                                placeholder="To"
                            />
                        </div>
                    </div>
                </div>

                {/* Third Row: Proposal Attachments (full width) */}
                <div style={{ marginBottom: '24px' }}>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black' }}>
                                Proposal Attachments (Versioning) <span style={{ color: '#FF6B00' }}>*</span>
                            </label>
                            <input
                                type="file"
                                id="proposal-upload"
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                                disabled={estimate?.status === 'SUBMITTED'}
                            />
                            {!id && (
                                <label htmlFor="proposal-upload" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#0066CC', fontWeight: 600 }}>
                                    <Upload size={14} /> Upload Proposal
                                </label>
                            )}
                            {id && estimate?.status !== 'SUBMITTED' && (
                                <label htmlFor="proposal-upload" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#0066CC', fontWeight: 600 }}>
                                    <Upload size={14} /> Upload New Version
                                </label>
                            )}
                        </div>
                        <div style={{ maxHeight: '100px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px', background: 'white' }}>
                            {!id ? (
                                pendingFile ? (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#e6f6ff' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2d3748' }}>{pendingFile.name} (Pending)</span>
                                            <span style={{ fontSize: '0.7rem', color: '#718096' }}>Will be uploaded on save</span>
                                        </div>
                                        <button onClick={() => setPendingFile(null)} style={{ color: '#E53E3E', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ padding: '8px', fontSize: '0.85rem', color: '#718096' }}>No proposal selected. Click "Upload Proposal" to add one.</div>
                                )
                            ) : !estimate?.proposals?.length ? (
                                <div style={{ padding: '8px', fontSize: '0.85rem', color: '#E53E3E', fontWeight: 600 }}>No proposal attached. Please upload one.</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    {[...(estimate?.proposals || [])].reverse().map((prop: any, idx: number) => (
                                        <div key={prop.id} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            padding: '6px 8px',
                                            borderBottom: idx === (estimate?.proposals?.length || 0) - 1 ? 'none' : '1px solid #f1f5f9',
                                            background: idx === 0 ? '#f0fff4' : 'transparent'
                                        }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2d3748' }}>{prop.filename} (v{prop.version})</span>
                                                <span style={{ fontSize: '0.7rem', color: '#718096' }}>
                                                    By: {prop.uploaded_by_name || 'System'} | {new Date(prop.uploaded_at).toLocaleString()}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <a href={prop.file} target="_blank" rel="noopener noreferrer" style={{ color: '#0066CC' }} title="View File">
                                                    <CheckCircle2 size={16} />
                                                </a>
                                                {estimate?.status !== 'SUBMITTED' && (
                                                    <button
                                                        onClick={() => handleRemoveProposal(prop.id)}
                                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#E53E3E', padding: '2px' }}
                                                        title="Remove Attachment"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Line Items Table */}
                <div style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px', marginTop: '32px' }}>
                    <SectionHeader title="Product Line Items" />
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px' }}>
                        <thead>
                            <tr style={{ background: '#F8FAFC' }}>
                                <th style={{ padding: '12px 8px', width: '40px' }}></th>
                                <th style={{ width: '60px', padding: '12px 8px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#4A5568' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                        {editingColumn === 'sr_no' ? (
                                            <input
                                                autoFocus
                                                className="ae-input-subtle"
                                                style={{ background: 'white', border: '1px solid #E2E8F0', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, width: '100%', outline: 'none', fontSize: '0.75rem', textAlign: 'center' }}
                                                value={formData.column_labels.sr_no}
                                                onChange={(e) => handleHeaderChange('sr_no', e.target.value)}
                                                onBlur={() => setEditingColumn(null)}
                                                onKeyDown={(e) => e.key === 'Enter' && setEditingColumn(null)}
                                            />
                                        ) : (
                                            <>
                                                <span>{formData.column_labels.sr_no || 'Sr.No.'}</span>
                                                {!isReadOnly && <Pencil size={10} style={{ cursor: 'pointer', color: '#718096' }} onClick={() => setEditingColumn('sr_no')} />}
                                            </>
                                        )}
                                    </div>
                                </th>
                                <th style={{ width: '200px', padding: '12px 8px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#4A5568' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {editingColumn === 'particulars' ? (
                                            <input
                                                autoFocus
                                                className="ae-input-subtle"
                                                style={{ background: 'white', border: '1px solid #E2E8F0', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, width: '100%', outline: 'none', fontSize: '0.75rem' }}
                                                value={formData.column_labels.particulars}
                                                onChange={(e) => handleHeaderChange('particulars', e.target.value)}
                                                onBlur={() => setEditingColumn(null)}
                                                onKeyDown={(e) => e.key === 'Enter' && setEditingColumn(null)}
                                            />
                                        ) : (
                                            <>
                                                <span>{formData.column_labels.particulars || 'Particulars'}</span>
                                                {!isReadOnly && <Pencil size={10} style={{ cursor: 'pointer', color: '#718096' }} onClick={() => setEditingColumn('particulars')} />}
                                            </>
                                        )}
                                    </div>
                                </th>
                                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#4A5568' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {editingColumn === 'description' ? (
                                            <input
                                                autoFocus
                                                className="ae-input-subtle"
                                                style={{ background: 'white', border: '1px solid #E2E8F0', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, width: '100%', outline: 'none', fontSize: '0.75rem' }}
                                                value={formData.column_labels.description}
                                                onChange={(e) => handleHeaderChange('description', e.target.value)}
                                                onBlur={() => setEditingColumn(null)}
                                                onKeyDown={(e) => e.key === 'Enter' && setEditingColumn(null)}
                                            />
                                        ) : (
                                            <>
                                                <span>{formData.column_labels.description || 'Description'}</span>
                                                {!isReadOnly && <Pencil size={10} style={{ cursor: 'pointer', color: '#718096' }} onClick={() => setEditingColumn('description')} />}
                                            </>
                                        )}
                                    </div>
                                </th>
                                <th style={{ width: '80px', padding: '12px 8px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#4A5568' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                        {editingColumn === 'qty' ? (
                                            <input
                                                autoFocus
                                                className="ae-input-subtle"
                                                style={{ background: 'white', border: '1px solid #E2E8F0', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, width: '100%', outline: 'none', textAlign: 'center', fontSize: '0.75rem' }}
                                                value={formData.column_labels.qty}
                                                onChange={(e) => handleHeaderChange('qty', e.target.value)}
                                                onBlur={() => setEditingColumn(null)}
                                                onKeyDown={(e) => e.key === 'Enter' && setEditingColumn(null)}
                                            />
                                        ) : (
                                            <>
                                                <span>{formData.column_labels.qty || 'Qty'}</span>
                                                {!isReadOnly && <Pencil size={10} style={{ cursor: 'pointer', color: '#718096' }} onClick={() => setEditingColumn('qty')} />}
                                            </>
                                        )}
                                    </div>
                                </th>
                                <th style={{ width: '120px', padding: '12px 8px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 700, color: '#4A5568' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                        {editingColumn === 'rate' ? (
                                            <input
                                                autoFocus
                                                className="ae-input-subtle"
                                                style={{ background: 'white', border: '1px solid #E2E8F0', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, width: '100%', outline: 'none', textAlign: 'right', fontSize: '0.75rem' }}
                                                value={formData.column_labels.rate}
                                                onChange={(e) => handleHeaderChange('rate', e.target.value)}
                                                onBlur={() => setEditingColumn(null)}
                                                onKeyDown={(e) => e.key === 'Enter' && setEditingColumn(null)}
                                            />
                                        ) : (
                                            <>
                                                <span>{formData.column_labels.rate || 'Rate'}</span>
                                                {!isReadOnly && <Pencil size={10} style={{ cursor: 'pointer', color: '#718096' }} onClick={() => setEditingColumn('rate')} />}
                                            </>
                                        )}
                                    </div>
                                </th>
                                <th style={{ width: '140px', padding: '12px 8px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 700, color: '#4A5568' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                        {editingColumn === 'amount' ? (
                                            <input
                                                autoFocus
                                                className="ae-input-subtle"
                                                style={{ background: 'white', border: '1px solid #E2E8F0', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, width: '100%', outline: 'none', textAlign: 'right', fontSize: '0.75rem' }}
                                                value={formData.column_labels.amount}
                                                onChange={(e) => handleHeaderChange('amount', e.target.value)}
                                                onBlur={() => setEditingColumn(null)}
                                                onKeyDown={(e) => e.key === 'Enter' && setEditingColumn(null)}
                                            />
                                        ) : (
                                            <>
                                                <span>{formData.column_labels.amount || 'Amount'}</span>
                                                {!isReadOnly && <Pencil size={10} style={{ cursor: 'pointer', color: '#718096' }} onClick={() => setEditingColumn('amount')} />}
                                            </>
                                        )}
                                    </div>
                                </th>
                                <th style={{ width: '40px', padding: '12px 8px', borderBottom: '1px solid #E0E6ED' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {formData.items.map((item: any, index: number) => (
                                <tr key={item.id} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                                    <td style={{ padding: '8px', textAlign: 'center' }}>
                                        {index === formData.items.length - 1 && !isReadOnly && (
                                            <button
                                                type="button"
                                                onClick={handleAddItem}
                                                style={{
                                                    padding: '4px',
                                                    background: '#F0F9FF',
                                                    border: '1px solid #BAE6FD',
                                                    borderRadius: '6px',
                                                    color: '#0284C7',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    margin: '0 auto'
                                                }}
                                                title="Add row"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        )}
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'center', fontSize: '0.9rem', color: '#4A5568', fontWeight: 600 }}>
                                        {index + 1}
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <input
                                            className="ae-input"
                                            style={{ height: '36px', padding: '4px 8px', width: '100%' }}
                                            value={item.particulars || ''}
                                            onChange={(e) => handleItemChange(item.id, 'particulars', e.target.value)}
                                            disabled={isReadOnly}
                                            placeholder="Enter particulars"
                                        />
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <textarea
                                            className="ae-input"
                                            style={{ padding: '4px 8px', minHeight: '36px', width: '100%', resize: 'vertical' }}
                                            value={item.description || ''}
                                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                            disabled={isReadOnly}
                                            placeholder="Enter description"
                                        />
                                    </td>

                                    <td style={{ padding: '8px' }}>
                                        <input
                                            type="number"
                                            className="ae-input"
                                            style={{ height: '36px', padding: '4px 8px', textAlign: 'center', width: '100%' }}
                                            value={item.qty || 0}
                                            onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                                            disabled={isReadOnly}
                                        />
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <span style={{ position: 'absolute', left: '8px', fontSize: '0.8rem', color: '#718096', fontWeight: 600 }}>{getCurrencySymbol(formData.currency || 'INR')}</span>
                                            <input
                                                type="number"
                                                className="ae-input"
                                                style={{ height: '36px', padding: '4px 8px 4px 20px', textAlign: 'right', width: '100%' }}
                                                value={item.rate || 0}
                                                onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                                                disabled={isReadOnly}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Tab' && !e.shiftKey && index === formData.items.length - 1) {
                                                        e.preventDefault();
                                                        handleAddItem();
                                                    }
                                                }}
                                            />
                                        </div>
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.9rem', fontWeight: 700, color: '#1a1f36' }}>
                                        {getCurrencySymbol(formData.currency || 'INR')}{item.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'center' }}>
                                        {formData.items.length > 1 && !isReadOnly && (
                                            <button
                                                onClick={() => handleRemoveItem(item.id)}
                                                style={{
                                                    background: '#FFF5F5',
                                                    border: '1px solid #FED7D7',
                                                    borderRadius: '6px',
                                                    color: '#E53E3E',
                                                    cursor: 'pointer',
                                                    padding: '6px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.2s',
                                                    margin: '0 auto'
                                                }}
                                                onMouseOver={(e) => { e.currentTarget.style.background = '#FED7D7'; }}
                                                onMouseOut={(e) => { e.currentTarget.style.background = '#FFF5F5'; }}
                                                title="Remove Row"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: '#F8FAFC' }}>
                                <td colSpan={6} style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.9rem', fontWeight: 700, color: '#4A5568' }}>Total:</td>
                                <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '1.1rem', fontWeight: 800, color: '#FF6B00' }}>
                                    {getCurrencySymbol(formData.currency || 'INR')}{calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Bottom Sections */}
                <div style={{ marginTop: '24px' }}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '8px' }}>Description / Memo</label>
                        <textarea
                            style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '12px', minHeight: '80px', outline: 'none', background: isReadOnly ? '#f7fafc' : 'white', fontSize: '0.85rem' }}
                            placeholder="Type here..."
                            value={formData.description_memo || ''}
                            onChange={(e) => setFormData({ ...formData, description_memo: e.target.value })}
                            disabled={isReadOnly}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '8px' }}>Terms & Conditions</label>
                        <textarea
                            style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '12px', minHeight: '80px', outline: 'none', background: isReadOnly ? '#f7fafc' : 'white', fontSize: '0.85rem' }}
                            placeholder="Type here..."
                            value={formData.terms_conditions || ''}
                            onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                            disabled={isReadOnly}
                        />
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px', background: 'white', borderTop: '1px solid #99b6d8' }}>
                <div className="flex items-center gap-3">
                    {id && isReadOnly && estimate?.approval_status !== 'PENDING' && (
                        <button
                            onClick={handlePreview}
                            className="ae-btn-secondary flex items-center gap-2"
                            title="Preview PDF"
                            style={{ padding: '8px 16px' }}
                        >
                            <Eye size={18} /> Preview
                        </button>
                    )}
                    {!isReadOnly && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                                onClick={() => handleSave(false)}
                                disabled={saving}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    background: 'white',
                                    color: '#1a1f36',
                                    border: '1px solid #E2E8F0',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#f8fafc';
                                    e.currentTarget.style.borderColor = '#cbd5e1';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'white';
                                    e.currentTarget.style.borderColor = '#E2E8F0';
                                }}
                            >
                                <Save size={16} />
                                <span>Save as Draft</span>
                            </button>

                            <button
                                onClick={handleSaveAndSubmit}
                                disabled={saving}
                                className="ae-btn-primary"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 20px',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    fontWeight: 800,
                                    background: '#FF6B00',
                                    border: 'none',
                                    color: 'white'
                                }}
                            >
                                <PlusCircle size={18} />
                                <span>Submit for Approval</span>
                            </button>

                            <button
                                onClick={() => onBack()}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    background: 'transparent',
                                    color: '#718096',
                                    border: 'none',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={16} />
                                <span>Cancel</span>
                            </button>
                        </div>
                    )}
                    {estimate?.status === 'PENDING_APPROVAL' && (
                        <span style={{
                            padding: '6px 16px',
                            borderRadius: '8px',
                            background: '#FFFAF0',
                            color: '#DD6B20',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            border: '1px solid #FBD38D',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <Clock size={18} /> Pending Approval
                        </span>
                    )}
                    {estimate?.approval_status === 'APPROVED' && (
                        <div className="flex items-center gap-3">
                            <span style={{
                                padding: '6px 16px',
                                borderRadius: '8px',
                                background: '#E6F7ED',
                                color: '#38A169',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                border: '1px solid #38A169',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <CheckCircle2 size={18} /> Approved
                            </span>
                            {estimate?.is_latest && (
                                <button
                                    onClick={handleRewind}
                                    disabled={saving}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 20px',
                                        borderRadius: '8px',
                                        background: '#EBF8FF',
                                        color: '#3182CE',
                                        border: '1px solid #BEE3F8',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <History size={18} /> Rewind (New Version)
                                </button>
                            )}
                        </div>
                    )}
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

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem', color: '#4A5568' }}>Select Template:</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {(Object.keys(EMAIL_TEMPLATES) as Array<keyof typeof EMAIL_TEMPLATES>).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => handleTemplateChange(type)}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '8px',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                border: '1.5px solid',
                                                background: emailModal.templateType === type ? '#38A169' : 'white',
                                                color: emailModal.templateType === type ? 'white' : '#4A5568',
                                                borderColor: emailModal.templateType === type ? '#38A169' : '#E2E8F0'
                                            }}
                                        >
                                            {EMAIL_TEMPLATES[type].name}
                                        </button>
                                    ))}
                                </div>
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
                                    {sendingEmail ? 'Sending...' : 'Send Now'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Rejection Modal */}
                {showRejectModal && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10000,
                            background: 'rgba(0, 0, 0, 0.45)',
                            backdropFilter: 'blur(12px)',
                            padding: '24px',
                        }}
                    >
                        <div
                            style={{
                                background: 'white',
                                width: '100%',
                                maxWidth: '400px',
                                borderRadius: '24px',
                                boxShadow: '0 40px 120px rgba(0,0,0,0.3)',
                                overflow: 'hidden',
                                position: 'relative',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{
                                background: '#FF6B00',
                                padding: '28px 24px 24px',
                                position: 'relative',
                            }}>
                                <button
                                    onClick={() => setShowRejectModal(false)}
                                    style={{
                                        position: 'absolute',
                                        top: '16px',
                                        right: '16px',
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        background: 'transparent',
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: 'white',
                                        opacity: 0.7,
                                    }}
                                >
                                    <X size={16} strokeWidth={3} />
                                </button>

                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        background: 'rgba(255,255,255,0.2)',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        <Sparkles size={18} color="white" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{
                                            fontSize: '1.25rem',
                                            fontWeight: 800,
                                            color: 'white',
                                            margin: '0 0 4px 0',
                                            lineHeight: 1.2
                                        }}>Reject Estimate</h3>
                                        <p style={{
                                            margin: 0,
                                            color: 'rgba(255,255,255,0.95)',
                                            fontSize: '0.8rem',
                                            fontWeight: 500,
                                            lineHeight: 1.4
                                        }}>
                                            Provide a reason for rejecting this estimate for the records.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div style={{ padding: '24px' }}>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        color: '#1e293b',
                                        marginBottom: '8px'
                                    }}>Rejection Reason</label>
                                    <textarea
                                        value={rejectComment}
                                        onChange={e => setRejectComment(e.target.value)}
                                        placeholder="Type your reason here..."
                                        autoFocus
                                        style={{
                                            width: '100%',
                                            height: '90px',
                                            background: '#f8fafc',
                                            border: '1.5px solid #e2e8f0',
                                            borderRadius: '12px',
                                            padding: '12px 16px',
                                            fontSize: '0.9rem',
                                            color: '#1e293b',
                                            outline: 'none',
                                            resize: 'none',
                                            fontWeight: 500
                                        }}
                                    />
                                </div>

                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    gap: '10px'
                                }}>
                                    <button
                                        onClick={() => setShowRejectModal(false)}
                                        style={{
                                            padding: '10px 20px',
                                            borderRadius: '12px',
                                            background: '#f1f5f9',
                                            color: '#475569',
                                            fontWeight: 700,
                                            fontSize: '0.85rem',
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >Cancel</button>
                                    <button
                                        onClick={handleReject}
                                        style={{
                                            padding: '10px 24px',
                                            borderRadius: '12px',
                                            background: '#FF6B00',
                                            color: 'white',
                                            fontWeight: 700,
                                            fontSize: '0.85rem',
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >Reject</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EstimateForm;
