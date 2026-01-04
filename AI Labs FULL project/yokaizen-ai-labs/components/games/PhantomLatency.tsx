import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, Float, Stars, PerspectiveCamera, Environment, useTexture, Edges } from '@react-three/drei';
import { Bloom, EffectComposer, ChromaticAberration, Vignette as PostVignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Button } from '../ui/Button';
import { Scanlines, Vignette } from '../ui/Visuals'; // Overlay visuals
import { explainLogicGate } from '../../services/geminiService';
import { audio } from '../../services/audioService';
import { Language } from '../../types';
import { ArrowUp, RotateCw, RotateCcw, Cpu, Eye, ShieldAlert, Skull, Hand, Database, AlertTriangle } from 'lucide-react';

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
            <meshStandardMaterial color="#000000" metalness={0.8} roughness={0.2} />
            <Edges
                scale={1}
                threshold={15} // Display edges only when the angle between two faces exceeds this value (degrees)
                color="#06b6d4"
            />
        </mesh>
    );
};

const Enemy = ({ position }: { position: [number, number, number] }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame((state) => {
        if (ref.current) {
            ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.5;
            ref.current.rotation.y += 0.02;
        }
    });

    return (
        <group ref={ref} position={position}>
            <Float speed={5} rotationIntensity={0.5} floatIntensity={0.5}>
                <mesh castShadow>
                    <octahedronGeometry args={[0.8]} />
                    <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} wireframe />
                </mesh>
                <pointLight color="#ef4444" distance={3} intensity={5} />
            </Float>
        </group>
    );
};

const Goal = ({ position }: { position: [number, number, number] }) => {
    return (
        <group position={position}>
            <Float speed={2} rotationIntensity={1} floatIntensity={1}>
                <mesh>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={2} />
                </mesh>
                <pointLight color="#10b981" distance={5} intensity={5} />
            </Float>
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
                walls.push(<Enemy key={`${x}-${y}`} position={[posX, 2, posZ]} />);
            } else if (cell === 3) {
                walls.push(<Goal key={`${x}-${y}`} position={[posX, 2, posZ]} />);
            }
        });
    });
    return <group>{walls}</group>;
};

const CameraController = ({ pos, dir }: { pos: { x: number, y: number }, dir: Direction }) => {
    const { camera } = useThree();
    const targetPos = useRef(new THREE.Vector3(pos.x * 4, 2, pos.y * 4));

    // Calculate target rotation (Quaternion)
    // 0=N (Z-), 1=E (X+), 2=S (Z+), 3=W (X-)
    // But in standard Three.js:
    // N -> Looking at -Z. Rotation Y = PI
    // E -> Looking at +X. Rotation Y = -PI/2
    // S -> Looking at +Z. Rotation Y = 0
    // W -> Looking at -X. Rotation Y = PI/2
    // Let's adjust based on trial.
    // N (y decreasing) -> -Z. Rot Y = Math.PI.

    const getTargetRot = (d: Direction) => {
        // 0 (N) -> y - 1. Scene -Z.
        if (d === 0) return Math.PI;
        if (d === 1) return Math.PI / 2; // +X (Wait, standard: right is -PI/2? No, +X is -PI/2)
        // Let's assume standard coords: X right, Z down.
        // N (dy=-1) -> -Z.
        // E (dx=1) -> +X.
        // S (dy=1) -> +Z.
        if (d === 1) return Math.PI / 2 * 3; // 270 deg -> Right? No.
        // Let's simply lerp angles.
        // 0: PI
        // 1: PI/2 (Left/Right?)

        switch (d) {
            case 0: return Math.PI;      // Back? 
            case 1: return Math.PI / 2;  // Left?
            case 2: return 0;            // Front
            case 3: return -Math.PI / 2; // Right
        }
        return 0;
    };

    // Using simple lookAt targets is easier than Euler lerp (gimbal lock risk).
    // Target LookAt:
    // 0 (N) -> x, z-10
    // 1 (E) -> x+10, z
    // 2 (S) -> x, z+10
    // 3 (W) -> x-10, z

    useFrame((state, delta) => {
        // Move position
        const tPos = new THREE.Vector3(pos.x * 4, 2, pos.y * 4);
        camera.position.lerp(tPos, 5 * delta);

        // Rotation
        // We calculate a target view point
        const lookTarget = tPos.clone();
        if (dir === 0) lookTarget.z -= 10;
        if (dir === 1) lookTarget.x += 10;
        if (dir === 2) lookTarget.z += 10;
        if (dir === 3) lookTarget.x -= 10;

        // Create a dummy object to lerp quaternion
        const dummy = new THREE.Object3D();
        dummy.position.copy(camera.position);
        dummy.lookAt(lookTarget);
        camera.quaternion.slerp(dummy.quaternion, 5 * delta);
    });

    return null;
}

