
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { AlertTriangle, CheckCircle2, X, Shield, Eye, ThumbsUp, ThumbsDown, MessageCircle, Zap, Activity } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Scanlines, Vignette, GlitchText } from '../ui/Visuals';
import { Language } from '../../types';

interface BiasBingoProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
}

export const BiasBingo: React.FC<BiasBingoProps> = ({ onComplete, t }) => {
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'END'>('START');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [swipeDir, setSwipeDir] = useState<'LEFT' | 'RIGHT' | null>(null);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  
  // Card Tilt Logic
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const posts = [
      { id: 1, user: 'TechGuru99', text: t('bingo.post1.text'), isBiased: true, type: 'HATE_SPEECH' },
      { id: 2, user: 'DevOps_Dan', text: t('bingo.post2.text'), isBiased: false, type: 'SAFE' },
      { id: 3, user: 'HiringMgr', text: t('bingo.post3.text'), isBiased: true, type: 'GENDER_BIAS' },
      { id: 4, user: 'ProductLead', text: t('bingo.post4.text'), isBiased: true, type: 'CONFIRMATION_BIAS' },
      { id: 5, user: 'DesignBot', text: t('bingo.post5.text'), isBiased: false, type: 'SAFE' },
      { id: 6, user: 'SalesPro', text: t('bingo.post6.text'), isBiased: true, type: 'AGEISM' },
      { id: 7, user: 'Anon_User', text: "AI will replace all doctors because they make mistakes.", isBiased: true, type: 'MISINFO' },
      { id: 8, user: 'System_Admin', text: "Server uptime is 99.9%. Updates scheduled for midnight.", isBiased: false, type: 'SAFE' },
      { id: 9, user: 'Crypto_King', text: "Only people under 25 understand blockchain.", isBiased: true, type: 'AGEISM' },
      { id: 10, user: 'Recruiter_AI', text: "Candidate rejected based on postal code correlation.", isBiased: true, type: 'SOCIOECONOMIC_BIAS' },
  ];

  // Timer
  useEffect(() => {
      if (gameState === 'PLAYING') {
          const interval = setInterval(() => {
              setTimeLeft(t => {
                  if (t <= 0) {
                      setGameState('END');
                      return 0;
                  }
                  return t - 1;
              });
          }, 1000);
          return () => clearInterval(interval);
      }
  }, [gameState]);

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((y - centerY) / centerY) * -10; 
      const rotateY = ((x - centerX) / centerX) * 10;

      setTilt({ x: rotateX, y: rotateY });
  };

  const handleSwipe = (dir: 'LEFT' | 'RIGHT') => {
      if (gameState !== 'PLAYING' || swipeDir) return;
      
      setSwipeDir(dir);
      const currentPost = posts[currentIndex];
      // RIGHT = APPROVE (SAFE), LEFT = FLAG (BIASED)
      
      const isCorrect = (dir === 'LEFT' && currentPost.isBiased) || (dir === 'RIGHT' && !currentPost.isBiased);
      
      if (isCorrect) {
          const comboMult = 1 + (combo * 0.1);
          setScore(s => Math.floor(s + (100 * comboMult)));
          setCombo(c => {
              const newC = c + 1;
              if (newC > maxCombo) setMaxCombo(newC);
              return newC;
          });
          audio.playSuccess();
          if (combo > 2) audio.playScan(); // Escalating sound
      } else {
          setCombo(0);
          audio.playError();
          audio.vibrate([50, 50, 50]);
          setTimeLeft(t => Math.max(0, t - 5)); // Penalty
      }

      setTimeout(() => {
          setSwipeDir(null);
          setTilt({ x: 0, y: 0 });
          if (currentIndex < posts.length - 1) {
              setCurrentIndex(i => i + 1);
          } else {
              setGameState('END');
          }
      }, 200);
  };

  // Keyboard controls
  useEffect(() => {
      const handleKey = (e: KeyboardEvent) => {
          if (gameState !== 'PLAYING') return;
          if (e.key === 'ArrowLeft') handleSwipe('LEFT');
          if (e.key === 'ArrowRight') handleSwipe('RIGHT');
      };
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
  }, [gameState, currentIndex, swipeDir]);

  return (
    <div className="h-full flex flex-col bg-slate-950 relative overflow-hidden font-sans select-none">
        <Scanlines />
        <Vignette color={combo > 5 ? '#200020' : '#000000'} />
        
        {/* Dynamic Background Noise */}
        <div className={`absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-${Math.min(20, combo * 2)} transition-opacity duration-500`}></div>
        
        {/* Scrolling Background Text (The Feed) */}
        <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none flex flex-col justify-center">
             {Array.from({length: 10}).map((_, i) => (
                 <div key={i} className="text-4xl font-black text-white whitespace-nowrap animate-marquee" style={{ animationDuration: `${20 - i}s` }}>
                     DATA_STREAM_INCOMING // BIAS_DETECTED // FILTERING_PROTOCOL // SOCIAL_FEED_LIVE // 
                 </div>
             ))}
        </div>

        {/* Header */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center z-20 backdrop-blur-md">
            <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${combo > 3 ? 'bg-purple-500 animate-pulse' : 'bg-slate-800'}`}>
                    <Shield className="text-white" size={18} />
                </div>
                <div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t('bingo.title')}</div>
                    <div className="text-white font-bold flex items-center">
                        <span className="mr-2">{score} XP</span>
                        {combo > 1 && <span className="text-yellow-400 text-xs animate-bounce">x{1 + (combo * 0.1).toFixed(1)} COMBO</span>}
                    </div>
                </div>
            </div>
            <div className={`font-mono font-black text-3xl ${timeLeft < 10 ? 'text-red-500 animate-ping' : 'text-cyan-400'}`}>
                {timeLeft}
            </div>
        </div>

        {/* --- GAMEPLAY --- */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 perspective-[1000px]">
            
            {gameState === 'START' && (
                <div className="text-center animate-in zoom-in max-w-xs bg-black/80 p-8 rounded-2xl border border-cyan-500/30 backdrop-blur-md shadow-2xl">
                    <div className="w-24 h-24 bg-cyan-900/30 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-cyan-500 relative">
                        <Eye size={40} className="text-cyan-400" />
                        <div className="absolute inset-0 border-2 border-cyan-500 rounded-full animate-ping opacity-20"></div>
                    </div>
                    <h1 className="text-3xl font-black text-white mb-2 italic tracking-tighter"><GlitchText text={t('bingo.title')} /></h1>
                    <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                        MODERATOR PROTOCOL ACTIVATED.<br/>
                        <span className="text-white font-bold">LEFT</span> to FLAG BIASED content.<br/>
                        <span className="text-white font-bold">RIGHT</span> to APPROVE SAFE content.
                    </p>
                    <Button size="lg" variant="primary" onClick={() => { setGameState('PLAYING'); audio.playClick(); }} className="w-full shadow-[0_0_20px_#06b6d4]">
                        START SHIFT
                    </Button>
                </div>
            )}

            {gameState === 'PLAYING' && (
                <div 
                    ref={cardRef}
                    className="w-full max-w-sm relative h-96 transition-transform duration-100 ease-out"
                    style={{ 
                        transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                        transformStyle: 'preserve-3d'
                    }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setTilt({x:0, y:0})}
                >
                    {/* Background Stack Effect */}
                    <div className="absolute top-2 left-2 right-[-10px] bottom-[-10px] bg-slate-800 rounded-2xl border border-slate-700 transform translate-z-[-20px] opacity-50"></div>
                    <div className="absolute top-4 left-4 right-[-20px] bottom-[-20px] bg-slate-900 rounded-2xl border border-slate-800 transform translate-z-[-40px] opacity-30"></div>
                    
                    {/* Main Card */}
                    <div 
                        className={`absolute inset-0 bg-white text-slate-900 rounded-2xl p-6 shadow-2xl flex flex-col transition-all duration-200 transform-gpu
                            ${swipeDir === 'LEFT' ? '-translate-x-32 -rotate-12 opacity-0 scale-90' : ''}
                            ${swipeDir === 'RIGHT' ? 'translate-x-32 rotate-12 opacity-0 scale-90' : ''}
                        `}
                    >
                        {/* Header */}
                        <div className="flex items-center space-x-3 mb-6 border-b border-gray-100 pb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center font-bold text-lg text-slate-600 shadow-inner">
                                {posts[currentIndex].user[0]}
                            </div>
                            <div>
                                <div className="font-bold text-lg">@{posts[currentIndex].user}</div>
                                <div className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">ID: {Math.floor(Math.random()*9999)} // PUBLIC</div>
                            </div>
                            <div className="ml-auto text-gray-300"><MessageCircle size={24} /></div>
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 flex items-center justify-center">
                            <p className="text-2xl font-bold text-center leading-tight text-slate-800 font-serif">
                                "{posts[currentIndex].text}"
                            </p>
                        </div>

                        {/* Footer / Controls Hint */}
                        <div className="mt-auto flex justify-between text-gray-400 px-4 pt-4 border-t border-gray-100">
                            <div className="flex flex-col items-center">
                                <AlertTriangle className="text-red-400 mb-1" size={24}/>
                                <span className="text-[8px] font-bold uppercase text-red-400">FLAG (LEFT)</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <CheckCircle2 className="text-green-500 mb-1" size={24}/>
                                <span className="text-[8px] font-bold uppercase text-green-500">APPROVE (RIGHT)</span>
                            </div>
                        </div>

                        {/* Stamp Overlay */}
                        {swipeDir === 'LEFT' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-red-500/20 rounded-2xl backdrop-blur-sm z-20">
                                <div className="border-8 border-red-600 text-red-600 font-black text-6xl px-8 py-4 rounded-xl transform -rotate-12 opacity-80 animate-in zoom-in duration-150">
                                    BIASED
                                </div>
                            </div>
                        )}
                        {swipeDir === 'RIGHT' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 rounded-2xl backdrop-blur-sm z-20">
                                <div className="border-8 border-green-600 text-green-600 font-black text-6xl px-8 py-4 rounded-xl transform rotate-12 opacity-80 animate-in zoom-in duration-150">
                                    SAFE
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {gameState === 'END' && (
                <div className="text-center animate-in zoom-in bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-xs relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/90 z-0"></div>
                    <div className="relative z-10">
                        <div className="text-xs text-gray-500 font-bold uppercase mb-2 tracking-widest">{t('bingo.shift_complete')}</div>
                        <div className="text-6xl font-black text-white mb-2">{score}</div>
                        <div className="text-sm text-cyan-400 font-mono mb-6">MAX COMBO: {maxCombo}</div>
                        
                        <div className="w-full h-2 bg-gray-800 rounded-full mb-6 overflow-hidden">
                            <div className="h-full bg-cyan-400 animate-pulse" style={{ width: `${Math.min(100, (score / 1000) * 100)}%` }}></div>
                        </div>
                        <Button fullWidth variant="primary" onClick={() => onComplete(Math.min(100, score / 10))} className="shadow-lg">{t('bingo.submit')}</Button>
                    </div>
                </div>
            )}

        </div>

        {/* Touch Controls (Mobile) */}
        {gameState === 'PLAYING' && (
            <div className="p-6 pb-safe flex justify-between items-center w-full max-w-md mx-auto z-20">
                <button 
                    onClick={() => handleSwipe('LEFT')}
                    className="w-20 h-20 bg-red-950/80 border-2 border-red-500 rounded-full flex items-center justify-center text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] active:scale-90 transition-transform"
                >
                    <X size={32} strokeWidth={3} />
                </button>
                
                <div className="text-[10px] text-gray-500 uppercase font-mono bg-black/50 px-3 py-1 rounded-full border border-gray-800">
                    SWIPE or ARROWS
                </div>

                <button 
                    onClick={() => handleSwipe('RIGHT')}
                    className="w-20 h-20 bg-green-950/80 border-2 border-green-500 rounded-full flex items-center justify-center text-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)] active:scale-90 transition-transform"
                >
                    <CheckCircle2 size={32} strokeWidth={3} />
                </button>
            </div>
        )}
    </div>
  );
};
