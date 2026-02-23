import React, { useState, useEffect, useRef } from 'react';
import {
    PlusCircle,
    Server,
    ArrowRight,
    Search,
    Columns,
    ChevronDown
} from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { formatToAppDate } from '../utils/dateUtils';
import Pagination from './Pagination';

const ALL_COL_CONFIG = [
    { key: 'form_number', label: 'Form Number', shortLabel: 'FORM NO' },
    { key: 'project_name', label: 'Project', shortLabel: 'PROJ.' },
    { key: 'requestor', label: 'Requestor', shortLabel: 'REQ.' },
    { key: 'server_type', label: 'Resource Type', shortLabel: 'TYPE' },
    { key: 'status', label: 'Status', shortLabel: 'ST.' }
];

const SHORT_COL_WIDTHS: Record<string, number> = {
    form_number: 55,
    project_name: 50,
    requestor: 50,
    server_type: 50,
    status: 35,
    actions: 60
};

const FULL_LABEL_WIDTHS: Record<string, number> = {
    form_number: 95,
    project_name: 80,
    requestor: 90,
    server_type: 105,
    status: 70
};

const MAX_COL_WIDTHS: Record<string, number> = {
    form_number: 150,
    project_name: 250,
    requestor: 250,
    server_type: 180,
    status: 120,
    actions: 120
};

interface ResourceDashboardProps {
    onView: (id: number) => void;
    onCreate: () => void;
}

