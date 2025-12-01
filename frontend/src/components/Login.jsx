import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api';
import { User, Lock, Mail, Phone, ArrowRight, Loader2, AlertCircle, X } from 'lucide-react';

const Login = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [view, setView] = useState('auth'); // auth, recoverId, recoverPwd

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Use ref to persist error message across re-renders
    const errorRef = useRef('');

    // Admin Secret Trigger
    const [clicks, setClicks] = useState([]);
    const [showAdminInfo, setShowAdminInfo] = useState(false);

    const handleCornerClick = (corner) => {
        const newClicks = [...clicks, corner];
        setClicks(newClicks);

        if (newClicks.length > 4) {
            setClicks(newClicks.slice(1));
        }

        const last4 = newClicks.slice(-4);
        const required = ['TL', 'TR', 'BL', 'BR'];

        if (last4.length === 4 && required.every(r => last4.includes(r))) {
            setShowAdminInfo(true);
            setClicks([]);
        }
    };

    const validatePassword = (pwd) => {
        if (pwd.length < 9) return "Password must be at least 9 characters";
        if (!/^[a-zA-Z]/.test(pwd)) return "Password must start with an alphabet";
        if (!/[a-z]/.test(pwd)) return "Password must contain a lowercase letter";
        if (!/[A-Z]/.test(pwd)) return "Password must contain an uppercase letter";
        if (!/\d/.test(pwd)) return "Password must contain a number";
        if (!/[!@#$%_-]/.test(pwd)) return "Password must contain a special char (!@#$%_-)";
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        // Clear previous error only when starting new submission
        errorRef.current = '';
        setError('');
        setSuccess('');

        try {
            if (view === 'auth') {
                if (isLogin) {
                    const res = await api.login(email, password);
                    const token = res.data.access_token;
                    localStorage.setItem('token', token);
                    // Only call onLogin on successful login
                    console.log('Login successful, calling onLogin');
                    onLogin(token);
                } else {
                    const pwdError = validatePassword(password);
                    if (pwdError) {
                        setError(pwdError);
                        setLoading(false);
                        return;
                    }
                    if (!phone) {
                        setError("Phone number is required");
                        setLoading(false);
                        return;
                    }
                    await api.signup(email, password, phone);
                    setSuccess('Account created! Please sign in.');
                    setIsLogin(true);
                    setPassword('');
                }
            } else if (view === 'recoverId') {
                const res = await api.recoverId(phone);
                setSuccess(`Your ID is: ${res.data.email}`);
            } else if (view === 'recoverPwd') {
                const pwdError = validatePassword(newPassword);
                if (pwdError) {
                    setError(pwdError);
                    setLoading(false);
                    return;
                }
                await api.recoverPassword(email, phone, newPassword);
                setSuccess('Password reset successfully! Please login.');
                setTimeout(() => {
                    setView('auth');
                    setIsLogin(true);
                    setPassword('');
                    setNewPassword('');
                }, 2000);
            }
        } catch (err) {
            console.error('Login error:', err);
            const errorMessage = err.response?.data?.detail || err.message || 'An error occurred';
            console.log('Setting error message:', errorMessage);
            
            // Store in both state and ref to ensure persistence
            errorRef.current = errorMessage;
            setError(errorMessage);
            setLoading(false);
            
            // Ensure error stays visible - log for debugging
            setTimeout(() => {
                if (errorRef.current && !error) {
                    console.warn('Error was cleared unexpectedly, restoring it');
                    setError(errorRef.current);
                }
            }, 100);
        }
    };

    const toggleView = (v) => {
        setView(v);
        // Don't clear error when switching views - let user see it
        // Keep error in ref as well
        setSuccess('');
        setPhone('');
        setNewPassword('');
    };
    
    // Effect to ensure error persists
    useEffect(() => {
        if (error && !errorRef.current) {
            errorRef.current = error;
        }
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B0E11] relative overflow-hidden">
            {/* Secret Triggers */}
            <div className="absolute top-0 left-0 w-20 h-20 z-50 cursor-default" onClick={() => handleCornerClick('TL')} />
            <div className="absolute top-0 right-0 w-20 h-20 z-50 cursor-default" onClick={() => handleCornerClick('TR')} />
            <div className="absolute bottom-0 left-0 w-20 h-20 z-50 cursor-default" onClick={() => handleCornerClick('BL')} />
            <div className="absolute bottom-0 right-0 w-20 h-20 z-50 cursor-default" onClick={() => handleCornerClick('BR')} />

            {/* Admin Info Popup */}
            {showAdminInfo && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
                    <div className="bg-[#1E2329] p-6 rounded-xl border border-[#F0B90B] text-center">
                        <h3 className="text-[#F0B90B] font-bold mb-4">Default Admin Credentials</h3>
                        <p className="text-slate-300 mb-2">Email: admin@example.com</p>
                        <p className="text-slate-300 mb-4">Password: admin123</p>
                        <button
                            onClick={() => setShowAdminInfo(false)}
                            className="bg-[#2B3139] px-4 py-2 rounded text-white hover:bg-[#363C45]"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            <div className="w-full max-w-md p-8 bg-[#1E2329] rounded-2xl border border-[#2B3139] shadow-2xl relative z-10">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                        Bithumb Trader
                    </h1>
                    <p className="text-slate-400">
                        {view === 'auth' ? (isLogin ? 'Welcome back' : 'Create your account') :
                            view === 'recoverId' ? 'Find ID' : 'Reset Password'}
                    </p>
                </div>

                {(error || errorRef.current) && (
                    <div 
                        className="mb-6 p-4 bg-red-500/20 border-2 border-red-500/40 rounded-lg flex items-start gap-3 text-red-300 text-sm shadow-lg shadow-red-500/10"
                        role="alert"
                        aria-live="assertive"
                    >
                        <AlertCircle size={18} className="flex-shrink-0 mt-0.5 animate-pulse" />
                        <div className="flex-1">
                            <p className="font-medium">{error || errorRef.current}</p>
                        </div>
                        <button
                            onClick={() => {
                                errorRef.current = '';
                                setError('');
                            }}
                            className="flex-shrink-0 text-red-400 hover:text-red-300 transition-colors p-1 hover:bg-red-500/20 rounded"
                            aria-label="Close error message"
                            title="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm text-center">
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email Field - Used in Auth and RecoverPwd */}
                    {(view === 'auth' || view === 'recoverPwd') && (
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                            <input
                                type="email"
                                placeholder="Email Address"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    // Don't clear error on input change - let user read it
                                }}
                                className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-lg py-3 pl-10 pr-4 text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                                required
                            />
                        </div>
                    )}

                    {/* Phone Field - Used in Signup, RecoverId, RecoverPwd */}
                    {((view === 'auth' && !isLogin) || view !== 'auth') && (
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                            <input
                                type="tel"
                                placeholder="Phone Number"
                                value={phone}
                                onChange={(e) => {
                                    setPhone(e.target.value);
                                    // Don't clear error on input change - let user read it
                                }}
                                className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-lg py-3 pl-10 pr-4 text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                                required
                            />
                        </div>
                    )}

                    {/* Password Field - Used in Auth (Login/Signup) */}
                    {view === 'auth' && (
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    // Don't clear error on input change - let user read it
                                }}
                                className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-lg py-3 pl-10 pr-4 text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                                required
                            />
                        </div>
                    )}

                    {/* New Password Field - Used in RecoverPwd */}
                    {view === 'recoverPwd' && (
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                            <input
                                type="password"
                                placeholder="New Password"
                                value={newPassword}
                                onChange={(e) => {
                                    setNewPassword(e.target.value);
                                    // Don't clear error on input change - let user read it
                                }}
                                className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-lg py-3 pl-10 pr-4 text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                                required
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-6"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : (
                            <>
                                {view === 'auth' ? (isLogin ? 'Sign In' : 'Create Account') :
                                    view === 'recoverId' ? 'Find ID' : 'Reset Password'}
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center space-y-2">
                    {view === 'auth' ? (
                        <>
                            <p className="text-slate-400 text-sm">
                                {isLogin ? "Don't have an account? " : "Already have an account? "}
                                <button
                                    onClick={() => { 
                                        setIsLogin(!isLogin); 
                                        // Don't clear error - let user see it if login failed
                                        setSuccess(''); 
                                    }}
                                    className="text-emerald-400 hover:text-emerald-300 font-medium"
                                >
                                    {isLogin ? 'Sign Up' : 'Sign In'}
                                </button>
                            </p>
                            {isLogin && (
                                <div className="text-xs text-slate-500 flex justify-center gap-4 mt-2">
                                    <button onClick={() => toggleView('recoverId')} className="hover:text-emerald-400">Forgot ID?</button>
                                    <span>|</span>
                                    <button onClick={() => toggleView('recoverPwd')} className="hover:text-emerald-400">Forgot Password?</button>
                                </div>
                            )}
                        </>
                    ) : (
                        <button
                            onClick={() => toggleView('auth')}
                            className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
                        >
                            Back to Login
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
