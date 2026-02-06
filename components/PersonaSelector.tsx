
import React, { useState } from 'react';
import { Plus, Star, Upload, Sparkles, X, Save, Edit3, Trash2, Loader2 } from 'lucide-react';
import { Persona } from '../types';
import { PERSONAS, VOICE_OPTIONS } from '../data';
import { analyzePersonaFromImage } from '../services/geminiService';
import LazyImage from './LazyImage';

interface PersonaSelectorProps {
  onSelect: (p: Persona) => void;
  onCustomAdd: (p: Persona) => void;
  onDeleteCustom: (id: string) => void;
  activePersonaId: string;
  customPersonas: Persona[];
}

const PersonaSelector: React.FC<PersonaSelectorProps> = ({ onSelect, onCustomAdd, onDeleteCustom, activePersonaId, customPersonas }) => {
  const [showCreator, setShowCreator] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  
  const [customPersona, setCustomPersona] = useState<Partial<Persona>>({
    id: '',
    name: '',
    description: '',
    systemInstruction: '',
    voiceName: 'Kore',
    avatar: '',
    visualSummary: '',
    isCustom: true
  });

  // Utility: Resize & Compress Image for Storage Optimization
  const compressImage = (base64Str: string, maxWidth = 300, maxHeight = 300): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Compress to JPEG 70% quality to save space
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        } else {
            resolve(base64Str); // Fallback
        }
      };
      img.onerror = () => resolve(base64Str);
    });
  };

  const handleEdit = (e: React.MouseEvent, persona: Persona) => {
    e.stopPropagation();
    setCustomPersona({ ...persona, isCustom: true }); 
    setEditMode(true);
    setShowCreator(true);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this custom soul data permanently?")) {
      onDeleteCustom(id);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawBase64 = event.target?.result as string;
      const optimizedAvatar = await compressImage(rawBase64);
      
      if (!editMode) {
          setIsAnalyzing(true);
          try {
            const analysis = await analyzePersonaFromImage(optimizedAvatar);
            const lore = `[IDENTITY]\nYou are ${analysis.name}. ${analysis.description}\n\n[PERSONALITY]\n${analysis.personality}\n\n[BACKGROUND]\n${analysis.background}\n\n[SPEECH PATTERN]\n${analysis.speechStyle}`;
            setCustomPersona(prev => ({
              ...prev,
              name: analysis.name || prev.name,
              avatar: optimizedAvatar,
              description: analysis.description || prev.description,
              systemInstruction: lore,
              voiceName: analysis.voiceSuggestion as any || 'Kore', 
              visualSummary: analysis.visualSummary 
            }));
            setEditMode(true);
          } catch (err) {
            setCustomPersona(prev => ({ ...prev, avatar: optimizedAvatar }));
            setEditMode(true);
          } finally {
            setIsAnalyzing(false);
          }
      } else {
          setCustomPersona(prev => ({ ...prev, avatar: optimizedAvatar }));
      }
      setIsCompressing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCustom = () => {
    if (!customPersona.name || !customPersona.systemInstruction) {
      alert("Name and Lore Script are required.");
      return;
    }
    
    const finalId = customPersona.id && customPersona.id.length > 5 ? customPersona.id : `custom_${Date.now()}`;
    
    const finalPersona: Persona = {
      ...customPersona as Persona,
      id: finalId,
      isCustom: true,
      region: 'Akasha', 
      pitch: customPersona.pitch || 1.0,
      speed: customPersona.speed || 1.0
    };
    
    try {
        onCustomAdd(finalPersona);
        setShowCreator(false);
        resetForm();
    } catch (e) {
        alert("Failed to save Persona. Storage might be full.");
    }
  };

  const resetForm = () => {
    setCustomPersona({ id: '', name: '', description: '', systemInstruction: '', voiceName: 'Kore', avatar: '', visualSummary: '', isCustom: true });
    setEditMode(false);
  };

  const allPersonas = [...customPersonas, ...PERSONAS];

  return (
    <div className="h-full p-3 lg:p-8 overflow-y-auto custom-scrollbar">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 lg:mb-8 gap-4 max-w-7xl mx-auto">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-[#d3bc8e] uppercase tracking-[0.2em] font-serif">Soul Repository</h1>
          <p className="text-[10px] lg:text-xs text-gray-500 mt-1 italic font-medium">Synchronize your consciousness with a celestial companion.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowCreator(true); }}
          className="genshin-button px-4 py-2 lg:px-6 lg:py-3 rounded-full flex items-center gap-2 shadow-[0_0_15px_rgba(211,188,142,0.2)] hover:scale-105 transition-all text-[10px] lg:text-xs"
        >
          <Sparkles className="w-3 h-3 lg:w-4 lg:h-4" />
          <span className="font-black">Create Soul</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 lg:gap-4 max-w-7xl mx-auto pb-20">
        {allPersonas.map((persona) => (
          <div 
            key={persona.id}
            onClick={() => onSelect(persona)}
            className={`genshin-card cursor-pointer flex flex-col group relative rounded-xl lg:rounded-2xl overflow-hidden border transition-all duration-300 ${
              activePersonaId === persona.id 
              ? 'border-[#d3bc8e] shadow-[0_0_20px_rgba(211,188,142,0.2)]' 
              : 'border-white/5 grayscale-[0.3] hover:grayscale-0 hover:border-white/20'
            }`}
          >
            <div className="absolute top-2 left-2 z-20">
                <div className={`p-1 rounded-md backdrop-blur-md border border-white/10 ${persona.isCustom ? 'bg-purple-500/20 text-purple-400' : 'bg-amber-500/20 text-[#d3bc8e]'}`}>
                    <Star className="w-2.5 h-2.5 lg:w-3 lg:h-3 fill-current" />
                </div>
            </div>

            <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
               {persona.isCustom && (
                 <>
                   <button onClick={(e) => handleEdit(e, persona)} className="p-1.5 bg-black/60 rounded-full text-white hover:bg-[#d3bc8e] hover:text-black transition-colors shadow-lg">
                      <Edit3 className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
                   </button>
                   <button onClick={(e) => handleDelete(e, persona.id)} className="p-1.5 bg-black/60 rounded-full text-red-400 hover:bg-red-500 hover:text-white transition-colors shadow-lg">
                      <Trash2 className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
                   </button>
                 </>
               )}
            </div>

            <div className="aspect-[3/4.2] relative overflow-hidden bg-[#1a1f2e]">
              <LazyImage 
                src={persona.avatar} 
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                alt={persona.name} 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e14] via-transparent to-transparent opacity-80"></div>
              
              <div className="absolute bottom-2 lg:bottom-3 left-2 lg:left-3 right-2 lg:right-3">
                <h3 className="text-xs lg:text-sm font-black text-white uppercase tracking-tight font-serif drop-shadow-md truncate">{persona.name}</h3>
                <div className="flex gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-1.5 h-1.5 lg:w-2 lg:h-2 text-[#d3bc8e] fill-current" />)}
                </div>
              </div>
            </div>
            
            <div className="p-2 lg:p-3 bg-[#0b0e14] border-t border-white/5 flex-1 flex flex-col justify-between">
              <p className="text-[8px] lg:text-[10px] text-gray-500 line-clamp-1 italic mb-1 lg:mb-2">"{persona.description}"</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${activePersonaId === persona.id ? 'bg-[#d3bc8e] animate-pulse' : 'bg-gray-700'}`}></div>
                    <span className="text-[7px] lg:text-[8px] text-gray-600 font-bold uppercase tracking-widest truncate max-w-[50px]">{persona.voiceName}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showCreator && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 lg:p-6 animate-in fade-in duration-300">
          <div className="genshin-panel w-full max-w-4xl p-6 lg:p-8 border border-[#d3bc8e]/40 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onClick={() => setShowCreator(false)} className="absolute top-4 right-4 lg:top-6 lg:right-6 p-2 hover:bg-white/10 rounded-full transition-all"><X className="text-gray-500 hover:text-white w-5 h-5" /></button>
            <h2 className="text-2xl lg:text-3xl font-black text-[#d3bc8e] mb-2 uppercase tracking-[0.2em] font-serif">Soul Manifestation</h2>
            <p className="text-xs lg:text-sm text-gray-500 mb-6 lg:mb-8 italic">Define the essence of your new companion. Let the Akasha weave their destiny.</p>
            
            {!editMode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                  {/* Option 1: AI Extract */}
                  <div className="border-2 border-dashed border-white/10 rounded-3xl p-6 lg:p-10 flex flex-col items-center justify-center gap-4 lg:gap-6 hover:border-[#d3bc8e]/50 hover:bg-[#d3bc8e]/5 transition-all cursor-pointer relative group bg-black/20 h-[250px] lg:h-[300px]">
                    {isAnalyzing || isCompressing ? (
                      <div className="flex flex-col items-center gap-4 lg:gap-6">
                        <Loader2 className="w-10 h-10 lg:w-12 lg:h-12 text-[#d3bc8e] animate-spin" />
                        <div className="text-center">
                          <p className="text-[#d3bc8e] font-black tracking-[0.4em] animate-pulse text-xs lg:text-base">
                              {isCompressing ? 'OPTIMIZING...' : 'EXTRACTING...'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-[#d3bc8e]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Sparkles className="w-6 h-6 lg:w-8 lg:h-8 text-[#d3bc8e]" />
                        </div>
                        <div className="text-center">
                          <p className="text-lg lg:text-xl text-white font-bold mb-2">Auto-Generate from Image</p>
                          <p className="text-[10px] lg:text-xs text-gray-500 px-4 lg:px-8">Upload an image and let AI analyze the character's traits automatically.</p>
                        </div>
                        <input type="file" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                      </>
                    )}
                  </div>

                  {/* Option 2: Manual */}
                  <div 
                    onClick={() => setEditMode(true)}
                    className="border-2 border-dashed border-white/10 rounded-3xl p-6 lg:p-10 flex flex-col items-center justify-center gap-4 lg:gap-6 hover:border-white/30 hover:bg-white/5 transition-all cursor-pointer group bg-black/20 h-[250px] lg:h-[300px]"
                  >
                        <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Edit3 className="w-6 h-6 lg:w-8 lg:h-8 text-gray-300" />
                        </div>
                        <div className="text-center">
                          <p className="text-lg lg:text-xl text-white font-bold mb-2">Manual Construction</p>
                          <p className="text-[10px] lg:text-xs text-gray-500 px-4 lg:px-8">Build the soul fragment from scratch. Full control over lore and voice.</p>
                        </div>
                  </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
                 <div className="flex flex-col gap-4 lg:gap-6">
                    <div className="aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/10 bg-black shadow-2xl relative group max-w-[200px] lg:max-w-none mx-auto lg:mx-0">
                      <img src={customPersona.avatar || 'https://picsum.photos/400/600'} className={`w-full h-full object-cover ${!customPersona.avatar ? 'opacity-30' : ''}`} alt="Custom" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer flex-col gap-2">
                         {isCompressing ? <Loader2 className="w-8 h-8 text-white animate-spin" /> : <Upload className="w-8 h-8 text-white" />}
                         <span className="text-xs font-bold uppercase text-white">Change Visual</span>
                         <input type="file" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                      </div>
                    </div>
                 </div>
                 
                 <div className="lg:col-span-2 space-y-4 lg:space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[9px] lg:text-[10px] font-black text-gray-500 uppercase tracking-widest">Divine Name</label>
                           <input type="text" value={customPersona.name} onChange={(e) => setCustomPersona({...customPersona, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 lg:p-4 text-white focus:border-[#d3bc8e] outline-none font-medium text-xs lg:text-base" placeholder="Companion Name" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[9px] lg:text-[10px] font-black text-gray-500 uppercase tracking-widest">Title</label>
                           <input type="text" value={customPersona.description} onChange={(e) => setCustomPersona({...customPersona, description: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 lg:p-4 text-white focus:border-[#d3bc8e] outline-none font-medium text-xs lg:text-base" placeholder="The Traveler's Guide" />
                        </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[9px] lg:text-[10px] font-black text-gray-500 uppercase tracking-widest">Lore Script (System Instruction)</label>
                       <textarea value={customPersona.systemInstruction} onChange={(e) => setCustomPersona({...customPersona, systemInstruction: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 lg:p-4 text-white focus:border-[#d3bc8e] outline-none h-32 lg:h-40 resize-none text-xs lg:text-sm custom-scrollbar leading-relaxed" placeholder="Personality, speech patterns, and background..." />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[9px] lg:text-[10px] font-black text-gray-500 uppercase tracking-widest">Voice Resonance</label>
                       <div className="grid grid-cols-3 gap-2">
                          {VOICE_OPTIONS.map(v => (
                             <button key={v.id} onClick={() => setCustomPersona({...customPersona, voiceName: v.id as any})} className={`p-2 lg:p-3 rounded-xl border text-[9px] lg:text-[10px] font-bold uppercase transition-all ${customPersona.voiceName === v.id ? 'border-[#d3bc8e] bg-[#d3bc8e]/20 text-[#d3bc8e]' : 'border-white/10 text-gray-500 hover:bg-white/5'}`}>
                                {v.id}
                             </button>
                          ))}
                       </div>
                    </div>

                    <div className="flex gap-4 pt-4 lg:pt-6">
                        <button onClick={resetForm} className="flex-1 py-3 lg:py-4 rounded-xl border border-white/10 text-gray-400 font-bold hover:bg-white/5 transition-all text-xs lg:text-sm">Reject</button>
                        <button onClick={handleSaveCustom} className="flex-[2] genshin-button py-3 lg:py-4 rounded-xl shadow-xl flex items-center justify-center gap-2 text-xs lg:text-sm">
                           <Save className="w-4 h-4 lg:w-5 lg:h-5" />
                           <span className="font-black">Finalize Ascencion</span>
                        </button>
                    </div>
                 </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonaSelector;
