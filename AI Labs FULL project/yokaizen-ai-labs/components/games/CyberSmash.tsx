import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Shield, Flame, Target, Terminal, Maximize, Play, Skull, Heart } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Difficulty, UserStats } from '../../types';
import { Button } from '../ui/Button';

// --- Types & Constants ---
interface CyberSmashProps {
    onComplete: (score: number) => void;
    difficulty: Difficulty;
    user?: UserStats;
}

type CharacterType = 'coder' | 'marketer' | 'analyst' | 'boss';

interface Fighter {
    id: string;
    type: CharacterType;
    hp: number;
    maxHp: number;
    x: number; // 0 to 100 percentage of stage
    y: number; // 0 (ground) to 100 (air)
    vx: number;
    vy: number;
    facingLeft: boolean;
    state: 'idle' | 'walking' | 'jumping' | 'attacking' | 'hit' | 'dead';
    cooldown: number;
    comboBuffer: string[];
}

// Moves map to keyboard inputs
// j = light (Few-Shot)
// k = heavy (Chain of Thought)
// l = special (RAG)
// w/a/s/d for movement
const GRAVITY = 2;
const JUMP_FORCE = 25;
const SPEED = 1.5;
const STAGE_WIDTH = 100;

export const CyberSmash: React.FC<CyberSmashProps> = ({ onComplete }) => {
    const [gameState, setGameState] = useState<'select' | 'playing' | 'gameover'>('select');

    // Players
    const [p1, setP1] = useState<Fighter>({
        id: 'p1', type: 'coder', hp: 100, maxHp: 100, x: 20, y: 0, vx: 0, vy: 0, facingLeft: false, state: 'idle', cooldown: 0, comboBuffer: []
    });

    const [enemy, setEnemy] = useState<Fighter>({
        id: 'cpu', type: 'boss', hp: 150, maxHp: 150, x: 80, y: 0, vx: 0, vy: 0, facingLeft: true, state: 'idle', cooldown: 0, comboBuffer: []
    });

    const [hitboxes, setHitboxes] = useState<{ id: string, x: number, y: number, w: number, h: number, owner: string, damage: number, lifetime: number, type: string }[]>([]);
    const [logs, setLogs] = useState<string[]>(['VERSUS MODE INITIALIZED.']);
    const log = (msg: string) => setLogs(p => [...p.slice(-4), msg]);

    const keysRef = useRef<{ [key: string]: boolean }>({});
    const requestRef = useRef<number>();

    // --- Game Loop ---
    const updateLoop = () => {
        if (gameState !== 'playing') return;

        setP1(prevP1 => {
            if (prevP1.state === 'dead') return prevP1;

            let { x, y, vx, vy, state, facingLeft, cooldown, comboBuffer } = { ...prevP1 };

            if (cooldown > 0) cooldown--;

            // Input handling (if not hit/attacking heavily)
            if (state !== 'hit' && cooldown <= 0) {
                // Movement
                if (keysRef.current['d'] || keysRef.current['ArrowRight']) { vx = SPEED; facingLeft = false; if (y === 0) state = 'walking'; }
                else if (keysRef.current['a'] || keysRef.current['ArrowLeft']) { vx = -SPEED; facingLeft = true; if (y === 0) state = 'walking'; }
                else { vx = 0; if (y === 0) state = 'idle'; }

                // Jump
                if ((keysRef.current['w'] || keysRef.current['ArrowUp']) && y === 0) {
                    vy = JUMP_FORCE;
                    state = 'jumping';
                    audio.playClick();
                }

                // Attacks
                const tryAttack = (key: string, moveType: string, damage: number, width: number, dur: number) => {
                    if (keysRef.current[key]) {
                        state = 'attacking';
                        cooldown = dur;
                        vx = 0; // stop moving while attacking
                        audio.playEffect?.('sword') || audio.playClick();

                        // Buffer
                        comboBuffer.push(key);
                        if (comboBuffer.length > 3) comboBuffer.shift();

                        // Detect combo
                        let attackName = moveType;
                        let finalDmg = damage;
                        let finalW = width;

                        const comboStr = comboBuffer.join('');
                        if (comboStr === 'jjj') { attackName = 'Zero-Shot Flurry'; finalDmg *= 1.5; log("P1: Zero-Shot Flurry!"); comboBuffer = []; }
                        else if (comboStr === 'jk') { attackName = 'Few-Shot Setup'; finalDmg *= 2; finalW *= 1.5; log("P1: Few-Shot Setup!"); comboBuffer = []; }
                        else if (comboStr === 'kkl') { attackName = 'Chain-of-Thought SMASH'; finalDmg *= 3; finalW *= 3; log("P1: CoT SMASH!"); comboBuffer = []; }
                        else if (comboStr === 'l') { attackName = 'RAG Retrieval'; log("P1 used RAG!"); }

                        // Emit Hitbox
                        const hx = facingLeft ? x - finalW : x + 5; // 5 is approx player width
                        setHitboxes(prev => [...prev, {
                            id: Math.random().toString(), owner: 'p1', damage: finalDmg,
                            x: hx, y: y + 5, w: finalW, h: 5, lifetime: 10, type: attackName
                        }]);

                        keysRef.current[key] = false; // consume key
                    }
                };

                tryAttack('j', 'Light Prompt', 5, 8, 15);
                if (state !== 'attacking') tryAttack('k', 'Heavy Prompt', 15, 12, 30);
                if (state !== 'attacking') tryAttack('l', 'Special (RAG)', 20, 25, 45);
            }

            // Physics
            x += vx;
            if (y > 0) vy -= GRAVITY;
            y += vy;

            // Ground collision
            if (y <= 0) {
                y = 0;
                vy = 0;
                if (state === 'jumping') state = 'idle';
            }

            // Walls
            if (x < 0) x = 0;
            if (x > STAGE_WIDTH - 6) x = STAGE_WIDTH - 6;

            return { ...prevP1, x, y, vx, vy, state, facingLeft, cooldown, comboBuffer };
        });

        setEnemy(prevE => {
            if (prevE.state === 'dead') return prevE;

            let { x, y, vx, vy, state, facingLeft, cooldown } = { ...prevE };

            if (cooldown > 0) cooldown--;

            // Simple CPU AI
            if (state !== 'hit' && cooldown <= 0) {
                // track p1
                // hacky way to get p1 x without adding it to deps, relies on ref or state in outer scope.
                // We'll just read from the previous state setter? No, we can just use setEnemy(prev => { ... }) 
                // but we need p1's x. Let's use a ref for P1 x to avoid stale closures in the loop.
            }

            // For now, hardcode dumb AI inside setEnemy isn't ideal due to missing deps.
            // Let's refactor AI to work on the outer dependency if possible, or just use functional updates safely.
            return { ...prevE, x, y, vx, vy, state, facingLeft, cooldown };
        });

        // Hitbox collision & lifetime
        setHitboxes(prev => {
            const alive = prev.map(h => ({ ...h, lifetime: h.lifetime - 1 })).filter(h => h.lifetime > 0);
            return alive;
        });

        requestRef.current = requestAnimationFrame(updateLoop);
    };

    // Separate AI & Collision Effect to avoid complex closures in rAF
    useEffect(() => {
        if (gameState !== 'playing') return;

        const p1Box = { x: p1.x, y: p1.y, w: 6, h: 15 };
        const eBox = { x: enemy.x, y: enemy.y, w: 8, h: 18 }; // Boss is bigger

        // Check hits on Enemy
        hitboxes.filter(h => h.owner === 'p1').forEach(h => {
            if (h.x < eBox.x + eBox.w && h.x + h.w > eBox.x && h.y < eBox.y + eBox.h && h.y + h.h > eBox.y) {
                if (enemy.state !== 'hit' && enemy.state !== 'dead') {
                    setEnemy(prev => {
                        const newHp = Math.max(0, prev.hp - h.damage);
                        audio.playError(); // hit sound

                        // Particle/Knockback
                        return {
                            ...prev, hp: newHp, state: newHp === 0 ? 'dead' : 'hit',
                            cooldown: 20, vx: p1.facingLeft ? -2 : 2, vy: 10
                        };
                    });
                    // prevent multiple hits from same box in same frame by modifying hitbox? 
                    // Simple enough for now.
                }
            }
        });

        // Check hits on P1
        hitboxes.filter(h => h.owner === 'cpu').forEach(h => {
            if (h.x < p1Box.x + p1Box.w && h.x + h.w > p1Box.x && h.y < p1Box.y + p1Box.h && h.y + h.h > p1Box.y) {
                if (p1.state !== 'hit' && p1.state !== 'dead') {
                    setP1(prev => {
                        const newHp = Math.max(0, prev.hp - h.damage);
                        audio.playError(); // hit sound
                        return {
                            ...prev, hp: newHp, state: newHp === 0 ? 'dead' : 'hit',
                            cooldown: 20, vx: enemy.facingLeft ? -3 : 3, vy: 12
                        };
                    });
                }
            }
        });

        // CPU AI Tick (every few frames)
        if (enemy.state !== 'dead' && enemy.state !== 'hit' && enemy.cooldown <= 0 && Math.random() < 0.1) {
            setEnemy(prev => {
                let { vx, vy, facingLeft, state, cooldown, comboBuffer } = { ...prev };

                // Move towards player
                const dist = p1.x - prev.x;
                if (Math.abs(dist) > 20) {
                    vx = dist > 0 ? SPEED * 0.8 : -SPEED * 0.8;
                    facingLeft = dist < 0;
                    if (prev.y === 0) state = 'walking';
                } else {
                    vx = 0;
                    facingLeft = dist < 0;
                    // Attack
                    if (Math.random() < 0.5) {
                        state = 'attacking';
                        cooldown = 40;
                        const finalW = 15;
                        const hx = facingLeft ? prev.x - finalW : prev.x + 8;

                        setHitboxes(hb => [...hb, {
                            id: Math.random().toString(), owner: 'cpu', damage: 15,
                            x: hx, y: prev.y + 5, w: finalW, h: 8, lifetime: 15, type: 'Legacy Exception'
                        }]);
                        log("CPU: Legacy Exception!");
                        audio.playEffect?.('sword') || audio.playClick();
                    }
                }
                return { ...prev, vx, vy, facingLeft, state, cooldown, comboBuffer };
            });
        }

        // Win/Loss Condition
        if (enemy.hp <= 0 && gameState === 'playing') {
            log("ENEMY DEFEATED!");
            setTimeout(() => setGameState('gameover'), 2000);
        } else if (p1.hp <= 0 && gameState === 'playing') {
            log("SYSTEM FAILURE.");
            setTimeout(() => setGameState('gameover'), 2000);
        }

    }, [p1.x, p1.y, enemy.x, enemy.y, hitboxes, gameState]); // Simplified deps for collision/AI

    // Main Loop registration
    useEffect(() => {
        if (gameState === 'playing') {
            requestRef.current = requestAnimationFrame(updateLoop);
        }
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [gameState]);

    // Input listeners
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { keysRef.current[e.key] = true; };
        const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.key] = false; };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const startGame = (type: CharacterType) => {
        setP1({ id: 'p1', type, hp: 100, maxHp: 100, x: 20, y: 0, vx: 0, vy: 0, facingLeft: false, state: 'idle', cooldown: 0, comboBuffer: [] });
        setEnemy({ id: 'cpu', type: 'boss', hp: 250, maxHp: 250, x: 80, y: 0, vx: 0, vy: 0, facingLeft: true, state: 'idle', cooldown: 0, comboBuffer: [] });
        setHitboxes([]);
        setGameState('playing');
        audio.playClick();
    };

    // --- Render Helpers ---
    const getCharTheme = (type: CharacterType) => {
        switch (type) {
            case 'coder': return { color: 'text-cyan-400', bg: 'bg-cyan-500', icon: Terminal };
            case 'marketer': return { color: 'text-rose-400', bg: 'bg-rose-500', icon: Target };
            case 'analyst': return { color: 'text-emerald-400', bg: 'bg-emerald-500', icon: Maximize };
            case 'boss': return { color: 'text-red-500', bg: 'bg-red-900', icon: Skull };
            default: return { color: 'text-white', bg: 'bg-gray-500', icon: Shield };
        }
    };

    return (
        <div className="flex-1 w-full h-full flex flex-col items-center justify-center bg-gray-950 relative font-mono overflow-hidden select-none">

            {/* Cyberpunk City Background */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-indigo-900 via-purple-950 to-black">
                <div className="absolute bottom-0 w-full h-1/2 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMjBoNDB2NDBIMHoiIGZpbGw9IiMzMTJlNzgiIGZpbGwtb3BhY2l0eT0iMC4yIi8+PC9zdmc+')] opacity-20"></div>
            </div>

            {/* --- TOP HUD (Health Bars) --- */}
            {gameState !== 'select' && (
                <div className="absolute top-6 left-6 right-6 z-50 flex justify-between items-start pointer-events-none">

                    {/* P1 Health */}
                    <div className="w-1/3">
                        <div className="flex justify-between items-end mb-1 px-1">
                            <span className={`font-black uppercase text-2xl ${getCharTheme(p1.type).color} drop-shadow-[0_0_5px_currentColor]`}>{p1.type}</span>
                            <span className="text-white font-bold">{Math.ceil(p1.hp)} / {p1.maxHp}</span>
                        </div>
                        <div className="w-full h-6 bg-gray-900 border-2 border-gray-700 rounded-sm overflow-hidden transform skew-x-[-15deg]">
                            <div className={`h-full ${getCharTheme(p1.type).bg} transition-all duration-100 ease-out`} style={{ width: `${(p1.hp / p1.maxHp) * 100}%` }}></div>
                        </div>
                        {/* Combo Display */}
                        <div className="mt-2 flex gap-1 transform skew-x-[-15deg]">
                            {p1.comboBuffer.map((k, i) => (
                                <div key={i} className="bg-white text-black font-black uppercase text-xs px-2 py-0.5">{k}</div>
                            ))}
                        </div>
                    </div>

                    {/* Timer / VS */}
                    <div className="text-center bg-black/80 p-4 border-2 border-purple-500 rounded-lg shadow-[0_0_20px_purple]">
                        <h2 className="text-white font-black text-3xl italic">V S</h2>
                    </div>

                    {/* P2 (Enemy) Health */}
                    <div className="w-1/3">
                        <div className="flex justify-between items-end mb-1 px-1 flex-row-reverse">
                            <span className={`font-black uppercase text-2xl ${getCharTheme(enemy.type).color} drop-shadow-[0_0_5px_currentColor]`}>Legacy Monolith</span>
                            <span className="text-white font-bold">{Math.ceil(enemy.hp)} / {enemy.maxHp}</span>
                        </div>
                        <div className="w-full h-6 bg-gray-900 border-2 border-gray-700 rounded-sm overflow-hidden transform skew-x-[15deg] flex justify-end">
                            <div className={`h-full ${getCharTheme(enemy.type).bg} transition-all duration-100 ease-out`} style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}></div>
                        </div>
                    </div>

                </div>
            )}

            {/* --- PLAY AREA (The Stage) --- */}
            {gameState !== 'select' && (
                <div className="absolute inset-x-0 bottom-12 h-[60%] border-b-8 border-purple-900 z-10">

                    {/* The Floor Grid Effect */}
                    <div className="absolute bottom-0 w-full h-32 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCI+PHBhdGggZD0iTTAgMGg4MHY4MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDQwaDgwbTAtNDB2ODAiIHN0cm9rZT0iIzg4NTVhYyIgc3Ryb2tlLW9wYWNpdHk9IjAuNSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+')] transform perspective-[500px] rotateX(60deg) origin-bottom opacity-50"></div>

                    {/* Log Terminal */}
                    <div className="absolute bottom-[-60px] left-1/2 transform -translate-x-1/2 w-96 bg-black/80 border border-gray-800 p-2 text-xs text-gray-400 font-mono h-12 overflow-hidden flex flex-col justify-end text-center rounded">
                        {logs.slice(-2).map((l, i) => <div key={i} className={i === 1 ? 'text-white' : ''}>{l}</div>)}
                    </div>

                    {/* Entities rendering logic */}
                    {[p1, enemy].map(fighter => {
                        if (fighter.state === 'dead') return null;

                        const theme = getCharTheme(fighter.type);
                        const Icon = theme.icon;
                        const w = fighter.type === 'boss' ? 'w-32 h-48' : 'w-20 h-40'; // Boss is physically larger
                        const xOffset = fighter.type === 'boss' ? 16 : 10;
                        const isHit = fighter.state === 'hit';

                        return (
                            <div
                                key={fighter.id}
                                className={`absolute bottom-0 bg-gray-900 border-4 ${isHit ? 'border-red-500 bg-red-900' : 'border-gray-700'} ${w} flex flex-col items-center justify-center transition-transform`}
                                style={{
                                    left: `${fighter.x}%`,
                                    marginBottom: `${fighter.y}%`, // y is 0-100 relative to stage height roughly
                                    marginLeft: `-${xOffset}%`, // simple centering hack relative to percentage bounds
                                    transform: `scaleX(${fighter.facingLeft ? -1 : 1}) ${isHit ? 'rotate(-10deg)' : ''}`,
                                    filter: isHit ? 'brightness(2)' : 'none'
                                }}
                            >
                                <Icon className={`w-1/2 h-1/2 ${isHit ? 'text-white' : theme.color}`} />
                                <div className="absolute -top-6 text-xs font-bold text-white bg-black px-2 py-1 rounded">{fighter.state}</div>
                            </div>
                        );
                    })}

                    {/* Hitboxes rendering */}
                    {hitboxes.map(h => (
                        <div
                            key={h.id}
                            className={`absolute bottom-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-80 z-20`}
                            style={{
                                left: `${h.x}%`,
                                width: `${h.w}%`,
                                height: `${h.h}%`,
                                marginBottom: `${h.y}%`,
                                boxShadow: h.owner === 'p1' ? '0 0 20px cyan' : '0 0 20px red',
                                backgroundColor: h.owner === 'p1' ? 'cyan' : 'red'
                            }}
                        >
                            <span className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-[8px] text-white font-bold whitespace-nowrap">{h.type}</span>
                        </div>
                    ))}

                </div>
            )}

            {/* Controls overlay */}
            {gameState === 'playing' && (
                <div className="absolute bottom-4 left-4 text-gray-500 font-bold text-xs uppercase tracking-widest bg-black/50 p-4 rounded border border-gray-800 pointer-events-none">
                    <p className="mb-2 text-white">CONTROLS:</p>
                    <p>W A S D : Move / Jump</p>
                    <p>J : Light Prompt (Tap)</p>
                    <p>K : Heavy Prompt (Slower, High DMG)</p>
                    <p>L : Special (RAG - Huge AoE)</p>
                    <p className="mt-2 text-cyan-400">Combos: J-J-J | J-K | K-K-L</p>
                </div>
            )}

            {/* --- SCREENS --- */}
            <AnimatePresence>
                {gameState === 'select' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-8">
                        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-rose-500 uppercase tracking-widest mb-2 italic transform -skew-x-12">Cyber-Smash</h1>
                        <p className="text-gray-400 text-xl mb-12 uppercase tracking-widest">Select Your Persona</p>

                        <div className="flex gap-8 mb-12">
                            {(['coder', 'marketer', 'analyst'] as CharacterType[]).map(type => {
                                const theme = getCharTheme(type);
                                const Icon = theme.icon;
                                return (
                                    <button
                                        key={type}
                                        className={`w-48 h-64 bg-gray-900 border-4 border-gray-800 hover:${theme.bg} rounded-xl flex flex-col items-center justify-center transition-all hover:scale-105 group relative overflow-hidden`}
                                        onClick={() => startGame(type)}
                                    >
                                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity`}></div>
                                        <Icon className={`w-20 h-20 ${theme.color} group-hover:text-white transition-colors mb-4`} />
                                        <span className="text-white font-black uppercase text-xl tracking-widest group-hover:drop-shadow-[0_0_10px_white]">{type}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {gameState === 'gameover' && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center p-8 border-[12px] border-purple-500">
                        {p1.hp > 0 ? (
                            <>
                                <Flame className="w-32 h-32 text-purple-500 mb-6 drop-shadow-[0_0_40px_purple]" />
                                <h2 className="text-7xl font-black text-white uppercase tracking-widest drop-shadow-[0_0_20px_purple] mb-4 text-center italic transform -skew-x-12">K.O.</h2>
                                <p className="text-purple-200 text-2xl font-bold mb-10 text-center uppercase tracking-widest">Legacy Monolith Defeated</p>
                            </>
                        ) : (
                            <>
                                <Skull className="w-32 h-32 text-red-500 mb-6 drop-shadow-[0_0_40px_red]" />
                                <h2 className="text-7xl font-black text-white uppercase tracking-widest drop-shadow-[0_0_20px_red] mb-4 text-center italic transform -skew-x-12">DEFEAT</h2>
                                <p className="text-red-200 text-2xl font-bold mb-10 text-center uppercase tracking-widest">System Overwhelmed</p>
                            </>
                        )}

                        <Button variant="primary" size="lg" className="px-16 py-6 text-2xl bg-purple-500 hover:bg-purple-400 text-white shadow-[0_0_30px_purple] border-none font-black uppercase" onClick={() => onComplete(p1.hp > 0 ? 1500 : 200)}>
                            Return to Hub
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};
