import React, { useState, useEffect, useMemo } from 'react';
import {
    PlusCircle,
    Search,
    Loader2,
    FileSpreadsheet,
    FileText,
    RefreshCcw,
    ChevronDown,
    Download
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { formatToAppDate } from '../utils/dateUtils';

interface Deal {
    id: number;
    company: string;
    deal_id: string;
    deal_name: string;
    customer_name: string;
    stage: string;
    deal_amount: string;
    currency: string;
    expected_close_date: string;
    deal_date: string;
    created_at: string;
    is_read: boolean;
    hubspot_id?: string;
}

interface DealDashboardProps {
    onView: (id: number) => void;
    onCreate: () => void;
}

const DealDashboard: React.FC<DealDashboardProps> = ({ onView, onCreate }) => {
    const { showNotification } = useNotification();
    const [deals, setDeals] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [filters, setFilters] = useState({
        deal_id: '',
        deal_name: '',
        company: '',
        lead_no: '',
        stage: '',
        currency: '',
        deal_amount: '',
        fx_rate: '',
        deal_type: '',
        partner_name: '',
        client_type: '',
        salesperson_name: '',
        sales_head: '',
        project_manager: '',
        expected_close_date: '',
        deal_date: '',
        period: '',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        fetchDeals();
    }, []);

    const fetchDeals = async () => {
        setLoading(true);
        try {
            const response = await api.get('/deals/');
            setDeals(response.data);
        } catch (error) {
            console.error('Error fetching deals', error);
            showNotification('Error fetching deals', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filteredDeals = useMemo(() => {
        return deals.filter(deal => {
            const matchesId = (deal.deal_id || '').toLowerCase().includes(filters.deal_id.toLowerCase());
            const matchesName = (deal.deal_name || '').toLowerCase().includes(filters.deal_name.toLowerCase());
            const matchesCompany = filters.company === '' || deal.company === filters.company;
            const matchesLead = ((deal as any).lead_no || '').toLowerCase().includes(filters.lead_no.toLowerCase());
            const matchesStage = filters.stage === '' || deal.stage === filters.stage;
            const matchesCurrency = filters.currency === '' || deal.currency === filters.currency;
            const matchesAmount = (deal.deal_amount || '').toString().includes(filters.deal_amount);
            const matchesType = filters.deal_type === '' || (deal as any).deal_type === filters.deal_type;
            const matchesPartner = ((deal as any).partner_name || '').toLowerCase().includes(filters.partner_name.toLowerCase());
            const matchesClient = filters.client_type === '' || (deal as any).client_type === filters.client_type;
            const matchesSales = ((deal as any).salesperson_name || '').toLowerCase().includes(filters.salesperson_name.toLowerCase());
            const matchesHead = ((deal as any).sales_head || '').toLowerCase().includes(filters.sales_head.toLowerCase());
            const matchesPM = ((deal as any).project_manager || '').toLowerCase().includes(filters.project_manager.toLowerCase());

            let matchesDate = true;
            if (filters.period) {
                const dealDate = new Date(deal.deal_date || deal.created_at);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (filters.period === 'last_month') {
                    const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    const lastOfLastMonth = new Date(firstOfThisMonth.getTime() - 1);
                    const firstOfLastMonth = new Date(lastOfLastMonth.getFullYear(), lastOfLastMonth.getMonth(), 1);
                    matchesDate = dealDate >= firstOfLastMonth && dealDate <= lastOfLastMonth;
                } else if (filters.period === 'last_3_months') {
                    const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    const lastOfLastMonth = new Date(firstOfThisMonth.getTime() - 1);
                    const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
                    matchesDate = dealDate >= threeMonthsAgo && dealDate <= lastOfLastMonth;
                } else if (filters.period === 'last_6_months') {
                    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1);
                    matchesDate = dealDate >= sixMonthsAgo && dealDate < new Date(today.getFullYear(), today.getMonth(), 1);
                } else if (filters.period === 'last_year') {
                    const lastYear = today.getFullYear() - 1;
                    const startOfYear = new Date(lastYear, 0, 1);
                    const endOfYear = new Date(lastYear, 11, 31, 23, 59, 59);
                    matchesDate = dealDate >= startOfYear && dealDate <= endOfYear;
                } else if (filters.period === 'custom' && filters.startDate && filters.endDate) {
                    const start = new Date(filters.startDate);
                    const end = new Date(filters.endDate);
                    end.setHours(23, 59, 59, 999);
                    matchesDate = dealDate >= start && dealDate <= end;
                }
            }

            return matchesId && matchesName && matchesCompany && matchesLead && matchesStage &&
                matchesCurrency && matchesAmount && matchesType && matchesPartner &&
                matchesClient && matchesSales && matchesHead && matchesPM && matchesDate;
        });
    }, [deals, filters]);

    const exportToExcel = async () => {
        try {
            const response = await api.get('/deals/export_excel/', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Projects_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
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
            link.setAttribute('download', `Projects_Report_${new Date().toISOString().split('T')[0]}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            showNotification('PDF report generated successfully', 'success');
        } catch (error) {
            showNotification('Error generating PDF report', 'error');
        }
    };

    const getStageColor = (stage: string) => {
        switch (stage) {
            case 'PAYMENT': return { bg: '#E6FFFA', text: '#00A3C4' };
            case 'DEAL_CREATED': return { bg: '#EBF8FF', text: '#3182CE' };
            case 'COST_SHEET': return { bg: '#FEFCBF', text: '#B7791F' };
            case 'ESTIMATES': return { bg: '#E9D8FD', text: '#805AD5' };
            default: return { bg: '#F7FAFC', text: '#4A5568' };
        }
    };

    return (
        <div className="ae-table-container" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '4px', height: '18px', background: '#FF6B00', borderRadius: '2px' }}></div>
                    <h1 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1a1f36', margin: 0 }}>
                        Projects Dashboard
                    </h1>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4A5568' }}>Report Period:</span>
                        <select
                            className="ae-input"
                            value={filters.period}
                            onChange={e => setFilters({ ...filters, period: e.target.value })}
                            style={{ height: '32px', fontSize: '0.8rem', width: '150px', padding: '0 12px', lineHeight: '32px' }}
                        >
                            <option value="">All Time</option>
                            <option value="last_month">Last Month</option>
                            <option value="last_3_months">Last 3 Months</option>
                            <option value="last_6_months">Last 6 Months</option>
                            <option value="last_year">Last Year</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>

                    {filters.period === 'custom' && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <input type="date" className="ae-input" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} style={{ height: '32px', fontSize: '0.75rem', width: '120px', padding: '0 8px' }} />
                            <input type="date" className="ae-input" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} style={{ height: '32px', fontSize: '0.75rem', width: '120px', padding: '0 8px' }} />
                        </div>
                    )}

                    <div style={{ position: 'relative' }}>
                        <button
                            className="ae-btn-secondary"
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', fontSize: '0.8rem' }}
                        >
                            <Download size={16} /> Export <ChevronDown size={14} />
                        </button>
                        {showExportMenu && (
                            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', border: '1px solid #E2E8F0', zIndex: 100, minWidth: '160px', overflow: 'hidden' }}>
                                <button
                                    onClick={() => { exportToExcel(); setShowExportMenu(false); }}
                                    style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#4A5568', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                    className="hover:bg-gray-50"
                                >
                                    <FileSpreadsheet size={16} className="text-green-600" /> Excel Report
                                </button>
                                <button
                                    onClick={() => { exportToPDF(); setShowExportMenu(false); }}
                                    style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#4A5568', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                    className="hover:bg-gray-50"
                                >
                                    <FileText size={16} className="text-red-600" /> PDF Report
                                </button>
                            </div>
                        )}
                    </div>

                    <button onClick={fetchDeals} disabled={loading} className="ae-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', fontSize: '0.8rem' }}>
                        <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>
            </div>

            <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', border: '1px solid #E0E6ED' }}>
                <table className="ae-table" style={{ minWidth: '2000px' }}>
                    <thead>
                        <tr>
                            <th style={{ backgroundColor: '#FAFBFC', zIndex: 12 }}>ID</th>
                            <th style={{ backgroundColor: '#FAFBFC', zIndex: 12 }}>Project Name</th>
                            <th style={{ backgroundColor: '#FAFBFC', zIndex: 12 }}>Company</th>
                            <th style={{ backgroundColor: '#FAFBFC', zIndex: 12 }}>Lead No.</th>
                            <th style={{ backgroundColor: '#FAFBFC', zIndex: 12 }}>Stage</th>
                            <th style={{ backgroundColor: '#FAFBFC', zIndex: 12 }}>Currency</th>
                            <th style={{ backgroundColor: '#FAFBFC', zIndex: 12 }}>Amount</th>
                            <th style={{ backgroundColor: '#FAFBFC', zIndex: 12 }}>FX Rate</th>
                            <th style={{ backgroundColor: '#FAFBFC', zIndex: 12 }}>Type</th>
                            <th style={{ backgroundColor: '#FAFBFC', zIndex: 12 }}>Partner</th>
                            <th style={{ backgroundColor: '#FAFBFC', zIndex: 12 }}>Client Type</th>
                            <th style={{ backgroundColor: '#FAFBFC', zIndex: 12 }}>Salesperson</th>
                            <th style={{ backgroundColor: '#FAFBFC', zIndex: 12 }}>Sales Head</th>
                            <th style={{ backgroundColor: '#FAFBFC', zIndex: 12 }}>Proj. Manager</th>
                            <th style={{ backgroundColor: '#FAFBFC', zIndex: 12 }}>Exp. Close Date</th>
                            <th style={{ backgroundColor: '#FAFBFC', zIndex: 12 }}>Date</th>
                            <th style={{ backgroundColor: '#FAFBFC', zIndex: 12, textAlign: 'center' }}>Actions</th>
                        </tr>
                        <tr style={{ background: '#F7FAFC' }}>
                            {['deal_id', 'deal_name', 'company', 'lead_no', 'stage', 'currency', 'deal_amount', 'fx_rate', 'deal_type', 'partner_name', 'client_type', 'salesperson_name', 'sales_head', 'project_manager', 'expected_close_date', 'deal_date'].map((field) => (
                                <th key={field} style={{ backgroundColor: '#F7FAFC' }}>
                                    <div className="ae-input-group" style={{ margin: 0 }}>
                                        <Search className="ae-search-icon" size={12} />
                                        <input
                                            className="ae-input"
                                            placeholder="Filter..."
                                            value={(filters as any)[field]}
                                            onChange={e => setFilters({ ...filters, [field]: e.target.value })}
                                            style={{ height: '24px', fontSize: '11px', paddingTop: 0, paddingBottom: 0 }}
                                        />
                                    </div>
                                </th>
                            ))}
                            <th style={{ textAlign: 'center', backgroundColor: '#F7FAFC' }}>
                                <button
                                    onClick={() => setFilters({
                                        deal_id: '', deal_name: '', company: '', lead_no: '', stage: '',
                                        currency: '', deal_amount: '', fx_rate: '', deal_type: '',
                                        partner_name: '', client_type: '', salesperson_name: '',
                                        sales_head: '', project_manager: '', expected_close_date: '',
                                        deal_date: '', period: '', startDate: '', endDate: ''
                                    })}
                                    style={{ height: '24px', width: '100%', fontSize: '10px', color: '#FF6B00', fontWeight: 700, cursor: 'pointer', background: 'white', border: '1px solid #E0E6ED', borderRadius: '6px' }}
                                >
                                    Clear
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={17} style={{ textAlign: 'center', padding: '100px' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></td></tr>
                        ) : filteredDeals.length === 0 ? (
                            <tr><td colSpan={17} style={{ textAlign: 'center', padding: '100px', color: '#718096' }}>No projects found.</td></tr>
                        ) : (
                            filteredDeals.map((deal: Deal) => {
                                const stageStyle = getStageColor(deal.stage);
                                return (
                                    <tr key={deal.id}>
                                        <td style={{ fontWeight: 600, color: '#0066CC' }}>{deal.deal_id}</td>
                                        <td style={{ fontWeight: 700 }}>{deal.deal_name}</td>
                                        <td>{deal.company}</td>
                                        <td>{(deal as any).lead_no || '—'}</td>
                                        <td>
                                            <span style={{ padding: '4px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700, background: stageStyle.bg, color: stageStyle.text }}>
                                                {deal.stage.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>{deal.currency}</td>
                                        <td style={{ fontWeight: 700 }}>{parseFloat(deal.deal_amount).toLocaleString()}</td>
                                        <td>{(deal as any).fx_rate}</td>
                                        <td>{(deal as any).deal_type || '—'}</td>
                                        <td>{(deal as any).partner_name || '—'}</td>
                                        <td>{(deal as any).client_type || '—'}</td>
                                        <td>{(deal as any).salesperson_name || '—'}</td>
                                        <td>{(deal as any).sales_head || '—'}</td>
                                        <td>{(deal as any).project_manager || '—'}</td>
                                        <td>{formatToAppDate((deal as any).expected_close_date)}</td>
                                        <td>{formatToAppDate(deal.deal_date)}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button onClick={() => onView(deal.id)} className="ae-btn-secondary" style={{ padding: '4px 12px', fontSize: '0.75rem' }}>
                                                View
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
