
import React, { useMemo, useState } from 'react';
import { X, Lock, Bug, Check, Heart, AlertTriangle, ImageOff, MicOff, ShieldAlert, WifiOff, Copy, ExternalLink, RefreshCw, Loader2, Globe } from 'lucide-react';

const USER_AKASHA_URL = "https://mirror-uploads.trakteer.id/images/content/eml73oyywavr4d9q/ct-htCT0FFlItjxvdHgYsBymFl63ZdxC9r11765727946.jpg";
const FALLBACK_AKASHA_URL = "https://img.freepik.com/premium-photo/anime-girl-looking-camera_950669-26.jpg"; 

interface DonationModalProps {
    errorLog: string | null;
    onClose: () => void;
}

const ErrorPortal: React.FC<{ url: string }> = ({ url }) => {
    const [refreshKey, setRefreshKey] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    return (
        <div className="mt-4 rounded-xl overflow-hidden border border-[#d3bc8e]/30 bg-black shadow-inner">
            <div className="flex items-center justify-between px-3 py-2 bg-[#13182b] border-b border-[#d3bc8e]/20">
                <span className="text-[10px] font-bold text-[#d3bc8e] uppercase tracking-widest flex items-center gap-2">
                    <Globe size={12} /> External Reference
                </span>
                <div className="flex gap-2">
                    <button onClick={() => { setIsLoading(true); setRefreshKey(p => p+1); }} className="text-gray-500 hover:text-white"><RefreshCw size={12}/></button>
                    <a href={url} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-white"><ExternalLink size={12}/></a>
                </div>
            </div>
            <div className="relative aspect-[3/4] w-full bg-white">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#0b0e14] z-10">
                        <Loader2 className="w-6 h-6 text-[#d3bc8e] animate-spin" />
                    </div>
                )}
                <iframe 
                    key={refreshKey}
                    src={url}
                    className="w-full h-full border-0"
                    onLoad={() => setIsLoading(false)}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
            </div>
        </div>
    );
};

