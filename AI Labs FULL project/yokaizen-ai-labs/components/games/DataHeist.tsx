/// <reference types="@react-three/fiber" />
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float, Icosahedron, Cylinder, Torus, Sparkles, Box } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Noise, Glitch, Vignette, DepthOfField } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import { Key, Unlock, Activity, ShieldAlert, CheckCircle, Shield, Zap, SkullIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { Difficulty, Language, UserStats } from '../../types';
import { audio } from '../../services/audioService';
import { useDialogue } from '../../contexts/DialogueContext';

export interface DataHeistProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: Difficulty;
    t: (key: string) => string;
}

// --------------------------------------------------------
// AAA 3D Components
// --------------------------------------------------------

const SecurityNode = ({ position, id, isActive, isError, onClick, colorTheme }: any) => {
    const groupRef = useRef<THREE.Group>(null);
    const ringRef = useRef<THREE.Mesh>(null);
    const coreRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state, delta) => {
        const t = state.clock.elapsedTime;
        if (groupRef.current && ringRef.current && coreRef.current) {
            ringRef.current.rotation.z += delta * (isActive ? 4 : 0.5);
            ringRef.current.rotation.x += delta * (isActive ? 2 : 0.2);

            coreRef.current.rotation.y -= delta * (isActive ? 3 : 0.4);

            const pulse = isActive ? 1.3 + Math.sin(t * 15) * 0.1 : 1;
            const targetScale = hovered ? 1.2 : 1.0;
            groupRef.current.scale.lerp(new THREE.Vector3().setScalar(targetScale * pulse), 0.2);
        }
    });

    const baseColor = colorTheme; // Usually Cyan/Blue
    const activeColor = '#ffffff';
    const errorColor = '#ff0055';

    const displayColor = isError ? errorColor : isActive ? activeColor : baseColor;
    const emissiveInt = isActive ? 5 : isError ? 4 : 0.5;

    return (
        <Float floatIntensity={isActive ? 0 : 2} rotationIntensity={isActive ? 0 : 1} speed={isActive ? 0 : 2}>
            <group
                ref={groupRef}
                position={position}
                onClick={(e) => { e.stopPropagation(); onClick(id, position); }}
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
                onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'default'; }}
            >
                {/* Outer combination ring */}
                <mesh ref={ringRef}>
                    <torusGeometry args={[1.2, 0.05, 16, 64]} />
                    <meshStandardMaterial color={displayColor} emissive={displayColor} emissiveIntensity={emissiveInt * 0.5} transparent opacity={0.8} />
                </mesh>

                {/* Inner Crypto Core */}
                <mesh ref={coreRef}>
                    <icosahedronGeometry args={[0.7, 1]} />
                    <meshPhysicalMaterial
                        color={displayColor} transmission={0.9} ior={1.8} thickness={1}
                        roughness={0.1} metalness={0.5} clearcoat={1}
                        emissive={displayColor} emissiveIntensity={emissiveInt}
                        wireframe={isError}
                    />
                </mesh>

                <pointLight distance={8} intensity={emissiveInt * 2} color={displayColor} />

                {/* Number label for clarity if needed, though memory game relies on visual. Hidden normally, shown on hover/active for AAA feel */}
                <Text position={[0, 0, 1.5]} fontSize={0.4} font="https://fonts.gstatic.com/s/syncopate/v13/pe0sMIuPIYBCpEV5eFdCBfe_m_s.woff" color="#ffffff" anchorX="center" anchorY="middle" fillOpacity={isActive || hovered ? 0.9 : 0} outlineWidth={0.02} outlineColor={displayColor}>
                    {id.toString()}
                </Text>
            </group>
        </Float>
    );
};

