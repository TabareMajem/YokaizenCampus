import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { AlertTriangle, TrendingDown, TrendingUp, Newspaper, Send, ShieldAlert, Globe2 } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Language } from '../../types';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, MeshDistortMaterial, Float, Stars, Text } from '@react-three/drei';
import { CyberpunkEffects } from '../gl/CyberpunkEffects';
import * as THREE from 'three';
import { Scanlines, Noise, Vignette } from '../ui/Visuals';

interface PersonaSwitchboardProps {
    onComplete: (score: number) => void;
    t: (key: string) => string;
    language?: Language;
}

// 3D Crisis Globe
const CrisisGlobe = ({ stockPrice, alarmLevel }: { stockPrice: number, alarmLevel: number }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const ringRef = useRef<THREE.Mesh>(null);

    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * (0.2 + alarmLevel);
            meshRef.current.rotation.x += delta * 0.1;
        }
        if (ringRef.current) {
            ringRef.current.rotation.z -= delta * (0.5 + alarmLevel * 2);
            ringRef.current.rotation.x = Math.PI / 2 + Math.sin(state.clock.elapsedTime) * 0.2;
        }
    });

    const isCrashing = stockPrice < 100;
    const baseColor = isCrashing ? '#ef4444' : stockPrice > 130 ? '#10b981' : '#3b82f6';
    const distortSpeed = 2 + alarmLevel * 5;

    return (
        <group position={[0, 0, 0]}>
            <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
                {/* Core Network */}
                <mesh ref={meshRef}>
                    <icosahedronGeometry args={[2, 3]} />
                    <MeshDistortMaterial
                        color={baseColor}
                        emissive={baseColor}
                        emissiveIntensity={1.5}
                        distort={0.1 + alarmLevel * 0.5}
                        speed={distortSpeed}
                        wireframe
                    />
                </mesh>

                {/* Orbital Data Rings */}
                <mesh ref={ringRef} scale={1.2}>
                    <torusGeometry args={[2.5, 0.02, 16, 100]} />
                    <meshBasicMaterial color={isCrashing ? '#ef4444' : '#06b6d4'} transparent opacity={0.5} />
                </mesh>

                {/* Center Core */}
                <mesh scale={0.5}>
                    <sphereGeometry args={[1.5, 32, 32]} />
                    <meshStandardMaterial color="#000000" metalness={1} roughness={0} />
                </mesh>
            </Float>
        </group>
    );
};

