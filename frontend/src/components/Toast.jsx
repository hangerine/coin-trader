import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

const Toast = ({ message, type = 'error', onClose, duration = 5000 }) => {
    useEffect(() => {
        if (duration) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const bgColor = type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-red-500/10 border-red-500/50';
    const textColor = type === 'success' ? 'text-emerald-500' : 'text-red-500';
    const Icon = type === 'success' ? CheckCircle : AlertCircle;

    return (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-md shadow-xl transition-all animate-in slide-in-from-top-2 ${bgColor}`}>
            <Icon size={20} className={textColor} />
            <p className={`text-sm font-medium ${textColor}`}>{message}</p>
            <button
                onClick={onClose}
                className={`p-1 rounded-full hover:bg-white/10 transition-colors ${textColor}`}
            >
                <X size={16} />
            </button>
        </div>
    );
};

export default Toast;
