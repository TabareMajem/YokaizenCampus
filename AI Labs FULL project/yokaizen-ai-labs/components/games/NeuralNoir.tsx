import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Line, Text, Float, Sparkles, Html } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise, Scanline } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Search, Link, Fingerprint, Database, Eye, FileText, Lock, CheckCircle2 } from 'lucide-react';
import { audio } from '../../services/audioService';
import { motion, AnimatePresence } from 'framer-motion';

export interface NeuralNoirProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

// Logic Types
interface EvidenceNode {
    id: string;
    label: string;
    icon: any;
    x: number;
    y: number;
    description: string;
}

interface ConnectionTarget {
    from: string;
    to: string;
    type: 'valid' | 'invalid';
}

const EVIDENCE: EvidenceNode[] = [
    { id: 'e1', label: 'Rogue Drone Logs', icon: Database, x: -3, y: 2, description: 'Encrypted flight path data.' },
    { id: 'e2', label: 'Corposyndicate Memo', icon: FileText, x: 3, y: 2.5, description: '"Project Icarus is go. Silence the engineer."' },
    { id: 'e3', label: 'Hacked Cybernetics', icon: Eye, x: -2, y: -2, description: 'Optic sensor override code found.' },
    { id: 'e4', label: 'Victim: Dr. Aris', icon: Fingerprint, x: 0, y: 0, description: 'Lead engineer on Project Icarus.' },
    { id: 'e5', label: 'Encrypted Account', icon: Lock, x: 2.5, y: -1.5, description: 'Offshore credits wired 10 minutes prior.' }
];

const SOLUTION_CONNECTIONS: ConnectionTarget[] = [
    { from: 'e4', to: 'e3', type: 'valid' }, // Victim -> Hacked Cybernetics
    { from: 'e4', to: 'e2', type: 'valid' }, // Victim -> Syndicate Memo
    { from: 'e2', to: 'e5', type: 'valid' }, // Memo -> Offshore Account
    { from: 'e1', to: 'e3', type: 'valid' }, // Drone Logs -> Hacked Cybernetics
];

