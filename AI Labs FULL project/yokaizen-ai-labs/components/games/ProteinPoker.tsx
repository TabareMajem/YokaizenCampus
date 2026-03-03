import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Cylinder, Text, Float, Line, Html } from '@react-three/drei';
import { EffectComposer, Bloom, DepthOfField, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { FlaskConical, Dna, Activity, Zap, CheckCircle2, ShieldAlert } from 'lucide-react';
import { audio } from '../../services/audioService';
import { motion, AnimatePresence } from 'framer-motion';

export interface ProteinPokerProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

// Nucleotides
type Base = 'A' | 'T' | 'C' | 'G';

const BASE_COLORS: Record<Base, string> = {
    'A': '#ef4444', // Red
    'T': '#eab308', // Yellow
    'C': '#3b82f6', // Blue
    'G': '#22c55e', // Green
};

const BASE_PAIRS: Record<Base, Base> = {
    'A': 'T',
    'T': 'A',
    'C': 'G',
    'G': 'C'
};

const TargetSequenceGenerator = (length: number): Base[] => {
    const bases: Base[] = ['A', 'T', 'C', 'G'];
    return Array.from({ length }, () => bases[Math.floor(Math.random() * bases.length)]);
};

// 3D DNA Strand Component
const DNAStrand = ({ sequence, activeIndex, isError }: { sequence: Base[], activeIndex: number, isError: boolean }) => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = state.clock.elapsedTime * 0.2;
            if (isError) {
                groupRef.current.position.x = Math.sin(state.clock.elapsedTime * 50) * 0.1;
            } else {
                groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, 0, 0.1);
            }
        }
    });

    return (
        <group ref={groupRef} position={[0, -2, 0]}>
            {sequence.map((base, i) => {
                const y = i * 0.8;
                const angle = i * 0.5;
                const radius = 1.5;
                const x1 = Math.cos(angle) * radius;
                const z1 = Math.sin(angle) * radius;

                const targetBase = BASE_PAIRS[base];

                // Show paired half if we've passed this index
                const isPaired = i < activeIndex;
                const isActive = i === activeIndex;

                return (
                    <group key={i} position={[0, y, 0]}>
                        {/* Backbone 1 */}
                        <Sphere args={[0.2, 16, 16]} position={[x1, 0, z1]}>
                            <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
                        </Sphere>

                        {/* Base 1 (The target sequence we are matching against) */}
                        <Cylinder args={[0.05, 0.05, radius]} position={[x1 / 2, 0, z1 / 2]} rotation={[0, -angle, Math.PI / 2]}>
                            <meshStandardMaterial color={BASE_COLORS[base]} emissive={BASE_COLORS[base]} emissiveIntensity={isActive ? 1 : 0.2} />
                        </Cylinder>

                        {/* Backbone 2 */}
                        <Sphere args={[0.2, 16, 16]} position={[-x1, 0, -z1]}>
                            <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
                        </Sphere>

                        {/* Base 2 (The user's paired sequence) */}
                        <Cylinder args={[0.05, 0.05, radius]} position={[-x1 / 2, 0, -z1 / 2]} rotation={[0, -angle, Math.PI / 2]}>
                            <meshStandardMaterial
                                color={isPaired ? BASE_COLORS[targetBase] : '#1e293b'}
                                emissive={isPaired ? BASE_COLORS[targetBase] : '#000000'}
                                emissiveIntensity={isPaired ? 1 : 0}
                                transparent opacity={isPaired ? 1 : 0.2}
                            />
                        </Cylinder>

                        {/* Active Indicator Ring */}
                        {isActive && (
                            <mesh rotation={[Math.PI / 2, 0, 0]}>
                                <ringGeometry args={[radius * 1.2, radius * 1.3, 32]} />
                                <meshBasicMaterial color="#ffffff" transparent opacity={0.5} side={THREE.DoubleSide} />
                            </mesh>
                        )}

                        {/* Labels for clarity in 3D */}
                        <Html position={[x1 * 1.5, 0, z1 * 1.5]} center zIndexRange={[100, 0]} className="pointer-events-none">
                            <div className={`text-xs font-bold font-mono px-1 py-0.5 rounded bg-black/50 border border-white/20 text-white ${isActive ? 'scale-150 shadow-[0_0_10px_#fff]' : 'opacity-50'} transition-transform`}>
                                {base}
                            </div>
                        </Html>
                    </group>
                );
            })}
        </group>
    );
};


