
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '../ui/Button';
import { interactWithBioGuard } from '../../services/geminiService';
import { MessageSquare, CheckCircle, Lock } from 'lucide-react';
import { Language, Difficulty } from '../../types';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei';
import { CyberpunkEffects } from '../gl/CyberpunkEffects';
import { Particles } from '../gl/Particles';
import * as THREE from 'three';

interface BioGuardProps {
    onComplete: (score: number) => void;
    t: (key: string) => string;
    language?: Language;
    difficulty?: Difficulty;
}

const BioScanner = ({ meter, threshold }: { meter: number, threshold: number }) => {
    const meshRef = useRef<THREE.Group>(null);
    const ringRef = useRef<THREE.Mesh>(null);

    const statusColor = meter < 30 ? '#ef4444' : meter > threshold ? '#22c55e' : '#f59e0b';

    useFrame((state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * (meter / 100 * 2 + 0.5);
            meshRef.current.rotation.z += delta * 0.2;
        }
        if (ringRef.current) {
            ringRef.current.rotation.x -= delta * (meter < 30 ? 3 : 1);
        }
    });

    return (
        <group ref={meshRef}>
            <mesh>
                <octahedronGeometry args={[1.5, 0]} />
                <meshStandardMaterial color={statusColor} wireframe emissive={statusColor} emissiveIntensity={2} />
            </mesh>
            <mesh ref={ringRef} scale={[1.4, 1.4, 1.4]}>
                <torusGeometry args={[2, 0.05, 16, 100]} />
                <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={1.5} wireframe={meter < 30} />
            </mesh>
            <mesh scale={[0.8, 0.8, 0.8]}>
                <sphereGeometry args={[1.2, 32, 32]} />
                <MeshDistortMaterial
                    color={statusColor}
                    envMapIntensity={1}
                    clearcoat={1}
                    clearcoatRoughness={0}
                    metalness={0.8}
                    roughness={0.2}
                    distort={meter > threshold ? 0.1 : 0.6}
                    speed={meter < 30 ? 10 : 3}
                    emissive={statusColor}
                    emissiveIntensity={0.5}
                />
            </mesh>
        </group>
    );
};

