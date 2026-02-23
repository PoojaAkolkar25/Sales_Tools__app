import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    TrendingUp,
    Users,
    Loader2,
    Search,
    ChevronLeft,
    ChevronRight,
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

const ALL_COLUMNS = [
    { key: 'lead_no', label: 'Lead ID', shortLabel: 'ID' },
    { key: 'deal_no', label: 'Deal Link', shortLabel: 'DEAL' },
    { key: 'company', label: 'Company', shortLabel: 'CO.' },
    { key: 'customer_name', label: 'Customer Name', shortLabel: 'CUST.' },
    { key: 'project_name', label: 'Project Name', shortLabel: 'PROJ.' },
    { key: 'sales_person', label: 'Sales Person', shortLabel: 'SALES' },
    { key: 'project_manager', label: 'Project Manager', shortLabel: 'PM' },
    { key: 'email', label: 'Email Address', shortLabel: 'EMAIL' },
    { key: 'lead_date', label: 'Created Date', shortLabel: 'DATE' },
];

const SHORT_COL_WIDTHS: Record<string, number> = {
    lead_no: 40,
    deal_no: 50,
    company: 40,
    customer_name: 75,
    project_name: 75,
    sales_person: 75,
    project_manager: 75,
    email: 75,
    lead_date: 65
};

const FULL_LABEL_WIDTHS: Record<string, number> = {
    lead_no: 65,
    deal_no: 90,
    company: 75,
    customer_name: 120,
    project_name: 120,
    sales_person: 110,
    project_manager: 130,
    email: 160,
    lead_date: 100
};

