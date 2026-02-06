import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { 
    Copy, Check, Edit2, Volume2, Trash2, Loader2, Cpu, ExternalLink, 
    Reply, Globe2, X, Save, RefreshCw, Youtube, Search, Monitor, 
    Image as LucideImage, Expand, ShieldCheck, Languages as TranslateIcon,
    File as GenericFile, FileCode, Music, Film, FileText, Play, Terminal as TerminalIcon
} from 'lucide-react';
import { Message, UserProfile, Persona, VoiceConfig } from '../types';
import LazyImage from './LazyImage';
import AudioPlayer from './AudioPlayer';
import { getYoutubeId } from '../utils/youtubeUtils';

// --- STYLED COMPONENTS (Genshin/Akasha Theme) ---
const AKASHA_THEME = {
    gold: "#d3bc8e",
    panel: "bg-[#0b0e14]/90 backdrop-blur-md border border-[#d3bc8e]/20 shadow-[inset_0_0_20px_rgba(0,0,0,0.4)]",
    userBubble: "bg-[#3d447a] text-white shadow-[0_4px_15px_rgba(61,68,122,0.3)]",
    fontMono: "font-mono tracking-tight"
};

// ... (Helper functions getFileIcon, formatSize, parseTimestampToSeconds tetap sama) ...

const WebPortalFrame: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    return (
        <div className="mt-4 w-full animate-in zoom-in-95 slide-in-from-top-2 duration-300">
            <div className={`overflow-hidden border-2 border-[#d3bc8e]/40 rounded-xl ${AKASHA_THEME.panel}`}>
                <div className="px-4 py-2 bg-[#131823] border-b border-[#d3bc8e]/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-[10px] font-bold text-[#d3bc8e] uppercase tracking-widest truncate max-w-[200px]">
                            Portal: {new URL(url).hostname}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setRefreshKey(k => k+1)} className="p-1 text-gray-400 hover:text-white"><RefreshCw size={14}/></button>
                        <button onClick={onClose} className="p-1 bg-red-500/20 text-red-400 rounded-md hover:bg-red-500 hover:text-white transition-all"><X size={14}/></button>
                    </div>
                </div>
                <div className="relative aspect-video sm:aspect-[16/10] bg-white">
                    {isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b0e14] z-10">
                            <Loader2 className="w-8 h-8 text-[#d3bc8e] animate-spin mb-2" />
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Resonating...</span>
                        </div>
                    )}
                    <iframe 
                        key={refreshKey}
                        src={url} 
                        className="w-full h-full border-0" 
                        onLoad={() => setIsLoading(false)}
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                        loading="lazy"
                    />
                </div>
                <div className="px-4 py-1.5 bg-[#0b0e14] flex items-center justify-center border-t border-white/5">
                    <p className="text-[8px] text-gray-500 font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                        <ShieldCheck size={10} /> Akasha Sandbox Secure
                    </p>
                </div>
            </div>
        </div>
    );
};

