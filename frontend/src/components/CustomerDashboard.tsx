import React, { useState, useEffect } from 'react';
import {
    Users,
    TrendingUp,
    Briefcase,
    CheckCircle2,
    Search,
    Filter,
    ArrowUpRight,
    MapPin,
    Phone,
    Mail,
    Building2,
} from 'lucide-react';
import api from '../api';

const CustomerDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        totalCustomers: 0,
        activeCustomers: 0,
        totalDeals: 0,
        conversionRate: 0
    });
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchCustomerData();
    }, []);

    const fetchCustomerData = async () => {
        try {
            const [customersRes, dealsRes] = await Promise.all([
                api.get('customers/'),
                api.get('deals/')
            ]);

            const customerList = customersRes.data;
            const dealList = dealsRes.data;

            setCustomers(customerList);
            setStats({
                totalCustomers: customerList.length,
                activeCustomers: customerList.filter((c: any) => c.is_active).length,
                totalDeals: dealList.length,
                conversionRate: customerList.length > 0 ? Math.round((dealList.length / customerList.length) * 10) / 10 : 0
            });
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B00]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Customers', value: stats.totalCustomers, icon: Users, color: '#3B82F6', bg: 'bg-blue-50' },
                    { label: 'Active Status', value: stats.activeCustomers, icon: CheckCircle2, color: '#10B981', bg: 'bg-emerald-50' },
                    { label: 'Total Opportunities', value: stats.totalDeals, icon: Briefcase, color: '#F59E0B', bg: 'bg-amber-50' },
                    { label: 'Deals/Customer', value: stats.conversionRate, icon: TrendingUp, color: '#8B5CF6', bg: 'bg-purple-50' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-[#E0E6ED] shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`${stat.bg} p-3 rounded-xl`}>
                                <stat.icon size={24} color={stat.color} />
                            </div>
                            <div className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                <ArrowUpRight size={12} className="mr-1" /> +12%
                            </div>
                        </div>
                        <div className="text-2xl font-extrabold text-[#1a1f36]">{stat.value}</div>
                        <div className="text-sm font-semibold text-[#718096] mt-1">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-3 gap-6">
                {/* Customer List Card */}
                <div className="col-span-3 bg-white rounded-2xl border border-[#E0E6ED] shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-[#E0E6ED] flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-[#1a1f36]">Customer Portfolio</h2>
                            <p className="text-sm text-[#718096]">Manage and monitor your customer relationships</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#718096]" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search customers..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-[#F7F9FC] border border-[#E0E6ED] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 transition-all w-64"
                                />
                            </div>
                            <button className="flex items-center gap-2 px-4 py-2 border border-[#E0E6ED] rounded-xl text-sm font-semibold text-[#4A5568] hover:bg-gray-50 transition-colors">
                                <Filter size={16} /> Filter
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-100 border-collapse">
                            <thead>
                                <tr className="bg-[#FAFBFC]">
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#718096] uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#718096] uppercase tracking-wider">Contact Details</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#718096] uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#718096] uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-[#718096] uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E0E6ED]">
                                {filteredCustomers.map((customer) => (
                                    <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 bg-[#FF6B00]/10 rounded-xl flex items-center justify-center text-[#FF6B00] font-bold">
                                                    {customer.name.substring(0, 1).toUpperCase()}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-bold text-[#1a1f36]">{customer.name}</div>
                                                    <div className="text-xs text-[#718096] flex items-center mt-0.5">
                                                        <MapPin size={10} className="mr-1" /> {customer.address ? (customer.address.substring(0, 30) + '...') : 'No address'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="text-xs font-semibold text-[#4A5568] flex items-center">
                                                    <Mail size={12} className="mr-2 text-[#718096]" /> {customer.email || 'N/A'}
                                                </div>
                                                <div className="text-xs font-semibold text-[#4A5568] flex items-center">
                                                    <Phone size={12} className="mr-2 text-[#718096]" /> {customer.phone || 'N/A'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                {customer.customer_type === 'PARTNER' ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                                                        <Building2 size={12} className="mr-1" /> Partner
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700">
                                                        <Users size={12} className="mr-1" /> End Customer
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${customer.is_active
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-red-50 text-red-700'
                                                }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full mr-2 ${customer.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                {customer.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-[#FF6B00] hover:text-[#E65200] font-bold text-xs">View Details</button>
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

export default CustomerDashboard;
