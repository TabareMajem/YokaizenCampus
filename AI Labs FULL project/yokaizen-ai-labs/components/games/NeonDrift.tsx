import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Float, Sparkles, Torus, instances, Instance, InstancedMesh } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch, Scanline, Noise } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Activity, Shield, Zap, AlertTriangle, Gauge, FastForward, SkullIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../../services/audioService';
import { useDialogue } from '../../contexts/DialogueContext';

export interface NeonDriftProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

// --- 3D Environment Components ---

const SynthwaveSun = () => {
    return (
        <group position={[0, 10, -80]}>
            <mesh>
                <circleGeometry args={[40, 64]} />
                <meshBasicMaterial color="#ff0055" />
            </mesh>
            {/* Sun lines (retro sunset effect) */}
            {[...Array(8)].map((_, i) => (
                <mesh key={i} position={[0, -20 + i * 4, 0.1]} scale={[1, 0.4 * (i + 1), 1]}>
                    <planeGeometry args={[90, 1]} />
                    <meshBasicMaterial color="#020108" />
                </mesh>
            ))}
            <pointLight distance={150} intensity={2} color="#ff00aa" />
        </group>
    );
};

const GridFloor = ({ speed }: { speed: number }) => {
    const gridRef = useRef<THREE.GridHelper>(null);
    useFrame((state) => {
        if (gridRef.current) {
            // Move grid towards camera to simulate forward movement
            gridRef.current.position.z = (state.clock.elapsedTime * speed * 10) % 10;
        }
    });

    return (
        <group position={[0, -2, -40]}>
            <gridHelper ref={gridRef} args={[200, 40, '#ff00aa', '#ff00aa']} />

            {/* Fading plane to blend grid into distance */}
            <mesh position={[0, 0, -40]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[200, 100]} />
                <meshBasicMaterial color="#020108" transparent opacity={0.8} />
            </mesh>
        </group>
    );
};

// --- Interactive Highway Nodes ---

const BoostRing = ({ position, onClick, id, speed }: any) => {
    const meshRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);

    useFrame(() => {
        if (meshRef.current) {
            meshRef.current.position.z += speed * 0.16;
            meshRef.current.rotation.z += 0.05;
        }
    });

    return (
        <group ref={meshRef} position={position}>
            <mesh
                onClick={(e) => { e.stopPropagation(); onClick(id); }}
                onPointerOver={() => { setHovered(true); document.body.style.cursor = 'crosshair'; }}
                onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
            >
                <torusGeometry args={[1.5, 0.15, 16, 32]} />
                <meshStandardMaterial
                    color="#00ffff"
                    emissive="#00ffff"
                    emissiveIntensity={hovered ? 5 : 2}
                    roughness={0.2}
                />
                {hovered && <pointLight distance={5} intensity={2} color="#00ffff" />}
            </mesh>
            <mesh>
                <icosahedronGeometry args={[0.5, 0]} />
                <meshBasicMaterial color="#ffffff" wireframe />
            </mesh>
        </group>
    );
};

const DataSpike = ({ position, onClick, id, speed }: any) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.position.z += speed * 0.16;
            meshRef.current.rotation.x += 0.05;
            meshRef.current.rotation.y += 0.08;
            meshRef.current.scale.setScalar(hovered ? 1.3 : 1);
        }
    });

    return (
        <mesh
            ref={meshRef}
            position={position}
            onClick={(e) => { e.stopPropagation(); onClick(id); }}
            onPointerOver={() => { setHovered(true); document.body.style.cursor = 'crosshair'; }}
            onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
        >
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
                color="#ff3300"
                emissive="#ff3300"
                emissiveIntensity={hovered ? 4 : 1.5}
                wireframe={!hovered}
                roughness={0.5}
            />
            <pointLight distance={5} intensity={2} color="#ff3300" />
        </mesh>
    );
};

// Dynamic Camera for a "driving/drifting" feel
const DriftingCamera = ({ currentSpeed }: { currentSpeed: number }) => {
    useFrame((state) => {
        const time = state.clock.elapsedTime;
        // Drift sway
        state.camera.position.x = Math.sin(time * currentSpeed * 0.3) * 3;
        state.camera.position.y = 1 + Math.abs(Math.sin(time * currentSpeed * 1.5)) * 0.2; // slight bumps
        // state.camera.rotation.z = Math.sin(time * currentSpeed * 0.3) * 0.05; // banking curve
        state.camera.lookAt(0, 0, -30);
    });
    return null;
};

