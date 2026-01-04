
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { audio } from '../../services/audioService';
import { Play, RotateCcw, ArrowUp, ArrowLeft, ArrowRight, Cpu, Zap, Flag, Flame, CheckCircle, ShoppingBag, Map, Star, Lock, ChevronLeft } from 'lucide-react';
import { Difficulty, Language, GameType, UserStats } from '../../types';
import { Scanlines, Vignette } from '../ui/Visuals';
import { SkinShop } from '../ui/SkinShop';
import { GAME_SKINS } from '../../constants';

interface NeonDriftProps {
    onComplete: (score: number) => void;
    difficulty?: Difficulty;
    t: (key: string) => string;
    language?: Language;
    user?: UserStats;
    onUpdateUser?: (user: UserStats) => void;
}

type Command = 'FORWARD' | 'LEFT' | 'RIGHT' | 'BOOST';

// Hand-crafted level definitions
interface LevelDef {
    id: number;
    name: string;
    grid: number[][];
    moveLimit: number;
    stars: { three: number; two: number; one: number }; // Moves for star rating
}

const LEVELS: LevelDef[] = [
    {
        id: 1, name: 'Training Grid',
        grid: [
            [4, 4, 4, 4, 4, 4],
            [4, 2, 1, 1, 4, 4],
            [4, 4, 4, 1, 4, 4],
            [4, 4, 4, 1, 1, 4],
            [4, 4, 4, 4, 3, 4],
            [4, 4, 4, 4, 4, 4],
        ],
        moveLimit: 8,
        stars: { three: 4, two: 6, one: 8 }
    },
    {
        id: 2, name: 'Downtown Circuit',
        grid: [
            [4, 4, 4, 4, 4, 4, 4],
            [4, 2, 1, 1, 1, 4, 4],
            [4, 4, 4, 4, 1, 4, 4],
            [4, 4, 5, 1, 1, 4, 4],
            [4, 4, 1, 4, 4, 4, 4],
            [4, 4, 1, 1, 1, 3, 4],
            [4, 4, 4, 4, 4, 4, 4],
        ],
        moveLimit: 10,
        stars: { three: 6, two: 8, one: 10 }
    },
    {
        id: 3, name: 'Neon Highway',
        grid: [
            [4, 4, 4, 4, 4, 4, 4, 4],
            [4, 2, 1, 1, 4, 4, 4, 4],
            [4, 4, 4, 1, 4, 4, 4, 4],
            [4, 4, 5, 1, 1, 1, 4, 4],
            [4, 4, 4, 4, 4, 1, 4, 4],
            [4, 4, 4, 4, 1, 1, 4, 4],
            [4, 4, 4, 4, 1, 1, 3, 4],
            [4, 4, 4, 4, 4, 4, 4, 4],
        ],
        moveLimit: 12,
        stars: { three: 7, two: 9, one: 12 }
    },
    {
        id: 4, name: 'Cyber Maze',
        grid: [
            [4, 4, 4, 4, 4, 4, 4, 4],
            [4, 2, 1, 4, 1, 1, 4, 4],
            [4, 1, 1, 4, 1, 4, 4, 4],
            [4, 1, 4, 4, 1, 5, 1, 4],
            [4, 1, 1, 1, 1, 4, 1, 4],
            [4, 4, 4, 4, 4, 4, 1, 4],
            [4, 4, 4, 4, 4, 3, 1, 4],
            [4, 4, 4, 4, 4, 4, 4, 4],
        ],
        moveLimit: 14,
        stars: { three: 9, two: 12, one: 14 }
    },
    {
        id: 5, name: 'Boss Run',
        grid: [
            [4, 4, 4, 4, 4, 4, 4, 4],
            [4, 2, 1, 1, 1, 5, 1, 4],
            [4, 4, 4, 4, 4, 4, 1, 4],
            [4, 1, 1, 5, 1, 1, 1, 4],
            [4, 1, 4, 4, 4, 4, 4, 4],
            [4, 1, 1, 1, 1, 1, 4, 4],
            [4, 4, 4, 4, 4, 1, 3, 4],
            [4, 4, 4, 4, 4, 4, 4, 4],
        ],
        moveLimit: 16,
        stars: { three: 10, two: 13, one: 16 }
    },
];

