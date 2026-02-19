import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { interrogateAndroid } from '../../services/geminiService';
import { audio } from '../../services/audioService';
import { useToast } from '../../contexts/ToastContext';
import { Fingerprint, Search, ShieldAlert, AlertTriangle, Terminal, XCircle, ArrowRight } from 'lucide-react';
import { Scanlines } from '../ui/Visuals';
import { Language } from '../../types';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, MeshDistortMaterial, Float, Environment, ContactShadows } from '@react-three/drei';
import { CyberpunkEffects } from '../gl/CyberpunkEffects';
import * as THREE from 'three';

interface VoightKampffProtocolProps {
    onComplete: (score: number) => void;
    t: (key: string) => string;
    language?: Language;
}

interface Suspect {
    id: string;
    name: string;
    model: string;
    isGuilty: boolean;
    stress: number;
}

// 3D Suspect Entity
const SuspectEntity = ({ stress, isInterrogating }: { stress: number, isInterrogating: boolean }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const pupilRef = useRef<THREE.Mesh>(null);

    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * (0.5 + stress / 100);
            const scale = 1 + Math.sin(state.clock.elapsedTime * (2 + stress / 10)) * 0.05;
            meshRef.current.scale.set(scale, scale, scale);
        }
        if (pupilRef.current) {
            // Dilate pupils based on stress
            const dilation = 0.5 + (stress / 100) * 1.5;
            pupilRef.current.scale.set(dilation, dilation, dilation);
            pupilRef.current.material.color.setHex(stress > 60 ? 0xff0000 : 0x06b6d4);
        }
    });

    const baseColor = stress > 70 ? '#ef4444' : stress > 40 ? '#f59e0b' : '#3b82f6';

    return (
        <group position={[0, 0, 0]}>
            <Float speed={2 + stress / 20} rotationIntensity={0.5} floatIntensity={0.5}>
                <mesh ref={meshRef} position={[0, 1.5, 0]}>
                    <icosahedronGeometry args={[1.5, isInterrogating ? 4 : 1]} />
                    <MeshDistortMaterial
                        color={baseColor}
                        emissive={baseColor}
                        emissiveIntensity={isInterrogating ? 0.5 : 0.2}
                        distort={0.2 + (stress / 150)}
                        speed={2 + (stress / 20)}
                        roughness={0.2}
                        metalness={0.8}
                        wireframe={!isInterrogating}
                    />

                    {/* "Eye" Core */}
                    {isInterrogating && (
                        <mesh ref={pupilRef} position={[0, 0, 1.4]} rotation={[Math.PI / 2, 0, 0]}>
                            <cylinderGeometry args={[0.3, 0.3, 0.4, 32]} />
                            <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={2} />
                        </mesh>
                    )}
                </mesh>
            </Float>
            <ContactShadows position={[0, -0.5, 0]} opacity={0.5} scale={10} blur={2} far={4} />
        </group>
    );
};

