import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Download, XCircle, BarChart3, ChevronDown, FileText, FileSpreadsheet, Columns, Eye, Check, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { formatToAppDate } from '../utils/dateUtils';
import Pagination from './Pagination';

interface Invoice {
    id: number;
    invoice_no: string;
    deal: number;
    deal_no?: string;
    so_no?: string;
    customer_name: string;
    invoice_date: string;
    valid_until?: string;
    total_amount: number;
    currency: string;
    status: string;
    invoice_type: string;
    // Add other fields as needed based on API response
}

const EMAIL_TEMPLATES = {
    standard: {
        name: 'Standard Invoice',
        subject: (companyName: string, _customerName: string, invoiceNo: string) =>
            `Invoice ${invoiceNo} from ${companyName}`,
        body: (clientName: string, companyName: string, invoiceNo: string, yourName: string) =>
            `Dear ${clientName},\n\nGreetings from ${companyName} !!\n\nPlease find attached invoice ${invoiceNo} for your reference. The breakdown of costs is appended below.\n\nThank you for your business!\n\nBest regards,\n${yourName}`
    },
    followup: {
        name: 'Payment Follow-Up',
        subject: (companyName: string, _customerName: string, invoiceNo: string) =>
            `Follow-up: Invoice ${invoiceNo} from ${companyName}`,
        body: (clientName: string, _companyName: string, invoiceNo: string, yourName: string) =>
            `Dear ${clientName},\n\nI’m checking in regarding invoice ${invoiceNo}. Please let me know if you have any questions or if payment has already been processed.\n\nI’ve re-attached it here for your convenience.\n\nBest regards,\n${yourName}`
    }
};