const VaultCore = ({ gameState }: { gameState: string }) => {
    const groupRef = useRef<THREE.Group>(null);
    const ringsRef = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        const t = state.clock.elapsedTime;
        if (groupRef.current) {
            groupRef.current.rotation.y = t * 0.1;
            groupRef.current.rotation.x = Math.sin(t * 0.5) * 0.1;

            if (gameState === 'SUCCESS') {
                groupRef.current.scale.lerp(new THREE.Vector3().setScalar(1.5), 0.05);
            }
        }
        if (ringsRef.current) {
            ringsRef.current.children.forEach((ring, i) => {
                const speed = (i % 2 === 0 ? 1 : -1) * (gameState === 'FAILED' ? 5 : gameState === 'SUCCESS' ? 0.2 : 0.8);
                ring.rotation.x += delta * speed * 0.5;
                ring.rotation.y += delta * speed * 0.8;
                ring.rotation.z += delta * speed * 0.3;
            });
        }
    });

    const coreColor = gameState === 'SUCCESS' ? '#00ffaa' : gameState === 'FAILED' ? '#ff0055' : '#0066ff';

    return (
        <group ref={groupRef}>
            {/* The main data vault */}
            <mesh>
                <octahedronGeometry args={[2.5, 2]} />
                <meshPhysicalMaterial
                    color="#051020" transmission={0.5} opacity={0.9} transparent
                    roughness={0.2} metalness={0.8} clearcoat={1}
                    emissive={coreColor} emissiveIntensity={gameState === 'SUCCESS' ? 2 : 0.2}
                    wireframe={gameState === 'FAILED'}
                />
            </mesh>

            {/* Protective Data Rings */}
            <group ref={ringsRef}>
                {[3.2, 3.6, 4.0].map((radius, i) => (
                    <mesh key={i} rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}>
                        <torusGeometry args={[radius, 0.02, 16, 100]} />
                        <meshBasicMaterial color={coreColor} transparent opacity={0.3 + (i * 0.1)} blending={THREE.AdditiveBlending} />
                    </mesh>
                ))}
            </group>

            <pointLight distance={20} intensity={gameState === 'SUCCESS' ? 10 : gameState === 'FAILED' ? 15 : 4} color={coreColor} />
        </group>
    );
};

const FloatingScore = ({ position, text, color, onComplete }: any) => {
    const ref = useRef<THREE.Group>(null);
    const [life, setLife] = useState(0);
    useFrame((_, d) => {
        if (!ref.current) return;
        setLife(l => l + d * 2);
        ref.current.position.y += d * 2;
        ref.current.scale.setScalar(Math.max(0, 1 - life * 0.5));
        if (life > 2) onComplete();
    });
    return (
        <group ref={ref} position={position}>
            <Text color={color} fontSize={0.8} font="https://fonts.gstatic.com/s/syncopate/v13/pe0sMIuPIYBCpEV5eFdCBfe_m_s.woff" anchorX="center" anchorY="middle" outlineWidth={0.05} outlineColor="#000000">{text}</Text>
        </group>
    );
};

