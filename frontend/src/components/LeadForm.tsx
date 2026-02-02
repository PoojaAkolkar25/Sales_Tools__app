import React, { useState, useEffect } from 'react';
import {
    ArrowLeft,
    Save,
    Loader2,
    Building2,
    User,
    Briefcase,
    Mail,
    Globe,
    Calendar
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';

interface LeadFormProps {
    id?: number | null;
    onBack: () => void;
    onSave: () => void;
}

const LeadForm: React.FC<LeadFormProps> = ({ id, onBack, onSave }) => {
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        company: 'AE IND',
        lead_date: new Date().toISOString().split('T')[0],
        customer_name: '',
        project_name: '',
        project_manager: '',
        sales_person: '',
        email: ''
    });

    useEffect(() => {
        if (id) {
            fetchLead();
        }
    }, [id]);

    const fetchLead = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/leads/${id}/`);
            setFormData({
                company: response.data.company,
                lead_date: response.data.lead_date || new Date().toISOString().split('T')[0],
                customer_name: response.data.customer_name,
                project_name: response.data.project_name,
                project_manager: response.data.project_manager || '',
                sales_person: response.data.sales_person || '',
                email: response.data.email || ''
            });
        } catch (error) {
            console.error('Error fetching lead', error);
            showNotification('Error fetching lead details', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (id) {
                await api.put(`/leads/${id}/`, formData);
                showNotification('Lead updated successfully', 'success');
            } else {
                await api.post('/leads/', formData);
                showNotification('Lead created successfully', 'success');
            }
            onSave();
        } catch (error: any) {
            console.error('Error saving lead', error);
            const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : 'Error saving lead';
            showNotification(errorMsg, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="animate-spin text-[#0066CC]" size={48} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-[#718096] hover:text-[#2D3748] transition-colors font-medium"
                >
                    <ArrowLeft size={20} /> Back to Dashboard
                </button>
                <div className="flex items-center gap-4">
                    <button
                        type="submit"
                        form="lead-form"
                        disabled={saving}
                        className="ae-btn-primary flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        {id ? 'Update Lead' : 'Create Lead'}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-[#E0E6ED] shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#E0E6ED] bg-gray-50/50">
                    <h2 className="text-lg font-bold text-[#2D3748] flex items-center gap-2">
                        <Building2 size={20} className="text-[#0066CC]" />
                        {id ? 'Edit Lead' : 'New Lead Information'}
                    </h2>
                </div>

                <form id="lead-form" onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Company Selection */}
                        <div className="space-y-1">
                            <label className="ae-form-label flex items-center gap-2">
                                <Globe size={14} /> Company Name <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="company"
                                value={formData.company}
                                onChange={handleInputChange}
                                className="ae-input"
                                required
                            >
                                <option value="AE IND">AE IND</option>
                                <option value="AE USA">AE USA</option>
                            </select>
                            <p className="text-[0.7rem] text-[#A0AEC0]">Suffix will be INDLD or USALD based on selection</p>
                        </div>

                        {/* Lead Date */}
                        <div className="space-y-1">
                            <label className="ae-form-label flex items-center gap-2">
                                <Calendar size={14} /> Lead Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                name="lead_date"
                                value={formData.lead_date}
                                onChange={handleInputChange}
                                className="ae-input"
                                required
                            />
                        </div>

                        {/* Customer Name */}
                        <div className="space-y-1">
                            <label className="ae-form-label flex items-center gap-2">
                                <User size={14} /> Customer Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                name="customer_name"
                                value={formData.customer_name}
                                onChange={handleInputChange}
                                className="ae-input"
                                placeholder="ABC LTD"
                                required
                            />
                        </div>

                        {/* Project Name */}
                        <div className="space-y-1">
                            <label className="ae-form-label flex items-center gap-2">
                                <Briefcase size={14} /> Project Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                name="project_name"
                                value={formData.project_name}
                                onChange={handleInputChange}
                                className="ae-input"
                                placeholder="AutomationEdge Project ABC"
                                required
                            />
                        </div>

                        {/* Sales Person */}
                        <div className="space-y-1">
                            <label className="ae-form-label flex items-center gap-2">
                                <User size={14} /> Sales Person
                            </label>
                            <input
                                name="sales_person"
                                value={formData.sales_person}
                                onChange={handleInputChange}
                                className="ae-input"
                                placeholder="Name of salesperson"
                            />
                        </div>

                        {/* Project Manager */}
                        <div className="space-y-1">
                            <label className="ae-form-label flex items-center gap-2">
                                <User size={14} /> Project Manager
                            </label>
                            <input
                                name="project_manager"
                                value={formData.project_manager}
                                onChange={handleInputChange}
                                className="ae-input"
                                placeholder="Name of project manager"
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-1">
                            <label className="ae-form-label flex items-center gap-2">
                                <Mail size={14} /> Email Address
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                className="ae-input"
                                placeholder="customer@example.com"
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-[#E0E6ED] mt-6">
                        <div className="p-4 bg-blue-50/50 rounded-lg flex items-start gap-3">
                            <div className="mt-1"><Building2 size={16} className="text-[#0066CC]" /></div>
                            <div>
                                <h4 className="text-sm font-bold text-[#0066CC]">Lead ID Generation</h4>
                                <p className="text-xs text-[#4A5568] mt-1">
                                    The Lead ID will be automatically generated upon saving.
                                    Format: <strong>{formData.company === 'AE IND' ? 'AEINDLD' : 'AEUSALD'}XXXX</strong>
                                </p>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LeadForm;
