import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '../ui/Button';
import { AlertTriangle, TrendingDown, TrendingUp, Send, ShieldAlert, Globe2, Activity } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Language } from '../../types';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, MeshDistortMaterial, Float, Stars, Sphere, Torus, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch, Vignette, Noise } from '@react-three/postprocessing';
import { GlitchMode, BlendFunction } from 'postprocessing';
import * as THREE from 'three';

interface PersonaSwitchboardProps {
    onComplete: (score: number) => void;
    t: (key: string) => string;
    language?: Language;
}

// -------------------------------------------------------------------------------------------------
// AAA VISUAL COMPONENTS
// -------------------------------------------------------------------------------------------------

// Highly detailed Holo-Earth representing global sentiment
const HoloEarth = ({ stockPrice, alarmLevel }: { stockPrice: number, alarmLevel: number }) => {
    const coreRef = useRef<THREE.Mesh>(null);
    const wireframeRef = useRef<THREE.Mesh>(null);
    const ringRef = useRef<THREE.Group>(null);
    const dustRef = useRef<THREE.Points>(null);

    const isCrashing = stockPrice < 100;
    const baseColor = isCrashing ? '#f43f5e' : stockPrice > 130 ? '#10b981' : '#3b82f6';
    const highlightColor = isCrashing ? '#ef4444' : stockPrice > 130 ? '#34d399' : '#60a5fa';

    useFrame((state, delta) => {
        const time = state.clock.elapsedTime;

        if (coreRef.current) {
            coreRef.current.rotation.y += delta * (0.1 + alarmLevel * 0.5);
        }
        if (wireframeRef.current) {
            wireframeRef.current.rotation.y += delta * (0.15 + alarmLevel * 0.3);
            wireframeRef.current.rotation.z = Math.sin(time * 0.5) * 0.1;
        }
        if (ringRef.current) {
            ringRef.current.rotation.x = Math.PI / 2 + Math.sin(time * 0.2) * 0.1;
            ringRef.current.rotation.z -= delta * (0.3 + alarmLevel * 1.5);

            // Pulse ring scale based on alarm
            const ringScale = 1 + Math.sin(time * 4) * 0.02 * alarmLevel;
            ringRef.current.scale.setScalar(ringScale);
        }
    });

    return (
        <group position={[0, -0.5, 0]}>
            <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>

                {/* Inner Core (Distorting Magma/Energy based on crisis) */}
                <mesh ref={coreRef}>
                    <icosahedronGeometry args={[2, 4]} />
                    <MeshDistortMaterial
                        color={baseColor}
                        emissive={baseColor}
                        emissiveIntensity={1 + alarmLevel * 2}
                        distort={0.2 + alarmLevel * 0.6}
                        speed={1 + alarmLevel * 5}
                        roughness={0.2}
                        metalness={0.8}
                    />
                </mesh>

                {/* Outer Wireframe Sphere (The Digital Grid) */}
                <mesh ref={wireframeRef} scale={1.05}>
                    <sphereGeometry args={[2, 32, 32]} />
                    <meshBasicMaterial
                        color={highlightColor}
                        wireframe
                        transparent
                        opacity={0.3 + alarmLevel * 0.3}
                    />
                </mesh>

                {/* Orbital Data Rings */}
                <group ref={ringRef}>
                    {/* Ring 1 */}
                    <mesh>
                        <torusGeometry args={[2.8, 0.01, 16, 100]} />
                        <meshBasicMaterial color={highlightColor} transparent opacity={0.6} />
                    </mesh>
                    {/* Ring 2 (thicker, glowing) */}
                    <mesh scale={1.1}>
                        <torusGeometry args={[2.8, 0.03, 16, 100]} />
                        <meshBasicMaterial color={highlightColor} transparent opacity={0.3} />
                    </mesh>
                    {/* Data blips on ring */}
                    <Sparkles count={50} scale={[6, 0.2, 6]} size={2} speed={0.5} color={highlightColor} opacity={0.8} />
                </group>

                {/* Ambient floating sentiment particles */}
                <Sparkles count={200} scale={8} size={1} speed={0.4} color={highlightColor} opacity={0.4} />

            </Float>
        </group>
    );
};


