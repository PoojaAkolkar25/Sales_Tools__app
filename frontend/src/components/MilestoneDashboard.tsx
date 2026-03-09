import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Download,
    Eye,
    Columns,
    ChevronDown,
    FileSpreadsheet,
    FileText,
    Check,
    ChevronLeft,
    ChevronRight,
    Plus
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { formatToAppDate, parseDateSafe } from '../utils/dateUtils';
import Pagination from './Pagination';

const ALL_COL_CONFIG = [
    { key: 'milestone_no', label: 'Milestone No', shortLabel: 'MLST. NO' },
    { key: 'deal', label: 'Deal', shortLabel: 'DEAL' },
    { key: 'sales_order', label: 'Sales Order', shortLabel: 'S.O.' },
    { key: 'customer', label: 'Customer', shortLabel: 'CUST.' },
    { key: 'description', label: 'Description', shortLabel: 'DESC.' },
    { key: 'due_date', label: 'Due Date', shortLabel: 'DATE' },
    { key: 'amount', label: 'Amount', shortLabel: 'AMT.' },
    { key: 'status', label: 'Status', shortLabel: 'ST.' },
    { key: 'invoice_no', label: 'Invoice No', shortLabel: 'INV. NO' },
    { key: 'invoice_total', label: 'Invoice Total', shortLabel: 'INV. TOT' }
];

const SHORT_COL_WIDTHS: Record<string, number> = {
    milestone_no: 55,
    deal: 50,
    sales_order: 50,
    customer: 55,
    description: 55,
    due_date: 50,
    amount: 45,
    status: 35,
    invoice_no: 55,
    invoice_total: 55,
    actions: 140
};

const FULL_LABEL_WIDTHS: Record<string, number> = {
    milestone_no: 95,
    deal: 75,
    sales_order: 90,
    customer: 110,
    description: 130,
    due_date: 75,
    amount: 85,
    status: 75,
    invoice_no: 95,
    invoice_total: 105
};

const MAX_COL_WIDTHS: Record<string, number> = {
    customer: 250,
    description: 350,
    milestone_no: 150,
    deal: 120,
    sales_order: 150,
    due_date: 120,
    amount: 150,
    status: 120,
    invoice_no: 150,
    actions: 120
};

interface MilestoneDashboardProps {
    onView?: (id: number | string, tab?: string) => void;
    onCreate?: () => void;
    initialTab?: string;
}

