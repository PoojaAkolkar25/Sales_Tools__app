import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Search,
    FileText,
    CheckCircle2,
    Upload,
    Mail,
    X,
    Eye,
    Download,
    ChevronDown,
    Columns,
    FileSpreadsheet,
    Loader2,
    RefreshCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { formatToAppDate } from '../utils/dateUtils';

const ALL_COLUMNS = [
    { key: 'deal_id', label: 'Deal ID' },
    { key: 'deal_amount', label: 'Deal Amount' },
    { key: 'cost_sheet_no', label: 'Cost Sheet No' },
    { key: 'cost_sheet_price', label: 'CS Amount' },
    { key: 'estimate_id', label: 'Est. ID' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'project_name', label: 'Project' },
    { key: 'total_price', label: 'Est. Total Value' },
    { key: 'status', label: 'Status' },
    { key: 'subscription_from', label: 'Sub. From' },
    { key: 'subscription_to', label: 'Sub. To' },
    { key: 'proposal', label: 'Proposal' },
    { key: 'created_at', label: 'Date' }
];

interface Estimate {
    id: number;
    estimate_id: string;
    version: number;
    status: string;
    total_price: string;
    deal_amount?: string;
    cost_sheet_price?: string;
    customer_name: string;
    project_name: string;
    deal: number;
    deal_id: string;
    cost_sheet: number;
    cost_sheet_no: string;
    created_at: string;
    is_latest: boolean;
    approval_status: string;
    estimate_date?: string;
    subscription_from?: string;
    subscription_to?: string;
    customer_email?: string;
    proposals?: any[];
}

interface EstimateDashboardProps {
    onView: (id: number) => void;
}

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

