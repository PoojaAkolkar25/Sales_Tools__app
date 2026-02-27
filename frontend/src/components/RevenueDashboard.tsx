import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    PlusCircle,
    Calendar,
    FileText,
    Calculator,
    LayoutDashboard,
    Search,
    ChevronLeft,
    ChevronRight,
    Loader2
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { formatToAppDate } from '../utils/dateUtils';
import RevenueContractForm from './RevenueContractForm';
import RevenueScheduleTable from './RevenueScheduleTable';
import Pagination from './Pagination';

interface RevenueContract {
    id: number;
    contract_id: string;
    revenue_type: string;
    revenue_type_display: string;
    deal: number;
    deal_no: string;
    customer: number;
    customer_name: string;
    total_amount: string;
    currency: string;
    start_date: string;
    end_date: string;
    status: string;
}

const ALL_COLUMNS = [
    { key: 'contract_id', label: 'Contract ID', shortLabel: 'ID' },
    { key: 'revenue_type', label: 'Type', shortLabel: 'TYPE' },
    { key: 'deal_no', label: 'Deal No.', shortLabel: 'DEAL' },
    { key: 'customer_name', label: 'Customer Name', shortLabel: 'CUST.' },
    { key: 'total_amount', label: 'Amount', shortLabel: 'AMT' },
    { key: 'period', label: 'Period', shortLabel: 'PER' },
    { key: 'status', label: 'Status', shortLabel: 'ST' },
];

