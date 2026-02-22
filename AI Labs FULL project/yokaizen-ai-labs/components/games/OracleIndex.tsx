import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float, Icosahedron, Box } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { Database, Search, Activity, CheckCircle, RotateCcw } from 'lucide-react';
import * as THREE from 'three';
import { Difficulty, Language, UserStats } from '../../types';
import { audio } from '../../services/audioService';

interface OracleIndexProps {
    onComplete: (score: number) => void;
    difficulty?: Difficulty;
    t: (key: string) => string;
    language?: Language;
    user?: UserStats;
}

const VectorPoint = ({ position, onClick, isTarget, selected, hovered, setHovered }: any) => {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.x += delta * 0.2;
            meshRef.current.rotation.y += delta * 0.2;
            const targetScale = hovered || selected ? 1.5 : (isTarget ? 2 : 1.0);
            meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
        }
    });

    return (
        <mesh
            ref={meshRef}
            position={position}
            onClick={onClick}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
        >
            {isTarget ? (
                <icosahedronGeometry args={[0.6, 1]} />
            ) : (
                <boxGeometry args={[0.4, 0.4, 0.4]} />
            )}
            <meshStandardMaterial
                color={selected ? '#10b981' : isTarget ? '#f59e0b' : hovered ? '#ffffff' : '#3b82f6'}
                emissive={selected ? '#10b981' : isTarget ? '#f59e0b' : hovered ? '#ffffff' : '#3b82f6'}
                emissiveIntensity={selected || isTarget ? 2 : hovered ? 1 : 0.5}
                roughness={0.2}
                metalness={0.8}
            />
        </mesh>
    );
};

