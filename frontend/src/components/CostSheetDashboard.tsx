import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Search, FileSpreadsheet, Columns, Download, ChevronDown, RefreshCw, ChevronLeft, ChevronRight, Plus, Minus, PlusCircle, X } from 'lucide-react';
import api from '../api';
import { formatToAppDate } from '../utils/dateUtils';
import Pagination from './Pagination';

const ALL_COL_CONFIG = [
    { key: 'lead_no', label: 'Lead Number', shortLabel: 'LEAD' },
    { key: 'deal_no', label: 'Deal No.', shortLabel: 'DEAL' },
    { key: 'customer_name', label: 'Customer Name', shortLabel: 'CUST.' },
    { key: 'project_name', label: 'Project Name', shortLabel: 'PROJ.' },
    { key: 'cost_sheet_no', label: 'Cost Sheet No.', shortLabel: 'CS#' },
    { key: 'date', label: 'Date', shortLabel: 'DATE' },
    { key: 'status', label: 'Status', shortLabel: 'ST.' },
    { key: 'margin_percentage', label: 'Margin %', shortLabel: 'MARG%' },
    { key: 'est_margin', label: 'Est. Margin', shortLabel: 'MARG' },
    { key: 'total_price', label: 'Total Price', shortLabel: 'PRICE' }
];

const SHORT_COL_WIDTHS: Record<string, number> = {
    lead_no: 40,
    deal_no: 40,
    customer_name: 55,
    project_name: 55,
    cost_sheet_no: 45,
    date: 45,
    status: 35,
    margin_percentage: 55,
    est_margin: 55,
    total_price: 55,
    actions: 60
};

const FULL_LABEL_WIDTHS: Record<string, number> = {
    lead_no: 130,
    deal_no: 110,
    customer_name: 180,
    project_name: 180,
    cost_sheet_no: 140,
    date: 120,
    status: 100,
    margin_percentage: 110,
    est_margin: 130,
    total_price: 130
};

