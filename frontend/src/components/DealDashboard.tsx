import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    PlusCircle,
    Search,
    Download,
    TrendingUp,
    Clock,
    CheckCircle2,
    Loader2,
    Mail,
    FileSpreadsheet,
    FileText,
    RefreshCcw,
    ChevronDown
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';

interface Deal {
    id: number;
    deal_id: string;
    deal_name: string;
    project_name: string;
    customer_name: string;
    stage: string;
    amount: string;
    currency: string;
    deal_owner: number;
    owner_name: string;
    expected_close_date: string;
    created_at: string;
    is_read: boolean;
    hubspot_id?: string;
    last_synced_at?: string;
}

interface DealDashboardProps {
    onView: (id: number) => void;
    onCreate: () => void;
}

const DealDashboard: React.FC<DealDashboardProps> = ({ onView, onCreate }) => {
    const { showNotification } = useNotification();
    const [deals, setDeals] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [reportType, setReportType] = useState<string>('all');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [stats, setStats] = useState({
        total_deals: 0,
        total_value: 0,
        win_rate: 0,
        active_pipeline: 0
    });

    useEffect(() => {
        fetchDeals();
    }, [reportType]);

    const fetchDeals = async () => {
        setLoading(true);
        try {
            let url = '/deals/';
            const params: any = {};
            if (reportType !== 'all') {
                params.report_type = reportType;
            }
            if (searchQuery) {
                params.search = searchQuery;
            }

            const response = await api.get(url, { params });
            setDeals(response.data);

            const totalValue = response.data.reduce((sum: number, deal: Deal) => sum + parseFloat(deal.amount || '0'), 0);
            const wonDeals = response.data.filter((d: Deal) => d.stage === 'CLOSED_WON').length;

            setStats({
                total_deals: response.data.length,
                total_value: totalValue,
                win_rate: response.data.length > 0 ? Math.round((wonDeals / response.data.length) * 100) : 0,
                active_pipeline: response.data.filter((d: Deal) => !['CLOSED_WON', 'CLOSED_LOST'].includes(d.stage)).length
            });
        } catch (error) {
            console.error('Error fetching deals', error);
            showNotification('Error fetching deals', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchDeals();
    };

    const exportToExcel = async () => {
        try {
            const response = await api.get('/deals/export_excel/', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Deals_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
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
            const response = await api.get('/deals/export_pdf/', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Deals_Report_${new Date().toISOString().split('T')[0]}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            showNotification('PDF report generated successfully', 'success');
        } catch (error) {
            showNotification('Error generating PDF report. Ensure WeasyPrint is installed on server.', 'error');
        }
    };

    const exportToCSV = async () => {
        try {
            const response = await api.get('/deals/export_csv/', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Deals_Report_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            showNotification('CSV report generated successfully', 'success');
        } catch (error) {
            showNotification('Error generating CSV report', 'error');
        }
    };

    const getStageColor = (stage: string) => {
        switch (stage) {
            case 'CLOSED_WON': return { bg: '#E6FFFA', text: '#00A3C4' };
            case 'CLOSED_LOST': return { bg: '#FFF5F5', text: '#E53E3E' };
            case 'NEGOTIATION': return { bg: '#EBF8FF', text: '#3182CE' };
            default: return { bg: '#F7FAFC', text: '#4A5568' };
        }
    };

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="ae-grid-4">
                <div className="ae-card">
                    <div className="ae-card-header">
                        <div className="ae-icon-box bg-blue-soft"><TrendingUp size={20} /></div>
                    </div>
                    <div className="ae-card-label">Total Value (INR/USD)</div>
                    <div className="ae-card-value">{stats.total_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                </div>
                <div className="ae-card">
                    <div className="ae-card-header">
                        <div className="ae-icon-box bg-orange-soft"><LayoutDashboard size={20} /></div>
                    </div>
                    <div className="ae-card-label">Total Deals</div>
                    <div className="ae-card-value">{stats.total_deals}</div>
                </div>
                <div className="ae-card">
                    <div className="ae-card-header">
                        <div className="ae-icon-box bg-green-soft"><CheckCircle2 size={20} /></div>
                    </div>
                    <div className="ae-card-label">Win Rate</div>
                    <div className="ae-card-value">{stats.win_rate}%</div>
                </div>
                <div className="ae-card">
                    <div className="ae-card-header">
                        <div className="ae-icon-box bg-purple-soft"><Clock size={20} /></div>
                    </div>
                    <div className="ae-card-label">Active Pipeline</div>
                    <div className="ae-card-value">{stats.active_pipeline}</div>
                </div>
            </div>

            {/* Actions & Filters */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #E0E6ED' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <form onSubmit={handleSearch} className="ae-input-group" style={{ width: '300px' }}>
                        <span className="ae-search-icon"><Search size={18} /></span>
                        <input
                            type="text"
                            className="ae-input"
                            placeholder="Search deals..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </form>
                    <select
                        className="ae-input"
                        style={{ width: '200px', paddingLeft: '12px' }}
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value)}
                    >
                        <option value="all">All Deals</option>
                        <option value="my_deals">My Deals</option>
                        <option value="unread">Unread Deals</option>
                        <option value="new_this_week">New This Week</option>
                        <option value="closing_this_month">Closing This Month</option>
                    </select>
                </div>
                <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                    <div className="relative">
                        <button
                            className="ae-btn-secondary"
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Download size={18} /> Export <ChevronDown size={14} />
                        </button>
                        {showExportMenu && (
                            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', border: '1px solid #E2E8F0', zIndex: 10, minWidth: '180px', overflow: 'hidden' }}>
                                <button
                                    onClick={() => { exportToExcel(); setShowExportMenu(false); }}
                                    style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#4A5568', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                    className="hover:bg-gray-50"
                                >
                                    <FileSpreadsheet size={16} className="text-green-600" /> Excel (.xlsx)
                                </button>
                                <button
                                    onClick={() => { exportToCSV(); setShowExportMenu(false); }}
                                    style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#4A5568', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                    className="hover:bg-gray-50"
                                >
                                    <FileText size={16} className="text-blue-600" /> CSV (.csv)
                                </button>
                                <button
                                    onClick={() => { exportToPDF(); setShowExportMenu(false); }}
                                    style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#4A5568', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                    className="hover:bg-gray-50"
                                >
                                    <FileText size={16} className="text-red-600" /> PDF (.pdf)
                                </button>
                            </div>
                        )}
                    </div>
                    <button className="ae-btn-primary" onClick={onCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <PlusCircle size={18} /> New Deal
                    </button>
                </div>
            </div>

            {/* Deals Table */}
            <div className="ae-table-container">
                <table className="ae-table">
                    <thead>
                        <tr>
                            <th>Status/Sync</th>
                            <th>Deal ID</th>
                            <th>Deal Name</th>
                            <th>Project Name</th>
                            <th>Customer</th>
                            <th>Stage</th>
                            <th style={{ textAlign: 'right' }}>Amount</th>
                            <th>Owner</th>
                            <th>Close Date</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={9} style={{ textAlign: 'center', padding: '100px' }}>
                                    <Loader2 className="animate-spin" style={{ margin: '0 auto' }} />
                                </td>
                            </tr>
                        ) : deals.length === 0 ? (
                            <tr>
                                <td colSpan={9} style={{ textAlign: 'center', padding: '100px', color: '#718096' }}>
                                    No deals found.
                                </td>
                            </tr>
                        ) : (
                            deals.map((deal) => {
                                const stageStyle = getStageColor(deal.stage);
                                return (
                                    <tr key={deal.id} style={{ background: !deal.is_read ? '#FFF9F5' : 'inherit' }}>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {!deal.is_read && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#FF6B00', fontSize: '0.65rem', fontWeight: 800 }}>
                                                        <Mail size={12} /> NEW
                                                    </div>
                                                )}
                                                {deal.hubspot_id ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#3182CE', fontSize: '0.65rem', fontWeight: 700 }}>
                                                        <RefreshCcw size={12} /> HS: {deal.hubspot_id}
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: '0.6rem', color: '#A0AEC0' }}>Not Synced</div>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ fontWeight: 600, color: '#0066CC' }}>{deal.deal_id}</td>
                                        <td style={{ fontWeight: 700 }}>{deal.deal_name}</td>
                                        <td>{deal.project_name || '—'}</td>
                                        <td>{deal.customer_name || '—'}</td>
                                        <td>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '99px',
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                background: stageStyle.bg,
                                                color: stageStyle.text
                                            }}>
                                                {deal.stage.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                            {deal.currency} {parseFloat(deal.amount).toLocaleString()}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>
                                                    {deal.owner_name?.charAt(0).toUpperCase()}
                                                </div>
                                                {deal.owner_name}
                                            </div>
                                        </td>
                                        <td>{deal.expected_close_date || '—'}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button
                                                onClick={() => onView(deal.id)}
                                                className="ae-btn-secondary"
                                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DealDashboard;