// -------------------------------------------------------------------------------------------------
// MAIN COMPONENT
// -------------------------------------------------------------------------------------------------

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
            setStockPrice(p => Math.max(0, p - (Math.random() * (0.5 + alarmLevel))));
        }, 1000);

        return () => clearInterval(interval);
    }, [phase]);

    const handleSubmit = () => {
        if (!input.trim() || feedback !== null) return;
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
        setStockPrice(p => p + (roundScore / 4)); // Stock recovery/drop based on response

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
        <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border border-blue-500/20 bg-slate-950 shadow-[0_0_60px_rgba(59,130,246,0.15)] font-sans">

            {/* --- 3D COMMAND CENTER LAYER --- */}
            {(phase === 'PLAYING' || phase === 'REPORT') && (
                <div className="absolute inset-0 z-0">
                    <Canvas camera={{ position: [0, 0, 9], fov: 50 }}>
                        <color attach="background" args={['#020617']} />

                        <ambientLight intensity={0.5} />
                        <pointLight position={[10, 10, 10]} intensity={isCrashing ? 5 : 2} color={isCrashing ? '#f43f5e' : '#3b82f6'} />
                        <pointLight position={[-10, -10, -10]} intensity={1} color={stockPrice > 130 ? '#10b981' : '#6366f1'} />

                        <HoloEarth stockPrice={stockPrice} alarmLevel={alarmLevel} />

                        <OrbitControls
                            enableZoom={false}
                            enablePan={false}
                            maxPolarAngle={Math.PI / 1.8}
                            minPolarAngle={Math.PI / 2.5}
                            autoRotate
                            autoRotateSpeed={isCrashing ? 2.0 : 0.5}
                        />

                        {/* High-end AAA Post Processing */}
                        <EffectComposer>
                            <Bloom
                                luminanceThreshold={0.2}
                                luminanceSmoothing={0.9}
                                intensity={isCrashing ? 3.5 : 2.0}
                                mipmapBlur
                            />
                            <ChromaticAberration
                                blendFunction={BlendFunction.NORMAL}
                                offset={new THREE.Vector2(0.002 + alarmLevel * 0.005, 0.002 + alarmLevel * 0.005)}
                            />
                            <Vignette eskil={false} offset={0.1} darkness={1.2} />
                            <Noise opacity={0.15 + alarmLevel * 0.15} blendFunction={BlendFunction.OVERLAY} />

                            {/* Severe crisis glitching */}
                            {isCrashing && (
                                <Glitch
                                    delay={new THREE.Vector2(0, 0)}
                                    duration={new THREE.Vector2(0.1, 0.3)}
                                    mode={GlitchMode.SPORADIC}
                                    active
                                    ratio={0.4}
                                />
                            )}
                        </EffectComposer>
                    </Canvas>
                </div>
            )}

            {/* --- SCANLINES OVERLAY --- */}
            <div className="absolute inset-0 z-10 pointer-events-none opacity-20 bg-[linear-gradient(rgba(59,130,246,0.05)_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px]"></div>

            {/* --- UI OVERLAY: BRIEFING --- */}
            {phase === 'BRIEFING' && (
                <div className="absolute inset-0 z-50 bg-[#020617]/95 backdrop-blur-xl flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-1000">
                    <Globe2 size={80} className="text-blue-500 mb-6 drop-shadow-[0_0_30px_rgba(59,130,246,0.8)] animate-pulse" />
                    <h1 className="text-4xl md:text-6xl font-black text-white mb-4 uppercase tracking-[0.2em] drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                        {t('persona.title') || "PERSONA SWITCHBOARD"}
                    </h1>
                    <div className="max-w-xl text-blue-200 text-sm md:text-base space-y-4 font-medium border border-blue-500/30 p-8 bg-blue-950/40 rounded-2xl backdrop-blur-md shadow-[0_0_30px_rgba(59,130,246,0.15)] leading-relaxed">
                        <p>{t('persona.desc') || "You are the Global Head of PR for Yokaizen Corp. Reality is collapsing, and the markets are panicking."}</p>
                        <p className="text-white bg-blue-600/20 p-4 rounded-xl border border-blue-400/50 shadow-inner font-bold tracking-wide">
                            {t('persona.task') || "Draft strategic statements to mitigate crises. Monitor the stock price. Do not let sentiment drop to zero."}
                        </p>
                    </div>
                    <Button size="lg" variant="primary" onClick={() => { setPhase('PLAYING'); audio.playClick(); }} className="mt-10 bg-blue-600 border border-blue-400/50 shadow-[0_0_30px_rgba(37,99,235,0.5)] px-12 py-6 text-lg tracking-[0.2em] font-black text-white hover:bg-white hover:text-blue-900 transition-all rounded-xl">
                        {t('persona.start') || "INITIATE SESSION"}
                    </Button>
                </div>
            )}

            {/* --- UI OVERLAY: PLAYING --- */}
            {phase === 'PLAYING' && (
                <div className="absolute inset-0 z-20 pointer-events-none flex flex-col p-6 justify-between">

                    {/* Top HUD: Diagnostics & Market */}
                    <div className="flex justify-between items-start pointer-events-auto">
                        <div className="bg-[#020617]/80 border border-slate-800 p-3 rounded-xl backdrop-blur-xl flex items-center shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                            <div className={`p-2 rounded-lg border mr-3 ${isCrashing ? 'bg-rose-500/20 border-rose-500 animate-pulse text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]' : 'bg-blue-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'}`}>
                                {isCrashing ? <ShieldAlert size={20} /> : <Activity size={20} />}
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-[0.25em] font-black">Sys Threat Level</div>
                                <div className={`font-black text-sm uppercase tracking-widest drop-shadow-md ${isCrashing ? 'text-rose-500' : 'text-white'}`}>
                                    {isCrashing ? 'CRITICAL (SEV-1)' : 'ELEVATED (SEV-3)'}
                                </div>
                            </div>
                        </div>

                        <div className={`bg-[#020617]/80 border p-3 rounded-xl backdrop-blur-xl text-right shadow-[0_0_20px_rgba(0,0,0,0.5)] flex flex-col items-end transition-colors ${stockPrice < 100 ? 'border-rose-500/50' : stockPrice > 130 ? 'border-emerald-500/50' : 'border-slate-800'}`}>
                            <div className="text-[10px] text-slate-400 uppercase tracking-[0.25em] font-black mb-1 flex items-center">
                                GLOBAL MARKET <Globe2 size={12} className="ml-2 text-slate-500" />
                            </div>
                            <div className={`text-4xl font-mono font-black flex items-center tracking-tighter ${stockPrice < 100 ? 'text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]' : stockPrice > 130 ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]' : 'text-white drop-shadow-md'}`}>
                                ${stockPrice.toFixed(2)}
                                {stockPrice < 100 ? <TrendingDown size={28} className="ml-3 animate-bounce" /> : <TrendingUp size={28} className="ml-3" />}
                            </div>
                        </div>
                    </div>

                    {/* Middle HUD: Scenario Alert */}
                    <div className="self-center w-full max-w-3xl bg-[#020617]/90 border border-amber-500/40 p-8 rounded-2xl backdrop-blur-2xl shadow-[0_0_40px_rgba(245,158,11,0.15)] pointer-events-auto mt-4 mb-auto relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50"></div>

                        <div className="absolute top-4 right-6 text-[11px] text-amber-500/60 font-mono tracking-[0.2em] font-black">
                            SCENARIO INDEX: {currentScenarioIdx + 1}/{crisisScenarios.length}
                        </div>

                        <div className="flex items-center text-amber-500 font-black uppercase tracking-[0.3em] mb-4 text-sm drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                            <AlertTriangle size={20} className="mr-3 animate-pulse" /> EXTERNAL CRISIS DETECTED
                        </div>

                        <h2 className="text-xl md:text-2xl text-white font-serif italic mb-8 leading-relaxed relative z-10 border-l-4 border-amber-500 pl-6 drop-shadow-md">
                            "{crisisScenarios[currentScenarioIdx].context}"
                        </h2>

                        <div className="flex flex-wrap gap-4 text-[11px] uppercase font-mono tracking-widest relative z-10">
                            <div className="bg-slate-900/80 border border-slate-700 text-slate-200 px-4 py-2 rounded-lg shadow-inner">
                                <span className="text-slate-500 mr-2 font-black">TARGET DEMO:</span>{crisisScenarios[currentScenarioIdx].target}
                            </div>
                            <div className="bg-slate-900/80 border border-slate-700 text-slate-200 px-4 py-2 rounded-lg shadow-inner">
                                <span className="text-slate-500 mr-2 font-black">REQ TONE:</span>{crisisScenarios[currentScenarioIdx].tone}
                            </div>
                        </div>
                    </div>

                    {/* Bottom HUD: Input & Timer */}
                    <div className="pointer-events-auto flex flex-col space-y-3 mt-auto">

                        {feedback && (
                            <div className={`p-4 rounded-xl border backdrop-blur-xl text-sm font-black uppercase tracking-[0.2em] text-center animate-in slide-in-from-bottom flex items-center justify-center shadow-2xl ${feedback.isPositive ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]' : 'bg-rose-950/80 border-rose-500 text-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.5)]'}`}>
                                {feedback.isPositive ? <TrendingUp size={20} className="mr-3" /> : <TrendingDown size={20} className="mr-3" />}
                                {feedback.message}
                            </div>
                        )}

                        <div className="bg-[#020617]/90 border border-slate-800 rounded-2xl p-5 backdrop-blur-2xl shadow-2xl relative">
                            {/* Visual Timer Progress Bar */}
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-900 rounded-t-2xl overflow-hidden">
                                <div className={`h-full transition-all duration-1000 ease-linear ${timeLeft < 15 ? 'bg-rose-500 shadow-[0_0_15px_#f43f5e]' : 'bg-cyan-500 shadow-[0_0_15px_#06b6d4]'}`} style={{ width: `${(timeLeft / 60) * 100}%` }}></div>
                            </div>

                            <div className="text-[11px] text-slate-400 uppercase tracking-[0.25em] font-black mb-3 flex justify-between items-center mt-1 border-b border-slate-800/50 pb-2">
                                <span className="flex items-center gap-2"><Send size={12} /> PR Comms Terminal // Secure Channel</span>
                                <span className={timeLeft < 15 ? 'text-rose-500 animate-pulse font-mono text-sm' : 'text-cyan-400 font-mono text-sm'}>T-MINUS {timeLeft}s</span>
                            </div>

                            <div className="flex flex-col md:flex-row gap-4 relative z-10">
                                <textarea
                                    className="flex-1 bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono text-sm resize-none h-28 shadow-inner disabled:opacity-50"
                                    placeholder="Draft official press response here..."
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    disabled={feedback !== null}
                                />
                                <div className="flex flex-col space-y-3 w-full md:w-56">
                                    <div className="bg-slate-900/60 border border-slate-700/50 p-3 rounded-xl text-[10px] text-slate-300 italic font-mono flex-1 font-medium leading-relaxed">
                                        <span className="text-cyan-400 font-black not-italic block mb-1">STRATEGY HINT:</span>
                                        {crisisScenarios[currentScenarioIdx].hint}
                                    </div>
                                    <Button variant="primary" onClick={handleSubmit} disabled={!input.trim() || feedback !== null} className="bg-cyan-600 border border-cyan-400/30 shadow-[0_0_20px_rgba(6,182,212,0.3)] h-12 rounded-xl font-black uppercase tracking-[0.2em] flex items-center justify-center transition-all hover:bg-cyan-500 hover:scale-[1.02]">
                                        BROADCAST <Send className="ml-3" size={16} />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- UI OVERLAY: REPORT --- */}
            {phase === 'REPORT' && (
                <div className="absolute inset-0 z-50 bg-[#020617]/95 backdrop-blur-2xl flex flex-col items-center justify-center text-center p-8 animate-in zoom-in duration-500">
                    <div className="w-32 h-32 bg-slate-900 border-2 border-slate-700 rounded-3xl flex items-center justify-center mb-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                        {stockPrice > 120
                            ? <TrendingUp size={64} className="text-emerald-500 drop-shadow-[0_0_20px_rgba(16,185,129,0.8)]" />
                            : <TrendingDown size={64} className="text-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.8)]" />
                        }
                    </div>

                    <h2 className="text-5xl md:text-7xl font-black text-white mb-2 uppercase tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                        {t('persona.market_closed') || "MARKETS CLOSED"}
                    </h2>

                    <div className="bg-slate-900/60 p-8 rounded-2xl border border-slate-700 mb-8 w-full max-w-md mt-6 backdrop-blur-xl shadow-2xl">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-700/50 pb-4">
                            <span className="text-slate-400 text-xs uppercase tracking-[0.2em] font-black">Final Valuation</span>
                            <span className={`text-4xl font-mono font-black ${stockPrice > 120 ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]'}`}>
                                ${stockPrice.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-xs uppercase tracking-[0.2em] font-black">PR Mitigation Auth Score</span>
                            <span className="font-mono font-black text-white text-2xl bg-slate-800 px-4 py-2 rounded-lg border border-slate-600">{score}</span>
                        </div>
                    </div>

                    <Button size="lg" variant="primary" onClick={() => onComplete(stockPrice > 100 ? 100 : 50)} className={`border border-white/20 font-black text-xl tracking-[0.2em] px-14 py-7 text-white shadow-2xl hover:scale-105 transition-all rounded-2xl ${stockPrice > 120 ? 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.4)]' : 'bg-rose-600 hover:bg-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.4)]'}`}>
                        {t('persona.submit') || "FILE FINAL REPORT"}
                    </Button>
                </div>
            )}
        </div>
    );
};

