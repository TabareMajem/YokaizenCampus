import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Box, Text, Plane, Float, Html } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Scanline, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Zap, AlertTriangle, Shield, Mic, Keyboard } from 'lucide-react';
import { audio } from '../../services/audioService';

export interface PromptDriftProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

// Visuals
const ROAD_LENGTH = 100;
const ROAD_WIDTH = 10;
const SPEED = 20;

// Game Logic
type Lane = -1 | 0 | 1; // Left, Center, Right

interface Obstacle {
    id: number;
    z: number;
    lane: Lane;
    word: string;
    type: 'firewall' | 'bug' | 'latency';
}

const WORDS = [
    'sudo', 'rm', 'rf', 'root', 'hack', 'patch', 'bypass', 'proxy',
    'vpn', 'ddos', 'ping', 'bash', 'grep', 'nmap', 'ssh', 'ftp',
    'sql', 'inject', 'virus', 'worm', 'trojan', 'botnet', 'malware'
];

const Car = ({ lane, isHit }: { lane: Lane, isHit: boolean }) => {
    const meshRef = useRef<THREE.Group>(null);
    const { clock } = useThree();

    useFrame(() => {
        if (meshRef.current) {
            // Smooth lane transition
            const targetX = lane * (ROAD_WIDTH / 3);
            meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, 0.1);

            // Hover effect
            meshRef.current.position.y = 0.5 + Math.sin(clock.elapsedTime * 10) * 0.05;

            // Banking effect
            const deltaX = targetX - meshRef.current.position.x;
            meshRef.current.rotation.z = deltaX * 0.2;
        }
    });

    return (
        <group ref={meshRef} position={[0, 0.5, 4]}>
            {/* Main Body */}
            <Box args={[1.2, 0.4, 2.5]} castShadow>
                <meshStandardMaterial color={isHit ? "#ef4444" : "#0ea5e9"} metalness={0.8} roughness={0.2} emissive={isHit ? "#dc2626" : "#0284c7"} emissiveIntensity={0.5} />
            </Box>
            {/* Cockpit */}
            <Box args={[0.8, 0.3, 1]} position={[0, 0.35, -0.2]}>
                <meshStandardMaterial color="#020617" roughness={0.1} metalness={0.9} />
            </Box>
            {/* Thrusters */}
            <Box args={[0.3, 0.2, 0.2]} position={[-0.4, 0, 1.3]}>
                <meshBasicMaterial color="#fcd34d" />
            </Box>
            <Box args={[0.3, 0.2, 0.2]} position={[0.4, 0, 1.3]}>
                <meshBasicMaterial color="#fcd34d" />
            </Box>

            {/* Thruster Glow */}
            <pointLight position={[0, 0, 2]} intensity={2} color="#f59e0b" distance={5} />
        </group>
    );
};

