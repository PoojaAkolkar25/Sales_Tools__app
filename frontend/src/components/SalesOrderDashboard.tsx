import React, { useState, useEffect } from 'react';
import {
    ShoppingBag,
    Clock,
    CheckCircle2,
    Eye,
    BarChart3,
    RefreshCw,
    Filter,
    Search
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
        pending: 0,
        submitted: 0,
        extractionAccuracy: 0,
        mappedCustomers: 0,
        mappedItems: 0,
        validDates: 0
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

            const draftCount = response.data.filter((so: any) => so.status === 'DRAFT').length;
            const submittedCount = response.data.filter((so: any) => so.status === 'SUBMITTED').length;
            const total = response.data.length || 1;
            const itemsMapped = response.data.filter((so: any) => so.items && so.items.length > 0 && so.items.every((i: any) => i.product)).length;
            const datesValid = response.data.filter((so: any) => so.po_date).length;
            const accuracy = Math.round(((itemsMapped / total) * 0.7 + (datesValid / total) * 0.3) * 100);

            setStats({
                pending: draftCount,
                submitted: submittedCount,
                extractionAccuracy: accuracy,
                mappedCustomers: 100,
                mappedItems: Math.round((itemsMapped / total) * 100),
                validDates: Math.round((datesValid / total) * 100)
            });
        } catch (error) {
            console.error('Error fetching sales orders', error);
            showNotification('Failed to load sales orders', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filteredSalesOrders = salesOrders.filter((so: any) => {
        const matchesSONumber = (so.so_number || '').toLowerCase().includes(filters.so_number.toLowerCase());
        const matchesCustomer = (so.customer_name || '').toLowerCase().includes(filters.customer_name.toLowerCase());
        const matchesPONumber = (so.po_number || '').toLowerCase().includes(filters.po_number.toLowerCase());

        return matchesSONumber && matchesCustomer && matchesPONumber;
    });

    const paginatedSalesOrders = filteredSalesOrders.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="space-y-6">
            <div className="ae-grid-4">
                <div className="ae-card ae-card-sm">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div className="ae-card-label">Draft SOs (Pending Review)</div>
                            <div className="ae-card-value">{stats.pending}</div>
                        </div>
                        <div className="ae-icon-box" style={{ background: 'rgba(187, 77, 0, 0.05)', color: 'var(--ae-orange)' }}><Clock size={16} /></div>
                    </div>
                </div>
                <div className="ae-card ae-card-sm">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div className="ae-card-label">Submitted Orders</div>
                            <div className="ae-card-value">{stats.submitted}</div>
                        </div>
                        <div className="ae-icon-box" style={{ background: 'rgba(0, 102, 204, 0.05)', color: 'var(--ae-blue)' }}><CheckCircle2 size={16} /></div>
                    </div>
                </div>
                <div className="ae-card ae-card-sm">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div className="ae-card-label">Extraction Accuracy</div>
                            <div className="ae-card-value">{stats.extractionAccuracy}%</div>
                        </div>
                        <div className="ae-icon-box" style={{ background: 'rgba(0, 200, 83, 0.05)', color: 'var(--ae-green)' }}><BarChart3 size={16} /></div>
                    </div>
                </div>
                <div className="ae-card ae-card-sm">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div className="ae-card-label">Total Orders</div>
                            <div className="ae-card-value">{salesOrders.length}</div>
                        </div>
                        <div className="ae-icon-box" style={{ background: 'rgba(105, 30, 6, 0.05)', color: 'var(--ae-navy)' }}><ShoppingBag size={16} /></div>
                    </div>
                </div>
            </div>

            <div style={{ height: '24px' }}></div>

            <div className="ae-table-container" style={{
                marginBottom: '60px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                maxHeight: 'none',
                overflowY: 'visible'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border-primary)',
                    background: 'white'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShoppingBag size={18} style={{ color: 'var(--theme-primary)' }} />
                        Sales Order List
                    </h3>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
                            title={showFilters ? "Hide Filters" : "Show Filters"}
                        >
                            <Filter size={16} /> Filters
                        </button>
                        <button
                            onClick={fetchSalesOrders}
                            disabled={loading}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 20px',
                                borderRadius: '10px',
                                fontSize: '0.9rem',
                                fontWeight: 700,
                                border: 'none',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                background: 'var(--ae-blue)',
                                color: 'white',
                                boxShadow: '0 4px 12px rgba(0, 102, 204, 0.25)',
                                opacity: loading ? 0.7 : 1
                            }}
                            onMouseEnter={(e) => {
                                if (!loading) {
                                    e.currentTarget.style.background = 'var(--theme-primary)';
                                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(187, 77, 0, 0.35)';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!loading) {
                                    e.currentTarget.style.background = 'var(--ae-blue)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(187, 77, 0, 0.25)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }
                            }}
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>
                </div>

                <table className="ae-table">
                    <thead>
                        <tr>
                            <th style={{ backgroundColor: 'var(--bg-secondary)', textTransform: 'uppercase' }}>SO Number</th>
                            <th style={{ backgroundColor: 'var(--bg-secondary)', textTransform: 'uppercase' }}>Deal ID</th>
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
                                <td colSpan={10} className="px-6 py-12 text-center text-slate-500 font-medium italic">
                                    Loading Sales Orders...
                                </td>
                            </tr>
                        ) : paginatedSalesOrders.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="px-6 py-12 text-center text-slate-500 font-medium italic">
                                    No Sales Orders found.
                                </td>
                            </tr>
                        ) : paginatedSalesOrders.map((so) => (
                            <tr key={so.id}>
                                <td className="whitespace-nowrap">
                                    <span style={{ fontSize: '0.8rem' }}>{so.so_number || '---'}</span>
                                    {so.status === 'DRAFT' && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 uppercase tracking-tighter">Draft</span>}
                                </td>
                                <td className="whitespace-nowrap">
                                    <span
                                        style={{ color: 'var(--ae-blue)', fontSize: '0.8rem', cursor: 'pointer' }}
                                        onClick={() => navigate(`/deal?id=${so.deal}`)}
                                    >
                                        {so.deal_id || '---'}
                                    </span>
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
                                <td style={{ textAlign: 'center' }}>
                                    <button
                                        onClick={() => onView(so.id)}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '6px 12px',
                                            background: 'var(--ae-blue)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'var(--theme-primary)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'var(--ae-blue)'}
                                    >
                                        <Eye size={14} /> {so.status === 'DRAFT' ? 'Review' : 'View'}
                                    </button>
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
    );
};

export default SalesOrderDashboard;
