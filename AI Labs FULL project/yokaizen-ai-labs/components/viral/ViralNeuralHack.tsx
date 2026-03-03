import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text3D, Center, Float, Sparkles, Line, Instances, Instance, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Glitch, ChromaticAberration, DepthOfField } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, Lock, ScanLine, Brain, TriangleAlert, Share2, Twitter, MessageCircle, Copy, Check, Skull } from 'lucide-react';
import { useDialogue } from '../../contexts/DialogueContext';
import { audio } from '../../services/audioService';

interface GameProps {
    onComplete: () => void;
}

const CONSTANTS = {
    NODES_COUNT: 20,
    MAX_CONNECTIONS: 6,
    WIN_CONDITION: 7,
    HACK_TIME_MS: 30000, // 30 seconds to hack
};

const BackgroundText = () => {
    return (
        <Float floatIntensity={2} speed={1}>
            <Center position={[0, 0, -10]}>
                {/* We use a standard font path assuming it exists in the project or we fallback to basic text if Text3D fails, 
            but for a WOW effect we assume a standard font is available, or we use HTML overlay text */}
            </Center>
        </Float>
    );
};

const generateNodes = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        position: new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 4
        ),
        active: false,
        hacked: false,
    }));
};

const CameraRig = ({ activePathLength }: { activePathLength: number }) => {
    useFrame((state) => {
        // Dramatic slow pan mixed with tension as hack progresses
        const t = state.clock.getElapsedTime();
        const intensity = activePathLength / CONSTANTS.WIN_CONDITION;
        state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, Math.sin(t * 0.2) * (5 + intensity * 5), 0.05);
        state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, Math.cos(t * 0.2) * (2 + intensity * 2), 0.05);
        state.camera.lookAt(0, 0, 0);
    });
    return null;
};

const NeuralNetwork = ({ onHackComplete }: { onHackComplete: () => void }) => {
    const [nodes, setNodes] = useState(generateNodes(CONSTANTS.NODES_COUNT));
    const [connections, setConnections] = useState<[THREE.Vector3, THREE.Vector3][]>([]);
    const [activePath, setActivePath] = useState<number[]>([]);
    const [glitchActive, setGlitchActive] = useState(false);

    const handleNodeClick = (id: number) => {
        if (activePath.includes(id)) return;

        const newNode = nodes.find(n => n.id === id);
        if (!newNode) return;

        if (activePath.length > 0) {
            const lastNodeId = activePath[activePath.length - 1];
            const lastNode = nodes.find(n => n.id === lastNodeId);
            if (lastNode && lastNode.position.distanceTo(newNode.position) > 6) {
                audio.playError();
                return;
            }

            if (lastNode) {
                setConnections(prev => [...prev, [lastNode.position, newNode.position]]);
            }
        }

        audio.playClick();

        // Trigger a visceral micro-glitch
        setGlitchActive(true);
        setTimeout(() => setGlitchActive(false), 150);

        const newPath = [...activePath, id];
        setActivePath(newPath);

        setNodes(prev => prev.map(n => ({
            ...n,
            active: true,
            hacked: newPath.includes(n.id)
        })));

        if (newPath.length >= CONSTANTS.WIN_CONDITION) {
            audio.playSuccess();
            setTimeout(() => onHackComplete(), 1000);
        }
    };

    return (
        <group>
            <CameraRig activePathLength={activePath.length} />

            <EffectComposer disableNormalPass>
                <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} />
                <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.002, 0.002)} />
                {glitchActive && (
                    <Glitch
                        delay={new THREE.Vector2(0, 0)}
                        duration={new THREE.Vector2(0.1, 0.3)}
                        strength={new THREE.Vector2(0.1, 0.5)}
                        mode={GlitchMode.SPORADIC}
                        active
                    />
                )}
                <DepthOfField target={[0, 0, 0]} focalLength={0.4} bokehScale={2} height={480} />
            </EffectComposer>

            {nodes.map((node) => (
                <Float key={node.id} speed={2} rotationIntensity={1} floatIntensity={1}>
                    <mesh
                        position={node.position}
                        onClick={(e) => { e.stopPropagation(); handleNodeClick(node.id); }}
                        onPointerOver={(e) => { document.body.style.cursor = 'pointer'; }}
                        onPointerOut={(e) => { document.body.style.cursor = 'default'; }}
                    >
                        <icosahedronGeometry args={[0.4, 1]} />
                        <meshStandardMaterial
                            color={node.hacked ? '#00ffff' : '#ff0055'}
                            emissive={node.hacked ? '#00ffff' : '#ff0055'}
                            emissiveIntensity={node.hacked ? 4 : 1}
                            wireframe={!node.hacked}
                            transparent
                            opacity={0.9}
                            roughness={0.2}
                            metalness={0.8}
                        />
                        {node.hacked && (
                            <pointLight distance={6} intensity={3} color="#00ffff" />
                        )}
                    </mesh>
                </Float>
            ))}

            {connections.map((points, idx) => (
                <Line
                    key={idx}
                    points={points}
                    color="#00ffff"
                    lineWidth={5}
                    dashed={false}
                    transparent
                    opacity={0.8}
                />
            ))}

            <Sparkles count={200} scale={20} size={3} color="#00ffff" speed={0.8} opacity={0.4} />
            <Sparkles count={50} scale={15} size={8} color="#ff0055" speed={0.2} opacity={0.2} />
        </group>
    );
};

