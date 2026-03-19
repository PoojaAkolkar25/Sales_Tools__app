import React, { useState, useEffect, useRef } from 'react';
import {
    Download,
    Search,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Columns,
    FileSpreadsheet,
    FileText,
    Loader2,
    Check,
    Eye,
    Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { formatToAppDate } from '../utils/dateUtils';
import Pagination from './Pagination';

interface SalesOrderDashboardProps {
    onView: (id: number) => void;
    refreshKey?: number;
}

const ALL_COL_CONFIG = [
    { key: 'deal_id', label: 'Deal ID', shortLabel: 'DEAL' },
    { key: 'so_number', label: 'SO Number', shortLabel: 'SO#' },
    { key: 'order_date', label: 'Order Date', shortLabel: 'DATE' },
    { key: 'customer', label: 'Customer', shortLabel: 'CUST.' },
    { key: 'cust_id', label: 'Customer ID', shortLabel: 'ID' },
    { key: 'po_number', label: 'PO Number', shortLabel: 'PO#' },
    { key: 'items', label: 'Items (Summary)', shortLabel: 'ITEMS' },
    { key: 'status', label: 'Status', shortLabel: 'ST.' },
    { key: 'amount', label: 'Amount', shortLabel: 'AMT' },
    { key: 'amount_inr', label: 'INR Amount', shortLabel: 'INR' },
    { key: 'po_date', label: 'PO Date', shortLabel: 'PO DT' },
    { key: 'actions', label: 'Actions', shortLabel: 'ACT.' },
];

const SHORT_COL_WIDTHS: Record<string, number> = {
    deal_id: 40,
    so_number: 55,
    order_date: 55,
    customer: 75,
    cust_id: 55,
    po_number: 60,
    items: 75,
    status: 45,
    amount: 55,
    amount_inr: 55,
    po_date: 60,
    actions: 60
};

const FULL_LABEL_WIDTHS: Record<string, number> = {
    deal_id: 60,
    so_number: 85,
    order_date: 90,
    customer: 120,
    cust_id: 80,
    po_number: 95,
    items: 110,
    status: 75,
    amount: 90,
    amount_inr: 100,
    po_date: 85,
    actions: 100
};

const MAX_COL_WIDTHS: Record<string, number> = {
    deal_id: 100,
    so_number: 150,
    order_date: 150,
    customer: 250,
    cust_id: 120,
    po_number: 180,
    items: 300,
    status: 120,
    amount: 150,
    amount_inr: 150,
    po_date: 120,
    actions: 120
};

const SalesOrderDashboard: React.FC<SalesOrderDashboardProps> = ({ onView, refreshKey }) => {
    const navigate = useNavigate();
    const [salesOrders, setSalesOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({
        deal_id: '',
        so_number: '',
        order_date: '',
        customer_name: '',
        customer_code: '',
        po_number: '',
        items_summary: '',
        amount: '',
        amount_inr: '',
        po_date: '',
        status: ''
    });

    const [visibleColumns, setVisibleColumns] = useState(() => {
        const saved = localStorage.getItem('salesOrderDashboard_visibleColumns');
        return saved ? JSON.parse(saved) : {
            deal_id: true,
            so_number: true,
            order_date: true,
            customer: true,
            cust_id: true,
            po_number: true,
            items: true,
            status: true,
            amount: true,
            amount_inr: true,
            po_date: true,
            actions: true
        };
    });

    useEffect(() => {
        localStorage.setItem('salesOrderDashboard_visibleColumns', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
        const saved = localStorage.getItem('salesOrderDashboard_colWidths');
        if (saved) return JSON.parse(saved);
        const defaults: Record<string, number> = {};
        ALL_COL_CONFIG.forEach(c => { defaults[c.key] = FULL_LABEL_WIDTHS[c.key] || 150; });
        return defaults;
    });

    useEffect(() => {
        localStorage.setItem('salesOrderDashboard_colWidths', JSON.stringify(colWidths));
    }, [colWidths]);

    const exportMenuRef = useRef<HTMLDivElement>(null);
    const columnMenuRef = useRef<HTMLDivElement>(null);
    const tableScrollRef = useRef<HTMLDivElement>(null);

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
            const maxWidth = MAX_COL_WIDTHS[key] ?? 400;
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

    const toggleColumn = (col: keyof typeof visibleColumns) => {
        setVisibleColumns((prev: any) => ({ ...prev, [col]: !prev[col] }));
    };
    const ITEMS_PER_PAGE = 20;
    const [stats, setStats] = useState({
        draft: 0,
        pending: 0,
        reverted: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0,
        all: 0
    });
    const { showNotification } = useNotification();

    useEffect(() => {
        fetchSalesOrders();
    }, [refreshKey]);

    const fetchSalesOrders = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/sales-orders/?_t=${new Date().getTime()}`);
            console.log('Fetched Sales Orders:', response.data.length);
            setSalesOrders(response.data);

            // Stats are updated based on status filtering
            setStats({
                draft: response.data.filter((so: any) => so.status === 'DRAFT').length,
                pending: response.data.filter((so: any) => so.status === 'PENDING_APPROVAL' || so.status === 'SUBMITTED').length,
                reverted: response.data.filter((so: any) => so.status === 'REVERTED').length,
                approved: response.data.filter((so: any) => so.status === 'APPROVED').length,
                rejected: response.data.filter((so: any) => so.status === 'REJECTED').length,
                cancelled: response.data.filter((so: any) => so.status === 'CANCELLED').length,
                all: response.data.length
            });
        } catch (error) {
            console.error('Error fetching sales orders', error);
            showNotification('Failed to load sales orders', 'error');
        } finally {
            setLoading(false);
        }
    };

    const [selectedStatus, setSelectedStatus] = useState('DRAFT');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

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

    const filteredSalesOrders = salesOrders.filter((so: any) => {
        const matchesDealId = (so.deal_id || '').toLowerCase().includes(filters.deal_id.toLowerCase());
        const matchesSONumber = (so.so_number || '').toLowerCase().includes(filters.so_number.toLowerCase());
        const matchesOrderDate = (so.order_date ? formatToAppDate(so.order_date) : '').toLowerCase().includes(filters.order_date.toLowerCase());
        const matchesCustomer = (so.customer_name || '').toLowerCase().includes(filters.customer_name.toLowerCase());
        const matchesCustCode = (so.cust_id || '').toLowerCase().includes(filters.customer_code.toLowerCase());
        const matchesPONumber = (so.po_number || '').toLowerCase().includes(filters.po_number.toLowerCase());
        const matchesItems = (so.items && so.items.length > 0 ? so.items[0].description || so.items[0].product_name || '' : '').toLowerCase().includes(filters.items_summary.toLowerCase());
        const matchesAmount = `${so.currency || ''} ${parseFloat(so.total_amount || 0).toLocaleString()}`.toLowerCase().includes(filters.amount.toLowerCase());
        const matchesAmountInr = (so.amount_inr || '').toString().toLowerCase().includes(filters.amount_inr.toLowerCase());
        const matchesPODate = (so.po_date ? formatToAppDate(so.po_date) : (so.order_date ? formatToAppDate(so.order_date) : '')).toLowerCase().includes(filters.po_date.toLowerCase());
        const matchesStatusFilter = (so.status || '').toLowerCase().includes(filters.status.toLowerCase());

        const matchesStatus = selectedStatus === '' ? true :
            (selectedStatus === 'PENDING_APPROVAL' ? (so.status === 'PENDING_APPROVAL' || so.status === 'SUBMITTED') : so.status === selectedStatus);

        return matchesDealId && matchesSONumber && matchesOrderDate && matchesCustomer &&
            matchesCustCode && matchesPONumber && matchesItems && matchesAmount &&
            matchesAmountInr && matchesPODate && matchesStatusFilter && matchesStatus;
    });

    const statusFlow = [
        { label: `Draft (${stats.draft})`, value: 'DRAFT' },
        { label: `Pending (${stats.pending})`, value: 'PENDING_APPROVAL' },
        { label: `Approved (${stats.approved})`, value: 'APPROVED' },
        { label: `Rejected (${stats.rejected})`, value: 'REJECTED' },
        { label: `Reverted (${stats.reverted})`, value: 'REVERTED' },
        { label: `All (${stats.all})`, value: '' }
    ];

    const paginatedSalesOrders = React.useMemo(() => {
        return filteredSalesOrders.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        );
    }, [filteredSalesOrders, currentPage]);

    const exportToExcel = async () => {
        try {
            const response = await api.get('/sales-orders/export_excel/', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Sales_Orders_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
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
            const response = await api.get('/sales-orders/export_pdf/', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Sales_Orders_Report_${new Date().toISOString().split('T')[0]}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            showNotification('PDF report generated successfully', 'success');
        } catch (error) {
            showNotification('Error generating PDF report', 'error');
        }
    };

    const handleDownloadReport = async (soId: number, soNumber: string) => {
        try {
            const response = await api.get(`/sales-orders/${soId}/download_pdf/`, { responseType: 'blob' });
            const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', `Sales_Order_${soNumber || soId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            showNotification('Report downloaded successfully', 'success');
        } catch (error) {
            console.error('Download failed', error);
            showNotification('Failed to download report', 'error');
        }
    };


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
                {/* Header Controls Area */}
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
                        gap: '4px',
                        background: 'var(--bg-primary)',
                        padding: '6px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-primary)',
                        boxShadow: 'var(--shadow-sm)'
                    }}>
                        {statusFlow.map((flow) => {
                            const isActive = selectedStatus === flow.value;
                            return (
                                <button
                                    key={flow.value}
                                    onClick={() => setSelectedStatus(flow.value)}
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

                    {/* Right Side Actions */}
                    <div ref={wrapperRef} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Period:</span>
                            <select
                                className="ae-input"
                                style={{ height: '32px', fontSize: '0.8rem', width: '130px', padding: '0 12px', lineHeight: '32px' }}
                            >
                                <option value="">All Time</option>
                            </select>
                        </div>

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
                                    fontWeight: 400,
                                    color: '#000000',
                                    border: (showExportMenu) ? '1px solid var(--theme-primary)' : '1px solid var(--ae-gray-100)',
                                    boxShadow: (showExportMenu) ? '0 0 0 3px rgba(255, 107, 0, 0.1)' : 'none',
                                    background: 'white'
                                }}
                                onMouseEnter={(e) => {
                                    if (!showExportMenu) {
                                        e.currentTarget.style.border = '1px solid var(--theme-primary)';
                                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 107, 0, 0.1)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!showExportMenu) {
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
                                        onClick={() => { exportToPDF(); setShowExportMenu(false); }}
                                        style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        <FileText size={16} style={{ color: '#DC2626' }} /> PDF Report
                                    </button>
                                    <button
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
                                    background: 'var(--bg-primary)',
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
                                            onClick={() => setVisibleColumns({
                                                deal_id: true,
                                                so_number: true,
                                                order_date: true,
                                                customer: true,
                                                cust_id: true,
                                                po_number: true,
                                                items: true,
                                                status: true,
                                                amount: true,
                                                amount_inr: true,
                                                po_date: true,
                                                actions: true
                                            })}
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
                                            onClick={() => setVisibleColumns({
                                                deal_id: false,
                                                so_number: false,
                                                order_date: false,
                                                customer: false,
                                                cust_id: false,
                                                po_number: false,
                                                items: false,
                                                status: false,
                                                amount: false,
                                                amount_inr: false,
                                                po_date: false,
                                                actions: true
                                            })}
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
                                        {Object.entries({
                                            deal_id: 'Deal ID',
                                            so_number: 'SO Number',
                                            order_date: 'Order Date',
                                            customer: 'Customer',
                                            cust_id: 'Customer ID',
                                            po_number: 'PO Number',
                                            items: 'Items',
                                            status: 'Status',
                                            amount: 'Amount',
                                            amount_inr: 'INR Amount',
                                            po_date: 'PO Date',
                                            actions: 'Actions'
                                        }).map(([id, label]) => (
                                            <label
                                                key={id}
                                                style={{
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
                                                    onClick={() => toggleColumn(id as keyof typeof visibleColumns)}
                                                    style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        borderRadius: '4px',
                                                        border: `2px solid ${visibleColumns[id as keyof typeof visibleColumns] ? 'var(--ae-blue)' : '#CBD5E1'}`,
                                                        background: visibleColumns[id as keyof typeof visibleColumns] ? 'var(--ae-blue)' : 'white',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.2s',
                                                        flexShrink: 0
                                                    }}>
                                                    {visibleColumns[id as keyof typeof visibleColumns] && <Check size={12} color="white" strokeWidth={4} />}
                                                </div>
                                                <span style={{ fontWeight: 600 }}>{label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ position: 'relative' }}>
                    {/* Left scroll button */}
                    <button
                        onClick={() => tableScrollRef.current?.scrollBy({ left: -150, behavior: 'smooth' })}
                        style={{
                            position: 'absolute',
                            left: '-8px',
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
                            right: '-8px',
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

                    <div ref={tableScrollRef} style={{ overflowX: 'auto', background: 'var(--bg-primary)', borderRadius: '0', border: '1px solid var(--border-primary)' }}>
                        <table className="ae-table compact-table" style={{ tableLayout: 'fixed', width: 'max-content' }}>
                            <colgroup>
                                {ALL_COL_CONFIG.filter(col => visibleColumns[col.key as keyof typeof visibleColumns]).map(col => (
                                    <col key={col.key} style={{ width: `${getColWidth(col.key)}px` }} />
                                ))}
                            </colgroup>
                            <thead>
                                <tr>
                                    {ALL_COL_CONFIG.filter(col => visibleColumns[col.key as keyof typeof visibleColumns]).map(col => (
                                        <th key={col.key} style={{
                                            backgroundColor: 'var(--ae-table-header-bg)',
                                            textTransform: 'uppercase',
                                            position: 'relative',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            userSelect: 'none',
                                            padding: '4px 20px 4px 6px',
                                            borderRight: '1px solid var(--border-secondary)',
                                            borderBottom: '1px solid var(--border-secondary)',
                                            textAlign: col.key === 'actions' ? 'center' : 'left',
                                            fontSize: '0.7rem',
                                            fontWeight: 700
                                        }}>
                                            <span title={col.label}>
                                                {getColWidth(col.key) < (SHORT_COL_WIDTHS[col.key] + 5)
                                                    ? col.shortLabel
                                                    : col.label}
                                            </span>
                                            {col.key !== 'actions' && (
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
                                            )}
                                        </th>
                                    ))}
                                </tr>
                                <tr style={{ background: 'var(--ae-filter-row-bg)' }}>
                                    {ALL_COL_CONFIG.filter(col => visibleColumns[col.key as keyof typeof visibleColumns]).map(col => (
                                        <th key={col.key} style={{ backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>
                                            {col.key !== 'actions' ? (
                                                <div className="ae-input-group">
                                                    <Search className="ae-search-icon" size={12} />
                                                    <input
                                                        className="ae-input"
                                                        placeholder="Filter..."
                                                        value={(filters as any)[col.key === 'customer' ? 'customer_name' : col.key === 'cust_id' ? 'customer_code' : col.key === 'items' ? 'items_summary' : col.key] || ''}
                                                        onChange={e => setFilters({ ...filters, [col.key === 'customer' ? 'customer_name' : col.key === 'cust_id' ? 'customer_code' : col.key === 'items' ? 'items_summary' : col.key]: e.target.value })}
                                                        style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                                    />
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setFilters({
                                                        deal_id: '',
                                                        so_number: '',
                                                        order_date: '',
                                                        customer_name: '',
                                                        customer_code: '',
                                                        po_number: '',
                                                        items_summary: '',
                                                        amount: '',
                                                        amount_inr: '',
                                                        po_date: '',
                                                        status: ''
                                                    })}
                                                    style={{ height: '20px', width: '100%', fontSize: '10px', color: 'var(--theme-primary)', fontWeight: 700, cursor: 'pointer', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px' }}
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={10} style={{ textAlign: 'center', padding: '100px' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></td>
                                    </tr>
                                ) : paginatedSalesOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={Object.values(visibleColumns).filter(Boolean).length} style={{ textAlign: 'center', padding: '100px', color: '#718096' }}>No Sales Orders found.</td>
                                    </tr>
                                ) : paginatedSalesOrders.map((so) => (
                                    <tr key={so.id}>
                                        {ALL_COL_CONFIG.filter(col => visibleColumns[col.key as keyof typeof visibleColumns]).map(col => {
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
                                                        <td key={col.key} style={{ ...cellStyle, color: 'var(--theme-primary)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate(`/deal?id=${so.deal}`)}>
                                                            {so.deal_id}
                                                        </td>
                                                    );
                                                case 'so_number':
                                                    return (
                                                        <td key={col.key} style={{ ...cellStyle, color: 'var(--theme-primary)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => onView(so.id)}>
                                                            {so.so_number || `DRAFT - ${so.id}`}
                                                        </td>
                                                    );
                                                case 'order_date':
                                                    return <td key={col.key} style={cellStyle}>{so.order_date ? formatToAppDate(so.order_date) : '-'}</td>;
                                                case 'customer':
                                                    return <td key={col.key} style={cellStyle}>{so.customer_name}</td>;
                                                case 'cust_id':
                                                    return <td key={col.key} style={cellStyle}>{so.cust_id || so.customer_code || '-'}</td>;
                                                case 'po_number':
                                                    return <td key={col.key} style={cellStyle}>{so.po_number || '-'}</td>;
                                                case 'items':
                                                    return (
                                                        <td key={col.key} style={cellStyle} title={so.items && so.items.length > 0 ? so.items.map((it: any) => it.product_name).join(', ') : ''}>
                                                            {so.items && so.items.length > 0 ? (so.items[0].product_name + (so.items.length > 1 ? ` +${so.items.length - 1}` : '')) : '-'}
                                                        </td>
                                                    );
                                                case 'status':
                                                    const getStatusStyle = (status: string) => {
                                                        const base = { padding: '3px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 700, whiteSpace: 'nowrap' } as React.CSSProperties;
                                                        switch (status) {
                                                            case 'APPROVED': return { ...base, background: 'rgba(56, 161, 105, 0.1)', color: '#38A169' };
                                                            case 'REJECTED': return { ...base, background: 'rgba(229, 62, 62, 0.1)', color: '#E53E3E' };
                                                            case 'PENDING_APPROVAL':
                                                            case 'SUBMITTED': return { ...base, background: 'rgba(49, 130, 206, 0.1)', color: '#3182CE' };
                                                            case 'REVERTED': return { ...base, background: 'rgba(113, 128, 150, 0.1)', color: '#718096' };
                                                            case 'CANCELLED': return { ...base, background: 'rgba(113, 128, 150, 0.1)', color: '#718096' };
                                                            default: return { ...base, background: 'var(--bg-secondary)', color: 'var(--text-secondary)' };
                                                        }
                                                    };
                                                    return (
                                                        <td key={col.key} style={cellStyle}>
                                                            <span style={getStatusStyle(so.status)}>{so.status?.replace('_', ' ')}</span>
                                                        </td>
                                                    );
                                                case 'amount':
                                                    return <td key={col.key} style={cellStyle}>{so.currency} {parseFloat(so.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>;
                                                case 'amount_inr':
                                                    return <td key={col.key} style={{ ...cellStyle, color: 'var(--theme-primary)', fontWeight: 600 }}>₹{parseFloat(so.amount_inr?.toString() || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>;
                                                case 'po_date':
                                                    return <td key={col.key} style={cellStyle}>{so.po_date ? formatToAppDate(so.po_date) : (so.order_date ? formatToAppDate(so.order_date) : '-')}</td>;
                                                case 'actions':
                                                    return (
                                                        <td key={col.key} style={{ ...cellStyle, textAlign: 'center' }}>
                                                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                                <button
                                                                    onClick={() => onView(so.id)}
                                                                    style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        width: '28px',
                                                                        height: '28px',
                                                                        background: 'rgba(255, 107, 0, 0.1)',
                                                                        color: 'var(--theme-primary)',
                                                                        border: '1px solid rgba(255, 107, 0, 0.2)',
                                                                        borderRadius: '6px',
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--theme-primary)'; e.currentTarget.style.color = 'white'; }}
                                                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 107, 0, 0.1)'; e.currentTarget.style.color = 'var(--theme-primary)'; }}
                                                                    title="View Details"
                                                                >
                                                                    <Eye size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDownloadReport(so.id, so.so_number)}
                                                                    style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        width: '28px',
                                                                        height: '28px',
                                                                        background: 'rgba(255, 107, 0, 0.1)',
                                                                        color: 'var(--theme-primary)',
                                                                        border: '1px solid rgba(255, 107, 0, 0.2)',
                                                                        borderRadius: '6px',
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--theme-primary)'; e.currentTarget.style.color = 'white'; }}
                                                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 107, 0, 0.1)'; e.currentTarget.style.color = 'var(--theme-primary)'; }}
                                                                    title="Download PDF"
                                                                >
                                                                    <Download size={14} />
                                                                </button>
                                                                {so.status === 'APPROVED' && (
                                                                    <button
                                                                        onClick={() => navigate(`/invoice?so_id=${so.id}`)}
                                                                        style={{
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            width: '28px',
                                                                            height: '28px',
                                                                            background: 'rgba(56, 161, 105, 0.1)',
                                                                            color: '#38A169',
                                                                            border: '1px solid rgba(56, 161, 105, 0.2)',
                                                                            borderRadius: '6px',
                                                                            cursor: 'pointer',
                                                                            transition: 'all 0.2s'
                                                                        }}
                                                                        onMouseEnter={(e) => { e.currentTarget.style.background = '#38A169'; e.currentTarget.style.color = 'white'; }}
                                                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(56, 161, 105, 0.1)'; e.currentTarget.style.color = '#38A169'; }}
                                                                        title="Create Invoice"
                                                                    >
                                                                        <Plus size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                default:
                                                    return <td key={col.key} style={cellStyle}>-</td>;
                                            }
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <Pagination
                        currentPage={currentPage}
                        totalItems={filteredSalesOrders.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={setCurrentPage}
                    />
                </div>
            </div>
        </div>
    );
};

export default SalesOrderDashboard;
