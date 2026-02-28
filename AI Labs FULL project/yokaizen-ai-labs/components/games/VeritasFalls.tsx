/// <reference types="@react-three/fiber" />
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Sparkles, MeshTransmissionMaterial, Environment, ContactShadows, Text, Line } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch, Vignette, Noise, DepthOfField } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Activity, Shield, Zap, AlertTriangle, Flame, Target, Trophy, SkullIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../../services/audioService';
import { useDialogue } from '../../contexts/DialogueContext';

export interface VeritasFallsProps {
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
        groupRef.current.position.y -= delta * 0.5; // Falls downwards
        groupRef.current.position.x += delta * 1.5 * (Math.random() - 0.5);
        groupRef.current.scale.setScalar(Math.max(0, 1 - life * 0.5));
        if (life > 2) onComplete();
    });

    return (
        <group ref={groupRef} position={position}>
            <Text color={color} fontSize={1.2} font="https://fonts.gstatic.com/s/syncopate/v13/pe0sMIuPIYBCpEV5eFdCBfe_m_s.woff" anchorX="center" anchorY="middle" outlineWidth={0.08} outlineColor="#110022">
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

// --- AAA Truth Orb (Target Node) ---
const TargetNode = ({ position, color, scale, onClick, id, isHoveredGlobal }: {
    position: [number, number, number]; color: string; scale: number; onClick: (id: string, pos: [number, number, number]) => void; id: string; isHoveredGlobal: (s: boolean) => void;
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const coreRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
        if (groupRef.current && coreRef.current) {
            const t = state.clock.elapsedTime;
            // Falls downwards slowly while oscillating
            groupRef.current.position.y -= 0.01;
            if (groupRef.current.position.y < -8) groupRef.current.position.y = 8;

            groupRef.current.rotation.x = t * 1.5;
            groupRef.current.rotation.z = t * 1;
            coreRef.current.rotation.y = -t * 3;

            const pulse = 1 + Math.sin(t * 8) * 0.05;
            const targetScale = scale * pulse * (hovered ? 1.4 : 1);
            groupRef.current.scale.lerp(new THREE.Vector3().setScalar(targetScale), 0.15);
        }
    });

    return (
        <Float speed={4} rotationIntensity={1.5} floatIntensity={1}>
            <group ref={groupRef} position={position}
                onClick={(e) => { e.stopPropagation(); onClick(id, position); setHovered(false); isHoveredGlobal(false); document.body.style.cursor = 'default'; }}
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); isHoveredGlobal(true); document.body.style.cursor = 'crosshair'; }}
                onPointerOut={(e) => { e.stopPropagation(); setHovered(false); isHoveredGlobal(false); document.body.style.cursor = 'default'; }}>

                {/* Outer Glass Sphere */}
                <mesh>
                    <sphereGeometry args={[0.6, 64, 64]} />
                    <MeshTransmissionMaterial backside samples={4} thickness={0.8} chromaticAberration={hovered ? 2 : 0.8} anisotropy={0.5} distortion={hovered ? 1.5 : 0.5} distortionScale={0.5} temporalDistortion={0.5} color={color} emissive={color} emissiveIntensity={hovered ? 1.5 : 0.3} clearcoat={1} clearcoatRoughness={0.1} />
                </mesh>

                {/* Inner Bright Point */}
                <mesh ref={coreRef}>
                    <sphereGeometry args={[0.2, 32, 32]} />
                    <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={hovered ? 8 : 4} />
                </mesh>

                <pointLight distance={8} intensity={hovered ? 6 : 3} color={color} />
            </group>
        </Float>
    );
};

