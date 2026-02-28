import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, MeshDistortMaterial, Float, Sparkles, Tetrahedron, Icosahedron, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch, Vignette, Scanline } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Activity, Shield, Zap, AlertTriangle, Flame, Target, Trophy, SkullIcon, Timer, ZapOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../../services/audioService';
import { useDialogue } from '../../contexts/DialogueContext';

export interface LatencyLabProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

// -------------------------------------------------------------------------------------------------
// AAA VISUAL COMPONENTS
// -------------------------------------------------------------------------------------------------

// High-Speed Data Packet (Target)
const TargetNode = ({ position, color, scale, onClick, id, lifetime, spawnedAt }: {
    position: [number, number, number]; color: string; scale: number; onClick: (id: string, reactionTime: number) => void; id: string; lifetime: number; spawnedAt: number;
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);
    const [spawnScale, setSpawnScale] = useState(0);

    useFrame((state, delta) => {
        if (groupRef.current) {
            // Hyper-fast rotation to simulate "processing"
            groupRef.current.rotation.x += delta * 5;
            groupRef.current.rotation.y += delta * 7;

            // Spawn animation (very fast pop-in)
            if (spawnScale < 1) {
                setSpawnScale(s => Math.min(1, s + delta * 15));
            }

            // Pulsating effect
            const pulse = 1 + Math.sin(state.clock.elapsedTime * 20) * 0.1;

            // Shrink as it gets closer to dying (urgency indicator)
            const timeAlive = Date.now() - spawnedAt;
            const lifeRatio = Math.max(0, 1 - (timeAlive / lifetime));
            const urgencyShrink = 0.5 + (lifeRatio * 0.5); // Shrinks down to 50% size right before disappearing

            groupRef.current.scale.setScalar(scale * spawnScale * pulse * urgencyShrink * (hovered ? 1.3 : 1));
        }
    });

    return (
        <group
            ref={groupRef}
            position={position}
            onClick={(e) => {
                e.stopPropagation();
                const reactionTime = Date.now() - spawnedAt;
                onClick(id, reactionTime);
            }}
            onPointerOver={() => { setHovered(true); document.body.style.cursor = 'crosshair'; }}
            onPointerOut={() => { setHovered(false); document.body.style.cursor = 'crosshair'; }}
        >
            {/* Core */}
            <mesh>
                <Tetrahedron args={[0.6, 1]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={hovered ? 8 : 4}
                    roughness={0.2}
                    metalness={0.8}
                    wireframe={hovered}
                />
            </mesh>

            {/* Outer Energy Shell */}
            <mesh scale={1.3}>
                <Tetrahedron args={[0.6, 1]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.1} wireframe />
            </mesh>

            <pointLight distance={8} intensity={hovered ? 6 : 3} color={color} />
        </group>
    );
};

// High-Speed Corrupted Packet (Hazard)
const HazardNode = ({ position, onClick, id }: {
    position: [number, number, number]; onClick: (id: string) => void; id: string;
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [spawnScale, setSpawnScale] = useState(0);

    useFrame((state, delta) => {
        if (meshRef.current) {
            // Chaotic rotation
            meshRef.current.rotation.x -= delta * 8;
            meshRef.current.rotation.z += delta * 6;

            if (spawnScale < 1) {
                setSpawnScale(s => Math.min(1, s + delta * 10));
            }

            const pulse = 1 + Math.random() * 0.2; // Erratic pulse
            meshRef.current.scale.setScalar(0.8 * spawnScale * pulse);
        }
    });

    return (
        <mesh
            ref={meshRef}
            position={position}
            onClick={(e) => { e.stopPropagation(); onClick(id); }}
            onPointerOver={() => { document.body.style.cursor = 'not-allowed'; }}
            onPointerOut={() => { document.body.style.cursor = 'crosshair'; }}
        >
            <Icosahedron args={[0.6, 0]} />
            <MeshDistortMaterial
                color="#000000"
                emissive="#ff3300"
                emissiveIntensity={5}
                distort={0.8}
                speed={10}
                wireframe={false}
                roughness={0}
            />
            {/* Glitchy wireframe overlay */}
            <mesh scale={1.1}>
                <Icosahedron args={[0.6, 0]} />
                <meshBasicMaterial color="#ff0000" wireframe transparent opacity={0.5} />
            </mesh>
            <pointLight distance={6} intensity={5} color="#ff3300" />
        </mesh>
    );
};

// Quantum Data Vortex Background
const DataVortex = ({ speedMultiplier }: { speedMultiplier: number }) => {
    const vortexRef = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        if (vortexRef.current) {
            // Swirling effect
            vortexRef.current.rotation.z -= delta * 0.2 * speedMultiplier;
        }
    });

    return (
        <group ref={vortexRef}>
            {/* Deep background stars/data points */}
            <Stars radius={50} depth={50} count={2000} factor={6} saturation={1} fade speed={2 * speedMultiplier} />

            {/* Swirling tunnel rings */}
            {[...Array(8)].map((_, i) => (
                <mesh key={i} position={[0, 0, -5 - (i * 8)]} rotation={[0, 0, (Math.PI / 4) * i]}>
                    <torusGeometry args={[8 + i * 2, 0.05, 16, 100]} />
                    <meshBasicMaterial color={i % 2 === 0 ? "#00ffff" : "#00ff88"} transparent opacity={0.1 / (i * 0.5 + 1)} wireframe />
                </mesh>
            ))}
        </group>
    );
};

