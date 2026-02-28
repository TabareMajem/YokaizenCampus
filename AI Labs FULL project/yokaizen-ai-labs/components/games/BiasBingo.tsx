import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, MeshDistortMaterial, Float, Sparkles, Grid, Torus, Octahedron, Sphere, Box } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch, Vignette, Noise } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Activity, Shield, Zap, AlertTriangle, Flame, Target, Trophy, SkullIcon, Crosshair } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../../services/audioService';
import { useDialogue } from '../../contexts/DialogueContext';

export interface BiasBingoProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

// -------------------------------------------------------------------------------------------------
// AAA VISUAL COMPONENTS
// -------------------------------------------------------------------------------------------------

// High-fidelity Target Node (Synthwave Ring Sphere)
const TargetNode = ({ position, color, scale, onClick, id }: {
    position: [number, number, number]; color: string; scale: number; onClick: (id: string) => void; id: string;
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const coreRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);
    const [spawnScale, setSpawnScale] = useState(0);

    useFrame((state, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.x += delta * 1.5;
            groupRef.current.rotation.y += delta * 2;

            // Spawn animation
            if (spawnScale < 1) {
                setSpawnScale(s => Math.min(1, s + delta * 5));
            }

            const pulse = 1 + Math.sin(state.clock.elapsedTime * 8) * 0.1;
            groupRef.current.scale.setScalar(scale * spawnScale * pulse * (hovered ? 1.2 : 1));
        }
        if (coreRef.current) {
            coreRef.current.rotation.y -= delta * 3;
            coreRef.current.rotation.z += delta * 2;
        }
    });

    return (
        <Float speed={4} rotationIntensity={1} floatIntensity={1.5}>
            <group
                ref={groupRef}
                position={position}
                onClick={(e) => { e.stopPropagation(); onClick(id); }}
                onPointerOver={() => { setHovered(true); document.body.style.cursor = 'crosshair'; }}
                onPointerOut={() => { setHovered(false); document.body.style.cursor = 'crosshair'; }}
            >
                {/* Inner Energy Core */}
                <mesh ref={coreRef}>
                    <icosahedronGeometry args={[0.4, 2]} />
                    <MeshDistortMaterial
                        color={color}
                        emissive={color}
                        emissiveIntensity={hovered ? 6 : 3}
                        distort={0.3}
                        speed={5}
                        roughness={0.1}
                    />
                </mesh>

                {/* Outer Stabilization Ring */}
                <mesh>
                    <torusGeometry args={[0.7, 0.05, 16, 64]} />
                    <meshBasicMaterial color={color} transparent opacity={0.6} />
                </mesh>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.7, 0.02, 16, 64]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
                </mesh>

                <pointLight distance={6} intensity={hovered ? 5 : 2} color={color} />
            </group>
        </Float>
    );
};

// High-fidelity Hazard Node (Corrupted Crystal)
const HazardNode = ({ position, onClick, id }: {
    position: [number, number, number]; onClick: (id: string) => void; id: string;
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [spawnScale, setSpawnScale] = useState(0);

    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.x += delta * 3;
            meshRef.current.rotation.y -= delta * 2;

            if (spawnScale < 1) {
                setSpawnScale(s => Math.min(1, s + delta * 5));
            }

            const pulse = 1 + Math.sin(state.clock.elapsedTime * 15) * 0.15;
            meshRef.current.scale.setScalar(0.8 * spawnScale * pulse);
        }
    });

    return (
        <Float speed={8} floatIntensity={2} rotationIntensity={3}>
            <mesh
                ref={meshRef}
                position={position}
                onClick={(e) => { e.stopPropagation(); onClick(id); }}
                onPointerOver={() => { document.body.style.cursor = 'not-allowed'; }}
                onPointerOut={() => { document.body.style.cursor = 'crosshair'; }}
            >
                <octahedronGeometry args={[0.7, 0]} />
                <MeshDistortMaterial
                    color="#000000"
                    emissive="#ff0044"
                    emissiveIntensity={4}
                    distort={0.5}
                    speed={8}
                    wireframe
                    roughness={0}
                    metalness={1}
                />

                {/* Inner solid blood-red core */}
                <mesh scale={0.6}>
                    <octahedronGeometry args={[0.7, 0]} />
                    <meshBasicMaterial color="#ff0000" />
                </mesh>

                <pointLight distance={5} intensity={4} color="#ff0044" />
            </mesh>
        </Float>
    );
};

