import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, MeshDistortMaterial, Float, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch, Vignette, Noise } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Activity, Shield, Zap, AlertTriangle, Flame, Target, Trophy, SkullIcon, Rocket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../../services/audioService';
import { useDialogue } from '../../contexts/DialogueContext';

export interface SpaceMissionProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

// --- Background Scenery: Hyperspace / Starfield ---
const HyperspaceDrive = ({ speed }: { speed: number }) => {
    const groupRef = useRef<THREE.Group>(null);
    useFrame((state, delta) => {
        if (groupRef.current) {
            groupRef.current.position.z += speed * delta * 20;
            if (groupRef.current.position.z > 20) groupRef.current.position.z = -20;
        }
    });

    return (
        <group ref={groupRef}>
            <Stars radius={50} depth={50} count={3000} factor={4} saturation={1} fade speed={1} />
        </group>
    );
};

// --- Target Node: Plasma Cell ---
const PlasmaCell = ({ position, color, scale, onClick, id }: {
    position: [number, number, number]; color: string; scale: number; onClick: (id: string) => void; id: string;
}) => {
    const coreRef = useRef<THREE.Mesh>(null);
    const ringRef1 = useRef<THREE.Mesh>(null);
    const ringRef2 = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (coreRef.current) {
            const pulse = 1 + Math.sin(t * 8 + position[0]) * 0.1;
            coreRef.current.scale.setScalar(scale * pulse * (hovered ? 1.2 : 1));
        }
        if (ringRef1.current && ringRef2.current) {
            ringRef1.current.rotation.x = t * 2;
            ringRef1.current.rotation.y = t * 1.5;
            ringRef2.current.rotation.x = t * -1.5;
            ringRef2.current.rotation.y = t * -2;
            ringRef1.current.scale.setScalar(hovered ? 1.2 : 1);
            ringRef2.current.scale.setScalar(hovered ? 1.2 : 1);
        }
    });

    return (
        <Float speed={2} rotationIntensity={1.5} floatIntensity={1.5} position={position}>
            <group
                onClick={(e) => { e.stopPropagation(); onClick(id); }}
                onPointerOver={() => { setHovered(true); document.body.style.cursor = 'crosshair'; }}
                onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
            >
                <mesh ref={coreRef}>
                    <icosahedronGeometry args={[0.35, 1]} />
                    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hovered ? 4 : 2} metalness={0.5} roughness={0.1} wireframe={hovered} />
                    <pointLight distance={4} intensity={2} color={color} />
                </mesh>
                <mesh ref={ringRef1}>
                    <torusGeometry args={[0.55, 0.02, 16, 32]} />
                    <meshBasicMaterial color={color} transparent opacity={hovered ? 0.8 : 0.4} />
                </mesh>
                <mesh ref={ringRef2}>
                    <torusGeometry args={[0.8, 0.02, 16, 32]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={hovered ? 0.6 : 0.2} />
                </mesh>
            </group>
        </Float>
    );
};

// --- Hazard Node: Corrupted Asteroid ---
const AsteroidHazard = ({ position, onClick, id }: {
    position: [number, number, number]; onClick: (id: string) => void; id: string;
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.elapsedTime * 0.5 + position[0];
            meshRef.current.rotation.y = state.clock.elapsedTime * 0.7 + position[1];
            meshRef.current.scale.setScalar(hovered ? 1.15 : 1);
        }
    });

    return (
        <Float speed={1} rotationIntensity={3} floatIntensity={2} position={position}>
            <mesh
                ref={meshRef}
                onClick={(e) => { e.stopPropagation(); onClick(id); }}
                onPointerOver={() => { setHovered(true); document.body.style.cursor = 'not-allowed'; }}
                onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
            >
                <dodecahedronGeometry args={[0.6, 2]} />
                <MeshDistortMaterial
                    color="#111111"
                    emissive="#ff1133"
                    emissiveIntensity={hovered ? 2.5 : 0.8}
                    roughness={0.9}
                    metalness={0.6}
                    distort={0.4}
                    speed={2}
                />
                <pointLight distance={3} intensity={hovered ? 2 : 1} color="#ff1133" />
            </mesh>
        </Float>
    );
};

