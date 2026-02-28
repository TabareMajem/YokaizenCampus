/// <reference types="@react-three/fiber" />
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Float, Sparkles, MeshTransmissionMaterial, Environment, ContactShadows, Grid, Text } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch, Vignette, Noise, DepthOfField } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Activity, Shield, Zap, AlertTriangle, Flame, Target, Trophy, SkullIcon, ChevronRight, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../../services/audioService';
import { useDialogue } from '../../contexts/DialogueContext';

export interface ArrakisSandsProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

// --- Dynamic Score Popup ---
const FloatingScore = ({ position, text, color, onComplete }: { position: [number, number, number], text: string, color: string, onComplete: () => void }) => {
    const groupRef = useRef<THREE.Group>(null);
    const [life, setLife] = useState(0);

    useFrame((_, delta) => {
        if (!groupRef.current) return;
        setLife(l => l + delta * 1.5);
        groupRef.current.position.y += delta * 1.5;
        groupRef.current.position.x += delta * 0.5 * (Math.random() - 0.5);
        groupRef.current.scale.setScalar(Math.max(0, 1 - life * 0.6));
        if (life > 1.6) onComplete();
    });

    return (
        <group ref={groupRef} position={position}>
            <Text color={color} fontSize={1.2} font="https://fonts.gstatic.com/s/syncopate/v13/pe0sMIuPIYBCpEV5eFdCBfe_m_s.woff" anchorX="center" anchorY="middle" outlineWidth={0.05} outlineColor="#220000">
                {text}
            </Text>
        </group>
    );
};

// --- Sand Ripple Effect ---
const SandRipple = ({ position, color, onComplete }: { position: [number, number, number], color: string, onComplete: () => void }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.MeshBasicMaterial>(null);
    const [life, setLife] = useState(0);

    useFrame((_, delta) => {
        if (!meshRef.current || !matRef.current) return;
        const speed = 3;
        setLife(l => l + delta * speed);
        meshRef.current.scale.setScalar(1 + life * 6);
        matRef.current.opacity = Math.max(0, 1 - Math.pow(life, 2));
        if (life > 1) onComplete();
    });

    return (
        <mesh ref={meshRef} position={position}>
            <ringGeometry args={[0.8, 1, 32]} />
            <meshBasicMaterial ref={matRef} color={color} transparent opacity={1} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
    );
};

// --- AAA Spice Crystal (Target Node) ---
const TargetNode = ({ position, color, scale, onClick, id, isHoveredGlobal }: {
    position: [number, number, number]; color: string; scale: number; onClick: (id: string, pos: [number, number, number]) => void; id: string; isHoveredGlobal: (s: boolean) => void;
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const coreRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
        if (groupRef.current && coreRef.current) {
            const t = state.clock.elapsedTime;
            groupRef.current.rotation.x = t * 0.5;
            groupRef.current.rotation.z = t * 1.2;
            coreRef.current.rotation.y = -t * 2;

            const pulse = 1 + Math.sin(t * 6) * 0.08;
            const targetScale = scale * pulse * (hovered ? 1.4 : 1);
            groupRef.current.scale.lerp(new THREE.Vector3().setScalar(targetScale), 0.15);
        }
    });

    return (
        <Float speed={3} rotationIntensity={2} floatIntensity={3}>
            <group ref={groupRef} position={position}
                onClick={(e) => { e.stopPropagation(); onClick(id, position); setHovered(false); isHoveredGlobal(false); document.body.style.cursor = 'default'; }}
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); isHoveredGlobal(true); document.body.style.cursor = 'crosshair'; }}
                onPointerOut={(e) => { e.stopPropagation(); setHovered(false); isHoveredGlobal(false); document.body.style.cursor = 'default'; }}>

                {/* Outer Glass Shell (Raw Crystal) */}
                <mesh>
                    <dodecahedronGeometry args={[0.7, 0]} />
                    <MeshTransmissionMaterial backside samples={4} thickness={1.2} chromaticAberration={hovered ? 1.5 : 0.8} anisotropy={0.8} distortion={hovered ? 1 : 0.4} distortionScale={0.3} temporalDistortion={0.4} color={color} emissive={color} emissiveIntensity={hovered ? 2 : 0.5} clearcoat={1} clearcoatRoughness={0.1} />
                </mesh>

                {/* Inner Glowing Core */}
                <mesh ref={coreRef}>
                    <icosahedronGeometry args={[0.3, 0]} />
                    <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={hovered ? 8 : 3} />
                </mesh>

                <pointLight distance={8} intensity={hovered ? 6 : 3} color={color} />
            </group>
        </Float>
    );
};

