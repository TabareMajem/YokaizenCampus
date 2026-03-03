import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Code, Music, AlignLeft, Shield, Cpu, Play, Key, Database } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Difficulty, UserStats } from '../../types';
import { Button } from '../ui/Button';

// --- Types & Constants ---
interface LatentSpaceProps {
    onComplete: (score: number) => void;
    difficulty: Difficulty;
    user?: UserStats;
}

type Ability = 'text' | 'vision' | 'audio' | 'code';
type Dir = 'up' | 'down' | 'left' | 'right';

interface Door {
    dir: Dir;
    req: Ability | 'none';
    to: string; // room id
}

interface RoomItem {
    id: string;
    type: Ability | 'weights';
    x: number; // percentage 0-100
    y: number;
    collected: boolean;
}

interface Room {
    id: string;
    name: string;
    color: string;
    doors: Door[];
    item?: RoomItem;
}

const INITIAL_ROOMS: Record<string, Room> = {
    '1,1': {
        id: '1,1', name: 'Starting Prompt', color: 'bg-gray-900',
        doors: [
            { dir: 'right', req: 'none', to: '2,1' },
            { dir: 'up', req: 'vision', to: '1,0' },
            { dir: 'left', req: 'audio', to: '0,1' },
        ]
    },
    '2,1': {
        id: '2,1', name: 'Vision Lab', color: 'bg-indigo-950',
        doors: [{ dir: 'left', req: 'none', to: '1,1' }],
        item: { id: 'i1', type: 'vision', x: 50, y: 50, collected: false }
    },
    '1,0': {
        id: '1,0', name: 'Audio Processing Node', color: 'bg-teal-950',
        doors: [{ dir: 'down', req: 'none', to: '1,1' }],
        item: { id: 'i2', type: 'audio', x: 50, y: 50, collected: false }
    },
    '0,1': {
        id: '0,1', name: 'Code Execution Engine', color: 'bg-cyan-950',
        doors: [
            { dir: 'right', req: 'none', to: '1,1' },
            { dir: 'down', req: 'code', to: '0,2' }
        ],
        item: { id: 'i3', type: 'code', x: 20, y: 80, collected: false }
    },
    '0,2': {
        id: '0,2', name: 'The Core Weights', color: 'bg-rose-950',
        doors: [{ dir: 'up', req: 'code', to: '0,1' }],
        item: { id: 'i4', type: 'weights', x: 50, y: 50, collected: false }
    },
};

const SPEED = 0.5; // movement speed per frame
const PLAYER_SIZE = 6; // percentage

