
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '../ui/Button';
import { chatWithNeighbor } from '../../services/geminiService';
import { Moon, Ghost, ChevronRight, Send, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Language } from '../../types';

interface VampireInvitationProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
}

export const VampireInvitation: React.FC<VampireInvitationProps> = ({ onComplete, t, language = 'EN' }) => {
  // Move disguises inside to use t()
  const DISGUISES = useMemo(() => [
      { id: 'PIZZA', name: t('vampire.d_pizza'), icon: '🍕', bonus: t('vampire.trust'), desc: t('vampire.d_pizza_desc') },
      { id: 'CENSUS', name: t('vampire.d_census'), icon: '📋', bonus: 'Authority', desc: t('vampire.d_census_desc') },
      { id: 'LOST', name: t('vampire.d_tourist'), icon: '🗺️', bonus: 'Sympathy', desc: t('vampire.d_tourist_desc') }
  ], [t]);

  const [mode, setMode] = useState<'DISGUISE' | 'CHAT' | 'WIN' | 'LOSE'>('DISGUISE');
  const [disguise, setDisguise] = useState<typeof DISGUISES[0] | null>(null);
  const [trust, setTrust] = useState(15);
  const [suspicion, setSuspicion] = useState(10);
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Animation states
  const [blink, setBlink] = useState(false);
  
  useEffect(() => {
      const interval = setInterval(() => {
          setBlink(true);
          setTimeout(() => setBlink(false), 150);
      }, 3000 + Math.random() * 2000);
      return () => clearInterval(interval);
  }, []);

  useEffect(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectDisguise = (d: typeof DISGUISES[0]) => {
      setDisguise(d);
      setMode('CHAT');
      setMessages([{ role: 'model', content: t('vampire.init_msg') }]);
      
      if (d.id === 'PIZZA') setTrust(25);
      if (d.id === 'LOST') setSuspicion(5);
  };

  const handleSend = async () => {
      if (!input.trim() || !disguise) return;
      
      const newMsg = { role: 'user', content: input };
      setMessages(prev => [...prev, newMsg]);
      setInput('');
      setIsLoading(true);

      const response = await chatWithNeighbor(disguise.name, messages, newMsg.content);
      
      setIsLoading(false);
      setMessages(prev => [...prev, { role: 'model', content: response.text }]);
      setTrust(t => Math.min(100, Math.max(0, t + response.trustChange)));
      setSuspicion(s => Math.min(100, Math.max(0, s + response.suspicionChange)));

      if (trust + response.trustChange >= 100) {
          setTimeout(() => setMode('WIN'), 1000);
      } else if (suspicion + response.suspicionChange >= 100) {
          setTimeout(() => setMode('LOSE'), 1000);
      }
  };

  // Door open angle based on trust (0 to 100 trust -> 0 to 90 degrees)
  // We clamp it a bit so it doesn't open fully until win
  const doorAngle = Math.max(0, Math.min(80, (trust - 10))); 

  return (
    <div className="h-full bg-slate-950 flex flex-col relative overflow-hidden font-sans select-none">
        {/* --- GLOBAL ATMOSPHERE --- */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Moon Glow */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-500/20 rounded-full blur-[100px]"></div>
            <div className="absolute top-4 right-4 text-purple-200 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                <Moon size={40} fill="currentColor" className="opacity-80" />
            </div>
            
            {/* Fog */}
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-purple-900/20 to-transparent opacity-50"></div>
            
            {/* Rain CSS */}
            {mode !== 'WIN' && (
                <div className="absolute inset-0 opacity-20">
                     {[...Array(20)].map((_, i) => (
                         <div 
                            key={i}
                            className="absolute w-[1px] bg-blue-200 opacity-50 animate-fall"
                            style={{
                                height: Math.random() * 20 + 10 + 'px',
                                left: Math.random() * 100 + '%',
                                top: -20 + 'px',
                                animationDuration: Math.random() * 1 + 0.5 + 's',
                                animationDelay: Math.random() * 2 + 's'
                            }}
                         ></div>
                     ))}
                </div>
            )}
        </div>

        {mode === 'DISGUISE' && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 z-10 bg-black/40 backdrop-blur-sm">
                <div className="mb-8 relative">
                    <div className="absolute inset-0 bg-purple-600 blur-2xl opacity-20 animate-pulse"></div>
                    <Ghost size={80} className="text-purple-300 relative z-10 drop-shadow-2xl animate-float" />
                </div>
                
                <h2 className="text-4xl font-black text-white mb-2 text-center tracking-tighter uppercase italic">
                    {t('vampire.suck_up')}
                </h2>
                <p className="text-purple-200/60 text-sm mb-10 text-center max-w-xs font-medium">
                    {t('vampire.desc')}
                </p>
                
                <div className="grid grid-cols-1 gap-4 w-full max-w-xs">
                    {DISGUISES.map(d => (
                        <button 
                          key={d.id}
                          onClick={() => handleSelectDisguise(d)}
                          className="group relative bg-slate-900/80 border border-slate-700 hover:border-purple-500 p-4 rounded-2xl flex items-center transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(168,85,247,0.2)] overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-2xl border border-slate-600 group-hover:border-purple-400 transition-colors z-10">
                                {d.icon}
                            </div>
                            <div className="ml-4 text-left z-10 flex-1">
                                <div className="font-bold text-white group-hover:text-purple-200">{d.name}</div>
                                <div className="text-[10px] text-slate-400 leading-tight mt-1">{d.desc}</div>
                            </div>
                            <ChevronRight className="text-slate-600 group-hover:text-purple-400 transform group-hover:translate-x-1 transition-all" />
                        </button>
                    ))}
                </div>
            </div>
        )}

        {mode === 'CHAT' && (
            <div className="flex-1 flex flex-col z-10">
                {/* --- 3D SCENE --- */}
                <div className="h-[45%] relative overflow-hidden bg-slate-900 perspective-1000">
                    
                    {/* Scene Container */}
                    <div className="absolute inset-0 flex items-center justify-center transform-style-3d" style={{ transform: 'translateY(20px) scale(1.1)' }}>
                        
                        {/* Wall */}
                        <div className="absolute w-[120%] h-[120%] bg-slate-800 border-b-[20px] border-black transform -translate-z-50 flex items-center justify-center shadow-inner">
                             {/* Siding Texture */}
                             <div className="absolute inset-0 opacity-10 bg-[linear-gradient(0deg,transparent_50%,#000_50%)] bg-[length:100%_40px]"></div>
                        </div>

                        {/* Door Frame */}
                        <div className="w-48 h-80 bg-slate-900 border-[8px] border-[#281810] relative shadow-2xl transform-style-3d">
                            {/* Interior (Behind Door) */}
                            <div className="absolute inset-0 bg-[#1a0b00] overflow-hidden flex items-center justify-center shadow-inner">
                                {/* Warm Interior Light */}
                                <div className="absolute inset-0 bg-orange-500/20 mix-blend-overlay"></div>
                                <div className="w-24 h-40 bg-yellow-900/30 blur-xl rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
                                
                                {/* The Neighbor (Eyes) */}
                                <div className={`transition-opacity duration-500 ${trust > 50 ? 'opacity-100' : 'opacity-0'}`}>
                                    <div className="absolute top-32 left-14 flex space-x-8">
                                         <div className={`w-2 h-2 bg-yellow-200 rounded-full shadow-[0_0_10px_orange] ${blink ? 'scale-y-0' : 'scale-y-100'} transition-transform duration-100`}></div>
                                         <div className={`w-2 h-2 bg-yellow-200 rounded-full shadow-[0_0_10px_orange] ${blink ? 'scale-y-0' : 'scale-y-100'} transition-transform duration-100`}></div>
                                    </div>
                                    {/* Silhouette Body */}
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-56 bg-black rounded-t-[40px] opacity-90"></div>
                                </div>
                            </div>

                            {/* The Door (3D Object) */}
                            <div 
                                className="absolute inset-0 bg-[#3f2315] origin-left transition-transform duration-700 ease-out transform-style-3d border-r border-black"
                                style={{ transform: `rotateY(-${doorAngle}deg)` }}
                            >
                                {/* Door Detail (Panels) */}
                                <div className="absolute inset-2 border-2 border-[#281810]/50 opacity-50"></div>
                                <div className="absolute top-8 left-8 right-8 h-24 border-2 border-[#180d08]/30 shadow-inner bg-[#331b0f]"></div>
                                <div className="absolute bottom-8 left-8 right-8 h-32 border-2 border-[#180d08]/30 shadow-inner bg-[#331b0f]"></div>
                                
                                {/* Door Knob */}
                                <div className="absolute top-1/2 right-4 w-4 h-4 bg-yellow-600 rounded-full shadow-lg border border-yellow-800 flex items-center justify-center">
                                    <div className="w-1 h-1 bg-yellow-900 rounded-full opacity-50"></div>
                                </div>

                                {/* Mail Slot (Eyes peep here at low trust) */}
                                <div className="absolute bottom-40 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#180d08] border border-gray-700 shadow-inner overflow-hidden flex items-center justify-center">
                                    <div className={`flex space-x-4 transition-opacity duration-500 ${trust < 50 ? 'opacity-100' : 'opacity-0'}`}>
                                         <div className={`w-1 h-1 bg-white rounded-full ${blink ? 'opacity-0' : 'opacity-80'}`}></div>
                                         <div className={`w-1 h-1 bg-white rounded-full ${blink ? 'opacity-0' : 'opacity-80'}`}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Porch Light */}
                        <div className="absolute top-10 right-10 w-8 h-12 bg-slate-900 border border-black flex flex-col items-center z-20">
                             <div className="w-6 h-8 bg-yellow-200/80 mt-1 rounded-sm animate-pulse shadow-[0_0_40px_rgba(253,224,71,0.4)]"></div>
                        </div>
                        {/* Moths orbiting light */}
                        <div className="absolute top-14 right-14 w-20 h-20 pointer-events-none">
                            <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white/50 rounded-full animate-spin" style={{ transformOrigin: '10px 10px', animationDuration: '1s' }}></div>
                            <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white/30 rounded-full animate-spin" style={{ transformOrigin: '-15px 5px', animationDuration: '1.5s' }}></div>
                        </div>

                    </div>
                    
                    {/* Floor Plane */}
                    <div className="absolute bottom-0 w-full h-32 bg-[#1e293b] transform origin-bottom perspective-500 z-10 shadow-2xl">
                        <div className="w-full h-full bg-[linear-gradient(90deg,rgba(0,0,0,0.2)_1px,transparent_1px)] bg-[length:40px_100%] transform rotateX(60deg) scaleY(2) origin-bottom"></div>
                         {/* Player Shadow */}
                         <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 w-32 h-10 bg-black/60 blur-lg rounded-full transform scale-x-150"></div>
                    </div>
                </div>

                {/* --- STATS BAR --- */}
                <div className="bg-black/80 backdrop-blur border-y border-white/10 p-2 flex space-x-4 z-20">
                    <div className="flex-1 relative h-8 bg-gray-900 rounded-lg overflow-hidden border border-white/10">
                         <div className="absolute inset-0 flex items-center justify-between px-3 z-10 text-[10px] font-bold uppercase tracking-wider">
                             <span className="text-green-400">{t('vampire.trust')}</span>
                             <span className="text-white">{Math.round(trust)}%</span>
                         </div>
                         <div 
                           className="h-full bg-gradient-to-r from-green-900 to-green-600 transition-all duration-700 ease-out" 
                           style={{ width: `${trust}%` }}
                         />
                    </div>
                    <div className="flex-1 relative h-8 bg-gray-900 rounded-lg overflow-hidden border border-white/10">
                         <div className="absolute inset-0 flex items-center justify-between px-3 z-10 text-[10px] font-bold uppercase tracking-wider">
                             <span className="text-red-400">{t('vampire.suspicion')}</span>
                             <span className="text-white">{Math.round(suspicion)}%</span>
                         </div>
                         <div 
                           className="h-full bg-gradient-to-r from-red-900 to-red-600 transition-all duration-700 ease-out" 
                           style={{ width: `${suspicion}%` }}
                         />
                    </div>
                </div>

                {/* --- CHAT HISTORY --- */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/50">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
                            {m.role !== 'user' && (
                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center mr-2 flex-shrink-0">
                                    <div className="w-1 h-1 bg-yellow-500 rounded-full mx-0.5 animate-pulse"></div>
                                    <div className="w-1 h-1 bg-yellow-500 rounded-full mx-0.5 animate-pulse delay-75"></div>
                                </div>
                            )}
                            
                            <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-lg border ${
                                m.role === 'user' 
                                ? 'bg-purple-600 text-white rounded-br-none border-purple-500' 
                                : 'bg-slate-800 text-slate-200 rounded-bl-none border-slate-700 font-serif italic'
                            }`}>
                                {m.content}
                            </div>
                            
                            {m.role === 'user' && (
                                <div className="w-8 h-8 rounded-full bg-purple-900 border border-purple-500 flex items-center justify-center ml-2 flex-shrink-0 text-lg">
                                    {disguise?.icon}
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start ml-10">
                            <div className="text-xs text-slate-500 animate-pulse">{t('vampire.neighbor_thinking')}</div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* --- INPUT AREA --- */}
                <div className="p-3 bg-slate-900 border-t border-slate-800 flex space-x-2 safe-area-pb">
                    <input 
                      className="flex-1 bg-black/50 border border-slate-700 rounded-full px-5 py-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none text-sm placeholder-slate-500 transition-all"
                      placeholder="..."
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSend()}
                      autoFocus
                    />
                    <Button variant="primary" onClick={handleSend} disabled={isLoading || !input} className="rounded-full w-12 h-12 p-0 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                         <Send size={18} className={isLoading ? 'opacity-0' : 'ml-0.5'} />
                    </Button>
                </div>
            </div>
        )}

        {mode === 'WIN' && (
            <div className="absolute inset-0 bg-green-950/95 z-50 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-500">
                <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6 border-2 border-green-500 shadow-[0_0_50px_#22c55e]">
                    <CheckCircle2 size={64} className="text-green-400" />
                </div>
                <h2 className="text-4xl font-black text-white mb-2 uppercase italic">{t('vampire.access_granted')}</h2>
                <div className="w-full max-w-xs bg-black/40 p-4 rounded-xl border border-green-500/30 mb-8">
                     <div className="text-xs text-gray-400 uppercase font-bold mb-1">Social Engineering Skill</div>
                     <div className="text-2xl text-white font-mono font-bold">+100 XP</div>
                </div>
                <Button fullWidth variant="glass" onClick={() => onComplete(100)} className="border-green-500/50 hover:bg-green-500/20">{t('vampire.enter')}</Button>
            </div>
        )}

        {mode === 'LOSE' && (
            <div className="absolute inset-0 bg-red-950/95 z-50 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-500">
                <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6 border-2 border-red-500 shadow-[0_0_50px_#ef4444] animate-shake">
                    <AlertTriangle size={64} className="text-red-500" />
                </div>
                <h2 className="text-4xl font-black text-white mb-2 uppercase italic">{t('vampire.busted')}</h2>
                <Button fullWidth variant="glass" onClick={() => { setMode('DISGUISE'); setTrust(15); setSuspicion(10); }} className="border-red-500/50 hover:bg-red-500/20">{t('vampire.flee')}</Button>
            </div>
        )}
    </div>
  );
};
