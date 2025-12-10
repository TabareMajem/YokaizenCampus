
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Dna, Disc, Square, Triangle, Hexagon, RotateCcw, Zap, CheckCircle2, AlertOctagon } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Language } from '../../types';

interface ProteinPokerProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
}

type Shape = 'CIRCLE' | 'SQUARE' | 'TRIANGLE' | 'HEX';
type Color = 'cyan' | 'magenta' | 'yellow' | 'green';

interface Port {
    id: number;
    shape: Shape;
    color: Color;
    angle: number; // 0-360 on the central molecule
    isFilled: boolean;
}

interface Fragment {
    id: string;
    shape: Shape;
    color: Color;
}

export const ProteinPoker: React.FC<ProteinPokerProps> = ({ onComplete, t }) => {
  const [ports, setPorts] = useState<Port[]>([]);
  const [hand, setHand] = useState<Fragment[]>([]);
  const [score, setScore] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [stability, setStability] = useState(100);
  const [gameOver, setGameOver] = useState(false);
  
  // Custom Drag State
  const [draggedFragment, setDraggedFragment] = useState<Fragment | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize Level
  useEffect(() => {
      const shapes: Shape[] = ['CIRCLE', 'SQUARE', 'TRIANGLE', 'HEX'];
      const colors: Color[] = ['cyan', 'magenta', 'yellow', 'green'];
      
      const newPorts: Port[] = [];
      const newHand: Fragment[] = [];

      for(let i=0; i<4; i++) {
          const shape = shapes[Math.floor(Math.random() * shapes.length)];
          const color = colors[Math.floor(Math.random() * colors.length)];
          newPorts.push({
              id: i,
              shape,
              color,
              angle: i * 90,
              isFilled: false
          });
          newHand.push({
              id: `frag-${i}`,
              shape,
              color
          });
      }
      // Shuffle hand
      newHand.sort(() => Math.random() - 0.5);

      setPorts(newPorts);
      setHand(newHand);
      
      audio.playScan();
  }, []);

  // Rotation & Decay Loop
  useEffect(() => {
      if (gameOver) return;
      const interval = setInterval(() => {
          setRotation(r => (r + 0.2) % 360); // Slow rotation
          setStability(s => {
              if (s <= 0) {
                  setGameOver(true);
                  audio.playError();
                  return 0;
              }
              return s - 0.03; // Slow decay
          });
      }, 50);
      return () => clearInterval(interval);
  }, [gameOver]);

  const getIcon = (shape: Shape, size: number) => {
      switch(shape) {
          case 'CIRCLE': return <Disc size={size} />;
          case 'SQUARE': return <Square size={size} />;
          case 'TRIANGLE': return <Triangle size={size} />;
          case 'HEX': return <Hexagon size={size} />;
      }
  };

  const getColorClass = (color: Color) => {
      switch(color) {
          case 'cyan': return 'text-cyan-400 border-cyan-500 shadow-[0_0_10px_cyan]';
          case 'magenta': return 'text-fuchsia-400 border-fuchsia-500 shadow-[0_0_10px_magenta]';
          case 'yellow': return 'text-yellow-400 border-yellow-500 shadow-[0_0_10px_yellow]';
          case 'green': return 'text-green-400 border-green-500 shadow-[0_0_10px_lime]';
      }
  };

  // Pointer Events for Drag
  const handlePointerDown = (e: React.PointerEvent, frag: Fragment) => {
      e.preventDefault();
      setDraggedFragment(frag);
      setDragPos({ x: e.clientX, y: e.clientY });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
      if (draggedFragment) {
          e.preventDefault();
          setDragPos({ x: e.clientX, y: e.clientY });
      }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
      if (!draggedFragment) return;
      e.preventDefault();
      
      // Check collision with ports
      // We need to calculate the screen position of the ports
      // Since ports rotate, this is a bit tricky. 
      // Simpler approach: If drop is near the center container
      const containerRect = containerRef.current?.getBoundingClientRect();
      
      if (containerRect) {
          const cx = containerRect.left + containerRect.width / 2;
          const cy = containerRect.top + containerRect.height / 2;
          
          // Iterate ports to check if we dropped near one
          let bestPort: Port | null = null;
          let minDist = 60; // drop radius

          ports.forEach(port => {
              if (port.isFilled) return;
              // Calculate port position with rotation
              const rad = ((port.angle + rotation) * Math.PI) / 180;
              const px = cx + Math.cos(rad) * 100; // 100 is radius in px approx
              const py = cy + Math.sin(rad) * 100;
              
              const dist = Math.sqrt(Math.pow(e.clientX - px, 2) + Math.pow(e.clientY - py, 2));
              if (dist < minDist) {
                  minDist = dist;
                  bestPort = port;
              }
          });

          if (bestPort) {
              handleDrop(bestPort);
          }
      }

      setDraggedFragment(null);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleDrop = (port: Port) => {
      if (!draggedFragment || gameOver) return;
      
      // Check Match
      if (port.shape === draggedFragment.shape && port.color === draggedFragment.color) {
          // Success
          audio.playSuccess();
          setPorts(prev => prev.map(p => p.id === port.id ? { ...p, isFilled: true } : p));
          setHand(prev => prev.filter(f => f.id !== draggedFragment.id));
          setScore(s => s + 250);
          setStability(s => Math.min(100, s + 20)); // Restore stability
          
          // Win Check
          if (ports.filter(p => !p.isFilled && p.id !== port.id).length === 0) {
              setGameOver(true);
              setTimeout(() => onComplete(100), 1500);
          }
      } else {
          // Fail
          audio.playError();
          setStability(s => Math.max(0, s - 15)); // Penalty
      }
  };

  return (
    <div 
      className="h-full flex flex-col bg-gray-950 relative overflow-hidden font-mono select-none touch-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
        {/* --- HEADER --- */}
        <div className="p-4 flex justify-between items-start z-10 bg-black/50 backdrop-blur-sm border-b border-white/10">
            <div>
                <div className="text-xs text-gray-400 uppercase font-bold flex items-center">
                    <Dna size={14} className="mr-2 text-blue-500 animate-spin-slow"/> {t('protein.docking')}
                </div>
                <div className="text-2xl font-black text-white">{score}</div>
            </div>
            <div className="text-right">
                <div className="text-xs text-gray-400 uppercase font-bold">{t('protein.stability')}</div>
                <div className={`text-xl font-bold ${stability < 30 ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
                    {Math.round(stability)}%
                </div>
            </div>
        </div>

        {/* --- MOLECULE VIEWPORT --- */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden" ref={containerRef}>
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(30,58,138,0.1)_0%,transparent_70%)] pointer-events-none"></div>
            
            {/* Central Core */}
            <div 
                className="relative w-64 h-64 rounded-full border-4 border-blue-900/50 flex items-center justify-center transition-transform duration-100 ease-linear shadow-[0_0_50px_rgba(30,58,138,0.3)]"
                style={{ transform: `rotate(${rotation}deg)` }}
            >
                <div className="absolute inset-0 bg-blue-500/5 rounded-full animate-pulse"></div>
                
                {/* Core Nucleus */}
                <div className="w-20 h-20 bg-blue-900 rounded-full shadow-[0_0_30px_#1e3a8a] flex items-center justify-center z-10 border border-blue-500">
                    <Zap size={32} className="text-blue-400 animate-pulse" />
                </div>

                {/* Ports */}
                {ports.map(port => {
                    // Position around circle
                    const rad = (port.angle * Math.PI) / 180;
                    const x = Math.cos(rad) * 100; // Radius from center
                    const y = Math.sin(rad) * 100;

                    return (
                        <div
                            key={port.id}
                            className={`absolute w-14 h-14 flex items-center justify-center rounded-xl border-2 transition-all duration-300 z-20 ${
                                port.isFilled 
                                ? 'bg-green-900/80 border-green-500 scale-90 shadow-[0_0_15px_lime]' 
                                : 'bg-black/80 border-gray-600'
                            } ${draggedFragment && !port.isFilled ? 'animate-pulse border-dashed border-white' : ''}`}
                            style={{ 
                                transform: `translate(${x}px, ${y}px) rotate(${-rotation}deg)`
                            }}
                        >
                            <div style={{ transform: `rotate(${-rotation}deg)` }}>
                                {port.isFilled ? (
                                    <CheckCircle2 className="text-green-500" />
                                ) : (
                                    <div className={`opacity-40 ${getColorClass(port.color)} border-none shadow-none`}>
                                        {getIcon(port.shape, 24)}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                
                {/* Connecting Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                    {ports.map(p => {
                         const rad = (p.angle * Math.PI) / 180;
                         const x = 128 + Math.cos(rad) * 100;
                         const y = 128 + Math.sin(rad) * 100;
                         return <line key={p.id} x1="128" y1="128" x2={x} y2={y} stroke="#3b82f6" strokeWidth="2" />;
                    })}
                </svg>
            </div>
        </div>

        {/* --- HAND --- */}
        <div className="h-36 bg-gray-900 border-t border-white/10 p-4 z-20">
            <div className="text-[10px] text-gray-500 uppercase font-bold mb-3 text-center tracking-widest">{t('protein.fragments')}</div>
            <div className="flex justify-center space-x-4 overflow-x-auto pb-2">
                {hand.map(frag => (
                    <div
                        key={frag.id}
                        onPointerDown={(e) => handlePointerDown(e, frag)}
                        className={`w-16 h-16 rounded-xl border-2 bg-black flex-shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg touch-none ${getColorClass(frag.color)} ${draggedFragment?.id === frag.id ? 'opacity-0' : 'opacity-100'}`}
                    >
                        {getIcon(frag.shape, 32)}
                    </div>
                ))}
            </div>
        </div>

        {/* Dragged Ghost */}
        {draggedFragment && (
            <div 
                className={`fixed w-20 h-20 rounded-xl border-2 bg-black/80 flex items-center justify-center z-50 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 ${getColorClass(draggedFragment.color)}`}
                style={{ left: dragPos.x, top: dragPos.y }}
            >
                {getIcon(draggedFragment.shape, 40)}
            </div>
        )}

        {/* --- OVERLAYS --- */}
        {gameOver && (
            <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center animate-in zoom-in">
                {hand.length === 0 ? (
                    <>
                        <h2 className="text-3xl font-black text-green-500 mb-2">{t('protein.complete')}</h2>
                        <div className="text-white text-xl font-mono mb-6">{t('ui.score')}: {Math.round(score + stability)}</div>
                        <Button onClick={() => onComplete(100)} variant="primary">{t('protein.secure')}</Button>
                    </>
                ) : (
                    <>
                        <h2 className="text-3xl font-black text-red-500 mb-2">{t('protein.destabilized')}</h2>
                        <AlertOctagon size={48} className="text-red-500 mb-6" />
                        <p className="text-gray-400 mb-6 text-sm">{t('protein.fail_desc')}</p>
                        <Button onClick={() => window.location.reload()} variant="secondary">{t('protein.retry')}</Button>
                    </>
                )}
            </div>
        )}
    </div>
  );
};
