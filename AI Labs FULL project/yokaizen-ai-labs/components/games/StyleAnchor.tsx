
import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { generateImage } from '../../services/geminiService';
import { Image as ImageIcon, Sparkles, X, Check, Palette } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Scanlines } from '../ui/Visuals';
import { Language } from '../../types';

interface StyleAnchorProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
}

const STYLES = [
    { id: 'cyberpunk', name: 'Cyberpunk', prompt: 'neon lights, rain, high tech, low life, highly detailed, 8k, unreal engine 5' },
    { id: 'noir', name: 'Film Noir', prompt: 'black and white, high contrast, shadows, detective, vintage, grainy, dramatic lighting' },
    { id: 'watercolor', name: 'Watercolor', prompt: 'soft pastel colors, paper texture, artistic, dreamy, flowing strokes' },
    { id: 'pixel', name: 'Pixel Art', prompt: '16-bit, retro game style, blocky, vibrant, sprite art' }
];

export const StyleAnchor: React.FC<StyleAnchorProps> = ({ onComplete, t }) => {
  const [gameState, setGameState] = useState<'BRIEFING' | 'GENERATING' | 'CURATING' | 'RESULT'>('BRIEFING');
  const [targetStyle, setTargetStyle] = useState(STYLES[0]);
  const [generatedImages, setGeneratedImages] = useState<{url: string, score: number}[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState<boolean[]>([]); // true = keep, false = reject
  const [score, setScore] = useState(0);
  
  // Simulation of "Generation" phase
  useEffect(() => {
      if (gameState === 'GENERATING') {
          const gen = async () => {
              // We simulate generating a batch of images
              // Some match the style, some are "traps"
              const newImages = [];
              for(let i=0; i<5; i++) {
                  const isGood = Math.random() > 0.4;
                  const prompt = isGood 
                    ? `A portrait of a robot, ${targetStyle.prompt}`
                    : `A portrait of a robot, ${STYLES.find(s => s.id !== targetStyle.id)?.prompt}`; // Trap style
                  
                  // Mock or Real generation
                  const url = await generateImage(prompt);
                  newImages.push({ url, score: isGood ? 20 : -10 });
              }
              setGeneratedImages(newImages);
              setSelections(new Array(5).fill(false));
              setGameState('CURATING');
          };
          gen();
      }
  }, [gameState, targetStyle]);

  const handleBriefingStart = () => {
      const randomStyle = STYLES[Math.floor(Math.random() * STYLES.length)];
      setTargetStyle(randomStyle);
      setGameState('GENERATING');
      audio.playClick();
  };

  const handleDecision = (keep: boolean) => {
      const newSelections = [...selections];
      newSelections[currentIndex] = keep;
      setSelections(newSelections);
      
      if (keep) audio.playSuccess();
      else audio.playClick();

      if (currentIndex < generatedImages.length - 1) {
          setCurrentIndex(c => c + 1);
      } else {
          // Calculate Score
          let totalScore = 0;
          newSelections.forEach((kept, i) => {
              const imgScore = generatedImages[i].score;
              // If we kept a good image: +20
              // If we kept a bad image: -10
              // If we rejected a good image: 0 (Missed opportunity)
              // If we rejected a bad image: +10 (Good eye)
              if (kept) totalScore += imgScore;
              else if (imgScore < 0) totalScore += 10;
          });
          setScore(Math.max(0, totalScore));
          setGameState('RESULT');
      }
  };

  return (
    <div className="h-full flex flex-col bg-gray-950 font-sans relative overflow-hidden select-none">
        <Scanlines />
        
        {/* Header - Added pl-16 for back button clearance */}
        <div className="p-4 pl-16 bg-black/80 border-b border-purple-500/30 flex justify-between items-center z-10 backdrop-blur-md">
            <div>
                <h2 className="text-xl font-black text-white italic tracking-tighter">{t('style.title')}</h2>
                <p className="text-[10px] text-gray-400">{t('style.subtitle')}</p>
            </div>
            {gameState === 'CURATING' && (
                <div className="text-right">
                    <div className="text-[10px] text-gray-500 uppercase font-bold">{t('style.target')}</div>
                    <div className="text-purple-400 font-bold text-sm bg-purple-900/20 px-2 rounded border border-purple-500/50">{targetStyle.name}</div>
                </div>
            )}
        </div>

        {/* --- MAIN CONTENT --- */}
        <div className="flex-1 relative flex items-center justify-center p-6">
            
            {gameState === 'BRIEFING' && (
                <div className="text-center space-y-6 animate-in zoom-in max-w-xs">
                    <div className="w-32 h-32 bg-purple-900/20 rounded-full flex items-center justify-center mx-auto border-2 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                        <Palette size={48} className="text-purple-400" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-white">Style Consistency Check</h3>
                        <p className="text-sm text-gray-400">
                            The AI generator is hallucinating styles. <br/>
                            <span className="text-white font-bold">Approve</span> only images that match the Client's requested style. <span className="text-red-400 font-bold">Reject</span> the rest.
                        </p>
                    </div>
                    <Button size="lg" variant="primary" onClick={handleBriefingStart} className="w-full">
                        {t('style.start')}
                    </Button>
                </div>
            )}

            {gameState === 'GENERATING' && (
                <div className="text-center">
                    <Sparkles size={64} className="text-purple-500 animate-spin mb-4 mx-auto" />
                    <h3 className="text-xl font-bold text-white animate-pulse">{t('style.generating')}</h3>
                    <p className="text-xs text-gray-500 font-mono mt-2">{t('style.generating_sub')}</p>
                </div>
            )}

            {gameState === 'CURATING' && generatedImages.length > 0 && (
                <div className="w-full max-w-sm flex flex-col items-center space-y-6 animate-in fade-in">
                    {/* Progress */}
                    <div className="flex space-x-1 w-full justify-center">
                        {generatedImages.map((_, i) => (
                            <div key={i} className={`h-1 flex-1 rounded-full ${i < currentIndex ? 'bg-purple-500' : i === currentIndex ? 'bg-white animate-pulse' : 'bg-gray-800'}`}></div>
                        ))}
                    </div>

                    {/* Card */}
                    <div className="relative w-full aspect-[3/4] bg-black rounded-2xl border-2 border-gray-700 overflow-hidden shadow-2xl group">
                        <img 
                            src={generatedImages[currentIndex].url} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            alt="Generated Art"
                        />
                        {/* Overlay Stamps */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 transition-opacity duration-200" id="stamp-overlay"></div>

                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                        <div className="absolute bottom-4 left-4 right-4">
                            <p className="text-xs text-gray-300 font-mono">IMG_ID_{currentIndex + 8492}</p>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex w-full space-x-4">
                        <button 
                            onClick={() => handleDecision(false)}
                            className="flex-1 py-4 bg-red-900/80 border border-red-600 rounded-xl text-red-200 font-bold flex items-center justify-center hover:bg-red-800 transition-all active:scale-95"
                        >
                            <X size={24} className="mr-2"/> {t('style.reject')}
                        </button>
                        <button 
                            onClick={() => handleDecision(true)}
                            className="flex-1 py-4 bg-green-900/80 border border-green-600 rounded-xl text-green-200 font-bold flex items-center justify-center hover:bg-green-800 transition-all active:scale-95"
                        >
                            <Check size={24} className="mr-2"/> {t('style.approve')}
                        </button>
                    </div>
                </div>
            )}

            {gameState === 'RESULT' && (
                <div className="text-center space-y-6 animate-in zoom-in max-w-xs bg-gray-900 p-8 rounded-2xl border border-purple-500/30">
                    <div className="text-sm font-bold text-gray-500 uppercase tracking-widest">{t('style.satisfaction')}</div>
                    <div className={`text-6xl font-black ${score >= 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {score}%
                    </div>
                    <p className="text-sm text-gray-300">
                        {score >= 80 ? "Perfect curation. The gallery is cohesive." : "Inconsistent style detected. The client is confused."}
                    </p>
                    <Button fullWidth variant="primary" onClick={() => onComplete(score)}>
                        {t('style.complete')}
                    </Button>
                </div>
            )}

        </div>
    </div>
  );
};
