import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { UserPlus, Mail, User as UserIcon, Shield, Loader2, Trash2, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const UserManagement: React.FC = () => {
    const { showNotification, showConfirm } = useNotification();
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
        try {
            await api.post('auth/users/', formData);
            showNotification('User created successfully', 'success');
            setFormData({ username: '', email: '', password: '', first_name: '', last_name: '' });
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.username?.[0] || err.response?.data?.email?.[0] || 'Error creating user');
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
                <button
                    onClick={() => setShowForm(!showForm)}
                    style={{
                        height: '32px',
                        fontSize: '0.8rem',
                        background: showForm ? '#FFF5F5' : '#FF6B00',
                        color: showForm ? '#E53E3E' : 'white',
                        border: showForm ? '1px solid #FEB2B2' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0 16px',
                        borderRadius: '8px',
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        fontWeight: 600
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
                    {showForm ? 'Cancel' : 'Create New User'}
                </button>
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
                        <div style={{ paddingBottom: '20px', marginBottom: '20px', borderBottom: '1px solid #E0E6ED' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#2D3748' }}>
                                Add New User
                            </h3>
                        </div>
                        <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="space-y-1">
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

                            <div style={{ marginTop: '16px' }}>
                                {error && <div className="text-red-500 text-sm font-medium mb-3">{error}</div>}

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            borderRadius: '8px',
                                            fontWeight: 600,
                                            background: 'white',
                                            border: '1px solid #E2E8F0',
                                            color: '#718096',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
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
                                        style={{
                                            flex: 2,
                                            padding: '10px',
                                            borderRadius: '8px',
                                            fontWeight: 600,
                                            background: '#FF6B00',
                                            border: 'none',
                                            color: 'white',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 6px rgba(255, 107, 0, 0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        <UserPlus size={16} /> Create User
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1 }}>
                        <table className="ae-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                                <tr>
                                    <th style={{ height: '40px', padding: '0 16px', whiteSpace: 'nowrap', backgroundColor: '#FAFBFC', borderBottom: '1px solid #E0E6ED', width: '30%', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 20 }}>User</th>
                                    <th style={{ height: '40px', padding: '0 16px', whiteSpace: 'nowrap', backgroundColor: '#FAFBFC', borderBottom: '1px solid #E0E6ED', width: '25%', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 20 }}>Email</th>
                                    <th style={{ height: '40px', padding: '0 16px', whiteSpace: 'nowrap', backgroundColor: '#FAFBFC', borderBottom: '1px solid #E0E6ED', width: '15%', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 20 }}>Role</th>
                                    <th style={{ height: '40px', padding: '0 16px', whiteSpace: 'nowrap', backgroundColor: '#FAFBFC', borderBottom: '1px solid #E0E6ED', width: '15%', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 20 }}>Status</th>
                                    <th style={{ height: '40px', padding: '0 16px', whiteSpace: 'nowrap', backgroundColor: '#FAFBFC', borderBottom: '1px solid #E0E6ED', width: '15%', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 20 }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
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
                                                <Mail size={14} className="text-gray-400" /> {user.email}
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
                                        <td style={{ padding: '12px 16px', textAlign: 'right', verticalAlign: 'middle' }}>
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
            </div>
        </div>
    );
};

export default UserManagement;
