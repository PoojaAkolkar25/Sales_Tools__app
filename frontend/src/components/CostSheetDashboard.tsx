import React, { useMemo, useState } from 'react';
import { Eye, Search, FileSpreadsheet, RefreshCw } from 'lucide-react';

interface CostSheet {
    id: number;
    cost_sheet_no: string;
    lead_no: string;
    customer_name: string;
    project_name: string;
    status: string;
    total_estimated_price: string;
    cost_sheet_date?: string;
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

    return (
        <div className="ae-table-container" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Header Area */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '4px', height: '18px', background: '#FF6B00', borderRadius: '2px' }}></div>
                    <h1 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1a1f36', margin: 0 }}>
                        Cost Sheet Dashboard
                    </h1>
                </div>

                <div style={{
                    display: 'flex',
                    gap: '4px',
                    background: 'white',
                    padding: '6px',
                    borderRadius: '12px',
                    border: '1px solid #E0E6ED',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                }}>
                    <button
                        onClick={handleDownloadReport}
                        disabled={isDownloading || (filters.period === 'custom' && (!filters.startDate || !filters.endDate))}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            border: 'none',
                            cursor: (isDownloading || (filters.period === 'custom' && (!filters.startDate || !filters.endDate))) ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            background: '#F7FAFC',
                            color: '#4A5568'
                        }}
                        onMouseEnter={(e) => {
                            if (!(isDownloading || (filters.period === 'custom' && (!filters.startDate || !filters.endDate)))) {
                                e.currentTarget.style.background = '#FF6B00';
                                e.currentTarget.style.color = 'white';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 0, 0.2)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!(isDownloading || (filters.period === 'custom' && (!filters.startDate || !filters.endDate)))) {
                                e.currentTarget.style.background = '#F7FAFC';
                                e.currentTarget.style.color = '#4A5568';
                                e.currentTarget.style.boxShadow = 'none';
                            }
                        }}
                    >
                        {isDownloading ? <RefreshCw size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                        {isDownloading ? 'Downloading...' : 'Download Report'}
                    </button>
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
                        onClick={() => setFilters({ ...filters, status: flow.value })}
                        style={{
                            padding: '6px 16px',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
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
                            <th style={{ height: '40px', top: 0, whiteSpace: 'nowrap', zIndex: 12, backgroundColor: '#FAFBFC' }}>Lead Number</th>
                            <th style={{ height: '40px', top: 0, whiteSpace: 'nowrap', zIndex: 12, backgroundColor: '#FAFBFC' }}>Customer Name</th>
                            <th style={{ height: '40px', top: 0, whiteSpace: 'nowrap', zIndex: 12, backgroundColor: '#FAFBFC' }}>Project Name</th>
                            <th style={{ height: '40px', top: 0, whiteSpace: 'nowrap', zIndex: 12, backgroundColor: '#FAFBFC' }}>Cost Sheet No.</th>
                            <th style={{ height: '40px', top: 0, whiteSpace: 'nowrap', zIndex: 12, backgroundColor: '#FAFBFC' }}>Date</th>
                            <th style={{ height: '40px', top: 0, whiteSpace: 'nowrap', zIndex: 12, backgroundColor: '#FAFBFC' }}>Status</th>
                            <th style={{ height: '40px', textAlign: 'right', top: 0, whiteSpace: 'nowrap', zIndex: 12, minWidth: '120px', backgroundColor: '#FAFBFC' }}>Total Price</th>
                            <th style={{ height: '40px', textAlign: 'center', top: 0, whiteSpace: 'nowrap', zIndex: 12, width: '100px', backgroundColor: '#FAFBFC' }}>Actions</th>
                        </tr>
                        {/* Filter Row */}
                        <tr style={{ background: '#F7FAFC' }}>
                            <th style={{ top: '40px', zIndex: 11, backgroundColor: '#F7FAFC' }}>
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
                            </th>
                            <th style={{ top: '40px', zIndex: 11, backgroundColor: '#F7FAFC' }}>
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
                            </th>
                            <th style={{ top: '40px', zIndex: 11, backgroundColor: '#F7FAFC' }}>
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
                            </th>
                            <th style={{ top: '40px', zIndex: 11, backgroundColor: '#F7FAFC' }}>
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
                            </th>
                            <th style={{ top: '40px', zIndex: 11, backgroundColor: '#F7FAFC' }}>
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
                            </th>
                            <th style={{ padding: '6px 8px', top: '40px', zIndex: 11, backgroundColor: '#F7FAFC' }}></th>
                            <th style={{ padding: '6px 8px', top: '40px', zIndex: 11, backgroundColor: '#F7FAFC' }}></th>
                            <th style={{ textAlign: 'center', top: '40px', position: 'sticky', right: 0, backgroundColor: '#F7FAFC', zIndex: 12 }}>
                                <button
                                    onClick={() => setFilters({ csNumber: '', leadNo: '', customerName: '', projectName: '', status: '', period: '', startDate: '', endDate: '' })}
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
                                    Preview
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: '100px' }}><RefreshCw className="animate-spin" style={{ margin: '0 auto' }} /></td></tr>
                        ) : filteredCostSheets.length === 0 ? (
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
                                    <tr key={cs.id}>
                                        <td style={{ fontWeight: 600, color: '#718096', fontSize: '0.8rem' }}>
                                            {cs.lead_no}
                                        </td>
                                        <td style={{ color: '#4A5568', fontWeight: 500 }}>
                                            {cs.customer_name || '—'}
                                        </td>
                                        <td style={{ color: '#2D3748', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={cs.project_name || '—'}>
                                            {cs.project_name || '—'}
                                        </td>
                                        <td style={{ fontWeight: 700, color: '#FF6B00', fontFamily: 'monospace' }}>
                                            {cs.cost_sheet_no}
                                        </td>
                                        <td style={{ color: '#4A5568', fontWeight: 600 }}>
                                            {cs.cost_sheet_date ? new Date(cs.cost_sheet_date).toLocaleDateString() : new Date(cs.created_at).toLocaleDateString()}
                                        </td>
                                        <td>
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
                                        </td>
                                        <td style={{ fontWeight: 700, color: '#1a1f36', textAlign: 'right' }}>
                                            ${parseFloat(cs.total_estimated_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
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
                                            >
                                                <Eye size={14} /> View
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
