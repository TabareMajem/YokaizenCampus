import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Sparkles, Sphere, Extrude, TorusKnot } from '@react-three/drei';
import { EffectComposer, Bloom, DepthOfField, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Sprout, Beaker, Dna, Info, ShieldAlert, FlaskConical, Atom } from 'lucide-react';
import { audio } from '../../services/audioService';
import { motion, AnimatePresence } from 'framer-motion';

export interface XenofloraProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

// Genetic Traits
type ColorGene = 'Red' | 'Blue' | 'Green' | 'Purple' | 'Gold';
type ShapeGene = 'Orb' | 'Spike' | 'Helix' | 'Fungus';
type Bioluminescence = 'None' | 'Low' | 'High';

interface PlantDNA {
    color: ColorGene;
    shape: ShapeGene;
    glow: Bioluminescence;
    toxicity: number; // 0-100
    hardiness: number; // 0-100
}

interface TargetSpec {
    color?: ColorGene;
    shape?: ShapeGene;
    minGlow?: Bioluminescence;
    maxToxicity: number;
    minHardiness: number;
}

const COLOR_MAP: Record<ColorGene, string> = {
    'Red': '#ef4444',
    'Blue': '#3b82f6',
    'Green': '#22c55e',
    'Purple': '#a855f7',
    'Gold': '#eab308'
};

const GLOW_INTENSITY: Record<Bioluminescence, number> = {
    'None': 0,
    'Low': 0.5,
    'High': 2.0
};

