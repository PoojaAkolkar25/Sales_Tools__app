import React, { useState, useEffect } from 'react';
import {
    ChevronLeft,
    Users,
    Briefcase,
    Plus,
    Trash2,
    Paperclip,
    Download,
    Loader2,
    RefreshCcw,
    File,
    History as HistoryIcon,
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import AuditTrail from './AuditTrail';

interface DealFormProps {
    id: number | null;
    onBack: () => void;
    onSave: () => void;
}

const DealForm: React.FC<DealFormProps> = ({ id, onBack, onSave }) => {
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [leads, setLeads] = useState<any[]>([]);
    const [partners, setPartners] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);

    // Modal states for "Add New"
    const [showAddModal, setShowAddModal] = useState<{ type: string, show: boolean }>({ type: '', show: false });
    const [newItemName, setNewItemName] = useState('');
    const [newItemExtra, setNewItemExtra] = useState({ email: '', contact: '' });

    // Attachment states
    const [attachments, setAttachments] = useState<any[]>([]);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadFeedback, setUploadFeedback] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' });

    const [showHistory, setShowHistory] = useState(false);

    const [formData, setFormData] = useState<any>({
        company: 'AE IND',
        deal_name: '',
        deal_date: new Date().toISOString().split('T')[0],
        lead: '',
        stage: 'DEAL_CREATED',
        currency: 'INR',
        fx_rate: 1.0,
        deal_amount: '0',
        deal_type: '',
        description: '',
        customer: '',
        customer_email: '',
        end_customer: '',
        client_type: '',
        inside_salesperson: '',
        inside_sales_head: '',
        salesperson_name: '',
        sales_head: '',
        project_manager: '',
        project_manager_head: '',
        expected_close_date: '',
        remark: '',
        won_lost_reason: '',
        hubspot_id: '',
        last_synced_at: '',
        deal_types: [{ type: '', description: '', amount: '0', quantity: 1 }]
    });

    useEffect(() => {
        fetchInitialData();
        if (id) {
            fetchDealDetails();
        }
    }, [id]);

    const fetchInitialData = async () => {
        try {
            const [leadsRes, partnersRes, customersRes] = await Promise.all([
                api.get('/leads/'),
                api.get('/partners/'),
                api.get('/customers/')
            ]);
            setLeads(leadsRes.data);
            setPartners(partnersRes.data);
            setCustomers(customersRes.data);
        } catch (error) {
            console.error('Error fetching initial data', error);
        }
    };

    const fetchDealDetails = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/deals/${id}/`);
            const data = response.data;
            // Map nulls to empty strings for form fields
            Object.keys(data).forEach(key => {
                if (data[key] === null) data[key] = '';
            });

            // Ensure deal_types has at least one row
            if (!data.deal_types || data.deal_types.length === 0) {
                data.deal_types = [{ type: '', description: '', amount: '0', quantity: 1 }];
            }

            setFormData(data);
            setAttachments(data.deal_attachments || []);
        } catch (error) {
            console.error('Error fetching deal details', error);
            showNotification('Error loading deal details', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        if (value === 'ADD_NEW') {
            setShowAddModal({ type: name, show: true });
            return;
        }

        setFormData((prev: any) => ({ ...prev, [name]: value }));

        // Auto-populate from lead
        if (name === 'lead' && value) {
            const selectedLead = leads.find(l => l.id === parseInt(value));
            if (selectedLead) {
                setFormData((prev: any) => ({
                    ...prev,
                    lead: value,
                    customer_name: selectedLead.customer_name,
                    project_manager: selectedLead.project_manager || prev.project_manager,
                    salesperson_name: selectedLead.sales_person || prev.salesperson_name
                }));

                // Auto-select customer if exists in master
                const matchedCustomer = customers.find(c => c.name === selectedLead.customer_name);
                if (matchedCustomer) {
                    setFormData((prev: any) => ({ ...prev, customer: matchedCustomer.id }));
                }
            }
        }

        // Auto-populate email from customer selection
        if (name === 'customer' && value !== '') {
            const selectedCustomer = customers.find(c => c.id === parseInt(value));
            if (selectedCustomer) {
                setFormData((prev: any) => ({
                    ...prev,
                    customer_email: selectedCustomer.email || prev.customer_email
                }));
            }
        }
    };

    const handleDealTypeChange = (index: number, field: string, value: any) => {
        const updatedTypes = [...(formData.deal_types || [])];
        updatedTypes[index] = { ...updatedTypes[index], [field]: value };

        // Auto-calculate total deal amount
        const totalAmount = updatedTypes.reduce((sum: number, item: any) => {
            const amount = parseFloat(item.amount) || 0;
            const qty = parseInt(item.quantity) || 0;
            return sum + (amount * qty);
        }, 0);

        setFormData((prev: any) => ({
            ...prev,
            deal_types: updatedTypes,
            deal_amount: totalAmount.toString(),
            // Set primary deal type from the first row if available
            deal_type: updatedTypes[0]?.type || prev.deal_type
        }));
    };

    const addDealTypeRow = () => {
        setFormData((prev: any) => ({
            ...prev,
            deal_types: [...(prev.deal_types || []), { type: '', description: '', amount: '0', quantity: 1 }]
        }));
    };

    const removeDealTypeRow = (index: number) => {
        const updatedTypes = (formData.deal_types || []).filter((_: any, i: number) => i !== index);
        const totalAmount = updatedTypes.reduce((sum: number, item: any) => {
            const amount = parseFloat(item.amount) || 0;
            const qty = parseInt(item.quantity) || 0;
            return sum + (amount * qty);
        }, 0);

        setFormData((prev: any) => ({
            ...prev,
            deal_types: updatedTypes,
            deal_amount: totalAmount.toString(),
            deal_type: updatedTypes[0]?.type || ''
        }));
    };

    const handleHubSpotSync = async () => {
        if (!id) {
            showNotification('Save the project first before syncing with HubSpot', 'warning');
            return;
        }
        setSyncing(true);
        try {
            const response = await api.post(`/deals/${id}/sync_hubspot/`);
            showNotification(response.data.message, 'success');
            fetchDealDetails();
        } catch (error: any) {
            showNotification(error.response?.data?.message || 'HubSpot sync failed', 'error');
        } finally {
            setSyncing(false);
        }
    };

    const handleAddNew = async () => {
        if (!newItemName) return;
        setLoading(true);
        try {
            let res;
            switch (showAddModal.type) {
                case 'implementation_partner':
                    res = await api.post('/partners/', { name: newItemName });
                    setPartners([...partners, res.data]);
                    break;
                case 'customer':
                    res = await api.post('/customers/', { name: newItemName, email: newItemExtra.email });
                    setCustomers([...customers, res.data]);
                    break;
            }
            if (res) {
                setFormData((prev: any) => ({ ...prev, [showAddModal.type]: res.data.id }));
                showNotification('Added successfully', 'success');
            }
            setShowAddModal({ type: '', show: false });
            setNewItemName('');
            setNewItemExtra({ email: '', contact: '' });
        } catch (error: any) {
            const errorMsg = error.response?.data?.name?.[0] || error.response?.data?.detail || 'Error adding new item';
            showNotification(errorMsg, 'error');
        } finally {
            setLoading(false);
        }
    };


    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!id) {
            // For new deals, keep files in pending state
            setPendingFiles(prev => [...prev, file]);
            setUploadFeedback({ type: 'success', message: 'File added to list' });
            setTimeout(() => setUploadFeedback({ type: '', message: '' }), 3000);
            if (e.target) e.target.value = '';
            return;
        }

        setUploading(true);
        setUploadFeedback({ type: '', message: '' });

        try {
            const uploadData = new FormData();
            uploadData.append('file', file);

            const response = await api.post(`/deals/${id}/upload_attachment/`, uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setAttachments([...attachments, response.data]);
            setUploadFeedback({ type: 'success', message: 'File uploaded successfully' });
            setTimeout(() => setUploadFeedback({ type: '', message: '' }), 4000);
        } catch (error) {
            console.error('Error uploading file', error);
            setUploadFeedback({ type: 'error', message: 'Failed to upload file' });
        } finally {
            setUploading(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleRemovePending = (index: number) => {
        setPendingFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleDownload = (att: any) => {
        const link = document.createElement('a');
        link.href = att.file;
        link.download = att.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDeleteAttachment = async (attId: number) => {
        if (!id) return;
        try {
            await api.delete(`/deals/${id}/delete_attachment/?attachment_id=${attId}`);
            setAttachments(attachments.filter(a => a.id !== attId));
            showNotification('Attachment deleted', 'success');
        } catch (error) {
            console.error('Error deleting attachment', error);
            showNotification('Failed to delete attachment', 'error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.deal_name || !formData.deal_amount) {
            showNotification('Please fill in required fields (Project Name and Amount)', 'warning');
            return;
        }

        setLoading(true);
        try {
            const dataToSubmit = { ...formData };
            dataToSubmit.deal_amount = formData.deal_amount ? parseFloat(formData.deal_amount) : 0;
            dataToSubmit.fx_rate = formData.fx_rate ? parseFloat(formData.fx_rate) : 1.0;

            const nullableFields = [
                'lead', 'implementation_partner',
                'expected_close_date', 'customer'
            ];

            nullableFields.forEach(field => {
                if (!dataToSubmit[field] || dataToSubmit[field] === '') {
                    dataToSubmit[field] = null;
                }
            });

            delete dataToSubmit.hubspot_id;
            delete dataToSubmit.last_synced_at;
            delete dataToSubmit.created_at;
            delete dataToSubmit.updated_at;

            let finalId = id;
            if (id) {
                await api.put(`/deals/${id}/`, dataToSubmit);
                showNotification('Project updated successfully', 'success');
            } else {
                const res = await api.post('/deals/', dataToSubmit);
                finalId = res.data.id;
                showNotification('Project created successfully', 'success');
            }

            // Upload pending files if any
            if (finalId && pendingFiles.length > 0) {
                setUploading(true);
                showNotification(`Uploading ${pendingFiles.length} attachments...`, 'info');

                const uploadPromises = pendingFiles.map(file => {
                    const uploadData = new FormData();
                    uploadData.append('file', file);
                    return api.post(`/deals/${finalId}/upload_attachment/`, uploadData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                });

                try {
                    await Promise.all(uploadPromises);
                    showNotification('All attachments uploaded successfully', 'success');
                } catch (uploadError) {
                    console.error('Error uploading some files', uploadError);
                    showNotification('Deal saved but some attachments failed to upload', 'error');
                } finally {
                    setUploading(false);
                    setPendingFiles([]);
                }
            }

            onSave();
            onBack();
        } catch (error: any) {
            console.error('Error saving project', error);
            const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : 'Error saving project';
            showNotification(errorMsg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const SectionHeader = ({ icon: Icon, title, extra }: { icon: any, title: string, extra?: React.ReactNode }) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '8px', borderBottom: '1px solid #E0E6ED' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon size={18} className="text-[#FF6B00]" />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#2D3748' }}>{title}</h3>
            </div>
            {extra}
        </div>
    );

    return (
        <div className="space-y-6" style={{ padding: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                    onClick={onBack}
                    style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', color: '#718096', cursor: 'pointer', fontWeight: 600 }}
                >
                    <ChevronLeft size={20} /> Back to Dashboard
                </button>
                <div style={{ display: 'flex', gap: '12px' }}>
                    {id && (
                        <>
                            <button
                                type="button"
                                onClick={() => setShowHistory(true)}
                                className="ae-btn-secondary"
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <HistoryIcon size={18} />
                                History
                            </button>
                            <button
                                type="button"
                                onClick={handleHubSpotSync}
                                disabled={syncing}
                                className="ae-btn-secondary"
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <RefreshCcw size={18} className={syncing ? 'animate-spin' : ''} />
                                {syncing ? 'Syncing...' : 'Sync HubSpot'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. Deal Information */}
                <div className="section-panel" style={{ padding: '24px' }}>
                    <SectionHeader icon={Briefcase} title="Deal Information" />
                    <div className="ae-grid-4">
                        <div className="ae-input-group">
                            <label className="ae-label">Company Name *</label>
                            <select name="company" value={formData.company} onChange={handleInputChange} className="ae-input" required>
                                <option value="AE IND">AE IND</option>
                                <option value="AE USA">AE USA</option>
                            </select>
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Lead Date</label>
                            <input
                                type="date"
                                value={formData.lead ? leads.find(l => l.id === parseInt(formData.lead))?.lead_date || '' : ''}
                                className="ae-input"
                                disabled
                                style={{ background: '#F7FAFC', color: '#718096', cursor: 'not-allowed' }}
                            />
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Lead Number</label>
                            <input
                                type="text"
                                value={formData.lead ? leads.find(l => l.id === parseInt(formData.lead))?.lead_no || 'No Lead Linked' : 'No Lead Linked'}
                                className="ae-input"
                                disabled
                                style={{ background: '#F7FAFC', color: '#718096', cursor: 'not-allowed' }}
                            />
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Deal Date *</label>
                            <input
                                type="date"
                                name="deal_date"
                                value={formData.deal_date}
                                className="ae-input"
                                disabled
                                style={{ background: '#F7FAFC', color: '#718096', cursor: 'not-allowed' }}
                                required
                            />
                        </div>
                    </div>

                    <div className="ae-grid-4 mt-6">
                        <div className="ae-input-group">
                            <label className="ae-label">Deal Number</label>
                            <input
                                type="text"
                                value={id ? formData.deal_id : 'System Generated'}
                                className="ae-input"
                                disabled
                                style={{ background: '#F7FAFC', color: '#718096', cursor: 'not-allowed' }}
                            />
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Customer/Partner Name</label>
                            <select name="customer" value={formData.customer} onChange={handleInputChange} className="ae-input">
                                <option value="">Select Customer</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                <option value="ADD_NEW" style={{ fontWeight: 700, color: '#FF6B00' }}>+ Add New Customer</option>
                            </select>
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">End Customer</label>
                            <input
                                type="text"
                                name="end_customer"
                                value={formData.end_customer}
                                onChange={handleInputChange}
                                className="ae-input"
                                placeholder="Enter end customer name"
                            />
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Project Name *</label>
                            <input
                                type="text"
                                name="deal_name"
                                value={formData.deal_name}
                                onChange={handleInputChange}
                                className="ae-input"
                                placeholder="AutomationEdge Project ABC"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* 2 & 3 Combined. Deal Value */}
                <div className="section-panel" style={{ padding: '12px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#FF6B00', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '4px', height: '20px', background: '#0066CC', borderRadius: '2px' }}></span>
                            Deal Value
                        </h3>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px' }}>
                            <thead>
                                <tr style={{ background: '#F8FAFC' }}>
                                    <th style={{ padding: '12px 8px', width: '40px' }}></th>
                                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#4A5568', width: '50px' }}>Sr.No.</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#4A5568', width: '200px' }}>Type *</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#4A5568' }}>Description</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#4A5568', width: '100px' }}>Currency</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#4A5568', width: '80px' }}>Qty</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 700, color: '#4A5568', width: '130px' }}>Rate</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 700, color: '#4A5568', width: '140px' }}>Amount</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'center', width: '40px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {(formData.deal_types || []).map((item: any, index: number) => {
                                    const amount = (parseFloat(item.amount) || 0) * (parseInt(item.quantity) || 0);
                                    return (
                                        <tr key={index} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                                            <td style={{ padding: '8px', textAlign: 'center' }}>
                                                {index === (formData.deal_types || []).length - 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={addDealTypeRow}
                                                        style={{
                                                            padding: '4px',
                                                            background: '#F0F9FF',
                                                            border: '1px solid #BAE6FD',
                                                            borderRadius: '6px',
                                                            color: '#0284C7',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            margin: '0 auto'
                                                        }}
                                                        title="Add row"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                )}
                                            </td>
                                            <td style={{ padding: '8px', textAlign: 'center', fontSize: '0.9rem', color: '#4A5568', fontWeight: 600 }}>{index + 1}</td>
                                            <td style={{ padding: '8px' }}>
                                                <select
                                                    value={item.type}
                                                    onChange={(e) => handleDealTypeChange(index, 'type', e.target.value)}
                                                    className="ae-input"
                                                    required
                                                    style={{ height: '36px', padding: '4px 8px', width: '100%' }}
                                                >
                                                    <option value="">Select Type</option>
                                                    <option value="LICENSE">License</option>
                                                    <option value="SERVICES">Services</option>
                                                </select>
                                            </td>
                                            <td style={{ padding: '8px' }}>
                                                <input
                                                    type="text"
                                                    value={item.description}
                                                    onChange={(e) => handleDealTypeChange(index, 'description', e.target.value)}
                                                    className="ae-input"
                                                    placeholder="Enter description"
                                                    style={{ height: '36px', padding: '4px 8px' }}
                                                />
                                            </td>
                                            <td style={{ padding: '8px' }}>
                                                <select
                                                    name="currency"
                                                    value={formData.currency}
                                                    onChange={handleInputChange}
                                                    className="ae-input"
                                                    required
                                                    style={{ height: '36px', padding: '4px 8px', textAlign: 'center' }}
                                                >
                                                    <option value="USD">USD</option>
                                                    <option value="INR">INR</option>
                                                    <option value="EURO">EURO</option>
                                                </select>
                                            </td>
                                            <td style={{ padding: '8px' }}>
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => handleDealTypeChange(index, 'quantity', e.target.value)}
                                                    className="ae-input"
                                                    min="1"
                                                    style={{ height: '36px', padding: '4px 8px', textAlign: 'center' }}
                                                />
                                            </td>
                                            <td style={{ padding: '8px' }}>
                                                <div style={{ position: 'relative' }}>
                                                    <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: '#718096' }}>
                                                        {formData.currency === 'INR' ? '₹' : formData.currency === 'USD' ? '$' : formData.currency === 'EURO' ? '€' : ''}
                                                    </span>
                                                    <input
                                                        type="number"
                                                        value={item.amount}
                                                        onChange={(e) => handleDealTypeChange(index, 'amount', e.target.value)}
                                                        className="ae-input"
                                                        style={{ height: '36px', padding: '4px 8px 4px 24px', textAlign: 'right' }}
                                                        required
                                                    />
                                                </div>
                                            </td>
                                            <td style={{ padding: '8px', textAlign: 'right', fontSize: '0.9rem', fontWeight: 700, color: '#1a1f36' }}>
                                                {formData.currency === 'INR' ? '₹' : formData.currency === 'USD' ? '$' : formData.currency === 'EURO' ? '€' : ''}
                                                {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ padding: '8px', textAlign: 'center' }}>
                                                {(formData.deal_types || []).length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeDealTypeRow(index)}
                                                        style={{ color: '#E53E3E', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                                        title="Remove Row"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: '#F8FAFC' }}>
                                    <td colSpan={7} style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.9rem', fontWeight: 700, color: '#4A5568' }}>Total Deal Value:</td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '1.1rem', fontWeight: 800, color: '#FF6B00' }}>
                                        {formData.currency === 'INR' ? '₹' : formData.currency === 'USD' ? '$' : formData.currency === 'EURO' ? '€' : ''}
                                        {parseFloat(formData.deal_amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div className="ae-grid-4 mt-6" style={{ borderTop: '1px solid #E2E8F0', paddingTop: '20px' }}>
                        <div className="ae-input-group">
                            <label className="ae-label">Deal Stage *</label>
                            <select name="stage" value={formData.stage} onChange={handleInputChange} className="ae-input" required>
                                <option value="DEAL_CREATED">Deal created</option>
                                <option value="COST_SHEET">Cost Sheet</option>
                                <option value="ESTIMATES">Estimates</option>
                                <option value="SALES_ORDER">Sales Order</option>
                                <option value="INVOICE">Invoice</option>
                                <option value="PAYMENT">Payment</option>
                            </select>
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Client Type</label>
                            <select name="client_type" value={formData.client_type} onChange={handleInputChange} className="ae-input">
                                <option value="">Select Type</option>
                                <option value="NEW">New</option>
                                <option value="EXISTING">Existing</option>
                            </select>
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Expected Close Date</label>
                            <input type="date" name="expected_close_date" value={formData.expected_close_date} onChange={handleInputChange} className="ae-input" />
                        </div>
                    </div>
                </div>

                {/* 4. Deal Team */}
                <div className="section-panel" style={{ padding: '24px' }}>
                    <SectionHeader icon={Users} title="Deal Team" />
                    <div className="ae-grid-4">
                        <div className="ae-input-group">
                            <label className="ae-label">Inside Salesperson Name</label>
                            <input type="text" name="inside_salesperson" value={formData.inside_salesperson} onChange={handleInputChange} className="ae-input" />
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Inside Sales Head</label>
                            <input type="text" name="inside_sales_head" value={formData.inside_sales_head} onChange={handleInputChange} className="ae-input" />
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Salesperson Name</label>
                            <input type="text" name="salesperson_name" value={formData.salesperson_name} onChange={handleInputChange} className="ae-input" />
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Sales Head</label>
                            <input type="text" name="sales_head" value={formData.sales_head} onChange={handleInputChange} className="ae-input" />
                        </div>
                    </div>

                    <div className="ae-grid-4 mt-6">
                        <div className="ae-input-group">
                            <label className="ae-label">Project Manager</label>
                            <input type="text" name="project_manager" value={formData.project_manager} onChange={handleInputChange} className="ae-input" />
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Project Manager Head</label>
                            <input type="text" name="project_manager_head" value={formData.project_manager_head} onChange={handleInputChange} className="ae-input" />
                        </div>
                    </div>
                </div>


                {/* 5. Description/Remark & Attachments */}
                <div className="section-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                        <span style={{ width: '4px', height: '20px', background: '#0066CC', borderRadius: '2px' }}></span>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#2D3748' }}>Description/Remark</h3>
                    </div>

                    <div className="ae-input-group">
                        <textarea
                            name="remark"
                            value={formData.remark}
                            onChange={handleInputChange}
                            className="ae-input"
                            style={{ minHeight: '120px', padding: '16px', borderRadius: '12px' }}
                            placeholder="Click to add description/remark for this project..."
                        ></textarea>
                    </div>

                    {/* Document Attachments Row */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        marginTop: '24px',
                        padding: '16px 20px',
                        background: '#FAFBFC',
                        borderRadius: '16px',
                        border: '1px solid #E0E6ED'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '8px 20px',
                                    background: 'white',
                                    color: '#2D3748',
                                    borderRadius: '10px',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    border: '1px solid #E0E6ED',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                                }}>
                                    <Paperclip size={16} className="text-[#0066CC]" />
                                    Attachments
                                    <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} id="file-upload-input" />
                                </label>
                                {uploading && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0066CC', fontSize: '0.8rem', fontWeight: 600 }}>
                                        <Loader2 size={14} className="animate-spin" /> Uploading...
                                    </div>
                                )}
                                {uploadFeedback.message && (
                                    <div style={{
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        color: uploadFeedback.type === 'success' ? '#059669' : '#DC2626',
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        background: uploadFeedback.type === 'success' ? '#ECFDF5' : '#FEF2F2'
                                    }}>
                                        {uploadFeedback.message}
                                    </div>
                                )}
                            </div>
                            {attachments.length === 0 && pendingFiles.length === 0 && !uploading && !uploadFeedback.message && (
                                <span style={{ color: '#718096', fontSize: '0.85rem', fontWeight: 500, fontStyle: 'italic' }}>No attachments yet</span>
                            )}
                        </div>

                        {(attachments.length > 0 || pendingFiles.length > 0) && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '8px', marginTop: '4px' }}>
                                {attachments.map((att) => (
                                    <div key={att.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '8px 12px',
                                        background: 'white',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: '8px',
                                        transition: 'all 0.2s'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                            <File size={14} className="text-[#0066CC]" />
                                            <p style={{
                                                margin: 0,
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                color: '#4A5568',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }} title={att.filename}>
                                                {att.filename}
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '2px' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleDownload(att)}
                                                style={{ padding: '4px', color: '#0066CC', background: 'none', border: 'none', cursor: 'pointer' }}
                                                title="Download"
                                            >
                                                <Download size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteAttachment(att.id)}
                                                style={{ padding: '4px', color: '#E53E3E', background: 'none', border: 'none', cursor: 'pointer' }}
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {pendingFiles.map((file, idx) => (
                                    <div key={`pending-${idx}`} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '8px 12px',
                                        background: '#F0F9FF',
                                        border: '1px dashed #0066CC',
                                        borderRadius: '8px',
                                        transition: 'all 0.2s'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                            <File size={14} className="text-[#0066CC]" />
                                            <div style={{ minWidth: 0 }}>
                                                <p style={{
                                                    margin: 0,
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    color: '#0066CC',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }} title={file.name}>
                                                    {file.name}
                                                </p>
                                                <span style={{ fontSize: '10px', color: '#718096', fontWeight: 600 }}>Pending Upload</span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemovePending(idx)}
                                            style={{ padding: '4px', color: '#E53E3E', background: 'none', border: 'none', cursor: 'pointer' }}
                                            title="Remove"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Submit Buttons */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                    <button type="button" onClick={onBack} className="ae-btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" className="ae-btn-primary" disabled={loading}>
                        {loading ? 'Saving...' : id ? 'Update Project' : 'Save Project'}
                    </button>
                </div>
            </form>

            {/* Add New Modal */}
            {showAddModal.show && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', padding: '32px', borderRadius: '12px', width: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '1.25rem', fontWeight: 800 }}>Add New {showAddModal.type.replace('_', ' ').toUpperCase()}</h3>
                        <div className="space-y-4">
                            <div className="ae-input-group">
                                <label className="ae-label">Name</label>
                                <input type="text" className="ae-input" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} autoFocus />
                            </div>
                            {showAddModal.type === 'customer' && (
                                <div className="ae-input-group">
                                    <label className="ae-label">Email (Optional)</label>
                                    <input type="email" className="ae-input" value={newItemExtra.email} onChange={(e) => setNewItemExtra({ ...newItemExtra, email: e.target.value })} />
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                            <button onClick={() => setShowAddModal({ type: '', show: false })} className="ae-btn-secondary" style={{ flex: 1 }}>Cancel</button>
                            <button onClick={handleAddNew} className="ae-btn-primary" style={{ flex: 1 }} disabled={!newItemName || loading}>
                                {loading ? 'Adding...' : 'Add Item'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Audit Trail Sidebar */}
            <AuditTrail
                model="deal"
                modelId={id}
                show={showHistory}
                onClose={() => setShowHistory(false)}
            />
        </div>
    );
};

export default DealForm;
