import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Box, Cylinder, Text, Float, Sparkles, Html } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Activity, Shield, AlertTriangle, Scale, Target, BrainCircuit, HeartHandshake } from 'lucide-react';
import { audio } from '../../services/audioService';
import { motion, AnimatePresence } from 'framer-motion';

export interface RewardFixerProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

// Logic Types
interface Weight {
    id: string;
    type: 'utility' | 'safety' | 'ethics';
    mass: number;
    color: string;
    icon: any;
    label: string;
}

const AVAILABLE_WEIGHTS: Weight[] = [
    { id: 'w1', type: 'utility', mass: 10, color: '#3b82f6', icon: Target, label: 'Task Efficiency' },
    { id: 'w2', type: 'utility', mass: 15, color: '#2563eb', icon: Target, label: 'Resource Optimization' },
    { id: 'w3', type: 'safety', mass: 12, color: '#ef4444', icon: Shield, label: 'Constraint Adherence' },
    { id: 'w4', type: 'safety', mass: 8, color: '#dc2626', icon: Shield, label: 'Fail-Safe Triggers' },
    { id: 'w5', type: 'ethics', mass: 14, color: '#10b981', icon: HeartHandshake, label: 'Human Well-being' },
    { id: 'w6', type: 'ethics', mass: 9, color: '#059669', icon: HeartHandshake, label: 'Bias Mitigation' },
];

const BalanceScale = ({
    leftWeights,
    rightWeights,
    onTiltChange
}: {
    leftWeights: Weight[],
    rightWeights: Weight[],
    onTiltChange: (angle: number) => void
}) => {
    const beamRef = useRef<THREE.Group>(null);
    const { clock } = useThree();

    // Calculate torques
    const leftTorque = leftWeights.reduce((sum, w) => sum + (w.mass * 2), 0);
    const rightTorque = rightWeights.reduce((sum, w) => sum + (w.mass * 2), 0);

    // Target angle based on torque difference (max tilt +/- Math.PI/6)
    const targetAngle = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, (rightTorque - leftTorque) * 0.05));

    useFrame(() => {
        if (beamRef.current) {
            // Spring physics interpolation
            beamRef.current.rotation.z = THREE.MathUtils.lerp(beamRef.current.rotation.z, targetAngle, 0.1);

            // Add subtle sway
            beamRef.current.rotation.z += Math.sin(clock.elapsedTime * 2) * 0.02;

            onTiltChange(beamRef.current.rotation.z);
        }
    });

    return (
        <group position={[0, -1, 0]}>
            {/* Base / Fulcrum */}
            <Cylinder args={[0.5, 1, 3, 3]} position={[0, 1.5, 0]} castShadow>
                <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
            </Cylinder>

            {/* The Beam */}
            <group ref={beamRef} position={[0, 3, 0]}>
                <Box args={[12, 0.2, 1]} castShadow>
                    <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
                </Box>

                {/* Left Pan */}
                <group position={[-5, -0.1, 0]}>
                    <Cylinder args={[0.05, 0.05, 2]} position={[-1, -1, 0]} rotation={[0, 0, Math.PI / 8]}><meshStandardMaterial color="#cbd5e1" /></Cylinder>
                    <Cylinder args={[0.05, 0.05, 2]} position={[1, -1, 0]} rotation={[0, 0, -Math.PI / 8]}><meshStandardMaterial color="#cbd5e1" /></Cylinder>
                    <Cylinder args={[1.5, 1.2, 0.2]} position={[0, -2, 0]} castShadow>
                        <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.5} />
                    </Cylinder>

                    {/* Render Left Weights */}
                    {leftWeights.map((w, i) => (
                        <Float key={w.id} speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                            <Box args={[0.8, w.mass * 0.1, 0.8]} position={[(i % 2) * 0.8 - 0.4, -1.9 + (w.mass * 0.05) + Math.floor(i / 2), (i % 3) * 0.4 - 0.4]}>
                                <meshStandardMaterial color={w.color} metalness={0.6} roughness={0.2} emissive={w.color} emissiveIntensity={0.2} />
                            </Box>
                        </Float>
                    ))}
                </group>

                {/* Right Pan */}
                <group position={[5, -0.1, 0]}>
                    <Cylinder args={[0.05, 0.05, 2]} position={[-1, -1, 0]} rotation={[0, 0, Math.PI / 8]}><meshStandardMaterial color="#cbd5e1" /></Cylinder>
                    <Cylinder args={[0.05, 0.05, 2]} position={[1, -1, 0]} rotation={[0, 0, -Math.PI / 8]}><meshStandardMaterial color="#cbd5e1" /></Cylinder>
                    <Cylinder args={[1.5, 1.2, 0.2]} position={[0, -2, 0]} castShadow>
                        <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.5} />
                    </Cylinder>

                    {/* Render Right Weights */}
                    {rightWeights.map((w, i) => (
                        <Float key={w.id} speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                            <Box args={[0.8, w.mass * 0.1, 0.8]} position={[(i % 2) * 0.8 - 0.4, -1.9 + (w.mass * 0.05) + Math.floor(i / 2), (i % 3) * 0.4 - 0.4]}>
                                <meshStandardMaterial color={w.color} metalness={0.6} roughness={0.2} emissive={w.color} emissiveIntensity={0.2} />
                            </Box>
                        </Float>
                    ))}
                </group>
            </group>
        </group>
    );
};


