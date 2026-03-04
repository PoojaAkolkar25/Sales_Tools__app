import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import api from '../api';
import { User, Lock, Eye, EyeOff, LogIn, Loader2, X, Mail, CheckCircle } from 'lucide-react';

interface LoginProps {
    onLoginSuccess: (token: string, user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Forgot password modal state
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotError, setForgotError] = useState('');
    const [forgotSuccess, setForgotSuccess] = useState(false);

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

    const handleForgotOpen = () => {
        setForgotEmail('');
        setForgotError('');
        setForgotSuccess(false);
        setShowForgotModal(true);
    };

    const handleForgotClose = () => {
        setShowForgotModal(false);
    };

    const handleForgotSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotError('');
        setForgotLoading(true);
        try {
            await api.post('auth/forgot-password/', { email: forgotEmail });
            setForgotSuccess(true);
        } catch (err: any) {
            setForgotError(
                err.response?.data?.error || 'Something went wrong. Please try again.'
            );
        } finally {
            setForgotLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif" }}>
            {/* Inline style tag for animations & login-specific styles */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(24px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-6px); }
                    40% { transform: translateX(6px); }
                    60% { transform: translateX(-4px); }
                    80% { transform: translateX(4px); }
                }
                @keyframes modal-enter {
                    from { opacity: 0; transform: scale(0.95) translateY(16px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }

                .login-page {
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: #f8f9fb;
                    position: relative;
                    overflow: hidden;
                    padding: 24px;
                }

                .login-orb {
                    display: none;
                }

                .login-card-wrapper {
                    max-width: 460px;
                    width: 100%;
                    z-index: 10;
                    animation: fade-in-up 0.6s ease-out;
                }

                .login-card {
                    background: #ffffff;
                    border-radius: 16px;
                    padding: 44px 40px 36px;
                    border: 1px solid #e8eaed;
                    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04);
                    position: relative;
                }
                .login-card::before {
                    display: none;
                }

                .login-logo-row {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    margin-bottom: 32px;
                }
                .login-logo-text {
                    font-size: 1.85rem;
                    font-weight: 700;
                    color: #1a1f36;
                    letter-spacing: -0.5px;
                }
                .login-logo-text span {
                    font-weight: 400;
                    color: #6b7280;
                }

                .login-heading {
                    text-align: center;
                    font-size: 1.6rem;
                    font-weight: 800;
                    margin: 0 0 6px;
                    color: #1a1f36;
                    letter-spacing: -0.3px;
                }
                .login-subheading {
                    text-align: center;
                    color: #6b7280;
                    font-size: 0.9rem;
                    margin: 0 0 32px;
                    font-weight: 400;
                }

                .login-error {
                    padding: 12px 16px;
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    color: #dc2626;
                    border-radius: 10px;
                    font-size: 0.85rem;
                    font-weight: 500;
                    text-align: center;
                    margin-bottom: 16px;
                    animation: shake 0.5s ease;
                }

                .login-input-group {
                    position: relative;
                    margin-bottom: 20px;
                }
                .login-input-icon {
                    position: absolute;
                    left: 0;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #9ca3af;
                    pointer-events: none;
                    transition: color 0.3s ease;
                    z-index: 2;
                }
                .login-input {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 14px 16px 14px 36px;
                    border-radius: 0;
                    border: none;
                    border-bottom: 2px solid #e5e7eb;
                    background: transparent;
                    color: #1a1f36;
                    font-size: 0.925rem;
                    font-family: inherit;
                    outline: none;
                    transition: all 0.3s ease;
                }
                .login-input::placeholder {
                    color: #9ca3af;
                }
                .login-input:focus {
                    border-bottom-color: #F98A05;
                    box-shadow: none;
                }
                .login-input:focus ~ .login-input-icon,
                .login-input-group:focus-within .login-input-icon {
                    color: #F98A05;
                }

                .login-eye-btn {
                    position: absolute;
                    right: 4px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #9ca3af;
                    padding: 6px;
                    border-radius: 8px;
                    transition: all 0.2s ease;
                    z-index: 2;
                    display: flex;
                    align-items: center;
                }
                .login-eye-btn:hover {
                    color: #F98A05;
                    background: rgba(249, 138, 5, 0.08);
                }

                .login-forgot-row {
                    text-align: right;
                    margin-bottom: 24px;
                    margin-top: -8px;
                }
                .login-forgot-link {
                    background: none;
                    border: none;
                    color: #F98A05;
                    font-size: 0.85rem;
                    font-weight: 600;
                    cursor: pointer;
                    padding: 0;
                    transition: color 0.2s ease;
                    font-family: inherit;
                }
                .login-forgot-link:hover {
                    color: #e67e00;
                    text-decoration: underline;
                }

                .login-submit-btn {
                    width: 100%;
                    padding: 14px 24px;
                    border: none;
                    border-radius: 10px;
                    background: linear-gradient(135deg, #F98A05, #ff6b00);
                    background-size: 200% auto;
                    color: #fff;
                    font-size: 1rem;
                    font-weight: 700;
                    font-family: inherit;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    letter-spacing: 0.3px;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 14px rgba(249, 138, 5, 0.3);
                    position: relative;
                    overflow: hidden;
                }
                .login-submit-btn::before {
                    display: none;
                }
                .login-submit-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 20px rgba(249, 138, 5, 0.4);
                    background-position: right center;
                }
                .login-submit-btn:active {
                    transform: translateY(0);
                }
                .login-submit-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none !important;
                    box-shadow: 0 2px 8px rgba(249, 138, 5, 0.15) !important;
                }

