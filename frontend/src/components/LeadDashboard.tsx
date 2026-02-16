import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    TrendingUp,
    Users,
    Loader2,
    Filter,
    Search
} from 'lucide-react';

import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { formatToAppDate } from '../utils/dateUtils';
import Pagination from './Pagination';

interface Lead {
    id: number;
    lead_no: string;
    company: string;
    customer_name: string;
    project_name: string;
    project_manager: string;
    sales_person: string;
    email: string;
    lead_date: string;
    created_at: string;
    deal_id: number | null;
    deal_no: string | null;
}

interface LeadDashboardProps {
    onView: (id: number) => void;
}

const LeadDashboard: React.FC<LeadDashboardProps> = ({ onView }) => {
    const navigate = useNavigate();


    const { showNotification } = useNotification();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total_leads: 0,
        new_today: 0,
        usa_leads: 0,
        ind_leads: 0
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        lead_no: '',
        company: '',
        customer_name: '',
        project_name: '',
        sales_person: ''
    });
    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const response = await api.get('/leads/');
            setLeads(response.data);

            const today = new Date().toISOString().split('T')[0];
            const newToday = response.data.filter((l: Lead) => l.created_at.startsWith(today)).length;
            const usa = response.data.filter((l: Lead) => l.company === 'AE USA').length;
            const ind = response.data.filter((l: Lead) => l.company === 'AE IND').length;

            setStats({
                total_leads: response.data.length,
                new_today: newToday,
                usa_leads: usa,
                ind_leads: ind
            });
        } catch (error) {
            console.error('Error fetching leads', error);
            showNotification('Error fetching leads', 'error');
        } finally {
            setLoading(false);
        }
    };


    const filteredLeads = leads.filter((lead: Lead) => {
        const matchesLeadNo = (lead.lead_no || '').toLowerCase().includes(filters.lead_no.toLowerCase());
        const matchesCompany = (lead.company || '').toLowerCase().includes(filters.company.toLowerCase());
        const matchesCustomer = (lead.customer_name || '').toLowerCase().includes(filters.customer_name.toLowerCase());
        const matchesProject = (lead.project_name || '').toLowerCase().includes(filters.project_name.toLowerCase());
        const matchesSalesPerson = (lead.sales_person || '').toLowerCase().includes(filters.sales_person.toLowerCase());

        return matchesLeadNo && matchesCompany && matchesCustomer && matchesProject && matchesSalesPerson;
    });

    const paginatedLeads = filteredLeads.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );


    return (
        <div className="space-y-6">
            <div className="ae-grid-4">
                <div className="ae-card ae-card-sm">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div className="ae-card-label">Total Leads</div>
                            <div className="ae-card-value">{stats.total_leads}</div>
                        </div>
                        <div className="ae-icon-box" style={{ background: 'rgba(0, 102, 204, 0.05)', color: 'var(--ae-blue)' }}><Users size={16} /></div>
                    </div>
                </div>
                <div className="ae-card ae-card-sm">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div className="ae-card-label">New Today</div>
                            <div className="ae-card-value">{stats.new_today}</div>
                        </div>
                        <div className="ae-icon-box" style={{ background: 'rgba(0, 200, 83, 0.05)', color: 'var(--ae-green)' }}><TrendingUp size={16} /></div>
                    </div>
                </div>
                <div className="ae-card ae-card-sm">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div className="ae-card-label">AE IND Leads</div>
                            <div className="ae-card-value">{stats.ind_leads}</div>
                        </div>
                        <div className="ae-icon-box" style={{ background: 'rgba(187, 77, 0, 0.05)', color: 'var(--ae-orange)' }}><LayoutDashboard size={16} /></div>
                    </div>
                </div>
                <div className="ae-card ae-card-sm">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div className="ae-card-label">AE USA Leads</div>
                            <div className="ae-card-value">{stats.usa_leads}</div>
                        </div>
                        <div className="ae-icon-box" style={{ background: 'rgba(105, 30, 6, 0.05)', color: 'var(--ae-navy)' }}><LayoutDashboard size={16} /></div>
                    </div>
                </div>
            </div>


            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center', marginBottom: '-20px', position: 'relative', zIndex: 10 }}>
                <button
                    className="ae-btn-secondary"
                    onClick={() => setShowFilters(!showFilters)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 14px',
                        fontSize: '0.8rem',
                        height: '32px',
                        borderRadius: '8px',
                        background: showFilters ? 'var(--bg-accent)' : 'white',
                        color: showFilters ? 'var(--theme-primary)' : 'var(--ae-gray-800)',
                        borderColor: showFilters ? 'var(--theme-primary)' : 'var(--ae-gray-100)',
                        fontWeight: 700,
                        cursor: 'pointer'
                    }}
                    title={showFilters ? "Hide Filters" : "Show Filters"}
                >
                    <Filter size={16} /> Filters
                </button>
            </div>

            <div className="ae-table-container" style={{
                marginTop: '32px',
                margin: '32px auto 60px auto',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                maxHeight: 'none',
                overflowY: 'visible'
            }}>

                <table className="ae-table">
                    <thead>
                        <tr>
                            <th style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>Lead ID</th>
                            <th style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>Deal Link</th>
                            <th style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>Company</th>
                            <th style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>Customer Name</th>
                            <th style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>Project Name</th>
                            <th style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>Sales Person</th>
                            <th style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>Created Date</th>
                            <th style={{ textAlign: 'right', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>Actions</th>
                        </tr>
                        {showFilters && (
                            <tr style={{ background: '#F7FAFC' }}>
                                <th style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                    <div className="ae-input-group">
                                        <Search className="ae-search-icon" size={12} />
                                        <input
                                            className="ae-input"
                                            placeholder="Filter..."
                                            value={filters.lead_no}
                                            onChange={e => setFilters({ ...filters, lead_no: e.target.value })}
                                            style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                        />
                                    </div>
                                </th>
                                <th style={{ backgroundColor: 'var(--bg-secondary)' }}></th>
                                <th style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                    <div className="ae-input-group">
                                        <Search className="ae-search-icon" size={12} />
                                        <input
                                            className="ae-input"
                                            placeholder="Filter..."
                                            value={filters.company}
                                            onChange={e => setFilters({ ...filters, company: e.target.value })}
                                            style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                        />
                                    </div>
                                </th>
                                <th style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                    <div className="ae-input-group">
                                        <Search className="ae-search-icon" size={12} />
                                        <input
                                            className="ae-input"
                                            placeholder="Filter..."
                                            value={filters.customer_name}
                                            onChange={e => setFilters({ ...filters, customer_name: e.target.value })}
                                            style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                        />
                                    </div>
                                </th>
                                <th style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                    <div className="ae-input-group">
                                        <Search className="ae-search-icon" size={12} />
                                        <input
                                            className="ae-input"
                                            placeholder="Filter..."
                                            value={filters.project_name}
                                            onChange={e => setFilters({ ...filters, project_name: e.target.value })}
                                            style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                        />
                                    </div>
                                </th>
                                <th style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                    <div className="ae-input-group">
                                        <Search className="ae-search-icon" size={12} />
                                        <input
                                            className="ae-input"
                                            placeholder="Filter..."
                                            value={filters.sales_person}
                                            onChange={e => setFilters({ ...filters, sales_person: e.target.value })}
                                            style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                        />
                                    </div>
                                </th>
                                <th style={{ backgroundColor: 'var(--bg-secondary)' }}></th>
                                <th style={{ textAlign: 'center', backgroundColor: 'var(--bg-secondary)' }}>
                                    <button
                                        onClick={() => setFilters({
                                            lead_no: '', company: '', customer_name: '', project_name: '', sales_person: ''
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
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '100px' }}>
                                    <Loader2 className="animate-spin" style={{ margin: '0 auto' }} />
                                </td>
                            </tr>
                        ) : paginatedLeads.length === 0 ? (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '100px', color: 'var(--text-secondary)' }}>
                                    No leads found.
                                </td>
                            </tr>
                        ) : (
                            paginatedLeads.map((lead: Lead) => (
                                <tr key={lead.id}>

                                    <td
                                        onClick={() => onView(lead.id)}
                                        style={{ fontWeight: 700, color: 'var(--theme-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                                    >
                                        {lead.lead_no}
                                    </td>
                                    <td>
                                        {lead.deal_id ? (
                                            <span
                                                onClick={() => navigate(`/deal?id=${lead.deal_id}`)}
                                                style={{ fontWeight: 700, color: 'var(--theme-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                                            >
                                                {lead.deal_no}
                                            </span>
                                        ) : (
                                            <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.75rem' }}>No Deal</span>
                                        )}
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 600, background: '#EDF2F7', padding: '2px 6px', borderRadius: '4px' }}>
                                            {lead.company}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 700 }}>{lead.customer_name}</td>
                                    <td>{lead.project_name}</td>
                                    <td>{lead.sales_person || '—'}</td>
                                    <td>{formatToAppDate(lead.lead_date || lead.created_at)}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button
                                            onClick={() => onView(lead.id)}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '6px 12px',
                                                background: 'var(--ae-blue)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.background = 'var(--theme-primary)'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'var(--ae-blue)'}
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Pagination
                currentPage={currentPage}
                totalItems={filteredLeads.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
            />
        </div >
    );
};

export default LeadDashboard;
