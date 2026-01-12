import React, { useState, useEffect } from 'react';
import { Trash2, Save, CheckCircle, XCircle, Clock, File, Paperclip, X, Download, PlusCircle, TrendingUp, Percent, Wallet, BarChart4 } from 'lucide-react';
import api from '../api';

interface Lead {
    id: number;
    lead_no: string;
    customer_name: string;
    project_name: string;
    project_manager?: string;
    sales_person?: string;
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

const TableHeader = ({ columns, isReadOnly }: { columns: string[], isReadOnly: boolean }) => (
    <thead>
        <tr style={{ background: 'transparent' }}>
            {columns.map((col, i) => (
                <th key={i} style={{
                    padding: '4px 12px',
                    textAlign: 'left',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: 'black',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '2px solid #E0E6ED',
                    whiteSpace: 'nowrap'
                }}>{col}</th>
            ))}
            {!isReadOnly && <th style={{ padding: '14px 12px', width: '50px', borderBottom: '2px solid #E0E6ED' }}></th>}
        </tr>
    </thead>
);

const InputCell = ({ value, onChange, type = "text", className = "", isReadOnly }: any) => {
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
        <td style={{ padding: '6px 8px' }}>
            <input
                style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: 'white',
                    border: '1px solid #E0E6ED',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    color: '#2D3748',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                }}
                className={`${className} placeholder-gray-400`}
                type={type}
                value={displayValue}
                placeholder={type === 'number' ? "0" : ""}
                readOnly={isReadOnly}
                onChange={handleChange}
            />
        </td>
    );
};

const ReadOnlyCell = ({ value, bold = false }: any) => (
    <td style={{
        padding: '6px 8px',
        fontSize: bold ? '0.9rem' : '0.8rem',
        fontWeight: bold ? 700 : 600,
        color: bold ? '#1a1f36' : '#718096',
        fontFamily: 'monospace',
        background: 'rgba(0,0,0,0.02)',
        textAlign: 'right'
    }}>
        {typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: 2 }) : value}
    </td>
);

