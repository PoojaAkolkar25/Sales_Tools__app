import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Save,
    Plus,
    RefreshCw,
    CheckCircle2,
    X,
    History,
    Clock,
    XCircle,
    Mail,
    Eye,
    Trash2,
    Pencil,
    Sparkles,
    Paperclip,
    Download,
    PlusCircle,
    Calendar,
    File,
    Mails,
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import SearchableDropdown from './SearchableDropdown';
import AutoExpandingTextarea from './AutoExpandingTextarea';
import { formatToAppDate } from '../utils/dateUtils';

interface EstimateFormProps {
    id: number;
    onBack: () => void;
    onSave?: () => void;
    user: any;
    setIsReadOnly?: (isReadOnly: boolean) => void;
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
        { id: Date.now(), sr_no: 1, item_type: 'License', particulars: '', description: '', subscription_from: '', subscription_to: '', qty: 0, rate: 0, discount: 0, amount: 0 }
    ],
    column_labels: {
        sr_no: 'Sr.No.',
        item_type: 'Type',
        particulars: 'Particulars',
        description: 'Description',
        subscription_from: 'Sub. From',
        subscription_to: 'Sub. To',
        qty: 'Qty',
        rate: 'Rate',
        discount: 'Disc%',
        amount: 'Amount'
    }
});

const EMAIL_TEMPLATES = {
    standard: {
        name: 'Standard Proposal',
        subject: (companyName: string, customerName: string, estimateId: string) =>
            `${companyName} / ${customerName || 'Customer'} / ${estimateId}`,
        body: (clientName: string, projectName: string, companyName: string, expirationDate: string, yourName: string, estimateId: string) =>
            `Dear ${clientName},\n\nGreetings from ${companyName} !!\n\nIt was a pleasure discussing ${projectName} with you. Based on our conversation, I’ve attached a detailed proposal including estimates ${estimateId} for the services and license we discussed.\n\nYou can find the full breakdown of costs and timelines in the attached PDF.\n\nThis proposal is valid until ${expirationDate}. Please let me know if you have any questions or if you’d like to move forward.\n\nBest regards,\n${yourName}`
    },
    followup: {
        name: 'Follow-Up',
        subject: (companyName: string, customerName: string, estimateId: string) =>
            `Follow up: ${companyName} / ${customerName || 'Customer'} / ${estimateId}`,
        body: (clientName: string, _projectName: string, sentDate: string, yourName: string) =>
            `Dear ${clientName},\n\nI’m checking in to see if you had a chance to review the proposal I sent on ${sentDate}. I’ve re-attached it here for your convenience.\n\nAre there any specific details or technical aspects I can clarify for you? I’m happy to hop on a 5-minute call to walk you through it.\n\nLooking forward to your thoughts.\n\nBest,\n${yourName}`
    },
    revised: {
        name: 'Revised Quotation',
        subject: (companyName: string, customerName: string, estimateId: string) =>
            `Revised: ${companyName} / ${customerName || 'Customer'} / ${estimateId}`,
        body: (clientName: string, _projectName: string, _companyName: string, revisionDetails: string, yourName: string) =>
            `Dear ${clientName},\n\nThank you for your feedback on the initial proposal. As discussed, I have revised the scope to include ${revisionDetails} and adjusted the pricing accordingly.\n\nYou will find the updated proposal attached. Let me know if this aligns better with your current budget and requirements.\n\nKind regards,\n${yourName}`
    }
};

