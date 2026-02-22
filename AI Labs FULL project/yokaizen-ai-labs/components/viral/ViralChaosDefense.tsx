import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sparkles, Float, Sphere, Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, Target, Crosshair, BrainCircuit } from 'lucide-react';
import { useDialogue } from '../../contexts/DialogueContext';

interface GameProps {
    onComplete: () => void;
}

const SURVIVAL_TIME = 15;
const MAX_ENEMIES = 10;

function Core() {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * 0.5;
            meshRef.current.rotation.x += delta * 0.2;
        }
    });

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
            <mesh ref={meshRef}>
                <icosahedronGeometry args={[1.5, 2]} />
                <meshStandardMaterial
                    color="#00ffff"
                    emissive="#0088ff"
                    emissiveIntensity={2}
                    wireframe
                />
                <pointLight color="#00ffff" intensity={2} distance={10} />
            </mesh>
        </Float>
    );
}

const generateEnemyPosition = () => {
    const radius = 10 + Math.random() * 5;
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);
    return new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
    );
};

function Enemies({ onHitCore, onHitEnemy, isPlaying }: { onHitCore: () => void, onHitEnemy: () => void, isPlaying: boolean }) {
    const [enemies, setEnemies] = useState<{ id: number, pos: THREE.Vector3, alive: boolean }[]>([]);

    // Spawn mechanism
    useEffect(() => {
        if (!isPlaying) return;
        const interval = setInterval(() => {
            setEnemies(prev => {
                if (prev.filter(e => e.alive).length > MAX_ENEMIES) return prev;
                return [...prev, { id: Math.random(), pos: generateEnemyPosition(), alive: true }];
            });
        }, 800);
        return () => clearInterval(interval);
    }, [isPlaying]);

    const handleEnemyClick = (id: number) => {
        if (!isPlaying) return;
        setEnemies(prev => prev.map(e => e.id === id ? { ...e, alive: false } : e));
        onHitEnemy();
    };

    useFrame((state, delta) => {
        if (!isPlaying) return;
        setEnemies(prev => {
            let coreHit = false;
            const updated = prev.map(e => {
                if (!e.alive) return e;
                // Move towards center
                const dir = new THREE.Vector3(0, 0, 0).sub(e.pos).normalize();
                const speed = 3;
                const newPos = e.pos.clone().add(dir.multiplyScalar(speed * delta));

                if (newPos.length() < 1.6) {
                    coreHit = true;
                    return { ...e, alive: false }; // Dies on impact
                }
                return { ...e, pos: newPos };
            });

            if (coreHit) {
                onHitCore();
            }
            return updated;
        });
    });

    return (
        <group>
            {enemies.map(e => e.alive && (
                <mesh
                    key={e.id}
                    position={e.pos}
                    onClick={(ev) => { ev.stopPropagation(); handleEnemyClick(e.id); }}
                    onPointerOver={() => { document.body.style.cursor = 'crosshair'; }}
                    onPointerOut={() => { document.body.style.cursor = 'default'; }}
                >
                    <boxGeometry args={[0.5, 0.5, 0.5]} />
                    <meshStandardMaterial color="#ff0055" emissive="#ff0055" emissiveIntensity={1} />
                </mesh>
            ))}
        </group>
    );
}

