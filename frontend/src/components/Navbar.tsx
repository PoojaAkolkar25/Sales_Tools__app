import React, { useState, useRef, useEffect } from 'react';
import {
    Bell,
    ChevronDown,
    User,
    LogOut,
    HelpCircle,
    History
} from 'lucide-react';
import AllAuditTrail from './AllAuditTrail';

interface NavbarProps {
    user: any;
    onLogout: () => void;
    isSidebarExpanded?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout, isSidebarExpanded }) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [showAuditTrail, setShowAuditTrail] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <header className={`ae-navbar ${isSidebarExpanded ? 'sidebar-expanded' : ''}`}>

            {/* Left Section: Spacer to push actions to the right */}
            <div style={{ flex: 1 }}></div>

            {/* Right Section: Actions & Profile aligned as per image */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                {/* Notification Bell */}
                <div style={{ position: 'relative' }}>
                    <button
                        className="ae-icon-btn"
                        style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
                        onClick={() => setShowNotifications(!showNotifications)}
                    >
                        <Bell size={20} />
                        <span style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '8px',
                            height: '8px',
                            background: '#FF6B00',
                            borderRadius: '50%',
                            border: '2px solid var(--ae-navy)'
                        }}></span>
                    </button>

                    {/* Notification Panel (Mock) */}
                    {showNotifications && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: '12px',
                            width: '320px',
                            background: 'white',
                            borderRadius: '12px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                            padding: '16px',
                            border: '1px solid #E0E6ED',
                            zIndex: 100
                        }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, color: '#1a1f36' }}>Notifications</h4>
                            <div style={{ fontSize: '12px', color: '#718096', padding: '12px', background: '#F7FAFC', borderRadius: '8px', textAlign: 'center' }}>
                                No new notifications
                            </div>
                        </div>
                    )}
                </div>

                {/* Help Button */}
                <button
                    onClick={() => setShowHelpModal(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    }}
                    title="View Process Flow"
                >
                    <HelpCircle size={18} />
                    <span>Help</span>
                </button>

                {/* Audit Trail Button */}
                <button
                    onClick={() => setShowAuditTrail(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    }}
                    title="View All Audit Logs"
                >
                    <History size={18} />
                    <span>Audit Trail</span>
                </button>


                {/* Profile Section */}
                <div
                    ref={profileRef}
                    style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: '1.2' }}>
                        <span style={{ color: 'white', fontSize: '14px', fontWeight: 700 }}>
                            {user?.username}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>
                            {user?.role === 'app_admin' ? 'Admin' : 'Sales Rep'}
                        </span>
                    </div>

                    <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.1)',
                        padding: '2px',
                        border: '2px solid #FF6B00',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <User size={18} color="#FF6B00" />
                    </div>

                    <ChevronDown size={14} color="rgba(255,255,255,0.4)" style={{ transform: isProfileOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />

                    {/* Profile Dropdown Menu */}
                    {isProfileOpen && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: '12px',
                            width: '240px',
                            background: '#1a1f36',
                            borderRadius: '12px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                            padding: '8px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            zIndex: 100,
                            overflow: 'hidden'
                        }}>
                            <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <User size={20} color="white" />
                                </div>
                                <div>
                                    <div style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>{user?.username}</div>
                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>{user?.role === 'app_admin' ? 'Administrator' : 'User'}</div>
                                </div>
                            </div>


                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onLogout();
                                }}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 16px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#FF6B00',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    borderRadius: '8px',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 107, 0, 0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <span>Log Out</span>
                                <LogOut size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Help Modal */}
            {showHelpModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    backdropFilter: 'blur(4px)'
                }} onClick={() => setShowHelpModal(false)}>
                    <div style={{
                        background: 'white',
                        padding: '32px',
                        borderRadius: '20px',
                        maxWidth: '600px',
                        width: '90%',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                        position: 'relative',
                        animation: 'modalSlideUp 0.3s ease-out'
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: 'rgba(255, 107, 0, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <HelpCircle size={24} color="#FF6B00" />
                                </div>
                                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#1a1f36' }}>Deal Process Flow</h2>
                            </div>
                            <button
                                onClick={() => setShowHelpModal(false)}
                                style={{
                                    background: '#F1F5F9',
                                    border: 'none',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#64748B',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#E2E8F0'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#F1F5F9'}
                            >
                                ×
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[
                                { stage: 'Deal Created', desc: 'Initial deal entry and basic information capture', color: '#3182CE' },
                                { stage: 'Cost Sheet', desc: 'Detailed cost analysis and resource planning', color: '#B7791F' },
                                { stage: 'Estimates', desc: 'Formal quotation preparation and approval', color: '#805AD5' },
                                { stage: 'Sales Order', desc: 'Customer order confirmation and processing', color: '#DD6B20' },
                                { stage: 'Invoice', desc: 'Billing and invoice generation', color: '#38A169' },
                                { stage: 'Payment', desc: 'Payment receipt and deal closure', color: '#00A3C4' }
                            ].map((item, idx) => (
                                <div key={idx} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                    padding: '16px',
                                    background: '#F8FAFC',
                                    borderRadius: '12px',
                                    border: '1px solid #F1F5F9',
                                    transition: 'transform 0.2s, background 0.2s',
                                    cursor: 'default'
                                }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateX(4px)';
                                        e.currentTarget.style.background = 'white';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateX(0)';
                                        e.currentTarget.style.background = '#F8FAFC';
                                    }}
                                >
                                    <div style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        background: item.color,
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 800,
                                        fontSize: '12px',
                                        boxShadow: `0 4px 10px ${item.color}40`
                                    }}>
                                        {idx + 1}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, color: '#1a1f36', fontSize: '14px', marginBottom: '2px' }}>{item.stage}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748B', lineHeight: '1.4' }}>{item.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{
                            marginTop: '24px',
                            padding: '16px',
                            background: 'linear-gradient(to right, #EBF8FF, #E6FFFA)',
                            borderRadius: '12px',
                            border: '1px solid #90CDF4',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start'
                        }}>
                            <div style={{ fontSize: '18px' }}>💡</div>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#2C5282', lineHeight: '1.5' }}>
                                <strong>Pro Tip:</strong> Each stage represents a key milestone. Ensure all required information is captured at each stage before proceeding to maintain data integrity.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Audit Trail Sidebar */}
            <AllAuditTrail show={showAuditTrail} onClose={() => setShowAuditTrail(false)} />
        </header>

    );
};

export default Navbar;
