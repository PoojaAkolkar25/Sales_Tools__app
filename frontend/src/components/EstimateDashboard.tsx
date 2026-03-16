import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    CheckCircle2,
    Mail,
    X,
    Download,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Columns,
    FileSpreadsheet,
    Loader2,
    RefreshCcw,
    Paperclip,
    Eye,
    Check,
    Mails
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { formatToAppDate } from '../utils/dateUtils';
import Pagination from './Pagination';
import AutoExpandingTextarea from './AutoExpandingTextarea';

const ALL_COL_CONFIG = [
    { key: 'deal_id', label: 'Deal ID', shortLabel: 'DEAL' },
    { key: 'deal_amount', label: 'Deal Amount', shortLabel: 'DL AMT' },
    { key: 'cost_sheet_no', label: 'Cost Sheet No', shortLabel: 'CS#' },
    { key: 'cost_sheet_price', label: 'CS Amount', shortLabel: 'CS AMT' },
    { key: 'estimate_id', label: 'Est. ID', shortLabel: 'EST ID' },
    { key: 'version', label: 'Version', shortLabel: 'V.' },
    { key: 'created_at', label: 'Date', shortLabel: 'DATE' },
    { key: 'estimate_date', label: 'Estimate Date', shortLabel: 'EST DT' },
    { key: 'customer_name', label: 'Customer', shortLabel: 'CUST.' },
    { key: 'project_name', label: 'Project', shortLabel: 'PROJ.' },
    { key: 'total_price', label: 'Est. Total Value', shortLabel: 'TOTAL' },
    { key: 'amount_inr', label: 'Total Value (INR)', shortLabel: 'INR' },
    { key: 'status', label: 'Status', shortLabel: 'ST.' },
    { key: 'subscription_from', label: 'Sub. From', shortLabel: 'FROM' },
    { key: 'subscription_to', label: 'Sub. To', shortLabel: 'TO' },
    { key: 'proposal', label: 'Proposal', shortLabel: 'PROP.' }
];

const SHORT_COL_WIDTHS: Record<string, number> = {
    deal_id: 40,
    deal_amount: 55,
    cost_sheet_no: 55,
    cost_sheet_price: 55,
    estimate_id: 55,
    version: 25,
    created_at: 45,
    estimate_date: 55,
    customer_name: 55,
    project_name: 55,
    total_price: 55,
    amount_inr: 55,
    status: 35,
    subscription_from: 55,
    subscription_to: 45,
    proposal: 55,
    actions: 60
};

const FULL_LABEL_WIDTHS: Record<string, number> = {
    deal_id: 220,
    deal_amount: 140,
    cost_sheet_no: 140,
    cost_sheet_price: 140,
    estimate_id: 110,
    version: 80,
    created_at: 110,
    estimate_date: 140,
    customer_name: 180,
    project_name: 180,
    total_price: 180,
    amount_inr: 180,
    status: 160,
    subscription_from: 140,
    subscription_to: 140,
    proposal: 120
};

const MAX_COL_WIDTHS: Record<string, number> = {
    deal_id: 400,
    deal_amount: 250,
    cost_sheet_no: 300,
    cost_sheet_price: 250,
    estimate_id: 200,
    version: 120,
    created_at: 180,
    estimate_date: 200,
    customer_name: 500,
    project_name: 600,
    total_price: 300,
    amount_inr: 300,
    status: 200,
    subscription_from: 200,
    subscription_to: 200,
    proposal: 200,
    actions: 150
};

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
    description_memo?: string;
    amount_inr?: number;
    proposals?: any[];
}

interface EstimateDashboardProps {
    onView: (id: number) => void;
    user: any;
}

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

