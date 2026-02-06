import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile, Message, DriveItem, Persona } from '../types';
import { encryptData, decryptData, SecureStorage } from './securityService';

// --- CONFIGURATION ---
// Pake import.meta.env biar lebih aman dan standar Vite
const URL = import.meta.env.VITE_SUPABASE_URL || 'https://nrnuuufpyhhwhiqmzgub.supabase.co';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ybnV1dWZweWhod2hpcW16Z3ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMjQ4MjEsImV4cCI6MjA4MTgwMDgyMX0.BBFIO9DXqFUrluCe_bs562JqZb_bh4Yknn1HKXgDhm4';

export let supabase: SupabaseClient;
let currentUserId = 'guest';

// --- INITIALIZATION ---
export const initSupabase = (): boolean => {
  if (supabase) return true;

  if (URL && ANON_KEY && URL.startsWith('http')) {
    try {
      supabase = createClient(URL, ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });

      // Listener Otomatis: Update currentUserId tiap status auth berubah
      supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          currentUserId = session.user.id;
          console.log(`[Celestial Auth] Resonance linked: ${currentUserId}`);
        } else {
          currentUserId = 'guest';
          console.log("[Celestial Auth] Operating in Local Protocol (Guest)");
        }
      });

      return true;
    } catch (e) {
      console.error("Supabase Init Error:", e);
    }
  }
  return false;
};

// Jalankan inisialisasi langsung
initSupabase();

// --- AUTH FUNCTIONS ---
export const getSessionId = () => currentUserId;

export const getCurrentSession = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session;
};

export const signInWithGoogle = async () => {
    return await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { 
            redirectTo: window.location.origin,
            queryParams: { access_type: 'offline', prompt: 'select_account' }
        }
    });
};

export const signOut = async () => {
    await supabase.auth.signOut();
    currentUserId = 'guest';
    SecureStorage.clear();
    window.location.reload();
};

// --- DATABASE HEALTH ---
export const checkDbConnection = async (): Promise<number> => {
    const start = Date.now();
    try {
        const { error } = await supabase.from('user_profiles').select('user_id').limit(1);
        if (error && error.code === '42P01') return -2; // Tables missing
        if (error) return -1;
        return Date.now() - start;
    } catch (e) { return -3; }
};

// --- USER PROFILE & SETTINGS ---
export const fetchUserProfile = async (): Promise<UserProfile | null> => {
    if (currentUserId !== 'guest') {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', currentUserId)
            .single();
        
        if (data) return { 
            id: data.user_id, 
            username: data.username, 
            bio: data.bio, 
            avatar: data.avatar, 
            headerBackground: data.header_background, 
            email: data.email, 
            isAuth: true 
        };
    }
    return SecureStorage.getItem('local_profile');
};

export const syncUserProfile = async (profile: UserProfile) => {
    if (currentUserId !== 'guest') {
        await supabase.from('user_profiles').upsert({
            user_id: currentUserId,
            username: profile.username, 
            bio: profile.bio,
            avatar: profile.avatar, 
            header_background: profile.headerBackground,
            email: profile.email
        });
    } else {
        SecureStorage.setItem('local_profile', profile);
    }
};

export const fetchUserSettings = async () => {
    if (currentUserId !== 'guest') {
        const { data } = await supabase.from('user_settings').select('data').eq('user_id', currentUserId).single();
        return data?.data || null;
    }
    return SecureStorage.getItem('local_settings');
};

export const syncUserSettings = async (settings: any) => {
    if (currentUserId !== 'guest') {
        await supabase.from('user_settings').upsert({
            user_id: currentUserId,
            data: settings,
            updated_at: new Date().toISOString()
        });
    } else {
        SecureStorage.setItem('local_settings', settings);
    }
};

// --- CUSTOM PERSONAS ---
export const fetchCustomPersonas = async (): Promise<Persona[]> => {
    if (currentUserId !== 'guest') {
        const { data } = await supabase.from('custom_personas').select('data').eq('user_id', currentUserId);
        return data ? data.map((d: any) => d.data) : [];
    }
    return SecureStorage.getItem('custom_personas') || [];
};

export const saveCustomPersona = async (persona: Persona) => {
    if (currentUserId !== 'guest') {
        await supabase.from('custom_personas').upsert({
            id: persona.id,
            user_id: currentUserId,
            data: persona
        });
    } else {
        const existing = SecureStorage.getItem('custom_personas') || [];
        const updated = existing.filter((p: Persona) => p.id !== persona.id);
        updated.push(persona);
        SecureStorage.setItem('custom_personas', updated);
    }
};

// --- CHAT HISTORY (Encrypted) ---
export const syncChatHistory = async (personaId: string, messages: Message[]) => {
    if (currentUserId !== 'guest') {
        const encrypted = encryptData(messages);
        await supabase.from('chat_histories').upsert({ 
            user_id: currentUserId, 
            persona_id: personaId, 
            messages: encrypted 
        });
    } else {
        const safeLocalHistory = messages.slice(-100); 
        SecureStorage.setItem(`chat_history_${personaId}`, safeLocalHistory);
    }
};

export const fetchChatHistory = async (personaId: string): Promise<Message[] | null> => {
    if (currentUserId !== 'guest') {
        const { data } = await supabase
            .from('chat_histories')
            .select('messages')
            .eq('user_id', currentUserId)
            .eq('persona_id', personaId)
            .single();
        if (data?.messages) return decryptData(data.messages);
    }
    return SecureStorage.getItem(`chat_history_${personaId}`);
};

// --- DRIVE / STORAGE SYSTEM ---
export const fetchDriveItems = async (parentId: string | null) => {
    if (currentUserId === 'guest') {
        const vfs = SecureStorage.getItem('akasha_drive_vfs') as DriveItem[] || [];
        return parentId === null 
            ? vfs.filter(i => !i.parent_id) 
            : vfs.filter(i => i.parent_id === parentId);
    }

    let q = supabase.from('drive_items').select('*').eq('user_id', currentUserId);
    if (parentId === null) q = q.is('parent_id', null);
    else q = q.eq('parent_id', parentId);
    
    const { data } = await q;
    return data || [];
};

export const saveDriveItem = async (item: DriveItem) => {
    if (currentUserId === 'guest') {
        const vfs = SecureStorage.getItem('akasha_drive_vfs') as DriveItem[] || [];
        const idx = vfs.findIndex(i => i.id === item.id);
        if (idx >= 0) vfs[idx] = item;
        else vfs.push(item);
        return SecureStorage.setItem('akasha_drive_vfs', vfs);
    }

    const { error } = await supabase.from('drive_items').upsert({
        ...item,
        user_id: currentUserId
    });
    return !error;
};

// --- LOGGING ---
export const logSystemEvent = async (message: string, type: 'info' | 'warn' | 'error' | 'success' = 'info') => {
    if (supabase) {
        await supabase.from('system_logs').insert({ message, type });
    }
};

// --- UTILS ---
export const updateSupabaseCredentials = (u: string, k: string) => {
    // Re-initialize with new creds
    supabase = createClient(u, k);
    return !!supabase;
};
