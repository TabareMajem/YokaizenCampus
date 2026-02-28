import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Text, Sparkles, MeshTransmissionMaterial, Html } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette, Glitch } from '@react-three/postprocessing';
import { BlendFunction, GlitchMode } from 'postprocessing';
import * as THREE from 'three';
import { Activity, Shield, Zap, Target, AlertTriangle, Cpu } from 'lucide-react';
import { audio } from '../../services/audioService';
import { motion, AnimatePresence } from 'framer-motion';

export interface BanditBistroProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

// Represents a floating score popup
const FloatingScore = ({ position, score, color, onComplete }: any) => {
    const ref = useRef<THREE.Group>(null);
    const [opacity, setOpacity] = useState(1);

    useFrame((_, delta) => {
        if (ref.current) {
            ref.current.position.y += delta * 1.5;
            setOpacity((o) => Math.max(0, o - delta * 1.5));
            if (opacity <= 0) onComplete();
        }
    });

    return (
        <group ref={ref} position={position}>
            <Text
                fontSize={0.6}
                color={color}
                anchorX="center"
                anchorY="middle"
                fillOpacity={opacity}
                outlineWidth={0.04}
                outlineColor="#000"
                outlineOpacity={opacity}
            >
                +{score}
            </Text>
        </group>
    );
};

// Represents a Ramen Vending Node (Bandit Arm)
const VendingNode = ({ position, color, isActive, onClick, name }: any) => {
    const groupRef = useRef<THREE.Group>(null);
    const ringRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.15;
            groupRef.current.rotation.y += 0.005;
        }
        if (ringRef.current) {
            ringRef.current.rotation.x = Math.PI / 2;
            ringRef.current.rotation.z -= 0.02;
            const targetScale = hovered ? 1.2 : 1.0;
            ringRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
        }
    });

    return (
        <group ref={groupRef} position={position}>
            <Float speed={2} floatIntensity={0.5}>
                {/* Holographic Bowl */}
                <mesh
                    onClick={(e) => { e.stopPropagation(); onClick(); }}
                    onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
                    onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
                >
                    <cylinderGeometry args={[1.2, 0.7, 1.4, 32]} />
                    <MeshTransmissionMaterial
                        color={color}
                        transparent
                        opacity={0.8}
                        metalness={0.6}
                        roughness={0.1}
                        transmission={0.9}
                        thickness={1.5}
                        envMapIntensity={2}
                    />
                </mesh>

                {/* Neon Noodles / Data Swirl inside */}
                <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.7, 0.15, 16, 32]} />
                    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 3 : 0.8} wireframe />
                </mesh>

                {/* Chopsticks / Antennae */}
                <mesh position={[0.5, 0.8, -0.5]} rotation={[0, 0, -Math.PI / 6]}>
                    <cylinderGeometry args={[0.05, 0.02, 2, 8]} />
                    <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
                </mesh>
                <mesh position={[0.7, 0.7, -0.4]} rotation={[0, 0, -Math.PI / 5]}>
                    <cylinderGeometry args={[0.05, 0.02, 2, 8]} />
                    <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
                </mesh>
            </Float>

            {/* Base Scanning Ring */}
            <mesh ref={ringRef} position={[0, -1.2, 0]}>
                <ringGeometry args={[1.4, 1.6, 32]} />
                <meshBasicMaterial color={color} transparent opacity={hovered ? 0.8 : 0.2} side={THREE.DoubleSide} />
            </mesh>

            <Html position={[0, -2.2, 0]} center>
                <div
                    className={`px-4 py-1 bg-black/80 backdrop-blur-md rounded border font-mono text-xs uppercase tracking-widest text-white transition-all duration-300 ${hovered ? 'scale-110 shadow-lg' : 'scale-100'}`}
                    style={{ borderColor: color, boxShadow: hovered ? `0 0 15px ${color}40` : 'none' }}
                >
                    {name}
                </div>
            </Html>
        </group>
    );
};

// Background Environment
const CyberpunkEnvironment = () => {
    const gridRef = useRef<THREE.GridHelper>(null);
    useFrame((state) => {
        if (gridRef.current) {
            gridRef.current.position.z = (state.clock.elapsedTime * 2) % 2;
        }
    });

    return (
        <group>
            <gridHelper ref={gridRef} args={[50, 50, '#ff6600', '#ff6600']} position={[0, -3, 0]} material-opacity={0.15} material-transparent />
            <Sparkles count={300} scale={20} size={3} speed={0.2} opacity={0.3} color="#00ff9d" />
            <fog attach="fog" args={['#050510', 10, 30]} />
        </group>
    );
};

