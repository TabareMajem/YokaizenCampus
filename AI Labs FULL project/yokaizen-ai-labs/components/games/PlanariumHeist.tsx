import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Sparkles, Stars, Torus, Sphere, MeshDistortMaterial } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch, Vignette } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Activity, Shield, Zap, AlertTriangle, Lock, Eye, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../../services/audioService';
import { useDialogue } from '../../contexts/DialogueContext';

export interface PlanariumHeistProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

// --- 3D Environment Components ---

const SunCore = ({ securityLevel }: { securityLevel: number }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const glowRef = useRef<THREE.Mesh>(null);
    const normalizedSecurity = Math.min(securityLevel / 100, 1);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (meshRef.current) {
            meshRef.current.rotation.y = t * 0.2;
            const pulse = 1 + Math.sin(t * (2 + normalizedSecurity * 5)) * 0.05;
            meshRef.current.scale.setScalar(pulse);
        }
        if (glowRef.current) {
            glowRef.current.scale.setScalar(1 + normalizedSecurity * 0.5 + Math.sin(t * 5) * 0.1);
        }
    });

    // Sun turns from Gold to Red as security rises
    const color = new THREE.Color().lerpColors(new THREE.Color('#ffaa00'), new THREE.Color('#ff0033'), normalizedSecurity);

    return (
        <group>
            <mesh ref={meshRef}>
                <sphereGeometry args={[2, 64, 64]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} roughness={0.4} />
            </mesh>
            {/* Halo Glow */}
            <mesh ref={glowRef}>
                <sphereGeometry args={[2.2, 32, 32]} />
                <meshBasicMaterial color={color} transparent opacity={0.15 + normalizedSecurity * 0.2} blending={THREE.AdditiveBlending} />
            </mesh>
            <pointLight distance={30} intensity={5 + normalizedSecurity * 5} color={color} />
        </group>
    );
};

// --- Orbiting Bodies ---

const VaultPlanet = ({ radius, speed, angleOffset, isHacked, onClick, id }: any) => {
    const groupRef = useRef<THREE.Group>(null);
    const planetRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
        if (!groupRef.current) return;
        const time = state.clock.elapsedTime;
        // Orbit revolution
        groupRef.current.rotation.y = time * speed + angleOffset;

        if (planetRef.current) {
            // Planet rotation
            planetRef.current.rotation.y += 0.02;
            planetRef.current.scale.setScalar(hovered && !isHacked ? 1.2 : 1);
        }
    });

    const materialColor = isHacked ? "#333333" : "#00ffff";
    const emissiveColor = isHacked ? "#000000" : "#00ffff";

    return (
        <group ref={groupRef}>
            {/* Orbit path line */}
            <Torus args={[radius, 0.02, 16, 100]} rotation={[Math.PI / 2, 0, 0]}>
                <meshBasicMaterial color="#ffffff" transparent opacity={0.1} />
            </Torus>

            <mesh
                ref={planetRef}
                position={[radius, 0, 0]}
                onClick={(e) => { e.stopPropagation(); if (!isHacked) onClick(id); }}
                onPointerOver={() => { if (!isHacked) { setHovered(true); document.body.style.cursor = 'crosshair'; } }}
                onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
            >
                <sphereGeometry args={[0.6, 32, 32]} />
                <meshPhysicalMaterial
                    color={materialColor}
                    emissive={emissiveColor}
                    emissiveIntensity={hovered && !isHacked ? 2 : (isHacked ? 0 : 1)}
                    clearcoat={1}
                    roughness={0.1}
                    metalness={0.8}
                />
                {!isHacked && hovered && <pointLight distance={3} intensity={1} color="#00ffff" />}
            </mesh>
        </group>
    );
};

const GuardProbe = ({ radius, speed, angleOffset, onClick, id }: any) => {
    const groupRef = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (!groupRef.current) return;
        const time = state.clock.elapsedTime;
        // Faster, erratic revolution
        groupRef.current.rotation.y = time * speed + angleOffset;
        groupRef.current.rotation.z = Math.sin(time * speed) * 0.2; // Slight wobble

        if (meshRef.current) {
            meshRef.current.rotation.x += 0.05;
            meshRef.current.rotation.y += 0.05;
        }
    });

    return (
        <group ref={groupRef}>
            <Torus args={[radius, 0.01, 16, 100]} rotation={[Math.PI / 2, 0, 0]}>
                <meshBasicMaterial color="#ff0033" transparent opacity={0.1} />
            </Torus>

            <mesh
                ref={meshRef}
                position={[radius, 0, 0]}
                onClick={(e) => { e.stopPropagation(); onClick(id); }}
                onPointerOver={() => { document.body.style.cursor = 'not-allowed'; }}
                onPointerOut={() => { document.body.style.cursor = 'auto'; }}
            >
                <octahedronGeometry args={[0.5, 0]} />
                <meshStandardMaterial
                    color="#ff0033"
                    emissive="#ff0033"
                    emissiveIntensity={2}
                    wireframe
                />
                <pointLight distance={5} intensity={2} color="#ff0033" />
            </mesh>
        </group>
    );
};

