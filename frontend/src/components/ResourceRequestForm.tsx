import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Send,
    Save,
    PlusCircle,
    CheckCircle,
    XCircle,
    Calendar,
    Check,
    X,
    Server,
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import SearchableDropdown from './SearchableDropdown';
import AutoExpandingTextarea from './AutoExpandingTextarea';
import { formatToAppDate } from '../utils/dateUtils';

interface ResourceRequestFormProps {
    id: number | null;
    user: any;
    onBack: () => void;
    onSave: () => void;
}

const ResourceRequestForm: React.FC<ResourceRequestFormProps> = ({ id, user, onBack, onSave }) => {
    const [loading, setLoading] = useState(false);
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
        expected_start_date: '',
        expected_end_date: '',
        quantity: 1,
        status: 'DRAFT',
        it_head_remarks: '',
        finance_head_remarks: '',
    });


    const [activeAction, setActiveAction] = useState<'draft' | 'submit' | 'cancel' | 'approve' | 'reject' | 'issue'>('submit');
    const [isConfirmingExit, setIsConfirmingExit] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectRemarks, setRejectRemarks] = useState('');
    const { showNotification, showConfirm } = useNotification();

    useEffect(() => {
        if (isConfirmingExit) {
            setActiveAction('cancel');
        }
    }, [isConfirmingExit]);

    useEffect(() => {
        fetchInitialData();
        if (id) {
            fetchRequestDetails();
        } else if (user) {
            // Auto-fetch requestor details for new requests
            setFormData((prev: any) => ({
                ...prev,
                employee_id: user.employee_id || prev.employee_id,
                department: user.department || prev.department,
            }));
        }
    }, [id, user]);

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

    const handleSubmitToIT = async () => {
        if (!id) {
            showNotification('Request must be saved first', 'error');
            return;
        }
        setLoading(true);
        try {
            await api.post(`/inventory/requests/${id}/submit_to_it/`);
            showNotification('Request submitted to IT Head', 'success');
            onSave();
        } catch (error: any) {
            let errorMsg = 'IT Submission failed';
            if (error.response?.data) {
                const data = error.response.data;
                if (data.error) errorMsg = data.error;
            }
            showNotification(errorMsg, 'error');
        } finally {
            setLoading(false);
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

    const prepareDataForSubmission = (data: any) => {
        const cleaned = { ...data };

        // Convert empty strings to null for optional fields
        const nullableFields = [
            'expected_end_date', 'db_storage_gb', 'project_code',
            'client_name', 'designation', 'rds_type', 'database_engine',
            'cloud_provider', 'region', 'instance_type'
        ];
        nullableFields.forEach(field => {
            if (cleaned[field] === '') {
                cleaned[field] = null;
            }
        });

        // Convert numerical strings to numbers
        const numericalFields = ['cpu_cores', 'ram_gb', 'storage_size_gb', 'quantity', 'db_storage_gb'];
        numericalFields.forEach(field => {
            if (cleaned[field] !== null && cleaned[field] !== undefined && cleaned[field] !== '') {
                cleaned[field] = parseInt(cleaned[field], 10);
            }
        });

        return cleaned;
    };

    const validateForm = (data: any) => {
        const requiredFields = [
            'employee_id', 'department', 'project_name',
            'purpose_of_request', 'business_justification',
            'expected_start_date'
        ];

        for (const field of requiredFields) {
            if (!data[field] || data[field].toString().trim() === '') {
                showNotification(`${field.replace(/_/g, ' ')} is required`, 'error');
                return false;
            }
        }
        return true;
    };

    const handleSave = async () => {
        if (!validateForm(formData)) return;
        setLoading(true);
        try {
            const cleanedData = prepareDataForSubmission(formData);
            if (id) {
                await api.patch(`/inventory/requests/${id}/`, cleanedData);
                showNotification('Request updated successfully', 'success');
            } else {
                await api.post('/inventory/requests/', cleanedData);
                showNotification('Request raised successfully', 'success');
            }
            onSave();
        } catch (error: any) {
            let errorMsg = 'Failed to save request';
            if (error.response?.data) {
                const data = error.response.data;
                if (data.error) errorMsg = data.error;
                else if (typeof data === 'object') {
                    const errors = [];
                    for (const [key, value] of Object.entries(data)) {
                        if (Array.isArray(value)) errors.push(`${key}: ${value[0]}`);
                        else if (typeof value === 'string') errors.push(`${key}: ${value}`);
                    }
                    if (errors.length > 0) errorMsg = errors.join(' | ');
                    else errorMsg = JSON.stringify(data);
                }
            }
            showNotification(errorMsg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!validateForm(formData)) return;
        setLoading(true);
        try {
            const cleanedData = prepareDataForSubmission(formData);
            let requestId = id;

            if (!requestId) {
                // For new requests, create them first
                const response = await api.post('/inventory/requests/', cleanedData);
                requestId = response.data.id;
            } else {
                // For existing requests, save latest changes first
                await api.patch(`/inventory/requests/${requestId}/`, cleanedData);
            }

            if (!requestId) {
                showNotification('Could not determine request ID', 'error');
                return;
            }

            // Now transition to SUBMITTED
            await api.post(`/inventory/requests/${requestId}/submit/`);
            showNotification('Request created and submitted.', 'success');
            onSave();
        } catch (error: any) {
            let errorMsg = 'Submission failed';
            if (error.response?.data) {
                const data = error.response.data;
                if (data.error) errorMsg = data.error;
                else if (typeof data === 'object') {
                    const errors = [];
                    for (const [key, value] of Object.entries(data)) {
                        if (Array.isArray(value)) errors.push(`${key}: ${value[0]}`);
                        else if (typeof value === 'string') errors.push(`${key}: ${value}`);
                    }
                    if (errors.length > 0) errorMsg = errors.join(' | ');
                    else errorMsg = JSON.stringify(data);
                }
            }
            showNotification(errorMsg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveIT = async () => {
        if (!id) return;
        try {
            await api.post(`/inventory/requests/${id}/approve_it/`, { remarks: formData.it_head_remarks });
            showNotification('Approved by IT and sent to Finance', 'success');
            onSave();
        } catch (error: any) {
            let errorMsg = 'IT Approval failed';
            if (error.response?.data) {
                const data = error.response.data;
                if (data.error) errorMsg = data.error;
                else if (typeof data === 'object') {
                    const errors = [];
                    for (const [key, value] of Object.entries(data)) {
                        if (Array.isArray(value)) errors.push(`${key}: ${value[0]}`);
                        else if (typeof value === 'string') errors.push(`${key}: ${value}`);
                    }
                    if (errors.length > 0) errorMsg = errors.join(' | ');
                    else errorMsg = JSON.stringify(data);
                }
            }
            showNotification(errorMsg, 'error');
        }
    };

    const handleApproveFinance = async () => {
        if (!id) return;
        try {
            await api.post(`/inventory/requests/${id}/approve_finance/`, { remarks: formData.finance_head_remarks });
            showNotification('Approved by Finance', 'success');
            onSave();
        } catch (error: any) {
            let errorMsg = 'Finance Approval failed';
            if (error.response?.data) {
                const data = error.response.data;
                if (data.error) errorMsg = data.error;
                else if (typeof data === 'object') {
                    const errors = [];
                    for (const [key, value] of Object.entries(data)) {
                        if (Array.isArray(value)) errors.push(`${key}: ${value[0]}`);
                        else if (typeof value === 'string') errors.push(`${key}: ${value}`);
                    }
                    if (errors.length > 0) errorMsg = errors.join(' | ');
                    else errorMsg = JSON.stringify(data);
                }
            }
            showNotification(errorMsg, 'error');
        }
    };

    const handleReject = async () => {
        if (!id) return;
        if (!rejectRemarks) {
            showNotification('Please enter rejection remarks', 'error');
            return;
        }
        try {
            await api.post(`/inventory/requests/${id}/reject/`, { remarks: rejectRemarks });
            showNotification('Request rejected', 'success');
            setShowRejectModal(false);
            setRejectRemarks('');
            onSave();
        } catch (error: any) {
            let errorMsg = 'Rejection failed';
            if (error.response?.data) {
                const data = error.response.data;
                if (data.error) errorMsg = data.error;
            }
            showNotification(errorMsg, 'error');
        }
    };

    const handleIssue = async () => {
        if (!id) return;
        const resourceId = prompt('Enter Server Asset ID to assign:');
        if (!resourceId) return;
        try {
            await api.post(`/inventory/requests/${id}/issue/`, { resource_id: resourceId });
            showNotification('Server issued successfully', 'success');
            onSave();
        } catch (error: any) {
            let errorMsg = 'Issuance failed';
            if (error.response?.data) {
                const data = error.response.data;
                if (data.error) errorMsg = data.error;
                else if (typeof data === 'object') {
                    const errors = [];
                    for (const [key, value] of Object.entries(data)) {
                        if (Array.isArray(value)) errors.push(`${key}: ${value[0]}`);
                        else if (typeof value === 'string') errors.push(`${key}: ${value}`);
                    }
                    if (errors.length > 0) errorMsg = errors.join(' | ');
                    else errorMsg = JSON.stringify(data);
                }
            }
            showNotification(errorMsg, 'error');
        }
    };

    if (loading) return <div className="p-12 text-center font-bold text-[#718096]">Loading...</div>;

    const isReadOnly = !!(id && formData.status !== 'DRAFT');

    const SectionHeader = ({ title, extra }: { title: string, extra?: React.ReactNode }) => (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                    width: '4px',
                    height: '18px',
                    background: 'var(--ae-blue)',
                    borderRadius: '2px'
                }}></span>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--theme-primary)', margin: 0 }}>
                    {title}
                </h3>
            </div>
            {extra}
        </div>
    );

    return (
        <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{
                background: 'white',
                border: '1px solid #E0E6ED',
                borderRadius: '12px',
                width: '100%',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div>
                    {/* Request Information */}
                    <div>
                        <SectionHeader title="Request Information" />
                        <div className="ae-grid-responsive-5" style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Request Date <span style={{ color: '#ef4444' }}>*</span></label>
                                {isReadOnly ? (
                                    <div className="ae-input" style={{ background: '#f8fafc', display: 'flex', alignItems: 'center', minHeight: '38px' }}>{formatToAppDate(formData.request_date)}</div>
                                ) : (
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="text"
                                            readOnly
                                            className="ae-input"
                                            style={{ height: '38px', padding: '4px 34px 4px 12px', width: '100%', cursor: 'pointer', background: 'white' }}
                                            value={formData.request_date ? formatToAppDate(formData.request_date) : ''}
                                            onClick={() => (document.getElementById('hidden-request-date') as HTMLInputElement)?.showPicker()}
                                            placeholder="DD/MMM/YYYY"
                                        />
                                        <Calendar
                                            size={16}
                                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ae-blue)', pointerEvents: 'none' }}
                                        />
                                        <input
                                            type="date"
                                            id="hidden-request-date"
                                            name="request_date"
                                            value={formData.request_date || ''}
                                            onChange={handleInputChange}
                                            style={{ position: 'absolute', opacity: 0, inset: 0, pointerEvents: 'none' }}
                                        />
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Form Number</label>
                                <input type="text" value={formData.form_number || 'Auto-generated'} className="ae-input" style={{ background: '#f8fafc' }} disabled />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Quantity <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    type="number"
                                    name="quantity"
                                    min="1"
                                    value={formData.quantity}
                                    onChange={handleInputChange}
                                    className="ae-input"
                                    disabled={isReadOnly}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Request Status</label>
                                <div className="ae-input" style={{ background: '#f8fafc', display: 'flex', alignItems: 'center', minHeight: '38px' }}>
                                    {formData.status_display || formData.status?.toLowerCase().replace('_', ' ') || 'Draft'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Requestor Details */}
                    <div style={{ borderTop: '1px solid #E0E6ED', paddingTop: '24px', marginTop: '24px' }}>
                        <SectionHeader title="Requestor Details" />
                        <div className="ae-grid-responsive-5" style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Employee ID <span style={{ color: '#ef4444' }}>*</span></label>
                                <input type="text" name="employee_id" value={formData.employee_id} onChange={handleInputChange} className="ae-input" placeholder="EMP1023" disabled={isReadOnly} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Employee Name</label>
                                <input type="text" value={user?.full_name || ''} className="ae-input" style={{ background: '#f8fafc' }} disabled />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Department <span style={{ color: '#ef4444' }}>*</span></label>
                                <SearchableDropdown
                                    options={[
                                        { value: 'Engineering', label: 'Engineering' },
                                        { value: 'Product', label: 'Product' },
                                        { value: 'IT', label: 'IT' },
                                        { value: 'Sales', label: 'Sales' },
                                        { value: 'HR', label: 'HR' }
                                    ]}
                                    value={formData.department}
                                    onChange={(val) => handleInputChange({ target: { name: 'department', value: val } } as any)}
                                    placeholder="Select Department"
                                    className="w-full"
                                    disabled={isReadOnly}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Designation <span style={{ color: '#ef4444' }}>*</span></label>
                                <SearchableDropdown
                                    options={[
                                        { value: 'Project Manager', label: 'Project Manager' },
                                        { value: 'Senior Developer', label: 'Senior Developer' },
                                        { value: 'Developer', label: 'Developer' },
                                        { value: 'QA Engineer', label: 'QA Engineer' },
                                        { value: 'DevOps Engineer', label: 'DevOps Engineer' },
                                        { value: 'Solution Architect', label: 'Solution Architect' }
                                    ]}
                                    value={formData.designation}
                                    onChange={(val) => handleInputChange({ target: { name: 'designation', value: val } } as any)}
                                    placeholder="Select Designation"
                                    className="w-full"
                                    disabled={isReadOnly}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Email ID</label>
                                <input type="email" value={user?.email || ''} className="ae-input" style={{ background: '#f8fafc' }} disabled />
                            </div>
                        </div>
                    </div>

                    {/* Project Details */}
                    <div style={{ borderTop: '1px solid #E0E6ED', paddingTop: '24px', marginTop: '24px' }}>
                        <SectionHeader title="Project Details" />
                        <div className="ae-grid-responsive-5" style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Project Name <span style={{ color: '#ef4444' }}>*</span></label>
                                <SearchableDropdown
                                    options={deals.map(d => ({
                                        value: d.deal_name,
                                        label: d.deal_name
                                    }))}
                                    value={formData.project_name}
                                    onChange={(val) => handleInputChange({ target: { name: 'project_name', value: val } } as any)}
                                    placeholder="Select Project"
                                    className="w-full"
                                    disabled={isReadOnly}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Project Code</label>
                                <input type="text" name="project_code" value={formData.project_code} onChange={handleInputChange} className="ae-input" disabled={isReadOnly} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Client Name <span style={{ color: '#ef4444' }}>*</span></label>
                                <SearchableDropdown
                                    options={[
                                        { value: 'ABC Corp', label: 'ABC Corp' },
                                        { value: 'XYZ Ltd', label: 'XYZ Ltd' },
                                        { value: 'Global Tech', label: 'Global Tech' },
                                        { value: 'Innovate Inc', label: 'Innovate Inc' }
                                    ]}
                                    value={formData.client_name}
                                    onChange={(val) => handleInputChange({ target: { name: 'client_name', value: val } } as any)}
                                    placeholder="Select Client"
                                    className="w-full"
                                    disabled={isReadOnly}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Environment <span style={{ color: '#ef4444' }}>*</span></label>
                                <SearchableDropdown
                                    options={[
                                        { value: 'DEVELOPMENT', label: 'Development' },
                                        { value: 'QA', label: 'QA' },
                                        { value: 'PRODUCTION', label: 'Production' }
                                    ]}
                                    value={formData.environment}
                                    onChange={(val) => handleInputChange({ target: { name: 'environment', value: val } } as any)}
                                    placeholder="Select Environment"
                                    className="w-full"
                                    disabled={isReadOnly}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    {/* Server Configuration */}
                    <div style={{ borderTop: '1px solid #E0E6ED', paddingTop: '24px', marginTop: '24px' }}>
                        <SectionHeader title="Server Configuration" />
                        <div className="ae-grid-responsive-5" style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Resource Type <span style={{ color: '#ef4444' }}>*</span></label>
                                <SearchableDropdown
                                    options={[
                                        { value: 'Server', label: 'Server' },
                                        { value: 'Database', label: 'Database' },
                                        { value: 'Storage', label: 'Storage' }
                                    ]}
                                    value={formData.resource_type_requested}
                                    onChange={(val) => handleInputChange({ target: { name: 'resource_type_requested', value: val } } as any)}
                                    placeholder="Select Resource Type"
                                    className="w-full"
                                    disabled={isReadOnly}
                                />
                            </div>
                            <div style={{ display: 'contents' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Server Type</label>
                                    <SearchableDropdown
                                        options={[
                                            { value: 'EC2', label: 'EC2' },
                                            { value: 'Physical', label: 'Physical Server' },
                                            { value: 'Virtual Machine', label: 'Virtual Machine' }
                                        ]}
                                        value={formData.server_type}
                                        onChange={(val) => handleInputChange({ target: { name: 'server_type', value: val } } as any)}
                                        placeholder="Select Server Type"
                                        className="w-full"
                                        disabled={isReadOnly}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Server Category</label>
                                    <SearchableDropdown
                                        options={[
                                            { value: 'Virtual', label: 'Virtual' },
                                            { value: 'Physical', label: 'Physical' },
                                            { value: 'Hybrid', label: 'Hybrid' }
                                        ]}
                                        value={formData.server_category}
                                        onChange={(val) => handleInputChange({ target: { name: 'server_category', value: val } } as any)}
                                        placeholder="Select Category"
                                        className="w-full"
                                        disabled={isReadOnly}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'contents' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Cloud Provider <span style={{ color: '#ef4444' }}>*</span></label>
                                    <SearchableDropdown
                                        options={[
                                            { value: 'AWS', label: 'AWS' },
                                            { value: 'Azure', label: 'Azure' },
                                            { value: 'GCP', label: 'GCP' },
                                            { value: 'On-Premise', label: 'On-Premise' }
                                        ]}
                                        value={formData.cloud_provider}
                                        onChange={(val) => handleInputChange({ target: { name: 'cloud_provider', value: val } } as any)}
                                        placeholder="Select Provider"
                                        className="w-full"
                                        disabled={isReadOnly}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Region <span style={{ color: '#ef4444' }}>*</span></label>
                                    <SearchableDropdown
                                        options={[
                                            { value: 'ap-south-1', label: 'ap-south-1 (Mumbai)' },
                                            { value: 'us-east-1', label: 'us-east-1 (N. Virginia)' },
                                            { value: 'eu-west-1', label: 'eu-west-1 (Ireland)' }
                                        ]}
                                        value={formData.region}
                                        onChange={(val) => handleInputChange({ target: { name: 'region', value: val } } as any)}
                                        placeholder="Select Region"
                                        className="w-full"
                                        disabled={isReadOnly}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'contents' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Instance Type</label>
                                    <SearchableDropdown
                                        options={[
                                            { value: 't3a.2xlarge', label: 't3a.2xlarge' },
                                            { value: 't3.medium', label: 't3.medium' },
                                            { value: 'm5.large', label: 'm5.large' },
                                            { value: 'c5.xlarge', label: 'c5.xlarge' }
                                        ]}
                                        value={formData.instance_type}
                                        onChange={(val) => handleInputChange({ target: { name: 'instance_type', value: val } } as any)}
                                        placeholder="Select Instance"
                                        className="w-full"
                                        disabled={isReadOnly}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Operating System</label>
                                    <SearchableDropdown
                                        options={[
                                            { value: 'Amazon Linux 2', label: 'Amazon Linux 2' },
                                            { value: 'Ubuntu 20.04', label: 'Ubuntu 20.04' },
                                            { value: 'Windows Server 2019', label: 'Windows Server 2019' },
                                            { value: 'RHEL 8', label: 'RHEL 8' }
                                        ]}
                                        value={formData.os}
                                        onChange={(val) => handleInputChange({ target: { name: 'os', value: val } } as any)}
                                        placeholder="Select OS"
                                        className="w-full"
                                        disabled={isReadOnly}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'contents' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>CPU Cores <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input type="number" name="cpu_cores" value={formData.cpu_cores} onChange={handleInputChange} className="ae-input" disabled={isReadOnly} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>RAM (GB) <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input type="number" name="ram_gb" value={formData.ram_gb} onChange={handleInputChange} className="ae-input" disabled={isReadOnly} />
                                </div>
                            </div>
                            <div style={{ display: 'contents' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Storage Type <span style={{ color: '#ef4444' }}>*</span></label>
                                    <SearchableDropdown
                                        options={[
                                            { value: 'SSD', label: 'SSD' },
                                            { value: 'HDD', label: 'HDD' },
                                            { value: 'NVMe', label: 'NVMe' }
                                        ]}
                                        value={formData.storage_type}
                                        onChange={(val) => handleInputChange({ target: { name: 'storage_type', value: val } } as any)}
                                        placeholder="Select Type"
                                        className="w-full"
                                        disabled={isReadOnly}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Storage Size (GB) <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input type="number" name="storage_size_gb" value={formData.storage_size_gb} onChange={handleInputChange} className="ae-input" disabled={isReadOnly} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Database / RDS Details */}
                    <div style={{ borderTop: '1px solid #E0E6ED', paddingTop: '24px', marginTop: '24px' }}>
                        <SectionHeader title="Database / RDS Details" />
                        <div className="ae-grid-responsive-5" style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Database Required</label>
                                <div style={{ display: 'flex', background: '#F1F5F9', padding: '3px', borderRadius: '8px', width: 'fit-content', height: '38px', alignItems: 'center' }}>
                                    <button
                                        type="button"
                                        onClick={() => !isReadOnly && setFormData((p: any) => ({ ...p, database_required: true }))}
                                        style={{
                                            height: '32px',
                                            padding: '0 16px',
                                            borderRadius: '6px',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            cursor: isReadOnly ? 'not-allowed' : 'pointer',
                                            background: formData.database_required ? 'white' : 'transparent',
                                            color: formData.database_required ? 'var(--ae-blue)' : '#64748B',
                                            border: 'none',
                                            boxShadow: formData.database_required ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                            transition: 'all 0.2s'
                                        }}
                                    >Yes</button>
                                    <button
                                        type="button"
                                        onClick={() => !isReadOnly && setFormData((p: any) => ({ ...p, database_required: false, rds_type: '', database_engine: '', db_storage_gb: '' }))}
                                        style={{
                                            height: '32px',
                                            padding: '0 16px',
                                            borderRadius: '6px',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            cursor: isReadOnly ? 'not-allowed' : 'pointer',
                                            background: !formData.database_required ? 'white' : 'transparent',
                                            color: !formData.database_required ? 'var(--ae-blue)' : '#64748B',
                                            border: 'none',
                                            boxShadow: !formData.database_required ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                            transition: 'all 0.2s'
                                        }}
                                    >No</button>
                                </div>
                            </div>

                            {formData.database_required && (
                                <>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>RDS Type</label>
                                        <SearchableDropdown
                                            options={[
                                                { value: 'db.t3.small', label: 'db.t3.small' },
                                                { value: 'db.t3.medium', label: 'db.t3.medium' },
                                                { value: 'db.m5.large', label: 'db.m5.large' }
                                            ]}
                                            value={formData.rds_type}
                                            onChange={(val) => handleInputChange({ target: { name: 'rds_type', value: val } } as any)}
                                            placeholder="Select Type"
                                            className="w-full"
                                            disabled={isReadOnly}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Database Engine</label>
                                        <SearchableDropdown
                                            options={[
                                                { value: 'MySQL', label: 'MySQL' },
                                                { value: 'PostgreSQL', label: 'PostgreSQL' },
                                                { value: 'SQL Server', label: 'SQL Server' }
                                            ]}
                                            value={formData.database_engine}
                                            onChange={(val) => handleInputChange({ target: { name: 'database_engine', value: val } } as any)}
                                            placeholder="Select Engine"
                                            className="w-full"
                                            disabled={isReadOnly}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>DB Storage (GB)</label>
                                        <input
                                            type="number"
                                            name="db_storage_gb"
                                            value={formData.db_storage_gb}
                                            onChange={handleInputChange}
                                            className="ae-input"
                                            style={{ height: '38px' }}
                                            disabled={isReadOnly}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Backup Required</label>
                                        <div
                                            onClick={() => !isReadOnly && setFormData((p: any) => ({ ...p, backup_required: !formData.backup_required }))}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                cursor: isReadOnly ? 'not-allowed' : 'pointer',
                                                background: formData.backup_required ? '#EBF8FF' : '#F8FAFC',
                                                padding: '0 16px',
                                                height: '38px',
                                                borderRadius: '8px',
                                                border: `1px solid ${formData.backup_required ? '#3182CE' : '#E2E8F0'}`,
                                                width: 'fit-content',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{
                                                width: '18px',
                                                height: '18px',
                                                borderRadius: '4px',
                                                border: `2px solid ${formData.backup_required ? '#3182CE' : '#CBD5E1'}`,
                                                background: formData.backup_required ? '#3182CE' : 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.2s'
                                            }}>
                                                {formData.backup_required && <Check size={14} color="white" strokeWidth={4} />}
                                            </div>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: formData.backup_required ? '#2B6CB0' : '#64748B' }}>Enable Daily Backup</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Usage & Justification */}
                    <div style={{ borderTop: '1px solid #E0E6ED', paddingTop: '24px', marginTop: '24px' }}>
                        <SectionHeader title="Usage & Justification" />
                        <div className="ae-grid-responsive-5" style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Purpose of Request <span style={{ color: '#ef4444' }}>*</span></label>
                                <AutoExpandingTextarea
                                    name="purpose_of_request"
                                    value={formData.purpose_of_request}
                                    onChange={handleInputChange}
                                    disabled={isReadOnly}
                                    placeholder="Enter purpose"
                                    style={{
                                        minHeight: '48px',
                                        padding: '8px 12px',
                                        width: '100%',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem'
                                    }}
                                    maxRows={5}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Business Justification <span style={{ color: '#ef4444' }}>*</span></label>
                                <AutoExpandingTextarea
                                    name="business_justification"
                                    value={formData.business_justification}
                                    onChange={handleInputChange}
                                    disabled={isReadOnly}
                                    placeholder="Enter justification"
                                    style={{
                                        minHeight: '48px',
                                        padding: '8px 12px',
                                        width: '100%',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem'
                                    }}
                                    maxRows={5}
                                />
                            </div>
                            <div style={{ display: 'contents' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Expected Start Date <span style={{ color: '#ef4444' }}>*</span></label>
                                    {isReadOnly ? (
                                        <div className="ae-input" style={{ background: '#f8fafc', display: 'flex', alignItems: 'center', minHeight: '38px' }}>{formatToAppDate(formData.expected_start_date)}</div>
                                    ) : (
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="text"
                                                readOnly
                                                className="ae-input"
                                                style={{ height: '38px', padding: '4px 34px 4px 12px', width: '100%', cursor: 'pointer', background: 'white' }}
                                                value={formData.expected_start_date ? formatToAppDate(formData.expected_start_date) : ''}
                                                onClick={() => (document.getElementById('hidden-start-date') as HTMLInputElement)?.showPicker()}
                                                placeholder="Enter date"
                                            />
                                            <Calendar
                                                size={16}
                                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ae-blue)', pointerEvents: 'none' }}
                                            />
                                            <input
                                                type="date"
                                                id="hidden-start-date"
                                                name="expected_start_date"
                                                value={formData.expected_start_date || ''}
                                                onChange={handleInputChange}
                                                style={{ position: 'absolute', opacity: 0, inset: 0, pointerEvents: 'none' }}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Expected End Date</label>
                                    {isReadOnly ? (
                                        <div className="ae-input" style={{ background: '#f8fafc', display: 'flex', alignItems: 'center', minHeight: '38px' }}>{formatToAppDate(formData.expected_end_date)}</div>
                                    ) : (
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="text"
                                                readOnly
                                                className="ae-input"
                                                style={{ height: '38px', padding: '4px 34px 4px 12px', width: '100%', cursor: 'pointer', background: 'white' }}
                                                value={formData.expected_end_date ? formatToAppDate(formData.expected_end_date) : ''}
                                                onClick={() => (document.getElementById('hidden-end-date') as HTMLInputElement)?.showPicker()}
                                                placeholder="Enter date"
                                            />
                                            <Calendar
                                                size={16}
                                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ae-blue)', pointerEvents: 'none' }}
                                            />
                                            <input
                                                type="date"
                                                id="hidden-end-date"
                                                name="expected_end_date"
                                                value={formData.expected_end_date || ''}
                                                onChange={handleInputChange}
                                                style={{ position: 'absolute', opacity: 0, inset: 0, pointerEvents: 'none' }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Issuance Details */}
                    <div style={{ borderTop: '1px solid #E0E6ED', paddingTop: '24px', marginTop: '24px' }}>
                        <SectionHeader title="Issuance Details" />
                        <div className="ae-grid-responsive-5" style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Server Asset ID</label>
                                <input
                                    type="text"
                                    value={formData.resource_assigned_detail?.server_name || 'N/A'}
                                    className="ae-input"
                                    style={{ background: '#f8fafc', fontWeight: 700 }}
                                    disabled
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Issued Date</label>
                                <div className="ae-input" style={{ background: '#f8fafc', display: 'flex', alignItems: 'center', minHeight: '38px' }}>{formData.issued_at ? formatToAppDate(formData.issued_at) : 'N/A'}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Issued By</label>
                                <input
                                    type="text"
                                    value={formData.issued_by_detail?.full_name || 'System'}
                                    className="ae-input"
                                    style={{ background: '#f8fafc' }}
                                    disabled
                                />
                            </div>
                            <div className="col-span-3" style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Allocation Status</label>
                                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-[#E3F2FD] text-[#1E88E5]">
                                    {formData.status === 'ISSUED' ? 'Issued' : 'N/A'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'var(--bg-primary)',
                    padding: '6px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-primary)',
                    boxShadow: 'var(--shadow-sm)',
                    width: 'fit-content',
                    flexShrink: 0,
                    zIndex: 10,
                    marginTop: '10px',
                    marginLeft: 'auto'
                }}
                className="button-container"
                onMouseLeave={() => {
                    if (!isConfirmingExit) {
                        setActiveAction('submit');
                    }
                }}
            >
                {
                    formData.status === 'DRAFT' && (
                        <>
                            <button
                                onClick={handleSave}
                                onMouseEnter={() => !isConfirmingExit && setActiveAction('draft')}
                                style={{
                                    height: '38px',
                                    padding: '0 18px',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    border: 'none',
                                    background: activeAction === 'draft' ? 'var(--theme-primary)' : 'transparent',
                                    color: activeAction === 'draft' ? 'white' : 'var(--text-secondary)',
                                    transition: 'all 0.2s',
                                    cursor: 'pointer',
                                    boxShadow: activeAction === 'draft' ? '0 2px 8px rgba(255, 107, 0, 0.2)' : 'none'
                                }}
                            >
                                <Save size={16} />
                                <span>Save as Draft</span>
                            </button>

                            <button
                                onClick={handleSubmit}
                                onMouseEnter={() => !isConfirmingExit && setActiveAction('submit')}
                                style={{
                                    height: '38px',
                                    padding: '0 20px',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: activeAction === 'submit' ? 'var(--theme-primary)' : 'transparent',
                                    color: activeAction === 'submit' ? 'white' : 'var(--text-secondary)',
                                    border: 'none',
                                    transition: 'all 0.2s',
                                    cursor: 'pointer',
                                    boxShadow: activeAction === 'submit' ? '0 2px 8px rgba(255, 107, 0, 0.2)' : 'none'
                                }}
                            >
                                <PlusCircle size={18} />
                                <span>Submit Request</span>
                            </button>
                        </>
                    )
                }

                {
                    formData.status === 'SUBMITTED' && (user.role === 'project_manager' || user.role === 'app_admin') && (
                        <button
                            onClick={handleSubmitToIT}
                            style={{
                                height: '38px',
                                padding: '0 20px',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'var(--ae-blue)',
                                color: 'white',
                                border: 'none',
                                transition: 'all 0.2s',
                                cursor: 'pointer'
                            }}
                        >
                            <Send size={16} />
                            <span>Submit to IT Head</span>
                        </button>
                    )
                }

                {
                    formData.status === 'PENDING_IT' && (user.role === 'it_head' || user.role === 'app_admin') && (
                        <>
                            <button
                                onClick={handleApproveIT}
                                style={{
                                    height: '38px',
                                    padding: '0 20px',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: '#00C853',
                                    color: 'white',
                                    border: 'none',
                                    transition: 'all 0.2s',
                                    cursor: 'pointer'
                                }}
                            >
                                <CheckCircle size={16} />
                                <span>Approve (IT)</span>
                            </button>
                            <button
                                onClick={() => setShowRejectModal(true)}
                                style={{
                                    height: '38px',
                                    padding: '0 20px',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: '#FF3D00',
                                    color: 'white',
                                    border: 'none',
                                    transition: 'all 0.2s',
                                    cursor: 'pointer'
                                }}
                            >
                                <XCircle size={16} />
                                <span>Reject</span>
                            </button>
                        </>
                    )
                }

                {
                    formData.status === 'PENDING_FINANCE' && (user.role === 'finance_manager' || user.role === 'app_admin') && (
                        <>
                            <button
                                onClick={handleApproveFinance}
                                style={{
                                    height: '38px',
                                    padding: '0 20px',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: '#00C853',
                                    color: 'white',
                                    border: 'none',
                                    transition: 'all 0.2s',
                                    cursor: 'pointer'
                                }}
                            >
                                <CheckCircle size={16} />
                                <span>Approve (Finance)</span>
                            </button>
                            <button
                                onClick={() => setShowRejectModal(true)}
                                style={{
                                    height: '38px',
                                    padding: '0 20px',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: '#FF3D00',
                                    color: 'white',
                                    border: 'none',
                                    transition: 'all 0.2s',
                                    cursor: 'pointer'
                                }}
                            >
                                <XCircle size={16} />
                                <span>Reject</span>
                            </button>
                        </>
                    )
                }

                {
                    formData.status === 'APPROVED' && (user.role === 'issuing_authority' || user.role === 'app_admin') && (
                        <button
                            onClick={handleIssue}
                            style={{
                                height: '38px',
                                padding: '0 20px',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'var(--ae-blue)',
                                color: 'white',
                                border: 'none',
                                transition: 'all 0.2s',
                                cursor: 'pointer'
                            }}
                        >
                            <Server size={16} />
                            <span>Issue Server</span>
                        </button>
                    )
                }

                <button
                    onClick={() => {
                        setIsConfirmingExit(true);
                        showConfirm({
                            title: 'Are you sure you want to exit?',
                            onConfirm: () => onBack(),
                            onCancel: () => {
                                setIsConfirmingExit(false);
                                setActiveAction('submit');
                            }
                        });
                    }}
                    onMouseEnter={() => !isConfirmingExit && setActiveAction('cancel')}
                    style={{
                        height: '38px',
                        padding: '0 18px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        border: 'none',
                        background: activeAction === 'cancel' ? 'var(--theme-primary)' : 'transparent',
                        color: activeAction === 'cancel' ? 'white' : 'var(--text-secondary)',
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        boxShadow: activeAction === 'cancel' ? '0 2px 8px rgba(255, 107, 0, 0.2)' : 'none'
                    }}
                >
                    <X size={18} />
                    <span>Cancel</span>
                </button>
            </div>

            {/* Rejection Modal */}
            {
                showRejectModal && createPortal(
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.4)',
                            backdropFilter: 'blur(8px)',
                            zIndex: 10000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onClick={() => setShowRejectModal(false)}
                    >
                        <div
                            style={{
                                background: 'var(--bg-primary)',
                                borderRadius: '16px',
                                padding: '28px 32px',
                                minWidth: '380px',
                                maxWidth: '480px',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                <XCircle size={20} color='#E53E3E' />
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                    Reject Resource Request
                                </h3>
                            </div>
                            <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                Please provide a reason for rejection:
                            </p>
                            <AutoExpandingTextarea
                                autoFocus
                                value={rejectRemarks}
                                onChange={e => setRejectRemarks(e.target.value)}
                                placeholder="Enter remarks here..."
                                style={{
                                    minHeight: '48px',
                                    padding: '8px 12px',
                                    width: '100%',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-primary)',
                                    outline: 'none',
                                    fontSize: '0.85rem'
                                }}
                            />
                            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                                <button
                                    onClick={() => setShowRejectModal(false)}
                                    style={{ flex: 1, height: '38px', borderRadius: '8px', border: '1px solid var(--border-primary)', background: 'white', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReject}
                                    style={{ flex: 1, height: '38px', borderRadius: '8px', border: 'none', background: '#E53E3E', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Confirm Reject
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }
        </div>
    );
};

export default ResourceRequestForm;