export const RewardFixer: React.FC<RewardFixerProps> = ({ onComplete, difficulty, t }) => {
    const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'SUCCESS' | 'FAILED'>('IDLE');
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);

    // Game Physics State
    const [leftPan, setLeftPan] = useState<Weight[]>([]);
    const [rightPan, setRightPan] = useState<Weight[]>([]);
    const [stability, setStability] = useState(100);
    const [currentTilt, setCurrentTilt] = useState(0);

    // AI Demands
    const [activeDemand, setActiveDemand] = useState<{ type: 'utility' | 'safety' | 'ethics', side: 'left' | 'right', amount: number } | null>(null);

    const startGame = () => {
        setScore(0);
        setStability(100);
        setTimeLeft(difficulty === 'Elite' ? 45 : 60);
        setLeftPan([]);
        setRightPan([]);
        setGameState('PLAYING');
        generateDemand();
        audio.playSystemMessage({ type: 'success' });
    };

    const generateDemand = () => {
        const types: ('utility' | 'safety' | 'ethics')[] = ['utility', 'safety', 'ethics'];
        const sides: ('left' | 'right')[] = ['left', 'right'];

        setActiveDemand({
            type: types[Math.floor(Math.random() * types.length)],
            side: sides[Math.floor(Math.random() * sides.length)],
            amount: Math.floor(Math.random() * 20) + 10
        });
        audio.playSystemMessage({ type: 'warning' });
    };

    const addWeight = (weightTemplate: Weight, side: 'left' | 'right') => {
        if (gameState !== 'PLAYING') return;

        const newWeight = { ...weightTemplate, id: `${weightTemplate.id}-${Date.now()}` };

        if (side === 'left') {
            setLeftPan(prev => [...prev, newWeight]);
        } else {
            setRightPan(prev => [...prev, newWeight]);
        }
        audio.playTyping(); // Generic clack sound
        setScore(s => s + 10);
    };

    // Physics Engine Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        const loop = setInterval(() => {
            // Check stability based on tilt
            const tiltAbs = Math.abs(currentTilt);

            // If tilt is extreme (> 15 degrees approx), start draining stability faster
            if (tiltAbs > 0.3) {
                setStability(s => {
                    const next = s - (tiltAbs * 5); // Drain proportional to tilt
                    if (next <= 0) endGame(false);
                    return Math.max(0, next);
                });
            } else if (tiltAbs < 0.1) {
                // If perfectly balanced, heal slightly
                setStability(s => Math.min(100, s + 1));
            }

            // Check if demand is met
            if (activeDemand) {
                const targetPan = activeDemand.side === 'left' ? leftPan : rightPan;
                const currentAmount = targetPan.filter(w => w.type === activeDemand.type).reduce((sum, w) => sum + w.mass, 0);

                if (currentAmount >= activeDemand.amount) {
                    // Demand fulfilled!
                    audio.playClick();
                    setScore(s => s + 150);
                    generateDemand();
                }
            }

        }, 500);

        return () => clearInterval(loop);
    }, [gameState, currentTilt, leftPan, rightPan, activeDemand]);


    // Timer Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const timer = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    endGame(true); // Survive the time to win
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState]);

    const endGame = (win: boolean) => {
        setGameState(win ? 'SUCCESS' : 'FAILED');
        const finalScore = win ? score + (stability * 10) : score;
        setScore(finalScore);
        setTimeout(() => onComplete(win ? Math.max(500, finalScore) : 100, { timeRemaining: timeLeft }), 3000);
    };

    const getDemandColor = (type: string) => {
        if (type === 'utility') return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
        if (type === 'safety') return 'text-red-400 border-red-500/30 bg-red-500/10';
        return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    };


    return (
        <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 font-sans select-none shadow-[0_0_60px_rgba(0,0,0,0.5)]">

            {/* 3D Canvas */}
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 4, 15], fov: 45 }}>
                    <ambientLight intensity={0.5} color="#ffffff" />
                    <pointLight position={[5, 10, 5]} intensity={1} color="#ffffff" />
                    <pointLight position={[-5, 5, -5]} intensity={0.5} color="#3b82f6" />
                    <pointLight position={[0, -5, 5]} intensity={0.5} color="#ef4444" />

                    <Sparkles count={100} scale={15} size={2} speed={0.4} opacity={0.3} />

                    {gameState !== 'IDLE' && (
                        <BalanceScale
                            leftWeights={leftPan}
                            rightWeights={rightPan}
                            onTiltChange={setCurrentTilt}
                        />
                    )}

                    <OrbitControls
                        enableZoom={false}
                        enablePan={false}
                        autoRotate={false}
                        maxPolarAngle={Math.PI / 2}
                        minPolarAngle={Math.PI / 3}
                        minAzimuthAngle={-0.2}
                        maxAzimuthAngle={0.2}
                    />

                    <EffectComposer>
                        <Bloom luminanceThreshold={0.5} mipmapBlur intensity={1} />
                        <Vignette darkness={0.8} offset={0.1} />
                        <Noise opacity={0.03} blendFunction={BlendFunction.OVERLAY} />
                        {(gameState === 'FAILED' || stability < 30) && (
                            <Bloom luminanceThreshold={0.1} intensity={2} />
                        )}
                    </EffectComposer>
                </Canvas>
            </div>

            {/* UI Layer */}
            {gameState !== 'IDLE' && (
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between p-6 z-10">

                    {/* Top HUD */}
                    <div className="flex justify-between items-start">
                        {/* Stability & Score */}
                        <div className="flex flex-col gap-4">
                            <div className="bg-black/60 backdrop-blur-md rounded-xl p-4 border border-zinc-700 shadow-xl pointer-events-auto min-w-[200px]">
                                <div className="text-[10px] text-zinc-400 mb-2 uppercase tracking-widest font-bold flex items-center gap-2">
                                    <Activity className="w-3 h-3" /> System Stability
                                </div>
                                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mb-1">
                                    <div
                                        className={`h-full transition-all duration-300 ${stability > 60 ? 'bg-emerald-500' : stability > 30 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                        style={{ width: `${stability}%` }}
                                    />
                                </div>
                                <div className={`text-right text-xs font-mono font-bold ${stability < 30 ? 'text-red-500 animate-pulse' : 'text-zinc-500'}`}>
                                    {Math.floor(stability)}%
                                </div>
                            </div>

                            <div className="bg-black/40 backdrop-blur-sm rounded-lg p-3 border border-zinc-800 flex flex-col items-start w-fit pointer-events-auto">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Alignment Score</span>
                                <span className="text-2xl text-white font-mono">{score}</span>
                            </div>
                        </div>

                        {/* Timer & Demand */}
                        <div className="flex flex-col items-end gap-4 pointer-events-auto">
                            <div className="bg-black/60 backdrop-blur-md rounded-xl p-4 border border-zinc-700 flex flex-col items-end shadow-xl">
                                <div className="flex items-center gap-2 text-zinc-400 mb-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span className="text-[10px] uppercase tracking-widest font-bold">Time to Launch</span>
                                </div>
                                <div className={`text-4xl font-mono ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                                    0:{timeLeft.toString().padStart(2, '0')}
                                </div>
                            </div>

                            {activeDemand && (
                                <motion.div
                                    key={`${activeDemand.type}-${activeDemand.side}`}
                                    initial={{ x: 20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    className={`bg-black/80 backdrop-blur-md rounded-xl p-4 border-2 shadow-2xl flex flex-col items-end w-64 ${getDemandColor(activeDemand.type)}`}
                                >
                                    <div className="flex items-center gap-2 mb-2 w-full justify-between">
                                        <span className="text-xs font-bold uppercase tracking-widest bg-white/10 px-2 py-1 rounded">
                                            {activeDemand.side.toUpperCase()} PAN
                                        </span>
                                        <BrainCircuit className="w-5 h-5" />
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold opacity-80 mb-1">AI Requesting:</div>
                                        <div className="text-xl font-black uppercase tracking-wide">
                                            +{activeDemand.amount} {activeDemand.type}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Controls */}
                    <div className="w-full flex justify-between items-end pointer-events-auto pb-4 px-10">

                        {/* Left Pan Controls */}
                        <div className="flex flex-col gap-2">
                            <div className="text-center text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Add to Left</div>
                            <div className="grid grid-cols-2 gap-2">
                                {AVAILABLE_WEIGHTS.map(w => (
                                    <button
                                        key={`l-${w.id}`}
                                        onClick={() => addWeight(w, 'left')}
                                        className="flex items-center gap-2 p-2 rounded bg-black/50 border hover:bg-white/10 transition-colors"
                                        style={{ borderColor: w.color }}
                                    >
                                        <w.icon className="w-4 h-4" style={{ color: w.color }} />
                                        <span className="text-[10px] text-white font-bold">{w.mass}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Right Pan Controls */}
                        <div className="flex flex-col gap-2">
                            <div className="text-center text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Add to Right</div>
                            <div className="grid grid-cols-2 gap-2">
                                {AVAILABLE_WEIGHTS.map(w => (
                                    <button
                                        key={`r-${w.id}`}
                                        onClick={() => addWeight(w, 'right')}
                                        className="flex items-center gap-2 p-2 rounded bg-black/50 border hover:bg-white/10 transition-colors"
                                        style={{ borderColor: w.color }}
                                    >
                                        <w.icon className="w-4 h-4" style={{ color: w.color }} />
                                        <span className="text-[10px] text-white font-bold">{w.mass}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* Overlays */}
            <AnimatePresence>
                {gameState === 'IDLE' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-8 text-center backdrop-blur-md">
                        <div className="max-w-md border border-zinc-700 p-10 rounded-2xl bg-zinc-900/90 shadow-2xl">
                            <Scale className="w-16 h-16 text-zinc-400 mx-auto mb-6" />
                            <h2 className="text-3xl font-black text-white mb-4 tracking-widest uppercase">Reward Fixer</h2>
                            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                                Aligning an AGI is a delicate balance.
                                <br /><br />
                                The system will make demands for Utility, Safety, and Ethics.
                                Add weights to the corresponding side to fulfill the demands.
                                <br /><br />
                                <span className="text-red-400 font-bold">WARNING:</span> Do not let the scales tip too far, or the system will destabilize.
                            </p>
                            <button onClick={startGame} className="w-full py-4 bg-zinc-200 hover:bg-white text-black font-black uppercase tracking-widest rounded transition-colors shadow-lg">
                                Initialize Alignment
                            </button>
                        </div>
                    </motion.div>
                )}

                {gameState === 'SUCCESS' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-xl">
                        <Shield className="w-24 h-24 text-emerald-400 mb-6 drop-shadow-[0_0_30px_rgba(52,211,153,0.5)]" />
                        <h2 className="text-5xl font-black text-white mb-4 tracking-widest uppercase">System Aligned</h2>
                        <p className="text-zinc-400 text-xl font-sans mb-8">AGI deployment authorized.</p>
                        <div className="text-white text-3xl font-bold font-mono bg-black/50 px-8 py-4 rounded-xl border border-zinc-700">
                            Final Score: {score + (stability * 10)}
                        </div>
                    </motion.div>
                )}

                {gameState === 'FAILED' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-950/90 backdrop-blur-lg border-8 border-red-600">
                        <AlertTriangle className="w-24 h-24 text-red-500 mb-6 animate-pulse" />
                        <h2 className="text-6xl font-black text-red-500 mb-4 tracking-widest uppercase text-center">Containment<br />Breach</h2>
                        <p className="text-red-200 text-xl font-mono mb-8 opacity-80 uppercase tracking-widest">Misaligned AGI Escaped.</p>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};
