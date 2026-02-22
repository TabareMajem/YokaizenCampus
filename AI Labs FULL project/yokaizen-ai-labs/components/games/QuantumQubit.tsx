import React, { useState, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Float, Icosahedron, Trail, MeshDistortMaterial, Sphere, Box } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette } from '@react-three/postprocessing';
import { Cpu, Zap, Activity, CheckCircle, RotateCcw } from 'lucide-react';
import * as THREE from 'three';
import { Difficulty, Language, UserStats } from '../../types';
import { audio } from '../../services/audioService';

interface QuantumQubitProps {
    onComplete: (score: number) => void;
    difficulty?: Difficulty;
    t: (key: string) => string;
    language?: Language;
    user?: UserStats;
}

// --------------------------------------------------------
// 3D Components
// --------------------------------------------------------

const QubitNode = ({ position, color, isActive, onClick, scale = 1 }: any) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x += isActive ? 0.05 : 0.01;
            meshRef.current.rotation.y += isActive ? 0.05 : 0.01;
            const targetScale = hovered ? scale * 1.2 : scale;
            meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
        }
    });

    return (
        <Float speed={2} rotationIntensity={1} floatIntensity={isActive ? 2 : 0.5}>
            <Icosahedron
                ref={meshRef}
                args={[1, 1]}
                position={position}
                onClick={onClick}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
            >
                <MeshDistortMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={isActive ? 2 : 0.2}
                    wireframe={!isActive}
                    distort={isActive ? 0.4 : 0}
                    speed={isActive ? 5 : 1}
                    roughness={0.2}
                    metalness={0.8}
                />
            </Icosahedron>
        </Float>
    );
};

const ConnectionEdge = ({ start, end, active }: any) => {
    const ref = useRef<THREE.Line>(null);

    const points = useMemo(() => {
        return [
            new THREE.Vector3(...start),
            new THREE.Vector3(...end)
        ];
    }, [start, end]);

    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        return geo;
    }, [points]);

    return (
        <line ref={ref} geometry={geometry}>
            <lineBasicMaterial color={active ? "#00ffff" : "#334155"} linewidth={active ? 3 : 1} transparent opacity={active ? 0.8 : 0.3} />
        </line>
    );
};

const BackgroundCore = () => {
    const ref = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        if (ref.current) {
            ref.current.rotation.y = clock.getElapsedTime() * 0.05;
            ref.current.rotation.z = clock.getElapsedTime() * 0.02;
        }
    });

    return (
        <group ref={ref}>
            <Sphere args={[20, 32, 32]}>
                <meshBasicMaterial color="#0f172a" wireframe transparent opacity={0.1} />
            </Sphere>
            <Box args={[30, 30, 30]}>
                <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.05} />
            </Box>
        </group>
    );
};

// --------------------------------------------------------
// Main Game Component
// --------------------------------------------------------

