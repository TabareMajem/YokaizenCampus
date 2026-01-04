
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

    return (
        <div className="h-full flex flex-col bg-void overflow-hidden relative font-mono">
            <ModalComponent />
            {/* --- EXPLORE MODE --- */}
            {mode === 'EXPLORE' && (
                <div className="flex-1 relative flex items-center justify-center bg-gray-900">
                    {/* HUD */}
                    <div className="absolute top-4 left-4 bg-black/50 p-2 rounded border border-white/10 z-10 flex space-x-4">
                        <div className="text-xs text-green-400 font-bold flex items-center"><Heart size={12} className="mr-1" /> {player.hp}/{player.maxHp}</div>
                        <div className="text-xs text-electric font-bold flex items-center"><Zap size={12} className="mr-1" /> {player.tokens}</div>
                        <div className="text-xs text-amber-400 font-bold">{t('chrono.lvl')} {player.level}</div>
                    </div>

                    <div className="absolute top-4 right-4 z-10">
                        <Button size="sm" variant="secondary" onClick={() => setMode('INVENTORY')}>
                            <Backpack size={16} />
                        </Button>
                    </div>

                    {/* Isometric Grid */}
                    <div className="relative w-[300px] h-[300px] transform rotate-x-60 rotate-z-45" style={{ transform: 'rotateX(60deg) rotateZ(-45deg)' }}>
                        {WORLD_MAP.map((row, y) => row.map((cell, x) => {
                            const isPlayer = player.x === x && player.y === y;
                            let color = 'bg-gray-800';
                            if (cell === 1) color = 'bg-gray-700';
                            if (cell === 4 && chestsOpened.includes(`${x},${y}`)) color = 'bg-gray-900';

                            return (
                                <div
                                    key={`${x}-${y}`}
                                    className={`absolute w-[40px] h-[40px] border border-white/5 ${color} transition-all duration-200`}
                                    style={{ left: x * 42, top: y * 42 }}
                                >
                                    {isPlayer && <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20"><div className="w-5 h-10 bg-gradient-to-t from-cyan-500 to-cyan-300 shadow-[0_0_20px_#00FFFF,0_0_40px_#00FFFF] rounded-t-sm animate-pulse"></div><div className="absolute -bottom-1 w-8 h-2 bg-cyan-500/50 blur-sm rounded-full left-1/2 -translate-x-1/2"></div></div>}
                                    {cell === 2 && <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10 animate-bounce"><User size={20} className="text-amber-500" /></div>}
                                    {cell === 3 && <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10"><Sword size={20} className="text-red-500" /></div>}
                                    {cell === 4 && !chestsOpened.includes(`${x},${y}`) && <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10"><div className="w-6 h-4 bg-yellow-600 border border-yellow-400 animate-pulse"></div></div>}
                                </div>
                            );
                        }))}
                    </div>

                    {/* Controls */}
                    <div className="absolute bottom-8 right-8 grid grid-cols-3 gap-2">
                        <div />
                        <Button size="sm" variant="secondary" onClick={() => move(0, -1)}><ArrowUp size={20} /></Button>
                        <div />
                        <Button size="sm" variant="secondary" onClick={() => move(-1, 0)}><ArrowLeft size={20} /></Button>
                        <div />
                        <Button size="sm" variant="secondary" onClick={() => move(1, 0)}><ArrowRight size={20} /></Button>
                        <div />
                        <Button size="sm" variant="secondary" onClick={() => move(0, 1)}><ArrowDown size={20} /></Button>
                        <div />
                    </div>
                </div>
            )}

            {/* --- INVENTORY MODE --- */}
            {mode === 'INVENTORY' && (
                <div className="absolute inset-0 bg-black/90 z-30 p-6 animate-in fade-in">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-white">Inventory</h2>
                        <Button variant="ghost" onClick={() => setMode('EXPLORE')}><X size={20} /></Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {inventory.map(item => (
                            <div key={item.id} className="bg-gray-800 p-3 rounded-lg border border-gray-700 flex items-center justify-between">
                                <div className="flex items-center">
                                    <span className="text-2xl mr-2">{item.icon}</span>
                                    <div>
                                        <div className="text-sm font-bold text-white">{item.name}</div>
                                        <div className="text-[10px] text-gray-400">{item.type} +{item.value}</div>
                                    </div>
                                </div>
                                <Button size="sm" variant="primary" onClick={() => useItem(item)}>Use</Button>
                            </div>
                        ))}
                        {inventory.length === 0 && <div className="text-gray-500 col-span-2 text-center py-10">Bag Empty</div>}
                    </div>
                </div>
            )}

            {/* --- DIALOGUE MODE --- */}
            {mode === 'DIALOGUE' && (
                <div className="absolute inset-0 bg-black/90 z-20 flex flex-col p-6">
                    <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                        {dialogueHistory.map((msg, i) => (
                            <div key={i} className={`p-4 rounded-xl ${msg.speaker === 'You' ? 'bg-electric/20 ml-8 border border-electric/50' : 'bg-gray-800 mr-8 border border-gray-700'}`}>
                                <div className="text-xs font-bold mb-1 opacity-70">{msg.speaker}</div>
                                <div className="text-sm">{msg.text}</div>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        <Button variant="secondary" onClick={() => handleDialogueChoice("Who are you?")}>"Who are you?"</Button>
                        <Button variant="secondary" onClick={() => handleDialogueChoice("I need to fix the timeline.")}>"I need to fix the timeline."</Button>
                        <Button variant="ghost" onClick={() => handleDialogueChoice("Leave")}>[Leave]</Button>
                    </div>
                </div>
            )}

            {/* --- BATTLE MODE --- */}
            {mode === 'BATTLE' && (
                <div className="absolute inset-0 bg-gray-950 z-30 flex flex-col overflow-hidden">
                    {/* Timeline Stability Header */}
                    <div className="bg-black border-b border-white/10 p-3">
                        <div className="flex justify-between items-center text-[10px] uppercase font-bold mb-1">
                            <span className={`${timelineStability < 40 ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>{t('chrono.timeline_unstable')}</span>
                            <span className="text-white font-mono">{timelineStability}%</span>
                            <span className={`${timelineStability > 70 ? 'text-blue-400' : 'text-gray-500'}`}>{t('chrono.timeline_stable')}</span>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden relative">
                            <div
                                className={`h-full transition-all duration-500 ${timelineStability < 30 ? 'bg-red-600' : timelineStability > 70 ? 'bg-blue-500' : 'bg-yellow-500'}`}
                                style={{ width: `${timelineStability}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Battle Scene */}
                    <div className="flex-1 relative flex flex-col items-center justify-center">

                        {/* Enemy Card */}
                        <div className="mb-8 text-center relative w-full max-w-xs mx-auto">
                            <div className={`w-36 h-36 mx-auto bg-red-900/20 border-4 ${isEnemyStunned ? 'border-yellow-400 animate-pulse' : 'border-red-500/50'} rounded-full flex items-center justify-center mb-3 relative transition-all`}>
                                {timelineStability < 40 && <div className="absolute inset-0 bg-red-500/30 animate-ping rounded-full"></div>}
                                {enemyIntent === 'CHARGE' && <div className="absolute inset-0 bg-orange-500/20 animate-pulse rounded-full"></div>}
                                <Zap size={72} className={`${isEnemyStunned ? 'text-yellow-400 rotate-180' : enemyIntent === 'CHARGE' ? 'text-orange-500 scale-110' : 'text-red-500'} transition-all drop-shadow-[0_0_20px_currentColor]`} />
                            </div>
                            <div className="text-red-500 font-bold text-xl tracking-widest mb-1">{t('chrono.enemy')}</div>
                            {/* Enemy Intent Display */}
                            <div className={`text-xs font-mono px-2 py-1 rounded mb-2 inline-block ${enemyIntent === 'CHARGE' ? 'bg-orange-500/30 text-orange-400 animate-pulse' : enemyIntent === 'ATTACK' ? 'bg-red-500/30 text-red-400' : 'bg-purple-500/30 text-purple-400'}`}>
                                INTENT: {enemyIntent}
                            </div>
                            <div className="w-48 h-3 bg-gray-800 rounded-full mx-auto overflow-hidden border border-gray-700">
                                <div className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-500" style={{ width: `${(enemyHP / enemyMaxHP) * 100}%` }}></div>
                            </div>
                            <div className="text-xs text-red-400 mt-1 font-mono">{enemyHP}/{enemyMaxHP} {t('chrono.hp')}</div>
                        </div>

                        {/* Player Card */}
                        <div className="flex items-center space-x-6 bg-black/70 p-4 rounded-2xl border border-cyan-500/30 backdrop-blur shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                            <div className="text-center">
                                <div className="text-[10px] text-gray-400 uppercase mb-1">{t('chrono.hp')}</div>
                                <div className={`text-2xl font-bold flex items-center justify-center font-mono ${player.hp < 30 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
                                    <Heart size={18} className={`mr-2 ${player.hp < 30 ? 'fill-red-400' : 'fill-green-400'}`} /> {player.hp}
                                </div>
                            </div>
                            <div className="h-8 w-px bg-gray-700"></div>
                            <div className="text-center">
                                <div className="text-[10px] text-gray-400 uppercase mb-1">Tokens</div>
                                <div className="text-2xl font-bold text-electric flex items-center justify-center font-mono">
                                    <Zap size={18} className="mr-2 fill-electric" /> {player.tokens}
                                </div>
                            </div>
                            <div className="h-8 w-px bg-gray-700"></div>
                            <div className="text-center">
                                <div className="text-[10px] text-gray-400 uppercase mb-1">Turn</div>
                                <div className={`text-lg font-bold ${playerTurn ? 'text-green-400' : 'text-gray-500'}`}>
                                    {playerTurn ? 'YOUR MOVE' : 'ENEMY...'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Battle Log */}
                    <div className="h-20 bg-black/80 border-t border-white/10 p-2 overflow-y-auto text-xs font-mono text-gray-300">
                        {battleLog.slice(-4).map((l, i) => (
                            <div key={i} className="mb-1 border-l-2 border-gray-700 pl-2">{l}</div>
                        ))}
                    </div>

                    {/* Action Grid */}
                    <div className="p-4 bg-gray-900 border-t border-white/10 grid grid-cols-2 gap-3 safe-area-pb">
                        {MOVES.map(m => {
                            const canAfford = player.tokens >= m.cost;
                            return (
                                <button
                                    key={m.id}
                                    onClick={() => executeMove(m)}
                                    disabled={!playerTurn || !canAfford}
                                    className={`p-3 rounded-xl border text-left transition-all active:scale-95 flex flex-col relative overflow-hidden ${playerTurn && canAfford
                                        ? 'bg-gray-800 border-gray-600 hover:border-electric hover:bg-gray-750'
                                        : 'bg-black/50 border-gray-800 opacity-50 cursor-not-allowed'
                                        }`}
                                >
                                    <div className="flex justify-between items-center mb-1 relative z-10">
                                        <div className="font-bold text-white text-sm flex items-center">
                                            {m.icon} <span className="ml-2">{m.name}</span>
                                        </div>
                                        <div className={`text-xs font-mono ${canAfford ? 'text-electric' : 'text-red-500'}`}>{m.cost}</div>
                                    </div>
                                    <div className="text-[10px] text-gray-400 relative z-10 leading-tight">{m.description}</div>

                                    {/* Cool Down Overlay if not turn */}
                                    {!playerTurn && <div className="absolute inset-0 bg-black/20 z-20"></div>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
