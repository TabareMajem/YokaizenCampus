import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Cylinder, Float, Sparkles, Html } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Building2, Zap, Droplets, Wifi, AlertTriangle, ShieldCheck, TrendingUp, TrendingDown } from 'lucide-react';
import { audio } from '../../services/audioService';
import { motion, AnimatePresence } from 'framer-motion';

export interface SmartCityMayorProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

// City Grid Types
type ZoneType = 'residential' | 'commercial' | 'industrial' | 'power' | 'water' | 'data';

interface CityBlock {
    id: string;
    x: number;
    z: number;
    type: ZoneType | 'empty';
    level: number;
    efficiency: number; // 0-100
}

const ZONE_COLORS: Record<ZoneType, string> = {
    'residential': '#10b981', // green
    'commercial': '#3b82f6', // blue
    'industrial': '#f59e0b', // orange
    'power': '#eab308', // yellow
    'water': '#0ea5e9', // cyan
    'data': '#8b5cf6', // purple
};

const GRID_SIZE = 5;

// 3D Building Component
const Building = ({ block, onUpgrade }: { block: CityBlock, onUpgrade: (id: string) => void }) => {
    const isHovered = useRef(false);
    const [hover, setHover] = useState(false);

    // Height based on level and type
    const height = block.type === 'empty' ? 0.1 : 0.5 + (block.level * 0.5);
    const color = block.type === 'empty' ? '#1e293b' : ZONE_COLORS[block.type];

    // Status color modifier
    const emissive = block.type === 'empty' ? '#000000' :
        block.efficiency < 30 ? '#ef4444' :
            block.efficiency > 80 ? color : '#333333';

    return (
        <group position={[block.x - Math.floor(GRID_SIZE / 2), height / 2, block.z - Math.floor(GRID_SIZE / 2)]}>
            {block.type !== 'empty' && block.efficiency < 30 && (
                <Sparkles count={10} scale={1} size={4} speed={0.4} opacity={0.8} color="#ef4444" position={[0, height / 2 + 0.5, 0]} />
            )}

            <Box
                args={[0.9, height, 0.9]}
                castShadow
                receiveShadow
                onPointerOver={() => { isHovered.current = true; setHover(true); document.body.style.cursor = 'pointer'; }}
                onPointerOut={() => { isHovered.current = false; setHover(false); document.body.style.cursor = 'default'; }}
                onClick={(e) => {
                    e.stopPropagation();
                    onUpgrade(block.id);
                }}
            >
                <meshStandardMaterial
                    color={hover ? '#ffffff' : color}
                    emissive={emissive}
                    emissiveIntensity={hover ? 0.8 : (block.efficiency < 30 ? 0.5 : 0.2)}
                    metalness={0.6}
                    roughness={0.2}
                />
            </Box>

            {/* Level Indicator rings */}
            {block.type !== 'empty' && Array.from({ length: block.level }).map((_, i) => (
                <Cylinder key={i} args={[0.55, 0.55, 0.05, 16]} position={[0, (-height / 2) + 0.2 + (i * 0.4), 0]}>
                    <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
                </Cylinder>
            ))}
        </group>
    );
};

