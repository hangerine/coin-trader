import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", confirmStyle = "danger", loading = false }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-[#1E2329] rounded-2xl border border-[#2B3139] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 text-center">
                    <div className="w-12 h-12 bg-[#2B3139] rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="text-[#F0B90B]" size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-[#EAECEF] mb-2">{title}</h3>
                    <p className="text-slate-400 text-sm mb-6">{message}</p>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-[#2B3139] hover:bg-[#363C45] text-slate-300 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={loading}
                            className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2
                ${confirmStyle === 'danger'
                                    ? 'bg-red-500 hover:bg-red-600'
                                    : 'bg-emerald-500 hover:bg-emerald-600'
                                }`}
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ConfirmationModal;