const EstimateForm: React.FC<EstimateFormProps> = ({ id, onBack, onSave, user, setIsReadOnly }) => {
    const { showNotification, showConfirm } = useNotification();
    const [estimate, setEstimate] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<any>(getInitialFormData());

    const [deals, setDeals] = useState<any[]>([]);
    const [costSheets, setCostSheets] = useState<any[]>([]);

    const [activeAction, setActiveAction] = useState<'draft' | 'submit' | 'cancel'>('submit');
    const [dateTypingValues, setDateTypingValues] = useState<{ [key: string]: string }>({});
    
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [editingColumn, setEditingColumn] = useState<string | null>(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectComment, setRejectComment] = useState('');

    // Email Modal State
    const [emailModal, setEmailModal] = useState<{
        open: boolean;
        to: string;
        cc: string;
        bcc: string;
        subject: string;
        body: string;
        templateType: keyof typeof EMAIL_TEMPLATES;
        has_proposal: boolean;
        proposal_filename: string;
    }>({
        open: false,
        to: '',
        cc: '',
        bcc: '',
        subject: '',
        body: '',
        templateType: 'standard',
        has_proposal: false,
        proposal_filename: ''
    });
    const [sendingEmail, setSendingEmail] = useState(false);


    const handlePreview = () => {
        if (!id) {
            showNotification('Please save the estimate first to preview PDF', 'info');
            return;
        }
        window.open(`${api.defaults.baseURL}/estimates/${id}/preview_pdf/`, '_blank');
    };

    const isReadOnly = estimate?.approval_status === 'APPROVED' || estimate?.status === 'PENDING_APPROVAL' || estimate?.status === 'SUBMITTED' || estimate?.status === 'REWOUND';

    useEffect(() => {
        if (setIsReadOnly) {
            setIsReadOnly(isReadOnly);
        }
    }, [isReadOnly, setIsReadOnly]);

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

    const getCurrencySymbol = (currency: string) => {
        switch (currency) {
            case 'INR': return '₹';
            case 'USD': return '$';
            case 'EUR': return '€';
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
                items: response.data.items?.length > 0 ? response.data.items.map((item: any) => {
                    const qty = parseFloat(item.qty) || 0;
                    const rate = parseFloat(item.rate) || 0;
                    const discountAmt = parseFloat(item.discount) || 0;
                    const initial = qty * rate;
                    const discountPercent = initial > 0 ? ((discountAmt / initial) * 100).toFixed(2) : '0';

                    return {
                        ...item,
                        item_type: item.item_type || 'License',
                        subscription_from: item.subscription_from || '',
                        subscription_to: item.subscription_to || '',
                        discount: discountPercent
                    };
                }) : [
                    { id: Date.now(), sr_no: 1, item_type: 'License', particulars: '', description: '', subscription_from: '', subscription_to: '', qty: 0, rate: 0, discount: 0, amount: 0 }
                ],
                column_labels: response.data.column_labels || {
                    sr_no: 'Sr.No.',
                    item_type: 'Type',
                    particulars: 'Particulars',
                    description: 'Description',
                    subscription_from: 'Sub. From',
                    subscription_to: 'Sub. To',
                    qty: 'Qty',
                    rate: 'Rate',
                    discount: 'Discount',
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
            items: [...formData.items, { id: Date.now(), sr_no: nextSrNo, item_type: 'License', particulars: '', description: '', subscription_from: '', subscription_to: '', qty: 0, rate: 0, discount: 0, amount: 0 }]
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
                if (field === 'qty' || field === 'rate' || field === 'discount') {
                    const qty = parseFloat(newItem.qty) || 0;
                    const rate = parseFloat(newItem.rate) || 0;
                    const discPercent = parseFloat(newItem.discount) || 0;
                    const initial = qty * rate;
                    const discountAmt = (initial * (discPercent / 100));
                    newItem.amount = initial - discountAmt;
                } else if (field === 'amount') {
                    // If amount is edited manually, reverse calculate the rate
                    const qty = parseFloat(newItem.qty) || 0;
                    if (qty > 0) {
                        newItem.rate = Number(((parseFloat(value) || 0 + parseFloat(newItem.discount || 0)) / qty).toFixed(2));
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

    const handleDateFocus = (id: number, field: string) => {
        const key = `${id}-${field}`;
        const item = formData.items.find((i: any) => i.id === id);
        if (item && !dateTypingValues[key] && item[field]) {
            const [y, m, d] = item[field].split('-');
            if (y && m && d) {
                setDateTypingValues(prev => ({ ...prev, [key]: `${d}-${m}-${y}` }));
            }
        }
    };

    const handleDateInputChange = (id: number, field: string, value: string) => {
        const key = `${id}-${field}`;
        const prevValue = dateTypingValues[key] || '';
        const isDeletion = value.length < prevValue.length;

        // If deleting a separator, remove the digit before it too
        let processedValue = value;
        if (isDeletion && prevValue.endsWith('-') && !value.endsWith('-')) {
            processedValue = value.slice(0, -1);
        }

        let formatted = '';

        // Slot-aware logic: if dashes exist, try to preserve segments
        if (processedValue.includes('-') || (prevValue.includes('-') && isDeletion)) {
            const parts = processedValue.split('-');
            const dayStr = (parts[0] || '').replace(/\D/g, '').substring(0, 2);
            const monthStr = (parts[1] || '').replace(/\D/g, '').substring(0, 2);
            const yearStr = (parts[2] || '').replace(/\D/g, '').substring(0, 4);

            // Validation for segments
            if (dayStr.length > 0) {
                if (parseInt(dayStr[0]) > 3) return;
                if (dayStr.length === 2 && (parseInt(dayStr) > 31 || dayStr === '00')) return;
            }
            if (monthStr.length > 0) {
                if (parseInt(monthStr[0]) > 1) return;
                if (monthStr.length === 2 && (parseInt(monthStr) > 12 || monthStr === '00')) return;
            }

            formatted = dayStr;
            if (dayStr.length === 2 || parts.length > 1) {
                formatted += '-';
                if (monthStr.length > 0 || parts.length > 1) {
                    formatted += monthStr;
                    if (monthStr.length === 2 || parts.length > 2) {
                        formatted += '-';
                        if (yearStr.length > 0) {
                            formatted += yearStr;
                        }
                    }
                }
            }

            // Cleanup trailing dashes if it was a deletion and we are at a boundary
            if (isDeletion && formatted.endsWith('-') && !processedValue.endsWith('-')) {
                formatted = formatted.slice(0, -1);
            }
        } else {
            // Greedy logic for raw input (no dashes)
            let digits = processedValue.replace(/\D/g, '');

            if (digits.length > 0) {
                if (parseInt(digits[0]) > 3) return;
                if (digits.length >= 2) {
                    const d = parseInt(digits.substring(0, 2));
                    if (d > 31 || d === 0) if (digits.length === 2) return;
                    if (digits.length >= 3) {
                        if (parseInt(digits[2]) > 1) return;
                        if (digits.length >= 4) {
                            const m = parseInt(digits.substring(2, 4));
                            if (m > 12 || m === 0) return;
                        }
                    }
                }
            }

            if (digits.length > 0) {
                formatted = digits.substring(0, 2);
                if (digits.length > 2 || (digits.length === 2 && !isDeletion)) {
                    formatted += '-';
                    if (digits.length > 2) {
                        formatted += digits.substring(2, 4);
                        if (digits.length > 4 || (digits.length === 4 && !isDeletion)) {
                            formatted += '-';
                            if (digits.length > 4) {
                                formatted += digits.substring(4, 8);
                            }
                        }
                    }
                }
            }
        }

        // Update local typing state
        setDateTypingValues(prev => ({ ...prev, [key]: formatted }));

        // Update item date
        if (formatted.length === 10) {
            const [d, m, y] = formatted.split('-').map(Number);
            const isoDate = `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
            handleItemChange(id, field, isoDate);
        } else if (value === '') {
            handleItemChange(id, field, '');
        }
    };

    const handleDateBlur = (id: number, field: string) => {
        const key = `${id}-${field}`;
        setDateTypingValues(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
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
        try {
            await api.delete(`/proposals/${proposalId}/`);
            showNotification('Proposal attachment removed successfully', 'success');
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

    const getFileUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        const apiBase = api.defaults.baseURL || '';
        const base = apiBase.replace('/api', '');
        return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    const handleDownload = async (prop: any) => {
        try {
            const fileUrl = prop.file_url || getFileUrl(prop.file);
            // Download initiated

            const response = await api.get(fileUrl, { responseType: 'blob' });
            const blob = new Blob([response.data], { type: response.headers['content-type'] });
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', prop.filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setTimeout(() => {
                showNotification(`${prop.filename} downloaded successfully`, 'success');
            }, 1000);
        } catch (error) {
            console.error('Error downloading file', error);
            showNotification(`Download failed for ${prop.filename}`, 'error');
        }
    };

    const handleView = (prop: any) => {
        const fileUrl = prop.file_url || getFileUrl(prop.file);
        if (!fileUrl) return;
        window.open(fileUrl, '_blank');
    };

    const handleSave = async (shouldSubmit = false) => {
        const total = calculateTotal();
        const costSheetPrice = parseFloat(estimate?.total_price || '0'); // Snapshot of CS price in estimate

        if (total < costSheetPrice) {
            showNotification(`Total Estimate ($${total.toLocaleString()}) cannot be less than Cost Sheet Price ($${costSheetPrice.toLocaleString()})`, 'error');
            return;
        }

        if (shouldSubmit && !estimate?.proposals?.length && !pendingFile) {
            showNotification('Please attach a proposal file before submitting for approval.', 'error');
            return;
        }

        const hasInvalidTypes = (formData.items || []).some((item: any) => !item.item_type);
        if (hasInvalidTypes) {
            showNotification('Please select a Type for all Product Line Items', 'warning');
            return;
        }

        const validFromDates = formData.items.map((i: any) => i.subscription_from).filter(Boolean).sort();
        const earliestFrom = validFromDates.length > 0 ? validFromDates[0] : '';

        const validToDates = formData.items.map((i: any) => i.subscription_to).filter(Boolean).sort().reverse();
        const latestTo = validToDates.length > 0 ? validToDates[0] : '';

        if (!earliestFrom || !latestTo) {
            showNotification('Subscription Period (From and To) is mandatory on at least one item.', 'error');
            return;
        }

        setSaving(true);
        // Prepare data for saving
        const payload = {
            ...formData,
            deal: formData.deal || null,
            cost_sheet: formData.cost_sheet || null,
            subscription_from: earliestFrom || null,
            subscription_to: latestTo || null,
            // Ensure numeric types and strip frontend pseudo-ids
            items: formData.items.map((item: any) => {
                const cleanedItem = {
                    ...item,
                    subscription_from: item.subscription_from || null,
                    subscription_to: item.subscription_to || null,
                    qty: parseFloat(item.qty) || 0,
                    rate: parseFloat(item.rate) || 0,
                    discount: (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0) * ((parseFloat(item.discount) || 0) / 100),
                    amount: parseFloat(item.amount) || 0
                };
                // Remove frontend timestamp IDs before sending to backend
                if (cleanedItem.id && String(cleanedItem.id).length > 10) {
                    delete cleanedItem.id;
                }
                return cleanedItem;
            }),
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
                showNotification(shouldSubmit ? 'Estimate saved and submitted' : 'Estimate draft saved successfully', 'success');
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
                } else if (typeof errorData === 'object') {
                    const errors = [];
                    for (const [key, value] of Object.entries(errorData)) {
                        if (Array.isArray(value)) errors.push(`${key}: ${value[0]}`);
                        else if (typeof value === 'string') errors.push(`${key}: ${value}`);
                    }
                    if (errors.length > 0) errorMsg = errors.join(' | ');
                    else errorMsg = JSON.stringify(errorData);
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
            showNotification('Estimate rewound (new version created)', 'success');
            onBack();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Failed to rewind estimate', 'error');
        } finally {
            setLoading(false);
        }
    };




    const handleApprove = async () => {
        // Validation: Only Sales Head or App Admin (Finance Manager roles in groups) can approve
        // Based on backend permission: user must be superuser or in 'Sales Head'/'Finance Manager' groups
        const isSalesHead = user?.role === 'sales_head' || user?.groups?.some((g: any) => g.name === 'Sales Head');
        const isFinanceManager = user?.role === 'finance_manager' || user?.groups?.some((g: any) => g.name === 'Finance Manager');
        const isAdmin = user?.role === 'app_admin' || user?.is_superuser;

        if (!isAdmin && !isSalesHead && !isFinanceManager) {
            showNotification('Only admin approve', 'error');
            return;
        }

        try {
            await api.post(`/estimates/${id}/approve/`, { notes: 'Approved' });
            showNotification('Estimate approved successfully', 'success');
            fetchEstimateDetails();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Failed to approve estimate', 'error');
        }
    };

    const handleReject = async () => {
        // Validation: Only Sales Head or App Admin (Finance Manager roles in groups) can reject
        const isSalesHead = user?.role === 'sales_head' || user?.groups?.some((g: any) => g.name === 'Sales Head');
        const isFinanceManager = user?.role === 'finance_manager' || user?.groups?.some((g: any) => g.name === 'Finance Manager');
        const isAdmin = user?.role === 'app_admin' || user?.is_superuser;

        if (!isAdmin && !isSalesHead && !isFinanceManager) {
            showNotification('Only admin approve', 'error'); // Using same message as requested
            return;
        }

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

    const handleTemplateChange = (type: keyof typeof EMAIL_TEMPLATES) => {
        if (!estimate) return;

        const clientName = estimate.customer_name || '[Client Name]';
        const projectName = estimate.project_name || '[Project Name]';
        const customerName = estimate.customer_name || '';
        const estimateId = estimate.estimate_id || '';
        const companyName = "Automation Edge";
        const yourName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || "Sales Team" : "Sales Team";
        const estDate = estimate.estimate_date ? new Date(estimate.estimate_date) : new Date();
        const expDate = new Date(estDate);
        expDate.setDate(expDate.getDate() + 30);
        const expirationDate = expDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const sentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const revisionDetails = estimate.description_memo || "[specific change]";

        let subject = "";
        let body = "";

        if (type === 'standard') {
            subject = EMAIL_TEMPLATES.standard.subject(companyName, customerName, estimateId);
            body = EMAIL_TEMPLATES.standard.body(clientName, projectName, companyName, expirationDate, yourName, estimateId);
        } else if (type === 'followup') {
            subject = EMAIL_TEMPLATES.followup.subject(companyName, customerName, estimateId);
            body = EMAIL_TEMPLATES.followup.body(clientName, projectName, sentDate, yourName);
        } else if (type === 'revised') {
            subject = EMAIL_TEMPLATES.revised.subject(companyName, customerName, estimateId);
            body = EMAIL_TEMPLATES.revised.body(clientName, projectName, companyName, revisionDetails, yourName);
        }

        setEmailModal({
            ...emailModal,
            subject: subject,
            body: body,
            templateType: type
        });
    };

    const handleSendEmail = async () => {
        if (!id) return;
        setSendingEmail(true);
        try {
            await api.post(`/estimates/${id}/send_email/`, {
                to: emailModal.to,
                cc: emailModal.cc,
                bcc: emailModal.bcc,
                subject: emailModal.subject,
                body: emailModal.body
            });
            showNotification('mail sent successfully', 'success');
            setEmailModal(prev => ({ ...prev, open: false }));

            // If estimate is approved but not yet submitted, trigger the submit status change
            if (estimate && estimate.status !== 'SUBMITTED' && estimate.approval_status === 'APPROVED') {
                try {
                    await api.post(`/estimates/${id}/submit/`);
                    fetchEstimateDetails(); // Refresh details
                } catch (subErr) {
                    console.error('Status update failed after email', subErr);
                }
            }
        } catch (error: any) {
            console.error('Error sending email', error);
            showNotification(error.response?.data?.error || 'Failed to send email', 'error');
        } finally {
            setSendingEmail(false);
        }
    };

    const handleViewEmailPDF = async () => {
        if (!id) return;
        try {
            const response = await api.get(`/estimates/${id}/download_pdf/`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            window.open(url, '_blank');
        } catch (error) {
            showNotification('Failed to view PDF', 'error');
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                    {/* Rejection Comments Banner */}
                    {estimate?.approval_status === 'REJECTED' && estimate?.approval_notes && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.04)',
                            border: '1px solid rgba(239, 68, 68, 0.1)',
                            borderLeft: '4px solid #EF4444',
                            borderRadius: '16px',
                            padding: '12px 20px',
                            marginBottom: '20px'
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

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>

                        {/* Unapprove/Reopen button removed - Approved estimates are now locked */}

                        {/* Rewind and Submit to Customer buttons moved to footer */}

                    </div>


                </div>
            </div>

            {/* Unified Form Card */}
            <div style={{ padding: '24px', background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '16px' }}>
                <div className="ae-grid-responsive-6" style={{ gap: '16px', alignItems: 'flex-start' }}>
                    {/* Cost Sheet Amount */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: 'black', marginBottom: '4px' }}>
                            Cost Sheet Amount <span style={{ color: '#FF6B00' }}>*</span>
                        </label>
                        {!id ? (
                            <SearchableDropdown
                                options={costSheets.map(cs => ({
                                    value: cs.id,
                                    label: `${cs.cost_sheet_no} - ${cs.project_name}`
                                }))}
                                value={formData.cost_sheet || ''}
                                onChange={async (val) => {
                                    const csId = val;
                                    setFormData({ ...formData, cost_sheet: csId });
                                    if (!csId) {
                                        setFormData({ ...formData, cost_sheet: '', deal: '', items: [{ id: Date.now(), sr_no: 1, item_type: 'License', particulars: '', description: '', qty: 0, rate: 0, amount: 0 }] });
                                        setEstimate(null);
                                        return;
                                    }

                                    try {
                                        const response = await api.get(`/cost-sheets/${csId}/`);
                                        const csData = response.data;

                                        // Map cost categories to estimate items (Detailed Breakdown)
                                        const newItems: any[] = [];
                                        let srNo = 1;

                                        // Helper to add items
                                        const addItems = (items: any[], prefix: string) => {
                                            (items || []).forEach(item => {
                                                const particulars = `${prefix} - ${item.name || item.category || item.description || 'Item'}`;
                                                const description = item.remark || item.type || '';
                                                const amount = parseFloat(item.estimated_price) || 0;
                                                const qty = parseFloat(item.qty) || parseFloat(item.num_days) || 1;
                                                const rate = qty > 0 ? amount / qty : amount;

                                                newItems.push({
                                                    id: Date.now() + srNo,
                                                    sr_no: srNo++,
                                                    item_type: prefix === 'License' ? 'License' : 'Service',
                                                    particulars,
                                                    description,
                                                    qty,
                                                    rate,
                                                    amount
                                                });
                                            });
                                        };

                                        addItems(csData.license_items, 'License');
                                        addItems(csData.implementation_items, 'Implementation');
                                        addItems(csData.support_items, 'Support');
                                        addItems(csData.infra_items, 'Infra');
                                        addItems(csData.other_items, 'Other');

                                        if (newItems.length === 0) {
                                            newItems.push({ id: Date.now(), sr_no: 1, item_type: 'License', particulars: '', description: '', qty: 0, rate: 0, amount: 0 });
                                        }

                                        setFormData({
                                            ...formData,
                                            cost_sheet: csId,
                                            deal: csData.deal || '',
                                            items: newItems
                                        });

                                        setEstimate({
                                            customer_name: csData.customer_name,
                                            company: csData.company,
                                            cost_sheet_no: csData.cost_sheet_no,
                                            cost_sheet_price: csData.total_estimated_price, // Total Est. Price from cost sheet
                                            deal_id: csData.deal_no,
                                            deal_amount: csData.deal_amount,
                                            total_price: csData.total_estimated_price // For validation
                                        });

                                    } catch (error) {
                                        console.error('Error fetching cost sheet details', error);
                                        showNotification('Failed to fetch cost sheet details', 'error');
                                    }
                                }}
                                placeholder="Select Cost Sheet"
                                className="w-full"
                            />
                        ) : (
                            <div className="ae-input" style={{ background: '#F7FAFC', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                                {estimate?.cost_sheet_no || 'XXXX'}
                            </div>
                        )}
                        {(estimate?.cost_sheet_price || (formData.cost_sheet && (costSheets.find(cs => cs.id.toString() === formData.cost_sheet.toString())?.total_estimated_price))) && (
                            <p style={{ fontSize: '0.65rem', color: '#2b6cb0', marginTop: '4px', fontWeight: 600 }}>
                                CS Amt: ₹{parseFloat(estimate?.cost_sheet_price || costSheets.find(cs => cs.id.toString() === formData.cost_sheet.toString())?.total_estimated_price || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                        )}
                    </div>

                    {/* Deal No. */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: 'black', marginBottom: '4px' }}>
                            Deal No.
                        </label>
                        {!id ? (
                            <SearchableDropdown
                                options={deals.map(deal => ({
                                    value: deal.id,
                                    label: `${deal.deal_id} - ${deal.deal_name}`
                                }))}
                                value={formData.deal || ''}
                                onChange={(val) => {
                                    setFormData({ ...formData, deal: val });
                                    const matchedDeal = deals.find(d => String(d.id) === String(val));
                                    if (matchedDeal) {
                                        setEstimate((prev: any) => ({
                                            ...prev,
                                            customer_name: matchedDeal.customer_name,
                                            company: matchedDeal.company,
                                            deal_id: matchedDeal.deal_id,
                                            deal_amount: matchedDeal.deal_amount
                                        }));
                                    }
                                }}
                                placeholder="Select Deal"
                                className="w-full"
                            />
                        ) : (
                            <div className="ae-input" style={{ background: '#F7FAFC', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                                {estimate?.deal_id || 'XXXX'}
                            </div>
                        )}
                        {(estimate?.deal_amount || (formData.deal && (deals.find(d => d.id.toString() === formData.deal.toString())?.deal_amount))) && (
                            <p style={{ fontSize: '0.65rem', color: '#38A169', marginTop: '4px', fontWeight: 600 }}>
                                Deal Amt: ₹{parseFloat(estimate?.deal_amount || deals.find(d => d.id.toString() === formData.deal.toString())?.deal_amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                        )}
                    </div>

                    {/* Customer Name */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: 'black', marginBottom: '4px' }}>Customer Name</label>
                        <div className="ae-input" style={{ background: '#F7FAFC', fontWeight: 600, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {estimate?.customer_name || 'Select Cost Sheet'}
                        </div>
                    </div>

                    {/* Company Name */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: 'black', marginBottom: '4px' }}>Company Name</label>
                        <div className="ae-input" style={{ background: '#F7FAFC', fontWeight: 600, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {estimate?.company || 'None'}
                        </div>
                    </div>

                    {/* Estimate No. */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: 'black', marginBottom: '4px' }}>Estimate No.</label>
                        <div className="ae-input" style={{ background: '#F7FAFC', fontWeight: 600, color: '#718096', display: 'flex', alignItems: 'center' }}>
                            {estimate?.estimate_id || 'Generating...'}
                        </div>
                    </div>
                    {/* Estimate Date */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: 'black', marginBottom: '4px' }}>Estimate Date</label>
                        <div className="ae-input" style={{ background: '#f8fafc', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                            {formatToAppDate(formData.estimate_date)}
                        </div>
                    </div>
                </div> {/* END ae-grid-5 */}

                {/* Proposal Attachment */}
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>
                        Proposal Attachment <span style={{ color: '#E53E3E' }}>*</span>
                    </label>
                    <div style={{
                        marginTop: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap'
                    }}>
                        <input
                            type="file"
                            id="proposal-upload"
                            style={{ display: 'none' }}
                            tabIndex={-1}
                            onChange={handleFileChange}
                            disabled={estimate?.status === 'SUBMITTED'}
                        />
                        <button
                            type="button"
                            onClick={() => document.getElementById('proposal-upload')?.click()}
                            disabled={estimate?.status === 'SUBMITTED'}
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
                                cursor: estimate?.status === 'SUBMITTED' ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease',
                                whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={(e) => {
                                if (estimate?.status !== 'SUBMITTED') {
                                    e.currentTarget.style.background = 'var(--theme-primary)';
                                    e.currentTarget.style.color = 'white';
                                    e.currentTarget.style.borderColor = 'var(--theme-primary)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (estimate?.status !== 'SUBMITTED') {
                                    e.currentTarget.style.background = 'white';
                                    e.currentTarget.style.color = '#1a1f36';
                                    e.currentTarget.style.borderColor = '#E0E6ED';
                                }
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
                            {/* Pending File Pill */}
                            {pendingFile && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '4px 10px',
                                    background: 'rgba(255, 107, 0, 0.05)',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255, 107, 0, 0.2)',
                                    color: 'var(--ae-orange)',
                                    minWidth: 'fit-content',
                                    height: '34px'
                                }}>
                                    <Clock size={14} style={{ color: '#FF6B00' }} />
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1a1f36', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {pendingFile.name} (Pending)
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setPendingFile(null)}
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
                                        title="Remove"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            )}

                            {/* Existing Proposals */}
                            {(estimate?.proposals || []).length > 0 ? (
                                [...estimate.proposals].reverse().map((prop: any) => (
                                    <div key={prop.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '4px 10px',
                                        background: 'rgba(255, 107, 0, 0.05)',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255, 107, 0, 0.2)',
                                        color: 'var(--ae-orange)',
                                        minWidth: 'fit-content',
                                        height: '34px'
                                    }}>
                                        <File size={14} style={{ color: '#FF6B00' }} />
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1a1f36', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {prop.filename}
                                        </span>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleView(prop)}
                                                style={{
                                                    width: '22px',
                                                    height: '22px',
                                                    borderRadius: '50%',
                                                    border: 'none',
                                                    background: '#e0f2fe',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    color: '#0369a1'
                                                }}
                                                title="View"
                                            >
                                                <Eye size={10} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDownload(prop)}
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
                                            {estimate?.status !== 'SUBMITTED' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveProposal(prop.id)}
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
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                !pendingFile && <span style={{ fontSize: '0.85rem', color: '#A0AEC0', fontStyle: 'italic' }}>No attachments</span>
                            )}
                        </div>
                    </div>
                    {/* Line Items Table */}
                    <div style={{ borderTop: '1px solid #E0E6ED', paddingTop: '24px', marginTop: '24px' }}>
                        <SectionHeader title="Product Line Items" />
                        <div className="ae-table-wrapper" style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px' }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-accent)' }}>
                                        <th style={{ padding: '10px 4px', width: '40px' }}></th>
                                        <th style={{ padding: '10px 4px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'black', width: '60px' }}>
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
                                        <th style={{
                                            padding: '10px 4px',
                                            textAlign: 'left',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            color: 'black',
                                            whiteSpace: 'nowrap',
                                            width: '130px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {editingColumn === 'item_type' ? (
                                                    <input
                                                        autoFocus
                                                        className="ae-input-subtle"
                                                        style={{ background: 'white', border: '1px solid #E2E8F0', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, width: '100%', outline: 'none', fontSize: '0.75rem' }}
                                                        value={formData.column_labels.item_type}
                                                        onChange={(e) => handleHeaderChange('item_type', e.target.value)}
                                                        onBlur={() => setEditingColumn(null)}
                                                        onKeyDown={(e) => e.key === 'Enter' && setEditingColumn(null)}
                                                    />
                                                ) : (
                                                    <>
                                                        <span>{formData.column_labels.item_type || 'Type'}</span>
                                                        <span style={{ color: 'var(--theme-primary)', marginLeft: '2px' }}>*</span>
                                                        {!isReadOnly && <Pencil size={10} style={{ cursor: 'pointer', color: '#718096' }} onClick={() => setEditingColumn('item_type')} />}
                                                    </>
                                                )}
                                            </div>
                                        </th>
                                        <th style={{
                                            padding: '10px 4px',
                                            textAlign: 'left',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            color: 'black',
                                            whiteSpace: 'nowrap'
                                        }}>
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
                                        <th style={{
                                            padding: '10px 4px',
                                            textAlign: 'left',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            color: 'black',
                                            whiteSpace: 'nowrap'
                                        }}>
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
                                        <th style={{
                                            padding: '10px 4px',
                                            textAlign: 'left',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            color: 'black',
                                            whiteSpace: 'nowrap',
                                            width: '140px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {editingColumn === 'subscription_from' ? (
                                                    <input
                                                        autoFocus
                                                        className="ae-input-subtle"
                                                        style={{ background: 'white', border: '1px solid #E2E8F0', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, width: '100%', outline: 'none', fontSize: '0.75rem' }}
                                                        value={formData.column_labels.subscription_from}
                                                        onChange={(e) => handleHeaderChange('subscription_from', e.target.value)}
                                                        onBlur={() => setEditingColumn(null)}
                                                        onKeyDown={(e) => e.key === 'Enter' && setEditingColumn(null)}
                                                    />
                                                ) : (
                                                    <>
                                                        <span>{formData.column_labels.subscription_from || 'Sub. From'}</span>
                                                        {!isReadOnly && <Pencil size={10} style={{ cursor: 'pointer', color: '#718096' }} onClick={() => setEditingColumn('subscription_from')} />}
                                                    </>
                                                )}
                                            </div>
                                        </th>
                                        <th style={{
                                            padding: '10px 4px',
                                            textAlign: 'left',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            color: 'black',
                                            whiteSpace: 'nowrap',
                                            width: '140px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {editingColumn === 'subscription_to' ? (
                                                    <input
                                                        autoFocus
                                                        className="ae-input-subtle"
                                                        style={{ background: 'white', border: '1px solid #E2E8F0', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, width: '100%', outline: 'none', fontSize: '0.75rem' }}
                                                        value={formData.column_labels.subscription_to}
                                                        onChange={(e) => handleHeaderChange('subscription_to', e.target.value)}
                                                        onBlur={() => setEditingColumn(null)}
                                                        onKeyDown={(e) => e.key === 'Enter' && setEditingColumn(null)}
                                                    />
                                                ) : (
                                                    <>
                                                        <span>{formData.column_labels.subscription_to || 'Sub. To'}</span>
                                                        {!isReadOnly && <Pencil size={10} style={{ cursor: 'pointer', color: '#718096' }} onClick={() => setEditingColumn('subscription_to')} />}
                                                    </>
                                                )}
                                            </div>
                                        </th>
                                        <th style={{
                                            padding: '10px 4px',
                                            textAlign: 'center',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            color: 'black',
                                            whiteSpace: 'nowrap',
                                            width: '80px'
                                        }}>
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
                                        <th style={{
                                            padding: '10px 4px',
                                            textAlign: 'right',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            color: 'black',
                                            whiteSpace: 'nowrap',
                                            width: '100px'
                                        }}>
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
                                        <th style={{
                                            padding: '10px 4px',
                                            textAlign: 'center',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            color: 'black',
                                            whiteSpace: 'nowrap',
                                            width: '85px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                {editingColumn === 'discount' ? (
                                                    <input
                                                        autoFocus
                                                        className="ae-input-subtle"
                                                        style={{ background: 'white', border: '1px solid #E2E8F0', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, width: '100%', outline: 'none', textAlign: 'center', fontSize: '0.75rem' }}
                                                        value={formData.column_labels.discount}
                                                        onChange={(e) => handleHeaderChange('discount', e.target.value)}
                                                        onBlur={() => setEditingColumn(null)}
                                                        onKeyDown={(e) => e.key === 'Enter' && setEditingColumn(null)}
                                                    />
                                                ) : (
                                                    <>
                                                        <span>{(!formData.column_labels.discount || formData.column_labels.discount === 'Discount') ? 'Disc%' : formData.column_labels.discount}</span>
                                                        {!isReadOnly && <Pencil size={10} style={{ cursor: 'pointer', color: '#718096' }} onClick={() => setEditingColumn('discount')} />}
                                                    </>
                                                )}
                                            </div>
                                        </th>
                                        <th style={{
                                            padding: '10px 4px',
                                            textAlign: 'right',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            color: 'black',
                                            whiteSpace: 'nowrap'
                                        }}>
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
                                        <th style={{ padding: '6px 8px', width: '40px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.items.map((item: any, index: number) => (
                                        <tr key={item.id} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                                            <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                                                {!isReadOnly && index === formData.items.length - 1 && (
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
                                                        <Plus size={14} />
                                                    </button>
                                                )}
                                            </td>
                                            <td style={{ padding: '6px 4px', textAlign: 'center', fontSize: '0.85rem', color: '#4A5568', fontWeight: 600 }}>
                                                {index + 1}
                                            </td>
                                            <td style={{ padding: '6px 4px' }}>
                                                <SearchableDropdown
                                                    options={[
                                                        { value: 'License', label: 'License' },
                                                        { value: 'Service', label: 'Service' }
                                                    ]}
                                                    value={item.item_type || 'License'}
                                                    onChange={(val) => handleItemChange(item.id, 'item_type', val)}
                                                    placeholder="Select Type"
                                                    disabled={isReadOnly}
                                                    className="w-full"
                                                    required={true}
                                                />
                                            </td>
                                            <td style={{ padding: '6px 4px' }}>
                                                <AutoExpandingTextarea
                                                    className="ae-input"
                                                    style={{ minHeight: '30px', padding: '4px 8px', width: '100%', fontSize: '0.85rem', borderRadius: '6px' }}
                                                    value={item.particulars || ''}
                                                    onChange={(e) => handleItemChange(item.id, 'particulars', e.target.value)}
                                                    disabled={isReadOnly}
                                                    placeholder="Enter particulars"
                                                    maxRows={5}
                                                />
                                            </td>
                                            <td style={{ padding: '6px 4px' }}>
                                                <AutoExpandingTextarea
                                                    className="ae-input"
                                                    style={{ minHeight: '30px', padding: '4px 8px', width: '100%', fontSize: '0.85rem', borderRadius: '6px' }}
                                                    value={item.description || ''}
                                                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                                    disabled={isReadOnly}
                                                    placeholder="Enter description"
                                                    maxRows={5}
                                                />
                                            </td>
                                            <td style={{ padding: '6px 4px' }}>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type="text"
                                                        className="ae-input"
                                                        style={{ height: '30px', padding: '4px 30px 4px 8px', width: '100%', fontSize: '0.85rem', cursor: isReadOnly ? 'default' : 'text', background: isReadOnly ? '#f7fafc' : 'white', borderRadius: '6px' }}
                                                        value={dateTypingValues[`${item.id}-subscription_from`] !== undefined ? dateTypingValues[`${item.id}-subscription_from`] : (item.subscription_from ? formatToAppDate(item.subscription_from) : '')}
                                                        onChange={(e) => handleDateInputChange(item.id, 'subscription_from', e.target.value)}
                                                        onFocus={() => handleDateFocus(item.id, 'subscription_from')}
                                                        onBlur={() => handleDateBlur(item.id, 'subscription_from')}
                                                        disabled={isReadOnly}
                                                        placeholder="DD-MM-YYYY"
                                                    />
                                                    <input
                                                        type="date"
                                                        id={`sub-from-${item.id}`}
                                                        style={{ position: 'absolute', opacity: 0, inset: 0, width: '100%', pointerEvents: 'none' }}
                                                        tabIndex={-1}
                                                        value={item.subscription_from || ''}
                                                        onChange={(e) => handleItemChange(item.id, 'subscription_from', e.target.value)}
                                                        disabled={isReadOnly}
                                                    />
                                                    <Calendar
                                                        size={14}
                                                        style={{
                                                            position: 'absolute',
                                                            right: '10px',
                                                            top: '50%',
                                                            transform: 'translateY(-50%)',
                                                            color: '#A0AEC0',
                                                            cursor: isReadOnly ? 'default' : 'pointer',
                                                            pointerEvents: isReadOnly ? 'none' : 'auto'
                                                        }}
                                                        onClick={() => {
                                                            if (!isReadOnly) {
                                                                const picker = document.getElementById(`sub-from-${item.id}`) as HTMLInputElement;
                                                                if (picker) picker.showPicker?.();
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </td>
                                            <td style={{ padding: '6px 4px' }}>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type="text"
                                                        className="ae-input"
                                                        style={{ height: '30px', padding: '4px 30px 4px 8px', width: '100%', fontSize: '0.85rem', cursor: isReadOnly ? 'default' : 'text', background: isReadOnly ? '#f7fafc' : 'white', borderRadius: '6px' }}
                                                        value={dateTypingValues[`${item.id}-subscription_to`] !== undefined ? dateTypingValues[`${item.id}-subscription_to`] : (item.subscription_to ? formatToAppDate(item.subscription_to) : '')}
                                                        onChange={(e) => handleDateInputChange(item.id, 'subscription_to', e.target.value)}
                                                        onFocus={() => handleDateFocus(item.id, 'subscription_to')}
                                                        onBlur={() => handleDateBlur(item.id, 'subscription_to')}
                                                        disabled={isReadOnly}
                                                        placeholder="DD-MM-YYYY"
                                                    />
                                                    <input
                                                        type="date"
                                                        id={`sub-to-${item.id}`}
                                                        style={{ position: 'absolute', opacity: 0, inset: 0, width: '100%', pointerEvents: 'none' }}
                                                        tabIndex={-1}
                                                        value={item.subscription_to || ''}
                                                        onChange={(e) => handleItemChange(item.id, 'subscription_to', e.target.value)}
                                                        disabled={isReadOnly}
                                                    />
                                                    <Calendar
                                                        size={14}
                                                        style={{
                                                            position: 'absolute',
                                                            right: '10px',
                                                            top: '50%',
                                                            transform: 'translateY(-50%)',
                                                            color: '#A0AEC0',
                                                            cursor: isReadOnly ? 'default' : 'pointer',
                                                            pointerEvents: isReadOnly ? 'none' : 'auto'
                                                        }}
                                                        onClick={() => {
                                                            if (!isReadOnly) {
                                                                const picker = document.getElementById(`sub-to-${item.id}`) as HTMLInputElement;
                                                                if (picker) picker.showPicker?.();
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </td>

                                            <td style={{ padding: '6px 4px' }}>
                                                <input
                                                    type="number"
                                                    className="ae-input"
                                                    style={{ height: '30px', padding: '4px 8px', textAlign: 'center', width: '100%', fontSize: '0.85rem', fontWeight: 600 }}
                                                    value={item.qty || ''}
                                                    placeholder="0"
                                                    onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                                                    disabled={isReadOnly}
                                                />
                                            </td>
                                            <td style={{ padding: '6px 4px' }}>
                                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                    <span style={{ position: 'absolute', left: '8px', fontSize: '0.85rem', color: '#718096', fontWeight: 600 }}>{getCurrencySymbol(formData.currency || 'INR')}</span>
                                                    <input
                                                        type="number"
                                                        className="ae-input"
                                                        style={{ height: '30px', padding: '4px 8px 4px 20px', textAlign: 'right', width: '100%', fontSize: '0.85rem', fontWeight: 600, borderRadius: '6px' }}
                                                        value={item.rate || ''}
                                                        placeholder="0"
                                                        onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                                                        disabled={isReadOnly}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Tab' && !e.shiftKey && index === formData.items.length - 1) {
                                                                const isEmpty = (item.item_type === 'License' || !item.item_type) && !item.particulars && !item.description && !item.rate && !item.discount;
                                                                if (isEmpty) return;

                                                                e.preventDefault();
                                                                handleAddItem();
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </td>
                                            <td style={{ padding: '6px 4px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', width: '75px', margin: '0 auto', border: '1px solid #E0E6ED', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
                                                    <input
                                                        type="number"
                                                        className="ae-no-spinner"
                                                        style={{ width: '100%', padding: '4px 2px 4px 8px', fontSize: '0.85rem', color: 'black', textAlign: 'center', fontWeight: 600, height: '30px', border: 'none', outline: 'none', background: 'transparent' }}
                                                        value={(item.discount === 0 || item.discount === 0.0 || item.discount === '0' || item.discount === '0.00') ? '' : item.discount}
                                                        placeholder="0"
                                                        onChange={(e) => handleItemChange(item.id, 'discount', e.target.value)}
                                                        disabled={isReadOnly}
                                                        min="0"
                                                        max="100"
                                                        step="0.01"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Tab' && !e.shiftKey && index === formData.items.length - 1) {
                                                                const isEmpty = (item.item_type === 'License' || !item.item_type) && !item.particulars && !item.description && !item.rate && (!item.discount || item.discount === '0');
                                                                if (isEmpty) return;

                                                                e.preventDefault();
                                                                handleAddItem();
                                                            }
                                                        }}
                                                    />
                                                    <span style={{ paddingRight: '4px', fontSize: '0.85rem', color: 'black', fontWeight: 700 }}>%</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '6px 4px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 800, color: '#1a1f36' }}>
                                                {getCurrencySymbol(formData.currency || 'INR')}{item.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                                            </td>
                                            <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                                                {!isReadOnly && formData.items.length > 1 && (
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
                                    <tr style={{ background: '#F8FAFC', fontWeight: 700 }}>
                                        <td colSpan={10} style={{ padding: '8px 12px', textAlign: 'right', fontSize: '0.9rem', color: 'black', fontWeight: 700 }}>Total Estimate Amount:</td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: '0.95rem', fontWeight: 800, color: 'var(--theme-primary)' }}>
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
                                <AutoExpandingTextarea
                                    className="ae-input"
                                    style={{
                                        minHeight: '48px',
                                        padding: '8px 12px',
                                        background: isReadOnly ? 'transparent' : 'white',
                                    }}
                                    placeholder="Description / Memo"
                                    value={formData.description_memo || ''}
                                    onChange={(e) => setFormData({ ...formData, description_memo: e.target.value })}
                                    disabled={isReadOnly}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '8px' }}>Terms & Conditions</label>
                                <AutoExpandingTextarea
                                    className="ae-input"
                                    style={{
                                        minHeight: '48px',
                                        padding: '8px 12px',
                                        background: isReadOnly ? 'transparent' : 'white',
                                    }}
                                    placeholder="Terms & Conditions"
                                    value={formData.terms_conditions || ''}
                                    onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                                    disabled={isReadOnly}
                                />
                            </div>
                        </div>
                    </div>
                </div> {/* END Line Items Section */}
            </div> {/* END Unified Form Card */}

            {/* Footer Actions (Outside Scroll Area) */}
            <div style={{
                background: 'rgba(255, 107, 0, 0.05)',
                padding: '6px',
                borderRadius: '12px',
                border: '1px solid var(--border-primary)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                width: 'fit-content',
                flexShrink: 0,
                zIndex: 10,
                marginTop: '10px',
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {id && (
                        <button
                            onClick={handlePreview}
                            style={{
                                height: '38px',
                                padding: '0 18px',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                border: 'none',
                                background: 'rgba(255, 107, 0, 0.1)',
                                color: 'var(--theme-primary)',
                                transition: 'all 0.2s',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 107, 0, 0.05)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 107, 0, 0.1)';
                            }}
                        >
                            <Eye size={18} />
                            <span>Preview</span>
                        </button>
                    )}
                    {!isReadOnly && (
                        <>
                            <button
                                onClick={() => handleSave(false)}
                                disabled={saving}
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
                                    background: activeAction === 'draft' ? 'var(--theme-primary)' : 'transparent',
                                    color: activeAction === 'draft' ? 'white' : 'var(--text-secondary)',
                                    boxShadow: activeAction === 'draft' ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                                }}
                                onMouseEnter={() => setActiveAction('draft')}
                                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
                                onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                                onMouseLeave={() => { setActiveAction('submit'); }}
                            >
                                <Save size={16} /> Save Draft
                            </button>

                            <button
                                onClick={handleSaveAndSubmit}
                                disabled={saving}
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
                                    background: activeAction === 'submit' ? 'var(--theme-primary)' : 'transparent',
                                    color: activeAction === 'submit' ? 'white' : 'var(--text-secondary)',
                                    boxShadow: activeAction === 'submit' ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                                }}
                                onMouseEnter={() => setActiveAction('submit')}
                                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
                                onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                                onMouseLeave={() => { setActiveAction('submit'); }}
                            >
                                <PlusCircle size={18} /> Submit for Approval
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
                                    padding: '6px 16px',
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
                            >
                                <X size={18} /> Cancel
                            </button>
                        </>
                    )}
                </div>
                {
                    estimate?.status === 'PENDING_APPROVAL' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button
                                onClick={handleApprove}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '0 20px',
                                    height: '38px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#00C853',
                                    color: 'white',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#00ad48'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#00C853'; e.currentTarget.style.transform = 'scale(1)'; }}
                                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
                                onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                                <CheckCircle2 size={15} /> Approve
                            </button>
                            <button
                                onClick={() => setShowRejectModal(true)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '0 20px',
                                    height: '38px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(229, 62, 62, 0.4)',
                                    background: 'rgba(229, 62, 62, 0.06)',
                                    color: '#E53E3E',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(229, 62, 62, 0.1)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(229, 62, 62, 0.06)'; e.currentTarget.style.transform = 'scale(1)'; }}
                                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
                                onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                                <XCircle size={15} /> Reject
                            </button>
                        </div>
                    )
                }
                {
                    estimate?.approval_status === 'APPROVED' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{
                                padding: '6px 16px',
                                borderRadius: '8px',
                                background: '#E6F7ED',
                                color: '#38A169',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                border: '1px solid #38A169',
                                height: '38px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e: React.MouseEvent<HTMLSpanElement>) => { e.currentTarget.style.background = '#def7e5'; e.currentTarget.style.borderColor = '#2f855a'; }}
                            onMouseLeave={(e: React.MouseEvent<HTMLSpanElement>) => { e.currentTarget.style.background = '#E6F7ED'; e.currentTarget.style.borderColor = '#38A169'; }}
                            >
                                <CheckCircle2 size={18} /> Approved
                            </span>
                            {estimate?.is_latest && estimate?.version === 1 && (
                                <button
                                    onClick={handleRewind}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        height: '38px',
                                        padding: '0 20px',
                                        borderRadius: '8px',
                                        background: '#EBF8FF',
                                        color: '#3182CE',
                                        border: '1px solid #BEE3F8',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = '#DBEEFE'; }}
                                    onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = '#EBF8FF'; e.currentTarget.style.transform = 'scale(1)'; }}
                                    onMouseDown={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
                                    onMouseUp={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.transform = 'scale(1)'; }}
                                >
                                    <History size={18} /> Rewind (New Version)
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    const companyName = "Automation Edge";
                                    const subject = EMAIL_TEMPLATES.standard.subject(companyName, estimate.customer_name || '', estimate.estimate_id);
                                    const yourName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || "Sales Team" : "Sales Team";

                                    const estDate = estimate.estimate_date ? new Date(estimate.estimate_date) : new Date();
                                    const expDate = new Date(estDate);
                                    expDate.setDate(expDate.getDate() + 30);
                                    const expirationDate = expDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

                                    const body = EMAIL_TEMPLATES.standard.body(estimate.customer_name, estimate.project_name, companyName, expirationDate, yourName, estimate.estimate_id);
                                    const proposals = estimate.proposals || [];
                                    const latestProposal = proposals.length > 0 ? [...proposals].sort((a, b) => b.version - a.version)[0] : null;

                                    setEmailModal({
                                        ...emailModal,
                                        open: true,
                                        to: estimate.customer_email || '',
                                        subject,
                                        body,
                                        templateType: 'standard',
                                        has_proposal: !!latestProposal,
                                        proposal_filename: latestProposal?.filename || ''
                                    });
                                }}
                                style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        height: '38px',
                                        padding: '0 20px',
                                        borderRadius: '8px',
                                        background: 'var(--theme-primary)',
                                        color: 'white',
                                        border: 'none',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = 'var(--theme-primary)'; e.currentTarget.style.opacity = '0.9'; }}
                                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
                                onMouseDown={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
                                onMouseUp={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.transform = 'scale(1)'; }}
                                title={estimate.status === 'SUBMITTED' ? "Resend Email" : "Send to User"}
                            >
                                {estimate.status === 'SUBMITTED' ? <Mails size={18} /> : <Mail size={18} />}
                                {estimate.status === 'SUBMITTED' ? "Resend Email" : "Send to User"}
                            </button>
                        </div>
                    )
                }
                {
                    estimate?.status === 'REWOUND' && (
                        <span style={{
                            padding: '6px 16px',
                            borderRadius: '8px',
                            background: '#F1F5F9',
                            color: '#64748B',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            border: '1px solid #CBD5E1',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#e8eff5'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#F1F5F9'; }}
                        >
                            <History size={18} /> Rewound
                        </span>
                    )
                }
            </div>



            {/* Rejection Modal */}
            {
                showRejectModal && (
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
                                    <AutoExpandingTextarea
                                        className="ae-input"
                                        value={rejectComment}
                                        onChange={e => setRejectComment(e.target.value)}
                                        placeholder="Type your reason here..."
                                        autoFocus
                                        style={{
                                            minHeight: '90px',
                                            padding: '12px 16px',
                                            background: '#f8fafc',
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
                                            background: 'var(--theme-primary)',
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
                )
            }

            {/* Email Modal rendered via Portal */}
            {emailModal.open && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '5vh', zIndex: 9999 }}>
                    <div style={{ background: 'white', padding: '24px 32px 32px 32px', borderRadius: '16px', width: '850px', maxWidth: '95%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1A202C', margin: 0 }}>Compose Proposal Email</h3>
                                <p style={{ color: '#718096', fontSize: '0.85rem', marginTop: '4px' }}>Combined Estimate and Proposal will be attached automatically.</p>
                            </div>
                            <button onClick={() => setEmailModal({ ...emailModal, open: false })} style={{ padding: '8px', borderRadius: '50%', background: '#F7FAFC', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
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

                        <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', alignItems: 'center', gap: '12px' }}>
                                <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#4A5568' }}>To:</label>
                                <input className="ae-input" value={emailModal.to} onChange={(e) => setEmailModal({ ...emailModal, to: e.target.value })} placeholder="recipient@example.com" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', alignItems: 'center', gap: '12px' }}>
                                <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#4A5568' }}>CC:</label>
                                <input className="ae-input" value={emailModal.cc} onChange={(e) => setEmailModal({ ...emailModal, cc: e.target.value })} placeholder="cc@example.com" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', alignItems: 'center', gap: '12px' }}>
                                <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#4A5568' }}>Subject:</label>
                                <input className="ae-input" value={emailModal.subject} onChange={(e) => setEmailModal({ ...emailModal, subject: e.target.value })} placeholder="Enter subject" />
                            </div>
                            <div style={{ marginTop: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem', color: '#4A5568' }}>Message Body</label>
                                <AutoExpandingTextarea
                                    className="ae-input"
                                    value={emailModal.body}
                                    onChange={(e) => setEmailModal({ ...emailModal, body: e.target.value })}
                                    style={{ minHeight: '180px', padding: '12px' }}
                                    placeholder="Write your message here..."
                                />
                            </div>

                            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', color: '#4A5568' }}>Attached Files:</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <Paperclip size={18} color="#64748b" />
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                                        <span
                                            onClick={handleViewEmailPDF}
                                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--theme-primary)', fontWeight: 600, textDecoration: 'underline' }}
                                        >
                                            <Eye size={14} /> Combined Estimate & Proposal PDF
                                        </span>
                                        {emailModal.has_proposal && (
                                            <span
                                                onClick={() => {
                                                    const proposals = estimate?.proposals || [];
                                                    const latestProposal = proposals.length > 0 ? [...proposals].sort((a, b) => b.version - a.version)[0] : null;
                                                    if (latestProposal?.file) {
                                                        const fileUrl = latestProposal.file_url || (latestProposal.file.startsWith('http') ? latestProposal.file : `${api.defaults.baseURL?.replace('/api', '')}${latestProposal.file.startsWith('/') ? '' : '/'}${latestProposal.file}`);
                                                        window.open(fileUrl, '_blank');
                                                    }
                                                }}
                                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--theme-primary)', fontWeight: 600, textDecoration: 'underline' }}
                                            >
                                                <Eye size={14} /> {emailModal.proposal_filename}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
                            <button className="ae-btn-secondary" onClick={() => setEmailModal({ ...emailModal, open: false })} disabled={sendingEmail} style={{ padding: '10px 24px' }}>Cancel</button>
                            <button 
                                className="ae-btn-primary" 
                                onClick={handleSendEmail} 
                                disabled={sendingEmail} 
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px', 
                                    padding: '10px 32px',
                                    background: 'var(--theme-primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                {sendingEmail ? <RefreshCw className="animate-spin" size={18} /> : <Mail size={18} />}
                                {sendingEmail ? 'Sending...' : 'Send Now'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default EstimateForm;
