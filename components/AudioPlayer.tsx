
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Loader2, Volume2, VolumeX, Download, Activity, AlertCircle, Rewind, FastForward } from 'lucide-react';
import { VoiceConfig } from '../types';
import { createReverbImpulse, decodeRawPCM } from '../utils/audioUtils';

interface AudioPlayerProps {
    audioUrl: string;
    initialVolume: number;
    voiceConfig: VoiceConfig;
    autoPlay?: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = React.memo(({ audioUrl, initialVolume, voiceConfig, autoPlay = false }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
  
    const audioCtxRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<AudioBufferSourceNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const isMounted = useRef(true);
    const hasAutoPlayed = useRef(false);
    
    // Nodes
    const lowEQRef = useRef<BiquadFilterNode | null>(null);
    const midEQRef = useRef<BiquadFilterNode | null>(null);
    const highEQRef = useRef<BiquadFilterNode | null>(null);
    const reverbNodeRef = useRef<ConvolverNode | null>(null);
    const reverbGainRef = useRef<GainNode | null>(null);
  
    const audioBufferRef = useRef<AudioBuffer | null>(null);
    const startTimeRef = useRef<number>(0);
    const pauseTimeRef = useRef<number>(0);
    const animationFrameRef = useRef<number>(0);
  
    const initAudioContext = useCallback(() => {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          audioCtxRef.current = new AudioContext();
      }
      return audioCtxRef.current;
    }, []);
  
    // 1. Load Audio Data
    useEffect(() => {
      isMounted.current = true;
      const loadAudio = async () => {
          if (!audioUrl) return;
          
          setLoading(true);
          setError(false);
          
          try {
              const response = await fetch(audioUrl);
              const arrayBuffer = await response.arrayBuffer();
              
              if (!isMounted.current) return;
              const ctx = initAudioContext();
              
              try {
                  // Clone buffer for decoding to avoid locking original
                  const decodedBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
                  if(isMounted.current) {
                      audioBufferRef.current = decodedBuffer;
                      setDuration(decodedBuffer.duration);
                  }
              } catch (decodeErr) {
                  // Fallback for raw PCM data
                  const rawBuffer = decodeRawPCM(arrayBuffer, ctx);
                  if(isMounted.current) {
                      audioBufferRef.current = rawBuffer;
                      setDuration(rawBuffer.duration);
                  }
              }
          } catch (e) {
              if(isMounted.current) setError(true);
              console.error("Audio Load Error:", e);
          } finally {
              if(isMounted.current) setLoading(false);
          }
      };
      loadAudio();
  
      return () => {
          isMounted.current = false;
          stopAudioInternal(false);
          if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
              audioCtxRef.current.close().catch(() => {});
              audioCtxRef.current = null;
          }
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };
    }, [audioUrl, initAudioContext]);

    // 2. Handle Autoplay trigger when buffer is ready
    useEffect(() => {
        if (autoPlay && !hasAutoPlayed.current && duration > 0 && !loading && !isPlaying) {
            hasAutoPlayed.current = true;
            playAudio();
        }
    }, [duration, loading, autoPlay]);
  
    // 3. Apply Effects dynamically
    const applyEffects = useCallback(() => {
       if (!audioCtxRef.current || !gainNodeRef.current) return;
       const ctx = audioCtxRef.current;
       const t = ctx.currentTime;
  
       const baseGain = isMuted ? 0 : (voiceConfig.gain || 1.0);
       gainNodeRef.current.gain.setTargetAtTime(baseGain, t, 0.1);
  
       if (sourceRef.current) {
          sourceRef.current.playbackRate.value = voiceConfig.speed || 1.0;
          const detuneVal = (voiceConfig.pitch - 1.0) * 1200; 
          sourceRef.current.detune.value = detuneVal;
       }
  
       if (lowEQRef.current && midEQRef.current && highEQRef.current) {
          lowEQRef.current.gain.value = (voiceConfig.eqLow || 0);
          midEQRef.current.gain.value = (voiceConfig.eqMid || 0);
          highEQRef.current.gain.value = (voiceConfig.eqHigh || 0);
       }
  
       if (reverbGainRef.current) {
           reverbGainRef.current.gain.value = (voiceConfig.reverb || 0) / 100;
       }
  
    }, [voiceConfig, isMuted]);
  
