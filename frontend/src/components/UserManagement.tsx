import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { Shield, Loader2, Trash2, X, Users, CheckCircle, AlertCircle, Power, Pencil, LayoutDashboard, PlusCircle, Paperclip, Eye, Download, ChevronLeft, ChevronRight, Columns, ChevronDown, Building2, UserSquare2, Check } from 'lucide-react';
import { Country, State, City } from 'country-state-city';
import SearchableDropdown from './SearchableDropdown';
import Pagination from './Pagination';

const ALL_COLUMNS: Record<string, { key: string; label: string; shortLabel: string }[]> = {
    user: [
        { key: 'username', label: 'User', shortLabel: 'User' },
        { key: 'email', label: 'Email', shortLabel: 'Mail' },
        { key: 'first_name', label: 'First Name', shortLabel: 'First' },
        { key: 'last_name', label: 'Last Name', shortLabel: 'Last' },
        { key: 'employee_id', label: 'Emp ID', shortLabel: 'ID' },
        { key: 'mobile', label: 'Mobile', shortLabel: 'Mob' },
        { key: 'department', label: 'Department', shortLabel: 'Dept' },
        { key: 'region', label: 'Region', shortLabel: 'Reg' },
        { key: 'role', label: 'Role', shortLabel: 'Role' },
        { key: 'reporting_to_name', label: 'Reporting To', shortLabel: 'Rept' },
        { key: 'is_active', label: 'Status', shortLabel: 'Stat' },
    ],
    partner: [
        { key: 'name', label: 'Company Name', shortLabel: 'Co' },
        { key: 'contact_person', label: 'Contact Person', shortLabel: 'Cont' },
        { key: 'email', label: 'Email', shortLabel: 'Email' },
        { key: 'mobile', label: 'Mobile', shortLabel: 'Mob' },
        { key: 'website_url', label: 'Website', shortLabel: 'Web' },
        { key: 'address_line_1', label: 'Address Line', shortLabel: 'Addr' },
        { key: 'city', label: 'City', shortLabel: 'City' },
        { key: 'state_name', label: 'State', shortLabel: 'Stat' },
        { key: 'pincode', label: 'Pincode', shortLabel: 'Pin' },
        { key: 'base_currency', label: 'Currency', shortLabel: 'Cur' },
        { key: 'payment_terms', label: 'Payment Terms', shortLabel: 'Terms' },
        { key: 'gstin', label: 'GSTIN', shortLabel: 'GST' },
        { key: 'pan', label: 'PAN', shortLabel: 'PAN' },
        { key: 'tan', label: 'TAN', shortLabel: 'TAN' },
        { key: 'cin', label: 'CIN', shortLabel: 'CIN' },
        { key: 'msme_number', label: 'MSME No', shortLabel: 'MSME' },
    ],
    company: [
        { key: 'linked_company_profile_name', label: 'Company Name', shortLabel: 'Comp' },
        { key: 'name', label: 'Customer Name', shortLabel: 'Co' },
        { key: 'alias_name', label: 'Alias Name', shortLabel: 'Alias' },
        { key: 'customer_id', label: 'Customer ID', shortLabel: 'ID' },
        { key: 'industry', label: 'Industry', shortLabel: 'Ind' },
        { key: 'region', label: 'Region', shortLabel: 'Reg' },
        { key: 'contact_person', label: 'Contact Person', shortLabel: 'Cont' },
        { key: 'email', label: 'Email', shortLabel: 'Mail' },
        { key: 'mobile_number', label: 'Mobile', shortLabel: 'Mob' },
        { key: 'website_url', label: 'Website', shortLabel: 'Web' },
        { key: 'address_line_1', label: 'Address Line', shortLabel: 'Addr' },
        { key: 'city', label: 'City', shortLabel: 'City' },
        { key: 'state_name', label: 'State', shortLabel: 'Stat' },
        { key: 'pincode', label: 'Pincode', shortLabel: 'Pin' },
        { key: 'base_currency', label: 'Currency', shortLabel: 'Cur' },
        { key: 'payment_terms', label: 'Payment Terms', shortLabel: 'Terms' },
        { key: 'gstin', label: 'GSTIN', shortLabel: 'GST' },
        { key: 'pan', label: 'PAN', shortLabel: 'PAN' },
        { key: 'tan', label: 'TAN', shortLabel: 'TAN' },
        { key: 'cin', label: 'CIN', shortLabel: 'CIN' },
        { key: 'msme_number', label: 'MSME No', shortLabel: 'MSME' },
    ],
    end_customer: [
        { key: 'end_customer_code', label: 'End Customer Code', shortLabel: 'Code' },
        { key: 'name', label: 'End User Name', shortLabel: 'Name' },
        { key: 'alias_name', label: 'Alias Name', shortLabel: 'Alias' },
        { key: 'status', label: 'Status', shortLabel: 'St' },
        { key: 'industry', label: 'Industry', shortLabel: 'Ind' },
        { key: 'linked_partner_name', label: 'Linked Partner', shortLabel: 'LP' },
        { key: 'location', label: 'Location', shortLabel: 'Loc' },
        { key: 'contact_person', label: 'Contact Person', shortLabel: 'CP' },
        { key: 'email', label: 'Email', shortLabel: 'Mail' },
        { key: 'phone', label: 'Phone', shortLabel: 'Ph' },
    ],
    financial_year: [
        { key: 'label', label: 'Financial Year', shortLabel: 'FY' },
        { key: 'code', label: 'Code', shortLabel: 'Code' },
        { key: 'fy_year', label: 'Year', shortLabel: 'Year' },
        { key: 'start_date', label: 'Start Date', shortLabel: 'Start' },
        { key: 'end_date', label: 'End Date', shortLabel: 'End' },
        { key: 'first_month_of_fiscal_year', label: 'Fiscal Month', shortLabel: 'FMon' },
        { key: 'first_month_of_tax_year', label: 'Tax Month', shortLabel: 'TMon' },
        { key: 'is_current_fy', label: 'Current', shortLabel: 'Curr' },
        { key: 'status', label: 'Status', shortLabel: 'Stat' },
    ],
    product: [
        { key: 'product_code', label: 'Product Code', shortLabel: 'Code' },
        { key: 'name', label: 'Product / Service Name', shortLabel: 'Name' },
        { key: 'status', label: 'Status', shortLabel: 'St' },
        { key: 'category', label: 'Category', shortLabel: 'Cat' },
        { key: 'subcategory', label: 'Subcategory', shortLabel: 'Sub' },
        { key: 'hsn_sac_code', label: 'HSN/SAC', shortLabel: 'HSN' },
        { key: 'industry', label: 'Industry', shortLabel: 'Ind' },
        { key: 'description', label: 'Description', shortLabel: 'Desc' },
        { key: 'uom', label: 'UOM', shortLabel: 'UOM' },
        { key: 'currency', label: 'Currency', shortLabel: 'Cur' },
        { key: 'standard_price', label: 'Price', shortLabel: 'Prc' },
        { key: 'tax_percentage', label: 'Tax %', shortLabel: 'Tax' },
    ]
};

const DEFAULT_COL_WIDTHS: Record<string, number> = {
    username: 180,
    first_name: 150,
    last_name: 150,
    employee_id: 120,
    email: 220,
    mobile: 150,
    department: 150,
    region: 150,
    reporting_to_name: 180,
    role: 150,
    is_active: 100,
    name: 250,
    contact_person: 180,
    address_line_1: 250,
    city: 120,
    state_name: 150,
    pincode: 100,
    phone_number: 150,
    website_url: 200,
    base_currency: 100,
    decimal_places: 100,
    gstin: 180,
    pan: 150,
    tan: 150,
    cin: 220,
    msme_number: 180,
    payment_terms: 150,
    end_customer_code: 120,
    linked_partner_name: 200,
    industry: 150,
    location: 150,
    status: 100,
    entity: 120,
    linked_company_profile_name: 200,
    customer_id: 120,
    alias_name: 150,
    mobile_number: 150,
    type: 120,
    label: 150,
    code: 120,
    fy_year: 100,
    start_date: 120,
    end_date: 120,
    first_month_of_fiscal_year: 150,
    first_month_of_tax_year: 150,
    is_current_fy: 100,
    product_code: 120,
    category: 150,
    subcategory: 150,
    uom: 100,
    standard_price: 120,
    tax_percentage: 100,
    hsn_sac_code: 120,
    currency: 100,
    description: 300,
};

