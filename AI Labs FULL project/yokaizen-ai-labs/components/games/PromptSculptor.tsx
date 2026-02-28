/// <reference types="@react-three/fiber" />
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Float, Box, Sparkles, Edges } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Noise, Glitch, Vignette, DepthOfField } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import { Scissors, FileText, Activity, CheckCircle, RotateCcw, AlertTriangle, Shield, Zap, SkullIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { Difficulty, Language, UserStats } from '../../types';
import { audio } from '../../services/audioService';
import { useDialogue } from '../../contexts/DialogueContext';

export interface PromptSculptorProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: Difficulty;
    t: (key: string) => string;
}

// --------------------------------------------------------
// AAA 3D Components
// --------------------------------------------------------

const DataBlock = ({ position, active, isEssential, onClick, id }: any) => {
    const groupRef = useRef<THREE.Group>(null);
    const boxRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    // Animate scale out if not active, scale in if active
    const [scaleAnim, setScaleAnim] = useState(active ? 1 : 0);

    useFrame((state, delta) => {
        if (active && scaleAnim < 1) setScaleAnim(s => Math.min(1, s + delta * 5));
        if (!active && scaleAnim > 0) setScaleAnim(s => Math.max(0, s - delta * 5));

        const t = state.clock.elapsedTime;
        if (groupRef.current && scaleAnim > 0) {
            const hoverPulse = hovered ? 1.05 : 1.0;
            const essentialPulse = isEssential ? 1 + Math.sin(t * 5 + position[0]) * 0.05 : 1;
            groupRef.current.scale.setScalar(scaleAnim * hoverPulse * essentialPulse);

            if (boxRef.current) {
                boxRef.current.rotation.x = Math.sin(t * 0.5 + position[1]) * 0.05;
                boxRef.current.rotation.y = Math.cos(t * 0.5 + position[0]) * 0.05;
            }
        }
    });

    if (scaleAnim === 0 && !active) return null;

    const color = isEssential ? '#ccaaff' : '#00ffff';
    const emissiveInt = isEssential ? 2 : 0.2;

    return (
        <group
            ref={groupRef}
            position={position}
            onClick={(e) => { e.stopPropagation(); onClick(id, position, isEssential); }}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'crosshair'; }}
            onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'default'; }}
        >
            <mesh ref={boxRef}>
                <boxGeometry args={[1.8, 1.8, 1.8]} />
                <meshPhysicalMaterial
                    color={color} transmission={isEssential ? 0.4 : 0.9} ior={1.5} thickness={0.5}
                    roughness={0.1} metalness={0.2} clearcoat={1} clearcoatRoughness={0.1}
                    emissive={color} emissiveIntensity={emissiveInt + (hovered ? 1 : 0)}
                    transparent opacity={isEssential ? 0.9 : 0.4}
                />
                <Edges scale={1} threshold={15} color={hovered ? '#ffffff' : color} />

                {/* Core for essential blocks */}
                {isEssential && (
                    <mesh scale={0.4}>
                        <boxGeometry args={[1, 1, 1]} />
                        <meshBasicMaterial color="#ffffff" wireframe />
                    </mesh>
                )}
            </mesh>

            {isEssential && <pointLight distance={4} intensity={2} color={color} />}
        </group>
    );
};