export const BanditBistro: React.FC<BanditBistroProps> = ({ onComplete, difficulty, t }) => {
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');

    // Multi-Agent Flow Logic State
    const [advisorMsg, setAdvisorMsg] = useState('Welcome to the Bistro. Maximize your reward yields.');
    const [adversaryMsg, setAdversaryMsg] = useState('Monitoring resource distribution.');
    const [glitchActive, setGlitchActive] = useState(false);

    // Active nodes and score popups
    const [activeDispenser, setActiveDispenser] = useState<number | null>(null);
    const [scorePopups, setScorePopups] = useState<any[]>([]);

    // Bandit Arms Configurations (Hidden Probabilities & Rewards)
    const dispensers = useMemo(() => [
        { id: 0, name: 'Spicy Kernel', color: '#ff0066', mean: 60, variance: 40, pos: [-4, 0, 0] },
        { id: 1, name: 'Neon Miso', color: '#ff6600', mean: 50, variance: 10, pos: [0, 0, 0] },
        { id: 2, name: 'Quantum Shoyu', color: '#00ff9d', mean: 40, variance: 80, pos: [4, 0, 0] }
    ], []);

    // Multi-Agent Simulation Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        const advisorLines = [
            'Analyze the variance. Neon Miso is stable.',
            'Spicy Kernel shows high standard deviation.',
            'Quantum Shoyu yields are unpredictable. Exercise caution.',
            'Optimal policy converging. Keep sampling.'
        ];

        const adversaryLines = [
            'You are falling for the multi-armed trap.',
            'Exploitation over exploration? Foolish.',
            'I am shifting the probability distributions.',
            'Your reward function is misaligned.'
        ];

        const agentInterval = setInterval(() => {
            const isAdversary = Math.random() > 0.6;
            if (isAdversary) {
                setAdversaryMsg(adversaryLines[Math.floor(Math.random() * adversaryLines.length)]);
                audio.playSystemMessage({ type: 'warning' });
                setGlitchActive(true);
                setTimeout(() => setGlitchActive(false), 400);
            } else {
                setAdvisorMsg(advisorLines[Math.floor(Math.random() * advisorLines.length)]);
                audio.playSystemMessage({ type: 'success' });
            }
        }, 6000);

        return () => clearInterval(agentInterval);
    }, [gameState]);

    // Timer Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    const finalScore = score >= 800 ? score : 0;
                    setGameState(finalScore >= 800 ? 'SUCCESS' : 'FAILED');
                    onComplete(finalScore, { completionTime: 60 - prev, difficulty });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, score, onComplete, difficulty]);

    const handleInteract = useCallback((dispenserIndex: number) => {
        if (gameState !== 'PLAYING') return;

        audio.playTyping();
        setActiveDispenser(dispenserIndex);

        const dispenser = dispensers[dispenserIndex];
        // Calculate reward based on mean and variance
        const reward = Math.max(10, Math.floor(dispenser.mean + (Math.random() * dispenser.variance * 2 - dispenser.variance)));

        setScore(s => s + reward);

        // Add floating score
        setScorePopups(prev => [
            ...prev,
            { id: Date.now() + Math.random(), reward, position: [dispenser.pos[0], dispenser.pos[1] + 2, dispenser.pos[2]], color: dispenser.color }
        ]);

        setTimeout(() => setActiveDispenser(null), 200);

        // Win condition
        if (score + reward >= 1500) {
            setGameState('SUCCESS');
            onComplete(1500, { completionTime: 60 - timeLeft, difficulty });
        }
    }, [gameState, dispensers, score, timeLeft, onComplete, difficulty]);

    return (
        <div className="relative w-full h-[600px] rounded-xl overflow-hidden border border-[#ff6600]/30 bg-[#050510] shadow-2xl font-mono">
            {/* UI Overlay */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
                <div className="flex flex-col gap-4">
                    <div className="bg-black/60 backdrop-blur-md rounded-lg p-3 border border-[#00ff9d]/40 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#00ff9d]/10 to-transparent opacity-50" />
                        <div className="flex items-center gap-2 text-[#00ff9d] mb-1">
                            <Target className="w-4 h-4" />
                            <span className="text-[10px] uppercase tracking-widest font-bold">Yield Scored</span>
                        </div>
                        <div className="text-3xl font-black text-white relative z-10">{score} <span className="text-[#00ff9d]/50 text-sm">/ 1500</span></div>
                    </div>
                </div>

                <div className="bg-black/60 backdrop-blur-md rounded-lg p-3 border border-[#ff0066]/40 flex flex-col items-end">
                    <div className="flex items-center gap-2 text-[#ff0066] mb-1">
                        <Activity className="w-4 h-4" />
                        <span className="text-[10px] uppercase tracking-widest font-bold">Cycle Time</span>
                    </div>
                    <div className="text-3xl font-black text-white tracking-widest">{timeLeft}s</div>
                </div>
            </div>

            {/* Central Target Status */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none text-center">
                <div className="inline-block bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-[#ff6600]/40 text-[#ff6600] text-xs uppercase tracking-widest font-bold">
                    Bandit Bistro Active
                </div>
            </div>

            {/* Multi-Agent Comm Panel */}
            <div className="absolute bottom-6 left-6 right-6 flex gap-4 z-10 pointer-events-none">
                <div className="flex-1 bg-black/70 backdrop-blur-md rounded-lg p-4 border-t-2 border-[#00ff9d]/50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#00ff9d] to-transparent opacity-50" />
                    <div className="text-[10px] text-[#00ff9d] mb-2 uppercase tracking-widest font-bold flex items-center gap-2">
                        <Cpu className="w-3 h-3" /> Optimization Agent
                    </div>
                    <div className="text-sm text-[#00ff9d]/90 font-mono tracking-wide mt-1">{advisorMsg}</div>
                </div>
                <div className="flex-1 bg-black/70 backdrop-blur-md rounded-lg p-4 border-t-2 border-[#ff0066]/50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#ff0066] to-transparent opacity-50" />
                    <div className="text-[10px] text-[#ff0066] mb-2 uppercase tracking-widest font-bold flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3" /> Entropy Daemon
                    </div>
                    <div className="text-sm text-[#ff0066]/90 font-mono tracking-wide mt-1">{adversaryMsg}</div>
                </div>
            </div>

            {/* Game Over States */}
            <AnimatePresence>
                {gameState !== 'PLAYING' && (
                    <motion.div
                        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                        animate={{ opacity: 1, backdropFilter: 'blur(10px)' }}
                        className="absolute inset-0 z-30 flex items-center justify-center bg-black/80"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-black/60 border border-white/10 p-12 rounded-2xl text-center relative overflow-hidden"
                        >
                            <div className={`absolute top-0 left-0 w-full h-1 ${gameState === 'SUCCESS' ? 'bg-[#00ff9d]' : 'bg-[#ff0066]'}`} />
                            <div className={`text-5xl font-black uppercase tracking-widest mb-4 ${gameState === 'SUCCESS' ? 'text-[#00ff9d]' : 'text-[#ff0066]'}`}>
                                {gameState === 'SUCCESS' ? 'YIELD MAXIMIZED' : 'BANKRUPT'}
                            </div>
                            <div className="text-xl text-white/80 font-mono tracking-widest border-t border-white/10 pt-4 mt-4">
                                FINAL YIELD: <span className="text-white font-bold">{score}</span>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3D WebGL Canvas */}
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 2, 10], fov: 60 }}>
                    <color attach="background" args={['#050510']} />
                    <ambientLight intensity={0.5} />
                    <pointLight position={[0, 5, 5]} intensity={2} color="#ffffff" />

                    <CyberpunkEnvironment />

                    {dispensers.map((dispenser, idx) => (
                        <VendingNode
                            key={dispenser.id}
                            position={dispenser.pos}
                            color={dispenser.color}
                            name={dispenser.name}
                            isActive={activeDispenser === idx}
                            onClick={() => handleInteract(idx)}
                        />
                    ))}

                    {/* Render score popups */}
                    {scorePopups.map(popup => (
                        <FloatingScore
                            key={popup.id}
                            position={popup.position}
                            score={popup.reward}
                            color={popup.color}
                            onComplete={() => setScorePopups(prev => prev.filter(p => p.id !== popup.id))}
                        />
                    ))}

                    <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2 + 0.1} minPolarAngle={Math.PI / 3} />

                    <EffectComposer disableNormalPass>
                        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={2.0} mipmapBlur />
                        <ChromaticAberration
                            blendFunction={BlendFunction.NORMAL}
                            offset={new THREE.Vector2(0.003, 0.003)}
                            radialModulation={false}
                            modulationOffset={0}
                        />
                        {glitchActive && (
                            <Glitch delay={new THREE.Vector2(0, 0)} duration={new THREE.Vector2(0.2, 0.4)} mode={GlitchMode.SPORADIC} active ratio={0.8} />
                        )}
                        <Noise opacity={0.03} />
                        <Vignette eskil={false} offset={0.1} darkness={1.2} />
                    </EffectComposer>
                </Canvas>
            </div>
        </div>
    );
};
