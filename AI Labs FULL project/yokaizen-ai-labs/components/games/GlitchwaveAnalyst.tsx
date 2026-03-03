import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Icosahedron, MeshDistortMaterial, Float, Sparkles, Instances, Instance } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch, Vignette, Scanline } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Activity, Shield, Zap, AlertTriangle, Flame, Trophy, SkullIcon, Waves } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../../services/audioService';
import { useDialogue } from '../../contexts/DialogueContext';

export interface GlitchwaveAnalystProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

// --- AAA Additions ---

const CyberFloor = ({ speed = 1 }) => {
    const gridRef = useRef<THREE.GridHelper>(null);
    useFrame((state, delta) => {
        if (gridRef.current) {
            gridRef.current.position.z = (gridRef.current.position.z + speed * delta * 5) % 2;
        }
    });
    return (
        <group position={[0, -6, 0]}>
            <gridHelper ref={gridRef} args={[100, 100, '#00ff88', '#020008']} position={[0, 0, 0]} />
            {/* Fading plane to blend the horizon */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
                <planeGeometry args={[100, 100]} />
                <meshBasicMaterial color="#020008" transparent opacity={0.8} />
            </mesh>
        </group>
    );
};

// --- Glitchwave Ring that expands outward ---
const GlitchRing = ({ color, delay, speed }: { color: string; delay: number; speed: number }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [scale, setScale] = useState(0.1);

    useFrame((state, delta) => {
        const newScale = scale + delta * speed;
        setScale(newScale > 15 ? 0.1 : newScale);
        if (meshRef.current) {
            meshRef.current.scale.setScalar(newScale);
            meshRef.current.rotation.z += delta * 0.5;
            (meshRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - newScale / 15);
        }
    });

    return (
        <mesh ref={meshRef} rotation={[0, 0, delay]}>
            <ringGeometry args={[0.95, 1, 64]} />
            <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
    );
};

// --- Clickable Shield Node ---
const ShieldNode = ({ position, color, onClick, id, isCorrect }: {
    position: [number, number, number];
    color: string;
    onClick: (id: string, isCorrect: boolean, pos: [number, number, number]) => void;
    id: string;
    isCorrect: boolean;
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    // Animate spawn
    const [scale, setScale] = useState(0);

    useFrame((state, delta) => {
        if (scale < 1) setScale(s => Math.min(1, s + delta * 2));

        if (meshRef.current) {
            meshRef.current.rotation.y = state.clock.elapsedTime * 2;
            meshRef.current.rotation.x = state.clock.elapsedTime;
            const pulse = 1 + Math.sin(state.clock.elapsedTime * 8) * 0.1;
            meshRef.current.scale.setScalar(pulse * (hovered ? 1.4 : 1) * scale);
        }
    });

    return (
        <Float speed={hovered ? 6 : 3} rotationIntensity={hovered ? 3 : 1.5} floatIntensity={1.5}>
            <mesh
                ref={meshRef}
                position={position}
                onClick={(e) => { e.stopPropagation(); onClick(id, isCorrect, position); }}
                onPointerOver={() => { setHovered(true); document.body.style.cursor = 'crosshair'; }}
                onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
            >
                <icosahedronGeometry args={[0.6, 1]} />
                <MeshDistortMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={hovered ? 6 : 2}
                    clearcoat={1}
                    metalness={1}
                    roughness={0.1}
                    distort={hovered ? 0.6 : 0.2}
                    speed={hovered ? 10 : 3}
                    wireframe={!isCorrect && hovered}
                />
                <pointLight distance={3} intensity={hovered ? 2 : 0} color={color} />
            </mesh>
        </Float>
    );
};

// --- Central Core ---
const CoreEntity = ({ health, combo }: { health: number, combo: number }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const healthNormalized = health / 100;

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.elapsedTime * (0.3 + combo * 0.05);
            meshRef.current.rotation.y = state.clock.elapsedTime * (0.5 + combo * 0.05);
            const breathe = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
            meshRef.current.scale.setScalar((0.8 + healthNormalized * 0.4) * breathe);
        }
    });

    return (
        <Float speed={2} floatIntensity={1} rotationIntensity={0.5}>
            <Icosahedron ref={meshRef} args={[1.2, 3]}>
                <MeshDistortMaterial
                    color={new THREE.Color().setHSL(healthNormalized * 0.3, 0.9, 0.5)}
                    emissive={new THREE.Color().setHSL(healthNormalized * 0.3, 1, 0.3)}
                    emissiveIntensity={3 + combo * 0.1}
                    clearcoat={1}
                    metalness={0.9}
                    roughness={0}
                    distort={0.3 + (1 - healthNormalized) * 0.4 + (combo * 0.02)}
                    speed={3 + (1 - healthNormalized) * 5 + (combo * 0.5)}
                    wireframe={health < 30}
                />
            </Icosahedron>
            <pointLight distance={10 + combo} intensity={4 + combo * 0.5} color={new THREE.Color().setHSL(healthNormalized * 0.3, 1, 0.5)} />
        </Float>
    );
};

