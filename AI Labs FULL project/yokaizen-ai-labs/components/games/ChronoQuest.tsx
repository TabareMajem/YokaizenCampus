
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui/Button';
import { analyzeRPGChoice } from '../../services/geminiService';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Sword, Shield, Zap, User, Backpack, X, Heart, Terminal } from 'lucide-react';
import { Language } from '../../types';
import { useGameModal } from '../ui/GameModal';

interface ChronoQuestProps {
    onComplete: (score: number) => void;
    t: (key: string) => string;
    language?: Language;
}

// 0=Empty, 1=Wall, 2=NPC, 3=Enemy, 4=Chest, 5=Exit
const WORLD_MAP = [
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 2, 0, 0, 4, 1],
    [1, 0, 1, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 3, 0, 0, 1],
    [1, 1, 1, 0, 1, 1, 1, 1],
    [1, 5, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1]
];

interface Item {
    id: string;
    name: string;
    icon: string;
    type: 'HEAL' | 'ATTACK' | 'KEY';
    value: number;
}

interface Entity {
    x: number;
    y: number;
    type: 'PLAYER' | 'NPC' | 'ENEMY' | 'CHEST';
    id: string;
    name?: string;
    hp?: number;
}

type CombatMove = {
    id: string;
    name: string;
    type: 'ATTACK' | 'DEBUFF' | 'DEFENSE' | 'SPECIAL';
    icon: React.ReactNode;
    cost: number; // Token cost
    power: number;
    description: string;
};

type EnemyIntent = 'ATTACK' | 'CHARGE' | 'DEBUFF' | 'DEFEND';

