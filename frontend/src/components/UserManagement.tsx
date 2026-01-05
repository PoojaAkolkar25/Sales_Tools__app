import React, { useState, useEffect } from 'react';
import api from '../api';
import { UserPlus, Mail, User as UserIcon, Shield, Loader2, Trash2 } from 'lucide-react';
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
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-[#1a1f36]">User Management</h2>
                    <p className="text-[#718096]">Manage application users and roles</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-[#0066CC] text-white px-4 py-2 rounded-md hover:bg-[#0052a3] transition-colors"
                >
                    <UserPlus size={18} />
                    {showForm ? 'Cancel' : 'Create User'}
                </button>
            </div>

            {showForm && (
                <div className="glass-card !bg-white p-6 border border-[#E0E6ED] rounded-xl shadow-sm">
                    <form onSubmit={handleCreateUser} className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-[#4A5568]">Username</label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="w-full px-4 py-2 border border-[#E0E6ED] rounded-md focus:ring-2 focus:ring-[#0066CC] outline-none"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-[#4A5568]">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-2 border border-[#E0E6ED] rounded-md focus:ring-2 focus:ring-[#0066CC] outline-none"
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-[#4A5568]">First Name</label>
                            <input
                                type="text"
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                className="w-full px-4 py-2 border border-[#E0E6ED] rounded-md focus:ring-2 focus:ring-[#0066CC] outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-[#4A5568]">Last Name</label>
                            <input
                                type="text"
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                className="w-full px-4 py-2 border border-[#E0E6ED] rounded-md focus:ring-2 focus:ring-[#0066CC] outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-[#4A5568]">Password</label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-4 py-2 border border-[#E0E6ED] rounded-md focus:ring-2 focus:ring-[#0066CC] outline-none"
                                required
                            />
                        </div>
                        <div className="col-span-2 flex justify-end gap-3 mt-4">
                            {error && <span className="text-red-500 text-sm mt-2">{error}</span>}
                            {success && <span className="text-green-500 text-sm mt-2">{success}</span>}
                            <button
                                type="submit"
                                className="bg-[#0066CC] text-white px-6 py-2 rounded-md font-semibold"
                            >
                                Create User
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="overflow-hidden bg-white border border-[#E0E6ED] rounded-xl shadow-sm">
                <table className="min-w-full divide-y divide-[#E0E6ED]">
                    <thead className="bg-[#FAFBFC]">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[#718096] uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[#718096] uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[#718096] uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[#718096] uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-[#718096] uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E0E6ED]">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-[#FAFBFC] transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="h-10 w-10 flex-shrink-0 bg-[#0066CC]/10 text-[#0066CC] rounded-full flex items-center justify-center">
                                            <UserIcon size={20} />
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-bold text-[#2D3748]">{user.username}</div>
                                            <div className="text-xs text-[#718096]">{user.first_name} {user.last_name}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2 text-sm text-[#4A5568]">
                                        <Mail size={14} /> {user.email}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${user.role === 'app_admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                        <Shield size={12} />
                                        {user.role === 'app_admin' ? 'Admin' : 'User'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                        Active
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => handleDeleteUser(user.id)}
                                        className="text-red-600 hover:text-red-900 transition-colors p-2 hover:bg-red-50 rounded-lg"
                                        title="Delete User"
                                    >
                                        <Trash2 size={18} />
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
