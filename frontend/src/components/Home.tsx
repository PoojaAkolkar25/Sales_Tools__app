import React from 'react';
import {
    Sparkles,
    TrendingUp,
    Users,
    Briefcase,
    ArrowRight,
    ShieldCheck,
    Zap
} from 'lucide-react';

interface HomeProps {
    user: any;
}

const Home: React.FC<HomeProps> = ({ user }) => {
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
