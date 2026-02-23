import React, { useState, useEffect, useRef } from 'react';
import {
    Eye,
    Download,
    Search,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Columns,
    FileSpreadsheet,
    FileText,
    Loader2
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
    { key: 'cust_code', label: 'Cust Code', shortLabel: 'CODE' },
    { key: 'po_number', label: 'PO Number', shortLabel: 'PO#' },
    { key: 'items', label: 'Items (Summary)', shortLabel: 'ITEMS' },
    { key: 'status', label: 'Status', shortLabel: 'ST.' },
    { key: 'amount', label: 'Amount', shortLabel: 'AMT' },
    { key: 'po_date', label: 'PO Date', shortLabel: 'PO DT' },
    { key: 'actions', label: 'Actions', shortLabel: 'ACT.' },
];

const SHORT_COL_WIDTHS: Record<string, number> = {
    deal_id: 40,
    so_number: 55,
    order_date: 55,
    customer: 75,
    cust_code: 55,
    po_number: 60,
    items: 75,
    status: 45,
    amount: 55,
    po_date: 60,
    actions: 60
};

const FULL_LABEL_WIDTHS: Record<string, number> = {
    deal_id: 60,
    so_number: 85,
    order_date: 90,
    customer: 120,
    cust_code: 80,
    po_number: 95,
    items: 110,
    status: 75,
    amount: 90,
    po_date: 85,
    actions: 100
};