export const ViralChaosDefense: React.FC<GameProps> = ({ onComplete }) => {
    const { queueDialogue } = useDialogue();
    const [gameState, setGameState] = useState<'playing' | 'crashed' | 'won'>('playing');
    const [timeLeft, setTimeLeft] = useState(SURVIVAL_TIME);
    const [score, setScore] = useState(0);

    useEffect(() => {
        queueDialogue([
            {
                id: 'cd-intro-1',
                character: 'BYTE',
                text: "Alert! Alert! Unidentified payload targeting the central AI core! Flesh-brain, we need you on manual defense!",
                isGlitchy: true
            },
            {
                id: 'cd-intro-2',
                character: 'ATHENA',
                text: `Click the incoming fragment-bots before they impact the core. You have ${SURVIVAL_TIME} seconds. Do not fail.`
            }
        ]);
    }, [queueDialogue]);

    useEffect(() => {
        if (gameState !== 'playing') return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setGameState('won');
                    clearInterval(timer);
                    queueDialogue([
                        {
                            id: 'cd-win-1',
                            character: 'SYNTAX',
                            text: `Score: ${score}. A statistical improbability. The biological actuator clicked with... precision.`
                        },
                        {
                            id: 'cd-win-2',
                            character: 'ATHENA',
                            text: "Adequate performance. Threat neutralized. You have proven your strategic capability. Claim your identity."
                        }
                    ]);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [gameState]);

    const handleCoreHit = () => {
        if (gameState === 'playing') {
            // Just visually deduct score or flash screen to keep it casual/viral
            setScore(s => Math.max(0, s - 50));
        }
    };

    const handleEnemyHit = () => {
        if (gameState === 'playing') {
            setScore(s => s + 100);
        }
    };

    return (
        <div className="w-screen h-screen bg-black overflow-hidden relative select-none">
            <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
                <color attach="background" args={['#050010']} />
                <ambientLight intensity={0.5} />

                <Core />
                <Enemies
                    isPlaying={gameState === 'playing'}
                    onHitCore={handleCoreHit}
                    onHitEnemy={handleEnemyHit}
                />

                <OrbitControls enableZoom={false} enablePan={false} autoRotate speed={0.5} />
                <Sparkles count={500} scale={20} size={2} color="#00ffff" opacity={0.3} speed={0.2} />
            </Canvas>

            {/* Massive Typography Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-5">
                <h1 className="text-[20vw] font-black text-white mix-blend-overlay tracking-tighter" style={{ transform: 'scaleY(1.8)' }}>
                    AI LABS
                </h1>
            </div>

            {/* UI Hud */}
            <div className="absolute top-0 left-0 w-full p-8 pointer-events-none z-10">
                <div className="flex justify-between items-start">
                    <div className="backdrop-blur-md bg-black/40 border border-cyan-500/30 p-4 rounded-xl">
                        <h2 className="text-cyan-400 font-bold tracking-widest text-sm flex items-center gap-2">
                            <Shield size={14} /> CORE DEFENSE
                        </h2>
                        <div className="text-4xl font-black text-white mt-1 tabular-nums">
                            00:{timeLeft.toString().padStart(2, '0')}
                        </div>
                        <p className="text-gray-400 text-xs mt-1">Protect the AI Core from fragmentation.</p>
                    </div>

                    <div className="text-right backdrop-blur-md bg-purple-900/30 border border-purple-500/30 p-4 rounded-xl">
                        <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                            <Target size={14} /> SCORE
                        </div>
                        <div className="text-3xl font-black text-white mt-1 tabular-nums">{score}</div>
                    </div>
                </div>
            </div>

            {/* Crosshair target overlay hint */}
            {gameState === 'playing' && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none z-10">
                    <div className="px-6 py-2 bg-black/50 border border-white/20 rounded-full flex items-center gap-2 text-white/50 text-sm font-mono backdrop-blur">
                        <Crosshair size={16} /> CLICK RED THREATS
                    </div>
                </div>
            )}

            {/* Win Modal */}
            <AnimatePresence>
                {gameState === 'won' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl"
                    >
                        <div className="max-w-md w-full p-8 border border-cyan-500/50 bg-black/80 rounded-2xl text-center shadow-[0_0_50px_rgba(0,255,255,0.1)] relative overflow-hidden">
                            <div className="w-20 h-20 mx-auto bg-cyan-500/20 rounded-full flex items-center justify-center mb-6 border border-cyan-400/30">
                                <BrainCircuit className="text-cyan-400 w-10 h-10" />
                            </div>

                            <h2 className="text-4xl font-black text-white mb-2 tracking-tight">CORE <span className="text-cyan-400">SECURED</span></h2>
                            <div className="text-2xl font-mono text-white mb-4">FINAL SCORE: {score}</div>
                            <p className="text-gray-300 mb-8 pt-4 border-t border-white/10">
                                Threat neutralized. You have proven your strategic capability. Claim your identity within the AI Labs collective.
                            </p>

                            <button
                                onClick={onComplete}
                                className="w-full py-4 px-6 bg-cyan-500 text-black font-black uppercase tracking-widest rounded transition-all hover:bg-cyan-400 hover:scale-[1.02] flex items-center justify-center gap-2"
                            >
                                <Zap size={20} className="fill-black" /> Enter AI Labs
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
