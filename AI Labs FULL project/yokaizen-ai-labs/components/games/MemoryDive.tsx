import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { audio } from '../../services/audioService';
import { Brain, Skull, ShieldAlert, Crosshair, RefreshCw, Zap } from 'lucide-react';
import { Scanlines } from '../ui/Visuals';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, MeshDistortMaterial, Trail, Float, Sparkles, Stars } from '@react-three/drei';
import { CyberpunkEffects } from '../gl/CyberpunkEffects';
import * as THREE from 'three';

interface MemoryDiveProps {
    onComplete: (score: number) => void;
    t: (key: string) => string;
}

const TUNNEL_SPEED = 20;
const LANE_WIDTH = 2; // Lanes at x: -2, 0, 2

// 3D Player Avatar (A glowing neural packet)
const NeuralAvatar = ({ targetX, isGameOver }: { targetX: number, isGameOver: boolean }) => {
    const meshRef = useRef<THREE.Group>(null);
    const trailRef = useRef<any>(null);

    useFrame((_, delta) => {
        if (meshRef.current) {
            // Smoothly interpolate position to target lane
            meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, delta * 15);

            // Banking effect
            const bankAngle = (meshRef.current.position.x - targetX) * 0.5;
            meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, bankAngle, delta * 10);

            if (isGameOver) {
                meshRef.current.rotation.y += delta * 10;
                meshRef.current.scale.multiplyScalar(0.95);
            }
        }
    });

    return (
        <group ref={meshRef} position={[0, -0.5, 0]}>
            <Trail width={2} length={20} color={isGameOver ? '#ef4444' : '#06b6d4'} attenuation={(t) => t * t}>
                <Float speed={5} rotationIntensity={0.2} floatIntensity={0.5}>
                    <mesh>
                        <octahedronGeometry args={[0.5, 2]} />
                        <MeshDistortMaterial
                            color={isGameOver ? "#ef4444" : "#ffffff"}
                            emissive={isGameOver ? "#ef4444" : "#06b6d4"}
                            emissiveIntensity={2}
                            distort={isGameOver ? 0.8 : 0.2}
                            speed={isGameOver ? 10 : 2}
                        />
                    </mesh>
                </Float>
            </Trail>
            <pointLight intensity={2} color={isGameOver ? "#ef4444" : "#06b6d4"} distance={5} />
        </group>
    );
};

// Moving Tunnel effect
const DataTunnel = ({ speed }: { speed: number }) => {
    const gridRef = useRef<THREE.GridHelper>(null);
    useFrame((_, delta) => {
        if (gridRef.current) {
            gridRef.current.position.z += speed * delta;
            if (gridRef.current.position.z > 10) gridRef.current.position.z -= 10;
        }
    });

    return (
        <group position={[0, -1, -50]}>
            <gridHelper ref={gridRef} args={[100, 100, 0xc026d3, 0x4c1d95]} position={[0, 0, 0]} />
            <gridHelper args={[100, 100, 0xc026d3, 0x4c1d95]} position={[0, 20, 0]} />
        </group>
    );
};

