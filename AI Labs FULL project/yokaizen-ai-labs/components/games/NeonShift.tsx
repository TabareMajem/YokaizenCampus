/// <reference types="@react-three/fiber" />
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Box, MeshDistortMaterial, Float, Sparkles, Text, Sphere, Torus, Cylinder, Edges } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch, Vignette, Noise } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Activity, Shield, Zap, AlertTriangle, Flame, Target, Trophy, SkullIcon, TargetCenter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../../services/audioService';
import { useDialogue } from '../../contexts/DialogueContext';

export interface NeonShiftProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

// --------------------------------------------------------
// AAA 3D Components
// --------------------------------------------------------

const HyperTunnel = ({ speedMultiplier }: { speedMultiplier: number }) => {
    const gridRef = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        if (gridRef.current) {
            gridRef.current.position.z += delta * 15 * speedMultiplier;
            if (gridRef.current.position.z > 20) {
                gridRef.current.position.z -= 20;
            }
        }
    });

    return (
        <group ref={gridRef}>
            {[...Array(5)].map((_, i) => (
                <mesh key={i} position={[0, 0, -i * 20]} rotation-x={Math.PI / 2}>
                    <cylinderGeometry args={[25, 25, 20, 16, 1, true]} />
                    <meshBasicMaterial color="#0066ff" wireframe transparent opacity={0.15} />
                </mesh>
            ))}
        </group>
    );
};

const TargetNode = ({ position, color, onClick, id, combo }: any) => {
    const groupRef = useRef<THREE.Group>(null);
    const coreRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);
    const [scale, setScale] = useState(0);

    useFrame((state, delta) => {
        setScale(s => Math.min(1, s + delta * 5)); // Spawn pop-in

        const t = state.clock.elapsedTime;
        if (groupRef.current) {
            const hoverPulse = hovered ? 1.2 : 1.0;
            const comboPulse = 1 + Math.sin(t * 10) * Math.min(combo * 0.02, 0.2); // Pulse faster with combo
            groupRef.current.scale.setScalar(scale * hoverPulse * comboPulse);

            groupRef.current.rotation.y = t * 2;
            groupRef.current.rotation.x = Math.sin(t) * 0.5;
        }

        if (coreRef.current) {
            coreRef.current.scale.setScalar(1 + Math.sin(t * 8) * 0.1);
        }
    });

    return (
        <group
            ref={groupRef}
            position={position}
            onClick={(e) => { e.stopPropagation(); onClick(id, position, color); }}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'crosshair'; }}
            onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'default'; }}
        >
            {/* Outer Energy Shell */}
            <mesh>
                <icosahedronGeometry args={[1, 1]} />
                <meshPhysicalMaterial
                    color={color} transmission={0.9} ior={1.5} thickness={1}
                    roughness={0.1} metalness={0.5} clearcoat={1}
                    transparent opacity={0.8}
                />
                <Edges threshold={15} color={hovered ? '#ffffff' : color} />
            </mesh>

            {/* Inner Core */}
            <mesh ref={coreRef}>
                <sphereGeometry args={[0.4, 16, 16]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hovered ? 5 : 2} />
            </mesh>

            {/* Spinning Rings */}
            {[0, 1].map(i => (
                <mesh key={i} rotation={[i * Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[1.3, 0.02, 16, 64]} />
                    <meshBasicMaterial color={color} transparent opacity={0.5} blending={THREE.AdditiveBlending} />
                </mesh>
            ))}

            <pointLight distance={8} intensity={hovered ? 5 : 2} color={color} />
        </group>
    );
};

const HazardNode = ({ position, onClick, id }: any) => {
    const groupRef = useRef<THREE.Group>(null);
    const [scale, setScale] = useState(0);

    useFrame((state, delta) => {
        setScale(s => Math.min(1, s + delta * 5));
        const t = state.clock.elapsedTime;
        if (groupRef.current) {
            groupRef.current.scale.setScalar(scale * (1 + Math.sin(t * 15) * 0.1));
            groupRef.current.rotation.x = t * 5;
            groupRef.current.rotation.y = t * 4;
        }
    });

    return (
        <group
            ref={groupRef}
            position={position}
            onClick={(e) => { e.stopPropagation(); onClick(id, position); }}
            onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'not-allowed'; }}
            onPointerOut={(e) => { e.stopPropagation(); document.body.style.cursor = 'default'; }}
        >
            <mesh>
                <octahedronGeometry args={[1, 0]} />
                <MeshDistortMaterial
                    color="#ff0022"
                    emissive="#ff0022"
                    emissiveIntensity={4}
                    wireframe
                    distort={0.4}
                    speed={10}
                />
            </mesh>
            <mesh scale={0.5}>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial color="#ffffff" />
            </mesh>
            <pointLight distance={6} intensity={4} color="#ff0022" />
        </group>
    );
};

