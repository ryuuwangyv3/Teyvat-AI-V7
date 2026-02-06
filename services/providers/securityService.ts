
import CryptoJS from 'crypto-js';

// --- ADVANCED SECURITY CONFIGURATION ---
const STORAGE_PREFIX = "akasha_vault_v16_"; 
const ADMIN_CREDENTIAL_HASH = "d6b1be7bd9de748116082287da603d812db1d274dd44198716973ca558a1a416"; // SHA-256 of "admin"

// --- 1. ENCRYPTION KEYS ---
// Simplified salt generation to prevent runtime errors on different environments
const getDynamicSalt = () => {
    try {
        if (typeof window === 'undefined') return "AKASHA_SERVER_SALT";
        // Use simpler fingerprinting that won't crash
        return "AKASHA_DEVICE_V1_" + (window.location.hostname || "local");
    } catch {
        return "AKASHA_FALLBACK_SALT";
    }
};

// --- 2. CRYPTOGRAPHIC FUNCTIONS ---

export const hashData = (data: string): string => {
    try {
        return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
    } catch (e) { return ""; }
};

export const verifyAdminPassword = (input: string): boolean => {
    if (!input) return false;
    const hashedInput = hashData(input.trim());
    return hashedInput === ADMIN_CREDENTIAL_HASH;
};

export const encryptData = (data: any): string => {
    try {
        const stringValue = typeof data === 'string' ? data : JSON.stringify(data);
        return CryptoJS.AES.encrypt(stringValue, getDynamicSalt()).toString();
    } catch (e) {
        // Fallback: Return raw data if encryption fails (to prevent app crash)
        console.warn("Encryption failed, falling back to raw storage.");
        return typeof data === 'string' ? data : JSON.stringify(data);
    }
};

export const decryptData = (encryptedStr: string): any => {
    try {
        if (!encryptedStr) return null;
        
        // Try decrypting
        const bytes = CryptoJS.AES.decrypt(encryptedStr, getDynamicSalt());
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        
        if (decrypted) {
            try { return JSON.parse(decrypted); } catch { return decrypted; }
        }
        
        // If decryption returns empty, it might be raw data (legacy or fallback)
        try { return JSON.parse(encryptedStr); } catch { return encryptedStr; }
        
    } catch (e) { 
        return null; 
    }
};

// --- 3. SECURE STORAGE WRAPPER ---

export const SecureStorage = {
    setItem: (key: string, value: any): boolean => {
        try {
            const encrypted = encryptData(value);
            localStorage.setItem(STORAGE_PREFIX + key, encrypted);
            return true;
        } catch (e) { return false; }
    },
    getItem: (key: string) => {
        try {
            const item = localStorage.getItem(STORAGE_PREFIX + key);
            // Compatibility: Try checking without prefix if not found (migration)
            const fallbackItem = item || localStorage.getItem(key);
            if (!fallbackItem) return null;
            
            return decryptData(fallbackItem);
        } catch (e) { return null; }
    },
    removeItem: (key: string) => {
        localStorage.removeItem(STORAGE_PREFIX + key);
        localStorage.removeItem(key); // Clean legacy
    },
    clear: () => {
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith(STORAGE_PREFIX) || k.startsWith('akasha_')) localStorage.removeItem(k);
        });
    }
};

// --- 4. RUNTIME PROTECTION (PASSIVE MODE) ---
// Removed aggressive loops and console poisoning to prevent "Blank Screen" errors
export const enableRuntimeProtection = () => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    // Basic Right-Click Protection (Optional, can be disabled if hindering debugging)
    document.addEventListener('contextmenu', (e) => {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        if (!isInput) {
            // e.preventDefault(); // Uncomment to re-enable
        }
    }, { capture: true });

    console.log("%cAKASHA SYSTEM ONLINE", "color: #d3bc8e; font-size: 12px; font-weight: bold; background: #000; padding: 4px; border-radius: 4px;");
};
