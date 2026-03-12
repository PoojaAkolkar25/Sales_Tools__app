import React, { useState, useEffect } from 'react';
import { Save, Trash2, CheckCircle, Eye, Plus, Pencil, RotateCcw, XCircle, X } from 'lucide-react';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { formatToAppDate } from '../utils/dateUtils';
import SearchableDropdown from './SearchableDropdown';
import AutoExpandingTextarea from './AutoExpandingTextarea';

interface LineItem {
    type: string;
    description: string;
    hsn_sac: string;
    quantity: number;
    rate: number;
    discount: number;
    discount_percent?: number;
    gst_rate: number;
}



const InvoiceForm: React.FC<{
    onBack: () => void,
    invoiceId?: number | null,
    initialSoId?: number | null,
    initialMilestoneId?: number | null
}> = ({ onBack, invoiceId, initialSoId, initialMilestoneId }) => {
    const { showNotification, showConfirm } = useNotification();
    const [, setMilestones] = useState<any[]>([]);
    const [salesOrders, setSalesOrders] = useState<any[]>([]);
    const [companyProfiles, setCompanyProfiles] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [status, setStatus] = useState('DRAFT');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showRevertModal, setShowRevertModal] = useState(false);
    const [rejectComment, setRejectComment] = useState('');
    const [revertComment, setRevertComment] = useState('');
    const [activeAction, setActiveAction] = useState<string | null>(null);


    const [formData, setFormData] = useState({
        invoice_no: '',
        lead: '',
        milestone: '',
        sales_order: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        customer_gstin: '',
        customer_state: '',
        billing_address: '',
        shipping_address: '',
        currency: 'INR',
        is_gst_applicable: true,
        invoice_type: 'DOMESTIC',
        sales_tax_rate: 0,
        sales_tax_amount: 0,
        place_of_supply: '',
        authorized_signatory: '',
        gst_declaration: 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. This invoice is issued under Rule 46 of the CGST Rules, 2017.',
        lut_declaration: 'Supply meant for export under Letter of Undertaking (LUT) without payment of Integrated Tax as per Section 16(3) of the IGST Act, 2017 and Rule 96A of the CGST Rules, 2017.',
        irn: '',
        ack_no: '',
        ack_date: '',
        po_number: '',
        po_date: '',
        payment_terms_days: 30,
        gst_customer_type: 'CGST_SGST_9',
        currency_symbol: '₹',
        memo: '',
        selected_company: '',
        customer: '',
        customer_country: 'India',
        customer_name: ''
    });

    const [signatureFile, setSignatureFile] = useState<File | null>(null);
    const [sealFile, setSealFile] = useState<File | null>(null);
    const [editingColumn, setEditingColumn] = useState<string | null>(null);
    const [column_labels, setColumnLabels] = useState({
        type: 'TYPE',
        description: 'ITEM & DESCRIPTION',
        currency: 'CURRENCY',
        quantity: 'QTY',
        rate: 'RATE',
        discount_percent: 'DISCOUNT %',
        amount: 'AMOUNT'
    });

    const [lineItems, setLineItems] = useState<LineItem[]>([
        { type: 'Service', description: '', hsn_sac: '', quantity: 0, rate: 0, discount: 0, discount_percent: 0, gst_rate: 0 }
    ]);

    const [totals, setTotals] = useState({
        subtotal: 0,
        total_discount: 0,
        taxable_amount: 0,
        total_tax: 0,
        cgst_total: 0,
        sgst_total: 0,
        igst_total: 0,
        grand_total: 0
    });



    useEffect(() => {
        fetchInitialData();
        if (invoiceId) {
            fetchInvoiceDetails();
        } else {
            // Reset form for fresh creation (e.g. when clicking "Create New" while editing an existing invoice)
            setFormData({
                invoice_no: '',
                lead: '',
                milestone: '',
                sales_order: '',
                invoice_date: new Date().toISOString().split('T')[0],
                due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                customer_gstin: '',
                customer_state: '',
                billing_address: '',
                shipping_address: '',
                currency: 'INR',
                is_gst_applicable: true,
                invoice_type: 'DOMESTIC',
                sales_tax_rate: 0,
                sales_tax_amount: 0,
                place_of_supply: '',
                authorized_signatory: '',
                gst_declaration: 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. This invoice is issued under Rule 46 of the CGST Rules, 2017.',
                lut_declaration: 'Supply meant for export under Letter of Undertaking (LUT) without payment of Integrated Tax as per Section 16(3) of the IGST Act, 2017 and Rule 96A of the CGST Rules, 2017.',
                irn: '',
                ack_no: '',
                ack_date: '',
                po_number: '',
                po_date: '',
                payment_terms_days: 30,
                gst_customer_type: 'CGST_SGST_9',
                currency_symbol: '₹',
                memo: '',
                selected_company: '',
                customer: '',
                customer_country: 'India',
                customer_name: ''
            });
            setLineItems([
                { type: 'Service', description: '', hsn_sac: '', quantity: 0, rate: 0, discount: 0, discount_percent: 0, gst_rate: 0 }
            ]);
            setMilestones([]);
            setStatus('DRAFT');
            setIsReadOnly(false);
        }
    }, [invoiceId]);

    useEffect(() => {
        calculateTotals();
    }, [lineItems, formData.invoice_type, formData.customer_state, formData.is_gst_applicable]);


    const handleFinalise = async () => {
        if (!invoiceId) {
            showNotification('Please save the invoice as draft first', 'warning');
            return;
        }

        try {
            setLoading(true);
            await api.post(`/finance/invoices/${invoiceId}/finalise/`);
            showNotification('Invoice finalised successfully', 'success');
            fetchInvoiceDetails();
        } catch (error) {
            console.error('Error finalising invoice', error);
            showNotification('Error finalising invoice', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        if (!invoiceId || !rejectComment.trim()) {
            showNotification('Please provide a rejection reason', 'warning');
            return;
        }
        try {
            setLoading(true);
            await api.post(`/finance/invoices/${invoiceId}/reject/`, { comment: rejectComment });
            showNotification('Invoice rejected', 'success');
            setShowRejectModal(false);
            setRejectComment('');
            fetchInvoiceDetails();
        } catch (error) {
            console.error('Error rejecting invoice', error);
            showNotification('Error rejecting invoice', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRevert = async () => {
        if (!invoiceId || !revertComment.trim()) {
            showNotification('Please provide a reason for revert', 'warning');
            return;
        }
        try {
            setLoading(true);
            await api.post(`/finance/invoices/${invoiceId}/revert/`, { comment: revertComment });
            showNotification('Invoice reverted to draft', 'success');
            setShowRevertModal(false);
            setRevertComment('');
            fetchInvoiceDetails();
        } catch (error) {
            console.error('Error reverting invoice', error);
            showNotification('Error reverting invoice', 'error');
        } finally {
            setLoading(false);
        }
    };



    const fetchInitialData = async () => {
        try {
            const [leadsRes, statesRes, soRes, cpRes] = await Promise.all([
                api.get('/leads/'),
                api.get('/finance/state-masters/'),
                api.get('/sales-orders/?status=APPROVED'),
                api.get('/finance/company-profile/')
            ]);
            setStates(statesRes.data);
            setSalesOrders(soRes.data);
            setCompanyProfiles(cpRes.data);

            // If we are creating a new invoice and have an initial SO ID
            if (!invoiceId && initialSoId) {
                // We need to wait for the sales orders to be set in state, 
                // but since we just got them, we can use them directly or call the handler
                // Let's call a modified version of handleSalesOrderChange that accepts the data directly
                await prePopulateFromSo(initialSoId, soRes.data, leadsRes.data);
            }
        } catch (error) {
            console.error('Error fetching initial data', error);
        }
    };

    const prePopulateFromSo = async (soId: number, currentSalesOrders: any[], currentLeads: any[]) => {
        const so = currentSalesOrders.find(s => s.id === soId);
        if (so) {
            const lead = so.customer_name ? (currentLeads.find(l => l.customer_name?.toLowerCase().trim() === so.customer_name?.toLowerCase().trim())) : null;
            const cp = so.customer_name ? (companyProfiles.find(c => c.name?.toLowerCase().trim() === so.customer_name?.toLowerCase().trim())) : (lead ? (companyProfiles.find(c => c.name?.toLowerCase().trim() === lead.customer_name?.toLowerCase().trim())) : null);

            if (cp) {
                // Determine if any matching leads are needed or remove this logic if completely unused
            }

            setFormData(prev => ({
                ...prev,
                sales_order: soId.toString(),
                lead: lead ? lead.id.toString() : prev.lead,
                selected_company: cp ? cp.id.toString() : prev.selected_company,
                customer_gstin: cp?.gstin || lead?.gstin || prev.customer_gstin,
                customer_state: cp?.state?.toString() || prev.customer_state,
                currency: so.currency || prev.currency,
                billing_address: so.billing_address || cp?.address_line_1 || (lead ? lead.address : prev.billing_address),
                shipping_address: so.shipping_address || cp?.address_line_1 || (lead ? lead.address : prev.shipping_address),
                po_number: so.po_number || '',
                po_date: so.po_date || '',
                milestone: initialMilestoneId ? initialMilestoneId.toString() : prev.milestone,
                gst_customer_type: ((cp?.gst_customer_type === 'DOMESTIC' || lead?.gst_customer_type === 'DOMESTIC') ? 'CGST_SGST_9' : (cp?.gst_customer_type || lead?.gst_customer_type)) || prev.gst_customer_type,
                currency_symbol: (so.currency || prev.currency) === 'INR' ? '₹' : '$'
            }));

            try {
                const response = await api.get(`/milestones/?sales_order=${soId}`);
                setMilestones(response.data);
            } catch (error) {
                console.error('Error fetching milestones', error);
            }

            if (so.items && so.items.length > 0) {
                setLineItems(so.items.map((item: any) => {
                    const qty = parseFloat(item.qty) || 0;
                    const rate = parseFloat(item.rate) || 0;
                    const discount = parseFloat(item.discount) || 0;
                    const discount_percent = (qty * rate) > 0 ? (discount / (qty * rate)) * 100 : 0;
                    return {
                        type: item.item_type === 'SERVICES' ? 'Service' : 'Product',
                        description: item.product_name + (item.description ? ` - ${item.description}` : ''),
                        hsn_sac: '',
                        quantity: qty,
                        rate: rate,
                        discount: discount,
                        discount_percent: discount_percent,
                        gst_rate: 0
                    };
                }));
            }
        }
    };


    const fetchInvoiceDetails = async () => {
        if (!invoiceId) return;
        setLoading(true);
        try {
            const response = await api.get(`/finance/invoices/${invoiceId}/`);
            const inv = response.data;

            setFormData({
                invoice_no: inv.invoice_no,
                lead: inv.lead?.toString() || '',
                milestone: inv.milestone?.toString() || '',
                sales_order: inv.sales_order?.toString() || '',
                invoice_date: inv.invoice_date,
                due_date: inv.due_date,
                customer_gstin: inv.customer_gstin || '',
                customer_state: inv.customer_state || '',
                billing_address: inv.billing_address || '',
                shipping_address: inv.shipping_address || '',
                currency: inv.currency,
                is_gst_applicable: inv.is_gst_applicable,
                invoice_type: inv.invoice_type,
                sales_tax_rate: inv.sales_tax_rate || 0,
                sales_tax_amount: inv.sales_tax_amount || 0,
                place_of_supply: inv.place_of_supply || '',
                authorized_signatory: inv.authorized_signatory || '',
                gst_declaration: inv.gst_declaration || '',
                lut_declaration: inv.lut_declaration || '',
                irn: inv.irn || '',
                ack_no: inv.ack_no || '',
                ack_date: inv.ack_date || '',
                payment_terms_days: inv.payment_terms_days || 30,
                po_number: inv.po_number || '',
                po_date: inv.po_date || '',
                gst_customer_type: (inv.lead_details?.gst_customer_type === 'DOMESTIC' || inv.gst_customer_type === 'DOMESTIC') ? 'CGST_SGST_9' : (inv.lead_details?.gst_customer_type || inv.gst_customer_type || 'CGST_SGST_9'),
                currency_symbol: inv.currency === 'INR' ? '₹' : '$',
                memo: inv.memo || '',
                selected_company: inv.customer?.toString() || '',
                customer: inv.customer?.toString() || '',
                customer_country: inv.customer_country || 'India',
                customer_name: inv.customer_name || inv.lead_details?.customer_name || ''
            });

            if (inv.lead_details && !inv.customer) {
                const cp = companyProfiles.find(c => c.name?.toLowerCase().trim() === inv.lead_details.customer_name?.toLowerCase().trim());
                if (cp) {
                    setFormData(prev => ({ ...prev, selected_company: cp.id.toString() }));
                }
            }

            setStatus(inv.status);
            setIsReadOnly(inv.status !== 'DRAFT');

            if (inv.line_items && inv.line_items.length > 0) {
                setLineItems(inv.line_items.map((item: any) => {
                    const qty = parseFloat(item.quantity) || 0;
                    const rate = parseFloat(item.rate) || 0;
                    const discount = parseFloat(item.discount) || 0;
                    const discount_percent = (qty * rate) > 0 ? (discount / (qty * rate)) * 100 : 0;
                    return {
                        type: item.type || 'Service',
                        description: item.description,
                        hsn_sac: item.hsn_sac || '',
                        quantity: qty,
                        rate: rate,
                        discount: discount,
                        discount_percent: discount_percent,
                        gst_rate: item.igst_rate > 0 ? item.igst_rate : (item.cgst_rate + item.sgst_rate)
                    };
                }));
            }
            if (inv.sales_order) {
                try {
                    const msRes = await api.get(`/milestones/?sales_order=${inv.sales_order}`);
                    setMilestones(msRes.data);
                } catch (error) {
                    console.error('Error fetching milestones for invoice', error);
                }
            }
        } catch (error) {
            console.error('Error fetching invoice details', error);
            showNotification('Error loading invoice details', 'error');
        } finally {
            setLoading(false);
        }
    };


    const handleCompanyChange = async (companyId: string | number) => {
        const cp = companyProfiles.find(c => c.id.toString() === companyId.toString());
        if (cp) {
            const country = cp.country || 'India';
            const isIndia = country.toLowerCase() === 'india';
            let gct = cp.gst_customer_type === 'DOMESTIC' ? 'CGST_SGST_9' : (cp.gst_customer_type || formData.gst_customer_type);

            // Auto-fallback for non-India
            if (!isIndia && !gct.startsWith('IGST_0')) {
                gct = 'IGST_0_EXPORT';
            }

            setFormData(prev => ({
                ...prev,
                selected_company: companyId.toString(),
                customer: companyId.toString(),
                lead: '',
                customer_gstin: cp.gstin || prev.customer_gstin,
                customer_state: cp.state?.toString() || prev.customer_state,
                billing_address: cp.address_line_1 || prev.billing_address,
                shipping_address: cp.address_line_1 || prev.shipping_address,
                gst_customer_type: gct,
                currency: cp.base_currency || prev.currency,
                currency_symbol: (cp.base_currency || prev.currency) === 'INR' ? '₹' : '$',
                customer_country: country,
                payment_terms_days: cp.payment_terms === 'IMMEDIATE' ? 0 : cp.payment_terms === 'NET_30' ? 30 : cp.payment_terms === 'NET_60' ? 60 : cp.payment_terms === 'NET_90' ? 90 : 30,
                // Clear SO/Milestone if customer changes
                sales_order: '',
                milestone: ''
            }));

            // Fetch milestones for SOs belonging to this customer and autopopulate
            try {
                const customerSOs = salesOrders.filter(so =>
                    so.customer_name?.toLowerCase().trim() === cp.name?.toLowerCase().trim()
                );
                if (customerSOs.length > 0) {
                    const firstSO = customerSOs[0];
                    const milestonePromise = api.get(`/milestones/?sales_order=${firstSO.id}`);
                    const response = await milestonePromise;
                    const customerMilestones = response.data;

                    setMilestones(customerMilestones);

                    // Autopopulate SO and first Milestone
                    const firstMilestone = customerMilestones.length > 0 ? customerMilestones[0] : null;

                    setFormData(prev => ({
                        ...prev,
                        sales_order: firstSO.id.toString(),
                        milestone: firstMilestone ? firstMilestone.id.toString() : '',
                        po_number: firstSO.po_number || prev.po_number,
                        po_date: firstSO.po_date || prev.po_date,
                        billing_address: firstSO.billing_address || prev.billing_address,
                        shipping_address: firstSO.shipping_address || prev.shipping_address,
                    }));

                    if (firstSO.items && firstSO.items.length > 0) {
                        setLineItems(firstSO.items.map((item: any) => {
                            const qty = parseFloat(item.qty) || 0;
                            const rate = parseFloat(item.rate) || 0;
                            const discount = parseFloat(item.discount) || 0;
                            const discount_percent = (qty * rate) > 0 ? (discount / (qty * rate)) * 100 : 0;
                            return {
                                type: item.item_type === 'SERVICES' ? 'Service' : 'Product',
                                description: item.product_name + (item.description ? ` - ${item.description}` : ''),
                                hsn_sac: '',
                                quantity: qty,
                                rate: rate,
                                discount: discount,
                                discount_percent: discount_percent,
                                gst_rate: 0
                            };
                        }));
                    }
                } else {
                    setMilestones([]);
                }
            } catch (error) {
                console.error('Error fetching milestones for customer', error);
                setMilestones([]);
            }
        } else {
            setFormData(prev => ({ ...prev, selected_company: companyId.toString(), lead: '', customer: '' }));
            setMilestones([]);
        }
    };






    const calculateTotals = () => {
        let subtotal = 0;
        let totalDiscount = 0;
        let totalTax = 0;
        let cgst_total = 0;
        let sgst_total = 0;
        let igst_total = 0;

        lineItems.forEach(item => {
            const qty = parseFloat(item.quantity.toString()) || 0;
            const rate = parseFloat(item.rate.toString()) || 0;
            const discount_percent = parseFloat((item as any).discount_percent?.toString() || '0') || 0;
            const discount = (qty * rate * discount_percent) / 100;
            const gst_rate = parseFloat(item.gst_rate.toString()) || 0;

            const lineSubtotal = qty * rate;
            const taxable = lineSubtotal - discount;
            let tax = 0;

            if (formData.is_gst_applicable) {
                if (formData.gst_customer_type === 'CGST_SGST_9') {
                    const cgst = taxable * (gst_rate / 2 / 100);
                    const sgst = taxable * (gst_rate / 2 / 100);
                    cgst_total += cgst;
                    sgst_total += sgst;
                    tax = cgst + sgst;
                } else if (formData.gst_customer_type === 'IGST_18') {
                    const igst = taxable * (gst_rate / 100);
                    igst_total += igst;
                    tax = igst;
                } else if (formData.gst_customer_type === 'IGST_0_SEZ' || formData.gst_customer_type === 'IGST_0_EXPORT') {
                    // IGST 0%
                    igst_total += 0;
                    tax = 0;
                } else {
                    tax = taxable * (gst_rate / 100);
                }
            }

            subtotal += lineSubtotal;
            totalDiscount += discount;
            totalTax += tax;
        });

        const taxableAmount = subtotal - totalDiscount;
        let sales_tax_amount = 0;
        if (formData.invoice_type === 'USA') {
            sales_tax_amount = 0; // Taxation is not applicable to AE USA
        }

        setTotals({
            subtotal,
            total_discount: totalDiscount,
            taxable_amount: taxableAmount,
            total_tax: totalTax,
            cgst_total,
            sgst_total,
            igst_total,
            grand_total: Math.round(taxableAmount + totalTax + sales_tax_amount)
        });
        setFormData(prev => ({ ...prev, sales_tax_amount }));
    };

    const addLineItem = () => {
        setLineItems([...lineItems, { type: 'Service', description: '', hsn_sac: '', quantity: 0, rate: 0, discount: 0, discount_percent: 0, gst_rate: 0 }]);
    };

    const removeLineItem = (index: number) => {
        if (lineItems.length > 1) {
            setLineItems(lineItems.filter((_, i) => i !== index));
        }
    };

    const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
        const newItems = [...lineItems];
        newItems[index] = { ...newItems[index], [field]: value };
        setLineItems(newItems);
    };

    const handleHeaderChange = (column: string, value: string) => {
        setColumnLabels(prev => ({
            ...prev,
            [column]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation: Mandatory Type
        const hasInvalidTypes = lineItems.some(item => !item.type);
        if (hasInvalidTypes) {
            showNotification('Please select a Type for all Invoice Item rows', 'warning');
            return;
        }

        setLoading(true);
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                let value = (formData as any)[key];
                if (value !== null && value !== undefined) {
                    data.append(key, value);
                }
            });

            // Append line items as JSON string (or handle differently if needed)
            const itemsToSubmit = lineItems.map(item => ({
                ...item,
                discount: (Number(item.quantity) || 0) * (Number(item.rate) || 0) * (Number(item.discount_percent) || 0) / 100
            }));
            data.append('line_items_data', JSON.stringify(itemsToSubmit));

            if (signatureFile) data.append('signature_image', signatureFile);
            if (sealFile) data.append('company_seal', sealFile);

            if (invoiceId) {
                await api.put(`/finance/invoices/${invoiceId}/`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                showNotification('Invoice updated successfully', 'success');
            } else {
                await api.post('/finance/invoices/', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                showNotification('Invoice created successfully', 'success');
            }
            onBack();
        } catch (error: any) {
            console.error('Error saving invoice', error);
            let errorMsg = 'Error saving invoice';
            if (error.response?.data) {
                const data = error.response.data;
                if (data.error) errorMsg = data.error;
                else if (typeof data === 'object') {
                    const errors = [];
                    for (const [key, value] of Object.entries(data)) {
                        if (Array.isArray(value)) errors.push(`${key}: ${value[0]}`);
                        else if (typeof value === 'string') errors.push(`${key}: ${value}`);
                    }
                    if (errors.length > 0) errorMsg = errors.join(' | ');
                    else errorMsg = JSON.stringify(data);
                }
            }
            showNotification(errorMsg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePreview = async () => {
        try {
            setLoading(true);
            let response;
            let filename = `Invoice_${formData.invoice_no || 'Draft'}_Preview.pdf`;

            // Always use preview logic to show unsaved changes
            const currentCustomer = companyProfiles.find(c => c.id.toString() === formData.customer);
            const currentState = states.find(s => s.id.toString() === formData.customer_state);

            const payload = {
                ...formData,
                customer_name: currentCustomer?.name || '---',
                customer_state_name: currentState?.name || '',
                customer_state_code: currentState?.code || '',
                customer_pan: currentCustomer?.pan || '',
                customer_address_line_2: currentCustomer?.address_line_2 || '',
                customer_city: currentCustomer?.city || '',
                customer_pincode: currentCustomer?.pincode || '',
                customer_cin: currentCustomer?.cin || '',
                customer_msme: currentCustomer?.msme_number || '',
                line_items: lineItems
            };
            response = await api.post(`/finance/invoices/preview_pdf/`, payload, { responseType: 'blob' });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error previewing PDF', error);
            showNotification('Error generating preview', 'error');
        } finally {
            setLoading(false);
        }
    };

    const SectionHeader = ({ title, extra }: { title: string, extra?: React.ReactNode }) => (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                    width: '4px',
                    height: '20px',
                    background: 'var(--ae-blue)',
                    borderRadius: '2px',
                    flexShrink: 0
                }}></span>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--theme-primary)', margin: 0 }}>
                    {title}
                </h3>
            </div>
            {extra}
        </div>
    );

    return (
        <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto' }}>


            <div style={{
                background: 'white',
                border: '1px solid #E0E6ED',
                borderRadius: '12px',
                width: '100%',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div>
                    <SectionHeader title="Invoice Details" />
                    <div className="ae-grid-responsive-5" style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Invoice Date</label>
                            <input type="text" className="ae-input" disabled value={formatToAppDate(formData.invoice_date)} style={{ background: '#f8fafc' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Invoice No.</label>
                            <div className="ae-input" style={{ background: '#f8fafc', display: 'flex', alignItems: 'center', minHeight: '38px' }}>
                                {formData.invoice_no || 'Auto-generated'}
                            </div>
                        </div>
                        <div></div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>PO date</label>
                            <input type="text" className="ae-input" disabled value={formatToAppDate(formData.po_date)} style={{ background: '#f8fafc' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>PO Number</label>
                            <input type="text" className="ae-input" disabled={isReadOnly} value={formData.po_number} onChange={e => setFormData({ ...formData, po_number: e.target.value })} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Customer Name</label>
                            {isReadOnly || invoiceId ? (
                                <div className="ae-input" style={{ background: '#f8fafc', display: 'flex', alignItems: 'center', minHeight: '38px' }}>
                                    {(formData as any).customer_name || companyProfiles.find(cp => cp.id.toString() === formData.selected_company.toString())?.name || '---'}
                                </div>
                            ) : (
                                <SearchableDropdown
                                    options={companyProfiles.map(cp => ({ value: cp.id.toString(), label: cp.name || '' }))}
                                    value={formData.selected_company}
                                    onChange={(val) => handleCompanyChange(String(val))}
                                    placeholder="Select Customer"
                                />
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Address (Bill to)</label>
                            <AutoExpandingTextarea
                                className="ae-input"
                                disabled={isReadOnly}
                                value={formData.billing_address}
                                onChange={e => setFormData({ ...formData, billing_address: e.target.value })}
                                placeholder="Address (Bill to)"
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Address (Shift to)</label>
                            <AutoExpandingTextarea
                                className="ae-input"
                                disabled={isReadOnly}
                                value={formData.shipping_address}
                                onChange={e => setFormData({ ...formData, shipping_address: e.target.value })}
                                placeholder="Address (Shift to)"
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Payment Terms</label>
                            <input type="number" className="ae-input" disabled={isReadOnly} value={formData.payment_terms_days} onChange={e => setFormData({ ...formData, payment_terms_days: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Payment due date</label>
                            <input type="text" className="ae-input" disabled value={formatToAppDate(formData.due_date)} style={{ background: '#f8fafc' }} />
                        </div>
                    </div>
                </div>


                <div style={{ borderTop: '1px solid #E0E6ED', paddingTop: '24px', marginTop: '24px' }}>
                    <SectionHeader title="Invoice Items" />
                    <div className="ae-table-wrapper" style={{
                        marginTop: '24px',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        overflowX: 'auto',
                        background: 'white',
                        position: 'relative',
                        zIndex: 10
                    }}>
                        <table className="ae-table no-row-hover" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                            <colgroup>
                                <col style={{ width: '40px' }} />
                                <col style={{ width: '60px' }} />
                                <col style={{ width: '130px' }} />
                                <col style={{ width: 'auto' }} />
                                <col style={{ width: '80px' }} />
                                <col style={{ width: '80px' }} />
                                <col style={{ width: '120px' }} />
                                <col style={{ width: '100px' }} />
                                <col style={{ width: '130px' }} />
                                <col style={{ width: '40px' }} />
                            </colgroup>
                            <thead style={{ background: 'var(--bg-accent)' }}>
                                <tr>
                                    <th style={{ padding: '10px 4px', borderBottom: '1px solid #E0E6ED' }}></th>
                                    <th style={{ padding: '10px 4px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED' }}>SR.NO.</th>
                                    <th style={{ padding: '10px 4px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {editingColumn === 'type' ? (
                                                <input
                                                    autoFocus
                                                    className="ae-input-subtle"
                                                    style={{ background: 'white', border: '1px solid #E2E8F0', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, width: '100%', outline: 'none', fontSize: '0.75rem' }}
                                                    value={column_labels.type}
                                                    onChange={(e) => handleHeaderChange('type', e.target.value)}
                                                    onBlur={() => setEditingColumn(null)}
                                                    onKeyDown={(e) => e.key === 'Enter' && setEditingColumn(null)}
                                                />
                                            ) : (
                                                <>
                                                    <span>{column_labels.type || 'TYPE'}</span>
                                                    <span style={{ color: 'var(--theme-primary)', marginLeft: '2px' }}>*</span>
                                                    {!isReadOnly && <Pencil size={10} style={{ cursor: 'pointer', color: '#718096', marginLeft: '4px' }} onClick={() => setEditingColumn('type')} />}
                                                </>
                                            )}
                                        </div>
                                    </th>
                                    <th style={{ padding: '10px 4px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {editingColumn === 'description' ? (
                                                <input
                                                    autoFocus
                                                    className="ae-input-subtle"
                                                    style={{ background: 'white', border: '1px solid #E2E8F0', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, width: '100%', outline: 'none', fontSize: '0.75rem' }}
                                                    value={column_labels.description}
                                                    onChange={(e) => handleHeaderChange('description', e.target.value)}
                                                    onBlur={() => setEditingColumn(null)}
                                                    onKeyDown={(e) => e.key === 'Enter' && setEditingColumn(null)}
                                                />
                                            ) : (
                                                <>
                                                    <span>{column_labels.description || 'ITEM & DESCRIPTION'}</span>
                                                    {!isReadOnly && <Pencil size={10} style={{ cursor: 'pointer', color: '#718096', marginLeft: '4px' }} onClick={() => setEditingColumn('description')} />}
                                                </>
                                            )}
                                        </div>
                                    </th>
                                    <th style={{ padding: '10px 4px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            {editingColumn === 'currency' ? (
                                                <input
                                                    autoFocus
                                                    className="ae-input-subtle"
                                                    style={{ background: 'white', border: '1px solid #E2E8F0', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, width: '100%', outline: 'none', fontSize: '0.75rem', textAlign: 'center' }}
                                                    value={column_labels.currency}
                                                    onChange={(e) => handleHeaderChange('currency', e.target.value)}
                                                    onBlur={() => setEditingColumn(null)}
                                                    onKeyDown={(e) => e.key === 'Enter' && setEditingColumn(null)}
                                                />
                                            ) : (
                                                <>
                                                    <span>{column_labels.currency || 'CURRENCY'}</span>
                                                    {!isReadOnly && <Pencil size={10} style={{ cursor: 'pointer', color: '#718096', marginLeft: '4px' }} onClick={() => setEditingColumn('currency')} />}
                                                </>
                                            )}
                                        </div>
                                    </th>
                                    <th style={{ padding: '10px 4px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            {editingColumn === 'quantity' ? (
                                                <input
                                                    autoFocus
                                                    className="ae-input-subtle"
                                                    style={{ background: 'white', border: '1px solid #E2E8F0', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, width: '100%', outline: 'none', fontSize: '0.75rem', textAlign: 'center' }}
                                                    value={column_labels.quantity}
                                                    onChange={(e) => handleHeaderChange('quantity', e.target.value)}
                                                    onBlur={() => setEditingColumn(null)}
                                                    onKeyDown={(e) => e.key === 'Enter' && setEditingColumn(null)}
                                                />
                                            ) : (
                                                <>
                                                    <span>{column_labels.quantity || 'QTY'}</span>
                                                    {!isReadOnly && <Pencil size={10} style={{ cursor: 'pointer', color: '#718096', marginLeft: '4px' }} onClick={() => setEditingColumn('quantity')} />}
                                                </>
                                            )}
                                        </div>
                                    </th>
                                    <th style={{ padding: '10px 4px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            {editingColumn === 'rate' ? (
                                                <input
                                                    autoFocus
                                                    className="ae-input-subtle"
                                                    style={{ background: 'white', border: '1px solid #E2E8F0', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, width: '100%', outline: 'none', fontSize: '0.75rem', textAlign: 'center' }}
                                                    value={column_labels.rate}
                                                    onChange={(e) => handleHeaderChange('rate', e.target.value)}
                                                    onBlur={() => setEditingColumn(null)}
                                                    onKeyDown={(e) => e.key === 'Enter' && setEditingColumn(null)}
                                                />
                                            ) : (
                                                <>
                                                    <span>{column_labels.rate || 'RATE'}</span>
                                                    {!isReadOnly && <Pencil size={10} style={{ cursor: 'pointer', color: '#718096', marginLeft: '4px' }} onClick={() => setEditingColumn('rate')} />}
                                                </>
                                            )}
                                        </div>
                                    </th>
                                    <th style={{ padding: '10px 4px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            {editingColumn === 'discount_percent' ? (
                                                <input
                                                    autoFocus
                                                    className="ae-input-subtle"
                                                    style={{ background: 'white', border: '1px solid #E2E8F0', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, width: '100%', outline: 'none', fontSize: '0.75rem', textAlign: 'center' }}
                                                    value={column_labels.discount_percent}
                                                    onChange={(e) => handleHeaderChange('discount_percent', e.target.value)}
                                                    onBlur={() => setEditingColumn(null)}
                                                    onKeyDown={(e) => e.key === 'Enter' && setEditingColumn(null)}
                                                />
                                            ) : (
                                                <>
                                                    <span>{column_labels.discount_percent || 'DISCOUNT %'}</span>
                                                    {!isReadOnly && <Pencil size={10} style={{ cursor: 'pointer', color: '#718096', marginLeft: '4px' }} onClick={() => setEditingColumn('discount_percent')} />}
                                                </>
                                            )}
                                        </div>
                                    </th>
                                    <th style={{ padding: '10px 4px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid #E0E6ED' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                            {editingColumn === 'amount' ? (
                                                <input
                                                    autoFocus
                                                    className="ae-input-subtle"
                                                    style={{ background: 'white', border: '1px solid #E2E8F0', padding: '2px 4px', borderRadius: '4px', fontWeight: 700, width: '100%', outline: 'none', fontSize: '0.75rem', textAlign: 'right' }}
                                                    value={column_labels.amount}
                                                    onChange={(e) => handleHeaderChange('amount', e.target.value)}
                                                    onBlur={() => setEditingColumn(null)}
                                                    onKeyDown={(e) => e.key === 'Enter' && setEditingColumn(null)}
                                                />
                                            ) : (
                                                <>
                                                    <span>{column_labels.amount || 'AMOUNT'}</span>
                                                    {!isReadOnly && <Pencil size={10} style={{ cursor: 'pointer', color: '#718096', marginLeft: '4px' }} onClick={() => setEditingColumn('amount')} />}
                                                </>
                                            )}
                                        </div>
                                    </th>
                                    <th style={{ padding: '10px 4px', borderBottom: '1px solid #E0E6ED' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {lineItems.map((item, index) => (
                                    <tr key={index} style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '12px 4px' }}>
                                            {!isReadOnly && index === lineItems.length - 1 && (
                                                <button
                                                    type="button"
                                                    onClick={addLineItem}
                                                    style={{
                                                        width: '22px',
                                                        height: '22px',
                                                        borderRadius: '4px',
                                                        background: '#F0F9FF',
                                                        color: '#0284C7',
                                                        border: '1px solid #BAE6FD',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        margin: '0 auto'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = '#E0F2FE';
                                                        e.currentTarget.style.borderColor = '#7DD3FC';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = '#F0F9FF';
                                                        e.currentTarget.style.borderColor = '#BAE6FD';
                                                    }}
                                                    title="Add Row"
                                                >
                                                    <Plus size={13} />
                                                </button>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '12px 4px' }}>
                                            <span style={{ color: '#4A5568', fontWeight: 400, fontSize: '0.85rem' }}>{index + 1}</span>
                                        </td>
                                        <td style={{ padding: '8px' }}>
                                            <SearchableDropdown
                                                options={[
                                                    { value: 'Service', label: 'Service' },
                                                    { value: 'Product', label: 'Product' },
                                                    { value: 'Other', label: 'Other' }
                                                ]}
                                                value={item.type}
                                                onChange={val => updateLineItem(index, 'type', String(val))}
                                                disabled={isReadOnly}
                                                placeholder="Select Type"
                                                className="table-dropdown"
                                            />
                                        </td>
                                        <td style={{ padding: '8px' }}>
                                            <AutoExpandingTextarea
                                                disabled={isReadOnly}
                                                placeholder="Item Name & Description"
                                                style={{
                                                    padding: '8px 12px',
                                                    fontSize: '0.85rem',
                                                    width: '100%',
                                                    borderRadius: '8px',
                                                    minHeight: '48px',
                                                    border: '1px solid #E2E8F0',
                                                    outline: 'none',
                                                    background: isReadOnly ? '#f8fafc' : 'white'
                                                }}
                                                value={item.description}
                                                onChange={e => updateLineItem(index, 'description', e.target.value)}
                                                maxRows={5}
                                            />
                                        </td>
                                        <td style={{ padding: '4px' }}>
                                            <div style={{ height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', color: '#4A5568', fontWeight: 600 }}>
                                                {formData.currency}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '8px' }}>
                                            <input
                                                type="number"
                                                disabled={isReadOnly}
                                                className="ae-input"
                                                style={{ width: '100%', height: '36px', textAlign: 'center', borderRadius: '8px', padding: '4px 8px' }}
                                                value={item.quantity === 0 ? '' : item.quantity}
                                                placeholder="0"
                                                onChange={e => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                            />
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: '8px', color: '#718096', fontSize: '0.75rem', pointerEvents: 'none', zIndex: 1 }}>{formData.currency_symbol}</span>
                                                <input
                                                    type="number"
                                                    disabled={isReadOnly}
                                                    className="ae-input"
                                                    style={{ width: '100%', height: '36px', borderRadius: '8px', padding: '4px 8px 4px 24px', textAlign: 'right' }}
                                                    value={item.rate === 0 ? '' : item.rate}
                                                    placeholder="0.00"
                                                    onChange={e => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                                                />
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                                <input
                                                    type="number"
                                                    disabled={isReadOnly}
                                                    className="ae-input"
                                                    style={{ width: '80px', height: '36px', borderRadius: '8px', padding: '4px 8px', textAlign: 'center' }}
                                                    value={item.discount_percent === 0 ? '' : item.discount_percent}
                                                    placeholder="0"
                                                    onChange={e => updateLineItem(index, 'discount_percent', parseFloat(e.target.value) || 0)}
                                                />
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#1a1f36', paddingRight: '12px', fontSize: '0.9rem' }}>
                                            {formData.currency_symbol}
                                            {(() => {
                                                const qty = Number(item.quantity) || 0;
                                                const rate = Number(item.rate) || 0;
                                                const discount_pct = Number(item.discount_percent) || 0;
                                                const discount = (qty * rate * discount_pct) / 100;
                                                const gst = formData.is_gst_applicable ? (Number(item.gst_rate) || 0) : 0;
                                                const val = (qty * rate - discount) * (1 + gst / 100);
                                                return isNaN(val) ? '0.00' : val.toLocaleString(undefined, { minimumFractionDigits: 2 });
                                            })()}
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '8px' }}>
                                            {!isReadOnly && lineItems.length > 1 && (
                                                <button type="button" onClick={() => removeLineItem(index)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', padding: '4px', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: 'var(--bg-accent)', borderTop: '1px solid #E0E6ED' }}>
                                    <td colSpan={8} style={{ padding: '8px 16px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Invoice Value:</td>
                                    <td style={{ padding: '8px 16px', textAlign: 'right', fontSize: '1rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                                        <span style={{ color: 'var(--theme-primary)', marginRight: '4px' }}>{formData.currency_symbol}</span>
                                        {totals.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* e-Invoice Details Section - Positioned after Items Table */}
                <div style={{ borderTop: '1px solid #E0E6ED', paddingTop: '24px', marginTop: '24px' }}>
                    <SectionHeader title="e-Invoice Details" />
                    <div className="ae-grid-responsive-5">
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>IRN</label>
                            <input
                                className="ae-input"
                                disabled={isReadOnly}
                                value={formData.irn}
                                onChange={e => setFormData({ ...formData, irn: e.target.value })}
                                placeholder="Enter IRN"
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Ack No.</label>
                            <input
                                className="ae-input"
                                disabled={isReadOnly}
                                value={formData.ack_no}
                                onChange={e => setFormData({ ...formData, ack_no: e.target.value })}
                                placeholder="Enter Ack No."
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Ack Date</label>
                            <input
                                type="date"
                                className="ae-input"
                                disabled={isReadOnly}
                                value={formData.ack_date}
                                onChange={e => setFormData({ ...formData, ack_date: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ borderTop: '1px solid #E0E6ED', paddingTop: '24px', marginTop: '24px' }}>
                    <SectionHeader title="Compliance & Signatory" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Authorized Signatory</label>
                            <input className="ae-input" placeholder="Authorized Signatory" disabled={isReadOnly} value={formData.authorized_signatory} onChange={e => setFormData({ ...formData, authorized_signatory: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Signature & Seal</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <label style={{ flex: 1, padding: '8px', border: '1px dashed #E0E6ED', borderRadius: '6px', textAlign: 'center', cursor: 'pointer', fontSize: '0.7rem' }}>
                                    {signatureFile ? 'Signature selected' : 'Upload Signature'}
                                    <input type="file" hidden accept="image/*" onChange={e => setSignatureFile(e.target.files?.[0] || null)} />
                                </label>
                                <label style={{ flex: 1, padding: '8px', border: '1px dashed #E0E6ED', borderRadius: '6px', textAlign: 'center', cursor: 'pointer', fontSize: '0.7rem' }}>
                                    {sealFile ? 'Seal selected' : 'Upload Seal'}
                                    <input type="file" hidden accept="image/*" onChange={e => setSealFile(e.target.files?.[0] || null)} />
                                </label>
                            </div>
                        </div>
                    </div>

                    {formData.invoice_type === 'EXPORT' ? (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>LUT Declaration (Export)</label>
                            <AutoExpandingTextarea
                                disabled={isReadOnly}
                                style={{ width: '100%', minHeight: '48px', padding: '8px 12px', borderRadius: '6px', border: isReadOnly ? 'none' : '1px solid #E2E8F0', lineHeight: '1.5', background: isReadOnly ? 'var(--bg-secondary)' : 'white', fontSize: '0.85rem', outline: 'none' }}
                                value={formData.lut_declaration}
                                onChange={e => setFormData({ ...formData, lut_declaration: e.target.value })}
                            />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>GST Declaration (India)</label>
                            <AutoExpandingTextarea
                                disabled={isReadOnly}
                                style={{ width: '100%', minHeight: '48px', padding: '8px 12px', borderRadius: '6px', border: isReadOnly ? 'none' : '1px solid #E2E8F0', lineHeight: '1.5', background: isReadOnly ? 'var(--bg-secondary)' : 'white', fontSize: '0.85rem', outline: 'none' }}
                                value={formData.gst_declaration}
                                onChange={e => setFormData({ ...formData, gst_declaration: e.target.value })}
                            />
                        </div>
                    )}
                </div>

                <div style={{ borderTop: '1px solid #E0E6ED', paddingTop: '24px', marginTop: '24px' }}>
                    <SectionHeader title="Invoice Summary" />
                    <div style={{ background: '#F8FAFC', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <span style={{ color: '#4A5568', fontSize: '0.9rem' }}>Subtotal</span>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1A202C' }}>{formData.currency_symbol} {totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        {totals.total_discount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <span style={{ color: '#4A5568', fontSize: '0.9rem' }}>Total Discount</span>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#E53E3E' }}>- {formData.currency_symbol} {totals.total_discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        {totals.total_discount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px dashed #E2E8F0' }}>
                                <span style={{ color: '#4A5568', fontSize: '0.9rem', fontWeight: 600 }}>Taxable Amount</span>
                                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{formData.currency_symbol} {totals.taxable_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}

                        {formData.is_gst_applicable && totals.cgst_total > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <span style={{ color: '#4A5568', fontSize: '0.9rem' }}>CGST – Rate 9%</span>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{formData.currency_symbol} {totals.cgst_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        {formData.is_gst_applicable && totals.sgst_total > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <span style={{ color: '#4A5568', fontSize: '0.9rem' }}>SGST – Rate 9%</span>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{formData.currency_symbol} {totals.sgst_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        {formData.is_gst_applicable && totals.igst_total > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <span style={{ color: '#4A5568', fontSize: '0.9rem' }}>IGST – Rate 18%</span>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{formData.currency_symbol} {totals.igst_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        {formData.is_gst_applicable && formData.gst_customer_type.includes('IGST_0') && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <span style={{ color: '#4A5568', fontSize: '0.9rem' }}>IGST – Rate 0%</span>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{formData.currency_symbol} 0.00</span>
                            </div>
                        )}

                        {!formData.is_gst_applicable && totals.total_tax > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <span style={{ color: '#4A5568', fontSize: '0.9rem' }}>Total Tax</span>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{formData.currency_symbol} {totals.total_tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}

                        {formData.invoice_type === 'USA' && formData.sales_tax_rate > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #E2E8F0' }}>
                                <span style={{ color: '#4A5568', fontSize: '0.9rem' }}>Sales Tax (0.00%)</span>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{formData.currency_symbol} 0.00</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
                            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#1A202C' }}>Grand Total</span>
                            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--theme-primary)' }}>{formData.currency_symbol} {totals.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                <div style={{ borderTop: '1px solid #E0E6ED', paddingTop: '24px', marginTop: '24px' }}>
                    <SectionHeader title="Description / Memo" />
                    <AutoExpandingTextarea
                        style={{ width: '100%', minHeight: '48px', padding: '8px 12px', borderRadius: '8px', border: isReadOnly ? 'none' : '1px solid #E2E8F0', background: isReadOnly ? 'var(--bg-secondary)' : 'white', fontSize: '0.85rem', outline: 'none' }}
                        placeholder="Add internal notes or additional descriptions here..."
                        value={formData.memo}
                        onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                        disabled={isReadOnly}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'white',
                        padding: '6px',
                        borderRadius: '12px',
                        border: '1px solid #E0E6ED',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                    }}
                >
                    {/* Preview */}
                    <button
                        type="button"
                        onClick={() => handlePreview()}
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
                            background: 'transparent',
                            color: 'var(--text-secondary)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 107, 0, 0.05)';
                            e.currentTarget.style.color = 'var(--ae-orange)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                    >
                        <Eye size={16} /> <span>Preview</span>
                    </button>

                    {!isReadOnly && (
                        <>
                            {/* Save Draft */}
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading}
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
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    background: 'transparent',
                                    color: 'var(--text-secondary)'
                                }}
                                onMouseEnter={(e) => {
                                    if (!loading) {
                                        e.currentTarget.style.background = 'rgba(255, 107, 0, 0.05)';
                                        e.currentTarget.style.color = 'var(--ae-orange)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!loading) {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = 'var(--text-secondary)';
                                    }
                                }}
                            >
                                <Save size={16} /> <span>{loading ? 'Saving...' : 'Save Draft'}</span>
                            </button>

                            {/* Finalise Invoice */}
                            <button
                                type="button"
                                onClick={handleFinalise}
                                disabled={loading}
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
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    background: 'var(--theme-primary)',
                                    color: 'white',
                                    boxShadow: '0 2px 8px rgba(187, 77, 0, 0.3)'
                                }}
                                onMouseEnter={(e) => {
                                    if (!loading) {
                                        e.currentTarget.style.background = '#e65c00'; // Darker orange on hover
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!loading) {
                                        e.currentTarget.style.background = 'var(--theme-primary)';
                                    }
                                }}
                            >
                                <CheckCircle size={16} /> <span>{loading ? 'Finalising...' : 'Finalise Invoice'}</span>
                            </button>
                        </>
                    )}

                    {status === 'FINALISED' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                            <button
                                type="button"
                                onClick={() => setShowRevertModal(true)}
                                disabled={loading}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 16px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    border: activeAction === 'revert' ? '1px solid #BB4D00' : '1px solid #E2E8F0',
                                    background: activeAction === 'revert' ? 'rgba(187, 77, 0, 0.05)' : 'white',
                                    color: activeAction === 'revert' ? '#BB4D00' : '#4A5568',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={() => setActiveAction('revert')}
                                onMouseLeave={() => setActiveAction(null)}
                            >
                                <RotateCcw size={15} />
                                <span>Revert</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowRejectModal(true)}
                                disabled={loading}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 16px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    border: activeAction === 'reject' ? '1px solid #E53E3E' : '1px solid #E2E8F0',
                                    background: activeAction === 'reject' ? 'rgba(229, 62, 62, 0.05)' : 'white',
                                    color: activeAction === 'reject' ? '#E53E3E' : '#4A5568',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={() => setActiveAction('reject')}
                                onMouseLeave={() => setActiveAction(null)}
                            >
                                <XCircle size={15} />
                                <span>Reject</span>
                            </button>
                        </div>
                    )}

                    {/* Cancel */}
                    {status !== 'APPROVED' && status !== 'PAID' && (
                        <button
                            type="button"
                            onClick={() => {
                                showConfirm({
                                    title: 'Are you sure you want to exit?',
                                    onConfirm: () => onBack(),
                                    onCancel: () => { }
                                });
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
                                background: activeAction === 'cancel' ? 'rgba(255, 107, 0, 0.05)' : 'transparent',
                                color: activeAction === 'cancel' ? 'var(--ae-orange)' : 'var(--text-secondary)'
                            }}
                            onMouseEnter={() => setActiveAction('cancel')}
                            onMouseLeave={() => setActiveAction(null)}
                        >
                            <span style={{ fontSize: '16px', lineHeight: '16px', fontWeight: 700 }}>×</span>
                            <span>Cancel</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Branded Action Modal (For Reject/Revert) */}
            {(showRejectModal || showRevertModal) && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                    background: 'rgba(0, 0, 0, 0.45)',
                    backdropFilter: 'blur(12px)',
                    padding: '24px',
                }}>
                    <div style={{
                        background: 'white',
                        width: '100%',
                        maxWidth: '400px',
                        borderRadius: '24px',
                        boxShadow: '0 40px 120px rgba(0,0,0,0.3)',
                        overflow: 'hidden',
                        position: 'relative',
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{
                            background: showRejectModal ? '#E53E3E' : '#BB4D00',
                            padding: '28px 24px 24px',
                            position: 'relative',
                        }}>
                            <button
                                onClick={() => { setShowRejectModal(false); setShowRevertModal(false); }}
                                style={{
                                    position: 'absolute',
                                    top: '16px',
                                    right: '16px',
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: 'transparent',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: 'white',
                                    opacity: 0.7,
                                }}
                            >
                                <X size={16} strokeWidth={3} />
                            </button>

                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    background: 'rgba(255,255,255,0.2)',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    {showRejectModal ? <XCircle size={18} color="white" /> : <RotateCcw size={18} color="white" />}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{
                                        fontSize: '1.25rem',
                                        fontWeight: 800,
                                        color: 'white',
                                        margin: '0 0 4px 0',
                                        lineHeight: 1.2
                                    }}>{showRejectModal ? 'Reject Invoice' : 'Revert Invoice'}</h3>
                                    <p style={{
                                        margin: 0,
                                        color: 'rgba(255,255,255,0.95)',
                                        fontSize: '0.8rem',
                                        fontWeight: 500,
                                        lineHeight: 1.4
                                    }}>
                                        {showRejectModal ? 'Provide a reason for rejecting this invoice.' : 'Provide a reason for reverting this invoice.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '24px' }}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    color: '#1e293b',
                                    marginBottom: '8px'
                                }}>{showRejectModal ? 'Rejection Reason' : 'Revert Reason'}</label>
                                <textarea
                                    className="ae-input"
                                    value={showRejectModal ? rejectComment : revertComment}
                                    onChange={e => showRejectModal ? setRejectComment(e.target.value) : setRevertComment(e.target.value)}
                                    placeholder="Type your reason here..."
                                    autoFocus
                                    style={{
                                        height: '90px',
                                        padding: '12px 16px',
                                        resize: 'none',
                                        background: '#f8fafc',
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button
                                    onClick={() => { setShowRejectModal(false); setShowRevertModal(false); }}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '12px',
                                        background: '#f1f5f9',
                                        color: '#475569',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >Cancel</button>
                                <button
                                    onClick={showRejectModal ? handleReject : handleRevert}
                                    style={{
                                        padding: '10px 24px',
                                        borderRadius: '12px',
                                        background: showRejectModal ? '#E53E3E' : '#BB4D00',
                                        color: 'white',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >{showRejectModal ? 'Reject' : 'Revert'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceForm;
