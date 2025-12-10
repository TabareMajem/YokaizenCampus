


import React, { useState } from 'react';
import { User, PhilosophyMode, Language } from '../types';
import { TERMS } from '../translations';
import { ChevronRight, Check, Key, Shield, Layers, Rocket, HelpCircle, Eye, PlayCircle, Lock, Globe, ExternalLink } from 'lucide-react';
import { SettingsModal } from './SettingsModal';

interface OnboardingWizardProps {
  user: User;
  onComplete: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ user, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedMode, setSelectedMode] = useState<PhilosophyMode>(PhilosophyMode.JAPAN);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [showExplainer, setShowExplainer] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>(Language.EN);
  const [apiKeyInput, setApiKeyInput] = useState('');

  const T = TERMS[language].ONBOARDING;
  const TC = TERMS[language].COMMON;

  // Check for key presence
  React.useEffect(() => {
    const key = localStorage.getItem('gemini_api_key');
    const school = localStorage.getItem('school_mode');
    if (key || school === 'true') {
        setHasKey(true);
        if (key) setApiKeyInput(key);
    }
  }, [isSettingsOpen]);

  const handleSaveKey = () => {
      if (apiKeyInput.trim()) {
          localStorage.setItem('gemini_api_key', apiKeyInput.trim());
          localStorage.setItem('school_mode', 'false');
          setHasKey(true);
      }
  };

  const handleNext = () => {
    // Hardcoded steps length for brevity, assumed 4 steps based on previous file
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      setShowExplainer(null);
    } else {
      onComplete();
    }
  };

  const STEPS = [
    { title: T.BRIEFING, desc: T.BRIEFING_DESC },
    { title: T.PHILOSOPHY, desc: T.PHILOSOPHY_DESC },
    { title: T.FUEL, desc: T.FUEL_DESC },
    { title: T.LAUNCH, desc: T.LAUNCH_DESC },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl font-sans text-slate-200">
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} language={language} />
      
      <div className="absolute top-8 right-8 z-[210]">
          <div className="relative group">
              <button className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded text-xs font-bold text-slate-400 hover:text-white">
                  <Globe className="w-3 h-3" /> {language}
              </button>
              <div className="absolute top-full right-0 mt-2 w-32 bg-slate-900 border border-slate-700 rounded shadow-xl hidden group-hover:block max-h-64 overflow-y-auto">
                  {Object.values(Language).map((lang) => (
                    <button key={lang} onClick={() => setLanguage(lang as Language)} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-800 text-slate-300">
                      {lang}
                    </button>
                  ))}
              </div>
          </div>
      </div>

      <div className="w-full max-w-5xl h-[650px] bg-[#020617] border border-slate-800 rounded-2xl shadow-2xl flex overflow-hidden">
        
        {/* Left Sidebar Steps */}
        <div className="w-72 bg-slate-950 border-r border-slate-800 p-8 flex flex-col justify-between relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.02] pointer-events-none"></div>
           
           <div className="relative z-10">
              <div className="flex items-center gap-2 mb-12">
                 <div className="w-3 h-3 bg-neon-blue rounded-full shadow-[0_0_10px_#00f3ff]" />
                 <span className="font-bold tracking-widest text-sm text-white">{T.SETUP}</span>
              </div>
              <div className="space-y-8">
                 {STEPS.map((step, i) => (
                    <div key={i} className={`flex gap-4 transition-all duration-500 ${i === currentStep ? 'opacity-100 translate-x-2' : 'opacity-40'}`}>
                       <div className={`flex flex-col items-center gap-2`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border text-xs font-bold transition-all
                             ${i < currentStep ? 'bg-neon-blue border-neon-blue text-black' : i === currentStep ? 'bg-white border-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-transparent border-slate-700 text-slate-700'}
                          `}>
                             {i < currentStep ? <Check className="w-4 h-4" /> : i + 1}
                          </div>
                          {i !== 3 && <div className={`w-px h-full transition-colors ${i < currentStep ? 'bg-neon-blue/50' : 'bg-slate-800'}`} />}
                       </div>
                       <div className="pb-2">
                          <div className={`font-bold text-sm ${i === currentStep ? 'text-white' : 'text-slate-400'}`}>{step.title}</div>
                          <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-wide">{step.desc}</div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
           
           <div className="text-[10px] text-slate-600 font-mono">
              {TC.SESSION_ID}: {user.id.substring(0,8)}
           </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 p-12 flex flex-col relative bg-gradient-to-br from-[#020617] to-[#0f172a]">
           
           {/* STEP 1: BRIEFING */}
           {currentStep === 0 && (
             <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4">
                <div className="mb-6">
                   <h2 className="text-4xl font-black text-white mb-2">{T.WELCOME}</h2>
                   <p className="text-lg text-slate-400">{T.WELCOME_SUB}</p>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8">
                   <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
                      <div className="flex items-center gap-3 mb-3 text-neon-blue">
                         <Layers className="w-5 h-5" />
                         <h3 className="font-bold text-sm uppercase tracking-wider">{T.CONCEPT}</h3>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">
                         {T.CONCEPT_DESC}
                      </p>
                   </div>
                   <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
                      <div className="flex items-center gap-3 mb-3 text-purple-400">
                         <Shield className="w-5 h-5" />
                         <h3 className="font-bold text-sm uppercase tracking-wider">Role</h3>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">
                         {T.ROLE_DESC}
                      </p>
                   </div>
                </div>
             </div>
           )}

           {/* STEP 2: PHILOSOPHY */}
           {currentStep === 1 && (
             <div className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-right-4">
                <h2 className="text-3xl font-bold text-white mb-2">{T.THEME_SELECT}</h2>
                <div className="grid grid-cols-3 gap-4 mb-8 mt-8">
                   {[
                     { mode: PhilosophyMode.FINLAND, label: 'FINLAND', sub: 'Organic', color: 'amber' },
                     { mode: PhilosophyMode.JAPAN, label: 'JAPAN', sub: 'Harmony', color: 'cyan' },
                     { mode: PhilosophyMode.KOREA, label: 'KOREA', sub: 'Cyber', color: 'red' },
                   ].map(opt => (
                     <button 
                       key={opt.mode}
                       onClick={() => setSelectedMode(opt.mode)}
                       className={`p-5 rounded-xl border text-left transition-all duration-300 group
                         ${selectedMode === opt.mode 
                           ? `bg-${opt.color}-900/20 border-${opt.color}-500 ring-1 ring-${opt.color}-500 scale-105 shadow-xl` 
                           : 'bg-slate-900/50 border-slate-700 hover:bg-slate-800 hover:border-slate-500'}
                       `}
                     >
                        <div className={`font-black text-lg mb-1 ${selectedMode === opt.mode ? `text-${opt.color}-500` : 'text-slate-300'}`}>{opt.label}</div>
                        <div className="text-xs font-bold text-white mb-3 opacity-80">{opt.sub}</div>
                     </button>
                   ))}
                </div>
             </div>
           )}

           {/* STEP 3: API KEY (Redesigned) */}
           {currentStep === 2 && (
             <div className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-right-4">
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                   {T.CONNECT_ENGINE} <Key className="w-6 h-6 text-neon-blue animate-pulse" />
                </h2>
                
                <div className="grid grid-cols-2 gap-4 mb-6 mt-4">
                   <button 
                      onClick={() => setShowExplainer(showExplainer === 'what' ? null : 'what')}
                      className={`text-left p-4 rounded-lg border transition-all ${showExplainer === 'what' ? 'bg-slate-800 border-white text-white' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                   >
                      <div className="font-bold text-sm flex items-center gap-2"><Key className="w-4 h-4" /> {T.WHAT_IS_KEY}</div>
                      {showExplainer === 'what' && <p className="text-xs mt-2 leading-relaxed animate-in fade-in">{T.WHAT_IS_KEY_DESC}</p>}
                   </button>
                   <button 
                      onClick={() => setShowExplainer(showExplainer === 'safe' ? null : 'safe')}
                      className={`text-left p-4 rounded-lg border transition-all ${showExplainer === 'safe' ? 'bg-slate-800 border-white text-white' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                   >
                      <div className="font-bold text-sm flex items-center gap-2"><Lock className="w-4 h-4" /> {T.IS_SAFE}</div>
                      {showExplainer === 'safe' && <p className="text-xs mt-2 leading-relaxed animate-in fade-in">{T.IS_SAFE_DESC}</p>}
                   </button>
                </div>

                <div className="bg-[#020617] border border-slate-700 rounded-xl p-8 relative overflow-hidden flex flex-col items-center">
                   {!hasKey ? (
                     <div className="relative z-10 w-full max-w-md space-y-4 text-center">
                        <a 
                           href="https://aistudio.google.com/app/apikey" 
                           target="_blank" 
                           rel="noreferrer"
                           className="w-full py-4 bg-neon-blue hover:bg-cyan-400 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:scale-[1.02] flex items-center justify-center gap-2"
                        >
                           {T.GET_KEY_BUTTON} <ExternalLink className="w-5 h-5" />
                        </a>
                        <div className="relative">
                           <input 
                              type="password"
                              value={apiKeyInput}
                              onChange={(e) => setApiKeyInput(e.target.value)}
                              placeholder={T.PASTE_KEY}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-neon-blue focus:outline-none font-mono text-sm"
                           />
                           {apiKeyInput.length > 10 && (
                              <button 
                                onClick={handleSaveKey} 
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white text-black text-xs font-bold px-3 py-1.5 rounded hover:bg-slate-200"
                              >
                                {TC.CONFIRM || "SAVE"}
                              </button>
                           )}
                        </div>
                        <a 
                           href="https://www.google.com/search?q=how+to+get+gemini+api+key" 
                           target="_blank"
                           rel="noreferrer"
                           className="inline-block text-[10px] text-slate-500 hover:text-white underline decoration-slate-700 underline-offset-4"
                        >
                           I can't find my key, help me search.
                        </a>
                     </div>
                   ) : (
                     <div className="relative z-10 flex flex-col items-center text-emerald-400 animate-in zoom-in">
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/50">
                           <Check className="w-8 h-8" />
                        </div>
                        <div className="font-bold text-lg text-white">{TC.SYSTEM_READY}</div>
                        <p className="text-xs text-slate-500 mt-2">{TC.KEY_ENDING} ...{apiKeyInput.slice(-4) || '****'}</p>
                        <button onClick={() => setHasKey(false)} className="text-xs underline mt-4 text-slate-400 hover:text-white">{TC.CHANGE_KEY}</button>
                     </div>
                   )}
                </div>
             </div>
           )}

           {/* STEP 4: LAUNCH */}
           {currentStep === 3 && (
             <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-right-4">
                <div className="w-32 h-32 bg-neon-blue/5 rounded-full flex items-center justify-center mb-8 relative">
                   <div className="absolute inset-0 border border-neon-blue/30 rounded-full animate-[spin_10s_linear_infinite]"></div>
                   <Rocket className="w-12 h-12 text-neon-blue" />
                </div>
                <h2 className="text-5xl font-black text-white mb-4 tracking-tight">{T.SYSTEMS_ONLINE}</h2>
             </div>
           )}

           {/* Navigation Footer */}
           <div className="flex justify-between items-center mt-auto pt-8 border-t border-slate-800/50">
              <button 
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="text-slate-500 hover:text-white disabled:opacity-0 transition-opacity flex items-center gap-2 text-sm font-bold"
              >
                 {TC.BACK}
              </button>
              
              <button 
                onClick={handleNext}
                disabled={currentStep === 2 && !hasKey}
                className={`
                   px-8 py-4 rounded-lg font-bold transition-all flex items-center gap-2 text-sm
                   ${currentStep === 2 && !hasKey 
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50' 
                      : 'bg-white hover:bg-slate-200 text-black hover:scale-105 shadow-lg'}
                `}
              >
                 {T.CONTINUE} <ChevronRight className="w-4 h-4" />
              </button>
           </div>
        </div>

      </div>
    </div>
  );
};