// --- AAA Sandworm Trap (Hazard Node) ---
const HazardNode = ({ position, onClick, id, isHoveredGlobal }: {
    position: [number, number, number]; onClick: (id: string, pos: [number, number, number]) => void; id: string; isHoveredGlobal: (s: boolean) => void;
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const auraRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (meshRef.current) {
            meshRef.current.rotation.x = t * 2;
            meshRef.current.rotation.y = -t * 3;
            // Snapping motion to mimic jaws/trap
            const snap = (Math.sin(t * 12) > 0.8) ? 1.3 : 1;
            meshRef.current.scale.lerp(new THREE.Vector3().setScalar(0.7 * snap * (hovered ? 1.3 : 1)), 0.3);
        }
        if (auraRef.current) {
            auraRef.current.rotation.z = t * 2;
            auraRef.current.scale.setScalar(1 + Math.sin(t * 15) * 0.15);
        }
    });

    return (
        <group position={position}
            onClick={(e) => { e.stopPropagation(); onClick(id, position); setHovered(false); isHoveredGlobal(false); document.body.style.cursor = 'default'; }}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); isHoveredGlobal(true); document.body.style.cursor = 'not-allowed'; }}
            onPointerOut={(e) => { e.stopPropagation(); setHovered(false); isHoveredGlobal(false); document.body.style.cursor = 'default'; }}>

            {/* Dark Spiky Trap */}
            <mesh ref={meshRef}>
                <tetrahedronGeometry args={[0.6, 1]} />
                <meshStandardMaterial color="#220000" emissive="#ff2200" emissiveIntensity={hovered ? 6 : 2} roughness={0.3} metalness={0.9} wireframe={hovered} />
            </mesh>

            {/* Warning Aura */}
            <mesh ref={auraRef}>
                <torusGeometry args={[0.8, 0.05, 16, 3]} />
                <meshBasicMaterial color="#ff0000" transparent opacity={hovered ? 0.9 : 0.4} blending={THREE.AdditiveBlending} />
            </mesh>

            <pointLight distance={6} intensity={hovered ? 8 : 4} color="#ff1100" />
        </group>
    );
};

// --- Arrakis Camera Rig ---
const CameraRig = ({ intensity, isPlaying }: { intensity: number, isPlaying: boolean }) => {
    useFrame((state) => {
        if (!isPlaying) return;
        const t = state.clock.elapsedTime;
        // Heat haze wavy camera movement
        const heatHazeX = Math.sin(t * 0.5) * 1.5 + Math.cos(t * 1.2) * 0.5;
        const heatHazeY = Math.cos(t * 0.4) * 1.5 + Math.sin(t * 1.1) * 0.5;
        const shake = intensity > 0.5 ? (Math.random() - 0.5) * intensity * 0.5 : 0;

        state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, heatHazeX + shake, 0.05);
        state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, heatHazeY + shake, 0.05);
        state.camera.lookAt(0, 0, 0);
    });
    return null;
};

// --- Types ---
interface GameNode { id: string; position: [number, number, number]; type: 'target' | 'hazard'; color: string; spawnedAt: number; lifetime: number; }
interface FloatingEffect { id: string; position: [number, number, number]; text: string; color: string; type: 'score' | 'ring' }

const TARGET_COLORS = ['#ffb800', '#ff8c00', '#ffaa00', '#ffd700'];
const genPos = (): [number, number, number] => [(Math.random() - 0.5) * 14, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8];

