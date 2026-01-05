import React, { useState, useEffect } from 'react';
import { Trash2, Search, Save, CheckCircle, XCircle, Clock, ArrowLeft, Upload, File, Eye as EyeIcon, Paperclip, X, Download } from 'lucide-react';
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

interface Props {
    id?: number | null;
    onBack?: () => void;
}

const CostSheetForm: React.FC<Props> = ({ id, onBack }) => {
    const [localId, setLocalId] = useState<number | null>(id || null);
    const [leadNo, setLeadNo] = useState('');
    const [lead, setLead] = useState<Lead | null>(null);
    const [selectedCustomerName, setSelectedCustomerName] = useState('');
    const [leads, setLeads] = useState<Lead[]>([]);
    const [projectManager, setProjectManager] = useState('');
    const [salesPerson, setSalesPerson] = useState('');
    const [costSheetNo, setCostSheetNo] = useState('');
    const [costSheetDate, setCostSheetDate] = useState(new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState('PENDING');
    const [approvalComments, setApprovalComments] = useState('');
    const [rejectComment, setRejectComment] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [uploading, setUploading] = useState(false);
    const [isDragHover, setIsDragHover] = useState(false);
    const [previewFile, setPreviewFile] = useState<Attachment | null>(null);
    const [customAlert, setCustomAlert] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

    // Category States
    const [licenseItems, setLicenseItems] = useState<any[]>([{ name: '', type: '', rate: 0, qty: 1, period: '', margin_percentage: 0 }]);
    const [implementationItems, setImplementationItems] = useState<any[]>([{ category: '', num_resources: 1, num_days: 1, rate_per_day: 0, margin_percentage: 0 }]);
    const [supportItems, setSupportItems] = useState<any[]>([{ category: '', num_resources: 1, num_days: 1, rate_per_day: 0, margin_percentage: 0 }]);
    const [infraItems, setInfraItems] = useState<any[]>([{ name: '', qty: 1, months: 1, rate_per_month: 0, margin_percentage: 0 }]);
    const [otherItems, setOtherItems] = useState<any[]>([{ description: '', estimated_cost: 0, margin_percentage: 0 }]);
    const [activeTab, setActiveTab] = useState<'form' | 'summary'>('form');

    const isReadOnly = status !== 'PENDING';

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
                    setLicenseItems(data.license_items);
                    setImplementationItems(data.implementation_items);
                    setSupportItems(data.support_items);
                    setInfraItems(data.infra_items);
                    setOtherItems(data.other_items || [{ description: '', estimated_cost: 0, margin_percentage: 0 }]);
                    setAttachments(data.attachments || []);

                    if (data.lead_details) {
                        setLead(data.lead_details);
                        setLeadNo(data.lead_details.lead_no);
                        setSelectedCustomerName(data.lead_details.customer_name);
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
            setLicenseItems([{ name: '', type: '', rate: 0, qty: 1, period: '', margin_percentage: 0 }]);
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
        } else {
            // Multiple leads, let user pick Lead No.
            setLead(null);
            setLeadNo('');
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
        } else {
            setLead(null);
            setLeadNo('');
            setProjectManager('');
            setSalesPerson('');
        }
    };

    // Get unique customer names
    const uniqueCustomers = Array.from(new Set(leads.map(l => l.customer_name))).sort();
    // Filtered leads based on selected customer
    const filteredLeads = lead
        ? leads.filter(l => l.customer_name === lead.customer_name)
        : leadNo // Case where only Lead No is typed/known partway
            ? leads // Show all if we haven't locked a customer yet
            : leads;

    // Fixed fetching specific lead by number (if manual search still needed)
    const fetchLeadByNo = async () => {
        if (isReadOnly || !leadNo) return;
        try {
            const response = await api.get(`/leads/?lead_no=${leadNo}`);
            if (response.data.length > 0) {
                setLead(response.data[0]);
                setSelectedCustomerName(response.data[0].customer_name);
                setProjectManager(response.data[0].project_manager || '');
                setSalesPerson(response.data[0].sales_person || '');
            } else {
                alert('Lead No. not found');
            }
        } catch (error) {
            console.error('Error searching lead', error);
        }
    };

    const addItem = (category: string) => {
        if (isReadOnly) return;
        switch (category) {
            case 'license':
                setLicenseItems([...licenseItems, { name: '', type: '', rate: 0, qty: 1, period: '', margin_percentage: 0 }]);
                break;
            case 'implementation':
                setImplementationItems([...implementationItems, { category: '', num_resources: 1, num_days: 1, rate_per_day: 0, margin_percentage: 0 }]);
                break;
            case 'support':
                setSupportItems([...supportItems, { category: '', num_resources: 1, num_days: 1, rate_per_day: 0, margin_percentage: 0 }]);
                break;
            case 'infra':
                setInfraItems([...infraItems, { name: '', qty: 1, months: 1, rate_per_month: 0, margin_percentage: 0 }]);
                break;
            case 'other':
                setOtherItems([...otherItems, { description: '', estimated_cost: 0, margin_percentage: 0 }]);
                break;
        }
    };

    const calculateTotals = () => {
        let totalCost = 0;
        let totalMarginAmount = 0;
        let totalPrice = 0;

        const calc = (cost: number, marginPercent: number) => {
            const marginAmount = cost * (marginPercent / 100);
            const price = cost + marginAmount;
            return { cost, marginAmount, price };
        };

        licenseItems.forEach(item => {
            const { cost, marginAmount, price } = calc(item.rate * item.qty, item.margin_percentage);
            totalCost += cost; totalMarginAmount += marginAmount; totalPrice += price;
        });

        implementationItems.forEach(item => {
            const { cost, marginAmount, price } = calc(item.num_resources * item.num_days * item.rate_per_day, item.margin_percentage);
            totalCost += cost; totalMarginAmount += marginAmount; totalPrice += price;
        });

        supportItems.forEach(item => {
            const { cost, marginAmount, price } = calc(item.num_resources * item.num_days * item.rate_per_day, item.margin_percentage);
            totalCost += cost; totalMarginAmount += marginAmount; totalPrice += price;
        });

        infraItems.forEach(item => {
            const { cost, marginAmount, price } = calc(item.qty * item.months * item.rate_per_month, item.margin_percentage);
            totalCost += cost; totalMarginAmount += marginAmount; totalPrice += price;
        });

        otherItems.forEach(item => {
            const { cost, marginAmount, price } = calc(item.estimated_cost, item.margin_percentage);
            totalCost += cost; totalMarginAmount += marginAmount; totalPrice += price;
        });

        const totalMarginPercent = totalCost > 0 ? (totalMarginAmount / totalCost) * 100 : 0;

        return { totalCost, totalMarginAmount, totalMarginPercent, totalPrice };
    };

    const totals = calculateTotals();

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        let activeId = localId;

        // If no ID yet, auto-save as draft first
        if (!activeId) {
            if (!lead) return setCustomAlert({ message: 'Please select a lead first by searching for a Lead No. before attaching documents.', type: 'error' });
            // costSheetNo is now auto-generated, so no check here

            try {
                const draftResponse = await handleSave('PENDING', true);
                if (draftResponse && draftResponse.id) {
                    activeId = draftResponse.id;
                } else {
                    return; // Save failed
                }
            } catch (error) {
                console.error('Error auto-saving draft for attachment', error);
                return;
            }
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post(`/cost-sheets/${activeId}/upload_attachment/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setAttachments([...attachments, response.data]);
        } catch (error) {
            console.error('Error uploading file', error);
            setCustomAlert({ message: 'Failed to upload file', type: 'error' });
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteAttachment = async (attachmentId: number) => {
        try {
            await api.delete(`/cost-sheets/${id}/delete_attachment/?attachment_id=${attachmentId}`);
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
                .map(({ id, cost_sheet, estimated_cost, estimated_margin_amount, estimated_price, total_days, ...rest }) => ({
                    ...rest,
                    // Ensure numeric fields are indeed numbers
                    ...(rest.rate !== undefined && { rate: parseFloat(rest.rate) || 0 }),
                    ...(rest.qty !== undefined && { qty: parseInt(rest.qty) || 0 }),
                    ...(rest.num_resources !== undefined && { num_resources: parseInt(rest.num_resources) || 0 }),
                    ...(rest.num_days !== undefined && { num_days: parseInt(rest.num_days) || 0 }),
                    ...(rest.rate_per_day !== undefined && { rate_per_day: parseFloat(rest.rate_per_day) || 0 }),
                    ...(rest.rate_per_month !== undefined && { rate_per_month: parseFloat(rest.rate_per_month) || 0 }),
                    ...(rest.months !== undefined && { months: parseInt(rest.months) || 0 }),
                    ...(rest.estimated_cost !== undefined && { estimated_cost: parseFloat(rest.estimated_cost) || 0 }),
                    ...(rest.margin_percentage !== undefined && { margin_percentage: parseFloat(rest.margin_percentage) || 0 }),
                }));

        const payload: any = {
            cost_sheet_date: costSheetDate,
            lead: lead.id,
            status: newStatus,
            project_manager: projectManager,
            sales_person: salesPerson,
            license_items: cleanItems(licenseItems, 'license'),
            implementation_items: cleanItems(implementationItems, 'implementation'),
            support_items: cleanItems(supportItems, 'support'),
            infra_items: cleanItems(infraItems, 'infra'),
            other_items: cleanItems(otherItems, 'other'),
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

    const TableHeader = ({ columns }: { columns: string[] }) => (
        <thead>
            <tr style={{ background: '#F8FAFC' }}>
                {columns.map((col, i) => (
                    <th key={i} style={{
                        padding: '14px 12px',
                        textAlign: 'left',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: '#718096',
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

    const getStatusDisplay = () => {
        switch (status) {
            case 'APPROVED':
                return <div className="flex items-center gap-2 text-[#00C853] font-bold bg-[#00C853]/10 px-4 py-2 rounded-lg border border-[#00C853]/20"><CheckCircle size={20} /> APPROVED</div>;
            case 'REJECTED':
                return <div className="flex items-center gap-2 text-[#EF4444] font-bold bg-[#EF4444]/10 px-4 py-2 rounded-lg border border-[#EF4444]/20"><XCircle size={20} /> REJECTED</div>;
            case 'SUBMITTED':
                return <div className="flex items-center gap-2 text-[#0066CC] font-bold bg-[#0066CC]/10 px-4 py-2 rounded-lg border border-[#0066CC]/20"><Clock size={20} /> PENDING APPROVAL</div>;
            default:
                return <div className="flex items-center gap-2 text-[#4A5568] font-bold bg-[#F5F7FA] px-4 py-2 rounded-lg border border-[#E0E6ED]"><Save size={20} /> DRAFT</div>;
        }
    };

    const updateItem = (idx: number, key: string, value: any, items: any[], setter: (val: any[]) => void) => {
        if (isReadOnly) return;
        const newItems = [...items];
        newItems[idx] = { ...newItems[idx], [key]: value };
        setter(newItems);
    };

    const InputCell = ({ value, onChange, type = "text" }: any) => (
        <td style={{ padding: '10px 8px' }}>
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
                type={type}
                value={value}
                readOnly={isReadOnly}
                onChange={e => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
            />
        </td>
    );

    const ReadOnlyCell = ({ value, bold = false }: any) => (
        <td style={{
            padding: '10px 8px',
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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '180px' }}>
            {/* Hero Header */}
            <div className="ae-hero" style={{ padding: '20px 32px', maxWidth: '100%' }}>
                <div style={{ position: 'relative', zIndex: 10 }}>
                    <div>
                        <h1 style={{
                            fontSize: '1.5rem',
                            fontWeight: 800,
                            color: '#FF6B00',
                            margin: 0,
                            textTransform: 'uppercase',
                            letterSpacing: '-0.02em'
                        }}>
                            Cost Sheet {id ? `#${id}` : 'Creation'}
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                            {id ? 'View and manage cost estimation details' : 'Create a new cost estimation'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', background: 'white', padding: '6px', borderRadius: '12px', border: '1px solid #E0E6ED', width: 'fit-content', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
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

                    {status === 'APPROVED' && (
                        <div className="bg-[#00C853]/5 border border-[#00C853]/20 rounded-xl p-6 flex items-center gap-3">
                            <CheckCircle size={20} className="text-[#00C853]" />
                            <p className="text-[#2D3748] font-semibold">This cost sheet has been approved and is locked for editing.</p>
                        </div>
                    )}

                    {/* Lead & Metadata Section */}
                    <section className="section-panel" style={{
                        padding: '24px',
                        opacity: isReadOnly ? 0.7 : 1,
                        pointerEvents: isReadOnly ? 'none' : 'auto'
                    }}>
                        <h3 style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            margin: '0 0 20px 0',
                            color: '#1a1f36',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{
                                width: '4px',
                                height: '20px',
                                background: '#FF6B00',
                                borderRadius: '2px'
                            }}></span>
                            Lead & Project Details
                        </h3>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '16px'
                        }}>
                            {/* Customer Name */}
                            <div style={{
                                background: '#F8FAFC',
                                borderRadius: '12px',
                                padding: '16px',
                                border: '1px solid #E0E6ED',
                                transition: 'all 0.2s',
                            }}>
                                <label style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: '#718096',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    display: 'block',
                                    marginBottom: '8px'
                                }}>Customer Name</label>
                                {!isReadOnly ? (
                                    <select
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            background: 'white',
                                            border: '1px solid #E0E6ED',
                                            borderRadius: '8px',
                                            fontSize: '0.9rem',
                                            fontWeight: 600,
                                            color: '#1a1f36',
                                            cursor: 'pointer',
                                            outline: 'none'
                                        }}
                                        value={selectedCustomerName}
                                        onChange={e => handleCustomerChange(e.target.value)}
                                    >
                                        <option value="">Select Customer</option>
                                        {uniqueCustomers.map(name => (
                                            <option key={name} value={name}>{name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#2D3748' }}>{lead?.customer_name || '—'}</div>
                                )}
                            </div>

                            {/* Lead No */}
                            <div style={{
                                background: '#F8FAFC',
                                borderRadius: '12px',
                                padding: '16px',
                                border: '1px solid #E0E6ED',
                                transition: 'all 0.2s',
                            }}>
                                <label style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: '#718096',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    display: 'block',
                                    marginBottom: '8px'
                                }}>Lead No.</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {!isReadOnly ? (
                                        <select
                                            style={{
                                                flex: 1,
                                                padding: '10px 12px',
                                                background: 'white',
                                                border: '1px solid #E0E6ED',
                                                borderRadius: '8px',
                                                fontSize: '0.9rem',
                                                fontWeight: 600,
                                                color: '#1a1f36',
                                                cursor: 'pointer',
                                                outline: 'none'
                                            }}
                                            value={lead?.id || ''}
                                            onChange={e => handleLeadChange(e.target.value)}
                                        >
                                            <option value="">Select Lead No.</option>
                                            {(selectedCustomerName ? leads.filter(l => l.customer_name === selectedCustomerName) : leads).map(l => (
                                                <option key={l.id} value={l.id}>{l.lead_no}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#2D3748' }}>{leadNo || '—'}</div>
                                    )}

                                </div>
                            </div>

                            {/* Project Name */}
                            <div style={{
                                background: '#F8FAFC',
                                borderRadius: '12px',
                                padding: '16px',
                                border: '1px solid #E0E6ED',
                                transition: 'all 0.2s',
                            }}>
                                <label style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: '#718096',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    display: 'block',
                                    marginBottom: '8px'
                                }}>Project Name</label>
                                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#2D3748' }}>{lead?.project_name || '—'}</div>
                            </div>

                            {/* Project Manager */}
                            <div style={{
                                background: '#F8FAFC',
                                borderRadius: '12px',
                                padding: '16px',
                                border: '1px solid #E0E6ED',
                                transition: 'all 0.2s',
                            }}>
                                <label style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: '#718096',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    display: 'block',
                                    marginBottom: '8px'
                                }}>Project Manager</label>
                                {!isReadOnly ? (
                                    <input
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            background: 'white',
                                            border: '1px solid #E0E6ED',
                                            borderRadius: '8px',
                                            fontSize: '0.9rem',
                                            fontWeight: 600,
                                            color: '#1a1f36',
                                            outline: 'none'
                                        }}
                                        value={projectManager}
                                        onChange={e => setProjectManager(e.target.value)}
                                        placeholder="Enter Project Manager"
                                    />
                                ) : (
                                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#2D3748' }}>{projectManager || '—'}</div>
                                )}
                            </div>

                            {/* Sales Person */}
                            <div style={{
                                background: '#F8FAFC',
                                borderRadius: '12px',
                                padding: '16px',
                                border: '1px solid #E0E6ED',
                                transition: 'all 0.2s',
                            }}>
                                <label style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: '#718096',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    display: 'block',
                                    marginBottom: '8px'
                                }}>Sales Person</label>
                                {!isReadOnly ? (
                                    <input
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            background: 'white',
                                            border: '1px solid #E0E6ED',
                                            borderRadius: '8px',
                                            fontSize: '0.9rem',
                                            fontWeight: 600,
                                            color: '#1a1f36',
                                            outline: 'none'
                                        }}
                                        value={salesPerson}
                                        onChange={e => setSalesPerson(e.target.value)}
                                        placeholder="Enter Sales Person"
                                    />
                                ) : (
                                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#2D3748' }}>{salesPerson || '—'}</div>
                                )}
                            </div>

                            {/* Cost Sheet No */}
                            <div style={{
                                background: '#FFF7ED',
                                borderRadius: '12px',
                                padding: '16px',
                                border: '1px solid rgba(255, 107, 0, 0.2)',
                                transition: 'all 0.2s',
                            }}>
                                <label style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: '#FF6B00',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    display: 'block',
                                    marginBottom: '8px'
                                }}>Cost Sheet No.</label>
                                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FF6B00', fontFamily: 'monospace' }}>
                                    {costSheetNo || 'Auto-generated'}
                                </div>
                            </div>

                            {/* Cost Sheet Date */}
                            <div style={{
                                background: '#F8FAFC',
                                borderRadius: '12px',
                                padding: '16px',
                                border: '1px solid #E0E6ED',
                                transition: 'all 0.2s',
                            }}>
                                <label style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: '#718096',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    display: 'block',
                                    marginBottom: '8px'
                                }}>Cost Sheet Date</label>
                                {!isReadOnly ? (
                                    <input
                                        type="date"
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            background: 'white',
                                            border: '1px solid #E0E6ED',
                                            borderRadius: '8px',
                                            fontSize: '0.9rem',
                                            fontWeight: 600,
                                            color: '#1a1f36',
                                            outline: 'none'
                                        }}
                                        value={costSheetDate}
                                        onChange={e => setCostSheetDate(e.target.value)}
                                    />
                                ) : (
                                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#2D3748' }}>{costSheetDate || '—'}</div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* License Section */}
                    <section className="section-panel">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#FAFBFC', borderBottom: '1px solid #E0E6ED' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#FF6B00', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '4px', height: '20px', background: '#FF6B00', borderRadius: '2px' }}></span>
                                License
                            </h3>
                            {!isReadOnly && (
                                <button
                                    onClick={() => addItem('license')}
                                    style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        color: 'white',
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        background: '#FF6B00',
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    + Add Item
                                </button>
                            )}
                        </div>
                        <div style={{ overflowX: 'auto', padding: '16px' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', minWidth: '1000px' }}>
                                <TableHeader columns={['License Name', 'License Type', 'Rate', 'Qty', 'Period', 'Est. Cost', 'Est. Amount', 'Margin %', 'Est. Price']} />
                                <tbody>
                                    {licenseItems.map((item, idx) => {
                                        const cost = item.rate * item.qty;
                                        const marginAmount = cost * (item.margin_percentage / 100);
                                        const price = cost + marginAmount;
                                        return (
                                            <tr key={idx} style={{ background: '#FAFBFC', borderRadius: '8px' }}>
                                                <InputCell value={item.name} onChange={(v: string) => updateItem(idx, 'name', v, licenseItems, setLicenseItems)} />
                                                <InputCell value={item.type} onChange={(v: string) => updateItem(idx, 'type', v, licenseItems, setLicenseItems)} />
                                                <InputCell value={item.rate} onChange={(v: number) => updateItem(idx, 'rate', v, licenseItems, setLicenseItems)} type="number" />
                                                <InputCell value={item.qty} onChange={(v: number) => updateItem(idx, 'qty', v, licenseItems, setLicenseItems)} type="number" />
                                                <InputCell value={item.period} onChange={(v: string) => updateItem(idx, 'period', v, licenseItems, setLicenseItems)} />
                                                <ReadOnlyCell value={cost} />
                                                <ReadOnlyCell value={marginAmount} />
                                                <InputCell value={item.margin_percentage} onChange={(v: number) => updateItem(idx, 'margin_percentage', v, licenseItems, setLicenseItems)} type="number" />
                                                <ReadOnlyCell value={price} bold />
                                                {!isReadOnly && (
                                                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
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
                    <section className="section-panel">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#FAFBFC', borderBottom: '1px solid #E0E6ED' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0066CC', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '4px', height: '20px', background: '#0066CC', borderRadius: '2px' }}></span>
                                Services - Implementation
                            </h3>
                            {!isReadOnly && (
                                <button
                                    onClick={() => addItem('implementation')}
                                    style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        color: 'white',
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        background: '#FF6B00',
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    + Add Item
                                </button>
                            )}
                        </div>
                        <div style={{ overflowX: 'auto', padding: '16px' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', minWidth: '1000px' }}>
                                <TableHeader columns={['Resource Category', 'No. of Resources', 'No. of Days', 'Total Days', 'Rate/Day', 'Est. Cost', 'Est. Amount', 'Margin %', 'Est. Price']} />
                                <tbody>
                                    {implementationItems.map((item, idx) => {
                                        const totalDays = item.num_resources * item.num_days;
                                        const cost = totalDays * item.rate_per_day;
                                        const marginAmount = cost * (item.margin_percentage / 100);
                                        const price = cost + marginAmount;
                                        return (
                                            <tr key={idx} style={{ background: '#FAFBFC', borderRadius: '8px' }}>
                                                <InputCell value={item.category} onChange={(v: string) => updateItem(idx, 'category', v, implementationItems, setImplementationItems)} />
                                                <InputCell value={item.num_resources} onChange={(v: number) => updateItem(idx, 'num_resources', v, implementationItems, setImplementationItems)} type="number" />
                                                <InputCell value={item.num_days} onChange={(v: number) => updateItem(idx, 'num_days', v, implementationItems, setImplementationItems)} type="number" />
                                                <ReadOnlyCell value={totalDays} />
                                                <InputCell value={item.rate_per_day} onChange={(v: number) => updateItem(idx, 'rate_per_day', v, implementationItems, setImplementationItems)} type="number" />
                                                <ReadOnlyCell value={cost} />
                                                <ReadOnlyCell value={marginAmount} />
                                                <InputCell value={item.margin_percentage} onChange={(v: number) => updateItem(idx, 'margin_percentage', v, implementationItems, setImplementationItems)} type="number" />
                                                <ReadOnlyCell value={price} bold />
                                                {!isReadOnly && (
                                                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
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
                    <section className="section-panel">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#FAFBFC', borderBottom: '1px solid #E0E6ED' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#FF6B00', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '4px', height: '20px', background: '#FF6B00', borderRadius: '2px' }}></span>
                                Services - Support
                            </h3>
                            {!isReadOnly && (
                                <button
                                    onClick={() => addItem('support')}
                                    style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        color: 'white',
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        background: '#FF6B00',
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    + Add Item
                                </button>
                            )}
                        </div>
                        <div style={{ overflowX: 'auto', padding: '16px' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', minWidth: '1000px' }}>
                                <TableHeader columns={['Resource Category', 'No. of Resources', 'No. of Days', 'Total Days', 'Rate/Day', 'Est. Cost', 'Est. Amount', 'Margin %', 'Est. Price']} />
                                <tbody>
                                    {supportItems.map((item, idx) => {
                                        const totalDays = item.num_resources * item.num_days;
                                        const cost = totalDays * item.rate_per_day;
                                        const marginAmount = cost * (item.margin_percentage / 100);
                                        const price = cost + marginAmount;
                                        return (
                                            <tr key={idx} style={{ background: '#FAFBFC', borderRadius: '8px' }}>
                                                <InputCell value={item.category} onChange={(v: string) => updateItem(idx, 'category', v, supportItems, setSupportItems)} />
                                                <InputCell value={item.num_resources} onChange={(v: number) => updateItem(idx, 'num_resources', v, supportItems, setSupportItems)} type="number" />
                                                <InputCell value={item.num_days} onChange={(v: number) => updateItem(idx, 'num_days', v, supportItems, setSupportItems)} type="number" />
                                                <ReadOnlyCell value={totalDays} />
                                                <InputCell value={item.rate_per_day} onChange={(v: number) => updateItem(idx, 'rate_per_day', v, supportItems, setSupportItems)} type="number" />
                                                <ReadOnlyCell value={cost} />
                                                <ReadOnlyCell value={marginAmount} />
                                                <InputCell value={item.margin_percentage} onChange={(v: number) => updateItem(idx, 'margin_percentage', v, supportItems, setSupportItems)} type="number" />
                                                <ReadOnlyCell value={price} bold />
                                                {!isReadOnly && (
                                                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
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
                    <section className="section-panel">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#FAFBFC', borderBottom: '1px solid #E0E6ED' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0066CC', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '4px', height: '20px', background: '#0066CC', borderRadius: '2px' }}></span>
                                Infrastructure Cost
                            </h3>
                            {!isReadOnly && (
                                <button
                                    onClick={() => addItem('infra')}
                                    style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        color: 'white',
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        background: '#FF6B00',
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    + Add Item
                                </button>
                            )}
                        </div>
                        <div style={{ overflowX: 'auto', padding: '16px' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', minWidth: '900px' }}>
                                <TableHeader columns={['Infra Name', 'Qty', 'Months', 'Rate/Month', 'Est. Cost', 'Est. Amount', 'Margin %', 'Est. Price']} />
                                <tbody>
                                    {infraItems.map((item, idx) => {
                                        const cost = item.qty * item.months * item.rate_per_month;
                                        const marginAmount = cost * (item.margin_percentage / 100);
                                        const price = cost + marginAmount;
                                        return (
                                            <tr key={idx} style={{ background: '#FAFBFC', borderRadius: '8px' }}>
                                                <InputCell value={item.name} onChange={(v: string) => updateItem(idx, 'name', v, infraItems, setInfraItems)} />
                                                <InputCell value={item.qty} onChange={(v: number) => updateItem(idx, 'qty', v, infraItems, setInfraItems)} type="number" />
                                                <InputCell value={item.months} onChange={(v: number) => updateItem(idx, 'months', v, infraItems, setInfraItems)} type="number" />
                                                <InputCell value={item.rate_per_month} onChange={(v: number) => updateItem(idx, 'rate_per_month', v, infraItems, setInfraItems)} type="number" />
                                                <ReadOnlyCell value={cost} />
                                                <ReadOnlyCell value={marginAmount} />
                                                <InputCell value={item.margin_percentage} onChange={(v: number) => updateItem(idx, 'margin_percentage', v, infraItems, setInfraItems)} type="number" />
                                                <ReadOnlyCell value={price} bold />
                                                {!isReadOnly && (
                                                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
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
                    <section className="section-panel">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#FAFBFC', borderBottom: '1px solid #E0E6ED' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#FF6B00', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '4px', height: '20px', background: '#FF6B00', borderRadius: '2px' }}></span>
                                Other Category
                            </h3>
                            {!isReadOnly && (
                                <button
                                    onClick={() => addItem('other')}
                                    style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        color: 'white',
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        background: '#FF6B00',
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    + Add Item
                                </button>
                            )}
                        </div>
                        <div style={{ overflowX: 'auto', padding: '16px' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', minWidth: '700px' }}>
                                <TableHeader columns={['Description', 'Est. Cost', 'Est. Amount', 'Margin %', 'Est. Price']} />
                                <tbody>
                                    {otherItems.map((item, idx) => {
                                        const cost = item.estimated_cost;
                                        const marginAmount = cost * (item.margin_percentage / 100);
                                        const price = cost + marginAmount;
                                        return (
                                            <tr key={idx} style={{ background: '#FAFBFC', borderRadius: '8px' }}>
                                                <InputCell value={item.description} onChange={(v: string) => updateItem(idx, 'description', v, otherItems, setOtherItems)} />
                                                <InputCell value={item.estimated_cost} onChange={(v: number) => updateItem(idx, 'estimated_cost', v, otherItems, setOtherItems)} type="number" />
                                                <ReadOnlyCell value={marginAmount} />
                                                <InputCell value={item.margin_percentage} onChange={(v: number) => updateItem(idx, 'margin_percentage', v, otherItems, setOtherItems)} type="number" />
                                                <ReadOnlyCell value={price} bold />
                                                {!isReadOnly && (
                                                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
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

                    {/* Document Attachments Section */}
                    <section className="section-panel" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                            <Paperclip size={18} style={{ color: '#0066CC' }} />
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0066CC' }}>Attachments (Optional)</h3>
                        </div>

                        {/* Drag Drop Upload Zone */}
                        {!isReadOnly && (
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragHover(true); }}
                                onDragLeave={() => setIsDragHover(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDragHover(false);
                                    if (e.dataTransfer.files.length > 0) {
                                        const event = { target: { files: e.dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>;
                                        handleFileUpload(event);
                                    }
                                }}
                                onClick={() => document.getElementById('file-upload-input')?.click()}
                                style={{
                                    border: `2px dashed ${attachments.length > 0 ? '#00C853' : isDragHover ? '#FF6B00' : '#E0E6ED'}`,
                                    borderRadius: '16px',
                                    padding: '40px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    background: attachments.length > 0 ? 'rgba(0, 200, 83, 0.05)' : isDragHover ? 'rgba(255, 107, 0, 0.05)' : 'white',
                                    marginBottom: attachments.length > 0 ? '20px' : '0'
                                }}
                            >
                                <input
                                    id="file-upload-input"
                                    type="file"
                                    onChange={handleFileUpload}
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                                    disabled={uploading}
                                    style={{ display: 'none' }}
                                />
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '50%',
                                    background: attachments.length > 0 ? 'rgba(0, 200, 83, 0.1)' : 'rgba(255, 107, 0, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 16px'
                                }}>
                                    {attachments.length > 0 ? (
                                        <CheckCircle size={32} style={{ color: '#00C853' }} />
                                    ) : (
                                        <Upload size={32} style={{ color: '#FF6B00' }} />
                                    )}
                                </div>
                                <p style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1f36', margin: '0 0 8px 0' }}>
                                    {attachments.length > 0 ? 'Files Attached' : 'Click to upload or drag and drop'}
                                </p>
                                <p style={{ fontSize: '0.85rem', color: '#718096', margin: 0 }}>
                                    {attachments.length > 0
                                        ? `${attachments.length} file(s) ready for analysis`
                                        : 'Images, PDFs, Documents, Spreadsheets (max 10MB each)'
                                    }
                                </p>
                                {uploading && (
                                    <p style={{ fontSize: '0.85rem', color: '#FF6B00', marginTop: '12px', fontWeight: 600 }}>
                                        Uploading...
                                    </p>
                                )}
                            </div>
                        )}

                        {/* File List */}
                        {attachments.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {attachments.map((att) => (
                                    <div
                                        key={att.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '12px 16px',
                                            background: '#FAFBFC',
                                            borderRadius: '12px',
                                            border: '1px solid #E0E6ED',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '8px',
                                                background: 'rgba(255, 107, 0, 0.1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                <File size={20} style={{ color: '#FF6B00' }} />
                                            </div>
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <p style={{
                                                    fontSize: '0.9rem',
                                                    fontWeight: 600,
                                                    color: '#0066CC',
                                                    margin: 0,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {att.filename}
                                                </p>
                                                <p style={{ fontSize: '0.75rem', color: '#718096', margin: 0 }}>
                                                    Document
                                                </p>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button
                                                onClick={() => setPreviewFile(att)}
                                                style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '50%',
                                                    border: '1px solid #E0E6ED',
                                                    background: 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    color: '#718096',
                                                    transition: 'all 0.2s'
                                                }}
                                                title="Preview"
                                            >
                                                <EyeIcon size={16} />
                                            </button>
                                            {!isReadOnly && (
                                                <button
                                                    onClick={() => handleDeleteAttachment(att.id)}
                                                    style={{
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '50%',
                                                        border: '1px solid #E0E6ED',
                                                        background: 'white',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        color: '#718096',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    title="Remove"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Read-only state with no files */}
                        {isReadOnly && attachments.length === 0 && (
                            <div style={{
                                border: '2px dashed #E0E6ED',
                                borderRadius: '16px',
                                padding: '40px',
                                textAlign: 'center',
                                background: '#FAFBFC'
                            }}>
                                <p style={{ fontSize: '0.9rem', color: '#718096', margin: 0 }}>No documents attached.</p>
                            </div>
                        )}
                    </section>

                    {/* Preview Modal */}
                    {previewFile && (
                        <div
                            style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'rgba(0, 0, 0, 0.8)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 9999,
                                animation: 'fadeIn 0.3s ease'
                            }}
                            onClick={() => setPreviewFile(null)}
                        >
                            <div
                                style={{
                                    background: 'var(--ae-navy)',
                                    borderRadius: '16px',
                                    padding: '24px',
                                    maxWidth: '90vw',
                                    maxHeight: '90vh',
                                    overflow: 'auto',
                                    position: 'relative',
                                    animation: 'slideUp 0.3s ease'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '12px',
                                            background: 'rgba(255, 107, 0, 0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <File size={24} style={{ color: '#FF6B00' }} />
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '1rem', fontWeight: 700, color: 'white', margin: 0 }}>
                                                {previewFile.filename}
                                            </p>
                                            <p style={{ fontSize: '0.75rem', color: '#FF6B00', margin: 0 }}>DOCUMENT PREVIEW</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setPreviewFile(null)}
                                        style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            border: 'none',
                                            background: 'rgba(255, 255, 255, 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            color: 'white',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <div style={{
                                    background: '#1a1f36',
                                    borderRadius: '12px',
                                    padding: '20px',
                                    minWidth: '600px',
                                    minHeight: '400px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {previewFile.filename.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                        <img
                                            src={previewFile.file.startsWith('http') ? previewFile.file : `http://localhost:8000${previewFile.file}`}
                                            alt={previewFile.filename}
                                            style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '8px' }}
                                        />
                                    ) : (
                                        <div style={{ textAlign: 'center' }}>
                                            <File size={64} style={{ color: '#718096', marginBottom: '16px' }} />
                                            <p style={{ color: '#718096', marginBottom: '16px' }}>Preview not available for this file type</p>
                                            <a
                                                href={previewFile.file.startsWith('http') ? previewFile.file : `http://localhost:8000${previewFile.file}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '12px 24px',
                                                    background: '#FF6B00',
                                                    color: 'white',
                                                    borderRadius: '8px',
                                                    textDecoration: 'none',
                                                    fontWeight: 700,
                                                    fontSize: '0.9rem'
                                                }}
                                            >
                                                <Download size={16} /> Download File
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="glass-card bg-[#FAFBFC]">
                        <h3 className="text-xl font-bold mb-8 text-[#1a1f36]">Cost Summary Breakdown</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <div className="p-8 bg-white rounded-2xl shadow-sm border border-[#E2E8F0]">
                                <label className="text-xs uppercase font-extrabold tracking-widest text-[#718096] mb-4 block">Total Estimated Cost</label>
                                <p className="text-3xl font-extrabold text-[#1a1f36] tracking-tight">${totals.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                <div className="mt-4 h-1 w-12 bg-[#0066CC] rounded-full"></div>
                            </div>

                            <div className="p-8 bg-white rounded-2xl shadow-sm border border-[#E2E8F0]">
                                <label className="text-xs uppercase font-extrabold tracking-widest text-[#FF6B00] mb-4 block">Total Estimated Amount</label>
                                <p className="text-3xl font-extrabold text-[#FF6B00] tracking-tight">${totals.totalMarginAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                <div className="mt-4 h-1 w-12 bg-[#FF6B00] rounded-full"></div>
                            </div>

                            <div className="p-8 bg-white rounded-2xl shadow-sm border border-[#E2E8F0]">
                                <label className="text-xs uppercase font-extrabold tracking-widest text-[#00C853] mb-4 block">Total Estimated Margin %</label>
                                <p className="text-3xl font-extrabold text-[#00C853] tracking-tight">{totals.totalMarginPercent.toFixed(1)}%</p>
                                <div className="mt-4 h-1 w-12 bg-[#00C853] rounded-full"></div>
                            </div>

                            <div className="p-8 bg-white rounded-2xl shadow-sm border border-[#0066CC]/20 bg-gradient-to-br from-white to-[#0066CC]/5">
                                <label className="text-xs uppercase font-extrabold tracking-widest text-[#0066CC] mb-4 block">Total Estimated Price</label>
                                <p className="text-3xl font-extrabold text-[#0066CC] tracking-tight">${totals.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                <div className="mt-4 h-1 w-full bg-[#0066CC]/20 rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer Breakdown - Only show on form tab */}
            {activeTab === 'form' && (
                <div className="fixed bottom-0 left-[280px] right-0 bg-white border-t border-[#E0E6ED] py-8 px-12 shadow-[0_-8px_24px_rgba(0,0,0,0.05)] z-[50]">
                    <div className="max-w-[1400px] mx-auto flex justify-end items-center">
                        <div className="flex gap-4">
                            {status === 'PENDING' && (
                                <>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <button
                                            onClick={() => handleSave('PENDING')}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                background: 'white',
                                                color: '#FF6B00',
                                                border: '2px solid #FF6B00',
                                                padding: '14px 28px',
                                                borderRadius: '8px',
                                                fontWeight: 700,
                                                fontSize: '0.95rem',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = '#FF6B00';
                                                e.currentTarget.style.color = 'white';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'white';
                                                e.currentTarget.style.color = '#FF6B00';
                                            }}
                                        >
                                            <Save size={20} /> Save as Draft
                                        </button>
                                        <button
                                            onClick={() => handleSave('SUBMITTED')}
                                            style={{
                                                background: '#FF6B00',
                                                color: 'white',
                                                border: 'none',
                                                padding: '14px 36px',
                                                borderRadius: '8px',
                                                fontWeight: 700,
                                                fontSize: '0.95rem',
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 12px rgba(255, 107, 0, 0.3)',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = '#e65a00';
                                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 107, 0, 0.4)';
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = '#FF6B00';
                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 0, 0.3)';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                            }}
                                        >
                                            Submit for Approval
                                        </button>
                                    </div>
                                </>
                            )}

                            {status === 'SUBMITTED' && (
                                <div className="flex gap-4">
                                    <button onClick={() => setShowRejectModal(true)} className="bg-[#FCCCCC] text-[#EF4444] border border-[#EF4444]/20 px-10 py-4 rounded-md font-bold hover:bg-[#EF4444] hover:text-white">
                                        Reject
                                    </button>
                                    <button onClick={handleApprove} className="bg-[#00C853] text-white border-none px-10 py-4 rounded-md font-bold hover:bg-[#00A040]">
                                        Approve
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Alert Modal */}
            {customAlert && (
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
            )}

            {/* Reject Modal */}
            {showRejectModal && (
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
            )}
        </div>
    );
};

export default CostSheetForm;