import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { 
  PhoneCall, Terminal as TerminalIcon, Users, User, Settings as SettingsIcon, 
  ImageIcon, Video, Globe, LayoutDashboard, HardDrive, MessageSquare, 
  Menu, X, History, Loader2, Info, Crown, Zap, Sparkles, Cpu, Trash2, ChevronDown
} from 'lucide-react';
import { MenuType, Persona, UserProfile, VoiceConfig, Language, ApiKeyData } from './types';
import { DEFAULT_PERSONAS, INITIAL_USER_PROFILE } from './constants';
import { LANGUAGES, AI_MODELS, PERSONAS } from './data';
import HistorySidebar from './components/HistorySidebar';
import DonationModal from './components/DonationModal';
import OnboardingTutorial from './components/OnboardingTutorial';
import AuthModal from './components/AuthModal'; // Versi yang kita buat tadi
import DatabaseSetupModal from './components/DatabaseSetupModal'; 
import ErrorBoundary from './components/ErrorBoundary';
import AdminConsole from './components/AdminConsole'; 
import CookieConsent from './components/CookieConsent';
import { 
  initSupabase, fetchUserProfile, syncUserSettings, fetchUserSettings, 
  checkDbConnection, clearChatHistory,
  fetchCustomPersonas, saveCustomPersona, deleteCustomPersona, fetchDriveItems,
  supabase // Pastikan supabase client di-export dari service
} from './services/supabaseService';
import { enableRuntimeProtection } from './services/securityService';
import { setStoredKeys } from './services/apiKeyStore';
import { syncGithubRepo, pushToGithub, DEFAULT_GITHUB_CONFIG } from './services/githubService';

// --- COMPONENTS ---
import Terminal from './components/Terminal';
import LiveCall from './components/LiveCall';
import PersonaSelector from './components/PersonaSelector';
import VisionGen from './components/VisionGen';
import VideoGen from './components/VideoGen';
import Settings from './components/Settings';
import UserInfo from './components/UserInfo';
import LanguageSettings from './components/LanguageSettings';
import Dashboard from './components/Dashboard';
import Drive from './components/Drive'; 
import Forum from './components/Forum';
import About from './components/About';
import ExternalPortal from './components/ExternalPortal';

const MENU_ICONS: Record<string, any> = {
    [MenuType.DASHBOARD]: LayoutDashboard,
    [MenuType.TERMINAL]: TerminalIcon,
    [MenuType.PERSONAS]: Users,
    [MenuType.VISION_GEN]: ImageIcon,
    [MenuType.VIDEO_GEN]: Video,
    [MenuType.STORAGE]: HardDrive,
    [MenuType.FORUM]: MessageSquare,
    [MenuType.LANGUAGE]: Globe,
    [MenuType.USER_INFO]: User,
    [MenuType.VOICE_SETTINGS]: SettingsIcon,
    [MenuType.ABOUT]: Info,
    [MenuType.REALM_PORTAL]: Zap
};

