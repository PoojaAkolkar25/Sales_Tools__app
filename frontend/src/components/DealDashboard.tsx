import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    Loader2,
    FileSpreadsheet,
    FileText,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Download,
    Columns
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { formatToAppDate } from '../utils/dateUtils';
import Pagination from './Pagination';


// Width needed to fit the SHORT label (initial/collapsed state)
const SHORT_COL_WIDTHS: Record<string, number> = {
    deal_id: 35,
    deal_date: 45,
    deal_name: 50,
    company: 40,
    lead_no: 40,
    stage: 55,
    currency: 40,
    deal_amount: 50,
    deal_type: 45,
    customer_name: 60,
    customer_email: 60,
    end_customer: 70,
    client_type: 55,
    inside_salesperson: 70,
    inside_sales_head: 70,
    salesperson_name: 60,
    sales_head: 60,
    project_manager: 40,
    project_manager_head: 60,
    expected_close_date: 60,
    hubspot_id: 50,
    last_synced_at: 55,
};

// Width at which the FULL label becomes visible (snaps to full label text)
const FULL_LABEL_WIDTHS: Record<string, number> = {
    deal_id: 45,
    deal_date: 85,
    deal_name: 130,
    company: 85,
    lead_no: 75,
    stage: 110,
    currency: 55,
    deal_amount: 90,
    deal_type: 95,
    customer_name: 130,
    customer_email: 140,
    end_customer: 125,
    client_type: 100,
    inside_salesperson: 130,
    inside_sales_head: 130,
    salesperson_name: 115,
    sales_head: 115,
    project_manager: 115,
    project_manager_head: 115,
    expected_close_date: 115,
    hubspot_id: 85,
    last_synced_at: 115,
};

// MIN_COL_WIDTHS = smallest allowed (short label width)


// MAX_COL_WIDTHS = largest allowed (full label and content width)
const MAX_COL_WIDTHS: Record<string, number> = {
    deal_id: 70,
    deal_date: 110,
    deal_name: 250,
    company: 120,
    lead_no: 100,
    stage: 150,
    currency: 80,
    deal_amount: 150,
    deal_type: 150,
    customer_name: 250,
    customer_email: 200,
    end_customer: 200,
    client_type: 120,
    inside_salesperson: 180,
    inside_sales_head: 180,
    salesperson_name: 150,
    sales_head: 150,
    project_manager: 150,
    project_manager_head: 150,
    expected_close_date: 150,
    hubspot_id: 120,
    last_synced_at: 150,
};

