import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Sparkles, Html, Line, useGLTF, Text3D, Center } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch, Vignette, Noise } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Activity, Shield, AlertTriangle, Zap, RotateCcw, Clock, Eye, CheckCircle2, ChevronRight } from 'lucide-react';
import { audio } from '../../services/audioService';
import { motion, AnimatePresence } from 'framer-motion';

export interface ChronoQuestProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

const NODES = ['EPOCH_01', 'NEXUS_A', 'RIFT_PRIME', 'ZENITH_X', 'OMEGA_POINT'];

// Represents a single point in time that needs to be sequenced
const TimeNode = ({ id, label, position, isActive, isCorrect, isNext, onClick }: any) => {
    const groupRef = useRef<THREE.Group>(null);
    const ringRef = useRef<THREE.Mesh>(null);
    const [hovered, setHover] = useState(false);

    useFrame((state) => {
        if (groupRef.current) {
            // Complex multi-axis rotation for the core
            groupRef.current.rotation.x = state.clock.elapsedTime * (hovered ? 1.5 : 0.5) + id;
            groupRef.current.rotation.y = state.clock.elapsedTime * (hovered ? 2.0 : 0.8) + id;

            // Pulse effect if this is the next required node
            if (isNext && !isCorrect) {
                const s = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.15;
                groupRef.current.scale.set(s, s, s);
            } else {
                groupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
            }
        }

        if (ringRef.current) {
            ringRef.current.rotation.z = state.clock.elapsedTime * (id % 2 === 0 ? 1 : -1);
        }
    });

    // Color Logic
    const baseColor = isCorrect === true ? '#10b981' : isCorrect === false ? '#ef4444' : isActive ? '#60a5fa' : '#8b5cf6';
    const emissiveColor = isCorrect === true ? '#059669' : isCorrect === false ? '#dc2626' : isActive ? '#3b82f6' : '#7c3aed';
    const intensity = isCorrect ? 2 : hovered || isActive ? 1.5 : 0.5;

    return (
        <group position={position}>
            <Float speed={2} floatIntensity={1} rotationIntensity={0.5}>
                <group
                    onClick={(e) => { e.stopPropagation(); onClick(); }}
                    onPointerOver={() => setHover(true)}
                    onPointerOut={() => setHover(false)}
                    ref={groupRef}
                >
                    {/* Core Geometry - using standard geometry for reliability */}
                    <mesh>
                        <octahedronGeometry args={[0.8, 0]} />
                        <meshStandardMaterial
                            color={baseColor}
                            emissive={emissiveColor}
                            emissiveIntensity={intensity}
                            roughness={0.2}
                            metalness={0.8}
                            wireframe={!isActive && isCorrect === null}
                        />
                    </mesh>

                    {/* Outer Rotating Ring */}
                    <mesh ref={ringRef} scale={1.4}>
                        <torusGeometry args={[0.8, 0.05, 16, 64]} />
                        <meshStandardMaterial
                            color={baseColor}
                            emissive={emissiveColor}
                            emissiveIntensity={intensity * 0.5}
                            transparent
                            opacity={0.6}
                        />
                    </mesh>

                    {/* Inner Particle Core */}
                    {isNext && !isCorrect && (
                        <Sparkles count={20} scale={1} size={1} speed={2} opacity={0.8} color="#ffffff" />
                    )}
                </group>

                {/* HTML Label UI */}
                <Html center position={[0, -1.8, 0]} className="pointer-events-none z-10">
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-[0.2em] transition-all duration-300 backdrop-blur-md shadow-lg ${isCorrect === true
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-emerald-500/20'
                            : isCorrect === false
                                ? 'bg-red-500/20 text-red-300 border border-red-500/50 shadow-red-500/20'
                                : hovered || isActive
                                    ? 'bg-blue-500/20 text-blue-200 border border-blue-400 shadow-blue-500/30 scale-110'
                                    : 'bg-black/50 text-purple-200/50 border border-purple-500/20'
                        }`}>
                        <div className="flex items-center gap-1.5">
                            {isCorrect && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                            {label}
                        </div>
                    </div>
                </Html>
            </Float>
        </group>
    );
};

// Procedural Background Timeline element
const TimelineGrid = ({ currentStep, paradoxLevel }: { currentStep: number, paradoxLevel: number }) => {
    const gridRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (gridRef.current) {
            // Grid slowly sinks backward to simulate moving through time
            gridRef.current.position.z = (state.clock.elapsedTime * 2) % 10;
        }
    });

    return (
        <group ref={gridRef} position={[0, -5, -20]}>
            {[...Array(20)].map((_, i) => (
                <mesh key={`grid-h-${i}`} position={[0, 0, i * 2 - 20]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[100, 0.05]} />
                    <meshBasicMaterial color={paradoxLevel > 50 ? "#ef4444" : "#8b5cf6"} transparent opacity={Math.max(0.1, 1 - (i / 20))} />
                </mesh>
            ))}
            {[...Array(20)].map((_, i) => (
                <mesh key={`grid-v-${i}`} position={[(i - 10) * 5, 0, -10]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
                    <planeGeometry args={[100, 0.05]} />
                    <meshBasicMaterial color={paradoxLevel > 50 ? "#ef4444" : "#8b5cf6"} transparent opacity={0.15} />
                </mesh>
            ))}
        </group>
    );
};

export const ChronoQuest: React.FC<ChronoQuestProps> = ({ onComplete, difficulty, t }) => {
    // Core Game State
    const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'SUCCESS' | 'FAILED'>('IDLE');
    const [loops, setLoops] = useState(1);
    const [paradoxLevel, setParadoxLevel] = useState(0); // Max 100
    const [score, setScore] = useState(0);

    // Sequencing Logic
    const [targetSequence, setTargetSequence] = useState<number[]>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [nodeStates, setNodeStates] = useState<Record<number, boolean | null>>({}); // null = default, true = correct, false = wrong
    const [userSequence, setUserSequence] = useState<number[]>([]);

    // Visuals, Audio & Hints
    const [glitchActive, setGlitchActive] = useState(false);
    const [loopingVisual, setLoopingVisual] = useState(false);
    const [hints, setHints] = useState<string[]>([]);
    const [cameraPos, setCameraPos] = useState<[number, number, number]>([0, 0, 12]);

    // Initialize Game
    const startGame = () => {
        // Generate random sequence 0 to NODES.length-1
        const seq = [...Array(NODES.length).keys()].sort(() => Math.random() - 0.5);
        setTargetSequence(seq);
        setLoops(1);
        setParadoxLevel(0);
        setCurrentStep(0);
        setNodeStates({});
        setUserSequence([]);
        setHints([]);
        setScore(0);
        setGameState('PLAYING');
        audio.playSystemMessage({ type: 'success' });

        // Initial hint based on difficulty
        generateHint(seq, difficulty === 'Elite' ? 'Hard' : 'Easy');
    };

    // Advanced Hint Generation Engine
    // Generates clues based on relative positions to encourage logical deduction
    const generateHint = (seq: number[], diff: 'Easy' | 'Hard' = 'Easy') => {
        if (seq.length === 0) return;

        const i1 = Math.floor(Math.random() * NODES.length);
        let i2 = Math.floor(Math.random() * NODES.length);
        while (i1 === i2) i2 = Math.floor(Math.random() * NODES.length);

        const pos1 = seq.indexOf(i1);
        const pos2 = seq.indexOf(i2);

        // Ensure i1 occurs BEFORE i2 in the logic below just to simplify math
        const first = pos1 < pos2 ? i1 : i2;
        const second = pos1 < pos2 ? i2 : i1;
        const dist = Math.abs(pos1 - pos2);

        let hint = '';
        const types = ['relative', 'absolute', 'distance'];
        const type = types[Math.floor(Math.random() * types.length)];

        if (type === 'relative') {
            hint = `DATA: [${NODES[first]}] must instantiate BEFORE [${NODES[second]}]`;
        } else if (type === 'absolute') {
            const absTarget = Math.random() > 0.5 ? i1 : i2;
            const absPos = seq.indexOf(absTarget);
            if (absPos === 0) hint = `CRITICAL: The sequence inherently BEGINS with [${NODES[absTarget]}]`;
            else if (absPos === NODES.length - 1) hint = `CRITICAL: The sequence inherently ENDS with [${NODES[absTarget]}]`;
            else hint = `DATA: [${NODES[absTarget]}] is positioned at temporal index ${absPos + 1}`;
        } else if (type === 'distance') {
            if (dist === 1) {
                hint = `TRACE: [${NODES[i1]}] and [${NODES[i2]}] are directly BOUND (Adjacent)`;
            } else {
                hint = `TRACE: There are exacty ${dist - 1} node(s) fracturing [${NODES[first]}] and [${NODES[second]}]`;
            }
        }

        setHints(prev => {
            // Avoid duplicate hints
            if (prev.includes(hint)) return prev;
            // Keep max 5 hints
            return [hint, ...prev].slice(0, 5);
        });
    };

    const handleNodeClick = (id: number) => {
        if (gameState !== 'PLAYING' || loopingVisual) return;
        if (nodeStates[id] === true) return; // Ignore already solved nodes

        if (id === targetSequence[currentStep]) {
            // --- CORRECT MOVE ---
            audio.playClick();
            setNodeStates(prev => ({ ...prev, [id]: true }));
            setUserSequence(prev => [...prev, id]);
            setCurrentStep(s => s + 1);
            setScore(s => s + 200);

            // Zoom camera in slightly for tension
            setCameraPos(prev => [0, 0, Math.max(6, prev[2] - 1)]);

            // WIN CONDITION CHECK
            if (currentStep + 1 === NODES.length) {
                setGameState('SUCCESS');
                audio.playSystemMessage({ type: 'success' });
                const baseScore = 2000;
                const timeScore = Math.max(0, 1000 - (loops * 100));
                const penalty = paradoxLevel * 5;
                const finalScore = score + baseScore + timeScore - penalty;

                setTimeout(() => onComplete(finalScore, { loops, paradoxLevel }), 3500);
            }
        } else {
            // --- WRONG MOVE - TIMELINE FRACTURE ---
            audio.playError();
            setNodeStates(prev => ({ ...prev, [id]: false }));
            setGlitchActive(true);
            setScore(s => Math.max(0, s - 50));

            // Wait brief moment to show error before triggering loop sequence
            setTimeout(() => {
                setLoopingVisual(true);
                generateHint(targetSequence);

                // Execute the Time Loop Reset
                setTimeout(() => {
                    const paradoxIncrease = difficulty === 'Elite' ? 35 : 20;
                    setParadoxLevel(p => Math.min(100, p + paradoxIncrease));
                    setLoops(l => l + 1);
                    setCurrentStep(0);
                    setNodeStates({});
                    setUserSequence([]);
                    setCameraPos([0, 0, 12]); // Reset camera
                    setGlitchActive(false);
                    setLoopingVisual(false);
                    audio.playSystemMessage({ type: 'warning' });
                }, 1200);
            }, 600);
        }
    };

    // Monitor Fail Condition
    useEffect(() => {
        if (paradoxLevel >= 100 && gameState === 'PLAYING') {
            setGameState('FAILED');
            audio.playSystemMessage({ type: 'error' });
            setTimeout(() => onComplete(score, { loops, paradoxLevel, failed: true }), 3500);
        }
    }, [paradoxLevel, gameState, score]);

    // Calculate node orbital positions
    const positions = useMemo(() => {
        return NODES.map((_, i) => {
            const angle = (i / NODES.length) * Math.PI * 2 - Math.PI / 2;
            const radius = 4.5;
            return [Math.cos(angle) * radius, Math.sin(angle) * radius, 0] as [number, number, number];
        });
    }, []);

    // Draw lines between successfully connected nodes
    const ConnectedLines = () => {
        if (userSequence.length < 2) return null;

        const points = userSequence.map(id => new THREE.Vector3(...positions[id]));

        return (
            <Line
                points={points}
                color="#10b981"
                lineWidth={3}
                dashed={false}
                opacity={0.8}
                transparent
            />
        );
    };

    return (
        <div className="relative w-full h-[700px] rounded-3xl overflow-hidden border border-purple-500/20 bg-[#030008] font-sans select-none shadow-[0_0_80px_rgba(139,92,246,0.1)] flex flex-col">

            {/* Top Status Bar */}
            <div className="h-16 border-b border-purple-500/20 bg-black/40 backdrop-blur-md px-6 flex items-center justify-between z-20">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-purple-400">
                        <Clock className="w-5 h-5" />
                        <span className="font-bold tracking-[0.2em] text-sm uppercase">ChronoEngine v9</span>
                    </div>
                </div>

                {gameState === 'PLAYING' && (
                    <div className="flex items-center gap-8">
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Temporal Score</span>
                            <span className="text-xl font-mono text-white leading-none">{score.toLocaleString()}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Interactive Area */}
            <div className="flex-1 relative">

                {/* 3D Canvas Background & Interaction */}
                <div className="absolute inset-0 z-0 cursor-crosshair">
                    <Canvas camera={{ position: cameraPos, fov: 45 }}>
                        <ambientLight intensity={0.2} color="#8b5cf6" />
                        <pointLight position={[0, 0, 5]} intensity={1.5} color={paradoxLevel > 50 ? "#ef4444" : "#8b5cf6"} />
                        <pointLight position={[-5, 5, 0]} intensity={0.5} color="#3b82f6" />

                        {/* Infinite Grid Background */}
                        <TimelineGrid currentStep={currentStep} paradoxLevel={paradoxLevel} />

                        {/* Interactive Nodes */}
                        {gameState !== 'IDLE' && (
                            <group position={[0, 0, 0]}>
                                {NODES.map((label, i) => (
                                    <TimeNode
                                        key={i}
                                        id={i}
                                        label={label}
                                        position={positions[i]}
                                        isActive={currentStep > 0 && nodeStates[i] === null}
                                        isCorrect={nodeStates[i]}
                                        isNext={currentStep === 0 || (currentStep > 0 && nodeStates[i] === null)}
                                        onClick={() => handleNodeClick(i)}
                                    />
                                ))}

                                {/* Connecting Lines for correct sequences */}
                                <ConnectedLines />
                            </group>
                        )}

                        {/* Massive Central Energy Core */}
                        <Float factor={2} floatIntensity={1}>
                            <mesh position={[0, 0, -2]}>
                                <sphereGeometry args={[1.5, 32, 32]} />
                                <meshStandardMaterial
                                    color="#000000"
                                    emissive={paradoxLevel > 75 ? "#ff0000" : "#8b5cf6"}
                                    emissiveIntensity={loopingVisual ? 5 : paradoxLevel > 75 ? 2 : 0.5}
                                    wireframe={!loopingVisual}
                                    transparent
                                    opacity={0.8}
                                />
                            </mesh>
                        </Float>

                        {/* Ambient Particles */}
                        <Sparkles
                            count={loopingVisual ? 1000 : 300}
                            scale={20}
                            size={loopingVisual ? 4 : 1.5}
                            speed={loopingVisual ? 5 : 0.5}
                            color={paradoxLevel > 75 ? "#ef4444" : "#a78bfa"}
                            opacity={0.6}
                        />

                        {/* Post Processing Pipeline */}
                        <EffectComposer>
                            <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} intensity={2.0} mipmapBlur />
                            <ChromaticAberration
                                blendFunction={BlendFunction.NORMAL}
                                offset={new THREE.Vector2(loopingVisual ? 0.02 : 0.002, loopingVisual ? 0.02 : 0.002)}
                            />
                            {glitchActive && (
                                <Glitch delay={new THREE.Vector2(0, 0)} duration={new THREE.Vector2(0.1, 0.4)} mode={GlitchMode.SPORADIC} active ratio={0.9} />
                            )}
                            <Vignette darkness={0.6} eskil={false} offset={0.1} />
                            <Noise opacity={0.03} />
                        </EffectComposer>

                        {/* Controls restricted to slight pan to keep UI centered */}
                        <OrbitControls
                            enableZoom={false}
                            enablePan={false}
                            maxPolarAngle={Math.PI / 2 + 0.1}
                            minPolarAngle={Math.PI / 2 - 0.1}
                            maxAzimuthAngle={0.2}
                            minAzimuthAngle={-0.2}
                        />
                    </Canvas>
                </div>

                {/* Left Side UI Overlays */}
                {gameState !== 'IDLE' && (
                    <div className="absolute top-6 left-6 flex flex-col gap-4 z-10 pointer-events-none w-64">

                        {/* Loop Counter */}
                        <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-4 border border-purple-500/20 shadow-lg">
                            <div className="flex items-center justify-between mb-2 border-b border-purple-500/20 pb-2">
                                <div className="text-[10px] text-purple-400 uppercase tracking-widest font-bold flex items-center gap-2">
                                    <RotateCcw className={`w-3 h-3 ${loopingVisual ? 'animate-spin' : ''}`} />
                                    Iteration
                                </div>
                                <span className="text-2xl text-white font-mono font-bold leading-none">{loops}</span>
                            </div>
                            <div className="text-[10px] text-zinc-400 leading-tight">
                                Each failure fracture creates a new timeline loop. Multiple loops penalize final score.
                            </div>
                        </div>

                        {/* Paradox Meter (Risk) */}
                        <div className={`bg-black/40 backdrop-blur-xl rounded-2xl p-4 border shadow-lg transition-colors duration-500 ${paradoxLevel > 75 ? 'border-red-500/50 shadow-red-500/20' : 'border-purple-500/20'}`}>
                            <div className="text-[10px] text-zinc-400 mb-2 uppercase tracking-widest font-bold flex justify-between items-center">
                                <span className="flex items-center gap-2">
                                    <AlertTriangle className={`w-3 h-3 ${paradoxLevel > 75 ? 'text-red-500 animate-pulse' : 'text-purple-400'}`} />
                                    Paradox Risk
                                </span>
                                <span className={`font-mono ${paradoxLevel > 75 ? 'text-red-400' : 'text-white'}`}>{paradoxLevel}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden mb-2">
                                <div
                                    className={`h-full transition-all duration-1000 ${paradoxLevel > 75 ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-fuchsia-500'}`}
                                    style={{ width: `${paradoxLevel}%` }}
                                ></div>
                            </div>
                            {paradoxLevel > 75 && (
                                <div className="text-[9px] text-red-400 uppercase tracking-widest animate-pulse font-bold text-center">
                                    Critical Timeline Instability!
                                </div>
                            )}
                        </div>

                        {/* Progress Tracker */}
                        <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-4 border border-purple-500/20 shadow-lg mt-auto">
                            <div className="text-[10px] text-zinc-400 mb-3 uppercase tracking-widest font-bold">Sequence Locked</div>
                            <div className="flex gap-1.5">
                                {NODES.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`flex-1 h-8 rounded border flex items-center justify-center transition-colors ${i < currentStep
                                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                                : i === currentStep
                                                    ? 'bg-blue-500/20 border-blue-500 text-blue-400 animate-pulse'
                                                    : 'bg-zinc-900 border-zinc-800 text-zinc-700'
                                            }`}
                                    >
                                        <div className="text-xs font-mono">{i + 1}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                )}

                {/* Right Side UI Overlays - Decrypted Hints */}
                {gameState !== 'IDLE' && (
                    <div className="absolute top-6 right-6 z-10 pointer-events-none w-80">
                        <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-5 border border-blue-500/20 shadow-lg h-[400px] flex flex-col">
                            <div className="text-[10px] text-blue-400 uppercase tracking-widest font-bold flex items-center gap-2 mb-4 border-b border-blue-500/20 pb-3">
                                <Eye className="w-4 h-4" />
                                Decrypted Timeline Intel
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 space-y-3 flex flex-col-reverse justify-start">
                                {hints.length === 0 ? (
                                    <div className="my-auto text-center opacity-30">
                                        <Activity className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                                        <span className="text-xs text-zinc-400 font-mono italic">
                                            Awaiting data...<br />Fracturing the timeline (errors)<br />will extract new intel.
                                        </span>
                                    </div>
                                ) : (
                                    <AnimatePresence>
                                        {hints.map((hint, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, x: 20, height: 0 }}
                                                animate={{ opacity: 1, x: 0, height: 'auto' }}
                                                className="bg-blue-950/30 border border-blue-500/20 p-3 rounded-xl border-l-2 border-l-blue-500"
                                            >
                                                <div className="text-[9px] text-blue-300/50 mb-1 font-mono uppercase">Intel Fragment {hints.length - i}</div>
                                                <div className="text-xs text-blue-100 font-mono leading-relaxed">{hint}</div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                )}
                            </div>

                            <div className="mt-4 pt-3 border-t border-zinc-800 text-[9px] text-zinc-500 font-mono uppercase text-center">
                                Tip: Deduction implies elimination
                            </div>
                        </div>
                    </div>
                )}

                {/* Massive Full Screen Overlays for Game States */}
                <AnimatePresence>

                    {/* Intro Screen */}
                    {gameState === 'IDLE' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            transition={{ duration: 0.5 }}
                            className="absolute inset-0 z-50 flex items-center justify-center bg-[#030008]/90 backdrop-blur-md p-8 text-center"
                        >
                            <div className="max-w-2xl border border-purple-500/30 p-12 rounded-3xl bg-black/60 shadow-[0_0_100px_rgba(139,92,246,0.15)] relative overflow-hidden">

                                {/* Decorative background elements */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                                <div className="relative z-10 flex flex-col items-center">
                                    <div className="w-20 h-20 bg-purple-900/30 border border-purple-500/50 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                                        <RotateCcw className="w-10 h-10 text-purple-400" />
                                    </div>

                                    <h2 className="text-5xl font-black text-white mb-2 tracking-[0.2em] uppercase">
                                        Chrono<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Quest</span>
                                    </h2>
                                    <div className="text-purple-400 font-mono text-sm tracking-widest mb-8 uppercase">Temporal Sequencing Protocol</div>

                                    <div className="space-y-4 text-zinc-300 text-sm mb-10 text-left max-w-lg mx-auto bg-black/40 p-6 rounded-2xl border border-white/5">
                                        <p className="flex items-start gap-3">
                                            <span className="bg-purple-500/20 text-purple-400 p-1 rounded"><Activity className="w-4 h-4" /></span>
                                            <span>You are trapped within a collapsing temporal cascade. To stabilize reality, you must <strong className="text-white">sequence the 5 anchor nodes</strong> in exact chronological order.</span>
                                        </p>
                                        <p className="flex items-start gap-3">
                                            <span className="bg-blue-500/20 text-blue-400 p-1 rounded"><Eye className="w-4 h-4" /></span>
                                            <span>Incorrect selections will fracture the timeline, resetting your progress and increasing <strong className="text-red-400">Paradox Risk</strong>.</span>
                                        </p>
                                        <p className="flex items-start gap-3">
                                            <span className="bg-emerald-500/20 text-emerald-400 p-1 rounded"><Shield className="w-4 h-4" /></span>
                                            <span>Each fracture leaks decrypted <strong className="text-blue-400">Intel Fragments</strong> that provide deductive clues to the true sequence.</span>
                                        </p>
                                    </div>

                                    <button
                                        onClick={startGame}
                                        className="w-full max-w-sm py-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:shadow-[0_0_50px_rgba(139,92,246,0.5)] transform hover:-translate-y-1 flex items-center justify-center gap-3"
                                    >
                                        Initialize Protocol <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Time Rewind Visual */}
                    {loopingVisual && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none bg-blue-900/10 mix-blend-screen"
                        >
                            <div className="text-[120px] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400/30 to-purple-400/30 tracking-[0.5em] uppercase ml-[0.5em] blur-sm italic flex flex-col items-center">
                                <RotateCcw className="w-32 h-32 text-blue-400/20 animate-spin-fast mb-4" />
                                TEMPORAL RESET
                            </div>
                        </motion.div>
                    )}

                    {/* Success Screen */}
                    {gameState === 'SUCCESS' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute inset-0 z-50 flex items-center justify-center bg-emerald-950/90 backdrop-blur-xl border-[16px] border-emerald-900/50"
                        >
                            <div className="text-center bg-black/40 p-16 rounded-3xl border border-emerald-500/20 shadow-2xl backdrop-blur-md">
                                <div className="w-32 h-32 bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.3)]">
                                    <Shield className="w-16 h-16 text-emerald-400" />
                                </div>
                                <h2 className="text-5xl font-black text-white mb-2 tracking-[0.2em] uppercase drop-shadow-lg">Timeline Secured</h2>
                                <p className="text-emerald-300 text-sm font-mono tracking-widest uppercase mb-12">Temporal Cascade Averted</p>

                                <div className="grid grid-cols-3 gap-6 mb-12 text-left">
                                    <div className="bg-black/50 border border-emerald-500/20 p-4 rounded-xl">
                                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Iterations</div>
                                        <div className="text-2xl text-emerald-100 font-mono">{loops}</div>
                                    </div>
                                    <div className="bg-black/50 border border-emerald-500/20 p-4 rounded-xl">
                                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Final Risk</div>
                                        <div className="text-2xl text-emerald-100 font-mono">{paradoxLevel}%</div>
                                    </div>
                                    <div className="bg-black/50 border border-emerald-500/30 p-4 rounded-xl relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
                                        <div className="relative z-10">
                                            <div className="text-[10px] text-emerald-400 uppercase tracking-widest mb-1 font-bold">Total Score</div>
                                            <div className="text-3xl text-emerald-400 font-black font-mono">{score.toLocaleString()}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="inline-flex items-center gap-2 text-zinc-500 font-mono text-xs uppercase animate-pulse">
                                    <Activity className="w-3 h-3" /> Returning to Hub Database
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Failure Screen */}
                    {gameState === 'FAILED' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-950/95 backdrop-blur-xl border-[20px] border-red-900 shadow-[inset_0_0_200px_rgba(239,68,68,0.2)]"
                        >
                            <AlertTriangle className="w-32 h-32 text-red-500 mb-8 drop-shadow-[0_0_50px_rgba(239,68,68,0.8)] animate-pulse" />
                            <h2 className="text-7xl font-black text-white mb-4 tracking-[0.3em] uppercase drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]">Paradox</h2>
                            <p className="text-red-300 text-xl font-mono mb-12 opacity-90 uppercase tracking-[0.2em] bg-red-900/30 px-6 py-2 rounded-lg border border-red-500/30">
                                Maximum entropy reached. Reality collapsed.
                            </p>

                            <div className="bg-black/60 border border-red-500/30 px-12 py-6 rounded-2xl flex flex-col items-center">
                                <span className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Final Score</span>
                                <span className="text-4xl font-mono font-bold text-red-400">{score.toLocaleString()}</span>
                            </div>

                            <div className="w-full flex justify-center text-red-500 font-mono text-xs opacity-60 absolute bottom-12 tracking-widest pointer-events-none">
                                <span className="animate-pulse">SYSTEM FAILURE /// LOOP INTEGRITY: 0% /// FATAL ERROR: 0xDEADBEEF</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
};
