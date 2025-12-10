

import React, { useState, useEffect } from 'react';
import { X, Key, Check, ShieldAlert, School, ExternalLink, HelpCircle, Zap, Crown } from 'lucide-react';
import { Language, AIProvider, SubscriptionTier } from '../types';
import { TERMS } from '../translations';
import { SubscriptionModal } from './SubscriptionModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, language = Language.EN }) => {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [isSchoolMode, setIsSchoolMode] = useState(false);
  const [activeProvider, setActiveProvider] = useState<AIProvider>(AIProvider.GEMINI);
  const [userTier, setUserTier] = useState<SubscriptionTier>(SubscriptionTier.FREE);
  const [showSubModal, setShowSubModal] = useState(false);

  const T = TERMS[language].SETTINGS;
  const TC = TERMS[language].COMMON;

  useEffect(() => {
    const stored = localStorage.getItem('gemini_api_key');
    if (stored) setApiKey(stored);
    
    const schoolMode = localStorage.getItem('school_mode');
    if (schoolMode === 'true') setIsSchoolMode(true);

    const provider = localStorage.getItem('ai_provider');
    if (provider) setActiveProvider(provider as AIProvider);

    const tier = localStorage.getItem('user_tier');
    if (tier) setUserTier(tier as SubscriptionTier);

  }, [isOpen, showSubModal]); // Re-run when sub modal closes to refresh tier

  const handleSave = () => {
    if (isSchoolMode) {
        localStorage.setItem('school_mode', 'true');
        localStorage.removeItem('gemini_api_key'); 
        setSaved(true);
    } else {
        if (apiKey.trim()) localStorage.setItem('gemini_api_key', apiKey.trim());
        localStorage.setItem('school_mode', 'false');
        setSaved(true);
    }
    
    localStorage.setItem('ai_provider', activeProvider);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    localStorage.removeItem('gemini_api_key');
    localStorage.setItem('school_mode', 'false');
    setApiKey('');
    setIsSchoolMode(false);
  };
  
  const handleProviderSelect = (provider: AIProvider) => {
      // If selecting DeepSeek and user is free, warn/prompt
      if (provider === AIProvider.DEEPSEEK && userTier === SubscriptionTier.FREE) {
          setShowSubModal(true);
          return;
      }
      setActiveProvider(provider);
  };

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 font-sans">
      <div className="w-full max-w-md bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-neon-blue" /> {T.TITLE}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* AI Provider Selection */}
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
             <div className="text-xs font-bold uppercase text-slate-500 mb-3">{T.PROVIDERS.TITLE}</div>
             <div className="space-y-2">
                {/* Gemini Option */}
                <button 
                   onClick={() => handleProviderSelect(AIProvider.GEMINI)}
                   className={`w-full p-3 rounded border flex items-center justify-between transition-all ${activeProvider === AIProvider.GEMINI ? 'bg-neon-blue/10 border-neon-blue text-white' : 'bg-slate-950 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                >
                   <div className="flex items-center gap-3">
                      <Zap className={`w-4 h-4 ${activeProvider === AIProvider.GEMINI ? 'text-neon-blue' : 'text-slate-500'}`} />
                      <div className="text-left">
                         <div className="font-bold text-sm">{T.PROVIDERS.GEMINI_LABEL}</div>
                         <div className="text-[10px] opacity-70">{T.PROVIDERS.GEMINI_SUB}</div>
                      </div>
                   </div>
                   {activeProvider === AIProvider.GEMINI && <div className="text-[10px] font-bold bg-neon-blue text-black px-2 py-0.5 rounded-full">{T.PROVIDERS.ACTIVE}</div>}
                </button>

                {/* DeepSeek Option */}
                <button 
                   onClick={() => handleProviderSelect(AIProvider.DEEPSEEK)}
                   className={`w-full p-3 rounded border flex items-center justify-between transition-all ${activeProvider === AIProvider.DEEPSEEK ? 'bg-purple-600/10 border-purple-500 text-white' : 'bg-slate-950 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                >
                   <div className="flex items-center gap-3">
                      <Crown className={`w-4 h-4 ${activeProvider === AIProvider.DEEPSEEK ? 'text-purple-400' : 'text-slate-500'}`} />
                      <div className="text-left">
                         <div className="font-bold text-sm">{T.PROVIDERS.DEEPSEEK_LABEL}</div>
                         <div className="text-[10px] opacity-70">{T.PROVIDERS.DEEPSEEK_SUB}</div>
                      </div>
                   </div>
                   {userTier === SubscriptionTier.PRO ? (
                       activeProvider === AIProvider.DEEPSEEK && <div className="text-[10px] font-bold bg-purple-500 text-black px-2 py-0.5 rounded-full">{T.PROVIDERS.ACTIVE}</div>
                   ) : (
                       <div className="text-[10px] font-bold border border-purple-500 text-purple-400 px-2 py-0.5 rounded-full">{T.PROVIDERS.UPGRADE}</div>
                   )}
                </button>
             </div>
          </div>

          {/* School License Option */}
          {activeProvider === AIProvider.GEMINI && (
            <div 
                onClick={() => setIsSchoolMode(!isSchoolMode)}
                className={`cursor-pointer p-4 rounded-lg border transition-all flex items-start gap-3 ${isSchoolMode ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}
            >
                <div className={`p-2 rounded ${isSchoolMode ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400'}`}>
                    <School className="w-5 h-5" />
                </div>
                <div>
                    <div className="font-bold text-sm text-white">{T.SCHOOL_MODE}</div>
                    <div className="text-xs text-slate-400 mt-1">
                    {T.SCHOOL_DESC}
                    </div>
                </div>
                {isSchoolMode && <Check className="w-5 h-5 text-emerald-500 mt-1" />}
            </div>
          )}

          {!isSchoolMode && activeProvider === AIProvider.GEMINI && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-lg mb-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-200">
                    <strong className="block mb-1">{T.BYOK_TITLE}</strong>
                    <p className="opacity-70 text-xs leading-relaxed mb-3">
                       {T.BYOK_DESC}
                    </p>
                    
                    <div className="bg-black/30 rounded p-3 text-xs font-mono text-slate-300 mb-3 whitespace-pre-line border border-white/5">
                        {T.KEY_INSTRUCTION}
                    </div>

                    <a 
                      href="https://aistudio.google.com/app/apikey" 
                      target="_blank" 
                      rel="noreferrer" 
                      className="inline-flex items-center gap-2 px-4 py-2 bg-neon-blue/10 hover:bg-neon-blue/20 text-neon-blue border border-neon-blue/50 rounded transition-colors text-xs font-bold"
                    >
                      {T.GET_KEY} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">{T.LABEL_KEY}</label>
                <div className="relative">
                  <input 
                    type="password" 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:border-neon-blue focus:outline-none font-mono text-sm pl-10"
                  />
                  <Key className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                <a 
                   href="https://www.google.com/search?q=how+to+get+gemini+api+key" 
                   target="_blank"
                   rel="noreferrer"
                   className="flex items-center gap-1 text-[10px] text-slate-500 mt-2 hover:text-slate-300"
                >
                   <HelpCircle className="w-3 h-3" /> {T.NEED_HELP}
                </a>
              </div>
            </div>
          )}

          {activeProvider === AIProvider.DEEPSEEK && userTier === SubscriptionTier.PRO && (
              <div className="bg-purple-900/10 border border-purple-500/20 p-4 rounded-lg flex items-center gap-3">
                  <Crown className="w-6 h-6 text-purple-400" />
                  <div>
                      <div className="font-bold text-sm text-white">Pro Plan Active</div>
                      <div className="text-xs text-slate-400">DeepSeek V3 is managed by Yokaizen. No key required.</div>
                  </div>
              </div>
          )}

          <div className="flex gap-3 mt-4">
             <button 
               onClick={handleSave}
               className="flex-1 py-3 bg-white hover:bg-slate-200 text-black font-bold rounded flex items-center justify-center gap-2 transition-colors"
             >
               {saved ? <Check className="w-4 h-4" /> : null}
               {saved ? T.BTN_SAVED : T.BTN_SAVE}
             </button>
             {(apiKey || isSchoolMode) && activeProvider === AIProvider.GEMINI && (
               <button 
                 onClick={handleClear}
                 className="px-4 py-3 border border-red-900/50 text-red-500 hover:bg-red-950/30 rounded"
               >
                 {T.BTN_CLEAR}
               </button>
             )}
          </div>

          <p className="text-[10px] text-center text-slate-600">
            {T.LOCAL_STORAGE}
          </p>
        </div>

      </div>
    </div>
    
    <SubscriptionModal 
        isOpen={showSubModal} 
        onClose={() => setShowSubModal(false)} 
        language={language}
        onSuccess={() => {
            setActiveProvider(AIProvider.DEEPSEEK);
            setUserTier(SubscriptionTier.PRO);
        }}
    />
    </>
  );
};