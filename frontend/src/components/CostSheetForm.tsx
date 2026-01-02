import React, { useState, useEffect } from 'react';
import { Trash2, Search, Save, CheckCircle, XCircle, Clock, ArrowLeft, Upload, File, Eye as EyeIcon } from 'lucide-react';
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
    const [leadNo, setLeadNo] = useState('');
    const [lead, setLead] = useState<Lead | null>(null);
    const [selectedCustomerName, setSelectedCustomerName] = useState('');
    const [leads, setLeads] = useState<Lead[]>([]);
    const [costSheetNo, setCostSheetNo] = useState('');
    const [costSheetDate, setCostSheetDate] = useState(new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState('PENDING');
    const [approvalComments, setApprovalComments] = useState('');
    const [rejectComment, setRejectComment] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [uploading, setUploading] = useState(false);

    // Category States
    const [licenseItems, setLicenseItems] = useState<any[]>([{ name: '', type: '', rate: 0, qty: 1, period: '', margin_percentage: 0 }]);
    const [implementationItems, setImplementationItems] = useState<any[]>([{ category: '', num_resources: 1, num_days: 1, rate_per_day: 0, margin_percentage: 0 }]);
    const [supportItems, setSupportItems] = useState<any[]>([{ category: '', num_resources: 1, num_days: 1, rate_per_day: 0, margin_percentage: 0 }]);
    const [infraItems, setInfraItems] = useState<any[]>([{ name: '', qty: 1, months: 1, rate_per_month: 0, margin_percentage: 0 }]);
    const [otherItems, setOtherItems] = useState<any[]>([{ description: '', estimated_cost: 0, margin_percentage: 0 }]);
    const [activeTab, setActiveTab] = useState<'form' | 'summary'>('form');

    const isReadOnly = status !== 'PENDING';

    useEffect(() => {
        if (id) {
            const fetchDetails = async () => {
                try {
                    const response = await api.get(`/cost-sheets/${id}/`);
                    const data = response.data;
                    setCostSheetNo(data.cost_sheet_no);
                    setCostSheetDate(data.cost_sheet_date);
                    setStatus(data.status);
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
            return;
        }

        // Find if there's only one lead for this customer
        const customerLeads = leads.filter(l => l.customer_name === customerName);
        if (customerLeads.length === 1) {
            setLead(customerLeads[0]);
            setLeadNo(customerLeads[0].lead_no);
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
        } else {
            setLead(null);
            setLeadNo('');
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

        let activeId = id;

        // If no ID yet, auto-save as draft first
        if (!activeId) {
            if (!lead) return alert('Please select a lead first by searching for a Lead No. before attaching documents.');
            if (!costSheetNo) return alert('Please enter a Cost Sheet Number before attaching documents.');

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
            alert('Failed to upload file');
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
            alert('Failed to delete attachment');
        }
    };

    const handleSave = async (newStatus: string = 'PENDING', isAutoDraft: boolean = false) => {
        if (!lead) return alert('Please select a lead first by searching for a Lead No.');
        if (!costSheetNo) return alert('Please enter a Cost Sheet Number before saving.');

        const cleanItems = (items: any[]) => items.map(({ id, cost_sheet, estimated_cost, estimated_margin_amount, estimated_price, total_days, ...rest }) => rest);

        const payload = {
            cost_sheet_no: costSheetNo,
            cost_sheet_date: costSheetDate,
            lead: lead.id,
            status: newStatus,
            license_items: cleanItems(licenseItems),
            implementation_items: cleanItems(implementationItems),
            support_items: cleanItems(supportItems),
            infra_items: cleanItems(infraItems),
            other_items: cleanItems(otherItems),
        };

        try {
            let response;
            if (id) {
                response = await api.put(`/cost-sheets/${id}/`, payload);
            } else {
                response = await api.post('/cost-sheets/', payload);
            }

            if (!isAutoDraft) {
                alert(newStatus === 'PENDING' ? 'Cost Sheet saved as Draft.' : 'Cost Sheet submitted for approval!');
                if (onBack) onBack();
            }
            return response.data;
        } catch (error: any) {
            console.error('Error saving cost sheet', error.response?.data);
            const errorMsg = error.response?.data
                ? JSON.stringify(error.response.data, null, 2)
                : 'Failed to save cost sheet. Please check your inputs.';
            alert(`Error: ${errorMsg}`);
            return null;
        }
    };

    const handleApprove = async () => {
        try {
            await api.post(`/cost-sheets/${id}/approve/`);
            alert('Cost Sheet Approved!');
            if (onBack) onBack();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to approve');
        }
    };

    const handleReject = async () => {
        if (!rejectComment) return alert('Please provide rejection comments');
        try {
            await api.post(`/cost-sheets/${id}/reject/`, { comments: rejectComment });
            alert('Cost Sheet Rejected');
            if (onBack) onBack();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to reject');
        }
    };

    const TableHeader = ({ columns }: { columns: string[] }) => (
        <thead>
            <tr className="text-[#718096] text-[10px] uppercase font-bold tracking-widest border-b border-[#E0E6ED]">
                {columns.map((col, i) => <th key={i} className="py-4 px-3 text-left">{col}</th>)}
                {!isReadOnly && <th className="py-4 px-3"></th>}
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
        <td className="py-4 px-2">
            <input
                className="bg-transparent border-none p-0 text-sm font-medium focus:ring-0 w-full text-[#2D3748]"
                type={type}
                value={value}
                readOnly={isReadOnly}
                onChange={e => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
            />
        </td>
    );

    const ReadOnlyCell = ({ value, bold = false }: any) => (
        <td className={`py-4 px-2 text-[#718096] font-mono text-xs ${bold ? 'font-extrabold text-sm text-[#2D3748]' : 'font-bold'}`}>
            {typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: 2 }) : value}
        </td>
    );

    return (
        <div className="space-y-8 pb-60">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-[#F5F7FA] rounded-full text-[#718096] transition-colors"><ArrowLeft size={20} /></button>
                    <h2 className="text-3xl font-extrabold text-[#1a1f36] m-0">Cost Sheet {id ? `#${id}` : 'Creation'}</h2>
                </div>
                {getStatusDisplay()}
            </div>

            {/* Tabs */}
            <div className="flex gap-8 border-b border-[#E2E8F0] mb-8">
                <button
                    onClick={() => setActiveTab('form')}
                    className={`pb-4 px-2 text-sm font-bold transition-all border-b-2 ${activeTab === 'form' ? 'border-[#0066CC] text-[#0066CC]' : 'border-transparent text-[#718096] hover:text-[#2D3748]'}`}
                >
                    Cost Sheet
                </button>
                <button
                    onClick={() => setActiveTab('summary')}
                    className={`pb-4 px-2 text-sm font-bold transition-all border-b-2 ${activeTab === 'summary' ? 'border-[#0066CC] text-[#0066CC]' : 'border-transparent text-[#718096] hover:text-[#2D3748]'}`}
                >
                    Cost Summary
                </button>
            </div>

            {activeTab === 'form' ? (
                <div className="space-y-8">
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
                    <section className={`glass-card grid grid-cols-3 gap-8 ${isReadOnly ? 'opacity-70 pointer-events-none grayscale-[0.3]' : ''}`}>
                        <div className="form-group">
                            <label>Customer Name</label>
                            {!isReadOnly ? (
                                <select
                                    className="w-full p-3 bg-white border border-[#E0E6ED] rounded-lg font-semibold text-[#1a1f36] focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] outline-none transition-all cursor-pointer"
                                    value={selectedCustomerName}
                                    onChange={e => handleCustomerChange(e.target.value)}
                                >
                                    <option value="">Select Customer</option>
                                    {uniqueCustomers.map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            ) : (
                                <input value={lead?.customer_name || ''} readOnly className="bg-[#FAFBFC] font-semibold text-[#4A5568]" />
                            )}
                        </div>
                        <div className="form-group">
                            <label>Lead No.</label>
                            <div className="flex gap-2">
                                {!isReadOnly ? (
                                    <select
                                        className="w-full p-3 bg-white border border-[#E0E6ED] rounded-lg font-semibold text-[#1a1f36] focus:border-[#0066CC] focus:ring-1 focus:ring-[#0066CC] outline-none transition-all cursor-pointer"
                                        value={lead?.id || ''}
                                        onChange={e => handleLeadChange(e.target.value)}
                                    >
                                        <option value="">Select Lead No.</option>
                                        {(selectedCustomerName ? leads.filter(l => l.customer_name === selectedCustomerName) : leads).map(l => (
                                            <option key={l.id} value={l.id}>{l.lead_no}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input value={leadNo} readOnly className="bg-[#FAFBFC] font-semibold text-[#4A5568]" />
                                )}
                                {!isReadOnly && !lead && (
                                    <button onClick={fetchLeadByNo} className="btn-primary !bg-[#0066CC] !p-3 !shadow-none hover:!bg-[#0052CC]">
                                        <Search size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Project Name</label>
                            <input value={lead?.project_name || ''} readOnly className="bg-[#FAFBFC] font-semibold text-[#4A5568]" />
                        </div>
                        <div className="form-group">
                            <label>Project Manager</label>
                            <input value={lead?.project_manager || ''} readOnly className="bg-[#FAFBFC] font-semibold text-[#4A5568]" />
                        </div>
                        <div className="form-group">
                            <label>Sales Person</label>
                            <input value={lead?.sales_person || ''} readOnly className="bg-[#FAFBFC] font-semibold text-[#4A5568]" />
                        </div>
                        <div className="form-group">
                            <label>Cost Sheet No.</label>
                            <input value={costSheetNo} onChange={e => setCostSheetNo(e.target.value)} placeholder="Enter CS Number" readOnly={isReadOnly} />
                        </div>
                        <div className="form-group">
                            <label>Cost Sheet Date</label>
                            <input type="date" value={costSheetDate} onChange={e => setCostSheetDate(e.target.value)} readOnly={isReadOnly} />
                        </div>
                    </section>

                    {/* License Section */}
                    <section className="glass-card !p-0 overflow-hidden">
                        <div className="flex justify-between items-center p-6 bg-[#FAFBFC] border-b border-[#E0E6ED]">
                            <h3 className="text-lg font-bold m-0 text-[#0066CC]">License</h3>
                            {!isReadOnly && (
                                <button onClick={() => addItem('license')} className="text-xs font-bold text-white px-4 py-2 rounded bg-[#0066CC] hover:bg-[#0052CC] transition-colors">
                                    + Add Item
                                </button>
                            )}
                        </div>
                        <div className="overflow-x-auto p-4">
                            <table className="w-full text-left min-w-[1000px]">
                                <TableHeader columns={['License Name', 'License Type', 'Rate', 'Qty', 'Period', 'Estimated Cost', 'Estimated Amount', 'Estimated Margin %', 'Estimated Price']} />
                                <tbody>
                                    {licenseItems.map((item, idx) => {
                                        const cost = item.rate * item.qty;
                                        const marginAmount = cost * (item.margin_percentage / 100);
                                        const price = cost + marginAmount;
                                        return (
                                            <tr key={idx} className="border-b border-[#E0E6ED] last:border-0 hover:bg-[#F5F7FA]">
                                                <InputCell value={item.name} onChange={(v: string) => updateItem(idx, 'name', v, licenseItems, setLicenseItems)} />
                                                <InputCell value={item.type} onChange={(v: string) => updateItem(idx, 'type', v, licenseItems, setLicenseItems)} />
                                                <InputCell value={item.rate} onChange={(v: number) => updateItem(idx, 'rate', v, licenseItems, setLicenseItems)} type="number" />
                                                <InputCell value={item.qty} onChange={(v: number) => updateItem(idx, 'qty', v, licenseItems, setLicenseItems)} type="number" />
                                                <InputCell value={item.period} onChange={(v: string) => updateItem(idx, 'period', v, licenseItems, setLicenseItems)} />
                                                <ReadOnlyCell value={cost} />
                                                <ReadOnlyCell value={marginAmount} />
                                                <InputCell value={item.margin_percentage} onChange={(v: number) => updateItem(idx, 'margin_percentage', v, licenseItems, setLicenseItems)} type="number" />
                                                <ReadOnlyCell value={price} bold />
                                                {!isReadOnly && <td className="py-4 px-2 text-right"><button onClick={() => setLicenseItems(licenseItems.filter((_, i) => i !== idx))} className="text-[#EF4444]/40 hover:text-[#EF4444] p-1"><Trash2 size={16} /></button></td>}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Implementation Section */}
                    <section className="glass-card !p-0 overflow-hidden">
                        <div className="flex justify-between items-center p-6 bg-[#FAFBFC] border-b border-[#E0E6ED]">
                            <h3 className="text-lg font-bold m-0 text-[#00C853]">Services - Impelmentation</h3>
                            {!isReadOnly && (
                                <button onClick={() => addItem('implementation')} className="text-xs font-bold text-white px-4 py-2 rounded bg-[#0066CC] hover:bg-[#0052CC] transition-colors">
                                    + Add Item
                                </button>
                            )}
                        </div>
                        <div className="overflow-x-auto p-4">
                            <table className="w-full text-left min-w-[1000px]">
                                <TableHeader columns={['Resource categorises', 'No. of resoruces', 'No. of days', 'Total days', 'Rate per days', 'Estimated Cost', 'Estimated Amount', 'Estimated Margin %', 'Estimated Price']} />
                                <tbody>
                                    {implementationItems.map((item, idx) => {
                                        const totalDays = item.num_resources * item.num_days;
                                        const cost = totalDays * item.rate_per_day;
                                        const marginAmount = cost * (item.margin_percentage / 100);
                                        const price = cost + marginAmount;
                                        return (
                                            <tr key={idx} className="border-b border-[#E0E6ED] last:border-0 hover:bg-[#F5F7FA]">
                                                <InputCell value={item.category} onChange={(v: string) => updateItem(idx, 'category', v, implementationItems, setImplementationItems)} />
                                                <InputCell value={item.num_resources} onChange={(v: number) => updateItem(idx, 'num_resources', v, implementationItems, setImplementationItems)} type="number" />
                                                <InputCell value={item.num_days} onChange={(v: number) => updateItem(idx, 'num_days', v, implementationItems, setImplementationItems)} type="number" />
                                                <ReadOnlyCell value={totalDays} />
                                                <InputCell value={item.rate_per_day} onChange={(v: number) => updateItem(idx, 'rate_per_day', v, implementationItems, setImplementationItems)} type="number" />
                                                <ReadOnlyCell value={cost} />
                                                <ReadOnlyCell value={marginAmount} />
                                                <InputCell value={item.margin_percentage} onChange={(v: number) => updateItem(idx, 'margin_percentage', v, implementationItems, setImplementationItems)} type="number" />
                                                <ReadOnlyCell value={price} bold />
                                                {!isReadOnly && <td className="py-4 px-2 text-right"><button onClick={() => setImplementationItems(implementationItems.filter((_, i) => i !== idx))} className="text-[#EF4444]/40 hover:text-[#EF4444] p-1"><Trash2 size={16} /></button></td>}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Support Section */}
                    <section className="glass-card !p-0 overflow-hidden">
                        <div className="flex justify-between items-center p-6 bg-[#FAFBFC] border-b border-[#E0E6ED]">
                            <h3 className="text-lg font-bold m-0 text-[#FF6B00]">Services - Support</h3>
                            {!isReadOnly && (
                                <button onClick={() => addItem('support')} className="text-xs font-bold text-white px-4 py-2 rounded bg-[#0066CC] hover:bg-[#0052CC] transition-colors">
                                    + Add Item
                                </button>
                            )}
                        </div>
                        <div className="overflow-x-auto p-4">
                            <table className="w-full text-left min-w-[1000px]">
                                <TableHeader columns={['Resource categorises', 'No. of resoruces', 'No. of days', 'Total days', 'Rate per days', 'Estimated Cost', 'Estimated Amount', 'Estimated Margin %', 'Estimated Price']} />
                                <tbody>
                                    {supportItems.map((item, idx) => {
                                        const totalDays = item.num_resources * item.num_days;
                                        const cost = totalDays * item.rate_per_day;
                                        const marginAmount = cost * (item.margin_percentage / 100);
                                        const price = cost + marginAmount;
                                        return (
                                            <tr key={idx} className="border-b border-[#E0E6ED] last:border-0 hover:bg-[#F5F7FA]">
                                                <InputCell value={item.category} onChange={(v: string) => updateItem(idx, 'category', v, supportItems, setSupportItems)} />
                                                <InputCell value={item.num_resources} onChange={(v: number) => updateItem(idx, 'num_resources', v, supportItems, setSupportItems)} type="number" />
                                                <InputCell value={item.num_days} onChange={(v: number) => updateItem(idx, 'num_days', v, supportItems, setSupportItems)} type="number" />
                                                <ReadOnlyCell value={totalDays} />
                                                <InputCell value={item.rate_per_day} onChange={(v: number) => updateItem(idx, 'rate_per_day', v, supportItems, setSupportItems)} type="number" />
                                                <ReadOnlyCell value={cost} />
                                                <ReadOnlyCell value={marginAmount} />
                                                <InputCell value={item.margin_percentage} onChange={(v: number) => updateItem(idx, 'margin_percentage', v, supportItems, setSupportItems)} type="number" />
                                                <ReadOnlyCell value={price} bold />
                                                {!isReadOnly && <td className="py-4 px-2 text-right"><button onClick={() => setSupportItems(supportItems.filter((_, i) => i !== idx))} className="text-[#EF4444]/40 hover:text-[#EF4444] p-1"><Trash2 size={16} /></button></td>}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Infrastructure Section */}
                    <section className="glass-card !p-0 overflow-hidden">
                        <div className="flex justify-between items-center p-6 bg-[#FAFBFC] border-b border-[#E0E6ED]">
                            <h3 className="text-lg font-bold m-0 text-[#2D3748]">Infrastructure cost</h3>
                            {!isReadOnly && (
                                <button onClick={() => addItem('infra')} className="text-xs font-bold text-white px-4 py-2 rounded bg-[#0066CC] hover:bg-[#0052CC] transition-colors">
                                    + Add Item
                                </button>
                            )}
                        </div>
                        <div className="overflow-x-auto p-4">
                            <table className="w-full text-left min-w-[1000px]">
                                <TableHeader columns={['Infra Name', 'Qty', 'Moths', 'Rate / Mths', 'Estimated Cost', 'Estimated Amount', 'Estimated Margin %', 'Estimated Price']} />
                                <tbody>
                                    {infraItems.map((item, idx) => {
                                        const cost = item.qty * item.months * item.rate_per_month;
                                        const marginAmount = cost * (item.margin_percentage / 100);
                                        const price = cost + marginAmount;
                                        return (
                                            <tr key={idx} className="border-b border-[#E0E6ED] last:border-0 hover:bg-[#F5F7FA]">
                                                <InputCell value={item.name} onChange={(v: string) => updateItem(idx, 'name', v, infraItems, setInfraItems)} />
                                                <InputCell value={item.qty} onChange={(v: number) => updateItem(idx, 'qty', v, infraItems, setInfraItems)} type="number" />
                                                <InputCell value={item.months} onChange={(v: number) => updateItem(idx, 'months', v, infraItems, setInfraItems)} type="number" />
                                                <InputCell value={item.rate_per_month} onChange={(v: number) => updateItem(idx, 'rate_per_month', v, infraItems, setInfraItems)} type="number" />
                                                <ReadOnlyCell value={cost} />
                                                <ReadOnlyCell value={marginAmount} />
                                                <InputCell value={item.margin_percentage} onChange={(v: number) => updateItem(idx, 'margin_percentage', v, infraItems, setInfraItems)} type="number" />
                                                <ReadOnlyCell value={price} bold />
                                                {!isReadOnly && <td className="py-4 px-2 text-right"><button onClick={() => setInfraItems(infraItems.filter((_, i) => i !== idx))} className="text-[#EF4444]/40 hover:text-[#EF4444] p-1"><Trash2 size={16} /></button></td>}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Other Category Section */}
                    <section className="glass-card !p-0 overflow-hidden">
                        <div className="flex justify-between items-center p-6 bg-[#FAFBFC] border-b border-[#E0E6ED]">
                            <h3 className="text-lg font-bold m-0 text-[#6B46C1]">Other Category</h3>
                            {!isReadOnly && (
                                <button onClick={() => addItem('other')} className="text-xs font-bold text-white px-4 py-2 rounded bg-[#0066CC] hover:bg-[#0052CC] transition-colors">
                                    + Add Item
                                </button>
                            )}
                        </div>
                        <div className="overflow-x-auto p-4">
                            <table className="w-full text-left min-w-[1000px]">
                                <TableHeader columns={['Description', 'Estimated Cost', 'Estimated Amount', 'Estimated Margin %', 'Estimated Price']} />
                                <tbody>
                                    {otherItems.map((item, idx) => {
                                        const cost = item.estimated_cost;
                                        const marginAmount = cost * (item.margin_percentage / 100);
                                        const price = cost + marginAmount;
                                        return (
                                            <tr key={idx} className="border-b border-[#E0E6ED] last:border-0 hover:bg-[#F5F7FA]">
                                                <InputCell value={item.description} onChange={(v: string) => updateItem(idx, 'description', v, otherItems, setOtherItems)} />
                                                <InputCell value={item.estimated_cost} onChange={(v: number) => updateItem(idx, 'estimated_cost', v, otherItems, setOtherItems)} type="number" />
                                                <ReadOnlyCell value={marginAmount} />
                                                <InputCell value={item.margin_percentage} onChange={(v: number) => updateItem(idx, 'margin_percentage', v, otherItems, setOtherItems)} type="number" />
                                                <ReadOnlyCell value={price} bold />
                                                {!isReadOnly && <td className="py-4 px-2 text-right"><button onClick={() => setOtherItems(otherItems.filter((_, i) => i !== idx))} className="text-[#EF4444]/40 hover:text-[#EF4444] p-1"><Trash2 size={16} /></button></td>}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Document Attachments Section */}
                    <section className="glass-card">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold m-0 text-[#1a1f36]">Document Attachments</h3>
                            {!isReadOnly && (
                                <div className="flex items-center gap-4">
                                    <input
                                        type="file"
                                        onChange={handleFileUpload}
                                        className="block w-full text-sm text-[#718096]
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-full file:border-0
                                    file:text-sm file:font-bold
                                    file:bg-[#004A99]/10 file:text-[#004A99]
                                    hover:file:bg-[#004A99]/20
                                    cursor-pointer"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx"
                                        disabled={uploading}
                                    />
                                    {uploading && <span className="text-xs font-bold text-[#004A99] animate-pulse">Uploading...</span>}
                                </div>
                            )}
                        </div>

                        {attachments.length === 0 && (
                            <div className="bg-[#F5F7FA] rounded-xl p-8 text-center border-2 border-dashed border-[#E0E6ED]">
                                <p className="text-[#718096] font-medium">No documents attached yet.</p>
                            </div>
                        )}

                        {attachments.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {attachments.map((att) => (
                                    <div key={att.id} className="group relative bg-[#F8FAFC] border border-[#E0E6ED] rounded-xl p-4 transition-all hover:shadow-lg hover:border-[#0066CC]">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 bg-[#0066CC]/10 rounded-lg flex items-center justify-center text-[#0066CC]">
                                                <File size={24} />
                                            </div>
                                            <p className="text-xs font-bold text-[#1a1f36] text-center line-clamp-2">{att.filename}</p>
                                            <div className="flex gap-2">
                                                <a
                                                    href={att.file.startsWith('http') ? att.file : `http://localhost:8000${att.file}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-white text-[#0066CC] rounded-lg border border-[#E0E6ED] hover:bg-[#0066CC] hover:text-white transition-all shadow-sm text-xs font-bold"
                                                    title="Preview/Open"
                                                >
                                                    <EyeIcon size={14} /> Preview
                                                </a>
                                                {!isReadOnly && (
                                                    <button
                                                        onClick={() => handleDeleteAttachment(att.id)}
                                                        className="p-1.5 bg-white text-[#EF4444] rounded-lg border border-[#E0E6ED] hover:bg-[#EF4444] hover:text-white transition-all shadow-sm"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

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
                                    <button onClick={() => handleSave('PENDING')} className="bg-[#FFFFFF] text-[#FF6B00] border-2 border-[#FF6B00] px-10 py-4 rounded-md font-bold hover:bg-[#FF6B00] hover:text-white transition-all shadow-md active:scale-95 flex items-center gap-2">
                                        <Save size={20} /> Save as Draft
                                    </button>
                                    <button onClick={() => handleSave('SUBMITTED')} className="bg-[#0066CC] text-white border-none px-10 py-4 rounded-md font-bold hover:bg-[#0052CC] transition-all shadow-xl shadow-[#0066CC]/20 active:scale-95">
                                        Submit for Approval
                                    </button>
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
