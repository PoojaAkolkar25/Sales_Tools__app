import React from 'react';
<<<<<<< HEAD
import { useNavigate } from 'react-router-dom';
import {
=======
import {
    Sparkles,
>>>>>>> 4846736be912594f6da7d7e0182cf99c8a2fc7f6
    TrendingUp,
    Users,
    Briefcase,
    ArrowRight,
<<<<<<< HEAD
    Zap,
    FileText,
    Activity,
    Target,
    PlusCircle,
    CheckCircle2
=======
    ShieldCheck,
    Zap
>>>>>>> 4846736be912594f6da7d7e0182cf99c8a2fc7f6
} from 'lucide-react';

interface HomeProps {
    user: any;
}

const Home: React.FC<HomeProps> = ({ user }) => {
<<<<<<< HEAD
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
=======
    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Welcome Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0066CC] to-[#004A99] p-12 text-white shadow-2xl">
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6 animate-bounce">
                        <Sparkles size={18} className="text-yellow-400" />
                        <span className="text-sm font-medium">Welcome to the future of Sales</span>
                    </div>

                    <h1 className="text-5xl font-extrabold mb-4 tracking-tight">
                        Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500">{user?.username}</span>!
                    </h1>

                    <p className="text-xl text-blue-100 max-w-2xl mb-8 leading-relaxed">
                        Your comprehensive sales management dashboard is ready.
                        Streamline your workflow, manage leads, and close deals faster than ever before.
                    </p>

                    <div className="flex gap-4">
                        <button className="px-8 py-3 bg-white text-[#0066CC] rounded-xl font-bold hover:bg-blue-50 transition-all flex items-center gap-2 group shadow-lg">
                            Get Started <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                            <ShieldCheck size={20} className="text-blue-200" />
                            <span className="font-medium">{user?.role === 'app_admin' ? 'Admin Access' : 'Standard User'}</span>
                        </div>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-64 h-64 bg-blue-400/20 rounded-full blur-2xl"></div>
                <Zap className="absolute top-10 right-20 text-white/5 w-64 h-64 rotate-12" />
            </div>

            {/* Quick Stats / Feedback Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Active Leads', value: '24', icon: Users, color: 'bg-blue-500', trend: '+12%' },
                    { label: 'Deals in Pipeline', value: '18', icon: Briefcase, color: 'bg-indigo-500', trend: '+5%' },
                    { label: 'Monthly Growth', value: '32%', icon: TrendingUp, color: 'bg-emerald-500', trend: '+8%' },
                ].map((stat, idx) => (
                    <div key={idx} className="glass-card hover:scale-[1.02] transition-transform duration-300">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-2xl ${stat.color} text-white shadow-lg shadow-${stat.color.split('-')[1]}-200`}>
                                <stat.icon size={24} />
                            </div>
                            <span className="text-emerald-500 text-sm font-bold bg-emerald-50 px-2 py-1 rounded-lg">
                                {stat.trend}
                            </span>
                        </div>
                        <h3 className="text-gray-500 text-sm font-medium mb-1">{stat.label}</h3>
                        <p className="text-3xl font-bold text-[#1a1f36]">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Development Notice (Replacing the old dashboard welcome) */}
            <div className="glass-card !bg-white border-blue-100 p-8">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                        <Sparkles size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-[#1a1f36] mb-2">Next Gen Sales Hub</h2>
                        <p className="text-gray-600 leading-relaxed">
                            We've upgraded your workspace with new navigation and a personalized home experience.
                            Explore the modules on the left to manage your sales operations.
                            Each module is being optimized for performance and ease of use.
                        </p>
>>>>>>> 4846736be912594f6da7d7e0182cf99c8a2fc7f6
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
