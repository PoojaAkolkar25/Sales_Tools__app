import React, { useEffect, useState, useMemo } from 'react';
<<<<<<< HEAD
import { Eye, Search, Calendar, FileSpreadsheet, RefreshCw } from 'lucide-react';
=======
import { Eye, Search, Calendar } from 'lucide-react';
>>>>>>> 4846736be912594f6da7d7e0182cf99c8a2fc7f6
import api from '../api';

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

const CostSheetDashboard: React.FC<{ onView: (id: number) => void }> = ({ onView }) => {
    const [costSheets, setCostSheets] = useState<CostSheet[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter States
    const [filters, setFilters] = useState({
        csNumber: '',
        leadNo: '',
        customerName: '',
        projectName: '',
        status: '',
        date: ''
    });

    useEffect(() => {
        const fetchCostSheets = async () => {
            try {
                const response = await api.get('/cost-sheets/');
                setCostSheets(response.data);
            } catch (error) {
                console.error('Error fetching cost sheets', error);
            } finally {
                setLoading(false);
            }
        };
        fetchCostSheets();
    }, []);

    const filteredCostSheets = useMemo(() => {
        return costSheets.filter(cs => {
            const matchesCs = (cs.cost_sheet_no || '').toLowerCase().includes(filters.csNumber.toLowerCase());
            const matchesLead = (cs.lead_no || '').toLowerCase().includes(filters.leadNo.toLowerCase());
            const matchesCustomer = (cs.customer_name || '').toLowerCase().includes(filters.customerName.toLowerCase());
            const matchesProject = (cs.project_name || '').toLowerCase().includes(filters.projectName.toLowerCase());
            const matchesStatus = filters.status === '' || cs.status === filters.status;
            const matchesDate = filters.date === '' || new Date(cs.created_at).toLocaleDateString() === new Date(filters.date).toLocaleDateString();

            return matchesCs && matchesLead && matchesCustomer && matchesProject && matchesStatus && matchesDate;
        });
    }, [costSheets, filters]);

    const statusFlow = [
<<<<<<< HEAD
        { label: 'All', value: '', color: '#718096' },
        { label: 'Draft', value: 'PENDING', color: '#718096' },
        { label: 'Pending', value: 'SUBMITTED', color: '#FF6B00' },
        { label: 'Approved', value: 'APPROVED', color: '#00C853' },
        { label: 'Rejected', value: 'REJECTED', color: '#E53E3E' }
    ];

    const getStatusBadge = (status: string) => {
        const statusMap: { [key: string]: { bg: string; color: string; label: string } } = {
            'PENDING': { bg: 'rgba(113, 128, 150, 0.1)', color: '#718096', label: 'Draft' },
            'SUBMITTED': { bg: 'rgba(255, 107, 0, 0.1)', color: '#FF6B00', label: 'Pending' },
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Hero Header */}
            <div className="ae-hero" style={{ padding: '24px 32px', maxWidth: '100%' }}>
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: 'rgba(255, 107, 0, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <FileSpreadsheet size={24} color="#FF6B00" />
                        </div>
                        <div>
                            <h1 style={{
                                fontSize: '1.5rem',
                                fontWeight: 800,
                                color: '#FF6B00',
                                margin: 0,
                                textTransform: 'uppercase',
                                letterSpacing: '-0.02em'
                            }}>
                                Cost Sheet
                            </h1>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                                Manage and track all cost estimations
                            </p>
                        </div>
                    </div>

                    {/* Stats with separators */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                        <div style={{ textAlign: 'center', padding: '0 24px' }}>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>{costSheets.length}</div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Total</div>
                        </div>
                        <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.15)' }}></div>
                        <div style={{ textAlign: 'center', padding: '0 24px' }}>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#00C853' }}>
                                {costSheets.filter(cs => cs.status === 'APPROVED').length}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Approved</div>
                        </div>
                        <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.15)' }}></div>
                        <div style={{ textAlign: 'center', padding: '0 24px' }}>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FF6B00' }}>
                                {costSheets.filter(cs => cs.status === 'SUBMITTED').length}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Pending</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Flow Navigation */}
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
=======
        { label: 'All', value: '' },
        { label: 'Draft', value: 'PENDING' },
        { label: 'Pending', value: 'SUBMITTED' },
        { label: 'Approved', value: 'APPROVED' },
        { label: 'Rejected', value: 'REJECTED' }
    ];

    if (loading) return <div className="text-center p-20 text-[#718096] font-medium">Loading cost sheets...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-extrabold text-[#1a1f36]">Cost Sheet Dashboard</h2>
            </div>

            {/* Status Flow Navigation */}
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-[#E0E6ED] w-fit">
>>>>>>> 4846736be912594f6da7d7e0182cf99c8a2fc7f6
                {statusFlow.map((flow, index) => (
                    <React.Fragment key={flow.value}>
                        <button
                            onClick={() => setFilters({ ...filters, status: flow.value })}
<<<<<<< HEAD
                            style={{
                                padding: '8px 20px',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: filters.status === flow.value ? '#FF6B00' : 'transparent',
                                color: filters.status === flow.value ? 'white' : '#718096',
                                boxShadow: filters.status === flow.value ? '0 2px 8px rgba(255, 107, 0, 0.3)' : 'none'
                            }}
=======
                            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${filters.status === flow.value
                                ? 'bg-[#0066CC] text-white shadow-md'
                                : 'text-[#718096] hover:bg-[#F5F7FA] hover:text-[#2D3748]'
                                }`}
>>>>>>> 4846736be912594f6da7d7e0182cf99c8a2fc7f6
                        >
                            {flow.label}
                        </button>
                        {index < statusFlow.length - 1 && (
<<<<<<< HEAD
                            <span style={{ color: '#CBD5E0', fontSize: '12px' }}>›</span>
=======
                            <span className="text-[#A0AEC0] font-bold mx-2">{'>>'}</span>
>>>>>>> 4846736be912594f6da7d7e0182cf99c8a2fc7f6
                        )}
                    </React.Fragment>
                ))}
            </div>

<<<<<<< HEAD
            {/* Table Container */}
            <div className="ae-table-container">
                <table className="ae-table">
                    <thead>
                        <tr>
                            <th style={{ width: '14%' }}>Lead Number</th>
                            <th style={{ width: '18%' }}>Customer Name</th>
                            <th style={{ width: '18%' }}>Project Name</th>
                            <th style={{ width: '12%' }}>Cost Sheet No.</th>
                            <th style={{ width: '10%' }}>Date</th>
                            <th style={{ width: '10%' }}>Status</th>
                            <th style={{ width: '12%' }}>Total Price</th>
                            <th style={{ width: '6%', textAlign: 'right' }}>Actions</th>
                        </tr>
                        {/* Filter Row */}
                        <tr style={{ background: '#F7FAFC' }}>
                            <th style={{ padding: '8px' }}>
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
                            <th style={{ padding: '8px' }}>
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
                            <th style={{ padding: '8px' }}>
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
                            <th style={{ padding: '8px' }}>
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
                            <th style={{ padding: '8px' }}>
                                <div className="ae-input-group">
                                    <Calendar className="ae-search-icon" size={12} />
                                    <input
                                        type="date"
                                        className="ae-input"
                                        value={filters.date}
                                        onChange={e => setFilters({ ...filters, date: e.target.value })}
                                        style={{ height: '32px', fontSize: '11px' }}
                                    />
                                </div>
                            </th>
                            <th style={{ padding: '8px' }}></th>
                            <th style={{ padding: '8px' }}></th>
                            <th style={{ padding: '8px', textAlign: 'right' }}>
                                <button
                                    onClick={() => setFilters({ csNumber: '', leadNo: '', customerName: '', projectName: '', status: '', date: '' })}
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
=======
            <div className="bg-white rounded-xl shadow-sm border border-[#E0E6ED] overflow-hidden">
                <table className="w-full text-left table-fixed">
                    <thead className="bg-[#FAFBFC] border-b border-[#E0E6ED] uppercase text-[10px] font-bold tracking-widest text-[#718096]">
                        <tr>
                            <th className="py-4 px-4 w-[16%]">Lead Number</th>
                            <th className="py-2 px-4 w-[20%]">Customer Name</th>
                            <th className="py-4 px-4 w-[20%]">Project Name</th>
                            <th className="py-4 px-4 w-[12%]">Cost Sheet No.</th>
                            <th className="py-4 px-4 w-[12%]">Cost Sheet Date</th>
                            <th className="py-4 px-4 w-[14%]">Total Price</th>
                            <th className="py-4 px-4 w-[6%] text-right">Actions</th>
                        </tr>
                        <tr className="bg-[#F5F7FA]/50 border-b border-[#E0E6ED]">
                            <th className="py-2 px-2">
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-[#A0AEC0]" size={12} />
                                    <input
                                        className="bg-white border-[#E0E6ED] pl-7 text-[10px] py-1 h-8 w-full focus:ring-2 focus:ring-[#0066CC]/10 focus:border-[#0066CC] transition-all"
                                        placeholder="Filter..."
                                        value={filters.leadNo}
                                        onChange={e => setFilters({ ...filters, leadNo: e.target.value })}
                                    />
                                </div>
                            </th>
                            <th className="py-2 px-2">
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-[#A0AEC0]" size={12} />
                                    <input
                                        className="bg-white border-[#E0E6ED] pl-7 text-[10px] py-1 h-8 w-full focus:ring-2 focus:ring-[#0066CC]/10 focus:border-[#0066CC] transition-all"
                                        placeholder="Filter..."
                                        value={filters.customerName}
                                        onChange={e => setFilters({ ...filters, customerName: e.target.value })}
                                    />
                                </div>
                            </th>
                            <th className="py-2 px-2">
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-[#A0AEC0]" size={12} />
                                    <input
                                        className="bg-white border-[#E0E6ED] pl-7 text-[10px] py-1 h-8 w-full focus:ring-2 focus:ring-[#0066CC]/10 focus:border-[#0066CC] transition-all"
                                        placeholder="Filter..."
                                        value={filters.projectName}
                                        onChange={e => setFilters({ ...filters, projectName: e.target.value })}
                                    />
                                </div>
                            </th>
                            <th className="py-2 px-2">
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-[#A0AEC0]" size={12} />
                                    <input
                                        className="bg-white border-[#E0E6ED] pl-7 text-[10px] py-1 h-8 w-full focus:ring-2 focus:ring-[#0066CC]/10 focus:border-[#0066CC] transition-all"
                                        placeholder="Filter..."
                                        value={filters.csNumber}
                                        onChange={e => setFilters({ ...filters, csNumber: e.target.value })}
                                    />
                                </div>
                            </th>
                            <th className="py-2 px-2">
                                <div className="relative">
                                    <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 text-[#A0AEC0]" size={12} />
                                    <input
                                        type="date"
                                        className="bg-white border-[#E0E6ED] pl-7 text-[10px] py-1 h-8 w-full focus:ring-2 focus:ring-[#0066CC]/10 focus:border-[#0066CC]"
                                        value={filters.date}
                                        onChange={e => setFilters({ ...filters, date: e.target.value })}
                                    />
                                </div>
                            </th>
                            <th className="py-2 px-2">
                                <div className="h-8"></div>
                            </th>
                            <th className="py-2 px-4 text-right">
                                <button
                                    onClick={() => setFilters({ csNumber: '', leadNo: '', customerName: '', projectName: '', status: '', date: '' })}
                                    className="text-[9px] text-[#0066CC] hover:text-[#0052CC] font-bold uppercase tracking-tight"
>>>>>>> 4846736be912594f6da7d7e0182cf99c8a2fc7f6
                                >
                                    Reset
                                </button>
                            </th>
                        </tr>
                    </thead>
<<<<<<< HEAD
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
                                        <td style={{ color: '#718096', fontSize: '12px' }}>
                                            {cs.project_name || '—'}
                                        </td>
                                        <td style={{ fontWeight: 700, color: '#FF6B00', fontFamily: 'monospace', fontSize: '12px' }}>
                                            {cs.cost_sheet_no}
                                        </td>
                                        <td style={{ color: '#4A5568', fontSize: '12px', fontWeight: 500 }}>
                                            {new Date(cs.created_at).toLocaleDateString()}
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
=======
                    <tbody className="divide-y divide-[#E0E6ED]">
                        {filteredCostSheets.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="py-20 text-center text-[#718096] font-medium">
                                    {costSheets.length === 0 ? 'No cost sheets found.' : 'No results matching your filters.'}
                                </td>
                            </tr>
                        ) : (
                            filteredCostSheets.map((cs) => (
                                <tr key={cs.id} className="hover:bg-[#F5F7FA]/50 transition-colors group">
                                    <td className="py-4 px-4 font-bold text-[#4A5568] font-mono text-[11px] truncate whitespace-nowrap overflow-hidden" title={cs.lead_no}>{cs.lead_no}</td>
                                    <td className="py-4 px-4 text-[#2D3748] text-[12px] font-medium truncate whitespace-nowrap overflow-hidden" title={cs.customer_name}>{cs.customer_name || '—'}</td>
                                    <td className="py-4 px-4 text-[#718096] text-[12px] truncate whitespace-nowrap overflow-hidden" title={cs.project_name}>{cs.project_name || '—'}</td>
                                    <td className="py-4 px-4 font-bold text-[#0066CC] font-mono text-[11px] truncate whitespace-nowrap overflow-hidden" title={cs.cost_sheet_no}>{cs.cost_sheet_no}</td>
                                    <td className="py-4 px-4 text-[#4A5568] text-[11px] font-medium whitespace-nowrap">
                                        {new Date(cs.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="py-4 px-4 font-bold text-[#2D3748] font-mono text-[11px] whitespace-nowrap">${parseFloat(cs.total_estimated_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className="py-4 px-4 text-right">
                                        <button
                                            onClick={() => onView(cs.id)}
                                            className="p-1.5 text-[#A0AEC0] hover:text-[#0066CC] transition-all hover:scale-110"
                                            title="View Details"
                                        >
                                            <Eye size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
>>>>>>> 4846736be912594f6da7d7e0182cf99c8a2fc7f6
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CostSheetDashboard;
