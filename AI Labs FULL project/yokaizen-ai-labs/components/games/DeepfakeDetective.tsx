/// <reference types="@react-three/fiber" />
import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Float, Sparkles, MeshTransmissionMaterial, Environment, ContactShadows, Grid, Text, Html } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch, Vignette, Noise, DepthOfField } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Activity, Shield, Zap, AlertTriangle, Flame, Target, Trophy, SkullIcon, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../../services/audioService';
import { useDialogue } from '../../contexts/DialogueContext';

export interface DeepfakeDetectiveProps {
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
        setLife(l => l + delta * 2);
        groupRef.current.position.y += delta * 2;
        groupRef.current.scale.setScalar(Math.max(0, 1 - life * 0.5));
        if (life > 2) onComplete();
    });

    return (
        <group ref={groupRef} position={position}>
            <Text color={color} fontSize={1} font="https://fonts.gstatic.com/s/syncopate/v13/pe0sMIuPIYBCpEV5eFdCBfe_m_s.woff" anchorX="center" anchorY="middle" outlineWidth={0.05} outlineColor="#000">
                {text}
            </Text>
        </group>
    );
};

// --- Impact Ring Effect ---
const ImpactRing = ({ position, color, onComplete }: { position: [number, number, number], color: string, onComplete: () => void }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.MeshBasicMaterial>(null);
    const [life, setLife] = useState(0);

    useFrame((_, delta) => {
        if (!meshRef.current || !matRef.current) return;
        const speed = 4;
        setLife(l => l + delta * speed);
        meshRef.current.scale.setScalar(1 + life * 5);
        matRef.current.opacity = Math.max(0, 1 - life);
        if (life > 1) onComplete();
    });

    return (
        <mesh ref={meshRef} position={position}>
            <ringGeometry args={[0.8, 1, 32]} />
            <meshBasicMaterial ref={matRef} color={color} transparent opacity={1} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
    );
};

// --- AAA 3D Target Node ---
const TargetNode = ({ position, color, scale, onClick, id, isHoveredGlobal }: {
    position: [number, number, number]; color: string; scale: number; onClick: (id: string, pos: [number, number, number]) => void; id: string; isHoveredGlobal: (s: boolean) => void;
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const coreRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
        if (groupRef.current && coreRef.current) {
            const t = state.clock.elapsedTime;
            groupRef.current.rotation.x = t * 1.5;
            groupRef.current.rotation.z = t * 1;
            coreRef.current.rotation.y = -t * 3;

            const pulse = 1 + Math.sin(t * 8) * 0.05;
            const targetScale = scale * pulse * (hovered ? 1.4 : 1);
            groupRef.current.scale.lerp(new THREE.Vector3().setScalar(targetScale), 0.15);
        }
    });

    return (
        <Float speed={4} rotationIntensity={1.5} floatIntensity={2}>
            <group ref={groupRef} position={position}
                onClick={(e) => { e.stopPropagation(); onClick(id, position); setHovered(false); isHoveredGlobal(false); document.body.style.cursor = 'default'; }}
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); isHoveredGlobal(true); document.body.style.cursor = 'crosshair'; }}
                onPointerOut={(e) => { e.stopPropagation(); setHovered(false); isHoveredGlobal(false); document.body.style.cursor = 'default'; }}>

                {/* Outer Glass Shell */}
                <mesh>
                    <icosahedronGeometry args={[0.6, 1]} />
                    <MeshTransmissionMaterial backside samples={4} thickness={0.8} chromaticAberration={hovered ? 2 : 0.5} anisotropy={0.5} distortion={hovered ? 0.8 : 0.2} distortionScale={0.5} temporalDistortion={0.2} color={color} emissive={color} emissiveIntensity={hovered ? 1 : 0.2} clearcoat={1} clearcoatRoughness={0.1} />
                </mesh>

                {/* Inner Glowing Core */}
                <mesh ref={coreRef}>
                    <octahedronGeometry args={[0.3, 0]} />
                    <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={hovered ? 5 : 2} wireframe={!hovered} />
                </mesh>

                <pointLight distance={6} intensity={hovered ? 5 : 2} color={color} />
            </group>
        </Float>
    );
};

