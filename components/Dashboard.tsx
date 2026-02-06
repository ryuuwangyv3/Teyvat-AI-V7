import React, { useEffect, useState, useCallback } from 'react';
import { 
    Activity, Cpu, Database, Zap, Clock, MessageSquare, ArrowRight, 
    ShieldCheck, Wifi, RefreshCcw, AlertTriangle, Users, TrendingUp, 
    Globe, Heart, Settings, Copy, Check, Key, Sparkles, Terminal 
} from 'lucide-react';
import { 
    fetchGlobalStats, fetchSystemLogs, checkDbConnection, 
    subscribeToTable, fetchForumPosts 
} from '../services/supabaseService';
import { SystemLog, ForumPost } from '../types';
import LazyImage from './LazyImage';

const Dashboard: React.FC = () => {
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [recentPosts, setRecentPosts] = useState<ForumPost[]>([]);
    const [stats, setStats] = useState({
        users: 0,
        posts: 0,
        latency: 0,
        uptime: 'Linking...'
    });
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSynced, setLastSynced] = useState<string>(new Date().toLocaleTimeString());
    const [pulseKey, setPulseKey] = useState(0);

    // --- REFRESH CORE LOGIC ---
    const refreshData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        setIsSyncing(true);
        try {
            const [globalStats, systemLogs, forumData, ping] = await Promise.all([
                fetchGlobalStats(),
                fetchSystemLogs(),
                fetchForumPosts('latest'),
                checkDbConnection()
            ]);
            
            const statusStr = ping >= 0 ? 'Online' : 'Restricted';
            
            setStats({ 
                users: globalStats?.total_users || 0, 
                posts: globalStats?.total_posts || 0, 
                latency: ping, 
                uptime: statusStr 
            });
            
            setLogs(systemLogs || []);
            setRecentPosts((forumData || []).slice(0, 3));
            setLastSynced(new Date().toLocaleTimeString());
            
            if (isSilent) setPulseKey(prev => prev + 1); 
            
        } catch (e) { 
            console.error("[Akasha] Ley Line Resonance Error:", e); 
        } finally { 
            setLoading(false); 
            setIsSyncing(false);
        }
    }, []);

    useEffect(() => {
        refreshData();
        
        // 1. Latency Pulse (Every 30s)
        const pingInterval = setInterval(() => {
            checkDbConnection().then(ping => {
                setStats(prev => ({ ...prev, latency: ping }));
                if (ping > 0) setPulseKey(p => p + 1);
            });
        }, 30000);

        // 2. Real-time Ley Line Subscriptions
        const logChannel = subscribeToTable('system_logs', (payload) => { 
            if (payload.eventType === 'INSERT' && payload.new) {
                setLogs(prev => [payload.new as SystemLog, ...prev].slice(0, 50));
                setPulseKey(p => p + 1);
            }
        });

        const forumChannel = subscribeToTable('forum_posts', (payload) => {
            if (payload.eventType === 'INSERT' && payload.new) {
                setStats(prev => ({ ...prev, posts: prev.posts + 1 }));
                setRecentPosts(prev => [payload.new as ForumPost, ...prev].slice(0, 3));
                setPulseKey(p => p + 1);
            } else if (payload.eventType === 'DELETE') {
                refreshData(true);
            }
        });

        const profileChannel = subscribeToTable('user_profiles', (payload) => {
            if (payload.eventType === 'INSERT') {
                setStats(prev => ({ ...prev, users: prev.users + 1 }));
                setPulseKey(p => p + 1);
            }
        });

        return () => { 
            clearInterval(pingInterval);
            logChannel?.unsubscribe(); 
            forumChannel?.unsubscribe(); 
            profileChannel?.unsubscribe(); 
        };
    }, [refreshData]);

    const statCards = [
        { label: 'Network Identity', value: stats.uptime, icon: Globe, color: stats.latency >= 0 ? 'text-green-400' : 'text-red-400', bg: 'bg-green-500/10' },
        { label: 'Travelers Logged', value: stats.users, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Pulse Latency', value: stats.latency < 0 ? 'OFF' : `${stats.latency}ms`, icon: Activity, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        { label: 'Ley Line Threads', value: stats.posts, icon: MessageSquare, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    ];

    return (
        <div className="h-full p-4 sm:p-8 lg:p-12 overflow-y-auto custom-scrollbar bg-[#0b0e14]">
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-1000">
                
                {/* --- HERO DASHBOARD HEADER --- */}
                <div className="relative rounded-[3rem] overflow-hidden p-8 sm:p-16 border border-[#d3bc8e]/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#13182b] via-[#0b0e14] to-[#1a1f2e]"></div>
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#d3bc8e]/5 blur-[120px] rounded-full"></div>
                    
                    <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
                        <div className="flex-1 text-center lg:text-left">
                            <div className="flex items-center justify-center lg:justify-start gap-4 mb-6">
                                <div className="bg-black/50 px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2.5">
                                    <div className={`w-2.5 h-2.5 rounded-full ${stats.latency >= 0 ? 'bg-green-400 shadow-[0_0_10px_#4ade80]' : 'bg-red-500'} animate-pulse`}></div>
                                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#d3bc8e]">Akasha Neural Link</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-full border border-blue-500/20 text-blue-400">
                                    <Wifi size={14} className="animate-bounce" />
                                    <span className="text-[8px] font-black uppercase tracking-widest">Signal Stable</span>
                                </div>
                            </div>
                            
                            <h1 className="text-4xl sm:text-6xl font-black genshin-gold mb-6 font-serif tracking-tighter leading-none">
                                IRMINSUL <br /> <span className="text-white opacity-90">RESONANCE</span>
                            </h1>
                            
                            <div className="flex flex-col sm:flex-row items-center gap-6 text-gray-500">
                                <p className="text-xs sm:text-sm italic max-w-lg leading-relaxed font-medium">
                                    "Monitoring the collective consciousness of Teyvat. Every thought, every post, every link is a fragment of the greater Ley Line network."
                                </p>
                                <div className="h-10 w-px bg-white/10 hidden sm:block"></div>
                                <div className="bg-white/5 px-4 py-2 rounded-2xl flex items-center gap-3">
                                    <Clock size={16} className="text-[#d3bc8e]" />
                                    <span className="text-[10px] font-mono font-black text-gray-400">SYNC_{lastSynced}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-4 w-full sm:w-auto">
                            <button 
                                onClick={() => refreshData()} 
                                disabled={isSyncing}
                                className="genshin-button group px-10 py-5 rounded-[2rem] flex items-center justify-center gap-4 text-black font-black text-xs uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all"
                            >
                                <RefreshCcw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'}`} />
                                <span>Pulse Scan</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- STATS GRID --- */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
                    {statCards.map((stat, idx) => (
                        <div key={idx} className="bg-[#13182b]/40 border border-white/5 p-6 sm:p-10 rounded-[2.5rem] hover:border-[#d3bc8e]/30 transition-all duration-500 group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                                <stat.icon size={80} />
                            </div>
                            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-3xl ${stat.bg} flex items-center justify-center mb-8 border border-white/5 group-hover:scale-110 transition-transform duration-500`}>
                                <stat.icon className={`${stat.color} drop-shadow-[0_0_10px_currentColor]`} size={28} />
                            </div>
                            <div className="relative z-10">
                                <div 
                                    key={`${pulseKey}-${idx}`}
                                    className={`text-2xl sm:text-4xl font-black text-white font-mono tracking-tighter mb-2 ${pulseKey > 0 ? 'animate-pulse-stat' : ''}`}
                                >
                                    {stat.value}
                                </div>
                                <div className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em]">{stat.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* --- MAIN CONTENT FEED --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    
                    {/* Recent Transmissions */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between px-4">
                            <h3 className="text-xl font-black genshin-gold uppercase tracking-[0.2em] flex items-center gap-4 font-serif">
                                <Zap className="text-amber-500 animate-pulse" size={20} /> Latest Transmissions
                            </h3>
                            <div className="h-px flex-1 mx-8 bg-gradient-to-r from-amber-500/20 to-transparent"></div>
                        </div>

                        <div className="space-y-6">
                            {loading && !isSyncing ? (
                                <div className="h-64 flex flex-col items-center justify-center bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                                    <LoaderVisual />
                                </div>
                            ) : recentPosts.map((post) => (
                                <div key={post.id} className="bg-[#13182b]/30 border border-white/5 p-6 rounded-[2.5rem] hover:bg-[#13182b]/60 transition-all duration-500 flex gap-6 group">
                                    <div className="w-24 h-24 sm:w-40 sm:h-40 rounded-3xl overflow-hidden shrink-0 border border-white/10 shadow-2xl relative">
                                        <LazyImage 
                                            src={post.media_url || `https://picsum.photos/seed/${post.id}/300`} 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                                            alt="" 
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    </div>
                                    <div className="flex-1 py-2">
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className="bg-amber-500 text-black text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest">#{post.tag}</span>
                                            <span className="text-[9px] text-gray-600 font-mono">{new Date(post.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <h4 className="text-lg sm:text-2xl font-black text-white group-hover:text-[#d3bc8e] transition-colors mb-2 line-clamp-1">{post.title}</h4>
                                        <p className="text-xs sm:text-sm text-gray-400 italic line-clamp-2 mb-6 opacity-70 group-hover:opacity-100 transition-opacity leading-relaxed">"{post.content}"</p>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-full border border-[#d3bc8e]/30 overflow-hidden">
                                                    <img src={post.avatar || `https://ui-avatars.com/api/?name=${post.author}`} className="w-full h-full object-cover" alt="" />
                                                </div>
                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">@{post.author}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="flex items-center gap-2 text-[10px] text-gray-500 font-bold"><Heart size={14} className="text-red-500/50" /> {post.likes}</span>
                                                <span className="flex items-center gap-2 text-[10px] text-gray-500 font-bold"><MessageSquare size={14} className="text-blue-500/50" /> Recorded</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* System Logs (Event Horizon) */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-black genshin-gold uppercase tracking-[0.2em] flex items-center gap-4 font-serif px-4">
                            <Terminal className="text-blue-400" size={20} /> Event Horizon
                        </h3>
                        <div className="bg-[#0e121b] border border-white/10 rounded-[3rem] overflow-hidden flex flex-col h-[600px] shadow-2xl relative">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
                            <div className="p-6 border-b border-white/5 bg-black/40 flex justify-between items-center relative z-10">
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em]">Neural Stream</span>
                                <div className="flex gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500/50"></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50"></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500/50"></div>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5 relative z-10">
                                {logs.map((log) => (
                                    <div key={log.id} className="flex gap-4 group animate-in slide-in-from-right-4">
                                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                                            log.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                                        } shadow-[0_0_10px_currentColor]`} />
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[11px] text-gray-300 font-medium leading-relaxed group-hover:text-white transition-colors">
                                                {log.message}
                                            </span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[8px] font-mono text-gray-600 font-black tracking-tighter">{new Date(log.created_at).toLocaleTimeString()}</span>
                                                <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded border ${
                                                    log.type === 'error' ? 'text-red-500/50 border-red-500/10' : 'text-blue-500/50 border-blue-500/10'
                                                }`}>{log.type}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-5 bg-black/60 border-t border-white/5 text-center relative z-10">
                                <span className="text-[8px] font-black text-gray-700 uppercase tracking-[0.4em]">Archive Limit: 50 Fragments</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <style>{`
                @keyframes counter-pulse {
                    0% { transform: scale(1); filter: brightness(1); }
                    50% { transform: scale(1.1); filter: brightness(1.5); }
                    100% { transform: scale(1); filter: brightness(1); }
                }
                .animate-pulse-stat {
                    animation: counter-pulse 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
            `}</style>
        </div>
    );
};

// --- HELPER COMPONENT ---
const LoaderVisual = () => (
    <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-[#d3bc8e]/10 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-[#d3bc8e] rounded-full border-t-transparent animate-spin"></div>
        </div>
        <span className="text-[10px] font-black text-[#d3bc8e] uppercase tracking-[0.4em] animate-pulse">Syncing Archive...</span>
    </div>
);

export default Dashboard;
