import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Zap, Cpu, Server, Droplet, DollarSign, Package, ShoppingCart, Activity, Play } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Difficulty, UserStats } from '../../types';
import { Button } from '../ui/Button';

// --- Types & Constants ---
interface SiliconValleyProps {
    onComplete: (score: number) => void;
    difficulty: Difficulty;
    user?: UserStats;
}

type CropState = 'empty' | 'seed' | 'growing' | 'mature';
type Tool = 'plant' | 'water' | 'harvest';

interface Plot {
    id: number;
    state: CropState;
    watered: boolean;
    progress: number; // 0 to 100
}

const GRID_SIZE = 4; // 4x4 farming grid
const DAY_LENGTH = 15000; // 15 seconds real time = 1 in-game day

export const SiliconValley: React.FC<SiliconValleyProps> = ({ onComplete }) => {
    const [gameState, setGameState] = useState<'start' | 'playing' | 'end'>('start');

    // Farm State
    const [plots, setPlots] = useState<Plot[]>(Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => ({
        id: i, state: 'empty', watered: false, progress: 0
    })));

    // Player State
    const [day, setDay] = useState(1);
    const [timeOfDay, setTimeOfDay] = useState(0); // 0 to 1
    const [tokens, setTokens] = useState(100);
    const [seeds, setSeeds] = useState(5);
    const [activeTool, setActiveTool] = useState<Tool>('plant');

    // Logs
    const [logs, setLogs] = useState<string[]>(['Welcome to Silicon Valley.']);

    const log = (msg: string) => setLogs(p => [...p.slice(-3), msg]);

    // --- Time Loop ---
    useEffect(() => {
        if (gameState !== 'playing') return;

        const interval = setInterval(() => {
            setTimeOfDay(prev => {
                const next = prev + (100 / DAY_LENGTH); // Advance time

                if (next >= 1) {
                    endDay();
                    return 0;
                }
                return next;
            });
        }, 100);

        return () => clearInterval(interval);
    }, [gameState, plots]);

    const endDay = () => {
        setDay(d => d + 1);
        log(`Day ${day + 1} begins. Server racks processed workload.`);
        audio.playNotification();

        // Grow Crops
        setPlots(prev => prev.map(p => {
            if (p.state === 'empty') return p;

            // If watered, grow faster
            const growthRate = p.watered ? 50 : 20;
            const newProgress = p.progress + growthRate;

            let newState = p.state;
            if (newProgress >= 50 && p.state === 'seed') newState = 'growing';
            if (newProgress >= 100) newState = 'mature';

            return {
                ...p,
                progress: Math.min(100, newProgress),
                state: newState,
                watered: false // Dry out overnight
            };
        }));

        // End Game Condition
        if (day >= 7) {
            setTimeout(() => setGameState('end'), 1000);
        }
    };

    // --- Interaction ---
    const handlePlotClick = (id: number) => {
        if (gameState !== 'playing') return;

        setPlots(prev => prev.map(p => {
            if (p.id !== id) return p;

            if (activeTool === 'plant') {
                if (p.state === 'empty' && seeds > 0) {
                    setSeeds(s => s - 1);
                    audio.playClick();
                    log("Planted new Tensor Node.");
                    return { ...p, state: 'seed', progress: 0 };
                }
            }

            if (activeTool === 'water') {
                if (p.state !== 'empty' && !p.watered) {
                    audio.playEffect?.('liquid') || audio.playClick();
                    log("Cooled server rack.");
                    return { ...p, watered: true };
                }
            }

            if (activeTool === 'harvest') {
                if (p.state === 'mature') {
                    const yieldTokens = 150 + Math.floor(Math.random() * 50);
                    setTokens(t => t + yieldTokens);
                    audio.playLevelUp();
                    log(`Harvested ${yieldTokens} Tokens from mature node!`);

                    // Create floating text effect visually later if needed
                    return { ...p, state: 'empty', progress: 0, watered: false };
                }
            }

            return p;
        }));
    };

    const buySeeds = () => {
        if (tokens >= 50) {
            setTokens(t => t - 50);
            setSeeds(s => s + 3);
            audio.playClick();
            log("Bought 3x Tensor Node seeds.");
        } else {
            audio.playError();
            log("Not enough tokens.");
        }
    };

    const startGame = () => {
        setPlots(Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => ({ id: i, state: 'empty', watered: false, progress: 0 })));
        setDay(1);
        setTimeOfDay(0);
        setTokens(100);
        setSeeds(5);
        setGameState('playing');
        audio.playClick();
    };

    // --- Render Helpers ---
    const getPlotContent = (p: Plot) => {
        switch (p.state) {
            case 'seed': return <Cpu className="w-8 h-8 text-gray-400 opacity-50 drop-shadow-[0_2px_2px_black]" />;
            case 'growing': return <Server className="w-10 h-10 text-emerald-300 drop-shadow-[0_2px_2px_black]" />;
            case 'mature': return <Database className="w-12 h-12 text-cyan-400 drop-shadow-[0_0_15px_cyan] animate-pulse" />;
            default: return null;
        }
    };

    return (
        <div className="flex-1 w-full h-full flex flex-col items-center justify-center bg-sky-900 relative font-mono overflow-hidden select-none">

            {/* Day/Sunset Background Transition */}
            <div className="absolute inset-0 z-0 transition-colors duration-1000" style={{
                backgroundColor: `hsl(210, 50%, ${Math.max(10, 30 - (timeOfDay * 25))}%)`
            }}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-500/10 via-transparent to-black" style={{ opacity: timeOfDay }}></div>
            </div>

            {/* --- HUD --- */}
            {gameState !== 'start' && (
                <div className="absolute top-4 left-4 right-4 z-50 flex justify-between items-start pointer-events-none">

                    {/* Status Box */}
                    <div className="bg-black/80 border-4 border-emerald-900 p-4 rounded-xl shadow-[8px_8px_0_rgba(0,0,0,0.5)] pointer-events-auto">
                        <div className="flex gap-6 items-center">
                            <div>
                                <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
                                    <Activity className="w-6 h-6 text-emerald-400" /> Day {day} / 7
                                </h2>
                                {/* Time Bar */}
                                <div className="w-full h-2 bg-gray-800 mt-2 border border-gray-600 rounded">
                                    <div className="h-full bg-yellow-400 transition-all duration-300" style={{ width: `${timeOfDay * 100}%` }}></div>
                                </div>
                            </div>

                            <div className="w-[2px] h-10 bg-gray-700"></div>

                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-cyan-400 font-bold text-lg">
                                    <DollarSign className="w-5 h-5" /> {tokens}
                                </div>
                                <div className="flex items-center gap-2 text-rose-400 font-bold">
                                    <Package className="w-5 h-5" /> {seeds} Seeds
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Store Box */}
                    <div className="bg-black/80 border-4 border-cyan-900 p-3 rounded-xl shadow-[8px_8px_0_rgba(0,0,0,0.5)] pointer-events-auto flex items-center gap-4">
                        <Button variant="ghost" className="bg-cyan-950 text-cyan-300 hover:bg-cyan-900 border-2 border-cyan-500 font-bold" onClick={buySeeds}>
                            <ShoppingCart className="w-4 h-4 mr-2" /> Buy Seeds (50T)
                        </Button>
                    </div>

                </div>
            )}

            {/* --- PLAY AREA --- */}
            {gameState !== 'start' && (
                <div className="flex gap-12 z-10 items-center">

                    {/* Toolbar */}
                    <div className="bg-black/80 border-4 border-gray-800 p-3 rounded-xl shadow-[8px_8px_0_rgba(0,0,0,0.5)] flex flex-col gap-4">
                        <Tooltip content="Plant Seed (Cost: 1 Seed)">
                            <button
                                className={`w-16 h-16 rounded-lg border-2 flex items-center justify-center transition-all
                                    ${activeTool === 'plant' ? 'bg-rose-950 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)] scale-110' : 'bg-gray-900 border-gray-700 hover:bg-gray-800'}
                                    ${seeds === 0 ? 'opacity-50 grayscale' : ''}
                                `}
                                onClick={() => setActiveTool('plant')}
                            >
                                <Cpu className={`w-8 h-8 ${activeTool === 'plant' ? 'text-rose-400' : 'text-gray-400'}`} />
                            </button>
                        </Tooltip>

                        <Tooltip content="Cool Server (Speed up growth)">
                            <button
                                className={`w-16 h-16 rounded-lg border-2 flex items-center justify-center transition-all
                                    ${activeTool === 'water' ? 'bg-blue-950 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-110' : 'bg-gray-900 border-gray-700 hover:bg-gray-800'}
                                `}
                                onClick={() => setActiveTool('water')}
                            >
                                <Droplet className={`w-8 h-8 ${activeTool === 'water' ? 'text-blue-400' : 'text-gray-400'}`} />
                            </button>
                        </Tooltip>

                        <Tooltip content="Harvest Tokens (Requires mature server)">
                            <button
                                className={`w-16 h-16 rounded-lg border-2 flex items-center justify-center transition-all
                                    ${activeTool === 'harvest' ? 'bg-amber-950 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-110' : 'bg-gray-900 border-gray-700 hover:bg-gray-800'}
                                `}
                                onClick={() => setActiveTool('harvest')}
                            >
                                <Zap className={`w-8 h-8 ${activeTool === 'harvest' ? 'text-amber-400' : 'text-gray-400'}`} />
                            </button>
                        </Tooltip>
                    </div>

                    {/* Isometric Farm Grid */}
                    <div className="relative w-[500px] h-[500px] perspective-[1000px]">
                        <div
                            className="w-full h-full bg-emerald-950/80 border-[8px] border-emerald-900 rounded-2xl grid p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                            style={{
                                transform: 'rotateX(55deg) rotateZ(45deg)',
                                transformStyle: 'preserve-3d',
                                gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                                gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
                                gap: '8px'
                            }}
                        >
                            {plots.map(p => (
                                <div
                                    key={p.id}
                                    className={`relative rounded flex items-center justify-center cursor-pointer transition-colors border-2
                                        ${p.watered ? 'bg-indigo-900/60 border-indigo-500' : 'bg-green-900/40 border-green-800/50 hover:bg-green-800/60'}
                                    `}
                                    onClick={() => handlePlotClick(p.id)}
                                >
                                    {/* Standee Content */}
                                    <div
                                        className="absolute flex flex-col items-center justify-end w-16 h-24 origin-bottom"
                                        style={{ transform: 'rotateZ(-45deg) rotateX(-55deg) translateZ(10px)' }}
                                    >
                                        {/* Growth Bar */}
                                        {p.state !== 'empty' && p.state !== 'mature' && (
                                            <div className="w-8 h-1 bg-black/50 border border-gray-600 mb-2 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-400" style={{ width: `${p.progress}%` }}></div>
                                            </div>
                                        )}

                                        {/* Crop Sprite */}
                                        <div className={`transition-all ${p.state === 'mature' ? 'animate-bounce' : ''}`}>
                                            {getPlotContent(p)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Logs */}
                    <div className="bg-black/80 border-4 border-gray-800 p-4 rounded-xl shadow-[8px_8px_0_rgba(0,0,0,0.5)] w-80 h-48 flex flex-col justify-end text-sm font-mono self-end">
                        {logs.map((l, i) => (
                            <div key={i} className={`mb-1 opacity-${i === logs.length - 1 ? '100 text-white font-bold' : (i === logs.length - 2 ? '70 text-gray-400' : '40 text-gray-500')}`}>
                                &gt; {l}
                            </div>
                        ))}
                    </div>

                </div>
            )}

            {/* --- SCREENS --- */}
            <AnimatePresence>
                {gameState === 'start' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-8">
                        <div className="bg-sky-950 border-4 border-sky-600 p-12 max-w-lg text-center rounded-3xl shadow-[0_0_50px_rgba(2,132,199,0.5)]">
                            <Server className="w-24 h-24 mx-auto text-sky-400 mb-6 drop-shadow-[0_0_20px_rgba(56,189,248,0.8)]" />
                            <h1 className="text-5xl font-black text-white uppercase tracking-widest mb-4 font-serif">Silicon Valley</h1>
                            <p className="text-sky-200 text-lg mb-8 leading-relaxed font-mono">
                                Inherited your grandfather's old server racks. Plant Tensor Nodes, cool them with liquid, and harvest data tokens. Maximize profit before Day 7 ends.
                            </p>
                            <Button variant="primary" size="lg" className="w-full text-xl py-6 bg-sky-500 hover:bg-sky-400 text-black border-none rounded-xl uppercase font-black" onClick={startGame}>
                                Start Farming <Play className="ml-2 w-6 h-6 fill-black" />
                            </Button>
                        </div>
                    </motion.div>
                )}

                {gameState === 'end' && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 bg-amber-950/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-8 border-[12px] border-amber-500">
                        <DollarSign className="w-32 h-32 text-amber-400 mb-6 drop-shadow-[0_0_40px_rgba(251,191,36,1)]" />
                        <h2 className="text-6xl font-black text-white uppercase tracking-widest drop-shadow-[0_0_20px_rgba(251,191,36,0.5)] mb-4 font-serif text-center">Harvest<br />Complete</h2>

                        <div className="bg-black/50 p-6 rounded-2xl border-4 border-amber-500/30 mb-8 max-w-sm w-full">
                            <h3 className="text-amber-500 font-bold uppercase mb-4 tracking-widest text-center text-sm">FINAL YIELD</h3>
                            <div className="flex justify-between items-center text-white text-3xl font-black font-mono">
                                <span><DollarSign className="inline w-8 h-8 text-amber-400 -mt-2" /> TOTAL:</span>
                                <span>{tokens}</span>
                            </div>
                        </div>

                        <Button variant="primary" size="lg" className="px-16 py-6 text-2xl bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_30px_#fbbf24] border-none font-black uppercase rounded-2xl" onClick={() => onComplete(tokens)}>
                            Return to Hub
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Quick inline Tooltip hook since we don't have global standard
const Tooltip = ({ children, content }: { children: React.ReactNode, content: string }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="relative flex items-center" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
            {children}
            <AnimatePresence>
                {show && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="absolute left-20 whitespace-nowrap bg-black text-white text-xs font-bold py-1 px-3 rounded border border-gray-700 z-50">
                        {content}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
