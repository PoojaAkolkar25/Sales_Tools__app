import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Loader2,
    FileSpreadsheet,
    FileText,
    ChevronDown,
    Download,
    Columns
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { formatToAppDate } from '../utils/dateUtils';

const ALL_COLUMNS = [
    { key: 'deal_id', label: 'ID' },
    { key: 'deal_date', label: 'Deal Date *' },
    { key: 'deal_name', label: 'Project Name' },
    { key: 'company', label: 'Company' },
    { key: 'lead_no', label: 'Lead No.' },
    { key: 'stage', label: 'Stage' },
    { key: 'currency', label: 'Currency' },
    { key: 'deal_amount', label: 'Amount' },
    { key: 'deal_type', label: 'Type' },
    { key: 'customer_name', label: 'Customer/Partner Name' },
    { key: 'customer_email', label: 'Customer Email' },
    { key: 'end_customer', label: 'End Customer' },
    { key: 'client_type', label: 'Client Type' },
    { key: 'inside_salesperson', label: 'Inside Salesperson' },
    { key: 'inside_sales_head', label: 'Inside Sales Head' },
    { key: 'salesperson_name', label: 'Salesperson' },
    { key: 'sales_head', label: 'Sales Head' },
    { key: 'project_manager', label: 'Proj. Manager' },
    { key: 'project_manager_head', label: 'PM Head' },
    { key: 'expected_close_date', label: 'Exp. Close Date' },
    { key: 'remark', label: 'Remarks/Description' },
    { key: 'won_lost_reason', label: 'Won/Lost Reason' },
    { key: 'hubspot_id', label: 'HubSpot ID' },
    { key: 'last_synced_at', label: 'Last Synced' }
];

interface Deal {
    id: number;
    company: string;
    deal_id: string;
    deal_name: string;
    customer_name: string;
    customer_email?: string;
    end_customer?: string;
    stage: string;
    current_stage: string; // Dynamic stage calculated by backend
    deal_amount: string;
    currency: string;
    fx_rate?: number;
    deal_type?: string;
    client_type?: string;
    inside_salesperson?: string;
    inside_sales_head?: string;
    salesperson_name?: string;
    sales_head?: string;
    project_manager?: string;
    project_manager_head?: string;
    expected_close_date: string;
    deal_date: string;
    remark?: string;
    won_lost_reason?: string;
    hubspot_id?: string;
    last_synced_at?: string;
    created_at: string;
    is_read: boolean;
    lead_no?: string;
}

interface DealDashboardProps {
    onView: (id: number) => void;
}

