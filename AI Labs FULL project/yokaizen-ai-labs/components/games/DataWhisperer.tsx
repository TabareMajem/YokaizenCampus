import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Dodecahedron, MeshDistortMaterial, Float, Sparkles, Ring, Icosahedron } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch, Vignette, Noise } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Activity, Shield, Cpu, AlertTriangle, Zap, Radio, Waves, Radar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../../services/audioService';
import { useDialogue } from '../../contexts/DialogueContext';

export interface DataWhispererProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

// -------------------------------------------------------------------------------------------------
// AAA VISUAL COMPONENTS
// -------------------------------------------------------------------------------------------------

// Interactive Energy Ripple
const ResonanceRipple = ({ position, onComplete }: { position: [number, number, number], onComplete: () => void }) => {
    const ringRef = useRef<THREE.Mesh>(null);
    const [scale, setScale] = useState(0.1);
    const [opacity, setOpacity] = useState(0.8);

    useFrame((state, delta) => {
        if (ringRef.current) {
            setScale(s => s + delta * 15);
            setOpacity(o => Math.max(0, o - delta * 2));
            ringRef.current.scale.setScalar(scale);

            if (opacity <= 0) {
                onComplete();
            }
        }
    });

    return (
        <mesh ref={ringRef} position={position} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.9, 1, 32]} />
            <meshBasicMaterial color="#a78bfa" transparent opacity={opacity} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
    );
};

// Advanced Sentient Core
const SentientCore = ({ resonanceLevel, isInteracting }: { resonanceLevel: number, isInteracting: boolean }) => {
    const coreRef = useRef<THREE.Mesh>(null);
    const auraRef = useRef<THREE.Mesh>(null);
    const cageRef = useRef<THREE.Group>(null);

    // Smooth transition values
    const targetColor = useMemo(() => new THREE.Color(), []);
    const currentColor = useMemo(() => new THREE.Color('#4c1d95'), []);

    useFrame((state, delta) => {
        // Color shifts based on resonance (0 to 1)
        // Starts Deep Purple -> Moves to Cyan/White at hi resonance
        targetColor.setHSL(0.7 - (resonanceLevel * 0.2), 0.8, 0.3 + (resonanceLevel * 0.5));
        currentColor.lerp(targetColor, delta * 2);

        if (coreRef.current) {
            coreRef.current.rotation.x += delta * (0.5 + resonanceLevel);
            coreRef.current.rotation.y += delta * (0.3 + resonanceLevel);

            // Pulse effect
            const pulse = 1 + Math.sin(state.clock.elapsedTime * (2 + resonanceLevel * 5)) * (0.05 + resonanceLevel * 0.1);
            coreRef.current.scale.setScalar((isInteracting ? 1.2 : 1) * pulse);

            // Update material color manually since lerp doesn't auto-trigger React render
            (coreRef.current.material as MeshDistortMaterial).color = currentColor;
            (coreRef.current.material as MeshDistortMaterial).emissive = currentColor;
        }

        if (auraRef.current) {
            auraRef.current.rotation.x -= delta * 0.2;
            auraRef.current.rotation.z += delta * 0.1;
            auraRef.current.scale.setScalar(1.5 + (resonanceLevel * 0.5));
            (auraRef.current.material as THREE.MeshBasicMaterial).color = currentColor;
        }

        if (cageRef.current) {
            cageRef.current.rotation.y += delta * (0.1 + resonanceLevel * 0.5);
            cageRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
        }
    });

    return (
        <Float speed={2} floatIntensity={isInteracting ? 2 : 1} rotationIntensity={isInteracting ? 1 : 0.5}>
            <group>
                {/* The sentient center */}
                <mesh ref={coreRef}>
                    <icosahedronGeometry args={[1.2, 4]} />
                    <MeshDistortMaterial
                        envMapIntensity={1}
                        clearcoat={1}
                        clearcoatRoughness={0}
                        metalness={0.9}
                        roughness={0.1}
                        distort={0.3 + (resonanceLevel * 0.4)}
                        speed={2 + (resonanceLevel * 5)}
                        emissiveIntensity={isInteracting ? 2 : 0.5}
                    />
                </mesh>

                {/* Ethereal Glow Aura */}
                <mesh ref={auraRef}>
                    <icosahedronGeometry args={[1.3, 2]} />
                    <meshBasicMaterial transparent opacity={0.1 + (resonanceLevel * 0.2)} wireframe blending={THREE.AdditiveBlending} />
                </mesh>

                {/* Geometric Cage/Orbit */}
                <group ref={cageRef}>
                    {[...Array(3)].map((_, i) => (
                        <mesh key={i} rotation={[Math.PI / 2, (Math.PI / 3) * i, 0]}>
                            <torusGeometry args={[2.5, 0.02, 16, 64]} />
                            <meshBasicMaterial color="#ffffff" transparent opacity={0.2 + (resonanceLevel * 0.3)} />
                        </mesh>
                    ))}
                    <mesh>
                        <dodecahedronGeometry args={[2.4, 0]} />
                        <meshBasicMaterial color="#a78bfa" wireframe transparent opacity={0.05 + (resonanceLevel * 0.1)} />
                    </mesh>
                </group>

                <pointLight distance={10} intensity={2 + resonanceLevel * 3} color={targetColor} />
            </group>
        </Float>
    );
};

