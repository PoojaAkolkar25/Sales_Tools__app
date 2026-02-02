import React, { useState, useEffect } from 'react';
import {
    Save,
    ChevronLeft,
    Users,
    Briefcase,
    Target,
    RefreshCcw,
    Loader2
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';

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

    const [formData, setFormData] = useState<any>({
        company: 'AE IND',
        deal_name: '',
        deal_date: new Date().toISOString().split('T')[0],
        lead: '',
        stage: 'DEAL_CREATED',
        currency: 'INR',
        fx_rate: 1.0,
        deal_amount: '',
        deal_type: '',
        implementation_partner: '',
        description: '',
        customer: '',
        customer_email: '',
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
        last_synced_at: ''
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
            setFormData(data);
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

            if (id) {
                await api.put(`/deals/${id}/`, dataToSubmit);
                showNotification('Project updated successfully', 'success');
            } else {
                await api.post('/deals/', dataToSubmit);
                showNotification('Project created successfully', 'success');
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
                        <button
                            onClick={handleHubSpotSync}
                            disabled={syncing}
                            className="ae-btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <RefreshCcw size={18} className={syncing ? 'animate-spin' : ''} />
                            {syncing ? 'Syncing...' : 'Sync HubSpot'}
                        </button>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. Primary Information */}
                <div className="section-panel" style={{ padding: '24px' }}>
                    <SectionHeader icon={Briefcase} title="Primary Information" />
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
                                onChange={handleInputChange}
                                className="ae-input"
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
                            <label className="ae-label">Customer Name</label>
                            <select name="customer" value={formData.customer} onChange={handleInputChange} className="ae-input">
                                <option value="">Select Customer</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                <option value="ADD_NEW" style={{ fontWeight: 700, color: '#FF6B00' }}>+ Add New Customer</option>
                            </select>
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

                {/* 2. Deal Configuration */}
                <div className="section-panel" style={{ padding: '24px' }}>
                    <SectionHeader icon={Target} title="Deal Configuration" />
                    <div className="ae-grid-4">
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
                            <label className="ae-label">Deal Type *</label>
                            <select name="deal_type" value={formData.deal_type} onChange={handleInputChange} className="ae-input" required>
                                <option value="">Select Type</option>
                                <option value="LICENSE">License</option>
                                <option value="SERVICES">Services</option>
                            </select>
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Deal Description</label>
                            <input
                                type="text"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                className="ae-input"
                                placeholder="Short description..."
                            />
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Currency *</label>
                            <select name="currency" value={formData.currency} onChange={handleInputChange} className="ae-input" required>
                                <option value="USD">USD</option>
                                <option value="INR">INR</option>
                                <option value="EURO">EURO</option>
                            </select>
                        </div>
                    </div>

                    <div className="ae-grid-4 mt-6">
                        <div className="ae-input-group">
                            <label className="ae-label">FX Rate (in case of foreign currency)</label>
                            <input
                                type="number"
                                name="fx_rate"
                                value={formData.fx_rate}
                                onChange={handleInputChange}
                                className="ae-input"
                                step="0.0001"
                            />
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Deal Amount *</label>
                            <input
                                type="number"
                                name="deal_amount"
                                value={formData.deal_amount}
                                onChange={handleInputChange}
                                className="ae-input"
                                required
                            />
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Partner</label>
                            <select name="implementation_partner" value={formData.implementation_partner} onChange={handleInputChange} className="ae-input">
                                <option value="">Select Partner</option>
                                {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                <option value="ADD_NEW" style={{ fontWeight: 700, color: '#FF6B00' }}>+ Add New Partner</option>
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
                    </div>

                    <div className="ae-grid-4 mt-6">
                        <div className="ae-input-group">
                            <label className="ae-label">Expected Close Date</label>
                            <input type="date" name="expected_close_date" value={formData.expected_close_date} onChange={handleInputChange} className="ae-input" />
                        </div>
                    </div>
                </div>

                <div className="section-panel" style={{ padding: '24px' }}>
                    <SectionHeader icon={Users} title="Team Roles" />
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

                {/* 4. Additional Comments & Actions */}
                <div className="section-panel" style={{ padding: '24px' }}>
                    <div className="ae-input-group">
                        <label className="ae-label text-md font-bold">Project Description / Remarks</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            className="ae-input"
                            style={{ minHeight: '120px', padding: '16px' }}
                            placeholder="Enter final project details, specific requirements, or general remarks..."
                        ></textarea>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #E0E6ED' }}>
                        <button
                            type="button"
                            onClick={onBack}
                            className="ae-btn-secondary"
                            style={{ padding: '12px 32px', fontSize: '1rem' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="ae-btn-primary"
                            style={{ padding: '12px 48px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                            {id ? 'Update Project' : 'Save Project'}
                        </button>
                    </div>
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
        </div>
    );
};

export default DealForm;
