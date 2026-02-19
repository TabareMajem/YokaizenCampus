
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { analyzeBanditStrategy } from '../../services/geminiService';
import { Utensils, TrendingUp, DollarSign, ChefHat, User, Clock, Zap, AlertTriangle, X } from 'lucide-react';
import { audio } from '../../services/audioService';
import { gameProgressService } from '../../services/gameProgressService';
import { useToast } from '../../contexts/ToastContext';
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
    const [history, setHistory] = useState<{ choice: string, reward: number }[]>([]);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [gameState, setGameState] = useState<'OPEN' | 'CLOSED'>('OPEN');
    const [particles, setParticles] = useState<Particle[]>([]);
    const [shake, setShake] = useState(0);
    const { showToast } = useToast();

    const resetGame = () => {
        setFunds(100);
        setQueue([]);
        setActiveCustomer(null);
        setHistory([]);
        setGameState('OPEN');
        setParticles([]);
        customerIdRef.current = 0;
        audio.playClick();
    };

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
            spawnParticle(window.innerWidth / 2, window.innerHeight / 2, `+$${reward}`, "text-green-400 font-black text-4xl");
            audio.playSuccess();
        } else {
            spawnParticle(window.innerWidth / 2, window.innerHeight / 2, "🤢", "text-amber-500 text-4xl");
            setShake(5);
            audio.playError();
        }

        setActiveCustomer(null);

        // Win Condition
        if (funds >= 300) {
            setGameState('CLOSED');
            finishGame(true);
        }
        if (funds <= 0) {
            setGameState('CLOSED');
            audio.playError();
            showToast("BANKRUPT! The bistro has collapsed.", 'error');
            showToast("BANKRUPT! The bistro has collapsed.", 'error');
            setTimeout(resetGame, 2000);
        }
    };

    const finishGame = async (won: boolean) => {
        const analysis = await analyzeBanditStrategy(history.map(h => h.choice), history.map(h => h.reward));
        setFeedback(analysis);

        // Persist detailed stats
        await gameProgressService.save('bandit_bistro', {
            highScore: funds,
            lastPlayed: new Date(),
            customData: {
                won,
                funds,
                customersServed: history.length,
                history
            }
        });
    };

    // --- VISUAL COMPONENTS ---
    const KitchenAmbience = () => {
        return (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Ambient Light/Steam */}
                <div className="absolute -top-10 left-1/4 w-32 h-64 bg-white/5 blur-[50px] animate-pulse rounded-full"></div>
                <div className="absolute top-20 right-1/4 w-20 h-40 bg-orange-500/10 blur-[40px] animate-pulse rounded-full" style={{ animationDelay: '1s' }}></div>

                {/* Floating Dust/Steam Particles */}
                {Array.from({ length: 15 }).map((_, i) => (
                    <div
                        key={i}
                        className="absolute bg-white/10 rounded-full"
                        style={{
                            width: Math.random() * 4 + 2 + 'px',
                            height: Math.random() * 4 + 2 + 'px',
                            left: Math.random() * 100 + '%',
                            top: Math.random() * 100 + '%',
                            animation: `float-up ${Math.random() * 5 + 5}s linear infinite`,
                            opacity: Math.random() * 0.5
                        }}
                    />
                ))}
            </div>
        );
    };

    const CustomerVisual = ({ customer, isActive }: { customer: Customer, isActive: boolean }) => {
        return (
            <div className={`relative transition-all duration-300 ${isActive ? 'scale-110 z-20' : 'scale-90 opacity-80 grayscale-[0.5] z-10'}`}>
                {/* Patience Bar (Active Only) */}
                {isActive && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-2 bg-gray-900/80 rounded-full overflow-hidden border border-white/20 shadow-lg">
                        <div
                            className={`h-full transition-all duration-200 ${customer.patience < 40 ? 'bg-red-500 animate-pulse' : customer.patience < 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${customer.patience}%` }}
                        ></div>
                    </div>
                )}

                {/* Avatar with Squash/Stretch */}
                <div className="relative group" style={{
                    transform: `translateY(${-Math.abs(Math.sin(customer.bounceOffset) * 8)}px) scale(${1 + Math.sin(customer.bounceOffset * 2) * 0.05}, ${1 - Math.sin(customer.bounceOffset * 2) * 0.05})`
                }}>
                    {/* Shadow */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-3 bg-black/60 blur-sm rounded-full transition-all"
                        style={{ transform: `scale(${1 - Math.sin(customer.bounceOffset) * 0.2})` }}
                    ></div>

                    <img
                        src={customer.avatar}
                        className={`w-28 h-28 drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)] transition-all duration-300 ${isActive ? 'brightness-110' : ''}`}
                        alt="Customer"
                    />

                    {/* Emotes / Thoughts */}
                    {isActive ? (
                        <div className="absolute -top-8 -right-8 animate-in zoom-in slide-in-from-bottom-2 duration-300">
                            <div className="bg-white text-black text-lg px-3 py-2 rounded-2xl rounded-bl-none shadow-xl border-2 border-gray-200 font-bold flex items-center animate-bounce">
                                {customer.patience < 30 ? '😡' : customer.patience < 60 ? '😤' : '😋'}
                                <span className="ml-1 text-xs font-mono uppercase text-gray-400">{t('games.banditbistro.order')}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="absolute -top-4 -right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-black/80 text-white text-xs px-2 py-1 rounded-lg backdrop-blur">
                                {t('games.banditbistro.waiting')}</div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-[#101010] relative overflow-hidden font-sans select-none"
            style={{ transform: `translate(${(Math.random() - 0.5) * shake}px, ${(Math.random() - 0.5) * shake}px)` }}>
            <Scanlines />
            <KitchenAmbience />

            {/* --- HEADER --- */}
            <div className="p-4 bg-gray-900 border-b border-gray-800 flex justify-between items-center z-10 shadow-lg relative">
                <div className="flex items-center space-x-3">
                    <div className="bg-green-900/30 p-2.5 rounded-xl border border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                        <DollarSign className="text-green-400" size={24} />
                    </div>
                    <div>
                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{t('games.banditbistro.funds')}</div>
                        <span className="text-3xl font-black text-green-400 font-mono transition-all duration-75 block leading-none" style={{ transform: `scale(${1 + (shake / 20)})` }}>${funds}</span>
                    </div>
                </div>
                <div className={`px-4 py-2 rounded-lg border flex items-center space-x-2 text-xs font-bold uppercase tracking-widest ${gameState === 'OPEN' ? 'bg-blue-900/20 border-blue-500 text-blue-400' : 'bg-red-900/20 border-red-500 text-red-500'}`}>
                    <Clock size={16} />
                    <span>{gameState === 'OPEN' ? 'OPEN' : 'CLOSED'}</span>
                </div>
            </div>

            {/* --- SCENE --- */}
            <div className="flex-1 relative bg-cover bg-center perspective-[1000px] overflow-hidden">
                {/* Background Image Layer */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550966871-3ed3c47e7488?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')] bg-cover bg-center opacity-40"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>

                {/* Counter Area 3D Effect */}
                <div className="absolute bottom-0 w-full h-1/3 bg-gray-900 border-t-8 border-gray-800 flex items-center justify-center shadow-[0_-20px_50px_rgba(0,0,0,0.8)] z-20">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
                    <div className="text-white/5 font-black text-8xl transform -skew-x-12 tracking-tighter select-none">{t('games.banditbistro.bistro')}</div>
                </div>

                {/* Queue Visualization */}
                <div className="absolute top-[45%] left-0 w-full flex items-end justify-center px-4 z-10 h-48">

                    {/* Active Customer Focus */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-4 w-48 h-48 flex items-end justify-center z-30">
                        {activeCustomer ? (
                            <CustomerVisual customer={activeCustomer} isActive={true} />
                        ) : (
                            <div className="text-white/20 font-bold text-sm animate-pulse mb-10 flex flex-col items-center">
                                <User size={32} className="mb-2 opacity-50" />
                                {t('bistro.waiting')}
                            </div>
                        )}
                    </div>

                    {/* Queue Line - Background Characters */}
                    {queue.map((c, i) => (
                        <div
                            key={c.id}
                            className="absolute bottom-6 transition-all duration-300 ease-out"
                            style={{
                                right: `${15 + (i * 12)}%`,
                                zIndex: 10 - i,
                                transform: `scale(${0.8 - (i * 0.1)}) translateX(${i * 20}px)`,
                                opacity: 1 - (i * 0.3)
                            }}
                        >
                            <CustomerVisual customer={c} isActive={false} />
                        </div>
                    ))}
                </div>

                {/* Floating Particles/Feedback */}
                {particles.map(p => (
                    <div
                        key={p.id}
                        className={`absolute font-black drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] transition-all duration-100 ${p.color} pointer-events-none`}
                        style={{ left: '50%', top: p.y, transform: `translate(-50%, -50%) scale(${p.life})`, opacity: p.life }}
                    >
                        {p.text}
                    </div>
                ))}
            </div>

            {/* --- CONTROLS --- */}
            <div className="bg-black/90 p-4 z-30 pb-safe border-t border-white/10 backdrop-blur">
                <div className="flex items-center justify-between mb-3 px-1">
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('bistro.select_dish')}</div>
                    <div className="text-[10px] text-gray-600 font-mono">{t('games.banditbistro.recipe_db_v2_0')}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {DISHES.map(dish => (
                        <button
                            key={dish.id}
                            onClick={() => handleServe(dish)}
                            disabled={!activeCustomer || gameState === 'CLOSED'}
                            className={`group relative flex items-center p-3 rounded-2xl border-2 transition-all active:scale-95 overflow-hidden ${dish.color} ${!activeCustomer ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:brightness-110 hover:shadow-[0_0_20px_currentColor] cursor-pointer'}`}
                        >
                            {/* Hover Gradient */}
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                            <div className="text-4xl mr-4 transform group-hover:scale-110 group-hover:rotate-6 transition-transform">{dish.emoji}</div>
                            <div className="text-left relative z-10">
                                <div className="font-black text-sm uppercase tracking-tight">{dish.name}</div>
                                <div className="text-[9px] opacity-70 font-mono mt-0.5 group-hover:text-white transition-colors">{t('games.banditbistro.serve_dish')}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* --- GAME OVER --- */}
            {gameState === 'CLOSED' && feedback && (
                <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-500">
                    <div className="w-24 h-24 bg-yellow-400/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                        <ChefHat size={48} className="text-yellow-400" />
                    </div>
                    <h2 className="text-4xl font-black text-white mb-2 tracking-tighter">{t('bistro.shift_complete')}</h2>
                    <div className="text-3xl text-green-400 font-mono mb-8 font-bold border-b-2 border-green-500/30 pb-2 flex items-center">
                        <DollarSign size={24} className="mr-1" />{funds} <span className="text-sm text-gray-500 ml-2 font-sans font-normal uppercase">{t('bistro.money')}</span>
                    </div>
                    <div className="bg-gray-900/80 p-6 rounded-2xl border border-white/10 text-sm text-gray-300 italic mb-8 max-w-sm shadow-xl relative overflow-hidden">
                        <Scanlines />
                        <div className="relative z-10">"{feedback}"</div>
                    </div>
                    <Button size="lg" variant="primary" onClick={() => onComplete(funds)} className="shadow-[0_0_30px_rgba(34,197,94,0.4)] px-12">{t('bistro.clock_out')}</Button>
                </div>
            )}
        </div>
    );
};
