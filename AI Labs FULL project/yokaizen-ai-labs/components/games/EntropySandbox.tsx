import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Icosahedron, MeshDistortMaterial, Float, Sparkles, MeshTransmissionMaterial, Torus } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch, Vignette, Noise } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Activity, Shield, Zap, AlertTriangle, Crosshair, Cpu, TerminalSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../../services/audioService';
import { useDialogue } from '../../contexts/DialogueContext';

export interface EntropySandboxProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

// --- 3D Components ---

const EntropyCore = ({ entropyLevel }: { entropyLevel: number }) => {
    const coreRef = useRef<THREE.Mesh>(null);
    const ring1Ref = useRef<THREE.Mesh>(null);
    const ring2Ref = useRef<THREE.Mesh>(null);

    // Normalize entropy (0 to 1)
    const normalizedEntropy = Math.min(Math.max(entropyLevel / 100, 0), 1);

    useFrame((state) => {
        const time = state.clock.elapsedTime;
        const speedMultiplier = 1 + normalizedEntropy * 5;

        if (coreRef.current) {
            coreRef.current.rotation.y = time * 0.5 * speedMultiplier;
            coreRef.current.rotation.x = time * 0.3 * speedMultiplier;
            const pulse = 1 + Math.sin(time * 8) * (0.05 + normalizedEntropy * 0.15);
            coreRef.current.scale.setScalar(pulse);
        }
        if (ring1Ref.current) {
            ring1Ref.current.rotation.x = time * 0.8 * speedMultiplier;
            ring1Ref.current.rotation.y = time * 0.6 * speedMultiplier;
        }
        if (ring2Ref.current) {
            ring2Ref.current.rotation.y = -time * 0.5 * speedMultiplier;
            ring2Ref.current.rotation.z = time * 0.4 * speedMultiplier;
        }
    });

    // Color interps based on entropy (Cyan -> Orange -> Red)
    const coreColor = new THREE.Color().lerpColors(
        new THREE.Color('#00ffff'),
        new THREE.Color('#ff3300'),
        normalizedEntropy
    );

    return (
        <group>
            {/* Inner Distorted Core */}
            <Float speed={2} floatIntensity={0.5} rotationIntensity={0.5}>
                <mesh ref={coreRef}>
                    <icosahedronGeometry args={[2, 4]} />
                    <MeshDistortMaterial
                        color={coreColor}
                        emissive={coreColor}
                        emissiveIntensity={1 + normalizedEntropy * 2}
                        clearcoat={1}
                        metalness={0.8}
                        roughness={0.2}
                        distort={0.2 + normalizedEntropy * 0.6}
                        speed={2 + normalizedEntropy * 10}
                    />
                </mesh>
            </Float>

            {/* Stabilization Rings */}
            <Torus ref={ring1Ref} args={[3.2, 0.05, 16, 100]} rotation={[Math.PI / 3, 0, 0]}>
                <meshStandardMaterial color={coreColor} emissive={coreColor} emissiveIntensity={2} toneMapped={false} />
            </Torus>
            <Torus ref={ring2Ref} args={[4.5, 0.03, 16, 100]} rotation={[0, Math.PI / 4, 0]}>
                <meshStandardMaterial color="#aa88ff" emissive="#aa88ff" emissiveIntensity={1} transparent opacity={0.6 - normalizedEntropy * 0.4} />
            </Torus>

            {/* Dynamic Light tied to core */}
            <pointLight distance={15} intensity={4 + normalizedEntropy * 4} color={coreColor} />
        </group>
    );
};

const Anomaly = ({ position, onClick, id }: any) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.elapsedTime * 3;
            meshRef.current.rotation.y = state.clock.elapsedTime * 4;
            const jitter = Math.sin(state.clock.elapsedTime * 20) * 0.05;
            meshRef.current.position.y = position[1] + jitter;
        }
    });

    return (
        <Float speed={5} rotationIntensity={2} floatIntensity={1}>
            <mesh
                ref={meshRef}
                position={position}
                onClick={(e) => { e.stopPropagation(); onClick(id); }}
                onPointerOver={() => { setHovered(true); document.body.style.cursor = 'crosshair'; }}
                onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
                scale={hovered ? 1.3 : 1}
            >
                <octahedronGeometry args={[0.6, 0]} />
                <meshStandardMaterial
                    color="#ff00aa"
                    emissive={hovered ? "#ffffff" : "#ff00aa"}
                    emissiveIntensity={hovered ? 4 : 2}
                    wireframe={!hovered}
                    roughness={0.2}
                    metalness={0.8}
                />
                <pointLight distance={4} intensity={2} color="#ff00aa" />
            </mesh>
        </Float>
    );
};

