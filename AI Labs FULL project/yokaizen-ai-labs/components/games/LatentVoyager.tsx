import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, MeshDistortMaterial, Float, Sparkles, Line, Text, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch, Vignette, DepthOfField } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Activity, Shield, Zap, AlertTriangle, Flame, Target, Trophy, SkullIcon, Network } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../../services/audioService';
import { useDialogue } from '../../contexts/DialogueContext';

export interface LatentVoyagerProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

// Custom hook to create a particle burst
const BurstEffect = ({ position, color, onComplete }: { position: [number, number, number], color: string, onComplete: () => void }) => {
    const group = useRef<THREE.Group>(null);
    const particles = useMemo(() => Array.from({ length: 20 }, () => ({
        velocity: new THREE.Vector3((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10),
        scale: Math.random() * 0.5 + 0.1
    })), []);

    useFrame((_, delta) => {
        if (!group.current) return;
        let active = false;
        group.current.children.forEach((child, i) => {
            if (child.scale.x > 0) {
                active = true;
                child.position.addScaledVector(particles[i].velocity, delta);
                const s = Math.max(0, child.scale.x - delta * 2);
                child.scale.set(s, s, s);
            }
        });
        if (!active) onComplete();
    });

    return (
        <group ref={group} position={position}>
            {particles.map((p, i) => (
                <mesh key={i}>
                    <icosahedronGeometry args={[p.scale, 0]} />
                    <meshBasicMaterial color={color} />
                </mesh>
            ))}
        </group>
    );
};

// --- Ambient Latent Environment (Constellation) ---
const LatentEnvironment = () => {
    // Generate static background nodes
    const { nodes, lines } = useMemo(() => {
        const pts: THREE.Vector3[] = [];
        const linesArr: THREE.Vector3[][] = [];
        for (let i = 0; i < 150; i++) {
            pts.push(new THREE.Vector3(
                (Math.random() - 0.5) * 40,
                (Math.random() - 0.5) * 30,
                (Math.random() - 0.5) * -40 - 10
            ));
        }
        // Connect close nodes
        for (let i = 0; i < pts.length; i++) {
            for (let j = i + 1; j < pts.length; j++) {
                if (pts[i].distanceTo(pts[j]) < 8 && Math.random() > 0.5) {
                    linesArr.push([pts[i], pts[j]]);
                }
            }
        }
        return { nodes: pts, lines: linesArr };
    }, []);

    const groupRef = useRef<THREE.Group>(null);
    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = state.clock.elapsedTime * 0.02;
            groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.05) * 0.1;
        }
    });

    return (
        <group ref={groupRef}>
            {nodes.map((p, i) => (
                <mesh key={`bgn-${i}`} position={p}>
                    <sphereGeometry args={[0.05, 8, 8]} />
                    <meshBasicMaterial color="#38bdf8" transparent opacity={0.3} />
                </mesh>
            ))}
            {lines.map((l, i) => (
                <Line key={`bgl-${i}`} points={l} color="#0ea5e9" lineWidth={0.5} transparent opacity={0.1} />
            ))}
        </group>
    );
};

// --- 3D Target Node ---
const TargetNode = ({ position, color, scale, onClick, id }: {
    position: [number, number, number]; color: string; scale: number; onClick: (id: string, pos: [number, number, number], c: string) => void; id: string;
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.elapsedTime * 2;
            meshRef.current.rotation.z = state.clock.elapsedTime * 1.5;
            const pulse = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.12;
            meshRef.current.scale.setScalar(scale * pulse * (hovered ? 1.3 : 1));
        }
    });

    return (
        <Float speed={3} rotationIntensity={2} floatIntensity={2}>
            <mesh ref={meshRef} position={position}
                onClick={(e) => { e.stopPropagation(); onClick(id, position, color); }}
                onPointerOver={() => { setHovered(true); document.body.style.cursor = 'crosshair'; }}
                onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}>
                <icosahedronGeometry args={[0.6, 1]} />
                <meshPhysicalMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={hovered ? 4 : 2}
                    clearcoat={1}
                    metalness={0.9}
                    roughness={0.1}
                    transmission={0.5}
                    thickness={0.5}
                    wireframe={!hovered}
                />
                {hovered && <pointLight distance={6} intensity={5} color={color} />}

                {/* Holographic Label */}
                <Text position={[0, -1, 0]} fontSize={0.2} color={color} anchorX="center" anchorY="middle" opacity={hovered ? 1 : 0.4}>
                    DATA.NODE_{id.slice(0, 4)}
                </Text>
            </mesh>
        </Float>
    );
};

