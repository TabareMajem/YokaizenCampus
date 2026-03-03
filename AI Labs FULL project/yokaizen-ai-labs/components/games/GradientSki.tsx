import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, MeshDistortMaterial, Float, Sparkles, Instances, Instance, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch, Vignette, Scanline } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Activity, Shield, Cpu, AlertTriangle, Zap, Terminal, FastForward, Target } from 'lucide-react';
import { audio } from '../../services/audioService';
import { motion, AnimatePresence } from 'framer-motion';
import { useDialogue } from '../../contexts/DialogueContext';
import { createNoise2D } from 'simplex-noise';

export interface GradientSkiProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

// --- AAA Visuals ---

// Generates a flowing loss landscape (Gradient Descent)
const LossLandscape = ({ speed }: { speed: number }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const noise2D = useMemo(() => createNoise2D(), []);

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        const geo = meshRef.current.geometry as THREE.PlaneGeometry;
        const pos = geo.attributes.position;

        const time = state.clock.elapsedTime * speed;

        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i);
            // Scrolling noise
            const z = noise2D(x * 0.1, y * 0.1 + time) * 4;
            pos.setZ(i, z);
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();
    });

    return (
        <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
            <planeGeometry args={[100, 100, 60, 60]} />
            <meshStandardMaterial
                color="#4f46e5"
                emissive="#1e1b4b"
                emissiveIntensity={0.5}
                wireframe
                roughness={0.2}
                metalness={0.8}
            />
        </mesh>
    );
};

// Data particles rushing past
const SpeedParticles = ({ speed }: { speed: number }) => {
    const count = 1000;
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const particles = useMemo(() => {
        return new Array(count).fill(0).map(() => ({
            pos: new THREE.Vector3((Math.random() - 0.5) * 50, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 100),
            speed: Math.random() * 2 + 1
        }));
    }, [count]);

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        particles.forEach((p, i) => {
            p.pos.z += speed * p.speed * delta * 20;
            if (p.pos.z > 10) p.pos.z = -100;

            dummy.position.copy(p.pos);
            // Stretch based on speed
            dummy.scale.set(0.1, 0.1, speed * 2 + 0.5);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#a78bfa" transparent opacity={0.6} blending={THREE.AdditiveBlending} />
        </instancedMesh>
    );
};

// Player's Avatar / Core that reacts to optimization
const PlayerCore = ({ speed, combo }: { speed: number, combo: number }) => {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.elapsedTime * (1 + speed);
            meshRef.current.rotation.z = state.clock.elapsedTime * (0.5 + speed * 0.5);

            // Bobbing motion
            meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 4) * 0.5;

            // Squash and stretch based on speed
            const stretch = 1 + speed * 0.2;
            const squash = 1 - Math.min(speed * 0.1, 0.5);
            meshRef.current.scale.set(squash, squash, stretch);
        }
    });

    return (
        <Float speed={5} rotationIntensity={0} floatIntensity={2}>
            <mesh ref={meshRef} position={[0, -2, -5]}>
                <octahedronGeometry args={[1, 1]} />
                <MeshDistortMaterial
                    color="#8b5cf6"
                    emissive="#6d28d9"
                    emissiveIntensity={2 + combo * 0.1}
                    clearcoat={1}
                    metalness={1}
                    roughness={0}
                    distort={0.2 + speed * 0.1}
                    speed={5 + speed * 5}
                    wireframe={speed > 3}
                />
                <pointLight distance={10 + speed * 2} intensity={2 + speed} color="#c4b5fd" />
            </mesh>
        </Float>
    );
};

// Camera dynamics
const ActionCamera = ({ speed, shake }: { speed: number, shake: number }) => {
    useFrame((state) => {
        // FOV increases with speed for hyperspace effect
        const targetFov = 60 + Math.min(speed * 8, 40);
        //@ts-ignore
        if (Math.abs(state.camera.fov - targetFov) > 0.1) {
            //@ts-ignore
            state.camera.fov = THREE.MathUtils.lerp(state.camera.fov, targetFov, 0.05);
            state.camera.updateProjectionMatrix();
        }

        // Shake
        const sx = shake > 0 ? (Math.random() - 0.5) * shake : 0;
        const sy = shake > 0 ? (Math.random() - 0.5) * shake : 0;

        state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, sx, 0.1);
        state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, sy, 0.1);
    });
    return null;
};

