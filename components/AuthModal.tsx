import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, 
  ShieldCheck, 
  Cloud, 
  AlertTriangle, 
  Sparkles, 
  Loader2 
} from 'lucide-react';
import { supabase } from './supabaseClient'; // Sesuaikan path-nya

interface AuthModalProps {
  onGuest: () => void;
  isOpen: boolean;
}

const AuthModal: React.FC<AuthModalProps> = ({ onGuest, isOpen }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Logic buat nangkep error dari Supabase
  const normalizeErrorMessage = (err: any): string => {
    if (!err) return 'Unknown authentication error.';
    const msg = (err.message || err.msg || JSON.stringify(err)).toLowerCase();
    if (msg.includes('provider is not enabled')) return 'Google Login belum aktif di Dashboard Supabase.';
    if (msg.includes('redirect_uri_mismatch')) return 'URL Callback (localhost:5173) salah di Google Console.';
    return msg;
  };

  // 2. Handle Google Login
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin, // Otomatis nyesuain localhost/production
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });
      
      if (error) throw error;
    } catch (e: any) {
      setError(normalizeErrorMessage(e));
      setIsLoading(false); // Balikin loading ke false cuma kalau error
    }
  };

  // 3. Accessibility: Tutup pake Escape (opsional)
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        // Logika tutup modal lo di sini
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, isLoading]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-[#0b0e14]/90 backdrop-blur-xl animate-in fade-in duration-500">
      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-[#13182b] border-2 border-[#d3bc8e] rounded-[2rem] overflow-hidden shadow-[0_0_80px_rgba(211,188,142,0.3)] max-h-[90vh] overflow-y-auto">
        
        {/* Header Visual */}
        <div className="h-32 bg-gradient-to-b from-[#1e2330] to-[#13182b] relative flex items-center justify-center border-b border-[#d3bc8e]/20">
          <div className={`w-20 h-20 rounded-full border-2 border-[#d3bc8e] bg-[#0b0e14] flex items-center justify-center shadow-[0_0_20px_rgba(211,188,142,0.5)] z-10 ${isLoading ? 'animate-spin' : 'animate-pulse'}`}>
            <Cloud className="w-10 h-10 text-[#d3bc8e]" />
          </div>
          {/* Background Decor */}
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
        </div>

        <div className="p-8 text-center">
          <h2 className="text-2xl font-serif font-bold text-[#ece5d8] mb-2 flex items-center justify-center gap-2">
            Akasha Access <Sparkles className="w-4 h-4 text-amber-500" />
          </h2>
          <p className="text-gray-400 text-[11px] mb-6 leading-relaxed px-4 tracking-wide">
            Connect your celestial identity to sync fragments across all devices.
          </p>

          {/* Error Box */}
          {error && (
            <div className="mb-6 p-4 bg-red-950/40 border border-red-500/50 rounded-xl text-left animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 text-red-400 font-bold text-[10px] uppercase mb-1">
                <AlertTriangle className="w-3 h-3" /> Resonance Failure
              </div>
              <p className="text-[11px] text-red-200 font-mono leading-tight">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Main Action: Google */}
            <button 
              onClick={handleGoogleLogin} 
              disabled={isLoading}
              className="group relative w-full py-4 bg-white hover:bg-[#ece5d8] text-black font-black uppercase text-[10px] tracking-[0.2em] rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4 group-hover:rotate-12 transition-transform" alt="G" />
              )}
              <span>{isLoading ? 'Synchronizing...' : 'Manifest with Google'}</span>
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/5" />
              </div>
              <div className="relative flex justify-center text-[9px] uppercase tracking-[0.3em] font-medium">
                <span className="bg-[#13182b] px-3 text-gray-500">Local Protocol</span>
              </div>
            </div>

            {/* Guest Action */}
            <button 
              onClick={onGuest} 
              disabled={isLoading}
              className="w-full py-4 bg-[#1e2330]/50 border border-[#d3bc8e]/10 text-gray-400 hover:text-[#d3bc8e] hover:border-[#d3bc8e]/40 font-bold rounded-xl flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-30"
            >
              <User className="w-4 h-4" /> <span>Incognito Mode</span>
            </button>
          </div>

          {/* Footer Info */}
          <div className="mt-8 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-[9px] text-green-500/70 uppercase tracking-widest font-bold">
              <ShieldCheck className="w-3 h-3" /> Encryption Active
            </div>
            <p className="text-[9px] text-gray-600 italic">
              "Even stars have laws to follow."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