export const OracleIndex: React.FC<OracleIndexProps> = ({ onComplete, difficulty, t }) => {
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(difficulty === 'Elite' ? 60 : 120);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');

    const numPoints = difficulty === 'Elite' ? 40 : 20;
    const itemsToFind = difficulty === 'Elite' ? 5 : 3;

    const [points, setPoints] = useState<any[]>([]);
    const [targetVector, setTargetVector] = useState<THREE.Vector3>(new THREE.Vector3());
    const [foundCount, setFoundCount] = useState(0);

    const generateSpace = () => {
        const newTarget = new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
        );

        const newPoints = Array.from({ length: numPoints }).map((_, i) => {
            const pos = new THREE.Vector3(
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20
            );

            // Force some points to be very close to target
            if (i < itemsToFind) {
                pos.copy(newTarget).add(new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2
                ));
            }

            return {
                id: i,
                position: pos.toArray(),
                distance: pos.distanceTo(newTarget),
                selected: false,
                hovered: false,
                isClosest: i < itemsToFind // Simplification: we know the first few are the closest artificially
            };
        });

        // Shuffle
        newPoints.sort(() => Math.random() - 0.5);

        // Calculate actual closest
        const sortedDistances = [...newPoints].sort((a, b) => a.distance - b.distance);
        const thresholdDistance = sortedDistances[itemsToFind - 1].distance;

        newPoints.forEach(p => {
            p.isClosest = p.distance <= thresholdDistance;
        });

        setTargetVector(newTarget);
        setPoints(newPoints);
        setFoundCount(0);
    };

    useEffect(() => {
        generateSpace();
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
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState]);

    const handlePointClick = (id: number) => {
        if (gameState !== 'PLAYING') return;

        const pointIndex = points.findIndex(p => p.id === id);
        if (pointIndex === -1 || points[pointIndex].selected) return;

        if (points[pointIndex].isClosest) {
            audio?.playSuccess?.();
            const newPoints = [...points];
            newPoints[pointIndex].selected = true;
            setPoints(newPoints);

            setFoundCount(prev => {
                const newCount = prev + 1;
                if (newCount >= itemsToFind) {
                    setGameState('SUCCESS');
                    setScore((timeLeft * 10) + (difficulty === 'Elite' ? 1000 : 500));
                }
                return newCount;
            });
        } else {
            // Penalty for wrong click
            audio?.playError?.();
            setTimeLeft(prev => Math.max(0, prev - 5));
        }
    };

    return (
        <div className="w-full h-full min-h-[600px] flex flex-col md:flex-row bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 pointer-events-none">
                <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 pointer-events-auto">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Database className="w-5 h-5 text-blue-400" />
                        Oracle Index
                    </h2>
                    <div className="text-slate-400 text-sm mt-1">Target Cluster: {foundCount} / {itemsToFind}</div>
                </div>

                <div className="flex gap-4">
                    <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                        <Activity className="w-5 h-5 text-purple-400" />
                        <div>
                            <div className="text-xs text-slate-400 font-medium uppercase">Query Time</div>
                            <div className={`text-xl font-mono font-bold ${timeLeft <= 15 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                                00:{timeLeft.toString().padStart(2, '0')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none text-center w-full max-w-lg">
                <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-blue-900/50 inline-block shadow-lg">
                    <p className="text-blue-200 font-mono text-sm tracking-wider">
                        {gameState === 'PLAYING' ?
                            `Locate the ${itemsToFind} semantic data blocks closest to the central Orange Query Vector.` :
                            gameState === 'SUCCESS' ? "RAG query executed perfectly. Data retrieved." : "Query Timeout. Index failed."}
                    </p>
                </div>
            </div>

            {gameState !== 'PLAYING' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
                    <div className={`p-8 rounded-2xl border flex flex-col items-center max-w-sm w-full text-center ${gameState === 'SUCCESS' ? 'bg-slate-900/90 border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.3)]' : 'bg-slate-900/90 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)]'
                        }`}>
                        {gameState === 'SUCCESS' ? (
                            <>
                                <CheckCircle className="w-16 h-16 text-blue-400 mb-4" />
                                <h2 className="text-2xl font-bold text-white mb-2">Query Complete</h2>
                                <p className="text-slate-300 mb-6">You successfully retrieved Semantically Similar nodes.</p>
                                <div className="text-4xl font-mono text-blue-300 mb-8">{score} PTS</div>
                                <button
                                    onClick={() => onComplete(score)}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-blue-500/25"
                                >
                                    Index Data
                                </button>
                            </>
                        ) : (
                            <>
                                <RotateCcw className="w-16 h-16 text-red-400 mb-4" />
                                <h2 className="text-2xl font-bold text-white mb-2">Timeout</h2>
                                <p className="text-slate-300 mb-6">Failed to retrieve the correct context vectors in time.</p>
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
                                            setTimeLeft(difficulty === 'Elite' ? 60 : 120);
                                            generateSpace();
                                            setScore(0);
                                        }}
                                        className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-red-500/25"
                                    >
                                        Re-Query
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 w-full bg-black relative">
                <Canvas camera={{ position: [0, 0, 25], fov: 60 }}>
                    <color attach="background" args={['#020617']} />
                    <ambientLight intensity={0.2} />
                    <pointLight position={[10, 10, 10]} intensity={1.5} color="#3b82f6" />

                    <group>
                        {/* Target Query Vector */}
                        <VectorPoint
                            position={targetVector.toArray()}
                            isTarget={true}
                        />

                        {/* Distance reference rings */}
                        <mesh position={targetVector.toArray()} rotation={[Math.PI / 2, 0, 0]}>
                            <ringGeometry args={[3.9, 4, 32]} />
                            <meshBasicMaterial color="#f59e0b" transparent opacity={0.2} side={THREE.DoubleSide} />
                        </mesh>
                        <mesh position={targetVector.toArray()}>
                            <ringGeometry args={[3.9, 4, 32]} />
                            <meshBasicMaterial color="#f59e0b" transparent opacity={0.2} side={THREE.DoubleSide} />
                        </mesh>
                        <mesh position={targetVector.toArray()} rotation={[0, Math.PI / 2, 0]}>
                            <ringGeometry args={[3.9, 4, 32]} />
                            <meshBasicMaterial color="#f59e0b" transparent opacity={0.2} side={THREE.DoubleSide} />
                        </mesh>

                        {points.map((p, i) => (
                            <VectorPoint
                                key={p.id}
                                position={p.position}
                                isTarget={false}
                                selected={p.selected}
                                hovered={p.hovered}
                                setHovered={(val: boolean) => {
                                    const newPoints = [...points];
                                    newPoints[i].hovered = val;
                                    setPoints(newPoints);
                                }}
                                onClick={(e: any) => {
                                    e.stopPropagation();
                                    handlePointClick(p.id);
                                }}
                            />
                        ))}
                    </group>

                    <OrbitControls
                        enablePan={true}
                        enableZoom={true}
                        autoRotate={gameState === 'PLAYING'}
                        autoRotateSpeed={0.5}
                    />

                    <EffectComposer>
                        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={1.5} />
                        <ChromaticAberration offset={new THREE.Vector2(0.002, 0.002)} />
                    </EffectComposer>
                </Canvas>
            </div>

        </div>
    );
};
