
import React, { useState, useRef, useEffect } from 'react';
import { Video, Play, RefreshCcw, Film, Layers, Shield, Loader2, Download, Upload, Image as ImageIcon, Box, Check, AlertTriangle, Activity, AlertCircle } from 'lucide-react';
import { generateVideo } from '../services/geminiService';
import { VIDEO_GEN_MODELS } from '../data';

// --- SMART MEDIA PLAYER COMPONENT ---
const SmartMediaPlayer: React.FC<{ url: string | null; onError: () => void }> = ({ url, onError }) => {
    const [isImage, setIsImage] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setIsImage(false);
        setLoading(true);
    }, [url]);

    if (!url) return null;

    return (
        <div className="w-full h-full relative group/video animate-in zoom-in duration-700 bg-black">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50">
                    <Loader2 className="w-8 h-8 text-[#d3bc8e] animate-spin" />
                </div>
            )}
            
            <div className="absolute top-8 left-8 flex items-center gap-2 z-20 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 opacity-0 group-hover/video:opacity-100 transition-all pointer-events-none shadow-xl">
                <Activity className="w-3.5 h-3.5 text-[#d3bc8e] animate-pulse" />
                <span className="text-[9px] font-black text-[#d3bc8e] uppercase tracking-[0.2em]">{isImage ? 'Visual Frame' : 'Motion Stream'}</span>
            </div>

            {/* Try Video First, Fallback to Image */}
            {!isImage ? (
                <video 
                    src={url} 
                    controls 
                    autoPlay 
                    loop 
                    onLoadedData={() => setLoading(false)}
                    onError={() => { setIsImage(true); setLoading(false); }}
                    className="w-full h-full object-contain rounded-[2.2rem] shadow-2xl bg-black" 
                />
            ) : (
                <img 
                    src={url} 
                    onLoad={() => setLoading(false)}
                    onError={() => { setLoading(false); onError(); }}
                    className="w-full h-full object-contain rounded-[2.2rem] shadow-2xl bg-black" 
                    alt="Synthesis Output"
                />
            )}
            
            <div className="absolute bottom-8 right-8 flex gap-3 z-20">
                <a 
                   href={url} 
                   target="_blank"
                   rel="noreferrer"
                   download={`akasha_chronicle_${Date.now()}`}
                   className="p-4 bg-black/80 backdrop-blur-xl rounded-2xl text-white opacity-0 group-hover/video:opacity-100 transition-all hover:bg-white hover:text-black border border-white/10 shadow-2xl active:scale-90"
                   title="Download Artifact"
                >
                   <Download className="w-5 h-5" />
                </a>
            </div>
        </div>
    );
};