export const NeuralNoir: React.FC<NeuralNoirProps> = ({ onComplete, difficulty, t }) => {
    const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'SUCCESS' | 'FAILED'>('IDLE');
    const [timeLeft, setTimeLeft] = useState(180);
    const [score, setScore] = useState(0);

    const [connections, setConnections] = useState<{ from: string, to: string, isCorrect: boolean }[]>([]);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [inspectNode, setInspectNode] = useState<EvidenceNode | null>(null);

    // Initial Generator
    const startGame = () => {
        setConnections([]);
        setSelectedNode(null);
        setInspectNode(null);
        setTimeLeft(difficulty === 'Elite' ? 120 : 180);
        setScore(0);
        setGameState('PLAYING');
        audio.playSystemMessage({ type: 'success' });
    };

    const handleNodeClick = (nodeId: string) => {
        if (gameState !== 'PLAYING') return;

        audio.playTyping();
        const node = EVIDENCE.find(e => e.id === nodeId)!;
        setInspectNode(node);

        if (selectedNode === null) {
            setSelectedNode(nodeId);
        } else if (selectedNode === nodeId) {
            // Deselect
            setSelectedNode(null);
        } else {
            // Try connection
            handleConnectionAttempt(selectedNode, nodeId);
            setSelectedNode(null);
        }
    };

    const handleConnectionAttempt = (n1: string, n2: string) => {
        // Prevent dupes
        if (connections.some(c => (c.from === n1 && c.to === n2) || (c.from === n2 && c.to === n1))) {
            return;
        }

        // Check against solution
        const isValid = SOLUTION_CONNECTIONS.some(c =>
            (c.from === n1 && c.to === n2) || (c.from === n2 && c.to === n1)
        );

        if (isValid) {
            audio.playSystemMessage({ type: 'success' });
            setScore(s => s + 250);

            const newConns = [...connections, { from: n1, to: n2, isCorrect: true }];
            setConnections(newConns);

            // Check Win
            if (newConns.filter(c => c.isCorrect).length === SOLUTION_CONNECTIONS.length) {
                setGameState('SUCCESS');
                setTimeout(() => onComplete(1000 + (timeLeft * 5), { timeRemaining: timeLeft }), 3000);
            }
        } else {
            audio.playError();
            setScore(s => Math.max(0, s - 50));
            // Add wrong connection temporarily
            const cInfo = { from: n1, to: n2, isCorrect: false };
            setConnections(prev => [...prev, cInfo]);

            setTimeout(() => {
                setConnections(prev => prev.filter(c => c !== cInfo));
            }, 1000);
        }
    };

    // Timer
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        const timer = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    setGameState('FAILED');
                    setTimeout(() => onComplete(score, { timeRemaining: 0 }), 3000);
                    return 0;
                }
                return t - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [gameState, score, onComplete]);


    return (
        <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 font-serif select-none shadow-[0_0_60px_rgba(0,0,0,0.5)] cursor-crosshair">

            {/* 3D Environment Background */}
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 0, 7], fov: 45 }}>
                    <ambientLight intensity={0.2} color="#ffffff" />
                    <pointLight position={[5, 5, 5]} intensity={1.5} color="#e5e5e5" distance={10} />
                    <pointLight position={[-5, -5, 2]} intensity={0.5} color="#3b82f6" />

                    {/* The Corkboard */}
                    <mesh position={[0, 0, -1]} receiveShadow>
                        <planeGeometry args={[15, 10]} />
                        <meshStandardMaterial color="#1a1a1a" roughness={0.9} metalness={0.1} />
                    </mesh>

                    {/* Evidence Nodes */}
                    {gameState !== 'IDLE' && EVIDENCE.map((node) => {
                        const isSelected = selectedNode === node.id;
                        return (
                            <group key={node.id} position={[node.x, node.y, 0]}>
                                <Float speed={2} floatIntensity={0.2} floatingRange={[-0.05, 0.05]}>
                                    {/* The Photo/Paper Mesh */}
                                    <mesh
                                        onClick={(e) => { e.stopPropagation(); handleNodeClick(node.id); }}
                                        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
                                        onPointerOut={() => { document.body.style.cursor = 'crosshair'; }}
                                    >
                                        <boxGeometry args={[1.5, 1.5, 0.05]} />
                                        <meshStandardMaterial color={isSelected ? '#eab308' : '#fafafa'} roughness={0.5} />
                                    </mesh>

                                    {/* The Pin */}
                                    <mesh position={[0, 0.6, 0.05]}>
                                        <cylinderGeometry args={[0.05, 0.05, 0.1]} />
                                        <meshStandardMaterial color="#ef4444" metalness={0.5} />
                                    </mesh>

                                    <Html transform position={[0, 0, 0.1]} distanceFactor={7} pointerEvents="none" center>
                                        <div className="flex flex-col items-center justify-center w-[120px] h-[120px] text-zinc-900 border-2 border-dashed border-zinc-300 pointer-events-none p-2">
                                            <node.icon className={`w-8 h-8 mb-2 ${isSelected ? 'text-zinc-900' : 'text-zinc-500'}`} />
                                            <p className="text-[10px] text-center font-bold leading-tight">{node.label}</p>
                                        </div>
                                    </Html>
                                </Float>
                            </group>
                        );
                    })}

                    {/* Connections (The String) */}
                    {gameState !== 'IDLE' && connections.map((conn, idx) => {
                        const n1 = EVIDENCE.find(e => e.id === conn.from)!;
                        const n2 = EVIDENCE.find(e => e.id === conn.to)!;
                        // bezier curve points
                        const midX = (n1.x + n2.x) / 2;
                        const midY = (n1.y + n2.y) / 2 - 0.5; // sag

                        return (
                            <Line
                                key={idx}
                                points={[[n1.x, n1.y, 0.1], [midX, midY, 0.2], [n2.x, n2.y, 0.1]]}
                                color={conn.isCorrect ? "#ef4444" : "#ffffff"}
                                lineWidth={2}
                                dashed={!conn.isCorrect}
                            // A slight sine sag effect could be added here mathematically
                            />
                        )
                    })}

                    {selectedNode && inspectNode && selectedNode !== inspectNode.id && (
                        <Line
                            points={[[EVIDENCE.find(e => e.id === selectedNode)!.x, EVIDENCE.find(e => e.id === selectedNode)!.y, 0.1], [inspectNode.x, inspectNode.y, 0.1]]}
                            color="#eab308"
                            lineWidth={1}
                            dashed
                        />
                    )}

                    <OrbitControls maxPolarAngle={Math.PI / 2} minPolarAngle={Math.PI / 3} minAzimuthAngle={-0.2} maxAzimuthAngle={0.2} enableZoom={false} enablePan={false} />

                    <EffectComposer>
                        <Bloom luminanceThreshold={0.5} mipmapBlur intensity={0.5} />
                        <Vignette darkness={0.6} offset={0.1} />
                        <Noise opacity={0.06} blendFunction={BlendFunction.OVERLAY} />
                        <Scanline blendFunction={BlendFunction.OVERLAY} density={1.5} opacity={0.1} />
                    </EffectComposer>
                </Canvas>
            </div>

            {/* UI Layer */}
            {gameState !== 'IDLE' && (
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between p-6">
                    {/* Top HUD */}
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-4">
                            <div className="bg-black/80 backdrop-blur-md rounded border border-zinc-800 p-4 shadow-xl pointer-events-auto">
                                <div className="text-[10px] text-zinc-400 mb-1 uppercase tracking-widest font-sans flex items-center gap-2">
                                    <Search className="w-3 h-3" /> Investigation Progress
                                </div>
                                <div className="text-3xl text-white font-serif">{connections.filter(c => c.isCorrect).length} <span className="text-sm text-zinc-600">/ {SOLUTION_CONNECTIONS.length} Links</span></div>
                            </div>

                            {inspectNode && (
                                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-zinc-900/90 backdrop-blur-md rounded border-l-4 border-zinc-500 p-4 w-64 shadow-2xl pointer-events-auto font-sans">
                                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-zinc-800">
                                        <inspectNode.icon className="w-4 h-4 text-zinc-400" />
                                        <span className="text-xs font-bold text-zinc-200">{inspectNode.label}</span>
                                    </div>
                                    <p className="text-xs text-zinc-400 leading-relaxed italic">"{inspectNode.description}"</p>

                                    {selectedNode && selectedNode !== inspectNode.id && (
                                        <div className="mt-3 text-[10px] text-yellow-500 flex items-center gap-1 animate-pulse">
                                            <Link className="w-3 h-3" /> Click to attempt connection
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </div>

                        {/* Right HUD (Timer / Score) */}
                        <div className="flex flex-col items-end gap-4 pointer-events-auto">
                            <div className="bg-black/80 backdrop-blur-md rounded p-4 border border-zinc-800 flex flex-col items-end shadow-xl">
                                <div className="flex items-center gap-2 text-zinc-500 mb-1">
                                    <span className="text-[10px] uppercase tracking-widest font-sans">Deadline</span>
                                </div>
                                <div className={`text-4xl font-serif ${timeLeft <= 30 ? 'text-red-500' : 'text-white'}`}>
                                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                </div>
                            </div>

                            <div className="bg-black/80 backdrop-blur-md rounded p-3 border border-zinc-800 flex flex-col items-end min-w-[120px] shadow-xl">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-sans mb-1">Deduction Score</span>
                                <span className="text-xl text-white font-serif">{score}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Overlays */}
            <AnimatePresence>
                {gameState === 'IDLE' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-8 text-center backdrop-blur-sm">
                        <div className="max-w-md border border-zinc-800 p-10 rounded bg-zinc-950 shadow-2xl">
                            <Search className="w-12 h-12 text-zinc-500 mx-auto mb-6 opacity-50" />
                            <h2 className="text-3xl text-zinc-200 mb-6 font-serif tracking-wide">Neural Noir</h2>
                            <p className="text-zinc-400 text-sm mb-8 leading-relaxed font-sans">
                                Dr. Aris is dead. The local authorities called it an accident. The evidence says otherwise.
                                <br /><br />
                                Click nodes to select them, then click another to draw a connection string. Deduce the {SOLUTION_CONNECTIONS.length} correct links that prove the conspiracy before the Corporate Cleaners arrive.
                            </p>
                            <button onClick={startGame} className="w-full py-4 bg-zinc-100 hover:bg-white text-black font-bold uppercase tracking-widest rounded transition-colors font-sans text-xs">
                                Review Evidence
                            </button>
                        </div>
                    </motion.div>
                )}

                {gameState === 'SUCCESS' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/95 backdrop-blur-lg">
                        <div className="text-center">
                            <CheckCircle2 className="w-20 h-20 text-zinc-300 mx-auto mb-6" />
                            <h2 className="text-5xl text-white mb-4 font-serif tracking-widest uppercase">Case Closed</h2>
                            <p className="text-zinc-400 text-lg font-sans mb-8">The conspiracy has been unraveled.</p>
                            <div className="text-zinc-600 text-sm font-mono">Final Score: {score + (timeLeft * 5)}</div>
                        </div>
                    </motion.div>
                )}

                {gameState === 'FAILED' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black backdrop-blur-lg">
                        <h2 className="text-5xl text-zinc-500 mb-4 font-serif tracking-widest uppercase border-b border-zinc-800 pb-4">Cold Case</h2>
                        <p className="text-zinc-600 text-lg font-sans mb-8">The cleaners arrived. The truth is buried.</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
