import React from 'react';
import { AgentNode, NodeStatus, PhilosophyMode, Language } from '../types';
import { TERMS } from '../translations';
import { AlertTriangle, CheckCircle, Terminal, Zap } from 'lucide-react';

interface OutputStreamProps {
  logs: string[];
  nodes: AgentNode[];
  isAuditing: boolean;
  onFixApplied: (nodeId: string) => void;
  mode: PhilosophyMode;
  language: Language;
}

export const OutputStream: React.FC<OutputStreamProps> = ({ logs, nodes, isAuditing, onFixApplied, mode, language }) => {
  const T = TERMS[language];
  
  const getContainerClass = () => {
    switch(mode) {
      case PhilosophyMode.FINLAND: return "bg-[#1c1917] border-stone-700";
      case PhilosophyMode.KOREA: return "bg-black border-l border-red-900";
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
    <div className={`h-full flex flex-col rounded-l-xl overflow-hidden border-r-0 border-y border-l transition-all duration-500 ${getContainerClass()}`}>
      <div className={`p-4 border-b flex items-center justify-between ${getHeaderClass()}`}>
        <h3 className="text-sm flex items-center gap-2">
          <Terminal className="w-4 h-4" /> {T.LOG}
        </h3>
        <div className="flex gap-2">
           <div className={`w-2 h-2 rounded-full animate-pulse ${mode === PhilosophyMode.KOREA ? 'bg-red-600' : 'bg-green-500'}`} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
        {logs.length === 0 && (
          <div className="text-gray-500 italic">...</div>
        )}
        
        {logs.map((log, idx) => (
          <div key={idx} className="border-l-2 border-gray-700 pl-3 py-1">
            <span className={mode === PhilosophyMode.KOREA ? "text-red-500 mr-2" : "text-emerald-400 mr-2"}>
              [{new Date().toLocaleTimeString()}]
            </span>
            <span className={mode === PhilosophyMode.KOREA ? "text-zinc-400" : "text-gray-300"}>{log}</span>
          </div>
        ))}

        {nodes.filter(n => n.output).map(node => (
          <div key={node.id} className={`mt-4 p-3 rounded border ${node.status === NodeStatus.WARNING ? 'border-rose-500/50 bg-rose-950/20' : 'border-gray-700/50 bg-white/5'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`font-bold ${node.status === NodeStatus.WARNING ? 'text-rose-400' : 'text-gray-200'}`}>
                {node.label} Output
              </span>
              {node.status === NodeStatus.COMPLETE && <CheckCircle className="w-4 h-4 text-emerald-500" />}
              {node.status === NodeStatus.WARNING && <AlertTriangle className="w-4 h-4 text-rose-500" />}
            </div>
            
            <p className="text-gray-300 whitespace-pre-wrap">{node.output}</p>

            {isAuditing && node.status === NodeStatus.WARNING && (
              <div className="mt-3 pt-3 border-t border-rose-500/30">
                <button 
                  onClick={() => onFixApplied(node.id)}
                  className="w-full py-2 bg-neon-gold/20 hover:bg-neon-gold/40 text-neon-gold border border-neon-gold rounded flex items-center justify-center gap-2 transition-all uppercase font-bold"
                >
                  <Zap className="w-4 h-4" /> {mode === PhilosophyMode.KOREA ? "DEBUG & PATCH" : "Apply Repair"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};