export const VoightKampffProtocol: React.FC<VoightKampffProtocolProps> = ({ onComplete, t }) => {
    const [phase, setPhase] = useState<'BRIEFING' | 'SCENE' | 'INTERROGATION' | 'RESULT'>('BRIEFING');
    const [suspects, setSuspects] = useState<Suspect[]>([]);
    const [currentSuspectIndex, setCurrentSuspectIndex] = useState(0);
    const [evidence, setEvidence] = useState<string[]>([]);
    const [messages, setMessages] = useState<{ role: string, content: string }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Biometrics are explicitly requested by the user prompt 
    const [biometrics, setBiometrics] = useState({ latency: 120, stress: 20, pupils: 'NORMAL' });
    const { showToast } = useToast();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSuspects([
            { id: 's1', name: 'Unit 734 (Atlas)', model: 'Labor-Class', isGuilty: false, stress: 10 },
            { id: 's2', name: 'Unit 892 (Echo)', model: 'Social-Class', isGuilty: true, stress: 30 },
            { id: 's3', name: 'Unit 101 (Prime)', model: 'Logic-Class', isGuilty: false, stress: 5 }
        ]);
    }, []);

    useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
    useEffect(() => {
        if (phase === 'SCENE' || phase === 'INTERROGATION') audio.startAmbience('CYBER');
        else audio.stopAmbience();
        return () => audio.stopAmbience();
    }, [phase]);

    const handleFindEvidence = (item: string) => {
        if (!evidence.includes(item)) {
            setEvidence(prev => [...prev, item]);
            audio.playScan();
        }
    };

    const startInterrogation = (index: number) => {
        setCurrentSuspectIndex(index);
        setMessages([{ role: 'model', content: "State your query. I am required to answer." }]);
        setPhase('INTERROGATION');
        setBiometrics({ latency: 100, stress: suspects[index].stress, pupils: 'NORMAL' });
        audio.playClick();
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);
        audio.playTyping();

        const suspect = suspects[currentSuspectIndex];

        try {
            const result = await interrogateAndroid({ name: suspect.name, model: suspect.model, isGuilty: suspect.isGuilty }, evidence, userMsg);
            setMessages(prev => [...prev, { role: 'model', content: result.response }]);
            setBiometrics({
                latency: result.tells.latency,
                stress: result.tells.stress,
                pupils: result.tells.pupils as any
            });

            if (result.tells.stress > 60 || result.tells.latency > 500) {
                audio.playError();
            } else {
                audio.playSuccess();
            }
        } catch (e) {
            showToast("Connection Interrupted. Try Again.", "error");
            setMessages(prev => [...prev, { role: 'model', content: "...[CONNECTION ERROR]..." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAccuse = () => {
        const suspect = suspects[currentSuspectIndex];
        if (suspect.isGuilty) {
            audio.playSuccess();
            setPhase('RESULT');
        } else {
            audio.playError();
            showToast("INCORRECT TARGET. The suspect has been released.", 'error');
            setPhase('SCENE');
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-950 font-mono relative overflow-hidden select-none">
            <Scanlines />

            {/* 3D WEBGL ENGINE LAYER */}
            {(phase === 'SCENE' || phase === 'INTERROGATION') && (
                <div className="absolute inset-0 z-0">
                    <Canvas camera={{ position: [0, 2, 8], fov: 50 }}>
                        <ambientLight intensity={0.2} />
                        <pointLight position={[0, 5, 0]} intensity={phase === 'SCENE' ? 1 : 2} color={biometrics.stress > 60 ? "#ef4444" : "#06b6d4"} />
                        <Environment preset="city" />

                        <SuspectEntity
                            stress={phase === 'INTERROGATION' ? biometrics.stress : 0}
                            isInterrogating={phase === 'INTERROGATION'}
                        />

                        {/* Evidence Nodes in SCENE phase */}
                        {phase === 'SCENE' && (
                            <group>
                                {!evidence.includes('Data Pad') && (
                                    <Html position={[-3, 1, 0]} center>
                                        <button onClick={() => handleFindEvidence('Data Pad')} className="w-12 h-12 border-2 border-cyan-500 rounded-full flex items-center justify-center animate-pulse bg-black/50 hover:bg-cyan-900/50 backdrop-blur-md">
                                            <Search size={20} className="text-cyan-400" />
                                        </button>
                                        <div className="text-[10px] text-cyan-400 mt-2 text-center uppercase tracking-widest font-bold font-mono shadow-black drop-shadow-md">Data Pad</div>
                                    </Html>
                                )}
                                {!evidence.includes('Encrypted Drive') && (
                                    <Html position={[3, 2, -2]} center>
                                        <button onClick={() => handleFindEvidence('Encrypted Drive')} className="w-12 h-12 border-2 border-purple-500 rounded-full flex items-center justify-center animate-pulse bg-black/50 hover:bg-purple-900/50 backdrop-blur-md">
                                            <Search size={20} className="text-purple-400" />
                                        </button>
                                        <div className="text-[10px] text-purple-400 mt-2 text-center uppercase tracking-widest font-bold font-mono shadow-black drop-shadow-md">Encrypted Drive</div>
                                    </Html>
                                )}
                            </group>
                        )}

                        <OrbitControls
                            enableZoom={false}
                            enablePan={false}
                            maxPolarAngle={Math.PI / 2 + 0.1}
                            minPolarAngle={Math.PI / 3}
                            autoRotate={phase === 'SCENE'}
                            autoRotateSpeed={0.5}
                        />

                        <CyberpunkEffects
                            bloomIntensity={biometrics.stress > 70 ? 3 : 1.5}
                            glitchFactor={biometrics.stress > 80 ? 0.05 : biometrics.latency > 500 ? 0.08 : phase === 'SCENE' ? 0.01 : 0}
                            noiseOpacity={0.2}
                        />
                    </Canvas>
                </div>
            )}

            {/* UI LAYERS */}
            {phase === 'BRIEFING' && (
                <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-1000">
                    <Fingerprint size={80} className="text-cyan-500 mb-6 animate-pulse" />
                    <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter uppercase drop-shadow-[0_0_15px_cyan]">
                        {t('games.voightkampffprotocol.voight_kampff')}
                    </h1>
                    <div className="max-w-xl text-cyan-400 text-sm space-y-4 font-bold leading-relaxed border border-cyan-900/50 p-6 bg-cyan-900/10 rounded-xl backdrop-blur-sm">
                        <p>{t('voight.subject') || "A rogue AI unit is mimicking human emotional responses."}</p>
                        <p>{t('voight.victim') || "It has infiltrated a sensitive facility posing as staff."}</p>
                        <p>{t('voight.mission') || "Find evidence, interrogate the subjects, and identify the synthetic. Do not retire an innocent."}</p>
                    </div>
                    <div className="mt-12">
                        <Button size="lg" variant="primary" onClick={() => setPhase('SCENE')} className="shadow-[0_0_30px_rgba(6,182,212,0.3)] bg-cyan-600 hover:bg-cyan-500 font-black tracking-widest px-12 py-6 text-xl">
                            {t('voight.enter') || "INITIATE PROTOCOL"}
                        </Button>
                    </div>
                </div>
            )}

            {phase === 'SCENE' && (
                <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 md:p-6">
                    {/* Top HUD */}
                    <div className="flex justify-between items-start w-full">
                        <div className="bg-black/80 border border-cyan-900/50 p-3 rounded-lg backdrop-blur-md shadow-lg pointer-events-auto">
                            <div className="text-xs text-cyan-500 font-bold uppercase tracking-widest mb-2 flex items-center">
                                <Search size={14} className="mr-2" />
                                {t('voight.evidence_locker') || "EVIDENCE CACHE"} ({evidence.length}/2)
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {evidence.length === 0 && <span className="text-[10px] text-slate-500 italic">No evidence collected. Pan camera to search.</span>}
                                {evidence.map(e => (
                                    <span key={e} className="bg-cyan-900/30 border border-cyan-500/50 text-[10px] px-2 py-1 rounded text-cyan-100 uppercase tracking-widest shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                                        {e}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Bottom HUD: Subjects */}
                    <div className="w-full bg-black/80 border-t border-cyan-900/50 p-4 rounded-t-2xl backdrop-blur-xl pointer-events-auto mt-auto">
                        <div className="text-xs text-cyan-500 font-bold mb-4 text-center uppercase tracking-widest flex items-center justify-center">
                            <Fingerprint size={16} className="mr-2" />
                            {t('voight.select_subject') || "TARGET SELECTION"}
                        </div>
                        <div className="flex justify-center flex-wrap gap-4 md:gap-8">
                            {suspects.map((s, i) => (
                                <button
                                    key={s.id}
                                    onClick={() => startInterrogation(i)}
                                    className="flex flex-col items-center group relative w-24"
                                >
                                    <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-900 rounded-lg border-2 border-slate-700 group-hover:border-cyan-500 flex items-center justify-center overflow-hidden mb-2 transition-all shadow-lg group-hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] group-active:scale-95">
                                        <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${s.id}`} className="w-full h-full opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                                    </div>
                                    <span className="text-[10px] text-slate-400 group-hover:text-cyan-400 font-bold uppercase text-center w-full leading-tight">
                                        {s.name}
                                    </span>
                                    <div className="absolute -top-2 -right-2 bg-slate-800 border border-slate-600 rounded-full w-6 h-6 flex items-center justify-center text-[10px] text-slate-400 group-hover:bg-cyan-600 group-hover:text-white group-hover:border-cyan-400 transition-colors">
                                        #{i + 1}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {phase === 'INTERROGATION' && (
                <div className="absolute inset-0 z-10 flex flex-col md:flex-row pointer-events-none">

                    {/* Visual Overlay Top/Left */}
                    <div className="absolute top-4 left-4 pointer-events-auto">
                        <button onClick={() => setPhase('SCENE')} className="text-xs text-cyan-500 hover:text-white border border-cyan-900 bg-black/50 hover:bg-cyan-900 px-3 py-2 rounded-lg flex items-center transition-all backdrop-blur-md uppercase tracking-widest font-bold">
                            <ArrowRight size={14} className="mr-2 rotate-180" /> {t('games.voightkampffprotocol.back') || "RETURN"}
                        </button>
                    </div>

                    {/* Biometrics HUD (Right) */}
                    <div className="absolute top-4 right-4 pointer-events-none text-right font-mono p-4 space-y-3">
                        <div className="bg-black/60 border border-slate-800 p-3 rounded-lg backdrop-blur-md">
                            <div className="text-[9px] text-slate-500 uppercase tracking-[0.2em] mb-1">Target</div>
                            <div className="text-cyan-400 font-bold uppercase tracking-widest">{suspects[currentSuspectIndex].name}</div>
                        </div>

                        <div className="bg-black/60 border border-slate-800 p-3 rounded-lg backdrop-blur-md space-y-3 w-48">
                            <div>
                                <div className="flex justify-between text-[10px] uppercase tracking-widest mb-1">
                                    <span className="text-slate-400">Stress Level</span>
                                    <span className={biometrics.stress > 60 ? 'text-red-500' : 'text-cyan-400'}>{biometrics.stress}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                                    <div className={`h-full transition-all duration-300 ${biometrics.stress > 60 ? 'bg-red-500' : 'bg-cyan-500'}`} style={{ width: `${biometrics.stress}%` }}></div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center border-t border-slate-800 pt-2">
                                <span className="text-[10px] text-slate-400 uppercase tracking-widest">Latency</span>
                                <span className={`text-[10px] font-bold ${biometrics.latency > 400 ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>
                                    {biometrics.latency}ms
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Chat Interface (Bottom) */}
                    <div className="absolute bottom-0 w-full md:w-1/2 md:max-w-lg md:right-0 md:h-full md:border-l border-t md:border-t-0 border-cyan-900/30 bg-black/80 backdrop-blur-xl pointer-events-auto flex flex-col p-4">

                        <div className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest mb-3 flex items-center justify-between border-b border-cyan-900/50 pb-2">
                            <span className="flex items-center"><Terminal size={14} className="mr-2" /> INTERROGATION TERMINAL</span>
                            <span className="text-slate-500 animate-pulse">REC</span>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-thin scrollbar-thumb-cyan-900 scrollbar-track-transparent">
                            {messages.map((m, i) => (
                                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                                    <div className={`max-w-[85%] p-3 rounded-xl text-xs shadow-sm border ${m.role === 'user'
                                            ? 'bg-cyan-900/20 border-cyan-500/30 text-cyan-100 rounded-tr-none'
                                            : 'bg-slate-900/80 border-slate-700 text-slate-300 font-mono rounded-tl-none'
                                        }`}>
                                        {m.content}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-900/80 border border-slate-700 p-3 rounded-xl rounded-tl-none flex items-center space-x-2">
                                        <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    </div>
                                </div>
                            )}
                            <div ref={scrollRef} />
                        </div>

                        <div className="flex space-x-2 mb-4">
                            <input
                                className="flex-1 bg-slate-900/50 border border-cyan-900/50 rounded-lg px-4 py-3 text-cyan-100 focus:border-cyan-500 focus:bg-slate-900 focus:outline-none font-sans text-sm placeholder-slate-600 transition-all shadow-inner"
                                placeholder={t('games.voightkampffprotocol.ask_a_question') || "Input query..."}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                                disabled={isLoading}
                                autoFocus
                            />
                            <Button variant="primary" className="bg-cyan-600 hover:bg-cyan-500 border-none shadow-[0_0_15px_rgba(6,182,212,0.3)] w-12 flex items-center justify-center p-0 rounded-lg disabled:opacity-50" onClick={handleSend} disabled={isLoading || !input.trim()}>
                                <ArrowRight size={18} />
                            </Button>
                        </div>

                        <Button fullWidth variant="danger" onClick={handleAccuse} className="h-12 rounded-lg border border-red-900 bg-red-950/40 text-red-500 hover:bg-red-900 hover:text-white shadow-[0_0_20px_rgba(220,38,38,0.2)] font-black tracking-[0.3em] uppercase transition-all">
                            {t('voight.retire') || "EXECUTE RETIREMENT"}
                        </Button>
                    </div>
                </div>
            )}

            {phase === 'RESULT' && (
                <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-500 text-center p-8 border-4 border-green-500">
                    <Scanlines />
                    <div className="text-green-500 animate-pulse mb-6">
                        <ShieldAlert size={100} />
                    </div>
                    <h2 className="text-5xl md:text-7xl font-black text-green-400 mb-2 tracking-[0.3em] uppercase drop-shadow-[0_0_20px_rgba(74,222,128,0.5)]">
                        {t('voight.case_closed') || "RETIREMENT CONFIRMED"}
                    </h2>
                    <p className="text-green-300 font-mono tracking-widest mb-12 uppercase text-lg">Synthetic signature verified.</p>
                    <Button size="lg" variant="primary" onClick={() => onComplete(100)} className="bg-green-600 border-none text-black font-black hover:bg-green-500 hover:scale-105 shadow-[0_0_30px_rgba(74,222,128,0.4)] px-12 py-6 text-xl tracking-widest">
                        {t('voight.report') || "FILE INCIDENT REPORT"}
                    </Button>
                </div>
            )}
        </div>
    );
};
