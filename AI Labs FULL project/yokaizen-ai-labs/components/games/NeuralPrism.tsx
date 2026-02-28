/// <reference types="@react-three/fiber" />
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float, Octahedron, Sphere, ContactShadows, SpotLight, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch, Noise, Vignette, DepthOfField } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import { Cpu, Zap, Activity, CheckCircle, SkullIcon, Target, Shield, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { Difficulty, Language, UserStats } from '../../types';
import { audio } from '../../services/audioService';
import { useDialogue } from '../../contexts/DialogueContext';

export interface NeuralPrismProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: Difficulty;
    t: (key: string) => string;
}

// --------------------------------------------------------
// AAA 3D Components
// --------------------------------------------------------

const PALETTE = ['#00ffff', '#a855f7', '#ff00aa', '#10b981']; // Cyan, Amethyst, Hot Pink, Emerald

const PrismCrystal = ({ position, rotation, currentColor, targetColor, isAligned, onClick, id }: any) => {
    const groupRef = useRef<THREE.Group>(null);
    const coreRef = useRef<THREE.Mesh>(null);
    const ringRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state, delta) => {
        const t = state.clock.elapsedTime;
        if (groupRef.current) {
            groupRef.current.rotation.y += delta * (isAligned ? 1.5 : 0.2);
            groupRef.current.rotation.x += delta * (isAligned ? 0.8 : 0.1);

            const targetScale = hovered ? 1.2 : 1.0;
            const pulse = isAligned ? 1 + Math.sin(t * 5 + id) * 0.1 : 1;
            groupRef.current.scale.lerp(new THREE.Vector3().setScalar(targetScale * pulse), 0.15);
        }
        if (ringRef.current) {
            ringRef.current.rotation.x = t * 0.5 + id;
            ringRef.current.rotation.y = t * 0.8 + id;
            ringRef.current.scale.setScalar(isAligned ? 0 : 1); // shrink ring if aligned
        }
    });

    return (
        <Float floatIntensity={isAligned ? 0.5 : 2} rotationIntensity={isAligned ? 0.2 : 1.5} speed={isAligned ? 3 : 2}>
            <group
                position={position}
                onClick={(e) => { e.stopPropagation(); onClick(id, position, currentColor); }}
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
                onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'default'; }}>

                {/* Target Alignment Orbital Ring */}
                {!isAligned && (
                    <mesh ref={ringRef}>
                        <torusGeometry args={[1.5, 0.03, 16, 64]} />
                        <meshBasicMaterial color={targetColor} transparent opacity={0.6} blending={THREE.AdditiveBlending} />
                    </mesh>
                )}

                {/* Glass Prism Hull */}
                <group ref={groupRef} rotation={rotation}>
                    <mesh>
                        <octahedronGeometry args={[1, 0]} />
                        <meshPhysicalMaterial
                            color={currentColor} transmission={0.9} ior={1.6} thickness={1.5} roughness={0.05} metalness={0.1}
                            clearcoat={1} clearcoatRoughness={0.1} emissive={isAligned ? currentColor : '#000000'} emissiveIntensity={isAligned ? 1 : 0}
                        />
                    </mesh>

                    {/* Emissive Core */}
                    <mesh ref={coreRef}>
                        <octahedronGeometry args={[0.3, 0]} />
                        <meshBasicMaterial color={currentColor} transparent opacity={isAligned ? 1 : 0.6} />
                    </mesh>
                </group>

                <pointLight distance={8} intensity={isAligned ? 8 : (hovered ? 4 : 2)} color={currentColor} />
            </group>
        </Float>
    );
};

const LightBeam = ({ start, end, active, color }: any) => {
    const ref = useRef<THREE.Group>(null);
    const startVec = useMemo(() => new THREE.Vector3(...start), [start]);
    const endVec = useMemo(() => new THREE.Vector3(...end), [end]);
    const distance = startVec.distanceTo(endVec);
    const position = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);

    useFrame(({ clock }) => {
        if (ref.current && active) {
            ref.current.lookAt(endVec);
            ref.current.rotation.z = clock.elapsedTime * 5; // Spin the beam core
        }
    });

    if (!active) return null;

    return (
        <group ref={ref} position={position}>
            {/* Core tight beam */}
            <mesh rotation-x={Math.PI / 2}>
                <cylinderGeometry args={[0.08, 0.08, distance, 16]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.9} blending={THREE.AdditiveBlending} />
            </mesh>
            {/* Outer soft glow beam */}
            <mesh rotation-x={Math.PI / 2}>
                <cylinderGeometry args={[0.25, 0.25, distance, 16]} />
                <meshBasicMaterial color={color} transparent opacity={0.4} blending={THREE.AdditiveBlending} />
            </mesh>
        </group>
    );
};

