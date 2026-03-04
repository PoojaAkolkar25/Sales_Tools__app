import React, { useState, useEffect } from 'react';
import {
    Save,
    Loader2,
    Calendar,
    Building2
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { formatToAppDate } from '../utils/dateUtils';
import SearchableDropdown from './SearchableDropdown';

interface LeadFormProps {
    id?: number | null;
    onBack: () => void;
    onSave: () => void;
}

const LeadForm: React.FC<LeadFormProps> = ({ id, onBack, onSave }) => {
    const { showNotification, showConfirm } = useNotification();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isCancelActive, setIsCancelActive] = useState(false);
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
            let errorMsg = 'Error saving lead';
            if (error.response?.data) {
                const data = error.response.data;
                if (data.error) errorMsg = data.error;
                else if (typeof data === 'object') {
                    const errors = [];
                    for (const [key, value] of Object.entries(data)) {
                        if (Array.isArray(value)) errors.push(`${key}: ${value[0]}`);
                        else if (typeof value === 'string') errors.push(`${key}: ${value}`);
                    }
                    if (errors.length > 0) errorMsg = errors.join(' | ');
                    else errorMsg = JSON.stringify(data);
                }
            }
            showNotification(errorMsg, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="animate-spin" style={{ color: 'var(--ae-blue)' }} size={48} />
            </div>
        );
    }

    return (
        <div className="space-y-6" style={{ padding: '4px' }}>
            <form id="lead-form" onSubmit={handleSubmit} className="space-y-6">
                <div style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '12px',
                    width: '100%',
                    boxShadow: 'var(--shadow-md)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                        <span style={{
                            width: '4px',
                            height: '18px',
                            background: 'var(--ae-blue)',
                            borderRadius: '2px'
                        }}></span>
                        <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', margin: 0 }}>
                            {id ? 'Edit Lead Information' : 'Create New Lead'}
                        </h2>
                    </div>
                    <div className="ae-grid-4" style={{ marginBottom: '16px' }}>
                        {/* Company Name */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                Company Name <span style={{ color: 'var(--theme-primary)' }}>*</span>
                            </label>
                            <SearchableDropdown
                                options={[
                                    { value: 'AE IND', label: 'AE IND' },
                                    { value: 'AE USA', label: 'AE USA' }
                                ]}
                                value={formData.company}
                                onChange={(value) => setFormData(prev => ({ ...prev, company: value as string }))}
                                placeholder="Select Company"
                                className="w-full"
                            />
                            <p style={{ fontSize: '0.65rem', color: '#A0AEC0', marginTop: '4px', fontWeight: 500 }}>INDLD or USALD suffix</p>
                        </div>

                        {/* Lead Date */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                Lead Date <span style={{ color: 'var(--theme-primary)' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                {/* Display-only text field showing DD/MMM/YYYY */}
                                <input
                                    type="text"
                                    readOnly
                                    value={formatToAppDate(formData.lead_date)}
                                    className="ae-input"
                                    style={{ width: '100%', height: '34px', cursor: 'pointer' }}
                                    onClick={() => {
                                        const picker = document.getElementById('lead-date-picker') as HTMLInputElement;
                                        if (picker) picker.showPicker?.();
                                    }}
                                />
                                {/* Hidden native date input for picking */}
                                <input
                                    type="date"
                                    id="lead-date-picker"
                                    name="lead_date"
                                    value={formData.lead_date}
                                    onChange={handleInputChange}
                                    required
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        opacity: 0,
                                        cursor: 'pointer',
                                        pointerEvents: 'none'
                                    }}
                                />
                                <Calendar
                                    size={16}
                                    style={{
                                        position: 'absolute',
                                        right: '10px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--text-secondary)',
                                        pointerEvents: 'none'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Customer Name */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                Customer Name <span style={{ color: 'var(--theme-primary)' }}>*</span>
                            </label>
                            <input
                                type="text"
                                name="customer_name"
                                value={formData.customer_name}
                                onChange={handleInputChange}
                                placeholder="Customer Name"
                                className="ae-input"
                                style={{
                                    width: '100%',
                                    height: '34px'
                                }}
                                required
                            />
                        </div>

                        {/* Project Name */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                Project Name <span style={{ color: 'var(--theme-primary)' }}>*</span>
                            </label>
                            <input
                                type="text"
                                name="project_name"
                                value={formData.project_name}
                                onChange={handleInputChange}
                                placeholder="Project Name"
                                className="ae-input"
                                style={{
                                    width: '100%',
                                    height: '34px'
                                }}
                                required
                            />
                        </div>

                        {/* Sales Person */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                Sales Person
                            </label>
                            <input
                                type="text"
                                name="sales_person"
                                value={formData.sales_person}
                                onChange={handleInputChange}
                                placeholder="Sales Person"
                                className="ae-input"
                                style={{
                                    width: '100%',
                                    height: '34px'
                                }}
                            />
                        </div>

                        {/* Project Manager */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                Project Manager
                            </label>
                            <input
                                type="text"
                                name="project_manager"
                                value={formData.project_manager}
                                onChange={handleInputChange}
                                placeholder="Project Manager"
                                className="ae-input"
                                style={{
                                    width: '100%',
                                    height: '34px'
                                }}
                            />
                        </div>

                        {/* Email Address */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                Email Address
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="Email Address"
                                className="ae-input"
                                style={{
                                    width: '100%',
                                    height: '34px'
                                }}
                            />
                        </div>
                    </div>

                    {/* Lead ID Generation Banner */}
                    <div style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: '8px',
                        padding: '12px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px'
                    }}>
                        <div style={{
                            background: '#EBF4FF',
                            padding: '8px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Building2 size={18} style={{ color: 'var(--ae-blue)' }} />
                        </div>
                        <div>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 2px 0' }}>Lead ID Generation</h4>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                                Automatic generation: <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{formData.company === 'AE IND' ? 'AEINDLDXXXX' : 'AEUSALDXXXX'}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                    <div style={{
                        display: 'flex',
                        background: 'white',
                        padding: '4px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-primary)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                    }}>
                        {/* Create Lead — first (orange unless cancel is active) */}
                        <button
                            type="submit"
                            disabled={saving}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 16px',
                                height: '32px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: isCancelActive ? 'transparent' : 'var(--theme-primary)',
                                color: isCancelActive ? 'var(--text-secondary)' : 'white',
                                boxShadow: isCancelActive ? 'none' : '0 2px 8px rgba(187, 77, 0, 0.3)'
                            }}
                        >
                            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            <span>{id ? 'Update Lead' : 'Save Lead'}</span>
                        </button>

                        {/* Cancel — second (orange when active) */}
                        <button
                            type="button"
                            onClick={() => {
                                setIsCancelActive(true);
                                showConfirm({
                                    title: 'Are you sure you want to exit?',
                                    onConfirm: () => onBack(),
                                    onCancel: () => setIsCancelActive(false)
                                });
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 16px',
                                height: '32px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: isCancelActive ? 'var(--theme-primary)' : 'transparent',
                                color: isCancelActive ? 'white' : 'var(--text-secondary)',
                                boxShadow: isCancelActive ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                            }}
                            onMouseEnter={(e) => {
                                if (!isCancelActive) {
                                    e.currentTarget.style.background = 'rgba(255, 107, 0, 0.05)';
                                    e.currentTarget.style.color = 'var(--ae-orange)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isCancelActive) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                }
                            }}
                        >
                            <span style={{ fontSize: '16px', lineHeight: '16px', fontWeight: 700 }}>×</span>
                            <span>Cancel</span>
                        </button>
                    </div>
                </div>
            </form>


        </div>
    );
};

export default LeadForm;
