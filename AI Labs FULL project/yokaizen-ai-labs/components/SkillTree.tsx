
import React from 'react';
import { SkillNode } from '../types';
import { Button } from './ui/Button';
import { Lock, Check, Zap, Brain, Shield, Sparkles } from 'lucide-react';
import { audio } from '../services/audioService';

interface SkillTreeProps {
  nodes: SkillNode[];
  unlockedNodes: string[];
  skillPoints: number;
  onUnlock: (nodeId: string, cost: number) => void;
}

export const SkillTree: React.FC<SkillTreeProps> = ({ nodes, unlockedNodes, skillPoints, onUnlock }) => {
  
  // Helper to check if parent is unlocked
  const isUnlockable = (node: SkillNode) => {
      if (!node.parentId) return true; // Root node
      return unlockedNodes.includes(node.parentId);
  };

  const handleUnlock = (node: SkillNode) => {
      if (skillPoints >= node.cost && isUnlockable(node) && !unlockedNodes.includes(node.id)) {
          onUnlock(node.id, node.cost);
          audio.playSuccess();
      } else {
          audio.playError();
      }
  };

  const renderIcon = (branch: string) => {
      switch(branch) {
          case 'PROMPTING': return <Zap size={16} />;
          case 'SAFETY': return <Shield size={16} />;
          case 'ETHICS': return <Brain size={16} />;
          default: return <Sparkles size={16} />;
      }
  };

  return (
    <div className="p-6 bg-black/90 rounded-xl border border-white/10 shadow-2xl relative overflow-hidden h-full flex flex-col">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(196,95,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(196,95,255,0.05)_1px,transparent_1px)] bg-[length:20px_20px] pointer-events-none"></div>
        
        <div className="flex justify-between items-center mb-6 z-10">
            <h2 className="text-2xl font-black text-white uppercase italic">Neural <span className="text-electric">Upgrade</span></h2>
            <div className="bg-electric/20 px-4 py-2 rounded-full border border-electric flex items-center">
                <Zap size={16} className="text-yellow-400 mr-2 fill-yellow-400" />
                <span className="font-mono font-bold text-white">{skillPoints} SP</span>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-8 z-10 relative">
            {['PROMPTING', 'SAFETY', 'ETHICS'].map(branch => (
                <div key={branch} className="relative">
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-4 tracking-widest border-b border-white/10 pb-1">{branch} Track</h3>
                    <div className="flex space-x-8 overflow-x-auto pb-4 items-center">
                        {nodes.filter(n => n.branch === branch).map((node, i, arr) => {
                            const unlocked = unlockedNodes.includes(node.id);
                            const available = isUnlockable(node) && !unlocked;
                            const locked = !available && !unlocked;

                            return (
                                <div key={node.id} className="relative flex-shrink-0 group">
                                    {/* Connector Line */}
                                    {node.parentId && (
                                        <div className={`absolute top-1/2 -left-8 w-8 h-1 -translate-y-1/2 ${unlockedNodes.includes(node.parentId) ? 'bg-electric' : 'bg-gray-800'}`}></div>
                                    )}
                                    
                                    <button
                                        onClick={() => handleUnlock(node)}
                                        disabled={locked || (available && skillPoints < node.cost)}
                                        className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center transition-all duration-300 relative z-10 ${
                                            unlocked 
                                            ? 'bg-electric border-electric text-white shadow-[0_0_20px_rgba(196,95,255,0.5)]' 
                                            : available 
                                                ? skillPoints >= node.cost 
                                                    ? 'bg-gray-800 border-white text-white animate-pulse hover:scale-110 cursor-pointer' 
                                                    : 'bg-gray-900 border-gray-600 text-gray-500 cursor-not-allowed'
                                                : 'bg-black border-gray-800 text-gray-700 cursor-not-allowed opacity-50'
                                        }`}
                                    >
                                        {unlocked ? <Check size={24} /> : locked ? <Lock size={20} /> : renderIcon(node.branch)}
                                    </button>

                                    {/* Tooltip */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-gray-900/95 border border-white/20 p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 backdrop-blur-md">
                                        <div className="text-sm font-bold text-white mb-1">{node.title}</div>
                                        <div className="text-xs text-gray-400 mb-2 leading-tight">{node.description}</div>
                                        <div className="flex justify-between items-center text-[10px] font-mono">
                                            <span className="text-electric">{node.effect}</span>
                                            {!unlocked && <span className={skillPoints >= node.cost ? 'text-green-400' : 'text-red-500'}>{node.cost} SP</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};