const ExplosionEffect = ({ position, color, onComplete }: any) => {
    const groupRef = useRef<THREE.Group>(null);
    const [life, setLife] = useState(0);
    const particles = useRef(Array.from({ length: 12 }).map(() => ({
        dir: new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2).normalize(),
        speed: 5 + Math.random() * 10
    })));

    useFrame((_, d) => {
        if (!groupRef.current) return;
        setLife(l => l + d * 2);

        groupRef.current.children.forEach((child, i) => {
            if (i === 0) {
                // Flash Ring
                child.scale.setScalar(1 + life * 5);
                (child as THREE.Mesh).material.opacity = Math.max(0, 1 - life);
            } else {
                // Particles
                const p = particles.current[i - 1];
                child.position.addScaledVector(p.dir, p.speed * d);
                child.scale.setScalar(Math.max(0, 1 - life));
            }
        });

        if (life > 1) onComplete();
    });

    return (
        <group ref={groupRef} position={position}>
            {/* Shockwave Ring */}
            <mesh rotation-x={Math.PI / 2}>
                <torusGeometry args={[1, 0.1, 16, 32]} />
                <meshBasicMaterial color={color} transparent opacity={1} blending={THREE.AdditiveBlending} />
            </mesh>
            {/* Shrapnel */}
            {particles.current.map((_, i) => (
                <mesh key={i}>
                    <icosahedronGeometry args={[0.2, 0]} />
                    <meshBasicMaterial color={color} transparent opacity={0.8} blending={THREE.AdditiveBlending} />
                </mesh>
            ))}
        </group>
    );
};

const FloatingScore = ({ position, text, color, onComplete }: any) => {
    const ref = useRef<THREE.Group>(null);
    const [life, setLife] = useState(0);
    useFrame((_, d) => {
        if (!ref.current) return;
        setLife(l => l + d * 2);
        ref.current.position.y += d * 4;
        ref.current.scale.setScalar(Math.max(0, 1 - life * 0.5));
        if (life > 2) onComplete();
    });
    return (
        <group ref={ref} position={position}>
            <Text color={color} fontSize={1.2} font="https://fonts.gstatic.com/s/syncopate/v13/pe0sMIuPIYBCpEV5eFdCBfe_m_s.woff" anchorX="center" anchorY="middle" outlineWidth={0.08} outlineColor="#000000">{text}</Text>
        </group>
    );
};

const CameraRig = ({ intensity }: { intensity: number }) => {
    useFrame((state) => {
        const t = state.clock.elapsedTime;
        // Dynamic camera shake based on combo/intensity
        const shake = intensity * 0.1;
        state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, Math.sin(t * 2) * shake, 0.1);
        state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, Math.cos(t * 3) * shake, 0.1);
        state.camera.lookAt(0, 0, 0);
    });
    return null;
};

