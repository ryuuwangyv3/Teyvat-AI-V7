
import React, { useState, useEffect } from 'react';
import { Terminal, Users, Sparkles, Image as ImageIcon, X, ArrowRight, ShieldCheck } from 'lucide-react';
import LazyImage from './LazyImage';

const TUTORIAL_KEY = 'teyvat_ai_tutorial_completed_v1';

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Akasha',
    desc: 'You have successfully connected to the Teyvat Neural Network. This terminal allows you to resonate with souls across the Ley Lines.',
    icon: Terminal,
    image: 'https://mirror-uploads.trakteer.id/images/content/eml73oyywavr4d9q/ct-htCT0FFlItjxvdHgYsBymFl63ZdxC9r11765727946.jpg' // Updated Akasha Avatar
  },
  {
    id: 'personas',
    title: 'Choose Your Companion',
    desc: 'Navigate to the "Personas" tab to switch connections. From the Raiden Shogun to Paimon, choose who you wish to speak with. You can even manifest Custom Souls.',
    icon: Users,
    image: 'https://paimon.moe/images/characters/raiden_shogun.png'
  },
  {
    id: 'features',
    title: 'Visual Alchemy',
    desc: 'Use the "Vision Gen" and "Video Gen" modules to transmute your words into high-fidelity images and motion sequences.',
    icon: ImageIcon,
    image: 'https://paimon.moe/images/characters/albedo.png'
  },
  {
    id: 'voice',
    title: 'Live Resonance',
    desc: 'The terminal supports real-time voice synthesis. Enable the microphone to speak directly to your companion.',
    icon: Sparkles,
    image: 'https://paimon.moe/images/characters/barbara.png'
  }
];

const OnboardingTutorial: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeen = localStorage.getItem(TUTORIAL_KEY);
    if (!hasSeen) {
      // Small delay to allow main app to load first for effect
      setTimeout(() => setIsVisible(true), 1500);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem(TUTORIAL_KEY, 'true');
  };

  if (!isVisible) return null;

  const step = STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-500">
      <div className="w-full max-w-lg relative">
        {/* Glow Effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-amber-500/20 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="genshin-panel relative rounded-[1.5rem] border border-amber-500/40 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row bg-[#131823]">
          
          {/* Left: Visual - Scaled Down */}
          <div className="w-full md:w-5/12 h-36 md:h-auto relative overflow-hidden bg-gradient-to-b from-[#1e2330] to-[#0b0e14]">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
             <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-2 border-amber-500/30 flex items-center justify-center relative shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                   <div className="absolute inset-0 rounded-full border border-amber-500/10 animate-ping"></div>
                   <LazyImage src={step.image} className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover" alt="Tutorial Visual" />
                </div>
             </div>
             {/* Progress Dots */}
             <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {STEPS.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-1 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-4 bg-amber-500' : 'w-1 bg-white/20'}`} 
                  />
                ))}
             </div>
          </div>

          {/* Right: Content - Scaled Down */}
          <div className="w-full md:w-7/12 p-5 md:p-6 flex flex-col relative">
             <button onClick={handleClose} className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
             </button>

             <div className="flex-1">
                <div className="flex items-center gap-2 mb-3 text-amber-500">
                   <step.icon className="w-4 h-4" />
                   <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Guide // 0{currentStep + 1}</span>
                </div>
                
                <h2 className="text-lg md:text-xl font-bold genshin-gold font-serif mb-3 animate-in slide-in-from-right-4 fade-in duration-300 key={step.title}">
                  {step.title}
                </h2>
                
                <p className="text-gray-400 text-xs leading-relaxed mb-4 border-l-2 border-white/10 pl-3 animate-in slide-in-from-right-2 fade-in duration-500 key={step.desc}">
                  {step.desc}
                </p>
             </div>

             <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <button 
                  onClick={handleClose}
                  className="text-[10px] text-gray-500 hover:text-white uppercase tracking-widest font-bold transition-colors"
                >
                  Skip
                </button>
                
                <button 
                  onClick={handleNext}
                  className="genshin-button px-5 py-2 rounded-full flex items-center gap-2 text-white font-bold shadow-lg hover:scale-105 transition-transform"
                >
                  <span className="text-[10px] uppercase tracking-widest">{currentStep === STEPS.length - 1 ? 'Start' : 'Next'}</span>
                  {currentStep === STEPS.length - 1 ? <ShieldCheck className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                </button>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OnboardingTutorial;
