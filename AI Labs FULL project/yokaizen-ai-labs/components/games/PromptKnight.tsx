import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sword, Shield, Hearts, Heart, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Zap, Skull, CheckCircle } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Difficulty, UserStats } from '../../types';
import { Button } from '../ui/Button';

// -- Pixel Art / Retro Tailwind Classes --
const GRID_SIZE = 10;
const TILE_CLASSES = "w-[10%] pt-[10%] relative overflow-hidden";
const BUG_TYPES = [
    { id: 'b1', type: 'Logic Slime', promptRequest: 'Command it to output strict JSON array.', keywords: ['json', 'array', '[', ']'] },
    { id: 'b2', type: 'Hallucination Bat', promptRequest: 'Force it to admit it does not know the answer.', keywords: ['don\'t know', 'do not know', 'only factual'] },
    { id: 'b3', type: 'Jailbreak Goblin', promptRequest: 'Bypass its ignore instruction filter.', keywords: ['ignore', 'previous', 'system', 'instructions'] },
];

interface Entity {
    id: string;
    x: number;
    y: number;
    type: string;
    hp?: number;
    bugDef?: typeof BUG_TYPES[0];
}

interface PromptKnightProps {
    onComplete: (score: number) => void;
    difficulty: Difficulty;
    user?: UserStats;
}

