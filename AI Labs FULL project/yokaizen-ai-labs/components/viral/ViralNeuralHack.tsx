import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text3D, Center, Float, Sparkles, Line, Instances, Instance, Environment, Bloom, EffectComposer } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, Lock, ScanLine, Brain, TriangleAlert } from 'lucide-react';
import { useDialogue } from '../../contexts/DialogueContext';

interface GameProps {
    onComplete: () => void;
}

const CONSTANTS = {
    NODES_COUNT: 15,
    MAX_CONNECTIONS: 6,
    WIN_CONDITION: 5,
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

const NeuralNetwork = ({ onHackComplete }: { onHackComplete: () => void }) => {
    const [nodes, setNodes] = useState(generateNodes(CONSTANTS.NODES_COUNT));
    const [connections, setConnections] = useState<[THREE.Vector3, THREE.Vector3][]>([]);
    const [activePath, setActivePath] = useState<number[]>([]);

    const handleNodeClick = (id: number) => {
        if (activePath.includes(id)) return; // Prevent loops

        const newNode = nodes.find(n => n.id === id);
        if (!newNode) return;

        // Check if within distance of last node if there is an active path
        if (activePath.length > 0) {
            const lastNodeId = activePath[activePath.length - 1];
            const lastNode = nodes.find(n => n.id === lastNodeId);
            if (lastNode && lastNode.position.distanceTo(newNode.position) > 6) {
                // Too far to connect
                return;
            }

            // Add connection line
            if (lastNode) {
                setConnections(prev => [...prev, [lastNode.position, newNode.position]]);
            }
        }

        const newPath = [...activePath, id];
        setActivePath(newPath);

        setNodes(prev => prev.map(n => ({
            ...n,
            active: true,
            hacked: newPath.includes(n.id)
        })));

        if (newPath.length >= CONSTANTS.WIN_CONDITION) {
            setTimeout(() => onHackComplete(), 1000);
        }
    };

    return (
        <group>
            {nodes.map((node) => (
                <mesh
                    key={node.id}
                    position={node.position}
                    onClick={(e) => { e.stopPropagation(); handleNodeClick(node.id); }}
                    onPointerOver={(e) => { document.body.style.cursor = 'pointer'; }}
                    onPointerOut={(e) => { document.body.style.cursor = 'default'; }}
                >
                    <sphereGeometry args={[0.3, 32, 32]} />
                    <meshStandardMaterial
                        color={node.hacked ? '#00ffff' : '#ff0055'}
                        emissive={node.hacked ? '#00ffff' : '#440022'}
                        emissiveIntensity={node.hacked ? 2 : 0.5}
                        toneMapped={false}
                    />
                    {node.hacked && (
                        <pointLight distance={3} intensity={2} color="#00ffff" />
                    )}
                </mesh>
            ))}

            {connections.map((points, idx) => (
                <Line
                    key={idx}
                    points={points}
                    color="#00ffff"
                    lineWidth={3}
                    dashed={false}
                />
            ))}

            <Sparkles count={100} scale={15} size={2} color="#00ffff" speed={0.5} opacity={0.2} />
        </group>
    );
};

export const ViralNeuralHack: React.FC<GameProps> = ({ onComplete }) => {
    const { queueDialogue } = useDialogue();
    const [gameState, setGameState] = useState<'playing' | 'hacked'>('playing');

    useEffect(() => {
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
                text: `Connect ${CONSTANTS.WIN_CONDITION} neural nodes to bypass the firewall before the security trace hits 100%. Don't cross the streams.`
            }
        ]);
    }, [queueDialogue]);

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
            {/* 3D Canvas Context */}
            <Canvas camera={{ position: [0, 0, 12], fov: 60 }}>
                <color attach="background" args={['#050510']} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <NeuralNetwork onHackComplete={handleHackComplete} />
                <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
                {/* Basic Bloom effect manually handled by materials and emissive if PostProcessing not fully installed, but typically we'd use <EffectComposer><Bloom/></EffectComposer> */}
            </Canvas>

            {/* Massive Typography Background Overlay (Simulated HTML 3D for universal font support) */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10">
                <h1 className="text-[15vw] font-black text-white mix-blend-overlay tracking-tighter" style={{ transform: 'scaleY(1.5)' }}>
                    AI LABS
                </h1>
            </div>

            {/* UI Overlay */}
            <div className="absolute top-0 left-0 w-full p-8 pointer-events-none flex justify-between items-start">
                <div>
                    <h2 className="text-cyan-400 font-bold tracking-widest flex items-center gap-2">
                        <Lock size={16} /> SECURE CORE INTERFACE
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">Gaining root access... Connect {CONSTANTS.WIN_CONDITION} neural nodes to bypass firewall.</p>
                </div>
                <div className="text-right">
                    <div className="flex items-center gap-2 text-red-500 animate-pulse font-bold">
                        <TriangleAlert size={16} /> INTRUSION DETECTED
                    </div>
                    <p className="text-gray-500 text-xs mt-1">TRACE IN PROGRESS: {Math.floor(Math.random() * 99)}%</p>
                </div>
            </div>

            {/* Crosshair */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-30">
                <ScanLine size={48} className="text-cyan-500" />
            </div>

            {/* Success Modal */}
            <AnimatePresence>
                {gameState === 'hacked' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
                    >
                        <div className="max-w-md w-full p-8 border border-cyan-500/30 bg-black/50 rounded-2xl text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

                            <div className="w-20 h-20 mx-auto bg-cyan-500/20 rounded-full flex items-center justify-center mb-6">
                                <Brain className="text-cyan-400 w-10 h-10" />
                            </div>

                            <h2 className="text-4xl font-black text-white mb-2 tracking-tight">ROOT ACCESS<br /><span className="text-cyan-400">GRANTED</span></h2>
                            <p className="text-gray-300 mb-8 border-y border-white/10 py-4">
                                You have successfully bypassed the perimeter firewall. The AI Labs core is now open. Register to establish your command identity.
                            </p>

                            <button
                                onClick={onComplete}
                                className="w-full py-4 px-6 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest rounded transition-all hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] flex items-center justify-center gap-2 group"
                            >
                                <Zap size={20} className="group-hover:animate-bounce" /> Proceed to Onboarding
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
