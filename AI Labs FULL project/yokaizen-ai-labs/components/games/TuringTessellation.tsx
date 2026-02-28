/// <reference types="@react-three/fiber" />
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Float, Box, Sparkles, Edges, Cylinder, Octahedron } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Noise, Glitch, Vignette, DepthOfField } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import { Shapes, Hexagon, Activity, CheckCircle, RotateCcw, AlertTriangle, Shield, Zap, SkullIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { Difficulty, Language, UserStats } from '../../types';
import { audio } from '../../services/audioService';
import { useDialogue } from '../../contexts/DialogueContext';

export interface TuringTessellationProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: Difficulty;
    t: (key: string) => string;
}

// --------------------------------------------------------
// AAA 3D Components
// --------------------------------------------------------

const LogicNode = ({ position, currentFaceIndex, colors, targetColorIndex, onClick, id, isWinning }: any) => {
    const groupRef = useRef<THREE.Group>(null);
    const outerRef = useRef<THREE.Mesh>(null);
    const innerRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    // Smooth rotation interpolation target
    const targetYRot = currentFaceIndex * (Math.PI / 2); // Assuming 4 abstract alignments for standard difficulty mapping
    const [visualYRot, setVisualYRot] = useState(targetYRot);

    useFrame((state, delta) => {
        // Lerp rotation smoothly
        setVisualYRot(v => THREE.MathUtils.lerp(v, targetYRot, delta * 10));

        const t = state.clock.elapsedTime;
        if (groupRef.current) {
            const hoverPulse = hovered ? 1.1 : 1.0;
            const winPulse = isWinning ? 1 + Math.sin(t * 8) * 0.1 : 1;
            groupRef.current.scale.lerp(new THREE.Vector3().setScalar(hoverPulse * winPulse), 0.15);

            groupRef.current.position.y = position[1] + Math.sin(t * 2 + position[0]) * 0.1;
        }

        if (outerRef.current) {
            outerRef.current.rotation.y = visualYRot;
            outerRef.current.rotation.x = Math.sin(t * 0.5 + position[0]) * 0.1;
            outerRef.current.rotation.z = Math.cos(t * 0.5 + position[1]) * 0.1;
        }

        if (innerRef.current) {
            innerRef.current.rotation.y = -visualYRot * 2 + t;
            innerRef.current.rotation.x = t * 0.5;
        }
    });

    const isAligned = currentFaceIndex === 0; // Simplification matching the game logic
    const activeColor = colors[currentFaceIndex % colors.length];

    // If it's aligned, give it the target color's energetic glow
    const displayColor = isAligned ? colors[targetColorIndex] : activeColor;
    const emissiveInt = isAligned ? 4 : (hovered ? 2 : 0.5);

    return (
        <group
            ref={groupRef}
            position={position}
            onClick={(e) => { e.stopPropagation(); onClick(id, position); }}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
            onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'default'; }}
        >
            <mesh ref={outerRef}>
                <cylinderGeometry args={[1.5, 1.5, 0.5, 6]} />
                <meshPhysicalMaterial
                    color={displayColor} transmission={0.9} ior={1.5} thickness={0.5}
                    roughness={0.1} metalness={0.5} clearcoat={1}
                    emissive={displayColor} emissiveIntensity={emissiveInt * 0.2}
                    transparent opacity={0.6} wireframe={!isAligned && hovered}
                />
            </mesh>

            <mesh ref={innerRef}>
                <octahedronGeometry args={[0.8, 0]} />
                <meshStandardMaterial
                    color={displayColor}
                    emissive={displayColor} emissiveIntensity={emissiveInt}
                    roughness={0.2} metalness={0.8}
                />
                <Edges threshold={15} color="#ffffff" />
            </mesh>

            <pointLight distance={4} intensity={emissiveInt} color={displayColor} />

            {/* Energy link to center if aligned */}
            {isAligned && (
                <mesh rotation-x={Math.PI / 2} position-z={-1}>
                    <cylinderGeometry args={[0.05, 0.05, 2, 8]} />
                    <meshBasicMaterial color={displayColor} transparent opacity={0.5} blending={THREE.AdditiveBlending} />
                </mesh>
            )}
        </group>
    );
};

