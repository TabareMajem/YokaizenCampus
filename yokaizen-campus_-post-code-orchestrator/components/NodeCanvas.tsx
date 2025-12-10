import React, { useRef, useState } from 'react';
import { AgentNode, Connection, NodeStatus, AgentType, PhilosophyMode, Language } from '../types';
import { TERMS } from '../translations';
import { Network, ShieldCheck, Database, FileSearch, Pickaxe, AlertTriangle, CheckCircle2, HelpCircle, XCircle, Loader2 } from 'lucide-react';

interface NodeCanvasProps {
  nodes: AgentNode[];
  connections: Connection[];
  onNodeSelect: (nodeId: string) => void;
  onNodeMove: (id: string, x: number, y: number) => void;
  selectedNodeId: string | null;
  isAuditing: boolean;
  mode: PhilosophyMode;
  language: Language;
  onShowTutorial?: () => void;
}

const getIconForType = (type: AgentType) => {
  switch (type) {
    case AgentType.SCOUT: return <FileSearch className="w-5 h-5" />;
    case AgentType.HISTORIAN: return <Database className="w-5 h-5" />;
    case AgentType.AUDITOR: return <ShieldCheck className="w-5 h-5" />;
    case AgentType.BUILDER: return <Pickaxe className="w-5 h-5" />;
    case AgentType.SECURITY: return <ShieldCheck className="w-5 h-5" />;
    default: return <Network className="w-5 h-5" />;
  }
};

