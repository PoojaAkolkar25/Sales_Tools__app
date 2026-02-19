import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Search, FileSpreadsheet, Columns, Download, ChevronDown, RefreshCw } from 'lucide-react';
import api from '../api';
import Pagination from './Pagination';

const ALL_COLUMNS = [
    { key: 'lead_no', label: 'Lead Number' },
    { key: 'deal_no', label: 'Deal No.' },
    { key: 'customer_name', label: 'Customer Name' },
    { key: 'project_name', label: 'Project Name' },
    { key: 'cost_sheet_no', label: 'Cost Sheet No.' },
    { key: 'date', label: 'Date' },
    { key: 'status', label: 'Status' },
    { key: 'margin_percentage', label: 'Margin %' },
    { key: 'est_margin', label: 'Est. Margin' },
    { key: 'total_price', label: 'Total Price' }
];

interface CostSheet {
    id: number;
    cost_sheet_no: string;
    lead_no: string;
    deal_no: string;
    customer_name: string;
    project_name: string;
    status: string;
    total_estimated_price: string;
    total_estimated_margin: string;
    total_margin_percentage: number;
    cost_sheet_date?: string;
    created_at: string;
    currency?: string;
    deal?: number | null;
}

interface CostSheetDashboardProps {
    onView?: (id: number) => void;
}

