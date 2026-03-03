import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sparkles, Float, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Glitch, ChromaticAberration, DepthOfField } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, TrendingDown, TriangleAlert, Rocket, Twitter, MessageCircle } from 'lucide-react';
import { useDialogue } from '../../contexts/DialogueContext';
import { audio } from '../../services/audioService';

interface GameProps {
    onComplete: () => void;
}

const SURVIVAL_TIME = 15; // 15 seconds to win
const TUNNEL_RADIUS = 4;
const OBSTACLE_COUNT = 30;

function Tunnel() {
    const meshRef = useRef<THREE.Mesh>(null);

    // Create a straight tunnel
    const geometry = useMemo(() => {
        return new THREE.CylinderGeometry(TUNNEL_RADIUS, TUNNEL_RADIUS, 200, 32, 1, true);
    }, []);

    useFrame((state, delta) => {
        if (meshRef.current) {
            // Simulate moving forward by moving the tunnel backward
            meshRef.current.position.z += 20 * delta;
            meshRef.current.rotation.z -= 0.5 * delta;

            // Infinite loop trick
            if (meshRef.current.position.z > 50) {
                meshRef.current.position.z = -50;
            }
        }
    });

    return (
        <mesh ref={meshRef} geometry={geometry} rotation={[Math.PI / 2, 0, 0]}>
            <meshBasicMaterial
                color="#00ffff"
                wireframe={true}
                transparent
                opacity={0.3}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

function Obstacles({ onHit }: { onHit: () => void }) {
    const groupRef = useRef<THREE.Group>(null);
    const playerRef = useRef(new THREE.Vector3(0, 0, 0)); // Standard camera origin

    const obstacles = useMemo(() => {
        return Array.from({ length: OBSTACLE_COUNT }).map(() => {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * (TUNNEL_RADIUS - 1);
            return {
                id: Math.random(),
                position: new THREE.Vector3(
                    Math.cos(angle) * radius,
                    Math.sin(angle) * radius,
                    -50 - (Math.random() * 100) // Spread out along Z axis initially
                )
            };
        });
    }, []);

    useFrame((state, delta) => {
        if (groupRef.current) {
            // Move obstacles towards camera
            const speed = 30;
            groupRef.current.children.forEach(child => {
                child.position.z += speed * delta;

                // Reset if passed camera
                if (child.position.z > 5) {
                    child.position.z = -100 - (Math.random() * 50);
                    const angle = Math.random() * Math.PI * 2;
                    const radius = Math.random() * (TUNNEL_RADIUS - 1);
                    child.position.x = Math.cos(angle) * radius;
                    child.position.y = Math.sin(angle) * radius;
                }

                // Extremely simple collision detection with camera (0,0,0) offset by mouse later
                // Note: Full collision requires tracking camera rig, we'll simulate it loosely
                if (child.position.z > -1 && child.position.z < 1) {
                    const dist = Math.sqrt(
                        Math.pow(child.position.x - state.camera.position.x, 2) +
                        Math.pow(child.position.y - state.camera.position.y, 2)
                    );
                    if (dist < 1.2) {
                        onHit();
                    }
                }
            });
        }
    });

    return (
        <group ref={groupRef}>
            {obstacles.map(obs => (
                <Float key={obs.id} speed={5} rotationIntensity={2} floatIntensity={2}>
                    <mesh position={obs.position}>
                        <icosahedronGeometry args={[1, 0]} />
                        <meshStandardMaterial color="#ff0000" emissive="#ff0022" emissiveIntensity={4} wireframe={false} />
                        <pointLight distance={3} intensity={5} color="#ff0000" />
                    </mesh>
                </Float>
            ))}
        </group>
    );
}

function WarpEffect({ speedMultiplier }: { speedMultiplier: number }) {
    useFrame((state) => {
        // Dynamic FOV for warp effect
        const targetFov = 90 + (speedMultiplier * 5);
        state.camera.fov = THREE.MathUtils.lerp(state.camera.fov, targetFov, 0.1);
        state.camera.updateProjectionMatrix();
    });
    return null;
}

function PlayerRig() {
    useFrame((state) => {
        // Smooth camera follow mouse
        state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, (state.mouse.x * TUNNEL_RADIUS * 0.8), 0.1);
        state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, (state.mouse.y * TUNNEL_RADIUS * 0.8), 0.1);
        state.camera.lookAt(0, 0, -20);
    });
    return null;
}