const MAX_COL_WIDTHS: Record<string, number> = {
    lead_no: 100,
    deal_no: 150,
    company: 120,
    customer_name: 300,
    project_name: 300,
    sales_person: 200,
    project_manager: 250,
    email: 300,
    lead_date: 150
};

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
    const [showFilters] = useState(true);
    const [filters, setFilters] = useState({
        lead_no: '',
        deal_no: '',
        company: '',
        customer_name: '',
        project_name: '',
        sales_person: '',
        project_manager: '',
        email: '',
        lead_date: ''
    });
    const ITEMS_PER_PAGE = 20;

    const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
        const saved = localStorage.getItem('leadDashboard_colWidths');
        if (saved) return JSON.parse(saved);
        const defaults: Record<string, number> = {};
        ALL_COLUMNS.forEach(c => { defaults[c.key] = FULL_LABEL_WIDTHS[c.key] || 150; });
        return defaults;
    });

    useEffect(() => {
        localStorage.setItem('leadDashboard_colWidths', JSON.stringify(colWidths));
    }, [colWidths]);

    const resizingRef = useRef<{ colKey: string; startWidth: number; startX: number } | null>(null);
    const tableScrollRef = useRef<HTMLDivElement>(null);

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
            const minWidth = SHORT_COL_WIDTHS[key] ?? 50;
            const maxWidth = MAX_COL_WIDTHS[key] ?? 400;
            const newWidth = Math.min(maxWidth, Math.max(minWidth, resizingRef.current.startWidth + delta));
            setColWidths(prev => ({ ...prev, [key]: newWidth }));
        };

        const onMouseUp = () => {
            resizingRef.current = null;
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = 'default';
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'col-resize';
    };

    const getColWidth = (key: string) => colWidths[key] || 100;

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
        const matchesDealNo = (lead.deal_no || '').toLowerCase().includes(filters.deal_no.toLowerCase());
        const matchesCompany = (lead.company || '').toLowerCase().includes(filters.company.toLowerCase());
        const matchesCustomer = (lead.customer_name || '').toLowerCase().includes(filters.customer_name.toLowerCase());
        const matchesProject = (lead.project_name || '').toLowerCase().includes(filters.project_name.toLowerCase());
        const matchesSalesPerson = (lead.sales_person || '').toLowerCase().includes(filters.sales_person.toLowerCase());
        const matchesPM = (lead.project_manager || '').toLowerCase().includes(filters.project_manager.toLowerCase());
        const matchesEmail = (lead.email || '').toLowerCase().includes(filters.email.toLowerCase());
        const matchesLeadDate = formatToAppDate(lead.lead_date || lead.created_at).toLowerCase().includes(filters.lead_date.toLowerCase());

        return matchesLeadNo && matchesDealNo && matchesCompany && matchesCustomer && matchesProject && matchesSalesPerson && matchesPM && matchesEmail && matchesLeadDate;
    });

    const paginatedLeads = useMemo(() => {
        return filteredLeads.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        );
    }, [filteredLeads, currentPage]);

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

            <div style={{
                marginTop: '32px',
                margin: '32px auto 60px auto',
                position: 'relative'
            }}>
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

                <div ref={tableScrollRef} style={{ overflowX: 'auto', background: 'var(--bg-primary)', borderRadius: '0', border: '1px solid var(--border-primary)' }}>
                    <table className="ae-table" style={{ tableLayout: 'fixed', width: 'max-content' }}>
                        <colgroup>
                            {ALL_COLUMNS.map(col => (
                                <col key={col.key} style={{ width: `${getColWidth(col.key)}px` }} />
                            ))}
                            <col style={{ width: '100px' }} />
                        </colgroup>
                        <thead>
                            <tr>
                                {ALL_COLUMNS.map(col => (
                                    <th key={col.key} style={{
                                        backgroundColor: 'var(--ae-table-header-bg)',
                                        position: 'relative',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        userSelect: 'none',
                                        paddingRight: '20px',
                                        borderRight: '1px solid var(--border-secondary)',
                                        borderBottom: '1px solid var(--border-secondary)'
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
                                <th style={{ backgroundColor: 'var(--ae-table-header-bg)', textAlign: 'right', borderBottom: '1px solid var(--border-secondary)' }}>Actions</th>
                            </tr>
                            {showFilters && (
                                <tr style={{ background: 'var(--ae-filter-row-bg)' }}>
                                    {ALL_COLUMNS.map(col => (
                                        <th key={col.key} style={{ backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>
                                            <div className="ae-input-group" style={{ margin: 0 }}>
                                                <Search className="ae-search-icon" size={12} />
                                                <input
                                                    className="ae-input"
                                                    placeholder="Filter..."
                                                    value={(filters as any)[col.key] || ''}
                                                    onChange={e => setFilters({ ...filters, [col.key]: e.target.value })}
                                                    style={{ height: '24px', fontSize: '11px', width: '100%', paddingTop: 0, paddingBottom: 0 }}
                                                />
                                            </div>
                                        </th>
                                    ))}
                                    <th style={{ textAlign: 'center', backgroundColor: 'var(--ae-filter-row-bg)', borderBottom: '1px solid var(--border-secondary)' }}>
                                        <button
                                            onClick={() => setFilters({
                                                lead_no: '', deal_no: '', company: '', customer_name: '', project_name: '', sales_person: '', project_manager: '', email: '', lead_date: ''
                                            })}
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
                                        {ALL_COLUMNS.map(col => col.key).map(key => {
                                            switch (key) {
                                                case 'lead_no':
                                                    return (
                                                        <td key={key}
                                                            style={{ fontWeight: 700, color: 'var(--theme-primary)', cursor: 'pointer', textDecoration: 'underline', whiteSpace: 'nowrap' }}
                                                            onClick={() => onView(lead.id)}
                                                        >
                                                            {lead.lead_no || '—'}
                                                        </td>
                                                    );
                                                case 'deal_no':
                                                    return (
                                                        <td key={key} style={{ fontWeight: 500, color: lead.deal_id ? 'var(--theme-primary)' : 'var(--text-primary)' }}>
                                                            {lead.deal_no || 'No Deal'}
                                                        </td>
                                                    );
                                                case 'company':
                                                    return (
                                                        <td key={key}>
                                                            <span style={{
                                                                fontWeight: 500,
                                                                color: 'var(--text-primary)'
                                                            }}>
                                                                {lead.company}
                                                            </span>
                                                        </td>
                                                    );
                                                case 'customer_name':
                                                    return <td key={key} style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{lead.customer_name}</td>;
                                                case 'project_name':
                                                    return <td key={key} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{lead.project_name}</td>;
                                                case 'sales_person':
                                                    return <td key={key} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{lead.sales_person || '—'}</td>;
                                                case 'project_manager':
                                                    return <td key={key} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{lead.project_manager || '—'}</td>;
                                                case 'email':
                                                    return <td key={key} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{lead.email || '—'}</td>;
                                                case 'lead_date':
                                                    return <td key={key} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatToAppDate(lead.lead_date || lead.created_at)}</td>;
                                                default:
                                                    return null;
                                            }
                                        })}
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                            <button
                                                onClick={() => onView(lead.id)}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    background: 'rgba(187, 77, 0, 0.07)',
                                                    color: 'var(--theme-primary)',
                                                    border: '1px solid rgba(187, 77, 0, 0.25)',
                                                    padding: '4px 14px',
                                                    borderRadius: '20px',
                                                    fontSize: '0.72rem',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    letterSpacing: '0.04em',
                                                    transition: 'all 0.18s',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = 'var(--theme-primary)';
                                                    e.currentTarget.style.color = 'white';
                                                    e.currentTarget.style.borderColor = 'var(--theme-primary)';
                                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(187,77,0,0.3)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'rgba(187, 77, 0, 0.07)';
                                                    e.currentTarget.style.color = 'var(--theme-primary)';
                                                    e.currentTarget.style.borderColor = 'rgba(187, 77, 0, 0.25)';
                                                    e.currentTarget.style.boxShadow = 'none';
                                                }}
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
            </div>
        </div>
    );
};

export default LeadDashboard;
