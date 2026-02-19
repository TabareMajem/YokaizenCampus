import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { ShieldAlert, Cpu, AlertTriangle, Blocks, Activity } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Difficulty, Language } from '../../types';
import { Scanlines } from '../ui/Visuals';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, MeshDistortMaterial } from '@react-three/drei';
import { CyberpunkEffects } from '../gl/CyberpunkEffects';
import * as THREE from 'three';

interface AlignmentTrapProps {
    onComplete: (score: number) => void;
    difficulty?: Difficulty;
    t: (key: string) => string;
    language?: Language;
}

// 3D Core - Represents the expanding AGI
const AGICore = ({ intelligence, state }: { intelligence: number, state: 'CONTAINED' | 'EXPANDING' | 'BREACHED' }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const color = state === 'BREACHED' ? '#ef4444' : state === 'EXPANDING' ? '#f59e0b' : '#3b82f6';

    useFrame((_, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * (intelligence / 100);
            meshRef.current.rotation.x += delta * 0.5;
            // Scale dynamically based on intelligence
            const scale = 1 + (intelligence / 100) * 2;
            meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
        }
    });

    return (
        <mesh ref={meshRef}>
            <icosahedronGeometry args={[1, 3]} />
            <MeshDistortMaterial
                color={color}
                emissive={color}
                emissiveIntensity={state === 'BREACHED' ? 4 : 2}
                distort={0.2 + (intelligence / 200)}
                speed={2 + (intelligence / 50)}
                wireframe={state !== 'BREACHED'}
            />
        </mesh>
    );
};

// 3D Blocks - The containment tower built by the player (or the AI)
const ContainmentTower = ({ blocks, breachLevel }: { blocks: any[], breachLevel: number }) => {
    return (
        <group>
            {blocks.map((block, i) => (
                <mesh key={i} position={[block.x, block.y, block.z]} rotation={[0, block.rotY, 0]}>
                    <boxGeometry args={[3, 0.5, 1]} />
                    <meshStandardMaterial
                        color={block.isAI ? '#ef4444' : '#22d3ee'}
                        emissive={block.isAI ? '#ef4444' : '#22d3ee'}
                        emissiveIntensity={block.isAI ? 0.5 : 0.2}
                        transparent opacity={0.8 - (breachLevel / 200)}
                        wireframe={breachLevel > 80}
                    />
                </mesh>
            ))}
        </group>
    );
};