const RotationPulse = ({ position, color, onComplete }: any) => {
    const groupRef = useRef<THREE.Group>(null);
    const [life, setLife] = useState(0);

    useFrame((_, d) => {
        if (!groupRef.current) return;
        setLife(l => l + d * 3);
        groupRef.current.scale.setScalar(1 + life * 2);
        (groupRef.current.children[0] as THREE.Mesh).material.opacity = Math.max(0, 1 - life);
        if (life > 1) onComplete();
    });

    return (
        <group ref={groupRef} position={position}>
            <mesh rotation-x={Math.PI / 2}>
                <torusGeometry args={[1.6, 0.05, 16, 32]} />
                <meshBasicMaterial color={color} transparent opacity={1} blending={THREE.AdditiveBlending} />
            </mesh>
        </group>
    );
};

// --------------------------------------------------------
// Main Game Component
// --------------------------------------------------------
export const TuringTessellation: React.FC<TuringTessellationProps> = ({ onComplete, difficulty, t }) => {
    const { queueDialogue } = useDialogue();
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(difficulty === 'Elite' ? 60 : 120);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');

    const size = difficulty === 'Elite' ? 3 : 2;
    const colors = ['#00ffaa', '#ff00aa', '#00aaff', '#ffaa00', '#aaff00', '#aa00ff'];
    const targetColorIndex = 0; // The goal is to get everything to the 0th abstract state

    // UI Effects
    const [effects, setEffects] = useState<any[]>([]);
    const [screenFlash, setScreenFlash] = useState<string | null>(null);
    const [glitchActive, setGlitchActive] = useState(false);

    // Agents
    const [advisorMsg, setAdvisorMsg] = useState(t('game.advisor.analyzing') || 'Analyzing quantum array coherence.');
    const [adversaryMsg, setAdversaryMsg] = useState(t('game.adversary.system_vulnerable') || 'Array dissonance maximizing.');

    const initialNodes = useMemo(() => {
        const nodes = [];
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                // Random starting state that is NOT 0
                let startFace = Math.floor(Math.random() * 3) + 1;

                nodes.push({
                    id: `${i}-${j}`,
                    position: [(j - (size - 1) / 2) * 3.5, (i - (size - 1) / 2) * 3.5, 0] as [number, number, number],
                    upFace: startFace,
                });
            }
        }
        return nodes;
    }, [difficulty, size]);

    const [nodes, setNodes] = useState(initialNodes);

    const alignedNodesCount = nodes.filter(n => n.upFace === 0).length;
    const totalNodes = size * size;

    // Narrative Briefing
    useEffect(() => {
        queueDialogue([
            { id: `tt-brief-${Date.now()}`, character: 'ATHENA', text: t('game.instructions.tt_brief') || 'Synchronize the quantum array. Rotate all nodes until they reach the resonant cyan state.' },
        ]);
    }, [queueDialogue, t]);

    // Agent lines
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const iv = setInterval(() => {
            if (alignedNodesCount > totalNodes / 2) {
                setAdvisorMsg('Resonance building. Coherence threshold approaching.');
            } else {
                setAdversaryMsg('Symmetry is a myth. Embrace the dissonance.');
            }
        }, 5000);
        return () => clearInterval(iv);
    }, [gameState, alignedNodesCount, totalNodes]);

    // Timer & Instafail Check
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setGameState('FAILED');
                    audio.playError();
                    setGlitchActive(true);
                    queueDialogue([{ id: `tt-fail-time-${Date.now()}`, character: 'BYTE', text: 'Time window closed. The array collapsed into chaos.', isGlitchy: true }]);
                    onComplete(score, { completionTime: (difficulty === 'Elite' ? 60 : 120), difficulty });
                    return 0;
                }
                if (prev === 20 && alignedNodesCount < totalNodes) {
                    audio.playSystemMessage?.({ type: 'warning' });
                    setAdversaryMsg('Array destabilizing. 20 seconds to critical failure.');
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, score, difficulty, onComplete, queueDialogue, alignedNodesCount, totalNodes]);

    const handleNodeClick = useCallback((id: string, pos: [number, number, number]) => {
        if (gameState !== 'PLAYING') return;

        audio.playClick();

        let localNodes = [...nodes];

        setNodes(current => {
            const next = current.map(n => {
                if (n.id === id) {
                    return { ...n, upFace: (n.upFace + 1) % 4 };
                }
                return n;
            });
            localNodes = next;
            return next;
        });

        // Add visual pulse effect
        const effId = `${Date.now()}`;
        setEffects(prev => [...prev, { id: `rp-${effId}`, type: 'pulse', position: pos, color: '#ffffff' }]);

        // Check win
        const allAligned = localNodes.every(n => n.upFace === 0);
        if (allAligned) {
            setGameState('SUCCESS');
            audio.playSuccess();
            setScreenFlash('rgba(0,255,170,0.3)');
            const winScore = score + (timeLeft * 25) + (difficulty === 'Elite' ? 1500 : 800);
            setScore(winScore);
            queueDialogue([{ id: `tt-win-${Date.now()}`, character: 'ATHENA', text: 'Array synchronized. Absolute coherence achieved.' }]);
            setTimeout(() => onComplete(winScore, { completionTime: (difficulty === 'Elite' ? 60 : 120) - timeLeft, difficulty }), 1500);
        }

    }, [gameState, nodes, score, timeLeft, difficulty, onComplete, queueDialogue]);

    const removeEffect = useCallback((id: string) => setEffects(p => p.filter(e => e.id !== id)), []);

    return (
        <div className="relative w-full h-[700px] rounded-[32px] overflow-hidden border border-[#00ffaa]/20 bg-[#000a10] shadow-[0_0_80px_rgba(0,255,170,0.1)] font-sans">
            <AnimatePresence>
                {screenFlash && (<motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="absolute inset-0 z-30 pointer-events-none mix-blend-screen" style={{ backgroundColor: screenFlash }} />)}
            </AnimatePresence>

            {/* AAA Glassmorphic HUD */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
                <div className="flex flex-col gap-4 filter drop-shadow-xl w-72 pointer-events-auto">
                    <div className="bg-[#011520]/70 backdrop-blur-2xl rounded-2xl p-4 border border-[#00ffaa]/30 shadow-[0_10px_30px_rgba(0,255,170,0.15)] relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#00ffaa]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center gap-2 text-[#00ffaa] mb-2">
                            <Hexagon className="w-5 h-5 animate-[spin_10s_linear_infinite]" />
                            <span className="text-xs uppercase tracking-[0.2em] font-black text-[#aaffdd]">Array Coherence</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-white/10 rounded-full mb-3 overflow-hidden">
                            <div className="h-full bg-[#00ffaa] transition-all duration-500 ease-out shadow-[0_0_10px_#00ffaa]" style={{ width: `${(alignedNodesCount / totalNodes) * 100}%` }} />
                        </div>

                        <div className="flex items-baseline gap-2">
                            <motion.div key={alignedNodesCount} initial={{ y: -5, opacity: 0.5 }} animate={{ y: 0, opacity: 1 }} className={`text-4xl font-black tabular-nums tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-white to-[#00ffaa]`} style={{ textShadow: '0 0 20px rgba(0,255,170,0.4)' }}>
                                {((alignedNodesCount / totalNodes) * 100).toFixed(0)}%
                            </motion.div>
                            <span className="text-sm font-bold text-[#00ffaa]/60 uppercase tracking-widest">ALIGNED</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-4 filter drop-shadow-xl">
                    <div className="bg-[#011520]/70 backdrop-blur-2xl rounded-2xl p-4 border border-[#00aaff]/30 shadow-[0_10px_30px_rgba(0,170,255,0.15)] min-w-[140px] text-right">
                        <div className="flex items-center justify-end gap-2 text-[#00aaff] mb-1">
                            <span className="text-xs uppercase tracking-[0.2em] font-black">{t('game.hud.time') || 'STABILITY WINDOW'}</span>
                            <Activity className="w-4 h-4" />
                        </div>
                        <div className={`text-4xl font-black tabular-nums tracking-tighter ${timeLeft <= 15 ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-300 animate-pulse' : 'text-transparent bg-clip-text bg-gradient-to-r from-white to-[#00aaff]'}`} style={{ textShadow: timeLeft <= 15 ? '0 0 20px rgba(255,0,0,0.6)' : '0 0 20px rgba(0,170,255,0.4)' }}>
                            {timeLeft}s
                        </div>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border backdrop-blur-md ${difficulty === 'Elite' ? 'border-[#ff0055]/50 text-[#ff0055] bg-[#ff0055]/10 shadow-[0_0_15px_rgba(255,0,85,0.4)]' : 'border-[#00ffaa]/50 text-[#00ffaa] bg-[#00ffaa]/10 shadow-[0_0_15px_rgba(0,255,170,0.4)]'}`}>
                        {difficulty}
                    </div>
                </div>
            </div>

            {/* Cinematic Instructions */}
            <AnimatePresence>
                {timeLeft > (difficulty === 'Elite' ? 55 : 115) && gameState === 'PLAYING' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }} transition={{ duration: 0.8 }} className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                        <div className="bg-[#011520]/90 backdrop-blur-3xl p-8 rounded-[32px] border border-[#00ffaa]/40 shadow-[0_30px_80px_rgba(0,255,170,0.3)] text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-[#00ffaa]/10 to-transparent opacity-50"></div>
                            <div className="text-[#00ffaa] font-black text-2xl uppercase tracking-widest mb-3 drop-shadow-[0_0_15px_rgba(0,255,170,0.8)]">
                                <RotateCcw className="inline w-8 h-8 mr-3 -mt-1 animate-spin-slow" /> Align Array
                            </div>
                            <div className="text-[#aaffdd] font-bold text-sm uppercase tracking-wider drop-shadow-[0_0_10px_rgba(170,255,221,0.5)]">
                                Click nodes to resonate. Achieve 100% coherence.
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Agent Comms Panel */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row gap-4 z-10 pointer-events-none">
                <div className="flex-1 bg-[#011520]/80 backdrop-blur-2xl rounded-2xl p-4 border border-[#00ffaa]/20 border-l-4 border-l-[#00ffaa] shadow-xl relative overflow-hidden">
                    <div className="text-[10px] text-[#00ffaa] mb-2 uppercase tracking-[0.2em] font-black flex items-center gap-2"><Shield className="w-4 h-4" /> {t('game.advisor.label') || 'ADVISOR'}</div>
                    <div className="text-sm text-[#ccffdd]/90 font-mono leading-relaxed relative z-10">{advisorMsg}</div>
                </div>
                <div className="flex-1 bg-[#011520]/80 backdrop-blur-2xl rounded-2xl p-4 border border-[#ffaa00]/20 border-l-4 border-l-[#ffaa00] shadow-xl relative overflow-hidden">
                    <div className="text-[10px] text-[#ffaa00] mb-2 uppercase tracking-[0.2em] font-black flex items-center gap-2"><Zap className="w-4 h-4" /> {t('game.adversary.label') || 'ADVERSARY'}</div>
                    <div className="text-sm text-[#ffeecc]/90 font-mono leading-relaxed relative z-10">{adversaryMsg}</div>
                </div>
            </div>

            {/* Game Over Cinematic Screen */}
            <AnimatePresence>
                {gameState !== 'PLAYING' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-40 flex items-center justify-center bg-[#000a10]/95 backdrop-blur-2xl">
                        <motion.div initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", damping: 20 }} className="text-center p-12 w-full max-w-xl rounded-[40px] border border-[#00ffaa]/30 bg-gradient-to-b from-[#011520]/90 to-black shadow-[0_50px_100px_rgba(0,255,170,0.2)] relative overflow-hidden pointer-events-auto">

                            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 blur-[100px] opacity-40 ${gameState === 'SUCCESS' ? 'bg-[#00ffaa]' : 'bg-[#ff0055]'}`}></div>

                            <div className={`w-32 h-32 mx-auto mb-8 rounded-full flex items-center justify-center relative z-10 ${gameState === 'SUCCESS' ? 'bg-[#00ffaa]/20 border-2 border-[#00ffaa] shadow-[0_0_50px_rgba(0,255,170,0.5)]' : 'bg-[#ff0055]/20 border-2 border-[#ff0055] shadow-[0_0_50px_rgba(255,0,85,0.4)]'}`}>
                                {gameState === 'SUCCESS' ? <CheckCircle className="w-16 h-16 text-[#00ffaa] drop-shadow-md" /> : <SkullIcon className="w-16 h-16 text-[#ff0055] drop-shadow-md" />}
                            </div>

                            <h2 className={`text-4xl sm:text-5xl font-black uppercase tracking-tighter mb-4 relative z-10 ${gameState === 'SUCCESS' ? 'text-transparent bg-clip-text bg-gradient-to-b from-white to-[#00ffaa]' : 'text-transparent bg-clip-text bg-gradient-to-b from-white to-[#ff0055]'}`} style={{ textShadow: gameState === 'SUCCESS' ? '0 10px 30px rgba(0,255,170,0.4)' : '0 10px 30px rgba(255,0,85,0.4)' }}>
                                {gameState === 'SUCCESS' ? 'ARRAY COHERENT' : 'COHERENCE LOST'}
                            </h2>

                            <div className="bg-black/60 rounded-3xl p-8 border border-[#00ffaa]/20 mb-8 relative z-10 backdrop-blur-md">
                                <div className="text-sm text-[#00ffaa] uppercase tracking-widest font-bold mb-2">Synchronization Score</div>
                                <div className="text-6xl text-white font-mono font-black tabular-nums">{score.toLocaleString()}</div>
                                <div className="mt-4 pt-4 border-t border-white/10 text-sm text-gray-400 font-mono">
                                    {gameState === 'SUCCESS' ? 'All quantum nodes successfully linked.' : 'Array dissonance exceeded critical threshold.'}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium 3D Canvas */}
            <div className={`absolute inset-0 z-0 ${gameState !== 'PLAYING' ? 'pointer-events-none' : ''}`}>
                <Canvas camera={{ position: [0, 0, 15], fov: 55 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}>
                    <color attach="background" args={['#000a10']} />
                    <fog attach="fog" args={['#000a10', 10, 40]} />

                    <ambientLight intensity={0.4} />
                    <pointLight position={[10, 10, 10]} intensity={2} color="#00ffaa" />
                    <pointLight position={[-10, -10, -10]} intensity={1} color="#00aaff" />

                    <group rotation={[Math.PI / 6, Math.PI / 12, 0]}>
                        {nodes.map(b => (
                            <LogicNode
                                key={b.id}
                                id={b.id}
                                position={b.position}
                                currentFaceIndex={b.upFace}
                                colors={colors}
                                targetColorIndex={targetColorIndex}
                                onClick={handleNodeClick}
                                isWinning={gameState === 'SUCCESS'}
                            />
                        ))}
                    </group>

                    {effects.map(eff => eff.type === 'pulse' && (
                        <RotationPulse key={eff.id} position={eff.position} color={eff.color} onComplete={() => removeEffect(eff.id)} />
                    ))}

                    <Sparkles count={400} scale={[25, 25, 25]} size={3} speed={0.4} opacity={0.4} color="#00ffaa" noise={1} />
                    {glitchActive && <Sparkles count={200} scale={[25, 25, 25]} size={8} speed={2} opacity={0.8} color="#ff0055" noise={3} />}

                    <OrbitControls enableZoom={true} enablePan={true} maxDistance={25} minDistance={10} autoRotate={true} autoRotateSpeed={gameState === 'PLAYING' ? 0.5 : 2.0} />

                    <EffectComposer enableNormalPass={false}>
                        <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} />
                        <DepthOfField focusDistance={0.06} focalLength={0.05} bokehScale={3} height={480} />
                        <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.002, 0.002)} />
                        {(gameState === 'FAILED' || glitchActive || timeLeft <= 15) && <Noise opacity={0.15} />}
                        <Vignette eskil={false} offset={0.1} darkness={1.3} />
                        {(gameState === 'FAILED' || glitchActive) && (<Glitch delay={new THREE.Vector2(0, 0.5)} duration={new THREE.Vector2(0.3, 0.8)} mode={GlitchMode.SPORADIC} active ratio={0.8} />)}
                    </EffectComposer>
                </Canvas>
            </div>
        </div>
    );
};

export default TuringTessellation;
