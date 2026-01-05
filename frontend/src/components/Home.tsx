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
        <div style={{ paddingBottom: '48px' }}>

            {/* Hero Section */}
            <div className="ae-hero">
                <div className="ae-hero-bg-glow" style={{ top: '-50%', left: '-10%', background: '#FF6B00' }}></div>
                <div className="ae-hero-bg-glow" style={{ bottom: '-50%', right: '-10%', background: '#0066CC' }}></div>

                <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h1 className="ae-hero-title">
                        SALES TOOL
                    </h1>

                    <h2 className="ae-hero-subtitle">
                        AI-Powered Sales Command Center
                    </h2>

                    <p className="ae-hero-text">
                        Streamline your workflow, manage leads, and close deals faster with intelligent insights.
                    </p>

                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                        <div className="ae-status-pill">
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00C853' }}></div>
                            <span>Pipeline Active</span>
                        </div>
                        <div className="ae-status-pill">
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF6B00' }}></div>
                            <span>Tracking Enabled</span>
                        </div>
                        <div className="ae-status-pill">
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0066CC' }}></div>
                            <span>Syncing Data</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ background: 'white', border: '1px solid #E0E6ED', borderRadius: '12px', padding: '32px' }}>

                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a1f36', marginBottom: '8px' }}>Performance Overview</h3>
                    <p style={{ color: '#718096' }}>Real-time metrics for <span className="text-blue" style={{ fontWeight: 600 }}>{user?.username}</span></p>
                </div>

                {/* KPI Cards Grid */}
                <div className="ae-grid-4" style={{ marginBottom: '48px' }}>
                    {[
                        { label: 'Total Revenue', value: '$124,500', icon: TrendingUp, color: 'text-green', bg: 'bg-green-soft', trend: '+12.5%' },
                        { label: 'Active Leads', value: '42', icon: Users, color: 'text-blue', bg: 'bg-blue-soft', trend: '+5 new' },
                        { label: 'Open Deals', value: '18', icon: Briefcase, color: 'text-orange', bg: 'bg-orange-soft', trend: '3 closing' },
                        { label: 'Monthly Growth', value: '32%', icon: Target, color: 'text-purple', bg: 'bg-purple-soft', trend: '+2.4%' },
                    ].map((stat, idx) => (
                        <div key={idx} className="ae-card">
                            <div className="ae-card-header">
                                <div className={`ae-icon-box ${stat.bg} ${stat.color}`}>
                                    <stat.icon size={22} />
                                </div>
                                <span className="ae-trend-badge" style={{ background: '#F7FAFC', color: '#718096' }}>
                                    {stat.trend}
                                </span>
                            </div>
                            <div className="ae-card-label">{stat.label}</div>
                            <div className="ae-card-value">{stat.value}</div>
                        </div>
                    ))}
                </div>

                {/* Lower Section */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>

                    {/* Activity Feed */}
                    <div className="ae-panel">
                        <div className="ae-panel-title">
                            <Activity size={20} className="text-blue" />
                            Recent Activity
                        </div>

                        <div>
                            {[
                                { title: 'New Lead Acquired', desc: 'Global Corp Inc. expressed interest in Enterprise plan', time: '2 mins ago', icon: CheckCircle2, color: 'text-blue', bg: 'bg-blue-soft' },
                                { title: 'Deal Closed', desc: 'TechSavvy Solutions signed contract #4092', time: '1 hour ago', icon: Zap, color: 'text-orange', bg: 'bg-orange-soft' },
                                { title: 'Proposal Viewed', desc: 'Apex Dynamics viewed the cost estimation #3321', time: '3 hours ago', icon: FileText, color: 'text-purple', bg: 'bg-purple-soft' },
                            ].map((item, idx) => (
                                <div key={idx} className="ae-activity-item">
                                    <div className={`ae-activity-icon ${item.color} ${item.bg}`}>
                                        <item.icon size={16} />
                                    </div>
                                    <div className="ae-activity-content">
                                        <h4>{item.title}</h4>
                                        <p>{item.desc}</p>
                                        <span className="ae-activity-time">{item.time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions Panel */}
                    <div className="ae-panel" style={{ background: '#F9FAFB' }}>
                        <div className="ae-panel-title">Quick Actions</div>
                        <div>
                            {[
                                { label: 'Create New Lead', icon: Users, action: () => navigate('/lead') },
                                { label: 'Draft Estimate', icon: FileText, action: () => navigate('/estimates') },
                                { label: 'Add Task', icon: PlusCircle, action: () => navigate('/milestone') },
                            ].map((action, idx) => (
                                <button key={idx} className="ae-action-btn" onClick={action.action}>
                                    <div style={{ color: '#A0AEC0' }}>
                                        <action.icon size={18} />
                                    </div>
                                    <span className="ae-action-label">{action.label}</span>
                                    <ArrowRight size={14} style={{ color: '#CBD5E0' }} />
                                </button>
                            ))}
                        </div>

                        <div className="mt-6 p-4 rounded-xl border border-dashed border-orange-200" style={{ background: 'rgba(255,107,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span className="text-orange" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Monthly Goal</span>
                                <span className="text-orange" style={{ fontSize: '0.75rem', fontWeight: 700 }}>75%</span>
                            </div>
                            <div style={{ width: '100%', background: '#E2E8F0', height: '6px', borderRadius: '99px' }}>
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
