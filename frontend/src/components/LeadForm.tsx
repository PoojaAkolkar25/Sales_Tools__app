import React, { useState, useEffect } from 'react';
import {
    ArrowLeft,
    Save,
    Loader2,
    Calendar,
    Users,
    Building2
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
        <div style={{ padding: '0 20px' }}>
            {/* Top Back & Save Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <button
                    onClick={onBack}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#718096',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.9rem'
                    }}
                >
                    <ArrowLeft size={18} /> Back to Dashboard
                </button>
                <button
                    type="submit"
                    form="lead-form"
                    disabled={saving}
                    className="ae-btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 20px', borderRadius: '10px' }}
                >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    <span style={{ fontWeight: 800 }}>{id ? 'Update Lead' : 'Save Lead'}</span>
                </button>
            </div>

            <div className="glass-card" style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
                {/* Visual Header with Orange Icon Box */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '48px' }}>
                    <div style={{
                        background: '#FFF5EB',
                        padding: '12px',
                        borderRadius: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(255, 107, 0, 0.1)'
                    }}>
                        <Users size={28} color="#FF6B00" />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1a1f36', margin: 0, letterSpacing: '-0.02em' }}>
                        {id ? 'Edit Lead Information' : 'Create New Lead'}
                    </h2>
                </div>

                <form id="lead-form" onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px 40px', marginBottom: '40px' }}>
                        {/* Company Name */}
                        <div className="ae-input-group">
                            <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1a1f36', display: 'block', marginBottom: '10px' }}>
                                Company Name <span style={{ color: '#FF6B00' }}>*</span>
                            </label>
                            <select
                                name="company"
                                value={formData.company}
                                onChange={handleInputChange}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    background: '#F8FAFC',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '10px',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    color: '#1a1f36',
                                    outline: 'none',
                                    height: '48px'
                                }}
                                required
                            >
                                <option value="AE IND">AE IND</option>
                                <option value="AE USA">AE USA</option>
                            </select>
                            <p style={{ fontSize: '0.7rem', color: '#A0AEC0', marginTop: '8px', fontWeight: 500 }}>INDLD or USALD suffix</p>
                        </div>

                        {/* Lead Date */}
                        <div className="ae-input-group">
                            <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1a1f36', display: 'block', marginBottom: '10px' }}>
                                Lead Date <span style={{ color: '#FF6B00' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Calendar size={18} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#1a1f36', pointerEvents: 'none' }} />
                                <input
                                    type="date"
                                    name="lead_date"
                                    value={formData.lead_date}
                                    onChange={handleInputChange}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        background: '#F8FAFC',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: '10px',
                                        fontSize: '0.9rem',
                                        fontWeight: 600,
                                        color: '#1a1f36',
                                        outline: 'none',
                                        height: '48px'
                                    }}
                                    required
                                />
                            </div>
                        </div>

                        {/* Customer Name */}
                        <div className="ae-input-group">
                            <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1a1f36', display: 'block', marginBottom: '10px' }}>
                                Customer Name <span style={{ color: '#FF6B00' }}>*</span>
                            </label>
                            <input
                                name="customer_name"
                                value={formData.customer_name}
                                onChange={handleInputChange}
                                placeholder="Enter customer name"
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    background: '#F8FAFC',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '10px',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    color: '#1a1f36',
                                    outline: 'none',
                                    height: '48px'
                                }}
                                required
                            />
                        </div>

                        {/* Project Name */}
                        <div className="ae-input-group">
                            <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1a1f36', display: 'block', marginBottom: '10px' }}>
                                Project Name <span style={{ color: '#FF6B00' }}>*</span>
                            </label>
                            <input
                                name="project_name"
                                value={formData.project_name}
                                onChange={handleInputChange}
                                placeholder="Enter project name"
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    background: '#F8FAFC',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '10px',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    color: '#1a1f36',
                                    outline: 'none',
                                    height: '48px'
                                }}
                                required
                            />
                        </div>

                        {/* Sales Person */}
                        <div className="ae-input-group">
                            <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1a1f36', display: 'block', marginBottom: '10px' }}>
                                Sales Person
                            </label>
                            <input
                                name="sales_person"
                                value={formData.sales_person}
                                onChange={handleInputChange}
                                placeholder="Name of salesperson"
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    background: '#F8FAFC',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '10px',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    color: '#1a1f36',
                                    outline: 'none',
                                    height: '48px'
                                }}
                            />
                        </div>

                        {/* Project Manager */}
                        <div className="ae-input-group">
                            <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1a1f36', display: 'block', marginBottom: '10px' }}>
                                Project Manager
                            </label>
                            <input
                                name="project_manager"
                                value={formData.project_manager}
                                onChange={handleInputChange}
                                placeholder="Name of project manager"
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    background: '#F8FAFC',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '10px',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    color: '#1a1f36',
                                    outline: 'none',
                                    height: '48px'
                                }}
                            />
                        </div>

                        {/* Email Address */}
                        <div className="ae-input-group">
                            <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1a1f36', display: 'block', marginBottom: '10px' }}>
                                Email Address
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="customer@example.com"
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    background: '#F8FAFC',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '10px',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    color: '#1a1f36',
                                    outline: 'none',
                                    height: '48px'
                                }}
                            />
                        </div>
                    </div>

                    {/* Lead ID Generation Banner */}
                    <div style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        padding: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px'
                    }}>
                        <div style={{
                            background: '#EBF4FF',
                            padding: '10px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Building2 size={24} color="#0066CC" />
                        </div>
                        <div>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#2D3748', margin: '0 0 4px 0' }}>Lead ID Generation</h4>
                            <p style={{ fontSize: '0.85rem', color: '#718096', margin: 0 }}>
                                Automatic generation: <span style={{ fontWeight: 800, color: '#2D3748' }}>{formData.company === 'AE IND' ? 'AEINDLDXXXX' : 'AEUSALDXXXX'}</span>
                            </p>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LeadForm;