    useEffect(() => {
        if (isPlaying) applyEffects();
    }, [voiceConfig, isPlaying, applyEffects, isMuted]);
  
    const playAudio = async () => {
      const ctx = initAudioContext();
      
      // Critical: Ensure context is running. Browsers suspend context created without gesture.
      // We assume this is triggered by a user action chain (Send Message) or user click.
      if (ctx.state === 'suspended') {
          try { await ctx.resume(); } catch (e) { console.warn("Autoplay blocked by browser policy"); return; }
      }
      
      if (!audioBufferRef.current) return;
  
      // Stop previous instance if any
      stopAudioInternal(false);

      const source = ctx.createBufferSource();
      source.buffer = audioBufferRef.current;
      
      // DSP Chain
      const lowEQ = ctx.createBiquadFilter();
      lowEQ.type = 'lowshelf';
      lowEQ.frequency.value = 320;
      
      const midEQ = ctx.createBiquadFilter();
      midEQ.type = 'peaking';
      midEQ.frequency.value = 1000;
      
      const highEQ = ctx.createBiquadFilter();
      highEQ.type = 'highshelf';
      highEQ.frequency.value = 3200;
  
      const reverbNode = ctx.createConvolver();
      // Generate synthetic impulse for reverb
      reverbNode.buffer = createReverbImpulse(ctx, 2.0, 4.0);
      const reverbGain = ctx.createGain();
      const masterGain = ctx.createGain();
  
      // Connect Graph
      source.connect(lowEQ);
      lowEQ.connect(midEQ);
      midEQ.connect(highEQ);
      
      // Dry Signal
      highEQ.connect(masterGain);
      
      // Wet Signal (Reverb)
      highEQ.connect(reverbNode);
      reverbNode.connect(reverbGain); 
      reverbGain.connect(masterGain);
      
      masterGain.connect(ctx.destination);
  
      // References
      sourceRef.current = source;
      lowEQRef.current = lowEQ;
      midEQRef.current = midEQ;
      highEQRef.current = highEQ;
      reverbNodeRef.current = reverbNode;
      reverbGainRef.current = reverbGain;
      gainNodeRef.current = masterGain;
      
      // Initial Settings
      applyEffects();
  
      const offset = Math.max(0, pauseTimeRef.current % (duration || 1));
      source.start(0, offset);
      startTimeRef.current = ctx.currentTime - offset;
  
      source.onended = () => {
          if (isMounted.current) {
              // Only reset if we reached the end naturally (approx)
              const speed = voiceConfig.speed || 1.0;
              const expectedDuration = duration / speed;
              const elapsed = ctx.currentTime - startTimeRef.current;
              
              if (elapsed >= expectedDuration - 0.5) {
                  setIsPlaying(false);
                  pauseTimeRef.current = 0;
                  setProgress(0);
                  setCurrentTime(0);
              }
          }
      };
  
      setIsPlaying(true);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    };
  
    const stopAudioInternal = (savePosition: boolean = true) => {
       if (sourceRef.current) {
          try { sourceRef.current.stop(); } catch(e) {}
          try { sourceRef.current.disconnect(); } catch(e) {}
          sourceRef.current = null;
       }
       if (savePosition && audioCtxRef.current) {
           pauseTimeRef.current = audioCtxRef.current.currentTime - startTimeRef.current;
       }
       if(isMounted.current) setIsPlaying(false);
       if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };

    const stopAudio = () => stopAudioInternal(true);
  
    const updateProgress = () => {
       if (!audioCtxRef.current || !isPlaying || !duration || !isMounted.current) return;

       const elapsed = audioCtxRef.current.currentTime - startTimeRef.current;
       const speed = voiceConfig.speed || 1.0;
       // Progress calculation adjusted for playback speed
       const realElapsed = elapsed * speed;
       
       const current = Math.min(realElapsed, duration);
       
       setCurrentTime(current);
       setProgress((current / duration) * 100);
  
       if (isPlaying) {
           animationFrameRef.current = requestAnimationFrame(updateProgress);
       }
    };
  
