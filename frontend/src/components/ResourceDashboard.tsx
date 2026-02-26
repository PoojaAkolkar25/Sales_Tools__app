import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    PlusCircle,
    Server,
    ArrowRight,
    Search,
    Columns,
    ChevronDown,
    FileSpreadsheet,
    Download,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { formatToAppDate } from '../utils/dateUtils';
import Pagination from './Pagination';

const ALL_COL_CONFIG = [
    { key: 'form_number', label: 'Form Number', shortLabel: 'FORM NO' },
    { key: 'request_date', label: 'Date', shortLabel: 'DATE' },
    { key: 'project_name', label: 'Project', shortLabel: 'PROJ.' },
    { key: 'environment', label: 'Environment', shortLabel: 'ENV' },
    { key: 'client_name', label: 'Client', shortLabel: 'CLNT' },
    { key: 'requestor', label: 'Requestor', shortLabel: 'REQ.' },
    { key: 'designation', label: 'Designation', shortLabel: 'DSIG' },
    { key: 'employee_id', label: 'Emp ID', shortLabel: 'EMP ID' },
    { key: 'department', label: 'Department', shortLabel: 'DEPT' },
    { key: 'resource_type_requested', label: 'Type', shortLabel: 'CAT' },
    { key: 'server_type', label: 'Resource', shortLabel: 'RES' },
    { key: 'quantity', label: 'Qty', shortLabel: 'QTY' },
    { key: 'cloud_provider', label: 'Cloud', shortLabel: 'CLD' },
    { key: 'region', label: 'Region', shortLabel: 'REG' },
    { key: 'instance_type', label: 'Instance', shortLabel: 'INST' },
    { key: 'cpu_ram', label: 'CPU/RAM', shortLabel: 'C/R' },
    { key: 'storage', label: 'Storage', shortLabel: 'STOR' },
    { key: 'os', label: 'OS', shortLabel: 'OS' },
    { key: 'database', label: 'DB Info', shortLabel: 'DB' },
    { key: 'dates', label: 'Start/End Date', shortLabel: 'DATES' },
    { key: 'purpose_of_request', label: 'Purpose', shortLabel: 'PURP' },
    { key: 'justification', label: 'Justification', shortLabel: 'JUST' },
    { key: 'status', label: 'Status', shortLabel: 'ST.' }
];

const SHORT_COL_WIDTHS: Record<string, number> = {
    form_number: 55,
    request_date: 45,
    project_name: 50,
    requestor: 50,
    server_type: 50,
    quantity: 30,
    status: 35,
    actions: 60
};

const FULL_LABEL_WIDTHS: Record<string, number> = {
    form_number: 110,
    request_date: 110,
    project_name: 180,
    requestor: 150,
    server_type: 140,
    quantity: 60,
    status: 100
};

const MAX_COL_WIDTHS: Record<string, number> = {
    form_number: 150,
    request_date: 110,
    project_name: 200,
    environment: 120,
    client_name: 180,
    requestor: 180,
    designation: 150,
    employee_id: 120,
    department: 150,
    resource_type_requested: 120,
    server_type: 150,
    quantity: 80,
    cloud_provider: 120,
    region: 150,
    instance_type: 150,
    cpu_ram: 150,
    storage: 150,
    os: 150,
    database: 180,
    dates: 220,
    purpose_of_request: 250,
    justification: 250,
    status: 120,
    actions: 120
};

interface ResourceDashboardProps {
    onView: (id: number) => void;
    onCreate: () => void;
}

