import React, { useState, useEffect } from 'react';
import {
    Save,
    Loader2,
    Calendar,
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
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
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
                <Loader2 className="animate-spin" style={{ color: 'var(--ae-blue)' }} size={48} />
            </div>
        );
    }

    return (
        <div className="space-y-6" style={{ padding: '4px' }}>
            <form id="lead-form" onSubmit={handleSubmit} className="space-y-6">
                <div style={{
                    background: 'white',
                    border: '1px solid #E0E6ED',
                    borderRadius: '12px',
                    width: '100%',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                        {/* Company Name */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                Company Name <span style={{ color: 'var(--theme-primary)' }}>*</span>
                            </label>
                            <select
                                name="company"
                                value={formData.company}
                                onChange={handleInputChange}
                                style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    background: 'white',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: '6px',
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    color: '#1a1f36',
                                    outline: 'none',
                                    height: '34px'
                                }}
                                required
                            >
                                <option value="AE IND">AE IND</option>
                                <option value="AE USA">AE USA</option>
                            </select>
                            <p style={{ fontSize: '0.65rem', color: '#A0AEC0', marginTop: '4px', fontWeight: 500 }}>INDLD or USALD suffix</p>
                        </div>

                        {/* Lead Date */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                Lead Date <span style={{ color: 'var(--theme-primary)' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="date"
                                    name="lead_date"
                                    value={formData.lead_date}
                                    onChange={handleInputChange}
                                    style={{
                                        width: '100%',
                                        padding: '6px 10px',
                                        background: 'white',
                                        border: '1px solid var(--border-primary)',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem',
                                        fontWeight: 500,
                                        color: '#1a1f36',
                                        outline: 'none',
                                        height: '34px'
                                    }}
                                    required
                                />
                                <Calendar
                                    size={16}
                                    style={{
                                        position: 'absolute',
                                        right: '10px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: '#718096',
                                        pointerEvents: 'none',
                                        background: 'white'
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
                                style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    background: 'white',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: '6px',
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    color: '#1a1f36',
                                    outline: 'none',
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
                                style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    background: 'white',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: '6px',
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    color: '#1a1f36',
                                    outline: 'none',
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
                                style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    background: 'white',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: '6px',
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    color: '#1a1f36',
                                    outline: 'none',
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
                                style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    background: 'white',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: '6px',
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    color: '#1a1f36',
                                    outline: 'none',
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
                                style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    background: 'white',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: '6px',
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    color: '#1a1f36',
                                    outline: 'none',
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
                        gap: '2px',
                        alignItems: 'center',
                        background: 'white',
                        padding: '6px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-primary)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                    }}>
                        <button
                            type="submit"
                            disabled={saving}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 16px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                background: (!hoveredBtn || hoveredBtn === 'save') && !showCancelModal ? 'var(--theme-primary)' : 'transparent',
                                color: showCancelModal ? '#CBD5E0' : ((!hoveredBtn || hoveredBtn === 'save') ? 'white' : 'var(--text-secondary)'),
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontWeight: 800,
                                boxShadow: (!hoveredBtn || hoveredBtn === 'save') && !showCancelModal ? '0 4px 12px rgba(187, 77, 0, 0.2)' : 'none'
                            }}
                            onMouseEnter={() => setHoveredBtn('save')}
                            onMouseLeave={() => setHoveredBtn(null)}
                        >
                            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            <span>{id ? 'Update Lead' : 'Create Lead'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowCancelModal(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 16px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                background: showCancelModal || hoveredBtn === 'cancel' ? 'var(--theme-primary)' : 'transparent',
                                color: showCancelModal || hoveredBtn === 'cancel' ? 'white' : 'var(--text-secondary)',
                                border: 'none',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: showCancelModal || hoveredBtn === 'cancel' ? '0 4px 12px rgba(187, 77, 0, 0.2)' : 'none'
                            }}
                            onMouseEnter={() => setHoveredBtn('cancel')}
                            onMouseLeave={() => setHoveredBtn(null)}
                        >
                            <span style={{ fontSize: '18px', lineHeight: '10px' }}>×</span>
                            <span>Cancel</span>
                        </button>
                    </div>
                </div>
            </form>

            {/* Cancel Confirmation Modal */}
            {
                showCancelModal && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(255, 255, 255, 0.4)',
                        backdropFilter: 'blur(1px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        <div style={{
                            background: 'white',
                            width: '100%',
                            maxWidth: '500px',
                            borderRadius: '12px',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            border: '1px solid #E2E8F0',
                            overflow: 'hidden',
                            animation: 'modalScale 0.2s ease-out'
                        }}>
                            <div style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: '#FFF5F5',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 9V11M12 15H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0378 2.66667 10.268 4L3.33978 16C2.56998 17.3333 3.53223 19 5.07183 19Z" stroke="#E53E3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                            Leave this page?
                                        </h3>
                                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                                            If you leave, your unsaved changes will be discarded.
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '32px' }}>
                                    <button
                                        onClick={() => setShowCancelModal(false)}
                                        style={{
                                            flex: 1,
                                            padding: '10px 16px',
                                            borderRadius: '8px',
                                            background: 'var(--theme-primary)',
                                            color: 'white',
                                            border: 'none',
                                            fontSize: '0.9rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            height: '40px'
                                        }}
                                    >
                                        Stay Here
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowCancelModal(false);
                                            onBack();
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: '10px 16px',
                                            borderRadius: '8px',
                                            background: 'white',
                                            color: 'var(--text-primary)',
                                            border: '1px solid var(--border-primary)',
                                            fontSize: '0.9rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            height: '40px'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                    >
                                        Leave & Discard Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
};

export default LeadForm;