const MilestoneDashboard: React.FC<MilestoneDashboardProps> = ({ onView, onCreate, initialTab }) => {
    const navigate = useNavigate();
    const [milestones, setMilestones] = useState<any[]>([]);
    const [salesOrders, setSalesOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const { showNotification } = useNotification();
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    // Filter States
    const [filters, setFilters] = useState({
        milestoneNo: '',
        dealId: '',
        soNumber: '',
        customerName: '',
        description: '',
        dueDateSearch: '',
        amountSearch: '',
        statusSearch: '',
        invoiceNo: '',
        period: '',
        startDate: '',
        endDate: ''
    });

    // Due-date tab: 'yet_to_due' | 'due_1_5' | 'due' | 'billed' | 'all'
    const [dueTab, setDueTab] = useState<string>(initialTab || 'all');
    const [showFilters] = useState(true);

    const [isDownloading, setIsDownloading] = useState(false);
    const [hoveredTab, setHoveredTab] = useState<string | null>(null);
    const [hoveredExport, setHoveredExport] = useState(false);
    const [hoveredColumn, setHoveredColumn] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
        const saved = localStorage.getItem('milestoneDashboard_colWidths');
        if (saved) return JSON.parse(saved);
        const defaults: Record<string, number> = {};
        ALL_COL_CONFIG.forEach(col => {
            defaults[col.key] = FULL_LABEL_WIDTHS[col.key] || 150;
        });
        defaults['actions'] = 140;
        return defaults;
    });

    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem('milestoneDashboard_visibleColumns');
        const defaultCols = ALL_COL_CONFIG.map(col => col.key);
        if (!saved) return defaultCols;

        const savedCols = JSON.parse(saved);
        // Ensure new columns like 'invoice_total' are added if they were recently added to ALL_COL_CONFIG
        const mergedCols = [...savedCols];
        defaultCols.forEach(col => {
            if (!mergedCols.includes(col)) mergedCols.push(col);
        });
        return mergedCols;
    });

    const resizingRef = useRef<{ colKey: string; startWidth: number; startX: number } | null>(null);
    const tableScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (initialTab) {
            setDueTab(initialTab);
        }
    }, [initialTab]);

    useEffect(() => {
        localStorage.setItem('milestoneDashboard_colWidths', JSON.stringify(colWidths));
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

    const columnMenuRef = useRef<HTMLDivElement>(null);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        localStorage.setItem('milestoneDashboard_visibleColumns', JSON.stringify(visibleColumns));
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
        fetchMilestones();
    }, []);

    const fetchMilestones = async () => {
        setLoading(true);
        try {
            const [msRes, soRes] = await Promise.all([
                api.get('/milestones/'),
                api.get('/sales-orders/')
            ]);
            setMilestones(msRes.data);
            setSalesOrders(soRes.data);
        } catch (error) {
            showNotification('Error fetching dashboard data', 'error');
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
        if (filters.milestoneNo) params.append('milestone_no', filters.milestoneNo);
        if (filters.soNumber) params.append('so_number', filters.soNumber);
        if (filters.customerName) params.append('customer_name', filters.customerName);
        if (dueTab === 'billed') params.append('status', 'INVOICED');
        return params.toString();
    };

    const exportToPDF = async () => {
        setIsDownloading(true);
        try {
            const queryParams = getExportQueryParams();
            const response = await api.get(`/milestones/export_pdf/?${queryParams}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Milestones_Report_${new Date().toISOString().split('T')[0]}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error: any) {
            console.error('Error downloading PDF report:', error);
            showNotification('Failed to download PDF report.', 'error');
        } finally {
            setIsDownloading(false);
        }
    };

    const exportToExcel = async () => {
        setIsDownloading(true);
        try {
            const queryParams = getExportQueryParams();
            const response = await api.get(`/milestones/export_excel/?${queryParams}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Milestones_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error: any) {
            console.error('Error downloading Excel report:', error);
            showNotification('Failed to download Excel report.', 'error');
        } finally {
            setIsDownloading(false);
        }
    };

    const consolidatedMilestones = useMemo(() => {
        const list = [...milestones];
        const soWithMs = new Set(milestones.map(m => m.sales_order || m.sales_order_details?.id));
        let vCounter = 1;

        salesOrders.forEach(so => {
            if (!soWithMs.has(so.id) && so.status !== 'CANCELLED' && so.status !== 'REJECTED') {
                list.push({
                    id: `virtual-${so.id}`,
                    sales_order: so.id,
                    sales_order_details: so,
                    milestone_no: `ML-100${vCounter++}`,
                    description: 'No Milestones Defined',
                    amount: so.total_amount,
                    status: 'DRAFT',
                    due_date: so.delivery_date,
                    isVirtual: true
                });
            }
        });
        return list;
    }, [milestones, salesOrders]);

    const filteredMilestones = useMemo(() => {
        // Apply column-level text filters
        const filteredList = consolidatedMilestones.filter(m => {
            const matchesMilestone = (m.milestone_no || '').toLowerCase().includes(filters.milestoneNo.toLowerCase());
            const matchesDeal = (m.sales_order_details?.deal_id || '').toLowerCase().includes(filters.dealId.toLowerCase());
            const matchesSO = (m.sales_order_details?.so_number || '').toLowerCase().includes(filters.soNumber.toLowerCase());
            const matchesCustomer = (m.sales_order_details?.customer_name || '').toLowerCase().includes(filters.customerName.toLowerCase());
            const matchesDescription = (m.description || '').toLowerCase().includes(filters.description.toLowerCase());
            const matchesDueDate = (m.due_date ? formatToAppDate(m.due_date) : '').toLowerCase().includes(filters.dueDateSearch.toLowerCase());
            const matchesAmount = (m.amount?.toString() || '').includes(filters.amountSearch);
            const matchesStatusSearch = (m.status || '').toLowerCase().includes(filters.statusSearch.toLowerCase());
            const matchesInvoice = (m.invoice_details?.invoice_no || '').toLowerCase().includes(filters.invoiceNo.toLowerCase());

            // Period date filtering
            let matchesDate = true;
            if (filters.period) {
                const milestoneDate = parseDateSafe(m.due_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (!milestoneDate) {
                    matchesDate = false;
                } else {
                    if (filters.period === 'last_month') {
                        const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                        const lastOfLastMonth = new Date(firstOfThisMonth.getTime() - 1);
                        const firstOfLastMonth = new Date(lastOfLastMonth.getFullYear(), lastOfLastMonth.getMonth(), 1);
                        matchesDate = milestoneDate >= firstOfLastMonth && milestoneDate <= lastOfLastMonth;
                    } else if (filters.period === 'last_3_months') {
                        const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
                        matchesDate = milestoneDate >= threeMonthsAgo;
                    } else if (filters.period === 'last_6_months') {
                        const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1);
                        matchesDate = milestoneDate >= sixMonthsAgo;
                    } else if (filters.period === 'last_year') {
                        const startOfYear = new Date(today.getFullYear() - 1, 0, 1);
                        const endOfYear = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59);
                        matchesDate = milestoneDate >= startOfYear && milestoneDate <= endOfYear;
                    } else if (filters.period === 'last_financial_year') {
                        let startYear = today.getFullYear();
                        if (today.getMonth() < 3) startYear -= 1;
                        startYear -= 1;
                        const startOfFY = new Date(startYear, 3, 1);
                        const endOfFY = new Date(startYear + 1, 2, 31, 23, 59, 59);
                        matchesDate = milestoneDate >= startOfFY && milestoneDate <= endOfFY;
                    } else if (filters.period === 'custom' && filters.startDate && filters.endDate) {
                        const start = new Date(filters.startDate);
                        const end = new Date(filters.endDate);
                        end.setHours(23, 59, 59, 999);
                        matchesDate = milestoneDate >= start && milestoneDate <= end;
                    }
                }
            }

            return matchesMilestone && matchesDeal && matchesSO && matchesCustomer &&
                matchesDescription && matchesDueDate && matchesAmount &&
                matchesStatusSearch && matchesInvoice && matchesDate;
        });

        // Apply dueTab filter
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const fiveDaysAgo = new Date(today);
        fiveDaysAgo.setDate(today.getDate() - 5);

        const tabFilteredRows = filteredList.filter(m => {
            if (dueTab === 'all') return true;
            if (dueTab === 'billed') return m.status === 'INVOICED';

            // For all other tabs, milestone must not be billed
            if (m.status === 'INVOICED') return false;

            const d = parseDateSafe(m.due_date);
            if (!d) return false;
            d.setHours(0, 0, 0, 0);

            if (dueTab === 'yet_to_due') return d > today;
            if (dueTab === 'due_1_5') return d > fiveDaysAgo && d <= today;
            if (dueTab === 'due') return d <= fiveDaysAgo;

            return true;
        });

        if (dueTab === 'all') {
            const grouped = new Map<number, any>();
            tabFilteredRows.forEach(m => {
                const soId = m.sales_order || m.sales_order_details?.id;
                if (!soId) return;

                if (!grouped.has(soId)) {
                    grouped.set(soId, {
                        ...m,
                        allMilestones: m.isVirtual ? [] : [m]
                    });
                } else {
                    const existing = grouped.get(soId);
                    if (!m.isVirtual) {
                        existing.allMilestones.push(m);
                        if (m.due_date && (!existing.due_date || new Date(m.due_date) < new Date(existing.due_date))) {
                            existing.due_date = m.due_date;
                        }
                    }
                }
            });
            return Array.from(grouped.values()).sort((a, b) => {
                const da = parseDateSafe(a.due_date);
                const db = parseDateSafe(b.due_date);
                if (!da && !db) return 0;
                if (!da) return 1;
                if (!db) return -1;
                return da.getTime() - db.getTime();
            });
        }

        return tabFilteredRows.sort((a, b) => {
            const da = parseDateSafe(a.due_date);
            const db = parseDateSafe(b.due_date);
            if (!da && !db) return 0;
            if (!da) return 1;
            if (!db) return -1;
            return da.getTime() - db.getTime();
        });
    }, [consolidatedMilestones, filters, dueTab]);

    const paginatedMilestones = useMemo(() => {
        return filteredMilestones.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        );
    }, [filteredMilestones, currentPage]);

    const tabCounts = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const fiveDaysAgo = new Date(today);
        fiveDaysAgo.setDate(today.getDate() - 5);

        const counts = {
            yet_to_due: 0,
            due_1_5: 0,
            due: 0,
            billed: 0,
            all: consolidatedMilestones.length
        };

        consolidatedMilestones.forEach(m => {
            if (m.status === 'INVOICED') {
                counts.billed++;
            } else {
                const d = parseDateSafe(m.due_date);
                if (d) {
                    d.setHours(0, 0, 0, 0);
                    if (d > today) counts.yet_to_due++;
                    else if (d > fiveDaysAgo && d <= today) counts.due_1_5++;
                    else if (d <= fiveDaysAgo) counts.due++;
                }
            }
        });

        return counts;
    }, [consolidatedMilestones]);

    const dueTabFlow = [
        { label: `Yet to Due (${tabCounts.yet_to_due})`, value: 'yet_to_due' },
        { label: `Due 1-5 Days (${tabCounts.due_1_5})`, value: 'due_1_5' },
        { label: `Due (${tabCounts.due})`, value: 'due' },
        { label: `Billed (${tabCounts.billed})`, value: 'billed' },
        { label: `All (${tabCounts.all})`, value: 'all' }
    ];

    return (
        <div className="space-y-6">
            <div className="ae-table-container" style={{
                marginTop: '12px',
                marginBottom: '60px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'visible',
                maxHeight: 'none',
                overflowY: 'visible',
                borderRadius: '16px',
                border: '1px solid var(--border-primary)',
                background: 'var(--bg-primary)'
            }}>
                {/* Controls Status Tabs and Actions - Padded Header Area */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-primary)',
                    position: 'relative'
                }}>
                    {/* Due-Date Tabs */}
                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        background: 'var(--bg-primary)',
                        padding: '6px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-primary)',
                        boxShadow: 'var(--shadow-sm)',
                        flexWrap: 'wrap'
                    }}>
                        {dueTabFlow.map((flow) => {
                            const isActive = dueTab === flow.value;
                            const isHovered = hoveredTab === flow.value;
                            return (
                                <button
                                    key={flow.value}
                                    onClick={() => { setDueTab(flow.value); setCurrentPage(1); }}
                                    onMouseEnter={() => setHoveredTab(flow.value)}
                                    onMouseLeave={() => setHoveredTab(null)}
                                    style={{
                                        padding: '5px 12px',
                                        borderRadius: '8px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        border: isActive ? '1px solid var(--theme-primary)' : (isHovered ? '1px solid var(--theme-primary)' : '1px solid transparent'),
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        whiteSpace: 'nowrap',
                                        background: isActive ? 'var(--theme-primary)' : 'transparent',
                                        color: isActive ? 'white' : 'var(--text-secondary)',
                                        boxShadow: isActive ? 'var(--shadow-md)' : (isHovered ? '0 0 0 3px rgba(255, 107, 0, 0.1)' : 'none')
                                    }}
                                >
                                    {flow.label}
                                </button>
                            );
                        })}
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
                                onMouseEnter={() => setHoveredExport(true)}
                                onMouseLeave={() => setHoveredExport(false)}
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
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    border: `1px solid ${showExportMenu || hoveredExport ? 'var(--theme-primary)' : 'var(--border-primary)'}`,
                                    transition: 'all 0.2s',
                                    boxShadow: hoveredExport ? '0 0 0 3px rgba(255, 107, 0, 0.1)' : 'none'
                                }}
                            >
                                <Download size={16} /> Export <ChevronDown size={14} />
                            </button>
                            {showExportMenu && (
                                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--bg-primary)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', border: '1px solid var(--border-primary)', zIndex: 100, minWidth: '160px', overflow: 'hidden' }}>
                                    <button
                                        disabled={isDownloading}
                                        onClick={() => { exportToPDF(); setShowExportMenu(false); }}
                                        style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        <FileText size={16} style={{ color: '#DC2626' }} /> PDF Report
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
                                onMouseEnter={() => setHoveredColumn(true)}
                                onMouseLeave={() => setHoveredColumn(false)}
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
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    border: `1px solid ${showColumnMenu || hoveredColumn ? 'var(--theme-primary)' : 'var(--border-primary)'}`,
                                    transition: 'all 0.2s',
                                    boxShadow: hoveredColumn ? '0 0 0 3px rgba(255, 107, 0, 0.1)' : 'none'
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
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                                    border: '1px solid #E2E8F0',
                                    zIndex: 100,
                                    minWidth: '220px',
                                    overflow: 'hidden'
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
                                            onClick={() => setVisibleColumns(ALL_COL_CONFIG.map(c => c.key))}
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
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
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
                                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                        {ALL_COL_CONFIG.map(col => (
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
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                            >
                                                <div
                                                    onClick={() => {
                                                        if (visibleColumns.includes(col.key)) {
                                                            setVisibleColumns(visibleColumns.filter(c => c !== col.key));
                                                        } else {
                                                            setVisibleColumns([...visibleColumns, col.key]);
                                                        }
                                                    }}
                                                    style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        borderRadius: '4px',
                                                        border: `2px solid ${visibleColumns.includes(col.key) ? 'var(--ae-blue)' : '#CBD5E1'}`,
                                                        background: visibleColumns.includes(col.key) ? 'var(--ae-blue)' : 'white',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.2s',
                                                        flexShrink: 0
                                                    }}>
                                                    {visibleColumns.includes(col.key) && <Check size={12} color="white" strokeWidth={4} />}
                                                </div>
                                                <span style={{ fontWeight: 600 }}>{col.label}</span>
                                            </label>
                                        ))}
                                    </div>
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

                    <div ref={tableScrollRef} style={{ overflowX: 'auto', background: 'var(--bg-primary)', borderRadius: '0', border: '1px solid var(--border-primary)', minHeight: '400px' }}>
                        <table className="ae-table compact-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                            <colgroup>
                                {ALL_COL_CONFIG.filter(col => {
                                    return visibleColumns.includes(col.key);
                                }).map(col => (
                                    <col key={col.key} style={{ width: `${getColWidth(col.key)}px` }} />
                                ))}
                                <col style={{ width: `${getColWidth('actions')}px` }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    {ALL_COL_CONFIG.filter(col => {
                                        return visibleColumns.includes(col.key);
                                    }).map(col => (
                                        <th key={col.key} style={{
                                            position: 'relative',
                                            backgroundColor: '#f8fafc',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            userSelect: 'none',
                                            padding: '4px 6px 4px 6px',
                                            paddingRight: '20px',
                                            borderRight: '1px solid var(--border-secondary)',
                                            borderBottom: '1px solid var(--border-secondary)',
                                            zIndex: 12,
                                            top: 0,
                                            color: 'var(--text-secondary)',
                                            textAlign: (col.key === 'amount') ? 'right' : (col.key === 'status') ? 'center' : 'left'
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
                                        backgroundColor: '#f8fafc',
                                        zIndex: 12,
                                        padding: '4px 6px 4px 6px',
                                        whiteSpace: 'nowrap',
                                        top: 0,
                                        color: 'var(--text-secondary)',
                                        borderBottom: '1px solid var(--border-secondary)',
                                        textAlign: 'center'
                                    }}>Actions</th>
                                </tr>
                                {showFilters && (
                                    <tr style={{ background: 'var(--ae-filter-row-bg)' }}>
                                        {ALL_COL_CONFIG.filter(col => {
                                            return visibleColumns.includes(col.key);
                                        }).map(col => (
                                            <th key={col.key} style={{ backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>
                                                <div className="ae-input-group" style={{ margin: 0 }}>
                                                    <Search className="ae-search-icon" size={12} />
                                                    <input
                                                        className="ae-input"
                                                        placeholder="Filter..."
                                                        value={(() => {
                                                            switch (col.key) {
                                                                case 'milestone_no': return filters.milestoneNo;
                                                                case 'deal': return filters.dealId;
                                                                case 'sales_order': return filters.soNumber;
                                                                case 'customer': return filters.customerName;
                                                                case 'description': return filters.description;
                                                                case 'due_date': return filters.dueDateSearch;
                                                                case 'amount': return filters.amountSearch;
                                                                case 'status': return filters.statusSearch;
                                                                case 'invoice_no': return filters.invoiceNo;
                                                                default: return '';
                                                            }
                                                        })()}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            switch (col.key) {
                                                                case 'milestone_no': setFilters({ ...filters, milestoneNo: val }); break;
                                                                case 'deal': setFilters({ ...filters, dealId: val }); break;
                                                                case 'sales_order': setFilters({ ...filters, soNumber: val }); break;
                                                                case 'customer': setFilters({ ...filters, customerName: val }); break;
                                                                case 'description': setFilters({ ...filters, description: val }); break;
                                                                case 'due_date': setFilters({ ...filters, dueDateSearch: val }); break;
                                                                case 'amount': setFilters({ ...filters, amountSearch: val }); break;
                                                                case 'status': setFilters({ ...filters, statusSearch: val }); break;
                                                                case 'invoice_no': setFilters({ ...filters, invoiceNo: val }); break;
                                                            }
                                                        }}
                                                        style={{ height: '24px', fontSize: '11px', paddingTop: 0, paddingBottom: 0 }}
                                                    />
                                                </div>
                                            </th>
                                        ))}
                                        <th style={{
                                            textAlign: 'center',
                                            backgroundColor: 'var(--ae-filter-row-bg)',
                                            borderBottom: '1px solid var(--border-secondary)'
                                        }}>
                                            <button
                                                onClick={() => setFilters({
                                                    milestoneNo: '', dealId: '', soNumber: '', customerName: '',
                                                    description: '', dueDateSearch: '', amountSearch: '', statusSearch: '',
                                                    invoiceNo: '', period: '', startDate: '', endDate: ''
                                                })}
                                                style={{ height: '24px', width: '100%', fontSize: '10px', color: 'var(--theme-primary)', fontWeight: 700, cursor: 'pointer', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px' }}>
                                                Clear
                                            </button>
                                        </th>
                                    </tr>
                                )}
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={visibleColumns.length + 1} style={{ textAlign: 'center', padding: '100px' }}>Loading...</td></tr>
                                ) : paginatedMilestones.length === 0 ? (
                                    <tr><td colSpan={visibleColumns.length + 1} style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>No milestones found.</td></tr>
                                ) : (
                                    paginatedMilestones.map((m) => {
                                        const rowToday = new Date(); rowToday.setHours(0, 0, 0, 0);
                                        const rowFiveDAgo = new Date(rowToday); rowFiveDAgo.setDate(rowToday.getDate() - 5);
                                        const rowDd = m.due_date ? new Date(m.due_date) : null;
                                        if (rowDd) rowDd.setHours(0, 0, 0, 0);
                                        let rowBg = '';
                                        if (m.status !== 'INVOICED' && rowDd) {
                                            if (rowDd <= rowFiveDAgo) rowBg = 'rgba(239, 68, 68, 0.05)';
                                            else if (rowDd <= rowToday) rowBg = 'rgba(245, 158, 11, 0.05)';
                                        }
                                        return (
                                            <tr key={m.id} style={{ background: rowBg || undefined, transition: 'background 0.2s' }} onMouseEnter={(e) => { if (!rowBg) e.currentTarget.style.background = 'rgba(255,107,0,0.02)'; }} onMouseLeave={(e) => { if (!rowBg) e.currentTarget.style.background = 'transparent'; }}>
                                                {ALL_COL_CONFIG.filter(col => {
                                                    return visibleColumns.includes(col.key);
                                                }).map(col => {
                                                    const key = col.key;
                                                    const cellStyle = {
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        padding: '4px 6px',
                                                        fontSize: '0.75rem'
                                                    } as React.CSSProperties;

                                                    switch (key) {
                                                        case 'milestone_no':
                                                            return (
                                                                <td key={key} style={{ ...cellStyle, fontWeight: 700, color: 'var(--theme-primary)', fontFamily: 'monospace' }}>
                                                                    {dueTab === 'all' && m.allMilestones && m.allMilestones.length > 0 ? (
                                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                                            {m.allMilestones.map((ms: any, i: number) => (
                                                                                <React.Fragment key={ms.id}>
                                                                                    <span
                                                                                        onClick={() => {
                                                                                            if (onView) onView(ms.id, dueTab);
                                                                                        }}
                                                                                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                                                    >
                                                                                        {ms.milestone_no}
                                                                                    </span>
                                                                                    {i < m.allMilestones.length - 1 && <span>,</span>}
                                                                                </React.Fragment>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <span
                                                                            onClick={() => {
                                                                                const soIdToPass = m.sales_order || m.sales_order_details?.id;
                                                                                if (!m.isVirtual) {
                                                                                    if (onView) onView(m.id, dueTab);
                                                                                } else if (soIdToPass) {
                                                                                    if (onView) onView(`virtual-${soIdToPass}`, dueTab);
                                                                                }
                                                                            }}
                                                                            style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                                        >
                                                                            {m.milestone_no}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            );
                                                        case 'deal':
                                                            return <td key={key} style={cellStyle}>
                                                                {m.sales_order_details?.deal ? (
                                                                    <span
                                                                        onClick={() => navigate(`/deal?id=${m.sales_order_details.deal}`)}
                                                                        style={{ fontWeight: 600, color: 'var(--theme-primary)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                                                                    >
                                                                        {m.sales_order_details.deal_id}
                                                                    </span>
                                                                ) : '—'}
                                                            </td>;
                                                        case 'sales_order':
                                                            return (
                                                                <td key={key} style={{ ...cellStyle, fontWeight: 700, color: 'var(--theme-primary)', fontSize: '0.75rem' }}>
                                                                    {m.sales_order_details?.so_number ? (
                                                                        <span
                                                                            onClick={() => navigate(`/sales-order?id=${m.sales_order}`)}
                                                                            style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                                        >
                                                                            {m.sales_order_details.so_number}
                                                                        </span>
                                                                    ) : m.sales_order ? (
                                                                        <span
                                                                            onClick={() => navigate(`/sales-order?id=${m.sales_order}`)}
                                                                            style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                                        >
                                                                            Draft-SO-{m.sales_order}
                                                                        </span>
                                                                    ) : '—'}
                                                                </td>
                                                            );
                                                        case 'customer':
                                                            return <td key={key} style={cellStyle}>{m.sales_order_details?.customer_name}</td>;
                                                        case 'description':
                                                            return <td key={key} style={cellStyle} title={m.description || '—'}>{m.description}</td>;
                                                        case 'due_date': {
                                                            const today0 = new Date(); today0.setHours(0, 0, 0, 0);
                                                            const fiveDAgo = new Date(today0); fiveDAgo.setDate(today0.getDate() - 5);
                                                            const dd = m.due_date ? new Date(m.due_date) : null;
                                                            if (dd) dd.setHours(0, 0, 0, 0);
                                                            let badge: { label: string; bg: string; color: string } | null = null;
                                                            if (m.status !== 'INVOICED' && dd) {
                                                                if (dd <= fiveDAgo) badge = { label: 'Due', bg: '#FEE2E2', color: '#DC2626' };
                                                                else if (dd <= today0) badge = { label: 'Due 1-5 Days', bg: '#FEF3C7', color: '#D97706' };
                                                                else badge = { label: 'Yet to Due', bg: '#E0F2FE', color: '#0284C7' };
                                                            }
                                                            return (
                                                                <td key={key} style={cellStyle}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'nowrap' }}>
                                                                        {m.due_date ? formatToAppDate(m.due_date) : '---'}
                                                                        {badge && (
                                                                            <span
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    if (badge.label === 'Due') setDueTab('due');
                                                                                    else if (badge.label === 'Due 1-5 Days') setDueTab('due_1_5');
                                                                                    else if (badge.label === 'Yet to Due') setDueTab('yet_to_due');
                                                                                }}
                                                                                style={{
                                                                                    padding: '1px 5px', borderRadius: '4px', fontSize: '9px', fontWeight: 800,
                                                                                    background: badge.bg, color: badge.color, whiteSpace: 'nowrap',
                                                                                    cursor: 'pointer', border: '1px solid transparent',
                                                                                    transition: 'all 0.2s'
                                                                                }}
                                                                                onMouseOver={(e) => { e.currentTarget.style.borderColor = badge.color; }}
                                                                                onMouseOut={(e) => { e.currentTarget.style.borderColor = 'transparent'; }}
                                                                            >
                                                                                {badge.label}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            );
                                                        }
                                                        case 'amount':
                                                            return <td key={key} style={{ ...cellStyle, textAlign: 'right' }}>
                                                                <span style={{ color: 'var(--text-primary)' }}>
                                                                    {m.sales_order_details?.currency === 'INR' ? '₹' : '$'}
                                                                    {parseFloat(m.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </td>;
                                                        case 'status':
                                                            return <td key={key} style={{ ...cellStyle, textAlign: 'center' }}>
                                                                <span
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (m.status === 'INVOICED') setDueTab('billed');
                                                                        else {
                                                                            const t0 = new Date(); t0.setHours(0, 0, 0, 0);
                                                                            const fv = new Date(t0); fv.setDate(t0.getDate() - 5);
                                                                            const du = m.due_date ? new Date(m.due_date) : null;
                                                                            if (du) {
                                                                                du.setHours(0, 0, 0, 0);
                                                                                if (du <= fv) setDueTab('due');
                                                                                else if (du <= t0) setDueTab('due_1_5');
                                                                                else setDueTab('yet_to_due');
                                                                            }
                                                                        }
                                                                    }}
                                                                    style={{
                                                                        padding: '4px 10px',
                                                                        borderRadius: '99px',
                                                                        fontSize: '0.7rem',
                                                                        fontWeight: 700,
                                                                        textTransform: 'uppercase',
                                                                        background: m.status === 'INVOICED' ? 'rgba(0, 200, 83, 0.1)' : 'rgba(255, 107, 0, 0.1)',
                                                                        color: m.status === 'INVOICED' ? '#00C853' : 'var(--theme-primary)',
                                                                        cursor: 'pointer', border: '1px solid transparent',
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                    onMouseOver={(e) => { e.currentTarget.style.borderColor = m.status === 'INVOICED' ? '#00C853' : 'var(--theme-primary)'; }}
                                                                    onMouseOut={(e) => { e.currentTarget.style.borderColor = 'transparent'; }}
                                                                >
                                                                    {m.status}
                                                                </span>
                                                            </td>;
                                                        case 'invoice_no':
                                                            return (
                                                                <td key={key} style={{ ...cellStyle, fontWeight: 700, color: 'var(--theme-primary)' }}>
                                                                    {m.invoice ? (
                                                                        <span
                                                                            onClick={() => navigate(`/invoice?id=${m.invoice}`)}
                                                                            style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                                        >
                                                                            {m.invoice_details?.invoice_no}
                                                                        </span>
                                                                    ) : (m.invoice_details?.invoice_no || '—')}
                                                                </td>
                                                            );
                                                        case 'invoice_total':
                                                            return (
                                                                <td key={key} style={{ ...cellStyle, textAlign: 'right', color: 'var(--text-primary)' }}>
                                                                    {m.invoice_details?.total_amount ? (
                                                                        `${m.sales_order_details?.currency === 'INR' ? '₹' : '$'}${parseFloat(m.invoice_details.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                                                    ) : '—'}
                                                                </td>
                                                            );
                                                        default:
                                                            return null;
                                                    }
                                                })}
                                                <td style={{ padding: '4px 12px' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                        {/* Issue Invoice — only for real milestones that are not yet invoiced */}
                                                        {!m.isVirtual && m.status !== 'INVOICED' && (
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    try {
                                                                        await api.post(`/milestones/${m.id}/create_invoice/`);
                                                                        showNotification('Draft invoice created successfully!', 'success');
                                                                        fetchMilestones();
                                                                    } catch (error: any) {
                                                                        showNotification(error.response?.data?.error || 'Failed to create invoice', 'error');
                                                                    }
                                                                }}
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    padding: '0 10px',
                                                                    height: '32px',
                                                                    background: 'rgba(16, 185, 129, 0.08)',
                                                                    color: '#059669',
                                                                    border: '1px solid rgba(16, 185, 129, 0.2)',
                                                                    borderRadius: '8px',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s',
                                                                    fontSize: '0.72rem',
                                                                    fontWeight: 700,
                                                                    whiteSpace: 'nowrap'
                                                                }}
                                                                onMouseOver={(e) => {
                                                                    e.currentTarget.style.background = '#059669';
                                                                    e.currentTarget.style.color = 'white';
                                                                    e.currentTarget.style.borderColor = '#059669';
                                                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.25)';
                                                                }}
                                                                onMouseOut={(e) => {
                                                                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)';
                                                                    e.currentTarget.style.color = '#059669';
                                                                    e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.2)';
                                                                    e.currentTarget.style.boxShadow = 'none';
                                                                }}
                                                                title="Issue Invoice for this milestone"
                                                            >
                                                                <Plus size={13} /> Issue Invoice
                                                            </button>
                                                        )}
                                                        {/* View button */}
                                                        <button
                                                            onClick={() => {
                                                                const soIdToPass = m.sales_order || m.sales_order_details?.id;
                                                                if (m.isVirtual) {
                                                                    if (onView && soIdToPass) onView(`virtual-${soIdToPass}`);
                                                                } else {
                                                                    // Open full breakdown view (read-only)
                                                                    const mId = m.allMilestones?.length > 0 ? m.allMilestones[0].id : m.id;
                                                                    if (onView) onView(mId, dueTab);
                                                                }
                                                            }}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                width: '32px',
                                                                height: '32px',
                                                                background: 'rgba(255, 107, 0, 0.08)',
                                                                color: 'var(--theme-primary)',
                                                                border: '1px solid rgba(255, 107, 0, 0.2)',
                                                                borderRadius: '8px',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s'
                                                            }}
                                                            onMouseOver={(e) => {
                                                                e.currentTarget.style.background = 'var(--theme-primary)';
                                                                e.currentTarget.style.color = 'white';
                                                                e.currentTarget.style.borderColor = 'var(--theme-primary)';
                                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 0, 0.25)';
                                                            }}
                                                            onMouseOut={(e) => {
                                                                e.currentTarget.style.background = 'rgba(255, 107, 0, 0.08)';
                                                                e.currentTarget.style.color = 'var(--theme-primary)';
                                                                e.currentTarget.style.borderColor = 'rgba(255, 107, 0, 0.2)';
                                                                e.currentTarget.style.boxShadow = 'none';
                                                            }}
                                                            title="View Milestone"
                                                        >
                                                            <Eye size={16} />
                                                        </button>

                                                        {/* Download PDF button — for real milestones, fallback to SO for virtual */}
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    let response;
                                                                    let filename;
                                                                    if (m.isVirtual) {
                                                                        const soId = m.sales_order || m.sales_order_details?.id;
                                                                        response = await api.get(`/sales-orders/${soId}/download_pdf/`, { responseType: 'blob' });
                                                                        filename = `sales_order_${m.sales_order_details?.so_no || soId}.pdf`;
                                                                    } else {
                                                                        response = await api.get(`/milestones/${m.id}/download_pdf/`, { responseType: 'blob' });
                                                                        filename = `milestone_${m.milestone_no}.pdf`;
                                                                    }

                                                                    const url = window.URL.createObjectURL(new Blob([response.data]));
                                                                    const link = document.createElement('a');
                                                                    link.href = url;
                                                                    link.setAttribute('download', filename);
                                                                    document.body.appendChild(link);
                                                                    link.click();
                                                                    link.parentNode?.removeChild(link);
                                                                    window.URL.revokeObjectURL(url);
                                                                } catch (error) {
                                                                    console.error('Error downloading PDF', error);
                                                                    showNotification('Error downloading PDF', 'error');
                                                                }
                                                            }}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                width: '32px',
                                                                height: '32px',
                                                                background: 'rgba(255, 107, 0, 0.08)',
                                                                color: 'var(--theme-primary)',
                                                                border: '1px solid rgba(255, 107, 0, 0.2)',
                                                                borderRadius: '8px',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s'
                                                            }}
                                                            onMouseOver={(e) => {
                                                                e.currentTarget.style.background = 'var(--theme-primary)';
                                                                e.currentTarget.style.color = 'white';
                                                                e.currentTarget.style.borderColor = 'var(--theme-primary)';
                                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 0, 0.25)';
                                                            }}
                                                            onMouseOut={(e) => {
                                                                e.currentTarget.style.background = 'rgba(255, 107, 0, 0.08)';
                                                                e.currentTarget.style.color = 'var(--theme-primary)';
                                                                e.currentTarget.style.borderColor = 'rgba(255, 107, 0, 0.2)';
                                                                e.currentTarget.style.boxShadow = 'none';
                                                            }}
                                                            title={m.isVirtual ? "Download Sales Order PDF" : "Download Milestone PDF"}
                                                        >
                                                            <Download size={16} />
                                                        </button>



                                                    </div>
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
                    totalItems={filteredMilestones.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div >
    );
};

export default MilestoneDashboard;
