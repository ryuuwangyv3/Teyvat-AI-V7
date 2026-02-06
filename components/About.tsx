import React, { useEffect, useState, useCallback } from 'react';
import { 
    Info, Terminal, Heart, Coffee, Crown, ExternalLink, Globe, 
    RefreshCw, X, Loader2, ShieldCheck, Zap, Server, ShieldAlert, 
    Network, ArrowRight, Boxes
} from 'lucide-react';
import { fetchTopDonators } from '../services/supabaseService';
import { Donator } from '../types';
import LazyImage from './LazyImage';
import AdminLoginModal from './AdminLoginModal';

interface AboutProps {
    onSwitchToAdmin?: () => void;
}

const PROXY_NODES = [
    { id: 'alpha', name: 'Node Alpha (Cloud)', construct: (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}` },
    { id: 'beta', name: 'Node Beta (Fast)', construct: (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}` },
    { id: 'gamma', name: 'Node Gamma (All)', construct: (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
    { id: 'delta', name: 'Node Delta (Safe)', construct: (url: string) => `https://thingproxy.freeboard.io/fetch/${url}` }
];

const About: React.FC<AboutProps> = ({ onSwitchToAdmin }) => {
    const [donators, setDonators] = useState<Donator[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdminLogin, setShowAdminLogin] = useState(false);
    
    // Portal & Proxy State
    const [activePortal, setActivePortal] = useState<string | null>(null);
    const [portalTitle, setPortalTitle] = useState('');
    const [isPortalLoading, setIsPortalLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [useProxy, setUseProxy] = useState(false);
    const [proxyIndex, setProxyIndex] = useState(0);

    useEffect(() => {
        fetchTopDonators().then(data => {
            setDonators(data || []);
            setLoading(false);
        });
    }, []);

    const openPortal = (url: string, title: string) => {
        setActivePortal(url);
        setPortalTitle(title);
        setRefreshKey(0);
        setIsPortalLoading(true);
        // Default: Start without proxy for direct payment support
        setUseProxy(false);
    };

    const toggleProxy = useCallback(() => {
        setIsPortalLoading(true);
        setUseProxy(prev => !prev);
        setRefreshKey(k => k + 1);
    }, []);

    const cycleProxy = useCallback(() => {
        setIsPortalLoading(true);
        setProxyIndex(prev => (prev + 1) % PROXY_NODES.length);
        setRefreshKey(k => k + 1);
    }, []);

    const getFinalUrl = () => {
        if (!activePortal) return '';
        return useProxy ? PROXY_NODES[proxyIndex].construct(activePortal) : activePortal;
    };

    const isRestricted = activePortal && (activePortal.includes('saweria.co') || activePortal.includes('trakteer.id')) && !useProxy;

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 lg:p-10 flex flex-col items-center bg-[#0b0e14] relative">
            {showAdminLogin && (
                <AdminLoginModal 
                    onClose={() => setShowAdminLogin(false)}
                    onSuccess={() => { setShowAdminLogin(false); onSwitchToAdmin?.(); }}
                />
            )}

            {/* --- WEB PORTAL OVERLAY --- */}
            {activePortal && (
                <div className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-500">
                    <div className="w-full max-w-5xl h-[90vh] bg-[#0b0e14] border border-[#d3bc8e]/20 rounded-3xl overflow-hidden flex flex-col shadow-[0_0_100px_rgba(0,0,0,1)] relative animate-in zoom-in-95">
                        
                        {/* Portal Header */}
                        <div className="h-16 bg-[#13182b] border-b border-[#d3bc8e]/10 flex items-center justify-between px-6 shrink-0 z-30">
                            <div className="flex items-center gap-4">
                                <div className="hidden sm:flex p-2 rounded-xl bg-[#d3bc8e]/10 border border-[#d3bc8e]/20 text-[#d3bc8e]">
                                    <Globe size={18} />
                                </div>
                                <div>
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#d3bc8e] leading-none mb-1">
                                        {portalTitle}
                                    </h3>
                                    <p className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">
                                        {useProxy ? `Linked via ${PROXY_NODES[proxyIndex].name}` : 'Direct Neural Link'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 lg:gap-3">
                                {useProxy ? (
                                    <button onClick={cycleProxy} className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-bold uppercase hover:bg-blue-500/20 transition-all">
                                        <RefreshCw size={12} className={isPortalLoading ? 'animate-spin' : ''} /> Switch Node
                                    </button>
                                ) : (
                                    <button onClick={toggleProxy} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 text-gray-400 border border-white/10 rounded-lg text-[10px] font-bold uppercase hover:text-white transition-all">
                                        <ShieldAlert size={12} /> Engage Proxy
                                    </button>
                                )}
                                <div className="w-px h-6 bg-white/10 mx-1"></div>
                                <button onClick={() => setActivePortal(null)} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Portal Space */}
                        <div className="flex-1 relative bg-white">
                            {isRestricted ? (
                                <div className="absolute inset-0 z-50 bg-[#0b0e14] flex flex-col items-center justify-center p-8 text-center">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(211,188,142,0.05)_0%,transparent_70%)]"></div>
                                    <div className="relative z-10 p-10 rounded-[2.5rem] border border-[#d3bc8e]/20 bg-[#13182b]/80 backdrop-blur-xl max-w-md animate-in zoom-in-95">
                                        <div className="w-20 h-20 bg-[#d3bc8e]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#d3bc8e]/30 shadow-[0_0_40px_rgba(211,188,142,0.2)]">
                                            {activePortal.includes('saweria') ? <Heart className="text-[#d3bc8e] animate-pulse" size={40} /> : <Coffee className="text-red-400 animate-bounce" size={40} />}
                                        </div>
                                        <h4 className="text-xl font-black text-[#d3bc8e] uppercase tracking-[0.2em] mb-4">Connection Blocked</h4>
                                        <p className="text-xs text-gray-400 italic mb-8 leading-relaxed">"The provider has restricted direct embedding. Would you like to bypass using the Akasha Proxy Node?"</p>
                                        <div className="flex flex-col gap-3">
                                            <button onClick={toggleProxy} className="genshin-button w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-xs tracking-widest hover:scale-105 transition-transform">
                                                <Zap size={16} /> Engage Node Alpha
                                            </button>
                                            <a href={activePortal} target="_blank" rel="noreferrer" className="w-full py-4 bg-white/5 border border-white/10 text-gray-400 rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all">
                                                <ExternalLink size={16} /> Open External
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {isPortalLoading && (
                                        <div className="absolute inset-0 z-10 bg-[#0b0e14] flex flex-col items-center justify-center">
                                            <div className="w-12 h-12 border-4 border-[#d3bc8e]/20 border-t-[#d3bc8e] rounded-full animate-spin mb-4"></div>
                                            <span className="text-[10px] font-black text-[#d3bc8e] uppercase tracking-[0.3em] animate-pulse">Syncing Realm Signal...</span>
                                        </div>
                                    )}
                                    <iframe 
                                        key={`${refreshKey}-${useProxy}`}
                                        src={getFinalUrl()} 
                                        className="w-full h-full border-0 bg-white"
                                        onLoad={() => setIsPortalLoading(false)}
                                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                                    />
                                </>
                            )}
                        </div>

                        {/* Portal Status Bar */}
                        <div className="h-10 bg-[#0b0e14] border-t border-white/5 flex items-center px-6 gap-4">
                            <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${useProxy ? 'bg-blue-500' : 'bg-green-500'} animate-pulse`}></div>
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">
                                    Status: {useProxy ? 'Proxy Tunnel Active' : 'Direct Link Stable'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MAIN PAGE CONTENT --- */}
            <div className="max-w-4xl w-full">
                {/* Header Section */}
                <div className="text-center mb-12 relative pt-10">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#d3bc8e]/10 blur-[100px] rounded-full -z-10"></div>
                    <div className="w-20 h-20 mx-auto mb-6 relative">
                        <Terminal size={80} className="text-[#d3bc8e] opacity-20 absolute inset-0 rotate-12" />
                        <Boxes size={48} className="text-[#d3bc8e] relative z-10 mx-auto mt-4 drop-shadow-[0_0_15px_rgba(211,188,142,0.5)]" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black genshin-gold font-serif tracking-[0.2em] mb-3">AKASHA V2</h1>
                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-[0.5em]">Teyvat Neural Network Interface</p>
                </div>

                {/* Description Panel */}
                <div className="relative group mb-12">
                    <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-[#d3bc8e]/20 to-transparent rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                    <div className="relative bg-[#13182b]/60 border border-[#d3bc8e]/10 p-8 rounded-[2rem] backdrop-blur-md text-center">
                        <p className="text-gray-300 italic font-serif text-sm md:text-base leading-relaxed">
                            "Establishing a bridge between realms. This terminal serves as a conduit for those who wish to support the 
                            continued evolution of the Akasha System and its resonance with the Traveler's soul."
                        </p>
                    </div>
                </div>

                {/* Donation Nodes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
                    <button 
                        onClick={() => openPortal("https://saweria.co/ryuuwangy", "Saweria Portal")}
                        className="group relative p-8 bg-[#13182b] border border-[#d3bc8e]/10 rounded-3xl transition-all hover:scale-[1.02] hover:border-[#d3bc8e]/40 text-center overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Heart size={80} className="fill-[#d3bc8e]" />
                        </div>
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-[#d3bc8e]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#d3bc8e]/20 group-hover:bg-[#d3bc8e] transition-all">
                                <Heart className="text-[#d3bc8e] group-hover:text-black transition-colors" size={28} />
                            </div>
                            <h3 className="text-lg font-black text-[#d3bc8e] uppercase tracking-widest mb-1">Saweria</h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase mb-6">Local Gateway (IDN)</p>
                            <div className="flex items-center justify-center gap-2 text-[10px] font-black text-black bg-[#d3bc8e] py-3 rounded-xl uppercase tracking-[0.2em] group-hover:bg-white transition-all">
                                Initiate Ritual <ArrowRight size={14} />
                            </div>
                        </div>
                    </button>

                    <button 
                        onClick={() => openPortal("https://trakteer.id/ryuuwangy", "Trakteer Portal")}
                        className="group relative p-8 bg-[#13182b] border border-[#d3bc8e]/10 rounded-3xl transition-all hover:scale-[1.02] hover:border-red-500/40 text-center overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Coffee size={80} className="fill-red-500" />
                        </div>
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20 group-hover:bg-red-500 transition-all">
                                <Coffee className="text-red-500 group-hover:text-white transition-colors" size={28} />
                            </div>
                            <h3 className="text-lg font-black text-red-500 uppercase tracking-widest mb-1">Trakteer</h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase mb-6">Supporter Hub</p>
                            <div className="flex items-center justify-center gap-2 text-[10px] font-black text-red-400 bg-red-500/10 border border-red-500/30 py-3 rounded-xl uppercase tracking-[0.2em] group-hover:bg-red-500 group-hover:text-white transition-all">
                                Send Primogems <Heart size={14} />
                            </div>
                        </div>
                    </button>
                </div>

                {/* Hall of Fame (Resonance) */}
                <div className="mb-20">
                    <div className="flex items-center gap-4 mb-8 justify-center">
                        <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#d3bc8e]/50"></div>
                        <h2 className="text-lg font-black text-[#d3bc8e] font-serif uppercase tracking-[0.3em] flex items-center gap-3">
                            <Crown size={20} /> Hall of Resonance
                        </h2>
                        <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#d3bc8e]/50"></div>
                    </div>

                    <div className="bg-black/40 border border-[#d3bc8e]/10 rounded-[2.5rem] p-6 max-h-[450px] overflow-y-auto custom-scrollbar space-y-4">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="animate-spin text-gray-600" size={32} />
                                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Querying Teyvat Archive...</span>
                            </div>
                        ) : donators.length === 0 ? (
                            <div className="text-center py-20 opacity-20">
                                <Info size={40} className="mx-auto mb-4" />
                                <p className="text-xs italic">No resonance recorded yet.</p>
                            </div>
                        ) : (
                            donators.map((d, i) => (
                                <div key={i} className="flex items-center gap-5 p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-[#d3bc8e]/5 hover:border-[#d3bc8e]/20 transition-all group">
                                    <div className="relative">
                                        <LazyImage src={d.avatar || `https://ui-avatars.com/api/?name=${d.name}`} className="w-12 h-12 rounded-full border-2 border-[#d3bc8e]/20 group-hover:border-[#d3bc8e] transition-all object-cover" alt="" />
                                        {i < 3 && <div className="absolute -top-1 -right-1 bg-[#d3bc8e] text-black rounded-full p-1"><Crown size={8} /></div>}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-black text-sm text-gray-200 group-hover:text-[#d3bc8e] transition-colors">{d.name}</h4>
                                            <span className="text-[10px] font-black text-[#d3bc8e] bg-[#d3bc8e]/10 px-2 py-1 rounded-lg border border-[#d3bc8e]/20">{d.amount}</span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 italic mt-1 line-clamp-2">"{d.message}"</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Footer Section */}
                <div className="text-center pb-16 flex flex-col items-center gap-6">
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-[#d3bc8e]/20 to-transparent"></div>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em]">Powered by Irminsul Neural Link</span>
                        <button 
                            onClick={() => setShowAdminLogin(true)} 
                            className="p-2 text-red-900/40 hover:text-red-500 transition-all hover:scale-125"
                        >
                            <Heart size={14} className="fill-current" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default About;
