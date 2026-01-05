import React, { useState, useRef, useEffect } from 'react';
import {
    Plus,
    Search,
    Bell,
    ChevronDown,
    User,
    LogOut
} from 'lucide-react';

interface NavbarProps {
    user: any;
    onLogout: () => void;
    onCreateUser?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout, onCreateUser }) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
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
        <header className="ae-navbar">

            {/* Left Section: Context / Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '48px' }}>
                {/* Breadcrumb */}
                <div style={{ display: 'flex', gap: '8px', color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    <span>Sales Tool</span>
                    <span>/</span>
                    <span style={{ color: 'white' }}>Dashboard</span>
                </div>

                <div className="ae-nav-search">
                    <Search size={16} color="rgba(255,255,255,0.4)" style={{ marginRight: '10px' }} />
                    <input
                        type="text"
                        placeholder="Search leads, deals, orders..."
                    />
                </div>
            </div>

            {/* Right Section: Actions & Profile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                {/* Quick Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingRight: '24px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ position: 'relative' }}>
                        <button
                            className="ae-icon-btn"
                            style={{ position: 'relative' }}
                            onClick={() => setShowNotifications(!showNotifications)}
                        >
                            <Bell size={20} />
                            <span style={{ position: 'absolute', top: '6px', right: '6px', width: '8px', height: '8px', background: '#FF6B00', borderRadius: '50%' }}></span>
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

                    {onCreateUser && (
                        <button onClick={onCreateUser} className="ae-create-btn">
                            <Plus size={14} />
                            <span>CREATE USER</span>
                        </button>
                    )}
                </div>

                {/* Profile Dropdown Area */}
                <div
                    ref={profileRef}
                    style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '8px', cursor: 'pointer' }}
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>
                            {user?.username}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 500 }}>
                            {user?.role === 'app_admin' ? 'Admin' : 'Sales Rep'}
                        </span>
                    </div>

                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(to bottom right, #FF6B00, #FF9E40)', padding: '2px' }}>
                        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#1a1f36', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={18} color="#FF6B00" />
                        </div>
                    </div>

                    <ChevronDown size={16} color="rgba(255,255,255,0.5)" style={{ transform: isProfileOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />

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
                                <span>Sign Out</span>
                                <LogOut size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Navbar;