export const MemoryDive: React.FC<MemoryDiveProps> = ({ onComplete, t }) => {
    const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'OVER' | 'WIN'>('START');
    const [lane, setLane] = useState(0); // -1, 0, 1
    const [score, setScore] = useState(0);
    const [health, setHealth] = useState(100);
    const [multiplier, setMultiplier] = useState(1);
    const [combo, setCombo] = useState(0);
    const [cameraShake, setCameraShake] = useState(0);

    // Shared mutable state for the render loop
    const stateRef = useRef({
        obstacles: [] as { id: number, x: number, z: number, type: 'BAD' | 'GOOD' | 'SUPER', hit: boolean }[],
        speed: TUNNEL_SPEED,
        lane: 0,
        score: 0,
        health: 100,
        combo: 0,
        multiplier: 1
    });

    const requestRef = useRef<number>(0);
    const nextObstacleId = useRef(0);

    // Sync state for React UI
    useEffect(() => {
        stateRef.current.lane = lane;
    }, [lane]);

    const startGame = () => {
        audio.playClick();
        audio.playSuccess();
        setGameState('PLAYING');
        setScore(0);
        setHealth(100);
        setCombo(0);
        setMultiplier(1);
        setLane(0);

        stateRef.current = {
            obstacles: [],
            speed: TUNNEL_SPEED,
            lane: 0,
            score: 0,
            health: 100,
            combo: 0,
            multiplier: 1
        };

        lastSpawnTime.current = performance.now();
        requestRef.current = requestAnimationFrame(gameLoop);
    };

    const lastSpawnTime = useRef(0);

    const gameLoop = (time: number) => {
        if (stateRef.current.health <= 0) {
            setGameState('OVER');
            audio.playError();
            return;
        }

        if (stateRef.current.score >= 50000) {
            setGameState('WIN');
            audio.playSuccess();
            return;
        }

        const delta = 1 / 60; // Approximate
        stateRef.current.speed += delta * 0.5; // Slowly accelerate

        // Spawn Logic
        if (time - lastSpawnTime.current > Math.max(200, 1000 - stateRef.current.speed * 10)) {
            lastSpawnTime.current = time;

            // Random pattern generation (0 to 2 obstacles per row)
            const numObstacles = Math.random() > 0.8 ? 2 : 1;
            const availableLanes = [-1, 0, 1];

            for (let i = 0; i < numObstacles; i++) {
                const laneIdx = Math.floor(Math.random() * availableLanes.length);
                const assignedLane = availableLanes.splice(laneIdx, 1)[0];

                const rand = Math.random();
                let type: 'BAD' | 'GOOD' | 'SUPER' = 'BAD';
                if (rand > 0.95) type = 'SUPER';
                else if (rand > 0.7) type = 'GOOD';

                stateRef.current.obstacles.push({
                    id: nextObstacleId.current++,
                    x: assignedLane * LANE_WIDTH,
                    z: -100,
                    type,
                    hit: false
                });
            }
        }

        // Move & Check Collisions
        const playerX = stateRef.current.lane * LANE_WIDTH;

        stateRef.current.obstacles.forEach(obs => {
            obs.z += stateRef.current.speed * delta;

            // Collision Check (z around 0 is player position)
            if (!obs.hit && obs.z > -1 && obs.z < 1) {
                if (Math.abs(obs.x - playerX) < 1.0) {
                    obs.hit = true;
                    if (obs.type === 'BAD') {
                        stateRef.current.health -= 20;
                        stateRef.current.combo = 0;
                        stateRef.current.multiplier = 1;
                        stateRef.current.speed = Math.max(TUNNEL_SPEED, stateRef.current.speed - 5);
                        setCameraShake(0.5);
                        setTimeout(() => setCameraShake(0), 100);
                        audio.playError();
                    } else {
                        const points = obs.type === 'SUPER' ? 1000 : 200;
                        stateRef.current.combo += 1;
                        if (stateRef.current.combo % 10 === 0) {
                            stateRef.current.multiplier = Math.min(5, stateRef.current.multiplier + 1);
                        }
                        stateRef.current.score += points * stateRef.current.multiplier;
                        audio.playHover(); // Soft ping
                    }

                    // Update React UI (throttled/batched by React implicitly if done carefully, but we'll do it every frame for simplicity here as it's just numbers)
                    setScore(stateRef.current.score);
                    setHealth(stateRef.current.health);
                    setCombo(stateRef.current.combo);
                    setMultiplier(stateRef.current.multiplier);
                }
            }
        });

        // Cleanup passed obstacles
        stateRef.current.obstacles = stateRef.current.obstacles.filter(o => o.z < 5);

        // Score tick
        stateRef.current.score += Math.floor(stateRef.current.speed * delta);
        setScore(stateRef.current.score);

        requestRef.current = requestAnimationFrame(gameLoop);
    };

    useEffect(() => {
        return () => cancelAnimationFrame(requestRef.current);
    }, []);

    const move = (dir: -1 | 1) => {
        if (gameState !== 'PLAYING') return;
        setLane(l => Math.max(-1, Math.min(1, l + dir)));
        audio.playHover();
    };

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' || e.key === 'a') move(-1);
            if (e.key === 'ArrowRight' || e.key === 'd') move(1);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState]);

    // Scene Obstacles Renderer
    const RenderObstacles = () => {
        useFrame(() => {
            // Force re-render of this component is tricky without reactive state hooks, 
            // but we can mutate refs. For standard R3F, we map state to objects.
        });

        return (
            <group>
                {stateRef.current.obstacles.map(obs => {
                    if (obs.hit) return null; // Hide if hit

                    const isBad = obs.type === 'BAD';
                    const isSuper = obs.type === 'SUPER';

                    return (
                        <group key={obs.id} position={[obs.x, 0, obs.z]}>
                            {isBad ? (
                                <mesh rotation={[Math.PI / 4, 0, Math.PI / 4]}>
                                    <boxGeometry args={[1, 1, 1]} />
                                    <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1} wireframe />
                                </mesh>
                            ) : (
                                <mesh>
                                    <torusGeometry args={[0.5, 0.1, 16, 32]} />
                                    <meshStandardMaterial
                                        color={isSuper ? "#f59e0b" : "#10b981"}
                                        emissive={isSuper ? "#f59e0b" : "#10b981"}
                                        emissiveIntensity={2}
                                    />
                                    {isSuper && <pointLight color="#f59e0b" intensity={2} distance={5} />}
                                </mesh>
                            )}
                        </group>
                    );
                })}
            </group>
        );
    };

    return (
        <div className="h-full bg-slate-950 relative overflow-hidden font-mono select-none">
            <Scanlines />

            {/* --- 3D WEBGL PORTAL --- */}
            <div className={`absolute inset-0 z-0 transition-transform duration-75 ${cameraShake > 0 ? 'translate-x-2 translate-y-1' : ''}`}>
                <Canvas camera={{ position: [0, 2, 5], fov: 60 }}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[0, 5, 0]} intensity={2} color="#c026d3" />

                    <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={stateRef.current.speed / 10} />

                    <DataTunnel speed={stateRef.current.speed} />
                    <RenderObstacles />

                    <NeuralAvatar targetX={lane * LANE_WIDTH} isGameOver={health <= 0} />

                    <CyberpunkEffects
                        bloomIntensity={multiplier > 2 ? multiplier : 2}
                        glitchFactor={health < 30 ? 0.05 : cameraShake > 0 ? 0.1 : 0}
                        noiseOpacity={0.2}
                    />
                </Canvas>
            </div>

            {/* --- HUD --- */}
            <div className="absolute top-4 left-4 z-20 pointer-events-none">
                <div className="bg-black/80 px-4 py-2 rounded-lg border border-purple-500/50 backdrop-blur-md">
                    <div className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">{t('games.memorydive.score') || 'SCORE'}</div>
                    <div className="text-3xl font-black text-white drop-shadow-[0_0_10px_white]">{Math.floor(score).toLocaleString()}</div>
                    {multiplier > 1 && (
                        <div className="text-sm text-amber-400 font-black animate-pulse flex items-center">
                            <Zap size={12} className="mr-1" /> {multiplier}x MULTIPLIER
                        </div>
                    )}
                </div>
            </div>

            <div className="absolute top-4 right-4 z-20 w-48 bg-black/80 p-3 rounded-lg border border-slate-700 backdrop-blur-md pointer-events-none">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase mb-2 tracking-widest">
                    <span className="text-slate-400">Integrity</span>
                    <span className={health < 30 ? 'text-red-500 animate-pulse' : 'text-green-400'}>{health}%</span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                    <div className={`h-full transition-all duration-300 ${Math.floor(health) < 30 ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-green-500'}`} style={{ width: `${Math.max(0, health)}%` }}></div>
                </div>
                <div className="text-[10px] text-slate-500 mt-2 flex justify-between tracking-widest">
                    <span>Speed</span>
                    <span className="text-cyan-400">{Math.floor(stateRef.current.speed)} TB/s</span>
                </div>
            </div>

            {/* --- OVERLAYS --- */}
            {gameState === 'START' && (
                <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center animate-in zoom-in backdrop-blur-sm">
                    <div className="w-24 h-24 bg-purple-900/30 border border-purple-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(168,85,247,0.4)]">
                        <Brain size={48} className="text-purple-400" />
                    </div>
                    <h1 className="text-5xl font-black text-white mb-2 uppercase tracking-widest drop-shadow-[0_0_15px_purple]">
                        {t('games.memorydive.neural_dive') || "NEURAL DIVE"}
                    </h1>
                    <p className="text-purple-300 font-mono tracking-widest mb-8 text-center max-w-sm">
                        Navigate the latent space stream. Dodge red corruption blocks. Collect green data halos. Survive until 50,000 to extract.
                    </p>
                    <Button size="lg" variant="primary" onClick={startGame} className="bg-purple-600 hover:bg-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.5)] font-black tracking-widest px-12 py-6 text-xl">
                        {t('games.memorydive.jack_in') || "JACK IN"}
                    </Button>
                    <div className="mt-8 text-slate-500 font-bold uppercase tracking-widest text-[10px] flex items-center space-x-6">
                        <span className="flex items-center"><ArrowLeft size={16} className="mr-2" /> Left Lane (A)</span>
                        <span className="flex items-center">Right Lane (D) <ArrowRight size={16} className="ml-2" /></span>
                    </div>
                </div>
            )}

            {gameState === 'OVER' && (
                <div className="absolute inset-0 bg-red-950/90 z-50 flex flex-col items-center justify-center animate-in fade-in duration-500 p-8 text-center backdrop-blur-xl border-4 border-red-500">
                    <Scanlines />
                    <div className="w-32 h-32 bg-red-900/30 rounded-full flex items-center justify-center mb-8 border-2 border-red-500 animate-pulse shadow-[0_0_100px_rgba(239,68,68,0.5)]">
                        <Skull size={64} className="text-red-500" />
                    </div>
                    <h2 className="text-5xl md:text-7xl font-black text-red-500 mb-4 tracking-[0.3em] uppercase drop-shadow-[0_0_20px_red]">
                        {t('games.memorydive.crashed') || "FATAL CRASH"}
                    </h2>
                    <div className="text-white text-xl font-mono mb-12 border-b border-red-500/30 pb-4 inline-block tracking-widest">
                        Data Recovered: <span className="text-amber-400 font-bold">{Math.floor(score).toLocaleString()}</span>
                    </div>
                    <div className="flex space-x-4">
                        <Button variant="secondary" onClick={startGame} className="border-slate-700 text-slate-400 hover:text-white px-8">
                            <RefreshCw size={18} className="mr-2" /> REBOOT
                        </Button>
                        <Button variant="primary" onClick={() => onComplete(score > 20000 ? 50 : 20)} className="bg-red-600 border-none px-12 font-black tracking-widest shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                            {t('games.memorydive.eject') || "EMERGENCY EJECT"}
                        </Button>
                    </div>
                </div>
            )}

            {gameState === 'WIN' && (
                <div className="absolute inset-0 bg-green-950/90 z-50 flex flex-col items-center justify-center animate-in zoom-in duration-500 text-center p-8 backdrop-blur-xl border-4 border-green-500">
                    <Scanlines />
                    <div className="w-32 h-32 bg-green-900/30 rounded-full flex items-center justify-center mb-8 border-2 border-green-500 shadow-[0_0_100px_rgba(34,197,94,0.5)]">
                        <Brain size={64} className="text-green-400 drop-shadow-[0_0_15px_lime]" />
                    </div>
                    <h2 className="text-5xl md:text-7xl font-black text-green-400 mb-4 tracking-[0.3em] uppercase drop-shadow-[0_0_20px_lime]">
                        EXTRACTION SUCCESS
                    </h2>
                    <div className="text-white text-xl font-mono mb-12 border-b border-green-500/30 pb-4 inline-block tracking-widest">
                        Final Score: <span className="text-green-400 font-bold">{Math.floor(score).toLocaleString()}</span>
                    </div>
                    <Button variant="primary" onClick={() => onComplete(100)} className="bg-green-600 border-none px-16 py-6 text-xl text-black font-black tracking-widest shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:scale-105 transition-transform">
                        UPLOAD METRICS
                    </Button>
                </div>
            )}

            {/* TOUCH CONTROLS OVERLAY FOR MOBILE */}
            {gameState === 'PLAYING' && (
                <div className="absolute bottom-0 inset-x-0 h-1/2 flex z-40">
                    <div className="flex-1" onPointerDown={() => move(-1)}></div>
                    <div className="flex-1" onPointerDown={() => move(1)}></div>
                </div>
            )}
        </div>
    );
};
