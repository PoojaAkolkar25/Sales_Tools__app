import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { UserPlus, Mail, User as UserIcon, Shield, Loader2, Trash2, X, Users, CheckCircle, AlertCircle, Power, Pencil, Filter, Search, LayoutDashboard, PlusCircle, Paperclip, FileText, Eye, Download } from 'lucide-react';
import { useLocation } from 'react-router-dom';

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

    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
    const [searchTerm, setSearchTerm] = useState('');

    const [companyFormData, setCompanyFormData] = useState({
        name: '',
        entity: 'AE_IND',
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
        primary_contact: '',
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
        linked_partner: '',
        industry: '',
        location: '',
        contact_person: '',
        email: '',
        phone: '',
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
        status: 'ACTIVE'
    });

    const location = useLocation();

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
        try {
            const cleanedData = {
                ...formData,
                reporting_to: formData.reporting_to || null
            };
            await api.post('auth/users/', cleanedData);
            showNotification('User created successfully', 'success');
            setFormData({
                username: '', email: '', password: '',
                first_name: '', last_name: '', role: 'app_user',
                mobile: '', department: '', region: '', reporting_to: '', employee_id: ''
            });
            fetchUsers();
            setShowForm(false);
        } catch (err: any) {
            const errData = err.response?.data;
            const msg = errData?.username?.[0] || errData?.email?.[0] || errData?.mobile?.[0] || errData?.department?.[0] || errData?.region?.[0] || errData?.reporting_to?.[0] || (typeof errData === 'string' ? errData : JSON.stringify(errData)) || 'Error creating user';
            setError(msg);
        }
    };

    const [editingId, setEditingId] = useState<number | null>(null);

    // ... (existing useEffect) ...

    const handleCreateCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        setCompanyError('');
        try {
            const formData = new FormData();
            Object.entries(companyFormData).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    // Special handling for logo: only append if it's a File (new upload)
                    if (key === 'logo') {
                        if (value instanceof File) {
                            formData.append(key, value);
                        }
                        // If it's a string (existing URL) or null, don't append (backend preserves existing unless explicit delete handling is added)
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
                name: '', entity: 'AE_IND', customer_id: '', region: '',
                contact_person: '', alias_name: '', logo: null, address_line_1: '',
                country: 'India', state: '', city: '', pincode: '', phone_number: '',
                mobile_number: '', email: '', website_url: '',
                linked_company_profile: '', industry: '', type: 'CUSTOMER',
                payment_terms: 'NET_30',
                base_currency: 'INR', currency_symbol: '₹ / INR', decimal_places: 2,
                is_gst_applicable: true, gstin: '', state_code: '',
                msme_registered: false, msme_number: '', pan: '', tan: '', cin: ''
            });
            setEditingId(null);
            fetchCompanies();
            setShowForm(false);
        } catch (err: any) {
            console.error('Error saving company', err);
            const errorData = err.response?.data;
            if (errorData && typeof errorData === 'object') {
                const errorMessages = Object.entries(errorData)
                    .map(([key, value]: [string, any]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                    .join(' | ');
                setCompanyError(errorMessages || 'Error saving customer');
            } else {
                setCompanyError(err.response?.data?.message || 'Error saving customer');
            }
        }
    };

    const handleCreatePartner = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            Object.entries(partnerFormData).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    if (key === 'logo') {
                        if (value instanceof File) {
                            formData.append(key, value);
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
                primary_contact: '',
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
            console.error('Error saving company', err);
            showNotification('Error saving Company', 'error');
        }
    };

    const handleCreateEndCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
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
                contact_person: '', email: '', phone: '',
                status: 'ACTIVE'
            });
            setEditingId(null);
            fetchEndCustomers();
            setShowForm(false);
        } catch (err: any) {
            console.error('Error saving end customer', err);
            showNotification('Error saving End Customer', 'error');
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
            console.error('Error saving financial year', err);
            showNotification(err.response?.data?.message || 'Error saving Financial Year', 'error');
        }
    };

    const handleCreateProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.patch(`deals/products/${editingId}/`, productFormData);
                showNotification('Product/Service updated successfully', 'success');
            } else {
                await api.post('deals/products/', productFormData);
                showNotification('Product/Service created successfully', 'success');
            }
            setProductFormData({
                product_code: '', name: '', category: 'SOFTWARE', subcategory: '',
                description: '', uom: '', standard_price: 0, tax_percentage: 18,
                hsn_sac_code: '', currency: 'INR', status: 'ACTIVE'
            });
            setEditingId(null);
            fetchProducts();
            setShowForm(false);
        } catch (err: any) {
            console.error('Error saving product', err);
            showNotification('Error saving Product/Service', 'error');
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
                    console.error('Error deleting user', err);
                    showNotification('Error deleting user', 'error');
                }
            }
        });
    };

    const handleDeletePartner = async (id: number) => {
        showConfirm({
            title: 'Delete Partner',
            message: 'Are you sure you want to delete this partner? This action cannot be undone.',
            onConfirm: async () => {
                try {
                    await api.delete(`finance/customer-partners/${id}/`);
                    fetchPartners();
                    showNotification('Partner deleted successfully', 'success');
                } catch (err: any) {
                    console.error('Error deleting partner', err);
                    showNotification('Error deleting partner', 'error');
                }
            }
        });
    };

    const handleDeleteEndCustomer = async (id: number) => {
        showConfirm({
            title: 'Delete End Customer',
            message: 'Are you sure you want to delete this end customer? This action cannot be undone.',
            onConfirm: async () => {
                try {
                    await api.delete(`finance/end-customers/${id}/`);
                    fetchEndCustomers();
                    showNotification('End customer deleted successfully', 'success');
                } catch (err: any) {
                    console.error('Error deleting end customer', err);
                    showNotification('Error deleting end customer', 'error');
                }
            }
        });
    };

    const handleDownloadReport = async (fy: any) => {
        try {
            // Fetch Invoice Register data for the FY period
            const response = await api.get(`finance/invoices/report_register/`, {
                params: {
                    start_date: fy.start_date,
                    end_date: fy.end_date
                }
            });

            const data = response.data;
            if (!data || data.length === 0) {
                showNotification('No data found for this period', 'info');
                return;
            }

            // Convert JSON to CSV
            const headers = Object.keys(data[0]);
            const csvRows = [
                headers.join(','),
                ...data.map((row: any) =>
                    headers.map(header => {
                        const val = row[header];
                        return `"${String(val || '').replace(/"/g, '""')}"`;
                    }).join(',')
                )
            ];
            const csvContent = csvRows.join('\n');

            // Download as File
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Invoice_Register_${fy.code}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showNotification('Report downloaded successfully', 'success');
        } catch (err) {
            console.error('Error downloading report', err);
            showNotification('Error downloading report', 'error');
        }
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
                // For company profile, we don't have a status field yet, but we could add one.
                // For now, let's just show a notification.
                showNotification('Status toggle not implemented for Company Profile', 'info');
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
        } catch (err) {
            console.error('Error toggling status', err);
            showNotification('Error updating status', 'error');
        }
    };

    const handleCurrencyChange = (val: string) => {
        let symbol = '';
        switch (val) {
            case 'INR': symbol = 'â‚¹ / INR'; break;
            case 'USD': symbol = '$ / USD'; break;
            case 'EURO': symbol = 'â‚¬ / EURO'; break;
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

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            minHeight: 'calc(100vh - 85px)'
        }}>
            {/* Header Area */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, paddingBottom: '16px', borderBottom: showForm ? '1px solid #E0E6ED' : 'none', marginBottom: showForm ? '24px' : '0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '4px', height: '24px', background: 'var(--theme-primary)', borderRadius: '2px' }}></div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        {showForm ? `${editingId ? 'Edit' : 'Create New'} ${viewMode === 'user' ? 'User' :
                            viewMode === 'partner' ? 'Company' :
                                viewMode === 'end_customer' ? 'End Customer' : 'Customer'
                            }` : (
                            viewMode === 'user' ? 'User Management' :
                                viewMode === 'partner' ? 'Company Management' :
                                    viewMode === 'end_customer' ? 'End Customer Management' :
                                        viewMode === 'company' ? 'Customer Management' :
                                            viewMode === 'financial_year' ? 'Financial Year Management' :
                                                viewMode === 'product' ? 'Product / Service Management' :
                                                    'User Management'
                        )}
                    </h1>
                </div>
            </div>

            {/* Dashboard / Create New Toggle */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '12px',
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
                                primary_contact: '',
                                base_currency: 'INR',
                                currency_symbol: '₹ / INR', decimal_places: 2,
                                is_gst_applicable: true, gstin: '', state_code: '',
                                msme_registered: false, msme_number: '', pan: '',
                                tan: '', cin: '', status: 'ACTIVE', payment_terms: 'NET_30'
                            });
                            setEndCustomerFormData({
                                end_customer_code: '',
                                name: '', linked_partner: '', industry: '', location: '',
                                contact_person: '', email: '', phone: '',
                                status: 'ACTIVE'
                            });
                            setCompanyFormData({
                                name: '', entity: 'AE_IND', customer_id: '', region: '',
                                contact_person: '', alias_name: '', logo: null, address_line_1: '',
                                country: 'India', state: '', city: '', pincode: '', phone_number: '',
                                mobile_number: '', email: '', website_url: '',
                                linked_company_profile: '', industry: '', type: 'CUSTOMER',
                                payment_terms: 'NET_30',
                                base_currency: 'INR', currency_symbol: '₹ / INR', decimal_places: 2,
                                is_gst_applicable: true, gstin: '', state_code: '',
                                msme_registered: false, msme_number: '', pan: '', tan: '', cin: ''
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
                    >
                        <PlusCircle size={18} /> Create New
                    </button>
                </div>
            </div>

            {/* Action Row - Only shown when not in form mode */}
            {
                !showForm && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{
                            display: 'flex',
                            gap: '4px',
                            alignItems: 'center',
                            background: 'white',
                            padding: '6px',
                            borderRadius: '12px',
                            border: '1px solid var(--border-primary)',
                            boxShadow: 'var(--shadow-sm)',
                            flex: 1,
                            marginRight: '16px'
                        }}>
                            <button
                                onClick={() => { setViewMode('user'); setColumnFilters({}); }}
                                style={{
                                    padding: '6px 20px',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
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
                                <UserIcon size={14} /> Users
                            </button>
                            <button
                                onClick={() => { setViewMode('partner'); setColumnFilters({}); }}
                                style={{
                                    padding: '6px 20px',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
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
                                <Shield size={14} /> Company
                            </button>
                            <button
                                onClick={() => { setViewMode('end_customer'); setColumnFilters({}); }}
                                style={{
                                    padding: '6px 20px',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
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
                                <Users size={14} /> End Customer
                            </button>
                            <button
                                onClick={() => { setViewMode('company'); setColumnFilters({}); }}
                                style={{
                                    padding: '6px 20px',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
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
                                <Users size={14} /> Customer
                            </button>
                            <button
                                onClick={() => { setViewMode('financial_year'); setColumnFilters({}); }}
                                style={{
                                    padding: '6px 20px',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
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
                                    fontSize: '0.85rem',
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
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
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
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            First Name
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="First Name"
                                            value={formData.first_name}
                                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Last Name
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Last Name"
                                            value={formData.last_name}
                                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                        />
                                    </div>
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
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Role
                                        </label>
                                        <select
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                        >
                                            <option value="app_user">User</option>
                                            <option value="app_admin">Admin</option>
                                            <option value="sales_head">Sales Head</option>
                                            <option value="inside_sales_head">Inside Sales Head</option>
                                            <option value="pm_head">PM Head</option>
                                            <option value="salesperson">Salesperson</option>
                                        </select>
                                    </div>
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
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Reporting To
                                        </label>
                                        <select
                                            value={formData.reporting_to}
                                            onChange={(e) => setFormData({ ...formData, reporting_to: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                        >
                                            <option value="">Select Manager</option>
                                            {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
                                        </select>
                                    </div>
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
                                </div>
                            ) : viewMode === 'partner' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                    <div className="section">
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                                            Company Basic Details
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
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
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                                            {partnerFormData.logo instanceof File ? (
                                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {partnerFormData.logo.name}
                                                                </span>
                                                            ) : (
                                                                <img src={partnerFormData.logo as string} alt="Logo" style={{ height: '30px', borderRadius: '4px' }} />
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => setPartnerFormData({ ...partnerFormData, logo: null })}
                                                                style={{ background: 'none', border: 'none', color: '#E53E3E', cursor: 'pointer', padding: '4px' }}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>


                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Primary Contact Name
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Primary Contact Name"
                                                    value={partnerFormData.primary_contact}
                                                    onChange={(e) => setPartnerFormData({ ...partnerFormData, primary_contact: e.target.value })}
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
                                                    Phone Number
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Phone Number"
                                                    value={partnerFormData.phone_number}
                                                    onChange={(e) => setPartnerFormData({ ...partnerFormData, phone_number: e.target.value })}
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
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                            <div style={{ gridColumn: 'span 3' }}>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Address Line 1
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Address Line 1"
                                                    value={partnerFormData.address_line_1}
                                                    onChange={(e) => setPartnerFormData({ ...partnerFormData, address_line_1: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Country
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Country"
                                                    value={partnerFormData.country}
                                                    onChange={(e) => setPartnerFormData({ ...partnerFormData, country: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    State
                                                </label>
                                                <select
                                                    value={partnerFormData.state}
                                                    onChange={(e) => setPartnerFormData({ ...partnerFormData, state: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                >
                                                    <option value="">Select State</option>
                                                    {states.map(state => (
                                                        <option key={state.id} value={state.id}>{state.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    City
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="City"
                                                    value={partnerFormData.city}
                                                    onChange={(e) => setPartnerFormData({ ...partnerFormData, city: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
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
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Base Currency <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                                </label>
                                                <select
                                                    value={partnerFormData.base_currency}
                                                    onChange={(e) => handleCurrencyChange(e.target.value)}
                                                    required
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                >
                                                    <option value="INR">INR</option>
                                                    <option value="USD">USD</option>
                                                    <option value="EURO">EURO</option>
                                                </select>
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
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Payment Terms <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                                </label>
                                                <select
                                                    value={(partnerFormData as any).payment_terms || 'NET_30'}
                                                    onChange={(e) => setPartnerFormData({ ...partnerFormData, payment_terms: e.target.value } as any)}
                                                    required
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                >
                                                    <option value="IMMEDIATE">Immediate</option>
                                                    <option value="NET_30">30 Days</option>
                                                    <option value="NET_45">45 Days</option>
                                                    <option value="NET_60">60 Days</option>
                                                    <option value="NET_90">90 Days</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="section" style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px' }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                                            Tax Registration Details
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', gridColumn: 'span 3', marginBottom: '8px' }}>
                                                <input
                                                    type="checkbox"
                                                    id="is_gst_applicable_partner"
                                                    checked={partnerFormData.is_gst_applicable}
                                                    onChange={(e) => setPartnerFormData({ ...partnerFormData, is_gst_applicable: e.target.checked })}
                                                />
                                                <label htmlFor="is_gst_applicable_partner" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black' }}>GST Applicable</label>
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
                                                            value={partnerFormData.state_code}
                                                            readOnly
                                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: '#f7fafc', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', outline: 'none' }}
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
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', gridColumn: 'span 3', marginBottom: '8px' }}>
                                                <input
                                                    type="checkbox"
                                                    id="msme_registered_partner"
                                                    checked={partnerFormData.msme_registered}
                                                    onChange={(e) => setPartnerFormData({ ...partnerFormData, msme_registered: e.target.checked })}
                                                />
                                                <label htmlFor="msme_registered_partner" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black' }}>MSME Registered</label>
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
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            End Customer Code <span style={{ fontSize: '0.7rem', color: '#A0AEC0', fontWeight: 500 }}>(Auto)</span>
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
                                            End Customer Name <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="End Customer Name"
                                            value={endCustomerFormData.name}
                                            onChange={(e) => setEndCustomerFormData({ ...endCustomerFormData, name: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Linked Partner <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <select
                                            value={endCustomerFormData.linked_partner}
                                            onChange={(e) => setEndCustomerFormData({ ...endCustomerFormData, linked_partner: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                            required
                                        >
                                            <option value="">Select Partner</option>
                                            {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Industry <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <select
                                            value={endCustomerFormData.industry}
                                            onChange={(e) => setEndCustomerFormData({ ...endCustomerFormData, industry: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                            required
                                        >
                                            <option value="">Select Industry</option>
                                            <option value="IT">IT</option>
                                            <option value="BFSI">BFSI</option>
                                            <option value="Manufacturing">Manufacturing</option>
                                            <option value="Healthcare">Healthcare</option>
                                            <option value="Retail">Retail</option>
                                            <option value="Telecom">Telecom</option>
                                            <option value="Education">Education</option>
                                            <option value="Government">Government</option>
                                            <option value="Automotive">Automotive</option>
                                            <option value="FMCG">FMCG</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
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
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Phone <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="Phone"
                                            value={endCustomerFormData.phone}
                                            onChange={(e) => setEndCustomerFormData({ ...endCustomerFormData, phone: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Status <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <select
                                            value={endCustomerFormData.status}
                                            onChange={(e) => setEndCustomerFormData({ ...endCustomerFormData, status: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                            required
                                        >
                                            <option value="ACTIVE">Active</option>
                                            <option value="INACTIVE">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                            ) : viewMode === 'financial_year' ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
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
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            First month of fiscal year <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <select
                                            value={fyFormData.first_month_of_fiscal_year}
                                            onChange={(e) => handleFiscalMonthChange(e.target.value)}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none', cursor: 'pointer' }}
                                            required
                                        >
                                            {monthNames.map(month => (
                                                <option key={month} value={month}>{month}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            First month of tax year
                                        </label>
                                        <select
                                            value={fyFormData.first_month_of_tax_year}
                                            onChange={(e) => setFyFormData({ ...fyFormData, first_month_of_tax_year: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none', cursor: 'pointer' }}
                                        >
                                            <option value="Same as fiscal year">Same as fiscal year</option>
                                            {monthNames.map(month => (
                                                <option key={month} value={month}>{month}</option>
                                            ))}
                                        </select>
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
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Product Code <span style={{ fontSize: '0.7rem', color: '#A0AEC0', fontWeight: 500 }}>(Auto)</span>
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
                                            Product/Service Name <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Product/Service Name"
                                            value={productFormData.name}
                                            onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Category <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <select
                                            value={productFormData.category}
                                            onChange={(e) => setProductFormData({ ...productFormData, category: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                            required
                                        >
                                            <option value="">Select Category</option>
                                            <option value="SOFTWARE">Software</option>
                                            <option value="SERVICE">Service</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Subcategory <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <select
                                            value={productFormData.subcategory}
                                            onChange={(e) => setProductFormData({ ...productFormData, subcategory: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                            required
                                        >
                                            <option value="">Select Subcategory</option>
                                            <option value="Automation">Automation</option>
                                            <option value="Analytics">Analytics</option>
                                            <option value="Cloud">Cloud</option>
                                            <option value="Consulting">Consulting</option>
                                            <option value="Implementation">Implementation</option>
                                            <option value="Integration">Integration</option>
                                            <option value="Licensing">Licensing</option>
                                            <option value="Maintenance">Maintenance</option>
                                            <option value="Support">Support</option>
                                            <option value="Training">Training</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Description <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <textarea
                                            placeholder="Description"
                                            value={productFormData.description}
                                            onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                                            style={{ width: '100%', height: '60px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none', resize: 'vertical' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Unit of Measure <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <select
                                            value={productFormData.uom}
                                            onChange={(e) => setProductFormData({ ...productFormData, uom: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                            required
                                        >
                                            <option value="">Select UOM</option>
                                            <option value="License">License</option>
                                            <option value="Hour">Hour</option>
                                            <option value="Day">Day</option>
                                            <option value="Month">Month</option>
                                            <option value="Year">Year</option>
                                            <option value="Unit">Unit</option>
                                            <option value="Project">Project</option>
                                            <option value="User">User</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Standard Price <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="0"
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
                                            placeholder="18"
                                            value={productFormData.tax_percentage}
                                            onChange={(e) => setProductFormData({ ...productFormData, tax_percentage: e.target.value === '' ? '' : Number(e.target.value) })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            HSN/SAC Code <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="HSN/SAC Code"
                                            value={productFormData.hsn_sac_code}
                                            onChange={(e) => setProductFormData({ ...productFormData, hsn_sac_code: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Currency <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <select
                                            value={productFormData.currency}
                                            onChange={(e) => setProductFormData({ ...productFormData, currency: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                            required
                                        >
                                            <option value="INR">INR</option>
                                            <option value="USD">USD</option>
                                            <option value="EURO">EURO</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                            Status <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                        </label>
                                        <select
                                            value={productFormData.status}
                                            onChange={(e) => setProductFormData({ ...productFormData, status: e.target.value })}
                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                            required
                                        >
                                            <option value="ACTIVE">Active</option>
                                            <option value="INACTIVE">Inactive</option>
                                        </select>
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
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
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
                                                    Company Name <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                                </label>
                                                <select
                                                    value={companyFormData.entity}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, entity: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                    required
                                                >
                                                    <option value="AE_IND">AE India</option>
                                                    <option value="AE_USA">AE USA</option>
                                                </select>
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
                                                    Alias Name
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Alias Name"
                                                    value={companyFormData.alias_name}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, alias_name: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Logo
                                                </label>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    padding: '6px 10px', // Match text input padding
                                                    background: 'white', // Match text input background
                                                    borderRadius: '6px', // Match text input border radius
                                                    border: '1px solid var(--border-primary)', // Match text input border
                                                    height: '34px', // Match text input height
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
                                                            height: '24px', // Reduced height to fit inside the input-like container
                                                            padding: '0 8px',
                                                            borderRadius: '4px', // Slightly smaller radius
                                                            fontWeight: 600,
                                                            fontSize: '0.75rem',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        <Paperclip size={12} /> Attach Logo
                                                    </button>

                                                    <div style={{ flex: 1, display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 0', alignItems: 'center' }}>
                                                        {companyFormData.logo && companyFormData.logo instanceof File && (
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                                flex: 1, // Allow this container to take available space
                                                                minWidth: 0, // Crucial for text truncation in flexbox
                                                                justifyContent: 'space-between' // Push buttons to the far right
                                                            }}>
                                                                <span style={{
                                                                    fontSize: '0.85rem',
                                                                    color: '#4A5568',
                                                                    fontWeight: 500,
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                    maxWidth: '150px' // Strictly constrain width to prevent layout shift
                                                                }} title={companyFormData.logo.name}>
                                                                    {companyFormData.logo.name}
                                                                </span>
                                                                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (companyFormData.logo instanceof File) {
                                                                                const url = URL.createObjectURL(companyFormData.logo);
                                                                                window.open(url, '_blank');
                                                                            }
                                                                        }}
                                                                        style={{ cursor: 'pointer', background: 'none', border: 'none', padding: '2px', color: '#718096', display: 'flex' }}
                                                                        title="View Pending Logo"
                                                                    >
                                                                        <Eye size={14} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setCompanyFormData({ ...companyFormData, logo: null })}
                                                                        style={{ cursor: 'pointer', background: 'none', border: 'none', padding: '2px', color: '#E53E3E' }}
                                                                        title="Remove pending file"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {companyFormData.logo && typeof companyFormData.logo === 'string' && (
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                                flex: 1,
                                                                minWidth: 0,
                                                                justifyContent: 'space-between'
                                                            }}>
                                                                <span style={{
                                                                    fontSize: '0.85rem',
                                                                    fontWeight: 500,
                                                                    color: '#4A5568',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                    maxWidth: '150px' // Strictly constrain width
                                                                }} title="Current Logo">
                                                                    Current Logo
                                                                </span>
                                                                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => window.open(companyFormData.logo as string, '_blank')}
                                                                        style={{ cursor: 'pointer', background: 'none', border: 'none', padding: '2px', color: '#718096', display: 'flex' }}
                                                                        title="View Current Logo"
                                                                    >
                                                                        <Eye size={14} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setCompanyFormData({ ...companyFormData, logo: null })}
                                                                        style={{ cursor: 'pointer', background: 'none', border: 'none', padding: '2px', color: '#E53E3E' }}
                                                                        title="Delete Current Logo"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {!companyFormData.logo && (
                                                            <span style={{ fontSize: '0.9rem', color: '#A0AEC0', fontStyle: 'italic', marginLeft: '10px' }}>
                                                                No logo uploaded
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
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
                                                    Phone Number
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Phone Number"
                                                    value={companyFormData.phone_number}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, phone_number: e.target.value })}
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
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Linked Company Profile
                                                </label>
                                                <select
                                                    value={companyFormData.linked_company_profile}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, linked_company_profile: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                >
                                                    <option value="">Select Company</option>
                                                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>

                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Industry <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                                </label>
                                                <select
                                                    value={companyFormData.industry}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, industry: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                    required
                                                >
                                                    <option value="">Select Industry</option>
                                                    <option value="IT">IT</option>
                                                    <option value="BFSI">BFSI</option>
                                                    <option value="Manufacturing">Manufacturing</option>
                                                    <option value="Healthcare">Healthcare</option>
                                                    <option value="Retail">Retail</option>
                                                    <option value="Telecom">Telecom</option>
                                                    <option value="Education">Education</option>
                                                    <option value="Government">Government</option>
                                                    <option value="Automotive">Automotive</option>
                                                    <option value="FMCG">FMCG</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="section" style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px' }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                                            Address Details
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                            <div style={{ gridColumn: 'span 3' }}>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Address Line 1
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Address Line 1"
                                                    value={companyFormData.address_line_1}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, address_line_1: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Country
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Country"
                                                    value={companyFormData.country}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, country: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    State
                                                </label>
                                                <select
                                                    value={companyFormData.state}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, state: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                >
                                                    <option value="">Select State</option>
                                                    {states.map(state => (
                                                        <option key={state.id} value={state.id}>{state.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    City
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="City"
                                                    value={companyFormData.city}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, city: e.target.value })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
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
                                            Financial Settings
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Base Currency <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                                </label>
                                                <select
                                                    value={companyFormData.base_currency}
                                                    onChange={(e) => handleCurrencyChange(e.target.value)}
                                                    required
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                >
                                                    <option value="INR">INR</option>
                                                    <option value="USD">USD</option>
                                                    <option value="EURO">EURO</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Symbol
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="INR"
                                                    readOnly
                                                    value={companyFormData.currency_symbol}
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
                                                    value={companyFormData.decimal_places}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, decimal_places: e.target.value === '' ? '' : parseInt(e.target.value) })}
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                                                    Payment Terms <span style={{ color: 'var(--theme-primary)' }}>*</span>
                                                </label>
                                                <select
                                                    value={companyFormData.payment_terms}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, payment_terms: e.target.value })}
                                                    required
                                                    style={{ width: '100%', height: '34px', padding: '6px 10px', background: 'white', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: '#1a1f36', outline: 'none' }}
                                                >
                                                    <option value="IMMEDIATE">Immediate</option>
                                                    <option value="NET_30">30 Days</option>
                                                    <option value="NET_45">45 Days</option>
                                                    <option value="NET_60">60 Days</option>
                                                    <option value="NET_90">90 Days</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="section" style={{ borderTop: '1px solid #E0E6ED', paddingTop: '32px' }}>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--theme-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '3px', height: '14px', background: 'var(--ae-blue)', borderRadius: '2px' }}></div>
                                            Tax Registration Details
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', gridColumn: 'span 3', marginBottom: '8px' }}>
                                                <input
                                                    type="checkbox"
                                                    id="is_gst_applicable"
                                                    checked={companyFormData.is_gst_applicable}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, is_gst_applicable: e.target.checked })}
                                                />
                                                <label htmlFor="is_gst_applicable" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black' }}>GST Applicable</label>
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
                                                            value={companyFormData.state_code}
                                                            readOnly
                                                            style={{ width: '100%', height: '34px', padding: '6px 10px', background: '#f7fafc', border: '1px solid var(--border-primary)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', outline: 'none' }}
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
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', gridColumn: 'span 3', marginBottom: '8px' }}>
                                                <input
                                                    type="checkbox"
                                                    id="msme_registered"
                                                    checked={companyFormData.msme_registered}
                                                    onChange={(e) => setCompanyFormData({ ...companyFormData, msme_registered: e.target.checked })}
                                                />
                                                <label htmlFor="msme_registered" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'black' }}>MSME Registered</label>
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
                            alignItems: 'center',
                            gap: '4px',
                            background: 'white',
                            padding: '6px',
                            borderRadius: '12px',
                            border: '1px solid #E0E6ED',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                            width: 'fit-content'
                        }}>
                            <button
                                type="submit"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 16px',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    background: 'var(--theme-primary)',
                                    color: 'white',
                                    border: 'none',
                                    fontWeight: 800,
                                    cursor: 'pointer'
                                }}
                            >
                                <CheckCircle size={16} /> {
                                    viewMode === 'user' ? (editingId ? 'UPDATE USER' : 'CREATE USER') :
                                        viewMode === 'partner' ? (editingId ? 'UPDATE COMPANY' : 'SAVE COMPANY RECORD') :
                                            viewMode === 'end_customer' ? (editingId ? 'UPDATE END CUSTOMER' : 'SAVE END CUSTOMER RECORD') :
                                                viewMode === 'financial_year' ? (editingId ? 'UPDATE FY' : 'SAVE FY RECORD') :
                                                    viewMode === 'product' ? (editingId ? 'UPDATE PRODUCT' : 'SAVE PRODUCT RECORD') :
                                                        (editingId ? 'UPDATE CUSTOMER' : 'SAVE CUSTOMER RECORD')
                                }
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowForm(false);
                                    setEditingId(null);
                                }}
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
                                <X size={16} /> Cancel
                            </button>
                        </div>
                    </form >
                ) : (
                    <div className="section-panel !p-0 overflow-hidden">
                        <div style={{ overflowX: 'auto', width: '100%' }}>
                            <table style={{ minWidth: '1500px', width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-secondary)' }}>
                                        <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                                            {viewMode === 'user' ? 'User' : viewMode === 'partner' ? 'Company' : viewMode === 'end_customer' ? 'End Customer' : viewMode === 'financial_year' ? 'Financial Year' : viewMode === 'product' ? 'Product / Service' : 'Customer'}
                                        </th>
                                        {viewMode === 'user' && (
                                            <>
                                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Email</th>
                                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Mobile</th>
                                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Department</th>
                                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Region</th>
                                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Reporting To</th>
                                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Role</th>
                                            </>
                                        )}
                                        {viewMode === 'partner' && (
                                            <>
                                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Contact (E/P/M)</th>
                                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Address</th>
                                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Type / Industry</th>
                                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Tax / MSME Info</th>
                                            </>
                                        )}
                                        {viewMode === 'end_customer' && (
                                            <>
                                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Linked Partner</th>
                                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Industry</th>
                                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Location</th>
                                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Contact Person (E/P)</th>
                                            </>
                                        )}
                                        {viewMode === 'company' && (
                                            <>
                                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Contact (E/P/M)</th>
                                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Address</th>
                                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Industry / Type</th>
                                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Tax / MSME Info</th>
                                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Terms</th>
                                            </>
                                        )}
                                        {viewMode === 'financial_year' && (
                                            <>
                                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Code</th>
                                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Start Date</th>
                                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>End Date</th>
                                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Current FY</th>
                                            </>
                                        )}
                                        {viewMode === 'product' && (
                                            <>
                                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Category / Sub</th>
                                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>UOM / Price / Tax</th>
                                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>HSN/SAC</th>
                                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Description</th>
                                            </>
                                        )}
                                        <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                                        <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                                    </tr>
                                    <tr style={{ background: 'var(--bg-secondary)' }}>
                                        <th style={{ padding: '8px 24px' }}>
                                            <div className="ae-input-group !mb-0">
                                                <Search className="ae-search-icon" size={12} />
                                                <input
                                                    className="ae-input"
                                                    placeholder="Filter..."
                                                    value={columnFilters[viewMode === 'user' ? 'username' : viewMode === 'partner' ? 'name' : viewMode === 'end_customer' ? 'name' : viewMode === 'financial_year' ? 'label' : viewMode === 'product' ? 'name' : 'name'] || ''}
                                                    onChange={(e) => setColumnFilters({ ...columnFilters, [viewMode === 'user' ? 'username' : viewMode === 'partner' ? 'name' : viewMode === 'end_customer' ? 'name' : viewMode === 'financial_year' ? 'label' : viewMode === 'product' ? 'name' : 'name']: e.target.value })}
                                                    style={{ height: '28px', fontSize: '11px' }}
                                                />
                                            </div>
                                        </th>
                                        {viewMode === 'user' && (
                                            <>
                                                <th style={{ padding: '8px 24px' }}>
                                                    <div className="ae-input-group !mb-0">
                                                        <Search className="ae-search-icon" size={12} />
                                                        <input className="ae-input" placeholder="Filter..." value={columnFilters.email || ''} onChange={(e) => setColumnFilters({ ...columnFilters, email: e.target.value })} style={{ height: '28px', fontSize: '11px' }} />
                                                    </div>
                                                </th>
                                                <th style={{ padding: '8px 24px' }}>
                                                    <div className="ae-input-group !mb-0">
                                                        <Search className="ae-search-icon" size={12} />
                                                        <input className="ae-input" placeholder="Filter..." value={columnFilters.mobile || ''} onChange={(e) => setColumnFilters({ ...columnFilters, mobile: e.target.value })} style={{ height: '28px', fontSize: '11px' }} />
                                                    </div>
                                                </th>
                                                <th style={{ padding: '8px 24px' }}>
                                                    <div className="ae-input-group !mb-0">
                                                        <Search className="ae-search-icon" size={12} />
                                                        <input className="ae-input" placeholder="Filter..." value={columnFilters.department || ''} onChange={(e) => setColumnFilters({ ...columnFilters, department: e.target.value })} style={{ height: '28px', fontSize: '11px' }} />
                                                    </div>
                                                </th>
                                                <th style={{ padding: '8px 24px' }}>
                                                    <div className="ae-input-group !mb-0">
                                                        <Search className="ae-search-icon" size={12} />
                                                        <input className="ae-input" placeholder="Filter..." value={columnFilters.region || ''} onChange={(e) => setColumnFilters({ ...columnFilters, region: e.target.value })} style={{ height: '28px', fontSize: '11px' }} />
                                                    </div>
                                                </th>
                                                <th style={{ padding: '8px 24px' }}>
                                                    <div className="ae-input-group !mb-0">
                                                        <Search className="ae-search-icon" size={12} />
                                                        <input className="ae-input" placeholder="Filter..." value={columnFilters.reporting_to_name || ''} onChange={(e) => setColumnFilters({ ...columnFilters, reporting_to_name: e.target.value })} style={{ height: '28px', fontSize: '11px' }} />
                                                    </div>
                                                </th>
                                                <th style={{ padding: '8px 24px' }}>
                                                    <div className="ae-input-group !mb-0">
                                                        <Search className="ae-search-icon" size={12} />
                                                        <input className="ae-input" placeholder="Filter..." value={columnFilters.role || ''} onChange={(e) => setColumnFilters({ ...columnFilters, role: e.target.value })} style={{ height: '28px', fontSize: '11px' }} />
                                                    </div>
                                                </th>
                                            </>
                                        )}
                                        {/* Simplified Filter row for other viewModes to avoid too many columns logic right now */}
                                        {viewMode !== 'user' && (
                                            <>
                                                <th style={{ padding: '8px 24px' }}>
                                                    <div className="ae-input-group !mb-0">
                                                        <Search className="ae-search-icon" size={12} />
                                                        <input className="ae-input" placeholder="Filter..." value={columnFilters[viewMode === 'partner' ? 'email' : viewMode === 'end_customer' ? 'email' : viewMode === 'financial_year' ? 'start_date' : viewMode === 'product' ? 'category' : 'email'] || ''} onChange={(e) => setColumnFilters({ ...columnFilters, [viewMode === 'partner' ? 'email' : viewMode === 'end_customer' ? 'email' : viewMode === 'financial_year' ? 'start_date' : viewMode === 'product' ? 'category' : 'email']: e.target.value })} style={{ height: '28px', fontSize: '11px' }} />
                                                    </div>
                                                </th>
                                                <th style={{ padding: '8px 24px' }}>
                                                    <div className="ae-input-group !mb-0">
                                                        <Search className="ae-search-icon" size={12} />
                                                        <input className="ae-input" placeholder="Filter..." value={columnFilters[viewMode === 'partner' ? 'type' : viewMode === 'end_customer' ? 'location' : viewMode === 'financial_year' ? 'end_date' : viewMode === 'product' ? 'product_code' : 'city'] || ''} onChange={(e) => setColumnFilters({ ...columnFilters, [viewMode === 'partner' ? 'type' : viewMode === 'end_customer' ? 'location' : viewMode === 'financial_year' ? 'end_date' : viewMode === 'product' ? 'product_code' : 'city']: e.target.value })} style={{ height: '28px', fontSize: '11px' }} />
                                                    </div>
                                                </th>
                                                {/* Filler columns for simplicity in other modes for now */}
                                                {(viewMode === 'partner' || viewMode === 'company' || viewMode === 'end_customer') && <th style={{ padding: '8px 24px' }}></th>}
                                                {(viewMode === 'financial_year' || viewMode === 'product') && <th style={{ padding: '8px 24px' }}></th>}
                                            </>
                                        )}
                                        <th style={{ padding: '8px 24px' }}>
                                            <div className="ae-input-group !mb-0">
                                                <Search className="ae-search-icon" size={12} />
                                                <input
                                                    className="ae-input"
                                                    placeholder="Filter..."
                                                    value={columnFilters[viewMode === 'user' ? 'is_active' : 'status'] || ''}
                                                    onChange={(e) => setColumnFilters({ ...columnFilters, [viewMode === 'user' ? 'is_active' : 'status']: e.target.value })}
                                                    style={{ height: '28px', fontSize: '11px' }}
                                                />
                                            </div>
                                        </th>
                                        <th style={{ padding: '8px 24px', textAlign: 'right' }}>
                                            <button
                                                onClick={() => { setColumnFilters({}); setSearchTerm(''); }}
                                                style={{ height: '24px', width: '100px', fontSize: '10px', color: 'var(--theme-primary)', fontWeight: 700, cursor: 'pointer', background: 'white', border: '1px solid #E0E6ED', borderRadius: '6px' }}
                                            >
                                                Clear
                                            </button>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {viewMode === 'user' ? filteredUsers.map((user) => (
                                        <tr key={user.id} className="ae-table-row">
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 flex-shrink-0 bg-[var(--ae-blue)]/10 text-[var(--ae-blue)] rounded-full flex items-center justify-center">
                                                        <UserIcon size={20} />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1a1f36' }}>{user.username}</div>
                                                        <div style={{ fontSize: '0.8rem', color: '#718096' }}>{user.first_name} {user.last_name}{user.employee_id ? ` · ${user.employee_id}` : ''}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <div className="flex items-center gap-2" style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 500 }}>
                                                    <Mail size={14} className="text-gray-400" /> {user.email || '-'}
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <div style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 500 }}>{user.mobile || '-'}</div>
                                            </td>
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <div style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 500 }}>{user.department || '-'}</div>
                                            </td>
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <div style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 500 }}>{user.region || '-'}</div>
                                            </td>
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <div style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 500 }}>{user.reporting_to_name || '-'}</div>
                                            </td>
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    textTransform: 'uppercase',
                                                    background: user.role === 'app_admin' ? 'rgba(159, 122, 234, 0.1)' : 'var(--bg-accent)',
                                                    color: user.role === 'app_admin' ? '#9F7AEA' : 'var(--ae-blue)'
                                                }}>
                                                    <Shield size={12} />
                                                    {user.role === 'app_admin' ? 'Admin' :
                                                        user.role === 'sales_head' ? 'Sales Head' :
                                                            user.role === 'pm_head' ? 'PM Head' :
                                                                user.role === 'salesperson' ? 'Salesperson' :
                                                                    user.role === 'inside_sales_head' ? 'IS Head' : 'User'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 800,
                                                    textTransform: 'uppercase',
                                                    background: user.is_active ? 'rgba(0, 200, 83, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                                                    color: user.is_active ? '#00C853' : '#F44336'
                                                }}>
                                                    {user.is_active ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                                    {user.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px 24px', textAlign: 'right', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => handleToggleStatus(user.id, 'user')}
                                                        style={{ padding: '8px', color: user.is_active ? '#00C853' : '#F44336', border: 'none', background: user.is_active ? 'rgba(0, 200, 83, 0.1)' : 'rgba(244, 67, 54, 0.1)', cursor: 'pointer', borderRadius: '6px', transition: 'all 0.2s' }}
                                                        title={user.is_active ? "Deactivate User" : "Activate User"}
                                                    >
                                                        <Power size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        style={{ padding: '8px', color: '#E53E3E', border: 'none', background: 'rgba(229, 62, 62, 0.1)', cursor: 'pointer', borderRadius: '6px', transition: 'all 0.2s' }}
                                                        title="Delete User"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : viewMode === 'partner' ? filteredPartners.map((p) => (
                                        <tr key={p.id} className="ae-table-row">
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 flex-shrink-0 bg-[var(--ae-blue)]/10 text-[var(--ae-blue)] rounded-full flex items-center justify-center">
                                                        <Shield size={20} />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1a1f36' }}>{p.name}</div>
                                                        <div style={{ fontSize: '0.8rem', color: '#718096' }}>{p.code}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <div style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 500 }}>{p.email || '-'}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#718096' }}>P: {p.phone_number || '-'} / M: {p.mobile_number || '-'}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#a0aec0' }}>{p.website_url || '-'}</div>
                                            </td>
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <div style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 500 }}>{p.city}{p.state ? `, ${p.state}` : ''}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#718096' }}>{p.country} {p.pincode}</div>
                                            </td>
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <div style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 600 }}>{p.type}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#718096' }}>{p.industry || '-'}</div>
                                            </td>
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <div style={{ fontSize: '0.85rem', color: '#4A5568', fontWeight: 500 }}>GST: {p.gstin || '-'}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#718096' }}>PAN: {p.pan || '-'} | TAN: {p.tan || '-'}</div>
                                                {p.msme_registered && <div style={{ fontSize: '0.75rem', color: '#00C853' }}>MSME: {p.msme_number}</div>}
                                            </td>
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', background: p.status === 'ACTIVE' ? 'rgba(0, 200, 83, 0.1)' : 'rgba(244, 67, 54, 0.1)', color: p.status === 'ACTIVE' ? '#00C853' : '#F44336' }}>
                                                    {p.status === 'ACTIVE' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                                    {p.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px 24px', textAlign: 'right', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => handleToggleStatus(p.id, 'partner')}
                                                        style={{ padding: '8px', color: p.status === 'ACTIVE' ? '#00C853' : '#F44336', border: 'none', background: p.status === 'ACTIVE' ? 'rgba(0, 200, 83, 0.1)' : 'rgba(244, 67, 54, 0.1)', cursor: 'pointer', borderRadius: '6px' }}
                                                    >
                                                        <Power size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePartner(p.id)}
                                                        style={{ padding: '8px', color: '#E53E3E', border: 'none', background: 'rgba(229, 62, 62, 0.1)', cursor: 'pointer', borderRadius: '6px' }}
                                                        title="Delete Company"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setPartnerFormData({
                                                                name: p.name || '',
                                                                contact_person: p.contact_person || '',
                                                                logo: p.logo || null,
                                                                address_line_1: p.address_line_1 || '',
                                                                country: p.country || 'India',
                                                                state: p.state || '',
                                                                city: p.city || '',
                                                                pincode: p.pincode || '',
                                                                phone_number: p.phone_number || '',
                                                                mobile: p.mobile || '',
                                                                email: p.email || '',
                                                                website_url: p.website_url || '',
                                                                primary_contact: p.primary_contact || '',
                                                                base_currency: p.base_currency || 'INR',
                                                                currency_symbol: p.currency_symbol || '₹ / INR',
                                                                decimal_places: p.decimal_places || 2,
                                                                is_gst_applicable: p.is_gst_applicable ?? true,
                                                                gstin: p.gstin || '',
                                                                state_code: p.state_code || '',
                                                                msme_registered: p.msme_registered ?? false,
                                                                msme_number: p.msme_number || '',
                                                                pan: p.pan || '',
                                                                tan: p.tan || '',
                                                                cin: p.cin || '',
                                                                status: p.status || 'ACTIVE',
                                                                payment_terms: p.payment_terms || 'NET_30'
                                                            });
                                                            setEditingId(p.id);
                                                            setShowForm(true);
                                                        }}
                                                        style={{ padding: '8px', color: 'var(--ae-blue)', border: 'none', background: 'rgba(0, 102, 204, 0.1)', cursor: 'pointer', borderRadius: '6px' }}
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : viewMode === 'end_customer' ? filteredEndCustomers.map((ec) => (
                                        <tr key={ec.id} className="ae-table-row">
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 flex-shrink-0 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
                                                        <UserIcon size={20} />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1a1f36' }}>{ec.name}</div>
                                                        <div style={{ fontSize: '0.8rem', color: '#718096' }}>{ec.code}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <div style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 600 }}>{ec.linked_partner_name || '-'}</div>
                                            </td>
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <div style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 500 }}>{ec.industry || '-'}</div>
                                            </td>
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <div style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 500 }}>{ec.location || '-'}</div>
                                            </td>
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <div style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 600 }}>{ec.contact_person || '-'}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#718096' }}>{ec.email || '-'} / {ec.phone || '-'}</div>
                                            </td>
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', background: ec.status === 'ACTIVE' ? 'rgba(0, 200, 83, 0.1)' : 'rgba(244, 67, 54, 0.1)', color: ec.status === 'ACTIVE' ? '#00C853' : '#F44336' }}>
                                                    {ec.status === 'ACTIVE' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                                    {ec.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px 24px', textAlign: 'right', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => handleToggleStatus(ec.id, 'end_customer')}
                                                        style={{ padding: '8px', color: ec.status === 'ACTIVE' ? '#00C853' : '#F44336', border: 'none', background: ec.status === 'ACTIVE' ? 'rgba(0, 200, 83, 0.1)' : 'rgba(244, 67, 54, 0.1)', cursor: 'pointer', borderRadius: '6px' }}
                                                    >
                                                        <Power size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteEndCustomer(ec.id)}
                                                        style={{ padding: '8px', color: '#E53E3E', border: 'none', background: 'rgba(229, 62, 62, 0.1)', cursor: 'pointer', borderRadius: '6px' }}
                                                        title="Delete End Customer"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEndCustomerFormData({ ...ec });
                                                            setEditingId(ec.id);
                                                            setShowForm(true);
                                                        }}
                                                        style={{ padding: '8px', color: 'var(--ae-blue)', border: 'none', background: 'rgba(0, 102, 204, 0.1)', cursor: 'pointer', borderRadius: '6px' }}
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : viewMode === 'financial_year' ? financialYears.map((fy) => (
                                        <tr key={fy.id} className="ae-table-row">
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 flex-shrink-0 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                                                        <CheckCircle size={20} />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1a1f36' }}>{fy.label}</div>
                                                        <div style={{ fontSize: '0.8rem', color: '#718096' }}>{fy.code} {fy.is_current_fy && <span style={{ background: '#EBF4FF', color: '#1B66D1', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', marginLeft: '8px' }}>CURRENT</span>}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <div style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 600 }}>{fy.code}</div>
                                            </td>
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <div style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 600 }}>{fy.start_date}</div>
                                            </td>
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <div style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 600 }}>{fy.end_date}</div>
                                            </td>
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <div style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 600 }}>{fy.is_current_fy ? 'YES' : 'NO'}</div>
                                            </td>
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', background: fy.status === 'ACTIVE' ? 'rgba(0, 200, 83, 0.1)' : 'rgba(244, 67, 54, 0.1)', color: fy.status === 'ACTIVE' ? '#00C853' : '#F44336' }}>
                                                    {fy.status === 'ACTIVE' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                                    {fy.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px 24px', textAlign: 'right', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => {
                                                            const startMonth = fy.start_date ? monthNames[new Date(fy.start_date).getMonth()] : 'April';
                                                            setFyFormData({ ...fy, first_month_of_fiscal_year: startMonth, first_month_of_tax_year: 'Same as fiscal year' });
                                                            setEditingId(fy.id);
                                                            setShowForm(true);
                                                        }}
                                                        style={{ padding: '8px', color: 'var(--ae-blue)', border: 'none', background: 'rgba(0, 102, 204, 0.1)', cursor: 'pointer', borderRadius: '6px' }}
                                                        title="Edit Financial Year"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownloadReport(fy)}
                                                        style={{ padding: '8px', color: '#10B981', border: 'none', background: 'rgba(16, 185, 129, 0.1)', cursor: 'pointer', borderRadius: '6px' }}
                                                        title="Download Invoice Register"
                                                    >
                                                        <Download size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : viewMode === 'product' ? products.map((prd) => (
                                        <tr key={prd.id} className="ae-table-row">
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 flex-shrink-0 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                                                        <Shield size={20} />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1a1f36' }}>{prd.name}</div>
                                                        <div style={{ fontSize: '0.8rem', color: '#718096' }}>{prd.product_code}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <div style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 600 }}>{prd.category}</div>
                                            </td>
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <div style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 500 }}>{prd.subcategory || '-'}</div>
                                            </td>
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', background: prd.status === 'ACTIVE' ? 'rgba(0, 200, 83, 0.1)' : 'rgba(244, 67, 54, 0.1)', color: prd.status === 'ACTIVE' ? '#00C853' : '#F44336' }}>
                                                    {prd.status === 'ACTIVE' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                                    {prd.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px 24px', textAlign: 'right', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => {
                                                            setProductFormData({ ...prd });
                                                            setEditingId(prd.id);
                                                            setShowForm(true);
                                                        }}
                                                        style={{ padding: '8px', color: 'var(--ae-blue)', border: 'none', background: 'rgba(0, 102, 204, 0.1)', cursor: 'pointer', borderRadius: '6px' }}
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : filteredCompanies.map((comp) => (
                                        <tr key={comp.id} className="ae-table-row">
                                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 flex-shrink-0 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] rounded-full flex items-center justify-center">
                                                        <Users size={20} />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1a1f36' }}>{comp.name}</div>
                                                        <div style={{ fontSize: '0.8rem', color: '#718096' }}>{comp.alias_name || 'No Alias'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                                <div className="flex items-center gap-2" style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 500 }}>
                                                    <Mail size={14} className="text-gray-400" /> {comp.email || '-'}
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                                <div style={{ fontSize: '0.9rem', color: '#4A5568', fontWeight: 600 }}>{comp.city || '-'}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#718096' }}>{comp.state_name || '-'}</div>
                                            </td>
                                            <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', background: 'rgba(0, 200, 83, 0.1)', color: '#00C853' }}>
                                                    <CheckCircle size={12} /> Active
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => {
                                                            setCompanyFormData({
                                                                name: comp.name || '',
                                                                entity: comp.entity || 'AE_IND',
                                                                customer_id: comp.customer_id || '',
                                                                region: comp.region || '',
                                                                contact_person: comp.contact_person || '',
                                                                alias_name: comp.alias_name || '',
                                                                logo: comp.logo || null,
                                                                address_line_1: comp.address_line_1 || '',
                                                                country: comp.country || 'India',
                                                                state: comp.state || '',
                                                                city: comp.city || '',
                                                                pincode: comp.pincode || '',
                                                                phone_number: comp.phone_number || '',
                                                                mobile_number: comp.mobile_number || '',
                                                                email: comp.email || '',
                                                                website_url: comp.website_url || '',
                                                                linked_company_profile: comp.linked_company_profile || '',
                                                                industry: comp.industry || '',
                                                                type: comp.type || 'CUSTOMER',
                                                                payment_terms: comp.payment_terms || 'NET_30',
                                                                base_currency: comp.base_currency || 'INR',
                                                                currency_symbol: comp.currency_symbol || '₹ / INR',
                                                                decimal_places: comp.decimal_places || 2,
                                                                is_gst_applicable: comp.is_gst_applicable ?? true,
                                                                gstin: comp.gstin || '',
                                                                state_code: comp.state_code || '',
                                                                msme_registered: comp.msme_registered ?? false,
                                                                msme_number: comp.msme_number || '',
                                                                pan: comp.pan || '',
                                                                tan: comp.tan || '',
                                                                cin: comp.cin || ''
                                                            });
                                                            setEditingId(comp.id);
                                                            setViewMode('company');
                                                            setShowForm(true);
                                                        }}
                                                        style={{ padding: '8px', color: 'var(--ae-blue)', border: 'none', background: 'rgba(0, 102, 204, 0.1)', cursor: 'pointer', borderRadius: '6px' }}
                                                        title="Edit Customer"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div >
        </div >
    );
}
    ;

export default UserManagement;