const MessageItem = React.memo<MessageItemProps>(({ 
    msg, userProfile, currentPersona, editingId, editValue, copiedId, isTranslating, generatingTTSId, 
    onLightbox, onEditChange, onSaveEdit, onCancelEdit, onCopy, onTranslate, onToggleTranslation, onDelete, onEditStart, onPlayTTS, onReply, voiceConfig, isLatest = false 
}) => {
    
    const [activePortal, setActivePortal] = useState<string | null>(null);

    // OPTIMASI: Pindahkan parsing konten ke useMemo yang lebih ketat
    const { formattedContent, embeds } = useMemo(() => {
        const text = msg.text;
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const foundUrls = text.match(urlRegex) || [];
        
        const embedElements = foundUrls
            .filter(url => !url.includes('vertexaisearch.cloud.google.com'))
            .map((url, i) => <SmartEmbed key={`embed-${i}`} url={url} onPortal={setActivePortal} />);

        return { formattedContent: text, embeds: embedElements };
    }, [msg.text]);

    // OPTIMASI: Bungkus render function agar tidak dibuat ulang kecuali perlu
    const renderText = useCallback((content: string) => {
        if (!content) return null;
        
        // Split by code blocks first
        const blocks = content.split(/(```[\s\S]*?```)/g);
        
        return blocks.map((block, i) => {
            if (block.startsWith('```')) {
                const match = block.match(/```(\w*)\n?([\s\S]*?)?```/);
                return <CodeBlock key={i} code={match?.[2] || ''} lang={match?.[1] || 'fragment'} />;
            }

            // Inline processing (links, timestamps, inline code)
            // Menggunakan fragment untuk performa
            return (
                <span key={i} className="message-text-segment">
                    {block.split(/(`[^`]+`)/g).map((sub, j) => {
                        if (sub.startsWith('`')) return <code key={j} className="bg-black/40 px-1.5 py-0.5 rounded font-mono text-amber-300 text-[11px] border border-white/5 mx-0.5">{sub.slice(1, -1)}</code>;
                        
                        // Link & Timestamp Logic
                        return sub.split(/(https?:\/\/[^\s]+)/g).map((part, k) => {
                            if (part.match(/^https?:\/\//)) {
                                return <a key={k} href={part} target="_blank" rel="noreferrer" className="text-amber-400 underline hover:text-amber-300 transition-colors font-bold">{part}</a>;
                            }
                            return part; // Raw text
                        });
                    })}
                </span>
            );
        });
    }, []);

    const isEditing = editingId === msg.id;

    return (
      <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full mb-6 group animate-in slide-in-from-bottom-2 duration-300`}>
        <div className={`max-w-[92%] lg:max-w-[80%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
          
          {/* Header: Avatar & Name */}
          <div className={`flex items-center gap-2 mb-1.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className="relative">
                <LazyImage 
                    src={msg.role === 'user' ? userProfile.avatar : currentPersona.avatar} 
                    className="w-8 h-8 lg:w-10 lg:h-10 rounded-full border-2 border-[#d3bc8e]/40 shadow-lg object-cover" 
                    alt="avatar" 
                />
                {isLatest && msg.role === 'model' && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-[#0b0e14] rounded-full animate-pulse"></div>
                )}
            </div>
            <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] font-black text-[#d3bc8e] uppercase tracking-[0.15em] leading-none mb-1">
                    {msg.role === 'user' ? userProfile.username : currentPersona.name}
                </span>
                {msg.role === 'model' && msg.model && (
                    <div className="flex items-center gap-1 opacity-70">
                        <Cpu size={8} className="text-[#d3bc8e]" />
                        <span className="text-[7px] font-bold text-[#d3bc8e] uppercase">{msg.model}</span>
                    </div>
                )}
            </div>
          </div>

          {/* Message Bubble */}
          <div className={`relative rounded-2xl w-full transition-all duration-300 ${
              msg.role === 'user' ? AKASHA_THEME.userBubble : AKASHA_THEME.panel
          }`}>
            
            <div className="px-4 py-3">
                {/* Reply Context */}
                {msg.replyTo && (
                    <div className="mb-3 p-2 bg-black/20 border-l-2 border-[#d3bc8e] rounded-r-lg opacity-80 text-[10px]">
                        <p className="italic text-gray-400 truncate">"{msg.replyTo.text}"</p>
                    </div>
                )}

                {/* Main Content */}
                {isEditing ? (
                    <div className="space-y-3">
                        <textarea 
                            value={editValue} 
                            onChange={(e) => onEditChange(e.target.value)} 
                            className="w-full bg-black/40 border border-[#d3bc8e]/50 rounded-xl p-3 text-sm text-white focus:ring-1 focus:ring-[#d3bc8e] outline-none min-h-[100px] font-medium"
                            autoFocus 
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={onCancelEdit} className="px-3 py-1.5 text-[10px] font-bold uppercase text-gray-400 hover:text-white transition-colors">Cancel</button>
                            <button onClick={() => onSaveEdit(msg.id, editValue, false)} className="px-4 py-1.5 bg-[#d3bc8e]/20 text-[#d3bc8e] border border-[#d3bc8e]/40 rounded-lg text-[10px] font-black uppercase hover:bg-[#d3bc8e] hover:text-black transition-all">Save Changes</button>
                        </div>
                    </div>
                ) : (
                    <div className="text-xs lg:text-[13px] leading-relaxed select-text font-medium break-words space-y-2">
                        {renderText(formattedContent)}
                        
                        {/* Image/Artifacts Logic */}
                        {msg.imageUrl && (
                            <div className="mt-3 rounded-xl overflow-hidden border border-[#d3bc8e]/30 group cursor-zoom-in" onClick={() => onLightbox(msg.imageUrl!)}>
                                <img src={msg.imageUrl} className="w-full max-h-[400px] object-cover transition-transform group-hover:scale-105" alt="AI Gen" />
                            </div>
                        )}

                        {/* Embeds & Metadata */}
                        {embeds}
                        {msg.groundingMetadata && <GroundingSources metadata={msg.groundingMetadata} onPortal={setActivePortal} />}
                        {activePortal && <WebPortalFrame url={activePortal} onClose={() => setActivePortal(null)} />}
                    </div>
                )}
            </div>

            {/* Footer: Audio & Actions */}
            <div className="px-4 py-2 bg-black/20 flex flex-col gap-2 border-t border-white/5">
                {msg.audioUrl && (
                    <AudioPlayer 
                        audioUrl={msg.audioUrl} 
                        initialVolume={1.0} 
                        voiceConfig={voiceConfig} 
                        autoPlay={isLatest && (Date.now() - msg.timestamp < 30000)} 
                    />
                )}
                
                <div className="flex items-center gap-4 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onCopy(msg.text, msg.id)} className="flex items-center gap-1.5 text-[9px] font-black text-gray-500 hover:text-[#d3bc8e] transition-colors uppercase tracking-widest">
                        {copiedId === msg.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                        {copiedId === msg.id ? 'Copied' : 'Copy'}
                    </button>

                    <button onClick={() => onReply(msg)} className="flex items-center gap-1.5 text-[9px] font-black text-gray-500 hover:text-[#d3bc8e] uppercase tracking-widest">
                        <Reply size={12} /> Reply
                    </button>

                    <button onClick={() => onEditStart(msg)} className="flex items-center gap-1.5 text-[9px] font-black text-gray-500 hover:text-[#d3bc8e] uppercase tracking-widest">
                        <Edit2 size={12} /> Edit
                    </button>

                    {msg.role === 'model' && (
                        <button 
                            onClick={() => msg.translatedText ? onToggleTranslation(msg.id) : onTranslate(msg.id, msg.text)}
                            className="flex items-center gap-1.5 text-[9px] font-black text-[#d3bc8e] uppercase tracking-widest"
                        >
                            <TranslateIcon size={12} /> {msg.showTranslation ? 'Original' : 'Translate'}
                        </button>
                    )}

                    <button onClick={() => onDelete(msg.id)} className="ml-auto p-1 text-gray-600 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
          </div>
        </div>
      </div>
    );
});

export default MessageItem;
