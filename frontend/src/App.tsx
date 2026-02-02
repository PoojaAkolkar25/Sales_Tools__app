import React, { useState, useEffect } from 'react';
import {
  FileText,
  Handshake,
  FileSpreadsheet,
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
  Loader2
} from 'lucide-react';
import CostSheetForm from './components/CostSheetForm';
import CostSheetDashboard from './components/CostSheetDashboard';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import Home from './components/Home';
import Navbar from './components/Navbar';
import Payment from './components/Payment';
import InvoiceDashboard from './components/InvoiceDashboard';
import api from './api';
import './index.css';
import { NotificationProvider } from './context/NotificationContext';
import DealDashboard from './components/DealDashboard';
import DealForm from './components/DealForm';
import EstimateDashboard from './components/EstimateDashboard';
import EstimateForm from './components/EstimateForm';
import SalesOrderDashboard from './components/SalesOrderDashboard';
import SalesOrderForm from './components/SalesOrderForm';
import MilestoneDashboard from './components/MilestoneDashboard';
import LeadDashboard from './components/LeadDashboard';
import LeadForm from './components/LeadForm';



import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

const AppContent: React.FC = () => {
  const [costSheetView, setCostSheetView] = useState<'form' | 'dashboard'>('dashboard');
  const [dealView, setDealView] = useState<'form' | 'dashboard'>('dashboard');
  const [estimateView, setEstimateView] = useState<'form' | 'dashboard'>('dashboard');
  const [salesOrderView, setSalesOrderView] = useState<'form' | 'dashboard'>('dashboard');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingDealId, setEditingDealId] = useState<number | null>(null);
  const [editingEstimateId, setEditingEstimateId] = useState<number | null>(null);
  const [editingSalesOrderId, setEditingSalesOrderId] = useState<number | null>(null);
  const [editingLeadId, setEditingLeadId] = useState<number | null>(null);
  const [leadView, setLeadView] = useState<'form' | 'dashboard'>('dashboard');

  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

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
      if (!user && location.pathname !== '/login') {
        navigate('/login');
      } else if (user && location.pathname === '/login') {
        navigate('/');
      }
    }
  }, [user, authLoading, location.pathname, navigate]);

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

  const baseNavItems = [
    { id: 'home', label: 'Home', icon: LayoutDashboard, path: '/home' },
    { id: 'lead', label: 'Lead', icon: Users, path: '/lead' },
    { id: 'deal', label: 'Deal', icon: Handshake, path: '/deal' },
    { id: 'cost-sheet', label: 'Cost Sheet', icon: FileText, path: '/cost-sheet' },
    { id: 'estimates', label: 'Estimates', icon: FileSpreadsheet, path: '/estimates' },
    { id: 'sales-order', label: 'Sales Order', icon: ShoppingBag, path: '/sales-order' },
    { id: 'milestone', label: 'Milestone', icon: Milestone, path: '/milestone' },
    { id: 'inventory', label: 'Inventory', icon: Boxes, path: '/inventory' },
    { id: 'invoice', label: 'Invoice', icon: Receipt, path: '/invoice' },
    { id: 'payment', label: 'Payment', icon: Wallet, path: '/payment' },
    { id: 'revenue', label: 'Revenue', icon: TrendingUp, path: '/revenue' },
    { id: 'contracts', label: 'Contracts', icon: Gavel, path: '/contracts' },
  ];


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


  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F9FC]">
        <div className="text-center">
          <Loader2 className="animate-spin text-[#0066CC] mx-auto mb-4" size={48} />
          <p className="text-[#2D3748] font-semibold">Loading SalesEdge...</p>
        </div>
      </div>
    );
  }

  const ModuleWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="app-container">
      {/* Left Sidebar */}
      <aside className="sidebar flex flex-col !w-20 overflow-hidden">
        <div className="sidebar-logo !px-0 flex justify-center">
          <div className="grid grid-cols-2 gap-0.5">
            <div className="w-2.5 h-2.5 bg-[#A0AEC0]"></div>
            <div className="w-2.5 h-2.5 bg-[#3182CE]"></div>
            <div className="w-2.5 h-2.5 bg-[#3182CE]"></div>
            <div className="w-2.5 h-2.5 bg-[#F6AD55]"></div>
          </div>
          <h1 className="sr-only">SalesEdge</h1>
        </div>

        <nav className="sidebar-nav flex-1">
          {baseNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`sidebar-item !px-0 flex justify-center ${location.pathname === item.path ? 'active' : ''}`}
              title={item.label}
            >
              <item.icon size={24} />
              <span className="sr-only">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <Navbar
          user={user}
          onLogout={handleLogout}
          onCreateUser={user?.role === 'app_admin' ? () => navigate('/user-management?action=create') : undefined}
        />
        <div className="content-inner animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );

  return (
    <Routes>
      <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
      <Route path="/home" element={
        user ? (
          <ModuleWrapper>
            <Home user={user} />
          </ModuleWrapper>
        ) : <Navigate to="/login" />
      } />
      <Route path="/Dashboard" element={<Navigate to="/home" />} />
      <Route path="/cost-sheet" element={
        user ? (
          <ModuleWrapper>
            <div className="space-y-6">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 8px',
                marginBottom: '16px'
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
                      background: costSheetView === 'dashboard' ? '#FF6B00' : 'transparent',
                      color: costSheetView === 'dashboard' ? 'white' : '#718096',
                      boxShadow: costSheetView === 'dashboard' ? '0 2px 8px rgba(255, 107, 0, 0.3)' : 'none'
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
                      background: (costSheetView === 'form' && !editingId) ? '#FF6B00' : 'transparent',
                      color: (costSheetView === 'form' && !editingId) ? 'white' : '#718096',
                      boxShadow: (costSheetView === 'form' && !editingId) ? '0 2px 8px rgba(255, 107, 0, 0.3)' : 'none'
                    }}
                  >
                    <PlusCircle size={18} /> Create New
                  </button>
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
          </ModuleWrapper>
        ) : <Navigate to="/login" />
      } />
      <Route path="/user-management" element={
        user && user.role === 'app_admin' ? (
          <ModuleWrapper>
            <UserManagement />
          </ModuleWrapper>
        ) : <Navigate to="/login" />
      } />
      <Route path="/lead" element={
        user ? (
          <ModuleWrapper>
            {leadView === 'form' ? (
              <LeadForm
                id={editingLeadId}
                onBack={() => setLeadView('dashboard')}
                onSave={() => setLeadView('dashboard')}
              />
            ) : (
              <LeadDashboard
                onView={handleViewLeadDetails}
                onCreate={handleCreateNewLead}
              />
            )}
          </ModuleWrapper>
        ) : <Navigate to="/login" />
      } />
      <Route path="/deal" element={
        user ? (
          <ModuleWrapper>
            <div className="space-y-6">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 8px',
                marginBottom: '16px'
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
                      background: dealView === 'dashboard' ? '#FF6B00' : 'transparent',
                      color: dealView === 'dashboard' ? 'white' : '#718096',
                      boxShadow: dealView === 'dashboard' ? '0 2px 8px rgba(255, 107, 0, 0.3)' : 'none'
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
                      background: (dealView === 'form' && !editingDealId) ? '#FF6B00' : 'transparent',
                      color: (dealView === 'form' && !editingDealId) ? 'white' : '#718096',
                      boxShadow: (dealView === 'form' && !editingDealId) ? '0 2px 8px rgba(255, 107, 0, 0.3)' : 'none'
                    }}
                  >
                    <PlusCircle size={18} /> Create New
                  </button>
                </div>
              </div>

              {dealView === 'form' ? (
                <DealForm
                  id={editingDealId}
                  onBack={() => setDealView('dashboard')}
                  onSave={() => setDealView('dashboard')}
                />
              ) : (
                <DealDashboard
                  onView={handleViewDealDetails}
                  onCreate={handleCreateNewDeal}
                />
              )}
            </div>
          </ModuleWrapper>
        ) : <Navigate to="/login" />
      } />
      <Route path="/estimates" element={
        user ? (
          <ModuleWrapper>
            {estimateView === 'form' ? (
              <EstimateForm
                id={editingEstimateId!}
                onBack={() => setEstimateView('dashboard')}
              />
            ) : (
              <EstimateDashboard
                onView={handleViewEstimateDetails}
              />
            )}
          </ModuleWrapper>
        ) : <Navigate to="/login" />
      } />
      <Route path="/sales-order" element={
        user ? (
          <ModuleWrapper>
            {salesOrderView === 'form' ? (
              <SalesOrderForm
                id={editingSalesOrderId}
                onBack={() => setSalesOrderView('dashboard')}
                onSave={() => setSalesOrderView('dashboard')}
              />
            ) : (
              <SalesOrderDashboard
                onView={handleViewSalesOrderDetails}
              />
            )}
          </ModuleWrapper>
        ) : <Navigate to="/login" />
      } />
      <Route path="/invoice" element={
        user ? (
          <ModuleWrapper>
            <InvoiceDashboard />
          </ModuleWrapper>
        ) : <Navigate to="/login" />
      } />
      <Route path="/payment" element={
        user ? (
          <ModuleWrapper>
            <Payment />
          </ModuleWrapper>
        ) : <Navigate to="/login" />
      } />
      <Route path="/milestone" element={
        user ? (
          <ModuleWrapper>
            <MilestoneDashboard />
          </ModuleWrapper>
        ) : <Navigate to="/login" />
      } />
      {baseNavItems.filter(item => !['lead', 'cost-sheet', 'invoice', 'payment', 'deal', 'estimates', 'sales-order', 'milestone'].includes(item.id)).map(item => (
        <Route key={item.id} path={item.path} element={
          user ? (
            <ModuleWrapper>
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
      ))}
      <Route path="/" element={<Navigate to={user ? "/home" : "/login"} />} />
      <Route path="*" element={<Navigate to={user ? "/home" : "/login"} />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </BrowserRouter>
  );
};

export default App;
