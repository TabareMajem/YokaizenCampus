/// <reference types="@react-three/fiber" />
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Float, Icosahedron, Sphere, Tube, Sparkles, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette, DepthOfField, Glitch } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import { Network, Zap, Activity, CheckCircle, RotateCcw, AlertTriangle, Shield, Terminal, SkullIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { Difficulty, Language, UserStats } from '../../types';
import { audio } from '../../services/audioService';
import { useDialogue } from '../../contexts/DialogueContext';

export interface SynapseSurgeProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: Difficulty;
    t: (key: string) => string;
}

// --------------------------------------------------------
// AAA 3D Components
// --------------------------------------------------------

class SplineCurve extends THREE.Curve<THREE.Vector3> {
    points: THREE.Vector3[];
    constructor(points: THREE.Vector3[]) {
        super();
        this.points = points;
    }
    getPoint(t: number, optionalTarget = new THREE.Vector3()) {
        const v = new THREE.Vector3();
        const p = (this.points.length - 1) * t;
        const intPoint = Math.floor(p);
        const weight = p - intPoint;
        if (intPoint >= this.points.length - 1) {
            return optionalTarget.copy(this.points[this.points.length - 1]);
        }
        const p0 = this.points[intPoint];
        const p1 = this.points[intPoint + 1];
        v.copy(p0).lerp(p1, weight);
        return optionalTarget.copy(v);
    }
}

const TYPE_COLORS = {
    SOURCE: '#00ccff',
    TARGET: '#00ffaa',
    ROUTER: '#a855f7',
    BOTTLENECK: '#ff0055'
};

const SynapseNode = ({ position, type, isActive, onClick, powerLevel, id }: any) => {
    const groupRef = useRef<THREE.Group>(null);
    const coreRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    const isEndNode = type === 'SOURCE' || type === 'TARGET';
    const color = TYPE_COLORS[type as keyof typeof TYPE_COLORS];

    useFrame((state, delta) => {
        const t = state.clock.elapsedTime;
        if (groupRef.current && coreRef.current) {
            groupRef.current.rotation.x += delta * (isActive ? 1.5 : 0.2);
            groupRef.current.rotation.y += delta * (isActive ? 1.2 : 0.3);

            const pulse = isActive ? 1 + Math.sin(t * 8 + position[0]) * 0.15 : 1;
            const targetScale = (isEndNode ? 1.3 : 1.0) * pulse * (hovered ? 1.2 : 1);
            groupRef.current.scale.lerp(new THREE.Vector3().setScalar(targetScale), 0.15);

            coreRef.current.rotation.z = -t * 2;
        }
    });

    return (
        <Float floatIntensity={isActive ? 2 : 0.5} rotationIntensity={isActive ? 1.5 : 0.5} speed={isActive ? 4 : 2}>
            <group
                position={position}
                onClick={(e) => { e.stopPropagation(); onClick(id, position); }}
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = isEndNode ? 'default' : 'pointer'; }}
                onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'default'; }}
            >
                {/* Glassy Bio-Shell */}
                <mesh ref={groupRef}>
                    <icosahedronGeometry args={[1, 1]} />
                    <meshPhysicalMaterial
                        color={color} transmission={0.9} ior={isEndNode ? 1.8 : 1.5} thickness={isEndNode ? 1.5 : 0.8}
                        roughness={0.1} metalness={0.2} clearcoat={1} clearcoatRoughness={0.1}
                        emissive={isActive ? color : '#000000'} emissiveIntensity={isActive ? 0.8 : 0}
                        wireframe={type === 'BOTTLENECK' && !isActive}
                    />
                </mesh>

                {/* Glowing Synapse Core */}
                <mesh ref={coreRef}>
                    <icosahedronGeometry args={[0.4, 0]} />
                    <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={isActive ? 8 : 2} wireframe={!isActive} />
                </mesh>

                <pointLight distance={10} intensity={isActive ? 6 : (hovered ? 3 : 1)} color={color} />

                {/* Power Label */}
                {!isEndNode && (
                    <Text position={[0, 1.8, 0]} fontSize={0.6} font="https://fonts.gstatic.com/s/syncopate/v13/pe0sMIuPIYBCpEV5eFdCBfe_m_s.woff" color={isActive ? "#ffffff" : color} anchorX="center" anchorY="middle" outlineWidth={0.05} outlineColor="#000000" fillOpacity={isActive ? 1 : 0.5}>
                        {powerLevel}
                    </Text>
                )}
            </group>
        </Float>
    );
};