// --- AAA 3D Hazard Node ---
const HazardNode = ({ position, onClick, id, isHoveredGlobal }: {
    position: [number, number, number]; onClick: (id: string, pos: [number, number, number]) => void; id: string; isHoveredGlobal: (s: boolean) => void;
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const ringRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (meshRef.current) {
            meshRef.current.rotation.x = t * 3;
            meshRef.current.rotation.y = t * 4;
            const s = 0.6 + Math.sin(t * 15) * 0.1;
            meshRef.current.scale.lerp(new THREE.Vector3().setScalar(s * (hovered ? 1.2 : 1)), 0.2);
        }
        if (ringRef.current) {
            ringRef.current.rotation.x = Math.PI / 2;
            ringRef.current.rotation.z = -t * 5;
            ringRef.current.scale.setScalar(1 + Math.sin(t * 20) * 0.1);
        }
    });

    return (
        <group position={position}
            onClick={(e) => { e.stopPropagation(); onClick(id, position); setHovered(false); isHoveredGlobal(false); document.body.style.cursor = 'default'; }}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); isHoveredGlobal(true); document.body.style.cursor = 'not-allowed'; }}
            onPointerOut={(e) => { e.stopPropagation(); setHovered(false); isHoveredGlobal(false); document.body.style.cursor = 'default'; }}>

            {/* Spiky Core */}
            <mesh ref={meshRef}>
                <torusKnotGeometry args={[0.3, 0.1, 64, 8, 2, 3]} />
                <meshStandardMaterial color="#000000" emissive="#ff0044" emissiveIntensity={hovered ? 8 : 4} roughness={0.1} metalness={1} wireframe={hovered} />
            </mesh>

            {/* Warning Ring */}
            <mesh ref={ringRef}>
                <ringGeometry args={[0.7, 0.75, 32]} />
                <meshBasicMaterial color="#ff0000" transparent opacity={hovered ? 0.8 : 0.3} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
            </mesh>

            <pointLight distance={5} intensity={hovered ? 6 : 3} color="#ff0000" />
        </group>
    );
};

// --- Dynamic Camera Rig ---
const CameraRig = ({ intensity, isPlaying }: { intensity: number, isPlaying: boolean }) => {
    useFrame((state) => {
        if (!isPlaying) return;
        const t = state.clock.elapsedTime;
        const shake = intensity > 0.5 ? (Math.random() - 0.5) * intensity * 0.4 : 0;
        state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, Math.sin(t * 0.3) * 3 + shake, 0.05);
        state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, Math.cos(t * 0.2) * 2 + shake, 0.05);
        state.camera.lookAt(0, 0, 0);
    });
    return null;
};

// --- Types ---
interface GameNode { id: string; position: [number, number, number]; type: 'target' | 'hazard'; color: string; spawnedAt: number; lifetime: number; }
interface FloatingEffect { id: string; position: [number, number, number]; text: string; color: string; type: 'score' | 'ring' }

const TARGET_COLORS = ['#00ffff', '#ff00ff', '#8800ff', '#00ffaa'];
const genPos = (): [number, number, number] => [(Math.random() - 0.5) * 14, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8];

