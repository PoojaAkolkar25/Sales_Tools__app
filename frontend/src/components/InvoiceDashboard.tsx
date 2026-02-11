import React, { useState, useEffect } from 'react';
import { Plus, Download, CheckCircle, XCircle, Mail, BarChart3, Eye, Pencil, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import InvoiceForm from './InvoiceForm';
import { useNotification } from '../context/NotificationContext';

const InvoiceDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'dashboard' | 'form'>('dashboard');
    const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [dateRangeFilter, setDateRangeFilter] = useState('');
    const [invoiceNoSearch, setInvoiceNoSearch] = useState('');
    const [customerSearch, setCustomerSearch] = useState('');
    const [dealSearch, setDealSearch] = useState('');

    useEffect(() => {
        if (view === 'dashboard') {
            fetchInvoices();
        }
    }, [view, statusFilter, typeFilter, dateRangeFilter, invoiceNoSearch, customerSearch, dealSearch]);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            // Build query parameters
            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);
            if (typeFilter) params.append('invoice_type', typeFilter);
            if (dateRangeFilter) params.append('date_range', dateRangeFilter);
            if (invoiceNoSearch) params.append('invoice_no', invoiceNoSearch);
            if (customerSearch) params.append('customer_name', customerSearch);
            if (dealSearch) params.append('deal', dealSearch);

            const response = await api.get(`/finance/invoices/?${params.toString()}`);
            setInvoices(response.data);
        } catch (error) {
            console.error('Error fetching invoices', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (id: number, no: string) => {
        try {
            const response = await api.get(`/finance/invoices/${id}/download_pdf/`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Invoice_${no}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            showNotification('Error downloading PDF', 'error');
        }
    };

    const handleAction = async (id: number, action: 'approve' | 'reject' | 'submit_for_approval') => {
        try {
            await api.post(`/finance/invoices/${id}/${action}/`);
            let label = action === 'submit_for_approval' ? 'submitted' : `${action}d`;
            showNotification(`Invoice ${label} successfully`, 'success');
            fetchInvoices();
        } catch (error) {
            showNotification(`Error performing action`, 'error');
        }
    };

    const handleSendEmail = async (id: number) => {
        try {
            await api.post(`/finance/invoices/${id}/send_email/`);
            showNotification('Invoice emailed successfully', 'success');
            fetchInvoices();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Error sending email', 'error');
        }
    };

    const handleReport = async (type: 'register' | 'tax_summary' | 'customer_billing') => {
        try {
            const res = await api.get(`/finance/invoices/report_${type}/`);
            console.log(`${type} report:`, res.data);

            // Format and display report data
            if (type === 'tax_summary') {
                const summary = res.data;
                const message = `Tax Summary:\nCGST: ₹${summary.total_cgst || 0}\nSGST: ₹${summary.total_sgst || 0}\nIGST: ₹${summary.total_igst || 0}\nSales Tax: ₹${summary.total_sales_tax || 0}`;
                alert(message);
            } else if (type === 'customer_billing') {
                const customers = res.data;
                let message = 'Customer-wise Billing:\n\n';
                customers.forEach((c: any) => {
                    message += `${c.customer_name}\n- Invoices: ${c.total_invoices}\n- Billed: ₹${c.total_billed}\n- Outstanding: ₹${c.total_outstanding}\n\n`;
                });
                alert(message);
            } else {
                showNotification(`${type.replace('_', ' ')} data logged to console`, 'info');
            }
        } catch (error) {
            showNotification('Error generating report', 'error');
        }
    };

    if (view === 'form') {
        return <InvoiceForm
            onBack={() => {
                setView('dashboard');
                setEditingInvoiceId(null);
            }}
            invoiceId={editingInvoiceId}
        />;
    }

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'PAID': return { bg: 'rgba(0, 200, 83, 0.1)', color: '#00C853' };
            case 'APPROVED': return { bg: 'rgba(66, 153, 225, 0.1)', color: '#4299E1' };
            case 'PENDING_APPROVAL': return { bg: 'rgba(237, 137, 54, 0.1)', color: '#ED8936' };
            case 'SENT': return { bg: 'rgba(159, 122, 234, 0.1)', color: '#9F7AEA' };
            case 'CANCELLED': return { bg: 'rgba(160, 174, 192, 0.1)', color: '#A0AEC0' };
            default: return { bg: 'rgba(255, 107, 0, 0.1)', color: '#FF6B00' };
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Header Area */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '4px', height: '18px', background: '#FF6B00', borderRadius: '2px' }}></div>
                    <h1 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1a1f36', margin: 0 }}>
                        Invoices
                    </h1>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="ae-input"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', width: 'auto' }}
                    >
                        <option value="">All Statuses</option>
                        <option value="DRAFT">Draft</option>
                        <option value="PENDING_APPROVAL">Pending Approval</option>
                        <option value="APPROVED">Approved</option>
                        <option value="SENT">Sent</option>
                        <option value="PAID">Paid</option>
                    </select>
                    <button onClick={() => handleReport('register')} className="ae-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', fontSize: '0.8rem' }}>
                        <BarChart3 size={16} /> Register
                    </button>
                    <button onClick={() => handleReport('tax_summary')} className="ae-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', fontSize: '0.8rem' }}>
                        <BarChart3 size={16} /> Tax Summary
                    </button>
                    <button onClick={() => handleReport('customer_billing')} className="ae-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', fontSize: '0.8rem' }}>
                        <BarChart3 size={16} /> Customer Billing
                    </button>
                    <button onClick={() => setView('form')} className="ae-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', fontSize: '0.8rem' }}>
                        <Plus size={16} /> Create Invoice
                    </button>
                </div>
            </div>

            {/* Advanced Filters Section */}
            <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    <div className="ae-input-group">
                        <label className="ae-label" style={{ fontSize: '0.75rem' }}>Invoice Number</label>
                        <input
                            type="text"
                            className="ae-input"
                            placeholder="Search by invoice #"
                            value={invoiceNoSearch}
                            onChange={(e) => setInvoiceNoSearch(e.target.value)}
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        />
                    </div>
                    <div className="ae-input-group">
                        <label className="ae-label" style={{ fontSize: '0.75rem' }}>Customer Name</label>
                        <input
                            type="text"
                            className="ae-input"
                            placeholder="Search by customer"
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        />
                    </div>
                    <div className="ae-input-group">
                        <label className="ae-label" style={{ fontSize: '0.75rem' }}>Deal ID</label>
                        <input
                            type="text"
                            className="ae-input"
                            placeholder="Filter by deal"
                            value={dealSearch}
                            onChange={(e) => setDealSearch(e.target.value)}
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        />
                    </div>
                    <div className="ae-input-group">
                        <label className="ae-label" style={{ fontSize: '0.75rem' }}>Invoice Type</label>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="ae-input"
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                            <option value="">All Types</option>
                            <option value="DOMESTIC">Domestic</option>
                            <option value="INTER_STATE">Inter-State</option>
                            <option value="EXPORT">Export</option>
                            <option value="USA">USA</option>
                        </select>
                    </div>
                    <div className="ae-input-group">
                        <label className="ae-label" style={{ fontSize: '0.75rem' }}>Date Range</label>
                        <select
                            value={dateRangeFilter}
                            onChange={(e) => setDateRangeFilter(e.target.value)}
                            className="ae-input"
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                            <option value="">All Dates</option>
                            <option value="last_month">Last Month</option>
                            <option value="last_3_months">Last 3 Months</option>
                            <option value="last_6_months">Last 6 Months</option>
                            <option value="last_year">Last Year</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
                        <button
                            onClick={() => {
                                setStatusFilter('');
                                setTypeFilter('');
                                setDateRangeFilter('');
                                setInvoiceNoSearch('');
                                setCustomerSearch('');
                                setDealSearch('');
                            }}
                            className="ae-btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', width: '100%' }}
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Invoice List */}
            <div className="glass-card" style={{ padding: '24px' }}>
                <div className="ae-table-container">
                    <table className="ae-table">
                        <thead>
                            <tr>
                                <th>Invoice No</th>
                                <th>Deal ID</th>
                                <th>Customer</th>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>Loading...</td></tr>
                            ) : invoices.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>No invoices found</td></tr>
                            ) : (
                                invoices.map(inv => (
                                    <tr key={inv.id}>
                                        <td style={{ fontWeight: 700, color: '#FF6B00' }}>{inv.invoice_no}</td>
                                        <td
                                            style={{ fontWeight: 700, color: '#0066CC', cursor: 'pointer' }}
                                            onClick={() => navigate(`/deal?id=${inv.deal}`)}
                                        >
                                            {inv.deal_no || '---'}
                                        </td>
                                        <td>{inv.customer_name}</td>
                                        <td>{new Date(inv.invoice_date).toLocaleDateString()}</td>
                                        <td style={{ fontWeight: 600 }}>{inv.currency} {inv.total_amount.toLocaleString()}</td>
                                        <td>
                                            <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#64748b' }}>
                                                {inv.invoice_type}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontWeight: 600,
                                                display: 'inline-block',
                                                background: getStatusStyle(inv.status).bg,
                                                color: getStatusStyle(inv.status).color
                                            }}>
                                                {inv.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                {/* Always show Download and View/Edit */}
                                                <button onClick={() => handleDownload(inv.id, inv.invoice_no)} title="Download PDF" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#718096' }}>
                                                    <Download size={16} />
                                                </button>

                                                {/* View/Edit Button */}
                                                <button
                                                    onClick={() => {
                                                        setEditingInvoiceId(inv.id);
                                                        setView('form');
                                                    }}
                                                    title={inv.status === 'DRAFT' ? "Edit Invoice" : "View Invoice"}
                                                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#4A5568' }}
                                                >
                                                    {inv.status === 'DRAFT' ? <Pencil size={16} /> : <Eye size={16} />}
                                                </button>

                                                {inv.status === 'DRAFT' && (
                                                    <button onClick={() => handleAction(inv.id, 'submit_for_approval')} title="Submit for Approval" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#3182CE' }}>
                                                        <Send size={16} />
                                                    </button>
                                                )}

                                                {inv.status === 'PENDING_APPROVAL' && (
                                                    <>
                                                        <button onClick={() => handleAction(inv.id, 'approve')} title="Approve" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#00C853' }}>
                                                            <CheckCircle size={16} />
                                                        </button>
                                                        <button onClick={() => handleAction(inv.id, 'reject')} title="Reject" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#E53E3E' }}>
                                                            <XCircle size={16} />
                                                        </button>
                                                    </>
                                                )}

                                                {(inv.status === 'APPROVED' || inv.status === 'SENT' || inv.status === 'PAID' || inv.status === 'PARTIAL') && (
                                                    <button onClick={() => handleSendEmail(inv.id)} title="Send Email" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9F7AEA' }}>
                                                        <Mail size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InvoiceDashboard;
