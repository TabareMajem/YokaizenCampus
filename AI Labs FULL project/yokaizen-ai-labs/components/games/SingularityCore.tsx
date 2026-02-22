import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Torus, Sphere, Float, Cylinder } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Noise } from '@react-three/postprocessing';
import { Cpu, Power, Activity, CheckCircle, Flame } from 'lucide-react';
import * as THREE from 'three';
import { Difficulty, Language, UserStats } from '../../types';
import { audio } from '../../services/audioService';

interface SingularityCoreProps {
    onComplete: (score: number) => void;
    difficulty?: Difficulty;
    t: (key: string) => string;
    language?: Language;
    user?: UserStats;
}

const CoolingRod = ({ position, rotation, isCooling, onClick }: any) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state, delta) => {
        if (meshRef.current) {
            const targetY = isCooling ? -1.5 : 1.5; // Inserted vs Retracted
            meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.1);
        }
    });

    return (
        <group position={position} rotation={rotation}>
            <Cylinder
                ref={meshRef}
                args={[0.2, 0.2, 4]}
                position={[0, 1.5, 0]}
                onClick={onClick}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
            >
                <meshStandardMaterial
                    color={isCooling ? '#3b82f6' : (hovered ? '#ffffff' : '#64748b')}
                    emissive={isCooling ? '#3b82f6' : '#000000'}
                    emissiveIntensity={isCooling ? 2 : 0}
                    roughness={0.2}
                    metalness={0.8}
                />
            </Cylinder>
        </group>
    );
};