// --- 3D Hazard Node ---
const HazardNode = ({ position, onClick, id }: {
    position: [number, number, number]; onClick: (id: string, pos: [number, number, number]) => void; id: string;
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.elapsedTime * 5;
            meshRef.current.rotation.y = state.clock.elapsedTime * 3;
            const s = 0.7 + Math.sin(state.clock.elapsedTime * 10) * 0.15;
            meshRef.current.scale.setScalar(s);
        }
    });

    return (
        <mesh ref={meshRef} position={position}
            onClick={(e) => { e.stopPropagation(); onClick(id, position); }}
            onPointerOver={() => { document.body.style.cursor = 'not-allowed'; }}
            onPointerOut={() => { document.body.style.cursor = 'default'; }}>
            <octahedronGeometry args={[0.5]} />
            <MeshDistortMaterial
                color="#ef4444"
                emissive="#dc2626"
                emissiveIntensity={4}
                distort={0.4}
                speed={10}
                roughness={0.2}
                metalness={1}
                wireframe
            />
            <pointLight distance={4} intensity={4} color="#ef4444" />
        </mesh>
    );
};

// --- Camera Rig ---
const CameraRig = ({ intensity }: { intensity: number }) => {
    useFrame((state) => {
        const t = state.clock.elapsedTime;
        const shake = intensity > 0.5 ? (Math.random() - 0.5) * Math.min(intensity * 0.05, 0.2) : 0;
        state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, Math.sin(t * 0.3) * 1.5 + shake, 0.05);
        state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, Math.cos(t * 0.2) * 1 + shake, 0.05);
        state.camera.lookAt(0, 0, 0);
    });
    return null;
};

// --- Types ---
interface GameNode { id: string; position: [number, number, number]; type: 'target' | 'hazard'; color: string; spawnedAt: number; lifetime: number; }
interface Burst { id: string; position: [number, number, number]; color: string; }

const TARGET_COLORS = ['#38bdf8', '#c084fc', '#34d399', '#f87171'];
const genPos = (): [number, number, number] => [(Math.random() - 0.5) * 14, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 4 - 2];

