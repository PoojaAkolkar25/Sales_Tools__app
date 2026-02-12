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
    Eye
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
        subscription_from: '',
        subscription_to: '',
        description_memo: '',
        terms_conditions: '',
        deal: '',
        cost_sheet: '',
        items: [
            { id: Date.now(), sr_no: 1, particulars: '', description: '', hsn_sac: '', qty: 0, rate: 0, amount: 0 }
        ],
        column_labels: {
            sr_no: 'Sr.No.',
            particulars: 'Particulars',
            description: 'Description',
            hsn_sac: 'HSN/SAC',
            qty: 'Qty',
            rate: 'Rate',
            amount: 'Amount'
        }
    });

    const [deals, setDeals] = useState<any[]>([]);
    const [costSheets, setCostSheets] = useState<any[]>([]);

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
        const companyName = "Your Company Name"; // Should ideally be dynamic
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
        const companyName = "Your Company Name";
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

    const isReadOnly = estimate?.approval_status === 'APPROVED' || estimate?.status === 'SUBMITTED';

    useEffect(() => {
        if (id) {
            fetchEstimateDetails();
        } else {
            // Creating new estimate - set loading to false
            setLoading(false);
            setEstimate(null);
            fetchInitialData();
        }
    }, [id]);

    const fetchInitialData = async () => {
        try {
            const [dealsRes, csRes] = await Promise.all([
                api.get('/deals/'),
                api.get('/cost-sheets/?status=APPROVED')
            ]);
            setDeals(dealsRes.data);
            setCostSheets(csRes.data);
        } catch (error) {
            console.error('Error fetching initial data', error);
            showNotification('Error loading deals or cost sheets', 'error');
        }
    };

    const fetchEstimateDetails = async () => {
        if (!id) return;

        setLoading(true);
        try {
            const response = await api.get(`/estimates/${id}/`);
            setEstimate(response.data);
            setFormData({
                estimate_date: response.data.estimate_date || new Date().toISOString().split('T')[0],
                subscription_from: response.data.subscription_from || '',
                subscription_to: response.data.subscription_to || '',
                description_memo: response.data.description_memo || '',
                terms_conditions: response.data.terms_conditions || '',
                deal: response.data.deal || '',
                cost_sheet: response.data.cost_sheet || '',
                items: response.data.items?.length > 0 ? response.data.items : [
                    { id: Date.now(), sr_no: 1, particulars: '', description: '', hsn_sac: '', qty: 0, rate: 0, amount: 0 }
                ],
                column_labels: response.data.column_labels || {
                    sr_no: 'Sr.No.',
                    particulars: 'Particulars',
                    description: 'Description',
                    hsn_sac: 'HSN/SAC',
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
            items: [...formData.items, { id: Date.now(), sr_no: nextSrNo, particulars: '', description: '', hsn_sac: '', qty: 0, rate: 0, amount: 0 }]
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

    const handleSave = async () => {
        const total = calculateTotal();
        const costSheetPrice = parseFloat(estimate?.total_price || '0'); // Snapshot of CS price in estimate

        if (total < costSheetPrice) {
            showNotification(`Total Estimate ($${total.toLocaleString()}) cannot be less than Cost Sheet Price ($${costSheetPrice.toLocaleString()})`, 'error');
            return;
        }

        if (id && !estimate?.proposals?.length) {
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
            })),
            column_labels: formData.column_labels
        };
        try {
            if (id) {
                await api.patch(`/estimates/${id}/`, payload);
                showNotification('Estimate updated successfully', 'success');
                fetchEstimateDetails();
            } else {
                const response = await api.post('/estimates/', payload);
                const newEstimateId = response.data.id;

                // If there's a pending file, upload it now
                if (pendingFile) {
                    const formDataFile = new FormData();
                    formDataFile.append('file', pendingFile);
                    formDataFile.append('estimate', newEstimateId.toString());
                    formDataFile.append('filename', pendingFile.name);

                    try {
                        await api.post('/proposals/', formDataFile);
                        showNotification('Estimate created and proposal uploaded', 'success');
                    } catch (fileErr) {
                        console.error('File upload failed after creation', fileErr);
                        showNotification('Estimate created but proposal upload failed', 'warning');
                    }
                } else {
                    showNotification('Estimate created successfully', 'success');
                }

                // Redirect back to dashboard
                onBack();
            }
        } catch (error: any) {
            const errorMsg = error.response?.data?.items || error.response?.data?.error || 'Failed to save estimate';
            showNotification(errorMsg, 'error');
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

    const handleUnapprove = async () => {
        if (!window.confirm('Are you sure you want to unapprove this estimate? This will make it editable again.')) return;
        try {
            await api.post(`/estimates/${id}/unapprove/`);
            showNotification('Estimate unapproved and is now editable', 'success');
            fetchEstimateDetails();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Failed to unapprove estimate', 'error');
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
                    {/* Approval Actions for Sales Head/Finance Manager */}
                    {estimate?.approval_status === 'PENDING' && (
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
                    {(estimate?.status === 'DRAFT' || estimate?.status === 'NEGOTIATION') && estimate?.approval_status !== 'PENDING' && estimate?.approval_status !== 'APPROVED' && (
                        <button onClick={handleRequestApproval} className="ae-btn-secondary" style={{ color: '#0066CC', borderColor: '#0066CC' }}>
                            <Clock size={18} /> Request Approval
                        </button>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>

                        {/* Unapprove/Reopen button removed - Approved estimates are now locked */}

                        {/* Rewind Logic: Visible if Latest Version (Removed version < 2 restriction) */}
                        {estimate?.is_latest && (
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
                        {estimate?.is_latest && (estimate?.approval_status === 'APPROVED' || estimate?.approval_status === 'REJECTED') && (
                            <button
                                onClick={handleUnapprove}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 16px',
                                    borderRadius: '8px',
                                    background: '#FFF5F5',
                                    color: '#C53030',
                                    border: '1px solid #FED7D7',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer'
                                }}
                            >
                                <RefreshCw size={16} /> Unapprove / Reopen
                            </button>
                        )}
                    </div>



                    {/* Submit to Customer button (via Email Modal) */}
                    {(estimate?.status === 'SUBMITTED' || estimate?.approval_status === 'APPROVED') && (
                        <button
                            onClick={() => openEmailModal()}
                            className="ae-btn-primary"
                            disabled={!estimate?.proposals?.length || estimate?.approval_status !== 'APPROVED'}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: '#38A169',
                                opacity: (!estimate?.proposals?.length || estimate?.approval_status !== 'APPROVED') ? 0.5 : 1,
                                cursor: (!estimate?.proposals?.length || estimate?.approval_status !== 'APPROVED') ? 'not-allowed' : 'pointer'
                            }}
                            title={estimate?.approval_status !== 'APPROVED' ? "Estimate must be approved to send email" : (!estimate?.proposals?.length ? "Attach a proposal first" : "Submit to Customer")}
                        >
                            <Mail size={18} /> Submit to Customer
                        </button>
                    )}
                </div>
            </div>

            {/* Excel-like Grid Layout */}
            <div style={{ padding: '0', overflow: 'hidden', border: '1px solid #99b6d8', background: 'white', borderRadius: '12px' }}>
                {/* Top Information Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', background: '#dce6f1', borderBottom: '1px solid #99b6d8' }}>
                    <div style={{ padding: '8px', borderRight: '1px solid #99b6d8' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#4a5568' }}>Cost Sheet No. <span style={{ color: '#E53E3E' }}>*</span></label>
                        {!id ? (
                            <select
                                className="ae-input"
                                style={{ width: '100%', border: '1px solid #99b6d8', background: 'white', fontWeight: 600, padding: '2px 4px', height: '28px' }}
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
                            <div style={{ fontWeight: 600 }}>{estimate?.cost_sheet_no || 'XXXX'}</div>
                        )}
                    </div>
                    <div style={{ padding: '8px', borderRight: '1px solid #99b6d8' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#4a5568' }}>Deal No.</label>
                        {!id ? (
                            <select
                                className="ae-input"
                                style={{ width: '100%', border: '1px solid #99b6d8', background: 'white', fontWeight: 600, padding: '2px 4px', height: '28px' }}
                                value={formData.deal}
                                onChange={(e) => setFormData({ ...formData, deal: e.target.value })}
                            >
                                <option value="">Select Deal</option>
                                {deals.map(deal => (
                                    <option key={deal.id} value={deal.id}>{deal.deal_id} - {deal.deal_name}</option>
                                ))}
                            </select>
                        ) : (
                            <div style={{ fontWeight: 600 }}>{estimate?.deal_id || 'XXXX'}</div>
                        )}
                    </div>
                    <div style={{ padding: '8px', borderRight: '1px solid #99b6d8' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#4a5568' }}>Estimate No.</label>
                        <div style={{ fontWeight: 600, color: '#718096' }}>{estimate?.estimate_id || 'Generating...'}</div>
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
                            {!id && !isReadOnly && (
                                <label htmlFor="proposal-upload" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#0066CC', fontWeight: 600 }}>
                                    <Upload size={14} /> Upload Proposal
                                </label>
                            )}
                            {id && !isReadOnly && (
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
                                            <a href={prop.file} target="_blank" rel="noopener noreferrer" style={{ alignSelf: 'center', color: '#0066CC' }}>
                                                <CheckCircle2 size={16} />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div style={{ padding: '8px', borderRight: '1px solid #99b6d8' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#4a5568' }}>Customer Name</label>
                        <div style={{ fontWeight: 600, color: '#718096' }}>{estimate?.customer_name || 'Select Cost Sheet'}</div>
                    </div>
                    <div style={{ padding: '8px', borderRight: '1px solid #99b6d8' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#4a5568' }}>Subscription From</label>
                        <input
                            type="date"
                            style={{ width: '100%', border: 'none', background: 'transparent', fontWeight: 600, padding: 0 }}
                            value={formData.subscription_from}
                            onChange={(e) => setFormData({ ...formData, subscription_from: e.target.value })}
                            disabled={isReadOnly}
                        />
                    </div>
                    <div style={{ padding: '8px', borderRight: '1px solid #99b6d8' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#4a5568' }}>Subscription To</label>
                        <input
                            type="date"
                            style={{ width: '100%', border: 'none', background: 'transparent', fontWeight: 600, padding: 0 }}
                            value={formData.subscription_to}
                            onChange={(e) => setFormData({ ...formData, subscription_to: e.target.value })}
                            disabled={isReadOnly}
                        />
                    </div>
                </div>

                {/* Line Items Table */}
                <div style={{ minHeight: '300px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#dce6f1', borderBottom: '1px solid #99b6d8' }}>
                                <th style={{ width: '80px', padding: '10px', textAlign: 'left', borderRight: '1px solid #99b6d8' }}>
                                    <input
                                        className="ae-input-subtle"
                                        style={{ background: 'transparent', border: 'none', fontWeight: 'bold', width: '100%', outline: 'none' }}
                                        value={formData.column_labels.sr_no || 'Sr.No.'}
                                        onChange={(e) => handleHeaderChange('sr_no', e.target.value)}
                                        disabled={isReadOnly}
                                        title="Click to edit column name"
                                    />
                                </th>
                                <th style={{ width: '200px', padding: '10px', textAlign: 'left', borderRight: '1px solid #99b6d8' }}>
                                    <input
                                        className="ae-input-subtle"
                                        style={{ background: 'transparent', border: 'none', fontWeight: 'bold', width: '100%', outline: 'none' }}
                                        value={formData.column_labels.particulars || 'Particulars'}
                                        onChange={(e) => handleHeaderChange('particulars', e.target.value)}
                                        disabled={isReadOnly}
                                        title="Click to edit column name"
                                    />
                                </th>
                                <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid #99b6d8' }}>
                                    <input
                                        className="ae-input-subtle"
                                        style={{ background: 'transparent', border: 'none', fontWeight: 'bold', width: '100%', outline: 'none' }}
                                        value={formData.column_labels.description || 'Description'}
                                        onChange={(e) => handleHeaderChange('description', e.target.value)}
                                        disabled={isReadOnly}
                                        title="Click to edit column name"
                                    />
                                </th>
                                <th style={{ width: '100px', padding: '10px', textAlign: 'left', borderRight: '1px solid #99b6d8' }}>
                                    <input
                                        className="ae-input-subtle"
                                        style={{ background: 'transparent', border: 'none', fontWeight: 'bold', width: '100%', outline: 'none' }}
                                        value={formData.column_labels.hsn_sac || 'HSN/SAC'}
                                        onChange={(e) => handleHeaderChange('hsn_sac', e.target.value)}
                                        disabled={isReadOnly}
                                        title="Click to edit column name"
                                    />
                                </th>
                                <th style={{ width: '100px', padding: '10px', textAlign: 'center', borderRight: '1px solid #99b6d8' }}>
                                    <input
                                        className="ae-input-subtle"
                                        style={{ background: 'transparent', border: 'none', fontWeight: 'bold', width: '100%', outline: 'none', textAlign: 'center' }}
                                        value={formData.column_labels.qty || 'Qty'}
                                        onChange={(e) => handleHeaderChange('qty', e.target.value)}
                                        disabled={isReadOnly}
                                        title="Click to edit column name"
                                    />
                                </th>
                                <th style={{ width: '120px', padding: '10px', textAlign: 'right', borderRight: '1px solid #99b6d8' }}>
                                    <input
                                        className="ae-input-subtle"
                                        style={{ background: 'transparent', border: 'none', fontWeight: 'bold', width: '100%', outline: 'none', textAlign: 'right' }}
                                        value={formData.column_labels.rate || 'Rate'}
                                        onChange={(e) => handleHeaderChange('rate', e.target.value)}
                                        disabled={isReadOnly}
                                        title="Click to edit column name"
                                    />
                                </th>
                                <th style={{ width: '150px', padding: '10px', textAlign: 'right', borderRight: '1px solid #99b6d8' }}>
                                    <input
                                        className="ae-input-subtle"
                                        style={{ background: 'transparent', border: 'none', fontWeight: 'bold', width: '100%', outline: 'none', textAlign: 'right' }}
                                        value={formData.column_labels.amount || 'Amount'}
                                        onChange={(e) => handleHeaderChange('amount', e.target.value)}
                                        disabled={isReadOnly}
                                        title="Click to edit column name"
                                    />
                                </th>
                                <th style={{ width: '50px', padding: '10px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {formData.items.map((item: any) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0', background: isReadOnly ? '#f7fafc' : '#f8fbff' }}>
                                    <td style={{ padding: '8px', borderRight: '1px solid #99b6d8', textAlign: 'center' }}>
                                        <input
                                            type="number"
                                            className="ae-input-subtle"
                                            style={{ background: 'transparent', border: 'none', padding: '4px', textAlign: 'center', width: '100%', outline: 'none' }}
                                            value={item.sr_no || ''}
                                            onChange={(e) => handleItemChange(item.id, 'sr_no', parseInt(e.target.value) || 0)}
                                            disabled={isReadOnly}
                                        />
                                    </td>
                                    <td style={{ padding: '8px', borderRight: '1px solid #99b6d8' }}>
                                        <input
                                            className="ae-input-subtle"
                                            style={{ background: 'transparent', border: 'none', padding: '4px', width: '100%', outline: 'none' }}
                                            value={item.particulars || ''}
                                            onChange={(e) => handleItemChange(item.id, 'particulars', e.target.value)}
                                            disabled={isReadOnly}
                                        />
                                    </td>
                                    <td style={{ padding: '8px', borderRight: '1px solid #99b6d8' }}>
                                        <textarea
                                            className="ae-input-subtle"
                                            style={{ background: 'transparent', border: 'none', padding: '4px', minHeight: '40px', width: '100%', outline: 'none', resize: 'vertical' }}
                                            value={item.description || ''}
                                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                            disabled={isReadOnly}
                                        />
                                    </td>
                                    <td style={{ padding: '8px', borderRight: '1px solid #99b6d8' }}>
                                        <input
                                            className="ae-input-subtle"
                                            style={{ background: 'transparent', border: 'none', padding: '4px', width: '100%', outline: 'none' }}
                                            value={item.hsn_sac || ''}
                                            onChange={(e) => handleItemChange(item.id, 'hsn_sac', e.target.value)}
                                            disabled={isReadOnly}
                                        />
                                    </td>
                                    <td style={{ padding: '8px', borderRight: '1px solid #99b6d8' }}>
                                        <input
                                            type="number"
                                            className="ae-input-subtle"
                                            style={{ background: 'transparent', border: 'none', padding: '4px', textAlign: 'center', width: '100%', outline: 'none' }}
                                            value={item.qty || 0}
                                            onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                                            disabled={isReadOnly}
                                        />
                                    </td>
                                    <td style={{ padding: '8px', borderRight: '1px solid #99b6d8' }}>
                                        <input
                                            type="number"
                                            className="ae-input-subtle"
                                            style={{ background: 'transparent', border: 'none', padding: '4px', textAlign: 'right', width: '100%', outline: 'none' }}
                                            value={item.rate || 0}
                                            onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                                            disabled={isReadOnly}
                                        />
                                    </td>
                                    <td style={{ padding: '8px', borderRight: '1px solid #99b6d8', textAlign: 'right' }}>
                                        <input
                                            type="number"
                                            className="ae-input-subtle"
                                            style={{ background: 'transparent', border: 'none', padding: '4px', textAlign: 'right', width: '100%', outline: 'none', fontWeight: 700 }}
                                            value={item.amount || 0}
                                            onChange={(e) => handleItemChange(item.id, 'amount', e.target.value)}
                                            disabled={isReadOnly}
                                        />
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => handleRemoveItem(item.id)}
                                            className="text-red-500 hover:text-red-700"
                                            disabled={isReadOnly}
                                            style={{ opacity: isReadOnly ? 0.3 : 1, cursor: isReadOnly ? 'not-allowed' : 'pointer', background: 'transparent', border: 'none' }}
                                        >
                                            <X size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {/* Add Row Button Row */}
                            <tr style={{ background: '#f1f5f9' }}>
                                <td colSpan={8} style={{ padding: '8px' }}>
                                    <button
                                        onClick={handleAddItem}
                                        className="ae-btn-secondary"
                                        style={{ padding: '4px 12px', fontSize: '0.8rem', width: '100%', justifyContent: 'center', opacity: isReadOnly ? 0.3 : 1, cursor: isReadOnly ? 'not-allowed' : 'pointer' }}
                                        disabled={isReadOnly}
                                    >
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px', background: 'white', borderTop: '1px solid #99b6d8' }}>
                <div className="flex items-center gap-3">
                    {id && (
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
                        <>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="ae-btn-secondary flex items-center gap-2"
                                style={{ padding: '8px 24px' }}
                            >
                                <Save size={18} />
                                {saving ? 'Saving...' : 'Save Draft'}
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="ae-btn-primary flex items-center gap-2"
                                style={{ padding: '8px 24px' }}
                            >
                                <Save size={18} />
                                {saving ? 'Saving...' : 'Save Estimate'}
                            </button>
                        </>
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
            </div>
        </div>
    );
};

export default EstimateForm;
