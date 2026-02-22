import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Sphere, TorusKnot } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch } from '@react-three/postprocessing';
import { Shield, ShieldAlert, Activity, CheckCircle, RotateCcw } from 'lucide-react';
import * as THREE from 'three';
import { Difficulty, Language, UserStats } from '../../types';
import { audio } from '../../services/audioService';

interface DeepfakeDeflectorProps {
    onComplete: (score: number) => void;
    difficulty?: Difficulty;
    t: (key: string) => string;
    language?: Language;
    user?: UserStats;
}

const DataEntity = ({ position, isDeepfake, onClick, active }: any) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.x += delta * 0.5;
            meshRef.current.rotation.y += delta * 0.5;
            const targetScale = hovered ? 1.2 : 1.0;
            meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
        }
    });

    return (
        <Float floatIntensity={2} speed={3}>
            <TorusKnot
                ref={meshRef}
                args={[1, 0.3, 100, 16]}
                position={position}
                onClick={onClick}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
            >
                <meshStandardMaterial
                    color={hovered ? '#ffffff' : (active && isDeepfake ? '#ef4444' : '#10b981')}
                    emissive={active && isDeepfake ? '#ef4444' : '#10b981'}
                    emissiveIntensity={hovered ? 2 : 0.5}
                    wireframe={isDeepfake && active} // Show wireframe if it's revealed as fake
                    roughness={0.1}
                    metalness={0.8}
                />
            </TorusKnot>
        </Float>
    );
};

export const DeepfakeDeflector: React.FC<DeepfakeDeflectorProps> = ({ onComplete, difficulty, t }) => {
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(difficulty === 'Elite' ? 30 : 60);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');
    const [round, setRound] = useState(1);
    const maxRounds = difficulty === 'Elite' ? 5 : 3;

    // Generate entities for the current round
    const [entities, setEntities] = useState<any[]>([]);
    const [isGlitching, setIsGlitching] = useState(false);

    const generateRound = () => {
        const count = difficulty === 'Elite' ? 4 : 2;
        const spacing = 4;
        const newEntities = [];
        const fakeIndex = Math.floor(Math.random() * count);

        for (let i = 0; i < count; i++) {
            newEntities.push({
                id: i,
                position: [(i - (count - 1) / 2) * spacing, 0, 0],
                isDeepfake: i === fakeIndex,
                revealed: false
            });
        }
        setEntities(newEntities);
    };

    useEffect(() => {
        generateRound();
    }, [round, difficulty]);

    // Glitch effect logic for the deepfake
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const glitchTimer = setInterval(() => {
            setIsGlitching(true);
            setTimeout(() => setIsGlitching(false), 200 + Math.random() * 300); // Glitch for 200-500ms
        }, 2000 + Math.random() * 3000); // Every 2-5 seconds

        return () => clearInterval(glitchTimer);
    }, [gameState]);

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

    const handleEntityClick = (id: number) => {
        if (gameState !== 'PLAYING') return;

        const clickedEntity = entities.find(e => e.id === id);

        if (clickedEntity?.isDeepfake) {
            audio?.playSuccess?.();
            setEntities(prev => prev.map(e => e.id === id ? { ...e, revealed: true } : e));
            setScore(s => s + 200);

            setTimeout(() => {
                if (round >= maxRounds) {
                    setGameState('SUCCESS');
                    setScore(prev => prev + (timeLeft * 10) + (difficulty === 'Elite' ? 1000 : 500));
                } else {
                    setRound(r => r + 1);
                }
            }, 1000);
        } else {
            // Clicked the real one
            audio?.playError?.();
            setGameState('FAILED');
        }
    };

    return (
        <div className="w-full h-full min-h-[600px] flex flex-col md:flex-row bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">

            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 pointer-events-none">
                <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 pointer-events-auto">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-emerald-400" />
                        Deepfake Deflector
                    </h2>
                    <div className="text-slate-400 text-sm mt-1">Round: {round} / {maxRounds}</div>
                </div>

                <div className="flex gap-4">
                    <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                        <Activity className="w-5 h-5 text-blue-400" />
                        <div>
                            <div className="text-xs text-slate-400 font-medium uppercase">Time Remaining</div>
                            <div className={`text-xl font-mono font-bold ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                                00:{timeLeft.toString().padStart(2, '0')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none text-center w-full max-w-lg">
                <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-emerald-900/50 inline-block shadow-lg">
                    <p className="text-emerald-200 font-mono text-sm uppercase tracking-wider">
                        {gameState === 'PLAYING' ?
                            "Watch closely for generative artifacts and micro-glitches. Click the Fake." :
                            gameState === 'SUCCESS' ? "Authentication complete. Truth preserved." : "Deception successful. Authentication failed."}
                    </p>
                </div>
            </div>

            {gameState !== 'PLAYING' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
                    <div className={`p-8 rounded-2xl border flex flex-col items-center max-w-sm w-full text-center ${gameState === 'SUCCESS' ? 'bg-slate-900/90 border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.3)]' : 'bg-slate-900/90 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)]'
                        }`}>
                        {gameState === 'SUCCESS' ? (
                            <>
                                <CheckCircle className="w-16 h-16 text-emerald-400 mb-4" />
                                <h2 className="text-2xl font-bold text-white mb-2">Deflection Successful</h2>
                                <p className="text-slate-300 mb-6">You identified all generative anomalies.</p>
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
                                <ShieldAlert className="w-16 h-16 text-red-400 mb-4" />
                                <h2 className="text-2xl font-bold text-white mb-2">Deflection Failed</h2>
                                <p className="text-slate-300 mb-6">You either ran out of time or selected authentic media.</p>
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
                                            setTimeLeft(difficulty === 'Elite' ? 30 : 60);
                                            setRound(1);
                                            setScore(0);
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

            <div className="flex-1 w-full bg-black relative">
                <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
                    <color attach="background" args={['#020617']} />
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1.5} color="#10b981" />
                    <pointLight position={[-10, -10, -10]} intensity={1.5} color="#06b6d4" />

                    <group>
                        {entities.map((entity) => (
                            <DataEntity
                                key={entity.id}
                                position={entity.position}
                                isDeepfake={entity.isDeepfake}
                                onClick={() => handleEntityClick(entity.id)}
                                active={entity.revealed}
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
                        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={1.5} />
                        <ChromaticAberration offset={new THREE.Vector2(0.002, 0.002)} />
                        {isGlitching && <Glitch delay={new THREE.Vector2(0, 0)} duration={new THREE.Vector2(0.1, 0.2)} strength={new THREE.Vector2(0.1, 0.5)} />}
                    </EffectComposer>
                </Canvas>
            </div>
        </div>
    );
};