const GridFloor = () => {
    const gridRef = useRef<THREE.GridHelper>(null);

    useFrame((state) => {
        if (gridRef.current) {
            // Move grid towards camera to simulate speed
            const z = (state.clock.elapsedTime * SPEED) % 2;
            gridRef.current.position.z = z;
        }
    });

    return (
        <group position={[0, -0.1, 0]}>
            <Plane args={[ROAD_WIDTH * 2, ROAD_LENGTH]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <meshBasicMaterial color="#020617" />
            </Plane>
            <gridHelper ref={gridRef} args={[ROAD_WIDTH * 4, 100, '#e81cff', '#0ea5e9']} position={[0, 0, 0]} />
        </group>
    );
};

export const PromptDrift: React.FC<PromptDriftProps> = ({ onComplete, difficulty, t }) => {
    const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'SUCCESS' | 'FAILED'>('IDLE');
    const [score, setScore] = useState(0);
    const [shield, setShield] = useState(100);
    const [timeLeft, setTimeLeft] = useState(60);

    const [lane, setLane] = useState<Lane>(0);
    const [obstacles, setObstacles] = useState<Obstacle[]>([]);
    const [inputBuffer, setInputBuffer] = useState('');
    const [isHit, setIsHit] = useState(false);

    // Audio/Voice State (Faked for now, requires real Web Speech API in production phase 8 implementation)
    const [voiceActive, setVoiceActive] = useState(false);

    const obstacleIdCounter = useRef(0);

    const startGame = () => {
        setScore(0);
        setShield(100);
        setTimeLeft(difficulty === 'Elite' ? 45 : 60);
        setLane(0);
        setObstacles([]);
        setInputBuffer('');
        setIsHit(false);
        setGameState('PLAYING');
        audio.playSystemMessage({ type: 'success' });
    };

    // Engine Loop
    useFrame((state, delta) => {
        if (gameState !== 'PLAYING') return;

        // Move Obstacles
        setObstacles(prev => {
            const next = prev.map(obs => ({
                ...obs,
                z: obs.z + SPEED * delta
            })).filter(obs => obs.z < 10); // Remove ones behind camera

            // Collision Detection
            const hit = next.find(obs => obs.z > 2.5 && obs.z < 5.5 && obs.lane === lane);
            if (hit) {
                // Remove hit obstacle to prevent multiple triggers
                audio.playError();
                setIsHit(true);
                setTimeout(() => setIsHit(false), 300);

                setShield(s => {
                    const nextShield = s - 25;
                    if (nextShield <= 0) {
                        endGame(false);
                    }
                    return nextShield;
                });
                return next.filter(o => o.id !== hit.id);
            }

            return next;
        });

        // Spawn Obstacles
        if (Math.random() < 0.02 + (score / 10000)) { // Gets faster
            obstacleIdCounter.current += 1;
            setObstacles(prev => [
                ...prev,
                {
                    id: obstacleIdCounter.current,
                    z: -ROAD_LENGTH,
                    lane: (Math.floor(Math.random() * 3) - 1) as Lane,
                    word: WORDS[Math.floor(Math.random() * WORDS.length)],
                    type: Math.random() > 0.5 ? 'firewall' : 'bug'
                }
            ]);
        }
    });

    // Keyboard Input Handling
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Movement
            if (e.key === 'ArrowLeft' || e.key === 'a') setLane(prev => Math.max(-1, prev - 1) as Lane);
            if (e.key === 'ArrowRight' || e.key === 'd') setLane(prev => Math.min(1, prev + 1) as Lane);

            // Typing Mechanic (Destroy nearest in targeted lane)
            if (e.key.length === 1 && e.key.match(/[a-z]/i)) {
                setInputBuffer(prev => {
                    const next = prev + e.key.toLowerCase();

                    // Check if buffer matches any obstacle in view
                    const matchedObsIndex = obstacles.findIndex(o => o.word === next);

                    if (matchedObsIndex !== -1) {
                        // Destroy it
                        audio.playClick();
                        setScore(s => s + 50);
                        setObstacles(obsList => obsList.filter((_, i) => i !== matchedObsIndex));
                        return ''; // clear buffer
                    }

                    // Check if buffer is a partial match for ANY obstacle
                    const isPartial = obstacles.some(o => o.word.startsWith(next));
                    if (!isPartial) {
                        // Mistake!
                        audio.playError();
                        setScore(s => Math.max(0, s - 10)); // tiny penalty
                        return '';
                    }

                    return next;
                });
            }

            if (e.key === 'Backspace') {
                setInputBuffer(prev => prev.slice(0, -1));
            }
            if (e.key === 'Escape') {
                setInputBuffer('');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState, obstacles]);


    const endGame = (win: boolean) => {
        setGameState(win ? 'SUCCESS' : 'FAILED');
        const finalScore = win ? score + (shield * 10) : score;
        setScore(finalScore);
        setTimeout(() => onComplete(win ? Math.max(500, finalScore) : 100, { timeRemaining: timeLeft }), 3000);
    };

    // Timer Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const timer = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    endGame(true); // Survive the time to win
                    return 0;
                }
                return t - 1;
            });
            // Passive score
            setScore(s => s + 5);
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState]);


    return (
        <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border border-pink-500/20 bg-black font-mono select-none shadow-[0_0_60px_rgba(232,28,255,0.15)]">

            {/* 3D Canvas */}
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 4, 10], fov: 60 }}>
                    <ambientLight intensity={0.5} color="#e81cff" />
                    <pointLight position={[0, 10, 0]} intensity={1} color="#0ea5e9" />

                    <fog attach="fog" args={["#020617", 10, 80]} />

                    <GridFloor />

                    <Car lane={lane} isHit={isHit} />

                    {/* Render Obstacles */}
                    {obstacles.map(obs => (
                        <group key={obs.id} position={[obs.lane * (ROAD_WIDTH / 3), 1, obs.z]}>
                            <Box args={[2, 2, 2]}>
                                <meshStandardMaterial color={obs.type === 'firewall' ? '#ef4444' : '#eab308'} emissive={obs.type === 'firewall' ? '#dc2626' : '#ca8a04'} wireframe />
                            </Box>
                            <Html center position={[0, 2, 0]} className="pointer-events-none">
                                <div className="px-2 py-1 bg-black/80 border border-white/20 text-white font-mono text-lg font-bold shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                                    {/* Highlight matched portion */}
                                    {obs.word.startsWith(inputBuffer) ? (
                                        <>
                                            <span className="text-pink-500">{inputBuffer}</span>
                                            <span>{obs.word.slice(inputBuffer.length)}</span>
                                        </>
                                    ) : (
                                        obs.word
                                    )}
                                </div>
                            </Html>
                        </group>
                    ))}

                    <EffectComposer>
                        <Bloom luminanceThreshold={0.2} mipmapBlur intensity={2} />
                        <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.003, 0.003)} />
                        <Scanline blendFunction={BlendFunction.OVERLAY} density={1.5} opacity={0.3} />
                        <Noise opacity={0.05} />
                    </EffectComposer>
                </Canvas>
            </div>

            {/* UI HUD Overlay */}
            {gameState !== 'IDLE' && (
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-6 flex flex-col justify-between z-10">

                    {/* Top HUD */}
                    <div className="flex justify-between items-start">
                        {/* Shield & Comm */}
                        <div className="flex flex-col gap-4 w-64">
                            <div className="bg-black/60 backdrop-blur-xl rounded-xl p-4 border border-cyan-500/30 shadow-[0_0_20px_rgba(14,165,233,0.3)]">
                                <div className="text-[10px] text-cyan-400 mb-2 uppercase tracking-[0.2em] font-bold flex items-center gap-2">
                                    <Shield className={`w-3 h-3 ${shield <= 25 ? 'animate-ping' : ''}`} /> Core Integrity
                                </div>
                                <div className="w-full h-3 bg-gray-900 rounded overflow-hidden">
                                    <div className={`h-full ${shield > 50 ? 'bg-cyan-500' : shield > 25 ? 'bg-yellow-500' : 'bg-red-500'} transition-all`} style={{ width: `${shield}%` }}></div>
                                </div>
                                <div className="text-right text-xs text-white/70 mt-1">{shield}%</div>
                            </div>

                            <div className="bg-black/60 backdrop-blur-xl rounded-xl p-3 border border-pink-500/30 flex items-center gap-3">
                                <div className={`p-2 rounded-full ${voiceActive ? 'bg-pink-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                                    <Mic className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-[10px] uppercase tracking-widest text-pink-400 font-bold mb-1">Voice Cmd</div>
                                    <div className="text-xs text-zinc-400 italic">Disabled (Req WebSpeech API)</div>
                                </div>
                            </div>
                        </div>

                        {/* Timer & Distance */}
                        <div className="flex flex-col items-end gap-4 w-64">
                            <div className="bg-black/60 backdrop-blur-xl rounded-xl p-4 border border-pink-500/30 flex flex-col items-end shadow-[0_0_20px_rgba(232,28,255,0.2)]">
                                <div className="flex items-center gap-2 text-pink-400 mb-1">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Extraction Time</span>
                                </div>
                                <div className={`text-4xl font-black italic tracking-widest ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timeLeft}s</div>
                            </div>

                            <div className="bg-black/60 backdrop-blur-xl rounded-xl p-3 border border-yellow-500/30 flex flex-col items-end w-full">
                                <span className="text-[10px] text-yellow-500 uppercase tracking-widest font-bold mb-1">Upload Data</span>
                                <span className="text-2xl text-white font-mono">{score} TB</span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Input HUD */}
                    <div className="w-full flex justify-center mb-8">
                        <div className="bg-black/80 backdrop-blur-xl rounded-full px-8 py-4 border-2 border-cyan-500/50 shadow-[0_0_30px_rgba(14,165,233,0.3)] flex items-center gap-4">
                            <Keyboard className="w-5 h-5 text-cyan-400" />
                            <div className="text-2xl font-mono text-white tracking-widest min-w-[150px] text-center border-b-2 border-cyan-500/30 pb-1">
                                {inputBuffer || <span className="opacity-20">TYPE TO HACK...</span>}
                            </div>
                        </div>
                    </div>

                </div>
            )}

            {/* Screens */}
            <AnimatePresence>
                {gameState === 'IDLE' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-8 text-center backdrop-blur-sm">
                        <div className="max-w-md border border-pink-500/50 p-8 rounded-2xl bg-zinc-950/80 shadow-[0_0_50px_rgba(232,28,255,0.3)]">
                            <div className="flex justify-center mb-4">
                                <Zap className="w-16 h-16 text-pink-500" />
                            </div>
                            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-400 mb-4 tracking-widest italic uppercase">Prompt Drift</h2>
                            <p className="text-zinc-300 text-sm mb-6 leading-relaxed">
                                Escape the corporate mainframe.
                                <br /><br />
                                <span className="text-cyan-400 font-bold">ARROWS or A/D</span> to dodge barriers.<br />
                                <span className="text-pink-400 font-bold">TYPE WORDS</span> fast to destroy firewalls in your path.
                                <br /><br />
                                Survive for 60 seconds to upload the data payload.
                            </p>
                            <button onClick={startGame} className="w-full py-4 bg-gradient-to-r from-pink-600 to-cyan-600 hover:from-pink-500 hover:to-cyan-500 text-white font-black uppercase tracking-widest rounded transition-all shadow-[0_0_20px_rgba(232,28,255,0.5)]">
                                Ignite Engines
                            </button>
                        </div>
                    </motion.div>
                )}

                {gameState === 'SUCCESS' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-cyan-950/90 backdrop-blur-lg">
                        <Zap className="w-24 h-24 text-cyan-400 mb-6 drop-shadow-[0_0_30px_rgba(34,211,238,1)]" />
                        <h2 className="text-6xl font-black text-white mb-4 tracking-[0.2em] italic uppercase drop-shadow-[0_4px_20px_rgba(34,211,238,0.5)]">Escape Velocity</h2>
                        <p className="text-cyan-200 text-xl font-mono mb-2">Upload Complete.</p>
                        <p className="text-white text-3xl font-black">{score} TB Extracted</p>
                    </motion.div>
                )}

                {gameState === 'FAILED' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-950/90 backdrop-blur-lg border-[10px] border-red-600/30">
                        <h2 className="text-7xl font-black text-red-500 mb-4 tracking-[0.3em] uppercase italic drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]">Crashed</h2>
                        <p className="text-red-200 text-xl font-mono mb-8 opacity-80 uppercase tracking-widest">Hull Integrity Compromised.</p>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};
