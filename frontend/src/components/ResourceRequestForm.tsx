import React, { useState, useEffect } from 'react';
import {
    Clock,
    Database,
    Shield,
    ChevronLeft,
    Send,
    User,
    Briefcase,
    Settings,
    Server
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';

interface ResourceRequestFormProps {
    id: number | null;
    user: any;
    onBack: () => void;
    onSave: () => void;
}

const ResourceRequestForm: React.FC<ResourceRequestFormProps> = ({ id, user, onBack, onSave }) => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deals, setDeals] = useState<any[]>([]);
    const [formData, setFormData] = useState<any>({
        request_date: new Date().toISOString().split('T')[0],
        employee_id: '',
        department: '',
        designation: '',
        project_name: '',
        project_code: '',
        client_name: '',
        environment: 'DEVELOPMENT',
        resource_type_requested: 'Server',
        server_type: 'EC2',
        server_category: 'Virtual',
        cloud_provider: 'AWS',
        region: 'ap-south-1',
        instance_type: 't3a.2xlarge',
        os: 'Amazon Linux 2',
        cpu_cores: 8,
        ram_gb: 32,
        storage_type: 'SSD',
        storage_size_gb: 500,
        database_required: false,
        rds_type: '',
        database_engine: '',
        db_storage_gb: '',
        backup_required: false,
        purpose_of_request: '',
        business_justification: '',
        expected_start_date: new Date().toISOString().split('T')[0],
        expected_end_date: '',
        it_head_remarks: '',
        finance_head_remarks: '',
    });

    const { showNotification } = useNotification();

    useEffect(() => {
        fetchInitialData();
        if (id) {
            fetchRequestDetails();
        }
    }, [id]);

    const fetchInitialData = async () => {
        try {
            const [dealsRes] = await Promise.all([
                api.get('/deals/')
            ]);
            setDeals(dealsRes.data);
        } catch (error) {
            console.error('Error fetching initial data', error);
        }
    };

    const fetchRequestDetails = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/inventory/requests/${id}/`);
            setFormData(response.data);
        } catch (error) {
            showNotification('Error loading request details', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));

        // Auto-fill project code if project name matches a deal
        if (name === 'project_name') {
            const deal = deals.find(d => d.deal_name === value);
            if (deal) {
                setFormData((prev: any) => ({
                    ...prev,
                    project_code: deal.deal_id,
                    client_name: deal.customer_detail?.name || prev.client_name
                }));
            }
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (id) {
                await api.patch(`/inventory/requests/${id}/`, formData);
                showNotification('Request updated successfully', 'success');
            } else {
                await api.post('/inventory/requests/', formData);
                showNotification('Request raised successfully', 'success');
            }
            onSave();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Failed to save request', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async () => {
        setSaving(true);
        try {
            await api.post(`/inventory/requests/${id}/submit/`);
            showNotification('Request submitted to IT Head', 'success');
            onSave();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Submission failed', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleApproveIT = async () => {
        try {
            await api.post(`/inventory/requests/${id}/approve_it/`, { remarks: formData.it_head_remarks });
            showNotification('Approved by IT and sent to Finance', 'success');
            onSave();
        } catch (error) {
            showNotification('IT Approval failed', 'error');
        }
    };

    const handleApproveFinance = async () => {
        try {
            await api.post(`/inventory/requests/${id}/approve_finance/`, { remarks: formData.finance_head_remarks });
            showNotification('Approved by Finance', 'success');
            onSave();
        } catch (error) {
            showNotification('Finance Approval failed', 'error');
        }
    };

    const handleReject = async () => {
        const remarks = prompt('Enter rejection reason:');
        if (!remarks) return;
        try {
            await api.post(`/inventory/requests/${id}/reject/`, { remarks });
            showNotification('Request rejected', 'success');
            onSave();
        } catch (error) {
            showNotification('Rejection failed', 'error');
        }
    };

    const handleIssue = async () => {
        const resourceId = prompt('Enter Server Asset ID to assign:');
        if (!resourceId) return;
        try {
            await api.post(`/inventory/requests/${id}/issue/`, { resource_id: resourceId });
            showNotification('Server issued successfully', 'success');
            onSave();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Issuance failed', 'error');
        }
    };

    if (loading) return <div className="p-12 text-center font-bold text-[#718096]">Loading...</div>;

    const isReadOnly = !!(id && formData.status !== 'DRAFT');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header Toolbar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'white',
                padding: '8px 16px',
                borderRadius: '12px',
                border: '1px solid #E0E6ED',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
            }}>
                <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#718096', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                    <ChevronLeft size={18} /> Back to Dashboard
                </button>
                <div style={{ display: 'flex', gap: '12px' }}>
                    {id && formData.status === 'DRAFT' && (
                        <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Submit to IT Head</button>
                    )}
                    {id && formData.status === 'PENDING_IT' && (
                        <>
                            <button onClick={handleApproveIT} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Approve (IT Head)</button>
                            <button onClick={handleReject} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Reject</button>
                        </>
                    )}
                    {id && formData.status === 'PENDING_FINANCE' && (
                        <>
                            <button onClick={handleApproveFinance} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Approve (Finance Head)</button>
                            <button onClick={handleReject} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Reject</button>
                        </>
                    )}
                    {id && formData.status === 'APPROVED' && (
                        <button onClick={handleIssue} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Issue Server</button>
                    )}
                    {!isReadOnly && (
                        <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 20px', borderRadius: '8px', background: '#FF6B00', color: 'white', border: 'none', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                            {saving ? <Clock className="animate-spin" size={16} /> : <Send size={16} />} {id ? 'Save Changes' : 'Create Draft'}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* 1. Request Info */}
                    <section className="section-panel" style={{ padding: '24px' }}>
                        <h3 className="section-title text-[#FF6B00] flex items-center gap-2 mb-6">
                            <span style={{ width: '4px', height: '18px', background: '#0066CC', borderRadius: '2px' }}></span>
                            1. Request Information
                        </h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="ae-input-group">
                                <label className="ae-label">Request Date</label>
                                <input type="date" name="request_date" value={formData.request_date} onChange={handleInputChange} className="ae-input" disabled={isReadOnly} />
                            </div>
                            <div className="ae-input-group">
                                <label className="ae-label">Form Number</label>
                                <input type="text" value={formData.form_number || 'Auto-generated'} className="ae-input !bg-gray-50" disabled />
                            </div>
                        </div>
                    </section>

                    {/* 2. Requestor Details */}
                    <section className="section-panel" style={{ padding: '24px' }}>
                        <h3 className="section-title text-[#0066CC] flex items-center gap-2 mb-6">
                            <User size={18} /> 2. Requestor Details
                        </h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="ae-input-group">
                                <label className="ae-label">Employee ID</label>
                                <input type="text" name="employee_id" value={formData.employee_id} onChange={handleInputChange} className="ae-input" placeholder="EMP1023" disabled={isReadOnly} />
                            </div>
                            <div className="ae-input-group">
                                <label className="ae-label">Employee Name</label>
                                <input type="text" value={user?.full_name || ''} className="ae-input !bg-gray-50" disabled />
                            </div>
                            <div className="ae-input-group">
                                <label className="ae-label">Department</label>
                                <select name="department" value={formData.department} onChange={handleInputChange} className="ae-input" disabled={isReadOnly}>
                                    <option value="">Select Department</option>
                                    <option value="Engineering">Engineering</option>
                                    <option value="Product">Product</option>
                                    <option value="IT">IT</option>
                                    <option value="Sales">Sales</option>
                                    <option value="HR">HR</option>
                                </select>
                            </div>
                            <div className="ae-input-group">
                                <label className="ae-label">Designation</label>
                                <select name="designation" value={formData.designation} onChange={handleInputChange} className="ae-input" disabled={isReadOnly}>
                                    <option value="">Select Designation</option>
                                    <option value="Project Manager">Project Manager</option>
                                    <option value="Senior Developer">Senior Developer</option>
                                    <option value="Developer">Developer</option>
                                    <option value="QA Engineer">QA Engineer</option>
                                    <option value="DevOps Engineer">DevOps Engineer</option>
                                    <option value="Solution Architect">Solution Architect</option>
                                </select>
                            </div>
                            <div className="ae-input-group">
                                <label className="ae-label">Email ID</label>
                                <input type="email" value={user?.email || ''} className="ae-input !bg-gray-50" disabled />
                            </div>
                        </div>
                    </section>

                    {/* 3. Project Details */}
                    <section className="section-panel" style={{ padding: '24px' }}>
                        <h3 className="section-title text-[#00C853] flex items-center gap-2 mb-6">
                            <Briefcase size={18} /> 3. Project Details
                        </h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="ae-input-group">
                                <label className="ae-label">Project Name</label>
                                <select name="project_name" value={formData.project_name} onChange={handleInputChange} className="ae-input" disabled={isReadOnly}>
                                    <option value="">Select Project</option>
                                    {deals.map(d => <option key={d.id} value={d.deal_name}>{d.deal_name}</option>)}
                                </select>
                            </div>
                            <div className="ae-input-group">
                                <label className="ae-label">Project Code</label>
                                <input type="text" name="project_code" value={formData.project_code} onChange={handleInputChange} className="ae-input" disabled={isReadOnly} />
                            </div>
                            <div className="ae-input-group">
                                <label className="ae-label">Client Name</label>
                                <select name="client_name" value={formData.client_name} onChange={handleInputChange} className="ae-input" disabled={isReadOnly}>
                                    <option value="">Select Client</option>
                                    <option value="ABC Corp">ABC Corp</option>
                                    <option value="XYZ Ltd">XYZ Ltd</option>
                                    <option value="Global Tech">Global Tech</option>
                                    <option value="Innovate Inc">Innovate Inc</option>
                                </select>
                            </div>
                            <div className="ae-input-group">
                                <label className="ae-label">Environment</label>
                                <select name="environment" value={formData.environment} onChange={handleInputChange} className="ae-input" disabled={isReadOnly}>
                                    <option value="DEVELOPMENT">Development</option>
                                    <option value="QA">QA</option>
                                    <option value="PRODUCTION">Production</option>
                                </select>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* 4. Server Config */}
                    <section className="section-panel" style={{ padding: '24px' }}>
                        <h3 className="section-title text-[#0066CC] flex items-center gap-2 mb-6">
                            <Settings size={18} /> 4. Server Configuration
                        </h3>
                        <div className="space-y-4">
                            <div className="ae-input-group">
                                <label className="ae-label">Resource Type</label>
                                <select name="resource_type_requested" value={formData.resource_type_requested} onChange={handleInputChange} className="ae-input" disabled={isReadOnly}>
                                    <option value="Server">Server</option>
                                    <option value="Database">Database</option>
                                    <option value="Storage">Storage</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="ae-input-group">
                                    <label className="ae-label">Server Type</label>
                                    <select name="server_type" value={formData.server_type} onChange={handleInputChange} className="ae-input" disabled={isReadOnly}>
                                        <option value="EC2">EC2</option>
                                        <option value="Physical">Physical Server</option>
                                        <option value="Virtual Machine">Virtual Machine</option>
                                    </select>
                                </div>
                                <div className="ae-input-group">
                                    <label className="ae-label">Server Category</label>
                                    <select name="server_category" value={formData.server_category} onChange={handleInputChange} className="ae-input" disabled={isReadOnly}>
                                        <option value="Virtual">Virtual</option>
                                        <option value="Physical">Physical</option>
                                        <option value="Hybrid">Hybrid</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="ae-input-group">
                                    <label className="ae-label">Cloud Provider</label>
                                    <select name="cloud_provider" value={formData.cloud_provider} onChange={handleInputChange} className="ae-input" disabled={isReadOnly}>
                                        <option value="">Select Provider</option>
                                        <option value="AWS">AWS</option>
                                        <option value="Azure">Azure</option>
                                        <option value="GCP">GCP</option>
                                        <option value="On-Premise">On-Premise</option>
                                    </select>
                                </div>
                                <div className="ae-input-group">
                                    <label className="ae-label">Region</label>
                                    <select name="region" value={formData.region} onChange={handleInputChange} className="ae-input" disabled={isReadOnly}>
                                        <option value="">Select Region</option>
                                        <option value="ap-south-1">ap-south-1 (Mumbai)</option>
                                        <option value="us-east-1">us-east-1 (N. Virginia)</option>
                                        <option value="eu-west-1">eu-west-1 (Ireland)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="ae-input-group">
                                    <label className="ae-label">Instance Type</label>
                                    <select name="instance_type" value={formData.instance_type} onChange={handleInputChange} className="ae-input" disabled={isReadOnly}>
                                        <option value="">Select Instance</option>
                                        <option value="t3a.2xlarge">t3a.2xlarge</option>
                                        <option value="t3.medium">t3.medium</option>
                                        <option value="m5.large">m5.large</option>
                                        <option value="c5.xlarge">c5.xlarge</option>
                                    </select>
                                </div>
                                <div className="ae-input-group">
                                    <label className="ae-label">Operating System</label>
                                    <select name="os" value={formData.os} onChange={handleInputChange} className="ae-input" disabled={isReadOnly}>
                                        <option value="">Select OS</option>
                                        <option value="Amazon Linux 2">Amazon Linux 2</option>
                                        <option value="Ubuntu 20.04">Ubuntu 20.04</option>
                                        <option value="Windows Server 2019">Windows Server 2019</option>
                                        <option value="RHEL 8">RHEL 8</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="ae-input-group">
                                    <label className="ae-label">CPU Cores</label>
                                    <input type="number" name="cpu_cores" value={formData.cpu_cores} onChange={handleInputChange} className="ae-input" disabled={isReadOnly} />
                                </div>
                                <div className="ae-input-group">
                                    <label className="ae-label">RAM (GB)</label>
                                    <input type="number" name="ram_gb" value={formData.ram_gb} onChange={handleInputChange} className="ae-input" disabled={isReadOnly} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="ae-input-group">
                                    <label className="ae-label">Storage Type</label>
                                    <select name="storage_type" value={formData.storage_type} onChange={handleInputChange} className="ae-input" disabled={isReadOnly}>
                                        <option value="SSD">SSD</option>
                                        <option value="HDD">HDD</option>
                                        <option value="NVMe">NVMe</option>
                                    </select>
                                </div>
                                <div className="ae-input-group">
                                    <label className="ae-label">Storage Size (GB)</label>
                                    <input type="number" name="storage_size_gb" value={formData.storage_size_gb} onChange={handleInputChange} className="ae-input" disabled={isReadOnly} />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 5. Database / RDS Details */}
                    <section className="section-panel" style={{ padding: '24px' }}>
                        <h3 className="section-title text-[#0066CC] flex items-center gap-2 mb-6">
                            <Database size={18} /> 5. Database / RDS Details (If Applicable)
                        </h3>
                        <div className="space-y-4">
                            <div className="ae-input-group">
                                <label className="ae-label">Database Required</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="database_required" checked={formData.database_required === true} onChange={() => setFormData((p: any) => ({ ...p, database_required: true }))} disabled={isReadOnly} /> Yes
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="database_required" checked={formData.database_required === false} onChange={() => setFormData((p: any) => ({ ...p, database_required: false, rds_type: '', database_engine: '', db_storage_gb: '' }))} disabled={isReadOnly} /> No
                                    </label>
                                </div>
                            </div>

                            {formData.database_required && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="ae-input-group">
                                            <label className="ae-label">RDS Type</label>
                                            <select name="rds_type" value={formData.rds_type} onChange={handleInputChange} className="ae-input" disabled={isReadOnly}>
                                                <option value="">Select Type</option>
                                                <option value="db.t3.small">db.t3.small</option>
                                                <option value="db.t3.medium">db.t3.medium</option>
                                                <option value="db.m5.large">db.m5.large</option>
                                            </select>
                                        </div>
                                        <div className="ae-input-group">
                                            <label className="ae-label">Database Engine</label>
                                            <select name="database_engine" value={formData.database_engine} onChange={handleInputChange} className="ae-input" disabled={isReadOnly}>
                                                <option value="">Select Engine</option>
                                                <option value="MySQL">MySQL</option>
                                                <option value="PostgreSQL">PostgreSQL</option>
                                                <option value="SQL Server">SQL Server</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="ae-input-group">
                                            <label className="ae-label">DB Storage (GB)</label>
                                            <input type="number" name="db_storage_gb" value={formData.db_storage_gb} onChange={handleInputChange} className="ae-input" disabled={isReadOnly} />
                                        </div>
                                        <div className="ae-input-group">
                                            <label className="ae-label">Backup Required</label>
                                            <label className="flex items-center gap-2 cursor-pointer mt-2">
                                                <input type="checkbox" name="backup_required" checked={formData.backup_required} onChange={(e) => setFormData((p: any) => ({ ...p, backup_required: e.target.checked }))} disabled={isReadOnly} /> Enable Daily Backup
                                            </label>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </section>

                    {/* Approval History (Read Only) */}
                    {(formData.it_head_approved_by || formData.status === 'PENDING_IT') && (
                        <section className="section-panel" style={{ padding: '24px', borderLeft: '4px solid #0066CC' }}>
                            <h3 className="section-title text-[#0066CC] flex items-center gap-2 mb-4">
                                <Shield size={18} /> IT Head Approval
                            </h3>
                            <div className="space-y-3">
                                <div className="ae-input-group">
                                    <label className="ae-label">IT Head Remarks</label>
                                    <textarea
                                        name="it_head_remarks"
                                        value={formData.it_head_remarks || ''}
                                        onChange={handleInputChange}
                                        className="ae-input !h-20"
                                        disabled={formData.status !== 'PENDING_IT'}
                                        placeholder="Enter technical observations..."
                                    ></textarea>
                                </div>
                                {formData.it_head_approved_at && (
                                    <div className="text-[10px] text-[#718096] font-semibold">
                                        Approved by: {formData.it_head_approved_by_detail?.full_name} on {new Date(formData.it_head_approved_at).toLocaleString()}
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {(formData.finance_head_approved_by || formData.status === 'PENDING_FINANCE') && (
                        <section className="section-panel" style={{ padding: '24px', borderLeft: '4px solid #00C853' }}>
                            <h3 className="section-title text-[#00C853] flex items-center gap-2 mb-4">
                                <Shield size={18} /> Finance Head Approval
                            </h3>
                            <div className="space-y-3">
                                <div className="ae-input-group">
                                    <label className="ae-label">Finance Remarks</label>
                                    <textarea
                                        name="finance_head_remarks"
                                        value={formData.finance_head_remarks || ''}
                                        onChange={handleInputChange}
                                        className="ae-input !h-20"
                                        disabled={formData.status !== 'PENDING_FINANCE'}
                                        placeholder="Enter budget confirmation..."
                                    ></textarea>
                                </div>
                                {formData.finance_head_approved_at && (
                                    <div className="text-[10px] text-[#718096] font-semibold">
                                        Approved by: {formData.finance_head_approved_by_detail?.full_name} on {new Date(formData.finance_head_approved_at).toLocaleString()}
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* 5. Justification */}
                    <section className="section-panel" style={{ padding: '24px' }}>
                        <h3 className="section-title text-[#FF6B00] mb-6">Usage & Justification</h3>
                        <div className="space-y-4">
                            <div className="ae-input-group">
                                <label className="ae-label">Purpose of Request</label>
                                <textarea name="purpose_of_request" value={formData.purpose_of_request} onChange={handleInputChange} className="ae-input !h-24" disabled={isReadOnly}></textarea>
                            </div>
                            <div className="ae-input-group">
                                <label className="ae-label">Exp. Start Date</label>
                                <input type="date" name="expected_start_date" value={formData.expected_start_date} onChange={handleInputChange} className="ae-input" disabled={isReadOnly} />
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            {/* 8. Issuance Details (Visible only when ISSUED) */}
            {formData.status === 'ISSUED' && (
                <section className="section-panel" style={{ padding: '24px', borderLeft: '4px solid #0066CC' }}>
                    <h3 className="section-title text-[#0066CC] flex items-center gap-2 mb-4">
                        <Server size={18} /> 8. Issuance Details (Server Issuing Authority)
                    </h3>
                    <div className="grid grid-cols-3 gap-6">
                        <div className="ae-input-group">
                            <label className="ae-label">Server Asset ID / Name</label>
                            <input
                                type="text"
                                value={formData.resource_assigned_detail?.server_name || 'N/A'}
                                className="ae-input !bg-gray-50 !font-bold"
                                disabled
                            />
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Issued Date</label>
                            <input
                                type="text"
                                value={formData.issued_at ? new Date(formData.issued_at).toLocaleDateString() : 'N/A'}
                                className="ae-input !bg-gray-50"
                                disabled
                            />
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Issued By</label>
                            <input
                                type="text"
                                value={formData.issued_by_detail?.full_name || 'System'}
                                className="ae-input !bg-gray-50"
                                disabled
                            />
                        </div>
                        <div className="ae-input-group col-span-3">
                            <label className="ae-label">Allocation Status</label>
                            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-[#E3F2FD] text-[#1E88E5]">
                                ISSUED / ALLOCATED
                            </div>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};

export default ResourceRequestForm;
