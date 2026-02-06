
import React, { useState, useMemo, useEffect } from 'react';
import { Loader2, RefreshCcw, ShieldCheck, Globe, Maximize2, ChevronDown, Sparkles, Zap, Key, Copy, Check, Info, X, Eye, EyeOff, Film } from 'lucide-react';

const REALMS = [
  {
    id: 'vision',
    name: 'Vision AI Realm',
    subtitle: 'External Neural Network v2.4',
    url: 'https://superheroghost.github.io/VisionAI/',
    icon: Zap
  },
  {
    id: 'akasha',
    name: 'Akasha Hub',
    subtitle: 'Centralized Wisdom Node',
    url: 'https://akashaai.netlify.app/',
    icon: Sparkles
  },
  {
    id: 'geminigen',
    name: 'GeminiGen Forge',
    subtitle: 'Advanced Synthesis Lab',
    url: 'https://geminigen.ai/app/',
    icon: Film
  }
];

const ExternalPortal: React.FC = () => {
  const [activeRealmIndex, setActiveRealmIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showSelector, setShowSelector] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showKeyBanner, setShowKeyBanner] = useState(() => {
    const saved = localStorage.getItem('akasha_portal_key_visible');
    return saved === null ? true : saved === 'true';
  });

  const activeRealm = useMemo(() => REALMS[activeRealmIndex], [activeRealmIndex]);
  const isVisionAI = activeRealm.url.includes('VisionAI');
  const PUBLIC_KEY = "pk_kcR3k4nvqWfkH92K";

  useEffect(() => {
    localStorage.setItem('akasha_portal_key_visible', showKeyBanner.toString());
  }, [showKeyBanner]);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(PUBLIC_KEY);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    const iframe = document.getElementById('portal-frame') as HTMLIFrameElement;
    if (iframe) iframe.src = activeRealm.url;
  };

  const switchRealm = (index: number) => {
    if (index === activeRealmIndex) return;
    setIsLoading(true);
    setActiveRealmIndex(index);
    setShowSelector(false);
  };

  return (
    <div className="h-full flex flex-col bg-[#0b0e14] relative overflow-hidden">
      {/* Portal Header Overlay */}
      <div className="bg-[#13182b]/95 backdrop-blur-md border-b border-white/10 p-4 px-6 flex items-center justify-between z-40 shadow-2xl">
        <div className="flex items-center gap-4 relative">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <activeRealm.icon className="w-5 h-5 text-amber-500 animate-pulse" />
          </div>
          
          <div className="cursor-pointer group min-w-0" onClick={() => setShowSelector(!showSelector)}>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-black genshin-gold uppercase tracking-[0.2em] group-hover:text-white transition-colors truncate">{activeRealm.name}</h2>
              <ChevronDown className={`w-4 h-4 text-amber-500 transition-transform shrink-0 ${showSelector ? 'rotate-180' : ''}`} />
            </div>
            <p className="text-[8px] sm:text-[10px] text-gray-500 uppercase tracking-widest truncate">{activeRealm.subtitle}</p>
          </div>

          {showSelector && (
            <div className="absolute top-full left-0 mt-3 w-64 bg-[#131823] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 z-[60] animate-in slide-in-from-top-2">
               <div className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] p-2 border-b border-white/5 mb-2">Select Dimensional Portal</div>
               {REALMS.map((realm, idx) => (
                 <button 
                  key={realm.id} 
                  onClick={() => switchRealm(idx)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs flex items-center gap-3 transition-all ${activeRealmIndex === idx ? 'bg-amber-500/20 text-amber-500 font-black' : 'hover:bg-white/5 text-gray-400'}`}
                 >
                   <realm.icon className="w-4 h-4" />
                   <div className="flex flex-col">
                      <span>{realm.name}</span>
                      <span className="text-[8px] opacity-60 uppercase">{realm.subtitle}</span>
                   </div>
                 </button>
               ))}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {isVisionAI && (
            <button 
              onClick={() => setShowKeyBanner(!showKeyBanner)}
              className={`p-2 rounded-lg border transition-all flex items-center gap-2 px-3 ${showKeyBanner ? 'bg-amber-500/20 border-amber-500/40 text-amber-500' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
              title={showKeyBanner ? "Hide Public Key Manifest" : "Show Public Key Manifest"}
            >
              {showKeyBanner ? <EyeOff className="w-4 h-4" /> : <Key className="w-4 h-4" />}
              <span className="text-[9px] font-black uppercase tracking-widest hidden md:inline">Key Manifest</span>
            </button>
          )}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-[9px] font-black text-green-400 uppercase mr-2">
            <ShieldCheck className="w-3 h-3" />
            <span>Secure Tunnel Active</span>
          </div>
          <button 
            onClick={handleRefresh}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 transition-all"
            title="Re-sync Realm"
          >
            <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex-1 relative bg-black">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b0e14] z-10 p-6 text-center">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-6">
                <div className="absolute inset-0 border-2 border-dashed border-amber-500/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
                <div className="absolute inset-4 border border-amber-500/10 rounded-full animate-[spin_5s_linear_infinite_reverse]"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-amber-500 animate-spin" />
                </div>
            </div>
            <p className="text-[9px] sm:text-[10px] font-black text-amber-500/60 uppercase tracking-[0.4em] animate-pulse leading-relaxed">
              Traversing Space-Time Continuum...<br/>
              <span className="text-gray-600 mt-2 block font-mono">ESTABLISHING DIMENSIONAL ANCHOR ON {activeRealm.id.toUpperCase()}</span>
            </p>
          </div>
        )}
        
        <iframe 
          id="portal-frame"
          src={activeRealm.url}
          className="w-full h-full border-0 select-text"
          onLoad={() => setIsLoading(false)}
          title={activeRealm.name}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
        />

        {/* 🔮 PUBLIC KEY MANIFEST BANNER (Specific for Vision AI) */}
        {isVisionAI && !isLoading && showKeyBanner && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-2xl z-50 animate-in slide-in-from-bottom-10 duration-700">
                <div className="genshin-panel p-5 px-6 border-2 border-amber-500/40 bg-[#13182b]/95 backdrop-blur-xl shadow-[0_0_60px_rgba(211,188,142,0.4)] flex flex-col gap-4 relative">
                    <button 
                      onClick={() => setShowKeyBanner(false)}
                      className="absolute top-3 right-3 p-1 text-gray-500 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4 w-full">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30 shrink-0">
                                <Key className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-[10px] sm:text-[11px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2 truncate">
                                    🌐 Kunci Publik Apikey (Pollinations)
                                </span>
                                <code className="text-xs sm:text-sm text-amber-200 font-mono mt-1 select-text cursor-copy truncate" onClick={handleCopyKey}>{PUBLIC_KEY}</code>
                            </div>
                        </div>
                        <button 
                            onClick={handleCopyKey}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] sm:text-[11px] uppercase tracking-widest transition-all shadow-lg w-full md:w-auto justify-center ${copiedKey ? 'bg-green-600 text-white' : 'bg-amber-500 text-black hover:bg-white'}`}
                        >
                            {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copiedKey ? 'Synchronized' : 'Copy Artifact'}
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-white/10">
                        <div className="flex items-start gap-2">
                            <Info className="w-3.5 h-3.5 text-amber-500/60 shrink-0 mt-0.5" />
                            <p className="text-[9px] text-gray-400 font-medium leading-tight">Selalu terlihat di dasbor Anda</p>
                        </div>
                        <div className="flex items-start gap-2">
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-500/60 shrink-0 mt-0.5" />
                            <p className="text-[9px] text-gray-400 font-medium leading-tight">Aman digunakan dalam kode sisi klien (React, Vue, dll.)</p>
                        </div>
                        <div className="flex items-start gap-2">
                            <Zap className="w-3.5 h-3.5 text-amber-500/60 shrink-0 mt-0.5" />
                            <p className="text-[9px] text-gray-400 font-medium leading-tight">Pembatasan laju: 1 per jam pengisian ulang per IP+kunci.</p>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Footer Hint */}
      <div className="bg-[#0b0e14] border-t border-white/5 p-2 px-6 flex items-center justify-center">
        <p className="text-[8px] sm:text-[9px] text-gray-600 uppercase tracking-widest flex items-center gap-2">
            <Maximize2 className="w-2.5 h-2.5" /> Dimensional Projection Active • Akasha Portal Protocol V1.2
        </p>
      </div>
    </div>
  );
};

export default ExternalPortal;
