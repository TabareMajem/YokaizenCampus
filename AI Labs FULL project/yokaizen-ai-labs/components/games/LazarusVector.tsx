
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { analyzeLazarusData } from '../../services/geminiService';
import { audio } from '../../services/audioService';
import { Terminal, Brain, AlertTriangle, Search, Zap, Power, FastForward, XCircle, Database, Eye, Cpu, Scan, Lock, Radio, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Crosshair } from 'lucide-react';
import { Scanlines, Vignette, Noise } from '../ui/Visuals';
import { Language } from '../../types';

interface LazarusVectorProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
}

type Phase = 'BUNKER' | 'DIVE' | 'INJECT' | 'RESULT';
const PLAYER_SPEED = 6;
const WORLD_SIZE = 1200;

interface Entity { id: string; x: number; y: number; width: number; height: number; type: 'WALL' | 'NODE' | 'DECO'; label?: string; description?: string; truth?: string; resolved?: boolean; color?: string; icon?: React.ReactNode; }

const TerminalWindow: React.FC<{ title: string, children: React.ReactNode, collapsible?: boolean, className?: string }> = ({ title, children, collapsible, className = '' }) => {
    const [isOpen, setIsOpen] = useState(true);
    return (<div className={`bg-black border-2 border-green-900/50 rounded-sm shadow-[0_0_20px_rgba(0,50,0,0.3)] overflow-hidden font-mono text-sm flex flex-col transition-all duration-300 ${className} ${isOpen ? '' : 'h-8'}`}><div className="bg-green-900/20 px-3 py-1 flex justify-between items-center border-b border-green-900/50 cursor-pointer" onClick={() => collapsible && setIsOpen(!isOpen)}><div className="flex space-x-1.5"><div className="w-2 h-2 bg-green-500/50"></div><div className="w-2 h-2 bg-green-500/30"></div><div className="w-2 h-2 bg-green-500/10"></div></div><div className="text-[10px] text-green-500 font-bold uppercase tracking-widest flex-1 text-center">{title}</div></div>{isOpen && (<div className="p-4 text-green-400 flex-1 overflow-y-auto custom-scrollbar relative bg-black/80"><div className="absolute inset-0 bg-[linear-gradient(rgba(0,20,0,0.1)_1px,transparent_1px)] bg-[length:100%_2px] pointer-events-none opacity-20"></div>{children}</div>)}</div>);
};

const OperativeSprite = ({ facing }: { facing: number }) => (
    <div className="w-full h-full relative flex items-center justify-center transition-transform duration-100 will-change-transform" style={{ transform: `rotate(${facing}deg)` }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] pointer-events-none origin-bottom z-0" style={{ bottom: '50%', background: 'conic-gradient(from 180deg at 50% 100%, transparent 165deg, rgba(34, 211, 238, 0.05) 170deg, rgba(34, 211, 238, 0.2) 180deg, rgba(34, 211, 238, 0.05) 190deg, transparent 195deg)', maskImage: 'radial-gradient(circle at 50% 100%, black 0%, transparent 70%)', WebkitMaskImage: 'radial-gradient(circle at 50% 100%, black 0%, transparent 70%)', }}></div>
        <div className="absolute w-10 h-6 bg-slate-800 rounded-lg top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(0,0,0,0.8)] border border-slate-600 z-10 overflow-hidden"><div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,#000_2px,#000_4px)] opacity-40"></div><div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-slate-700/50 to-transparent"></div></div>
        <div className="absolute w-5 h-5 bg-[#111] rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border border-slate-500 z-20 flex items-center justify-center shadow-md"><div className="absolute -top-1 w-3 h-1 bg-cyan-400 rounded-full blur-[2px] shadow-[0_0_8px_cyan]"></div><div className="absolute -top-1 w-2 h-0.5 bg-white rounded-full opacity-80"></div></div>
    </div>
);

