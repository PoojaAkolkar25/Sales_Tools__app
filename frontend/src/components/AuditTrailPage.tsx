import React, { useEffect, useState } from 'react';
import { History, User, Clock, Filter, Search, ChevronDown, ArrowRight } from 'lucide-react';
import api from '../api';

interface AuditLog {
    id: number;
    username: string;
    model_name: string;
    model_display_name: string;
    object_display: string;
    field_name: string;
    old_value: string;
    new_value: string;
    action_type: 'CREATE' | 'UPDATE' | 'DELETE';
    timestamp: string;
    object_id: number;
}

const MODULES = [
    { id: 'all', label: 'All' },
    { id: 'lead', label: 'Lead' },
    { id: 'deal', label: 'Deal' },
    { id: 'costsheet', label: 'Cost Sheet' },
    { id: 'estimate', label: 'Estimates' },
    { id: 'salesorder', label: 'Sales Order' },
    { id: 'milestone', label: 'Milestone' },
    { id: 'invoice', label: 'Invoice' },
    { id: 'receiptvoucher', label: 'Receipt Voucher' },
    { id: 'customer', label: 'Customer' },
    { id: 'endcustomer', label: 'End Customer' },
];

const AuditTrailPage: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterModule, setFilterModule] = useState<string>('all');
    const [filterAction, setFilterAction] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        fetchAllLogs();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [logs, searchTerm, filterModule, filterAction]);

    const fetchAllLogs = async () => {
        setLoading(true);
        try {
            const response = await api.get('/audit-trail/');
            setLogs(response.data);
        } catch (error) {
            console.error("Error fetching all audit logs", error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...logs];

        if (searchTerm) {
            filtered = filtered.filter(log =>
                (log.username?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (log.model_display_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (log.object_display?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (log.field_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
            );
        }

        if (filterModule !== 'all') {
            filtered = filtered.filter(log => log.model_name && log.model_name.replace(/\s+/g, '').toLowerCase() === filterModule.toLowerCase());
        }

        if (filterAction !== 'all') {
            filtered = filtered.filter(log => log.action_type === filterAction);
        }

        setFilteredLogs(filtered);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const getActionIcon = (actionType: string) => {
        switch (actionType) {
            case 'CREATE':
                return <span style={{ color: '#10B981', fontWeight: 'bold', fontSize: '16px' }}>+</span>;
            case 'UPDATE':
                return <span style={{ color: '#3B82F6', fontWeight: 'bold', fontSize: '16px' }}>✎</span>;
            case 'DELETE':
                return <span style={{ color: '#EF4444', fontWeight: 'bold', fontSize: '16px' }}>×</span>;
            default:
                return null;
        }
    };

    const getModuleBadgeColor = (modelName: string) => {
        if (!modelName) return '#6B7280';
        const normalized = modelName.replace(/\s+/g, '').toLowerCase();
        const colorMap: { [key: string]: string } = {
            'deal': '#3B82F6',
            'lead': '#8B5CF6',
            'estimate': '#EC4899',
            'costsheet': '#F59E0B',
            'salesorder': '#10B981',
            'milestone': '#06B6D4',
            'invoice': '#14B8A6',
            'receiptvoucher': '#6366F1',
            'customer': '#84CC16',
            'endcustomer': '#A855F7',
        };
        return colorMap[normalized] || '#6B7280';
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: 'white',
            borderRadius: '16px',
            border: '1px solid var(--border-primary)',
            overflow: 'hidden',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
        }}>
            {/* Header */}
            <div style={{
                padding: '24px',
                borderBottom: '1px solid var(--border-primary)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <History size={24} color="var(--theme-primary)" />
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Audit Trail Repository</h2>
                    </div>
                </div>

                {/* Search Bar */}
                <div style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                    <input
                        type="text"
                        placeholder="Search by user, module, record..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 12px 10px 40px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-primary)',
                            background: 'white',
                            color: 'var(--text-primary)',
                            fontSize: '14px',
                            outline: 'none',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                    />
                </div>
            </div>

            {/* Module Selection Bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-primary)',
                flexWrap: 'wrap',
                gap: '12px',
                background: 'var(--bg-primary)',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
            }}>
                {MODULES.map(module => (
                    <button
                        key={module.id}
                        onClick={() => setFilterModule(filterModule === module.id ? 'all' : module.id)}
                        style={{
                            whiteSpace: 'nowrap',
                            padding: '6px 14px',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: filterModule === module.id ? getModuleBadgeColor(module.id) : 'white',
                            color: filterModule === module.id ? 'white' : '#4B5563',
                            border: `1px solid ${filterModule === module.id ? getModuleBadgeColor(module.id) : '#E5E7EB'}`,
                            boxShadow: filterModule === module.id ? `0 4px 10px ${getModuleBadgeColor(module.id)}40` : 'none'
                        }}
                    >
                        {module.label}
                    </button>
                ))}
            </div>

            {/* Filters Dropdown Trigger */}
            <div style={{ padding: '8px 24px', borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-primary)' }}>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    <Filter size={16} />
                    <span>Action Filter</span>
                    <ChevronDown size={14} style={{ transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                </button>

                {showFilters && (
                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                        <div style={{ flex: 1, maxWidth: '300px' }}>
                            <select
                                value={filterAction}
                                onChange={(e) => setFilterAction(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '6px',
                                    border: '1px solid #D1D5DB',
                                    fontSize: '13px',
                                    background: 'white'
                                }}
                            >
                                <option value="all">All Actions</option>
                                <option value="CREATE">Create</option>
                                <option value="UPDATE">Update</option>
                                <option value="DELETE">Delete</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Logs List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#F9FAFB' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#9CA3AF' }}>
                        <div>Loading audit logs...</div>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px', color: '#9CA3AF' }}>
                        <History size={64} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                        <p style={{ margin: 0, fontSize: '16px' }}>
                            {logs.length === 0 ? 'No audit logs found' : 'No logs match your filters'}
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1000px', margin: '0 auto' }}>
                        {filteredLogs.map((log) => {
                            const modColor = getModuleBadgeColor(log.model_name);
                            return (
                                <div
                                    key={log.id}
                                    style={{
                                        padding: '20px',
                                        background: 'white',
                                        borderRadius: '16px',
                                        border: '1px solid var(--border-primary)',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.06)';
                                        e.currentTarget.style.borderColor = modColor + '40';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.boxShadow = 'none';
                                        e.currentTarget.style.borderColor = '#E5E7EB';
                                    }}
                                >
                                    {/* Header Row */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '12px',
                                            background: modColor,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontSize: '18px',
                                            fontWeight: 700,
                                            boxShadow: `0 4px 10px ${modColor}30`
                                        }}>
                                            {getActionIcon(log.action_type)}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                                <button
                                                    onClick={() => log.model_name && setFilterModule(log.model_name.replace(/\s+/g, '').toLowerCase())}
                                                    style={{
                                                        fontSize: '12px',
                                                        fontWeight: 800,
                                                        color: modColor,
                                                        padding: '4px 10px',
                                                        background: modColor + '15',
                                                        borderRadius: '6px',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        textTransform: 'uppercase'
                                                    }}
                                                >
                                                    {log.model_display_name}
                                                </button>
                                                <span style={{ fontSize: '15px', color: '#1F2937', fontWeight: 800 }}>
                                                    {log.object_display}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <User size={14} />
                                                    <span style={{ fontWeight: 600 }}>{log.username}</span>
                                                </div>
                                                <span>•</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Clock size={14} />
                                                    <span>{formatDate(log.timestamp)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Change Details */}
                                    {log.action_type === 'UPDATE' && log.field_name && (
                                        <div style={{
                                            padding: '16px',
                                            background: '#F9FAFB',
                                            borderRadius: '12px',
                                            border: '1px solid #EDF2F7'
                                        }}>
                                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#A0AEC0', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                {log.field_name.replace(/_/g, ' ')}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                                <span style={{
                                                    padding: '6px 12px',
                                                    background: '#FED7D7',
                                                    color: '#C53030',
                                                    borderRadius: '8px',
                                                    fontSize: '13px',
                                                    textDecoration: 'line-through',
                                                    opacity: 0.8
                                                }}>
                                                    {log.old_value || '(empty)'}
                                                </span>
                                                <ArrowRight size={16} color="#CBD5E0" />
                                                <span style={{
                                                    padding: '6px 12px',
                                                    background: '#C6F6D5',
                                                    color: '#22543D',
                                                    borderRadius: '8px',
                                                    fontSize: '13px',
                                                    fontWeight: 700
                                                }}>
                                                    {log.new_value || '(empty)'}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {log.action_type === 'CREATE' && (
                                        <div style={{
                                            padding: '10px 16px',
                                            background: '#F0FFF4',
                                            borderRadius: '10px',
                                            fontSize: '13px',
                                            color: '#2F855A',
                                            fontWeight: 700,
                                            border: '1px solid #C6F6D5'
                                        }}>
                                            New record established
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer Stats */}
            <div style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--border-primary)',
                background: 'var(--bg-primary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: 600 }}>
                    Showing {filteredLogs.length} logs
                </span>
                {(filterModule !== 'all' || filterAction !== 'all' || searchTerm) && (
                    <button
                        onClick={() => {
                            setFilterModule('all');
                            setFilterAction('all');
                            setSearchTerm('');
                        }}
                        style={{
                            padding: '8px 16px',
                            background: 'var(--theme-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        Clear All
                    </button>
                )}
            </div>
        </div>
    );
};

export default AuditTrailPage;
