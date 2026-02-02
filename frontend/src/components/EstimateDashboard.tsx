import React, { useState, useEffect, useMemo } from 'react';
import {
    Search,
    RefreshCcw,
    FileText,
    Clock,
    CheckCircle2,
    History,
    Upload,
    Mail,
    X,
    Eye,
    Download
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { formatToAppDate } from '../utils/dateUtils';

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
    approval_status: string;
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

    // Email Modal State
    const [emailModal, setEmailModal] = useState<{
        open: boolean;
        estimateId: number | null;
        to: string;
        cc: string;
        bcc: string;
        subject: string;
        body: string;
    }>({
        open: false,
        estimateId: null,
        to: '',
        cc: '',
        bcc: '',
        subject: '',
        body: ''
    });
    const [sending, setSending] = useState(false);

    const openEmailModal = (est: any) => {
        const clientName = est.customer_name || 'Client';
        const projectName = est.project_name || 'Project';

        setEmailModal({
            open: true,
            estimateId: est.id,
            to: est.customer_email || '', // Ensure your serializer provides this
            cc: '',
            bcc: '',
            subject: `Proposal / Estimate - ${est.estimate_id}`,
            body: `Dear ${clientName},\n\nPlease find attached the proposal for ${projectName}.\n\nBest regards,\nSales Team`
        });
    };

    const handleSendEmail = async () => {
        if (!emailModal.estimateId) return;
        setSending(true);
        try {
            await api.post(`/estimates/${emailModal.estimateId}/send_email/`, {
                to: emailModal.to,
                cc: emailModal.cc,
                bcc: emailModal.bcc,
                subject: emailModal.subject,
                body: emailModal.body
            });
            showNotification('Email sent successfully', 'success');
            setEmailModal({ ...emailModal, open: false });
        } catch (error: any) {
            console.error('Error sending email', error);
            showNotification(error.response?.data?.error || 'Failed to send email', 'error');
        } finally {
            setSending(false);
        }
    };

    const handlePreviewPDF = async (id: number) => {
        try {
            const response = await api.get(`/estimates/${id}/preview_pdf/`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            window.open(url, '_blank');
        } catch (error) {
            console.error('Error previewing PDF', error);
            showNotification('Failed to preview PDF', 'error');
        }
    };

    const handleDownloadPDF = async (id: number, estId: string) => {
        try {
            const response = await api.get(`/estimates/${id}/download_pdf/`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Estimate_${estId}_Combined.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error) {
            showNotification('Failed to download PDF', 'error');
        }
    };

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

    const getStatusStyle = (status: string, approvalStatus: string) => {
        if (status === 'PENDING_APPROVAL' || approvalStatus === 'PENDING') return { bg: '#FFFAF0', text: '#DD6B20', label: 'Pending Approval' };
        if (approvalStatus === 'REJECTED') return { bg: '#FFF5F5', text: '#E53E3E', label: 'Rejected' };

        switch (status) {
            case 'DRAFT':
                return approvalStatus === 'APPROVED'
                    ? { bg: '#E6FFFA', text: '#38A169', label: 'Approved (Draft)' }
                    : { bg: '#F7FAFC', text: '#4A5568', label: 'Draft' };
            case 'SUBMITTED': return { bg: '#EBF8FF', text: '#3182CE', label: 'Submitted to Customer' };
            case 'NEGOTIATION': return { bg: '#FFF9F5', text: '#FF6B00', label: 'Negotiation' };
            case 'APPROVED': return { bg: '#E6FFFA', text: '#38A169', label: 'Approved' }; // Fallback
            case 'REJECTED': return { bg: '#FFF5F5', text: '#E53E3E', label: 'Rejected' };
            default: return { bg: '#F7FAFC', text: '#4A5568', label: status };
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
                    <div className="ae-card-value">{estimates.filter(e => e.approval_status === 'APPROVED' && e.is_latest).length}</div>
                </div>
                <div className="ae-card">
                    <div className="ae-card-header">
                        <div className="ae-icon-box bg-purple-soft"><Clock size={20} /></div>
                    </div>
                    <div className="ae-card-label">Pending Approval</div>
                    <div className="ae-card-value">{estimates.filter(e => (e.status === 'PENDING_APPROVAL' || e.approval_status === 'PENDING') && e.is_latest).length}</div>
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
                        <option value="PENDING_APPROVAL">Pending Approval</option>
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
                                const style = getStatusStyle(est.status, est.approval_status);
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
                                                color: style.text,
                                                whiteSpace: 'nowrap'
                                            }}>{style.label}</span>
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
                                        <td style={{ color: '#4A5568', fontSize: '0.75rem' }}>
                                            {formatToAppDate(est.created_at)}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                <button
                                                    className="ae-btn-secondary"
                                                    onClick={() => onView(est.id)}
                                                    style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                                                    title="View Estimate"
                                                >
                                                    <FileText size={16} />
                                                </button>

                                                <button
                                                    className="ae-btn-secondary"
                                                    onClick={() => handlePreviewPDF(est.id)}
                                                    style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                                                    title="Preview Combined PDF"
                                                >
                                                    <Eye size={16} />
                                                </button>

                                                <button
                                                    className="ae-btn-secondary"
                                                    onClick={() => handleDownloadPDF(est.id, est.estimate_id)}
                                                    style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                                                    title="Download Combined PDF"
                                                >
                                                    <Download size={16} />
                                                </button>

                                                <button
                                                    className="ae-btn-primary"
                                                    onClick={() => openEmailModal(est)}
                                                    disabled={!hasProposal}
                                                    style={{
                                                        padding: '6px 10px',
                                                        fontSize: '0.75rem',
                                                        opacity: !hasProposal ? 0.3 : 1,
                                                        cursor: !hasProposal ? 'not-allowed' : 'pointer'
                                                    }}
                                                    title={!hasProposal ? "Attach a proposal first" : "Send Email"}
                                                >
                                                    <Mail size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            {/* Email Modal */}
            {emailModal.open && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000
                }}>
                    <div style={{
                        background: 'white',
                        padding: '32px',
                        borderRadius: '16px',
                        width: '600px',
                        maxWidth: '95%',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1A202C' }}>Compose Proposal Email</h3>
                                <p style={{ color: '#718096', fontSize: '0.85rem', marginTop: '4px' }}>Combined Estimate and Proposal will be attached automatically.</p>
                            </div>
                            <button
                                onClick={() => setEmailModal({ ...emailModal, open: false })}
                                style={{ padding: '8px', borderRadius: '50%', background: '#F7FAFC', border: 'none', cursor: 'pointer' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', alignItems: 'center', gap: '12px' }}>
                                <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#4A5568' }}>To:</label>
                                <input
                                    className="ae-input"
                                    value={emailModal.to}
                                    onChange={(e) => setEmailModal({ ...emailModal, to: e.target.value })}
                                    placeholder="recipient@example.com"
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', alignItems: 'center', gap: '12px' }}>
                                <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#4A5568' }}>CC:</label>
                                <input
                                    className="ae-input"
                                    value={emailModal.cc}
                                    onChange={(e) => setEmailModal({ ...emailModal, cc: e.target.value })}
                                    placeholder="cc@example.com (comma separated)"
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', alignItems: 'center', gap: '12px' }}>
                                <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#4A5568' }}>Subject:</label>
                                <input
                                    className="ae-input"
                                    value={emailModal.subject}
                                    onChange={(e) => setEmailModal({ ...emailModal, subject: e.target.value })}
                                    placeholder="Enter subject"
                                />
                            </div>

                            <div style={{ marginTop: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem', color: '#4A5568' }}>Message Body</label>
                                <textarea
                                    className="ae-input"
                                    value={emailModal.body}
                                    onChange={(e) => setEmailModal({ ...emailModal, body: e.target.value })}
                                    style={{ width: '100%', minHeight: '180px', padding: '12px', resize: 'vertical' }}
                                    placeholder="Write your message here..."
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
                            <button
                                className="ae-btn-secondary"
                                onClick={() => setEmailModal({ ...emailModal, open: false })}
                                disabled={sending}
                                style={{ padding: '10px 24px' }}
                            >
                                Cancel
                            </button>
                            <button
                                className="ae-btn-primary"
                                onClick={handleSendEmail}
                                disabled={sending}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 32px' }}
                            >
                                {sending ? <RefreshCcw className="animate-spin" size={18} /> : <Mail size={18} />}
                                {sending ? 'Sending...' : 'Send Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EstimateDashboard;