// --- Camera Rig ---
const CameraRig = ({ shakeIntensity, combo }: { shakeIntensity: number, combo: number }) => {
    useFrame((state) => {
        const t = state.clock.elapsedTime;
        const shake = shakeIntensity > 0 ? (Math.random() - 0.5) * shakeIntensity : 0;

        // FOV pulse on high combo
        const targetFov = 60 + Math.min(combo * 1.5, 30);
        //@ts-ignore
        if (state.camera.fov !== targetFov) {
            //@ts-ignore
            state.camera.fov = THREE.MathUtils.lerp(state.camera.fov, targetFov, 0.05);
            state.camera.updateProjectionMatrix();
        }

        state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, Math.sin(t * 0.2) * (3 + combo * 0.1) + shake, 0.05);
        state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, Math.cos(t * 0.15) * (2 + combo * 0.1) + shake, 0.05);
        state.camera.lookAt(0, 0, 0);
    });
    return null;
};

// --- Types ---
interface WaveTarget {
    id: string;
    color: string;
    position: [number, number, number];
    isCorrect: boolean;
}

const WAVE_COLORS = ['#00ffff', '#ff00ff', '#ffaa00', '#00ff88', '#ff3366'];

const generateWave = (waveNumber: number): { targetColor: string; nodes: WaveTarget[] } => {
    const targetColor = WAVE_COLORS[waveNumber % WAVE_COLORS.length];
    const nodeCount = Math.min(4 + Math.floor(waveNumber / 1.5), 12); // Scales up faster
    const correctCount = 1 + Math.floor(Math.random() * 2) + Math.floor(waveNumber / 5);

    const nodes: WaveTarget[] = [];
    for (let i = 0; i < nodeCount; i++) {
        const isCorrect = i < correctCount;
        nodes.push({
            id: `${Date.now()}-${i}`,
            color: isCorrect ? targetColor : WAVE_COLORS[(waveNumber + i + 1) % WAVE_COLORS.length],
            position: [
                (Math.random() - 0.5) * 16,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 8,
            ],
            isCorrect,
        });
    }

    // Shuffle
    for (let i = nodes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nodes[i], nodes[j]] = [nodes[j], nodes[i]];
    }

    return { targetColor, nodes };
};

// --- Particle Burst Effect ---
const ParticleBurst = ({ bursts }: { bursts: { id: string; position: [number, number, number]; color: string; time: number }[] }) => {
    return (
        <>
            {bursts.map(b => {
                const age = Date.now() - b.time;
                if (age > 1000) return null; // Expire after 1s
                return (
                    <Sparkles
                        key={b.id}
                        position={b.position}
                        count={30}
                        scale={4 + (age / 1000) * 10}
                        size={6 - (age / 1000) * 5}
                        speed={2}
                        opacity={1 - (age / 1000)}
                        color={b.color}
                    />
                );
            })}
        </>
    );
};

