import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, MeshDistortMaterial, Text, Edges, Sparkles, Html } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch, Scanline, Noise } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Server, Wifi, Zap, ShieldAlert, Binary, Unlock } from 'lucide-react';
import { audio } from '../../services/audioService';
import { motion, AnimatePresence } from 'framer-motion';

export interface CognitiveCityProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

// City Block Logic
type BlockType = 'residential' | 'commercial' | 'industrial' | 'server';
type BlockState = 'secure' | 'vulnerable' | 'hacked' | 'locked';

interface CityBlock {
    id: string;
    x: number;
    z: number;
    height: number;
    type: BlockType;
    state: BlockState;
    securityLevel: number;
    connections: string[]; // adjacent blocks
}

const CITY_SIZE = 5;

// Visual component for a block
const Building = ({ block, onHack }: { block: CityBlock; onHack: () => void }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHover] = useState(false);

    useFrame((state) => {
        if (meshRef.current) {
            // Slight hover bob
            meshRef.current.position.y = (block.height / 2) + Math.sin(state.clock.elapsedTime * 2 + block.x) * 0.05;
        }
    });

    // Colors based on state
    let color = '#3b82f6'; // Secure (Blue)
    let emissive = '#1d4ed8';
    if (block.state === 'vulnerable') { color = '#f59e0b'; emissive = '#d97706'; } // Yellow
    if (block.state === 'hacked') { color = '#10b981'; emissive = '#059669'; } // Green (Owned)
    if (block.state === 'locked') { color = '#374151'; emissive = '#111827'; } // Gray

    if (block.type === 'server') {
        if (block.state === 'secure') { color = '#ef4444'; emissive = '#b91c1c'; } // Red (Target)
        // If server is hacked, it's green.
    }

    const interactive = block.state === 'vulnerable' || block.type === 'server' && block.state === 'secure';

    return (
        <group position={[block.x - Math.floor(CITY_SIZE / 2), 0, block.z - Math.floor(CITY_SIZE / 2)]}>
            <Box
                ref={meshRef}
                args={[0.8, block.height, 0.8]}
                position={[0, block.height / 2, 0]}
                onClick={(e) => { e.stopPropagation(); if (interactive) onHack(); }}
                onPointerOver={() => setHover(true)}
                onPointerOut={() => setHover(false)}
            >
                <meshStandardMaterial
                    color={color}
                    emissive={emissive}
                    emissiveIntensity={hovered && interactive ? 2 : block.state === 'hacked' ? 1.5 : 0.5}
                    metalness={0.8}
                    roughness={0.2}
                    wireframe={block.state === 'locked'}
                />
                <Edges scale={1.05} threshold={15} color={hovered && interactive ? 'white' : '#60a5fa'} opacity={0.5} transparent />

                {block.type === 'server' && (
                    <Html center position={[0, block.height / 2 + 0.5, 0]}>
                        <div className="animate-bounce">
                            <Server className={`w-6 h-6 ${block.state === 'hacked' ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,1)]' : 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,1)]'}`} />
                        </div>
                    </Html>
                )}
                {block.state === 'hacked' && block.type !== 'server' && (
                    <Html center position={[0, block.height / 2 + 0.3, 0]}>
                        <Zap className="w-3 h-3 text-emerald-400 opacity-50" />
                    </Html>
                )}
            </Box>
        </group>
    );
};

