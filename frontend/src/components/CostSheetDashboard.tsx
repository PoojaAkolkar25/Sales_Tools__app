import React, { useEffect, useState, useMemo } from 'react';
import { Eye, Search, Calendar } from 'lucide-react';
import api from '../api';

interface CostSheet {
    id: number;
    cost_sheet_no: string;
    lead_no: string;
    customer_name: string;
    project_name: string;
    status: string;
    total_estimated_price: string;
    created_at: string;
}

const CostSheetDashboard: React.FC<{ onView: (id: number) => void }> = ({ onView }) => {
    const [costSheets, setCostSheets] = useState<CostSheet[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter States
    const [filters, setFilters] = useState({
        csNumber: '',
        leadNo: '',
        customerName: '',
        projectName: '',
        status: '',
        date: ''
    });

    useEffect(() => {
        const fetchCostSheets = async () => {
            try {
                const response = await api.get('/cost-sheets/');
                setCostSheets(response.data);
            } catch (error) {
                console.error('Error fetching cost sheets', error);
            } finally {
                setLoading(false);
            }
        };
        fetchCostSheets();
    }, []);

    const filteredCostSheets = useMemo(() => {
        return costSheets.filter(cs => {
            const matchesCs = (cs.cost_sheet_no || '').toLowerCase().includes(filters.csNumber.toLowerCase());
            const matchesLead = (cs.lead_no || '').toLowerCase().includes(filters.leadNo.toLowerCase());
            const matchesCustomer = (cs.customer_name || '').toLowerCase().includes(filters.customerName.toLowerCase());
            const matchesProject = (cs.project_name || '').toLowerCase().includes(filters.projectName.toLowerCase());
            const matchesStatus = filters.status === '' || cs.status === filters.status;
            const matchesDate = filters.date === '' || new Date(cs.created_at).toLocaleDateString() === new Date(filters.date).toLocaleDateString();

            return matchesCs && matchesLead && matchesCustomer && matchesProject && matchesStatus && matchesDate;
        });
    }, [costSheets, filters]);

    const statusFlow = [
        { label: 'All', value: '' },
        { label: 'Draft', value: 'PENDING' },
        { label: 'Pending', value: 'SUBMITTED' },
        { label: 'Approved', value: 'APPROVED' },
        { label: 'Rejected', value: 'REJECTED' }
    ];

    if (loading) return <div className="text-center p-20 text-[#718096] font-medium">Loading cost sheets...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-extrabold text-[#1a1f36]">Cost Sheet Dashboard</h2>
            </div>

            {/* Status Flow Navigation */}
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-[#E0E6ED] w-fit">
                {statusFlow.map((flow, index) => (
                    <React.Fragment key={flow.value}>
                        <button
                            onClick={() => setFilters({ ...filters, status: flow.value })}
                            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${filters.status === flow.value
                                ? 'bg-[#0066CC] text-white shadow-md'
                                : 'text-[#718096] hover:bg-[#F5F7FA] hover:text-[#2D3748]'
                                }`}
                        >
                            {flow.label}
                        </button>
                        {index < statusFlow.length - 1 && (
                            <span className="text-[#A0AEC0] font-bold mx-2">{'>>'}</span>
                        )}
                    </React.Fragment>
                ))}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-[#E0E6ED] overflow-hidden">
                <table className="w-full text-left table-fixed">
                    <thead className="bg-[#FAFBFC] border-b border-[#E0E6ED] uppercase text-[10px] font-bold tracking-widest text-[#718096]">
                        <tr>
                            <th className="py-4 px-4 w-[16%]">Lead Number</th>
                            <th className="py-2 px-4 w-[20%]">Customer Name</th>
                            <th className="py-4 px-4 w-[20%]">Project Name</th>
                            <th className="py-4 px-4 w-[12%]">Cost Sheet No.</th>
                            <th className="py-4 px-4 w-[12%]">Cost Sheet Date</th>
                            <th className="py-4 px-4 w-[14%]">Total Price</th>
                            <th className="py-4 px-4 w-[6%] text-right">Actions</th>
                        </tr>
                        <tr className="bg-[#F5F7FA]/50 border-b border-[#E0E6ED]">
                            <th className="py-2 px-2">
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-[#A0AEC0]" size={12} />
                                    <input
                                        className="bg-white border-[#E0E6ED] pl-7 text-[10px] py-1 h-8 w-full focus:ring-2 focus:ring-[#0066CC]/10 focus:border-[#0066CC] transition-all"
                                        placeholder="Filter..."
                                        value={filters.leadNo}
                                        onChange={e => setFilters({ ...filters, leadNo: e.target.value })}
                                    />
                                </div>
                            </th>
                            <th className="py-2 px-2">
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-[#A0AEC0]" size={12} />
                                    <input
                                        className="bg-white border-[#E0E6ED] pl-7 text-[10px] py-1 h-8 w-full focus:ring-2 focus:ring-[#0066CC]/10 focus:border-[#0066CC] transition-all"
                                        placeholder="Filter..."
                                        value={filters.customerName}
                                        onChange={e => setFilters({ ...filters, customerName: e.target.value })}
                                    />
                                </div>
                            </th>
                            <th className="py-2 px-2">
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-[#A0AEC0]" size={12} />
                                    <input
                                        className="bg-white border-[#E0E6ED] pl-7 text-[10px] py-1 h-8 w-full focus:ring-2 focus:ring-[#0066CC]/10 focus:border-[#0066CC] transition-all"
                                        placeholder="Filter..."
                                        value={filters.projectName}
                                        onChange={e => setFilters({ ...filters, projectName: e.target.value })}
                                    />
                                </div>
                            </th>
                            <th className="py-2 px-2">
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-[#A0AEC0]" size={12} />
                                    <input
                                        className="bg-white border-[#E0E6ED] pl-7 text-[10px] py-1 h-8 w-full focus:ring-2 focus:ring-[#0066CC]/10 focus:border-[#0066CC] transition-all"
                                        placeholder="Filter..."
                                        value={filters.csNumber}
                                        onChange={e => setFilters({ ...filters, csNumber: e.target.value })}
                                    />
                                </div>
                            </th>
                            <th className="py-2 px-2">
                                <div className="relative">
                                    <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 text-[#A0AEC0]" size={12} />
                                    <input
                                        type="date"
                                        className="bg-white border-[#E0E6ED] pl-7 text-[10px] py-1 h-8 w-full focus:ring-2 focus:ring-[#0066CC]/10 focus:border-[#0066CC]"
                                        value={filters.date}
                                        onChange={e => setFilters({ ...filters, date: e.target.value })}
                                    />
                                </div>
                            </th>
                            <th className="py-2 px-2">
                                <div className="h-8"></div>
                            </th>
                            <th className="py-2 px-4 text-right">
                                <button
                                    onClick={() => setFilters({ csNumber: '', leadNo: '', customerName: '', projectName: '', status: '', date: '' })}
                                    className="text-[9px] text-[#0066CC] hover:text-[#0052CC] font-bold uppercase tracking-tight"
                                >
                                    Reset
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E0E6ED]">
                        {filteredCostSheets.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="py-20 text-center text-[#718096] font-medium">
                                    {costSheets.length === 0 ? 'No cost sheets found.' : 'No results matching your filters.'}
                                </td>
                            </tr>
                        ) : (
                            filteredCostSheets.map((cs) => (
                                <tr key={cs.id} className="hover:bg-[#F5F7FA]/50 transition-colors group">
                                    <td className="py-4 px-4 font-bold text-[#4A5568] font-mono text-[11px] truncate whitespace-nowrap overflow-hidden" title={cs.lead_no}>{cs.lead_no}</td>
                                    <td className="py-4 px-4 text-[#2D3748] text-[12px] font-medium truncate whitespace-nowrap overflow-hidden" title={cs.customer_name}>{cs.customer_name || '—'}</td>
                                    <td className="py-4 px-4 text-[#718096] text-[12px] truncate whitespace-nowrap overflow-hidden" title={cs.project_name}>{cs.project_name || '—'}</td>
                                    <td className="py-4 px-4 font-bold text-[#0066CC] font-mono text-[11px] truncate whitespace-nowrap overflow-hidden" title={cs.cost_sheet_no}>{cs.cost_sheet_no}</td>
                                    <td className="py-4 px-4 text-[#4A5568] text-[11px] font-medium whitespace-nowrap">
                                        {new Date(cs.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="py-4 px-4 font-bold text-[#2D3748] font-mono text-[11px] whitespace-nowrap">${parseFloat(cs.total_estimated_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className="py-4 px-4 text-right">
                                        <button
                                            onClick={() => onView(cs.id)}
                                            className="p-1.5 text-[#A0AEC0] hover:text-[#0066CC] transition-all hover:scale-110"
                                            title="View Details"
                                        >
                                            <Eye size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CostSheetDashboard;
