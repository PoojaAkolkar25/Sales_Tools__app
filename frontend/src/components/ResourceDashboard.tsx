import React, { useState, useEffect } from 'react';
import {
    PlusCircle,
    Server,
    ArrowRight
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';

interface ResourceDashboardProps {
    onView: (id: number) => void;
    onCreate: () => void;
}

const ResourceDashboard: React.FC<ResourceDashboardProps> = ({ onView, onCreate }) => {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { showNotification } = useNotification();

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const response = await api.get('/inventory/requests/');
            setRequests(response.data);
        } catch (error) {
            showNotification('Error fetching resource requests', 'error');
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'DRAFT':
                return { bg: 'rgba(74, 85, 104, 0.1)', color: '#4A5568', label: 'Draft' };
            case 'SUBMITTED':
                return { bg: 'rgba(0, 102, 204, 0.1)', color: '#0066CC', label: 'Submitted' };
            case 'PENDING_IT':
                return { bg: 'rgba(255, 107, 0, 0.1)', color: '#FF6B00', label: 'Pending IT Head' };
            case 'PENDING_FINANCE':
                return { bg: 'rgba(155, 81, 224, 0.1)', color: '#9B51E0', label: 'Pending Finance Head' };
            case 'APPROVED':
                return { bg: 'rgba(0, 200, 83, 0.1)', color: '#00C853', label: 'Approved' };
            case 'ISSUED':
                return { bg: 'rgba(0, 102, 204, 0.1)', color: '#0066CC', label: 'Issued' };
            case 'REJECTED':
                return { bg: 'rgba(229, 62, 62, 0.1)', color: '#E53E3E', label: 'Rejected' };
            default:
                return { bg: '#F7FAFC', color: '#718096', label: status };
        }
    };

    const filteredRequests = requests;

    return (
        <div className="space-y-6">
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '24px'
            }}>
                <div style={{
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'center',
                    background: 'white',
                    padding: '6px',
                    borderRadius: '12px',
                    border: '1px solid #E0E6ED',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                }}>
                    <button
                        onClick={onCreate}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 20px',
                            borderRadius: '8px',
                            background: '#FF6B00',
                            color: 'white',
                            border: 'none',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(255, 107, 0, 0.2)'
                        }}
                    >
                        <PlusCircle size={18} /> Raise Resource Request
                    </button>
                </div>
            </div>

            <div className="section-panel !p-0 overflow-hidden">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#F8FAFC' }}>
                            <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Form Number</th>
                            <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Project</th>
                            <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Requestor</th>
                            <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resource Type</th>
                            <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                            <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '0.7rem', fontWeight: 900, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#718096', fontWeight: 600 }}>Loading requests...</td>
                            </tr>
                        ) : filteredRequests.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#718096', fontWeight: 600 }}>No resource requests found.</td>
                            </tr>
                        ) : (
                            filteredRequests.map((req) => {
                                const status = getStatusStyle(req.status);
                                return (
                                    <tr key={req.id} className="hover:bg-[#F7FAFC] transition-colors border-t border-[#E0E6ED]">
                                        <td style={{ padding: '16px 24px' }}>
                                            <span style={{ fontWeight: 800, color: '#0066CC', fontSize: '0.85rem' }}>{req.form_number}</span>
                                            <div style={{ fontSize: '0.65rem', color: '#718096', marginTop: '2px' }}>{new Date(req.request_date).toLocaleDateString()}</div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <span style={{ fontWeight: 700, color: '#1a1f36', fontSize: '0.85rem' }}>{req.project_name}</span>
                                            <div style={{ fontSize: '0.65rem', color: '#718096' }}>{req.environment}</div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <span style={{ fontWeight: 600, color: '#4A5568', fontSize: '0.8rem' }}>{req.requestor_detail?.full_name}</span>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Server size={14} className="text-[#FF6B00]" />
                                                <span style={{ fontWeight: 600, color: '#4A5568', fontSize: '0.8rem' }}>{req.server_type} ({req.server_category})</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <span style={{
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                fontSize: '10px',
                                                fontWeight: 900,
                                                textTransform: 'uppercase',
                                                background: status.bg,
                                                color: status.color,
                                                border: `1px solid ${status.color}20`
                                            }}>
                                                {status.label}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                            <button
                                                onClick={() => onView(req.id)}
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '6px',
                                                    background: '#F7FAFC',
                                                    color: '#4A5568',
                                                    border: '1px solid #E0E6ED',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                Details <ArrowRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ResourceDashboard;
