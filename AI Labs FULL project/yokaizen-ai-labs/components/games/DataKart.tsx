import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, AlertTriangle, FastForward, Shield, Trophy } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Difficulty, UserStats } from '../../types';
import { Button } from '../ui/Button';

// --- Types & Constants ---
const LANES = [0, 1, 2]; // Left, Center, Right
const GAME_SPEED = 20; // ms interval for game loop
const OBSTACLE_SPEED = 2; // % down per tick

interface Entity {
    id: string;
    lane: number;
    y: number; // 0 (top) to 100 (bottom)
    type: 'BUG' | 'BOOST' | 'FIREWALL';
}

interface DataKartProps {
    onComplete: (score: number) => void;
    difficulty: Difficulty;
    user?: UserStats;
}

export const DataKart: React.FC<DataKartProps> = ({ onComplete, difficulty, user }) => {
    // --- State ---
    const [gameState, setGameState] = useState<'start' | 'playing' | 'drifting' | 'gameover' | 'victory'>('start');
    const [playerLane, setPlayerLane] = useState(1);
    const [entities, setEntities] = useState<Entity[]>([]);
    const [score, setScore] = useState(0);
    const [hp, setHp] = useState(3);
    const [speedMultiplier, setSpeedMultiplier] = useState(1);

    // Mechanics
    const [distance, setDistance] = useState(0);
    const targetDistance = 1000;
    const [driftInput, setDriftInput] = useState('');
    const [driftTimeLeft, setDriftTimeLeft] = useState(10);
    const lastRenderTime = useRef(0);

    // --- Game Loop ---
    useEffect(() => {
        if (gameState !== 'playing') return;

        let frameId: number;

        const loop = (time: number) => {
            if (time - lastRenderTime.current > GAME_SPEED) {
                lastRenderTime.current = time;
                tick();
            }
            frameId = requestAnimationFrame(loop);
        };

        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, [gameState, entities, playerLane, speedMultiplier]);

    const tick = useCallback(() => {
        setDistance(prev => {
            const newDist = prev + (1 * speedMultiplier);
            if (newDist >= targetDistance) {
                setGameState('victory');
                audio.playLevelUp();
                return targetDistance;
            }
            // Trigger Drift Event every 300 distance
            if (Math.floor(newDist) % 300 === 0 && newDist > 0 && newDist < targetDistance) {
                triggerDrift();
            }
            return newDist;
        });

        // Spawn Entities
        if (Math.random() < (0.05 * speedMultiplier)) {
            const isBoost = Math.random() > 0.7;
            const newEntity: Entity = {
                id: Math.random().toString(),
                lane: LANES[Math.floor(Math.random() * LANES.length)],
                y: 0,
                type: isBoost ? 'BOOST' : (Math.random() > 0.8 ? 'FIREWALL' : 'BUG')
            };
            setEntities(prev => [...prev, newEntity]);
        }

        // Move Entities & Check Collision
        setEntities(prev => {
            const nextEntities: Entity[] = [];
            for (const e of prev) {
                const newY = e.y + (OBSTACLE_SPEED * speedMultiplier);

                // Collision Zone (bottom 80-95%)
                if (newY > 80 && newY < 95 && e.lane === playerLane) {
                    handleCollision(e);
                    // Entity destroyed on hit
                    continue;
                }

                if (newY < 120) {
                    nextEntities.push({ ...e, y: newY });
                }
            }
            return nextEntities;
        });

    }, [playerLane, speedMultiplier]);

    const handleCollision = (entity: Entity) => {
        if (entity.type === 'BOOST') {
            audio.playSuccess();
            setScore(s => s + 50);
        } else {
            audio.playError();
            setHp(h => {
                const nextHp = h - 1;
                if (nextHp <= 0) setGameState('gameover');
                return nextHp;
            });
            // Screen shake effect
            document.getElementById('kart-track')?.classList.add('animate-shake');
            setTimeout(() => document.getElementById('kart-track')?.classList.remove('animate-shake'), 300);
        }
    };

    const triggerDrift = () => {
        audio.playNotification();
        setGameState('drifting');
        setDriftInput('');
        setDriftTimeLeft(7);
        // Clear entities so you don't instantly die after drift
        setEntities([]);
    };

    // --- Controls ---
    useEffect(() => {
        if (gameState !== 'playing') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' || e.key === 'a') {
                setPlayerLane(l => Math.max(0, l - 1));
            } else if (e.key === 'ArrowRight' || e.key === 'd') {
                setPlayerLane(l => Math.min(2, l + 1));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState]);

    // --- Drift Timer ---
    useEffect(() => {
        if (gameState !== 'drifting') return;

        const timer = setInterval(() => {
            setDriftTimeLeft(t => {
                if (t <= 1) {
                    executeDrift();
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, driftInput]);

    const executeDrift = () => {
        const input = driftInput.toLowerCase();
        let boostAmt = 1.0;
        let scoreAdd = 0;

        if (input.includes('optimize') || input.includes('cache') || input.includes('vector')) {
            audio.playDataStream();
            boostAmt = 1.5;
            scoreAdd = 200;
        } else if (input.length > 5) {
            audio.playSuccess();
            boostAmt = 1.2;
            scoreAdd = 50;
        } else {
            audio.playError();
            boostAmt = 0.8; // Penalty
        }

        setSpeedMultiplier(boostAmt);
        setScore(s => s + scoreAdd);
        setGameState('playing');

        // Return to normal speed after 5 seconds
        setTimeout(() => setSpeedMultiplier(1.0), 5000);
    };

    const resetGame = () => {
        setHp(3);
        setDistance(0);
        setScore(0);
        setSpeedMultiplier(1);
        setEntities([]);
        setPlayerLane(1);
        setGameState('playing');
    };

    return (
        <div className="flex-1 w-full h-full flex flex-col items-center justify-center bg-gray-950 relative overflow-hidden font-mono">

            {/* --- TRACK SCENE --- */}
            <div id="kart-track" className="relative w-full max-w-3xl h-full perspective-[1000px] flex justify-center">

                {/* Retro Sun / Horizon */}
                <div className="absolute top-0 w-full h-1/3 bg-gradient-to-b from-indigo-900 to-fuchsia-900 border-b-4 border-electric shadow-[0_4px_50px_rgba(196,95,255,0.6)] flex items-end justify-center overflow-hidden z-0">
                    <div className="w-64 h-64 rounded-full bg-gradient-to-b from-yellow-400 to-pink-600 mb-[-128px] shadow-[0_0_100px_rgba(236,72,153,0.8)]">
                        {/* Sun Lines */}
                        <div className="w-full h-2 bg-fuchsia-900 mt-32"></div>
                        <div className="w-full h-3 bg-fuchsia-900 mt-4"></div>
                        <div className="w-full h-4 bg-fuchsia-900 mt-6"></div>
                        <div className="w-full h-6 bg-fuchsia-900 mt-8"></div>
                    </div>
                </div>

                {/* 3D Track Floor */}
                <div
                    className="absolute bottom-0 w-[150%] h-[70%] origin-bottom bg-gray-900 border-x-4 border-electric shadow-[inset_0_0_100px_rgba(0,0,0,1)] flex z-10"
                    style={{ transform: 'rotateX(70deg)' }}
                >
                    {/* Grid Lines (Animated via CSS) */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(196,95,255,0.4)_2px,transparent_2px),linear-gradient(90deg,rgba(196,95,255,0.4)_2px,transparent_2px)] bg-[size:100px_100px] animate-[scroll-grid_2s_linear_infinite]"
                        style={{ animationDuration: `${2 / speedMultiplier}s` }} />

                    {/* Lane Dividers */}
                    <div className="absolute left-1/3 top-0 bottom-0 w-2 bg-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
                    <div className="absolute left-2/3 top-0 bottom-0 w-2 bg-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
                </div>

                {/* --- 2D ENTITIES OVERLAY --- */}
                <div className="absolute bottom-0 w-full max-w-lg h-[70%] z-20 pointer-events-none">
                    <AnimatePresence>
                        {entities.map(e => {
                            // Convert 3D depth to 2D scale/position
                            const scale = 0.2 + (e.y / 100) * 0.8;
                            const leftPct = (e.lane * 33.33) + 16.66;

                            return (
                                <motion.div
                                    key={e.id}
                                    className="absolute transform -translate-x-1/2"
                                    style={{
                                        left: `${leftPct}%`,
                                        top: `${e.y}%`,
                                        scale,
                                        opacity: e.y < 10 ? e.y / 10 : 1 // fade in at horizon
                                    }}
                                >
                                    {e.type === 'BUG' && <div className="p-3 bg-red-600 rounded-lg border-2 border-red-300 shadow-[0_0_20px_red]"><AlertTriangle className="text-white" /></div>}
                                    {e.type === 'FIREWALL' && <div className="w-20 h-8 bg-orange-500 border-4 border-orange-200 shadow-[0_0_20px_orange]"></div>}
                                    {e.type === 'BOOST' && <div className="p-3 bg-green-500 rounded-full border-2 border-white shadow-[0_0_30px_lime]"><Zap className="text-white" /></div>}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {/* --- PLAYER KART --- */}
                <div className="absolute bottom-10 w-full max-w-lg h-32 z-30 pointer-events-none">
                    <motion.div
                        className="absolute bottom-0 w-24 h-24 transform -translate-x-1/2"
                        animate={{ left: `${(playerLane * 33.33) + 16.66}%` }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                        {/* Kart Graphic */}
                        <div className="relative w-full h-full flex flex-col items-center justify-end">
                            <div className="w-16 h-8 bg-cyan-400 rounded-t-xl border-t-2 border-white shadow-[0_0_20px_rgba(34,211,238,0.8)] relative z-10 flex items-center justify-center">
                                <div className="w-10 h-4 bg-black/50 rounded-full"></div> {/* Windshield */}
                            </div>
                            <div className="w-20 h-6 bg-blue-600 rounded-b-md border-b-2 border-blue-400 relative z-10 flex justify-between px-2 items-center">
                                <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_10px_red] animate-pulse"></div>
                                <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_10px_red] animate-pulse"></div>
                            </div>
                            {/* Wheels */}
                            <div className="absolute bottom-1 -left-2 w-6 h-8 bg-gray-950 rounded-sm z-0 border-2 border-gray-700"></div>
                            <div className="absolute bottom-1 -right-2 w-6 h-8 bg-gray-950 rounded-sm z-0 border-2 border-gray-700"></div>

                            {/* Thruster Flames */}
                            {speedMultiplier > 1 && (
                                <div className="absolute -bottom-6 flex gap-2 z-0">
                                    <div className="w-4 h-8 bg-blue-400 blur-sm rounded-full animate-pulse shadow-[0_0_20px_cyan]"></div>
                                    <div className="w-4 h-8 bg-blue-400 blur-sm rounded-full animate-pulse shadow-[0_0_20px_cyan]"></div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* --- HUD ALERTS --- */}
                {
                    speedMultiplier > 1 && (
                        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-cyan-300 font-black italic text-4xl drop-shadow-[0_0_10px_cyan] z-40 animate-pulse uppercase tracking-widest">
                            DRIFT BOOST!
                        </div>
                    )
                }
            </div >

            {/* --- TOP HUD --- */}
            {
                gameState !== 'start' && (
                    <div className="absolute top-4 w-full px-6 flex justify-between items-center z-50">
                        <div className="flex gap-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Shield key={i} size={28} className={i < hp ? "text-cyan-400 fill-cyan-400 drop-shadow-[0_0_10px_cyan]" : "text-gray-700"} />
                            ))}
                        </div>

                        <div className="w-1/3 bg-gray-900/80 border border-electric rounded-full h-4 overflow-hidden shadow-[0_0_15px_rgba(196,95,255,0.4)]">
                            <div
                                className="h-full bg-gradient-to-r from-cyan-400 to-electric transition-all duration-300 ease-out relative"
                                style={{ width: `${(distance / targetDistance) * 100}%` }}
                            >
                                <div className="absolute right-0 top-0 bottom-0 w-8 bg-white/50 blur-sm"></div>
                            </div>
                        </div>

                        <div className="text-white text-2xl font-black italic drop-shadow-md flex items-center gap-2">
                            SCORE <span className="text-electric">{score}</span>
                        </div>
                    </div >
                )
            }

            {/* --- DRIFT EVENT MODAL --- */}
            <AnimatePresence>
                {gameState === 'drifting' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    >
                        <div className="bg-gray-900 border-4 border-cyan-400 p-8 rounded-2xl shadow-[0_0_50px_cyan] max-w-md w-full text-center">
                            <FastForward className="w-16 h-16 text-cyan-400 mx-auto mb-4 animate-pulse" />
                            <h2 className="text-3xl font-black text-white italic uppercase mb-2 drop-shadow-[0_0_10px_cyan]">Optimization Drift!</h2>
                            <p className="text-gray-300 mb-6 text-sm">Type an optimization keyword quickly to boost! (e.g., 'cache', 'optimize', 'vector')</p>

                            <div className="text-4xl font-bold text-red-400 mb-4 font-mono">{driftTimeLeft}s</div>

                            <input
                                autoFocus
                                value={driftInput}
                                onChange={e => setDriftInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && executeDrift()}
                                placeholder="TYPE SPELL..."
                                className="w-full bg-gray-950 border-2 border-cyan-500/50 rounded-lg p-4 text-white text-xl font-mono text-center mb-4 focus:outline-none focus:border-cyan-400 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]"
                            />

                            <Button variant="primary" className="w-full text-lg shadow-[0_0_15px_cyan]" onClick={executeDrift}>
                                ENGAGE <FastForward className="inline ml-2 w-5 h-5" />
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- OVERLAYS --- */}
            <AnimatePresence>
                {gameState === 'start' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center backdrop-blur-md">
                        <Trophy className="w-24 h-24 text-electric mb-6 drop-shadow-[0_0_30px_rgba(196,95,255,0.8)]" />
                        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 italic uppercase mb-4 filter drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]">Data-Kart 2049</h1>
                        <p className="text-gray-300 text-lg mb-8 max-w-sm text-center">Dodge firewalls. Grab tokens. Execute prompt drifts to maximize velocity.</p>
                        <Button variant="primary" size="lg" className="text-xl px-12 py-4 shadow-[0_0_30px_rgba(196,95,255,0.6)]" onClick={() => setGameState('playing')}>
                            START ENGINE
                        </Button>
                    </motion.div>
                )}

                {gameState === 'gameover' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-red-950/90 z-[100] flex flex-col items-center justify-center backdrop-blur-md">
                        <AlertTriangle className="w-24 h-24 text-red-500 mb-6 drop-shadow-[0_0_30px_red]" />
                        <h2 className="text-6xl font-black text-white italic uppercase mb-2 drop-shadow-[0_0_20px_red]">CRASHED</h2>
                        <p className="text-gray-300 text-xl font-mono mb-8">Score: {score}</p>
                        <Button variant="primary" size="lg" onClick={resetGame}>Restart Logic Gate</Button>
                    </motion.div>
                )}

                {gameState === 'victory' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-cyan-950/90 z-[100] flex flex-col items-center justify-center backdrop-blur-md">
                        <Trophy className="w-32 h-32 text-cyan-400 mb-6 drop-shadow-[0_0_50px_cyan] animate-pulse" />
                        <h2 className="text-6xl font-black text-white italic uppercase mb-2 drop-shadow-[0_0_20px_cyan]">1st Place</h2>
                        <p className="text-cyan-200 text-2xl font-mono mb-8">Final Score: {score + (hp * 500)} (Includes HP Bonus)</p>
                        <Button variant="primary" size="lg" onClick={() => onComplete(score + (hp * 500))}>Submit Telemetry</Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Controls */}
            <div className="md:hidden absolute bottom-10 w-full px-8 flex justify-between z-50">
                <Button variant="ghost" className="w-20 h-20 bg-white/10 rounded-full border border-white/20" onClick={() => setPlayerLane(l => Math.max(0, l - 1))}><ArrowLeft size={32} /></Button>
                <Button variant="ghost" className="w-20 h-20 bg-white/10 rounded-full border border-white/20" onClick={() => setPlayerLane(l => Math.min(2, l + 1))}><ArrowRight size={32} /></Button>
            </div>

            {/* Global CSS for Track Animation */}
            <style>{`
    @keyframes scroll-grid {
        0 % { background-position: 0 0; }
        100% {background-position: 0 100px; }
    }
`}</style>
        </div >
    );
};