// Progress persistence
const STORAGE_KEY = 'neondrift_progress';
interface LevelProgress {
    [levelId: number]: { completed: boolean; bestMoves: number; stars: number };
}

const loadProgress = (): LevelProgress => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
};

const saveProgress = (progress: LevelProgress) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
};

export const NeonDrift: React.FC<NeonDriftProps> = ({ onComplete, difficulty = 'Pro', t, user, onUpdateUser }) => {
    const [commands, setCommands] = useState<Command[]>([]);
    const [status, setStatus] = useState<'IDLE' | 'RUNNING' | 'CRASHED' | 'WIN'>('IDLE');
    const [feedback, setFeedback] = useState('');
    const [activeStep, setActiveStep] = useState<number>(-1);
    const [showShop, setShowShop] = useState(false);
    const [showLevelSelect, setShowLevelSelect] = useState(true);
    const [currentLevel, setCurrentLevel] = useState<LevelDef | null>(null);
    const [progress, setProgress] = useState<LevelProgress>(loadProgress);
    const [trackMap, setTrackMap] = useState<number[][]>([]);

    const commandLimit = currentLevel?.moveLimit || 12;
    const gridSize = currentLevel?.grid.length || 7;

    // Visual Grid State
    const [carPos, setCarPos] = useState({ x: 1, y: 1, rotation: 0 });
    const carRef = useRef({ x: 1, y: 1, rotation: 0 });
    const [particles, setParticles] = useState<{ id: number, x: number, y: number, color: string }[]>([]);
    const [skidMarks, setSkidMarks] = useState<{ x: number, y: number, opacity: number }[]>([]);
    const carSpriteRef = useRef<HTMLImageElement | null>(null);

    // Select level handler
    const selectLevel = (level: LevelDef) => {
        const levelIndex = LEVELS.findIndex(l => l.id === level.id);
        const isUnlocked = levelIndex === 0 || progress[LEVELS[levelIndex - 1].id]?.completed;
        if (!isUnlocked) return;

        setCurrentLevel(level);
        setTrackMap(level.grid.map(row => [...row]));
        setShowLevelSelect(false);
        setCommands([]);
        setStatus('IDLE');

        // Find start position
        for (let y = 0; y < level.grid.length; y++) {
            for (let x = 0; x < level.grid[y].length; x++) {
                if (level.grid[y][x] === 2) {
                    setCarPos({ x, y, rotation: 0 });
                    carRef.current = { x, y, rotation: 0 };
                    break;
                }
            }
        }
        audio.playClick();
    };

    const calculateStars = (moves: number): number => {
        if (!currentLevel) return 0;
        if (moves <= currentLevel.stars.three) return 3;
        if (moves <= currentLevel.stars.two) return 2;
        if (moves <= currentLevel.stars.one) return 1;
        return 0;
    };

    const handleWin = () => {
        if (!currentLevel) return;
        const movesUsed = commands.length;
        const stars = calculateStars(movesUsed);
        const prev = progress[currentLevel.id];

        if (!prev || movesUsed < prev.bestMoves) {
            const newProgress = {
                ...progress,
                [currentLevel.id]: { completed: true, bestMoves: movesUsed, stars: Math.max(stars, prev?.stars || 0) }
            };
            setProgress(newProgress);
            saveProgress(newProgress);
        }
    };

    // --- PROCEDURAL GENERATION (Legacy for random mode) ---

    const generateTrack = () => {
        const size = gridSize;
        const newMap = Array(size).fill(null).map(() => Array(size).fill(4)); // Fill with Walls (4)

        let x = 1;
        let y = 1;
        newMap[y][x] = 2; // Start

        // Random Walk to generate path
        let steps = 0;
        const maxSteps = size * size; // Safety break

        while (steps < maxSteps) {
            // Determine possible moves
            const moves = [];
            if (x + 1 < size - 1) moves.push({ dx: 1, dy: 0 });
            if (y + 1 < size - 1) moves.push({ dx: 0, dy: 1 });
            // Bias towards goal (bottom right)

            if (moves.length === 0) break; // Trapped

            // Simple heuristic: Try not to go back, try to move generally down/right
            const move = moves[Math.floor(Math.random() * moves.length)];

            x += move.dx;
            y += move.dy;

            if (newMap[y][x] === 4) {
                newMap[y][x] = 1; // Track
                // Chance for Boost Pad (5)
                if (Math.random() > 0.8) newMap[y][x] = 5;
            }

            // Goal Condition: Near bottom right
            if (x >= size - 2 && y >= size - 2) {
                newMap[y][x] = 3; // Goal
                break;
            }
            steps++;
        }

        // Fallback if generator failed to reach deep enough
        if (newMap[y][x] !== 3) newMap[y][x] = 3;

        setTrackMap(newMap);
        // Reset car
        setCarPos({ x: 1, y: 1, rotation: 0 });
        carRef.current = { x: 1, y: 1, rotation: 0 };
    };

    useEffect(() => {
        generateTrack();
    }, [difficulty]);

    // Load Car Skin
    useEffect(() => {
        const skinId = user?.equippedSkins?.[GameType.NEON_DRIFT] || 'drift_default';
        const skin = GAME_SKINS.find(s => s.id === skinId);
        if (skin) {
            const img = new Image();
            img.src = skin.assetUrl;
            carSpriteRef.current = img;
        }
    }, [user?.equippedSkins]);

    useEffect(() => {
        if (status === 'IDLE') {
            setCarPos({ x: 1, y: 1, rotation: 0 });
            carRef.current = { x: 1, y: 1, rotation: 0 };
            setParticles([]);
            setSkidMarks([]);
        }
    }, [status]);

    const spawnParticles = (x: number, y: number, color: string, count: number = 5) => {
        const newParts = Array.from({ length: count }).map(() => ({
            id: Math.random(),
            x: x * 50 + 25 + (Math.random() * 20 - 10),
            y: y * 50 + 25 + (Math.random() * 20 - 10),
            color
        }));
        setParticles(p => [...p, ...newParts]);
        setTimeout(() => setParticles(p => p.slice(count)), 500);
    };

    const addSkidMark = (x: number, y: number) => {
        setSkidMarks(prev => [...prev, { x: x * 50 + 25, y: y * 50 + 25, opacity: 1 }]);
    };

    // --- SMOOTH EXECUTION ENGINE ---
    const handleRun = async () => {
        setStatus('RUNNING');
        setFeedback(t('architect.processing'));
        audio.playEngine(3000);
        audio.vibrate(audio.haptics.medium);

        let currentX = 1;
        let currentY = 1;
        let currentRot = 0;
        let crashed = false;

        const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

        for (let i = 0; i < commands.length; i++) {
            setActiveStep(i);
            const cmd = commands[i];

            // 1. Turn Phase
            if (cmd === 'LEFT' || cmd === 'RIGHT') {
                const startRot = currentRot;
                const dir = cmd === 'LEFT' ? -90 : 90;
                const targetRot = currentRot + dir;
                currentRot = (currentRot + dir + 360) % 360;
                audio.playHover();
                audio.vibrate(5);

                for (let t = 0; t <= 1; t += 0.1) {
                    carRef.current.rotation = startRot + (targetRot - startRot) * t;
                    setCarPos({ ...carRef.current });
                    if (t > 0.5) addSkidMark(carRef.current.x, carRef.current.y);
                    await wait(20);
                }
            }

            // 2. Move Phase
            let moveDistance = 1;
            if (cmd === 'BOOST') {
                moveDistance = 2; // Jump logic
                audio.vibrate(audio.haptics.impact);
            }

            if (cmd === 'FORWARD' || cmd === 'BOOST') {
                let dx = 0, dy = 0;
                if (Math.abs(currentRot - 0) < 10 || Math.abs(currentRot - 360) < 10) dx = 1;
                else if (Math.abs(currentRot - 90) < 10 || Math.abs(currentRot + 270) < 10) dy = 1;
                else if (Math.abs(currentRot - 180) < 10 || Math.abs(currentRot + 180) < 10) dx = -1;
                else dy = -1;

                for (let dist = 0; dist < moveDistance; dist++) {
                    const nextX = currentX + dx;
                    const nextY = currentY + dy;

                    const startX = currentX;
                    const startY = currentY;

                    const steps = cmd === 'BOOST' ? 0.2 : 0.1;
                    for (let t = 0; t <= 1; t += steps) {
                        carRef.current.x = startX + (nextX - startX) * t;
                        carRef.current.y = startY + (nextY - startY) * t;
                        setCarPos({ ...carRef.current });
                        if (cmd === 'BOOST') spawnParticles(carRef.current.x, carRef.current.y, '#F59E0B', 2);
                        await wait(20);
                    }

                    // Check Wall Collision
                    if (trackMap[nextY] && trackMap[nextY][nextX] !== 4 && nextX >= 0 && nextX < gridSize && nextY >= 0 && nextY < gridSize) {
                        currentX = nextX;
                        currentY = nextY;

                        // Boost Pad Logic (In-game modifier)
                        if (trackMap[currentY][currentX] === 5 && cmd !== 'BOOST') {
                            // Auto-slide 1 more
                            spawnParticles(currentX, currentY, '#F59E0B', 10);
                            audio.playScan();
                            // Recursive slide logic (simplified for this update)
                        }

                    } else {
                        crashed = true;
                        spawnParticles(nextX, nextY, '#EF4444', 10);
                        audio.playError();
                        audio.vibrate(audio.haptics.failure);
                        break;
                    }
                }
            }

            if (crashed) break;
            await wait(100);
        }

        // Final Check
        if (!crashed && trackMap[currentY] && trackMap[currentY][currentX] === 3) {
            setStatus('WIN');
            audio.playSuccess();
            setFeedback(t('neondrift.course_clear'));
            handleWin(); // Save progress and calculate stars
        } else {
            setStatus('CRASHED');
            if (!crashed) audio.playError();
            setFeedback(t('neondrift.crashed'));
        }
        setActiveStep(-1);
    };

    const addCommand = (cmd: Command) => {
        if (commands.length < commandLimit) {
            setCommands([...commands, cmd]);
            audio.playClick();
        }
    };

    return (
        <div className="h-full flex flex-col p-4 relative overflow-hidden bg-slate-950 font-mono select-none">
            <Scanlines />
            <Vignette />

            {/* SHOP OVERLAY */}
            {showShop && user && onUpdateUser && (
                <SkinShop
                    gameType={GameType.NEON_DRIFT}
                    user={user}
                    onUpdateUser={onUpdateUser}
                    onClose={() => setShowShop(false)}
                />
            )}

            {/* LEVEL SELECT OVERLAY */}
            {showLevelSelect && (
                <div className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-sm flex flex-col p-6 animate-in fade-in">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-black text-white">SELECT TRACK</h2>
                            <p className="text-xs text-slate-500 font-mono">Complete levels to unlock more</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => onComplete(0)}>
                            EXIT
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3">
                        {LEVELS.map((level, idx) => {
                            const isUnlocked = idx === 0 || progress[LEVELS[idx - 1].id]?.completed;
                            const levelProgress = progress[level.id];
                            const stars = levelProgress?.stars || 0;

                            return (
                                <button
                                    key={level.id}
                                    onClick={() => selectLevel(level)}
                                    disabled={!isUnlocked}
                                    className={`w-full p-4 rounded-xl border-2 text-left transition-all active:scale-98 ${isUnlocked
                                        ? 'bg-slate-900/80 border-slate-700 hover:border-cyan-500 hover:bg-slate-800/80'
                                        : 'bg-slate-900/30 border-slate-800 opacity-50 cursor-not-allowed'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg ${isUnlocked ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-600'
                                                }`}>
                                                {isUnlocked ? level.id : <Lock size={16} />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white text-sm">{level.name}</div>
                                                <div className="text-[10px] text-slate-500 font-mono">
                                                    {level.moveLimit} MOVES MAX • {level.grid.length}x{level.grid.length} GRID
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-1">
                                            {[1, 2, 3].map(s => (
                                                <Star
                                                    key={s}
                                                    size={16}
                                                    className={s <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-slate-700'}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {levelProgress?.completed && (
                                        <div className="mt-2 text-[10px] text-cyan-400 font-mono">
                                            ✓ BEST: {levelProgress.bestMoves} moves
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-800">
                        <Button
                            fullWidth
                            variant="secondary"
                            onClick={() => { setCurrentLevel(null); setShowLevelSelect(false); generateTrack(); }}
                        >
                            <Zap size={16} className="mr-2" /> RANDOM MODE
                        </Button>
                    </div>
                </div>
            )}

            {/* --- VISUALIZER --- */}
            <div className="flex-1 bg-[#0a0a0a] rounded-xl border-2 border-slate-800 relative overflow-hidden flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(0,0,0,0.5)] perspective-[800px]">
                {/* Grid Floor with animation */}
                <div
                    className="absolute inset-0 transform scale-150 opacity-40"
                    style={{
                        background: 'linear-gradient(rgba(6,182,212,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.15) 1px, transparent 1px)',
                        backgroundSize: '50px 50px',
                        animation: 'gridFlow 3s linear infinite'
                    }}
                ></div>
                {/* Horizon glow */}
                <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-purple-900/20 to-transparent pointer-events-none"></div>

                <div className="absolute top-4 left-4 z-30">
                    <Button size="sm" variant="ghost" onClick={() => { setShowLevelSelect(true); setCommands([]); setStatus('IDLE'); }}>
                        <ChevronLeft size={16} className="mr-1" /> LEVELS
                    </Button>
                </div>

                <div className="absolute top-4 right-4 z-30">
                    <Button size="sm" variant="ghost" onClick={() => { generateTrack(); setCommands([]); setStatus('IDLE'); }}>
                        <Map size={16} className="mr-2" /> GEN
                    </Button>
                </div>

                <div className="relative transform rotate-x-30 transition-transform duration-500 scale-90">
                    <div className="grid gap-1 p-4" style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
                        {trackMap.flat().map((cell, i) => {
                            return (
                                <div key={i} className={`w-12 h-12 rounded-md flex items-center justify-center relative ${cell === 4 ? 'bg-transparent' :
                                    cell === 2 ? 'bg-cyan-900/50 border-2 border-cyan-500' :
                                        cell === 3 ? 'bg-purple-900/50 border-2 border-purple-500' :
                                            cell === 5 ? 'bg-amber-900/50 border-2 border-amber-500' :
                                                'bg-slate-800/80 border border-slate-700 shadow-inner'
                                    }`}>
                                    {cell === 1 && <div className="w-1 h-1 bg-white/20 rounded-full"></div>}
                                    {cell === 3 && <Flag className="text-purple-400 w-6 h-6 animate-bounce drop-shadow-[0_0_5px_#C45FFF]" />}
                                    {cell === 5 && <div className="text-amber-500 font-bold text-[10px] animate-pulse">&gt;&gt;&gt;</div>}
                                </div>
                            );
                        })}
                    </div>

                    {/* Skid Marks Layer */}
                    <div className="absolute inset-0 pointer-events-none">
                        {skidMarks.map((mark, i) => (
                            <div
                                key={i}
                                className="absolute w-2 h-2 bg-black opacity-50 rounded-full"
                                style={{ left: mark.x, top: mark.y }}
                            ></div>
                        ))}
                    </div>

                    {/* THE CAR (SPRITE) */}
                    <div
                        className="absolute top-4 left-4 w-12 h-12 flex items-center justify-center z-20 transition-none"
                        style={{
                            transform: `translate(${carPos.x * 52}px, ${carPos.y * 52}px)`
                        }}
                    >
                        <div
                            className="w-10 h-10 relative flex items-center justify-center"
                            style={{ transform: `rotate(${carPos.rotation}deg)` }}
                        >
                            {carSpriteRef.current ? (
                                <img src={carSpriteRef.current.src} className="w-full h-full object-contain drop-shadow-[0_0_15px_#22d3ee]" alt="Car" />
                            ) : (
                                <div className="w-9 h-6 bg-gradient-to-r from-cyan-400 to-cyan-300 rounded shadow-[0_0_25px_#22d3ee] relative flex items-center border border-cyan-200/50">
                                    <div className="absolute -right-1.5 h-full w-1.5 bg-white rounded-r opacity-90"></div>
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-2 bg-black/30 rounded"></div>
                                    <div className="absolute left-1 top-0.5 w-1 h-1 bg-yellow-400 rounded-full animate-pulse"></div>
                                    <div className="absolute left-1 bottom-0.5 w-1 h-1 bg-red-500 rounded-full"></div>
                                </div>
                            )}
                            {/* Headlight beam */}
                            <div className="absolute right-0 w-24 h-12 bg-gradient-to-r from-cyan-400/0 via-cyan-300/20 to-transparent transform rotate-0 blur-md pointer-events-none"></div>
                            {/* Engine glow */}
                            <div className="absolute -left-2 w-4 h-3 bg-gradient-to-l from-orange-500/40 to-transparent blur-sm pointer-events-none"></div>
                        </div>
                    </div>

                    {/* Particles */}
                    {particles.map((p) => (
                        <div
                            key={p.id}
                            className="absolute w-1.5 h-1.5 rounded-full animate-ping pointer-events-none"
                            style={{ left: p.x, top: p.y, backgroundColor: p.color }}
                        ></div>
                    ))}
                </div>

                {status === 'CRASHED' && (
                    <div className="absolute inset-0 bg-gradient-to-b from-red-950/90 to-black/95 flex flex-col items-center justify-center backdrop-blur-sm animate-shake z-30">
                        <Flame size={64} className="text-red-500 mb-4 animate-bounce" />
                        <h2 className="text-4xl font-black text-white tracking-widest" style={{ textShadow: '0 0 20px #ef4444' }}>{t('neondrift.crashed')}</h2>
                        <p className="text-red-400/70 text-sm mt-2 font-mono">COLLISION DETECTED</p>
                    </div>
                )}
                {status === 'WIN' && (
                    <div className="absolute inset-0 bg-gradient-to-b from-green-950/90 to-black/95 flex flex-col items-center justify-center backdrop-blur-sm z-30 animate-in fade-in">
                        <CheckCircle size={64} className="text-green-400 mb-4 animate-bounce" />
                        <h2 className="text-4xl font-black text-white tracking-widest mb-4" style={{ textShadow: '0 0 20px #22c55e' }}>{t('neondrift.course_clear')}</h2>
                        {currentLevel && (
                            <>
                                <div className="flex gap-2 mb-4">
                                    {[1, 2, 3].map(s => (
                                        <Star
                                            key={s}
                                            size={32}
                                            className={`transition-all duration-500 ${s <= calculateStars(commands.length) ? 'text-yellow-400 fill-yellow-400 animate-pulse' : 'text-slate-700'}`}
                                            style={{ animationDelay: `${s * 0.2}s` }}
                                        />
                                    ))}
                                </div>
                                <div className="text-lg text-cyan-400 font-mono">{commands.length} MOVES</div>
                                <div className="text-sm text-slate-500">Best for 3★: {currentLevel.stars.three}</div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* --- COMMAND DECK --- */}
            <div className="bg-black/50 border border-slate-700 rounded-xl p-4 space-y-4 relative z-10 backdrop-blur-md">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase flex items-center"><Cpu size={10} className="mr-1" /> {t('neondrift.logic_buffer')}</span>
                    <div className="flex items-center space-x-3">
                        {user && onUpdateUser && (
                            <button onClick={() => setShowShop(true)} className="text-xs font-bold text-amber-400 flex items-center hover:text-white">
                                <ShoppingBag size={12} className="mr-1" /> Loadout
                            </button>
                        )}
                        <span className={`text-[10px] font-mono ${commands.length > commandLimit ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>
                            {commands.length}/{commandLimit} {t('neondrift.ops')}
                        </span>
                    </div>
                </div>

                <div className="flex space-x-2 overflow-x-auto pb-2 min-h-[50px] scrollbar-hide items-center px-1">
                    {commands.length === 0 && <span className="text-gray-600 text-xs italic font-mono w-full text-center opacity-50">{t('neondrift.input_required')}</span>}
                    {commands.map((c, i) => (
                        <div key={i} className={`px-2 py-1 rounded border flex-shrink-0 flex items-center font-bold text-[10px] shadow-sm transition-all ${activeStep === i
                            ? 'bg-yellow-500 text-black border-yellow-400 scale-110 shadow-[0_0_15px_rgba(234,179,8,0.5)]'
                            : 'bg-slate-800 border-slate-600 text-cyan-300'
                            }`}>
                            {c === 'FORWARD' ? <ArrowUp size={12} /> : c === 'LEFT' ? <ArrowLeft size={12} /> : c === 'RIGHT' ? <ArrowRight size={12} /> : <Zap size={12} />}
                        </div>
                    ))}
                </div>

                {status !== 'WIN' && (
                    <div className="grid grid-cols-4 gap-2">
                        <Button variant="secondary" size="sm" onClick={() => addCommand('LEFT')} className="h-12 active:bg-cyan-900/50 border-slate-700"><ArrowLeft size={18} /></Button>
                        <Button variant="secondary" size="sm" onClick={() => addCommand('FORWARD')} className="h-12 active:bg-cyan-900/50 border-slate-700"><ArrowUp size={18} /></Button>
                        <Button variant="secondary" size="sm" onClick={() => addCommand('RIGHT')} className="h-12 active:bg-cyan-900/50 border-slate-700"><ArrowRight size={18} /></Button>
                        <Button variant="secondary" size="sm" onClick={() => addCommand('BOOST')} className="h-12 active:bg-amber-900/50 border-amber-700 text-amber-500"><Zap size={18} /></Button>
                    </div>
                )}

                <div className="flex space-x-2 pt-2 border-t border-white/5">
                    <Button variant="ghost" onClick={() => { setCommands([]); setStatus('IDLE'); setFeedback(''); audio.playClick(); }}><RotateCcw size={18} /></Button>
                    {status === 'WIN' ? (
                        <Button fullWidth variant="primary" onClick={() => onComplete(100)} className="shadow-[0_0_20px_#22c55e]">{t('neondrift.claim_data')}</Button>
                    ) : (
                        <Button fullWidth variant="primary" onClick={handleRun} disabled={status === 'RUNNING'}>
                            {status === 'RUNNING' ? <span className="animate-pulse">{t('neondrift.executing')}</span> : <><Play size={18} className="mr-2" /> {t('neondrift.compile_run')}</>}
                        </Button>
                    )}
                </div>

                {feedback && (
                    <div className="absolute top-[-40px] left-0 right-0 text-center">
                        <span className="bg-black/80 text-cyan-400 text-xs px-3 py-1 rounded border border-cyan-500/30 font-mono shadow-lg">{feedback}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
