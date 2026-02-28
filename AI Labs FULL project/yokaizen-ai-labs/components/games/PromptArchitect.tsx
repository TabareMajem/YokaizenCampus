import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, MeshDistortMaterial, Float, Text, Grid, Edges } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch, Vignette, Noise } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Activity, Shield, Cpu, AlertTriangle, Zap, Layers, Maximize } from 'lucide-react';
import { audio } from '../../services/audioService';

export interface PromptArchitectProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

// -------------------------------------------------------------------------------------------------
// AAA VISUAL COMPONENTS
// -------------------------------------------------------------------------------------------------

// The Hologram Structure
const ArchitectStructure = ({ loadPercentage, isBuilding }: { loadPercentage: number, isBuilding: boolean }) => {
    const groupRef = useRef<THREE.Group>(null);
    const coreRef = useRef<THREE.Mesh>(null);

    // Create an array of structural blocks
    const blocks = useMemo(() => {
        const arr = [];
        const maxLevel = 5;
        for (let y = -2; y <= 2; y++) {
            for (let x = -2; x <= 2; x++) {
                for (let z = -2; z <= 2; z++) {
                    // Only keep a subset to form a cool structure
                    if (Math.abs(x) + Math.abs(y) + Math.abs(z) <= 3) {
                        arr.push({ pos: [x * 1.5, y * 1.5, z * 1.5] as [number, number, number], id: Math.random() });
                    }
                }
            }
        }
        return arr;
    }, []);

    useFrame((state, delta) => {
        if (groupRef.current) {
            // Slow, majestic rotation
            groupRef.current.rotation.y += delta * 0.1;
            groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;

            // Pulse effect when building
            if (isBuilding) {
                groupRef.current.scale.lerp(new THREE.Vector3(1.05, 1.05, 1.05), 0.2);
            } else {
                groupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
            }
        }
    });

    // How many blocks are "active/solid" based on loadPercentage
    const activeThreshold = loadPercentage * blocks.length;

    return (
        <group ref={groupRef}>
            <Float floatIntensity={1.5} speed={2} rotationIntensity={0.5}>
                {blocks.map((block, i) => {
                    const isActive = i < activeThreshold;
                    const isNext = i >= activeThreshold && i < activeThreshold + 2; // the ones currently being built

                    if (!isActive && !isNext) return null; // Invisible yet

                    return (
                        <Box key={block.id} args={[1.2, 1.2, 1.2]} position={block.pos} scale={isActive ? 1 : 0.6}>
                            {isActive ? (
                                <meshPhysicalMaterial
                                    color="#06b6d4" // cyan-500
                                    emissive="#0891b2" // cyan-600
                                    emissiveIntensity={isBuilding ? 1.5 : 0.5}
                                    metalness={0.9}
                                    roughness={0.1}
                                    transparent
                                    opacity={0.8}
                                    transmission={0.5}
                                />
                            ) : (
                                <meshBasicMaterial color="#0284c7" wireframe transparent opacity={0.5 + Math.sin(Date.now() / 100) * 0.5} />
                            )}
                            {/* Blueprint Edges */}
                            <Edges scale={1.01} threshold={15} color={isActive ? "#67e8f9" : "#0284c7"} />
                        </Box>
                    );
                })}

                {/* Central Distorting Heart (The Blueprint Core) */}
                <Box ref={coreRef} args={[2.5, 2.5, 2.5]} scale={1 + loadPercentage * 0.5}>
                    <MeshDistortMaterial
                        color="#06b6d4"
                        envMapIntensity={1}
                        clearcoat={1}
                        metalness={1}
                        roughness={0}
                        distort={isBuilding ? 0.6 : 0.2}
                        speed={isBuilding ? 8 : 2}
                        wireframe
                    />
                </Box>
            </Float>
        </group>
    );
};

