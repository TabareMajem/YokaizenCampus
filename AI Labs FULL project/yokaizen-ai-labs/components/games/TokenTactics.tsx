import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Code, Music, Bug, Skull, Shield, Zap, Target, Play, Database, RefreshCcw } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Difficulty, UserStats } from '../../types';
import { Button } from '../ui/Button';

// --- Types & Constants ---
interface TokenTacticsProps {
    onComplete: (score: number) => void;
    difficulty: Difficulty;
    user?: UserStats;
}

type Faction = 'player' | 'enemy';

interface Unit {
    id: string;
    faction: Faction;
    type: 'vision' | 'code' | 'audio' | 'malware' | 'rogue';
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    attack: number;
    range: number;
    move: number;
    hasMoved: boolean;
    hasAttacked: boolean;
}

const GRID_SIZE = 6;

const INITIAL_UNITS: Unit[] = [
    { id: 'p1', faction: 'player', type: 'code', x: 1, y: 1, hp: 100, maxHp: 100, attack: 40, range: 1, move: 3, hasMoved: false, hasAttacked: false },
    { id: 'p2', faction: 'player', type: 'vision', x: 0, y: 2, hp: 80, maxHp: 80, attack: 25, range: 3, move: 2, hasMoved: false, hasAttacked: false },
    { id: 'p3', faction: 'player', type: 'audio', x: 1, y: 3, hp: 90, maxHp: 90, attack: 30, range: 2, move: 2, hasMoved: false, hasAttacked: false },

    { id: 'e1', faction: 'enemy', type: 'malware', x: 4, y: 1, hp: 60, maxHp: 60, attack: 20, range: 1, move: 2, hasMoved: false, hasAttacked: false },
    { id: 'e2', faction: 'enemy', type: 'malware', x: 5, y: 2, hp: 60, maxHp: 60, attack: 20, range: 1, move: 2, hasMoved: false, hasAttacked: false },
    { id: 'e3', faction: 'enemy', type: 'rogue', x: 4, y: 4, hp: 120, maxHp: 120, attack: 35, range: 2, move: 1, hasMoved: false, hasAttacked: false },
];

