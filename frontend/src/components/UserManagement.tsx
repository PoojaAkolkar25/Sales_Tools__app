import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { Mail, User as UserIcon, Shield, Loader2, Trash2, X, Users, CheckCircle, AlertCircle, Power, Pencil, Search, LayoutDashboard, PlusCircle, Paperclip, Eye } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const UserManagement: React.FC = () => {
    const { showNotification, showConfirm } = useNotification();
    const [users, setUsers] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'user' | 'partner' | 'end_customer' | 'company' | 'financial_year' | 'product'>('user');
    const [partners, setPartners] = useState<any[]>([]);
    const [endCustomers, setEndCustomers] = useState<any[]>([]);
    const [financialYears, setFinancialYears] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'app_user',
        mobile: '',
        department: '',
        region: '',
        reporting_to: ''
    });
    const [error, setError] = useState('');
    const [companyError, setCompanyError] = useState('');

    // Column Filters State
    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters] = useState(true);

    const [companyFormData, setCompanyFormData] = useState({
        name: '',
        logo: null as File | string | null,
        address_line_1: '',
        address_line_2: '',
        country: 'India',
        state: '',
        city: '',
        pincode: '',
        phone_number: '',
        mobile_number: '',
        email: '',
        website_url: '',
        financial_year_begins: '01-Apr',
        base_currency: 'INR',
        currency_symbol: '₹ / INR',
        decimal_places: '' as any, // Initialize as empty string for placeholder
        is_gst_applicable: true,
        gstin: '',
        state_code: '',
        msme_registered: false,
        msme_number: '',
        pan: '',
        tan: '',
        cin: ''
    });
    const [partnerFormData, setPartnerFormData] = useState({
        name: '',
        linked_company: '',
        type: 'CUSTOMER',
        industry: '',
        primary_contact: '',
        email: '',
        mobile: '',
        credit_limit: 0,
        payment_terms: 'NET_30',
        status: 'ACTIVE'
    });

    const [endCustomerFormData, setEndCustomerFormData] = useState({
        name: '',
        linked_partner: '',
        industry: '',
        location: '',
        contact_person: '',
        email: '',
        phone: '',
        deal_type: 'DIRECT',
        status: 'ACTIVE'
    });

    const [fyFormData, setFyFormData] = useState({
        code: '',
        start_date: '',
        end_date: '',
        label: '',
        status: 'ACTIVE',
        is_current_fy: false
    });

    const [productFormData, setProductFormData] = useState({
        product_code: '',
        name: '',
        category: 'SOFTWARE',
        subcategory: '',
        description: '',
        uom: '',
        standard_price: '' as any, // Initialize as empty string for placeholder
        tax_percentage: '' as any, // Initialize as empty string for placeholder
        hsn_sac_code: '',
        currency: 'INR',
        status: 'ACTIVE'
    });

    const location = useLocation();

    useEffect(() => {
        fetchData();
        const params = new URLSearchParams(location.search);
        const action = params.get('action');
        const mode = params.get('mode');

        if (action === 'create') {
            setShowForm(true);
        }

        if (mode === 'company') {
            setViewMode('company');
        }
    }, [location.search]);

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([
            fetchUsers(),
            fetchCompanies(),
            fetchStates(),
            fetchPartners(),
            fetchEndCustomers(),
            fetchFinancialYears(),
            fetchProducts()
        ]);
        setLoading(false);
    };

    const fetchUsers = async () => {
        try {
            const response = await api.get('auth/users/');
            setUsers(response.data);
        } catch (err) {
            console.error('Error fetching users', err);
        }
    };

    const fetchCompanies = async () => {
        try {
            const response = await api.get('finance/company-profile/');
            setCompanies(response.data);
        } catch (err) {
            console.error('Error fetching companies', err);
        }
    };

    const fetchStates = async () => {
        try {
            const response = await api.get('finance/state-masters/');
            setStates(response.data);
        } catch (err) {
            console.error('Error fetching states', err);
        }
    };

    const fetchPartners = async () => {
        try {
            const response = await api.get('finance/customer-partners/');
            setPartners(response.data);
        } catch (err) {
            console.error('Error fetching partners', err);
        }
    };

    const fetchEndCustomers = async () => {
        try {
            const response = await api.get('finance/end-customers/');
            setEndCustomers(response.data);
        } catch (err) {
            console.error('Error fetching end customers', err);
        }
    };

    const fetchFinancialYears = async () => {
        try {
            const response = await api.get('finance/financial-years/');
            setFinancialYears(response.data);
        } catch (err) {
            console.error('Error fetching financial years', err);
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await api.get('products/');
            setProducts(response.data);
        } catch (err) {
            console.error('Error fetching products', err);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await api.post('auth/users/', formData);
            showNotification('User created successfully', 'success');
            setFormData({
                username: '', email: '', password: '',
                first_name: '', last_name: '', role: 'app_user',
                mobile: '', department: '', region: '', reporting_to: ''
            });
            fetchUsers();
            setShowForm(false);
        } catch (err: any) {
            setError(err.response?.data?.username?.[0] || err.response?.data?.email?.[0] || 'Error creating user');
        }
    };

    const [editingId, setEditingId] = useState<number | null>(null);

    // ... (existing useEffect) ...

    const handleCreateCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        setCompanyError('');
        try {
            const formData = new FormData();
            Object.entries(companyFormData).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    // Special handling for logo: only append if it's a File (new upload)
                    if (key === 'logo') {
                        if (value instanceof File) {
                            formData.append(key, value);
                        }
                        // If it's a string (existing URL) or null, don't append (backend preserves existing unless explicit delete handling is added)
                    } else {
                        formData.append(key, value as any);
                    }
                }
            });

            if (editingId) {
                await api.patch(`finance / company - profile / ${editingId}/`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                showNotification('Customer updated successfully', 'success');
            } else {
                await api.post('finance/company-profile/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                showNotification('Customer created successfully', 'success');
            }

            setCompanyFormData({
                name: '', logo: null, address_line_1: '', address_line_2: '',
                country: 'India', state: '', city: '', pincode: '', phone_number: '',
                mobile_number: '', email: '', website_url: '', financial_year_begins: '01-Apr',
                base_currency: 'INR', currency_symbol: '₹ / INR', decimal_places: 2,
                is_gst_applicable: true, gstin: '', state_code: '',
                msme_registered: false, msme_number: '', pan: '', tan: '', cin: ''
            });
            setEditingId(null);
            fetchCompanies();
            setShowForm(false);
        } catch (err: any) {
            console.error('Error saving company', err);
            const errorData = err.response?.data;
            if (errorData && typeof errorData === 'object') {
                const errorMessages = Object.entries(errorData)
                    .map(([key, value]: [string, any]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                    .join(' | ');
                setCompanyError(errorMessages || 'Error saving customer');
            } else {
                setCompanyError(err.response?.data?.message || 'Error saving customer');
            }
        }
    };

    const handleCreatePartner = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.patch(`finance/customer-partners/${editingId}/`, partnerFormData);
                showNotification('Customer/Partner updated successfully', 'success');
            } else {
                await api.post('finance/customer-partners/', partnerFormData);
                showNotification('Customer/Partner created successfully', 'success');
            }
            setPartnerFormData({
                name: '', linked_company: '', type: 'CUSTOMER', industry: '',
                primary_contact: '', email: '', mobile: '', credit_limit: 0,
                payment_terms: 'NET_30', status: 'ACTIVE'
            });
            setEditingId(null);
            fetchPartners();
            setShowForm(false);
        } catch (err: any) {
            console.error('Error saving partner', err);
            showNotification('Error saving Customer/Partner', 'error');
        }
    };

    const handleCreateEndCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.patch(`finance/end-customers/${editingId}/`, endCustomerFormData);
                showNotification('End Customer updated successfully', 'success');
            } else {
                await api.post('finance/end-customers/', endCustomerFormData);
                showNotification('End Customer created successfully', 'success');
            }
            setEndCustomerFormData({
                name: '', linked_partner: '', industry: '', location: '',
                contact_person: '', email: '', phone: '', deal_type: 'DIRECT',
                status: 'ACTIVE'
            });
            setEditingId(null);
            fetchEndCustomers();
            setShowForm(false);
        } catch (err: any) {
            console.error('Error saving end customer', err);
            showNotification('Error saving End Customer', 'error');
        }
    };

    const handleCreateFinancialYear = async (e: React.FormEvent) => {
        e.preventDefault();
        // Validation: End Date > Start Date
        if (fyFormData.start_date && fyFormData.end_date && fyFormData.start_date >= fyFormData.end_date) {
            showNotification('End Date must be greater than Start Date', 'error');
            return;
        }

        try {
            if (editingId) {
                await api.patch(`finance/financial-years/${editingId}/`, fyFormData);
                showNotification('Financial Year updated successfully', 'success');
            } else {
                await api.post('finance/financial-years/', fyFormData);
                showNotification('Financial Year created successfully', 'success');
            }
            setFyFormData({
                code: '', start_date: '', end_date: '', label: '',
                status: 'ACTIVE', is_current_fy: false
            });
            setEditingId(null);
            fetchFinancialYears();
            setShowForm(false);
        } catch (err: any) {
            console.error('Error saving financial year', err);
            showNotification(err.response?.data?.message || 'Error saving Financial Year', 'error');
        }
    };

    const handleCreateProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.patch(`deals/products/${editingId}/`, productFormData);
                showNotification('Product/Service updated successfully', 'success');
            } else {
                await api.post('deals/products/', productFormData);
                showNotification('Product/Service created successfully', 'success');
            }
            setProductFormData({
                product_code: '', name: '', category: 'SOFTWARE', subcategory: '',
                description: '', uom: '', standard_price: 0, tax_percentage: 18,
                hsn_sac_code: '', currency: 'INR', status: 'ACTIVE'
            });
            setEditingId(null);
            fetchProducts();
            setShowForm(false);
        } catch (err: any) {
            console.error('Error saving product', err);
            showNotification('Error saving Product/Service', 'error');
        }
    };

    const handleDeleteUser = async (userId: number) => {
        showConfirm({
            title: 'Delete User',
            message: 'Are you sure you want to delete this user? This action cannot be undone.',
            onConfirm: async () => {
                try {
                    await api.delete(`auth/users/${userId}/`);
                    fetchUsers();
                    showNotification('User deleted successfully', 'success');
                } catch (err: any) {
                    console.error('Error deleting user', err);
                    showNotification('Error deleting user', 'error');
                }
            }
        });
    };

    const handleDeletePartner = async (id: number) => {
        showConfirm({
            title: 'Delete Partner',
            message: 'Are you sure you want to delete this partner? This action cannot be undone.',
            onConfirm: async () => {
                try {
                    await api.delete(`finance/customer-partners/${id}/`);
                    fetchPartners();
                    showNotification('Partner deleted successfully', 'success');
                } catch (err: any) {
                    console.error('Error deleting partner', err);
                    showNotification('Error deleting partner', 'error');
                }
            }
        });
    };

    const handleDeleteEndCustomer = async (id: number) => {
        showConfirm({
            title: 'Delete End Customer',
            message: 'Are you sure you want to delete this end customer? This action cannot be undone.',
            onConfirm: async () => {
                try {
                    await api.delete(`finance/end-customers/${id}/`);
                    fetchEndCustomers();
                    showNotification('End customer deleted successfully', 'success');
                } catch (err: any) {
                    console.error('Error deleting end customer', err);
                    showNotification('Error deleting end customer', 'error');
                }
            }
        });
    };

    const handleToggleStatus = async (id: number, type: 'user' | 'partner' | 'end_customer' | 'company') => {
        try {
            let endpoint = '';
            let method: 'post' | 'patch' = 'post';
            let data: any = {};

            if (type === 'user') {
                endpoint = `auth/users/${id}/toggle_status/`;
            } else if (type === 'partner') {
                const p = partners.find(p => p.id === id);
                if (!p) return;
                endpoint = `finance/customer-partners/${id}/`;
                method = 'patch';
                data = { status: p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' };
            } else if (type === 'end_customer') {
                const ec = endCustomers.find(ec => ec.id === id);
                if (!ec) return;
                endpoint = `finance/end-customers/${id}/`;
                method = 'patch';
                data = { status: ec.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' };
            } else {
                // For company profile, we don't have a status field yet, but we could add one.
                // For now, let's just show a notification.
                showNotification('Status toggle not implemented for Company Profile', 'info');
                return;
            }

            if (method === 'post') {
                await api.post(endpoint);
            } else {
                await api.patch(endpoint, data);
            }

            showNotification(`${type.replace('_', ' ')} status updated`, 'success');
            if (type === 'user') fetchUsers();
            else if (type === 'partner') fetchPartners();
            else if (type === 'end_customer') fetchEndCustomers();
            else fetchCompanies();
        } catch (err) {
            console.error('Error toggling status', err);
            showNotification('Error updating status', 'error');
        }
    };

    const handleCurrencyChange = (val: string) => {
        let symbol = '';
        switch (val) {
            case 'INR': symbol = '₹ / INR'; break;
            case 'USD': symbol = '$ / USD'; break;
            case 'EURO': symbol = '€ / EURO'; break;
        }

        setCompanyFormData({
            ...companyFormData,
            base_currency: val,
            currency_symbol: symbol
        });
    };

    const handleGSTINChange = (val: string) => {
        const gstin = val.toUpperCase();
        let stateCode = '';
        let stateId = '';

        if (gstin.length >= 2) {
            stateCode = gstin.substring(0, 2);
            /* eslint-disable-next-line */
            // @ts-ignore
            const matchedState = states.find(s => s.code === stateCode);
            if (matchedState) {
                stateId = matchedState.id;
            }
        }

        setCompanyFormData({
            ...companyFormData,
            gstin,
            state_code: stateCode,
            state: stateId || companyFormData.state
        });
    };

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchesSearch = (
                (user.username?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (user.role?.toLowerCase() || '').includes(searchTerm.toLowerCase())
            );

            const matchesFilters = Object.entries(columnFilters).every(([key, value]) => {
                if (!value) return true;
                const itemValue = (user as any)[key]?.toString().toLowerCase() ?? '';
                return itemValue.includes(value.toLowerCase());
            });

            return matchesSearch && matchesFilters;
        });
    }, [users, searchTerm, columnFilters]);

    const filteredPartners = useMemo(() => {
        return partners.filter(partner => {
            const matchesSearch = (
                (partner.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (partner.code?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (partner.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
            );

            const matchesFilters = Object.entries(columnFilters).every(([key, value]) => {
                if (!value) return true;
                const itemValue = (partner as any)[key]?.toString().toLowerCase() ?? '';
                return itemValue.includes(value.toLowerCase());
            });

            return matchesSearch && matchesFilters;
        });
    }, [partners, searchTerm, columnFilters]);

    const filteredEndCustomers = useMemo(() => {
        return endCustomers.filter(customer => {
            const matchesSearch = (
                (customer.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (customer.code?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (customer.contact_person?.toLowerCase() || '').includes(searchTerm.toLowerCase())
            );

            const matchesFilters = Object.entries(columnFilters).every(([key, value]) => {
                if (!value) return true;
                const itemValue = (customer as any)[key]?.toString().toLowerCase() ?? '';
                // Handle nested or special fields if necessary, e.g., linked_partner name
                // For now assuming flat structure or basic check
                return itemValue.includes(value.toLowerCase());
            });

            return matchesSearch && matchesFilters;
        });
    }, [endCustomers, searchTerm, columnFilters]);

    const filteredCompanies = useMemo(() => {
        return companies.filter(company => {
            const matchesSearch = (
                (company.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (company.city?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (company.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
            );

            const matchesFilters = Object.entries(columnFilters).every(([key, value]) => {
                if (!value) return true;
                const itemValue = (company as any)[key]?.toString().toLowerCase() ?? '';
                return itemValue.includes(value.toLowerCase());
            });

            return matchesSearch && matchesFilters;
        });
    }, [companies, searchTerm, columnFilters]);

    const filteredFinancialYears = useMemo(() => {
        return financialYears.filter(fy => {
            const matchesSearch = (
                (fy.label?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (fy.code?.toLowerCase() || '').includes(searchTerm.toLowerCase())
            );

            const matchesFilters = Object.entries(columnFilters).every(([key, value]) => {
                if (!value) return true;
                const itemValue = (fy as any)[key]?.toString().toLowerCase() ?? '';
                return itemValue.includes(value.toLowerCase());
            });

            return matchesSearch && matchesFilters;
        });
    }, [financialYears, searchTerm, columnFilters]);

    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const matchesSearch = (
                (product.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (product.product_code?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (product.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
            );

            const matchesFilters = Object.entries(columnFilters).every(([key, value]) => {
                if (!value) return true;
                const itemValue = (product as any)[key]?.toString().toLowerCase() ?? '';
                return itemValue.includes(value.toLowerCase());
            });

            return matchesSearch && matchesFilters;
        });
    }, [products, searchTerm, columnFilters]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="animate-spin text-[#0066CC]" size={40} />
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            minHeight: 'calc(100vh - 85px)'
        }}>
            {/* Header Area */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, paddingBottom: '16px', borderBottom: showForm ? '1px solid #E0E6ED' : 'none', marginBottom: showForm ? '24px' : '0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '4px', height: '24px', background: 'var(--theme-primary)', borderRadius: '2px' }}></div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        {showForm ? `${editingId ? 'Edit' : 'Create New'} ${viewMode === 'user' ? 'User' :
                            viewMode === 'partner' ? 'Partner' :
                                viewMode === 'end_customer' ? 'End Customer' : 'Customer'
                            }` : (
                            viewMode === 'user' ? 'User Management' :
                                viewMode === 'partner' ? 'Partner Management' :
                                    viewMode === 'end_customer' ? 'End Customer Management' :
                                        viewMode === 'company' ? 'Customer Management' :
                                            viewMode === 'financial_year' ? 'Financial Year Management' :
                                                viewMode === 'product' ? 'Product / Service Management' :
                                                    'User Management'
                        )}
                    </h1>
                </div>
            </div>

            {/* Dashboard / Create New Toggle */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                gap: '24px'
            }}>
                <div style={{
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'center',
                    background: 'var(--bg-primary)',
                    padding: '6px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-primary)',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <button
                        onClick={() => setShowForm(false)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 16px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: !showForm ? 'var(--theme-primary)' : 'transparent',
                            color: !showForm ? 'white' : 'var(--text-secondary)',
                            boxShadow: !showForm ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                        }}
                    >
                        <LayoutDashboard size={18} /> Dashboard
                    </button>
                    <button
                        onClick={() => {
                            setFormData({
                                username: '', email: '', password: '',
                                first_name: '', last_name: '', role: 'app_user',
                                mobile: '', department: '', region: '', reporting_to: ''
                            });
                            setPartnerFormData({
                                name: '', linked_company: '', type: 'CUSTOMER', industry: '',
                                primary_contact: '', email: '', mobile: '', credit_limit: 0,
                                payment_terms: 'NET_30', status: 'ACTIVE'
                            });
                            setEndCustomerFormData({
                                name: '', linked_partner: '', industry: '', location: '',
                                contact_person: '', email: '', phone: '', deal_type: 'DIRECT',
                                status: 'ACTIVE'
                            });
                            setCompanyFormData({
                                name: '', logo: null, address_line_1: '', address_line_2: '',
                                country: 'India', state: '', city: '', pincode: '', phone_number: '',
                                mobile_number: '', email: '', website_url: '', financial_year_begins: '01-Apr',
                                base_currency: 'INR', currency_symbol: '₹ / INR', decimal_places: 2,
                                is_gst_applicable: true, gstin: '', state_code: '',
                                msme_registered: false, msme_number: '', pan: '', tan: '', cin: ''
                            });
                            setEditingId(null);
                            setError('');
                            setCompanyError('');
                            setShowForm(true);
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 16px',
                            height: '32px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: showForm && !editingId ? 'var(--theme-primary)' : 'transparent',
                            color: showForm && !editingId ? 'white' : 'var(--text-secondary)',
                            boxShadow: showForm && !editingId ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                        }}
                    >
                        <PlusCircle size={18} /> Create New
                    </button>
                </div>
            </div>

            {/* Action Row - Only shown when not in form mode */}
            {
                !showForm && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{
                            display: 'flex',
                            gap: '4px',
                            alignItems: 'center',
                            background: 'var(--bg-primary)',
                            padding: '6px',
                            borderRadius: '12px',
                            border: '1px solid var(--border-primary)',
                            boxShadow: 'var(--shadow-sm)',
                            flex: 1,
                            marginRight: '16px'
                        }}>
                            <button
                                onClick={() => { setViewMode('user'); setColumnFilters({}); }}
                                style={{
                                    padding: '6px 20px',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: viewMode === 'user' ? 'var(--theme-primary)' : 'transparent',
                                    color: viewMode === 'user' ? 'white' : 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <UserIcon size={14} /> Users
                            </button>
                            <button
                                onClick={() => { setViewMode('partner'); setColumnFilters({}); }}
                                style={{
                                    padding: '6px 20px',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: viewMode === 'partner' ? 'var(--theme-primary)' : 'transparent',
                                    color: viewMode === 'partner' ? 'white' : 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <Shield size={14} /> Partner
                            </button>
                            <button
                                onClick={() => { setViewMode('end_customer'); setColumnFilters({}); }}
                                style={{
                                    padding: '6px 20px',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: viewMode === 'end_customer' ? 'var(--theme-primary)' : 'transparent',
                                    color: viewMode === 'end_customer' ? 'white' : 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <Users size={14} /> End Customer
                            </button>
                            <button
                                onClick={() => { setViewMode('company'); setColumnFilters({}); }}
                                style={{
                                    padding: '6px 20px',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: viewMode === 'company' ? 'var(--theme-primary)' : 'transparent',
                                    color: viewMode === 'company' ? 'white' : 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <Users size={14} /> Customer
                            </button>
                            <button
                                onClick={() => { setViewMode('financial_year'); setColumnFilters({}); }}
                                style={{
                                    padding: '6px 20px',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: viewMode === 'financial_year' ? 'var(--theme-primary)' : 'transparent',
                                    color: viewMode === 'financial_year' ? 'white' : 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <CheckCircle size={14} /> Financial Year
                            </button>
                            <button
                                onClick={() => { setViewMode('product'); setColumnFilters({}); }}
                                style={{
                                    padding: '6px 20px',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: viewMode === 'product' ? 'var(--theme-primary)' : 'transparent',
                                    color: viewMode === 'product' ? 'white' : 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <Shield size={14} /> Product / Service
                            </button>
                        </div>



                    </div>
                )
            }

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, overflowY: 'auto' }}>
                {showForm ? (
                    <form onSubmit={
                        viewMode === 'user' ? handleCreateUser :
                            viewMode === 'partner' ? handleCreatePartner :
                                viewMode === 'end_customer' ? handleCreateEndCustomer :
                                    viewMode === 'financial_year' ? handleCreateFinancialYear :
                                        viewMode === 'product' ? handleCreateProduct :
                                            handleCreateCompany
                    } style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{
                            background: 'var(--bg-primary)',
                            borderRadius: '12px',
                            padding: '24px',
                            border: '1px solid var(--border-primary)'
                        }}>
                            {viewMode === 'user' ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Username <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Username"
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                            required
                                            autoComplete="off"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            First Name
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="First Name"
                                            value={formData.first_name}
                                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Last Name
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Last Name"
                                            value={formData.last_name}
                                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Email Address <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <input
                                            type="email"
                                            placeholder="Email Address"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Password <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <input
                                            type="password"
                                            placeholder="Password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                            required
                                            autoComplete="new-password"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Role
                                        </label>
                                        <select
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                        >
                                            <option value="app_user">User</option>
                                            <option value="app_admin">Admin</option>
                                            <option value="sales_head">Sales Head</option>
                                            <option value="inside_sales_head">Inside Sales Head</option>
                                            <option value="pm_head">PM Head</option>
                                            <option value="salesperson">Salesperson</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Mobile Number
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Mobile Number"
                                            value={formData.mobile}
                                            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Department
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Department"
                                            value={formData.department}
                                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Region
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Region"
                                            value={formData.region}
                                            onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Reporting To
                                        </label>
                                        <select
                                            value={formData.reporting_to}
                                            onChange={(e) => setFormData({ ...formData, reporting_to: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                        >
                                            <option value="">Select Manager</option>
                                            {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            ) : viewMode === 'partner' ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Partner Name <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Partner Name"
                                            value={partnerFormData.name}
                                            onChange={(e) => setPartnerFormData({ ...partnerFormData, name: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Linked Company
                                        </label>
                                        <select
                                            value={partnerFormData.linked_company}
                                            onChange={(e) => setPartnerFormData({ ...partnerFormData, linked_company: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                        >
                                            <option value="">Select Company</option>
                                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Type
                                        </label>
                                        <select
                                            value={partnerFormData.type}
                                            onChange={(e) => setPartnerFormData({ ...partnerFormData, type: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                        >
                                            <option value="CUSTOMER">Customer</option>
                                            <option value="CHANNEL_PARTNER">Channel Partner</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Industry
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Industry"
                                            value={partnerFormData.industry}
                                            onChange={(e) => setPartnerFormData({ ...partnerFormData, industry: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Primary Contact Name
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Primary Contact Name"
                                            value={partnerFormData.primary_contact}
                                            onChange={(e) => setPartnerFormData({ ...partnerFormData, primary_contact: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            placeholder="Email Address"
                                            value={partnerFormData.email}
                                            onChange={(e) => setPartnerFormData({ ...partnerFormData, email: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Payment Terms
                                        </label>
                                        <select
                                            value={partnerFormData.payment_terms}
                                            onChange={(e) => setPartnerFormData({ ...partnerFormData, payment_terms: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                        >
                                            <option value="NET_30">Net 30</option>
                                            <option value="NET_60">Net 60</option>
                                            <option value="NET_90">Net 90</option>
                                            <option value="DUE_ON_RECEIPT">Due on Receipt</option>
                                        </select>
                                    </div>
                                </div>
                            ) : viewMode === 'end_customer' ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Customer Name <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Customer Name"
                                            value={endCustomerFormData.name}
                                            onChange={(e) => setEndCustomerFormData({ ...endCustomerFormData, name: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Linked Partner <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <select
                                            value={endCustomerFormData.linked_partner}
                                            onChange={(e) => setEndCustomerFormData({ ...endCustomerFormData, linked_partner: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                            required
                                        >
                                            <option value="">Select Partner</option>
                                            {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Deal Type
                                        </label>
                                        <select
                                            value={endCustomerFormData.deal_type}
                                            onChange={(e) => setEndCustomerFormData({ ...endCustomerFormData, deal_type: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                        >
                                            <option value="DIRECT">Direct</option>
                                            <option value="INDIRECT">Indirect</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Location
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Location"
                                            value={endCustomerFormData.location}
                                            onChange={(e) => setEndCustomerFormData({ ...endCustomerFormData, location: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Contact Person
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Contact Person"
                                            value={endCustomerFormData.contact_person}
                                            onChange={(e) => setEndCustomerFormData({ ...endCustomerFormData, contact_person: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            placeholder="Email Address"
                                            value={endCustomerFormData.email}
                                            onChange={(e) => setEndCustomerFormData({ ...endCustomerFormData, email: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                        />
                                    </div>
                                </div>
                            ) : viewMode === 'financial_year' ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Label (e.g. FY 2025-26) <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Label"
                                            value={fyFormData.label}
                                            onChange={(e) => setFyFormData({ ...fyFormData, label: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Start Date <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={fyFormData.start_date}
                                            onChange={(e) => setFyFormData({ ...fyFormData, start_date: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            End Date <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={fyFormData.end_date}
                                            onChange={(e) => setFyFormData({ ...fyFormData, end_date: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                            required
                                        />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '24px' }}>
                                        <input
                                            type="checkbox"
                                            id="is_current_fy"
                                            checked={fyFormData.is_current_fy}
                                            onChange={(e) => setFyFormData({ ...fyFormData, is_current_fy: e.target.checked })}
                                        />
                                        <label htmlFor="msme_registered" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>MSME Registered</label>
                                    </div>
                                </div>
                            ) : viewMode === 'product' ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Product Name <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Product Name"
                                            value={productFormData.name}
                                            onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Category
                                        </label>
                                        <select
                                            value={productFormData.category}
                                            onChange={(e) => setProductFormData({ ...productFormData, category: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                        >
                                            <option value="SOFTWARE">Software</option>
                                            <option value="SERVICE">Service</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Subcategory
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Subcategory"
                                            value={productFormData.subcategory}
                                            onChange={(e) => setProductFormData({ ...productFormData, subcategory: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Standard Price
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={productFormData.standard_price}
                                            onChange={(e) => setProductFormData({ ...productFormData, standard_price: e.target.value === '' ? '' : Number(e.target.value) })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Tax Percentage (%)
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="18"
                                            value={productFormData.tax_percentage}
                                            onChange={(e) => setProductFormData({ ...productFormData, tax_percentage: e.target.value === '' ? '' : Number(e.target.value) })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            UOM
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="UOM"
                                            value={productFormData.uom}
                                            onChange={(e) => setProductFormData({ ...productFormData, uom: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                    {/* Company Form Content */}
                                    {companyError && (
                                        <div style={{ padding: '10px', background: '#FFF5F5', border: '1px solid #FC8181', borderRadius: '6px', color: '#C53030', fontSize: '0.85rem' }}>
                                            {companyError}
                                        </div>
                                    )}

                                    <div className="section">
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                                            Customer Basic Details
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Customer Name <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Customer Name"
                                                    value={companyFormData.name}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, name: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Logo
                                                </label>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '6px 10px', // Match text input padding
                                                    background: 'var(--bg-primary)', // Match text input background
                                                    borderRadius: '6px', // Match text input border radius
                                                    border: '1px solid var(--border-primary)', // Match text input border
                                                    height: '34px', // Match text input height
                                                    width: '100%'
                                                }}>
                                                    <input
                                                        type="file"
                                                        id="logo-upload"
                                                        accept="image/*"
                                                        style={{ display: 'none' }}
                                                        onChange={(e) => setCompanyFormData({ ...companyFormData, logo: e.target.files ? e.target.files[0] : null })}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => document.getElementById('logo-upload')?.click()}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            background: 'var(--bg-primary)',
                                                            color: 'var(--text-primary)',
                                                            border: '1px solid var(--border-primary)',
                                                            height: '24px', // Reduced height to fit inside the input-like container
                                                            padding: '0 8px',
                                                            borderRadius: '4px', // Slightly smaller radius
                                                            fontWeight: 600,
                                                            fontSize: '0.75rem',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        <Paperclip size={12} /> Attach Logo
                                                    </button>

                                                    <div style={{ flex: 1, display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 0', alignItems: 'center' }}>
                                                        {companyFormData.logo && companyFormData.logo instanceof File && (
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                                flex: 1, // Allow this container to take available space
                                                                minWidth: 0, // Crucial for text truncation in flexbox
                                                                justifyContent: 'space-between' // Push buttons to the far right
                                                            }}>
                                                                <span style={{
                                                                    fontSize: '0.85rem',
                                                                    color: '#4A5568',
                                                                    fontWeight: 500,
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                    maxWidth: '150px' // Strictly constrain width to prevent layout shift
                                                                }} title={companyFormData.logo.name}>
                                                                    {companyFormData.logo.name}
                                                                </span>
                                                                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (companyFormData.logo instanceof File) {
                                                                                const url = URL.createObjectURL(companyFormData.logo);
                                                                                window.open(url, '_blank');
                                                                            }
                                                                        }}
                                                                        style={{ cursor: 'pointer', background: 'none', border: 'none', padding: '2px', color: '#718096', display: 'flex' }}
                                                                        title="View Pending Logo"
                                                                    >
                                                                        <Eye size={14} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setCompanyFormData({ ...companyFormData, logo: null })}
                                                                        style={{ cursor: 'pointer', background: 'none', border: 'none', padding: '2px', color: '#E53E3E' }}
                                                                        title="Remove pending file"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {companyFormData.logo && typeof companyFormData.logo === 'string' && (
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                                flex: 1,
                                                                minWidth: 0,
                                                                justifyContent: 'space-between'
                                                            }}>
                                                                <span style={{
                                                                    fontSize: '0.85rem',
                                                                    fontWeight: 500,
                                                                    color: '#4A5568',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                    maxWidth: '150px' // Strictly constrain width
                                                                }} title="Current Logo">
                                                                    Current Logo
                                                                </span>
                                                                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => window.open(companyFormData.logo as string, '_blank')}
                                                                        style={{ cursor: 'pointer', background: 'none', border: 'none', padding: '2px', color: '#718096', display: 'flex' }}
                                                                        title="View Current Logo"
                                                                    >
                                                                        <Eye size={14} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setCompanyFormData({ ...companyFormData, logo: null })}
                                                                        style={{ cursor: 'pointer', background: 'none', border: 'none', padding: '2px', color: '#E53E3E' }}
                                                                        title="Delete Current Logo"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {!companyFormData.logo && (
                                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginLeft: '10px' }}>
                                                                No logo uploaded
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Email Address
                                                </label>
                                                <input
                                                    type="email"
                                                    placeholder="Email Address"
                                                    value={companyFormData.email}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, email: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Phone Number
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Phone Number"
                                                    value={companyFormData.phone_number}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, phone_number: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Mobile Number
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Mobile Number"
                                                    value={companyFormData.mobile_number}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, mobile_number: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Website URL
                                                </label>
                                                <input
                                                    type="url"
                                                    placeholder="Website URL"
                                                    value={companyFormData.website_url}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, website_url: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="section" style={{ borderTop: '1px solid var(--border-primary)', paddingTop: '32px' }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                                            {viewMode === 'company' ? 'Address Details' : viewMode === 'product' ? 'Pricing Details' : 'Additional Details'}
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Address Line 1
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Address Line 1"
                                                    value={companyFormData.address_line_1}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, address_line_1: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Address Line 2
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Address Line 2"
                                                    value={companyFormData.address_line_2}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, address_line_2: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Country
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Country"
                                                    value={companyFormData.country}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, country: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    State
                                                </label>
                                                <select
                                                    value={companyFormData.state}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, state: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                                >
                                                    <option value="">Select State</option>
                                                    {states.map(state => (
                                                        <option key={state.id} value={state.id}>{state.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    City
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="City"
                                                    value={companyFormData.city}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, city: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Pincode
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Pincode"
                                                    value={companyFormData.pincode}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, pincode: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="section" style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px' }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                                            Financial Settings
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Financial Year Begins
                                                </label>
                                                <select
                                                    value={companyFormData.financial_year_begins}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, financial_year_begins: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                                >
                                                    <option value="01-Apr">01-Apr</option>
                                                    <option value="01-Jan">01-Jan</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Base Currency
                                                </label>
                                                <select
                                                    value={companyFormData.base_currency}
                                                    onChange={(e) => handleCurrencyChange(e.target.value)}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                                >
                                                    <option value="INR">INR</option>
                                                    <option value="USD">USD</option>
                                                    <option value="EURO">EURO</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Decimal Places
                                                </label>
                                                <input
                                                    type="number"
                                                    placeholder="2"
                                                    value={companyFormData.decimal_places}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, decimal_places: e.target.value === '' ? '' : parseInt(e.target.value) })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="section" style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px' }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                                            Tax Registration Details
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', gridColumn: 'span 3', marginBottom: '8px' }}>
                                                <input
                                                    type="checkbox"
                                                    id="is_gst_applicable"
                                                    checked={companyFormData.is_gst_applicable}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, is_gst_applicable: e.target.checked })}
                                                />
                                                <label htmlFor="is_gst_applicable" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>GST Applicable</label>
                                            </div>
                                            {companyFormData.is_gst_applicable && (
                                                <>
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                            GSTIN
                                                        </label>
                                                        <input
                                                            type="text"
                                                            placeholder="GSTIN"
                                                            value={companyFormData.gstin}
                                                            onChange={(e) => handleGSTINChange(e.target.value)}
                                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                            State Code
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={companyFormData.state_code}
                                                            readOnly
                                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', outline: 'none' }}
                                                        />
                                                    </div>
                                                </>
                                            )}
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    PAN
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="PAN"
                                                    value={companyFormData.pan}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, pan: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    TAN
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="TAN"
                                                    value={companyFormData.tan}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, tan: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    CIN
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="CIN"
                                                    value={companyFormData.cin}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, cin: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="section" style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px' }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                                            MSME Details
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', gridColumn: 'span 3', marginBottom: '8px' }}>
                                                <input
                                                    type="checkbox"
                                                    id="msme_registered"
                                                    checked={companyFormData.msme_registered}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, msme_registered: e.target.checked })}
                                                />
                                                <label htmlFor="msme_registered" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>MSME Registered</label>
                                            </div>
                                            {companyFormData.msme_registered && (
                                                <div>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                        MSME Number
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="MSME Number"
                                                        value={companyFormData.msme_number}
                                                        onChange={(e) => setCompanyFormData({ ...companyFormData, msme_number: e.target.value })}
                                                        style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', outline: 'none' }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'var(--bg-primary)',
                            padding: '6px',
                            borderRadius: '12px',
                            border: '1px solid var(--border-primary)',
                            boxShadow: 'var(--shadow-sm)',
                            width: 'fit-content'
                        }}>
                            <button
                                type="submit"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 16px',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    background: 'var(--theme-primary)',
                                    color: 'white',
                                    border: 'none',
                                    fontWeight: 800,
                                    cursor: 'pointer'
                                }}
                            >
                                <CheckCircle size={16} /> {
                                    viewMode === 'user' ? (editingId ? 'UPDATE USER' : 'CREATE USER') :
                                        viewMode === 'partner' ? (editingId ? 'UPDATE PARTNER' : 'SAVE PARTNER RECORD') :
                                            viewMode === 'end_customer' ? (editingId ? 'UPDATE END CUSTOMER' : 'SAVE END CUSTOMER RECORD') :
                                                viewMode === 'financial_year' ? (editingId ? 'UPDATE FY' : 'SAVE FY RECORD') :
                                                    viewMode === 'product' ? (editingId ? 'UPDATE PRODUCT' : 'SAVE PRODUCT RECORD') :
                                                        (editingId ? 'UPDATE CUSTOMER' : 'SAVE CUSTOMER RECORD')
                                }
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowForm(false);
                                    setEditingId(null);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 16px',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    background: 'transparent',
                                    color: 'var(--text-secondary)',
                                    border: 'none',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={16} /> Cancel
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="section-panel !p-0 overflow-hidden">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-secondary)' }}>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {viewMode === 'user' ? 'User' : viewMode === 'partner' ? 'Partner' : viewMode === 'end_customer' ? 'End Customer' : viewMode === 'financial_year' ? 'Financial Year' : viewMode === 'product' ? 'Product / Service' : 'Customer'}
                                    </th>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {viewMode === 'financial_year' ? 'Start Date' : viewMode === 'product' ? 'Category' : 'Email'}
                                    </th>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {viewMode === 'user' ? 'Role' : viewMode === 'partner' ? 'Type / Industry' : viewMode === 'end_customer' ? 'Partner / Location' : viewMode === 'financial_year' ? 'End Date' : viewMode === 'product' ? 'Code / Sub' : 'City / State'}
                                    </th>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                                </tr>
                                {showFilters && (
                                    <tr style={{ background: 'var(--bg-secondary)' }}>
                                        <th style={{ padding: '8px 24px' }}>
                                            <div className="ae-input-group !mb-0">
                                                <Search className="ae-search-icon" size={12} />
                                                <input
                                                    className="ae-input"
                                                    placeholder="Filter..."
                                                    value={columnFilters[viewMode === 'user' ? 'username' : viewMode === 'partner' ? 'name' : viewMode === 'end_customer' ? 'name' : viewMode === 'financial_year' ? 'label' : viewMode === 'product' ? 'name' : 'name'] || ''}
                                                    onChange={(e) => setColumnFilters({ ...columnFilters, [viewMode === 'user' ? 'username' : viewMode === 'partner' ? 'name' : viewMode === 'end_customer' ? 'name' : viewMode === 'financial_year' ? 'label' : viewMode === 'product' ? 'name' : 'name']: e.target.value })}
                                                    style={{ height: '28px', fontSize: '11px' }}
                                                />
                                            </div>
                                        </th>
                                        <th style={{ padding: '8px 24px' }}>
                                            <div className="ae-input-group !mb-0">
                                                <Search className="ae-search-icon" size={12} />
                                                <input
                                                    className="ae-input"
                                                    placeholder="Filter..."
                                                    value={columnFilters[viewMode === 'user' ? 'email' : viewMode === 'partner' ? 'email' : viewMode === 'end_customer' ? 'email' : viewMode === 'financial_year' ? 'start_date' : viewMode === 'product' ? 'category' : 'email'] || ''}
                                                    onChange={(e) => setColumnFilters({ ...columnFilters, [viewMode === 'user' ? 'email' : viewMode === 'partner' ? 'email' : viewMode === 'end_customer' ? 'email' : viewMode === 'financial_year' ? 'start_date' : viewMode === 'product' ? 'category' : 'email']: e.target.value })}
                                                    style={{ height: '28px', fontSize: '11px' }}
                                                />
                                            </div>
                                        </th>
                                        <th style={{ padding: '8px 24px' }}>
                                            <div className="ae-input-group !mb-0">
                                                <Search className="ae-search-icon" size={12} />
                                                <input
                                                    className="ae-input"
                                                    placeholder="Filter..."
                                                    value={columnFilters[viewMode === 'user' ? 'role' : viewMode === 'partner' ? 'type' : viewMode === 'end_customer' ? 'location' : viewMode === 'financial_year' ? 'end_date' : viewMode === 'product' ? 'product_code' : 'city'] || ''}
                                                    onChange={(e) => setColumnFilters({ ...columnFilters, [viewMode === 'user' ? 'role' : viewMode === 'partner' ? 'type' : viewMode === 'end_customer' ? 'location' : viewMode === 'financial_year' ? 'end_date' : viewMode === 'product' ? 'product_code' : 'city']: e.target.value })}
                                                    style={{ height: '28px', fontSize: '11px' }}
                                                />
                                            </div>
                                        </th>
                                        <th style={{ padding: '8px 24px' }}>
                                            <div className="ae-input-group !mb-0">
                                                <Search className="ae-search-icon" size={12} />
                                                <input
                                                    className="ae-input"
                                                    placeholder="Filter..."
                                                    value={columnFilters[viewMode === 'user' ? 'is_active' : 'status'] || ''}
                                                    onChange={(e) => setColumnFilters({ ...columnFilters, [viewMode === 'user' ? 'is_active' : 'status']: e.target.value })}
                                                    style={{ height: '28px', fontSize: '11px' }}
                                                />
                                            </div>
                                        </th>
                                        <th style={{ padding: '8px 24px', textAlign: 'right' }}>
                                            <button
                                                onClick={() => { setColumnFilters({}); setSearchTerm(''); }}
                                                style={{ height: '24px', width: '100px', fontSize: '10px', color: 'var(--theme-primary)', fontWeight: 700, cursor: 'pointer', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px' }}
                                            >
                                                Clear
                                            </button>
                                        </th>
                                    </tr>
                                )}
                            </thead>
                            <tbody>
                                {viewMode === 'user' ? filteredUsers.map((user) => (
                                    <tr key={user.id} className="ae-table-row">
                                        <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 bg-[var(--ae-blue)]/10 text-[var(--ae-blue)] rounded-full flex items-center justify-center">
                                                    <UserIcon size={20} />
                                                </div>
                                                <div className="ml-4">
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{user.username}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.first_name} {user.last_name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                            <div className="flex items-center gap-2" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                                <Mail size={14} className="text-gray-400" /> {user.email || '—'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                background: user.role === 'app_admin' ? 'rgba(159, 122, 234, 0.1)' : 'var(--bg-accent)',
                                                color: user.role === 'app_admin' ? '#9F7AEA' : 'var(--ae-blue)'
                                            }}>
                                                <Shield size={12} />
                                                {user.role === 'app_admin' ? 'Admin' :
                                                    user.role === 'sales_head' ? 'Sales Head' :
                                                        user.role === 'pm_head' ? 'PM Head' :
                                                            user.role === 'salesperson' ? 'Salesperson' :
                                                                user.role === 'inside_sales_head' ? 'IS Head' : 'User'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '0.7rem',
                                                fontWeight: 800,
                                                textTransform: 'uppercase',
                                                background: user.is_active ? 'rgba(0, 200, 83, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                                                color: user.is_active ? '#00C853' : '#F44336'
                                            }}>
                                                {user.is_active ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => handleToggleStatus(user.id, 'user')}
                                                    style={{ padding: '8px', color: user.is_active ? '#00C853' : '#F44336', border: 'none', background: user.is_active ? 'rgba(0, 200, 83, 0.1)' : 'rgba(244, 67, 54, 0.1)', cursor: 'pointer', borderRadius: '6px', transition: 'all 0.2s' }}
                                                    title={user.is_active ? "Deactivate User" : "Activate User"}
                                                >
                                                    <Power size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    style={{ padding: '8px', color: '#E53E3E', border: 'none', background: 'rgba(229, 62, 62, 0.1)', cursor: 'pointer', borderRadius: '6px', transition: 'all 0.2s' }}
                                                    title="Delete User"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : viewMode === 'partner' ? filteredPartners.map((p) => (
                                    <tr key={p.id} className="ae-table-row">
                                        <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 bg-[var(--ae-blue)]/10 text-[var(--ae-blue)] rounded-full flex items-center justify-center">
                                                    <Shield size={20} />
                                                </div>
                                                <div className="ml-4">
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{p.code}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{p.email || '—'}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{p.mobile || '—'}</div>
                                        </td>
                                        <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{p.type}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{p.industry || '—'}</div>
                                        </td>
                                        <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', background: p.status === 'ACTIVE' ? 'rgba(0, 200, 83, 0.1)' : 'rgba(244, 67, 54, 0.1)', color: p.status === 'ACTIVE' ? '#00C853' : '#F44336' }}>
                                                {p.status === 'ACTIVE' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                                {p.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => handleToggleStatus(p.id, 'partner')}
                                                    style={{ padding: '8px', color: p.status === 'ACTIVE' ? '#00C853' : '#F44336', border: 'none', background: p.status === 'ACTIVE' ? 'rgba(0, 200, 83, 0.1)' : 'rgba(244, 67, 54, 0.1)', cursor: 'pointer', borderRadius: '6px' }}
                                                >
                                                    <Power size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePartner(p.id)}
                                                    style={{ padding: '8px', color: '#E53E3E', border: 'none', background: 'rgba(229, 62, 62, 0.1)', cursor: 'pointer', borderRadius: '6px' }}
                                                    title="Delete Partner"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setPartnerFormData({ ...p });
                                                        setEditingId(p.id);
                                                        setShowForm(true);
                                                    }}
                                                    style={{ padding: '8px', color: 'var(--ae-blue)', border: 'none', background: 'rgba(0, 102, 204, 0.1)', cursor: 'pointer', borderRadius: '6px' }}
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : viewMode === 'end_customer' ? filteredEndCustomers.map((ec) => (
                                    <tr key={ec.id} className="ae-table-row">
                                        <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
                                                    <UserIcon size={20} />
                                                </div>
                                                <div className="ml-4">
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{ec.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{ec.code}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{ec.email || '—'}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{ec.phone || '—'}</div>
                                        </td>
                                        <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{ec.partner_name || '—'}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{ec.location || '—'}</div>
                                        </td>
                                        <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', background: ec.status === 'ACTIVE' ? 'rgba(0, 200, 83, 0.1)' : 'rgba(244, 67, 54, 0.1)', color: ec.status === 'ACTIVE' ? '#00C853' : '#F44336' }}>
                                                {ec.status === 'ACTIVE' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                                {ec.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => handleToggleStatus(ec.id, 'end_customer')}
                                                    style={{ padding: '8px', color: ec.status === 'ACTIVE' ? '#00C853' : '#F44336', border: 'none', background: ec.status === 'ACTIVE' ? 'rgba(0, 200, 83, 0.1)' : 'rgba(244, 67, 54, 0.1)', cursor: 'pointer', borderRadius: '6px' }}
                                                >
                                                    <Power size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteEndCustomer(ec.id)}
                                                    style={{ padding: '8px', color: '#E53E3E', border: 'none', background: 'rgba(229, 62, 62, 0.1)', cursor: 'pointer', borderRadius: '6px' }}
                                                    title="Delete End Customer"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEndCustomerFormData({ ...ec });
                                                        setEditingId(ec.id);
                                                        setShowForm(true);
                                                    }}
                                                    style={{ padding: '8px', color: 'var(--ae-blue)', border: 'none', background: 'rgba(0, 102, 204, 0.1)', cursor: 'pointer', borderRadius: '6px' }}
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : viewMode === 'financial_year' ? filteredFinancialYears.map((fy) => (
                                    <tr key={fy.id} className="ae-table-row">
                                        <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                                                    <CheckCircle size={20} />
                                                </div>
                                                <div className="ml-4">
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{fy.label}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{fy.code} {fy.is_current_fy && <span style={{ background: '#EBF4FF', color: '#1B66D1', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', marginLeft: '8px' }}>CURRENT</span>}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{fy.start_date}</div>
                                        </td>
                                        <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{fy.end_date}</div>
                                        </td>
                                        <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', background: fy.status === 'ACTIVE' ? 'rgba(0, 200, 83, 0.1)' : 'rgba(244, 67, 54, 0.1)', color: fy.status === 'ACTIVE' ? '#00C853' : '#F44336' }}>
                                                {fy.status === 'ACTIVE' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                                {fy.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => {
                                                        setFyFormData({ ...fy });
                                                        setEditingId(fy.id);
                                                        setShowForm(true);
                                                    }}
                                                    style={{ padding: '8px', color: 'var(--ae-blue)', border: 'none', background: 'rgba(0, 102, 204, 0.1)', cursor: 'pointer', borderRadius: '6px' }}
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : viewMode === 'product' ? filteredProducts.map((prd) => (
                                    <tr key={prd.id} className="ae-table-row">
                                        <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                                                    <Shield size={20} />
                                                </div>
                                                <div className="ml-4">
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{prd.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{prd.product_code}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{prd.category}</div>
                                        </td>
                                        <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{prd.subcategory || '—'}</div>
                                        </td>
                                        <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', background: prd.status === 'ACTIVE' ? 'rgba(0, 200, 83, 0.1)' : 'rgba(244, 67, 54, 0.1)', color: prd.status === 'ACTIVE' ? '#00C853' : '#F44336' }}>
                                                {prd.status === 'ACTIVE' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                                {prd.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => {
                                                        setProductFormData({ ...prd });
                                                        setEditingId(prd.id);
                                                        setShowForm(true);
                                                    }}
                                                    style={{ padding: '8px', color: 'var(--ae-blue)', border: 'none', background: 'rgba(0, 102, 204, 0.1)', cursor: 'pointer', borderRadius: '6px' }}
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : filteredCompanies.map((comp) => (
                                    <tr key={comp.id} className="ae-table-row">
                                        <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] rounded-full flex items-center justify-center">
                                                    <Users size={20} />
                                                </div>
                                                <div className="ml-4">
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{comp.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{comp.alias_name || 'No Alias'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                            <div className="flex items-center gap-2" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                                <Mail size={14} className="text-gray-400" /> {comp.email || '—'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{comp.city || '—'}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{comp.state_name || '—'}</div>
                                        </td>
                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', background: 'rgba(0, 200, 83, 0.1)', color: '#00C853' }}>
                                                <CheckCircle size={12} /> Active
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => {
                                                        setCompanyFormData({ ...comp, logo: comp.logo || null }); // Ensure logo is preserved
                                                        setEditingId(comp.id); // Set the editing ID
                                                        setViewMode('company');
                                                        setShowForm(true);
                                                    }}
                                                    style={{ padding: '8px', color: 'var(--ae-blue)', border: 'none', background: 'rgba(0, 102, 204, 0.1)', cursor: 'pointer', borderRadius: '6px' }}
                                                    title="Edit Customer"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div >
    );
};

export default UserManagement;

