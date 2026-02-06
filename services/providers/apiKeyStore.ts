import { ApiKeyData } from '../types';
import { SecureStorage } from './securityService';

// In-memory cache untuk akses cepat selama runtime
let storedKeysCache: ApiKeyData[] = [];
const exhaustedKeys: Set<string> = new Set();

/**
 * Menyimpan key ke dalam cache memory dan SecureStorage (Encrypted)
 */
export const setStoredKeys = (keys: ApiKeyData[]) => {
    if (!Array.isArray(keys)) return;
    storedKeysCache = keys;
    SecureStorage.setItem('api_keys_vault', keys);
};

/**
 * Tandai key sebagai exhausted (habis limit/error) agar tidak dipakai lagi
 */
export const markKeyExhausted = (key: string) => {
    if (!key || typeof key !== 'string') return;
    exhaustedKeys.add(key.trim());
};

/**
 * Reset semua key yang ditandai habis (misal: ganti hari atau ganti model)
 */
export const resetExhaustedKeys = () => {
    exhaustedKeys.clear();
};

/**
 * Ambil semua key yang tersedia untuk provider tertentu.
 * Alur: User Keys (Priority) -> Env Admin Keys -> Fallback Public Keys
 */
export const getAvailableKeys = (provider: string): string[] => {
    if (!provider) return [];
    
    const target = provider.toLowerCase();
    const candidates: string[] = [];

    // 1. AMBIL DARI VAULT USER (Prioritas Utama - Data terenkripsi di local)
    const secureKeys = (SecureStorage.getItem('api_keys_vault') as ApiKeyData[]) || storedKeysCache;
    
    if (Array.isArray(secureKeys)) {
        const userEntries = secureKeys.filter(k => 
            k.provider.toLowerCase() === target && 
            k.isValid !== false && 
            k.key
        );
        
        userEntries.forEach(k => {
            if (k.key.trim().length > 5) candidates.push(k.key.trim());
        });
    }

    // 2. AMBIL DARI VITE ENVIRONMENT VARIABLES (Admin/Dev Keys)
    // REVISI: Menggunakan import.meta.env (Standar Vite) bukan process.env
    let envVar = '';
    
    try {
        if (target === 'google' || target.includes('gemini')) {
            envVar = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_API_KEY || '';
        } else if (target === 'openai') {
            envVar = import.meta.env.VITE_OPENAI_API_KEY || '';
        } else if (target === 'openrouter') {
            envVar = import.meta.env.VITE_OPENROUTER_API_KEY || '';
        } else if (target === 'pollinations') {
            envVar = import.meta.env.VITE_POLLINATIONS_API_KEY || '';
        }
    } catch (e) {
        console.warn(`[Akasha Core] Gagal mengakses environment untuk ${target}:`, e);
    }

    if (envVar) {
        // Mendukung multiple keys yang dipisah koma di .env
        const envKeys = envVar.split(',')
            .map(k => k.trim())
            .filter(k => k.length > 5);
        candidates.push(...envKeys);
    }

    // 3. FILTER OUT EXHAUSTED KEYS
    // Hapus key yang sudah masuk daftar "limit reached" atau "error"
    const validKeys = candidates.filter(k => !exhaustedKeys.has(k));

    // 4. FALLBACK KHUSUS (Public/Embedded Keys)
    if (target === 'pollinations' && validKeys.length === 0) {
        const publicKey = "pk_kcR3k4nvqWfkH92K"; // Public key default
        if (!exhaustedKeys.has(publicKey)) {
            return [publicKey];
        }
    }

    // Return unique keys (menghindari duplikasi)
    return [...new Set(validKeys)];
};

/**
 * Ambil satu key teratas untuk provider tertentu
 */
export const getStoredKey = (provider: string): string | undefined => {
    if (provider.toLowerCase() === 'puter') return "puter-embedded-auth";
    
    const keys = getAvailableKeys(provider);
    return keys.length > 0 ? keys[0] : undefined;
};
