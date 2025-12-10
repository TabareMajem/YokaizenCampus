
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { interrogateAndroid } from '../../services/geminiService';
import { audio } from '../../services/audioService';
import { Eye, Activity, Search, Fingerprint, ShieldAlert, MessageSquare, User, Mic, AlertTriangle, Terminal } from 'lucide-react';
import { Scanlines, Vignette, Noise } from '../ui/Visuals';
import { Language } from '../../types';

interface VoightKampffProtocolProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
}

interface Suspect {
    id: string;
    name: string;
    model: string;
    isGuilty: boolean;
    avatarSeed: string;
    stress: number; // 0-100
}

export const VoightKampffProtocol: React.FC<VoightKampffProtocolProps> = ({ onComplete, t }) => {
  const [phase, setPhase] = useState<'BRIEFING' | 'SCENE' | 'INTERROGATION' | 'RESULT'>('BRIEFING');
  const [suspects, setSuspects] = useState<Suspect[]>([]);
  const [currentSuspectIndex, setCurrentSuspectIndex] = useState(0);
  const [evidence, setEvidence] = useState<string[]>([]);
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [biometrics, setBiometrics] = useState({ latency: 120, stress: 20, pupils: 'NORMAL' });
  const [glitchEffect, setGlitchEffect] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      setSuspects([
          { id: 's1', name: 'Unit 734 (Atlas)', model: 'Labor-Class', isGuilty: false, avatarSeed: 'robot1', stress: 10 },
          { id: 's2', name: 'Unit 892 (Echo)', model: 'Social-Class', isGuilty: true, avatarSeed: 'robot2', stress: 30 },
          { id: 's3', name: 'Unit 101 (Prime)', model: 'Logic-Class', isGuilty: false, avatarSeed: 'robot3', stress: 5 }
      ]);
  }, []);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (phase === 'SCENE' || phase === 'INTERROGATION') audio.startAmbience('CYBER'); else audio.stopAmbience(); return () => audio.stopAmbience(); }, [phase]);

  const handleFindEvidence = (item: string) => { if (!evidence.includes(item)) { setEvidence(prev => [...prev, item]); audio.playScan(); } };
  const startInterrogation = (index: number) => { setCurrentSuspectIndex(index); setMessages([{ role: 'model', content: "State your query. I am required to answer." }]); setPhase('INTERROGATION'); setBiometrics({ latency: 100, stress: 20, pupils: 'NORMAL' }); };

  const handleSend = async () => {
      if (!input.trim()) return;
      const userMsg = input; setInput(''); setMessages(prev => [...prev, { role: 'user', content: userMsg }]); setIsLoading(true); audio.playTyping();
      const suspect = suspects[currentSuspectIndex];
      const result = await interrogateAndroid({ name: suspect.name, model: suspect.model, isGuilty: suspect.isGuilty }, evidence, userMsg);
      setIsLoading(false); setMessages(prev => [...prev, { role: 'model', content: result.response }]);
      setBiometrics({ latency: result.tells.latency, stress: result.tells.stress, pupils: result.tells.pupils as any });
      if (result.tells.stress > 60 || result.tells.latency > 500) { setGlitchEffect(true); audio.playError(); setTimeout(() => setGlitchEffect(false), 500); }
  };

  const handleAccuse = () => {
      const suspect = suspects[currentSuspectIndex];
      if (suspect.isGuilty) { audio.playSuccess(); setPhase('RESULT'); } 
      else { audio.playError(); alert("INCORRECT TARGET. The suspect has been released."); setPhase('SCENE'); }
  };

  return (
    <div className="h-full flex flex-col bg-black font-mono relative overflow-hidden select-none text-green-500">
        <Scanlines />
        <Vignette color="#051005" />
        <Noise opacity={0.1} />

        {phase === 'BRIEFING' && (
            <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-1000">
                <Fingerprint size={80} className="text-green-500 mb-6 animate-pulse" />
                <h1 className="text-4xl font-black text-white mb-4 tracking-tighter glitch-text">VOIGHT-KAMPFF</h1>
                <div className="max-w-md text-green-400 text-sm space-y-4 font-bold leading-relaxed border border-green-900 p-6 bg-green-900/10 rounded-xl">
                    <p>{t('voight.subject')}</p>
                    <p>{t('voight.victim')}</p>
                    <p>{t('voight.suspects')}</p>
                    <p className="text-white">{t('voight.mission')}</p>
                </div>
                <div className="mt-8">
                    <Button size="lg" variant="primary" onClick={() => setPhase('SCENE')} className="bg-green-700 hover:bg-green-600 border-green-500">{t('voight.enter')}</Button>
                </div>
            </div>
        )}

        {phase === 'SCENE' && (
            <div className="flex-1 relative bg-gray-900">
                <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/cyberpunkroom/800/600')] bg-cover bg-center opacity-40"></div>
                <button onClick={() => handleFindEvidence('Data Pad')} className={`absolute top-[60%] left-[20%] w-16 h-16 border-2 border-green-500 rounded-full flex items-center justify-center animate-ping ${evidence.includes('Data Pad') ? 'hidden' : ''}`}><Search size={24} className="text-green-500" /></button>
                <button onClick={() => handleFindEvidence('Bloody Oil Rag')} className={`absolute top-[40%] right-[30%] w-12 h-12 border-2 border-red-500 rounded-full flex items-center justify-center animate-pulse ${evidence.includes('Bloody Oil Rag') ? 'hidden' : ''}`}><AlertTriangle size={20} className="text-red-500" /></button>
                <div className="absolute top-0 left-0 w-full p-4 bg-black/80 border-b border-green-900/50 backdrop-blur-sm z-10">
                    <div className="flex justify-between items-center"><div className="text-xs text-green-500 font-bold">{t('voight.evidence_locker')}</div><div className="text-xs text-green-300">{evidence.length}/2 FOUND</div></div>
                    <div className="flex space-x-2 mt-2">{evidence.map(e => (<span key={e} className="bg-green-900/30 border border-green-500/50 text-[10px] px-2 py-1 rounded text-green-100">{e}</span>))}</div>
                </div>
                <div className="absolute bottom-0 w-full bg-black/90 border-t border-green-900/50 p-4 z-20">
                    <div className="text-xs text-green-500 font-bold mb-2 text-center">{t('voight.select_subject')}</div>
                    <div className="flex justify-center space-x-4">
                        {suspects.map((s, i) => (<button key={s.id} onClick={() => startInterrogation(i)} className="flex flex-col items-center group"><div className="w-16 h-16 bg-gray-800 rounded-lg border border-green-900 group-hover:border-green-500 flex items-center justify-center overflow-hidden mb-1"><img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${s.avatarSeed}`} className="w-full h-full opacity-80 grayscale group-hover:grayscale-0" /></div><span className="text-[10px] text-gray-500 group-hover:text-green-400">{s.name}</span></button>))}
                    </div>
                </div>
            </div>
        )}

        {phase === 'INTERROGATION' && (
            <div className="flex-1 flex flex-col relative">
                <div className="h-1/3 bg-gray-900 relative border-b border-green-900/50 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,20,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none z-10 opacity-50"></div>
                    <div className={`w-40 h-40 relative transition-transform duration-100 ${glitchEffect ? 'translate-x-2 skew-x-12 filter hue-rotate-90' : ''}`}>
                        <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${suspects[currentSuspectIndex].avatarSeed}`} className="w-full h-full drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]"/>
                        {biometrics.pupils === 'DILATED' && <div className="absolute top-[35%] left-[20%] w-[60%] h-[10%] flex justify-between px-2"><div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div><div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div></div>}
                    </div>
                    <div className="absolute top-4 right-4 text-right font-mono text-[10px] text-green-500 space-y-1 bg-black/60 p-2 rounded border border-green-900">
                        <div className="flex items-center justify-end"><span className="mr-2 text-gray-400">{t('voight.latency')}</span><span className={biometrics.latency > 400 ? 'text-red-500 font-bold blink' : 'text-green-400'}>{biometrics.latency}ms</span></div>
                        <div className="flex items-center justify-end"><span className="mr-2 text-gray-400">{t('voight.stress')}</span><div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className={`h-full transition-all duration-300 ${biometrics.stress > 50 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${biometrics.stress}%` }}></div></div></div>
                        <div className="flex items-center justify-end"><span className="mr-2 text-gray-400">{t('voight.pupils')}</span><span className={biometrics.pupils === 'DILATED' ? 'text-red-500 font-bold' : 'text-green-400'}>{biometrics.pupils}</span></div>
                    </div>
                    <button onClick={() => setPhase('SCENE')} className="absolute top-4 left-4 text-xs text-green-700 hover:text-green-400 border border-green-900 px-2 py-1 rounded">← BACK</button>
                </div>
                <div className="flex-1 bg-black flex flex-col p-4 overflow-hidden">
                    <div className="flex-1 overflow-y-auto space-y-3 mb-4 scrollbar-hide">
                        {messages.map((m, i) => (<div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-1`}><div className={`max-w-[85%] p-3 rounded text-xs font-bold shadow-sm border ${m.role === 'user' ? 'bg-green-900/20 border-green-500/50 text-green-100 text-right' : 'bg-gray-900 border-gray-700 text-gray-300 font-mono'}`}>{m.content}</div></div>))}
                        {isLoading && <div className="text-xs text-green-700 animate-pulse ml-2">{t('voight.analyzing')}</div>}
                        <div ref={scrollRef} />
                    </div>
                    <div className="flex space-x-2 mb-2">
                        <input className="flex-1 bg-gray-900 border border-green-900 rounded-none px-4 py-3 text-green-400 focus:border-green-500 focus:outline-none font-mono text-xs placeholder-green-900" placeholder="Ask a question..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} autoFocus />
                        <Button variant="secondary" className="border-green-700 text-green-500 rounded-none" onClick={handleSend} disabled={isLoading}><Terminal size={16} /></Button>
                    </div>
                    <Button fullWidth variant="danger" onClick={handleAccuse} className="rounded-none border-2 border-red-900 bg-red-950/50 text-red-500 hover:bg-red-900 hover:text-white shadow-[0_0_15px_rgba(220,38,38,0.3)] font-black tracking-widest">{t('voight.retire')}</Button>
                </div>
            </div>
        )}

        {phase === 'RESULT' && (
            <div className="absolute inset-0 z-50 bg-green-950/90 flex flex-col items-center justify-center animate-in zoom-in duration-500 text-center p-8">
                <ShieldAlert size={80} className="text-white mb-4 animate-bounce" />
                <h2 className="text-4xl font-black text-white mb-2">{t('voight.case_closed')}</h2>
                <Button variant="primary" onClick={() => onComplete(100)} className="bg-white text-green-900 hover:bg-gray-200 font-black">{t('voight.report')}</Button>
            </div>
        )}
    </div>
  );
};
