import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, MeshDistortMaterial, Float, Sparkles, MeshTransmissionMaterial, Cone, TorusKnot } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch, Vignette, Noise } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Activity, Shield, Zap, AlertTriangle, Flame, Target, Trophy, SkullIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../../services/audioService';
import { useDialogue } from '../../contexts/DialogueContext';

export interface DreamSimProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

// --- Background Environment ---
const DreamBackground = () => {
    const knotRef = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (knotRef.current) {
            knotRef.current.rotation.x = state.clock.elapsedTime * 0.1;
            knotRef.current.rotation.y = state.clock.elapsedTime * 0.15;
            knotRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 2;
        }
    });

    return (
        <group position={[0, 0, -15]}>
            <TorusKnot ref={knotRef} args={[10, 3, 128, 32]}>
                <meshStandardMaterial
                    color="#1a0b2e"
                    emissive="#aa88ff"
                    emissiveIntensity={0.2}
                    wireframe
                    transparent
                    opacity={0.15}
                />
            </TorusKnot>
        </group>
    );
};

// --- Target Node (Dream Core) ---
const DreamCore = ({ position, color, scale, onClick, id }: any) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const islandRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.elapsedTime * 1.5;
            meshRef.current.rotation.y = state.clock.elapsedTime * 2;
            const pulse = 1 + Math.sin(state.clock.elapsedTime * 4 + position[0]) * 0.1;
            meshRef.current.scale.setScalar(scale * pulse * (hovered ? 1.3 : 1));
        }
        if (islandRef.current) {
            islandRef.current.rotation.y = state.clock.elapsedTime * 0.2;
        }
    });

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={1.5} floatingRange={[-0.5, 0.5]}>
            <group position={position}>
                {/* Floating Island Base */}
                <mesh ref={islandRef} position={[0, -1.5, 0]} rotation={[Math.PI, 0, 0]}>
                    <coneGeometry args={[1.2, 1.5, 6]} />
                    <meshStandardMaterial color="#2d1b4e" roughness={0.9} metalness={0.1} flatShading />
                </mesh>

                {/* Dream Core Orb */}
                <mesh
                    ref={meshRef}
                    position={[0, 0, 0]}
                    onClick={(e) => { e.stopPropagation(); onClick(id); }}
                    onPointerOver={() => { setHovered(true); document.body.style.cursor = 'crosshair'; }}
                    onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
                >
                    <octahedronGeometry args={[0.5, 2]} />
                    <MeshTransmissionMaterial
                        color={color}
                        transparent
                        opacity={0.9}
                        metalness={0.8}
                        roughness={0.1}
                        clearcoat={1}
                        transmission={1}
                        thickness={2}
                    />
                    {hovered && (
                        <pointLight distance={6} intensity={2} color={color} />
                    )}
                </mesh>

                {/* Core Inner Glow */}
                <mesh position={[0, 0, 0]} scale={0.3}>
                    <sphereGeometry args={[1, 16, 16]} />
                    <meshBasicMaterial color={color} />
                </mesh>
            </group>
        </Float>
    );
};

// --- Hazard Node (Nightmare Shard) ---
const NightmareShard = ({ position, onClick, id }: any) => {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.elapsedTime * 4;
            meshRef.current.rotation.z = state.clock.elapsedTime * 5;
            const jitter = Math.random() * 0.1;
            meshRef.current.position.x = position[0] + jitter;
            meshRef.current.position.y = position[1] + jitter;
        }
    });

    return (
        <Float speed={5} rotationIntensity={3} floatIntensity={0.5}>
            <mesh
                ref={meshRef}
                position={position}
                onClick={(e) => { e.stopPropagation(); onClick(id); }}
                onPointerOver={() => { document.body.style.cursor = 'not-allowed'; }}
                onPointerOut={() => { document.body.style.cursor = 'auto'; }}
            >
                <icosahedronGeometry args={[0.6, 0]} />
                <meshStandardMaterial
                    color="#ff0044"
                    emissive="#ff0044"
                    emissiveIntensity={2}
                    wireframe
                    roughness={0.8}
                    metalness={0.2}
                />
                <pointLight distance={5} intensity={1.5} color="#ff0044" />
            </mesh>
        </Float>
    );
};

