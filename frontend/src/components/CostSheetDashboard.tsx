import React, { useEffect, useState, useMemo } from 'react';
import { Eye, Search, Calendar, FileSpreadsheet, RefreshCw } from 'lucide-react';
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
                                color: filters.status === flow.value ? 'white' : '#718096',
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
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CostSheetDashboard;
