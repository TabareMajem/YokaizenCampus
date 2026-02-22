import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Tetrahedron, MeshDistortMaterial, Float, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Activity, Shield, Zap, AlertTriangle } from 'lucide-react';
import { audio } from '../../services/audioService';

export interface StyleAnchorProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

const CoreEntity = ({ isActive }: { isActive: boolean }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.elapsedTime * 0.4;
            meshRef.current.rotation.y = state.clock.elapsedTime * 0.6;
        }
    });

    return (
        <Float speed={isActive ? 4 : 1.5} floatIntensity={1.5} rotationIntensity={isActive ? 3 : 1}>
            <Tetrahedron ref={meshRef} args={[1.5, 1]} scale={isActive ? 1.3 : 1}>
                <MeshDistortMaterial
                    color={new THREE.Color().setHSL(0.95, 0.9, isActive ? 0.7 : 0.4)}
                    envMapIntensity={1.5}
                    clearcoat={1}
                    clearcoatRoughness={0.1}
                    metalness={0.9}
                    roughness={0.1}
                    distort={isActive ? 0.5 : 0.2}
                    speed={isActive ? 6 : 2}
                />
            </Tetrahedron>
        </Float>
    );
};

export const StyleAnchor: React.FC<StyleAnchorProps> = ({ onComplete, difficulty, t }) => {
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [gameState, setGameState] = useState<'PLAYING' | 'SUCCESS' | 'FAILED'>('PLAYING');
    const [activeNode, setActiveNode] = useState(false);
    
    // Multi-Agent Flow Logic State
    const [advisorMsg, setAdvisorMsg] = useState('Initiating cognitive overlay...');
    const [adversaryMsg, setAdversaryMsg] = useState('Awaiting vulnerability...');
    const [glitchActive, setGlitchActive] = useState(false);

    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        const advisorLines = [
            'Flow state stable. Keep pushing.',
            'Structural integrity at optimal levels.',
            'Adversary attempting breach. Stay focused.',
            'Metrics align with mission parameters.'
        ];

        const adversaryLines = [
            'Your strategy is inherently flawed.',
            'I can see the cracks in your attention.',
            'Diverting systemic resources to overwhelm you.',
            'Inevitability is written in the code.'
        ];

        const agentInterval = setInterval(() => {
            const isAdversary = Math.random() > 0.65;
            if (isAdversary) {
                setAdversaryMsg(adversaryLines[Math.floor(Math.random() * adversaryLines.length)]);
                audio.playSystemMessage({ type: 'warning' });
                setGlitchActive(true);
                setTimeout(() => setGlitchActive(false), 500);
            } else {
                setAdvisorMsg(advisorLines[Math.floor(Math.random() * advisorLines.length)]);
                audio.playSystemMessage({ type: 'success' });
            }
        }, 6000);

        return () => clearInterval(agentInterval);
    }, [gameState]);

    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    const finalScore = score >= 500 ? score : 0;
                    setGameState(finalScore >= 500 ? 'SUCCESS' : 'FAILED');
                    onComplete(finalScore, { completionTime: 60 - prev, difficulty });
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
        setActiveNode(true);
        setScore(s => s + 50);
        setTimeout(() => setActiveNode(false), 300);
        
        if (score + 50 >= 1000) {
            setGameState('SUCCESS');
            onComplete(1000, { completionTime: 60 - timeLeft, difficulty });
        }
    };

    return (
        <div className="relative w-full h-[600px] rounded-xl overflow-hidden border border-white/10 bg-black shadow-2xl">
            {/* UI Overlay */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10 pointer-events-none">
                <div className="flex flex-col gap-4">
                    <div className="bg-black/50 backdrop-blur-md rounded-lg p-3 border border-indigo-500/40 shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                        <div className="flex items-center gap-2 text-indigo-400 mb-1">
                            <Activity className="w-4 h-4" />
                            <span className="text-xs uppercase tracking-widest font-bold">Signal</span>
                        </div>
                        <div className="text-2xl font-mono text-white">{score} / 1000</div>
                    </div>
                </div>

                <div className="bg-black/50 backdrop-blur-md rounded-lg p-3 border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.3)] flex flex-col items-end">
                     <div className="flex items-center gap-2 text-blue-400 mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-widest font-bold">Time</span>
                    </div>
                    <div className="text-3xl font-mono text-white tracking-widest">{timeLeft}s</div>
                </div>
            </div>

            {/* Multi-Agent Comm Panel */}
            <div className="absolute bottom-6 left-6 right-6 flex gap-4 z-10 pointer-events-none">
                <div className="flex-1 bg-black/70 backdrop-blur-xl rounded-lg p-4 border-l-4 border-indigo-500 shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                    <div className="text-xs text-indigo-400 mb-1 uppercase tracking-widest font-bold flex items-center gap-2"><Shield className="w-3 h-3"/> Advisor Agent</div>
                    <div className="text-sm text-indigo-100 font-mono tracking-wide leading-relaxed">{advisorMsg}</div>
                </div>
                <div className="flex-1 bg-black/70 backdrop-blur-xl rounded-lg p-4 border-l-4 border-red-500 shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                    <div className="text-xs text-red-500 mb-1 uppercase tracking-widest font-bold flex items-center gap-2"><Zap className="w-3 h-3"/> Adversary AI</div>
                    <div className="text-sm text-red-100 font-mono tracking-wide leading-relaxed">{adversaryMsg}</div>
                </div>
            </div>

            {/* Game Over States */}
            {gameState !== 'PLAYING' && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/90 backdrop-blur-md">
                    <div className="text-center p-8 rounded-2xl border border-white/10 bg-black/50 shadow-2xl">
                        <div className={`text-6xl font-black uppercase tracking-widest mb-4 ${gameState === 'SUCCESS' ? 'text-green-500' : 'text-red-500'} drop-shadow-[0_0_15px_currentColor]`}>
                            {gameState === 'SUCCESS' ? 'SYSTEM SECURED' : 'BREACH DETECTED'}
                        </div>
                        <div className="text-2xl text-white/80 font-mono">Final Score: {score}</div>
                    </div>
                </div>
            )}

            {/* Interaction Layer */}
            <div className="absolute inset-0 z-0 cursor-crosshair" onClick={handleInteract}>
                <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
                    <ambientLight intensity={0.6} />
                    <pointLight position={[10, 10, 10]} intensity={1.5} color={new THREE.Color().setHSL(0.95, 1, 0.6)} />
                    <pointLight position={[-10, -10, -10]} intensity={0.8} color="#4f46e5" />
                    
                    <Sparkles count={300} scale={15} size={3} speed={0.5} opacity={0.6} color={new THREE.Color().setHSL(0.95, 1, 0.9)} />
                    
                    <CoreEntity isActive={activeNode} />
                    
                    <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.8} />
                    
                    <EffectComposer>
                        <Bloom luminanceThreshold={0.15} luminanceSmoothing={0.9} height={300} intensity={2.0} />
                        <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.003, 0.003)} />
                        {glitchActive && (
                            <Glitch delay={new THREE.Vector2(0, 0)} duration={new THREE.Vector2(0.1, 0.4)} mode={GlitchMode.SPORADIC} active ratio={0.6} />
                        )}
                    </EffectComposer>
                </Canvas>
            </div>
        </div>
    );
};