// --- Main Game Component ---

interface PlanetNode {
    id: string;
    type: 'vault' | 'guard';
    radius: number;
    speed: number;
    angleOffset: number;
    isHacked: boolean;
}

export const PlanariumHeist: React.FC<PlanariumHeistProps> = ({ onComplete, difficulty, t }) => {
    const { queueDialogue } = useDialogue();
    const [hackedCount, setHackedCount] = useState(0);
    const [securityLevel, setSecurityLevel] = useState(0); // 0 to 100
    const [timeLeft, setTimeLeft] = useState(60);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');

    const [nodes, setNodes] = useState<PlanetNode[]>([]);
    const [glitchActive, setGlitchActive] = useState(false);

    const [advisorMsg, setAdvisorMsg] = useState("Infiltrating the Planarium. Target the cyan vaults.");
    const [adversaryMsg, setAdversaryMsg] = useState("Security matrix active. Intruder detection online.");

    const diffMul = difficulty === 'HARD' ? 1.5 : difficulty === 'MEDIUM' ? 1.2 : 1;
    const totalVaults = difficulty === 'HARD' ? 12 : difficulty === 'MEDIUM' ? 8 : 6;
    const totalGuards = difficulty === 'HARD' ? 6 : difficulty === 'MEDIUM' ? 4 : 2;

    // Briefing & Setup
    useEffect(() => {
        queueDialogue([
            { id: `heist-brief-${Date.now()}`, character: 'ATHENA', text: "Welcome to the Planarium. Hack the Cyan Vaults to extract data." },
            { id: `heist-brief2-${Date.now()}`, character: 'SYNTAX', text: "Avoid the Red Guard Probes. They will trigger the security alarm." },
        ]);

        // Generate static solar system
        const initialNodes: PlanetNode[] = [];

        // Generate Vaults
        for (let i = 0; i < totalVaults; i++) {
            initialNodes.push({
                id: `vault-${i}`,
                type: 'vault',
                radius: 4 + Math.random() * 8, // Between 4 and 12 radius
                speed: (Math.random() * 0.2 + 0.1) * (Math.random() > 0.5 ? 1 : -1),
                angleOffset: Math.random() * Math.PI * 2,
                isHacked: false
            });
        }

        // Generate Guards
        for (let i = 0; i < totalGuards; i++) {
            initialNodes.push({
                id: `guard-${i}`,
                type: 'guard',
                radius: 3 + Math.random() * 9,
                speed: (Math.random() * 0.4 + 0.2) * (Math.random() > 0.5 ? 1 : -1), // Faster
                angleOffset: Math.random() * Math.PI * 2,
                isHacked: false
            });
        }

        setNodes(initialNodes);
    }, [queueDialogue, totalVaults, totalGuards]);

    // Passive Security Increase
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const interval = setInterval(() => {
            // Passive security increase based on difficulty
            setSecurityLevel(prev => Math.min(100, prev + 0.5 * diffMul));
        }, 1000);
        return () => clearInterval(interval);
    }, [gameState, diffMul]);

    // Agent Chatter
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const aLines = [
            "We are ghosts in the machine.",
            "Vault encryption bypassed smoothly.",
            "Keep moving, the Eye is searching.",
            `Hack progress: ${hackedCount}/${totalVaults}`
        ];
        const eLines = [
            "Anomalous orbital patterns detected.",
            "Raising security alert level.",
            "We are triangulating your position.",
            "You cannot hide in the void."
        ];

        const intervalId = setInterval(() => {
            if (securityLevel > 60 || Math.random() > 0.6) {
                setAdversaryMsg(eLines[Math.floor(Math.random() * eLines.length)]);
                if (securityLevel > 60) audio.playSystemMessage?.({ type: 'warning' });
            } else {
                setAdvisorMsg(aLines[Math.floor(Math.random() * aLines.length)]);
            }
        }, 6000);
        return () => clearInterval(intervalId);
    }, [gameState, securityLevel, hackedCount, totalVaults]);

    // Timer & Win/Loss Condition
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        // Critical Failure Check (Security 100%)
        if (securityLevel >= 100) {
            setGameState('FAILED');
            audio.playError();
            queueDialogue([
                { id: `heist-fail-${Date.now()}`, character: 'BYTE', text: "SYS-LOCKDOWN. YOU HAVE BEEN CAUGHT.", isGlitchy: true }
            ]);
            onComplete(Math.floor((hackedCount / totalVaults) * 500), { completionTime: 60 - timeLeft, difficulty, failureReason: "Alarm" });
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // Time ran out -> FAILED. Must hack all vaults.
                    setGameState('FAILED');
                    audio.playError();
                    queueDialogue([
                        { id: `heist-timeout-${Date.now()}`, character: 'ATHENA', text: "Time expired. Disconnecting to avoid tracing." }
                    ]);
                    onComplete(Math.floor((hackedCount / totalVaults) * 500), { completionTime: 60, difficulty, failureReason: "Timeout" });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, securityLevel, timeLeft, hackedCount, totalVaults, onComplete, difficulty, queueDialogue]);

    // Interaction handlers
    const handleVaultClick = useCallback((id: string) => {
        if (gameState !== 'PLAYING') return;
        audio.playClick();

        setNodes(prev => prev.map(n => n.id === id ? { ...n, isHacked: true } : n));

        setHackedCount(prev => {
            const next = prev + 1;
            // Check for win
            if (next >= totalVaults) {
                setGameState('SUCCESS');
                audio.playSuccess();
                const timeBonus = timeLeft * 10;
                const finalScore = 1000 + timeBonus;
                queueDialogue([
                    { id: `heist-win-${Date.now()}`, character: 'SYNTAX', text: `All vaults emptied. The perfect heist. Score: ${finalScore}` }
                ]);
                onComplete(finalScore, { completionTime: 60 - timeLeft, difficulty, timeBonus });
            }
            return next;
        });

        // Hacking successfully reduces security slightly
        setSecurityLevel(prev => Math.max(0, prev - 10));
    }, [gameState, timeLeft, totalVaults, onComplete, difficulty, queueDialogue]);

    const handleGuardClick = useCallback((id: string) => {
        if (gameState !== 'PLAYING') return;
        audio.playError();
        // Tripped alarm! Massive security spike
        setSecurityLevel(prev => Math.min(100, prev + 30));
        setGlitchActive(true);
        setTimeout(() => setGlitchActive(false), 600);
    }, [gameState]);


    const isCritical = securityLevel > 75;

    return (
        <div className="relative w-full h-[600px] rounded-xl overflow-hidden border border-[#00ffff]/20 bg-[#02030a] shadow-[0_0_30px_#00ffff20]">
            {/* Cinematic Glass HUD */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
                <div className="flex flex-col gap-4">
                    {/* Heist Progress */}
                    <div className="bg-black/50 backdrop-blur-xl rounded-2xl p-4 border border-[#00ffff]/40 shadow-[0_0_15px_#00ffff20] w-56">
                        <div className="flex items-center gap-2 text-[#00ffff] mb-2">
                            <Lock className="w-4 h-4" />
                            <span className="text-xs uppercase tracking-widest font-bold">Vaults Hacked</span>
                        </div>
                        <div className="flex items-end gap-2 text-white">
                            <span className="text-4xl font-mono font-black tabular-nums leading-none">{hackedCount}</span>
                            <span className="text-xl font-mono text-white/50 leading-none">/ {totalVaults}</span>
                        </div>
                        <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#00ffff] transition-all duration-300"
                                style={{ width: `${(hackedCount / totalVaults) * 100}%`, boxShadow: '0 0 10px #00ffff' }}
                            />
                        </div>
                    </div>

                    {/* Security Level */}
                    <div className={`bg-black/50 backdrop-blur-xl rounded-2xl p-4 border transition-colors ${isCritical ? 'border-[#ff0033] shadow-[0_0_15px_#ff003340]' : 'border-white/10'}`}>
                        <div className="flex justify-between items-end mb-2">
                            <div className={`flex items-center gap-2 ${isCritical ? 'text-[#ff0033]' : 'text-[#ffaa00]'}`}>
                                <Eye className={`w-4 h-4 ${isCritical ? 'animate-pulse' : ''}`} />
                                <span className="text-xs uppercase tracking-widest font-bold">Security Alarm</span>
                            </div>
                            <span className={`text-sm font-mono font-bold ${isCritical ? 'text-[#ff0033]' : 'text-white'}`}>{securityLevel.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 w-48 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-300 ${isCritical ? 'bg-[#ff0033]' : securityLevel > 40 ? 'bg-[#ffaa00]' : 'bg-[#ffffff]'}`}
                                style={{ width: `${securityLevel}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-black/50 backdrop-blur-xl rounded-2xl p-4 border border-[#ffaa00]/30 flex flex-col items-end">
                    <div className="flex items-center gap-2 text-[#ffaa00] mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-widest font-bold">Time Window</span>
                    </div>
                    <div className={`text-4xl font-mono font-black tabular-nums ${timeLeft <= 15 ? 'text-[#ff0033] animate-pulse drop-shadow-[0_0_10px_#ff0033]' : 'text-white drop-shadow-[0_0_10px_#ffaa00]'}`}>{timeLeft}s</div>
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
                        className="absolute inset-0 bg-[#ff0033] z-0 pointer-events-none"
                    />
                )}
            </AnimatePresence>

            {/* Narrative Comm Panels */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row gap-4 z-10 pointer-events-none">
                <div className="flex-1 bg-gradient-to-r from-[#00ffff]/10 to-transparent backdrop-blur-md rounded-xl p-4 border-l-4 border-[#00ffff]">
                    <div className="text-[10px] text-[#00ffff] mb-1 uppercase tracking-widest font-bold flex items-center gap-2"><Shield className="w-3 h-3" /> infiltration Ai</div>
                    <div className="text-sm text-white/90 font-mono tracking-wide">{advisorMsg}</div>
                </div>
                <div className="flex-1 bg-gradient-to-l from-[#ff0033]/10 to-transparent backdrop-blur-md rounded-xl p-4 border-r-4 border-[#ff0033] text-right">
                    <div className="text-[10px] text-[#ff0033] mb-1 uppercase tracking-widest font-bold flex items-center justify-end gap-2">Planarium Overwatch <Eye className="w-3 h-3" /></div>
                    <div className="text-sm text-white/90 font-mono tracking-wide">{adversaryMsg}</div>
                </div>
            </div>

            {/* Game Over States */}
            <AnimatePresence>
                {gameState !== 'PLAYING' && (
                    <motion.div
                        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                        animate={{ opacity: 1, backdropFilter: 'blur(16px)' }}
                        className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/90"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-[#02030a] border border-white/10 p-12 rounded-3xl text-center relative overflow-hidden shadow-2xl max-w-lg w-full"
                        >
                            <div className={`absolute top-0 left-0 w-full h-2 ${gameState === 'SUCCESS' ? 'bg-[#00ffff]' : 'bg-[#ff0033]'}`} />

                            <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${gameState === 'SUCCESS' ? 'bg-[#00ffff]/10' : 'bg-[#ff0033]/10'}`}>
                                {gameState === 'SUCCESS' ? <CheckCircle2 className="w-12 h-12 text-[#00ffff]" /> : <Lock className="w-12 h-12 text-[#ff0033]" />}
                            </div>

                            <div className={`text-4xl font-black uppercase tracking-[0.2em] mb-4 ${gameState === 'SUCCESS' ? 'text-[#00ffff]' : 'text-[#ff0033]'} drop-shadow-[0_0_15px_currentColor]`}>
                                {gameState === 'SUCCESS' ? 'HEIST SUCCESSFUL' : 'HEIST FAILED'}
                            </div>

                            <div className="mt-8 space-y-4">
                                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                                    <span className="text-white/60 uppercase tracking-widest text-sm">Vaults Hacked</span>
                                    <span className="text-3xl text-white font-mono font-bold">{hackedCount} / {totalVaults}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-white/60 uppercase tracking-widest text-sm">Security Level</span>
                                    <span className={`text-2xl font-mono font-bold ${gameState === 'SUCCESS' ? 'text-white' : 'text-[#ff0033]'}`}>{securityLevel.toFixed(1)}%</span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3D WebGL Canvas */}
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 10, 20], fov: 60 }} gl={{ antialias: false }}>
                    <color attach="background" args={['#010103']} />
                    <fog attach="fog" args={['#010103', 15, 50]} />
                    <ambientLight intensity={0.2} color="#ffffff" />

                    <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

                    <SunCore securityLevel={securityLevel} />

                    {nodes.map(node => node.type === 'vault' ? (
                        <VaultPlanet
                            key={node.id}
                            {...node}
                            onClick={handleVaultClick}
                        />
                    ) : (
                        <GuardProbe
                            key={node.id}
                            {...node}
                            onClick={handleGuardClick}
                        />
                    ))}

                    <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} maxPolarAngle={Math.PI / 2 + 0.2} />

                    <EffectComposer disableNormalPass>
                        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur intensity={1.5 + (securityLevel / 100)} />
                        <ChromaticAberration
                            blendFunction={BlendFunction.NORMAL}
                            offset={new THREE.Vector2(0.002 + (securityLevel / 100) * 0.006, 0.002 + (securityLevel / 100) * 0.006)}
                            radialModulation={false}
                            modulationOffset={0}
                        />
                        <Vignette eskil={false} offset={0.1} darkness={1.1} />
                        {glitchActive && (
                            <Glitch delay={new THREE.Vector2(0, 0)} duration={new THREE.Vector2(0.2, 0.5)} mode={GlitchMode.SPORADIC} active ratio={0.8} />
                        )}
                    </EffectComposer>
                </Canvas>
            </div>
        </div>
    );
};
