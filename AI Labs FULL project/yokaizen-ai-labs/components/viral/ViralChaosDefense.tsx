import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sparkles, Float, Sphere, Instances, Instance, Text } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette, Glitch } from '@react-three/postprocessing';
import { BlendFunction, GlitchMode } from 'postprocessing';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, Target, Crosshair, BrainCircuit, Flame, Twitter, MessageCircle } from 'lucide-react';
import { useDialogue } from '../../contexts/DialogueContext';
import { audio } from '../../services/audioService';

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

                // Base speed is 4, increases over time basically (handled by spawn interval)
                const speed = 4 + (Math.random() * 3);
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
                    <tetrahedronGeometry args={[0.8]} />
                    <meshStandardMaterial color="#ff0055" emissive="#ff0055" emissiveIntensity={3} roughness={0.2} metalness={0.8} />
                    <pointLight distance={4} intensity={2} color="#ff0055" />
                </mesh>
            ))}
        </group>
    );
}

function CameraRig({ isShaking }: { isShaking: boolean }) {
    useFrame((state) => {
        if (isShaking) {
            state.camera.position.x = (Math.random() - 0.5) * 0.5;
            state.camera.position.y = (Math.random() - 0.5) * 0.5;
        } else {
            state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, 0, 0.1);
            state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 0, 0.1);
        }
    });
    return null;
}