export const QuantumQubit: React.FC<QuantumQubitProps> = ({ onComplete, difficulty, t }) => {
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(difficulty === 'Elite' ? 45 : 90);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');

    // Qubit States
    const numQubits = difficulty === 'Elite' ? 6 : difficulty === 'Pro' ? 5 : 4;

    const initialNodes = useMemo(() => {
        return Array.from({ length: numQubits }).map((_, i) => ({
            id: i,
            position: [
                Math.sin((i / numQubits) * Math.PI * 2) * 5,
                Math.cos((i / numQubits) * Math.PI * 2) * 5,
                (Math.random() - 0.5) * 4
            ] as [number, number, number],
            state: Math.random() > 0.5 ? 1 : 0, // 0 = blue, 1 = purple
            color: Math.random() > 0.5 ? '#3b82f6' : '#a855f7'
        }));
    }, [numQubits]);

    const [nodes, setNodes] = useState(initialNodes);

    // Edges
    const edges = useMemo(() => {
        const e = [];
        for (let i = 0; i < numQubits; i++) {
            e.push({ source: i, target: (i + 1) % numQubits });
            e.push({ source: i, target: (i + 2) % numQubits });
        }
        return e;
    }, [numQubits]);

    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setGameState('FAILED');
                    audio?.playError?.();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState]);

    const handleNodeClick = (id: number) => {
        if (gameState !== 'PLAYING') return;
        audio?.playClick?.();

        setNodes(prev => prev.map(node => {
            if (node.id === id) {
                return {
                    ...node,
                    state: node.state === 1 ? 0 : 1,
                    color: node.state === 1 ? '#3b82f6' : '#a855f7'
                };
            }
            return node;
        }));

        // Entanglement Check (Win Condition: All nodes match state 1 (purple))
        setTimeout(() => {
            setNodes(currentNodes => {
                const allEntangled = currentNodes.every(n => n.state === 1);
                if (allEntangled && gameState === 'PLAYING') {
                    setGameState('SUCCESS');
                    audio?.playSuccess?.();
                    setScore((timeLeft * 10) + (difficulty === 'Elite' ? 1000 : 500));
                }
                return currentNodes;
            });
        }, 100);
    };

    return (
        <div className="w-full h-full min-h-[600px] flex flex-col md:flex-row bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">

            {/* UI Overlay */}
            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 pointer-events-none">
                <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 pointer-events-auto">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-purple-400" />
                        Quantum Qubit
                    </h2>
                    <div className="text-slate-400 text-sm mt-1">Difficulty: {difficulty}</div>
                </div>

                <div className="flex gap-4">
                    <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                        <Zap className="w-5 h-5 text-blue-400" />
                        <div>
                            <div className="text-xs text-slate-400 font-medium uppercase">Time Remaining</div>
                            <div className={`text-xl font-mono font-bold ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                                00:{timeLeft.toString().padStart(2, '0')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Subtitles / Instructions */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none text-center w-full max-w-lg">
                <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-blue-900/50 inline-block shadow-lg">
                    <p className="text-blue-200 font-mono text-sm uppercase tracking-wider">
                        {gameState === 'PLAYING' ?
                            "Align all qubits to superposition state (Purple) to achieve full Quantum Entanglement." :
                            gameState === 'SUCCESS' ? "Quantum Coherence Achieved." : "Decoherence. System Collapsed."}
                    </p>
                </div>
            </div>

            {/* Game Over / Success Modal */}
            {gameState !== 'PLAYING' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className={`p-8 rounded-2xl border flex flex-col items-center max-w-sm w-full text-center ${gameState === 'SUCCESS' ? 'bg-slate-900/90 border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.3)]' : 'bg-slate-900/90 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)]'
                        }`}>
                        {gameState === 'SUCCESS' ? (
                            <>
                                <CheckCircle className="w-16 h-16 text-blue-400 mb-4" />
                                <h2 className="text-2xl font-bold text-white mb-2">Entanglement Complete</h2>
                                <p className="text-slate-300 mb-6">You successfully stabilized the quantum matrix.</p>
                                <div className="text-4xl font-mono text-blue-300 mb-8">{score} PTS</div>
                                <button
                                    onClick={() => onComplete(score)}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-blue-500/25"
                                >
                                    Claim Data
                                </button>
                            </>
                        ) : (
                            <>
                                <RotateCcw className="w-16 h-16 text-red-400 mb-4" />
                                <h2 className="text-2xl font-bold text-white mb-2">System Collapsed</h2>
                                <p className="text-slate-300 mb-6">The qubit states decohered before you could stabilize them.</p>
                                <div className="flex gap-4 w-full">
                                    <button
                                        onClick={() => onComplete(0)}
                                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-all"
                                    >
                                        Exit
                                    </button>
                                    <button
                                        onClick={() => {
                                            setGameState('PLAYING');
                                            setTimeLeft(difficulty === 'Elite' ? 45 : 90);
                                            setNodes(initialNodes);
                                        }}
                                        className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-red-500/25"
                                    >
                                        Retry
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* 3D Canvas */}
            <div className="flex-1 w-full bg-black relative">
                <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
                    <color attach="background" args={['#020617']} />
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1} color="#3b82f6" />
                    <pointLight position={[-10, -10, -10]} intensity={1} color="#a855f7" />

                    <BackgroundCore />

                    <group>
                        {/* Render Edges */}
                        {edges.map((edge, i) => {
                            const sourceNode = nodes.find(n => n.id === edge.source);
                            const targetNode = nodes.find(n => n.id === edge.target);
                            if (!sourceNode || !targetNode) return null;
                            const isActive = sourceNode.state === 1 && targetNode.state === 1;

                            return (
                                <ConnectionEdge
                                    key={`edge-${i}`}
                                    start={sourceNode.position}
                                    end={targetNode.position}
                                    active={isActive}
                                />
                            );
                        })}

                        {/* Render Nodes */}
                        {nodes.map((node) => (
                            <QubitNode
                                key={node.id}
                                position={node.position}
                                color={node.color}
                                isActive={node.state === 1}
                                onClick={() => handleNodeClick(node.id)}
                                scale={node.state === 1 ? 1.5 : 1}
                            />
                        ))}
                    </group>

                    <OrbitControls
                        enablePan={false}
                        enableZoom={false}
                        autoRotate={gameState === 'PLAYING'}
                        autoRotateSpeed={0.5}
                    />

                    <EffectComposer>
                        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={1.5} />
                        <ChromaticAberration offset={new THREE.Vector2(0.002, 0.002)} />
                        <Noise opacity={0.05} />
                        <Vignette eskil={false} offset={0.1} darkness={1.5} />
                    </EffectComposer>
                </Canvas>
            </div>

        </div>
    );
};