// Parallax Camera focusing on extreme depth and speed
const CameraRig = ({ intensity }: { intensity: number }) => {
    const { camera, mouse } = useThree();

    useFrame((state, delta) => {
        // High frequency shake for latency feel
        const shakeX = intensity > 0.5 ? (Math.random() - 0.5) * intensity * 0.2 : 0;
        const shakeY = intensity > 0.5 ? (Math.random() - 0.5) * intensity * 0.2 : 0;

        // Tight parallax
        const targetX = (mouse.x * 2) + shakeX;
        const targetY = (mouse.y * 2) + shakeY;

        camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, delta * 5);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, delta * 5);
        camera.lookAt(0, 0, 0);

        // Slight fov warp based on intensity (simulating speed)
        (camera as THREE.PerspectiveCamera).fov = THREE.MathUtils.lerp((camera as THREE.PerspectiveCamera).fov, 60 + intensity * 5, delta * 2);
        camera.updateProjectionMatrix();
    });

    return null;
};

// -------------------------------------------------------------------------------------------------
// MAIN COMPONENT & STATE
// -------------------------------------------------------------------------------------------------

interface GameNode { id: string; position: [number, number, number]; type: 'target' | 'hazard'; color: string; spawnedAt: number; lifetime: number; }

const TARGET_COLORS = ['#00ffff', '#00ffaa', '#ffffff', '#00aaff'];

// Spawn area is tighter in the center for quick aiming
const genPos = (): [number, number, number] => [
    (Math.random() - 0.5) * 12,
    (Math.random() - 0.5) * 6,
    (Math.random() - 0.5) * 4 - 1
];