export const ViralChaosDefense: React.FC<GameProps> = ({ onComplete }) => {
    const { queueDialogue } = useDialogue();
    const [gameState, setGameState] = useState<'intro' | 'playing' | 'crashed' | 'won'>('intro');
    const [timeLeft, setTimeLeft] = useState(SURVIVAL_TIME);
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(1);
    const [isShaking, setIsShaking] = useState(false);
    const [isGlitching, setIsGlitching] = useState(false);

    useEffect(() => {
        if (gameState === 'playing') {
            audio.playEngine(SURVIVAL_TIME * 1000);
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
        }
    }, [gameState, queueDialogue]);

    useEffect(() => {
        if (gameState !== 'playing') return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setGameState('won');
                    clearInterval(timer);
                    audio.playSuccess();
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
    }, [gameState, score, queueDialogue]);

    const handleCoreHit = () => {
        if (gameState === 'playing') {
            audio.playError();
            setIsShaking(true);
            setIsGlitching(true);
            setTimeout(() => { setIsShaking(false); setIsGlitching(false); }, 300);
            setScore(s => Math.max(0, s - 50));
            setCombo(1); // Break combo
        }
    };

    const handleEnemyHit = () => {
        if (gameState === 'playing') {
            audio.playClick();
            setCombo(c => Math.min(c + 1, 10)); // Max combo x10
            setScore(s => s + (100 * combo));

            // Mini shake for game feel
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 50);
        }
    };

    return (
        <div className="w-screen h-screen bg-black overflow-hidden relative select-none">
            <Canvas camera={{ position: [0, 0, 15], fov: 60 }} gl={{ antialias: false, powerPreference: "high-performance" }}>
                <color attach="background" args={['#020005']} />
                <fog attach="fog" args={['#020005', 10, 30]} />
                <ambientLight intensity={0.5} />

                <CameraRig isShaking={isShaking} />
                <Core />
                <Enemies
                    isPlaying={gameState === 'playing'}
                    onHitCore={handleCoreHit}
                    onHitEnemy={handleEnemyHit}
                />

                <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.8} />
                <Sparkles count={500} scale={25} size={3} color="#00ffff" opacity={0.4} speed={0.3} />

                <EffectComposer disableNormalPass>
                    <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5 + (combo * 0.1)} />
                    <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.003 * combo, 0.003 * combo)} />
                    <Noise opacity={0.05} />
                    <Vignette eskil={false} offset={0.1} darkness={1.1} />
                    {isGlitching && (
                        <Glitch
                            delay={new THREE.Vector2(0, 0)}
                            blendFunction={BlendFunction.NORMAL}
                            offset={new THREE.Vector2(0.005, 0)}
                            radialModulation={false}
                            modulationOffset={0}
                            mode={GlitchMode.SPORADIC}
                            active
                        />
                    )}
                </EffectComposer>
            </Canvas>

            {/* Massive Typography Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-5">
                <h1 className="text-[20vw] font-black text-white mix-blend-overlay tracking-tighter" style={{ transform: 'scaleY(1.8)' }}>
                    AI LABS
                </h1>
            </div>

            {/* UI Hud */}
            <div className="absolute top-0 left-0 w-full p-4 md:p-8 pointer-events-none z-10">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 md:gap-0 mt-[10vh] md:mt-0">
                    <div className="backdrop-blur-md bg-black/40 border border-cyan-500/30 p-4 rounded-xl">
                        <h2 className="text-cyan-400 font-bold tracking-widest text-sm flex items-center gap-2">
                            <Shield size={14} /> CORE DEFENSE
                        </h2>
                        <div className="text-4xl font-black text-white mt-1 tabular-nums">
                            00:{timeLeft.toString().padStart(2, '0')}
                        </div>
                        <p className="text-gray-400 text-xs mt-1">Protect the AI Core from fragmentation.</p>
                    </div>

                    <div className="text-left md:text-right flex flex-col items-start md:items-end w-full md:w-auto gap-2">
                        <div className="backdrop-blur-md bg-purple-900/30 border border-purple-500/30 p-4 rounded-xl w-full md:w-auto">
                            <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                                <Target size={14} /> SCORE
                            </div>
                            <div className="text-3xl font-black text-white mt-1 tabular-nums">{score}</div>
                        </div>

                        {combo > 1 && (
                            <AnimatePresence>
                                <motion.div
                                    initial={{ scale: 0, opacity: 0, x: 50 }}
                                    animate={{ scale: 1, opacity: 1, x: 0 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    className="backdrop-blur-md bg-orange-900/40 border border-orange-500/50 p-3 rounded-xl flex items-center gap-2"
                                >
                                    <Flame className="text-orange-500 animate-pulse" size={20} />
                                    <span className="text-orange-400 font-black text-xl italic">{combo}x COMBO</span>
                                </motion.div>
                            </AnimatePresence>
                        )}
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

            {/* Modals */}
            <AnimatePresence>
                {/* Intro Modal */}
                {gameState === 'intro' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto"
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="max-w-md w-full h-fit my-auto border border-cyan-500/30 bg-black/80 p-6 md:p-8 rounded-2xl text-left relative shadow-[0_0_50px_rgba(6,182,212,0.15)] pointer-events-auto"
                        >
                            <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center justify-center mb-6">
                                <Shield className="text-cyan-400 w-8 h-8" />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black text-white mb-4 tracking-tight">WELCOME TO <span className="text-cyan-400">AI LABS</span></h2>

                            <div className="space-y-4 text-sm text-gray-300 leading-relaxed mb-8">
                                <p>
                                    The AGI transition is accelerating. By 2027, over 68% of current cognitive tasks will be fully automated. The previous generation's skills are already obsolete.
                                </p>
                                <p>
                                    <strong className="text-white">Yokaizen AI Labs</strong> is a gamified training facility designed to forge your cognitive resilience. Here, you don't just use AI—you command autonomous swarms, master prompt engineering, and defend against deepfakes.
                                </p>
                                <p>
                                    Our mission is to evolve you from a mere "Doer" to an <strong className="text-cyan-400">Orchestrator</strong> of intelligences.
                                </p>
                                <div className="bg-cyan-900/20 border border-cyan-500/30 p-4 rounded-lg flex gap-3 items-start mt-4">
                                    <Target className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
                                    <p className="text-xs text-cyan-100">
                                        Before you enter the Campus Core, we must test your cognitive processing speed. Defend the AI Core against incoming fragmentation bots.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setGameState('playing')}
                                className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest rounded transition-all hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] flex items-center justify-center gap-2 group"
                            >
                                <Shield size={20} className="group-hover:animate-pulse" /> Initialize Defense
                            </button>
                        </motion.div>
                    </motion.div>
                )}

                {/* Win Modal */}
                {gameState === 'won' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl overflow-y-auto"
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="max-w-[90vw] md:max-w-md w-full h-fit my-auto p-6 md:p-8 border border-cyan-500/50 bg-black/80 rounded-2xl text-center shadow-[0_0_50px_rgba(0,255,255,0.1)] relative pointer-events-auto"
                        >
                            <div className="w-16 h-16 md:w-20 md:h-20 mx-auto bg-cyan-500/20 rounded-full flex items-center justify-center mb-4 md:mb-6 border border-cyan-400/30">
                                <BrainCircuit className="text-cyan-400 w-8 h-8 md:w-10 md:h-10" />
                            </div>

                            <h2 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">CORE <span className="text-cyan-400">SECURED</span></h2>
                            <div className="text-xl md:text-2xl font-mono text-white mb-4">FINAL SCORE: {score}</div>
                            <p className="text-sm md:text-base text-gray-300 mb-4 pt-4 border-t border-white/10">
                                Threat neutralized. Your Defense Rating: <span className="text-cyan-400 font-black">{score >= 100 ? 'LEGENDARY' : score >= 50 ? 'ELITE' : 'OPERATOR'}</span>
                            </p>

                            <div className="bg-cyan-950/30 border border-cyan-500/20 rounded-xl p-4 mb-6 text-left relative overflow-hidden z-10">
                                <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
                                <h3 className="text-cyan-400 font-bold mb-1 text-sm flex items-center gap-2"><TriangleAlert size={14} /> REALITY CHECK</h3>
                                <p className="text-xs md:text-sm text-gray-300 leading-relaxed">
                                    The AGI transition has begun. By 2027, over 68% of current cognitive tasks will be fully automated. The previous generation's skills are already obsolete. <span className="text-white font-bold">Yokaizen AI Labs is not just a game.</span> It is the premier training ground for the next generation to master human-AI collaboration, prompt engineering, and cognitive survivability. Adapt now, or be replaced.
                                </p>
                            </div>

                            {/* VIRAL SHARE BUTTONS */}
                            <div className="flex flex-col sm:flex-row gap-2 mb-6">
                                <button
                                    onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🛡️ The AGI transition is happening NOW. I scored ${score} defending the AI Core (${score >= 100 ? 'LEGENDARY' : score >= 50 ? 'ELITE' : 'OPERATOR'}). Are you learning real skills or falling behind? Test yourself:`)}&url=${encodeURIComponent('https://ai.yokaizencampus.com/play/chaos-defense')}`, '_blank')}
                                    className="flex-1 py-2.5 bg-[#1DA1F2] text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 hover:brightness-110 transition-all"
                                >
                                    <Twitter size={14} /> Share on X
                                </button>
                                <button
                                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`🛡️ AI jobs pay $300k+. Are you prepared? I just hit ${score >= 100 ? 'LEGENDARY' : score >= 50 ? 'ELITE' : 'OPERATOR'} status in cognitive defense. Try the free test: https://ai.yokaizencampus.com/play/chaos-defense`)}`, '_blank')}
                                    className="flex-1 py-2.5 bg-[#25D366] text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 hover:brightness-110 transition-all"
                                >
                                    <MessageCircle size={14} /> WhatsApp
                                </button>
                            </div>

                            <button
                                onClick={onComplete}
                                className="w-full py-4 px-6 bg-cyan-500 text-black font-black uppercase tracking-widest rounded transition-all hover:bg-cyan-400 hover:scale-[1.02] flex items-center justify-center gap-2"
                            >
                                <Zap size={20} className="fill-black" /> Enter AI Labs
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
