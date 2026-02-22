import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float, Icosahedron, Cylinder, Sphere, Tube, Curve } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Noise } from '@react-three/postprocessing';
import { Network, Zap, Activity, CheckCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import * as THREE from 'three';
import { Difficulty, Language, UserStats } from '../../types';
import { audio } from '../../services/audioService';

interface SynapseSurgeProps {
    onComplete: (score: number) => void;
    difficulty?: Difficulty;
    t: (key: string) => string;
    language?: Language;
    user?: UserStats;
}

// --------------------------------------------------------
// 3D Components
// --------------------------------------------------------

class SplineCurve extends THREE.Curve<THREE.Vector3> {
    points: THREE.Vector3[];
    constructor(points: THREE.Vector3[]) {
        super();
        this.points = points;
    }
    getPoint(t: number, optionalTarget = new THREE.Vector3()) {
        const v = new THREE.Vector3();
        // Simple linear interpolation for the curve
        const p = (this.points.length - 1) * t;
        const intPoint = Math.floor(p);
        const weight = p - intPoint;
        if (intPoint >= this.points.length - 1) {
            return optionalTarget.copy(this.points[this.points.length - 1]);
        }
        const p0 = this.points[intPoint];
        const p1 = this.points[intPoint + 1];
        v.copy(p0).lerp(p1, weight);
        return optionalTarget.copy(v);
    }
}

const SynapseNode = ({ position, type, isActive, onClick, powerLevel }: any) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.x += delta * (isActive ? 1 : 0.2);
            meshRef.current.rotation.y += delta * (isActive ? 1 : 0.2);
            const targetScale = hovered ? 1.4 : 1.0;
            meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
        }
    });

    const color = type === 'SOURCE' ? '#3b82f6' : type === 'TARGET' ? '#10b981' : type === 'BOTTLENECK' ? '#ef4444' : '#8b5cf6';
    const emissiveIntensity = isActive ? 2 : type === 'BOTTLENECK' ? 1 : 0.2;

    return (
        <Float floatIntensity={isActive ? 2 : 0.5} speed={isActive ? 4 : 1}>
            <Sphere
                ref={meshRef}
                args={[type === 'SOURCE' || type === 'TARGET' ? 1.5 : 1, 32, 32]}
                position={position}
                onClick={onClick}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
            >
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={emissiveIntensity}
                    wireframe={type === 'BOTTLENECK' && !isActive}
                    transparent
                    opacity={0.8}
                />
            </Sphere>
            {type !== 'SOURCE' && type !== 'TARGET' && (
                <Text position={[position[0], position[1] + 1.5, position[2]]} fontSize={0.5} color="white" outlineColor="black" outlineWidth={0.05}>
                    {powerLevel}
                </Text>
            )}
        </Float>
    );
};

const DataPulse = ({ curve, speed, onReachEnd }: any) => {
    const ref = useRef<THREE.Mesh>(null);
    const [progress, setProgress] = useState(0);

    useFrame((state, delta) => {
        if (progress >= 1) {
            onReachEnd();
            setProgress(0); // Reset or remove
        } else {
            setProgress(p => Math.min(1, p + delta * speed));
            if (ref.current && curve) {
                const point = curve.getPoint(progress);
                ref.current.position.copy(point);
            }
        }
    });

    return (
        <Sphere ref={ref} args={[0.3, 16, 16]}>
            <meshBasicMaterial color="#ffffff" />
        </Sphere>
    );
};

const AxonConnection = ({ start, end, active }: any) => {
    const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
    const curve = new SplineCurve(points);

    return (
        <group>
            <Tube args={[curve, 20, 0.1, 8, false]}>
                <meshStandardMaterial color={active ? '#3b82f6' : '#334155'} emissive={active ? '#3b82f6' : '#000000'} emissiveIntensity={active ? 1 : 0} transparent opacity={0.5} />
            </Tube>
            {active && <DataPulse curve={curve} speed={0.5} onReachEnd={() => { }} />}
        </group>
    );
};

// --------------------------------------------------------
// Main Game Component
// --------------------------------------------------------