export const LatencyLab: React.FC<LatencyLabProps> = ({ onComplete, difficulty, t }) => {
    const { queueDialogue } = useDialogue();
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(40);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');
    const [combo, setCombo] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [nodes, setNodes] = useState<GameNode[]>([]);

    // Analytics
    const [averageReactionTime, setAverageReactionTime] = useState(0);
    const [hits, setHits] = useState(0);

    const [glitchActive, setGlitchActive] = useState(false);
    const [screenFlash, setScreenFlash] = useState<{ color: string, id: number } | null>(null);

    const [advisorMsg, setAdvisorMsg] = useState('Quantum link established. Awaiting input.');
    const [adversaryMsg, setAdversaryMsg] = useState('Injecting latency spikes.');

    const diffMul = difficulty === 'HARD' ? 1.5 : difficulty === 'MEDIUM' ? 1.2 : 1;

    // Latency lab makes nodes spawn and die MUCH faster than BiasBingo
    const spawnInterval = Math.max(250, 800 - (score / 150) * 100);
    const hazardChance = Math.min(0.35, 0.10 + (score / 2500));
    const baseLifetime = Math.max(700, 2000 - (score / 100) * 200); // Nodes disappear very quickly!

    // Narrative: Mission Briefing
    useEffect(() => {
        queueDialogue([
            { id: `latencylab-brief-${Date.now()}`, character: 'SYNTAX', text: t('game.instructions.click_targets') || 'Intercept data packets before they decouple.' },
            { id: `latencylab-brief2-${Date.now()}`, character: 'ATHENA', text: t('game.instructions.avoid_hazards') || 'Do NOT touch anomalous red spikes.', isGlitchy: true },
        ]);
    }, [queueDialogue, t]);

    // Node spawner handler (very aggressive lifecycle management)
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        // Spawn loop
        const spawnTimer = setInterval(() => {
            setNodes(prev => {
                const now = Date.now();
                // Filter out dead nodes
                const active = prev.filter(n => now - n.spawnedAt < n.lifetime);

                // Missed targets break combo (penalty for letting them die)
                const expiredTargets = prev.filter(n => n.type === 'target' && now - n.spawnedAt >= n.lifetime);
                if (expiredTargets.length > 0 && active.length > 0) { // Check active length to avoid repeated pings on empty board
                    setCombo(0);
                    audio.playSystemMessage?.({ type: 'warning' }); // Low warning
                }

                if (active.length >= 8) return active; // Max on screen

                const isHazard = Math.random() < hazardChance;

                return [...active, {
                    id: `${Date.now()}-${Math.random()}`,
                    position: genPos(),
                    type: isHazard ? 'hazard' : 'target',
                    color: TARGET_COLORS[Math.floor(Math.random() * TARGET_COLORS.length)],
                    spawnedAt: now,
                    lifetime: isHazard ? baseLifetime * 1.5 : baseLifetime, // Hazards stick around slightly longer to block shots
                }];
            });
        }, spawnInterval);

        // Faster cleanup loop to ensure visual snappy despawns
        const cleanupTimer = setInterval(() => {
            setNodes(prev => {
                const now = Date.now();
                return prev.filter(n => now - n.spawnedAt < n.lifetime);
            });
        }, 100);

        return () => {
            clearInterval(spawnTimer);
            clearInterval(cleanupTimer);
        };
    }, [gameState, spawnInterval, hazardChance, baseLifetime, score]);

    // Agent chatter
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const aLines = [
            'Packet routing optimal.',
            `Latency holding at ~${averageReactionTime ? Math.floor(averageReactionTime) : '---'}ms.`,
            'Reflexes exceed baseline.',
            `Chain active: ${combo}x`
        ];
        const eLines = [
            'I sense hesitation.',
            'You are too slow.',
            'Data loss imminent.',
            'Increasing packet entropy.'
        ];
        const iv = setInterval(() => {
            if (Math.random() > 0.6) {
                setAdversaryMsg(eLines[Math.floor(Math.random() * eLines.length)]);
                audio.playSystemMessage?.({ type: 'warning' });
            } else {
                setAdvisorMsg(aLines[Math.floor(Math.random() * aLines.length)]);
                audio.playSystemMessage?.({ type: 'success' });
            }
        }, 4000); // Faster chatter for faster game
        return () => clearInterval(iv);
    }, [gameState, combo, averageReactionTime, t]);

    // Timer
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    const fs = score >= 500 ? 'SUCCESS' : 'FAILED';
                    setGameState(fs);
                    if (fs === 'SUCCESS') {
                        audio.playSuccess();
                        queueDialogue([
                            { id: `latencylab-win-${Date.now()}`, character: 'SYNTAX', text: `Test complete. Score: ${score}. Avg Latency: ${Math.floor(averageReactionTime)}ms.` },
                            { id: `latencylab-win2-${Date.now()}`, character: 'ATHENA', text: 'Quantum throughput verified.' },
                        ]);
                    } else {
                        audio.playError();
                        queueDialogue([
                            { id: `latencylab-fail-${Date.now()}`, character: 'BYTE', text: 'Throughput failure. Connection severed.', isGlitchy: true },
                        ]);
                    }
                    onComplete(score, { completionTime: 40 - prev, difficulty, maxCombo, averageReactionTime });
                    return 0;
                }
                if (prev <= 10) audio.playError(); // Warning beep
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, score, onComplete, difficulty, maxCombo, queueDialogue, averageReactionTime, t]);

    const handleTargetClick = useCallback((id: string, reactionTime: number) => {
        if (gameState !== 'PLAYING') return;

        const node = nodes.find(n => n.id === id);

        setNodes(prev => prev.filter(n => n.id !== id));
        audio.playClick();

        const nc = combo + 1;
        setCombo(nc);
        setMaxCombo(c => Math.max(c, nc));

        // Update reaction time
        setHits(h => {
            const newHits = h + 1;
            setAverageReactionTime(prev => ((prev * h) + reactionTime) / newHits);
            return newHits;
        });

        // Score calculation: heavily weights FAST reaction times
        const speedBonus = Math.max(0, 1000 - reactionTime) / 10; // Max 100 bonus pts for <1ms response, 0 for >1s
        const points = Math.floor((50 + speedBonus) * Math.min(nc, 10) * diffMul);

        setScore(s => s + points);

        setScreenFlash({ color: node?.color || '#00ffff', id: Date.now() });
    }, [gameState, combo, diffMul, nodes, averageReactionTime]);

    const handleHazardClick = useCallback((id: string) => {
        if (gameState !== 'PLAYING') return;
        setNodes(prev => prev.filter(n => n.id !== id));
        audio.playError();
        setCombo(0);
        setScore(s => Math.max(0, s - 400)); // Extreme penalty for misclicks under pressure

        setGlitchActive(true);
        setScreenFlash({ color: '#ff0000', id: Date.now() });
        setTimeout(() => { setGlitchActive(false); }, 300);
    }, [gameState]);

    return (
        <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border border-[#00ffff]/30 bg-[#000510] shadow-[0_0_80px_rgba(0,255,255,0.1)] font-mono select-none" style={{ cursor: 'crosshair' }}>

            {/* Screen Flash Overlay */}
            <AnimatePresence>
                {screenFlash && (
                    <motion.div
                        key={screenFlash.id}
                        initial={{ opacity: 0.3 }}
                        animate={{ opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }} // Faster flash for this game
                        className="absolute inset-0 z-30 pointer-events-none mix-blend-screen"
                        style={{ backgroundColor: screenFlash.color }}
                    />
                )}
            </AnimatePresence>

            {/* Top HUD - Sleek, High-Tech Minimalist */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-20 pointer-events-none">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-4 bg-[#010a1f]/80 backdrop-blur-md rounded-lg py-2 px-5 border-l-4 border-[#00ffff]">
                        <div>
                            <div className="text-[9px] uppercase tracking-widest text-[#00ffff]/70 font-bold mb-1">Throughput / Score</div>
                            <div className="text-3xl font-black text-white tabular-nums leading-none">{score}</div>
                        </div>
                        {averageReactionTime > 0 && (
                            <div className="border-l border-white/10 pl-4">
                                <div className="text-[9px] uppercase tracking-widest text-[#00ff88]/70 font-bold mb-1">Avg Latency</div>
                                <div className="text-xl font-bold text-[#00ff88] tabular-nums leading-none">{Math.floor(averageReactionTime)}<span className="text-[10px] ml-1">ms</span></div>
                            </div>
                        )}
                    </div>

                    {/* Minimal Combo UI */}
                    <AnimatePresence>
                        {combo > 1 && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.1 }}
                                className="inline-flex items-center gap-2 bg-[#ffaa00]/10 backdrop-blur-md rounded py-1 px-3 border border-[#ffaa00]/30"
                            >
                                <Zap className="w-3 h-3 text-[#ffaa00]" />
                                <span className="text-[#ffaa00] font-black text-sm tabular-nums tracking-widest">{combo}x CHAIN</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <div className={`flex flex-col items-end bg-[#010a1f]/80 backdrop-blur-md rounded-lg py-2 px-5 border-r-4 ${timeLeft <= 10 ? 'border-[#ff0044]' : 'border-blue-500'}`}>
                        <div className="text-[9px] uppercase tracking-widest text-blue-400/70 font-bold mb-1 flex items-center gap-1">
                            <Timer className="w-3 h-3" /> System Clock
                        </div>
                        <div className={`text-3xl font-black tabular-nums leading-none ${timeLeft <= 10 ? 'text-[#ff0044] animate-pulse drop-shadow-[0_0_10px_rgba(255,0,68,0.8)]' : 'text-white'}`}>
                            {timeLeft}.0<span className="text-sm opacity-50">s</span>
                        </div>
                    </div>
                    <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${difficulty === 'HARD' ? 'text-rose-400 bg-rose-500/10' : difficulty === 'MEDIUM' ? 'text-amber-400 bg-amber-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>
                        {difficulty} TIER
                    </div>
                </div>
            </div>

            {/* Center Instructions Overlay (Fades out quickly) */}
            <AnimatePresence>
                {timeLeft > 36 && gameState === 'PLAYING' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.3 }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none text-center"
                    >
                        <div className="flex flex-col items-center gap-4">
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }}>
                                <Target className="w-20 h-20 text-[#00ffff] opacity-80" />
                            </motion.div>
                            <div>
                                <div className="text-white font-black text-3xl uppercase tracking-[0.3em] drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
                                    INTERCEPT PACKETS
                                </div>
                                <div className="text-[#00ffff] font-medium text-sm tracking-widest mt-2 uppercase">
                                    Maximize Reaction Speed
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Agent Chatter Terminals (Minimalist) */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row gap-4 z-20 pointer-events-none">
                <div className="flex-1 bg-gradient-to-r from-[#00ffff]/10 to-transparent backdrop-blur-sm rounded-l-lg p-3 border-l-2 border-[#00ffff]">
                    <div className="text-[9px] text-[#00ffff]/70 mb-1 uppercase tracking-widest font-bold">Uplink Status</div>
                    <div className="text-xs text-white font-mono">{advisorMsg}</div>
                </div>
                <div className="flex-1 bg-gradient-to-l from-[#ff3300]/10 to-transparent backdrop-blur-sm rounded-r-lg p-3 border-r-2 border-[#ff3300] text-right">
                    <div className="text-[9px] text-[#ff3300]/70 mb-1 uppercase tracking-widest font-bold">Anomaly Detection</div>
                    <div className="text-xs text-white font-mono">{adversaryMsg}</div>
                </div>
            </div>

            {/* Game Over Cinematic State */}
            <AnimatePresence>
                {gameState !== 'PLAYING' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 z-40 flex items-center justify-center p-4 sm:p-0 bg-[#000510]/95 backdrop-blur-xl"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="text-center p-12 w-full rounded-2xl border border-white/5 bg-[#010a1f]/80 shadow-[0_40px_100px_rgba(0,0,0,0.8)] max-w-xl relative overflow-hidden"
                        >
                            <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>

                            <div className="relative z-10">
                                <div className={`w-20 h-20 mx-auto mb-6 rounded-xl flex items-center justify-center ${gameState === 'SUCCESS' ? 'bg-[#00ffff]/10 border border-[#00ffff]/40 shadow-[0_0_40px_rgba(0,255,255,0.2)]' : 'bg-[#ff3300]/10 border border-[#ff3300]/40 shadow-[0_0_40px_rgba(255,51,0,0.2)]'}`}>
                                    {gameState === 'SUCCESS' ? <Activity className="w-10 h-10 text-[#00ffff]" /> : <ZapOff className="w-10 h-10 text-[#ff3300]" />}
                                </div>
                                <div className={`text-4xl font-black uppercase tracking-[0.3em] mb-8 ${gameState === 'SUCCESS' ? 'text-white drop-shadow-[0_0_15px_rgba(0,255,255,0.5)]' : 'text-[#ff3300] drop-shadow-[0_0_15px_rgba(255,51,0,0.5)]'}`}>
                                    {gameState === 'SUCCESS' ? 'LINK OPTIMIZED' : 'CONNECTION LOST'}
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4 text-left">
                                    <div className="bg-[#000510]/80 p-4 rounded-lg border border-white/10">
                                        <div className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-1">Total Throughput</div>
                                        <div className="text-3xl font-mono text-white font-black">{score}</div>
                                    </div>
                                    <div className="bg-[#000510]/80 p-4 rounded-lg border border-white/10">
                                        <div className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-1">Avg Latency</div>
                                        <div className="text-3xl font-mono text-[#00ff88] font-black">{Math.floor(averageReactionTime)}<span className="text-sm ml-1">ms</span></div>
                                    </div>
                                    <div className="bg-[#000510]/80 p-4 rounded-lg border border-white/10 col-span-2 flex justify-between items-center">
                                        <div className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Peak Execution Chain</div>
                                        <div className="text-xl font-mono text-[#ffaa00] font-black">{maxCombo}x</div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3D WebGL Context */}
            <div className="absolute inset-0 z-0 cursor-crosshair">
                <Canvas camera={{ position: [0, 0, 15], fov: 60 }} gl={{ antialias: false, powerPreference: "high-performance", alpha: false }}>
                    <color attach="background" args={['#000510']} />

                    <ambientLight intensity={0.8} />
                    <pointLight position={[10, 10, 10]} intensity={3} color="#00ffff" />
                    <pointLight position={[-10, -10, -10]} intensity={2} color="#00ff88" />

                    <DataVortex speedMultiplier={1 + (combo * 0.05)} />
                    <CameraRig intensity={combo / 15} />

                    {/* Render Interactive Nodes */}
                    {nodes.map(node => node.type === 'target' ? (
                        <TargetNode
                            key={node.id}
                            id={node.id}
                            position={node.position}
                            color={node.color}
                            scale={1}
                            onClick={handleTargetClick}
                            lifetime={node.lifetime}
                            spawnedAt={node.spawnedAt}
                        />
                    ) : (
                        <HazardNode
                            key={node.id}
                            id={node.id}
                            position={node.position}
                            onClick={handleHazardClick}
                        />
                    ))}

                    {/* Foreground speedy particles */}
                    <Sparkles count={500} scale={[30, 15, 10]} size={1.5} speed={1 + combo * 0.2} opacity={0.6} color="#00ffff" />

                    <EffectComposer disableNormalPass>
                        <Bloom
                            luminanceThreshold={0.2}
                            luminanceSmoothing={0.9}
                            intensity={2.0}
                            mipmapBlur
                        />
                        <ChromaticAberration
                            blendFunction={BlendFunction.NORMAL}
                            offset={new THREE.Vector2(0.005 + (combo * 0.0002), 0.005)}
                        />
                        <Vignette eskil={false} offset={0.15} darkness={1.2} />
                        <Scanline blendFunction={BlendFunction.OVERLAY} density={1.5} opacity={0.1} />

                        {(glitchActive || combo > 20) && (
                            <Glitch
                                delay={new THREE.Vector2(0, 0)}
                                duration={new THREE.Vector2(0.1, 0.2)}
                                strength={new THREE.Vector2(0.2, 0.5)}
                                mode={glitchActive ? GlitchMode.CONSTANT_WILD : GlitchMode.SPORADIC}
                                active={true}
                                ratio={glitchActive ? 1 : 0.1} // More sparse glitch unless active
                            />
                        )}
                    </EffectComposer>
                </Canvas>
            </div>
        </div>
    );
};
