import React, { useState } from 'react';
import { api } from '../api';
import { Trash2, Plus } from 'lucide-react';

const KeyManager = ({ keys, onUpdate, showToast }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newKey, setNewKey] = useState({ name: '', access_key: '', secret_key: '' });

    const handleAdd = async () => {
        try {
            await api.addKey(newKey);
            setNewKey({ name: '', access_key: '', secret_key: '' });
            setIsAdding(false);
            onUpdate();
            showToast('API Key added successfully', 'success');
        } catch (error) {
            showToast('Failed to add key: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this key?')) return;
        try {
            await api.deleteKey(id);
            onUpdate();
            showToast('API Key deleted successfully', 'success');
        } catch (error) {
            showToast('Failed to delete key');
        }
    };

    return (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-200">API Keys</h2>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg transition-colors"
                >
                    <Plus size={16} />
                </button>
            </div>

            {isAdding && (
                <div className="mb-4 p-4 bg-slate-900/50 rounded-lg border border-slate-600 space-y-3">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Account Name</label>
                        <input
                            placeholder="e.g. Main Account"
                            className="w-full bg-slate-800 border-2 border-slate-600 focus:border-emerald-500 rounded p-2.5 text-sm text-white placeholder-slate-500 transition-colors"
                            value={newKey.name}
                            onChange={e => setNewKey({ ...newKey, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Access Key (API Key)</label>
                        <input
                            placeholder="Enter your Bithumb access key"
                            className="w-full bg-slate-800 border-2 border-slate-600 focus:border-emerald-500 rounded p-2.5 text-sm text-white placeholder-slate-500 transition-colors font-mono"
                            value={newKey.access_key}
                            onChange={e => setNewKey({ ...newKey, access_key: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Secret Key</label>
                        <input
                            type="password"
                            placeholder="Enter your Bithumb secret key"
                            className="w-full bg-slate-800 border-2 border-slate-600 focus:border-emerald-500 rounded p-2.5 text-sm text-white placeholder-slate-500 transition-colors font-mono"
                            value={newKey.secret_key}
                            onChange={e => setNewKey({ ...newKey, secret_key: e.target.value })}
                        />
                    </div>
                    <button
                        onClick={handleAdd}
                        disabled={!newKey.name || !newKey.access_key || !newKey.secret_key}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-2.5 rounded font-medium text-sm transition-colors"
                    >
                        Save API Key
                    </button>
                </div>
            )}

            <div className="space-y-2">
                {keys.map(k => (
                    <div key={k.id} className="flex justify-between items-center bg-slate-900 p-3 rounded border border-slate-800">
                        <div>
                            <p className="font-medium text-slate-200">{k.name}</p>
                            <p className="text-xs text-slate-500">{k.access_key_masked}</p>
                        </div>
                        <button
                            onClick={() => handleDelete(k.id)}
                            className="text-slate-500 hover:text-red-400 transition-colors"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
                {keys.length === 0 && (
                    <p className="text-center text-slate-500 text-sm py-4">No API keys added.</p>
                )}
            </div>
        </div>
    );
};

export default KeyManager;
