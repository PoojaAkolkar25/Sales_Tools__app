import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Search, FileSpreadsheet, Columns, Download, ChevronDown, RefreshCw } from 'lucide-react';
import api from '../api';

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
        endDate: ''
    });

    const [isDownloading, setIsDownloading] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showColumnMenu, setShowColumnMenu] = useState(false);
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

    const filteredCostSheets = useMemo(() => {
        return costSheets.filter(cs => {
            const matchesCs = (cs.cost_sheet_no || '').toLowerCase().includes(filters.csNumber.toLowerCase());
            const matchesLead = (cs.lead_no || '').toLowerCase().includes(filters.leadNo.toLowerCase());
            const matchesDeal = (cs.deal_no || '').toLowerCase().includes(filters.dealNo.toLowerCase());
            const matchesCustomer = (cs.customer_name || '').toLowerCase().includes(filters.customerName.toLowerCase());
            const matchesProject = (cs.project_name || '').toLowerCase().includes(filters.projectName.toLowerCase());
            const matchesStatus = filters.status === '' || cs.status === filters.status;

            // Date Selection Logic
            let matchesDate = true;
            if (filters.period) {
                const rawDate = cs.cost_sheet_date || cs.created_at;
                const csDate = new Date(rawDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (filters.period === 'last_month') {
                    const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    const lastOfLastMonth = new Date(firstOfThisMonth.getTime() - 1);
                    const firstOfLastMonth = new Date(lastOfLastMonth.getFullYear(), lastOfLastMonth.getMonth(), 1);
                    matchesDate = csDate >= firstOfLastMonth && csDate <= lastOfLastMonth;
                } else if (filters.period === 'last_3_months') {
                    const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    const lastOfLastMonth = new Date(firstOfThisMonth.getTime() - 1);
                    const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
                    matchesDate = csDate >= threeMonthsAgo && csDate <= lastOfLastMonth;
                } else if (filters.period === 'last_6_months') {
                    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1);
                    matchesDate = csDate >= sixMonthsAgo && csDate < new Date(today.getFullYear(), today.getMonth(), 1);
                } else if (filters.period === 'last_year') {
                    const lastYear = today.getFullYear() - 1;
                    const startOfYear = new Date(lastYear, 0, 1);
                    const endOfYear = new Date(lastYear, 11, 31, 23, 59, 59);
                    matchesDate = csDate >= startOfYear && csDate <= endOfYear;
                } else if (filters.period === 'last_financial_year') {
                    let startYear = today.getFullYear();
                    if (today.getMonth() < 3) startYear -= 1; // Financial year starts in April
                    startYear -= 1;
                    const startOfFY = new Date(startYear, 3, 1);
                    const endOfFY = new Date(startYear + 1, 2, 31, 23, 59, 59);
                    matchesDate = csDate >= startOfFY && csDate <= endOfFY;
                } else if (filters.period === 'custom' && filters.startDate && filters.endDate) {
                    const start = new Date(filters.startDate);
                    const end = new Date(filters.endDate);
                    end.setHours(23, 59, 59, 999);
                    matchesDate = csDate >= start && csDate <= end;
                }
            }

            return matchesCs && matchesLead && matchesDeal && matchesCustomer && matchesProject && matchesStatus && matchesDate;
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

    const counts = useMemo(() => ({
        all: costSheets.length,
        draft: costSheets.filter(cs => cs.status === 'PENDING').length,
        pending: costSheets.filter(cs => cs.status === 'SUBMITTED').length,
        reverted: costSheets.filter(cs => cs.status === 'REVERTED').length,
        approved: costSheets.filter(cs => cs.status === 'APPROVED').length,
        rejected: costSheets.filter(cs => cs.status === 'REJECTED').length
    }), [costSheets]);

    const statusFlow = [
        { label: `Draft (${counts.draft})`, value: 'PENDING', color: '#718096' },
        { label: `Pending (${counts.pending})`, value: 'SUBMITTED', color: '#FF6B00' },
        { label: `Reverted (${counts.reverted})`, value: 'REVERTED', color: '#D69E2E' },
        { label: `Approved (${counts.approved})`, value: 'APPROVED', color: '#00C853' },
        { label: `Rejected (${counts.rejected})`, value: 'REJECTED', color: '#E53E3E' },
        { label: `All (${counts.all})`, value: '', color: '#718096' }
    ];

    const getStatusBadge = (status: string) => {
        const statusMap: { [key: string]: { bg: string; color: string; label: string } } = {
            'PENDING': { bg: 'rgba(113, 128, 150, 0.1)', color: '#718096', label: 'Draft' },
            'SUBMITTED': { bg: 'rgba(255, 107, 0, 0.1)', color: '#FF6B00', label: 'Pending' },
            'REVERTED': { bg: 'rgba(214, 158, 46, 0.1)', color: '#D69E2E', label: 'Reverted' },
            'APPROVED': { bg: 'rgba(0, 200, 83, 0.1)', color: '#00C853', label: 'Approved' },
            'REJECTED': { bg: 'rgba(229, 62, 62, 0.1)', color: '#E53E3E', label: 'Rejected' }
        };
        return statusMap[status] || { bg: '#F7FAFC', color: '#718096', label: status };
    };

    return (
        <div className="space-y-6">
            <div className="ae-table-container" style={{
                marginTop: '12px',
                marginBottom: '60px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden' // Ensure flush table looks good
            }}>
                {/* Controls Status Tabs and Actions - Padded Header Area */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px',
                    padding: '20px',
                    borderBottom: '1px solid #F1F5F9'
                }}>

                    {/* Status Tabs */}
                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        background: 'white',
                        padding: '6px',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
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
                                    background: filters.status === flow.value ? '#FF6B00' : 'transparent',
                                    color: filters.status === flow.value ? 'white' : '#64748B',
                                    boxShadow: filters.status === flow.value ? '0 2px 8px rgba(255, 107, 0, 0.2)' : 'none'
                                }}
                            >
                                {flow.label}
                            </button>
                        ))}
                    </div>

                    {/* Right Side Actions */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>Period:</span>
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
                                    background: 'white',
                                    color: '#4A5568',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                <Download size={16} /> Export <ChevronDown size={14} />
                            </button>
                            {showExportMenu && (
                                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', border: '1px solid #E2E8F0', zIndex: 100, minWidth: '160px', overflow: 'hidden' }}>
                                    <button
                                        disabled={isDownloading}
                                        onClick={() => { exportToCSV(); setShowExportMenu(false); }}
                                        style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#4A5568', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        <FileSpreadsheet size={16} style={{ color: '#059669' }} /> CSV Report
                                    </button>
                                    <button
                                        disabled={isDownloading}
                                        onClick={() => { exportToExcel(); setShowExportMenu(false); }}
                                        style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#4A5568', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
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
                                    background: 'white',
                                    color: '#4A5568',
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
                                        }} onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
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
                                            />
                                            {col.label}
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
                                {visibleColumns.includes('lead_no') && <th style={{ height: '40px', top: 0, whiteSpace: 'nowrap', zIndex: 12, backgroundColor: '#FAFBFC' }}>Lead Number</th>}
                                {visibleColumns.includes('deal_no') && <th style={{ height: '40px', top: 0, whiteSpace: 'nowrap', zIndex: 12, backgroundColor: '#FAFBFC' }}>Deal No.</th>}
                                {visibleColumns.includes('customer_name') && <th style={{ height: '40px', top: 0, whiteSpace: 'nowrap', zIndex: 12, backgroundColor: '#FAFBFC' }}>Customer Name</th>}
                                {visibleColumns.includes('project_name') && <th style={{ height: '40px', top: 0, whiteSpace: 'nowrap', zIndex: 12, backgroundColor: '#FAFBFC' }}>Project Name</th>}
                                {visibleColumns.includes('cost_sheet_no') && <th style={{ height: '40px', top: 0, whiteSpace: 'nowrap', zIndex: 12, backgroundColor: '#FAFBFC' }}>Cost Sheet No.</th>}
                                {visibleColumns.includes('date') && <th style={{ height: '40px', top: 0, whiteSpace: 'nowrap', zIndex: 12, backgroundColor: '#FAFBFC' }}>Date</th>}
                                {visibleColumns.includes('status') && <th style={{ height: '40px', top: 0, whiteSpace: 'nowrap', zIndex: 12, backgroundColor: '#FAFBFC' }}>Status</th>}
                                {visibleColumns.includes('margin_percentage') && <th style={{ height: '40px', textAlign: 'right', top: 0, whiteSpace: 'nowrap', zIndex: 12, backgroundColor: '#FAFBFC' }}>Margin %</th>}
                                {visibleColumns.includes('est_margin') && <th style={{ height: '40px', textAlign: 'right', top: 0, whiteSpace: 'nowrap', zIndex: 12, backgroundColor: '#FAFBFC' }}>Est. Margin</th>}
                                {visibleColumns.includes('total_price') && <th style={{ height: '40px', textAlign: 'right', top: 0, whiteSpace: 'nowrap', zIndex: 12, minWidth: '120px', backgroundColor: '#FAFBFC' }}>Total Price</th>}
                                <th style={{ height: '40px', textAlign: 'center', top: 0, whiteSpace: 'nowrap', zIndex: 12, width: '130px', backgroundColor: '#FAFBFC' }}>Actions</th>
                            </tr>
                            {/* Filter Row */}
                            <tr style={{ background: '#F7FAFC' }}>
                                {visibleColumns.includes('lead_no') && <th style={{ top: '40px', zIndex: 11, backgroundColor: '#F7FAFC' }}>
                                    <div className="ae-input-group">
                                        <Search className="ae-search-icon" size={12} />
                                        <input
                                            className="ae-input"
                                            placeholder="Filter..."
                                            value={filters.leadNo}
                                            onChange={e => setFilters({ ...filters, leadNo: e.target.value })}
                                            style={{ height: '24px', fontSize: '11px', width: '100px', paddingTop: 0, paddingBottom: 0 }}
                                        />
                                    </div>
                                </th>}
                                {visibleColumns.includes('deal_no') && <th style={{ top: '40px', zIndex: 11, backgroundColor: '#F7FAFC' }}>
                                    <div className="ae-input-group">
                                        <Search className="ae-search-icon" size={12} />
                                        <input
                                            className="ae-input"
                                            placeholder="Filter..."
                                            value={filters.dealNo}
                                            onChange={e => setFilters({ ...filters, dealNo: e.target.value })}
                                            style={{ height: '24px', fontSize: '11px', width: '100px', paddingTop: 0, paddingBottom: 0 }}
                                        />
                                    </div>
                                </th>}
                                {visibleColumns.includes('customer_name') && <th style={{ top: '40px', zIndex: 11, backgroundColor: '#F7FAFC' }}>
                                    <div className="ae-input-group">
                                        <Search className="ae-search-icon" size={12} />
                                        <input
                                            className="ae-input"
                                            placeholder="Filter..."
                                            value={filters.customerName}
                                            onChange={e => setFilters({ ...filters, customerName: e.target.value })}
                                            style={{ height: '24px', fontSize: '11px', paddingTop: 0, paddingBottom: 0 }}
                                        />
                                    </div>
                                </th>}
                                {visibleColumns.includes('project_name') && <th style={{ top: '40px', zIndex: 11, backgroundColor: '#F7FAFC' }}>
                                    <div className="ae-input-group">
                                        <Search className="ae-search-icon" size={12} />
                                        <input
                                            className="ae-input"
                                            placeholder="Filter..."
                                            value={filters.projectName}
                                            onChange={e => setFilters({ ...filters, projectName: e.target.value })}
                                            style={{ height: '24px', fontSize: '11px', paddingTop: 0, paddingBottom: 0 }}
                                        />
                                    </div>
                                </th>}
                                {visibleColumns.includes('cost_sheet_no') && <th style={{ top: '40px', zIndex: 11, backgroundColor: '#F7FAFC' }}>
                                    <div className="ae-input-group">
                                        <Search className="ae-search-icon" size={12} />
                                        <input
                                            className="ae-input"
                                            placeholder="Filter..."
                                            value={filters.csNumber}
                                            onChange={e => setFilters({ ...filters, csNumber: e.target.value })}
                                            style={{ height: '24px', fontSize: '11px', width: '100px', paddingTop: 0, paddingBottom: 0 }}
                                        />
                                    </div>
                                </th>}
                                {visibleColumns.includes('date') && <th style={{ top: '40px', zIndex: 11, backgroundColor: '#F7FAFC' }}>
                                    <div className="ae-input-group">
                                        <Search className="ae-search-icon" size={12} style={{ left: '10px' }} />
                                        <select
                                            className="ae-input"
                                            value={filters.period}
                                            onChange={e => setFilters({ ...filters, period: e.target.value })}
                                            style={{
                                                height: '24px',
                                                width: '100%',
                                                borderRadius: '6px',
                                                paddingLeft: '28px',
                                                paddingRight: '8px',
                                                paddingTop: 0,
                                                paddingBottom: 0,
                                                fontSize: '11px',
                                                color: filters.period === '' ? '#A0AEC0' : 'black'
                                            }}
                                        >
                                            <option value="" style={{ color: '#A0AEC0' }}>All Period</option>
                                            <option value="last_month" style={{ color: 'black' }}>Last Month</option>
                                            <option value="last_3_months" style={{ color: 'black' }}>Last 3 Months</option>
                                            <option value="last_6_months" style={{ color: 'black' }}>Last 6 Months</option>
                                            <option value="last_year" style={{ color: 'black' }}>Last Year</option>
                                            <option value="last_financial_year" style={{ color: 'black' }}>Last FY</option>
                                            <option value="custom" style={{ color: 'black' }}>Custom Range</option>
                                        </select>
                                    </div>
                                    {filters.period === 'custom' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', marginTop: '4px' }}>
                                            <input
                                                type="date"
                                                className="ae-input"
                                                value={filters.startDate}
                                                onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                                                style={{ height: '24px', fontSize: '10px', borderRadius: '4px' }}
                                                placeholder="Start"
                                            />
                                            <input
                                                type="date"
                                                className="ae-input"
                                                value={filters.endDate}
                                                onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                                                style={{ height: '24px', fontSize: '10px', borderRadius: '4px' }}
                                                placeholder="End"
                                            />
                                        </div>
                                    )}
                                </th>}
                                {visibleColumns.includes('status') && <th style={{ padding: '6px 8px', top: '40px', zIndex: 11, backgroundColor: '#F7FAFC' }}></th>}
                                {visibleColumns.includes('margin_percentage') && <th style={{ padding: '6px 8px', top: '40px', zIndex: 11, backgroundColor: '#F7FAFC' }}></th>}
                                {visibleColumns.includes('est_margin') && <th style={{ padding: '6px 8px', top: '40px', zIndex: 11, backgroundColor: '#F7FAFC' }}></th>}
                                {visibleColumns.includes('total_price') && <th style={{ padding: '6px 8px', top: '40px', zIndex: 11, backgroundColor: '#F7FAFC' }}></th>}
                                <th style={{ textAlign: 'center', top: '40px', position: 'sticky', right: 0, backgroundColor: '#F7FAFC', zIndex: 12 }}>
                                    <button
                                        onClick={() => setFilters({ csNumber: '', leadNo: '', dealNo: '', customerName: '', projectName: '', status: '', period: '', startDate: '', endDate: '' })}
                                        style={{
                                            height: '24px',
                                            width: '100%',
                                            fontSize: '10px',
                                            color: '#FF6B00',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            cursor: 'pointer',
                                            background: 'white',
                                            border: '1px solid #E0E6ED',
                                            padding: '0 8px',
                                            borderRadius: '6px',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(255, 107, 0, 0.05)';
                                            e.currentTarget.style.borderColor = '#FF6B00';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'white';
                                            e.currentTarget.style.borderColor = '#E0E6ED';
                                        }}
                                    >
                                        Clear
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={visibleColumns.length + 1} style={{ textAlign: 'center', padding: '100px' }}><RefreshCw className="animate-spin" style={{ margin: '0 auto' }} /></td></tr>
                            ) : filteredCostSheets.length === 0 ? (
                                <tr>
                                    <td colSpan={visibleColumns.length + 1} style={{ padding: '60px', textAlign: 'center', color: '#718096' }}>
                                        <FileSpreadsheet size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
                                        <div style={{ fontWeight: 600 }}>
                                            {costSheets.length === 0 ? 'No cost sheets found.' : 'No results matching your filters.'}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredCostSheets.map((cs) => {
                                    const statusInfo = getStatusBadge(cs.status);
                                    return (
                                        <tr key={cs.id}>
                                            {visibleColumns.includes('lead_no') && <td style={{ fontWeight: 600, color: '#718096', fontSize: '0.8rem' }}>
                                                {cs.lead_no || '—'}
                                            </td>}
                                            {visibleColumns.includes('deal_no') && <td
                                                style={{ fontWeight: 600, color: '#0066CC', fontSize: '0.8rem', cursor: cs.deal ? 'pointer' : 'default', textDecoration: cs.deal ? 'underline' : 'none' }}
                                                onClick={() => cs.deal && navigate(`/deal?id=${cs.deal}`)}
                                            >
                                                {cs.deal_no || '—'}
                                            </td>}
                                            {visibleColumns.includes('customer_name') && <td style={{ color: '#4A5568', fontWeight: 500 }}>
                                                {cs.customer_name || '—'}
                                            </td>}
                                            {visibleColumns.includes('project_name') && <td style={{ color: '#2D3748', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={cs.project_name || '—'}>
                                                {cs.project_name || '—'}
                                            </td>}
                                            {visibleColumns.includes('cost_sheet_no') && <td style={{ fontWeight: 700, color: '#FF6B00', fontFamily: 'monospace' }}>
                                                {cs.cost_sheet_no}
                                            </td>}
                                            {visibleColumns.includes('date') && <td style={{ color: '#4A5568', fontWeight: 600 }}>
                                                {cs.cost_sheet_date ? new Date(cs.cost_sheet_date).toLocaleDateString() : new Date(cs.created_at).toLocaleDateString()}
                                            </td>}
                                            {visibleColumns.includes('status') && <td>
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
                                            </td>}
                                            {visibleColumns.includes('margin_percentage') && <td style={{ textAlign: 'right', fontWeight: 600, color: '#4A5568', fontSize: '0.8rem' }}>
                                                {cs.total_margin_percentage || 0}%
                                            </td>}
                                            {visibleColumns.includes('est_margin') && <td style={{ textAlign: 'right', fontWeight: 600, color: '#4A5568', fontSize: '0.8rem' }}>
                                                {cs.currency === 'INR' ? '₹' : cs.currency === 'USD' ? '$' : cs.currency === 'EURO' ? '€' : '$'}
                                                {parseFloat(cs.total_estimated_margin).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>}
                                            {visibleColumns.includes('total_price') && <td style={{ fontWeight: 700, color: '#1a1f36', textAlign: 'right' }}>
                                                {cs.currency === 'INR' ? '₹' : cs.currency === 'USD' ? '$' : cs.currency === 'EURO' ? '€' : '$'}
                                                {parseFloat(cs.total_estimated_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>}
                                            <td style={{ textAlign: 'center', display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => onView(cs.id)}
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
                                                        background: '#10B981',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseOver={(e) => e.currentTarget.style.background = '#059669'}
                                                    onMouseOut={(e) => e.currentTarget.style.background = '#10B981'}
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
            </div >
        </div >
    );
};

export default CostSheetDashboard;