// Moving Cyber-Grid Floor
const CyberGrid = () => {
    const gridRef = useRef<any>();

    useFrame((state, delta) => {
        if (gridRef.current) {
            gridRef.current.position.z = (gridRef.current.position.z + delta * 8) % 4;
        }
    });

    return (
        <group position={[0, -5, 0]}>
            <Grid
                ref={gridRef}
                args={[60, 60]}
                cellSize={1}
                cellThickness={2}
                cellColor="#ff00aa"
                sectionSize={4}
                sectionThickness={3}
                sectionColor="#00ffaa"
                fadeDistance={30}
                fadeStrength={1}
            />
            {/* Ambient Base Glow under Grid */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
                <planeGeometry args={[60, 60]} />
                <meshBasicMaterial color="#1a0033" transparent opacity={0.8} />
            </mesh>
        </group>
    );
};

// Parallax & Shake Camera
const CameraRig = ({ intensity }: { intensity: number }) => {
    const { camera, mouse } = useThree();

    useFrame((state, delta) => {
        const time = state.clock.elapsedTime;

        // Base Shake from game intensity (combo)
        const shakeX = intensity > 0.5 ? (Math.random() - 0.5) * intensity * 0.4 : 0;
        const shakeY = intensity > 0.5 ? (Math.random() - 0.5) * intensity * 0.4 : 0;

        // Parallax based on mouse
        const targetX = (mouse.x * 3) + shakeX;
        const targetY = (mouse.y * 3) + shakeY;

        // Smooth interpolation
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, delta * 3);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, delta * 3);
        camera.lookAt(0, 0, 0);
    });

    return null;
};

// -------------------------------------------------------------------------------------------------
// MAIN COMPONENT & STATE
// -------------------------------------------------------------------------------------------------

interface GameNode { id: string; position: [number, number, number]; type: 'target' | 'hazard'; color: string; spawnedAt: number; lifetime: number; }

const TARGET_COLORS = ['#00ffaa', '#ff00aa', '#00aaff', '#facc15'];

// Restrict spawning roughly to screen bounds (-8 to 8 X, -4 to 4 Y)
const genPos = (): [number, number, number] => [
    (Math.random() - 0.5) * 16,
    (Math.random() - 0.5) * 8,
    (Math.random() - 0.5) * 6 - 2 // push back slightly
];