const ALL_COLUMNS = [
    { key: 'deal_id', label: 'ID', shortLabel: 'ID' },
    { key: 'deal_date', label: 'Deal Date', shortLabel: 'Date' },
    { key: 'deal_name', label: 'Project Name', shortLabel: 'Proj.' },
    { key: 'company', label: 'Company', shortLabel: 'Co.' },
    { key: 'lead_no', label: 'Lead No.', shortLabel: 'Lead' },
    { key: 'stage', label: 'Stage', shortLabel: 'Stage' },
    { key: 'currency', label: 'Currency', shortLabel: 'Curr.' },
    { key: 'deal_amount', label: 'Amount', shortLabel: 'Amt.' },
    { key: 'deal_type', label: 'Type', shortLabel: 'Type' },
    { key: 'customer_name', label: 'Customer/Partner Name', shortLabel: 'Cust.' },
    { key: 'customer_email', label: 'Customer Email', shortLabel: 'Email' },
    { key: 'end_customer', label: 'End user Name', shortLabel: 'End User' },
    { key: 'client_type', label: 'Client Type', shortLabel: 'Client' },
    { key: 'inside_salesperson', label: 'Inside Salesperson', shortLabel: 'In. SP' },
    { key: 'inside_sales_head', label: 'Inside Sales Head', shortLabel: 'IS Hd.' },
    { key: 'salesperson_name', label: 'Salesperson', shortLabel: 'Sales' },
    { key: 'sales_head', label: 'Sales Head', shortLabel: 'S.Hd.' },
    { key: 'project_manager', label: 'Proj. Manager', shortLabel: 'PM' },
    { key: 'project_manager_head', label: 'PM Head', shortLabel: 'PMHd.' },
    { key: 'expected_close_date', label: 'Exp. Close Date', shortLabel: 'Close' },
    { key: 'hubspot_id', label: 'HubSpot ID', shortLabel: 'HS ID' },
    { key: 'last_synced_at', label: 'Last Synced', shortLabel: 'Syncd.' },
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
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const [showFilters] = useState(true);
    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem('dealDashboard_visibleColumns');
        return saved ? JSON.parse(saved) : ALL_COLUMNS.map(col => col.key);
    });

    const exportMenuRef = useRef<HTMLDivElement>(null);
    const columnMenuRef = useRef<HTMLDivElement>(null);
    const resizingRef = useRef<{ colKey: string; startX: number; startWidth: number } | null>(null);
    const tableScrollRef = useRef<HTMLDivElement>(null);

    const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
        const saved = localStorage.getItem('dealDashboard_colWidths');
        if (saved) return JSON.parse(saved);
        const defaults: Record<string, number> = {};
        ALL_COLUMNS.forEach(c => { defaults[c.key] = FULL_LABEL_WIDTHS[c.key] || 150; });
        return defaults;
    });

    const getColWidth = (key: string) => colWidths[key] ?? 150;

    const startResize = useCallback((e: React.MouseEvent, key: string) => {
        e.preventDefault();
        e.stopPropagation();
        resizingRef.current = { colKey: key, startX: e.clientX, startWidth: getColWidth(key) };

        const onMouseMove = (ev: MouseEvent) => {
            if (!resizingRef.current) return;
            const key = resizingRef.current.colKey;
            const delta = ev.clientX - resizingRef.current.startX;
            const minWidth = SHORT_COL_WIDTHS[key] ?? 40;
            const maxWidth = MAX_COL_WIDTHS[key] ?? 300;
            const newWidth = Math.min(maxWidth, Math.max(minWidth, resizingRef.current.startWidth + delta));
            setColWidths(prev => ({ ...prev, [key]: newWidth }));
        };

        const onMouseUp = () => {
            resizingRef.current = null;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            setColWidths(prev => {
                localStorage.setItem('dealDashboard_colWidths', JSON.stringify(prev));
                return prev;
            });
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, [colWidths]);

    const [filters, setFilters] = useState(() => {
        const defaults = {
            deal_id: '',
            deal_name: '',
            company: '',
            lead_no: '',
            stage: 'DEAL_CREATED',
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
        setCurrentPage(1);
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
            const matchesStage = filters.stage === '' || deal.stage === filters.stage;
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
            const matchesHubSpot = ((deal as any).hubspot_id || '').toLowerCase().includes((filters.hubspot_id || '').toLowerCase());
            const matchesSync = ((deal as any).last_synced_at || '').toLowerCase().includes((filters.last_synced_at || '').toLowerCase());

            const matchesSearchQuery = true;

            let matchesDate = true;
            if (filters.period) {
                const parseLocalDate = (dateStr: string) => {
                    if (!dateStr) return null;
                    if (dateStr.includes('T')) return new Date(dateStr);
                    const [year, month, day] = dateStr.split('-').map(Number);
                    return new Date(year, month - 1, day);
                };

                const dealDate = parseLocalDate(deal.deal_date || deal.created_at.split('T')[0]);
                if (!dealDate) return true;

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
                    const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1);
                    matchesDate = dealDate >= threeMonthsAgo && dealDate <= lastOfLastMonth;
                } else if (filters.period === 'last_6_months') {
                    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
                    const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    const lastOfLastMonth = new Date(firstOfThisMonth.getTime() - 1);
                    matchesDate = dealDate >= sixMonthsAgo && dealDate <= lastOfLastMonth;
                } else if (filters.period === 'last_year') {
                    const lastYear = today.getFullYear() - 1;
                    const startOfYear = new Date(lastYear, 0, 1);
                    const endOfYear = new Date(lastYear, 11, 31, 23, 59, 59);
                    matchesDate = dealDate >= startOfYear && dealDate <= endOfYear;
                } else if (filters.period === 'custom' && filters.startDate && filters.endDate) {
                    const start = parseLocalDate(filters.startDate);
                    const end = parseLocalDate(filters.endDate);
                    if (start && end) {
                        end.setHours(23, 59, 59, 999);
                        matchesDate = dealDate >= start && dealDate <= end;
                    }
                }
            }

            return matchesId && matchesName && matchesCompany && matchesLead &&
                matchesStage && matchesCurrency && matchesAmount && matchesType &&
                matchesCustomer && matchesEndCustomer && matchesClient &&
                matchesInsideSales && matchesInsideHead && matchesSales &&
                matchesHead && matchesPM && matchesPMHead && matchesDate &&
                matchesHubSpot && matchesSync && matchesSearchQuery;
        });
    }, [deals, filters]);

    const paginatedDeals = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredDeals.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredDeals, currentPage, ITEMS_PER_PAGE]);

    const counts = useMemo(() => ({
        all: deals.length,
        dealCreated: deals.filter(d => d.stage === 'DEAL_CREATED').length,
        costSheet: deals.filter(d => d.stage === 'COST_SHEET').length,
        estimates: deals.filter(d => d.stage === 'ESTIMATES').length,
        salesOrder: deals.filter(d => d.stage === 'SALES_ORDER').length,
        invoice: deals.filter(d => d.stage === 'INVOICE').length,
        payment: deals.filter(d => d.stage === 'PAYMENT').length
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


    const getStageColor = (_stage: string) => {
        return { bg: 'var(--bg-secondary)', text: 'var(--theme-primary)' };
    };

    return (
        <div className="ae-table-container" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 'none', overflowY: 'visible' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '4px', height: '18px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                    <h1 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        Projects Dashboard
                    </h1>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Report Period:</span>
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
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 14px',
                                fontSize: '0.8rem',
                                border: showExportMenu ? '1px solid var(--theme-primary)' : '1px solid var(--ae-gray-100)',
                                boxShadow: showExportMenu ? '0 0 0 2px rgba(187, 77, 0, 0.1)' : 'none'
                            }}
                        >
                            <Download size={16} /> Export <ChevronDown size={14} />
                        </button>
                        {showExportMenu && (
                            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--bg-primary)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', border: '1px solid var(--border-primary)', zIndex: 100, minWidth: '160px', overflow: 'hidden' }}>
                                <button
                                    onClick={() => { exportToPDF(); setShowExportMenu(false); }}
                                    style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                >
                                    <FileSpreadsheet size={16} style={{ color: '#DC2626' }} /> PDF Report
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
                                border: showColumnMenu ? '1px solid var(--theme-primary)' : '1px solid var(--ae-gray-100)',
                                boxShadow: showColumnMenu ? '0 0 0 2px rgba(187, 77, 0, 0.1)' : 'none'
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
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-primary)'}
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
                                                accentColor: '#FF6B00'
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

            {/* Status Tabs */}
            <div style={{
                display: 'flex',
                gap: '8px',
                background: 'var(--bg-primary)',
                padding: '4px',
                borderRadius: '12px',
                border: '1px solid var(--border-primary)',
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
                            background: filters.stage === flow.value ? 'var(--theme-primary)' : 'transparent',
                            color: filters.stage === flow.value ? 'white' : 'var(--text-secondary)',
                        }}
                    >
                        {flow.label}
                    </button>
                ))}
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
                        right: '-18px',
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
                    <table className="ae-table" style={{ tableLayout: 'fixed', width: 'max-content' }}>
                        <colgroup>
                            {visibleColumns.map(key => (
                                <col key={key} style={{ width: `${getColWidth(key)}px` }} />
                            ))}
                            <col style={{ width: '80px' }} />
                        </colgroup>
                        <thead>
                            <tr>
                                {visibleColumns.map(key => {
                                    const col = ALL_COLUMNS.find(c => c.key === key);
                                    return (
                                        <th key={key} style={{
                                            backgroundColor: 'var(--ae-table-header-bg)',
                                            zIndex: 12,
                                            position: 'relative',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            userSelect: 'none',
                                            paddingRight: '20px',
                                            borderRight: '1px solid var(--border-secondary)',
                                            borderBottom: '1px solid var(--border-secondary)'
                                        }}>
                                            {/* Show short label until dragged to full-label threshold */}
                                            <span title={col?.label}>
                                                {getColWidth(key) < (SHORT_COL_WIDTHS[key] + 5)
                                                    ? col?.shortLabel ?? col?.label
                                                    : col?.label}
                                            </span>
                                            {/* Resize handle */}
                                            <div
                                                onMouseDown={(e) => startResize(e, key)}
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    right: 0,
                                                    width: '6px',
                                                    height: '100%',
                                                    cursor: 'col-resize',
                                                    background: 'transparent',
                                                    zIndex: 20,
                                                }}
                                                title="Drag to resize"
                                            />
                                        </th>
                                    );
                                })}
                                <th style={{ backgroundColor: 'var(--ae-table-header-bg)', zIndex: 12, textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border-secondary)' }}>Actions</th>
                            </tr>
                            {showFilters && (
                                <tr style={{ background: 'var(--ae-filter-row-bg)' }}>
                                    {visibleColumns.map(key => (
                                        <th key={key} style={{ backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>
                                            <div className="ae-input-group" style={{ margin: 0 }}>
                                                <input
                                                    className="ae-input"
                                                    placeholder="Filter..."
                                                    value={(filters as any)[key]}
                                                    onChange={e => setFilters({ ...filters, [key]: e.target.value })}
                                                    style={{ height: '24px', fontSize: '11px', paddingTop: 0, paddingBottom: 0 }}
                                                />
                                            </div>
                                        </th>
                                    ))}
                                    <th style={{ textAlign: 'center', backgroundColor: 'var(--ae-filter-row-bg)', borderBottom: '1px solid var(--border-secondary)' }}>
                                        <button
                                            onClick={() => setFilters({
                                                deal_id: '', deal_name: '', company: '', lead_no: '', stage: '',
                                                currency: '', deal_amount: '', deal_type: '',
                                                customer_name: '', customer_email: '', end_customer: '',
                                                client_type: '', inside_salesperson: '',
                                                inside_sales_head: '', salesperson_name: '', sales_head: '',
                                                project_manager: '', project_manager_head: '',
                                                expected_close_date: '', deal_date: '',
                                                hubspot_id: '', last_synced_at: '',
                                                period: '', startDate: '', endDate: ''
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
                                <tr><td colSpan={visibleColumns.length + 1} style={{ textAlign: 'center', padding: '100px' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></td></tr>
                            ) : paginatedDeals.length === 0 ? (
                                <tr><td colSpan={visibleColumns.length + 1} style={{ textAlign: 'center', padding: '100px', color: 'var(--text-secondary)' }}>No projects found.</td></tr>
                            ) : (
                                paginatedDeals.map((deal: Deal) => {
                                    const stageStyle = getStageColor(deal.stage);
                                    return (
                                        <tr key={deal.id}>
                                            {visibleColumns.map(key => {
                                                switch (key) {
                                                    case 'deal_id':
                                                        return (
                                                            <td key={key}
                                                                style={{ fontWeight: 600, color: 'var(--theme-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                                                                onClick={() => onView(deal.id)}
                                                            >
                                                                {deal.deal_id}
                                                            </td>
                                                        );
                                                    case 'deal_date':
                                                        return <td key={key}>{formatToAppDate(deal.deal_date)}</td>;
                                                    case 'deal_name':
                                                        return <td key={key} style={{}}>{deal.deal_name}</td>;
                                                    case 'company':
                                                        return <td key={key}>{deal.company}</td>;
                                                    case 'lead_no':
                                                        return <td key={key}>{(deal as any).lead_no || '—'}</td>;
                                                    case 'stage':
                                                        return (
                                                            <td key={key}>
                                                                <span style={{ padding: '4px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700, background: stageStyle.bg, color: stageStyle.text }}>
                                                                    {deal.stage.replace('_', ' ')}
                                                                </span>
                                                            </td>
                                                        );
                                                    case 'currency':
                                                        return <td key={key}>{deal.currency}</td>;
                                                    case 'deal_amount':
                                                        return (
                                                            <td key={key} style={{}}>
                                                                {deal.currency === 'INR' ? '₹' : deal.currency === 'USD' ? '$' : deal.currency === 'EURO' ? '€' : ''}
                                                                {parseFloat(deal.deal_amount).toLocaleString()}
                                                            </td>
                                                        );
                                                    case 'expected_close_date':
                                                        return <td key={key}>{formatToAppDate((deal as any).expected_close_date)}</td>;
                                                    case 'last_synced_at':
                                                        return <td key={key}>{deal.last_synced_at ? formatToAppDate(deal.last_synced_at) : '—'}</td>;
                                                    default:
                                                        return <td key={key}>{(deal as any)[key] || '—'}</td>;
                                                }
                                            })}
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                <button
                                                    onClick={() => onView(deal.id)}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        background: 'rgba(187, 77, 0, 0.07)',
                                                        color: 'var(--theme-primary)',
                                                        border: '1px solid rgba(187, 77, 0, 0.25)',
                                                        padding: '4px 14px',
                                                        borderRadius: '20px',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        letterSpacing: '0.04em',
                                                        transition: 'all 0.18s',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'var(--theme-primary)';
                                                        e.currentTarget.style.color = 'white';
                                                        e.currentTarget.style.borderColor = 'var(--theme-primary)';
                                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(187,77,0,0.3)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'rgba(187, 77, 0, 0.07)';
                                                        e.currentTarget.style.color = 'var(--theme-primary)';
                                                        e.currentTarget.style.borderColor = 'rgba(187, 77, 0, 0.25)';
                                                        e.currentTarget.style.boxShadow = 'none';
                                                    }}
                                                >
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

            <Pagination
                currentPage={currentPage}
                totalItems={filteredDeals.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
            />
        </div>
    );
};

export default DealDashboard;