// Subtle camera drift for ethereal feel
const CameraRig = ({ resonance }: { resonance: number }) => {
    const { camera, mouse } = useThree();

    useFrame((state, delta) => {
        // Smooth drift
        const targetX = mouse.x * 1.5;
        const targetY = mouse.y * 1.5;

        camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, delta * 1);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, delta * 1);

        // FOV shifts with resonance
        (camera as THREE.PerspectiveCamera).fov = THREE.MathUtils.lerp((camera as THREE.PerspectiveCamera).fov, 60 + resonance * 10, delta * 0.5);
        camera.updateProjectionMatrix();
        camera.lookAt(0, 0, 0);
    });

    return null;
};

// -------------------------------------------------------------------------------------------------
// MAIN COMPONENT & STATE
// -------------------------------------------------------------------------------------------------

export const DataWhisperer: React.FC<DataWhispererProps> = ({ onComplete, difficulty, t }) => {
    const { queueDialogue } = useDialogue();
    const [score, setScore] = useState(0); // Cumulative score
    const [resonance, setResonance] = useState(0); // 0 to 100
    const [timeLeft, setTimeLeft] = useState(60);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');

    // Interaction visual states
    const [isInteracting, setIsInteracting] = useState(false);
    const [ripples, setRipples] = useState<{ id: number, position: [number, number, number] }[]>([]);

    const [advisorMsg, setAdvisorMsg] = useState('Tune the frequency. Find the resonance pattern.');
    const [adversaryMsg, setAdversaryMsg] = useState('Signal degradation detected. You cannot hold it.');
    const [glitchActive, setGlitchActive] = useState(false);

    const diffMul = difficulty === 'HARD' ? 1.5 : difficulty === 'MEDIUM' ? 1.2 : 1;
    const decayRate = difficulty === 'HARD' ? 3 : difficulty === 'MEDIUM' ? 2 : 1.5;

    // Narrative: Mission Briefing
    useEffect(() => {
        queueDialogue([
            { id: `whisperer-brief-${Date.now()}`, character: 'BYTE', text: t('game.instructions.tune_signal') || 'Interact rhythmically to stabilize the data core.' },
            { id: `whisperer-brief2-${Date.now()}`, character: 'ATHENA', text: t('game.instructions.avoid_decay') || 'Do not let the resonance fall to zero.', isGlitchy: true },
        ]);
    }, [queueDialogue, t]);

    // Resonance Decay Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        const decayInterval = setInterval(() => {
            setResonance(prev => {
                const newVal = Math.max(0, prev - decayRate);

                // If resonance hits 0 after having been built up, apply a penalty or glitch
                if (newVal === 0 && prev > 0) {
                    audio.playError();
                    setGlitchActive(true);
                    setTimeout(() => setGlitchActive(false), 400);
                }

                return newVal;
            });

            // Gain score based on current resonance level over time
            setScore(prev => prev + Math.floor((resonance / 10) * diffMul));

        }, 500); // Check every half second

        return () => clearInterval(decayInterval);
    }, [gameState, decayRate, resonance, diffMul]);

    // Multi-Agent Simulation Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        const advisorLines = [
            'Maintain focus. Logic structures are stabilizing.',
            'Optimization detected. Keep routing data.',
            'Harmony achieved. Hold the frequency.',
            `Resonance holds at ${Math.floor(resonance)}%.`
        ];

        const adversaryLines = [
            'Your defenses are pitiful.',
            'I am bypassing the mainframe context.',
            'Entropy always wins. Let it fade.',
            'You cannot sustain this compute load.'
        ];

        const agentInterval = setInterval(() => {
            const isAdversary = Math.random() > (resonance > 50 ? 0.8 : 0.4); // Less adversary chat if doing well
            if (isAdversary) {
                setAdversaryMsg(adversaryLines[Math.floor(Math.random() * adversaryLines.length)]);
                audio.playSystemMessage?.({ type: 'warning' });
                // Small chance to cause a huge decay spike
                if (Math.random() > 0.8) {
                    setResonance(prev => Math.max(0, prev - 20));
                    setGlitchActive(true);
                    setTimeout(() => setGlitchActive(false), 500);
                }
            } else {
                setAdvisorMsg(advisorLines[Math.floor(Math.random() * advisorLines.length)]);
                audio.playSystemMessage?.({ type: 'success' });
            }
        }, 6000);

        return () => clearInterval(agentInterval);
    }, [gameState, resonance, t]);

    // Timer Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // Win condition: high total score or high ending resonance
                    const success = score >= 3000 || resonance >= 80;
                    setGameState(success ? 'SUCCESS' : 'FAILED');

                    if (success) {
                        audio.playSuccess();
                        queueDialogue([
                            { id: `whisperer-win-${Date.now()}`, character: 'SYNTAX', text: `Core stabilized. Final Signal Strength: ${score}.` },
                            { id: `whisperer-win2-${Date.now()}`, character: 'ATHENA', text: 'Beautiful resonance pattern achieved.' },
                        ]);
                    } else {
                        audio.playError();
                        queueDialogue([
                            { id: `whisperer-fail-${Date.now()}`, character: 'BYTE', text: 'Signal lost to the void. Overload failing.', isGlitchy: true },
                        ]);
                    }

                    onComplete(score, { completionTime: 60 - prev, difficulty, finalResonance: resonance });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, score, resonance, onComplete, difficulty, queueDialogue, t]);

    // Interaction Handler (The "Whispering" mechanic)
    const handleInteract = useCallback((e: any) => {
        if (gameState !== 'PLAYING') return;

        // Calculate interaction position somewhat dynamically if using raycaster, 
        // but for a general click-anywhere "tuning" feel, random offsets from center work to show "signals" hitting the core
        const newRipplePos: [number, number, number] = [
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 2
        ];

        setRipples(prev => [...prev, { id: Date.now() + Math.random(), position: newRipplePos }]);

        setIsInteracting(true);
        // Boost resonance
        setResonance(prev => Math.min(100, prev + (8 / diffMul))); // Harder difficulty = less resonance per click

        audio.playClick();

        // Remove interaction state slightly after
        setTimeout(() => setIsInteracting(false), 150);
    }, [gameState, diffMul]);

    const removeRipple = useCallback((id: number) => {
        setRipples(prev => prev.filter(r => r.id !== id));
    }, []);

    // Derived color for UI based on resonance
    const resonanceColor = resonance > 80 ? 'text-[#00ffff]' : resonance > 40 ? 'text-[#a78bfa]' : 'text-[#f43f5e]';
    const resonanceBorder = resonance > 80 ? 'border-[#00ffff]' : resonance > 40 ? 'border-[#a78bfa]' : 'border-[#f43f5e]';
    const resonanceBg = resonance > 80 ? 'bg-[#00ffff]' : resonance > 40 ? 'bg-[#a78bfa]' : 'bg-[#f43f5e]';

    return (
        <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border border-[#a78bfa]/20 bg-[#0a0514] shadow-[0_0_80px_rgba(167,139,250,0.1)] font-mono select-none">

            {/* Top HUD */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-20 pointer-events-none">
                <div className="flex flex-col gap-4">
                    {/* Signal Strength (Score) */}
                    <div className="bg-[#0f0a20]/80 backdrop-blur-xl rounded-xl p-4 border border-[#a78bfa]/30 shadow-lg">
                        <div className="flex items-center gap-2 text-[#a78bfa] mb-2">
                            <Activity className="w-5 h-5" />
                            <span className="text-[11px] uppercase tracking-[0.2em] font-black">Signal Integration</span>
                        </div>
                        <div className="text-3xl font-black text-white tabular-nums tracking-tighter">{score}</div>
                    </div>

                    {/* Resonance Bar */}
                    <div className={`bg-[#0f0a20]/80 backdrop-blur-xl rounded-xl p-4 border ${resonanceBorder}/40 shadow-lg`}>
                        <div className={`flex items-center justify-between gap-4 ${resonanceColor} mb-2`}>
                            <div className="flex items-center gap-2">
                                <Waves className={`w-5 h-5 ${resonance > 80 ? 'animate-pulse' : ''}`} />
                                <span className="text-[11px] uppercase tracking-[0.2em] font-black">Core Resonance</span>
                            </div>
                            <span className="text-xl font-bold tabular-nums">{Math.floor(resonance)}%</span>
                        </div>
                        {/* Segmented Progress Bar */}
                        <div className="w-48 h-2 flex gap-1 bg-black/50 rounded-full overflow-hidden">
                            {[...Array(20)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`flex-1 h-full rounded-sm transition-all duration-300 ${i * 5 < resonance ? resonanceBg : 'bg-transparent'}`}
                                    style={{
                                        opacity: i * 5 < resonance ? 1 : 0.1,
                                        boxShadow: i * 5 < resonance ? `0 0 10px var(--tw-color-${resonanceBg}-400)` : 'none'
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                    <div className={`bg-[#0f0a20]/80 backdrop-blur-xl rounded-xl p-4 border ${timeLeft <= 10 ? 'border-rose-500' : 'border-[#4f46e5]/40'} shadow-lg flex flex-col items-end`}>
                        <div className="flex items-center gap-2 text-[#4f46e5] mb-2">
                            <AlertTriangle className="w-5 h-5" />
                            <span className="text-[11px] uppercase tracking-[0.2em] font-black">Time Sync</span>
                        </div>
                        <div className={`text-4xl font-black tabular-nums tracking-widest ${timeLeft <= 10 ? 'text-rose-500 animate-pulse drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]' : 'text-white'}`}>
                            {timeLeft}s
                        </div>
                    </div>
                    <div className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] border shadow-lg ${difficulty === 'HARD' ? 'border-rose-500/50 text-rose-400 bg-rose-500/10' : difficulty === 'MEDIUM' ? 'border-amber-500/50 text-amber-400 bg-amber-500/10' : 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'}`}>
                        {difficulty} FREQUENCY
                    </div>
                </div>
            </div>

            {/* Subliminal "Tuning" Help Text */}
            <AnimatePresence>
                {timeLeft > 55 && gameState === 'PLAYING' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 2 }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none text-center"
                    >
                        <Radar className="w-24 h-24 text-[#a78bfa] mx-auto mb-4 animate-spin-slow opacity-30" />
                        <div className="text-[#a78bfa] font-black text-2xl uppercase tracking-[0.5em] blur-[1px]">
                            CLICK TO TUNE
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Agent Chatter Terminals (Ethereal Styling) */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row gap-4 z-20 pointer-events-none">
                <div className="flex-1 bg-gradient-to-t from-[#4f46e5]/20 to-transparent backdrop-blur-md rounded-xl p-4 border-b-2 border-[#4f46e5] relative">
                    <div className="text-[10px] text-[#818cf8] mb-2 uppercase tracking-[0.2em] font-black flex items-center gap-2">
                        <Shield className="w-4 h-4" /> Syntonic Advisor
                    </div>
                    <div className="text-sm text-indigo-50 font-mono tracking-wide italic leading-relaxed">{advisorMsg}</div>
                </div>
                <div className="flex-1 bg-gradient-to-t from-[#e11d48]/20 to-transparent backdrop-blur-md rounded-xl p-4 border-b-2 border-[#e11d48] text-right relative">
                    <div className="text-[10px] text-[#fb7185] mb-2 uppercase tracking-[0.2em] font-black flex items-center justify-end gap-2">
                        Dissonance AI <Zap className="w-4 h-4" />
                    </div>
                    <div className="text-sm text-rose-50 font-mono tracking-wide italic leading-relaxed">{adversaryMsg}</div>
                </div>
            </div>

            {/* Game Over Cinematic State */}
            <AnimatePresence>
                {gameState !== 'PLAYING' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 z-40 flex items-center justify-center p-4 sm:p-0 bg-[#050210]/95 backdrop-blur-2xl"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                            className="text-center p-12 w-full rounded-3xl border border-white/5 bg-[#0a0514]/80 shadow-[0_40px_100px_rgba(0,0,0,0.8)] max-w-xl relative overflow-hidden"
                        >
                            <div className="absolute inset-0 z-0 bg-radial-gradient from-[#a78bfa]/10 to-transparent pointer-events-none"></div>

                            <div className="relative z-10">
                                <div className={`w-24 h-24 mx-auto mb-8 rounded-full flex items-center justify-center ${gameState === 'SUCCESS' ? 'bg-[#00ffff]/10 border border-[#00ffff]/40 shadow-[0_0_50px_rgba(0,255,255,0.3)]' : 'bg-[#e11d48]/10 border border-[#e11d48]/40 shadow-[0_0_50px_rgba(225,29,72,0.3)]'}`}>
                                    {gameState === 'SUCCESS' ? <Radio className="w-12 h-12 text-[#00ffff]" /> : <SkullIcon className="w-12 h-12 text-[#e11d48]" />}
                                </div>
                                <div className={`text-4xl font-black uppercase tracking-[0.3em] mb-8 ${gameState === 'SUCCESS' ? 'text-white drop-shadow-[0_0_15px_rgba(0,255,255,0.4)]' : 'text-[#e11d48] drop-shadow-[0_0_15px_rgba(225,29,72,0.5)]'}`}>
                                    {gameState === 'SUCCESS' ? 'HARMONY SECURED' : 'SIGNAL LOST'}
                                </div>

                                <div className="bg-[#050210]/80 p-8 rounded-2xl border border-white/5 mb-4 inline-block min-w-[80%]">
                                    <div className="flex justify-between items-center mb-6 pb-6 border-b border-white/5">
                                        <span className="text-white/40 text-xs uppercase tracking-[0.2em] font-bold">Total Integration</span>
                                        <span className="text-4xl font-mono text-white font-black">{score}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/40 text-xs uppercase tracking-[0.2em] font-bold">Terminal Resonance</span>
                                        <span className={`text-2xl font-mono font-black ${resonance > 50 ? 'text-[#00ffff]' : 'text-[#e11d48]'}`}>{Math.floor(resonance)}%</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3D WebGL Context */}
            <div className="absolute inset-0 z-0 cursor-crosshair" onClick={handleInteract}>
                <Canvas camera={{ position: [0, 0, 10], fov: 60 }} gl={{ antialias: false, powerPreference: "high-performance", alpha: false }}>
                    <color attach="background" args={['#050210']} />

                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1.5} color="#4f46e5" />
                    <pointLight position={[-10, -10, -10]} intensity={1} color="#a78bfa" />

                    {/* Ambient Ethereal Dust */}
                    <Sparkles count={300} scale={[25, 15, 15]} size={2} speed={0.2} opacity={0.3} color="#a78bfa" />
                    <Sparkles count={100} scale={[15, 10, 10]} size={4} speed={0.5} opacity={0.5} color="#00ffff" />

                    <SentientCore resonanceLevel={resonance / 100} isInteracting={isInteracting} />

                    {/* Render Ripples */}
                    {ripples.map(r => (
                        <ResonanceRipple key={r.id} position={r.position} onComplete={() => removeRipple(r.id)} />
                    ))}

                    <CameraRig resonance={resonance / 100} />

                    <EffectComposer disableNormalPass>
                        <Bloom
                            luminanceThreshold={0.1}
                            luminanceSmoothing={0.9}
                            intensity={2.5 + (resonance / 100)} // Brighter when high resonance
                            mipmapBlur
                        />
                        <ChromaticAberration
                            blendFunction={BlendFunction.NORMAL}
                            offset={new THREE.Vector2(0.003, 0.003)}
                        />
                        <Vignette eskil={false} offset={0.3} darkness={1.3} />
                        <Noise opacity={0.05 + (1 - (resonance / 100)) * 0.1} blendFunction={BlendFunction.OVERLAY} /> {/* More noise when low resonance */}

                        {(glitchActive) && (
                            <Glitch
                                delay={new THREE.Vector2(0, 0)}
                                duration={new THREE.Vector2(0.2, 0.4)}
                                mode={GlitchMode.SPORADIC}
                                active={true}
                                ratio={1}
                                strength={new THREE.Vector2(0.5, 1.0)}
                            />
                        )}
                    </EffectComposer>
                </Canvas>
            </div>

            {/* Soft vignetting gradient overlay */}
            <div className="absolute inset-0 z-10 pointer-events-none mix-blend-multiply bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.8)_100%)]"></div>
        </div>
    );
};
