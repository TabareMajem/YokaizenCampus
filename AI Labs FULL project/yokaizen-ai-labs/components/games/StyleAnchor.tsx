import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Sparkles, Environment, ContactShadows, MeshTransmissionMaterial, Ring, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch, Vignette, DepthOfField } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Activity, Shield, Zap, AlertTriangle, Flame, Target, Trophy, SkullIcon, Scissors } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../../services/audioService';
import { useDialogue } from '../../contexts/DialogueContext';

export interface StyleAnchorProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

// --- 3D Gallery Environment ---
const GalleryRoom = () => {
    return (
        <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, 0]}>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="#050505" roughness={0.1} metalness={0.8} />
            </mesh>
            <ContactShadows position={[0, -3.99, 0]} scale={50} blur={2} far={10} opacity={0.5} />
            <gridHelper args={[100, 40, '#ffffff', '#ffffff']} position={[0, -3.99, 0]} material-opacity={0.05} material-transparent />
        </group>
    );
};

// --- 3D Target Node (Glass Prism) ---
const StylePrism = ({ position, color, scale, onClick, id }: {
    position: [number, number, number]; color: string; scale: number; onClick: (id: string) => void; id: string;
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const ringRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.elapsedTime * 0.5;
            meshRef.current.rotation.y = state.clock.elapsedTime * 0.8;
            const pulse = 1 + Math.sin(state.clock.elapsedTime * 5 + position[0]) * 0.05;
            meshRef.current.scale.setScalar(scale * pulse * (hovered ? 1.1 : 1));
        }
        if (ringRef.current) {
            ringRef.current.rotation.z = state.clock.elapsedTime * -1;
            ringRef.current.scale.setScalar(hovered ? 1.5 : 1.2);
        }
    });

    return (
        <Float speed={2} rotationIntensity={1} floatIntensity={1}>
            <group position={position}>
                {hovered && (
                    <Ring ref={ringRef} args={[0.7, 0.75, 32]} rotation={[Math.PI / 2, 0, 0]}>
                        <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.5} />
                    </Ring>
                )}
                <mesh
                    ref={meshRef}
                    onClick={(e) => { e.stopPropagation(); onClick(id); }}
                    onPointerOver={() => { setHovered(true); document.body.style.cursor = 'crosshair'; }}
                    onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
                >
                    <octahedronGeometry args={[0.6, 0]} />
                    <MeshTransmissionMaterial
                        backside
                        samples={4}
                        thickness={1}
                        chromaticAberration={1}
                        anisotropy={0.5}
                        distortion={0}
                        color={color}
                        roughness={0}
                        clearcoat={1}
                        metalness={0.1}
                    />
                    <pointLight distance={3} intensity={hovered ? 3 : 1} color={color} />
                </mesh>
            </group>
        </Float>
    );
};

// --- 3D Hazard Node (Shattered Glass Shard) ---
const HazardShard = ({ position, onClick, id }: {
    position: [number, number, number]; onClick: (id: string) => void; id: string;
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.elapsedTime * 2;
            meshRef.current.rotation.y = state.clock.elapsedTime * 3;
            meshRef.current.rotation.z += 0.05;
            meshRef.current.scale.setScalar(hovered ? 1.3 : 1);
        }
    });

    return (
        <Float speed={4} rotationIntensity={2} floatIntensity={2}>
            <mesh
                ref={meshRef}
                position={position}
                onClick={(e) => { e.stopPropagation(); onClick(id); }}
                onPointerOver={() => { setHovered(true); document.body.style.cursor = 'not-allowed'; }}
                onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
            >
                <tetrahedronGeometry args={[0.4, 0]} />
                <meshStandardMaterial
                    color="#050505"
                    emissive="#ff0044"
                    emissiveIntensity={hovered ? 4 : 2}
                    roughness={0.1}
                    metalness={0.9}
                    wireframe={!hovered}
                />
                {!hovered && (
                    <meshStandardMaterial
                        color="#ff0044"
                        transparent
                        opacity={0.3}
                        roughness={0}
                        metalness={1}
                    />
                )}
                <pointLight distance={3} intensity={2} color="#ff0044" />
            </mesh>
        </Float>
    );
};