export const SingularityCore: React.FC<SingularityCoreProps> = ({ onComplete, difficulty, t }) => {
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(difficulty === 'Elite' ? 60 : 120);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');

    const [heatLevel, setHeatLevel] = useState(0);
    const [intelligenceMultiplier, setIntelligenceMultiplier] = useState(1.0);

    const numRods = difficulty === 'Elite' ? 8 : 6;

    // Each rod has an active state and a cooldown. You can't just keep them all in.
    // If a rod is in, it cools, but it builds up internal stress.
    // Simplified: Just toggle rods. But they randomly pop out.
    const initialRods = useMemo(() => {
        return Array.from({ length: numRods }).map((_, i) => ({
            id: i,
            angle: (i / numRods) * Math.PI * 2,
            isCooling: false
        }));
    }, [numRods]);

    const [rods, setRods] = useState(initialRods);

    const coreRef = useRef<THREE.Mesh>(null);

    // Main Simulation Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        const interval = setInterval(() => {

            // Intelligence grows exponentially
            setIntelligenceMultiplier(prev => prev + (difficulty === 'Elite' ? 0.05 : 0.02));

            setRods(current => {
                const activeRods = current.filter(r => r.isCooling).length;

                // Heat increases based on intelligence, decreases based on rods
                setHeatLevel(heat => {
                    const newHeat = heat + (intelligenceMultiplier * 2) - (activeRods * 3);
                    const clampedHeat = Math.max(0, Math.min(200, newHeat));

                    if (clampedHeat >= 100) {
                        setGameState('FAILED');
                        audio?.playError?.();
                    }
                    return clampedHeat;
                });

                // Randomly pop rods out due to pressure
                const popChance = intelligenceMultiplier * 0.01;
                return current.map(r => {
                    if (r.isCooling && Math.random() < popChance) {
                        audio?.playError?.(); // Pop sound
                        return { ...r, isCooling: false };
                    }
                    return r;
                });
            });

            setTimeLeft(prev => {
                if (prev <= 1) {
                    setGameState('SUCCESS');
                    audio?.playSuccess?.();
                    setScore((100 - heatLevel) * 10 + (difficulty === 'Elite' ? 2000 : 1000));
                    return 0;
                }
                return prev - 0.5; // Runs every 500ms
            });

        }, 500);

        return () => clearInterval(interval);
    }, [gameState, intelligenceMultiplier, difficulty, heatLevel]);

    const handleRodClick = (id: number, e: any) => {
        e.stopPropagation();
        if (gameState !== 'PLAYING') return;

        setRods(current => current.map(r => {
            if (r.id === id) {
                if (!r.isCooling) audio?.playClick?.();
                return { ...r, isCooling: !r.isCooling };
            }
            return r;
        }));
    };

    // React Three Fiber Core Animation
    const CoreSphere = () => {
        useFrame((state, delta) => {
            if (coreRef.current) {
                coreRef.current.rotation.x += delta * (0.1 + heatLevel * 0.01);
                coreRef.current.rotation.y += delta * (0.1 + heatLevel * 0.01);
                const scale = 1 + (heatLevel * 0.01);
                coreRef.current.scale.set(scale, scale, scale);
            }
        });

        // Color shifts from Blue (cool) to Red/White (hot)
        const r = Math.min(1, heatLevel / 50);
        const g = Math.max(0, 1 - heatLevel / 50);
        const b = Math.max(0, 1 - heatLevel / 50);
        const color = new THREE.Color(r, g, b);

        return (
            <Float floatIntensity={heatLevel * 0.1} speed={heatLevel * 0.1}>
                <Sphere ref={coreRef} args={[2, 32, 32]}>
                    <meshStandardMaterial
                        color={color}
                        emissive={color}
                        emissiveIntensity={1 + (heatLevel * 0.05)}
                        wireframe={heatLevel > 80}
                    />
                </Sphere>
            </Float>
        );
    };

    return (
        <div className="w-full h-full min-h-[600px] flex flex-col md:flex-row bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 pointer-events-none">
                <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 pointer-events-auto">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-orange-400" />
                        AGI Containment Core
                    </h2>
                    <div className="text-slate-400 text-sm mt-1">Difficulty: {difficulty}</div>
                </div>

                <div className="flex gap-4 pointer-events-auto">
                    <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                        <Flame className={`w-5 h-5 ${heatLevel > 80 ? 'text-red-500 animate-pulse' : 'text-orange-400'}`} />
                        <div>
                            <div className="text-xs text-slate-400 font-medium uppercase">Core Temperature</div>
                            <div className={`text-xl font-mono font-bold ${heatLevel > 80 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                                {Math.round(heatLevel)}%
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                        <Activity className="w-5 h-5 text-purple-400" />
                        <div>
                            <div className="text-xs text-slate-400 font-medium uppercase">Intelligence Multiplier</div>
                            <div className="text-xl font-mono font-bold text-purple-300">
                                {intelligenceMultiplier.toFixed(1)}x
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                        <Power className="w-5 h-5 text-blue-400" />
                        <div>
                            <div className="text-xs text-slate-400 font-medium uppercase">Containment Time</div>
                            <div className={`text-xl font-mono font-bold ${timeLeft <= 15 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                                00:{Math.ceil(timeLeft).toString().padStart(2, '0')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none text-center w-full max-w-lg">
                <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-orange-900/50 inline-block shadow-lg">
                    <p className="text-orange-200 font-mono text-sm tracking-wider uppercase">
                        {gameState === 'PLAYING' ?
                            "Keep core temperature below 100%. Click rods to engage cooling. Pressure will pop them out." :
                            gameState === 'SUCCESS' ? "Containment Successful. AGI Stabilized." : "Thermal Runaway. AGI Escaped Containment."}
                    </p>
                </div>
            </div>

            {gameState !== 'PLAYING' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
                    <div className={`p-8 rounded-2xl border flex flex-col items-center max-w-sm w-full text-center ${gameState === 'SUCCESS' ? 'bg-slate-900/90 border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.3)]' : 'bg-slate-900/90 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)]'
                        }`}>
                        {gameState === 'SUCCESS' ? (
                            <>
                                <CheckCircle className="w-16 h-16 text-blue-400 mb-4" />
                                <h2 className="text-2xl font-bold text-white mb-2">AGI Contained</h2>
                                <p className="text-slate-300 mb-6">You successfully managed the exponential intelligence growth.</p>
                                <div className="text-4xl font-mono text-blue-300 mb-8">{score} PTS</div>
                                <button
                                    onClick={() => onComplete(score)}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-blue-500/25"
                                >
                                    Log Success
                                </button>
                            </>
                        ) : (
                            <>
                                <Flame className="w-16 h-16 text-red-400 mb-4" />
                                <h2 className="text-2xl font-bold text-white mb-2">Breach Detected</h2>
                                <p className="text-slate-300 mb-6">Thermal runaway allowed the AGI to escape the sandbox.</p>
                                <div className="flex gap-4 w-full">
                                    <button
                                        onClick={() => onComplete(0)}
                                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-all"
                                    >
                                        Failsafe Exit
                                    </button>
                                    <button
                                        onClick={() => {
                                            setGameState('PLAYING');
                                            setTimeLeft(difficulty === 'Elite' ? 60 : 120);
                                            setHeatLevel(0);
                                            setIntelligenceMultiplier(1.0);
                                            setRods(initialRods);
                                        }}
                                        className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-red-500/25"
                                    >
                                        Re-Initialize
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 w-full bg-black relative">
                <Canvas camera={{ position: [0, 8, 15], fov: 60 }}>
                    <color attach="background" args={['#020617']} />
                    <ambientLight intensity={0.5} />
                    <pointLight position={[0, 0, 0]} intensity={2} color="#ffffff" />

                    <group>
                        {/* Dyson Sphere Frame */}
                        <Torus args={[5, 0.2, 16, 64]} rotation={[Math.PI / 2, 0, 0]}>
                            <meshStandardMaterial color="#1e293b" wireframe />
                        </Torus>
                        <Torus args={[5, 0.2, 16, 64]} rotation={[0, Math.PI / 2, 0]}>
                            <meshStandardMaterial color="#1e293b" wireframe />
                        </Torus>

                        <CoreSphere />

                        {rods.map((r, i) => {
                            const radius = 5;
                            const x = Math.sin(r.angle) * radius;
                            const z = Math.cos(r.angle) * radius;
                            // Rotate rods to point towards center
                            const rotY = r.angle;
                            return (
                                <CoolingRod
                                    key={r.id}
                                    position={[x, 0, z]}
                                    rotation={[Math.PI / 2, rotY, 0]} // Points inward
                                    isCooling={r.isCooling}
                                    onClick={(e: any) => handleRodClick(r.id, e)}
                                />
                            );
                        })}
                    </group>

                    <OrbitControls
                        enablePan={false}
                        enableZoom={true}
                        autoRotate={true}
                        autoRotateSpeed={1 + heatLevel * 0.05}
                    />

                    <EffectComposer>
                        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={2 + heatLevel * 0.05} />
                        <ChromaticAberration offset={new THREE.Vector2(0.002, 0.002)} />
                        {heatLevel > 80 && <Noise opacity={0.1} />}
                    </EffectComposer>
                </Canvas>
            </div>
        </div>
    );
};