// --------------------------------------------------------
// Main Game Component
// --------------------------------------------------------
export const DataHeist: React.FC<DataHeistProps> = ({ onComplete, difficulty, t }) => {
    const { queueDialogue } = useDialogue();
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(difficulty === 'Elite' ? 45 : 90);
    const [gameState, setGameState] = useState<'MEMORIZE' | 'PLAYING' | 'SUCCESS' | 'FAILED'>('MEMORIZE');

    const numNodes = difficulty === 'Elite' ? 6 : difficulty === 'Pro' ? 5 : 4;
    const sequenceLength = difficulty === 'Elite' ? 7 : difficulty === 'Pro' ? 6 : 5;

    // UI Effects
    const [effects, setEffects] = useState<any[]>([]);
    const [screenFlash, setScreenFlash] = useState<string | null>(null);
    const [glitchActive, setGlitchActive] = useState(false);

    // Agents
    const [advisorMsg, setAdvisorMsg] = useState(t('game.advisor.analyzing') || 'Intercepting ZKP handshake protocol.');
    const [adversaryMsg, setAdversaryMsg] = useState(t('game.adversary.system_vulnerable') || 'Vault lockdown imminent.');

    const initialNodes = useMemo(() => {
        return Array.from({ length: numNodes }).map((_, i) => ({
            id: i,
            position: [
                Math.sin((i / numNodes) * Math.PI * 2) * 6.5,
                Math.cos((i / numNodes) * Math.PI * 2) * 6.5,
                (i % 2 === 0 ? 1 : -1) * 2 // Stagger depth
            ] as [number, number, number],
            isActive: false,
            isError: false,
            colorTheme: ['#00ffff', '#00ffaa', '#a855f7', '#ffaa00', '#ff00aa', '#3b82f6'][i % 6]
        }));
    }, [numNodes]);

    const [nodes, setNodes] = useState(initialNodes);
    const [sequence, setSequence] = useState<number[]>([]);
    const [playerSequence, setPlayerSequence] = useState<number[]>([]);

    // Sequence Generation
    useEffect(() => {
        if (gameState === 'MEMORIZE' && sequence.length === 0) {
            const newSeq = [];
            let lastNode = -1;
            for (let i = 0; i < sequenceLength; i++) {
                let nextNode;
                do { nextNode = Math.floor(Math.random() * numNodes); } while (nextNode === lastNode && numNodes > 1); // prevent immediate repeats for better UX
                newSeq.push(nextNode);
                lastNode = nextNode;
            }
            setSequence(newSeq);
        }
    }, [gameState, sequence.length, sequenceLength, numNodes]);

    // Narrative Briefing
    useEffect(() => {
        if (gameState === 'MEMORIZE') {
            queueDialogue([
                { id: `dh-brief-${Date.now()}`, character: 'ATHENA', text: t('game.instructions.heist_brief') || 'Memorize the cryptographic sequence to spoof the Zero-Knowledge Proof.' },
            ]);
        }
    }, [gameState, queueDialogue, t]);

    // Playback Sequence
    useEffect(() => {
        if (gameState !== 'MEMORIZE' || sequence.length === 0) return;

        let step = 0;
        // initial delay before showing
        const startTimeout = setTimeout(() => {
            const interval = setInterval(() => {
                if (step >= sequence.length) {
                    clearInterval(interval);
                    setNodes(current => current.map(n => ({ ...n, isActive: false })));
                    setGameState('PLAYING');
                    queueDialogue([{ id: `dh-play-${Date.now()}`, character: 'ATHENA', text: 'Protocol logged. Reproduce the sequence exactly.' }]);
                    setAdvisorMsg('Awaiting manual override sequence input.');
                    setAdversaryMsg('Monitoring input variance.');
                    return;
                }

                const activeId = sequence[step];
                audio.playSystemMessage?.({ type: 'success' }); // soft blip

                setNodes(current => current.map(n => ({ ...n, isActive: n.id === activeId })));
                const nodeColor = nodes.find(n => n.id === activeId)?.colorTheme || '#00ffff';
                setScreenFlash(`${nodeColor}10`);
                setTimeout(() => setScreenFlash(null), 150);

                setTimeout(() => {
                    setNodes(current => current.map(n => ({ ...n, isActive: false })));
                }, 500); // 500ms lit 

                step++;
            }, 1000); // 1000ms between each
            return () => clearInterval(interval);
        }, 1500);
        return () => clearTimeout(startTimeout);
    }, [gameState, sequence, queueDialogue, nodes]);

    // Timer
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setGameState('FAILED');
                    audio.playError();
                    queueDialogue([{ id: `dh-fail-time-${Date.now()}`, character: 'BYTE', text: 'Timeout. Security forces dispatched.', isGlitchy: true }]);
                    onComplete(score, { completionTime: (difficulty === 'Elite' ? 45 : 90), difficulty });
                    return 0;
                }
                if (prev === 15) {
                    setGlitchActive(true);
                    setAdversaryMsg('Intrusion trace at 90%. Lockdown imminent.');
                    audio.playSystemMessage?.({ type: 'warning' });
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, score, difficulty, onComplete, queueDialogue]);

    // Interaction
    const handleNodeClick = useCallback((id: number, pos: [number, number, number]) => {
        if (gameState !== 'PLAYING') return;

        const expectedId = sequence[playerSequence.length];

        if (id === expectedId) {
            // Correct
            audio.playClick();
            const newPlayerSeq = [...playerSequence, id];
            setPlayerSequence(newPlayerSeq);

            setNodes(current => current.map(n => ({ ...n, isActive: n.id === id })));
            setTimeout(() => setNodes(current => current.map(n => ({ ...n, isActive: false }))), 300);

            const pts = 150;
            setScore(s => s + pts);

            const nodeColor = nodes.find(n => n.id === id)?.colorTheme || '#00ccff';
            setScreenFlash(`${nodeColor}22`);
            setTimeout(() => setScreenFlash(null), 100);

            const effId = `${Date.now()}`;
            setEffects(prev => [...prev, { id: `sc-${effId}`, type: 'score', position: [pos[0], pos[1] + 1.5, pos[2]], text: 'MATCH', color: nodeColor }]);

            if (newPlayerSeq.length === sequence.length) {
                // WIN!
                setGameState('SUCCESS');
                audio.playSuccess();
                setScreenFlash('rgba(0,255,170,0.3)');
                const winScore = score + pts + (timeLeft * 25) + (difficulty === 'Elite' ? 2000 : 1000);
                setTimeout(() => {
                    setScore(winScore);
                    queueDialogue([{ id: `dh-win-${Date.now()}`, character: 'ATHENA', text: 'ZKP Spoofed. Vault Open. Extracting payload.' }]);
                    onComplete(winScore, { completionTime: (difficulty === 'Elite' ? 45 : 90) - timeLeft, difficulty });
                }, 500);
            }
        } else {
            // Wrong
            audio.playError();
            setNodes(current => current.map(n => ({ ...n, isError: n.id === id })));
            setGameState('FAILED');
            setScreenFlash('rgba(255,0,85,0.4)');
            setGlitchActive(true);
            queueDialogue([{ id: `dh-fail-wrong-${Date.now()}`, character: 'SYNTAX', text: 'Sequence mismatch! Quantum alarms triggered!', isGlitchy: true }]);
            setTimeout(() => {
                onComplete(score, { completionTime: (difficulty === 'Elite' ? 45 : 90) - timeLeft, difficulty });
            }, 2000);
        }
    }, [gameState, sequence, playerSequence, score, timeLeft, difficulty, onComplete, queueDialogue, nodes]);

    const removeEffect = useCallback((id: string) => setEffects(p => p.filter(e => e.id !== id)), []);

    return (
        <div className="relative w-full h-[700px] rounded-[32px] overflow-hidden border border-[#0066ff]/20 bg-[#010510] shadow-[0_0_80px_rgba(0,102,255,0.1)] font-sans">
            <AnimatePresence>
                {screenFlash && (<motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="absolute inset-0 z-30 pointer-events-none mix-blend-screen" style={{ backgroundColor: screenFlash }} />)}
            </AnimatePresence>

            {/* AAA Glassmorphic HUD */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
                <div className="flex flex-col gap-4 filter drop-shadow-xl w-72">
                    <div className="bg-[#020a1a]/70 backdrop-blur-2xl rounded-2xl p-4 border border-[#0066ff]/30 shadow-[0_10px_30px_rgba(0,102,255,0.15)] relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#0066ff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center gap-2 text-[#0066ff] mb-2">
                            <Key className="w-5 h-5 animate-pulse" />
                            <span className="text-xs uppercase tracking-[0.2em] font-black text-[#aaccff]">ZKP Protocol</span>
                        </div>

                        {/* Sequence Dots */}
                        <div className="flex gap-2 mb-3 h-2">
                            {Array.from({ length: sequence.length || sequenceLength }).map((_, i) => (
                                <div key={i} className={`flex-1 rounded-full ${i < playerSequence.length ? 'bg-[#00ffaa] shadow-[0_0_10px_#00ffaa]' : 'bg-[#0066ff]/20'}`} />
                            ))}
                        </div>

                        <div className="flex items-baseline gap-2">
                            <motion.div key={playerSequence.length} initial={{ y: -5, opacity: 0.5 }} animate={{ y: 0, opacity: 1 }} className={'text-4xl font-black tabular-nums tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-white to-[#0066ff]'} style={{ textShadow: '0 0 20px rgba(0,102,255,0.4)' }}>
                                {playerSequence.length}
                            </motion.div>
                            <span className="text-sm font-bold text-[#0066ff]/60 uppercase tracking-widest">/ {sequence.length || sequenceLength}</span>
                        </div>
                        <div className="text-[10px] text-[#0066ff]/60 uppercase tracking-widest font-bold mt-1 text-right w-full">Current Score: {score}</div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-4 filter drop-shadow-xl">
                    <div className="bg-[#020a1a]/70 backdrop-blur-2xl rounded-2xl p-4 border border-[#a855f7]/30 shadow-[0_10px_30px_rgba(168,85,247,0.15)] min-w-[140px] text-right">
                        <div className="flex items-center justify-end gap-2 text-[#a855f7] mb-1">
                            <span className="text-xs uppercase tracking-[0.2em] font-black">{t('game.hud.time') || 'TIME LIMIT'}</span>
                            <ShieldAlert className="w-4 h-4" />
                        </div>
                        <div className={`text-4xl font-black tabular-nums tracking-tighter ${timeLeft <= 15 ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-300 animate-pulse' : 'text-transparent bg-clip-text bg-gradient-to-r from-white to-[#a855f7]'}`} style={{ textShadow: timeLeft <= 15 ? '0 0 20px rgba(255,0,0,0.6)' : '0 0 20px rgba(168,85,247,0.4)' }}>
                            {timeLeft}s
                        </div>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border backdrop-blur-md ${difficulty === 'Elite' ? 'border-[#ff0055]/50 text-[#ff0055] bg-[#ff0055]/10 shadow-[0_0_15px_rgba(255,0,85,0.4)]' : 'border-[#00ffaa]/50 text-[#00ffaa] bg-[#00ffaa]/10 shadow-[0_0_15px_rgba(0,255,170,0.4)]'}`}>
                        {difficulty}
                    </div>
                </div>
            </div>

            {/* Cinematic Overlay - Memorize / Results */}
            <AnimatePresence>
                {gameState === 'MEMORIZE' && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20, filter: 'blur(10px)' }} transition={{ duration: 0.5 }} className="absolute top-32 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                        <div className="bg-[#003366]/80 backdrop-blur-xl px-10 py-5 rounded-full border border-[#00ccff]/50 shadow-[0_20px_50px_rgba(0,204,255,0.3)] flex items-center gap-4">
                            <Activity className="w-6 h-6 text-[#00ffff] animate-pulse" />
                            <span className="text-[#00ffff] font-black text-xl uppercase tracking-[0.3em] drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]">Memorize Protocol</span>
                        </div>
                    </motion.div>
                )}

                {gameState !== 'PLAYING' && gameState !== 'MEMORIZE' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-40 flex items-center justify-center bg-[#010510]/95 backdrop-blur-2xl">
                        <motion.div initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", damping: 20 }} className="text-center p-12 w-full max-w-xl rounded-[40px] border border-[#0066ff]/30 bg-gradient-to-b from-[#020a1a]/90 to-black shadow-[0_50px_100px_rgba(0,102,255,0.2)] relative overflow-hidden pointer-events-auto">

                            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 blur-[100px] opacity-40 ${gameState === 'SUCCESS' ? 'bg-[#00ffaa]' : 'bg-[#ff0055]'}`}></div>

                            <div className={`w-32 h-32 mx-auto mb-8 rounded-full flex items-center justify-center relative z-10 ${gameState === 'SUCCESS' ? 'bg-[#00ffaa]/20 border-2 border-[#00ffaa] shadow-[0_0_50px_rgba(0,255,170,0.5)]' : 'bg-[#ff0055]/20 border-2 border-[#ff0055] shadow-[0_0_50px_rgba(255,0,85,0.4)]'}`}>
                                {gameState === 'SUCCESS' ? <Unlock className="w-16 h-16 text-[#00ffaa] drop-shadow-md" /> : <SkullIcon className="w-16 h-16 text-[#ff0055] drop-shadow-md" />}
                            </div>

                            <h2 className={`text-4xl sm:text-6xl font-black uppercase tracking-tighter mb-4 relative z-10 ${gameState === 'SUCCESS' ? 'text-transparent bg-clip-text bg-gradient-to-b from-white to-[#00ffaa]' : 'text-transparent bg-clip-text bg-gradient-to-b from-white to-[#ff0055]'}`} style={{ textShadow: gameState === 'SUCCESS' ? '0 10px 30px rgba(0,255,170,0.4)' : '0 10px 30px rgba(255,0,85,0.4)' }}>
                                {gameState === 'SUCCESS' ? 'VAULT BREACHED' : 'LOCKDOWN ACTIVE'}
                            </h2>

                            <div className="bg-black/60 rounded-3xl p-8 border border-[#0066ff]/20 mb-8 relative z-10 backdrop-blur-md">
                                <div className="text-sm text-[#0066ff] uppercase tracking-widest font-bold mb-2">Extracted Data Value</div>
                                <div className="text-6xl text-white font-mono font-black tabular-nums">{score.toLocaleString()}</div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Agent Comms Panel */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row gap-4 z-10 pointer-events-none">
                <div className="flex-1 bg-[#020a1a]/80 backdrop-blur-2xl rounded-2xl p-4 border border-[#00ccff]/20 border-l-4 border-l-[#00ccff] shadow-xl relative overflow-hidden">
                    <div className="text-[10px] text-[#00ccff] mb-2 uppercase tracking-[0.2em] font-black flex items-center gap-2"><Shield className="w-4 h-4" /> {t('game.advisor.label') || 'ADVISOR'}</div>
                    <div className="text-sm text-[#ccffff]/90 font-mono leading-relaxed relative z-10">{advisorMsg}</div>
                </div>
                <div className="flex-1 bg-[#020a1a]/80 backdrop-blur-2xl rounded-2xl p-4 border border-[#ffaa00]/20 border-l-4 border-l-[#ffaa00] shadow-xl relative overflow-hidden">
                    <div className="text-[10px] text-[#ffaa00] mb-2 uppercase tracking-[0.2em] font-black flex items-center gap-2"><Zap className="w-4 h-4" /> {t('game.adversary.label') || 'ADVERSARY'}</div>
                    <div className="text-sm text-[#ffeecc]/90 font-mono leading-relaxed relative z-10">{adversaryMsg}</div>
                </div>
            </div>

            {/* Premium 3D Canvas */}
            <div className={`absolute inset-0 z-0 ${gameState === 'MEMORIZE' || gameState === 'PLAYING' ? '' : 'pointer-events-none'}`}>
                <Canvas camera={{ position: [0, 0, 18], fov: 60 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}>
                    <color attach="background" args={['#010510']} />
                    <fog attach="fog" args={['#010510', 10, 40]} />

                    <ambientLight intensity={0.4} />
                    <pointLight position={[0, 10, 0]} intensity={2} color="#0066ff" />
                    <pointLight position={[0, -10, 0]} intensity={1} color="#a855f7" />

                    <group rotation={[0, 0, 0]}>
                        <VaultCore gameState={gameState} />

                        {nodes.map(n => (
                            <SecurityNode key={n.id} id={n.id} position={n.position} isActive={n.isActive || (gameState === 'SUCCESS')} isError={n.isError || (gameState === 'FAILED')} colorTheme={n.colorTheme} onClick={handleNodeClick} />
                        ))}
                    </group>

                    <Sparkles count={400} scale={[20, 20, 20]} size={6} speed={0.4} opacity={0.3} color="#0066ff" noise={1} />
                    {glitchActive && <Sparkles count={200} scale={[25, 25, 25]} size={8} speed={2} opacity={0.8} color="#ff0055" noise={3} />}

                    {effects.map(eff => eff.type === 'score' && (
                        <FloatingScore key={eff.id} position={eff.position} text={eff.text} color={eff.color} onComplete={() => removeEffect(eff.id)} />
                    ))}

                    <OrbitControls enableZoom={true} enablePan={true} maxDistance={25} minDistance={10} autoRotate={true} autoRotateSpeed={gameState === 'MEMORIZE' ? 2 : 0.5} />

                    <EffectComposer enableNormalPass={false}>
                        <Bloom luminanceThreshold={0.2} mipmapBlur intensity={gameState === 'MEMORIZE' ? 1.5 : gameState === 'SUCCESS' ? 3 : 2} />
                        <DepthOfField focusDistance={0.06} focalLength={0.05} bokehScale={4} height={480} />
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

export default DataHeist;