const CentralNeuralCore = ({ isFullyAligned }: { isFullyAligned: boolean }) => {
    const coreRef = useRef<THREE.Mesh>(null);
    const geoRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (coreRef.current) {
            const pulse = 1 + Math.sin(t * (isFullyAligned ? 8 : 2)) * 0.1;
            coreRef.current.scale.setScalar(pulse);
        }
        if (geoRef.current) {
            geoRef.current.rotation.x = t * 0.2;
            geoRef.current.rotation.y = t * 0.3;
        }
    });

    return (
        <group>
            <mesh ref={coreRef}>
                <sphereGeometry args={[1.2, 64, 64]} />
                <meshBasicMaterial color={isFullyAligned ? "#ffffff" : "#00ffff"} />
            </mesh>
            <mesh ref={geoRef}>
                <icosahedronGeometry args={[1.8, 1]} />
                <meshBasicMaterial color={isFullyAligned ? "#ffffff" : "#00ffff"} wireframe transparent opacity={0.2} blending={THREE.AdditiveBlending} />
            </mesh>
            <pointLight distance={20} intensity={isFullyAligned ? 20 : 8} color={isFullyAligned ? "#ffffff" : "#00ffff"} />
        </group>
    );
};

const FloatingScore = ({ position, text, color, onComplete }: any) => {
    const ref = useRef<THREE.Group>(null);
    const [life, setLife] = useState(0);
    useFrame((_, d) => {
        if (!ref.current) return;
        setLife(l => l + d * 2);
        ref.current.position.y += d * 3;
        ref.current.position.x += d * (Math.random() - 0.5);
        ref.current.scale.setScalar(Math.max(0, 1 - life * 0.5));
        if (life > 2) onComplete();
    });
    return (
        <group ref={ref} position={position}>
            <Text color={color} fontSize={0.8} font="https://fonts.gstatic.com/s/syncopate/v13/pe0sMIuPIYBCpEV5eFdCBfe_m_s.woff" anchorX="center" anchorY="middle" outlineWidth={0.05} outlineColor="#000000">{text}</Text>
        </group>
    );
};