// Procedural 3D Plant Component based on DNA
const XenoPlant = ({ dna, isTarget = false }: { dna: PlantDNA, isTarget?: boolean }) => {
    const groupRef = useRef<THREE.Group>(null);
    const materialColor = isTarget ? '#ffffff' : COLOR_MAP[dna.color];
    const emissiveColor = isTarget ? (dna.glow !== 'None' ? '#aaddff' : '#000000') : COLOR_MAP[dna.color];
    const emissiveIntensity = isTarget ? GLOW_INTENSITY[dna.glow] * 0.5 : GLOW_INTENSITY[dna.glow];

    useFrame((state) => {
        if (groupRef.current) {
            // Gentle breathing animation based on hardiness
            const breathSpeed = 1 + (dna.hardiness / 100);
            groupRef.current.position.y = Math.sin(state.clock.elapsedTime * breathSpeed) * 0.1;
            groupRef.current.rotation.y += 0.005;
        }
    });

    return (
        <group ref={groupRef} scale={isTarget ? 0.6 : 1.2}>
            {/* Core Shape based on Gene */}
            {dna.shape === 'Orb' && (
                <Sphere args={[1, 32, 32]}>
                    <meshStandardMaterial
                        color={materialColor}
                        emissive={emissiveColor}
                        emissiveIntensity={emissiveIntensity}
                        roughness={0.2}
                        metalness={0.3}
                        wireframe={isTarget}
                    />
                </Sphere>
            )}

            {dna.shape === 'Spike' && (
                <mesh position={[0, 0.5, 0]}>
                    <coneGeometry args={[0.8, 2, 8]} />
                    <meshStandardMaterial
                        color={materialColor}
                        emissive={emissiveColor}
                        emissiveIntensity={emissiveIntensity}
                        roughness={0.5}
                        metalness={0.8}
                        wireframe={isTarget}
                    />
                </mesh>
            )}

            {dna.shape === 'Helix' && (
                <TorusKnot args={[0.6, 0.2, 100, 16]}>
                    <meshStandardMaterial
                        color={materialColor}
                        emissive={emissiveColor}
                        emissiveIntensity={emissiveIntensity}
                        roughness={0.1}
                        clearcoat={1}
                        wireframe={isTarget}
                    />
                </TorusKnot>
            )}

            {dna.shape === 'Fungus' && (
                <group>
                    <mesh position={[0, -0.5, 0]}>
                        <cylinderGeometry args={[0.2, 0.3, 1, 16]} />
                        <meshStandardMaterial color="#888888" wireframe={isTarget} />
                    </mesh>
                    <mesh position={[0, 0, 0]}>
                        <sphereGeometry args={[1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                        <meshStandardMaterial
                            color={materialColor}
                            emissive={emissiveColor}
                            emissiveIntensity={emissiveIntensity}
                            roughness={0.9}
                            wireframe={isTarget}
                        />
                    </mesh>
                </group>
            )}

            {/* Toxic Particles */}
            {!isTarget && dna.toxicity > 50 && (
                <Sparkles
                    count={Math.floor(dna.toxicity)}
                    scale={2.5}
                    size={2}
                    speed={0.5}
                    opacity={0.6}
                    color="#bef264"
                />
            )}

            {/* Bioluminescent Spores */}
            {!isTarget && dna.glow !== 'None' && (
                <Sparkles
                    count={40}
                    scale={3}
                    size={1}
                    speed={2}
                    opacity={0.8}
                    color={COLOR_MAP[dna.color]}
                />
            )}
        </group>
    );
};

export const Xenoflora: React.FC<XenofloraProps> = ({ onComplete, difficulty, t }) => {
    const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'SUCCESS' | 'FAILED'>('IDLE');
    const [score, setScore] = useState(0);
    const [mutagens, setMutagens] = useState(10); // Limited currency to make changes

    // Lab Status
    const [cycle, setCycle] = useState(1);
    const MAX_CYCLES = difficulty === 'Elite' ? 10 : 15;

    // The Current Plant in the lab
    const [currentDNA, setCurrentDNA] = useState<PlantDNA>({
        color: 'Green', shape: 'Fungus', glow: 'None', toxicity: 80, hardiness: 20
    });

    // The Target Specification from the client
    const [targetSpec, setTargetSpec] = useState<TargetSpec>({
        color: 'Blue', shape: 'Helix', minGlow: 'Low', maxToxicity: 30, minHardiness: 80
    });

    const generateNewTarget = () => {
        const colors: ColorGene[] = ['Red', 'Blue', 'Green', 'Purple', 'Gold'];
        const shapes: ShapeGene[] = ['Orb', 'Spike', 'Helix', 'Fungus'];
        const glows: Bioluminescence[] = ['None', 'Low', 'High'];

        setTargetSpec({
            color: colors[Math.floor(Math.random() * colors.length)],
            shape: shapes[Math.floor(Math.random() * shapes.length)],
            minGlow: glows[Math.floor(Math.random() * glows.length)],
            maxToxicity: Math.floor(Math.random() * 40) + 10,
            minHardiness: Math.floor(Math.random() * 40) + 60
        });
    };

    const startGame = () => {
        setScore(0);
        setCycle(1);
        setMutagens(difficulty === 'Elite' ? 8 : 12);
        generateNewTarget();
        setCurrentDNA({ color: 'Green', shape: 'Fungus', glow: 'None', toxicity: 80, hardiness: 20 });
        setGameState('PLAYING');
        audio.playSystemMessage({ type: 'success' });
    };

    // --- Genetic Modification Operations ---

    const applyMutagen = (operation: 'splice_color' | 'fold_shape' | 'irradiate_glow' | 'filter_toxin' | 'fortify_cell') => {
        if (mutagens <= 0 || gameState !== 'PLAYING') {
            audio.playError();
            return;
        }

        audio.playClick();
        setMutagens(m => m - 1);

        setCurrentDNA(prev => {
            const newDNA = { ...prev };

            switch (operation) {
                case 'splice_color':
                    // Cycle through colors
                    const colors: ColorGene[] = ['Red', 'Blue', 'Green', 'Purple', 'Gold'];
                    newDNA.color = colors[(colors.indexOf(prev.color) + 1) % colors.length];
                    // Side effect: sometimes increases toxicity
                    if (Math.random() > 0.5) newDNA.toxicity = Math.min(100, newDNA.toxicity + 10);
                    break;
                case 'fold_shape':
                    const shapes: ShapeGene[] = ['Orb', 'Spike', 'Helix', 'Fungus'];
                    newDNA.shape = shapes[(shapes.indexOf(prev.shape) + 1) % shapes.length];
                    // Side effect: lowers hardiness temporarily
                    newDNA.hardiness = Math.max(0, newDNA.hardiness - 10);
                    break;
                case 'irradiate_glow':
                    const glows: Bioluminescence[] = ['None', 'Low', 'High'];
                    newDNA.glow = glows[(glows.indexOf(prev.glow) + 1) % glows.length];
                    // Side effect: massive toxicity spike if turning on High glow
                    if (newDNA.glow === 'High') newDNA.toxicity = Math.min(100, newDNA.toxicity + 30);
                    break;
                case 'filter_toxin':
                    newDNA.toxicity = Math.max(0, newDNA.toxicity - 25);
                    // Side effect: might lose color
                    if (Math.random() > 0.7) newDNA.color = 'Green'; // Reset to base color
                    break;
                case 'fortify_cell':
                    newDNA.hardiness = Math.min(100, newDNA.hardiness + 20);
                    break;
            }
            return newDNA;
        });

        checkSubmissionConditions();
    };

    const checkSubmissionConditions = () => {
        // Can manually submit, but this just auto-checks if perfectly matched for early win
        let scoreBump = 0;
        if (currentDNA.color === targetSpec.color) scoreBump += 20;
        if (currentDNA.shape === targetSpec.shape) scoreBump += 20;
        if (currentDNA.glow === targetSpec.minGlow || (targetSpec.minGlow === 'Low' && currentDNA.glow === 'High')) scoreBump += 20;
        if (currentDNA.toxicity <= targetSpec.maxToxicity) scoreBump += 20;
        if (currentDNA.hardiness >= targetSpec.minHardiness) scoreBump += 20;

        if (scoreBump >= 100) {
            submitSpecimen(); // Auto submit if perfect
        }
    };

    const submitSpecimen = () => {
        if (gameState !== 'PLAYING') return;

        let matchScore = 0;

        // Calculate Match Percentage
        if (currentDNA.color === targetSpec.color) matchScore += 20;
        if (currentDNA.shape === targetSpec.shape) matchScore += 20;

        // Glow logic (High satisfies Low requirement)
        if (currentDNA.glow === targetSpec.minGlow) matchScore += 20;
        else if (targetSpec.minGlow === 'None' || (targetSpec.minGlow === 'Low' && currentDNA.glow === 'High')) matchScore += 20;

        if (currentDNA.toxicity <= targetSpec.maxToxicity) {
            matchScore += 20;
        } else {
            matchScore += Math.max(0, 20 - (currentDNA.toxicity - targetSpec.maxToxicity));
        }

        if (currentDNA.hardiness >= targetSpec.minHardiness) {
            matchScore += 20;
        } else {
            matchScore += Math.max(0, 20 - (targetSpec.minHardiness - currentDNA.hardiness));
        }

        const turnScore = matchScore * 10;
        setScore(s => s + turnScore);

        if (cycle >= MAX_CYCLES) {
            const finalScore = score + turnScore;
            audio.playSystemMessage({ type: finalScore >= 3000 ? 'success' : 'warning' });
            setGameState(finalScore >= 3000 ? 'SUCCESS' : 'FAILED');
            setTimeout(() => onComplete(finalScore, { cyclesCompleted: cycle, finalGeneticMatch: matchScore }), 4000);
        } else {
            audio.playSystemMessage({ type: 'success' });
            setCycle(c => c + 1);
            setMutagens(m => m + (difficulty === 'Elite' ? 3 : 5)); // Reward more mutagens
            generateNewTarget();
            // Optional: Keep current DNA or reset to basic? Keeping it makes it harder/more interesting
            setCurrentDNA({ color: 'Green', shape: 'Fungus', glow: 'None', toxicity: 80, hardiness: 20 });
        }
    };

    return (
        <div className="relative w-full h-[700px] rounded-2xl overflow-hidden border border-emerald-900/50 bg-black font-sans select-none shadow-[0_0_60px_rgba(16,185,129,0.15)] flex">

            {/* Left Panel - Lab Controls */}
            <div className="w-80 bg-zinc-950/80 backdrop-blur-xl border-r border-emerald-900/50 flex flex-col z-10">
                <div className="p-4 border-b border-emerald-900/50 bg-emerald-950/20">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold tracking-widest uppercase text-sm mb-2">
                        <Beaker className="w-5 h-5" /> Gene Lab
                    </div>
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Research Cycle</div>
                            <div className="text-2xl font-mono text-white">{cycle}<span className="text-zinc-500 text-sm">/{MAX_CYCLES}</span></div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Lab Score</div>
                            <div className="text-xl font-mono text-emerald-400">{score.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                <div className="p-4 flex-1 overflow-y-auto">

                    {/* Mutagen Currency */}
                    <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-zinc-300">
                            <FlaskConical className={`w-4 h-4 ${mutagens === 0 ? 'text-red-500' : 'text-purple-400'}`} />
                            <span className="text-xs uppercase tracking-widest font-bold flex-1">Mutagen Vials</span>
                        </div>
                        <span className={`text-xl font-mono font-bold ${mutagens === 0 ? 'text-red-500' : 'text-white'}`}>{mutagens}</span>
                    </div>

                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-3 border-b border-zinc-800 pb-1">DNA Modification</div>

                    <div className="flex flex-col gap-2">
                        <button
                            disabled={mutagens <= 0 || gameState !== 'PLAYING'}
                            onClick={() => applyMutagen('splice_color')}
                            className="bg-black hover:bg-zinc-800 border border-zinc-800 text-left p-3 rounded-lg transition-colors flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">Splice Chromosomes</span>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest bg-zinc-900 px-2 py-1 rounded">Color</span>
                        </button>

                        <button
                            disabled={mutagens <= 0 || gameState !== 'PLAYING'}
                            onClick={() => applyMutagen('fold_shape')}
                            className="bg-black hover:bg-zinc-800 border border-zinc-800 text-left p-3 rounded-lg transition-colors flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">Fold Morphology</span>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest bg-zinc-900 px-2 py-1 rounded">Shape</span>
                        </button>

                        <button
                            disabled={mutagens <= 0 || gameState !== 'PLAYING'}
                            onClick={() => applyMutagen('irradiate_glow')}
                            className="bg-black hover:bg-zinc-800 border border-zinc-800 text-left p-3 rounded-lg transition-colors flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">Irradiate Cells</span>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest bg-zinc-900 px-2 py-1 rounded">Glow</span>
                        </button>

                        <button
                            disabled={mutagens <= 0 || gameState !== 'PLAYING'}
                            onClick={() => applyMutagen('filter_toxin')}
                            className="bg-black hover:bg-zinc-800 border border-zinc-800 text-left p-3 rounded-lg transition-colors flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">Filter Toxins</span>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest bg-zinc-900 px-2 py-1 rounded">-Tox</span>
                        </button>

                        <button
                            disabled={mutagens <= 0 || gameState !== 'PLAYING'}
                            onClick={() => applyMutagen('fortify_cell')}
                            className="bg-black hover:bg-zinc-800 border border-zinc-800 text-left p-3 rounded-lg transition-colors flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">Fortify Membrane</span>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest bg-zinc-900 px-2 py-1 rounded">+Hard</span>
                        </button>
                    </div>

                    <div className="mt-8">
                        <button
                            onClick={submitSpecimen}
                            disabled={gameState !== 'PLAYING'}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(5,150,105,0.3)] hover:shadow-[0_0_30px_rgba(5,150,105,0.5)]"
                        >
                            Deliver Specimen
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Panel - 3D View & Targets */}
            <div className="flex-1 relative">

                {/* 3D Canvas */}
                <div className="absolute inset-0 cursor-move">
                    <Canvas camera={{ position: [0, 2, 6], fov: 45 }}>
                        <ambientLight intensity={0.2} color="#4c1d95" />
                        <spotLight position={[0, 10, 0]} intensity={1.5} color="#ffffff" angle={0.5} penumbra={1} castShadow />
                        <pointLight position={[5, 2, 5]} intensity={0.5} color={COLOR_MAP[currentDNA.color]} />
                        <pointLight position={[-5, 2, -5]} intensity={0.5} color="#0f766e" />

                        <fog attach="fog" args={['#000000', 5, 20]} />

                        {/* Lab Environment Base */}
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
                            <cylinderGeometry args={[3, 3.5, 0.5, 32]} />
                            <meshStandardMaterial color="#18181b" metalness={0.9} roughness={0.1} />
                        </mesh>
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.74, 0]}>
                            <ringGeometry args={[1.5, 2.5, 32]} />
                            <meshStandardMaterial color="#059669" emissive="#059669" emissiveIntensity={0.2} />
                        </mesh>

                        {/* Main Interaction Plant */}
                        {gameState !== 'IDLE' && (
                            <group position={[0, -0.5, 0]}>
                                <XenoPlant dna={currentDNA} />
                            </group>
                        )}

                        <OrbitControls
                            enableZoom={true}
                            enablePan={false}
                            maxPolarAngle={Math.PI / 2 - 0.1}
                            minDistance={3}
                            maxDistance={10}
                        />

                        <EffectComposer>
                            <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} />
                            <DepthOfField focusDistance={0} focalLength={0.02} bokehScale={2} height={480} />
                            <Vignette eskil={false} offset={0.1} darkness={1.1} />
                        </EffectComposer>
                    </Canvas>
                </div>

                {/* Top Overlay - Target Requirements */}
                {gameState !== 'IDLE' && (
                    <div className="absolute top-6 right-6 w-72 bg-black/80 backdrop-blur-md rounded-xl border border-zinc-700 p-4 shadow-2xl pointer-events-auto">
                        <div className="flex items-center gap-2 text-zinc-400 uppercase tracking-widest font-bold text-[10px] mb-3 border-b border-zinc-800 pb-2">
                            <Dna className="w-3 h-3" /> Client Requisition
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-zinc-400">Target Color:</span>
                                <span className="text-sm font-bold" style={{ color: COLOR_MAP[targetSpec.color!] }}>{targetSpec.color}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-zinc-400">Morphology:</span>
                                <span className="text-sm font-bold text-white">{targetSpec.shape}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-zinc-400">Bioluminescence:</span>
                                <span className="text-sm font-bold text-white">{targetSpec.minGlow}+</span>
                            </div>

                            <div className="pt-2 border-t border-zinc-800 space-y-2">
                                <div>
                                    <div className="flex justify-between text-[10px] mb-1">
                                        <span className="text-zinc-500 uppercase">Toxicity (Max {targetSpec.maxToxicity})</span>
                                        <span className={currentDNA.toxicity <= targetSpec.maxToxicity ? 'text-emerald-400' : 'text-red-400'}>{currentDNA.toxicity}</span>
                                    </div>
                                    <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                                        <div className={`h-full ${currentDNA.toxicity <= targetSpec.maxToxicity ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${currentDNA.toxicity}%` }} />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-[10px] mb-1">
                                        <span className="text-zinc-500 uppercase">Hardiness (Min {targetSpec.minHardiness})</span>
                                        <span className={currentDNA.hardiness >= targetSpec.minHardiness ? 'text-emerald-400' : 'text-amber-400'}>{currentDNA.hardiness}</span>
                                    </div>
                                    <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden relative">
                                        {/* Target Marker */}
                                        <div className="absolute top-0 bottom-0 w-0.5 bg-white z-10" style={{ left: `${targetSpec.minHardiness}%` }} />
                                        <div className={`h-full ${currentDNA.hardiness >= targetSpec.minHardiness ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${currentDNA.hardiness}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Start/End Screens */}
            <AnimatePresence>
                {gameState === 'IDLE' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-8 text-center backdrop-blur-xl">
                        <div className="max-w-md border border-emerald-900/50 p-10 rounded-3xl bg-zinc-950 shadow-[0_0_50px_rgba(5,150,105,0.2)]">
                            <Sprout className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
                            <h2 className="text-3xl font-black text-white mb-4 tracking-widest uppercase">XenoFlora</h2>
                            <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                                Engineer alien plant life for off-world clients.<br /><br />
                                <span className="text-emerald-400 font-bold">Splice</span> DNA to match target physical specifications.<br />
                                <span className="text-purple-400 font-bold">Manage</span> mutagens carefully, they are limited.<br />
                                <span className="text-red-400 font-bold">Balance</span> toxicity and hardiness to ensure survival.
                            </p>
                            <button onClick={startGame} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(5,150,105,0.4)]">
                                Enter Laboratory
                            </button>
                        </div>
                    </motion.div>
                )}

                {gameState === 'SUCCESS' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-emerald-950/90 backdrop-blur-xl border-8 border-emerald-900">
                        <Atom className="w-24 h-24 text-emerald-400 mb-6 drop-shadow-[0_0_30px_rgba(52,211,153,0.5)] animate-spin-slow" />
                        <h2 className="text-5xl font-black text-white mb-4 tracking-widest uppercase">Contract Fulfilled</h2>
                        <p className="text-emerald-200 text-xl font-mono mb-8 opacity-90 uppercase tracking-widest">Biological shipments dispatched.</p>
                        <div className="text-white text-3xl font-bold font-mono bg-black/50 px-8 py-4 rounded-xl border border-emerald-900 flex flex-col items-center gap-2">
                            <span>Final Score: {score.toLocaleString()}</span>
                            <span className="text-sm text-emerald-500 font-sans tracking-widest uppercase">Master Geneticist</span>
                        </div>
                    </motion.div>
                )}

                {gameState === 'FAILED' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-950/90 backdrop-blur-xl border-8 border-red-900">
                        <ShieldAlert className="w-24 h-24 text-red-500 mb-6 drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]" />
                        <h2 className="text-5xl font-black text-white mb-4 tracking-widest uppercase text-center">Containment Breach</h2>
                        <p className="text-red-200 text-lg font-mono mb-8 opacity-90 uppercase tracking-widest text-center max-w-lg">
                            Specimens failed to meet client safety standards or viability thresholds.
                        </p>
                        <div className="text-white text-3xl font-bold font-mono bg-black/50 px-8 py-4 rounded-xl border border-red-900">
                            Final Score: {score.toLocaleString()}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};