const EstimateDashboard: React.FC<EstimateDashboardProps> = ({ onView, user }) => {
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const [estimates, setEstimates] = useState<Estimate[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const [hoveredExport, setHoveredExport] = useState(false);
    const [hoveredColumn, setHoveredColumn] = useState(false);
    const [hoveredTab, setHoveredTab] = useState<string | null>(null);
    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem('estimateDashboard_visibleColumns_v4');
        return saved ? JSON.parse(saved) : ALL_COL_CONFIG.map(col => col.key);
    });

    const exportMenuRef = useRef<HTMLDivElement>(null);
    const columnMenuRef = useRef<HTMLDivElement>(null);
    const tableScrollRef = useRef<HTMLDivElement>(null);

    const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
        const saved = localStorage.getItem('estimateDashboard_colWidths_v10');
        if (saved) return JSON.parse(saved);
        const defaults: Record<string, number> = {};
        ALL_COL_CONFIG.forEach(c => { defaults[c.key] = FULL_LABEL_WIDTHS[c.key] || 150; });
        return defaults;
    });

    useEffect(() => {
        localStorage.setItem('estimateDashboard_colWidths_v10', JSON.stringify(colWidths));
    }, [colWidths]);

    const resizingRef = useRef<{ colKey: string; startWidth: number; startX: number } | null>(null);

    const startResize = (e: React.MouseEvent, colKey: string) => {
        e.preventDefault();
        resizingRef.current = {
            colKey,
            startWidth: colWidths[colKey],
            startX: e.clientX
        };

        const onMouseMove = (ev: MouseEvent) => {
            if (!resizingRef.current) return;
            const key = resizingRef.current.colKey;
            const delta = ev.clientX - resizingRef.current.startX;
            const minWidth = SHORT_COL_WIDTHS[key] ?? 40;
            const maxWidth = MAX_COL_WIDTHS[key] ?? 300;
            const newWidth = Math.min(maxWidth, Math.max(minWidth, resizingRef.current.startWidth + delta));
            setColWidths(prev => ({ ...prev, [key]: newWidth }));
        };

        const onMouseUp = () => {
            resizingRef.current = null;
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = 'default';
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'col-resize';
    };

    const getColWidth = (key: string) => colWidths[key] || 100;

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
            amount_inr: '',
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
        has_proposal: boolean;
        proposal_filename: string;
    }>({
        open: false,
        estimateId: null,
        to: '',
        cc: '',
        bcc: '',
        subject: '',
        body: '',
        templateType: 'standard',
        has_proposal: false,
        proposal_filename: ''
    });
    const [sending, setSending] = useState(false);

    useEffect(() => {
        fetchEstimates();
    }, []);

    useEffect(() => {
        localStorage.setItem('estimateDashboard_visibleColumns_v4', JSON.stringify(visibleColumns));
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
                filters.status === 'APPROVED' ? (est.approval_status === 'APPROVED' && est.status !== 'SUBMITTED') :
                    filters.status === 'REJECTED' ? est.approval_status === 'REJECTED' :
                        filters.status === 'PENDING_APPROVAL' ? est.status === 'PENDING_APPROVAL' :
                            filters.status === 'DRAFT' ? ((est.status === 'DRAFT' || est.status === 'NEGOTIATION') && est.approval_status === 'PENDING') :
                                est.status === filters.status;
            const matchesLatest = filters.status === 'REWOUND' ? true : (!filters.showOnlyLatest || est.is_latest);
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

    const paginatedEstimates = useMemo(() => {
        return filteredEstimates.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        );
    }, [filteredEstimates, currentPage]);

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


    const handleTemplateChange = (type: keyof typeof EMAIL_TEMPLATES) => {
        const est = estimates.find(e => e.id === emailModal.estimateId);
        if (!est) return;

        const clientName = est.customer_name || '[Client Name]';
        const projectName = est.project_name || '[Project Name]';
        const customerName = est.customer_name || '';
        const estimateId = est.estimate_id || '';
        const companyName = "Automation Edge"; // Use consistent name or fetch from profile
        const yourName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || "Sales Team" : "Sales Team";
        const estDate = est.estimate_date ? new Date(est.estimate_date) : new Date();
        const expDate = new Date(estDate);
        expDate.setDate(expDate.getDate() + 30);
        const expirationDate = expDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const sentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const revisionDetails = est.description_memo || "[specific change]";

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
            showNotification('mail sent successfully', 'success');
            setEmailModal(prev => ({ ...prev, open: false }));

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
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
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

    const handleViewPDF = async (id: number) => {
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


    const getStatusStyle = (status: string, approvalStatus: string) => {
        if (status === 'PENDING_APPROVAL' || approvalStatus === 'PENDING') return { bg: 'var(--bg-secondary)', text: 'var(--theme-primary)', label: 'Pending Approval' };
        if (approvalStatus === 'REJECTED') return { bg: 'rgba(229, 62, 62, 0.1)', text: '#E53E3E', label: 'Rejected' };

        switch (status) {
            case 'DRAFT':
                return approvalStatus === 'APPROVED'
                    ? { bg: 'rgba(56, 161, 105, 0.1)', text: '#38A169', label: 'Approved' }
                    : { bg: 'var(--bg-secondary)', text: 'var(--text-secondary)', label: 'Draft' };
            case 'SUBMITTED': return { bg: 'rgba(49, 130, 206, 0.1)', text: '#3182CE', label: 'Submitted to Customer' };
            case 'REWOUND': return { bg: 'rgba(113, 128, 150, 0.1)', text: '#718096', label: 'Rewound' };
            case 'NEGOTIATION': return { bg: 'rgba(255, 107, 0, 0.1)', text: 'var(--theme-primary)', label: 'Negotiation' };
            case 'APPROVED': return { bg: 'rgba(56, 161, 105, 0.1)', text: '#38A169', label: 'Approved' };
            case 'REJECTED': return { bg: 'rgba(229, 62, 62, 0.1)', text: '#E53E3E', label: 'Rejected' };
            default: return { bg: 'var(--bg-secondary)', text: 'var(--text-secondary)', label: status };
        }
    };

    // Status Counts & Tabs
    const counts = useMemo(() => {
        const latestEstimates = estimates.filter(e => e.is_latest);
        return {
            all: latestEstimates.length,
            draft: latestEstimates.filter(e => (e.status === 'DRAFT' || e.status === 'NEGOTIATION') && e.approval_status === 'PENDING').length,
            submitted: latestEstimates.filter(e => e.status === 'SUBMITTED').length,
            pending: latestEstimates.filter(e => e.status === 'PENDING_APPROVAL').length,
            approved: latestEstimates.filter(e => e.approval_status === 'APPROVED' && e.status !== 'SUBMITTED').length,
            rejected: latestEstimates.filter(e => e.approval_status === 'REJECTED').length,
            rewound: estimates.filter(e => e.status === 'REWOUND').length
        };
    }, [estimates]);

    const statusFlow = [
        { label: `Draft (${counts.draft})`, value: 'DRAFT', color: 'var(--text-secondary)' },
        { label: `Pending Approval (${counts.pending})`, value: 'PENDING_APPROVAL', color: 'var(--ae-navy)' },
        { label: `Approved (${counts.approved})`, value: 'APPROVED', color: 'var(--ae-green)' },
        { label: `Submitted (${counts.submitted})`, value: 'SUBMITTED', color: 'var(--ae-blue)' },
        { label: `Rejected (${counts.rejected})`, value: 'REJECTED', color: '#E53E3E' },
        { label: `Rewound (${counts.rewound})`, value: 'REWOUND', color: '#718096' },
        { label: `All (${counts.all})`, value: '', color: 'var(--text-secondary)' }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="ae-table-container" style={{
                marginTop: '12px',
                marginBottom: '60px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'visible',
                maxHeight: 'none'
            }}>
                {/* Controls Status Tabs and Actions - Padded Header Area */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-primary)',
                    position: 'relative'
                }}>
                    {/* Status Tabs */}
                    <div style={{
                        display: 'flex',
                        gap: '2px',
                        background: 'white',
                        padding: '4px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-primary)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}>
                        {statusFlow.map((flow) => {
                            const isActive = filters.status === flow.value;
                            const isHovered = hoveredTab === flow.value;
                            return (
                                <button
                                    key={flow.value}
                                    onClick={() => setFilters({ ...filters, status: flow.value })}
                                    onMouseEnter={() => setHoveredTab(flow.value)}
                                    onMouseLeave={() => setHoveredTab(null)}
                                    style={{
                                        padding: '5px 12px',
                                        borderRadius: '8px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        border: isActive ? '1px solid var(--theme-primary)' : (isHovered ? '1px solid var(--theme-primary)' : '1px solid transparent'),
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        whiteSpace: 'nowrap',
                                        background: isActive ? 'var(--theme-primary)' : 'transparent',
                                        color: isActive ? 'white' : 'black',
                                        boxShadow: isActive ? 'var(--shadow-md)' : (isHovered ? '0 0 0 3px rgba(255, 107, 0, 0.1)' : 'none')
                                    }}
                                >
                                    {flow.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Right Side Actions */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Period:</span>
                            <select
                                className="ae-input"
                                value={filters.period}
                                onChange={e => setFilters({ ...filters, period: e.target.value })}
                                style={{ height: '32px', fontSize: '0.8rem', width: '130px', padding: '0 8px', borderRadius: '8px' }}
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
                                onMouseEnter={() => setHoveredExport(true)}
                                onMouseLeave={() => setHoveredExport(false)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 14px',
                                    fontSize: '0.8rem',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: 'white',
                                    color: 'black',
                                    fontWeight: 400,
                                    cursor: 'pointer',
                                    border: (showExportMenu || hoveredExport) ? '1px solid var(--theme-primary)' : '1px solid var(--ae-gray-100)',
                                    boxShadow: (showExportMenu || hoveredExport) ? '0 0 0 3px rgba(255, 107, 0, 0.1)' : 'none'
                                }}
                            >
                                <Download size={16} /> Export <ChevronDown size={14} />
                            </button>
                            {showExportMenu && (
                                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--bg-primary)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', border: '1px solid var(--border-primary)', zIndex: 100, minWidth: '160px', overflow: 'hidden' }}>
                                    <button
                                        onClick={() => { exportToPDF(); setShowExportMenu(false); }}
                                        style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(255, 107, 0, 0.05)';
                                            e.currentTarget.style.color = 'var(--ae-orange)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'none';
                                            e.currentTarget.style.color = 'var(--text-primary)';
                                        }}
                                    >
                                        <FileSpreadsheet size={16} style={{ color: '#DC2626' }} /> PDF Report
                                    </button>
                                    <button
                                        onClick={() => { exportToExcel(); setShowExportMenu(false); }}
                                        style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(255, 107, 0, 0.05)';
                                            e.currentTarget.style.color = 'var(--ae-orange)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'none';
                                            e.currentTarget.style.color = 'var(--text-primary)';
                                        }}
                                    >
                                        <FileSpreadsheet size={16} style={{ color: '#2563EB' }} /> Excel Report
                                    </button>
                                </div>
                            )}
                        </div>


                        <div style={{ position: 'relative' }} ref={columnMenuRef}>
                            <button
                                className="ae-btn-secondary"
                                onClick={() => setShowColumnMenu(!showColumnMenu)}
                                onMouseEnter={() => setHoveredColumn(true)}
                                onMouseLeave={() => setHoveredColumn(false)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 14px',
                                    fontSize: '0.8rem',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: 'white',
                                    color: 'black',
                                    fontWeight: 400,
                                    cursor: 'pointer',
                                    border: (showColumnMenu || hoveredColumn) ? '1px solid var(--theme-primary)' : '1px solid var(--ae-gray-100)',
                                    boxShadow: (showColumnMenu || hoveredColumn) ? '0 0 0 3px rgba(255, 107, 0, 0.1)' : 'none'
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
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                                    border: '1px solid var(--border-primary)',
                                    zIndex: 100,
                                    minWidth: '220px',
                                    maxHeight: '450px',
                                    overflowY: 'auto'
                                }}>
                                    <div style={{
                                        padding: '12px 16px',
                                        borderBottom: '1px solid var(--border-primary)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        backgroundColor: 'var(--ae-table-header-bg)'
                                    }}>
                                        <button
                                            onClick={() => setVisibleColumns(ALL_COL_CONFIG.map(c => c.key))}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--theme-primary)',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = '#EBF5FF'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                        >
                                            Select All
                                        </button>
                                        <button
                                            onClick={() => setVisibleColumns([])}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--text-secondary)',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                    {ALL_COL_CONFIG.map(col => (
                                        <label key={col.key} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '10px 16px',
                                            fontSize: '0.85rem',
                                            color: '#2D3748',
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                            transition: 'background 0.2s',
                                            borderBottom: '1px solid var(--border-primary)'
                                        }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(255, 107, 0, 0.05)';
                                                e.currentTarget.style.color = 'var(--ae-orange)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'white';
                                                e.currentTarget.style.color = '#2D3748';
                                            }}
                                        >
                                            <div
                                                onClick={() => {
                                                    if (visibleColumns.includes(col.key)) {
                                                        setVisibleColumns(visibleColumns.filter(c => c !== col.key));
                                                    } else {
                                                        setVisibleColumns([...visibleColumns, col.key]);
                                                    }
                                                }}
                                                style={{
                                                    width: '18px',
                                                    height: '18px',
                                                    borderRadius: '4px',
                                                    border: `2px solid ${visibleColumns.includes(col.key) ? 'var(--ae-blue)' : '#CBD5E1'}`,
                                                    background: visibleColumns.includes(col.key) ? 'var(--ae-blue)' : 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.2s',
                                                    flexShrink: 0
                                                }}>
                                                {visibleColumns.includes(col.key) && <Check size={12} color="white" strokeWidth={4} />}
                                            </div>
                                            <span style={{ fontWeight: 600 }}>{col.label}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Table Area */}
                <div style={{ position: 'relative' }}>
                    {/* Left scroll button */}
                    <button
                        onClick={() => tableScrollRef.current?.scrollBy({ left: -150, behavior: 'smooth' })}
                        style={{
                            position: 'absolute',
                            left: '-18px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 30,
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-primary)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--theme-primary)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--theme-primary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-primary)'; }}
                        title="Scroll left"
                    >
                        <ChevronLeft size={18} />
                    </button>

                    {/* Right scroll button */}
                    <button
                        onClick={() => tableScrollRef.current?.scrollBy({ left: 150, behavior: 'smooth' })}
                        style={{
                            position: 'absolute',
                            right: '-18px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 30,
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-primary)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--theme-primary)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--theme-primary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-primary)'; }}
                        title="Scroll right"
                    >
                        <ChevronRight size={18} />
                    </button>

                    <div ref={tableScrollRef} style={{ overflowX: 'auto', background: 'var(--bg-primary)', borderRadius: '4px', border: '1px solid var(--border-primary)' }}>
                        <table className="ae-table compact-table" style={{ tableLayout: 'fixed', width: 'max-content' }}>
                            <colgroup>
                                {ALL_COL_CONFIG.filter(col => visibleColumns.includes(col.key)).map(col => (
                                    <col key={col.key} style={{ width: `${getColWidth(col.key)}px` }} />
                                ))}
                                <col style={{ width: `${getColWidth('actions')}px` }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    {ALL_COL_CONFIG.filter(col => visibleColumns.includes(col.key)).map(col => (
                                        <th key={col.key} style={{
                                            backgroundColor: 'var(--ae-table-header-bg)',
                                            position: 'relative',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            userSelect: 'none',
                                            paddingRight: '20px',
                                            borderRight: '1px solid var(--border-secondary)',
                                            borderBottom: '1px solid var(--border-secondary)',
                                            zIndex: 12,
                                            top: 0,
                                            color: 'var(--text-secondary)'
                                        }}>
                                            <span title={col.label} style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                                {getColWidth(col.key) < (SHORT_COL_WIDTHS[col.key] + 5)
                                                    ? col.shortLabel
                                                    : col.label}
                                            </span>
                                            <div
                                                onMouseDown={(e) => startResize(e, col.key)}
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    right: 0,
                                                    width: '6px',
                                                    height: '100%',
                                                    cursor: 'col-resize',
                                                    background: 'transparent',
                                                    zIndex: 20
                                                }}
                                                title="Drag to resize"
                                            />
                                        </th>
                                    ))}
                                    <th style={{
                                        backgroundColor: 'var(--ae-table-header-bg)',
                                        zIndex: 12,
                                        textAlign: 'center',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        top: 0,
                                        color: 'black',
                                        borderBottom: '1px solid var(--border-secondary)',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.02em'
                                    }}>Actions</th>
                                </tr>
                                <tr style={{ background: 'var(--ae-filter-row-bg)' }}>
                                    {ALL_COL_CONFIG.filter(col => visibleColumns.includes(col.key)).map(col => (
                                        <th key={col.key} style={{ backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>
                                            <div className="ae-input-group" style={{ margin: 0 }}>
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
                                    <th style={{
                                        textAlign: 'center',
                                        backgroundColor: 'var(--ae-filter-row-bg)',
                                        borderBottom: '1px solid var(--border-secondary)'
                                    }}>
                                        <button
                                            onClick={() => setFilters({
                                                estimate_id: '', version: '', deal_id: '', cost_sheet_no: '', customer_name: '', project_name: '',
                                                total_price: '', amount_inr: '', status: '', created_at: '', period: '',
                                                startDate: '', endDate: '', subscription_from: '', subscription_to: ''
                                            })}
                                            style={{ height: '24px', width: '100%', fontSize: '10px', color: 'var(--theme-primary)', fontWeight: 700, cursor: 'pointer', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px' }}
                                        >
                                            Clear
                                        </button>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={visibleColumns.length + 1} style={{ textAlign: 'center', padding: '100px' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></td></tr>
                                ) : paginatedEstimates.length === 0 ? (
                                    <tr><td colSpan={visibleColumns.length + 1} style={{ textAlign: 'center', padding: '100px', color: '#718096' }}>No estimates found.</td></tr>
                                ) : (
                                    paginatedEstimates.map(est => {
                                        const style = getStatusStyle(est.status, est.approval_status);
                                        const hasProposal = (est as any).proposals?.length > 0;
                                        return (
                                            <tr key={est.id}>
                                                {ALL_COL_CONFIG.filter(col => visibleColumns.includes(col.key)).map(col => {
                                                    const cellStyle = {
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        padding: '4px 6px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 400
                                                    } as React.CSSProperties;

                                                    switch (col.key) {
                                                        case 'deal_id':
                                                            return (
                                                                <td key={col.key} style={{ ...cellStyle, color: 'var(--theme-primary)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate(`/deal?id=${est.deal}`)}>
                                                                    {est.deal_id}
                                                                </td>
                                                            );
                                                        case 'deal_amount':
                                                            return <td key={col.key} style={cellStyle}>₹{parseFloat(est.deal_amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>;
                                                        case 'cost_sheet_no':
                                                            return (
                                                                <td key={col.key} style={{ ...cellStyle, color: 'var(--theme-primary)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate(`/cost-sheet?id=${est.cost_sheet}`)}>
                                                                    {est.cost_sheet_no}
                                                                </td>
                                                            );
                                                        case 'cost_sheet_price':
                                                            return <td key={col.key} style={cellStyle}>₹{parseFloat(est.cost_sheet_price || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>;
                                                        case 'estimate_id':
                                                            return (
                                                                <td key={col.key} style={{ ...cellStyle, color: 'var(--theme-primary)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => onView(est.id)}>
                                                                    {est.estimate_id}
                                                                </td>
                                                            );
                                                        case 'version':
                                                            return <td key={col.key} style={{ ...cellStyle, textAlign: 'center' }}>v{est.version}</td>;
                                                        case 'created_at':
                                                            return <td key={col.key} style={cellStyle}>{est.created_at ? formatToAppDate(est.created_at) : '-'}</td>;
                                                        case 'estimate_date':
                                                            return <td key={col.key} style={cellStyle}>{est.estimate_date ? formatToAppDate(est.estimate_date) : '-'}</td>;
                                                        case 'customer_name':
                                                            return <td key={col.key} style={cellStyle}>{est.customer_name}</td>;
                                                        case 'project_name':
                                                            return <td key={col.key} style={cellStyle}>{est.project_name}</td>;
                                                        case 'total_price':
                                                            return <td key={col.key} style={{ ...cellStyle, color: 'var(--theme-primary)' }}>₹{parseFloat(est.total_price || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>;
                                                        case 'amount_inr':
                                                            return <td key={col.key} style={{ ...cellStyle, color: 'var(--theme-primary)', fontWeight: 600 }}>₹{parseFloat(est.amount_inr?.toString() || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>;
                                                        case 'status':
                                                            return (
                                                                <td key={col.key} style={{ padding: '4px 6px' }}>
                                                                    <span style={{ padding: '4px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700, background: style.bg, color: style.text, whiteSpace: 'nowrap' }}>{style.label}</span>
                                                                </td>
                                                            );
                                                        case 'subscription_from':
                                                            return <td key={col.key} style={cellStyle}>{est.subscription_from ? formatToAppDate(est.subscription_from) : '-'}</td>;
                                                        case 'subscription_to':
                                                            return <td key={col.key} style={cellStyle}>{est.subscription_to ? formatToAppDate(est.subscription_to) : '-'}</td>;
                                                        case 'proposal':
                                                            return (
                                                                <td key={col.key} style={{ overflow: 'hidden', padding: '4px 6px' }}>
                                                                    {hasProposal ? (
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontSize: '0.75rem', fontWeight: 700 }}>
                                                                            <CheckCircle2 size={14} /> Attached
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => onView(est.id)}
                                                                            style={{
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                gap: '6px',
                                                                                background: 'rgba(255, 107, 0, 0.1)',
                                                                                color: 'var(--theme-primary)',
                                                                                border: '1px solid rgba(255, 107, 0, 0.2)',
                                                                                padding: '4px 12px',
                                                                                borderRadius: '20px',
                                                                                fontSize: '0.72rem',
                                                                                fontWeight: 700,
                                                                                cursor: 'pointer',
                                                                                transition: 'all 0.2s'
                                                                            }}
                                                                            onMouseEnter={(e) => {
                                                                                e.currentTarget.style.background = 'var(--theme-primary)';
                                                                                e.currentTarget.style.color = 'white';
                                                                            }}
                                                                            onMouseLeave={(e) => {
                                                                                e.currentTarget.style.background = 'rgba(255, 107, 0, 0.1)';
                                                                                e.currentTarget.style.color = 'var(--theme-primary)';
                                                                            }}
                                                                        >
                                                                            <Paperclip size={12} /> Attach
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            );
                                                        default:
                                                            return <td key={col.key} style={cellStyle}>-</td>;
                                                    }
                                                })}
                                                <td style={{ padding: '4px 6px' }}>
                                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                        <button
                                                            onClick={() => onView(est.id)}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                width: '32px',
                                                                height: '32px',
                                                                background: 'rgba(255, 107, 0, 0.08)',
                                                                color: 'var(--theme-primary)',
                                                                border: '1px solid rgba(255, 107, 0, 0.15)',
                                                                borderRadius: '8px',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.background = 'var(--theme-primary)';
                                                                e.currentTarget.style.color = 'white';
                                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 0, 0.25)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.background = 'rgba(255, 107, 0, 0.08)';
                                                                e.currentTarget.style.color = 'var(--theme-primary)';
                                                                e.currentTarget.style.boxShadow = 'none';
                                                            }}
                                                            title="View Estimate"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownloadPDF(est.id, est.estimate_id)}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                width: '32px',
                                                                height: '32px',
                                                                background: 'rgba(255, 107, 0, 0.08)',
                                                                color: 'var(--theme-primary)',
                                                                border: '1px solid rgba(255, 107, 0, 0.15)',
                                                                borderRadius: '8px',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.background = 'var(--theme-primary)';
                                                                e.currentTarget.style.color = 'white';
                                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 0, 0.25)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.background = 'rgba(255, 107, 0, 0.08)';
                                                                e.currentTarget.style.color = 'var(--theme-primary)';
                                                                e.currentTarget.style.boxShadow = 'none';
                                                            }}
                                                            title="Download PDF"
                                                        >
                                                            <Download size={16} />
                                                        </button>
                                                        {(filters.status === 'APPROVED' || filters.status === 'SUBMITTED') && (
                                                            <button
                                                                onClick={() => {
                                                                    const companyName = "Automation Edge";
                                                                    const subject = EMAIL_TEMPLATES.standard.subject(companyName, est.customer_name || '', est.estimate_id);
                                                                    const yourName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || "Sales Team" : "Sales Team";

                                                                    const estDate = est.estimate_date ? new Date(est.estimate_date) : new Date();
                                                                    const expDate = new Date(estDate);
                                                                    expDate.setDate(expDate.getDate() + 30);
                                                                    const expirationDate = expDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

                                                                    const body = EMAIL_TEMPLATES.standard.body(est.customer_name, est.project_name, companyName, expirationDate, yourName, est.estimate_id);
                                                                    const proposals = est.proposals || [];
                                                                    const latestProposal = proposals.length > 0 ? [...proposals].sort((a, b) => b.version - a.version)[0] : null;

                                                                    setEmailModal({
                                                                        ...emailModal,
                                                                        open: true,
                                                                        estimateId: est.id,
                                                                        to: est.customer_email || '',
                                                                        subject,
                                                                        body,
                                                                        templateType: 'standard',
                                                                        has_proposal: !!latestProposal,
                                                                        proposal_filename: latestProposal?.filename || ''
                                                                    });
                                                                }}
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    width: '32px',
                                                                    height: '32px',
                                                                    background: 'rgba(255, 107, 0, 0.08)',
                                                                    color: 'var(--theme-primary)',
                                                                    border: '1px solid rgba(255, 107, 0, 0.15)',
                                                                    borderRadius: '8px',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s',
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.background = 'var(--theme-primary)';
                                                                    e.currentTarget.style.color = 'white';
                                                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 0, 0.25)';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.background = 'rgba(255, 107, 0, 0.08)';
                                                                    e.currentTarget.style.color = 'var(--theme-primary)';
                                                                    e.currentTarget.style.boxShadow = 'none';
                                                                }}
                                                                title={est.status === 'SUBMITTED' ? "Resend Email" : "Send via Email"}
                                                            >
                                                                {est.status === 'SUBMITTED' ? <Mails size={16} /> : <Mail size={16} />}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <Pagination
                        currentPage={currentPage}
                        totalItems={filteredEstimates.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={setCurrentPage}
                    />

                    {/* Email Modal rendered via Portal */}
                    {emailModal.open && createPortal(
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '5vh', zIndex: 9999 }}>
                            <div style={{ background: 'white', padding: '24px 32px 32px 32px', borderRadius: '16px', width: '850px', maxWidth: '95%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
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
                                                    onClick={() => handleViewPDF(emailModal.estimateId!)}
                                                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--theme-primary)', fontWeight: 600, textDecoration: 'underline' }}
                                                >
                                                    <Eye size={14} /> Combined Estimate & Proposal PDF
                                                </span>
                                                {emailModal.has_proposal && (
                                                    <span
                                                        onClick={() => {
                                                            const est = estimates.find(e => e.id === emailModal.estimateId);
                                                            const proposals = est?.proposals || [];
                                                            const latestProposal = proposals.length > 0 ? [...proposals].sort((a, b) => b.version - a.version)[0] : null;
                                                            if (latestProposal?.file) {
                                                                window.open(latestProposal.file, '_blank');
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
                                    <button className="ae-btn-secondary" onClick={() => setEmailModal({ ...emailModal, open: false })} disabled={sending} style={{ padding: '10px 24px' }}>Cancel</button>
                                    <button className="ae-btn-primary" onClick={handleSendEmail} disabled={sending} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 32px' }}>
                                        {sending ? <RefreshCcw className="animate-spin" size={18} /> : <Mail size={18} />}
                                        {sending ? 'Sending...' : 'Send Now'}
                                    </button>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}
                </div>
            </div>
        </div>
    );
};

export default EstimateDashboard;
