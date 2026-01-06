import React, { useState, useEffect } from 'react';
import api from '../api';
import { UserPlus, Mail, User as UserIcon, Shield, Loader2, Trash2, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const location = useLocation();

    useEffect(() => {
        fetchUsers();
        const params = new URLSearchParams(location.search);
        if (params.get('action') === 'create') {
            setShowForm(true);
        }
    }, [location.search]);

    const fetchUsers = async () => {
        try {
            const response = await api.get('auth/users/');
            setUsers(response.data);
        } catch (err) {
            console.error('Error fetching users', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            await api.post('auth/users/', formData);
            setSuccess('User created successfully!');
            setShowForm(false);
            setFormData({ username: '', email: '', password: '', first_name: '', last_name: '' });
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.username?.[0] || err.response?.data?.email?.[0] || 'Error creating user');
        }
    };

    const handleDeleteUser = async (userId: number) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;

        try {
            await api.delete(`auth/users/${userId}/`);
            fetchUsers();
        } catch (err: any) {
            setError('Error deleting user');
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
        <div className="space-y-6">
            <div style={{ marginBottom: '24px' }}>
                <div className="flex items-center gap-4">
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1a1f36', margin: 0 }}>User Management</h2>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="ae-create-btn"
                        style={{
                            height: '28px',
                            fontSize: '0.8rem',
                            background: showForm ? 'white' : '#FF6B00',
                            color: showForm ? '#E53E3E' : 'white',
                            border: showForm ? '1px solid #E53E3E' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '0 12px',
                            borderRadius: '4px',
                            transition: 'all 0.2s',
                            cursor: 'pointer'
                        }}
                    >
                        {showForm ? <X size={14} /> : <UserPlus size={14} />}
                        {showForm ? 'Cancel' : 'Create New User'}
                    </button>
                </div>
                <p style={{ color: '#718096', marginTop: '4px' }}>Manage application users and roles</p>
            </div>

            {showForm && (
                <div className="section-panel" style={{ padding: '24px', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1a1f36', marginBottom: '20px' }}>
                        {success ? 'Success' : 'Add New User'}
                    </h3>
                    <form onSubmit={handleCreateUser} className="grid grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-2">
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>
                                Username
                            </label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="ae-input"
                                placeholder="Enter username"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>
                                Email
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="ae-input"
                                placeholder="Enter email address"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>
                                First Name
                            </label>
                            <input
                                type="text"
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                className="ae-input"
                                placeholder="Enter first name"
                            />
                        </div>
                        <div className="space-y-1">
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>
                                Last Name
                            </label>
                            <input
                                type="text"
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                className="ae-input"
                                placeholder="Enter last name"
                            />
                        </div>
                        <div className="space-y-1">
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '4px' }}>
                                Password
                            </label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="ae-input"
                                placeholder="Enter password"
                                required
                            />
                        </div>
                        <div className="flex items-end justify-end gap-4 h-full">
                            {error && <span className="text-red-500 text-sm flex items-center font-medium mr-auto mb-3">{error}</span>}
                            {success && <span className="text-green-500 text-sm flex items-center font-medium mr-auto mb-3">{success}</span>}

                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-5 py-2.5 rounded-lg font-semibold transition-all duration-200"
                                style={{
                                    background: 'white',
                                    border: '1px solid #E2E8F0',
                                    color: '#718096',
                                    cursor: 'pointer',
                                    height: '42px'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#FFF5F5';
                                    e.currentTarget.style.color = '#E53E3E';
                                    e.currentTarget.style.borderColor = '#FEB2B2';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'white';
                                    e.currentTarget.style.color = '#718096';
                                    e.currentTarget.style.borderColor = '#E2E8F0';
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2.5 rounded-lg font-semibold text-white shadow-lg transition-all duration-200 flex items-center gap-2"
                                style={{
                                    background: '#FF6B00',
                                    border: 'none',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 14px 0 rgba(255, 107, 0, 0.39)',
                                    height: '42px'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#E65100'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#FF6B00'}
                            >
                                <UserPlus size={18} /> Create User
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="ae-table-container">
                <table className="ae-table">
                    <thead>
                        <tr>
                            <th style={{ width: '30%' }}>User</th>
                            <th style={{ width: '25%' }}>Email</th>
                            <th style={{ width: '15%' }}>Role</th>
                            <th style={{ width: '15%' }}>Status</th>
                            <th style={{ width: '15%', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id}>
                                <td>
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
                                <td>
                                    <div className="flex items-center gap-2" style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 500 }}>
                                        <Mail size={14} className="text-gray-400" /> {user.email}
                                    </div>
                                </td>
                                <td>
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
                                <td>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        background: 'rgba(0, 200, 83, 0.1)',
                                        color: '#00C853'
                                    }}>
                                        Active
                                    </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
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
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserManagement;