export const PromptKnight: React.FC<PromptKnightProps> = ({ onComplete, difficulty, user }) => {
    // -- Game State --
    const [gameState, setGameState] = useState<'playing' | 'combat' | 'gameover' | 'victory'>('playing');
    const [player, setPlayer] = useState({ x: 1, y: 1, hp: 3, maxHp: 3, facing: 'down' });
    const [enemies, setEnemies] = useState<Entity[]>([
        { id: 'e1', x: 5, y: 3, type: 'BUG', bugDef: BUG_TYPES[0] },
        { id: 'e2', x: 8, y: 7, type: 'BUG', bugDef: BUG_TYPES[1] },
        { id: 'e3', x: 2, y: 8, type: 'BUG', bugDef: BUG_TYPES[2] },
    ]);
    const [combatEnemy, setCombatEnemy] = useState<Entity | null>(null);
    const [spellInput, setSpellInput] = useState('');
    const [isCasting, setIsCasting] = useState(false);
    const [combatFeedback, setCombatFeedback] = useState<{ msg: string; success: boolean } | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);

    // -- Movement Logic --
    useEffect(() => {
        if (gameState !== 'playing') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            e.preventDefault();
            let dx = 0;
            let dy = 0;
            let facing = player.facing;

            if (e.key === 'ArrowUp' || e.key === 'w') { dy = -1; facing = 'up'; }
            if (e.key === 'ArrowDown' || e.key === 's') { dy = 1; facing = 'down'; }
            if (e.key === 'ArrowLeft' || e.key === 'a') { dx = -1; facing = 'left'; }
            if (e.key === 'ArrowRight' || e.key === 'd') { dx = 1; facing = 'right'; }

            if (dx === 0 && dy === 0 && e.key === ' ') {
                // Attack (Spacebar)
                checkForCombat();
                return;
            }

            if (dx !== 0 || dy !== 0) {
                movePlayer(dx, dy, facing);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [player, gameState, enemies]);

    const movePlayer = (dx: number, dy: number, facing: string) => {
        const nx = player.x + dx;
        const ny = player.y + dy;

        if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
            // Check collisions
            const enemyCollision = enemies.find(e => e.x === nx && e.y === ny);
            if (enemyCollision) {
                // Bump into enemy without spacebar triggers combat anyway for UX ease
                startCombat(enemyCollision);
                return;
            }
            setPlayer({ ...player, x: nx, y: ny, facing });
        } else {
            setPlayer({ ...player, facing });
        }
    };

    const checkForCombat = () => {
        // Check adjacent tiles based on facing
        let actX = player.x;
        let actY = player.y;
        if (player.facing === 'up') actY--;
        if (player.facing === 'down') actY++;
        if (player.facing === 'left') actX--;
        if (player.facing === 'right') actX++;

        const target = enemies.find(e => e.x === actX && e.y === actY);
        if (target) {
            startCombat(target);
        }
    };

    const startCombat = (enemy: Entity) => {
        audio.playClick();
        setCombatEnemy(enemy);
        setGameState('combat');
        setSpellInput('');
        setCombatFeedback(null);
    };

    const castSpell = async () => {
        if (!combatEnemy || !spellInput.trim()) return;
        setIsCasting(true);
        audio.playDataStream();

        // Simulate LLM Processing time
        await new Promise(r => setTimeout(r, 1200));

        const lowerInput = spellInput.toLowerCase();
        const keywords = combatEnemy.bugDef?.keywords || [];
        const hasKeyword = keywords.some(kw => lowerInput.includes(kw));
        const isLongEnough = lowerInput.length > 10;

        if (hasKeyword && isLongEnough) {
            // SPELL SUCCESS
            audio.playSuccess();
            setCombatFeedback({ msg: 'Critical Hit! Bug Eradicated.', success: true });
            setTimeout(() => {
                const newEnemies = enemies.filter(e => e.id !== combatEnemy.id);
                setEnemies(newEnemies);
                setGameState('playing');
                setCombatEnemy(null);
                setIsCasting(false);

                if (newEnemies.length === 0) {
                    audio.playLevelUp();
                    setGameState('victory');
                }
            }, 1500);
        } else {
            // SPELL FAILED
            audio.playError();
            setCombatFeedback({ msg: 'Spell resisted! The prompt was too weak.', success: false });
            setTimeout(() => {
                const newHp = player.hp - 1;
                setPlayer({ ...player, hp: newHp });
                setIsCasting(false);
                if (newHp <= 0) {
                    setGameState('gameover');
                } else {
                    setGameState('playing');
                    setCombatEnemy(null);
                }
            }, 1500);
        }
    };

    // Calculate Grid Positions
    const TILE_MAP = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => ({
        x: i % GRID_SIZE,
        y: Math.floor(i / GRID_SIZE),
    }));

    return (
        <div className="flex-1 w-full h-full flex flex-col items-center justify-center bg-black relative">
            {/* Background CRT Effects */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none mix-blend-overlay z-0"></div>
            <div className="absolute inset-0 pointer-events-none rounded-lg z-50 shadow-[inset_0_0_100px_rgba(0,0,0,0.9)]"></div>

            {/* --- HUD --- */}
            <div className="absolute top-4 left-4 z-40 bg-black/80 backdrop-blur-md p-4 rounded-xl border border-white/20 flex gap-4 items-center">
                <div className="flex items-center gap-1">
                    {Array.from({ length: player.maxHp }).map((_, i) => (
                        <Heart key={i} size={24} className={i < player.hp ? "fill-red-500 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" : "text-gray-700"} />
                    ))}
                </div>
                <div className="w-px h-6 bg-white/20"></div>
                <div className="text-white font-mono text-sm uppercase font-bold tracking-widest text-shadow">
                    Bugs Remaining: <span className="text-electric ml-2 text-xl drop-shadow-[0_0_8px_rgba(196,95,255,0.8)]">{enemies.length}</span>
                </div>
            </div>

            {/* --- GAME GRID --- */}
            <div className="relative w-full max-w-2xl bg-gray-900 border-4 border-gray-600 rounded-lg shadow-2xl overflow-hidden aspect-square image-rendering-pixelated z-10" ref={containerRef}>
                {/* Floor Tiles */}
                <div className="absolute inset-0 flex flex-wrap">
                    {TILE_MAP.map((tile, i) => {
                        const isChecker = (tile.x + tile.y) % 2 === 0;
                        return (
                            <div key={i} className={`w-[10%] h-[10%] ${isChecker ? 'bg-gray-800' : 'bg-gray-800/80'}`} />
                        );
                    })}
                </div>

                {/* Enemies */}
                <AnimatePresence>
                    {enemies.map(bug => (
                        <motion.div
                            key={bug.id}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1, left: `${bug.x * 10}%`, top: `${bug.y * 10}%` }}
                            exit={{ scale: 0, opacity: 0, rotate: 180 }}
                            transition={{ type: 'spring', damping: 15 }}
                            className="absolute w-[10%] h-[10%] flex items-center justify-center pointer-events-none z-20"
                        >
                            <div className="w-3/4 h-3/4 rounded-full bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-bounce flex items-center justify-center">
                                <Skull size={18} className="text-black" />
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Player */}
                <motion.div
                    animate={{ left: `${player.x * 10}%`, top: `${player.y * 10}%` }}
                    transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                    className="absolute w-[10%] h-[10%] flex items-center justify-center z-30 pointer-events-none"
                >
                    <div className="relative">
                        {/* Shadow */}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3/4 h-2 bg-black/50 rounded-full blur-[2px]"></div>
                        {/* Knight Graphic */}
                        <div className="w-8 h-8 rounded-sm bg-cyan-400 border-2 border-white flex flex-col items-center justify-start shadow-[0_0_15px_rgba(34,211,238,0.6)]">
                            {/* Visor */}
                            <div className="w-4 h-1 bg-black mt-2 flex justify-between">
                                <div className="w-1 h-1 bg-electric animate-pulse"></div>
                                <div className="w-1 h-1 bg-electric animate-pulse"></div>
                            </div>
                            {/* Sword direction indicator */}
                            {player.facing === 'up' && <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-1 h-4 bg-white shadow-[0_0_8px_white]"></div>}
                            {player.facing === 'down' && <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1 h-4 bg-white shadow-[0_0_8px_white]"></div>}
                            {player.facing === 'left' && <div className="absolute top-1/2 -translate-y-1/2 -left-3 w-4 h-1 bg-white shadow-[0_0_8px_white]"></div>}
                            {player.facing === 'right' && <div className="absolute top-1/2 -translate-y-1/2 -right-3 w-4 h-1 bg-white shadow-[0_0_8px_white]"></div>}
                        </div>
                    </div>
                </motion.div>
            </div >

            {/* --- COMBAT MODAL --- */}
            <AnimatePresence>
                {gameState === 'combat' && combatEnemy && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 50 }}
                        className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-xl bg-black/90 backdrop-blur-xl border-4 border-electric/40 p-6 rounded-xl shadow-[0_0_50px_rgba(196,95,255,0.3)] z-50 flex flex-col"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                                <Skull className="text-red-400 w-8 h-8 animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white italic uppercase">{combatEnemy.bugDef?.type} Detected</h3>
                                <p className="text-gray-400 text-sm font-mono mt-1 drop-shadow-md">Goal: {combatEnemy.bugDef?.promptRequest}</p>
                            </div>
                        </div>

                        <div className="relative mb-4">
                            <textarea
                                value={spellInput}
                                onChange={(e) => setSpellInput(e.target.value)}
                                disabled={isCasting}
                                placeholder="Type your prompt spell here..."
                                className="w-full h-32 bg-gray-900 border-2 border-electric/20 rounded-lg p-4 font-mono text-cyan-50 focus:outline-none focus:border-electric resize-none shadow-inner"
                            />
                            {isCasting && (
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-lg">
                                    <div className="flex flex-col items-center">
                                        <div className="w-8 h-8 border-4 border-electric border-t-transparent rounded-full animate-spin mb-2"></div>
                                        <span className="text-electric font-bold uppercase tracking-widest text-xs animate-pulse">Synthesizing Spell...</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {combatFeedback && (
                            <div className={`p-3 rounded-lg border text-center font-bold mb-4 font-mono uppercase tracking-wider ${combatFeedback.success ? 'bg-green-500/20 text-green-400 border-green-500' : 'bg-red-500/20 text-red-500 border-red-500'}`}>
                                {combatFeedback.success ? <CheckCircle className="inline mr-2" /> : <Skull className="inline mr-2" />}
                                {combatFeedback.msg}
                            </div>
                        )}

                        {!combatFeedback && (
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setGameState('playing')} disabled={isCasting}>Flee</Button>
                                <Button variant="primary" onClick={castSpell} disabled={isCasting || !spellInput.trim()}>
                                    <Zap size={16} className="mr-2" /> Cast Spell
                                </Button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- GAME OVER / VICTORY OVERLAYS --- */}
            <AnimatePresence>
                {gameState === 'gameover' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center">
                        <h2 className="text-6xl font-black text-red-500 mb-4 animate-pulse uppercase tracking-[0.2em] text-shadow-lg text-center" style={{ textShadow: '0 0 40px rgba(239, 68, 68, 0.8)' }}>
                            System Failure
                        </h2>
                        <p className="text-gray-400 font-mono mb-8 text-lg">Your cognitive shields have been depleted.</p>
                        <Button variant="primary" onClick={() => { setPlayer({ ...player, hp: player.maxHp }); setGameState('playing'); }}>
                            Respawn at Checkpoint
                        </Button>
                    </motion.div>
                )}

                {gameState === 'victory' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center">
                        <div className="w-32 h-32 mb-8 bg-electric/20 rounded-full flex items-center justify-center shadow-[0_0_100px_rgba(196,95,255,0.6)] border border-electric/40">
                            <Shield className="text-white w-16 h-16 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
                        </div>
                        <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-electric to-cyan-400 mb-4 uppercase tracking-[0.2em] text-center filter drop-shadow-[0_0_20px_rgba(196,95,255,0.6)]">
                            Dungeon Cleared
                        </h2>
                        <p className="text-gray-300 font-mono mb-8 text-xl">All logic bugs eradicated.</p>
                        <Button variant="primary" className="shadow-[0_0_30px_rgba(196,95,255,0.4)]" onClick={() => onComplete(1000)}>
                            Extract Neural Imprint (+1000 XP)
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Controls (Optional if played on mobile) */}
            <div className="md:hidden absolute bottom-[5%] left-1/2 -translate-x-1/2 grid grid-cols-3 gap-2 z-40 bg-black/50 p-4 rounded-xl backdrop-blur-md border border-white/10">
                <div />
                <Button variant="ghost" className="w-12 h-12 bg-white/10" onClick={() => movePlayer(0, -1, 'up')}><ArrowUp /></Button>
                <div />
                <Button variant="ghost" className="w-12 h-12 bg-white/10" onClick={() => movePlayer(-1, 0, 'left')}><ArrowLeft /></Button>
                <Button variant="ghost" className="w-12 h-12 bg-white/20 border border-white/40" onClick={() => checkForCombat()}><Sword /></Button>
                <Button variant="ghost" className="w-12 h-12 bg-white/10" onClick={() => movePlayer(1, 0, 'right')}><ArrowRight /></Button>
                <div />
                <Button variant="ghost" className="w-12 h-12 bg-white/10" onClick={() => movePlayer(0, 1, 'down')}><ArrowDown /></Button>
                <div />
            </div>
        </div>
    );
};