export const NodeCanvas: React.FC<NodeCanvasProps> = ({ 
  nodes, 
  connections, 
  onNodeSelect, 
  onNodeMove,
  selectedNodeId,
  isAuditing,
  mode,
  language,
  onShowTutorial
}) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const T = TERMS[language].CANVAS;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingId && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - 96; // Center horizontally (w-48 = 192px)
      const y = e.clientY - rect.top - 40;  // Center vertically approx
      onNodeMove(draggingId, x, y);
    }
  };

  const handleMouseUp = () => setDraggingId(null);

  // Theme Helpers
  const getCanvasBg = () => {
    switch (mode) {
      case PhilosophyMode.FINLAND: return "bg-[#292524] bg-[radial-gradient(#57534e_1px,transparent_1px)] [background-size:24px_24px]"; // Stone/Wood
      case PhilosophyMode.KOREA: return "bg-black bg-[linear-gradient(to_right,#202020_1px,transparent_1px),linear-gradient(to_bottom,#202020_1px,transparent_1px)] [background-size:60px_60px]"; // Cyber Grid
      default: return "grid-bg bg-[#020617]"; // Japan/Standard
    }
  };

  const getHelpButtonClass = () => {
    switch(mode) {
        case PhilosophyMode.FINLAND: return "bg-[#44403c] text-amber-100 border-amber-500/50 hover:bg-[#57534e] hover:border-amber-400 rounded-full shadow-xl";
        case PhilosophyMode.KOREA: return "bg-black text-red-500 border-red-600 hover:bg-red-950/50 rounded-none shadow-[0_0_15px_rgba(220,38,38,0.3)]";
        default: return "bg-glass-200 text-neon-blue border-glass-border hover:bg-glass-300 hover:border-neon-blue hover:text-white rounded-full shadow-lg backdrop-blur-md"; // Japan
    }
  };

  const getNodeStyles = (node: AgentNode) => {
    let base = "absolute w-48 p-3 flex flex-col gap-2 z-10 transition-all duration-300 cursor-grab active:cursor-grabbing backdrop-blur-md border ";
    
    // Confidence Visuals
    const confidence = node.confidence ?? 100;
    const isHighConfidence = confidence > 90;

    // Finland: Organic, soft, warm
    if (mode === PhilosophyMode.FINLAND) {
      base += "rounded-[2rem] shadow-xl font-serif ";
      if (node.status === NodeStatus.THINKING) return base + "bg-[#44403c] border-amber-500 text-amber-100 ring-4 ring-amber-500/20 scale-105";
      if (selectedNodeId === node.id) return base + "bg-[#44403c] border-amber-400 text-amber-50 shadow-amber-900/50";
      return base + "bg-[#292524]/90 border-[#57534e] text-[#d6d3d1] hover:border-amber-500/50 hover:bg-[#44403c]";
    }
    
    // Korea: Brutalist, high contrast, cyber
    if (mode === PhilosophyMode.KOREA) {
      base += "rounded-none shadow-none uppercase tracking-tighter border-2 ";
      if (node.status === NodeStatus.THINKING) return base + "bg-red-950 border-red-500 text-red-500 animate-pulse shadow-[0_0_30px_rgba(220,38,38,0.4)]";
      if (selectedNodeId === node.id) return base + "bg-black border-red-500 text-white shadow-[0_0_0_2px_rgba(0,0,0,1),0_0_0_4px_rgba(220,38,38,1)]";
      
      return base + "bg-black border-zinc-800 text-zinc-500 hover:border-red-600 hover:text-red-500";
    }

    // Japan: Glass, balanced, neon (Default)
    base += "rounded-lg shadow-lg font-mono ";
    if (node.status === NodeStatus.THINKING) return base + "bg-glass-300 border-neon-purple text-white shadow-[0_0_20px_rgba(188,19,254,0.3)]";
    if (selectedNodeId === node.id) return base + "bg-glass-200 border-neon-blue text-white shadow-[0_0_15px_rgba(0,243,255,0.3)] ring-1 ring-neon-blue";
    
    // High confidence glow
    if (isHighConfidence && node.status === NodeStatus.COMPLETE) return base + "bg-glass-200 border-emerald-500/50 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.2)]";

    return base + "bg-glass-200 border-glass-border text-gray-300 hover:border-neon-blue/50 hover:bg-glass-300";
  };

  const getConnectionPath = (x1: number, y1: number, x2: number, y2: number) => {
    if (mode === PhilosophyMode.KOREA) {
       // Orthogonal / Circuit
       const midX = (x1 + x2) / 2;
       return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
    }
    if (mode === PhilosophyMode.FINLAND) {
       // Organic / Curved heavily
       const delta = Math.abs(x2 - x1) * 0.5;
       return `M ${x1} ${y1} C ${x1 + delta} ${y1}, ${x2 - delta} ${y2}, ${x2} ${y2}`;
    }
    // Japan / Default: Smooth Bezier
    return `M ${x1} ${y1} C ${x1 + 100} ${y1}, ${x2 - 100} ${y2}, ${x2} ${y2}`;
  };

  const getConnectionColor = () => {
     if (isAuditing) return "#10b981"; // Audit Green
     if (mode === PhilosophyMode.FINLAND) return "#a8a29e"; // Stone 400
     if (mode === PhilosophyMode.KOREA) return "#dc2626"; // Red 600
     return "#475569"; // Slate 600
  };

  return (
    <div 
      ref={canvasRef}
      className={`relative w-full h-full overflow-hidden transition-colors duration-700 ${getCanvasBg()}`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* SVG Layer */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={getConnectionColor()} />
          </marker>
        </defs>
        {connections.map(conn => {
          const start = nodes.find(n => n.id === conn.from);
          const end = nodes.find(n => n.id === conn.to);
          if (!start || !end) return null;
          
          const x1 = start.x + 96; // Center of w-48
          const y1 = start.y + 40;
          const x2 = end.x + 96;
          const y2 = end.y + 40;

          return (
            <path 
              key={conn.id}
              d={getConnectionPath(x1, y1, x2, y2)}
              stroke={getConnectionColor()}
              strokeWidth={mode === PhilosophyMode.KOREA ? "2" : "2"}
              fill="none"
              markerEnd="url(#arrowhead)"
              className="transition-all duration-500"
              strokeDasharray={isAuditing ? "5,5" : "0"}
            />
          );
        })}
      </svg>

      {/* Nodes */}
      {nodes.map(node => (
        <div
          key={node.id}
          style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
          className={getNodeStyles(node)}
          onMouseDown={() => {
            setDraggingId(node.id);
            onNodeSelect(node.id);
          }}
        >
          {/* Header Row */}
          <div className="flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2">
              {getIconForType(node.type)}
              <span className="text-xs font-bold opacity-80 tracking-wide">{node.type}</span>
            </div>
            
            {/* Status Indicators */}
            <div className="flex items-center gap-1">
               {node.status === NodeStatus.THINKING && (
                  <Loader2 className="w-3 h-3 animate-spin text-sky-400" />
               )}
               {node.status === NodeStatus.ERROR && (
                  <XCircle className="w-3 h-3 text-red-500" />
               )}
               {node.status === NodeStatus.WARNING && (
                  <AlertTriangle className="w-3 h-3 text-amber-500 animate-pulse" />
               )}
               {node.status === NodeStatus.COMPLETE && (
                   <CheckCircle2 className={`w-3 h-3 ${node.confidence && node.confidence > 90 ? 'text-emerald-400' : 'text-emerald-600'}`} />
               )}
               
               {/* Confidence Dot if not explicit status icon */}
               {node.status === NodeStatus.IDLE && node.confidence !== undefined && node.confidence < 60 && (
                  <div className="w-2 h-2 rounded-full bg-amber-500" title={T.LOW_CONFIDENCE}></div>
               )}
            </div>
          </div>
          
          <div className="text-sm font-bold leading-tight pointer-events-none mt-2 truncate">
            {node.label}
          </div>

          {/* Mini-Stats Row */}
          {node.status === NodeStatus.COMPLETE && node.confidence && (
            <div className="mt-2 flex items-center gap-2 text-[10px] opacity-60 font-mono">
               <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${node.confidence > 80 ? 'bg-emerald-500' : node.confidence < 50 ? 'bg-rose-500' : 'bg-amber-500'}`} 
                    style={{ width: `${node.confidence}%` }}
                  />
               </div>
               <span>{node.confidence}%</span>
            </div>
          )}

          {/* Audit Overlay */}
          {isAuditing && (
            <div className="absolute inset-0 border border-emerald-500/50 rounded-lg pointer-events-none flex flex-col items-center justify-center bg-emerald-900/40 backdrop-blur-[2px] transition-all animate-in fade-in zoom-in">
              {node.status === NodeStatus.WARNING || (node.confidence && node.confidence < 50) ? (
                 <div className="flex flex-col items-center gap-1 text-rose-400">
                   <AlertTriangle className="w-8 h-8 animate-bounce" />
                   <span className="text-[10px] font-black bg-black px-2 py-0.5 border border-rose-500">{T.HALLUCINATION}</span>
                   <span className="text-[10px] font-mono">{node.confidence}% {T.CONFIDENCE}</span>
                 </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                  <span className="text-[10px] font-bold">{T.VERIFIED}</span>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Persistent Help Button */}
      {onShowTutorial && (
        <button
          onClick={onShowTutorial}
          className={`absolute bottom-8 left-8 z-40 p-4 border transition-all hover:scale-105 active:scale-95 group ${getHelpButtonClass()}`}
          title={T.SHOW_GUIDE}
        >
          <HelpCircle className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        </button>
      )}
    </div>
  );
};