export const TokenTactics: React.FC<TokenTacticsProps> = ({ onComplete }) => {
    const [gameState, setGameState] = useState<'start' | 'playing' | 'victory' | 'gameover'>('start');
    const [units, setUnits] = useState<Unit[]>(INITIAL_UNITS);
    const [turn, setTurn] = useState<Faction>('player');

    // Selection state
    const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
    const [targetMode, setTargetMode] = useState(false);

    // Combat effects
    const [damageText, setDamageText] = useState<{ id: string, text: string, x: number, y: number } | null>(null);
    const [logs, setLogs] = useState<string[]>(['Deploy agents to secure the data grid.']);

    // Helpers
    const getUnitAt = (x: number, y: number) => units.find(u => u.x === x && u.y === y);
    const getDistance = (x1: number, y1: number, x2: number, y2: number) => Math.abs(x1 - x2) + Math.abs(y1 - y2);
    const log = (msg: string) => setLogs(p => [...p.slice(-4), msg]);

    // --- Core Logic ---
    const handleCellClick = (x: number, y: number) => {
        if (gameState !== 'playing' || turn !== 'player') return;

        const clickedUnit = getUnitAt(x, y);
        const selectedUnit = selectedUnitId ? units.find(u => u.id === selectedUnitId) : null;

        // 1. Select a player unit
        if (clickedUnit && clickedUnit.faction === 'player') {
            setSelectedUnitId(clickedUnit.id);
            setTargetMode(false);
            audio.playClick();
            return;
        }

        // Inside selected unit context
        if (selectedUnit && selectedUnit.faction === 'player') {

            // 2. Attack enemy
            if (clickedUnit && clickedUnit.faction === 'enemy' && targetMode) {
                if (selectedUnit.hasAttacked) { log("Unit already attacked."); return; }
                const dist = getDistance(selectedUnit.x, selectedUnit.y, clickedUnit.x, clickedUnit.y);
                if (dist > selectedUnit.range) { log("Target out of range."); return; }

                executeAttack(selectedUnit, clickedUnit);
                return;
            }

            // 3. Move empty cell
            if (!clickedUnit && !selectedUnit.hasMoved) {
                const dist = getDistance(selectedUnit.x, selectedUnit.y, x, y);
                if (dist <= selectedUnit.move) {
                    moveUnit(selectedUnit.id, x, y);
                    return;
                } else {
                    log("Cell out of move range.");
                }
            }
        }

        setSelectedUnitId(null);
        setTargetMode(false);
    };

    const moveUnit = (id: string, tx: number, ty: number) => {
        setUnits(prev => prev.map(u => u.id === id ? { ...u, x: tx, y: ty, hasMoved: true } : u));
        audio.playClick();
        log("Agent repositioned.");
    };

    const executeAttack = (attacker: Unit, defender: Unit) => {
        audio.playNotification();
        const baseDmg = attacker.attack;
        const damage = Math.max(1, baseDmg + Math.floor(Math.random() * 10 - 5));

        setDamageText({ id: Math.random().toString(), text: `-${damage}`, x: defender.x, y: defender.y });
        setTimeout(() => setDamageText(null), 1000);

        setUnits(prev => {
            const next = prev.map(u => {
                if (u.id === attacker.id) return { ...u, hasAttacked: true };
                if (u.id === defender.id) return { ...u, hp: Math.max(0, u.hp - damage) };
                return u;
            }).filter(u => u.hp > 0);

            checkWinState(next);
            return next;
        });

        log(`${attacker.type} dealt ${damage} DMG to ${defender.type}.`);
        setSelectedUnitId(null);
        setTargetMode(false);
    };

    const checkWinState = (currentUnits: Unit[]) => {
        const players = currentUnits.filter(u => u.faction === 'player').length;
        const enemies = currentUnits.filter(u => u.faction === 'enemy').length;

        if (players === 0) setTimeout(() => setGameState('gameover'), 1500);
        else if (enemies === 0) setTimeout(() => setGameState('victory'), 1500);
    };

    const endTurn = () => {
        if (turn === 'player') {
            setTurn('enemy');
            setSelectedUnitId(null);
            log("Enemy Turn...");

            // Reset enemy ap
            setUnits(prev => prev.map(u => u.faction === 'enemy' ? { ...u, hasMoved: false, hasAttacked: false } : u));
        }
    };

    // --- Enemy AI Phase ---
    useEffect(() => {
        if (turn !== 'enemy' || gameState !== 'playing') return;

        const runEnemyAI = async () => {
            let activeEnemies = units.filter(u => u.faction === 'enemy');

            for (const enemy of activeEnemies) {
                // Refresh state to get latest positions if multiple enemies act
                await new Promise(r => setTimeout(r, 600)); // Delay between unit actions

                // Hacky way to get freshest units in an effect: use a ref or functional update
                let currentUnits: Unit[] = [];
                setUnits(u => { currentUnits = [...u]; return u; });
                const me = currentUnits.find(u => u.id === enemy.id);
                if (!me || me.hp <= 0) continue; // Died or missing

                const players = currentUnits.filter(u => u.faction === 'player');
                if (players.length === 0) return;

                // Find closest player
                let closestP: Unit = players[0];
                let minD = Infinity;
                for (const p of players) {
                    const d = getDistance(me.x, me.y, p.x, p.y);
                    if (d < minD) { minD = d; closestP = p; }
                }

                if (minD <= me.range) {
                    // Attack
                    log(`Enemy ${me.type} strikes!`);
                    audio.playError();
                    const damage = Math.max(1, me.attack + Math.floor(Math.random() * 5));

                    setDamageText({ id: Math.random().toString(), text: `-${damage}`, x: closestP.x, y: closestP.y });
                    setTimeout(() => setDamageText(null), 1000);

                    const nextState = currentUnits.map(u => {
                        if (u.id === closestP.id) return { ...u, hp: Math.max(0, u.hp - damage) };
                        return u;
                    }).filter(u => u.hp > 0);

                    setUnits(nextState);
                    checkWinState(nextState);
                } else {
                    // Move towards closest
                    const dx = Math.sign(closestP.x - me.x);
                    const dy = Math.sign(closestP.y - me.y);

                    // Prefer moving in the delta that is largest, fallback
                    let tx = me.x;
                    let ty = me.y;

                    if (Math.abs(closestP.x - me.x) > Math.abs(closestP.y - me.y)) {
                        tx += dx;
                        if (currentUnits.find(u => u.x === tx && u.y === ty)) { tx -= dx; ty += dy; }
                    } else {
                        ty += dy;
                        if (currentUnits.find(u => u.x === tx && u.y === ty)) { ty -= dy; tx += dx; }
                    }

                    // Check bounds & occupancy
                    if (tx >= 0 && tx < GRID_SIZE && ty >= 0 && ty < GRID_SIZE && !currentUnits.find(u => u.x === tx && u.y === ty)) {
                        setUnits(prev => prev.map(u => u.id === me.id ? { ...u, x: tx, y: ty } : u));
                    }
                }
            }

            // End enemy turn
            await new Promise(r => setTimeout(r, 600));
            setUnits(prev => prev.map(u => u.faction === 'player' ? { ...u, hasMoved: false, hasAttacked: false } : u));
            setTurn('player');
            log('Player Phase started.');
        };

        runEnemyAI();
    }, [turn, gameState]);

    const startGame = () => {
        setUnits([...INITIAL_UNITS.map(u => ({ ...u }))]);
        setGameState('playing');
        setTurn('player');
        setSelectedUnitId(null);
        setLogs(['Battle sequence initiated. Secure the nodes.']);
        audio.playClick();
    };

    // --- Rendering logic ---
    const selectedUnit = selectedUnitId ? units.find(u => u.id === selectedUnitId) : null;

    // Check if cell is valid move or attack target
    const isMoveTarget = (x: number, y: number) => {
        if (!selectedUnit || targetMode || selectedUnit.hasMoved) return false;
        return getDistance(selectedUnit.x, selectedUnit.y, x, y) <= selectedUnit.move && !getUnitAt(x, y);
    }

    const isAttackTarget = (x: number, y: number) => {
        if (!selectedUnit || !targetMode || selectedUnit.hasAttacked) return false;
        return getDistance(selectedUnit.x, selectedUnit.y, x, y) <= selectedUnit.range && getUnitAt(x, y)?.faction === 'enemy';
    }

    return (
        <div className="flex-1 w-full h-full flex flex-col items-center justify-center bg-gray-950 relative font-mono overflow-hidden">

            {/* Environment Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-gray-950 to-black"></div>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(90deg, #4f46e5 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
            </div>

            {/* --- TOP HUD --- */}
            {gameState !== 'start' && (
                <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-50">
                    {/* Status */}
                    <div className="bg-black/60 backdrop-blur-md p-4 rounded-xl border-l-4 border-electric shadow-[0_0_15px_rgba(196,95,255,0.3)]">
                        <div className="text-xl font-black uppercase text-white flex items-center gap-2">
                            {turn === 'player' ? <><Target className="text-electric animate-spin-slow w-5 h-5" /> Player Phase</> : <><Skull className="text-red-500 w-5 h-5 animate-pulse" /> Enemy Phase</>}
                        </div>
                        <div className="text-gray-400 text-sm mt-1 flex gap-4">
                            <span>Units: {units.filter(u => u.faction === 'player').length}</span>
                            <span>Enemies: {units.filter(u => u.faction === 'enemy').length}</span>
                        </div>
                    </div>

                    <Button variant="ghost" className="bg-red-900/80 hover:bg-red-800 text-white border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.5)] font-bold px-6 py-2" onClick={endTurn} disabled={turn !== 'player'}>
                        End Turn <RefreshCcw className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            )}

            {/* --- ISOMETRIC GRID --- */}
            <div className="relative w-[500px] h-[500px] flex items-center justify-center z-10 perspective-[1000px]">
                <div
                    className="relative w-full h-full transition-all duration-1000 grid"
                    style={{
                        transform: 'rotateX(55deg) rotateZ(45deg)',
                        transformStyle: 'preserve-3d',
                        gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                        gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
                        gap: '4px'
                    }}
                >
                    {/* Floor Tiles */}
                    {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                        const x = i % GRID_SIZE;
                        const y = Math.floor(i / GRID_SIZE);

                        const isMove = isMoveTarget(x, y);
                        const isAttack = isAttackTarget(x, y);

                        return (
                            <div
                                key={`cell-${x}-${y}`}
                                className={`w-full h-full border  
                                    ${isMove ? 'bg-cyan-500/40 border-cyan-400 cursor-pointer shadow-[inset_0_0_20px_rgba(34,211,238,0.5)]' :
                                        isAttack ? 'bg-red-500/40 border-red-500 cursor-crosshair shadow-[inset_0_0_20px_rgba(239,68,68,0.5)] animate-pulse' :
                                            'bg-gray-900/60 border-indigo-900/50 hover:bg-indigo-900/80'}`
                                }
                                onClick={() => handleCellClick(x, y)}
                            ></div>
                        );
                    })}

                    {/* Units Overlay */}
                    <AnimatePresence>
                        {units.map(u => {
                            const isSelected = selectedUnitId === u.id;
                            const isEnemy = u.faction === 'enemy';

                            // Map grid coords to absolute % to sit on cells
                            const left = `${(u.x / GRID_SIZE) * 100}%`;
                            const top = `${(u.y / GRID_SIZE) * 100}%`;
                            const width = `${100 / GRID_SIZE}%`;
                            const height = `${100 / GRID_SIZE}%`;

                            return (
                                <motion.div
                                    key={u.id}
                                    className="absolute flex items-center justify-center pointer-events-none"
                                    initial={false}
                                    animate={{ left, top, width, height }}
                                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                                    style={{ transformStyle: 'preserve-3d' }}
                                >
                                    {/* Standee (Rotated back up to face camera) */}
                                    <div
                                        className={`absolute flex flex-col items-center justify-end w-16 h-24 origin-bottom
                                            ${isSelected ? 'drop-shadow-[0_0_15px_cyan]' : ''}
                                        `}
                                        style={{ transform: 'rotateZ(-45deg) rotateX(-55deg) translateZ(10px)' }}
                                    >
                                        {/* HP Bar */}
                                        <div className="w-10 h-1 bg-gray-900 mb-1 border border-black/50 rounded-full overflow-hidden">
                                            <div className={`h-full ${isEnemy ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${(u.hp / u.maxHp) * 100}%` }}></div>
                                        </div>

                                        {/* Action Status Indicator */}
                                        {!isEnemy && u.hasMoved && u.hasAttacked && (
                                            <div className="absolute -top-4 text-[10px] text-gray-500 bg-black/80 px-1 rounded">WAIT</div>
                                        )}

                                        {/* Sprite Box */}
                                        <div className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center shadow-lg
                                            ${isEnemy ? 'bg-red-950 border-red-500 shadow-[0_0_15px_red]' : 'bg-cyan-950 border-cyan-400 shadow-[0_0_15px_cyan]'}
                                            ${isSelected ? 'border-white animate-bounce' : ''}
                                            ${u.hasMoved && u.hasAttacked && !isEnemy ? 'opacity-50 grayscale' : ''}
                                        `}>
                                            {u.type === 'code' && <Code className="text-cyan-300 w-6 h-6" />}
                                            {u.type === 'vision' && <Eye className="text-indigo-300 w-6 h-6" />}
                                            {u.type === 'audio' && <Music className="text-teal-300 w-6 h-6" />}
                                            {u.type === 'malware' && <Bug className="text-red-400 w-6 h-6" />}
                                            {u.type === 'rogue' && <Skull className="text-red-500 w-8 h-8" />}
                                        </div>
                                    </div>

                                    {/* Damage Numbers Overlay attached to unit */}
                                    <AnimatePresence>
                                        {damageText && damageText.x === u.x && damageText.y === u.y && (
                                            <motion.div
                                                key={damageText.id}
                                                initial={{ y: 0, opacity: 1, scale: 0.5 }}
                                                animate={{ y: -50, opacity: 0, scale: 1.5 }}
                                                exit={{ opacity: 0 }}
                                                className="absolute text-3xl font-black text-red-500 drop-shadow-[0_2px_2px_white] z-50 pointer-events-none"
                                                style={{ transform: 'rotateZ(-45deg) rotateX(-55deg) translateZ(40px)' }}
                                            >
                                                {damageText.text}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </div>

            {/* --- BOTTOM HUD (Unit Info & Actions & Logs) --- */}
            {gameState === 'playing' && (
                <div className="absolute bottom-6 w-full max-w-5xl px-4 flex gap-4 z-50 pointer-events-none">

                    {/* Selected Info */}
                    <AnimatePresence>
                        {selectedUnit && (
                            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="bg-black/80 backdrop-blur-xl border border-cyan-500/50 p-4 rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.2)] w-72 pointer-events-auto flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-xl font-bold text-white uppercase flex items-center gap-2">
                                            {selectedUnit.type === 'code' && <Code className="w-5 h-5 text-cyan-400" />}
                                            {selectedUnit.type === 'vision' && <Eye className="w-5 h-5 text-indigo-400" />}
                                            {selectedUnit.type === 'audio' && <Music className="w-5 h-5 text-teal-400" />}
                                            {selectedUnit.type} Agent
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                                        <div className="bg-gray-900 px-2 py-1 rounded text-red-400 font-bold border border-gray-800"><span className="text-gray-500">ATK</span> {selectedUnit.attack}</div>
                                        <div className="bg-gray-900 px-2 py-1 rounded text-green-400 font-bold border border-gray-800"><span className="text-gray-500">HP</span> {selectedUnit.hp}/{selectedUnit.maxHp}</div>
                                        <div className="bg-gray-900 px-2 py-1 rounded text-blue-400 font-bold border border-gray-800"><span className="text-gray-500">MOV</span> {selectedUnit.move}</div>
                                        <div className="bg-gray-900 px-2 py-1 rounded text-yellow-400 font-bold border border-gray-800"><span className="text-gray-500">RNG</span> {selectedUnit.range}</div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        className={`flex-1 border-2 font-bold ${!selectedUnit.hasMoved ? 'border-cyan-500 bg-cyan-900/50 text-cyan-300' : 'border-gray-700 text-gray-600'}`}
                                        disabled={selectedUnit.hasMoved}
                                        onClick={() => setTargetMode(false)}
                                    >
                                        MOVE
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className={`flex-1 flex items-center justify-center gap-2 border-2 font-bold ${!selectedUnit.hasAttacked ? (targetMode ? 'border-red-500 bg-red-600 text-white animate-pulse' : 'border-red-500 bg-red-900/50 text-red-300') : 'border-gray-700 text-gray-600'}`}
                                        disabled={selectedUnit.hasAttacked}
                                        onClick={() => setTargetMode(!targetMode)}
                                    >
                                        <Target className="w-4 h-4" /> ATTACK
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex-1"></div>

                    {/* Battle Log */}
                    <div className="bg-black/80 backdrop-blur-xl border border-gray-700 p-4 rounded-xl shadow-lg w-96 flex flex-col justify-end text-sm text-gray-300 font-mono">
                        {logs.map((l, i) => (
                            <div key={i} className={`mb-1 opacity-${i === logs.length - 1 ? '100 font-bold text-white' : (i === logs.length - 2 ? '70' : '40')}`}>
                                &gt; {l}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- SCREENS --- */}
            <AnimatePresence>
                {gameState === 'start' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-8">
                        <div className="bg-gray-900 border-2 border-electric p-10 rounded-2xl max-w-lg text-center shadow-[0_0_50px_rgba(196,95,255,0.4)]">
                            <Database className="w-20 h-20 mx-auto text-electric mb-6 drop-shadow-[0_0_15px_rgba(196,95,255,0.8)]" />
                            <h1 className="text-4xl font-black text-white uppercase tracking-widest mb-4">Token Tactics</h1>
                            <p className="text-gray-300 mb-8 leading-relaxed">Command specialized AI models on a tactical grid. Move first, then attack. Eliminate the rogue malware to secure the data center.</p>
                            <Button variant="primary" size="lg" className="w-full text-xl py-6 bg-electric hover:bg-purple-600 border-none shadow-[0_0_20px_rgba(196,95,255,0.6)] uppercase font-black tracking-widest" onClick={startGame}>
                                Deploy Squad <Play className="ml-2 w-6 h-6 fill-white" />
                            </Button>
                        </div>
                    </motion.div>
                )}

                {gameState === 'victory' && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 bg-cyan-950/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-8 border-[12px] border-cyan-400">
                        <Shield className="w-32 h-32 text-cyan-400 mb-6 drop-shadow-[0_0_40px_cyan]" />
                        <h2 className="text-6xl font-black text-white uppercase tracking-widest drop-shadow-[0_0_20px_cyan] mb-4">Grid Secured</h2>
                        <p className="text-cyan-200 text-2xl font-bold mb-10">Malware eradicated.</p>
                        <Button variant="primary" size="lg" className="px-16 py-6 text-2xl bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_30px_cyan] border-none font-black uppercase" onClick={() => onComplete(1200)}>
                            Return to Hub
                        </Button>
                    </motion.div>
                )}

                {gameState === 'gameover' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-red-950/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-8">
                        <Skull className="w-32 h-32 text-red-500 mb-6 drop-shadow-[0_0_40px_red]" />
                        <h2 className="text-6xl font-black text-red-500 uppercase tracking-widest drop-shadow-[0_0_20px_red] mb-4">Grid Lost</h2>
                        <p className="text-red-300 text-xl font-mono mb-10 text-center max-w-md">Your agents were deleted. The rogue AGI has taken control of the data center.</p>
                        <Button variant="primary" size="lg" className="bg-transparent border-2 border-red-500 text-red-500 hover:bg-red-900/50 uppercase tracking-widest font-bold px-12 py-4" onClick={startGame}>
                            Retry Simulation
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};
