import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Torus, Float } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { Key, Unlock, Activity, ShieldAlert, CheckCircle, RotateCcw } from 'lucide-react';
import * as THREE from 'three';
import { Difficulty, Language, UserStats } from '../../types';
import { audio } from '../../services/audioService';

interface DataHeistProps {
    onComplete: (score: number) => void;
    difficulty?: Difficulty;
    t: (key: string) => string;
    language?: Language;
    user?: UserStats;
}

const SecurityNode = ({ position, id, isActive, isError, onClick }: any) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.x += delta * (isActive ? 2 : 0.5);
            meshRef.current.rotation.y += delta * (isActive ? 2 : 0.5);
            const targetScale = hovered ? 1.2 : 1.0;
            meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
        }
    });

    const color = isError ? '#ef4444' : isActive ? '#3b82f6' : '#1e293b';

    return (
        <Float floatIntensity={2} speed={3}>
            <Torus
                ref={meshRef}
                args={[1, 0.2, 16, 32]}
                position={position}
                onClick={() => onClick(id)}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
            >
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={isActive ? 2 : isError ? 3 : 0}
                    roughness={0.2}
                    metalness={0.8}
                />
            </Torus>
        </Float>
    );
};

export const DataHeist: React.FC<DataHeistProps> = ({ onComplete, difficulty, t }) => {
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(difficulty === 'Elite' ? 45 : 90);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED' | 'MEMORIZE'>('MEMORIZE');

    const numNodes = difficulty === 'Elite' ? 6 : 4;
    const sequenceLength = difficulty === 'Elite' ? 6 : 4;

    const initialNodes = useMemo(() => {
        return Array.from({ length: numNodes }).map((_, i) => ({
            id: i,
            position: [
                Math.sin((i / numNodes) * Math.PI * 2) * 5,
                Math.cos((i / numNodes) * Math.PI * 2) * 5,
                0
            ] as [number, number, number],
            isActive: false,
            isError: false
        }));
    }, [difficulty, numNodes]);

    const [nodes, setNodes] = useState(initialNodes);
    const [sequence, setSequence] = useState<number[]>([]);
    const [playerSequence, setPlayerSequence] = useState<number[]>([]);

    useEffect(() => {
        // Generate Sequence
        const newSeq = [];
        for (let i = 0; i < sequenceLength; i++) {
            newSeq.push(Math.floor(Math.random() * numNodes));
        }
        setSequence(newSeq);
    }, [difficulty, numNodes, sequenceLength]);

    // Playback Sequence
    useEffect(() => {
        if (gameState !== 'MEMORIZE' || sequence.length === 0) return;

        let step = 0;
        const interval = setInterval(() => {
            if (step >= sequence.length) {
                clearInterval(interval);
                setNodes(current => current.map(n => ({ ...n, isActive: false })));
                setGameState('PLAYING');
                return;
            }

            const activeId = sequence[step];
            audio?.playClick?.();
            setNodes(current => current.map(n => ({ ...n, isActive: n.id === activeId })));

            setTimeout(() => {
                setNodes(current => current.map(n => ({ ...n, isActive: false })));
            }, 400);

            step++;
        }, 800);

        return () => clearInterval(interval);
    }, [gameState, sequence]);

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

        const expectedId = sequence[playerSequence.length];

        if (id === expectedId) {
            audio?.playClick?.();
            const newPlayerSeq = [...playerSequence, id];
            setPlayerSequence(newPlayerSeq);

            setNodes(current => current.map(n => ({ ...n, isActive: n.id === id })));
            setTimeout(() => setNodes(current => current.map(n => ({ ...n, isActive: false }))), 300);

            setScore(s => s + 100);

            if (newPlayerSeq.length === sequence.length) {
                setTimeout(() => {
                    setGameState('SUCCESS');
                    audio?.playSuccess?.();
                    setScore(s => s + (timeLeft * 20) + (difficulty === 'Elite' ? 1000 : 500));
                }, 500);
            }
        } else {
            // Wrong node!
            audio?.playError?.();
            setNodes(current => current.map(n => ({ ...n, isError: n.id === id })));
            setGameState('FAILED');
        }
    };

    return (
        <div className="w-full h-full min-h-[600px] flex flex-col md:flex-row bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 pointer-events-none">
                <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 pointer-events-auto">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Key className="w-5 h-5 text-blue-400" />
                        Data Heist (ZKP)
                    </h2>
                    <div className="text-slate-400 text-sm mt-1">Difficulty: {difficulty}</div>
                </div>

                <div className="flex gap-4">
                    <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                        <Activity className="w-5 h-5 text-purple-400" />
                        <div>
                            <div className="text-xs text-slate-400 font-medium uppercase">Protocol Match</div>
                            <div className="text-xl font-mono font-bold text-white">
                                {playerSequence.length} / {sequence.length}
                            </div>
                        </div>
                    </div>

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
                <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-blue-900/50 inline-block shadow-lg">
                    <p className="text-blue-200 font-mono text-sm tracking-wider">
                        {gameState === 'MEMORIZE' ? "MEMORIZE THE PROTOCOL SEQUENCE..." :
                            gameState === 'PLAYING' ? "Reproduce the exact sequence to prove access rights (Zero-Knowledge)." :
                                gameState === 'SUCCESS' ? "Access Granted. Data Extraction Complete." : "Access Denied. Security Triggered."}
                    </p>
                </div>
            </div>

            {(gameState === 'SUCCESS' || gameState === 'FAILED') && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
                    <div className={`p-8 rounded-2xl border flex flex-col items-center max-w-sm w-full text-center ${gameState === 'SUCCESS' ? 'bg-slate-900/90 border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.3)]' : 'bg-slate-900/90 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)]'
                        }`}>
                        {gameState === 'SUCCESS' ? (
                            <>
                                <Unlock className="w-16 h-16 text-blue-400 mb-4" />
                                <h2 className="text-2xl font-bold text-white mb-2">Vault Breached</h2>
                                <p className="text-slate-300 mb-6">You proved your identity without revealing the key.</p>
                                <div className="text-4xl font-mono text-blue-300 mb-8">{score} PTS</div>
                                <button
                                    onClick={() => onComplete(score)}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-blue-500/25"
                                >
                                    Extract Files
                                </button>
                            </>
                        ) : (
                            <>
                                <ShieldAlert className="w-16 h-16 text-red-400 mb-4" />
                                <h2 className="text-2xl font-bold text-white mb-2">Security Tripped</h2>
                                <p className="text-slate-300 mb-6">Incorrect sequence or timeout. The system locked down.</p>
                                <div className="flex gap-4 w-full">
                                    <button
                                        onClick={() => onComplete(0)}
                                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-all"
                                    >
                                        Abort
                                    </button>
                                    <button
                                        onClick={() => {
                                            setGameState('MEMORIZE');
                                            setTimeLeft(difficulty === 'Elite' ? 45 : 90);
                                            setPlayerSequence([]);
                                            setNodes(initialNodes);
                                            setScore(0);
                                        }}
                                        className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-red-500/25"
                                    >
                                        Retry Hack
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
                    <ambientLight intensity={0.5} />
                    <pointLight position={[0, 0, 0]} intensity={2} color="#3b82f6" />

                    <group>
                        {/* Central Hub */}
                        <Box args={[1.5, 1.5, 1.5]} position={[0, 0, 0]}>
                            <meshStandardMaterial color="#0f172a" wireframe />
                        </Box>

                        {nodes.map(n => (
                            <SecurityNode
                                key={n.id}
                                id={n.id}
                                position={n.position}
                                isActive={n.isActive}
                                isError={n.isError}
                                onClick={handleNodeClick}
                            />
                        ))}
                    </group>

                    <OrbitControls
                        enablePan={false}
                        enableZoom={false}
                        autoRotate={true}
                        autoRotateSpeed={0.5}
                    />

                    <EffectComposer>
                        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={2} />
                        <ChromaticAberration offset={new THREE.Vector2(0.003, 0.003)} />
                    </EffectComposer>
                </Canvas>
            </div>

        </div>
    );
};
