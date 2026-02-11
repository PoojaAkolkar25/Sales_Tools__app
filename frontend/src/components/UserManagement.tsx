import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { UserPlus, Mail, User as UserIcon, Shield, Loader2, Trash2, X, Users, CheckCircle, AlertCircle, Power, Pencil } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const UserManagement: React.FC = () => {
    const { showNotification, showConfirm } = useNotification();
    const [users, setUsers] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'user' | 'company'>('user');
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: ''
    });
    const [error, setError] = useState('');

    // Feature: Company Creation (Replacing Customer)
    const [activeTab, setActiveTab] = useState<'user' | 'company'>('user');
    const [companyFormData, setCompanyFormData] = useState({
        name: '',
        alias_name: '',
        logo: null as File | null,
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
        decimal_places: 2,
        is_gst_applicable: true,
        gstin: '',
        state_code: '',
        msme_registered: false,
        msme_number: '',
        pan: '',
        tan: '',
        cin: ''
    });
    const [companyError, setCompanyError] = useState('');

    const location = useLocation();

    useEffect(() => {
        fetchData();
        const params = new URLSearchParams(location.search);
        if (params.get('action') === 'create') {
            setShowForm(true);
        }
    }, [location.search]);

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([fetchUsers(), fetchCompanies(), fetchStates()]);
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

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await api.post('auth/users/', formData);
            showNotification('User created successfully', 'success');
            setFormData({ username: '', email: '', password: '', first_name: '', last_name: '' });
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.username?.[0] || err.response?.data?.email?.[0] || 'Error creating user');
        }
    };

    const handleCreateCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        setCompanyError('');
        try {
            const formData = new FormData();
            Object.entries(companyFormData).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    formData.append(key, value as any);
                }
            });

            await api.post('finance/company-profile/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            showNotification('Company created successfully', 'success');
            setCompanyFormData({
                name: '', alias_name: '', logo: null, address_line_1: '', address_line_2: '',
                country: 'India', state: '', city: '', pincode: '', phone_number: '',
                mobile_number: '', email: '', website_url: '', financial_year_begins: '01-Apr',
                base_currency: 'INR', currency_symbol: '₹ / INR', decimal_places: 2,
                is_gst_applicable: true, gstin: '', state_code: '',
                msme_registered: false, msme_number: '', pan: '', tan: '', cin: ''
            });
            fetchCompanies();
            setShowForm(false);
        } catch (err: any) {
            console.error('Error creating company', err);
            setCompanyError(err.response?.data?.message || 'Error creating company');
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

    const handleToggleStatus = async (id: number, type: 'user' | 'company') => {
        try {
            const endpoint = type === 'user' ? `auth/users/${id}/toggle_status/` : `finance/company-profile/${id}/`;
            // For companies, we might just be editing the record.
            // If there's no explicit toggle_status, we might need to implement it.
            // Assuming for now it's just a placeholder or we can add it later.
            await api.post(endpoint);
            showNotification(`${type === 'user' ? 'User' : 'Company'} status updated`, 'success');
            if (type === 'user') fetchUsers();
            else fetchCompanies();
        } catch (err) {
            console.error('Error toggling status', err);
            showNotification('Error updating status', 'error');
        }
    };

    const handleGSTINChange = (val: string) => {
        const gstin = val.toUpperCase();
        let stateCode = '';
        let stateId = '';

        if (gstin.length >= 2) {
            stateCode = gstin.substring(0, 2);
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

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="animate-spin text-[#0066CC]" size={40} />
            </div>
        );
    }

    return (
        <div className="ae-table-container" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            minHeight: 'calc(100vh - 85px)',
            background: 'white',
            border: '1px solid #E0E6ED',
            borderRadius: '16px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            padding: '20px'
        }}>
            {/* Header Area */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '4px', height: '18px', background: '#FF6B00', borderRadius: '2px' }}></div>
                    <h1 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1a1f36', margin: 0 }}>
                        User Management
                    </h1>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{
                        display: 'flex',
                        background: '#F1F5F9',
                        borderRadius: '10px',
                        padding: '4px',
                        border: '1px solid #E2E8F0'
                    }}>
                        <button
                            onClick={() => setViewMode('user')}
                            style={{
                                padding: '6px 16px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                borderRadius: '7px',
                                border: 'none',
                                background: viewMode === 'user' ? 'white' : 'transparent',
                                color: viewMode === 'user' ? '#1a1f36' : '#64748B',
                                boxShadow: viewMode === 'user' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <UserIcon size={14} /> Users
                        </button>
                        <button
                            onClick={() => setViewMode('company')}
                            style={{
                                padding: '6px 16px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                borderRadius: '7px',
                                border: 'none',
                                background: viewMode === 'company' ? 'white' : 'transparent',
                                color: viewMode === 'company' ? '#1a1f36' : '#64748B',
                                boxShadow: viewMode === 'company' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Users size={14} /> Companies
                        </button>
                    </div>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        style={{
                            height: '36px',
                            fontSize: '0.85rem',
                            background: showForm ? '#FFF5F5' : '#FF6B00',
                            color: showForm ? '#E53E3E' : 'white',
                            border: showForm ? '1px solid #FEB2B2' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '0 20px',
                            borderRadius: '10px',
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                            fontWeight: 700
                        }}
                        onMouseEnter={(e) => {
                            if (showForm) {
                                e.currentTarget.style.background = '#E53E3E';
                                e.currentTarget.style.color = 'white';
                                e.currentTarget.style.borderColor = '#E53E3E';
                            } else {
                                e.currentTarget.style.background = '#E65200';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (showForm) {
                                e.currentTarget.style.background = '#FFF5F5';
                                e.currentTarget.style.color = '#E53E3E';
                                e.currentTarget.style.borderColor = '#FEB2B2';
                            } else {
                                e.currentTarget.style.background = '#FF6B00';
                                e.currentTarget.style.color = 'white';
                            }
                        }}
                    >
                        {showForm ? <X size={14} /> : <UserPlus size={14} />}
                        {showForm ? 'Cancel' : 'Create New'}
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '24px', flex: 1 }}>
                {showForm && (
                    <div style={{
                        width: '500px', // Increased width for the complex form
                        display: 'flex',
                        flexDirection: 'column',
                        borderRight: '1px solid #E0E6ED',
                        paddingRight: '24px',
                        overflowY: 'auto',
                        maxHeight: 'calc(100vh - 150px)'
                    }}>
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                <button
                                    onClick={() => setActiveTab('user')}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: activeTab === 'user' ? '#EBF8FF' : 'transparent',
                                        color: activeTab === 'user' ? '#3182CE' : '#718096',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Add New User
                                </button>
                                <button
                                    onClick={() => setActiveTab('company')}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: activeTab === 'company' ? '#EBF8FF' : 'transparent',
                                        color: activeTab === 'company' ? '#3182CE' : '#718096',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Create Company
                                </button>
                            </div>
                            <div style={{ paddingBottom: '10px', borderBottom: '1px solid #E0E6ED' }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#2D3748' }}>
                                    {activeTab === 'user' ? 'Add New User' : 'Create Company'}
                                </h3>
                            </div>
                        </div>

                        <form onSubmit={activeTab === 'user' ? handleCreateUser : handleCreateCompany}>
                            {activeTab === 'user' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {/* ... User form remains same ... */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Username</label>
                                        <input
                                            type="text"
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            style={{ width: '100%', height: '36px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E0E6ED', fontSize: '0.9rem' }}
                                            required
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>First Name</label>
                                            <input
                                                type="text"
                                                value={formData.first_name}
                                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                                style={{ width: '100%', height: '36px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E0E6ED', fontSize: '0.9rem' }}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Last Name</label>
                                            <input
                                                type="text"
                                                value={formData.last_name}
                                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                                style={{ width: '100%', height: '36px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E0E6ED', fontSize: '0.9rem' }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Email</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            style={{ width: '100%', height: '36px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E0E6ED', fontSize: '0.9rem' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Password</label>
                                        <input
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            style={{ width: '100%', height: '36px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E0E6ED', fontSize: '0.9rem' }}
                                            required
                                        />
                                    </div>
                                    {error && <div style={{ color: '#E53E3E', fontSize: '0.8rem', fontWeight: 600 }}>{error}</div>}
                                    <button
                                        type="submit"
                                        style={{ marginTop: '16px', height: '40px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    >
                                        <UserPlus size={16} /> Create User
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {/* 5.1 Company Basic Details */}
                                    <div className="section">
                                        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4A5568', marginBottom: '12px', borderBottom: '1px solid #EDF2F7', paddingBottom: '4px' }}>5.1 Company Basic Details</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Company Name *</label>
                                                <input
                                                    type="text"
                                                    value={companyFormData.name}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, name: e.target.value })}
                                                    style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #E0E6ED', fontSize: '0.85rem' }}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Alias Name</label>
                                                <input
                                                    type="text"
                                                    value={companyFormData.alias_name}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, alias_name: e.target.value })}
                                                    style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #E0E6ED', fontSize: '0.85rem' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Company Logo</label>
                                                <input
                                                    type="file"
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, logo: e.target.files?.[0] || null })}
                                                    style={{ width: '100%', fontSize: '0.8rem' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 5.2 Primary Mailing Address */}
                                    <div className="section">
                                        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4A5568', marginBottom: '12px', borderBottom: '1px solid #EDF2F7', paddingBottom: '4px' }}>5.2 Primary Mailing Address</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Address Line 1 *</label>
                                                <input
                                                    type="text"
                                                    value={companyFormData.address_line_1}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, address_line_1: e.target.value })}
                                                    style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #E0E6ED', fontSize: '0.85rem' }}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Address Line 2</label>
                                                <input
                                                    type="text"
                                                    value={companyFormData.address_line_2}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, address_line_2: e.target.value })}
                                                    style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #E0E6ED', fontSize: '0.85rem' }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Country *</label>
                                                    <select
                                                        value={companyFormData.country}
                                                        onChange={(e) => setCompanyFormData({ ...companyFormData, country: e.target.value })}
                                                        style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #E0E6ED', fontSize: '0.85rem' }}
                                                        required
                                                    >
                                                        <option value="India">India</option>
                                                        <option value="USA">USA</option>
                                                    </select>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>State *</label>
                                                    <select
                                                        value={companyFormData.state}
                                                        onChange={(e) => setCompanyFormData({ ...companyFormData, state: e.target.value })}
                                                        style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #E0E6ED', fontSize: '0.85rem' }}
                                                        required
                                                    >
                                                        <option value="">Select State</option>
                                                        {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>City *</label>
                                                    <input
                                                        type="text"
                                                        value={companyFormData.city}
                                                        onChange={(e) => setCompanyFormData({ ...companyFormData, city: e.target.value })}
                                                        style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #E0E6ED', fontSize: '0.85rem' }}
                                                        required
                                                    />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Pincode *</label>
                                                    <input
                                                        type="text"
                                                        value={companyFormData.pincode}
                                                        onChange={(e) => setCompanyFormData({ ...companyFormData, pincode: e.target.value })}
                                                        style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #E0E6ED', fontSize: '0.85rem' }}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 5.3 Contact Details */}
                                    <div className="section">
                                        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4A5568', marginBottom: '12px', borderBottom: '1px solid #EDF2F7', paddingBottom: '4px' }}>5.3 Contact Details</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Phone Number</label>
                                                    <input
                                                        type="text"
                                                        value={companyFormData.phone_number}
                                                        onChange={(e) => setCompanyFormData({ ...companyFormData, phone_number: e.target.value })}
                                                        style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #E0E6ED', fontSize: '0.85rem' }}
                                                    />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Mobile Number</label>
                                                    <input
                                                        type="text"
                                                        value={companyFormData.mobile_number}
                                                        onChange={(e) => setCompanyFormData({ ...companyFormData, mobile_number: e.target.value })}
                                                        style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #E0E6ED', fontSize: '0.85rem' }}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Email *</label>
                                                <input
                                                    type="email"
                                                    value={companyFormData.email}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, email: e.target.value })}
                                                    style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #E0E6ED', fontSize: '0.85rem' }}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Website</label>
                                                <input
                                                    type="url"
                                                    value={companyFormData.website_url}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, website_url: e.target.value })}
                                                    style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #E0E6ED', fontSize: '0.85rem' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 5.4 Financial Configuration */}
                                    <div className="section">
                                        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4A5568', marginBottom: '12px', borderBottom: '1px solid #EDF2F7', paddingBottom: '4px' }}>5.4 Financial Configuration</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>FY Begins From *</label>
                                                    <input
                                                        type="text"
                                                        value={companyFormData.financial_year_begins}
                                                        onChange={(e) => setCompanyFormData({ ...companyFormData, financial_year_begins: e.target.value })}
                                                        style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #E0E6ED', fontSize: '0.85rem' }}
                                                        required
                                                        placeholder="e.g., 01-Apr"
                                                    />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Decimal Places *</label>
                                                    <input
                                                        type="number"
                                                        value={companyFormData.decimal_places}
                                                        onChange={(e) => setCompanyFormData({ ...companyFormData, decimal_places: parseInt(e.target.value) })}
                                                        style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #E0E6ED', fontSize: '0.85rem' }}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Base Currency *</label>
                                                    <input
                                                        type="text"
                                                        value={companyFormData.base_currency}
                                                        onChange={(e) => setCompanyFormData({ ...companyFormData, base_currency: e.target.value })}
                                                        style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #E0E6ED', fontSize: '0.85rem' }}
                                                        required
                                                    />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Currency Symbol *</label>
                                                    <input
                                                        type="text"
                                                        value={companyFormData.currency_symbol}
                                                        onChange={(e) => setCompanyFormData({ ...companyFormData, currency_symbol: e.target.value })}
                                                        style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #E0E6ED', fontSize: '0.85rem' }}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 5.5 Statutory & Taxation Details */}
                                    <div className="section">
                                        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4A5568', marginBottom: '12px', borderBottom: '1px solid #EDF2F7', paddingBottom: '4px' }}>5.5 Statutory & Taxation Details</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <input
                                                    type="checkbox"
                                                    id="gst_applicable"
                                                    checked={companyFormData.is_gst_applicable}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, is_gst_applicable: e.target.checked })}
                                                />
                                                <label htmlFor="gst_applicable" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#718096' }}>GST Applicable</label>
                                            </div>
                                            {companyFormData.is_gst_applicable && (
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>GSTIN</label>
                                                        <input
                                                            type="text"
                                                            value={companyFormData.gstin}
                                                            onChange={(e) => handleGSTINChange(e.target.value)}
                                                            style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #E0E6ED', fontSize: '0.85rem' }}
                                                            maxLength={15}
                                                        />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>State Code (Auto)</label>
                                                        <input
                                                            type="text"
                                                            value={companyFormData.state_code}
                                                            readOnly
                                                            style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #E0E6ED', fontSize: '0.85rem', background: '#F7FAFC' }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>PAN *</label>
                                                    <input
                                                        type="text"
                                                        value={companyFormData.pan}
                                                        onChange={(e) => setCompanyFormData({ ...companyFormData, pan: e.target.value.toUpperCase() })}
                                                        style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #E0E6ED', fontSize: '0.85rem' }}
                                                        maxLength={10}
                                                        required
                                                    />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>TAN</label>
                                                    <input
                                                        type="text"
                                                        value={companyFormData.tan}
                                                        onChange={(e) => setCompanyFormData({ ...companyFormData, tan: e.target.value.toUpperCase() })}
                                                        style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #E0E6ED', fontSize: '0.85rem' }}
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <input
                                                    type="checkbox"
                                                    id="msme_registered"
                                                    checked={companyFormData.msme_registered}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, msme_registered: e.target.checked })}
                                                />
                                                <label htmlFor="msme_registered" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#718096' }}>MSME Registered</label>
                                            </div>
                                            {companyFormData.msme_registered && (
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>MSME Number</label>
                                                    <input
                                                        type="text"
                                                        value={companyFormData.msme_number}
                                                        onChange={(e) => setCompanyFormData({ ...companyFormData, msme_number: e.target.value })}
                                                        style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #E0E6ED', fontSize: '0.85rem' }}
                                                    />
                                                </div>
                                            )}
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>CIN</label>
                                                <input
                                                    type="text"
                                                    value={companyFormData.cin}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, cin: e.target.value.toUpperCase() })}
                                                    style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #E0E6ED', fontSize: '0.85rem' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {companyError && <div style={{ color: '#E53E3E', fontSize: '0.8rem', fontWeight: 600 }}>{companyError}</div>}
                                    <button
                                        type="submit"
                                        style={{ marginTop: '8px', height: '44px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(255, 107, 0, 0.25)' }}
                                    >
                                        <CheckCircle size={18} /> SAVE COMPANY RECORD
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                )}

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1 }}>
                        <table className="ae-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                                <tr>
                                    <th style={{ height: '40px', padding: '0 16px', whiteSpace: 'nowrap', backgroundColor: '#FAFBFC', borderBottom: '1px solid #E0E6ED', width: '30%', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 20 }}>{viewMode === 'user' ? 'User' : 'Company'}</th>
                                    <th style={{ height: '40px', padding: '0 16px', whiteSpace: 'nowrap', backgroundColor: '#FAFBFC', borderBottom: '1px solid #E0E6ED', width: '25%', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 20 }}>Email</th>
                                    <th style={{ height: '40px', padding: '0 16px', whiteSpace: 'nowrap', backgroundColor: '#FAFBFC', borderBottom: '1px solid #E0E6ED', width: '15%', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 20 }}>{viewMode === 'user' ? 'Role' : 'City / State'}</th>
                                    <th style={{ height: '40px', padding: '0 16px', whiteSpace: 'nowrap', backgroundColor: '#FAFBFC', borderBottom: '1px solid #E0E6ED', width: '15%', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 20 }}>Status</th>
                                    <th style={{ height: '40px', padding: '0 16px', whiteSpace: 'nowrap', backgroundColor: '#FAFBFC', borderBottom: '1px solid #E0E6ED', width: '15%', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 20 }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {viewMode === 'user' ? users.map((user) => (
                                    <tr key={user.id} style={{ borderBottom: '1px solid #F0F4F8' }}>
                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 bg-[#0066CC]/10 text-[#0066CC] rounded-full flex items-center justify-center">
                                                    <UserIcon size={20} />
                                                </div>
                                                <div className="ml-4">
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1a1f36' }}>{user.username}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#718096' }}>{user.first_name} {user.last_name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                            <div className="flex items-center gap-2" style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 500 }}>
                                                <Mail size={14} className="text-gray-400" /> {user.email || '—'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                background: user.role === 'app_admin' ? 'rgba(159, 122, 234, 0.1)' : 'rgba(0, 102, 204, 0.1)',
                                                color: user.role === 'app_admin' ? '#9F7AEA' : '#0066CC'
                                            }}>
                                                <Shield size={12} />
                                                {user.role === 'app_admin' ? 'Admin' : 'User'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
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
                                        <td style={{ padding: '12px 16px', textAlign: 'right', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => handleToggleStatus(user.id, 'user')}
                                                    style={{
                                                        padding: '8px',
                                                        color: user.is_active ? '#00C853' : '#F44336',
                                                        border: 'none',
                                                        background: user.is_active ? 'rgba(0, 200, 83, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                                                        cursor: 'pointer',
                                                        borderRadius: '6px',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    title={user.is_active ? "Deactivate User" : "Activate User"}
                                                >
                                                    <Power size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    style={{
                                                        padding: '8px',
                                                        color: '#E53E3E',
                                                        border: 'none',
                                                        background: 'rgba(229, 62, 62, 0.1)',
                                                        cursor: 'pointer',
                                                        borderRadius: '6px',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    title="Delete User"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : companies.map((comp) => (
                                    <tr key={comp.id} style={{ borderBottom: '1px solid #F0F4F8' }}>
                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 bg-[#FF6B00]/10 text-[#FF6B00] rounded-full flex items-center justify-center">
                                                    <Users size={20} />
                                                </div>
                                                <div className="ml-4">
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1a1f36' }}>{comp.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#718096' }}>{comp.alias_name || 'No Alias'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                            <div className="flex items-center gap-2" style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 500 }}>
                                                <Mail size={14} className="text-gray-400" /> {comp.email || '—'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                            <div style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 600 }}>
                                                {comp.city || '—'}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#718096' }}>{comp.state_name || '—'}</div>
                                        </td>
                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '0.7rem',
                                                fontWeight: 800,
                                                textTransform: 'uppercase',
                                                background: 'rgba(0, 200, 83, 0.1)',
                                                color: '#00C853'
                                            }}>
                                                <CheckCircle size={12} />
                                                Active
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => {
                                                        setCompanyFormData({
                                                            ...comp,
                                                            logo: null // Handle file separately
                                                        });
                                                        setActiveTab('company');
                                                        setShowForm(true);
                                                    }}
                                                    style={{
                                                        padding: '8px',
                                                        color: '#0066CC',
                                                        border: 'none',
                                                        background: 'rgba(0, 102, 204, 0.1)',
                                                        cursor: 'pointer',
                                                        borderRadius: '6px'
                                                    }}
                                                    title="Edit Company"
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
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
