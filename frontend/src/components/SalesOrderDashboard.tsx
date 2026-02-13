import React, { useState, useEffect } from 'react';
import {
    ShoppingBag,
    Clock,
    CheckCircle2,
    Eye,
    BarChart3,
    RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useNotification } from '../context/NotificationContext';

interface SalesOrderDashboardProps {
    onView: (id: number) => void;
    refreshKey?: number;
}

const SalesOrderDashboard: React.FC<SalesOrderDashboardProps> = ({ onView, refreshKey }) => {
    const navigate = useNavigate();
    const [salesOrders, setSalesOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
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

    const filteredSalesOrders = salesOrders.filter((so: any) =>
        true
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
                        <div className="ae-icon-box bg-orange-soft text-orange"><Clock size={16} /></div>
                    </div>
                </div>
                <div className="ae-card ae-card-sm">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div className="ae-card-label">Submitted Orders</div>
                            <div className="ae-card-value">{stats.submitted}</div>
                        </div>
                        <div className="ae-icon-box bg-green-soft text-green"><CheckCircle2 size={16} /></div>
                    </div>
                </div>
                <div className="ae-card ae-card-sm">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div className="ae-card-label">Extraction Accuracy</div>
                            <div className="ae-card-value">{stats.extractionAccuracy}%</div>
                        </div>
                        <div className="ae-icon-box bg-blue-soft text-blue"><BarChart3 size={16} /></div>
                    </div>
                </div>
                <div className="ae-card ae-card-sm">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div className="ae-card-label">Total Orders</div>
                            <div className="ae-card-value">{salesOrders.length}</div>
                        </div>
                        <div className="ae-icon-box bg-purple-soft text-purple"><ShoppingBag size={16} /></div>
                    </div>
                </div>
            </div>

            <div style={{ height: '24px' }}></div>

            <div className="ae-table-container" style={{
                marginBottom: '60px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 24px',
                    borderBottom: '1px solid #E0E6ED',
                    background: '#F8FAFC'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <ShoppingBag className="text-[#3182CE]" size={18} />
                        <h2 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#2D3748', margin: 0, textTransform: 'uppercase' }}>
                            Incoming POs & Order Drafts
                        </h2>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                                background: '#0066CC',
                                color: 'white',
                                boxShadow: '0 4px 12px rgba(0, 102, 204, 0.25)',
                                opacity: loading ? 0.7 : 1
                            }}
                            onMouseEnter={(e) => {
                                if (!loading) {
                                    e.currentTarget.style.background = '#0052A3';
                                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 102, 204, 0.35)';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!loading) {
                                    e.currentTarget.style.background = '#0066CC';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 102, 204, 0.25)';
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
                            <th style={{ backgroundColor: '#FAFBFC', textTransform: 'uppercase' }}>SO Number</th>
                            <th style={{ backgroundColor: '#FAFBFC', textTransform: 'uppercase' }}>Deal ID</th>
                            <th style={{ backgroundColor: '#FAFBFC', textTransform: 'uppercase' }}>Customer</th>
                            <th style={{ backgroundColor: '#FAFBFC', textTransform: 'uppercase' }}>Cust Code</th>
                            <th style={{ backgroundColor: '#FAFBFC', textTransform: 'uppercase' }}>PO Number</th>
                            <th style={{ backgroundColor: '#FAFBFC', textTransform: 'uppercase' }}>Items (Summary)</th>
                            <th style={{ backgroundColor: '#FAFBFC', textTransform: 'uppercase' }}>Status</th>
                            <th style={{ backgroundColor: '#FAFBFC', textTransform: 'uppercase' }}>Amount</th>
                            <th style={{ backgroundColor: '#FAFBFC', textTransform: 'uppercase' }}>Date</th>
                            <th style={{ backgroundColor: '#FAFBFC', textAlign: 'center', textTransform: 'uppercase' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={10} className="px-6 py-12 text-center text-[#718096] font-medium italic">
                                    Loading Sales Orders...
                                </td>
                            </tr>
                        ) : filteredSalesOrders.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="px-6 py-12 text-center text-[#718096] font-medium italic">
                                    No Sales Orders found.
                                </td>
                            </tr>
                        ) : filteredSalesOrders.map((so) => (
                            <tr key={so.id}>
                                <td className="whitespace-nowrap">
                                    <span style={{ fontWeight: 700, color: '#0066CC', fontSize: '0.8rem' }}>{so.so_number || '---'}</span>
                                    {so.status === 'DRAFT' && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 uppercase tracking-tighter">Draft</span>}
                                </td>
                                <td className="whitespace-nowrap">
                                    <span
                                        style={{ fontWeight: 700, color: '#0066CC', fontSize: '0.8rem', cursor: 'pointer' }}
                                        onClick={() => navigate(`/deal?id=${so.deal}`)}
                                    >
                                        {so.deal_id || '---'}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <span style={{ color: '#2D3748', fontWeight: 600, fontSize: '0.85rem' }}>{so.customer_name || 'N/A'}</span>
                                    </div>
                                </td>
                                <td className="whitespace-nowrap">
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#718096' }}>{so.customer_code || '---'}</span>
                                </td>
                                <td className="whitespace-nowrap">
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4A5568' }}>{so.po_number}</span>
                                </td>
                                <td className="whitespace-nowrap">
                                    <div className="flex flex-col text-xs">
                                        {so.items && so.items.length > 0 ? (
                                            <>
                                                <span className="font-bold text-slate-700 truncate max-w-[150px]" title={so.items[0].description || so.items[0].product_name}>
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
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        background: so.status === 'SUBMITTED' ? 'rgba(0, 200, 83, 0.1)' : 'rgba(255, 107, 0, 0.1)',
                                        color: so.status === 'SUBMITTED' ? '#00C853' : '#FF6B00'
                                    }}>
                                        {so.status}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap">
                                    <span style={{ fontWeight: 800, color: '#1a1f36', fontSize: '0.85rem' }}>{so.currency} {parseFloat(so.total_amount).toLocaleString()}</span>
                                </td>
                                <td className="whitespace-nowrap">
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#718096' }}>{so.created_at ? new Date(so.created_at).toLocaleDateString() : '-'}</span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <button
                                        onClick={() => onView(so.id)}
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
                                    >
                                        <Eye size={14} /> {so.status === 'DRAFT' ? 'Review' : 'View'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SalesOrderDashboard;
