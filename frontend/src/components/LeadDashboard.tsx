import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    PlusCircle,
    Search,
    TrendingUp,
    Users,
    Loader2
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { formatToAppDate } from '../utils/dateUtils';

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
}

interface LeadDashboardProps {
    onView: (id: number) => void;
    onCreate: () => void;
}

const LeadDashboard: React.FC<LeadDashboardProps> = ({ onView, onCreate }) => {
    const { showNotification } = useNotification();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState({
        total_leads: 0,
        new_today: 0,
        usa_leads: 0,
        ind_leads: 0
    });

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

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // Filtering is handled client-side for simplicity if searches are small
        // but could be server-side
    };

    const filteredLeads = leads.filter(lead =>
        lead.lead_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.project_name.toLowerCase().includes(searchQuery.toLowerCase())
    );


    return (
        <div className="space-y-6">
            <div className="ae-grid-4">
                <div className="ae-card">
                    <div className="ae-card-header">
                        <div className="ae-icon-box bg-blue-soft"><Users size={20} /></div>
                    </div>
                    <div className="ae-card-label">Total Leads</div>
                    <div className="ae-card-value">{stats.total_leads}</div>
                </div>
                <div className="ae-card">
                    <div className="ae-card-header">
                        <div className="ae-icon-box bg-green-soft"><TrendingUp size={20} /></div>
                    </div>
                    <div className="ae-card-label">New Today</div>
                    <div className="ae-card-value">{stats.new_today}</div>
                </div>
                <div className="ae-card">
                    <div className="ae-card-header">
                        <div className="ae-icon-box bg-orange-soft"><LayoutDashboard size={20} /></div>
                    </div>
                    <div className="ae-card-label">AE IND Leads</div>
                    <div className="ae-card-value">{stats.ind_leads}</div>
                </div>
                <div className="ae-card">
                    <div className="ae-card-header">
                        <div className="ae-icon-box bg-purple-soft"><LayoutDashboard size={20} /></div>
                    </div>
                    <div className="ae-card-label">AE USA Leads</div>
                    <div className="ae-card-value">{stats.usa_leads}</div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #E0E6ED' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <form onSubmit={handleSearch} className="ae-input-group" style={{ width: '400px' }}>
                        <span className="ae-search-icon"><Search size={18} /></span>
                        <input
                            type="text"
                            className="ae-input"
                            placeholder="Search by Lead ID, Customer or Project..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </form>
                </div>
                <button className="ae-btn-primary" onClick={onCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PlusCircle size={18} /> New Lead
                </button>
            </div>

            <div className="ae-table-container">
                <table className="ae-table">
                    <thead>
                        <tr>
                            <th>Lead ID</th>
                            <th>Company</th>
                            <th>Customer Name</th>
                            <th>Project Name</th>
                            <th>Sales Person</th>
                            <th>Created Date</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '100px' }}>
                                    <Loader2 className="animate-spin" style={{ margin: '0 auto' }} />
                                </td>
                            </tr>
                        ) : filteredLeads.length === 0 ? (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '100px', color: '#718096' }}>
                                    No leads found.
                                </td>
                            </tr>
                        ) : (
                            filteredLeads.map((lead) => (
                                <tr key={lead.id}>
                                    <td style={{ fontWeight: 600, color: '#0066CC' }}>{lead.lead_no}</td>
                                    <td>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#4A5568', background: '#EDF2F7', padding: '2px 6px', borderRadius: '4px' }}>
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
                                            className="ae-btn-secondary"
                                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
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
        </div>
    );
};

export default LeadDashboard;
