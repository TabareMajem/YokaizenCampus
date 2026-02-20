

import React, { useState } from 'react';
import {
   ArrowRight, BrainCircuit, Globe, ShieldCheck, Zap, Layers,
   Key, Check, Play, Users, ChevronDown, FlaskConical, AlertTriangle,
   Monitor, Layout, Network, Eye, Wand2, Activity, RefreshCw, ChevronUp, Building2, HeartHandshake, Crown
} from 'lucide-react';
import { SettingsModal } from './SettingsModal';
import { SubscriptionModal } from './SubscriptionModal';
import { Language } from '../types';
import { TERMS } from '../translations';
import { Canvas } from '@react-three/fiber';
import { Stars, Float, Sparkles } from '@react-three/drei';
import { CyberpunkEffects } from './CyberpunkEffects';

interface LandingPageProps {
   onLoginClick: () => void;
   onGuideClick: () => void;
   language: Language;
   setLanguage: (lang: Language) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onGuideClick, language, setLanguage }) => {
   const [isSettingsOpen, setIsSettingsOpen] = useState(false);
   const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
   const [isSubModalOpen, setIsSubModalOpen] = useState(false);

   const T = TERMS[language].LANDING;
   const TF = TERMS[language].LANDING.FEATURES_EXTENDED;
   const TC = TERMS[language].LANDING.CONSOLE;
   const TN = TERMS[language].LANDING.NGO;
   const TP = TERMS[language].LANDING.PRICING_PRO;

   const scrollToSection = (id: string) => {
      const element = document.getElementById(id);
      if (element) {
         element.scrollIntoView({ behavior: 'smooth' });
      }
   };

   return (
      <div className="w-full h-screen bg-[#030712] text-white overflow-y-auto selection:bg-neon-blue selection:text-black font-sans scroll-smooth">
         <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} language={language} />
         <SubscriptionModal isOpen={isSubModalOpen} onClose={() => setIsSubModalOpen(false)} language={language} onSuccess={() => onLoginClick()} />

         {/* NAV */}
         <nav className="fixed top-0 w-full z-50 px-6 md:px-12 py-6 flex flex-wrap justify-between items-center backdrop-blur-md border-b border-white/5 bg-[#030712]/80 transition-all">
            <div className="flex items-center gap-6">
               <div className="font-bold tracking-wider text-xl flex items-center gap-2 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                  {/* Complex Logo */}
                  <div className="relative w-8 h-8 flex items-center justify-center">
                     <div className="absolute inset-0 border-2 border-neon-blue/30 rounded-full group-hover:border-neon-blue transition-colors"></div>
                     <div className="absolute inset-2 border-2 border-neon-purple/30 rounded-full group-hover:border-neon-purple transition-colors rotate-45"></div>
                     <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white]"></div>
                  </div>
                  <span className="font-mono text-sm md:text-base">YOKAIZEN <span className="text-slate-500">CAMPUS</span></span>
               </div>

               <a
                  href="https://AI.yokaizencampus.com"
                  target="_blank"
                  rel="noreferrer"
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 text-[10px] font-bold text-pink-400 tracking-wider hover:text-pink-300 transition-all"
               >
                  <FlaskConical className="w-3 h-3" />
                  YOKAIZEN AI LABS
               </a>
            </div>

            <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-400">
               <button onClick={() => scrollToSection('vision')} className="hover:text-white transition-colors">{T.VISION}</button>
               <button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">{T.FEATURES}</button>
               <button onClick={onGuideClick} className="hover:text-neon-blue transition-colors text-white font-bold tracking-widest uppercase">User Guide</button>
               <button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors">{T.PRICING}</button>
            </div>

            <div className="flex items-center gap-4">
               {/* Lang Selector */}
               <div className="relative">
                  <button
                     onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                     className={`text-xs font-bold transition-all flex items-center gap-2 px-3 py-2 rounded-full border ${isLangMenuOpen ? 'bg-white text-black border-white' : 'text-slate-400 border-slate-700 hover:border-white hover:text-white'}`}
                  >
                     <Globe className="w-3 h-3" />
                     {language}
                     {isLangMenuOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {isLangMenuOpen && (
                     <div className="absolute top-full right-0 mt-3 w-48 bg-[#0f172a]/95 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in duration-200">
                        <div className="max-h-64 overflow-y-auto p-1">
                           {Object.values(Language).map((lang) => (
                              <button
                                 key={lang}
                                 onClick={() => { setLanguage(lang as Language); setIsLangMenuOpen(false); }}
                                 className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between group ${language === lang ? 'bg-neon-blue/20 text-neon-blue' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                              >
                                 {lang}
                                 {language === lang && <Check className="w-3 h-3" />}
                              </button>
                           ))}
                        </div>
                     </div>
                  )}
               </div>

               <button
                  onClick={onLoginClick}
                  className="px-6 py-2 bg-white text-black text-sm font-bold rounded-full hover:bg-slate-200 transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
               >
                  {T.LAUNCH}
               </button>
            </div>
         </nav>

         {/* HERO SECTION */}
         <header className="relative min-h-screen flex flex-col items-center justify-center p-6 text-center overflow-hidden">
            {/* 3D WebGL Background */}
            <div className="absolute inset-0 z-0 opacity-80">
               <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
                  <ambientLight intensity={0.5} />
                  <pointLight position={[5, 0, 5]} intensity={5} color="#00f3ff" />
                  <pointLight position={[-5, 0, 5]} intensity={5} color="#a855f7" />

                  <Stars radius={50} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
                  <Sparkles count={200} scale={12} size={2} speed={0.4} opacity={0.3} color="#ffffff" />

                  <Float speed={2} rotationIntensity={0.5} floatIntensity={2}>
                     <mesh position={[0, 0, -5]}>
                        <torusGeometry args={[8, 0.02, 16, 100]} />
                        <meshBasicMaterial color="#00f3ff" transparent opacity={0.2} />
                     </mesh>
                     <mesh position={[0, 0, -5]} rotation={[Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[6, 0.02, 16, 100]} />
                        <meshBasicMaterial color="#a855f7" transparent opacity={0.2} />
                     </mesh>
                  </Float>

                  <CyberpunkEffects
                     bloomIntensity={2}
                     glitchFactor={0}
                     noiseOpacity={0.15}
                     bloomLuminanceThreshold={0.4}
                  />
               </Canvas>
            </div>

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#030712_100%)] pointer-events-none z-[1]"></div>

            {/* Orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-blue/20 rounded-full blur-[120px] animate-pulse-slow z-[1]"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/20 rounded-full blur-[120px] animate-pulse-slow z-[1]"></div>

            <div className="relative z-10 max-w-6xl space-y-8 mt-20 animate-in fade-in zoom-in duration-1000">

               <div className="inline-flex items-center gap-2 border border-white/20 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full text-slate-300 text-xs font-bold tracking-widest uppercase mb-4 hover:bg-white/10 transition-colors shadow-[0_0_15px_rgba(0,243,255,0.2)]">
                  <Zap className="w-3 h-3 text-neon-blue" /> {T.BADGE_V3}
               </div>

               <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] text-white drop-shadow-2xl">
                  {T.HERO_TITLE}<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-purple-500 to-neon-purple drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]">{T.HERO_SUBTITLE}</span>
               </h1>

               <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto font-light leading-relaxed mt-6 drop-shadow-md">
                  {T.HERO_DESC}
               </p>

               <div className="flex flex-col md:flex-row items-center justify-center gap-6 mt-12">
                  <button
                     onClick={onLoginClick}
                     className="px-10 py-5 bg-white text-black text-lg font-black tracking-widest uppercase rounded-full hover:bg-neon-blue hover:text-white transition-all flex items-center gap-3 group shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:scale-105"
                  >
                     {T.CTA_START} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                     onClick={() => scrollToSection('features')}
                     className="px-8 py-5 border-2 border-white/20 text-white text-lg font-bold rounded-full hover:bg-white/10 hover:border-white/50 transition-all flex items-center gap-3 backdrop-blur-sm"
                  >
                     <Play className="w-5 h-5 fill-current" /> {T.CTA_DEMO}
                  </button>
               </div>

               <div className="mt-16 flex flex-wrap items-center justify-center gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-700 bg-black/20 backdrop-blur-md py-4 px-8 rounded-full border border-white/5">
                  <div className="flex items-center gap-2 font-mono text-xs"><ShieldCheck className="w-4 h-4 text-neon-blue" /> {T.FEATURE_DATA}</div>
                  <div className="flex items-center gap-2 font-mono text-xs"><Globe className="w-4 h-4 text-purple-400" /> {T.FEATURE_LANG}</div>
                  <div className="flex items-center gap-2 font-mono text-xs"><Users className="w-4 h-4 text-emerald-400" /> {T.FEATURE_CLASS}</div>
               </div>
            </div>

            <button
               onClick={() => scrollToSection('vision')}
               className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-80 hover:opacity-100 hover:text-neon-blue transition-colors p-2 z-10 drop-shadow-[0_0_10px_white]"
            >
               <ChevronDown className="w-8 h-8" />
            </button>
         </header>

         {/* URGENCY / MANIFESTO */}
         <section className="py-24 bg-red-950/10 border-y border-red-900/30">
            <div className="max-w-4xl mx-auto px-6 text-center">
               <div className="inline-flex items-center gap-2 text-red-500 font-bold uppercase tracking-widest mb-6 border border-red-900/50 bg-red-950/20 px-3 py-1 rounded-full text-xs">
                  <AlertTriangle className="w-4 h-4" /> {T.WHY_NOW_TITLE}
               </div>
               <h2 className="text-3xl md:text-5xl font-bold mb-8 leading-tight">
                  {T.WHY_NOW_DESC}
               </h2>
               <button
                  onClick={onLoginClick}
                  className="text-red-400 hover:text-white underline decoration-red-800 underline-offset-4 hover:decoration-white transition-all"
               >
                  {T.CTA_ENTER}
               </button>
            </div>
         </section>

         {/* VISION SECTION */}
         <section id="vision" className="py-32 bg-slate-950 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
               <div>
                  <h2 className="text-sm font-bold text-neon-blue uppercase tracking-widest mb-4">{T.PARADIGM}</h2>
                  <h3 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">{T.PARADIGM_TITLE}</h3>
                  <div className="space-y-6 text-lg text-slate-400 leading-relaxed">
                     <p>
                        {T.PARADIGM_DESC}
                     </p>
                  </div>
               </div>
               <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-tr from-neon-blue/20 to-purple-600/20 rounded-2xl blur-2xl"></div>
                  <div className="relative bg-[#0f172a] border border-white/10 rounded-2xl p-8 shadow-2xl">
                     {/* Mock UI of Node Graph */}
                     <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                        <div className="text-xs font-mono text-slate-500">{TC.PROJECT_NAME}</div>
                        <div className="flex gap-2">
                           <div className="w-2 h-2 rounded-full bg-red-500"></div>
                           <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                           <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        </div>
                     </div>
                     <div className="flex justify-center gap-8 mb-8">
                        <div className="w-16 h-16 rounded-lg border border-neon-blue bg-neon-blue/10 flex items-center justify-center"><BrainCircuit className="w-8 h-8 text-neon-blue" /></div>
                        <div className="w-8 h-0.5 bg-white/20 self-center"></div>
                        <div className="w-16 h-16 rounded-lg border border-purple-500 bg-purple-500/10 flex items-center justify-center"><ShieldCheck className="w-8 h-8 text-purple-500" /></div>
                        <div className="w-8 h-0.5 bg-white/20 self-center"></div>
                        <div className="w-16 h-16 rounded-lg border border-emerald-500 bg-emerald-500/10 flex items-center justify-center"><Check className="w-8 h-8 text-emerald-500" /></div>
                     </div>
                     <div className="space-y-3 font-mono text-xs">
                        <div className="text-slate-400">{'>'} {TC.INIT_AGENT} <span className="text-green-500">OK</span></div>
                        <div className="text-slate-400">{'>'} {TC.GEN_SCHEMATIC} <span className="text-green-500">OK</span></div>
                        <div className="text-slate-400">{'>'} {TC.AUDIT_STRUCT} <span className="text-red-500 animate-pulse">{TC.WARN_HALLUCINATION}</span></div>
                     </div>
                  </div>
               </div>
            </div>
         </section>

         {/* THE MENTAL DOJO / 5 PILLARS */}
         <section id="dojo" className="py-24 bg-black relative border-t border-white/5 overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-neon-blue/5 rounded-full blur-[150px] pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-6 relative z-10">
               <div className="text-center mb-20 max-w-3xl mx-auto">
                  <h2 className="text-sm font-bold text-neon-blue uppercase tracking-widest mb-4">{T.PARADIGM_SECTION?.TITLE || "The Mental Dojo"}</h2>
                  <h3 className="text-3xl md:text-5xl font-bold mb-6">{T.PARADIGM_SECTION?.SUBTITLE || "Training for the AGI Era"}</h3>
                  <p className="text-lg text-slate-400 leading-relaxed">{T.PARADIGM_SECTION?.DESC || "Yokaizen Campus is not a school. It is a Mental Dojo designed to forge cognitive resilience, curate taste, and defend epistemic truth in a world where AI executes 90% of tasks."}</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 hover:border-neon-blue/50 transition-all flex flex-col items-center text-center group shadow-xl">
                     <div className="w-16 h-16 rounded-full bg-neon-blue/10 flex items-center justify-center mb-6 border border-neon-blue/30 group-hover:scale-110 transition-transform">
                        <BrainCircuit className="w-8 h-8 text-neon-blue" />
                     </div>
                     <h4 className="text-xl font-bold mb-3">{T.PARADIGM_SECTION?.PILLAR_1_TITLE || "Orchestration & Taste"}</h4>
                     <p className="text-slate-400 text-sm leading-relaxed text-balance">{T.PARADIGM_SECTION?.PILLAR_1_DESC || "Becoming Directors, not Doers. Mastering specialized AI Squads."}</p>
                  </div>

                  <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 hover:border-red-500/50 transition-all flex flex-col items-center text-center group shadow-xl">
                     <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/30 group-hover:scale-110 transition-transform">
                        <Activity className="w-8 h-8 text-red-500" />
                     </div>
                     <h4 className="text-xl font-bold mb-3">{T.PARADIGM_SECTION?.PILLAR_2_TITLE || "Cognitive Resilience"}</h4>
                     <p className="text-slate-400 text-sm leading-relaxed text-balance">{T.PARADIGM_SECTION?.PILLAR_2_DESC || "Training focus & frustration tolerance through engineered friction."}</p>
                  </div>

                  <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 hover:border-purple-500/50 transition-all flex flex-col items-center text-center group shadow-xl">
                     <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-6 border border-purple-500/30 group-hover:scale-110 transition-transform">
                        <ShieldCheck className="w-8 h-8 text-purple-500" />
                     </div>
                     <h4 className="text-xl font-bold mb-3">{T.PARADIGM_SECTION?.PILLAR_3_TITLE || "Epistemic Hygiene"}</h4>
                     <p className="text-slate-400 text-sm leading-relaxed text-balance">{T.PARADIGM_SECTION?.PILLAR_3_DESC || "Surviving 'Reality Collapse' by hunting deepfakes and truth."}</p>
                  </div>

                  <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 hover:border-emerald-500/50 transition-all flex flex-col items-center text-center group lg:col-start-1 lg:col-end-auto md:col-span-1 shadow-xl">
                     <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/30 group-hover:scale-110 transition-transform">
                        <HeartHandshake className="w-8 h-8 text-emerald-500" />
                     </div>
                     <h4 className="text-xl font-bold mb-3">{T.PARADIGM_SECTION?.PILLAR_4_TITLE || "Deep Empathy"}</h4>
                     <p className="text-slate-400 text-sm leading-relaxed text-balance">{T.PARADIGM_SECTION?.PILLAR_4_DESC || "Enhancing human-to-human negotiation where logic AI fails."}</p>
                  </div>

                  <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 hover:border-pink-500/50 transition-all flex flex-col items-center text-center group md:col-span-2 lg:col-span-2 shadow-xl">
                     <div className="w-16 h-16 rounded-full bg-pink-500/10 flex items-center justify-center mb-6 border border-pink-500/30 group-hover:scale-110 transition-transform">
                        <Layout className="w-8 h-8 text-pink-500" />
                     </div>
                     <h4 className="text-xl font-bold mb-3">{T.PARADIGM_SECTION?.PILLAR_5_TITLE || "Philosophical Grounding"}</h4>
                     <p className="text-slate-400 text-sm leading-relaxed text-balance max-w-lg">{T.PARADIGM_SECTION?.PILLAR_5_DESC || "Discovering meaning beyond automated labor via Existentialism."}</p>
                  </div>
               </div>
            </div>
         </section>

         {/* DETAILED FEATURES / SHOWCASE */}
         <section id="features" className="py-32 bg-[#030712] relative border-t border-white/5">
            <div className="max-w-7xl mx-auto px-6">
               <div className="text-center mb-20 max-w-3xl mx-auto">
                  <div className="inline-flex items-center gap-2 bg-purple-900/20 border border-purple-500/30 px-3 py-1 rounded-full text-purple-400 text-xs font-bold uppercase tracking-wider mb-6">
                     <Layout className="w-3 h-3" /> {TF.SHOWCASE_TITLE}
                  </div>
                  <h2 className="text-3xl md:text-5xl font-bold mb-6">{T.HOW_IT_WORKS}</h2>
                  <p className="text-lg text-slate-400 leading-relaxed">{TF.SHOWCASE_DESC}</p>
               </div>

               {/* PRODUCT SHOWCASE (BROWSER MOCKUP) */}
               <div className="relative w-full max-w-5xl mx-auto aspect-video bg-[#0f172a] rounded-xl border border-white/10 shadow-2xl overflow-hidden mb-24 group">
                  {/* Browser Header */}
                  <div className="bg-[#1e293b] px-4 py-3 flex items-center gap-4 border-b border-white/5">
                     <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                     </div>
                     <div className="flex-1 bg-[#0f172a] rounded-md h-6 w-full max-w-sm mx-auto flex items-center justify-center text-[10px] text-slate-500 font-mono">
                        {TC.MOCK_URL || "campus.yokaizen.com/simulation/active"}
                     </div>
                  </div>

                  {/* Fake UI Content */}
                  <div className="p-8 grid grid-cols-12 gap-6 h-full relative">
                     <div className="absolute inset-0 bg-grid-white/[0.03] pointer-events-none"></div>

                     {/* Left Panel */}
                     <div className="col-span-2 space-y-3 hidden md:block">
                        {[1, 2, 3, 4].map(i => (
                           <div key={i} className="h-10 bg-white/5 rounded w-full animate-pulse" style={{ animationDelay: `${i * 100}ms` }}></div>
                        ))}
                     </div>

                     {/* Center Canvas */}
                     <div className="col-span-12 md:col-span-7 relative">
                        {/* Node Graph Mock */}
                        <div className="absolute top-1/4 left-1/4 w-32 h-16 bg-neon-blue/20 border border-neon-blue rounded-lg flex items-center justify-center text-xs font-bold text-neon-blue shadow-[0_0_20px_rgba(0,243,255,0.2)]">
                           {TERMS[language].AGENTS?.SCOUT || "SCOUT"}
                        </div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-16 bg-purple-500/20 border border-purple-500 rounded-lg flex items-center justify-center text-xs font-bold text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                           {TERMS[language].AGENTS?.ARCHITECT || "ARCHITECT"}
                        </div>
                        <div className="absolute bottom-1/4 right-1/4 w-32 h-16 bg-emerald-500/20 border border-emerald-500 rounded-lg flex items-center justify-center text-xs font-bold text-emerald-400">
                           {TERMS[language].AGENTS?.AUDITOR || "AUDITOR"}
                        </div>

                        {/* Connecting Lines (SVG overlay) */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-50">
                           <path d="M 220 150 C 300 150, 300 250, 400 250" stroke="#00f3ff" fill="none" strokeWidth="2" strokeDasharray="5,5" />
                           <path d="M 400 280 C 500 280, 500 350, 600 350" stroke="#a855f7" fill="none" strokeWidth="2" />
                        </svg>
                     </div>

                     {/* Right Panel */}
                     <div className="col-span-3 hidden md:block border-l border-white/5 pl-6">
                        <div className="h-4 w-24 bg-white/10 rounded mb-4"></div>
                        <div className="space-y-2">
                           <div className="text-[10px] font-mono text-green-400">{'>'} {TC.SYS_ONLINE || "System Online"}</div>
                           <div className="text-[10px] font-mono text-slate-400">{'>'} {TC.PROC_QUERY || "Processing..."}</div>
                           <div className="text-[10px] font-mono text-slate-400">{'>'} {TC.OPT_TOKENS || "Optimizing..."}</div>
                           <div className="text-[10px] font-mono text-red-400 animate-pulse">{'>'} {TC.HIGH_LATENCY || "ALERT"}</div>
                        </div>
                     </div>

                     {/* Floating Command Bar */}
                     <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-1/2 h-12 bg-[#0f172a] border border-white/20 rounded-full shadow-2xl flex items-center px-4 gap-3">
                        <div className="w-2 h-2 rounded-full bg-neon-blue animate-pulse"></div>
                        <div className="text-xs text-slate-400 font-mono">{TC.MOCK_CMD || "Enter command..."}</div>
                     </div>
                  </div>
               </div>

               {/* DUAL TRACKS */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-32">
                  {/* Student Track */}
                  <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-black border border-slate-800 relative overflow-hidden group hover:border-neon-blue/50 transition-colors">
                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <BrainCircuit className="w-32 h-32" />
                     </div>
                     <div className="text-xs font-bold text-neon-blue mb-4 uppercase tracking-widest">{TF.STUDENT_TRACK}</div>
                     <h3 className="text-3xl font-bold mb-4">{TF.STUDENT_HEAD}</h3>
                     <p className="text-slate-400 leading-relaxed mb-8">{TF.STUDENT_BODY}</p>
                     <div className="flex gap-4">
                        <div className="px-4 py-2 bg-slate-800 rounded-lg text-xs font-bold text-white border border-slate-700">1. {T.EXECUTE}</div>
                        <div className="px-4 py-2 bg-slate-800 rounded-lg text-xs font-bold text-white border border-slate-700">2. {TERMS[language].SKILLS?.ORCHESTRATION || "Orchestrate"}</div>
                        <div className="px-4 py-2 bg-slate-800 rounded-lg text-xs font-bold text-white border border-slate-700">3. {TERMS[language].SKILLS?.AUDITING || "Audit"}</div>
                     </div>
                  </div>

                  {/* Teacher Track */}
                  <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-black border border-slate-800 relative overflow-hidden group hover:border-purple-500/50 transition-colors">
                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Activity className="w-32 h-32" />
                     </div>
                     <div className="text-xs font-bold text-purple-400 mb-4 uppercase tracking-widest">{TF.TEACHER_TRACK}</div>
                     <h3 className="text-3xl font-bold mb-4">{TF.TEACHER_HEAD}</h3>
                     <p className="text-slate-400 leading-relaxed mb-8">{TF.TEACHER_BODY}</p>
                     <div className="flex gap-4">
                        <div className="px-4 py-2 bg-slate-800 rounded-lg text-xs font-bold text-white border border-slate-700">1. {TERMS[language].TEACHER?.GHOST_MODE || "Monitor"}</div>
                        <div className="px-4 py-2 bg-slate-800 rounded-lg text-xs font-bold text-white border border-slate-700">2. {TERMS[language].TEACHER?.INTERVENTION || "Intervene"}</div>
                        <div className="px-4 py-2 bg-slate-800 rounded-lg text-xs font-bold text-white border border-slate-700">3. {TERMS[language].ATHENA?.ACTIONS?.GRADE || "Grade"}</div>
                     </div>
                  </div>
               </div>

               {/* FEATURE GRID */}
               <div className="text-center mb-16">
                  <h2 className="text-3xl font-bold mb-4">{TF.GRID_TITLE}</h2>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                     { icon: Network, title: TF.FEAT_1_TITLE, desc: TF.FEAT_1_DESC, color: 'text-neon-blue' },
                     { icon: Eye, title: TF.FEAT_2_TITLE, desc: TF.FEAT_2_DESC, color: 'text-emerald-400' },
                     { icon: Wand2, title: TF.FEAT_3_TITLE, desc: TF.FEAT_3_DESC, color: 'text-purple-400' },
                     { icon: Activity, title: TF.FEAT_4_TITLE, desc: TF.FEAT_4_DESC, color: 'text-amber-400' },
                     { icon: RefreshCw, title: TF.FEAT_5_TITLE, desc: TF.FEAT_5_DESC, color: 'text-pink-400' },
                     { icon: AlertTriangle, title: TF.FEAT_6_TITLE, desc: TF.FEAT_6_DESC, color: 'text-red-500' },
                  ].map((feat, i) => (
                     <div key={i} className="p-6 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors text-left group">
                        <feat.icon className={`w-8 h-8 mb-4 ${feat.color} group-hover:scale-110 transition-transform`} />
                        <h3 className="text-lg font-bold mb-2">{feat.title}</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">{feat.desc}</p>
                     </div>
                  ))}
               </div>

            </div>
         </section>

         {/* NGO / SUSTAINABILITY SECTION */}
         <section className="py-24 bg-white/5 border-y border-white/10 relative">
            <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
               <div>
                  <div className="inline-flex items-center gap-2 bg-emerald-900/20 border border-emerald-500/30 px-3 py-1 rounded-full text-emerald-400 text-xs font-bold uppercase tracking-wider mb-6">
                     <HeartHandshake className="w-3 h-3" /> {TN?.TITLE || "For NGOs & Governments"}
                  </div>
                  <h2 className="text-4xl font-bold mb-4">{TN?.SUBTITLE || "Democratize AI Literacy"}</h2>
                  <p className="text-lg text-slate-400 leading-relaxed mb-8">
                     {TN?.DESC || "Sponsor a district. We provide the platform; you provide the 'Fuel' (API Grants)."}
                  </p>
                  <button className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2">
                     {TN?.GRANT || "Apply for Grant Matching"} <ArrowRight className="w-4 h-4" />
                  </button>
               </div>
               <div className="bg-gradient-to-br from-slate-900 to-black p-8 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
                  <Building2 className="w-16 h-16 text-slate-500 mb-6" />
                  <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">{TN?.PARTNERS || "Trusted By"}</div>
                  <div className="flex flex-wrap justify-center gap-8 opacity-50 grayscale">
                     {/* Placeholder Logos */}
                     <div className="h-8 w-24 bg-white/20 rounded"></div>
                     <div className="h-8 w-24 bg-white/20 rounded"></div>
                     <div className="h-8 w-24 bg-white/20 rounded"></div>
                  </div>
               </div>
            </div>
         </section>

         {/* PRICING */}
         <section id="pricing" className="py-32 bg-[#030712] relative overflow-hidden">
            <div className="max-w-6xl mx-auto px-6 relative z-10">
               <div className="text-center mb-16">
                  <h2 className="text-4xl font-bold mb-6">{T.FREE_FOREVER} <span className="text-slate-500">or Managed.</span></h2>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                  {/* FREE / BYOK */}
                  <div className="bg-gradient-to-b from-slate-900 to-black border border-slate-800 rounded-3xl p-10 text-left shadow-2xl relative group hover:border-slate-600 transition-colors">
                     <div className="relative">
                        <div className="flex justify-between items-start mb-8">
                           <div>
                              <h3 className="text-2xl font-bold text-white mb-1">{T.PRICING_LICENSE}</h3>
                              <div className="text-neon-blue font-mono text-sm">{T.PRICING_MODEL}</div>
                           </div>
                           <div className="text-4xl font-bold text-white">$0<span className="text-lg text-slate-500 font-normal">/mo</span></div>
                        </div>

                        <ul className="space-y-4 mb-8">
                           {T.PRICING_FEATS && T.PRICING_FEATS.map((feat: string, i: number) => (
                              <li key={i} className="flex items-center gap-3 text-slate-300">
                                 <div className="p-1 rounded-full bg-green-500/20"><Check className="w-3 h-3 text-green-500" /></div>
                                 {feat}
                              </li>
                           ))}
                        </ul>

                        <button
                           onClick={onLoginClick}
                           className="w-full py-4 border border-white/20 text-white font-bold rounded-xl transition-all hover:bg-white hover:text-black mt-auto"
                        >
                           {T.PRICING_CTA}
                        </button>
                     </div>
                  </div>

                  {/* PRO / MANAGED */}
                  <div className="bg-gradient-to-b from-purple-900/10 to-black border border-purple-500/50 rounded-3xl p-10 text-left shadow-2xl relative group">
                     <div className="absolute inset-0 bg-purple-500/5 group-hover:bg-purple-500/10 transition-colors rounded-3xl pointer-events-none"></div>
                     <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-purple-500 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(168,85,247,0.5)]">Recommended</div>

                     <div className="relative z-10">
                        <div className="flex justify-between items-start mb-8">
                           <div>
                              <h3 className="text-2xl font-bold text-white mb-1">{TP?.TITLE || "Pro License"}</h3>
                              <div className="text-purple-400 font-mono text-sm flex items-center gap-2">
                                 <Crown className="w-3 h-3" /> {TP?.MODEL || "MANAGED SERVICE"}
                              </div>
                           </div>
                           <div className="text-4xl font-bold text-white">{TP?.PRICE || "$10"}<span className="text-lg text-slate-500 font-normal">/mo</span></div>
                        </div>

                        <ul className="space-y-4 mb-8">
                           {TP?.FEATS && TP.FEATS.map((feat: string, i: number) => (
                              <li key={i} className="flex items-center gap-3 text-slate-300">
                                 <div className="p-1 rounded-full bg-purple-500/20"><Check className="w-3 h-3 text-purple-500" /></div>
                                 {feat}
                              </li>
                           ))}
                        </ul>

                        <button
                           onClick={() => setIsSubModalOpen(true)}
                           className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                        >
                           {TP?.CTA || "Subscribe to Pro"}
                        </button>
                     </div>
                  </div>

               </div>
            </div>
         </section>

         {/* FOOTER */}
         <footer className="py-12 bg-black border-t border-white/5 text-center">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
               <div className="flex items-center gap-2 text-white font-bold tracking-wider">
                  <div className="w-2 h-2 bg-neon-blue rounded-full" /> YOKAIZEN CAMPUS
               </div>

               <a
                  href="https://AI.yokaizencampus.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-[10px] font-bold text-pink-500 tracking-wider hover:text-pink-400 transition-colors border border-pink-900/50 bg-pink-900/10 px-3 py-1 rounded-full"
               >
                  <FlaskConical className="w-3 h-3" />
                  {T.FOOTER_VISIT}
               </a>

               <div className="text-slate-500 text-xs font-mono">
                  {T.FOOTER_COPY}
               </div>
            </div>
         </footer>
      </div>
   );
};