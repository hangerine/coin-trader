import React, { useState } from 'react';
import { api } from '../api';
import { X, Lock, Trash2, AlertTriangle, Loader2 } from 'lucide-react';

function SettingsModal({ onClose, onLogout }) {
    const [activeTab, setActiveTab] = useState('password');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Password Change State
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Delete Account State
    const [deletePassword, setDeletePassword] = useState('');

    const validatePassword = (pwd) => {
        if (pwd.length < 9) return "Password must be at least 9 characters";
        if (!/^[a-zA-Z]/.test(pwd)) return "Password must start with an alphabet";
        if (!/[a-z]/.test(pwd)) return "Password must contain a lowercase letter";
        if (!/[A-Z]/.test(pwd)) return "Password must contain an uppercase letter";
        if (!/\d/.test(pwd)) return "Password must contain a number";
        if (!/[!@#$%_-]/.test(pwd)) return "Password must contain a special char (!@#$%_-)";
        return null;
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setMessage({ text: "New passwords don't match", type: 'error' });
            return;
        }

        const pwdError = validatePassword(newPassword);
        if (pwdError) {
            setMessage({ text: pwdError, type: 'error' });
            return;
        }

        setLoading(true);
        setMessage({ text: '', type: '' });
        try {
            await api.changePassword(oldPassword, newPassword);
            setMessage({ text: 'Password updated successfully', type: 'success' });
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setMessage({ text: err.response?.data?.detail || 'Failed to update password', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async (e) => {
        e.preventDefault();
        if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
            return;
        }
        setLoading(true);
        setMessage({ text: '', type: '' });
        try {
            await api.deleteUser(deletePassword);
            onLogout(); // Log out after deletion
        } catch (err) {
            setMessage({ text: err.response?.data?.detail || 'Failed to delete account', type: 'error' });
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1E2329] rounded-2xl border border-[#2B3139] w-full max-w-md shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-[#2B3139]">
                    <h2 className="text-lg font-bold text-slate-100">Settings</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-100">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex border-b border-[#2B3139]">
                    <button
                        onClick={() => { setActiveTab('password'); setMessage({ text: '', type: '' }); }}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'password' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Change Password
                    </button>
                    <button
                        onClick={() => { setActiveTab('delete'); setMessage({ text: '', type: '' }); }}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'delete' ? 'text-red-400 border-b-2 border-red-400' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Delete Account
                    </button>
                </div>

                <div className="p-6">
                    {message.text && (
                        <div className={`mb-4 px-4 py-3 rounded-lg text-sm text-center ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                            {message.text}
                        </div>
                    )}

                    {activeTab === 'password' ? (
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs text-slate-400">Current Password</label>
                                <input
                                    type="password"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    className="w-full bg-[#2B3139] border border-slate-700 rounded-lg py-2 px-3 text-slate-100 focus:outline-none focus:border-emerald-500"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-slate-400">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-[#2B3139] border border-slate-700 rounded-lg py-2 px-3 text-slate-100 focus:outline-none focus:border-emerald-500"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-slate-400">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-[#2B3139] border border-slate-700 rounded-lg py-2 px-3 text-slate-100 focus:outline-none focus:border-emerald-500"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Update Password'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleDeleteAccount} className="space-y-6">
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex gap-3 items-start">
                                <AlertTriangle className="text-red-400 shrink-0" size={20} />
                                <p className="text-xs text-red-300">
                                    Warning: This action will permanently delete your account and all associated API keys. This cannot be undone.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-slate-400">Confirm Password</label>
                                <input
                                    type="password"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    className="w-full bg-[#2B3139] border border-slate-700 rounded-lg py-2 px-3 text-slate-100 focus:outline-none focus:border-red-500"
                                    placeholder="Enter password to confirm"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Delete Account'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SettingsModal;