// --- Main Component ---
export const DeepfakeDetective: React.FC<DeepfakeDetectiveProps> = ({ onComplete, difficulty, t }) => {
    const { queueDialogue } = useDialogue();
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(45);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');
    const [combo, setCombo] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [nodes, setNodes] = useState<GameNode[]>([]);
    const [effects, setEffects] = useState<FloatingEffect[]>([]);
    const [glitchActive, setGlitchActive] = useState(false);
    const [screenFlash, setScreenFlash] = useState<string | null>(null);
    const [advisorMsg, setAdvisorMsg] = useState(t('game.advisor.adversary_breach'));
    const [adversaryMsg, setAdversaryMsg] = useState(t('game.adversary.same_look'));

    // Fix: We don't actually need to store global hover state if it's just for cursor,
    // but we pass a dummy function to nodes that expect it.
    const setIsHoveredGlobal = useCallback((s: boolean) => { }, []);

    const diffMul = difficulty === 'HARD' ? 1.5 : difficulty === 'MEDIUM' ? 1.2 : 1;
    const spawnInterval = Math.max(350, 1000 - (score / 150) * 80);
    const hazardChance = Math.min(0.45, 0.15 + (score / 1500));

    // Narrative: Mission Briefing
    useEffect(() => {
        queueDialogue([
            { id: `dd-brief-${Date.now()}`, character: 'BYTE', text: t('game.instructions.click_targets') },
            { id: `dd-brief2-${Date.now()}`, character: 'SYNTAX', text: t('game.instructions.avoid_hazards'), isGlitchy: true },
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
        const aLines = [t('game.advisor.adversary_breach'), t('game.advisor.reflexes_exceed'), t('game.advisor.target_rate_optimal'), `${t('game.hud.combo_chain')}: ${combo}x`];
        const eLines = [t('game.adversary.same_look'), t('game.adversary.predictable'), t('game.adversary.dare_click'), `${combo}x ${t('game.hud.combo')}...`];
        const iv = setInterval(() => {
            if (Math.random() > 0.6) { setAdversaryMsg(eLines[Math.floor(Math.random() * eLines.length)]); audio.playSystemMessage?.({ type: 'warning' }); }
            else { setAdvisorMsg(aLines[Math.floor(Math.random() * aLines.length)]); audio.playSystemMessage?.({ type: 'success' }); }
        }, 4000);
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
                            { id: `dd-win-${Date.now()}`, character: 'SYNTAX', text: `${t('game.hud.final_score')}: ${score}. ${t('game.hud.max_combo')}: ${maxCombo}x.` },
                            { id: `dd-win2-${Date.now()}`, character: 'ATHENA', text: t('game.state.system_secured') },
                        ]);
                    } else {
                        audio.playError(); queueDialogue([
                            { id: `dd-fail-${Date.now()}`, character: 'BYTE', text: t('game.state.breach_detected'), isGlitchy: true },
                        ]);
                    }
                    onComplete(score, { completionTime: 45 - prev, difficulty, maxCombo });
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
        setScreenFlash('rgba(0, 255, 255, 0.1)'); setTimeout(() => setScreenFlash(null), 50);

        // Spawn 3D text and ring
        const effId = `${Date.now()}`;
        setEffects(prev => [...prev,
        { id: `score-${effId}`, type: 'score', text: `+${pts}`, color: '#00ffff', position: [pos[0], pos[1] + 1, pos[2]] },
        { id: `ring-${effId}`, type: 'ring', text: '', color: '#00ffff', position: pos }
        ]);
    }, [gameState, combo, diffMul]);

    const handleHazardClick = useCallback((id: string, pos: [number, number, number]) => {
        if (gameState !== 'PLAYING') return;
        setNodes(prev => prev.filter(n => n.id !== id));
        audio.playError(); setCombo(0);
        const loss = 200;
        setScore(s => Math.max(0, s - loss));
        setGlitchActive(true); setScreenFlash('rgba(255, 0, 0, 0.3)');
        setTimeout(() => { setGlitchActive(false); setScreenFlash(null); }, 400);

        const effId = `${Date.now()}`;
        setEffects(prev => [...prev,
        { id: `score-${effId}`, type: 'score', text: `-${loss}`, color: '#ff0000', position: [pos[0], pos[1] + 1, pos[2]] },
        { id: `ring-${effId}`, type: 'ring', text: '', color: '#ff0000', position: pos }
        ]);
    }, [gameState]);

    const removeEffect = useCallback((id: string) => {
        setEffects(prev => prev.filter(e => e.id !== id));
    }, []);

    return (
        <div className="relative w-full h-[700px] rounded-[32px] overflow-hidden border border-white/10 bg-[#020005] shadow-[0_0_50px_rgba(0,0,0,0.8)] font-sans">
            <AnimatePresence>{screenFlash && (<motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="absolute inset-0 z-30 pointer-events-none mix-blend-screen" style={{ backgroundColor: screenFlash }} />)}</AnimatePresence>

            {/* AAA Glassmorphic HUD */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
                <div className="flex flex-col gap-4 filter drop-shadow-lg">
                    {/* Score Panel */}
                    <div className="bg-black/40 backdrop-blur-2xl rounded-2xl p-4 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="flex items-center gap-2 text-cyan-400 mb-1">
                            <Activity className="w-5 h-5 animate-pulse" />
                            <span className="text-xs uppercase tracking-[0.2em] font-black text-cyan-300/80">{t('game.hud.score')}</span>
                        </div>
                        <motion.div
                            key={score}
                            initial={{ y: -10, opacity: 0, scale: 1.1 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-200 tabular-nums uppercase tracking-tighter"
                            style={{ textShadow: '0 0 20px rgba(0,255,255,0.4)' }}
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
                                className="bg-gradient-to-br from-orange-900/40 to-red-900/40 backdrop-blur-2xl rounded-2xl p-4 border border-orange-500/30 shadow-[0_10px_30px_rgba(255,100,0,0.2)]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-500/20 rounded-full">
                                        <Flame className="w-6 h-6 text-orange-400 animate-bounce" />
                                    </div>
                                    <div>
                                        <div className="text-orange-400 font-black text-3xl italic tracking-tighter" style={{ textShadow: '0 0 15px rgba(255,150,0,0.6)' }}>{combo}x</div>
                                        <div className="text-[9px] text-orange-300/60 uppercase tracking-[0.2em] font-bold">{t('game.hud.combo_chain')}</div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex flex-col items-end gap-4 filter drop-shadow-lg">
                    {/* Time Panel */}
                    <div className="bg-black/40 backdrop-blur-2xl rounded-2xl p-4 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] min-w-[140px] text-right">
                        <div className="flex items-center justify-end gap-2 text-indigo-400 mb-1">
                            <span className="text-xs uppercase tracking-[0.2em] font-black text-indigo-300/80">{t('game.hud.time')}</span>
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className={`text-4xl font-black tabular-nums tracking-tighter ${timeLeft <= 10 ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-300 animate-pulse' : 'text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200'}`} style={{ textShadow: timeLeft <= 10 ? '0 0 20px rgba(255,0,0,0.6)' : '0 0 20px rgba(100,100,255,0.4)' }}>
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
                {timeLeft > 40 && gameState === 'PLAYING' && (
                    <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }} transition={{ duration: 0.8, ease: "easeOut" }} className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                        <div className="bg-black/60 backdrop-blur-3xl p-10 rounded-[32px] border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.6)] text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 to-transparent opacity-50"></div>
                            <div className="text-cyan-400 font-black text-3xl uppercase tracking-widest mb-4 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
                                <Target className="inline w-8 h-8 mr-3 -mt-1" /> {t('game.instructions.click_targets')}
                            </div>
                            <div className="text-red-400 font-bold text-lg uppercase tracking-wider drop-shadow-[0_0_10px_rgba(255,0,0,0.5)]">
                                <SkullIcon className="inline w-5 h-5 mr-2 -mt-1" /> {t('game.instructions.avoid_hazards')}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Agent Comms Panel (AAA Style) */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row gap-4 z-10 pointer-events-none">
                <div className="flex-1 bg-black/50 backdrop-blur-2xl rounded-2xl p-4 border border-white/5 border-l-4 border-l-indigo-500 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[30px] -translate-y-1/2 translate-x-1/2"></div>
                    <div className="text-[10px] text-indigo-400 mb-2 uppercase tracking-[0.2em] font-black flex items-center gap-2">
                        <Shield className="w-4 h-4" /> {t('game.advisor.label')}
                    </div>
                    <div className="text-sm text-indigo-100 font-mono leading-relaxed relative z-10">{advisorMsg}</div>
                </div>
                <div className="flex-1 bg-black/50 backdrop-blur-2xl rounded-2xl p-4 border border-white/5 border-l-4 border-l-red-500 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-[30px] -translate-y-1/2 translate-x-1/2"></div>
                    <div className="text-[10px] text-red-500 mb-2 uppercase tracking-[0.2em] font-black flex items-center gap-2">
                        <Zap className="w-4 h-4" /> {t('game.adversary.label')}
                    </div>
                    <div className="text-sm text-red-100 font-mono leading-relaxed relative z-10">{adversaryMsg}</div>
                </div>
            </div>

            {/* Game Over Cinematic Screen */}
            <AnimatePresence>
                {gameState !== 'PLAYING' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-xl">
                        <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", damping: 20, stiffness: 100 }} className="text-center p-10 w-full max-w-lg rounded-[40px] border border-white/10 bg-gradient-to-b from-gray-900/90 to-black shadow-[0_50px_100px_rgba(0,0,0,0.8)] relative overflow-hidden">

                            {/* Background Glows */}
                            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 blur-[80px] opacity-30 ${gameState === 'SUCCESS' ? 'bg-cyan-500' : 'bg-red-500'}`}></div>

                            <div className={`w-28 h-28 mx-auto mb-8 rounded-full flex items-center justify-center relative z-10 ${gameState === 'SUCCESS' ? 'bg-cyan-900/40 border-2 border-cyan-400 shadow-[0_0_30px_rgba(0,255,255,0.4)]' : 'bg-red-900/40 border-2 border-red-500 shadow-[0_0_30px_rgba(255,0,0,0.4)]'}`}>
                                {gameState === 'SUCCESS' ? <Trophy className="w-14 h-14 text-cyan-400 drop-shadow-md" /> : <SkullIcon className="w-14 h-14 text-red-400 drop-shadow-md" />}
                            </div>

                            <h2 className={`text-4xl sm:text-6xl font-black uppercase tracking-tighter mb-4 relative z-10 ${gameState === 'SUCCESS' ? 'text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-300' : 'text-transparent bg-clip-text bg-gradient-to-b from-white to-red-500'}`} style={{ textShadow: gameState === 'SUCCESS' ? '0 10px 30px rgba(0,255,255,0.3)' : '0 10px 30px rgba(255,0,0,0.3)' }}>
                                {gameState === 'SUCCESS' ? t('game.state.system_secured') : t('game.state.breach_detected')}
                            </h2>

                            <div className="bg-black/50 rounded-2xl p-6 border border-white/5 mb-8 relative z-10">
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

            {/* Premium 3D Canvas */}
            <div className={`absolute inset-0 z-0 ${gameState !== 'PLAYING' ? 'pointer-events-none' : ''}`}>
                <Canvas camera={{ position: [0, 0, 14], fov: 60 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}>
                    <color attach="background" args={['#05020a']} />
                    <fog attach="fog" args={['#05020a', 10, 30]} />

                    <Environment preset="city" />
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[10, 10, 5]} intensity={2} color="#00ffff" />
                    <directionalLight position={[-10, -10, -5]} intensity={1} color="#ff00ff" />
                    <pointLight position={[0, -5, -5]} intensity={2} color="#4400ff" />

                    {/* Cyberspace Grid Floor */}
                    <Grid position={[0, -6, 0]} args={[50, 50]} cellSize={1} cellThickness={1.5} cellColor="#00ffff" sectionSize={5} sectionThickness={2} sectionColor="#4400ff" fadeDistance={30} fadeStrength={1.5} />

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
                        <ImpactRing key={eff.id} position={eff.position} color={eff.color} onComplete={() => removeEffect(eff.id)} />
                    ))}

                    <ContactShadows position={[0, -5.9, 0]} opacity={0.6} scale={30} blur={2.5} far={15} resolution={512} color="#000000" />

                    <Sparkles count={400} scale={25} size={3} speed={0.4 + combo * 0.1} opacity={0.4} color="#00ffff" />
                    <Sparkles count={150} scale={20} size={6} speed={0.8} opacity={0.3} color="#ff00ff" />

                    <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.3 + combo * 0.05} maxPolarAngle={Math.PI / 1.5} minPolarAngle={Math.PI / 3} />

                    <EffectComposer enableNormalPass={false}>
                        <Bloom luminanceThreshold={0.5} mipmapBlur intensity={1.5 + combo * 0.1} />
                        <DepthOfField focusDistance={0.02} focalLength={0.05} bokehScale={3} height={480} />
                        <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.002 + combo * 0.001, 0.002 + combo * 0.001)} radialModulation={false} modulationOffset={0} />
                        <Noise opacity={0.05} />
                        <Vignette eskil={false} offset={0.1} darkness={1.3} />
                        {glitchActive && (<Glitch delay={new THREE.Vector2(0, 0)} duration={new THREE.Vector2(0.2, 0.5)} mode={GlitchMode.SPORADIC} active ratio={0.8} />)}
                    </EffectComposer>
                </Canvas>
            </div>
        </div>
    );
};

export default DeepfakeDetective;
