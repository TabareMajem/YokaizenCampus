import React, { useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float, Dodecahedron, Cylinder, Sphere } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch } from '@react-three/postprocessing';
import { Cpu, Zap, Activity, CheckCircle, RotateCcw, Link2 } from 'lucide-react';
import * as THREE from 'three';
import { Difficulty, Language, UserStats } from '../../types';
import { audio } from '../../services/audioService';

interface NeuralPrismProps {
    onComplete: (score: number) => void;
    difficulty?: Difficulty;
    t: (key: string) => string;
    language?: Language;
    user?: UserStats;
}

const PrismCrystal = ({ position, rotation, color, isAligned, onClick }: any) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.x += delta * (isAligned ? 0.5 : 0.1);
            meshRef.current.rotation.y += delta * (isAligned ? 0.5 : 0.1);
            const targetScale = hovered ? 1.2 : 1.0;
            meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
        }
    });

    return (
        <Float floatIntensity={isAligned ? 0 : 2} rotationIntensity={isAligned ? 0 : 1} speed={2}>
            <Dodecahedron
                ref={meshRef}
                args={[1, 0]}
                position={position}
                rotation={rotation}
                onClick={onClick}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
            >
                <meshPhysicalMaterial
                    color={color}
                    transmission={0.9}
                    opacity={1}
                    metalness={0.1}
                    roughness={0.1}
                    ior={1.5}
                    thickness={0.5}
                    emissive={isAligned ? color : '#000000'}
                    emissiveIntensity={isAligned ? 2 : 0}
                />
            </Dodecahedron>
        </Float>
    );
};

const LightBeam = ({ start, end, active, color }: any) => {
    const ref = useRef<THREE.Mesh>(null);
    const distance = new THREE.Vector3(...start).distanceTo(new THREE.Vector3(...end));
    const position = new THREE.Vector3().addVectors(new THREE.Vector3(...start), new THREE.Vector3(...end)).multiplyScalar(0.5);

    useFrame(({ clock }) => {
        if (ref.current && active) {
            ref.current.lookAt(new THREE.Vector3(...end));
            ref.current.rotateX(Math.PI / 2);
        }
    });

    if (!active) return null;

    return (
        <mesh ref={ref} position={position}>
            <cylinderGeometry args={[0.05, 0.05, distance, 8]} />
            <meshBasicMaterial color={color} transparent opacity={0.6} blending={THREE.AdditiveBlending} />
        </mesh>
    );
};

