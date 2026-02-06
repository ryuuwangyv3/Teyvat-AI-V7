
import React, { useState } from 'react';
import { Activity, Sliders, Zap, PlayCircle, ToggleLeft, ToggleRight, Headphones } from 'lucide-react';
import { VoiceConfig } from '../types';
import { generateTTS } from '../services/geminiService';
import { VOICE_OPTIONS } from '../data';

interface SettingsProps {
  voiceConfig: VoiceConfig;
  setVoiceConfig: (v: VoiceConfig) => void;
}

const Settings: React.FC<SettingsProps> = ({ voiceConfig, setVoiceConfig }) => {
  const [isPreviewing, setIsPreviewing] = useState(false);

  const handlePreviewVoice = async () => {
    if (isPreviewing) return;
    setIsPreviewing(true);
    try {
        const text = "Ad Astra Abyssosque.";
        const voice = voiceConfig.voiceId || 'Kore'; 
        const audioBase64 = await generateTTS(text, voice);
        
        if (audioBase64) {
             const binaryString = atob(audioBase64);
             const len = binaryString.length;
             const bytes = new Uint8Array(len);
             for (let i = 0; i < len; i++) {
               bytes[i] = binaryString.charCodeAt(i);
             }
             const blob = new Blob([bytes], { type: 'audio/wav' });
             const url = URL.createObjectURL(blob);
             const audio = new Audio(url);
             audio.playbackRate = voiceConfig.speed || 1.0;
             audio.play();
             audio.onended = () => setIsPreviewing(false);
        } else {
            setIsPreviewing(false);
        }
    } catch (e) {
        setIsPreviewing(false);
    }
  };

  const renderSlider = (label: string, value: number, min: number, max: number, step: number, onChange: (val: number) => void, suffix = "") => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</span>
        <span className="text-xs font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">{value}{suffix}</span>
      </div>
      <input 
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-amber-500 h-1.5 bg-black/40 rounded-full appearance-none hover:bg-white/10 transition-all"
      />
    </div>
  );

  return (
    <div className="h-full p-6 lg:p-12 overflow-y-auto custom-scrollbar bg-[#0b0e14]">
      <div className="max-w-4xl mx-auto space-y-10">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-lg">
               <Sliders className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h2 className="text-3xl font-bold genshin-gold uppercase tracking-widest font-serif leading-none">Voice Settings</h2>
              <p className="text-gray-500 text-sm mt-1 uppercase tracking-tighter font-bold">Audio Modulation & Frequency</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="lg:col-span-2 space-y-8">
              
              {/* AUDIO SECTION */}
              <div className="genshin-panel p-8 rounded-[2rem] border border-white/10 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-[4rem] -z-0"></div>
                 <div className="flex justify-between items-center mb-6 z-10 relative">
                     <h3 className="flex items-center gap-3 text-lg font-bold">
                       <Activity className="w-5 h-5 text-amber-500" />
                       <span className="font-serif uppercase tracking-widest">Voice Modulation</span>
                     </h3>
                     <div className="flex items-center gap-3">
                         <button 
                            onClick={() => setVoiceConfig({...voiceConfig, autoPlay: !voiceConfig.autoPlay})}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-[10px] font-black uppercase tracking-widest ${voiceConfig.autoPlay ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'bg-white/5 border-white/10 text-gray-500'}`}
                         >
                            {voiceConfig.autoPlay ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                            <span>Auto Play: {voiceConfig.autoPlay ? 'ON' : 'OFF'}</span>
                         </button>
                     </div>
                 </div>
                 <div className="space-y-8 relative z-10">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4 block ml-1">Base Voice Model</label>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                            {VOICE_OPTIONS.map(v => (
                                <button 
                                    key={v.id}
                                    onClick={() => setVoiceConfig({...voiceConfig, voiceId: v.id})}
                                    className={`p-3 rounded-xl border text-left transition-all ${voiceConfig.voiceId === v.id ? 'border-amber-500 bg-amber-500/20 text-amber-400 shadow-lg' : 'border-white/5 bg-black/40 text-gray-500 hover:bg-white/5 hover:border-white/10'}`}
                                >
                                    <div className="text-xs font-bold mb-0.5">{v.id}</div>
                                    <div className="text-[9px] opacity-70 truncate uppercase font-black">{v.label.split(' - ')[1] || v.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                      <div className="space-y-6">
                        {renderSlider("Speed / Tempo", voiceConfig.speed, 0.5, 2.0, 0.1, (v) => setVoiceConfig({...voiceConfig, speed: v}), "x")}
                        {renderSlider("Pitch Shift", voiceConfig.pitch, 0.5, 2.0, 0.1, (v) => setVoiceConfig({...voiceConfig, pitch: v}), "x")}
                        <div className="pt-4">
                            <button 
                                onClick={handlePreviewVoice}
                                disabled={isPreviewing}
                                className="w-full py-4 bg-[#d3bc8e] text-black rounded-xl text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-white transition-all shadow-xl disabled:opacity-50"
                            >
                                <PlayCircle className="w-5 h-5" />
                                <span>{isPreviewing ? "Resonating..." : "Test Audio Stream"}</span>
                            </button>
                        </div>
                      </div>
                      <div className="space-y-6 p-6 bg-black/40 rounded-[1.5rem] border border-white/5 shadow-inner">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Live Equalizer</span>
                            <Zap className="w-3 h-3 text-yellow-500 animate-pulse" />
                        </div>
                        <div className="flex gap-3 h-24 items-end justify-between px-2">
                            {[40, 70, 35, 90, 50, 80, 45, 60].map((h, i) => (
                              <div key={i} className="flex-1 bg-gradient-to-t from-amber-900/40 to-amber-500/60 rounded-t-sm transition-all duration-1000" style={{ height: isPreviewing ? `${Math.random() * 100}%` : `${h}%` }}></div>
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-4">
                            {['LOW', 'MID', 'HIGH'].map((band, i) => (
                                <div key={band} className="text-center">
                                  <div className="text-[8px] text-gray-600 font-bold mb-1.5">{band}</div>
                                  <input type="range" min="-12" max="12" className="w-full accent-amber-500 h-1 bg-white/5" 
                                    value={i === 0 ? voiceConfig.eqLow || 0 : i === 1 ? voiceConfig.eqMid || 0 : voiceConfig.eqHigh || 0} 
                                    onChange={(e) => setVoiceConfig({
                                        ...voiceConfig, 
                                        eqLow: i === 0 ? parseFloat(e.target.value) : voiceConfig.eqLow,
                                        eqMid: i === 1 ? parseFloat(e.target.value) : voiceConfig.eqMid,
                                        eqHigh: i === 2 ? parseFloat(e.target.value) : voiceConfig.eqHigh
                                    })} 
                                  />
                                </div>
                            ))}
                        </div>
                      </div>
                    </div>
                 </div>
              </div>
            </div>

            {/* SIDEBAR SETTINGS */}
            <div className="space-y-6">
               <div className="genshin-panel p-6 rounded-[2rem] border border-white/10 bg-black/40">
                  <h3 className="flex items-center gap-2 text-sm font-bold mb-6 uppercase tracking-[0.2em] font-serif">
                     <Headphones className="w-4 h-4 text-amber-500" />
                     <span>Spatial Depth</span>
                  </h3>
                  <div className="space-y-8">
                     {renderSlider("Reverb / Echo", voiceConfig.reverb, 0, 100, 5, (v) => setVoiceConfig({...voiceConfig, reverb: v}), "%")}
                     {renderSlider("Noise Gate", voiceConfig.noise || 0, 0, 100, 5, (v) => setVoiceConfig({...voiceConfig, noise: v}), "%")}
                     <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/10">
                        <p className="text-[9px] text-amber-500/60 leading-relaxed font-bold uppercase tracking-widest text-center">
                            Audio Processing: Real-time Convolution Active
                        </p>
                     </div>
                  </div>
               </div>

               <div className="p-6 rounded-[2rem] border border-white/5 bg-gradient-to-br from-white/5 to-transparent flex flex-col items-center text-center">
                  <Zap className="w-8 h-8 text-amber-500/20 mb-4" />
                  <span className="text-[10px] text-gray-600 font-black uppercase tracking-[0.3em]">Ley Line Stability</span>
                  <div className="mt-2 flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                     <span className="text-[9px] text-green-500/80 font-bold uppercase">Optimal Resonance</span>
                  </div>
               </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
