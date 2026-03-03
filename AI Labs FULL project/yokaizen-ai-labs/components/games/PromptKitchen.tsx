import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, HardDrive, Database, Terminal, FileText, Zap, Clock, Star, AlertTriangle, CheckCircle, Package, Timer } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Difficulty, UserStats } from '../../types';
import { Button } from '../ui/Button';

// --- Types & Constants ---
interface PromptKitchenProps {
    onComplete: (score: number) => void;
    difficulty: Difficulty;
    user?: UserStats;
}

type Ingredient = 'sys_prompt' | 'context' | 'rag_data' | 'few_shot';
type StationType = 'dispenser' | 'mixer' | 'delivery' | 'trash';

interface Station {
    id: string;
    type: StationType;
    ingredient?: Ingredient; // For dispensers
    content: Ingredient[]; // For mixer/hands
    x: number;
    y: number;
}

interface Order {
    id: string;
    target: Ingredient[]; // What needs to be mixed
    name: string;
    timeLeft: number;
    maxTime: number;
}

const ITEMS: Record<Ingredient, { name: string, icon: any, color: string }> = {
    'sys_prompt': { name: 'System Prompt', icon: Terminal, color: 'text-indigo-400 border-indigo-500 bg-indigo-950' },
    'context': { name: 'Context Window', icon: FileText, color: 'text-blue-400 border-blue-500 bg-blue-950' },
    'rag_data': { name: 'RAG DB', icon: Database, color: 'text-emerald-400 border-emerald-500 bg-emerald-950' },
    'few_shot': { name: 'Few-Shot Ex.', icon: Star, color: 'text-amber-400 border-amber-500 bg-amber-950' },
};

const RECIPES = [
    { name: 'Basic Query', target: ['sys_prompt', 'context'] as Ingredient[] },
    { name: 'Grounded Answer', target: ['sys_prompt', 'context', 'rag_data'] as Ingredient[] },
    { name: 'Trained Output', target: ['sys_prompt', 'few_shot', 'few_shot'] as Ingredient[] },
    { name: 'Heavy Context', target: ['context', 'context', 'rag_data'] as Ingredient[] },
    { name: 'Complex Task', target: ['sys_prompt', 'context', 'rag_data', 'few_shot'] as Ingredient[] },
];

