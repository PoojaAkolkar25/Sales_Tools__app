import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { UserPlus, Mail, User as UserIcon, Shield, Loader2, Trash2, X, Users, CheckCircle, AlertCircle, Power, Pencil } from 'lucide-react';
import { useLocation } from 'react-router-dom';

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
        last_name: '',
        role: 'user'
    });
    const [error, setError] = useState('');

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
    const [searchTerm, setSearchTerm] = useState('');

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
            setFormData({ username: '', email: '', password: '', first_name: '', last_name: '', role: 'user' });
            fetchUsers();
            setShowForm(false);
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
            const errorData = err.response?.data;
            if (errorData && typeof errorData === 'object') {
                const errorMessages = Object.entries(errorData)
                    .map(([key, value]: [string, any]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                    .join(' | ');
                setCompanyError(errorMessages || 'Error creating company');
            } else {
                setCompanyError(err.response?.data?.message || 'Error creating company');
            }
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

    const filteredUsers = users.filter(user => {
        const searchStr = searchTerm.toLowerCase();
        return (
            user.username?.toLowerCase().includes(searchStr) ||
            user.email?.toLowerCase().includes(searchStr) ||
            user.first_name?.toLowerCase().includes(searchStr) ||
            user.last_name?.toLowerCase().includes(searchStr) ||
            user.role?.toLowerCase().includes(searchStr)
        );
    });

    const filteredCompanies = companies.filter(comp => {
        const searchStr = searchTerm.toLowerCase();
        return (
            comp.name?.toLowerCase().includes(searchStr) ||
            comp.alias_name?.toLowerCase().includes(searchStr) ||
            comp.email?.toLowerCase().includes(searchStr) ||
            comp.city?.toLowerCase().includes(searchStr) ||
            comp.state_name?.toLowerCase().includes(searchStr)
        );
    });

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
                    <div style={{ width: '4px', height: '24px', background: '#FF6B00', borderRadius: '2px' }}></div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1a1f36', margin: 0 }}>
                        {showForm ? `Create New ${viewMode === 'user' ? 'User' : 'Company'}` : 'User Management'}
                    </h1>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        style={{
                            height: '36px',
                            fontSize: '0.85rem',
                            background: '#FF6B00',
                            color: 'white',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '0 20px',
                            borderRadius: '10px',
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                            fontWeight: 700,
                            boxShadow: '0 4px 6px -1px rgba(255, 107, 0, 0.2)'
                        }}
                    >
                        <UserPlus size={14} /> Create New
                    </button>
                )}
            </div>

            {/* Action Row - Only shown when not in form mode */}
            {!showForm && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
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
                            onClick={() => setViewMode('user')}
                            style={{
                                padding: '6px 20px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: viewMode === 'user' ? '#FF6B00' : 'transparent',
                                color: viewMode === 'user' ? 'white' : '#718096',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <UserIcon size={14} /> Users
                        </button>
                        <button
                            onClick={() => setViewMode('company')}
                            style={{
                                padding: '6px 20px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: viewMode === 'company' ? '#FF6B00' : 'transparent',
                                color: viewMode === 'company' ? 'white' : '#718096',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <Users size={14} /> Companies
                        </button>
                    </div>

                    {/* Search Bar matching Deal Management */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'white',
                        border: '1px solid #E2E8F0',
                        borderRadius: '10px',
                        padding: '0 12px',
                        width: '350px',
                        height: '40px'
                    }}>
                        <div style={{ marginRight: '8px', color: '#718096' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </div>
                        <input
                            type="text"
                            placeholder={`Search by ${viewMode === 'user' ? 'Username, Email or Role' : 'Company Name, City or Email'}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ border: 'none', outline: 'none', fontSize: '0.9rem', width: '100%', color: '#1a1f36', fontWeight: 600 }}
                        />
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, overflowY: 'auto' }}>
                {showForm ? (
                    <form onSubmit={viewMode === 'user' ? handleCreateUser : handleCreateCompany} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{
                            background: '#FAFBFC',
                            borderRadius: '12px',
                            padding: '24px',
                            border: '1px solid #E0E6ED'
                        }}>
                            {viewMode === 'user' ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                            Username <span style={{ color: '#FF6B00' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Enter username"
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                            First Name
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Enter first name"
                                            value={formData.first_name}
                                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                            Last Name
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Enter last name"
                                            value={formData.last_name}
                                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                            Email Address <span style={{ color: '#FF6B00' }}>*</span>
                                        </label>
                                        <input
                                            type="email"
                                            placeholder="Enter email address"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                            Password <span style={{ color: '#FF6B00' }}>*</span>
                                        </label>
                                        <input
                                            type="password"
                                            placeholder="Enter password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                            Role
                                        </label>
                                        <select
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                        >
                                            <option value="user">User</option>
                                            <option value="app_admin">Admin</option>
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                    {/* 5.1 Company Basic Details */}
                                    <div className="section">
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FF6B00', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: '#0066CC', borderRadius: '2px' }}></div>
                                            Company Basic Details
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                                    Company Name <span style={{ color: '#FF6B00' }}>*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={companyFormData.name}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, name: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                                    Alias Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={companyFormData.alias_name}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, alias_name: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                                    Company Logo
                                                </label>
                                                <input
                                                    type="file"
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, logo: e.target.files?.[0] || null })}
                                                    style={{ width: '100%', fontSize: '0.85rem', color: '#1a1f36' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 5.2 Communication Details */}
                                    <div className="section" style={{ borderTop: '1px solid #E2E8F0', paddingTop: '24px' }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FF6B00', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: '#0066CC', borderRadius: '2px' }}></div>
                                            Communication Details
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                                    Email Address <span style={{ color: '#FF6B00' }}>*</span>
                                                </label>
                                                <input
                                                    type="email"
                                                    value={companyFormData.email}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, email: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                                    Phone Number
                                                </label>
                                                <input
                                                    type="text"
                                                    value={companyFormData.phone_number}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, phone_number: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                                    Mobile Number
                                                </label>
                                                <input
                                                    type="text"
                                                    value={companyFormData.mobile_number}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, mobile_number: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                                    Website URL
                                                </label>
                                                <input
                                                    type="url"
                                                    placeholder="https://example.com"
                                                    value={companyFormData.website_url}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, website_url: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 5.3 Mailing Address */}
                                    <div className="section" style={{ borderTop: '1px solid #E2E8F0', paddingTop: '24px' }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FF6B00', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: '#0066CC', borderRadius: '2px' }}></div>
                                            Mailing Address
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                                    Address Line 1 <span style={{ color: '#FF6B00' }}>*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={companyFormData.address_line_1}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, address_line_1: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                                    Address Line 2
                                                </label>
                                                <input
                                                    type="text"
                                                    value={companyFormData.address_line_2}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, address_line_2: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                                    Country <span style={{ color: '#FF6B00' }}>*</span>
                                                </label>
                                                <select
                                                    value={companyFormData.country}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, country: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                    required
                                                >
                                                    <option value="India">India</option>
                                                    <option value="USA">USA</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                                    State <span style={{ color: '#FF6B00' }}>*</span>
                                                </label>
                                                <select
                                                    value={companyFormData.state}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, state: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                    required
                                                >
                                                    <option value="">Select State</option>
                                                    {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                                    City <span style={{ color: '#FF6B00' }}>*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={companyFormData.city}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, city: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                                    Pincode <span style={{ color: '#FF6B00' }}>*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={companyFormData.pincode}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, pincode: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 5.4 Financial Details */}
                                    <div className="section" style={{ borderTop: '1px solid #E2E8F0', paddingTop: '24px' }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FF6B00', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: '#0066CC', borderRadius: '2px' }}></div>
                                            Financial Details
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                                    FY Begins From <span style={{ color: '#FF6B00' }}>*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={companyFormData.financial_year_begins}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, financial_year_begins: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                    required
                                                    placeholder="01-Apr"
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                                    Base Currency
                                                </label>
                                                <input
                                                    type="text"
                                                    value={companyFormData.base_currency}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, base_currency: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                                    Currency Symbol
                                                </label>
                                                <input
                                                    type="text"
                                                    value={companyFormData.currency_symbol}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, currency_symbol: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                                    Decimal Places
                                                </label>
                                                <input
                                                    type="number"
                                                    value={companyFormData.decimal_places}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, decimal_places: parseInt(e.target.value) })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 5.5 Statutory Details */}
                                    <div className="section" style={{ borderTop: '1px solid #E2E8F0', paddingTop: '24px' }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FF6B00', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: '#0066CC', borderRadius: '2px' }}></div>
                                            Statutory Details
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                                    PAN <span style={{ color: '#FF6B00' }}>*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={companyFormData.pan}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, pan: e.target.value.toUpperCase() })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                    maxLength={10}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                                    TAN
                                                </label>
                                                <input
                                                    type="text"
                                                    value={companyFormData.tan}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, tan: e.target.value.toUpperCase() })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                                    CIN
                                                </label>
                                                <input
                                                    type="text"
                                                    value={companyFormData.cin}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, cin: e.target.value.toUpperCase() })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                                    GSTIN
                                                </label>
                                                <input
                                                    type="text"
                                                    value={companyFormData.gstin}
                                                    onChange={(e) => handleGSTINChange(e.target.value)}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                    maxLength={15}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '24px' }}>
                                                <input
                                                    type="checkbox"
                                                    id="gst_applicable"
                                                    checked={companyFormData.is_gst_applicable}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, is_gst_applicable: e.target.checked })}
                                                />
                                                <label htmlFor="gst_applicable" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black' }}>GST Applicable</label>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '24px' }}>
                                                <input
                                                    type="checkbox"
                                                    id="msme_registered"
                                                    checked={companyFormData.msme_registered}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, msme_registered: e.target.checked })}
                                                />
                                                <label htmlFor="msme_registered" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black' }}>MSME Registered</label>
                                            </div>
                                            {companyFormData.msme_registered && (
                                                <div>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                                        MSME Number
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={companyFormData.msme_number}
                                                        onChange={(e) => setCompanyFormData({ ...companyFormData, msme_number: e.target.value })}
                                                        style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {error && <div style={{ color: '#E53E3E', fontSize: '0.8rem', fontWeight: 600, padding: '12px', background: '#FFF5F5', borderRadius: '8px', border: '1px solid #FED7D7', marginTop: '16px' }}>{error}</div>}
                                    {companyError && <div style={{ color: '#E53E3E', fontSize: '0.8rem', fontWeight: 600, padding: '12px', background: '#FFF5F5', borderRadius: '8px', border: '1px solid #FED7D7', marginTop: '16px' }}>{companyError}</div>}
                                </div>
                            )}
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'white',
                            padding: '6px',
                            borderRadius: '12px',
                            border: '1px solid #E0E6ED',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
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
                                    background: '#FF6B00',
                                    color: 'white',
                                    border: 'none',
                                    fontWeight: 800,
                                    cursor: 'pointer'
                                }}
                            >
                                <CheckCircle size={16} /> {viewMode === 'user' ? 'CREATE USER' : 'SAVE COMPANY RECORD'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 16px',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    background: 'transparent',
                                    color: '#718096',
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
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                        <div style={{ flex: 1 }}>
                            <table className="ae-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                                    <tr>
                                        <th style={{ height: '40px', padding: '0 16px', whiteSpace: 'nowrap', backgroundColor: '#FAFBFC', borderBottom: '1px solid #E0E6ED', width: '30%', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase' }}>{viewMode === 'user' ? 'User' : 'Company'}</th>
                                        <th style={{ height: '40px', padding: '0 16px', whiteSpace: 'nowrap', backgroundColor: '#FAFBFC', borderBottom: '1px solid #E0E6ED', width: '25%', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase' }}>Email</th>
                                        <th style={{ height: '40px', padding: '0 16px', whiteSpace: 'nowrap', backgroundColor: '#FAFBFC', borderBottom: '1px solid #E0E6ED', width: '15%', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase' }}>{viewMode === 'user' ? 'Role' : 'City / State'}</th>
                                        <th style={{ height: '40px', padding: '0 16px', whiteSpace: 'nowrap', backgroundColor: '#FAFBFC', borderBottom: '1px solid #E0E6ED', width: '15%', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase' }}>Status</th>
                                        <th style={{ height: '40px', padding: '0 16px', whiteSpace: 'nowrap', backgroundColor: '#FAFBFC', borderBottom: '1px solid #E0E6ED', width: '15%', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {viewMode === 'user' ? filteredUsers.map((user) => (
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
                                    )) : filteredCompanies.map((comp) => (
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
                                                <div style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 600 }}>{comp.city || '—'}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#718096' }}>{comp.state_name || '—'}</div>
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
                                                            setCompanyFormData({ ...comp, logo: null });
                                                            setViewMode('company');
                                                            setShowForm(true);
                                                        }}
                                                        style={{ padding: '8px', color: '#0066CC', border: 'none', background: 'rgba(0, 102, 204, 0.1)', cursor: 'pointer', borderRadius: '6px' }}
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
                )}
            </div>
        </div>
    );
};

export default UserManagement;

