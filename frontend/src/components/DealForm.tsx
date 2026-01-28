import React, { useState, useEffect } from 'react';
import {
    Save,
    ChevronLeft,
    Users,
    Briefcase,
    Clock,
    Target,
    RefreshCcw,
    X,
    FileText
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
    const [owners, setOwners] = useState<any[]>([]);
    const [partners, setPartners] = useState<any[]>([]);
    const [productsList, setProductsList] = useState<any[]>([]);
    const [sources, setSources] = useState<any[]>([]);
    const [industries, setIndustries] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [countries, setCountries] = useState<any[]>([]);
    const [costSheets, setCostSheets] = useState<any[]>([]);

    // Modal states for "Add New"
    const [showAddModal, setShowAddModal] = useState<{ type: string, show: boolean }>({ type: '', show: false });
    const [newItemName, setNewItemName] = useState('');
    const [newItemExtra, setNewItemExtra] = useState({ email: '', contact: '' });

    const [formData, setFormData] = useState<any>({
        deal_name: '',
        lead: '',
        stage: 'PROSPECTING',
        amount: '',
        currency: 'INR',
        probability: 0,
        deal_owner: '',
        project_name: '',
        deal_type: '',
        priority: '',
        implementation_partner: '',
        country: '',
        region: '',
        industry: '',
        description: '',
        customer: '',
        customer_email: '',
        products: [],
        product_name_manual: '',
        client_type: '',
        opportunity_source: '',
        associate_contact: '',
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
            const [leadsRes, ownersRes, partnersRes, productsRes, sourcesRes, industriesRes, customersRes, countriesRes, costSheetsRes] = await Promise.all([
                api.get('/leads/'),
                api.get('/deal-owners/'),
                api.get('/partners/'),
                api.get('/products/'),
                api.get('/sources/'),
                api.get('/industries/'),
                api.get('/customers/'),
                api.get('/countries/'),
                api.get('/cost-sheets/')
            ]);
            setLeads(leadsRes.data);
            setOwners(ownersRes.data);
            setPartners(partnersRes.data);
            setProductsList(productsRes.data);
            setSources(sourcesRes.data);
            setIndustries(industriesRes.data);
            setCustomers(customersRes.data);
            setCountries(countriesRes.data);
            setCostSheets(costSheetsRes.data);
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
                    // industry: selectedLead.industry || prev.industry, // Lead industry might be text, we need ID if we want to auto-select. For now, let's keep it manual or try to match name.
                    country: selectedLead.country || prev.country,
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



    // Updated Product Toggle for Dropdown
    const handleAddProduct = (productIdStr: string) => {
        if (!productIdStr || productIdStr === 'ADD_NEW') return;
        const productId = parseInt(productIdStr);
        setFormData((prev: any) => {
            const currentProducts = [...(prev.products || [])];
            if (!currentProducts.includes(productId)) {
                return { ...prev, products: [...currentProducts, productId] };
            }
            return prev;
        });

        // Reset select value if needed, though react controlled component handles it
    };

    const handleRemoveProduct = (productId: number) => {
        setFormData((prev: any) => {
            const currentProducts = [...(prev.products || [])];
            return { ...prev, products: currentProducts.filter(id => id !== productId) };
        });
    };

    const handleHubSpotSync = async () => {
        if (!id) {
            showNotification('Save the deal first before syncing with HubSpot', 'warning');
            return;
        }
        setSyncing(true);
        try {
            const response = await api.post(`/deals/${id}/sync_hubspot/`);
            showNotification(response.data.message, 'success');
            // Refresh deal details to get updated sync info
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
                case 'deal_owner':
                    res = await api.post('/deal-owners/', { name: newItemName, email: newItemExtra.email, contact_number: newItemExtra.contact });
                    setOwners([...owners, res.data]);
                    break;
                case 'implementation_partner':
                    res = await api.post('/partners/', { name: newItemName });
                    setPartners([...partners, res.data]);
                    break;
                case 'opportunity_source':
                    res = await api.post('/sources/', { name: newItemName });
                    setSources([...sources, res.data]);
                    break;
                case 'product':
                    res = await api.post('/products/', { name: newItemName });
                    setProductsList([...productsList, res.data]);
                    break;
                case 'industry':
                    res = await api.post('/industries/', { name: newItemName });
                    setIndustries([...industries, res.data]);
                    break;
                case 'customer':
                    res = await api.post('/customers/', { name: newItemName, email: newItemExtra.email });
                    setCustomers([...customers, res.data]);
                    break;
                case 'country':
                    res = await api.post('/countries/', { name: newItemName });
                    setCountries([...countries, res.data]);
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
            const errorMsg = error.response?.data?.email?.[0] || error.response?.data?.name?.[0] || error.response?.data?.detail || 'Error adding new item';
            showNotification(errorMsg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // BRD: Won/Lost reason mandatory
        if ((formData.stage === 'CLOSED_WON' || formData.stage === 'CLOSED_LOST') && !formData.won_lost_reason) {
            showNotification('Please provide a reason for Won/Lost status', 'warning');
            return;
        }

        if (!formData.deal_name || !formData.amount) {
            showNotification('Please fill in all required fields (Deal Name and Amount)', 'warning');
            return;
        }

        setLoading(true);
        try {
            const dataToSubmit = { ...formData };
            dataToSubmit.amount = formData.amount ? parseFloat(formData.amount) : 0;
            dataToSubmit.probability = formData.probability ? parseFloat(formData.probability) : 0;

            // Clean up related fields - use null instead of empty string for foreign keys and dates
            const nullableFields = [
                'lead', 'deal_owner',
                'implementation_partner', 'opportunity_source',
                'expected_close_date', 'industry', 'customer', 'country'
            ];

            nullableFields.forEach(field => {
                if (!dataToSubmit[field] || dataToSubmit[field] === '') {
                    dataToSubmit[field] = null;
                }
            });

            // Prevent sending these fields as they are managed by the HubSpot sync action
            // and often cause format issues if sent back as empty strings/non-ISO dates
            delete dataToSubmit.hubspot_id;
            delete dataToSubmit.last_synced_at;
            delete dataToSubmit.created_at;
            delete dataToSubmit.updated_at;

            if (id) {
                await api.put(`/deals/${id}/`, dataToSubmit);
                showNotification('Deal updated successfully', 'success');
            } else {
                await api.post('/deals/', dataToSubmit);
                showNotification('Deal created successfully', 'success');
            }
            onSave();
            onBack();
        } catch (error: any) {
            console.error('Error saving deal', error);
            const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : 'Error saving deal';
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
                    <button onClick={onBack} className="ae-btn-secondary" style={{ padding: '8px 24px' }}>Cancel</button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="ae-btn-primary"
                        style={{ padding: '8px 32px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        {loading ? <Clock className="animate-spin" size={18} /> : <Save size={18} />}
                        {id ? 'Update Deal' : 'Save Deal'}
                    </button>
                </div>
            </div>

            {/* HubSpot Sync status bar */}
            {id && (
                <div style={{ background: '#F0F7FF', border: '1px solid #BEE3F8', borderRadius: '8px', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: '#3182CE', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>HUBSPOT CRM</div>
                        <div style={{ fontSize: '0.9rem', color: '#2C5282' }}>
                            {formData.hubspot_id ? (
                                <span>Synced with ID: <strong>{formData.hubspot_id}</strong> &bull; Last sync: {formData.last_synced_at ? new Date(formData.last_synced_at).toLocaleString() : 'Never'}</span>
                            ) : (
                                <span>Not yet synced with HubSpot CRM</span>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {id && costSheets.some(cs => cs.deal === id) && (
                            <button
                                type="button"
                                onClick={() => {
                                    const cs = costSheets.find(cs => cs.deal === id);
                                    if (cs) {
                                        // This assumes there's a way to view a cost sheet. 
                                        // In standard App.tsx it's onViewCostSheet(id).
                                        // We might need to pass a callback or just tell the user to go to Cost Sheets.
                                        // For now, let's just show a link or notification if we can't navigate directly.
                                        showNotification(`Associated Cost Sheet: ${cs.cost_sheet_no}`, 'info');
                                    }
                                }}
                                className="ae-btn-secondary"
                                style={{ padding: '4px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', background: '#E6FFFA', color: '#2C7A7B' }}
                            >
                                <FileText size={16} /> View Cost Sheet
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleHubSpotSync}
                            disabled={syncing}
                            className="ae-btn-secondary"
                            style={{ padding: '4px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <RefreshCcw size={16} className={syncing ? 'animate-spin' : ''} />
                            {syncing ? 'Syncing...' : 'Sync with HubSpot'}
                        </button>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information */}
                <div className="section-panel" style={{ padding: '24px' }}>
                    <SectionHeader icon={Briefcase} title="Basic Deal Information" />
                    <div className="ae-grid-4">
                        <div className="ae-input-group">
                            <label className="ae-label">Deal Id</label>
                            <input
                                type="text"
                                value={id ? formData.deal_id : 'System Generated'}
                                className="ae-input"
                                disabled
                                style={{ background: '#F7FAFC', color: '#718096', cursor: 'not-allowed' }}
                            />
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Deal Name *</label>
                            <input type="text" name="deal_name" value={formData.deal_name} onChange={handleInputChange} className="ae-input" required />
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Lead Number</label>
                            <select name="lead" value={formData.lead} onChange={handleInputChange} className="ae-input">
                                <option value="">Select Lead</option>
                                {leads.map(l => <option key={l.id} value={l.id}>{l.lead_no} ({l.customer_name})</option>)}
                            </select>
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Deal Stage *</label>
                            <select name="stage" value={formData.stage} onChange={handleInputChange} className="ae-input" required>
                                <option value="PROSPECTING">Prospecting</option>
                                <option value="QUALIFICATION">Qualification</option>
                                <option value="PROPOSAL">Proposal</option>
                                <option value="NEGOTIATION">Negotiation</option>
                                <option value="CLOSED_WON">Closed Won</option>
                                <option value="CLOSED_LOST">Closed Lost</option>
                            </select>
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Deal Owner (Master) *</label>
                            <select name="deal_owner" value={formData.deal_owner} onChange={handleInputChange} className="ae-input" required>
                                <option value="">Select Owner</option>
                                {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                <option value="ADD_NEW" style={{ fontWeight: 700, color: '#FF6B00' }}>+ Add New Owner</option>
                            </select>
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Amount *</label>
                            <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} className="ae-input" required />
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Currency *</label>
                            <select name="currency" value={formData.currency} onChange={handleInputChange} className="ae-input" required>
                                <option value="INR">INR</option>
                                <option value="USD">USD</option>
                            </select>
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Probability (%)</label>
                            <input type="number" name="probability" value={formData.probability} onChange={handleInputChange} className="ae-input" min="0" max="100" />
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Deal Type *</label>
                            <select name="deal_type" value={formData.deal_type} onChange={handleInputChange} className="ae-input" required>
                                <option value="">Select Type</option>
                                <option value="ARR">Annual Recurring Revenue</option>
                                <option value="FIXED_BID">Fixed Bid</option>
                                <option value="NEW_LICENSE">New License</option>
                                <option value="LICENSE_RENEWAL">License Renewal</option>
                                <option value="T_M">T&M</option>
                            </select>
                        </div>
                    </div>
                    <div className="ae-grid-4 mt-4">
                        <div className="ae-input-group">
                            <label className="ae-label">Project Name</label>
                            <input type="text" name="project_name" value={formData.project_name} onChange={handleInputChange} className="ae-input" placeholder="Enter Project Name" />
                        </div>
                    </div>
                </div>

                {/* Deal Details */}
                <div className="section-panel" style={{ padding: '24px' }}>
                    <SectionHeader icon={Target} title="Deal Details" />
                    <div className="ae-grid-4">
                        <div className="ae-input-group">
                            <label className="ae-label">Implementation Partner</label>
                            <select name="implementation_partner" value={formData.implementation_partner} onChange={handleInputChange} className="ae-input">
                                <option value="">Select Partner</option>
                                {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                <option value="ADD_NEW" style={{ fontWeight: 700, color: '#FF6B00' }}>+ Add New Partner</option>
                            </select>
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Country</label>
                            <select name="country" value={formData.country} onChange={handleInputChange} className="ae-input">
                                <option value="">Select Country</option>
                                {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                <option value="ADD_NEW" style={{ fontWeight: 700, color: '#FF6B00' }}>+ Add New Country</option>
                            </select>
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Region (Manual Selection)</label>
                            <select name="region" value={formData.region} onChange={handleInputChange} className="ae-input">
                                <option value="">Select Region</option>
                                <option value="AMERICAS">Americas</option>
                                <option value="ANZ">ANZ</option>
                                <option value="BRAZIL">Brazil</option>
                                <option value="ROW">RoW</option>
                                <option value="ISAARC">ISAARC (India, Nepal...)</option>
                            </select>
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Industry</label>
                            <select name="industry" value={formData.industry} onChange={handleInputChange} className="ae-input">
                                <option value="">Select Industry</option>
                                {industries.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                <option value="ADD_NEW" style={{ fontWeight: 700, color: '#FF6B00' }}>+ Add New Industry</option>
                            </select>
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Customer Name</label>
                            <select
                                name="customer"
                                value={formData.customer}
                                onChange={handleInputChange}
                                className="ae-input"
                            >
                                <option value="">Select Customer</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                <option value="ADD_NEW" style={{ fontWeight: 700, color: '#FF6B00' }}>+ Add New Customer</option>
                            </select>
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Customer Email</label>
                            <input type="email" name="customer_email" value={formData.customer_email} onChange={handleInputChange} className="ae-input" />
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
                            <label className="ae-label">Opportunity Source</label>
                            <select name="opportunity_source" value={formData.opportunity_source} onChange={handleInputChange} className="ae-input">
                                <option value="">Select Source</option>
                                {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                <option value="ADD_NEW" style={{ fontWeight: 700, color: '#FF6B00' }}>+ Add New Source</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-4">
                        <label className="ae-label">Products (Select multiple)</label>
                        <div style={{ background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '16px' }}>
                            {/* Dropdown to add products */}
                            <select
                                className="ae-input"
                                onChange={(e) => {
                                    if (e.target.value === 'ADD_NEW') {
                                        setShowAddModal({ type: 'product', show: true });
                                        e.target.value = ''; // Reset
                                        return;
                                    }
                                    handleAddProduct(e.target.value);
                                    e.target.value = ''; // Reset after selection
                                }}
                                style={{ marginBottom: '12px' }}
                            >
                                <option value="">Select Product to Add...</option>
                                {productsList
                                    .filter(p => !formData.products?.includes(p.id)) // Only show unselected products
                                    .map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                                }
                                <option value="ADD_NEW" style={{ fontWeight: 700, color: '#FF6B00' }}>+ Add New Product</option>
                            </select>

                            {/* Selected Products Chips */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {formData.products?.map((prodId: number) => {
                                    const prod = productsList.find(p => p.id === prodId);
                                    if (!prod) return null;
                                    return (
                                        <div key={prodId} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            background: '#E6FFFA',
                                            color: '#2C7A7B',
                                            padding: '4px 10px',
                                            borderRadius: '20px',
                                            fontSize: '0.85rem',
                                            fontWeight: 600,
                                            border: '1px solid #B2F5EA'
                                        }}>
                                            {prod.name}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveProduct(prodId)}
                                                style={{ background: 'none', border: 'none', color: '#2C7A7B', cursor: 'pointer', padding: 0, display: 'flex' }}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    );
                                })}
                                {(!formData.products || formData.products.length === 0) && (
                                    <span style={{ fontSize: '0.85rem', color: '#718096', fontStyle: 'italic' }}>No products selected.</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Roles & Team */}
                <div className="section-panel" style={{ padding: '24px' }}>
                    <SectionHeader icon={Users} title="Roles & Team" />
                    <div className="ae-grid-4">
                        <div className="ae-input-group">
                            <label className="ae-label">Associate Contact</label>
                            <input type="text" name="associate_contact" value={formData.associate_contact} onChange={handleInputChange} className="ae-input" />
                        </div>
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
                        <div className="ae-input-group">
                            <label className="ae-label">Project Manager</label>
                            <input type="text" name="project_manager" value={formData.project_manager} onChange={handleInputChange} className="ae-input" />
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Project Manager Head</label>
                            <input type="text" name="project_manager_head" value={formData.project_manager_head} onChange={handleInputChange} className="ae-input" />
                        </div>
                        <div className="ae-input-group">
                            <label className="ae-label">Expected Close date</label>
                            <input type="date" name="expected_close_date" value={formData.expected_close_date} onChange={handleInputChange} className="ae-input" />
                        </div>
                    </div>
                </div>

                {/* Status & Remarks */}
                <div className="section-panel" style={{ padding: '24px' }}>
                    <SectionHeader icon={Clock} title="Status & Remarks" />
                    <div className="ae-grid-2">
                        <div className="ae-input-group">
                            <label className="ae-label">Remark (Important Information)</label>
                            <textarea name="remark" value={formData.remark} onChange={handleInputChange} className="ae-input" rows={3} />
                        </div>
                        {(formData.stage === 'CLOSED_WON' || formData.stage === 'CLOSED_LOST') && (
                            <div className="ae-input-group">
                                <label className="ae-label" style={{ color: '#E53E3E' }}>Reason for {formData.stage === 'CLOSED_WON' ? 'Won' : 'Lost'} *</label>
                                <textarea
                                    name="won_lost_reason"
                                    value={formData.won_lost_reason}
                                    onChange={handleInputChange}
                                    className="ae-input"
                                    rows={3}
                                    required
                                    style={{ border: '1px solid #E53E3E' }}
                                />
                            </div>
                        )}
                        <div className="ae-input-group" style={{ gridColumn: 'span 2' }}>
                            <label className="ae-label">Full Description</label>
                            <textarea name="description" value={formData.description} onChange={handleInputChange} className="ae-input" rows={3} />
                        </div>
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
                            {showAddModal.type === 'deal_owner' && (
                                <>
                                    <div className="ae-input-group">
                                        <label className="ae-label">Email *</label>
                                        <input type="email" className="ae-input" value={newItemExtra.email} onChange={(e) => setNewItemExtra({ ...newItemExtra, email: e.target.value })} required />
                                    </div>
                                    <div className="ae-input-group">
                                        <label className="ae-label">Contact Number</label>
                                        <input type="text" className="ae-input" value={newItemExtra.contact} onChange={(e) => setNewItemExtra({ ...newItemExtra, contact: e.target.value })} />
                                    </div>
                                </>
                            )}
                            {showAddModal.type === 'customer' && (
                                <div className="ae-input-group">
                                    <label className="ae-label">Email (Optional)</label>
                                    <input type="email" className="ae-input" value={newItemExtra.email} onChange={(e) => setNewItemExtra({ ...newItemExtra, email: e.target.value })} />
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                            <button onClick={() => setShowAddModal({ type: '', show: false })} className="ae-btn-secondary" style={{ flex: 1 }}>Cancel</button>
                            <button onClick={handleAddNew} className="ae-btn-primary" style={{ flex: 1 }} disabled={!newItemName || (showAddModal.type === 'deal_owner' && !newItemExtra.email) || loading}>
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
