import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Float } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { Scissors, FileText, Activity, CheckCircle, RotateCcw } from 'lucide-react';
import * as THREE from 'three';
import { Difficulty, Language, UserStats } from '../../types';
import { audio } from '../../services/audioService';

interface PromptSculptorProps {
    onComplete: (score: number) => void;
    difficulty?: Difficulty;
    t: (key: string) => string;
    language?: Language;
    user?: UserStats;
}

const MarbleChunk = ({ position, active, isEssential, onClick }: any) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state, delta) => {
        if (meshRef.current && active) {
            meshRef.current.rotation.x += delta * 0.1;
            meshRef.current.rotation.y += delta * 0.1;
            const targetScale = hovered ? 1.1 : 1.0;
            meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
        }
    });

    if (!active) return null;

    return (
        <Box
            ref={meshRef}
            args={[1.9, 1.9, 1.9]}
            position={position}
            onClick={onClick}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
        >
            <meshPhysicalMaterial
                color={isEssential ? '#ffffff' : '#94a3b8'}
                emissive={isEssential ? '#3b82f6' : '#000000'}
                emissiveIntensity={isEssential ? 0.5 : 0}
                roughness={hovered ? 0.1 : 0.8}
                metalness={0.2}
                clearcoat={hovered ? 1 : 0}
            />
        </Box>
    );
};