const ResourceDashboard: React.FC<ResourceDashboardProps> = ({ onView, onCreate }) => {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { showNotification } = useNotification();
    const [currentPage, setCurrentPage] = useState(1);
    const [showFilters] = useState(true);
    const [filters, setFilters] = useState({
        form_number: '',
        project_name: '',
        requestor: '',
        server_type: '',
        status: '',
        period: '',
        startDate: '',
        endDate: '',
        dateStr: ''
    });
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const columnMenuRef = useRef<HTMLDivElement>(null);
    const exportMenuRef = useRef<HTMLDivElement>(null);
    const tableScrollRef = useRef<HTMLDivElement>(null);
    const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
        const saved = localStorage.getItem('resourceDashboard_colWidths');
        if (saved) return JSON.parse(saved);
        const defaults: Record<string, number> = {};
        ALL_COL_CONFIG.forEach(c => { defaults[c.key] = FULL_LABEL_WIDTHS[c.key] || 150; });
        defaults['actions'] = 120;
        return defaults;
    });

    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        // Force all columns for the "view all" requirement
        return ALL_COL_CONFIG.map(c => c.key);
    });

    const resizingRef = useRef<{ colKey: string; startWidth: number; startX: number } | null>(null);

    useEffect(() => {
        localStorage.setItem('resourceDashboard_colWidths', JSON.stringify(colWidths));
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
        localStorage.setItem('resourceDashboard_visibleColumns', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const response = await api.get('/inventory/requests/');
            setRequests(response.data);
        } catch (error) {
            showNotification('Error fetching resource requests', 'error');
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status: string) => {
        const statusMap: { [key: string]: { bg: string; color: string; label: string } } = {
            'DRAFT': { bg: 'rgba(113, 128, 150, 0.1)', color: '#718096', label: 'Draft' },
            'SUBMITTED': { bg: 'rgba(49, 130, 206, 0.1)', color: '#3182CE', label: 'Submitted' },
            'PENDING_IT': { bg: 'rgba(187, 77, 0, 0.1)', color: '#BB4D00', label: 'Pending IT' },
            'PENDING_FINANCE': { bg: 'rgba(155, 81, 224, 0.1)', color: '#9B51E0', label: 'Pending Finance' },
            'APPROVED': { bg: 'rgba(0, 200, 83, 0.1)', color: '#00C853', label: 'Approved' },
            'ISSUED': { bg: 'rgba(37, 99, 235, 0.1)', color: '#2563EB', label: 'Issued' },
            'REJECTED': { bg: 'rgba(229, 62, 62, 0.1)', color: '#E53E3E', label: 'Rejected' }
        };
        return statusMap[status] || { bg: 'var(--bg-secondary)', color: 'var(--text-secondary)', label: status };
    };

    const getExportQueryParams = () => {
        const params = new URLSearchParams();
        params.append('period', filters.period);
        if (filters.period === 'custom') {
            params.append('start_date', filters.startDate);
            params.append('end_date', filters.endDate);
        }
        if (filters.form_number) params.append('form_number', filters.form_number);
        if (filters.project_name) params.append('project_name', filters.project_name);
        if (filters.requestor) params.append('requestor', filters.requestor);
        if (filters.status) params.append('status', filters.status);
        return params.toString();
    };

    const exportToPDF = async () => {
        setIsDownloading(true);
        try {
            const queryParams = getExportQueryParams();
            const response = await api.get(`/inventory/requests/export_pdf/?${queryParams}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Resource_Requests_Report_${new Date().toISOString().split('T')[0]}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            showNotification('Failed to download PDF report', 'error');
        } finally {
            setIsDownloading(false);
            setShowExportMenu(false);
        }
    };

    const exportToExcel = async () => {
        setIsDownloading(true);
        try {
            const queryParams = getExportQueryParams();
            const response = await api.get(`/inventory/requests/export_excel/?${queryParams}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Resource_Requests_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            showNotification('Failed to download Excel report', 'error');
        } finally {
            setIsDownloading(false);
            setShowExportMenu(false);
        }
    };

    const filteredRequests = requests.filter(req => {
        const matchesForm = (req.form_number || '').toLowerCase().includes(filters.form_number.toLowerCase());
        const matchesProject = (req.project_name || '').toLowerCase().includes(filters.project_name.toLowerCase());
        const matchesRequestor = (req.requestor_detail?.full_name || '').toLowerCase().includes(filters.requestor.toLowerCase());
        const matchesType = (req.server_type || '').toLowerCase().includes(filters.server_type.toLowerCase());
        const statusLabel = getStatusStyle(req.status).label;
        const matchesStatus = filters.status === '' || req.status === filters.status || statusLabel.toLowerCase().includes(filters.status.toLowerCase());

        const displayDate = req.request_date ? formatToAppDate(req.request_date) : '';
        const matchesDateStr = (displayDate || '').toLowerCase().includes(filters.dateStr.toLowerCase());

        let matchesPeriod = true;
        if (filters.period) {
            const reqDate = new Date(req.request_date || req.created_at);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (filters.period === 'last_month') {
                const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                const lastOfLastMonth = new Date(firstOfThisMonth.getTime() - 1);
                const firstOfLastMonth = new Date(lastOfLastMonth.getFullYear(), lastOfLastMonth.getMonth(), 1);
                matchesPeriod = reqDate >= firstOfLastMonth && reqDate <= lastOfLastMonth;
            } else if (filters.period === 'last_3_months') {
                const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1);
                matchesPeriod = reqDate >= threeMonthsAgo;
            } else if (filters.period === 'last_6_months') {
                const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
                matchesPeriod = reqDate >= sixMonthsAgo;
            } else if (filters.period === 'custom' && filters.startDate && filters.endDate) {
                const start = new Date(filters.startDate);
                const end = new Date(filters.endDate);
                end.setHours(23, 59, 59, 999);
                matchesPeriod = reqDate >= start && reqDate <= end;
            }
        }

        return matchesForm && matchesProject && matchesRequestor && matchesType && matchesStatus && matchesDateStr && matchesPeriod;
    }).sort((a, b) => {
        const dateA = new Date(a.request_date || a.created_at).getTime();
        const dateB = new Date(b.request_date || b.created_at).getTime();
        return dateB - dateA;
    });

    const counts = useMemo(() => ({
        all: requests.length,
        draft: requests.filter(r => r.status === 'DRAFT').length,
        submitted: requests.filter(r => r.status === 'SUBMITTED').length,
        pending_it: requests.filter(r => r.status === 'PENDING_IT').length,
        pending_finance: requests.filter(r => r.status === 'PENDING_FINANCE').length,
        approved: requests.filter(r => r.status === 'APPROVED').length,
        issued: requests.filter(r => r.status === 'ISSUED').length,
        rejected: requests.filter(r => r.status === 'REJECTED').length
    }), [requests]);

    const statusFlow = [
        { label: `Draft (${counts.draft})`, value: 'DRAFT' },
        { label: `Submitted (${counts.submitted})`, value: 'SUBMITTED' },
        { label: `Pend. IT (${counts.pending_it})`, value: 'PENDING_IT' },
        { label: `Pend. Fin (${counts.pending_finance})`, value: 'PENDING_FINANCE' },
        { label: `Approved (${counts.approved})`, value: 'APPROVED' },
        { label: `Issued (${counts.issued})`, value: 'ISSUED' },
        { label: `Rejected (${counts.rejected})`, value: 'REJECTED' },
        { label: `All (${counts.all})`, value: '' }
    ];

    const paginatedRequests = filteredRequests.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="space-y-6">
            <div className="ae-table-container" style={{
                marginTop: '12px',
                marginBottom: '60px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'visible',
                maxHeight: 'none'
            }}>
                {/* Controls Status Tabs and Actions - Padded Header Area */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
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
                                <option value="last_6_months">6 Months</option>
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
                                    cursor: 'pointer',
                                    border: '1px solid var(--border-primary)'
                                }}
                            >
                                <Download size={16} /> Export <ChevronDown size={14} />
                            </button>
                            {showExportMenu && (
                                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--bg-primary)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', border: '1px solid var(--border-primary)', zIndex: 100, minWidth: '160px', overflow: 'hidden' }}>
                                    <button
                                        disabled={isDownloading}
                                        onClick={() => exportToPDF()}
                                        style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        <FileSpreadsheet size={16} style={{ color: '#DC2626' }} /> PDF Report
                                    </button>
                                    <button
                                        disabled={isDownloading}
                                        onClick={() => exportToExcel()}
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
                                    cursor: 'pointer',
                                    border: '1px solid var(--border-primary)'
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
                                            style={{ background: 'none', border: 'none', color: 'var(--theme-primary)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                        >
                                            Select All
                                        </button>
                                        <button
                                            onClick={() => setVisibleColumns([])}
                                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
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
                                            color: 'var(--text-primary)',
                                            cursor: 'pointer',
                                            borderBottom: '1px solid var(--border-primary)'
                                        }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
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
                                                style={{ cursor: 'pointer', accentColor: 'var(--theme-primary)' }}
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
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--theme-primary)'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
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
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--theme-primary)'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                    >
                        <ChevronRight size={18} />
                    </button>

                    <div ref={tableScrollRef} style={{ overflowX: 'auto', background: 'var(--bg-primary)', borderRadius: '4px', border: '1px solid var(--border-primary)' }}>
                        <table className="ae-table" style={{ tableLayout: 'fixed', width: 'max-content' }}>
                            <colgroup>
                                {ALL_COL_CONFIG.filter(col => visibleColumns.includes(col.key)).map(col => (
                                    <col key={col.key} style={{ width: `${getColWidth(col.key)}px` }} />
                                ))}
                                <col style={{ width: `${getColWidth('actions')}px` }} />
                            </colgroup>
                            <thead>
                                <tr style={{ background: 'var(--ae-table-header-bg)' }}>
                                    {ALL_COL_CONFIG.filter(col => visibleColumns.includes(col.key)).map(col => (
                                        <th key={col.key} style={{
                                            position: 'relative',
                                            backgroundColor: 'var(--ae-table-header-bg)',
                                            padding: '8px 16px',
                                            textAlign: 'left',
                                            fontSize: '11px',
                                            fontWeight: 900,
                                            color: 'var(--text-secondary)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            userSelect: 'none',
                                            borderRight: '1px solid var(--border-secondary)',
                                            borderBottom: '1px solid var(--border-secondary)'
                                        }}>
                                            <span title={col.label}>{col.label}</span>
                                            <div
                                                onMouseDown={(e) => startResize(e, col.key)}
                                                style={{ position: 'absolute', top: 0, right: 0, width: '6px', height: '100%', cursor: 'col-resize', background: 'transparent', zIndex: 20 }}
                                            />
                                        </th>
                                    ))}
                                    <th style={{ backgroundColor: 'var(--ae-table-header-bg)', padding: '8px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-secondary)' }}>Action</th>
                                </tr>
                                {showFilters && (
                                    <tr style={{ background: 'var(--ae-filter-row-bg)' }}>
                                        {ALL_COL_CONFIG.filter(col => visibleColumns.includes(col.key)).map(col => (
                                            <th key={col.key} style={{ padding: '4px 16px', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>
                                                <div className="ae-input-group !mb-0" style={{ display: 'block' }}>
                                                    <Search className="ae-search-icon" size={12} />
                                                    <input
                                                        className="ae-input"
                                                        placeholder="Filter..."
                                                        value={(filters as any)[col.key] || ''}
                                                        onChange={e => setFilters({ ...filters, [col.key]: e.target.value })}
                                                        style={{ height: '24px', fontSize: '11px', paddingTop: 0, paddingBottom: 0 }}
                                                    />
                                                </div>
                                            </th>
                                        ))}
                                        <th style={{ padding: '4px 16px', textAlign: 'right', borderBottom: '1px solid var(--border-secondary)' }}>
                                            <button
                                                onClick={() => setFilters({ form_number: '', project_name: '', requestor: '', server_type: '', status: '', period: '', startDate: '', endDate: '', dateStr: '' })}
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
                                    <tr><td colSpan={visibleColumns.length + 1} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>Loading requests...</td></tr>
                                ) : paginatedRequests.length === 0 ? (
                                    <tr><td colSpan={visibleColumns.length + 1} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>No requests found.</td></tr>
                                ) : (
                                    paginatedRequests.map((req) => {
                                        const status = getStatusStyle(req.status);
                                        return (
                                            <tr key={req.id} className="ae-table-row">
                                                {ALL_COL_CONFIG.filter(col => visibleColumns.includes(col.key)).map(col => {
                                                    const cellStyle = { padding: '8px 16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' } as React.CSSProperties;
                                                    switch (col.key) {
                                                        case 'form_number':
                                                            return (
                                                                <td key={col.key} style={cellStyle}>
                                                                    <button
                                                                        onClick={() => onView(req.id)}
                                                                        style={{
                                                                            background: 'none',
                                                                            border: 'none',
                                                                            padding: 0,
                                                                            font: 'inherit',
                                                                            cursor: 'pointer',
                                                                            fontWeight: 800,
                                                                            color: 'var(--ae-blue)',
                                                                            textAlign: 'left',
                                                                            textDecoration: 'none'
                                                                        }}
                                                                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                                                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                                                    >
                                                                        {req.form_number}
                                                                    </button>
                                                                </td>
                                                            );
                                                        case 'request_date':
                                                            return <td key={col.key} style={cellStyle}>{req.request_date ? formatToAppDate(req.request_date) : '---'}</td>;
                                                        case 'project_name':
                                                            return <td key={col.key} style={cellStyle}><span style={{ fontWeight: 700 }}>{req.project_name}</span></td>;
                                                        case 'environment':
                                                            return <td key={col.key} style={cellStyle}><span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#475569' }}>{req.environment}</span></td>;
                                                        case 'requestor':
                                                            return <td key={col.key} style={cellStyle}>{req.requestor_detail?.full_name}</td>;
                                                        case 'designation':
                                                            return <td key={col.key} style={cellStyle}>{req.designation}</td>;
                                                        case 'client_name':
                                                            return <td key={col.key} style={cellStyle}>{req.client_name}</td>;
                                                        case 'employee_id':
                                                            return <td key={col.key} style={cellStyle}>{req.employee_id}</td>;
                                                        case 'department':
                                                            return <td key={col.key} style={cellStyle}>{req.department}</td>;
                                                        case 'resource_type_requested':
                                                            return <td key={col.key} style={cellStyle}>{req.resource_type_requested}</td>;
                                                        case 'server_type':
                                                            return <td key={col.key} style={cellStyle}><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Server size={14} className="text-[var(--theme-primary)]" />{req.server_type}</div></td>;
                                                        case 'quantity':
                                                            return <td key={col.key} style={cellStyle}><span style={{ fontWeight: 700 }}>{req.quantity}</span></td>;
                                                        case 'cloud_provider':
                                                            return <td key={col.key} style={cellStyle}>{req.cloud_provider}</td>;
                                                        case 'region':
                                                            return <td key={col.key} style={cellStyle}>{req.region}</td>;
                                                        case 'instance_type':
                                                            return <td key={col.key} style={cellStyle}>{req.instance_type}</td>;
                                                        case 'cpu_ram':
                                                            return <td key={col.key} style={cellStyle}><span style={{ fontWeight: 700 }}>{req.cpu_cores} Cores</span> | <span>{req.ram_gb} GB</span></td>;
                                                        case 'storage':
                                                            return <td key={col.key} style={cellStyle}><span>{req.storage_size_gb} GB</span> <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>({req.storage_type})</span></td>;
                                                        case 'os':
                                                            return <td key={col.key} style={cellStyle}>{req.os}</td>;
                                                        case 'database':
                                                            return <td key={col.key} style={cellStyle}>
                                                                {req.database_required ? (
                                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                        <span style={{ fontWeight: 700 }}>{req.database_engine}</span>
                                                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{req.db_storage_gb} GB</span>
                                                                    </div>
                                                                ) : 'None'}
                                                            </td>;
                                                        case 'dates':
                                                            return <td key={col.key} style={cellStyle}>
                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                    <span>Start: {formatToAppDate(req.expected_start_date)}</span>
                                                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>End: {req.expected_end_date ? formatToAppDate(req.expected_end_date) : '---'}</span>
                                                                </div>
                                                            </td>;
                                                        case 'purpose_of_request':
                                                            return <td key={col.key} style={cellStyle} title={req.purpose_of_request}><div style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.purpose_of_request}</div></td>;
                                                        case 'justification':
                                                            return <td key={col.key} style={cellStyle} title={req.business_justification}>
                                                                <div style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.business_justification}</div>
                                                            </td>;
                                                        case 'status':
                                                            return <td key={col.key} style={cellStyle}>
                                                                <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', background: status.bg, color: status.color, border: `1px solid ${status.color}20` }}>{status.label}</span>
                                                            </td>;
                                                        default: return null;
                                                    }
                                                })}
                                                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                                    <button onClick={() => onView(req.id)} style={{ padding: '6px 12px', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Details <ArrowRight size={14} /></button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <Pagination currentPage={currentPage} totalItems={filteredRequests.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
            </div>
        </div>
    );
};

export default ResourceDashboard;
