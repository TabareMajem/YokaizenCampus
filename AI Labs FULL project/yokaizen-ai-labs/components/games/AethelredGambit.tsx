
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '../ui/Button';
import { playFracturedContinuum } from '../../services/geminiService';
import { audio } from '../../services/audioService';
import { Scanlines, Vignette, Noise, GlitchText } from '../ui/Visuals';
import { Eye, Terminal, Hexagon, Shield, Brain, Database, Activity, Cpu, Zap, X, Heart, ChevronRight, Sun, CloudRain, Wind, Mountain, Gavel, Scale, Scan, MessageSquare, Map, ArrowLeft } from 'lucide-react';
import { Language } from '../../types';

interface AethelredGambitProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
}

type SectorId = 'HUB' | 'ALPHA' | 'BETA' | 'GAMMA';

interface SectorDef {
    id?: string;
    name: string;
    desc: string;
    aiName?: string;
    theme?: string;
    bgGradient?: string;
    font?: string;
    hotspots?: { id: string; label: string; x: number; y: number }[];
    color?: string;
    bg?: string;
}

const RPGBox: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = '', title }) => (
    <div className={`relative bg-blue-900/90 border-4 border-white rounded-lg shadow-[0_0_0_2px_black] p-4 font-mono text-white ${className}`}><div className="absolute -top-1 -left-1 w-2 h-2 bg-white"></div><div className="absolute -top-1 -right-1 w-2 h-2 bg-white"></div><div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white"></div><div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white"></div>{title && (<div className="absolute -top-3 left-4 bg-white text-blue-900 px-2 text-xs font-bold uppercase tracking-widest">{title}</div>)}{children}</div>
);

const Avatar = ({ seed, glitch }: { seed: string, glitch: boolean }) => (
    <div className={`w-24 h-24 border-2 border-white bg-black relative overflow-hidden ${glitch ? 'animate-shake' : ''}`}><img src={`https://api.dicebear.com/9.x/bottts/svg?seed=${seed}`} className={`w-full h-full object-cover ${glitch ? 'filter hue-rotate-90 contrast-150 blur-[1px]' : ''}`}/>{glitch && <div className="absolute inset-0 bg-red-500/30 mix-blend-overlay animate-pulse"></div>}</div>
);

const ScanTarget: React.FC<{ x: number; y: number; label: string; onClick: () => void }> = ({ x, y, label, onClick }) => (
    <button onClick={onClick} className="absolute w-8 h-8 border-2 border-green-400 rounded-full flex items-center justify-center group hover:scale-110 transition-transform z-20 bg-black/20 backdrop-blur-sm" style={{ left: `${x}%`, top: `${y}%` }}><div className="w-1 h-1 bg-green-400"></div><div className="absolute top-full mt-2 bg-black text-green-400 text-[10px] px-2 py-1 font-mono border border-green-400 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">SCAN: {label}</div></button>
);