const InvoiceDashboard: React.FC<{ onView: (id: number) => void }> = ({ onView }) => {
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFilters] = useState(true);
    const [activeDropdown, setActiveDropdown] = useState<'export' | 'reports' | 'columns' | null>(null);
    const showReports = activeDropdown === 'reports';
    const showExportMenu = activeDropdown === 'export';
    const showColumnMenu = activeDropdown === 'columns';
    const setShowReports = (val: boolean) => setActiveDropdown(val ? 'reports' : null);
    const setShowExportMenu = (val: boolean) => setActiveDropdown(val ? 'export' : null);
    const setShowColumnMenu = (val: boolean) => setActiveDropdown(val ? 'columns' : null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [reportModal, setReportModal] = useState<{ show: boolean; title: string; data: any; type: 'tax' | 'billing' | null }>({ show: false, title: '', data: null, type: null });
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    const ALL_COL_CONFIG = [
        { key: 'invoice_no', label: 'Invoice No', shortLabel: 'INV#' },
        { key: 'so_no', label: 'Sales Order Ref', shortLabel: 'SO#' },
        { key: 'deal_no', label: 'Deal ID', shortLabel: 'DEAL' },
        { key: 'customer', label: 'Customer', shortLabel: 'CUST.' },
        { key: 'date', label: 'Date', shortLabel: 'DATE' },
        { key: 'amount', label: 'Amount', shortLabel: 'AMT' },
        { key: 'type', label: 'Type', shortLabel: 'TYPE' },
        { key: 'status', label: 'Status', shortLabel: 'ST.' }
    ];

    const SHORT_COL_WIDTHS: Record<string, number> = {
        invoice_no: 40,
        so_no: 40,
        deal_no: 40,
        customer: 55,
        date: 45,
        amount: 50,
        type: 45,
        status: 35,
        actions: 60
    };

    const FULL_LABEL_WIDTHS: Record<string, number> = {
        invoice_no: 75,
        so_no: 85,
        deal_no: 65,
        customer: 120,
        date: 75,
        amount: 85,
        type: 85,
        status: 75
    };

    const MAX_COL_WIDTHS: Record<string, number> = {
        invoice_no: 120,
        so_no: 150,
        deal_no: 120,
        customer: 250,
        date: 120,
        amount: 150,
        type: 120,
        status: 120,
        actions: 120
    };

    const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
        const saved = localStorage.getItem('invoiceDashboard_colWidths');
        if (saved) return JSON.parse(saved);
        const defaults: Record<string, number> = {};
        ALL_COL_CONFIG.forEach(c => { defaults[c.key] = FULL_LABEL_WIDTHS[c.key] || 150; });
        return defaults;
    });

    const resizingRef = useRef<{ colKey: string; startWidth: number; startX: number } | null>(null);

    useEffect(() => {
        localStorage.setItem('invoiceDashboard_colWidths', JSON.stringify(colWidths));
    }, [colWidths]);

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
            const maxWidth = MAX_COL_WIDTHS[key] ?? 500;
            const newWidth = Math.min(maxWidth, Math.max(minWidth, resizingRef.current.startWidth + delta));
            setColWidths(prev => ({ ...prev, [key]: newWidth }));
        };

        const onMouseUp = () => {
            resizingRef.current = null;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const getColWidth = (key: string) => colWidths[key] ?? 150;

    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem('invoiceDashboard_visibleColumns');
        return saved ? JSON.parse(saved) : ALL_COL_CONFIG.map(c => c.key);
    });

    useEffect(() => {
        localStorage.setItem('invoiceDashboard_visibleColumns', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    const colsToShow = useMemo(() =>
        ALL_COL_CONFIG.filter(col => visibleColumns.includes(col.key)),
        [visibleColumns]
    );

    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filters State
    const [filters, setFilters] = useState({
        status: 'DRAFT',
        invoice_no: '',
        so_no: '',
        deal_no: '',
        customer_name: '',
        type: '',
        date_range: '',
        period: '', // For consistency with DealDashboard if needed
        date_input: '',
        amount_input: '',
        status_input: ''
    });

    useEffect(() => {
        fetchInvoices();
    }, []);

    // Reset page on filter change
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const statusParam = params.get('status');
        if (statusParam) {
            setFilters(prev => ({ ...prev, status: statusParam.toUpperCase() }));
        }
        setCurrentPage(1);
    }, [window.location.search]);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            // Fetch all invoices for client-side filtering to support tabs with counts
            const response = await api.get(`/finance/invoices/`);
            setInvoices(response.data);
        } catch (error) {
            console.error('Error fetching invoices', error);
            showNotification('Error fetching invoices', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (id: number, no: string) => {
        try {
            const response = await api.get(`/finance/invoices/${id}/download_pdf/`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Invoice_${no}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            showNotification('Error downloading PDF', 'error');
        }
    };


    const [emailModal, setEmailModal] = useState<{
        show: boolean;
        invoiceId: number | null;
        to: string;
        cc: string;
        bcc: string;
        subject: string;
        body: string;
        templateType: keyof typeof EMAIL_TEMPLATES;
        has_po: boolean;
        include_po: boolean;
        po_filename: string;
        loading: boolean;
    }>({
        show: false,
        invoiceId: null,
        to: '',
        cc: '',
        bcc: '',
        subject: '',
        body: '',
        templateType: 'standard',
        has_po: false,
        include_po: false,
        po_filename: '',
        loading: false
    });

    const openEmailModal = async (id: number) => {
        try {
            setLoading(true);
            const res = await api.get(`/finance/invoices/${id}/email_draft/`);
            const data = res.data;
            const inv = invoices.find(i => i.id === id);

            const companyName = "Automation Edge"; // Use global setting later if needed
            const clientName = inv?.customer_name || 'Customer';
            const yourName = "Sales Team"; // Or from auth context
            const invNo = inv?.invoice_no || '';

            const subject = EMAIL_TEMPLATES.standard.subject(companyName, clientName, invNo);
            const body = EMAIL_TEMPLATES.standard.body(clientName, companyName, invNo, yourName);

            setEmailModal({
                show: true,
                invoiceId: id,
                to: data.to,
                cc: '',
                bcc: '',
                subject: subject,
                body: body,
                templateType: 'standard',
                has_po: data.has_po,
                include_po: data.has_po, // Default to true if PO exists
                po_filename: data.po_filename,
                loading: false
            });
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Error fetching email draft', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleTemplateChange = (type: keyof typeof EMAIL_TEMPLATES) => {
        const inv = invoices.find(i => i.id === emailModal.invoiceId);
        if (!inv) return;

        const companyName = "Automation Edge";
        const clientName = inv.customer_name || 'Customer';
        const yourName = "Sales Team";
        const invNo = inv.invoice_no || '';

        const subject = EMAIL_TEMPLATES[type].subject(companyName, clientName, invNo);
        const body = EMAIL_TEMPLATES[type].body(clientName, companyName, invNo, yourName);

        setEmailModal(prev => ({
            ...prev,
            subject,
            body,
            templateType: type
        }));
    };

    const handleSendEmail = async () => {
        if (!emailModal.invoiceId) return;
        try {
            setEmailModal(prev => ({ ...prev, loading: true }));
            await api.post(`/finance/invoices/${emailModal.invoiceId}/send_email/`, {
                to: emailModal.to,
                cc: emailModal.cc,
                bcc: emailModal.bcc,
                subject: emailModal.subject,
                body: emailModal.body,
                include_po: emailModal.include_po
            });
            showNotification('Invoice emailed successfully', 'success');
            setEmailModal(prev => ({ ...prev, show: false, loading: false }));
            fetchInvoices();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Error sending email', 'error');
            setEmailModal(prev => ({ ...prev, loading: false }));
        }
    };

    const exportToExcel = async () => {
        setIsDownloading(true);
        try {
            const response = await api.get('/finance/invoices/export_excel/', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'Invoices_Report.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
            showNotification('Excel report downloaded successfully', 'success');
        } catch (error) {
            showNotification('Error downloading Excel report', 'error');
        } finally {
            setIsDownloading(false);
        }
    };

    const exportToPDF = async () => {
        setIsDownloading(true);
        try {
            const response = await api.get('/finance/invoices/export_pdf/', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'Invoices_Report.pdf');
            document.body.appendChild(link);
            link.click();
            link.remove();
            showNotification('PDF report downloaded successfully', 'success');
        } catch (error) {
            showNotification('Error downloading PDF report', 'error');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleReport = async (type: 'register' | 'tax_summary' | 'customer_billing') => {
        try {
            const res = await api.get(`/finance/invoices/report_${type}/`);

            if (type === 'tax_summary') {
                setReportModal({
                    show: true,
                    title: 'Tax Summary',
                    data: res.data,
                    type: 'tax'
                });
            } else if (type === 'customer_billing') {
                setReportModal({
                    show: true,
                    title: 'Customer-wise Billing',
                    data: res.data,
                    type: 'billing'
                });
            } else {
                showNotification(`${type.replace('_', ' ')} data logged to console`, 'info');
                console.log(`${type} report:`, res.data);
            }
        } catch (error) {
            showNotification('Error generating report', 'error');
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'PAID': return { bg: 'rgba(56, 161, 105, 0.1)', color: '#38A169', label: 'Paid' };
            case 'FINALISED': return { bg: 'rgba(0, 200, 83, 0.1)', color: '#00C853', label: 'Finalised' };
            case 'SUBMITTED': return { bg: 'rgba(159, 122, 234, 0.1)', color: '#9F7AEA', label: 'Submitted' };
            case 'CANCELLED': return { bg: 'rgba(160, 174, 192, 0.1)', color: '#A0AEC0', label: 'Cancelled' };
            case 'DRAFT':
            case 'OPEN': return { bg: 'rgba(113, 128, 150, 0.1)', color: '#718096', label: 'Draft' };
            default: return { bg: 'var(--bg-secondary)', color: 'var(--theme-primary)', label: status.replace('_', ' ') };
        }
    };

    // Client-side filtering
    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            const matchesStatus = filters.status === ''
                ? true
                : filters.status === 'FINALISED'
                    ? (inv.status === 'FINALISED' || inv.status === 'SUBMITTED')
                    : inv.status === filters.status;
            const matchesInvoiceNo = (inv.invoice_no || '').toLowerCase().includes(filters.invoice_no.toLowerCase());
            const matchesSO = (inv.so_no || '').toLowerCase().includes(filters.so_no.toLowerCase());
            const matchesDeal = (inv.deal_no || '').toLowerCase().includes(filters.deal_no.toLowerCase());
            const matchesCustomer = (inv.customer_name || '').toLowerCase().includes(filters.customer_name.toLowerCase());
            const matchesType = filters.type === '' || inv.invoice_type === filters.type;

            // Date logic
            let matchesDate = true;
            if (filters.date_range) {
                const invDate = new Date(inv.invoice_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (filters.date_range === 'last_month') {
                    const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    const lastOfLastMonth = new Date(firstOfThisMonth.getTime() - 1);
                    const firstOfLastMonth = new Date(lastOfLastMonth.getFullYear(), lastOfLastMonth.getMonth(), 1);
                    matchesDate = invDate >= firstOfLastMonth && invDate <= lastOfLastMonth;
                } else if (filters.date_range === 'last_3_months') {
                    const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    const lastOfLastMonth = new Date(firstOfThisMonth.getTime() - 1);
                    const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
                    matchesDate = invDate >= threeMonthsAgo && invDate <= lastOfLastMonth;
                } else if (filters.date_range === 'last_6_months') {
                    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1);
                    matchesDate = invDate >= sixMonthsAgo && invDate < new Date(today.getFullYear(), today.getMonth(), 1);
                } else if (filters.date_range === 'last_year') {
                    const lastYear = today.getFullYear() - 1;
                    const startOfYear = new Date(lastYear, 0, 1);
                    const endOfYear = new Date(lastYear, 11, 31, 23, 59, 59);
                    matchesDate = invDate >= startOfYear && invDate <= endOfYear;
                }
            }

            return matchesStatus && matchesInvoiceNo && matchesSO && matchesDeal && matchesCustomer && matchesType && matchesDate;
        });
    }, [invoices, filters]);

    const paginatedInvoices = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredInvoices.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredInvoices, currentPage]);

    const counts = useMemo(() => ({
        all: invoices.length,
        draft: invoices.filter(i => i.status === 'DRAFT').length,
        finalised: invoices.filter(i => i.status === 'FINALISED' || i.status === 'SUBMITTED').length,
        paid: invoices.filter(i => i.status === 'PAID').length
    }), [invoices]);

    const statusFlow = [
        { label: `Draft (${counts.draft})`, value: 'DRAFT' },
        { label: `Finalised (${counts.finalised})`, value: 'FINALISED' },
        { label: `Paid (${counts.paid})`, value: 'PAID' },
        { label: `All (${counts.all})`, value: '' }
    ];

    return (
        <div className="space-y-6">
            <div className="ae-table-container" style={{
                marginTop: '12px',
                marginBottom: '60px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'visible',
                maxHeight: 'none',
                overflowY: 'visible',
                background: 'white',
                padding: '0'
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
                    {/* Status Tabs - Left Side */}
                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        background: 'var(--bg-primary)',
                        padding: '6px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-primary)',
                        boxShadow: 'var(--shadow-sm)'
                    }}>
                        {statusFlow.map((flow) => {
                            const isActive = filters.status === flow.value;
                            return (
                                <button
                                    key={flow.value}
                                    onClick={() => setFilters({ ...filters, status: flow.value })}
                                    style={{
                                        padding: '5px 12px',
                                        borderRadius: '8px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        border: isActive ? '1px solid var(--theme-primary)' : '1px solid transparent',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        whiteSpace: 'nowrap',
                                        background: isActive ? 'var(--theme-primary)' : 'transparent',
                                        color: isActive ? 'white' : 'var(--text-secondary)',
                                        boxShadow: isActive ? 'var(--shadow-md)' : 'none'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isActive) {
                                            e.currentTarget.style.border = '1px solid var(--theme-primary)';
                                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 107, 0, 0.1)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isActive) {
                                            e.currentTarget.style.border = '1px solid transparent';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }
                                    }}
                                >
                                    {flow.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Actions (Period, Export, Reports, Filters, Columns) - Right Side */}
                    <div ref={wrapperRef} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Period:</span>
                            <select
                                className="ae-input"
                                value={filters.date_range}
                                onChange={e => setFilters({ ...filters, date_range: e.target.value })}
                                style={{ height: '32px', fontSize: '0.8rem', width: '130px', padding: '0 12px', lineHeight: '32px' }}
                            >
                                <option value="">All Time</option>
                                <option value="last_month">Last Month</option>
                                <option value="last_3_months">Last 3 Months</option>
                                <option value="last_6_months">Last 6 Months</option>
                                <option value="last_year">Last Year</option>
                            </select>
                        </div>

                        <div style={{ position: 'relative' }}>
                            <button
                                className="ae-btn-secondary"
                                disabled={isDownloading}
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 14px',
                                    fontSize: '0.8rem',
                                    fontWeight: 400,
                                    color: '#000000',
                                    border: (showExportMenu) ? '1px solid var(--theme-primary)' : '1px solid var(--ae-gray-100)',
                                    boxShadow: (showExportMenu) ? '0 0 0 3px rgba(255, 107, 0, 0.1)' : 'none',
                                    background: 'white'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isDownloading && !showExportMenu) {
                                        e.currentTarget.style.border = '1px solid var(--theme-primary)';
                                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 107, 0, 0.1)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isDownloading && !showExportMenu) {
                                        e.currentTarget.style.border = '1px solid var(--ae-gray-100)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }
                                }}
                            >
                                <Download size={16} color="#000000" /> Export <ChevronDown size={14} color="#000000" />
                            </button>
                            {showExportMenu && (
                                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--bg-primary)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', border: '1px solid var(--border-primary)', zIndex: 100, minWidth: '160px', overflow: 'hidden' }}>
                                    <button
                                        disabled={isDownloading}
                                        onClick={() => { exportToPDF(); setShowExportMenu(false); }}
                                        style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        <FileText size={16} style={{ color: '#DC2626' }} /> PDF Report
                                    </button>
                                    <button
                                        disabled={isDownloading}
                                        onClick={() => { exportToExcel(); setShowExportMenu(false); }}
                                        style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        <FileSpreadsheet size={16} style={{ color: '#2563EB' }} /> Excel Report
                                    </button>
                                </div>
                            )}
                        </div>

                        <div style={{ position: 'relative' }}>
                            <button
                                className="ae-btn-secondary"
                                onClick={() => setShowReports(!showReports)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 14px',
                                    fontSize: '0.8rem',
                                    fontWeight: 400,
                                    color: '#000000',
                                    border: (showReports) ? '1px solid var(--theme-primary)' : '1px solid var(--ae-gray-100)',
                                    boxShadow: (showReports) ? '0 0 0 3px rgba(255, 107, 0, 0.1)' : 'none',
                                    background: 'white'
                                }}
                                onMouseEnter={(e) => {
                                    if (!showReports) {
                                        e.currentTarget.style.border = '1px solid var(--theme-primary)';
                                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 107, 0, 0.1)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!showReports) {
                                        e.currentTarget.style.border = '1px solid var(--ae-gray-100)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }
                                }}
                            >
                                <BarChart3 size={16} color="#000000" /> Reports <ChevronDown size={14} color="#000000" />
                            </button>
                            {showReports && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: 0,
                                    marginTop: '8px',
                                    background: 'white',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                    border: '1px solid var(--border-primary)',
                                    zIndex: 100,
                                    minWidth: '160px',
                                    overflow: 'hidden'
                                }}>
                                    <button
                                        onClick={() => { handleReport('register'); setShowReports(false); }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '10px 16px',
                                            fontSize: '0.8rem',
                                            width: '100%',
                                            border: 'none',
                                            background: 'none',
                                            color: '#000',
                                            cursor: 'pointer',
                                            textAlign: 'left'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        Register
                                    </button>
                                    <button
                                        onClick={() => { handleReport('tax_summary'); setShowReports(false); }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '10px 16px',
                                            fontSize: '0.8rem',
                                            width: '100%',
                                            border: 'none',
                                            background: 'none',
                                            color: '#000',
                                            cursor: 'pointer',
                                            textAlign: 'left'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        Tax Summary
                                    </button>
                                    <button
                                        onClick={() => { handleReport('customer_billing'); setShowReports(false); }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '10px 16px',
                                            fontSize: '0.8rem',
                                            width: '100%',
                                            border: 'none',
                                            background: 'none',
                                            color: '#000',
                                            cursor: 'pointer',
                                            textAlign: 'left'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        Billing
                                    </button>
                                </div>
                            )}
                        </div>

                        <div style={{ position: 'relative' }}>
                            <button
                                className="ae-btn-secondary"
                                onClick={() => setShowColumnMenu(!showColumnMenu)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 14px',
                                    fontSize: '0.8rem',
                                    fontWeight: 400,
                                    color: '#000000',
                                    border: (showColumnMenu) ? '1px solid var(--theme-primary)' : '1px solid var(--ae-gray-100)',
                                    boxShadow: (showColumnMenu) ? '0 0 0 3px rgba(255, 107, 0, 0.1)' : 'none',
                                    background: 'white'
                                }}
                                onMouseEnter={(e) => {
                                    if (!showColumnMenu) {
                                        e.currentTarget.style.border = '1px solid var(--theme-primary)';
                                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 107, 0, 0.1)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!showColumnMenu) {
                                        e.currentTarget.style.border = '1px solid var(--ae-gray-100)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }
                                }}
                            >
                                <Columns size={16} color="#000000" /> Columns <ChevronDown size={14} color="#000000" />
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
                                        background: 'var(--bg-secondary)'
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
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                        {ALL_COL_CONFIG.map(col => (
                                            <label key={col.key} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '10px 16px',
                                                fontSize: '0.85rem',
                                                color: 'var(--text-primary)',
                                                cursor: 'pointer',
                                                userSelect: 'none',
                                                transition: 'background 0.2s',
                                                borderBottom: '1px solid var(--border-primary)'
                                            }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-primary)'}
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
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Table Area */}
                <div style={{ overflowX: 'auto', background: 'var(--bg-primary)', borderRadius: '0', border: '1px solid var(--border-primary)' }}>
                    <table className="ae-table compact-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                        <colgroup>
                            {colsToShow.map(col => (
                                <col key={col.key} style={{ width: getColWidth(col.key) }} />
                            ))}
                            <col style={{ width: 100 }} />
                        </colgroup>
                        <thead>
                            <tr>
                                {colsToShow.map(col => (
                                    <th key={col.key} style={{
                                        backgroundColor: 'var(--ae-table-header-bg)',
                                        position: 'relative',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        userSelect: 'none',
                                        padding: '4px 20px 4px 6px',
                                        borderRight: '1px solid var(--border-secondary)',
                                        borderBottom: '1px solid var(--border-secondary)',
                                        zIndex: 12,
                                        top: 0,
                                        color: 'var(--text-secondary)',
                                        textAlign: (col.key === 'amount') ? 'right' : 'left',
                                        textTransform: 'uppercase',
                                        fontSize: '0.7rem',
                                        fontWeight: 700
                                    }}>
                                        <span title={col.label}>
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
                                    top: 0,
                                    color: 'var(--text-secondary)',
                                    borderBottom: '1px solid var(--border-secondary)',
                                    textTransform: 'uppercase',
                                    padding: '4px 6px',
                                    fontSize: '0.7rem',
                                    fontWeight: 700
                                }}>Actions</th >
                            </tr>
                            {showFilters && (
                                <tr style={{ background: 'var(--ae-filter-row-bg)' }}>
                                    {colsToShow.map(col => (
                                        <th key={col.key} style={{ backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>
                                            <div className="ae-input-group" style={{ margin: 0 }}>
                                                {(() => {
                                                    switch (col.key) {
                                                        case 'invoice_no':
                                                            return <input
                                                                className="ae-input"
                                                                placeholder="Filter..."
                                                                value={filters.invoice_no}
                                                                onChange={e => setFilters({ ...filters, invoice_no: e.target.value })}
                                                                style={{ height: '24px', fontSize: '11px', paddingTop: 0, paddingBottom: 0 }}
                                                            />;
                                                        case 'so_no':
                                                            return <input
                                                                className="ae-input"
                                                                placeholder="Filter..."
                                                                value={filters.so_no}
                                                                onChange={e => setFilters({ ...filters, so_no: e.target.value })}
                                                                style={{ height: '24px', fontSize: '11px', paddingTop: 0, paddingBottom: 0 }}
                                                            />;
                                                        case 'deal_no':
                                                            return <input
                                                                className="ae-input"
                                                                placeholder="Filter..."
                                                                value={filters.deal_no}
                                                                onChange={e => setFilters({ ...filters, deal_no: e.target.value })}
                                                                style={{ height: '24px', fontSize: '11px', paddingTop: 0, paddingBottom: 0 }}
                                                            />;
                                                        case 'customer':
                                                            return <input
                                                                className="ae-input"
                                                                placeholder="Filter..."
                                                                value={filters.customer_name}
                                                                onChange={e => setFilters({ ...filters, customer_name: e.target.value })}
                                                                style={{ height: '24px', fontSize: '11px', paddingTop: 0, paddingBottom: 0 }}
                                                            />;
                                                        case 'date':
                                                            return <input
                                                                className="ae-input"
                                                                placeholder="Filter..."
                                                                value={filters.date_input}
                                                                onChange={e => setFilters({ ...filters, date_input: e.target.value })}
                                                                style={{ height: '24px', fontSize: '11px', paddingTop: 0, paddingBottom: 0 }}
                                                            />;
                                                        case 'amount':
                                                            return <input
                                                                className="ae-input"
                                                                placeholder="Filter..."
                                                                value={filters.amount_input}
                                                                onChange={e => setFilters({ ...filters, amount_input: e.target.value })}
                                                                style={{ height: '24px', fontSize: '11px', padding: '0 8px' }}
                                                            />;
                                                        case 'type':
                                                            return <select
                                                                className="ae-input"
                                                                value={filters.type}
                                                                onChange={e => setFilters({ ...filters, type: e.target.value })}
                                                                style={{ height: '24px', fontSize: '11px', padding: '0 4px' }}
                                                            >
                                                                <option value="">All</option>
                                                                <option value="Standard">Standard</option>
                                                                <option value="Proforma">Proforma</option>
                                                                <option value="Export">Export</option>
                                                                <option value="Service">Service</option>
                                                            </select>;
                                                        case 'status':
                                                            return <select
                                                                className="ae-input"
                                                                value={filters.status_input}
                                                                onChange={e => setFilters({ ...filters, status_input: e.target.value })}
                                                                style={{ height: '24px', fontSize: '11px', padding: '0 4px' }}
                                                            >
                                                                <option value="">All</option>
                                                                <option value="DRAFT">Draft</option>
                                                                <option value="PENDING_APPROVAL">Pending</option>
                                                                <option value="APPROVED">Approved</option>
                                                                <option value="SENT">Sent</option>
                                                                <option value="PAID">Paid</option>
                                                            </select>;
                                                        default:
                                                            return null;
                                                    }
                                                })()}
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
                                                status: 'DRAFT', invoice_no: '', so_no: '', deal_no: '', customer_name: '',
                                                type: '', date_range: '', period: '', date_input: '', amount_input: '', status_input: ''
                                            })}
                                            style={{ height: '24px', width: '100%', fontSize: '10px', color: 'var(--theme-primary)', fontWeight: 700, cursor: 'pointer', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px' }}
                                        >
                                            Clear
                                        </button>
                                    </th>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={visibleColumns.length + 1} style={{ textAlign: 'center', padding: '100px', color: 'var(--text-secondary)' }}>Loading...</td></tr>
                            ) : paginatedInvoices.length === 0 ? (
                                <tr><td colSpan={visibleColumns.length + 1} style={{ textAlign: 'center', padding: '100px', color: 'var(--text-secondary)' }}>No invoices found.</td></tr>
                            ) : (
                                paginatedInvoices.map((inv: Invoice) => (
                                    <tr key={inv.id}>
                                        {colsToShow.map(col => {
                                            const key = col.key;
                                            const cellStyle = {
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                fontSize: '0.75rem',
                                                padding: '4px 20px 4px 6px',
                                                verticalAlign: 'middle',
                                                borderBottom: '1px solid var(--border-secondary)'
                                            } as React.CSSProperties;

                                            switch (key) {
                                                case 'invoice_no':
                                                    return (
                                                        <td key={key}
                                                            style={{ ...cellStyle, fontWeight: 600, color: 'var(--theme-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                                                            onClick={() => onView(inv.id)}
                                                        >
                                                            {inv.invoice_no}
                                                        </td>
                                                    );
                                                case 'so_no':
                                                    return (
                                                        <td key={key} style={cellStyle}>
                                                            <span style={{ fontWeight: 600, color: '#4A5568' }}>{inv.so_no || '---'}</span>
                                                        </td>
                                                    );
                                                case 'deal_no':
                                                    return <td key={key}
                                                        style={{ ...cellStyle, fontWeight: 600, color: 'var(--theme-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                                                        onClick={() => navigate(`/deal?id=${inv.deal}`)}
                                                    >
                                                        {inv.deal_no}
                                                    </td>;
                                                case 'customer':
                                                    return <td key={key} style={cellStyle}>{inv.customer_name}</td>;
                                                case 'date':
                                                    return <td key={key} style={cellStyle}>{inv.invoice_date ? formatToAppDate(inv.invoice_date) : '---'}</td>;
                                                case 'amount':
                                                    return <td key={key} style={{ ...cellStyle, textAlign: 'right' }}>{inv.currency} {inv.total_amount.toLocaleString()}</td>;
                                                case 'type':
                                                    return <td key={key} style={cellStyle}>
                                                        <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                                                            {inv.invoice_type}
                                                        </span>
                                                    </td>;
                                                case 'status':
                                                    const style = getStatusStyle(inv.status);
                                                    return <td key={key} style={cellStyle}>
                                                        {inv.status === 'SUBMITTED' ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4A5568', fontSize: '0.65rem', fontWeight: 600 }}>
                                                                    <Check size={12} color="#00C853" /> Email Sent
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span style={{
                                                                padding: '4px 10px',
                                                                borderRadius: '99px',
                                                                fontSize: '0.7rem',
                                                                fontWeight: 700,
                                                                background: style.bg,
                                                                color: style.color
                                                            }}>
                                                                {style.label}
                                                            </span>
                                                        )}
                                                    </td>;
                                                default:
                                                    return null;
                                            }
                                        })}
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle', borderBottom: '1px solid var(--border-secondary)', padding: '4px 6px' }}>
                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
                                                <button
                                                    onClick={() => onView(inv.id)}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: '28px',
                                                        height: '28px',
                                                        background: 'rgba(255,107,0,0.08)',
                                                        color: 'var(--theme-primary)',
                                                        border: '1px solid rgba(255,107,0,0.25)',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        flexShrink: 0
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.currentTarget.style.background = 'var(--theme-primary)';
                                                        e.currentTarget.style.color = 'white';
                                                        e.currentTarget.style.borderColor = 'var(--theme-primary)';
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.currentTarget.style.background = 'rgba(255,107,0,0.08)';
                                                        e.currentTarget.style.color = 'var(--theme-primary)';
                                                        e.currentTarget.style.borderColor = 'rgba(255,107,0,0.25)';
                                                    }}
                                                    title="View Invoice"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDownload(inv.id, inv.invoice_no)}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: '28px',
                                                        height: '28px',
                                                        background: 'rgba(59,130,246,0.08)',
                                                        color: '#2563EB',
                                                        border: '1px solid rgba(59,130,246,0.25)',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        flexShrink: 0
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.currentTarget.style.background = '#2563EB';
                                                        e.currentTarget.style.color = 'white';
                                                        e.currentTarget.style.borderColor = '#2563EB';
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.currentTarget.style.background = 'rgba(59,130,246,0.08)';
                                                        e.currentTarget.style.color = '#2563EB';
                                                        e.currentTarget.style.borderColor = 'rgba(59,130,246,0.25)';
                                                    }}
                                                    title="Download Invoice"
                                                >
                                                    <Download size={15} />
                                                </button>
                                                {(inv.status === 'FINALISED' || inv.status === 'SUBMITTED') && (
                                                    <button
                                                        onClick={() => openEmailModal(inv.id)}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '28px',
                                                            height: '28px',
                                                            background: 'rgba(16,185,129,0.08)',
                                                            color: '#059669',
                                                            border: '1px solid rgba(16,185,129,0.25)',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            flexShrink: 0
                                                        }}
                                                        onMouseOver={(e) => {
                                                            e.currentTarget.style.background = '#059669';
                                                            e.currentTarget.style.color = 'white';
                                                            e.currentTarget.style.borderColor = '#059669';
                                                        }}
                                                        onMouseOut={(e) => {
                                                            e.currentTarget.style.background = 'rgba(16,185,129,0.08)';
                                                            e.currentTarget.style.color = '#059669';
                                                            e.currentTarget.style.borderColor = 'rgba(16,185,129,0.25)';
                                                        }}
                                                        title={inv.status === 'SUBMITTED' ? "Resend Email" : "Send Email"}
                                                    >
                                                        <Mail size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Pagination
                currentPage={currentPage}
                totalItems={filteredInvoices.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
            />

            {/* Report Modal */}
            {reportModal.show && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(2px)'
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        width: reportModal.type === 'tax' ? '400px' : '500px',
                        maxWidth: '95%',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        overflow: 'hidden',
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid var(--border-primary)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'var(--ae-table-header-bg)'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {reportModal.title}
                            </h3>
                            <button
                                onClick={() => setReportModal({ ...reportModal, show: false })}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        <div style={{ padding: '20px' }}>
                            {reportModal.type === 'tax' && reportModal.data && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    {[
                                        { label: 'CGST', value: reportModal.data.total_cgst },
                                        { label: 'SGST', value: reportModal.data.total_sgst },
                                        { label: 'IGST', value: reportModal.data.total_igst },
                                        { label: 'Sales Tax', value: reportModal.data.total_sales_tax }
                                    ].map((item, index) => (
                                        <div key={index} style={{
                                            padding: '12px 16px',
                                            borderRadius: '8px',
                                            background: 'white',
                                            border: '1px solid var(--border-primary)'
                                        }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 500 }}>{item.label}</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--theme-primary)' }}>
                                                ₹{(item.value || 0).toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {reportModal.type === 'billing' && reportModal.data && (
                                <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--border-secondary)', borderRadius: '8px' }}>
                                    <table className="ae-table compact-table" style={{ width: '100%', margin: 0 }}>
                                        <thead>
                                            <tr>
                                                <th style={{ background: 'var(--ae-table-header-bg)', fontSize: '0.75rem', position: 'sticky', top: 0, zIndex: 10 }}>Customer</th>
                                                <th style={{ background: 'var(--ae-table-header-bg)', fontSize: '0.75rem', textAlign: 'right', position: 'sticky', top: 0, zIndex: 10 }}>Inv</th>
                                                <th style={{ background: 'var(--ae-table-header-bg)', fontSize: '0.75rem', textAlign: 'right', position: 'sticky', top: 0, zIndex: 10 }}>Billed</th>
                                                <th style={{ background: 'var(--ae-table-header-bg)', fontSize: '0.75rem', textAlign: 'right', position: 'sticky', top: 0, zIndex: 10 }}>Outstanding</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportModal.data.map((c: any, i: number) => (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 600, fontSize: '0.8rem' }}>{c.customer_name}</td>
                                                    <td style={{ textAlign: 'right', fontSize: '0.8rem' }}>{c.total_invoices}</td>
                                                    <td style={{ textAlign: 'right', fontSize: '0.8rem' }}>₹{c.total_billed.toLocaleString()}</td>
                                                    <td style={{ textAlign: 'right', color: c.total_outstanding > 0 ? '#E53E3E' : 'inherit', fontSize: '0.8rem' }}>
                                                        ₹{c.total_outstanding.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Email Draft Modal */}
            {emailModal.show && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(2px)'
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        width: '700px',
                        maxWidth: '95%',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid var(--border-primary)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'var(--ae-table-header-bg)'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                Review Email Details
                            </h3>
                            <button
                                onClick={() => setEmailModal(prev => ({ ...prev, show: false }))}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ marginBottom: '8px' }}>
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

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>To:</label>
                                <input
                                    type="email"
                                    className="ae-input"
                                    value={emailModal.to}
                                    onChange={(e) => setEmailModal(prev => ({ ...prev, to: e.target.value }))}
                                    placeholder="customer@example.com"
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>CC:</label>
                                    <input
                                        type="text"
                                        className="ae-input"
                                        value={emailModal.cc}
                                        onChange={(e) => setEmailModal(prev => ({ ...prev, cc: e.target.value }))}
                                        placeholder="cc@example.com"
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>BCC:</label>
                                    <input
                                        type="text"
                                        className="ae-input"
                                        value={emailModal.bcc}
                                        onChange={(e) => setEmailModal(prev => ({ ...prev, bcc: e.target.value }))}
                                        placeholder="bcc@example.com"
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Subject:</label>
                                <input
                                    type="text"
                                    className="ae-input"
                                    value={emailModal.subject}
                                    onChange={(e) => setEmailModal(prev => ({ ...prev, subject: e.target.value }))}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Message Body:</label>
                                <textarea
                                    className="ae-input"
                                    style={{ height: '220px', resize: 'vertical' }}
                                    value={emailModal.body}
                                    onChange={(e) => setEmailModal(prev => ({ ...prev, body: e.target.value }))}
                                    placeholder="Write your message here..."
                                />
                                <span style={{ fontSize: '0.75rem', color: '#A0AEC0', fontStyle: 'italic', marginTop: '4px' }}>
                                    * The invoice details HTML table will be automatically appended below this message.
                                </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                                <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Attachments</h4>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                    <Check size={16} color="#00C853" />
                                    <span>Generated Invoice PDF</span>
                                </div>
                                {emailModal.has_po ? (
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                        <input
                                            type="checkbox"
                                            checked={emailModal.include_po}
                                            onChange={(e) => setEmailModal(prev => ({ ...prev, include_po: e.target.checked }))}
                                        />
                                        Include Purchase Order ({emailModal.po_filename})
                                    </label>
                                ) : (
                                    <div style={{ fontSize: '0.8rem', color: '#A0AEC0', fontStyle: 'italic' }}>
                                        No Purchase Order attached to this Sales Order.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '16px 20px',
                            borderTop: '1px solid var(--border-primary)',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '12px',
                            background: '#F8FAFC'
                        }}>
                            <button
                                onClick={() => setEmailModal(prev => ({ ...prev, show: false }))}
                                className="ae-button"
                                style={{ background: 'white', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}
                                disabled={emailModal.loading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendEmail}
                                className="ae-button"
                                style={{ background: 'var(--theme-primary)', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}
                                disabled={emailModal.loading || !emailModal.to}
                            >
                                <Mail size={16} />
                                {emailModal.loading ? 'Sending...' : 'Send Email'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default InvoiceDashboard;
