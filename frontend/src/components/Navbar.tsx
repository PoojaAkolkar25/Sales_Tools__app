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
    isSidebarExpanded?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout, onCreateUser, isSidebarExpanded }) => {
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
        <header className={`ae-navbar ${isSidebarExpanded ? 'sidebar-expanded' : ''}`}>

            {/* Left Section: Search only (SalesEdge removed) */}
            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div className="ae-nav-search">
                    <Search size={16} color="rgba(255,255,255,0.4)" style={{ marginRight: '10px' }} />
                    <input
                        type="text"
                        placeholder="Search leads, deals, orders..."
                    />
                </div>
            </div>

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

                {/* Create User Button */}
                {onCreateUser && (
                    <button onClick={onCreateUser} className="ae-create-btn">
                        <Plus size={14} />
                        <span>CREATE USER</span>
                    </button>
                )}

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
        </header>

    );
};

export default Navbar;
