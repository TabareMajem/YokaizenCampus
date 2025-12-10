import React from 'react';
import { AgentType, PhilosophyMode, Language } from '../types';
import { TERMS } from '../translations';
import { Database, FileSearch, ShieldCheck, Pickaxe, BrainCircuit } from 'lucide-react';

interface AgentRosterProps {
  mode: PhilosophyMode;
  language: Language;
}

export const AgentRoster: React.FC<AgentRosterProps> = ({ mode, language }) => {
  const T = TERMS[language];
  
  const agents = [
    { type: AgentType.SCOUT, label: T.AGENTS.SCOUT, icon: FileSearch },
    { type: AgentType.HISTORIAN, label: T.AGENTS.HISTORIAN, icon: Database },
    { type: AgentType.ARCHITECT, label: T.AGENTS.ARCHITECT, icon: BrainCircuit },
    { type: AgentType.BUILDER, label: T.AGENTS.BUILDER, icon: Pickaxe },
    { type: AgentType.AUDITOR, label: T.AGENTS.AUDITOR, icon: ShieldCheck },
  ];

  const getContainerClass = () => {
    switch(mode) {
      case PhilosophyMode.FINLAND: return "bg-[#1c1917] border-stone-700";
      case PhilosophyMode.KOREA: return "bg-black border-r border-red-900";
      default: return "glass-panel border-glass-border";
    }
  };

  const getHeaderClass = () => {
    switch(mode) {
      case PhilosophyMode.FINLAND: return "bg-stone-800 text-amber-200 border-stone-700 font-serif";
      case PhilosophyMode.KOREA: return "bg-red-950/20 text-red-500 border-red-900 font-mono tracking-widest";
      default: return "bg-glass-100 text-neon-blue border-glass-border font-mono";
    }
  };

  return (
    <div className={`h-full flex flex-col rounded-r-xl overflow-hidden border-l-0 border-y border-r transition-all duration-500 ${getContainerClass()}`}>
       <div className={`p-4 border-b ${getHeaderClass()}`}>
        <h3 className="text-sm">{T.ROSTER}</h3>
      </div>
      <div className="p-3 space-y-3 overflow-y-auto">
        {agents.map((agent) => (
          <div 
            key={agent.type}
            className={`
              group relative p-3 border border-transparent transition-all cursor-grab active:cursor-grabbing flex items-center gap-3
              ${mode === PhilosophyMode.FINLAND ? 'rounded-xl hover:bg-stone-800 hover:border-amber-500/50' : ''}
              ${mode === PhilosophyMode.KOREA ? 'rounded-none hover:bg-red-950/30 hover:border-red-600' : ''}
              ${mode === PhilosophyMode.JAPAN ? 'rounded-lg hover:bg-glass-200 hover:border-neon-blue' : ''}
            `}
            draggable
          >
            <div className={`p-2 rounded-md transition-colors ${mode === PhilosophyMode.KOREA ? 'bg-zinc-900 text-red-500' : 'bg-slate-800 text-gray-300'}`}>
              <agent.icon className="w-5 h-5" />
            </div>
            <div>
              <div className={`text-sm font-bold ${mode === PhilosophyMode.FINLAND ? 'text-stone-200' : 'text-gray-200'}`}>{agent.label}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">{agent.type}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};