// --------------------------------------------------------
// Main Game Component
// --------------------------------------------------------
export const NeuralPrism: React.FC<NeuralPrismProps> = ({ onComplete, difficulty, t }) => {
    const { queueDialogue } = useDialogue();
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(difficulty === 'Elite' ? 60 : 120);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');

    // UI Effects
    const [effects, setEffects] = useState<any[]>([]);
    const [screenFlash, setScreenFlash] = useState<string | null>(null);

    // Agents
    const [advisorMsg, setAdvisorMsg] = useState('Analyzing neural encryption...');
    const [adversaryMsg, setAdversaryMsg] = useState('Firewalls active. Signal dropping.');
    const [glitchActive, setGlitchActive] = useState(false);

    // Prism States
    const numPrisms = difficulty === 'Elite' ? 8 : 6;
    const initialPrisms = useMemo(() => {
        return Array.from({ length: numPrisms }).map((_, i) => ({
            id: i,
            position: [
                (Math.random() - 0.5) * 12,
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 4
            ] as [number, number, number],
            targetColor: PALETTE[Math.floor(Math.random() * PALETTE.length)],
            currentColor: PALETTE[Math.floor(Math.random() * PALETTE.length)],
            rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] as [number, number, number]
        }));
    }, [numPrisms]);

    const ObjectCenter: [number, number, number] = [0, 0, 0];
    const [prisms, setPrisms] = useState(initialPrisms);
    const isFullyAligned = useMemo(() => prisms.every(p => p.currentColor === p.targetColor), [prisms]);

    // Narrative Briefing
    useEffect(() => {
        queueDialogue([
            { id: `np-brief-${Date.now()}`, character: 'ATHENA', text: t('game.instructions.neural_brief') || 'Cycle the refracting prisms to match their orbital targets. We need full neural alignment.' },
            { id: `np-brief2-${Date.now()}`, character: 'SYNTAX', text: t('game.instructions.neural_warn') || 'Signal decay imminent. Accelerate.', isGlitchy: true },
        ]);
    }, [queueDialogue, t]);

    // Agent lines
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const aLines = ['Prism resonance increasing.', 'Nodes linking to center core.', 'Keep cycling the spectrum.', 'We are cutting through the noise.'];
        const eLines = ['Signal decay at 40%.', 'Entropy is rewriting your alignments.', 'You are out of phase.', 'The prism matrix will collapse.'];
        const iv = setInterval(() => {
            if (Math.random() > 0.6) { setAdversaryMsg(eLines[Math.floor(Math.random() * eLines.length)]); audio.playSystemMessage?.({ type: 'warning' }); setGlitchActive(true); setTimeout(() => setGlitchActive(false), 400) }
            else { setAdvisorMsg(aLines[Math.floor(Math.random() * aLines.length)]); audio.playSystemMessage?.({ type: 'success' }); }
        }, 6000);
        return () => clearInterval(iv);
    }, [gameState]);

    // Timer
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setGameState('FAILED');
                    audio.playError();
                    queueDialogue([{ id: `np-fail-${Date.now()}`, character: 'BYTE', text: 'Token Collapse. Neural link severed.', isGlitchy: true }]);
                    onComplete(score, { completionTime: (difficulty === 'Elite' ? 60 : 120), difficulty });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, score, difficulty, onComplete, queueDialogue]);

    // Prism Interaction
    const handlePrismClick = useCallback((id: number, pos: [number, number, number], oldColor: string) => {
        if (gameState !== 'PLAYING') return;
        audio.playClick();

        let newColor = oldColor;
        let nowAligned = false;

        setPrisms(prev => prev.map(p => {
            if (p.id === id) {
                const cIdx = PALETTE.indexOf(p.currentColor);
                newColor = PALETTE[(cIdx + 1) % PALETTE.length];
                nowAligned = (newColor === p.targetColor);
                return { ...p, currentColor: newColor };
            }
            return p;
        }));

        setScreenFlash(`${newColor}22`);
        setTimeout(() => setScreenFlash(null), 100);

        const pts = nowAligned ? 100 : 10;
        setScore(s => s + pts);

        const effId = `${Date.now()}-${Math.random()}`;
        setEffects(prev => [...prev,
        { id: `sc-${effId}`, type: 'score', position: [pos[0], pos[1] + 1, pos[2]], text: nowAligned ? 'LINK ESTABLISHED' : 'CYCLE', color: newColor }
        ]);

        if (nowAligned) audio.playSystemMessage?.({ type: 'success' });

        // Win Check
        setTimeout(() => {
            setPrisms(current => {
                const allAligned = current.every(p => p.currentColor === p.targetColor);
                if (allAligned && gameState === 'PLAYING') {
                    setGameState('SUCCESS');
                    audio.playSuccess();
                    setScreenFlash('rgba(255,255,255,0.4)');
                    const winScore = score + pts + (timeLeft * 20) + (difficulty === 'Elite' ? 1500 : 800);
                    setScore(winScore);
                    queueDialogue([{ id: `np-win-${Date.now()}`, character: 'ATHENA', text: 'Semantic Alignment Perfected. Broadcast Intercepted.' }]);
                    onComplete(winScore, { completionTime: (difficulty === 'Elite' ? 60 : 120) - timeLeft, difficulty });
                }
                return current;
            });
        }, 150);
    }, [gameState, score, difficulty, timeLeft, onComplete, queueDialogue]);

    const removeEffect = useCallback((id: string) => setEffects(p => p.filter(e => e.id !== id)), []);

    return (
        <div className="relative w-full h-[700px] rounded-[32px] overflow-hidden border border-[#00ffff]/20 bg-[#010204] shadow-[0_0_60px_rgba(0,255,255,0.1)] font-sans">
            <AnimatePresence>
                {screenFlash && (<motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="absolute inset-0 z-30 pointer-events-none mix-blend-screen" style={{ backgroundColor: screenFlash }} />)}
            </AnimatePresence>

            {/* AAA Glassmorphic HUD */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
                <div className="flex flex-col gap-4 filter drop-shadow-xl">
                    <div className="bg-[#05101a]/70 backdrop-blur-2xl rounded-2xl p-4 border border-[#00ffff]/30 shadow-[0_10px_30px_rgba(0,255,255,0.15)] relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#00ffff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center gap-2 text-[#00ffff] mb-1">
                            <Activity className="w-5 h-5 animate-pulse" />
                            <span className="text-xs uppercase tracking-[0.2em] font-black text-[#aaffff]">Neural Decryption</span>
                        </div>
                        <motion.div key={score} initial={{ y: -5, opacity: 0.5 }} animate={{ y: 0, opacity: 1 }} className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#00ffff] tabular-nums uppercase tracking-tighter" style={{ textShadow: '0 0 20px rgba(0,255,255,0.4)' }}>
                            {score.toLocaleString()}
                        </motion.div>
                        <div className="mt-2 text-[10px] text-[#00ffff]/60 uppercase tracking-widest font-bold">
                            Alignments: {prisms.filter(p => p.currentColor === p.targetColor).length} / {numPrisms}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-4 filter drop-shadow-xl">
                    <div className="bg-[#05101a]/70 backdrop-blur-2xl rounded-2xl p-4 border border-[#ff00aa]/30 shadow-[0_10px_30px_rgba(255,0,170,0.15)] min-w-[140px] text-right">
                        <div className="flex items-center justify-end gap-2 text-[#ff00aa] mb-1">
                            <span className="text-xs uppercase tracking-[0.2em] font-black">{t('game.hud.time')}</span>
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className={`text-4xl font-black tabular-nums tracking-tighter ${timeLeft <= 15 ? 'text-transparent bg-clip-text bg-gradient-to-r from-[#ff0000] to-[#ff00aa] animate-pulse' : 'text-transparent bg-clip-text bg-gradient-to-r from-white to-[#ff00aa]'}`} style={{ textShadow: timeLeft <= 15 ? '0 0 20px rgba(255,0,0,0.6)' : '0 0 20px rgba(255,0,170,0.4)' }}>
                            {timeLeft}s
                        </div>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border backdrop-blur-md ${difficulty === 'Elite' ? 'border-[#ff0055]/50 text-[#ff0055] bg-[#ff0055]/10 shadow-[0_0_15px_rgba(255,0,85,0.4)]' : 'border-[#00ffff]/50 text-[#00ffff] bg-[#00ffff]/10 shadow-[0_0_15px_rgba(0,255,255,0.4)]'}`}>
                        {difficulty}
                    </div>
                </div>
            </div>

            {/* Agent Comms Panel */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row gap-4 z-10 pointer-events-none">
                <div className="flex-1 bg-[#05101a]/80 backdrop-blur-2xl rounded-2xl p-4 border border-[#00ffff]/20 border-l-4 border-l-[#00ffff] shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#00ffff]/10 rounded-full blur-[30px] -translate-y-1/2 translate-x-1/2"></div>
                    <div className="text-[10px] text-[#00ffff] mb-2 uppercase tracking-[0.2em] font-black flex items-center gap-2"><Shield className="w-4 h-4" /> {t('game.advisor.label') || 'ADVISOR'}</div>
                    <div className="text-sm text-[#ccffff]/90 font-mono leading-relaxed relative z-10">{advisorMsg}</div>
                </div>
                <div className="flex-1 bg-[#05101a]/80 backdrop-blur-2xl rounded-2xl p-4 border border-[#00ffff]/20 border-l-4 border-l-[#ff00aa] shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff00aa]/10 rounded-full blur-[30px] -translate-y-1/2 translate-x-1/2"></div>
                    <div className="text-[10px] text-[#ff00aa] mb-2 uppercase tracking-[0.2em] font-black flex items-center gap-2"><Zap className="w-4 h-4" /> {t('game.adversary.label') || 'ADVERSARY'}</div>
                    <div className="text-sm text-[#ffccff]/90 font-mono leading-relaxed relative z-10">{adversaryMsg}</div>
                </div>
            </div>

            {/* Game Over Cinematic Screen */}
            <AnimatePresence>
                {gameState !== 'PLAYING' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-40 flex items-center justify-center bg-[#010204]/95 backdrop-blur-xl">
                        <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", damping: 20 }} className="text-center p-10 w-full max-w-lg rounded-[40px] border border-[#00ffff]/30 bg-gradient-to-b from-[#05101a]/90 to-black shadow-[0_50px_100px_rgba(0,255,255,0.2)] relative overflow-hidden pointer-events-auto">

                            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 blur-[80px] opacity-30 ${gameState === 'SUCCESS' ? 'bg-[#00ffff]' : 'bg-[#ff0000]'}`}></div>

                            <div className={`w-28 h-28 mx-auto mb-8 rounded-full flex items-center justify-center relative z-10 ${gameState === 'SUCCESS' ? 'bg-[#00ffff]/20 border-2 border-[#00ffff] shadow-[0_0_40px_rgba(0,255,255,0.5)]' : 'bg-[#ff0000]/20 border-2 border-[#ff0000] shadow-[0_0_40px_rgba(255,0,0,0.4)]'}`}>
                                {gameState === 'SUCCESS' ? <CheckCircle className="w-14 h-14 text-[#00ffff] drop-shadow-md" /> : <SkullIcon className="w-14 h-14 text-[#ff0000] drop-shadow-md" />}
                            </div>

                            <h2 className={`text-4xl sm:text-5xl font-black uppercase tracking-tighter mb-4 relative z-10 ${gameState === 'SUCCESS' ? 'text-transparent bg-clip-text bg-gradient-to-b from-white to-[#00ffff]' : 'text-transparent bg-clip-text bg-gradient-to-b from-white to-[#ff0000]'}`} style={{ textShadow: gameState === 'SUCCESS' ? '0 10px 30px rgba(0,255,255,0.4)' : '0 10px 30px rgba(255,0,0,0.4)' }}>
                                {gameState === 'SUCCESS' ? 'LINK INTERCEPTED' : 'SIGNAL LOST'}
                            </h2>

                            <div className="bg-black/60 rounded-2xl p-6 border border-[#00ffff]/20 mb-8 relative z-10">
                                <div className="text-sm text-[#ff00aa] uppercase tracking-widest font-bold mb-1">Final Decryption Yield</div>
                                <div className="text-5xl text-white font-mono font-black tabular-nums">{score.toLocaleString()}</div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium 3D Canvas */}
            <div className={`absolute inset-0 z-0 ${gameState !== 'PLAYING' ? 'pointer-events-none' : ''}`}>
                <Canvas camera={{ position: [0, 0, 18], fov: 60 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}>
                    <color attach="background" args={['#010204']} />
                    <fog attach="fog" args={['#010204', 15, 40]} />

                    <ambientLight intensity={0.5} />
                    <SpotLight position={[0, 20, 0]} intensity={5} color="#00ffff" angle={1} penumbra={1} distance={50} castShadow />
                    <SpotLight position={[0, -20, 0]} intensity={3} color="#ff00aa" angle={1} penumbra={1} distance={50} />

                    <CentralNeuralCore isFullyAligned={isFullyAligned} />

                    <group>
                        {prisms.map((p) => {
                            const isAligned = p.currentColor === p.targetColor;
                            return (
                                <React.Fragment key={p.id}>
                                    <PrismCrystal id={p.id} position={p.position} rotation={p.rotation} currentColor={p.currentColor} targetColor={p.targetColor} isAligned={isAligned} onClick={handlePrismClick} />
                                    <LightBeam start={ObjectCenter} end={p.position} active={isAligned} color={p.targetColor} />
                                </React.Fragment>
                            );
                        })}
                    </group>

                    <Sparkles count={500} scale={[40, 40, 40]} size={4} speed={0.2} opacity={0.3} color="#ffffff" noise={2} />
                    <Sparkles count={200} scale={[25, 25, 25]} size={8} speed={0.8} opacity={0.6} color="#00ffff" noise={2} />

                    {effects.map(eff => eff.type === 'score' && (
                        <FloatingScore key={eff.id} position={eff.position} text={eff.text} color={eff.color} onComplete={() => removeEffect(eff.id)} />
                    ))}

                    <OrbitControls enableZoom={true} enablePan={true} maxDistance={30} minDistance={10} autoRotate={gameState === 'PLAYING'} autoRotateSpeed={0.5} />

                    <EffectComposer enableNormalPass={false}>
                        <Bloom luminanceThreshold={0.4} mipmapBlur intensity={isFullyAligned ? 3 : 1.5} />
                        <DepthOfField focusDistance={0.06} focalLength={0.08} bokehScale={5} height={480} />
                        <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.003, 0.003)} />
                        <Noise opacity={0.08} />
                        <Vignette eskil={false} offset={0.1} darkness={1.2} />
                        {glitchActive && (<Glitch delay={new THREE.Vector2(0, 0)} duration={new THREE.Vector2(0.1, 0.4)} mode={GlitchMode.SPORADIC} active ratio={0.5} />)}
                    </EffectComposer>
                </Canvas>
            </div>
        </div>
    );
};

export default NeuralPrism;
