
import React, { useState } from 'react';
import {
  Database,
  Copy,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import { checkSchemaHealth } from '../services/supabaseService';

interface DatabaseSetupModalProps {
  onClose: () => void;
}

const SQL_SCRIPT = `-- AKASHA TERMINAL CORE SCHEMA V8.0
-- ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USER PROFILES
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id TEXT PRIMARY KEY,
  username TEXT,
  bio TEXT,
  avatar TEXT,
  header_background TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Private Profile Access" ON public.user_profiles FOR ALL USING (auth.uid()::text = user_id);

-- 2. USER SETTINGS
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id TEXT PRIMARY KEY,
  data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Private Settings Access" ON public.user_settings FOR ALL USING (auth.uid()::text = user_id);

-- 3. CHAT HISTORY
CREATE TABLE IF NOT EXISTS public.chat_histories (
  user_id TEXT,
  persona_id TEXT,
  messages TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, persona_id)
);
ALTER TABLE public.chat_histories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Private History Access" ON public.chat_histories FOR ALL USING (auth.uid()::text = user_id);

-- 4. FORUM POSTS
CREATE TABLE IF NOT EXISTS public.forum_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id TEXT DEFAULT (auth.uid())::text,
  author TEXT,
  avatar TEXT,
  title TEXT,
  content TEXT,
  tag TEXT,
  media_url TEXT,
  likes INT DEFAULT 0,
  dislikes INT DEFAULT 0,
  rating INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Forum" ON public.forum_posts FOR SELECT USING (true);
CREATE POLICY "Auth Post Forum" ON public.forum_posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 5. DRIVE STORAGE
CREATE TABLE IF NOT EXISTS public.drive_items (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  parent_id TEXT,
  name TEXT,
  type TEXT,
  size BIGINT,
  content TEXT,
  mime_type TEXT,
  created_at BIGINT,
  updated_at BIGINT
);
ALTER TABLE public.drive_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Private Drive Access" ON public.drive_items FOR ALL USING (auth.uid()::text = user_id);

-- 6. SYSTEM LOGS
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT,
  type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Logs" ON public.system_logs FOR SELECT USING (true);
`;

const DatabaseSetupModal: React.FC<DatabaseSetupModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SQL_SCRIPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { alert('Copy failed.'); }
  };

  const handleCheckAgain = async () => {
    setChecking(true);
    try {
      const status = await checkSchemaHealth();
      if (status === 200) {
        alert('Resonance established.');
        onClose();
        window.location.reload();
      } else { alert('Tables still missing.'); }
    } catch { alert('Diagnostic failed.'); } finally { setChecking(false); }
  };

  return (
    <div className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="w-full max-w-3xl bg-[#0b0e14] border-2 border-amber-500/50 rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-[0_0_80px_rgba(245,158,11,0.2)]">
        <div className="p-6 flex justify-between border-b border-white/10 bg-gradient-to-r from-amber-900/20 to-transparent">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8 text-amber-500" />
            <h2 className="text-2xl font-bold uppercase genshin-font genshin-gold">System Initialization</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white"><X /></button>
        </div>
        <div className="p-6 overflow-auto font-mono text-[10px] bg-black/60 custom-scrollbar select-text leading-relaxed text-blue-300">{SQL_SCRIPT}</div>
        <div className="p-6 flex gap-3 border-t border-white/10 bg-black/40">
          <button onClick={onClose} className="flex-1 px-6 py-3 rounded-xl border border-white/10 text-gray-400 font-bold text-sm">Skip</button>
          <button onClick={handleCopy} className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${copied ? 'bg-green-600 text-white' : 'bg-amber-500 text-black hover:bg-white'}`}>
             {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Captured' : 'Copy Ritual'}
          </button>
          <button onClick={handleCheckAgain} disabled={checking} className="flex-1 genshin-button px-6 py-3 rounded-xl flex gap-2 justify-center text-sm">
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} /> Verify Resonance
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatabaseSetupModal;