const MAX_COL_WIDTHS: Record<string, number> = {
    lead_no: 120,
    deal_no: 120,
    customer_name: 250,
    project_name: 250,
    cost_sheet_no: 200,
    date: 150,
    status: 120,
    margin_percentage: 120,
    est_margin: 200,
    total_price: 200,
    actions: 120
};

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
    license_items?: any[];
    implementation_items?: any[];
    support_items?: any[];
    infra_items?: any[];
    other_items?: any[];
    total_estimated_cost: string;
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
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

    const [isDownloading, setIsDownloading] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const [showFilters] = useState(true);
    const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
        const saved = localStorage.getItem('costSheetDashboard_colWidths_v2');
        if (saved) return JSON.parse(saved);
        const defaults: Record<string, number> = {};
        ALL_COL_CONFIG.forEach(c => { defaults[c.key] = FULL_LABEL_WIDTHS[c.key] || 150; });
        return defaults;
    });

    const resizingRef = useRef<{ colKey: string; startWidth: number; startX: number } | null>(null);

    useEffect(() => {
        localStorage.setItem('costSheetDashboard_colWidths_v2', JSON.stringify(colWidths));
    }, [colWidths]);

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
            const maxWidth = MAX_COL_WIDTHS[key] ?? 500;
            const newWidth = Math.min(maxWidth, Math.max(minWidth, resizingRef.current.startWidth + delta));
            setColWidths(prev => ({ ...prev, [key]: newWidth }));
        };

        const onMouseUp = () => {
            resizingRef.current = null;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const getColWidth = (key: string) => colWidths[key] ?? 150;

    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem('costSheetDashboard_visibleColumns');
        return saved ? JSON.parse(saved) : ALL_COL_CONFIG.map(col => col.key);
    });
    const columnMenuRef = useRef<HTMLDivElement>(null);
    const exportMenuRef = useRef<HTMLDivElement>(null);
    const tableScrollRef = useRef<HTMLDivElement>(null);

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

    const toggleRow = (id: number) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    const calculateCategoryTotals = (items: any[], type: 'license' | 'implementation' | 'support' | 'infra' | 'other') => {
        let catCost = 0;
        let catMarginAmount = 0;

        items.forEach(item => {
            let cost = 0;
            const safeMargin = parseFloat(item.margin_percentage) || 0;

            if (type === 'license') {
                const p = parseFloat(item.period);
                const periodMultiplier = isNaN(p) ? 1 : p;
                cost = (parseFloat(item.rate) || 0) * (parseFloat(item.qty) || 0) * periodMultiplier;
            } else if (type === 'implementation' || type === 'support') {
                cost = (parseFloat(item.num_resources) || 0) * (parseFloat(item.num_days) || 0) * (parseFloat(item.rate_per_day) || 0);
            } else if (type === 'infra') {
                cost = (parseFloat(item.qty) || 0) * (parseFloat(item.months) || 0) * (parseFloat(item.rate_per_month) || 0);
            } else if (type === 'other') {
                cost = parseFloat(item.estimated_cost) || 0;
            }

            const marginAmount = cost * (safeMargin / 100);
            catCost += cost;
            catMarginAmount += marginAmount;
        });

        const catPrice = catCost + catMarginAmount;
        const catMarginPercent = catCost > 0 ? (catMarginAmount / catCost) * 100 : 0;
        return { catCost, catMarginAmount, catMarginPercent, catPrice };
    };

    const handleQuickStatusUpdate = async (id: number, newStatus: string) => {
        try {
            await api.patch(`/cost-sheets/${id}/`, { status: newStatus });
            fetchCostSheets();
        } catch (error) {
            console.error('Error updating status', error);
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
            const displayDate = cs.cost_sheet_date ? formatToAppDate(cs.cost_sheet_date) : formatToAppDate(cs.created_at);
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
            // Newest first for everything (descending order)
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
        { label: `Approved (${counts.approved})`, value: 'Approved', color: '#00C853' },
        { label: `Rejected (${counts.rejected})`, value: 'Rejected', color: '#E53E3E' },
        { label: `Reverted (${counts.reverted})`, value: 'Reverted', color: '#D69E2E' },
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
                overflow: 'visible',
                maxHeight: 'none',
                overflowY: 'visible'
            }}>
                {/* Controls Status Tabs and Actions - Padded Header Area */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'nowrap',
                    gap: '12px',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-primary)',
                    position: 'relative'
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
                                    padding: '5px 12px',
                                    borderRadius: '8px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap',
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
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Period:</span>
                            <select
                                className="ae-input"
                                value={filters.period}
                                onChange={e => setFilters({ ...filters, period: e.target.value })}
                                style={{ height: '32px', fontSize: '0.75rem', width: '130px', padding: '0 8px' }}
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
                                        background: 'var(--ae-table-header-bg)',
                                    }}>
                                        <button
                                            onClick={() => setVisibleColumns(ALL_COL_CONFIG.map(c => c.key))}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--theme-primary)',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = '#EBF5FF'}
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
                                    {ALL_COL_CONFIG.map(col => (
                                        <label key={col.key} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '10px 16px',
                                            fontSize: '0.85rem',
                                            color: '#2D3748',
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                            transition: 'background 0.2s',
                                            borderBottom: '1px solid var(--border-primary)'
                                        }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
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
                                <col style={{ width: '40px' }} />
                                {ALL_COL_CONFIG.filter(col => visibleColumns.includes(col.key)).map(col => (
                                    <col key={col.key} style={{ width: `${getColWidth(col.key)}px` }} />
                                ))}
                                <col style={{ width: `${getColWidth('actions')}px` }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th style={{
                                        backgroundColor: 'var(--ae-table-header-bg)',
                                        zIndex: 12,
                                        width: '40px',
                                        borderBottom: '1px solid var(--border-secondary)',
                                        borderRight: '1px solid var(--border-secondary)'
                                    }}></th>
                                    {ALL_COL_CONFIG.filter(col => visibleColumns.includes(col.key)).map(col => (
                                        <th key={col.key} style={{
                                            backgroundColor: 'var(--ae-table-header-bg)',
                                            position: 'relative',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            userSelect: 'none',
                                            paddingRight: '20px',
                                            borderRight: '1px solid var(--border-secondary)',
                                            borderBottom: '1px solid var(--border-secondary)',
                                            zIndex: 12,
                                            top: 0,
                                            color: 'var(--text-secondary)'
                                        }}>
                                            <span title={col.label}>
                                                {getColWidth(col.key) < (SHORT_COL_WIDTHS[col.key] + 5)
                                                    ? col.shortLabel
                                                    : col.label}
                                            </span>
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
                                        </th>
                                    ))}
                                    <th style={{
                                        backgroundColor: 'var(--ae-table-header-bg)',
                                        zIndex: 12,
                                        textAlign: 'center',
                                        whiteSpace: 'nowrap',
                                        top: 0,
                                        color: 'var(--text-secondary)',
                                        borderBottom: '1px solid var(--border-secondary)'
                                    }}>Actions</th>
                                </tr>
                                {showFilters && (
                                    <tr style={{ background: 'var(--ae-filter-row-bg)' }}>
                                        <th style={{ backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)' }}></th>
                                        {ALL_COL_CONFIG.filter(col => visibleColumns.includes(col.key)).map(col => {
                                            const filterMap: Record<string, { key: keyof typeof filters, width?: string }> = {
                                                lead_no: { key: 'leadNo' },
                                                deal_no: { key: 'dealNo' },
                                                customer_name: { key: 'customerName' },
                                                project_name: { key: 'projectName' },
                                                cost_sheet_no: { key: 'csNumber' },
                                                date: { key: 'dateStr' },
                                                status: { key: 'statusStr' },
                                                margin_percentage: { key: 'marginStr' },
                                                est_margin: { key: 'estMarginStr' },
                                                total_price: { key: 'totalPriceStr' }
                                            };
                                            const filter = filterMap[col.key];
                                            if (!filter) return null;
                                            return (
                                                <th key={col.key} style={{ backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>
                                                    <div className="ae-input-group" style={{ margin: 0 }}>
                                                        <Search className="ae-search-icon" size={12} />
                                                        <input
                                                            className="ae-input"
                                                            placeholder="Filter..."
                                                            value={(filters as any)[filter.key]}
                                                            onChange={e => setFilters({ ...filters, [filter.key]: e.target.value })}
                                                            style={{ height: '24px', fontSize: '11px', paddingTop: 0, paddingBottom: 0 }}
                                                        />
                                                    </div>
                                                </th>
                                            );
                                        })}
                                        <th style={{
                                            textAlign: 'center',
                                            backgroundColor: 'var(--ae-filter-row-bg)',
                                            borderBottom: '1px solid var(--border-secondary)'
                                        }}>
                                            <button
                                                onClick={() => setFilters({
                                                    csNumber: '', leadNo: '', dealNo: '', customerName: '', projectName: '',
                                                    status: 'PENDING', period: '', startDate: '', endDate: '', dateStr: '',
                                                    statusStr: '', marginStr: '', estMarginStr: '', totalPriceStr: ''
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
                                        const isExpanded = expandedRows.has(cs.id);
                                        const statusInfo = getStatusBadge(cs.status);
                                        const totals = {
                                            license: calculateCategoryTotals(cs.license_items || [], 'license'),
                                            implementation: calculateCategoryTotals(cs.implementation_items || [], 'implementation'),
                                            support: calculateCategoryTotals(cs.support_items || [], 'support'),
                                            infra: calculateCategoryTotals(cs.infra_items || [], 'infra'),
                                            other: calculateCategoryTotals(cs.other_items || [], 'other')
                                        };

                                        const grandTotalCost = totals.license.catCost + totals.implementation.catCost + totals.support.catCost + totals.infra.catCost + totals.other.catCost;
                                        const grandTotalMargin = totals.license.catMarginAmount + totals.implementation.catMarginAmount + totals.support.catMarginAmount + totals.infra.catMarginAmount + totals.other.catMarginAmount;
                                        const grandTotalPrice = totals.license.catPrice + totals.implementation.catPrice + totals.support.catPrice + totals.infra.catPrice + totals.other.catPrice;
                                        const grandTotalMarginPercent = grandTotalCost > 0 ? (grandTotalMargin / grandTotalCost) * 100 : 0;
                                        const currencySymbol = cs.currency === 'INR' ? '₹' : cs.currency === 'USD' ? '$' : cs.currency === 'EURO' ? '€' : '$';

                                        return (
                                            <React.Fragment key={cs.id}>
                                                <tr>
                                                    <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-secondary)', padding: 0 }}>
                                                        <button
                                                            onClick={() => toggleRow(cs.id)}
                                                            style={{
                                                                background: 'transparent',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                color: 'var(--theme-primary)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                width: '100%',
                                                                height: '100%',
                                                                padding: '8px 0'
                                                            }}
                                                        >
                                                            {isExpanded ? <Minus size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
                                                        </button>
                                                    </td>
                                                    {visibleColumns.map(key => {
                                                        const cellStyle = {
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            fontSize: '0.8rem'
                                                        } as React.CSSProperties;

                                                        switch (key) {
                                                            case 'lead_no':
                                                                return <td key={key} style={{ ...cellStyle, color: 'var(--text-secondary)' }}>
                                                                    {cs.lead_no || '—'}
                                                                </td>;
                                                            case 'deal_no':
                                                                return <td key={key}
                                                                    style={{ ...cellStyle, color: '#FF6B00', cursor: cs.deal ? 'pointer' : 'default', textDecoration: cs.deal ? 'underline' : 'none' }}
                                                                    onClick={() => cs.deal && navigate(`/deal?id=${cs.deal}`)}
                                                                >
                                                                    {cs.deal_no || '—'}
                                                                </td>;
                                                            case 'customer_name':
                                                                return <td key={key} style={{ ...cellStyle }}>
                                                                    {cs.customer_name || '—'}
                                                                </td>;
                                                            case 'project_name':
                                                                return <td key={key} style={{ ...cellStyle }}>
                                                                    {cs.project_name || '—'}
                                                                </td>;
                                                            case 'cost_sheet_no':
                                                                return <td key={key}
                                                                    style={{ ...cellStyle, fontWeight: 600, color: '#FF6B00', fontFamily: 'monospace', cursor: 'pointer', textDecoration: 'underline' }}
                                                                    onClick={() => onView?.(cs.id)}
                                                                    title="Click to view/edit cost sheet"
                                                                >
                                                                    {cs.cost_sheet_no}
                                                                </td>;
                                                            case 'date':
                                                                return <td key={key} style={{ ...cellStyle }}>
                                                                    {cs.cost_sheet_date ? formatToAppDate(cs.cost_sheet_date) : formatToAppDate(cs.created_at)}
                                                                </td>;
                                                            case 'status':
                                                                return <td key={key} style={{ ...cellStyle }}>
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
                                                                return <td key={key} style={{ ...cellStyle, textAlign: 'right' }}>
                                                                    {cs.total_margin_percentage || 0}%
                                                                </td>;
                                                            case 'est_margin':
                                                                return <td key={key} style={{ ...cellStyle, textAlign: 'right' }}>
                                                                    {cs.currency === 'INR' ? '₹' : cs.currency === 'USD' ? '$' : cs.currency === 'EURO' ? '€' : '$'}
                                                                    {parseFloat(cs.total_estimated_margin).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                </td>;
                                                            case 'total_price':
                                                                return <td key={key} style={{ ...cellStyle, textAlign: 'right' }}>
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
                                                                background: 'var(--theme-primary)',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s'
                                                            }}
                                                            onMouseOver={(e) => e.currentTarget.style.background = 'var(--theme-primary-dark, #cc5500)'}
                                                            onMouseOut={(e) => e.currentTarget.style.background = 'var(--theme-primary)'}
                                                            title="View/Edit"
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                exportSingleExcel(cs.id, cs.cost_sheet_no);
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
                                                            title="Download Cost Sheet"
                                                        >
                                                            <Download size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr>
                                                        <td colSpan={visibleColumns.length + 2} style={{ padding: '0', background: 'var(--bg-secondary)' }}>
                                                            <div style={{ padding: '24px', animation: 'slideDown 0.3s ease' }}>
                                                                <div style={{
                                                                    background: 'var(--bg-primary)',
                                                                    borderRadius: '16px',
                                                                    border: '1px solid var(--border-primary)',
                                                                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                                                                    overflow: 'hidden'
                                                                }}>
                                                                    {/* Category Summary Header */}
                                                                    <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            <div style={{ width: '3px', height: '14px', background: 'var(--theme-primary)', borderRadius: '2px' }}></div>
                                                                            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>Category Breakdown Summary</h4>
                                                                        </div>
                                                                    </div>

                                                                    {/* Summary Table */}
                                                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                                        <thead>
                                                                            <tr style={{ background: 'var(--theme-primary)', color: 'white' }}>
                                                                                <th style={{ padding: '8px 16px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'left' }}>Category</th>
                                                                                <th style={{ padding: '8px 16px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Total Est. Cost</th>
                                                                                <th style={{ padding: '8px 16px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Total Est. Margin %</th>
                                                                                <th style={{ padding: '8px 16px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Total Est. Margin</th>
                                                                                <th style={{ padding: '8px 16px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Total Est. Price</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {[
                                                                                { label: 'License', data: totals.license },
                                                                                { label: 'Services - Implementation', data: totals.implementation },
                                                                                { label: 'Services - Support', data: totals.support },
                                                                                { label: 'Infrastructure Cost', data: totals.infra },
                                                                                { label: 'Other Category', data: totals.other }
                                                                            ].map((row, idx) => (
                                                                                <tr key={row.label} style={{ borderBottom: idx === 4 ? 'none' : '1px solid #f1f5f9' }}>
                                                                                    <td style={{ padding: '8px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>{row.label}</td>
                                                                                    <td style={{ padding: '8px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textAlign: 'right' }}>
                                                                                        {currencySymbol}{row.data.catCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                                    </td>
                                                                                    <td style={{ padding: '8px 16px', fontSize: '0.75rem', fontWeight: 700, color: row.data.catMarginPercent >= 0 ? '#10b981' : '#ef4444', textAlign: 'right' }}>
                                                                                        {row.data.catMarginPercent.toFixed(2)}%
                                                                                    </td>
                                                                                    <td style={{ padding: '8px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textAlign: 'right' }}>
                                                                                        {currencySymbol}{row.data.catMarginAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                                    </td>
                                                                                    <td style={{ padding: '8px 16px', fontSize: '0.8rem', fontWeight: 800, color: 'var(--theme-accent)', textAlign: 'right' }}>
                                                                                        {currencySymbol}{row.data.catPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                            {/* Grand Total Row */}
                                                                            <tr style={{ background: '#f8fafc', borderTop: '2px solid var(--border-primary)' }}>
                                                                                <td style={{ padding: '10px 16px', fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>Total</td>
                                                                                <td style={{ padding: '10px 16px', fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', textAlign: 'right' }}>
                                                                                    {currencySymbol}{grandTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                                </td>
                                                                                <td style={{ padding: '10px 16px', fontSize: '0.8rem', fontWeight: 800, color: grandTotalMarginPercent >= 0 ? '#10b981' : '#ef4444', textAlign: 'right' }}>
                                                                                    {grandTotalMarginPercent.toFixed(2)}%
                                                                                </td>
                                                                                <td style={{ padding: '10px 16px', fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', textAlign: 'right' }}>
                                                                                    {currencySymbol}{grandTotalMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                                </td>
                                                                                <td style={{ padding: '10px 16px', fontSize: '0.8rem', fontWeight: 900, color: 'var(--theme-primary)', textAlign: 'right' }}>
                                                                                    {currencySymbol}{grandTotalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                                </td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>

                                                                    {/* Action Buttons Hub */}
                                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                                                                        <div style={{
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: '4px',
                                                                            padding: '4px',
                                                                            background: 'white',
                                                                            borderRadius: '12px',
                                                                            border: '1px solid #e2e8f0',
                                                                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                                                        }}>
                                                                            {(cs.status === 'PENDING' || cs.status === 'REVERTED') && (
                                                                                <button
                                                                                    onClick={() => handleQuickStatusUpdate(cs.id, 'SUBMITTED')}
                                                                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 20px', borderRadius: '10px', border: 'none', background: 'var(--theme-primary)', color: 'white', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                                                                                    onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(255,107,0,0.3)'; }}
                                                                                    onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                                                                                >
                                                                                    <PlusCircle size={16} /> Submit for Approval
                                                                                </button>
                                                                            )}
                                                                            <button
                                                                                onClick={() => toggleRow(cs.id)}
                                                                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '10px', border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                                                                                onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                                                                                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                                                            >
                                                                                <X size={14} /> Cancel
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Pagination
                currentPage={currentPage}
                totalItems={filteredCostSheets.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
            />
        </div >
    );
};

export default CostSheetDashboard;

