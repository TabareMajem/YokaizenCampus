/// <reference types="@react-three/fiber" />
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Float, Icosahedron, Line, MeshTransmissionMaterial, ContactShadows, Environment, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette, DepthOfField, Glitch } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import { Cpu, Zap, Activity, CheckCircle, RotateCcw, AlertTriangle, Shield, Atom, Terminal, SkullIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { Difficulty, Language, UserStats } from '../../types';
import { audio } from '../../services/audioService';
import { useDialogue } from '../../contexts/DialogueContext';

export interface QuantumQubitProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: Difficulty;
    t: (key: string) => string;
}

// --------------------------------------------------------
// AAA 3D Components
// --------------------------------------------------------

const QubitNode = ({ position, color, isActive, onClick, scale = 1, id }: any) => {
    const groupRef = useRef<THREE.Group>(null);
    const coreRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (groupRef.current && coreRef.current) {
            groupRef.current.rotation.x = t * (isActive ? 1.5 : 0.5);
            groupRef.current.rotation.y = t * (isActive ? 1.2 : 0.3);
            coreRef.current.rotation.z = -t * 2;

            const pulse = isActive ? (1 + Math.sin(t * 8) * 0.1) : 1;
            const targetScale = scale * pulse * (hovered ? 1.2 : 1);
            groupRef.current.scale.lerp(new THREE.Vector3().setScalar(targetScale), 0.15);
        }
    });

    return (
        <Float speed={isActive ? 4 : 2} rotationIntensity={isActive ? 2 : 0.5} floatIntensity={1}>
            <group ref={groupRef} position={position}
                onClick={(e) => { e.stopPropagation(); onClick(id, position); }}
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
                onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'default'; }}>

                {/* Glassy Shell */}
                <mesh>
                    <icosahedronGeometry args={[1, 4]} />
                    <MeshTransmissionMaterial backside samples={4} thickness={0.5} chromaticAberration={isActive ? 1.5 : 0.5} anisotropy={0.3} distortion={isActive ? 0.8 : 0.2} distortionScale={0.5} temporalDistortion={0.5} color={color} emissive={color} emissiveIntensity={isActive ? 0.8 : 0.1} clearcoat={1} clearcoatRoughness={0.1} />
                </mesh>

                {/* Inner Bright Core */}
                <mesh ref={coreRef}>
                    <icosahedronGeometry args={[0.4, 0]} />
                    <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={isActive ? 8 : 2} wireframe={!isActive} />
                </mesh>

                <pointLight distance={10} intensity={isActive ? (hovered ? 8 : 5) : 2} color={color} />
            </group>
        </Float>
    );
};

const ConnectionEdge = ({ start, end, active }: any) => {
    const points = useMemo(() => [new THREE.Vector3(...start), new THREE.Vector3(...end)], [start, end]);
    return (
        <Line
            points={points}
            color={active ? "#a855f7" : "#00ffff"}
            lineWidth={active ? 3 : 1}
            transparent
            opacity={active ? 0.8 : 0.3}
        />
    );
};

const BackgroundQuantumCore = () => {
    const groupRef = useRef<THREE.Group>(null);
    useFrame(({ clock }) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = clock.getElapsedTime() * 0.05;
            groupRef.current.rotation.z = clock.getElapsedTime() * 0.02;
            const s = 1 + Math.sin(clock.getElapsedTime()) * 0.05;
            groupRef.current.scale.setScalar(s);
        }
    });

    return (
        <group ref={groupRef}>
            <mesh>
                <sphereGeometry args={[25, 64, 64]} />
                <meshBasicMaterial color="#00ffff" wireframe transparent opacity={0.03} />
            </mesh>
            <mesh>
                <icosahedronGeometry args={[18, 1]} />
                <meshBasicMaterial color="#a855f7" wireframe transparent opacity={0.05} />
            </mesh>
        </group>
    );
};

// --- Effects ---
const FloatingScore = ({ position, text, color, onComplete }: any) => {
    const ref = useRef<THREE.Group>(null);
    const [life, setLife] = useState(0);
    useFrame((_, d) => {
        if (!ref.current) return;
        setLife(l => l + d * 2);
        ref.current.position.y += d * 3;
        ref.current.scale.setScalar(Math.max(0, 1 - life * 0.5));
        if (life > 2) onComplete();
    });
    return (
        <group ref={ref} position={position}>
            <Text color={color} fontSize={1} font="https://fonts.gstatic.com/s/syncopate/v13/pe0sMIuPIYBCpEV5eFdCBfe_m_s.woff" anchorX="center" anchorY="middle" outlineWidth={0.05} outlineColor="#000000">{text}</Text>
        </group>
    );
};

