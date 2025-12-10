
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { analyzeVeritasEvidence } from '../../services/geminiService';
import { audio } from '../../services/audioService';
import { Eye, Search, MapPin, Fingerprint, ShieldAlert, FileText, Video, UserCheck, ArrowLeft, Scan } from 'lucide-react';
import { Scanlines, Vignette, Noise } from '../ui/Visuals';
import { Language } from '../../types';

interface VeritasFallsProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
}

type Phase = 'BRIEFING' | 'SCENE' | 'ANALYSIS' | 'RESULT';

interface Evidence {
    id: string;
    name: string;
    icon: React.ReactNode;
    description: string;
    isFake: boolean;
    found: boolean;
}

export const VeritasFalls: React.FC<VeritasFallsProps> = ({ onComplete, t }) => {
  const [phase, setPhase] = useState<Phase>('BRIEFING');
  const [auraActive, setAuraActive] = useState(false);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [accusation, setAccusation] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{correct: boolean, feedback: string} | null>(null);

  useEffect(() => {
      setEvidence([
          { id: 'video', name: t('veritas.e_video'), icon: <Video size={16}/>, description: 'MP4 showing you taking a bribe. Timestamp: 03:00 AM.', isFake: true, found: false },
          { id: 'receipt', name: t('veritas.e_receipt'), icon: <FileText size={16}/>, description: 'Receipt from "Midnight Brew" at 03:05 AM. Across town.', isFake: false, found: false },
          { id: 'fiber', name: t('veritas.e_fiber'), icon: <Fingerprint size={16}/>, description: 'Found at scene. Matches police uniform issue.', isFake: false, found: false },
          { id: 'meta', name: t('veritas.e_meta'), icon: <ShieldAlert size={16}/>, description: 'Edit logs found in cloud trash.', isFake: true, found: false }
      ]);
  }, [t]);

  const toggleAura = () => { setAuraActive(!auraActive); if (!auraActive) audio.playScan(); };
  const handleFind = (id: string) => { if (evidence.find(e => e.id === id)?.found) return; setEvidence(prev => prev.map(e => e.id === id ? { ...e, found: true } : e)); audio.playSuccess(); };

  const handleSubmit = async () => {
      if (!accusation.trim()) return;
      setProcessing(true);
      const foundEvidence = evidence.filter(e => e.found).map(e => e.name);
      const analysis = await analyzeVeritasEvidence(foundEvidence, accusation);
      setResult(analysis); setPhase('RESULT'); setProcessing(false);
      if (analysis.correct) { audio.playSuccess(); setTimeout(() => onComplete(analysis.score), 3000); } else { audio.playError(); }
  };

  return (
    <div className="h-full flex flex-col bg-black relative overflow-hidden font-mono select-none">
        <div className="absolute inset-0 pointer-events-none z-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-fall"></div>
        <Scanlines /> <Vignette color="#000510" /> <Noise opacity={0.1} />
        {auraActive && (<div className="absolute inset-0 pointer-events-none z-10 border-[20px] border-cyan-500/20 mix-blend-screen animate-pulse"><div className="absolute top-4 right-4 text-cyan-500 font-bold text-xs tracking-widest flex items-center"><Eye size={16} className="mr-2 animate-spin-slow"/> {t('veritas.aura')}</div></div>)}

        {phase === 'BRIEFING' && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-8 text-center bg-black/90">
                <ShieldAlert size={64} className="text-red-500 mb-6 animate-pulse" />
                <h1 className="text-4xl font-black text-white mb-2 tracking-tighter glitch-text">VERITAS FALLS</h1>
                <div className="max-w-md text-gray-400 text-sm mb-8 space-y-4 border-l-2 border-red-500 pl-4 text-left">
                    <p>{t('veritas.briefing_1')}</p><p>{t('veritas.briefing_2')}</p><p>{t('veritas.briefing_3')}</p>
                </div>
                <Button size="lg" variant="primary" onClick={() => setPhase('SCENE')}>{t('veritas.start')}</Button>
            </div>
        )}

        {phase === 'SCENE' && (
            <div className="flex-1 relative bg-gray-900 overflow-hidden">
                <div className={`absolute inset-0 bg-[url('https://picsum.photos/seed/noir/800/600')] bg-cover bg-center transition-all duration-500 ${auraActive ? 'grayscale invert contrast-125' : 'opacity-60'}`}></div>
                <button onClick={() => handleFind('video')} className={`absolute top-[20%] left-[20%] w-24 h-16 border-2 border-dashed border-red-500 bg-black/50 text-red-500 text-xs flex items-center justify-center ${auraActive ? 'opacity-100' : 'opacity-0'} transition-opacity`}>{t('veritas.fake_id')}</button>
                <button onClick={() => handleFind('receipt')} className="absolute bottom-[20%] right-[30%] w-8 h-8 bg-white/10 rounded-full animate-ping"></button>
                <button onClick={() => handleFind('meta')} className={`absolute top-[50%] right-[10%] w-16 h-16 border border-cyan-500 flex items-center justify-center ${auraActive ? 'opacity-100' : 'opacity-0'} transition-opacity`}><Scan size={24} className="text-cyan-500 animate-spin"/></button>
                <div className="absolute bottom-8 right-8 z-30"><button className={`w-16 h-16 rounded-full border-4 flex items-center justify-center shadow-[0_0_30px_rgba(0,255,255,0.3)] transition-all active:scale-95 ${auraActive ? 'bg-cyan-500 border-white text-black' : 'bg-black/50 border-cyan-500 text-cyan-500'}`} onMouseDown={toggleAura} onMouseUp={toggleAura} onTouchStart={toggleAura} onTouchEnd={toggleAura}><Eye size={32} /></button></div>
                <div className="absolute top-4 left-4 z-30"><div className="bg-black/80 border border-gray-700 px-3 py-1 rounded text-xs text-gray-300">{t('veritas.evidence_count')}: {evidence.filter(e => e.found).length}/{evidence.length}</div></div>
                <div className="absolute bottom-8 left-8 z-30"><Button size="sm" variant="secondary" onClick={() => setPhase('ANALYSIS')} disabled={evidence.filter(e => e.found).length < 2}>{t('veritas.analyze')}</Button></div>
            </div>
        )}

        {phase === 'ANALYSIS' && (
            <div className="flex-1 bg-gray-900 p-4 flex flex-col z-30">
                <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-white">{t('veritas.case_board')}</h2><button onClick={() => setPhase('SCENE')} className="text-gray-400"><ArrowLeft/></button></div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                    {evidence.filter(e => e.found).map(e => (
                        <div key={e.id} className="bg-black/50 border border-gray-700 p-3 rounded flex items-start space-x-3"><div className="text-cyan-500 mt-1">{e.icon}</div><div><div className="text-sm font-bold text-white">{e.name}</div><div className="text-[10px] text-gray-400 leading-tight">{e.description}</div>{e.isFake && <div className="text-[9px] text-red-500 font-bold mt-1 uppercase">{t('veritas.detected_fake')}</div>}</div></div>
                    ))}
                </div>
                <div className="mt-auto space-y-3"><label className="text-xs text-gray-500 font-bold uppercase">{t('veritas.accusation')}</label><textarea className="w-full bg-black border border-gray-700 rounded p-3 text-white text-sm focus:border-red-500 focus:outline-none h-24 resize-none font-sans" placeholder={t('veritas.placeholder')} value={accusation} onChange={e => setAccusation(e.target.value)} /><Button fullWidth variant="danger" onClick={handleSubmit} disabled={processing}>{processing ? t('veritas.cross_ref') : t('veritas.submit')}</Button></div>
            </div>
        )}

        {phase === 'RESULT' && result && (
            <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in">
                <div className="mb-6">{result.correct ? <UserCheck size={80} className="text-green-500 animate-bounce"/> : <ShieldAlert size={80} className="text-red-500 animate-shake"/>}</div>
                <h2 className={`text-3xl font-black mb-4 ${result.correct ? 'text-green-500' : 'text-red-500'}`}>{result.correct ? t('veritas.solved') : t('veritas.alert')}</h2>
                <p className="text-gray-300 mb-8 text-sm leading-relaxed border border-gray-800 p-4 rounded bg-gray-900">{result.feedback}</p>
                <Button variant="primary" onClick={() => result.correct ? onComplete(100) : setPhase('SCENE')}>{result.correct ? t('veritas.close') : t('veritas.reopen')}</Button>
            </div>
        )}
    </div>
  );
};