const DealDashboard: React.FC<DealDashboardProps> = ({ onView }) => {
    const { showNotification } = useNotification();
    const [deals, setDeals] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem('dealDashboard_visibleColumns');
        return saved ? JSON.parse(saved) : ALL_COLUMNS.map(col => col.key);
    });

    const exportMenuRef = useRef<HTMLDivElement>(null);
    const columnMenuRef = useRef<HTMLDivElement>(null);

    const [filters, setFilters] = useState(() => {
        const defaults = {
            deal_id: '',
            deal_name: '',
            company: '',
            lead_no: '',
            stage: '',
            currency: '',
            deal_amount: '',
            fx_rate: '',
            deal_type: '',
            customer_name: '',
            customer_email: '',
            end_customer: '',
            client_type: '',
            inside_salesperson: '',
            inside_sales_head: '',
            salesperson_name: '',
            sales_head: '',
            project_manager: '',
            project_manager_head: '',
            expected_close_date: '',
            deal_date: '',
            remark: '',
            won_lost_reason: '',
            hubspot_id: '',
            last_synced_at: '',
            period: '',
            startDate: '',
            endDate: ''
        };
        const saved = localStorage.getItem('dealDashboard_filters');
        if (saved) {
            try {
                return { ...defaults, ...JSON.parse(saved) };
            } catch (e) {
                return defaults;
            }
        }
        return defaults;
    });

    useEffect(() => {
        fetchDeals();
    }, []);

    useEffect(() => {
        localStorage.setItem('dealDashboard_visibleColumns', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    useEffect(() => {
        localStorage.setItem('dealDashboard_filters', JSON.stringify(filters));
    }, [filters]);

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
            const matchesStage = filters.stage === '' || (deal.current_stage || deal.stage) === filters.stage;
            const matchesCurrency = filters.currency === '' || deal.currency === filters.currency;
            const matchesAmount = (deal.deal_amount || '').toString().includes(filters.deal_amount);
            const matchesType = filters.deal_type === '' || (deal as any).deal_type === filters.deal_type;
            const matchesCustomer = ((deal as any).customer_name || '').toLowerCase().includes((filters.customer_name || '').toLowerCase());
            const matchesEndCustomer = ((deal as any).end_customer || '').toLowerCase().includes((filters.end_customer || '').toLowerCase());
            const matchesClient = filters.client_type === '' || (deal as any).client_type === filters.client_type;
            const matchesInsideSales = ((deal as any).inside_salesperson || '').toLowerCase().includes((filters.inside_salesperson || '').toLowerCase());
            const matchesInsideHead = ((deal as any).inside_sales_head || '').toLowerCase().includes((filters.inside_sales_head || '').toLowerCase());
            const matchesSales = ((deal as any).salesperson_name || '').toLowerCase().includes((filters.salesperson_name || '').toLowerCase());
            const matchesHead = ((deal as any).sales_head || '').toLowerCase().includes((filters.sales_head || '').toLowerCase());
            const matchesPM = ((deal as any).project_manager || '').toLowerCase().includes((filters.project_manager || '').toLowerCase());
            const matchesPMHead = ((deal as any).project_manager_head || '').toLowerCase().includes((filters.project_manager_head || '').toLowerCase());
            const matchesRemark = ((deal as any).remark || '').toLowerCase().includes((filters.remark || '').toLowerCase());
            const matchesWonLost = ((deal as any).won_lost_reason || '').toLowerCase().includes((filters.won_lost_reason || '').toLowerCase());
            const matchesHubSpot = ((deal as any).hubspot_id || '').toLowerCase().includes((filters.hubspot_id || '').toLowerCase());
            const matchesSync = ((deal as any).last_synced_at || '').toLowerCase().includes((filters.last_synced_at || '').toLowerCase());

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

            return matchesId && matchesName && matchesCompany && matchesLead &&
                matchesStage && matchesCurrency && matchesAmount && matchesType &&
                matchesCustomer && matchesEndCustomer && matchesClient &&
                matchesInsideSales && matchesInsideHead && matchesSales &&
                matchesHead && matchesPM && matchesPMHead && matchesDate &&
                matchesRemark && matchesWonLost && matchesHubSpot && matchesSync;
        });
    }, [deals, filters]);

    const counts = useMemo(() => ({
        all: deals.length,
        dealCreated: deals.filter(d => (d.current_stage || d.stage) === 'DEAL_CREATED').length,
        costSheet: deals.filter(d => (d.current_stage || d.stage) === 'COST_SHEET').length,
        estimates: deals.filter(d => (d.current_stage || d.stage) === 'ESTIMATES').length,
        salesOrder: deals.filter(d => (d.current_stage || d.stage) === 'SALES_ORDER').length,
        invoice: deals.filter(d => (d.current_stage || d.stage) === 'INVOICE').length,
        payment: deals.filter(d => (d.current_stage || d.stage) === 'PAYMENT').length
    }), [deals]);

    const statusFlow = [
        { label: `Deal Created (${counts.dealCreated})`, value: 'DEAL_CREATED' },
        { label: `Cost Sheet (${counts.costSheet})`, value: 'COST_SHEET' },
        { label: `Estimates (${counts.estimates})`, value: 'ESTIMATES' },
        { label: `Sales Order (${counts.salesOrder})`, value: 'SALES_ORDER' },
        { label: `Invoice (${counts.invoice})`, value: 'INVOICE' },
        { label: `Payment (${counts.payment})`, value: 'PAYMENT' },
        { label: `All (${counts.all})`, value: '' }
    ];

    const getExportQueryParams = () => {
        const params = new URLSearchParams();
        if (filters.deal_id) params.append('deal_id', filters.deal_id);
        if (filters.deal_name) params.append('search', filters.deal_name); // Backend uses 'search' for name/customer
        if (filters.company) params.append('company', filters.company);
        if (filters.lead_no) params.append('lead_no', filters.lead_no);
        if (filters.stage) params.append('stage', filters.stage);
        if (filters.currency) params.append('currency', filters.currency);
        // Add other filters as backend supports. 
        // Note: The backend 'search' filter covers deal_name, deal_id, and customer_name.
        // We will send specific fields if backend supports them, otherwise rely on broad search or add backend support.
        // For now, let's map what we can to the existing backend or updated backend.

        // Let's pass all filters and update backend to handle them.
        if (filters.customer_name) params.append('customer_name', filters.customer_name);
        if (filters.end_customer) params.append('end_customer', filters.end_customer);
        if (filters.client_type) params.append('client_type', filters.client_type);
        if (filters.inside_salesperson) params.append('inside_salesperson', filters.inside_salesperson);
        if (filters.inside_sales_head) params.append('inside_sales_head', filters.inside_sales_head);
        if (filters.salesperson_name) params.append('salesperson_name', filters.salesperson_name);
        if (filters.sales_head) params.append('sales_head', filters.sales_head);
        if (filters.project_manager) params.append('project_manager', filters.project_manager);
        if (filters.project_manager_head) params.append('project_manager_head', filters.project_manager_head);

        // Date filters
        if (filters.period) {
            params.append('period', filters.period);
            if (filters.period === 'custom' && filters.startDate && filters.endDate) {
                params.append('start_date', filters.startDate);
                params.append('end_date', filters.endDate);
            }
        }

        return params.toString();
    };

    const exportToExcel = async () => {
        try {
            const queryParams = getExportQueryParams();
            const response = await api.get(`/deals/export_excel/?${queryParams}`, { responseType: 'blob' });
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
            const queryParams = getExportQueryParams();
            const response = await api.get(`/deals/export_pdf/?${queryParams}`, { responseType: 'blob' });
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

                    <div style={{ position: 'relative' }} ref={exportMenuRef}>
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

                    <div style={{ position: 'relative' }} ref={columnMenuRef}>
                        <button
                            className="ae-btn-secondary"
                            onClick={() => setShowColumnMenu(!showColumnMenu)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', fontSize: '0.8rem' }}
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
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                border: '1px solid #E2E8F0',
                                zIndex: 100,
                                minWidth: '200px',
                                maxHeight: '400px',
                                overflowY: 'auto'
                            }}>
                                <div style={{ padding: '8px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between' }}>
                                    <button
                                        onClick={() => setVisibleColumns(ALL_COLUMNS.map(c => c.key))}
                                        style={{ background: 'none', border: 'none', color: '#0066CC', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Select All
                                    </button>
                                    <button
                                        onClick={() => setVisibleColumns([])}
                                        style={{ background: 'none', border: 'none', color: '#718096', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Clear All
                                    </button>
                                </div>
                                {ALL_COLUMNS.map(col => (
                                    <label key={col.key} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '8px 16px',
                                        fontSize: '0.8rem',
                                        color: '#4A5568',
                                        cursor: 'pointer',
                                        userSelect: 'none'
                                    }} className="hover:bg-gray-50">
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
                                            style={{ cursor: 'pointer' }}
                                        />
                                        {col.label}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Status Tabs */}
            <div style={{
                display: 'flex',
                gap: '8px',
                background: 'white',
                padding: '4px',
                borderRadius: '12px',
                border: '1px solid #E0E6ED',
                width: 'fit-content'
            }}>
                {statusFlow.map((flow) => (
                    <button
                        key={flow.value}
                        onClick={() => setFilters({ ...filters, stage: flow.value })}
                        style={{
                            padding: '6px 16px',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: filters.stage === flow.value ? '#FF6B00' : 'transparent',
                            color: filters.stage === flow.value ? 'white' : '#718096',
                        }}
                    >
                        {flow.label}
                    </button>
                ))}
            </div>

            <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', border: '1px solid #E0E6ED' }}>
                <table className="ae-table" style={{ minWidth: visibleColumns.length > 8 ? '2000px' : '100%' }}>
                    <thead>
                        <tr>
                            {ALL_COLUMNS.map(col => visibleColumns.includes(col.key) && (
                                <th key={col.key} style={{ backgroundColor: '#FAFBFC', zIndex: 12 }}>{col.label}</th>
                            ))}
                            <th style={{ backgroundColor: '#FAFBFC', zIndex: 12, textAlign: 'center' }}>Actions</th>
                        </tr>
                        <tr style={{ background: '#F7FAFC' }}>
                            {ALL_COLUMNS.map(col => visibleColumns.includes(col.key) && (
                                <th key={col.key} style={{ backgroundColor: '#F7FAFC' }}>
                                    <div className="ae-input-group" style={{ margin: 0 }}>
                                        <input
                                            className="ae-input"
                                            placeholder="Filter..."
                                            value={(filters as any)[col.key]}
                                            onChange={e => setFilters({ ...filters, [col.key]: e.target.value })}
                                            style={{ height: '24px', fontSize: '11px', paddingTop: 0, paddingBottom: 0 }}
                                        />
                                    </div>
                                </th>
                            ))}
                            <th style={{ textAlign: 'center', backgroundColor: '#F7FAFC' }}>
                                <button
                                    onClick={() => setFilters({
                                        deal_id: '', deal_name: '', company: '', lead_no: '', stage: '',
                                        currency: '', deal_amount: '', deal_type: '',
                                        customer_name: '', customer_email: '', end_customer: '',
                                        client_type: '', inside_salesperson: '',
                                        inside_sales_head: '', salesperson_name: '', sales_head: '',
                                        project_manager: '', project_manager_head: '',
                                        expected_close_date: '', deal_date: '',
                                        remark: '', won_lost_reason: '', hubspot_id: '', last_synced_at: '',
                                        period: '', startDate: '', endDate: ''
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
                            <tr><td colSpan={visibleColumns.length + 1} style={{ textAlign: 'center', padding: '100px' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></td></tr>
                        ) : filteredDeals.length === 0 ? (
                            <tr><td colSpan={visibleColumns.length + 1} style={{ textAlign: 'center', padding: '100px', color: '#718096' }}>No projects found.</td></tr>
                        ) : (
                            filteredDeals.map((deal: Deal) => {
                                const stageStyle = getStageColor(deal.current_stage || deal.stage);
                                return (
                                    <tr key={deal.id}>
                                        {visibleColumns.includes('deal_id') && <td style={{ fontWeight: 600, color: '#0066CC' }}>{deal.deal_id}</td>}
                                        {visibleColumns.includes('deal_date') && <td>{formatToAppDate(deal.deal_date)}</td>}
                                        {visibleColumns.includes('deal_name') && <td style={{ fontWeight: 700 }}>{deal.deal_name}</td>}
                                        {visibleColumns.includes('company') && <td>{deal.company}</td>}
                                        {visibleColumns.includes('lead_no') && <td>{(deal as any).lead_no || '—'}</td>}
                                        {visibleColumns.includes('stage') && (
                                            <td>
                                                <span style={{ padding: '4px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700, background: stageStyle.bg, color: stageStyle.text }}>
                                                    {(deal.current_stage || deal.stage).replace('_', ' ')}
                                                </span>
                                            </td>
                                        )}
                                        {visibleColumns.includes('currency') && <td>{deal.currency}</td>}
                                        {visibleColumns.includes('deal_amount') && (
                                            <td style={{ fontWeight: 700 }}>
                                                {deal.currency === 'INR' ? '₹' : deal.currency === 'USD' ? '$' : deal.currency === 'EURO' ? '€' : ''}
                                                {parseFloat(deal.deal_amount).toLocaleString()}
                                            </td>
                                        )}
                                        {visibleColumns.includes('deal_type') && <td>{(deal as any).deal_type || '—'}</td>}
                                        {visibleColumns.includes('customer_name') && <td>{(deal as any).customer_name || '—'}</td>}
                                        {visibleColumns.includes('customer_email') && <td>{(deal as any).customer_email || '—'}</td>}
                                        {visibleColumns.includes('end_customer') && <td>{(deal as any).end_customer || '—'}</td>}
                                        {visibleColumns.includes('client_type') && <td>{(deal as any).client_type || '—'}</td>}
                                        {visibleColumns.includes('inside_salesperson') && <td>{(deal as any).inside_salesperson || '—'}</td>}
                                        {visibleColumns.includes('inside_sales_head') && <td>{(deal as any).inside_sales_head || '—'}</td>}
                                        {visibleColumns.includes('salesperson_name') && <td>{(deal as any).salesperson_name || '—'}</td>}
                                        {visibleColumns.includes('sales_head') && <td>{(deal as any).sales_head || '—'}</td>}
                                        {visibleColumns.includes('project_manager') && <td>{(deal as any).project_manager || '—'}</td>}
                                        {visibleColumns.includes('project_manager_head') && <td>{(deal as any).project_manager_head || '—'}</td>}
                                        {visibleColumns.includes('expected_close_date') && <td>{formatToAppDate((deal as any).expected_close_date)}</td>}
                                        {visibleColumns.includes('remark') && <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(deal as any).remark || '—'}</td>}
                                        {visibleColumns.includes('won_lost_reason') && <td>{(deal as any).won_lost_reason || '—'}</td>}
                                        {visibleColumns.includes('hubspot_id') && <td>{(deal as any).hubspot_id || '—'}</td>}
                                        {visibleColumns.includes('last_synced_at') && <td>{deal.last_synced_at ? new Date(deal.last_synced_at).toLocaleString() : '—'}</td>}
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


        </div >
    );
};

export default DealDashboard;
