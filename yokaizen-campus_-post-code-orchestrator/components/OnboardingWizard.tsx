import React, { useState, useRef, useEffect } from 'react';
import { User, PhilosophyMode, Language } from '../types';
import { TERMS } from '../translations';
import { ChevronRight, Check, Key, Shield, Layers, Rocket, Lock, Globe, ExternalLink, RefreshCw } from 'lucide-react';
import { SettingsModal } from './SettingsModal';
import { API } from '../services/api';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles, MeshDistortMaterial, Sphere } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

interface OnboardingWizardProps {
   user: User;
   onComplete: () => void;
}

const BackgroundCore = ({ step, mode }: { step: number, mode: PhilosophyMode }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    
    // Determine colors based on Mode and Step
    const getTargetColor = () => {
        if (step === 3) return '#00ff9d'; // Success / Launch
        switch (mode) {
            case PhilosophyMode.FINLAND: return '#f59e0b'; // Amber
            case PhilosophyMode.JAPAN: return '#00f0ff'; // Cyan
            case PhilosophyMode.KOREA: return '#ff3366'; // Red
            default: return '#00f0ff';
        }
    };
    
    const targetColor = new THREE.Color(getTargetColor());

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.elapsedTime * (0.2 + step * 0.1);
            meshRef.current.rotation.y = state.clock.elapsedTime * (0.15 + step * 0.1);
            
            // Lerp color
            (meshRef.current.material as MeshDistortMaterial).color.lerp(targetColor, 0.05);
            (meshRef.current.material as MeshDistortMaterial).emissive.lerp(targetColor, 0.05);
            
            // Pulse scale
            const targetScale = 1.5 + (step * 0.2);
            meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.05);
        }
    });

    return (
        <Float speed={2 + step} rotationIntensity={1} floatIntensity={2}>
            <Sphere ref={meshRef} args={[1, 64, 64]}>
                <MeshDistortMaterial
                    color={'#00f0ff'}
                    emissive={'#00f0ff'}
                    emissiveIntensity={1.5}
                    distort={0.4 + (step * 0.1)}
                    speed={3 + step}
                    roughness={0.1}
                    metalness={0.9}
                    clearcoat={1}
                />
            </Sphere>
        </Float>
    );
};

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

   const [isSaving, setIsSaving] = useState(false);
   const [errorMsg, setErrorMsg] = useState<string | null>(null);

   useEffect(() => {
      const checkKey = async () => {
         const school = localStorage.getItem('school_mode');
         try {
            const userProfile = await API.auth.getProfile();
            if (userProfile.apiKeys?.google) {
               setHasKey(true);
               setApiKeyInput(userProfile.apiKeys.google);
               return;
            }
         } catch (e) {
            // silent
         }
         if (school === 'true') {
            setHasKey(true);
         }
      };
      checkKey();
   }, [isSettingsOpen]);

   const handleSaveKey = async () => {
      if (apiKeyInput.trim()) {
         setIsSaving(true);
         try {
            await API.user.updateApiKeys({ google: apiKeyInput.trim() });
            localStorage.setItem('school_mode', 'false');
            setHasKey(true);
         } catch (error) {
            console.error("Failed to save key:", error);
            setErrorMsg("Failed to save key securely. Please check connection.");
            setTimeout(() => setErrorMsg(null), 3000);
         } finally {
            setIsSaving(false);
         }
      }
   };

   const handleNext = () => {
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

   const getModeColor = (mode: PhilosophyMode) => {
       if (mode === PhilosophyMode.FINLAND) return '#f59e0b';
       if (mode === PhilosophyMode.JAPAN) return '#00f0ff';
       return '#ff3366';
   };

   const activeColor = currentStep === 3 ? '#00ff9d' : getModeColor(selectedMode);

   return (
      <div className="fixed inset-0 z-[200] flex md:items-center justify-center bg-black font-sans text-slate-200 overflow-y-auto md:overflow-hidden p-0 md:p-4">
         
         <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} language={language} />

         {/* 3D WebGL Background Layer */}
         <div className="absolute inset-0 z-0 pointer-events-none">
            <Canvas camera={{ position: [0, 0, 6], fov: 60 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={2} color={activeColor} />
                <pointLight position={[-10, -10, -10]} intensity={2} color="#ffffff" />
                
                <BackgroundCore step={currentStep} mode={selectedMode} />
                
                <Sparkles count={400} scale={12} size={3} speed={0.5 + currentStep * 0.2} opacity={0.6} color={activeColor} />
                <Sparkles count={200} scale={18} size={5} speed={0.8 + currentStep * 0.2} opacity={0.8} color="#ffffff" />
                
                <EffectComposer>
                    <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={2.0 + currentStep} />
                    <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.003 + currentStep * 0.001, 0.003 + currentStep * 0.001)} />
                </EffectComposer>
            </Canvas>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[4px]"></div>
         </div>

         {/* Floating Global Language Switcher */}
         <div className="absolute top-4 right-4 md:top-8 md:right-8 z-[210]">
            <div className="relative group">
               <button className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-xl text-xs font-bold text-white hover:bg-white/20 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                  <Globe className="w-4 h-4" /> {language}
               </button>
               <div className="absolute top-full right-0 mt-2 w-32 bg-black/80 backdrop-blur-xl border border-white/20 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] hidden group-hover:block max-h-64 overflow-y-auto">
                  {Object.values(Language).map((lang) => (
                     <button key={lang} onClick={() => setLanguage(lang as Language)} className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-white/10 text-white transition-colors">
                        {lang}
                     </button>
                  ))}
               </div>
            </div>
         </div>

         {/* Main Glass Panel */}
         <div className="w-full max-w-5xl min-h-screen md:min-h-0 md:h-[700px] z-10 bg-white/5 backdrop-blur-3xl border-0 md:border border-white/10 rounded-none md:rounded-[2rem] shadow-[0_0_80px_rgba(0,0,0,0.6)] flex flex-col md:flex-row overflow-hidden relative">
            
            {/* Ambient Top Glow */}
            <div className="absolute top-0 left-0 w-full h-1" style={{ background: `linear-gradient(90deg, transparent, ${activeColor}, transparent)` }}></div>

            {/* Left Sidebar Steps (Mobile: Top Bar) */}
            <div className="w-full md:w-80 bg-black/40 border-b md:border-b-0 md:border-r border-white/10 p-6 md:p-10 flex flex-row md:flex-col justify-between relative shrink-0">
               <div className="relative z-10 w-full">
                  <div className="flex items-center gap-3 mb-6 md:mb-16">
                     <div className="w-4 h-4 rounded-full animate-pulse" style={{ backgroundColor: activeColor, boxShadow: `0 0 20px ${activeColor}` }} />
                     <span className="font-black tracking-[0.3em] text-sm text-white">{T.SETUP}</span>
                  </div>

                  {/* Steps List */}
                  <div className="flex md:flex-col gap-3 md:gap-10 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-hide">
                     {STEPS.map((step, i) => (
                        <div key={i} className={`flex items-center md:items-start gap-3 md:gap-5 transition-all duration-700 whitespace-nowrap ${i === currentStep ? 'opacity-100 scale-105 md:translate-x-3' : 'opacity-40'}`}>
                           <div className={`flex flex-col items-center gap-3`}>
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 text-sm font-black transition-all shrink-0
                             ${i < currentStep ? 'bg-white text-black border-white' : i === currentStep ? 'bg-black text-white' : 'bg-transparent border-white/20 text-white/50'}
                          `} style={i === currentStep ? { borderColor: activeColor, boxShadow: `0 0 20px ${activeColor}40` } : {}}>
                                 {i < currentStep ? <Check className="w-5 h-5" /> : i + 1}
                              </div>
                              {/* Vertical Line Only on Desktop */}
                              {i !== 3 && <div className={`hidden md:block w-px h-full min-h-[2rem] transition-colors ${i < currentStep ? 'bg-white/50' : 'bg-white/10'}`} />}
                           </div>
                           <div className="hidden md:block pb-2 pt-1">
                              <div className={`font-black tracking-widest text-sm uppercase ${i === currentStep ? 'text-white' : 'text-white/50'}`}>{step.title}</div>
                              <div className="text-[10px] text-white/40 mt-1.5 uppercase tracking-[0.2em] font-bold">{step.desc}</div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="hidden md:block text-[10px] text-white/30 font-mono tracking-widest">
                  {TC.SESSION_ID}: {user.id.substring(0, 8)}
               </div>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 p-6 md:p-12 flex flex-col relative overflow-y-auto">

               {/* STEP 1: BRIEFING */}
               {currentStep === 0 && (
                  <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-8 duration-700">
                     <div className="mb-8 mt-4 md:mt-0">
                        <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight drop-shadow-lg">{T.WELCOME}</h2>
                        <p className="text-lg md:text-xl text-white/70 font-medium leading-relaxed">{T.WELCOME_SUB}</p>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8 mt-auto">
                        <div className="bg-black/30 border border-white/10 rounded-3xl p-8 backdrop-blur-md">
                           <div className="flex items-center gap-4 mb-4" style={{ color: activeColor }}>
                              <Layers className="w-7 h-7" />
                              <h3 className="font-black text-sm uppercase tracking-[0.2em]">{T.CONCEPT}</h3>
                           </div>
                           <p className="text-sm text-white/60 leading-relaxed font-medium">
                              {T.CONCEPT_DESC}
                           </p>
                        </div>
                        <div className="bg-black/30 border border-white/10 rounded-3xl p-8 backdrop-blur-md">
                           <div className="flex items-center gap-4 mb-4 text-[#b026ff]">
                              <Shield className="w-7 h-7" />
                              <h3 className="font-black text-sm uppercase tracking-[0.2em]">Role</h3>
                           </div>
                           <p className="text-sm text-white/60 leading-relaxed font-medium">
                              {T.ROLE_DESC}
                           </p>
                        </div>
                     </div>
                  </div>
               )}

               {/* STEP 2: PHILOSOPHY */}
               {currentStep === 1 && (
                  <div className="flex-1 flex flex-col justify-center animate-in fade-in zoom-in-95 duration-700">
                     <h2 className="text-4xl font-black text-white mb-4 tracking-tight text-center">{T.THEME_SELECT}</h2>
                     <p className="text-center text-white/50 tracking-widest uppercase font-bold text-sm mb-12">Select your architectural paradigm</p>
                     
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                           { mode: PhilosophyMode.FINLAND, label: 'FINLAND', sub: 'Organic Mastery', colorBase: '#f59e0b', bgClass: 'from-amber-500/20 to-orange-600/20' },
                           { mode: PhilosophyMode.JAPAN, label: 'JAPAN', sub: 'Harmonic Flow', colorBase: '#00f0ff', bgClass: 'from-cyan-500/20 to-blue-600/20' },
                           { mode: PhilosophyMode.KOREA, label: 'KOREA', sub: 'Cyber Kinetic', colorBase: '#ff3366', bgClass: 'from-rose-500/20 to-red-600/20' },
                        ].map(opt => {
                           const isSelected = selectedMode === opt.mode;
                           return (
                              <button
                                 key={opt.mode}
                                 onClick={() => setSelectedMode(opt.mode)}
                                 className={`p-8 rounded-3xl border-2 text-center transition-all duration-300 group relative overflow-hidden
                                    ${isSelected
                                      ? `border-white bg-gradient-to-br ${opt.bgClass} scale-105 shadow-[0_0_40px_rgba(255,255,255,0.2)]`
                                      : 'border-white/10 bg-black/40 hover:border-white/30 hover:bg-white/5'
                                    }`}
                              >
                                 {isSelected && <div className="absolute inset-0 bg-white/5 animate-pulse"></div>}
                                 <div className="relative z-10 w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-6 shadow-inner border border-white/20" style={{ background: `linear-gradient(135deg, ${opt.colorBase}40, transparent)`, color: opt.colorBase, boxShadow: isSelected ? `0 0 30px ${opt.colorBase}60` : 'none' }}>
                                    <Layers className="w-8 h-8" />
                                 </div>
                                 <div className={`font-black text-2xl mb-2 tracking-wider ${isSelected ? 'text-white' : 'text-white/70'}`}>{opt.label}</div>
                                 <div className={`text-xs font-bold uppercase tracking-[0.2em] ${isSelected ? 'text-white/90' : 'text-white/40'}`}>{opt.sub}</div>
                              </button>
                           );
                        })}
                     </div>
                  </div>
               )}

               {/* STEP 3: API KEY */}
               {currentStep === 2 && (
                  <div className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-right-8 duration-700">
                     <h2 className="text-3xl md:text-5xl font-black text-white mb-2 flex items-center gap-4 tracking-tighter">
                        {T.CONNECT_ENGINE} <Key className="w-8 h-8 animate-pulse" style={{ color: activeColor }} />
                     </h2>
                     <p className="text-white/50 tracking-widest uppercase font-bold text-sm mb-8 mt-2">Initialize the cognitive backend</p>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <button
                           onClick={() => setShowExplainer(showExplainer === 'what' ? null : 'what')}
                           className={`text-left p-6 rounded-2xl border transition-all ${showExplainer === 'what' ? 'bg-white/10 border-white text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'bg-black/30 border-white/10 text-white/50 hover:bg-white/5'}`}
                        >
                           <div className="font-black text-sm flex items-center gap-3 uppercase tracking-widest"><Key className="w-5 h-5" /> {T.WHAT_IS_KEY}</div>
                           {showExplainer === 'what' && <p className="text-xs mt-3 leading-relaxed animate-in fade-in opacity-80">{T.WHAT_IS_KEY_DESC}</p>}
                        </button>
                        <button
                           onClick={() => setShowExplainer(showExplainer === 'safe' ? null : 'safe')}
                           className={`text-left p-6 rounded-2xl border transition-all ${showExplainer === 'safe' ? 'bg-white/10 border-white text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'bg-black/30 border-white/10 text-white/50 hover:bg-white/5'}`}
                        >
                           <div className="font-black text-sm flex items-center gap-3 uppercase tracking-widest"><Lock className="w-5 h-5" /> {T.IS_SAFE}</div>
                           {showExplainer === 'safe' && <p className="text-xs mt-3 leading-relaxed animate-in fade-in opacity-80">{T.IS_SAFE_DESC}</p>}
                        </button>
                     </div>

                     <div className="bg-black/40 border border-white/20 rounded-[2rem] p-8 md:p-12 relative overflow-hidden flex flex-col items-center backdrop-blur-xl shadow-2xl">
                        {!hasKey ? (
                           <div className="relative z-10 w-full max-w-lg space-y-6 text-center">
                              <a
                                 href="https://aistudio.google.com/app/apikey"
                                 target="_blank"
                                 rel="noreferrer"
                                 className="w-full py-5 bg-white text-black font-black text-lg uppercase tracking-[0.2em] rounded-2xl transition-all hover:scale-105 flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.4)]"
                              >
                                 {T.GET_KEY_BUTTON} <ExternalLink className="w-6 h-6" />
                              </a>
                              <div className="relative">
                                 <input
                                    type="password"
                                    value={apiKeyInput}
                                    onChange={(e) => setApiKeyInput(e.target.value)}
                                    placeholder={T.PASTE_KEY}
                                    className="w-full bg-black/50 border-2 border-white/20 rounded-2xl p-5 text-white focus:border-white focus:bg-black/80 focus:outline-none font-mono text-base transition-all"
                                 />
                                 {errorMsg && <div className="text-red-400 text-sm mt-3 font-bold animate-pulse">{errorMsg}</div>}
                                 {apiKeyInput.length > 10 && (
                                    <button
                                       onClick={handleSaveKey}
                                       disabled={isSaving}
                                       className="absolute right-3 top-1/2 -translate-y-1/2 bg-white text-black text-sm font-black px-5 py-2.5 rounded-xl hover:bg-slate-200 disabled:opacity-50 tracking-widest uppercase"
                                    >
                                       {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : (TC.CONFIRM || "SAVE")}
                                    </button>
                                 )}
                              </div>
                           </div>
                        ) : (
                           <div className="relative z-10 flex flex-col items-center text-[#00ff9d] animate-in zoom-in duration-500">
                              <div className="w-24 h-24 bg-[#00ff9d]/10 rounded-full flex items-center justify-center mb-6 border-2 border-[#00ff9d] shadow-[0_0_40px_rgba(0,255,157,0.3)]">
                                 <Check className="w-12 h-12" />
                              </div>
                              <div className="font-black text-2xl text-white tracking-widest uppercase">{TC.SYSTEM_READY}</div>
                              <p className="text-sm font-bold text-white/50 mt-3 tracking-[0.2em]">{TC.KEY_ENDING} ...{apiKeyInput.slice(-4) || '****'}</p>
                              <button onClick={() => setHasKey(false)} className="text-xs tracking-widest uppercase font-bold underline mt-6 text-white/40 hover:text-white transition-colors">{TC.CHANGE_KEY}</button>
                           </div>
                        )}
                     </div>
                  </div>
               )}

               {/* STEP 4: LAUNCH */}
               {currentStep === 3 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-1000 slide-in-from-bottom-10">
                     <div className="w-40 h-40 bg-[#00ff9d]/10 rounded-full flex items-center justify-center mb-10 relative">
                        <div className="absolute inset-0 border-4 border-[#00ff9d]/50 rounded-full animate-[spin_4s_linear_infinite]" style={{ borderTopColor: 'transparent', borderRightColor: 'transparent' }}></div>
                        <div className="absolute inset-0 border-2 border-white/20 rounded-full animate-[spin_8s_linear_infinite_reverse]"></div>
                        <Rocket className="w-16 h-16 text-[#00ff9d]" />
                     </div>
                     <h2 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tighter drop-shadow-[0_0_20px_rgba(0,255,157,0.5)]">{T.SYSTEMS_ONLINE}</h2>
                     <p className="text-xl text-[#00ff9d] font-bold tracking-[0.3em] uppercase">Architecture Validated</p>
                  </div>
               )}

               {/* Navigation Footer */}
               <div className="flex justify-between items-center mt-auto pt-8 border-t border-white/10 z-10">
                  <button
                     onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                     disabled={currentStep === 0}
                     className="text-white/50 hover:text-white disabled:opacity-0 transition-opacity flex items-center gap-3 text-sm font-black uppercase tracking-widest"
                  >
                     {TC.BACK}
                  </button>

                  <button
                     onClick={handleNext}
                     disabled={currentStep === 2 && !hasKey}
                     className={`
                   px-10 py-5 rounded-2xl font-black transition-all flex items-center gap-3 text-sm tracking-[0.2em] uppercase
                   ${currentStep === 2 && !hasKey
                           ? 'bg-white/10 text-white/30 cursor-not-allowed border border-white/10'
                           : 'bg-white text-black hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.4)]'}
                `}
                  >
                     {T.CONTINUE} <ChevronRight className="w-5 h-5" />
                  </button>
               </div>
            </div>

         </div>
      </div>
   );
};
