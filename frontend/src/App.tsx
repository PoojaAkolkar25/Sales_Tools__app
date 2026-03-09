import React, { useState, useEffect } from 'react';
import {
  Handshake,
  Gavel,
  ShoppingBag,
  Milestone,
  Boxes,
  Receipt,
  TrendingUp,
  Wallet,
  Users,
  LayoutDashboard,
  PlusCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Upload,
  RefreshCcw,
  Settings as SettingsIcon,
  Palette,
  ChevronDown,
  History,
  Calculator,
  ClipboardList
} from 'lucide-react';


import CostSheetForm from './components/CostSheetForm';
import CostSheetDashboard from './components/CostSheetDashboard';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import Home from './components/Home';
import Navbar from './components/Navbar';
import Payment from './components/Payment';
import InvoiceDashboard from './components/InvoiceDashboard';
import InvoiceForm from './components/InvoiceForm';
import api from './api';
import './index.css';
import { useNotification } from './context/NotificationContext';
import { useTheme } from './context/ThemeContext';
import DealDashboard from './components/DealDashboard';
import DealForm from './components/DealForm';
import EstimateDashboard from './components/EstimateDashboard';
import EstimateForm from './components/EstimateForm';
import SalesOrderDashboard from './components/SalesOrderDashboard';
import SalesOrderForm from './components/SalesOrderForm';
import MilestoneDashboard from './components/MilestoneDashboard';
import MilestoneForm from './components/MilestoneForm';
import LeadDashboard from './components/LeadDashboard';
import LeadForm from './components/LeadForm';
import CustomerDashboard from './components/CustomerDashboard';
import ResourceDashboard from './components/ResourceDashboard';
import ResourceRequestForm from './components/ResourceRequestForm';
import Settings from './components/Settings';
import ResetPassword from './components/ResetPassword';
import RevenueDashboard from './components/RevenueDashboard';
import AuditTrailPage from './components/AuditTrailPage';



import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

interface NavItem {
  id: string;
  label: string;
  icon: any;
  path: string;
  children?: NavItem[];
}

const getNavItems = (user: any): NavItem[] => {
  const items: NavItem[] = [
    { id: 'home', label: 'Home', icon: LayoutDashboard, path: '/home' },
    { id: 'lead', label: 'Lead', icon: Users, path: '/lead' },
    { id: 'deal', label: 'Deal', icon: Handshake, path: '/deal' },
    { id: 'cost-sheet', label: 'Cost Sheet', icon: Calculator, path: '/cost-sheet' },
    { id: 'estimates', label: 'Estimates', icon: ClipboardList, path: '/estimates' },
    { id: 'sales-order', label: 'Sales Order', icon: ShoppingBag, path: '/sales-order' },
    { id: 'milestone', label: 'Milestone', icon: Milestone, path: '/milestone' },
    { id: 'inventory', label: 'Inventory', icon: Boxes, path: '/inventory' },
    { id: 'invoice', label: 'Invoice', icon: Receipt, path: '/invoice' },
    { id: 'payment', label: 'Payment', icon: Wallet, path: '/payment' },
    { id: 'revenue', label: 'Revenue', icon: TrendingUp, path: '/revenue' },
    { id: 'contracts', label: 'Contracts', icon: Gavel, path: '/contracts' },
  ];

  if (user?.role === 'app_admin') {
    items.push({
      id: 'settings',
      label: 'Settings',
      icon: SettingsIcon,
      path: '#', // Placeholder, parent item doesn't navigate directly if it has children
      children: [
        { id: 'create', label: 'Create', path: '/user-management', icon: PlusCircle },
        { id: 'audit-trail', label: 'Audit Trail', path: '/audit-trail', icon: History },
        { id: 'themes', label: 'Themes', path: '/settings', icon: Palette }
      ]
    });
  }

  return items;
};

interface ModuleWrapperProps {
  children: React.ReactNode;
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: (expanded: boolean) => void;
  user: any;
  onLogout: () => void;
  navigate: (path: string) => void;
  location: any;
  onCreateUser?: () => void;
  theme: string;
}

