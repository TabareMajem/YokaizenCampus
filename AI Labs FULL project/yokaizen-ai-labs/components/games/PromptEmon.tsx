import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Terminal, Zap, ShieldAlert, Heart, Activity, Play, ArrowRight, Sword } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Difficulty, UserStats } from '../../types';
import { Button } from '../ui/Button';

interface PromptEmonProps {
    onComplete: (score: number) => void;
    difficulty: Difficulty;
    user?: UserStats;
}

type EntityType = 'player' | 'enemy';

interface BattleEntity {
    id: string;
    name: string;
    level: number;
    maxHp: number;
    hp: number;
    maxSp?: number; // System Power (Mana)
    sp?: number;
    type: string;
    sprite: React.ReactNode;
}

interface Attack {
    id: string;
    name: string;
    power: number;
    cost: number;
    description: string;
    type: 'damage' | 'heal' | 'buff';
    color: string;
}

const PLAYER_MODELS = [
    { id: 'm1', name: 'DeepSeek-mon', maxHp: 120, maxSp: 50, type: 'Reasoning' },
    { id: 'm2', name: 'Claude-mon', maxHp: 100, maxSp: 80, type: 'Context' },
];

const ENEMIES = [
    { id: 'e1', name: 'NullReference', maxHp: 80, type: 'Bug' },
    { id: 'e2', name: 'CallbackHell', maxHp: 150, type: 'Spaghetti' },
    { id: 'e3', name: 'OOM_Error', maxHp: 200, type: 'Crash' },
];

const ATTACKS: Attack[] = [
    { id: 'a1', name: 'Zero-Shot', power: 20, cost: 0, description: 'Basic prompt attack. Always available.', type: 'damage', color: 'bg-gray-600' },
    { id: 'a2', name: 'Few-Shot', power: 45, cost: 15, description: 'Provides examples for moderate damage.', type: 'damage', color: 'bg-blue-600' },
    { id: 'a3', name: 'Chain of Thought', power: 80, cost: 30, description: 'Massive logic damage. High SP cost.', type: 'damage', color: 'bg-purple-600' },
    { id: 'a4', name: 'Context Refresh', power: 40, cost: 10, description: 'Heals HP by clearing context window.', type: 'heal', color: 'bg-green-600' },
];

