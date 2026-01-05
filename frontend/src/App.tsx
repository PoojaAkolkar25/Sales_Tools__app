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
import api from './api';
import './index.css';


import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

const AppContent: React.FC = () => {
  const [costSheetView, setCostSheetView] = useState<'form' | 'dashboard'>('dashboard');
  const [editingId, setEditingId] = useState<number | null>(null);
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F9FC]">
        <div className="text-center">
          <Loader2 className="animate-spin text-[#0066CC] mx-auto mb-4" size={48} />
          <p className="text-[#2D3748] font-semibold">Loading Sales Tool...</p>
        </div>
      </div>
    );
  }

  const ModuleWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="app-container">
      {/* Left Sidebar */}
      <aside className="sidebar flex flex-col">
        <div className="sidebar-logo">
          <div className="grid grid-cols-2 gap-0.5 mr-2">
            <div className="w-2.5 h-2.5 bg-[#A0AEC0]"></div>
            <div className="w-2.5 h-2.5 bg-[#3182CE]"></div>
            <div className="w-2.5 h-2.5 bg-[#3182CE]"></div>
            <div className="w-2.5 h-2.5 bg-[#F6AD55]"></div>
          </div>
          <h1>Sales Tool</h1>
        </div>

        <nav className="sidebar-nav flex-1">
          <div className="sidebar-section-label">Main Modules</div>
          {baseNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}

        </nav>

        {/* User context removed from sidebar bottom as it is now in the top navbar */}
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
<<<<<<< HEAD
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <button
                  onClick={() => setCostSheetView('dashboard')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: costSheetView === 'dashboard' ? '#FF6B00' : 'white',
                    color: costSheetView === 'dashboard' ? 'white' : '#2D3748',
                    boxShadow: costSheetView === 'dashboard' ? '0 4px 12px rgba(255, 107, 0, 0.3)' : '0 1px 3px rgba(0,0,0,0.1)'
                  }}
=======
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setCostSheetView('dashboard')}
                  className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-semibold transition-all ${costSheetView === 'dashboard' ? 'bg-[#0066CC] text-white shadow-lg' : 'bg-white text-[#2D3748] border border-[#E0E6ED] hover:bg-[#FAFBFC]'}`}
>>>>>>> 4846736be912594f6da7d7e0182cf99c8a2fc7f6
                >
                  <LayoutDashboard size={18} /> Dashboard
                </button>
                <button
                  onClick={handleCreateNew}
<<<<<<< HEAD
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: costSheetView === 'form' && !editingId ? '#FF6B00' : 'white',
                    color: costSheetView === 'form' && !editingId ? 'white' : '#2D3748',
                    boxShadow: costSheetView === 'form' && !editingId ? '0 4px 12px rgba(255, 107, 0, 0.3)' : '0 1px 3px rgba(0,0,0,0.1)'
                  }}
=======
                  className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-semibold transition-all ${costSheetView === 'form' && !editingId ? 'bg-[#0066CC] text-white shadow-lg' : 'bg-white text-[#2D3748] border border-[#E0E6ED] hover:bg-[#FAFBFC]'}`}
>>>>>>> 4846736be912594f6da7d7e0182cf99c8a2fc7f6
                >
                  <PlusCircle size={18} /> Create New
                </button>
              </div>

              {costSheetView === 'form' ? (
                <CostSheetForm
                  id={editingId}
                  onBack={() => setCostSheetView('dashboard')}
                />
              ) : (
                <CostSheetDashboard onView={handleViewDetails} />
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
      {baseNavItems.filter(item => item.id !== 'cost-sheet').map(item => (
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
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