// --- Main Component ---
export const GlitchwaveAnalyst: React.FC<GlitchwaveAnalystProps> = ({ onComplete, difficulty, t }) => {
    const { queueDialogue } = useDialogue();
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');
    const [combo, setCombo] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [waveNumber, setWaveNumber] = useState(0);
    const [currentWave, setCurrentWave] = useState<{ targetColor: string; nodes: WaveTarget[] }>(() => generateWave(0));
    const [coreHealth, setCoreHealth] = useState(100);

    // AAA Effects State
    const [glitchActive, setGlitchActive] = useState(false);
    const [shakeIntensity, setShakeIntensity] = useState(0);
    const [screenFlash, setScreenFlash] = useState<string | null>(null);
    const [bursts, setBursts] = useState<{ id: string; position: [number, number, number]; color: string; time: number }[]>([]);

    // Agent messages
    const [advisorMsg, setAdvisorMsg] = useState(t('game.advisor.wave_incoming'));
    const [adversaryMsg, setAdversaryMsg] = useState(t('game.adversary.same_look'));

    // Narrative: Mission Briefing
    useEffect(() => {
        queueDialogue([
            { id: `gw-brief-${Date.now()}`, character: 'ATHENA', text: t('game.advisor.wave_incoming') },
            { id: `gw-brief2-${Date.now()}`, character: 'BYTE', text: t('game.instructions.avoid_hazards'), isGlitchy: true },
        ]);
    }, [queueDialogue, t]);

    const difficultyMultiplier = difficulty === 'HARD' ? 1.5 : difficulty === 'MEDIUM' ? 1.2 : 1;

    // Auto-advance wave when all correct nodes are clicked
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const correctRemaining = currentWave.nodes.filter(n => n.isCorrect).length;
        if (correctRemaining === 0) {
            // All correct nodes clicked — next wave!
            setTimeout(() => {
                const nextWave = waveNumber + 1;
                setWaveNumber(nextWave);
                setCurrentWave(generateWave(nextWave));
                audio.playScan?.();
            }, 400);
        }
    }, [currentWave.nodes, gameState, waveNumber]);

    // Agent chatter
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const advisorLines = [
            `${t('game.hud.wave')} ${waveNumber + 1}. ${t('game.advisor.wave_incoming')}`,
            `${t('game.hud.combo')}: ${combo}x`,
            t('game.advisor.core_holding'),
            t('game.advisor.diversion_nodes'),
        ];
        const adversaryLines = [
            t('game.adversary.same_look'),
            t('game.adversary.wont_survive'),
            t('game.adversary.predictable'),
            t('game.adversary.core_exposed'),
        ];
        const interval = setInterval(() => {
            if (Math.random() > 0.55) {
                setAdversaryMsg(adversaryLines[Math.floor(Math.random() * adversaryLines.length)]);
                audio.playSystemMessage?.({ type: 'warning' });
            } else {
                setAdvisorMsg(advisorLines[Math.floor(Math.random() * advisorLines.length)]);
                audio.playSystemMessage?.({ type: 'success' });
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [gameState, combo, waveNumber]);

    // Countdown
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    const finalState = coreHealth > 0 ? 'SUCCESS' : 'FAILED';
                    setGameState(finalState);
                    if (finalState === 'SUCCESS') {
                        audio.playSuccess();
                        queueDialogue([
                            { id: `gw-win-${Date.now()}`, character: 'SYNTAX', text: `${t('game.hud.waves_cleared')}: ${waveNumber}. ${t('game.hud.max_combo')}: ${maxCombo}x.` },
                            { id: `gw-win2-${Date.now()}`, character: 'ATHENA', text: t('game.state.waves_analyzed') },
                        ]);
                    } else {
                        audio.playError();
                        queueDialogue([
                            { id: `gw-fail-${Date.now()}`, character: 'BYTE', text: t('game.state.core_breached'), isGlitchy: true },
                        ]);
                    }
                    onComplete(score, { completionTime: 60, difficulty, maxCombo, wavesCleared: waveNumber });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, score, onComplete, difficulty, maxCombo, waveNumber, coreHealth]);

    // Check core health
    useEffect(() => {
        if (coreHealth <= 0 && gameState === 'PLAYING') {
            setGameState('FAILED');
            audio.playError();
            setGlitchActive(true);
            setShakeIntensity(5);
            onComplete(score, { completionTime: 60 - timeLeft, difficulty, maxCombo, wavesCleared: waveNumber });
        }
    }, [coreHealth, gameState, score, timeLeft, difficulty, maxCombo, waveNumber, onComplete]);

    // Clean up bursts
    useEffect(() => {
        const interval = setInterval(() => {
            setBursts(prev => prev.filter(b => Date.now() - b.time < 1000));
        }, 500);
        return () => clearInterval(interval);
    }, []);

    const handleNodeClick = useCallback((id: string, isCorrect: boolean, position: [number, number, number]) => {
        if (gameState !== 'PLAYING') return;

        if (isCorrect) {
            // Correct! Remove the node
            setCurrentWave(prev => ({
                ...prev,
                nodes: prev.nodes.filter(n => n.id !== id),
            }));
            audio.playClick();
            const newCombo = combo + 1;
            setCombo(newCombo);
            setMaxCombo(c => Math.max(c, newCombo));
            const points = Math.floor(100 * Math.min(newCombo, 10) * difficultyMultiplier);
            setScore(s => s + points);

            // Add Burst
            const targetColor = currentWave.targetColor;
            setBursts(prev => [...prev, { id, position, color: targetColor, time: Date.now() }]);

            setScreenFlash('rgba(0, 255, 255, 0.2)');
            setTimeout(() => setScreenFlash(null), 80);

            // Minor shake for impact
            setShakeIntensity(0.2);
            setTimeout(() => setShakeIntensity(0), 100);
        } else {
            // Wrong! Penalty
            audio.playError();
            setCombo(0);
            setScore(s => Math.max(0, s - 150));
            setCoreHealth(h => Math.max(0, h - 15));

            setGlitchActive(true);
            setShakeIntensity(1.5);
            setScreenFlash('rgba(255, 0, 0, 0.4)');
            setTimeout(() => { setGlitchActive(false); setShakeIntensity(0); setScreenFlash(null); }, 400);
        }
    }, [gameState, combo, difficultyMultiplier, currentWave.targetColor]);

    return (
        <div className="relative w-full h-[600px] rounded-xl overflow-hidden border border-white/10 bg-black shadow-2xl">
            {/* Scanlines Overlay for AAA Vibe */}
            <div className="absolute inset-0 bg-[url('/assets/aaa/scanlines.png')] opacity-20 pointer-events-none z-20 mix-blend-overlay"></div>

            {/* Screen Flash */}
            <AnimatePresence>
                {screenFlash && (
                    <motion.div
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 z-30 pointer-events-none"
                        style={{ backgroundColor: screenFlash }}
                    />
                )}
            </AnimatePresence>

            {/* UI Overlay */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
                <div className="flex flex-col gap-3">
                    <div className="bg-black/80 backdrop-blur-xl rounded-xl p-4 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                        <div className="flex items-center gap-2 text-emerald-400 mb-1">
                            <Activity className="w-4 h-4 animate-pulse" />
                            <span className="text-xs uppercase tracking-[0.3em] font-black">{t('game.hud.score')}</span>
                        </div>
                        <div className="text-4xl font-mono font-black text-white tabular-nums tracking-tighter drop-shadow-lg">{score.toLocaleString()}</div>
                    </div>

                    {/* Wave Indicator with TARGET COLOR */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} key={waveNumber}
                        className="bg-black/80 backdrop-blur-xl rounded-xl p-4 border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)] flex flex-col gap-3"
                    >
                        <div className="flex items-center gap-2">
                            <Waves className="w-4 h-4 text-white" />
                            <span className="text-sm uppercase tracking-widest font-black text-white">{t('game.hud.wave')} {waveNumber + 1}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider content-center">{t('game.hud.match_color')}</span>
                            <div className="w-full h-8 rounded-lg border-2 border-white/40 shadow-xl overflow-hidden relative">
                                <div className="absolute inset-0 opacity-50 bg-[url('/assets/aaa/scanlines.png')]" style={{ mixBlendMode: 'overlay' }}></div>
                                <div className="absolute inset-0" style={{ backgroundColor: currentWave.targetColor, boxShadow: `inset 0 0 20px rgba(0,0,0,0.5)` }}></div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Combo */}
                    <AnimatePresence>
                        {combo > 1 && (
                            <motion.div
                                initial={{ scale: 0, x: -50, rotate: -5 }}
                                animate={{ scale: 1, x: 0, rotate: 0 }}
                                exit={{ scale: 0, opacity: 0 }}
                                className="bg-gradient-to-br from-orange-900/80 to-black/80 backdrop-blur-xl rounded-xl p-4 border border-orange-500/50 shadow-[0_0_30px_rgba(249,115,22,0.4)]"
                            >
                                <div className="flex items-center gap-3">
                                    <Flame className="w-6 h-6 text-orange-400 animate-pulse drop-shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
                                    <span className="text-orange-400 font-black text-3xl italic tracking-tighter drop-shadow-md">{combo}x</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex flex-col items-end gap-3">
                    <div className="bg-black/80 backdrop-blur-xl rounded-xl p-4 border border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                        <div className="flex items-center justify-end gap-2 text-blue-400 mb-1">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-xs uppercase tracking-[0.3em] font-black">{t('game.hud.time')}</span>
                        </div>
                        <div className={`text-4xl font-mono font-black tabular-nums tracking-tighter text-right drop-shadow-lg ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                            00:{timeLeft.toString().padStart(2, '0')}
                        </div>
                    </div>

                    {/* Core Health */}
                    <div className="bg-black/80 backdrop-blur-xl rounded-xl p-4 border border-red-500/30 w-48 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                        <div className="flex justify-between items-end mb-2">
                            <div className="text-[10px] text-red-500 uppercase tracking-widest font-black flex items-center gap-1">
                                <Shield size={12} /> {t('game.hud.core_hp')}
                            </div>
                            <div className="text-sm text-white font-mono font-bold leading-none">{Math.round(coreHealth)}%</div>
                        </div>
                        <div className="w-full bg-black rounded-full h-4 overflow-hidden border border-white/10 relative p-0.5">
                            <div className="absolute inset-0 bg-[url('/assets/aaa/scanlines.png')] opacity-30 z-10"></div>
                            <div
                                className="h-full rounded-full transition-all duration-300 relative z-0"
                                style={{
                                    width: `${Math.max(0, coreHealth)}%`,
                                    background: coreHealth > 50 ? 'linear-gradient(90deg, #059669, #10b981)' : coreHealth > 25 ? 'linear-gradient(90deg, #d97706, #f59e0b)' : 'linear-gradient(90deg, #b91c1c, #ef4444)',
                                    boxShadow: `0 0 15px ${coreHealth > 50 ? '#10b981' : coreHealth > 25 ? '#f59e0b' : '#ef4444'}`,
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Agent Comm Panel */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row gap-4 z-10 pointer-events-none">
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex-1 bg-black/80 backdrop-blur-2xl rounded-xl p-4 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                    <div className="text-[10px] text-emerald-400 mb-2 uppercase tracking-widest font-black flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> [SYS.ADV] {t('game.advisor.label')}</div>
                    <div className="text-sm text-emerald-50 font-mono leading-relaxed">{advisorMsg}</div>
                </motion.div>
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="flex-1 bg-black/80 backdrop-blur-2xl rounded-xl p-4 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)] relative overflow-hidden">
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-500"></div>
                    <div className="text-[10px] text-red-500 mb-2 uppercase tracking-widest font-black flex items-center gap-1.5 justify-end"><Zap className="w-3.5 h-3.5" /> [SYS.ADV] {t('game.adversary.label')}</div>
                    <div className="text-sm text-red-50 font-mono leading-relaxed text-right">{adversaryMsg}</div>
                </motion.div>
            </div>

            {/* Game Over Screen */}
            <AnimatePresence>
                {gameState !== 'PLAYING' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl"
                    >
                        <div className="absolute inset-0 bg-[url('/assets/aaa/grid-pattern.svg')] opacity-10 bg-repeat bg-[center_top] pointer-events-none"></div>

                        <div className="text-center p-10 w-full max-w-lg rounded-[2rem] border border-white/10 bg-gradient-to-b from-gray-900/90 to-black shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative overflow-hidden">
                            <div className="absolute -top-32 -left-32 w-64 h-64 bg-electric/20 rounded-full blur-[80px]"></div>
                            <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-cyan-500/20 rounded-full blur-[80px]"></div>

                            <div className={`w-24 h-24 mx-auto mb-8 rounded-full flex items-center justify-center relative ${gameState === 'SUCCESS' ? 'bg-emerald-500/20 border border-emerald-500/50' : 'bg-red-500/20 border border-red-500/50'}`}>
                                <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${gameState === 'SUCCESS' ? 'bg-emerald-400' : 'bg-red-500'}`}></div>
                                {gameState === 'SUCCESS' ? <Trophy className="w-12 h-12 text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]" /> : <SkullIcon className="w-12 h-12 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" />}
                            </div>

                            <h2 className={`text-4xl md:text-5xl font-black uppercase tracking-widest mb-2 drop-shadow-md ${gameState === 'SUCCESS' ? 'text-emerald-400' : 'text-red-500'}`}>
                                {gameState === 'SUCCESS' ? t('game.state.waves_analyzed') : t('game.state.core_breached')}
                            </h2>
                            <p className="text-gray-400 font-mono text-sm mb-10 uppercase tracking-widest">Simulation Concluded</p>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-black/50 border border-white/5 rounded-xl p-4">
                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{t('game.hud.final_score')}</div>
                                    <div className="text-3xl font-black text-white font-mono">{score.toLocaleString()}</div>
                                </div>
                                <div className="bg-black/50 border border-white/5 rounded-xl p-4">
                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{t('game.hud.max_combo')}</div>
                                    <div className="text-3xl font-black text-orange-400 font-mono italic">{maxCombo}x</div>
                                </div>
                                <div className="bg-black/50 border border-white/5 rounded-xl p-4 col-span-2">
                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{t('game.hud.waves_cleared')}</div>
                                    <div className="text-2xl font-black text-cyan-400 font-mono">{waveNumber} <span className="text-sm text-gray-600 ml-2">Waves Survived</span></div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3D Canvas */}
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 0, 12], fov: 60 }} gl={{ antialias: false, powerPreference: "high-performance", logarithmicDepthBuffer: true }}>
                    <color attach="background" args={['#020008']} />
                    <fog attach="fog" args={['#020008', 8, 30]} />
                    <ambientLight intensity={0.4} />
                    <pointLight position={[10, 10, 10]} intensity={3} color="#00ff88" />
                    <pointLight position={[-10, -10, -10]} intensity={2} color="#ff00ff" />

                    <CyberFloor speed={1 + combo * 0.1} />
                    <CameraRig shakeIntensity={shakeIntensity} combo={combo} />
                    <CoreEntity health={coreHealth} combo={combo} />

                    {/* Expanding wave rings */}
                    <GlitchRing color={currentWave.targetColor} delay={0} speed={2 + waveNumber * 0.4} />
                    <GlitchRing color={currentWave.targetColor} delay={Math.PI} speed={1.5 + waveNumber * 0.3} />

                    <ParticleBurst bursts={bursts} />

                    {/* Shield Nodes for this wave */}
                    {currentWave.nodes.map(node => (
                        <ShieldNode
                            key={node.id}
                            id={node.id}
                            position={node.position}
                            color={node.color}
                            isCorrect={node.isCorrect}
                            onClick={handleNodeClick}
                        />
                    ))}

                    <Sparkles count={400} scale={25} size={4} speed={0.5 + waveNumber * 0.1 + combo * 0.05} opacity={0.6} color="#00ff88" />
                    <Sparkles count={200} scale={20} size={8} speed={1 + combo * 0.1} opacity={0.4} color="#00ffff" />
                    <Sparkles count={100} scale={15} size={10} speed={0.2} opacity={0.2} color="#ff00ff" />

                    <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5 + combo * 0.1} />

                    <EffectComposer multisampling={0}>
                        <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5 + combo * 0.15} radius={0.8} />
                        <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.003 + Math.max(0, shakeIntensity * 0.01) + (combo * 0.0005), 0.003)} />
                        <Vignette eskil={false} offset={0.1} darkness={1.3} />
                        <Scanline blendFunction={BlendFunction.OVERLAY} density={1.5} opacity={0.1} />
                        {glitchActive && (
                            <Glitch delay={new THREE.Vector2(0, 0)} duration={new THREE.Vector2(0.1, 0.4)} mode={GlitchMode.SPORADIC} active ratio={0.8} />
                        )}
                        {(coreHealth < 30) && (
                            // Constant minor glitch if core is dying
                            <Glitch delay={new THREE.Vector2(1.5, 3.5)} duration={new THREE.Vector2(0.1, 0.3)} mode={GlitchMode.SPORADIC} active={true} ratio={0.4} />
                        )}
                    </EffectComposer>
                </Canvas>
            </div>
        </div>
    );
};
