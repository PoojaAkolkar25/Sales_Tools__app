import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    PlusCircle,
    Calendar,
    Calculator,
    LayoutDashboard,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Columns,
    Check,
    ChevronDown
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { formatToAppDate } from '../utils/dateUtils';
import RevenueContractForm from './RevenueContractForm';
import RevenueScheduleTable from './RevenueScheduleTable';
import Pagination from './Pagination';

interface RevenueContract {
    id: number;
    contract_id: string;
    revenue_type: string;
    revenue_type_display: string;
    deal: number;
    deal_no: string;
    customer: number;
    customer_name: string;
    total_amount: string;
    total_amount_inr?: number;
    currency: string;
    start_date: string;
    end_date: string;
    status: string;
}

const ALL_COLUMNS = [
    { key: 'contract_id', label: 'Contract ID', shortLabel: 'ID' },
    { key: 'revenue_type', label: 'Type', shortLabel: 'TYPE' },
    { key: 'deal_no', label: 'Deal No.', shortLabel: 'DEAL' },
    { key: 'customer_name', label: 'Customer Name', shortLabel: 'CUST.' },
    { key: 'total_amount', label: 'Amount', shortLabel: 'AMT' },
    { key: 'total_amount_inr', label: 'Amount (INR)', shortLabel: 'INR' },
    { key: 'period', label: 'Period', shortLabel: 'PER' },
    { key: 'status', label: 'Status', shortLabel: 'ST' },
];

