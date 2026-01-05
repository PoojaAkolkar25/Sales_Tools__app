import React, { useState } from 'react';
import api from '../api';
import { User, Lock, Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';

interface LoginProps {
    onLoginSuccess: (token: string, user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await api.post('auth/login/', { username, password });
            onLoginSuccess(response.data.token, response.data.user);
        } catch (err: any) {
            setError(err.response?.data?.non_field_errors?.[0] || 'Invalid username or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
                <div className="max-w-md w-full z-10">
                    {/* Decorative Animated Circles */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply blur-xl opacity-30 animate-pulse"></div>
                        <div className="absolute top-40 right-10 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply blur-xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
                        <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply blur-xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-xl shadow-2xl rounded-2xl p-8 border border-white/20">
                        {/* Logo Section */}
                        <div className="flex justify-center mb-6">
                            <div className="relative flex items-center">
                                <div className="flex flex-col items-start leading-none">
                                    <svg width="50" height="42" viewBox="0 0 45 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm">
                                        <path d="M10 38L24 4L38 38H31L24 18L17 38H10Z" fill="#F98A05" />
                                        <path d="M26 33L30 27L34 33H26Z" fill="#F98A05" />
                                        <path d="M22 25L27 18L32 25H22Z" fill="#F98A05" />
                                    </svg>
                                </div>
                                <h1 className="text-[2.2rem] font-bold text-[#555] tracking-tight ml-2">
                                    Automation<span className="text-[#555] font-normal">Edge</span>
                                </h1>
                            </div>
                        </div>

                        <h2 className="text-center text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                            Welcome Back
                        </h2>
                        <p className="text-center text-gray-600">Sign in to continue</p>

                        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-100 text-red-500 rounded-xl text-sm font-medium animate-shake text-center">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="relative">
                                    <User className="absolute left-3 top-3 text-gray-400" size={24} strokeWidth={2} />
                                    <input
                                        type="text"
                                        placeholder="Username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        required
                                    />
                                </div>

                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 text-gray-400" size={24} strokeWidth={2} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-12 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-3 text-gray-500 hover:text-indigo-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                                    </button>
                                </div>
                            </div>

                            <div className="text-right text-sm">
                                <button type="button" className="text-indigo-600 hover:underline font-medium">
                                    Forgot password?
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={24} />
                                ) : (
                                    <>
                                        <LogIn size={24} strokeWidth={2} />
                                        <span>Sign In</span>
                                    </>
                                )}
                            </button>


                        </form>
                    </div>

                    <p className="text-center text-gray-600 mt-6 text-sm">
                        &copy; 2025 AutomationEdge. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
