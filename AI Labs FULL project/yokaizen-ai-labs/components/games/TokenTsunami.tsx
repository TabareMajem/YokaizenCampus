import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Octahedron, TorusKnot, MeshDistortMaterial, Float, Text, Sparkles, MeshTransmissionMaterial, Sphere } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch, Vignette, Noise } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Activity, Shield, AlertTriangle, Zap, Terminal, Cpu, Database } from 'lucide-react';
import { audio } from '../../services/audioService';

export interface TokenTsunamiProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

// -------------------------------------------------------------------------------------------------
// AAA VISUAL COMPONENTS
// -------------------------------------------------------------------------------------------------

// The Data Tsunami (Particle Storm)
const DataTsunami = ({ isProcessing, intensity }: { isProcessing: boolean, intensity: number }) => {
    const pointsRef = useRef<THREE.Points>(null);
    const count = 2000;

    // Create matrix-like particle positions
    const [positions, colors] = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const col = new Float32Array(count * 3);
        const colorBase = new THREE.Color();
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 40;     // X
            pos[i * 3 + 1] = (Math.random() - 0.5) * 40; // Y
            pos[i * 3 + 2] = (Math.random() - 0.5) * 40; // Z

            // Matrix green/cyan mix
            const mix = Math.random();
            colorBase.setHSL(0.4 + mix * 0.15, 1.0, 0.4 + Math.random() * 0.4);
            col[i * 3] = colorBase.r;
            col[i * 3 + 1] = colorBase.g;
            col[i * 3 + 2] = colorBase.b;
        }
        return [pos, col];
    }, [count]);

    useFrame((state) => {
        if (!pointsRef.current) return;
        const time = state.clock.elapsedTime;

        // Swirl around the center
        pointsRef.current.rotation.y = time * (0.1 + intensity * 0.2);
        pointsRef.current.rotation.x = Math.sin(time * 0.2) * 0.5;

        // When processing (clicked), pull particles inwards rapidly
        if (isProcessing) {
            const scale = Math.max(0.1, pointsRef.current.scale.x - 0.05);
            pointsRef.current.scale.set(scale, scale, scale);
        } else {
            const scale = Math.min(1.0, pointsRef.current.scale.x + 0.02);
            pointsRef.current.scale.set(scale, scale, scale);
        }
    });

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
                <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={0.15} vertexColors transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.6 + intensity * 0.3} />
        </points>
    );
};

// Context Core (The Buffer)
const ContextCore = ({ active, loadPercentage }: { active: boolean, loadPercentage: number }) => {
    const groupRef = useRef<THREE.Group>(null);
    const coreRef = useRef<THREE.Mesh>(null);

    useFrame((state, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.x += delta * (0.5 + loadPercentage);
            groupRef.current.rotation.y += delta * (0.2 + loadPercentage);
        }
        if (coreRef.current) {
            // Pulse based on load
            const pulse = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.05 * loadPercentage;
            coreRef.current.scale.setScalar(pulse);
        }
    });

    // Dark-green to Bright-cyan based on load
    const color = useMemo(() => new THREE.Color().setHSL(0.4 + (1 - loadPercentage) * 0.1, 1, 0.3 + loadPercentage * 0.5), [loadPercentage]);

    return (
        <group ref={groupRef}>
            <Float floatIntensity={2} speed={3}>
                {/* Outer Shell (Glassy Torus Knot representing the context window bounds) */}
                <TorusKnot args={[2.5, 0.4, 256, 32]} scale={active ? 1.05 : 1}>
                    <MeshTransmissionMaterial
                        color={color}
                        thickness={1.5}
                        roughness={0.1}
                        transmission={0.9}
                        ior={1.5}
                        chromaticAberration={0.05}
                        distortion={active ? 0.8 : 0.2 + loadPercentage * 0.5}
                        distortionScale={0.5}
                    />
                </TorusKnot>

                {/* Inner Core (The actual loaded tokens) */}
                <Octahedron ref={coreRef} args={[1.5, 2]}>
                    <MeshDistortMaterial
                        color={active ? "#ffffff" : color}
                        distort={0.4 + loadPercentage * 0.4}
                        speed={2 + loadPercentage * 5}
                        metalness={0.8}
                        roughness={0.2}
                        wireframe={loadPercentage > 0.8}
                    />
                </Octahedron>
            </Float>
        </group>
    );
};

