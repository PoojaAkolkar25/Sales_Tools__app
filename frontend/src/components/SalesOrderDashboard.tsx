import React, { useState, useEffect } from 'react';
import {
    Eye,
    Download,
    Search,
    ChevronDown,
    Columns,
    FileSpreadsheet,
    FileText,
    Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import Pagination from './Pagination';

const ALL_COLUMNS = [
    { id: 'deal_id', label: 'Deal ID' },
    { id: 'so_number', label: 'SO Number' },
    { id: 'order_date', label: 'Order Date' },
    { id: 'customer', label: 'Customer' },
    { id: 'cust_code', label: 'Cust Code' },
    { id: 'po_number', label: 'PO Number' },
    { id: 'items', label: 'Items (Summary)' },
    { id: 'status', label: 'Status' },
    { id: 'amount', label: 'Amount' },
    { id: 'po_date', label: 'PO Date' }
];

interface SalesOrderDashboardProps {
    onView: (id: number) => void;
    refreshKey?: number;
}

const SalesOrderDashboard: React.FC<SalesOrderDashboardProps> = ({ onView, refreshKey }) => {
    const navigate = useNavigate();
    const [salesOrders, setSalesOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [showFilters] = useState(true);
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

    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem('salesOrderDashboard_visibleColumns');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
                // Migrate from old object format if necessary
                return Object.entries(parsed)
                    .filter(([_, visible]) => visible)
                    .map(([id]) => id);
            } catch (e) {
                console.error('Error parsing visible columns', e);
            }
        }
        return ['deal_id', 'so_number', 'order_date', 'customer', 'cust_code', 'po_number', 'items', 'status', 'amount', 'po_date', 'actions'];
    });

    useEffect(() => {
        localStorage.setItem('salesOrderDashboard_visibleColumns', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    const toggleColumn = (col: string) => {
        setVisibleColumns(prev =>
            prev.includes(col)
                ? prev.filter(c => c !== col)
                : [...prev, col]
        );
    };
    const ITEMS_PER_PAGE = 20;
    const [stats, setStats] = useState({
        draft: 0,
        submitted: 0,
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
                submitted: response.data.filter((so: any) => so.status === 'SUBMITTED').length,
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
        const matchesOrderDate = (so.order_date ? new Date(so.order_date).toLocaleDateString() : '').toLowerCase().includes(filters.order_date.toLowerCase());
        const matchesCustomer = (so.customer_name || '').toLowerCase().includes(filters.customer_name.toLowerCase());
        const matchesCustCode = (so.customer_code || '').toLowerCase().includes(filters.customer_code.toLowerCase());
        const matchesPONumber = (so.po_number || '').toLowerCase().includes(filters.po_number.toLowerCase());
        const matchesItems = (so.items && so.items.length > 0 ? so.items[0].description || so.items[0].product_name || '' : '').toLowerCase().includes(filters.items_summary.toLowerCase());
        const matchesAmount = `${so.currency || ''} ${parseFloat(so.total_amount || 0).toLocaleString()}`.toLowerCase().includes(filters.amount.toLowerCase());
        const matchesPODate = (so.po_date ? new Date(so.po_date).toLocaleDateString() : (so.order_date ? new Date(so.order_date).toLocaleDateString() : '')).toLowerCase().includes(filters.po_date.toLowerCase());
        const matchesStatusFilter = (so.status || '').toLowerCase().includes(filters.status.toLowerCase());

        const matchesStatus = selectedStatus === '' ? true : so.status === selectedStatus;

        return matchesDealId && matchesSONumber && matchesOrderDate && matchesCustomer &&
            matchesCustCode && matchesPONumber && matchesItems && matchesAmount &&
            matchesPODate && matchesStatusFilter && matchesStatus;
    });

    const statusFlow = [
        { label: `Draft (${stats.draft})`, value: 'DRAFT' },
        { label: `Submitted (${stats.submitted})`, value: 'SUBMITTED' },
        { label: `Cancelled (${stats.cancelled})`, value: 'CANCELLED' },
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
                overflowY: 'visible',
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
                                    cursor: 'pointer'
                                }}
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
                                            onClick={() => setVisibleColumns(['deal_id', 'so_number', 'order_date', 'customer', 'cust_code', 'po_number', 'items', 'status', 'amount', 'po_date', 'actions'])}
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
                                            onClick={() => setVisibleColumns(['actions'])}
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
                                        {[...ALL_COLUMNS, { id: 'actions', label: 'Actions' }].map(({ id, label }) => (
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
                                                    checked={visibleColumns.includes(id)}
                                                    onChange={() => toggleColumn(id)}
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

                <div style={{ overflowX: 'auto' }}>

                    <table className="ae-table">
                        <thead>
                            <tr>
                                {visibleColumns.map(key => {
                                    if (key === 'actions') return <th key={key} style={{ backgroundColor: 'var(--bg-secondary)', textAlign: 'center', textTransform: 'uppercase' }}>Actions</th>;
                                    const col = ALL_COLUMNS.find(c => c.id === key);
                                    return <th key={key} style={{ backgroundColor: 'var(--bg-secondary)', textTransform: 'uppercase' }}>{col?.label}</th>;
                                })}
                            </tr>
                            {showFilters && (
                                <tr style={{ background: 'var(--bg-secondary)' }}>
                                    {visibleColumns.map(key => {
                                        if (key === 'actions') {
                                            return (
                                                <th key={key} style={{ textAlign: 'center', backgroundColor: 'var(--bg-secondary)' }}>
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
                                            );
                                        }
                                        const filterKeyMap: Record<string, keyof typeof filters> = {
                                            deal_id: 'deal_id',
                                            so_number: 'so_number',
                                            order_date: 'order_date',
                                            customer: 'customer_name',
                                            cust_code: 'customer_code',
                                            po_number: 'po_number',
                                            items: 'items_summary',
                                            status: 'status',
                                            amount: 'amount',
                                            po_date: 'po_date'
                                        };
                                        const filterKey = filterKeyMap[key];
                                        return (
                                            <th key={key} style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                                <div className="ae-input-group">
                                                    <Search className="ae-search-icon" size={12} />
                                                    <input
                                                        className="ae-input"
                                                        placeholder="Filter..."
                                                        value={filters[filterKey]}
                                                        onChange={e => setFilters({ ...filters, [filterKey]: e.target.value })}
                                                        style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                                    />
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={visibleColumns.length} style={{ textAlign: 'center', padding: '100px' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></td>
                                </tr>
                            ) : paginatedSalesOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={visibleColumns.length} style={{ textAlign: 'center', padding: '100px', color: '#718096' }}>No Sales Orders found.</td>
                                </tr>
                            ) : paginatedSalesOrders.map((so) => (
                                <tr key={so.id}>
                                    {visibleColumns.map(key => {
                                        switch (key) {
                                            case 'deal_id':
                                                return (
                                                    <td key={key} className="whitespace-nowrap">
                                                        <span
                                                            style={{ color: 'var(--ae-blue)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                                                            onClick={() => navigate(`/deal?id=${so.deal}`)}
                                                        >
                                                            {so.deal_id || '---'}
                                                        </span>
                                                    </td>
                                                );
                                            case 'so_number':
                                                return (
                                                    <td key={key} className="whitespace-nowrap">
                                                        <span
                                                            style={{ color: 'var(--ae-blue)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                                                            onClick={() => onView(so.id)}
                                                        >
                                                            {so.so_number || '---'}
                                                        </span>
                                                        {so.status === 'DRAFT' && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 uppercase tracking-tighter">Draft</span>}
                                                    </td>
                                                );
                                            case 'order_date':
                                                return (
                                                    <td key={key} className="whitespace-nowrap">
                                                        <span style={{ fontSize: '0.8rem' }}>{so.order_date ? new Date(so.order_date).toLocaleDateString() : '---'}</span>
                                                    </td>
                                                );
                                            case 'customer':
                                                return (
                                                    <td key={key} className="whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{so.customer_name || 'N/A'}</span>
                                                        </div>
                                                    </td>
                                                );
                                            case 'cust_code':
                                                return (
                                                    <td key={key} className="whitespace-nowrap">
                                                        <span style={{ fontSize: '0.8rem' }}>{so.customer_code || '---'}</span>
                                                    </td>
                                                );
                                            case 'po_number':
                                                return (
                                                    <td key={key} className="whitespace-nowrap">
                                                        <span style={{ fontSize: '0.8rem' }}>{so.po_number}</span>
                                                    </td>
                                                );
                                            case 'items':
                                                return (
                                                    <td key={key} className="whitespace-nowrap">
                                                        <div className="flex flex-col text-xs">
                                                            {so.items && so.items.length > 0 ? (
                                                                <>
                                                                    <span className="text-slate-700 truncate max-w-[150px]" title={so.items[0].description || so.items[0].product_name}>
                                                                        {so.items[0].description || (so.items[0].product ? `Product #${so.items[0].product}` : 'Unmapped Item')}
                                                                    </span>
                                                                    {so.items.length > 1 && (
                                                                        <span className="text-orange-600 font-semibold" style={{ fontSize: '0.65rem' }}>
                                                                            + {so.items.length - 1} more items
                                                                        </span>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <span className="text-gray-400 italic">No Items</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            case 'status':
                                                return (
                                                    <td key={key} className="whitespace-nowrap">
                                                        <span style={{
                                                            padding: '4px 10px',
                                                            borderRadius: '6px',
                                                            fontSize: '9px',
                                                            fontWeight: 600,
                                                            textTransform: 'uppercase',
                                                            background: so.status === 'SUBMITTED' ? 'rgba(0, 200, 83, 0.1)' : 'var(--bg-secondary)',
                                                            color: so.status === 'SUBMITTED' ? '#00C853' : 'var(--theme-primary)'
                                                        }}>
                                                            {so.status}
                                                        </span>
                                                    </td>
                                                );
                                            case 'amount':
                                                return (
                                                    <td key={key} className="whitespace-nowrap">
                                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{so.currency} {parseFloat(so.total_amount).toLocaleString()}</span>
                                                    </td>
                                                );
                                            case 'po_date':
                                                return (
                                                    <td key={key} className="whitespace-nowrap">
                                                        <span style={{ fontSize: '0.75rem' }}>{so.po_date ? new Date(so.po_date).toLocaleDateString() : (so.order_date ? new Date(so.order_date).toLocaleDateString() : '-')}</span>
                                                    </td>
                                                );
                                            case 'actions':
                                                return (
                                                    <td key={key} style={{ width: '120px', minWidth: '120px', padding: '8px' }}>
                                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
                                                            <button
                                                                onClick={() => onView(so.id)}
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    padding: '6px 12px',
                                                                    background: 'var(--ae-blue)',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    borderRadius: '6px',
                                                                    fontSize: '0.75rem',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                                onMouseOver={(e) => e.currentTarget.style.background = 'var(--theme-primary)'}
                                                                onMouseOut={(e) => e.currentTarget.style.background = 'var(--ae-blue)'}
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
                                                                    padding: '6px 12px',
                                                                    background: 'var(--theme-primary)',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    borderRadius: '6px',
                                                                    fontSize: '0.75rem',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                                onMouseOver={(e) => e.currentTarget.style.background = 'var(--ae-blue)'}
                                                                onMouseOut={(e) => e.currentTarget.style.background = 'var(--theme-primary)'}
                                                                title="Download PO"
                                                            >
                                                                <Download size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                );
                                            default:
                                                return <td key={key}>---</td>;
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
    );
};

export default SalesOrderDashboard;
