
export enum MenuType {
  LIVE_CALL = 'live_call',
  TERMINAL = 'terminal',
  PERSONAS = 'personas',
  USER_INFO = 'user_info',
  API_KEY = 'api_key',
  VOICE_SETTINGS = 'voice_settings',
  VISION_GEN = 'vision_gen',
  VIDEO_GEN = 'video_gen',
  LANGUAGE = 'language',
  DASHBOARD = 'dashboard',
  STORAGE = 'storage',
  ABOUT = 'about',
  FORUM = 'forum',
  ADMIN_CONSOLE = 'admin_console',
  REALM_PORTAL = 'realm_portal'
}

export interface Language {
  id: string;
  label: string;
  flag: string;
  instruction: string;
  code: string;
}

export interface Persona {
  id: string;
  name: string;
  avatar: string;
  description: string;
  systemInstruction: string;
  voiceName: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
  pitch?: number; 
  speed?: number; 
  visualSummary: string; // Base character description
  region: 'Teyvat' | 'Mondstadt' | 'Liyue' | 'Inazuma' | 'Sumeru' | 'Fontaine' | 'Natlan' | 'Snezhnaya' | 'Khaenriah' | 'Akasha';
  isCustom?: boolean;
}

export interface Attachment {
  name: string;
  url: string;
  type: string;
  size?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  translatedText?: string;
  showTranslation?: boolean;
  imageUrl?: string;
  audioUrl?: string;
  audioBase64?: string;
  timestamp: number;
  isVoiceNote?: boolean;
  attachments?: Attachment[];
  model?: string;
  replyTo?: {
    id: string;
    text: string;
    role: string;
  };
  groundingMetadata?: any; // Added for search grounding
}

export interface GitHubConfig {
  owner: string;
  repo: string;
  branch: string;
  token?: string;
  autoSync: boolean;
}

export interface UserProfile {
  id?: string;
  username: string;
  bio: string;
  avatar: string;
  headerBackground: string;
  email?: string;
  isAuth?: boolean;
  githubConfig?: GitHubConfig;
}

export interface VoiceConfig {
  speed: number;
  pitch: number;
  reverb: number;
  voiceId?: string;
  eqLow?: number;
  eqMid?: number;
  eqHigh?: number;
  gain?: number;
  noise?: number;
  autoPlay?: boolean;
}

export type FileType = 'folder' | 'image' | 'video' | 'audio' | 'text' | 'code' | 'binary';

export interface DriveItem {
    id: string;
    parent_id: string | null;
    name: string;
    type: FileType;
    size: number;
    content?: string;
    mime_type?: string;
    created_at: number;
    updated_at: number;
    starred?: boolean;
    github_sha?: string; 
}

export interface ApiKeyData {
  key: string;
  provider: 'google' | 'openai' | 'huggingface' | 'openrouter' | 'pollinations' | 'puter';
  isValid?: boolean | null;
  lastChecked: number;
  label?: string;
}

export interface SystemLog {
  id: string;
  message: string;
  type: 'info' | 'warn' | 'error' | 'success';
  created_at: string;
}

export interface ForumPost {
  id: string;
  author_id: string | null;
  author: string;
  avatar: string;
  title: string;
  content: string;
  tag: string;
  media_url?: string;
  likes: number;
  dislikes: number;
  rating?: number;
  created_at: string;
  updated_at: string;
}

export interface ForumComment {
  id: string;
  post_id: string;
  author: string;
  avatar: string;
  content: string;
  created_at: string;
}

export interface Donator {
  id: string;
  name: string;
  amount: string;
  message: string;
  avatar: string;
  platform: string;
  created_at: string;
}

export interface SupabaseConfig {
  url: string;
  key: string;
  isValid?: boolean;
}