// --------------------------------------------------------
// Main Game Component
// --------------------------------------------------------
export const NeonShift: React.FC<NeonShiftProps> = ({ onComplete, difficulty, t }) => {
    const { queueDialogue } = useDialogue();
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(45);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');

    const [combo, setCombo] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);

    const [nodes, setNodes] = useState<any[]>([]);
    const [effects, setEffects] = useState<any[]>([]);

    const [glitchActive, setGlitchActive] = useState(false);
    const [screenFlash, setScreenFlash] = useState<string | null>(null);

    const [advisorMsg, setAdvisorMsg] = useState(t('game.advisor.flow_stable') || 'Neural interface linked. Engage targets.');
    const [adversaryMsg, setAdversaryMsg] = useState(t('game.adversary.inevitability') || 'Your reflexes are insufficient.');

    // Narrative Briefing
    useEffect(() => {
        queueDialogue([
            { id: `ns-brief-${Date.now()}`, character: 'ATHENA', text: t('game.instructions.click_targets') || 'Destroy the Neon Cores. Build your combo multiplier.' },
            { id: `ns-brief2-${Date.now()}`, character: 'SYNTAX', text: t('game.instructions.avoid_hazards') || 'Avoid red glitch hazards. They will shatter your combo.', isGlitchy: true },
        ]);
    }, [queueDialogue, t]);

    const difficultyMultiplier = difficulty === 'HARD' ? 1.5 : difficulty === 'MEDIUM' ? 1.2 : 1;
    const spawnInterval = Math.max(300, 1000 - (score / 150) * 80); // Speed ramps up 
    const hazardChance = Math.min(0.35, 0.1 + (score / 3000));
    const targetColors = ['#00ffff', '#ff00aa', '#00ffaa', '#ffaa00', '#aa00ff'];

    // Node Spawner
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const interval = setInterval(() => {
            setNodes(prev => {
                const now = Date.now();
                const active = prev.filter(n => now - n.spawnedAt < n.lifetime);
                if (active.length >= 7) return active; // Max on screen

                const isHazard = Math.random() < hazardChance;
                const r = 10 + Math.random() * 5; // Distance
                const theta = Math.random() * Math.PI * 2; // Angle around
                const phi = Math.random() * Math.PI * 0.5 - Math.PI * 0.25; // Height angle

                const posStr: [number, number, number] = [
                    r * Math.cos(phi) * Math.cos(theta),
                    r * Math.sin(phi) * 1.5,
                    r * Math.cos(phi) * Math.sin(theta) - 5 // Offset slightly away
                ];

                const newNode = {
                    id: `${Date.now()}-${Math.random()}`,
                    position: posStr,
                    type: isHazard ? 'hazard' : 'target',
                    color: targetColors[Math.floor(Math.random() * targetColors.length)],
                    spawnedAt: now,
                    lifetime: Math.max(1200, 2500 - (score / 300) * 400),
                };
                return [...active, newNode];
            });
        }, spawnInterval);
        return () => clearInterval(interval);
    }, [gameState, spawnInterval, hazardChance, score]);

    // Agent Chatter
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const agentInterval = setInterval(() => {
            if (Math.random() > 0.5) {
                setAdvisorMsg(combo > 5 ? `Reflex threshold optimal. Combo at ${combo}x.` : `Maintain focus. Destroy cores.`);
                audio.playSystemMessage?.({ type: 'success' });
            } else {
                setAdversaryMsg(combo > 0 ? `Your momentum is temporary.` : `Pathetic performance.`);
                audio.playSystemMessage?.({ type: 'warning' });
            }
        }, 6000);
        return () => clearInterval(agentInterval);
    }, [gameState, combo]);

    // Timer & End Game Check
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    const isWin = score >= 500 * difficultyMultiplier;
                    setGameState(isWin ? 'SUCCESS' : 'FAILED');

                    if (isWin) {
                        audio.playSuccess();
                        setScreenFlash('rgba(0,255,170,0.5)');
                        queueDialogue([{ id: `ns-win-${Date.now()}`, character: 'ATHENA', text: `System secured. Final score: ${score}` }]);
                    } else {
                        audio.playError();
                        setGlitchActive(true);
                        setScreenFlash('rgba(255,0,85,0.7)');
                        queueDialogue([{ id: `ns-fail-${Date.now()}`, character: 'BYTE', text: `Breach detected. Simulation failed.`, isGlitchy: true }]);
                    }
                    setTimeout(() => onComplete(score, { completionTime: 45, difficulty, maxCombo }), 2000);
                    return 0;
                }
                if (prev === 10) {
                    audio.playSystemMessage?.({ type: 'warning' });
                    setAdversaryMsg('Time running out. Speed up.');
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, score, difficultyMultiplier, maxCombo, difficulty, onComplete, queueDialogue]);

    // Interactions
    const handleTargetClick = useCallback((id: string, pos: [number, number, number], color: string) => {
        if (gameState !== 'PLAYING') return;
        audio.playClick();

        setNodes(prev => prev.filter(n => n.id !== id));

        const newCombo = combo + 1;
        setCombo(newCombo);
        setMaxCombo(c => Math.max(c, newCombo));

        const pts = Math.floor(50 * Math.min(newCombo, 10) * difficultyMultiplier);
        setScore(s => s + pts);

        const effId = `${Date.now()}`;
        setEffects(prev => [...prev,
        { id: `ex-${effId}`, type: 'explode', position: pos, color },
        { id: `sc-${effId}`, type: 'score', position: [pos[0], pos[1] + 2, pos[2]], text: `+${pts}`, color }
        ]);

        setScreenFlash(`${color}33`);
        setTimeout(() => setScreenFlash(null), 100);
    }, [gameState, combo, difficultyMultiplier]);

    const handleHazardClick = useCallback((id: string, pos: [number, number, number]) => {
        if (gameState !== 'PLAYING') return;
        audio.playError();

        setNodes(prev => prev.filter(n => n.id !== id));
        setCombo(0);
        setScore(s => Math.max(0, s - 300));

        const effId = `${Date.now()}`;
        setEffects(prev => [...prev,
        { id: `ex-${effId}`, type: 'explode', position: pos, color: '#ff0022' },
        { id: `sc-${effId}`, type: 'score', position: [pos[0], pos[1] + 2, pos[2]], text: `MISS`, color: '#ff0022' }
        ]);

        setGlitchActive(true);
        setScreenFlash('rgba(255,0,34,0.6)');
        setTimeout(() => { setGlitchActive(false); setScreenFlash(null); }, 400);

        setAdversaryMsg('A fatal miscalculation.');
    }, [gameState]);

    const removeEffect = useCallback((id: string) => setEffects(p => p.filter(e => e.id !== id)), []);

    return (
        <div className="relative w-full h-[700px] rounded-[32px] overflow-hidden border border-[#0066ff]/20 bg-[#000005] shadow-[0_0_80px_rgba(0,102,255,0.1)] font-sans">
            <AnimatePresence>
                {screenFlash && (<motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="absolute inset-0 z-30 pointer-events-none mix-blend-screen" style={{ backgroundColor: screenFlash }} />)}
            </AnimatePresence>

            {/* AAA Glassmorphic HUD */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
                <div className="flex flex-col gap-4 filter drop-shadow-xl w-72 pointer-events-auto">
                    {/* Score Panel */}
                    <div className="bg-[#020510]/80 backdrop-blur-2xl rounded-2xl p-4 border border-[#00ffff]/30 shadow-[0_10px_30px_rgba(0,255,255,0.15)] relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#00ffff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center gap-2 text-[#00ffff] mb-1">
                            <Activity className="w-5 h-5 animate-pulse" />
                            <span className="text-xs uppercase tracking-[0.2em] font-black">{t('game.hud.score') || 'SCORE'}</span>
                        </div>
                        <div className="text-4xl font-black tabular-nums tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-white to-[#00ffff]" style={{ textShadow: '0 0 20px rgba(0,255,255,0.4)' }}>
                            {score.toLocaleString()}
                        </div>
                    </div>

                    {/* Combo Panel */}
                    <AnimatePresence>
                        {combo > 1 && (
                            <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="bg-[#020510]/80 backdrop-blur-2xl rounded-2xl p-4 border border-[#ffaa00]/40 shadow-[0_0_30px_rgba(255,170,0,0.3)] relative overflow-hidden">
                                <div className="absolute inset-0 bg-[#ffaa00]/10 animate-pulse"></div>
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-2">
                                        <Flame className="w-6 h-6 text-[#ffaa00] animate-bounce" />
                                        <span className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-white to-[#ffaa00] drop-shadow-[0_0_10px_rgba(255,170,0,0.8)]">{combo}x</span>
                                    </div>
                                    <span className="text-[10px] uppercase font-black tracking-widest text-[#ffaa00]/80">{t('game.hud.combo_chain') || 'CHAIN'}</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex flex-col items-end gap-4 filter drop-shadow-xl">
                    {/* Time Panel */}
                    <div className="bg-[#020510]/80 backdrop-blur-2xl rounded-2xl p-4 border border-[#bb88ff]/30 shadow-[0_10px_30px_rgba(187,136,255,0.15)] min-w-[140px] text-right">
                        <div className="flex items-center justify-end gap-2 text-[#bb88ff] mb-1">
                            <span className="text-xs uppercase tracking-[0.2em] font-black">{t('game.hud.time') || 'TIME'}</span>
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className={`text-4xl font-black tabular-nums tracking-tighter ${timeLeft <= 10 ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-300 animate-pulse' : 'text-transparent bg-clip-text bg-gradient-to-r from-white to-[#bb88ff]'}`} style={{ textShadow: timeLeft <= 10 ? '0 0 20px rgba(255,0,0,0.6)' : '0 0 20px rgba(187,136,255,0.4)' }}>
                            {timeLeft}s
                        </div>
                    </div>
                    {/* Difficulty Badge */}
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border backdrop-blur-md ${difficulty === 'HARD' ? 'border-[#ff0055]/50 text-[#ff0055] bg-[#ff0055]/10 shadow-[0_0_15px_rgba(255,0,85,0.4)]' : 'border-[#00ffff]/50 text-[#00ffff] bg-[#00ffff]/10 shadow-[0_0_15px_rgba(0,255,255,0.4)]'}`}>
                        {difficulty}
                    </div>
                </div>
            </div>

            {/* Cinematic Instructions */}
            <AnimatePresence>
                {timeLeft > 40 && gameState === 'PLAYING' && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, filter: 'blur(10px)' }} transition={{ duration: 0.5 }} className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                        <div className="bg-[#000510]/90 backdrop-blur-3xl p-8 rounded-[32px] border border-[#00ffff]/40 shadow-[0_30px_80px_rgba(0,255,255,0.3)] text-center relative overflow-hidden">
                            <div className="text-[#00ffff] font-black text-3xl uppercase tracking-widest mb-4 drop-shadow-[0_0_15px_rgba(0,255,255,0.8)]">
                                <TargetCenter className="inline w-10 h-10 mr-3 -mt-2 animate-pulse" /> NEON SHIFT
                            </div>
                            <div className="flex gap-8 justify-center">
                                <div className="text-center">
                                    <div className="w-12 h-12 mx-auto mb-2 rounded-full border-2 border-[#00ffff] bg-[#00ffff]/20 flex items-center justify-center shadow-[0_0_15px_rgba(0,255,255,0.5)]">
                                        <Target className="w-6 h-6 text-[#00ffff]" />
                                    </div>
                                    <div className="text-[#aaffff] font-bold text-xs uppercase tracking-wider">Click Targets</div>
                                </div>
                                <div className="text-center">
                                    <div className="w-12 h-12 mx-auto mb-2 rounded-full border-2 border-[#ff0055] bg-[#ff0055]/20 flex items-center justify-center shadow-[0_0_15px_rgba(255,0,85,0.5)]">
                                        <SkullIcon className="w-6 h-6 text-[#ff0055]" />
                                    </div>
                                    <div className="text-[#ffcccc] font-bold text-xs uppercase tracking-wider">Avoid Hazards</div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Agent Comms Panel */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row gap-4 z-10 pointer-events-none">
                <div className="flex-1 bg-[#020510]/80 backdrop-blur-2xl rounded-2xl p-4 border border-[#00ffff]/20 border-l-4 border-l-[#00ffff] shadow-xl relative overflow-hidden">
                    <div className="text-[10px] text-[#00ffff] mb-2 uppercase tracking-[0.2em] font-black flex items-center gap-2"><Shield className="w-4 h-4" /> {t('game.advisor.label') || 'ADVISOR'}</div>
                    <div className="text-sm text-[#ccffff]/90 font-mono leading-relaxed relative z-10">{advisorMsg}</div>
                </div>
                <div className="flex-1 bg-[#020510]/80 backdrop-blur-2xl rounded-2xl p-4 border border-[#ff0055]/20 border-l-4 border-l-[#ff0055] shadow-xl relative overflow-hidden">
                    <div className="text-[10px] text-[#ff0055] mb-2 uppercase tracking-[0.2em] font-black flex items-center gap-2"><Zap className="w-4 h-4" /> {t('game.adversary.label') || 'ADVERSARY'}</div>
                    <div className="text-sm text-[#ffcccc]/90 font-mono leading-relaxed relative z-10">{adversaryMsg}</div>
                </div>
            </div>

            {/* Game Over Cinematic Screen */}
            <AnimatePresence>
                {gameState !== 'PLAYING' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-40 flex items-center justify-center bg-[#00000a]/95 backdrop-blur-2xl">
                        <motion.div initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", damping: 20 }} className="text-center p-12 w-full max-w-xl rounded-[40px] border border-[#00ffff]/30 bg-gradient-to-b from-[#020510]/90 to-black shadow-[0_50px_100px_rgba(0,102,255,0.2)] relative overflow-hidden pointer-events-auto">

                            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 blur-[100px] opacity-40 ${gameState === 'SUCCESS' ? 'bg-[#00ffaa]' : 'bg-[#ff0055]'}`}></div>

                            <div className={`w-32 h-32 mx-auto mb-8 rounded-full flex items-center justify-center relative z-10 ${gameState === 'SUCCESS' ? 'bg-[#00ffaa]/20 border-2 border-[#00ffaa] shadow-[0_0_50px_rgba(0,255,170,0.5)]' : 'bg-[#ff0055]/20 border-2 border-[#ff0055] shadow-[0_0_50px_rgba(255,0,85,0.4)]'}`}>
                                {gameState === 'SUCCESS' ? <Trophy className="w-16 h-16 text-[#00ffaa] drop-shadow-md" /> : <SkullIcon className="w-16 h-16 text-[#ff0055] drop-shadow-md" />}
                            </div>

                            <h2 className={`text-4xl sm:text-5xl font-black uppercase tracking-tighter mb-4 relative z-10 ${gameState === 'SUCCESS' ? 'text-transparent bg-clip-text bg-gradient-to-b from-white to-[#00ffaa]' : 'text-transparent bg-clip-text bg-gradient-to-b from-white to-[#ff0055]'}`} style={{ textShadow: gameState === 'SUCCESS' ? '0 10px 30px rgba(0,255,170,0.4)' : '0 10px 30px rgba(255,0,85,0.4)' }}>
                                {gameState === 'SUCCESS' ? 'SYSTEM SECURED' : 'BREACH DETECTED'}
                            </h2>

                            <div className="bg-black/60 rounded-3xl p-8 border border-white/10 mb-8 relative z-10 backdrop-blur-md">
                                <div className="text-sm text-gray-400 uppercase tracking-widest font-bold mb-2">Final Evaluation</div>
                                <div className="text-6xl text-white font-mono font-black tabular-nums">{score.toLocaleString()}</div>
                                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-sm font-mono text-[#ffaa00]">
                                    <span>Max Combo Maintained:</span>
                                    <span className="font-bold text-lg">{maxCombo}x</span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium 3D Canvas */}
            <div className={`absolute inset-0 z-0 ${gameState !== 'PLAYING' ? 'pointer-events-none' : ''}`}>
                <Canvas camera={{ position: [0, 0, 15], fov: 70 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}>
                    <color attach="background" args={['#00000a']} />
                    <fog attach="fog" args={['#00000a', 5, 40]} />

                    <ambientLight intensity={0.4} />
                    <pointLight position={[10, 10, 10]} intensity={2} color="#00ffff" />
                    <pointLight position={[-10, -10, -10]} intensity={1} color="#ff00ff" />

                    <CameraRig intensity={combo} />
                    <HyperTunnel speedMultiplier={1 + combo * 0.05} />

                    <group>
                        {nodes.map(node => node.type === 'target' ? (
                            <TargetNode key={node.id} id={node.id} position={node.position} color={node.color} combo={combo} onClick={handleTargetClick} />
                        ) : (
                            <HazardNode key={node.id} id={node.id} position={node.position} onClick={handleHazardClick} />
                        ))}
                    </group>

                    {effects.map(eff => eff.type === 'explode' ? (
                        <ExplosionEffect key={eff.id} position={eff.position} color={eff.color} onComplete={() => removeEffect(eff.id)} />
                    ) : (
                        <FloatingScore key={eff.id} position={eff.position} text={eff.text} color={eff.color} onComplete={() => removeEffect(eff.id)} />
                    ))}

                    <Sparkles count={500} scale={[40, 40, 40]} size={2} speed={1 + combo * 0.1} opacity={0.6} color="#00ffff" noise={2} />
                    {glitchActive && <Sparkles count={200} scale={[30, 30, 30]} size={8} speed={3} opacity={0.8} color="#ff0055" noise={4} />}

                    <EffectComposer enableNormalPass={false}>
                        <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5 + combo * 0.1} />
                        <DepthOfField focusDistance={0.06} focalLength={0.05} bokehScale={4} height={480} />
                        <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.003 + combo * 0.0005, 0.003 + combo * 0.0005)} />
                        {(glitchActive || timeLeft <= 10) && <Noise opacity={0.2} />}
                        <Vignette eskil={false} offset={0.1} darkness={1.2} />
                        {(glitchActive) && (<Glitch delay={new THREE.Vector2(0, 0)} duration={new THREE.Vector2(0.2, 0.5)} mode={GlitchMode.SPORADIC} active ratio={0.8} />)}
                    </EffectComposer>
                </Canvas>
            </div>
        </div>
    );
};

export default NeonShift;