// --- AAA Corrupt Shard (Hazard Node) ---
const HazardNode = ({ position, onClick, id, isHoveredGlobal }: {
    position: [number, number, number]; onClick: (id: string, pos: [number, number, number]) => void; id: string; isHoveredGlobal: (s: boolean) => void;
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const wrapRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (meshRef.current) {
            meshRef.current.position.y -= 0.015;
            if (meshRef.current.position.y < -8) meshRef.current.position.y = 8;

            meshRef.current.rotation.x = t * 4;
            meshRef.current.rotation.y = t * 3;
            // Glitchy scaling
            const glitch = (Math.random() > 0.95) ? 1.5 : 1;
            meshRef.current.scale.lerp(new THREE.Vector3().setScalar(0.7 * glitch * (hovered ? 1.3 : 1)), 0.3);
        }
        if (wrapRef.current) {
            wrapRef.current.rotation.z = -t * 5;
            wrapRef.current.rotation.x = t * 2;
            wrapRef.current.position.y = meshRef.current?.position.y || 0;
            wrapRef.current.scale.setScalar(1 + Math.sin(t * 20) * 0.15);
        }
    });

    return (
        <group position={[position[0], position[1], position[2]]}
            onClick={(e) => { e.stopPropagation(); onClick(id, position); setHovered(false); isHoveredGlobal(false); document.body.style.cursor = 'default'; }}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); isHoveredGlobal(true); document.body.style.cursor = 'not-allowed'; }}
            onPointerOut={(e) => { e.stopPropagation(); setHovered(false); isHoveredGlobal(false); document.body.style.cursor = 'default'; }}>

            {/* Corrupt Core */}
            <mesh ref={meshRef}>
                <octahedronGeometry args={[0.5, 0]} />
                <meshStandardMaterial color="#110000" emissive="#ff0055" emissiveIntensity={hovered ? 10 : 5} roughness={0.1} metalness={1} wireframe={hovered} />
            </mesh>

            {/* Digital Glitch Wrap */}
            <mesh ref={wrapRef}>
                <icosahedronGeometry args={[0.6, 1]} />
                <meshBasicMaterial color="#ff00aa" wireframe transparent opacity={hovered ? 0.9 : 0.4} blending={THREE.AdditiveBlending} />
            </mesh>

            <pointLight distance={6} intensity={hovered ? 10 : 5} color="#ff0055" />
        </group>
    );
};

// --- Digital Waterfall Background ---
const DigitalFalls = () => {
    const group = useRef<THREE.Group>(null);
    useFrame((state) => {
        if (group.current) {
            group.current.position.y = (state.clock.elapsedTime * 8) % 20 - 10;
        }
    });
    return (
        <group ref={group}>
            {/* Fast falling sparkles mimicking rain/data */}
            <Sparkles count={800} scale={[30, 40, 30]} size={8} speed={0} opacity={0.6} color="#8844ff" noise={0} />
            <Sparkles count={400} scale={[20, 60, 20]} size={12} speed={0} opacity={0.4} color="#ff00aa" noise={0} />
            <Sparkles count={100} scale={[15, 30, 15]} size={20} speed={0} opacity={0.8} color="#00ffff" noise={0} />
        </group>
    );
};

// --- Camera Rig for interactions ---
const CameraRig = ({ intensity, isPlaying }: { intensity: number, isPlaying: boolean }) => {
    useFrame((state) => {
        if (!isPlaying) return;
        const t = state.clock.elapsedTime;
        // Slow downward pan feel
        const downPan = Math.sin(t * 0.1) * 2;
        const shake = intensity > 0.5 ? (Math.random() - 0.5) * intensity * 0.4 : 0;
        state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, Math.sin(t * 0.3) * 2 + shake, 0.05);
        state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, downPan + shake, 0.05);
        state.camera.lookAt(0, downPan * 0.5, 0);
    });
    return null;
};

// --- Types ---
interface GameNode { id: string; position: [number, number, number]; type: 'target' | 'hazard'; color: string; spawnedAt: number; lifetime: number; }
interface FloatingEffect { id: string; position: [number, number, number]; text: string; color: string; type: 'score' | 'ring' }

const TARGET_COLORS = ['#8844ff', '#ff00aa', '#00ffff', '#e0b0ff'];
const genPos = (): [number, number, number] => [(Math.random() - 0.5) * 16, Math.random() * 8 + 4, (Math.random() - 0.5) * 8]; // Start higher for falling effect