const RevenueDashboard: React.FC = () => {
    const { showNotification } = useNotification();
    const [contracts, setContracts] = useState<RevenueContract[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'create'>('dashboard');
    const [view, setView] = useState<'list' | 'schedule'>('list');
    const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    const [filters, setFilters] = useState({
        contract_id: '',
        revenue_type: '',
        deal_no: '',
        customer_name: '',
        status: 'ACTIVE' // Default status tab
    });

    const tableScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchContracts();
    }, []);

    const fetchContracts = async () => {
        setLoading(true);
        try {
            const response = await api.get('/revenue/contracts/');
            setContracts(response.data);
        } catch (error) {
            console.error('Error fetching revenue contracts', error);
            showNotification('Error fetching revenue contracts', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        setView('list');
        setActiveTab('dashboard');
        fetchContracts();
    };

    const computeSchedule = async (id: number) => {
        try {
            showNotification('Computing revenue schedule...', 'info');
            await api.post(`/revenue/contracts/${id}/compute_schedule/`);
            showNotification('Revenue schedule computed successfully', 'success');
            fetchContracts();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Error computing schedule', 'error');
        }
    };

    const counts = useMemo(() => ({
        all: contracts.length,
        draft: contracts.filter(c => c.status === 'DRAFT').length,
        active: contracts.filter(c => c.status === 'ACTIVE').length,
        completed: contracts.filter(c => c.status === 'COMPLETED').length,
        cancelled: contracts.filter(c => c.status === 'CANCELLED').length
    }), [contracts]);

    const statusTabs = [
        { label: `Draft (${counts.draft})`, value: 'DRAFT' },
        { label: `Active (${counts.active})`, value: 'ACTIVE' },
        { label: `Completed (${counts.completed})`, value: 'COMPLETED' },
        { label: `Cancelled (${counts.cancelled})`, value: 'CANCELLED' },
        { label: `All (${counts.all})`, value: '' }
    ];

    const filteredContracts = useMemo(() => {
        return contracts.filter(c => {
            const matchesId = (c.contract_id || '').toLowerCase().includes(filters.contract_id.toLowerCase());
            const matchesType = (c.revenue_type_display || '').toLowerCase().includes(filters.revenue_type.toLowerCase());
            const matchesDeal = (c.deal_no || '').toLowerCase().includes(filters.deal_no.toLowerCase());
            const matchesCustomer = (c.customer_name || '').toLowerCase().includes(filters.customer_name.toLowerCase());
            const matchesStatus = filters.status === '' || c.status === filters.status;
            return matchesId && matchesType && matchesDeal && matchesCustomer && matchesStatus;
        });
    }, [contracts, filters]);

    const paginatedContracts = useMemo(() => {
        return filteredContracts.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        );
    }, [filteredContracts, currentPage]);

    const statusColors: Record<string, string> = {
        'DRAFT': '#718096',
        'ACTIVE': '#38A169',
        'COMPLETED': '#3182CE',
        'CANCELLED': '#E53E3E'
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
                <div style={{ width: '4px', height: '24px', background: '#FF6B00', borderRadius: '4px' }}></div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1a1f36', margin: 0 }}>Revenue Management</h1>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <button
                    onClick={() => { setActiveTab('dashboard'); setView('list'); setSelectedContractId(null); }}
                    style={{
                        padding: '10px 24px',
                        borderRadius: '12px',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: activeTab === 'dashboard' ? '#FF6B00' : 'white',
                        color: activeTab === 'dashboard' ? 'white' : '#718096',
                        border: '1px solid ' + (activeTab === 'dashboard' ? '#FF6B00' : '#E2E8F0'),
                        boxShadow: activeTab === 'dashboard' ? '0 4px 12px rgba(255,107,0,0.2)' : 'none',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                    }}
                >
                    <LayoutDashboard size={18} /> Dashboard
                </button>
                <button
                    onClick={() => { setActiveTab('create'); setSelectedContractId(null); }}
                    style={{
                        padding: '10px 24px',
                        borderRadius: '12px',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: activeTab === 'create' ? '#FF6B00' : 'white',
                        color: activeTab === 'create' ? 'white' : '#718096',
                        border: '1px solid ' + (activeTab === 'create' ? '#FF6B00' : '#E2E8F0'),
                        boxShadow: activeTab === 'create' ? '0 4px 12px rgba(255,107,0,0.2)' : 'none',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                    }}
                >
                    <PlusCircle size={18} /> Create New
                </button>
            </div>

            {activeTab === 'create' ? (
                <RevenueContractForm id={selectedContractId} onBack={handleBack} onSave={handleBack} />
            ) : view === 'schedule' && selectedContractId ? (
                <RevenueScheduleTable contractId={selectedContractId} onBack={handleBack} />
            ) : (

                <div className="ae-table-container shadow-sm border border-gray-200 rounded-xl overflow-visible bg-white" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #F1F5F9' }}>
                        <div style={{ display: 'flex', gap: '4px', background: '#F8FAFC', padding: '4px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                            {statusTabs.map((tab) => (
                                <button
                                    key={tab.value}
                                    onClick={() => setFilters({ ...filters, status: tab.value })}
                                    style={{
                                        padding: '6px 16px',
                                        borderRadius: '8px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        background: filters.status === tab.value ? '#FF6B00' : 'transparent',
                                        color: filters.status === tab.value ? 'white' : '#64748B'
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => tableScrollRef.current?.scrollBy({ left: -150, behavior: 'smooth' })}
                            style={{ position: 'absolute', left: '-18px', top: '50%', transform: 'translateY(-50%)', zIndex: 30, width: '36px', height: '36px', borderRadius: '50%', background: 'white', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            onClick={() => tableScrollRef.current?.scrollBy({ left: 150, behavior: 'smooth' })}
                            style={{ position: 'absolute', right: '-18px', top: '50%', transform: 'translateY(-50%)', zIndex: 30, width: '36px', height: '36px', borderRadius: '50%', background: 'white', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                            <ChevronRight size={18} />
                        </button>

                        <div ref={tableScrollRef} style={{ overflowX: 'auto' }}>
                            <table className="ae-table w-full text-sm text-left" style={{ minWidth: '1000px' }}>
                                <thead className="bg-[#F8FAFC] border-b border-gray-100">
                                    <tr>
                                        {ALL_COLUMNS.map(col => (
                                            <th key={col.key} className="px-4 py-3 font-bold text-gray-600 uppercase tracking-wider text-[11px]">
                                                {col.label}
                                            </th>
                                        ))}
                                        <th className="px-4 py-3 font-bold text-gray-600 uppercase tracking-wider text-[11px] text-center">Actions</th>
                                    </tr>
                                    <tr className="bg-[#FDFDFD]">
                                        {ALL_COLUMNS.map(col => (
                                            <th key={col.key} className="px-2 py-2 border-b border-gray-100">
                                                {col.key !== 'period' && col.key !== 'total_amount' && col.key !== 'status' ? (
                                                    <div className="relative">
                                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                                                        <input
                                                            type="text"
                                                            placeholder="Filter..."
                                                            className="w-full pl-7 pr-2 py-1 text-[11px] rounded-md border border-gray-200 focus:ring-1 focus:ring-orange-500 outline-none"
                                                            value={(filters as any)[col.key] || ''}
                                                            onChange={(e) => setFilters({ ...filters, [col.key]: e.target.value })}
                                                        />
                                                    </div>
                                                ) : null}
                                            </th>
                                        ))}
                                        <th className="px-2 py-2 border-b border-gray-100">
                                            <button
                                                onClick={() => setFilters({ contract_id: '', revenue_type: '', deal_no: '', customer_name: '', status: filters.status })}
                                                className="w-full py-1 text-[10px] font-bold text-orange-600 bg-orange-50 rounded-md border border-orange-100"
                                            >
                                                Clear
                                            </button>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={8} className="text-center py-20">
                                                <Loader2 className="animate-spin mx-auto text-orange-500" size={32} />
                                            </td>
                                        </tr>
                                    ) : paginatedContracts.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="text-center py-20 text-gray-400">
                                                <FileText className="mx-auto mb-2 opacity-20" size={48} />
                                                <p>No revenue contracts found.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedContracts.map((contract) => (
                                            <tr key={contract.id} className="border-b border-gray-50 hover:bg-[#F8FAFC] transition-colors">
                                                <td className="px-4 py-3 font-bold text-[#1a1f36]">
                                                    <span className="text-orange-600 underline cursor-pointer" onClick={() => { setSelectedContractId(contract.id); setActiveTab('create'); }}>
                                                        {contract.contract_id}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-50 text-blue-600">
                                                        {contract.revenue_type_display}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 font-medium">{contract.deal_no}</td>
                                                <td className="px-4 py-3 text-gray-600 font-medium">{contract.customer_name}</td>
                                                <td className="px-4 py-3 font-bold text-gray-900">
                                                    {Number(contract.total_amount).toLocaleString()} {contract.currency}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 text-[11px]">
                                                    {formatToAppDate(contract.start_date)} - {formatToAppDate(contract.end_date)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className="text-[10px] font-black px-2 py-1 rounded"
                                                        style={{
                                                            backgroundColor: `${statusColors[contract.status]}15`,
                                                            color: statusColors[contract.status]
                                                        }}
                                                    >
                                                        {contract.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => { setSelectedContractId(contract.id); setView('schedule'); }}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="View Schedule"
                                                        >
                                                            <Calendar size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => computeSchedule(contract.id)}
                                                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                            title="Recompute"
                                                        >
                                                            <Calculator size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <Pagination
                        currentPage={currentPage}
                        totalItems={filteredContracts.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}
        </div>
    );
};

export default RevenueDashboard;