export const BiasBingo: React.FC<BiasBingoProps> = ({ onComplete, difficulty, t }) => {
    const { queueDialogue } = useDialogue();
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(45);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');
    const [combo, setCombo] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [nodes, setNodes] = useState<GameNode[]>([]);
    const [glitchActive, setGlitchActive] = useState(false);
    const [screenFlash, setScreenFlash] = useState<{ color: string, id: number } | null>(null);
    const [advisorMsg, setAdvisorMsg] = useState('Aim stable. Engaging targets.');
    const [adversaryMsg, setAdversaryMsg] = useState('Deploying countermeasures.');

    const diffMul = difficulty === 'HARD' ? 1.5 : difficulty === 'MEDIUM' ? 1.2 : 1;
    const spawnInterval = Math.max(400, 1200 - (score / 100) * 80);
    const hazardChance = Math.min(0.4, 0.15 + (score / 2000));

    // Narrative: Mission Briefing
    useEffect(() => {
        queueDialogue([
            { id: `biasbingo-brief-${Date.now()}`, character: 'BYTE', text: t('game.instructions.click_targets') || 'Identify and eliminate bias nodes.' },
            { id: `biasbingo-brief2-${Date.now()}`, character: 'ATHENA', text: t('game.instructions.avoid_hazards') || 'Do NOT engage corrupted logic spheres.', isGlitchy: true },
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

                // Ensure new position isn't too close to existing ones
                let newPos = genPos();

                return [...active, {
                    id: `${Date.now()}-${Math.random()}`,
                    position: newPos,
                    type: isHazard ? 'hazard' : 'target',
                    color: TARGET_COLORS[Math.floor(Math.random() * TARGET_COLORS.length)],
                    spawnedAt: now,
                    lifetime: Math.max(1500, 3000 - (score / 200) * 500),
                }];
            });
        }, spawnInterval);
        return () => clearInterval(interval);
    }, [gameState, spawnInterval, hazardChance, score]);

    // Agent chatter
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const aLines = ['Flow is stable.', 'Target trajectory acquired.', 'Keep up the momentum.', `Combo tracking at ${combo}x`];
        const eLines = ['Dodge this.', 'Your reaction time is sub-optimal.', 'Deploying decoys.', 'Error: Overload imminent.'];
        const iv = setInterval(() => {
            if (Math.random() > 0.6) {
                setAdversaryMsg(eLines[Math.floor(Math.random() * eLines.length)]);
                audio.playSystemMessage?.({ type: 'warning' });
            } else {
                setAdvisorMsg(aLines[Math.floor(Math.random() * aLines.length)]);
                audio.playSystemMessage?.({ type: 'success' });
            }
        }, 5500);
        return () => clearInterval(iv);
    }, [gameState, combo, t]);

    // Timer
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    const fs = score >= 600 ? 'SUCCESS' : 'FAILED';
                    setGameState(fs);
                    if (fs === 'SUCCESS') {
                        audio.playSuccess();
                        queueDialogue([
                            { id: `biasbingo-win-${Date.now()}`, character: 'SYNTAX', text: `Operation concluded. Final Score: ${score}. Max Combo: ${maxCombo}x.` },
                            { id: `biasbingo-win2-${Date.now()}`, character: 'ATHENA', text: 'System secured.' },
                        ]);
                    } else {
                        audio.playError();
                        queueDialogue([
                            { id: `biasbingo-fail-${Date.now()}`, character: 'BYTE', text: 'Breach detected! System compromised.', isGlitchy: true },
                        ]);
                    }
                    onComplete(score, { completionTime: 45 - prev, difficulty, maxCombo });
                    return 0;
                }
                if (prev <= 10) audio.playError(); // Warning beep
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, score, onComplete, difficulty, maxCombo, queueDialogue, t]);

    const handleTargetClick = useCallback((id: string) => {
        if (gameState !== 'PLAYING') return;

        const node = nodes.find(n => n.id === id);

        setNodes(prev => prev.filter(n => n.id !== id));
        audio.playClick();
        const nc = combo + 1;
        setCombo(nc);
        setMaxCombo(c => Math.max(c, nc));

        // Score calculation: Combo multiplier
        const points = Math.floor(50 * Math.min(nc, 10) * diffMul);
        setScore(s => s + points);

        setScreenFlash({ color: node?.color || '#00ffaa', id: Date.now() });
    }, [gameState, combo, diffMul, nodes]);

    const handleHazardClick = useCallback((id: string) => {
        if (gameState !== 'PLAYING') return;
        setNodes(prev => prev.filter(n => n.id !== id));
        audio.playError();
        setCombo(0);
        setScore(s => Math.max(0, s - 300)); // Harsher penalty

        setGlitchActive(true);
        setScreenFlash({ color: '#ff0000', id: Date.now() });
        setTimeout(() => { setGlitchActive(false); }, 500);
    }, [gameState]);

    return (
        <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border border-cyan-500/30 bg-[#050014] shadow-[0_0_80px_rgba(0,255,170,0.15)] font-mono select-none" style={{ cursor: 'crosshair' }}>

            {/* Screen Flash Overlay */}
            <AnimatePresence>
                {screenFlash && (
                    <motion.div
                        key={screenFlash.id}
                        initial={{ opacity: 0.4 }}
                        animate={{ opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="absolute inset-0 z-30 pointer-events-none mix-blend-screen"
                        style={{ backgroundColor: screenFlash.color }}
                    />
                )}
            </AnimatePresence>

            {/* Top HUD */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-20 pointer-events-none">
                <div className="flex flex-col gap-4">
                    <div className="bg-[#020617]/80 backdrop-blur-xl rounded-xl p-4 border border-cyan-500/40 shadow-[0_0_20px_rgba(0,255,170,0.2)]">
                        <div className="flex items-center gap-2 text-cyan-400 mb-2">
                            <Activity className="w-5 h-5" />
                            <span className="text-[11px] uppercase tracking-[0.2em] font-black">Score Matrix</span>
                        </div>
                        <div className="text-4xl font-black text-white tabular-nums tracking-tighter drop-shadow-md">{score}</div>
                    </div>

                    {/* Dynamic Combo UI */}
                    <AnimatePresence>
                        {combo > 1 && (
                            <motion.div
                                initial={{ scale: 0, x: -50 }}
                                animate={{ scale: 1, x: 0 }}
                                exit={{ scale: 0 }}
                                className="bg-orange-950/60 backdrop-blur-md rounded-xl p-4 border border-orange-500/60 shadow-[0_0_30px_rgba(249,115,22,0.3)]"
                            >
                                <div className="flex items-center gap-3">
                                    <Flame className="w-6 h-6 text-orange-400 animate-pulse" />
                                    <span className="text-orange-400 font-black text-3xl italic tracking-tighter">{combo}x</span>
                                </div>
                                <div className="text-[10px] text-orange-200/80 uppercase tracking-[0.2em] mt-2 font-bold">Multiplier Chain</div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex flex-col items-end gap-3">
                    <div className="bg-[#020617]/80 backdrop-blur-xl rounded-xl p-4 border border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.2)] flex flex-col items-end">
                        <div className="flex items-center gap-2 text-blue-400 mb-2">
                            <AlertTriangle className="w-5 h-5" />
                            <span className="text-[11px] uppercase tracking-[0.2em] font-black">Time Remnant</span>
                        </div>
                        <div className={`text-4xl font-black tabular-nums tracking-widest ${timeLeft <= 10 ? 'text-rose-500 animate-pulse drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]' : 'text-white'}`}>
                            {timeLeft}s
                        </div>
                    </div>
                    <div className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] border shadow-lg ${difficulty === 'HARD' ? 'border-rose-500 text-rose-400 bg-rose-500/20' : difficulty === 'MEDIUM' ? 'border-amber-500 text-amber-400 bg-amber-500/20' : 'border-emerald-500 text-emerald-400 bg-emerald-500/20'}`}>
                        {difficulty} OP-MODE
                    </div>
                </div>
            </div>

            {/* Center Instructions Overlay (Fades out) */}
            <AnimatePresence>
                {timeLeft > 40 && gameState === 'PLAYING' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none text-center"
                    >
                        <div className="bg-[#020617]/90 backdrop-blur-2xl p-8 rounded-2xl border border-cyan-500/50 shadow-[0_0_50px_rgba(0,255,170,0.3)]">
                            <Crosshair className="w-16 h-16 text-cyan-400 mx-auto mb-4 animate-spin-slow" />
                            <div className="text-cyan-400 font-black text-2xl uppercase tracking-[0.2em] mb-4 drop-shadow-md">
                                DESTROY GLOWING NODES
                            </div>
                            <div className="text-rose-500 font-bold text-sm tracking-widest bg-rose-950/50 py-2 px-4 rounded-lg border border-rose-500/30">
                                <SkullIcon className="inline w-4 h-4 mr-2" /> AVOID RED CORRUPTION
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Agent Chatter Terminals */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row gap-4 sm:gap-6 z-20 pointer-events-none">
                <div className="flex-1 bg-[#020617]/80 backdrop-blur-xl rounded-xl p-4 border-l-4 border-cyan-500 shadow-lg relative overflow-hidden">
                    <div className="absolute inset-0 bg-cyan-500/5 opacity-50"></div>
                    <div className="text-[10px] text-cyan-400 mb-2 uppercase tracking-[0.2em] font-black flex items-center gap-2">
                        <Shield className="w-4 h-4" /> Tactical Advisor
                    </div>
                    <div className="text-sm text-cyan-100/90 font-mono tracking-wide">{advisorMsg}</div>
                </div>
                <div className="flex-1 bg-[#020617]/80 backdrop-blur-xl rounded-xl p-4 border-l-4 border-rose-500 shadow-lg relative overflow-hidden">
                    <div className="absolute inset-0 bg-rose-500/5 opacity-50"></div>
                    <div className="text-[10px] text-rose-500 mb-2 uppercase tracking-[0.2em] font-black flex items-center gap-2">
                        <Zap className="w-4 h-4" /> Counter-Measure AI
                    </div>
                    <div className="text-sm text-rose-100/90 font-mono tracking-wide">{adversaryMsg}</div>
                </div>
            </div>

            {/* Game Over Cinematic State */}
            <AnimatePresence>
                {gameState !== 'PLAYING' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 z-40 flex items-center justify-center p-4 sm:p-0 bg-[#020617]/95 backdrop-blur-xl"
                    >
                        <motion.div
                            initial={{ scale: 0.8, y: 30 }}
                            animate={{ scale: 1, y: 0 }}
                            className="text-center p-10 w-full rounded-3xl border border-white/10 bg-black/60 shadow-2xl max-w-xl relative overflow-hidden"
                        >
                            {/* Decorative background scanlines for modal */}
                            <div className="absolute inset-0 z-0 opacity-20 bg-[linear-gradient(rgba(255,255,255,0.05)_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none"></div>

                            <div className="relative z-10">
                                <div className={`w-24 h-24 mx-auto mb-8 rounded-2xl flex items-center justify-center shadow-2xl ${gameState === 'SUCCESS' ? 'bg-cyan-500/20 border border-cyan-500/50 shadow-[0_0_30px_rgba(0,255,170,0.3)]' : 'bg-rose-500/20 border border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.3)]'}`}>
                                    {gameState === 'SUCCESS' ? <Trophy className="w-12 h-12 text-cyan-400" /> : <SkullIcon className="w-12 h-12 text-rose-400" />}
                                </div>
                                <div className={`text-4xl sm:text-6xl font-black uppercase tracking-[0.2em] mb-6 ${gameState === 'SUCCESS' ? 'text-cyan-400' : 'text-rose-500'} drop-shadow-[0_0_20px_currentColor]`}>
                                    {gameState === 'SUCCESS' ? 'SYSTEM SECURED' : 'BREACH DETECTED'}
                                </div>

                                <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-700/50 mb-4 inline-block min-w-[300px]">
                                    <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-700/50">
                                        <span className="text-slate-400 text-xs uppercase tracking-widest font-bold">Final Score</span>
                                        <span className="text-3xl font-mono text-white font-black">{score}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400 text-xs uppercase tracking-widest font-bold">Max Combo Multiplier</span>
                                        <span className="text-xl font-mono text-orange-400 font-black">{maxCombo}x</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3D WebGL Context */}
            <div className="absolute inset-0 z-0 cursor-crosshair">
                <Canvas camera={{ position: [0, 0, 12], fov: 60 }} gl={{ antialias: false, powerPreference: "high-performance" }}>
                    <color attach="background" args={['#050014']} />
                    <fog attach="fog" args={['#050014', 10, 30]} />

                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={2.5} color="#00ffaa" />
                    <pointLight position={[-10, -10, -10]} intensity={1.5} color="#ff00aa" />

                    <CyberGrid />
                    <CameraRig intensity={combo / 10} />

                    {/* Render Interactive Nodes */}
                    {nodes.map(node => node.type === 'target' ? (
                        <TargetNode key={node.id} id={node.id} position={node.position} color={node.color} scale={1} onClick={handleTargetClick} />
                    ) : (
                        <HazardNode key={node.id} id={node.id} position={node.position} onClick={handleHazardClick} />
                    ))}

                    {/* Speed Lines / Environmental Particles */}
                    <Sparkles count={400} scale={[40, 20, 40]} size={2} speed={0.5 + combo * 0.1} opacity={0.4} color="#00ffaa" />
                    <Sparkles count={150} scale={[20, 20, 20]} size={6} speed={1} opacity={0.3} color="#ff00aa" />

                    <EffectComposer>
                        <Bloom
                            luminanceThreshold={0.15}
                            luminanceSmoothing={0.9}
                            intensity={2.5}
                            mipmapBlur
                        />
                        <ChromaticAberration
                            blendFunction={BlendFunction.NORMAL}
                            offset={new THREE.Vector2(0.003, 0.003)}
                        />
                        <Vignette eskil={false} offset={0.1} darkness={1.1} />
                        <Noise opacity={0.08} blendFunction={BlendFunction.OVERLAY} />

                        {(glitchActive || combo > 15) && (
                            <Glitch
                                delay={new THREE.Vector2(0, 0)}
                                duration={new THREE.Vector2(0.1, 0.3)}
                                strength={new THREE.Vector2(0.3, 0.8)}
                                mode={glitchActive ? GlitchMode.CONSTANT_WILD : GlitchMode.SPORADIC}
                                active={true}
                                ratio={glitchActive ? 1 : 0.2}
                            />
                        )}
                    </EffectComposer>
                </Canvas>
            </div>

            <div className="absolute inset-0 z-10 pointer-events-none opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px]"></div>
        </div>
    );
};

