/// <reference types="@react-three/fiber" />
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Sparkles, Grid, Environment, ContactShadows, Text, MeshTransmissionMaterial } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch, Vignette, DepthOfField, Noise } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Activity, Shield, Cpu, AlertTriangle, Zap, Terminal, CheckCircle, SkullIcon, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../../services/audioService';
import { useDialogue } from '../../contexts/DialogueContext';

export interface AethelredGambitProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

// --- Dynamic Score Popup ---
const FloatingScore = ({ id, position, text, color, onComplete }: { id: string, position: [number, number, number], text: string, color: string, onComplete: (i: string) => void }) => {
    const groupRef = useRef<THREE.Group>(null);
    const [life, setLife] = useState(0);

    useFrame((_, delta) => {
        if (!groupRef.current) return;
        setLife(l => l + delta * 1.5);
        groupRef.current.position.y += delta * 2;
        groupRef.current.position.x += delta * (Math.random() - 0.5) * 2;
        groupRef.current.position.z += delta * (Math.random() - 0.5) * 2;
        groupRef.current.scale.setScalar(Math.max(0, 1 - life * 0.5));
        if (life > 2) onComplete(id);
    });

    return (
        <group ref={groupRef} position={position}>
            <Text color={color} fontSize={1.4} font="https://fonts.gstatic.com/s/cinzel/v19/8vIJ7ww63mVu7gtzT1aD.woff" anchorX="center" anchorY="middle" outlineWidth={0.05} outlineColor="#050011">
                {text}
            </Text>
        </group>
    );
};

// --- Impact Ring Effect ---
const ImpactRing = ({ position, color, onComplete }: { position: [number, number, number], color: string, onComplete: (i: string) => void, id: string }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.MeshBasicMaterial>(null);
    const [life, setLife] = useState(0);

    useFrame((_, delta) => {
        if (!meshRef.current || !matRef.current) return;
        setLife(l => l + delta * 3);
        meshRef.current.scale.setScalar(1 + life * 6);
        meshRef.current.rotation.x = Math.PI / 2; // Flat on ground/plane if viewed from top, but let's face camera
        meshRef.current.lookAt(0, 0, 10);
        matRef.current.opacity = Math.max(0, 1 - life);
        if (life > 1) onComplete(id);
    });

    return (
        <mesh ref={meshRef} position={position}>
            <ringGeometry args={[0.8, 1, 64]} />
            <meshBasicMaterial ref={matRef} color={color} transparent opacity={1} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
    );
};

// --- Gambit Engine (Core Entity) ---
const GambitEngine = ({ isActive, progress }: { isActive: boolean, progress: number }) => {
    const outerRef = useRef<THREE.Mesh>(null);
    const midRef = useRef<THREE.Mesh>(null);
    const innerRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    // Color progression from Sapphire to Gold
    const baseColor = new THREE.Color().lerpColors(new THREE.Color('#0088ff'), new THREE.Color('#ffd700'), progress);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        const activeMultiplier = isActive ? 5 : 1;

        if (outerRef.current) {
            outerRef.current.rotation.x = t * 0.3 * activeMultiplier;
            outerRef.current.rotation.y = t * 0.4 * activeMultiplier;
            const pulse = 1 + Math.sin(t * 5) * 0.05;
            outerRef.current.scale.lerp(new THREE.Vector3().setScalar(1.5 * pulse * (hovered ? 1.05 : 1) * (isActive ? 1.3 : 1)), 0.1);
        }
        if (midRef.current) {
            midRef.current.rotation.x = -t * 0.6 * activeMultiplier;
            midRef.current.rotation.z = t * 0.5 * activeMultiplier;
            midRef.current.scale.lerp(new THREE.Vector3().setScalar(1.1 * (isActive ? 1.4 : 1)), 0.2);
        }
        if (innerRef.current) {
            innerRef.current.rotation.y = t * 3 * activeMultiplier;
            innerRef.current.rotation.z = -t * 2 * activeMultiplier;
            innerRef.current.scale.lerp(new THREE.Vector3().setScalar(0.6 * (isActive ? 1.5 : 1)), 0.3);
        }
    });

    return (
        <Float speed={2.5} rotationIntensity={1.2} floatIntensity={1.5}>
            <group
                onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
                onPointerOut={() => { setHovered(false); document.body.style.cursor = 'crosshair'; }}>

                {/* Outer Golden Astrolabe Rings (TorusKnot) */}
                <mesh ref={outerRef}>
                    <torusKnotGeometry args={[1.2, 0.15, 128, 16]} />
                    <meshStandardMaterial color="#ffcc00" metalness={1} roughness={0.1} emissive="#aa8800" emissiveIntensity={isActive ? 2 : 0.5} />
                </mesh>

                {/* Mid Glassy Sapphire Core */}
                <mesh ref={midRef}>
                    <octahedronGeometry args={[1, 1]} />
                    <MeshTransmissionMaterial backside samples={4} thickness={1.2} chromaticAberration={isActive ? 2 : 1} anisotropy={0.3} distortion={isActive ? 0.8 : 0.2} distortionScale={0.5} temporalDistortion={0.3} color="#00ffff" emissive="#0088ff" emissiveIntensity={isActive ? 1 : 0.2} clearcoat={1} />
                </mesh>

                {/* Inner Bright Point */}
                <mesh ref={innerRef}>
                    <sphereGeometry args={[0.8, 32, 32]} />
                    <meshStandardMaterial color="#ffffff" emissive={baseColor} emissiveIntensity={isActive ? 8 : 3} roughness={0.1} metalness={0.8} />
                </mesh>

                <pointLight distance={15} intensity={isActive ? 10 : 5} color={baseColor} />
            </group>
        </Float>
    );
};

