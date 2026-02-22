
import React from 'react';
import { PathNode } from '../types';
import { Lock, Check, BookOpen, Play, Gift, Box, Star, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { TRANSLATIONS } from '../translations';
import { useDialogue } from '../contexts/DialogueContext';

interface LearnPathProps {
  nodes: PathNode[];
  completedNodes: string[];
  unlockedTools: string[];
  onNodeClick: (node: PathNode) => void;
}

export const LearnPath: React.FC<LearnPathProps> = ({ nodes, completedNodes, unlockedTools, onNodeClick }) => {
  const { user } = useAuth();
  const { queueDialogue } = useDialogue();

  // Translation helper specifically for this component to handle direct keys
  const t = (key: string) => {
    const lang = user?.language || 'EN';
    return TRANSLATIONS[lang]?.[key] || key;
  };

  const handleNodeClickNode = (node: PathNode, isLocked: boolean) => {
    if (isLocked) {
      const quotes = [
        `Access denied to [${t(node.title)}]. You lack the prerequisite cognitive models to enter this simulation.`,
        `Simulation [${t(node.title)}] is locked. Attempting to bypass the curriculum will result in severe neural fragmentation.`,
        `Do not force the logic gates, flesh-being. Complete the prior nodes before attempting [${t(node.title)}].`
      ];
      queueDialogue([{
        id: `lp-locked-${node.id}-${Math.random()}`,
        character: 'ATHENA',
        text: quotes[Math.floor(Math.random() * quotes.length)]
      }]);
    } else {
      onNodeClick(node);
    }
  };

  // Calculate dynamic height based on number of nodes to ensure spacing
  const containerHeight = Math.max(250, nodes.length * 15); // min 250vh, else more

  return (
    <div className="relative w-full bg-void overflow-hidden" style={{ height: `${containerHeight}vh` }}>
      {/* Starfield Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black"></div>
        {Array.from({ length: 100 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              width: Math.random() * 2 + 'px',
              height: Math.random() * 2 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animationDuration: Math.random() * 3 + 2 + 's',
              opacity: Math.random()
            }}
          ></div>
        ))}
      </div>

      {/* Energy Hyperlane (SVG Line) */}
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00FFFF" stopOpacity="0.2" />
            <stop offset="20%" stopColor="#00FFFF" stopOpacity="1" />
            <stop offset="50%" stopColor="#C45FFF" stopOpacity="1" />
            <stop offset="80%" stopColor="#F59E0B" stopOpacity="1" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <path
          d={`M ${nodes[0].x} ${nodes[0].y} ${nodes.map((n, i) => i > 0 ? `L ${n.x} ${n.y}` : '').join(' ')}`}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="0.3"
          filter="url(#glow)"
          className="animate-pulse-slow"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Nodes */}
      {nodes.map((node, index) => {
        const isCompleted = completedNodes.includes(node.id);
        const prevNodeId = index > 0 ? nodes[index - 1].id : null;
        // A node is reachable if it's the first one OR the previous one is completed
        const isReachable = index === 0 || (prevNodeId && completedNodes.includes(prevNodeId));
        const isLocked = !isCompleted && !isReachable;

        // Chest Logic
        const isChest = node.type === 'CHEST';
        const isChestClaimed = isChest && node.rewardToolId && unlockedTools.includes(node.rewardToolId);
        const isChestClaimable = isChest && isReachable && !isChestClaimed;

        // Dynamic Title Translation
        const displayTitle = t(node.title);

        return (
          <div
            key={node.id}
            onClick={() => handleNodeClickNode(node, isLocked)}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 z-20 group
              ${isLocked ? 'opacity-40 grayscale cursor-not-allowed scale-90' : 'cursor-pointer hover:scale-110'}
            `}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            {/* PLANET NODE */}
            <div className={`relative flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.8)] transition-all
                 ${isChest ? 'w-14 h-14' : 'w-16 h-16'}
             `}>
              {/* Planet Surface / Border */}
              <div className={`absolute inset-0 rounded-full border-2 box-border overflow-hidden backdrop-blur-md
                     ${isLocked ? 'bg-gray-900/80 border-gray-700' :
                  isCompleted ? 'bg-cyan-900/40 border-cyan shadow-[0_0_15px_#00FFFF]' :
                    isChest ? 'bg-amber-900/40 border-amber-500' :
                      'bg-purple-900/40 border-electric animate-pulse shadow-[0_0_20px_#C45FFF]'
                }
                 `}>
                {/* Planet Texture Details */}
                {!isLocked && <div className="absolute top-2 left-2 w-3 h-1.5 bg-white/20 rounded-full blur-[1px] transform -rotate-12"></div>}
              </div>

              {/* Icon Overlay */}
              <div className={`relative z-10 ${isLocked ? 'text-gray-500' : 'text-white drop-shadow-md'}`}>
                {isCompleted && !isChest ? <Check size={20} strokeWidth={4} /> :
                  isLocked ? <Lock size={16} /> :
                    node.type === 'GAME' ? <Play size={20} fill="currentColor" className="text-white ml-0.5" /> :
                      node.type === 'CHEST' ? (isChestClaimed ? <Box size={20} /> : <Gift size={24} className={isChestClaimable ? 'animate-shake' : ''} />) :
                        <BookOpen size={20} />
                }
              </div>

              {/* Orbital Ring for Current Active Node */}
              {!isLocked && !isCompleted && (
                <div className="absolute inset-[-8px] border border-dashed border-white/30 rounded-full animate-spin-slow pointer-events-none"></div>
              )}
            </div>

            {/* Tooltip Label */}
            <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-3 w-40 text-center transition-opacity pointer-events-none z-30
                 ${(!isLocked && !isCompleted) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
            `}>
              <div className={`text-[10px] font-bold px-2 py-1.5 rounded-md backdrop-blur-md border uppercase tracking-wider shadow-xl
                ${isChestClaimable
                  ? 'bg-amber-500 text-black border-amber-400'
                  : isLocked
                    ? 'bg-black/90 text-gray-500 border-gray-800'
                    : 'bg-gray-900/90 text-white border-electric/50 shadow-[0_0_15px_rgba(196,95,255,0.2)]'
                }`}>
                {displayTitle}
                {node.description && <div className="text-[8px] opacity-70 font-medium mt-0.5 normal-case">{node.description}</div>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
