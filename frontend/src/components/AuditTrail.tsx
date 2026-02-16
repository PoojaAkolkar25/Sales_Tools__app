
import React, { useEffect, useState } from 'react';
import { History, X } from 'lucide-react';
import api from '../api';

interface AuditLog {
    id: number;
    username: string;
    field_name: string;
    old_value: string;
    new_value: string;
    action_type: 'CREATE' | 'UPDATE' | 'DELETE';
    timestamp: string;
}

interface AuditTrailProps {
    model: string;
    modelId: number | null;
    show: boolean;
    onClose: () => void;
}

const AuditTrail: React.FC<AuditTrailProps> = ({ model, modelId, show, onClose }) => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (modelId && show) {
            fetchLogs();
        }
    }, [modelId, show, model]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            // Updated endpoint query params
            const response = await api.get(`/audit-trail/?model_name=${model}&object_id=${modelId}`);
            setLogs(response.data);
        } catch (error) {
            console.error("Error fetching audit logs", error);
        } finally {
            setLoading(false);
        }
    };

    if (!show) return null;

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const getFieldLabel = (field: string) => {
        return field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '400px',
            background: 'white',
            boxShadow: '-4px 0 15px rgba(0,0,0,0.1)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            transition: 'transform 0.3s ease-in-out',
            transform: show ? 'translateX(0)' : 'translateX(100%)'
        }}>
            <div style={{
                padding: '20px',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-secondary)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <History size={20} style={{ color: 'var(--theme-primary)' }} />
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>History</h3>
                </div>
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                    <X size={20} color="var(--text-tertiary)" />
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#718096' }}>Loading history...</div>
                ) : logs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#718096', fontStyle: 'italic' }}>No history available</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {logs.map((log) => (
                            <div key={log.id} style={{
                                display: 'flex',
                                gap: '12px',
                                paddingBottom: '16px',
                                borderBottom: '1px solid #EDF2F7'
                            }}>
                                <div style={{
                                    minWidth: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: log.action_type === 'CREATE' ? '#C6F6D5' : '#bee3f8',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: log.action_type === 'CREATE' ? '#22543d' : '#2C5282'
                                }}>
                                    {log.action_type === 'CREATE' ? <div style={{ fontWeight: 900, fontSize: '14px' }}>+</div> : <div style={{ fontWeight: 900, fontSize: '14px' }}>✎</div>}
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{log.username || 'System'}</span>
                                        <span style={{ fontSize: '0.75rem' }}>{formatDate(log.timestamp)}</span>
                                    </div>

                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                                        {log.action_type === 'CREATE' ? 'Created' : `Updated ${getFieldLabel(log.field_name)}`}
                                    </div>

                                    {log.action_type === 'UPDATE' && (
                                        <div style={{ background: 'var(--bg-secondary)', padding: '8px', borderRadius: '6px', fontSize: '0.85rem' }}>
                                            <div style={{ color: '#E53E3E', textDecoration: 'line-through', marginBottom: '2px', opacity: 0.7 }}>
                                                {log.old_value || '(empty)'}
                                            </div>
                                            <div style={{ color: '#38A169', fontWeight: 600 }}>
                                                {log.new_value || '(empty)'}
                                            </div>
                                        </div>
                                    )}

                                    {log.action_type === 'CREATE' && (
                                        <div style={{ fontSize: '0.85rem', color: '#4A5568' }}>
                                            {log.new_value}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuditTrail;
