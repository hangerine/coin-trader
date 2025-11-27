import React from 'react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, type = 'info' }) => {
    if (!isOpen) return null;

    const isBuy = type === 'bid';
    const confirmButtonColor = isBuy 
        ? 'bg-red-500 hover:bg-red-600' 
        : 'bg-blue-500 hover:bg-blue-600';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 transform scale-100 animate-in zoom-in-95 duration-200">
                <h3 className="text-lg font-bold text-slate-100 mb-4">
                    {title}
                </h3>
                
                <div className="text-slate-300 mb-8 whitespace-pre-line leading-relaxed">
                    {message}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 px-4 rounded-lg font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-white transition-colors ${confirmButtonColor}`}
                    >
                        확인
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;