export const PersonaSwitchboard: React.FC<PersonaSwitchboardProps> = ({ onComplete, t }) => {
    const [phase, setPhase] = useState<'BRIEFING' | 'PLAYING' | 'REPORT'>('BRIEFING');
    const [currentScenarioIdx, setCurrentScenarioIdx] = useState(0);
    const [input, setInput] = useState('');
    const [stockPrice, setStockPrice] = useState(142.50);
    const [timeLeft, setTimeLeft] = useState(60);
    const [score, setScore] = useState(0);
    const [feedback, setFeedback] = useState<{ message: string, isPositive: boolean } | null>(null);

    // Dynamic environmental state
    const alarmLevel = Math.max(0, 1 - (timeLeft / 60)); // 0 to 1 as time runs out
    const isCrashing = stockPrice < 100;

    const crisisScenarios = [
        {
            id: 1,
            context: t('persona.s1.context') || "A deepfake video of our CEO saying controversial things is going viral.",
            target: t('persona.s1.target') || "Investors & General Public",
            tone: t('persona.s1.tone') || "Authoritative, Reassuring",
            hint: t('persona.s1.hint') || "Focus on verification protocols and stability."
        },
        {
            id: 2,
            context: t('persona.s2.context') || "Our latest AI model triggered a safety filter failure, leaking PII.",
            target: t('persona.s2.target') || "Regulators & Users",
            tone: t('persona.s2.tone') || "Transparent, Apologetic, Action-Oriented",
            hint: t('persona.s2.hint') || "Acknowledge the flaw immediately and outline patch steps."
        },
        {
            id: 3,
            context: t('persona.s3.context') || "A rival firm just announced AGI, causing market panic.",
            target: t('persona.s3.target') || "Shareholders",
            tone: t('persona.s3.tone') || "Confident, Visionary",
            hint: t('persona.s3.hint') || "Remind them of our proprietary edge and long-term roadmap."
        }
    ];

    useEffect(() => {
        if (phase !== 'PLAYING') {
            audio.stopAmbience();
            return;
        }

        audio.startAmbience('CYBER');

        const interval = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 0) {
                    setPhase('REPORT');
                    audio.playError();
                    return 0;
                }
                if (t === 10) audio.playError(); // Warning beep
                return t - 1;
            });
            // Stock drops faster the lower the time left (panic sets in)
            setStockPrice(p => Math.max(0, p - (Math.random() * (1 + alarmLevel))));
        }, 1000);

        return () => clearInterval(interval);
    }, [phase]);

    const handleSubmit = () => {
        if (!input.trim()) return;
        audio.playTyping();

        let roundScore = 0;

        // Basic heuristic
        if (input.length > 20) roundScore += 20;
        else roundScore -= 10;

        const isSuccess = Math.random() > 0.3 && input.length > 10;

        if (isSuccess) {
            roundScore += 30;
            setFeedback({ message: "Sentiment stabilized. Market reacted positively.", isPositive: true });
            audio.playSuccess();
        } else {
            roundScore -= 20;
            setFeedback({ message: "Statement poorly received. Panic increasing.", isPositive: false });
            audio.playError();
        }

        setScore(s => s + roundScore);
        setStockPrice(p => p + (roundScore / 5)); // Stock recovery/drop based on response

        setTimeout(() => {
            if (currentScenarioIdx < crisisScenarios.length - 1) {
                setCurrentScenarioIdx(i => i + 1);
                setInput('');
                setFeedback(null);
                setTimeLeft(60); // Reset timer for next crisis
            } else {
                setPhase('REPORT');
                audio.playSuccess();
            }
        }, 2000);
    };

    return (
        <div className="h-full bg-slate-950 font-sans relative overflow-hidden select-none">
            <Scanlines />
            <Vignette color="#000000" />
            <Noise opacity={0.15} />

            {/* --- 3D COMMAND CENTER --- */}
            {(phase === 'PLAYING' || phase === 'REPORT') && (
                <div className="absolute inset-0 z-0">
                    <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
                        <ambientLight intensity={0.5} />
                        <pointLight position={[0, 5, 0]} intensity={isCrashing ? 5 : 2} color={isCrashing ? '#ef4444' : '#06b6d4'} />

                        <Stars radius={100} depth={50} count={2000} factor={2} saturation={0} fade speed={1} />

                        <CrisisGlobe stockPrice={stockPrice} alarmLevel={alarmLevel} />

                        <OrbitControls
                            enableZoom={false}
                            enablePan={false}
                            maxPolarAngle={Math.PI / 2 + 0.2}
                            minPolarAngle={Math.PI / 3}
                            autoRotate
                            autoRotateSpeed={isCrashing ? 2 : 0.5}
                        />

                        <CyberpunkEffects
                            bloomIntensity={isCrashing ? 4 : 2}
                            glitchFactor={isCrashing ? 0.05 : alarmLevel > 0.8 ? 0.02 : 0}
                            noiseOpacity={0.2 + alarmLevel * 0.2}
                        />
                    </Canvas>
                </div>
            )}

            {/* --- UI OVERLAY --- */}
            {phase === 'BRIEFING' && (
                <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-1000">
                    <Globe2 size={80} className="text-blue-500 mb-6 drop-shadow-[0_0_20px_blue] animate-pulse" />
                    <h1 className="text-4xl md:text-6xl font-black text-white mb-4 uppercase tracking-tighter drop-shadow-[0_0_15px_white]">
                        {t('persona.title') || "PERSONA SWITCHBOARD"}
                    </h1>
                    <div className="max-w-xl text-blue-300 text-sm md:text-base space-y-4 font-bold border border-blue-900/50 p-6 bg-blue-900/10 rounded-xl backdrop-blur-sm">
                        <p>{t('persona.desc') || "You are the Global Head of PR for Yokaizen Corp. Reality is collapsing, and the markets are panicking."}</p>
                        <p className="text-white bg-blue-900/40 p-3 rounded border border-blue-500/50 shadow-inner">
                            {t('persona.task') || "Draft strategic statements to mitigate crises. Monitor the stock price. Do not let sentiment drop to zero."}
                        </p>
                    </div>
                    <Button size="lg" variant="primary" onClick={() => { setPhase('PLAYING'); audio.playClick(); }} className="mt-8 bg-blue-600 border-none shadow-[0_0_30px_rgba(37,99,235,0.4)] px-12 py-6 text-xl tracking-widest font-black text-white hover:bg-white hover:text-blue-900">
                        {t('persona.start') || "ENTER COMMAND CENTER"}
                    </Button>
                </div>
            )}

            {phase === 'PLAYING' && (
                <div className="absolute inset-0 z-10 pointer-events-none flex flex-col p-4 md:p-6 justify-between">

                    {/* Top HUD */}
                    <div className="flex justify-between items-start pointer-events-auto">
                        <div className="bg-black/60 border border-slate-700 p-3 rounded-xl backdrop-blur-md flex items-center shadow-lg">
                            <div className={`p-2 rounded-lg border mr-3 ${isCrashing ? 'bg-red-500/20 border-red-500 animate-pulse text-red-500' : 'bg-blue-500/20 border-blue-500 text-blue-400'}`}>
                                <ShieldAlert size={20} />
                            </div>
                            <div>
                                <div className="text-[9px] text-slate-400 uppercase tracking-[0.2em] font-bold">THREAT LEVEL</div>
                                <div className={`font-black text-sm uppercase tracking-widest ${isCrashing ? 'text-red-500' : 'text-white'}`}>
                                    {isCrashing ? 'CRITICAL (SEV-1)' : 'ELEVATED (SEV-3)'}
                                </div>
                            </div>
                        </div>

                        <div className="bg-black/60 border border-slate-700 p-3 rounded-xl backdrop-blur-md text-right shadow-lg flex flex-col items-end">
                            <div className="text-[9px] text-slate-400 uppercase tracking-[0.2em] font-bold mb-1 flex items-center">
                                GLOBAL MARKET <Globe2 size={10} className="ml-1 opacity-50" />
                            </div>
                            <div className={`text-3xl font-mono font-black flex items-center ${stockPrice < 100 ? 'text-red-500 drop-shadow-[0_0_10px_red]' : 'text-green-400 drop-shadow-[0_0_10px_lime]'}`}>
                                ${stockPrice.toFixed(2)}
                                {stockPrice < 100 ? <TrendingDown size={24} className="ml-2" /> : <TrendingUp size={24} className="ml-2" />}
                            </div>
                        </div>
                    </div>

                    {/* Middle HUD: Scenario Alert */}
                    <div className="self-center w-full max-w-2xl bg-black/80 border-t-4 border-b-4 border-l border-r border-t-amber-500 border-b-amber-500 border-l-slate-800 border-r-slate-800 p-6 backdrop-blur-xl shadow-[0_0_50px_rgba(245,158,11,0.2)] pointer-events-auto mt-4 mb-auto relative overflow-hidden">
                        <Scanlines />
                        <div className="absolute top-2 right-4 text-[10px] text-amber-500/50 font-mono tracking-widest font-bold">EVENT {currentScenarioIdx + 1}/{crisisScenarios.length}</div>

                        <div className="flex items-center text-amber-500 font-bold uppercase tracking-[0.3em] mb-4 text-sm animate-pulse">
                            <AlertTriangle size={18} className="mr-2" /> EXTERNAL CRISIS DETECTED
                        </div>

                        <h2 className="text-xl md:text-2xl text-white font-serif italic mb-6 leading-relaxed relative z-10 border-l-2 border-amber-500/30 pl-4">
                            "{crisisScenarios[currentScenarioIdx].context}"
                        </h2>

                        <div className="flex flex-wrap gap-2 text-[10px] uppercase font-mono tracking-widest relative z-10">
                            <div className="bg-slate-900 border border-slate-700 text-slate-300 px-3 py-1 rounded">
                                <span className="text-slate-500 mr-2">TARGET:</span>{crisisScenarios[currentScenarioIdx].target}
                            </div>
                            <div className="bg-slate-900 border border-slate-700 text-slate-300 px-3 py-1 rounded">
                                <span className="text-slate-500 mr-2">TONE:</span>{crisisScenarios[currentScenarioIdx].tone}
                            </div>
                        </div>
                    </div>

                    {/* Bottom HUD: Input & Timer */}
                    <div className="pointer-events-auto flex flex-col space-y-2 mt-auto">

                        {feedback && (
                            <div className={`p-3 rounded-lg border backdrop-blur-md text-xs font-bold uppercase tracking-widest text-center animate-in slide-in-from-bottom flex items-center justify-center ${feedback.isPositive ? 'bg-green-900/40 border-green-500/50 text-green-400' : 'bg-red-900/40 border-red-500/50 text-red-500'}`}>
                                {feedback.isPositive ? <TrendingUp size={16} className="mr-2" /> : <TrendingDown size={16} className="mr-2" />}
                                {feedback.message}
                            </div>
                        )}

                        <div className="bg-black/80 border border-slate-700 rounded-xl p-4 backdrop-blur-xl shadow-2xl relative">
                            {/* Visual Timer Border */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-slate-800 rounded-t-xl overflow-hidden">
                                <div className={`h-full transition-all duration-1000 ease-linear ${timeLeft < 15 ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-cyan-500'}`} style={{ width: `${(timeLeft / 60) * 100}%` }}></div>
                            </div>

                            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-2 flex justify-between items-center mt-1">
                                <span>Press Release Terminal // Secure Channel</span>
                                <span className={timeLeft < 15 ? 'text-red-500 animate-pulse' : 'text-cyan-400'}>T-MINUS {timeLeft}s</span>
                            </div>

                            <div className="flex flex-col md:flex-row gap-4 relative z-10">
                                <textarea
                                    className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500 focus:bg-slate-900 transition-all font-mono text-xs md:text-sm resize-none h-24 shadow-inner disabled:opacity-50"
                                    placeholder="Draft official statement..."
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    disabled={feedback !== null}
                                    autoFocus
                                />
                                <div className="flex flex-col space-y-2 w-full md:w-48">
                                    <div className="bg-slate-900 border border-slate-700 p-2 rounded text-[9px] text-slate-400 italic font-mono flex-1">
                                        <span className="text-cyan-500 font-bold not-italic">HINT:</span> {crisisScenarios[currentScenarioIdx].hint}
                                    </div>
                                    <Button variant="primary" onClick={handleSubmit} disabled={!input.trim() || feedback !== null} className="bg-cyan-600 border-none shadow-[0_0_15px_rgba(6,182,212,0.3)] h-12 rounded-lg font-black uppercase tracking-widest flex items-center justify-center transition-all hover:bg-cyan-500">
                                        PUBLISH <Send className="ml-2" size={16} />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {phase === 'REPORT' && (
                <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center text-center p-8 animate-in zoom-in duration-500">
                    <Scanlines />
                    <div className="w-32 h-32 bg-slate-900 border-2 border-slate-700 rounded-2xl flex items-center justify-center mb-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                        {stockPrice > 120
                            ? <TrendingUp size={64} className="text-green-500 drop-shadow-[0_0_15px_lime]" />
                            : <TrendingDown size={64} className="text-red-500 drop-shadow-[0_0_15px_red]" />
                        }
                    </div>

                    <h2 className="text-4xl md:text-6xl font-black text-white mb-2 uppercase tracking-tighter drop-shadow-[0_0_15px_white]">
                        {t('persona.market_closed') || "MARKETS CLOSED"}
                    </h2>

                    <div className="bg-slate-900/80 p-6 rounded-xl border border-slate-700 mb-8 w-full max-w-sm mt-4 backdrop-blur-md shadow-xl">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
                            <span className="text-slate-400 text-xs uppercase tracking-widest font-bold">Final Valuation</span>
                            <span className={`text-2xl font-mono font-black ${stockPrice > 120 ? 'text-green-400 drop-shadow-[0_0_10px_lime]' : 'text-red-500 drop-shadow-[0_0_10px_red]'}`}>
                                ${stockPrice.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-xs uppercase tracking-widest font-bold">PR Mitigation Score</span>
                            <span className="font-mono font-black text-white text-xl">{score}</span>
                        </div>
                    </div>

                    <Button size="lg" variant="primary" onClick={() => onComplete(stockPrice > 100 ? 100 : 50)} className={`border-none font-black text-xl tracking-widest px-12 py-6 text-black shadow-lg hover:scale-105 transition-transform ${stockPrice > 120 ? 'bg-green-500 hover:bg-green-400 shadow-[0_0_30px_rgba(34,197,94,0.4)]' : 'bg-red-500 hover:bg-red-400 shadow-[0_0_30px_rgba(239,68,68,0.4)]'}`}>
                        {t('persona.submit') || "FILE FINAL REPORT"}
                    </Button>
                </div>
            )}
        </div>
    );
};
