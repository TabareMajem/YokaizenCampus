
import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Eye, AlertTriangle, Scan, ZoomIn, Layers, CheckCircle2 } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Scanlines } from '../ui/Visuals';
import { Language } from '../../types';

interface DeepfakeDetectiveProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
}

const IMAGES = [
    { id: 1, url: 'https://picsum.photos/seed/face1/600/600', anomalies: [{x: 30, y: 40, label: 'Asymetric Pupils'}, {x: 60, y: 80, label: 'Warped Text'}], type: 'FAKE' },
    { id: 2, url: 'https://picsum.photos/seed/face2/600/600', anomalies: [], type: 'REAL' },
    { id: 3, url: 'https://picsum.photos/seed/face3/600/600', anomalies: [{x: 20, y: 20, label: 'Hair Artifacts'}, {x: 70, y: 50, label: 'Jewelry Glitch'}], type: 'FAKE' },
];

export const DeepfakeDetective: React.FC<DeepfakeDetectiveProps> = ({ onComplete, t }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [zoomMode, setZoomMode] = useState(false);
  const [filterMode, setFilterMode] = useState<'RGB' | 'HEATMAP' | 'NONE'>('NONE');
  const [foundAnomalies, setFoundAnomalies] = useState<string[]>([]); // labels
  const [score, setScore] = useState(0);
  const [scanPos, setScanPos] = useState({ x: 50, y: 50 });
  const [verdict, setVerdict] = useState<'PENDING' | 'CORRECT' | 'WRONG'>('PENDING');

  const currentImg = IMAGES[currentIdx];

  const handlePointerMove = (e: React.PointerEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setScanPos({ x, y });
  };

  const handleClick = () => {
      if (verdict !== 'PENDING') return;
      
      // Check collision with anomalies
      if (currentImg.type === 'FAKE') {
          const hit = currentImg.anomalies.find(a => Math.abs(a.x - scanPos.x) < 10 && Math.abs(a.y - scanPos.y) < 10);
          if (hit && !foundAnomalies.includes(hit.label)) {
              setFoundAnomalies(prev => [...prev, hit.label]);
              audio.playScan();
          } else {
              audio.playClick();
          }
      }
  };

  const submitVerdict = (vote: 'REAL' | 'FAKE') => {
      const isCorrect = vote === currentImg.type;
      if (isCorrect) {
          audio.playSuccess();
          setVerdict('CORRECT');
          setScore(s => s + 100);
      } else {
          audio.playError();
          setVerdict('WRONG');
      }

      setTimeout(() => {
          if (currentIdx < IMAGES.length - 1) {
              setCurrentIdx(c => c + 1);
              setVerdict('PENDING');
              setFoundAnomalies([]);
              setFilterMode('NONE');
          } else {
              onComplete(100);
          }
      }, 2000);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 relative overflow-hidden select-none">
        <Scanlines />
        
        {/* Header */}
        <div className="p-4 bg-black/80 border-b border-cyan-900/50 flex justify-between items-center z-10 backdrop-blur-md">
            <div className="flex items-center text-cyan-400">
                <Eye size={20} className="mr-2 animate-pulse"/>
                <span className="font-bold tracking-widest text-sm">{t('deepfake.title')}</span>
            </div>
            <div className="text-xs font-mono text-slate-400">CASE {currentIdx + 1}/{IMAGES.length}</div>
        </div>

        {/* Main Viewport */}
        <div className="flex-1 relative flex items-center justify-center p-4">
            <div 
                className={`relative w-full max-w-sm aspect-square border-2 rounded-xl overflow-hidden shadow-2xl cursor-crosshair transition-all duration-300 ${
                    verdict === 'CORRECT' ? 'border-green-500' : verdict === 'WRONG' ? 'border-red-500' : 'border-cyan-500/30'
                }`}
                onPointerMove={handlePointerMove}
                onClick={handleClick}
            >
                {/* Image Layer with Filters */}
                <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-200"
                    style={{ 
                        backgroundImage: `url(${currentImg.url})`,
                        transform: zoomMode ? `scale(2) translate(${50 - scanPos.x}px, ${50 - scanPos.y}px)` : 'none',
                        filter: filterMode === 'HEATMAP' ? 'contrast(150%) hue-rotate(180deg)' : filterMode === 'RGB' ? 'sepia(100%) hue-rotate(50deg)' : 'none'
                    }}
                />

                {/* Anomalies Overlay (When Found) */}
                {foundAnomalies.map((label, i) => {
                    const a = currentImg.anomalies.find(an => an.label === label);
                    if (!a) return null;
                    return (
                        <div 
                            key={i} 
                            className="absolute border-2 border-red-500 rounded-full w-12 h-12 flex items-center justify-center animate-ping-slow"
                            style={{ left: `${a.x}%`, top: `${a.y}%`, transform: 'translate(-50%, -50%)' }}
                        >
                            <span className="absolute top-full mt-1 bg-red-900 text-white text-[8px] px-1 rounded whitespace-nowrap">{label}</span>
                        </div>
                    );
                })}

                {/* Scanner Reticle */}
                <div 
                    className="absolute w-16 h-16 border border-cyan-400/50 rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                    style={{ left: `${scanPos.x}%`, top: `${scanPos.y}%` }}
                >
                    <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
                    <div className="absolute inset-0 border-t border-cyan-400/30 animate-spin"></div>
                </div>

                {/* Verdict Overlay */}
                {verdict !== 'PENDING' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in zoom-in">
                        {verdict === 'CORRECT' ? (
                            <div className="text-center">
                                <CheckCircle2 size={64} className="text-green-500 mx-auto mb-2"/>
                                <h2 className="text-3xl font-black text-white">{t('deepfake.match')}</h2>
                            </div>
                        ) : (
                            <div className="text-center">
                                <AlertTriangle size={64} className="text-red-500 mx-auto mb-2"/>
                                <h2 className="text-3xl font-black text-white">{t('deepfake.error')}</h2>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* Tools */}
        <div className="bg-slate-900 border-t border-cyan-900/30 p-4 z-10">
            <div className="flex justify-center space-x-4 mb-6">
                <button 
                    onClick={() => setZoomMode(!zoomMode)}
                    className={`p-3 rounded-full border transition-all ${zoomMode ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-slate-800 text-cyan-400 border-slate-700'}`}
                >
                    <ZoomIn size={20} />
                </button>
                <button 
                    onClick={() => setFilterMode(f => f === 'NONE' ? 'HEATMAP' : f === 'HEATMAP' ? 'RGB' : 'NONE')}
                    className={`p-3 rounded-full border transition-all ${filterMode !== 'NONE' ? 'bg-purple-500 text-white border-purple-400' : 'bg-slate-800 text-purple-400 border-slate-700'}`}
                >
                    <Layers size={20} />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Button 
                    variant="primary" 
                    onClick={() => submitVerdict('REAL')} 
                    disabled={verdict !== 'PENDING'}
                    className="bg-green-600 hover:bg-green-500 border-green-400"
                >
                    {t('deepfake.real')}
                </Button>
                <Button 
                    variant="danger" 
                    onClick={() => submitVerdict('FAKE')} 
                    disabled={verdict !== 'PENDING'}
                    className="bg-red-600 hover:bg-red-500 border-red-400"
                >
                    {t('deepfake.fake')}
                </Button>
            </div>
        </div>
    </div>
  );
};
