
import React from 'react';
import { Check, Globe, MessageCircle } from 'lucide-react';
import { LANGUAGES } from '../data';
import { Language } from '../types';

interface LanguageSettingsProps {
  currentLanguage: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageSettings: React.FC<LanguageSettingsProps> = ({ currentLanguage, setLanguage }) => {
  return (
    <div className="h-full p-6 lg:p-12 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <Globe className="w-8 h-8 genshin-gold" />
            <h1 className="text-3xl font-bold genshin-gold uppercase tracking-widest">Linguistic Protocol</h1>
          </div>
          <p className="text-gray-400">Configure the dialect and cultural nuance of your AI companions.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {LANGUAGES.map((lang) => {
            const isActive = currentLanguage.id === lang.id;
            return (
              <button
                key={lang.id}
                onClick={() => setLanguage(lang)}
                className={`relative group p-6 rounded-[2rem] border-2 text-left transition-all duration-300 overflow-hidden ${
                  isActive 
                  ? 'bg-[#1e2330] border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.15)] scale-[1.02]' 
                  : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'
                }`}
              >
                {/* Background Decor */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-bl-[4rem] transition-all ${isActive ? 'from-amber-500/10' : ''}`}></div>
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-4xl shadow-sm filter drop-shadow-lg">{lang.flag}</span>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isActive ? 'border-amber-400 bg-amber-400 text-black' : 'border-white/20'
                    }`}>
                      {isActive && <Check className="w-3.5 h-3.5 stroke-[4]" />}
                    </div>
                  </div>

                  <h3 className={`text-xl font-bold mb-2 ${isActive ? 'text-amber-400' : 'text-gray-200'}`}>
                    {lang.label}
                  </h3>
                  
                  <div className="mt-auto">
                     <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">
                        <MessageCircle className="w-3 h-3" />
                        <span>Resonance Style</span>
                     </div>
                     <p className="text-xs text-gray-400 leading-relaxed line-clamp-3 italic">
                       "{lang.instruction.substring(0, 80)}..."
                     </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-12 genshin-panel p-6 rounded-2xl border border-white/10 flex items-center gap-6">
           <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center shrink-0">
             <MessageCircle className="text-amber-400 w-6 h-6" />
           </div>
           <div>
             <h4 className="text-sm font-bold genshin-gold uppercase tracking-widest mb-1">Preview Interaction</h4>
             <p className="text-sm text-gray-400">
                Current active protocol: <span className="text-white font-bold">{currentLanguage.label}</span>. 
                All personas will now adapt their speech patterns to match this cultural setting.
             </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default LanguageSettings;
