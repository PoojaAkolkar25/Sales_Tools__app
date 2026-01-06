import React, { useState, useEffect } from 'react';
import { Building2, Plus, RefreshCw, Trash2, ShieldCheck } from 'lucide-react';
import api from '../api';

const BankConnectionSetup: React.FC = () => {
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
                alert('Bank connection updated successfully');
            } else {
                await api.post('/finance/bank-connections/', formData);
                alert('Bank connection added successfully');
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

    // ... (rest of code) ...

    <button
        onClick={() => handleReconnect(conn)}
        className="ae-btn-secondary"
        style={{ fontSize: '11px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
    >
        <RefreshCw size={12} /> Reconnect
    </button>

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this connection?')) return;
        try {
            await api.delete(`/finance/bank-connections/${id}/`);
            fetchConnections();
        } catch (error) {
            console.error('Error deleting bank connection', error);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1a1f36', margin: 0 }}>Bank Account Connections</h2>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="ae-btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Plus size={18} /> {showForm ? 'Cancel' : 'Connect New Bank'}
                </button>
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
