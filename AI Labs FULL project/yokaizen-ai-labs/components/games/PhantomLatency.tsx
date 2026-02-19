import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Environment, Edges, Stars, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '../ui/Button';
import { Scanlines, Vignette, Noise } from '../ui/Visuals'; // Overlay visuals
import { CyberpunkEffects } from '../gl/CyberpunkEffects'; // Unified pipeline
import { explainLogicGate } from '../../services/geminiService';
import { audio } from '../../services/audioService';
import { Language } from '../../types';
import { ShieldAlert, Cpu, Database, AlertTriangle, ArrowRight } from 'lucide-react';

// --- TYPES ---
interface PhantomLatencyProps {
    onComplete: (score: number) => void;
    t: (key: string) => string;
    language?: Language;
}

// 0=Empty, 1=Wall, 2=Enemy, 3=Goal
const LEVEL_MAP = [
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 2, 0, 0, 1, 0, 3, 1],
    [1, 0, 1, 0, 1, 0, 1, 1],
    [1, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 0, 1],
    [1, 0, 0, 2, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1]
];

type Direction = 0 | 1 | 2 | 3; // N, E, S, W

// --- 3D COMPONENTS ---

const Wall = ({ position }: { position: [number, number, number] }) => {
    return (
        <mesh position={position}>
            <boxGeometry args={[4, 4, 4]} />
            <meshStandardMaterial color="#020617" metalness={0.9} roughness={0.1} />
            <Edges scale={1} threshold={15} color="#0891b2" />
        </mesh>
    );
};

const FirewallNode = ({ position }: { position: [number, number, number] }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame((state, delta) => {
        if (ref.current) {
            ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.5;
            ref.current.rotation.y += delta;
        }
    });

    return (
        <group ref={ref} position={position}>
            <Float speed={4} rotationIntensity={1} floatIntensity={1}>
                {/* Core Node */}
                <mesh castShadow>
                    <octahedronGeometry args={[0.8]} />
                    <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} wireframe />
                </mesh>
                {/* Orbital Ring */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[1.5, 0.05, 16, 64]} />
                    <meshBasicMaterial color="#ef4444" transparent opacity={0.6} />
                </mesh>
                <pointLight color="#ef4444" distance={5} intensity={5} />
            </Float>
            <Sparkles count={50} scale={3} size={2} speed={0.4} opacity={0.5} color="#ef4444" />
        </group>
    );
};

const DataCoreGoal = ({ position }: { position: [number, number, number] }) => {
    return (
        <group position={position}>
            <Float speed={2} rotationIntensity={1} floatIntensity={1}>
                <mesh>
                    <icosahedronGeometry args={[1, 1]} />
                    <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={2} wireframe />
                </mesh>
                <mesh>
                    <icosahedronGeometry args={[0.5, 0]} />
                    <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={5} />
                </mesh>
                <pointLight color="#10b981" distance={5} intensity={5} />
            </Float>
            <Sparkles count={100} scale={4} size={3} speed={0.6} opacity={0.8} color="#10b981" />
        </group>
    );
};

const Maze = () => {
    const walls: JSX.Element[] = [];
    LEVEL_MAP.forEach((row, y) => {
        row.forEach((cell, x) => {
            const posX = x * 4;
            const posZ = y * 4;
            if (cell === 1) {
                walls.push(<Wall key={`${x}-${y}`} position={[posX, 2, posZ]} />);
            } else if (cell === 2) {
                walls.push(<FirewallNode key={`${x}-${y}`} position={[posX, 2, posZ]} />);
            } else if (cell === 3) {
                walls.push(<DataCoreGoal key={`${x}-${y}`} position={[posX, 2, posZ]} />);
            }
        });
    });
    return <group>{walls}</group>;
};

const CameraController = ({ pos, dir, combatActive }: { pos: { x: number, y: number }, dir: Direction, combatActive: boolean }) => {
    const { camera } = useThree();

    useFrame((state, delta) => {
        // Move position
        const tPos = new THREE.Vector3(pos.x * 4, 2, pos.y * 4);
        camera.position.lerp(tPos, 8 * delta);

        // Rotation Target
        const lookTarget = tPos.clone();
        if (dir === 0) lookTarget.z -= 10;
        if (dir === 1) lookTarget.x += 10;
        if (dir === 2) lookTarget.z += 10;
        if (dir === 3) lookTarget.x -= 10;

        // If in combat, shake camera slightly and look exactly at the node
        if (combatActive) {
            lookTarget.x += Math.sin(state.clock.elapsedTime * 20) * 0.1;
            lookTarget.y += Math.cos(state.clock.elapsedTime * 25) * 0.1;
        }

        const dummy = new THREE.Object3D();
        dummy.position.copy(camera.position);
        dummy.lookAt(lookTarget);
        camera.quaternion.slerp(dummy.quaternion, 8 * delta);
    });

    return null;
}

