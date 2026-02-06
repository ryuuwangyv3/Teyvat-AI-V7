
import React, { useEffect, useState } from 'react';
import { X, MessageSquare, Clock, Trash2, ChevronRight, Plus, Loader2 } from 'lucide-react';
import { PERSONAS } from '../data';
import { Persona, Message } from '../types';
import LazyImage from './LazyImage';
import { fetchChatHistory, clearChatHistory } from '../services/supabaseService';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPersona: (persona: Persona) => void;
  onNewChat: () => void; 
  activePersonaId: string;
  customPersonas: Persona[];
}

interface HistoryItem {
  persona: Persona;
  lastMessage: Message;
  messageCount: number;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ isOpen, onClose, onSelectPersona, onNewChat, activePersonaId, customPersonas }) => {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, customPersonas]);

  const loadHistory = async () => {
    setLoading(true);
    const items: HistoryItem[] = [];
    
    // Combine Default Personas + Custom Personas
    const allPersonas = [...customPersonas, ...PERSONAS];
    
    // Scan through all known personas to check for stored history in VFS
    // Using Promise.all for parallel fetching
    const results = await Promise.all(
        allPersonas.map(async (persona) => {
            try {
                const history = await fetchChatHistory(persona.id);
                if (history && Array.isArray(history) && history.length > 0) {
                    // Sort messages by timestamp
                    const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
                    const lastMessage = sorted[sorted.length - 1];
                    
                    return {
                        persona,
                        lastMessage,
                        messageCount: history.length
                    };
                }
            } catch (e) {
                console.error("Failed to load history for", persona.name, e);
            }
            return null;
        })
    );

    // Filter nulls and sort by most recent interaction
    const validItems = results.filter(item => item !== null) as HistoryItem[];
    setHistoryItems(validItems.sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp));
    setLoading(false);
  };

  const handleDeleteHistory = async (e: React.MouseEvent, personaId: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this memory thread?")) {
      await clearChatHistory(personaId);
      loadHistory(); // Reload list
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity animate-in fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel - Width Reduced to max-w-[280px] */}
      <div className={`fixed inset-y-0 right-0 z-[70] w-full max-w-[280px] bg-[#0b0e14] border-l border-white/10 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#131823]">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-bold genshin-gold uppercase tracking-widest">Resonance Log</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3 pb-0">
            <button 
                onClick={() => { onNewChat(); onClose(); }}
                className="w-full py-3 rounded-xl border border-dashed border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:border-amber-500 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)] flex items-center justify-center gap-2 transition-all group"
            >
                <div className="p-1 rounded-full bg-amber-500/20 group-hover:bg-amber-500 group-hover:text-black transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold uppercase tracking-widest text-[10px]">New Resonance</span>
            </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-amber-500/50">
                  <Loader2 className="w-6 h-6 animate-spin mb-2" />
                  <span className="text-[10px] uppercase tracking-widest">Accessing VFS...</span>
              </div>
          ) : historyItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50 px-4 text-center">
              <MessageSquare className="w-8 h-8 mb-3" />
              <p className="text-xs italic">No active resonances found.</p>
              <p className="text-[10px] mt-1">Start chatting with a Persona to save history.</p>
            </div>
          ) : (
            historyItems.map(({ persona, lastMessage, messageCount }) => (
              <div 
                key={persona.id}
                onClick={() => {
                  onSelectPersona(persona);
                  onClose();
                }}
                className={`group relative p-2.5 rounded-xl border transition-all cursor-pointer flex gap-3 items-center ${
                  activePersonaId === persona.id 
                  ? 'bg-amber-500/10 border-amber-500/50' 
                  : 'bg-[#1a1f2e] border-white/5 hover:border-white/20 hover:bg-[#252b3d]'
                }`}
              >
                <div className="relative shrink-0">
                  <LazyImage src={persona.avatar} className="w-10 h-10 rounded-full border border-white/10 object-cover" alt={persona.name} />
                  {activePersonaId === persona.id && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-[#1a1f2e] rounded-full"></span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h4 className={`text-xs font-bold truncate ${activePersonaId === persona.id ? 'text-amber-500' : 'text-gray-200'}`}>
                      {persona.name}
                    </h4>
                    <span className="text-[9px] text-gray-500 font-mono">
                      {new Date(lastMessage.timestamp).toLocaleDateString(undefined, {month: 'numeric', day: 'numeric'})}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 line-clamp-1 italic">
                    {lastMessage.role === 'user' ? 'You: ' : ''}{lastMessage.text.substring(0, 30) || 'Sent an attachment...'}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                     <span className="text-[8px] bg-white/5 px-1 py-0.5 rounded text-gray-500 border border-white/5">{messageCount} msgs</span>
                     {persona.isCustom && <span className="text-[8px] bg-purple-500/10 px-1 py-0.5 rounded text-purple-400 border border-purple-500/20">CUSTOM</span>}
                  </div>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 absolute right-2 bottom-2 bg-[#1a1f2e] shadow-lg rounded-full pl-1 border border-white/5">
                   <button 
                     onClick={(e) => handleDeleteHistory(e, persona.id)}
                     className="p-1 text-gray-400 hover:text-red-500 hover:bg-white/5 rounded-full"
                     title="Delete History"
                   >
                     <Trash2 className="w-3 h-3" />
                   </button>
                   <div className="p-1 text-amber-500">
                     <ChevronRight className="w-3 h-3" />
                   </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default HistorySidebar;
