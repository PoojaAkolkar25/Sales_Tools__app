import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
    Plus,
    Search,
    Receipt,
    Download,
    Columns,
    ChevronDown,
    FileSpreadsheet
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import MilestoneForm from './MilestoneForm';

const ALL_COLUMNS = [
    { key: 'milestone_no', label: 'Milestone No' },
    { key: 'sales_order', label: 'Sales Order' },
    { key: 'customer', label: 'Customer' },
    { key: 'description', label: 'Description' },
    { key: 'due_date', label: 'Due Date' },
    { key: 'amount', label: 'Amount' },
    { key: 'status', label: 'Status' },
    { key: 'invoice_no', label: 'Invoice No' }
];

const MilestoneDashboard: React.FC = () => {
    const [milestones, setMilestones] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const { showNotification } = useNotification();

    // Filter States
    const [filters, setFilters] = useState({
        milestoneNo: '',
        soNumber: '',
        customerName: '',
        status: '',
        period: '',
        startDate: '',
        endDate: ''
    });

    const [isDownloading, setIsDownloading] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem('milestoneDashboard_visibleColumns');
        return saved ? JSON.parse(saved) : ALL_COLUMNS.map(col => col.key);
    });

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
            const response = await api.get('/milestones/');
            setMilestones(response.data);
        } catch (error) {
            showNotification('Error fetching milestones', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateInvoice = async (milestoneId: number) => {
        if (!window.confirm('Are you sure you want to create an invoice for this milestone?')) return;

        try {
            await api.post(`/milestones/${milestoneId}/create_invoice/`);
            showNotification('Invoice created successfully', 'success');
            fetchMilestones();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Failed to create invoice', 'error');
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
        if (filters.status) params.append('status', filters.status);
        return params.toString();
    };

    const exportToCSV = async () => {
        setIsDownloading(true);
        try {
            const queryParams = getExportQueryParams();
            const response = await api.get(`/milestones/export_report/?${queryParams}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Milestones_Report_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error: any) {
            console.error('Error downloading CSV report:', error);
            showNotification('Failed to download CSV report.', 'error');
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

    const filteredMilestones = useMemo(() => {
        return milestones.filter(m => {
            const matchesMilestone = (m.milestone_no || '').toLowerCase().includes(filters.milestoneNo.toLowerCase());
            const matchesSO = (m.sales_order_details?.so_number || '').toLowerCase().includes(filters.soNumber.toLowerCase());
            const matchesCustomer = (m.sales_order_details?.customer_name || '').toLowerCase().includes(filters.customerName.toLowerCase());
            const matchesStatus = filters.status === '' || m.status === filters.status;

            // Date filtering
            let matchesDate = true;
            if (filters.period) {
                const milestoneDate = new Date(m.due_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

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

            return matchesMilestone && matchesSO && matchesCustomer && matchesStatus && matchesDate;
        }).sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());
    }, [milestones, filters]);

    const counts = useMemo(() => ({
        all: milestones.length,
        pending: milestones.filter(m => m.status === 'PENDING').length,
        invoiced: milestones.filter(m => m.status === 'INVOICED').length
    }), [milestones]);

    const statusFlow = [
        { label: `Pending (${counts.pending})`, value: 'PENDING', color: '#FF6B00' },
        { label: `Invoiced (${counts.invoiced})`, value: 'INVOICED', color: '#00C853' },
        { label: `All (${counts.all})`, value: '', color: '#718096' }
    ];

    if (showForm) {
        return <MilestoneForm onBack={() => { setShowForm(false); fetchMilestones(); }} />;
    }

    return (
        <div className="ae-table-container" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Header Area */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '4px', height: '18px', background: '#FF6B00', borderRadius: '2px' }}></div>
                    <h1 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1a1f36', margin: 0 }}>
                        Milestone Management
                    </h1>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4A5568' }}>Report Period:</span>
                        <select
                            className="ae-input"
                            value={filters.period}
                            onChange={e => setFilters({ ...filters, period: e.target.value })}
                            style={{ height: '32px', fontSize: '0.8rem', width: '150px', padding: '0 12px' }}
                        >
                            <option value="">All Time</option>
                            <option value="last_month">Last Month</option>
                            <option value="last_3_months">Last 3 Months</option>
                            <option value="last_6_months">Last 6 Months</option>
                            <option value="last_year">Last Year</option>
                            <option value="last_financial_year">Financial Year</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>

                    {filters.period === 'custom' && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <input type="date" className="ae-input" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} style={{ height: '32px', fontSize: '0.75rem', width: '120px' }} />
                            <input type="date" className="ae-input" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} style={{ height: '32px', fontSize: '0.75rem', width: '120px' }} />
                        </div>
                    )}

                    <div style={{ position: 'relative' }} ref={exportMenuRef}>
                        <button
                            className="ae-btn-secondary"
                            disabled={isDownloading}
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', fontSize: '0.8rem', height: '32px', fontWeight: 700 }}
                        >
                            <Download size={16} /> Export <ChevronDown size={14} />
                        </button>
                        {showExportMenu && (
                            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', border: '1px solid #E2E8F0', zIndex: 100, minWidth: '160px', overflow: 'hidden' }}>
                                <button
                                    onClick={() => { exportToCSV(); setShowExportMenu(false); }}
                                    style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#4A5568', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                >
                                    <FileSpreadsheet size={16} style={{ color: '#059669' }} /> CSV Report
                                </button>
                                <button
                                    onClick={() => { exportToExcel(); setShowExportMenu(false); }}
                                    style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#4A5568', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
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
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', fontSize: '0.8rem', height: '32px', fontWeight: 700 }}
                        >
                            <Columns size={16} /> Columns <ChevronDown size={14} />
                        </button>
                        {showColumnMenu && (
                            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', border: '1px solid #E2E8F0', zIndex: 100, minWidth: '200px', maxHeight: '400px', overflowY: 'auto' }}>
                                <div style={{ padding: '8px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between' }}>
                                    <button onClick={() => setVisibleColumns(ALL_COLUMNS.map(c => c.key))} style={{ background: 'none', border: 'none', color: '#0066CC', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>Select All</button>
                                    <button onClick={() => setVisibleColumns([])} style={{ background: 'none', border: 'none', color: '#718096', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>Clear All</button>
                                </div>
                                {ALL_COLUMNS.map(col => (
                                    <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px', fontSize: '0.8rem', color: '#4A5568', cursor: 'pointer' }}>
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

                    <button
                        onClick={() => setShowForm(true)}
                        className="ae-btn-primary"
                        style={{ height: '32px', padding: '0 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Plus size={16} /> New Milestone
                    </button>
                </div>
            </div>

            {/* Status Tabs */}
            <div style={{ display: 'flex', gap: '8px', background: 'white', padding: '4px', borderRadius: '12px', border: '1px solid #E0E6ED', width: 'fit-content' }}>
                {statusFlow.map((flow) => (
                    <button
                        key={flow.value}
                        onClick={() => setFilters({ ...filters, status: flow.value })}
                        style={{
                            padding: '6px 16px',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            background: filters.status === flow.value ? '#FF6B00' : 'transparent',
                            color: filters.status === flow.value ? 'white' : '#718096',
                        }}
                    >
                        {flow.label}
                    </button>
                ))}
            </div>

            {/* Table Area */}
            <div style={{ overflowX: 'auto' }}>
                <table className="ae-table">
                    <thead>
                        <tr>
                            {visibleColumns.includes('milestone_no') && <th>Milestone No</th>}
                            {visibleColumns.includes('sales_order') && <th>Sales Order</th>}
                            {visibleColumns.includes('customer') && <th>Customer</th>}
                            {visibleColumns.includes('description') && <th>Description</th>}
                            {visibleColumns.includes('due_date') && <th>Due Date</th>}
                            {visibleColumns.includes('amount') && <th style={{ textAlign: 'right' }}>Amount</th>}
                            {visibleColumns.includes('status') && <th style={{ textAlign: 'center' }}>Status</th>}
                            {visibleColumns.includes('invoice_no') && <th>Invoice No</th>}
                            <th style={{ textAlign: 'center', width: '130px' }}>Actions</th>
                        </tr>
                        {/* Filter Row */}
                        <tr style={{ background: '#F7FAFC' }}>
                            {visibleColumns.includes('milestone_no') && <th>
                                <div className="ae-input-group">
                                    <Search className="ae-search-icon" size={12} />
                                    <input className="ae-input" placeholder="Filter..." value={filters.milestoneNo} onChange={e => setFilters({ ...filters, milestoneNo: e.target.value })} style={{ height: '24px', fontSize: '11px' }} />
                                </div>
                            </th>}
                            {visibleColumns.includes('sales_order') && <th>
                                <div className="ae-input-group">
                                    <Search className="ae-search-icon" size={12} />
                                    <input className="ae-input" placeholder="Filter..." value={filters.soNumber} onChange={e => setFilters({ ...filters, soNumber: e.target.value })} style={{ height: '24px', fontSize: '11px' }} />
                                </div>
                            </th>}
                            {visibleColumns.includes('customer') && <th>
                                <div className="ae-input-group">
                                    <Search className="ae-search-icon" size={12} />
                                    <input className="ae-input" placeholder="Filter..." value={filters.customerName} onChange={e => setFilters({ ...filters, customerName: e.target.value })} style={{ height: '24px', fontSize: '11px' }} />
                                </div>
                            </th>}
                            {visibleColumns.includes('description') && <th></th>}
                            {visibleColumns.includes('due_date') && <th></th>}
                            {visibleColumns.includes('amount') && <th></th>}
                            {visibleColumns.includes('status') && <th></th>}
                            {visibleColumns.includes('invoice_no') && <th></th>}
                            <th style={{ textAlign: 'center' }}>
                                <button
                                    onClick={() => setFilters({ milestoneNo: '', soNumber: '', customerName: '', status: '', period: '', startDate: '', endDate: '' })}
                                    style={{ height: '24px', width: '100%', fontSize: '10px', color: '#FF6B00', fontWeight: 700, cursor: 'pointer', background: 'white', border: '1px solid #E0E6ED', borderRadius: '6px' }}
                                >
                                    Clear
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={visibleColumns.length + 1} style={{ textAlign: 'center', padding: '100px' }}>Loading...</td></tr>
                        ) : filteredMilestones.length === 0 ? (
                            <tr><td colSpan={visibleColumns.length + 1} style={{ padding: '60px', textAlign: 'center', color: '#718096' }}>No milestones found.</td></tr>
                        ) : (
                            filteredMilestones.map((m) => (
                                <tr key={m.id}>
                                    {visibleColumns.includes('milestone_no') && <td style={{ fontWeight: 800, color: '#1A1F36' }}>{m.milestone_no}</td>}
                                    {visibleColumns.includes('sales_order') && <td style={{ fontWeight: 700, color: '#0066CC' }}>{m.sales_order_details?.so_number}</td>}
                                    {visibleColumns.includes('customer') && <td style={{ fontWeight: 600, color: '#4A5568' }}>{m.sales_order_details?.customer_name}</td>}
                                    {visibleColumns.includes('description') && <td style={{ fontSize: '12px', color: '#718096' }}>{m.description}</td>}
                                    {visibleColumns.includes('due_date') && <td style={{ fontWeight: 600 }}>{new Date(m.due_date).toLocaleDateString()}</td>}
                                    {visibleColumns.includes('amount') && <td style={{ textAlign: 'right', fontWeight: 900 }}>${parseFloat(m.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>}
                                    {visibleColumns.includes('status') && <td style={{ textAlign: 'center' }}>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '10px',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            background: m.status === 'INVOICED' ? 'rgba(0, 200, 83, 0.1)' : 'rgba(255, 107, 0, 0.1)',
                                            color: m.status === 'INVOICED' ? '#00C853' : '#FF6B00'
                                        }}>
                                            {m.status}
                                        </span>
                                    </td>}
                                    {visibleColumns.includes('invoice_no') && <td style={{ fontWeight: 700, color: '#00C853' }}>{m.invoice_details?.invoice_no || '—'}</td>}
                                    <td style={{ textAlign: 'center' }}>
                                        {m.status !== 'INVOICED' ? (
                                            <button
                                                onClick={() => handleCreateInvoice(m.id)}
                                                className="ae-btn-secondary"
                                                style={{ width: 'auto', padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                            >
                                                <Receipt size={14} /> Invoice
                                            </button>
                                        ) : (
                                            <div style={{ color: '#A0AEC0', fontSize: '11px', fontWeight: 700 }}>Invoiced</div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MilestoneDashboard;