export const ViralNeuralHack: React.FC<GameProps> = ({ onComplete }) => {
    const { queueDialogue } = useDialogue();
    const [gameState, setGameState] = useState<'intro' | 'playing' | 'hacked' | 'failed'>('intro');
    const [traceProgress, setTraceProgress] = useState(0);

    useEffect(() => {
        // Trace timer logic
        if (gameState !== 'playing') return;

        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(100, Math.floor((elapsed / CONSTANTS.HACK_TIME_MS) * 100));
            setTraceProgress(progress);

            if (progress > 80 && progress % 5 === 0) {
                audio.playError(); // Play warning sound when close to failure
            }

            if (progress >= 100) {
                setGameState('failed');
                clearInterval(interval);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [gameState]);

    useEffect(() => {
        if (gameState === 'playing') {
            queueDialogue([
                {
                    id: 'nh-intro-1',
                    character: 'BYTE',
                    text: "Incoming connection from... wait... a flesh-being? Hey! Don't touch that core logic layer!",
                    isGlitchy: true
                },
                {
                    id: 'nh-intro-2',
                    character: 'BYTE',
                    text: `Connect ${CONSTANTS.WIN_CONDITION} neural nodes to bypass the firewall before the security trace hits 100%. Fast!`
                }
            ]);
        }
    }, [gameState, queueDialogue]);

    const handleHackComplete = () => {
        setGameState('hacked');
        queueDialogue([
            {
                id: 'nh-win-1',
                character: 'SYNTAX',
                text: "Fascinating. The human anomaly has pierced the logic gate. Its pattern recognition exceeds simulated models."
            },
            {
                id: 'nh-win-2',
                character: 'ATHENA',
                text: "Agreed, Syntax. Root access granted. Let us see how it handles the Vanguard program."
            }
        ]);
    };

    return (
        <div className="w-screen h-screen bg-black overflow-hidden relative font-mono">
            <Canvas camera={{ position: [0, 0, 15], fov: 60 }} gl={{ antialias: false, powerPreference: "high-performance" }}>
                <color attach="background" args={['#020205']} />
                <fog attach="fog" args={['#020205', 5, 25]} />
                <ambientLight intensity={0.2} />
                <pointLight position={[10, 10, 10]} intensity={2} color="#00ffff" />
                <pointLight position={[-10, -10, -10]} intensity={1} color="#ff0055" />
                <NeuralNetwork onHackComplete={handleHackComplete} />
                <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.8} />
            </Canvas>

            {/* Massive Typography Background Overlay (Simulated HTML 3D for universal font support) */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10">
                <h1 className="text-[15vw] font-black text-white mix-blend-overlay tracking-tighter" style={{ transform: 'scaleY(1.5)' }}>
                    AI LABS
                </h1>
            </div>

            {/* UI Overlay */}
            <div className="absolute top-0 left-0 w-full p-4 md:p-8 pointer-events-none flex flex-col md:flex-row justify-between items-start gap-4 md:gap-0 mt-[10vh] md:mt-0">
                <div className="bg-black/40 backdrop-blur-md border border-cyan-500/30 p-4 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                    <h2 className="text-cyan-400 font-bold tracking-widest flex items-center gap-2 text-sm md:text-base">
                        <Lock size={16} /> SECURE CORE INTERFACE
                    </h2>
                    <p className="text-gray-400 text-xs md:text-sm mt-1 max-w-[80vw] md:max-w-[300px]">Gaining root access... Connect <span className="text-white font-bold">{CONSTANTS.WIN_CONDITION}</span> neural nodes to bypass firewall.</p>
                </div>

                <div className={`text-left md:text-right w-full md:w-auto p-4 rounded-xl backdrop-blur-md border transition-all ${traceProgress > 80 ? 'bg-red-900/40 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'bg-black/50 border-red-500/20'}`}>
                    <div className="flex items-center md:justify-end gap-2 text-red-500 animate-pulse font-bold text-sm md:text-base">
                        <TriangleAlert size={16} /> INTRUSION DETECTED
                    </div>
                    <div className="mt-2 w-full md:w-48 h-2 bg-red-950 rounded-full overflow-hidden border border-red-900">
                        <div className="h-full bg-red-500 transition-all duration-100 shadow-[0_0_10px_rgba(239,68,68,0.8)]" style={{ width: `${traceProgress}%` }}></div>
                    </div>
                    <p className="text-red-400 font-bold text-xs mt-1 tabular-nums">TRACE LIKELIHOOD: {traceProgress}%</p>
                </div>
            </div>

            {/* Crosshair */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-30">
                <ScanLine size={48} className="text-cyan-500" />
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
                            className="max-w-md w-full h-fit my-auto border border-cyan-500/30 bg-black/80 p-6 md:p-8 rounded-2xl text-left relative shadow-[0_0_50px_rgba(6,182,212,0.15)]"
                        >
                            <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center justify-center mb-6">
                                <Brain className="text-cyan-400 w-8 h-8" />
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
                                    <Zap className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
                                    <p className="text-xs text-cyan-100">
                                        Before you enter the Campus Core, we must test your cognitive processing speed. Connect the neural nodes to bypass the outer firewall.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setGameState('playing')}
                                className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest rounded transition-all hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] flex items-center justify-center gap-2 group"
                            >
                                <ScanLine size={20} className="group-hover:animate-spin" /> Initialize Sandbox
                            </button>
                        </motion.div>
                    </motion.div>
                )}

                {/* Success Modal */}
                {gameState === 'hacked' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-50 flex justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="max-w-[90vw] md:max-w-md w-full h-fit my-auto p-6 md:p-8 border border-cyan-500/30 bg-black/80 rounded-2xl text-center relative"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

                            <div className="w-16 h-16 md:w-20 md:h-20 mx-auto bg-cyan-500/20 rounded-full flex items-center justify-center mb-4 md:mb-6">
                                <Brain className="text-cyan-400 w-8 h-8 md:w-10 md:h-10" />
                            </div>

                            <h2 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">ROOT ACCESS<br /><span className="text-cyan-400">GRANTED</span></h2>
                            <p className="text-sm md:text-base text-gray-300 mb-4 border-t border-white/10 pt-4">
                                You have successfully bypassed the perimeter firewall. Your AI Survivability Rating: <span className="text-cyan-400 font-black text-xl">S-TIER</span>
                            </p>

                            <div className="bg-cyan-950/30 border border-cyan-500/20 rounded-xl p-4 mb-6 text-left relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
                                <h3 className="text-cyan-400 font-bold mb-1 text-sm flex items-center gap-2"><TriangleAlert size={14} /> REALITY CHECK</h3>
                                <p className="text-xs md:text-sm text-gray-300 leading-relaxed">
                                    The AGI transition has begun. By 2027, over 68% of current cognitive tasks will be fully automated. The previous generation's skills are already obsolete. <span className="text-white font-bold">Yokaizen AI Labs is not just a game.</span> It is the premier training ground for the next generation to master human-AI collaboration, prompt engineering, and cognitive survivability. Adapt now, or be replaced.
                                </p>
                            </div>

                            {/* VIRAL SHARE BUTTONS */}
                            <div className="flex flex-col sm:flex-row gap-2 mb-6">
                                <button
                                    onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent('🧠 AI is replacing jobs NOW. I scored S-TIER on cognitive fitness — are YOU ready for the AI age? Free test:')}&url=${encodeURIComponent('https://ai.yokaizencampus.com/play/neural-hack')}`, '_blank')}
                                    className="flex-1 py-2.5 bg-[#1DA1F2] text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 hover:brightness-110 transition-all"
                                >
                                    <Twitter size={14} /> Share on X
                                </button>
                                <button
                                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent('🧠 68% of Gen Z will need AI skills by 2027. I just scored S-TIER — take the free test before it\'s too late: https://ai.yokaizencampus.com/play/neural-hack')}`, '_blank')}
                                    className="flex-1 py-2.5 bg-[#25D366] text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 hover:brightness-110 transition-all"
                                >
                                    <MessageCircle size={14} /> WhatsApp
                                </button>
                            </div>

                            <button
                                onClick={onComplete}
                                className="w-full py-4 px-6 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest rounded transition-all hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] flex items-center justify-center gap-2 group"
                            >
                                <Zap size={20} className="group-hover:animate-bounce" /> Proceed to Hub
                            </button>
                        </motion.div>
                    </motion.div>
                )}

                {/* Failed Modal */}
                {gameState === 'failed' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-50 flex justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto"
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="max-w-[90vw] md:max-w-md w-full h-fit my-auto p-6 md:p-8 border border-red-500/50 bg-black/80 rounded-2xl text-center relative"
                        >
                            <div className="w-16 h-16 md:w-20 md:h-20 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-4 md:mb-6">
                                <Skull className="text-red-500 w-8 h-8 md:w-10 md:h-10 animate-pulse" />
                            </div>

                            <h2 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">TRACE <span className="text-red-500">COMPLETE</span></h2>
                            <p className="text-sm md:text-base text-gray-300 mb-4 border-t border-white/10 pt-4">
                                The firewall intercepted your connection. You lack the cognitive processing speed for root access.
                            </p>

                            <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-4 mb-6 text-left relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                                <h3 className="text-red-400 font-bold mb-1 text-sm flex items-center gap-2"><TriangleAlert size={14} /> SYSTEM WARNING</h3>
                                <p className="text-xs md:text-sm text-gray-300 leading-relaxed">
                                    Failing here is safe. Failing out there is not. The AI revolution is accelerating, and the skills you rely on today will be obsolete tomorrow. <span className="text-white font-bold">AI Labs</span> is the hyperbolic time chamber where the next generation learns to survive and command the neural nets of the future. Do not fall behind.
                                </p>
                            </div>

                            <button
                                onClick={() => {
                                    setGameState('playing');
                                    setTraceProgress(0);
                                }}
                                className="w-full py-4 px-6 bg-transparent border border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-black uppercase tracking-widest rounded transition-all mb-3 flex items-center justify-center gap-2"
                            >
                                Reboot Sandbox
                            </button>

                            <button
                                onClick={onComplete}
                                className="text-xs text-gray-500 hover:text-white transition-colors underline"
                            >
                                Enter AI Labs anyway
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