// --- Types & Helpers ---
interface GameNode { id: string; position: [number, number, number]; type: 'target' | 'hazard'; color: string; spawnedAt: number; lifetime: number; }

const TARGET_COLORS = ['#00ffff', '#ff00ff', '#aa88ff', '#00ffaa'];
const genPos = (): [number, number, number] => [
    (Math.random() - 0.5) * 16,
    (Math.random() - 0.5) * 10,
    (Math.random() - 0.5) * 8 - 2
];

export const DreamSim: React.FC<DreamSimProps> = ({ onComplete, difficulty, t }) => {
    const { queueDialogue } = useDialogue();
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(50);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');
    const [combo, setCombo] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [nodes, setNodes] = useState<GameNode[]>([]);
    const [glitchActive, setGlitchActive] = useState(false);

    const [advisorMsg, setAdvisorMsg] = useState(t('game.advisor.flow_stable'));
    const [adversaryMsg, setAdversaryMsg] = useState(t('game.adversary.cracks_attention'));

    const diffMul = difficulty === 'HARD' ? 1.5 : difficulty === 'MEDIUM' ? 1.2 : 1;
    const spawnInterval = Math.max(500, 1500 - (score / 100) * 100);
    const hazardChance = Math.min(0.35, 0.15 + (score / 2000));

    // Narrative Briefing
    useEffect(() => {
        queueDialogue([
            { id: `dreamsim-brief-${Date.now()}`, character: 'ATHENA', text: "Welcome to the Dreamscape. Collect the iridescent Dream Cores." },
            { id: `dreamsim-brief2-${Date.now()}`, character: 'BYTE', text: "Beware the Nightmare Shards. They will shatter your combo.", isGlitchy: true },
        ]);
    }, [queueDialogue, t]);

    // Node Spawner Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const interval = setInterval(() => {
            setNodes(prev => {
                const now = Date.now();
                const active = prev.filter(n => now - n.spawnedAt < n.lifetime);
                if (active.length >= 7) return active;

                const isHazard = Math.random() < hazardChance;

                return [...active, {
                    id: `${Date.now()}-${Math.random()}`,
                    position: genPos(),
                    type: isHazard ? 'hazard' : 'target',
                    color: TARGET_COLORS[Math.floor(Math.random() * TARGET_COLORS.length)],
                    spawnedAt: now,
                    lifetime: Math.max(1800, 3500 - (score / 200) * 500),
                }];
            });
        }, spawnInterval);
        return () => clearInterval(interval);
    }, [gameState, spawnInterval, hazardChance, score]);

    // Agent Chatter Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const advisorLines = [
            "Dream stability holding.",
            "Core synchronization optimal.",
            "Keep tracing the latent space pathways.",
            `Excellent focus. Chain multiplier: ${combo}x`
        ];
        const adversaryLines = [
            "Your mind is wandering.",
            "Nightmares are manifesting.",
            "You cannot control the subconscious.",
            `That combo is fragile...`
        ];

        const intervalId = setInterval(() => {
            if (Math.random() > 0.5) {
                setAdversaryMsg(adversaryLines[Math.floor(Math.random() * adversaryLines.length)]);
                audio.playSystemMessage?.({ type: 'warning' });
            } else {
                setAdvisorMsg(advisorLines[Math.floor(Math.random() * advisorLines.length)]);
                audio.playSystemMessage?.({ type: 'success' });
            }
        }, 5500);
        return () => clearInterval(intervalId);
    }, [gameState, combo]);

    // Timer Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    const isWin = score >= 500;
                    setGameState(isWin ? 'SUCCESS' : 'FAILED');

                    if (isWin) {
                        audio.playSuccess();
                        queueDialogue([
                            { id: `dreamsim-win-${Date.now()}`, character: 'SYNTAX', text: `Lucid state achieved. Final Score: ${score}. Max Combo: ${maxCombo}x.` }
                        ]);
                    } else {
                        audio.playError();
                        queueDialogue([
                            { id: `dreamsim-fail-${Date.now()}`, character: 'BYTE', text: "Lost in the dreamscape...", isGlitchy: true },
                        ]);
                    }
                    onComplete(isWin ? score : 0, { completionTime: 50 - prev, difficulty, maxCombo });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, score, onComplete, difficulty, maxCombo, queueDialogue]);

    const handleTargetClick = useCallback((id: string) => {
        if (gameState !== 'PLAYING') return;
        setNodes(prev => prev.filter(n => n.id !== id));
        audio.playClick();

        const newCombo = combo + 1;
        setCombo(newCombo);
        setMaxCombo(c => Math.max(c, newCombo));
        setScore(s => s + Math.floor(50 * Math.min(newCombo, 10) * diffMul));
    }, [gameState, combo, diffMul]);

    const handleHazardClick = useCallback((id: string) => {
        if (gameState !== 'PLAYING') return;
        setNodes(prev => prev.filter(n => n.id !== id));
        audio.playError();
        setCombo(0);
        setScore(s => Math.max(0, s - 150));

        setGlitchActive(true);
        setTimeout(() => setGlitchActive(false), 500);
    }, [gameState]);

    return (
        <div className="relative w-full h-[600px] rounded-xl overflow-hidden border border-[#aa88ff]/20 bg-[#050015] shadow-2xl">
            {/* Cinematic Glass HUD */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
                <div className="flex flex-col gap-4">
                    <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-[#aa88ff]/30 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#aa88ff]/10 to-transparent" />
                        <div className="flex items-center gap-2 text-[#aa88ff] mb-1">
                            <Activity className="w-4 h-4" />
                            <span className="text-xs uppercase tracking-widest font-bold">Lucidity Score</span>
                        </div>
                        <div className="text-4xl font-mono font-black text-white tabular-nums drop-shadow-[0_0_10px_#aa88ff]">{score}</div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                    <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-[#00ffff]/30">
                        <div className="flex items-center gap-2 text-[#00ffff] mb-1">
                            <Target className="w-4 h-4" />
                            <span className="text-xs uppercase tracking-widest font-bold">Dream Cycle</span>
                        </div>
                        <div className={`text-4xl font-mono font-black tabular-nums ${timeLeft <= 10 ? 'text-[#ff0044] animate-pulse drop-shadow-[0_0_10px_#ff0044]' : 'text-white drop-shadow-[0_0_10px_#00ffff]'}`}>{timeLeft}s</div>
                    </div>
                </div>
            </div>

            {/* Central Combo Indicator */}
            <AnimatePresence>
                {combo > 2 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute top-8 left-1/2 -translate-x-1/2 z-10 pointer-events-none bg-black/60 backdrop-blur-xl px-6 py-2 rounded-full border border-[#ff00ff]/50 flex items-center gap-3 shadow-[0_0_20px_#ff00ff40]"
                    >
                        <Flame className="w-5 h-5 text-[#ff00ff] animate-pulse" />
                        <span className="text-[#ff00ff] font-black tracking-widest text-lg">{combo}x FLOW</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Narrative Comm Panels */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row gap-4 z-10 pointer-events-none">
                <div className="flex-1 bg-gradient-to-r from-[#aa88ff]/10 to-transparent backdrop-blur-md rounded-xl p-4 border-l-4 border-[#aa88ff]">
                    <div className="text-[10px] text-[#aa88ff] mb-1 uppercase tracking-widest font-bold flex items-center gap-2"><Shield className="w-3 h-3" /> Synthesis Guide</div>
                    <div className="text-sm text-white/90 font-mono leading-relaxed">{advisorMsg}</div>
                </div>
                <div className="flex-1 bg-gradient-to-l from-[#ff0044]/10 to-transparent backdrop-blur-md rounded-xl p-4 border-r-4 border-[#ff0044] text-right">
                    <div className="text-[10px] text-[#ff0044] mb-1 uppercase tracking-widest font-bold flex items-center justify-end gap-2">Nightmare Logic <Zap className="w-3 h-3" /></div>
                    <div className="text-sm text-white/90 font-mono leading-relaxed">{adversaryMsg}</div>
                </div>
            </div>

            {/* Game Over Screen */}
            <AnimatePresence>
                {gameState !== 'PLAYING' && (
                    <motion.div
                        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                        animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
                        className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/80"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-black/60 border border-white/10 p-12 rounded-3xl text-center relative overflow-hidden shadow-2xl max-w-lg w-full"
                        >
                            {/* Decorative Line */}
                            <div className={`absolute top-0 left-0 w-full h-1.5 ${gameState === 'SUCCESS' ? 'bg-[#00ffff]' : 'bg-[#ff0044]'}`} />

                            <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${gameState === 'SUCCESS' ? 'bg-[#00ffff]/10' : 'bg-[#ff0044]/10'}`}>
                                {gameState === 'SUCCESS' ? <Trophy className="w-12 h-12 text-[#00ffff]" /> : <SkullIcon className="w-12 h-12 text-[#ff0044]" />}
                            </div>

                            <div className={`text-4xl font-black uppercase tracking-[0.2em] mb-4 ${gameState === 'SUCCESS' ? 'text-[#00ffff]' : 'text-[#ff0044]'} drop-shadow-[0_0_15px_currentColor]`}>
                                {gameState === 'SUCCESS' ? 'LUCIDITY REACHED' : 'DREAM COLLAPSED'}
                            </div>

                            <div className="mt-8 space-y-4">
                                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                                    <span className="text-white/60 uppercase tracking-widest text-sm">Final Score</span>
                                    <span className="text-3xl text-white font-mono font-bold">{score}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-white/60 uppercase tracking-widest text-sm">Max Flow Chain</span>
                                    <span className="text-2xl text-[#ff00ff] font-mono font-bold">{maxCombo}x</span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3D Dreamscape WebGL Canvas */}
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 2, 16], fov: 60 }} gl={{ antialias: false }}>
                    <color attach="background" args={['#050015']} />
                    <fog attach="fog" args={['#050015', 10, 30]} />
                    <ambientLight intensity={0.4} color="#5533aa" />
                    <pointLight position={[5, 10, 5]} intensity={1.5} color="#00ffff" />
                    <pointLight position={[-5, -10, -5]} intensity={1.0} color="#ff00ff" />

                    <DreamBackground />

                    {nodes.map(node => node.type === 'target' ? (
                        <DreamCore
                            key={node.id}
                            id={node.id}
                            position={node.position}
                            color={node.color}
                            scale={1}
                            onClick={handleTargetClick}
                        />
                    ) : (
                        <NightmareShard
                            key={node.id}
                            id={node.id}
                            position={node.position}
                            onClick={handleHazardClick}
                        />
                    ))}

                    {/* Atmospheric particles */}
                    <Sparkles count={400} scale={25} size={2.5} speed={0.4} opacity={0.4} color="#88aaff" />

                    <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.3} maxPolarAngle={Math.PI / 2 + 0.1} />

                    <EffectComposer disableNormalPass>
                        <Bloom luminanceThreshold={0.15} luminanceSmoothing={0.9} mipmapBlur intensity={1.8} />
                        <ChromaticAberration
                            blendFunction={BlendFunction.NORMAL}
                            offset={new THREE.Vector2(0.004, 0.004)}
                            radialModulation={false}
                            modulationOffset={0}
                        />
                        <Noise opacity={0.04} />
                        <Vignette eskil={false} offset={0.1} darkness={1.0} />
                        {glitchActive && (
                            <Glitch delay={new THREE.Vector2(0, 0)} duration={new THREE.Vector2(0.3, 0.6)} mode={GlitchMode.SPORADIC} active ratio={0.9} />
                        )}
                    </EffectComposer>
                </Canvas>
            </div>
        </div>
    );
};
