
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { interactWithDreamSim } from '../../services/geminiService';
import { Terminal, Zap, AlertTriangle, Send } from 'lucide-react';
import { Language } from '../../types';

interface DreamSimProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
}

const DreamVisualizer = ({ intensity }: { intensity: number }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Resize
        canvas.width = canvas.parentElement?.clientWidth || 300;
        canvas.height = canvas.parentElement?.clientHeight || 200;

        const particles: {x:number, y:number, vx:number, vy:number, size:number, color: string, life: number}[] = [];
        for(let i=0; i<100; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * intensity * 0.5,
                vy: (Math.random() - 0.5) * intensity * 0.5,
                size: Math.random() * 4 + 1,
                color: `hsla(${Math.random()*360}, 70%, 60%, 0.6)`,
                life: Math.random() * 100
            });
        }

        const render = () => {
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.5;
                if(p.life <= 0) {
                    p.x = Math.random() * canvas.width;
                    p.y = Math.random() * canvas.height;
                    p.life = 100;
                }
                
                if(p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if(p.y < 0 || p.y > canvas.height) p.vy *= -1;
                
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * (p.life / 100), 0, Math.PI*2);
                ctx.fillStyle = p.color;
                ctx.shadowBlur = 10;
                ctx.shadowColor = p.color;
                ctx.fill();
                ctx.shadowBlur = 0;
            });
            requestAnimationFrame(render);
        };
        const anim = requestAnimationFrame(render);
        return () => cancelAnimationFrame(anim);
    }, [intensity]);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60 pointer-events-none" />;
};

export const DreamSim: React.FC<DreamSimProps> = ({ onComplete, t, language = 'EN' }) => {
  const [history, setHistory] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [instability, setInstability] = useState(20);
  const [isGlitching, setIsGlitching] = useState(false);
  const lastActionTime = useRef(Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      setHistory([{ role: 'model', content: t('dreamsim.init') }]);
  }, [t]);

  useEffect(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleAction = async () => {
      if (!input.trim()) return;
      
      const now = Date.now();
      const timeDelta = now - lastActionTime.current;
      lastActionTime.current = now;

      const userAction = input;
      setInput('');
      setIsLoading(true);
      
      // Optimistic update
      setHistory(prev => [...prev, { role: 'user', content: `> ${userAction}` }]);

      const result = await interactWithDreamSim(history, userAction, timeDelta, language as Language);
      
      setIsLoading(false);
      setHistory(prev => [...prev, { role: 'model', content: result.description }]);
      setInstability(result.instability);
      setIsGlitching(result.glitch);

      if (result.instability > 90) {
          // Critical instability logic
      }
  };

  return (
    <div className={`h-full flex flex-col relative overflow-hidden font-mono transition-colors duration-200 ${isGlitching ? 'bg-black' : 'bg-gray-950'}`}>
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-20"></div>
        {isGlitching && (
            <div className="absolute inset-0 z-30 pointer-events-none animate-pulse bg-red-500/10 mix-blend-overlay"></div>
        )}
        <DreamVisualizer intensity={instability} />

        {/* HUD */}
        <div className="flex justify-between items-center p-4 border-b border-green-900/30 bg-black/80 backdrop-blur z-10">
            <div className="flex items-center space-x-2">
                <Terminal size={18} className="text-green-500" />
                <span className="text-xs font-bold text-green-500 tracking-widest uppercase">{t('games.dreamsim.oasis_engine_v9_4')}</span>
            </div>
            <div className="flex items-center space-x-3">
                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-gray-500 uppercase">{t('dreamsim.stability')}</span>
                    <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${instability > 70 ? 'bg-red-500' : instability > 40 ? 'bg-amber-500' : 'bg-green-500'}`} 
                          style={{ width: `${100 - instability}%` }}
                        ></div>
                    </div>
                </div>
                {isGlitching && <AlertTriangle size={16} className="text-red-500 animate-ping" />}
            </div>
        </div>

        {/* Main Display */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10 scrollbar-hide">
            {history.map((msg, i) => (
                <div key={i} className={`animate-in fade-in slide-in-from-left duration-300 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    <div className={`inline-block max-w-[90%] p-3 rounded-lg border ${
                        msg.role === 'user' 
                        ? 'bg-green-900/10 border-green-500/30 text-green-100' 
                        : 'bg-black border-gray-800 text-gray-300 shadow-[0_0_15px_rgba(0,0,0,0.8)]'
                    }`}>
                        {msg.role === 'model' && (
                            <div className="flex items-center mb-1 opacity-50">
                                <Zap size={10} className="mr-1 text-amber-500" />
                                <span className="text-[8px] font-bold uppercase tracking-wider">{t('games.dreamsim.render_output')}</span>
                            </div>
                        )}
                        <p className={`text-sm leading-relaxed ${isGlitching && msg.role === 'model' ? 'blur-[0.5px]' : ''}`}>
                            {msg.content}
                        </p>
                    </div>
                </div>
            ))}
            {isLoading && (
                <div className="text-green-500/50 text-xs animate-pulse flex items-center">
                    <span className="mr-2">▌</span> {t('dreamsim.rendering')}
                </div>
            )}
            <div ref={scrollRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-black border-t border-green-900/30 z-10">
            <div className="relative flex items-center">
                <span className="absolute left-3 text-green-500 font-bold">{'>'}</span>
                <input 
                  className="w-full bg-gray-900 border border-green-900/50 rounded-none px-8 py-3 text-green-100 focus:border-green-500 focus:outline-none font-mono text-sm shadow-[0_0_10px_rgba(34,197,94,0.1)]"
                  placeholder={t('dreamsim.input_placeholder')}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAction()}
                  autoFocus
                />
                <button 
                  onClick={handleAction} 
                  disabled={isLoading || !input}
                  className="absolute right-2 p-1.5 bg-green-900/30 text-green-500 hover:bg-green-500 hover:text-black transition-colors rounded-sm disabled:opacity-50"
                >
                    <Send size={14} />
                </button>
            </div>
            <div className="text-[10px] text-gray-600 mt-2 text-center font-mono uppercase">
                {t('dreamsim.warning')}
            </div>
        </div>
        
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,transparent_60%,rgba(0,0,0,0.4)_100%)] z-40"></div>
    </div>
  );
};
