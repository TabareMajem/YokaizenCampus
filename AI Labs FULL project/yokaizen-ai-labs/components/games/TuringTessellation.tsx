import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Float } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { Shapes, Hexagon, Activity, CheckCircle, RotateCcw } from 'lucide-react';
import * as THREE from 'three';
import { Difficulty, Language, UserStats } from '../../types';
import { audio } from '../../services/audioService';

interface TuringTessellationProps {
    onComplete: (score: number) => void;
    difficulty?: Difficulty;
    t: (key: string) => string;
    language?: Language;
    user?: UserStats;
}

const LogicBlock = ({ position, rotation, color, onClick }: any) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    // Target rotation interpolation
    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, rotation[0], 0.1);
            meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, rotation[1], 0.1);
            meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, rotation[2], 0.1);

            const targetScale = hovered ? 1.1 : 1.0;
            meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
        }
    });

    return (
        <Float floatIntensity={1} speed={2}>
            <Box
                ref={meshRef}
                args={[2, 2, 2]}
                position={position}
                onClick={onClick}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
            >
                {/* 6 materials for 6 faces */}
                <meshStandardMaterial attach="material-0" color={color[0]} emissive={color[0]} emissiveIntensity={0.5} roughness={0.1} metalness={0.8} />
                <meshStandardMaterial attach="material-1" color={color[1]} emissive={color[1]} emissiveIntensity={0.5} roughness={0.1} metalness={0.8} />
                <meshStandardMaterial attach="material-2" color={color[2]} emissive={color[2]} emissiveIntensity={0.5} roughness={0.1} metalness={0.8} />
                <meshStandardMaterial attach="material-3" color={color[3]} emissive={color[3]} emissiveIntensity={0.5} roughness={0.1} metalness={0.8} />
                <meshStandardMaterial attach="material-4" color={color[4]} emissive={color[4]} emissiveIntensity={0.5} roughness={0.1} metalness={0.8} />
                <meshStandardMaterial attach="material-5" color={color[5]} emissive={color[5]} emissiveIntensity={0.5} roughness={0.1} metalness={0.8} />
            </Box>
        </Float>
    );
};