export const PromptSculptor: React.FC<PromptSculptorProps> = ({ onComplete, difficulty, t }) => {
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(difficulty === 'Elite' ? 45 : 90);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');

    // The grid of "prompt tokens" visualized as a block of marble
    const size = difficulty === 'Elite' ? 4 : 3;
    const maxTokens = size * size * size;
    const contextLimit = difficulty === 'Elite' ? 15 : 10;

    // Some blocks are "essential" context. If you delete them, you lose meaning.
    // If you keep them but exceed the context limit, you OOM.

    const initialChunks = useMemo(() => {
        const chunks = [];
        let essentialCount = 0;

        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                for (let z = 0; z < size; z++) {
                    const isEssential = Math.random() > 0.7 && essentialCount < contextLimit - 2;
                    if (isEssential) essentialCount++;

                    chunks.push({
                        id: `${x}-${y}-${z}`,
                        position: [(x - size / 2) * 2, (y - size / 2) * 2, (z - size / 2) * 2] as [number, number, number],
                        active: true,
                        isEssential
                    });
                }
            }
        }
        return chunks;
    }, [difficulty, size, contextLimit]);

    const [chunks, setChunks] = useState(initialChunks);

    const activeTokens = chunks.filter(c => c.active).length;
    const lostEssentialTokens = chunks.filter(c => !c.active && c.isEssential).length;

    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        // Check fail conditions immediately
        if (lostEssentialTokens > 0) {
            setGameState('FAILED');
            audio?.playError?.();
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // Check win at timeout if limit respected
                    if (activeTokens <= contextLimit && lostEssentialTokens === 0) {
                        setGameState('SUCCESS');
                        audio?.playSuccess?.();
                        setScore(1000 + (contextLimit - activeTokens) * 100);
                    } else {
                        setGameState('FAILED');
                        audio?.playError?.();
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, activeTokens, lostEssentialTokens, contextLimit]);

    const handleSculpt = (id: string, e: any) => {
        e.stopPropagation();
        if (gameState !== 'PLAYING') return;

        audio?.playClick?.();

        setChunks(current => current.map(c => {
            if (c.id === id) {
                // "Chisel" it away
                return { ...c, active: false };
            }
            return c;
        }));

        // Win check (if user manages to manually trigger it by reaching the precise limit)
        // Usually, they have to wait out the timer, OR we can add a "Submit" button. Let's add auto-win 
        // if they hit the limit perfectly.
    };

    const submitPrompt = () => {
        if (activeTokens <= contextLimit && lostEssentialTokens === 0) {
            setGameState('SUCCESS');
            audio?.playSuccess?.();
            setScore((timeLeft * 10) + (difficulty === 'Elite' ? 1000 : 500) + ((contextLimit - activeTokens) * 50));
        } else {
            setGameState('FAILED');
            audio?.playError?.();
        }
    };

    return (
        <div className="w-full h-full min-h-[600px] flex flex-col md:flex-row bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 pointer-events-none">
                <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 pointer-events-auto">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Scissors className="w-5 h-5 text-gray-400" />
                        Prompt Sculptor
                    </h2>
                    <div className="text-slate-400 text-sm mt-1">Difficulty: {difficulty}</div>
                </div>

                <div className="flex gap-4 pointer-events-auto">
                    <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-400" />
                        <div>
                            <div className="text-xs text-slate-400 font-medium uppercase">Tokens</div>
                            <div className={`text-xl font-mono font-bold ${activeTokens > contextLimit ? 'text-red-400' : 'text-emerald-400'}`}>
                                {activeTokens} / {contextLimit} MAX
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                        <Activity className="w-5 h-5 text-yellow-400" />
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
                <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-gray-600/50 flex flex-col items-center shadow-lg pointer-events-auto">
                    <p className="text-gray-200 font-mono text-sm tracking-wider mb-3">
                        {gameState === 'PLAYING' ?
                            "Chisel away padding blocks. Do NOT delete glowing essential context vectors." :
                            gameState === 'SUCCESS' ? "Prompt sculpted perfectly. Context window optimized." : "Context Error: Essential data lost or limit exceeded."}
                    </p>
                    {gameState === 'PLAYING' && (
                        <button onClick={submitPrompt} className="px-6 py-2 bg-blue-600 rounded hover:bg-blue-500 font-bold transition-all w-full">
                            Submit Prompt
                        </button>
                    )}
                </div>
            </div>

            {gameState !== 'PLAYING' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
                    <div className={`p-8 rounded-2xl border flex flex-col items-center max-w-sm w-full text-center ${gameState === 'SUCCESS' ? 'bg-slate-900/90 border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.3)]' : 'bg-slate-900/90 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)]'
                        }`}>
                        {gameState === 'SUCCESS' ? (
                            <>
                                <CheckCircle className="w-16 h-16 text-emerald-400 mb-4" />
                                <h2 className="text-2xl font-bold text-white mb-2">Prompt Optimized</h2>
                                <p className="text-slate-300 mb-6">Tokens constrained without losing semantic meaning.</p>
                                <div className="text-4xl font-mono text-emerald-300 mb-8">{score} PTS</div>
                                <button
                                    onClick={() => onComplete(score)}
                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-emerald-500/25"
                                >
                                    Proceed
                                </button>
                            </>
                        ) : (
                            <>
                                <RotateCcw className="w-16 h-16 text-red-400 mb-4" />
                                <h2 className="text-2xl font-bold text-white mb-2">Generation Failed</h2>
                                <p className="text-slate-300 mb-6">
                                    {lostEssentialTokens > 0 ? "You deleted crucial context blocks." : "Prompt exceeded Context Window Limit."}
                                </p>
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
                                            setChunks(initialChunks);
                                        }}
                                        className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-red-500/25"
                                    >
                                        Resculpt
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 w-full bg-black relative">
                <Canvas camera={{ position: [10, 10, 15], fov: 60 }}>
                    <color attach="background" args={['#0f172a']} />
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />

                    <Float floatIntensity={0.5} speed={1} rotationIntensity={0.5}>
                        <group>
                            {chunks.map(c => (
                                <MarbleChunk
                                    key={c.id}
                                    position={c.position}
                                    active={c.active}
                                    isEssential={c.isEssential}
                                    onClick={(e: any) => handleSculpt(c.id, e)}
                                />
                            ))}
                        </group>
                    </Float>

                    <OrbitControls
                        enablePan={false}
                        enableZoom={true}
                        autoRotate={gameState === 'PLAYING'}
                        autoRotateSpeed={0.5}
                    />

                    <EffectComposer>
                        <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} height={300} intensity={1.5} />
                        <ChromaticAberration offset={new THREE.Vector2(0.001, 0.001)} />
                    </EffectComposer>
                </Canvas>
            </div>

        </div>
    );
};
