import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Text } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch } from '@react-three/postprocessing';
import { Server, Activity, AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react';
import * as THREE from 'three';
import { Difficulty, Language, UserStats } from '../../types';
import { audio } from '../../services/audioService';

interface ChaosEngineeringProps {
    onComplete: (score: number) => void;
    difficulty?: Difficulty;
    t: (key: string) => string;
    language?: Language;
    user?: UserStats;
}

const ServerNode = ({ position, status, onClick }: any) => {
    const meshRef = useRef<THREE.Mesh>(null);

    // Status: 0 = healthy (blue), 1 = warning (yellow), 2 = critical (red), 3 = dead (black)
    const color = status === 0 ? '#3b82f6' : status === 1 ? '#eab308' : status === 2 ? '#ef4444' : '#1e293b';
    const emissiveIntensity = status === 0 ? 0.5 : status === 1 ? 1 : status === 2 ? 2 : 0;

    useFrame((state, delta) => {
        if (meshRef.current) {
            if (status === 2) {
                // Shake if critical
                meshRef.current.position.x = position[0] + (Math.random() - 0.5) * 0.1;
                meshRef.current.position.y = position[1] + (Math.random() - 0.5) * 0.1;
                meshRef.current.position.z = position[2] + (Math.random() - 0.5) * 0.1;
            } else {
                meshRef.current.position.set(...position);
            }
        }
    });

    return (
        <Box
            ref={meshRef}
            args={[1.8, 0.4, 2]}
            position={position}
            onClick={onClick}
        >
            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={emissiveIntensity}
                roughness={0.2}
                metalness={0.8}
            />
        </Box>
    );
};

export const ChaosEngineering: React.FC<ChaosEngineeringProps> = ({ onComplete, difficulty, t }) => {
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(difficulty === 'Elite' ? 60 : 120);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');

    const rows = 5;
    const cols = difficulty === 'Elite' ? 4 : 2;

    // Create initial rack
    const initialServers = useMemo(() => {
        const s = [];
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                s.push({
                    id: `${i}-${j}`,
                    position: [(j - (cols - 1) / 2) * 2.2, (i - (rows - 1) / 2) * 0.6, 0] as [number, number, number],
                    status: 0, // 0-Healthy, 1-Warning, 2-Critical, 3-Dead
                    timer: 0
                });
            }
        }
        return s;
    }, [difficulty]);

    const [servers, setServers] = useState(initialServers);
    const [systemHealth, setSystemHealth] = useState(100);

    // Game Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        const interval = setInterval(() => {
            setServers(current => {
                let anyDead = false;
                const newServers = current.map(s => {
                    if (s.status === 3) {
                        anyDead = true;
                        return s;
                    }

                    // Randomly decide to escalate status
                    const escalateChance = difficulty === 'Elite' ? 0.05 : 0.02;
                    if (Math.random() < escalateChance && s.status < 2) {
                        return { ...s, status: s.status + 1, timer: 0 };
                    }

                    // If critical, increment timer. If timer > threshold, it dies.
                    if (s.status === 2) {
                        const newTimer = s.timer + 1;
                        if (newTimer > (difficulty === 'Elite' ? 30 : 50)) {
                            // Dead!
                            anyDead = true;
                            return { ...s, status: 3 };
                        }
                        return { ...s, timer: newTimer };
                    }

                    return s;
                });

                // Calculate system health based on number of critical/warning nodes
                let damage = 0;
                newServers.forEach(s => {
                    if (s.status === 1) damage += 1;
                    if (s.status === 2) damage += 5;
                    if (s.status === 3) damage += 20;
                });

                const newHealth = Math.max(0, 100 - damage);
                setSystemHealth(newHealth);

                if (newHealth <= 0 || anyDead) {
                    setGameState('FAILED');
                    audio?.playError?.();
                }

                return newServers;
            });

            setTimeLeft(t => {
                if (t <= 1) {
                    setGameState('SUCCESS');
                    audio?.playSuccess?.();
                    setScore(systemHealth * 10 + (difficulty === 'Elite' ? 1000 : 500));
                    return 0;
                }
                return t - 0.1; // 100ms interval
            });

        }, 100);

        return () => clearInterval(interval);
    }, [gameState, difficulty, systemHealth]);

    const handleServerClick = (id: string, e: any) => {
        e.stopPropagation();
        if (gameState !== 'PLAYING') return;

        setServers(current => {
            const server = current.find(s => s.id === id);
            if (!server || server.status === 0 || server.status === 3) return current;

            // Fix the server
            audio?.playClick?.();
            setScore(prev => prev + (server.status * 10));
            return current.map(s => s.id === id ? { ...s, status: 0, timer: 0 } : s);
        });
    };

    return (
        <div className="w-full h-full min-h-[600px] flex flex-col md:flex-row bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 pointer-events-none">
                <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 pointer-events-auto">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Server className="w-5 h-5 text-red-400" />
                        Chaos Engineering
                    </h2>
                    <div className="text-slate-400 text-sm mt-1">Difficulty: {difficulty}</div>
                </div>

                <div className="flex gap-4">
                    <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                        <Activity className={`w-5 h-5 ${systemHealth > 50 ? 'text-emerald-400' : 'text-red-400'}`} />
                        <div>
                            <div className="text-xs text-slate-400 font-medium uppercase">System Health</div>
                            <div className={`text-xl font-mono font-bold ${systemHealth < 30 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                                {Math.round(systemHealth)}%
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 flex items-center gap-3 pointer-events-auto">
                        <div>
                            <div className="text-xs text-slate-400 font-medium uppercase">Survive For</div>
                            <div className={`text-xl font-mono font-bold ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                                00:{Math.ceil(timeLeft).toString().padStart(2, '0')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none text-center w-full max-w-lg">
                <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-red-900/50 inline-block shadow-lg">
                    <p className="text-red-200 font-mono text-sm tracking-wider uppercase">
                        {gameState === 'PLAYING' ?
                            "DDOS Attack in progress. Click nodes to reboot when they turn Yellow or Red before they fail." :
                            gameState === 'SUCCESS' ? "Attack survived. Systems stabilizing." : "Catastrophic Failure. Cluster down."}
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
                                <h2 className="text-2xl font-bold text-white mb-2">Cluster Saved</h2>
                                <p className="text-slate-300 mb-6">You successfully mitigated the traffic anomalies.</p>
                                <div className="text-4xl font-mono text-emerald-300 mb-8">{score} PTS</div>
                                <button
                                    onClick={() => onComplete(score)}
                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-emerald-500/25"
                                >
                                    Review Logs
                                </button>
                            </>
                        ) : (
                            <>
                                <AlertTriangle className="w-16 h-16 text-red-400 mb-4" />
                                <h2 className="text-2xl font-bold text-white mb-2">Chaos Ensued</h2>
                                <p className="text-slate-300 mb-6">A critical node reached failure and brought the cluster down.</p>
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
                                            setTimeLeft(difficulty === 'Elite' ? 60 : 120);
                                            setServers(initialServers);
                                            setSystemHealth(100);
                                            setScore(0);
                                        }}
                                        className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-red-500/25"
                                    >
                                        Reboot
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 w-full bg-black relative">
                <Canvas camera={{ position: [0, 2, 8], fov: 60 }}>
                    <color attach="background" args={['#020617']} />
                    <ambientLight intensity={0.5} />
                    <pointLight position={[0, 5, 5]} intensity={1.5} color="#ffffff" />

                    <group>
                        {/* Server Rack Frame */}
                        <Box args={[(cols * 2.2) + 0.4, (rows * 0.6) + 0.4, 2.2]} position={[0, 0, 0]}>
                            <meshStandardMaterial color="#0f172a" wireframe transparent opacity={0.3} />
                        </Box>

                        {servers.map(s => (
                            <ServerNode
                                key={s.id}
                                position={s.position}
                                status={s.status}
                                onClick={(e: any) => handleServerClick(s.id, e)}
                            />
                        ))}
                    </group>

                    <OrbitControls
                        enablePan={false}
                        enableZoom={false}
                        autoRotate={true}
                        autoRotateSpeed={0.5}
                        maxPolarAngle={Math.PI / 2}
                        minPolarAngle={0}
                    />

                    <EffectComposer>
                        <Bloom luminanceThreshold={0.4} luminanceSmoothing={0.9} height={300} intensity={1.5} />
                        <ChromaticAberration offset={new THREE.Vector2(0.002, 0.002)} />
                        {systemHealth < 50 && <Glitch delay={new THREE.Vector2(0, 0)} duration={new THREE.Vector2(0.1, 0.3)} strength={new THREE.Vector2(0.1, 0.5)} active={true} />}
                    </EffectComposer>
                </Canvas>
            </div>
        </div>
    );
};
