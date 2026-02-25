import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, MeshDistortMaterial, Float, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch, Vignette } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Activity, Shield, Zap, AlertTriangle, Flame, Target, Trophy, SkullIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../../services/audioService';
import { useDialogue } from '../../contexts/DialogueContext';

export interface DeepfakeDetectiveProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

// --- 3D Target Node ---
const TargetNode = ({ position, color, scale, onClick, id }: {
    position: [number, number, number]; color: string; scale: number; onClick: (id: string) => void; id: string;
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.elapsedTime * 2;
            meshRef.current.rotation.z = state.clock.elapsedTime * 1.5;
            const pulse = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.12;
            meshRef.current.scale.setScalar(scale * pulse * (hovered ? 1.3 : 1));
        }
    });
    return (
        <Float speed={3} rotationIntensity={2} floatIntensity={2}>
            <mesh ref={meshRef} position={position}
                onClick={(e) => { e.stopPropagation(); onClick(id); }}
                onPointerOver={() => { setHovered(true); document.body.style.cursor = 'crosshair'; }}
                onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}>
                <icosahedronGeometry args={[0.5, 1]} />
                <MeshDistortMaterial color={color} emissive={color} emissiveIntensity={hovered ? 5 : 3}
                    clearcoat={1} metalness={0.9} roughness={0} distort={hovered ? 0.6 : 0.25} speed={hovered ? 8 : 4} />
                <pointLight distance={5} intensity={3} color={color} />
            </mesh>
        </Float>
    );
};

// --- 3D Hazard Node ---
const HazardNode = ({ position, onClick, id }: {
    position: [number, number, number]; onClick: (id: string) => void; id: string;
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.elapsedTime * 5;
            meshRef.current.rotation.y = state.clock.elapsedTime * 3;
            const s = 0.7 + Math.sin(state.clock.elapsedTime * 10) * 0.15;
            meshRef.current.scale.setScalar(s);
        }
    });
    return (
        <mesh ref={meshRef} position={position}
            onClick={(e) => { e.stopPropagation(); onClick(id); }}
            onPointerOver={() => { document.body.style.cursor = 'not-allowed'; }}
            onPointerOut={() => { document.body.style.cursor = 'default'; }}>
            <octahedronGeometry args={[0.45]} />
            <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={4}
                wireframe transparent opacity={0.85} roughness={0.3} metalness={0.8} />
            <pointLight distance={4} intensity={2.5} color="#ff0000" />
        </mesh>
    );
};

// --- Camera Rig ---
const CameraRig = ({ intensity }: { intensity: number }) => {
    useFrame((state) => {
        const t = state.clock.elapsedTime;
        const shake = intensity > 0.5 ? (Math.random() - 0.5) * intensity * 0.3 : 0;
        state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, Math.sin(t * 0.2) * 2 + shake, 0.05);
        state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, Math.cos(t * 0.15) * 1.5 + shake, 0.05);
        state.camera.lookAt(0, 0, 0);
    });
    return null;
};

// --- Types ---
interface GameNode { id: string; position: [number, number, number]; type: 'target' | 'hazard'; color: string; spawnedAt: number; lifetime: number; }