const ResourceDashboard: React.FC<ResourceDashboardProps> = ({ onView, onCreate }) => {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { showNotification } = useNotification();
    const [currentPage, setCurrentPage] = useState(1);
    const [showFilters] = useState(true);
    const [filters, setFilters] = useState({
        form_number: '',
        project_name: '',
        requestor: ''
    });
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
        const saved = localStorage.getItem('resourceDashboard_colWidths');
        if (saved) return JSON.parse(saved);
        const defaults: Record<string, number> = {};
        ALL_COL_CONFIG.forEach(c => { defaults[c.key] = FULL_LABEL_WIDTHS[c.key] || 150; });
        defaults['actions'] = 120;
        return defaults;
    });

    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem('resourceDashboard_visibleColumns');
        return saved ? JSON.parse(saved) : ALL_COL_CONFIG.map(c => c.key);
    });

    const resizingRef = useRef<{ colKey: string; startWidth: number; startX: number } | null>(null);

    useEffect(() => {
        localStorage.setItem('resourceDashboard_colWidths', JSON.stringify(colWidths));
    }, [colWidths]);

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

    useEffect(() => {
        localStorage.setItem('resourceDashboard_visibleColumns', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    const ITEMS_PER_PAGE = 20;

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
                return { bg: 'rgba(74, 85, 104, 0.1)', color: 'var(--text-secondary)', label: 'Draft' };
            case 'SUBMITTED':
                return { bg: 'rgba(0, 102, 204, 0.1)', color: 'var(--ae-blue)', label: 'Submitted' };
            case 'PENDING_IT':
                return { bg: 'rgba(187, 77, 0, 0.1)', color: 'var(--theme-primary)', label: 'Pending IT Head' };
            case 'PENDING_FINANCE':
                return { bg: 'rgba(155, 81, 224, 0.1)', color: 'var(--text-secondary)', label: 'Pending Finance Head' };
            case 'APPROVED':
                return { bg: 'rgba(0, 200, 83, 0.1)', color: 'var(--ae-green)', label: 'Approved' };
            case 'ISSUED':
                return { bg: 'rgba(0, 102, 204, 0.1)', color: 'var(--ae-blue)', label: 'Issued' };
            case 'REJECTED':
                return { bg: 'rgba(229, 62, 62, 0.1)', color: '#E53E3E', label: 'Rejected' };
            default:
                return { bg: 'var(--bg-secondary)', color: 'var(--text-secondary)', label: status };
        }
    };

    const filteredRequests = requests.filter(req => {
        const matchesForm = (req.form_number || '').toLowerCase().includes(filters.form_number.toLowerCase());
        const matchesProject = (req.project_name || '').toLowerCase().includes(filters.project_name.toLowerCase());
        const matchesRequestor = (req.requestor_detail?.full_name || '').toLowerCase().includes(filters.requestor.toLowerCase());

        return matchesForm && matchesProject && matchesRequestor;
    });

    const paginatedRequests = filteredRequests.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

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
                    gap: '12px',
                    alignItems: 'center',
                    background: 'var(--bg-primary)',
                    padding: '6px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-primary)',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowColumnMenu(!showColumnMenu)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 20px',
                                borderRadius: '8px',
                                background: 'var(--bg-primary)',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border-primary)',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: 'pointer'
                            }}
                        >
                            <Columns size={16} /> Columns <ChevronDown size={14} />
                        </button>
                        {showColumnMenu && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '8px',
                                background: 'var(--bg-primary)',
                                borderRadius: '12px',
                                boxShadow: 'var(--shadow-lg)',
                                border: '1px solid var(--border-primary)',
                                zIndex: 100,
                                minWidth: '220px',
                                overflow: 'hidden'
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
                                        style={{ background: 'none', border: 'none', color: 'var(--ae-blue)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Select All
                                    </button>
                                    <button
                                        onClick={() => setVisibleColumns([])}
                                        style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Clear All
                                    </button>
                                </div>
                                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    {ALL_COL_CONFIG.map(col => (
                                        <label key={col.key} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '10px 16px',
                                            fontSize: '0.85rem',
                                            color: 'var(--text-primary)',
                                            cursor: 'pointer',
                                            transition: 'background 0.2s',
                                            borderBottom: '1px solid var(--border-primary)'
                                        }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={visibleColumns.includes(col.key)}
                                                onChange={() => {
                                                    if (visibleColumns.includes(col.key)) {
                                                        setVisibleColumns(visibleColumns.filter(c => c !== col.key));
                                                    } else {
                                                        setVisibleColumns([...visibleColumns, col.key]);
                                                    }
                                                }}
                                                style={{ cursor: 'pointer', accentColor: 'var(--theme-primary)' }}
                                            />
                                            <span style={{ fontWeight: 600 }}>{col.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onCreate}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 20px',
                            borderRadius: '8px',
                            background: 'var(--theme-primary)',
                            color: 'white',
                            border: 'none',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(187, 77, 0, 0.2)'
                        }}
                    >
                        <PlusCircle size={18} /> Raise Resource Request
                    </button>
                </div>
            </div>

            <div className="section-panel !p-0 overflow-hidden">
                <div style={{ overflowX: 'auto' }}>
                    <table className="ae-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                        <colgroup>
                            {ALL_COL_CONFIG.filter(col => visibleColumns.includes(col.key)).map(col => (
                                <col key={col.key} style={{ width: `${getColWidth(col.key)}px` }} />
                            ))}
                            <col style={{ width: `${getColWidth('actions')}px` }} />
                        </colgroup>
                        <thead>
                            <tr style={{ background: 'var(--ae-table-header-bg)' }}>
                                {ALL_COL_CONFIG.filter(col => visibleColumns.includes(col.key)).map(col => (
                                    <th key={col.key} style={{
                                        position: 'relative',
                                        backgroundColor: 'var(--ae-table-header-bg)',
                                        padding: '8px 16px',
                                        textAlign: 'left',
                                        fontSize: '11px',
                                        fontWeight: 900,
                                        color: 'var(--text-secondary)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        userSelect: 'none',
                                        borderRight: '1px solid var(--border-secondary)',
                                        borderBottom: '1px solid var(--border-secondary)'
                                    }}>
                                        <span title={col.label}>
                                            {getColWidth(col.key) < (SHORT_COL_WIDTHS[col.key] + 5)
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
                                            title="Drag to resize"
                                        />
                                    </th>
                                ))}
                                <th style={{
                                    padding: '8px 16px',
                                    textAlign: 'right',
                                    fontSize: '11px',
                                    fontWeight: 900,
                                    color: 'var(--text-secondary)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    borderBottom: '1px solid var(--border-secondary)'
                                }}>Action</th>
                            </tr>
                            {showFilters && (
                                <tr style={{ background: 'var(--ae-filter-row-bg)' }}>
                                    {ALL_COL_CONFIG.filter(col => visibleColumns.includes(col.key)).map(col => (
                                        <th key={col.key} style={{ padding: '4px 16px', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>
                                            {(() => {
                                                switch (col.key) {
                                                    case 'form_number':
                                                        return <div className="ae-input-group !mb-0" style={{ display: 'block' }}>
                                                            <Search className="ae-search-icon" size={12} />
                                                            <input
                                                                className="ae-input"
                                                                placeholder="Filter..."
                                                                value={filters.form_number}
                                                                onChange={e => setFilters({ ...filters, form_number: e.target.value })}
                                                                style={{ height: '24px', fontSize: '11px', paddingTop: 0, paddingBottom: 0 }}
                                                            />
                                                        </div>;
                                                    case 'project_name':
                                                        return <div className="ae-input-group !mb-0" style={{ display: 'block' }}>
                                                            <Search className="ae-search-icon" size={12} />
                                                            <input
                                                                className="ae-input"
                                                                placeholder="Filter..."
                                                                value={filters.project_name}
                                                                onChange={e => setFilters({ ...filters, project_name: e.target.value })}
                                                                style={{ height: '24px', fontSize: '11px', paddingTop: 0, paddingBottom: 0 }}
                                                            />
                                                        </div>;
                                                    case 'requestor':
                                                        return <div className="ae-input-group !mb-0" style={{ display: 'block' }}>
                                                            <Search className="ae-search-icon" size={12} />
                                                            <input
                                                                className="ae-input"
                                                                placeholder="Filter..."
                                                                value={filters.requestor}
                                                                onChange={e => setFilters({ ...filters, requestor: e.target.value })}
                                                                style={{ height: '24px', fontSize: '11px', paddingTop: 0, paddingBottom: 0 }}
                                                            />
                                                        </div>;
                                                    default:
                                                        return null;
                                                }
                                            })()}
                                        </th>
                                    ))}
                                    <th style={{ padding: '4px 16px', textAlign: 'right', borderBottom: '1px solid var(--border-secondary)' }}>
                                        <button
                                            onClick={() => setFilters({ form_number: '', project_name: '', requestor: '' })}
                                            style={{ height: '24px', width: '100%', fontSize: '10px', color: 'var(--theme-primary)', fontWeight: 700, cursor: 'pointer', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px' }}
                                        >
                                            Clear
                                        </button>
                                    </th>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={visibleColumns.length + 1} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>Loading requests...</td>
                                </tr>
                            ) : paginatedRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={visibleColumns.length + 1} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>No resource requests found.</td>
                                </tr>
                            ) : (
                                paginatedRequests.map((req) => {
                                    const status = getStatusStyle(req.status);
                                    return (
                                        <tr key={req.id} className="ae-table-row">
                                            {ALL_COL_CONFIG.filter(col => visibleColumns.includes(col.key)).map(col => {
                                                const cellStyle = {
                                                    padding: '8px 16px',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    fontSize: '0.8rem'
                                                } as React.CSSProperties;

                                                switch (col.key) {
                                                    case 'form_number':
                                                        return <td key={col.key} style={cellStyle}>
                                                            <span style={{ fontWeight: 800, color: 'var(--ae-blue)', fontSize: '0.85rem' }}>{req.form_number}</span>
                                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{req.request_date ? formatToAppDate(req.request_date) : '---'}</div>
                                                        </td>;
                                                    case 'project_name':
                                                        return <td key={col.key} style={cellStyle}>
                                                            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{req.project_name}</span>
                                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{req.environment}</div>
                                                        </td>;
                                                    case 'requestor':
                                                        return <td key={col.key} style={cellStyle}>
                                                            <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{req.requestor_detail?.full_name}</span>
                                                        </td>;
                                                    case 'server_type':
                                                        return <td key={col.key} style={cellStyle}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <Server size={14} className="text-[var(--theme-primary)]" />
                                                                <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{req.server_type} ({req.server_category})</span>
                                                            </div>
                                                        </td>;
                                                    case 'status':
                                                        return <td key={col.key} style={cellStyle}>
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
                                                        </td>;
                                                    default:
                                                        return null;
                                                }
                                            })}
                                            <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                                <button
                                                    onClick={() => onView(req.id)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        borderRadius: '6px',
                                                        background: 'var(--bg-secondary)',
                                                        color: 'var(--text-secondary)',
                                                        border: '1px solid var(--border-primary)',
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

            <Pagination
                currentPage={currentPage}
                totalItems={filteredRequests.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
            />
        </div>
    );
};

export default ResourceDashboard;
