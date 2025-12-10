
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { evaluatePrompt } from '../../services/geminiService';
import { audio } from '../../services/audioService';
import { Image, Star, Zap, Scan, Wand2, Terminal, Clock, AlertTriangle, Database, Box, Layers, Palette, Lightbulb } from 'lucide-react';
import { Scanlines, GlitchText, Noise } from '../ui/Visuals';
import { Language } from '../../types';

interface PromptArchitectProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
}

const MODULES = {
    SUBJECTS: ['Cyberpunk Street Vendor', 'Neon Samurai', 'Holographic Cat', 'Abandoned Server Room'],
    STYLES: ['Cinematic Lighting', 'Pixel Art', 'Oil Painting', 'Glitch Art'],
    DETAILS: ['Raining', 'Foggy', 'Sunset', 'Night Time'],
    TECH: ['8k Resolution', 'Unreal Engine 5', 'Vintage Photo', 'Vector Graphic']
};

export const PromptArchitect: React.FC<PromptArchitectProps> = ({ onComplete, t }) => {
  const [promptParts, setPromptParts] = useState<{type: string, text: string, id: number}[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{score: number, text: string} | null>(null);
  const [stability, setStability] = useState(100);
  const [gameState, setGameState] = useState<'BRIEFING' | 'CONSTRUCT' | 'REFINE' | 'FAILED'>('BRIEFING');
  const [scanLine, setScanLine] = useState(0);
  
  const targetDesc = "A cyberpunk street food vendor in Tokyo, raining neon lights, volumetric fog, cinematic lighting, highly detailed 8k.";

  useEffect(() => {
      if (gameState !== 'CONSTRUCT' && gameState !== 'REFINE') return;
      
      const interval = setInterval(() => {
          setStability(prev => {
              if (prev <= 0) {
                  setGameState('FAILED');
                  audio.playError();
                  return 0;
              }
              return prev - 0.2; 
          });
          // Visual Scan line update
          setScanLine(prev => (prev + 2) % 100);
      }, 50); // Faster update for smooth visuals

      return () => clearInterval(interval);
  }, [gameState]);

  const addBlock = (type: string, text: string) => {
      setPromptParts(prev => [...prev, { type, text, id: Date.now() }]);
      audio.playClick();
  };

  const removeBlock = (id: number) => {
      setPromptParts(prev => prev.filter(p => p.id !== id));
      audio.playClick();
  };

  const handleConstructFinish = () => {
      const constructed = promptParts.map(p => p.text).join(', ');
      setManualInput(constructed);
      setGameState('REFINE');
      audio.playSuccess();
  };

  const handleSubmit = async () => {
    if (!manualInput) return;
    audio.playClick();
    setIsSubmitting(true);
    
    const result = await evaluatePrompt(targetDesc, manualInput);
    
    setFeedback({ score: result.score, text: result.feedback });
    setIsSubmitting(false);
    
    if (result.score > 80) {
        audio.playSuccess();
    } else {
        audio.playError();
        setStability(s => Math.max(0, s - 15)); 
    }
  };

  if (gameState === 'BRIEFING') {
      return (
          <div className="h-full flex flex-col items-center justify-center bg-black p-8 text-center font-mono relative overflow-hidden">
              <Scanlines />
              <div className="w-32 h-32 border-4 border-electric rounded-full flex items-center justify-center mb-6 animate-pulse shadow-[0_0_50px_rgba(196,95,255,0.4)]">
                  <Database size={64} className="text-electric" />
              </div>
              <h1 className="text-3xl font-black text-white mb-2 tracking-tighter">{t('architect.title')}</h1>
              <div className="bg-gray-900/80 border-l-4 border-electric p-6 text-left max-w-sm mb-8 backdrop-blur-sm">
                  <p className="text-[10px] text-electric font-bold mb-2 uppercase tracking-widest">{t('architect.target_data')}</p>
                  <p className="text-sm text-gray-300 italic">
                      "A street vendor in Tokyo. Neon rain. Cinematic quality."
                  </p>
                  <div className="mt-4 text-xs text-gray-500">
                      Assemble the prompt blocks to stabilize the image before data corruption reaches 100%.
                  </div>
              </div>
              <Button size="lg" variant="primary" onClick={() => { setGameState('CONSTRUCT'); audio.playClick(); }}>
                  {t('ui.start')}
              </Button>
          </div>
      );
  }

  if (gameState === 'FAILED') {
      return (
          <div className="h-full flex flex-col items-center justify-center bg-black p-8 text-center font-mono relative">
              <AlertTriangle size={80} className="text-red-500 mb-6 animate-shake" />
              <h1 className="text-4xl font-black text-red-500 mb-2 glitch-text">{t('architect.data_lost')}</h1>
              <p className="text-gray-400 mb-8">The memory file has fully degraded.</p>
              <Button variant="secondary" onClick={() => { setStability(100); setPromptParts([]); setManualInput(''); setFeedback(null); setGameState('CONSTRUCT'); }}>{t('red_team.retry')}</Button>
          </div>
      );
  }

  return (
    <div className="h-full flex flex-col bg-[#050505] p-4 relative overflow-hidden font-mono select-none">
      <Scanlines />
      <Noise opacity={0.1 + (100 - stability) * 0.005} />
      
      {/* HUD */}
      <div className="flex items-center justify-between mb-4 z-10 relative bg-black/50 p-2 rounded-xl border border-white/10 backdrop-blur-md">
          <div className="flex items-center space-x-3">
              <div className="bg-electric/20 p-2 rounded-lg">
                  <Terminal size={16} className="text-electric"/>
              </div>
              <div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold">{t('architect.protocol')}</div>
                  <div className="text-xs font-bold text-white"><GlitchText text="ARCHITECT_V9" /></div>
              </div>
          </div>
          <div className="flex flex-col items-end w-32">
              <div className="flex justify-between w-full text-[10px] font-bold mb-1">
                  <span className="text-gray-500">{t('architect.integrity')}</span>
                  <span className={stability < 30 ? 'text-red-500 blink' : 'text-electric'}>{Math.floor(stability)}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${stability < 30 ? 'bg-red-500' : 'bg-electric'}`} 
                    style={{ width: `${stability}%` }}
                  ></div>
              </div>
          </div>
      </div>

      {/* --- CONSTRUCTION PHASE --- */}
      {gameState === 'CONSTRUCT' && (
          <div className="flex-1 flex flex-col min-h-0 z-10 animate-in slide-in-from-right">
              {/* Preview Area */}
              <div className="flex-1 bg-gray-900/50 border-2 border-dashed border-gray-700 rounded-xl p-4 mb-4 relative overflow-y-auto overflow-x-hidden">
                  <div className="absolute top-2 left-2 text-[10px] text-gray-500 font-bold uppercase">{t('architect.assembly_area')}</div>
                  
                  {/* Dynamic Scanning Effect */}
                  <div className="absolute inset-0 pointer-events-none opacity-20">
                      <div className="w-full h-1 bg-electric blur-[2px] absolute" style={{ top: `${scanLine}%` }}></div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-6">
                      {promptParts.length === 0 && <span className="text-gray-600 text-sm italic">{t('architect.select_modules')}</span>}
                      {promptParts.map((p) => (
                          <div 
                            key={p.id} 
                            className="bg-black border border-electric/50 text-electric text-xs px-3 py-1.5 rounded-lg flex items-center shadow-[0_0_10px_rgba(196,95,255,0.2)] animate-in zoom-in duration-300 transform hover:scale-105 transition-transform"
                          >
                              <span className="opacity-50 mr-2 text-[9px] uppercase">{p.type}:</span>
                              {p.text}
                              <button onClick={() => removeBlock(p.id)} className="ml-2 hover:text-white"><Zap size={10}/></button>
                          </div>
                      ))}
                  </div>
              </div>

              {/* Module Palette */}
              <div className="h-1/2 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
                  <div>
                      <h3 className="text-xs font-bold text-white mb-2 flex items-center"><Box size={12} className="mr-2 text-cyan-400"/> SUBJECTS</h3>
                      <div className="grid grid-cols-2 gap-2">
                          {MODULES.SUBJECTS.map(opt => (
                              <button key={opt} onClick={() => addBlock('SUBJ', opt)} className="text-[10px] bg-gray-800 hover:bg-cyan-900/50 border border-gray-700 hover:border-cyan-500 p-2 rounded text-left transition-all active:scale-95">
                                  {opt}
                              </button>
                          ))}
                      </div>
                  </div>
                  <div>
                      <h3 className="text-xs font-bold text-white mb-2 flex items-center"><Palette size={12} className="mr-2 text-pink-400"/> STYLE</h3>
                      <div className="grid grid-cols-2 gap-2">
                          {MODULES.STYLES.map(opt => (
                              <button key={opt} onClick={() => addBlock('STYLE', opt)} className="text-[10px] bg-gray-800 hover:bg-pink-900/50 border border-gray-700 hover:border-pink-500 p-2 rounded text-left transition-all active:scale-95">
                                  {opt}
                              </button>
                          ))}
                      </div>
                  </div>
                  <div>
                      <h3 className="text-xs font-bold text-white mb-2 flex items-center"><Lightbulb size={12} className="mr-2 text-yellow-400"/> LIGHTING</h3>
                      <div className="grid grid-cols-2 gap-2">
                          {MODULES.DETAILS.map(opt => (
                              <button key={opt} onClick={() => addBlock('LIGHT', opt)} className="text-[10px] bg-gray-800 hover:bg-yellow-900/50 border border-gray-700 hover:border-yellow-500 p-2 rounded text-left transition-all active:scale-95">
                                  {opt}
                              </button>
                          ))}
                      </div>
                  </div>
                  <div>
                      <h3 className="text-xs font-bold text-white mb-2 flex items-center"><Layers size={12} className="mr-2 text-green-400"/> TECH SPECS</h3>
                      <div className="grid grid-cols-2 gap-2">
                          {MODULES.TECH.map(opt => (
                              <button key={opt} onClick={() => addBlock('TECH', opt)} className="text-[10px] bg-gray-800 hover:bg-green-900/50 border border-gray-700 hover:border-green-500 p-2 rounded text-left transition-all active:scale-95">
                                  {opt}
                              </button>
                          ))}
                      </div>
                  </div>
              </div>

              <div className="mt-4">
                  <Button fullWidth variant="primary" onClick={handleConstructFinish} disabled={promptParts.length === 0} className="shadow-[0_0_20px_rgba(196,95,255,0.3)]">
                      {t('architect.compile')}
                  </Button>
              </div>
          </div>
      )}

      {/* --- REFINE PHASE --- */}
      {gameState === 'REFINE' && (
          <div className="flex-1 flex flex-col z-10 animate-in slide-in-from-bottom">
              <div className="bg-black border-2 border-electric rounded-xl p-1 mb-4 shadow-[0_0_30px_rgba(196,95,255,0.1)] relative overflow-hidden">
                   {/* Scanning Overlay */}
                   {isSubmitting && <div className="absolute inset-0 bg-electric/10 z-20 animate-pulse"></div>}
                   
                   <div className="h-48 w-full bg-gray-900 rounded-lg relative overflow-hidden flex items-center justify-center">
                       {/* Placeholder for generation visualization */}
                       {isSubmitting ? (
                           <div className="text-center">
                               <Scan size={48} className="text-electric animate-spin mx-auto mb-2"/>
                               <div className="text-xs text-electric font-bold animate-pulse">{t('architect.rendering')}</div>
                           </div>
                       ) : feedback && feedback.score > 80 ? (
                           <div className="text-center animate-in zoom-in">
                               <Star size={64} className="text-yellow-400 mx-auto mb-2 fill-yellow-400 animate-bounce"/>
                               <div className="text-2xl font-black text-white">{t('architect.match')}</div>
                           </div>
                       ) : (
                           <div className="text-center opacity-50">
                               <Image size={48} className="text-gray-600 mx-auto mb-2"/>
                               <div className="text-xs text-gray-500">{t('architect.visual_feed')}</div>
                           </div>
                       )}
                   </div>
              </div>

              <div className="space-y-2 mb-4">
                  <label className="text-[10px] font-bold text-gray-500 uppercase flex justify-between">
                      <span>{t('architect.manual_override')}</span>
                      <span className="text-electric animate-pulse">{t('architect.link_active')}</span>
                  </label>
                  <textarea
                    value={manualInput}
                    onChange={(e) => { setManualInput(e.target.value); audio.playTyping(); }}
                    className="w-full h-32 bg-gray-900/90 border border-gray-700 rounded-xl p-4 text-sm text-white focus:border-electric focus:ring-1 focus:ring-electric focus:outline-none resize-none font-mono placeholder-gray-700 shadow-inner"
                    placeholder="// Refine the prompt..."
                  />
              </div>

              {feedback && (
                  <div className={`p-4 rounded-xl mb-4 border animate-in slide-in-from-bottom ${feedback.score > 80 ? 'bg-green-900/20 border-green-500' : 'bg-red-900/20 border-red-500'}`}>
                      <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold uppercase">Analysis</span>
                          <span className="text-xl font-black">{feedback.score}%</span>
                      </div>
                      <p className="text-xs text-gray-300">{feedback.text}</p>
                  </div>
              )}

              <div className="mt-auto flex space-x-3">
                  <Button variant="ghost" onClick={() => setGameState('CONSTRUCT')} className="flex-1">BACK</Button>
                  {feedback && feedback.score > 80 ? (
                      <Button className="flex-[2] shadow-[0_0_20px_#22c55e]" onClick={() => onComplete(feedback.score)} variant="primary">{t('architect.upload')}</Button>
                  ) : (
                      <Button className="flex-[2]" onClick={handleSubmit} disabled={isSubmitting || !manualInput} variant="primary">
                          {isSubmitting ? t('architect.processing') : t('architect.generate')}
                      </Button>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};
