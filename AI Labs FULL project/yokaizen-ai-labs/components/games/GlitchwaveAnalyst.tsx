import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Icosahedron, MeshDistortMaterial, Float, Sparkles, Ring } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch, Vignette } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Activity, Shield, Zap, AlertTriangle, Flame, Trophy, SkullIcon, Waves } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../../services/audioService';
import { useDialogue } from '../../contexts/DialogueContext';

export interface GlitchwaveAnalystProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

// --- Glitchwave Ring that expands outward ---
const GlitchRing = ({ color, delay, speed }: { color: string; delay: number; speed: number }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [scale, setScale] = useState(0.1);

    useFrame((state, delta) => {
        const newScale = scale + delta * speed;
        setScale(newScale > 15 ? 0.1 : newScale);
        if (meshRef.current) {
            meshRef.current.scale.setScalar(newScale);
            meshRef.current.rotation.z += delta * 0.5;
            (meshRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - newScale / 15);
        }
    });

    return (
        <mesh ref={meshRef} rotation={[0, 0, delay]}>
            <ringGeometry args={[0.95, 1, 64]} />
            <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
    );
};

// --- Clickable Shield Node ---
const ShieldNode = ({ position, color, onClick, id, isCorrect }: {
    position: [number, number, number];
    color: string;
    onClick: (id: string, isCorrect: boolean) => void;
    id: string;
    isCorrect: boolean;
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y = state.clock.elapsedTime * 2;
            meshRef.current.rotation.x = state.clock.elapsedTime;
            const pulse = 1 + Math.sin(state.clock.elapsedTime * 8) * 0.1;
            meshRef.current.scale.setScalar(pulse * (hovered ? 1.4 : 1));
        }
    });

    return (
        <Float speed={3} rotationIntensity={1.5} floatIntensity={1.5}>
            <mesh
                ref={meshRef}
                position={position}
                onClick={(e) => { e.stopPropagation(); onClick(id, isCorrect); }}
                onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
                onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
            >
                <dodecahedronGeometry args={[0.6]} />
                <MeshDistortMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={hovered ? 5 : 2.5}
                    clearcoat={1}
                    metalness={0.9}
                    roughness={0}
                    distort={hovered ? 0.5 : 0.2}
                    speed={hovered ? 8 : 3}
                />
                <pointLight distance={4} intensity={3} color={color} />
            </mesh>
        </Float>
    );
};

// --- Central Core ---
const CoreEntity = ({ health }: { health: number }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const healthNormalized = health / 100;

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.elapsedTime * 0.3;
            meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
        }
    });

    return (
        <Float speed={2} floatIntensity={1} rotationIntensity={0.5}>
            <Icosahedron ref={meshRef} args={[1.2, 2]} scale={0.8 + healthNormalized * 0.4}>
                <MeshDistortMaterial
                    color={new THREE.Color().setHSL(healthNormalized * 0.3, 0.9, 0.5)}
                    emissive={new THREE.Color().setHSL(healthNormalized * 0.3, 1, 0.3)}
                    emissiveIntensity={3}
                    clearcoat={1}
                    metalness={0.9}
                    roughness={0}
                    distort={0.3 + (1 - healthNormalized) * 0.4}
                    speed={3 + (1 - healthNormalized) * 5}
                />
            </Icosahedron>
            <pointLight distance={8} intensity={4} color={new THREE.Color().setHSL(healthNormalized * 0.3, 1, 0.5)} />
        </Float>
    );
};

// --- Camera Rig ---
const CameraRig = ({ shakeIntensity }: { shakeIntensity: number }) => {
    useFrame((state) => {
        const t = state.clock.elapsedTime;
        const shake = shakeIntensity > 0 ? (Math.random() - 0.5) * shakeIntensity : 0;
        state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, Math.sin(t * 0.2) * 3 + shake, 0.05);
        state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, Math.cos(t * 0.15) * 2 + shake, 0.05);
        state.camera.lookAt(0, 0, 0);
    });
    return null;
};

// --- Types ---
interface WaveTarget {
    id: string;
    color: string;
    position: [number, number, number];
    isCorrect: boolean;
}

const WAVE_COLORS = ['#00ffff', '#ff00ff', '#ffaa00', '#00ff88', '#ff3366'];