// --- Main Component ---
export const ArrakisSands: React.FC<ArrakisSandsProps> = ({ onComplete, difficulty, t }) => {
    const { queueDialogue } = useDialogue();
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(50);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');
    const [combo, setCombo] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [nodes, setNodes] = useState<GameNode[]>([]);
    const [effects, setEffects] = useState<FloatingEffect[]>([]);
    const [glitchActive, setGlitchActive] = useState(false);
    const [screenFlash, setScreenFlash] = useState<string | null>(null);
    const [advisorMsg, setAdvisorMsg] = useState(t('game.advisor.flow_stable'));
    const [adversaryMsg, setAdversaryMsg] = useState(t('game.adversary.strategy_flawed'));

    const setIsHoveredGlobal = useCallback((s: boolean) => { }, []);

    const diffMul = difficulty === 'HARD' ? 1.5 : difficulty === 'MEDIUM' ? 1.2 : 1;
    const spawnInterval = Math.max(350, 1000 - (score / 150) * 80);
    const hazardChance = Math.min(0.45, 0.15 + (score / 1500));

    // Narrative: Mission Briefing
    useEffect(() => {
        queueDialogue([
            { id: `as-brief-${Date.now()}`, character: 'ATHENA', text: t('game.instructions.click_targets') },
            { id: `as-brief2-${Date.now()}`, character: 'SYNTAX', text: t('game.instructions.avoid_hazards'), isGlitchy: true },
        ]);
    }, [queueDialogue, t]);

    // Node spawner
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const interval = setInterval(() => {
            setNodes(prev => {
                const now = Date.now();
                const active = prev.filter(n => now - n.spawnedAt < n.lifetime);
                if (active.length >= (difficulty === 'HARD' ? 8 : 6)) return active;
                const isHazard = Math.random() < hazardChance;
                return [...active, {
                    id: `${Date.now()}-${Math.random()}`, position: genPos(),
                    type: isHazard ? 'hazard' : 'target',
                    color: TARGET_COLORS[Math.floor(Math.random() * TARGET_COLORS.length)],
                    spawnedAt: now, lifetime: Math.max(1200, 2500 - (score / 200) * 400),
                }];
            });
        }, spawnInterval);
        return () => clearInterval(interval);
    }, [gameState, spawnInterval, hazardChance, score, difficulty]);

    // Agent chatter
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const aLines = [t('game.advisor.flow_stable'), t('game.advisor.target_rate_optimal'), t('game.advisor.metrics_align'), `${t('game.hud.combo_chain')}: ${combo}x`];
        const eLines = [t('game.adversary.strategy_flawed'), t('game.adversary.diverting_resources'), t('game.adversary.hesitate'), `${combo}x ${t('game.hud.combo')}...`];
        const iv = setInterval(() => {
            if (Math.random() > 0.6) { setAdversaryMsg(eLines[Math.floor(Math.random() * eLines.length)]); audio.playSystemMessage?.({ type: 'warning' }); }
            else { setAdvisorMsg(aLines[Math.floor(Math.random() * aLines.length)]); audio.playSystemMessage?.({ type: 'success' }); }
        }, 4500);
        return () => clearInterval(iv);
    }, [gameState, combo, t]);

    // Timer
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    const fs = score >= (difficulty === 'HARD' ? 1000 : 500) ? 'SUCCESS' : 'FAILED';
                    setGameState(fs);
                    if (fs === 'SUCCESS') {
                        audio.playSuccess(); queueDialogue([
                            { id: `as-win-${Date.now()}`, character: 'SYNTAX', text: `${t('game.hud.final_score')}: ${score}. ${t('game.hud.max_combo')}: ${maxCombo}x.` },
                            { id: `as-win2-${Date.now()}`, character: 'ATHENA', text: t('game.state.mission_complete') },
                        ]);
                    } else {
                        audio.playError(); queueDialogue([
                            { id: `as-fail-${Date.now()}`, character: 'BYTE', text: t('game.state.mission_failed'), isGlitchy: true },
                        ]);
                    }
                    onComplete(score, { completionTime: 50 - prev, difficulty, maxCombo });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, score, onComplete, difficulty, maxCombo, queueDialogue, t]);

    const handleTargetClick = useCallback((id: string, pos: [number, number, number]) => {
        if (gameState !== 'PLAYING') return;
        setNodes(prev => prev.filter(n => n.id !== id));
        audio.playClick();
        const nc = combo + 1; setCombo(nc); setMaxCombo(c => Math.max(c, nc));
        const pts = Math.floor(50 * Math.min(nc, 10) * diffMul);
        setScore(s => s + pts);
        setScreenFlash('rgba(255, 170, 0, 0.15)'); setTimeout(() => setScreenFlash(null), 60);

        const effId = `${Date.now()}`;
        setEffects(prev => [...prev,
        { id: `score-${effId}`, type: 'score', text: `+${pts}`, color: '#ffb800', position: [pos[0], pos[1] + 1, pos[2]] },
        { id: `ring-${effId}`, type: 'ring', text: '', color: '#ffb800', position: pos }
        ]);
    }, [gameState, combo, diffMul]);

    const handleHazardClick = useCallback((id: string, pos: [number, number, number]) => {
        if (gameState !== 'PLAYING') return;
        setNodes(prev => prev.filter(n => n.id !== id));
        audio.playError(); setCombo(0);
        const loss = 200;
        setScore(s => Math.max(0, s - loss));
        setGlitchActive(true); setScreenFlash('rgba(255, 50, 0, 0.4)');
        setTimeout(() => { setGlitchActive(false); setScreenFlash(null); }, 500);

        const effId = `${Date.now()}`;
        setEffects(prev => [...prev,
        { id: `score-${effId}`, type: 'score', text: `-${loss}`, color: '#ff2200', position: [pos[0], pos[1] + 1, pos[2]] },
        { id: `ring-${effId}`, type: 'ring', text: '', color: '#ff2200', position: pos }
        ]);
    }, [gameState]);

    const removeEffect = useCallback((id: string) => {
        setEffects(prev => prev.filter(e => e.id !== id));
    }, []);

    return (
        <div className="relative w-full h-[700px] rounded-[32px] overflow-hidden border border-orange-500/20 bg-[#0a0500] shadow-[0_0_60px_rgba(255,100,0,0.15)] font-sans">
            <AnimatePresence>
                {screenFlash && (
                    <motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="absolute inset-0 z-30 pointer-events-none mix-blend-screen" style={{ backgroundColor: screenFlash }} />
                )}
            </AnimatePresence>

            {/* AAA Glassmorphic Arrakis HUD */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
                <div className="flex flex-col gap-4 filter drop-shadow-xl">
                    {/* Score Panel */}
                    <div className="bg-[#1a0f00]/60 backdrop-blur-2xl rounded-2xl p-4 border border-orange-500/20 shadow-[0_10px_30px_rgba(255,150,0,0.1)] relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="flex items-center gap-2 text-orange-400 mb-1">
                            <Sun className="w-5 h-5 animate-[spin_10s_linear_infinite]" />
                            <span className="text-xs uppercase tracking-[0.2em] font-black text-orange-300/80">{t('game.hud.score')}</span>
                        </div>
                        <motion.div
                            key={score}
                            initial={{ y: -10, opacity: 0, scale: 1.1 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-orange-300 tabular-nums uppercase tracking-tighter"
                            style={{ textShadow: '0 0 20px rgba(255,165,0,0.4)' }}
                        >
                            {score.toLocaleString()}
                        </motion.div>
                    </div>

                    {/* Combo Panel */}
                    <AnimatePresence>
                        {combo > 1 && (
                            <motion.div
                                initial={{ scale: 0.8, x: -50, opacity: 0 }}
                                animate={{ scale: 1, x: 0, opacity: 1 }}
                                exit={{ scale: 0.8, x: -50, opacity: 0 }}
                                className="bg-gradient-to-br from-red-900/40 to-[#220000]/60 backdrop-blur-2xl rounded-2xl p-4 border border-red-500/30 shadow-[0_10px_30px_rgba(255,50,0,0.2)]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-500/20 rounded-full">
                                        <Flame className="w-6 h-6 text-red-400 animate-pulse" />
                                    </div>
                                    <div>
                                        <div className="text-red-400 font-black text-3xl italic tracking-tighter" style={{ textShadow: '0 0 15px rgba(255,50,0,0.6)' }}>{combo}x</div>
                                        <div className="text-[9px] text-red-300/60 uppercase tracking-[0.2em] font-bold">{t('game.hud.combo_chain')}</div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex flex-col items-end gap-4 filter drop-shadow-xl">
                    {/* Time Panel */}
                    <div className="bg-[#1a0f00]/60 backdrop-blur-2xl rounded-2xl p-4 border border-orange-500/20 shadow-[0_10px_30px_rgba(255,150,0,0.1)] min-w-[140px] text-right">
                        <div className="flex items-center justify-end gap-2 text-amber-500 mb-1">
                            <span className="text-xs uppercase tracking-[0.2em] font-black text-amber-500/80">{t('game.hud.time')}</span>
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className={`text-4xl font-black tabular-nums tracking-tighter ${timeLeft <= 10 ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-300 animate-pulse' : 'text-transparent bg-clip-text bg-gradient-to-r from-amber-100 to-orange-400'}`} style={{ textShadow: timeLeft <= 10 ? '0 0 20px rgba(255,0,0,0.6)' : '0 0 20px rgba(255,150,0,0.4)' }}>
                            {timeLeft}s
                        </div>
                    </div>

                    {/* Difficulty Badge */}
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border backdrop-blur-md ${difficulty === 'HARD' ? 'border-red-500/50 text-red-400 bg-red-900/40 shadow-[0_0_15px_rgba(255,0,0,0.3)]' : difficulty === 'MEDIUM' ? 'border-yellow-500/50 text-yellow-400 bg-yellow-900/40 shadow-[0_0_15px_rgba(255,200,0,0.3)]' : 'border-green-500/50 text-green-400 bg-green-900/40 shadow-[0_0_15px_rgba(0,255,0,0.3)]'}`}>
                        {t(`game.difficulty.${difficulty.toLowerCase()}`)}
                    </div>
                </div>
            </div>

            {/* Cinematic Instructions */}
            <AnimatePresence>
                {timeLeft > 45 && gameState === 'PLAYING' && (
                    <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }} transition={{ duration: 0.8, ease: "easeOut" }} className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                        <div className="bg-[#1a0f00]/80 backdrop-blur-3xl p-10 rounded-[32px] border border-orange-500/30 shadow-[0_30px_60px_rgba(255,100,0,0.4)] text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 to-transparent opacity-50"></div>
                            <div className="text-orange-400 font-black text-3xl uppercase tracking-widest mb-4 drop-shadow-[0_0_15px_rgba(255,150,0,0.6)]">
                                <Target className="inline w-8 h-8 mr-3 -mt-1" /> {t('game.instructions.click_targets')}
                            </div>
                            <div className="text-red-500 font-bold text-lg uppercase tracking-wider drop-shadow-[0_0_10px_rgba(255,0,0,0.5)]">
                                <SkullIcon className="inline w-5 h-5 mr-2 -mt-1" /> {t('game.instructions.avoid_hazards')}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Agent Comms Panel */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row gap-4 z-10 pointer-events-none">
                <div className="flex-1 bg-[#1a0f00]/70 backdrop-blur-2xl rounded-2xl p-4 border border-orange-500/20 border-l-4 border-l-amber-500 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-[30px] -translate-y-1/2 translate-x-1/2"></div>
                    <div className="text-[10px] text-amber-500 mb-2 uppercase tracking-[0.2em] font-black flex items-center gap-2">
                        <Shield className="w-4 h-4" /> {t('game.advisor.label')}
                    </div>
                    <div className="text-sm text-amber-100/90 font-mono leading-relaxed relative z-10">{advisorMsg}</div>
                </div>
                <div className="flex-1 bg-[#1a0f00]/70 backdrop-blur-2xl rounded-2xl p-4 border border-orange-500/20 border-l-4 border-l-red-500 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-[30px] -translate-y-1/2 translate-x-1/2"></div>
                    <div className="text-[10px] text-red-500 mb-2 uppercase tracking-[0.2em] font-black flex items-center gap-2">
                        <Zap className="w-4 h-4" /> {t('game.adversary.label')}
                    </div>
                    <div className="text-sm text-red-100/90 font-mono leading-relaxed relative z-10">{adversaryMsg}</div>
                </div>
            </div>

            {/* Game Over Cinematic Screen */}
            <AnimatePresence>
                {gameState !== 'PLAYING' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-40 flex items-center justify-center bg-[#0a0500]/90 backdrop-blur-xl">
                        <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", damping: 20, stiffness: 100 }} className="text-center p-10 w-full max-w-lg rounded-[40px] border border-orange-500/20 bg-gradient-to-b from-[#1a0f00]/90 to-black shadow-[0_50px_100px_rgba(255,100,0,0.3)] relative overflow-hidden">

                            {/* Background Glows */}
                            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 blur-[80px] opacity-30 ${gameState === 'SUCCESS' ? 'bg-amber-500' : 'bg-red-500'}`}></div>

                            <div className={`w-28 h-28 mx-auto mb-8 rounded-full flex items-center justify-center relative z-10 ${gameState === 'SUCCESS' ? 'bg-amber-900/40 border-2 border-amber-400 shadow-[0_0_40px_rgba(255,180,0,0.4)]' : 'bg-red-900/40 border-2 border-red-500 shadow-[0_0_40px_rgba(255,0,0,0.4)]'}`}>
                                {gameState === 'SUCCESS' ? <Trophy className="w-14 h-14 text-amber-400 drop-shadow-md" /> : <SkullIcon className="w-14 h-14 text-red-400 drop-shadow-md" />}
                            </div>

                            <h2 className={`text-4xl sm:text-6xl font-black uppercase tracking-tighter mb-4 relative z-10 ${gameState === 'SUCCESS' ? 'text-transparent bg-clip-text bg-gradient-to-b from-white to-amber-400' : 'text-transparent bg-clip-text bg-gradient-to-b from-white to-red-600'}`} style={{ textShadow: gameState === 'SUCCESS' ? '0 10px 30px rgba(255,180,0,0.4)' : '0 10px 30px rgba(255,0,0,0.4)' }}>
                                {gameState === 'SUCCESS' ? t('game.state.mission_complete') : t('game.state.mission_failed')}
                            </h2>

                            <div className="bg-black/60 rounded-2xl p-6 border border-white/5 mb-8 relative z-10">
                                <div className="text-sm text-gray-400 uppercase tracking-widest font-bold mb-1">{t('game.hud.final_score')}</div>
                                <div className="text-5xl text-white font-mono font-black tabular-nums">{score.toLocaleString()}</div>
                                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                                    <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">{t('game.hud.max_combo')}</span>
                                    <span className="text-xl text-orange-400 font-black italic">{maxCombo}x</span>
                                </div>
                            </div>

                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium Arrakis 3D Canvas */}
            <div className={`absolute inset-0 z-0 ${gameState !== 'PLAYING' ? 'pointer-events-none' : ''}`}>
                <Canvas camera={{ position: [0, 0, 14], fov: 60 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}>
                    <color attach="background" args={['#0f0500']} />
                    <fogExp2 attach="fog" args={['#0f0500', 0.04]} />

                    <Environment preset="sunset" />
                    <ambientLight intensity={0.8} />
                    <directionalLight position={[10, 15, 5]} intensity={3} color="#ffb800" castShadow />
                    <directionalLight position={[-10, 5, -15]} intensity={1.5} color="#ff4400" />
                    <pointLight position={[0, -5, -5]} intensity={2} color="#ff0000" />

                    {/* Cyberspace Desert Grid Floor */}
                    <Grid position={[0, -6, 0]} args={[60, 60]} cellSize={1} cellThickness={1} cellColor="#ff6600" sectionSize={5} sectionThickness={2.5} sectionColor="#ffa500" fadeDistance={35} fadeStrength={1.2} />

                    <CameraRig intensity={combo / 10} isPlaying={gameState === 'PLAYING'} />

                    {nodes.map(node => node.type === 'target' ? (
                        <TargetNode key={node.id} id={node.id} position={node.position} color={node.color} scale={1} onClick={handleTargetClick} isHoveredGlobal={setIsHoveredGlobal} />
                    ) : (
                        <HazardNode key={node.id} id={node.id} position={node.position} onClick={handleHazardClick} isHoveredGlobal={setIsHoveredGlobal} />
                    ))}

                    {/* Floating Effects */}
                    {effects.map(eff => eff.type === 'score' ? (
                        <FloatingScore key={eff.id} position={eff.position} text={eff.text} color={eff.color} onComplete={() => removeEffect(eff.id)} />
                    ) : (
                        <SandRipple key={eff.id} position={eff.position} color={eff.color} onComplete={() => removeEffect(eff.id)} />
                    ))}

                    <ContactShadows position={[0, -5.9, 0]} opacity={0.8} scale={40} blur={3} far={15} resolution={512} color="#331100" />

                    {/* Spice Particles */}
                    <Sparkles count={500} scale={30} size={5} speed={0.2} opacity={0.6} color="#ffaa00" noise={0.5} />
                    <Sparkles count={200} scale={20} size={8} speed={0.4} opacity={0.4} color="#ff4400" />
                    <Sparkles count={100} scale={15} size={12} speed={0.1} opacity={0.8} color="#ffffaa" />

                    <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.2 + combo * 0.05} maxPolarAngle={Math.PI / 1.6} minPolarAngle={Math.PI / 3} />

                    <EffectComposer enableNormalPass={false}>
                        <Bloom luminanceThreshold={0.5} mipmapBlur intensity={1.8 + combo * 0.15} />
                        <DepthOfField focusDistance={0.03} focalLength={0.06} bokehScale={4} height={480} />
                        <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.003 + combo * 0.001, 0.003 + combo * 0.001)} radialModulation={false} modulationOffset={0} />
                        <Noise opacity={0.06} />
                        <Vignette eskil={false} offset={0.1} darkness={1.2} />
                        {glitchActive && (<Glitch delay={new THREE.Vector2(0, 0)} duration={new THREE.Vector2(0.2, 0.5)} mode={GlitchMode.SPORADIC} active ratio={0.8} />)}
                    </EffectComposer>
                </Canvas>
            </div>
        </div>
    );
};

export default ArrakisSands;