                .login-footer {
                    text-align: center;
                    color: #9ca3af;
                    margin-top: 28px;
                    font-size: 0.8rem;
                    letter-spacing: 0.2px;
                }

                /* ─── Secure Enterprise Access badge ─── */
                .login-badge {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    margin-top: 20px;
                    font-size: 0.72rem;
                    font-weight: 600;
                    letter-spacing: 1.5px;
                    text-transform: uppercase;
                    color: #F98A05;
                }
                .login-badge-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: #F98A05;
                }

                /* ─── Forgot Password Modal ─── */
                .forgot-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0, 0, 0, 0.35);
                    backdrop-filter: blur(4px);
                    padding: 16px;
                }
                .forgot-modal {
                    background: #ffffff;
                    border-radius: 16px;
                    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.08);
                    width: 100%;
                    max-width: 440px;
                    padding: 36px;
                    position: relative;
                    border: 1px solid #e8eaed;
                    animation: modal-enter 0.3s ease-out;
                }
                .forgot-close-btn {
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    background: #f3f4f6;
                    border: 1px solid #e5e7eb;
                    cursor: pointer;
                    color: #6b7280;
                    border-radius: 10px;
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }
                .forgot-close-btn:hover {
                    background: #e5e7eb;
                    color: #1f2937;
                }
                .forgot-header {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    margin-bottom: 10px;
                }
                .forgot-icon-circle {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    background: #fff7ed;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid #fed7aa;
                }
                .forgot-title {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #1a1f36;
                }
                .forgot-desc {
                    color: #6b7280;
                    font-size: 0.85rem;
                    margin: 6px 0 24px;
                    line-height: 1.5;
                }
                .forgot-error-box {
                    margin-bottom: 16px;
                    padding: 12px 14px;
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    color: #dc2626;
                    border-radius: 10px;
                    font-size: 0.85rem;
                    text-align: center;
                }
                .forgot-input {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 14px 16px 14px 44px;
                    border-radius: 10px;
                    border: 2px solid #e5e7eb;
                    background: #ffffff;
                    color: #1a1f36;
                    font-size: 0.875rem;
                    font-family: inherit;
                    outline: none;
                    transition: all 0.3s ease;
                }
                .forgot-input::placeholder {
                    color: #9ca3af;
                }
                .forgot-input:focus {
                    border-color: #F98A05;
                    box-shadow: 0 0 0 3px rgba(249, 138, 5, 0.1);
                }
                .forgot-submit-btn {
                    width: 100%;
                    padding: 14px;
                    background: linear-gradient(135deg, #F98A05, #ff6b00);
                    color: #fff;
                    border: none;
                    border-radius: 10px;
                    font-weight: 700;
                    font-size: 0.925rem;
                    font-family: inherit;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 14px rgba(249, 138, 5, 0.25);
                    margin-top: 12px;
                }
                .forgot-submit-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 20px rgba(249, 138, 5, 0.35);
                }
                .forgot-submit-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none !important;
                }
                .forgot-cancel-btn {
                    width: 100%;
                    padding: 10px;
                    background: none;
                    border: none;
                    color: #6b7280;
                    font-size: 0.85rem;
                    font-family: inherit;
                    cursor: pointer;
                    transition: color 0.2s ease;
                    margin-top: 4px;
                }
                .forgot-cancel-btn:hover {
                    color: #1f2937;
                }
                .forgot-success-wrap {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    padding: 16px 0;
                }
                .forgot-success-circle {
                    width: 68px;
                    height: 68px;
                    border-radius: 50%;
                    background: #dcfce7;
                    border: 1px solid #bbf7d0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 18px;
                }
                .forgot-success-title {
                    margin: 0 0 8px;
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #1a1f36;
                }
                .forgot-success-text {
                    color: #6b7280;
                    font-size: 0.85rem;
                    margin-bottom: 24px;
                    line-height: 1.6;
                }
                .forgot-done-btn {
                    padding: 12px 36px;
                    background: linear-gradient(135deg, #F98A05, #ff6b00);
                    color: #fff;
                    border: none;
                    border-radius: 10px;
                    font-weight: 700;
                    font-size: 0.875rem;
                    font-family: inherit;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 14px rgba(249, 138, 5, 0.25);
                }
                .forgot-done-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 20px rgba(249, 138, 5, 0.35);
                }
            `}</style>

            <div className="login-page">
                {/* Floating gradient orbs */}
                <div className="login-orb login-orb-1" />
                <div className="login-orb login-orb-2" />
                <div className="login-orb login-orb-3" />
                <div className="login-orb login-orb-4" />

                <div className="login-card-wrapper">
                    <div className="login-card">
                        {/* Logo */}
                        <div className="login-logo-row">
                            <img src="/logo.png" alt="AutomationEdge Logo" style={{ height: '44px', width: 'auto' }} />
                            <div className="login-logo-text">
                                Automation<span>Edge</span>
                            </div>
                        </div>

                        {/* Heading */}
                        <h2 className="login-heading">Welcome Back</h2>
                        <p className="login-subheading">Sign in to continue</p>

                        {/* Form */}
                        <form onSubmit={handleSubmit}>
                            {error && (
                                <div className="login-error">{error}</div>
                            )}

                            <div className="login-input-group">
                                <User className="login-input-icon" size={20} strokeWidth={2} />
                                <input
                                    type="text"
                                    placeholder="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="login-input"
                                    required
                                />
                            </div>

                            <div className="login-input-group">
                                <Lock className="login-input-icon" size={20} strokeWidth={2} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="login-input"
                                    style={{ paddingRight: '52px' }}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="login-eye-btn"
                                >
                                    {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                                </button>
                            </div>

                            <div className="login-forgot-row">
                                <button
                                    type="button"
                                    onClick={handleForgotOpen}
                                    className="login-forgot-link"
                                >
                                    Forgot password?
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="login-submit-btn"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={22} />
                                ) : (
                                    <>
                                        <LogIn size={20} strokeWidth={2.5} />
                                        <span>Sign In</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <p className="login-footer">
                        &copy; 2025 AutomationEdge. All rights reserved.
                    </p>
                </div>
            </div>

            {/* ────── Forgot Password Modal (Portal) ────── */}
            {showForgotModal && ReactDOM.createPortal(
                <div
                    className="forgot-overlay"
                    onClick={(e) => { if (e.target === e.currentTarget) handleForgotClose(); }}
                >
                    <div className="forgot-modal">
                        {/* Close button */}
                        <button onClick={handleForgotClose} className="forgot-close-btn">
                            <X size={18} />
                        </button>

                        {!forgotSuccess ? (
                            <>
                                <div className="forgot-header">
                                    <div className="forgot-icon-circle">
                                        <Mail size={20} color="#F98A05" />
                                    </div>
                                    <h3 className="forgot-title">Forgot Password</h3>
                                </div>
                                <p className="forgot-desc">
                                    Enter your registered email address or username and we'll send you a link to reset your password.
                                </p>

                                {forgotError && (
                                    <div className="forgot-error-box">{forgotError}</div>
                                )}

                                <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ position: 'relative' }}>
                                        <Mail style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} size={18} />
                                        <input
                                            type="email"
                                            placeholder="Enter your email address"
                                            value={forgotEmail}
                                            onChange={(e) => setForgotEmail(e.target.value)}
                                            className="forgot-input"
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={forgotLoading}
                                        className="forgot-submit-btn"
                                    >
                                        {forgotLoading ? <Loader2 className="animate-spin" size={20} /> : 'Send Reset Link'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleForgotClose}
                                        className="forgot-cancel-btn"
                                    >
                                        Cancel
                                    </button>
                                </form>
                            </>
                        ) : (
                            /* Success state */
                            <div className="forgot-success-wrap">
                                <div className="forgot-success-circle">
                                    <CheckCircle size={36} color="#22c55e" />
                                </div>
                                <h3 className="forgot-success-title">Check Your Inbox</h3>
                                <p className="forgot-success-text">
                                    We've sent a password reset link to <strong style={{ color: '#F98A05' }}>{forgotEmail}</strong>.
                                    Check your inbox (and spam folder) and click the link to set a new password.
                                </p>
                                <button onClick={handleForgotClose} className="forgot-done-btn">
                                    Done
                                </button>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Login;