const TARGET_COLORS = ['#ff00ff', '#8800ff', '#ff44ff', '#ffffff'];
const genPos = (): [number, number, number] => [(Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6];

// --- Main Component ---
export const DeepfakeDetective: React.FC<DeepfakeDetectiveProps> = ({ onComplete, difficulty, t }) => {
    const { queueDialogue } = useDialogue();
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(45);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');
    const [combo, setCombo] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [nodes, setNodes] = useState<GameNode[]>([]);
    const [glitchActive, setGlitchActive] = useState(false);
    const [screenFlash, setScreenFlash] = useState<string | null>(null);
    const [advisorMsg, setAdvisorMsg] = useState(t('game.advisor.adversary_breach'));
    const [adversaryMsg, setAdversaryMsg] = useState(t('game.adversary.same_look'));

    const diffMul = difficulty === 'HARD' ? 1.5 : difficulty === 'MEDIUM' ? 1.2 : 1;
    const spawnInterval = Math.max(400, 1200 - (score / 100) * 80);
    const hazardChance = Math.min(0.4, 0.15 + (score / 2000));

    // Narrative: Mission Briefing
    useEffect(() => {
        queueDialogue([
            { id: `deepfakedetective-brief-${Date.now()}`, character: 'BYTE', text: t('game.instructions.click_targets') },
            { id: `deepfakedetective-brief2-${Date.now()}`, character: 'SYNTAX', text: t('game.instructions.avoid_hazards'), isGlitchy: true },
        ]);
    }, [queueDialogue, t]);

    // Node spawner
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const interval = setInterval(() => {
            setNodes(prev => {
                const now = Date.now();
                const active = prev.filter(n => now - n.spawnedAt < n.lifetime);
                if (active.length >= 6) return active;
                const isHazard = Math.random() < hazardChance;
                return [...active, {
                    id: `${Date.now()}-${Math.random()}`, position: genPos(),
                    type: isHazard ? 'hazard' : 'target',
                    color: TARGET_COLORS[Math.floor(Math.random() * TARGET_COLORS.length)],
                    spawnedAt: now, lifetime: Math.max(1500, 3000 - (score / 200) * 500),
                }];
            });
        }, spawnInterval);
        return () => clearInterval(interval);
    }, [gameState, spawnInterval, hazardChance, score]);

    // Agent chatter
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const aLines = [t('game.advisor.adversary_breach'), t('game.advisor.reflexes_exceed'), t('game.advisor.target_rate_optimal'), `${t('game.hud.combo_chain')}: ${combo}x`];
        const eLines = [t('game.adversary.same_look'), t('game.adversary.predictable'), t('game.adversary.dare_click'), `${combo}x ${t('game.hud.combo')}...`];
        const iv = setInterval(() => {
            if (Math.random() > 0.6) { setAdversaryMsg(eLines[Math.floor(Math.random() * eLines.length)]); audio.playSystemMessage?.({ type: 'warning' }); }
            else { setAdvisorMsg(aLines[Math.floor(Math.random() * aLines.length)]); audio.playSystemMessage?.({ type: 'success' }); }
        }, 5000);
        return () => clearInterval(iv);
    }, [gameState, combo, t]);

    // Timer
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    const fs = score >= 500 ? 'SUCCESS' : 'FAILED';
                    setGameState(fs);
                    if (fs === 'SUCCESS') {
                        audio.playSuccess(); queueDialogue([
                            { id: `deepfakedetective-win-${Date.now()}`, character: 'SYNTAX', text: `${t('game.hud.final_score')}: ${score}. ${t('game.hud.max_combo')}: ${maxCombo}x.` },
                            { id: `deepfakedetective-win2-${Date.now()}`, character: 'ATHENA', text: t('game.state.system_secured') },
                        ]);
                    } else {
                        audio.playError(); queueDialogue([
                            { id: `deepfakedetective-fail-${Date.now()}`, character: 'BYTE', text: t('game.state.breach_detected'), isGlitchy: true },
                        ]);
                    }
                    onComplete(score, { completionTime: 45 - prev, difficulty, maxCombo });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, score, onComplete, difficulty, maxCombo, queueDialogue, t]);

    const handleTargetClick = useCallback((id: string) => {
        if (gameState !== 'PLAYING') return;
        setNodes(prev => prev.filter(n => n.id !== id));
        audio.playClick();
        const nc = combo + 1; setCombo(nc); setMaxCombo(c => Math.max(c, nc));
        setScore(s => s + Math.floor(50 * Math.min(nc, 10) * diffMul));
        setScreenFlash('#ff00ff'); setTimeout(() => setScreenFlash(null), 80);
    }, [gameState, combo, diffMul]);

    const handleHazardClick = useCallback((id: string) => {
        if (gameState !== 'PLAYING') return;
        setNodes(prev => prev.filter(n => n.id !== id));
        audio.playError(); setCombo(0); setScore(s => Math.max(0, s - 200));
        setGlitchActive(true); setScreenFlash('#ff0000');
        setTimeout(() => { setGlitchActive(false); setScreenFlash(null); }, 400);
    }, [gameState]);

    return (
        <div className="relative w-full h-[600px] rounded-xl overflow-hidden border border-white/10 bg-black shadow-2xl">
            <AnimatePresence>{screenFlash && (<motion.div initial={{ opacity: 0.6 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0 z-30 pointer-events-none" style={{ backgroundColor: screenFlash }} />)}</AnimatePresence>

            {/* HUD */}
            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 pointer-events-none">
                <div className="flex flex-col gap-3">
                    <div className="bg-black/60 backdrop-blur-md rounded-lg p-3 border border-white/20">
                        <div className="flex items-center gap-2 text-emerald-400 mb-1"><Activity className="w-4 h-4" /><span className="text-xs uppercase tracking-widest font-bold">{t('game.hud.score')}</span></div>
                        <div className="text-3xl font-mono font-black text-white tabular-nums">{score}</div>
                    </div>
                    <AnimatePresence>{combo > 1 && (<motion.div initial={{ scale: 0, x: -50 }} animate={{ scale: 1, x: 0 }} exit={{ scale: 0 }} className="bg-black/60 backdrop-blur-md rounded-lg p-3 border border-orange-500/50">
                        <div className="flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500 animate-pulse" /><span className="text-orange-400 font-black text-2xl italic">{combo}x</span></div>
                        <div className="text-[10px] text-orange-300/60 uppercase tracking-widest mt-1">{t('game.hud.combo_chain')}</div>
                    </motion.div>)}</AnimatePresence>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <div className="bg-black/60 backdrop-blur-md rounded-lg p-3 border border-blue-500/40">
                        <div className="flex items-center gap-2 text-blue-400 mb-1"><AlertTriangle className="w-4 h-4" /><span className="text-xs uppercase tracking-widest font-bold">{t('game.hud.time')}</span></div>
                        <div className={`text-3xl font-mono font-black tabular-nums ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timeLeft}s</div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${difficulty === 'HARD' ? 'border-red-500 text-red-400 bg-red-500/10' : difficulty === 'MEDIUM' ? 'border-yellow-500 text-yellow-400 bg-yellow-500/10' : 'border-green-500 text-green-400 bg-green-500/10'}`}>{t(`game.difficulty.${difficulty.toLowerCase()}`)}</div>
                </div>
            </div>

            {/* Instructions */}
            {timeLeft > 40 && gameState === 'PLAYING' && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none text-center">
                    <div className="bg-black/80 backdrop-blur-xl p-6 rounded-2xl border border-cyan-500/30">
                        <div className="text-cyan-400 font-black text-xl uppercase tracking-widest mb-2"><Target className="inline w-6 h-6 mr-2" /> {t('game.instructions.click_targets')}</div>
                        <div className="text-red-400 font-bold text-sm"><SkullIcon className="inline w-4 h-4 mr-1" /> {t('game.instructions.avoid_hazards')}</div>
                    </div>
                </motion.div>
            )}

            {/* Agent Panel */}
            <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row gap-2 sm:gap-3 z-10 pointer-events-none">
                <div className="flex-1 bg-black/70 backdrop-blur-xl rounded-lg p-3 border-l-4 border-indigo-500">
                    <div className="text-[10px] text-indigo-400 mb-1 uppercase tracking-widest font-bold flex items-center gap-1"><Shield className="w-3 h-3" /> {t('game.advisor.label')}</div>
                    <div className="text-xs text-indigo-100 font-mono leading-relaxed">{advisorMsg}</div>
                </div>
                <div className="flex-1 bg-black/70 backdrop-blur-xl rounded-lg p-3 border-l-4 border-red-500">
                    <div className="text-[10px] text-red-500 mb-1 uppercase tracking-widest font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> {t('game.adversary.label')}</div>
                    <div className="text-xs text-red-100 font-mono leading-relaxed">{adversaryMsg}</div>
                </div>
            </div>

            {/* Game Over */}
            <AnimatePresence>{gameState !== 'PLAYING' && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-20 flex items-center justify-center p-4 sm:p-0 bg-black/90 backdrop-blur-md">
                    <div className="text-center p-6 sm:p-10 w-full sm:w-auto rounded-2xl border border-white/10 bg-black/50 shadow-2xl max-w-[90vw] sm:max-w-md">
                        <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${gameState === 'SUCCESS' ? 'bg-cyan-500/20 border border-cyan-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
                            {gameState === 'SUCCESS' ? <Trophy className="w-10 h-10 text-cyan-400" /> : <SkullIcon className="w-10 h-10 text-red-400" />}
                        </div>
                        <div className={`text-3xl sm:text-5xl font-black uppercase tracking-widest mb-4 ${gameState === 'SUCCESS' ? 'text-cyan-400' : 'text-red-500'} drop-shadow-[0_0_15px_currentColor]`}>
                            {gameState === 'SUCCESS' ? t('game.state.system_secured') : t('game.state.breach_detected')}
                        </div>
                        <div className="text-2xl text-white/80 font-mono mb-2">{t('game.hud.final_score')}: {score}</div>
                        <div className="text-sm text-orange-400 font-bold mb-6">{t('game.hud.max_combo')}: {maxCombo}x</div>
                    </div>
                </motion.div>
            )}</AnimatePresence>

            {/* 3D Canvas */}
            <div className="absolute inset-0 z-0 cursor-crosshair">
                <Canvas camera={{ position: [0, 0, 12], fov: 60 }} gl={{ antialias: false, powerPreference: "high-performance" }}>
                    <color attach="background" args={['#080008']} />
                    <fog attach="fog" args={['#080008', 8, 25]} />
                    <ambientLight intensity={0.3} />
                    <pointLight position={[10, 10, 10]} intensity={2} color="#ff00ff" />
                    <pointLight position={[-10, -10, -10]} intensity={1} color="#8800ff" />
                    <CameraRig intensity={combo / 10} />
                    {nodes.map(node => node.type === 'target' ? (
                        <TargetNode key={node.id} id={node.id} position={node.position} color={node.color} scale={1} onClick={handleTargetClick} />
                    ) : (
                        <HazardNode key={node.id} id={node.id} position={node.position} onClick={handleHazardClick} />
                    ))}
                    <Sparkles count={300} scale={20} size={3} speed={0.5 + combo * 0.2} opacity={0.5} color="#ff00ff" />
                    <Sparkles count={100} scale={15} size={6} speed={1} opacity={0.3} color="#8800ff" />
                    <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5 + combo * 0.1} />
                    <EffectComposer >
                        <Bloom luminanceThreshold={0.15} mipmapBlur intensity={1.5 + combo * 0.15} />
                        <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.002 + combo * 0.001, 0.002 + combo * 0.001)} />
                        <Vignette eskil={false} offset={0.1} darkness={1.1} />
                        {glitchActive && (<Glitch delay={new THREE.Vector2(0, 0)} duration={new THREE.Vector2(0.1, 0.4)} mode={GlitchMode.SPORADIC} active ratio={0.8} />)}
                    </EffectComposer>
                </Canvas>
            </div>
        </div>
    );
};