const RevenueDashboard: React.FC = () => {
    const { showNotification } = useNotification();
    const [contracts, setContracts] = useState<RevenueContract[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'create'>('dashboard');
    const [view, setView] = useState<'list' | 'schedule'>('list');
    const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;
    const [hoveredTab, setHoveredTab] = useState<string | null>(null);

    const [filters, setFilters] = useState({
        contract_id: '',
        revenue_type: '',
        deal_no: '',
        customer_name: '',
        status: 'DRAFT' // Default status tab
    });

    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const [hoveredColumn, setHoveredColumn] = useState(false);
    const columnMenuRef = useRef<HTMLDivElement>(null);

    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem('revenueDashboard_visibleColumns');
        return saved ? JSON.parse(saved) : ALL_COLUMNS.map(col => col.key);
    });

    useEffect(() => {
        localStorage.setItem('revenueDashboard_visibleColumns', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
                setShowColumnMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const tableScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchContracts();
    }, []);

    const fetchContracts = async () => {
        setLoading(true);
        try {
            const response = await api.get('/revenue/contracts/');
            setContracts(response.data);
        } catch (error) {
            console.error('Error fetching revenue contracts', error);
            showNotification('Error fetching revenue contracts', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        setView('list');
        setActiveTab('dashboard');
        fetchContracts();
    };

    const computeSchedule = async (id: number) => {
        try {
            showNotification('Computing revenue schedule...', 'info');
            await api.post(`/revenue/contracts/${id}/compute_schedule/`);
            showNotification('Revenue schedule computed successfully', 'success');
            fetchContracts();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Error computing schedule', 'error');
        }
    };

    const counts = useMemo(() => ({
        all: contracts.length,
        draft: contracts.filter(c => c.status === 'DRAFT').length,
        active: contracts.filter(c => c.status === 'ACTIVE').length,
        completed: contracts.filter(c => c.status === 'COMPLETED').length,
        cancelled: contracts.filter(c => c.status === 'CANCELLED').length
    }), [contracts]);

    const statusTabs = [
        { label: `Draft (${counts.draft})`, value: 'DRAFT' },
        { label: `Active (${counts.active})`, value: 'ACTIVE' },
        { label: `Completed (${counts.completed})`, value: 'COMPLETED' },
        { label: `Cancelled (${counts.cancelled})`, value: 'CANCELLED' },
        { label: `All (${counts.all})`, value: '' }
    ];

    const filteredContracts = useMemo(() => {
        return contracts.filter(c => {
            const matchesId = (c.contract_id || '').toLowerCase().includes(filters.contract_id.toLowerCase());
            const matchesType = (c.revenue_type_display || '').toLowerCase().includes(filters.revenue_type.toLowerCase());
            const matchesDeal = (c.deal_no || '').toLowerCase().includes(filters.deal_no.toLowerCase());
            const matchesCustomer = (c.customer_name || '').toLowerCase().includes(filters.customer_name.toLowerCase());
            const matchesStatus = filters.status === '' || c.status === filters.status;
            return matchesId && matchesType && matchesDeal && matchesCustomer && matchesStatus;
        });
    }, [contracts, filters]);

    const paginatedContracts = useMemo(() => {
        return filteredContracts.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        );
    }, [filteredContracts, currentPage]);

    return (
        <div className="space-y-8" style={{ background: 'white', padding: '0', margin: '0' }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 8px',
                marginBottom: '24px',
                flexWrap: 'wrap',
                gap: '16px'
            }}>
                {/* Left: Heading + buttons inline */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ width: '4px', height: '24px', background: 'var(--theme-primary)', borderRadius: '2px' }}></div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Revenue</h1>

                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        alignItems: 'center',
                        background: 'var(--bg-primary)',
                        padding: '6px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-primary)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                    }}>
                        <button
                            onClick={() => { setActiveTab('dashboard'); setView('list'); setSelectedContractId(null); }}
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
                                background: activeTab === 'dashboard' ? 'var(--theme-primary)' : 'transparent',
                                color: activeTab === 'dashboard' ? 'white' : 'var(--text-secondary)',
                                boxShadow: activeTab === 'dashboard' ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                            }}
                            onMouseEnter={(e) => { if (activeTab !== 'dashboard') { e.currentTarget.style.background = 'rgba(255,107,0,0.05)'; e.currentTarget.style.color = 'var(--ae-orange)'; } }}
                            onMouseLeave={(e) => { if (activeTab !== 'dashboard') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                        >
                            <LayoutDashboard size={18} /> Dashboard
                        </button>
                        <button
                            onClick={() => { setActiveTab('create'); setSelectedContractId(null); }}
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
                                background: activeTab === 'create' ? 'var(--theme-primary)' : 'transparent',
                                color: activeTab === 'create' ? 'white' : 'var(--text-secondary)',
                                boxShadow: activeTab === 'create' ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                            }}
                            onMouseEnter={(e) => { if (activeTab !== 'create') { e.currentTarget.style.background = 'rgba(255,107,0,0.05)'; e.currentTarget.style.color = 'var(--ae-orange)'; } }}
                            onMouseLeave={(e) => { if (activeTab !== 'create') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                        >
                            <PlusCircle size={18} /> Create New
                        </button>
                    </div>
                </div>
            </div>



            {activeTab === 'create' ? (
                <RevenueContractForm id={selectedContractId} onBack={handleBack} onSave={handleBack} />
            ) : view === 'schedule' && selectedContractId ? (
                <RevenueScheduleTable contractId={selectedContractId} onBack={handleBack} />
            ) : (

                <div className="ae-table-container" style={{
                    marginTop: '12px',
                    marginBottom: '60px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'visible',
                    maxHeight: 'none',
                    overflowY: 'visible',
                    background: 'white',
                    padding: '0'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border-primary)',
                        position: 'relative'
                    }}>
                        <div style={{
                            display: 'flex',
                            gap: '4px',
                            background: 'var(--bg-primary)',
                            padding: '6px',
                            borderRadius: '12px',
                            border: '1px solid var(--border-primary)',
                            boxShadow: 'var(--shadow-sm)',
                            flexWrap: 'wrap'
                        }}>
                            {statusTabs.map((tab) => {
                                const isActive = filters.status === tab.value;
                                const isHovered = hoveredTab === tab.value;
                                return (
                                    <button
                                        key={tab.value}
                                        onClick={() => setFilters({ ...filters, status: tab.value })}
                                        onMouseEnter={() => setHoveredTab(tab.value)}
                                        onMouseLeave={() => setHoveredTab(null)}
                                        style={{
                                            padding: '5px 12px',
                                            borderRadius: '8px',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            border: isActive ? '1px solid var(--theme-primary)' : (isHovered ? '1px solid var(--theme-primary)' : '1px solid transparent'),
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            whiteSpace: 'nowrap',
                                            background: isActive ? 'var(--theme-primary)' : 'transparent',
                                            color: isActive ? 'white' : 'var(--text-secondary)',
                                            boxShadow: isActive ? 'var(--shadow-md)' : (isHovered ? '0 0 0 3px rgba(255, 107, 0, 0.1)' : 'none')
                                        }}
                                    >
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        <div style={{ position: 'relative' }} ref={columnMenuRef}>
                            <button
                                className="ae-btn-secondary"
                                onClick={() => setShowColumnMenu(!showColumnMenu)}
                                onMouseEnter={() => setHoveredColumn(true)}
                                onMouseLeave={() => setHoveredColumn(false)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 14px',
                                    fontSize: '0.8rem',
                                    fontWeight: 400,
                                    color: '#000000',
                                    border: (showColumnMenu || hoveredColumn) ? '1px solid var(--theme-primary)' : '1px solid var(--ae-gray-100)',
                                    boxShadow: (showColumnMenu || hoveredColumn) ? '0 0 0 3px rgba(255, 107, 0, 0.1)' : 'none',
                                    background: 'white',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                <Columns size={16} color="#000000" /> Columns <ChevronDown size={14} color="#000000" />
                            </button>
                            {showColumnMenu && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: 0,
                                    marginTop: '8px',
                                    background: 'var(--bg-primary)',
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
                                            onClick={() => setVisibleColumns(ALL_COLUMNS.map(c => c.key))}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--ae-blue)',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                        >
                                            Select All
                                        </button>
                                        <button
                                            onClick={() => setVisibleColumns([])}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--text-secondary)',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                    {ALL_COLUMNS.map(col => (
                                        <label key={col.key} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '10px 16px',
                                            fontSize: '0.85rem',
                                            color: 'var(--text-primary)',
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                            transition: 'background 0.2s',
                                            borderBottom: '1px solid var(--border-primary)'
                                        }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-primary)'}
                                        >
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

                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => tableScrollRef.current?.scrollBy({ left: -150, behavior: 'smooth' })}
                            style={{
                                position: 'absolute',
                                left: '-8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                zIndex: 30,
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border-primary)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'var(--text-primary)',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--theme-primary)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--theme-primary)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-primary)'; }}
                            title="Scroll left"
                        >
                            <ChevronLeft size={18} />
                        </button>

                        <button
                            onClick={() => tableScrollRef.current?.scrollBy({ left: 150, behavior: 'smooth' })}
                            style={{
                                position: 'absolute',
                                right: '-8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                zIndex: 30,
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border-primary)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'var(--text-primary)',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--theme-primary)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--theme-primary)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-primary)'; }}
                            title="Scroll right"
                        >
                            <ChevronRight size={18} />
                        </button>

                        <div ref={tableScrollRef} className="ae-table-wrapper" style={{ overflowX: 'auto', background: 'var(--bg-primary)', borderRadius: '0', border: '1px solid var(--border-primary)' }}>
                            <table className="ae-table compact-table" style={{ tableLayout: 'auto', width: '100%', minWidth: '1000px' }}>
                                <thead>
                                    <tr>
                                        {visibleColumns.map(key => {
                                            const col = ALL_COLUMNS.find(c => c.key === key);
                                            return (
                                                <th key={key} style={{
                                                    backgroundColor: 'var(--ae-table-header-bg)',
                                                    zIndex: 12,
                                                    position: 'relative',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    userSelect: 'none',
                                                    paddingRight: '20px',
                                                    fontWeight: 700,
                                                    fontSize: '0.75rem',
                                                    color: 'var(--text-secondary)',
                                                    textTransform: 'uppercase',
                                                    borderRight: '1px solid var(--border-secondary)',
                                                    borderBottom: '1px solid var(--border-secondary)',
                                                    textAlign: ['total_amount', 'total_amount_inr'].includes(key) ? 'right' : 'left'
                                                }}>
                                                    {col?.label}
                                                </th>
                                            );
                                        })}
                                        <th style={{ backgroundColor: 'var(--ae-table-header-bg)', zIndex: 12, textAlign: 'center', whiteSpace: 'nowrap', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Actions</th>
                                    </tr>
                                    <tr style={{ background: 'var(--ae-filter-row-bg)' }}>
                                        {visibleColumns.map(key => (
                                            <th key={key} style={{ backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>
                                                {key !== 'period' && key !== 'total_amount' && key !== 'status' ? (
                                                    <div className="ae-input-group" style={{ margin: 0 }}>
                                                        <input
                                                            className="ae-input"
                                                            placeholder="Filter..."
                                                            value={(filters as any)[key] || ''}
                                                            onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
                                                            style={{ height: '24px', fontSize: '11px', paddingTop: 0, paddingBottom: 0 }}
                                                        />
                                                    </div>
                                                ) : null}
                                            </th>
                                        ))}
                                        <th style={{ textAlign: 'center', backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>
                                            <button
                                                onClick={() => setFilters({ contract_id: '', revenue_type: '', deal_no: '', customer_name: '', status: filters.status })}
                                                style={{ height: '24px', width: '100%', fontSize: '10px', color: 'var(--theme-primary)', fontWeight: 700, cursor: 'pointer', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px' }}
                                            >
                                                Clear
                                            </button>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={visibleColumns.length + 1} style={{ textAlign: 'center', padding: '100px' }}><Loader2 className="animate-spin" style={{ margin: '0 auto', color: 'var(--theme-primary)' }} /></td></tr>
                                    ) : paginatedContracts.length === 0 ? (
                                        <tr><td colSpan={visibleColumns.length + 1} style={{ textAlign: 'center', padding: '100px', color: 'var(--text-secondary)' }}>No revenue contracts found.</td></tr>
                                    ) : (
                                        paginatedContracts.map((contract) => (
                                            <tr key={contract.id}>
                                                {visibleColumns.map(key => {
                                                    switch (key) {
                                                        case 'contract_id':
                                                            return (
                                                                <td key={key} style={{ fontWeight: 600, color: 'var(--theme-primary)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => { setSelectedContractId(contract.id); setActiveTab('create'); }}>
                                                                    {contract.contract_id}
                                                                </td>
                                                            );
                                                        case 'revenue_type':
                                                            return <td key={key}>{contract.revenue_type_display}</td>;
                                                        case 'deal_no':
                                                            return <td key={key}>{contract.deal_no}</td>;
                                                        case 'customer_name':
                                                            return <td key={key}>{contract.customer_name}</td>;
                                                        case 'total_amount':
                                                            return (
                                                                <td key={key} style={{ textAlign: 'right', fontWeight: 600 }}>
                                                                    {contract.currency === 'INR' ? '₹' : contract.currency === 'USD' ? '$' : contract.currency === 'EUR' ? '€' : ''}
                                                                    {parseFloat(contract.total_amount).toLocaleString()}
                                                                </td>
                                                            );
                                                        case 'total_amount_inr':
                                                            return (
                                                                <td key={key} style={{ textAlign: 'right', fontWeight: 600, color: 'var(--theme-primary)' }}>
                                                                    ₹{parseFloat(contract.total_amount_inr?.toString() || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                </td>
                                                            );
                                                        case 'period':
                                                            return <td key={key}>{formatToAppDate(contract.start_date)} - {formatToAppDate(contract.end_date)}</td>;
                                                        case 'status':
                                                            return (
                                                                <td key={key}>
                                                                    <span style={{ padding: '4px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700, background: 'var(--bg-secondary)', color: 'var(--theme-primary)' }}>
                                                                        {(contract.status || '').replace('_', ' ')}
                                                                    </span>
                                                                </td>
                                                            );
                                                        default:
                                                            return <td key={key}>{(contract as any)[key] || '—'}</td>;
                                                    }
                                                })}
                                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        <button
                                                            onClick={() => { setSelectedContractId(contract.id); setView('schedule'); }}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                background: 'rgba(187, 77, 0, 0.07)',
                                                                color: 'var(--theme-primary)',
                                                                border: '1px solid rgba(187, 77, 0, 0.25)',
                                                                padding: '4px 14px',
                                                                borderRadius: '20px',
                                                                fontSize: '0.72rem',
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                                letterSpacing: '0.04em',
                                                                transition: 'all 0.18s',
                                                            }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--theme-primary)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(187, 77, 0, 0.07)'; e.currentTarget.style.color = 'var(--theme-primary)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                                            title="View Schedule"
                                                        >
                                                            <Calendar size={13} /> Schedule
                                                        </button>
                                                        <button
                                                            onClick={() => computeSchedule(contract.id)}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                background: 'rgba(187, 77, 0, 0.07)',
                                                                color: 'var(--theme-primary)',
                                                                border: '1px solid rgba(187, 77, 0, 0.25)',
                                                                padding: '4px 14px',
                                                                borderRadius: '20px',
                                                                fontSize: '0.72rem',
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                                letterSpacing: '0.04em',
                                                                transition: 'all 0.18s',
                                                            }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--theme-primary)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(187, 77, 0, 0.07)'; e.currentTarget.style.color = 'var(--theme-primary)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                                            title="Recompute"
                                                        >
                                                            <Calculator size={13} /> Recompute
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <Pagination
                        currentPage={currentPage}
                        totalItems={filteredContracts.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}
        </div>
    );
};

export default RevenueDashboard;