const ImpactRing = ({ position, color, onComplete }: any) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.MeshBasicMaterial>(null);
    const [life, setLife] = useState(0);
    useFrame((_, d) => {
        if (!meshRef.current || !matRef.current) return;
        setLife(l => l + d * 4);
        meshRef.current.scale.setScalar(1 + life * 5);
        meshRef.current.lookAt(0, 0, 15);
        matRef.current.opacity = Math.max(0, 1 - life);
        if (life > 1) onComplete();
    });
    return (
        <mesh ref={meshRef} position={position}>
            <ringGeometry args={[1, 1.2, 32]} />
            <meshBasicMaterial ref={matRef} color={color} transparent opacity={1} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
    );
};

// --------------------------------------------------------
// Main Game Component
// --------------------------------------------------------
export const QuantumQubit: React.FC<QuantumQubitProps> = ({ onComplete, difficulty, t }) => {
    const { queueDialogue } = useDialogue();
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(difficulty === 'Elite' ? 45 : 90);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');

    // UI Effects
    const [effects, setEffects] = useState<any[]>([]);
    const [screenFlash, setScreenFlash] = useState<string | null>(null);

    // Agents
    const [advisorMsg, setAdvisorMsg] = useState(t('game.advisor.analyzing'));
    const [adversaryMsg, setAdversaryMsg] = useState(t('game.adversary.system_vulnerable'));
    const [glitchActive, setGlitchActive] = useState(false);

    // Qubit States
    const numQubits = difficulty === 'Elite' ? 6 : difficulty === 'Pro' ? 5 : 4;

    const initialNodes = useMemo(() => {
        return Array.from({ length: numQubits }).map((_, i) => {
            const angle = (i / numQubits) * Math.PI * 2;
            return {
                id: i,
                position: [Math.sin(angle) * 7 + (Math.random() - 0.5), Math.cos(angle) * 7 + (Math.random() - 0.5), (Math.random() - 0.5) * 4] as [number, number, number],
                state: Math.random() > 0.5 ? 1 : 0, // 0 = blue, 1 = purple
                color: Math.random() > 0.5 ? '#00ffff' : '#a855f7' // Cyan vs Amethyst
            };
        });
    }, [numQubits]);

    const [nodes, setNodes] = useState(initialNodes);

    const edges = useMemo(() => {
        const e = [];
        for (let i = 0; i < numQubits; i++) {
            e.push({ source: i, target: (i + 1) % numQubits });
            e.push({ source: i, target: (i + 2) % numQubits });
        }
        return e;
    }, [numQubits]);

    useEffect(() => {
        // Initial setup to ensure not all are 1
        setNodes(curr => {
            if (curr.every(n => n.state === 1)) {
                const n2 = [...curr]; n2[0].state = 0; n2[0].color = '#00ffff'; return n2;
            }
            return curr;
        });
    }, []);

    // Narrative Briefing
    useEffect(() => {
        queueDialogue([
            { id: `qq-brief-${Date.now()}`, character: 'ATHENA', text: t('game.instructions.quantum_brief') || 'Align all qubits to superposition state (Amethyst) to achieve entanglement.' },
            { id: `qq-brief2-${Date.now()}`, character: 'SYNTAX', text: t('game.instructions.quantum_warn') || 'Decoherence imminent. Move fast.', isGlitchy: true },
        ]);
    }, [queueDialogue, t]);

    // Agent lines
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const aLines = ['Matrix stabilizing.', 'Coherence increasing.', 'Keep aligning the nodes.', 'Energy holding.'];
        const eLines = ['Decoherence creeping in.', 'Quantum noise rising.', 'You are too slow.', 'Entanglement is futile.'];
        const iv = setInterval(() => {
            if (Math.random() > 0.6) { setAdversaryMsg(eLines[Math.floor(Math.random() * eLines.length)]); audio.playSystemMessage?.({ type: 'warning' }); }
            else { setAdvisorMsg(aLines[Math.floor(Math.random() * aLines.length)]); audio.playSystemMessage?.({ type: 'success' }); text: t('game.state.system_secured') }
        }, 5000);
        return () => clearInterval(iv);
    }, [gameState, t]);

    // Timer
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setGameState('FAILED');
                    audio.playError();
                    queueDialogue([{ id: `qq-fail-${Date.now()}`, character: 'BYTE', text: 'Decoherence. System Collapsed.', isGlitchy: true }]);
                    onComplete(score, { completionTime: (difficulty === 'Elite' ? 45 : 90), difficulty });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, score, difficulty, onComplete, queueDialogue]);

    // Node Interaction
    const handleNodeClick = useCallback((id: number, pos: [number, number, number]) => {
        if (gameState !== 'PLAYING') return;
        audio.playClick();

        let toggledTo = 0;
        setNodes(prev => prev.map(node => {
            if (node.id === id) {
                toggledTo = node.state === 1 ? 0 : 1;
                return { ...node, state: toggledTo, color: toggledTo === 1 ? '#a855f7' : '#00ffff' };
            }
            return node;
        }));

        setScreenFlash(toggledTo === 1 ? 'rgba(168, 85, 247, 0.15)' : 'rgba(0, 255, 255, 0.1)');
        setTimeout(() => setScreenFlash(null), 80);

        const pts = toggledTo === 1 ? 50 : 10;
        setScore(s => s + pts);

        const effId = `${Date.now()}`;
        setEffects(prev => [...prev,
        { id: `sc-${effId}`, type: 'score', position: [pos[0], pos[1] + 1.5, pos[2]], text: toggledTo === 1 ? 'COHERENCE UP' : 'SHIFT', color: toggledTo === 1 ? '#a855f7' : '#00ffff' },
        { id: `rg-${effId}`, type: 'ring', position: pos, color: toggledTo === 1 ? '#a855f7' : '#00ffff' }
        ]);

        // Entanglement Win Check
        setTimeout(() => {
            setNodes(currentNodes => {
                const allEntangled = currentNodes.every(n => n.state === 1);
                if (allEntangled && gameState === 'PLAYING') {
                    setGameState('SUCCESS');
                    audio.playSuccess();
                    const winScore = score + pts + (timeLeft * 10) + (difficulty === 'Elite' ? 1000 : 500);
                    setScore(winScore);
                    queueDialogue([{ id: `qq-win-${Date.now()}`, character: 'ATHENA', text: 'Quantum Coherence Achieved. Matrix Locked.' }]);
                    onComplete(winScore, { completionTime: (difficulty === 'Elite' ? 45 : 90) - timeLeft, difficulty });
                }
                return currentNodes;
            });
        }, 150);
    }, [gameState, score, difficulty, timeLeft, onComplete, queueDialogue]);

    const removeEffect = useCallback((id: string) => setEffects(p => p.filter(e => e.id !== id)), []);

    return (
        <div className="relative w-full h-[700px] rounded-[32px] overflow-hidden border border-[#a855f7]/20 bg-[#020617] shadow-[0_0_60px_rgba(168,85,247,0.15)] font-sans">
            <AnimatePresence>
                {screenFlash && (<motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="absolute inset-0 z-30 pointer-events-none mix-blend-screen" style={{ backgroundColor: screenFlash }} />)}
            </AnimatePresence>

            {/* AAA Glassmorphic HUD */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
                <div className="flex flex-col gap-4 filter drop-shadow-xl">
                    <div className="bg-[#0f172a]/70 backdrop-blur-2xl rounded-2xl p-4 border border-[#a855f7]/30 shadow-[0_10px_30px_rgba(168,85,247,0.2)]">
                        <div className="flex items-center gap-2 text-[#a855f7] mb-1">
                            <Activity className="w-5 h-5 animate-pulse" />
                            <span className="text-xs uppercase tracking-[0.2em] font-black text-[#d8b4fe]">Quantum Yield</span>
                        </div>
                        <motion.div key={score} initial={{ y: -5, opacity: 0.5 }} animate={{ y: 0, opacity: 1 }} className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#a855f7] tabular-nums uppercase tracking-tighter" style={{ textShadow: '0 0 20px rgba(168,85,247,0.4)' }}>
                            {score.toLocaleString()}
                        </motion.div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-4 filter drop-shadow-xl">
                    <div className="bg-[#0f172a]/70 backdrop-blur-2xl rounded-2xl p-4 border border-[#00ffff]/30 shadow-[0_10px_30px_rgba(0,255,255,0.15)] min-w-[140px] text-right">
                        <div className="flex items-center justify-end gap-2 text-[#00ffff] mb-1">
                            <span className="text-xs uppercase tracking-[0.2em] font-black">{t('game.hud.time')}</span>
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className={`text-4xl font-black tabular-nums tracking-tighter ${timeLeft <= 10 ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-[#ff00aa] animate-pulse' : 'text-transparent bg-clip-text bg-gradient-to-r from-white to-[#00ffff]'}`} style={{ textShadow: timeLeft <= 10 ? '0 0 20px rgba(255,0,0,0.6)' : '0 0 20px rgba(0,255,255,0.4)' }}>
                            {timeLeft}s
                        </div>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border backdrop-blur-md ${difficulty === 'Elite' ? 'border-[#ff0055]/50 text-[#ff0055] bg-[#ff0055]/10 shadow-[0_0_15px_rgba(255,0,85,0.4)]' : 'border-[#a855f7]/50 text-[#a855f7] bg-[#a855f7]/10 shadow-[0_0_15px_rgba(168,85,247,0.4)]'}`}>
                        {difficulty}
                    </div>
                </div>
            </div>

            {/* Cinematic Instructions */}
            <AnimatePresence>
                {timeLeft > (difficulty === 'Elite' ? 40 : 85) && gameState === 'PLAYING' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }} transition={{ duration: 0.8 }} className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                        <div className="bg-[#0f172a]/90 backdrop-blur-3xl p-8 rounded-[32px] border border-[#a855f7]/40 shadow-[0_30px_80px_rgba(168,85,247,0.3)] text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-[#a855f7]/10 to-transparent opacity-50"></div>
                            <div className="text-[#a855f7] font-black text-2xl uppercase tracking-widest mb-3 drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]">
                                <Atom className="inline w-8 h-8 mr-3 -mt-1 animate-spin-slow" /> Achieve Entanglement
                            </div>
                            <div className="text-[#00ffff] font-bold text-sm uppercase tracking-wider drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
                                Align all qubits to superposition (Amethyst)
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Agent Comms Panel */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row gap-4 z-10 pointer-events-none">
                <div className="flex-1 bg-[#0f172a]/80 backdrop-blur-2xl rounded-2xl p-4 border border-[#a855f7]/20 border-l-4 border-l-[#00ffff] shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#00ffff]/10 rounded-full blur-[30px] -translate-y-1/2 translate-x-1/2"></div>
                    <div className="text-[10px] text-[#00ffff] mb-2 uppercase tracking-[0.2em] font-black flex items-center gap-2"><Shield className="w-4 h-4" /> {t('game.advisor.label')}</div>
                    <div className="text-sm text-[#ccffff]/90 font-mono leading-relaxed relative z-10">{advisorMsg}</div>
                </div>
                <div className="flex-1 bg-[#0f172a]/80 backdrop-blur-2xl rounded-2xl p-4 border border-[#a855f7]/20 border-l-4 border-l-[#ff0055] shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff0055]/10 rounded-full blur-[30px] -translate-y-1/2 translate-x-1/2"></div>
                    <div className="text-[10px] text-[#ff0055] mb-2 uppercase tracking-[0.2em] font-black flex items-center gap-2"><Zap className="w-4 h-4" /> {t('game.adversary.label')}</div>
                    <div className="text-sm text-[#ffcccc]/90 font-mono leading-relaxed relative z-10">{adversaryMsg}</div>
                </div>
            </div>

            {/* Game Over Cinematic Screen */}
            <AnimatePresence>
                {gameState !== 'PLAYING' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-40 flex items-center justify-center bg-[#020617]/95 backdrop-blur-xl">
                        <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", damping: 20 }} className="text-center p-10 w-full max-w-lg rounded-[40px] border border-[#a855f7]/30 bg-gradient-to-b from-[#0f172a]/90 to-black shadow-[0_50px_100px_rgba(168,85,247,0.2)] relative overflow-hidden pointer-events-auto">

                            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 blur-[80px] opacity-30 ${gameState === 'SUCCESS' ? 'bg-[#a855f7]' : 'bg-[#ff0055]'}`}></div>

                            <div className={`w-28 h-28 mx-auto mb-8 rounded-full flex items-center justify-center relative z-10 ${gameState === 'SUCCESS' ? 'bg-[#a855f7]/20 border-2 border-[#a855f7] shadow-[0_0_40px_rgba(168,85,247,0.5)]' : 'bg-[#ff0055]/20 border-2 border-[#ff0055] shadow-[0_0_40px_rgba(255,0,85,0.4)]'}`}>
                                {gameState === 'SUCCESS' ? <CheckCircle className="w-14 h-14 text-[#a855f7] drop-shadow-md" /> : <RotateCcw className="w-14 h-14 text-[#ff0055] drop-shadow-md" />}
                            </div>

                            <h2 className={`text-4xl sm:text-5xl font-black uppercase tracking-tighter mb-4 relative z-10 ${gameState === 'SUCCESS' ? 'text-transparent bg-clip-text bg-gradient-to-b from-white to-[#a855f7]' : 'text-transparent bg-clip-text bg-gradient-to-b from-white to-[#ff0055]'}`} style={{ textShadow: gameState === 'SUCCESS' ? '0 10px 30px rgba(168,85,247,0.4)' : '0 10px 30px rgba(255,0,85,0.4)' }}>
                                {gameState === 'SUCCESS' ? 'COHERENCE ACHIEVED' : 'SYSTEM COLLAPSED'}
                            </h2>

                            <div className="bg-black/60 rounded-2xl p-6 border border-[#a855f7]/20 mb-8 relative z-10">
                                <div className="text-sm text-[#00ffff] uppercase tracking-widest font-bold mb-1">Total Yield</div>
                                <div className="text-5xl text-white font-mono font-black tabular-nums">{score.toLocaleString()}</div>
                                <div className="mt-4 pt-4 border-t border-white/10 text-xs text-gray-400">
                                    {gameState === 'SUCCESS' ? 'Quantum Matrix Stabilized.' : 'Decoherence threshold exceeded.'}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium 3D Canvas */}
            <div className={`absolute inset-0 z-0 ${gameState !== 'PLAYING' ? 'pointer-events-none' : ''}`}>
                <Canvas camera={{ position: [0, 0, 18], fov: 60 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}>
                    <color attach="background" args={['#020617']} />
                    <fog attach="fog" args={['#020617', 10, 40]} />

                    <Environment preset="night" />
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[10, 20, 10]} intensity={3} color="#a855f7" />
                    <directionalLight position={[-10, 10, -10]} intensity={2} color="#00ffff" />

                    <BackgroundQuantumCore />

                    <group>
                        {edges.map((edge, i) => {
                            const s = nodes.find(n => n.id === edge.source);
                            const t = nodes.find(n => n.id === edge.target);
                            if (!s || !t) return null;
                            const isActive = s.state === 1 && t.state === 1;
                            return <ConnectionEdge key={i} start={s.position} end={t.position} active={isActive} />;
                        })}
                        {nodes.map(node => (
                            <QubitNode key={node.id} id={node.id} position={node.position} color={node.color} isActive={node.state === 1} onClick={handleNodeClick} scale={node.state === 1 ? 1.4 : 1} />
                        ))}
                    </group>

                    <Sparkles count={400} scale={[30, 30, 30]} size={6} speed={0.4} opacity={0.5} color="#00ffff" noise={1} />
                    <Sparkles count={200} scale={[25, 25, 25]} size={8} speed={0.6} opacity={0.6} color="#a855f7" noise={1} />

                    {effects.map(eff => eff.type === 'score' ? (
                        <FloatingScore key={eff.id} position={eff.position} text={eff.text} color={eff.color} onComplete={() => removeEffect(eff.id)} />
                    ) : (
                        <ImpactRing key={eff.id} position={eff.position} color={eff.color} onComplete={() => removeEffect(eff.id)} />
                    ))}

                    <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.8} />

                    <EffectComposer enableNormalPass={false}>
                        <Bloom luminanceThreshold={0.3} mipmapBlur intensity={1.5} />
                        <DepthOfField focusDistance={0.05} focalLength={0.05} bokehScale={3} height={480} />
                        <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.003, 0.003)} />
                        <Noise opacity={0.06} />
                        <Vignette eskil={false} offset={0.1} darkness={1.2} />
                        {glitchActive && (<Glitch delay={new THREE.Vector2(0, 0)} duration={new THREE.Vector2(0.2, 0.5)} mode={GlitchMode.SPORADIC} active ratio={0.5} />)}
                    </EffectComposer>
                </Canvas>
            </div>
        </div>
    );
};

export default QuantumQubit;