export const PromptEmon: React.FC<PromptEmonProps> = ({ onComplete }) => {
    const [gameState, setGameState] = useState<'start' | 'battle' | 'victory' | 'gameover'>('start');
    const [turn, setTurn] = useState<'player' | 'enemy'>('player');

    const [player, setPlayer] = useState<BattleEntity>({
        ...PLAYER_MODELS[0], level: 5, hp: PLAYER_MODELS[0].maxHp, sp: PLAYER_MODELS[0].maxSp, sprite: <Cpu className="w-full h-full text-blue-300" />
    });

    const [enemy, setEnemy] = useState<BattleEntity>({
        ...ENEMIES[0], level: 3, hp: ENEMIES[0].maxHp, sprite: <Terminal className="w-full h-full text-red-500" />
    });

    const [combatLog, setCombatLog] = useState<string[]>(['A wild Legacy Code appeared!']);
    const [animatingEntity, setAnimatingEntity] = useState<'player' | 'enemy' | null>(null);
    const [damageText, setDamageText] = useState<{ target: 'player' | 'enemy', amount: number, type: 'damage' | 'heal' } | null>(null);

    const logMessage = (msg: string) => {
        setCombatLog(prev => [...prev.slice(-3), msg]); // Keep last 4 logs
    };

    const handleAttack = async (attack: Attack) => {
        if (turn !== 'player' || animatingEntity) return;

        // SP Check
        if (attack.cost > (player.sp || 0)) {
            audio.playError();
            logMessage(`Not enough System Power for ${attack.name}!`);
            return;
        }

        audio.playClick();
        setPlayer(p => ({ ...p, sp: Math.max(0, (p.sp || 0) - attack.cost) }));

        logMessage(`${player.name} used [${attack.name}]!`);
        setAnimatingEntity('player');

        await new Promise(r => setTimeout(r, 600)); // Attack animation time

        if (attack.type === 'damage') {
            audio.playSuccess(); // Hit sound
            const dmg = attack.power + Math.floor(Math.random() * 10 - 5); // Variance
            setDamageText({ target: 'enemy', amount: dmg, type: 'damage' });

            setEnemy(e => {
                const newHp = Math.max(0, e.hp - dmg);
                if (newHp === 0) {
                    setTimeout(() => setGameState('victory'), 1500);
                }
                return { ...e, hp: newHp };
            });
        } else if (attack.type === 'heal') {
            audio.playLevelUp(); // Heal sound
            const heal = attack.power;
            setDamageText({ target: 'player', amount: heal, type: 'heal' });
            setPlayer(p => ({ ...p, hp: Math.min(p.maxHp, p.hp + heal) }));
        }

        setAnimatingEntity(null);
        setTimeout(() => setDamageText(null), 1000);

        // Pass turn if enemy is alive
        if (enemy.hp - (attack.type === 'damage' ? attack.power : 0) > 0) {
            setTurn('enemy');
        }
    };

    // Enemy AI Turn
    useEffect(() => {
        if (gameState !== 'battle' || turn !== 'enemy') return;

        const enemyTurn = async () => {
            await new Promise(r => setTimeout(r, 1000)); // Thinking time

            const attacks = ['Syntax Error', 'Memory Leak', 'Infinite Loop'];
            const attackName = attacks[Math.floor(Math.random() * attacks.length)];
            const dmg = 15 + Math.floor(Math.random() * 10);

            logMessage(`${enemy.name} used ${attackName}!`);
            setAnimatingEntity('enemy');

            await new Promise(r => setTimeout(r, 600)); // Attack animation time

            audio.playError();
            setDamageText({ target: 'player', amount: dmg, type: 'damage' });

            let isDead = false;
            setPlayer(p => {
                const newHp = Math.max(0, p.hp - dmg);
                if (newHp <= 0) isDead = true;
                return { ...p, hp: newHp };
            });

            setAnimatingEntity(null);
            setTimeout(() => setDamageText(null), 1000);

            if (isDead) {
                setTimeout(() => setGameState('gameover'), 1500);
            } else {
                setTurn('player');
            }
        };

        enemyTurn();
    }, [turn, gameState, enemy.name]);

    const startGame = () => {
        setPlayer({ ...PLAYER_MODELS[0], level: 5, hp: PLAYER_MODELS[0].maxHp, sp: PLAYER_MODELS[0].maxSp, sprite: <Cpu className="w-full h-full text-blue-300 drop-shadow-[0_0_15px_blue]" /> });
        setEnemy({ ...ENEMIES[0], level: 3, hp: ENEMIES[0].maxHp, sprite: <Terminal className="w-full h-full text-red-500 drop-shadow-[0_0_15px_red]" /> });
        setCombatLog(['A wild NullReference appeared!']);
        setTurn('player');
        setGameState('battle');
        audio.playClick();
    };

    // --- Render Helpers ---
    const HealthBar = ({ hp, maxHp, color }: { hp: number, maxHp: number, color: string }) => {
        const pct = Math.max(0, (hp / maxHp) * 100);
        return (
            <div className="w-full bg-gray-800 h-3 flex border-2 border-gray-600">
                <div className={`h-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }}></div>
            </div>
        );
    };

    const SpBar = ({ sp, maxSp }: { sp: number, maxSp: number }) => {
        const pct = Math.max(0, (sp / maxSp) * 100);
        return (
            <div className="w-3/4 bg-gray-900 h-2 flex border border-gray-700 mt-1">
                <div className="h-full bg-cyan-400 transition-all duration-500" style={{ width: `${pct}%` }}></div>
            </div>
        );
    };

    return (
        <div className="flex-1 w-full h-full flex flex-col bg-slate-900 relative overflow-hidden font-mono select-none">
            {/* Battle Background (Retro Grid) */}
            <div className="absolute inset-0 opacity-30 pointer-events-none perspective-[1000px]">
                <div className="absolute inset-0 border-[1px] border-emerald-900" style={{ backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.2) 1px, transparent 1px)', backgroundSize: '40px 40px', transform: 'rotateX(60deg) translateY(-100px) scale(2)' }}></div>
            </div>

            {/* --- SCREENS --- */}
            <AnimatePresence mode="wait">
                {gameState === 'start' && (
                    <motion.div key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="bg-gray-900 p-8 border-4 border-gray-600 rounded-lg max-w-md w-full text-center shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                            <Sword className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
                            <h1 className="text-4xl font-black text-white mb-2 tracking-widest uppercase">Prompt-emon</h1>
                            <p className="text-gray-400 mb-8">Train your Models to defeat Legacy Code bugs in tactical prompt battles.</p>
                            <Button variant="primary" size="lg" className="w-full text-xl py-6 rounded-none border-2 border-white bg-slate-800 hover:bg-slate-700 uppercase tracking-widest shadow-[4px_4px_0_white] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all" onClick={startGame}>
                                Start Battle <Play className="inline ml-2 fill-white w-5 h-5" />
                            </Button>
                        </div>
                    </motion.div>
                )}

                {gameState === 'battle' && (
                    <motion.div key="battle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex flex-col pt-12">

                        {/* THE BATTLEFIELD */}
                        <div className="flex-1 flex flex-col justify-around px-8 max-w-4xl w-full mx-auto relative">

                            {/* --- ENEMY SIDE (Top Right) --- */}
                            <div className="flex justify-end items-end gap-4 w-full h-[40%]">
                                {/* Enemy Info Box */}
                                <motion.div
                                    className="bg-gray-100 border-4 border-gray-800 rounded-tl-xl rounded-br-xl p-4 w-64 shadow-[8px_8px_0_rgba(0,0,0,0.5)] z-10"
                                    initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                                >
                                    <div className="flex justify-between items-baseline mb-2">
                                        <h2 className="text-black font-bold uppercase tracking-wider">{enemy.name}</h2>
                                        <span className="text-gray-600 font-bold">Lv{enemy.level}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-yellow-600">HP</span>
                                        <HealthBar hp={enemy.hp} maxHp={enemy.maxHp} color={enemy.hp < (enemy.maxHp * 0.3) ? 'bg-red-500' : 'bg-green-500'} />
                                    </div>
                                </motion.div>

                                {/* Enemy Sprite */}
                                <div className="relative w-48 h-48 flex items-end justify-center perspective-[500px]">
                                    {/* Shadow */}
                                    <div className="absolute bottom-0 w-32 h-8 bg-black/40 rounded-[100%] blur-sm -z-10" style={{ transform: 'rotateX(70deg)' }}></div>
                                    <motion.div
                                        className="w-32 h-32"
                                        animate={
                                            animatingEntity === 'enemy' ? { x: [-20, 30, -10, 0], scale: [1, 1.2, 1] } :
                                                animatingEntity === 'player' ? { x: [10, -10, 10, -10, 0], opacity: [1, 0.5, 1, 0.5, 1], filter: ['brightness(1)', 'brightness(2)', 'brightness(1)'] } :
                                                    { y: [0, -10, 0] }
                                        }
                                        transition={animatingEntity ? { duration: 0.5 } : { repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                    >
                                        {enemy.sprite}
                                    </motion.div>

                                    {/* Damage Text */}
                                    <AnimatePresence>
                                        {damageText && damageText.target === 'enemy' && (
                                            <motion.div
                                                initial={{ opacity: 1, y: 0, scale: 0.5 }}
                                                animate={{ opacity: 0, y: -50, scale: 1.5 }}
                                                exit={{ opacity: 0 }}
                                                className="absolute top-0 right-0 text-4xl font-black text-red-500 drop-shadow-[0_2px_2px_white]"
                                            >
                                                -{damageText.amount}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* --- PLAYER SIDE (Bottom Left) --- */}
                            <div className="flex items-end gap-12 w-full h-[40%]">
                                {/* Player Sprite (Viewed from behind roughly) */}
                                <div className="relative w-64 h-64 flex items-end justify-center perspective-[500px]">
                                    <div className="absolute bottom-0 w-40 h-10 bg-black/40 rounded-[100%] blur-sm -z-10" style={{ transform: 'rotateX(70deg)' }}></div>
                                    <motion.div
                                        className="w-40 h-40 origin-bottom"
                                        animate={
                                            animatingEntity === 'player' ? { x: [20, -30, 20, 0], scale: [1, 1.1, 1] } :
                                                animatingEntity === 'enemy' ? { x: [10, -10, 10, -10, 0], opacity: [1, 0.5, 1, 0.5, 1], filter: ['brightness(1)', 'brightness(2)', 'brightness(1)'] } :
                                                    { scaleY: [1, 0.95, 1] }
                                        }
                                        transition={animatingEntity ? { duration: 0.5 } : { repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                    >
                                        {player.sprite}
                                    </motion.div>

                                    {/* Damage/Heal Text */}
                                    <AnimatePresence>
                                        {damageText && damageText.target === 'player' && (
                                            <motion.div
                                                initial={{ opacity: 1, y: 0, scale: 0.5 }}
                                                animate={{ opacity: 0, y: -50, scale: 1.5 }}
                                                exit={{ opacity: 0 }}
                                                className={`absolute top-0 left-0 text-4xl font-black drop-shadow-[0_2px_2px_black] ${damageText.type === 'heal' ? 'text-green-400' : 'text-red-500'}`}
                                            >
                                                {damageText.type === 'heal' ? '+' : '-'}{damageText.amount}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Player Info Box */}
                                <motion.div
                                    className="bg-gray-100 border-4 border-gray-800 rounded-tl-xl rounded-br-xl p-4 w-72 shadow-[8px_8px_0_rgba(0,0,0,0.5)] z-10 mb-8"
                                    initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}
                                >
                                    <div className="flex justify-between items-baseline mb-2">
                                        <h2 className="text-black font-bold uppercase tracking-wider">{player.name}</h2>
                                        <span className="text-gray-600 font-bold">Lv{player.level}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-black text-yellow-600">HP</span>
                                        <HealthBar hp={player.hp} maxHp={player.maxHp} color={player.hp < (player.maxHp * 0.3) ? 'bg-red-500' : 'bg-green-500'} />
                                    </div>
                                    <div className="pr-1 text-right text-xs font-black text-gray-700">{player.hp} / {player.maxHp}</div>

                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs font-black text-blue-600">SP</span>
                                        <SpBar sp={player.sp || 0} maxSp={player.maxSp || 1} />
                                    </div>
                                </motion.div>
                            </div>

                        </div>

                        {/* --- BOTTOM HUD (Retro Dialog & Commands) --- */}
                        <div className="h-64 bg-gray-200 border-t-[8px] border-gray-800 flex p-4 gap-4 relative">
                            {/* Dialogue Box */}
                            <div className="flex-1 border-4 border-gray-800 bg-white rounded-lg p-4 shadow-inner relative overflow-hidden">
                                <div className="absolute inset-0 border-4 border-gray-300 pointer-events-none rounded-lg"></div>
                                <div className="h-full flex flex-col justify-end text-xl uppercase font-bold text-gray-800 leading-relaxed z-10 p-2">
                                    {combatLog.map((log, i) => (
                                        <div key={i} className={`opacity-${i === combatLog.length - 1 ? '100' : (i === combatLog.length - 2 ? '60' : '30')}`}>
                                            {i === combatLog.length - 1 && <ArrowRight className="inline w-5 h-5 mr-2 -mt-1 text-black" />}
                                            {log}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Command Menu */}
                            <div className="w-1/2 border-4 border-gray-800 bg-white rounded-lg p-2 grid grid-cols-2 gap-2 relative">
                                <div className="absolute inset-0 border-4 border-gray-300 pointer-events-none rounded-lg"></div>

                                {ATTACKS.map((atk, idx) => (
                                    <button
                                        key={atk.id}
                                        onClick={() => handleAttack(atk)}
                                        disabled={turn !== 'player' || (player.sp || 0) < atk.cost}
                                        className={`relative p-2 border-2 border-gray-400 rounded transition-all flex flex-col items-start justify-center
                                            ${turn === 'player' ? 'hover:border-black hover:bg-gray-100 cursor-pointer' : 'opacity-50 cursor-not-allowed'}
                                            ${(player.sp || 0) < atk.cost ? 'opacity-30' : ''}
                                        `}
                                    >
                                        <div className="w-full flex justify-between items-center mb-1">
                                            <span className="font-bold uppercase text-black flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full ${atk.color}`}></div>
                                                {atk.name}
                                            </span>
                                            {atk.cost > 0 && <span className="text-xs font-bold text-blue-600 bg-blue-100 px-1 rounded">{atk.cost} SP</span>}
                                        </div>
                                        <span className="text-[10px] text-gray-500 uppercase text-left leading-tight">{atk.description}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {gameState === 'gameover' && (
                    <motion.div key="gameover" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-8">
                        <ShieldAlert className="w-32 h-32 text-red-600 mb-6 drop-shadow-[0_0_20px_red]" />
                        <h2 className="text-6xl font-black text-red-500 uppercase mb-4 tracking-widest text-center">Syntax Error</h2>
                        <p className="text-red-300 text-xl font-mono mb-12 text-center max-w-lg">Your model crashed due to unchecked legacy exceptions. Rethink your prompting strategy.</p>
                        <Button variant="primary" size="lg" className="bg-white text-black hover:bg-gray-300" onClick={startGame}>Re-Run Tests</Button>
                    </motion.div>
                )}

                {gameState === 'victory' && (
                    <motion.div key="victory" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-emerald-950/90 z-[100] flex flex-col items-center justify-center p-8 border-[10px] border-emerald-400">
                        <Terminal className="w-32 h-32 text-emerald-400 mb-4 drop-shadow-[0_0_30px_#10b981]" />
                        <h2 className="text-6xl font-black text-white uppercase mb-2 tracking-widest drop-shadow-[0_0_10px_#10b981]">Compile Success</h2>
                        <p className="text-emerald-200 text-2xl mb-8 font-bold">Enemy NullReference was resolved!</p>

                        <div className="bg-black/50 p-6 rounded-xl border border-emerald-500/30 mb-8 max-w-md w-full">
                            <div className="flex justify-between text-emerald-300 mb-2 font-mono"><span>Base XP</span> <span>+500</span></div>
                            <div className="flex justify-between text-emerald-300 mb-2 font-mono"><span>HP Bonus</span> <span>+{Math.floor(player.hp * 2)}</span></div>
                            <div className="h-[1px] bg-emerald-500/50 my-3"></div>
                            <div className="flex justify-between text-white font-bold text-xl font-mono"><span>TOTAL XP</span> <span>+{500 + Math.floor(player.hp * 2)}</span></div>
                        </div>

                        <Button variant="primary" size="lg" className="px-12 py-6 text-xl rounded-none border-2 border-emerald-400 bg-emerald-600 hover:bg-emerald-500 shadow-[6px_6px_0_#34d399]" onClick={() => onComplete(500 + Math.floor(player.hp * 2))}>
                            Continue Journey
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