const MAX_COL_WIDTHS: Record<string, number> = {
    deal_id: 100,
    so_number: 150,
    order_date: 150,
    customer: 250,
    cust_code: 120,
    po_number: 180,
    items: 300,
    status: 120,
    amount: 150,
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
            cust_code: true,
            po_number: true,
            items: true,
            status: true,
            amount: true,
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

    const filteredSalesOrders = salesOrders.filter((so: any) => {
        const matchesDealId = (so.deal_id || '').toLowerCase().includes(filters.deal_id.toLowerCase());
        const matchesSONumber = (so.so_number || '').toLowerCase().includes(filters.so_number.toLowerCase());
        const matchesOrderDate = (so.order_date ? formatToAppDate(so.order_date) : '').toLowerCase().includes(filters.order_date.toLowerCase());
        const matchesCustomer = (so.customer_name || '').toLowerCase().includes(filters.customer_name.toLowerCase());
        const matchesCustCode = (so.customer_code || '').toLowerCase().includes(filters.customer_code.toLowerCase());
        const matchesPONumber = (so.po_number || '').toLowerCase().includes(filters.po_number.toLowerCase());
        const matchesItems = (so.items && so.items.length > 0 ? so.items[0].description || so.items[0].product_name || '' : '').toLowerCase().includes(filters.items_summary.toLowerCase());
        const matchesAmount = `${so.currency || ''} ${parseFloat(so.total_amount || 0).toLocaleString()}`.toLowerCase().includes(filters.amount.toLowerCase());
        const matchesPODate = (so.po_date ? formatToAppDate(so.po_date) : (so.order_date ? formatToAppDate(so.order_date) : '')).toLowerCase().includes(filters.po_date.toLowerCase());
        const matchesStatusFilter = (so.status || '').toLowerCase().includes(filters.status.toLowerCase());

        const matchesStatus = selectedStatus === '' ? true :
            (selectedStatus === 'PENDING_APPROVAL' ? (so.status === 'PENDING_APPROVAL' || so.status === 'SUBMITTED') : so.status === selectedStatus);

        return matchesDealId && matchesSONumber && matchesOrderDate && matchesCustomer &&
            matchesCustCode && matchesPONumber && matchesItems && matchesAmount &&
            matchesPODate && matchesStatusFilter && matchesStatus;
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
                marginBottom: '60px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                maxHeight: 'none',
                overflow: 'visible',
                background: 'white'
            }}>
                {/* Header Controls Area */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    verticalAlign: 'middle',
                    gap: '16px',
                    padding: '20px',
                    borderBottom: '1px solid var(--border-primary)'
                }}>
                    {/* Status Tabs */}
                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        background: 'white',
                        padding: '6px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-primary)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}>
                        {statusFlow.map((flow) => (
                            <button
                                key={flow.value}
                                onClick={() => setSelectedStatus(flow.value)}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: selectedStatus === flow.value ? 'var(--theme-primary)' : 'transparent',
                                    color: selectedStatus === flow.value ? 'white' : 'var(--text-secondary)',
                                }}
                            >
                                {flow.label}
                            </button>
                        ))}
                    </div>

                    {/* Right Side Actions */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Period:</span>
                            <select
                                className="ae-input"
                                style={{ height: '32px', fontSize: '0.8rem', width: '130px', padding: '0 12px' }}
                            >
                                <option value="">All Time</option>
                            </select>
                        </div>

                        <div style={{ position: 'relative' }}>
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
                                    color: 'var(--text-secondary)',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    border: '1px solid var(--border-primary)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 107, 0, 0.5)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-primary)'; }}
                            >
                                <Download size={16} /> Export <ChevronDown size={14} />
                            </button>
                            {showExportMenu && (
                                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', border: '1px solid var(--border-primary)', zIndex: 100, minWidth: '160px', overflow: 'hidden' }}>
                                    <button
                                        style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                        onClick={() => { exportToExcel(); setShowExportMenu(false); }}
                                    >
                                        <FileSpreadsheet size={16} className="text-green-600" /> Excel Report
                                    </button>
                                    <button
                                        style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                        onClick={() => { exportToPDF(); setShowExportMenu(false); }}
                                    >
                                        <FileText size={16} className="text-red-600" /> PDF Report
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
                                    cursor: 'pointer',
                                    border: '1px solid var(--border-primary)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 107, 0, 0.5)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-primary)'; }}
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
                                    borderRadius: '12px',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                    border: '1px solid var(--border-primary)',
                                    zIndex: 100,
                                    minWidth: '200px',
                                    padding: '12px',
                                    maxHeight: '400px',
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
                                                cust_code: true,
                                                po_number: true,
                                                items: true,
                                                status: true,
                                                amount: true,
                                                po_date: true,
                                                actions: true
                                            })}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#FF6B00',
                                                fontSize: '0.85rem',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                padding: '4px 0'
                                            }}
                                        >
                                            Select All
                                        </button>
                                        <button
                                            onClick={() => setVisibleColumns({
                                                deal_id: false,
                                                so_number: false,
                                                order_date: false,
                                                customer: false,
                                                cust_code: false,
                                                po_number: false,
                                                items: false,
                                                status: false,
                                                amount: false,
                                                po_date: false,
                                                actions: true
                                            })}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#4A5568',
                                                fontSize: '0.85rem',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                padding: '4px 0'
                                            }}
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 12px' }}>
                                        {Object.entries({
                                            deal_id: 'Deal ID',
                                            so_number: 'SO Number',
                                            order_date: 'Order Date',
                                            customer: 'Customer',
                                            cust_code: 'Cust Code',
                                            po_number: 'PO Number',
                                            items: 'Items',
                                            status: 'Status',
                                            amount: 'Amount',
                                            po_date: 'PO Date',
                                            actions: 'Actions'
                                        }).map(([id, label]) => (
                                            <label
                                                key={id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '8px 10px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    fontSize: '0.85rem',
                                                    color: 'var(--text-primary)',
                                                    background: 'transparent'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={visibleColumns[id as keyof typeof visibleColumns]}
                                                    onChange={() => toggleColumn(id as keyof typeof visibleColumns)}
                                                    style={{ width: '16px', height: '16px', borderRadius: '4px', accentColor: 'var(--theme-primary)' }}
                                                />
                                                {label}
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
                            left: '-18px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 30,
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'white',
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
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-primary)'; }}
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
                            background: 'white',
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
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-primary)'; }}
                        title="Scroll right"
                    >
                        <ChevronRight size={18} />
                    </button>

                    <div ref={tableScrollRef} style={{ overflowX: 'auto' }}>
                        <table className="ae-table" style={{ tableLayout: 'fixed', width: 'max-content' }}>
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
                                            paddingRight: '20px',
                                            borderRight: '1px solid var(--border-secondary)',
                                            borderBottom: '1px solid var(--border-secondary)',
                                            textAlign: col.key === 'actions' ? 'center' : 'left'
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
                                    {visibleColumns.deal_id && (
                                        <th style={{ backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>
                                            <div className="ae-input-group">
                                                <Search className="ae-search-icon" size={12} />
                                                <input
                                                    className="ae-input"
                                                    placeholder="Filter..."
                                                    value={filters.deal_id}
                                                    onChange={e => setFilters({ ...filters, deal_id: e.target.value })}
                                                    style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                                />
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.so_number && (
                                        <th style={{ backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>
                                            <div className="ae-input-group">
                                                <Search className="ae-search-icon" size={12} />
                                                <input
                                                    className="ae-input"
                                                    placeholder="Filter..."
                                                    value={filters.so_number}
                                                    onChange={e => setFilters({ ...filters, so_number: e.target.value })}
                                                    style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                                />
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.order_date && (
                                        <th style={{ backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>
                                            <div className="ae-input-group">
                                                <Search className="ae-search-icon" size={12} />
                                                <input
                                                    className="ae-input"
                                                    placeholder="Filter..."
                                                    value={filters.order_date}
                                                    onChange={e => setFilters({ ...filters, order_date: e.target.value })}
                                                    style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                                />
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.customer && (
                                        <th style={{ backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>
                                            <div className="ae-input-group">
                                                <Search className="ae-search-icon" size={12} />
                                                <input
                                                    className="ae-input"
                                                    placeholder="Filter..."
                                                    value={filters.customer_name}
                                                    onChange={e => setFilters({ ...filters, customer_name: e.target.value })}
                                                    style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                                />
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.cust_code && (
                                        <th style={{ backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>
                                            <div className="ae-input-group">
                                                <Search className="ae-search-icon" size={12} />
                                                <input
                                                    className="ae-input"
                                                    placeholder="Filter..."
                                                    value={filters.customer_code}
                                                    onChange={e => setFilters({ ...filters, customer_code: e.target.value })}
                                                    style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                                />
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.po_number && (
                                        <th style={{ backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>
                                            <div className="ae-input-group">
                                                <Search className="ae-search-icon" size={12} />
                                                <input
                                                    className="ae-input"
                                                    placeholder="Filter..."
                                                    value={filters.po_number}
                                                    onChange={e => setFilters({ ...filters, po_number: e.target.value })}
                                                    style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                                />
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.items && (
                                        <th style={{ backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>
                                            <div className="ae-input-group">
                                                <Search className="ae-search-icon" size={12} />
                                                <input
                                                    className="ae-input"
                                                    placeholder="Filter..."
                                                    value={filters.items_summary}
                                                    onChange={e => setFilters({ ...filters, items_summary: e.target.value })}
                                                    style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                                />
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.status && (
                                        <th style={{ backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>
                                            <div className="ae-input-group">
                                                <Search className="ae-search-icon" size={12} />
                                                <input
                                                    className="ae-input"
                                                    placeholder="Filter..."
                                                    value={filters.status}
                                                    onChange={e => setFilters({ ...filters, status: e.target.value })}
                                                    style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                                />
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.amount && (
                                        <th style={{ backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>
                                            <div className="ae-input-group">
                                                <Search className="ae-search-icon" size={12} />
                                                <input
                                                    className="ae-input"
                                                    placeholder="Filter..."
                                                    value={filters.amount}
                                                    onChange={e => setFilters({ ...filters, amount: e.target.value })}
                                                    style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                                />
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.po_date && (
                                        <th style={{ backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>
                                            <div className="ae-input-group">
                                                <Search className="ae-search-icon" size={12} />
                                                <input
                                                    className="ae-input"
                                                    placeholder="Filter..."
                                                    value={filters.po_date}
                                                    onChange={e => setFilters({ ...filters, po_date: e.target.value })}
                                                    style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                                />
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.actions && (
                                        <th style={{ textAlign: 'center', backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>
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
                                                    po_date: '',
                                                    status: ''
                                                })}
                                                style={{ height: '24px', width: '100%', fontSize: '10px', color: 'var(--theme-primary)', fontWeight: 700, cursor: 'pointer', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px' }}
                                            >
                                                Clear
                                            </button>
                                        </th>
                                    )}
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
                                        {visibleColumns.deal_id && (
                                            <td className="whitespace-nowrap" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                <span
                                                    style={{ color: 'var(--ae-blue)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                                                    onClick={() => navigate(`/ deal ? id = ${so.deal} `)}
                                                >
                                                    {so.deal_id || '---'}
                                                </span>
                                            </td>
                                        )}
                                        {visibleColumns.so_number && (
                                            <td className="whitespace-nowrap" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                <span
                                                    style={{ color: 'var(--ae-blue)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                                                    onClick={() => onView(so.id)}
                                                >
                                                    {so.so_number || `DRAFT - ${so.id} `}
                                                </span>
                                                {so.status === 'DRAFT' && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 uppercase tracking-tighter">Draft</span>}
                                            </td>
                                        )}
                                        {visibleColumns.order_date && (
                                            <td className="whitespace-nowrap" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                <span style={{ fontSize: '0.8rem' }}>{so.order_date ? formatToAppDate(so.order_date) : '---'}</span>
                                            </td>
                                        )}
                                        {visibleColumns.customer && (
                                            <td className="whitespace-nowrap" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                <div className="flex flex-col">
                                                    <span style={{ fontWeight: 400, fontSize: '0.85rem' }}>{so.customer_name || 'N/A'}</span>
                                                </div>
                                            </td>
                                        )}
                                        {visibleColumns.cust_code && (
                                            <td className="whitespace-nowrap" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                <span style={{ fontSize: '0.8rem' }}>{so.customer_code || '---'}</span>
                                            </td>
                                        )}
                                        {visibleColumns.po_number && (
                                            <td className="whitespace-nowrap" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                <span style={{ fontSize: '0.8rem' }}>{so.po_number}</span>
                                            </td>
                                        )}
                                        {visibleColumns.items && (
                                            <td className="whitespace-nowrap" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                <div className="flex flex-col text-xs">
                                                    {so.items && so.items.length > 0 ? (
                                                        <>
                                                            <span className="text-slate-700 truncate max-w-[150px]" title={so.items[0].description || so.items[0].product_name}>
                                                                {so.items[0].description || (so.items[0].product ? `Product #${so.items[0].product} ` : 'Unmapped Item')}
                                                            </span>
                                                            {so.items.length > 1 && (
                                                                <span className="text-orange-600 font-normal" style={{ fontSize: '0.65rem' }}>
                                                                    + {so.items.length - 1} more items
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-gray-400 italic">No Items</span>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                        {visibleColumns.status && (
                                            <td className="whitespace-nowrap" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    fontSize: '9px',
                                                    fontWeight: 400,
                                                    textTransform: 'uppercase',
                                                    background: so.status === 'SUBMITTED' ? 'rgba(0, 200, 83, 0.1)' : 'var(--bg-secondary)',
                                                    color: so.status === 'SUBMITTED' ? '#00C853' : 'var(--theme-primary)'
                                                }}>
                                                    {so.status}
                                                </span>
                                            </td>
                                        )}
                                        {visibleColumns.amount && (
                                            <td className="whitespace-nowrap" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                <span style={{ fontWeight: 400, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{so.currency} {parseFloat(so.total_amount).toLocaleString()}</span>
                                            </td>
                                        )}
                                        {visibleColumns.po_date && (
                                            <td className="whitespace-nowrap" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                <span style={{ fontSize: '0.75rem' }}>{so.po_date ? formatToAppDate(so.po_date) : (so.order_date ? formatToAppDate(so.order_date) : '-')}</span>
                                            </td>
                                        )}
                                        {visibleColumns.actions && (
                                            <td style={{ width: '120px', minWidth: '120px', padding: '8px' }}>
                                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
                                                    <button
                                                        onClick={() => onView(so.id)}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            padding: '6px 12px',
                                                            background: 'var(--theme-primary)',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseOver={(e) => { e.currentTarget.style.background = 'var(--theme-primary-dark, #cc5500)'; }}
                                                        onMouseOut={(e) => { e.currentTarget.style.background = 'var(--theme-primary)'; }}
                                                        title="View Details"
                                                    >
                                                        <Eye size={14} />
                                                    </button>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDownloadReport(so.id, so.so_number);
                                                        }}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            padding: '6px 12px',
                                                            background: 'rgba(255,107,0,0.08)',
                                                            color: 'var(--theme-primary)',
                                                            border: '1px solid rgba(255,107,0,0.25)',
                                                            borderRadius: '6px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseOver={(e) => { e.currentTarget.style.background = 'var(--theme-primary)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--theme-primary)'; }}
                                                        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,107,0,0.08)'; e.currentTarget.style.color = 'var(--theme-primary)'; e.currentTarget.style.borderColor = 'rgba(255,107,0,0.25)'; }}
                                                        title="Download PO"
                                                    >
                                                        <Download size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
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
