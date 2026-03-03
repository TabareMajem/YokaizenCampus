import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Home, TreePine, Sun, Moon, Sprout, MessageSquare, Briefcase, Zap, Trophy, Play } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Difficulty, UserStats } from '../../types';
import { Button } from '../ui/Button';

// --- Types & Constants ---
interface Villager {
    id: string;
    name: string;
    x: number;
    y: number;
    state: 'idle' | 'walking' | 'working' | 'celebrating';
    task?: string;
    taskProgress: number; // 0 to 100
    color: string;
}

interface Item {
    id: string;
    type: 'tree' | 'house' | 'resource';
    x: number;
    y: number;
}

interface AgentCrossingProps {
    onComplete: (score: number) => void;
    difficulty: Difficulty;
    user?: UserStats;
}

const VILLAGER_NAMES = ['Sparky', 'Gemma', 'Byte', 'Clara', 'Atlas'];
const VILLAGER_COLORS = ['bg-blue-400', 'bg-pink-400', 'bg-green-400', 'bg-purple-400', 'bg-orange-400'];

const INITIAL_VILLAGERS: Villager[] = [
    { id: 'v1', name: 'Sparky', x: 20, y: 30, state: 'idle', taskProgress: 0, color: 'bg-blue-400' },
    { id: 'v2', name: 'Gemma', x: 70, y: 40, state: 'idle', taskProgress: 0, color: 'bg-pink-400' },
    { id: 'v3', name: 'Byte', x: 40, y: 70, state: 'idle', taskProgress: 0, color: 'bg-green-400' },
];

const INITIAL_ITEMS: Item[] = [
    { id: 'h1', type: 'house', x: 50, y: 50 },
    { id: 't1', type: 'tree', x: 10, y: 10 },
    { id: 't2', type: 'tree', x: 80, y: 20 },
    { id: 't3', type: 'tree', x: 20, y: 80 },
    { id: 't4', type: 'tree', x: 85, y: 85 },
];