export const CognitiveCity: React.FC<CognitiveCityProps> = ({ onComplete, difficulty, t }) => {
    const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'SUCCESS' | 'FAILED'>('IDLE');
    const [timeLeft, setTimeLeft] = useState(120);
    const [score, setScore] = useState(0);
    const [glitchActive, setGlitchActive] = useState(false);

    // Grid State
    const [grid, setGrid] = useState<CityBlock[]>([]);
    const [nodesOwned, setNodesOwned] = useState(0);

    const [firewallStrength, setFirewallStrength] = useState(100);

    // Initial Generator
    const startGame = () => {
        const newGrid: CityBlock[] = [];
        const types: BlockType[] = ['residential', 'commercial', 'industrial'];

        let targetX = Math.floor(Math.random() * CITY_SIZE);
        let targetZ = Math.floor(Math.random() * CITY_SIZE);
        // Ensure target is not in the corner where we start (0,0)
        while (targetX < 2 && targetZ < 2) {
            targetX = Math.floor(Math.random() * CITY_SIZE);
            targetZ = Math.floor(Math.random() * CITY_SIZE);
        }

        for (let x = 0; x < CITY_SIZE; x++) {
            for (let z = 0; z < CITY_SIZE; z++) {
                const isTarget = x === targetX && z === targetZ;
                const isStart = x === 0 && z === 0;

                newGrid.push({
                    id: `${x}-${z}`,
                    x, z,
                    height: isTarget ? 3 : 0.5 + Math.random() * 1.5,
                    type: isTarget ? 'server' : types[Math.floor(Math.random() * types.length)],
                    state: isStart ? 'hacked' : 'locked', // start at 0,0
                    securityLevel: isTarget ? 100 : Math.floor(Math.random() * 30) + 10,
                    connections: [
                        `${x + 1}-${z}`, `${x - 1}-${z}`, `${x}-${z + 1}`, `${x}-${z - 1}`
                    ]
                });
            }
        }

        updateVulnerabilities(newGrid);
        setGrid(newGrid);
        setNodesOwned(1);
        setFirewallStrength(100);
        setTimeLeft(difficulty === 'Elite' ? 60 : 120);
        setScore(0);
        setGameState('PLAYING');
        audio.playSystemMessage({ type: 'success' });
    };

    // Recalculate which locked nodes are now vulnerable (adjacent to a hacked node)
    const updateVulnerabilities = (currentGrid: CityBlock[]) => {
        const hackedIds = new Set(currentGrid.filter(b => b.state === 'hacked').map(b => b.id));

        currentGrid.forEach(block => {
            if (block.state === 'locked' || block.state === 'vulnerable') {
                // Check if any connection is hacked
                const isAdj = block.connections.some(c => hackedIds.has(c));
                if (isAdj && block.type !== 'server') {
                    block.state = 'vulnerable';
                }
            }
        });
    };

    const handleHack = (blockId: string) => {
        if (gameState !== 'PLAYING') return;

        setGrid(prevGrid => {
            const newGrid = [...prevGrid];
            const targetIndex = newGrid.findIndex(b => b.id === blockId);
            const target = newGrid[targetIndex];

            if (target.type === 'server') {
                // Try to hack the main server
                if (nodesOwned < 6) {
                    // Not enough botnet power
                    audio.playError();
                    setGlitchActive(true);
                    setTimeout(() => setGlitchActive(false), 500);
                    setFirewallStrength(f => Math.max(0, f - 5)); // We take damage
                    return prevGrid;
                } else {
                    // Success!
                    audio.playSystemMessage({ type: 'success' });
                    target.state = 'hacked';
                    finishGame(true, newScore);
                    return newGrid;
                }
            }

            // Normal node override
            target.state = 'hacked';
            audio.playTyping();
            setNodesOwned(n => n + 1);
            setFirewallStrength(f => Math.min(100, f + 5)); // Rebuild strength
            const newScore = score + target.securityLevel;
            setScore(newScore);

            updateVulnerabilities(newGrid);
            return newGrid;
        });
    };

    const finishGame = (win: boolean, finalScore: number = score) => {
        setGameState(win ? 'SUCCESS' : 'FAILED');
        if (win) {
            setScore(finalScore + (timeLeft * 10)); // Time bonus
            setTimeout(() => onComplete(finalScore + (timeLeft * 10), { timeRemaining: timeLeft }), 3000);
        } else {
            setTimeout(() => onComplete(100, { timeRemaining: 0 }), 3000);
        }
    };

    // Timer and active defenses
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        const timer = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    finishGame(false);
                    return 0;
                }
                return t - 1;
            });

            // Random Corporate ICE attacks (lower our firewall)
            if (Math.random() < 0.2) {
                setFirewallStrength(f => {
                    const next = f - 10;
                    if (next <= 0) {
                        finishGame(false);
                        return 0;
                    }
                    audio.playSystemMessage({ type: 'warning' });
                    setGlitchActive(true);
                    setTimeout(() => setGlitchActive(false), 300);
                    return next;
                });
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [gameState]);


    return (
        <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border border-cyan-500/20 bg-gray-950 font-mono select-none shadow-[0_0_60px_rgba(6,182,212,0.1)]">

            {/* Background Canvas */}
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [5, 6, 5], fov: 45 }}>
                    <ambientLight intensity={0.2} color="#06b6d4" />
                    <pointLight position={[5, 10, 5]} intensity={1.5} color="#3b82f6" />
                    <pointLight position={[-5, -5, -5]} intensity={0.5} color="#ef4444" />

                    {/* Grid plane */}
                    <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[10, 10]} />
                        <meshBasicMaterial color="#020617" />
                    </mesh>

                    <gridHelper args={[10, CITY_SIZE, '#1e3a8a', '#0f172a']} position={[0, 0, 0]} />

                    {/* Nodes */}
                    {gameState !== 'IDLE' && grid.map((block) => (
                        <Building key={block.id} block={block} onHack={() => handleHack(block.id)} />
                    ))}

                    <Sparkles count={100} scale={10} size={2} speed={0.4} color="#0cebcf" opacity={0.3} />

                    {/* Target Server Laser */}
                    {gameState !== 'IDLE' && grid.find(g => g.type === 'server')?.state === 'hacked' && (
                        <mesh position={[grid.find(g => g.type === 'server')!.x - Math.floor(CITY_SIZE / 2), 5, grid.find(g => g.type === 'server')!.z - Math.floor(CITY_SIZE / 2)]}>
                            <cylinderGeometry args={[0.1, 0.1, 10, 8]} />
                            <meshBasicMaterial color="#10b981" transparent opacity={0.8} />
                        </mesh>
                    )}

                    <OrbitControls maxPolarAngle={Math.PI / 2.2} minPolarAngle={Math.PI / 4} enablePan={false} autoRotate={gameState === 'IDLE'} autoRotateSpeed={1} />

                    <EffectComposer>
                        <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} />
                        <Scanline blendFunction={BlendFunction.OVERLAY} density={1.5} opacity={0.5} />
                        <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.002, 0.002)} />
                        {glitchActive && <Glitch delay={new THREE.Vector2(0, 0)} duration={new THREE.Vector2(0.1, 0.3)} mode={GlitchMode.SPORADIC} active ratio={0.8} />}
                        <Noise opacity={0.04} />
                    </EffectComposer>
                </Canvas>
            </div>

            {/* UI Layer */}
            {gameState !== 'IDLE' && (
                <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
                    {/* Left HUD */}
                    <div className="flex flex-col gap-4">
                        <div className="bg-black/60 backdrop-blur-xl rounded-xl p-4 border border-cyan-500/30 w-56 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                            <div className="text-[10px] text-cyan-400 mb-1 uppercase tracking-widest font-bold flex items-center gap-2">
                                <Binary className="w-4 h-4" /> Botnet Capacity
                            </div>
                            <div className="text-3xl text-white font-black">{nodesOwned} <span className="text-sm text-cyan-600">/ {CITY_SIZE * CITY_SIZE}</span></div>
                            <div className="text-[10px] text-cyan-200 mt-2 opacity-70">Requires 6+ nodes to breach Target Server.</div>
                        </div>

                        <div className="bg-black/60 backdrop-blur-xl rounded-xl p-4 border border-blue-500/30 w-56">
                            <div className="text-[10px] text-emerald-400 mb-2 uppercase tracking-widest font-bold flex items-center gap-2">
                                <ShieldAlert className="w-3 h-3" /> Trace Integrity
                            </div>
                            <div className="w-full h-2 bg-gray-900 rounded overflow-hidden">
                                <div className={`h-full ${firewallStrength < 30 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'} transition-all duration-300`} style={{ width: `${firewallStrength}%` }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Right HUD (Timer / Score) */}
                    <div className="flex flex-col items-end gap-4">
                        <div className="bg-black/60 backdrop-blur-xl rounded-xl p-4 border border-red-500/30 flex flex-col items-end shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                            <div className="flex items-center gap-2 text-red-400 mb-1">
                                <AlertTriangle className="w-4 h-4" />
                                <span className="text-[10px] uppercase tracking-widest font-bold">ICE Trace</span>
                            </div>
                            <div className={`text-4xl font-mono tracking-widest font-black ${timeLeft <= 30 ? 'text-red-500 animate-pulse drop-shadow-[0_0_10px_red]' : 'text-white'}`}>{timeLeft}s</div>
                        </div>

                        <div className="bg-black/60 backdrop-blur-xl rounded-xl p-3 border border-yellow-500/30 flex flex-col items-end min-w-[120px]">
                            <span className="text-[10px] text-yellow-500 uppercase tracking-widest font-bold mb-1">Data Extracted</span>
                            <span className="text-xl text-white font-mono">{score} TB</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Middle Screen Overlays */}
            <AnimatePresence>
                {gameState === 'IDLE' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-8 text-center backdrop-blur-sm">
                        <div className="max-w-md border border-cyan-500/50 p-8 rounded-2xl bg-cyan-950/20 shadow-[0_0_50px_rgba(6,182,212,0.2)]">
                            <Zap className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
                            <h2 className="text-3xl font-black text-cyan-400 mb-4 tracking-widest uppercase">Cognitive City</h2>
                            <p className="text-cyan-100/70 text-sm mb-6 leading-relaxed">
                                Connect to the smart city grid. Start from your local access point and hack adjacent nodes (Yellow) to expand your botnet.
                                <br /><br />
                                You need control of at least 6 infrastructure nodes to breach the central Corporate Server (Red) before the ICE trace completes.
                            </p>
                            <button onClick={startGame} className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-black font-black uppercase tracking-widest rounded transition-colors shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                                Initiate Uplink
                            </button>
                        </div>
                    </motion.div>
                )}

                {gameState === 'SUCCESS' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-50 flex items-center justify-center bg-emerald-950/90 backdrop-blur-lg">
                        <div className="text-center">
                            <Unlock className="w-24 h-24 text-emerald-400 mx-auto mb-6 drop-shadow-[0_0_20px_rgba(52,211,153,0.8)]" />
                            <h2 className="text-6xl font-black text-white mb-4 tracking-[0.2em] uppercase drop-shadow-[0_0_20px_emerald]">Mainframe Breached</h2>
                            <p className="text-emerald-200 text-xl font-mono">Root access granted. Data extracted: {score} TB</p>
                        </div>
                    </motion.div>
                )}

                {gameState === 'FAILED' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-950/90 backdrop-blur-lg border-[10px] border-red-600/30">
                        <h2 className="text-7xl font-black text-red-500 mb-4 tracking-[0.3em] uppercase drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]">Trace Complete</h2>
                        <p className="text-red-200 text-xl font-mono mb-8 opacity-80 uppercase tracking-widest">Connection severed. Botnet dismantled.</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
