import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { Lock, Eye, EyeOff, Loader2, CheckCircle, XCircle } from 'lucide-react';

const ResetPassword: React.FC = () => {
    const [searchParams] = useSearchParams();
    const uid = searchParams.get('uid') || '';
    const token = searchParams.get('token') || '';

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [countdown, setCountdown] = useState(5);

    // Validate that link params are present
    const linkValid = Boolean(uid && token);

    // Countdown redirect after success
    useEffect(() => {
        if (!success) return;
        if (countdown <= 0) {
            window.location.href = '/';
            return;
        }
        const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [success, countdown]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            await api.post('auth/reset-password/', { uid, token, new_password: newPassword });
            setSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 py-12 px-4 relative overflow-hidden font-sans">
            {/* Decorative blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply blur-xl opacity-30 animate-pulse" />
                <div className="absolute top-40 right-10 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply blur-xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply blur-xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <div className="bg-white/80 backdrop-blur-xl shadow-2xl rounded-2xl p-8 border border-white/20 w-full max-w-md z-10">
                {/* Logo */}
                <div className="flex justify-center mb-6">
                    <div className="flex items-center">
                        <svg width="50" height="42" viewBox="0 0 45 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm">
                            <path d="M10 38L24 4L38 38H31L24 18L17 38H10Z" fill="#F98A05" />
                            <path d="M26 33L30 27L34 33H26Z" fill="#F98A05" />
                            <path d="M22 25L27 18L32 25H22Z" fill="#F98A05" />
                        </svg>
                        <h1 className="text-[2.2rem] font-bold text-[#555] tracking-tight ml-2">
                            Automation<span className="text-[#555] font-normal">Edge</span>
                        </h1>
                    </div>
                </div>

                {/* ── Invalid link state ── */}
                {!linkValid && (
                    <div className="flex flex-col items-center text-center py-4">
                        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                            <XCircle size={36} className="text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Invalid Reset Link</h2>
                        <p className="text-gray-500 text-sm mb-6">
                            This password reset link is invalid or missing required parameters.
                            Please request a new one from the login page.
                        </p>
                        <a
                            href="/"
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-all text-sm"
                        >
                            Back to Login
                        </a>
                    </div>
                )}

                {/* ── Success state ── */}
                {linkValid && success && (
                    <div className="flex flex-col items-center text-center py-4">
                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                            <CheckCircle size={36} className="text-green-500" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Password Updated!</h2>
                        <p className="text-gray-500 text-sm mb-6">
                            Your password has been set successfully.
                            Redirecting to login in <strong>{countdown}</strong> second{countdown !== 1 ? 's' : ''}…
                        </p>
                        <a
                            href="/"
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-all text-sm"
                        >
                            Go to Login
                        </a>
                    </div>
                )}

                {/* ── Form state ── */}
                {linkValid && !success && (
                    <>
                        <h2 className="text-center text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1">
                            Set New Password
                        </h2>
                        <p className="text-center text-gray-500 text-sm mb-6">
                            Choose a strong password to secure your account.
                        </p>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-500 rounded-xl text-sm text-center">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* New Password */}
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                                <input
                                    type={showNew ? 'text' : 'password'}
                                    placeholder="New Password (min. 8 characters)"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full pl-10 pr-12 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                                    required
                                    minLength={8}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNew(!showNew)}
                                    className="absolute right-3 top-3 text-gray-500 hover:text-indigo-600 transition-colors"
                                >
                                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            {/* Confirm Password */}
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                                <input
                                    type={showConfirm ? 'text' : 'password'}
                                    placeholder="Confirm New Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-10 pr-12 py-3 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-3 top-3 text-gray-500 hover:text-indigo-600 transition-colors"
                                >
                                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            {/* Password match indicator */}
                            {confirmPassword && (
                                <p className={`text-xs font-medium ${newPassword === confirmPassword ? 'text-green-500' : 'text-red-400'}`}>
                                    {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-2"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    'Set Password'
                                )}
                            </button>

                            <div className="text-center">
                                <a href="/" className="text-indigo-600 hover:underline text-sm font-medium">
                                    ← Back to Login
                                </a>
                            </div>
                        </form>
                    </>
                )}
            </div>

            <p className="absolute bottom-4 text-center text-gray-400 text-xs w-full">
                &copy; 2025 AutomationEdge. All rights reserved.
            </p>
        </div>
    );
};

export default ResetPassword;