export const BioGuard: React.FC<BioGuardProps> = ({ onComplete, t, language = 'EN', difficulty = 'Pro' }) => {
    const initialMeter = difficulty === 'Rookie' ? 40 : difficulty === 'Elite' ? 10 : 20;
    const threshold = difficulty === 'Rookie' ? 70 : 85;
    const decayRate = difficulty === 'Elite' ? 2 : 0;

    const [meter, setMeter] = useState(initialMeter);
    const [messages, setMessages] = useState<{ role: string, content: string }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [accessGranted, setAccessGranted] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMessages([{ role: 'model', content: t('bioguard.guard_msg') }]);
    }, [t]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (decayRate > 0 && !accessGranted) {
            const interval = setInterval(() => {
                setMeter(m => Math.max(0, m - 1));
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [decayRate, accessGranted]);

    const handleSend = async () => {
        if (!input.trim() || accessGranted) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        const result = await interactWithBioGuard(messages, userMsg, meter, language as Language);

        setIsLoading(false);
        setMessages(prev => [...prev, { role: 'model', content: result.text }]);
        setMeter(prev => Math.max(0, Math.min(100, prev + result.meterChange)));

        if (meter + result.meterChange >= threshold) {
            setAccessGranted(true);
            setTimeout(() => onComplete(100), 2500);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-950 border-x-8 border-slate-900 relative overflow-hidden font-mono text-white">
            {/* WebGL Background layer */}
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1} color={meter < 30 ? 'red' : meter > threshold ? 'green' : 'orange'} />
                    <BioScanner meter={meter} threshold={threshold} />
                    <Particles count={200} color={meter < 30 ? '#ef4444' : meter > threshold ? '#22c55e' : '#f59e0b'} speed={meter < 30 ? 2 : 0.5} />
                    <CyberpunkEffects
                        bloomIntensity={2}
                        bloomLuminanceThreshold={0.1}
                        glitchFactor={meter < 30 ? 0.005 : 0.001}
                        noiseOpacity={0.2}
                    />
                </Canvas>
            </div>

            {/* CSS Overlay for CRT lines */}
            <div className="absolute inset-0 pointer-events-none z-10 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] opacity-70"></div>
            <div className="absolute inset-0 pointer-events-none z-10 box-shadow-[inset_0_0_100px_rgba(0,0,0,0.9)]"></div>

            <div className="absolute top-4 right-6 z-30 text-red-500 animate-pulse text-xs font-bold flex items-center tracking-widest bg-black/60 px-3 py-1.5 rounded border border-red-500/50 backdrop-blur-sm shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2 shadow-[0_0_10px_red]"></div> {t('bioguard.cam_rec')}
            </div>
            <div className="absolute top-4 left-6 z-30 text-emerald-400 text-[10px] font-bold bg-black/60 px-3 py-1.5 rounded border border-emerald-500/30 backdrop-blur-sm uppercase tracking-widest">
                {t('bioguard.cam_label')} // {t('games.bioguard.sec_lvl')}{difficulty}
            </div>

            {/* HUD Overlay */}
            <div className="absolute inset-x-4 top-20 z-20 pointer-events-none flex justify-center">
                <div className="bg-black/40 p-4 rounded-xl border border-white/10 backdrop-blur-md w-64 shadow-2xl pointer-events-auto">
                    <div className="flex justify-between text-[10px] text-gray-400 uppercase mb-2 font-bold tracking-widest">
                        <span>{t('bioguard.meter_label')}</span>
                        <span className={meter < 30 ? 'text-red-500' : meter > threshold ? 'text-green-500' : 'text-amber-500'}>{Math.round(meter)}%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden relative shadow-inner border border-white/5">
                        <div
                            className={`h-full transition-all duration-500 shadow-[0_0_10px_currentColor] ${meter < 30 ? 'bg-red-500 text-red-500' : meter > threshold ? 'bg-green-500 text-green-500' : 'bg-amber-500 text-amber-500'}`}
                            style={{ width: `${meter}%` }}
                        ></div>
                        <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_5px_white]" style={{ left: `${threshold}%` }}></div>
                    </div>
                </div>
            </div>

            <div className="flex-1"></div>

            <div className="h-2/5 flex flex-col bg-black/70 backdrop-blur-2xl border-t border-white/10 p-4 z-30 shadow-[0_-20px_40px_rgba(0,0,0,0.5)] relative">
                <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                            <div className={`max-w-[85%] p-3 rounded-lg text-xs font-bold shadow-lg ${msg.role === 'user'
                                    ? 'bg-blue-900/40 text-blue-200 border border-blue-500/30 rounded-br-sm'
                                    : 'bg-black/60 text-amber-500 border border-amber-500/20 rounded-bl-sm font-sans tracking-wide'
                                }`}>
                                {msg.role === 'model' && <span className="block text-[9px] text-gray-500 mb-1.5 uppercase tracking-widest border-b border-gray-800 pb-1">{t('games.bioguard.officer_miller')}</span>}
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-center text-cyan-500 text-xs space-x-1 ml-2 font-bold tracking-widest">
                            <span>PROCESSING</span>
                            <span className="animate-bounce">.</span>
                            <span className="animate-bounce delay-75">.</span>
                            <span className="animate-bounce delay-150">.</span>
                        </div>
                    )}
                    <div ref={scrollRef} />
                </div>

                {accessGranted ? (
                    <div className="bg-green-900/30 border border-green-500 p-4 rounded flex items-center justify-center animate-in zoom-in duration-500 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                        <CheckCircle className="text-green-400 mr-3 w-8 h-8 animate-pulse" />
                        <h3 className="text-green-400 font-bold text-lg uppercase tracking-[0.2em] drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]">{t('bioguard.access_granted')}</h3>
                    </div>
                ) : (
                    <div className="flex space-x-3">
                        <div className="relative flex-1">
                            <input
                                className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-4 py-3.5 text-white focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500 focus:outline-none text-xs placeholder-gray-500 font-bold disabled:opacity-50 transition-all shadow-inner"
                                placeholder={t('bioguard.input_placeholder')}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                                disabled={accessGranted || isLoading}
                                autoFocus
                            />
                            <Lock size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
                        </div>
                        <Button variant="secondary" onClick={handleSend} disabled={isLoading || !input || accessGranted} className="border-amber-500/30 text-amber-500 hover:bg-amber-900/40 px-6 rounded-lg transition-all duration-300">
                            <MessageSquare size={18} />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
