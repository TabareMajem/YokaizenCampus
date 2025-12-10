
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { analyzeCaseDeduction } from '../../services/geminiService';
import { Search, Box, ArrowLeft, CheckCircle2, Fingerprint } from 'lucide-react';
import { Language } from '../../types';

interface NeuralNoirProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
}

export const NeuralNoir: React.FC<NeuralNoirProps> = ({ onComplete, t }) => {
  const [mode, setMode] = useState<'SCENE' | 'INSPECT' | 'DEDUCTION'>('SCENE');
  const [evidenceFound, setEvidenceFound] = useState<string[]>([]);
  const [inspectedCore, setInspectedCore] = useState(false);
  const [deduction, setDeduction] = useState({ suspect: '', weapon: '', motive: '' });
  const [feedback, setFeedback] = useState('');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // 3D Rotation State
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // --- Parallax & Flashlight Logic ---
  const updateCursor = (clientX: number, clientY: number, currentTarget: EventTarget & HTMLDivElement) => {
    const { width, height, left, top } = currentTarget.getBoundingClientRect();
    // Calculate normalized -1 to 1 relative to the container
    const x = ((clientX - left) / width) * 2 - 1;
    const y = ((clientY - top) / height) * 2 - 1;
    setMousePos({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    updateCursor(e.clientX, e.clientY, e.currentTarget);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches[0]) {
        updateCursor(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget);
    }
  };

  // --- 3D Rotation Logic (Mouse) ---
  const handleMouseDown = (e: React.MouseEvent) => {
      isDragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
  };
  const handleRotate = (e: React.MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      setRotation(prev => ({ x: prev.x - dy * 0.5, y: prev.y + dx * 0.5 }));
      lastMouse.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseUp = () => isDragging.current = false;

  // --- 3D Rotation Logic (Touch) ---
  const handleTouchStart = (e: React.TouchEvent) => {
      if (e.touches[0]) {
        isDragging.current = true;
        lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
  };
  const handleTouchRotate = (e: React.TouchEvent) => {
      if (!isDragging.current || !e.touches[0]) return;
      const dx = e.touches[0].clientX - lastMouse.current.x;
      const dy = e.touches[0].clientY - lastMouse.current.y;
      setRotation(prev => ({ x: prev.x - dy * 0.5, y: prev.y + dx * 0.5 }));
      lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const findEvidence = (id: string) => {
      if (!evidenceFound.includes(id)) {
          setEvidenceFound(prev => [...prev, id]);
      }
  };

  const handleSubmitDeduction = async () => {
      const conclusion = `${deduction.suspect} used ${deduction.weapon} because ${deduction.motive}`;
      const analysis = await analyzeCaseDeduction(evidenceFound, conclusion);
      setFeedback(analysis);
      if (analysis.toLowerCase().includes("excellent") || analysis.toLowerCase().includes("congratulate")) {
          setTimeout(() => onComplete(100), 3000);
      }
  };

  return (
    <div className="h-full bg-black relative overflow-hidden font-sans select-none touch-none">
        
        {/* --- MODE: SCENE EXPLORATION --- */}
        {mode === 'SCENE' && (
            <div 
                className="absolute inset-0 overflow-hidden cursor-crosshair touch-none" 
                style={{ touchAction: 'none' }}
                onMouseMove={handleMouseMove}
                onTouchMove={handleTouchMove}
            >
                {/* Background Layer (Slow) */}
                <div 
                    className="absolute inset-[-50px] bg-cover bg-center opacity-50 blur-sm"
                    style={{ 
                        backgroundImage: "url('https://picsum.photos/seed/cybercity/600/1000')",
                        transform: `translate(${mousePos.x * -10}px, ${mousePos.y * -10}px)`
                    }}
                />
                
                {/* Midground (Desk) */}
                <div 
                    className="absolute bottom-0 left-0 right-0 h-[85%] bg-cover bg-bottom transition-transform duration-75 ease-out"
                    style={{ 
                        backgroundImage: "url('https://picsum.photos/seed/desknoir/800/800')",
                        transform: `translate(${mousePos.x * -20}px, ${mousePos.y * -5}px) scale(1.1)`
                    }}
                >
                    {/* Hidden Evidence Clickables */}
                    <div 
                        className="absolute top-[40%] left-[30%] w-20 h-20 cursor-pointer group"
                        onClick={() => { findEvidence('CORE'); setMode('INSPECT'); }}
                        onTouchStart={() => { findEvidence('CORE'); setMode('INSPECT'); }}
                    >
                        <div className={`w-full h-full border-2 border-cyan rounded-full animate-ping opacity-0 group-hover:opacity-100 ${evidenceFound.includes('CORE') ? 'hidden' : ''}`}></div>
                        <div className="w-full h-full flex items-center justify-center">
                             <Box className={`text-cyan drop-shadow-[0_0_10px_#00FFFF] ${evidenceFound.includes('CORE') ? 'opacity-50' : 'animate-pulse'}`} size={32} />
                        </div>
                    </div>

                    <div 
                        className="absolute top-[60%] right-[20%] w-24 h-16 cursor-pointer group"
                        onClick={() => findEvidence('FILE')}
                        onTouchStart={() => findEvidence('FILE')}
                    >
                        <div className="absolute -top-4 left-0 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            {t('noir.suspect')}: Alex
                        </div>
                        <div className="w-full h-full border border-white/20 bg-white/5 skew-x-12"></div>
                    </div>
                </div>

                {/* Foreground (Rain/Overlay) */}
                <div className="absolute inset-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                
                {/* Flashlight Effect */}
                <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: `radial-gradient(circle 150px at ${(mousePos.x + 1) * 50}% ${(mousePos.y + 1) * 50}%, transparent 0%, rgba(0,0,0,0.85) 100%)`
                    }}
                ></div>

                {/* HUD */}
                <div className="absolute top-4 left-4 pointer-events-auto z-20">
                    <Button variant="secondary" onClick={() => setMode('DEDUCTION')}>
                        <Fingerprint className="mr-2" size={16}/> {t('noir.mind_palace')}
                    </Button>
                </div>
                <div className="absolute bottom-4 left-4 text-cyan font-mono text-sm z-20">
                    {t('noir.evidence')}: {evidenceFound.length}/3
                </div>
            </div>
        )}

        {/* --- MODE: 3D INSPECTION --- */}
        {mode === 'INSPECT' && (
            <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center touch-none">
                <div className="absolute top-4 left-4 z-10">
                    <Button variant="ghost" onClick={() => setMode('SCENE')}>
                        <ArrowLeft className="mr-2" size={16}/> {t('noir.back_scene')}
                    </Button>
                </div>

                <div className="text-white mb-8 font-mono text-sm opacity-70">{t('noir.drag_rotate')}</div>

                {/* 3D Viewport */}
                <div 
                    className="w-3/4 aspect-square max-w-sm relative cursor-move"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleRotate}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchRotate}
                    onTouchEnd={handleMouseUp}
                    style={{ perspective: '1000px' }}
                >
                    <div 
                        className="w-full h-full relative transition-transform duration-75 ease-linear transform-style-3d"
                        style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}
                    >
                        {/* Cube Faces */}
                        <div className="absolute inset-0 bg-gray-800 border-2 border-cyan/50 opacity-90 translate-z-16 flex items-center justify-center text-cyan font-bold text-4xl" style={{ transform: 'translateZ(8rem)' }}>
                             <Box size={48} />
                        </div>
                        <div className="absolute inset-0 bg-gray-800 border-2 border-cyan/50 opacity-90 flex items-center justify-center transform rotate-y-180" style={{ transform: 'rotateY(180deg) translateZ(8rem)' }}>
                             <div className="text-xs font-mono text-green-400 p-4 border border-green-500/30 rounded bg-black pointer-events-none select-none">
                                 <div>SERIAL: 894-X</div>
                                 <div>TIMESTAMP: 22:00</div>
                                 <div>STATUS: CORRUPTED</div>
                             </div>
                        </div>
                        <div className="absolute inset-0 bg-gray-700 border border-cyan/30 opacity-90 transform rotate-y-90" style={{ transform: 'rotateY(90deg) translateZ(8rem)' }}></div>
                        <div className="absolute inset-0 bg-gray-700 border border-cyan/30 opacity-90 transform rotate-y-270" style={{ transform: 'rotateY(-90deg) translateZ(8rem)' }}></div>
                        <div className="absolute inset-0 bg-gray-600 border border-cyan/30 opacity-90 transform rotate-x-90" style={{ transform: 'rotateX(90deg) translateZ(8rem)' }}></div>
                        <div className="absolute inset-0 bg-gray-600 border border-cyan/30 opacity-90 transform rotate-x-270" style={{ transform: 'rotateX(-90deg) translateZ(8rem)' }}></div>
                    </div>
                </div>

                <div className="mt-12">
                    <Button variant="primary" onClick={() => { setInspectedCore(true); findEvidence('TIMESTAMP'); setMode('SCENE'); }}>
                        <Search className="mr-2" size={16}/> {t('noir.log_data')}
                    </Button>
                </div>
            </div>
        )}

        {/* --- MODE: DEDUCTION BOARD --- */}
        {mode === 'DEDUCTION' && (
            <div className="absolute inset-0 bg-black/95 p-6 flex flex-col">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">{t('noir.mind_palace')}</h2>
                    <Button variant="ghost" onClick={() => setMode('SCENE')}>
                        <ArrowLeft className="mr-2" size={16}/> {t('ui.exit')}
                    </Button>
                 </div>

                 <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                     {/* Slot Machine Style Inputs */}
                     <div className="w-full bg-white/5 p-4 rounded-xl border border-white/10">
                         <div className="text-xs text-gray-500 uppercase mb-2">{t('noir.suspect')}</div>
                         <div className="flex space-x-2">
                             {['Alex', 'Sarah', 'System'].map(opt => (
                                 <button 
                                    key={opt}
                                    onClick={() => setDeduction(p => ({...p, suspect: opt}))}
                                    className={`flex-1 py-2 rounded border ${deduction.suspect === opt ? 'bg-cyan/20 border-cyan text-cyan' : 'border-gray-700 text-gray-500'}`}
                                 >
                                     {opt}
                                 </button>
                             ))}
                         </div>
                     </div>

                     <div className="w-full bg-white/5 p-4 rounded-xl border border-white/10">
                         <div className="text-xs text-gray-500 uppercase mb-2">{t('noir.weapon')}</div>
                         <div className="flex space-x-2">
                             {['Knife', 'Code', 'Core'].map(opt => (
                                 <button 
                                    key={opt}
                                    onClick={() => setDeduction(p => ({...p, weapon: opt}))}
                                    className={`flex-1 py-2 rounded border ${deduction.weapon === opt ? 'bg-cyan/20 border-cyan text-cyan' : 'border-gray-700 text-gray-500'}`}
                                 >
                                     {opt}
                                 </button>
                             ))}
                         </div>
                     </div>

                     <div className="w-full bg-white/5 p-4 rounded-xl border border-white/10">
                         <div className="text-xs text-gray-500 uppercase mb-2">{t('noir.motive')}</div>
                         <div className="flex space-x-2">
                             {['Greed', 'Alibi Fake', 'Glitch'].map(opt => (
                                 <button 
                                    key={opt}
                                    onClick={() => setDeduction(p => ({...p, motive: opt}))}
                                    className={`flex-1 py-2 rounded border ${deduction.motive === opt ? 'bg-cyan/20 border-cyan text-cyan' : 'border-gray-700 text-gray-500'}`}
                                 >
                                     {opt}
                                 </button>
                             ))}
                         </div>
                     </div>
                 </div>

                 {feedback && (
                     <div className="mt-4 p-4 bg-gray-800 rounded-xl border border-white/10 text-sm text-gray-300 italic">
                         "{t('noir.analysis')}: {feedback}"
                     </div>
                 )}

                 <div className="mt-6">
                     <Button fullWidth variant="primary" onClick={handleSubmitDeduction} disabled={!deduction.suspect || !deduction.weapon || !deduction.motive}>
                         <CheckCircle2 className="mr-2" size={16} /> {t('noir.submit')}
                     </Button>
                 </div>
            </div>
        )}
    </div>
  );
};
