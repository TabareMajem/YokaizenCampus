/// <reference types="@react-three/fiber" />
import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Icosahedron, MeshTransmissionMaterial, Float, Text, Sparkles, Grid, Environment, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch, Vignette, DepthOfField, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Activity, Shield, Cpu, AlertTriangle, Zap, Terminal, CheckCircle, SkullIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../../services/audioService';
import { useDialogue } from '../../contexts/DialogueContext';

export interface LazarusVectorProps {
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
        groupRef.current.scale.setScalar(Math.max(0, 1 - life * 0.5));
        if (life > 2) onComplete(id);
    });

    return (
        <group ref={groupRef} position={position}>
            <Text color={color} fontSize={1.5} font="https://fonts.gstatic.com/s/syncopate/v13/pe0sMIuPIYBCpEV5eFdCBfe_m_s.woff" anchorX="center" anchorY="middle" outlineWidth={0.05} outlineColor="#001100">
                {text}
            </Text>
        </group>
    );
};

// --- Multi-Layered Quantum Core ---
const QuantumCore = ({ isActive, coreColor, accentColor }: { isActive: boolean, coreColor: string, accentColor: string }) => {
    const outerRef = useRef<THREE.Mesh>(null);
    const midRef = useRef<THREE.Mesh>(null);
    const innerRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        const activeMultiplier = isActive ? 4 : 1;

        if (outerRef.current) {
            outerRef.current.rotation.x = t * 0.2 * activeMultiplier;
            outerRef.current.rotation.y = t * 0.3 * activeMultiplier;
            const pulse = 1 + Math.sin(t * 4) * 0.05;
            outerRef.current.scale.lerp(new THREE.Vector3().setScalar(1.5 * pulse * (hovered ? 1.1 : 1) * (isActive ? 1.2 : 1)), 0.1);
        }
        if (midRef.current) {
            midRef.current.rotation.x = -t * 0.5 * activeMultiplier;
            midRef.current.rotation.z = t * 0.4 * activeMultiplier;
            midRef.current.scale.lerp(new THREE.Vector3().setScalar(1.2 * (isActive ? 1.3 : 1)), 0.2);
        }
        if (innerRef.current) {
            innerRef.current.rotation.y = t * 2 * activeMultiplier;
            innerRef.current.rotation.z = -t * 1.5 * activeMultiplier;
            const throb = 1 + Math.sin(t * 10) * 0.1;
            innerRef.current.scale.lerp(new THREE.Vector3().setScalar(0.7 * throb * (isActive ? 1.4 : 1)), 0.3);
        }
    });

    return (
        <Float speed={2} rotationIntensity={1} floatIntensity={1.5}>
            <group
                onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
                onPointerOut={() => { setHovered(false); document.body.style.cursor = 'crosshair'; }}>

                {/* Outer Glass Shell */}
                <Icosahedron ref={outerRef} args={[1, 2]}>
                    <MeshTransmissionMaterial backside samples={4} thickness={1.5} chromaticAberration={isActive ? 2 : 1} anisotropy={0.5} distortion={isActive ? 1 : 0.3} distortionScale={0.5} temporalDistortion={0.2} color={coreColor} emissive={coreColor} emissiveIntensity={hovered ? 1 : 0.2} clearcoat={1} />
                </Icosahedron>

                {/* Mid Wireframe Matrix */}
                <Icosahedron ref={midRef} args={[1, 1]}>
                    <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={isActive ? 5 : 2} wireframe wireframeLinewidth={2} transparent opacity={0.6} />
                </Icosahedron>

                {/* Inner Dense Core */}
                <Icosahedron ref={innerRef} args={[1, 0]}>
                    <meshStandardMaterial color="#ffffff" emissive={coreColor} emissiveIntensity={isActive ? 10 : 4} roughness={0.1} metalness={1} />
                </Icosahedron>

                <pointLight distance={10} intensity={isActive ? 8 : 4} color={coreColor} />
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

// --- Data Streams (Matrix effect) ---
const DataStreams = () => {
    const group = useRef<THREE.Group>(null);
    useFrame((state) => {
        if (group.current) {
            group.current.position.y = (state.clock.elapsedTime * 2) % 10 - 5;
        }
    });
    return (
        <group ref={group}>
            <Sparkles count={500} scale={[20, 20, 20]} size={6} speed={0} opacity={0.8} color="#00ffaa" />
            <Sparkles count={200} scale={[15, 30, 15]} size={3} speed={0} opacity={0.4} color="#00aaff" />
        </group>
    );
};

// --- Types ---
interface FloatingEffect { id: string; position: [number, number, number]; text: string; color: string; }

export const LazarusVector: React.FC<LazarusVectorProps> = ({ onComplete, difficulty, t }) => {
    const { queueDialogue } = useDialogue();
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');
    const [activeNode, setActiveNode] = useState(false);
    const [camShake, setCamShake] = useState(0);

    // UI Effects
    const [effects, setEffects] = useState<FloatingEffect[]>([]);
    const [screenFlash, setScreenFlash] = useState<string | null>(null);

    // Multi-Agent Flow Logic State
    const [advisorMsg, setAdvisorMsg] = useState(t('game.advisor.analyzing'));
    const [adversaryMsg, setAdversaryMsg] = useState(t('game.adversary.system_vulnerable'));
    const [glitchActive, setGlitchActive] = useState(false);

    const diffMul = difficulty === 'HARD' ? 1.5 : difficulty === 'MEDIUM' ? 1.2 : 1;
    const targetScore = difficulty === 'HARD' ? 2000 : 1000;

    // Narrative: Mission Briefing
    useEffect(() => {
        queueDialogue([
            { id: `lv-brief-${Date.now()}`, character: 'ATHENA', text: t('game.instructions.lazarus_brief') || 'Restore the Lazarus Vector by channeling data to the core.' },
            { id: `lv-brief2-${Date.now()}`, character: 'SYNTAX', text: t('game.instructions.lazarus_warn') || 'Warning: Core instability detected.', isGlitchy: true },
        ]);
    }, [queueDialogue, t]);

    // Multi-Agent Simulation Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        const advisorLines = [
            t('game.advisor.maintain_focus') || 'Maintain focus. Logic structures are stabilizing.',
            t('game.advisor.optimization_detected') || 'Optimization detected. Keep routing data.',
            t('game.advisor.adversary_adapting') || 'Adversary is adapting. We need to shift protocols.',
            t('game.advisor.energy_holding') || 'Energy levels holding. Good work.'
        ];

        const adversaryLines = [
            t('game.adversary.defenses_pitiful') || 'Your defenses are pitiful.',
            t('game.adversary.bypassing_context') || 'I am bypassing the mainframe context.',
            t('game.adversary.entropy_wins') || 'Entropy always wins.',
            t('game.adversary.cannot_sustain') || 'You cannot sustain this compute load.'
        ];

        const agentInterval = setInterval(() => {
            const isAdversary = Math.random() > 0.6;
            if (isAdversary) {
                setAdversaryMsg(adversaryLines[Math.floor(Math.random() * adversaryLines.length)]);
                audio.playSystemMessage?.({ type: 'warning' });
                setGlitchActive(true);
                setTimeout(() => setGlitchActive(false), 500);
            } else {
                setAdvisorMsg(advisorLines[Math.floor(Math.random() * advisorLines.length)]);
                audio.playSystemMessage?.({ type: 'success' });
            }
        }, 6000);

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
                        queueDialogue([{ id: `lv-win-${Date.now()}`, character: 'ATHENA', text: t('game.state.system_secured') }]);
                    } else {
                        audio.playError();
                        queueDialogue([{ id: `lv-fail-${Date.now()}`, character: 'BYTE', text: t('game.state.breach_detected'), isGlitchy: true }]);
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
        setCamShake(0.5);

        const pts = Math.floor(50 * diffMul);
        const newScore = score + pts;
        setScore(newScore);

        // Flash and reset
        setScreenFlash('rgba(0, 255, 170, 0.15)');
        setTimeout(() => { setActiveNode(false); setCamShake(0); setScreenFlash(null); }, 150);

        // Floating points
        const effId = `${Date.now()}-${Math.random()}`;
        const pos: [number, number, number] = [(Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, 2];
        setEffects(prev => [...prev, { id: effId, position: pos, text: `+${pts} ROUTED`, color: '#00ffaa' }]);

        if (newScore >= targetScore) {
            setGameState('SUCCESS');
            audio.playSuccess();
            queueDialogue([{ id: `lv-win2-${Date.now()}`, character: 'ATHENA', text: t('game.state.system_secured') }]);
            onComplete(newScore, { completionTime: 60 - timeLeft, difficulty });
        }
    }, [gameState, score, diffMul, targetScore, timeLeft, onComplete, queueDialogue, t]);

    const removeEffect = useCallback((id: string) => {
        setEffects(prev => prev.filter(e => e.id !== id));
    }, []);

    // Color Theme based on score progress
    const progressR = score / targetScore;
    const coreColor = new THREE.Color().lerpColors(new THREE.Color('#00ffff'), new THREE.Color('#00ffaa'), progressR).getStyle();
    const accentColor = new THREE.Color().lerpColors(new THREE.Color('#0055ff'), new THREE.Color('#00ff55'), progressR).getStyle();

    return (
        <div className="relative w-full h-[700px] rounded-[32px] overflow-hidden border border-emerald-500/20 bg-[#001005] shadow-[0_0_60px_rgba(0,255,170,0.15)] font-sans">
            <AnimatePresence>
                {screenFlash && (
                    <motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: "easeOut" }} className="absolute inset-0 z-30 pointer-events-none mix-blend-screen" style={{ backgroundColor: screenFlash }} />
                )}
            </AnimatePresence>

            {/* AAA Glassmorphic HUD */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
                <div className="flex flex-col gap-4 filter drop-shadow-xl">
                    {/* Signal Progress Panel */}
                    <div className="bg-[#001a0d]/60 backdrop-blur-2xl rounded-2xl p-4 border border-emerald-500/20 shadow-[0_10px_30px_rgba(0,255,170,0.1)] relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="flex items-center gap-2 text-emerald-400 mb-2">
                            <Activity className="w-5 h-5 animate-pulse" />
                            <span className="text-xs uppercase tracking-[0.2em] font-black text-emerald-300/80">Signal Integrity</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <motion.div
                                key={score}
                                initial={{ y: -5, opacity: 0.5 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-emerald-300 tabular-nums uppercase tracking-tighter"
                                style={{ textShadow: '0 0 20px rgba(0,255,170,0.4)' }}
                            >
                                {score.toLocaleString()}
                            </motion.div>
                            <span className="text-sm font-bold text-emerald-500/50 uppercase tracking-widest">/ {targetScore.toLocaleString()}</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="mt-3 h-1.5 w-full bg-emerald-900/50 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 shadow-[0_0_10px_#00ffaa]"
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, (score / targetScore) * 100)}%` }}
                                transition={{ type: "spring", stiffness: 50 }}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-4 filter drop-shadow-xl">
                    {/* Time Panel */}
                    <div className="bg-[#001a0d]/60 backdrop-blur-2xl rounded-2xl p-4 border border-emerald-500/20 shadow-[0_10px_30px_rgba(0,255,170,0.1)] min-w-[140px] text-right">
                        <div className="flex items-center justify-end gap-2 text-cyan-400 mb-1">
                            <span className="text-xs uppercase tracking-[0.2em] font-black text-cyan-400/80">{t('game.hud.time')}</span>
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className={`text-4xl font-black tabular-nums tracking-tighter ${timeLeft <= 10 ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-300 animate-pulse' : 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-100 to-emerald-400'}`} style={{ textShadow: timeLeft <= 10 ? '0 0 20px rgba(255,0,0,0.6)' : '0 0 20px rgba(0,255,170,0.4)' }}>
                            {timeLeft}s
                        </div>
                    </div>

                    {/* Difficulty Badge */}
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border backdrop-blur-md ${difficulty === 'HARD' ? 'border-red-500/50 text-red-400 bg-red-900/40' : difficulty === 'MEDIUM' ? 'border-yellow-500/50 text-yellow-400 bg-yellow-900/40' : 'border-emerald-500/50 text-emerald-400 bg-emerald-900/40 shadow-[0_0_15px_rgba(0,255,170,0.3)]'}`}>
                        {t(`game.difficulty.${difficulty.toLowerCase()}`)}
                    </div>
                </div>
            </div>

            {/* Cinematic Instructions */}
            <AnimatePresence>
                {timeLeft > 55 && gameState === 'PLAYING' && (
                    <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }} transition={{ duration: 0.8, ease: "easeOut" }} className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                        <div className="bg-[#001a0d]/80 backdrop-blur-3xl p-10 rounded-[32px] border border-emerald-500/30 shadow-[0_30px_60px_rgba(0,255,170,0.4)] text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent opacity-50"></div>
                            <div className="text-emerald-400 font-black text-3xl uppercase tracking-widest mb-4 drop-shadow-[0_0_15px_rgba(0,255,170,0.6)]">
                                <Cpu className="inline w-8 h-8 mr-3 -mt-1" /> Channel Data to Core
                            </div>
                            <div className="text-cyan-400 font-bold text-lg uppercase tracking-wider drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
                                <Terminal className="inline w-5 h-5 mr-2 -mt-1" /> Click anywhere to route packets
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Agent Comms Panel */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row gap-4 z-10 pointer-events-none">
                <div className="flex-1 bg-[#001a0d]/70 backdrop-blur-2xl rounded-2xl p-4 border border-emerald-500/20 border-l-4 border-l-cyan-500 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[30px] -translate-y-1/2 translate-x-1/2"></div>
                    <div className="text-[10px] text-cyan-400 mb-2 uppercase tracking-[0.2em] font-black flex items-center gap-2">
                        <Shield className="w-4 h-4" /> {t('game.advisor.label')}
                    </div>
                    <div className="text-sm text-cyan-100/90 font-mono leading-relaxed relative z-10">{advisorMsg}</div>
                </div>
                <div className="flex-1 bg-[#001a0d]/70 backdrop-blur-2xl rounded-2xl p-4 border border-emerald-500/20 border-l-4 border-l-red-500 shadow-xl relative overflow-hidden">
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-40 flex items-center justify-center bg-[#000a05]/90 backdrop-blur-xl">
                        <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", damping: 20, stiffness: 100 }} className="text-center p-10 w-full max-w-lg rounded-[40px] border border-emerald-500/20 bg-gradient-to-b from-[#001a0d]/90 to-black shadow-[0_50px_100px_rgba(0,255,170,0.3)] relative overflow-hidden">

                            {/* Background Glows */}
                            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 blur-[80px] opacity-30 ${gameState === 'SUCCESS' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>

                            <div className={`w-28 h-28 mx-auto mb-8 rounded-full flex items-center justify-center relative z-10 ${gameState === 'SUCCESS' ? 'bg-emerald-900/40 border-2 border-emerald-400 shadow-[0_0_40px_rgba(0,255,170,0.4)]' : 'bg-red-900/40 border-2 border-red-500 shadow-[0_0_40px_rgba(255,0,0,0.4)]'}`}>
                                {gameState === 'SUCCESS' ? <CheckCircle className="w-14 h-14 text-emerald-400 drop-shadow-md" /> : <SkullIcon className="w-14 h-14 text-red-400 drop-shadow-md" />}
                            </div>

                            <h2 className={`text-4xl sm:text-6xl font-black uppercase tracking-tighter mb-4 relative z-10 ${gameState === 'SUCCESS' ? 'text-transparent bg-clip-text bg-gradient-to-b from-white to-emerald-400' : 'text-transparent bg-clip-text bg-gradient-to-b from-white to-red-600'}`} style={{ textShadow: gameState === 'SUCCESS' ? '0 10px 30px rgba(0,255,170,0.4)' : '0 10px 30px rgba(255,0,0,0.4)' }}>
                                {gameState === 'SUCCESS' ? t('game.state.system_secured') : t('game.state.breach_detected')}
                            </h2>

                            <div className="bg-black/60 rounded-2xl p-6 border border-white/5 mb-8 relative z-10">
                                <div className="text-sm text-gray-400 uppercase tracking-widest font-bold mb-1">Total Routed</div>
                                <div className="text-5xl text-white font-mono font-black tabular-nums">{score.toLocaleString()}</div>
                                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                                    <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Target</span>
                                    <span className="text-xl text-emerald-400 font-black italic">{targetScore.toLocaleString()}</span>
                                </div>
                            </div>

                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium Lazarus 3D Canvas */}
            <div className={`absolute inset-0 z-0 cursor-crosshair ${gameState !== 'PLAYING' ? 'pointer-events-none' : ''}`} onClick={handleInteract}>
                <Canvas camera={{ position: [0, 0, 12], fov: 60 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}>
                    <color attach="background" args={['#000a05']} />
                    <fog attach="fog" args={['#000a05', 8, 25]} />

                    <Environment preset="city" />
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[10, 10, 10]} intensity={2.5} color="#00ffaa" />
                    <directionalLight position={[-10, -10, -10]} intensity={1.5} color="#00aaff" />
                    <pointLight position={[0, -5, 0]} intensity={2} color="#00ffaa" />

                    {/* Cyberspace Terminal Grid Floor */}
                    <Grid position={[0, -6, 0]} args={[50, 50]} cellSize={1} cellThickness={1.5} cellColor="#00ffaa" sectionSize={5} sectionThickness={2.5} sectionColor="#00aaff" fadeDistance={30} fadeStrength={1.5} />

                    <CameraRig intensity={camShake} />

                    <QuantumCore isActive={activeNode} coreColor={coreColor} accentColor={accentColor} />

                    {/* Matrix Falling Data Streams */}
                    <DataStreams />

                    {/* Floating Text Effects */}
                    {effects.map(eff => (
                        <FloatingScore key={eff.id} id={eff.id} position={eff.position} text={eff.text} color={eff.color} onComplete={removeEffect} />
                    ))}

                    <ContactShadows position={[0, -5.9, 0]} opacity={0.8} scale={30} blur={2.5} far={15} resolution={512} color="#001100" />

                    <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.8} maxPolarAngle={Math.PI / 1.5} minPolarAngle={Math.PI / 3} />

                    <EffectComposer enableNormalPass={false}>
                        <Bloom luminanceThreshold={0.4} mipmapBlur intensity={score > 0 ? 1.5 + (score / targetScore) : 1.5} />
                        <DepthOfField focusDistance={0.02} focalLength={0.05} bokehScale={3} height={480} />
                        <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.003 + (activeNode ? 0.005 : 0), 0.003)} radialModulation={false} modulationOffset={0} />
                        <Noise opacity={0.06} />
                        <Vignette eskil={false} offset={0.1} darkness={1.2} />
                        {(glitchActive || activeNode) && (<Glitch delay={new THREE.Vector2(0, 0)} duration={new THREE.Vector2(0.1, 0.3)} mode={GlitchMode.SPORADIC} active ratio={0.6} />)}
                    </EffectComposer>
                </Canvas>
            </div>
        </div>
    );
};

export default LazarusVector;
