import React, { useState, useEffect } from 'react';
import { Building2, Plus, RefreshCw, Trash2, ShieldCheck } from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';

const BankConnectionSetup: React.FC = () => {
    const { showNotification, showConfirm } = useNotification();
    const [connections, setConnections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        bank_name: '',
        account_number: '',
        api_key: '',
        client_id: '',
        secret_key: ''
    });

    useEffect(() => {
        fetchConnections();
    }, []);

    const fetchConnections = async () => {
        try {
            const response = await api.get('/finance/bank-connections/');
            setConnections(response.data);
        } catch (error) {
            console.error('Error fetching bank connections', error);
        } finally {
            setLoading(false);
        }
    };

    const [editingId, setEditingId] = useState<number | null>(null);

    const handleReconnect = (conn: any) => {
        setFormData({
            bank_name: conn.bank_name,
            account_number: conn.account_number,
            api_key: conn.api_key || '',
            client_id: conn.client_id || '',
            secret_key: '' // Don't show existing secret
        });
        setEditingId(conn.id);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.patch(`/finance/bank-connections/${editingId}/`, formData);
                showNotification('Bank connection updated successfully', 'success');
            } else {
                await api.post('/finance/bank-connections/', formData);
                showNotification('Bank connection added successfully', 'success');
            }
            setShowForm(false);
            setEditingId(null);
            setFormData({
                bank_name: '',
                account_number: '',
                api_key: '',
                client_id: '',
                secret_key: ''
            });
            fetchConnections();
        } catch (error) {
            console.error('Error saving bank connection', error);
        }
    };


    const handleDelete = async (id: number) => {
        showConfirm({
            title: 'Delete Connection',
            message: 'Are you sure you want to delete this bank connection? This action cannot be undone.',
            onConfirm: async () => {
                try {
                    await api.delete(`/finance/bank-connections/${id}/`);
                    fetchConnections();
                    showNotification('Bank connection deleted successfully', 'success');
                } catch (error) {
                    console.error('Error deleting bank connection', error);
                    showNotification('Error deleting bank connection', 'error');
                }
            }
        });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '4px', height: '18px', background: '#FF6B00', borderRadius: '2px' }}></div>
                    <h1 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1a1f36', margin: 0 }}>
                        Bank Account Connections
                    </h1>
                </div>

                <div style={{
                    display: 'flex',
                    gap: '4px',
                    background: 'white',
                    padding: '6px',
                    borderRadius: '12px',
                    border: '1px solid #E0E6ED',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                }}>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: '#F7FAFC',
                            color: '#4A5568'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#FF6B00';
                            e.currentTarget.style.color = 'white';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 0, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#F7FAFC';
                            e.currentTarget.style.color = '#4A5568';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        <Plus size={18} /> {showForm ? 'Cancel' : 'Connect New Bank'}
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="glass-card" style={{ padding: '32px' }}>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                            <div className="ae-input-group">
                                <label className="ae-label">Bank Name</label>
                                <input
                                    className="ae-input"
                                    placeholder="e.g. ICICI Bank, Bank of America"
                                    required
                                    value={formData.bank_name}
                                    onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                                />
                            </div>
                            <div className="ae-input-group">
                                <label className="ae-label">Account Number</label>
                                <input
                                    className="ae-input"
                                    placeholder="Enter account number"
                                    required
                                    value={formData.account_number}
                                    onChange={e => setFormData({ ...formData, account_number: e.target.value })}
                                />
                            </div>
                            <div className="ae-input-group">
                                <label className="ae-label">API Key / Client ID</label>
                                <input
                                    className="ae-input"
                                    placeholder="Enter API Key"
                                    value={formData.api_key}
                                    onChange={e => setFormData({ ...formData, api_key: e.target.value })}
                                />
                            </div>
                            <div className="ae-input-group">
                                <label className="ae-label">Secret Key / Token</label>
                                <input
                                    type="password"
                                    className="ae-input"
                                    placeholder="••••••••••••"
                                    value={formData.secret_key}
                                    onChange={e => setFormData({ ...formData, secret_key: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="submit" className="ae-btn-primary">Verify and Save Connection</button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                {loading ? (
                    <div>Loading...</div>
                ) : connections.length === 0 ? (
                    <div className="glass-card" style={{ padding: '60px', gridColumn: '1 / -1', textAlign: 'center' }}>
                        <Building2 size={48} color="#CBD5E0" style={{ margin: '0 auto 16px' }} />
                        <p style={{ color: '#718096', fontWeight: 600 }}>No bank accounts connected yet.</p>
                    </div>
                ) : (
                    connections.map(conn => (
                        <div key={conn.id} className="glass-card" style={{ padding: '24px', position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '12px', background: '#F7FAFC',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E2E8F0'
                                }}>
                                    <Building2 size={24} color="#4A5568" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1a1f36' }}>{conn.bank_name}</h3>
                                    <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#718096', fontFamily: 'monospace' }}>
                                        Acc: ****{conn.account_number.slice(-4)}
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00C853' }}></div>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00C853', textTransform: 'uppercase' }}>Connected</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(conn.id)}
                                    style={{ background: 'none', border: 'none', color: '#CBD5E0', cursor: 'pointer', transition: 'color 0.2s' }}
                                    onMouseOver={e => (e.currentTarget.style.color = '#E53E3E')}
                                    onMouseOut={e => (e.currentTarget.style.color = '#CBD5E0')}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div style={{
                                marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #F1F5F9',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <button
                                    onClick={() => handleReconnect(conn)}
                                    className="ae-btn-secondary"
                                    style={{ fontSize: '11px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <RefreshCw size={12} /> Reconnect
                                </button>
                                <div style={{ color: '#CBD5E0' }}>
                                    <ShieldCheck size={20} />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default BankConnectionSetup;