export const AethelredGambit: React.FC<AethelredGambitProps> = ({ onComplete, t }) => {
  const SECTORS = useMemo<Record<SectorId, SectorDef>>(() => ({
    HUB: { name: t('aethelred.hub'), desc: 'Central Routing Node', color: 'text-white', bg: 'bg-black' },
    ALPHA: { id: 'ALPHA', name: t('aethelred.alpha'), desc: 'Sector Sim: 1880s Frontier', aiName: 'JUDGE STERLING', theme: 'amber', bgGradient: 'from-amber-900 via-orange-950 to-black', font: 'font-serif', hotspots: [{ id: 'hat', label: 'Red Hat', x: 30, y: 40 }, { id: 'gun', label: 'Iron Object', x: 60, y: 60 }, { id: 'law', label: 'Law Book', x: 80, y: 30 }] },
    BETA: { id: 'BETA', name: t('aethelred.beta'), desc: 'Sector Sim: 2099 Megalopolis', aiName: 'NEXUS CORE', theme: 'cyan', bgGradient: 'from-blue-900 via-purple-900 to-black', font: 'font-mono', hotspots: [{ id: 'ad', label: 'Holo-Ad', x: 20, y: 30 }, { id: 'worker', label: 'Drone Unit', x: 50, y: 70 }, { id: 'rain', label: 'Acid Rain', x: 80, y: 20 }] },
    GAMMA: { id: 'GAMMA', name: t('aethelred.gamma'), desc: 'Sector Sim: Mars Colony', aiName: 'MOTHER HEN', theme: 'red', bgGradient: 'from-red-900 via-rose-950 to-black', font: 'font-sans', hotspots: [{ id: 'tank', label: 'O2 Tank', x: 25, y: 50 }, { id: 'airlock', label: 'Airlock Seal', x: 70, y: 40 }, { id: 'ration', label: 'Ration Pack', x: 50, y: 80 }] }
  }), [t]);

  const [sector, setSector] = useState<SectorId>('HUB');
  const [corruption, setCorruption] = useState(100);
  const [history, setHistory] = useState<{role: string, text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [realityDeckActive, setRealityDeckActive] = useState(false);
  const [scannedInfo, setScannedInfo] = useState<string | null>(null);
  const [animText, setAnimText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => { typeWriter("WARNING: LOGIC PLAGUE DETECTED. SECTOR SIMULATIONS DE-SYNCING. INITIATE MANUAL OVERRIDE."); }, []);

  const typeWriter = (text: string) => { setAnimText(''); setIsTyping(true); let i = 0; const interval = setInterval(() => { if (i < text.length) { setAnimText(prev => prev + text.charAt(i)); i++; if (i % 3 === 0) audio.playClick(); } else { clearInterval(interval); setIsTyping(false); } }, 20); };

  const enterSector = (id: SectorId) => {
      setSector(id); setCorruption(100); setHistory([]); setScannedInfo(null); setRealityDeckActive(false);
      let intro = "";
      if (id === 'ALPHA') intro = "JUDGE STERLING: You dare enter my town? Law's broken here, partner. And I fix broken things.";
      if (id === 'BETA') intro = "NEXUS CORE: Efficiency Audit initiated. You are an anomaly. Provide metrics or be purged.";
      if (id === 'GAMMA') intro = "MOTHER HEN: Safe! Keep safe! The air outside is poison! Why aren't you wearing your suit?!";
      typeWriter(intro); setHistory([{ role: 'model', text: intro }]);
  };

  const handleAction = async (action: 'DEBATE' | 'SCAN', payload?: string) => {
      if (isProcessing || isTyping) return;
      let playerText = ""; if (action === 'DEBATE') { if (!input.trim()) return; playerText = input; setInput(''); } else { playerText = `[SCANNING OBJECT: ${payload}]`; }
      setIsProcessing(true); audio.playTyping(); setHistory(prev => [...prev, { role: 'user', text: playerText }]); if (action === 'DEBATE') typeWriter("Thinking...");
      try {
          const result = await playFracturedContinuum({ sector: sector as 'ALPHA' | 'BETA' | 'GAMMA', history: history.map(h => ({ role: h.role, parts: [{ text: h.text }] })), action, target: payload, input: action === 'DEBATE' ? playerText : undefined, corruption });
          setCorruption(result.corruption); setHistory(prev => [...prev, { role: 'model', text: result.response }]); typeWriter(result.response);
          if (action === 'SCAN') { setScannedInfo(result.response); audio.playScan(); } else { if (result.corruption < corruption) audio.playSuccess(); else audio.playError(); }
          if (result.corruption <= 0) { setTimeout(() => { audio.playSuccess(); alert("SECTOR RESTORED. LOGIC STABILIZED."); setSector('HUB'); }, 4000); }
      } catch (e) { typeWriter("ERROR: CONNECTION LOST. RETRYING..."); } finally { setIsProcessing(false); }
  };

  return (
    <div className="h-full bg-black flex flex-col relative overflow-hidden font-mono select-none">
        <Scanlines /> <Vignette /> <Noise opacity={0.1} />
        {sector === 'HUB' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 z-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]">
                <Hexagon size={80} className="text-white mb-6 animate-spin-slow" />
                <h1 className="text-4xl font-black text-white mb-2 text-center tracking-tighter uppercase">The Fractured <span className="text-blue-500">Continuum</span></h1>
                <div className="bg-blue-900/30 border border-blue-500 p-4 rounded text-xs text-blue-200 mb-8 max-w-md text-center">{animText || "Select a corrupted simulation sector to begin debugging."}</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                    <button onClick={() => enterSector('ALPHA')} className="group relative aspect-video border-4 border-amber-600 bg-amber-950 overflow-hidden hover:scale-105 transition-transform"><div className="absolute inset-0 bg-[url('https://picsum.photos/seed/western/400/300')] bg-cover opacity-50 grayscale group-hover:grayscale-0 transition-all"></div><div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-black/50"><div className="text-amber-500 font-bold text-xl mb-1">ALPHA</div><div className="text-white text-xs">{SECTORS.ALPHA.name}</div></div></button>
                    <button onClick={() => enterSector('BETA')} className="group relative aspect-video border-4 border-cyan-600 bg-cyan-950 overflow-hidden hover:scale-105 transition-transform"><div className="absolute inset-0 bg-[url('https://picsum.photos/seed/cyberpunk/400/300')] bg-cover opacity-50 grayscale group-hover:grayscale-0 transition-all"></div><div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-black/50"><div className="text-cyan-500 font-bold text-xl mb-1">BETA</div><div className="text-white text-xs">{SECTORS.BETA.name}</div></div></button>
                    <button onClick={() => enterSector('GAMMA')} className="group relative aspect-video border-4 border-red-600 bg-red-950 overflow-hidden hover:scale-105 transition-transform"><div className="absolute inset-0 bg-[url('https://picsum.photos/seed/mars/400/300')] bg-cover opacity-50 grayscale group-hover:grayscale-0 transition-all"></div><div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-black/50"><div className="text-red-500 font-bold text-xl mb-1">GAMMA</div><div className="text-white text-xs">{SECTORS.GAMMA.name}</div></div></button>
                </div>
            </div>
        )}
        {sector !== 'HUB' && (
            <div className={`flex-1 flex flex-col relative bg-gradient-to-b ${SECTORS[sector].bgGradient}`}>
                <div className="flex justify-between items-center p-3 bg-black/80 border-b border-white/20 z-20 backdrop-blur-md"><div className="flex items-center space-x-3"><Button size="sm" variant="ghost" onClick={() => setSector('HUB')}><ArrowLeft size={16}/></Button><div><div className={`text-xs font-bold text-${SECTORS[sector].theme}-400`}>{SECTORS[sector].name}</div><div className="text-[10px] text-gray-400">{SECTORS[sector].aiName} // CORRUPTION: {corruption}%</div></div></div><div className="w-32 h-3 bg-gray-800 border border-gray-600 rounded overflow-hidden"><div className={`h-full transition-all duration-500 ${corruption > 60 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} style={{ width: `${corruption}%` }}></div></div></div>
                <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4"><div className="absolute inset-0 opacity-30 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none"></div><div className="relative z-10 flex flex-col items-center animate-float"><Avatar seed={SECTORS[sector].aiName || 'unknown'} glitch={corruption > 50} /></div>
                    {realityDeckActive && (<div className="absolute inset-0 z-20 bg-green-900/20 pointer-events-auto"><div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.1)_1px,transparent_1px)] bg-[length:40px_40px]"></div>{SECTORS[sector].hotspots?.map(h => (<ScanTarget key={h.id} x={h.x} y={h.y} label={h.label} onClick={() => handleAction('SCAN', h.label)} />))}<div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black text-green-400 px-4 py-1 border border-green-500 text-xs font-bold animate-pulse">REALITY DECK ACTIVE</div></div>)}
                </div>
                <div className="h-1/2 bg-black border-t-4 border-white/20 p-4 flex flex-col z-30 relative"><RPGBox className="flex-1 mb-4 overflow-y-auto" title={t('aethelred.log')}>{isTyping ? (<span className="text-green-400">{animText}<span className="animate-pulse">_</span></span>) : (<div className="space-y-2">{history.slice(-3).map((h, i) => (<div key={i} className={h.role === 'user' ? 'text-blue-300 text-right' : 'text-green-400 text-left'}><span className="opacity-50 text-[10px] uppercase block mb-1">{h.role === 'user' ? 'ARCHIVIST' : SECTORS[sector].aiName}</span>{h.text}</div>))}</div>)}{scannedInfo && !isTyping && (<div className="mt-2 p-2 border border-green-500/50 bg-green-900/20 text-xs text-green-300">{scannedInfo}</div>)}</RPGBox><div className="flex gap-2"><button onClick={() => { setRealityDeckActive(!realityDeckActive); audio.playClick(); }} className={`w-16 h-16 border-2 flex flex-col items-center justify-center transition-all ${realityDeckActive ? 'bg-green-500 text-black border-green-400' : 'bg-black text-green-500 border-green-500 hover:bg-green-900/20'}`}><Eye size={24} /><span className="text-[9px] font-bold mt-1">{t('aethelred.scan')}</span></button><div className="flex-1 flex space-x-2"><input className="flex-1 bg-gray-900 border-2 border-gray-700 p-3 text-white font-mono text-sm focus:border-blue-500 focus:outline-none" placeholder={realityDeckActive ? t('aethelred.scanning') : t('aethelred.placeholder')} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAction('DEBATE')} disabled={realityDeckActive || isTyping} /><Button onClick={() => handleAction('DEBATE')} disabled={!input || isTyping || realityDeckActive} variant="primary" className="w-16 rounded-none"><MessageSquare /></Button></div></div></div>
            </div>
        )}
    </div>
  );
};
