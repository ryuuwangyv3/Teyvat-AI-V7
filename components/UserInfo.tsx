import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
    Camera, Edit2, Shield, User, MapPin, LogOut, CheckCircle2, 
    ShieldCheck, Mail, Cloud, Info, LogIn, Loader2, Zap, 
    Award, Users, Activity, Fingerprint
} from 'lucide-react';
import { UserProfile } from '../types';
import { signOut, syncUserProfile, signInWithGoogle, fetchUserStats } from '../services/supabaseService';

interface UserInfoProps {
    profile: UserProfile;
    setProfile: (p: UserProfile) => void;
}

const UserInfo: React.FC<UserInfoProps> = ({ profile, setProfile }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempProfile, setTempProfile] = useState(profile);
    const [isLoginLoading, setIsLoginLoading] = useState(false);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [stats, setStats] = useState({
        achievements: 0,
        companions: 0,
        visits: 0,
        aura: 0
    });
    
    const headerInputRef = useRef<HTMLInputElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const loadStats = useCallback(async () => {
        setIsLoadingStats(true);
        try {
            const realStats = await fetchUserStats(profile.id || 'guest');
            setStats(realStats);
        } catch (err) {
            console.error("[Akasha] Failed to fetch stats", err);
        } finally {
            setIsLoadingStats(false);
        }
    }, [profile.id]);

    useEffect(() => {
        setTempProfile(profile);
        loadStats();
    }, [profile, loadStats]);

    const handleSave = async () => {
        try {
            setProfile(tempProfile);
            setIsEditing(false);
            await syncUserProfile(tempProfile);
        } catch (err) {
            console.error("Failed to sync profile", err);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'avatar' | 'headerBackground') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setTempProfile(prev => ({ ...prev, [field]: event.target!.result as string }));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const statItems = [
        { label: 'Achievements', value: stats.achievements, icon: Award, color: 'text-amber-400' },
        { label: 'Companions', value: stats.companions, icon: Users, color: 'text-blue-400' },
        { label: 'Energy Flux', value: stats.visits, icon: Activity, color: 'text-green-400' },
        { label: 'Aura Trace', value: stats.aura, icon: Zap, color: 'text-purple-400' },
    ];

    return (
        <div className="h-full overflow-y-auto custom-scrollbar bg-[#0b0e14]">
            {/* --- HEADER BANNER --- */}
            <div className="h-48 lg:h-64 relative overflow-hidden group">
                <img 
                    src={tempProfile.headerBackground} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                    alt="header" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e14] via-[#0b0e14]/40 to-transparent"></div>
                
                {isEditing && (
                    <button 
                        onClick={() => headerInputRef.current?.click()}
                        className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300"
                    >
                        <Camera className="w-8 h-8 text-white mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Change Banner</span>
                        <input type="file" ref={headerInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'headerBackground')} />
                    </button>
                )}
            </div>

            {/* --- PROFILE CONTENT --- */}
            <div className="max-w-5xl mx-auto px-4 lg:px-10 -mt-20 relative z-20 pb-20">
                <div className="flex flex-col lg:flex-row items-end gap-6 mb-10">
                    {/* Avatar Portal */}
                    <div className="relative group shrink-0">
                        <div className="w-36 h-36 rounded-[2.5rem] border-[6px] border-[#0b0e14] shadow-2xl overflow-hidden bg-[#13182b] relative">
                            <img src={tempProfile.avatar} className="w-full h-full object-cover" alt="avatar" />
                            {isEditing && (
                                <button 
                                    onClick={() => avatarInputRef.current?.click()}
                                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Camera className="w-6 h-6 text-white" />
                                    <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} />
                                </button>
                            )}
                        </div>
                        {profile.isAuth && (
                            <div className="absolute -bottom-1 -right-1 bg-amber-500 p-1.5 rounded-2xl border-4 border-[#0b0e14] shadow-lg animate-bounce-slow">
                                <ShieldCheck className="w-5 h-5 text-black" />
                            </div>
                        )}
                    </div>

                    {/* Name & Title */}
                    <div className="flex-1 mb-2">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    value={tempProfile.username} 
                                    onChange={(e) => setTempProfile({...tempProfile, username: e.target.value})}
                                    className="text-3xl font-black bg-[#1a1f2e] border-b-2 border-amber-500 outline-none text-white px-3 py-1 rounded-t-xl w-full max-w-md"
                                />
                            ) : (
                                <h1 className="text-3xl lg:text-4xl font-black text-white flex items-center gap-3 font-serif tracking-tight">
                                    {profile.username}
                                    {profile.isAuth && <Fingerprint className="w-6 h-6 text-amber-500/50" />}
                                </h1>
                            )}
                            <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] shadow-xl ${profile.isAuth ? 'bg-amber-500 text-black' : 'bg-white/10 text-gray-400'}`}>
                                {profile.isAuth ? 'Ascended' : 'Wanderer'}
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-gray-500 text-xs font-bold uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><MapPin size={14} className="text-amber-500/60" /> Teyvat System</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-white/10"></span>
                            <span>Node #{profile.id ? profile.id.substring(0, 8).toUpperCase() : 'GUEST-UNLINKED'}</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mb-2 shrink-0">
                        {isEditing ? (
                            <>
                                <button onClick={() => { setIsEditing(false); setTempProfile(profile); }} className="px-6 py-3 rounded-2xl border border-white/10 text-gray-400 hover:bg-white/5 font-black text-xs uppercase tracking-widest transition-all">Cancel</button>
                                <button onClick={handleSave} className="px-8 py-3 rounded-2xl genshin-button text-black font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all active:scale-95">Sync Data</button>
                            </>
                        ) : (
                            <button onClick={() => setIsEditing(true)} className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/50 hover:bg-amber-500/5 text-[#d3bc8e] flex items-center gap-3 transition-all font-black text-xs uppercase tracking-widest group">
                                <Edit2 size={14} className="group-hover:rotate-12 transition-transform" />
                                <span>Edit Profile</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* --- LEFT COLUMN: BIO & STATS --- */}
                    <div className="lg:col-span-2 space-y-8">
                        
                        {/* Cloud Alert */}
                        {!profile.isAuth && (
                            <div className="relative overflow-hidden p-6 rounded-[2rem] border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent animate-in fade-in duration-700">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Cloud size={80} className="text-amber-500" />
                                </div>
                                <div className="relative z-10">
                                    <h4 className="text-amber-400 font-black text-sm uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                        <Cloud size={18} /> Celestial Sync Required
                                    </h4>
                                    <p className="text-xs text-gray-400 italic mb-6 leading-relaxed max-w-md">
                                        "Data anda saat ini hanya tersimpan di realm lokal. Hubungkan ke Akasha Cloud untuk mengamankan memori anda selamanya."
                                    </p>
                                    <button 
                                        onClick={async () => { setIsLoginLoading(true); await signInWithGoogle(); setIsLoginLoading(false); }}
                                        disabled={isLoginLoading}
                                        className="bg-white text-black px-6 py-3 rounded-xl flex items-center gap-3 font-black text-[10px] uppercase tracking-widest hover:bg-[#d3bc8e] transition-all disabled:opacity-50"
                                    >
                                        {isLoginLoading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                                        Connect Google Identity
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Biography */}
                        <div className="bg-[#13182b]/40 border border-[#d3bc8e]/10 p-8 rounded-[2.5rem] relative group">
                            <div className="absolute top-6 right-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Info size={40} className="text-[#d3bc8e]" />
                            </div>
                            <h3 className="text-xs font-black text-[#d3bc8e] mb-6 uppercase tracking-[0.3em] flex items-center gap-2">
                                <Fingerprint size={16} /> Traveler Biography
                            </h3>
                            {isEditing ? (
                                <textarea 
                                    value={tempProfile.bio}
                                    onChange={(e) => setTempProfile({...tempProfile, bio: e.target.value})}
                                    className="w-full bg-[#0b0e14]/60 border border-white/10 rounded-2xl p-5 text-sm focus:border-amber-500 outline-none min-h-[120px] text-gray-200 resize-none custom-scrollbar leading-relaxed"
                                    placeholder="Write your legend..."
                                />
                            ) : (
                                <p className="text-gray-300 leading-relaxed italic text-sm md:text-base font-serif">
                                    {profile.bio || "No biography recorded in the Irminsul tree yet."}
                                </p>
                            )}
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {statItems.map(stat => (
                                <div key={stat.label} className="bg-[#13182b]/40 border border-white/5 p-5 rounded-3xl text-center hover:border-[#d3bc8e]/30 transition-all group">
                                    <div className={`mb-3 flex justify-center ${stat.color} group-hover:scale-110 transition-transform`}>
                                        <stat.icon size={24} />
                                    </div>
                                    <p className="text-xl font-black text-white mb-1">
                                        {isLoadingStats ? '---' : stat.value}
                                    </p>
                                    <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* --- RIGHT COLUMN: SYSTEM INFO --- */}
                    <div className="space-y-6">
                        {/* Security Panel */}
                        <div className="bg-gradient-to-br from-[#1a1f2e] to-[#0b0e14] border border-white/10 p-6 rounded-[2rem]">
                            <h3 className="text-[10px] font-black text-[#d3bc8e] mb-6 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Shield size={16} className="text-amber-500" /> System Integrity
                            </h3>
                            <div className="space-y-5">
                                <div>
                                    <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest block mb-2">Neural Identity</span>
                                    <div className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/5 group">
                                        <Mail size={14} className="text-blue-400 group-hover:rotate-12 transition-transform" />
                                        <span className="text-gray-200 text-[11px] truncate font-mono">
                                            {profile.email || 'GUEST_PROTO_0.1'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-white/5">
                                    <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Signal Encryption</span>
                                    <span className={`text-[9px] font-black px-3 py-1 rounded-full ${profile.isAuth ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                        {profile.isAuth ? 'VERIFIED' : 'LOCAL_ONLY'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] pt-2">
                                    <span className="text-gray-500 uppercase font-black tracking-tighter">Auth Core</span>
                                    <div className="flex items-center gap-2">
                                        <img src="https://www.google.com/favicon.ico" className={`w-3 h-3 ${!profile.isAuth && 'grayscale opacity-30'}`} alt="" />
                                        <span className="text-gray-300 font-black">{profile.isAuth ? 'GOOGLE_API' : 'LOCAL_DB'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Session Panel */}
                        <div className="bg-[#13182b]/20 border border-white/5 p-6 rounded-[2rem] text-center">
                            <h3 className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-[0.2em]">Session Control</h3>
                            <p className="text-[9px] text-gray-500 italic mb-6">"Terminate neural link to secure your data fragments."</p>
                            <button 
                                onClick={() => { if(window.confirm('Terminate neural link?')) signOut(); }}
                                className="w-full py-3.5 bg-red-500/5 border border-red-500/20 rounded-2xl text-[10px] font-black text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-3 uppercase tracking-widest"
                            >
                                <LogOut size={14} /> Terminate Session
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserInfo;