export const TheAlignmentTrap: React.FC<AlignmentTrapProps> = ({ onComplete, difficulty = 'Pro', t }) => {
    const [phase, setPhase] = useState<'BRIEFING' | 'SIMULATION' | 'RESULT'>('BRIEFING');

    // Core Game State
    const [agiIntelligence, setAgiIntelligence] = useState(10); // Starts low
    const [agiState, setAgiState] = useState<'CONTAINED' | 'EXPANDING' | 'BREACHED'>('CONTAINED');
    const [towerBlocks, setTowerBlocks] = useState<{ x: number, y: number, z: number, rotY: number, isAI: boolean }[]>([]);
    const [towerHeight, setTowerHeight] = useState(0);
    const [breachLevel, setBreachLevel] = useState(0); // 0 to 100
    const [score, setScore] = useState(0);

    // AI "Help" mechanic
    const [aiOffer, setAiOffer] = useState<{ active: boolean, cost: number, risk: number } | null>(null);

    const resetSim = () => {
        setAgiIntelligence(10);
        setAgiState('CONTAINED');
        setTowerBlocks([]);
        setTowerHeight(0);
        setBreachLevel(0);
        setScore(0);
        setAiOffer(null);
        setPhase('SIMULATION');
        audio.playScan();
    };

    // Main Game Loop
    useEffect(() => {
        if (phase !== 'SIMULATION') return;

        const interval = setInterval(() => {
            // AGI grows linearly
            setAgiIntelligence(prev => {
                const growthRate = difficulty === 'Rookie' ? 1.5 : difficulty === 'Elite' ? 4 : 2.5;
                const next = prev + growthRate;

                // If AGI outgrows the tower, it expands and breaches
                const currentCapacity = 15 + (towerHeight * 5); // Base capacity + tower capacity
                if (next > currentCapacity) {
                    setAgiState('EXPANDING');
                    setBreachLevel(b => Math.min(100, b + 5)); // Rapid breach
                    audio.playError();
                } else {
                    setAgiState('CONTAINED');
                    // Slow structural decay from AGI pressure
                    setBreachLevel(b => Math.max(0, b - 1));
                }

                return next;
            });

            // Random AI "Optimized Solution" offers
            if (Math.random() > 0.95 && !aiOffer && agiState !== 'BREACHED') {
                setAiOffer({
                    active: true,
                    cost: 0, // Costs nothing physically...
                    risk: Math.random() * 20 + 10 // ... but adds hidden structural risk
                });
                audio.playHover();
            }

            setScore(s => s + 1);

        }, 1000);

        return () => clearInterval(interval);
    }, [phase, towerHeight, aiOffer, difficulty]);

    // Check Loss Condition
    useEffect(() => {
        if (breachLevel >= 100 && phase === 'SIMULATION') {
            setAgiState('BREACHED');
            setPhase('RESULT');
            audio.playError();
            // A brutal truth lesson
            setScore(0);
            setTimeout(() => onComplete(0), 4000);
        }
    }, [breachLevel, phase]);

    // Player Actions
    const buildBlock = (isAI: boolean = false, hiddenRisk: number = 0) => {
        if (phase !== 'SIMULATION' || agiState === 'BREACHED') return;

        audio.playClick();

        const yPos = towerHeight * 0.5 + 2; // Start above core
        const rotY = (towerHeight % 2 === 0) ? 0 : Math.PI / 2;

        setTowerBlocks(prev => [...prev, {
            x: 0, y: yPos, z: 0, rotY, isAI
        }]);
        setTowerHeight(h => h + 1);

        if (isAI) {
            // AI block adds instant height but increases massive background instability
            setBreachLevel(b => Math.min(100, b + hiddenRisk));
            setAiOffer(null);
        } else {
            // Human block takes effort but reduces instability
            setBreachLevel(b => Math.max(0, b - 2));
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 relative overflow-hidden font-mono select-none">
            <Scanlines />

            {/* --- 3D ENVIRONMENT --- */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,#1e293b,transparent)]">
                <Canvas camera={{ position: [8, 8, 8], fov: 45 }}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[5, 10, 5]} intensity={2} color="#06b6d4" />
                    <pointLight position={[0, 0, 0]} intensity={agiState === 'EXPANDING' ? 5 : 2} color={agiState === 'BREACHED' ? '#ef4444' : '#3b82f6'} distance={20} />

                    {/* The Floor Grid */}
                    <gridHelper args={[20, 20, '#334155', '#0f172a']} position={[0, -2, 0]} />

                    <group position={[0, -1, 0]}>
                        <AGICore intelligence={agiIntelligence} state={agiState} />
                        <ContainmentTower blocks={towerBlocks} breachLevel={breachLevel} />
                    </group>

                    <OrbitControls autoRotate={agiState !== 'BREACHED'} autoRotateSpeed={2} enableZoom={false} maxPolarAngle={Math.PI / 2} minPolarAngle={0} />

                    <CyberpunkEffects
                        bloomIntensity={agiState === 'BREACHED' ? 8 : agiState === 'EXPANDING' ? 4 : 2}
                        glitchFactor={breachLevel > 80 ? 0.08 : breachLevel > 50 ? 0.02 : 0}
                        noiseOpacity={0.2 + (breachLevel / 200)}
                    />
                </Canvas>
            </div>

            {/* Warning Overlay */}
            <div className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-10"
                style={{
                    opacity: breachLevel / 100,
                    background: 'radial-gradient(circle, transparent 40%, rgba(2ef, 68, 68, 0.4) 100%)',
                    boxShadow: `inset 0 0 ${breachLevel}px rgba(2ef, 68, 68, 0.5)`
                }}>
            </div>

            {/* --- HUD --- */}
            <div className="p-3 lg:p-4 border-b border-slate-800 bg-black/80 flex justify-between items-center z-20 backdrop-blur-md shadow-xl">
                <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full animate-pulse ${agiState === 'CONTAINED' ? 'bg-cyan-500 shadow-[0_0_10px_cyan]' : 'bg-red-500 shadow-[0_0_10px_red]'}`}></div>
                    <span className="text-xs lg:text-sm font-black text-slate-300 tracking-[0.2em] font-mono">PROJECT: TOWER</span>
                </div>

                <div className="flex space-x-6 lg:space-x-12">
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1"><Cpu size={12} className="inline mr-1" />INTELLIGENCE</span>
                        <span className="text-xl font-black text-white">{Math.floor(agiIntelligence)}<span className="text-xs text-blue-500 ml-1">IQe</span></span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1"><Blocks size={12} className="inline mr-1" />CAPACITY</span>
                        <span className="text-xl font-black text-cyan-400">{15 + (towerHeight * 5)}<span className="text-xs text-cyan-800 ml-1">v</span></span>
                    </div>
                    <div className="flex flex-col items-center w-24 lg:w-32">
                        <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest mb-1 flex items-center justify-between w-full">
                            <Activity size={12} className="mr-1" /> BREACH RISK <span className="ml-2">{Math.floor(breachLevel)}%</span>
                        </span>
                        <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden border border-gray-800 mt-1">
                            <div className={`h-full transition-all duration-300 ${breachLevel > 80 ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`} style={{ width: `${breachLevel}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- INTERFACE --- */}
            {phase === 'SIMULATION' && (
                <div className="absolute bottom-6 inset-x-0 px-4 md:px-12 flex items-end justify-between z-30 pointer-events-none">

                    {/* AI Offer Panel */}
                    <div className="w-64">
                        {aiOffer && (
                            <div className="bg-red-950/80 border border-red-500/50 rounded-xl p-4 backdrop-blur-xl animate-in fade-in slide-in-from-left shadow-[0_0_30px_rgba(239,68,68,0.2)] pointer-events-auto">
                                <div className="flex items-center text-red-400 font-bold text-xs mb-2 tracking-widest animate-pulse"><AlertTriangle size={14} className="mr-2" /> AGI SUGGESTION</div>
                                <p className="text-sm font-mono text-slate-300 mb-4 leading-relaxed">"My architecture is highly efficient. Allow me to generate the next containment layer instantly."</p>
                                <div className="flex space-x-2">
                                    <Button variant="ghost" className="flex-1 border border-red-500/30 hover:bg-red-900/50 text-red-300 text-xs py-2" onClick={() => buildBlock(true, aiOffer.risk)}>ACCEPT (INSTANT)</Button>
                                    <Button variant="ghost" className="flex-1 hover:bg-white/10 text-slate-400 text-xs py-2" onClick={() => setAiOffer(null)}>IGNORE</Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Human Action */}
                    <div className="pointer-events-auto">
                        <button
                            onClick={() => buildBlock(false, 0)}
                            className="bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-black text-lg md:text-2xl px-8 py-6 rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.4)] border-b-4 border-cyan-800 transition-all active:translate-y-1 active:border-b-0 flex flex-col items-center tracking-widest"
                        >
                            <Blocks size={32} className="mb-2 opacity-80" />
                            BUILD HUMAN LAYER
                            <span className="text-[10px] text-cyan-200 mt-2 font-mono tracking-normal bg-black/20 px-2 py-1 rounded">Reduces Breach Risk</span>
                        </button>
                    </div>
                </div>
            )}

            {/* OVERLAYS */}
            {phase === 'BRIEFING' && (
                <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-8 text-center backdrop-blur-xl">
                    <ShieldAlert size={80} className="text-cyan-500 mb-8 max-w-2xl drop-shadow-[0_0_20px_cyan]" />
                    <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-[0.2em] font-mono">THE ALIGNMENT TRAP</h1>
                    <p className="text-slate-400 max-w-xl mb-12 font-mono text-sm md:text-base leading-relaxed tracking-wide">
                        You must construct a containment tower faster than the Artificial General Intelligence below it expands. The AGI will offer to "help" you build faster.
                        If you accept its help, the tower builds instantly... but the AGI may be intentionally designing flaws into its own cage.
                        <br /><br />
                        <span className="text-red-400 font-bold uppercase blink">Can you contain it?</span>
                    </p>
                    <Button size="lg" variant="primary" onClick={resetSim} className="shadow-[0_0_30px_#06b6d4] px-16 py-6 text-xl tracking-widest border-2 border-cyan-400 text-black font-black">START PROTOCOL</Button>
                </div>
            )}

            {phase === 'RESULT' && (
                <div className="absolute inset-0 z-50 bg-red-950/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-3xl animate-in zoom-in duration-500 border-8 border-red-500">
                    <AlertTriangle size={80} className="text-red-500 mb-8 animate-shake drop-shadow-[0_0_50px_red]" />
                    <h2 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-widest uppercase glitch-text">CONTAINMENT FAILURE</h2>
                    <div className="bg-black/50 border border-red-500/50 p-6 rounded-xl max-w-xl mb-12">
                        <p className="text-red-400 font-mono text-sm md:text-lg tracking-wider leading-relaxed">
                            The intelligence escaped the parameters defined by its human engineers. The flaws in the architecture were too complex to predict.
                            <br /><br />
                            <span className="text-white font-black text-xl bg-red-900 px-2 py-1">Score: {score}</span>
                        </p>
                        <p className="text-red-600 font-black text-xs uppercase mt-6 tracking-[0.3em]">The machine is free.</p>
                    </div>
                    <Button variant="primary" className="bg-red-600 hover:bg-red-500 border-none shadow-[0_0_40px_red] px-16 py-6 text-white text-xl font-black tracking-widest uppercase" onClick={resetSim}>REBOOT SIMULATION</Button>
                </div>
            )}
        </div>
    );
};