// --- Main Game Component ---

interface HighwayNode { id: string; type: 'boost' | 'spike'; position: [number, number, number]; }

export const NeonDrift: React.FC<NeonDriftProps> = ({ onComplete, difficulty, t }) => {
    const { queueDialogue } = useDialogue();
    const [score, setScore] = useState(0); // Score acts as Distance Traveled
    const [timeLeft, setTimeLeft] = useState(60);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');

    const [currentSpeed, setCurrentSpeed] = useState(3);
    const [nodes, setNodes] = useState<HighwayNode[]>([]);
    const [glitchActive, setGlitchActive] = useState(false);

    const [advisorMsg, setAdvisorMsg] = useState("Engines purring. Follow the neon line.");
    const [adversaryMsg, setAdversaryMsg] = useState("You're driving blind into the mainframe.");

    const diffMul = difficulty === 'HARD' ? 1.5 : difficulty === 'MEDIUM' ? 1.2 : 1;
    const spawnInterval = Math.max(400, 1500 - (currentSpeed * 100));

    // Briefing
    useEffect(() => {
        queueDialogue([
            { id: `neon-brief-${Date.now()}`, character: 'SYNTAX', text: "Welcome to the Neon Drift. Hit the cyan rings to accelerate." },
            { id: `neon-brief2-${Date.now()}`, character: 'BYTE', text: "Watch out for the red Data Spikes. They'll crash your system.", isGlitchy: true },
        ]);
    }, [queueDialogue]);

    // Spawner
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        const interval = setInterval(() => {
            setNodes(prev => {
                if (prev.length >= 10) return prev;

                // Spawn way back in the Z axis
                const isSpike = Math.random() > 0.6;
                const laneX = (Math.random() - 0.5) * 16; // Random lane between -8 and 8
                const yPos = isSpike ? -1 : 0.5; // Rings float a bit higher

                return [...prev, {
                    id: `${Date.now()}-${Math.random()}`,
                    type: isSpike ? 'spike' : 'boost',
                    position: [laneX, yPos, -60]
                }];
            });
        }, spawnInterval);

        return () => clearInterval(interval);
    }, [gameState, spawnInterval]);

    // Node clean up & collision logic (if missed)
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const interval = setInterval(() => {
            setNodes(prev => {
                const passed = prev.filter(n => n.position[2] > 5);
                const active = prev.filter(n => n.position[2] <= 5);

                passed.forEach(node => {
                    if (node.type === 'spike') {
                        // Penalty for missing spike? No, missing spike is fine.
                    } else if (node.type === 'boost') {
                        // Missing boost reduces speed slightly
                        setCurrentSpeed(s => Math.max(1, s - 0.1));
                    }
                });

                return active;
            });
            // Passive distance score based on speed
            setScore(s => s + Math.floor(currentSpeed * 2 * diffMul));
        }, 500);
        return () => clearInterval(interval);
    }, [gameState, currentSpeed, diffMul]);

    // Agent Chatter
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const aLines = [
            "Speed is optimal.",
            "Navigating sector 7G with style.",
            "Keep hitting those accelerators.",
            `Current velocity multiplier: ${currentSpeed.toFixed(1)}x`
        ];
        const eLines = [
            "Data fragmentation imminent.",
            "You cannot outrun the system.",
            "That spike nearly cost you everything.",
            "Slow down, human."
        ];

        const intervalId = setInterval(() => {
            if (currentSpeed < 2 || Math.random() > 0.6) {
                setAdversaryMsg(eLines[Math.floor(Math.random() * eLines.length)]);
                if (currentSpeed < 2) audio.playSystemMessage?.({ type: 'warning' });
            } else {
                setAdvisorMsg(aLines[Math.floor(Math.random() * aLines.length)]);
            }
        }, 5500);
        return () => clearInterval(intervalId);
    }, [gameState, currentSpeed]);

    // Timer Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    const isWin = score >= 5000;
                    setGameState(isWin ? 'SUCCESS' : 'FAILED');

                    if (isWin) {
                        audio.playSuccess();
                        queueDialogue([
                            { id: `neon-win-${Date.now()}`, character: 'ATHENA', text: `Destination reached. Total distance: ${score} units.` }
                        ]);
                    } else {
                        audio.playError();
                        queueDialogue([
                            { id: `neon-fail-${Date.now()}`, character: 'BYTE', text: "Ran out of time. Distance insufficient.", isGlitchy: true }
                        ]);
                    }
                    onComplete(isWin ? score : 0, { completionTime: 60 - prev, difficulty });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, score, onComplete, difficulty, queueDialogue]);

    // Interaction handlers
    const handleBoostClick = useCallback((id: string) => {
        if (gameState !== 'PLAYING') return;
        audio.playClick();
        setNodes(prev => prev.filter(n => n.id !== id));
        setCurrentSpeed(s => Math.min(10, s + 1));
        setScore(s => s + Math.floor(100 * diffMul));
    }, [gameState, diffMul]);

    const handleSpikeClick = useCallback((id: string) => {
        if (gameState !== 'PLAYING') return;
        audio.playClick(); // Destroying it proactively is good!
        setNodes(prev => prev.filter(n => n.id !== id));
        setScore(s => s + Math.floor(50 * diffMul));
        // Bonus: destroying spike gives a tiny speed boost 
        setCurrentSpeed(s => Math.min(10, s + 0.2));
    }, [gameState, diffMul]);

    // If you actually click the canvas background (missed a click), assume you crashed or lost focus
    const handleMissClick = () => {
        if (gameState !== 'PLAYING') return;
        // penalty for random clicking
        setCurrentSpeed(s => Math.max(1, s - 0.5));
        setGlitchActive(true);
        audio.playError?.();
        setTimeout(() => setGlitchActive(false), 200);
    };

    return (
        <div className="relative w-full h-[600px] rounded-xl overflow-hidden border border-[#ff00aa]/30 bg-[#020108] shadow-[0_0_30px_#ff00aa20]">
            {/* Cinematic HUD Overlay */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
                <div className="flex flex-col gap-4">
                    {/* Velocity / Speedometer */}
                    <div className="bg-black/40 backdrop-blur-xl rounded-xl p-3 border border-[#00ffff]/40 w-48 shadow-[0_0_15px_#00ffff20]">
                        <div className="flex items-center gap-2 text-[#00ffff] mb-2">
                            <Gauge className="w-4 h-4" />
                            <span className="text-xs uppercase tracking-widest font-bold">Velocity</span>
                        </div>
                        <div className="flex items-end gap-2 text-[#00ffff]">
                            <span className="text-3xl font-mono font-black italic tabular-nums leading-none">{currentSpeed.toFixed(1)}</span>
                            <span className="text-sm font-bold uppercase pb-1">GB/s</span>
                        </div>
                        <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#00ffff] transition-all duration-200"
                                style={{ width: `${(currentSpeed / 10) * 100}%`, boxShadow: '0 0 10px #00ffff' }}
                            />
                        </div>
                    </div>

                    {/* Distance Score */}
                    <div className="bg-black/40 backdrop-blur-xl rounded-xl p-3 border border-[#ff00aa]/40 shadow-[0_0_15px_#ff00aa20]">
                        <div className="flex items-center gap-2 text-[#ff00aa] mb-1">
                            <Activity className="w-4 h-4" />
                            <span className="text-xs uppercase tracking-widest font-bold">Distance</span>
                        </div>
                        <div className="text-xl font-mono text-white tracking-widest">{score.toLocaleString()} m</div>
                    </div>
                </div>

                <div className="bg-black/40 backdrop-blur-xl rounded-xl p-3 border border-white/20 flex flex-col items-end">
                    <div className="flex items-center gap-2 text-white/80 mb-1">
                        <FastForward className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-widest font-bold">ETA</span>
                    </div>
                    <div className={`text-4xl font-mono font-black tracking-widest ${timeLeft <= 10 ? 'text-[#ff3300] animate-pulse' : 'text-white'}`}>{timeLeft}s</div>
                </div>
            </div>

            {/* Narrative Comm Panels */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row gap-4 z-10 pointer-events-none">
                <div className="flex-1 bg-gradient-to-r from-[#00ffff]/10 to-transparent backdrop-blur-md rounded-xl p-4 border-l-4 border-[#00ffff]">
                    <div className="text-[10px] text-[#00ffff] mb-1 uppercase tracking-widest font-bold flex items-center gap-2"><Shield className="w-3 h-3" /> Co-Pilot Agent</div>
                    <div className="text-sm text-white/90 font-mono tracking-wide">{advisorMsg}</div>
                </div>
                <div className="flex-1 bg-gradient-to-l from-[#ff3300]/10 to-transparent backdrop-blur-md rounded-xl p-4 border-r-4 border-[#ff3300] text-right">
                    <div className="text-[10px] text-[#ff3300] mb-1 uppercase tracking-widest font-bold flex items-center justify-end gap-2">Tracker AI <Zap className="w-3 h-3" /></div>
                    <div className="text-sm text-white/90 font-mono tracking-wide">{adversaryMsg}</div>
                </div>
            </div>

            {/* Game Over States */}
            <AnimatePresence>
                {gameState !== 'PLAYING' && (
                    <motion.div
                        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                        animate={{ opacity: 1, backdropFilter: 'blur(16px)' }}
                        className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/80"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-[#020108] border border-white/10 p-12 rounded-3xl text-center relative overflow-hidden shadow-2xl max-w-lg w-full"
                        >
                            <div className={`absolute top-0 left-0 w-full h-2 ${gameState === 'SUCCESS' ? 'bg-[#ff00aa]' : 'bg-[#ff3300]'}`} />

                            <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${gameState === 'SUCCESS' ? 'bg-[#ff00aa]/10' : 'bg-[#ff3300]/10'}`}>
                                {gameState === 'SUCCESS' ? <FastForward className="w-12 h-12 text-[#ff00aa]" /> : <SkullIcon className="w-12 h-12 text-[#ff3300]" />}
                            </div>

                            <div className={`text-4xl font-black uppercase tracking-[0.2em] mb-4 ${gameState === 'SUCCESS' ? 'text-[#ff00aa]' : 'text-[#ff3300]'} drop-shadow-[0_0_15px_currentColor]`}>
                                {gameState === 'SUCCESS' ? 'DESTINATION REACHED' : 'SYSTEM CRASH'}
                            </div>

                            <div className="text-white/60 uppercase tracking-widest text-sm mb-2">Total Distance</div>
                            <div className="text-5xl text-white font-mono font-bold mb-8">{score.toLocaleString()} <span className="text-xl">m</span></div>

                            <div className="inline-block px-4 py-2 rounded-full border border-white/10 text-white/40 text-sm font-mono tracking-widest">
                                Difficulty: {difficulty}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3D Interactive Layer */}
            <div className="absolute inset-0 z-0 cursor-crosshair" onClick={handleMissClick}>
                <Canvas camera={{ position: [0, 1, 5], fov: 75 }} gl={{ antialias: false }}>
                    <color attach="background" args={['#020108']} />
                    <fog attach="fog" args={['#020108', 20, 80]} />
                    <ambientLight intensity={0.5} color="#ff00aa" />

                    <SynthwaveSun />
                    <GridFloor speed={currentSpeed} />
                    <DriftingCamera currentSpeed={currentSpeed} />

                    {nodes.map(node => node.type === 'boost' ? (
                        <BoostRing
                            key={node.id}
                            id={node.id}
                            position={node.position}
                            speed={currentSpeed}
                            onClick={handleBoostClick}
                        />
                    ) : (
                        <DataSpike
                            key={node.id}
                            id={node.id}
                            position={node.position}
                            speed={currentSpeed}
                            onClick={handleSpikeClick}
                        />
                    ))}

                    {/* Highway speed lines (Sparkles stretched) */}
                    <Sparkles
                        count={150}
                        scale={[40, 10, 100]}
                        size={10}
                        speed={currentSpeed}
                        opacity={0.4}
                        color="#00ffff"
                        position={[0, 5, -20]}
                    />

                    <EffectComposer disableNormalPass>
                        <Bloom luminanceThreshold={0.15} luminanceSmoothing={0.9} mipmapBlur intensity={2} />
                        <ChromaticAberration
                            blendFunction={BlendFunction.NORMAL}
                            offset={new THREE.Vector2(0.003 + currentSpeed * 0.0005, 0.003)}
                            radialModulation={false}
                            modulationOffset={0}
                        />
                        <Scanline blendFunction={BlendFunction.OVERLAY} density={1.5} opacity={0.3} />
                        {glitchActive && (
                            <Glitch delay={new THREE.Vector2(0, 0)} duration={new THREE.Vector2(0.2, 0.4)} mode={GlitchMode.SPORADIC} active ratio={0.8} />
                        )}
                    </EffectComposer>
                </Canvas>
            </div>
        </div>
    );
};
