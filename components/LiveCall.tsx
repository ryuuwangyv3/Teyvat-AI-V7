
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PhoneOff, Mic, MicOff, Volume2, PhoneCall, Loader2, X, Activity, Minimize2, Sparkles, Key } from 'lucide-react';
import { Persona, VoiceConfig } from '../types';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';

interface LiveCallProps {
  currentPersona: Persona;
  voiceConfig: VoiceConfig;
  isOpen: boolean;
  onClose: () => void;
}

const LiveCall: React.FC<LiveCallProps> = ({ currentPersona, voiceConfig, isOpen, onClose }) => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const audioContextsRef = useRef<{ input?: AudioContext, output?: AudioContext }>({});
  
  // Keep Alive Refs
  const wakeLockRef = useRef<any>(null);
  const keepAliveOscRef = useRef<OscillatorNode | null>(null);

  // Manual encoding/decoding as required by SDK
  const decode = (b64: string) => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  };

  const encode = (bytes: Uint8Array) => {
    let bin = '';
    for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let ch = 0; ch < numChannels; ch++) {
      const chData = buffer.getChannelData(ch);
      for (let i = 0; i < frameCount; i++) chData[i] = dataInt16[i * numChannels + ch] / 32768.0;
    }
    return buffer;
  };

  const createBlob = (data: Float32Array): Blob => {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
    return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
  };

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
        try {
            wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
            console.log('Wake Lock request rejected/failed');
        }
    }
  };

  const cleanup = useCallback(() => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (sessionRef.current) {
        try { sessionRef.current.close(); } catch {}
    }
    sourcesRef.current.forEach(s => { try { s.stop(); } catch {} });
    sourcesRef.current.clear();
    
    // Stop Keep Alive Oscillator
    if (keepAliveOscRef.current) {
        try { keepAliveOscRef.current.stop(); } catch {}
        keepAliveOscRef.current = null;
    }

    // Release Wake Lock
    if (wakeLockRef.current) {
        try { wakeLockRef.current.release(); } catch {}
        wakeLockRef.current = null;
    }
    
    if (audioContextsRef.current.input) audioContextsRef.current.input.close();
    if (audioContextsRef.current.output) audioContextsRef.current.output.close();
    audioContextsRef.current = {};
    
    nextStartTimeRef.current = 0;
    setStatus('idle');
    setIsMinimized(false);
    setErrorMessage(null);
  }, []);

  const handleKeySelection = async () => {
    if (typeof window !== 'undefined' && (window as any).aistudio) {
        await (window as any).aistudio.openSelectKey();
        startCall(); // Retry after key selection
    }
  };

  // Re-activate AudioContext if browser suspends it (common on mobile tab switch)
  useEffect(() => {
      const handleVisibilityChange = async () => {
          if (document.visibilityState === 'visible') {
              if (audioContextsRef.current.input?.state === 'suspended') await audioContextsRef.current.input.resume();
              if (audioContextsRef.current.output?.state === 'suspended') await audioContextsRef.current.output.resume();
          }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const startCall = async () => {
    setErrorMessage(null);
    setStatus('connecting');
    
    if (typeof window !== 'undefined' && (window as any).aistudio) {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        setStatus('idle');
        setErrorMessage("paid_key_required");
        return;
      }
    }

    try {
      // 1. Request Wake Lock
      await requestWakeLock();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      await inputCtx.resume();
      await outputCtx.resume();
      
      audioContextsRef.current = { input: inputCtx, output: outputCtx };

      // 2. Keep-Alive Hack: Play silent oscillator to prevent browser throttling background tabs
      // This tricks the browser into thinking "Music is playing" so it gives priority to the JS thread.
      const keepAliveOsc = outputCtx.createOscillator();
      const keepAliveGain = outputCtx.createGain();
      keepAliveOsc.type = 'sine';
      keepAliveOsc.frequency.value = 10; // Low frequency
      keepAliveGain.gain.value = 0.0001; // Almost silent, but active
      keepAliveOsc.connect(keepAliveGain);
      keepAliveGain.connect(outputCtx.destination);
      keepAliveOsc.start();
      keepAliveOscRef.current = keepAliveOsc;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const cleanInstruction = currentPersona.systemInstruction
        .replace(/\[.*?\]/g, '')
        .replace(/\|\|GEN_IMG:.*?\|\|/g, '')
        .trim();

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setStatus('active');
            const src = inputCtx.createMediaStreamSource(stream);
            const proc = inputCtx.createScriptProcessor(4096, 1, 1);
            proc.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmData = isMuted ? new Float32Array(inputData.length) : inputData;
              sessionPromise.then(s => {
                  try { s.sendRealtimeInput({ media: createBlob(pcmData) }); } catch {}
              });
            };
            src.connect(proc);
            proc.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioB64 = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioB64) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const buffer = await decodeAudioData(decode(audioB64), outputCtx, 24000, 1);
              const src = outputCtx.createBufferSource();
              src.buffer = buffer;
              src.connect(outputCtx.destination);
              src.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(src);
              src.onended = () => sourcesRef.current.delete(src);
            }
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: any) => { 
            console.error("Celestial Link Error:", e);
            const msg = e?.message || "";
            if (msg.includes("Requested entity was not found")) {
                setErrorMessage("paid_key_required");
            } else {
                setErrorMessage(msg || "Internal connection anomaly.");
            }
            setStatus('error');
          },
          onclose: () => {
            if (status === 'active') cleanup();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: currentPersona.voiceName || 'Zephyr' } } },
          systemInstruction: `Speak as ${currentPersona.name}. Character Core: ${cleanInstruction}`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e: any) { 
        console.error("Initialization Failed:", e);
        setStatus('error');
        setErrorMessage(e?.message || "Failed to sync Ley Lines.");
    }
  };

  useEffect(() => { return () => cleanup(); }, [cleanup]);

  if (!isOpen && status === 'idle') return null;

  // RENDER MINIMIZED BUBBLE
  if (isMinimized && isOpen) {
    return (
      <div className="fixed bottom-24 right-6 z-[250] animate-in zoom-in-50 slide-in-from-bottom-10 duration-500">
        <div 
          onClick={() => setIsMinimized(false)}
          className="group relative cursor-pointer"
        >
          <div className={`absolute -inset-2 rounded-full blur-md transition-opacity duration-1000 ${status === 'active' ? 'bg-amber-500/40 opacity-100 animate-pulse' : 'bg-white/10 opacity-20'}`}></div>
          <div className="relative w-16 h-16 rounded-full border-2 border-[#d3bc8e] bg-[#0b0e14] overflow-hidden shadow-[0_0_30px_rgba(211,188,142,0.3)] group-hover:scale-110 transition-transform duration-300">
            <img src={currentPersona.avatar} className="w-full h-full object-cover" alt="av" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            {status === 'connecting' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
              </div>
            )}
            {status === 'active' && !isMuted && (
               <div className="absolute bottom-1 right-0 left-0 flex justify-center">
                  <Activity className="w-3 h-3 text-[#d3bc8e] animate-pulse" />
               </div>
            )}
            {isMuted && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-500/20 backdrop-blur-[1px]">
                 <MicOff className="w-4 h-4 text-red-500" />
              </div>
            )}
          </div>
          <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-[#13182b]/95 backdrop-blur-md border border-[#d3bc8e]/30 px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-[#d3bc8e] uppercase tracking-widest">{currentPersona.name}</span>
                <span className="text-[8px] text-gray-500 uppercase tracking-tighter">Live Call</span>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-[#0b0e14]/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="absolute top-8 right-8 flex items-center gap-4">
        <button 
          onClick={() => setIsMinimized(true)} 
          className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-[#d3bc8e] transition-all"
          title="Minimize"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
        <button 
          onClick={() => { cleanup(); onClose(); }} 
          className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition-all"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="relative w-48 h-48 sm:w-60 sm:h-60 flex items-center justify-center mb-8">
        <div className={`absolute inset-0 rounded-full border border-amber-500/20 animate-[spin_60s_linear_infinite] ${status === 'active' ? 'opacity-100' : 'opacity-20'}`}><div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-amber-500 rounded-full shadow-[0_0_15px_#f59e0b]"></div></div>
        <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-amber-500/40 shadow-[0_0_50px_rgba(211,188,142,0.2)]">
           <img src={currentPersona.avatar} className="w-full h-full object-cover" alt="Persona" />
           {status === 'active' && <div className="absolute inset-0 bg-amber-500/10 mix-blend-overlay animate-pulse"></div>}
        </div>
        <div className="absolute -inset-8 pointer-events-none opacity-40">
           <div className="absolute top-0 left-1/4 w-1 h-1 bg-amber-400 rounded-full animate-ping delay-75"></div>
           <div className="absolute bottom-1/4 right-0 w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping delay-300"></div>
        </div>
      </div>

      <div className="text-center mb-8">
         <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em]">Akasha Neural Resonance</span>
         </div>
         <h2 className="text-2xl sm:text-3xl font-black genshin-gold font-serif uppercase tracking-widest drop-shadow-2xl">{currentPersona.name}</h2>
         
         {errorMessage === "paid_key_required" ? (
             <div className="mt-4 animate-in slide-in-from-top-2">
                 <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest">Resonance Blocked: Paid API Key Required</p>
                 <button 
                    onClick={handleKeySelection}
                    className="mt-3 flex items-center gap-2 mx-auto bg-amber-500 text-black px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-xl"
                 >
                    <Key className="w-3 h-3" /> Select Paid Key
                 </button>
             </div>
         ) : (
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.3em] mt-2">
              {status === 'active' ? 'Celestial Link Established' : status === 'connecting' ? 'Synchronizing Frequencies...' : status === 'error' ? (errorMessage || 'Ley Line Disruption Detected') : 'Awaiting Connection Signal'}
            </p>
         )}
      </div>

      <div className="flex items-center gap-6 bg-white/5 p-6 rounded-[2.5rem] border border-white/10 backdrop-blur-md shadow-2xl">
        <button 
          onClick={() => setIsMuted(!isMuted)} 
          className={`p-4 rounded-2xl border-2 transition-all group active:scale-95 ${isMuted ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-white/5 border-white/20 text-gray-400 hover:text-white'}`}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />}
        </button>
        
        {status === 'idle' || status === 'error' ? (
          <button 
            onClick={startCall} 
            className="w-16 h-16 rounded-[1.8rem] bg-green-500 flex items-center justify-center shadow-[0_10px_25px_rgba(34,197,94,0.3)] hover:scale-105 active:scale-95 transition-all text-white"
          >
            <PhoneCall className="w-6 h-6" />
          </button>
        ) : (
          <button 
            onClick={cleanup} 
            className="w-16 h-16 rounded-[1.8rem] bg-red-500 flex items-center justify-center shadow-[0_10px_25px_rgba(239,68,68,0.3)] hover:scale-105 active:scale-95 transition-all text-white"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        )}
        
        <button className="p-4 rounded-2xl bg-white/5 border border-white/20 text-gray-400">
          <Volume2 className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-10 flex items-center gap-6 opacity-30 text-[7px] font-black uppercase tracking-[0.2em] text-gray-500">
         <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-green-500"></div> Low Latency</span>
         <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-blue-500"></div> Encrypted Stream</span>
      </div>
    </div>
  );
};
export default LiveCall;