// Shockwave / Architectural Grid scan effect
const HologramGrid = ({ isBuilding }: { isBuilding: boolean }) => {
    const gridRef = useRef<any>();

    useFrame((state) => {
        if (gridRef.current) {
            // Move grid to simulate building upwards
            const speed = isBuilding ? 2 : 0.2;
            gridRef.current.position.y = (gridRef.current.position.y - state.clock.getDelta() * speed) % 2;
        }
    });

    return (
        <group position={[0, -5, 0]}>
            <Grid
                ref={gridRef}
                args={[40, 40]}
                cellSize={1}
                cellThickness={2}
                cellColor="#0891b2"
                sectionSize={5}
                sectionThickness={3}
                sectionColor="#22d3ee"
                fadeDistance={25}
                fadeStrength={1}
            />
        </group>
    );
};

// Floating Structural Text for Interaction Feedback
const BuildText = ({ text, position }: { text: string, position: [number, number, number] }) => {
    const textRef = useRef<any>();
    const [opacity, setOpacity] = useState(1);
    const [pos, setPos] = useState(position);

    useFrame((_, delta) => {
        if (opacity > 0) {
            setOpacity(prev => Math.max(0, prev - delta * 1.2));
            setPos([pos[0], pos[1] + delta * 2, pos[2]]);
        }
    });

    if (opacity <= 0) return null;

    return (
        <Text
            ref={textRef}
            position={pos}
            fontSize={0.8}
            color="#67e8f9" // cyan-200
            font="https://fonts.gstatic.com/s/orbitron/v25/yVbYKJqEIfcweOX2.woff"
            material-transparent
            material-opacity={opacity}
            outlineWidth={0.04}
            outlineColor="#082f49" // sky-900
        >
            {text}
        </Text>
    );
};

// -------------------------------------------------------------------------------------------------
// MAIN COMPONENT
// -------------------------------------------------------------------------------------------------