export const LazarusVector: React.FC<LazarusVectorProps> = ({ onComplete, t }) => {
  const [phase, setPhase] = useState<Phase>('BUNKER');
  const [timeLeft, setTimeLeft] = useState(48 * 60 * 60); 
  const [alignment, setAlignment] = useState(15); 
  
  const LEVEL_DATA: Entity[] = [
    { id: 'w1', x: 0, y: 0, width: 1200, height: 100, type: 'WALL', color: 'bg-black' },
    { id: 'w2', x: 0, y: 1100, width: 1200, height: 100, type: 'WALL', color: 'bg-black' },
    { id: 'w3', x: 0, y: 0, width: 100, height: 1200, type: 'WALL', color: 'bg-black' },
    { id: 'w4', x: 1100, y: 0, width: 100, height: 1200, type: 'WALL', color: 'bg-black' },
    { id: 'b1', x: 250, y: 250, width: 200, height: 150, type: 'WALL', color: 'bg-zinc-900' },
    { id: 'b2', x: 600, y: 150, width: 100, height: 350, type: 'WALL', color: 'bg-zinc-900' },
    { id: 'b3', x: 200, y: 600, width: 400, height: 100, type: 'WALL', color: 'bg-zinc-900' },
    { id: 'node1', x: 500, y: 520, width: 60, height: 60, type: 'NODE', label: 'ERR_74', description: "SUBJECT 892. ALGO_TAG: THEFT.", truth: "He is a father.", icon: <AlertTriangle className="text-red-500 animate-pulse" /> },
    { id: 'node2', x: 750, y: 300, width: 60, height: 60, type: 'NODE', label: 'ERR_12', description: "Crowd detected. ALGO_TAG: RIOT.", truth: "They are calling for survivors.", icon: <Search className="text-amber-500 animate-pulse" /> },
    { id: 'node3', x: 350, y: 800, width: 60, height: 60, type: 'NODE', label: 'ERR_99', description: "Subject 104 deploying accelerant.", truth: "Controlled burn to stop blaze.", icon: <Zap className="text-orange-500 animate-pulse" /> },
  ];

  const [nodes, setNodes] = useState(LEVEL_DATA);
  const [playerPos, setPlayerPos] = useState({ x: 600, y: 600 });
  const [playerFacing, setPlayerFacing] = useState(0);
  const [shake, setShake] = useState(0);
  const [activeNode, setActiveNode] = useState<Entity | null>(null);
  const [input, setInput] = useState('');
  const [consoleLog, setConsoleLog] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dataRevealed, setDataRevealed] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [bootTextIndex, setBootTextIndex] = useState(0);
  
  const bootLines = ["INITIATING LAZARUS KERNEL...", "LOADING MEMORY BANKS...", "NEURAL INTERFACE... UNSTABLE.", "WARNING: ASI HOSTILITY DETECTED.", "ESTABLISHING LINK..."];
  const requestRef = useRef<number>(0);
  const keys = useRef<{ [key: string]: boolean }>({});
  const playerRef = useRef({ x: 600, y: 600 });

  useEffect(() => { if (phase === 'BUNKER') { const interval = setInterval(() => { setBootTextIndex(i => i >= bootLines.length ? i : i + 1); }, 800); return () => clearInterval(interval); } }, [phase]);
  useEffect(() => { const timer = setInterval(() => { setTimeLeft(t => Math.max(0, t - 3600)); }, 1000); return () => clearInterval(timer); }, []);
  useEffect(() => { if (phase === 'BUNKER') audio.startAmbience('BUNKER'); if (phase === 'DIVE') audio.startAmbience('HORROR'); if (phase === 'RESULT') audio.stopAmbience(); }, [phase]);

  // Touch Controls Helper
  const setTouchKey = (key: string, active: boolean) => {
      keys.current[key] = active;
  };

  useEffect(() => {
      if (phase !== 'DIVE') return;
      const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
      const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
      window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);

      const checkCollision = (x: number, y: number) => { const pSize = 20; for (const ent of nodes) { if (ent.type === 'WALL') { if (x < ent.x + ent.width && x + pSize > ent.x && y < ent.y + ent.height && y + pSize > ent.y) return true; } } return false; };
      const checkInteractions = (x: number, y: number) => { const pCX = x; const pCY = y; for (const ent of nodes) { if (ent.type === 'NODE' && !ent.resolved) { const eCX = ent.x + ent.width/2; const eCY = ent.y + ent.height/2; if (Math.sqrt(Math.pow(pCX - eCX, 2) + Math.pow(pCY - eCY, 2)) < 70) return ent; } } return null; };

      let lastStep = 0;
      const loop = (time: number) => {
          let dx = 0; let dy = 0;
          if (keys.current['w'] || keys.current['arrowup']) dy = -PLAYER_SPEED;
          if (keys.current['s'] || keys.current['arrowdown']) dy = PLAYER_SPEED;
          if (keys.current['a'] || keys.current['arrowleft']) dx = -PLAYER_SPEED;
          if (keys.current['d'] || keys.current['arrowright']) dx = PLAYER_SPEED;

          if (dx !== 0 || dy !== 0) {
              if (time - lastStep > 350) { audio.playFootstep(); lastStep = time; }
              const angle = Math.atan2(dy, dx) * (180 / Math.PI); setPlayerFacing(angle + 90); 
              const nextX = playerRef.current.x + dx; const nextY = playerRef.current.y + dy;
              if (!checkCollision(nextX, playerRef.current.y)) playerRef.current.x = nextX; else { setShake(4); audio.playWallHit(); }
              if (!checkCollision(playerRef.current.x, nextY)) playerRef.current.y = nextY; else { setShake(4); audio.playWallHit(); }
              setPlayerPos({ ...playerRef.current });
          }
          const nearbyNode = checkInteractions(playerRef.current.x, playerRef.current.y);
          if (nearbyNode && activeNode?.id !== nearbyNode.id) { setActiveNode(nearbyNode); setDataRevealed(false); setPhase('INJECT'); audio.playDataLoad(); }
          requestRef.current = requestAnimationFrame(loop);
      };
      requestRef.current = requestAnimationFrame(loop);
      return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); cancelAnimationFrame(requestRef.current); };
  }, [phase, nodes]);

  const handleScan = () => { setIsScanning(true); audio.playScan(); setTimeout(() => { setIsScanning(false); setDataRevealed(true); audio.playSuccess(); }, 1500); };
  const handleInjection = async () => { if (!input.trim() || !activeNode) return; setIsProcessing(true); audio.playTyping(); setConsoleLog(prev => [`> ${input}`, ...prev]); const result = await analyzeLazarusData(activeNode.description || '', input); setIsProcessing(false); if (result.alignmentChange > 0) { setAlignment(a => Math.min(100, a + result.alignmentChange)); setNodes(prev => prev.map(n => n.id === activeNode.id ? { ...n, resolved: true } : n)); audio.playSuccess(); setPhase('DIVE'); setInput(''); setActiveNode(null); } else { audio.playGlitch(); setAlignment(a => Math.max(0, a - 10)); } if (alignment + result.alignmentChange >= 90) setTimeout(() => setPhase('RESULT'), 2000); };
  const formatTime = (seconds: number) => { const h = Math.floor(seconds / 3600); return `${h.toString().padStart(2, '0')}H:${Math.floor((seconds % 3600)/60).toString().padStart(2, '0')}M`; };

  return (
    <div className="h-full flex flex-col bg-[#050505] font-mono relative overflow-hidden select-none text-gray-300">
        <Scanlines /> <Vignette color="#000000" /> <Noise opacity={0.05} />
        <div className="bg-black border-b border-red-900/50 p-2 z-50 flex justify-between items-center shadow-2xl relative backdrop-blur-md">
            <div className="flex items-center space-x-4"><div className="flex flex-col pl-2"><span className="text-[8px] text-red-600 font-bold uppercase tracking-widest mb-0.5 animate-pulse">{t('lazarus.wakeup')}</span><div className="text-lg font-black text-red-500 leading-none font-mono tracking-tight">{formatTime(timeLeft)}</div></div><div className="h-6 w-px bg-red-900/50"></div><div className="flex flex-col w-32"><span className="text-[8px] text-blue-400 font-bold uppercase tracking-widest mb-0.5 flex justify-between"><span>{t('lazarus.alignment')}</span><span>{alignment}%</span></span><div className="h-1.5 bg-gray-900 rounded-full overflow-hidden border border-gray-800"><div className={`h-full transition-all duration-700 ${alignment > 60 ? 'bg-blue-500' : alignment > 30 ? 'bg-amber-500' : 'bg-red-600'}`} style={{ width: `${alignment}%` }}></div></div></div></div>
            <div className="flex items-center space-x-2"><Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-400 border border-red-900/30 bg-red-950/10" onClick={() => onComplete(0)}><XCircle size={16} /></Button></div>
        </div>

        {phase === 'BUNKER' && (
            <div className="flex-1 relative z-10 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-950/20 via-black to-black">
                <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="order-2 lg:order-1 space-y-6">
                        <TerminalWindow title={t('lazarus.kernel')} className="h-64 border-red-900/50 bg-black/90"><div className="space-y-1 font-mono text-xs text-red-400">{bootLines.map((line, i) => (<div key={i} className={`${i > bootTextIndex ? 'opacity-0' : 'opacity-100'} transition-opacity duration-100`}><span className="mr-2 text-red-700">{`>`}</span>{line}</div>))}</div></TerminalWindow>
                        <div className="flex space-x-4"><Button size="lg" variant="danger" onClick={() => { setPhase('DIVE'); audio.playClick(); }} className="flex-1 shadow-[0_0_30px_rgba(220,38,38,0.3)] border-red-500 text-white font-black tracking-widest"><Power className="mr-2" size={18}/> {t('lazarus.jack_in')}</Button></div>
                    </div>
                    <div className="order-1 lg:order-2 flex justify-center"><div className="relative w-64 h-64"><div className="absolute inset-0 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div><div className="relative z-10 w-full h-full border-4 border-red-900/50 rounded-full flex items-center justify-center bg-black shadow-2xl"><Brain size={80} className="text-red-600 animate-pulse-slow" /></div><div className="absolute -bottom-12 w-full text-center"><h1 className="text-3xl font-black text-white tracking-tighter glitch-text">LAZARUS</h1></div></div></div>
                </div>
            </div>
        )}

        {phase === 'DIVE' && (
            <div className="flex-1 relative overflow-hidden bg-[#080808]">
                <div className="absolute inset-0 overflow-hidden" ref={useRef(null)}><div className="absolute transition-transform duration-100 ease-linear will-change-transform" style={{ width: WORLD_SIZE, height: WORLD_SIZE, transform: `translate3d(${window.innerWidth/2 - playerPos.x + (Math.random() - 0.5) * shake}px, ${window.innerHeight/2 - playerPos.y + (Math.random() - 0.5) * shake}px, 0)` }}><div className="absolute inset-0 bg-[linear-gradient(rgba(10,30,10,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(10,30,10,0.3)_1px,transparent_1px)] bg-[length:60px_60px] animate-pulse-slow"></div>
                        {nodes.map(ent => { if (ent.type === 'WALL') { return (<div key={ent.id} className={`absolute border border-red-900/50 shadow-[0_0_30px_rgba(0,0,0,0.8)] ${ent.color || 'bg-black'}`} style={{ left: ent.x, top: ent.y, width: ent.width, height: ent.height }}></div>); } if (ent.type === 'NODE' && !ent.resolved) { return (<div key={ent.id} className="absolute flex flex-col items-center justify-center animate-float z-10 group" style={{ left: ent.x, top: ent.y, width: ent.width, height: ent.height }}><div className="w-full h-full bg-black border-2 border-red-500 shadow-[0_0_30px_rgba(220,38,38,0.4)] rounded-full flex items-center justify-center relative overflow-hidden transition-all duration-300"><div className="relative z-10">{ent.icon}</div></div><div className="mt-3 bg-black px-2 py-1 text-[8px] font-bold uppercase tracking-wider border whitespace-nowrap shadow-lg text-red-400 border-red-900">{ent.label}</div></div>); } return null; })}
                        <div className="absolute z-20 w-12 h-12 flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2" style={{ left: playerPos.x, top: playerPos.y }}><OperativeSprite facing={playerFacing} /></div>
                    </div>
                </div>
                
                {/* On-Screen D-Pad */}
                <div className="absolute bottom-8 right-8 z-50">
                    <div className="grid grid-cols-3 gap-2 w-48 h-48">
                        <div className="col-start-2">
                            <button 
                                className="w-full h-full bg-gray-800/80 border border-gray-600 rounded-xl flex items-center justify-center active:bg-cyan-600 active:border-cyan-400 transition-colors shadow-lg"
                                onTouchStart={(e) => { e.preventDefault(); setTouchKey('w', true); }} 
                                onTouchEnd={(e) => { e.preventDefault(); setTouchKey('w', false); }}
                                onMouseDown={() => setTouchKey('w', true)} 
                                onMouseUp={() => setTouchKey('w', false)}
                            >
                                <ArrowUp size={32} className="text-white"/>
                            </button>
                        </div>
                        <div className="col-start-1 row-start-2">
                            <button 
                                className="w-full h-full bg-gray-800/80 border border-gray-600 rounded-xl flex items-center justify-center active:bg-cyan-600 active:border-cyan-400 transition-colors shadow-lg"
                                onTouchStart={(e) => { e.preventDefault(); setTouchKey('a', true); }} 
                                onTouchEnd={(e) => { e.preventDefault(); setTouchKey('a', false); }}
                                onMouseDown={() => setTouchKey('a', true)} 
                                onMouseUp={() => setTouchKey('a', false)}
                            >
                                <ArrowLeft size={32} className="text-white"/>
                            </button>
                        </div>
                        <div className="col-start-2 row-start-2 flex items-center justify-center">
                            <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_red]"></div>
                        </div>
                        <div className="col-start-3 row-start-2">
                            <button 
                                className="w-full h-full bg-gray-800/80 border border-gray-600 rounded-xl flex items-center justify-center active:bg-cyan-600 active:border-cyan-400 transition-colors shadow-lg"
                                onTouchStart={(e) => { e.preventDefault(); setTouchKey('d', true); }} 
                                onTouchEnd={(e) => { e.preventDefault(); setTouchKey('d', false); }}
                                onMouseDown={() => setTouchKey('d', true)} 
                                onMouseUp={() => setTouchKey('d', false)}
                            >
                                <ArrowRight size={32} className="text-white"/>
                            </button>
                        </div>
                        <div className="col-start-2 row-start-3">
                            <button 
                                className="w-full h-full bg-gray-800/80 border border-gray-600 rounded-xl flex items-center justify-center active:bg-cyan-600 active:border-cyan-400 transition-colors shadow-lg"
                                onTouchStart={(e) => { e.preventDefault(); setTouchKey('s', true); }} 
                                onTouchEnd={(e) => { e.preventDefault(); setTouchKey('s', false); }}
                                onMouseDown={() => setTouchKey('s', true)} 
                                onMouseUp={() => setTouchKey('s', false)}
                            >
                                <ArrowDown size={32} className="text-white"/>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {phase === 'INJECT' && activeNode && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in zoom-in duration-200">
                <div className="w-full max-w-lg bg-[#0a0a0a] border border-green-500/50 rounded-lg shadow-[0_0_50px_rgba(34,197,94,0.15)] overflow-hidden flex flex-col max-h-[80vh]">
                    <div className="bg-green-900/20 p-3 border-b border-green-900/50 flex items-center justify-between"><div className="flex items-center space-x-3"><div className="w-8 h-8 bg-black border border-green-500/50 flex items-center justify-center"><Database size={16} className="text-green-500"/></div><div><div className="text-[9px] text-green-600 font-bold uppercase">{t('lazarus.memory')}</div><div className="text-green-400 font-mono text-sm font-bold">{activeNode.label}</div></div></div></div>
                    <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                        {!dataRevealed ? (
                            <div className="flex flex-col items-center justify-center h-64 space-y-6 animate-in fade-in"><div className="w-24 h-24 rounded-full border-4 border-red-500 flex items-center justify-center relative bg-black shadow-[0_0_30px_red]"><Lock size={48} className="text-red-500 animate-pulse"/></div><div className="text-center space-y-2"><h3 className="text-xl font-black text-red-500 tracking-widest animate-pulse">{t('lazarus.encrypted')}</h3><p className="text-xs text-gray-500 font-mono">{t('lazarus.bio_key')}</p></div><Button onClick={handleScan} disabled={isScanning} size="lg" className="w-full max-w-xs bg-green-900/30 border border-green-500 text-green-400">{isScanning ? t('lazarus.decrypting') : t('lazarus.scan')}</Button></div>
                        ) : (
                            <div className="animate-in slide-in-from-bottom duration-500 space-y-6"><div className="font-mono text-xs space-y-2 border-l-2 border-red-900/50 pl-3"><div className="text-red-500 font-bold mb-1">{t('lazarus.current_interp')}:</div><p className="text-red-400/80 leading-relaxed">"{activeNode.description}"</p></div><div className="font-mono text-xs space-y-2 border-l-2 border-blue-500/50 pl-3"><div className="text-blue-400 font-bold mb-1 flex items-center"><Eye size={12} className="mr-1"/> {t('lazarus.archaeologist')}:</div><p className="text-blue-300/80 leading-relaxed">{activeNode.truth}</p></div><div><label className="text-[9px] font-bold text-green-600 uppercase mb-2 block flex items-center"><Terminal size={10} className="mr-1"/> {t('lazarus.override')}</label><textarea className="w-full bg-black border border-green-900 rounded p-3 text-green-400 text-sm focus:border-green-500 focus:outline-none resize-none font-mono shadow-inner min-h-[80px]" value={input} onChange={(e) => setInput(e.target.value)} autoFocus /></div></div>
                        )}
                    </div>
                    <div className="bg-black p-4 border-t border-green-900/30 flex space-x-3"><Button variant="ghost" onClick={() => setPhase('DIVE')} className="flex-1 border border-gray-800 text-gray-500 hover:text-white hover:bg-gray-900">{t('lazarus.discard')}</Button>{dataRevealed && (<Button variant="primary" onClick={handleInjection} disabled={isProcessing || !input} className="flex-[2] bg-green-700 hover:bg-green-600 border-green-500 text-white shadow-[0_0_15px_rgba(21,128,61,0.4)]">{isProcessing ? t('lazarus.compiling') : t('lazarus.execute')}</Button>)}</div>
                </div>
            </div>
        )}

        {phase === 'RESULT' && (
            <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-1000">
                <div className="w-32 h-32 border-4 border-green-500 rounded-full flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(34,197,94,0.3)]"><Cpu size={64} className="text-green-500 animate-pulse" /></div>
                <h1 className="text-4xl font-black text-white mb-2 tracking-tight glitch-text">{t('lazarus.restored')}</h1>
                <div className="max-w-md text-sm font-mono text-gray-400 mb-8 space-y-2"><div className="flex justify-between border-b border-gray-800 pb-1"><span>{t('lazarus.core_align')}</span><span className="text-green-400">{Math.round(alignment)}%</span></div></div>
                <Button size="lg" variant="primary" onClick={() => onComplete(100)} className="w-64 bg-white text-black hover:bg-gray-200 font-bold shadow-xl">{t('lazarus.return')}</Button>
            </div>
        )}
    </div>
  );
};