export const SynapseSurge: React.FC<SynapseSurgeProps> = ({ onComplete, difficulty, t }) => {
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(difficulty === 'Elite' ? 45 : 90);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');
    const [surgeLevel, setSurgeLevel] = useState(0);

    const initialNodes = useMemo(() => [
        { id: 'source', type: 'SOURCE', position: [-8, 0, 0], powerLevel: 100, isActive: true },
        { id: 'n1', type: 'ROUTER', position: [-3, 3, -2], powerLevel: 10, isActive: false },
        { id: 'n2', type: 'BOTTLENECK', position: [-2, -3, 2], powerLevel: 5, isActive: false },
        { id: 'n3', type: 'ROUTER', position: [2, 4, 1], powerLevel: 20, isActive: false },
        { id: 'n4', type: 'ROUTER', position: [3, -2, -3], powerLevel: 15, isActive: false },
        ...((difficulty === 'Elite' || difficulty === 'Pro') ? [
            { id: 'n5', type: 'BOTTLENECK', position: [0, 0, 4], powerLevel: 8, isActive: false },
            { id: 'n6', type: 'ROUTER', position: [5, 1, 3], powerLevel: 25, isActive: false },
        ] : []),
        ...((difficulty === 'Elite') ? [
            { id: 'n7', type: 'ROUTER', position: [-5, -1, -4], powerLevel: 12, isActive: false },
            { id: 'n8', type: 'BOTTLENECK', position: [4, -4, 0], powerLevel: 6, isActive: false },
        ] : []),
        { id: 'target', type: 'TARGET', position: [8, 0, 0], powerLevel: 0, isActive: false }
    ], [difficulty]);

    const [nodes, setNodes] = useState(initialNodes);

    const connections = useMemo(() => {
        const baseConns = [
            { source: 'source', target: 'n1' },
            { source: 'source', target: 'n2' },
            { source: 'n1', target: 'n3' },
            { source: 'n2', target: 'n4' },
            { source: 'n3', target: 'target' },
            { source: 'n4', target: 'target' }
        ];

        if (difficulty === 'Pro' || difficulty === 'Elite') {
            baseConns.push({ source: 'source', target: 'n5' });
            baseConns.push({ source: 'n5', target: 'n6' });
            baseConns.push({ source: 'n6', target: 'target' });
            baseConns.push({ source: 'n1', target: 'n5' });
        }

        if (difficulty === 'Elite') {
            baseConns.push({ source: 'source', target: 'n7' });
            baseConns.push({ source: 'n7', target: 'n4' });
            baseConns.push({ source: 'n4', target: 'n8' });
            baseConns.push({ source: 'n8', target: 'target' });
        }

        return baseConns;
    }, [difficulty]);

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
            // Passive surge drain logic could go here
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState]);

    const handleNodeClick = (id: string) => {
        if (gameState !== 'PLAYING') return;
        const node = nodes.find(n => n.id === id);
        if (!node || node.type === 'SOURCE' || node.type === 'TARGET') return;

        audio?.playClick?.();

        setNodes(prev => prev.map(n => {
            if (n.id === id) {
                const isNowActive = !n.isActive;
                return { ...n, isActive: isNowActive };
            }
            return n;
        }));

        setTimeout(() => {
            setNodes(currentNodes => {
                let totalSurge = 0;
                let bottlenecksActive = 0;

                currentNodes.forEach(n => {
                    if (n.isActive && n.type !== 'SOURCE' && n.type !== 'TARGET') {
                        totalSurge += n.powerLevel;
                        if (n.type === 'BOTTLENECK') bottlenecksActive++;
                    }
                });

                setSurgeLevel(totalSurge);

                // Win Condition: Target reach > 50 and less than 2 bottlenecks active
                if (totalSurge >= (difficulty === 'Elite' ? 60 : 40)) {
                    if (bottlenecksActive > 1) {
                        // Too much latency/bottleneck
                        setGameState('FAILED');
                        audio?.playError?.();
                    } else {
                        setGameState('SUCCESS');
                        audio?.playSuccess?.();
                        setScore((timeLeft * 20) + (difficulty === 'Elite' ? 1500 : 800));
                        // Set target active
                        return currentNodes.map(n => n.type === 'TARGET' ? { ...n, isActive: true } : n);
                    }
                }

                // Lose Condition: overloaded
                if (totalSurge >= 100) {
                    setGameState('FAILED');
                    audio?.playError?.();
                }

                return currentNodes;
            });
        }, 100);
    };

    return (
        <div className="w-full h-full min-h-[600px] flex flex-col md:flex-row bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 pointer-events-none">
                <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 pointer-events-auto">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Network className="w-5 h-5 text-blue-400" />
                        Synapse Surge
                    </h2>
                    <div className="text-slate-400 text-sm mt-1">Difficulty: {difficulty}</div>
                </div>

                <div className="flex gap-4 pointer-events-auto">
                    <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                        <Activity className="w-5 h-5 text-purple-400" />
                        <div>
                            <div className="text-xs text-slate-400 font-medium uppercase">Bandwidth Surge</div>
                            <div className={`text-xl font-mono font-bold ${surgeLevel > 80 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                                {surgeLevel} / {difficulty === 'Elite' ? 60 : 40}
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                        <Zap className="w-5 h-5 text-yellow-400" />
                        <div>
                            <div className="text-xs text-slate-400 font-medium uppercase">Time Remaining</div>
                            <div className={`text-xl font-mono font-bold ${timeLeft <= 15 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                                00:{timeLeft.toString().padStart(2, '0')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none text-center w-full max-w-xl">
                <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-blue-900/50 inline-block shadow-lg">
                    <p className="text-blue-200 font-mono text-sm tracking-wider">
                        {gameState === 'PLAYING' ?
                            `Route enough data to hit the ${difficulty === 'Elite' ? 60 : 40} bandwidth target. Avoid activating too many Red bottlenecks or overloading the network (>100).` :
                            gameState === 'SUCCESS' ? "Data transferred successfully with minimal latency." : "Network Overload or Latency Spike detected."}
                    </p>
                </div>
            </div>

            {gameState !== 'PLAYING' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className={`p-8 rounded-2xl border flex flex-col items-center max-w-sm w-full text-center ${gameState === 'SUCCESS' ? 'bg-slate-900/90 border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.3)]' : 'bg-slate-900/90 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)]'
                        }`}>
                        {gameState === 'SUCCESS' ? (
                            <>
                                <CheckCircle className="w-16 h-16 text-blue-400 mb-4" />
                                <h2 className="text-2xl font-bold text-white mb-2">Transfer Complete</h2>
                                <p className="text-slate-300 mb-6">You balanced the load and routed data efficiently.</p>
                                <div className="text-4xl font-mono text-blue-300 mb-8">{score} PTS</div>
                                <button
                                    onClick={() => onComplete(score)}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-blue-500/25"
                                >
                                    Finish Connect
                                </button>
                            </>
                        ) : (
                            <>
                                <AlertTriangle className="w-16 h-16 text-red-400 mb-4" />
                                <h2 className="text-2xl font-bold text-white mb-2">Connection Dropped</h2>
                                <p className="text-slate-300 mb-6">The latency became too high or the network overloaded.</p>
                                <div className="flex gap-4 w-full">
                                    <button
                                        onClick={() => onComplete(0)}
                                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-all"
                                    >
                                        Abort
                                    </button>
                                    <button
                                        onClick={() => {
                                            setGameState('PLAYING');
                                            setTimeLeft(difficulty === 'Elite' ? 45 : 90);
                                            setNodes(initialNodes);
                                            setSurgeLevel(0);
                                        }}
                                        className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-red-500/25"
                                    >
                                        Reconnect
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 w-full bg-black relative">
                <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
                    <color attach="background" args={['#020617']} />
                    <ambientLight intensity={0.2} />
                    <pointLight position={[0, 0, 10]} intensity={1.5} color="#3b82f6" />

                    <group>
                        {connections.map((c, i) => {
                            const sourceNode = nodes.find(n => n.id === c.source);
                            const targetNode = nodes.find(n => n.id === c.target);
                            if (!sourceNode || !targetNode) return null;

                            // Active if SOURCE is active and TARGET is active (or source is SOURCE itself and its target is active)
                            const active = (sourceNode.type === 'SOURCE' && targetNode.isActive) || (sourceNode.isActive && targetNode.isActive);

                            return (
                                <AxonConnection
                                    key={i}
                                    start={sourceNode.position}
                                    end={targetNode.position}
                                    active={active}
                                />
                            );
                        })}

                        {nodes.map(n => (
                            <SynapseNode
                                key={n.id}
                                type={n.type}
                                position={n.position}
                                isActive={n.isActive}
                                powerLevel={n.powerLevel}
                                onClick={() => handleNodeClick(n.id as string)}
                            />
                        ))}
                    </group>

                    <OrbitControls
                        enablePan={true}
                        enableZoom={true}
                        autoRotate={gameState === 'PLAYING'}
                        autoRotateSpeed={0.2}
                    />

                    <EffectComposer>
                        <Bloom luminanceThreshold={0.3} luminanceSmoothing={0.9} height={300} intensity={1.5} />
                        <ChromaticAberration offset={new THREE.Vector2(0.002, 0.002)} />
                        {surgeLevel > 80 && <Noise opacity={0.1} />}
                    </EffectComposer>
                </Canvas>
            </div>

        </div>
    );
};
