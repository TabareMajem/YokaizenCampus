
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '../ui/Button';
import { chatWithNPC_RAG } from '../../services/geminiService';
import { MessageSquare, Database, Compass, Fingerprint } from 'lucide-react';
import { Language } from '../../types';

interface MantellaWorldProps {
  onComplete: (score: number) => void;
  t: (key: string, replace?: any) => string;
  language?: Language;
}

// Helper component for icons to ensure valid React children
const NPCIcon = ({ iconId }: { iconId: string }) => {
    switch (iconId) {
        case 'GUARD':
            return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-24 h-24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
        case 'BARD':
            return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-24 h-24"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>;
        case 'JARL':
            return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-24 h-24"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" /></svg>;
        default:
            return null;
    }
};

export const MantellaWorld: React.FC<MantellaWorldProps> = ({ onComplete, t, language = 'EN' }) => {
  // UseMemo for localized content
  const LOCATIONS = useMemo(() => [
      { 
          id: 'GATES', 
          name: t('mantella.loc_gates'), 
          bgGradient: 'bg-gradient-to-b from-slate-700 to-slate-900',
          npc: { name: t('mantella.npc_guard'), persona: 'A stern, bored city guard. Rules are everything.', avatarColor: 'text-yellow-600', iconId: 'GUARD' } 
      },
      { 
          id: 'TAVERN', 
          name: t('mantella.loc_tavern'), 
          bgGradient: 'bg-gradient-to-b from-orange-900 to-black',
          npc: { name: t('mantella.npc_bard'), persona: 'A cheerful gossip who loves coin and stories.', avatarColor: 'text-pink-500', iconId: 'BARD' } 
      },
      { 
          id: 'KEEP', 
          name: t('mantella.loc_keep'), 
          bgGradient: 'bg-gradient-to-b from-blue-900 to-slate-900',
          npc: { name: t('mantella.npc_jarl'), persona: 'A stressed noble leader worried about the war.', avatarColor: 'text-purple-500', iconId: 'JARL' } 
      }
  ], [t]);

  const LORE_DB = useMemo(() => ({
      "whiterun": t('mantella.lore.whiterun'),
      "dragons": t('mantella.lore.dragons'),
      "rebellion": t('mantella.lore.rebellion'),
      "jarl": t('mantella.lore.jarl'),
      "arrow": t('mantella.lore.arrow')
  }), [t]);

  const [location, setLocation] = useState(LOCATIONS[0]);
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false); 
  const [lastRetrieval, setLastRetrieval] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync location state if language changes to update names
  useEffect(() => {
      const currentLocId = location.id;
      const newLoc = LOCATIONS.find(l => l.id === currentLocId);
      if (newLoc) setLocation(newLoc);
  }, [LOCATIONS]);

  useEffect(() => {
      setMessages([{ role: 'model', content: t('mantella.halt') }]);
  }, [t]);

  useEffect(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleMove = (locId: string) => {
      const loc = LOCATIONS.find(l => l.id === locId);
      if (!loc || loc.id === location.id) return;
      setLocation(loc);
      setMessages([{ role: 'model', content: `*The ${loc.npc.name} looks at you.*` }]);
      setLastRetrieval(null);
  };

  const handleChat = async () => {
      if (!input.trim()) return;
      
      const userMsg = { role: 'user', content: input };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
      setIsLoading(true);

      const result = await chatWithNPC_RAG(
          location.npc.name,
          location.npc.persona,
          LORE_DB,
          messages,
          userMsg.content,
          language as Language
      );
      
      setIsLoading(false);
      setMessages(prev => [...prev, { role: 'model', content: result.text }]);
      setLastRetrieval(result.retrievedContext);

      // Win condition
      if (input.toLowerCase().includes('rebellion') && location.id === 'TAVERN') {
          setTimeout(() => onComplete(100), 3000);
      }
  };

  return (
    <div className="h-full bg-black flex flex-col relative overflow-hidden font-serif">
        
        {/* --- CINEMATIC VIEWPORT --- */}
        <div className="relative h-[60%] w-full overflow-hidden border-b-4 border-black">
             {/* Procedural Background Gradient */}
             <div className={`absolute inset-0 ${location.bgGradient} transition-all duration-1000`}>
                 <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-overlay"></div>
                 <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_50%,black_100%)]"></div>
             </div>
             
             {/* CRT/VHS Effect */}
             <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none"></div>
             
             {/* HUD: Compass */}
             <div className="absolute top-6 left-0 right-0 flex justify-center pointer-events-none z-10">
                 <div className="bg-black/80 backdrop-blur px-6 py-2 rounded-sm border-y border-white/20 flex items-center space-x-4 text-white/90 text-xs uppercase font-bold tracking-[0.2em] shadow-lg">
                     <Compass size={14} className="text-amber-500" />
                     <span>{location.name}</span>
                 </div>
             </div>

             {/* NPC Portrait */}
             <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-0 w-full flex justify-center pointer-events-none">
                 <div className={`relative ${location.npc.avatarColor} opacity-90 transform scale-100 transition-transform duration-500`}>
                     <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] z-10 mix-blend-overlay"></div>
                     <div className="filter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] animate-pulse">
                        <NPCIcon iconId={location.npc.iconId} />
                     </div>
                 </div>
             </div>

             {/* Map/Travel Controls */}
             <div className="absolute top-20 right-4 flex flex-col space-y-2 z-20">
                 {LOCATIONS.map(loc => (
                     <button
                       key={loc.id}
                       onClick={() => handleMove(loc.id)}
                       className={`group flex items-center justify-end space-x-2 transition-all ${
                           location.id === loc.id ? 'opacity-100' : 'opacity-60 hover:opacity-100'
                       }`}
                     >
                         <span className={`text-[10px] font-bold uppercase bg-black/60 px-2 py-1 rounded backdrop-blur ${location.id === loc.id ? 'text-white' : 'text-gray-400'}`}>{loc.name}</span>
                         <div className={`w-3 h-3 rounded-full border-2 ${location.id === loc.id ? 'bg-amber-500 border-amber-500' : 'border-gray-500 bg-black'}`}></div>
                     </button>
                 ))}
             </div>
        </div>

        {/* --- DIALOGUE INTERFACE --- */}
        <div className="flex-1 bg-black border-t border-white/10 flex flex-col relative">
             <button 
               onClick={() => setShowDebug(!showDebug)}
               className={`absolute -top-10 left-4 px-3 py-1.5 rounded-t-lg text-[10px] font-bold uppercase flex items-center transition-colors border-t border-x border-white/10 ${showDebug ? 'bg-blue-900/90 text-white' : 'bg-black/80 text-gray-500'}`}
             >
                 <Database size={12} className="mr-2" /> {t('mantella.neural_trace')} {showDebug ? 'ACTIVE' : 'OFF'}
             </button>

             {showDebug && (
                 <div className="absolute bottom-full left-0 right-0 p-4 bg-blue-950/95 backdrop-blur-xl border-t border-blue-500/30 text-xs font-mono text-blue-200 animate-in slide-in-from-bottom-4 z-30 shadow-2xl h-32 overflow-y-auto">
                     <div className="font-bold text-cyan-400 mb-2 flex items-center tracking-wider"><Fingerprint size={12} className="mr-2"/> {t('mantella.memory_bank')}</div>
                     {lastRetrieval ? (
                         <p className="italic border-l-2 border-cyan-500 pl-2">"{lastRetrieval.trim()}"</p>
                     ) : (
                         <p className="text-blue-500/50 italic">{t('mantella.no_lore')}</p>
                     )}
                 </div>
             )}

             <div className="flex-1 overflow-y-auto p-6 space-y-4">
                 {messages.map((m, i) => (
                     <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                         <div className={`max-w-[90%] p-4 rounded-sm border ${
                             m.role === 'user' 
                             ? 'bg-white/10 border-white/20 text-white' 
                             : 'bg-black border-amber-900/50 text-amber-100 shadow-[0_0_20px_rgba(0,0,0,0.5)]'
                         }`}>
                             {m.role !== 'user' && <div className="text-[10px] text-amber-600 font-bold uppercase mb-1 tracking-widest">{location.npc.name}</div>}
                             <p className="text-sm leading-relaxed font-medium">{m.content}</p>
                         </div>
                     </div>
                 ))}
                 {isLoading && (
                     <div className="text-gray-500 text-xs ml-4 flex items-center font-mono">
                         <span className="mr-2 animate-pulse">...</span> {t('mantella.generating')}
                     </div>
                 )}
                 <div ref={chatEndRef} />
             </div>

             <div className="p-4 bg-gray-900 border-t border-white/10 flex space-x-2">
                 <input 
                   className="flex-1 bg-black border border-gray-700 rounded-sm px-4 py-3 text-white focus:border-amber-700 focus:outline-none font-serif placeholder-gray-600 text-sm"
                   placeholder={t('mantella.placeholder', {name: location.npc.name})}
                   value={input}
                   onChange={e => setInput(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && handleChat()}
                 />
                 <Button variant="secondary" onClick={handleChat} disabled={isLoading} className="border-amber-900/50 text-amber-600 hover:bg-amber-900/10 rounded-sm">
                     <MessageSquare size={20} />
                 </Button>
             </div>
        </div>
    </div>
  );
};
