import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TrendingUp,
    Users,
    Briefcase,
    ArrowRight,
    Zap,
    FileText,
    Activity,
    Target,
    PlusCircle,
    CheckCircle2
} from 'lucide-react';

interface HomeProps {
    user: any;
}

const Home: React.FC<HomeProps> = ({ user }) => {
    const navigate = useNavigate();

    return (
        <div style={{ height: 'calc(100vh - 80px)', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '16px' }}>

            {/* Hero Section */}
            <div className="ae-hero" style={{ padding: '16px 24px', margin: '0 auto', width: '95%', flexShrink: 0 }}>
                <div className="ae-hero-bg-glow" style={{ top: '-50%', left: '-10%', background: '#FF6B00' }}></div>
                <div className="ae-hero-bg-glow" style={{ bottom: '-50%', right: '-10%', background: '#0066CC' }}></div>

                <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                    <div style={{ textAlign: 'left' }}>
                        <h1 className="ae-hero-title" style={{ fontSize: '1.25rem', marginBottom: '4px' }}>
                            SALES TOOL
                        </h1>
                        <p className="ae-hero-text" style={{ fontSize: '0.85rem', margin: '0', maxWidth: '500px' }}>
                            Streamline your workflow, manage leads, and close deals faster.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div className="ae-status-pill" style={{ padding: '4px 8px', fontSize: '0.7rem' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00C853' }}></div>
                            <span>Pipeline Active</span>
                        </div>
                        <div className="ae-status-pill" style={{ padding: '4px 8px', fontSize: '0.7rem' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FF6B00' }}></div>
                            <span>Tracking Enabled</span>
                        </div>
                        <div className="ae-status-pill" style={{ padding: '4px 8px', fontSize: '0.7rem' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0066CC' }}></div>
                            <span>Syncing Data</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{
                background: 'white',
                border: '1px solid #E0E6ED',
                borderRadius: '12px',
                padding: '20px',
                width: '95%',
                margin: '0 auto',
                boxShadow: 'var(--shadow-card)',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1a1f36', margin: 0 }}>Performance Overview</h3>
                    <p style={{ color: '#718096', fontSize: '0.8rem', margin: 0 }}>Real-time metrics for <span className="text-blue" style={{ fontWeight: 600 }}>{user?.username}</span></p>
                </div>

                {/* KPI Cards Grid */}
                <div className="ae-grid-4" style={{ marginBottom: '20px', gap: '16px' }}>
                    {[
                        { label: 'Total Revenue', value: '$124,500', icon: TrendingUp, color: 'text-green', bg: 'bg-green-soft', trend: '+12.5%' },
                        { label: 'Active Leads', value: '42', icon: Users, color: 'text-blue', bg: 'bg-blue-soft', trend: '+5 new' },
                        { label: 'Open Deals', value: '18', icon: Briefcase, color: 'text-orange', bg: 'bg-orange-soft', trend: '3 closing' },
                        { label: 'Monthly Growth', value: '32%', icon: Target, color: 'text-purple', bg: 'bg-purple-soft', trend: '+2.4%' },
                    ].map((stat, idx) => (
                        <div key={idx} className="ae-card" style={{ padding: '16px' }}>
                            <div className="ae-card-header" style={{ marginBottom: '8px' }}>
                                <div className={`ae-icon-box ${stat.bg} ${stat.color}`} style={{ padding: '8px' }}>
                                    <stat.icon size={18} />
                                </div>
                                <span className="ae-trend-badge" style={{ background: '#F7FAFC', color: '#718096', fontSize: '0.7rem', padding: '2px 6px' }}>
                                    {stat.trend}
                                </span>
                            </div>
                            <div className="ae-card-label" style={{ fontSize: '0.7rem' }}>{stat.label}</div>
                            <div className="ae-card-value" style={{ fontSize: '1.4rem' }}>{stat.value}</div>
                        </div>
                    ))}
                </div>

                {/* Lower Section */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', flex: 1, overflow: 'hidden' }}>

                    {/* Activity Feed */}
                    <div className="ae-panel" style={{ padding: '16px', overflowY: 'auto' }}>
                        <div className="ae-panel-title" style={{ fontSize: '0.95rem', marginBottom: '12px' }}>
                            <Activity size={16} className="text-blue" />
                            Recent Activity
                        </div>

                        <div>
                            {[
                                { title: 'New Lead Acquired', desc: 'Global Corp Inc. expressed interest in Enterprise plan', time: '2 mins ago', icon: CheckCircle2, color: 'text-blue', bg: 'bg-blue-soft' },
                                { title: 'Deal Closed', desc: 'TechSavvy Solutions signed contract #4092', time: '1 hour ago', icon: Zap, color: 'text-orange', bg: 'bg-orange-soft' },
                                { title: 'Proposal Viewed', desc: 'Apex Dynamics viewed the cost estimation #3321', time: '3 hours ago', icon: FileText, color: 'text-purple', bg: 'bg-purple-soft' },
                            ].map((item, idx) => (
                                <div key={idx} className="ae-activity-item" style={{ marginBottom: '12px', gap: '10px' }}>
                                    <div className={`ae-activity-icon ${item.color} ${item.bg}`} style={{ width: '28px', height: '28px' }}>
                                        <item.icon size={14} />
                                    </div>
                                    <div className="ae-activity-content">
                                        <h4 style={{ fontSize: '0.85rem' }}>{item.title}</h4>
                                        <p style={{ fontSize: '0.75rem', marginBottom: '4px' }}>{item.desc}</p>
                                        <span className="ae-activity-time" style={{ fontSize: '0.7rem' }}>{item.time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions Panel */}
                    <div className="ae-panel" style={{ background: '#F9FAFB', padding: '16px', display: 'flex', flexDirection: 'column' }}>
                        <div className="ae-panel-title" style={{ fontSize: '0.95rem', marginBottom: '12px' }}>Quick Actions</div>
                        <div style={{ flex: 1 }}>
                            {[
                                { label: 'Create New Lead', icon: Users, action: () => navigate('/lead') },
                                { label: 'Draft Estimate', icon: FileText, action: () => navigate('/estimates') },
                                { label: 'Add Task', icon: PlusCircle, action: () => navigate('/milestone') },
                            ].map((action, idx) => (
                                <button key={idx} className="ae-action-btn" onClick={action.action} style={{ padding: '10px', marginBottom: '8px' }}>
                                    <div style={{ color: '#A0AEC0' }}>
                                        <action.icon size={16} />
                                    </div>
                                    <span className="ae-action-label" style={{ fontSize: '0.8rem' }}>{action.label}</span>
                                    <ArrowRight size={12} style={{ color: '#CBD5E0' }} />
                                </button>
                            ))}
                        </div>

                        <div className="mt-4 p-3 rounded-xl border border-dashed border-orange-200" style={{ background: 'rgba(255,107,0,0.05)', marginTop: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span className="text-orange" style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Monthly Goal</span>
                                <span className="text-orange" style={{ fontSize: '0.7rem', fontWeight: 700 }}>75%</span>
                            </div>
                            <div style={{ width: '100%', background: '#E2E8F0', height: '4px', borderRadius: '99px' }}>
                                <div style={{ width: '75%', background: '#FF6B00', height: '100%', borderRadius: '99px' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;