const EstimateDashboard: React.FC<EstimateDashboardProps> = ({ onView }) => {
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const [estimates, setEstimates] = useState<Estimate[]>([]);
    const [loading, setLoading] = useState(true);

    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem('estimateDashboard_visibleColumns_v2');
        return saved ? JSON.parse(saved) : ALL_COLUMNS.map(col => col.key);
    });

    const exportMenuRef = useRef<HTMLDivElement>(null);
    const columnMenuRef = useRef<HTMLDivElement>(null);

    const [filters, setFilters] = useState(() => {
        const saved = localStorage.getItem('estimateDashboard_filters');
        return saved ? JSON.parse(saved) : {
            estimate_id: '',
            version: '',
            deal_id: '',
            cost_sheet_no: '',
            customer_name: '',
            project_name: '',
            total_price: '',
            status: 'DRAFT',
            created_at: '',
            period: '',
            startDate: '',
            endDate: '',
            showOnlyLatest: true
        };
    });

    // Email Modal State
    const [emailModal, setEmailModal] = useState<{
        open: boolean;
        estimateId: number | null;
        to: string;
        cc: string;
        bcc: string;
        subject: string;
        body: string;
        templateType: keyof typeof EMAIL_TEMPLATES;
    }>({
        open: false,
        estimateId: null,
        to: '',
        cc: '',
        bcc: '',
        subject: '',
        body: '',
        templateType: 'standard'
    });
    const [sending, setSending] = useState(false);

    useEffect(() => {
        fetchEstimates();
    }, []);

    useEffect(() => {
        localStorage.setItem('estimateDashboard_visibleColumns_v2', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    useEffect(() => {
        localStorage.setItem('estimateDashboard_filters', JSON.stringify(filters));
    }, [filters]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setShowExportMenu(false);
            }
            if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
                setShowColumnMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const fetchEstimates = async () => {
        setLoading(true);
        try {
            const response = await api.get('/estimates/');
            setEstimates(response.data);
        } catch (error) {
            console.error('Error fetching estimates', error);
            showNotification('Error fetching estimates', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filteredEstimates = useMemo(() => {
        return estimates.filter(est => {
            const matchesId = (est.estimate_id || '').toLowerCase().includes(filters.estimate_id.toLowerCase());
            const matchesDealId = (est.deal_id || '').toLowerCase().includes((filters as any).deal_id?.toLowerCase() || '');
            const matchesCsNo = (est.cost_sheet_no || '').toLowerCase().includes((filters as any).cost_sheet_no?.toLowerCase() || '');
            const matchesCustomer = (est.customer_name || '').toLowerCase().includes(filters.customer_name.toLowerCase());
            const matchesProject = (est.project_name || '').toLowerCase().includes(filters.project_name.toLowerCase());
            const matchesStatus = filters.status === '' ? true :
                filters.status === 'APPROVED' ? est.approval_status === 'APPROVED' :
                    filters.status === 'REJECTED' ? est.approval_status === 'REJECTED' :
                        filters.status === 'PENDING_APPROVAL' ? (est.status === 'PENDING_APPROVAL' || est.approval_status === 'PENDING') :
                            filters.status === 'DRAFT' ? (est.status === 'PENDING' || est.status === 'DRAFT') :
                                est.status === filters.status;
            const matchesLatest = !filters.showOnlyLatest || est.is_latest;
            const matchesPrice = (est.total_price || '').toString().includes(filters.total_price);
            // const matchesSubFrom = (est.subscription_from || '').includes(filters.subscription_from || '');
            // const matchesSubTo = (est.subscription_to || '').includes(filters.subscription_to || '');

            let matchesDate = true;
            if (filters.period) {
                const estDate = new Date(est.created_at);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (filters.period === 'last_month') {
                    const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    const lastOfLastMonth = new Date(firstOfThisMonth.getTime() - 1);
                    const firstOfLastMonth = new Date(lastOfLastMonth.getFullYear(), lastOfLastMonth.getMonth(), 1);
                    matchesDate = estDate >= firstOfLastMonth && estDate <= lastOfLastMonth;
                } else if (filters.period === 'last_3_months') {
                    const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    const lastOfLastMonth = new Date(firstOfThisMonth.getTime() - 1);
                    const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
                    matchesDate = estDate >= threeMonthsAgo && estDate <= lastOfLastMonth;
                } else if (filters.period === 'last_6_months') {
                    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1);
                    matchesDate = estDate >= sixMonthsAgo && estDate < new Date(today.getFullYear(), today.getMonth(), 1);
                } else if (filters.period === 'last_year') {
                    const lastYear = today.getFullYear() - 1;
                    const startOfYear = new Date(lastYear, 0, 1);
                    const endOfYear = new Date(lastYear, 11, 31, 23, 59, 59);
                    matchesDate = estDate >= startOfYear && estDate <= endOfYear;
                } else if (filters.period === 'custom' && filters.startDate && filters.endDate) {
                    const start = new Date(filters.startDate);
                    const end = new Date(filters.endDate);
                    end.setHours(23, 59, 59, 999);
                    matchesDate = estDate >= start && estDate <= end;
                }
            }

            return matchesId && matchesDealId && matchesCsNo && matchesCustomer && matchesProject && matchesStatus && matchesLatest && matchesPrice && matchesDate;
        });
    }, [estimates, filters]);

    const exportToExcel = async () => {
        try {
            const response = await api.get('/estimates/export_excel/', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Estimates_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            showNotification('Excel report generated successfully', 'success');
        } catch (error) {
            showNotification('Error generating Excel report', 'error');
        }
    };

    const exportToPDF = async () => {
        try {
            const response = await api.get('/estimates/export_pdf/', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Estimates_Report_${new Date().toISOString().split('T')[0]}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            showNotification('PDF report generated successfully', 'success');
        } catch (error) {
            showNotification('Error generating PDF report', 'error');
        }
    };

    const openEmailModal = (est: any) => {
        const clientName = est.customer_name || '[Client Name]';
        const projectName = est.project_name || '[Project Name]';
        const companyName = "SalesEdge Application";
        const yourName = "Sales Team";
        const expirationDate = "[Expiration Date]";

        setEmailModal({
            open: true,
            estimateId: est.id,
            to: est.customer_email || '',
            cc: '',
            bcc: '',
            subject: EMAIL_TEMPLATES.standard.subject(projectName, companyName),
            body: EMAIL_TEMPLATES.standard.body(clientName, projectName, companyName, expirationDate, yourName),
            templateType: 'standard'
        });
    };

    const handleTemplateChange = (type: keyof typeof EMAIL_TEMPLATES) => {
        const est = estimates.find(e => e.id === emailModal.estimateId);
        if (!est) return;

        const clientName = est.customer_name || '[Client Name]';
        const projectName = est.project_name || '[Project Name]';
        const companyName = "SalesEdge Application";
        const yourName = "Sales Team";
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

    const handleSendEmail = async () => {
        if (!emailModal.estimateId) return;
        setSending(true);
        try {
            await api.post(`/estimates/${emailModal.estimateId}/send_email/`, {
                to: emailModal.to,
                cc: emailModal.cc,
                bcc: emailModal.bcc,
                subject: emailModal.subject,
                body: emailModal.body
            });
            showNotification('Email sent successfully', 'success');

            // If estimate is not yet submitted, trigger the submit status change
            const est = estimates.find(e => e.id === emailModal.estimateId);
            if (est && est.status !== 'SUBMITTED' && est.approval_status === 'APPROVED') {
                try {
                    await api.post(`/estimates/${emailModal.estimateId}/submit/`);
                    fetchEstimates(); // Refresh dashboard
                } catch (subErr) {
                    console.error('Status update failed after email', subErr);
                }
            }

            setEmailModal({ ...emailModal, open: false });
        } catch (error: any) {
            console.error('Error sending email', error);
            showNotification(error.response?.data?.error || 'Failed to send email', 'error');
        } finally {
            setSending(false);
        }
    };


    const handleDownloadPDF = async (id: number, estId: string) => {
        try {
            const response = await api.get(`/estimates/${id}/download_pdf/`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Estimate_${estId}_Combined.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error) {
            showNotification('Failed to download PDF', 'error');
        }
    };


    const getStatusStyle = (status: string, approvalStatus: string) => {
        if (status === 'PENDING_APPROVAL' || approvalStatus === 'PENDING') return { bg: '#FFFAF0', text: '#DD6B20', label: 'Pending Approval' };
        if (approvalStatus === 'REJECTED') return { bg: '#FFF5F5', text: '#E53E3E', label: 'Rejected' };

        switch (status) {
            case 'DRAFT':
                return approvalStatus === 'APPROVED'
                    ? { bg: '#E6FFFA', text: '#38A169', label: 'Approved' }
                    : { bg: '#F7FAFC', text: '#4A5568', label: 'Draft' };
            case 'SUBMITTED': return { bg: '#EBF8FF', text: '#3182CE', label: 'Submitted to Customer' };
            case 'NEGOTIATION': return { bg: '#FFF9F5', text: '#FF6B00', label: 'Negotiation' };
            case 'APPROVED': return { bg: '#E6FFFA', text: '#38A169', label: 'Approved' };
            case 'REJECTED': return { bg: '#FFF5F5', text: '#E53E3E', label: 'Rejected' };
            default: return { bg: '#F7FAFC', text: '#4A5568', label: status };
        }
    };

    // Status Counts & Tabs
    const counts = useMemo(() => {
        const latestEstimates = estimates.filter(e => e.is_latest);
        return {
            all: latestEstimates.length,
            // Assuming 'PENDING' or 'DRAFT' as draft status. Adjusting to match common patterns if needed.
            draft: latestEstimates.filter(e => e.status === 'PENDING' || e.status === 'DRAFT').length,
            submitted: latestEstimates.filter(e => e.status === 'SUBMITTED').length,
            pending: latestEstimates.filter(e => e.status === 'PENDING_APPROVAL' || e.approval_status === 'PENDING').length,
            approved: latestEstimates.filter(e => e.approval_status === 'APPROVED').length,
            rejected: latestEstimates.filter(e => e.approval_status === 'REJECTED').length
        };
    }, [estimates]);

    const statusFlow = [
        { label: `Draft (${counts.draft})`, value: 'DRAFT', color: '#718096' },
        { label: `Submitted (${counts.submitted})`, value: 'SUBMITTED', color: '#3182CE' },
        { label: `Pending Approval (${counts.pending})`, value: 'PENDING_APPROVAL', color: '#805AD5' },
        { label: `Approved (${counts.approved})`, value: 'APPROVED', color: '#38A169' },
        { label: `Rejected (${counts.rejected})`, value: 'REJECTED', color: '#E53E3E' },
        { label: `All (${counts.all})`, value: '', color: '#718096' }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="ae-table-container" style={{
                marginTop: '12px',
                marginBottom: '60px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Controls Status Tabs and Actions - Padded Header Area */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px',
                    padding: '20px',
                    borderBottom: '1px solid #F1F5F9'
                }}>
                    {/* Status Tabs */}
                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        background: 'white',
                        padding: '6px',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}>
                        {statusFlow.map((flow) => (
                            <button
                                key={flow.value}
                                onClick={() => setFilters({ ...filters, status: flow.value })}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: filters.status === flow.value ? '#FF6B00' : 'transparent',
                                    color: filters.status === flow.value ? 'white' : '#64748B',
                                    boxShadow: filters.status === flow.value ? '0 2px 8px rgba(255, 107, 0, 0.2)' : 'none'
                                }}
                            >
                                {flow.label}
                            </button>
                        ))}
                    </div>

                    {/* Right Side Actions */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>Period:</span>
                            <select
                                className="ae-input"
                                value={filters.period}
                                onChange={e => setFilters({ ...filters, period: e.target.value })}
                                style={{ height: '32px', fontSize: '0.8rem', width: '130px', padding: '0 12px' }}
                            >
                                <option value="">All Time</option>
                                <option value="last_month">Last Month</option>
                                <option value="last_3_months">3 Months</option>
                                <option value="last_year">Last Year</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>

                        {filters.period === 'custom' && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <input type="date" className="ae-input" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} style={{ height: '32px', fontSize: '0.75rem', width: '120px', padding: '0 8px' }} />
                                <input type="date" className="ae-input" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} style={{ height: '32px', fontSize: '0.75rem', width: '120px', padding: '0 8px' }} />
                            </div>
                        )}

                        <div style={{ position: 'relative' }} ref={exportMenuRef}>
                            <button
                                className="ae-btn-secondary"
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 14px',
                                    fontSize: '0.8rem',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: 'white',
                                    color: '#4A5568',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                <Download size={16} /> Export <ChevronDown size={14} />
                            </button>
                            {showExportMenu && (
                                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', border: '1px solid #E2E8F0', zIndex: 100, minWidth: '160px', overflow: 'hidden' }}>
                                    <button
                                        onClick={() => { exportToExcel(); setShowExportMenu(false); }}
                                        style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#4A5568', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                        className="hover:bg-gray-50"
                                    >
                                        <FileSpreadsheet size={16} className="text-green-600" /> Excel Report
                                    </button>
                                    <button
                                        onClick={() => { exportToPDF(); setShowExportMenu(false); }}
                                        style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#4A5568', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                        className="hover:bg-gray-50"
                                    >
                                        <FileText size={16} className="text-red-600" /> PDF Report
                                    </button>
                                </div>
                            )}
                        </div>

                        <div style={{ position: 'relative' }} ref={columnMenuRef}>
                            <button
                                className="ae-btn-secondary"
                                onClick={() => setShowColumnMenu(!showColumnMenu)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 14px',
                                    fontSize: '0.8rem',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: 'white',
                                    color: '#4A5568',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                <Columns size={16} /> Columns <ChevronDown size={14} />
                            </button>
                            {showColumnMenu && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: 0,
                                    marginTop: '8px',
                                    background: 'white',
                                    borderRadius: '8px',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                    border: '1px solid #E2E8F0',
                                    zIndex: 100,
                                    minWidth: '200px',
                                    maxHeight: '400px',
                                    overflowY: 'auto'
                                }}>
                                    <div style={{ padding: '8px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between' }}>
                                        <button
                                            onClick={() => setVisibleColumns(ALL_COLUMNS.map(c => c.key))}
                                            style={{ background: 'none', border: 'none', color: '#0066CC', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                                        >
                                            Select All
                                        </button>
                                        <button
                                            onClick={() => setVisibleColumns([])}
                                            style={{ background: 'none', border: 'none', color: '#718096', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                    {ALL_COLUMNS.map(col => (
                                        <label key={col.key} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '8px 16px',
                                            fontSize: '0.8rem',
                                            color: '#4A5568',
                                            cursor: 'pointer',
                                            userSelect: 'none'
                                        }} className="hover:bg-gray-50">
                                            <input
                                                type="checkbox"
                                                checked={visibleColumns.includes(col.key)}
                                                onChange={() => {
                                                    if (visibleColumns.includes(col.key)) {
                                                        setVisibleColumns(visibleColumns.filter(c => c !== col.key));
                                                    } else {
                                                        setVisibleColumns([...visibleColumns, col.key]);
                                                    }
                                                }}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            {col.label}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Table Area */}
                <div style={{ overflowX: 'auto' }}>
                    <table className="ae-table" style={{ minWidth: visibleColumns.length > 6 ? '1400px' : '100%' }}>
                        <thead>
                            <tr>
                                {ALL_COLUMNS.map(col => visibleColumns.includes(col.key) && (
                                    <th key={col.key} style={{ backgroundColor: '#FAFBFC', zIndex: 12, height: '40px', whiteSpace: 'nowrap', top: 0 }}>{col.label}</th>
                                ))}
                                <th style={{ backgroundColor: '#FAFBFC', zIndex: 12, textAlign: 'center', height: '40px', whiteSpace: 'nowrap', top: 0 }}>Actions</th>
                            </tr>
                            <tr style={{ background: '#F7FAFC' }}>
                                {ALL_COLUMNS.map(col => visibleColumns.includes(col.key) && (
                                    <th key={col.key} style={{ backgroundColor: '#F7FAFC' }}>
                                        <div className="ae-input-group" style={{ margin: 0 }}>
                                            <Search className="ae-search-icon" size={12} />
                                            <input
                                                className="ae-input"
                                                placeholder="Filter..."
                                                value={(filters as any)[col.key]}
                                                onChange={e => setFilters({ ...filters, [col.key]: e.target.value })}
                                                style={{ height: '24px', fontSize: '11px', paddingTop: 0, paddingBottom: 0 }}
                                            />
                                        </div>
                                    </th>
                                ))}
                                <th style={{ textAlign: 'center', backgroundColor: '#F7FAFC' }}>
                                    <button
                                        onClick={() => setFilters({
                                            estimate_id: '', version: '', deal_id: '', cost_sheet_no: '', customer_name: '', project_name: '',
                                            total_price: '', status: '', created_at: '', period: '',
                                            startDate: '', endDate: '', showOnlyLatest: filters.showOnlyLatest
                                        })}
                                        style={{ height: '24px', width: '100%', fontSize: '10px', color: '#FF6B00', fontWeight: 700, cursor: 'pointer', background: 'white', border: '1px solid #E0E6ED', borderRadius: '6px' }}
                                    >
                                        Clear
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={visibleColumns.length + 1} style={{ textAlign: 'center', padding: '100px' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></td></tr>
                            ) : filteredEstimates.length === 0 ? (
                                <tr><td colSpan={visibleColumns.length + 1} style={{ textAlign: 'center', padding: '100px', color: '#718096' }}>No estimates found.</td></tr>
                            ) : (
                                filteredEstimates.map(est => {
                                    const style = getStatusStyle(est.status, est.approval_status);
                                    const hasProposal = (est as any).proposals?.length > 0;
                                    return (
                                        <tr key={est.id}>
                                            {visibleColumns.includes('deal_id') && (
                                                <td
                                                    style={{ fontWeight: 700, color: '#0066CC', cursor: 'pointer', textDecoration: 'underline' }}
                                                    onClick={() => navigate(`/deal?id=${est.deal}`)}
                                                >
                                                    {est.deal_id}
                                                </td>
                                            )}
                                            {visibleColumns.includes('deal_amount') && (
                                                <td style={{ fontWeight: 600, color: '#38A169' }}>
                                                    ₹{parseFloat(est.deal_amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            )}
                                            {visibleColumns.includes('cost_sheet_no') && (
                                                <td
                                                    style={{ fontWeight: 700, color: '#0066CC', cursor: 'pointer', textDecoration: 'underline' }}
                                                    onClick={() => navigate(`/cost-sheet?id=${est.cost_sheet}`)}
                                                >
                                                    {est.cost_sheet_no}
                                                </td>
                                            )}
                                            {visibleColumns.includes('cost_sheet_price') && (
                                                <td style={{ fontWeight: 600, color: '#2b6cb0' }}>
                                                    ₹{parseFloat(est.cost_sheet_price || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            )}
                                            {visibleColumns.includes('estimate_id') && (
                                                <td
                                                    style={{ fontWeight: 700, color: '#0066CC', cursor: 'pointer', textDecoration: 'underline' }}
                                                    onClick={() => onView(est.id)}
                                                >
                                                    {est.estimate_id}
                                                </td>
                                            )}

                                            {visibleColumns.includes('customer_name') && <td style={{ fontWeight: 500 }}>{est.customer_name}</td>}
                                            {visibleColumns.includes('project_name') && <td style={{ color: '#4A5568' }}>{est.project_name}</td>}
                                            {visibleColumns.includes('total_price') && <td style={{ fontWeight: 700 }}>₹{parseFloat(est.total_price || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>}
                                            {visibleColumns.includes('status') && (
                                                <td>
                                                    <span style={{ padding: '4px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700, background: style.bg, color: style.text, whiteSpace: 'nowrap' }}>{style.label}</span>
                                                </td>
                                            )}
                                            {visibleColumns.includes('subscription_from') && <td style={{ color: '#4A5568', fontSize: '0.75rem' }}>{est.subscription_from ? formatToAppDate(est.subscription_from) : '-'}</td>}
                                            {visibleColumns.includes('subscription_to') && <td style={{ color: '#4A5568', fontSize: '0.75rem' }}>{est.subscription_to ? formatToAppDate(est.subscription_to) : '-'}</td>}
                                            {visibleColumns.includes('proposal') && (
                                                <td>
                                                    {hasProposal ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#38A169', fontSize: '0.75rem', fontWeight: 600 }}><CheckCircle2 size={14} /> Attached</div>
                                                    ) : (
                                                        <button onClick={() => onView(est.id)} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, background: '#FFF5F5', color: '#E53E3E', border: '1px solid #E53E3E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <Upload size={14} /> Attach Proposal
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                            {visibleColumns.includes('created_at') && <td style={{ color: '#4A5568', fontSize: '0.75rem' }}>{formatToAppDate(est.estimate_date || est.created_at)}</td>}

                                            <td style={{ textAlign: 'center', display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => onView(est.id)}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        padding: '6px 12px',
                                                        background: '#0066CC',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseOver={(e) => e.currentTarget.style.background = '#0052A3'}
                                                    onMouseOut={(e) => e.currentTarget.style.background = '#0066CC'}
                                                    title="View Details"
                                                >
                                                    <Eye size={14} />
                                                </button>

                                                {est.approval_status === 'APPROVED' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDownloadPDF(est.id, est.estimate_id);
                                                        }}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            padding: '6px 12px',
                                                            background: '#FF6B00',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseOver={(e) => e.currentTarget.style.background = '#E56000'}
                                                        onMouseOut={(e) => e.currentTarget.style.background = '#FF6B00'}
                                                        title="Download Report"
                                                    >
                                                        <FileText size={14} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Email Modal */}
                {emailModal.open && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                        <div style={{ background: 'white', padding: '32px', borderRadius: '16px', width: '600px', maxWidth: '95%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1A202C' }}>Compose Proposal Email</h3>
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

                            <div className="space-y-4">
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
                                    <textarea className="ae-input" value={emailModal.body} onChange={(e) => setEmailModal({ ...emailModal, body: e.target.value })} style={{ width: '100%', minHeight: '180px', padding: '12px', resize: 'vertical' }} placeholder="Write your message here..." />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
                                <button className="ae-btn-secondary" onClick={() => setEmailModal({ ...emailModal, open: false })} disabled={sending} style={{ padding: '10px 24px' }}>Cancel</button>
                                <button className="ae-btn-primary" onClick={handleSendEmail} disabled={sending} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 32px' }}>
                                    {sending ? <RefreshCcw className="animate-spin" size={18} /> : <Mail size={18} />}
                                    {sending ? 'Sending...' : 'Send Now'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EstimateDashboard;