const CostSheetDashboard: React.FC<CostSheetDashboardProps> = ({ onView }) => {
    const navigate = useNavigate();
    const [costSheets, setCostSheets] = useState<CostSheet[]>([]);
    const [loading, setLoading] = useState(true);
    // Filter States
    const [filters, setFilters] = useState({
        csNumber: '',
        leadNo: '',
        dealNo: '',
        customerName: '',
        projectName: '',
        status: 'PENDING',
        period: '',
        startDate: '',
        endDate: '',
        dateStr: '',
        statusStr: '',
        marginStr: '',
        estMarginStr: '',
        totalPriceStr: ''
    });

    const [isDownloading, setIsDownloading] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const [showFilters] = useState(true);
    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem('costSheetDashboard_visibleColumns');
        return saved ? JSON.parse(saved) : ALL_COLUMNS.map(col => col.key);
    });
    const columnMenuRef = useRef<HTMLDivElement>(null);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        localStorage.setItem('costSheetDashboard_visibleColumns', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
                setShowColumnMenu(false);
            }
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setShowExportMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        fetchCostSheets();
    }, []);

    const fetchCostSheets = async () => {
        setLoading(true);
        try {
            const response = await api.get('/cost-sheets/');
            setCostSheets(response.data);
        } catch (error) {
            console.error('Error fetching cost sheets', error);
        } finally {
            setLoading(false);
        }
    };

    const getExportQueryParams = () => {
        const params = new URLSearchParams();
        params.append('period', filters.period);
        if (filters.period === 'custom') {
            params.append('start_date', filters.startDate);
            params.append('end_date', filters.endDate);
        }
        if (filters.csNumber) params.append('cs_number', filters.csNumber);
        if (filters.leadNo) params.append('lead_no', filters.leadNo);
        if (filters.dealNo) params.append('deal_no', filters.dealNo);
        if (filters.customerName) params.append('customer_name', filters.customerName);
        if (filters.projectName) params.append('project_name', filters.projectName);
        if (filters.status) params.append('status', filters.status);
        return params.toString();
    };

    const exportToCSV = async () => {
        setIsDownloading(true);
        try {
            const queryParams = getExportQueryParams();
            const response = await api.get(`/cost-sheets/export_report/?${queryParams}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Cost_Sheets_Report_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error: any) {
            console.error('Error downloading CSV report:', error);
            alert('Failed to download CSV report. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    };

    const exportToExcel = async () => {
        setIsDownloading(true);
        try {
            const queryParams = getExportQueryParams();
            const response = await api.get(`/cost-sheets/export_excel/?${queryParams}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Cost_Sheets_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error: any) {
            console.error('Error downloading Excel report:', error);
            alert('Failed to download Excel report. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    };

    const exportSingleExcel = async (id: number, csNo: string) => {
        try {
            const response = await api.get(`/cost-sheets/${id}/export_single_excel/`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `CostSheet_${csNo}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading single cost sheet:', error);
            alert('Failed to download cost sheet.');
        }
    };

    const getStatusBadge = (status: string) => {
        const statusMap: { [key: string]: { bg: string; color: string; label: string } } = {
            'PENDING': { bg: 'rgba(113, 128, 150, 0.1)', color: '#718096', label: 'Draft' },
            'SUBMITTED': { bg: 'var(--bg-secondary)', color: 'var(--theme-primary)', label: 'Pending' },
            'REVERTED': { bg: 'rgba(214, 158, 46, 0.1)', color: '#D69E2E', label: 'Reverted' },
            'APPROVED': { bg: 'rgba(0, 200, 83, 0.1)', color: '#00C853', label: 'Approved' },
            'REJECTED': { bg: 'rgba(229, 62, 62, 0.1)', color: '#E53E3E', label: 'Rejected' }
        };
        return statusMap[status] || { bg: '#F7FAFC', color: '#718096', label: status };
    };

    const filteredCostSheets = useMemo(() => {
        return costSheets.filter(cs => {
            const matchesCs = (cs.cost_sheet_no || '').toLowerCase().includes(filters.csNumber.toLowerCase());
            const matchesLead = (cs.lead_no || '').toLowerCase().includes(filters.leadNo.toLowerCase());
            const matchesDeal = (cs.deal_no || '').toLowerCase().includes(filters.dealNo.toLowerCase());
            const matchesCustomer = (cs.customer_name || '').toLowerCase().includes(filters.customerName.toLowerCase());
            const matchesProject = (cs.project_name || '').toLowerCase().includes(filters.projectName.toLowerCase());
            const statusLabel = getStatusBadge(cs.status).label;
            const matchesStatus = filters.status === '' ||
                cs.status === filters.status ||
                statusLabel.toLowerCase().includes(filters.status.toLowerCase());

            // Text Date Filter
            const displayDate = cs.cost_sheet_date ? new Date(cs.cost_sheet_date).toLocaleDateString() : new Date(cs.created_at).toLocaleDateString();
            const matchesDateStr = (displayDate || '').toLowerCase().includes(filters.dateStr.toLowerCase());

            // Period Logic (Top-level Period selector)
            let matchesPeriod = true;
            if (filters.period) {
                const rawDate = cs.cost_sheet_date || cs.created_at;
                const csDate = new Date(rawDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (filters.period === 'last_month') {
                    const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    const lastOfLastMonth = new Date(firstOfThisMonth.getTime() - 1);
                    const firstOfLastMonth = new Date(lastOfLastMonth.getFullYear(), lastOfLastMonth.getMonth(), 1);
                    matchesPeriod = csDate >= firstOfLastMonth && csDate <= lastOfLastMonth;
                } else if (filters.period === 'last_3_months') {
                    const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    const lastOfLastMonth = new Date(firstOfThisMonth.getTime() - 1);
                    const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
                    matchesPeriod = csDate >= threeMonthsAgo && csDate <= lastOfLastMonth;
                } else if (filters.period === 'last_6_months') {
                    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1);
                    matchesPeriod = csDate >= sixMonthsAgo && csDate < new Date(today.getFullYear(), today.getMonth(), 1);
                } else if (filters.period === 'last_year') {
                    const lastYear = today.getFullYear() - 1;
                    const startOfYear = new Date(lastYear, 0, 1);
                    const endOfYear = new Date(lastYear, 11, 31, 23, 59, 59);
                    matchesPeriod = csDate >= startOfYear && csDate <= endOfYear;
                } else if (filters.period === 'last_financial_year') {
                    let startYear = today.getFullYear();
                    if (today.getMonth() < 3) startYear -= 1; // Financial year starts in April
                    startYear -= 1;
                    const startOfFY = new Date(startYear, 3, 1);
                    const endOfFY = new Date(startYear + 1, 2, 31, 23, 59, 59);
                    matchesPeriod = csDate >= startOfFY && csDate <= endOfFY;
                } else if (filters.period === 'custom' && filters.startDate && filters.endDate) {
                    const start = new Date(filters.startDate);
                    const end = new Date(filters.endDate);
                    end.setHours(23, 59, 59, 999);
                    matchesPeriod = csDate >= start && csDate <= end;
                }
            }

            // Text Filters for remaining columns
            const matchesStatusStr = (statusLabel || '').toLowerCase().includes(filters.statusStr.toLowerCase());
            const matchesMargin = (cs.total_margin_percentage?.toString() || '0').includes(filters.marginStr);
            const matchesEstMargin = (parseFloat(cs.total_estimated_margin).toLocaleString() || '').includes(filters.estMarginStr);
            const matchesTotalPrice = (parseFloat(cs.total_estimated_price).toLocaleString() || '').includes(filters.totalPriceStr);

            return matchesCs && matchesLead && matchesDeal && matchesCustomer && matchesProject &&
                matchesStatus && matchesDateStr && matchesPeriod &&
                matchesStatusStr && matchesMargin && matchesEstMargin && matchesTotalPrice;
        }).sort((a, b) => {
            // Priority 1: SUBMITTED (Pending Approval) items at the absolute top
            if (a.status === 'SUBMITTED' && b.status !== 'SUBMITTED') return -1;
            if (a.status !== 'SUBMITTED' && b.status === 'SUBMITTED') return 1;

            // Priority 2: PENDING (Draft) items at the absolute bottom
            if (a.status === 'PENDING' && b.status !== 'PENDING') return 1;
            if (a.status !== 'PENDING' && b.status === 'PENDING') return -1;

            // Priority 3: Newest first for everything
            const dateA = new Date(a.cost_sheet_date || a.created_at).getTime();
            const dateB = new Date(b.cost_sheet_date || b.created_at).getTime();

            if (dateB !== dateA) {
                return dateB - dateA;
            }

            // Fallback to ID for stable sort
            return b.id - a.id;
        });
    }, [costSheets, filters]);

    const paginatedCostSheets = useMemo(() => {
        return filteredCostSheets.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        );
    }, [filteredCostSheets, currentPage]);

    const counts = useMemo(() => ({
        all: costSheets.length,
        draft: costSheets.filter(cs => cs.status === 'PENDING').length,
        pending: costSheets.filter(cs => cs.status === 'SUBMITTED').length,
        reverted: costSheets.filter(cs => cs.status === 'REVERTED').length,
        approved: costSheets.filter(cs => cs.status === 'APPROVED').length,
        rejected: costSheets.filter(cs => cs.status === 'REJECTED').length
    }), [costSheets]);

    const statusFlow = [
        { label: `Draft (${counts.draft})`, value: 'Draft', color: '#718096' },
        { label: `Pending (${counts.pending})`, value: 'Pending', color: '#FF6B00' },
        { label: `Reverted (${counts.reverted})`, value: 'Reverted', color: '#D69E2E' },
        { label: `Approved (${counts.approved})`, value: 'Approved', color: '#00C853' },
        { label: `Rejected (${counts.rejected})`, value: 'Rejected', color: '#E53E3E' },
        { label: `All (${counts.all})`, value: '', color: '#718096' }
    ];


    return (
        <div className="space-y-6">
            <div className="ae-table-container" style={{
                marginTop: '12px',
                marginBottom: '60px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                maxHeight: 'none',
                overflowY: 'visible'
            }}>
                {/* Controls Status Tabs and Actions - Padded Header Area */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px',
                    padding: '20px',
                    borderBottom: '1px solid var(--border-primary)'
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
                        {statusFlow.map((flow) => (
                            <button
                                key={flow.value}
                                onClick={() => setFilters({ ...filters, status: flow.value })}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: filters.status === flow.value ? 'var(--theme-primary)' : 'transparent',
                                    color: filters.status === flow.value ? 'white' : 'var(--text-secondary)',
                                    boxShadow: filters.status === flow.value ? 'var(--shadow-md)' : 'none'
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
                                value={filters.period}
                                onChange={e => setFilters({ ...filters, period: e.target.value })}
                                style={{ height: '32px', fontSize: '0.8rem', width: '130px', padding: '0 12px' }}
                            >
                                <option value="">All Time</option>
                                <option value="last_month">Last Month</option>
                                <option value="last_3_months">3 Months</option>
                                <option value="last_year">Last Year</option>
                                <option value="custom">Custom</option>
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
                                disabled={isDownloading}
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 14px',
                                    fontSize: '0.8rem',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: 'var(--bg-primary)',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                <Download size={16} /> Export <ChevronDown size={14} />
                            </button>
                            {showExportMenu && (
                                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--bg-primary)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', border: '1px solid var(--border-primary)', zIndex: 100, minWidth: '160px', overflow: 'hidden' }}>
                                    <button
                                        disabled={isDownloading}
                                        onClick={() => { exportToCSV(); setShowExportMenu(false); }}
                                        style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        <FileSpreadsheet size={16} style={{ color: '#059669' }} /> CSV Report
                                    </button>
                                    <button
                                        disabled={isDownloading}
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
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: 'var(--bg-primary)',
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
                                                color: 'var(--text-tertiary)',
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
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
                                                    accentColor: 'var(--theme-primary)'
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

                {/* Table Area */}
                <div style={{ overflowX: 'auto' }}>
                    <table className="ae-table">
                        <thead>
                            <tr>
                                {visibleColumns.map(key => {
                                    const col = ALL_COLUMNS.find(c => c.key === key);
                                    if (!col) return null;
                                    return (
                                        <th key={key} style={{
                                            height: '40px',
                                            top: 0,
                                            whiteSpace: 'nowrap',
                                            zIndex: 12,
                                            backgroundColor: 'var(--bg-secondary)',
                                            textAlign: (key === 'margin_percentage' || key === 'est_margin' || key === 'total_price') ? 'right' : 'left',
                                            minWidth: (key === 'date') ? '160px' : (key === 'status') ? '120px' : (key === 'total_price') ? '120px' : 'auto'
                                        }}>
                                            {col.label}
                                        </th>
                                    );
                                })}
                                <th style={{ height: '40px', textAlign: 'center', position: 'sticky', top: 0, whiteSpace: 'nowrap', zIndex: 12, minWidth: '100px', backgroundColor: 'var(--bg-secondary)' }}>Actions</th>
                            </tr>
                            {showFilters && (
                                <tr style={{ background: 'var(--bg-secondary)' }}>
                                    {visibleColumns.map(key => {
                                        const filterMap: Record<string, { key: keyof typeof filters, width?: string }> = {
                                            lead_no: { key: 'leadNo', width: '100px' },
                                            deal_no: { key: 'dealNo', width: '100px' },
                                            customer_name: { key: 'customerName' },
                                            project_name: { key: 'projectName' },
                                            cost_sheet_no: { key: 'csNumber', width: '100px' },
                                            date: { key: 'dateStr' },
                                            status: { key: 'statusStr' },
                                            margin_percentage: { key: 'marginStr', width: '100px' },
                                            est_margin: { key: 'estMarginStr', width: '120px' },
                                            total_price: { key: 'totalPriceStr', width: '120px' }
                                        };
                                        const filter = filterMap[key];
                                        if (!filter) return null;
                                        return (
                                            <th key={key} style={{ top: '40px', zIndex: 11, backgroundColor: 'var(--bg-secondary)', minWidth: (key === 'date') ? '160px' : 'auto' }}>
                                                <div className="ae-input-group">
                                                    <Search className="ae-search-icon" size={12} />
                                                    <input
                                                        className="ae-input"
                                                        placeholder="Filter..."
                                                        value={(filters as any)[filter.key]}
                                                        onChange={e => setFilters({ ...filters, [filter.key]: e.target.value })}
                                                        style={{ height: '24px', fontSize: '11px', width: filter.width || '100%', paddingTop: 0, paddingBottom: 0 }}
                                                    />
                                                </div>
                                            </th>
                                        );
                                    })}
                                    <th style={{ textAlign: 'center', top: '40px', position: 'sticky', backgroundColor: 'var(--bg-secondary)', zIndex: 11, minWidth: '100px' }}>
                                        <button
                                            onClick={() => setFilters({
                                                csNumber: '', leadNo: '', dealNo: '', customerName: '', projectName: '',
                                                status: 'PENDING', period: '', startDate: '', endDate: '', dateStr: '',
                                                statusStr: '', marginStr: '', estMarginStr: '', totalPriceStr: ''
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
                                <tr><td colSpan={visibleColumns.length + 1} style={{ textAlign: 'center', padding: '100px' }}><RefreshCw className="animate-spin" style={{ margin: '0 auto' }} /></td></tr>
                            ) : paginatedCostSheets.length === 0 ? (
                                <tr>
                                    <td colSpan={visibleColumns.length + 1} style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        <FileSpreadsheet size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
                                        <div style={{ fontWeight: 600 }}>
                                            {costSheets.length === 0 ? 'No cost sheets found.' : 'No results matching your filters.'}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedCostSheets.map((cs) => {
                                    const statusInfo = getStatusBadge(cs.status);
                                    return (
                                        <tr key={cs.id}>
                                            {visibleColumns.map(key => {
                                                switch (key) {
                                                    case 'lead_no':
                                                        return <td key={key} style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                                            {cs.lead_no || '—'}
                                                        </td>;
                                                    case 'deal_no':
                                                        return <td key={key}
                                                            style={{ fontWeight: 600, color: '#FF6B00', fontSize: '0.8rem', cursor: cs.deal ? 'pointer' : 'default', textDecoration: cs.deal ? 'underline' : 'none' }}
                                                            onClick={() => cs.deal && navigate(`/deal?id=${cs.deal}`)}
                                                        >
                                                            {cs.deal_no || '—'}
                                                        </td>;
                                                    case 'customer_name':
                                                        return <td key={key} style={{ fontWeight: 500 }}>
                                                            {cs.customer_name || '—'}
                                                        </td>;
                                                    case 'project_name':
                                                        return <td key={key} style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={cs.project_name || '—'}>
                                                            {cs.project_name || '—'}
                                                        </td>;
                                                    case 'cost_sheet_no':
                                                        return <td key={key}
                                                            style={{ fontWeight: 700, color: '#FF6B00', fontFamily: 'monospace', cursor: 'pointer', textDecoration: 'underline' }}
                                                            onClick={() => onView?.(cs.id)}
                                                            title="Click to view/edit cost sheet"
                                                        >
                                                            {cs.cost_sheet_no}
                                                        </td>;
                                                    case 'date':
                                                        return <td key={key} style={{ fontWeight: 600 }}>
                                                            {cs.cost_sheet_date ? new Date(cs.cost_sheet_date).toLocaleDateString() : new Date(cs.created_at).toLocaleDateString()}
                                                        </td>;
                                                    case 'status':
                                                        return <td key={key}>
                                                            <span style={{
                                                                padding: '4px 10px',
                                                                borderRadius: '6px',
                                                                fontSize: '10px',
                                                                fontWeight: 700,
                                                                textTransform: 'uppercase',
                                                                background: statusInfo.bg,
                                                                color: statusInfo.color
                                                            }}>
                                                                {statusInfo.label}
                                                            </span>
                                                        </td>;
                                                    case 'margin_percentage':
                                                        return <td key={key} style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.8rem' }}>
                                                            {cs.total_margin_percentage || 0}%
                                                        </td>;
                                                    case 'est_margin':
                                                        return <td key={key} style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.8rem' }}>
                                                            {cs.currency === 'INR' ? '₹' : cs.currency === 'USD' ? '$' : cs.currency === 'EURO' ? '€' : '$'}
                                                            {parseFloat(cs.total_estimated_margin).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>;
                                                    case 'total_price':
                                                        return <td key={key} style={{ fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>
                                                            {cs.currency === 'INR' ? '₹' : cs.currency === 'USD' ? '$' : cs.currency === 'EURO' ? '€' : '$'}
                                                            {parseFloat(cs.total_estimated_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>;
                                                    default:
                                                        return null;
                                                }
                                            })}
                                            <td style={{ textAlign: 'center', minWidth: '100px', display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => onView?.(cs.id)}
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
                                                    onMouseOver={(e) => e.currentTarget.style.background = '#0052A3'}
                                                    onMouseOut={(e) => e.currentTarget.style.background = '#0066CC'}
                                                    title="View/Edit"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        exportSingleExcel(cs.id, cs.cost_sheet_no);
                                                    }}
                                                    className="ae-btn-success"
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        padding: '6px 12px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    title="Download Cost Sheet"
                                                >
                                                    <Download size={14} />
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
                totalItems={filteredCostSheets.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
            />
        </div>
    );
};

export default CostSheetDashboard;