const ShatterEffect = ({ position, color, onComplete }: any) => {
    const groupRef = useRef<THREE.Group>(null);
    const [life, setLife] = useState(0);
    const particles = useMemo(() => Array.from({ length: 8 }).map(() => ({
        dir: new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2).normalize(),
        speed: 2 + Math.random() * 4,
        rot: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] as [number, number, number],
        rotSpeed: [Math.random() * 10, Math.random() * 10, Math.random() * 10] as [number, number, number]
    })), []);

    useFrame((_, d) => {
        if (!groupRef.current) return;
        setLife(l => l + d * 3);
        groupRef.current.children.forEach((child, i) => {
            const p = particles[i];
            child.position.addScaledVector(p.dir, p.speed * d);
            child.rotation.x += p.rotSpeed[0] * d;
            child.rotation.y += p.rotSpeed[1] * d;
            child.scale.setScalar(Math.max(0, 1 - life * 0.8));
        });
        if (life > 1.2) onComplete();
    });

    return (
        <group ref={groupRef} position={position}>
            {particles.map((p, i) => (
                <mesh key={i} rotation={p.rot}>
                    <boxGeometry args={[0.5, 0.5, 0.5]} />
                    <meshBasicMaterial color={color} transparent opacity={0.8} />
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
        ref.current.position.y += d * 3;
        ref.current.scale.setScalar(Math.max(0, 1 - life * 0.5));
        if (life > 2) onComplete();
    });
    return (
        <group ref={ref} position={position}>
            <Text color={color} fontSize={0.6} font="https://fonts.gstatic.com/s/syncopate/v13/pe0sMIuPIYBCpEV5eFdCBfe_m_s.woff" anchorX="center" anchorY="middle" outlineWidth={0.05} outlineColor="#000000">{text}</Text>
        </group>
    );
};

// --------------------------------------------------------
// Main Game Component
// --------------------------------------------------------
export const PromptSculptor: React.FC<PromptSculptorProps> = ({ onComplete, difficulty, t }) => {
    const { queueDialogue } = useDialogue();
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(difficulty === 'Elite' ? 60 : 120);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');

    const size = difficulty === 'Elite' ? 4 : 3;
    const contextLimit = difficulty === 'Elite' ? 12 : 9;

    // UI Effects
    const [effects, setEffects] = useState<any[]>([]);
    const [screenFlash, setScreenFlash] = useState<string | null>(null);
    const [glitchActive, setGlitchActive] = useState(false);

    // Agents
    const [advisorMsg, setAdvisorMsg] = useState(t('game.advisor.analyzing') || 'Evaluating context window density.');
    const [adversaryMsg, setAdversaryMsg] = useState(t('game.adversary.system_vulnerable') || 'Context limits breached. Optimization required.');

    const initialChunks = useMemo(() => {
        const chunks = [];
        let essentialCount = 0;
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                for (let z = 0; z < size; z++) {
                    const isEssential = Math.random() > 0.7 && essentialCount < contextLimit - 2;
                    if (isEssential) essentialCount++;
                    chunks.push({
                        id: `${x}-${y}-${z}`,
                        position: [(x - size / 2 + 0.5) * 2.2, (y - size / 2 + 0.5) * 2.2, (z - size / 2 + 0.5) * 2.2] as [number, number, number],
                        active: true,
                        isEssential
                    });
                }
            }
        }
        return chunks;
    }, [difficulty, size, contextLimit]);

    const [chunks, setChunks] = useState(initialChunks);

    const activeTokens = chunks.filter(c => c.active).length;
    const lostEssentialTokens = chunks.filter(c => !c.active && c.isEssential).length;

    // Narrative Briefing
    useEffect(() => {
        queueDialogue([
            { id: `ps-brief-${Date.now()}`, character: 'ATHENA', text: t('game.instructions.sculptor_brief') || `Chisel away the cyan padding tokens. Keep the purple essential context. Reduce tokens below ${contextLimit}.` },
            { id: `ps-brief2-${Date.now()}`, character: 'SYNTAX', text: t('game.instructions.sculptor_warn') || 'Do NOT delete essential purple logic blocks or the prompt will collapse.', isGlitchy: true },
        ]);
    }, [queueDialogue, t, contextLimit]);

    // Agent lines
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const aLines = ['Semantic density improving.', 'Noise removed. Signal clear.', 'Context window optimizing.', 'Prompt refinement steady.'];
        const eLines = ['You are losing meaning...', 'Context window overloaded.', 'Redundant data detected.', 'Careful. You will break the logic.'];
        const iv = setInterval(() => {
            if (Math.random() > 0.6) { setAdversaryMsg(eLines[Math.floor(Math.random() * eLines.length)]); audio.playSystemMessage?.({ type: 'warning' }); }
            else { setAdvisorMsg(aLines[Math.floor(Math.random() * aLines.length)]); audio.playSystemMessage?.({ type: 'success' }); }
        }, 6000);
        return () => clearInterval(iv);
    }, [gameState]);

    // Timer & Instafail Check
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        if (lostEssentialTokens > 0) {
            setGameState('FAILED');
            audio.playError();
            setScreenFlash('rgba(255,0,85,0.5)');
            setGlitchActive(true);
            queueDialogue([{ id: `ps-fail-essential-${Date.now()}`, character: 'SYNTAX', text: 'Critical syntax deleted! The logic collapsed.', isGlitchy: true }]);
            onComplete(score, { completionTime: (difficulty === 'Elite' ? 60 : 120) - timeLeft, difficulty });
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    if (activeTokens <= contextLimit && lostEssentialTokens === 0) {
                        setGameState('SUCCESS');
                        audio.playSuccess();
                        const winScore = score + 1000 + ((contextLimit - activeTokens) * 150);
                        setScore(winScore);
                        queueDialogue([{ id: `ps-win-time-${Date.now()}`, character: 'ATHENA', text: 'Prompt optimized successfully.' }]);
                        onComplete(winScore, { completionTime: (difficulty === 'Elite' ? 60 : 120), difficulty });
                    } else {
                        setGameState('FAILED');
                        audio.playError();
                        setGlitchActive(true);
                        queueDialogue([{ id: `ps-fail-time-${Date.now()}`, character: 'BYTE', text: 'Timeout. Prompt exceeded context window.', isGlitchy: true }]);
                        onComplete(score, { completionTime: (difficulty === 'Elite' ? 60 : 120), difficulty });
                    }
                    return 0;
                }
                if (prev === 20 && activeTokens > contextLimit) {
                    audio.playSystemMessage?.({ type: 'warning' });
                    setAdversaryMsg('Time running out. Delete padding tokens faster.');
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, score, difficulty, onComplete, queueDialogue, activeTokens, contextLimit, lostEssentialTokens, timeLeft]);

    const handleSculpt = useCallback((id: string, pos: [number, number, number], isEssential: boolean) => {
        if (gameState !== 'PLAYING') return;

        audio.playClick();

        setChunks(current => current.map(c => c.id === id ? { ...c, active: false } : c));

        const effId = `${Date.now()}`;
        if (!isEssential) {
            setScore(s => s + 20);
            setEffects(prev => [...prev,
            { id: `sh-${effId}`, type: 'shatter', position: pos, color: '#00ffff' },
            { id: `sc-${effId}`, type: 'score', position: [pos[0], pos[1] + 1, pos[2]], text: '-1 TOKEN', color: '#00ffff' }
            ]);
        } else {
            // Essential deleted handled in useEffect
            setEffects(prev => [...prev,
            { id: `sh-${effId}`, type: 'shatter', position: pos, color: '#ccaaff' }
            ]);
        }

    }, [gameState]);

    const submitPrompt = () => {
        if (activeTokens <= contextLimit && lostEssentialTokens === 0) {
            setGameState('SUCCESS');
            audio.playSuccess();
            setScreenFlash('rgba(0,255,170,0.3)');
            const winScore = score + (timeLeft * 15) + (difficulty === 'Elite' ? 1200 : 600) + ((contextLimit - activeTokens) * 100);
            setScore(winScore);
            queueDialogue([{ id: `ps-win-${Date.now()}`, character: 'ATHENA', text: 'Prompt context optimized. Execution sequence primed.' }]);
            setTimeout(() => onComplete(winScore, { completionTime: (difficulty === 'Elite' ? 60 : 120) - timeLeft, difficulty }), 1500);
        } else {
            setGameState('FAILED');
            audio.playError();
            setScreenFlash('rgba(255,0,85,0.4)');
            setGlitchActive(true);
            queueDialogue([{ id: `ps-fail-submit-${Date.now()}`, character: 'SYNTAX', text: 'Optimization failed. Context window breached.', isGlitchy: true }]);
            setTimeout(() => onComplete(score, { completionTime: (difficulty === 'Elite' ? 60 : 120) - timeLeft, difficulty }), 1500);
        }
    };

    const removeEffect = useCallback((id: string) => setEffects(p => p.filter(e => e.id !== id)), []);

    return (
        <div className="relative w-full h-[700px] rounded-[32px] overflow-hidden border border-[#00ffff]/20 bg-[#000510] shadow-[0_0_80px_rgba(0,255,255,0.1)] font-sans">
            <AnimatePresence>
                {screenFlash && (<motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="absolute inset-0 z-30 pointer-events-none mix-blend-screen" style={{ backgroundColor: screenFlash }} />)}
            </AnimatePresence>

            {/* AAA Glassmorphic HUD */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
                <div className="flex flex-col gap-4 filter drop-shadow-xl w-72 pointer-events-auto">
                    <div className="bg-[#020a1a]/70 backdrop-blur-2xl rounded-2xl p-4 border border-[#00ffff]/30 shadow-[0_10px_30px_rgba(0,255,255,0.15)] relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#00ffff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center gap-2 text-[#00ffff] mb-2">
                            <FileText className="w-5 h-5 animate-pulse" />
                            <span className="text-xs uppercase tracking-[0.2em] font-black text-[#aaffff]">Context Window</span>
                        </div>

                        <div className="flex items-baseline gap-2">
                            <motion.div key={activeTokens} initial={{ y: -5, opacity: 0.5 }} animate={{ y: 0, opacity: 1 }} className={`text-5xl font-black tabular-nums tracking-tighter uppercase ${activeTokens > contextLimit ? 'text-transparent bg-clip-text bg-gradient-to-r from-[#ff0055] to-[#ffaa00]' : 'text-transparent bg-clip-text bg-gradient-to-r from-white to-[#00ffff]'}`} style={{ textShadow: activeTokens > contextLimit ? '0 0 20px rgba(255,0,85,0.4)' : '0 0 20px rgba(0,255,255,0.4)' }}>
                                {activeTokens}
                            </motion.div>
                            <span className="text-sm font-bold text-[#00ffff]/60 uppercase tracking-widest">/ {contextLimit} MAX</span>
                        </div>

                        {gameState === 'PLAYING' && (
                            <button onClick={submitPrompt} className={`mt-4 w-full py-2.5 rounded-lg font-black uppercase tracking-[0.2em] text-[10px] transition-all border ${activeTokens <= contextLimit ? 'bg-[#00ffaa]/20 border-[#00ffaa]/50 text-[#00ffaa] hover:bg-[#00ffaa]/30 shadow-[0_0_15px_rgba(0,255,170,0.3)]' : 'bg-[#ff0055]/20 border-[#ff0055]/50 text-[#ff0055] hover:bg-[#ff0055]/30 shadow-[0_0_15px_rgba(255,0,85,0.3)]'}`}>
                                Execute Compilation
                            </button>
                        )}
                        <div className="text-[10px] text-[#00ffff]/60 uppercase tracking-widest font-bold mt-2 text-right w-full">Current Score: {score}</div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-4 filter drop-shadow-xl">
                    <div className="bg-[#020a1a]/70 backdrop-blur-2xl rounded-2xl p-4 border border-[#ccaaff]/30 shadow-[0_10px_30px_rgba(204,170,255,0.15)] min-w-[140px] text-right">
                        <div className="flex items-center justify-end gap-2 text-[#ccaaff] mb-1">
                            <span className="text-xs uppercase tracking-[0.2em] font-black">{t('game.hud.time') || 'COMPILATION TIME'}</span>
                            <Activity className="w-4 h-4" />
                        </div>
                        <div className={`text-4xl font-black tabular-nums tracking-tighter ${timeLeft <= 15 ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-300 animate-pulse' : 'text-transparent bg-clip-text bg-gradient-to-r from-white to-[#ccaaff]'}`} style={{ textShadow: timeLeft <= 15 ? '0 0 20px rgba(255,0,0,0.6)' : '0 0 20px rgba(204,170,255,0.4)' }}>
                            {timeLeft}s
                        </div>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border backdrop-blur-md ${difficulty === 'Elite' ? 'border-[#ff0055]/50 text-[#ff0055] bg-[#ff0055]/10 shadow-[0_0_15px_rgba(255,0,85,0.4)]' : 'border-[#00ffff]/50 text-[#00ffff] bg-[#00ffff]/10 shadow-[0_0_15px_rgba(0,255,255,0.4)]'}`}>
                        {difficulty}
                    </div>
                </div>
            </div>

            {/* Cinematic Instructions */}
            <AnimatePresence>
                {timeLeft > (difficulty === 'Elite' ? 55 : 115) && gameState === 'PLAYING' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }} transition={{ duration: 0.8 }} className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                        <div className="bg-[#020a1a]/90 backdrop-blur-3xl p-8 rounded-[32px] border border-[#00ffff]/40 shadow-[0_30px_80px_rgba(0,255,255,0.3)] text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-[#00ffff]/10 to-transparent opacity-50"></div>
                            <div className="text-[#00ffff] font-black text-2xl uppercase tracking-widest mb-3 drop-shadow-[0_0_15px_rgba(0,255,255,0.8)]">
                                <Scissors className="inline w-8 h-8 mr-3 -mt-1" /> Sculpt Context
                            </div>
                            <div className="text-[#ccaaff] font-bold text-sm uppercase tracking-wider drop-shadow-[0_0_10px_rgba(204,170,255,0.5)]">
                                Delete Cyan Noise. Protect Purple Core Logic.
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Agent Comms Panel */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row gap-4 z-10 pointer-events-none">
                <div className="flex-1 bg-[#020a1a]/80 backdrop-blur-2xl rounded-2xl p-4 border border-[#00ffff]/20 border-l-4 border-l-[#00ffff] shadow-xl relative overflow-hidden">
                    <div className="text-[10px] text-[#00ffff] mb-2 uppercase tracking-[0.2em] font-black flex items-center gap-2"><Shield className="w-4 h-4" /> {t('game.advisor.label') || 'ADVISOR'}</div>
                    <div className="text-sm text-[#ccffff]/90 font-mono leading-relaxed relative z-10">{advisorMsg}</div>
                </div>
                <div className="flex-1 bg-[#020a1a]/80 backdrop-blur-2xl rounded-2xl p-4 border border-[#ff0055]/20 border-l-4 border-l-[#ff0055] shadow-xl relative overflow-hidden">
                    <div className="text-[10px] text-[#ff0055] mb-2 uppercase tracking-[0.2em] font-black flex items-center gap-2"><Zap className="w-4 h-4" /> {t('game.adversary.label') || 'ADVERSARY'}</div>
                    <div className="text-sm text-[#ffcccc]/90 font-mono leading-relaxed relative z-10">{adversaryMsg}</div>
                </div>
            </div>

            {/* Game Over Cinematic Screen */}
            <AnimatePresence>
                {gameState !== 'PLAYING' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-40 flex items-center justify-center bg-[#000510]/95 backdrop-blur-2xl">
                        <motion.div initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", damping: 20 }} className="text-center p-12 w-full max-w-xl rounded-[40px] border border-[#00ffff]/30 bg-gradient-to-b from-[#020a1a]/90 to-black shadow-[0_50px_100px_rgba(0,255,255,0.2)] relative overflow-hidden pointer-events-auto">

                            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 blur-[100px] opacity-40 ${gameState === 'SUCCESS' ? 'bg-[#00ffaa]' : 'bg-[#ff0055]'}`}></div>

                            <div className={`w-32 h-32 mx-auto mb-8 rounded-full flex items-center justify-center relative z-10 ${gameState === 'SUCCESS' ? 'bg-[#00ffaa]/20 border-2 border-[#00ffaa] shadow-[0_0_50px_rgba(0,255,170,0.5)]' : 'bg-[#ff0055]/20 border-2 border-[#ff0055] shadow-[0_0_50px_rgba(255,0,85,0.4)]'}`}>
                                {gameState === 'SUCCESS' ? <CheckCircle className="w-16 h-16 text-[#00ffaa] drop-shadow-md" /> : <SkullIcon className="w-16 h-16 text-[#ff0055] drop-shadow-md" />}
                            </div>

                            <h2 className={`text-4xl sm:text-5xl font-black uppercase tracking-tighter mb-4 relative z-10 ${gameState === 'SUCCESS' ? 'text-transparent bg-clip-text bg-gradient-to-b from-white to-[#00ffaa]' : 'text-transparent bg-clip-text bg-gradient-to-b from-white to-[#ff0055]'}`} style={{ textShadow: gameState === 'SUCCESS' ? '0 10px 30px rgba(0,255,170,0.4)' : '0 10px 30px rgba(255,0,85,0.4)' }}>
                                {gameState === 'SUCCESS' ? 'LOGIC OPTIMIZED' : 'CONTEXT BREACHED'}
                            </h2>

                            <div className="bg-black/60 rounded-3xl p-8 border border-[#00ffff]/20 mb-8 relative z-10 backdrop-blur-md">
                                <div className="text-sm text-[#00ffff] uppercase tracking-widest font-bold mb-2">Architect Rating</div>
                                <div className="text-6xl text-white font-mono font-black tabular-nums">{score.toLocaleString()}</div>
                                <div className="mt-4 pt-4 border-t border-white/10 text-sm text-gray-400 font-mono">
                                    {gameState === 'SUCCESS' ? 'Prompt successfully injected into matrix.' : lostEssentialTokens > 0 ? 'Critical Syntax missing. Matrix collapsed.' : 'Token limit exceeded. OOM Exception.'}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium 3D Canvas */}
            <div className={`absolute inset-0 z-0 ${gameState !== 'PLAYING' ? 'pointer-events-none' : ''}`}>
                <Canvas camera={{ position: [15, 15, 20], fov: 50 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}>
                    <color attach="background" args={['#000510']} />
                    <fog attach="fog" args={['#000510', 15, 50]} />

                    <ambientLight intensity={0.4} />
                    <pointLight position={[20, 20, 20]} intensity={2} color="#00ffff" />
                    <pointLight position={[-20, -20, -20]} intensity={1.5} color="#ccaaff" />

                    <Float floatIntensity={0.5} speed={1} rotationIntensity={0.5}>
                        <group>
                            {chunks.map(c => (
                                <DataBlock key={c.id} id={c.id} position={c.position} active={c.active} isEssential={c.isEssential} onClick={handleSculpt} />
                            ))}
                        </group>
                    </Float>

                    {effects.map(eff => eff.type === 'score' ? (
                        <FloatingScore key={eff.id} position={eff.position} text={eff.text} color={eff.color} onComplete={() => removeEffect(eff.id)} />
                    ) : (
                        <ShatterEffect key={eff.id} position={eff.position} color={eff.color} onComplete={() => removeEffect(eff.id)} />
                    ))}

                    <Sparkles count={500} scale={[30, 30, 30]} size={4} speed={0.4} opacity={0.3} color="#00ffff" noise={2} />
                    {glitchActive && <Sparkles count={200} scale={[25, 25, 25]} size={8} speed={2} opacity={0.8} color="#ff0055" noise={3} />}

                    <OrbitControls enableZoom={true} enablePan={true} maxDistance={40} minDistance={15} autoRotate={gameState === 'PLAYING'} autoRotateSpeed={1.0} />

                    <EffectComposer enableNormalPass={false}>
                        <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.8} />
                        <DepthOfField focusDistance={0.06} focalLength={0.05} bokehScale={3} height={480} />
                        <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.003, 0.003)} />
                        {(gameState === 'FAILED' || glitchActive || timeLeft <= 15) && <Noise opacity={0.15} />}
                        <Vignette eskil={false} offset={0.1} darkness={1.3} />
                        {(gameState === 'FAILED' || glitchActive) && (<Glitch delay={new THREE.Vector2(0, 0.5)} duration={new THREE.Vector2(0.3, 0.8)} mode={GlitchMode.SPORADIC} active ratio={0.8} />)}
                    </EffectComposer>
                </Canvas>
            </div>
        </div>
    );
};

export default PromptSculptor;