// Floating Combat Text for Interaction Feedback
const ReactionText = ({ text, position }: { text: string, position: [number, number, number] }) => {
    const textRef = useRef<any>();
    const [opacity, setOpacity] = useState(1);
    const [pos, setPos] = useState(position);

    useFrame((_, delta) => {
        if (opacity > 0) {
            setOpacity(prev => Math.max(0, prev - delta * 1.5));
            setPos([pos[0], pos[1] + delta * 3, pos[2]]);
        }
    });

    if (opacity <= 0) return null;

    return (
        <Text
            ref={textRef}
            position={pos}
            fontSize={0.8}
            color="#4ade80" // neon green
            font="https://fonts.gstatic.com/s/orbitron/v25/yVbYKJqEIfcweOX2.woff"
            material-transparent
            material-opacity={opacity}
            outlineWidth={0.05}
            outlineColor="#000000"
        >
            {text}
        </Text>
    );
};

// -------------------------------------------------------------------------------------------------
// MAIN COMPONENT
// -------------------------------------------------------------------------------------------------

export const TokenTsunami: React.FC<TokenTsunamiProps> = ({ onComplete, difficulty, t }) => {
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');
    const [isProcessing, setIsProcessing] = useState(false);
    const [reactions, setReactions] = useState<{ id: number, text: string, pos: [number, number, number] }[]>([]);

    // Multi-Agent Flow Logic State
    const [advisorMsg, setAdvisorMsg] = useState('Initialize buffer compression router.');
    const [adversaryMsg, setAdversaryMsg] = useState('Flooding context window...');
    const [glitchActive, setGlitchActive] = useState(false);

    const MAX_SCORE = 1500;
    const loadPercentage = score / MAX_SCORE;

    // Background Tsunami Growth
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        // Passive score (tsunami) increases slowly, user must click to "process" and gain score
        // Wait, the original game logic: "setScore(s => s + 50)" on click.
        // Let's keep it simple: player clicks to process tokens.
    }, [gameState]);

    // Multi-Agent Simulation Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        const advisorLines = [
            'Context compression at optimum levels.',
            'Keep shifting data fragments into the buffer.',
            'Adversary attempting to overflow logic gates.',
            'Buffer stability maintaining. Do not stop.'
        ];

        const adversaryLines = [
            'Your context window is too small for me.',
            'I am generating infinite recursive loops.',
            'Memory limits approaching. Entropy rises.',
            'You cannot process this Tsunami.'
        ];

        const agentInterval = setInterval(() => {
            const isAdversary = Math.random() > 0.6;
            if (isAdversary) {
                setAdversaryMsg(adversaryLines[Math.floor(Math.random() * adversaryLines.length)]);
                audio.playSystemMessage({ type: 'warning' });
                // Glitch effect on adversary action
                setGlitchActive(true);
                setTimeout(() => setGlitchActive(false), 800);
            } else {
                setAdvisorMsg(advisorLines[Math.floor(Math.random() * advisorLines.length)]);
                audio.playSystemMessage({ type: 'success' });
            }
        }, 5500);

        return () => clearInterval(agentInterval);
    }, [gameState]);

    // Timer Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    const isWin = score >= 1000;
                    setGameState(isWin ? 'SUCCESS' : 'FAILED');
                    onComplete(isWin ? score : 0, { completionTime: 60 - prev, difficulty });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, score, onComplete, difficulty]);

    const handleInteract = () => {
        if (gameState !== 'PLAYING') return;
        audio.playTyping();
        setIsProcessing(true);

        // Add floating text
        const amount = Math.floor(Math.random() * 20) + 40;
        setScore(s => Math.min(MAX_SCORE, s + amount));

        const newReaction = {
            id: Date.now() + Math.random(),
            text: `+${amount} TOKENS`,
            pos: [(Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, 2] as [number, number, number]
        };
        setReactions(prev => [...prev, newReaction]);

        setTimeout(() => setIsProcessing(false), 150);

        if (score + amount >= MAX_SCORE) {
            setGameState('SUCCESS');
            onComplete(MAX_SCORE, { completionTime: 60 - timeLeft, difficulty });
        }
    };

    return (
        <div className="relative w-full h-[600px] rounded-xl overflow-hidden bg-black shadow-[0_0_40px_rgba(16,185,129,0.2)] font-mono">
            {/* Holographic Top UI Overlay */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
                {/* Score / Context Buffer Indicator */}
                <div className="flex flex-col gap-2 w-1/3">
                    <div className="bg-emerald-950/60 backdrop-blur-md rounded-lg p-3 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)] relative overflow-hidden">
                        <div className="absolute top-0 left-0 h-1 bg-emerald-500 shadow-[0_0_10px_#10b981]" style={{ width: `${loadPercentage * 100}%`, transition: 'width 0.2s' }} />
                        <div className="flex items-center gap-2 text-emerald-400 mb-1">
                            <Database className="w-5 h-5" />
                            <span className="text-sm uppercase tracking-widest font-black">Context Buffer</span>
                        </div>
                        <div className="text-3xl font-black text-white">{score} <span className="text-emerald-500/50 text-lg">/ {MAX_SCORE}</span></div>
                    </div>
                </div>

                {/* Timer Indicator */}
                <div className="bg-sky-950/60 backdrop-blur-md rounded-lg p-3 border border-sky-500/50 flex flex-col items-end shadow-[0_0_15px_rgba(14,165,233,0.3)]">
                    <div className="flex items-center gap-2 text-sky-400 mb-1">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="text-sm uppercase tracking-widest font-black">System Clock</span>
                    </div>
                    <div className="text-3xl font-black text-white tracking-widest">{timeLeft}s</div>
                </div>
            </div>

            {/* Middle Prompt / Interaction hint */}
            {gameState === 'PLAYING' && score === 0 && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 animate-pulse text-emerald-400/50 font-black tracking-widest text-2xl text-center">
                    [ CLICK TO PROCESS DATA STREAM ]
                </div>
            )}

            {/* Bottom Screen Agent Terminals */}
            <div className="absolute bottom-6 left-6 right-6 flex gap-6 z-10 pointer-events-none">
                <div className="flex-1 bg-black/80 backdrop-blur-xl rounded-lg p-4 border border-emerald-500/30 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
                    <div className="text-xs text-emerald-400 mb-2 uppercase tracking-widest font-black flex items-center gap-2">
                        <Shield className="w-4 h-4" /> Advisor Unit
                    </div>
                    <div className="text-sm text-emerald-100/90 font-mono tracking-wide typing-animation">{advisorMsg}</div>
                </div>
                <div className="flex-1 bg-black/80 backdrop-blur-xl rounded-lg p-4 border border-rose-500/30 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 shadow-[0_0_10px_#f43f5e]"></div>
                    <div className="text-xs text-rose-500 mb-2 uppercase tracking-widest font-black flex items-center gap-2">
                        <Zap className="w-4 h-4" /> Entropy Daemon
                    </div>
                    <div className="text-sm text-rose-100/90 font-mono tracking-wide typing-animation">{adversaryMsg}</div>
                </div>
            </div>

            {/* Game Over Cinematic Screens */}
            {gameState !== 'PLAYING' && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/90 backdrop-blur-md">
                    <div className="text-center animate-in fade-in zoom-in duration-500">
                        {gameState === 'SUCCESS' ? (
                            <>
                                <div className="text-7xl font-black uppercase tracking-tighter mb-4 text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.8)]">
                                    BUFFER SECURED
                                </div>
                                <Activity className="w-24 h-24 text-emerald-400 mx-auto mb-6 animate-pulse" />
                            </>
                        ) : (
                            <>
                                <div className="text-7xl font-black uppercase tracking-tighter mb-4 text-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.8)]">
                                    OVERFLOW ERROR
                                </div>
                                <AlertTriangle className="w-24 h-24 text-rose-500 mx-auto mb-6 animate-bounce" />
                            </>
                        )}
                        <div className="text-2xl text-white/80 font-mono uppercase tracking-widest">
                            Processed Tokens: <span className="text-white font-black">{score}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* 3D WebGL Interaction Layer */}
            <div className="absolute inset-0 z-0 cursor-crosshair" onClick={handleInteract}>
                <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
                    <color attach="background" args={['#020617']} /> {/* slate-950 */}

                    <ambientLight intensity={0.2} />
                    <pointLight position={[10, 10, 10]} intensity={2} color="#10b981" />
                    <pointLight position={[-10, -10, -10]} intensity={1} color="#0ea5e9" />

                    {/* The massive surrounding particle cloud */}
                    <DataTsunami isProcessing={isProcessing} intensity={loadPercentage} />

                    {/* The central absorbing core */}
                    <ContextCore active={isProcessing} loadPercentage={loadPercentage} />

                    {/* Feedback Texts */}
                    {reactions.map(r => (
                        <ReactionText key={r.id} text={r.text} position={r.pos} />
                    ))}

                    {/* Camera subtle breathing */}
                    <OrbitControls
                        enableZoom={false}
                        enablePan={false}
                        autoRotate={!isProcessing}
                        autoRotateSpeed={1 + loadPercentage * 4}
                        maxPolarAngle={Math.PI / 1.5}
                        minPolarAngle={Math.PI / 3}
                    />

                    {/* Cyberpunk Post-Processing */}
                    <EffectComposer>
                        <Bloom
                            luminanceThreshold={0.2}
                            luminanceSmoothing={0.9}
                            intensity={2.0 + loadPercentage}
                            kernelSize={3}
                            mipmapBlur
                        />
                        <ChromaticAberration
                            blendFunction={BlendFunction.NORMAL}
                            offset={new THREE.Vector2(0.003 * loadPercentage, 0.003 * loadPercentage)}
                        />
                        <Noise
                            premultiply
                            blendFunction={BlendFunction.OVERLAY}
                            opacity={0.3 + loadPercentage * 0.2}
                        />
                        <Vignette
                            eskil={false}
                            offset={0.1}
                            darkness={0.9}
                            blendFunction={BlendFunction.NORMAL}
                        />
                        {glitchActive && (
                            <Glitch
                                delay={new THREE.Vector2(0, 0)}
                                duration={new THREE.Vector2(0.2, 0.4)}
                                mode={GlitchMode.SPORADIC}
                                active
                                ratio={0.85}
                            />
                        )}
                        {/* High load constant glitching */}
                        {loadPercentage > 0.8 && !glitchActive && (
                            <Glitch
                                delay={new THREE.Vector2(0, 0)}
                                duration={new THREE.Vector2(0.1, 0.2)}
                                mode={GlitchMode.SPORADIC}
                                active
                                ratio={0.1} // minor glitch 
                            />
                        )}
                    </EffectComposer>
                </Canvas>
            </div>

            {/* Scanlines Overlay for extra Cyberpunk texture */}
            <div className="absolute inset-0 z-20 pointer-events-none opacity-10 bg-[linear-gradient(rgba(255,255,255,0)_50%,rgba(0,0,0,1)_50%)] bg-[length:100%_4px]"></div>
        </div>
    );
};