// --- Main Component ---
export const VeritasFalls: React.FC<VeritasFallsProps> = ({ onComplete, difficulty, t }) => {
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
    const [adversaryMsg, setAdversaryMsg] = useState(t('game.adversary.dare_click'));

    const setIsHoveredGlobal = useCallback((s: boolean) => { }, []);

    const diffMul = difficulty === 'HARD' ? 1.5 : difficulty === 'MEDIUM' ? 1.2 : 1;
    const spawnInterval = Math.max(300, 900 - (score / 150) * 80);
    const hazardChance = Math.min(0.5, 0.2 + (score / 1200));

    // Narrative: Mission Briefing
    useEffect(() => {
        queueDialogue([
            { id: `vf-brief-${Date.now()}`, character: 'BYTE', text: t('game.instructions.click_targets') },
            { id: `vf-brief2-${Date.now()}`, character: 'SYNTAX', text: t('game.instructions.avoid_hazards'), isGlitchy: true },
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
        const aLines = [t('game.advisor.adversary_breach'), t('game.advisor.reflexes_exceed'), t('game.advisor.core_holding'), `${t('game.hud.combo_chain')}: ${combo}x`];
        const eLines = [t('game.adversary.dare_click'), t('game.adversary.core_exposed'), t('game.adversary.cracks_attention'), `${combo}x ${t('game.hud.combo')}...`];
        const iv = setInterval(() => {
            if (Math.random() > 0.6) { setAdversaryMsg(eLines[Math.floor(Math.random() * eLines.length)]); audio.playSystemMessage?.({ type: 'warning' }); setGlitchActive(true); setTimeout(() => setGlitchActive(false), 200); }
            else { setAdvisorMsg(aLines[Math.floor(Math.random() * aLines.length)]); audio.playSystemMessage?.({ type: 'success' }); text: t('game.state.system_secured') }
        }, 3500);
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
                            { id: `vf-win-${Date.now()}`, character: 'SYNTAX', text: `${t('game.hud.final_score')}: ${score}. ${t('game.hud.max_combo')}: ${maxCombo}x.` },
                            { id: `vf-win2-${Date.now()}`, character: 'ATHENA', text: t('game.state.system_secured') },
                        ]);
                    } else {
                        audio.playError(); queueDialogue([
                            { id: `vf-fail-${Date.now()}`, character: 'BYTE', text: t('game.state.mission_failed'), isGlitchy: true },
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
        setScreenFlash('rgba(136, 68, 255, 0.15)'); setTimeout(() => setScreenFlash(null), 60);

        const effId = `${Date.now()}`;
        setEffects(prev => [...prev,
        { id: `score-${effId}`, type: 'score', text: `+${pts}`, color: '#c088ff', position: [pos[0], pos[1] + 1, pos[2]] },
        { id: `ring-${effId}`, type: 'ring', text: '', color: '#8844ff', position: pos }
        ]);
    }, [gameState, combo, diffMul]);

    const handleHazardClick = useCallback((id: string, pos: [number, number, number]) => {
        if (gameState !== 'PLAYING') return;
        setNodes(prev => prev.filter(n => n.id !== id));
        audio.playError(); setCombo(0);
        const loss = 300;
        setScore(s => Math.max(0, s - loss));
        setGlitchActive(true); setScreenFlash('rgba(255, 0, 85, 0.4)');
        setTimeout(() => { setGlitchActive(false); setScreenFlash(null); }, 400);

        const effId = `${Date.now()}`;
        setEffects(prev => [...prev,
        { id: `score-${effId}`, type: 'score', text: `-${loss}`, color: '#ff0055', position: [pos[0], pos[1] + 1, pos[2]] },
        { id: `ring-${effId}`, type: 'ring', text: '', color: '#ff00aa', position: pos }
        ]);
    }, [gameState]);

    const removeEffect = useCallback((id: string) => {
        setEffects(prev => prev.filter(e => e.id !== id));
    }, []);

    return (
        <div className="relative w-full h-[700px] rounded-[32px] overflow-hidden border border-[rgba(136,68,255,0.3)] bg-[#080011] shadow-[0_0_60px_rgba(136,68,255,0.2)] font-sans">
            <AnimatePresence>
                {screenFlash && (
                    <motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="absolute inset-0 z-30 pointer-events-none mix-blend-screen" style={{ backgroundColor: screenFlash }} />
                )}
            </AnimatePresence>

            {/* AAA Glassmorphic Violet HUD */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
                <div className="flex flex-col gap-4 filter drop-shadow-xl">
                    {/* Score Panel */}
                    <div className="bg-[#110022]/60 backdrop-blur-2xl rounded-2xl p-4 border border-[#8844ff]/30 shadow-[0_10px_30px_rgba(136,68,255,0.2)] relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#8844ff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="flex items-center gap-2 text-[#b088ff] mb-1">
                            <Activity className="w-5 h-5 animate-pulse" />
                            <span className="text-xs uppercase tracking-[0.2em] font-black text-[#d0b0ff]/80">{t('game.hud.score')}</span>
                        </div>
                        <motion.div
                            key={score}
                            initial={{ y: -10, opacity: 0, scale: 1.1 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#c088ff] tabular-nums uppercase tracking-tighter"
                            style={{ textShadow: '0 0 20px rgba(136,68,255,0.6)' }}
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
                                className="bg-gradient-to-br from-[#ff0055]/40 to-[#440022]/60 backdrop-blur-2xl rounded-2xl p-4 border border-[#ff00aa]/40 shadow-[0_10px_30px_rgba(255,0,170,0.3)]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-[#ff00aa]/20 rounded-full">
                                        <Flame className="w-6 h-6 text-[#ff00aa] animate-[pulse_0.5s_infinite]" />
                                    </div>
                                    <div>
                                        <div className="text-[#ff44aa] font-black text-3xl italic tracking-tighter" style={{ textShadow: '0 0 15px rgba(255,0,170,0.8)' }}>{combo}x</div>
                                        <div className="text-[9px] text-[#ff88cc]/60 uppercase tracking-[0.2em] font-bold">{t('game.hud.combo_chain')}</div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex flex-col items-end gap-4 filter drop-shadow-xl">
                    {/* Time Panel */}
                    <div className="bg-[#110022]/60 backdrop-blur-2xl rounded-2xl p-4 border border-[#8844ff]/30 shadow-[0_10px_30px_rgba(136,68,255,0.2)] min-w-[140px] text-right">
                        <div className="flex items-center justify-end gap-2 text-[#00ffff] mb-1">
                            <span className="text-xs uppercase tracking-[0.2em] font-black text-[#88ffff]/80">{t('game.hud.time')}</span>
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className={`text-4xl font-black tabular-nums tracking-tighter ${timeLeft <= 10 ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-[#ff00aa] animate-pulse' : 'text-transparent bg-clip-text bg-gradient-to-r from-[#ccffff] to-[#00ffff]'}`} style={{ textShadow: timeLeft <= 10 ? '0 0 20px rgba(255,0,170,0.8)' : '0 0 20px rgba(0,255,255,0.6)' }}>
                            {timeLeft}s
                        </div>
                    </div>

                    {/* Difficulty Badge */}
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border backdrop-blur-md ${difficulty === 'HARD' ? 'border-[#ff0055]/50 text-[#ff0055] bg-[#ff0055]/10 shadow-[0_0_15px_rgba(255,0,85,0.4)]' : difficulty === 'MEDIUM' ? 'border-[#ff00aa]/50 text-[#ff00aa] bg-[#ff00aa]/10 shadow-[0_0_15px_rgba(255,0,170,0.4)]' : 'border-[#00ffff]/50 text-[#00ffff] bg-[#00ffff]/10 shadow-[0_0_15px_rgba(0,255,255,0.4)]'}`}>
                        {t(`game.difficulty.${difficulty.toLowerCase()}`)}
                    </div>
                </div>
            </div>

            {/* Cinematic Instructions */}
            <AnimatePresence>
                {timeLeft > 38 && gameState === 'PLAYING' && (
                    <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 1.5, filter: 'blur(20px)' }} transition={{ duration: 0.8, ease: "easeOut" }} className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                        <div className="bg-[#110022]/80 backdrop-blur-3xl p-10 rounded-[32px] border border-[#ff00aa]/40 shadow-[0_30px_60px_rgba(255,0,170,0.5)] text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-[#8844ff]/20 to-transparent opacity-70"></div>
                            <div className="text-[#00ffff] font-black text-3xl uppercase tracking-widest mb-4 drop-shadow-[0_0_15px_rgba(0,255,255,0.8)]">
                                <Target className="inline w-8 h-8 mr-3 -mt-1" /> {t('game.instructions.click_targets')}
                            </div>
                            <div className="text-[#ff0055] font-bold text-lg uppercase tracking-wider drop-shadow-[0_0_10px_rgba(255,0,85,0.8)]">
                                <SkullIcon className="inline w-5 h-5 mr-2 -mt-1 animate-pulse" /> {t('game.instructions.avoid_hazards')}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Agent Comms Panel */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row gap-4 z-10 pointer-events-none">
                <div className="flex-1 bg-[#110022]/70 backdrop-blur-2xl rounded-2xl p-4 border border-[#8844ff]/30 border-l-4 border-l-[#00ffff] shadow-[0_10px_30px_rgba(0,255,255,0.1)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#00ffff]/10 rounded-full blur-[30px] -translate-y-1/2 translate-x-1/2"></div>
                    <div className="text-[10px] text-[#00ffff] mb-2 uppercase tracking-[0.2em] font-black flex items-center gap-2">
                        <Shield className="w-4 h-4" /> {t('game.advisor.label')}
                    </div>
                    <div className="text-sm text-[#ccffff]/90 font-mono leading-relaxed relative z-10">{advisorMsg}</div>
                </div>
                <div className="flex-1 bg-[#110022]/70 backdrop-blur-2xl rounded-2xl p-4 border border-[#8844ff]/30 border-l-4 border-l-[#ff0055] shadow-[0_10px_30px_rgba(255,0,85,0.1)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff0055]/10 rounded-full blur-[30px] -translate-y-1/2 translate-x-1/2"></div>
                    <div className="text-[10px] text-[#ff0055] mb-2 uppercase tracking-[0.2em] font-black flex items-center gap-2">
                        <Zap className="w-4 h-4" /> {t('game.adversary.label')}
                    </div>
                    <div className="text-sm text-[#ffcccc]/90 font-mono leading-relaxed relative z-10">{adversaryMsg}</div>
                </div>
            </div>

            {/* Game Over Cinematic Screen */}
            <AnimatePresence>
                {gameState !== 'PLAYING' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-40 flex items-center justify-center bg-[#080011]/90 backdrop-blur-xl">
                        <motion.div initial={{ scale: 0.8, y: 100, rotateX: 20 }} animate={{ scale: 1, y: 0, rotateX: 0 }} transition={{ type: "spring", damping: 25, stiffness: 120 }} className="text-center p-10 w-full max-w-lg rounded-[40px] border border-[#ff00aa]/30 bg-gradient-to-b from-[#110022]/90 to-black shadow-[0_50px_100px_rgba(255,0,170,0.4)] relative overflow-hidden">

                            {/* Background Glows */}
                            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 blur-[80px] opacity-40 ${gameState === 'SUCCESS' ? 'bg-[#00ffff]' : 'bg-[#ff0055]'}`}></div>

                            <div className={`w-28 h-28 mx-auto mb-8 rounded-full flex items-center justify-center relative z-10 ${gameState === 'SUCCESS' ? 'bg-[#00ffff]/20 border-2 border-[#00ffff] shadow-[0_0_40px_rgba(0,255,255,0.5)]' : 'bg-[#ff0055]/20 border-2 border-[#ff0055] shadow-[0_0_40px_rgba(255,0,85,0.5)]'}`}>
                                {gameState === 'SUCCESS' ? <Trophy className="w-14 h-14 text-[#00ffff] drop-shadow-md" /> : <SkullIcon className="w-14 h-14 text-[#ff0055] drop-shadow-md" />}
                            </div>

                            <h2 className={`text-4xl sm:text-6xl font-black uppercase tracking-tighter mb-4 relative z-10 ${gameState === 'SUCCESS' ? 'text-transparent bg-clip-text bg-gradient-to-b from-white to-[#00ffff]' : 'text-transparent bg-clip-text bg-gradient-to-b from-white to-[#ff0055]'}`} style={{ textShadow: gameState === 'SUCCESS' ? '0 10px 30px rgba(0,255,255,0.5)' : '0 10px 40px rgba(255,0,85,0.6)' }}>
                                {gameState === 'SUCCESS' ? t('game.state.system_secured') : t('game.state.mission_failed')}
                            </h2>

                            <div className="bg-black/80 rounded-2xl p-6 border border-white/10 mb-8 relative z-10">
                                <div className="text-sm text-gray-400 uppercase tracking-widest font-bold mb-1">{t('game.hud.final_score')}</div>
                                <div className="text-6xl text-white font-mono font-black tabular-nums drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">{score.toLocaleString()}</div>
                                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                                    <span className="text-xs text-[#b088ff] uppercase tracking-widest font-bold">{t('game.hud.max_combo')}</span>
                                    <span className="text-2xl text-[#ff00aa] font-black italic drop-shadow-[0_0_10px_rgba(255,0,170,0.8)]">{maxCombo}x</span>
                                </div>
                            </div>

                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium Veritas Falls 3D Canvas */}
            <div className={`absolute inset-0 z-0 ${gameState !== 'PLAYING' ? 'pointer-events-none' : ''}`}>
                <Canvas camera={{ position: [0, 0, 14], fov: 60 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.3 }}>
                    <color attach="background" args={['#060011']} />
                    <fog attach="fog" args={['#060011', 10, 40]} />

                    <Environment preset="night" />
                    <ambientLight intensity={0.4} />
                    <directionalLight position={[10, 20, 10]} intensity={3} color="#ff00aa" castShadow />
                    <directionalLight position={[-10, 10, -10]} intensity={1.5} color="#00ffff" />
                    <pointLight position={[0, -10, 0]} intensity={5} color="#8844ff" distance={30} />

                    {/* Cyberpunk Digital Falls */}
                    <DigitalFalls />

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

                    <ContactShadows position={[0, -10, 0]} opacity={0.6} scale={40} blur={4} far={20} resolution={512} color="#8800ff" />

                    <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.3 + combo * 0.1} maxPolarAngle={Math.PI / 1.5} minPolarAngle={Math.PI / 3} />

                    <EffectComposer enableNormalPass={false}>
                        <Bloom luminanceThreshold={0.3} mipmapBlur intensity={1.8 + combo * 0.2} />
                        <DepthOfField focusDistance={0.05} focalLength={0.08} bokehScale={5} height={480} />
                        <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.005 + combo * 0.002, 0.005 + combo * 0.002)} radialModulation={false} modulationOffset={0} />
                        <Noise opacity={0.08} />
                        <Vignette eskil={false} offset={0.1} darkness={1.2} />
                        {glitchActive && (<Glitch delay={new THREE.Vector2(0, 0)} duration={new THREE.Vector2(0.2, 0.6)} mode={GlitchMode.CONSTANT_WILD} active ratio={1.0} />)}
                    </EffectComposer>
                </Canvas>
            </div>
        </div>
    );
};

export default VeritasFalls;
