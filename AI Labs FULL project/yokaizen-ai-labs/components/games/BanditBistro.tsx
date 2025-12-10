
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { analyzeBanditStrategy } from '../../services/geminiService';
import { Utensils, TrendingUp, DollarSign, ChefHat, User, Clock, Zap, AlertTriangle, X } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Scanlines } from '../ui/Visuals';
import { Language } from '../../types';

interface BanditBistroProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
}

interface Customer {
    id: number;
    avatar: string;
    patience: number;
    preference: string; // Hidden stat
    state: 'WAITING' | 'EATING' | 'LEAVING' | 'ANGRY';
    x: number; // For animation
    bounceOffset: number; // For walk animation
}

interface Particle {
    id: number;
    x: number;
    y: number;
    text: string;
    color: string;
    vy: number;
    life: number;
}

export const BanditBistro: React.FC<BanditBistroProps> = ({ onComplete, t }) => {
  const [funds, setFunds] = useState(100);
  const [queue, setQueue] = useState<Customer[]>([]);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [history, setHistory] = useState<{choice: string, reward: number}[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [gameState, setGameState] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [particles, setParticles] = useState<Particle[]>([]);
  const [shake, setShake] = useState(0);
  
  const customerIdRef = useRef(0);

  const DISHES = [
    { id: 'tacos', name: t('bistro.dish_tacos'), emoji: '🌮', color: 'border-pink-500 text-pink-400 bg-pink-900/20' },
    { id: 'sushi', name: t('bistro.dish_sushi'), emoji: '🍣', color: 'border-cyan-500 text-cyan-400 bg-cyan-900/20' },
    { id: 'burger', name: t('bistro.dish_burger'), emoji: '🍔', color: 'border-purple-500 text-purple-400 bg-purple-900/20' },
    { id: 'noodle', name: t('bistro.dish_noodle'), emoji: '🍜', color: 'border-amber-500 text-amber-400 bg-amber-900/20' },
  ];

  // --- GAME LOOP ---
  useEffect(() => {
      const interval = setInterval(() => {
          if (gameState === 'CLOSED') return;

          // Shake Decay
          setShake(s => Math.max(0, s - 1));

          // Spawn Customer
          if (queue.length < 4 && Math.random() > 0.6) {
              const newC: Customer = {
                  id: customerIdRef.current++,
                  avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`,
                  patience: 100,
                  preference: DISHES[Math.floor(Math.random() * DISHES.length)].id, 
                  state: 'WAITING',
                  x: 100, // Start off screen
                  bounceOffset: 0
              };
              setQueue(prev => [...prev, newC]);
              audio.playClick(); 
          }

          // Update Queue (Patience & Movement & Bounce)
          setQueue(prev => {
              const next = prev.map((c, i) => {
                  const targetX = i * 25; 
                  const move = (targetX - c.x) * 0.1;
                  
                  // Walking bounce animation
                  let bounce = c.bounceOffset;
                  if (Math.abs(move) > 0.1) {
                      bounce = (bounce + 0.5) % (Math.PI * 2);
                  } else {
                      bounce = 0; // Stand still
                  }

                  let newPatience = c.patience - 0.5;
                  if (i === 0 && !activeCustomer) {
                      setActiveCustomer(c);
                      return null; 
                  }
                  
                  if (newPatience <= 0) return { ...c, state: 'ANGRY' }; 

                  return { ...c, x: c.x + move, patience: newPatience, bounceOffset: bounce };
              }).filter(Boolean) as Customer[]; 
              
              return next.filter(c => c.state !== 'ANGRY'); 
          });

          // Active Customer Patience
          if (activeCustomer) {
              setActiveCustomer(prev => {
                  if (!prev) return null;
                  const newPatience = prev.patience - 1;
                  if (newPatience <= 0) {
                      spawnParticle(150, 300, "😡", "text-red-500");
                      audio.playError();
                      setShake(5);
                      setFunds(f => f - 20); 
                      return null; 
                  }
                  return { ...prev, patience: newPatience };
              });
          }

          // Particle Physics
          setParticles(prev => prev.map(p => ({
              ...p,
              y: p.y - p.vy, // Move up
              life: p.life - 0.05
          })).filter(p => p.life > 0));

      }, 50); // 20 FPS Logic loop

      return () => clearInterval(interval);
  }, [gameState, activeCustomer, queue.length]);

  const spawnParticle = (x: number, y: number, text: string, color: string) => {
      setParticles(p => [...p, { id: Date.now(), x, y, text, color, vy: 2 + Math.random(), life: 1.0 }]);
  };

  const handleServe = (dish: typeof DISHES[0]) => {
      if (!activeCustomer) return;
      
      const isPreferred = dish.id === activeCustomer.preference;
      const roll = Math.random();
      const success = isPreferred ? roll < 0.8 : roll < 0.3;
      
      const reward = success ? 50 + Math.floor(activeCustomer.patience / 2) : -10;
      
      setFunds(f => f + reward);
      setHistory(h => [...h, { choice: dish.name, reward }]);
      
      if (success) {
          spawnParticle(window.innerWidth/2, window.innerHeight/2, `+$${reward}`, "text-green-400 font-black text-4xl");
          audio.playSuccess();
      } else {
          spawnParticle(window.innerWidth/2, window.innerHeight/2, "🤢", "text-amber-500 text-4xl");
          setShake(5);
          audio.playError();
      }

      setActiveCustomer(null); 

      // Win Condition
      if (funds >= 300) {
          setGameState('CLOSED');
          finishGame();
      }
      if (funds <= 0) {
          setGameState('CLOSED');
          alert("BANKRUPT");
          window.location.reload();
      }
  };

  const finishGame = async () => {
      const analysis = await analyzeBanditStrategy(history.map(h => h.choice), history.map(h => h.reward));
      setFeedback(analysis);
  };

  return (
    <div className="h-full flex flex-col bg-[#101010] relative overflow-hidden font-sans select-none"
         style={{ transform: `translate(${(Math.random()-0.5)*shake}px, ${(Math.random()-0.5)*shake}px)` }}>
        <Scanlines />
        
        {/* --- HEADER --- */}
        <div className="p-4 bg-gray-900 border-b border-gray-800 flex justify-between items-center z-10 shadow-lg">
            <div className="flex items-center space-x-2">
                <div className="bg-green-900/30 p-2 rounded-lg border border-green-500/50">
                    <DollarSign className="text-green-400" size={20} />
                </div>
                <span className="text-2xl font-black text-green-400 font-mono transition-all duration-200" style={{ transform: `scale(${1 + (shake/10)})` }}>${funds}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400 text-xs font-bold uppercase">
                <Clock size={14} />
                <span>{gameState === 'OPEN' ? 'OPEN' : 'CLOSED'}</span>
            </div>
        </div>

        {/* --- SCENE --- */}
        <div className="flex-1 relative bg-[url('https://picsum.photos/seed/cyberbar/800/600')] bg-cover bg-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
            
            {/* Counter Area */}
            <div className="absolute bottom-0 w-full h-1/3 bg-gray-900 border-t-4 border-gray-700 flex items-center justify-center shadow-2xl z-20">
                <div className="text-gray-600 font-black text-6xl opacity-20 transform -skew-x-12">BISTRO</div>
            </div>

            {/* Queue Visualization */}
            <div className="absolute top-1/2 left-0 w-full h-32 flex items-center px-8 z-10 transform -translate-y-1/2">
                {/* Active Customer Spot */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-32 h-32 flex items-end justify-center">
                    {activeCustomer ? (
                        <div className="relative animate-in zoom-in slide-in-from-right duration-300">
                            {/* Patience Bar */}
                            <div className="absolute -top-6 left-0 w-full h-2 bg-gray-800 rounded-full overflow-hidden border border-white/20">
                                <div 
                                    className={`h-full transition-all duration-200 ${activeCustomer.patience < 30 ? 'bg-red-500' : 'bg-green-500'}`} 
                                    style={{ width: `${activeCustomer.patience}%` }}
                                ></div>
                            </div>
                            
                            <img 
                                src={activeCustomer.avatar} 
                                className="w-24 h-24 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                                alt="Customer"
                            />
                            {/* Talk Bubble */}
                            <div className="absolute -top-12 -right-8 bg-white text-black text-xs font-bold px-3 py-1 rounded-full rounded-bl-none animate-bounce shadow-lg">
                                {t('bistro.feed_me')}
                            </div>
                        </div>
                    ) : (
                        <div className="text-white/20 font-bold text-sm animate-pulse">{t('bistro.waiting')}</div>
                    )}
                </div>

                {/* Queue Line */}
                {queue.map((c, i) => (
                    <div 
                        key={c.id} 
                        className="absolute bottom-4 transition-all duration-75 ease-linear"
                        style={{ 
                            right: `${10 + (i * 15)}%`, 
                            opacity: 1 - (i * 0.2),
                            transform: `translateY(${-Math.abs(Math.sin(c.bounceOffset) * 10)}px)` // Bounce effect
                        }}
                    >
                        <img src={c.avatar} className="w-16 h-16 grayscale opacity-70" alt="Queue" />
                    </div>
                ))}
            </div>

            {/* Particles */}
            {particles.map(p => (
                <div 
                    key={p.id} 
                    className={`absolute font-black drop-shadow-md transition-opacity duration-200 ${p.color}`}
                    style={{ left: '50%', top: p.y, transform: 'translate(-50%, -50%)', opacity: p.life }}
                >
                    {p.text}
                </div>
            ))}
        </div>

        {/* --- CONTROLS --- */}
        <div className="bg-black p-4 z-30 pb-safe">
            <div className="text-center text-[10px] text-gray-500 font-bold uppercase mb-2 tracking-widest">{t('bistro.select_dish')}</div>
            <div className="grid grid-cols-2 gap-3">
                {DISHES.map(dish => (
                    <button
                        key={dish.id}
                        onClick={() => handleServe(dish)}
                        disabled={!activeCustomer || gameState === 'CLOSED'}
                        className={`flex items-center p-3 rounded-xl border-2 transition-all active:scale-95 ${dish.color} ${!activeCustomer ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110 hover:scale-105 shadow-[0_0_15px_rgba(255,255,255,0.2)]'}`}
                    >
                        <div className="text-3xl mr-3">{dish.emoji}</div>
                        <div className="text-left">
                            <div className="font-bold text-xs uppercase">{dish.name}</div>
                            <div className="text-[9px] opacity-70">Probability: ???</div>
                        </div>
                    </button>
                ))}
            </div>
        </div>

        {/* --- GAME OVER --- */}
        {gameState === 'CLOSED' && feedback && (
            <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in">
                <ChefHat size={64} className="text-yellow-400 mb-4" />
                <h2 className="text-3xl font-black text-white mb-2">{t('bistro.shift_complete')}</h2>
                <div className="text-2xl text-green-400 font-mono mb-6">${funds} {t('bistro.money')}</div>
                <div className="bg-gray-900 p-4 rounded-xl border border-white/10 text-xs text-gray-300 italic mb-8 max-w-xs">
                    "AI Analysis: {feedback}"
                </div>
                <Button variant="primary" onClick={() => onComplete(100)}>{t('bistro.clock_out')}</Button>
            </div>
        )}
    </div>
  );
};