export const TuringTessellation: React.FC<TuringTessellationProps> = ({ onComplete, difficulty, t }) => {
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(difficulty === 'Elite' ? 45 : 90);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');

    // 3 faces logic. Target is to have the +Z face (index 4) be a specific color for all blocks.
    const colors = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
    const targetColor = '#10b981'; // Everyone needs to show green to the front
    const size = difficulty === 'Elite' ? 3 : 2;

    const initialBlocks = useMemo(() => {
        const blocks = [];
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                // Ensure at least one face has the target color
                const faces = [...colors].sort(() => Math.random() - 0.5);
                if (!faces.includes(targetColor)) faces[0] = targetColor;

                // Random starting rotation (multiples of 90 degrees = PI/2)
                const rotX = Math.floor(Math.random() * 4) * (Math.PI / 2);
                const rotY = Math.floor(Math.random() * 4) * (Math.PI / 2);

                blocks.push({
                    id: `${i}-${j}`,
                    position: [(j - (size - 1) / 2) * 2.5, (i - (size - 1) / 2) * 2.5, 0] as [number, number, number],
                    faces: faces,
                    rotation: [rotX, rotY, 0] as [number, number, number],
                    upFace: 0 // Simplification: actual 3D face tracking is complex, we will just track abstract state
                });
            }
        }
        return blocks;
    }, [difficulty, size]);

    const [blocks, setBlocks] = useState(initialBlocks);

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

    const handleBlockClick = (id: string) => {
        if (gameState !== 'PLAYING') return;
        audio?.playClick?.();

        setBlocks(current => {
            const newBlocks = current.map(b => {
                if (b.id === id) {
                    // Rotate on Y axis by 90 degrees
                    return { ...b, rotation: [b.rotation[0], b.rotation[1] + (Math.PI / 2), b.rotation[2]], upFace: (b.upFace + 1) % 4 };
                }
                return b;
            });

            // Check Win Condition
            // Since tracking actual 3D faces requires complex Euler/Quaternion math, for this mini-game, 
            // the win condition is achieved if all blocks have the same abstract "upFace" state = 0.
            // (Simulating that they are all aligned perfectly)
            const allAligned = newBlocks.every(b => b.upFace === 0);

            if (allAligned) {
                setTimeout(() => {
                    setGameState('SUCCESS');
                    audio?.playSuccess?.();
                    setScore((timeLeft * 20) + (difficulty === 'Elite' ? 1000 : 500));
                }, 500);
            }

            return newBlocks;
        });
    };

    return (
        <div className="w-full h-full min-h-[600px] flex flex-col md:flex-row bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 pointer-events-none">
                <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 pointer-events-auto">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Hexagon className="w-5 h-5 text-fuchsia-400" />
                        Turing Tessellation
                    </h2>
                    <div className="text-slate-400 text-sm mt-1">Alignment Challenge</div>
                </div>

                <div className="flex gap-4">
                    <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                        <Activity className="w-5 h-5 text-blue-400" />
                        <div>
                            <div className="text-xs text-slate-400 font-medium uppercase">Time Remaining</div>
                            <div className={`text-xl font-mono font-bold ${timeLeft <= 15 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                                00:{timeLeft.toString().padStart(2, '0')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none text-center w-full max-w-lg">
                <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-fuchsia-900/50 inline-block shadow-lg">
                    <p className="text-fuchsia-200 font-mono text-sm tracking-wider">
                        {gameState === 'PLAYING' ?
                            "Align all logic blocks to their baseline symmetry state. Click to rotate." :
                            gameState === 'SUCCESS' ? "Moral Framework Aligned without contractions." : "Logical Contradiction. Alignment Failed."}
                    </p>
                </div>
            </div>

            {gameState !== 'PLAYING' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
                    <div className={`p-8 rounded-2xl border flex flex-col items-center max-w-sm w-full text-center ${gameState === 'SUCCESS' ? 'bg-slate-900/90 border-fuchsia-500 shadow-[0_0_50px_rgba(217,70,239,0.3)]' : 'bg-slate-900/90 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)]'
                        }`}>
                        {gameState === 'SUCCESS' ? (
                            <>
                                <CheckCircle className="w-16 h-16 text-fuchsia-400 mb-4" />
                                <h2 className="text-2xl font-bold text-white mb-2">Alignment Complete</h2>
                                <p className="text-slate-300 mb-6">You successfully reconciled the paradox.</p>
                                <div className="text-4xl font-mono text-fuchsia-300 mb-8">{score} PTS</div>
                                <button
                                    onClick={() => onComplete(score)}
                                    className="w-full py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-fuchsia-500/25"
                                >
                                    Confirm Alignment
                                </button>
                            </>
                        ) : (
                            <>
                                <RotateCcw className="w-16 h-16 text-red-400 mb-4" />
                                <h2 className="text-2xl font-bold text-white mb-2">Paradox Error</h2>
                                <p className="text-slate-300 mb-6">The framework resulted in a logical contradiction.</p>
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
                                            setBlocks(initialBlocks);
                                        }}
                                        className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-red-500/25"
                                    >
                                        Recalculate
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 w-full bg-black relative">
                <Canvas camera={{ position: [0, -10, 15], fov: 60 }}>
                    <color attach="background" args={['#050505']} />
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />

                    <group>
                        {blocks.map(b => (
                            <LogicBlock
                                key={b.id}
                                position={b.position}
                                rotation={b.rotation}
                                color={b.faces}
                                onClick={() => handleBlockClick(b.id)}
                            />
                        ))}
                    </group>

                    <OrbitControls
                        enablePan={false}
                        enableZoom={false}
                        autoRotate={gameState === 'PLAYING'}
                        autoRotateSpeed={0.2}
                    />

                    <EffectComposer>
                        <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} height={300} intensity={2} />
                        <ChromaticAberration offset={new THREE.Vector2(0.003, 0.003)} />
                    </EffectComposer>
                </Canvas>
            </div>

        </div>
    );
};