export const PromptArchitect: React.FC<PromptArchitectProps> = ({ onComplete, difficulty, t }) => {
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');
    const [isBuilding, setIsBuilding] = useState(false);
    const [reactions, setReactions] = useState<{ id: number, text: string, pos: [number, number, number] }[]>([]);

    // Multi-Agent Flow Logic State
    const [advisorMsg, setAdvisorMsg] = useState('Initializing architectural blueprint...');
    const [adversaryMsg, setAdversaryMsg] = useState('Detecting structural vulnerabilities.');
    const [glitchActive, setGlitchActive] = useState(false);

    const MAX_SCORE = 1500;
    const loadPercentage = score / MAX_SCORE;

    // Multi-Agent Simulation Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        const advisorLines = [
            'Structural integrity confirmed. Proceeding.',
            'Optimization detected. Keep laying down syntax blocks.',
            'Adversary is adapting logic constraints. Adapt prompts.',
            'Blueprint is stabilizing. Good logic flow.'
        ];

        const adversaryLines = [
            'Your syntax foundation is flawed.',
            'I am introducing contradictory parameters.',
            'Complexity overload imminent.',
            'You cannot sustain this prompt architecture.'
        ];

        const agentInterval = setInterval(() => {
            const isAdversary = Math.random() > 0.6;
            if (isAdversary) {
                setAdversaryMsg(adversaryLines[Math.floor(Math.random() * adversaryLines.length)]);
                audio.playSystemMessage({ type: 'warning' });
                // Glitch effect on adversary action
                setGlitchActive(true);
                setTimeout(() => setGlitchActive(false), 800);
            } else {
                setAdvisorMsg(advisorLines[Math.floor(Math.random() * advisorLines.length)]);
                audio.playSystemMessage({ type: 'success' });
            }
        }, 5500);

        return () => clearInterval(agentInterval);
    }, [gameState]);

    // Timer Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    const isWin = score >= 1000;
                    setGameState(isWin ? 'SUCCESS' : 'FAILED');
                    onComplete(isWin ? score : 0, { completionTime: 60 - prev, difficulty });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, score, onComplete, difficulty]);

    const handleInteract = () => {
        if (gameState !== 'PLAYING') return;
        audio.playTyping();
        setIsBuilding(true);

        // Add floating text
        const amount = Math.floor(Math.random() * 20) + 40;
        setScore(s => Math.min(MAX_SCORE, s + amount));

        const newReaction = {
            id: Date.now() + Math.random(),
            text: `+${amount} PRECISION`,
            pos: [(Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, 2] as [number, number, number]
        };
        setReactions(prev => [...prev, newReaction]);

        setTimeout(() => setIsBuilding(false), 200);

        if (score + amount >= MAX_SCORE) {
            setGameState('SUCCESS');
            onComplete(MAX_SCORE, { completionTime: 60 - timeLeft, difficulty });
        }
    };

    return (
        <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border border-cyan-500/20 bg-gradient-to-b from-slate-950 to-[#000510] shadow-[0_0_60px_rgba(6,182,212,0.15)] font-mono">
            {/* Holographic Top UI Overlay */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
                {/* Score / Structural Integrity Indicator */}
                <div className="flex flex-col gap-2 w-1/3">
                    <div className="bg-sky-950/60 backdrop-blur-xl rounded-xl p-3 border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.2)] relative overflow-hidden">
                        <div className="absolute top-0 left-0 h-1 bg-cyan-400 shadow-[0_0_15px_#22d3ee]" style={{ width: `${loadPercentage * 100}%`, transition: 'width 0.2s' }} />
                        <div className="flex items-center gap-2 text-cyan-400 mb-1">
                            <Layers className="w-5 h-5" />
                            <span className="text-[11px] uppercase tracking-[0.25em] font-black">Structural Integrity</span>
                        </div>
                        <div className="text-3xl font-black text-white">{score} <span className="text-cyan-600 font-medium text-lg">/ {MAX_SCORE}</span></div>
                    </div>
                </div>

                {/* Timer Indicator */}
                <div className="bg-sky-950/60 backdrop-blur-xl rounded-xl p-3 border border-cyan-500/50 flex flex-col items-end shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                    <div className="flex items-center gap-2 text-cyan-400 mb-1">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="text-[11px] uppercase tracking-[0.25em] font-black">Project Deadline</span>
                    </div>
                    <div className={`text-3xl font-black tracking-widest ${timeLeft <= 10 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>{timeLeft}s</div>
                </div>
            </div>

            {/* Middle Prompt / Interaction hint */}
            {gameState === 'PLAYING' && score === 0 && (
                <div className="absolute top-[60%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 animate-pulse text-cyan-400/50 font-black tracking-widest text-xl text-center flex flex-col items-center">
                    <Maximize className="w-8 h-8 mb-2" />
                    [ CLICK TO CONSTRUCT ]
                </div>
            )}

            {/* Bottom Screen Agent Terminals */}
            <div className="absolute bottom-6 left-6 right-6 flex gap-6 z-10 pointer-events-none">
                <div className="flex-1 bg-[#020617]/80 backdrop-blur-2xl rounded-xl p-4 border border-cyan-500/30 relative overflow-hidden shadow-lg">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 shadow-[0_0_10px_#06b6d4]"></div>
                    <div className="text-[10px] text-cyan-400 mb-2 uppercase tracking-[0.2em] font-black flex items-center gap-2">
                        <Shield className="w-4 h-4" /> Architect Advisor
                    </div>
                    <div className="text-sm text-cyan-100/90 font-mono tracking-wide typing-animation">{advisorMsg}</div>
                </div>
                <div className="flex-1 bg-[#020617]/80 backdrop-blur-2xl rounded-xl p-4 border border-rose-500/30 relative overflow-hidden shadow-lg">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 shadow-[0_0_10px_#f43f5e]"></div>
                    <div className="text-[10px] text-rose-500 mb-2 uppercase tracking-[0.2em] font-black flex items-center gap-2">
                        <Zap className="w-4 h-4" /> Saboteur AI
                    </div>
                    <div className="text-sm text-rose-100/90 font-mono tracking-wide typing-animation">{adversaryMsg}</div>
                </div>
            </div>

            {/* Game Over Cinematic Screens */}
            {gameState !== 'PLAYING' && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#020617]/95 backdrop-blur-md">
                    <div className="text-center animate-in fade-in zoom-in duration-500">
                        {gameState === 'SUCCESS' ? (
                            <>
                                <div className="text-5xl md:text-7xl font-black uppercase tracking-[0.2em] mb-4 text-cyan-400 drop-shadow-[0_0_30px_rgba(34,211,238,0.8)]">
                                    DESIGN COMPILED
                                </div>
                                <Layers className="w-24 h-24 text-cyan-400 mx-auto mb-6 animate-pulse" />
                            </>
                        ) : (
                            <>
                                <div className="text-5xl md:text-7xl font-black uppercase tracking-[0.2em] mb-4 text-rose-500 drop-shadow-[0_0_30px_rgba(244,63,94,0.8)]">
                                    SYNTAX COLLAPSE
                                </div>
                                <AlertTriangle className="w-24 h-24 text-rose-500 mx-auto mb-6 animate-bounce" />
                            </>
                        )}
                        <div className="text-2xl text-white/80 font-mono tracking-widest uppercase">
                            Final Build Score: <span className="text-white font-black">{score}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* 3D WebGL Interaction Layer */}
            <div className="absolute inset-0 z-0 cursor-crosshair" onClick={handleInteract}>
                <Canvas camera={{ position: [0, 5, 12], fov: 60 }}>
                    <ambientLight intensity={0.4} />
                    <pointLight position={[10, 15, 10]} intensity={2} color="#22d3ee" />
                    <pointLight position={[-10, -5, -10]} intensity={1.5} color="#0369a1" />

                    <HologramGrid isBuilding={isBuilding} />

                    <ArchitectStructure loadPercentage={loadPercentage} isBuilding={isBuilding} />

                    {/* Feedback Texts */}
                    {reactions.map(r => (
                        <BuildText key={r.id} text={r.text} position={r.pos} />
                    ))}

                    <OrbitControls
                        enableZoom={false}
                        enablePan={false}
                        autoRotate={!isBuilding}
                        autoRotateSpeed={0.8}
                        maxPolarAngle={Math.PI / 2.2} // Restrict looking under the grid
                        minPolarAngle={Math.PI / 4}
                    />

                    {/* Blueprint Hologram Post-Processing */}
                    <EffectComposer>
                        <Bloom
                            luminanceThreshold={0.15}
                            luminanceSmoothing={0.9}
                            intensity={isBuilding ? 3.0 : 2.0}
                            mipmapBlur
                        />
                        <ChromaticAberration
                            blendFunction={BlendFunction.NORMAL}
                            offset={new THREE.Vector2(0.003, 0.003)}
                        />
                        <Vignette
                            eskil={false}
                            offset={0.1}
                            darkness={1.5}
                        />
                        <Noise
                            opacity={0.1}
                            blendFunction={BlendFunction.OVERLAY}
                        />
                        {glitchActive && (
                            <Glitch
                                delay={new THREE.Vector2(0, 0)}
                                duration={new THREE.Vector2(0.1, 0.3)}
                                mode={GlitchMode.SPORADIC}
                                active
                                ratio={0.7}
                            />
                        )}
                        {/* High altitude structural stress glitch */}
                        {loadPercentage > 0.85 && !glitchActive && (
                            <Glitch
                                delay={new THREE.Vector2(0, 0)}
                                duration={new THREE.Vector2(0.1, 0.2)}
                                mode={GlitchMode.SPORADIC}
                                active
                                ratio={0.15}
                            />
                        )}
                    </EffectComposer>
                </Canvas>
            </div>

            {/* Holographic Scanlines */}
            <div className="absolute inset-0 z-20 pointer-events-none opacity-20 bg-[linear-gradient(rgba(34,211,238,0.05)_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px]"></div>
        </div>
    );
};

