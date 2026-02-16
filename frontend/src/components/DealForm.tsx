import React, { useState, useEffect } from 'react';
import {
    Plus,
    Trash2,
    Paperclip,
    Download,
    Loader2,
    File,
    Save,
    Eye,
    X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useNotification } from '../context/NotificationContext';

interface DealFormProps {
    id: number | null;
    onBack: () => void;
    onSave: () => void;
    refreshTrigger?: number;
}

const DealForm: React.FC<DealFormProps> = ({ id, onBack, onSave, refreshTrigger }) => {
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(false);
    const [leads, setLeads] = useState<any[]>([]);
    const [partners, setPartners] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);

    // Modal states for "Add New"
    const [showAddModal, setShowAddModal] = useState<{ type: string, show: boolean }>({ type: '', show: false });
    const [newItemName, setNewItemName] = useState('');
    const [newCompanyData, setNewCompanyData] = useState({
        name: '',
        email: '',
        state: '',
        city: '',
        gstin: '',
        pan: '',
        phone_number: '',
        mobile_number: ''
    });

    // Attachment states
    const [attachments, setAttachments] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadFeedback, setUploadFeedback] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' });
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);



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
        deal_types: [{ type: '', description: '', amount: '', quantity: '' }]
    });

    useEffect(() => {
        fetchInitialData();
        if (id) {
            fetchDealDetails();
        }
    }, [id, refreshTrigger]);

    const fetchInitialData = async () => {
        try {
            const [leadsRes, partnersRes, customersRes, companiesRes, statesRes] = await Promise.all([
                api.get('/leads/'),
                api.get('/partners/'),
                api.get('/customers/'),
                api.get('/finance/company-profile/'),
                api.get('/finance/state-masters/')
            ]);
            setLeads(leadsRes.data);
            setPartners(partnersRes.data);
            setCustomers(customersRes.data);
            setCompanies(companiesRes.data);
            setStates(statesRes.data);
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
            if (name === 'customer') {
                navigate('/user-management?action=create&mode=company');
            } else {
                setShowAddModal({ type: name, show: true });
            }
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

        // Auto-populate email and currency from customer selection
        if (name === 'customer' && value !== '') {
            const selectedCustomer = customers.find(c => c.id === parseInt(value));
            if (selectedCustomer) {
                // Find matching company profile to get currency
                const matchingCompany = companies.find(comp => comp.name === selectedCustomer.name);
                setFormData((prev: any) => ({
                    ...prev,
                    customer_email: selectedCustomer.email || prev.customer_email,
                    currency: matchingCompany?.base_currency || selectedCustomer.currency || prev.currency
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
            deal_types: [...(prev.deal_types || []), { type: '', description: '', amount: '', quantity: '' }]
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



    const handleAddNew = async () => {
        // For Company Profile, validate required fields
        if (showAddModal.type === 'customer') {
            if (!newCompanyData.name || !newCompanyData.email) {
                showNotification('Company Name and Email are required', 'warning');
                return;
            }
        } else if (!newItemName) {
            return;
        }

        setLoading(true);
        try {
            let res;
            switch (showAddModal.type) {
                case 'implementation_partner':
                    res = await api.post('/partners/', { name: newItemName });
                    setPartners([...partners, res.data]);
                    break;
                case 'customer':
                    // Create Company Profile
                    const companyPayload = {
                        name: newCompanyData.name,
                        email: newCompanyData.email,
                        state: newCompanyData.state || null,
                        city: newCompanyData.city,
                        gstin: newCompanyData.gstin,
                        pan: newCompanyData.pan,
                        phone_number: newCompanyData.phone_number,
                        mobile_number: newCompanyData.mobile_number
                    };
                    res = await api.post('/finance/company-profile/', companyPayload);
                    setCompanies([...companies, res.data]);

                    // Also create in Customer model for backward compatibility
                    const customerPayload = {
                        name: newCompanyData.name,
                        email: newCompanyData.email,
                        state: states.find(s => s.id === parseInt(newCompanyData.state))?.name || '',
                        state_code: states.find(s => s.id === parseInt(newCompanyData.state))?.code || '',
                        gstin: newCompanyData.gstin,
                        pan: newCompanyData.pan,
                        phone: newCompanyData.phone_number || newCompanyData.mobile_number
                    };
                    const customerRes = await api.post('/customers/', customerPayload);
                    setCustomers([...customers, customerRes.data]);

                    // Set the customer ID in form
                    setFormData((prev: any) => ({ ...prev, customer: customerRes.data.id }));
                    break;
            }
            if (res) {
                if (showAddModal.type !== 'customer') {
                    setFormData((prev: any) => ({ ...prev, [showAddModal.type]: res.data.id }));
                }
                showNotification('Added successfully', 'success');
            }
            setShowAddModal({ type: '', show: false });
            setNewItemName('');
            setNewItemExtra({ email: '', contact: '' });
            setNewCompanyData({
                name: '',
                email: '',
                state: '',
                city: '',
                gstin: '',
                pan: '',
                phone_number: '',
                mobile_number: ''
            });
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
        let activeId = id;
        if (!activeId) {
            setUploading(true);
            setUploadFeedback({ type: 'success', message: 'Creating deal to attach file...' });
            activeId = await handleSave(true);
            if (!activeId) {
                setUploadFeedback({ type: 'error', message: 'Failed to create deal. Fill required fields first.' });
                setUploading(false);
                if (e.target) e.target.value = '';
                return;
            }
        }

        setUploading(true);
        setUploadFeedback({ type: 'success', message: `Uploading ${file.name}...` });

        try {
            const uploadData = new FormData();
            uploadData.append('file', file);

            const response = await api.post(`/deals/${activeId}/upload_attachment/`, uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setAttachments([...attachments, response.data]);
            setUploadFeedback({ type: 'success', message: 'File uploaded successfully' });
            setTimeout(() => setUploadFeedback({ type: '', message: '' }), 4000);

            // If the deal was just created, we might want to update the URL or notify parent
            // But usually we just need the ID locally.
            // If the app doesn't navigate on create, we should set the ID if it was null.
            // Wait, looking at current component logic, id is a prop.
            // If we are creating, we might need to tell the parent.
            // However, handleSave calls await api.post('/deals/', dataToSubmit);
            // I'll see if I need to do more here.
        } catch (error) {
            console.error('Error uploading file', error);
            setUploadFeedback({ type: 'error', message: 'Failed to upload file' });
        } finally {
            setUploading(false);
            if (e.target) e.target.value = '';
        }
    };


    const getFileUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        const apiBase = api.defaults.baseURL || '';
        const base = apiBase.replace('/api', '');
        return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    const handleDownload = async (att: any) => {
        try {
            const fileUrl = getFileUrl(att.file);
            setUploadFeedback({ type: 'success', message: `Downloading ${att.filename}...` });

            const link = document.createElement('a');
            link.href = fileUrl;
            link.download = att.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => {
                setUploadFeedback({ type: 'success', message: `${att.filename} downloaded!` });
                setTimeout(() => setUploadFeedback({ type: '', message: '' }), 3000);
            }, 1000);
        } catch (error) {
            console.error('Error downloading file', error);
            setUploadFeedback({ type: 'error', message: 'Download failed' });
        }
    };

    const handleView = (att: any) => {
        const fileUrl = getFileUrl(att.file);
        window.open(fileUrl, '_blank');
    };

    const handleDeleteAttachment = async (attId: number) => {
        if (!id) return;
        try {
            await api.delete(`/deals/${id}/delete_attachment/?attachment_id=${attId}`);
            setAttachments(attachments.filter(a => a.id !== attId));
            showNotification('Attachment deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting attachment', error);
            showNotification('Failed to delete attachment', 'error');
        }
    };

    const handleSave = async (isAutoSave = false) => {
        if (!formData.deal_name || !formData.deal_amount) {
            if (!isAutoSave) showNotification('Please fill in required fields (Project Name and Amount)', 'warning');
            return null;
        }

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
            // The following fields might not exist in formData but let's be safe
            delete (dataToSubmit as any).created_at;
            delete (dataToSubmit as any).updated_at;

            let finalId = id;
            if (id) {
                await api.put(`/deals/${id}/`, dataToSubmit);
                if (!isAutoSave) showNotification('Deal updated successfully', 'success');
            } else {
                const res = await api.post('/deals/', dataToSubmit);
                finalId = res.data.id;
                // Update navigation/state if needed
                if (!isAutoSave) showNotification('Deal created successfully', 'success');
            }
            return finalId;
        } catch (error) {
            console.error('Error saving deal', error);
            if (!isAutoSave) showNotification('Error saving deal', 'error');
            return null;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const finalId = await handleSave();
        setLoading(false);
        if (finalId) {
            onSave();
        }
    };

    const SectionHeader = ({ title, extra }: { title: string, extra?: React.ReactNode }) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '4px', height: '18px', background: 'var(--ae-blue)', borderRadius: '2px' }}></span>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--theme-primary)' }}>{title}</h3>
            </div>
            {extra}
        </div>
    );

    return (
        <div className="space-y-6" style={{ padding: '4px' }}>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                    {/* 1. Deal Information */}
                    <div>
                        <SectionHeader title="Deal Information" />
                        <div className="ae-grid-4">
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Company Name *</label>
                                <select name="company" value={formData.company} onChange={handleInputChange} className="ae-input" required>
                                    <option value="AE IND">AE IND</option>
                                    <option value="AE USA">AE USA</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Lead Date</label>
                                <input
                                    type="date"
                                    value={formData.lead ? leads.find(l => l.id === parseInt(formData.lead))?.lead_date || '' : ''}
                                    className="ae-input"
                                    disabled
                                    style={{ background: '#F7FAFC', color: '#718096', cursor: 'not-allowed' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Lead Number</label>
                                <input
                                    type="text"
                                    value={formData.lead ? leads.find(l => l.id === parseInt(formData.lead))?.lead_no || 'No Lead Linked' : 'No Lead Linked'}
                                    className="ae-input"
                                    disabled
                                    style={{ background: '#F7FAFC', color: '#718096', cursor: 'not-allowed' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Deal Date *</label>
                                <input
                                    type="date"
                                    name="deal_date"
                                    value={formData.deal_date}
                                    className="ae-input"
                                    disabled
                                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'not-allowed' }}
                                    required
                                />
                            </div>
                        </div>

                        <div className="ae-grid-4 mt-6">
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Deal Number</label>
                                <input
                                    type="text"
                                    value={id ? formData.deal_id : 'System Generated'}
                                    className="ae-input"
                                    disabled
                                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'not-allowed' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Customer/Partner Name</label>
                                <select name="customer" value={formData.customer} onChange={handleInputChange} className="ae-input">
                                    <option value="">Select Customer</option>
                                    {companies.map(c => {
                                        const customerId = customers.find(cust => cust.name === c.name)?.id || '';
                                        return <option key={c.id} value={customerId}>{c.name}</option>;
                                    })}
                                    <option value="ADD_NEW" style={{ fontWeight: 700, color: 'var(--theme-primary)' }}>+ Add New Customer</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>End Customer</label>
                                <input
                                    type="text"
                                    name="end_customer"
                                    value={formData.end_customer}
                                    onChange={handleInputChange}
                                    className="ae-input"
                                    placeholder="End Customer"
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Project Name *</label>
                                <input
                                    type="text"
                                    name="deal_name"
                                    value={formData.deal_name}
                                    onChange={handleInputChange}
                                    className="ae-input"
                                    placeholder="Project Name"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* 2 & 3 Combined. Deal Value */}
                    <div style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px', marginTop: '32px' }}>
                        <SectionHeader title="Deal Value" />

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px' }}>
                                <thead>
                                    <tr style={{ background: '#F8FAFC' }}>
                                        <th style={{ padding: '12px 8px', width: '40px' }}></th>
                                        <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#4A5568', width: '50px' }}>Sr.No.</th>
                                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#4A5568', width: '200px' }}>Type *</th>
                                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#4A5568' }}>Description</th>
                                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#4A5568', width: '100px' }}>Currency</th>
                                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#4A5568', width: '80px' }}>Qty</th>
                                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#4A5568', width: '130px' }}>Rate</th>
                                        <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#4A5568', width: '140px' }}>Amount</th>
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
                                                        placeholder="Description"
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
                                                        style={{ height: '36px', padding: '4px 8px', textAlign: 'left' }}
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
                                                        placeholder="0"
                                                        style={{ height: '36px', padding: '4px 8px', textAlign: 'left' }}
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
                                                            placeholder="0"
                                                            style={{ height: '36px', padding: '4px 8px 4px 24px', textAlign: 'left' }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Tab' && !e.shiftKey && index === (formData.deal_types || []).length - 1) {
                                                                    e.preventDefault();
                                                                    addDealTypeRow();
                                                                }
                                                            }}
                                                            required
                                                        />
                                                    </div>
                                                </td>
                                                <td style={{ padding: '8px', textAlign: 'left', fontSize: '0.9rem', fontWeight: 700, color: '#1a1f36' }}>
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
                                        <td style={{ padding: '12px 8px', textAlign: 'right', fontSize: '0.95rem', fontWeight: 800, color: '#FF6B00' }}>
                                            {formData.currency === 'INR' ? '₹' : formData.currency === 'USD' ? '$' : formData.currency === 'EURO' ? '€' : ''}
                                            {parseFloat(formData.deal_amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="ae-grid-4 mt-6" style={{ borderTop: '1px solid #E2E8F0', paddingTop: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Deal Stage *</label>
                                <select name="stage" value={formData.stage} onChange={handleInputChange} className="ae-input" required>
                                    <option value="DEAL_CREATED">Deal created</option>
                                    <option value="COST_SHEET">Cost Sheet</option>
                                    <option value="ESTIMATES">Estimates</option>
                                    <option value="SALES_ORDER">Sales Order</option>
                                    <option value="INVOICE">Invoice</option>
                                    <option value="PAYMENT">Payment</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Client Type</label>
                                <select name="client_type" value={formData.client_type} onChange={handleInputChange} className="ae-input">
                                    <option value="">Select Type</option>
                                    <option value="NEW">New</option>
                                    <option value="EXISTING">Existing</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Expected Close Date</label>
                                <input type="date" name="expected_close_date" value={formData.expected_close_date} onChange={handleInputChange} className="ae-input" />
                            </div>
                        </div>
                    </div>

                    {/* 4. Deal Team */}
                    <div style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px', marginTop: '32px' }}>
                        <SectionHeader title="Deal Team" />
                        <div className="ae-grid-4">
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Inside Salesperson Name</label>
                                <input type="text" name="inside_salesperson" placeholder="Inside Salesperson Name" value={formData.inside_salesperson} onChange={handleInputChange} className="ae-input" />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Inside Sales Head</label>
                                <input type="text" name="inside_sales_head"
                                    placeholder="Inside Sales Head" value={formData.inside_sales_head} onChange={handleInputChange} className="ae-input" />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Salesperson Name</label>
                                <input type="text" name="salesperson_name"
                                    placeholder="Salesperson Name" value={formData.salesperson_name} onChange={handleInputChange} className="ae-input" />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Sales Head</label>
                                <input type="text" name="sales_head" placeholder="Sales Head" value={formData.sales_head} onChange={handleInputChange} className="ae-input" />
                            </div>
                        </div>

                        <div className="ae-grid-4 mt-6">
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Project Manager</label>
                                <input type="text" name="project_manager" placeholder="Project Manager" value={formData.project_manager} onChange={handleInputChange} className="ae-input" />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Project Manager Head</label>
                                <input type="text" name="project_manager_head" placeholder="Project Manager Head" value={formData.project_manager_head} onChange={handleInputChange} className="ae-input" />
                            </div>
                        </div>
                    </div>


                    {/* 5. Description/Remark & Attachments */}
                    <div style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px', marginTop: '32px' }}>
                        <SectionHeader title="Description/Remark" />

                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <textarea
                                name="remark"
                                value={formData.remark}
                                onChange={handleInputChange}
                                style={{
                                    width: '100%',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '6px',
                                    padding: '12px',
                                    minHeight: '80px',
                                    outline: 'none',
                                    background: 'white',
                                    fontSize: '0.85rem'
                                }}
                                placeholder="Description/Remark"
                            ></textarea>
                        </div>

                        {/* Attachments Section */}
                        <div style={{ marginTop: '24px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '8px' }}>
                                Attachments
                            </label>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                padding: '4px 12px',
                                background: '#F8FAFC',
                                borderRadius: '12px',
                                border: '1px solid #E0E6ED',
                                width: 'fit-content',
                                minWidth: 'fit-content',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                            }}>
                                <input
                                    id="file-upload-input"
                                    type="file"
                                    onChange={handleFileUpload}
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                                    disabled={uploading}
                                    style={{ display: 'none' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => document.getElementById('file-upload-input')?.click()}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        background: 'white',
                                        color: '#1a1f36',
                                        border: '1px solid #E0E6ED',
                                        height: '34px',
                                        padding: '0 16px',
                                        borderRadius: '8px',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        whiteSpace: 'nowrap'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#FF6B00';
                                        e.currentTarget.style.color = 'white';
                                        e.currentTarget.style.borderColor = '#FF6B00';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'white';
                                        e.currentTarget.style.color = '#1a1f36';
                                        e.currentTarget.style.borderColor = '#E0E6ED';
                                    }}
                                >
                                    <Paperclip size={14} /> Attachments
                                </button>

                                {/* Middle: File List pills */}
                                <div style={{
                                    flex: 1,
                                    display: 'flex',
                                    gap: '8px',
                                    overflowX: 'auto',
                                    padding: '4px 0',
                                    alignItems: 'center'
                                }}>
                                    {attachments.length > 0 ? (
                                        <>
                                            {attachments.map((att) => (
                                                <div
                                                    key={att.id}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        padding: '4px 10px',
                                                        background: 'white',
                                                        borderRadius: '8px',
                                                        border: '1px solid #E0E6ED',
                                                        minWidth: 'fit-content'
                                                    }}
                                                >
                                                    <File size={14} style={{ color: '#FF6B00' }} />
                                                    <span style={{
                                                        fontSize: '0.8rem',
                                                        fontWeight: 600,
                                                        color: '#1a1f36',
                                                        maxWidth: '120px',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {att.filename}
                                                    </span>
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); handleView(att); }}
                                                            style={{
                                                                width: '22px',
                                                                height: '22px',
                                                                borderRadius: '50%',
                                                                border: 'none',
                                                                background: '#e0f2fe',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer',
                                                                color: '#0369a1'
                                                            }}
                                                            title="View"
                                                        >
                                                            <Eye size={10} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); handleDownload(att); }}
                                                            style={{
                                                                width: '22px',
                                                                height: '22px',
                                                                borderRadius: '50%',
                                                                border: 'none',
                                                                background: '#f1f5f9',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer',
                                                                color: '#475569'
                                                            }}
                                                            title="Download"
                                                        >
                                                            <Download size={10} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteAttachment(att.id); }}
                                                            style={{
                                                                width: '22px',
                                                                height: '22px',
                                                                borderRadius: '50%',
                                                                border: 'none',
                                                                background: '#fee2e2',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer',
                                                                color: '#ef4444'
                                                            }}
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={10} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    ) : (
                                        <span style={{ fontSize: '0.9rem', color: '#A0AEC0', fontStyle: 'italic', marginLeft: '10px' }}>
                                            {uploading ? 'Uploading...' : 'No attachments yet'}
                                        </span>
                                    )}

                                    {/* Upload Feedback Message */}
                                    {uploadFeedback.message && (
                                        <div style={{
                                            padding: '4px 12px',
                                            borderRadius: '6px',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            background: uploadFeedback.type === 'error' ? '#FFF5F5' : '#F0FFF4',
                                            color: uploadFeedback.type === 'error' ? '#C53030' : '#2F855A',
                                            border: `1px solid ${uploadFeedback.type === 'error' ? '#FEB2B2' : '#9AE6B4'}`,
                                            marginLeft: '10px',
                                            whiteSpace: 'nowrap',
                                            animation: 'fadeIn 0.3s ease'
                                        }}>
                                            {uploadFeedback.message}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Submit Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        alignItems: 'center',
                        background: 'white',
                        padding: '6px',
                        borderRadius: '12px',
                        border: '1px solid #E0E6ED',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                    }}>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 16px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                border: 'none',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                background: (!hoveredBtn || hoveredBtn === 'save') && !showCancelModal ? 'var(--theme-primary)' : 'transparent',
                                color: showCancelModal ? '#CBD5E0' : ((!hoveredBtn || hoveredBtn === 'save') ? 'white' : 'var(--text-secondary)'),
                                boxShadow: (!hoveredBtn || hoveredBtn === 'save') && !showCancelModal ? '0 4px 12px rgba(187, 77, 0, 0.2)' : 'none',
                                opacity: loading ? 0.7 : 1
                            }}
                            onMouseEnter={() => setHoveredBtn('save')}
                            onMouseLeave={() => setHoveredBtn(null)}
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {loading ? 'Saving...' : id ? 'Update Deal' : 'Save Deal'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowCancelModal(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 16px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: showCancelModal || hoveredBtn === 'cancel' ? 'var(--theme-primary)' : 'transparent',
                                color: showCancelModal || hoveredBtn === 'cancel' ? 'white' : 'var(--text-secondary)',
                                boxShadow: showCancelModal || hoveredBtn === 'cancel' ? '0 4px 12px rgba(187, 77, 0, 0.2)' : 'none'
                            }}
                            onMouseEnter={() => setHoveredBtn('cancel')}
                            onMouseLeave={() => setHoveredBtn(null)}
                        >
                            <span style={{ fontSize: '18px', lineHeight: '10px' }}>×</span>
                            <span>Cancel</span>
                        </button>
                    </div>
                </div>
            </form>

            {/* Add New Modal */}
            {showAddModal.show && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', padding: '32px', borderRadius: '12px', width: showAddModal.type === 'customer' ? '600px' : '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '1.25rem', fontWeight: 800 }}>
                            {showAddModal.type === 'customer' ? 'Add New Company Profile' : `Add New ${showAddModal.type.replace('_', ' ').toUpperCase()}`}
                        </h3>

                        {showAddModal.type === 'customer' ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Company Name *</label>
                                    <input
                                        type="text"
                                        className="ae-input"
                                        value={newCompanyData.name}
                                        onChange={(e) => setNewCompanyData({ ...newCompanyData, name: e.target.value })}
                                        autoFocus
                                        required
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Email *</label>
                                    <input
                                        type="email"
                                        className="ae-input"
                                        value={newCompanyData.email}
                                        onChange={(e) => setNewCompanyData({ ...newCompanyData, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>State</label>
                                    <select
                                        className="ae-input"
                                        value={newCompanyData.state}
                                        onChange={(e) => setNewCompanyData({ ...newCompanyData, state: e.target.value })}
                                    >
                                        <option value="">Select State</option>
                                        {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>City</label>
                                    <input
                                        type="text"
                                        className="ae-input"
                                        value={newCompanyData.city}
                                        onChange={(e) => setNewCompanyData({ ...newCompanyData, city: e.target.value })}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>GSTIN</label>
                                    <input
                                        type="text"
                                        className="ae-input"
                                        value={newCompanyData.gstin}
                                        onChange={(e) => setNewCompanyData({ ...newCompanyData, gstin: e.target.value })}
                                        maxLength={15}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>PAN</label>
                                    <input
                                        type="text"
                                        className="ae-input"
                                        value={newCompanyData.pan}
                                        onChange={(e) => setNewCompanyData({ ...newCompanyData, pan: e.target.value })}
                                        maxLength={10}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Phone Number</label>
                                    <input
                                        type="tel"
                                        className="ae-input"
                                        value={newCompanyData.phone_number}
                                        onChange={(e) => setNewCompanyData({ ...newCompanyData, phone_number: e.target.value })}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Mobile Number</label>
                                    <input
                                        type="tel"
                                        className="ae-input"
                                        value={newCompanyData.mobile_number}
                                        onChange={(e) => setNewCompanyData({ ...newCompanyData, mobile_number: e.target.value })}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Name</label>
                                    <input type="text" className="ae-input" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} autoFocus />
                                </div>
                                {showAddModal.type === 'implementation_partner' && (
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>Email (Optional)</label>
                                        <input type="email" className="ae-input" value={newItemExtra.email} onChange={(e) => setNewItemExtra({ ...newItemExtra, email: e.target.value })} />
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddModal({ type: '', show: false });
                                    setNewCompanyData({
                                        name: '',
                                        email: '',
                                        state: '',
                                        city: '',
                                        gstin: '',
                                        pan: '',
                                        phone_number: '',
                                        mobile_number: ''
                                    });
                                }}
                                className="ae-btn-secondary"
                                style={{ flex: 1 }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleAddNew}
                                className="ae-btn-primary"
                                style={{ flex: 1 }}
                                disabled={
                                    loading ||
                                    (showAddModal.type === 'customer' ? (!newCompanyData.name || !newCompanyData.email) : !newItemName)
                                }
                            >
                                {loading ? 'Adding...' : 'Add Company'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Confirmation Modal */}
            {showCancelModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(255, 255, 255, 0.4)',
                    backdropFilter: 'blur(1px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        background: 'white',
                        width: '100%',
                        maxWidth: '500px',
                        borderRadius: '12px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        border: '1px solid #E2E8F0',
                        overflow: 'hidden',
                        animation: 'modalScale 0.2s ease-out'
                    }}>
                        <div style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: '#FFF5F5',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 9V11M12 15H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0378 2.66667 10.268 4L3.33978 16C2.56998 17.3333 3.53223 19 5.07183 19Z" stroke="#E53E3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', fontWeight: 800, color: '#1a1f36' }}>
                                        Leave this page?
                                    </h3>
                                    <p style={{ margin: 0, color: '#4A5568', fontSize: '0.95rem', lineHeight: 1.5 }}>
                                        If you leave, your unsaved changes will be discarded.
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '32px' }}>
                                <button
                                    onClick={() => setShowCancelModal(false)}
                                    style={{
                                        flex: 1,
                                        padding: '10px 16px',
                                        borderRadius: '8px',
                                        background: '#3B82F6',
                                        color: 'white',
                                        border: 'none',
                                        fontSize: '0.9rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        height: '40px'
                                    }}
                                >
                                    Stay Here
                                </button>
                                <button
                                    onClick={() => {
                                        setShowCancelModal(false);
                                        onBack();
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '10px 16px',
                                        borderRadius: '8px',
                                        background: 'white',
                                        color: '#1a1f36',
                                        border: '1px solid #E2E8F0',
                                        fontSize: '0.9rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        height: '40px'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#F7FAFC'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                >
                                    Leave & Discard Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DealForm;
