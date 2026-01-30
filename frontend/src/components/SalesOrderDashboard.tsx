import React, { useState, useEffect } from 'react';
import {
    ShoppingBag,
    Clock,
    CheckCircle2,
    Eye,
    Upload,
    ArrowRight,
    Search,
    TrendingUp,
    BarChart3
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';

interface SalesOrderDashboardProps {
    onView: (id: number) => void;
}

const SalesOrderDashboard: React.FC<SalesOrderDashboardProps> = ({ onView }) => {
    const [salesOrders, setSalesOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isExtracting, setIsExtracting] = useState(false);
    const [showCompleted, setShowCompleted] = useState(false);
    const [stats, setStats] = useState({
        pending: 0,
        submitted: 0,
        extractionAccuracy: 0,
        mappedCustomers: 0,
        mappedItems: 0,
        validDates: 0
    });
    const { showNotification } = useNotification();

    useEffect(() => {
        fetchSalesOrders();
    }, []);

    const fetchSalesOrders = async () => {
        setLoading(true);
        try {
            const response = await api.get('/sales-orders/');
            setSalesOrders(response.data);

            // Calculate dynamic stats
            const draftCount = response.data.filter((so: any) => so.status === 'DRAFT').length;
            const submittedCount = response.data.filter((so: any) => so.status === 'SUBMITTED').length;

            const total = response.data.length || 1;
            const itemsMapped = response.data.filter((so: any) => so.items && so.items.length > 0 && so.items.every((i: any) => i.product)).length;
            const datesValid = response.data.filter((so: any) => so.po_date).length;

            const accuracy = Math.round(((itemsMapped / total) * 0.7 + (datesValid / total) * 0.3) * 100);

            setStats({
                pending: draftCount,
                submitted: submittedCount,
                extractionAccuracy: accuracy,
                mappedCustomers: 100, // Always 100% since we take from PDF directly
                mappedItems: Math.round((itemsMapped / total) * 100),
                validDates: Math.round((datesValid / total) * 100)
            });
        } catch (error) {
            console.error('Error fetching sales orders', error);
            showNotification('Failed to load sales orders', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            setIsExtracting(true);
            showNotification('Uploading and processing Purchase Order...', 'info');
            const response = await api.post('/po-files/process_po/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setIsExtracting(false);
            setShowCompleted(true);
            showNotification(response.data.message, 'success');
            fetchSalesOrders();

            // Hide completed status after 3 seconds
            setTimeout(() => setShowCompleted(false), 3000);

            if (response.data.so_id) {
                onView(response.data.so_id);
            }
        } catch (error) {
            setIsExtracting(false);
            showNotification('Extraction failed, please create manually or try again.', 'error');
        }
    };

    const StatCard = ({ icon: Icon, label, value, color, secondary }: any) => (
        <div className="section-panel !p-6 flex items-center gap-4 transition-all hover:scale-[1.02]">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center`} style={{ background: `${color}15`, color: color }}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-sm font-medium text-[#718096] mb-1">{label}</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-[#1a1f36]">{value}</span>
                    {secondary && <span className="text-xs font-bold text-green-500">{secondary}</span>}
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header with Stats */}
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-[#E0E6ED] shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-[#1a1f36]">Sales Orders</h1>
                    <p className="text-[#718096] font-medium mt-1 uppercase text-xs tracking-wider">Automated PO Intake & SO Creation</p>
                </div>
                <div className="flex gap-4">
                    <label className={`ae-btn-primary !py-3 !px-6 cursor-pointer flex items-center gap-2 shadow-lg transition-all ${isExtracting ? 'opacity-70 cursor-not-allowed bg-[#718096]' :
                        showCompleted ? 'bg-green-500 shadow-green-500/20' : 'shadow-[#FF6B00]/20'
                        }`}>
                        {isExtracting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Processing...
                            </>
                        ) : showCompleted ? (
                            <>
                                <CheckCircle2 size={18} />
                                Completed!
                            </>
                        ) : (
                            <>
                                <Upload size={18} />
                                Upload Purchase Order
                            </>
                        )}
                        <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf" disabled={isExtracting} />
                    </label>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    icon={Clock}
                    label="Draft SOs (Pending Review)"
                    value={stats.pending}
                    color="#FF6B00"
                    secondary="+2 today"
                />
                <StatCard
                    icon={CheckCircle2}
                    label="Submitted Orders"
                    value={stats.submitted}
                    color="#38A169"
                    secondary="+5 this week"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Extraction Accuracy"
                    value={`${stats.extractionAccuracy}%`}
                    color="#3182CE"
                    secondary="High"
                />
            </div>

            {/* Main Content Dashboard */}
            <div className="section-panel bg-white !p-0 overflow-hidden">
                <div className="p-6 border-b border-[#E0E6ED] flex justify-between items-center bg-[#F8FAFC]">
                    <div className="flex items-center gap-3">
                        <ShoppingBag className="text-[#3182CE]" size={20} />
                        <h2 className="font-extrabold text-[#2D3748]">Incoming POs & Order Drafts</h2>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0AEC0]" size={16} />
                            <input
                                type="text"
                                placeholder="Search by PO# or Customer..."
                                className="pl-10 pr-4 py-2 bg-white border border-[#E0E6ED] rounded-xl text-sm w-64 outline-none focus:ring-2 focus:ring-[#3182CE]/10 transition-all font-medium"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-[#f1f5f9] text-left">
                                <th className="px-6 py-4 text-xs font-black text-[#4A5568] uppercase tracking-wider">SO Number</th>
                                <th className="px-6 py-4 text-xs font-black text-[#4A5568] uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-4 text-xs font-black text-[#4A5568] uppercase tracking-wider">Cust Code</th>
                                <th className="px-6 py-4 text-xs font-black text-[#4A5568] uppercase tracking-wider">PO Number</th>
                                <th className="px-6 py-4 text-xs font-black text-[#4A5568] uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-black text-[#4A5568] uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-xs font-black text-[#4A5568] uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-xs font-black text-[#4A5568] uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E0E6ED]">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-[#718096] font-medium italic">
                                        Loading Sales Orders...
                                    </td>
                                </tr>
                            ) : salesOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-[#718096] font-medium italic">
                                        No Sales Orders found. Upload a PO to get started.
                                    </td>
                                </tr>
                            ) : salesOrders.map((so) => (
                                <tr key={so.id} className="hover:bg-[#F8FAFC] transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-black text-[#1a1f36]">{so.so_number || '---'}</span>
                                        {so.status === 'DRAFT' && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 uppercase tracking-tighter">Draft</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-extrabold text-[#2D3748]">{so.customer_name || 'N/A'}</span>
                                            <span className="text-[10px] text-blue-600 font-bold tracking-widest uppercase">Extracted from PDF</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-bold text-[#4A5568]">{so.customer_code || '---'}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-bold text-[#4A5568]">{so.po_number}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${so.status === 'SUBMITTED' ? 'bg-green-100 text-green-700 border border-green-200' :
                                            'bg-amber-100 text-amber-700 border border-amber-200'
                                            }`}>
                                            {so.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-black text-[#2D3748]">{so.currency} {parseFloat(so.total_amount).toLocaleString()}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-xs font-semibold text-[#718096] uppercase">{new Date(so.created_at).toLocaleDateString()}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <button
                                            onClick={() => onView(so.id)}
                                            className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-[#3182CE] text-[#3182CE] rounded-xl text-xs font-black uppercase transition-all hover:bg-[#3182CE] hover:text-white"
                                        >
                                            <Eye size={14} /> {so.status === 'DRAFT' ? 'Review' : 'View'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Success rates / accuracy log */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
                <div className="section-panel bg-white !p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <BarChart3 className="text-[#FF6B00]" size={20} />
                        <h3 className="font-extrabold text-[#2D3748]">Extraction Summary</h3>
                    </div>
                    <div className="space-y-4">
                        {[
                            { label: 'Auto-mapped Customers', value: stats.mappedCustomers },
                            { label: 'Auto-mapped Line Items', value: stats.mappedItems },
                            { label: 'Date Parsing Accuracy', value: stats.validDates }
                        ].map((item, i) => (
                            <div key={i} className="space-y-1">
                                <div className="flex justify-between text-xs font-bold text-[#718096]">
                                    <span>{item.label}</span>
                                    <span>{item.value}%</span>
                                </div>
                                <div className="h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                                    <div className="h-full bg-[#FF6B00]" style={{ width: `${item.value}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="section-panel bg-white !p-6 flex flex-col justify-center items-center text-center">
                    <div className="w-16 h-16 bg-[#F8FAFC] rounded-full flex items-center justify-center mb-4">
                        <ArrowRight size={32} className="text-[#3182CE]" />
                    </div>
                    <h3 className="font-black text-[#1a1f36] mb-2 uppercase tracking-tight">Automate faster with Email Integration</h3>
                    <p className="text-[#718096] text-sm font-medium mb-6">Forward customer Purchase Orders to <br /><span className="text-[#3182CE] font-bold">po@salestool.com</span> for instant draft creation.</p>
                    <button className="ae-btn-secondary !w-auto !px-8">Configure Email Sync</button>
                </div>
            </div>
        </div>
    );
};

export default SalesOrderDashboard;
