import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Save, CheckCircle, XCircle, Clock, File, Paperclip, X, Download, PlusCircle, Sparkles, Plus, ArrowLeft, Eye } from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import SearchableDropdown from './SearchableDropdown';

interface Lead {
    id: number;
    lead_no: string;
    customer_name: string;
    project_name: string;
    project_manager?: string;
    sales_person?: string;
}

interface Deal {
    id: number;
    deal_id: string;
    deal_name: string;
    customer_name: string;
    lead?: number;
    project_manager?: string;
    salesperson_name?: string;
    currency?: string;
}

interface Attachment {
    id: number;
    file: string;
    filename: string;
    uploaded_at: string;
}

interface CostSheetFormProps {
    id: number | null;
    onBack: () => void;
    onSave?: () => void;
}

const TableHeader = ({ columns, isReadOnly }: { columns: string[], isReadOnly: boolean }) => {
    return (
        <thead>
            <tr style={{ background: 'var(--bg-secondary)' }}>
                {!isReadOnly && <th style={{ padding: '10px 8px', width: '40px' }}></th>}
                {columns.map((col, i) => {
                    return (
                        <th key={i} style={{
                            padding: '10px 8px',
                            textAlign: 'left',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: 'var(--text-secondary)',
                            whiteSpace: 'nowrap'
                        }}>{col}</th>
                    );
                })}
                {!isReadOnly && <th style={{ padding: '10px 8px', width: '40px' }}></th>}
            </tr>
        </thead>
    );
};

const InputCell = ({ value, onChange, type = "text", className = "", isReadOnly, onKeyDown, symbol = "", suffix = "", placeholder }: any) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (type === 'number') {
            // Allow empty string
            if (val === '') {
                onChange('');
                return;
            }
            // Prevent negatives
            if (val.startsWith('-')) return;
            // Allow numbers and decimals
            if (!isNaN(Number(val)) || val.endsWith('.')) {
                onChange(val);
            }
        } else {
            onChange(val);
        }
    };

    // Display empty string if value is 0 or "0" to show placeholder
    const displayValue = (type === 'number' && (value === 0 || value === '0' || value === '')) ? '' : value;

    return (
        <td style={{ padding: '2px 4px' }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '4px',
                padding: '0 8px',
                transition: 'border-color 0.2s',
            }}
                className={`${className} input-container`}
            >
                {symbol && <span style={{ marginRight: '4px', fontSize: '0.75rem', color: '#718096', fontWeight: 600 }}>{symbol}</span>}
                <input
                    style={{
                        flex: 1,
                        width: '100%',
                        padding: '4px 0',
                        border: 'none',
                        outline: 'none',
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        background: 'transparent',
                        textAlign: 'left'
                    }}
                    className="placeholder-gray-400"
                    type={type}
                    value={displayValue}
                    placeholder={placeholder || (type === 'number' ? "0" : "")}
                    readOnly={isReadOnly}
                    onChange={handleChange}
                    onKeyDown={onKeyDown}
                />
                {suffix && <span style={{ marginLeft: '4px', fontSize: '0.75rem', color: '#718096', fontWeight: 600 }}>{suffix}</span>}
            </div>
        </td>
    );
};

const ReadOnlyCell = ({ value, bold = false, symbol = '', color, fontSize, fontWeight }: any) => (
    <td style={{
        padding: '4px 8px',
        fontSize: fontSize || (bold ? '0.9rem' : '0.9rem'),
        fontWeight: fontWeight || (bold ? 700 : 600),
        color: color || (bold ? 'var(--text-primary)' : 'var(--text-secondary)'),
        background: 'transparent',
        textAlign: 'right'
    }}>
        {symbol && <span style={{ marginRight: '2px', opacity: 0.8 }}>{symbol}</span>}
        {typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value}
    </td>
);