// --- Main Game Logic ---
export const GradientSki: React.FC<GradientSkiProps> = ({ onComplete, difficulty, t }) => {
    const { queueDialogue } = useDialogue();
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');

    // Physics / Mechanics State
    const [speed, setSpeed] = useState(0); // 0 to ~5
    const [clicks, setClicks] = useState<number[]>([]); // Track click timestamps for CPS
    const [cps, setCps] = useState(0);
    const [combo, setCombo] = useState(0);
    const [multiplier, setMultiplier] = useState(1);
    const [maxSpeed, setMaxSpeed] = useState(0);

    // Multi-Agent Flow Logic State
    const [advisorMsg, setAdvisorMsg] = useState(t('game.advisor.analyzing') || 'Analyzing optimal descent vector...');
    const [adversaryMsg, setAdversaryMsg] = useState(t('game.adversary.vulnerable') || 'Gradient decay inevitable.');
    const [glitchActive, setGlitchActive] = useState(false);
    const [cameraShake, setCameraShake] = useState(0);

    // Initial Narrative
    useEffect(() => {
        queueDialogue([
            { id: `gs-1`, character: 'ATHENA', text: t('game.advisor.gradient_init') || 'Initiating Gradient Descent. Optimize the weights rapidly!' },
            { id: `gs-2`, character: 'BYTE', text: t('game.adversary.loss_trap') || 'Watch out for local minima. You might get stuck.', isGlitchy: true },
        ]);
    }, [queueDialogue, t]);

    // Multi-Agent Simulation Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const advisorLines = [
            'Maintain momentum. Loss is decreasing.',
            'Optimization detected. Keep pushing.',
            'Adversary is inserting noise. Ignore it.',
            'Global minimum approaching. Accelerate!'
        ];
        const adversaryLines = [
            'Your learning rate is pathetic.',
            'I am shifting the topological landscape.',
            'You are approaching a saddle point.',
            'Compute limits exceeded. Give up.'
        ];
        const agentInterval = setInterval(() => {
            const isAdversary = Math.random() > 0.6;
            if (isAdversary) {
                setAdversaryMsg(adversaryLines[Math.floor(Math.random() * adversaryLines.length)]);
                audio.playSystemMessage?.({ type: 'warning' });
                // Adversary attack drops speed slightly
                setSpeed(s => Math.max(0, s - 0.5));
                setCombo(0);
                setMultiplier(1);
                setGlitchActive(true);
                setCameraShake(1);
                setTimeout(() => { setGlitchActive(false); setCameraShake(0); }, 500);
            } else {
                setAdvisorMsg(advisorLines[Math.floor(Math.random() * advisorLines.length)]);
                audio.playSystemMessage?.({ type: 'success' });
            }
        }, 6000);
        return () => clearInterval(agentInterval);
    }, [gameState]);

    // Game Loop: Calculate CPS, Update Speed & Score
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        let lastTime = performance.now();
        let frameReq: number;

        const loop = (time: number) => {
            const dt = (time - lastTime) / 1000;
            lastTime = time;

            // Calculate CPS
            const now = Date.now();
            setClicks(prev => {
                const recent = prev.filter(t => now - t < 1000);
                setCps(recent.length);
                return recent;
            });

            // Update Speed based on CPS
            setSpeed(prev => {
                const targetSpeed = Math.min(cps * 0.4, 6); // Max speed ~6
                const newSpeed = THREE.MathUtils.lerp(prev, targetSpeed, dt * 2);
                setMaxSpeed(ms => Math.max(ms, newSpeed));
                return newSpeed;
            });

            // Update Score based on Speed * Multiplier
            setScore(prev => {
                const added = speed * 10 * multiplier * dt;
                return prev + added;
            });

            // Update Combo & Multiplier
            if (cps > 5) {
                setCombo(c => Math.min(100, c + dt * 10));
            } else {
                setCombo(c => Math.max(0, c - dt * 20));
            }

            setMultiplier(1 + Math.floor(combo / 20) * 0.5);

            frameReq = requestAnimationFrame(loop);
        };

        frameReq = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameReq);
    }, [gameState, cps, speed, multiplier, combo]);

    // Timer Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    const finalScore = Math.floor(score);
                    const reqScore = difficulty === 'Elite' ? 3000 : difficulty === 'Hard' ? 2000 : 1000;
                    const success = finalScore >= reqScore;

                    setGameState(success ? 'SUCCESS' : 'FAILED');

                    if (success) {
                        audio.playSuccess();
                        queueDialogue([
                            { id: `gs-win-1`, character: 'SYNTAX', text: `Global minimum reached. Final speed: ${(maxSpeed * 10).toFixed(1)} GHz.` },
                        ]);
                    } else {
                        audio.playError();
                        queueDialogue([
                            { id: `gs-fail-1`, character: 'BYTE', text: `Stuck in a local minimum. Divergence detected.`, isGlitchy: true },
                        ]);
                    }

                    onComplete(success ? 100 : 0, { completionTime: 60, score: finalScore, maxSpeed: (maxSpeed * 10).toFixed(1), difficulty });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, score, maxSpeed, difficulty, onComplete, t, queueDialogue]);

    // Handle Click / Tap
    const handleInteract = useCallback(() => {
        if (gameState !== 'PLAYING') return;
        audio.playClick?.();
        setClicks(prev => [...prev, Date.now()]);
    }, [gameState]);

    // Keyboard support
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                handleInteract();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [handleInteract]);

    const reqScore = difficulty === 'Elite' ? 3000 : difficulty === 'Hard' ? 2000 : 1000;
    const progress = Math.min(100, (score / reqScore) * 100);

    return (
        <div className="relative w-full h-[600px] rounded-xl overflow-hidden border border-white/10 bg-black shadow-2xl select-none"
            onPointerDown={handleInteract}>

            {/* Scanlines Overlay */}
            <div className="absolute inset-0 bg-[url('/assets/aaa/scanlines.png')] opacity-20 pointer-events-none z-20 mix-blend-overlay"></div>

            {/* Interaction Layer Hint */}
            {gameState === 'PLAYING' && speed < 1 && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
                >
                    <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-violet-500/50 flex items-center gap-3 animate-pulse">
                        <Target className="text-violet-400" />
                        <span className="text-violet-100 font-bold tracking-widest uppercase">Tap rapidly to accelerate</span>
                    </div>
                </motion.div>
            )}

            {/* UI Overlay */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-40 pointer-events-none">
                <div className="flex flex-col gap-3">
                    {/* Score / Convergence */}
                    <div className="bg-black/80 backdrop-blur-xl rounded-xl p-4 border border-violet-500/40 shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                        <div className="flex items-center gap-2 text-violet-400 mb-1">
                            <Activity className="w-4 h-4 animate-pulse" />
                            <span className="text-xs uppercase tracking-[0.3em] font-black">Convergence</span>
                        </div>
                        <div className="text-4xl font-black text-white drop-shadow-lg tracking-tighter tabular-nums">
                            {Math.floor(score).toLocaleString()} <span className="text-sm text-violet-500">/ {reqScore.toLocaleString()}</span>
                        </div>
                        <div className="w-full h-1 mt-2 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-violet-500 shadow-[0_0_10px_#8b5cf6]" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>

                    {/* Multiplier */}
                    <AnimatePresence>
                        {multiplier > 1 && (
                            <motion.div
                                initial={{ scale: 0, x: -20 }}
                                animate={{ scale: 1, x: 0 }}
                                exit={{ scale: 0, opacity: 0 }}
                                className="bg-gradient-to-r from-fuchsia-900/80 to-black/80 backdrop-blur-xl rounded-xl p-3 border border-fuchsia-500/50 shadow-[0_0_20px_rgba(217,70,239,0.3)] inline-flex items-center gap-2"
                            >
                                <Zap className="text-fuchsia-400 fill-fuchsia-400/50 animate-pulse" size={20} />
                                <span className="text-fuchsia-100 font-black text-2xl italic tracking-tighter">{multiplier.toFixed(1)}x</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex flex-col items-end gap-3">
                    {/* Time */}
                    <div className="bg-black/80 backdrop-blur-xl rounded-xl p-4 border border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                        <div className="flex items-center justify-end gap-2 text-blue-400 mb-1">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-xs uppercase tracking-[0.3em] font-black">{t('game.hud.time')}</span>
                        </div>
                        <div className={`text-4xl font-mono font-black tabular-nums tracking-tighter text-right drop-shadow-lg ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                            00:{timeLeft.toString().padStart(2, '0')}
                        </div>
                    </div>

                    {/* Speed Gauge */}
                    <div className="bg-black/80 backdrop-blur-xl rounded-xl p-4 border border-cyan-500/40 w-48 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                        <div className="flex justify-between items-end mb-2">
                            <div className="flex items-center gap-1 text-cyan-400 text-[10px] uppercase font-black tracking-widest">
                                <FastForward size={12} /> Speed
                            </div>
                            <span className="text-sm font-black font-mono text-cyan-500">{(speed * 10).toFixed(0)} GHz</span>
                        </div>
                        <div className="w-full h-3 bg-black rounded-full overflow-hidden border border-white/10 relative p-0.5">
                            <div className={`h-full rounded-full transition-all duration-100 relative z-0 ${speed > 4 ? 'bg-gradient-to-r from-cyan-400 to-fuchsia-500' : 'bg-cyan-600'}`}
                                style={{
                                    width: `${Math.min(100, (speed / 6) * 100)}%`,
                                    boxShadow: speed > 4 ? `0 0 15px #d946ef` : `0 0 10px #0891b2`,
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Multi-Agent Comm Panel */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row gap-4 z-40 pointer-events-none">
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex-1 bg-black/80 backdrop-blur-2xl rounded-xl p-4 border border-violet-500/30 shadow-[0_0_20px_rgba(139,92,246,0.15)] relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500"></div>
                    <div className="text-[10px] text-violet-400 mb-2 uppercase tracking-widest font-black flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> [SYS.ADV] {t('game.advisor.label')}</div>
                    <div className="text-sm text-violet-100 font-mono leading-relaxed">{advisorMsg}</div>
                </motion.div>
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="flex-1 bg-black/80 backdrop-blur-2xl rounded-xl p-4 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)] relative overflow-hidden">
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-500"></div>
                    <div className="text-[10px] text-red-500 mb-2 uppercase tracking-widest font-black flex items-center gap-1.5 justify-end"><Zap className="w-3.5 h-3.5" /> [SYS.ADV] {t('game.adversary.label')}</div>
                    <div className="text-sm text-red-100 font-mono leading-relaxed text-right">{adversaryMsg}</div>
                </motion.div>
            </div>

            {/* Game Over States */}
            <AnimatePresence>
                {gameState !== 'PLAYING' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl pointer-events-auto"
                    >
                        <div className="absolute inset-0 bg-[url('/assets/aaa/grid-pattern.svg')] opacity-10 bg-repeat bg-[center_top] pointer-events-none"></div>

                        <div className={`relative p-10 w-full max-w-lg rounded-[2rem] border bg-gradient-to-b shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden text-center ${gameState === 'SUCCESS'
                                ? 'border-violet-500/30 from-violet-950/40 to-black'
                                : 'border-red-500/30 from-red-950/40 to-black'
                            }`}>

                            <div className={`absolute -top-32 -left-32 w-64 h-64 rounded-full blur-[80px] opacity-20 ${gameState === 'SUCCESS' ? 'bg-violet-600' : 'bg-red-600'}`}></div>

                            <h2 className={`text-4xl md:text-5xl font-black uppercase tracking-widest mb-2 drop-shadow-md ${gameState === 'SUCCESS' ? 'text-violet-400' : 'text-red-500'}`}>
                                {gameState === 'SUCCESS' ? 'GLOBAL MINIMUM' : 'LOCAL MINIMUM'}
                            </h2>
                            <p className="text-gray-400 font-mono text-sm mb-10 uppercase tracking-widest">Descent Concluded</p>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-black/50 border border-white/5 rounded-xl p-4 col-span-2">
                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Final Convergence Score</div>
                                    <div className="text-5xl font-black text-white font-mono">{Math.floor(score).toLocaleString()}</div>
                                </div>
                                <div className="bg-black/50 border border-white/5 rounded-xl p-4">
                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Max Speed Level</div>
                                    <div className="text-3xl font-black text-cyan-400 font-mono">{(maxSpeed * 10).toFixed(1)} <span className="text-sm text-gray-600">GHz</span></div>
                                </div>
                                <div className="bg-black/50 border border-white/5 rounded-xl p-4">
                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Target Score</div>
                                    <div className="text-3xl font-black text-gray-300 font-mono">{reqScore.toLocaleString()}</div>
                                </div>
                            </div>

                            <button
                                onClick={() => onComplete(gameState === 'SUCCESS' ? 100 : 0)}
                                className={`w-full py-4 rounded-xl font-black tracking-[0.2em] uppercase transition-all hover:scale-105 ${gameState === 'SUCCESS'
                                        ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)]'
                                        : 'bg-red-900/40 hover:bg-red-800/60 text-red-200 border border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                                    }`}
                            >
                                {gameState === 'SUCCESS' ? 'Submit Weights' : 'Retrain Model'}
                            </button>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3D Canvas */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <Canvas camera={{ position: [0, 2, 8], fov: 60 }} gl={{ antialias: false, powerPreference: "high-performance" }}>
                    <color attach="background" args={['#020008']} />
                    <fog attach="fog" args={['#020008', 5, 50]} />
                    <ambientLight intensity={0.4} />
                    <pointLight position={[0, 10, 10]} intensity={2} color="#8b5cf6" />

                    <ActionCamera speed={speed} shake={cameraShake} />
                    <LossLandscape speed={speed} />
                    <SpeedParticles speed={speed} />
                    <PlayerCore speed={speed} combo={combo} />

                    <EffectComposer multisampling={0}>
                        <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5 + speed * 0.5} radius={0.8} />
                        <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.002 + speed * 0.002, 0.002)} />
                        {glitchActive && (
                            <Glitch delay={new THREE.Vector2(0, 0)} duration={new THREE.Vector2(0.1, 0.3)} mode={GlitchMode.SPORADIC} active ratio={0.5} />
                        )}
                        <Vignette eskil={false} offset={0.1} darkness={1.3 + speed * 0.1} />
                    </EffectComposer>
                </Canvas>
            </div>
        </div>
    );
};
