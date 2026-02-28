import React, { useState, useEffect, useRef } from 'react';
import {
    Users,
    TrendingUp,
    Briefcase,
    CheckCircle2,
    Search,
    ArrowUpRight,
    MapPin,
    Phone,
    Mail,
    Building2,
    Columns,
    ChevronDown,
    Check
} from 'lucide-react';
import api from '../api';

const CustomerDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        totalCustomers: 0,
        activeCustomers: 0,
        totalDeals: 0,
        conversionRate: 0
    });

    const ALL_COL_CONFIG = [
        { key: 'customer', label: 'Customer', shortLabel: 'CUST.' },
        { key: 'contact', label: 'Contact Details', shortLabel: 'CONT.' },
        { key: 'type', label: 'Type', shortLabel: 'TYPE' },
        { key: 'status', label: 'Status', shortLabel: 'ST.' }
    ];

    const SHORT_COL_WIDTHS: Record<string, number> = {
        customer: 50,
        contact: 50,
        type: 40,
        status: 35,
        actions: 60
    };

    const FULL_LABEL_WIDTHS: Record<string, number> = {
        customer: 120,
        contact: 110,
        type: 80,
        status: 75
    };

    const MAX_COL_WIDTHS: Record<string, number> = {
        customer: 250,
        contact: 250,
        type: 120,
        status: 120,
        actions: 120
    };

    const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
        const saved = localStorage.getItem('customerDashboard_colWidths');
        if (saved) return JSON.parse(saved);
        const defaults: Record<string, number> = {};
        ALL_COL_CONFIG.forEach(c => { defaults[c.key] = FULL_LABEL_WIDTHS[c.key] || 150; });
        return defaults;
    });

    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem('customerDashboard_visibleColumns');
        return saved ? JSON.parse(saved) : ALL_COL_CONFIG.map(c => c.key);
    });

    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const resizingRef = useRef<{ colKey: string; startWidth: number; startX: number } | null>(null);

    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        name: '',
        email: '',
        customer_type: '',
        status: ''
    });

    useEffect(() => {
        localStorage.setItem('customerDashboard_colWidths', JSON.stringify(colWidths));
    }, [colWidths]);

    useEffect(() => {
        localStorage.setItem('customerDashboard_visibleColumns', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    useEffect(() => {
        fetchCustomerData();
    }, []);

    const fetchCustomerData = async () => {
        try {
            const [customersRes, dealsRes] = await Promise.all([
                api.get('customers/'),
                api.get('deals/')
            ]);

            const customerList = customersRes.data;
            const dealList = dealsRes.data;

            setCustomers(customerList);
            setStats({
                totalCustomers: customerList.length,
                activeCustomers: customerList.filter((c: any) => c.is_active).length,
                totalDeals: dealList.length,
                conversionRate: customerList.length > 0 ? Math.round((dealList.length / customerList.length) * 10) / 10 : 0
            });
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const startResize = (e: React.MouseEvent, colKey: string) => {
        e.preventDefault();
        resizingRef.current = {
            colKey,
            startWidth: colWidths[colKey],
            startX: e.clientX
        };

        const onMouseMove = (ev: MouseEvent) => {
            if (!resizingRef.current) return;
            const key = resizingRef.current.colKey;
            const delta = ev.clientX - resizingRef.current.startX;
            const minWidth = SHORT_COL_WIDTHS[key] ?? 40;
            const maxWidth = MAX_COL_WIDTHS[key] ?? 500;
            const newWidth = Math.min(maxWidth, Math.max(minWidth, resizingRef.current.startWidth + delta));
            setColWidths(prev => ({ ...prev, [key]: newWidth }));
        };

        const onMouseUp = () => {
            resizingRef.current = null;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const getColWidth = (key: string) => colWidths[key] ?? 150;

    const filteredCustomers = customers.filter(c => {
        const matchesSearch = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesName = (c.name || '').toLowerCase().includes(filters.name.toLowerCase());
        const matchesEmail = (c.email || '').toLowerCase().includes(filters.email.toLowerCase());
        const matchesType = filters.customer_type === '' || c.customer_type === filters.customer_type;
        const matchesStatus = filters.status === '' || (filters.status === 'active' ? c.is_active : !c.is_active);

        return matchesSearch && matchesName && matchesEmail && matchesType && matchesStatus;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--ae-blue)]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Customers', value: stats.totalCustomers, icon: Users, color: 'var(--ae-blue)', bg: 'rgba(0, 102, 204, 0.05)' },
                    { label: 'Active Status', value: stats.activeCustomers, icon: CheckCircle2, color: 'var(--ae-green)', bg: 'rgba(0, 200, 83, 0.05)' },
                    { label: 'Total Opportunities', value: stats.totalDeals, icon: Briefcase, color: 'var(--theme-primary)', bg: 'rgba(187, 77, 0, 0.05)' },
                    { label: 'Deals/Customer', value: stats.conversionRate, icon: TrendingUp, color: 'var(--ae-navy)', bg: 'rgba(26, 31, 54, 0.05)' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-[var(--border-primary)] shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`${stat.bg} p-3 rounded-xl`}>
                                <stat.icon size={24} color={stat.color} />
                            </div>
                            <div className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                <ArrowUpRight size={12} className="mr-1" /> +12%
                            </div>
                        </div>
                        <div className="text-2xl font-extrabold text-[var(--text-primary)]">{stat.value}</div>
                        <div className="text-sm font-semibold text-[var(--text-secondary)] mt-1">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-3 bg-white rounded-2xl border border-[var(--border-primary)] shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-[var(--border-primary)] flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-[var(--text-primary)]">Customer Portfolio</h2>
                            <p className="text-sm text-[var(--text-secondary)]">Manage and monitor your customer relationships</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search customers..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-sm focus:outline-none focus:ring-2 focus://var(--theme-primary)]/20 transition-all w-64"
                                />
                            </div>
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setShowColumnMenu(!showColumnMenu)}
                                    className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-semibold transition-colors ${showColumnMenu ? 'bg-[var(--bg-secondary)] border-[var(--theme-primary)] text-[var(--theme-primary)]' : 'border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
                                >
                                    <Columns size={16} /> Columns <ChevronDown size={14} />
                                </button>
                                {showColumnMenu && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        right: 0,
                                        marginTop: '8px',
                                        background: 'white',
                                        borderRadius: '8px',
                                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                                        border: '1px solid var(--border-primary)',
                                        zIndex: 100,
                                        minWidth: '220px',
                                        maxHeight: '450px',
                                        overflowY: 'auto'
                                    }}>
                                        <div style={{
                                            padding: '12px 16px',
                                            borderBottom: '1px solid var(--border-primary)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            background: 'var(--bg-secondary)'
                                        }}>
                                            <button
                                                onClick={() => setVisibleColumns(ALL_COL_CONFIG.map(c => c.key))}
                                                style={{ background: 'none', border: 'none', color: 'var(--theme-primary)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
                                            >
                                                Select All
                                            </button>
                                            <button
                                                onClick={() => setVisibleColumns([])}
                                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                        {ALL_COL_CONFIG.map(col => (
                                            <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', fontSize: '0.85rem', color: '#2D3748', cursor: 'pointer', borderBottom: '1px solid var(--border-secondary)' }}>
                                                <div
                                                    onClick={() => {
                                                        if (visibleColumns.includes(col.key)) {
                                                            setVisibleColumns(visibleColumns.filter(c => c !== col.key));
                                                        } else {
                                                            setVisibleColumns([...visibleColumns, col.key]);
                                                        }
                                                    }}
                                                    style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        borderRadius: '4px',
                                                        border: `2px solid ${visibleColumns.includes(col.key) ? 'var(--ae-blue)' : '#CBD5E1'}`,
                                                        background: visibleColumns.includes(col.key) ? 'var(--ae-blue)' : 'white',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.2s',
                                                        flexShrink: 0
                                                    }}>
                                                    {visibleColumns.includes(col.key) && <Check size={12} color="white" strokeWidth={4} />}
                                                </div>
                                                <span style={{ fontWeight: 600 }}>{col.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse" style={{ tableLayout: 'fixed', width: '100%' }}>
                            <colgroup>
                                {ALL_COL_CONFIG.filter(col => visibleColumns.includes(col.key)).map(col => (
                                    <col key={col.key} style={{ width: `${getColWidth(col.key)}px` }} />
                                ))}
                                <col style={{ width: `${getColWidth('actions')}px` }} />
                            </colgroup>
                            <thead>
                                <tr className="bg-[var(--bg-secondary)]">
                                    {ALL_COL_CONFIG.filter(col => visibleColumns.includes(col.key)).map(col => (
                                        <th key={col.key} className="px-6 py-4 text-left text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider" style={{
                                            position: 'relative',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            borderRight: '1px solid var(--border-secondary)',
                                            borderBottom: '1px solid var(--border-secondary)'
                                        }}>
                                            <span title={col.label}>
                                                {getColWidth(col.key) < (SHORT_COL_WIDTHS[col.key] + 15)
                                                    ? col.shortLabel
                                                    : col.label}
                                            </span>
                                            <div
                                                onMouseDown={(e) => startResize(e, col.key)}
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    right: 0,
                                                    width: '6px',
                                                    height: '100%',
                                                    cursor: 'col-resize',
                                                    background: 'transparent',
                                                    zIndex: 20
                                                }}
                                            />
                                        </th>
                                    ))}
                                    <th style={{ backgroundColor: 'var(--ae-table-header-bg)', textAlign: 'right', borderBottom: '1px solid var(--border-secondary)', padding: '8px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Actions</th>
                                </tr>
                                <tr style={{ background: 'var(--ae-filter-row-bg)' }}>
                                    {ALL_COL_CONFIG.filter(col => visibleColumns.includes(col.key)).map(col => (
                                        <th key={col.key} style={{ padding: '4px 16px', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)', backgroundColor: 'var(--ae-filter-row-bg)' }}>
                                            {(() => {
                                                switch (col.key) {
                                                    case 'customer':
                                                        return <input
                                                            type="text"
                                                            className="ae-input"
                                                            placeholder="Filter name..."
                                                            value={filters.name}
                                                            onChange={e => setFilters({ ...filters, name: e.target.value })}
                                                            style={{ height: '24px', fontSize: '11px', padding: '0 8px' }}
                                                        />;
                                                    case 'contact':
                                                        return <input
                                                            type="text"
                                                            className="ae-input"
                                                            placeholder="Filter email..."
                                                            value={filters.email}
                                                            onChange={e => setFilters({ ...filters, email: e.target.value })}
                                                            style={{ height: '28px', fontSize: '11px', padding: '0 8px' }}
                                                        />;
                                                    case 'type':
                                                        return <select
                                                            className="ae-input"
                                                            value={filters.customer_type}
                                                            onChange={e => setFilters({ ...filters, customer_type: e.target.value })}
                                                            style={{ height: '24px', fontSize: '11px', padding: '0 4px' }}
                                                        >
                                                            <option value="">All Types</option>
                                                            <option value="END_CUSTOMER">End Customer</option>
                                                            <option value="PARTNER">Partner</option>
                                                        </select>;
                                                    case 'status':
                                                        return <select
                                                            className="ae-input"
                                                            value={filters.status}
                                                            onChange={e => setFilters({ ...filters, status: e.target.value })}
                                                            style={{ height: '24px', fontSize: '11px', padding: '0 4px' }}
                                                        >
                                                            <option value="">All Statuses</option>
                                                            <option value="active">Active</option>
                                                            <option value="inactive">Inactive</option>
                                                        </select>;
                                                    default:
                                                        return null;
                                                }
                                            })()}
                                        </th>
                                    ))}
                                    <th style={{ backgroundColor: 'var(--ae-filter-row-bg)', padding: '4px 16px', textAlign: 'right' }}>
                                        <button
                                            onClick={() => setFilters({ name: '', email: '', customer_type: '', status: '' })}
                                            className="text-[var(--theme-primary)] font-bold text-[10px] uppercase hover:underline"
                                        >
                                            Clear
                                        </button>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-primary)]">
                                {filteredCustomers.map((customer) => (
                                    <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                                        {visibleColumns.map(key => {
                                            const cellStyle = {
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                fontSize: '0.8rem'
                                            } as React.CSSProperties;

                                            switch (key) {
                                                case 'customer':
                                                    return (
                                                        <td key={key} className="px-6 py-4" style={cellStyle}>
                                                            <div className="flex items-center">
                                                                <div className="h-10 w-10 bg-[var(--bg-secondary)] rounded-xl flex items-center justify-center text-[var(--theme-primary)] font-bold">
                                                                    {(customer.name || '').substring(0, 1).toUpperCase()}
                                                                </div>
                                                                <div className="ml-4">
                                                                    <div className="text-sm font-bold text-[var(--text-primary)]">{customer.name}</div>
                                                                    <div className="text-xs text-[var(--text-secondary)] flex items-center mt-0.5">
                                                                        <MapPin size={10} className="mr-1" /> {customer.address ? (customer.address.substring(0, 30) + '...') : 'No address'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    );
                                                case 'contact':
                                                    return (
                                                        <td key={key} className="px-6 py-4" style={cellStyle}>
                                                            <div className="space-y-1">
                                                                <div className="text-xs font-semibold text-[#4A5568] flex items-center">
                                                                    <Mail size={12} className="mr-2 text-[#718096]" /> {customer.email || 'N/A'}
                                                                </div>
                                                                <div className="text-xs font-semibold text-[#4A5568] flex items-center">
                                                                    <Phone size={12} className="mr-2 text-[#718096]" /> {customer.phone || 'N/A'}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    );
                                                case 'type':
                                                    return (
                                                        <td key={key} className="px-6 py-4" style={cellStyle}>
                                                            <div className="flex items-center">
                                                                {customer.customer_type === 'PARTNER' ? (
                                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                                                                        <Building2 size={12} className="mr-1" /> Partner
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700">
                                                                        <Users size={12} className="mr-1" /> End Customer
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                case 'status':
                                                    return (
                                                        <td key={key} className="px-6 py-4" style={cellStyle}>
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${customer.is_active
                                                                ? 'bg-emerald-50 text-emerald-700'
                                                                : 'bg-red-50 text-red-700'
                                                                }`}>
                                                                <div className={`w-1.5 h-1.5 rounded-full mr-2 ${customer.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                                {customer.is_active ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </td>
                                                    );
                                                default:
                                                    return null;
                                            }
                                        })}
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-[var(--theme-primary)] hover:text-[var(--ae-blue)] font-bold text-xs">View Details</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerDashboard;