const generateWave = (waveNumber: number): { targetColor: string; nodes: WaveTarget[] } => {
    const targetColor = WAVE_COLORS[waveNumber % WAVE_COLORS.length];
    const nodeCount = Math.min(4 + Math.floor(waveNumber / 2), 8);
    const correctCount = 1 + Math.floor(Math.random() * 2); // 1-2 correct per wave

    const nodes: WaveTarget[] = [];
    for (let i = 0; i < nodeCount; i++) {
        const isCorrect = i < correctCount;
        nodes.push({
            id: `${Date.now()}-${i}`,
            color: isCorrect ? targetColor : WAVE_COLORS[(waveNumber + i + 1) % WAVE_COLORS.length],
            position: [
                (Math.random() - 0.5) * 12,
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 4,
            ],
            isCorrect,
        });
    }

    // Shuffle
    for (let i = nodes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nodes[i], nodes[j]] = [nodes[j], nodes[i]];
    }

    return { targetColor, nodes };
};

// --- Main Component ---
export const GlitchwaveAnalyst: React.FC<GlitchwaveAnalystProps> = ({ onComplete, difficulty, t }) => {
    const { queueDialogue } = useDialogue();
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');
    const [combo, setCombo] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [waveNumber, setWaveNumber] = useState(0);
    const [currentWave, setCurrentWave] = useState<{ targetColor: string; nodes: WaveTarget[] }>(() => generateWave(0));
    const [coreHealth, setCoreHealth] = useState(100);
    const [glitchActive, setGlitchActive] = useState(false);
    const [shakeIntensity, setShakeIntensity] = useState(0);
    const [screenFlash, setScreenFlash] = useState<string | null>(null);

    // Agent messages
    const [advisorMsg, setAdvisorMsg] = useState(t('game.advisor.wave_incoming'));
    const [adversaryMsg, setAdversaryMsg] = useState(t('game.adversary.same_look'));

    // Narrative: Mission Briefing
    useEffect(() => {
        queueDialogue([
            { id: `gw-brief-${Date.now()}`, character: 'ATHENA', text: t('game.advisor.wave_incoming') },
            { id: `gw-brief2-${Date.now()}`, character: 'BYTE', text: t('game.instructions.avoid_hazards'), isGlitchy: true },
        ]);
    }, [queueDialogue, t]);

    const difficultyMultiplier = difficulty === 'HARD' ? 1.5 : difficulty === 'MEDIUM' ? 1.2 : 1;

    // Auto-advance wave when all correct nodes are clicked
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const correctRemaining = currentWave.nodes.filter(n => n.isCorrect).length;
        if (correctRemaining === 0) {
            // All correct nodes clicked — next wave!
            setTimeout(() => {
                const nextWave = waveNumber + 1;
                setWaveNumber(nextWave);
                setCurrentWave(generateWave(nextWave));
                audio.playScan?.();
            }, 400);
        }
    }, [currentWave.nodes, gameState, waveNumber]);

    // Agent chatter
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const advisorLines = [
            `${t('game.hud.wave')} ${waveNumber + 1}. ${t('game.advisor.wave_incoming')}`,
            `${t('game.hud.combo')}: ${combo}x`,
            t('game.advisor.core_holding'),
            t('game.advisor.diversion_nodes'),
        ];
        const adversaryLines = [
            t('game.adversary.same_look'),
            t('game.adversary.wont_survive'),
            t('game.adversary.predictable'),
            t('game.adversary.core_exposed'),
        ];
        const interval = setInterval(() => {
            if (Math.random() > 0.55) {
                setAdversaryMsg(adversaryLines[Math.floor(Math.random() * adversaryLines.length)]);
                audio.playSystemMessage?.({ type: 'warning' });
            } else {
                setAdvisorMsg(advisorLines[Math.floor(Math.random() * advisorLines.length)]);
                audio.playSystemMessage?.({ type: 'success' });
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [gameState, combo, waveNumber]);

    // Countdown
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    const finalState = coreHealth > 0 ? 'SUCCESS' : 'FAILED';
                    setGameState(finalState);
                    if (finalState === 'SUCCESS') {
                        audio.playSuccess();
                        queueDialogue([
                            { id: `gw-win-${Date.now()}`, character: 'SYNTAX', text: `${t('game.hud.waves_cleared')}: ${waveNumber}. ${t('game.hud.max_combo')}: ${maxCombo}x.` },
                            { id: `gw-win2-${Date.now()}`, character: 'ATHENA', text: t('game.state.waves_analyzed') },
                        ]);
                    } else {
                        audio.playError();
                        queueDialogue([
                            { id: `gw-fail-${Date.now()}`, character: 'BYTE', text: t('game.state.core_breached'), isGlitchy: true },
                        ]);
                    }
                    onComplete(score, { completionTime: 60, difficulty, maxCombo, wavesCleared: waveNumber });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, score, onComplete, difficulty, maxCombo, waveNumber, coreHealth]);

    // Check core health
    useEffect(() => {
        if (coreHealth <= 0 && gameState === 'PLAYING') {
            setGameState('FAILED');
            audio.playError();
            onComplete(score, { completionTime: 60 - timeLeft, difficulty, maxCombo, wavesCleared: waveNumber });
        }
    }, [coreHealth, gameState, score, timeLeft, difficulty, maxCombo, waveNumber, onComplete]);

    const handleNodeClick = useCallback((id: string, isCorrect: boolean) => {
        if (gameState !== 'PLAYING') return;

        if (isCorrect) {
            // Correct! Remove the node
            setCurrentWave(prev => ({
                ...prev,
                nodes: prev.nodes.filter(n => n.id !== id),
            }));
            audio.playClick();
            const newCombo = combo + 1;
            setCombo(newCombo);
            setMaxCombo(c => Math.max(c, newCombo));
            const points = Math.floor(100 * Math.min(newCombo, 10) * difficultyMultiplier);
            setScore(s => s + points);

            setScreenFlash('#00ffff');
            setTimeout(() => setScreenFlash(null), 80);
        } else {
            // Wrong! Penalty
            audio.playError();
            setCombo(0);
            setScore(s => Math.max(0, s - 150));
            setCoreHealth(h => Math.max(0, h - 15));

            setGlitchActive(true);
            setShakeIntensity(1);
            setScreenFlash('#ff0000');
            setTimeout(() => { setGlitchActive(false); setShakeIntensity(0); setScreenFlash(null); }, 400);
        }
    }, [gameState, combo, difficultyMultiplier]);

    return (
        <div className="relative w-full h-[600px] rounded-xl overflow-hidden border border-white/10 bg-black shadow-2xl">
            {/* Screen Flash */}
            <AnimatePresence>
                {screenFlash && (
                    <motion.div
                        initial={{ opacity: 0.5 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 z-30 pointer-events-none"
                        style={{ backgroundColor: screenFlash }}
                    />
                )}
            </AnimatePresence>

            {/* UI Overlay */}
            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 pointer-events-none">
                <div className="flex flex-col gap-2">
                    <div className="bg-black/60 backdrop-blur-md rounded-lg p-3 border border-emerald-500/40">
                        <div className="flex items-center gap-2 text-emerald-400 mb-1">
                            <Activity className="w-4 h-4" />
                            <span className="text-xs uppercase tracking-widest font-bold">{t('game.hud.score')}</span>
                        </div>
                        <div className="text-3xl font-mono font-black text-white tabular-nums">{score}</div>
                    </div>

                    {/* Wave Indicator with TARGET COLOR */}
                    <div className="bg-black/60 backdrop-blur-md rounded-lg p-3 border border-white/20">
                        <div className="flex items-center gap-2 mb-1">
                            <Waves className="w-4 h-4 text-white" />
                            <span className="text-xs uppercase tracking-widest font-bold text-white">{t('game.hud.wave')} {waveNumber + 1}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{t('game.hud.match_color')}:</span>
                            <div className="w-6 h-6 rounded-full border-2 border-white/30 shadow-lg" style={{ backgroundColor: currentWave.targetColor, boxShadow: `0 0 15px ${currentWave.targetColor}` }} />
                        </div>
                    </div>

                    {/* Combo */}
                    <AnimatePresence>
                        {combo > 1 && (
                            <motion.div
                                initial={{ scale: 0, x: -50 }}
                                animate={{ scale: 1, x: 0 }}
                                exit={{ scale: 0 }}
                                className="bg-black/60 backdrop-blur-md rounded-lg p-3 border border-orange-500/50"
                            >
                                <div className="flex items-center gap-2">
                                    <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
                                    <span className="text-orange-400 font-black text-xl italic">{combo}x</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <div className="bg-black/60 backdrop-blur-md rounded-lg p-3 border border-blue-500/40">
                        <div className="flex items-center gap-2 text-blue-400 mb-1">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-xs uppercase tracking-widest font-bold">{t('game.hud.time')}</span>
                        </div>
                        <div className={`text-3xl font-mono font-black tabular-nums ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timeLeft}s</div>
                    </div>

                    {/* Core Health */}
                    <div className="bg-black/60 backdrop-blur-md rounded-lg p-3 border border-red-500/30 w-32">
                        <div className="text-[10px] text-red-400 uppercase tracking-widest font-bold mb-1">{t('game.hud.core_hp')}</div>
                        <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                    width: `${coreHealth}%`,
                                    background: `linear-gradient(90deg, ${coreHealth > 50 ? '#00ff88' : coreHealth > 25 ? '#ffaa00' : '#ff0000'}, ${coreHealth > 50 ? '#00ffff' : '#ff3300'})`,
                                    boxShadow: `0 0 10px ${coreHealth > 50 ? '#00ff88' : '#ff3300'}`,
                                }}
                            />
                        </div>
                        <div className="text-xs text-white font-mono mt-1 text-right">{coreHealth}%</div>
                    </div>
                </div>
            </div>

            {/* Agent Comm Panel */}
            <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row gap-2 sm:gap-3 z-10 pointer-events-none">
                <div className="flex-1 bg-black/70 backdrop-blur-xl rounded-lg p-3 border-l-4 border-emerald-500">
                    <div className="text-[10px] text-emerald-400 mb-1 uppercase tracking-widest font-bold flex items-center gap-1"><Shield className="w-3 h-3" /> {t('game.advisor.label')}</div>
                    <div className="text-xs text-emerald-100 font-mono leading-relaxed">{advisorMsg}</div>
                </div>
                <div className="flex-1 bg-black/70 backdrop-blur-xl rounded-lg p-3 border-l-4 border-red-500">
                    <div className="text-[10px] text-red-500 mb-1 uppercase tracking-widest font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> {t('game.adversary.label')}</div>
                    <div className="text-xs text-red-100 font-mono leading-relaxed">{adversaryMsg}</div>
                </div>
            </div>

            {/* Game Over */}
            <AnimatePresence>
                {gameState !== 'PLAYING' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 z-20 flex items-center justify-center p-4 sm:p-0 bg-black/90 backdrop-blur-md"
                    >
                        <div className="text-center p-6 sm:p-10 w-full sm:w-auto rounded-2xl border border-white/10 bg-black/50 shadow-2xl max-w-[90vw] sm:max-w-md">
                            <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${gameState === 'SUCCESS' ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
                                {gameState === 'SUCCESS' ? <Trophy className="w-10 h-10 text-emerald-400" /> : <SkullIcon className="w-10 h-10 text-red-400" />}
                            </div>
                            <div className={`text-2xl sm:text-4xl font-black uppercase tracking-widest mb-4 ${gameState === 'SUCCESS' ? 'text-emerald-400' : 'text-red-500'}`}>
                                {gameState === 'SUCCESS' ? t('game.state.waves_analyzed') : t('game.state.core_breached')}
                            </div>
                            <div className="text-2xl text-white/80 font-mono mb-1">{t('game.hud.final_score')}: {score}</div>
                            <div className="text-sm text-orange-400 font-bold mb-1">{t('game.hud.max_combo')}: {maxCombo}x</div>
                            <div className="text-sm text-cyan-400 font-bold mb-6">{t('game.hud.waves_cleared')}: {waveNumber}</div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3D Canvas */}
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 0, 12], fov: 60 }} gl={{ antialias: false, powerPreference: "high-performance" }}>
                    <color attach="background" args={['#020008']} />
                    <fog attach="fog" args={['#020008', 8, 25]} />
                    <ambientLight intensity={0.3} />
                    <pointLight position={[10, 10, 10]} intensity={2} color="#00ff88" />
                    <pointLight position={[-10, -10, -10]} intensity={1} color="#ff00ff" />

                    <CameraRig shakeIntensity={shakeIntensity} />
                    <CoreEntity health={coreHealth} />

                    {/* Expanding wave rings */}
                    <GlitchRing color={currentWave.targetColor} delay={0} speed={2 + waveNumber * 0.3} />
                    <GlitchRing color={currentWave.targetColor} delay={Math.PI} speed={1.5 + waveNumber * 0.2} />

                    {/* Shield Nodes for this wave */}
                    {currentWave.nodes.map(node => (
                        <ShieldNode
                            key={node.id}
                            id={node.id}
                            position={node.position}
                            color={node.color}
                            isCorrect={node.isCorrect}
                            onClick={handleNodeClick}
                        />
                    ))}

                    <Sparkles count={300} scale={20} size={3} speed={0.5 + waveNumber * 0.1} opacity={0.5} color="#00ff88" />
                    <Sparkles count={100} scale={15} size={6} speed={1} opacity={0.3} color="#ff00ff" />

                    <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5 + combo * 0.05} />

                    <EffectComposer >
                        <Bloom luminanceThreshold={0.15} mipmapBlur intensity={1.5 + combo * 0.1} />
                        <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.002 + combo * 0.001, 0.002)} />
                        <Vignette eskil={false} offset={0.1} darkness={1.1} />
                        {glitchActive && (
                            <Glitch delay={new THREE.Vector2(0, 0)} duration={new THREE.Vector2(0.1, 0.4)} mode={GlitchMode.SPORADIC} active ratio={0.8} />
                        )}
                    </EffectComposer>
                </Canvas>
            </div>
        </div>
    );
};
