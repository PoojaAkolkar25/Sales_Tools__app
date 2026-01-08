import React, { useMemo, useState } from 'react';
import { Eye, Search, Calendar, FileSpreadsheet, RefreshCw } from 'lucide-react';

interface CostSheet {
    id: number;
    cost_sheet_no: string;
    lead_no: string;
    customer_name: string;
    project_name: string;
    status: string;
    total_estimated_price: string;
    created_at: string;
}

interface CostSheetDashboardProps {
    costSheets: CostSheet[];
    loading: boolean;
    onView: (id: number) => void;
}

const CostSheetDashboard: React.FC<CostSheetDashboardProps> = ({ costSheets, loading, onView }) => {
    // Filter States
    const [filters, setFilters] = useState({
        csNumber: '',
        leadNo: '',
        customerName: '',
        projectName: '',
        status: '',
        period: '',
        startDate: '',
        endDate: ''
    });

    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownloadReport = async () => {
        setIsDownloading(true);
        try {
            let queryParams = `period=${filters.period}`;
            if (filters.period === 'custom') {
                queryParams += `&start_date=${filters.startDate}&end_date=${filters.endDate}`;
            }

            // Align with src/api.ts configuration
            const baseUrl = 'http://localhost:8000/api';
            const fullUrl = `${baseUrl}/cost-sheets/export_report/?${queryParams}`;

            const token = localStorage.getItem('token');

            const response = await fetch(fullUrl, {
                headers: {
                    'Authorization': token ? `Token ${token}` : ''
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Download failed');
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `cost_sheets_report_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error: any) {
            console.error('Error downloading report:', error);
            alert(error.message || 'Failed to download report. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    };

    const filteredCostSheets = useMemo(() => {
        return costSheets.filter(cs => {
            const matchesCs = (cs.cost_sheet_no || '').toLowerCase().includes(filters.csNumber.toLowerCase());
            const matchesLead = (cs.lead_no || '').toLowerCase().includes(filters.leadNo.toLowerCase());
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

            return matchesCs && matchesLead && matchesCustomer && matchesProject && matchesStatus && matchesDate;
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
        { label: `All (${counts.all})`, value: '', color: '#718096' },
        { label: `Draft (${counts.draft})`, value: 'PENDING', color: '#718096' },
        { label: `Pending (${counts.pending})`, value: 'SUBMITTED', color: '#FF6B00' },
        { label: `Reverted (${counts.reverted})`, value: 'REVERTED', color: '#D69E2E' },
        { label: `Approved (${counts.approved})`, value: 'APPROVED', color: '#00C853' },
        { label: `Rejected (${counts.rejected})`, value: 'REJECTED', color: '#E53E3E' }
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

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '80px',
                color: '#718096'
            }}>
                <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
                <span style={{ fontWeight: 500 }}>Loading cost sheets...</span>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

            {/* Status Flow Navigation & Download */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingRight: '8px'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'white',
                    padding: '6px',
                    borderRadius: '12px',
                    border: '1px solid #E0E6ED',
                    width: 'fit-content',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                }}>
                    {statusFlow.map((flow, index) => (
                        <React.Fragment key={flow.value}>
                            <button
                                onClick={() => setFilters({ ...filters, status: flow.value })}
                                style={{
                                    padding: '8px 20px',
                                    borderRadius: '8px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: filters.status === flow.value ? '#FF6B00' : 'transparent',
                                    color: filters.status === flow.value ? 'white' : 'black',
                                    boxShadow: filters.status === flow.value ? '0 2px 8px rgba(255, 107, 0, 0.3)' : 'none'
                                }}
                            >
                                {flow.label}
                            </button>
                            {index < statusFlow.length - 1 && (
                                <span style={{ color: '#CBD5E0', fontSize: '12px' }}>›</span>
                            )}
                        </React.Fragment>
                    ))}
                </div>

                <button
                    onClick={handleDownloadReport}
                    disabled={isDownloading || (filters.period === 'custom' && (!filters.startDate || !filters.endDate))}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 24px',
                        background: (isDownloading || (filters.period === 'custom' && (!filters.startDate || !filters.endDate))) ? '#A0AEC0' : '#0066CC',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: (isDownloading || (filters.period === 'custom' && (!filters.startDate || !filters.endDate))) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(0, 102, 204, 0.2)'
                    }}
                    onMouseEnter={(e) => {
                        if (!(isDownloading || (filters.period === 'custom' && (!filters.startDate || !filters.endDate)))) {
                            e.currentTarget.style.background = '#0052A3';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!(isDownloading || (filters.period === 'custom' && (!filters.startDate || !filters.endDate)))) {
                            e.currentTarget.style.background = '#0066CC';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }
                    }}
                >
                    {isDownloading ? <RefreshCw size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
                    {isDownloading ? 'Downloading...' : 'Download Report'}
                </button>
            </div>

            {/* Table Container */}
            <div className="ae-table-container">
                <table className="ae-table">
                    <thead>
                        <tr>
                            <th style={{ width: '14%', top: 0 }}>Lead Number</th>
                            <th style={{ width: '18%', top: 0 }}>Customer Name</th>
                            <th style={{ width: '18%', top: 0 }}>Project Name</th>
                            <th style={{ width: '12%', top: 0 }}>Cost Sheet No.</th>
                            <th style={{ width: '10%', top: 0 }}>Date</th>
                            <th style={{ width: '10%', top: 0 }}>Status</th>
                            <th style={{ width: '12%', top: 0 }}>Total Price</th>
                            <th style={{ width: '6%', textAlign: 'right', top: 0 }}>Actions</th>
                        </tr>
                        {/* Filter Row */}
                        <tr style={{ background: '#F7FAFC' }}>
                            <th style={{ padding: '8px', top: '51px' }}>
                                <div className="ae-input-group">
                                    <Search className="ae-search-icon" size={12} />
                                    <input
                                        className="ae-input"
                                        placeholder="Filter..."
                                        value={filters.leadNo}
                                        onChange={e => setFilters({ ...filters, leadNo: e.target.value })}
                                        style={{ height: '32px', fontSize: '11px' }}
                                    />
                                </div>
                            </th>
                            <th style={{ padding: '8px', top: '51px' }}>
                                <div className="ae-input-group">
                                    <Search className="ae-search-icon" size={12} />
                                    <input
                                        className="ae-input"
                                        placeholder="Filter..."
                                        value={filters.customerName}
                                        onChange={e => setFilters({ ...filters, customerName: e.target.value })}
                                        style={{ height: '32px', fontSize: '11px' }}
                                    />
                                </div>
                            </th>
                            <th style={{ padding: '8px', top: '51px' }}>
                                <div className="ae-input-group">
                                    <Search className="ae-search-icon" size={12} />
                                    <input
                                        className="ae-input"
                                        placeholder="Filter..."
                                        value={filters.projectName}
                                        onChange={e => setFilters({ ...filters, projectName: e.target.value })}
                                        style={{ height: '32px', fontSize: '11px' }}
                                    />
                                </div>
                            </th>
                            <th style={{ padding: '8px', top: '51px' }}>
                                <div className="ae-input-group">
                                    <Search className="ae-search-icon" size={12} />
                                    <input
                                        className="ae-input"
                                        placeholder="Filter..."
                                        value={filters.csNumber}
                                        onChange={e => setFilters({ ...filters, csNumber: e.target.value })}
                                        style={{ height: '32px', fontSize: '11px' }}
                                    />
                                </div>
                            </th>
                            <th style={{ padding: '8px', top: '51px' }}>
                                <div className="ae-input-group" style={{ flexDirection: 'column', gap: '4px', background: 'transparent', border: 'none', padding: 0 }}>
                                    <select
                                        className="ae-input"
                                        value={filters.period}
                                        onChange={e => setFilters({ ...filters, period: e.target.value })}
                                        style={{ height: '32px', fontSize: '11px', width: '100%', borderRadius: '8px' }}
                                    >
                                        <option value="">All Periods</option>
                                        <option value="last_month">Last Month</option>
                                        <option value="last_3_months">Last 3 Months</option>
                                        <option value="last_6_months">Last 6 Months</option>
                                        <option value="last_year">Last Year</option>
                                        <option value="last_financial_year">Last FY</option>
                                        <option value="custom">Custom Range</option>
                                    </select>
                                    {filters.period === 'custom' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                                            <input
                                                type="date"
                                                className="ae-input"
                                                value={filters.startDate}
                                                onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                                                style={{ height: '28px', fontSize: '10px', borderRadius: '6px' }}
                                                placeholder="Start"
                                            />
                                            <input
                                                type="date"
                                                className="ae-input"
                                                value={filters.endDate}
                                                onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                                                style={{ height: '28px', fontSize: '10px', borderRadius: '6px' }}
                                                placeholder="End"
                                            />
                                        </div>
                                    )}
                                </div>
                            </th>
                            <th style={{ padding: '8px', top: '51px' }}></th>
                            <th style={{ padding: '8px', top: '51px' }}></th>
                            <th style={{ padding: '8px', textAlign: 'right', top: '51px' }}>
                                <button
                                    onClick={() => setFilters({ csNumber: '', leadNo: '', customerName: '', projectName: '', status: '', period: '', startDate: '', endDate: '' })}
                                    style={{
                                        fontSize: '10px',
                                        color: '#FF6B00',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        cursor: 'pointer',
                                        background: 'none',
                                        border: 'none',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    Reset
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCostSheets.length === 0 ? (
                            <tr>
                                <td colSpan={8} style={{ padding: '60px', textAlign: 'center', color: '#718096' }}>
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
                                    <tr key={cs.id} style={{ cursor: 'pointer' }} onClick={() => onView(cs.id)}>
                                        <td style={{ fontWeight: 600, color: '#4A5568', fontFamily: 'monospace', fontSize: '12px' }}>
                                            {cs.lead_no}
                                        </td>
                                        <td style={{ color: '#2D3748', fontSize: '13px', fontWeight: 500 }}>
                                            {cs.customer_name || '—'}
                                        </td>
                                        <td style={{ color: 'black', fontSize: '12px' }}>
                                            {cs.project_name || '—'}
                                        </td>
                                        <td style={{ fontWeight: 700, color: '#FF6B00', fontFamily: 'monospace', fontSize: '12px' }}>
                                            {cs.cost_sheet_no}
                                        </td>
                                        <td style={{ color: '#4A5568', fontSize: '12px', fontWeight: 500 }}>
                                            {cs.cost_sheet_date ? new Date(cs.cost_sheet_date).toLocaleDateString() : new Date(cs.created_at).toLocaleDateString()}
                                        </td>
                                        <td>
                                            <span style={{
                                                display: 'inline-block',
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
                                        </td>
                                        <td style={{ fontWeight: 700, color: '#1a1f36', fontFamily: 'monospace', fontSize: '13px' }}>
                                            ${parseFloat(cs.total_estimated_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onView(cs.id);
                                                }}
                                                style={{
                                                    padding: '8px',
                                                    color: '#A0AEC0',
                                                    border: 'none',
                                                    background: 'none',
                                                    cursor: 'pointer',
                                                    borderRadius: '6px',
                                                    transition: 'all 0.2s'
                                                }}
                                                title="View Details"
                                            >
                                                <Eye size={16} />
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

export default CostSheetDashboard;