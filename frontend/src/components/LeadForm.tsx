import React, { useState, useEffect } from 'react';
import {
    ArrowLeft,
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
        <>
            <div style={{
                background: 'white',
                border: '1px solid #E0E6ED',
                borderRadius: '12px',
                width: '100%',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                margin: '20px auto 20px auto',
                maxHeight: '65vh',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                padding: '20px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                    <span style={{
                        width: '3px',
                        height: '14px',
                        background: '#0066CC',
                        borderRadius: '2px'
                    }}></span>
                    <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FF6B00', margin: 0 }}>
                        {id ? 'Edit Lead Information' : 'Create New Lead'}
                    </h2>
                </div>

                <form id="lead-form" onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                        {/* Company Name */}
                        <div className="ae-input-group">
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                Company Name <span style={{ color: '#FF6B00' }}>*</span>
                            </label>
                            <select
                                name="company"
                                value={formData.company}
                                onChange={handleInputChange}
                                style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    background: 'white',
                                    border: '1px solid #E2E8F0',
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
                        <div className="ae-input-group">
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                Lead Date <span style={{ color: '#FF6B00' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Calendar size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#A0AEC0', pointerEvents: 'none' }} />
                                <input
                                    type="date"
                                    name="lead_date"
                                    value={formData.lead_date}
                                    onChange={handleInputChange}
                                    style={{
                                        width: '100%',
                                        padding: '6px 10px',
                                        background: 'white',
                                        border: '1px solid #E2E8F0',
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
                        </div>

                        {/* Customer Name */}
                        <div className="ae-input-group">
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                Customer Name <span style={{ color: '#FF6B00' }}>*</span>
                            </label>
                            <input
                                name="customer_name"
                                value={formData.customer_name}
                                onChange={handleInputChange}
                                placeholder="Enter customer name"
                                style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    background: 'white',
                                    border: '1px solid #E2E8F0',
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
                        <div className="ae-input-group">
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                Project Name <span style={{ color: '#FF6B00' }}>*</span>
                            </label>
                            <input
                                name="project_name"
                                value={formData.project_name}
                                onChange={handleInputChange}
                                placeholder="Enter project name"
                                style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    background: 'white',
                                    border: '1px solid #E2E8F0',
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
                        <div className="ae-input-group">
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                Sales Person
                            </label>
                            <input
                                name="sales_person"
                                value={formData.sales_person}
                                onChange={handleInputChange}
                                placeholder="Name of salesperson"
                                style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    background: 'white',
                                    border: '1px solid #E2E8F0',
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
                        <div className="ae-input-group">
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
                                Project Manager
                            </label>
                            <input
                                name="project_manager"
                                value={formData.project_manager}
                                onChange={handleInputChange}
                                placeholder="Name of project manager"
                                style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    background: 'white',
                                    border: '1px solid #E2E8F0',
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
                        <div className="ae-input-group">
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black', display: 'block', marginBottom: '2px' }}>
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
                                    padding: '6px 10px',
                                    background: 'white',
                                    border: '1px solid #E2E8F0',
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
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
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
                            <Building2 size={18} color="#0066CC" />
                        </div>
                        <div>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#2D3748', margin: '0 0 2px 0' }}>Lead ID Generation</h4>
                            <p style={{ fontSize: '0.75rem', color: '#718096', margin: 0 }}>
                                Automatic generation: <span style={{ fontWeight: 800, color: '#2D3748' }}>{formData.company === 'AE IND' ? 'AEINDLDXXXX' : 'AEUSALDXXXX'}</span>
                            </p>
                        </div>
                    </div>
                </form>
            </div>

            {/* Footer Actions */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'white',
                padding: '6px',
                borderRadius: '12px',
                border: '1px solid #E0E6ED',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                margin: '0 0 20px 0',
                width: 'fit-content',
                flexShrink: 0,
                zIndex: 10
            }}>
                <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="ae-btn-primary"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 16px',
                        borderRadius: '8px',
                        fontSize: '0.85rem'
                    }}
                >
                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    <span style={{ fontWeight: 800 }}>{id ? 'Update Lead' : 'Create Lead'}</span>
                </button>

                <button
                    onClick={() => setShowCancelModal(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 16px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        background: 'transparent',
                        color: '#718096',
                        border: 'none',
                        fontWeight: 700,
                        cursor: 'pointer'
                    }}
                >
                    <span style={{ fontSize: '18px', lineHeight: '10px' }}>×</span>
                    <span>Cancel</span>
                </button>
            </div>

            {/* Cancel Confirmation Modal */}
            {showCancelModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.4)',
                    backdropFilter: 'blur(2px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        background: 'white',
                        width: '100%',
                        maxWidth: '450px',
                        borderRadius: '12px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
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
                                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', fontWeight: 800, color: '#1a1f36' }}>
                                        Leave this page?
                                    </h3>
                                    <p style={{ margin: 0, color: '#4A5568', fontSize: '0.95rem', lineHeight: 1.5 }}>
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
                                        background: '#3B82F6',
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
                                        color: '#1a1f36',
                                        border: '1px solid #E2E8F0',
                                        fontSize: '0.9rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        height: '40px'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#F7FAFC'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                >
                                    Leave & Discard Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default LeadForm;