const CostSheetForm: React.FC<CostSheetFormProps> = ({ id, onBack }) => {
    const { showNotification, showConfirm } = useNotification();
    const [localId, setLocalId] = useState<number | null>(id || null);
    const [lead, setLead] = useState<Lead | null>(null);

    const [selectedCustomerName, setSelectedCustomerName] = useState('');
    const [leads, setLeads] = useState<Lead[]>([]);
    const [projectManager, setProjectManager] = useState('');
    const [salesPerson, setSalesPerson] = useState('');
    const [costSheetNo, setCostSheetNo] = useState('');
    const [dealId, setDealId] = useState<number | null>(null);
    const [deals, setDeals] = useState<Deal[]>([]);
    const [currency, setCurrency] = useState('INR');
    const [projectName, setProjectName] = useState('');
    const [costSheetDate, setCostSheetDate] = useState(new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState('PENDING');
    const [approvalComments, setApprovalComments] = useState('');
    const [revertComments, setRevertComments] = useState('');
    const [rejectComment, setRejectComment] = useState('');
    const [revertComment, setRevertComment] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);


    const getCurrencySymbol = (cur: string) => {
        switch (cur) {
            case 'USD': return '$';
            case 'EURO': return '€';
            default: return '₹';
        }
    };

    const currencySymbol = getCurrencySymbol(currency);
    const [showRevertModal, setShowRevertModal] = useState(false);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [uploading, setUploading] = useState(false);
    const [customAlert, setCustomAlert] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

    // Category States
    const [licenseItems, setLicenseItems] = useState<any[]>([{ name: '', type: '', rate: 0, qty: 0, period: '', margin_percentage: 0 }]);
    const [implementationItems, setImplementationItems] = useState<any[]>([{ category: '', num_resources: 0, num_days: 0, rate_per_day: 0, margin_percentage: 0 }]);
    const [supportItems, setSupportItems] = useState<any[]>([{ category: '', num_resources: 0, num_days: 0, rate_per_day: 0, margin_percentage: 0 }]);
    const [infraItems, setInfraItems] = useState<any[]>([{ name: '', qty: 0, months: 0, rate_per_month: 0, margin_percentage: 0 }]);
    const [otherItems, setOtherItems] = useState<any[]>([{ description: '', estimated_cost: 0, margin_percentage: 0 }]);
    const [uploadFeedback, setUploadFeedback] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' });
    const [activeTab, setActiveTab] = useState<'form' | 'summary'>('form');

    // Remark States
    const [overallRemarks, setOverallRemarks] = useState('');



    const isReadOnly = status !== 'PENDING' && status !== 'REVERTED';


    useEffect(() => {
        setLocalId(id || null);
        if (id) {
            const fetchDetails = async () => {
                try {
                    const response = await api.get(`/cost-sheets/${id}/`);
                    const data = response.data;
                    setCostSheetNo(data.cost_sheet_no);
                    setDealId(data.deal || null);
                    setCurrency(data.currency || 'INR');
                    setCostSheetDate(data.cost_sheet_date);
                    setStatus(data.status);
                    setProjectManager(data.project_manager || '');
                    setSalesPerson(data.sales_person || '');
                    setApprovalComments(data.approval_comments || '');
                    setRevertComments(data.revert_comments || '');
                    setLicenseItems(data.license_items.length > 0 ? data.license_items : [{ name: '', type: '', rate: 0, qty: 0, period: '', margin_percentage: 0 }]);
                    setImplementationItems(data.implementation_items.length > 0 ? data.implementation_items : [{ category: '', num_resources: 0, num_days: 0, rate_per_day: 0, margin_percentage: 0 }]);
                    setSupportItems(data.support_items.length > 0 ? data.support_items : [{ category: '', num_resources: 0, num_days: 0, rate_per_day: 0, margin_percentage: 0 }]);
                    setInfraItems(data.infra_items.length > 0 ? data.infra_items : [{ name: '', qty: 0, months: 0, rate_per_month: 0, margin_percentage: 0 }]);
                    setOtherItems(data.other_items && data.other_items.length > 0 ? data.other_items : [{ description: '', estimated_cost: 0, margin_percentage: 0 }]);
                    setAttachments(data.attachments || []);

                    // Set Remark states
                    setOverallRemarks(data.overall_remarks || '');

                    if (data.lead_details) {
                        setLead(data.lead_details);
                    }
                    setSelectedCustomerName(data.customer_name || '');
                    setProjectName(data.project_name || '');
                } catch (error) {
                    console.error('Error fetching cost sheet details', error);
                }
            };
            fetchDetails();
        } else {
            // Reset form for fresh creation
            setCostSheetNo('');
            setDealId(null);
            setStatus('PENDING');
            setProjectManager('');
            setSalesPerson('');
            setProjectName('');
            setLicenseItems([{ name: '', type: '', rate: 0, qty: 0, period: '', margin_percentage: 0 }]);
            setImplementationItems([{ category: '', num_resources: 0, num_days: 0, rate_per_day: 0, margin_percentage: 0 }]);
            setSupportItems([{ category: '', num_resources: 0, num_days: 0, rate_per_day: 0, margin_percentage: 0 }]);
            setInfraItems([{ name: '', qty: 0, months: 0, rate_per_month: 0, margin_percentage: 0 }]);
            setOtherItems([{ description: '', estimated_cost: 0, margin_percentage: 0 }]);
            setOverallRemarks('');
            // ... (could reset others too but these are the main ones)
        }
    }, [id]);

    useEffect(() => {
        const fetchAllLeads = async () => {
            try {
                const [leadsRes, dealsRes] = await Promise.all([
                    api.get('/leads/'),
                    api.get('/deals/')
                ]);
                setLeads(leadsRes.data);
                setDeals(dealsRes.data);
            } catch (error) {
                console.error('Error fetching data', error);
            }
        };
        fetchAllLeads();
    }, []);

    const handleCustomerChange = (customerName: string) => {
        setSelectedCustomerName(customerName);
        if (!customerName) {
            setLead(null);
            setDealId(null);
            setProjectManager('');
            setSalesPerson('');
            return;
        }

        // Find if there's only one lead for this customer
        const customerLeads = leads.filter(l => l.customer_name === customerName);
        if (customerLeads.length === 1) {
            setLead(customerLeads[0]);
            setProjectManager(customerLeads[0].project_manager || '');
            setSalesPerson(customerLeads[0].sales_person || '');
            setProjectName(customerLeads[0].project_name || '');
        } else {
            // Multiple leads, let user pick Lead No.
            setLead(null);
            setDealId(null);
            setProjectName('');
        }
    };

    const handleLeadChange = (id: string) => {
        const selected = leads.find(l => l.id.toString() === id);
        if (selected) {
            setLead(selected);
            setSelectedCustomerName(selected.customer_name);
            setProjectManager(selected.project_manager || '');
            setSalesPerson(selected.sales_person || '');
            setProjectName(selected.project_name || '');
        } else {
            setLead(null);
            // setLeadNo('');
            // Do NOT reset PM/SP here if they were manually entered or set by customer
        }
    };

    const handleDealChange = (idStr: string) => {
        const id = idStr ? parseInt(idStr) : null;
        setDealId(id);

        // Optional: Auto-select lead if deal has one and it matches
        if (id) {
            const selectedDeal = deals.find(d => d.id === id);
            if (selectedDeal && selectedDeal.lead && !lead) {
                // Try to find the lead
                const leadFromDeal = leads.find(l => l.id === selectedDeal.lead);
                if (leadFromDeal && leadFromDeal.customer_name === selectedCustomerName) {
                    setLead(leadFromDeal);
                    // setLeadNo(leadFromDeal.lead_no);
                }
            }

            // Auto-fill Project Manager and Sales Person from Deal if available
            if (selectedDeal) {
                setCurrency(selectedDeal.currency || 'INR');
                if (selectedDeal.project_manager) setProjectManager(selectedDeal.project_manager);
                if (selectedDeal.salesperson_name) setSalesPerson(selectedDeal.salesperson_name);
            }
        }
    };

    // Get unique customer names from Deals
    const uniqueCustomers = Array.from(new Set(deals.map(d => d.customer_name).filter(Boolean))).sort();

    // Fixed fetching specific lead by number (if manual search still needed)

    const addItem = (category: string) => {
        if (isReadOnly) return;
        switch (category) {
            case 'license':
                setLicenseItems([...licenseItems, { name: '', type: '', rate: 0, qty: 0, period: '', margin_percentage: 0, remark: '' }]);
                break;
            case 'implementation':
                setImplementationItems([...implementationItems, { category: '', num_resources: 0, num_days: 0, rate_per_day: 0, margin_percentage: 0, remark: '' }]);
                break;
            case 'support':
                setSupportItems([...supportItems, { category: '', num_resources: 0, num_days: 0, rate_per_day: 0, margin_percentage: 0, remark: '' }]);
                break;
            case 'infra':
                setInfraItems([...infraItems, { name: '', qty: 0, months: 0, rate_per_month: 0, margin_percentage: 0, remark: '' }]);
                break;
            case 'other':
                setOtherItems([...otherItems, { description: '', estimated_cost: 0, margin_percentage: 0, remark: '' }]);
                break;
        }
    };

    const calculateTotals = () => {
        let totalCost = 0;
        let totalMarginAmount = 0;

        const processItems = (items: any[], type: string) => {
            items.forEach(item => {
                let cost = 0;
                const safeMargin = parseFloat(item.margin_percentage) || 0;

                if (type === 'license') {
                    const p = parseFloat(item.period);
                    const periodMultiplier = isNaN(p) ? 1 : p;
                    cost = (parseFloat(item.rate) || 0) * (parseFloat(item.qty) || 0) * periodMultiplier;
                } else if (type === 'implementation' || type === 'support') {
                    cost = (parseFloat(item.num_resources) || 0) * (parseFloat(item.num_days) || 0) * (parseFloat(item.rate_per_day) || 0);
                } else if (type === 'infra') {
                    cost = (parseFloat(item.qty) || 0) * (parseFloat(item.months) || 0) * (parseFloat(item.rate_per_month) || 0);
                } else if (type === 'other') {
                    cost = parseFloat(item.estimated_cost) || 0;
                }

                const marginAmount = cost * (safeMargin / 100);
                totalCost += cost;
                totalMarginAmount += marginAmount;
            });
        };

        processItems(licenseItems, 'license');
        processItems(implementationItems, 'implementation');
        processItems(supportItems, 'support');
        processItems(infraItems, 'infra');
        processItems(otherItems, 'other');

        const totalPrice = totalCost + totalMarginAmount;
        const totalMarginPercent = totalCost > 0 ? (totalMarginAmount / totalCost) * 100 : 0;

        return { totalCost, totalMarginAmount, totalMarginPercent, totalPrice };
    };

    // Calculate category-specific totals
    const calculateCategoryTotals = (items: any[], type: 'license' | 'implementation' | 'support' | 'infra' | 'other') => {
        let catCost = 0;
        let catMarginAmount = 0;

        items.forEach(item => {
            let cost = 0;
            const safeMargin = parseFloat(item.margin_percentage) || 0;

            if (type === 'license') {
                const p = parseFloat(item.period);
                const periodMultiplier = isNaN(p) ? 1 : p;
                cost = (parseFloat(item.rate) || 0) * (parseFloat(item.qty) || 0) * periodMultiplier;
            } else if (type === 'implementation' || type === 'support') {
                cost = (parseFloat(item.num_resources) || 0) * (parseFloat(item.num_days) || 0) * (parseFloat(item.rate_per_day) || 0);
            } else if (type === 'infra') {
                cost = (parseFloat(item.qty) || 0) * (parseFloat(item.months) || 0) * (parseFloat(item.rate_per_month) || 0);
            } else if (type === 'other') {
                cost = parseFloat(item.estimated_cost) || 0;
            }

            const marginAmount = cost * (safeMargin / 100);
            catCost += cost;
            catMarginAmount += marginAmount;
        });

        const catPrice = catCost + catMarginAmount;
        const catMarginPercent = catCost > 0 ? (catMarginAmount / catCost) * 100 : 0;
        return { catCost, catMarginAmount, catMarginPercent, catPrice };
    };

    const totals = calculateTotals();

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const resetInput = () => {
            const input = document.getElementById('file-upload-input') as HTMLInputElement;
            if (input) input.value = '';
        };

        setUploadFeedback({ type: '', message: '' });
        let activeId = localId;

        // Validation: If no ID yet, we must have a lead or a deal to auto-generate one
        if (!activeId && !lead && !dealId) {
            setUploadFeedback({ type: 'error', message: 'Please select a Lead or Deal first.' });
            resetInput();
            return;
        }

        setUploading(true);

        try {
            // If no ID yet, auto-save as draft first
            if (!activeId) {
                try {
                    const draftResponse = await handleSave('PENDING', true);
                    if (draftResponse && draftResponse.id) {
                        activeId = draftResponse.id;
                    } else {
                        throw new Error('Failed to auto-save draft');
                    }
                } catch (error) {
                    console.error('Error auto-saving draft for attachment', error);
                    setUploadFeedback({ type: 'error', message: 'Failed to create cost sheet. Please try saving manually first.' });
                    setUploading(false);
                    resetInput();
                    return;
                }
            }

            const formData = new FormData();
            formData.append('file', file);

            const response = await api.post(`/cost-sheets/${activeId}/upload_attachment/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setAttachments([...attachments, response.data]);
            setUploadFeedback({ type: 'success', message: 'File uploaded successfully' });
            setTimeout(() => setUploadFeedback({ type: '', message: '' }), 4000);
        } catch (error) {
            console.error('Error uploading file', error);
            setUploadFeedback({ type: 'error', message: 'Failed to upload file' });
        } finally {
            setUploading(false);
            resetInput();
        }
    };

    const getFileUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        const apiBase = api.defaults.baseURL || '';
        const base = apiBase.replace('/api', '');
        return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    const handleDownload = async (att: Attachment) => {
        try {
            const fileUrl = getFileUrl(att.file);
            setUploadFeedback({ type: 'success', message: `Downloading ${att.filename}...` });

            // Using api.get with responseType 'blob' to leverage axios config and CORS
            const response = await api.get(fileUrl, { responseType: 'blob' });

            // Create blob from response data
            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', att.filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setTimeout(() => {
                setUploadFeedback({ type: 'success', message: `${att.filename} downloaded!` });
                setTimeout(() => setUploadFeedback({ type: '', message: '' }), 3000);
            }, 1000);
        } catch (error) {
            console.error('Error downloading file', error);
            setUploadFeedback({ type: 'error', message: 'Download failed' });
        }
    };

    const handleView = (att: Attachment) => {
        const fileUrl = getFileUrl(att.file);
        window.open(fileUrl, '_blank');
    };

    const handleDeleteAttachment = async (attachmentId: number) => {
        try {
            await api.delete(`/cost-sheets/${localId}/delete_attachment/?attachment_id=${attachmentId}`);
            setAttachments(attachments.filter(a => a.id !== attachmentId));
            showNotification('Attachment deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting attachment', error);
            showNotification('Failed to delete attachment', 'error');
        }
    };

    const handleSave = async (newStatus: string = 'PENDING', isAutoDraft: boolean = false) => {
        // lead is no longer mandatory for save
        // costSheetNo is now auto-generated, so no check here

        const cleanItems = (items: any[], type: 'license' | 'implementation' | 'support' | 'infra' | 'other') =>
            items
                .filter(item => {
                    if (type === 'license' || type === 'infra') return item.name?.trim() !== '';
                    if (type === 'implementation' || type === 'support') return item.category?.trim() !== '';
                    if (type === 'other') return item.description?.trim() !== '';
                    return true;
                })
                .map(({ id, cost_sheet, estimated_margin_amount, estimated_price, total_days, ...rest }) => ({
                    ...rest,
                    // Ensure numeric fields are indeed numbers
                    ...(rest.rate !== undefined && { rate: parseFloat(rest.rate) || 0 }),
                    ...(rest.qty !== undefined && { qty: parseFloat(rest.qty) || 0 }),
                    ...(rest.num_resources !== undefined && { num_resources: parseFloat(rest.num_resources) || 0 }),
                    ...(rest.num_days !== undefined && { num_days: parseFloat(rest.num_days) || 0 }),
                    ...(rest.rate_per_day !== undefined && { rate_per_day: parseFloat(rest.rate_per_day) || 0 }),
                    ...(rest.rate_per_month !== undefined && { rate_per_month: parseFloat(rest.rate_per_month) || 0 }),
                    ...(rest.months !== undefined && { months: parseFloat(rest.months) || 0 }),
                    ...(rest.estimated_cost !== undefined && { estimated_cost: parseFloat(rest.estimated_cost) || 0 }),
                    ...(rest.margin_percentage !== undefined && { margin_percentage: parseFloat(rest.margin_percentage) || 0 }),
                }));

        const payload: any = {
            cost_sheet_date: costSheetDate,
            lead: lead?.id || null,
            deal: dealId,
            status: newStatus,
            project_manager: projectManager,
            sales_person: salesPerson,
            project_name: projectName,
            customer_name: selectedCustomerName,
            license_items: cleanItems(licenseItems, 'license'),
            implementation_items: cleanItems(implementationItems, 'implementation'),
            support_items: cleanItems(supportItems, 'support'),
            infra_items: cleanItems(infraItems, 'infra'),
            other_items: cleanItems(otherItems, 'other'),
            overall_remarks: overallRemarks,
        };

        if (costSheetNo && id) {
            payload.cost_sheet_no = costSheetNo;
        }

        try {
            let response;
            if (localId) {
                response = await api.put(`/cost-sheets/${localId}/`, payload);
            } else {
                response = await api.post('/cost-sheets/', payload);
                if (response.data.id) {
                    setLocalId(response.data.id);
                    setCostSheetNo(response.data.cost_sheet_no);
                }
            }

            if (!isAutoDraft) {
                setCustomAlert({ message: newStatus === 'PENDING' ? 'Cost Sheet saved as Draft.' : 'Cost Sheet submitted for approval!', type: 'success' });
                // Always redirect to dashboard on save
                if (onBack) {
                    onBack();
                }
            }
            return response.data;
        } catch (error: any) {
            console.error('Error saving cost sheet', error.response?.data);
            let errorMsg = 'Failed to save cost sheet. Please check your inputs.';

            if (error.response?.data) {
                if (typeof error.response.data === 'object') {
                    errorMsg = Object.entries(error.response.data)
                        .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : JSON.stringify(errors)}`)
                        .join('\n');
                } else {
                    errorMsg = JSON.stringify(error.response.data, null, 2);
                }
            }

            setCustomAlert({ message: `Validation Error:\n\n${errorMsg}`, type: 'error' });
            return null;
        }
    };

    const handleApprove = async () => {
        try {
            await api.post(`/cost-sheets/${localId}/approve/`);
            setCustomAlert({ message: 'Cost Sheet Approved!', type: 'success' });
            if (onBack) onBack();
        } catch (error: any) {
            let errorMsg = error.response?.data?.error || 'Failed to approve';

            if (error.response?.data?.validation_errors && Array.isArray(error.response.data.validation_errors)) {
                const detailedErrors = error.response.data.validation_errors.join('\n• ');
                errorMsg = `${errorMsg}\n\n• ${detailedErrors}`;
            }

            setCustomAlert({ message: errorMsg, type: 'error' });
        }
    };

    const handleReject = async () => {
        if (!rejectComment) return setCustomAlert({ message: 'Please provide rejection comments', type: 'error' });
        try {
            await api.post(`/cost-sheets/${localId}/reject/`, { comments: rejectComment });
            setShowRejectModal(false);
            showNotification('sheet sent for reject', 'success');
            // Give user time to see toast before redirecting
            setTimeout(() => {
                if (onBack) onBack();
            }, 1500);
        } catch (error: any) {
            setCustomAlert({ message: error.response?.data?.error || 'Failed to reject', type: 'error' });
        }
    };

    const handleRevert = async () => {
        if (!revertComment) return setCustomAlert({ message: 'Please provide revert comments', type: 'error' });
        try {
            await api.post(`/cost-sheets/${localId}/revert/`, { comments: revertComment });
            setShowRevertModal(false);
            showNotification('sheet sent for revert', 'success');
            // Give user time to see toast before redirecting
            setTimeout(() => {
                if (onBack) onBack();
            }, 1500);
        } catch (error: any) {
            setCustomAlert({ message: error.response?.data?.error || 'Failed to revert', type: 'error' });
        }
    };




    const updateItem = (idx: number, key: string, value: any, items: any[], setter: (val: any[]) => void) => {
        if (isReadOnly) return;
        const newItems = [...items];
        newItems[idx] = { ...newItems[idx], [key]: value };
        setter(newItems);
    };

    const formatDateDisplay = (dateStr: string) => {
        if (!dateStr) return '—';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            const day = date.getDate().toString().padStart(2, '0');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = months[date.getMonth()];
            const year = date.getFullYear();
            return `${day} ${month} ${year}`;
        } catch (e) {
            return dateStr;
        }
    };




    const SectionHeader = ({ title, extra }: { title: string, extra?: React.ReactNode }) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '4px', height: '18px', background: 'var(--ae-blue)', borderRadius: '2px' }}></span>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--theme-primary)' }}>{title}</h3>
            </div>
            {extra}
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '4px',
                background: 'var(--bg-primary)',
                padding: '6px',
                borderRadius: '12px',
                border: '1px solid var(--border-primary)',
                width: 'fit-content',
                margin: '0 auto',
                boxShadow: 'var(--shadow-sm)'
            }}>
                <button
                    onClick={() => setActiveTab('form')}
                    style={{
                        padding: '10px 24px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: activeTab === 'form' ? 'var(--theme-primary)' : 'transparent',
                        color: activeTab === 'form' ? 'white' : 'var(--text-secondary)',
                        boxShadow: activeTab === 'form' ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                    }}
                >
                    Cost Sheet
                </button>
                <button
                    onClick={() => setActiveTab('summary')}
                    style={{
                        padding: '10px 24px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: activeTab === 'summary' ? 'var(--theme-primary)' : 'transparent',
                        color: activeTab === 'summary' ? 'white' : 'var(--text-secondary)',
                        boxShadow: activeTab === 'summary' ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                    }}
                >
                    Cost Sheet Summary
                </button>
            </div>

            {activeTab === 'form' ? (
                <div style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '12px',
                    width: '100%',
                    boxShadow: 'var(--shadow-md)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {status === 'REJECTED' && approvalComments && (
                        <div className="section-panel remark-panel rejection-pulse" style={{
                            background: 'rgba(239, 68, 68, 0.04)',
                            border: '1px solid rgba(239, 68, 68, 0.1)',
                            borderLeft: '4px solid #EF4444',
                            borderRadius: '16px',
                            padding: '12px 20px',
                            marginBottom: '12px'
                        }}>
                            <div className="remark-heading" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444', marginBottom: '8px' }}>
                                <XCircle size={16} strokeWidth={2.5} className="icon-breathe" />
                                <span style={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rejection Comments</span>
                            </div>
                            <div style={{
                                background: 'var(--bg-secondary)',
                                padding: '10px 16px',
                                borderRadius: '12px',
                                border: '1px solid var(--border-primary)',
                                color: 'var(--text-primary)',
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                lineHeight: 1.4,
                                fontStyle: 'italic',
                                position: 'relative'
                            }}>
                                <span style={{ color: '#EF4444', fontSize: '1.2rem', fontWeight: 900, position: 'absolute', top: '4px', left: '6px', opacity: 0.2 }}>"</span>
                                {approvalComments}
                                <span style={{ color: '#EF4444', fontSize: '1.2rem', fontWeight: 900, position: 'absolute', bottom: '-4px', right: '6px', opacity: 0.2 }}>"</span>
                            </div>
                        </div>
                    )}

                    {status === 'REVERTED' && revertComments && (
                        <div className="section-panel remark-panel remark-pulse" style={{
                            background: 'rgba(255, 107, 0, 0.04)',
                            border: '1px solid rgba(255, 107, 0, 0.1)',
                            borderLeft: '4px solid #FF6B00',
                            borderRadius: '16px',
                            padding: '12px 20px',
                            marginBottom: '12px'
                        }}>
                            <div className="remark-heading" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FF6B00', marginBottom: '8px' }}>
                                <Sparkles size={16} strokeWidth={2.5} className="icon-breathe" />
                                <span style={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reversion Remarks</span>
                            </div>
                            <div style={{
                                background: 'var(--bg-secondary)',
                                padding: '10px 16px',
                                borderRadius: '12px',
                                border: '1px solid var(--border-primary)',
                                color: 'var(--text-primary)',
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                lineHeight: 1.4,
                                fontStyle: 'italic',
                                position: 'relative'
                            }}>
                                <span style={{ color: '#FF6B00', fontSize: '1.2rem', fontWeight: 900, position: 'absolute', top: '4px', left: '6px', opacity: 0.2 }}>"</span>
                                {revertComments}
                                <span style={{ color: '#FF6B00', fontSize: '1.2rem', fontWeight: 900, position: 'absolute', bottom: '-4px', right: '6px', opacity: 0.2 }}>"</span>
                            </div>
                        </div>
                    )}

                    {status === 'APPROVED' && (
                        <div className="section-panel approved-banner approved-pulse" style={{ marginBottom: '12px' }}>
                            <CheckCircle size={20} className="text-green icon-breathe" strokeWidth={2.5} />
                            <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 700 }}>
                                This cost sheet has been approved and is locked for editing.
                            </p>
                        </div>
                    )}

                    <div className="metadata-section">
                        <SectionHeader title="Cost Sheet Information" />
                        {/* Row 1: Customer Name, Lead No, Project Name */}
                        <div className="ae-grid-4">
                            {/* Row 1 */}
                            {/* Customer Name */}
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Customer Name</label>
                                {!localId ? (
                                    <SearchableDropdown
                                        options={uniqueCustomers.map(name => ({ value: name, label: name }))}
                                        value={selectedCustomerName}
                                        onChange={(val) => handleCustomerChange(val as string)}
                                        placeholder="Select Customer"
                                        className="w-full"
                                    />
                                ) : (
                                    <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#2D3748', padding: '6px 0' }}>{selectedCustomerName || '—'}</div>
                                )}
                            </div>

                            {/* Lead No. */}
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Lead No.</label>
                                <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', padding: '6px 0' }}>
                                    {lead?.lead_no ? `${lead.lead_no} (${lead.project_name || 'No Project Name'})` : '—'}
                                </div>
                            </div>

                            {/* Deal No. */}
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Deal No.</label>
                                {!isReadOnly ? (
                                    <SearchableDropdown
                                        options={(selectedCustomerName ? deals.filter(d => d.customer_name === selectedCustomerName) : deals).map(d => ({
                                            value: d.id,
                                            label: `${d.deal_id} (${d.deal_name})`
                                        }))}
                                        value={dealId || ''}
                                        onChange={(val) => handleDealChange(val as string)}
                                        placeholder="Select Deal No."
                                        className="w-full"
                                    />
                                ) : (
                                    <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', padding: '6px 0' }}>
                                        {dealId ? (() => {
                                            const d = deals.find(x => x.id === dealId);
                                            return d ? `${d.deal_id} (${d.deal_name})` : '—';
                                        })() : '—'}
                                    </div>
                                )}
                            </div>

                            {/* Cost Sheet No */}
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Cost Sheet No.</label>
                                {!isReadOnly ? (
                                    <input
                                        type="text"
                                        className="ae-input"
                                        value={costSheetNo || 'Auto-generated'}
                                        disabled
                                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'default' }}
                                    />
                                ) : (
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FF6B00', padding: '6px 0' }}>
                                        {costSheetNo || 'Auto-generated'}
                                    </div>
                                )}
                            </div>

                            {/* Row 2 */}
                            {/* Project Name */}
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Project Name</label>
                                {!isReadOnly ? (
                                    <input
                                        className="ae-input"
                                        value={projectName}
                                        onChange={e => setProjectName(e.target.value)}
                                        placeholder="Project Name"
                                    />
                                ) : (
                                    <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#2D3748', padding: '6px 0' }}>{projectName || '—'}</div>
                                )}
                            </div>

                            {/* Project Manager */}
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Project Manager</label>
                                {!isReadOnly ? (
                                    <input
                                        className="ae-input"
                                        value={projectManager}
                                        onChange={e => setProjectManager(e.target.value)}
                                        placeholder="Project Manager"
                                    />
                                ) : (
                                    <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#2D3748', padding: '6px 0' }}>{projectManager || '—'}</div>
                                )}
                            </div>

                            {/* Sales Person */}
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Sales Person</label>
                                {!isReadOnly ? (
                                    <input
                                        className="ae-input"
                                        value={salesPerson}
                                        onChange={e => setSalesPerson(e.target.value)}
                                        placeholder="Sales Person"
                                    />
                                ) : (
                                    <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#2D3748', padding: '6px 0' }}>{salesPerson || '—'}</div>
                                )}
                            </div>

                            {/* Cost Sheet Date */}
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Cost Sheet Date</label>
                                <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#2D3748', padding: '6px 0' }}>{formatDateDisplay(costSheetDate)}</div>
                            </div>
                        </div>
                    </div>

                    <section style={{ borderTop: '1px solid var(--border-primary)', paddingTop: '32px', marginTop: '32px' }}>
                        <SectionHeader title="License" />
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', minWidth: '1100px' }}>
                                <TableHeader isReadOnly={isReadOnly} columns={['License Name', 'License Type', 'Rate/Month', 'Qty', 'Month', 'Est. Cost', 'Margin %', 'Est. Margin', 'Est. Price', 'Remark']} />
                                <tbody>
                                    {licenseItems.map((item, idx) => {
                                        const periodMultiplier = isNaN(parseFloat(item.period)) ? 1 : parseFloat(item.period);
                                        const cost = (parseFloat(item.rate) || 0) * (parseFloat(item.qty) || 0) * periodMultiplier;
                                        const marginAmount = cost * ((parseFloat(item.margin_percentage) || 0) / 100);
                                        const price = cost + marginAmount;
                                        return (
                                            <tr key={idx} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}>
                                                {!isReadOnly && (
                                                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                                        {idx === licenseItems.length - 1 && (
                                                            <button
                                                                onClick={() => addItem('license')}
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
                                                )}
                                                <InputCell isReadOnly={isReadOnly} value={item.name} onChange={(v: string) => updateItem(idx, 'name', v, licenseItems, setLicenseItems)} placeholder="License Name" />
                                                <InputCell isReadOnly={isReadOnly} value={item.type} onChange={(v: string) => updateItem(idx, 'type', v, licenseItems, setLicenseItems)} />
                                                <InputCell isReadOnly={isReadOnly} value={item.rate} onChange={(v: number) => updateItem(idx, 'rate', v, licenseItems, setLicenseItems)} type="number" className="no-spinner" symbol={currencySymbol} />
                                                <InputCell isReadOnly={isReadOnly} value={item.qty} onChange={(v: number) => updateItem(idx, 'qty', v, licenseItems, setLicenseItems)} type="number" className="no-spinner" />
                                                <InputCell isReadOnly={isReadOnly} value={item.period} onChange={(v: string) => updateItem(idx, 'period', v, licenseItems, setLicenseItems)} />
                                                <ReadOnlyCell value={cost} symbol={currencySymbol} />
                                                <InputCell isReadOnly={isReadOnly} value={item.margin_percentage} onChange={(v: number) => updateItem(idx, 'margin_percentage', v, licenseItems, setLicenseItems)} type="number" suffix="%" />
                                                <ReadOnlyCell value={marginAmount} symbol={currencySymbol} />
                                                <ReadOnlyCell value={price} bold symbol={currencySymbol} />
                                                <InputCell
                                                    isReadOnly={isReadOnly}
                                                    value={item.remark}
                                                    onChange={(v: string) => updateItem(idx, 'remark', v, licenseItems, setLicenseItems)}
                                                    placeholder="Remark"
                                                    onKeyDown={(e: any) => {
                                                        if (e.key === 'Tab' && !e.shiftKey && idx === licenseItems.length - 1) {
                                                            addItem('license');
                                                        }
                                                    }}
                                                />
                                                {!isReadOnly && (
                                                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                                        {licenseItems.length > 1 && (
                                                            <button
                                                                onClick={() => setLicenseItems(licenseItems.filter((_, i) => i !== idx))}
                                                                style={{
                                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                                    border: 'none',
                                                                    padding: '6px',
                                                                    borderRadius: '6px',
                                                                    cursor: 'pointer',
                                                                    color: '#EF4444'
                                                                }}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                    {/* Total row for License */}
                                    <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                                        {!isReadOnly && <td></td>}
                                        <td colSpan={5} style={{ padding: '8px 12px', textAlign: 'right', fontSize: '0.9rem', color: '#4A5568', fontWeight: 700 }}>Total License:</td>
                                        <ReadOnlyCell value={calculateCategoryTotals(licenseItems, 'license').catCost} symbol={currencySymbol} bold color="#FF6B00" fontSize="0.95rem" fontWeight={800} />
                                        <td></td>
                                        <ReadOnlyCell value={calculateCategoryTotals(licenseItems, 'license').catMarginAmount} symbol={currencySymbol} bold color="#FF6B00" fontSize="0.95rem" fontWeight={800} />
                                        <ReadOnlyCell value={calculateCategoryTotals(licenseItems, 'license').catPrice} symbol={currencySymbol} bold color="#FF6B00" fontSize="0.95rem" fontWeight={800} />
                                        <td></td>
                                        {!isReadOnly && <td></td>}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="implementation-section" style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px', marginTop: '32px' }}>
                        <SectionHeader title="Services - Implementation" />
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', minWidth: '1100px' }}>
                                <TableHeader isReadOnly={isReadOnly} columns={['Resource Category', 'No. of Resources', 'No. of Days', 'Total Days', 'Rate/Day', 'Est. Cost', 'Margin %', 'Est. Margin', 'Est. Price', 'Remark']} />
                                <tbody>
                                    {implementationItems.map((item, idx) => {
                                        const totalDays = (parseFloat(item.num_resources) || 0) * (parseFloat(item.num_days) || 0);
                                        const cost = totalDays * (parseFloat(item.rate_per_day) || 0);
                                        const marginAmount = cost * ((parseFloat(item.margin_percentage) || 0) / 100);
                                        const price = cost + marginAmount;
                                        return (
                                            <tr key={idx} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}>
                                                {!isReadOnly && (
                                                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                                        {idx === implementationItems.length - 1 && (
                                                            <button
                                                                onClick={() => addItem('implementation')}
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
                                                )}
                                                <InputCell isReadOnly={isReadOnly} value={item.category} onChange={(v: string) => updateItem(idx, 'category', v, implementationItems, setImplementationItems)} placeholder="Resource Category" />
                                                <InputCell isReadOnly={isReadOnly} value={item.num_resources} onChange={(v: number) => updateItem(idx, 'num_resources', v, implementationItems, setImplementationItems)} type="number" className="no-spinner" />
                                                <InputCell isReadOnly={isReadOnly} value={item.num_days} onChange={(v: number) => updateItem(idx, 'num_days', v, implementationItems, setImplementationItems)} type="number" className="no-spinner" />
                                                <ReadOnlyCell value={totalDays} />
                                                <InputCell isReadOnly={isReadOnly} value={item.rate_per_day} onChange={(v: number) => updateItem(idx, 'rate_per_day', v, implementationItems, setImplementationItems)} type="number" className="no-spinner" symbol={currencySymbol} />
                                                <ReadOnlyCell value={cost} symbol={currencySymbol} />
                                                <InputCell isReadOnly={isReadOnly} value={item.margin_percentage} onChange={(v: number) => updateItem(idx, 'margin_percentage', v, implementationItems, setImplementationItems)} type="number" suffix="%" />
                                                <ReadOnlyCell value={marginAmount} symbol={currencySymbol} />
                                                <ReadOnlyCell value={price} bold symbol={currencySymbol} />
                                                <InputCell
                                                    isReadOnly={isReadOnly}
                                                    value={item.remark}
                                                    onChange={(v: string) => updateItem(idx, 'remark', v, implementationItems, setImplementationItems)}
                                                    placeholder="Remark"
                                                    onKeyDown={(e: any) => {
                                                        if (e.key === 'Tab' && !e.shiftKey && idx === implementationItems.length - 1) {
                                                            addItem('implementation');
                                                        }
                                                    }}
                                                />
                                                {!isReadOnly && (
                                                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                                        {implementationItems.length > 1 && (
                                                            <button
                                                                onClick={() => setImplementationItems(implementationItems.filter((_, i) => i !== idx))}
                                                                style={{
                                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                                    border: 'none',
                                                                    padding: '6px',
                                                                    borderRadius: '6px',
                                                                    cursor: 'pointer',
                                                                    color: '#EF4444'
                                                                }}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                    {/* Total row for Implementation */}
                                    <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                                        {!isReadOnly && <td></td>}
                                        <td colSpan={5} style={{ padding: '8px 12px', textAlign: 'right', fontSize: '0.9rem', color: '#4A5568', fontWeight: 700 }}>Total Implementation:</td>
                                        <ReadOnlyCell value={calculateCategoryTotals(implementationItems, 'implementation').catCost} symbol={currencySymbol} bold color="#FF6B00" fontSize="0.95rem" fontWeight={800} />
                                        <td></td>
                                        <ReadOnlyCell value={calculateCategoryTotals(implementationItems, 'implementation').catMarginAmount} symbol={currencySymbol} bold color="#FF6B00" fontSize="0.95rem" fontWeight={800} />
                                        <ReadOnlyCell value={calculateCategoryTotals(implementationItems, 'implementation').catPrice} symbol={currencySymbol} bold color="#FF6B00" fontSize="0.95rem" fontWeight={800} />
                                        <td></td>
                                        {!isReadOnly && <td></td>}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="support-section" style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px', marginTop: '32px' }}>
                        <SectionHeader title="Services - Support" />
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', minWidth: '1100px' }}>
                                <TableHeader isReadOnly={isReadOnly} columns={['Resource Category', 'No. of Resources', 'No. of Days', 'Total Days', 'Rate/Day', 'Est. Cost', 'Margin %', 'Est. Margin', 'Est. Price', 'Remark']} />
                                <tbody>
                                    {supportItems.map((item, idx) => {
                                        const totalDays = (parseFloat(item.num_resources) || 0) * (parseFloat(item.num_days) || 0);
                                        const cost = totalDays * (parseFloat(item.rate_per_day) || 0);
                                        const marginAmount = cost * ((parseFloat(item.margin_percentage) || 0) / 100);
                                        const price = cost + marginAmount;
                                        return (
                                            <tr key={idx} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}>
                                                {!isReadOnly && (
                                                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                                        {idx === supportItems.length - 1 && (
                                                            <button
                                                                onClick={() => addItem('support')}
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
                                                )}
                                                <InputCell isReadOnly={isReadOnly} value={item.category} onChange={(v: string) => updateItem(idx, 'category', v, supportItems, setSupportItems)} placeholder="Resource Category" />
                                                <InputCell isReadOnly={isReadOnly} value={item.num_resources} onChange={(v: number) => updateItem(idx, 'num_resources', v, supportItems, setSupportItems)} type="number" className="no-spinner" />
                                                <InputCell isReadOnly={isReadOnly} value={item.num_days} onChange={(v: number) => updateItem(idx, 'num_days', v, supportItems, setSupportItems)} type="number" className="no-spinner" />
                                                <ReadOnlyCell value={totalDays} />
                                                <InputCell isReadOnly={isReadOnly} value={item.rate_per_day} onChange={(v: number) => updateItem(idx, 'rate_per_day', v, supportItems, setSupportItems)} type="number" className="no-spinner" symbol={currencySymbol} />
                                                <ReadOnlyCell value={cost} symbol={currencySymbol} />
                                                <InputCell isReadOnly={isReadOnly} value={item.margin_percentage} onChange={(v: number) => updateItem(idx, 'margin_percentage', v, supportItems, setSupportItems)} type="number" suffix="%" />
                                                <ReadOnlyCell value={marginAmount} symbol={currencySymbol} />
                                                <ReadOnlyCell value={price} bold symbol={currencySymbol} />
                                                <InputCell
                                                    isReadOnly={isReadOnly}
                                                    value={item.remark}
                                                    onChange={(v: string) => updateItem(idx, 'remark', v, supportItems, setSupportItems)}
                                                    placeholder="Remark"
                                                    onKeyDown={(e: any) => {
                                                        if (e.key === 'Tab' && !e.shiftKey && idx === supportItems.length - 1) {
                                                            addItem('support');
                                                        }
                                                    }}
                                                />
                                                {!isReadOnly && (
                                                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                                        {supportItems.length > 1 && (
                                                            <button
                                                                onClick={() => setSupportItems(supportItems.filter((_, i) => i !== idx))}
                                                                style={{
                                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                                    border: 'none',
                                                                    padding: '6px',
                                                                    borderRadius: '6px',
                                                                    cursor: 'pointer',
                                                                    color: '#EF4444'
                                                                }}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                    {/* Total row for Support */}
                                    <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                                        {!isReadOnly && <td></td>}
                                        <td colSpan={5} style={{ padding: '8px 12px', textAlign: 'right', fontSize: '0.9rem', color: '#4A5568', fontWeight: 700 }}>Total Support:</td>
                                        <ReadOnlyCell value={calculateCategoryTotals(supportItems, 'support').catCost} symbol={currencySymbol} bold color="#FF6B00" fontSize="0.95rem" fontWeight={800} />
                                        <td></td>
                                        <ReadOnlyCell value={calculateCategoryTotals(supportItems, 'support').catMarginAmount} symbol={currencySymbol} bold color="#FF6B00" fontSize="0.95rem" fontWeight={800} />
                                        <ReadOnlyCell value={calculateCategoryTotals(supportItems, 'support').catPrice} symbol={currencySymbol} bold color="#FF6B00" fontSize="0.95rem" fontWeight={800} />
                                        <td></td>
                                        {!isReadOnly && <td></td>}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="infra-section" style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px', marginTop: '32px' }}>
                        <SectionHeader title="Infrastructure Cost" />
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', minWidth: '1000px' }}>
                                <TableHeader isReadOnly={isReadOnly} columns={['Infra Name', 'Qty', 'Months', 'Rate/Month', 'Est. Cost', 'Margin %', 'Est. Margin', 'Est. Price', 'Remark']} />
                                <tbody>
                                    {infraItems.map((item, idx) => {
                                        const cost = (parseFloat(item.qty) || 0) * (parseFloat(item.months) || 0) * (parseFloat(item.rate_per_month) || 0);
                                        const marginAmount = cost * ((parseFloat(item.margin_percentage) || 0) / 100);
                                        const price = cost + marginAmount;
                                        return (
                                            <tr key={idx} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}>
                                                {!isReadOnly && (
                                                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                                        {idx === infraItems.length - 1 && (
                                                            <button
                                                                onClick={() => addItem('infra')}
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
                                                )}
                                                <InputCell isReadOnly={isReadOnly} value={item.name} onChange={(v: string) => updateItem(idx, 'name', v, infraItems, setInfraItems)} placeholder="Infra Name" />
                                                <InputCell isReadOnly={isReadOnly} value={item.qty} onChange={(v: number) => updateItem(idx, 'qty', v, infraItems, setInfraItems)} type="number" className="no-spinner" />
                                                <InputCell isReadOnly={isReadOnly} value={item.months} onChange={(v: number) => updateItem(idx, 'months', v, infraItems, setInfraItems)} type="number" className="no-spinner" />
                                                <InputCell isReadOnly={isReadOnly} value={item.rate_per_month} onChange={(v: number) => updateItem(idx, 'rate_per_month', v, infraItems, setInfraItems)} type="number" className="no-spinner" symbol={currencySymbol} />
                                                <ReadOnlyCell value={cost} symbol={currencySymbol} />
                                                <InputCell isReadOnly={isReadOnly} value={item.margin_percentage} onChange={(v: number) => updateItem(idx, 'margin_percentage', v, infraItems, setInfraItems)} type="number" suffix="%" />
                                                <ReadOnlyCell value={marginAmount} symbol={currencySymbol} />
                                                <ReadOnlyCell value={price} bold symbol={currencySymbol} />
                                                <InputCell
                                                    isReadOnly={isReadOnly}
                                                    value={item.remark}
                                                    onChange={(v: string) => updateItem(idx, 'remark', v, infraItems, setInfraItems)}
                                                    placeholder="Remark"
                                                    onKeyDown={(e: any) => {
                                                        if (e.key === 'Tab' && !e.shiftKey && idx === infraItems.length - 1) {
                                                            addItem('infra');
                                                        }
                                                    }}
                                                />
                                                {!isReadOnly && (
                                                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                                        {infraItems.length > 1 && (
                                                            <button
                                                                onClick={() => setInfraItems(infraItems.filter((_, i) => i !== idx))}
                                                                style={{
                                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                                    border: 'none',
                                                                    padding: '6px',
                                                                    borderRadius: '6px',
                                                                    cursor: 'pointer',
                                                                    color: '#EF4444'
                                                                }}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                    {/* Total row for Infra */}
                                    <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                                        {!isReadOnly && <td></td>}
                                        <td colSpan={4} style={{ padding: '8px 12px', textAlign: 'right', fontSize: '0.9rem', color: '#4A5568', fontWeight: 700 }}>Total Infra:</td>
                                        <ReadOnlyCell value={calculateCategoryTotals(infraItems, 'infra').catCost} symbol={currencySymbol} bold color="#FF6B00" fontSize="0.95rem" fontWeight={800} />
                                        <td></td>
                                        <ReadOnlyCell value={calculateCategoryTotals(infraItems, 'infra').catMarginAmount} symbol={currencySymbol} bold color="#FF6B00" fontSize="0.95rem" fontWeight={800} />
                                        <ReadOnlyCell value={calculateCategoryTotals(infraItems, 'infra').catPrice} symbol={currencySymbol} bold color="#FF6B00" fontSize="0.95rem" fontWeight={800} />
                                        <td></td>
                                        {!isReadOnly && <td></td>}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="other-section" style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px', marginTop: '32px' }}>
                        <SectionHeader title="Other Category" />
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', minWidth: '800px' }}>
                                <TableHeader isReadOnly={isReadOnly} columns={['Description', 'Est. Cost', 'Margin %', 'Est. Margin', 'Est. Price', 'Remark']} />
                                <tbody>
                                    {otherItems.map((item, idx) => {
                                        const cost = parseFloat(item.estimated_cost) || 0;
                                        const marginAmount = cost * ((parseFloat(item.margin_percentage) || 0) / 100);
                                        const price = cost + marginAmount;
                                        return (
                                            <tr key={idx} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                                                {!isReadOnly && (
                                                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                                        {idx === otherItems.length - 1 && (
                                                            <button
                                                                onClick={() => addItem('other')}
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
                                                )}
                                                <InputCell isReadOnly={isReadOnly} value={item.description} onChange={(v: string) => updateItem(idx, 'description', v, otherItems, setOtherItems)} placeholder="Description" />
                                                <InputCell isReadOnly={isReadOnly} value={item.estimated_cost} onChange={(v: number) => updateItem(idx, 'estimated_cost', v, otherItems, setOtherItems)} type="number" className="no-spinner" symbol={currencySymbol} />
                                                <InputCell isReadOnly={isReadOnly} value={item.margin_percentage} onChange={(v: number) => updateItem(idx, 'margin_percentage', v, otherItems, setOtherItems)} type="number" suffix="%" />
                                                <ReadOnlyCell value={marginAmount} symbol={currencySymbol} />
                                                <ReadOnlyCell value={price} bold symbol={currencySymbol} />
                                                <InputCell
                                                    isReadOnly={isReadOnly}
                                                    value={item.remark}
                                                    onChange={(v: string) => updateItem(idx, 'remark', v, otherItems, setOtherItems)}
                                                    placeholder="Remark"
                                                    onKeyDown={(e: any) => {
                                                        if (e.key === 'Tab' && !e.shiftKey && idx === otherItems.length - 1) {
                                                            addItem('other');
                                                        }
                                                    }}
                                                />
                                                {!isReadOnly && (
                                                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                                        {otherItems.length > 1 && (
                                                            <button
                                                                onClick={() => setOtherItems(otherItems.filter((_, i) => i !== idx))}
                                                                style={{
                                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                                    border: 'none',
                                                                    padding: '6px',
                                                                    borderRadius: '6px',
                                                                    cursor: 'pointer',
                                                                    color: '#EF4444'
                                                                }}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                    {/* Total row for Other */}
                                    <tr style={{ background: '#F8FAFC', fontWeight: 700 }}>
                                        {!isReadOnly && <td></td>}
                                        <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: '0.9rem', color: '#4A5568', fontWeight: 700 }}>Total Other:</td>
                                        <ReadOnlyCell value={calculateCategoryTotals(otherItems, 'other').catCost} symbol={currencySymbol} bold color="var(--theme-primary)" fontSize="0.95rem" fontWeight={800} />
                                        <td></td>
                                        <ReadOnlyCell value={calculateCategoryTotals(otherItems, 'other').catMarginAmount} symbol={currencySymbol} bold color="var(--theme-primary)" fontSize="0.95rem" fontWeight={800} />
                                        <ReadOnlyCell value={calculateCategoryTotals(otherItems, 'other').catPrice} symbol={currencySymbol} bold color="var(--theme-primary)" fontSize="0.95rem" fontWeight={800} />
                                        <td></td>
                                        {!isReadOnly && <td></td>}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="remarks-section" style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px', marginTop: '32px' }}>
                        <SectionHeader title="Description/Remark" />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <textarea
                                value={overallRemarks}
                                onChange={(e) => setOverallRemarks(e.target.value)}
                                readOnly={isReadOnly}
                                placeholder="Description/Remark"
                                style={{
                                    width: '100%',
                                    border: isReadOnly ? 'none' : '1px solid #E2E8F0',
                                    borderRadius: '6px',
                                    padding: isReadOnly ? '0' : '12px',
                                    minHeight: '80px',
                                    outline: 'none',
                                    background: isReadOnly ? 'transparent' : 'white',
                                    fontSize: '0.85rem'
                                }}
                            />
                        </div>
                    </section>

                    <div style={{
                        display: 'flex',
                        gap: '24px',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '32px',
                        paddingTop: '32px',
                        marginBottom: '20px',
                        width: '100%',
                        padding: '32px 4px 0 4px'
                    }}>
                        {/* Compact Attachment Panel */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            padding: '4px 12px',
                            background: 'var(--bg-secondary)',
                            borderRadius: '12px',
                            border: '1px solid var(--border-primary)',
                            width: 'fit-content',
                            minWidth: 'fit-content',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            {!isReadOnly && (
                                <>
                                    <input
                                        id="file-upload-input"
                                        type="file"
                                        onChange={handleFileUpload}
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                                        disabled={uploading}
                                        style={{ display: 'none' }}
                                    />
                                    <button
                                        onClick={() => document.getElementById('file-upload-input')?.click()}
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
                                            e.currentTarget.style.background = 'var(--theme-primary)';
                                            e.currentTarget.style.color = 'white';
                                            e.currentTarget.style.borderColor = 'var(--theme-primary)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'white';
                                            e.currentTarget.style.color = 'var(--text-primary)';
                                            e.currentTarget.style.borderColor = 'var(--border-primary)';
                                        }}
                                    >
                                        <Paperclip size={14} /> Attachments
                                    </button>
                                </>
                            )}

                            {/* MIDDLE: File List pills - More Compact */}
                            <div style={{
                                flex: 1,
                                display: 'flex',
                                gap: '8px',
                                overflowX: 'auto',
                                padding: '4px 0',
                                alignItems: 'center'
                            }}>
                                {attachments.length > 0 ? (
                                    attachments.map((att) => (
                                        <div
                                            key={att.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '4px 10px',
                                                background: 'white',
                                                borderRadius: '8px',
                                                border: '1px solid #E0E6ED',
                                                minWidth: 'fit-content'
                                            }}
                                        >
                                            <File size={14} style={{ color: '#FF6B00' }} />
                                            <span style={{
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                color: '#1a1f36',
                                                maxWidth: '120px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {att.filename}
                                            </span>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleView(att)}
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
                                                    onClick={() => handleDownload(att)}
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
                                                {!isReadOnly && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteAttachment(att.id)}
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
                                    <span style={{ fontSize: '0.9rem', color: '#A0AEC0', fontStyle: 'italic', marginLeft: '10px' }}>
                                        {uploading ? 'Uploading...' : 'No attachments yet'}
                                    </span>
                                )}

                                {/* Upload Feedback Message */}
                                {uploadFeedback.message && (
                                    <div style={{
                                        padding: '4px 12px',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        background: uploadFeedback.type === 'error' ? '#FFF5F5' : '#F0FFF4',
                                        color: uploadFeedback.type === 'error' ? '#C53030' : '#2F855A',
                                        border: `1px solid ${uploadFeedback.type === 'error' ? '#FEB2B2' : '#9AE6B4'}`,
                                        marginLeft: '10px',
                                        whiteSpace: 'nowrap',
                                        animation: 'fadeIn 0.3s ease'
                                    }}>
                                        {uploadFeedback.message}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Consolidated Category Breakdown Table */}
                    <div style={{
                        background: 'var(--bg-primary)',
                        borderRadius: '20px',
                        padding: '20px',
                        border: '1px solid var(--border-primary)',
                        boxShadow: 'var(--shadow-lg)',
                        transition: 'all 0.3s ease'
                    }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.08)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.04)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                            <div style={{ width: '4px', height: '18px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Category Breakdown Summary</h3>
                        </div>

                        <div style={{ overflow: 'hidden', borderRadius: '12px', border: '1px solid var(--border-primary)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'var(--theme-primary)' }}>
                                        <th style={{ padding: '8px 16px', fontSize: '0.75rem', fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', width: '30%' }}>Category</th>
                                        <th style={{ padding: '8px 16px', fontSize: '0.75rem', fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Total Est. Cost</th>
                                        <th style={{ padding: '8px 16px', fontSize: '0.75rem', fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Total Est. Margin %</th>
                                        <th style={{ padding: '8px 16px', fontSize: '0.75rem', fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Total Est. Margin</th>
                                        <th style={{ padding: '8px 16px', fontSize: '0.75rem', fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Total Est. Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { label: 'License', totals: calculateCategoryTotals(licenseItems, 'license') },
                                        { label: 'Services - Implementation', totals: calculateCategoryTotals(implementationItems, 'implementation') },
                                        { label: 'Services - Support', totals: calculateCategoryTotals(supportItems, 'support') },
                                        { label: 'Infrastructure Cost', totals: calculateCategoryTotals(infraItems, 'infra') },
                                        { label: 'Other Category', totals: calculateCategoryTotals(otherItems, 'other') }
                                    ].map((row, idx) => (
                                        <tr
                                            key={row.label}
                                            style={{
                                                background: idx % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                                                borderBottom: idx === 4 ? 'none' : '1px solid var(--border-primary)',
                                                transition: 'background 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#FFF5EB'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'; }}
                                        >
                                            <td style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700, color: '#1a1f36' }}>{row.label}</td>
                                            <td style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600, color: '#4A5568', fontFamily: 'monospace', textAlign: 'right' }}>
                                                {currencySymbol}{row.totals.catCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}

                                            </td>
                                            <td style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700, color: row.totals.catMarginPercent >= 0 ? '#00C853' : '#EF4444', textAlign: 'right' }}>
                                                {row.totals.catMarginPercent.toFixed(2)}%
                                            </td>
                                            <td style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600, color: '#4A5568', fontFamily: 'monospace', textAlign: 'right' }}>
                                                {currencySymbol}{row.totals.catMarginAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ padding: '8px 16px', fontSize: '0.9rem', fontWeight: 800, color: '#0066CC', fontFamily: 'monospace', textAlign: 'right' }}>
                                                {currencySymbol}{row.totals.catPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}

                                            </td>
                                        </tr>
                                    ))}
                                    {/* Subtotal Row */}
                                    <tr style={{ background: 'var(--bg-secondary)', borderTop: '2px solid var(--border-primary)' }}>
                                        <td style={{ padding: '12px 16px', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>Total</td>
                                        <td style={{ padding: '12px 16px', fontSize: '0.9rem', fontWeight: 800, color: '#1a1f36', fontFamily: 'monospace', textAlign: 'right' }}>
                                            {currencySymbol}{totals.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '0.9rem', fontWeight: 800, color: totals.totalMarginPercent >= 0 ? '#00C853' : '#EF4444', fontFamily: 'monospace', textAlign: 'right' }}>
                                            {totals.totalMarginPercent.toFixed(2)}%
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '0.9rem', fontWeight: 800, color: '#1a1f36', fontFamily: 'monospace', textAlign: 'right' }}>
                                            {currencySymbol}{totals.totalMarginAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '0.95rem', fontWeight: 900, color: '#FF6B00', fontFamily: 'monospace', textAlign: 'right' }}>
                                            {currencySymbol}{totals.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            )}

            {/* Footer Actions (Outside Tab Container) */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--bg-primary)',
                padding: '6px',
                borderRadius: '12px',
                border: '1px solid var(--border-primary)',
                boxShadow: 'var(--shadow-sm)',
                width: 'fit-content',
                flexShrink: 0,
                zIndex: 10,
                marginTop: '10px',
                marginLeft: 'auto'
            }}>
                {status === 'PENDING' || status === 'REVERTED' ? (
                    <>
                        <button
                            onClick={() => handleSave('PENDING')}
                            className="ae-btn-secondary"
                            style={{
                                color: 'var(--text-secondary)',
                                border: 'none'
                            }}
                        >
                            <Save size={16} />
                            <span>Save as Draft</span>
                        </button>

                        <button
                            onClick={() => handleSave('SUBMITTED')}
                            className="ae-btn-primary"
                        >
                            <PlusCircle size={18} />
                            <span>Submit for Approval</span>
                        </button>
                    </>
                ) : null}

                {status === 'SUBMITTED' && (
                    <>
                        <button
                            onClick={handleApprove}
                            className="ae-btn-success"
                        >
                            <CheckCircle size={18} />
                            <span>Approve</span>
                        </button>

                        <button
                            onClick={() => setShowRevertModal(true)}
                            className="ae-btn-secondary"
                            style={{
                                background: '#FFFBEB',
                                color: '#D89614',
                                borderColor: 'rgba(216, 150, 20, 0.2)'
                            }}
                        >
                            <ArrowLeft size={18} />
                            <span>Revert</span>
                        </button>

                        <button
                            onClick={() => setShowRejectModal(true)}
                            className="ae-btn-danger"
                        >
                            <XCircle size={18} />
                            <span>Reject</span>
                        </button>
                    </>
                )}

                <button
                    onClick={() => {
                        showConfirm({
                            title: 'Are you sure you want to exit?',
                            onConfirm: () => onBack()
                        });
                    }}
                    className="ae-btn-secondary"
                >
                    <span>Cancel</span>
                </button>
            </div>



            {/* Custom Alert Modal */}
            {
                customAlert && createPortal(
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10000,
                            animation: 'fadeIn 0.2s ease',
                            backdropFilter: 'blur(4px)'
                        }}
                        onClick={() => setCustomAlert(null)}
                    >
                        <div
                            style={{
                                background: '#1a1f36',
                                borderRadius: '16px',
                                padding: '32px',
                                maxWidth: '500px',
                                width: '90%',
                                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                                animation: 'slideUp 0.3s ease',
                                border: `2px solid ${customAlert.type === 'success' ? '#00C853' : customAlert.type === 'error' ? '#EF4444' : '#0066CC'}`
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    background: customAlert.type === 'success' ? 'rgba(0, 200, 83, 0.2)' : customAlert.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0, 102, 204, 0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    {customAlert.type === 'success' && <CheckCircle size={28} style={{ color: '#00C853' }} />}
                                    {customAlert.type === 'error' && <XCircle size={28} style={{ color: '#EF4444' }} />}
                                    {customAlert.type === 'info' && <Clock size={28} style={{ color: '#0066CC' }} />}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{
                                        fontSize: '1.25rem',
                                        fontWeight: 700,
                                        color: 'white',
                                        margin: '0 0 8px 0'
                                    }}>
                                        {customAlert.type === 'success' ? 'Success' : customAlert.type === 'error' ? 'Error' : 'Information'}
                                    </h3>
                                    <p style={{
                                        fontSize: '0.95rem',
                                        color: '#E0E6ED',
                                        margin: 0,
                                        lineHeight: '1.6',
                                        whiteSpace: 'pre-line'
                                    }}>
                                        {customAlert.message}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setCustomAlert(null)}
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        border: 'none',
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: 'white',
                                        flexShrink: 0,
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <button
                                onClick={() => setCustomAlert(null)}
                                style={{
                                    marginTop: '24px',
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: customAlert.type === 'success' ? '#00C853' : customAlert.type === 'error' ? '#EF4444' : '#0066CC',
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: '0.95rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                OK
                            </button>
                        </div>
                    </div>,
                    document.body
                )
            }

            {/* Branded Action Modal (Template Style) */}
            {
                (showRejectModal || showRevertModal) && createPortal(
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
                            WebkitBackdropFilter: 'blur(12px)',
                            padding: '24px',
                        }}
                    >
                        <div
                            style={{
                                background: 'var(--bg-primary)',
                                width: '100%',
                                maxWidth: '400px',
                                borderRadius: '24px',
                                boxShadow: 'var(--shadow-xl)',
                                overflow: 'hidden',
                                position: 'relative',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Orange Header Section */}
                            <div style={{
                                background: 'var(--theme-primary)',
                                padding: '28px 24px 24px',
                                position: 'relative',
                            }}>
                                <button
                                    onClick={() => { setShowRejectModal(false); setShowRevertModal(false); }}
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
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.background = 'transparent'; }}
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
                                        }}>
                                            {showRevertModal ? 'Revert Cost Sheet' : 'Reject Cost Sheet'}
                                        </h3>
                                        <p style={{
                                            margin: 0,
                                            color: 'rgba(255,255,255,0.95)',
                                            fontSize: '0.8rem',
                                            fontWeight: 500,
                                            lineHeight: 1.4
                                        }}>
                                            {showRevertModal
                                                ? 'Provide a reason for reverting this cost sheet back to the creator.'
                                                : 'Provide a reason for rejecting this cost sheet for the records.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* White Input Section */}
                            <div style={{ padding: '24px' }}>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        color: '#1e293b',
                                        marginBottom: '8px'
                                    }}>
                                        {showRevertModal ? 'Reversion Reason' : 'Rejection Reason'}
                                    </label>
                                    <textarea
                                        value={showRevertModal ? revertComment : rejectComment}
                                        onChange={e => showRevertModal ? setRevertComment(e.target.value) : setRejectComment(e.target.value)}
                                        placeholder={showRevertModal ? "Type your reason here..." : "Type your reason here..."}
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
                                            transition: 'all 0.2s',
                                            fontWeight: 500
                                        }}
                                        onFocus={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--theme-primary)';
                                            e.currentTarget.style.background = 'white';
                                            e.currentTarget.style.boxShadow = '0 0 0 4px rgba(187, 77, 0, 0.08)';
                                        }}
                                        onBlur={(e) => {
                                            e.currentTarget.style.borderColor = '#e2e8f0';
                                            e.currentTarget.style.background = '#f8fafc';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    />
                                </div>

                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    gap: '10px'
                                }}>
                                    <button
                                        onClick={() => { setShowRejectModal(false); setShowRevertModal(false); }}
                                        style={{
                                            padding: '10px 20px',
                                            borderRadius: '12px',
                                            background: '#f1f5f9',
                                            color: '#475569',
                                            fontWeight: 700,
                                            fontSize: '0.85rem',
                                            border: 'none',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={showRevertModal ? handleRevert : handleReject}
                                        style={{
                                            padding: '10px 24px',
                                            borderRadius: '12px',
                                            background: 'var(--theme-primary)',
                                            color: 'white',
                                            fontWeight: 700,
                                            fontSize: '0.85rem',
                                            border: 'none',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            boxShadow: '0 4px 12px rgba(187, 77, 0, 0.2)'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(187, 77, 0, 0.3)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(187, 77, 0, 0.2)';
                                        }}
                                    >
                                        {showRevertModal ? 'Revert' : 'Reject'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }
        </div >
    );
};

export default CostSheetForm;