// --- Dynamic Space Camera ---
const CameraRig = ({ speed, shake }: { speed: number; shake: number }) => {
    useFrame((state) => {
        const t = state.clock.elapsedTime;
        const trauma = shake > 0 ? (Math.random() - 0.5) * shake * 0.5 : 0;

        // Simulating ship banking
        state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, Math.sin(t * 0.5) * 2 + trauma, 0.05);
        state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, Math.cos(t * 0.4) * 1 + Math.abs(trauma), 0.05);
        state.camera.rotation.z = THREE.MathUtils.lerp(state.camera.rotation.z, Math.sin(t * 0.5) * -0.05, 0.05);

        state.camera.lookAt(0, 0, 0);
    });
    return null;
};

// --- Types ---
interface GameNode { id: string; position: [number, number, number]; type: 'target' | 'hazard'; color: string; spawnedAt: number; lifetime: number; velocity: [number, number, number]; }

const TARGET_COLORS = ['#00ffff', '#ff00ff', '#00ff88', '#ffcc00'];
const genPos = (): [number, number, number] => [(Math.random() - 0.5) * 16, (Math.random() - 0.5) * 10, -15 - Math.random() * 5];
const genVel = (speed: number): [number, number, number] => [0, 0, speed + Math.random() * 2];

// --- Main Component ---
export const SpaceMission: React.FC<SpaceMissionProps> = ({ onComplete, difficulty, t }) => {
    const { queueDialogue } = useDialogue();
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(50);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');
    const [combo, setCombo] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [nodes, setNodes] = useState<GameNode[]>([]);
    const [glitchActive, setGlitchActive] = useState(false);
    const [screenFlash, setScreenFlash] = useState<string | null>(null);
    const [advisorMsg, setAdvisorMsg] = useState(t('game.advisor.target_rate_optimal'));
    const [adversaryMsg, setAdversaryMsg] = useState(t('game.adversary.inevitability'));

    const diffMul = difficulty === 'HARD' ? 1.5 : difficulty === 'MEDIUM' ? 1.2 : 1;
    const baseSpeed = difficulty === 'HARD' ? 6 : difficulty === 'MEDIUM' ? 4 : 2;
    const spawnInterval = Math.max(300, 1000 - (score / 100) * 80);
    const hazardChance = Math.min(0.45, 0.2 + (score / 1500));

    // Narrative: Mission Briefing
    useEffect(() => {
        queueDialogue([
            { id: `spacemission-brief-${Date.now()}`, character: 'SYNTAX', text: t('game.instructions.click_targets') },
            { id: `spacemission-brief2-${Date.now()}`, character: 'ATHENA', text: t('game.instructions.avoid_hazards'), isGlitchy: true },
        ]);
    }, [queueDialogue, t]);

    // Node spawner
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const interval = setInterval(() => {
            setNodes(prev => {
                const now = Date.now();
                // Filter out nodes that have passed behind the camera (z > 5)
                const active = prev.filter(n => n.position[2] < 5 && now - n.spawnedAt < n.lifetime);
                if (active.length >= 10) return active;

                const isHazard = Math.random() < hazardChance;
                return [...active, {
                    id: `${Date.now()}-${Math.random()}`,
                    position: genPos(),
                    type: isHazard ? 'hazard' : 'target',
                    color: TARGET_COLORS[Math.floor(Math.random() * TARGET_COLORS.length)],
                    spawnedAt: now,
                    lifetime: 10000, // Nodes live a long time, but get culled by Z distance
                    velocity: genVel(baseSpeed + (score / 300)),
                }];
            });
        }, spawnInterval);
        return () => clearInterval(interval);
    }, [gameState, spawnInterval, hazardChance, score, baseSpeed]);

    // Node Movement Loop (Simulating flying forward)
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        let animationFrameId: number;
        let lastTime = performance.now();

        const moveNodes = (time: number) => {
            const delta = (time - lastTime) / 1000;
            lastTime = time;

            setNodes(prev => prev.map(node => ({
                ...node,
                position: [node.position[0], node.position[1], node.position[2] + node.velocity[2] * delta]
            })));

            animationFrameId = requestAnimationFrame(moveNodes);
        };
        animationFrameId = requestAnimationFrame(moveNodes);

        return () => cancelAnimationFrame(animationFrameId);
    }, [gameState]);

    // Agent chatter
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const aLines = [t('game.advisor.target_rate_optimal'), t('game.advisor.wave_incoming'), t('game.advisor.flow_stable'), `${t('game.hud.combo_chain')}: ${combo}x`];
        const eLines = [t('game.adversary.inevitability'), t('game.adversary.same_look'), t('game.adversary.wont_survive'), `${combo}x ${t('game.hud.combo')}...`];
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
                    const fs = score >= 450 ? 'SUCCESS' : 'FAILED';
                    setGameState(fs);
                    if (fs === 'SUCCESS') {
                        audio.playSuccess(); queueDialogue([
                            { id: `spacemission-win-${Date.now()}`, character: 'SYNTAX', text: `${t('game.hud.final_score')}: ${score}. ${t('game.hud.max_combo')}: ${maxCombo}x.` },
                            { id: `spacemission-win2-${Date.now()}`, character: 'ATHENA', text: t('game.state.core_secured') },
                        ]);
                    } else {
                        audio.playError(); queueDialogue([
                            { id: `spacemission-fail-${Date.now()}`, character: 'BYTE', text: t('game.state.core_breached'), isGlitchy: true },
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
        setScreenFlash('#00ffff'); setTimeout(() => setScreenFlash(null), 60);
    }, [gameState, combo, diffMul]);

    const handleHazardClick = useCallback((id: string) => {
        if (gameState !== 'PLAYING') return;
        setNodes(prev => prev.filter(n => n.id !== id));
        audio.playError(); setCombo(0); setScore(s => Math.max(0, s - 200));
        setGlitchActive(true); setScreenFlash('#ff1133');
        setTimeout(() => { setGlitchActive(false); setScreenFlash(null); }, 400);
    }, [gameState]);

    return (
        <div className="relative w-full h-[600px] rounded-xl overflow-hidden border border-white/10 bg-[#020005] shadow-2xl">
            {/* Cinematic Screen Flash */}
            <AnimatePresence>{screenFlash && (<motion.div initial={{ opacity: 0.5 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="absolute inset-0 z-30 pointer-events-none" style={{ backgroundColor: screenFlash, mixBlendMode: 'overlay' }} />)}</AnimatePresence>

            {/* Astronaut / Pilot HUD */}
            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 pointer-events-none">
                <div className="flex flex-col gap-3">
                    <div className="bg-[#020005]/80 backdrop-blur-md rounded-xl p-3 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                        <div className="flex items-center gap-2 text-cyan-400 mb-1"><Activity className="w-4 h-4" /><span className="text-xs uppercase tracking-[0.2em] font-bold">{t('game.hud.score')}</span></div>
                        <div className="text-4xl font-mono font-black text-white tabular-nums">{score}</div>
                    </div>
                    <AnimatePresence>{combo > 1 && (<motion.div initial={{ scale: 0, x: -50 }} animate={{ scale: 1, x: 0 }} exit={{ scale: 0 }} className="bg-[#020005]/80 backdrop-blur-md rounded-xl p-3 border border-orange-500/50">
                        <div className="flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500 animate-pulse" /><span className="text-orange-400 font-black text-2xl italic">{combo}x</span></div>
                        <div className="text-[10px] text-orange-300/60 uppercase tracking-[0.2em] mt-1">{t('game.hud.combo_chain')}</div>
                    </motion.div>)}</AnimatePresence>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <div className="bg-[#020005]/80 backdrop-blur-md rounded-xl p-3 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                        <div className="flex items-center justify-end gap-2 text-purple-400 mb-1"><span className="text-xs uppercase tracking-[0.2em] font-bold">{t('game.hud.time')}</span><AlertTriangle className="w-4 h-4" /></div>
                        <div className={`text-4xl font-mono font-black tabular-nums text-right ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timeLeft}s</div>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.2em] border ${difficulty === 'HARD' ? 'border-red-500 text-red-400 bg-red-500/10' : difficulty === 'MEDIUM' ? 'border-amber-500 text-amber-400 bg-amber-500/10' : 'border-cyan-500 text-cyan-400 bg-cyan-500/10'}`}>
                        {t(`game.difficulty.${difficulty.toLowerCase()}`)}
                    </div>
                </div>
            </div>

            {/* Tactical Briefing Overlay */}
            {timeLeft > 45 && gameState === 'PLAYING' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute bottom-1/4 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center">
                    <div className="bg-[#020005]/90 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                        <div className="text-cyan-400 font-black text-lg uppercase tracking-widest mb-3 flex items-center justify-center gap-2"><Target className="w-5 h-5" /> {t('game.instructions.click_targets')}</div>
                        <div className="text-red-400 font-bold text-sm tracking-wide flex items-center justify-center gap-2"><SkullIcon className="w-4 h-4" /> {t('game.instructions.avoid_hazards')}</div>
                    </div>
                </motion.div>
            )}

            {/* Comm-Link Panels */}
            <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row gap-2 sm:gap-4 z-10 pointer-events-none">
                <div className="flex-1 bg-[#020005]/80 backdrop-blur-xl rounded-xl p-3 sm:p-4 border-t-2 border-indigo-500 shadow-lg">
                    <div className="text-[10px] text-indigo-400 mb-2 uppercase tracking-[0.2em] font-bold flex items-center gap-2"><Rocket className="w-3 h-3" /> {t('game.advisor.label')} // CMD</div>
                    <div className="text-sm text-indigo-100 font-mono leading-relaxed">{advisorMsg}</div>
                </div>
                <div className="flex-1 bg-[#020005]/80 backdrop-blur-xl rounded-xl p-3 sm:p-4 border-t-2 border-red-500 shadow-lg text-right">
                    <div className="text-[10px] text-red-500 mb-2 uppercase tracking-[0.2em] font-bold flex items-center justify-end gap-2"><Zap className="w-3 h-3" /> {t('game.adversary.label')} // THREAT</div>
                    <div className="text-sm text-red-100 font-mono leading-relaxed">{adversaryMsg}</div>
                </div>
            </div>

            {/* End Game Status Modal */}
            <AnimatePresence>{gameState !== 'PLAYING' && (
                <motion.div initial={{ opacity: 0, backdropFilter: "blur(0px)" }} animate={{ opacity: 1, backdropFilter: "blur(10px)" }} className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-[#020005]/80">
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="text-center p-8 sm:p-12 w-full max-w-lg rounded-3xl border border-white/10 bg-[#110022]/60 shadow-[0_0_50px_rgba(0,0,0,1)]">
                        <div className={`w-24 h-24 mx-auto mb-8 rounded-2xl flex items-center justify-center rotate-3 ${gameState === 'SUCCESS' ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.3)]' : 'bg-red-500/20 border border-red-500/50 text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.3)]'}`}>
                            {gameState === 'SUCCESS' ? <Trophy className="w-12 h-12" /> : <SkullIcon className="w-12 h-12" />}
                        </div>
                        <div className={`text-3xl sm:text-4xl font-black uppercase tracking-[0.2em] mb-6 ${gameState === 'SUCCESS' ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400' : 'text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500'}`}>
                            {gameState === 'SUCCESS' ? t('game.state.core_secured') : t('game.state.core_breached')}
                        </div>
                        <div className="bg-black/50 rounded-xl p-6 mb-4 border border-white/5">
                            <div className="text-sm text-gray-400 uppercase tracking-widest mb-1">{t('game.hud.final_score')}</div>
                            <div className="text-5xl font-mono text-white tracking-tighter">{score}</div>
                        </div>
                        <div className="inline-flex items-center gap-2 text-sm text-orange-400 font-bold bg-orange-500/10 px-4 py-2 rounded-full border border-orange-500/20">
                            <Flame className="w-4 h-4" /> {t('game.hud.max_combo')}: {maxCombo}x
                        </div>
                    </motion.div>
                </motion.div>
            )}</AnimatePresence>

            {/* Deep Space 3D Canvas */}
            <div className="absolute inset-0 z-0 cursor-crosshair">
                <Canvas camera={{ position: [0, 0, 10], fov: 60 }} gl={{ antialias: false, powerPreference: "high-performance" }}>
                    <color attach="background" args={['#020005']} />
                    <fog attach="fog" args={['#020005', 5, 30]} />
                    <ambientLight intensity={0.4} />
                    <directionalLight position={[10, 20, 10]} intensity={2} color="#ffffff" />

                    <HyperspaceDrive speed={combo > 5 ? 2 : 1} />
                    <CameraRig speed={baseSpeed} shake={glitchActive ? 2 : 0} />

                    {nodes.map(node => node.type === 'target' ? (
                        <PlasmaCell key={node.id} id={node.id} position={node.position} color={node.color} scale={1} onClick={handleTargetClick} />
                    ) : (
                        <AsteroidHazard key={node.id} id={node.id} position={node.position} onClick={handleHazardClick} />
                    ))}

                    <EffectComposer disableNormalPass>
                        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} intensity={2.0 + combo * 0.15} mipmapBlur />
                        <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.003 + combo * 0.001, 0.003)} />
                        {glitchActive && (<Glitch delay={new THREE.Vector2(0, 0)} duration={new THREE.Vector2(0.2, 0.5)} mode={GlitchMode.SPORADIC} active ratio={0.8} />)}
                        <Noise opacity={0.03} />
                        <Vignette eskil={false} offset={0.15} darkness={1.2} />
                    </EffectComposer>
                </Canvas>
            </div>
        </div>
    );
};