// --- MAIN COMPONENT ---

export const PhantomLatency: React.FC<PhantomLatencyProps> = ({ onComplete, t }) => {
    const [pos, setPos] = useState({ x: 1, y: 5 });
    const [dir, setDir] = useState<Direction>(0);
    const [viewState, setViewState] = useState<'EXPLORE' | 'COMBAT' | 'WIN'>('EXPLORE');
    const [visited, setVisited] = useState<string[]>(['1,5']);
    const [combatGate, setCombatGate] = useState<'AND' | 'OR' | 'XOR'>('AND');
    const [inputs, setInputs] = useState([false, false]);
    const [feedback, setFeedback] = useState('');
    const [shake, setShake] = useState(0);

    const moveForward = (force = false) => {
        let dx = 0, dy = 0;
        if (dir === 0) dy = -1; // N
        if (dir === 1) dx = 1;  // E
        if (dir === 2) dy = 1;  // S
        if (dir === 3) dx = -1; // W

        const nx = pos.x + dx;
        const ny = pos.y + dy;

        if (LEVEL_MAP[ny] && LEVEL_MAP[ny][nx] !== 1) {
            if (!force && LEVEL_MAP[ny][nx] === 2) {
                setCombatGate(['AND', 'OR', 'XOR'][Math.floor(Math.random() * 3)] as any);
                setInputs([false, false]);
                setViewState('COMBAT');
                setShake(0.5);
                setTimeout(() => setShake(0), 200);
                audio.playError();
                return;
            }
            if (LEVEL_MAP[ny][nx] === 3) {
                setViewState('WIN');
                audio.playSuccess();
                return;
            }

            setPos({ x: nx, y: ny });
            if (!visited.includes(`${nx},${ny}`)) setVisited(p => [...p, `${nx},${ny}`]);
            audio.playHover();
        } else {
            setShake(0.2);
            setTimeout(() => setShake(0), 100);
            audio.playError();
        }
    };

    const turn = (clockWise: boolean) => {
        setDir(prev => {
            let next = prev + (clockWise ? 1 : -1);
            if (next > 3) next = 0;
            if (next < 0) next = 3;
            return next as Direction;
        });
        audio.playClick();
    };

    useEffect(() => {
        if (viewState !== 'EXPLORE') return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp' || e.key === 'w') moveForward();
            if (e.key === 'ArrowLeft' || e.key === 'a') turn(false);
            if (e.key === 'ArrowRight' || e.key === 'd') turn(true);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewState, pos, dir]);

    const checkCombat = async () => {
        let success = false;
        if (combatGate === 'AND') success = inputs[0] && inputs[1];
        if (combatGate === 'OR') success = inputs[0] || inputs[1];
        if (combatGate === 'XOR') success = inputs[0] !== inputs[1];

        if (success) {
            setFeedback(t('phantom.access_granted') || "FIREWALL BREACHED");
            audio.playSuccess();
            setTimeout(() => {
                setViewState('EXPLORE');
                setFeedback('');
                moveForward(true); // Step into the tile
            }, 1000);
        } else {
            const tip = await explainLogicGate(combatGate, false);
            setFeedback(`${t('phantom.access_denied') || "ACCESS DENIED."} ${tip}`);
            setShake(0.5);
            setTimeout(() => setShake(0), 200);
            audio.playError();
        }
    };

    return (
        <div className="h-full bg-slate-950 flex flex-col font-mono relative overflow-hidden select-none">
            <Scanlines />
            <Vignette color="#000000" />
            <Noise opacity={0.15} />

            {/* --- 3D CANVAS --- */}
            <div className={`absolute inset-0 z-0 transition-transform duration-75`} style={{ transform: `translate(${Math.random() * shake * 20}px, ${Math.random() * shake * 20}px)` }}>
                <Canvas shadows camera={{ fov: 60 }}>
                    <color attach="background" args={['#020617']} />
                    <fog attach="fog" args={['#020617', 5, 25]} />
                    <ambientLight intensity={0.2} />
                    <spotLight position={[0, 10, 0]} intensity={2} color="#06b6d4" />
                    <Environment preset="night" />

                    <CameraController pos={pos} dir={dir} combatActive={viewState === 'COMBAT'} />
                    <Maze />

                    {/* Holographic Neural Grid Floor */}
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[14, 0, 10]}>
                        <planeGeometry args={[100, 100]} />
                        <meshStandardMaterial color="#000000" metalness={0.9} roughness={0.1} />
                        <gridHelper args={[100, 100, 0x0891b2, 0x0f172a]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} />
                    </mesh>

                    <Stars radius={50} depth={50} count={3000} factor={4} saturation={1} fade speed={1} />

                    <CyberpunkEffects
                        bloomIntensity={viewState === 'COMBAT' ? 4 : 2.5}
                        glitchFactor={viewState === 'COMBAT' ? 0.05 : shake > 0 ? 0.1 : 0}
                        noiseOpacity={viewState === 'COMBAT' ? 0.3 : 0.15}
                    />
                </Canvas>
            </div>

            {/* --- UI LAYER --- */}
            <div className="absolute inset-0 z-10 pointer-events-none p-4 md:p-8 flex flex-col justify-between">

                <div className="flex justify-between items-start">
                    {/* Status Box */}
                    <div className="bg-black/80 border border-cyan-500/50 p-4 rounded-xl backdrop-blur-md shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                        <div className="text-xs text-cyan-500 font-bold uppercase tracking-[0.2em] mb-1 flex items-center">
                            <Database size={14} className="mr-2" /> {t('phantom.title') || "LATENCY LABYRINTH"}
                        </div>
                        <div className="text-2xl font-black text-white drop-shadow-[0_0_10px_white]">
                            SECTOR {pos.x}-{pos.y}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold mt-2 flex justify-between">
                            <span>{t('games.phantomlatency.dir') || "HEADING:"}</span>
                            <span className="text-cyan-400">{['NORTH', 'EAST', 'SOUTH', 'WEST'][dir]}</span>
                        </div>
                    </div>

                    {/* Minimap */}
                    <div className="w-32 h-32 md:w-40 md:h-40 border-2 border-cyan-500/50 bg-black/80 p-1 grid grid-cols-8 grid-rows-7 gap-px rounded-lg backdrop-blur-md shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                        {LEVEL_MAP.map((row, y) => row.map((cell, x) => {
                            const isVisited = visited.includes(`${x},${y}`);
                            const isPlayer = pos.x === x && pos.y === y;
                            let color = 'bg-transparent';
                            if (isVisited || cell === 3) {
                                if (cell === 1) color = 'bg-slate-800';
                                if (cell === 2) color = 'bg-red-500/40 animate-pulse';
                                if (cell === 3) color = 'bg-green-500/40 shadow-[0_0_10px_lime]';
                            }
                            if (cell === 0 && isVisited) color = 'bg-cyan-900/30';

                            return (
                                <div key={`${x}-${y}`} className={`w-full h-full ${color} flex items-center justify-center rounded-sm transition-colors duration-300`}>
                                    {isPlayer && (
                                        <div
                                            className="w-2 h-2 md:w-3 md:h-3 border-t-2 border-l-2 border-white rounded-tl-sm shadow-[0_0_5px_white]"
                                            style={{ transform: `rotate(${dir * 90 + 45}deg)` }}
                                        />
                                    )}
                                </div>
                            );
                        }))}
                    </div>
                </div>

                {/* Controls Hints */}
                {viewState === 'EXPLORE' && (
                    <div className="text-center pb-8 text-cyan-500 font-bold text-xs uppercase tracking-[0.3em] flex flex-col items-center">
                        <span className="animate-pulse mb-2">{t('games.phantomlatency.use_arrow_keys_or_wa') || "WASD / ARROWS TO EXPLORE"}</span>
                        <div className="flex gap-4 opacity-50">
                            <span className="border border-cyan-500/50 px-2 py-1 rounded">W/&uarr; FWD</span>
                            <span className="border border-cyan-500/50 px-2 py-1 rounded">A/&larr; LFT</span>
                            <span className="border border-cyan-500/50 px-2 py-1 rounded">D/&rarr; RGT</span>
                        </div>
                    </div>
                )}
            </div>

            {/* --- COMBAT OVERLAY --- */}
            {viewState === 'COMBAT' && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in zoom-in duration-300 pointer-events-auto">
                    <Scanlines />
                    <div className="w-full max-w-md border border-red-500/50 bg-red-950/40 p-8 rounded-2xl relative overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.2)]">
                        <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"></div>
                        <div className="absolute bottom-0 right-0 p-2 text-red-500/20"><ShieldAlert size={100} /></div>

                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-black text-red-500 uppercase tracking-widest flex items-center shadow-red-500 drop-shadow-lg">
                                    <AlertTriangle size={24} className="mr-2 animate-pulse" /> {t('phantom.breach') || "FIREWALL DETECTED"}
                                </h3>
                            </div>

                            <div className="text-center mb-8 bg-black/60 py-6 rounded-xl border border-red-900/50">
                                <div className="text-[10px] text-red-400 uppercase tracking-[0.3em] font-bold mb-2">{t('phantom.firewall') || "REQUIRED LOGIC GATE"}</div>
                                <div className="text-6xl font-black text-white tracking-widest drop-shadow-[0_0_20px_rgba(255,255,255,0.8)] glow">{combatGate}</div>
                            </div>

                            <div className="flex justify-center space-x-8 mb-8">
                                {[0, 1].map(i => (
                                    <div key={i} className="text-center">
                                        <div className="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-3">INPUT {String.fromCharCode(65 + i)}</div>
                                        <button
                                            onClick={() => {
                                                const newInputs = [...inputs];
                                                newInputs[i] = !newInputs[i];
                                                setInputs(newInputs);
                                                audio.playClick();
                                            }}
                                            className={`w-20 h-20 rounded-xl border flex items-center justify-center text-4xl font-black transition-all duration-200 transform active:scale-95 ${inputs[i]
                                                ? 'bg-red-600 border-red-400 text-white shadow-[0_0_30px_rgba(239,68,68,0.6)]'
                                                : 'bg-black/80 border-slate-700 text-slate-600'
                                                }`}
                                        >
                                            {inputs[i] ? '1' : '0'}
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {feedback && (
                                <div className="bg-black/80 border border-slate-700 p-4 rounded-lg mb-6 text-center text-xs text-amber-400 font-bold animate-in slide-in-from-bottom">
                                    {feedback}
                                </div>
                            )}

                            <Button fullWidth size="lg" variant="danger" onClick={checkCombat} className="bg-red-600 border-none font-black text-xl tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                                {t('phantom.execute') || "BYPASS FIREWALL"} <ArrowRight size={20} className="ml-2" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- WIN SCREEN --- */}
            {viewState === 'WIN' && (
                <div className="absolute inset-0 z-50 bg-green-950/90 backdrop-blur-xl flex flex-col items-center justify-center animate-in zoom-in duration-500 border-4 border-green-500">
                    <Scanlines />
                    <div className="w-32 h-32 bg-green-900/30 rounded-full flex items-center justify-center mb-8 border-2 border-green-500 shadow-[0_0_100px_rgba(34,197,94,0.5)]">
                        <Cpu size={64} className="text-green-400 drop-shadow-[0_0_15px_lime]" />
                    </div>
                    <h2 className="text-5xl md:text-7xl font-black text-green-400 mb-4 tracking-[0.3em] uppercase drop-shadow-[0_0_20px_lime]">
                        {t('phantom.rooted') || "CORE SECURED"}
                    </h2>
                    <div className="text-white text-xl font-mono mb-12 border-b border-green-500/30 pb-4 inline-block tracking-widest">
                        {t('phantom.latency_fixed') || "Latency optimized. Data pipeline restored."}
                    </div>
                    <Button variant="primary" onClick={() => onComplete(100)} className="bg-green-600 border-none px-16 py-6 text-xl text-black font-black tracking-widest shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                        {t('common.continue') || "EXTRACT DATA"}
                    </Button>
                </div>
            )}

            {/* TOUCH CONTROLS OVERLAY FOR MOBILE */}
            {viewState === 'EXPLORE' && (
                <div className="absolute bottom-0 inset-x-0 h-1/3 flex z-40 md:hidden opacity-0">
                    <div className="flex-1" onClick={() => turn(false)}></div>
                    <div className="flex-1" onClick={() => moveForward()}></div>
                    <div className="flex-1" onClick={() => turn(true)}></div>
                </div>
            )}
        </div>
    );
};
