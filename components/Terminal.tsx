import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    Send, Loader2, Terminal as TerminalIcon, Mic, Paperclip, X, Download, 
    Reply, RefreshCw, FileText, Image as ImageIcon, FileCode, Music, Film, 
    File as GenericFile, Sparkles, Cpu, Search, Monitor, Globe
} from 'lucide-react';
import { Persona, UserProfile, Message, Language, VoiceConfig } from '../types';
import { chatWithAI, generateImage, translateText, generateTTS } from '../services/geminiService';
import MessageItem from './MessageItem';
import { syncChatHistory, fetchChatHistory } from '../services/supabaseService';
import { getYoutubeId, fetchDetailedYoutubeMetadata } from '../utils/youtubeUtils';
import { AI_MODELS } from '../data';

interface TerminalProps {
    currentPersona: Persona;
    userProfile: UserProfile;
    currentLanguage: Language;
    voiceConfig: VoiceConfig;
    selectedModel: string;
    onError: (msg: string) => void;
    isSupabaseConnected: boolean;
}

interface PendingAttachment {
    file: File;
    previewUrl: string;
    type: string;
    base64Data?: string;
}

const Terminal: React.FC<TerminalProps> = ({ 
    currentPersona, userProfile, currentLanguage, voiceConfig, selectedModel, onError, isSupabaseConnected 
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [typingStatus, setTypingStatus] = useState('');
    const [generatingTTSId, setGeneratingTTSId] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [lastPersonaImageUrl, setLastPersonaImageUrl] = useState<string | null>(null);
    const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
    
    // UI State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [isTranslating, setIsTranslating] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
    const [isRecording, setIsRecording] = useState(false);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
        messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
    }, []);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
        }
    }, [input]);

    // 1. Initial Load History
    useEffect(() => {
        const loadHistory = async () => {
            setIsHistoryLoaded(false);
            try {
                const history = await fetchChatHistory(currentPersona.id);
                if (history && history.length > 0) {
                    setMessages(history);
                    const lastImg = [...history].reverse().find(m => m.role === 'model' && m.imageUrl)?.imageUrl;
                    if (lastImg) setLastPersonaImageUrl(lastImg);
                } else {
                    setMessages([]);
                }
            } catch (err) { 
                console.error("[Akasha] History Load Error:", err); 
            } finally {
                setIsHistoryLoaded(true);
                setTimeout(() => scrollToBottom("auto"), 100);
            }
        };
        loadHistory();
    }, [currentPersona.id, scrollToBottom]);

    // 2. Auto-Sync to Supabase
    useEffect(() => {
        if (isHistoryLoaded && isSupabaseConnected) {
            const timer = setTimeout(() => {
                syncChatHistory(currentPersona.id, messages);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [messages, currentPersona.id, isHistoryLoaded, isSupabaseConnected]);

    // Voice Recorder Logic
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];
            recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
            recorder.onstop = async () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                    const base64 = (reader.result as string).split(',')[1];
                    handleSendMessage(undefined, { base64, mimeType: 'audio/webm' }, URL.createObjectURL(blob));
                };
                stream.getTracks().forEach(t => t.stop());
            };
            recorder.start();
            setIsRecording(true);
        } catch (err) {
            onError("Microphone access denied.");
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    };

    // File Handling
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setPendingAttachments(prev => [...prev, {
                    file,
                    previewUrl: file.type.startsWith('image/') ? ev.target?.result as string : '',
                    type: file.type,
                    base64Data: (ev.target?.result as string).split(',')[1]
                }]);
            };
            reader.readAsDataURL(file);
        });
    };

    // THE CORE: Send Message Logic
    const handleSendMessage = async (textOverride?: string, audioData?: { base64: string, mimeType: string }, userAudioUrl?: string) => {
        const content = textOverride ?? input;
        if ((!content.trim() && pendingAttachments.length === 0 && !audioData) || isTyping) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: content || (audioData ? "🎤 Voice Note" : ""),
            timestamp: Date.now(),
            replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, role: replyingTo.role } : undefined,
            audioUrl: userAudioUrl,
            attachments: pendingAttachments.map(pa => ({ name: pa.file.name, url: pa.previewUrl, type: pa.type, size: pa.file.size }))
        };

        const activeAttachments = [...pendingAttachments];
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setPendingAttachments([]);
        setReplyingTo(null);
        setIsTyping(true);
        setTypingStatus('Establishing Resonance...');

        try {
            // 1. YouTube/Web Search Context
            let contextExtra = "";
            const ytId = getYoutubeId(content);
            if (ytId) {
                setTypingStatus('Querying Irminsul Records...');
                const meta = await fetchDetailedYoutubeMetadata(ytId);
                if (meta) contextExtra = `\n[CONTEXT: YouTube Video "${meta.title}"]`;
            }

            // 2. Prepare History (Last 20 messages for stability)
            const history = messages.slice(-20).map(m => ({ role: m.role, content: m.text }));

            // 3. System Instruction & Prompt Engineering
            const systemPrompt = `${currentPersona.systemInstruction}
[TIME_LOG]: ${new Date().toLocaleString()}
[TRAVELER]: ${userProfile.username}
[VISUAL_RULE]: If requested for a photo/pap/selfie, use tag ||GEN_IMG: description||.`;

            const imageParts = activeAttachments.filter(a => a.type.startsWith('image/')).map(a => ({ inlineData: { mimeType: a.type, data: a.base64Data! } }));

            // 4. AI Call
            const response = await chatWithAI(
                selectedModel,
                history,
                `${contextExtra}\n${content}`,
                systemPrompt,
                `Akasha: ${currentPersona.name}`,
                imageParts,
                [], 
                audioData
            );

            // 5. Visual Generation Logic
            let finalImgUrl: string | undefined;
            const visualMatch = response.text.match(/\|\|GEN_IMG:\s*([\s\S]*?)\s*\|\|/i);
            const isRequestingPic = /(pap|foto|selfie|liat|minta gambar)/i.test(content);

            if (visualMatch || isRequestingPic) {
                setTypingStatus('Manifesting Visual Matrix...');
                const imgPrompt = visualMatch ? visualMatch[1] : `${currentPersona.visualSummary}, ${response.text.substring(0, 100)}`;
                
                try {
                    // Try to generate with appropriate model
                    const genImg = await generateImage(imgPrompt, currentPersona.id, lastPersonaImageUrl ? [lastPersonaImageUrl] : [], undefined, 'flux');
                    if (genImg) {
                        finalImgUrl = genImg;
                        setLastPersonaImageUrl(genImg);
                    }
                } catch (e) {
                    console.error("Image Gen Failed", e);
                }
            }

            const modelMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: response.text.replace(/\|\|GEN_IMG:[\s\S]*?\|\|/gi, '').trim(),
                imageUrl: finalImgUrl,
                timestamp: Date.now(),
                model: selectedModel,
                groundingMetadata: response.metadata
            };

            setMessages(prev => [...prev, modelMsg]);

            if (voiceConfig.autoPlay) {
                handlePlayTTS(modelMsg.id, modelMsg.text);
            }

        } catch (err: any) {
            onError(err.message || "Connection Lost.");
        } finally {
            setIsTyping(false);
            setTypingStatus('');
            setTimeout(() => scrollToBottom(), 100);
        }
    };

    const handlePlayTTS = async (id: string, text: string) => {
        if (generatingTTSId) return;
        setGeneratingTTSId(id);
        try {
            const audio = await generateTTS(text, currentPersona.voiceName);
            if (audio) {
                setMessages(prev => prev.map(m => m.id === id ? { ...m, audioUrl: `data:audio/wav;base64,${audio}` } : m));
            }
        } catch (e) {
            console.error("TTS Error", e);
        } finally {
            setGeneratingTTSId(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0b0e14] font-sans text-[#ece5d8] overflow-hidden">
            {/* Lightbox Portal */}
            {lightboxUrl && (
                <div className="fixed inset-0 z-[999] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in" onClick={() => setLightboxUrl(null)}>
                    <div className="relative max-w-5xl w-full flex flex-col items-center">
                        <img src={lightboxUrl} className="max-h-[80vh] rounded-2xl border border-[#d3bc8e]/30 shadow-2xl transition-transform hover:scale-[1.02]" alt="visual" onClick={e => e.stopPropagation()} />
                        <div className="mt-6 flex gap-4">
                            <button onClick={() => window.open(lightboxUrl, '_blank')} className="px-6 py-2 bg-[#d3bc8e] text-black font-black rounded-full uppercase text-[10px] tracking-widest hover:bg-white transition-all">Extract Data</button>
                            <button onClick={() => setLightboxUrl(null)} className="px-6 py-2 bg-white/10 text-white font-black rounded-full uppercase text-[10px] tracking-widest hover:bg-red-500 transition-all">Close Portal</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Messages Archive */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 lg:px-8 py-6">
                <div className="max-w-4xl mx-auto space-y-8">
                    {messages.length === 0 && !isTyping && (
                        <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
                            <TerminalIcon size={48} className="text-[#d3bc8e] mb-4" />
                            <h2 className="text-xl font-serif uppercase tracking-[0.3em] text-[#d3bc8e]">Akasha Terminal</h2>
                            <p className="text-[10px] uppercase tracking-widest mt-2">Waiting for Neural Link...</p>
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <MessageItem 
                            key={msg.id} 
                            msg={msg} 
                            userProfile={userProfile} 
                            currentPersona={currentPersona}
                            editingId={editingId}
                            editValue={editValue}
                            copiedId={copiedId}
                            isTranslating={isTranslating}
                            generatingTTSId={generatingTTSId}
                            onLightbox={setLightboxUrl}
                            onEditChange={setEditValue}
                            onSaveEdit={(id, val, regen) => {
                                setEditingId(null);
                                if (regen) {
                                    setMessages(prev => prev.slice(0, prev.findIndex(m => m.id === id)));
                                    handleSendMessage(val);
                                } else {
                                    setMessages(prev => prev.map(m => m.id === id ? { ...m, text: val } : m));
                                }
                            }}
                            onCancelEdit={() => setEditingId(null)}
                            onCopy={(t, id) => { navigator.clipboard.writeText(t); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); }}
                            onTranslate={async (id, t) => {
                                setIsTranslating(id);
                                try {
                                    const res = await translateText(t, 'id');
                                    setMessages(prev => prev.map(m => m.id === id ? { ...m, translatedText: res, showTranslation: true } : m));
                                } finally { setIsTranslating(null); }
                            }}
                            onToggleTranslation={(id) => setMessages(prev => prev.map(m => m.id === id ? { ...m, showTranslation: !m.showTranslation } : m))}
                            onDelete={(id) => setMessages(prev => prev.filter(m => m.id !== id))}
                            onEditStart={(m) => { setEditingId(m.id); setEditValue(m.text); }}
                            onPlayTTS={handlePlayTTS}
                            onReply={setReplyingTo}
                            voiceConfig={voiceConfig}
                            isLatest={idx === messages.length - 1}
                        />
                    ))}

                    {isTyping && (
                        <div className="flex items-center gap-3 p-3 bg-[#1a1f2e] border border-[#d3bc8e]/20 rounded-full w-fit animate-pulse">
                            <Sparkles size={14} className="text-[#d3bc8e] animate-spin" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#d3bc8e]">{typingStatus}</span>
                        </div>
                    )}
                </div>
                <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Neural Input Interface */}
            <div className="p-4 lg:p-8 bg-[#0d111c] border-t border-[#d3bc8e]/20 backdrop-blur-2xl">
                <div className="max-w-4xl mx-auto">
                    {/* Replying Status */}
                    {replyingTo && (
                        <div className="mb-4 p-3 bg-[#d3bc8e]/10 border-l-4 border-[#d3bc8e] rounded-r-xl flex items-center justify-between animate-in slide-in-from-bottom-2">
                            <div className="truncate pr-4">
                                <span className="text-[9px] font-black text-[#d3bc8e] uppercase">Replying to {replyingTo.role}</span>
                                <p className="text-xs text-gray-400 italic truncate">"{replyingTo.text}"</p>
                            </div>
                            <button onClick={() => setReplyingTo(null)} className="text-gray-500 hover:text-white"><X size={16} /></button>
                        </div>
                    )}

                    {/* Attachment Previews */}
                    {pendingAttachments.length > 0 && (
                        <div className="flex gap-3 mb-4 overflow-x-auto pb-2">
                            {pendingAttachments.map((pa, i) => (
                                <div key={i} className="relative shrink-0 group">
                                    <div className="w-16 h-16 rounded-xl border-2 border-[#d3bc8e]/30 overflow-hidden bg-black">
                                        {pa.previewUrl ? <img src={pa.previewUrl} className="w-full h-full object-cover" alt="" /> : <div className="flex items-center justify-center h-full"><FileText size={20} /></div>}
                                    </div>
                                    <button onClick={() => setPendingAttachments(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} /></button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-end gap-3 lg:gap-6">
                        {/* Voice Transmit */}
                        <button 
                            onMouseDown={startRecording} onMouseUp={stopRecording}
                            onTouchStart={(e) => { e.preventDefault(); startRecording(); }} onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isRecording ? 'bg-red-600 animate-pulse shadow-[0_0_20px_red]' : 'bg-[#d3bc8e]/10 border border-[#d3bc8e]/30 text-[#d3bc8e] hover:bg-[#d3bc8e]/20'}`}
                        >
                            <Mic size={24} className={isRecording ? 'text-white' : ''} />
                        </button>

                        <div className="flex-1 relative group">
                            <textarea 
                                ref={textareaRef}
                                value={input} 
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey && window.innerWidth > 1024) { e.preventDefault(); handleSendMessage(); }}}
                                placeholder={`Communicate with ${currentPersona.name}...`}
                                className="w-full bg-[#1a1f2e] border border-white/10 rounded-[1.5rem] px-6 py-4 text-white focus:border-[#d3bc8e] focus:outline-none resize-none max-h-40 custom-scrollbar transition-all"
                                rows={1}
                            />
                            <button onClick={() => fileInputRef.current?.click()} className="absolute right-4 bottom-4 text-gray-500 hover:text-[#d3bc8e]"><Paperclip size={20} /></button>
                            <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileSelect} />
                        </div>

                        <button 
                            onClick={() => handleSendMessage()}
                            disabled={(!input.trim() && pendingAttachments.length === 0) || isTyping}
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${input.trim() || pendingAttachments.length > 0 ? 'bg-[#d3bc8e] text-black hover:scale-105 active:scale-95 shadow-lg shadow-[#d3bc8e]/20' : 'bg-white/5 text-gray-700 grayscale'}`}
                        >
                            <Send size={24} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Terminal;
