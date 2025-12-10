
import React from 'react';
import { PhilosophyMode, Language, CareerNode } from '../types';
import { TERMS } from '../translations';
import { GitCommit, Lock, Unlock, Crown, Share2, Zap } from 'lucide-react';

interface CareerTreeProps {
  level: number;
  mode: PhilosophyMode;
  language: Language;
  onClose: () => void;
}

export const CareerTree: React.FC<CareerTreeProps> = ({ level, mode, language, onClose }) => {
  const T = TERMS[language].CAREER;
  
  // Define the tree structure
  const nodes: CareerNode[] = [
    { id: '1', title: T.NODES.NOVICE, description: "Basic Prompts", levelReq: 1, unlocked: true },
    { id: '2', title: T.NODES.SCOUT, description: "Search Tools", levelReq: 5, unlocked: level >= 5, parentId: '1' },
    { id: '3', title: T.NODES.ARCHITECT, description: "Logic Loops", levelReq: 10, unlocked: level >= 10, parentId: '2' },
    { id: '4', title: T.NODES.ORCHESTRATOR, description: "Multi-Agent", levelReq: 20, unlocked: level >= 20, parentId: '3' },
    { id: '5', title: T.NODES.SYNTHESIZER, description: "Creative Gen", levelReq: 15, unlocked: level >= 15, parentId: '2' },
    { id: '6', title: T.NODES.ETHICIST, description: "Deep Audit", levelReq: 30, unlocked: level >= 30, parentId: '4' },
  ];

  const getContainerClass = () => {
    switch(mode) {
      case PhilosophyMode.FINLAND: return "bg-[#1c1917]/95 border-amber-600/30 font-serif text-amber-100";
      case PhilosophyMode.KOREA: return "bg-black/95 border-red-600 font-mono text-red-500 uppercase";
      default: return "bg-slate-900/95 border-neon-blue/30 font-sans text-neon-blue";
    }
  };

  const getNodeStyle = (node: CareerNode) => {
    if (!node.unlocked) return "opacity-50 grayscale border-dashed";
    if (mode === PhilosophyMode.KOREA) return "bg-red-900/20 border-red-500 text-red-100";
    if (mode === PhilosophyMode.FINLAND) return "bg-amber-900/20 border-amber-500 text-amber-100";
    return "bg-neon-blue/10 border-neon-blue text-white";
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`w-full max-w-4xl h-[80vh] rounded-2xl border-2 shadow-2xl flex flex-col overflow-hidden ${getContainerClass()}`}>
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
           <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${mode === PhilosophyMode.KOREA ? 'bg-red-600 text-black' : 'bg-white/10'}`}>
                 <GitCommit className="w-6 h-6" />
              </div>
              <div>
                 <h2 className="text-2xl font-bold tracking-widest">{T.TITLE}</h2>
                 <p className="text-xs opacity-60 uppercase">{T.LEVEL} {level} // {level >= 30 ? 'MASTER' : 'STUDENT'}</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <Share2 className="w-6 h-6 rotate-90" />
           </button>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-auto p-10 flex items-center justify-center">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-grid-white/[0.03] pointer-events-none"></div>
            
            <div className="relative w-full max-w-3xl h-full flex flex-col items-center justify-center gap-12">
               {/* Level 30 Tier */}
               <div className="flex justify-center">
                  {renderNode(nodes.find(n => n.id === '6')!, getNodeStyle)}
               </div>
               
               {/* Level 20 Tier */}
               <div className="flex justify-center">
                  {renderNode(nodes.find(n => n.id === '4')!, getNodeStyle)}
               </div>

               {/* Level 10-15 Tier */}
               <div className="flex justify-center gap-24">
                  {renderNode(nodes.find(n => n.id === '3')!, getNodeStyle)}
                  {renderNode(nodes.find(n => n.id === '5')!, getNodeStyle)}
               </div>

               {/* Level 5 Tier */}
               <div className="flex justify-center">
                  {renderNode(nodes.find(n => n.id === '2')!, getNodeStyle)}
               </div>

               {/* Level 1 Tier */}
               <div className="flex justify-center">
                  {renderNode(nodes.find(n => n.id === '1')!, getNodeStyle)}
               </div>
               
               {/* Connector Lines SVG */}
               <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                   {/* Simplified connections for demo layout */}
                   <path d="M 50% 85% L 50% 70%" stroke="currentColor" strokeWidth="2" />
                   <path d="M 50% 60% L 35% 45%" stroke="currentColor" strokeWidth="2" />
                   <path d="M 50% 60% L 65% 45%" stroke="currentColor" strokeWidth="2" />
                   <path d="M 35% 35% L 50% 25%" stroke="currentColor" strokeWidth="2" />
                   <path d="M 50% 15% L 50% 10%" stroke="currentColor" strokeWidth="2" />
               </svg>
            </div>
        </div>
      </div>
    </div>
  );

  function renderNode(node: CareerNode, styleFn: (n: CareerNode) => string) {
    if (!node) return null;
    return (
        <div className={`relative w-48 p-4 rounded-xl border-2 transition-all duration-500 flex flex-col items-center text-center gap-2 z-10 group
            ${styleFn(node)}
            ${node.unlocked ? 'hover:scale-105 shadow-[0_0_30px_rgba(0,0,0,0.3)]' : ''}
        `}>
            {node.unlocked ? <Unlock className="w-5 h-5 mb-1" /> : <Lock className="w-5 h-5 mb-1" />}
            <div className="font-bold text-sm uppercase">{node.title}</div>
            <div className="text-[10px] opacity-70">{node.description}</div>
            <div className={`absolute -top-3 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-black border border-white/20`}>
                {T.REQ} {node.levelReq}
            </div>
            {node.id === '6' && <Crown className="absolute -top-8 w-8 h-8 text-yellow-500 animate-bounce" />}
        </div>
    );
  }
};