const CostSheetForm: React.FC<CostSheetFormProps> = ({ id, onBack }) => {
    const [localId, setLocalId] = useState<number | null>(id || null);
    const [leadNo, setLeadNo] = useState('');
    const [lead, setLead] = useState<Lead | null>(null);
    const [selectedCustomerName, setSelectedCustomerName] = useState('');
    const [leads, setLeads] = useState<Lead[]>([]);
    const [projectManager, setProjectManager] = useState('');
    const [salesPerson, setSalesPerson] = useState('');
    const [costSheetNo, setCostSheetNo] = useState('');
    const [projectName, setProjectName] = useState('');
    const [costSheetDate, setCostSheetDate] = useState(new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState('PENDING');
    const [approvalComments, setApprovalComments] = useState('');
    const [revertComments, setRevertComments] = useState('');
    const [rejectComment, setRejectComment] = useState('');
    const [revertComment, setRevertComment] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
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
                    setCostSheetDate(data.cost_sheet_date);
                    setStatus(data.status);
                    setProjectManager(data.project_manager || '');
                    setSalesPerson(data.sales_person || '');
                    setApprovalComments(data.approval_comments || '');
                    setRevertComments(data.revert_comments || '');
                    setLicenseItems(data.license_items);
                    setImplementationItems(data.implementation_items);
                    setSupportItems(data.support_items);
                    setInfraItems(data.infra_items);
                    setOtherItems(data.other_items || [{ description: '', estimated_cost: 0, margin_percentage: 0 }]);
                    setAttachments(data.attachments || []);

                    // Set Remark states
                    setOverallRemarks(data.overall_remarks || '');

                    if (data.lead_details) {
                        setLead(data.lead_details);
                        setLeadNo(data.lead_details.lead_no);
                        setSelectedCustomerName(data.lead_details.customer_name);
                        setProjectName(data.lead_details.project_name || '');
                    }
                } catch (error) {
                    console.error('Error fetching cost sheet details', error);
                }
            };
            fetchDetails();
        } else {
            // Reset form for fresh creation
            setCostSheetNo('');
            setStatus('PENDING');
            setProjectManager('');
            setSalesPerson('');
            setProjectName('');
            setLicenseItems([{ name: '', type: '', rate: 0, qty: 0, period: '', margin_percentage: 0 }]);
            setOverallRemarks('');
            // ... (could reset others too but these are the main ones)
        }
    }, [id]);

    useEffect(() => {
        const fetchAllLeads = async () => {
            try {
                const response = await api.get('/leads/');
                setLeads(response.data);
            } catch (error) {
                console.error('Error fetching leads', error);
            }
        };
        fetchAllLeads();
    }, []);

    const handleCustomerChange = (customerName: string) => {
        setSelectedCustomerName(customerName);
        if (!customerName) {
            setLead(null);
            setLeadNo('');
            setProjectManager('');
            setSalesPerson('');
            return;
        }

        // Find if there's only one lead for this customer
        const customerLeads = leads.filter(l => l.customer_name === customerName);
        if (customerLeads.length === 1) {
            setLead(customerLeads[0]);
            setLeadNo(customerLeads[0].lead_no);
            setProjectManager(customerLeads[0].project_manager || '');
            setSalesPerson(customerLeads[0].sales_person || '');
            setProjectName(customerLeads[0].project_name || '');
        } else {
            // Multiple leads, let user pick Lead No.
            setLead(null);
            setLeadNo('');
            setProjectName('');
        }
    };

    const handleLeadChange = (id: string) => {
        const selected = leads.find(l => l.id.toString() === id);
        if (selected) {
            setLead(selected);
            setLeadNo(selected.lead_no);
            setSelectedCustomerName(selected.customer_name);
            setProjectManager(selected.project_manager || '');
            setSalesPerson(selected.sales_person || '');
            setProjectName(selected.project_name || '');
        } else {
            setLead(null);
            setLeadNo('');
            setProjectManager('');
            setSalesPerson('');
            setProjectName('');
        }
    };

    // Get unique customer names
    const uniqueCustomers = Array.from(new Set(leads.map(l => l.customer_name))).sort();

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
                    cost = (parseFloat(item.rate) || 0) * (parseFloat(item.qty) || 0);
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
                cost = (parseFloat(item.rate) || 0) * (parseFloat(item.qty) || 0);
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

        // Validation: If no ID yet, we must have a lead to auto-generate one
        if (!activeId && !lead) {
            setUploadFeedback({ type: 'error', message: 'Please select a lead first.' });
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

    const handleDownload = async (att: Attachment) => {
        try {
            setUploadFeedback({ type: 'success', message: `Downloading ${att.filename}...` });

            // Create a temporary link to trigger download
            const link = document.createElement('a');
            link.href = att.file;
            link.download = att.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => {
                setUploadFeedback({ type: 'success', message: `${att.filename} downloaded!` });
                setTimeout(() => setUploadFeedback({ type: '', message: '' }), 3000);
            }, 1000);
        } catch (error) {
            console.error('Error downloading file', error);
            setUploadFeedback({ type: 'error', message: 'Download failed' });
        }
    };

    const handleDeleteAttachment = async (attachmentId: number) => {
        try {
            await api.delete(`/cost-sheets/${localId}/delete_attachment/?attachment_id=${attachmentId}`);
            setAttachments(attachments.filter(a => a.id !== attachmentId));
        } catch (error) {
            console.error('Error deleting attachment', error);
            setCustomAlert({ message: 'Failed to delete attachment', type: 'error' });
        }
    };

    const handleSave = async (newStatus: string = 'PENDING', isAutoDraft: boolean = false) => {
        if (!lead) return setCustomAlert({ message: 'Please select a lead first by searching for a Lead No.', type: 'error' });
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
            lead: lead.id,
            status: newStatus,
            project_manager: projectManager,
            sales_person: salesPerson,
            project_name: projectName,
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
                if (newStatus === 'PENDING') {
                    setActiveTab('summary');
                } else if (onBack) {
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
            setCustomAlert({ message: error.response?.data?.error || 'Failed to approve', type: 'error' });
        }
    };

    const handleReject = async () => {
        if (!rejectComment) return setCustomAlert({ message: 'Please provide rejection comments', type: 'error' });
        try {
            await api.post(`/cost-sheets/${localId}/reject/`, { comments: rejectComment });
            setCustomAlert({ message: 'Cost Sheet Rejected', type: 'success' });
            if (onBack) onBack();
        } catch (error: any) {
            setCustomAlert({ message: error.response?.data?.error || 'Failed to reject', type: 'error' });
        }
    };

    const handleRevert = async () => {
        if (!revertComment) return setCustomAlert({ message: 'Please provide revert comments', type: 'error' });
        try {
            await api.post(`/cost-sheets/${localId}/revert/`, { comments: revertComment });
            setCustomAlert({ message: 'Cost Sheet Reverted to User', type: 'success' });
            if (onBack) onBack();
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



    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header removed and moved to App.tsx */}

            {/* Header removed and moved to App.tsx */}

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '4px',
                background: 'white',
                padding: '6px',
                borderRadius: '12px',
                border: '1px solid #E0E6ED',
                width: 'fit-content',
                margin: '0 auto',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
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
                        background: activeTab === 'form' ? '#FF6B00' : 'transparent',
                        color: activeTab === 'form' ? 'white' : '#718096',
                        boxShadow: activeTab === 'form' ? '0 2px 8px rgba(255, 107, 0, 0.3)' : 'none'
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
                        background: activeTab === 'summary' ? '#FF6B00' : 'transparent',
                        color: activeTab === 'summary' ? 'white' : '#718096',
                        boxShadow: activeTab === 'summary' ? '0 2px 8px rgba(255, 107, 0, 0.3)' : 'none'
                    }}
                >
                    Cost Summary
                </button>
            </div>

            {activeTab === 'form' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {status === 'REJECTED' && approvalComments && (
                        <div className="bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-xl p-6">
                            <h4 className="text-[#EF4444] font-bold mb-2 flex items-center gap-2"><XCircle size={16} /> Rejection Comments</h4>
                            <p className="text-[#2D3748] italic font-medium">"{approvalComments}"</p>
                        </div>
                    )}

                    {status === 'REVERTED' && revertComments && (
                        <div className="bg-[#FFFBEB] border border-[#D69E2E]/20 rounded-xl p-6">
                            <h4 className="text-[#D69E2E] font-bold mb-2 flex items-center gap-2"><Clock size={16} /> Reversion Remarks</h4>
                            <p className="text-[#2D3748] italic font-medium">"{revertComments}"</p>
                        </div>
                    )}

                    {status === 'APPROVED' && (
                        <div className="bg-[#00C853]/5 border border-[#00C853]/20 rounded-xl p-6 flex items-center gap-3">
                            <CheckCircle size={20} className="text-[#00C853]" />
                            <p className="text-[#2D3748] font-semibold">This cost sheet has been approved and is locked for editing.</p>
                        </div>
                    )}

                    {/* Lead & Metadata Section */}
                    <section className="section-panel" style={{
                        padding: '12px 24px',
                        opacity: isReadOnly ? 0.7 : 1,
                        pointerEvents: isReadOnly ? 'none' : 'auto'
                    }}>
                        <h3 style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            margin: '0 0 2px 0',
                            color: '#FF6B00',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{
                                width: '3px',
                                height: '16px',
                                background: '#0066CC',
                                borderRadius: '2px'
                            }}></span>
                            Lead & Project Details
                        </h3>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '20px'
                        }}>
                            {/* Row 1: Customer Name, Lead No, Project Name */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 1fr',
                                gap: '20px'
                            }}>
                                {/* Customer Name */}
                                <div style={{ padding: '4px' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Customer Name</label>
                                    {!isReadOnly ? (
                                        <select
                                            style={{ width: '100%', padding: '10px 12px', background: 'white', border: '1px solid #E0E6ED', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 500, color: '#1a1f36', cursor: 'pointer', outline: 'none' }}
                                            value={selectedCustomerName}
                                            onChange={e => handleCustomerChange(e.target.value)}
                                        >
                                            <option value="">Select Customer</option>
                                            {uniqueCustomers.map(name => (
                                                <option key={name} value={name}>{name}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#2D3748', padding: '10px 0' }}>{lead?.customer_name || '—'}</div>
                                    )}
                                </div>

                                {/* Lead No */}
                                <div style={{ padding: '4px' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Lead No.</label>
                                    {!isReadOnly ? (
                                        <select
                                            style={{ width: '100%', padding: '10px 12px', background: 'white', border: '1px solid #E0E6ED', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 500, color: '#1a1f36', cursor: 'pointer', outline: 'none' }}
                                            value={lead?.id || ''}
                                            onChange={e => handleLeadChange(e.target.value)}
                                        >
                                            <option value="">Select Lead No.</option>
                                            {(selectedCustomerName ? leads.filter(l => l.customer_name === selectedCustomerName) : leads).map(l => (
                                                <option key={l.id} value={l.id}>{l.lead_no} ({l.project_name})</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#2D3748', padding: '10px 0' }}>{leadNo || '—'}</div>
                                    )}
                                </div>

                                {/* Project Name */}
                                <div style={{ padding: '4px' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Project Name</label>
                                    {!isReadOnly ? (
                                        <input
                                            style={{ width: '100%', padding: '10px 12px', background: 'white', border: '1px solid #E0E6ED', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                            value={projectName}
                                            onChange={e => setProjectName(e.target.value)}
                                            placeholder=""
                                        />
                                    ) : (
                                        <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#2D3748', padding: '10px 0' }}>{projectName || '—'}</div>
                                    )}
                                </div>
                            </div>

                            {/* Row 2: Cost Sheet No, Project Manager, Sales Person, Cost Sheet Date */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'minmax(150px, 1fr) 1.5fr 1.5fr 1fr',
                                gap: '20px'
                            }}>
                                {/* Cost Sheet No */}
                                <div style={{ padding: '4px' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Cost Sheet No.</label>
                                    {!isReadOnly ? (
                                        <div style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            background: '#F7FAFC',
                                            border: '1px solid #E0E6ED',
                                            borderRadius: '8px',
                                            height: '42px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            cursor: 'default'
                                        }}>
                                            <span style={{
                                                fontSize: '0.95rem',
                                                fontWeight: 700,
                                                color: '#FF6B00',
                                                fontFamily: 'monospace'
                                            }}>
                                                {costSheetNo || 'Auto-generated'}
                                            </span>
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FF6B00', fontFamily: 'monospace', padding: '10px 0' }}>
                                            {costSheetNo || 'Auto-generated'}
                                        </div>
                                    )}
                                </div>

                                {/* Project Manager */}
                                <div style={{ padding: '4px' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Project Manager</label>
                                    {!isReadOnly ? (
                                        <input
                                            style={{ width: '100%', padding: '10px 12px', background: 'white', border: '1px solid #E0E6ED', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                            value={projectManager}
                                            onChange={e => setProjectManager(e.target.value)}
                                            placeholder="Enter Project Manager"
                                        />
                                    ) : (
                                        <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#2D3748', padding: '10px 0' }}>{projectManager || '—'}</div>
                                    )}
                                </div>

                                {/* Sales Person */}
                                <div style={{ padding: '4px' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Sales Person</label>
                                    {!isReadOnly ? (
                                        <input
                                            style={{ width: '100%', padding: '10px 12px', background: 'white', border: '1px solid #E0E6ED', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                            value={salesPerson}
                                            onChange={e => setSalesPerson(e.target.value)}
                                            placeholder="Enter Sales Person"
                                        />
                                    ) : (
                                        <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#2D3748', padding: '10px 0' }}>{salesPerson || '—'}</div>
                                    )}
                                </div>

                                {/* Cost Sheet Date */}
                                <div style={{ padding: '4px' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Cost Sheet Date</label>
                                    {!isReadOnly ? (
                                        <input
                                            type="date"
                                            style={{ width: '100%', padding: '10px 12px', background: 'white', border: '1px solid #E0E6ED', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                            value={costSheetDate}
                                            onChange={e => setCostSheetDate(e.target.value)}
                                        />
                                    ) : (
                                        <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#2D3748', padding: '10px 0' }}>{formatDateDisplay(costSheetDate)}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* License Section */}
                    <section className="section-panel" style={{ padding: '12px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#FF6B00', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '4px', height: '20px', background: '#0066CC', borderRadius: '2px' }}></span>
                                License
                            </h3>
                            {!isReadOnly && (
                                <button
                                    onClick={() => addItem('license')}
                                    className="ae-btn-add"
                                >
                                    + Add Item
                                </button>
                            )}
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', minWidth: '1100px' }}>
                                <TableHeader isReadOnly={isReadOnly} columns={['License Name', 'License Type', 'Rate', 'Qty', 'Period', 'Est. Cost', 'Est. Amount', 'Margin %', 'Est. Price', 'Remark']} />
                                <tbody>
                                    {licenseItems.map((item, idx) => {
                                        const cost = (parseFloat(item.rate) || 0) * (parseFloat(item.qty) || 0);
                                        const marginAmount = cost * ((parseFloat(item.margin_percentage) || 0) / 100);
                                        const price = cost + marginAmount;
                                        return (
                                            <tr key={idx} style={{ background: '#FAFBFC', borderRadius: '8px' }}>
                                                <InputCell isReadOnly={isReadOnly} value={item.name} onChange={(v: string) => updateItem(idx, 'name', v, licenseItems, setLicenseItems)} />
                                                <InputCell isReadOnly={isReadOnly} value={item.type} onChange={(v: string) => updateItem(idx, 'type', v, licenseItems, setLicenseItems)} />
                                                <InputCell isReadOnly={isReadOnly} value={item.rate} onChange={(v: number) => updateItem(idx, 'rate', v, licenseItems, setLicenseItems)} type="number" className="no-spinner" />
                                                <InputCell isReadOnly={isReadOnly} value={item.qty} onChange={(v: number) => updateItem(idx, 'qty', v, licenseItems, setLicenseItems)} type="number" className="no-spinner" />
                                                <InputCell isReadOnly={isReadOnly} value={item.period} onChange={(v: string) => updateItem(idx, 'period', v, licenseItems, setLicenseItems)} />
                                                <ReadOnlyCell value={cost} />
                                                <ReadOnlyCell value={marginAmount} />
                                                <InputCell isReadOnly={isReadOnly} value={item.margin_percentage} onChange={(v: number) => updateItem(idx, 'margin_percentage', v, licenseItems, setLicenseItems)} type="number" />
                                                <ReadOnlyCell value={price} bold />
                                                <InputCell isReadOnly={isReadOnly} value={item.remark} onChange={(v: string) => updateItem(idx, 'remark', v, licenseItems, setLicenseItems)} />
                                                {!isReadOnly && (
                                                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
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
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Implementation Section */}
                    <section className="section-panel" style={{ padding: '12px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#FF6B00', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '4px', height: '20px', background: '#0066CC', borderRadius: '2px' }}></span>
                                Services - Implementation
                            </h3>
                            {!isReadOnly && (
                                <button
                                    onClick={() => addItem('implementation')}
                                    className="ae-btn-add"
                                >
                                    + Add Item
                                </button>
                            )}
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', minWidth: '1100px' }}>
                                <TableHeader isReadOnly={isReadOnly} columns={['Resource Category', 'No. of Resources', 'No. of Days', 'Total Days', 'Rate/Day', 'Est. Cost', 'Est. Amount', 'Margin %', 'Est. Price', 'Remark']} />
                                <tbody>
                                    {implementationItems.map((item, idx) => {
                                        const totalDays = (parseFloat(item.num_resources) || 0) * (parseFloat(item.num_days) || 0);
                                        const cost = totalDays * (parseFloat(item.rate_per_day) || 0);
                                        const marginAmount = cost * ((parseFloat(item.margin_percentage) || 0) / 100);
                                        const price = cost + marginAmount;
                                        return (
                                            <tr key={idx} style={{ background: '#FAFBFC', borderRadius: '8px' }}>
                                                <InputCell isReadOnly={isReadOnly} value={item.category} onChange={(v: string) => updateItem(idx, 'category', v, implementationItems, setImplementationItems)} />
                                                <InputCell isReadOnly={isReadOnly} value={item.num_resources} onChange={(v: number) => updateItem(idx, 'num_resources', v, implementationItems, setImplementationItems)} type="number" className="no-spinner" />
                                                <InputCell isReadOnly={isReadOnly} value={item.num_days} onChange={(v: number) => updateItem(idx, 'num_days', v, implementationItems, setImplementationItems)} type="number" className="no-spinner" />
                                                <ReadOnlyCell value={totalDays} />
                                                <InputCell isReadOnly={isReadOnly} value={item.rate_per_day} onChange={(v: number) => updateItem(idx, 'rate_per_day', v, implementationItems, setImplementationItems)} type="number" className="no-spinner" />
                                                <ReadOnlyCell value={cost} />
                                                <ReadOnlyCell value={marginAmount} />
                                                <InputCell isReadOnly={isReadOnly} value={item.margin_percentage} onChange={(v: number) => updateItem(idx, 'margin_percentage', v, implementationItems, setImplementationItems)} type="number" />
                                                <ReadOnlyCell value={price} bold />
                                                <InputCell isReadOnly={isReadOnly} value={item.remark} onChange={(v: string) => updateItem(idx, 'remark', v, implementationItems, setImplementationItems)} />
                                                {!isReadOnly && (
                                                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
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
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Support Section */}
                    <section className="section-panel" style={{ padding: '12px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#FF6B00', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '4px', height: '20px', background: '#0066CC', borderRadius: '2px' }}></span>
                                Services - Support
                            </h3>
                            {!isReadOnly && (
                                <button
                                    onClick={() => addItem('support')}
                                    className="ae-btn-add"
                                >
                                    + Add Item
                                </button>
                            )}
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', minWidth: '1100px' }}>
                                <TableHeader isReadOnly={isReadOnly} columns={['Resource Category', 'No. of Resources', 'No. of Days', 'Total Days', 'Rate/Day', 'Est. Cost', 'Est. Amount', 'Margin %', 'Est. Price', 'Remark']} />
                                <tbody>
                                    {supportItems.map((item, idx) => {
                                        const totalDays = (parseFloat(item.num_resources) || 0) * (parseFloat(item.num_days) || 0);
                                        const cost = totalDays * (parseFloat(item.rate_per_day) || 0);
                                        const marginAmount = cost * ((parseFloat(item.margin_percentage) || 0) / 100);
                                        const price = cost + marginAmount;
                                        return (
                                            <tr key={idx} style={{ background: '#FAFBFC', borderRadius: '8px' }}>
                                                <InputCell isReadOnly={isReadOnly} value={item.category} onChange={(v: string) => updateItem(idx, 'category', v, supportItems, setSupportItems)} />
                                                <InputCell isReadOnly={isReadOnly} value={item.num_resources} onChange={(v: number) => updateItem(idx, 'num_resources', v, supportItems, setSupportItems)} type="number" className="no-spinner" />
                                                <InputCell isReadOnly={isReadOnly} value={item.num_days} onChange={(v: number) => updateItem(idx, 'num_days', v, supportItems, setSupportItems)} type="number" className="no-spinner" />
                                                <ReadOnlyCell value={totalDays} />
                                                <InputCell isReadOnly={isReadOnly} value={item.rate_per_day} onChange={(v: number) => updateItem(idx, 'rate_per_day', v, supportItems, setSupportItems)} type="number" className="no-spinner" />
                                                <ReadOnlyCell value={cost} />
                                                <ReadOnlyCell value={marginAmount} />
                                                <InputCell isReadOnly={isReadOnly} value={item.margin_percentage} onChange={(v: number) => updateItem(idx, 'margin_percentage', v, supportItems, setSupportItems)} type="number" />
                                                <ReadOnlyCell value={price} bold />
                                                <InputCell isReadOnly={isReadOnly} value={item.remark} onChange={(v: string) => updateItem(idx, 'remark', v, supportItems, setSupportItems)} />
                                                {!isReadOnly && (
                                                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
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
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Infrastructure Section */}
                    <section className="section-panel" style={{ padding: '12px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#FF6B00', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '4px', height: '20px', background: '#0066CC', borderRadius: '2px' }}></span>
                                Infrastructure Cost
                            </h3>
                            {!isReadOnly && (
                                <button
                                    onClick={() => addItem('infra')}
                                    className="ae-btn-add"
                                >
                                    + Add Item
                                </button>
                            )}
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', minWidth: '1000px' }}>
                                <TableHeader isReadOnly={isReadOnly} columns={['Infra Name', 'Qty', 'Months', 'Rate/Month', 'Est. Cost', 'Est. Amount', 'Margin %', 'Est. Price', 'Remark']} />
                                <tbody>
                                    {infraItems.map((item, idx) => {
                                        const cost = (parseFloat(item.qty) || 0) * (parseFloat(item.months) || 0) * (parseFloat(item.rate_per_month) || 0);
                                        const marginAmount = cost * ((parseFloat(item.margin_percentage) || 0) / 100);
                                        const price = cost + marginAmount;
                                        return (
                                            <tr key={idx} style={{ background: '#FAFBFC', borderRadius: '8px' }}>
                                                <InputCell isReadOnly={isReadOnly} value={item.name} onChange={(v: string) => updateItem(idx, 'name', v, infraItems, setInfraItems)} />
                                                <InputCell isReadOnly={isReadOnly} value={item.qty} onChange={(v: number) => updateItem(idx, 'qty', v, infraItems, setInfraItems)} type="number" className="no-spinner" />
                                                <InputCell isReadOnly={isReadOnly} value={item.months} onChange={(v: number) => updateItem(idx, 'months', v, infraItems, setInfraItems)} type="number" className="no-spinner" />
                                                <InputCell isReadOnly={isReadOnly} value={item.rate_per_month} onChange={(v: number) => updateItem(idx, 'rate_per_month', v, infraItems, setInfraItems)} type="number" className="no-spinner" />
                                                <ReadOnlyCell value={cost} />
                                                <ReadOnlyCell value={marginAmount} />
                                                <InputCell isReadOnly={isReadOnly} value={item.margin_percentage} onChange={(v: number) => updateItem(idx, 'margin_percentage', v, infraItems, setInfraItems)} type="number" />
                                                <ReadOnlyCell value={price} bold />
                                                <InputCell isReadOnly={isReadOnly} value={item.remark} onChange={(v: string) => updateItem(idx, 'remark', v, infraItems, setInfraItems)} />
                                                {!isReadOnly && (
                                                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
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
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Other Category Section */}
                    <section className="section-panel" style={{ padding: '12px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#FF6B00', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '4px', height: '20px', background: '#0066CC', borderRadius: '2px' }}></span>
                                Other Category
                            </h3>
                            {!isReadOnly && (
                                <button
                                    onClick={() => addItem('other')}
                                    className="ae-btn-add"
                                >
                                    + Add Item
                                </button>
                            )}
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', minWidth: '800px' }}>
                                <TableHeader isReadOnly={isReadOnly} columns={['Description', 'Est. Cost', 'Est. Amount', 'Margin %', 'Est. Price', 'Remark']} />
                                <tbody>
                                    {otherItems.map((item, idx) => {
                                        const cost = parseFloat(item.estimated_cost) || 0;
                                        const marginAmount = cost * ((parseFloat(item.margin_percentage) || 0) / 100);
                                        const price = cost + marginAmount;
                                        return (
                                            <tr key={idx} style={{ background: '#FAFBFC', borderRadius: '8px' }}>
                                                <InputCell isReadOnly={isReadOnly} value={item.description} onChange={(v: string) => updateItem(idx, 'description', v, otherItems, setOtherItems)} />
                                                <InputCell isReadOnly={isReadOnly} value={item.estimated_cost} onChange={(v: number) => updateItem(idx, 'estimated_cost', v, otherItems, setOtherItems)} type="number" className="no-spinner" />
                                                <ReadOnlyCell value={marginAmount} />
                                                <InputCell isReadOnly={isReadOnly} value={item.margin_percentage} onChange={(v: number) => updateItem(idx, 'margin_percentage', v, otherItems, setOtherItems)} type="number" />
                                                <ReadOnlyCell value={price} bold />
                                                <InputCell isReadOnly={isReadOnly} value={item.remark} onChange={(v: string) => updateItem(idx, 'remark', v, otherItems, setOtherItems)} />
                                                {!isReadOnly && (
                                                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
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
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Overall Remarks Section */}
                    <section className="section-panel" style={{ padding: '12px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', minHeight: '32px' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#FF6B00', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '4px', height: '20px', background: '#0066CC', borderRadius: '2px' }}></span>
                                Overall Remarks
                            </h3>
                        </div>
                        <div style={{ padding: '0 8px' }}>
                            <textarea
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    background: 'white',
                                    border: '1px solid #E0E6ED',
                                    borderRadius: '12px',
                                    fontSize: '0.9rem',
                                    fontWeight: 500,
                                    color: '#2D3748',
                                    outline: 'none',
                                    minHeight: '60px',
                                    resize: 'vertical'
                                }}
                                value={overallRemarks}
                                onChange={(e) => setOverallRemarks(e.target.value)}
                                readOnly={isReadOnly}
                                placeholder="Add overall remarks for this cost sheet..."
                            />
                        </div>
                    </section>

                    {/* Document Attachments & Actions Layout - Standalone Row */}
                    {/* Refined Action bar: [Attachment Panel] --- [Standalone Actions] */}
                    <div style={{
                        display: 'flex',
                        gap: '24px',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '20px',
                        width: '100%',
                        padding: '0 4px'
                    }}>
                        {/* LEFT & MIDDLE: Attachment Panel (Dynamic background) */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '24px',
                            padding: '6px 16px',
                            background: '#FAFBFC',
                            borderRadius: '16px',
                            border: '1px solid #E0E6ED',
                            width: 'fit-content',
                            minWidth: 'fit-content',
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.02)'
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
                                            justifyContent: 'center',
                                            gap: '12px',
                                            background: 'white',
                                            color: '#1a1f36',
                                            border: '1px solid #E0E6ED',
                                            height: '56px',
                                            padding: '0 44px',
                                            borderRadius: '12px',
                                            fontWeight: 700,
                                            fontSize: '15px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            whiteSpace: 'nowrap',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#FF6B00';
                                            e.currentTarget.style.color = 'white';
                                            e.currentTarget.style.borderColor = '#FF6B00';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 0, 0.3)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'white';
                                            e.currentTarget.style.color = '#1a1f36';
                                            e.currentTarget.style.borderColor = '#E0E6ED';
                                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                                        }}
                                    >
                                        <Paperclip size={20} /> Attachments
                                    </button>
                                </>
                            )}

                            {/* MIDDLE: File List pills (Custom styling from image 0) */}
                            <div style={{
                                flex: 1,
                                display: 'flex',
                                gap: '12px',
                                overflowX: 'auto',
                                padding: '8px 0',
                                scrollbarWidth: 'thin',
                                alignItems: 'center'
                            }}>
                                {attachments.length > 0 ? (
                                    attachments.map((att) => (
                                        <div
                                            key={att.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '6px 14px',
                                                background: 'white',
                                                borderRadius: '10px',
                                                border: '1px solid #E0E6ED',
                                                transition: 'all 0.2s',
                                                minWidth: 'fit-content',
                                                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                                            }}
                                        >
                                            {/* Icon Background (Light Orange) */}
                                            <div style={{
                                                width: '30px',
                                                height: '30px',
                                                borderRadius: '6px',
                                                background: 'rgba(255, 107, 0, 0.1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                <File size={16} style={{ color: '#FF6B00' }} />
                                            </div>

                                            {/* Filename & Label */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{
                                                    fontSize: '0.9rem',
                                                    fontWeight: 700,
                                                    color: '#0066CC',
                                                    maxWidth: '140px',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {att.filename}
                                                </span>
                                                <span style={{ fontSize: '0.7rem', color: '#718096', fontWeight: 500 }}>Document</span>
                                            </div>

                                            {/* Action Buttons (Circled) */}
                                            <div style={{ display: 'flex', gap: '8px', marginLeft: '4px' }}>
                                                <button
                                                    onClick={() => handleDownload(att)}
                                                    style={{
                                                        width: '28px',
                                                        height: '28px',
                                                        borderRadius: '50%',
                                                        border: '1px solid #E0E6ED',
                                                        background: 'white',
                                                        cursor: 'pointer',
                                                        color: '#718096',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#FF6B00'}
                                                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#E0E6ED'}
                                                    title="Download"
                                                >
                                                    <Download size={16} />
                                                </button>
                                                {!isReadOnly && (
                                                    <button
                                                        onClick={() => handleDeleteAttachment(att.id)}
                                                        style={{
                                                            width: '28px',
                                                            height: '28px',
                                                            borderRadius: '50%',
                                                            border: '1px solid #E0E6ED',
                                                            background: 'white',
                                                            cursor: 'pointer',
                                                            color: '#718096',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#EF4444'}
                                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#E0E6ED'}
                                                        title="Remove"
                                                    >
                                                        <X size={16} />
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

                        {/* RIGHT: Standalone Actions (No background container) */}
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', paddingLeft: '12px' }}>
                            {(status === 'PENDING' || status === 'REVERTED') && (
                                <>
                                    <button
                                        onClick={() => handleSave('PENDING')}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            background: 'white',
                                            color: '#1a1f36',
                                            border: '1px solid #E0E6ED',
                                            height: '40px',
                                            padding: '0 16px',
                                            borderRadius: '8px',
                                            fontWeight: 600,
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            whiteSpace: 'nowrap'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#FF6B00';
                                            e.currentTarget.style.color = 'white';
                                            e.currentTarget.style.borderColor = '#FF6B00';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 0, 0.3)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'white';
                                            e.currentTarget.style.color = '#1a1f36';
                                            e.currentTarget.style.borderColor = '#E0E6ED';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        <Save size={16} /> Save as Draft
                                    </button>
                                    <button
                                        onClick={() => handleSave('SUBMITTED')}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            background: 'white',
                                            color: '#1a1f36',
                                            border: '1px solid #E0E6ED',
                                            height: '40px',
                                            padding: '0 16px',
                                            borderRadius: '8px',
                                            fontWeight: 600,
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            whiteSpace: 'nowrap'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#FF6B00';
                                            e.currentTarget.style.color = 'white';
                                            e.currentTarget.style.borderColor = '#FF6B00';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 0, 0.3)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'white';
                                            e.currentTarget.style.color = '#1a1f36';
                                            e.currentTarget.style.borderColor = '#E0E6ED';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        <PlusCircle size={18} /> Submit for Approval
                                    </button>
                                </>
                            )}

                            {status === 'SUBMITTED' && (
                                <>
                                    <button onClick={handleApprove} style={{ background: '#00C853', color: 'white', border: 'none', padding: '0 20px', height: '40px', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        Approve
                                    </button>
                                    <button onClick={() => setShowRevertModal(true)} style={{ background: '#FFF5F0', color: '#D69E2E', border: '1px solid rgba(214, 158, 46, 0.2)', padding: '0 20px', height: '40px', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        Revert
                                    </button>
                                    <button onClick={() => setShowRejectModal(true)} style={{ background: '#FCCCCC', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0 20px', height: '40px', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        Reject
                                    </button>
                                </>
                            )}
                        </div>
                    </div>



                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {/* Consolidated Category Breakdown Table */}
                    <div style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '32px',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
                        transition: 'all 0.3s ease'
                    }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.08)';
                            e.currentTarget.style.transform = 'translateY(-4px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.04)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <div style={{ width: '4px', height: '24px', background: '#FF6B00', borderRadius: '2px' }}></div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1a1f36', margin: 0 }}>Category Breakdown Summary</h3>
                        </div>

                        <div style={{ overflow: 'hidden', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'linear-gradient(135deg, #FF6B00 0%, #FF8C00 100%)' }}>
                                        <th style={{ padding: '16px 20px', fontSize: '0.8rem', fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'left', width: '30%' }}>Category</th>
                                        <th style={{ padding: '16px 20px', fontSize: '0.8rem', fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Total Est. Cost</th>
                                        <th style={{ padding: '16px 20px', fontSize: '0.8rem', fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Total Est. Amount</th>
                                        <th style={{ padding: '16px 20px', fontSize: '0.8rem', fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Total Est. Margin %</th>
                                        <th style={{ padding: '16px 20px', fontSize: '0.8rem', fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Total Est. Price</th>
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
                                                background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                                                borderBottom: idx === 4 ? 'none' : '1px solid #E2E8F0',
                                                transition: 'background 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#FFF5EB'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'; }}
                                        >
                                            <td style={{ padding: '18px 20px', fontSize: '0.95rem', fontWeight: 700, color: '#1a1f36' }}>{row.label}</td>
                                            <td style={{ padding: '18px 20px', fontSize: '0.95rem', fontWeight: 600, color: '#4A5568', fontFamily: 'monospace', textAlign: 'right' }}>
                                                ${row.totals.catCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ padding: '18px 20px', fontSize: '0.95rem', fontWeight: 600, color: '#4A5568', fontFamily: 'monospace', textAlign: 'right' }}>
                                                ${row.totals.catMarginAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ padding: '18px 20px', fontSize: '0.95rem', fontWeight: 700, color: row.totals.catMarginPercent >= 0 ? '#00C853' : '#EF4444', fontFamily: 'monospace', textAlign: 'right' }}>
                                                {row.totals.catMarginPercent.toFixed(2)}%
                                            </td>
                                            <td style={{ padding: '18px 20px', fontSize: '1.05rem', fontWeight: 800, color: '#0066CC', fontFamily: 'monospace', textAlign: 'right' }}>
                                                ${row.totals.catPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Overall Totals Section (Moved Below Table) */}
                    <div style={{ marginTop: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <div style={{ width: '4px', height: '20px', background: '#0066CC', borderRadius: '2px' }}></div>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1a1f36', margin: 0 }}>Cost Summary Breakdown</h3>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                            {[
                                {
                                    label: 'Total Estimated Cost',
                                    value: `$${totals.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                                    icon: <BarChart4 size={24} style={{ color: '#0066CC' }} />,
                                    bgColor: '#EEF6FF',
                                    accentColor: '#0066CC'
                                },
                                {
                                    label: 'Total Estimated Amount',
                                    value: `$${totals.totalMarginAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                                    icon: <Wallet size={24} style={{ color: '#FF6B00' }} />,
                                    bgColor: '#FFF2EB',
                                    accentColor: '#FF6B00'
                                },
                                {
                                    label: 'Total Estimated Margin %',
                                    value: `${totals.totalMarginPercent.toFixed(2)}%`,
                                    icon: <Percent size={24} style={{ color: '#00C853' }} />,
                                    bgColor: '#E8FBF0',
                                    accentColor: '#00C853'
                                },
                                {
                                    label: 'Total Estimated Price',
                                    value: `$${totals.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                                    icon: <TrendingUp size={24} style={{ color: '#6B46C1' }} />,
                                    bgColor: '#F3E8FF',
                                    accentColor: '#6B46C1'
                                }
                            ].map((stat, i) => (
                                <div
                                    key={i}
                                    style={{
                                        background: 'white',
                                        borderRadius: '16px',
                                        padding: '24px',
                                        border: '1px solid #E2E8F0',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        minHeight: '140px',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-6px)';
                                        e.currentTarget.style.boxShadow = `0 12px 24px ${stat.accentColor}15`;
                                        e.currentTarget.style.borderColor = stat.accentColor;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
                                        e.currentTarget.style.borderColor = '#E2E8F0';
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{
                                            width: '44px',
                                            height: '44px',
                                            borderRadius: '12px',
                                            background: stat.bgColor,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {stat.icon}
                                        </div>
                                        <div style={{
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            background: stat.bgColor,
                                            fontSize: '0.65rem',
                                            fontWeight: 800,
                                            color: stat.accentColor,
                                            textTransform: 'uppercase'
                                        }}>
                                            Metrics
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '16px' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#718096', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            {stat.label}
                                        </label>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1a1f36', letterSpacing: '-0.02em' }}>
                                            {stat.value}
                                        </div>
                                    </div>
                                    <div style={{
                                        position: 'absolute',
                                        right: '-10px',
                                        bottom: '-10px',
                                        width: '60px',
                                        height: '60px',
                                        borderRadius: '50%',
                                        background: `${stat.accentColor}05`,
                                        zIndex: 0
                                    }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )
            }



            {/* Custom Alert Modal */}
            {
                customAlert && (
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
                    </div>
                )
            }

            {/* Reject Modal */}
            {
                showRejectModal && (
                    <div className="fixed inset-0 bg-[#1a1f36]/80 backdrop-blur-md flex items-center justify-center z-[100] p-6">
                        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 border border-[#EF4444]/20">
                            <h3 className="text-2xl font-bold mb-4 text-[#1a1f36]">Provide Rejection Reason</h3>
                            <p className="text-[#718096] text-sm mb-6">Explain why this cost sheet requires modifications before it can be approved.</p>
                            <textarea
                                value={rejectComment}
                                onChange={e => setRejectComment(e.target.value)}
                                placeholder="Type rejection comments here..."
                                className="w-full h-40 bg-[#FAFBFC] border border-[#E0E6ED] rounded-xl p-4 text-[#2D3748] focus:border-[#EF4444] focus:ring-4 focus:ring-[#EF4444]/5 outline-none transition-all"
                            />
                            <div className="flex justify-end gap-4 mt-8">
                                <button onClick={() => setShowRejectModal(false)} className="px-6 py-3 text-[#718096] font-bold hover:text-[#1a1f36]">Cancel</button>
                                <button onClick={handleReject} className="bg-[#EF4444] text-white px-10 py-3 rounded-lg font-bold hover:bg-[#D32F2F] shadow-lg shadow-[#EF4444]/20">Confirm Rejection</button>
                            </div>
                        </div>
                    </div>
                )
            }
            {
                showRevertModal && (
                    <div className="fixed inset-0 bg-[#1a1f36]/80 backdrop-blur-md flex items-center justify-center z-[100] p-6">
                        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 border border-[#D69E2E]/20">
                            <h3 className="text-2xl font-bold mb-4 text-[#1a1f36]">Revert Cost Sheet</h3>
                            <p className="text-[#718096] text-sm mb-6">Explain why this cost sheet is being sent back to the user for modifications.</p>
                            <textarea
                                value={revertComment}
                                onChange={e => setRevertComment(e.target.value)}
                                placeholder="Type reversion reason here..."
                                className="w-full h-40 bg-[#FAFBFC] border border-[#E0E6ED] rounded-xl p-4 text-[#2D3748] focus:border-[#D69E2E] focus:ring-4 focus:ring-[#D69E2E]/5 outline-none transition-all"
                            />
                            <div className="flex justify-end gap-4 mt-8">
                                <button onClick={() => setShowRevertModal(false)} className="px-6 py-3 text-[#718096] font-bold hover:text-[#1a1f36]">Cancel</button>
                                <button onClick={handleRevert} className="bg-[#D69E2E] text-white px-10 py-3 rounded-lg font-bold hover:bg-[#B45309] shadow-lg shadow-[#D69E2E]/20">Confirm Revert</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default CostSheetForm;