export const NeuralPrism: React.FC<NeuralPrismProps> = ({ onComplete, difficulty, t }) => {
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(difficulty === 'Elite' ? 60 : 120);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');

    const colors = ['#06b6d4', '#8b5cf6', '#ec4899', '#10b981'];
    const numPrisms = difficulty === 'Elite' ? 8 : 5;

    const initialPrisms = useMemo(() => {
        return Array.from({ length: numPrisms }).map((_, i) => ({
            id: i,
            position: [
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 6,
                (Math.random() - 0.5) * 4
            ] as [number, number, number],
            targetColor: colors[i % colors.length],
            currentColor: colors[Math.floor(Math.random() * colors.length)],
            rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] as [number, number, number]
        }));
    }, [numPrisms]);

    const ObjectCenter = [0, 0, 0] as [number, number, number];

    const [prisms, setPrisms] = useState(initialPrisms);

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

    const handlePrismClick = (id: number) => {
        if (gameState !== 'PLAYING') return;
        audio?.playClick?.();

        setPrisms(prev => prev.map(p => {
            if (p.id === id) {
                const currentColorIndex = colors.indexOf(p.currentColor);
                const nextColor = colors[(currentColorIndex + 1) % colors.length];
                return { ...p, currentColor: nextColor };
            }
            return p;
        }));

        setTimeout(() => {
            setPrisms(current => {
                const allAligned = current.every(p => p.currentColor === p.targetColor);
                if (allAligned && gameState === 'PLAYING') {
                    setGameState('SUCCESS');
                    audio?.playSuccess?.();
                    setScore((timeLeft * 15) + (difficulty === 'Elite' ? 1200 : 600));
                }
                return current;
            });
        }, 100);
    };

    return (
        <div className="w-full h-full min-h-[600px] flex flex-col md:flex-row bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 pointer-events-none">
                <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 pointer-events-auto">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-cyan-400" />
                        Neural Prism
                    </h2>
                    <div className="text-slate-400 text-sm mt-1">Difficulty: {difficulty}</div>
                </div>

                <div className="flex gap-4">
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

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none text-center w-full max-w-lg">
                <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-cyan-900/50 inline-block shadow-lg">
                    <p className="text-cyan-200 font-mono text-sm tracking-wider">
                        {gameState === 'PLAYING' ?
                            "Cycle the refracting tokens to match their embedded semantic targets." :
                            gameState === 'SUCCESS' ? "Semantic Alignment Perfected." : "Token Collapse. Decryption Failed."}
                    </p>
                </div>
            </div>

            {gameState !== 'PLAYING' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className={`p-8 rounded-2xl border flex flex-col items-center max-w-sm w-full text-center ${gameState === 'SUCCESS' ? 'bg-slate-900/90 border-cyan-500 shadow-[0_0_50px_rgba(6,182,212,0.3)]' : 'bg-slate-900/90 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)]'
                        }`}>
                        {gameState === 'SUCCESS' ? (
                            <>
                                <CheckCircle className="w-16 h-16 text-cyan-400 mb-4" />
                                <h2 className="text-2xl font-bold text-white mb-2">Decryption Complete</h2>
                                <p className="text-slate-300 mb-6">Neural vectors aligned. Broadcast intercepted.</p>
                                <div className="text-4xl font-mono text-cyan-300 mb-8">{score} PTS</div>
                                <button
                                    onClick={() => onComplete(score)}
                                    className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-cyan-500/25"
                                >
                                    Extract Data
                                </button>
                            </>
                        ) : (
                            <>
                                <RotateCcw className="w-16 h-16 text-red-400 mb-4" />
                                <h2 className="text-2xl font-bold text-white mb-2">Signal Lost</h2>
                                <p className="text-slate-300 mb-6">The broadcast decayed before you could align the prisms.</p>
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
                                            setPrisms(initialPrisms);
                                        }}
                                        className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-red-500/25"
                                    >
                                        Retransmit
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 w-full bg-black relative">
                <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
                    <color attach="background" args={['#050505']} />
                    <ambientLight intensity={0.2} />
                    <spotLight position={[10, 10, 10]} intensity={2} color="#ffffff" angle={0.5} penumbra={1} />

                    <group>
                        <Sphere args={[0.5, 32, 32]} position={ObjectCenter}>
                            <meshBasicMaterial color="#ffffff" wireframe />
                        </Sphere>

                        {prisms.map((p) => {
                            const isAligned = p.currentColor === p.targetColor;
                            return (
                                <React.Fragment key={p.id}>
                                    <PrismCrystal
                                        position={p.position}
                                        rotation={p.rotation}
                                        color={p.currentColor}
                                        isAligned={isAligned}
                                        onClick={() => handlePrismClick(p.id)}
                                    />
                                    <LightBeam
                                        start={ObjectCenter}
                                        end={p.position}
                                        active={isAligned}
                                        color={p.targetColor}
                                    />
                                    {/* Show target color ring around prism */}
                                    <mesh position={p.position}>
                                        <ringGeometry args={[1.5, 1.6, 32]} />
                                        <meshBasicMaterial color={p.targetColor} side={THREE.DoubleSide} transparent opacity={0.3} />
                                    </mesh>
                                </React.Fragment>
                            );
                        })}
                    </group>

                    <OrbitControls
                        enablePan={true}
                        enableZoom={true}
                        autoRotate={gameState === 'PLAYING'}
                        autoRotateSpeed={1}
                    />

                    <EffectComposer>
                        <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} height={300} intensity={2} />
                        <ChromaticAberration offset={new THREE.Vector2(0.004, 0.004)} />
                        {timeLeft <= 10 && gameState === 'PLAYING' && <Glitch delay={new THREE.Vector2(0.5, 1.5)} duration={new THREE.Vector2(0.1, 0.3)} strength={new THREE.Vector2(0.3, 1.0)} />}
                    </EffectComposer>
                </Canvas>
            </div>

        </div>
    );
};
