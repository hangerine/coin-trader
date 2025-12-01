import React, { useState } from 'react';
import { api } from '../api';
import { Phone, Loader2 } from 'lucide-react';

function PhoneSetupModal({ isOpen, onComplete }) {
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await api.updatePhone(phone);
            onComplete(phone);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to update phone number');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-[#1E2329] rounded-2xl border border-[#2B3139] w-full max-w-sm shadow-2xl overflow-hidden">
                <div className="p-6">
                    <div className="w-12 h-12 bg-[#2B3139] rounded-full flex items-center justify-center mx-auto mb-4">
                        <Phone className="text-[#F0B90B]" size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-[#EAECEF] mb-2 text-center">Additional Security Required</h3>
                    <p className="text-slate-400 text-sm mb-6 text-center">
                        To improve account security and enable recovery, please register your phone number.
                    </p>

                    {error && (
                        <div className="mb-4 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="tel"
                                placeholder="Phone Number"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full bg-[#0B0E11] border border-[#2B3139] rounded-lg py-2 pl-10 pr-4 text-slate-100 focus:outline-none focus:border-emerald-500"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Save & Continue'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default PhoneSetupModal;
