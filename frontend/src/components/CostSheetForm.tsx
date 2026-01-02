import React, { useState, useEffect } from 'react';
import { Trash2, Search, Save, CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react';
import api from '../api';

interface Lead {
    id: number;
    lead_no: string;
    customer_name: string;
    project_name: string;
}

interface Props {
    id?: number | null;
    onBack?: () => void;
}

const CostSheetForm: React.FC<Props> = ({ id, onBack }) => {
    const [leadNo, setLeadNo] = useState('');
    const [lead, setLead] = useState<Lead | null>(null);
    const [costSheetNo, setCostSheetNo] = useState('');
    const [costSheetDate, setCostSheetDate] = useState(new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState('PENDING');
    const [approvalComments, setApprovalComments] = useState('');
    const [rejectComment, setRejectComment] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);

    // Category States
    const [licenseItems, setLicenseItems] = useState<any[]>([{ name: '', type: '', rate: 0, qty: 1, period: '', margin_percentage: 0 }]);
    const [implementationItems, setImplementationItems] = useState<any[]>([{ category: '', num_resources: 1, num_days: 1, rate_per_day: 0, margin_percentage: 0 }]);
    const [supportItems, setSupportItems] = useState<any[]>([{ category: '', num_resources: 1, num_days: 1, rate_per_day: 0, margin_percentage: 0 }]);
    const [infraItems, setInfraItems] = useState<any[]>([{ name: '', qty: 1, months: 1, rate_per_month: 0, margin_percentage: 0 }]);

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

                    if (data.lead_details) {
                        setLead(data.lead_details);
                        setLeadNo(data.lead_details.lead_no);
                    }
                } catch (error) {
                    console.error('Error fetching cost sheet details', error);
                }
            };
            fetchDetails();
        }
    }, [id]);

    const fetchLead = async () => {
        if (isReadOnly) return;
        try {
            const response = await api.get(`/leads/?lead_no=${leadNo}`);
            if (response.data.length > 0) {
                setLead(response.data[0]);
            } else {
                alert('Lead not found');
            }
        } catch (error) {
            console.error('Error fetching lead', error);
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

        const totalMarginPercent = totalCost > 0 ? (totalMarginAmount / totalCost) * 100 : 0;

        return { totalCost, totalMarginAmount, totalMarginPercent, totalPrice };
    };

    const totals = calculateTotals();

    const handleSave = async (newStatus: string = 'PENDING') => {
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
        };

        try {
            if (id) {
                await api.put(`/cost-sheets/${id}/`, payload);
            } else {
                await api.post('/cost-sheets/', payload);
            }
            alert(newStatus === 'PENDING' ? 'Cost Sheet saved as Draft.' : 'Cost Sheet submitted for approval!');
            if (onBack) onBack();
        } catch (error: any) {
            console.error('Error saving cost sheet', error.response?.data);
            const errorMsg = error.response?.data
                ? JSON.stringify(error.response.data, null, 2)
                : 'Failed to save cost sheet. Please check your inputs.';
            alert(`Error: ${errorMsg}`);
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
                    <label>Lead No.</label>
                    <div className="flex gap-2">
                        <input value={leadNo} onChange={e => setLeadNo(e.target.value)} placeholder="Search Lead No." readOnly={isReadOnly} />
                        {!isReadOnly && <button onClick={fetchLead} className="btn-primary !bg-[#0066CC] !p-3 !shadow-none hover:!bg-[#0052CC]"><Search size={18} /></button>}
                    </div>
                </div>
                <div className="form-group">
                    <label>Customer Name</label>
                    <input value={lead?.customer_name || ''} readOnly className="bg-[#FAFBFC] font-semibold text-[#4A5568]" />
                </div>
                <div className="form-group">
                    <label>Project Name</label>
                    <input value={lead?.project_name || ''} readOnly className="bg-[#FAFBFC] font-semibold text-[#4A5568]" />
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

            {/* Footer Breakdown */}
            <div className="fixed bottom-0 left-[280px] right-0 bg-white border-t border-[#E0E6ED] py-8 px-12 shadow-[0_-8px_24px_rgba(0,0,0,0.05)] z-[50]">
                <div className="max-w-[1400px] mx-auto flex justify-between items-center">
                    <div className="flex gap-16">
                        <div>
                            <label className="text-[10px] uppercase font-extrabold tracking-[0.1em] text-[#A0AEC0] mb-2 block">Total Estimated Cost</label>
                            <p className="text-3xl font-extrabold text-[#1a1f36] tracking-tighter">${totals.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-extrabold tracking-[0.1em] text-[#A0AEC0] mb-2 block">Total Estimated Margin %</label>
                            <p className="text-3xl font-extrabold text-[#FF6B00] tracking-tighter">${totals.totalMarginAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            <p className="text-xs font-bold text-[#A0AEC0] mt-1 pr-1">{totals.totalMarginPercent.toFixed(1)}% Profile Margin</p>
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-extrabold tracking-[0.1em] text-[#0066CC] mb-2 block">Total Estimated Price</label>
                            <p className="text-3xl font-extrabold text-[#0066CC] tracking-tighter border-b-4 border-[#0066CC]/20 pb-1">${totals.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                    </div>

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