const VideoGen: React.FC = () => {
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [selectedModel, setSelectedModel] = useState<string>(VIDEO_GEN_MODELS[0]?.id || '');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
              if (event.target?.result) {
                  setInputImage(event.target.result as string);
                  setErrorMessage(null);
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && mode === 'text') return; 
    if (mode === 'image' && !inputImage) return;

    setIsGenerating(true);
    setVideoUrl(null);
    setErrorMessage(null);
    try {
      const fullPrompt = `${prompt || 'Animate this scene'}. Cinematic, high fidelity, smooth motion, high definition.`;
      
      const url = await generateVideo(
          fullPrompt, 
          mode === 'image' ? (inputImage || undefined) : undefined,
          selectedModel
      );
      
      if (url) {
        setVideoUrl(url);
      } else {
        setErrorMessage("Synthesizer failed: Neural network returned an empty sequence. Check your prompt or model availability.");
      }
    } catch (e: any) {
      setErrorMessage(`System Error: ${e.message || "Unknown anomaly detected in the chronicle core."}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 lg:p-12 overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto w-full">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold genshin-gold mb-2 font-serif tracking-widest">Omni-Chronicle</h1>
          <p className="text-gray-400 text-sm italic">Forge high-fidelity motion sequences across the Ley Lines.</p>
        </header>

        {/* Mode Toggles */}
        <div className="flex bg-black/40 rounded-xl p-1 border border-white/10 mb-8 max-w-md mx-auto w-full shadow-inner">
           <button 
             onClick={() => setMode('text')} 
             className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'text' ? 'bg-[#d3bc8e] text-black shadow-lg shadow-[#d3bc8e]/20' : 'text-gray-500 hover:text-white'}`}
           >
             <Film className="w-3.5 h-3.5" /> Text-to-Video
           </button>
           <button 
             onClick={() => setMode('image')} 
             className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'image' ? 'bg-[#d3bc8e] text-black shadow-lg shadow-[#d3bc8e]/20' : 'text-gray-500 hover:text-white'}`}
           >
             <ImageIcon className="w-3.5 h-3.5" /> Image-to-Video
           </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="genshin-panel p-6 rounded-3xl border border-white/10 shadow-2xl">
              
              {/* Model Selector */}
              <div className="mb-6">
                 <label className="text-[10px] font-black genshin-gold uppercase tracking-[0.2em] mb-3 block flex items-center gap-2">
                    <Box className="w-3 h-3" /> Synthesis Core
                 </label>
                 <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {VIDEO_GEN_MODELS.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => { setSelectedModel(m.id); setErrorMessage(null); }}
                          className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                              selectedModel === m.id 
                              ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                              : 'bg-black/20 border-white/10 text-gray-500 hover:bg-white/5'
                          }`}
                        >
                           <div className="min-w-0 pr-4">
                               <div className="text-[10px] font-black uppercase tracking-tight truncate">{m.label}</div>
                               <div className="text-[8px] opacity-60 font-mono mt-0.5 uppercase tracking-tighter truncate">{m.desc}</div>
                           </div>
                           {selectedModel === m.id && <Check className="w-3 h-3 shrink-0" />}
                        </button>
                    ))}
                 </div>
              </div>

              {mode === 'image' && (
                 <div className="mb-6 animate-in slide-in-from-top-2">
                    <label className="text-[10px] font-black genshin-gold uppercase tracking-[0.2em] mb-2 block font-serif">Seed Artifact</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full aspect-video rounded-2xl border-2 border-dashed border-[#d3bc8e]/20 hover:border-[#d3bc8e]/60 hover:bg-white/5 transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden relative group bg-black/40 shadow-inner"
                    >
                       {inputImage ? (
                           <>
                             <img src={inputImage} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" alt="Input" />
                             <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="px-5 py-2.5 bg-black/60 border border-white/20 rounded-xl text-[10px] font-black text-white uppercase tracking-widest backdrop-blur-md">Modify Seed</span>
                             </div>
                           </>
                       ) : (
                           <div className="text-center p-4">
                              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                 <Upload className="w-6 h-6 text-gray-600 group-hover:text-amber-500 transition-colors" />
                              </div>
                              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Inject Visual Data</span>
                           </div>
                       )}
                       <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                    </div>
                 </div>
              )}

              <label className="text-[10px] font-black genshin-gold uppercase tracking-[0.2em] mb-2 block font-serif">
                  Motion Directive
              </label>
              <textarea 
                value={prompt}
                onChange={(e) => { setPrompt(e.target.value); setErrorMessage(null); }}
                placeholder={mode === 'image' ? "Describe the sequence flow..." : "e.g. A character wandering through the Whispering Woods at twilight..."}
                className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm h-32 resize-none focus:outline-none focus:border-amber-500 transition-all select-text font-medium leading-relaxed shadow-inner custom-scrollbar"
              />

              {errorMessage && (
                  <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-2xl flex gap-4 items-start animate-in shake duration-300">
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                          <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Anomaly Detected</p>
                          <p className="text-[10px] text-red-200 leading-relaxed font-medium">{errorMessage}</p>
                      </div>
                  </div>
              )}
            </div>

            <button 
              onClick={handleGenerate}
              disabled={isGenerating || (mode === 'text' && !prompt.trim()) || (mode === 'image' && !inputImage)}
              className="w-full genshin-button py-5 rounded-2xl flex items-center justify-center gap-4 text-white font-black shadow-2xl disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Film className="w-6 h-6" />}
              <span className="uppercase tracking-[0.2em] text-xs">{isGenerating ? 'Weaving Continuity...' : 'Synthesize Sequence'}</span>
            </button>
          </div>

          <div className="genshin-panel rounded-[2.5rem] border border-white/10 flex flex-col items-center justify-center p-3 bg-black/40 relative overflow-hidden group min-h-[400px] shadow-2xl">
            <div className="absolute inset-0 z-0 opacity-5 pointer-events-none">
               <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500 via-transparent to-transparent"></div>
            </div>
            
            {videoUrl ? (
              <div className="w-full h-full relative group/video animate-in zoom-in duration-700">
                 <SmartMediaPlayer 
                    url={videoUrl} 
                    onError={() => { 
                        setVideoUrl(null); 
                        setErrorMessage("Media fragment corrupted. The output format is not supported by your display module."); 
                    }} 
                 />
                 <button 
                    onClick={() => setVideoUrl(null)}
                    className="absolute bottom-8 right-24 p-4 bg-black/80 backdrop-blur-xl rounded-2xl text-red-400 opacity-0 group-hover/video:opacity-100 transition-all hover:bg-red-500 hover:text-white border border-white/10 shadow-2xl active:scale-90 z-30"
                    title="Purge Sequence"
                 >
                    <RefreshCcw className="w-5 h-5" />
                 </button>
              </div>
            ) : isGenerating ? (
               <div className="z-20 text-center p-10 animate-in fade-in duration-500">
                  <div className="relative w-32 h-32 mx-auto mb-10">
                      <div className="absolute inset-0 border-4 border-amber-500/10 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-amber-500 border-t-transparent rounded-full animate-spin shadow-[0_0_40px_rgba(245,158,11,0.3)]"></div>
                      <div className="absolute inset-6 bg-amber-500/10 rounded-full flex items-center justify-center">
                          <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                      </div>
                  </div>
                  <h3 className="text-2xl font-black genshin-gold mb-4 animate-pulse tracking-[0.3em] font-serif uppercase">Weaving Fate</h3>
                  <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black max-w-[240px] mx-auto leading-relaxed">
                    Interfacing with the {VIDEO_GEN_MODELS.find(m => m.id === selectedModel)?.label.split(' ')[0]} Core...
                    <br/><span className="text-amber-600/70 mt-3 block italic font-serif tracking-widest animate-pulse">Stay connected to the Ley Line.</span>
                  </p>
               </div>
            ) : (
               <div className="z-10 text-center opacity-30 group-hover:opacity-60 transition-all duration-700 hover:scale-105">
                  <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/5 shadow-inner relative">
                     <Play className="w-10 h-10 text-gray-400 ml-1.5" />
                     <div className="absolute inset-0 rounded-full border border-white/10 animate-ping opacity-20"></div>
                  </div>
                  <p className="text-gray-300 font-black tracking-[0.3em] uppercase text-xs font-serif">Chronicle Viewer</p>
                  <p className="text-[9px] text-gray-600 mt-3 font-black uppercase tracking-[0.2em]">IDLE • AWAITING NEURAL ANCHOR</p>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoGen;