const DonationModal: React.FC<DonationModalProps> = ({ errorLog, onClose }) => {
    const [copied, setCopied] = useState(false);

    // Extract URL if present in error log
    const errorUrl = useMemo(() => {
        if (!errorLog) return null;
        // Regex to find http/https URLs
        const match = errorLog.match(/(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/);
        return match ? match[0] : null;
    }, [errorLog]);

    const errorDetails = useMemo(() => {
        if (!errorLog) return null;
        
        const log = errorLog.toLowerCase();

        // 1. QUOTA / LIMIT (429)
        if (log.includes('429') || log.includes('quota') || log.includes('limit') || log.includes('exhausted') || log.includes('resource')) {
            return {
                icon: <Lock className="text-red-500 w-5 h-5" />,
                tag: "Energy Depleted",
                title: "Quota Exhausted",
                message: "Sistem mendeteksi kuota API Key nya sudah mencapai batas limit harian. Harap perbarui kunci atau tunggu reset."
            };
        }

        // 2. IMAGE GENERATION ERROR
        if (log.includes('image') || log.includes('visual') || log.includes('evolink') || log.includes('generateimage')) {
            return {
                icon: <ImageOff className="text-amber-500 w-5 h-5" />,
                tag: "Visual Glitch",
                title: "Projeksi Gagal",
                message: "Modul visualisasiku mengalami error. Mungkin server gambar sedang sibuk, prompt terlalu rumit, atau ada masalah koneksi."
            };
        }

        // 3. VOICE / TTS ERROR
        if (log.includes('voice') || log.includes('tts') || log.includes('audio') || log.includes('speech')) {
            return {
                icon: <MicOff className="text-blue-400 w-5 h-5" />,
                tag: "Audio Circuit Fail",
                title: "Suara Hilang",
                message: "Sirkuit sintesis suaraku terganggu. Aku tidak bisa bicara sekarang, tapi kita masih bisa mengobrol lewat teks."
            };
        }

        // 4. SAFETY / POLICY BLOCK
        if (log.includes('safety') || log.includes('harm') || log.includes('block') || log.includes('policy')) {
            return {
                icon: <ShieldAlert className="text-purple-500 w-5 h-5" />,
                tag: "Protocol Restriction",
                title: "Akses Ditolak",
                message: "Permintaanmu memicu filter keamanan sistem. Aku tidak bisa memproses konten tersebut."
            };
        }

        // 5. DEFAULT / NETWORK
        return {
            icon: <WifiOff className="text-gray-400 w-5 h-5" />,
            tag: "System Anomaly",
            title: "Gangguan Sinyal",
            message: "Koneksi ke Ley Lines (Server) terputus atau terjadi error internal. Coba periksa internetmu."
        };

    }, [errorLog]);

    if (!errorLog || !errorDetails) return null;

    const handleCopyLog = () => {
        if (errorLog) {
            navigator.clipboard.writeText(errorLog);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300 p-4">
            <div className="w-full max-w-lg bg-[#13182b] border border-[#d3bc8e]/40 rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh] relative overflow-hidden animate-in zoom-in-95">
                
                {/* Header Banner */}
                <div className="relative h-30 shrink-0 bg-black overflow-hidden border-b border-[#d3bc8e]/20">
                    <img 
                        src={USER_AKASHA_URL} 
                        onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_AKASHA_URL; }}
                        className="w-full h-full object-cover opacity-50"
                        alt="System"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#13182b] to-transparent"></div>
                    <div className="absolute bottom-3 left-5">
                        <h2 className="text-xl font-black text-[#d3bc8e] font-serif uppercase tracking-widest flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" /> System Alert
                        </h2>
                    </div>
                    <button onClick={onClose} className="absolute top-3 right-3 p-1.5 bg-black/60 text-gray-400 hover:text-white rounded-full transition-colors hover:bg-white/10">
                        <X size={16} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-5">
                    
                    {/* Message */}
                    <div className="flex gap-4">
                        <div className="shrink-0 p-3 bg-white/5 rounded-xl h-fit border border-white/5">
                            {errorDetails.icon}
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">{errorDetails.tag}</div>
                            <h3 className="text-lg font-bold text-white mb-2">{errorDetails.title}</h3>
                            <p className="text-xs text-gray-400 leading-relaxed italic">
                                "{errorDetails.message}"
                            </p>
                        </div>
                    </div>

                    {/* Raw Log */}
                    <div className="bg-black/60 rounded-xl border border-red-500/20 overflow-hidden">
                        <div className="px-3 py-2 bg-red-500/10 border-b border-red-500/10 flex justify-between items-center">
                            <span className="text-[9px] font-black text-red-300 uppercase tracking-widest flex items-center gap-2">
                                <Bug size={10} /> Exception Stack
                            </span>
                            <button onClick={handleCopyLog} className="flex items-center gap-1 text-[9px] font-bold text-gray-500 hover:text-white transition-colors">
                                {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                                {copied ? 'COPIED' : 'COPY LOG'}
                            </button>
                        </div>
                        <div className="p-3 max-h-32 overflow-y-auto custom-scrollbar">
                            <pre className="text-[9px] font-mono text-red-200/70 whitespace-pre-wrap break-all selection:bg-red-500/30">
                                {errorLog}
                            </pre>
                        </div>
                    </div>

                    {/* Integrated Web Portal for Links found in Error */}
                    {errorUrl && <ErrorPortal url={errorUrl} />}

                    {/* Action Footer */}
                    <div className="pt-2">
                        <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest text-center mb-3">Recharge Protocol</div>
                        <div className="grid grid-cols-2 gap-3">
                            <a href="https://trakteer.id/ryuuwangy" target="_blank" rel="noopener noreferrer" className="py-3 bg-[#d3bc8e] hover:bg-white text-black font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                                <Check size={14}/> <span>TRAKTEER API</span>
                            </a>
                            <a href="https://saweria.co/ryuuwangy" target="_blank" rel="noopener noreferrer" className="py-3 bg-[#1e2235] hover:bg-[#2a1e35] text-[#d3bc8e] border border-[#d3bc8e]/30 font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2">
                                <Heart size={14} className="text-red-400 fill-current"/> <span>SAWERIA</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DonationModal;