    const togglePlay = () => {
       if (isPlaying) stopAudio();
       else playAudio();
    };
  
    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        const newTime = (val / 100) * duration;
        stopAudioInternal(false);
        pauseTimeRef.current = newTime;
        setProgress(val);
        setCurrentTime(newTime);
        // If it was playing, or if user drags, we might want to start/stop.
        // Simple logic: if checking, start playing from new spot.
        if (isPlaying) playAudio();
    };

    const skip = (seconds: number) => {
        let newTime = currentTime + seconds;
        if (newTime < 0) newTime = 0;
        if (newTime > duration) newTime = duration;
        stopAudioInternal(false);
        pauseTimeRef.current = newTime;
        setCurrentTime(newTime);
        setProgress((newTime / duration) * 100);
        if (isPlaying) playAudio();
    };

    if (error) return <div className="bg-red-900/20 border border-red-500/30 p-2 rounded-lg text-xs text-red-400 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Audio Corrupted</div>;
  
    const formatTime = (seconds: number) => {
        if (!seconds || isNaN(seconds)) return "00:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <div className="bg-[#0b0e14]/90 backdrop-blur-md border border-[#d3bc8e]/20 rounded-xl p-3 flex flex-col gap-2 relative overflow-hidden w-full max-w-md shadow-lg my-2 group/player animate-in fade-in slide-in-from-left-2">
        <div className="flex-1 w-full flex flex-col gap-1">
            <div className="relative h-6 w-full flex items-center group/seek">
               {/* Visualizer Background */}
               <div className="absolute inset-0 flex items-center gap-[2px] opacity-20 pointer-events-none">
                   {[...Array(40)].map((_, i) => (
                      <div key={i} className="flex-1 bg-[#d3bc8e] rounded-sm transition-all duration-75" 
                           style={{ height: isPlaying ? `${20 + Math.random() * 60}%` : '4px', opacity: i / 40 > progress / 100 ? 0.3 : 1 }}>
                      </div>
                   ))}
               </div>
               
               <input 
                 type="range" min="0" max="100" step="0.1" 
                 value={progress || 0} onChange={handleSeek} 
                 className="w-full absolute inset-0 opacity-0 cursor-pointer z-20 h-full" 
               />
               
               <div className="absolute bottom-0 left-0 h-[2px] bg-[#d3bc8e] transition-all" style={{ width: `${progress}%` }}></div>
               <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-lg pointer-events-none transition-all opacity-0 group-hover/player:opacity-100" style={{ left: `calc(${progress}% - 5px)` }}></div>
            </div>
            
            <div className="flex justify-between text-[10px] font-mono text-gray-500 px-1 select-none">
               <span className="flex items-center gap-1">{isPlaying && <Activity className="w-3 h-3 text-[#d3bc8e] animate-pulse" />}{formatTime(currentTime)}</span>
               <span>{formatTime(duration)}</span>
            </div>
        </div>
        
        <div className="flex items-center justify-between border-t border-white/5 pt-2">
            <div className="flex items-center gap-3">
               <button onClick={() => skip(-5)} className="text-gray-400 hover:text-white transition-colors p-1" title="-5s"><Rewind className="w-4 h-4" /></button>
               <button 
                 onClick={togglePlay} 
                 disabled={loading} 
                 className={`w-8 h-8 flex items-center justify-center rounded-full shrink-0 transition-all shadow-md ${isPlaying ? 'bg-[#d3bc8e] text-black hover:bg-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
               >
                 {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
               </button>
               <button onClick={() => skip(5)} className="text-gray-400 hover:text-white transition-colors p-1" title="+5s"><FastForward className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-3">
               <button onClick={() => setIsMuted(!isMuted)} className={`transition-colors ${isMuted ? 'text-red-400' : 'text-gray-400 hover:text-amber-400'}`}>{isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</button>
               <button onClick={() => {const a = document.createElement('a'); a.href = audioUrl; a.download = `voice_${Date.now()}.wav`; a.click();}} className="text-gray-400 hover:text-white transition-colors"><Download className="w-4 h-4" /></button>
            </div>
        </div>
      </div>
    );
});

export default AudioPlayer;