export const SmartCityMayor: React.FC<SmartCityMayorProps> = ({ onComplete, difficulty, t }) => {
    const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'SUCCESS' | 'FAILED'>('IDLE');
    const [score, setScore] = useState(0);
    const [turn, setTurn] = useState(1);
    const MAX_TURNS = difficulty === 'Elite' ? 15 : 20;

    // City State
    const [grid, setGrid] = useState<CityBlock[]>([]);
    const [resources, setResources] = useState({
        power: 50,
        water: 50,
        data: 50,
        budget: 1000
    });
    const [approval, setApproval] = useState(75); // 0-100

    // Selected tool for building
    const [activeTool, setActiveTool] = useState<ZoneType | 'upgrade' | null>(null);

    // Initialize Grid
    const initGrid = useCallback(() => {
        const newGrid: CityBlock[] = [];
        for (let x = 0; x < GRID_SIZE; x++) {
            for (let z = 0; z < GRID_SIZE; z++) {
                // Start with a small core
                const isCenter = Math.abs(x - 2) <= 1 && Math.abs(z - 2) <= 1;
                let type: ZoneType | 'empty' = 'empty';
                let level = 1;

                if (isCenter) {
                    if (x === 2 && z === 2) type = 'commercial';
                    else if (x === 1 && z === 2) type = 'residential';
                    else if (x === 3 && z === 2) type = 'residential';
                    else if (x === 2 && z === 1) type = 'power';
                    else Math.random() > 0.5 ? type = 'empty' : type = 'residential';
                }

                newGrid.push({
                    id: `${x}-${z}`,
                    x, z,
                    type,
                    level,
                    efficiency: type === 'empty' ? 0 : 80 + Math.random() * 20
                });
            }
        }
        setGrid(newGrid);
    }, []);

    const startGame = () => {
        initGrid();
        setScore(0);
        setTurn(1);
        setResources({ power: 50, water: 50, data: 50, budget: 1500 });
        setApproval(75);
        setActiveTool(null);
        setGameState('PLAYING');
        audio.playSystemMessage({ type: 'success' });
    };

    // Calculate demands and update efficiency
    const endTurn = () => {
        if (gameState !== 'PLAYING') return;

        audio.playClick();

        let newApproval = approval;
        let newBudget = resources.budget;

        // Calculate production
        const powerProd = grid.filter(b => b.type === 'power').reduce((sum, b) => sum + (b.level * 20), 0);
        const waterProd = grid.filter(b => b.type === 'water').reduce((sum, b) => sum + (b.level * 20), 0);
        const dataProd = grid.filter(b => b.type === 'data').reduce((sum, b) => sum + (b.level * 20), 0);

        // Calculate consumption
        const powerCons = grid.filter(b => ['residential', 'commercial', 'industrial'].includes(b.type)).reduce((sum, b) => sum + (b.level * 10), 0) + grid.filter(b => b.type === 'data').reduce((sum, b) => sum + (b.level * 15), 0);
        const waterCons = grid.filter(b => ['residential', 'commercial', 'industrial'].includes(b.type)).reduce((sum, b) => sum + (b.level * 10), 0);
        const dataCons = grid.filter(b => ['commercial', 'industrial'].includes(b.type)).reduce((sum, b) => sum + (b.level * 15), 0) + grid.filter(b => b.type === 'residential').reduce((sum, b) => sum + (b.level * 5), 0);

        // Calculate deficits
        const powerDeficit = Math.max(0, powerCons - (resources.power + powerProd));
        const waterDeficit = Math.max(0, waterCons - (resources.water + waterProd));
        const dataDeficit = Math.max(0, dataCons - (resources.data + dataProd));

        // Tax income
        const residentialIncome = grid.filter(b => b.type === 'residential').reduce((sum, b) => sum + (b.level * 50 * (b.efficiency / 100)), 0);
        const commercialIncome = grid.filter(b => b.type === 'commercial').reduce((sum, b) => sum + (b.level * 100 * (b.efficiency / 100)), 0);
        const industrialIncome = grid.filter(b => b.type === 'industrial').reduce((sum, b) => sum + (b.level * 80 * (b.efficiency / 100)), 0);

        newBudget += (residentialIncome + commercialIncome + industrialIncome);

        // Update Grid Efficiencies based on deficits
        const updatedGrid = grid.map(block => {
            if (block.type === 'empty') return block;

            let mod = 0;
            if (powerDeficit > 0) mod -= 20;
            if (waterDeficit > 0) mod -= 20;
            if (dataDeficit > 0) mod -= 10;

            // adjacency bonus/malus roughly
            const neighbors = grid.filter(n => Math.abs(n.x - block.x) <= 1 && Math.abs(n.z - block.z) <= 1 && n.id !== block.id);
            const hasIndustrialNeighbor = neighbors.some(n => n.type === 'industrial');

            if (block.type === 'residential' && hasIndustrialNeighbor) mod -= 15; // Pollution
            if (block.type === 'commercial' && neighbors.some(n => n.type === 'residential')) mod += 10; // Customers

            const newEff = Math.max(0, Math.min(100, block.efficiency + mod + 5)); // Natural recovery +5
            return { ...block, efficiency: newEff };
        });

        setGrid(updatedGrid);

        // Update Global Approval
        const avgEfficiency = updatedGrid.filter(b => b.type !== 'empty').reduce((sum, b) => sum + b.efficiency, 0) / Math.max(1, updatedGrid.filter(b => b.type !== 'empty').length);

        if (powerDeficit > 0 || waterDeficit > 0) newApproval -= 15;
        else if (avgEfficiency > 80) newApproval += 5;
        else newApproval -= 2;

        newApproval = Math.max(0, Math.min(100, newApproval));
        setApproval(newApproval);

        // Apply Resources (simple carry over logic for this mini-game)
        setResources({
            power: Math.max(0, resources.power + powerProd - powerCons),
            water: Math.max(0, resources.water + waterProd - waterCons),
            data: Math.max(0, resources.data + dataProd - dataCons),
            budget: newBudget
        });

        // Score calc
        const turnScore = (avgEfficiency * 10) + (newApproval * 20);
        setScore(s => s + Math.floor(turnScore));

        // Check Win/Loss
        if (newApproval <= 20) {
            endGame(false);
        } else if (turn >= MAX_TURNS) {
            endGame(true);
        } else {
            setTurn(t => t + 1);
        }
    };

    const handleBlockInteraction = (id: string) => {
        if (gameState !== 'PLAYING' || !activeTool) return;

        const blockIndex = grid.findIndex(b => b.id === id);
        if (blockIndex === -1) return;

        const block = grid[blockIndex];
        const newGrid = [...grid];

        if (activeTool === 'upgrade') {
            if (block.type === 'empty' || block.level >= 3) return;
            const cost = block.level * 200;
            if (resources.budget >= cost) {
                audio.playTyping();
                setResources(r => ({ ...r, budget: r.budget - cost }));
                newGrid[blockIndex] = { ...block, level: block.level + 1 };
                setGrid(newGrid);
            } else {
                audio.playError();
            }
        } else {
            // Zoning new area
            if (block.type !== 'empty') return;
            const cost = 100;
            if (resources.budget >= cost) {
                audio.playTyping();
                setResources(r => ({ ...r, budget: r.budget - cost }));
                newGrid[blockIndex] = { ...block, type: activeTool, level: 1, efficiency: 100 };
                setGrid(newGrid);
                setActiveTool(null); // Auto deselect after building
            } else {
                audio.playError();
            }
        }
    };

    const endGame = (win: boolean) => {
        setGameState(win ? 'SUCCESS' : 'FAILED');
        const finalScore = win ? score + (approval * 50) + Math.floor(resources.budget / 10) : score;
        setScore(finalScore);
        setTimeout(() => onComplete(win ? Math.max(500, finalScore) : 100, { approval, finalBudget: resources.budget }), 3000);
    };

    return (
        <div className="relative w-full h-[700px] rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 font-sans select-none shadow-[0_0_60px_rgba(0,0,0,0.5)]">

            {/* 3D Canvas */}
            <div className={`absolute inset-0 z-0 ${activeTool ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}>
                <Canvas camera={{ position: [8, 8, 8], fov: 45 }}>
                    <ambientLight intensity={0.6} color="#ffffff" />
                    <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]}>
                        <orthographicCamera attach="shadow-camera" args={[-10, 10, 10, -10]} />
                    </directionalLight>
                    <pointLight position={[-10, 5, -10]} intensity={0.5} color="#3b82f6" />
                    <fog attach="fog" args={['#09090b', 10, 30]} />

                    {/* Ground Plane */}
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
                        <planeGeometry args={[20, 20]} />
                        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.8} />
                    </mesh>

                    {/* Grid Lines */}
                    <gridHelper args={[GRID_SIZE, GRID_SIZE, '#1e293b', '#1e293b']} position={[0, -0.49, 0]} />

                    {gameState !== 'IDLE' && grid.map(block => (
                        <Building key={block.id} block={block} onUpgrade={handleBlockInteraction} />
                    ))}

                    <OrbitControls
                        enableZoom={true}
                        enablePan={false}
                        maxPolarAngle={Math.PI / 2 - 0.1}
                        minDistance={5}
                        maxDistance={20}
                    />

                    <EffectComposer>
                        <Bloom luminanceThreshold={0.5} mipmapBlur intensity={1.5} />
                        <Vignette darkness={0.8} offset={0.1} />
                    </EffectComposer>
                </Canvas>
            </div>

            {/* UI Layer */}
            {gameState !== 'IDLE' && (
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between p-6 z-10">

                    {/* Top HUD - City Stats */}
                    <div className="flex justify-between items-start gap-4">

                        {/* Global Metrics */}
                        <div className="bg-black/80 backdrop-blur-xl rounded-2xl p-4 border border-zinc-700 shadow-2xl pointer-events-auto flex gap-6">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-1">Approval</span>
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className={`w-5 h-5 ${approval > 50 ? 'text-emerald-500' : 'text-red-500'}`} />
                                    <span className={`text-2xl font-mono font-bold ${approval > 50 ? 'text-white' : 'text-red-500'}`}>{Math.floor(approval)}%</span>
                                </div>
                            </div>
                            <div className="w-px h-10 bg-zinc-800" />
                            <div className="flex flex-col">
                                <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-1">Budget</span>
                                <span className="text-2xl font-mono font-bold text-emerald-400">${resources.budget.toLocaleString()}</span>
                            </div>
                            <div className="w-px h-10 bg-zinc-800" />
                            <div className="flex flex-col">
                                <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-1">Turn</span>
                                <span className="text-2xl font-mono font-bold text-white">{turn}<span className="text-zinc-500 text-sm">/{MAX_TURNS}</span></span>
                            </div>
                        </div>

                        {/* End Turn & Score */}
                        <div className="flex flex-col gap-2 items-end pointer-events-auto">
                            <div className="bg-black/60 backdrop-blur-md rounded-xl p-3 border border-zinc-800 flex flex-col items-end min-w-[120px]">
                                <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-1">City Rating (Score)</span>
                                <span className="text-xl text-white font-mono">{score.toLocaleString()}</span>
                            </div>
                            <button
                                onClick={endTurn}
                                className="bg-white text-black font-black uppercase tracking-widest py-3 px-6 rounded-xl hover:bg-zinc-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                            >
                                Finish Turn
                            </button>
                        </div>
                    </div>

                    {/* Right Side - Resources */}
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 pointer-events-auto">
                        <div className="bg-black/80 backdrop-blur-xl rounded-xl p-3 border border-zinc-700 flex items-center gap-4">
                            <Zap className="w-5 h-5 text-yellow-400" />
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Power</span>
                                <span className={`text-lg font-mono font-bold ${resources.power < 20 ? 'text-red-500' : 'text-white'}`}>{resources.power}w</span>
                            </div>
                        </div>
                        <div className="bg-black/80 backdrop-blur-xl rounded-xl p-3 border border-zinc-700 flex items-center gap-4">
                            <Droplets className="w-5 h-5 text-cyan-400" />
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Water</span>
                                <span className={`text-lg font-mono font-bold ${resources.water < 20 ? 'text-red-500' : 'text-white'}`}>{resources.water}L</span>
                            </div>
                        </div>
                        <div className="bg-black/80 backdrop-blur-xl rounded-xl p-3 border border-zinc-700 flex items-center gap-4">
                            <Wifi className="w-5 h-5 text-purple-400" />
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Data</span>
                                <span className={`text-lg font-mono font-bold ${resources.data < 20 ? 'text-red-500' : 'text-white'}`}>{resources.data}Tb</span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Toolbar - Build Tools */}
                    <div className="w-full flex justify-center pointer-events-auto">
                        <div className="bg-black/80 backdrop-blur-xl rounded-2xl p-2 border border-zinc-700 shadow-2xl flex gap-2">
                            {[
                                { id: 'residential', label: 'Res', color: ZONE_COLORS.residential, cost: 100 },
                                { id: 'commercial', label: 'Com', color: ZONE_COLORS.commercial, cost: 100 },
                                { id: 'industrial', label: 'Ind', color: ZONE_COLORS.industrial, cost: 100 },
                                { id: 'power', label: 'Pwr', color: ZONE_COLORS.power, cost: 100 },
                                { id: 'water', label: 'Wtr', color: ZONE_COLORS.water, cost: 100 },
                                { id: 'data', label: 'Dat', color: ZONE_COLORS.data, cost: 100 },
                            ].map(tool => (
                                <button
                                    key={tool.id}
                                    onClick={() => setActiveTool(tool.id as ZoneType)}
                                    className={`relative flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all ${activeTool === tool.id ? 'ring-2 ring-white scale-105 z-10' : 'hover:bg-white/5 opacity-80 hover:opacity-100'}`}
                                    style={{ backgroundColor: activeTool === tool.id ? `${tool.color}40` : 'transparent' }}
                                >
                                    <div className="w-4 h-4 rounded mb-1" style={{ backgroundColor: tool.color }} />
                                    <span className="text-[10px] text-white font-bold uppercase tracking-wider">{tool.label}</span>
                                    <span className="text-[8px] text-zinc-400 mt-0.5">${tool.cost}</span>
                                </button>
                            ))}
                            <div className="w-px bg-zinc-700 mx-2" />
                            <button
                                onClick={() => setActiveTool('upgrade')}
                                className={`relative flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all ${activeTool === 'upgrade' ? 'ring-2 ring-white scale-105 z-10 bg-white/10' : 'hover:bg-white/5 opacity-80 hover:opacity-100'}`}
                            >
                                <TrendingUp className="w-5 h-5 text-white mb-1" />
                                <span className="text-[10px] text-white font-bold uppercase tracking-wider">UPG</span>
                                <span className="text-[8px] text-zinc-400 mt-0.5">$200+</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hint Overlay for Active Tool */}
            {gameState === 'PLAYING' && activeTool && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur text-white px-4 py-2 rounded-full border border-zinc-700 text-sm font-bold tracking-widest uppercase animate-pulse pointer-events-none z-20">
                    Select a block to {activeTool === 'upgrade' ? 'upgrade' : `zone as ${activeTool}`}
                </div>
            )}

            {/* Start/End Screen Overlays */}
            <AnimatePresence>
                {gameState === 'IDLE' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/90 p-8 text-center backdrop-blur-xl">
                        <div className="max-w-md border border-zinc-800 p-10 rounded-3xl bg-black shadow-2xl">
                            <Building2 className="w-16 h-16 text-blue-500 mx-auto mb-6" />
                            <h2 className="text-3xl font-black text-white mb-4 tracking-widest uppercase">Smart City Mayor</h2>
                            <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                                Establish a thriving AI-managed metropolis.<br /><br />
                                <span className="text-white font-bold">Zone</span> residential, commercial, and industrial areas.<br />
                                <span className="text-white font-bold">Provide</span> Power, Water, and Data infrastructure.<br />
                                <span className="text-white font-bold">Manage</span> budget and city approval ratings before your term ends.
                            </p>
                            <button onClick={startGame} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest rounded-xl transition-colors shadow-lg shadow-blue-500/20">
                                Enter Office
                            </button>
                        </div>
                    </motion.div>
                )}

                {gameState === 'SUCCESS' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-blue-950/90 backdrop-blur-xl">
                        <ShieldCheck className="w-24 h-24 text-blue-400 mb-6 drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]" />
                        <h2 className="text-5xl font-black text-white mb-4 tracking-widest uppercase">Term Completed</h2>
                        <p className="text-blue-200 text-xl font-sans mb-8">The city flourishes under your algorithms.</p>
                        <div className="text-white text-3xl font-bold font-mono bg-black/50 px-8 py-4 rounded-xl border border-zinc-700 flex flex-col items-center gap-2">
                            <span>Final Score: {score}</span>
                            <span className="text-sm text-zinc-400 font-sans tracking-widest uppercase">Approval: {Math.floor(approval)}%</span>
                        </div>
                    </motion.div>
                )}

                {gameState === 'FAILED' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-950/90 backdrop-blur-xl border-8 border-red-600">
                        <TrendingDown className="w-24 h-24 text-red-500 mb-6" />
                        <h2 className="text-6xl font-black text-white mb-4 tracking-widest uppercase text-center">Recalled</h2>
                        <p className="text-red-200 text-xl font-mono mb-8 opacity-90 uppercase tracking-widest">Approval rating dropped too low. City in chaos.</p>
                        <div className="text-white text-3xl font-bold font-mono bg-black/50 px-8 py-4 rounded-xl border border-red-900">
                            Final Score: {score}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};
