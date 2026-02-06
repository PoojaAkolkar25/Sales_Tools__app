import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { UserPlus, Mail, User as UserIcon, Shield, Loader2, Trash2, X, Users, CheckCircle, AlertCircle, Power } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const UserManagement: React.FC = () => {
    const { showNotification, showConfirm } = useNotification();
    const [users, setUsers] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'user' | 'customer'>('user');
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: ''
    });
    const [error, setError] = useState('');

    // Feature: Customer Creation
    const [activeTab, setActiveTab] = useState<'user' | 'customer'>('user');
    const [customerFormData, setCustomerFormData] = useState({
        name: '',
        email: '',
        phone: '',
        contact_person: '',
        address: ''
    });
    const [customerError, setCustomerError] = useState('');

    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
        const params = new URLSearchParams(location.search);
        if (params.get('action') === 'create') {
            setShowForm(true);
        }
    }, [location.search]);

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([fetchUsers(), fetchCustomers()]);
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

    const fetchCustomers = async () => {
        try {
            const response = await api.get('customers/');
            setCustomers(response.data);
        } catch (err) {
            console.error('Error fetching customers', err);
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

    const handleCreateCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        setCustomerError('');
        try {
            await api.post('customers/', customerFormData);
            showNotification('Customer created successfully', 'success');
            setCustomerFormData({ name: '', email: '', phone: '', contact_person: '', address: '' });
            navigate('/customer-dashboard');
        } catch (err: any) {
            console.error('Error creating customer', err);
            setCustomerError(err.response?.data?.name?.[0] || err.response?.data?.message || 'Error creating customer');
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

    const handleToggleStatus = async (id: number, type: 'user' | 'customer') => {
        try {
            const endpoint = type === 'user' ? `auth/users/${id}/toggle_status/` : `customers/${id}/toggle_status/`;
            await api.post(endpoint);
            showNotification(`${type === 'user' ? 'User' : 'Customer'} status updated`, 'success');
            if (type === 'user') fetchUsers();
            else fetchCustomers();
        } catch (err) {
            console.error('Error toggling status', err);
            showNotification('Error updating status', 'error');
        }
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
                            onClick={() => setViewMode('customer')}
                            style={{
                                padding: '6px 16px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                borderRadius: '7px',
                                border: 'none',
                                background: viewMode === 'customer' ? 'white' : 'transparent',
                                color: viewMode === 'customer' ? '#1a1f36' : '#64748B',
                                boxShadow: viewMode === 'customer' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Users size={14} /> Customers
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
                        width: '400px',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRight: '1px solid #E0E6ED',
                        paddingRight: '24px'
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
                                    onClick={() => setActiveTab('customer')}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: activeTab === 'customer' ? '#EBF8FF' : 'transparent',
                                        color: activeTab === 'customer' ? '#3182CE' : '#718096',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Create Customer
                                </button>
                            </div>
                            <div style={{ paddingBottom: '10px', borderBottom: '1px solid #E0E6ED' }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#2D3748' }}>
                                    {activeTab === 'user' ? 'Add New User' : 'Add New Customer'}
                                </h3>
                            </div>
                        </div>

                        <form onSubmit={activeTab === 'user' ? handleCreateUser : handleCreateCustomer}>
                            {activeTab === 'user' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                                        style={{ marginTop: '8px', height: '40px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    >
                                        <UserPlus size={16} /> Create User
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Customer Name</label>
                                        <input
                                            type="text"
                                            value={customerFormData.name}
                                            onChange={(e) => setCustomerFormData({ ...customerFormData, name: e.target.value })}
                                            style={{ width: '100%', height: '36px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E0E6ED', fontSize: '0.9rem' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Email</label>
                                        <input
                                            type="email"
                                            value={customerFormData.email}
                                            onChange={(e) => setCustomerFormData({ ...customerFormData, email: e.target.value })}
                                            style={{ width: '100%', height: '36px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E0E6ED', fontSize: '0.9rem' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Phone</label>
                                        <input
                                            type="text"
                                            value={customerFormData.phone}
                                            onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })}
                                            style={{ width: '100%', height: '36px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E0E6ED', fontSize: '0.9rem' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Contact Person</label>
                                        <input
                                            type="text"
                                            value={customerFormData.contact_person}
                                            onChange={(e) => setCustomerFormData({ ...customerFormData, contact_person: e.target.value })}
                                            style={{ width: '100%', height: '36px', padding: '0 12px', borderRadius: '8px', border: '1px solid #E0E6ED', fontSize: '0.9rem' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Address</label>
                                        <textarea
                                            value={customerFormData.address}
                                            onChange={(e) => setCustomerFormData({ ...customerFormData, address: e.target.value })}
                                            style={{ width: '100%', height: '80px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E0E6ED', fontSize: '0.9rem', resize: 'none' }}
                                        />
                                    </div>
                                    {customerError && <div style={{ color: '#E53E3E', fontSize: '0.8rem', fontWeight: 600 }}>{customerError}</div>}
                                    <button
                                        type="submit"
                                        style={{ marginTop: '8px', height: '40px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    >
                                        <UserPlus size={16} /> Create Customer
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
                                    <th style={{ height: '40px', padding: '0 16px', whiteSpace: 'nowrap', backgroundColor: '#FAFBFC', borderBottom: '1px solid #E0E6ED', width: '30%', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 20 }}>{viewMode === 'user' ? 'User' : 'Customer'}</th>
                                    <th style={{ height: '40px', padding: '0 16px', whiteSpace: 'nowrap', backgroundColor: '#FAFBFC', borderBottom: '1px solid #E0E6ED', width: '25%', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 20 }}>Email</th>
                                    <th style={{ height: '40px', padding: '0 16px', whiteSpace: 'nowrap', backgroundColor: '#FAFBFC', borderBottom: '1px solid #E0E6ED', width: '15%', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 20 }}>{viewMode === 'user' ? 'Role' : 'Contact Person'}</th>
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
                                )) : customers.map((customer) => (
                                    <tr key={customer.id} style={{ borderBottom: '1px solid #F0F4F8' }}>
                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 bg-[#FF6B00]/10 text-[#FF6B00] rounded-full flex items-center justify-center">
                                                    <Users size={20} />
                                                </div>
                                                <div className="ml-4">
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1a1f36' }}>{customer.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#718096' }}>{customer.customer_type}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                            <div className="flex items-center gap-2" style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 500 }}>
                                                <Mail size={14} className="text-gray-400" /> {customer.email || '—'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                            <div style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 600 }}>
                                                {customer.contact_person || '—'}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#718096' }}>{customer.phone}</div>
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
                                                background: customer.is_active ? 'rgba(0, 200, 83, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                                                color: customer.is_active ? '#00C853' : '#F44336',
                                                transition: 'all 0.2s'
                                            }}>
                                                {customer.is_active ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                                {customer.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => handleToggleStatus(customer.id, 'customer')}
                                                    style={{
                                                        padding: '8px',
                                                        color: customer.is_active ? '#00C853' : '#F44336',
                                                        border: 'none',
                                                        background: customer.is_active ? 'rgba(0, 200, 83, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                                                        cursor: 'pointer',
                                                        borderRadius: '6px',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    title={customer.is_active ? "Deactivate Customer" : "Activate Customer"}
                                                >
                                                    <Power size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div >
        </div >
    );
};

export default UserManagement;