// --- Main Component ---
export const LatentVoyager: React.FC<LatentVoyagerProps> = ({ onComplete, difficulty, t }) => {
    const { queueDialogue } = useDialogue();
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(55);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');
    const [combo, setCombo] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [nodes, setNodes] = useState<GameNode[]>([]);
    const [bursts, setBursts] = useState<Burst[]>([]);
    const [glitchActive, setGlitchActive] = useState(false);
    const [screenFlash, setScreenFlash] = useState<string | null>(null);
    const [advisorMsg, setAdvisorMsg] = useState(t('game.advisor.wave_incoming') || 'Mapping latent clusters...');
    const [adversaryMsg, setAdversaryMsg] = useState(t('game.adversary.strategy_flawed') || 'Anomaly detected in sector 4.');

    const diffMul = difficulty === 'Elite' ? 1.5 : difficulty === 'Pro' ? 1.2 : 1;
    const spawnInterval = Math.max(350, 1000 - (score / 150) * 80);
    const hazardChance = Math.min(0.45, 0.2 + (score / 2500));

    // Narrative: Mission Briefing
    useEffect(() => {
        queueDialogue([
            { id: `latentvoyager-brief-1`, character: 'BYTE', text: t('game.instructions.click_targets') || 'Extract required data representations.' },
            { id: `latentvoyager-brief-2`, character: 'ATHENA', text: t('game.instructions.avoid_hazards') || 'Avoid red corrupted nodes.', isGlitchy: true },
        ]);
    }, [queueDialogue, t]);

    // Node spawner
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const interval = setInterval(() => {
            setNodes(prev => {
                const now = Date.now();
                const active = prev.filter(n => now - n.spawnedAt < n.lifetime);
                if (active.length >= 7) return active;
                const isHazard = Math.random() < hazardChance;

                // Ensure nodes don't spawn exactly on top of each other ideally
                return [...active, {
                    id: `${Date.now()}-${Math.random()}`,
                    position: genPos(),
                    type: isHazard ? 'hazard' : 'target',
                    color: TARGET_COLORS[Math.floor(Math.random() * TARGET_COLORS.length)],
                    spawnedAt: now,
                    lifetime: Math.max(1200, 2500 - (score / 200) * 400),
                }];
            });
        }, spawnInterval);
        return () => clearInterval(interval);
    }, [gameState, spawnInterval, hazardChance, score]);

    // Agent chatter
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const aLines = [
            t('game.advisor.wave_incoming') || 'New cluster incoming.',
            t('game.advisor.flow_stable') || 'Flow rate stable.',
            'Vector space aligned.',
            `${t('game.hud.combo_chain') || 'Combo'}: ${combo}x`
        ];
        const eLines = [
            t('game.adversary.strategy_flawed') || 'Entropy increasing.',
            t('game.adversary.wont_survive') || 'You missed one.',
            t('game.adversary.core_exposed') || 'Defense breach imminent.',
            `${combo}x combo? Pitiful.`
        ];
        const iv = setInterval(() => {
            if (Math.random() > 0.6) {
                setAdversaryMsg(eLines[Math.floor(Math.random() * eLines.length)]);
                audio.playSystemMessage?.({ type: 'warning' });
            } else {
                setAdvisorMsg(aLines[Math.floor(Math.random() * aLines.length)]);
                audio.playSystemMessage?.({ type: 'success' });
            }
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
                    const reqScore = difficulty === 'Elite' ? 25000 : difficulty === 'Pro' ? 15000 : 8000;
                    const fs = score >= reqScore ? 'SUCCESS' : 'FAILED';
                    setGameState(fs);
                    if (fs === 'SUCCESS') {
                        audio.playSuccess();
                        queueDialogue([
                            { id: `lv-win-1`, character: 'SYNTAX', text: `Extraction complete. Yield: ${score} units.` },
                        ]);
                    } else {
                        audio.playError();
                        queueDialogue([
                            { id: `lv-fail-1`, character: 'BYTE', text: `Extraction failed. Corruption spread.`, isGlitchy: true },
                        ]);
                    }
                    onComplete(fs === 'SUCCESS' ? 100 : 0, { completionTime: 55, score, maxCombo, difficulty });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, score, maxCombo, difficulty, onComplete, queueDialogue, t]);

    const handleTargetClick = useCallback((id: string, pos: [number, number, number], color: string) => {
        if (gameState !== 'PLAYING') return;
        setNodes(prev => prev.filter(n => n.id !== id));

        // Add Burst
        const burstId = Date.now().toString() + Math.random();
        setBursts(prev => [...prev, { id: burstId, position: pos, color }]);

        audio.playClick?.();
        const nc = combo + 1;
        setCombo(nc);
        setMaxCombo(c => Math.max(c, nc));
        setScore(s => s + Math.floor(100 * (1 + Math.min(nc, 15) * 0.1) * diffMul));

        // Subtle blue flash
        setScreenFlash('rgba(56, 189, 248, 0.1)');
        setTimeout(() => setScreenFlash(null), 50);
    }, [gameState, combo, diffMul]);

    const handleHazardClick = useCallback((id: string, pos: [number, number, number]) => {
        if (gameState !== 'PLAYING') return;
        setNodes(prev => prev.filter(n => n.id !== id));

        // Add Red Burst
        const burstId = Date.now().toString() + Math.random();
        setBursts(prev => [...prev, { id: burstId, position: pos, color: '#ef4444' }]);

        audio.playError?.();
        setCombo(0);
        setScore(s => Math.max(0, s - 500));
        setGlitchActive(true);

        // Harsh Red Flash
        setScreenFlash('rgba(239, 68, 68, 0.3)');
        setTimeout(() => { setGlitchActive(false); setScreenFlash(null); }, 300);
    }, [gameState]);

    const removeBurst = useCallback((id: string) => {
        setBursts(prev => prev.filter(b => b.id !== id));
    }, []);

    const reqScore = difficulty === 'Elite' ? 25000 : difficulty === 'Pro' ? 15000 : 8000;
    const progress = Math.min(100, (score / reqScore) * 100);

    return (
        <div className="relative w-full h-[600px] rounded-[2rem] overflow-hidden border border-white/10 bg-black shadow-[0_0_50px_rgba(0,0,0,0.8)] select-none">
            {/* Scanlines Overlay */}
            <div className="absolute inset-0 bg-[url('/assets/aaa/scanlines.png')] opacity-30 pointer-events-none z-20 mix-blend-overlay"></div>

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

            {/* --- AAA HUD --- */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-40 pointer-events-none">
                <div className="flex flex-col gap-3">
                    {/* Score Panel */}
                    <div className="bg-black/80 backdrop-blur-xl rounded-xl p-4 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)] w-64">
                        <div className="flex items-center gap-2 text-cyan-400 mb-1">
                            <Network className="w-4 h-4 animate-pulse" />
                            <span className="text-[10px] uppercase tracking-[0.3em] font-black">{t('game.hud.score') || 'Extracted Data'}</span>
                        </div>
                        <div className="text-4xl font-mono font-black text-white tabular-nums drop-shadow-md tracking-tighter">
                            {score.toLocaleString()}
                        </div>
                        <div className="w-full h-1 mt-2 bg-slate-900 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] transition-all duration-300" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>

                    {/* Combo Badge */}
                    <AnimatePresence>
                        {combo > 1 && (
                            <motion.div
                                initial={{ scale: 0, x: -20 }}
                                animate={{ scale: 1, x: 0 }}
                                exit={{ scale: 0, opacity: 0 }}
                                className="bg-gradient-to-r from-orange-900/80 to-black/80 backdrop-blur-xl rounded-xl p-3 border border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.2)] inline-flex flex-col gap-1"
                            >
                                <div className="flex items-center gap-2">
                                    <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
                                    <span className="text-orange-400 font-black text-2xl italic tabular-nums">{combo}x</span>
                                </div>
                                <div className="text-[9px] text-orange-300/70 uppercase tracking-widest font-bold ml-7">
                                    {t('game.hud.combo_chain') || 'Chain Multiplier'}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex flex-col items-end gap-3">
                    {/* Time Panel */}
                    <div className="bg-black/80 backdrop-blur-xl rounded-xl p-4 border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                        <div className="flex items-center justify-end gap-2 text-indigo-400 mb-1">
                            <Activity className="w-4 h-4" />
                            <span className="text-[10px] uppercase tracking-[0.3em] font-black">{t('game.hud.time') || 'Uplink Time'}</span>
                        </div>
                        <div className={`text-4xl font-mono font-black tabular-nums tracking-tighter text-right drop-shadow-lg ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                            00:{timeLeft.toString().padStart(2, '0')}
                        </div>
                    </div>

                    <div className="bg-black/80 px-4 py-1.5 rounded-full border border-slate-700/50 flex items-center gap-2 backdrop-blur-md">
                        <div className={`w-2 h-2 rounded-full ${difficulty === 'Elite' ? 'bg-fuchsia-500 shadow-[0_0_5px_#d946ef]' : 'bg-cyan-500 shadow-[0_0_5px_#06b6d4]'}`}></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{difficulty}</span>
                    </div>
                </div>
            </div>

            {/* Agent Chatter Overlay */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row gap-4 z-40 pointer-events-none">
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex-1 bg-black/80 backdrop-blur-xl rounded-xl p-4 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)] relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500"></div>
                    <div className="text-[10px] text-cyan-400 mb-2 uppercase tracking-widest font-black flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" /> [SYS.ADV] {t('game.advisor.label') || 'Advisor'}
                    </div>
                    <div className="text-sm text-cyan-100 font-mono leading-relaxed">{advisorMsg}</div>
                </motion.div>

                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="flex-1 bg-black/80 backdrop-blur-xl rounded-xl p-4 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)] relative overflow-hidden">
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-500"></div>
                    <div className="text-[10px] text-red-500 mb-2 uppercase tracking-widest font-black flex items-center gap-1.5 justify-end">
                        <Zap className="w-3.5 h-3.5" /> [SYS.ADV] {t('game.adversary.label') || 'Adversary'}
                    </div>
                    <div className="text-sm text-red-100 font-mono leading-relaxed text-right">{adversaryMsg}</div>
                </motion.div>
            </div>

            {/* Game Over Screen */}
            <AnimatePresence>
                {gameState !== 'PLAYING' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl pointer-events-auto">
                        <div className="absolute inset-0 bg-[url('/assets/aaa/grid-pattern.svg')] opacity-10 bg-repeat bg-[center_top] pointer-events-none"></div>

                        <div className={`relative p-10 w-full max-w-lg rounded-[2rem] border bg-gradient-to-b shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden text-center ${gameState === 'SUCCESS' ? 'border-cyan-500/30 from-cyan-950/40 to-black' : 'border-red-500/30 from-red-950/40 to-black'
                            }`}>

                            <div className={`absolute -top-32 -left-32 w-64 h-64 rounded-full blur-[80px] opacity-20 ${gameState === 'SUCCESS' ? 'bg-cyan-600' : 'bg-red-600'}`}></div>

                            <div className="relative z-10">
                                <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center border-4 shadow-xl ${gameState === 'SUCCESS' ? 'bg-cyan-900/30 border-cyan-500 shadow-cyan-500/20' : 'bg-red-900/30 border-red-500 shadow-red-500/20'
                                    }`}>
                                    {gameState === 'SUCCESS' ? <Target className="w-12 h-12 text-cyan-400" /> : <SkullIcon className="w-12 h-12 text-red-500" />}
                                </div>

                                <h2 className={`text-4xl md:text-5xl font-black uppercase tracking-[0.2em] mb-2 drop-shadow-md ${gameState === 'SUCCESS' ? 'text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-cyan-600' : 'text-transparent bg-clip-text bg-gradient-to-b from-red-400 to-red-600'
                                    }`}>
                                    {gameState === 'SUCCESS' ? t('game.state.waves_analyzed') || 'EXTRACTION COMPLETE' : t('game.state.core_breached') || 'EXTRACTION FAILED'}
                                </h2>

                                <p className="text-gray-400 font-mono text-sm mb-10 uppercase tracking-widest">Latent Space Operation Concluded</p>

                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="bg-black/50 border border-white/5 rounded-xl p-4 col-span-2 text-left flex justify-between items-center">
                                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{t('game.hud.final_score') || 'Yield'}</div>
                                        <div className="text-4xl font-black text-white font-mono">{score.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-black/50 border border-white/5 rounded-xl p-4">
                                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{t('game.hud.max_combo') || 'Peak Combo'}</div>
                                        <div className="text-2xl font-black text-orange-400 font-mono italic">{maxCombo}x</div>
                                    </div>
                                    <div className="bg-black/50 border border-white/5 rounded-xl p-4">
                                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Target</div>
                                        <div className="text-2xl font-black text-gray-300 font-mono">{reqScore.toLocaleString()}</div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => onComplete(gameState === 'SUCCESS' ? 100 : 0)}
                                    className={`w-full py-5 rounded-xl font-black tracking-[0.2em] text-lg uppercase transition-all hover:scale-105 ${gameState === 'SUCCESS'
                                            ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_30px_rgba(6,182,212,0.4)] border border-cyan-400'
                                            : 'bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]'
                                        }`}
                                >
                                    {gameState === 'SUCCESS' ? 'Upload Datasets' : 'Re-initialize Map'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- 3D Canvas --- */}
            <div className="absolute inset-0 z-0 cursor-crosshair">
                <Canvas camera={{ position: [0, 0, 15], fov: 60 }} gl={{ antialias: false, powerPreference: "high-performance" }}>
                    <color attach="background" args={['#010105']} />
                    <fog attach="fog" args={['#010105', 8, 30]} />

                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={2} color="#0284c7" />
                    <pointLight position={[-10, 5, -10]} intensity={1} color="#6366f1" />

                    {/* Environment Backdrop */}
                    <LatentEnvironment />

                    {/* Camera Jitter based on combo/events */}
                    <CameraRig intensity={combo / 10 + (glitchActive ? 2 : 0)} />

                    {/* Targets & Hazards */}
                    {nodes.map(node => node.type === 'target' ? (
                        <TargetNode key={node.id} id={node.id} position={node.position} color={node.color} scale={1} onClick={handleTargetClick} />
                    ) : (
                        <HazardNode key={node.id} id={node.id} position={node.position} onClick={handleHazardClick} />
                    ))}

                    {/* Death bursts */}
                    {bursts.map(b => (
                        <BurstEffect key={b.id} position={b.position} color={b.color} onComplete={() => removeBurst(b.id)} />
                    ))}

                    {/* Ambient energy dust */}
                    <Sparkles count={200} scale={20} size={2} speed={0.4 + combo * 0.1} opacity={0.4} color="#38bdf8" />
                    <Sparkles count={100} scale={20} size={4} speed={0.8} opacity={0.2} color="#8b5cf6" />

                    <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5 + combo * 0.05} />

                    {/* Post-processing Pipeline */}
                    <EffectComposer multisampling={0}>
                        <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5 + combo * 0.05} radius={0.8} />
                        <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.002 + combo * 0.001 + (glitchActive ? 0.05 : 0), 0.002)} />
                        <Vignette eskil={false} offset={0.1} darkness={1.3} />
                        <DepthOfField focusDistance={0.05} focalLength={0.15} bokehScale={10} />
                        {glitchActive && (
                            <Glitch delay={new THREE.Vector2(0, 0)} duration={new THREE.Vector2(0.1, 0.4)} mode={GlitchMode.SPORADIC} active ratio={0.8} />
                        )}
                    </EffectComposer>
                </Canvas>
            </div>
        </div>
    );
};
