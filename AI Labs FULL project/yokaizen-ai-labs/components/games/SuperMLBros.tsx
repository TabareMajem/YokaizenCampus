import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, ArrowUp, Zap, Trophy, Shield, Play } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Difficulty, UserStats } from '../../types';
import { Button } from '../ui/Button';

interface SuperMLBrosProps {
    onComplete: (score: number) => void;
    difficulty: Difficulty;
    user?: UserStats;
}

interface Entity {
    id: string;
    type: 'bug' | 'powerup' | 'platform' | 'goal';
    x: number;
    y: number;
    w: number;
    h: number;
    payload?: 'temperature' | 'top_p';
}

// Physics Constants
const GRAVITY = 1.2;
const MAX_FALL_SPEED = 15;
const GAME_SPEED = 20; // ms

export const SuperMLBros: React.FC<SuperMLBrosProps> = ({ onComplete }) => {
    // --- State ---
    const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'victory'>('start');

    // Player
    const [player, setPlayer] = useState({ x: 10, y: 0, w: 5, h: 10, vy: 0, vx: 0, isGrounded: true });
    const [powerups, setPowerups] = useState({ temp: 1, top_p: 1 }); // temp controls jump height, top_p controls speed
    const [hp, setHp] = useState(3);
    const [score, setScore] = useState(0);

    // World
    const [cameraX, setCameraX] = useState(0);
    const worldWidth = 300; // in % chunks
    const [entities, setEntities] = useState<Entity[]>([]);

    const keys = useRef<{ [key: string]: boolean }>({});
    const lastTime = useRef(0);

    // --- Level Generation ---
    const generateLevel = () => {
        const newEntities: Entity[] = [];

        // Floor
        newEntities.push({ id: 'floor', type: 'platform', x: 0, y: -5, w: worldWidth, h: 5 });

        // Platforms & Hazards
        let cursorX = 30;
        while (cursorX < worldWidth - 40) {
            const r = Math.random();
            if (r < 0.3) {
                // Platform
                newEntities.push({ id: `plat-${cursorX}`, type: 'platform', x: cursorX, y: 20 + Math.random() * 20, w: 15, h: 5 });
                if (Math.random() > 0.5) {
                    newEntities.push({ id: `pow-${cursorX}`, type: 'powerup', payload: Math.random() > 0.5 ? 'temperature' : 'top_p', x: cursorX + 5, y: 35 + Math.random() * 10, w: 4, h: 4 });
                }
            } else if (r < 0.6) {
                // Bug (Enemy)
                newEntities.push({ id: `bug-${cursorX}`, type: 'bug', x: cursorX, y: 0, w: 4, h: 4 });
            }
            cursorX += 15 + Math.random() * 15;
        }

        // Goal
        newEntities.push({ id: 'goal', type: 'goal', x: worldWidth - 20, y: 0, w: 10, h: 20 });

        setEntities(newEntities);
    };

    // --- Controls ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.key] = true; };
        const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.key] = false; };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // --- Game Loop ---
    useEffect(() => {
        if (gameState !== 'playing') return;

        let frameId: number;
        const tick = () => {
            updatePhysics();
            frameId = requestAnimationFrame(tick);
        };
        frameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameId);
    }, [gameState, player, powerups, entities]);

    const updatePhysics = () => {
        setPlayer(p => {
            let nVx = 0;
            const baseSpeed = 0.5;
            const speed = baseSpeed * (powerups.top_p + 0.5); // Top P makes you faster

            if (keys.current['ArrowRight'] || keys.current['d']) nVx = speed;
            if (keys.current['ArrowLeft'] || keys.current['a']) nVx = -speed;

            // Jump
            let nVy = p.vy;
            let jumped = false;

            // Only allow jump if historically grounded (we simplify this logic check)
            if ((keys.current['ArrowUp'] || keys.current['w'] || keys.current[' ']) && p.isGrounded) {
                audio.playClick();
                nVy = 15 * powerups.temp; // Temperature increases jump height!
                jumped = true;
            } else if (!p.isGrounded) {
                nVy -= GRAVITY; // Gravity pulls down
            }

            // Cap fall speed
            if (nVy < -MAX_FALL_SPEED) nVy = -MAX_FALL_SPEED;

            // Predict Next Pos
            let nx = Math.max(0, p.x + nVx); // Prevent going left of world
            let ny = p.y + nVy;
            let grounded = false;

            // Handle Collision with Entities
            for (const e of entities) {
                // AABB Collision (simplified for % based coordinate system)
                // Since this is React state driving a loop, collision is approximate.
                const collidesX = nx < e.x + e.w && nx + p.w > e.x;
                const collidesY = ny < e.y + e.h && ny + p.h > e.y;

                if (collidesX && collidesY) {
                    if (e.type === 'platform') {
                        // Resolve collision
                        if (p.vy < 0 && p.y >= e.y + e.h) { // Landing on top
                            ny = e.y + e.h;
                            nVy = 0;
                            grounded = true;
                        } else if (p.vy > 0 && p.y + p.h <= e.y) { // Hitting head
                            ny = e.y - p.h;
                            nVy = 0;
                        } else { // Wall collision
                            nx = p.x;
                            nVx = 0;
                        }
                    } else if (e.type === 'bug') {
                        // Did we stomp it?
                        if (p.vy < 0 && p.y > e.y + (e.h / 2)) {
                            // Stomped!
                            audio.playSuccess();
                            setScore(s => s + 100);
                            setPlayer(old => ({ ...old, vy: 10 * powerups.temp })); // Bounce
                            setEntities(list => list.filter(i => i.id !== e.id)); // Remove bug
                            return p; // Break this loop tick
                        } else {
                            // Hit side - Damage
                            audio.playError();
                            setHp(h => {
                                if (h - 1 <= 0) setGameState('gameover');
                                return h - 1;
                            });
                            // Knockback & invuln would go here. For now, destroy bug.
                            setEntities(list => list.filter(i => i.id !== e.id));
                            return p;
                        }
                    } else if (e.type === 'powerup') {
                        audio.playLevelUp();
                        setScore(s => s + 50);
                        if (e.payload === 'temperature') setPowerups(o => ({ ...o, temp: Math.min(2.5, o.temp + 0.5) }));
                        if (e.payload === 'top_p') setPowerups(o => ({ ...o, top_p: Math.min(2.5, o.top_p + 0.5) }));
                        setEntities(list => list.filter(i => i.id !== e.id));
                        return p;
                    } else if (e.type === 'goal') {
                        audio.playLevelUp();
                        setGameState('victory');
                        return p;
                    }
                }
            }

            // Floor bounds
            if (ny <= 0) {
                ny = 0;
                nVy = 0;
                grounded = true;
            }

            // Update Camera
            // Keep player roughly in center of screen
            setCameraX(prevCam => {
                const targetCam = nx - 30; // 30 represents ideal screen position
                return Math.max(0, targetCam);
            });

            return { x: nx, y: ny, w: p.w, h: p.h, vy: nVy, vx: nVx, isGrounded: grounded };
        });
    };

    const startGame = () => {
        setHp(3);
        setScore(0);
        setPlayer({ x: 10, y: 0, w: 5, h: 10, vy: 0, vx: 0, isGrounded: true });
        setPowerups({ temp: 1, top_p: 1 });
        setCameraX(0);
        generateLevel();
        setGameState('playing');
    };

    return (
        <div className="flex-1 w-full h-full flex flex-col bg-sky-900 relative overflow-hidden font-mono select-none">
            {/* Background Layer (Parallax) */}
            <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(rgba(34, 211, 238, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.4) 1px, transparent 1px)',
                    backgroundSize: '100px 100px',
                    transform: `translateX(${- cameraX * 0.5}%)`
                }}
            ></div>

            {/* Game World Container */}
            <div className="absolute inset-0" style={{ transform: `translateX(${- cameraX}%)` }}>

                {/* Entities */}
                {entities.map(e => {
                    if (e.type === 'platform') return (
                        <div key={e.id} className="absolute bg-emerald-900 border-t-8 border-green-500 rounded-sm shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
                            style={{ left: `${e.x}% `, bottom: `${e.y}% `, width: `${e.w}% `, height: `${e.h}% ` }} />
                    );
                    if (e.type === 'bug') return (
                        <div key={e.id} className="absolute flex items-center justify-center bg-red-600 rounded-full border-2 border-red-300 shadow-[0_0_15px_red] animate-bounce"
                            style={{ left: `${e.x}% `, bottom: `${e.y}% `, width: `${e.w}% `, height: `${e.h}% ` }}>
                            <Bug className="w-full h-full text-white p-1" />
                        </div>
                    );
                    if (e.type === 'powerup') return (
                        <div key={e.id} className="absolute flex items-center justify-center bg-yellow-400 rounded-md border-2 border-white shadow-[0_0_20px_yellow] animate-pulse"
                            style={{ left: `${e.x}% `, bottom: `${e.y}% `, width: `${e.w}% `, height: `${e.h}% ` }}>
                            {e.payload === 'temperature' ? <ArrowUp className="w-full h-full text-black p-1" /> : <Zap className="w-full h-full text-black p-1" />}
                        </div>
                    );
                    if (e.type === 'goal') return (
                        <div key={e.id} className="absolute flex items-end justify-center bg-indigo-900/50 border-x-4 border-t-4 border-indigo-400 rounded-t-full shadow-[0_0_50px_indigo]"
                            style={{ left: `${e.x}% `, bottom: `${e.y}% `, width: `${e.w}% `, height: `${e.h}% ` }}>
                            <div className="absolute inset-0 bg-gradient-to-t from-transparent to-electric opacity-50 blur-md"></div>
                            <Trophy className="w-full h-1/2 text-yellow-400 drop-shadow-[0_0_15px_yellow] mb-[20%]" />
                        </div>
                    );
                    return null;
                })}

                {/* Player Character */}
                <div
                    className="absolute z-50 bg-cyan-500 border-2 border-white rounded-t-xl rounded-b-md shadow-[0_0_20px_cyan] flex flex-col items-center justify-end overflow-hidden"
                    style={{
                        left: `${player.x}% `,
                        bottom: `${player.y}% `,
                        width: `${player.w}% `,
                        height: `${player.h}% `,
                        transform: (player.vx < 0) ? 'scaleX(-1)' : 'scaleX(1)'
                    }}
                >
                    {/* Face */}
                    <div className="absolute top-[20%] right-[10%] w-[30%] h-[20%] bg-blue-900 rounded-full flex gap-1 px-1">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                </div>
            </div>

            {/* --- UI LAYER --- */}
            {gameState !== 'start' && (
                <div className="absolute top-4 left-6 right-6 flex justify-between z-50 pointer-events-none">
                    <div className="flex gap-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Shield key={i} className={`w - 8 h - 8 ${i < hp ? 'text-red-500 fill-red-500 drop-shadow-[0_0_10px_red]' : 'text-gray-800'} `} />
                        ))}
                    </div>

                    <div className="flex gap-6 bg-black/50 p-2 rounded-xl backdrop-blur-sm border border-white/20">
                        <div className="text-yellow-400 font-bold flex flex-col items-center">
                            <span className="text-xs uppercase">Temp (Jump)</span>
                            <span className="text-xl">{powerups.temp.toFixed(1)}x</span>
                        </div>
                        <div className="text-cyan-400 font-bold flex flex-col items-center border-l border-white/20 pl-6">
                            <span className="text-xs uppercase">Top_P (Speed)</span>
                            <span className="text-xl">{powerups.top_p.toFixed(1)}x</span>
                        </div>
                    </div>

                    <div className="text-white font-black text-2xl drop-shadow-md bg-black/50 px-4 py-2 rounded-xl backdrop-blur-sm">
                        {score}
                    </div>
                </div>
            )}

            {/* OVERLAYS */}
            <AnimatePresence>
                {gameState === 'start' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 z-[100] flex flex-col items-center justify-center backdrop-blur-md">
                        <div className="bg-gradient-to-b from-blue-900 to-indigo-950 p-12 rounded-[2rem] border-4 border-cyan-400 shadow-[0_0_50px_cyan] flex flex-col items-center text-center max-w-lg">
                            <h1 className="text-6xl font-black text-white italic uppercase mb-2 drop-shadow-[0_5px_0_blue]">SUPER ML BROS</h1>
                            <p className="text-cyan-200 text-lg mb-8 font-bold">Use parameters to jump through the Latent Space.</p>

                            <div className="grid grid-cols-2 gap-4 mb-8 text-left text-sm text-gray-300">
                                <div className="bg-black/50 p-3 rounded-lg"><span className="text-yellow-400 font-bold">Temperature:</span> Increases jump height randomly.</div>
                                <div className="bg-black/50 p-3 rounded-lg"><span className="text-blue-400 font-bold">Top_P:</span> Increases horizontal movement speed.</div>
                                <div className="bg-black/50 p-3 rounded-lg col-span-2"><span className="text-red-400 font-bold">Bugs:</span> Stomp on them from above to clear them. Touching sides = crash.</div>
                            </div>

                            <Button variant="primary" size="lg" className="w-full text-2xl py-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 border-none shadow-[0_0_30px_cyan] text-black font-black uppercase" onClick={startGame}>
                                Start Runtime <Play className="inline ml-2 fill-black" />
                            </Button>
                        </div>
                    </motion.div>
                )}

                {gameState === 'gameover' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-red-950/90 z-[100] flex flex-col items-center justify-center backdrop-blur-md">
                        <h2 className="text-7xl font-black text-white italic uppercase mb-2 drop-shadow-[0_0_30px_red]">SEGFAULT</h2>
                        <p className="text-gray-300 text-2xl font-mono mb-8">Score: {score}</p>
                        <Button variant="primary" size="lg" className="bg-white text-red-600 hover:bg-gray-200" onClick={startGame}>Recompile Frame</Button>
                    </motion.div>
                )}

                {gameState === 'victory' && (
                    <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} className="absolute inset-0 bg-indigo-950/95 z-[100] flex flex-col items-center justify-center backdrop-blur-md border-[20px] border-yellow-400">
                        <Trophy className="w-40 h-40 text-yellow-400 mb-6 drop-shadow-[0_0_50px_yellow] animate-bounce" />
                        <h2 className="text-7xl font-black text-white italic uppercase mb-4 drop-shadow-[0_0_20px_yellow] text-center">Node Reached!</h2>
                        <p className="text-yellow-200 text-3xl font-bold mb-12">Total Compute Score: {score + (hp * 1000)}</p>
                        <Button variant="primary" size="lg" className="text-3xl px-16 py-8 rounded-full shadow-[0_0_40px_rgba(196,95,255,0.8)]" onClick={() => onComplete(score + (hp * 1000))}>
                            Extract Model Weights
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Controls */}
            <div className="md:hidden absolute bottom-10 w-full px-8 flex justify-between z-50">
                <div className="flex gap-4">
                    <Button variant="ghost" className="w-16 h-16 bg-white/20 rounded-full border border-white/30 backdrop-blur-sm"
                        onPointerDown={() => keys.current['ArrowLeft'] = true}
                        onPointerUp={() => keys.current['ArrowLeft'] = false}
                        onPointerLeave={() => keys.current['ArrowLeft'] = false}>←</Button>
                    <Button variant="ghost" className="w-16 h-16 bg-white/20 rounded-full border border-white/30 backdrop-blur-sm"
                        onPointerDown={() => keys.current['ArrowRight'] = true}
                        onPointerUp={() => keys.current['ArrowRight'] = false}
                        onPointerLeave={() => keys.current['ArrowRight'] = false}>→</Button>
                </div>
                <Button variant="ghost" className="w-20 h-20 bg-cyan-500/50 rounded-full border border-cyan-300 shadow-[0_0_20px_cyan] backdrop-blur-sm"
                    onPointerDown={() => keys.current['ArrowUp'] = true}
                    onPointerUp={() => keys.current['ArrowUp'] = false}
                    onPointerLeave={() => keys.current['ArrowUp'] = false}>↑ JUMP</Button>
            </div>
        </div>
    );
};