const App: React.FC = () => {
  // --- UI STATES ---
  const [activeMenu, setActiveMenu] = useState<MenuType>(MenuType.TERMINAL);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [globalErrorLog, setGlobalErrorLog] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDbSetupModal, setShowDbSetupModal] = useState(false); 
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [isLiveCallOpen, setIsLiveCallOpen] = useState(false);
  const [terminalKey, setTerminalKey] = useState(0); 

  // --- SYSTEM & DATA STATES ---
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([]);
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>({ 
      speed: 1.0, pitch: 1.0, reverb: 0, gain: 1.0, voiceId: 'Kore', autoPlay: true
  });
  const [currentLanguage, setCurrentLanguage] = useState<Language>(LANGUAGES[0]);
  const [selectedModel, setSelectedModel] = useState<string>(AI_MODELS[0].id);
  const [currentPersona, setCurrentPersona] = useState<Persona>(PERSONAS[0]);
  const [customPersonas, setCustomPersonas] = useState<Persona[]>([]);

  // 1. INITIALIZATION CORE
  useEffect(() => {
    enableRuntimeProtection(); 
    
    const setup = async () => {
        const connected = initSupabase();
        setIsSupabaseConnected(connected);

        if (connected) {
            // Cek koneksi DB & Setup table
            const ping = await checkDbConnection();
            if (ping === -2) setShowDbSetupModal(true);

            // Listener Autentikasi Real-time
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                if (session) {
                    console.log("[Auth] Session active:", session.user.email);
                    setShowAuthModal(false); // Otomatis tutup modal
                    await syncCloudData();
                } else {
                    console.log("[Auth] No session found.");
                    setShowAuthModal(true); // Tampilkan modal jika tidak ada session
                }
            });

            // Initial session check
            const { data: { session } } = await supabase.auth.getSession();
            if (session) await syncCloudData();
            else setShowAuthModal(true);

            return () => subscription.unsubscribe();
        }
        setIsDataLoaded(true);
    };

    setup();
  }, []);

  // Fungsi sinkronisasi data dari cloud
  const syncCloudData = async () => {
    try {
        const [cloudProfile, cloudSettings, customs] = await Promise.all([
            fetchUserProfile(),
            fetchUserSettings(),
            fetchCustomPersonas()
        ]);

        if (cloudProfile) setUserProfile(cloudProfile);
        if (cloudSettings) {
            if (cloudSettings.apiKeys) setApiKeys(cloudSettings.apiKeys);
            if (cloudSettings.voiceConfig) setVoiceConfig(cloudSettings.voiceConfig);
            if (cloudSettings.currentLanguage) setCurrentLanguage(cloudSettings.currentLanguage);
            if (cloudSettings.selectedModel) setSelectedModel(cloudSettings.selectedModel);
        }
        if (customs) setCustomPersonas(customs);
    } catch (e) {
        console.error("[Sync] Error loading celestial data:", e);
    } finally {
        setIsDataLoaded(true);
    }
  };

  // 2. AUTO-SAVE SETTINGS
  useEffect(() => {
    if (isDataLoaded && isSupabaseConnected) {
      syncUserSettings({ voiceConfig, apiKeys, currentLanguage, selectedModel });
      setStoredKeys(apiKeys);
    }
  }, [voiceConfig, apiKeys, currentLanguage, selectedModel, isDataLoaded, isSupabaseConnected]);

  // 3. GITHUB SYNC ENGINE
  useEffect(() => {
      let intervalId: any;
      const ghConfig = userProfile.githubConfig || DEFAULT_GITHUB_CONFIG;
      
      if (isDataLoaded && ghConfig.autoSync && ghConfig.token) {
          const performSync = async () => {
              try {
                  await syncGithubRepo(ghConfig);
                  const allItems = await fetchDriveItems(null);
                  await pushToGithub(allItems, ghConfig);
              } catch (e) {
                  console.error("[AutoSync] Cycle failed:", e);
              }
          };
          performSync();
          intervalId = setInterval(performSync, 5 * 60 * 1000); 
      }
      return () => { if (intervalId) clearInterval(intervalId); };
  }, [isDataLoaded, userProfile.githubConfig]);

  // --- HANDLERS ---
  const handlePersonaSelect = (p: Persona) => {
      setCurrentPersona(p);
      setActiveMenu(MenuType.TERMINAL);
      setVoiceConfig(prev => ({
          ...prev,
          voiceId: p.voiceName,
          pitch: p.pitch || 1.0,
          speed: p.speed || 1.0,
          gain: p.id === 'akasha_system' ? 1.4 : 1.0,
          reverb: p.id === 'akasha_system' ? 15 : 0
      }));
  };

  const handleAddCustomPersona = async (p: Persona) => {
      await saveCustomPersona(p);
      setCustomPersonas(prev => {
          const exists = prev.find(item => item.id === p.id);
          if (exists) return prev.map(item => item.id === p.id ? p : item);
          return [...prev, p];
      });
      handlePersonaSelect(p);
  };

  const handleDeleteCustomPersona = async (id: string) => {
      await deleteCustomPersona(id);
      setCustomPersonas(prev => prev.filter(p => p.id !== id));
      if (currentPersona.id === id) handlePersonaSelect(PERSONAS[0]);
  };

  const handleClearChat = async () => {
      if (window.confirm(`Purge all memory fragments with ${currentPersona.name}?`)) {
          await clearChatHistory(currentPersona.id);
          setTerminalKey(prev => prev + 1); 
      }
  };

  const getProviderStyle = (provider: string) => {
    switch (provider.toLowerCase()) {
        case 'google': return 'text-amber-400 border-amber-500/30 bg-amber-500/5';
        case 'pollinations': return 'text-purple-400 border-purple-500/30 bg-purple-500/5';
        case 'openai': return 'text-blue-400 border-blue-500/30 bg-blue-500/5';
        case 'openrouter': return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5';
        default: return 'text-gray-400 border-white/10 bg-white/5';
    }
  };

  const combinedSystemInstruction = useMemo(() => {
    return `${currentPersona.systemInstruction}\n\n[MANDATORY_LANGUAGE_SYNC]\n- ${currentLanguage.instruction}\n- ALWAYS respond in ${currentLanguage.label}.`;
  }, [currentPersona.systemInstruction, currentLanguage]);

  const sidebarMenus = Object.values(MenuType).filter(m => 
    ![MenuType.ADMIN_CONSOLE, MenuType.API_KEY, MenuType.LIVE_CALL].includes(m)
  );

  // --- RENDER CONTENT ---
  const activeContent = useMemo(() => {
      if (!isDataLoaded) return null;
      switch (activeMenu) {
          case MenuType.DASHBOARD: return <Dashboard />;
          case MenuType.STORAGE: return <Drive />;
          case MenuType.TERMINAL: return <Terminal key={`${currentPersona.id}-${terminalKey}`} currentPersona={{...currentPersona, systemInstruction: combinedSystemInstruction}} userProfile={userProfile} currentLanguage={currentLanguage} voiceConfig={voiceConfig} selectedModel={selectedModel} onError={setGlobalErrorLog} isSupabaseConnected={isSupabaseConnected} />;
          case MenuType.PERSONAS: return <PersonaSelector onSelect={handlePersonaSelect} activePersonaId={currentPersona.id} onCustomAdd={handleAddCustomPersona} onDeleteCustom={handleDeleteCustomPersona} customPersonas={customPersonas} />;
          case MenuType.VISION_GEN: return <VisionGen onError={setGlobalErrorLog} />;
          case MenuType.VIDEO_GEN: return <VideoGen />;
          case MenuType.VOICE_SETTINGS: return <Settings voiceConfig={voiceConfig} setVoiceConfig={setVoiceConfig} />;
          case MenuType.USER_INFO: return <UserInfo profile={userProfile} setProfile={setUserProfile} />;
          case MenuType.LANGUAGE: return <LanguageSettings currentLanguage={currentLanguage} setLanguage={setCurrentLanguage} />;
          case MenuType.FORUM: return <Forum userProfile={userProfile} />;
          case MenuType.ABOUT: return <About onSwitchToAdmin={() => setActiveMenu(MenuType.ADMIN_CONSOLE)} />;
          case MenuType.ADMIN_CONSOLE: return <AdminConsole apiKeys={apiKeys} setApiKeys={setApiKeys} userProfile={userProfile} selectedModel={selectedModel} setSelectedModel={setSelectedModel} />;
          case MenuType.REALM_PORTAL: return <ExternalPortal />;
          default: return <Terminal userProfile={userProfile} currentPersona={currentPersona} currentLanguage={currentLanguage} voiceConfig={voiceConfig} selectedModel={selectedModel} onError={setGlobalErrorLog} isSupabaseConnected={isSupabaseConnected} />;
      }
  }, [activeMenu, currentPersona, combinedSystemInstruction, userProfile, currentLanguage, voiceConfig, selectedModel, isDataLoaded, apiKeys, isSupabaseConnected, terminalKey, customPersonas]);

  // --- SPLASH SCREEN ---
  if (!isDataLoaded) return (
    <div className="h-full w-full bg-[#0b0e14] flex flex-col items-center justify-center text-[#d3bc8e]">
        <div className="relative w-20 h-20 mb-6">
            <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Initializing Akasha...</p>
    </div>
  );

  return (
    <div className="flex h-full w-full bg-[#0b0e14] text-[#ece5d8] overflow-hidden relative select-none">
      
      {/* AUTH & OVERLAYS */}
      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal} 
          onGuest={() => setShowAuthModal(false)} 
        />
      )}
      
      {showDbSetupModal && <DatabaseSetupModal onClose={() => setShowDbSetupModal(false)} />}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110]" onClick={() => setIsSidebarOpen(false)} />}

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-[120] w-64 lg:w-80 h-full bg-[#0d111c]/98 backdrop-blur-3xl border-r border-[#d3bc8e]/20 transition-transform duration-500 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6 flex items-center justify-between border-b border-[#d3bc8e]/10">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#d3bc8e]/10 border border-[#d3bc8e]/30 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-[#d3bc8e] animate-pulse" />
                  </div>
                  <div className="flex flex-col">
                      <span className="text-lg font-black tracking-[0.2em] text-[#d3bc8e] font-serif">AKASHA</span>
                      <span className="text-[7px] font-bold text-gray-500 uppercase tracking-widest">V8.8 Core</span>
                  </div>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-gray-500 hover:text-[#d3bc8e] transition-all"><X className="w-5 h-5"/></button>
          </div>
          
          <nav className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-1">
            <button onClick={() => { setIsLiveCallOpen(true); setIsSidebarOpen(false); }} className="w-full flex items-center gap-4 p-4 rounded-2xl mb-6 bg-[#d3bc8e]/10 border border-[#d3bc8e]/20 text-[#d3bc8e] hover:bg-[#d3bc8e]/20 transition-all group shadow-lg">
                <div className="w-8 h-8 rounded-full bg-[#d3bc8e]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <PhoneCall className="w-4 h-4" />
                </div>
                <div className="flex flex-col items-start">
                    <span className="font-black uppercase tracking-widest text-[9px]">Celestial Call</span>
                    <span className="text-[7px] text-[#d3bc8e]/60 font-bold">Voice Resonance</span>
                </div>
            </button>
            
            {sidebarMenus.map((m) => {
                const Icon = MENU_ICONS[m] || TerminalIcon;
                const isActive = activeMenu === m;
                return (
                <button key={m} onClick={() => { setActiveMenu(m); setIsSidebarOpen(false); }} className={`w-full text-left p-3.5 rounded-xl flex items-center gap-4 transition-all duration-300 relative group ${isActive ? 'bg-[#d3bc8e] text-black shadow-xl translate-x-2' : 'text-gray-400 hover:bg-white/5 hover:text-[#d3bc8e]'}`}>
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{m.replace(/_/g, ' ')}</span>
                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-black rounded-r-full"></div>}
                </button>
                );
            })}
          </nav>

          <div className="p-6 border-t border-[#d3bc8e]/10 bg-black/40">
             <div className="flex items-center gap-4 p-3 rounded-2xl bg-[#d3bc8e]/5 border border-[#d3bc8e]/10 group">
                <div className="relative">
                    <img src={userProfile.avatar} className="w-10 h-10 rounded-xl border-2 border-[#d3bc8e]/30" alt="av" />
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 border-2 border-[#0b0e14] rounded-full ${isSupabaseConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black text-[#d3bc8e] uppercase truncate tracking-widest">{userProfile.username}</p>
                    <p className="text-[8px] text-gray-500 uppercase font-bold">Resonance Lv.90</p>
                </div>
             </div>
          </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-h-0 relative w-full overflow-hidden">
        <header className="h-14 lg:h-20 border-b border-[#d3bc8e]/10 flex items-center justify-between px-4 lg:px-8 bg-[#0b0e14]/80 backdrop-blur-xl z-[100]">
           <div className="flex items-center gap-4 lg:gap-6">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 lg:p-3 rounded-xl bg-[#d3bc8e]/5 border border-[#d3bc8e]/20 text-[#d3bc8e] hover:bg-[#d3bc8e]/10 transition-all">
                <Menu className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
              <h2 className="text-[10px] lg:text-[14px] font-black text-[#d3bc8e] uppercase tracking-[0.4em] font-serif">{activeMenu.replace(/_/g, ' ')}</h2>
           </div>

           <div className="flex items-center gap-2 lg:gap-4">
              {activeMenu === MenuType.TERMINAL && (
                 <>
                    <div className="relative">
                        <button onClick={() => setShowModelDropdown(!showModelDropdown)} className="flex items-center gap-3 px-3 lg:px-5 py-2 rounded-xl bg-[#d3bc8e]/10 border border-[#d3bc8e]/30 text-[#d3bc8e] hover:bg-[#d3bc8e]/20 transition-all">
                            <Cpu className="w-4 h-4" />
                            <span className="text-[9px] font-black uppercase tracking-widest hidden md:block">
                                {AI_MODELS.find(m => m.id === selectedModel)?.label.split(' ')[0]}
                            </span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {showModelDropdown && (
                            <div className="absolute top-full right-0 mt-3 w-64 bg-[#1a1f35] border-2 border-[#d3bc8e]/40 rounded-[1.5rem] shadow-2xl z-[200] py-2">
                                {AI_MODELS.map(m => (
                                    <button key={m.id} onClick={() => { setSelectedModel(m.id); setShowModelDropdown(false); }} className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase hover:bg-white/5 ${selectedModel === m.id ? 'text-[#d3bc8e]' : 'text-gray-500'}`}>
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button onClick={handleClearChat} className="p-2 lg:p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
                        <Trash2 className="w-5 h-5" />
                    </button>
                 </>
              )}
              <button onClick={() => setIsHistoryOpen(true)} className="p-2 lg:p-3 rounded-xl bg-[#d3bc8e]/5 border border-[#d3bc8e]/20 text-[#d3bc8e] relative">
                <History className="w-5 h-5 lg:w-6 lg:h-6" />
                <div className="absolute top-0 right-0 w-2 h-2 bg-amber-500 rounded-full border-2 border-[#0b0e14]"></div>
              </button>
           </div>
        </header>
        
        <section className="flex-1 relative z-10 overflow-hidden bg-[#0b0e14]/40">
          <ErrorBoundary>
             <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-[#d3bc8e]" /></div>}>
                {activeContent}
             </Suspense>
          </ErrorBoundary>
        </section>
      </main>

      <LiveCall currentPersona={currentPersona} voiceConfig={voiceConfig} isOpen={isLiveCallOpen} onClose={() => setIsLiveCallOpen(false)} />
      <HistorySidebar isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} onSelectPersona={handlePersonaSelect} onNewChat={() => setActiveMenu(MenuType.PERSONAS)} activePersonaId={currentPersona.id} customPersonas={customPersonas} />
      <DonationModal errorLog={globalErrorLog} onClose={() => setGlobalErrorLog(null)} />
      <OnboardingTutorial />
      <CookieConsent />
    </div>
  );
};

export default App;