const DataPulse = ({ curve, speed }: any) => {
    const ref = useRef<THREE.Mesh>(null);
    const [progress, setProgress] = useState(Math.random());

    useFrame((state, delta) => {
        let nextP = progress + delta * speed;
        if (nextP >= 1) nextP = 0;
        setProgress(nextP);
        if (ref.current && curve) {
            ref.current.position.copy(curve.getPoint(nextP));
        }
    });

    return (
        <Sphere ref={ref} args={[0.2, 16, 16]}>
            <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </Sphere>
    );
};

const AxonConnection = ({ start, end, active, color = '#00ccff' }: any) => {
    const points = useMemo(() => [new THREE.Vector3(...start), new THREE.Vector3(...end)], [start, end]);
    const curve = useMemo(() => new SplineCurve(points), [points]);

    return (
        <group>
            {/* Core glowing tube */}
            <Tube args={[curve, 20, 0.08, 8, false]}>
                <meshStandardMaterial color={active ? color : '#112233'} emissive={active ? color : '#000000'} emissiveIntensity={active ? 2 : 0} transparent opacity={active ? 0.8 : 0.2} />
            </Tube>
            {/* Soft outer tube */}
            <Tube args={[curve, 20, 0.2, 8, false]}>
                <meshBasicMaterial color={color} transparent opacity={active ? 0.2 : 0.05} blending={THREE.AdditiveBlending} />
            </Tube>
            {active && <DataPulse curve={curve} speed={0.8} />}
            {active && <DataPulse curve={curve} speed={1.2} />}
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
export const SynapseSurge: React.FC<SynapseSurgeProps> = ({ onComplete, difficulty, t }) => {
    const { queueDialogue } = useDialogue();
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(difficulty === 'Elite' ? 45 : 90);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');
    const [surgeLevel, setSurgeLevel] = useState(0);
    const targetSurge = difficulty === 'Elite' ? 60 : 40;

    // UI Effects
    const [effects, setEffects] = useState<any[]>([]);
    const [screenFlash, setScreenFlash] = useState<string | null>(null);

    // Agents
    const [advisorMsg, setAdvisorMsg] = useState(t('game.advisor.analyzing') || 'Mapping neural pathways...');
    const [adversaryMsg, setAdversaryMsg] = useState(t('game.adversary.system_vulnerable') || 'Injecting packet resistance.');
    const [glitchActive, setGlitchActive] = useState(false);

    const initialNodes = useMemo(() => [
        { id: 'source', type: 'SOURCE', position: [-8, 0, 0] as [number, number, number], powerLevel: 100, isActive: true },
        { id: 'n1', type: 'ROUTER', position: [-3, 3, -2] as [number, number, number], powerLevel: 10, isActive: false },
        { id: 'n2', type: 'BOTTLENECK', position: [-2, -3, 2] as [number, number, number], powerLevel: 5, isActive: false },
        { id: 'n3', type: 'ROUTER', position: [2, 4, 1] as [number, number, number], powerLevel: 20, isActive: false },
        { id: 'n4', type: 'ROUTER', position: [3, -2, -3] as [number, number, number], powerLevel: 15, isActive: false },
        ...((difficulty === 'Elite' || difficulty === 'Pro') ? [
            { id: 'n5', type: 'BOTTLENECK', position: [0, 0, 4] as [number, number, number], powerLevel: 8, isActive: false },
            { id: 'n6', type: 'ROUTER', position: [5, 1, 3] as [number, number, number], powerLevel: 25, isActive: false },
        ] : []),
        ...((difficulty === 'Elite') ? [
            { id: 'n7', type: 'ROUTER', position: [-5, -1, -4] as [number, number, number], powerLevel: 12, isActive: false },
            { id: 'n8', type: 'BOTTLENECK', position: [4, -4, 0] as [number, number, number], powerLevel: 6, isActive: false },
        ] : []),
        { id: 'target', type: 'TARGET', position: [8, 0, 0] as [number, number, number], powerLevel: 0, isActive: false }
    ], [difficulty]);

    const [nodes, setNodes] = useState(initialNodes);

    const connections = useMemo(() => {
        const baseConns = [
            { source: 'source', target: 'n1' },
            { source: 'source', target: 'n2' },
            { source: 'n1', target: 'n3' },
            { source: 'n2', target: 'n4' },
            { source: 'n3', target: 'target' },
            { source: 'n4', target: 'target' }
        ];
        if (difficulty === 'Pro' || difficulty === 'Elite') {
            baseConns.push({ source: 'source', target: 'n5' }, { source: 'n5', target: 'n6' }, { source: 'n6', target: 'target' }, { source: 'n1', target: 'n5' });
        }
        if (difficulty === 'Elite') {
            baseConns.push({ source: 'source', target: 'n7' }, { source: 'n7', target: 'n4' }, { source: 'n4', target: 'n8' }, { source: 'n8', target: 'target' });
        }
        return baseConns;
    }, [difficulty]);

    // Narrative Briefing
    useEffect(() => {
        queueDialogue([
            { id: `ss-brief-${Date.now()}`, character: 'ATHENA', text: t('game.instructions.synapse_brief') || `Route data through the mesh. Target bandwidth: ${targetSurge}. Avoid overloads.` },
            { id: `ss-brief2-${Date.now()}`, character: 'SYNTAX', text: t('game.instructions.synapse_warn') || 'Too many red bottlenecks will drop the connection.', isGlitchy: true },
        ]);
    }, [queueDialogue, t, targetSurge]);

    // Agent lines
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const aLines = ['Throughput optimized.', 'Axons linking cleanly.', 'Keep routing. Bandwidth rising.', 'System thermal limits nominal.'];
        const eLines = ['Packet loss detected.', 'Friction injected into mesh.', 'You are creating bottlenecks.', 'Overload imminent.'];
        const iv = setInterval(() => {
            if (Math.random() > 0.6) { setAdversaryMsg(eLines[Math.floor(Math.random() * eLines.length)]); audio.playSystemMessage?.({ type: 'warning' }); setGlitchActive(true); setTimeout(() => setGlitchActive(false), 500) }
            else { setAdvisorMsg(aLines[Math.floor(Math.random() * aLines.length)]); audio.playSystemMessage?.({ type: 'success' }); }
        }, 5500);
        return () => clearInterval(iv);
    }, [gameState]);

    // Timer
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setGameState('FAILED');
                    audio.playError();
                    queueDialogue([{ id: `ss-fail-${Date.now()}`, character: 'BYTE', text: 'Connection timed out. Mesh collapsed.', isGlitchy: true }]);
                    onComplete(score, { completionTime: (difficulty === 'Elite' ? 45 : 90), difficulty });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, score, difficulty, onComplete, queueDialogue]);

    // Interaction
    const handleNodeClick = useCallback((id: string, pos: [number, number, number]) => {
        if (gameState !== 'PLAYING') return;
        const node = nodes.find(n => n.id === id);
        if (!node || node.type === 'SOURCE' || node.type === 'TARGET') return;

        audio.playClick();

        const isNowActive = !node.isActive;
        setNodes(prev => prev.map(n => n.id === id ? { ...n, isActive: isNowActive } : n));

        const effColor = TYPE_COLORS[node.type as keyof typeof TYPE_COLORS];
        setScreenFlash(`${effColor}22`);
        setTimeout(() => setScreenFlash(null), 100);

        setScore(s => s + (isNowActive ? 15 : -15));

        const effId = `${Date.now()}`;
        setEffects(prev => [...prev,
        { id: `sc-${effId}`, type: 'score', position: [pos[0], pos[1] + 1.5, pos[2]], text: isNowActive ? `+${node.powerLevel} BW` : `-${node.powerLevel} BW`, color: effColor },
        { id: `rg-${effId}`, type: 'ring', position: pos, color: effColor }
        ]);

        // Logic check
        setTimeout(() => {
            setNodes(currentNodes => {
                let totalSurge = 0;
                let bottlenecksActive = 0;
                currentNodes.forEach(n => {
                    if (n.isActive && n.type !== 'SOURCE' && n.type !== 'TARGET') {
                        totalSurge += n.powerLevel;
                        if (n.type === 'BOTTLENECK') bottlenecksActive++;
                    }
                });

                setSurgeLevel(totalSurge);

                // Win logic
                if (totalSurge >= targetSurge && totalSurge < 100 && bottlenecksActive <= 1) {
                    setGameState('SUCCESS');
                    audio.playSuccess();
                    const winScore = score + (timeLeft * 20) + (difficulty === 'Elite' ? 1500 : 800);
                    setScore(winScore);
                    queueDialogue([{ id: `ss-win-${Date.now()}`, character: 'ATHENA', text: 'Data transferred successfully. Mesh stable.' }]);
                    onComplete(winScore, { completionTime: (difficulty === 'Elite' ? 45 : 90) - timeLeft, difficulty });
                    return currentNodes.map(n => n.type === 'TARGET' ? { ...n, isActive: true } : n);
                }

                // Lose logic
                if (totalSurge >= 100 || bottlenecksActive > 1) {
                    setGameState('FAILED');
                    audio.playError();
                    queueDialogue([{ id: `ss-fail2-${Date.now()}`, character: 'SYNTAX', text: totalSurge >= 100 ? 'Network Overload detected!' : 'Latency spike from red bottlenecks!', isGlitchy: true }]);
                    onComplete(score, { completionTime: (difficulty === 'Elite' ? 45 : 90) - timeLeft, difficulty });
                }

                return currentNodes;
            });
        }, 120);
    }, [gameState, score, difficulty, timeLeft, onComplete, queueDialogue, nodes, targetSurge]);

    const removeEffect = useCallback((id: string) => setEffects(p => p.filter(e => e.id !== id)), []);

    return (
        <div className="relative w-full h-[700px] rounded-[32px] overflow-hidden border border-[#00ccff]/20 bg-[#000a12] shadow-[0_0_60px_rgba(0,204,255,0.1)] font-sans">
            <AnimatePresence>
                {screenFlash && (<motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="absolute inset-0 z-30 pointer-events-none mix-blend-screen" style={{ backgroundColor: screenFlash }} />)}
            </AnimatePresence>

            {/* AAA Glassmorphic HUD */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
                <div className="flex flex-col gap-4 filter drop-shadow-xl w-64">
                    <div className="bg-[#001529]/70 backdrop-blur-2xl rounded-2xl p-4 border border-[#00ccff]/30 shadow-[0_10px_30px_rgba(0,204,255,0.15)] relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#00ccff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center gap-2 text-[#00ccff] mb-2">
                            <Activity className="w-5 h-5 animate-pulse" />
                            <span className="text-xs uppercase tracking-[0.2em] font-black text-[#aaffff]">Bandwidth Yield</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <motion.div key={surgeLevel} initial={{ y: -5, opacity: 0.5 }} animate={{ y: 0, opacity: 1 }} className={`text-4xl font-black tabular-nums tracking-tighter uppercase ${surgeLevel > 80 ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-300' : 'text-transparent bg-clip-text bg-gradient-to-r from-white to-[#00ccff]'}`} style={{ textShadow: surgeLevel > 80 ? '0 0 20px rgba(255,0,0,0.4)' : '0 0 20px rgba(0,204,255,0.4)' }}>
                                {surgeLevel}
                            </motion.div>
                            <span className="text-sm font-bold text-[#0088ff]/80 uppercase tracking-widest">/ {targetSurge}</span>
                        </div>
                        <div className="mt-3 h-1.5 w-full bg-[#002244] rounded-full overflow-hidden">
                            <motion.div className={`h-full ${surgeLevel > 80 ? 'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_15px_#ff0055]' : 'bg-gradient-to-r from-[#0088ff] to-[#00ffaa] shadow-[0_0_15px_#00ffaa]'}`} initial={{ width: 0 }} animate={{ width: `${Math.min(100, (surgeLevel / 100) * 100)}%` }} transition={{ type: "spring", stiffness: 50 }} />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-4 filter drop-shadow-xl">
                    <div className="bg-[#001529]/70 backdrop-blur-2xl rounded-2xl p-4 border border-[#a855f7]/30 shadow-[0_10px_30px_rgba(168,85,247,0.15)] min-w-[140px] text-right">
                        <div className="flex items-center justify-end gap-2 text-[#a855f7] mb-1">
                            <span className="text-xs uppercase tracking-[0.2em] font-black">{t('game.hud.time') || 'TIME'}</span>
                            <AlertTriangle className="w-4 h-4" />
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

            {/* Cinematic Instructions */}
            <AnimatePresence>
                {timeLeft > (difficulty === 'Elite' ? 40 : 85) && gameState === 'PLAYING' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }} transition={{ duration: 0.8 }} className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                        <div className="bg-[#001529]/90 backdrop-blur-3xl p-8 rounded-[32px] border border-[#00ccff]/40 shadow-[0_30px_80px_rgba(0,204,255,0.3)] text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-[#00ccff]/10 to-transparent opacity-50"></div>
                            <div className="text-[#00ccff] font-black text-2xl uppercase tracking-widest mb-3 drop-shadow-[0_0_15px_rgba(0,204,255,0.8)]">
                                <Network className="inline w-8 h-8 mr-3 -mt-1" /> Route The Mesh
                            </div>
                            <div className="text-[#00ffaa] font-bold text-sm uppercase tracking-wider drop-shadow-[0_0_10px_rgba(0,255,170,0.5)]">
                                Target: {targetSurge} BW. Avoid crimson overloads (&gt;100).
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Agent Comms Panel */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row gap-4 z-10 pointer-events-none">
                <div className="flex-1 bg-[#001529]/80 backdrop-blur-2xl rounded-2xl p-4 border border-[#00ffaa]/20 border-l-4 border-l-[#00ffaa] shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#00ffaa]/10 rounded-full blur-[30px] -translate-y-1/2 translate-x-1/2"></div>
                    <div className="text-[10px] text-[#00ffaa] mb-2 uppercase tracking-[0.2em] font-black flex items-center gap-2"><Shield className="w-4 h-4" /> {t('game.advisor.label') || 'ADVISOR'}</div>
                    <div className="text-sm text-[#ccffdd]/90 font-mono leading-relaxed relative z-10">{advisorMsg}</div>
                </div>
                <div className="flex-1 bg-[#001529]/80 backdrop-blur-2xl rounded-2xl p-4 border border-[#ff0055]/20 border-l-4 border-l-[#ff0055] shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff0055]/10 rounded-full blur-[30px] -translate-y-1/2 translate-x-1/2"></div>
                    <div className="text-[10px] text-[#ff0055] mb-2 uppercase tracking-[0.2em] font-black flex items-center gap-2"><Zap className="w-4 h-4" /> {t('game.adversary.label') || 'ADVERSARY'}</div>
                    <div className="text-sm text-[#ffcccc]/90 font-mono leading-relaxed relative z-10">{adversaryMsg}</div>
                </div>
            </div>

            {/* Game Over Cinematic Screen */}
            <AnimatePresence>
                {gameState !== 'PLAYING' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-40 flex items-center justify-center bg-[#000a12]/95 backdrop-blur-xl">
                        <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", damping: 20 }} className="text-center p-10 w-full max-w-lg rounded-[40px] border border-[#00ccff]/30 bg-gradient-to-b from-[#001529]/90 to-black shadow-[0_50px_100px_rgba(0,204,255,0.2)] relative overflow-hidden pointer-events-auto">

                            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 blur-[80px] opacity-30 ${gameState === 'SUCCESS' ? 'bg-[#00ffaa]' : 'bg-[#ff0055]'}`}></div>

                            <div className={`w-28 h-28 mx-auto mb-8 rounded-full flex items-center justify-center relative z-10 ${gameState === 'SUCCESS' ? 'bg-[#00ffaa]/20 border-2 border-[#00ffaa] shadow-[0_0_40px_rgba(0,255,170,0.5)]' : 'bg-[#ff0055]/20 border-2 border-[#ff0055] shadow-[0_0_40px_rgba(255,0,85,0.4)]'}`}>
                                {gameState === 'SUCCESS' ? <CheckCircle className="w-14 h-14 text-[#00ffaa] drop-shadow-md" /> : <SkullIcon className="w-14 h-14 text-[#ff0055] drop-shadow-md" />}
                            </div>

                            <h2 className={`text-4xl sm:text-5xl font-black uppercase tracking-tighter mb-4 relative z-10 ${gameState === 'SUCCESS' ? 'text-transparent bg-clip-text bg-gradient-to-b from-white to-[#00ffaa]' : 'text-transparent bg-clip-text bg-gradient-to-b from-white to-[#ff0055]'}`} style={{ textShadow: gameState === 'SUCCESS' ? '0 10px 30px rgba(0,255,170,0.4)' : '0 10px 30px rgba(255,0,85,0.4)' }}>
                                {gameState === 'SUCCESS' ? 'MESH STABLE' : 'LINK SEVERED'}
                            </h2>

                            <div className="bg-black/60 rounded-2xl p-6 border border-[#00ccff]/20 mb-8 relative z-10">
                                <div className="text-sm text-[#00ccff] uppercase tracking-widest font-bold mb-1">Total Route Score</div>
                                <div className="text-5xl text-white font-mono font-black tabular-nums">{score.toLocaleString()}</div>
                                <div className="mt-4 pt-4 border-t border-white/10 text-xs text-gray-400">
                                    {gameState === 'SUCCESS' ? 'Data transferred cleanly.' : 'Latency/Overload thresholds broken.'}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium 3D Canvas */}
            <div className={`absolute inset-0 z-0 ${gameState !== 'PLAYING' ? 'pointer-events-none' : ''}`}>
                <Canvas camera={{ position: [0, 0, 16], fov: 60 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}>
                    <color attach="background" args={['#000a12']} />
                    <fog attach="fog" args={['#000a12', 12, 40]} />

                    <ambientLight intensity={0.4} />
                    <pointLight position={[10, 10, 10]} intensity={2} color="#00ccff" />
                    <pointLight position={[-10, -10, -10]} intensity={1.5} color="#a855f7" />

                    <group>
                        {connections.map((c, i) => {
                            const sourceNode = nodes.find(n => n.id === c.source);
                            const targetNode = nodes.find(n => n.id === c.target);
                            if (!sourceNode || !targetNode) return null;
                            const active = (sourceNode.type === 'SOURCE' && targetNode.isActive) || (sourceNode.isActive && targetNode.isActive);
                            return <AxonConnection key={i} start={sourceNode.position} end={targetNode.position} active={active} color={TYPE_COLORS[targetNode.type as keyof typeof TYPE_COLORS]} />;
                        })}

                        {nodes.map(n => (
                            <SynapseNode key={n.id} id={n.id} type={n.type} position={n.position} isActive={n.isActive} powerLevel={n.powerLevel} onClick={handleNodeClick} />
                        ))}
                    </group>

                    <Sparkles count={300} scale={[30, 30, 30]} size={4} speed={0.4} opacity={0.4} color="#00ccff" noise={1} />
                    <Sparkles count={150} scale={[20, 20, 20]} size={6} speed={0.6} opacity={0.6} color="#00ffaa" noise={1} />

                    {effects.map(eff => eff.type === 'score' ? (
                        <FloatingScore key={eff.id} position={eff.position} text={eff.text} color={eff.color} onComplete={() => removeEffect(eff.id)} />
                    ) : (
                        <ImpactRing key={eff.id} position={eff.position} color={eff.color} onComplete={() => removeEffect(eff.id)} />
                    ))}

                    <OrbitControls enableZoom={true} enablePan={true} maxDistance={25} minDistance={10} autoRotate={gameState === 'PLAYING'} autoRotateSpeed={0.5} />

                    <EffectComposer enableNormalPass={false}>
                        <Bloom luminanceThreshold={0.3} mipmapBlur intensity={1.6 + (surgeLevel / 100)} />
                        <DepthOfField focusDistance={0.05} focalLength={0.06} bokehScale={3} height={480} />
                        <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.003, 0.003)} />
                        {surgeLevel > 80 && <Noise opacity={0.15} />}
                        <Vignette eskil={false} offset={0.1} darkness={1.2} />
                        {glitchActive && (<Glitch delay={new THREE.Vector2(0, 0)} duration={new THREE.Vector2(0.2, 0.5)} mode={GlitchMode.SPORADIC} active ratio={0.7} />)}
                    </EffectComposer>
                </Canvas>
            </div>
        </div>
    );
};

export default SynapseSurge;
