
import React, { useState } from 'react';
import { Lock, ShieldAlert, ChevronRight, X, Loader2, CheckCircle2 } from 'lucide-react';
import { verifyAdminPassword } from '../services/securityService';

interface AdminLoginModalProps {
    onSuccess: () => void;
    onClose: () => void;
}

const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ onSuccess, onClose }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAuthenticating(true);
        setError(false);

        // Simulate small delay for "Resonance" feel
        await new Promise(r => setTimeout(r, 800));

        if (verifyAdminPassword(password)) {
            setIsSuccess(true);
            await new Promise(r => setTimeout(r, 500));
            onSuccess();
        } else {
            setError(true);
            setIsAuthenticating(false);
            setPassword('');
        }
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in zoom-in-95 p-4">
            <div className="w-full max-w-sm bg-[#0b0e14] border-2 border-red-900/50 rounded-2xl shadow-[0_0_50px_rgba(153,27,27,0.3)] overflow-hidden">
                <div className="bg-red-900/10 p-6 border-b border-red-900/30 flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-red-500 flex items-center gap-2 font-mono uppercase tracking-widest">
                            <ShieldAlert className="w-5 h-5" /> Restricted
                        </h2>
                        <p className="text-[10px] text-red-400 mt-1 uppercase tracking-tighter">Akasha Root Access Protocol</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Admin Passphrase</label>
                        <div className="relative">
                            <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${error ? 'text-red-500' : isSuccess ? 'text-green-500' : 'text-gray-500'}`} />
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                                disabled={isAuthenticating || isSuccess}
                                className={`w-full bg-black border ${error ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : isSuccess ? 'border-green-500' : 'border-white/10'} rounded-lg py-3 pl-10 pr-4 text-white focus:border-red-500 focus:outline-none font-mono text-sm transition-all`}
                                placeholder="Enter system code..."
                                autoFocus
                            />
                        </div>
                        {error && <p className="text-[10px] text-red-500 font-black uppercase animate-pulse tracking-widest">Access Denied: Invalid Credentials</p>}
                        {isSuccess && <p className="text-[10px] text-green-500 font-black uppercase tracking-widest flex items-center gap-2"><CheckCircle2 className="w-3 h-3" /> Resonance Established</p>}
                    </div>

                    <button 
                        type="submit" 
                        disabled={isAuthenticating || isSuccess || !password}
                        className={`w-full py-3 ${isSuccess ? 'bg-green-600 text-white' : 'bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 text-red-400 hover:text-white'} font-bold rounded-lg transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50`}
                    >
                        {isAuthenticating ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Calibrating...</>
                        ) : isSuccess ? (
                            'Opening Terminal'
                        ) : (
                            <>{'Authenticate'} <ChevronRight className="w-4 h-4" /></>
                        )}
                    </button>
                </form>
                
                <div className="bg-black p-3 text-center border-t border-white/5">
                    <p className="text-[9px] text-gray-600 font-mono uppercase tracking-tighter italic">
                        "Only those who know the truth may pass the gate of Irminsul."
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminLoginModal;
