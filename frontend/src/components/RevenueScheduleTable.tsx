import React, { useState, useEffect, useMemo } from 'react';
import {
    ChevronLeft,
    RefreshCcw,
    Lock,
    CheckCircle,
    Plus,
    BarChart3,
    AlertCircle
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';

interface RevenueScheduleTableProps {
    contractId: number;
    onBack: () => void;
}

interface ScheduleEntry {
    id: number;
    period_date: string;
    recognized_amount: string;
    is_posted: boolean;
    gl_posting_ref: string;
    is_locked: boolean;
    comments: string;
}

interface ContractDetails {
    id: number;
    contract_id: string;
    revenue_type: string;
    revenue_type_display: string;
    customer_name: string;
    deal_no: string;
    total_amount: string;
    currency: string;
}

const RevenueScheduleTable: React.FC<RevenueScheduleTableProps> = ({ contractId, onBack }) => {
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(true);
    const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
    const [contract, setContract] = useState<ContractDetails | null>(null);
    const [showInputModal, setShowInputModal] = useState(false);
    const [inputType, setInputType] = useState<'consumption' | 'progress' | null>(null);

    // Input fields for modals
    const [inputValue, setInputValue] = useState('');
    const [inputDate, setInputDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        fetchSchedules();
        fetchContractDetails();
    }, [contractId]);

    const fetchSchedules = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/revenue/schedules/?contract=${contractId}`);
            setSchedules(response.data);
        } catch (error) {
            showNotification('Error fetching schedules', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchContractDetails = async () => {
        try {
            const response = await api.get(`/revenue/contracts/${contractId}/`);
            setContract(response.data);
        } catch (error) {
            console.error('Error fetching contract', error);
        }
    };

    const postToGL = async (scheduleId: number) => {
        try {
            showNotification('Posting to General Ledger...', 'info');
            await api.post(`/revenue/schedules/${scheduleId}/post_to_gl/`);
            showNotification('Successfully posted to GL', 'success');
            fetchSchedules();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Error posting to GL', 'error');
        }
    };

    const handleInputSubmit = async () => {
        if (!inputValue || !inputDate) return;

        try {
            if (inputType === 'consumption') {
                await api.post('/revenue/consumption/', {
                    contract: contractId,
                    consumption_date: inputDate,
                    billed_amount: inputValue
                });
                showNotification('Consumption record added', 'success');
            } else {
                await api.post('/revenue/progress/', {
                    contract: contractId,
                    progress_date: inputDate,
                    completion_percentage: inputValue
                });
                showNotification('Progress record added', 'success');
            }
            setShowInputModal(false);
            setInputValue('');
            // Trigger re-computation of schedule
            showNotification('Recomputing schedule based on new data...', 'info');
            await api.post(`/revenue/contracts/${contractId}/compute_schedule/`);
            fetchSchedules();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Error saving input', 'error');
        }
    };

    const totalRecognized = useMemo(() => {
        return schedules.reduce((sum: number, s: ScheduleEntry) => sum + Number(s.recognized_amount), 0);
    }, [schedules]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 tracking-tight">Revenue Schedule</h2>
                        {contract && (
                            <p className="text-gray-500 font-medium">{contract.contract_id} • {contract.customer_name}</p>
                        )}
                    </div>
                </div>

                <div className="flex gap-3">
                    {contract?.revenue_type === 'LICENSE_CONSUMPTION' && (
                        <button
                            onClick={() => { setInputType('consumption'); setShowInputModal(true); }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md"
                        >
                            <Plus size={18} /> Record Consumption
                        </button>
                    )}
                    {contract?.revenue_type === 'PS_FIXED_BID' && (
                        <button
                            onClick={() => { setInputType('progress'); setShowInputModal(true); }}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md"
                        >
                            <BarChart3 size={18} /> Update Progress %
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Total Contract Value</p>
                    <p className="text-2xl font-black text-gray-900">
                        {contract ? `${Number(contract.total_amount).toLocaleString()} ${contract.currency}` : '---'}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-blue-500 text-sm font-bold uppercase tracking-wider mb-1">Total Recognized to Date</p>
                    <p className="text-2xl font-black text-blue-600">
                        {contract ? `${totalRecognized.toLocaleString()} ${contract.currency}` : '---'}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-orange-500 text-sm font-bold uppercase tracking-wider mb-1">Pending Recognition</p>
                    <p className="text-2xl font-black text-orange-600">
                        {contract ? `${(Number(contract.total_amount) - totalRecognized).toLocaleString()} ${contract.currency}` : '---'}
                    </p>
                </div>
            </div>

            {/* Schedule Table */}
            <div className="ae-table-container bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="ae-table w-full text-left">
                    <thead className="bg-[#FAFBFC] border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 font-black text-gray-400 uppercase text-xs tracking-widest">Period (Month)</th>
                            <th className="px-6 py-4 font-black text-gray-400 uppercase text-xs tracking-widest text-right">Recognized Amount</th>
                            <th className="px-6 py-4 font-black text-gray-400 uppercase text-xs tracking-widest text-center">GL Status</th>
                            <th className="px-6 py-4 font-black text-gray-400 uppercase text-xs tracking-widest">GL Reference</th>
                            <th className="px-6 py-4 font-black text-gray-400 uppercase text-xs tracking-widest text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="text-center py-10"><RefreshCcw className="animate-spin mx-auto text-orange-500" /></td></tr>
                        ) : schedules.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-20 text-gray-400 font-medium">No recognized revenue entries yet.</td></tr>
                        ) : (
                            schedules.map((entry: ScheduleEntry) => (
                                <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-700">
                                        {new Date(entry.period_date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-gray-900">
                                        {Number(entry.recognized_amount).toLocaleString()} {contract?.currency}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {entry.is_posted ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-600 text-xs font-bold">
                                                <CheckCircle size={14} /> Posted
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-xs font-bold">
                                                <AlertCircle size={14} /> Pending
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                                        {entry.gl_posting_ref || 'NR-PENDING'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {!entry.is_posted ? (
                                            <button
                                                onClick={() => postToGL(entry.id)}
                                                className="px-4 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-all"
                                            >
                                                Post to GL
                                            </button>
                                        ) : (
                                            <div className="flex items-center justify-center text-gray-400" title="Period Locked">
                                                <Lock size={16} />
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Input Modal */}
            {showInputModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8">
                            <h3 className="text-2xl font-black text-gray-900 mb-2">
                                {inputType === 'consumption' ? 'Record Usage' : 'Update Project Progress'}
                            </h3>
                            <p className="text-gray-500 font-medium mb-6">
                                {inputType === 'consumption'
                                    ? 'Enter the billed amount for the specific consumption period.'
                                    : 'Enter the cumulative completion percentage for this project.'}
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-1">Reference Date</label>
                                    <input
                                        type="date"
                                        value={inputDate}
                                        onChange={(e) => setInputDate(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-1">
                                        {inputType === 'consumption' ? 'Billed Amount' : 'Cumulative Progress (%)'}
                                    </label>
                                    <div className="relative">
                                        {inputType === 'consumption' && (
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                                                {contract?.currency}
                                            </div>
                                        )}
                                        <input
                                            type="number"
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            className={`w-full ${inputType === 'consumption' ? 'pl-14' : 'px-4'} py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none font-bold`}
                                            placeholder={inputType === 'consumption' ? '0.00' : '0-100'}
                                        />
                                        {inputType === 'progress' && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={() => setShowInputModal(false)}
                                    className="flex-1 px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleInputSubmit}
                                    className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-gray-900 hover:bg-black transition-all shadow-lg shadow-gray-200"
                                >
                                    Save Entry
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RevenueScheduleTable;