export const ProteinPoker: React.FC<ProteinPokerProps> = ({ onComplete, difficulty, t }) => {
    const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'SUCCESS' | 'FAILED'>('IDLE');
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [sequenceCount, setSequenceCount] = useState(0);

    // Core Game State
    const [targetSequence, setTargetSequence] = useState<Base[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);

    // Hand State (The "Cards")
    const [hand, setHand] = useState<Base[]>([]);

    const [isError, setIsError] = useState(false);

    const SEQUENCE_LENGTH = difficulty === 'Elite' ? 8 : 6;
    const TOTAL_SEQUENCES_NEEDED = 3;

    const generateHand = () => {
        const bases: Base[] = ['A', 'T', 'C', 'G'];
        // Ensure at least one needed card is usually present, but keep it mostly random
        return Array.from({ length: 5 }, () => bases[Math.floor(Math.random() * bases.length)]);
    };

    const startNewSequence = () => {
        setTargetSequence(TargetSequenceGenerator(SEQUENCE_LENGTH));
        setActiveIndex(0);
        setHand(generateHand());
        audio.playSystemMessage({ type: 'success' });
    };

    const startGame = () => {
        setScore(0);
        setTimeLeft(difficulty === 'Elite' ? 45 : 60);
        setSequenceCount(0);
        setGameState('PLAYING');
        startNewSequence();
    };

    const handleCardPlay = (playedBase: Base, handIndex: number) => {
        if (gameState !== 'PLAYING') return;

        const currentTarget = targetSequence[activeIndex];
        const requiredPair = BASE_PAIRS[currentTarget];

        if (playedBase === requiredPair) {
            // Correct Play!
            audio.playClick();
            setScore(s => s + 100);

            // Remove card from hand and draw a new one
            const newHand = [...hand];
            const bases: Base[] = ['A', 'T', 'C', 'G'];
            newHand[handIndex] = bases[Math.floor(Math.random() * bases.length)];
            setHand(newHand);

            const nextIndex = activeIndex + 1;
            setActiveIndex(nextIndex);

            if (nextIndex >= targetSequence.length) {
                // Completed Sequence
                audio.playSystemMessage({ type: 'success' });
                setScore(s => s + 500);
                const nextSeqCount = sequenceCount + 1;
                setSequenceCount(nextSeqCount);

                if (nextSeqCount >= TOTAL_SEQUENCES_NEEDED) {
                    setGameState('SUCCESS');
                    setTimeout(() => onComplete(score + 500 + (timeLeft * 10), { sequencesCompleted: nextSeqCount }), 3000);
                } else {
                    setTimeout(startNewSequence, 1000); // Brief pause before next
                }
            }

        } else {
            // Incorrect Play!
            audio.playError();
            setScore(s => Math.max(0, s - 50));
            setIsError(true);
            setTimeout(() => setIsError(false), 500);

            // Still replace the card to prevent soft-locks
            const newHand = [...hand];
            const bases: Base[] = ['A', 'T', 'C', 'G'];
            newHand[handIndex] = bases[Math.floor(Math.random() * bases.length)];
            setHand(newHand);
        }
    };


    // Timer Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const timer = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    setGameState('FAILED');
                    setTimeout(() => onComplete(score, { sequencesCompleted: sequenceCount }), 3000);
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, score, sequenceCount, onComplete]);


    return (
        <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border border-emerald-500/20 bg-zinc-950 font-sans select-none shadow-[0_0_60px_rgba(16,185,129,0.1)]">

            {/* 3D Canvas */}
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 2, 8], fov: 45 }}>
                    <ambientLight intensity={0.5} color="#ffffff" />
                    <pointLight position={[5, 10, 5]} intensity={1} color="#10b981" />
                    <pointLight position={[-5, -10, -5]} intensity={0.5} color="#3b82f6" />

                    {gameState !== 'IDLE' && (
                        <DNAStrand sequence={targetSequence} activeIndex={activeIndex} isError={isError} />
                    )}

                    <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} maxPolarAngle={Math.PI / 2 + 0.2} minPolarAngle={Math.PI / 2 - 0.2} />

                    <EffectComposer>
                        <DepthOfField focusDistance={0} focalLength={0.02} bokehScale={2} height={480} />
                        <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} />
                        <Vignette eskil={false} offset={0.1} darkness={1.1} />
                    </EffectComposer>
                </Canvas>
            </div>

            {/* UI HUD Overlay */}
            {gameState !== 'IDLE' && (
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between p-6 z-10">

                    {/* Top HUD */}
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-4">
                            <div className="bg-black/60 backdrop-blur-xl rounded-xl p-4 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)] pointer-events-auto">
                                <div className="text-[10px] text-emerald-400 mb-1 uppercase tracking-[0.2em] font-bold flex items-center gap-2">
                                    <FlaskConical className="w-4 h-4" /> Synthesis Progress
                                </div>
                                <div className="text-3xl text-white font-mono">{sequenceCount} / {TOTAL_SEQUENCES_NEEDED}</div>
                            </div>

                            {/* Sequence Hint */}
                            <div className="bg-black/60 backdrop-blur-xl rounded-xl p-3 border border-zinc-800 flex flex-col items-start gap-1">
                                <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Target Base</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-bold font-mono" style={{ color: BASE_COLORS[targetSequence[activeIndex]] || '#fff' }}>{targetSequence[activeIndex] || '-'}</span>
                                    <span className="text-zinc-500 text-sm">needs</span>
                                    <span className="text-xl font-bold font-mono" style={{ color: BASE_COLORS[BASE_PAIRS[targetSequence[activeIndex]]] || '#fff' }}>{BASE_PAIRS[targetSequence[activeIndex]] || '-'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-4 pointer-events-auto">
                            <div className="bg-black/60 backdrop-blur-xl rounded-xl p-4 border border-blue-500/30 flex flex-col items-end shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                                <div className="flex items-center gap-2 text-blue-400 mb-1">
                                    <Zap className="w-4 h-4" />
                                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Time Limit</span>
                                </div>
                                <div className={`text-4xl font-mono ${timeLeft <= 15 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timeLeft}s</div>
                            </div>

                            <div className="bg-black/60 backdrop-blur-xl rounded-xl p-3 border border-zinc-800 flex flex-col items-end min-w-[120px]">
                                <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-1">Research Points</span>
                                <span className="text-2xl text-white font-mono text-emerald-400">{score}</span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom HUD: The Hand */}
                    <div className="w-full flex justify-center mb-4 pointer-events-auto">
                        <div className="bg-black/80 backdrop-blur-xl rounded-2xl p-4 border border-zinc-700 shadow-2xl flex gap-4">
                            {hand.map((cardBase, idx) => (
                                <motion.button
                                    key={`${idx}-${cardBase}`}
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    whileHover={{ y: -10, scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleCardPlay(cardBase, idx)}
                                    className="w-16 h-24 rounded-lg flex flex-col items-center justify-center cursor-pointer border-2 transition-colors relative overflow-hidden"
                                    style={{
                                        borderColor: BASE_COLORS[cardBase],
                                        backgroundColor: `${BASE_COLORS[cardBase]}20` // 20% opacity hex
                                    }}
                                >
                                    <div className="text-4xl font-bold font-mono" style={{ color: BASE_COLORS[cardBase] }}>
                                        {cardBase}
                                    </div>
                                    <div className="absolute inset-x-0 bottom-2 text-center text-[8px] text-white/50 uppercase tracking-widest font-bold">
                                        Extract
                                    </div>
                                    {/* Glossy overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                                </motion.button>
                            ))}
                        </div>
                    </div>

                </div>
            )}

            {/* Overlays */}
            <AnimatePresence>
                {gameState === 'IDLE' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/90 p-8 text-center backdrop-blur-md">
                        <div className="max-w-md border border-emerald-500/30 p-8 rounded-2xl bg-zinc-900 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                            <Dna className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
                            <h2 className="text-3xl font-bold text-white mb-4 tracking-widest uppercase">Protein Poker</h2>
                            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                                Sequence the genome before the destabilization cascade.<br /><br />
                                <span className="text-white font-bold">A pairs with T</span><br />
                                <span className="text-white font-bold">C pairs with G</span><br /><br />
                                Play cards from your hand to match the target sequence. Complete {TOTAL_SEQUENCES_NEEDED} strands to synthesize the cure.
                            </p>
                            <button onClick={startGame} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-widest rounded-lg transition-colors shadow-lg">
                                Begin Synthesis
                            </button>
                        </div>
                    </motion.div>
                )}

                {gameState === 'SUCCESS' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-emerald-950/90 backdrop-blur-lg">
                        <CheckCircle2 className="w-24 h-24 text-emerald-400 mb-6 drop-shadow-[0_0_30px_rgba(52,211,153,0.5)]" />
                        <h2 className="text-5xl font-black text-white mb-4 tracking-widest uppercase">Synthesis Complete</h2>
                        <p className="text-emerald-200 text-xl font-mono mb-8">Genome Stabilized.</p>
                        <div className="text-white text-3xl font-bold bg-black/50 px-8 py-4 rounded-xl border border-emerald-500/30">
                            Research Score: {score}
                        </div>
                    </motion.div>
                )}

                {gameState === 'FAILED' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-950/90 backdrop-blur-lg">
                        <ShieldAlert className="w-24 h-24 text-red-500 mb-6 drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]" />
                        <h2 className="text-6xl font-black text-red-500 mb-4 tracking-widest uppercase">Cascade Failure</h2>
                        <p className="text-red-200 text-xl font-mono mb-8 opacity-80 uppercase tracking-widest">Synthesis aborted due to instability.</p>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};