export const ChronoQuest: React.FC<ChronoQuestProps> = ({ onComplete, t }) => {
    // Move definitions inside to use t()
    const MOVES = useMemo<CombatMove[]>(() => [
        { id: 'm1', name: t('chrono.move_attack'), type: 'ATTACK', icon: <Sword size={14} />, cost: 5, power: 20, description: t('chrono.move_attack_desc') },
        { id: 'm2', name: t('chrono.move_debuff'), type: 'DEBUFF', icon: <Terminal size={14} />, cost: 15, power: 5, description: t('chrono.move_debuff_desc') },
        { id: 'm3', name: t('chrono.move_defense'), type: 'DEFENSE', icon: <Shield size={14} />, cost: 10, power: 0, description: t('chrono.move_defense_desc') },
        { id: 'm4', name: t('chrono.move_special'), type: 'SPECIAL', icon: <Zap size={14} />, cost: 25, power: 60, description: t('chrono.move_special_desc') },
    ], [t]);

    const [player, setPlayer] = useState({ x: 1, y: 5, hp: 100, maxHp: 100, tokens: 50, level: 1, xp: 0 });
    const [inventory, setInventory] = useState<Item[]>([
        { id: 'i1', name: t('chrono.item_heal'), icon: '❤️', type: 'HEAL', value: 30 },
    ]);
    const [mode, setMode] = useState<'EXPLORE' | 'DIALOGUE' | 'BATTLE' | 'INVENTORY'>('EXPLORE');
    const [activeEntity, setActiveEntity] = useState<Entity | null>(null);
    const [dialogueHistory, setDialogueHistory] = useState<{ speaker: string, text: string }[]>([]);
    const [battleLog, setBattleLog] = useState<string[]>([]);

    // Battle State
    const [enemyHP, setEnemyHP] = useState(100);
    const [enemyMaxHP, setEnemyMaxHP] = useState(100);
    const [playerTurn, setPlayerTurn] = useState(true);
    const [timelineStability, setTimelineStability] = useState(100);
    const [enemyIntent, setEnemyIntent] = useState<EnemyIntent>('ATTACK');
    const [isEnemyStunned, setIsEnemyStunned] = useState(false);

    // Map State
    const [chestsOpened, setChestsOpened] = useState<string[]>([]);

    // Custom modal hook
    const { showModal, ModalComponent } = useGameModal();

    // Failsafe for battle hanging
    useEffect(() => {
        if (mode === 'BATTLE' && !playerTurn) {
            const timer = setTimeout(() => {
                console.warn("Battle hanging, forcing player turn.");
                setPlayerTurn(true);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [mode, playerTurn]);

    const move = (dx: number, dy: number) => {
        if (mode !== 'EXPLORE') return;
        const nx = player.x + dx;
        const ny = player.y + dy;

        const cell = WORLD_MAP[ny][nx];
        if (cell === 1) return; // Wall

        if (cell === 2) {
            startDialogue({ x: nx, y: ny, type: 'NPC', id: 'npc1', name: 'Oracle Node' });
            return;
        }
        if (cell === 3) {
            startBattle({ x: nx, y: ny, type: 'ENEMY', id: 'enemy1', name: t('chrono.enemy'), hp: 150 });
            return;
        }
        if (cell === 4) {
            if (!chestsOpened.includes(`${nx},${ny}`)) {
                setPlayer(p => ({ ...p, tokens: p.tokens + 50 }));
                setInventory(prev => [...prev, { id: `loot${Date.now()}`, name: 'Super Patch', icon: '💖', type: 'HEAL', value: 100 }]);
                setChestsOpened(prev => [...prev, `${nx},${ny}`]);
                showModal({ title: 'LOOT FOUND!', message: t('chrono.found_loot'), type: 'success', autoClose: 2000 });
            }
            return;
        }
        if (cell === 5) {
            onComplete(100);
            return;
        }

        setPlayer(p => ({ ...p, x: nx, y: ny }));
    };

    // --- Battle System ---
    const determineEnemyIntent = (): EnemyIntent => {
        const rand = Math.random();
        if (rand > 0.7) return 'CHARGE';
        if (rand > 0.4) return 'ATTACK';
        return 'DEBUFF';
    };

    const startBattle = (entity: Entity) => {
        setActiveEntity(entity);
        setEnemyHP(entity.hp || 150);
        setEnemyMaxHP(entity.hp || 150);
        setMode('BATTLE');
        setPlayerTurn(true);
        setTimelineStability(80);
        setEnemyIntent(determineEnemyIntent());
        setBattleLog([t('chrono.combat_init'), "Enemy detected."]);
    };

    const checkWinCondition = (currentEnemyHp: number) => {
        if (currentEnemyHp <= 0) {
            setBattleLog(prev => [...prev, t('chrono.target_neutralized')]);
            setPlayer(p => ({ ...p, xp: (p.xp || 0) + 150, level: p.level + 1 }));
            setTimeout(() => setMode('EXPLORE'), 2500);
            return true;
        }
        return false;
    };

    const executeMove = (move: CombatMove) => {
        if (!playerTurn || player.tokens < move.cost) return;

        // Pay Cost
        setPlayer(p => ({ ...p, tokens: p.tokens - move.cost }));

        let dmg = move.power;
        let log = `> ${t('debrief.share')} ${move.name}.`; // Assuming "Used" context

        // Move Logic
        if (move.type === 'SPECIAL') {
            if (timelineStability > 50) {
                dmg = 10;
                log += " Failed! Timeline too stable.";
            } else {
                log += " CRITICAL HIT! Chaos channeled.";
                setTimelineStability(s => Math.max(0, s - 20));
            }
        } else if (move.type === 'DEFENSE') {
            setPlayer(p => ({ ...p, hp: Math.min(p.maxHp, p.hp + 25) }));
            setTimelineStability(s => Math.min(100, s + 30));
            log += " HP Restored & Timeline Stabilized.";
        } else if (move.type === 'DEBUFF') {
            if (Math.random() > 0.3) {
                setIsEnemyStunned(true);
                log += " Enemy logic corrupted (Stunned).";
            } else {
                log += " Enemy resisted injection.";
            }
        }

        const newEnemyHp = Math.max(0, enemyHP - dmg);
        setEnemyHP(newEnemyHp);
        setBattleLog(prev => [...prev, log]);

        if (!checkWinCondition(newEnemyHp)) {
            setPlayerTurn(false);
            setTimeout(enemyTurn, 1500);
        }
    };

    const enemyTurn = () => {
        if (isEnemyStunned) {
            setBattleLog(prev => [...prev, "Enemy is stunned! Turn skipped."]);
            setIsEnemyStunned(false);
            setEnemyIntent(determineEnemyIntent());
            setPlayerTurn(true);
            return;
        }

        let dmg = 0;
        let log = `Enemy uses ${enemyIntent}.`;

        switch (enemyIntent) {
            case 'ATTACK':
                dmg = 15;
                if (timelineStability < 30) dmg += 10;
                break;
            case 'CHARGE':
                dmg = 30;
                setTimelineStability(s => Math.max(0, s - 20));
                break;
            case 'DEBUFF':
                dmg = 5;
                setPlayer(p => ({ ...p, tokens: Math.max(0, p.tokens - 10) }));
                log += " Drained your Tokens!";
                break;
        }

        setPlayer(p => ({ ...p, hp: Math.max(0, p.hp - dmg) }));
        setBattleLog(prev => [...prev, log + ` You took ${dmg} DMG.`]);

        setTimelineStability(s => Math.max(0, s - 5));

        if (player.hp - dmg <= 0) {
            setBattleLog(prev => [...prev, t('chrono.critical_failure')]);
            setTimeout(() => onComplete(0), 2000);
        } else {
            setPlayerTurn(true);
            setEnemyIntent(determineEnemyIntent());
            setPlayer(p => ({ ...p, tokens: Math.min(100, p.tokens + 5) }));
        }
    };

    const useItem = (item: Item) => {
        if (item.type === 'HEAL') setPlayer(p => ({ ...p, hp: Math.min(p.maxHp, p.hp + item.value) }));
        setInventory(prev => prev.filter(i => i.id !== item.id));
        if (mode === 'INVENTORY') setMode('EXPLORE');
    };

    const startDialogue = (entity: Entity) => {
        setActiveEntity(entity);
        setMode('DIALOGUE');
        setDialogueHistory([{ speaker: entity.name!, text: "Traveler... the timeline is fracturing. What do you seek?" }]);
    };

    const handleDialogueChoice = async (choice: string) => {
        setDialogueHistory(prev => [...prev, { speaker: 'You', text: choice }]);
        const response = await analyzeRPGChoice(activeEntity!.name!, choice);
        setDialogueHistory(prev => [...prev, { speaker: activeEntity!.name!, text: response }]);
        if (choice.includes("Leave")) setTimeout(() => setMode('EXPLORE'), 1000);
    };

    // --- VISUAL COMPONENTS ---
    const TimelineVisualizer = ({ stability }: { stability: number }) => {
        return (
            <div className="relative h-12 bg-black/50 border-b border-white/10 flex items-center px-4 overflow-hidden">
                {/* Background Grid */}
                <div className="absolute inset-0 opacity-20"
                    style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(255,255,255,0.1) 50%)', backgroundSize: '20px 100%' }}>
                </div>

                {/* Stability Text */}
                <div className="absolute top-1 left-4 text-[10px] font-mono text-cyan-500/70 uppercase">
                    {t('games.chronoquest.temporal_integrity')}</div>
                <div className="absolute top-1 right-4 text-[10px] font-mono font-bold text-white">
                    {stability}%
                </div>

                {/* The Timeline Waveform */}
                <div className="flex-1 flex items-end h-6 space-x-[2px] mt-3">
                    {Array.from({ length: 40 }).map((_, i) => {
                        const isStable = stability > 60;
                        const isCritical = stability < 30;
                        // Procedural height based on stability noise
                        const baseHeight = 30 + Math.sin(i * 0.5) * 20;
                        const jitter = isCritical ? Math.random() * 40 : 0;
                        const height = Math.min(100, Math.max(10, (stability / 100) * baseHeight + jitter));

                        let color = 'bg-cyan-500/50';
                        if (stability < 70) color = 'bg-yellow-500/50';
                        if (stability < 30) color = 'bg-red-500/80';

                        return (
                            <div
                                key={i}
                                className={`w-1 rounded-t-sm transition-all duration-300 ${color}`}
                                style={{
                                    height: `${height}%`,
                                    opacity: i / 40 > stability / 100 ? 0.2 : 1
                                }}
                            />
                        );
                    })}
                </div>

                {/* Glitch Overlay for Low Stability */}
                {stability < 40 && (
                    <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none mix-blend-overlay"></div>
                )}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-void overflow-hidden relative font-mono text-white select-none">
            <ModalComponent />
            {/* --- EXPLORE MODE --- */}
            {mode === 'EXPLORE' && (
                <div className="flex-1 relative flex items-center justify-center bg-gray-950 perspective-[1000px]">
                    {/* HUD */}
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md p-3 rounded-lg border border-white/10 z-10 flex space-x-6 shadow-xl">
                        <div className="text-xs text-green-400 font-bold flex items-center tracking-wider"><Heart size={14} className="mr-2" /> {player.hp}/{player.maxHp}</div>
                        <div className="text-xs text-electric font-bold flex items-center tracking-wider"><Zap size={14} className="mr-2" /> {player.tokens}</div>
                        <div className="text-xs text-amber-400 font-bold tracking-wider">{t('chrono.lvl')} {player.level}</div>
                    </div>

                    <div className="absolute top-4 right-4 z-10">
                        <Button size="sm" variant="secondary" onClick={() => setMode('INVENTORY')} className="bg-black/60 border-white/20">
                            <Backpack size={16} />
                        </Button>
                    </div>

                    {/* Isometric Grid */}
                    <div className="relative w-[300px] h-[300px] transform-style-3d transition-transform duration-500"
                        style={{ transform: 'rotateX(60deg) rotateZ(-45deg) scale(1.2)' }}>
                        {/* Floor Shadow */}
                        <div className="absolute inset-0 bg-black/50 blur-xl transform translate-z-[-20px]"></div>

                        {WORLD_MAP.map((row, y) => row.map((cell, x) => {
                            const isPlayer = player.x === x && player.y === y;
                            let baseColor = 'bg-slate-800';
                            let height = 'h-2';
                            let transform = 'translateZ(0px)';

                            if (cell === 1) { // Wall
                                baseColor = 'bg-slate-700';
                                height = 'h-12';
                                transform = 'translateZ(0px)';
                            }
                            if (cell === 4 && chestsOpened.includes(`${x},${y}`)) baseColor = 'bg-slate-900 border-dashed border-slate-700';

                            return (
                                <div
                                    key={`${x}-${y}`}
                                    className={`absolute w-[42px] h-[42px] border border-white/5 transition-all duration-300 ${baseColor} shadow-inner`}
                                    style={{ left: x * 44, top: y * 44 }}
                                >
                                    {/* 3D Sides pseudo-effect (simple CSS) */}
                                    {cell === 1 && (
                                        <div className="absolute -top-4 left-0 right-0 h-4 bg-slate-600 origin-bottom transform -skew-x-12"></div>
                                    )}

                                    {/* Player */}
                                    {isPlayer && (
                                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-30 transition-all duration-300">
                                            <div className="w-6 h-12 bg-gradient-to-t from-cyan-600 to-cyan-300 shadow-[0_0_20px_#22d3ee] rounded-t-sm flex items-start justify-center pt-1 border border-cyan-200">
                                                <div className="w-4 h-1 bg-cyan-900/50 rounded-full"></div>
                                            </div>
                                            {/* Shadow */}
                                            <div className="absolute -bottom-2 w-8 h-3 bg-black/60 blur-sm rounded-full left-1/2 -translate-x-1/2"></div>
                                        </div>
                                    )}

                                    {cell === 2 && (
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-20 animate-float">
                                            <User size={24} className="text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                                        </div>
                                    )}
                                    {cell === 3 && (
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-20">
                                            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
                                                <Sword size={20} className="text-red-500" />
                                            </div>
                                        </div>
                                    )}
                                    {cell === 4 && !chestsOpened.includes(`${x},${y}`) && (
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10 animate-bounce">
                                            <div className="w-6 h-5 bg-yellow-600 border border-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.6)]"></div>
                                        </div>
                                    )}
                                </div>
                            );
                        }))}
                    </div>

                    {/* Controls */}
                    <div className="absolute bottom-8 right-8 grid grid-cols-3 gap-2 bg-black/40 p-4 rounded-2xl backdrop-blur-sm border border-white/5">
                        <div />
                        <Button size="sm" variant="secondary" onClick={() => move(0, -1)} className="bg-slate-800 border-slate-600"><ArrowUp size={24} /></Button>
                        <div />
                        <Button size="sm" variant="secondary" onClick={() => move(-1, 0)} className="bg-slate-800 border-slate-600"><ArrowLeft size={24} /></Button>
                        <div />
                        <Button size="sm" variant="secondary" onClick={() => move(1, 0)} className="bg-slate-800 border-slate-600"><ArrowRight size={24} /></Button>
                        <div />
                        <Button size="sm" variant="secondary" onClick={() => move(0, 1)} className="bg-slate-800 border-slate-600"><ArrowDown size={24} /></Button>
                        <div />
                    </div>
                </div>
            )}

            {/* --- INVENTORY MODE --- */}
            {mode === 'INVENTORY' && (
                <div className="absolute inset-0 bg-black/90 z-30 p-6 animate-in fade-in flex items-center justify-center">
                    <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
                            <h2 className="text-xl font-bold text-white flex items-center"><Backpack size={20} className="mr-2 text-cyan-400" /> {t('games.chronoquest.inventory')}</h2>
                            <Button variant="ghost" onClick={() => setMode('EXPLORE')}><X size={20} /></Button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto">
                            {inventory.map(item => (
                                <div key={item.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between hover:border-cyan-500/50 transition-colors">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 bg-black/30 rounded-lg flex items-center justify-center text-2xl mr-4 border border-white/5">{item.icon}</div>
                                        <div>
                                            <div className="text-sm font-bold text-white">{item.name}</div>
                                            <div className="text-[10px] text-cyan-400 font-mono tracking-wide">{item.type} +{item.value}</div>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="primary" onClick={() => useItem(item)}>{t('games.chronoquest.use')}</Button>
                                </div>
                            ))}
                            {inventory.length === 0 && <div className="text-gray-500 text-center py-10 italic">{t('games.chronoquest.your_backpack_is_emp')}</div>}
                        </div>
                    </div>
                </div>
            )}

            {/* --- DIALOGUE MODE --- */}
            {mode === 'DIALOGUE' && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-20 flex flex-col justify-end p-0">
                    <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col p-6 animate-in slide-in-from-bottom-10 fade-in duration-500">
                        <div className="flex-1 overflow-y-auto space-y-6 mb-8 scrollbar-hide">
                            {dialogueHistory.map((msg, i) => (
                                <div key={i} className={`flex ${msg.speaker === 'You' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-5 rounded-2xl shadow-lg border ${msg.speaker === 'You'
                                            ? 'bg-cyan-900/40 border-cyan-500/30 text-cyan-100 rounded-br-none'
                                            : 'bg-slate-800 border-slate-600 text-slate-200 rounded-bl-none'
                                        }`}>
                                        <div className="text-xs font-bold mb-2 opacity-50 uppercase tracking-widest">{msg.speaker}</div>
                                        <div className="text-sm md:text-base leading-relaxed">{msg.text}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            <Button variant="secondary" className="justify-start h-14 text-left px-6 border-slate-600" onClick={() => handleDialogueChoice("Who are you?")}>
                                <span className="text-cyan-400 mr-2">1.</span> {t('games.chronoquest.who_are_you')}</Button>
                            <Button variant="secondary" className="justify-start h-14 text-left px-6 border-slate-600" onClick={() => handleDialogueChoice("I need to fix the timeline.")}>
                                <span className="text-cyan-400 mr-2">2.</span> {t('games.chronoquest.i_need_to_fix_the_ti')}</Button>
                            <Button variant="ghost" className="justify-start h-12 text-gray-400 hover:text-white" onClick={() => handleDialogueChoice("Leave")}>
                                {t('games.chronoquest.end_conversation')}</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- BATTLE MODE --- */}
            {mode === 'BATTLE' && (
                <div className="absolute inset-0 bg-gray-950 z-30 flex flex-col overflow-hidden animate-in fade-in duration-700">
                    <TimelineVisualizer stability={timelineStability} />

                    {/* Battle Scene */}
                    <div className="flex-1 relative flex flex-col items-center justify-center p-6">

                        {/* Background Effect */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-900/10 rounded-full blur-[100px] animate-pulse"></div>
                        </div>

                        {/* Enemy Card */}
                        <div className="mb-8 text-center relative w-full max-w-xs mx-auto z-10 perspective-[500px]">
                            <div className={`w-40 h-40 mx-auto bg-black/40 backdrop-blur border-4 ${isEnemyStunned ? 'border-yellow-400 animate-pulse' : 'border-red-500/50'} rounded-full flex items-center justify-center mb-4 relative transition-all duration-500 transform ${enemyIntent === 'CHARGE' ? 'scale-110' : ''}`}>

                                {timelineStability < 40 && <div className="absolute inset-0 bg-red-500/20 animate-ping rounded-full duration-1000"></div>}

                                <Zap size={80} className={`${isEnemyStunned ? 'text-yellow-400 rotate-180' : enemyIntent === 'CHARGE' ? 'text-orange-500 scale-110 drop-shadow-[0_0_20px_orange]' : 'text-red-500 drop-shadow-[0_0_15px_red]'} transition-all duration-300`} />

                                <div className="absolute -bottom-3 bg-black/80 px-3 py-1 rounded-full border border-red-500/30">
                                    <div className={`text-[10px] font-mono font-bold uppercase ${enemyIntent === 'CHARGE' ? 'text-orange-400' : 'text-red-400'}`}>
                                        {t('games.chronoquest.intent')}{enemyIntent}
                                    </div>
                                </div>
                            </div>

                            <div className="text-white font-black text-2xl tracking-widest shadow-black drop-shadow-lg mb-2">{t('chrono.enemy')}</div>

                            <div className="w-full h-2 bg-gray-800 rounded-full mx-auto overflow-hidden border border-gray-700">
                                <div className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500" style={{ width: `${(enemyHP / enemyMaxHP) * 100}%` }}></div>
                            </div>
                            <div className="text-xs text-red-400/70 mt-1 font-mono">{enemyHP}/{enemyMaxHP} {t('games.chronoquest.hp')}</div>
                        </div>

                        {/* Player Stats */}
                        <div className="flex items-center space-x-8 bg-black/60 p-4 rounded-2xl border border-cyan-500/20 backdrop-blur-md shadow-2xl z-10">
                            <div className="text-center w-20">
                                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">{t('chrono.hp')}</div>
                                <div className={`text-xl font-bold flex items-center justify-center font-mono ${player.hp < 30 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
                                    <Heart size={16} className="mr-1.5" /> {player.hp}
                                </div>
                            </div>
                            <div className="h-8 w-px bg-white/10"></div>
                            <div className="text-center w-20">
                                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">{t('games.chronoquest.tokens')}</div>
                                <div className="text-xl font-bold text-electric flex items-center justify-center font-mono">
                                    <Zap size={16} className="mr-1.5" /> {player.tokens}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Deck */}
                    <div className="bg-gray-900 border-t border-white/10 flex flex-col z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                        {/* Battle LogTicker */}
                        <div className="bg-black/50 py-1 px-4 overflow-hidden border-b border-white/5">
                            <div className="text-[10px] font-mono text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis opacity-70">
                                {battleLog.length > 0 ? `> ${battleLog[battleLog.length - 1]}` : '> SYSTEM READY'}
                            </div>
                        </div>

                        <div className="p-4 grid grid-cols-2 gap-3 safe-area-pb">
                            {MOVES.map(m => {
                                const canAfford = player.tokens >= m.cost;
                                return (
                                    <button
                                        key={m.id}
                                        onClick={() => executeMove(m)}
                                        disabled={!playerTurn || !canAfford}
                                        className={`p-3 rounded-xl border text-left transition-all active:scale-95 flex flex-col relative overflow-hidden group ${playerTurn && canAfford
                                            ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-600 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                                            : 'bg-black/40 border-gray-800 opacity-40 cursor-not-allowed'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-1 relative z-10">
                                            <div className="font-bold text-white text-sm flex items-center group-hover:text-cyan-300 transition-colors">
                                                {m.icon} <span className="ml-2">{m.name}</span>
                                            </div>
                                            <div className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${canAfford ? 'bg-cyan-900/30 text-cyan-400 border border-cyan-500/30' : 'text-red-500 bg-red-900/20'}`}>
                                                {m.cost} T
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-gray-400 relative z-10 leading-tight mt-1 group-hover:text-gray-300">{m.description}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
