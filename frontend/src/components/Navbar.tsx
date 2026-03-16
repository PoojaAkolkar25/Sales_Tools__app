import React, { useState, useEffect } from 'react';
import {
    Bell,
    LogOut,
    HelpCircle,
    User,
    DollarSign,
    Euro
} from 'lucide-react';
import api from '../api';

interface NavbarProps {
    user: any;
    onLogout: () => void;
    isSidebarExpanded?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ onLogout, isSidebarExpanded, user }) => {
    const [showNotifications, setShowNotifications] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [rates, setRates] = useState<{ USD?: number, EUR?: number }>({});
    const [rateDate, setRateDate] = useState<string>('');

    useEffect(() => {
        const fetchRates = async () => {
            try {
                const response = await api.get('/finance/exchange-rates/latest/');
                setRates(response.data.rates);
                setRateDate(response.data.date);
            } catch (error) {
                console.error('Error fetching exchange rates:', error);
            }
        };
        fetchRates();
    }, []);

    return (
        <header className={`ae-navbar ${isSidebarExpanded ? 'sidebar-expanded' : ''}`}>

            {/* Left Section: Spacer to push actions to the right */}
            <div style={{ flex: 1 }}></div>

            {/* Right Section: Actions & Profile aligned as per image */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                {/* Exchange Rates Display */}
                {(rates.USD || rates.EUR) && (
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        padding: '4px 12px', 
                        background: 'rgba(255, 255, 255, 0.05)', 
                        borderRadius: '20px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        fontSize: '11px',
                        color: 'rgba(255, 255, 255, 0.8)',
                    }} title={`Daily Exchange Rates (as of ${rateDate})`}>
                        {rates.USD && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <DollarSign size={12} style={{ color: '#48BB78' }} />
                                <span>{rates.USD.toFixed(2)} INR</span>
                            </div>
                        )}
                        <div style={{ width: '1px', height: '12px', background: 'rgba(255, 255, 255, 0.2)' }}></div>
                        {rates.EUR && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Euro size={12} style={{ color: '#4299E1' }} />
                                <span>{rates.EUR.toFixed(2)} INR</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Notification Bell */}
                <div style={{ position: 'relative' }}>
                    <button
                        className="ae-icon-btn"
                        style={{ position: 'relative' }}
                        onClick={() => setShowNotifications(!showNotifications)}
                    >
                        <Bell size={16} />
                        <span style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            width: '6px',
                            height: '6px',
                            background: 'var(--theme-primary)',
                            borderRadius: '50%',
                            border: '1.5px solid var(--ae-navy)'
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
                            background: 'var(--bg-primary)',
                            borderRadius: '12px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                            padding: '16px',
                            border: '1px solid var(--border-primary)',
                            zIndex: 100
                        }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Notifications</h4>
                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', textAlign: 'center' }}>
                                No new notifications
                            </div>
                        </div>
                    )}
                </div>

                <button
                    onClick={() => setShowHelpModal(true)}
                    className="ae-icon-btn"
                    title="Help"
                >
                    <HelpCircle size={16} />
                </button>




                {/* User Profile & Logout Dropdown */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                        className={`ae-icon-btn ${showProfileDropdown ? 'active' : ''}`}
                        title="User Profile"
                        style={{
                            background: showProfileDropdown ? 'rgba(255, 255, 255, 0.2)' : undefined,
                            borderColor: showProfileDropdown ? 'rgba(255, 255, 255, 0.4)' : undefined
                        }}
                    >
                        <User size={16} />
                    </button>

                    {showProfileDropdown && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: '12px',
                            width: '240px',
                            background: 'var(--bg-primary)',
                            borderRadius: '12px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                            border: '1px solid var(--border-primary)',
                            zIndex: 100,
                            overflow: 'hidden',
                            animation: 'modalSlideUp 0.2s ease-out'
                        }}>
                            {/* User Info Header */}
                            <div style={{
                                padding: '16px',
                                borderBottom: '1px solid var(--border-primary)',
                                background: 'var(--bg-secondary)'
                            }}>
                                <div style={{
                                    fontWeight: 700,
                                    color: 'var(--text-primary)',
                                    fontSize: '14px',
                                    marginBottom: '2px'
                                }}>
                                    {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username || 'User'}
                                </div>
                                <div style={{
                                    fontSize: '11px',
                                    color: 'var(--theme-primary)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    fontWeight: 600
                                }}>
                                    {user?.role?.replace('_', ' ') || 'Member'}
                                </div>
                            </div>

                            {/* Dropdown Actions */}
                            <div style={{ padding: '8px' }}>
                                <button
                                    onClick={() => {
                                        setShowProfileDropdown(false);
                                        onLogout();
                                    }}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '10px 12px',
                                        background: 'transparent',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: '#E53E3E',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(229, 62, 62, 0.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    <LogOut size={16} />
                                    <span>Logout</span>
                                </button>
                            </div>
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
                        background: 'var(--bg-primary)',
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
                                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>Deal Process Flow</h2>
                            </div>
                            <button
                                onClick={() => setShowHelpModal(false)}
                                style={{
                                    background: 'var(--bg-secondary)',
                                    border: 'none',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: 'var(--text-secondary)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
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
                                    background: 'var(--bg-secondary)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border-primary)',
                                    transition: 'transform 0.2s, background 0.2s',
                                    cursor: 'default'
                                }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateX(4px)';
                                        e.currentTarget.style.background = 'var(--bg-primary)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateX(0)';
                                        e.currentTarget.style.background = 'var(--bg-secondary)';
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
                                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px', marginBottom: '2px' }}>{item.stage}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{item.desc}</div>
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


        </header>

    );
};

export default Navbar;