// --- Camera Rig ---
const CameraRig = ({ intensity }: { intensity: number }) => {
    useFrame((state) => {
        const t = state.clock.elapsedTime;
        const shake = intensity > 0.5 ? (Math.random() - 0.5) * intensity * 0.1 : 0;
        state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, Math.sin(t * 0.3) * 1.5 + shake, 0.05);
        state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, Math.cos(t * 0.2) * 0.5 + Math.abs(shake), 0.05);
        state.camera.lookAt(0, 0, 0);
    });
    return null;
};

// --- Types ---
interface GameNode { id: string; position: [number, number, number]; type: 'target' | 'hazard'; color: string; spawnedAt: number; lifetime: number; }

const TARGET_COLORS = ['#ffffff', '#fdfbf7', '#c2f0f0', '#ffe6f2']; // High fashion, soft lighting colors
const genPos = (): [number, number, number] => [(Math.random() - 0.5) * 14, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4];

// --- Main Component ---
export const StyleAnchor: React.FC<StyleAnchorProps> = ({ onComplete, difficulty, t }) => {
    const { queueDialogue } = useDialogue();
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(50);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');
    const [combo, setCombo] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [nodes, setNodes] = useState<GameNode[]>([]);
    const [glitchActive, setGlitchActive] = useState(false);
    const [screenFlash, setScreenFlash] = useState<string | null>(null);
    const [advisorMsg, setAdvisorMsg] = useState(t('game.advisor.flow_stable'));
    const [adversaryMsg, setAdversaryMsg] = useState(t('game.adversary.same_look'));

    const diffMul = difficulty === 'HARD' ? 1.5 : difficulty === 'MEDIUM' ? 1.2 : 1;
    const spawnInterval = Math.max(400, 1200 - (score / 100) * 80);
    const hazardChance = Math.min(0.4, 0.15 + (score / 2000));

    // Narrative: Mission Briefing
    useEffect(() => {
        queueDialogue([
            { id: `styleanchor-brief-${Date.now()}`, character: 'ATHENA', text: t('game.instructions.click_targets') },
            { id: `styleanchor-brief2-${Date.now()}`, character: 'BYTE', text: t('game.instructions.avoid_hazards'), isGlitchy: true },
        ]);
    }, [queueDialogue, t]);

    // Node spawner
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const interval = setInterval(() => {
            setNodes(prev => {
                const now = Date.now();
                const active = prev.filter(n => now - n.spawnedAt < n.lifetime);
                if (active.length >= 8) return active;
                const isHazard = Math.random() < hazardChance;

                // Keep hazards slightly behind targets
                const pos = genPos();
                if (isHazard) pos[2] -= 1;

                return [...active, {
                    id: `${Date.now()}-${Math.random()}`, position: pos,
                    type: isHazard ? 'hazard' : 'target',
                    color: TARGET_COLORS[Math.floor(Math.random() * TARGET_COLORS.length)],
                    spawnedAt: now, lifetime: Math.max(1500, 3000 - (score / 200) * 500),
                }];
            });
        }, spawnInterval);
        return () => clearInterval(interval);
    }, [gameState, spawnInterval, hazardChance, score]);

    // Agent chatter
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const aLines = [t('game.advisor.flow_stable'), t('game.advisor.core_holding'), t('game.advisor.metrics_align'), `${t('game.hud.combo_chain')}: ${combo}x`];
        const eLines = [t('game.adversary.same_look'), t('game.adversary.tempting'), t('game.adversary.predictable'), `${combo}x ${t('game.hud.combo')}...`];
        const iv = setInterval(() => {
            if (Math.random() > 0.6) { setAdversaryMsg(eLines[Math.floor(Math.random() * eLines.length)]); audio.playSystemMessage?.({ type: 'warning' }); }
            else { setAdvisorMsg(aLines[Math.floor(Math.random() * aLines.length)]); audio.playSystemMessage?.({ type: 'success' }); }
        }, 5000);
        return () => clearInterval(iv);
    }, [gameState, combo, t]);

    // Timer
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    const fs = score >= 400 ? 'SUCCESS' : 'FAILED';
                    setGameState(fs);
                    if (fs === 'SUCCESS') {
                        audio.playSuccess(); queueDialogue([
                            { id: `styleanchor-win-${Date.now()}`, character: 'SYNTAX', text: `${t('game.hud.final_score')}: ${score}. ${t('game.hud.max_combo')}: ${maxCombo}x.` },
                            { id: `styleanchor-win2-${Date.now()}`, character: 'ATHENA', text: t('game.state.waves_analyzed') },
                        ]);
                    } else {
                        audio.playError(); queueDialogue([
                            { id: `styleanchor-fail-${Date.now()}`, character: 'BYTE', text: t('game.state.breach_detected'), isGlitchy: true },
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

    const handleTargetClick = useCallback((id: string) => {
        if (gameState !== 'PLAYING') return;
        setNodes(prev => prev.filter(n => n.id !== id));
        audio.playClick();
        const nc = combo + 1; setCombo(nc); setMaxCombo(c => Math.max(c, nc));
        setScore(s => s + Math.floor(50 * Math.min(nc, 10) * diffMul));
        setScreenFlash('#ffffff'); setTimeout(() => setScreenFlash(null), 60);
    }, [gameState, combo, diffMul]);

    const handleHazardClick = useCallback((id: string) => {
        if (gameState !== 'PLAYING') return;
        setNodes(prev => prev.filter(n => n.id !== id));
        audio.playError(); setCombo(0); setScore(s => Math.max(0, s - 200));
        setGlitchActive(true); setScreenFlash('#ff0044');
        setTimeout(() => { setGlitchActive(false); setScreenFlash(null); }, 400);
    }, [gameState]);

    return (
        <div className="relative w-full h-[600px] rounded-xl overflow-hidden border border-white/5 bg-[#0a0a0c] shadow-2xl">
            <AnimatePresence>{screenFlash && (<motion.div initial={{ opacity: 0.8 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: "easeOut" }} className="absolute inset-0 z-30 pointer-events-none" style={{ backgroundColor: screenFlash, mixBlendMode: 'overlay' }} />)}</AnimatePresence>

            {/* High-Fashion Minimalist HUD */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
                <div className="flex flex-col gap-4 w-48">
                    <div>
                        <div className="flex items-center gap-2 text-white/50 mb-1">
                            <Activity className="w-3 h-3" />
                            <span className="text-[10px] uppercase tracking-[0.3em] font-light">{t('game.hud.score')}</span>
                        </div>
                        <div className="text-4xl font-light tracking-tighter text-white tabular-nums drop-shadow-md">{score}</div>
                    </div>

                    <AnimatePresence>
                        {combo > 1 && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="relative py-2 pl-4 border-l border-white/20"
                            >
                                <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-light mb-1">{t('game.hud.combo_chain')}</div>
                                <div className="text-2xl font-light italic text-white/90 tabular-nums">x{combo}</div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex flex-col items-end gap-3 text-right">
                    <div>
                        <div className="flex items-center justify-end gap-2 text-white/50 mb-1">
                            <span className="text-[10px] uppercase tracking-[0.3em] font-light">{t('game.hud.time')}</span>
                            <AlertTriangle className="w-3 h-3" />
                        </div>
                        <div className={`text-5xl font-light tabular-nums tracking-tighter ${timeLeft <= 10 ? 'text-[#ff0044]' : 'text-white'} drop-shadow-md`}>
                            {timeLeft}<span className="text-xl text-white/40 ml-1">s</span>
                        </div>
                    </div>
                    <div className={`mt-2 text-[10px] tracking-[0.3em] uppercase ${difficulty === 'HARD' ? 'text-[#ff0044]' : difficulty === 'MEDIUM' ? 'text-[#ffaa00]' : 'text-white/40'}`}>
                        {t(`game.difficulty.${difficulty.toLowerCase()}`)}
                    </div>
                </div>
            </div>

            {/* Subtle Instructions */}
            <AnimatePresence>
                {timeLeft > 45 && gameState === 'PLAYING' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute bottom-1/4 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center flex flex-col items-center gap-2">
                        <div className="text-white/80 font-light text-sm tracking-[0.2em] uppercase bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
                            {t('game.instructions.click_targets')}
                        </div>
                        <div className="text-[#ff0044] font-light text-xs tracking-[0.2em] uppercase bg-black/40 backdrop-blur-md px-4 py-1 rounded-full border border-[#ff0044]/20">
                            {t('game.instructions.avoid_hazards')}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Minimalist Agent Panel */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row gap-8 z-10 pointer-events-none border-t border-white/10 pt-4">
                <div className="flex-1">
                    <div className="text-[9px] text-white/40 mb-2 uppercase tracking-[0.3em] flex items-center gap-2">
                        <Shield className="w-3 h-3 stroke-1" /> {t('game.advisor.label')}
                    </div>
                    <div className="text-sm text-white/80 font-light tracking-wide">{advisorMsg}</div>
                </div>
                <div className="flex-1 md:text-right">
                    <div className="text-[9px] text-[#ff0044]/60 mb-2 uppercase tracking-[0.3em] flex items-center md:justify-end gap-2">
                        <Zap className="w-3 h-3 stroke-1" /> {t('game.adversary.label')}
                    </div>
                    <div className="text-sm text-white/80 font-light tracking-wide">{adversaryMsg}</div>
                </div>
            </div>

            {/* High-End Game Over Status */}
            <AnimatePresence>
                {gameState !== 'PLAYING' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-[#050505]/95 backdrop-blur-xl">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }} className="w-full max-w-2xl text-center">

                            <div className="mb-8 font-light tracking-[0.5em] text-white/40 text-sm uppercase">Style Score</div>

                            <div className="text-8xl md:text-9xl font-light tracking-tighter text-white mb-12 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                                {score}
                            </div>

                            <div className="grid grid-cols-2 gap-8 max-w-md mx-auto mb-16 border-t border-b border-white/10 py-8">
                                <div>
                                    <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">{t('game.hud.max_combo')}</div>
                                    <div className="text-3xl font-light text-white italic">x{maxCombo}</div>
                                </div>
                                <div className="border-l border-white/10">
                                    <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">Status</div>
                                    <div className={`text-lg font-light uppercase tracking-widest mt-2 ${gameState === 'SUCCESS' ? 'text-white' : 'text-[#ff0044]'}`}>
                                        {gameState === 'SUCCESS' ? t('game.state.waves_analyzed') : t('game.state.breach_detected')}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3D Glass Gallery Layer */}
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 2, 12], fov: 45 }} gl={{ antialias: false, powerPreference: "high-performance" }}>
                    <color attach="background" args={['#020202']} />
                    <fog attach="fog" args={['#020202', 10, 30]} />
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[10, 10, 5]} intensity={2} color="#ffffff" />
                    <directionalLight position={[-10, 5, -5]} intensity={1} color="#e6f2ff" />

                    <Environment preset="studio" intensity={0.5} />
                    <GalleryRoom />

                    <CameraRig intensity={combo / 10} />

                    {nodes.map(node => node.type === 'target' ? (
                        <StylePrism key={node.id} id={node.id} position={node.position} color={node.color} scale={1} onClick={handleTargetClick} />
                    ) : (
                        <HazardShard key={node.id} id={node.id} position={node.position} onClick={handleHazardClick} />
                    ))}

                    <Sparkles count={50} scale={20} size={2} speed={0.1} opacity={0.3} color="#ffffff" position={[0, 4, 0]} />

                    <EffectComposer disableNormalPass>
                        <DepthOfField focusDistance={0.02} focalLength={0.1} bokehScale={2} height={480} />
                        <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} mipmapBlur intensity={1.5} />
                        <ChromaticAberration
                            blendFunction={BlendFunction.NORMAL}
                            offset={new THREE.Vector2(0.002 + combo * 0.001, 0.002 + combo * 0.001)}
                            radialModulation={false}
                            modulationOffset={0}
                        />
                        <Vignette eskil={false} offset={0.15} darkness={1.0} />
                        {glitchActive && (<Glitch delay={new THREE.Vector2(0, 0)} duration={new THREE.Vector2(0.2, 0.4)} mode={GlitchMode.SPORADIC} active ratio={0.5} />)}
                    </EffectComposer>
                </Canvas>
            </div>
        </div>
    );
};