// --- MAIN COMPONENT ---

export const PhantomLatency: React.FC<PhantomLatencyProps> = ({ onComplete, t }) => {
    // Game Logic State
    const [pos, setPos] = useState({ x: 1, y: 5 });
    const [dir, setDir] = useState<Direction>(0); // Start facing North
    const [viewState, setViewState] = useState<'EXPLORE' | 'COMBAT' | 'WIN'>('EXPLORE');
    const [visited, setVisited] = useState<string[]>(['1,5']);

    // Combat State
    const [combatGate, setCombatGate] = useState<'AND' | 'OR' | 'XOR'>('AND');
    const [inputs, setInputs] = useState([false, false]);
    const [feedback, setFeedback] = useState('');

    // Movement Logic
    const moveForward = (force = false) => {
        let dx = 0, dy = 0;
        if (dir === 0) dy = -1; // N
        if (dir === 1) dx = 1;  // E
        if (dir === 2) dy = 1;  // S
        if (dir === 3) dx = -1; // W

        const nx = pos.x + dx;
        const ny = pos.y + dy;

        if (LEVEL_MAP[ny] && LEVEL_MAP[ny][nx] !== 1) {
            // Check Enemy
            if (!force && LEVEL_MAP[ny][nx] === 2) {
                setCombatGate(['AND', 'OR', 'XOR'][Math.floor(Math.random() * 3)] as any);
                setInputs([false, false]);
                setViewState('COMBAT');
                audio.playError(); // Alarm sound
                return;
            }
            // Check Goal
            if (LEVEL_MAP[ny][nx] === 3) {
                setViewState('WIN');
                audio.playSuccess();
                setTimeout(() => onComplete(100), 2000);
                return;
            }

            setPos({ x: nx, y: ny });
            if (!visited.includes(`${nx},${ny}`)) setVisited(p => [...p, `${nx},${ny}`]);
            audio.playHover(); // Step sound
        } else {
            audio.playError(); // Wall bump
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

    // Input Handling
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

    // Combat Logic
    const checkCombat = async () => {
        let success = false;
        if (combatGate === 'AND') success = inputs[0] && inputs[1];
        if (combatGate === 'OR') success = inputs[0] || inputs[1];
        if (combatGate === 'XOR') success = inputs[0] !== inputs[1];

        if (success) {
            setFeedback(t('phantom.access_granted'));
            audio.playSuccess();
            setTimeout(() => {
                setViewState('EXPLORE');
                setFeedback('');
                moveForward(true);
            }, 1500);
        } else {
            const tip = await explainLogicGate(combatGate, false);
            setFeedback(`${t('phantom.access_denied')} ${tip}`);
            audio.playError();
        }
    };

    return (
        <div className="h-full bg-black flex flex-col font-mono relative overflow-hidden select-none">
            {/* DOM OVERLAYS on top of Canvas */}
            <Scanlines />
            <Vignette color="#000000" />

            {/* --- 3D CANVAS --- */}
            <div className="absolute inset-0 z-0">
                <Canvas shadows dpr={[1, 2]}>
                    <color attach="background" args={['#050505']} />
                    <fog attach="fog" args={['#050505', 0, 20]} />
                    <ambientLight intensity={0.2} />
                    <spotLight position={[0, 10, 0]} intensity={1} />

                    <CameraController pos={pos} dir={dir} />
                    <Maze />

                    {/* Floor */}
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[14, 0, 10]}>
                        <planeGeometry args={[100, 100]} />
                        <meshStandardMaterial color="#111" metalness={0.5} roughness={0.5} />
                        <gridHelper args={[100, 100, 0x222222, 0x111111]} rotation={[-Math.PI / 2, 0, 0]} />
                    </mesh>

                    <EffectComposer>
                        <Bloom luminanceThreshold={0.5} intensity={1.5} />
                        <ChromaticAberration offset={new THREE.Vector2(0.002, 0.002)} />
                        <PostVignette eskil={false} offset={0.1} darkness={1.1} />
                    </EffectComposer>
                </Canvas>
            </div>

            {/* --- UI LAYER --- */}
            <div className="absolute inset-0 z-10 pointer-events-none p-4 flex flex-col justify-between">
                {/* Header / Minimap Area */}
                <div className="flex justify-between items-start">
                    <div className="bg-black/80 border border-cyan-500/30 p-2 rounded">
                        <h2 className="text-xl font-bold text-cyan-500 animate-pulse">{t('phantom.title')}</h2>
                        <div className="text-xs text-gray-400">POS: {pos.x}, {pos.y} | DIR: {['N', 'E', 'S', 'W'][dir]}</div>
                    </div>

                    {/* Minimap */}
                    <div className="w-32 h-32 border border-cyan-500/50 bg-black/90 p-1 grid grid-cols-8 grid-rows-7 gap-px">
                        {LEVEL_MAP.map((row, y) => row.map((cell, x) => {
                            const isVisited = visited.includes(`${x},${y}`);
                            const isPlayer = pos.x === x && pos.y === y;
                            let color = 'bg-transparent';
                            if (isVisited || cell === 3) {
                                if (cell === 1) color = 'bg-gray-800';
                                if (cell === 2) color = 'bg-red-900/50';
                                if (cell === 3) color = 'bg-green-900/50';
                            }
                            if (cell === 0 && isVisited) color = 'bg-gray-900';

                            return (
                                <div key={`${x}-${y}`} className={`w-full h-full ${color} flex items-center justify-center`}>
                                    {isPlayer && (
                                        <div
                                            className="w-2 h-2 bg-cyan-400 rounded-full"
                                            style={{ transform: `rotate(${dir * 90}deg)` }} // Just a dot, direction is clear in 3D
                                        />
                                    )}
                                </div>
                            );
                        }))}
                    </div>
                </div>

                {/* Controls Hints */}
                {viewState === 'EXPLORE' && (
                    <div className="text-center pb-8 animate-pulse text-cyan-500 font-bold text-sm">
                        USE ARROW KEYS or WASD TO EXPLORE
                    </div>
                )}
            </div>

            {/* --- COMBAT OVERLAY --- */}
            {viewState === 'COMBAT' && (
                <div className="absolute inset-0 z-20 bg-black/90 flex flex-col items-center justify-center p-6 animate-in zoom-in duration-200 pointer-events-auto">
                    <div className="w-full max-w-sm border-2 border-red-500 bg-red-900/20 p-6 rounded-xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"></div>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-red-500 blink">{t('phantom.breach')}</h3>
                            <ShieldAlert className="text-red-500 animate-pulse" size={32} />
                        </div>

                        <div className="text-center mb-8">
                            <div className="text-sm text-gray-400 uppercase mb-2">{t('phantom.firewall')}</div>
                            <div className="text-5xl font-black text-white tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">{combatGate}</div>
                        </div>

                        <div className="flex justify-center space-x-6 mb-8">
                            {[0, 1].map(i => (
                                <div key={i} className="text-center">
                                    <div className="text-xs text-gray-500 mb-2">{t('phantom.input')} {String.fromCharCode(65 + i)}</div>
                                    <button
                                        onClick={() => {
                                            const newInputs = [...inputs];
                                            newInputs[i] = !newInputs[i];
                                            setInputs(newInputs);
                                            audio.playClick();
                                        }}
                                        className={`w-16 h-16 rounded border-2 flex items-center justify-center text-2xl font-bold transition-all ${inputs[i]
                                                ? 'bg-cyan-500 border-cyan-400 text-black shadow-[0_0_20px_#00FFFF]'
                                                : 'bg-black border-gray-700 text-gray-600'
                                            }`}
                                    >
                                        {inputs[i] ? '1' : '0'}
                                    </button>
                                </div>
                            ))}
                        </div>

                        {feedback && (
                            <div className="bg-black/50 border border-white/10 p-3 rounded mb-4 text-center text-xs text-amber-400 font-bold animate-pulse">
                                {feedback}
                            </div>
                        )}

                        <Button fullWidth variant="danger" onClick={checkCombat}>{t('phantom.execute')}</Button>
                    </div>
                </div>
            )}

            {/* --- WIN SCREEN --- */}
            {viewState === 'WIN' && (
                <div className="absolute inset-0 z-20 bg-green-900/90 flex flex-col items-center justify-center animate-in zoom-in pointer-events-auto">
                    <Cpu size={80} className="text-white mb-6 animate-bounce" />
                    <h2 className="text-4xl font-black text-white mb-4">{t('phantom.rooted')}</h2>
                    <div className="text-green-300 font-mono mb-8">{t('phantom.latency_fixed')}</div>
                    <Button variant="primary" onClick={() => onComplete(100)} className="bg-white text-green-900">{t('common.continue')}</Button>
                </div>
            )}
        </div>
    );
};