const ModuleWrapper: React.FC<ModuleWrapperProps> = ({
  children,
  isSidebarExpanded,
  setIsSidebarExpanded,
  user,
  onLogout,
  navigate,
  location,
  theme,
}) => {
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  const toggleMenu = (menuId: string) => {
    if (!isSidebarExpanded) {
      setIsSidebarExpanded(true);
      setExpandedMenus(prev => ({ ...prev, [menuId]: true }));
    } else {
      setExpandedMenus(prev => ({ ...prev, [menuId]: !prev[menuId] }));
    }
  };

  const navItems = getNavItems(user);

  return (
    <div className={`app-container ${theme && theme !== 'default' ? `theme-${theme}` : ''}`}>
      {/* Left Sidebar */}
      <aside className={`sidebar flex flex-col ${isSidebarExpanded ? 'expanded' : '!w-16'} overflow-hidden transition-all duration-300`}>
        <div className="sidebar-logo">
          <img
            src="/AutomationEdge_Logo.png"
            alt="SalesEdge Logo"
            className="sidebar-logo-img"
          />
          {isSidebarExpanded && <h1 className="text-white font-extrabold tracking-tight">SalesEdge</h1>}
        </div>

        <nav className="sidebar-nav flex-1">
          {navItems.map((item: any) => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedMenus[item.id];
            const isActive = location.pathname === item.path || (hasChildren && item.children.some((child: any) => location.pathname === child.path));

            return (
              <React.Fragment key={item.id}>
                <button
                  onClick={() => hasChildren ? toggleMenu(item.id) : navigate(item.path)}
                  className={`sidebar-item !px-0 ${isSidebarExpanded ? 'expanded' : 'flex justify-center'} ${isActive ? 'active' : ''} w-full`}
                  title={!isSidebarExpanded ? item.label : ''}
                >
                  <div className={`flex items-center ${isSidebarExpanded ? 'w-full' : 'justify-center'} px-4`}>
                    <item.icon size={16} className="flex-shrink-0" />
                    {isSidebarExpanded && (
                      <>
                        <span className="font-semibold text-sm ml-3 flex-1 text-left">{item.label}</span>
                        {hasChildren && (
                          <ChevronDown
                            size={16}
                            className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        )}
                      </>
                    )}
                  </div>
                </button>

                {/* Sub-items */}
                {isSidebarExpanded && hasChildren && isExpanded && (
                  <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', paddingBottom: '4px' }}>
                    {item.children.map((child: any) => {
                      const isChildActive = location.pathname === child.path;
                      return (
                        <button
                          key={child.id}
                          onClick={() => navigate(child.path)}
                          className={`sidebar-item !px-0 expanded w-full`}
                          style={{
                            background: isChildActive ? 'var(--bg-accent)' : 'transparent',
                            color: isChildActive ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.7)',
                            borderLeft: isChildActive ? '3px solid var(--border-accent)' : '3px solid transparent',
                            marginBottom: '2px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!isChildActive) {
                              e.currentTarget.style.background = 'var(--bg-hover)';
                              e.currentTarget.style.color = 'var(--accent-primary)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isChildActive) {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                            }
                          }}
                        >
                          <div className="flex items-center justify-center w-full px-4">
                            <div className="flex items-center justify-start w-[105px]">
                              <child.icon size={14} className="flex-shrink-0" />
                              <span className="font-medium text-sm ml-3 text-left">{child.label}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* Toggle Button Relocated Below Items */}
          <div className="sidebar-toggle-container">
            <button
              onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
              className="sidebar-toggle-btn"
              title={isSidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              {isSidebarExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className={`main-content ${isSidebarExpanded ? 'sidebar-expanded' : ''}`}>
        <Navbar
          user={user}
          onLogout={onLogout}
          isSidebarExpanded={isSidebarExpanded}
        />

        <div className="main-scroll-area">
          <div className="content-inner animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

const AppContent: React.FC = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const { theme, setTheme } = useTheme();
  const { showNotification } = useNotification();

  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [isDragging, setIsDragging] = useState(false);

  // Module Views
  const [leadView, setLeadView] = useState<'form' | 'dashboard'>('dashboard');
  const [dealView, setDealView] = useState<'form' | 'dashboard'>('dashboard');
  const [costSheetView, setCostSheetView] = useState<'form' | 'dashboard'>('dashboard');
  const [estimateView, setEstimateView] = useState<'form' | 'dashboard'>('dashboard');
  const [salesOrderView, setSalesOrderView] = useState<'form' | 'dashboard'>('dashboard');
  const [milestoneView, setMilestoneView] = useState<'form' | 'dashboard'>('dashboard');
  const [invoiceView, setInvoiceView] = useState<'form' | 'dashboard'>('dashboard');
  const [inventoryView, setInventoryView] = useState<'form' | 'dashboard'>('dashboard');

  // Editing IDs
  const [editingLeadId, setEditingLeadId] = useState<number | null>(null);
  const [editingDealId, setEditingDealId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null); // For Cost Sheet
  const [editingEstimateId, setEditingEstimateId] = useState<number | null>(null);
  const [editingSalesOrderId, setEditingSalesOrderId] = useState<number | null>(null);
  const [editingMilestoneId, setEditingMilestoneId] = useState<number | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  const [editingInventoryId, setEditingInventoryId] = useState<number | null>(null);
  const [initialSoId, setInitialSoId] = useState<number | null>(null);
  const [initialMilestoneId, setInitialMilestoneId] = useState<number | null>(null);
  const [viewSingleMilestoneId, setViewSingleMilestoneId] = useState<number | null>(null);

  // Other UI States
  const [isExtractingSO, setIsExtractingSO] = useState(false);
  const [soRefreshTrigger, setSoRefreshTrigger] = useState(0);
  const [syncingDeal, setSyncingDeal] = useState(false);
  const [refreshDealTrigger, setRefreshDealTrigger] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      checkAuth();
    } else {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      const publicPaths = ['/login', '/reset-password'];
      if (!user && !publicPaths.includes(location.pathname)) {
        navigate('/login');
      } else if (user && location.pathname === '/login') {
        navigate('/');
      }
    }
  }, [user, authLoading, location.pathname, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const action = params.get('action');
    const idParam = params.get('id');

    if (action === 'create') {
      if (location.pathname === '/invoice') {
        setEditingInvoiceId(null);
        const soParam = params.get('so_id');
        const milestoneParam = params.get('milestone_id');
        setInitialSoId(soParam ? parseInt(soParam) : null);
        setInitialMilestoneId(milestoneParam ? parseInt(milestoneParam) : null);
        setInvoiceView('form');
      } else if (location.pathname === '/deal') {
        handleCreateNewDeal();
      } else if (location.pathname === '/milestone') {
        setEditingMilestoneId(null);
        setMilestoneView('form');
      }
    } else if (idParam) {
      const numId = parseInt(idParam);
      if (location.pathname === '/deal') {
        setEditingDealId(numId);
        setDealView('form');
      } else if (location.pathname === '/estimates') {
        setEditingEstimateId(numId);
        setEstimateView('form');
      } else if (location.pathname === '/sales-order') {
        setEditingSalesOrderId(numId);
        setSalesOrderView('form');
      } else if (location.pathname === '/cost-sheet') {
        setEditingId(numId);
        setCostSheetView('form');
      } else if (location.pathname === '/invoice') {
        setEditingInvoiceId(numId);
        setInvoiceView('form');
      } else if (location.pathname === '/milestone') {
        setEditingMilestoneId(numId);
        setMilestoneView('form');
      }
    }
  }, [location.pathname, location.search]);

  const checkAuth = async () => {
    try {
      const response = await api.get('auth/me/');
      setUser(response.data);
    } catch (err) {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLoginSuccess = (token: string, userData: any) => {
    localStorage.setItem('token', token);
    setUser(userData);
    navigate('/home');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  const processPOFile = async (file: File) => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsExtractingSO(true);
      showNotification('Uploading and processing Purchase Order...', 'info');
      const response = await api.post('/po-files/process_po/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setIsExtractingSO(false);
      showNotification(response.data.message, 'success');
      setSoRefreshTrigger(prev => prev + 1);

      if (response.data.so_id) {
        handleViewSalesOrderDetails(response.data.so_id);
      }
    } catch (error: any) {
      setIsExtractingSO(false);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Extraction failed, please create manually or try again.';
      showNotification(errorMsg, 'error');
    }
  };

  const handleSOUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processPOFile(file);
  };


  const handleCreateNew = () => {
    setEditingId(null);
    setCostSheetView('form');
  };

  const handleViewDetails = (id: number) => {
    setEditingId(id);
    setCostSheetView('form');
  };

  const handleViewDealDetails = (id: number) => {
    setEditingDealId(id);
    setDealView('form');
  };

  const handleCreateNewDeal = () => {
    setEditingDealId(null);
    setDealView('form');
  };

  const handleViewEstimateDetails = (id: number) => {
    setEditingEstimateId(id);
    setEstimateView('form');
  };

  const handleViewSalesOrderDetails = (id: number) => {
    setEditingSalesOrderId(id);
    setSalesOrderView('form');
  };

  const handleViewLeadDetails = (id: number) => {
    setEditingLeadId(id);
    setLeadView('form');
  };

  const handleCreateNewLead = () => {
    setEditingLeadId(null);
    setLeadView('form');
  };

  const handleCreateNewSalesOrder = () => {
    setEditingSalesOrderId(null);
    setSalesOrderView('form');
  };

  const handleHubSpotSync = async () => {
    if (!editingDealId) return;
    setSyncingDeal(true);
    try {
      const response = await api.post(`/deals/${editingDealId}/sync_hubspot/`);
      showNotification(response.data.message, 'success');
      setRefreshDealTrigger(prev => prev + 1);
    } catch (error: any) {
      showNotification(error.response?.data?.message || 'HubSpot sync failed', 'error');
    } finally {
      setSyncingDeal(false);
    }
  };


  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <div className="text-center">
          <Loader2 className="animate-spin text-[var(--ae-blue)] mx-auto mb-4" size={48} />
          <p className="text-[var(--text-primary)] font-semibold">Loading SalesEdge...</p>
        </div>
      </div>
    );
  }

  const commonWrapperProps = {
    isSidebarExpanded,
    setIsSidebarExpanded,
    user,
    onLogout: handleLogout,
    navigate,
    location,
    theme,
    setTheme
  };

  return (
    <Routes>
      <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/home" element={
        user ? (
          <ModuleWrapper {...commonWrapperProps}>
            <Home user={user} />
          </ModuleWrapper>
        ) : <Navigate to="/login" />
      } />
      <Route path="/Dashboard" element={<Navigate to="/home" />} />
      <Route path="/cost-sheet" element={
        user ? (
          <ModuleWrapper {...commonWrapperProps}>
            <div className="main-route-container" style={{ background: '#FFFFF0', padding: '0' }}>
              <div className="space-y-8">
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 8px',
                  marginBottom: '24px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '4px', height: '24px', background: 'var(--theme-primary)', borderRadius: '2px' }}></div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Cost Sheet</h1>

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
                        onClick={() => setCostSheetView('dashboard')}
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
                          background: costSheetView === 'dashboard' ? 'var(--theme-primary)' : 'transparent',
                          color: costSheetView === 'dashboard' ? 'white' : 'var(--text-secondary)',
                          boxShadow: costSheetView === 'dashboard' ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (costSheetView !== 'dashboard') {
                            e.currentTarget.style.background = 'rgba(255, 107, 0, 0.05)';
                            e.currentTarget.style.color = 'var(--ae-orange)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (costSheetView !== 'dashboard') {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                          }
                        }}
                      >
                        <LayoutDashboard size={18} /> Dashboard
                      </button>
                      <button
                        onClick={handleCreateNew}
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
                          background: (costSheetView === 'form' && !editingId) ? 'var(--theme-primary)' : 'transparent',
                          color: (costSheetView === 'form' && !editingId) ? 'white' : 'var(--text-secondary)',
                          boxShadow: (costSheetView === 'form' && !editingId) ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (costSheetView !== 'form' || editingId) {
                            e.currentTarget.style.background = 'rgba(255, 107, 0, 0.05)';
                            e.currentTarget.style.color = 'var(--ae-orange)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (costSheetView !== 'form' || editingId) {
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

                {costSheetView === 'form' ? (
                  <CostSheetForm
                    id={editingId}
                    onBack={() => {
                      setCostSheetView('dashboard');
                    }}
                    onSave={() => setCostSheetView('dashboard')}
                  />
                ) : (
                  <CostSheetDashboard
                    onView={handleViewDetails}
                  />
                )}
              </div>
            </div>
          </ModuleWrapper>
        ) : <Navigate to="/login" />
      } />
      <Route path="/user-management" element={
        user && user.role === 'app_admin' ? (
          <ModuleWrapper {...commonWrapperProps}>
            <div className="main-route-container" style={{ background: '#FFFFF0', padding: '0' }}>
              <UserManagement />
            </div>
          </ModuleWrapper>
        ) : <Navigate to="/login" />
      } />
      <Route path="/audit-trail" element={
        user && user.role === 'app_admin' ? (
          <ModuleWrapper {...commonWrapperProps}>
            <div className="main-route-container">
              <AuditTrailPage />
            </div>
          </ModuleWrapper>
        ) : <Navigate to="/login" />
      } />
      <Route path="/settings" element={
        user && user.role === 'app_admin' ? (
          <ModuleWrapper {...commonWrapperProps}>
            <Settings theme={theme} setTheme={setTheme} />
          </ModuleWrapper>
        ) : <Navigate to="/login" />
      } />
      <Route path="/lead" element={
        user ? (
          <ModuleWrapper {...commonWrapperProps}>
            <div className="main-route-container">
              <div className="space-y-8">
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 8px',
                  marginBottom: '24px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '4px', height: '24px', background: 'var(--theme-primary)', borderRadius: '2px' }}></div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Lead</h1>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 8px',
                  marginBottom: '12px',
                  gap: '24px'
                }}>
                  <div style={{
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'center',
                    background: 'var(--bg-primary)',
                    padding: '6px',
                    borderRadius: '12px',
                    border: '1px solid #E0E6ED',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                  }}>
                    <button
                      onClick={() => setLeadView('dashboard')}
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
                        background: leadView === 'dashboard' ? 'var(--theme-primary)' : 'transparent',
                        color: leadView === 'dashboard' ? 'white' : 'var(--text-secondary)',
                        boxShadow: leadView === 'dashboard' ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (leadView !== 'dashboard') {
                          e.currentTarget.style.background = 'rgba(255, 107, 0, 0.05)';
                          e.currentTarget.style.color = 'var(--ae-orange)';
                          e.currentTarget.style.border = '1px solid var(--theme-primary)';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 107, 0, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (leadView !== 'dashboard') {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                          e.currentTarget.style.border = 'none';
                          e.currentTarget.style.boxShadow = 'none';
                        }
                      }}
                    >
                      <LayoutDashboard size={18} /> Dashboard
                    </button>
                    <button
                      onClick={handleCreateNewLead}
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
                        background: (leadView === 'form' && !editingLeadId) ? 'var(--theme-primary)' : 'transparent',
                        color: (leadView === 'form' && !editingLeadId) ? 'white' : 'var(--text-secondary)',
                        boxShadow: (leadView === 'form' && !editingLeadId) ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (leadView !== 'form' || editingLeadId) {
                          e.currentTarget.style.background = 'rgba(255, 107, 0, 0.05)';
                          e.currentTarget.style.color = 'var(--ae-orange)';
                          e.currentTarget.style.border = '1px solid var(--theme-primary)';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 107, 0, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (leadView !== 'form' || editingLeadId) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                          e.currentTarget.style.border = 'none';
                          e.currentTarget.style.boxShadow = 'none';
                        }
                      }}
                    >
                      <PlusCircle size={18} /> Create New
                    </button>
                  </div>


                </div>

                {leadView === 'form' ? (
                  <LeadForm
                    id={editingLeadId}
                    onBack={() => setLeadView('dashboard')}
                    onSave={() => setLeadView('dashboard')}
                  />
                ) : (
                  <LeadDashboard
                    onView={handleViewLeadDetails}
                  />

                )}
              </div>
            </div>
          </ModuleWrapper>
        ) : <Navigate to="/login" />
      } />

      <Route path="/deal" element={
        user ? (
          <ModuleWrapper {...commonWrapperProps}>
            <div className="main-route-container" style={{ background: '#FFFFF0', padding: '0' }}>
              <div className="space-y-8">
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 8px',
                  marginBottom: '24px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '4px', height: '24px', background: 'var(--theme-primary)', borderRadius: '2px' }}></div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Deal</h1>

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
                        onClick={() => setDealView('dashboard')}
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
                          background: dealView === 'dashboard' ? 'var(--theme-primary)' : 'transparent',
                          color: dealView === 'dashboard' ? 'white' : 'var(--text-secondary)',
                          boxShadow: dealView === 'dashboard' ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (dealView !== 'dashboard') {
                            e.currentTarget.style.background = 'rgba(255, 107, 0, 0.05)';
                            e.currentTarget.style.color = 'var(--ae-orange)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (dealView !== 'dashboard') {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                          }
                        }}
                      >
                        <LayoutDashboard size={18} /> Dashboard
                      </button>
                      <button
                        onClick={handleCreateNewDeal}
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
                          background: (dealView === 'form' && !editingDealId) ? 'var(--theme-primary)' : 'transparent',
                          color: (dealView === 'form' && !editingDealId) ? 'white' : 'var(--text-secondary)',
                          boxShadow: (dealView === 'form' && !editingDealId) ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (dealView !== 'form' || editingDealId) {
                            e.currentTarget.style.background = 'rgba(255, 107, 0, 0.05)';
                            e.currentTarget.style.color = 'var(--ae-orange)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (dealView !== 'form' || editingDealId) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                          }
                        }}
                      >
                        <PlusCircle size={18} /> Create New
                      </button>
                    </div>
                  </div>

                  {dealView === 'form' && editingDealId && (
                    <button
                      onClick={handleHubSpotSync}
                      disabled={syncingDeal}
                      className="ae-btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 16px', fontSize: '0.85rem' }}
                    >
                      <RefreshCcw size={18} className={syncingDeal ? 'animate-spin' : ''} />
                      {syncingDeal ? 'Syncing...' : 'Sync HubSpot'}
                    </button>
                  )}
                </div>

                {dealView === 'form' ? (
                  <DealForm
                    id={editingDealId}
                    onBack={() => setDealView('dashboard')}
                    onSave={() => setDealView('dashboard')}
                    refreshTrigger={refreshDealTrigger}
                  />
                ) : (
                  <DealDashboard
                    onView={handleViewDealDetails}
                  />
                )}
              </div>
            </div>
          </ModuleWrapper>
        ) : <Navigate to="/login" />
      } />
      <Route path="/estimates" element={
        user ? (
          <ModuleWrapper {...commonWrapperProps}>
            <div className="main-route-container" style={{ background: '#FFFFF0', padding: '0' }}>
              <div className="space-y-8">
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 8px',
                  marginBottom: '24px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '4px', height: '24px', background: 'var(--theme-primary)', borderRadius: '2px' }}></div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Estimate</h1>

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
                        onClick={() => setEstimateView('dashboard')}
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
                          background: estimateView === 'dashboard' ? 'var(--theme-primary)' : 'transparent',
                          color: estimateView === 'dashboard' ? 'white' : 'var(--text-secondary)',
                          boxShadow: estimateView === 'dashboard' ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (estimateView !== 'dashboard') {
                            e.currentTarget.style.background = 'rgba(255, 107, 0, 0.05)';
                            e.currentTarget.style.color = 'var(--ae-orange)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (estimateView !== 'dashboard') {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                          }
                        }}
                      >
                        <LayoutDashboard size={18} /> Dashboard
                      </button>
                      <button
                        onClick={() => {
                          setEditingEstimateId(null);
                          setEstimateView('form');
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
                          background: (estimateView === 'form' && !editingEstimateId) ? 'var(--theme-primary)' : 'transparent',
                          color: (estimateView === 'form' && !editingEstimateId) ? 'white' : 'var(--text-secondary)',
                          boxShadow: (estimateView === 'form' && !editingEstimateId) ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (estimateView !== 'form' || editingEstimateId) {
                            e.currentTarget.style.background = 'rgba(255, 107, 0, 0.05)';
                            e.currentTarget.style.color = 'var(--ae-orange)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (estimateView !== 'form' || editingEstimateId) {
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

                {estimateView === 'form' ? (
                  <EstimateForm
                    id={editingEstimateId!}
                    onBack={() => setEstimateView('dashboard')}
                    onSave={() => setEstimateView('dashboard')}
                    user={user}
                  />
                ) : (
                  <EstimateDashboard
                    onView={handleViewEstimateDetails}
                    user={user}
                  />
                )}
              </div>
            </div>
          </ModuleWrapper >
        ) : <Navigate to="/login" />
      } />
      < Route path="/sales-order" element={
        user ? (
          <ModuleWrapper {...commonWrapperProps}>
            <div className="main-route-container" style={{ background: '#FFFFF0', padding: '0' }}>
              <div className="space-y-8">
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
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Sales Order</h1>

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
                        onClick={() => setSalesOrderView('dashboard')}
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
                          background: salesOrderView === 'dashboard' ? 'var(--theme-primary)' : 'transparent',
                          color: salesOrderView === 'dashboard' ? 'white' : 'var(--text-secondary)',
                          boxShadow: salesOrderView === 'dashboard' ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                        }}
                        onMouseEnter={(e) => { if (salesOrderView !== 'dashboard') { e.currentTarget.style.background = 'rgba(255,107,0,0.05)'; e.currentTarget.style.color = 'var(--ae-orange)'; } }}
                        onMouseLeave={(e) => { if (salesOrderView !== 'dashboard') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                      >
                        <LayoutDashboard size={18} /> Dashboard
                      </button>
                      <button
                        onClick={handleCreateNewSalesOrder}
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
                          background: (salesOrderView === 'form' && !editingSalesOrderId) ? 'var(--theme-primary)' : 'transparent',
                          color: (salesOrderView === 'form' && !editingSalesOrderId) ? 'white' : 'var(--text-secondary)',
                          boxShadow: (salesOrderView === 'form' && !editingSalesOrderId) ? '0 2px 8px rgba(187,77,0,0.3)' : 'none'
                        }}
                        onMouseEnter={(e) => { if (salesOrderView !== 'form' || editingSalesOrderId) { e.currentTarget.style.background = 'rgba(255,107,0,0.05)'; e.currentTarget.style.color = 'var(--ae-orange)'; } }}
                        onMouseLeave={(e) => { if (salesOrderView !== 'form' || editingSalesOrderId) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                      >
                        <PlusCircle size={18} /> Create New
                      </button>
                    </div>
                  </div>

                  {/* Right: Upload PO */}
                  <div
                    onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(false);
                      const file = e.dataTransfer.files[0];
                      if (file) processPOFile(file);
                    }}
                    onClick={() => (document.getElementById('so-upload-input') as HTMLInputElement)?.click()}
                    style={{
                      border: isDragging ? '2px dashed var(--theme-primary)' : '2px dashed #E0E6ED',
                      background: isDragging ? 'rgba(255, 107, 0, 0.05)' : '#FAFBFC',
                      borderRadius: '12px',
                      padding: '8px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: isExtractingSO ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      maxWidth: '380px',
                      position: 'relative',
                      opacity: isExtractingSO ? 0.7 : 1,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                    onMouseEnter={(e) => { if (!isExtractingSO) { e.currentTarget.style.borderColor = 'var(--theme-primary)'; e.currentTarget.style.background = 'rgba(255,107,0,0.02)'; } }}
                    onMouseLeave={(e) => { if (!isExtractingSO && !isDragging) { e.currentTarget.style.borderColor = '#E0E6ED'; e.currentTarget.style.background = '#FAFBFC'; } }}
                  >
                    <input id="so-upload-input" type="file" className="hidden" onChange={handleSOUpload} accept=".pdf" disabled={isExtractingSO} />
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FFFFF0', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', color: 'var(--theme-primary)', flexShrink: 0 }}>
                      {isExtractingSO ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                        {isExtractingSO ? 'Processing PO...' : 'Upload PO (Max 10MB each)'}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.2 }}>Drag & Drop or Click (PDF only)</span>
                    </div>
                  </div>
                </div>

                {salesOrderView === 'form' ? (
                  <SalesOrderForm
                    id={editingSalesOrderId}
                    onBack={() => setSalesOrderView('dashboard')}
                    onSave={() => setSalesOrderView('dashboard')}
                    user={user}
                  />
                ) : (
                  <SalesOrderDashboard
                    onView={handleViewSalesOrderDetails}
                    refreshKey={soRefreshTrigger}
                  />
                )}
              </div>
            </div>
          </ModuleWrapper >
        ) : <Navigate to="/login" />
      } />
      < Route path="/invoice" element={
        user ? (
          <ModuleWrapper {...commonWrapperProps}>
            <div className="main-route-container" style={{ background: '#FFFFF0', padding: '0' }}>
              <div className="space-y-8">
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
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Invoice</h1>

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
                        onClick={() => setInvoiceView('dashboard')}
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
                          background: invoiceView === 'dashboard' ? 'var(--theme-primary)' : 'transparent',
                          color: invoiceView === 'dashboard' ? 'white' : 'var(--text-secondary)',
                          boxShadow: invoiceView === 'dashboard' ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                        }}
                        onMouseEnter={(e) => { if (invoiceView !== 'dashboard') { e.currentTarget.style.background = 'rgba(255,107,0,0.05)'; e.currentTarget.style.color = 'var(--ae-orange)'; } }}
                        onMouseLeave={(e) => { if (invoiceView !== 'dashboard') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                      >
                        <LayoutDashboard size={18} /> Dashboard
                      </button>
                      <button
                        onClick={() => {
                          setEditingInvoiceId(null);
                          setInitialSoId(null);
                          setInitialMilestoneId(null);
                          setInvoiceView('form');
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
                          background: (invoiceView === 'form' && !editingInvoiceId) ? 'var(--theme-primary)' : 'transparent',
                          color: (invoiceView === 'form' && !editingInvoiceId) ? 'white' : 'var(--text-secondary)',
                          boxShadow: (invoiceView === 'form' && !editingInvoiceId) ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                        }}
                        onMouseEnter={(e) => { if (invoiceView !== 'form' || editingInvoiceId) { e.currentTarget.style.background = 'rgba(255,107,0,0.05)'; e.currentTarget.style.color = 'var(--ae-orange)'; } }}
                        onMouseLeave={(e) => { if (invoiceView !== 'form' || editingInvoiceId) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                      >
                        <PlusCircle size={18} /> Create New
                      </button>
                    </div>
                  </div>
                </div>

                {invoiceView === 'form' ? (
                  <InvoiceForm
                    invoiceId={editingInvoiceId}
                    initialSoId={initialSoId}
                    initialMilestoneId={initialMilestoneId}
                    onBack={() => {
                      setInvoiceView('dashboard');
                      setInitialSoId(null);
                      setInitialMilestoneId(null);
                    }}
                  />
                ) : (
                  <InvoiceDashboard
                    onView={(id: number) => {
                      setEditingInvoiceId(id);
                      setInvoiceView('form');
                    }}
                  />
                )}
              </div>
            </div>
          </ModuleWrapper >
        ) : <Navigate to="/login" />
      } />
      < Route path="/payment" element={
        user ? (
          <ModuleWrapper {...commonWrapperProps}>
            <div className="main-route-container" style={{ background: '#FFFFF0', padding: '0' }}>
              <Payment />
            </div>
          </ModuleWrapper>
        ) : <Navigate to="/login" />
      } />
      < Route path="/milestone" element={
        user ? (
          <ModuleWrapper {...commonWrapperProps}>
            <div className="main-route-container" style={{ background: '#FFFFF0', padding: '0' }}>
              <div className="space-y-8">
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
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Milestone</h1>

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
                        onClick={() => {
                          setEditingMilestoneId(null);
                          setInitialSoId(null);
                          setViewSingleMilestoneId(null);
                          setMilestoneView('dashboard');
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
                          background: milestoneView === 'dashboard' ? 'var(--theme-primary)' : 'transparent',
                          color: milestoneView === 'dashboard' ? 'white' : 'var(--text-secondary)',
                          boxShadow: milestoneView === 'dashboard' ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                        }}
                        onMouseEnter={(e) => { if (milestoneView !== 'dashboard') { e.currentTarget.style.background = 'rgba(255,107,0,0.05)'; e.currentTarget.style.color = 'var(--ae-orange)'; } }}
                        onMouseLeave={(e) => { if (milestoneView !== 'dashboard') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                      >
                        <LayoutDashboard size={18} /> Dashboard
                      </button>
                      <button
                        onClick={() => {
                          setEditingMilestoneId(null);
                          setInitialSoId(null);
                          setViewSingleMilestoneId(null);
                          setMilestoneView('form');
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
                          background: milestoneView === 'form' ? 'var(--theme-primary)' : 'transparent',
                          color: milestoneView === 'form' ? 'white' : 'var(--text-secondary)',
                          boxShadow: milestoneView === 'form' ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                        }}
                        onMouseEnter={(e) => { if (milestoneView !== 'form') { e.currentTarget.style.background = 'rgba(255,107,0,0.05)'; e.currentTarget.style.color = 'var(--ae-orange)'; } }}
                        onMouseLeave={(e) => { if (milestoneView !== 'form') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                      >
                        <PlusCircle size={18} /> Create New
                      </button>
                    </div>
                  </div>
                </div>

                {milestoneView === 'form' ? (
                  <MilestoneForm
                    id={editingMilestoneId}
                    initialSoId={initialSoId}
                    viewSingleMilestoneId={viewSingleMilestoneId}
                    onBack={() => {
                      setEditingMilestoneId(null);
                      setInitialSoId(null);
                      setViewSingleMilestoneId(null);
                      setMilestoneView('dashboard');
                    }}
                  />
                ) : (
                  <MilestoneDashboard
                    onView={(id: any) => {
                      if (typeof id === 'string' && id.startsWith('virtual-')) {
                        const soId = parseInt(id.replace('virtual-', ''));
                        setInitialSoId(soId);
                        setEditingMilestoneId(null);
                        setViewSingleMilestoneId(null);
                      } else {
                        setEditingMilestoneId(id);
                        setViewSingleMilestoneId(id);
                        setInitialSoId(null);
                      }
                      setMilestoneView('form');
                    }}
                    onCreate={() => {
                      setEditingMilestoneId(null);
                      setInitialSoId(null);
                      setViewSingleMilestoneId(null);
                      setMilestoneView('form');
                    }}
                  />
                )}
              </div>
            </div>
          </ModuleWrapper >
        ) : <Navigate to="/login" />
      } />
      < Route path="/customer-dashboard" element={
        user ? (
          <ModuleWrapper {...commonWrapperProps}>
            <CustomerDashboard />
          </ModuleWrapper >
        ) : <Navigate to="/login" />
      }
      />
      < Route path="/inventory" element={
        user ? (
          <ModuleWrapper {...commonWrapperProps}>
            <div className="main-route-container">
              <div className="space-y-6">
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 8px',
                  marginBottom: '16px',
                  gap: '16px'
                }}>
                  {/* Left: Heading + nav buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '4px', height: '24px', background: 'var(--theme-primary)', borderRadius: '2px' }}></div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Inventory</h1>

                    {/* Dashboard + Create New buttons */}
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
                        onClick={() => setInventoryView('dashboard')}
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
                          background: inventoryView === 'dashboard' ? 'var(--theme-primary)' : 'transparent',
                          color: inventoryView === 'dashboard' ? 'white' : 'var(--text-secondary)',
                          boxShadow: inventoryView === 'dashboard' ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (inventoryView !== 'dashboard') {
                            e.currentTarget.style.background = 'rgba(255, 107, 0, 0.05)';
                            e.currentTarget.style.color = 'var(--ae-orange)';
                            e.currentTarget.style.border = '1px solid var(--theme-primary)';
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 107, 0, 0.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (inventoryView !== 'dashboard') {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                            e.currentTarget.style.border = 'none';
                            e.currentTarget.style.boxShadow = 'none';
                          }
                        }}
                      >
                        <LayoutDashboard size={18} /> Dashboard
                      </button>
                      <button
                        onClick={() => {
                          setEditingInventoryId(null);
                          setInventoryView('form');
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
                          background: (inventoryView === 'form' && !editingInventoryId) ? 'var(--theme-primary)' : 'transparent',
                          color: (inventoryView === 'form' && !editingInventoryId) ? 'white' : 'var(--text-secondary)',
                          boxShadow: (inventoryView === 'form' && !editingInventoryId) ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (inventoryView !== 'form' || editingInventoryId) {
                            e.currentTarget.style.background = 'rgba(255, 107, 0, 0.05)';
                            e.currentTarget.style.color = 'var(--ae-orange)';
                            e.currentTarget.style.border = '1px solid var(--theme-primary)';
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 107, 0, 0.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (inventoryView !== 'form' || editingInventoryId) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                            e.currentTarget.style.border = 'none';
                            e.currentTarget.style.boxShadow = 'none';
                          }
                        }}
                      >
                        <PlusCircle size={18} /> Create New
                      </button>
                    </div>
                  </div>
                </div>

                {inventoryView === 'form' ? (
                  <ResourceRequestForm
                    id={editingInventoryId}
                    user={user}
                    onBack={() => setInventoryView('dashboard')}
                    onSave={() => setInventoryView('dashboard')}
                  />
                ) : (
                  <ResourceDashboard
                    onView={(id: number) => {
                      setEditingInventoryId(id);
                      setInventoryView('form');
                    }}
                  />
                )}
              </div>
            </div>
          </ModuleWrapper >
        ) : <Navigate to="/login" />
      } />
      < Route path="/revenue" element={
        user ? (
          <ModuleWrapper {...commonWrapperProps}>
            <div className="main-route-container" style={{ background: '#FFFFF0', padding: '0' }}>
              <RevenueDashboard />
            </div>
          </ModuleWrapper >
        ) : <Navigate to="/login" />
      } />
      {
        getNavItems(user).filter(item => !['lead', 'cost-sheet', 'invoice', 'payment', 'deal', 'estimates', 'sales-order', 'milestone', 'user-management', 'customer-dashboard', 'inventory', 'revenue'].includes(item.id)).map(item => (
          <Route key={item.id} path={item.path} element={
            user ? (
              <ModuleWrapper {...commonWrapperProps}>
                <div className="glass-card !bg-white">
                  <h2 className="text-3xl font-extrabold text-[#1a1f36] mb-4">{item.label}</h2>
                  <div className="py-20 text-center border-2 border-dashed border-[#E0E6ED] rounded-xl bg-[#FAFBFC]">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0066CC]/10 text-[#0066CC] rounded-full mb-4">
                      <item.icon size={32} />
                    </div>
                    <p className="text-[#2D3748] text-xl font-bold">Module Under Development</p>
                    <p className="text-[#718096] mt-2 max-w-sm mx-auto">
                      The {item.label} module is being prepared for the next release phase.
                    </p>
                  </div>
                </div>
              </ModuleWrapper>
            ) : <Navigate to="/login" />
          } />
        ))
      }
      <Route path="/" element={<Navigate to={user ? "/home" : "/login"} />} />
      <Route path="*" element={<Navigate to={user ? "/home" : "/login"} />} />
    </Routes >
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