export const PromptKitchen: React.FC<PromptKitchenProps> = ({ onComplete }) => {
    const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');

    // Game State
    const [score, setScore] = useState(0);
    const [strikes, setStrikes] = useState(0);
    const [time, setTime] = useState(90); // 90 seconds total

    // Entities
    const [hands, setHands] = useState<Ingredient[]>([]); // Player can hold 1 item at a time (or maybe plate?) Just simple array for now
    const [mixer, setMixer] = useState<Ingredient[]>([]);

    const [orders, setOrders] = useState<Order[]>([]);

    const [logs, setLogs] = useState<string[]>(['Service starting...']);
    const log = (msg: string) => setLogs(p => [...p.slice(-3), msg]);

    // --- Core Loops ---
    useEffect(() => {
        if (gameState !== 'playing') return;

        const timer = setInterval(() => {
            setTime(prev => {
                if (prev <= 1) {
                    setGameState('gameover');
                    return 0;
                }
                return prev - 1;
            });

            // Update orders time
            setOrders(prev => {
                const updated = prev.map(o => ({ ...o, timeLeft: o.timeLeft - 1 }));

                // Check failed orders
                const failed = updated.filter(o => o.timeLeft <= 0);
                if (failed.length > 0) {
                    audio.playError();
                    setStrikes(s => s + failed.length);
                    log(`Order failed! Strike added.`);
                }

                const remaining = updated.filter(o => o.timeLeft > 0);

                // Maybe spawn new order
                if (remaining.length < 4 && Math.random() < 0.2) {
                    const template = RECIPES[Math.floor(Math.random() * RECIPES.length)];
                    remaining.push({
                        id: Math.random().toString(),
                        name: template.name,
                        target: [...template.target],
                        timeLeft: 20 + Math.floor(Math.random() * 10),
                        maxTime: 30
                    });
                    audio.playNotification();
                }

                return remaining;
            });

        }, 1000);

        return () => clearInterval(timer);
    }, [gameState]);

    useEffect(() => {
        if (strikes >= 3 && gameState === 'playing') {
            setGameState('gameover');
        }
    }, [strikes, gameState]);

    // --- Interaction ---
    const handleDispenserClick = (ing: Ingredient) => {
        if (hands.length < 1) {
            setHands([ing]);
            audio.playClick();
        } else {
            log("Hands full!");
        }
    };

    const handleMixerClick = () => {
        if (hands.length > 0) {
            // Add to mixer
            if (mixer.length < 4) {
                setMixer([...mixer, hands[0]]);
                setHands([]);
                audio.playEffect?.('liquid') || audio.playClick();
            } else {
                log("Mixer full!");
            }
        } else if (mixer.length > 0) {
            // Pick up mixed item (represented as array in hands)
            log("Mixers can't be picked up entirely yet. Deliver directly from mixer.");
        }
    };

    const handleDeliveryClick = () => {
        if (mixer.length === 0) return;

        // Check against orders
        const sortedMix = [...mixer].sort().join(',');

        const matchedOrderIdx = orders.findIndex(o => [...o.target].sort().join(',') === sortedMix);

        if (matchedOrderIdx !== -1) {
            // Success
            audio.playSuccess();
            setScore(s => s + (orders[matchedOrderIdx].target.length * 100));
            setLogs(p => [...p.slice(-3), `Delivered ${orders[matchedOrderIdx].name}!`]);

            // Remove order
            setOrders(prev => prev.filter((_, i) => i !== matchedOrderIdx));
            setMixer([]); // Clear mixer
        } else {
            // Wrong recipe
            audio.playError();
            log("Wrong recipe! Cleared mixer.");
            setStrikes(s => s + 1);
            setMixer([]);
        }
    };

    const handleTrashClick = () => {
        if (hands.length > 0) {
            setHands([]);
            audio.playClick();
            log("Trashed held item.");
        } else if (mixer.length > 0) {
            setMixer([]);
            audio.playClick();
            log("Cleared mixer.");
        }
    };

    const startGame = () => {
        setScore(0);
        setStrikes(0);
        setTime(60); // 60s round
        setHands([]);
        setMixer([]);
        setOrders([]);
        setGameState('playing');
        audio.playClick();
    };

    // --- Rendering Helpers ---
    const renderIngredientNode = (ing: Ingredient) => {
        const item = ITEMS[ing];
        const Icon = item.icon;
        return (
            <div className={`w-8 h-8 rounded border flex items-center justify-center ${item.color}`}>
                <Icon className="w-5 h-5" />
            </div>
        );
    };

    return (
        <div className="flex-1 w-full h-full flex flex-col items-center justify-center bg-zinc-950 relative font-mono overflow-hidden select-none">

            {/* Grid Background */}
            <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>

            {/* --- TOP HUD --- */}
            {gameState !== 'start' && (
                <div className="absolute top-4 left-4 right-4 z-50 flex justify-between items-start pointer-events-none">

                    {/* Time & Strikes */}
                    <div className="bg-black/80 border-4 border-gray-800 p-4 rounded-xl flex gap-8 items-center pointer-events-auto shadow-[0_5px_15px_rgba(0,0,0,0.5)]">
                        <div className="flex flex-col items-center">
                            <span className="text-gray-500 font-bold text-xs mb-1 uppercase tracking-widest">Time</span>
                            <span className={`text-4xl font-black ${time <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{time}s</span>
                        </div>
                        <div className="w-[2px] h-12 bg-gray-800"></div>
                        <div className="flex flex-col items-start gap-1">
                            <span className="text-gray-500 font-bold text-xs uppercase tracking-widest">Strikes</span>
                            <div className="flex gap-2">
                                {[1, 2, 3].map(i => (
                                    <AlertTriangle key={i} className={`w-8 h-8 ${strikes >= i ? 'text-red-500 drop-shadow-[0_0_10px_red]' : 'text-gray-800'}`} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Score */}
                    <div className="bg-emerald-950/80 border-4 border-emerald-900 p-4 rounded-xl flex flex-col items-end pointer-events-auto shadow-[0_5px_15px_rgba(0,0,0,0.5)]">
                        <span className="text-emerald-500 font-bold text-xs mb-1 uppercase tracking-widest">Revenue</span>
                        <span className="text-3xl font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">{score} XP</span>
                    </div>

                </div>
            )}

            {/* --- PLAY AREA --- */}
            {gameState !== 'start' && (
                <div className="flex-1 w-full max-w-6xl mt-24 mb-6 flex gap-6 px-4 z-10 relative">

                    {/* LEFT TICKET RAIL (Orders) */}
                    <div className="w-1/4 bg-gray-900/50 border-r-4 border-gray-800 p-4 rounded-l-2xl shadow-inner overflow-hidden flex flex-col gap-4">
                        <h2 className="text-gray-400 font-black tracking-widest border-b-2 border-gray-800 pb-2 flex items-center gap-2">
                            <Timer className="w-5 h-5" /> Incoming Requests
                        </h2>
                        <AnimatePresence>
                            {orders.map(o => (
                                <motion.div
                                    key={o.id}
                                    initial={{ x: -100, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: 100, opacity: 0 }}
                                    className="bg-white p-3 rounded shadow-[4px_4px_0_rgba(0,0,0,0.5)] border-2 border-gray-300 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gray-200">
                                        <div className={`h-full ${o.timeLeft < 10 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${(o.timeLeft / o.maxTime) * 100}%` }}></div>
                                    </div>
                                    <h3 className="text-black font-bold uppercase mt-2 mb-2">{o.name}</h3>
                                    <div className="flex gap-1 flex-wrap">
                                        {o.target.map((t, i) => (
                                            <div key={i} className="scale-75 origin-top-left -mr-2 -mb-2">
                                                {renderIngredientNode(t)}
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            ))}
                            {orders.length === 0 && (
                                <div className="text-gray-600 font-bold uppercase text-center mt-10 opacity-50">No Active Orders</div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* CENTER KITCHEN */}
                    <div className="w-2/4 flex flex-col justify-between py-4">

                        {/* Dispensers (Top) */}
                        <div className="flex justify-between gap-4">
                            {(Object.keys(ITEMS) as Ingredient[]).map(ing => {
                                const item = ITEMS[ing];
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={ing}
                                        className={`flex-1 bg-gray-900 border-4 border-gray-800 hover:border-gray-500 rounded-xl p-4 flex flex-col items-center justify-center transition-all hover:-translate-y-1 shadow-[0_8px_0_rgba(0,0,0,0.5)] active:translate-y-1 active:shadow-[0_2px_0_rgba(0,0,0,0.5)] ${item.color.replace('text-', 'hover:text-').replace('border-', 'hover:border-')}`}
                                        onClick={() => handleDispenserClick(ing)}
                                    >
                                        <Icon className={`w-12 h-12 mb-2 ${item.color.split(' ')[0]}`} />
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">{item.name}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Player Hands (Center) */}
                        <div className="flex justify-center items-center h-32 relative">
                            <div className="absolute -inset-10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),transparent)] pointer-events-none"></div>
                            <div className="w-32 h-32 rounded-full border-4 border-dashed border-gray-700 flex items-center justify-center bg-gray-950 shadow-inner">
                                {hands.length > 0 ? (
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1.5 }}>
                                        {renderIngredientNode(hands[0])}
                                    </motion.div>
                                ) : (
                                    <span className="text-gray-700 font-bold uppercase text-xs">Hands Empty</span>
                                )}
                            </div>
                        </div>

                        {/* Prep Stations (Mixer & Delivery & Trash) */}
                        <div className="flex justify-center gap-8">

                            {/* Trash */}
                            <button
                                className="w-32 h-32 bg-gray-900 border-4 border-gray-800 rounded-xl flex flex-col items-center justify-center hover:border-red-500 hover:bg-red-950 transition-colors shadow-[0_8px_0_rgba(0,0,0,0.5)] active:translate-y-1 active:shadow-none"
                                onClick={handleTrashClick}
                            >
                                <span className="text-gray-600 font-black uppercase text-xl mb-2">Trash</span>
                                <div className="text-xs text-red-500 font-bold">Clear All</div>
                            </button>

                            {/* Mixer */}
                            <button
                                className="w-48 h-32 bg-indigo-950 border-4 border-indigo-800 rounded-xl flex flex-col items-center justify-center relative shadow-[0_8px_0_rgba(0,0,0,0.5)] hover:-translate-y-1 active:translate-y-1 active:shadow-none hover:border-indigo-400 transition-all"
                                onClick={handleMixerClick}
                            >
                                <span className="absolute top-2 left-3 text-indigo-400 font-black uppercase text-xs">Mixing Context</span>
                                <div className="flex gap-2 mt-4 bg-black/50 p-2 rounded w-5/6 h-16 items-center justify-center border border-indigo-900/50">
                                    {mixer.length > 0 ? mixer.map((ing, i) => (
                                        <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }}>{renderIngredientNode(ing)}</motion.div>
                                    )) : (
                                        <span className="text-gray-600 text-xs">Empty</span>
                                    )}
                                </div>
                            </button>

                        </div>

                    </div>

                    {/* RIGHT (Delivery) */}
                    <div className="w-1/4 bg-gray-900/50 border-l-4 border-gray-800 p-4 rounded-r-2xl shadow-inner flex flex-col items-center justify-center relative">
                        {/* Delivery Chute */}
                        <button
                            className="w-full h-full bg-emerald-950 border-4 border-emerald-800 rounded-xl flex flex-col items-center justify-center shadow-[inset_0_0_50px_rgba(16,185,129,0.2)] hover:border-emerald-400 hover:bg-emerald-900 transition-all"
                            onClick={handleDeliveryClick}
                        >
                            <Package className="w-24 h-24 text-emerald-500 mb-4 drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
                            <span className="text-emerald-400 font-black uppercase text-2xl tracking-widest drop-shadow-[0_2px_2px_black]">Deliver<br />Order</span>
                            <span className="text-emerald-600 mt-4 text-xs font-bold bg-black/50 px-3 py-1 rounded">Takes from Mixer</span>
                        </button>

                        {/* Logs inline */}
                        <div className="absolute bottom-4 left-4 right-4 bg-black/80 border border-gray-800 p-2 rounded text-[10px] text-gray-500 flex flex-col justify-end h-20 pointer-events-none">
                            {logs.map((l, i) => <div key={i} className={i === logs.length - 1 ? 'text-white' : ''}>&gt; {l}</div>)}
                        </div>
                    </div>

                </div>
            )}

            {/* --- SCREENS --- */}
            <AnimatePresence>
                {gameState === 'start' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-8">
                        <div className="bg-zinc-900 border-[8px] border-amber-500 p-12 max-w-xl text-center rounded-3xl shadow-[0_0_60px_rgba(245,158,11,0.3)]">
                            <ChefHat className="w-24 h-24 mx-auto text-white mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
                            <h1 className="text-5xl font-black text-amber-400 uppercase tracking-widest mb-4">Prompt Kitchen</h1>
                            <p className="text-gray-300 text-lg mb-8 font-mono leading-relaxed bg-black/50 p-4 rounded-xl border border-gray-800">
                                1. Grab ingredients from dispensers.<br />
                                2. Combine them in the Mixer.<br />
                                3. Match the Incoming Requests.<br />
                                4. Deliver before time runs out!<br />
                                <span className="text-red-400 mt-2 block">3 Strikes and you're fired.</span>
                            </p>
                            <Button variant="primary" size="lg" className="w-full text-2xl py-6 bg-amber-500 hover:bg-amber-400 text-black border-none rounded-xl uppercase font-black" onClick={startGame}>
                                Start Shift
                            </Button>
                        </div>
                    </motion.div>
                )}

                {gameState === 'gameover' && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center p-8">
                        <h2 className="text-7xl font-black text-white uppercase tracking-widest mb-4">Shift Over</h2>
                        <p className="text-gray-400 text-2xl mb-12 font-mono">
                            {strikes >= 3 ? <span className="text-red-500">Too many failed orders! Fired.</span> : <span>Time's up! Good work.</span>}
                        </p>

                        <div className="bg-emerald-950 p-8 rounded-3xl border-4 border-emerald-500 mb-12 w-96 max-w-full text-center shadow-[0_0_50px_rgba(16,185,129,0.3)]">
                            <h3 className="text-emerald-500 font-bold uppercase mb-2 tracking-widest">Total Revenue Generated</h3>
                            <div className="text-6xl font-black text-white">{score} <span className="text-2xl text-emerald-400">XP</span></div>
                        </div>

                        <Button variant="primary" size="lg" className="px-16 py-6 text-xl bg-white hover:bg-gray-300 text-black border-none font-black uppercase" onClick={() => onComplete(score)}>
                            Return to Hub
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