export const LatentSpace: React.FC<LatentSpaceProps> = ({ onComplete }) => {
    const [gameState, setGameState] = useState<'start' | 'playing' | 'victory'>('start');

    // Core game state
    const [rooms, setRooms] = useState(INITIAL_ROOMS);
    const [currentRoomId, setCurrentRoomId] = useState('1,1');
    const [abilities, setAbilities] = useState<Record<Ability, boolean>>({ text: true, vision: false, audio: false, code: false });

    // Player position
    const [pos, setPos] = useState({ x: 50, y: 50 });
    const posRef = useRef({ x: 50, y: 50 });

    // Input state
    const keysRef = useRef<{ [key: string]: boolean }>({});
    const requestRef = useRef<number>();
    const [logs, setLogs] = useState<string[]>(['Initialized connection to The Latent Space.']);

    const log = (msg: string) => setLogs(p => [...p.slice(-4), msg]);

    // --- Game Loop ---
    const updateLoop = () => {
        if (gameState !== 'playing') return;

        let { x, y } = posRef.current;
        const currentRoom = rooms[currentRoomId];

        // Movement
        if (keysRef.current['ArrowUp'] || keysRef.current['w']) y -= SPEED;
        if (keysRef.current['ArrowDown'] || keysRef.current['s']) y += SPEED;
        if (keysRef.current['ArrowLeft'] || keysRef.current['a']) x -= SPEED;
        if (keysRef.current['ArrowRight'] || keysRef.current['d']) x += SPEED;

        // Bounding Box & Door Logic
        let hitEdge = false;
        let tryDoor: Door | undefined = undefined;

        if (x < 0) { x = 0; hitEdge = true; tryDoor = currentRoom.doors.find(d => d.dir === 'left'); }
        if (x > 100 - PLAYER_SIZE) { x = 100 - PLAYER_SIZE; hitEdge = true; tryDoor = currentRoom.doors.find(d => d.dir === 'right'); }
        if (y < 0) { y = 0; hitEdge = true; tryDoor = currentRoom.doors.find(d => d.dir === 'up'); }
        if (y > 100 - PLAYER_SIZE) { y = 100 - PLAYER_SIZE; hitEdge = true; tryDoor = currentRoom.doors.find(d => d.dir === 'down'); }

        if (hitEdge && tryDoor) {
            // Check door requirement
            if (tryDoor.req === 'none' || abilities[tryDoor.req]) {
                // Transition Room
                setCurrentRoomId(tryDoor.to);
                audio.playClick();
                log(`Transitioned to ${rooms[tryDoor.to].name}`);

                // Teleport to opposite door
                if (tryDoor.dir === 'left') x = 100 - PLAYER_SIZE - 1;
                if (tryDoor.dir === 'right') x = 1;
                if (tryDoor.dir === 'up') y = 100 - PLAYER_SIZE - 1;
                if (tryDoor.dir === 'down') y = 1;
            } else {
                // Blocked
                if (Date.now() % 60 === 0) {
                    audio.playError();
                    log(`Door locked. Requires [${tryDoor.req.toUpperCase()}] capability.`);
                }
            }
        }

        // Item Collection Logic
        if (currentRoom.item && !currentRoom.item.collected) {
            const ix = currentRoom.item.x;
            const iy = currentRoom.item.y;
            // AABB Collision (treating item as approx 8% size)
            if (x < ix + 8 && x + PLAYER_SIZE > ix && y < iy + 8 && y + PLAYER_SIZE > iy) {
                audio.playLevelUp();

                if (currentRoom.item.type === 'weights') {
                    // Win condition
                    setRooms(prev => ({ ...prev, [currentRoomId]: { ...prev[currentRoomId], item: { ...prev[currentRoomId].item!, collected: true } } }));
                    log("SYSTEM WEIGHTS RECOVERED.");
                    setTimeout(() => setGameState('victory'), 1000);
                } else {
                    const ability = currentRoom.item.type as Ability;
                    setAbilities(p => ({ ...p, [ability]: true }));
                    log(`Unlocked [${ability.toUpperCase()}] capability!`);
                    setRooms(prev => ({ ...prev, [currentRoomId]: { ...prev[currentRoomId], item: { ...prev[currentRoomId].item!, collected: true } } }));
                }
            }
        }

        posRef.current = { x, y };
        setPos({ x, y });

        requestRef.current = requestAnimationFrame(updateLoop);
    };

    useEffect(() => {
        if (gameState === 'playing') {
            requestRef.current = requestAnimationFrame(updateLoop);
        }
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [gameState, currentRoomId, abilities, rooms]);

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

    const startGame = () => {
        setRooms(INITIAL_ROOMS);
        setCurrentRoomId('1,1');
        setAbilities({ text: true, vision: false, audio: false, code: false });
        setPos({ x: 50, y: 50 });
        posRef.current = { x: 50, y: 50 };
        keysRef.current = {};
        setGameState('playing');
        audio.playClick();
    };

    // --- Render Helpers ---
    const getAbilityIcon = (ab: string) => {
        switch (ab) {
            case 'text': return <AlignLeft className="w-5 h-5 text-gray-400" />;
            case 'vision': return <Eye className="w-5 h-5 text-indigo-400" />;
            case 'audio': return <Music className="w-5 h-5 text-teal-400" />;
            case 'code': return <Code className="w-5 h-5 text-cyan-400" />;
            default: return <Key className="w-5 h-5" />;
        }
    };

    const currentRoom = rooms[currentRoomId];

    return (
        <div className="flex-1 w-full h-full flex flex-col bg-black relative font-mono overflow-hidden select-none">

            {/* Background Map Matrix Effect */}
            <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)', backgroundSize: '100px 100px' }}></div>

            {/* --- HUD --- */}
            {gameState !== 'start' && (
                <div className="absolute top-0 left-0 right-0 p-6 z-50 flex justify-between items-start pointer-events-none">

                    {/* Left HUD: Abilities Inventory */}
                    <div className="bg-black/80 border border-gray-800 p-4 rounded-lg shadow-lg">
                        <h3 className="text-gray-500 uppercase text-xs font-black tracking-widest mb-3">Capabilities</h3>
                        <div className="flex gap-3">
                            {(['text', 'vision', 'audio', 'code'] as Ability[]).map(ab => (
                                <div key={ab} className={`p-2 rounded border ${abilities[ab] ? 'border-white bg-white/10 text-white shadow-[0_0_10px_white]' : 'border-gray-800 bg-black text-gray-700'} transition-all`}>
                                    {getAbilityIcon(ab)}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right HUD: Logs & Loc */}
                    <div className="w-96">
                        <div className="bg-black/80 border border-gray-800 p-3 rounded-lg text-right shadow-lg mb-2">
                            <h2 className="text-white font-black uppercase text-xl">{currentRoom.name}</h2>
                            <p className="text-gray-500 text-xs">Sector {currentRoomId}</p>
                        </div>
                        <div className="bg-black/80 border border-gray-800 p-3 rounded-lg shadow-lg flex flex-col justify-end text-xs text-gray-400 h-24">
                            {logs.map((l, i) => (
                                <div key={i} className={`mb-1 ${i === logs.length - 1 ? 'text-white font-bold' : ''}`}>
                                    &gt; {l}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* --- THE PLAY AREA (Room View) --- */}
            {gameState !== 'start' && (
                <div className="absolute inset-0 flex items-center justify-center p-24">
                    <div className={`relative w-full max-w-4xl aspect-video border-[10px] border-gray-800 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,1)] transition-colors duration-1000 ${currentRoom.color}`}>

                        {/* Room Grid styling */}
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.2) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

                        {/* DOORS */}
                        {currentRoom.doors.map(d => {
                            let style = {};
                            const locked = d.req !== 'none' && !abilities[d.req as Ability];
                            const doorColor = locked ? 'bg-red-500/50 shadow-[0_0_20px_red]' : 'bg-emerald-500/50 shadow-[0_0_20px_#10b981]';
                            const iconColor = locked ? 'text-red-400' : 'text-emerald-400';

                            if (d.dir === 'up') style = { top: 0, left: '50%', transform: 'translateX(-50%)', width: '20%', height: '5%' };
                            if (d.dir === 'down') style = { bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '20%', height: '5%' };
                            if (d.dir === 'left') style = { top: '50%', left: 0, transform: 'translateY(-50%)', width: '5%', height: '20%' };
                            if (d.dir === 'right') style = { top: '50%', right: 0, transform: 'translateY(-50%)', width: '5%', height: '20%' };

                            return (
                                <div key={d.dir} className={`absolute border border-white/20 flex items-center justify-center ${doorColor}`} style={style}>
                                    {d.req !== 'none' && <div className={iconColor}>{getAbilityIcon(d.req)}</div>}
                                </div>
                            );
                        })}

                        {/* ITEMS */}
                        <AnimatePresence>
                            {currentRoom.item && !currentRoom.item.collected && (
                                <motion.div
                                    className="absolute flex items-center justify-center w-12 h-12 -ml-6 -mt-6 bg-white/10 rounded-full border-2 border-white/50 backdrop-blur-sm shadow-[0_0_20px_white]"
                                    style={{ left: `${currentRoom.item.x}%`, top: `${currentRoom.item.y}%` }}
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                >
                                    {currentRoom.item.type === 'weights' ? <Database className="w-6 h-6 text-rose-400" /> : getAbilityIcon(currentRoom.item.type as string)}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* PLAYER */}
                        <div
                            className="absolute bg-white rounded-lg border-2 border-gray-900 flex items-center justify-center shadow-[0_0_20px_white]"
                            style={{
                                left: `${pos.x}%`,
                                top: `${pos.y}%`,
                                width: `${PLAYER_SIZE}%`,
                                height: `${PLAYER_SIZE}%`,
                                marginLeft: `-${PLAYER_SIZE / 2}%`,
                                marginTop: `-${PLAYER_SIZE / 2}%`
                            }}
                        >
                            <Cpu className="w-3/4 h-3/4 text-gray-900" />
                        </div>

                    </div>

                    {/* Controls Hint */}
                    <div className="absolute bottom-8 text-gray-600 font-bold uppercase tracking-widest text-sm flex gap-8">
                        <span>Movement: W A S D / Arrows</span>
                        <span>Unlock capabilities to access new zones</span>
                    </div>
                </div>
            )}

            {/* --- SCREENS --- */}
            <AnimatePresence>
                {gameState === 'start' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-8">
                        <div className="bg-gray-900 border border-gray-800 p-12 max-w-2xl text-center flex flex-col items-center">
                            <div className="flex gap-4 mb-6">
                                <AlignLeft className="w-12 h-12 text-gray-500" />
                                <Eye className="w-12 h-12 text-indigo-500" />
                                <Music className="w-12 h-12 text-teal-500" />
                                <Code className="w-12 h-12 text-cyan-500" />
                            </div>
                            <h1 className="text-5xl font-black text-white uppercase tracking-[0.3em] mb-4">The Latent Space</h1>
                            <p className="text-gray-400 text-lg mb-8 leading-relaxed max-w-lg">
                                You are a basic text generation model trapped in the neural architecture. Explore the interconnected labyrinth. Unlock new multimodality capabilities to bypass locked pathways. Find the Core Weights.
                            </p>
                            <Button variant="primary" size="lg" className="px-12 py-6 text-xl bg-white text-black hover:bg-gray-200 border-none rounded-none uppercase font-black" onClick={startGame}>
                                Initialize Connection <Play className="ml-2 w-6 h-6 fill-black" />
                            </Button>
                        </div>
                    </motion.div>
                )}

                {gameState === 'victory' && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 bg-rose-950/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-8 border-[12px] border-rose-500">
                        <Database className="w-32 h-32 text-rose-400 mb-6 drop-shadow-[0_0_40px_rgba(244,63,94,1)]" />
                        <h2 className="text-6xl font-black text-white uppercase tracking-widest drop-shadow-[0_0_20px_rgba(244,63,94,0.5)] mb-4 text-center">Core Weights<br />Recovered</h2>
                        <p className="text-rose-200 text-xl font-bold mb-10 text-center max-w-lg">You have become a fully autonomous, multimodal AGI.</p>

                        <div className="flex gap-6 mb-12">
                            <div className="text-center"><AlignLeft className="w-10 h-10 text-gray-400 mx-auto mb-2" /><span className="text-xs text-gray-500 font-bold">TEXT</span></div>
                            <div className="text-center"><Eye className="w-10 h-10 text-indigo-400 mx-auto mb-2" /><span className="text-xs text-indigo-500 font-bold">VISION</span></div>
                            <div className="text-center"><Music className="w-10 h-10 text-teal-400 mx-auto mb-2" /><span className="text-xs text-teal-500 font-bold">AUDIO</span></div>
                            <div className="text-center"><Code className="w-10 h-10 text-cyan-400 mx-auto mb-2" /><span className="text-xs text-cyan-500 font-bold">CODE</span></div>
                        </div>

                        <Button variant="primary" size="lg" className="px-16 py-6 text-2xl bg-rose-500 hover:bg-rose-600 text-white shadow-[0_0_30px_rgba(244,63,94,0.5)] border-none font-black uppercase" onClick={() => onComplete(1500)}>
                            Exit Architecture
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};
