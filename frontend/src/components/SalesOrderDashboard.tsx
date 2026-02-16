import React, { useState, useEffect } from 'react';
import {
    Eye,
    Download,
    Filter,
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

interface SalesOrderDashboardProps {
    onView: (id: number) => void;
    refreshKey?: number;
}

const SalesOrderDashboard: React.FC<SalesOrderDashboardProps> = ({ onView, refreshKey }) => {
    const navigate = useNavigate();
    const [salesOrders, setSalesOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        so_number: '',
        customer_name: '',
        po_number: ''
    });
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

    const [selectedStatus, setSelectedStatus] = useState('');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showColumnMenu, setShowColumnMenu] = useState(false);

    const filteredSalesOrders = salesOrders.filter((so: any) => {
        const matchesSONumber = (so.so_number || '').toLowerCase().includes(filters.so_number.toLowerCase());
        const matchesCustomer = (so.customer_name || '').toLowerCase().includes(filters.customer_name.toLowerCase());
        const matchesPONumber = (so.po_number || '').toLowerCase().includes(filters.po_number.toLowerCase());
        const matchesStatus = selectedStatus === '' ? true : so.status === selectedStatus;

        return matchesSONumber && matchesCustomer && matchesPONumber && matchesStatus;
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

                        <button
                            className="ae-btn-secondary"
                            onClick={() => setShowFilters(!showFilters)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 14px',
                                fontSize: '0.8rem',
                                height: '32px',
                                borderRadius: '8px',
                                background: showFilters ? 'var(--bg-secondary)' : 'white',
                                color: showFilters ? 'var(--theme-primary)' : 'var(--text-secondary)',
                                borderColor: showFilters ? 'var(--theme-primary)' : 'var(--border-primary)',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            <Filter size={16} /> Filters
                        </button>

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
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>

                    <table className="ae-table">
                        <thead>
                            <tr>
                                <th style={{ backgroundColor: 'var(--bg-secondary)', textTransform: 'uppercase' }}>Deal ID</th>
                                <th style={{ backgroundColor: 'var(--bg-secondary)', textTransform: 'uppercase' }}>SO Number</th>
                                <th style={{ backgroundColor: 'var(--bg-secondary)', textTransform: 'uppercase' }}>Order Date</th>
                                <th style={{ backgroundColor: 'var(--bg-secondary)', textTransform: 'uppercase' }}>Customer</th>
                                <th style={{ backgroundColor: 'var(--bg-secondary)', textTransform: 'uppercase' }}>Cust Code</th>
                                <th style={{ backgroundColor: 'var(--bg-secondary)', textTransform: 'uppercase' }}>PO Number</th>
                                <th style={{ backgroundColor: 'var(--bg-secondary)', textTransform: 'uppercase' }}>Items (Summary)</th>
                                <th style={{ backgroundColor: 'var(--bg-secondary)', textTransform: 'uppercase' }}>Status</th>
                                <th style={{ backgroundColor: 'var(--bg-secondary)', textTransform: 'uppercase' }}>Amount</th>
                                <th style={{ backgroundColor: 'var(--bg-secondary)', textTransform: 'uppercase' }}>PO Date</th>
                                <th style={{ backgroundColor: 'var(--bg-secondary)', textAlign: 'center', textTransform: 'uppercase' }}>Actions</th>
                            </tr>
                            {showFilters && (
                                <tr style={{ background: 'var(--bg-secondary)' }}>
                                    <th style={{ backgroundColor: 'var(--bg-secondary)' }}></th>
                                    <th style={{ backgroundColor: 'var(--bg-secondary)' }}>
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
                                    <th style={{ backgroundColor: 'var(--bg-secondary)' }}></th>
                                    <th style={{ backgroundColor: 'var(--bg-secondary)' }}>
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
                                    <th style={{ backgroundColor: 'var(--bg-secondary)' }}></th>
                                    <th style={{ backgroundColor: 'var(--bg-secondary)' }}>
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
                                    <th style={{ backgroundColor: 'var(--bg-secondary)' }}></th>
                                    <th style={{ backgroundColor: 'var(--bg-secondary)' }}></th>
                                    <th style={{ backgroundColor: 'var(--bg-secondary)' }}></th>
                                    <th style={{ backgroundColor: 'var(--bg-secondary)' }}></th>
                                    <th style={{ textAlign: 'center', backgroundColor: 'var(--bg-secondary)' }}>
                                        <button
                                            onClick={() => setFilters({
                                                so_number: '', customer_name: '', po_number: ''
                                            })}
                                            style={{ height: '24px', width: '100%', fontSize: '10px', color: 'var(--theme-primary)', fontWeight: 700, cursor: 'pointer', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px' }}
                                        >
                                            Clear
                                        </button>
                                    </th>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={10} style={{ textAlign: 'center', padding: '100px' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></td>
                                </tr>
                            ) : paginatedSalesOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={10} style={{ textAlign: 'center', padding: '100px', color: '#718096' }}>No Sales Orders found.</td>
                                </tr>
                            ) : paginatedSalesOrders.map((so) => (
                                <tr key={so.id}>
                                    <td className="whitespace-nowrap">
                                        <span
                                            style={{ color: 'var(--ae-blue)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                                            onClick={() => navigate(`/deal?id=${so.deal}`)}
                                        >
                                            {so.deal_id || '---'}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap">
                                        <span
                                            style={{ color: 'var(--ae-blue)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                                            onClick={() => onView(so.id)}
                                        >
                                            {so.so_number || '---'}
                                        </span>
                                        {so.status === 'DRAFT' && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 uppercase tracking-tighter">Draft</span>}
                                    </td>
                                    <td className="whitespace-nowrap">
                                        <span style={{ fontSize: '0.8rem' }}>{so.order_date ? new Date(so.order_date).toLocaleDateString() : '---'}</span>
                                    </td>
                                    <td className="whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{so.customer_name || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap">
                                        <span style={{ fontSize: '0.8rem' }}>{so.customer_code || '---'}</span>
                                    </td>
                                    <td className="whitespace-nowrap">
                                        <span style={{ fontSize: '0.8rem' }}>{so.po_number}</span>
                                    </td>
                                    <td className="whitespace-nowrap">
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
                                    <td className="whitespace-nowrap">
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
                                    <td className="whitespace-nowrap">
                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{so.currency} {parseFloat(so.total_amount).toLocaleString()}</span>
                                    </td>
                                    <td className="whitespace-nowrap">
                                        <span style={{ fontSize: '0.75rem' }}>{so.po_date ? new Date(so.po_date).toLocaleDateString() : (so.order_date ? new Date(so.order_date).toLocaleDateString() : '-')}</span>
                                    </td>
                                    <td style={{ width: '120px', minWidth: '120px', padding: '8px' }}>
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