// --- Camera Rig for interactions ---
const CameraRig = ({ intensity }: { intensity: number }) => {
    useFrame((state) => {
        const shake = (Math.random() - 0.5) * intensity;
        state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, shake, 0.1);
        state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, shake, 0.1);
        state.camera.lookAt(0, 0, 0);
    });
    return null;
};

// --- Types ---
interface FloatingEffect { id: string; position: [number, number, number]; text: string; color: string; type: 'score' | 'ring' }

export const AethelredGambit: React.FC<AethelredGambitProps> = ({ onComplete, difficulty, t }) => {
    const { queueDialogue } = useDialogue();
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');
    const [activeNode, setActiveNode] = useState(false);
    const [camShake, setCamShake] = useState(0);

    const [effects, setEffects] = useState<FloatingEffect[]>([]);
    const [screenFlash, setScreenFlash] = useState<string | null>(null);

    const [advisorMsg, setAdvisorMsg] = useState(t('game.advisor.analyzing'));
    const [adversaryMsg, setAdversaryMsg] = useState(t('game.adversary.system_vulnerable'));
    const [glitchActive, setGlitchActive] = useState(false);

    const diffMul = difficulty === 'HARD' ? 1.5 : difficulty === 'MEDIUM' ? 1.2 : 1;
    const targetScore = difficulty === 'HARD' ? 2500 : 1500;
    const progressR = Math.min(1, score / targetScore);

    // Narrative: Mission Briefing
    useEffect(() => {
        queueDialogue([
            { id: `ag-brief-${Date.now()}`, character: 'ATHENA', text: t('game.instructions.aethelred_brief') || 'Execute the Gambit. Overclock the central engine.' },
            { id: `ag-brief2-${Date.now()}`, character: 'SYNTAX', text: t('game.instructions.aethelred_warn') || 'Anomaly detected. Do not falter.', isGlitchy: true },
        ]);
    }, [queueDialogue, t]);

    // Multi-Agent Simulation Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        const advisorLines = [
            t('game.advisor.tactics_optimal') || 'Tactics optimal. Maintain pressure.',
            t('game.advisor.gambit_predicted') || 'Gambit trajectory matches predictions.',
            t('game.advisor.adversary_adapting') || 'Adversary is adapting. We need to shift protocols.',
            t('game.advisor.energy_holding') || 'Energy levels holding. Good work.'
        ];

        const adversaryLines = [
            t('game.adversary.defenses_pitiful') || 'Your defenses are pitiful.',
            t('game.adversary.bypassing_context') || 'I am bypassing the mainframe context.',
            t('game.adversary.futile_moves') || 'Your moves are futile.',
            t('game.adversary.cannot_sustain') || 'You cannot sustain this compute load.'
        ];

        const agentInterval = setInterval(() => {
            const isAdversary = Math.random() > 0.6;
            if (isAdversary) {
                setAdversaryMsg(adversaryLines[Math.floor(Math.random() * adversaryLines.length)]);
                audio.playSystemMessage?.({ type: 'warning' });
                setGlitchActive(true);
                setTimeout(() => setGlitchActive(false), 800);
            } else {
                setAdvisorMsg(advisorLines[Math.floor(Math.random() * advisorLines.length)]);
                audio.playSystemMessage?.({ type: 'success' });
            }
        }, 5500);

        return () => clearInterval(agentInterval);
    }, [gameState, t]);

    // Timer Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    const isWin = score >= targetScore;
                    setGameState(isWin ? 'SUCCESS' : 'FAILED');
                    if (isWin) {
                        audio.playSuccess();
                        queueDialogue([{ id: `ag-win-${Date.now()}`, character: 'ATHENA', text: t('game.state.system_secured') }]);
                    } else {
                        audio.playError();
                        queueDialogue([{ id: `ag-fail-${Date.now()}`, character: 'BYTE', text: t('game.state.breach_detected'), isGlitchy: true }]);
                    }
                    onComplete(score, { completionTime: 60 - prev, difficulty });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, score, onComplete, difficulty, targetScore, queueDialogue, t]);

    // Interactive Core Logic
    const handleInteract = useCallback(() => {
        if (gameState !== 'PLAYING') return;
        audio.playClick();
        setActiveNode(true);
        setCamShake(0.6);

        const pts = Math.floor(75 * diffMul);
        const newScore = score + pts;
        setScore(newScore);

        // Flash and reset
        setScreenFlash('rgba(255, 215, 0, 0.15)');
        setTimeout(() => { setActiveNode(false); setCamShake(0); setScreenFlash(null); }, 150);

        // Floating points
        const effId = `${Date.now()}-${Math.random()}`;
        const pos: [number, number, number] = [(Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, 2];
        setEffects(prev => [...prev,
        { id: `sc-${effId}`, type: 'score', position: pos, text: `+${pts} TACTIC`, color: '#ffd700' },
        { id: `rg-${effId}`, type: 'ring', position: [0, 0, 0], text: '', color: '#00ffff' }
        ]);

        if (newScore >= targetScore) {
            setGameState('SUCCESS');
            audio.playSuccess();
            queueDialogue([{ id: `ag-win2-${Date.now()}`, character: 'ATHENA', text: t('game.state.system_secured') }]);
            onComplete(newScore, { completionTime: 60 - timeLeft, difficulty });
        }
    }, [gameState, score, diffMul, targetScore, timeLeft, onComplete, queueDialogue, t]);

    const removeEffect = useCallback((id: string) => {
        setEffects(prev => prev.filter(e => e.id !== id));
    }, []);

    return (
        <div className="relative w-full h-[700px] rounded-[32px] overflow-hidden border border-[#ffd700]/20 bg-[#000511] shadow-[0_0_60px_rgba(255,215,0,0.1)] font-sans">
            <AnimatePresence>
                {screenFlash && (
                    <motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: "easeOut" }} className="absolute inset-0 z-30 pointer-events-none mix-blend-screen" style={{ backgroundColor: screenFlash }} />
                )}
            </AnimatePresence>

            {/* AAA Regal Glassmorphic HUD */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
                <div className="flex flex-col gap-4 filter drop-shadow-xl">
                    {/* Signal Progress Panel */}
                    <div className="bg-[#000d22]/70 backdrop-blur-2xl rounded-2xl p-4 border border-[#ffd700]/30 shadow-[0_10px_30px_rgba(255,215,0,0.15)] relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#ffd700]/10 to-[#0088ff]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="flex items-center gap-2 text-[#ffd700] mb-2">
                            <Activity className="w-5 h-5 animate-pulse" />
                            <span className="text-xs uppercase tracking-[0.2em] font-black text-[#ffea88]">Tactical Output</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <motion.div
                                key={score}
                                initial={{ y: -5, opacity: 0.5 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#ffd700] tabular-nums uppercase tracking-tighter"
                                style={{ fontFamily: 'Cinzel, serif', textShadow: '0 0 20px rgba(255,215,0,0.4)' }}
                            >
                                {score.toLocaleString()}
                            </motion.div>
                            <span className="text-sm font-bold text-[#0088ff]/80 uppercase tracking-widest">/ {targetScore.toLocaleString()}</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="mt-3 h-1.5 w-full bg-[#001133] rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-[#0088ff] to-[#ffd700] shadow-[0_0_15px_#ffd700]"
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, (score / targetScore) * 100)}%` }}
                                transition={{ type: "spring", stiffness: 50 }}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-4 filter drop-shadow-xl">
                    {/* Time Panel */}
                    <div className="bg-[#000d22]/70 backdrop-blur-2xl rounded-2xl p-4 border border-[#ffd700]/30 shadow-[0_10px_30px_rgba(0,136,255,0.2)] min-w-[140px] text-right">
                        <div className="flex items-center justify-end gap-2 text-[#00aaff] mb-1">
                            <span className="text-xs uppercase tracking-[0.2em] font-black text-[#88ddff]">{t('game.hud.time')}</span>
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className={`text-4xl font-black tabular-nums tracking-tighter ${timeLeft <= 10 ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-300 animate-pulse' : 'text-transparent bg-clip-text bg-gradient-to-r from-white to-[#00aaff]'}`} style={{ fontFamily: 'Cinzel, serif', textShadow: timeLeft <= 10 ? '0 0 20px rgba(255,0,0,0.6)' : '0 0 20px rgba(0,170,255,0.4)' }}>
                            {timeLeft}s
                        </div>
                    </div>

                    {/* Difficulty Badge */}
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border backdrop-blur-md ${difficulty === 'HARD' ? 'border-red-500/50 text-red-400 bg-red-900/40' : difficulty === 'MEDIUM' ? 'border-[#ffd700]/50 text-[#ffd700] bg-[#ffd700]/10 shadow-[0_0_15px_rgba(255,215,0,0.3)]' : 'border-[#0088ff]/50 text-[#0088ff] bg-[#0088ff]/10 shadow-[0_0_15px_rgba(0,136,255,0.3)]'}`}>
                        {t(`game.difficulty.${difficulty.toLowerCase()}`)}
                    </div>
                </div>
            </div>

            {/* Cinematic Instructions */}
            <AnimatePresence>
                {timeLeft > 55 && gameState === 'PLAYING' && (
                    <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }} transition={{ duration: 0.8, ease: "easeOut" }} className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                        <div className="bg-[#000d22]/90 backdrop-blur-3xl p-10 rounded-[32px] border border-[#ffd700]/40 shadow-[0_30px_80px_rgba(255,215,0,0.3)] text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-[#ffd700]/10 to-transparent opacity-50"></div>
                            <div className="text-[#ffd700] font-black text-3xl uppercase tracking-widest mb-4 drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]" style={{ fontFamily: 'Cinzel, serif' }}>
                                <Crown className="inline w-10 h-10 mr-3 -mt-2" /> Execute The Gambit
                            </div>
                            <div className="text-[#00ffff] font-bold text-lg uppercase tracking-wider drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
                                <Terminal className="inline w-5 h-5 mr-2 -mt-1" /> Click anywhere to drive output
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Agent Comms Panel */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row gap-4 z-10 pointer-events-none">
                <div className="flex-1 bg-[#000d22]/80 backdrop-blur-2xl rounded-2xl p-4 border border-[#ffd700]/20 border-l-4 border-l-[#0088ff] shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#0088ff]/10 rounded-full blur-[30px] -translate-y-1/2 translate-x-1/2"></div>
                    <div className="text-[10px] text-[#00aaff] mb-2 uppercase tracking-[0.2em] font-black flex items-center gap-2">
                        <Shield className="w-4 h-4" /> {t('game.advisor.label')}
                    </div>
                    <div className="text-sm text-[#ccffff]/90 font-mono leading-relaxed relative z-10">{advisorMsg}</div>
                </div>
                <div className="flex-1 bg-[#000d22]/80 backdrop-blur-2xl rounded-2xl p-4 border border-[#ffd700]/20 border-l-4 border-l-red-500 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-[30px] -translate-y-1/2 translate-x-1/2"></div>
                    <div className="text-[10px] text-red-500 mb-2 uppercase tracking-[0.2em] font-black flex items-center gap-2">
                        <Zap className="w-4 h-4" /> {t('game.adversary.label')}
                    </div>
                    <div className="text-sm text-red-100/90 font-mono leading-relaxed relative z-10">{adversaryMsg}</div>
                </div>
            </div>

            {/* Game Over Cinematic Screen */}
            <AnimatePresence>
                {gameState !== 'PLAYING' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-40 flex items-center justify-center bg-[#000511]/95 backdrop-blur-xl">
                        <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", damping: 20, stiffness: 100 }} className="text-center p-10 w-full max-w-lg rounded-[40px] border border-[#ffd700]/30 bg-gradient-to-b from-[#000d22]/90 to-black shadow-[0_50px_100px_rgba(255,215,0,0.2)] relative overflow-hidden">

                            {/* Background Glows */}
                            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 blur-[80px] opacity-30 ${gameState === 'SUCCESS' ? 'bg-[#ffd700]' : 'bg-red-500'}`}></div>

                            <div className={`w-28 h-28 mx-auto mb-8 rounded-full flex items-center justify-center relative z-10 ${gameState === 'SUCCESS' ? 'bg-[#ffd700]/20 border-2 border-[#ffd700] shadow-[0_0_40px_rgba(255,215,0,0.5)]' : 'bg-red-900/40 border-2 border-red-500 shadow-[0_0_40px_rgba(255,0,0,0.4)]'}`}>
                                {gameState === 'SUCCESS' ? <Crown className="w-14 h-14 text-[#ffd700] drop-shadow-md" /> : <SkullIcon className="w-14 h-14 text-red-400 drop-shadow-md" />}
                            </div>

                            <h2 className={`text-4xl sm:text-6xl font-black uppercase tracking-tighter mb-4 relative z-10 ${gameState === 'SUCCESS' ? 'text-transparent bg-clip-text bg-gradient-to-b from-white to-[#ffd700]' : 'text-transparent bg-clip-text bg-gradient-to-b from-white to-red-600'}`} style={{ fontFamily: 'Cinzel, serif', textShadow: gameState === 'SUCCESS' ? '0 10px 30px rgba(255,215,0,0.4)' : '0 10px 30px rgba(255,0,0,0.4)' }}>
                                {gameState === 'SUCCESS' ? 'GAMBIT SECURED' : 'GAMBIT FAILED'}
                            </h2>

                            <div className="bg-black/60 rounded-2xl p-6 border border-[#ffd700]/20 mb-8 relative z-10">
                                <div className="text-sm text-[#0088ff] uppercase tracking-widest font-bold mb-1">Final Tactical Yield</div>
                                <div className="text-5xl text-white font-mono font-black tabular-nums">{score.toLocaleString()}</div>
                                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                                    <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Target Yield</span>
                                    <span className="text-xl text-[#ffd700] font-black italic">{targetScore.toLocaleString()}</span>
                                </div>
                            </div>

                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium Aethelred 3D Canvas */}
            <div className={`absolute inset-0 z-0 cursor-crosshair ${gameState !== 'PLAYING' ? 'pointer-events-none' : ''}`} onClick={handleInteract}>
                <Canvas camera={{ position: [0, 4, 12], fov: 55 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}>
                    <color attach="background" args={['#000511']} />
                    <fog attach="fog" args={['#000511', 8, 30]} />

                    <Environment preset="night" />
                    <ambientLight intensity={0.6} />
                    <directionalLight position={[10, 20, 10]} intensity={3} color="#ffd700" />
                    <directionalLight position={[-10, 10, -10]} intensity={1.5} color="#0088ff" />
                    <pointLight position={[0, -5, 0]} intensity={2} color="#00ffff" />

                    {/* Glowing Chessboard Floor */}
                    <Grid position={[0, -4, 0]} args={[40, 40]} cellSize={2} cellThickness={1.5} cellColor="#004488" sectionSize={8} sectionThickness={2.5} sectionColor="#cca500" fadeDistance={25} fadeStrength={1.5} />

                    <CameraRig intensity={camShake} />

                    <GambitEngine isActive={activeNode} progress={progressR} />

                    {/* Majestic Particles */}
                    <Sparkles count={300} scale={[20, 20, 20]} size={6} speed={0.4} opacity={0.8} color="#ffd700" noise={1} />
                    <Sparkles count={200} scale={[15, 30, 15]} size={3} speed={0.6} opacity={0.4} color="#0088ff" noise={1} />

                    {/* Floating Text Effects */}
                    {effects.map(eff => eff.type === 'score' ? (
                        <FloatingScore key={eff.id} id={eff.id} position={eff.position} text={eff.text} color={eff.color} onComplete={removeEffect} />
                    ) : (
                        <ImpactRing key={eff.id} id={eff.id} position={eff.position} color={eff.color} onComplete={removeEffect} />
                    ))}

                    <ContactShadows position={[0, -3.9, 0]} opacity={0.8} scale={20} blur={2} far={10} resolution={512} color="#000000" />

                    <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.8} maxPolarAngle={Math.PI / 2.1} minPolarAngle={Math.PI / 4} />

                    <EffectComposer enableNormalPass={false}>
                        <Bloom luminanceThreshold={0.4} mipmapBlur intensity={1.2 + progressR} />
                        <DepthOfField focusDistance={0.03} focalLength={0.06} bokehScale={4} height={480} />
                        <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.002 + (activeNode ? 0.006 : 0), 0.002)} radialModulation={false} modulationOffset={0} />
                        <Noise opacity={0.05} />
                        <Vignette eskil={false} offset={0.1} darkness={1.3} />
                        {glitchActive && (<Glitch delay={new THREE.Vector2(0, 0)} duration={new THREE.Vector2(0.3, 0.8)} mode={GlitchMode.SPORADIC} active ratio={0.8} strength={new THREE.Vector2(0.05, 0.2)} />)}
                    </EffectComposer>
                </Canvas>
            </div>
        </div>
    );
};

export default AethelredGambit;