const CameraShake = ({ entropyLevel }: { entropyLevel: number }) => {
    useFrame((state) => {
        const shakeIntensity = Math.max(0, (entropyLevel - 50) / 100) * 0.3;
        if (shakeIntensity > 0) {
            state.camera.position.x = (Math.random() - 0.5) * shakeIntensity;
            state.camera.position.y = (Math.random() - 0.5) * shakeIntensity;
            state.camera.lookAt(0, 0, 0);
        } else {
            state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, 0, 0.1);
            state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 0, 0.1);
        }
    });
    return null;
};

// --- Game Logic ---

interface GameNode { id: string; position: [number, number, number]; spawnedAt: number; }

export const EntropySandbox: React.FC<EntropySandboxProps> = ({ onComplete, difficulty, t }) => {
    const { queueDialogue } = useDialogue();
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');

    // Entropy goes from 0 to 100. If it hits 100, game over.
    const [entropyLevel, setEntropyLevel] = useState(0);
    const [anomalies, setAnomalies] = useState<GameNode[]>([]);

    const [advisorMsg, setAdvisorMsg] = useState("Quantum core stable. Await anomalies.");
    const [adversaryMsg, setAdversaryMsg] = useState("Entropy will inevitably consume this system.");

    const diffMul = difficulty === 'HARD' ? 1.5 : difficulty === 'MEDIUM' ? 1.2 : 1;
    const maxAnomalies = difficulty === 'HARD' ? 8 : difficulty === 'MEDIUM' ? 6 : 4;

    // Narrative Briefing
    useEffect(() => {
        queueDialogue([
            { id: `entropy-brief1-${Date.now()}`, character: 'ATHENA', text: "The Quantum Core is destabilizing. Anomalies are spawning in the void." },
            { id: `entropy-brief2-${Date.now()}`, character: 'SYNTAX', text: "Target the anomalies to extract data and reduce entropy. Keep entropy below 100%." },
        ]);
    }, [queueDialogue]);

    // Anomaly Spawner
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        const spawnInterval = Math.max(600, 2000 - (entropyLevel * 10) - (score / 10));

        const interval = setInterval(() => {
            setAnomalies(prev => {
                if (prev.length >= maxAnomalies) return prev;
                // Spawn position on a sphere surface or nearby
                const radius = 6 + Math.random() * 4;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos((Math.random() * 2) - 1);

                const x = radius * Math.sin(phi) * Math.cos(theta);
                const y = radius * Math.sin(phi) * Math.sin(theta);
                const z = radius * Math.cos(phi);

                return [...prev, {
                    id: `${Date.now()}-${Math.random()}`,
                    position: [x, y, z],
                    spawnedAt: Date.now()
                }];
            });
        }, spawnInterval);

        return () => clearInterval(interval);
    }, [gameState, entropyLevel, score, maxAnomalies]);

    // Entropy Increase Logic (Unattended anomalies increase entropy)
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const interval = setInterval(() => {
            if (anomalies.length > 0) {
                // Each active anomaly adds passive entropy
                setEntropyLevel(prev => {
                    const next = prev + (anomalies.length * 0.5 * diffMul);
                    return Math.min(next, 100);
                });
            } else {
                // Decay entropy slightly if no anomalies
                setEntropyLevel(prev => Math.max(prev - 0.2, 0));
            }
        }, 500);
        return () => clearInterval(interval);
    }, [gameState, anomalies.length, diffMul]);

    // Agent Chatter
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const aLines = [
            "Containment fields are holding.",
            "Energy fluctuations within acceptable parameters.",
            "Keep extracting the anomaly data.",
            "Core temperature stable."
        ];
        const eLines = [
            "The chaotic resonance is beautiful.",
            "You cannot fight the second law of thermodynamics.",
            "The core is fracturing. Let it happen.",
            "Too many variables. You are losing control."
        ];

        const intervalId = setInterval(() => {
            if (entropyLevel > 60 || Math.random() > 0.6) {
                setAdversaryMsg(eLines[Math.floor(Math.random() * eLines.length)]);
                if (entropyLevel > 60) audio.playSystemMessage?.({ type: 'warning' });
            } else {
                setAdvisorMsg(aLines[Math.floor(Math.random() * aLines.length)]);
            }
        }, 6000);
        return () => clearInterval(intervalId);
    }, [gameState, entropyLevel]);

    // Timer & Game Over Checking
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        // Critical Failure Check
        if (entropyLevel >= 100) {
            setGameState('FAILED');
            audio.playError();
            queueDialogue([
                { id: `entropy-fail-${Date.now()}`, character: 'BYTE', text: "CRITICAL FAILURE. Core meltdown imminent.", isGlitchy: true }
            ]);
            onComplete(0, { completionTime: 60 - timeLeft, difficulty, failureReason: "Meltdown" });
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // Time survived = Victory
                    setGameState('SUCCESS');
                    audio.playSuccess();
                    queueDialogue([
                        { id: `entropy-win-${Date.now()}`, character: 'ATHENA', text: `Simulation complete. Core stabilized. Final extracted data: ${score} TB.` }
                    ]);
                    onComplete(score, { completionTime: 60, difficulty });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, score, entropyLevel, timeLeft, onComplete, difficulty, queueDialogue]);

    // Interaction
    const handleAnomalyClick = useCallback((id: string) => {
        if (gameState !== 'PLAYING') return;
        audio.playClick();
        setAnomalies(prev => prev.filter(a => a.id !== id));

        // Reduce entropy and boost score
        setEntropyLevel(prev => Math.max(0, prev - 5));
        setScore(s => s + Math.floor(25 * diffMul));
    }, [gameState, diffMul]);


    // Dynamic visuals based on entropy
    const normalizedEntropy = Math.min(Math.max(entropyLevel / 100, 0), 1);
    const glitchActive = normalizedEntropy > 0.8;
    const isCritical = normalizedEntropy > 0.7;

    return (
        <div className="relative w-full h-[600px] rounded-xl overflow-hidden border border-[#00ffff]/20 bg-[#02050a] shadow-2xl">
            {/* Cinematic HUD */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
                <div className="flex flex-col gap-4">
                    {/* Data Score */}
                    <div className="bg-black/50 backdrop-blur-xl rounded-2xl p-4 border border-[#00ffff]/30 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#00ffff]/10 to-transparent" />
                        <div className="flex items-center gap-2 text-[#00ffff] mb-1">
                            <Activity className="w-4 h-4" />
                            <span className="text-xs uppercase tracking-widest font-bold">Data Extracted</span>
                        </div>
                        <div className="text-3xl font-mono font-black text-white tabular-nums drop-shadow-[0_0_10px_#00ffff]">{score} TB</div>
                    </div>

                    {/* Entropy Meter */}
                    <div className="bg-black/50 backdrop-blur-xl rounded-2xl p-4 border border-white/10 w-48">
                        <div className="flex justify-between items-end mb-2">
                            <div className="flex items-center gap-2 text-white/80">
                                <AlertTriangle className={`w-4 h-4 ${isCritical ? 'text-[#ff3300] animate-pulse' : 'text-[#ffaa00]'}`} />
                                <span className="text-xs uppercase tracking-widest font-bold">Entropy</span>
                            </div>
                            <span className={`text-sm font-mono font-bold ${isCritical ? 'text-[#ff3300]' : 'text-white'}`}>{entropyLevel.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-300 ${isCritical ? 'bg-[#ff3300]' : entropyLevel > 40 ? 'bg-[#ffaa00]' : 'bg-[#00ffff]'}`}
                                style={{ width: `${entropyLevel}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                    <div className="bg-black/50 backdrop-blur-xl rounded-2xl p-4 border border-[#aa88ff]/30">
                        <div className="flex items-center gap-2 text-[#aa88ff] mb-1">
                            <TerminalSquare className="w-4 h-4" />
                            <span className="text-xs uppercase tracking-widest font-bold">Time Remaining</span>
                        </div>
                        <div className={`text-4xl font-mono font-black tabular-nums ${timeLeft <= 10 ? 'text-[#ff3300] animate-pulse drop-shadow-[0_0_10px_#ff3300]' : 'text-white drop-shadow-[0_0_10px_#aa88ff]'}`}>{timeLeft}s</div>
                    </div>
                </div>
            </div>

            {/* Critical Warning Flash */}
            <AnimatePresence>
                {isCritical && gameState === 'PLAYING' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.15 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                        className="absolute inset-0 bg-[#ff3300] z-0 pointer-events-none"
                    />
                )}
            </AnimatePresence>

            {/* Narrative Comm Panels */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row gap-4 z-10 pointer-events-none">
                <div className="flex-1 bg-gradient-to-r from-[#00ffff]/10 to-transparent backdrop-blur-md rounded-xl p-4 border-l-4 border-[#00ffff]">
                    <div className="text-[10px] text-[#00ffff] mb-1 uppercase tracking-widest font-bold flex items-center gap-2"><Shield className="w-3 h-3" /> Core Logistics</div>
                    <div className="text-sm text-white/90 font-mono leading-relaxed">{advisorMsg}</div>
                </div>
                <div className="flex-1 bg-gradient-to-l from-[#ff3300]/10 to-transparent backdrop-blur-md rounded-xl p-4 border-r-4 border-[#ff3300] text-right">
                    <div className="text-[10px] text-[#ff3300] mb-1 uppercase tracking-widest font-bold flex items-center justify-end gap-2">Void Entity <Zap className="w-3 h-3" /></div>
                    <div className="text-sm text-white/90 font-mono leading-relaxed">{adversaryMsg}</div>
                </div>
            </div>

            {/* Game Over Screen */}
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
                            className="bg-[#02050a] border border-white/10 p-12 rounded-3xl text-center relative overflow-hidden shadow-2xl max-w-lg w-full"
                        >
                            <div className={`absolute top-0 left-0 w-full h-2 ${gameState === 'SUCCESS' ? 'bg-[#00ffff]' : 'bg-[#ff3300]'}`} />

                            <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${gameState === 'SUCCESS' ? 'bg-[#00ffff]/10' : 'bg-[#ff3300]/10'}`}>
                                {gameState === 'SUCCESS' ? <Shield className="w-12 h-12 text-[#00ffff]" /> : <AlertTriangle className="w-12 h-12 text-[#ff3300]" />}
                            </div>

                            <div className={`text-4xl font-black uppercase tracking-[0.2em] mb-4 ${gameState === 'SUCCESS' ? 'text-[#00ffff]' : 'text-[#ff3300]'} drop-shadow-[0_0_15px_currentColor]`}>
                                {gameState === 'SUCCESS' ? 'SYSTEM SECURED' : 'MELTDOWN DETECTED'}
                            </div>

                            <div className="mt-8 space-y-4">
                                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                                    <span className="text-white/60 uppercase tracking-widest text-sm">Data Extracted</span>
                                    <span className="text-3xl text-white font-mono font-bold">{score} TB</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-white/60 uppercase tracking-widest text-sm">Peak Entropy</span>
                                    <span className={`text-2xl font-mono font-bold ${gameState === 'SUCCESS' ? 'text-[#ffaa00]' : 'text-[#ff3300]'}`}>{entropyLevel.toFixed(1)}%</span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3D WebGL Canvas */}
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 0, 18], fov: 60 }} gl={{ antialias: false }}>
                    <color attach="background" args={['#010204']} />
                    <fog attach="fog" args={['#010204', 10, 40]} />
                    <ambientLight intensity={0.2} color="#00ffff" />
                    <CameraShake entropyLevel={entropyLevel} />

                    <EntropyCore entropyLevel={entropyLevel} />

                    {anomalies.map(anomaly => (
                        <Anomaly
                            key={anomaly.id}
                            id={anomaly.id}
                            position={anomaly.position}
                            onClick={handleAnomalyClick}
                        />
                    ))}

                    {/* Background void particles */}
                    <Sparkles count={500} scale={35} size={1.5} speed={0.2} opacity={0.3} color="#00ffff" />
                    {/* Chaotic particles tied to entropy */}
                    {normalizedEntropy > 0.2 && (
                        <Sparkles count={100 + normalizedEntropy * 300} scale={20} size={3} speed={normalizedEntropy * 2} opacity={normalizedEntropy} color="#ff3300" />
                    )}

                    <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5 + normalizedEntropy * 2} />

                    <EffectComposer disableNormalPass>
                        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur intensity={1.5 + normalizedEntropy * 2} />
                        <ChromaticAberration
                            blendFunction={BlendFunction.NORMAL}
                            offset={new THREE.Vector2(0.002 + normalizedEntropy * 0.008, 0.002 + normalizedEntropy * 0.008)}
                            radialModulation={false}
                            modulationOffset={0}
                        />
                        <Noise opacity={0.05 + normalizedEntropy * 0.15} blendFunction={BlendFunction.OVERLAY} />
                        <Vignette eskil={false} offset={0.1} darkness={1.1} />
                        {glitchActive && (
                            <Glitch delay={new THREE.Vector2(0, 0)} duration={new THREE.Vector2(0.2, 0.6)} mode={GlitchMode.SPORADIC} active ratio={normalizedEntropy} />
                        )}
                    </EffectComposer>
                </Canvas>
            </div>
        </div>
    );
};