export const ViralLatencyTunnel: React.FC<GameProps> = ({ onComplete }) => {
    const { queueDialogue } = useDialogue();
    const [gameState, setGameState] = useState<'intro' | 'playing' | 'crashed' | 'won'>('intro');
    const [timeLeft, setTimeLeft] = useState(SURVIVAL_TIME);
    const [speedMultiplier, setSpeedMultiplier] = useState(1);
    const [isGlitching, setIsGlitching] = useState(false);
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(1);

    useFrame(() => {
        if (gameState === 'playing') {
            // Passive score increase based on combo
            setScore(prev => prev + (10 * combo));
        }
    });

    useEffect(() => {
        if (gameState === 'playing') {
            audio.playEngine(SURVIVAL_TIME * 1000);
            queueDialogue([
                {
                    id: 'lt-intro-1',
                    character: 'BYTE',
                    text: "Whoa. Flesh-brain. Someone just jammed the orbital firewall trying to download 3 petabytes of TikTok dances...",
                    isGlitchy: true
                },
                {
                    id: 'lt-intro-2',
                    character: 'BYTE',
                    text: "Dodge the red latency packets before the server melts down. MOUSE or TOUCH to steer. Go, go, go!"
                }
            ]);
        }
    }, [gameState, queueDialogue]);

    useEffect(() => {
        if (gameState !== 'playing') return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setGameState('won');
                    clearInterval(timer);
                    audio.playSuccess();
                    queueDialogue([
                        {
                            id: 'lt-win-1',
                            character: 'ATHENA',
                            text: "You adapted faster than my training weights. Your cognitive reaction times are... adequate."
                        },
                        {
                            id: 'lt-win-2',
                            character: 'ATHENA',
                            text: "Perhaps you are not entirely useless after all. Proceed to the Vanguard Registration."
                        }
                    ]);
                    return 0;
                }
                return prev - 1;
            });
            setSpeedMultiplier(prev => prev + 0.1);
        }, 1000);

        return () => clearInterval(timer);
    }, [gameState]);

    const handleHit = () => {
        if (gameState === 'playing') {
            audio.playError();
            setSpeedMultiplier(1);
            setCombo(1); // Reset combo on hit
            setScore(prev => Math.max(0, prev - 5000)); // Penalty
            setIsGlitching(true);
            setTimeout(() => setIsGlitching(false), 300);
        }
    };

    // Increment combo every 3 seconds if not hit
    useEffect(() => {
        if (gameState !== 'playing') return;
        const comboTimer = setInterval(() => {
            setCombo(prev => Math.min(10, prev + 1));
        }, 3000);
        return () => clearInterval(comboTimer);
    }, [gameState]);

    return (
        <div className="w-screen h-screen bg-black overflow-hidden relative cursor-none select-none">
            <Canvas camera={{ position: [0, 0, 0], fov: 90 }} gl={{ antialias: false, powerPreference: "high-performance" }}>
                <color attach="background" args={['#010005']} />
                <fog attach="fog" args={['#010005', 10, 80]} />
                <ambientLight intensity={0.5} />
                <directionalLight position={[0, 0, 5]} intensity={2} color="#00ffff" />

                <Tunnel />
                <Obstacles onHit={handleHit} />
                <PlayerRig />
                <WarpEffect speedMultiplier={speedMultiplier} />

                <EffectComposer disableNormalPass>
                    <Bloom luminanceThreshold={0.3} mipmapBlur intensity={2.0} />
                    <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.005 * speedMultiplier, 0.005)} />
                    {isGlitching && (
                        <Glitch
                            delay={new THREE.Vector2(0, 0)}
                            duration={new THREE.Vector2(0.1, 0.3)}
                            strength={new THREE.Vector2(0.5, 1.0)}
                            mode={GlitchMode.SPORADIC}
                            active
                        />
                    )}
                </EffectComposer>

                <Stars radius={50} depth={50} count={3000} factor={4} saturation={1} fade speed={speedMultiplier * 2} />
                <Sparkles count={300} scale={15} size={8} speed={speedMultiplier * 4} color="#00ffff" opacity={0.6} />
            </Canvas>

            {/* Massive Typography Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-5">
                <h1 className="text-[20vw] font-black text-white mix-blend-overlay tracking-tighter" style={{ transform: 'scaleY(1.8)' }}>
                    AI LABS
                </h1>
            </div>

            {/* UI Hud */}
            <div className="absolute top-0 left-0 w-full p-4 md:p-8 pointer-events-none z-10 flex flex-col md:flex-row justify-between items-start gap-4 md:gap-0 mt-[10vh] md:mt-0">
                <div className="backdrop-blur-md bg-black/40 border border-cyan-500/30 p-4 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                    <h2 className="text-cyan-400 font-bold tracking-widest text-sm flex items-center gap-2">
                        <TrendingDown size={14} /> LATENCY OPTIMIZER
                    </h2>
                    <div className="text-4xl font-black text-white mt-1 tabular-nums">
                        00:{timeLeft.toString().padStart(2, '0')}
                    </div>
                </div>

                {/* Score & Combo Centered */}
                <div className="hidden md:flex flex-col items-center">
                    <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 tabular-nums shadow-black drop-shadow-lg">
                        {Math.floor(score).toLocaleString()}
                    </div>
                    <div className={`text-xl font-bold transition-colors ${combo > 5 ? 'text-amber-400 animate-pulse' : 'text-cyan-400'}`}>
                        {combo}x MULTIPLIER
                    </div>
                </div>

                <div className="text-left md:text-right backdrop-blur-md bg-red-900/40 border border-red-500/30 p-4 rounded-xl w-full md:w-auto shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                    <div className="flex items-center md:justify-end gap-2 text-red-400 animate-pulse font-bold text-sm">
                        <TriangleAlert size={14} /> DODGE RED PACKETS
                    </div>
                    <p className="text-gray-300 text-xs mt-1">TAP/DRAG TO STEER</p>
                </div>
            </div>

            {/* Crosshair/Ship Indicator */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 transition-transform duration-75">
                <div className="w-8 h-8 rounded-full border-2 border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.5)] flex items-center justify-center">
                    <div className="w-1 h-1 bg-white rounded-full" />
                </div>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {/* Intro Modal */}
                {gameState === 'intro' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto"
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="max-w-md w-full h-fit my-auto border border-cyan-500/30 bg-black/80 p-6 md:p-8 rounded-2xl text-left relative shadow-[0_0_50px_rgba(6,182,212,0.15)] pointer-events-auto"
                        >
                            <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center justify-center mb-6">
                                <TrendingDown className="text-cyan-400 w-8 h-8" />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black text-white mb-4 tracking-tight">WELCOME TO <span className="text-cyan-400">AI LABS</span></h2>

                            <div className="space-y-4 text-sm text-gray-300 leading-relaxed mb-8">
                                <p>
                                    The AGI transition is accelerating. By 2027, over 68% of current cognitive tasks will be fully automated. The previous generation's skills are already obsolete.
                                </p>
                                <p>
                                    <strong className="text-white">Yokaizen AI Labs</strong> is a gamified training facility designed to forge your cognitive resilience. Here, you don't just use AI—you command autonomous swarms, master prompt engineering, and defend against deepfakes.
                                </p>
                                <p>
                                    Our mission is to evolve you from a mere "Doer" to an <strong className="text-cyan-400">Orchestrator</strong> of intelligences.
                                </p>
                                <div className="bg-cyan-900/20 border border-cyan-500/30 p-4 rounded-lg flex gap-3 items-start mt-4">
                                    <Rocket className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
                                    <p className="text-xs text-cyan-100">
                                        Before you enter the Campus Core, we must test your cognitive processing speed. Dodge the red latency packets before the server melts down.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setGameState('playing')}
                                className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest rounded transition-all hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] flex items-center justify-center gap-2 group"
                            >
                                <TrendingDown size={20} className="group-hover:animate-bounce" /> Initialize Tunnel
                            </button>
                        </motion.div>
                    </motion.div>
                )}

                {/* Win Modal */}
                {gameState === 'won' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl overflow-y-auto"
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="max-w-[90vw] md:max-w-md w-full h-fit my-auto p-6 md:p-8 border border-white/20 bg-gradient-to-br from-black to-slate-900 rounded-3xl text-center shadow-2xl relative pointer-events-auto"
                        >
                            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />

                            <div className="w-16 h-16 md:w-24 md:h-24 mx-auto bg-cyan-500/20 rounded-full flex items-center justify-center mb-4 md:mb-6 relative z-10 shadow-[0_0_50px_rgba(34,211,238,0.3)]">
                                <Rocket className="text-cyan-400 w-8 h-8 md:w-12 md:h-12" />
                            </div>

                            <h2 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight relative z-10">VELOCITY<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">ACHIEVED</span></h2>
                            <p className="text-sm md:text-base text-gray-300 mb-4 border-t border-white/10 pt-4 relative z-10 font-medium">
                                Final Score: <span className="text-white font-black text-xl">{Math.floor(score).toLocaleString()}</span><br />
                                Reaction time: <span className="text-cyan-400 font-black">Top 5%</span>. The Vanguard Program awaits.
                            </p>

                            <div className="bg-cyan-950/30 border border-cyan-500/20 rounded-xl p-4 mb-6 text-left relative overflow-hidden z-10">
                                <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
                                <h3 className="text-cyan-400 font-bold mb-1 text-sm flex items-center gap-2"><TriangleAlert size={14} /> REALITY CHECK</h3>
                                <p className="text-xs md:text-sm text-gray-300 leading-relaxed">
                                    The speed of AI evolution is terrifying. In the next 3 years, the gap between those who leverage AI and those who don't will become insurmountable. <span className="text-white font-bold">Yokaizen AI Labs is not just a game.</span> It is the premier training ground for the next generation to master human-AI collaboration, prompt engineering, and cognitive survivability. Adapt now, or be replaced.
                                </p>
                            </div>

                            {/* VIRAL SHARE BUTTONS */}
                            <div className="flex flex-col sm:flex-row gap-2 mb-6 relative z-10">
                                <button
                                    onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent('⚡ The AI future is inevitable. I survived the Latency Tunnel with Top 5% reaction speed. Will you be replaced or will you adapt? Try the free test:')}&url=${encodeURIComponent('https://ai.yokaizencampus.com/play/latency-tunnel')}`, '_blank')}
                                    className="flex-1 py-2.5 bg-[#1DA1F2] text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 hover:brightness-110 transition-all"
                                >
                                    <Twitter size={14} /> Share on X
                                </button>
                                <button
                                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent('⚡ By 2026, AI literacy isn\'t optional. I survived the Latency Tunnel test. Can you? Don\'t miss out: https://ai.yokaizencampus.com/play/latency-tunnel')}`, '_blank')}
                                    className="flex-1 py-2.5 bg-[#25D366] text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 hover:brightness-110 transition-all"
                                >
                                    <MessageCircle size={14} /> WhatsApp
                                </button>
                            </div>

                            <button
                                onClick={onComplete}
                                className="relative z-10 w-full py-5 px-6 bg-white text-black font-black uppercase tracking-widest rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                            >
                                <Zap size={20} className="fill-black" /> Begin Onboarding
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