export const AgentCrossing: React.FC<AgentCrossingProps> = ({ onComplete }) => {
    const [gameState, setGameState] = useState<'start' | 'playing' | 'victory'>('start');
    const [timeOfDay, setTimeOfDay] = useState<'day' | 'night'>('day');
    const [time, setTime] = useState(8); // 8 AM
    const [villagers, setVillagers] = useState<Villager[]>(INITIAL_VILLAGERS);
    const [resources, setResources] = useState(0);
    const [selectedVillager, setSelectedVillager] = useState<string | null>(null);
    const [taskPrompt, setTaskPrompt] = useState('');
    const targetResources = 1000;

    // --- Game Loop (Time & AI Simulation) ---
    useEffect(() => {
        if (gameState !== 'playing') return;

        const tick = setInterval(() => {
            // Update Time
            setTime(prev => {
                const next = prev + 0.1; // FAST time progression
                if (next >= 18 && prev < 18) setTimeOfDay('night');
                if (next >= 24) {
                    setTimeOfDay('day');
                    return 0; // New day
                }
                return next;
            });

            // Update Villagers
            setVillagers(prev => prev.map(v => {
                if (v.state === 'working') {
                    const newProgress = v.taskProgress + (Math.random() * 5);
                    if (newProgress >= 100) {
                        // Task Complete
                        audio.playSuccess();
                        setResources(r => {
                            const newR = r + 100;
                            if (newR >= targetResources) setTimeout(() => setGameState('victory'), 1000);
                            return newR;
                        });
                        return { ...v, state: 'celebrating', taskProgress: 0, task: undefined };
                    }
                    return { ...v, taskProgress: newProgress };
                }

                if (v.state === 'celebrating') {
                    if (Math.random() > 0.8) return { ...v, state: 'idle' };
                    return v;
                }

                if (v.state === 'idle') {
                    // Random wandering
                    if (Math.random() > 0.95) {
                        return {
                            ...v,
                            state: 'walking',
                            x: Math.max(0, Math.min(90, v.x + (Math.random() * 10 - 5))),
                            y: Math.max(0, Math.min(90, v.y + (Math.random() * 10 - 5)))
                        };
                    }
                }

                if (v.state === 'walking') {
                    if (Math.random() > 0.8) return { ...v, state: 'idle' };
                }

                return v;
            }));

        }, 1000); // 1 tick per second

        return () => clearInterval(tick);
    }, [gameState]);

    // --- Assigning Tasks ---
    const assignTask = () => {
        if (!selectedVillager || !taskPrompt.trim()) return;
        audio.playNotification();

        setVillagers(prev => prev.map(v => {
            if (v.id === selectedVillager) {
                return { ...v, state: 'working', task: taskPrompt, taskProgress: 0 };
            }
            return v;
        }));
        setTaskPrompt('');
        setSelectedVillager(null);
    };

    // --- Format Time ---
    const formattedTime = () => {
        const hrs = Math.floor(time);
        const mins = Math.floor((time - hrs) * 60).toString().padStart(2, '0');
        return `${hrs === 0 ? 12 : (hrs > 12 ? hrs - 12 : hrs)}:${mins} ${hrs >= 12 ? 'PM' : 'AM'}`;
    };

    return (
        <div className="flex-1 w-full h-full flex flex-col items-center justify-center bg-gray-950 relative overflow-hidden font-sans">

            {/* Environment Background */}
            <div className={`absolute inset-0 transition-colors duration-1000 ${timeOfDay === 'day' ? 'bg-amber-100/10' : 'bg-indigo-950/60'}`}></div>

            {/* --- TOP HUD --- */}
            {gameState !== 'start' && (
                <div className="absolute top-4 w-full px-6 flex justify-between items-start z-50">
                    {/* Time & Weather widget */}
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-lg flex items-center gap-4">
                        {timeOfDay === 'day' ? <Sun className="text-yellow-400 animate-spin-slow w-8 h-8" /> : <Moon className="text-cyan-200 w-8 h-8" />}
                        <div>
                            <div className="text-white font-bold text-xl">{formattedTime()}</div>
                            <div className="text-gray-300 text-sm">{timeOfDay === 'day' ? 'Sunny' : 'Clear Sky'}</div>
                        </div>
                    </div>

                    {/* Resources widget */}
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-lg flex flex-col items-center min-w-[150px]">
                        <div className="text-gray-300 text-sm font-bold tracking-wider uppercase mb-1 flex items-center gap-2"><Sprout className="w-4 h-4 text-green-400" /> Town Yield</div>
                        <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-emerald-500">
                            {resources} <span className="text-lg text-gray-400">/ {targetResources}</span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full h-2 bg-gray-800 rounded-full mt-2 overflow-hidden">
                            <div className="h-full bg-green-400 transition-all duration-500" style={{ width: `${(resources / targetResources) * 100}%` }}></div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- ISOMETRIC VILLAGE (2.5D) --- */}
            <div className="relative w-full max-w-4xl h-[70vh] perspective-[800px] flex items-center justify-center" onClick={() => setSelectedVillager(null)}>
                <div
                    className="relative w-full h-full max-w-2xl max-h-[600px] rounded-[3rem] border-8 border-emerald-900/50 shadow-[0_30px_60px_rgba(0,0,0,0.6)] overflow-hidden bg-gradient-to-br from-green-500 to-emerald-700 transform rotateX-45 transition-all duration-1000"
                    style={{ transform: 'rotateX(50deg) rotateZ(0deg)', transformStyle: 'preserve-3d' }}
                >
                    {/* Dirt Paths */}
                    <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] rounded-full border-[20px] border-yellow-700/30 blur-sm"></div>

                    {/* Render Static Items */}
                    {INITIAL_ITEMS.map(item => (
                        <div
                            key={item.id}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                            style={{ left: `${item.x}%`, top: `${item.y}%`, transform: 'rotateX(-50deg)' }}
                        >
                            {item.type === 'house' && (
                                <div className="text-center drop-shadow-2xl flex flex-col items-center">
                                    <Home className="w-32 h-32 text-amber-200 fill-amber-700" />
                                    <div className="w-20 h-4 bg-black/40 blur-md rounded-full mt-[-10px]"></div>
                                </div>
                            )}
                            {item.type === 'tree' && (
                                <div className="text-center drop-shadow-xl flex flex-col items-center">
                                    <TreePine className="w-24 h-24 text-green-900 fill-emerald-500" />
                                    <div className="w-12 h-3 bg-black/40 blur-md rounded-full mt-[-10px]"></div>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Render Villagers */}
                    {villagers.map(v => (
                        <motion.div
                            key={v.id}
                            className="absolute cursor-pointer group z-20"
                            animate={{ left: `${v.x}%`, top: `${v.y}%` }}
                            transition={{ type: 'tween', duration: 1 }}
                            onClick={(e) => { e.stopPropagation(); setSelectedVillager(v.id); audio.playClick(); }}
                            style={{ transform: 'rotateX(-50deg)' }}
                        >
                            <div className="flex flex-col items-center relative">

                                {/* Status Icon Floating */}
                                <AnimatePresence>
                                    {v.state === 'working' && (
                                        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: -10, opacity: 1 }} exit={{ opacity: 0 }} className="absolute -top-10 bg-white p-2 rounded-full shadow-lg border border-gray-200">
                                            <Briefcase className="w-4 h-4 text-blue-500" />
                                        </motion.div>
                                    )}
                                    {v.state === 'celebrating' && (
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute -top-10 text-2xl">
                                            🎉
                                        </motion.div>
                                    )}
                                    {selectedVillager === v.id && v.state === 'idle' && (
                                        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: -10, opacity: 1 }} exit={{ opacity: 0 }} className="absolute -top-10 bg-white p-2 rounded-full shadow-lg border border-electric">
                                            <MessageSquare className="w-4 h-4 text-electric" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Character Sprite */}
                                <motion.div
                                    className={`w-14 h-16 rounded-3xl ${v.color} border-4 ${selectedVillager === v.id ? 'border-white shadow-[0_0_20px_white]' : 'border-gray-900 shadow-xl'} flex items-center justify-center overflow-hidden`}
                                    animate={{
                                        y: (v.state === 'walking' || v.state === 'celebrating') ? [0, -10, 0] : 0,
                                        rotate: v.state === 'working' ? [-5, 5, -5] : 0
                                    }}
                                    transition={{ repeat: Infinity, duration: v.state === 'celebrating' ? 0.4 : 0.8 }}
                                >
                                    <Bot className={`w-8 h-8 text-white ${v.state === 'working' ? 'animate-pulse' : ''}`} />
                                </motion.div>

                                {/* Shadow bounding */}
                                <div className="w-10 h-3 bg-black/40 blur-sm rounded-full mt-2"></div>

                                {/* Nameplate */}
                                <div className="mt-2 text-xs font-bold text-white bg-black/60 px-2 py-1 rounded-full whitespace-nowrap backdrop-blur-sm">
                                    {v.name}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* --- ACTION PANEL (Assign Task) --- */}
            <AnimatePresence>
                {selectedVillager && gameState === 'playing' && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="absolute bottom-6 w-full max-w-2xl px-4 z-50"
                    >
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                    <Bot className="text-electric w-8 h-8" />
                                    Assign Task to {villagers.find(v => v.id === selectedVillager)?.name}
                                </h3>
                                <Button variant="ghost" onClick={() => setSelectedVillager(null)}>Cancel</Button>
                            </div>

                            {villagers.find(v => v.id === selectedVillager)?.state === 'working' ? (
                                <div className="bg-blue-900/50 border border-blue-500/50 p-4 rounded-xl flex items-center gap-4">
                                    <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                                    <div className="flex-1">
                                        <div className="text-blue-100 font-bold mb-1">Currently Outputting:</div>
                                        <div className="text-gray-300 italic text-sm">"{villagers.find(v => v.id === selectedVillager)?.task}"</div>
                                        <div className="w-full bg-black/50 h-2 rounded-full mt-2">
                                            <div className="bg-blue-400 h-full rounded-full transition-all duration-300" style={{ width: `${villagers.find(v => v.id === selectedVillager)?.taskProgress}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        autoFocus
                                        value={taskPrompt}
                                        onChange={e => setTaskPrompt(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && assignTask()}
                                        placeholder="e.g. Gather data on vector embeddings..."
                                        className="flex-1 bg-gray-900/80 border border-gray-700 p-4 rounded-xl text-white focus:outline-none focus:border-electric transition-colors"
                                    />
                                    <Button variant="primary" onClick={assignTask} disabled={!taskPrompt.trim()} className="px-8 rounded-xl shadow-[0_0_15px_rgba(196,95,255,0.4)]">
                                        Deploy <Zap className="w-5 h-5 ml-2" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- SCREENS --- */}
            <AnimatePresence>
                {gameState === 'start' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 z-[100] flex flex-col items-center justify-center backdrop-blur-md">
                        <div className="bg-white/10 p-12 rounded-[3rem] border border-white/20 shadow-2xl flex flex-col items-center text-center max-w-lg">
                            <Home className="w-24 h-24 text-green-400 mb-6 drop-shadow-[0_0_30px_rgba(74,222,128,0.8)]" />
                            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 mb-4">Agent Crossing</h1>
                            <p className="text-gray-300 text-lg mb-8">Manage a village of autonomous AI agents. Assign them complex logic tasks to harvest yield and build the ultimate civilization.</p>
                            <Button variant="primary" size="lg" className="w-full text-xl py-6 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 border-none shadow-[0_0_30px_rgba(16,185,129,0.5)] text-white font-bold" onClick={() => setGameState('playing')}>
                                <Play className="w-6 h-6 mr-3 fill-white" /> Enter Village
                            </Button>
                        </div>
                    </motion.div>
                )}

                {gameState === 'victory' && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 bg-green-950/90 z-[100] flex flex-col items-center justify-center backdrop-blur-md p-6">
                        <Trophy className="w-32 h-32 text-yellow-400 mb-6 drop-shadow-[0_0_50px_rgba(250,204,21,0.8)] animate-bounce" />
                        <h2 className="text-6xl font-black text-white mb-2 drop-shadow-[0_0_20px_rgba(74,222,128,0.5)] text-center">Utopia Achieved!</h2>
                        <p className="text-green-200 text-2xl mb-8 text-center max-w-md">Your autonomous agents have successfully maximized the yield parameter.</p>
                        <Button variant="primary" size="lg" className="bg-yellow-500 hover:bg-yellow-400 text-black border-none text-xl px-12 py-6 rounded-2xl shadow-[0_0_30px_rgba(250,204,21,0.6)] font-black" onClick={() => onComplete(1500)}>
                            Claim Reward (+1500 XP)
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};