const UserManagement: React.FC = () => {
    const { showNotification, showConfirm } = useNotification();
    const [users, setUsers] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'user' | 'partner' | 'end_customer' | 'company' | 'financial_year' | 'product'>('user');
    const [partners, setPartners] = useState<any[]>([]);
    const [endCustomers, setEndCustomers] = useState<any[]>([]);
    const [financialYears, setFinancialYears] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [isCancelActive, setIsCancelActive] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'app_user',
        mobile: '',
        department: '',
        region: '',
        reporting_to: '',
        employee_id: ''
    });
    const [error, setError] = useState('');
    const [companyError, setCompanyError] = useState('');

    const parseError = (err: any, fallback: string) => {
        console.error(fallback, err);
        const errorData = err.response?.data;
        if (errorData) {
            if (typeof errorData === 'string') return errorData;
            if (errorData.error) return errorData.error;
            if (typeof errorData === 'object') {
                const errors = [];
                for (const [key, value] of Object.entries(errorData)) {
                    if (Array.isArray(value)) errors.push(`${key}: ${value[0]}`);
                    else if (typeof value === 'string') errors.push(`${key}: ${value}`);
                    else errors.push(`${key}: ${JSON.stringify(value)}`);
                }
                return errors.length > 0 ? errors.join(' | ') : JSON.stringify(errorData);
            }
        }
        return err.response?.data?.message || fallback;
    };

    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
    const [searchTerm,] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, columnFilters, viewMode]);

    const [companyFormData, setCompanyFormData] = useState({
        name: '',
        customer_id: '',
        region: '',
        contact_person: '',
        alias_name: '',
        logo: null as File | string | null,
        address_line_1: '',
        country: 'India',
        state: '',
        city: '',
        pincode: '',
        phone_number: '',
        mobile_number: '',
        email: '',
        website_url: '',
        linked_company_profile: '',
        industry: '',
        type: 'CUSTOMER',
        payment_terms: 'NET_30',
        base_currency: 'INR',
        currency_symbol: '₹ / INR',
        decimal_places: '' as any, // Initialize as empty string for placeholder
        is_gst_applicable: true,
        gstin: '',
        state_code: '',
        msme_registered: false,
        msme_number: '',
        pan: '',
        tan: '',
        cin: ''
    });
    const [partnerFormData, setPartnerFormData] = useState({
        name: '',
        contact_person: '',
        logo: null as File | string | null,
        address_line_1: '',
        country: 'India',
        state: '',
        city: '',
        pincode: '',
        phone_number: '',
        mobile: '',
        email: '',
        website_url: '',
        base_currency: 'INR',
        currency_symbol: '₹ / INR',
        decimal_places: 2 as any,
        is_gst_applicable: true,
        gstin: '',
        state_code: '',
        msme_registered: false,
        msme_number: '',
        pan: '',
        tan: '',
        cin: '',
        status: 'ACTIVE',
        payment_terms: 'NET_30'
    });

    const [endCustomerFormData, setEndCustomerFormData] = useState({
        end_customer_code: '',
        name: '',
        alias_name: '',
        linked_partner: '',
        industry: '',
        location: '',
        contact_person: '',
        email: '',
        status: 'ACTIVE'
    });

    const currentYear = 2016;
    const [fyFormData, setFyFormData] = useState(() => {
        const yr = currentYear;
        const startDate = `${yr}-04-01`;
        const endDate = `${yr + 1}-03-31`;
        const shortEnd = String(yr + 1).slice(-2);
        return {
            code: `FY${yr}-${shortEnd}`,
            start_date: startDate,
            end_date: endDate,
            label: `FY ${yr}-${shortEnd}`,
            status: 'ACTIVE',
            is_current_fy: false,
            first_month_of_fiscal_year: 'April',
            first_month_of_tax_year: 'Same as fiscal year',
            fy_year: yr
        };
    });

    const [productFormData, setProductFormData] = useState({
        product_code: '',
        name: '',
        category: 'SOFTWARE',
        subcategory: '',
        description: '',
        uom: '',
        standard_price: '' as any, // Initialize as empty string for placeholder
        tax_percentage: '' as any, // Initialize as empty string for placeholder
        hsn_sac_code: '',
        currency: 'INR',
        industry: '',
        status: 'ACTIVE'
    });

    const location = useLocation();

    const [visibleColumns, setVisibleColumns] = useState<Record<string, string[]>>(() => {
        const saved = localStorage.getItem('userManagement_visibleColumns');
        const savedParsed = saved ? JSON.parse(saved) : {};
        const defaults: Record<string, string[]> = {};
        Object.keys(ALL_COLUMNS).forEach(mode => {
            // Get all possible keys for the current mode
            const allKeys = ALL_COLUMNS[mode].map(col => col.key);

            if (savedParsed[mode]) {
                // Merge saved visibility with new columns from ALL_COLUMNS
                // This ensures newly added columns in ALL_COLUMNS are visible even for returning users
                // Re-initializing when ALL_COLUMNS has more keys than saved ensures new columns are visible
                if (allKeys.length > savedParsed[mode].length) {
                    defaults[mode] = allKeys;
                } else {
                    defaults[mode] = savedParsed[mode];
                }
            } else {
                defaults[mode] = allKeys;
            }
        });
        return defaults;
    });

    const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
        const saved = localStorage.getItem('userManagement_colWidths');
        if (saved) return JSON.parse(saved);
        return DEFAULT_COL_WIDTHS;
    });

    const tableScrollRef = useRef<HTMLDivElement>(null);
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const columnMenuRef = useRef<HTMLDivElement>(null);
    const resizingRef = useRef<{ colKey: string; startX: number; startWidth: number } | null>(null);

    const getColWidth = useCallback((key: string) => colWidths[key] ?? 150, [colWidths]);

    const startResize = useCallback((e: React.MouseEvent, key: string) => {
        e.preventDefault();
        e.stopPropagation();
        resizingRef.current = { colKey: key, startX: e.clientX, startWidth: getColWidth(key) };

        const onMouseMove = (ev: MouseEvent) => {
            if (!resizingRef.current) return;
            const resKey = resizingRef.current.colKey;
            const delta = ev.clientX - resizingRef.current.startX;
            const newWidth = Math.max(50, resizingRef.current.startWidth + delta);
            setColWidths(prev => {
                const next = { ...prev, [resKey]: newWidth };
                localStorage.setItem('userManagement_colWidths', JSON.stringify(next));
                return next;
            });
        };

        const onMouseUp = () => {
            resizingRef.current = null;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, [getColWidth]);

    const handleEditClick = (mode: string, item: any) => {
        setEditingId(item.id);
        if (mode === 'user') {
            setFormData({
                username: item.username || '',
                email: item.email || '',
                password: '',
                first_name: item.first_name || '',
                last_name: item.last_name || '',
                role: item.role || 'app_user',
                mobile: item.mobile || '',
                department: item.department || '',
                region: item.region || '',
                reporting_to: item.reporting_to || '',
                employee_id: item.employee_id || '',
            });
        } else if (mode === 'partner') {
            setPartnerFormData({
                name: item.name || '',
                contact_person: item.contact_person || '',
                logo: item.logo || null,
                address_line_1: item.address_line_1 || '',
                country: item.country || 'India',
                state: states.find((s: any) => s.id === item.state)?.name || item.state || '',
                city: item.city || '',
                pincode: item.pincode || '',
                phone_number: item.phone_number || '',
                mobile: item.mobile || '',
                email: item.email || '',
                website_url: item.website_url || '',
                base_currency: item.base_currency || 'INR',
                currency_symbol: item.currency_symbol || '? / INR',
                decimal_places: item.decimal_places || 2,
                is_gst_applicable: item.is_gst_applicable !== undefined ? item.is_gst_applicable : true,
                gstin: item.gstin || '',
                state_code: item.state_code || '',
                msme_registered: item.msme_registered || false,
                msme_number: item.msme_number || '',
                pan: item.pan || '',
                tan: item.tan || '',
                cin: item.cin || '',
                status: item.status || 'ACTIVE',
                payment_terms: item.payment_terms || 'NET_30'
            });
        } else if (mode === 'end_customer') {
            setEndCustomerFormData({
                end_customer_code: item.end_customer_code || '',
                name: item.name || '',
                linked_partner: item.linked_partner || '',
                industry: item.industry || '',
                location: item.location || '',
                contact_person: item.contact_person || '',
                email: item.email || '',
                alias_name: item.alias_name || '',
                status: item.status || 'ACTIVE'
            });
        } else if (mode === 'company') {
            setCompanyFormData({
                name: item.name || '',
                customer_id: item.customer_id || '',
                region: item.region || '',
                contact_person: item.contact_person || '',
                alias_name: item.alias_name || '',
                logo: item.logo || null,
                address_line_1: item.address_line_1 || '',
                country: item.country || 'India',
                state: states.find((s: any) => s.id === item.state)?.name || item.state || '',
                city: item.city || '',
                pincode: item.pincode || '',
                phone_number: item.phone_number || '',
                mobile_number: item.mobile_number || '',
                email: item.email || '',
                website_url: item.website_url || '',
                linked_company_profile: item.linked_company_profile || '',
                industry: item.industry || '',
                type: item.type || 'CUSTOMER',
                payment_terms: item.payment_terms || 'NET_30',
                base_currency: item.base_currency || 'INR',
                currency_symbol: item.currency_symbol || '? / INR',
                decimal_places: item.decimal_places || 2,
                is_gst_applicable: item.is_gst_applicable !== undefined ? item.is_gst_applicable : true,
                gstin: item.gstin || '',
                state_code: item.state_code || '',
                msme_registered: item.msme_registered || false,
                msme_number: item.msme_number || '',
                pan: item.pan || '',
                tan: item.tan || '',
                cin: item.cin || ''
            });
        } else if (mode === 'financial_year') {
            setFyFormData({
                code: item.code || '',
                start_date: item.start_date || '',
                end_date: item.end_date || '',
                label: item.label || '',
                status: item.status || 'ACTIVE',
                is_current_fy: item.is_current_fy || false,
                first_month_of_fiscal_year: item.first_month_of_fiscal_year || 'April',
                first_month_of_tax_year: item.first_month_of_tax_year || 'Same as fiscal year',
                fy_year: item.fy_year || new Date().getFullYear()
            });
        } else if (mode === 'product') {
            setProductFormData({
                product_code: item.product_code || '',
                name: item.name || '',
                category: item.category || 'SOFTWARE',
                subcategory: item.subcategory || '',
                description: item.description || '',
                uom: item.uom || '',
                standard_price: item.standard_price || '',
                tax_percentage: item.tax_percentage || '',
                hsn_sac_code: item.hsn_sac_code || '',
                currency: item.currency || 'INR',
                industry: item.industry || '',
                status: item.status || 'ACTIVE'
            });
        }
        setShowForm(true);
    };

    const renderUserCell = (user: any, colKey: string) => {
        switch (colKey) {
            case 'username':
                return (
                    <div style={{ cursor: 'pointer' }} onClick={() => handleEditClick('user', user)}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--theme-primary)', textDecoration: 'underline' }}>{user.username}</div>
                    </div>
                );
            case 'first_name': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{user.first_name || '-'}</div>;
            case 'last_name': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{user.last_name || '-'}</div>;
            case 'employee_id': return <div style={{ fontSize: '0.75rem', color: '#FF6B00', fontWeight: 700 }}>{user.employee_id || '-'}</div>;
            case 'email': return <div style={{ fontSize: '0.75rem', color: 'var(--theme-primary)', fontWeight: 500 }}>{user.email || '-'}</div>;
            case 'mobile': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{user.mobile || '-'}</div>;
            case 'department': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{user.department || '-'}</div>;
            case 'region': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{user.region || '-'}</div>;
            case 'reporting_to_name': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{user.reporting_to_name || '-'}</div>;
            case 'role': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{user.role || '-'}</div>;
            case 'is_active':
                return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', background: user.is_active ? 'rgba(0, 200, 83, 0.1)' : 'rgba(244, 67, 54, 0.1)', color: user.is_active ? '#00C853' : '#F44336' }}>
                        {user.is_active ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                        {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                );
            default: return null;
        }
    };

    const renderPartnerCell = (p: any, colKey: string) => {
        switch (colKey) {
            case 'name':
                return (
                    <div style={{ cursor: 'pointer' }} onClick={() => handleEditClick('partner', p)}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--theme-primary)', textDecoration: 'underline' }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: '#1a1f36' }}>{p.code}</div>
                    </div>
                );
            case 'contact_person': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{p.contact_person || '-'}</div>;
            case 'address_line_1': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{p.address_line_1 || '-'}</div>;
            case 'city': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{p.city || '-'}</div>;
            case 'state_name': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{p.state_name || p.state || '-'}</div>;
            case 'pincode': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{p.pincode || '-'}</div>;
            case 'phone_number': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{p.phone_number || '-'}</div>;
            case 'mobile': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{p.mobile || '-'}</div>;
            case 'email': return <div style={{ fontSize: '0.75rem', color: 'var(--theme-primary)', fontWeight: 500 }}>{p.email || '-'}</div>;
            case 'website_url': return <div style={{ fontSize: '0.75rem', color: 'var(--theme-primary)', fontWeight: 500 }}>{p.website_url || '-'}</div>;
            case 'base_currency': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 700 }}>{p.currency_symbol} ({p.base_currency})</div>;
            case 'decimal_places': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{p.decimal_places}</div>;
            case 'gstin': return <div style={{ fontSize: '0.75rem', color: '#FF6B00', fontWeight: 700 }}>{p.gstin || '-'}</div>;
            case 'pan': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{p.pan || '-'}</div>;
            case 'tan': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{p.tan || '-'}</div>;
            case 'cin': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{p.cin || '-'}</div>;
            case 'msme_number': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{p.msme_number || '-'}</div>;
            case 'payment_terms': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{p.payment_terms || '-'}</div>;
            default: return null;
        }
    };

    const renderEndCustomerCell = (ec: any, colKey: string) => {
        switch (colKey) {
            case 'name':
                return (
                    <div style={{ cursor: 'pointer' }} onClick={() => handleEditClick('end_customer', ec)}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--theme-primary)', textDecoration: 'underline' }}>{ec.name}</div>
                        <div style={{ fontSize: '11px', color: '#1a1f36' }}>{ec.end_customer_code}</div>
                    </div>
                );
            case 'end_customer_code': return <div style={{ fontSize: '0.75rem', color: '#FF6B00', fontWeight: 700 }}>{ec.end_customer_code}</div>;
            case 'linked_partner_name': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{ec.linked_partner_name || '-'}</div>;
            case 'industry': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{ec.industry || '-'}</div>;
            case 'location': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{ec.location || '-'}</div>;
            case 'contact_person': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{ec.contact_person || '-'}</div>;
            case 'email': return <div style={{ fontSize: '0.75rem', color: 'var(--theme-primary)', fontWeight: 500 }}>{ec.email || '-'}</div>;
            case 'alias_name': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{ec.alias_name || '-'}</div>;
            case 'phone': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{ec.phone || '-'}</div>;
            case 'status':
                return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', background: ec.status === 'ACTIVE' ? 'rgba(0, 200, 83, 0.1)' : 'rgba(244, 67, 54, 0.1)', color: ec.status === 'ACTIVE' ? '#00C853' : '#F44336' }}>
                        {ec.status === 'ACTIVE' ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                        {ec.status}
                    </span>
                );
            default: return null;
        }
    };

    const renderCompanyCell = (c: any, colKey: string) => {
        switch (colKey) {
            case 'linked_company_profile_name': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 600 }}>{c.linked_company_profile_name || c.linked_company_profile_display || '-'}</div>;
            case 'name':
                return (
                    <div style={{ cursor: 'pointer' }} onClick={() => handleEditClick('company', c)}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--theme-primary)', textDecoration: 'underline' }}>{c.name}</div>
                        <div style={{ fontSize: '11px', color: 'black' }}>{c.customer_id}</div>
                    </div>
                );

            case 'customer_id': return <div style={{ fontSize: '0.75rem', color: '#FF6B00', fontWeight: 700 }}>{c.customer_id}</div>;
            case 'region': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{c.region}</div>;
            case 'contact_person': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{c.contact_person || '-'}</div>;
            case 'alias_name': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{c.alias_name || '-'}</div>;
            case 'address_line_1': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{c.address_line_1 || '-'}</div>;
            case 'city': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{c.city}</div>;
            case 'state_name': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{c.state_name || c.state || '-'}</div>;
            case 'pincode': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{c.pincode}</div>;
            case 'phone_number': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{c.phone_number || '-'}</div>;
            case 'mobile_number': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{c.mobile_number || '-'}</div>;
            case 'email': return <div style={{ fontSize: '0.75rem', color: 'var(--theme-primary)', fontWeight: 500 }}>{c.email || '-'}</div>;
            case 'website_url': return <div style={{ fontSize: '0.75rem', color: 'var(--theme-primary)', fontWeight: 500 }}>{c.website_url || '-'}</div>;
            case 'industry': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{c.industry || '-'}</div>;
            case 'type': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 600 }}>{c.type}</div>;
            case 'payment_terms': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{c.payment_terms || '-'}</div>;
            case 'base_currency': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 700 }}>{c.currency_symbol} ({c.base_currency})</div>;
            case 'gstin': return <div style={{ fontSize: '0.75rem', color: '#FF6B00', fontWeight: 700 }}>{c.gstin || '-'}</div>;
            case 'pan': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{c.pan || '-'}</div>;
            case 'tan': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{c.tan || '-'}</div>;
            case 'cin': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{c.cin || '-'}</div>;
            case 'msme_number': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{c.msme_number || '-'}</div>;
            default: return null;
        }
    };

    const renderFYCell = (fy: any, colKey: string) => {
        switch (colKey) {
            case 'label': return <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--theme-primary)', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => handleEditClick('financial_year', fy)}>{fy.label}</div>;
            case 'code': return <div style={{ fontSize: '0.75rem', color: '#FF6B00', fontWeight: 700 }}>{fy.code}</div>;
            case 'fy_year': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{fy.fy_year}</div>;
            case 'start_date': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{fy.start_date}</div>;
            case 'end_date': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{fy.end_date}</div>;
            case 'first_month_of_fiscal_year': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{fy.first_month_of_fiscal_year}</div>;
            case 'first_month_of_tax_year': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{fy.first_month_of_tax_year}</div>;
            case 'is_current_fy':
                return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, background: fy.is_current_fy ? 'rgba(0, 200, 83, 0.1)' : 'rgba(113, 128, 150, 0.1)', color: fy.is_current_fy ? '#00C853' : '#718096' }}>
                        {fy.is_current_fy ? 'YES' : 'NO'}
                    </span>
                );
            case 'status':
                return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', background: fy.status === 'ACTIVE' ? 'rgba(0, 200, 83, 0.1)' : 'rgba(244, 67, 54, 0.1)', color: fy.status === 'ACTIVE' ? '#00C853' : '#F44336' }}>
                        {fy.status === 'ACTIVE' ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                        {fy.status}
                    </span>
                );
            default: return null;
        }
    };

    const renderProductCell = (product: any, colKey: string) => {
        switch (colKey) {
            case 'name':
                return (
                    <div style={{ cursor: 'pointer' }} onClick={() => handleEditClick('product', product)}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--theme-primary)', textDecoration: 'underline' }}>{product.name}</div>
                        <div style={{ fontSize: '11px', color: '#1a1f36' }}>{product.product_code}</div>
                    </div>
                );
            case 'product_code': return <div style={{ fontSize: '0.75rem', color: '#FF6B00', fontWeight: 700 }}>{product.product_code}</div>;
            case 'category': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 600 }}>{product.category}</div>;
            case 'subcategory': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{product.subcategory || '-'}</div>;
            case 'uom': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{product.uom}</div>;
            case 'standard_price': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 700 }}>{product.currency === 'INR' ? '₹' : product.currency === 'USD' ? '$' : '€'} {product.standard_price}</div>;
            case 'tax_percentage': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{product.tax_percentage}%</div>;
            case 'hsn_sac_code': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{product.hsn_sac_code || '-'}</div>;
            case 'industry': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{product.industry || '-'}</div>;
            case 'currency': return <div style={{ fontSize: '0.75rem', color: 'black', fontWeight: 500 }}>{product.currency}</div>;
            case 'description': return <div style={{ fontSize: '0.7rem', color: 'black', lineHeight: 1.4 }}>{product.description || '-'}</div>;
            case 'status':
                return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', background: product.status === 'ACTIVE' ? 'rgba(0, 200, 83, 0.1)' : 'rgba(244, 67, 54, 0.1)', color: product.status === 'ACTIVE' ? '#00C853' : '#F44336' }}>
                        {product.status === 'ACTIVE' ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                        {product.status}
                    </span>
                );
            default: return null;
        }
    };

    const renderCell = (mode: string, item: any, colKey: string) => {
        switch (mode) {
            case 'user': return renderUserCell(item, colKey);
            case 'partner': return renderPartnerCell(item, colKey);
            case 'end_customer': return renderEndCustomerCell(item, colKey);
            case 'company': return renderCompanyCell(item, colKey);
            case 'financial_year': return renderFYCell(item, colKey);
            case 'product': return renderProductCell(item, colKey);
            default: return null;
        }
    };

    const toggleColumn = (mode: string, key: string) => {
        setVisibleColumns(prev => {
            const next = { ...prev };
            if (next[mode].includes(key)) {
                next[mode] = next[mode].filter(k => k !== key);
            } else {
                next[mode] = [...next[mode], key];
            }
            localStorage.setItem('userManagement_visibleColumns', JSON.stringify(next));
            return next;
        });
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
                setShowColumnMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        fetchData();
        const params = new URLSearchParams(location.search);
        const action = params.get('action');
        const mode = params.get('mode');

        if (action === 'create') {
            setShowForm(true);
        }

        if (mode === 'company') {
            setViewMode('company');
        }
    }, [location.search]);

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([
            fetchUsers(),
            fetchCompanies(),
            fetchStates(),
            fetchPartners(),
            fetchEndCustomers(),
            fetchFinancialYears(),
            fetchProducts()
        ]);
        setLoading(false);
    };

    const fetchUsers = async () => {
        try {
            const response = await api.get('auth/users/');
            setUsers(response.data);
        } catch (err) {
            console.error('Error fetching users', err);
        }
    };

    const fetchCompanies = async () => {
        try {
            const response = await api.get('finance/company-profile/');
            setCompanies(response.data);
        } catch (err) {
            console.error('Error fetching companies', err);
        }
    };

    const fetchStates = async () => {
        try {
            const response = await api.get('finance/state-masters/');
            setStates(response.data);
        } catch (err) {
            console.error('Error fetching states', err);
        }
    };

    const fetchPartners = async () => {
        try {
            const response = await api.get('finance/customer-partners/');
            setPartners(response.data);
        } catch (err) {
            console.error('Error fetching partners', err);
        }
    };

    const fetchEndCustomers = async () => {
        try {
            const response = await api.get('finance/end-customers/');
            setEndCustomers(response.data);
        } catch (err) {
            console.error('Error fetching end customers', err);
        }
    };

    const fetchFinancialYears = async () => {
        try {
            const response = await api.get('finance/financial-years/');
            setFinancialYears(response.data);
        } catch (err) {
            console.error('Error fetching financial years', err);
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await api.get('products/');
            setProducts(response.data);
        } catch (err) {
            console.error('Error fetching products', err);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.username || !formData.email || !formData.first_name || !formData.role) {
            showNotification('Please fill in all required fields (Username, Email, First Name, Role)', 'error');
            return;
        }

        try {
            const cleanedData = {
                ...formData,
                reporting_to: formData.reporting_to || null
            };
            if (editingId) {
                await api.patch(`auth/users/${editingId}/`, cleanedData);
                showNotification('User updated successfully', 'success');
            } else {
                await api.post('auth/users/', cleanedData);
                showNotification('User created successfully', 'success');
            }
            setFormData({
                username: '', email: '', password: '',
                first_name: '', last_name: '', role: 'app_user',
                mobile: '', department: '', region: '', reporting_to: '', employee_id: ''
            });
            setEditingId(null);
            fetchUsers();
            setShowForm(false);
        } catch (err: any) {
            const errorMsg = parseError(err, 'Failed to save user');
            setError(errorMsg);
            showNotification(errorMsg, 'error');
        }
    };

    const [editingId, setEditingId] = useState<number | null>(null);

    // ... (existing useEffect) ...

    const handleCreateCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        setCompanyError('');

        if (!companyFormData.name || !companyFormData.base_currency) {
            showNotification('Please fill in all required fields (Customer Name, Currency)', 'error');
            return;
        }

        try {
            const formData = new FormData();
            Object.entries(companyFormData).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    if (key === 'logo') {
                        if (value instanceof File) {
                            formData.append(key, value);
                        }
                    } else if (key === 'state') {
                        const matchedState = states.find((s: any) => s.name?.toLowerCase() === (value as string)?.toLowerCase());
                        if (matchedState) {
                            formData.append(key, matchedState.id);
                        } else {
                            formData.append(key, '');
                        }
                    } else {
                        formData.append(key, value as any);
                    }
                }
            });

            if (editingId) {
                await api.patch(`finance/company-profile/${editingId}/`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                showNotification('Customer updated successfully', 'success');
            } else {
                await api.post('finance/company-profile/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                showNotification('Customer created successfully', 'success');
            }

            setCompanyFormData({
                name: '', customer_id: '', region: '',
                contact_person: '', alias_name: '', logo: null, address_line_1: '',
                country: 'India', state: '', city: '', pincode: '', phone_number: '',
                mobile_number: '', email: '', website_url: '', linked_company_profile: '',
                industry: '', type: 'CUSTOMER',
                payment_terms: 'NET_30',
                base_currency: 'INR', currency_symbol: '₹ / INR', decimal_places: 2,
                is_gst_applicable: true, gstin: '', state_code: '',
                msme_registered: false, msme_number: '', pan: '', tan: '', cin: ''
            });
            setEditingId(null);
            fetchCompanies();
            setShowForm(false);
        } catch (err: any) {
            const errorMsg = parseError(err, 'Failed to save Customer');
            setCompanyError(errorMsg);
            showNotification(errorMsg, 'error');
        }
    };

    const handleCreatePartner = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!partnerFormData.name || !partnerFormData.base_currency) {
            showNotification('Please fill in all required fields (Company Name, Currency)', 'error');
            return;
        }

        try {
            const formData = new FormData();
            Object.entries(partnerFormData).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    if (key === 'logo') {
                        if (value instanceof File) {
                            formData.append(key, value);
                        }
                    } else if (key === 'state') {
                        const matchedState = states.find((s: any) => s.name?.toLowerCase() === (value as string)?.toLowerCase());
                        if (matchedState) {
                            formData.append(key, matchedState.id);
                        } else {
                            formData.append(key, '');
                        }
                    } else {
                        formData.append(key, value as any);
                    }
                }
            });

            if (editingId) {
                await api.patch(`finance/customer-partners/${editingId}/`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                showNotification('Company updated successfully', 'success');
            } else {
                await api.post('finance/customer-partners/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                showNotification('Company created successfully', 'success');
            }

            setPartnerFormData({
                name: '', contact_person: '', logo: null, address_line_1: '',
                country: 'India', state: '', city: '', pincode: '',
                phone_number: '', mobile: '', email: '', website_url: '',
                base_currency: 'INR',
                currency_symbol: '₹ / INR', decimal_places: 2,
                is_gst_applicable: true, gstin: '', state_code: '',
                msme_registered: false, msme_number: '', pan: '',
                tan: '', cin: '', status: 'ACTIVE', payment_terms: 'NET_30'
            });
            setEditingId(null);
            fetchPartners();
            setShowForm(false);
        } catch (err: any) {
            const errorMsg = parseError(err, 'Failed to save Company');
            setError(errorMsg);
            showNotification(errorMsg, 'error');
        }
    };

    const handleCreateEndCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!endCustomerFormData.name) {
            showNotification('Please fill in all required fields (End user Name)', 'error');
            return;
        }

        try {
            if (editingId) {
                await api.patch(`finance/end-customers/${editingId}/`, endCustomerFormData);
                showNotification('End Customer updated successfully', 'success');
            } else {
                await api.post('finance/end-customers/', endCustomerFormData);
                showNotification('End Customer created successfully', 'success');
            }
            setEndCustomerFormData({
                end_customer_code: '',
                name: '', linked_partner: '', industry: '', location: '',
                contact_person: '', email: '', alias_name: '',
                status: 'ACTIVE'
            });
            setEditingId(null);
            fetchEndCustomers();
            setShowForm(false);
        } catch (err: any) {
            const errorMsg = parseError(err, 'Failed to save End Customer');
            setError(errorMsg);
            showNotification(errorMsg, 'error');
        }
    };

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const computeFYDates = (monthName: string, baseYear: number) => {
        const monthIndex = monthNames.indexOf(monthName);
        if (monthIndex === -1) return { start_date: '', end_date: '', code: '', label: '' };
        const startMonth = String(monthIndex + 1).padStart(2, '0');
        const startDate = `${baseYear}-${startMonth}-01`;
        const endYear = monthIndex === 0 ? baseYear : baseYear + 1;
        const endMonthIndex = monthIndex === 0 ? 11 : monthIndex - 1;
        const endMonth = String(endMonthIndex + 1).padStart(2, '0');
        const lastDay = new Date(endYear, endMonthIndex + 1, 0).getDate();
        const endDate = `${endYear}-${endMonth}-${String(lastDay).padStart(2, '0')}`;
        const shortEnd = String(endYear).slice(-2);
        const code = `FY${baseYear}-${shortEnd}`;
        const label = `FY ${baseYear}-${shortEnd}`;
        return { start_date: startDate, end_date: endDate, code, label };
    };

    const handleFiscalMonthChange = (monthName: string) => {
        const computed = computeFYDates(monthName, fyFormData.fy_year);
        setFyFormData(prev => ({ ...prev, first_month_of_fiscal_year: monthName, ...computed }));
    };

    const handleFYYearChange = (year: number) => {
        const computed = computeFYDates(fyFormData.first_month_of_fiscal_year, year);
        setFyFormData(prev => ({ ...prev, fy_year: year, ...computed }));
    };

    const handleCreateFinancialYear = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!fyFormData.code || !fyFormData.start_date || !fyFormData.end_date || !fyFormData.label) {
            showNotification('Please fill in all required fields (Code, Start Date, End Date, Label)', 'error');
            return;
        }

        if (!editingId && financialYears.some(fy => fy.code === fyFormData.code)) {
            showNotification(`Financial Year ${fyFormData.code} already exists`, 'error');
            return;
        }

        const submitData = {
            code: fyFormData.code,
            start_date: fyFormData.start_date,
            end_date: fyFormData.end_date,
            label: fyFormData.label,
            status: fyFormData.status,
            is_current_fy: fyFormData.is_current_fy
        };

        try {
            if (editingId) {
                await api.patch(`finance/financial-years/${editingId}/`, submitData);
                showNotification('Financial Year updated successfully', 'success');
            } else {
                await api.post('finance/financial-years/', submitData);
                showNotification('Financial Year created successfully', 'success');
            }
            {
                const yr = currentYear;
                const shortEnd = String(yr + 1).slice(-2);
                setFyFormData({
                    code: `FY${yr}-${shortEnd}`, start_date: `${yr}-04-01`, end_date: `${yr + 1}-03-31`,
                    label: `FY ${yr}-${shortEnd}`, status: 'ACTIVE', is_current_fy: false,
                    first_month_of_fiscal_year: 'April', first_month_of_tax_year: 'Same as fiscal year',
                    fy_year: yr
                });
            }
            setEditingId(null);
            fetchFinancialYears();
            setShowForm(false);
        } catch (err: any) {
            const errorMsg = parseError(err, 'Failed to save Financial Year');
            showNotification(errorMsg, 'error');
        }
    };

    const handleCreateProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!productFormData.name || !productFormData.category || !productFormData.uom) {
            showNotification('Please fill in all required fields (Product Name, Category, UOM)', 'error');
            return;
        }

        try {
            if (editingId) {
                await api.patch(`products/${editingId}/`, productFormData);
                showNotification('Product/Service updated successfully', 'success');
            } else {
                await api.post('products/', productFormData);
                showNotification('Product/Service created successfully', 'success');
            }
            setProductFormData({
                product_code: '', name: '', category: 'SOFTWARE', subcategory: '',
                description: '', uom: '', standard_price: '' as any, tax_percentage: '' as any,
                hsn_sac_code: '', currency: 'INR', industry: '', status: 'ACTIVE'
            });
            setEditingId(null);
            fetchProducts();
            setShowForm(false);
        } catch (err: any) {
            const errorMsg = parseError(err, 'Failed to save Product/Service');
            setError(errorMsg);
            showNotification(errorMsg, 'error');
        }
    };

    const handleDeleteUser = async (userId: number) => {
        showConfirm({
            title: 'Delete User',
            message: 'Are you sure you want to delete this user? This action cannot be undone.',
            onConfirm: async () => {
                try {
                    await api.delete(`auth/users/${userId}/`);
                    fetchUsers();
                    showNotification('User deleted successfully', 'success');
                } catch (err: any) {
                    showNotification(parseError(err, 'Error deleting user'), 'error');
                }
            }
        });
    };

    const handleToggleStatus = async (id: number, type: 'user' | 'partner' | 'end_customer' | 'company') => {
        try {
            let endpoint = '';
            let method: 'post' | 'patch' = 'post';
            let data: any = {};

            if (type === 'user') {
                endpoint = `auth/users/${id}/toggle_status/`;
            } else if (type === 'partner') {
                const p = partners.find(p => p.id === id);
                if (!p) return;
                endpoint = `finance/customer-partners/${id}/`;
                method = 'patch';
                data = { status: p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' };
            } else if (type === 'end_customer') {
                const ec = endCustomers.find(ec => ec.id === id);
                if (!ec) return;
                endpoint = `finance/end-customers/${id}/`;
                method = 'patch';
                data = { status: ec.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' };
            } else {
                showNotification('Status toggle not implemented for Customer profile', 'info');
                return;
            }

            if (method === 'post') {
                await api.post(endpoint);
            } else {
                await api.patch(endpoint, data);
            }

            showNotification(`${type.replace('_', ' ')} status updated`, 'success');
            if (type === 'user') fetchUsers();
            else if (type === 'partner') fetchPartners();
            else if (type === 'end_customer') fetchEndCustomers();
            else fetchCompanies();
        } catch (err: any) {
            showNotification(parseError(err, 'Error updating status'), 'error');
        }
    };

    const handleCurrencyChange = (val: string) => {
        let symbol = '';
        switch (val) {
            case 'INR': symbol = '₹ / INR'; break;
            case 'USD': symbol = '$ / USD'; break;
            case 'EUR': symbol = '€ / EUR'; break;
        }

        if (viewMode === 'partner') {
            setPartnerFormData({
                ...partnerFormData,
                base_currency: val,
                currency_symbol: symbol
            });
        } else {
            setCompanyFormData({
                ...companyFormData,
                base_currency: val,
                currency_symbol: symbol
            });
        }
    };

    const handleGSTINChange = (val: string) => {
        const gstin = val.toUpperCase();
        let stateCode = '';
        let stateId = '';
        let pan = '';

        if (gstin.length >= 2) {
            stateCode = gstin.substring(0, 2);
            /* eslint-disable-next-line */
            // @ts-ignore
            const matchedState = states.find(s => s.code === stateCode);
            if (matchedState) {
                stateId = matchedState.id;
            }
        }

        if (gstin.length >= 12) {
            pan = gstin.substring(2, 12);
        }

        // Check for duplicate GSTIN
        const isDuplicate = viewMode === 'partner'
            ? partners.some(p => p.gstin === gstin && p.id !== editingId)
            : companies.some(c => c.gstin === gstin && c.id !== editingId);

        if (isDuplicate && gstin.length === 15) {
            showNotification('Warning: This GSTIN already exists!', 'info');
        }

        if (viewMode === 'partner') {
            setPartnerFormData({
                ...partnerFormData,
                gstin,
                state_code: stateCode,
                state: stateId || partnerFormData.state,
                pan: pan || partnerFormData.pan
            });
        } else {
            setCompanyFormData({
                ...companyFormData,
                gstin,
                state_code: stateCode,
                state: stateId || companyFormData.state,
                pan: pan || companyFormData.pan
            });
        }
    };

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchesSearch = (
                (user.username?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (user.role?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (user.first_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (user.last_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (user.mobile?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (user.department?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (user.region?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (user.employee_id?.toLowerCase() || '').includes(searchTerm.toLowerCase())
            );

            const matchesFilters = Object.entries(columnFilters).every(([key, value]) => {
                if (!value) return true;
                const itemValue = (user as any)[key]?.toString().toLowerCase() ?? '';
                return itemValue.includes(value.toLowerCase());
            });

            return matchesSearch && matchesFilters;
        });
    }, [users, searchTerm, columnFilters]);

    const filteredPartners = useMemo(() => {
        return partners.filter(partner => {
            const matchesSearch = (
                (partner.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (partner.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (partner.city?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (partner.state?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (partner.gstin?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (partner.pan?.toLowerCase() || '').includes(searchTerm.toLowerCase())
            );

            const matchesFilters = Object.entries(columnFilters).every(([key, value]) => {
                if (!value) return true;
                const itemValue = (partner as any)[key]?.toString().toLowerCase() ?? '';
                return itemValue.includes(value.toLowerCase());
            });

            return matchesSearch && matchesFilters;
        });
    }, [partners, searchTerm, columnFilters]);

    const filteredEndCustomers = useMemo(() => {
        return endCustomers.filter(ec => {
            const matchesSearch = (
                (ec.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (ec.end_customer_code?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (ec.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (ec.location?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (ec.industry?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (ec.contact_person?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (ec.phone?.toLowerCase() || '').includes(searchTerm.toLowerCase())
            );

            const matchesFilters = Object.entries(columnFilters).every(([key, value]) => {
                if (!value) return true;
                const itemValue = (ec as any)[key]?.toString().toLowerCase() ?? '';
                return itemValue.includes(value.toLowerCase());
            });

            return matchesSearch && matchesFilters;
        });
    }, [endCustomers, searchTerm, columnFilters]);

    const filteredCompanies = useMemo(() => {
        return companies.filter(company => {
            const matchesSearch = (
                (company.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (company.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (company.city?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (company.state?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (company.gstin?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (company.industry?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (company.type?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (company.mobile_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (company.phone_number?.toLowerCase() || '').includes(searchTerm.toLowerCase())
            );

            const matchesFilters = Object.entries(columnFilters).every(([key, value]) => {
                if (!value) return true;
                const itemValue = (company as any)[key]?.toString().toLowerCase() ?? '';
                return itemValue.includes(value.toLowerCase());
            });

            return matchesSearch && matchesFilters;
        });
    }, [companies, searchTerm, columnFilters]);

    const filteredFinancialYears = useMemo(() => {
        return financialYears.filter(fy => {
            const matchesSearch = (
                (fy.label?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (fy.code?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (fy.start_date?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (fy.end_date?.toLowerCase() || '').includes(searchTerm.toLowerCase())
            );

            const matchesFilters = Object.entries(columnFilters).every(([key, value]) => {
                if (!value) return true;
                const itemValue = (fy as any)[key]?.toString().toLowerCase() ?? '';
                return itemValue.includes(value.toLowerCase());
            });

            return matchesSearch && matchesFilters;
        });
    }, [financialYears, searchTerm, columnFilters]);

    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const matchesSearch = (
                (product.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (product.product_code?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (product.category?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (product.subcategory?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (product.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (product.hsn_sac_code?.toLowerCase() || '').includes(searchTerm.toLowerCase())
            );

            const matchesFilters = Object.entries(columnFilters).every(([key, value]) => {
                if (!value) return true;
                const itemValue = (product as any)[key]?.toString().toLowerCase() ?? '';
                return itemValue.includes(value.toLowerCase());
            });

            return matchesSearch && matchesFilters;
        });
    }, [products, searchTerm, columnFilters]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="animate-spin text-[#0066CC]" size={40} />
            </div>
        );
    }

    const partnerCountryIso = Country.getAllCountries().find(c => c.name === partnerFormData.country)?.isoCode;
    const partnerStateIso = partnerCountryIso ? State.getStatesOfCountry(partnerCountryIso).find(s => s.name === partnerFormData.state)?.isoCode : undefined;

    const companyCountryIso = Country.getAllCountries().find(c => c.name === companyFormData.country)?.isoCode;
    const companyStateIso = companyCountryIso ? State.getStatesOfCountry(companyCountryIso).find(s => s.name === companyFormData.state)?.isoCode : undefined;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            minHeight: 'calc(100vh - 85px)'
        }}>
            <style>{`
                input:hover, input:focus, select:hover, select:focus, textarea:hover, textarea:focus, .ae-input:hover, .ae-input:focus {
                    border-color: #FF6B00 !important;
                    box-shadow: 0 0 0 2px rgba(255, 107, 0, 0.1) !important;
                    outline: none !important;
                }
                .ae-searchable-dropdown:hover .ae-input, .ae-searchable-dropdown:focus-within .ae-input {
                    border-color: #FF6B00 !important;
                    box-shadow: 0 0 0 2px rgba(255, 107, 0, 0.1) !important;
                }
            `}</style>
            {/* Header Area */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 8px',
                marginBottom: '24px'
            }}>
                {/* Left: Heading + buttons inline */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '4px', height: '24px', background: 'var(--theme-primary)', borderRadius: '2px' }}></div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        {showForm ? (
                            viewMode === 'financial_year' ? 'Financial Year' :
                                `${editingId ? 'Edit' : 'Create New'} ${viewMode === 'user' ? 'User' :
                                    viewMode === 'partner' ? 'Company' :
                                        viewMode === 'end_customer' ? 'End user Name' :
                                            viewMode === 'product' ? 'Product / Service' :
                                                'Customer'
                                }`
                        ) : (
                            viewMode === 'user' ? 'User Management' :
                                viewMode === 'partner' ? 'Company Management' :
                                    viewMode === 'end_customer' ? 'End user Name Management' :
                                        viewMode === 'company' ? 'Customer Management' :
                                            viewMode === 'financial_year' ? 'Financial Year Management' :
                                                viewMode === 'product' ? 'Product / Service Management' :
                                                    'User Management'
                        )}
                    </h1>

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
                            onClick={() => setShowForm(false)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 16px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: !showForm ? 'var(--theme-primary)' : 'transparent',
                                color: !showForm ? 'white' : 'var(--text-secondary)',
                                boxShadow: !showForm ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                            }}
                            onMouseEnter={(e) => {
                                if (showForm) {
                                    e.currentTarget.style.background = 'rgba(255, 107, 0, 0.05)';
                                    e.currentTarget.style.color = 'var(--ae-orange)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (showForm) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                }
                            }}
                        >
                            <LayoutDashboard size={18} /> Dashboard
                        </button>
                        <button
                            onClick={() => {
                                setFormData({
                                    username: '', email: '', password: '',
                                    first_name: '', last_name: '', role: 'app_user',
                                    mobile: '', department: '', region: '', reporting_to: '', employee_id: ''
                                });
                                setPartnerFormData({
                                    name: '', contact_person: '', logo: null, address_line_1: '',
                                    country: 'India', state: '', city: '', pincode: '',
                                    phone_number: '', mobile: '', email: '', website_url: '',
                                    base_currency: 'INR',
                                    currency_symbol: '₹ / INR', decimal_places: 2,
                                    is_gst_applicable: true, gstin: '', state_code: '',
                                    msme_registered: false, msme_number: '', pan: '',
                                    tan: '', cin: '', status: 'ACTIVE', payment_terms: 'NET_30'
                                });
                                setEndCustomerFormData({
                                    end_customer_code: '',
                                    name: '', linked_partner: '', industry: '', location: '',
                                    contact_person: '', email: '', alias_name: '',
                                    status: 'ACTIVE'
                                });
                                setCompanyFormData({
                                    name: '', customer_id: '', region: '',
                                    contact_person: '', alias_name: '', logo: null, address_line_1: '',
                                    country: 'India', state: '', city: '', pincode: '', phone_number: '',
                                    mobile_number: '', email: '', website_url: '', linked_company_profile: '',
                                    industry: '', type: 'CUSTOMER',
                                    payment_terms: 'NET_30',
                                    base_currency: 'INR', currency_symbol: '₹ / INR', decimal_places: 2,
                                    is_gst_applicable: true, gstin: '', state_code: '',
                                    msme_registered: false, msme_number: '', pan: '', tan: '', cin: ''
                                });
                                setProductFormData({
                                    product_code: '', name: '', category: 'SOFTWARE', subcategory: '',
                                    description: '', uom: '', standard_price: '' as any, tax_percentage: '' as any,
                                    hsn_sac_code: '', currency: 'INR', industry: '', status: 'ACTIVE'
                                });
                                setEditingId(null);
                                setError('');
                                setCompanyError('');
                                setShowForm(true);
                            }}
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
                                background: showForm && !editingId ? 'var(--theme-primary)' : 'transparent',
                                color: showForm && !editingId ? 'white' : 'var(--text-secondary)',
                                boxShadow: showForm && !editingId ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                            }}
                            onMouseEnter={(e) => {
                                if (!showForm || editingId) {
                                    e.currentTarget.style.background = 'rgba(255, 107, 0, 0.05)';
                                    e.currentTarget.style.color = 'var(--ae-orange)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!showForm || editingId) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                }
                            }}
                        >
                            <PlusCircle size={18} /> Create New
                        </button>
                    </div>
                </div>
            </div>

            {/* Action Row - Only shown when not in form mode */}
            {
                !showForm && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '8px', gap: '16px' }}>
                        <div style={{
                            display: 'flex',
                            gap: '4px',
                            alignItems: 'center',
                            background: 'white',
                            padding: '6px',
                            borderRadius: '12px',
                            border: '1px solid var(--border-primary)',
                            boxShadow: 'var(--shadow-sm)',
                            width: 'max-content'
                        }}>
                            <button
                                onClick={() => { setViewMode('user'); setColumnFilters({}); }}
                                style={{
                                    padding: '6px 20px',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: viewMode === 'user' ? 'var(--theme-primary)' : 'transparent',
                                    color: viewMode === 'user' ? 'white' : 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <UserSquare2 size={14} /> Users
                            </button>
                            <button
                                onClick={() => { setViewMode('partner'); setColumnFilters({}); }}
                                style={{
                                    padding: '6px 20px',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: viewMode === 'partner' ? 'var(--theme-primary)' : 'transparent',
                                    color: viewMode === 'partner' ? 'white' : 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <Building2 size={14} /> Company
                            </button>
                            <button
                                onClick={() => { setViewMode('company'); setColumnFilters({}); }}
                                style={{
                                    padding: '6px 20px',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: viewMode === 'company' ? 'var(--theme-primary)' : 'transparent',
                                    color: viewMode === 'company' ? 'white' : 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <UserSquare2 size={14} /> Customer
                            </button>
                            <button
                                onClick={() => { setViewMode('end_customer'); setColumnFilters({}); }}
                                style={{
                                    padding: '6px 20px',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: viewMode === 'end_customer' ? 'var(--theme-primary)' : 'transparent',
                                    color: viewMode === 'end_customer' ? 'white' : 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <Users size={14} /> End user Name
                            </button>
                            <button
                                onClick={() => { setViewMode('financial_year'); setColumnFilters({}); }}
                                style={{
                                    padding: '6px 20px',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: viewMode === 'financial_year' ? 'var(--theme-primary)' : 'transparent',
                                    color: viewMode === 'financial_year' ? 'white' : 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <CheckCircle size={14} /> Financial Year
                            </button>
                            <button
                                onClick={() => { setViewMode('product'); setColumnFilters({}); }}
                                style={{
                                    padding: '6px 20px',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: viewMode === 'product' ? 'var(--theme-primary)' : 'transparent',
                                    color: viewMode === 'product' ? 'white' : 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <Shield size={14} /> Product / Service
                            </button>
                        </div>



                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ position: 'relative' }} ref={columnMenuRef}>
                                <button
                                    className="ae-btn-secondary"
                                    onClick={() => setShowColumnMenu(!showColumnMenu)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '6px 14px',
                                        fontSize: '0.8rem',
                                        border: showColumnMenu ? '1px solid var(--theme-primary)' : '1px solid var(--ae-gray-100)',
                                        boxShadow: showColumnMenu ? '0 0 0 2px rgba(187, 77, 0, 0.1)' : 'none'
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
                                                onClick={() => setVisibleColumns(prev => ({ ...prev, [viewMode]: ALL_COLUMNS[viewMode].map(c => c.key) }))}
                                                style={{ background: 'none', border: 'none', color: 'var(--ae-blue)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                            >
                                                Select All
                                            </button>
                                            <button
                                                onClick={() => setVisibleColumns(prev => ({ ...prev, [viewMode]: [] }))}
                                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                        {ALL_COLUMNS[viewMode]?.map(col => (
                                            <label key={col.key} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '10px 16px',
                                                fontSize: '0.85rem',
                                                color: 'var(--text-primary)',
                                                cursor: 'pointer',
                                                userSelect: 'none',
                                                borderBottom: '1px solid var(--border-primary)'
                                            }}>
                                                <div
                                                    onClick={() => toggleColumn(viewMode, col.key)}
                                                    style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        borderRadius: '4px',
                                                        border: `2px solid ${visibleColumns[viewMode].includes(col.key) ? 'var(--ae-blue)' : '#CBD5E1'}`,
                                                        background: visibleColumns[viewMode].includes(col.key) ? 'var(--ae-blue)' : 'white',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.2s',
                                                        flexShrink: 0
                                                    }}>
                                                    {visibleColumns[viewMode].includes(col.key) && <Check size={12} color="white" strokeWidth={4} />}
                                                </div>
                                                <span style={{ fontWeight: 600 }}>{col.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, overflowY: 'auto' }}>
                {showForm ? (
                    <form onSubmit={
                        viewMode === 'user' ? handleCreateUser :
                            viewMode === 'partner' ? handleCreatePartner :
                                viewMode === 'end_customer' ? handleCreateEndCustomer :
                                    viewMode === 'financial_year' ? handleCreateFinancialYear :
                                        viewMode === 'product' ? handleCreateProduct :
                                            handleCreateCompany
                    } style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{
                            background: 'white',
                            borderRadius: '12px',
                            padding: '24px',
                            border: '1px solid var(--border-primary)'
                        }}>
                            {viewMode === 'user' ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px' }}>
                                    {error && (
                                        <div style={{ padding: '10px', background: '#FFF5F5', border: '1px solid #FC8181', borderRadius: '6px', color: '#C53030', fontSize: '0.85rem', gridColumn: '1 / -1' }}>
                                            {error}
                                        </div>
                                    )}
                                    {/* 1. Username* */}
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Username <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Username"
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                            required
                                            autoComplete="off"
                                        />
                                    </div>
                                    {/* 2. Email Address* */}
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Email Address <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <input
                                            type="email"
                                            placeholder="Email Address"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                            required
                                        />
                                    </div>
                                    {/* 3. Password* */}
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Password <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <input
                                            type="password"
                                            placeholder="Password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                            required
                                            autoComplete="new-password"
                                        />
                                    </div>
                                    {/* 4. First Name* */}
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            First Name <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="First Name"
                                            value={formData.first_name}
                                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                            required
                                        />
                                    </div>
                                    {/* 5. Last Name* */}
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Last Name <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Last Name"
                                            value={formData.last_name}
                                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                            required
                                        />
                                    </div>
                                    {/* 6. Employee ID */}
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Employee ID
                                        </label>
                                        <input
                                            type="text"
                                            name="employee_id"
                                            placeholder="Enter Employee ID"
                                            value={formData.employee_id}
                                            onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                        />
                                    </div>
                                    {/* 7. Mobile Number */}
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Mobile Number
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Mobile Number"
                                            value={formData.mobile}
                                            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                        />
                                    </div>
                                    {/* 8. Department */}
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Department
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Department"
                                            value={formData.department}
                                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                        />
                                    </div>
                                    {/* 9. Region */}
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Region
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Region"
                                            value={formData.region}
                                            onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                        />
                                    </div>
                                    {/* 10. Role */}
                                    <div>
                                        <SearchableDropdown
                                            label="Role"
                                            options={[
                                                { value: 'app_admin', label: 'Admin' },
                                                { value: 'sales_head', label: 'Sales Head' },
                                                { value: 'inside_sales_head', label: 'Inside Sales Head' },
                                                { value: 'pm_head', label: 'PM Head' },
                                                { value: 'salesperson', label: 'Salesperson' },
                                                { value: 'finance_manager', label: 'Finance Manager' },
                                                { value: 'app_user', label: 'User' }
                                            ]}
                                            value={formData.role}
                                            onChange={(val) => setFormData({ ...formData, role: val as string })}
                                            placeholder="Select Role"
                                        />
                                    </div>
                                    {/* 11. Reporting To (Select Manager) */}
                                    <div>
                                        <SearchableDropdown
                                            label="Reporting To"
                                            options={users.map(u => ({ value: u.id, label: `${u.first_name || ''} ${u.last_name || ''} (${u.username})`.trim() }))}
                                            value={formData.reporting_to}
                                            onChange={(val) => setFormData({ ...formData, reporting_to: val as string })}
                                            placeholder="Select Manager"
                                        />
                                    </div>

                                </div>
                            ) : viewMode === 'partner' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                    {error && (
                                        <div style={{ padding: '10px', background: '#FFF5F5', border: '1px solid #FC8181', borderRadius: '6px', color: '#C53030', fontSize: '0.85rem' }}>
                                            {error}
                                        </div>
                                    )}
                                    {companyError && (
                                        <div style={{ padding: '10px', background: '#FFF5F5', border: '1px solid #FC8181', borderRadius: '6px', color: '#C53030', fontSize: '0.85rem' }}>
                                            {companyError}
                                        </div>
                                    )}
                                    <div className="section">
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                                            Company Basic Details
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Company Name <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Company Name"
                                                    value={partnerFormData.name}
                                                    onChange={(e) => setPartnerFormData({ ...partnerFormData, name: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Company Logo
                                                </label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ position: 'relative', flex: 1 }}>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) setPartnerFormData({ ...partnerFormData, logo: file });
                                                            }}
                                                            style={{ display: 'none' }}
                                                            id="company-logo-upload-partner"
                                                        />
                                                        <label
                                                            htmlFor="company-logo-upload-partner"
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                                padding: '6px 12px',
                                                                background: 'white',
                                                                border: '1px solid var(--border-primary)',
                                                                borderRadius: '6px',
                                                                fontSize: '0.8rem',
                                                                fontWeight: 600,
                                                                color: 'var(--text-secondary)',
                                                                cursor: 'pointer',
                                                                height: '34px',
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            <Paperclip size={14} /> {partnerFormData.logo ? 'Change Logo' : 'Upload Logo'}
                                                        </label>
                                                    </div>
                                                    {partnerFormData.logo && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0, justifyContent: 'space-between' }}>
                                                            {partnerFormData.logo instanceof File ? (
                                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }} title={partnerFormData.logo.name}>
                                                                    {partnerFormData.logo.name}
                                                                </span>
                                                            ) : (
                                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Current Logo</span>
                                                            )}
                                                            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                                                <button
                                                                    type="button"
                                                                    title="View"
                                                                    onClick={() => {
                                                                        if (partnerFormData.logo instanceof File) {
                                                                            const url = URL.createObjectURL(partnerFormData.logo);
                                                                            window.open(url, '_blank');
                                                                        } else if (typeof partnerFormData.logo === 'string') {
                                                                            window.open(partnerFormData.logo, '_blank');
                                                                        }
                                                                    }}
                                                                    style={{ background: 'none', border: 'none', color: '#718096', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                                                >
                                                                    <Eye size={14} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    title="Download"
                                                                    onClick={() => {
                                                                        const link = document.createElement('a');
                                                                        if (partnerFormData.logo instanceof File) {
                                                                            link.href = URL.createObjectURL(partnerFormData.logo);
                                                                            link.download = partnerFormData.logo.name;
                                                                        } else if (typeof partnerFormData.logo === 'string') {
                                                                            link.href = partnerFormData.logo;
                                                                            link.download = 'company_logo';
                                                                        }
                                                                        document.body.appendChild(link);
                                                                        link.click();
                                                                        document.body.removeChild(link);
                                                                    }}
                                                                    style={{ background: 'none', border: 'none', color: '#718096', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                                                >
                                                                    <Download size={14} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    title="Delete"
                                                                    onClick={() => setPartnerFormData({ ...partnerFormData, logo: null })}
                                                                    style={{ background: 'none', border: 'none', color: '#E53E3E', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>


                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Contact Person
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Contact Person"
                                                    value={partnerFormData.contact_person}
                                                    onChange={(e) => setPartnerFormData({ ...partnerFormData, contact_person: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>

                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Email Address
                                                </label>
                                                <input
                                                    type="email"
                                                    placeholder="Email Address"
                                                    value={partnerFormData.email}
                                                    onChange={(e) => setPartnerFormData({ ...partnerFormData, email: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>

                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Mobile Number
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Mobile Number"
                                                    value={partnerFormData.mobile}
                                                    onChange={(e) => setPartnerFormData({ ...partnerFormData, mobile: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Website URL
                                                </label>
                                                <input
                                                    type="url"
                                                    placeholder="Website URL"
                                                    value={partnerFormData.website_url}
                                                    onChange={(e) => setPartnerFormData({ ...partnerFormData, website_url: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="section" style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px' }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                                            Address Details
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px' }}>
                                            <div style={{ gridColumn: 'span 3' }}>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Address Line
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Address Line"
                                                    value={partnerFormData.address_line_1}
                                                    onChange={(e) => setPartnerFormData({ ...partnerFormData, address_line_1: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <SearchableDropdown
                                                    label="Country"
                                                    options={Country.getAllCountries().map(c => ({ value: c.name, label: c.name }))}
                                                    value={partnerFormData.country}
                                                    onChange={(val) => setPartnerFormData({ ...partnerFormData, country: val as string, state: '', city: '' })}
                                                    placeholder="Select Country"
                                                />
                                            </div>
                                            <div>
                                                <SearchableDropdown
                                                    label="State"
                                                    options={partnerCountryIso ? State.getStatesOfCountry(partnerCountryIso).map(s => ({ value: s.name, label: s.name })) : []}
                                                    value={partnerFormData.state}
                                                    onChange={(val) => setPartnerFormData({ ...partnerFormData, state: val as string, city: '' })}
                                                    placeholder="Select State"
                                                    disabled={!partnerCountryIso}
                                                />
                                            </div>
                                            <div>
                                                <SearchableDropdown
                                                    label="City"
                                                    options={partnerCountryIso && partnerStateIso ? City.getCitiesOfState(partnerCountryIso, partnerStateIso).map(c => ({ value: c.name, label: c.name })) : []}
                                                    value={partnerFormData.city}
                                                    onChange={(val) => setPartnerFormData({ ...partnerFormData, city: val as string })}
                                                    placeholder="Select City"
                                                    disabled={!partnerStateIso}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Pincode
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Pincode"
                                                    value={partnerFormData.pincode}
                                                    onChange={(e) => setPartnerFormData({ ...partnerFormData, pincode: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="section" style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px' }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                                            Business & Financial Settings
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px' }}>
                                            <div>
                                                <SearchableDropdown
                                                    label="Base Currency"
                                                    options={[
                                                        { value: "INR", label: "INR" },
                                                        { value: "USD", label: "USD" },
                                                        { value: "EURO", label: "EURO" }
                                                    ]}
                                                    value={partnerFormData.base_currency}
                                                    onChange={(val) => handleCurrencyChange(val as string)}
                                                    placeholder="Select Currency"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Symbol
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="INR"
                                                    readOnly
                                                    value={partnerFormData.currency_symbol}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: '#f7fafc', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', outline: 'none', cursor: 'not-allowed' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Decimal Places <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    placeholder="2"
                                                    min="0"
                                                    max="4"
                                                    required
                                                    value={partnerFormData.decimal_places}
                                                    onChange={(e) => setPartnerFormData({ ...partnerFormData, decimal_places: e.target.value === '' ? '' : parseInt(e.target.value) })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <SearchableDropdown
                                                    label="Payment Terms"
                                                    options={[
                                                        { value: 'IMMEDIATE', label: 'Immediate' },
                                                        { value: 'NET_30', label: '30 Days' },
                                                        { value: 'NET_45', label: '45 Days' },
                                                        { value: 'NET_60', label: '60 Days' },
                                                        { value: 'NET_90', label: '90 Days' }
                                                    ]}
                                                    value={(partnerFormData as any).payment_terms || 'NET_30'}
                                                    onChange={(val) => setPartnerFormData({ ...partnerFormData, payment_terms: val as string })}
                                                    placeholder="Select Payment Terms"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="section" style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px' }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                                            Tax Registration Details
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 5', marginBottom: '8px' }}>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Tax Configuration</label>
                                                <div
                                                    onClick={() => setPartnerFormData({ ...partnerFormData, is_gst_applicable: !partnerFormData.is_gst_applicable })}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        cursor: 'pointer',
                                                        background: partnerFormData.is_gst_applicable ? '#EBF8FF' : '#F8FAFC',
                                                        padding: '0 16px',
                                                        height: '38px',
                                                        borderRadius: '8px',
                                                        border: `1px solid ${partnerFormData.is_gst_applicable ? 'var(--ae-blue)' : '#E2E8F0'}`,
                                                        width: 'fit-content',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        borderRadius: '4px',
                                                        border: `2px solid ${partnerFormData.is_gst_applicable ? 'var(--ae-blue)' : '#CBD5E1'}`,
                                                        background: partnerFormData.is_gst_applicable ? 'var(--ae-blue)' : 'white',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.2s'
                                                    }}>
                                                        {partnerFormData.is_gst_applicable && <Check size={12} color="white" strokeWidth={4} />}
                                                    </div>
                                                    <span style={{
                                                        fontSize: '0.85rem',
                                                        fontWeight: 700,
                                                        color: partnerFormData.is_gst_applicable ? 'var(--ae-blue)' : '#64748B'
                                                    }}>
                                                        GST Applicable
                                                    </span>
                                                </div>
                                            </div>
                                            {partnerFormData.is_gst_applicable && (
                                                <>
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                            GSTIN
                                                        </label>
                                                        <input
                                                            type="text"
                                                            placeholder="GSTIN"
                                                            value={partnerFormData.gstin}
                                                            onChange={(e) => handleGSTINChange(e.target.value)}
                                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                            State Code
                                                        </label>
                                                        <input
                                                            type="text"
                                                            placeholder="State Code"
                                                            value={partnerFormData.state_code}
                                                            onChange={(e) => setPartnerFormData({ ...partnerFormData, state_code: e.target.value })}
                                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                        />
                                                    </div>
                                                </>
                                            )}
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    PAN
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="PAN"
                                                    value={partnerFormData.pan}
                                                    onChange={(e) => setPartnerFormData({ ...partnerFormData, pan: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    TAN
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="TAN"
                                                    value={partnerFormData.tan}
                                                    onChange={(e) => setPartnerFormData({ ...partnerFormData, tan: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    CIN
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="CIN"
                                                    value={partnerFormData.cin}
                                                    onChange={(e) => setPartnerFormData({ ...partnerFormData, cin: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="section" style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px' }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                                            MSME Details
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 5', marginBottom: '8px' }}>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Registration Status</label>
                                                <div
                                                    onClick={() => setPartnerFormData({ ...partnerFormData, msme_registered: !partnerFormData.msme_registered })}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        cursor: 'pointer',
                                                        background: partnerFormData.msme_registered ? '#EBF8FF' : '#F8FAFC',
                                                        padding: '0 16px',
                                                        height: '38px',
                                                        borderRadius: '8px',
                                                        border: `1px solid ${partnerFormData.msme_registered ? 'var(--ae-blue)' : '#E2E8F0'}`,
                                                        width: 'fit-content',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        borderRadius: '4px',
                                                        border: `2px solid ${partnerFormData.msme_registered ? 'var(--ae-blue)' : '#CBD5E1'}`,
                                                        background: partnerFormData.msme_registered ? 'var(--ae-blue)' : 'white',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.2s'
                                                    }}>
                                                        {partnerFormData.msme_registered && <Check size={12} color="white" strokeWidth={4} />}
                                                    </div>
                                                    <span style={{
                                                        fontSize: '0.85rem',
                                                        fontWeight: 700,
                                                        color: partnerFormData.msme_registered ? 'var(--ae-blue)' : '#64748B'
                                                    }}>
                                                        MSME Registered
                                                    </span>
                                                </div>
                                            </div>
                                            {partnerFormData.msme_registered && (
                                                <div>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                        MSME Number
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="MSME Number"
                                                        value={partnerFormData.msme_number}
                                                        onChange={(e) => setPartnerFormData({ ...partnerFormData, msme_number: e.target.value })}
                                                        style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : viewMode === 'end_customer' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                    {error && (
                                        <div style={{ padding: '10px', background: '#FFF5F5', border: '1px solid #FC8181', borderRadius: '6px', color: '#C53030', fontSize: '0.85rem' }}>
                                            {error}
                                        </div>
                                    )}
                                    <div className="section">
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                                            Identification Details
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    End Customer Code <span style={{ fontSize: '0.7rem', color: '#A0AEC0', fontWeight: 500 }}>(Auto-generated)</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Auto-generated"
                                                    value={endCustomerFormData.end_customer_code}
                                                    readOnly
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: '#F7F8FA', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#718096', outline: 'none', cursor: 'not-allowed' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    End User Name <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="End User Name"
                                                    value={endCustomerFormData.name}
                                                    onChange={(e) => setEndCustomerFormData({ ...endCustomerFormData, name: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Alias Name <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Alias Name"
                                                    value={endCustomerFormData.alias_name}
                                                    onChange={(e) => setEndCustomerFormData({ ...endCustomerFormData, alias_name: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <SearchableDropdown
                                                    label="Status"
                                                    options={[
                                                        { value: 'ACTIVE', label: 'Active' },
                                                        { value: 'INACTIVE', label: 'Inactive' }
                                                    ]}
                                                    value={endCustomerFormData.status}
                                                    onChange={(val) => setEndCustomerFormData({ ...endCustomerFormData, status: val as string })}
                                                    placeholder="Select Status"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="section" style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px' }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                                            Business Classification
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px' }}>
                                            <div>
                                                <SearchableDropdown
                                                    label="Industry"
                                                    options={[
                                                        { value: 'IT', label: 'IT' },
                                                        { value: 'BFSI', label: 'BFSI' },
                                                        { value: 'Manufacturing', label: 'Manufacturing' },
                                                        { value: 'Healthcare', label: 'Healthcare' },
                                                        { value: 'Retail', label: 'Retail' },
                                                        { value: 'Telecom', label: 'Telecom' },
                                                        { value: 'Education', label: 'Education' },
                                                        { value: 'Government', label: 'Government' },
                                                        { value: 'Automotive', label: 'Automotive' },
                                                        { value: 'FMCG', label: 'FMCG' },
                                                        { value: 'Other', label: 'Other' }
                                                    ]}
                                                    value={endCustomerFormData.industry}
                                                    onChange={(val) => setEndCustomerFormData({ ...endCustomerFormData, industry: val as string })}
                                                    placeholder="Select Industry"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <SearchableDropdown
                                                    label="Linked Partner * (Select Partner)"
                                                    options={partners.map(p => ({ value: String(p.id), label: p.name }))}
                                                    value={endCustomerFormData.linked_partner}
                                                    onChange={(val) => setEndCustomerFormData({ ...endCustomerFormData, linked_partner: val as string })}
                                                    placeholder="Select Partner"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="section" style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px' }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                                            Contact & Location Details
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Location <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Location"
                                                    value={endCustomerFormData.location}
                                                    onChange={(e) => setEndCustomerFormData({ ...endCustomerFormData, location: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Contact Person <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Contact Person"
                                                    value={endCustomerFormData.contact_person}
                                                    onChange={(e) => setEndCustomerFormData({ ...endCustomerFormData, contact_person: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Email <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                                </label>
                                                <input
                                                    type="email"
                                                    placeholder="Email"
                                                    value={endCustomerFormData.email}
                                                    onChange={(e) => setEndCustomerFormData({ ...endCustomerFormData, email: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : viewMode === 'financial_year' ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px' }}>
                                    {error && (
                                        <div style={{ padding: '10px', background: '#FFF5F5', border: '1px solid #FC8181', borderRadius: '6px', color: '#C53030', fontSize: '0.85rem', gridColumn: 'span 5' }}>
                                            {error}
                                        </div>
                                    )}
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Year <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 2025"
                                            value={fyFormData.fy_year}
                                            onChange={(e) => handleFYYearChange(Number(e.target.value))}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                            required
                                            min={2000}
                                            max={2099}
                                        />
                                        <div style={{ fontSize: '0.7rem', color: '#718096', marginTop: '4px' }}>
                                            Auto: {fyFormData.label} ({fyFormData.start_date} to {fyFormData.end_date})
                                        </div>
                                    </div>
                                    <div>
                                        <SearchableDropdown
                                            label="First month of fiscal year"
                                            options={monthNames.map(month => ({ value: month, label: month }))}
                                            value={fyFormData.first_month_of_fiscal_year}
                                            onChange={(val) => handleFiscalMonthChange(val as string)}
                                            placeholder="Select Month"
                                        />
                                    </div>
                                    <div>
                                        <SearchableDropdown
                                            label="First month of tax year"
                                            options={[
                                                { value: 'Same as fiscal year', label: 'Same as fiscal year' },
                                                ...monthNames.map(month => ({ value: month, label: month }))
                                            ]}
                                            value={fyFormData.first_month_of_tax_year}
                                            onChange={(val) => setFyFormData({ ...fyFormData, first_month_of_tax_year: val as string })}
                                            placeholder="Select Month"
                                        />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '24px' }}>
                                        <input
                                            type="checkbox"
                                            id="is_current_fy"
                                            checked={fyFormData.is_current_fy}
                                            onChange={(e) => setFyFormData({ ...fyFormData, is_current_fy: e.target.checked })}
                                        />
                                        <label htmlFor="is_current_fy" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black' }}>Current Financial Year</label>
                                    </div>
                                </div>
                            ) : viewMode === 'product' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                    {error && (
                                        <div style={{ padding: '10px', background: '#FFF5F5', border: '1px solid #FC8181', borderRadius: '6px', color: '#C53030', fontSize: '0.85rem' }}>
                                            {error}
                                        </div>
                                    )}

                                    <div className="section">
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                                            Identification Details
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Product Code <span style={{ fontSize: '0.7rem', color: '#A0AEC0', fontWeight: 500 }}>(Auto-generated)</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Auto-generated"
                                                    value={productFormData.product_code}
                                                    readOnly
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: '#F7F8FA', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#718096', outline: 'none', cursor: 'not-allowed' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Product / Service Name <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Product / Service Name"
                                                    value={productFormData.name}
                                                    onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <SearchableDropdown
                                                    label="Status"
                                                    options={[
                                                        { value: 'ACTIVE', label: 'Active' },
                                                        { value: 'INACTIVE', label: 'Inactive' }
                                                    ]}
                                                    value={productFormData.status}
                                                    onChange={(val) => setProductFormData({ ...productFormData, status: val as string })}
                                                    placeholder="Select Status"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="section" style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px' }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                                            Classification Details
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px' }}>
                                            <div>
                                                <SearchableDropdown
                                                    label="Category"
                                                    options={[
                                                        { value: 'SOFTWARE', label: 'Software' },
                                                        { value: 'SERVICE', label: 'Service' }
                                                    ]}
                                                    value={productFormData.category}
                                                    onChange={(val) => setProductFormData({ ...productFormData, category: val as string })}
                                                    placeholder="Select Category"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <SearchableDropdown
                                                    label="Subcategory"
                                                    options={[
                                                        { value: 'Automation', label: 'Automation' },
                                                        { value: 'Analytics', label: 'Analytics' },
                                                        { value: 'Cloud', label: 'Cloud' },
                                                        { value: 'Consulting', label: 'Consulting' },
                                                        { value: 'Implementation', label: 'Implementation' },
                                                        { value: 'Integration', label: 'Integration' },
                                                        { value: 'Licensing', label: 'Licensing' },
                                                        { value: 'Maintenance', label: 'Maintenance' },
                                                        { value: 'Support', label: 'Support' },
                                                        { value: 'Training', label: 'Training' },
                                                        { value: 'Other', label: 'Other' }
                                                    ]}
                                                    value={productFormData.subcategory}
                                                    onChange={(val) => setProductFormData({ ...productFormData, subcategory: val as string })}
                                                    placeholder="Select Subcategory"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    HSN / SAC Code <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="HSN / SAC Code"
                                                    value={productFormData.hsn_sac_code}
                                                    onChange={(e) => setProductFormData({ ...productFormData, hsn_sac_code: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <SearchableDropdown
                                                    label="Industry (Optional)"
                                                    options={[
                                                        { value: 'IT', label: 'IT' },
                                                        { value: 'BFSI', label: 'BFSI' },
                                                        { value: 'Manufacturing', label: 'Manufacturing' },
                                                        { value: 'Healthcare', label: 'Healthcare' },
                                                        { value: 'Retail', label: 'Retail' },
                                                        { value: 'Telecom', label: 'Telecom' },
                                                        { value: 'Education', label: 'Education' },
                                                        { value: 'Government', label: 'Government' },
                                                        { value: 'Automotive', label: 'Automotive' },
                                                        { value: 'FMCG', label: 'FMCG' },
                                                        { value: 'Other', label: 'Other' }
                                                    ]}
                                                    value={productFormData.industry}
                                                    onChange={(val) => setProductFormData({ ...productFormData, industry: val as string })}
                                                    placeholder="Select Industry"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="section" style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px' }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                                            Description & Measurement
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px' }}>
                                            <div style={{ gridColumn: 'span 4' }}>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Description <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                                </label>
                                                <textarea
                                                    placeholder="Description"
                                                    className="ae-input"
                                                    value={productFormData.description}
                                                    onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                                                    style={{ width: '100%', height: '48px', padding: '8px 12px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none', resize: 'none' }}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <SearchableDropdown
                                                    label="Unit of Measure (UOM)"
                                                    options={[
                                                        { value: 'License', label: 'License' },
                                                        { value: 'Hour', label: 'Hour' },
                                                        { value: 'Day', label: 'Day' },
                                                        { value: 'Month', label: 'Month' },
                                                        { value: 'Year', label: 'Year' },
                                                        { value: 'Unit', label: 'Unit' },
                                                        { value: 'Project', label: 'Project' },
                                                        { value: 'User', label: 'User' },
                                                        { value: 'Other', label: 'Other' }
                                                    ]}
                                                    value={productFormData.uom}
                                                    onChange={(val) => setProductFormData({ ...productFormData, uom: val as string })}
                                                    placeholder="Select UOM"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="section" style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px' }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                                            Pricing & Taxation
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px' }}>
                                            <div>
                                                <SearchableDropdown
                                                    label="Currency"
                                                    options={[
                                                        { value: 'INR', label: 'INR' },
                                                        { value: 'USD', label: 'USD' },
                                                        { value: 'EURO', label: 'EURO' }
                                                    ]}
                                                    value={productFormData.currency}
                                                    onChange={(val) => setProductFormData({ ...productFormData, currency: val as string })}
                                                    placeholder="Select Currency"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Standard Price <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    placeholder="Standard Price"
                                                    value={productFormData.standard_price}
                                                    onChange={(e) => setProductFormData({ ...productFormData, standard_price: e.target.value === '' ? '' : Number(e.target.value) })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Tax Percentage <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    placeholder="Tax Percentage"
                                                    value={productFormData.tax_percentage}
                                                    onChange={(e) => setProductFormData({ ...productFormData, tax_percentage: e.target.value === '' ? '' : Number(e.target.value) })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                    {/* Company Form Content */}
                                    {companyError && (
                                        <div style={{ padding: '10px', background: '#FFF5F5', border: '1px solid #FC8181', borderRadius: '6px', color: '#C53030', fontSize: '0.85rem' }}>
                                            {companyError}
                                        </div>
                                    )}

                                    <div className="section">
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                                            Customer Basic Details
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px' }}>
                                            <div>
                                                <SearchableDropdown
                                                    label="Company Name (Select Company)"
                                                    options={partners.map(p => ({ value: String(p.id), label: p.name }))}
                                                    value={String(companyFormData.linked_company_profile || '')}
                                                    onChange={(val) => setCompanyFormData({ ...companyFormData, linked_company_profile: val as string })}
                                                    placeholder="Select Company"
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Customer Name <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Customer Name"
                                                    value={companyFormData.name}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, name: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Alias Name <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Alias Name"
                                                    value={companyFormData.alias_name}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, alias_name: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'black', outline: 'none' }}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Customer ID
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Customer ID"
                                                    value={companyFormData.customer_id}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, customer_id: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <SearchableDropdown
                                                    label="Industry"
                                                    options={[
                                                        { value: 'IT', label: 'IT' },
                                                        { value: 'BFSI', label: 'BFSI' },
                                                        { value: 'Manufacturing', label: 'Manufacturing' },
                                                        { value: 'Healthcare', label: 'Healthcare' },
                                                        { value: 'Retail', label: 'Retail' },
                                                        { value: 'Telecom', label: 'Telecom' },
                                                        { value: 'Education', label: 'Education' },
                                                        { value: 'Government', label: 'Government' },
                                                        { value: 'Automotive', label: 'Automotive' },
                                                        { value: 'FMCG', label: 'FMCG' },
                                                        { value: 'Other', label: 'Other' }
                                                    ]}
                                                    value={companyFormData.industry}
                                                    onChange={(val) => setCompanyFormData({ ...companyFormData, industry: val as string })}
                                                    placeholder="Select Industry"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Region
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Region"
                                                    value={companyFormData.region}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, region: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Company Logo
                                                </label>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '6px 10px',
                                                    background: 'white',
                                                    borderRadius: '6px',
                                                    border: '1px solid var(--border-primary)',
                                                    height: '34px',
                                                    width: '100%'
                                                }}>
                                                    <input
                                                        type="file"
                                                        id="logo-upload"
                                                        accept="image/*"
                                                        style={{ display: 'none' }}
                                                        onChange={(e) => setCompanyFormData({ ...companyFormData, logo: e.target.files ? e.target.files[0] : null })}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => document.getElementById('logo-upload')?.click()}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            background: 'white',
                                                            color: '#1a1f36',
                                                            border: '1px solid #E0E6ED',
                                                            height: '24px',
                                                            padding: '0 8px',
                                                            borderRadius: '4px',
                                                            fontWeight: 600,
                                                            fontSize: '0.75rem',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        <Paperclip size={12} /> Upload Logo
                                                    </button>
                                                    <div style={{ flex: 1, display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 0', alignItems: 'center' }}>
                                                        {companyFormData.logo && companyFormData.logo instanceof File && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0, justifyContent: 'space-between' }}>
                                                                <span style={{ fontSize: '0.85rem', color: '#4A5568', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }} title={companyFormData.logo.name}>
                                                                    {companyFormData.logo.name}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {companyFormData.logo && typeof companyFormData.logo === 'string' && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0, justifyContent: 'space-between' }}>
                                                                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#4A5568', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }} title="Current Logo">Current Logo</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="section" style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px' }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                                            Contact Details
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Contact Person
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Contact Person"
                                                    value={companyFormData.contact_person}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, contact_person: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Email Address
                                                </label>
                                                <input
                                                    type="email"
                                                    placeholder="Email Address"
                                                    value={companyFormData.email}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, email: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Mobile Number
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Mobile Number"
                                                    value={companyFormData.mobile_number}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, mobile_number: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Website URL
                                                </label>
                                                <input
                                                    type="url"
                                                    placeholder="Website URL"
                                                    value={companyFormData.website_url}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, website_url: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="section" style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px' }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                                            Address Details
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px' }}>
                                            <div style={{ gridColumn: 'span 3' }}>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Address Line
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Address Line"
                                                    value={companyFormData.address_line_1}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, address_line_1: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <SearchableDropdown
                                                    label="Country"
                                                    options={Country.getAllCountries().map(c => ({ value: c.name, label: c.name }))}
                                                    value={companyFormData.country}
                                                    onChange={(val) => setCompanyFormData({ ...companyFormData, country: val as string, state: '', city: '' })}
                                                    placeholder="Select Country"
                                                />
                                            </div>
                                            <div>
                                                <SearchableDropdown
                                                    label="State"
                                                    options={companyCountryIso ? State.getStatesOfCountry(companyCountryIso).map(s => ({ value: s.name, label: s.name })) : []}
                                                    value={companyFormData.state}
                                                    onChange={(val) => setCompanyFormData({ ...companyFormData, state: val as string, city: '' })}
                                                    placeholder="Select State"
                                                    disabled={!companyCountryIso}
                                                />
                                            </div>
                                            <div>
                                                <SearchableDropdown
                                                    label="City"
                                                    options={companyCountryIso && companyStateIso ? City.getCitiesOfState(companyCountryIso, companyStateIso).map(c => ({ value: c.name, label: c.name })) : []}
                                                    value={companyFormData.city}
                                                    onChange={(val) => setCompanyFormData({ ...companyFormData, city: val as string })}
                                                    placeholder="Select City"
                                                    disabled={!companyStateIso}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Pincode
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Pincode"
                                                    value={companyFormData.pincode}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, pincode: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="section" style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px' }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                                            Business & Financial Settings
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px' }}>
                                            <div>
                                                <SearchableDropdown
                                                    label="Base Currency (INR – Indian Rupee)"
                                                    options={[
                                                        { value: "INR", label: "INR - Indian Rupee" },
                                                        { value: "USD", label: "USD - US Dollar" },
                                                        { value: "EUR", label: "EUR - Euro" }
                                                    ]}
                                                    value={companyFormData.base_currency}
                                                    onChange={(val) => handleCurrencyChange(val as string)}
                                                    placeholder="Select Currency"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Currency Symbol (₹ / INR)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={companyFormData.currency_symbol}
                                                    readOnly
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: '#f7fafc', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Decimal Places (Default: 2)
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="2"
                                                    value={companyFormData.decimal_places}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, decimal_places: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <SearchableDropdown
                                                    label="Payment Terms"
                                                    options={[
                                                        { value: 'NET_15', label: '15 Days' },
                                                        { value: 'NET_30', label: '30 Days' },
                                                        { value: 'NET_45', label: '45 Days' },
                                                        { value: 'NET_60', label: '60 Days' },
                                                        { value: 'DUE_ON_RECEIPT', label: 'Due on Receipt' }
                                                    ]}
                                                    value={companyFormData.payment_terms}
                                                    onChange={(val) => setCompanyFormData({ ...companyFormData, payment_terms: val as string })}
                                                    placeholder="Select Payment Terms"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="section" style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px' }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                                            Tax Registration Details
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 5', marginBottom: '8px' }}>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Tax Configuration</label>
                                                <div
                                                    onClick={() => setCompanyFormData({ ...companyFormData, is_gst_applicable: !companyFormData.is_gst_applicable })}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        cursor: 'pointer',
                                                        background: companyFormData.is_gst_applicable ? '#EBF8FF' : '#F8FAFC',
                                                        padding: '0 16px',
                                                        height: '38px',
                                                        borderRadius: '8px',
                                                        border: `1px solid ${companyFormData.is_gst_applicable ? 'var(--ae-blue)' : '#E2E8F0'}`,
                                                        width: 'fit-content',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        borderRadius: '4px',
                                                        border: `2px solid ${companyFormData.is_gst_applicable ? 'var(--ae-blue)' : '#CBD5E1'}`,
                                                        background: companyFormData.is_gst_applicable ? 'var(--ae-blue)' : 'white',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.2s'
                                                    }}>
                                                        {companyFormData.is_gst_applicable && <Check size={12} color="white" strokeWidth={4} />}
                                                    </div>
                                                    <span style={{
                                                        fontSize: '0.85rem',
                                                        fontWeight: 700,
                                                        color: companyFormData.is_gst_applicable ? 'var(--ae-blue)' : '#64748B'
                                                    }}>
                                                        GST Applicable
                                                    </span>
                                                </div>
                                            </div>
                                            {companyFormData.is_gst_applicable && (
                                                <>
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                            GSTIN
                                                        </label>
                                                        <input
                                                            type="text"
                                                            placeholder="GSTIN"
                                                            value={companyFormData.gstin}
                                                            onChange={(e) => handleGSTINChange(e.target.value)}
                                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                            State Code
                                                        </label>
                                                        <input
                                                            type="text"
                                                            placeholder="State Code"
                                                            value={companyFormData.state_code}
                                                            onChange={(e) => setCompanyFormData({ ...companyFormData, state_code: e.target.value })}
                                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                        />
                                                    </div>
                                                </>
                                            )}
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    PAN
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="PAN"
                                                    value={companyFormData.pan}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, pan: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    TAN
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="TAN"
                                                    value={companyFormData.tan}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, tan: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    CIN
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="CIN"
                                                    value={companyFormData.cin}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, cin: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="section" style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px' }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                                            MSME Details
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 5', marginBottom: '8px' }}>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Registration Status</label>
                                                <div
                                                    onClick={() => setCompanyFormData({ ...companyFormData, msme_registered: !companyFormData.msme_registered })}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        cursor: 'pointer',
                                                        background: companyFormData.msme_registered ? '#EBF8FF' : '#F8FAFC',
                                                        padding: '0 16px',
                                                        height: '38px',
                                                        borderRadius: '8px',
                                                        border: `1px solid ${companyFormData.msme_registered ? 'var(--ae-blue)' : '#E2E8F0'}`,
                                                        width: 'fit-content',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        borderRadius: '4px',
                                                        border: `2px solid ${companyFormData.msme_registered ? 'var(--ae-blue)' : '#CBD5E1'}`,
                                                        background: companyFormData.msme_registered ? 'var(--ae-blue)' : 'white',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.2s'
                                                    }}>
                                                        {companyFormData.msme_registered && <Check size={12} color="white" strokeWidth={4} />}
                                                    </div>
                                                    <span style={{
                                                        fontSize: '0.85rem',
                                                        fontWeight: 700,
                                                        color: companyFormData.msme_registered ? 'var(--ae-blue)' : '#64748B'
                                                    }}>
                                                        MSME Registered
                                                    </span>
                                                </div>
                                            </div>
                                            {companyFormData.msme_registered && (
                                                <div>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                        MSME Number
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="MSME Number"
                                                        value={companyFormData.msme_number}
                                                        onChange={(e) => setCompanyFormData({ ...companyFormData, msme_number: e.target.value })}
                                                        style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                            }
                        </div >
                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '4px',
                            background: 'white',
                            padding: '6px',
                            borderRadius: '12px',
                            border: '1px solid #E0E6ED',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                            width: 'fit-content',
                            marginLeft: 'auto'
                        }}>
                            <button
                                type="submit"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 20px',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    background: isCancelActive ? 'transparent' : 'var(--theme-primary)',
                                    color: isCancelActive ? 'var(--text-secondary)' : 'white',
                                    border: 'none',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.23s'
                                }}
                            >
                                <CheckCircle size={16} /> {
                                    viewMode === 'user' ? (editingId ? 'Update User' : 'Create User') :
                                        viewMode === 'partner' ? (editingId ? 'Update Company' : 'Save Company Record') :
                                            viewMode === 'end_customer' ? (editingId ? 'Update End Customer' : 'Save End Customer Record') :
                                                viewMode === 'financial_year' ? (editingId ? 'Update FY' : 'Save FY Record') :
                                                    viewMode === 'product' ? (editingId ? 'Update Product' : 'Save Product Record') :
                                                        (editingId ? 'Update Customer' : 'Save Customer Record')
                                }
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCancelActive(true);
                                    showConfirm({
                                        title: 'Are you sure you want to exit?',
                                        onConfirm: () => {
                                            setShowForm(false);
                                            setEditingId(null);
                                            setIsCancelActive(false);
                                        },
                                        onCancel: () => setIsCancelActive(false)
                                    });
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 20px',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    background: isCancelActive ? 'var(--theme-primary)' : 'transparent',
                                    color: isCancelActive ? 'white' : '#718096',
                                    border: 'none',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.23s'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isCancelActive) {
                                        e.currentTarget.style.background = 'rgba(255, 107, 0, 0.05)';
                                        e.currentTarget.style.color = 'var(--ae-orange)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isCancelActive) {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = '#718096';
                                    }
                                }}
                            >
                                <X size={16} /> Cancel
                            </button>
                        </div>
                    </form >
                ) : (
                    <div style={{ position: 'relative' }}>
                        {/* Scroll Buttons */}
                        <button
                            onClick={() => tableScrollRef.current?.scrollBy({ left: -150, behavior: 'smooth' })}
                            style={{
                                position: 'absolute', left: '-8px', top: '50%', transform: 'translateY(-50%)',
                                zIndex: 100, width: '36px', height: '36px', borderRadius: '50%',
                                background: 'var(--bg-primary)', border: '1px solid var(--border-primary)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                color: 'var(--text-primary)', transition: 'all 0.2s',
                            }}
                            title="Scroll left"
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--theme-primary)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--theme-primary)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-primary)'; }}
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            onClick={() => tableScrollRef.current?.scrollBy({ left: 150, behavior: 'smooth' })}
                            style={{
                                position: 'absolute', right: '-8px', top: '50%', transform: 'translateY(-50%)',
                                zIndex: 100, width: '36px', height: '36px', borderRadius: '50%',
                                background: 'var(--bg-primary)', border: '1px solid var(--border-primary)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                color: 'var(--text-primary)', transition: 'all 0.2s',
                            }}
                            title="Scroll right"
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--theme-primary)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--theme-primary)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-primary)'; }}
                        >
                            <ChevronRight size={18} />
                        </button>

                        <div ref={tableScrollRef} style={{ overflowX: 'auto', background: 'var(--bg-primary)', borderRadius: '0', border: '1px solid var(--border-primary)' }}>
                            <table className="ae-table" style={{ tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}>
                                <colgroup>
                                    {ALL_COLUMNS[viewMode]?.filter(col => visibleColumns[viewMode].includes(col.key)).map(col => (
                                        <col key={col.key} style={{ width: `${getColWidth(col.key)}px` }} />
                                    ))}
                                    <col style={{ width: '120px' }} />
                                </colgroup>
                                <thead>
                                    <tr>
                                        {ALL_COLUMNS[viewMode]?.filter(col => visibleColumns[viewMode].includes(col.key)).map(col => (
                                            <th key={col.key} style={{
                                                backgroundColor: 'var(--ae-table-header-bg)',
                                                zIndex: 12,
                                                position: 'relative',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                userSelect: 'none',
                                                paddingRight: '20px',
                                                borderRight: '1px solid var(--border-secondary)',
                                                borderBottom: '1px solid var(--border-secondary)'
                                            }}>
                                                <span style={{ fontWeight: 600 }}>{col.label}</span>
                                                {/* Resize handle */}
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
                                                        zIndex: 20,
                                                    }}
                                                    title="Drag to resize"
                                                />
                                            </th>
                                        ))}
                                        <th style={{ backgroundColor: 'var(--ae-table-header-bg)', zIndex: 12, textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border-secondary)' }}>
                                            Actions
                                        </th>
                                    </tr>
                                    {/* Filter Row */}
                                    <tr style={{ background: 'var(--ae-filter-row-bg)' }}>
                                        {ALL_COLUMNS[viewMode]?.filter(col => visibleColumns[viewMode].includes(col.key)).map(col => (
                                            <th key={`filter-${col.key}`} style={{ backgroundColor: 'var(--ae-filter-row-bg)', borderRight: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>
                                                <div className="ae-input-group" style={{ margin: 0 }}>
                                                    <input
                                                        className="ae-input"
                                                        placeholder="Filter..."
                                                        value={columnFilters[col.key] || ''}
                                                        onChange={(e) => setColumnFilters({ ...columnFilters, [col.key]: e.target.value })}
                                                        style={{ height: '24px', fontSize: '11px', padding: '0 8px', borderRadius: '4px', border: '1px solid var(--border-primary)', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: '100%' }}
                                                    />
                                                </div>
                                            </th>
                                        ))}
                                        <th style={{ textAlign: 'center', backgroundColor: 'var(--ae-filter-row-bg)', borderBottom: '1px solid var(--border-secondary)', padding: '0 8px' }}>
                                            <button
                                                onClick={() => setColumnFilters({})}
                                                style={{ height: '24px', width: '100%', fontSize: '10px', color: 'var(--theme-primary)', fontWeight: 700, cursor: 'pointer', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: '6px', transition: 'all 0.2s' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--theme-primary)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--theme-primary)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-primary)'; e.currentTarget.style.color = 'var(--theme-primary)'; e.currentTarget.style.borderColor = 'var(--border-primary)'; }}
                                            >
                                                Clear
                                            </button>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(viewMode === 'user' ? filteredUsers :
                                        viewMode === 'partner' ? filteredPartners :
                                            viewMode === 'end_customer' ? filteredEndCustomers :
                                                viewMode === 'company' ? filteredCompanies :
                                                    viewMode === 'financial_year' ? filteredFinancialYears :
                                                        filteredProducts
                                    ).slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((item) => (
                                        <tr key={item.id}>
                                            {ALL_COLUMNS[viewMode]?.filter(col => visibleColumns[viewMode].includes(col.key)).map(col => (
                                                <td key={col.key}>
                                                    {renderCell(viewMode, item, col.key)}
                                                </td>
                                            ))}
                                            {/* Action Column Body */}
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                    {viewMode === 'user' ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleToggleStatus(item.id, 'user')}
                                                                title={item.is_active ? "Deactivate User" : "Activate User"}
                                                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', background: 'rgba(187, 77, 0, 0.07)', color: 'var(--theme-primary)', border: '1px solid rgba(187, 77, 0, 0.25)', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.18s' }}
                                                                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--theme-primary)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--theme-primary)'; }}
                                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(187, 77, 0, 0.07)'; e.currentTarget.style.color = 'var(--theme-primary)'; e.currentTarget.style.borderColor = 'rgba(187, 77, 0, 0.25)'; }}
                                                            >
                                                                <Power size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleEditClick(viewMode, item)}
                                                                title="Edit User"
                                                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', background: 'rgba(187, 77, 0, 0.07)', color: 'var(--theme-primary)', border: '1px solid rgba(187, 77, 0, 0.25)', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.18s' }}
                                                                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--theme-primary)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--theme-primary)'; }}
                                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(187, 77, 0, 0.07)'; e.currentTarget.style.color = 'var(--theme-primary)'; e.currentTarget.style.borderColor = 'rgba(187, 77, 0, 0.25)'; }}
                                                            >
                                                                <Pencil size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteUser(item.id)}
                                                                title="Delete User"
                                                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', background: 'rgba(220, 38, 38, 0.07)', color: '#dc2626', border: '1px solid rgba(220, 38, 38, 0.25)', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.18s' }}
                                                                onMouseEnter={(e) => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#dc2626'; }}
                                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(220, 38, 38, 0.07)'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.25)'; }}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleEditClick(viewMode, item)}
                                                            title="View"
                                                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', background: 'rgba(187, 77, 0, 0.07)', color: 'var(--theme-primary)', border: '1px solid rgba(187, 77, 0, 0.25)', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.18s' }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--theme-primary)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--theme-primary)'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(187, 77, 0, 0.07)'; e.currentTarget.style.color = 'var(--theme-primary)'; e.currentTarget.style.borderColor = 'rgba(187, 77, 0, 0.25)'; }}
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table >
                        </div >
                        <Pagination
                            currentPage={currentPage}
                            totalItems={
                                viewMode === 'user' ? filteredUsers.length :
                                    viewMode === 'partner' ? filteredPartners.length :
                                        viewMode === 'end_customer' ? filteredEndCustomers.length :
                                            viewMode === 'company' ? filteredCompanies.length :
                                                viewMode === 'financial_year' ? filteredFinancialYears.length :
                                                    filteredProducts.length
                            }
                            itemsPerPage={ITEMS_PER_PAGE}
                            onPageChange={(page) => setCurrentPage(page)}
                        />
                    </div >
                )}
            </div>
        </div>
    );
};

export default UserManagement;
