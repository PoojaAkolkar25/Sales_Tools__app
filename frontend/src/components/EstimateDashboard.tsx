import React, { useState, useEffect, useMemo } from 'react';
import {
    Search,
    RefreshCcw,
    FileText,
    Clock,
    CheckCircle2,
    History,
    Upload
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';

interface Estimate {
    id: number;
    estimate_id: string;
    version: number;
    status: string;
    total_price: string;
    customer_name: string;
    project_name: string;
    deal_id: string;
    cost_sheet_no: string;
    created_at: string;
    is_latest: boolean;
}

interface EstimateDashboardProps {
    onView: (id: number) => void;
}

const EstimateDashboard: React.FC<EstimateDashboardProps> = ({ onView }) => {
    const { showNotification } = useNotification();
    const [estimates, setEstimates] = useState<Estimate[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: '',
        status: 'all',
        showOnlyLatest: true
    });

    useEffect(() => {
        fetchEstimates();
    }, []);

    const fetchEstimates = async () => {
        setLoading(true);
        try {
            const response = await api.get('/estimates/');
            setEstimates(response.data);
        } catch (error) {
            console.error('Error fetching estimates', error);
            showNotification('Error fetching estimates', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filteredEstimates = useMemo(() => {
        return estimates.filter(est => {
            const matchesSearch =
                est.estimate_id.toLowerCase().includes(filters.search.toLowerCase()) ||
                (est.customer_name || '').toLowerCase().includes(filters.search.toLowerCase()) ||
                (est.project_name || '').toLowerCase().includes(filters.search.toLowerCase());

            const matchesStatus = filters.status === 'all' || est.status === filters.status;
            const matchesLatest = !filters.showOnlyLatest || est.is_latest;

            return matchesSearch && matchesStatus && matchesLatest;
        });
    }, [estimates, filters]);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'DRAFT': return { bg: '#F7FAFC', text: '#4A5568' };
            case 'SUBMITTED': return { bg: '#EBF8FF', text: '#3182CE' };
            case 'NEGOTIATION': return { bg: '#FFF9F5', text: '#FF6B00' };
            case 'APPROVED': return { bg: '#E6FFFA', text: '#38A169' };
            case 'REJECTED': return { bg: '#FFF5F5', text: '#E53E3E' };
            default: return { bg: '#F7FAFC', text: '#4A5568' };
        }
    };

    return (
        <div className="space-y-6">
            {/* KPI Section */}
            <div className="ae-grid-4">
                <div className="ae-card">
                    <div className="ae-card-header">
                        <div className="ae-icon-box bg-blue-soft"><FileText size={20} /></div>
                    </div>
                    <div className="ae-card-label">Total Estimates</div>
                    <div className="ae-card-value">{estimates.filter(e => e.is_latest).length}</div>
                </div>
                <div className="ae-card">
                    <div className="ae-card-header">
                        <div className="ae-icon-box bg-orange-soft"><History size={20} /></div>
                    </div>
                    <div className="ae-card-label">Under Negotiation</div>
                    <div className="ae-card-value">{estimates.filter(e => e.status === 'NEGOTIATION' && e.is_latest).length}</div>
                </div>
                <div className="ae-card">
                    <div className="ae-card-header">
                        <div className="ae-icon-box bg-green-soft"><CheckCircle2 size={20} /></div>
                    </div>
                    <div className="ae-card-label">Approved</div>
                    <div className="ae-card-value">{estimates.filter(e => e.status === 'APPROVED' && e.is_latest).length}</div>
                </div>
                <div className="ae-card">
                    <div className="ae-card-header">
                        <div className="ae-icon-box bg-purple-soft"><Clock size={20} /></div>
                    </div>
                    <div className="ae-card-label">Pending Approval</div>
                    <div className="ae-card-value">{estimates.filter(e => e.status === 'SUBMITTED' && e.is_latest).length}</div>
                </div>
            </div>

            {/* Filters bar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'white',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #E0E6ED'
            }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className="ae-input-group" style={{ width: '300px' }}>
                        <span className="ae-search-icon"><Search size={18} /></span>
                        <input
                            type="text"
                            className="ae-input"
                            placeholder="Search ID, Customer, Project..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>
                    <select
                        className="ae-input"
                        style={{ width: '180px' }}
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    >
                        <option value="all">All Statuses</option>
                        <option value="DRAFT">Draft</option>
                        <option value="SUBMITTED">Submitted</option>
                        <option value="NEGOTIATION">Negotiation</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#4A5568', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={filters.showOnlyLatest}
                            onChange={(e) => setFilters({ ...filters, showOnlyLatest: e.target.checked })}
                        />
                        Show only latest versions
                    </label>
                </div>
                <button
                    className="ae-btn-secondary"
                    onClick={fetchEstimates}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <RefreshCcw size={16} /> Refresh
                </button>
            </div>

            {/* Table */}
            <div className="ae-table-container">
                <table className="ae-table">
                    <thead>
                        <tr>
                            <th>Est. ID</th>
                            <th>Version</th>
                            <th>Customer</th>
                            <th>Project</th>
                            <th>Total Value</th>
                            <th>Status</th>
                            <th>Proposal</th>
                            <th>Date</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={9} style={{ textAlign: 'center', padding: '80px' }}><RefreshCcw className="animate-spin mx-auto" /></td></tr>
                        ) : filteredEstimates.length === 0 ? (
                            <tr><td colSpan={9} style={{ textAlign: 'center', padding: '80px', color: '#718096' }}>No estimates found.</td></tr>
                        ) : (
                            filteredEstimates.map(est => {
                                const style = getStatusStyle(est.status);
                                const hasProposal = (est as any).proposals?.length > 0;
                                return (
                                    <tr key={est.id}>
                                        <td style={{ fontWeight: 700, color: '#0066CC' }}>{est.estimate_id}</td>
                                        <td>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                background: '#EDF2F7',
                                                fontSize: '0.7rem',
                                                fontWeight: 800
                                            }}>v{est.version}</span>
                                            {!est.is_latest && <span style={{ marginLeft: '4px', color: '#A0AEC0', fontSize: '0.65rem' }}>(Old)</span>}
                                        </td>
                                        <td style={{ fontWeight: 500 }}>{est.customer_name}</td>
                                        <td style={{ color: '#4A5568' }}>{est.project_name}</td>
                                        <td style={{ fontWeight: 700 }}>
                                            ${parseFloat(est.total_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '99px',
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                background: style.bg,
                                                color: style.text
                                            }}>{est.status}</span>
                                        </td>
                                        <td>
                                            {hasProposal ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#38A169', fontSize: '0.75rem', fontWeight: 600 }}>
                                                    <CheckCircle2 size={14} /> Attached
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => onView(est.id)}
                                                    style={{
                                                        padding: '4px 10px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.7rem',
                                                        fontWeight: 700,
                                                        background: '#FFF5F5',
                                                        color: '#E53E3E',
                                                        border: '1px solid #E53E3E',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        animation: 'pulse 2s infinite'
                                                    }}
                                                >
                                                    <Upload size={14} /> Attach Proposal
                                                </button>
                                            )}
                                        </td>
                                        <td style={{ color: '#718096', fontSize: '0.75rem' }}>
                                            {new Date(est.created_at).toLocaleDateString()}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button
                                                className="ae-btn-secondary"
                                                onClick={() => onView(est.id)}
                                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                            >
                                                View & Manage
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

export default EstimateDashboard;
