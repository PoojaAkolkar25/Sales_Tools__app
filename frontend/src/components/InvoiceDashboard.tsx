import React, { useState, useEffect, useMemo } from 'react';
import { Download, CheckCircle, XCircle, Mail, BarChart3, Eye, ChevronDown, FileText, FileSpreadsheet, Columns } from 'lucide-react';
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
    customer_name: string;
    invoice_date: string;
    valid_until?: string;
    total_amount: number;
    currency: string;
    status: string;
    invoice_type: string;
    // Add other fields as needed based on API response
}

const InvoiceDashboard: React.FC<{ onView: (id: number) => void }> = ({ onView }) => {
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFilters] = useState(true);
    const [showReports, setShowReports] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [reportModal, setReportModal] = useState<{ show: boolean; title: string; data: any; type: 'tax' | 'billing' | null }>({ show: false, title: '', data: null, type: null });
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    const ALL_COLUMNS = [
        { key: 'invoice_no', label: 'Invoice No' },
        { key: 'deal_no', label: 'Deal ID' },
        { key: 'customer', label: 'Customer' },
        { key: 'date', label: 'Date' },
        { key: 'amount', label: 'Amount' },
        { key: 'type', label: 'Type' },
        { key: 'status', label: 'Status' }
    ];

    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem('invoiceDashboard_visibleColumns');
        return saved ? JSON.parse(saved) : ALL_COLUMNS.map(c => c.key);
    });

    useEffect(() => {
        localStorage.setItem('invoiceDashboard_visibleColumns', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    // Filters State
    const [filters, setFilters] = useState({
        status: 'DRAFT',
        invoice_no: '',
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

    const handleAction = async (id: number, action: 'approve' | 'reject' | 'submit_for_approval') => {
        try {
            await api.post(`/finance/invoices/${id}/${action}/`);
            let label = action === 'submit_for_approval' ? 'submitted' : `${action}d`;
            showNotification(`Invoice ${label} successfully`, 'success');
            fetchInvoices();
        } catch (error) {
            showNotification(`Error performing action`, 'error');
        }
    };

    const handleSendEmail = async (id: number) => {
        try {
            await api.post(`/finance/invoices/${id}/send_email/`);
            showNotification('Invoice emailed successfully', 'success');
            fetchInvoices();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Error sending email', 'error');
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
            case 'PAID': return { bg: 'rgba(56, 161, 105, 0.1)', color: '#38A169' };
            case 'APPROVED': return { bg: 'rgba(49, 130, 206, 0.1)', color: '#3182CE' };
            case 'PENDING_APPROVAL': return { bg: 'var(--bg-secondary)', color: 'var(--theme-primary)' };
            case 'SENT': return { bg: 'rgba(159, 122, 234, 0.1)', color: '#9F7AEA' };
            case 'CANCELLED': return { bg: 'rgba(160, 174, 192, 0.1)', color: '#A0AEC0' };
            case 'DRAFT': return { bg: 'var(--bg-secondary)', color: 'var(--text-secondary)' };
            default: return { bg: 'rgba(187, 77, 0, 0.1)', color: 'var(--theme-primary)' };
        }
    };

    // Client-side filtering
    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            const matchesStatus = filters.status === '' || inv.status === filters.status;
            const matchesInvoiceNo = (inv.invoice_no || '').toLowerCase().includes(filters.invoice_no.toLowerCase());
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

            return matchesStatus && matchesInvoiceNo && matchesDeal && matchesCustomer && matchesType && matchesDate;
        });
    }, [invoices, filters]);

    const paginatedInvoices = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredInvoices.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredInvoices, currentPage]);

    const counts = useMemo(() => ({
        all: invoices.length,
        draft: invoices.filter(i => i.status === 'DRAFT').length,
        pending: invoices.filter(i => i.status === 'PENDING_APPROVAL').length,
        approved: invoices.filter(i => i.status === 'APPROVED').length,
        sent: invoices.filter(i => i.status === 'SENT').length,
        paid: invoices.filter(i => i.status === 'PAID').length
    }), [invoices]);

    const statusFlow = [
        { label: `Draft (${counts.draft})`, value: 'DRAFT' },
        { label: `Pending (${counts.pending})`, value: 'PENDING_APPROVAL' },
        { label: `Approved (${counts.approved})`, value: 'APPROVED' },
        { label: `Sent (${counts.sent})`, value: 'SENT' },
        { label: `Paid (${counts.paid})`, value: 'PAID' },
        { label: `All (${counts.all})`, value: '' }
    ];

    return (
        <div className="space-y-6">
            <div className="ae-table-container" style={{
                marginTop: '12px',
                marginBottom: '60px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                maxHeight: 'none',
                overflowY: 'visible'
            }}>
                {/* Controls Status Tabs and Actions - Padded Header Area */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-primary)',
                    whiteSpace: 'nowrap',
                    position: 'relative'
                }}>
                    {/* Status Tabs - Left Side */}
                    <div style={{
                        display: 'flex',
                        gap: '2px',
                        background: 'white',
                        padding: '4px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-primary)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                        width: 'fit-content'
                    }}>
                        {statusFlow.map((flow) => (
                            <button
                                key={flow.value}
                                onClick={() => setFilters({ ...filters, status: flow.value })}
                                style={{
                                    padding: '5px 10px',
                                    borderRadius: '8px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: filters.status === flow.value ? 'var(--theme-primary)' : 'transparent',
                                    color: filters.status === flow.value ? 'white' : 'var(--text-secondary)',
                                    boxShadow: filters.status === flow.value ? 'var(--shadow-md)' : 'none'
                                }}
                            >
                                {flow.label}
                            </button>
                        ))}
                    </div>

                    {/* Actions (Period, Export, Reports, Filters, Columns) - Right Side */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Period:</span>
                            <select
                                className="ae-input"
                                value={filters.date_range}
                                onChange={e => setFilters({ ...filters, date_range: e.target.value })}
                                style={{ height: '32px', fontSize: '0.8rem', width: '130px', padding: '0 12px' }}
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
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: 'white',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                <Download size={16} /> Export <ChevronDown size={14} />
                            </button>
                            {showExportMenu && (
                                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', border: '1px solid var(--border-primary)', zIndex: 100, minWidth: '160px', overflow: 'hidden' }}>
                                    <button
                                        disabled={isDownloading}
                                        onClick={() => { exportToExcel(); setShowExportMenu(false); }}
                                        style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        <FileSpreadsheet size={16} style={{ color: '#2F855A' }} /> Excel Report
                                    </button>
                                    <button
                                        disabled={isDownloading}
                                        onClick={() => { exportToPDF(); setShowExportMenu(false); }}
                                        style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        <FileText size={16} style={{ color: '#E53E3E' }} /> PDF Report
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
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: showReports ? 'var(--bg-secondary)' : 'white',
                                    color: showReports ? 'var(--theme-primary)' : 'var(--text-secondary)',
                                    borderColor: showReports ? 'var(--theme-primary)' : 'var(--border-primary)',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                <BarChart3 size={16} /> Reports <ChevronDown size={14} />
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
                                            color: 'var(--text-primary)',
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
                                            color: 'var(--text-primary)',
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
                                            color: 'var(--text-primary)',
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
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: 'white',
                                    color: 'var(--text-secondary)',
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
                                            onClick={() => setVisibleColumns(ALL_COLUMNS.map(c => c.key))}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--ae-blue)',
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
                                            Select All
                                        </button>
                                        <button
                                            onClick={() => setVisibleColumns([])}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--text-tertiary)',
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
                                    {ALL_COLUMNS.map(col => (
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
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                        >
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
                                                style={{
                                                    cursor: 'pointer',
                                                    width: '16px',
                                                    height: '16px',
                                                    accentColor: 'var(--theme-primary)'
                                                }}
                                            />
                                            <span style={{ fontWeight: 600 }}>{col.label}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Table Area */}
                <div style={{ overflowX: 'auto' }}>
                    <table className="ae-table" style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                {visibleColumns.map(key => {
                                    const col = ALL_COLUMNS.find(c => c.key === key);
                                    if (!col) return null;
                                    return (
                                        <th key={key} style={{
                                            height: '40px',
                                            top: 0,
                                            whiteSpace: 'nowrap',
                                            zIndex: 12,
                                            backgroundColor: 'var(--bg-secondary)',
                                            textAlign: (key === 'amount') ? 'right' : 'left'
                                        }}>
                                            {col.label}
                                        </th>
                                    );
                                })}
                                <th style={{ height: '40px', textAlign: 'center', top: 0, whiteSpace: 'nowrap', zIndex: 12, backgroundColor: 'var(--bg-secondary)', minWidth: '100px' }}>Actions</th>
                            </tr>
                            {showFilters && (
                                <tr>
                                    {visibleColumns.map(key => {
                                        const col = ALL_COLUMNS.find(c => c.key === key);
                                        if (!col) return null;

                                        const renderFilter = () => {
                                            switch (key) {
                                                case 'invoice_no':
                                                    return <input
                                                        className="ae-input"
                                                        placeholder="Filter..."
                                                        value={filters.invoice_no}
                                                        onChange={e => setFilters({ ...filters, invoice_no: e.target.value })}
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
                                                        style={{ height: '24px', fontSize: '11px', width: '80px', paddingTop: 0, paddingBottom: 0 }}
                                                    />;
                                                case 'type':
                                                    return <select
                                                        className="ae-input"
                                                        value={filters.type}
                                                        onChange={e => setFilters({ ...filters, type: e.target.value })}
                                                        style={{ height: '24px', fontSize: '11px', paddingTop: 0, paddingBottom: 0 }}
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
                                                        style={{ height: '24px', fontSize: '11px', paddingTop: 0, paddingBottom: 0 }}
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
                                        };

                                        return (
                                            <th key={key} style={{ top: '40px', zIndex: 11, backgroundColor: 'var(--bg-secondary)' }}>
                                                <div className="ae-input-group" style={{ margin: 0 }}>
                                                    {renderFilter()}
                                                </div>
                                            </th>
                                        );
                                    })}
                                    <th style={{ textAlign: 'center', top: '40px', position: 'sticky', backgroundColor: 'var(--bg-secondary)', zIndex: 11, minWidth: '100px' }}>
                                        <button
                                            onClick={() => setFilters({
                                                status: 'DRAFT', invoice_no: '', deal_no: '', customer_name: '',
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
                                        {visibleColumns.map(key => {
                                            switch (key) {
                                                case 'invoice_no':
                                                    return (
                                                        <td key={key}
                                                            style={{ fontWeight: 700, color: 'var(--theme-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                                                            onClick={() => onView(inv.id)}
                                                        >
                                                            {inv.invoice_no}
                                                        </td>
                                                    );
                                                case 'deal_no':
                                                    return <td key={key}
                                                        style={{ fontWeight: 700, color: 'var(--ae-blue)', cursor: 'pointer', textDecoration: 'underline' }}
                                                        onClick={() => navigate(`/deal?id=${inv.deal}`)}
                                                    >
                                                        {inv.deal_no}
                                                    </td>;
                                                case 'customer':
                                                    return <td key={key}>{inv.customer_name}</td>;
                                                case 'date':
                                                    return <td key={key}>{inv.invoice_date ? formatToAppDate(inv.invoice_date) : '---'}</td>;
                                                case 'amount':
                                                    return <td key={key} style={{ fontWeight: 600, textAlign: 'right' }}>{inv.currency} {inv.total_amount.toLocaleString()}</td>;
                                                case 'type':
                                                    return <td key={key}>
                                                        <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                                                            {inv.invoice_type}
                                                        </span>
                                                    </td>;
                                                case 'status':
                                                    return <td key={key}>
                                                        <span style={{
                                                            fontSize: '0.7rem',
                                                            padding: '4px 10px',
                                                            borderRadius: '20px',
                                                            fontWeight: 800,
                                                            letterSpacing: '0.5px',
                                                            textTransform: 'uppercase',
                                                            ...getStatusStyle(inv.status)
                                                        }}>
                                                            {inv.status.replace('_', ' ')}
                                                        </span>
                                                    </td>;
                                                default:
                                                    return null;
                                            }
                                        })}
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button onClick={() => handleDownload(inv.id, inv.invoice_no)} title="Download PDF" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                                                    <Download size={16} />
                                                </button>
                                                <button onClick={() => onView(inv.id)} title="View Invoice" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                                                    <Eye size={16} />
                                                </button>
                                                {inv.status === 'PENDING_APPROVAL' && (
                                                    <>
                                                        <button onClick={() => handleAction(inv.id, 'approve')} title="Approve" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--semantic-success)' }}>
                                                            <CheckCircle size={16} />
                                                        </button>
                                                        <button onClick={() => handleAction(inv.id, 'reject')} title="Reject" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--semantic-error)' }}>
                                                            <XCircle size={16} />
                                                        </button>
                                                    </>
                                                )}
                                                {inv.status === 'APPROVED' && <button onClick={() => handleSendEmail(inv.id)} title="Send Email" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                                                    <Mail size={16} />
                                                </button>}
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
                        borderRadius: '16px',
                        width: '500px',
                        maxWidth: '95%',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        overflow: 'hidden',
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        <div style={{
                            padding: '20px',
                            borderBottom: '1px solid var(--border-primary)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'var(--bg-secondary)'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {reportModal.title}
                            </h3>
                            <button
                                onClick={() => setReportModal({ ...reportModal, show: false })}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        <div style={{ padding: '24px' }}>
                            {reportModal.type === 'tax' && reportModal.data && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    {[
                                        { label: 'CGST', value: reportModal.data.total_cgst },
                                        { label: 'SGST', value: reportModal.data.total_sgst },
                                        { label: 'IGST', value: reportModal.data.total_igst },
                                        { label: 'Sales Tax', value: reportModal.data.total_sales_tax }
                                    ].map((item, index) => (
                                        <div key={index} style={{
                                            padding: '16px',
                                            borderRadius: '12px',
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-primary)'
                                        }}>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{item.label}</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--theme-primary)' }}>
                                                ₹{(item.value || 0).toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {reportModal.type === 'billing' && reportModal.data && (
                                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                    <table className="ae-table" style={{ width: '100%' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ background: 'var(--bg-secondary)', fontSize: '0.75rem' }}>Customer</th>
                                                <th style={{ background: 'var(--bg-secondary)', fontSize: '0.75rem', textAlign: 'right' }}>Inv</th>
                                                <th style={{ background: 'var(--bg-secondary)', fontSize: '0.75rem', textAlign: 'right' }}>Billed</th>
                                                <th style={{ background: 'var(--bg-secondary)', fontSize: '0.75rem', textAlign: 'right' }}>Outstanding</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportModal.data.map((c: any, i: number) => (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 600 }}>{c.customer_name}</td>
                                                    <td style={{ textAlign: 'right' }}>{c.total_invoices}</td>
                                                    <td style={{ textAlign: 'right' }}>₹{c.total_billed.toLocaleString()}</td>
                                                    <td style={{ textAlign: 'right', color: c.total_outstanding > 0 ? '#E53E3E' : 'inherit' }}>
                                                        ₹{c.total_outstanding.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div style={{
                            padding: '16px 24px',
                            borderTop: '1px solid var(--border-primary)',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            background: '#F7FAFC'
                        }}>
                            <button
                                onClick={() => setReportModal({ ...reportModal, show: false })}
                                className="ae-btn-secondary"
                                style={{ padding: '8px 24px' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default InvoiceDashboard;
