
import React, { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Html, Float, Environment, PerspectiveCamera, Stars, Sparkles, ContactShadows } from '@react-three/drei';
import { EffectComposer, Vignette, Noise as DataNoise, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Button } from '../ui/Button';
import { chatWithNeighbor } from '../../services/geminiService';
import { Moon, Ghost, ChevronRight, Send, CheckCircle2, AlertTriangle, Eye } from 'lucide-react';
import { Language } from '../../types';

// --- TYPES ---
interface VampireInvitationProps {
    onComplete: (score: number) => void;
    t: (key: string) => string;
    language?: Language;
}

// --- 3D ASSETS ---

const Door = ({ isOpen, angle }: { isOpen: boolean, angle: number }) => {
    // Door primitives
    return (
        <group position={[0, -2, -5]}>
            {/* Door Frame */}
            <mesh position={[0, 2.5, 0]}>
                <boxGeometry args={[3.2, 5.2, 0.3]} />
                <meshStandardMaterial color="#1a0b0b" roughness={0.8} />
            </mesh>

            {/* The Door itself */}
            {/* Offset pivot for hinge effect */}
            <group position={[-1.4, 0, 0.15]} rotation={[0, -THREE.MathUtils.degToRad(angle), 0]}>
                <mesh position={[1.4, 2.5, 0]}>
                    <boxGeometry args={[2.8, 5, 0.2]} />
                    <meshStandardMaterial color="#3f2315" roughness={0.7} />
                </mesh>
                {/* Knob */}
                <mesh position={[2.5, 2.5, 0.15]}>
                    <sphereGeometry args={[0.1, 16, 16]} />
                    <meshStandardMaterial color="gold" metalness={0.8} roughness={0.2} />
                </mesh>
                {/* Panels */}
                <mesh position={[1.4, 3.5, 0.11]}>
                    <boxGeometry args={[2, 1.5, 0.05]} />
                    <meshStandardMaterial color="#2d1810" />
                </mesh>
                <mesh position={[1.4, 1.2, 0.11]}>
                    <boxGeometry args={[2, 2, 0.05]} />
                    <meshStandardMaterial color="#2d1810" />
                </mesh>
            </group>

            {/* Interior (Dark void behind door) */}
            <mesh position={[0, 2.5, -1]}>
                <planeGeometry args={[2.8, 5]} />
                <meshBasicMaterial color="#000000" />
            </mesh>

            {/* Glowing Eyes inside */}
            <group position={[0.5, 3, -0.5]}>
                <Float speed={2} rotationIntensity={0.1} floatIntensity={0.1}>
                    <mesh position={[-0.2, 0, 0]}>
                        <sphereGeometry args={[0.05]} />
                        <meshBasicMaterial color="yellow" transparent opacity={angle > 10 ? 0.8 : 0} />
                    </mesh>
                    <mesh position={[0.2, 0, 0]}>
                        <sphereGeometry args={[0.05]} />
                        <meshBasicMaterial color="yellow" transparent opacity={angle > 10 ? 0.8 : 0} />
                    </mesh>
                </Float>
            </group>
        </group>
    );
};

const AtmosphericScene = ({ trust }: { trust: number }) => {
    // Camera simple sway
    useFrame((state) => {
        state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1, 0.05);
        state.camera.rotation.z = THREE.MathUtils.lerp(state.camera.rotation.z, Math.sin(state.clock.elapsedTime * 0.25) * 0.01, 0.05);
    });

    const doorAngle = Math.min(85, Math.max(0, trust - 10));

    return (
        <>
            <color attach="background" args={['#050205']} />
            <fog attach="fog" args={['#050205', 0, 15]} />

            <PerspectiveCamera makeDefault position={[0, 1, 3]} fov={60} />

            <Environment preset="night" />
            <ambientLight intensity={0.2} color="#4c1d95" />

            {/* Porch Light */}
            <pointLight position={[2, 3, -3]} color="#fde047" intensity={1} distance={8} castShadow />
            <mesh position={[2, 3, -3]}>
                <sphereGeometry args={[0.1]} />
                <meshBasicMaterial color="#fde047" />
            </mesh>

            {/* Moon Light */}
            <directionalLight position={[-5, 5, 5]} intensity={0.5} color="#818cf8" />

            {/* Floor/Porch */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
                <planeGeometry args={[20, 20]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0.2} />
            </mesh>

            <Door isOpen={trust > 10} angle={doorAngle} />

            <Sparkles count={50} scale={10} size={2} speed={0.4} opacity={0.5} color="#818cf8" />

            <EffectComposer>
                <Vignette eskil={false} offset={0.3} darkness={0.6} />
                <DataNoise opacity={0.08} />
                <Bloom luminanceThreshold={0.8} intensity={0.5} radius={0.5} />
            </EffectComposer>
        </>
    );
};

// --- MAIN COMPONENT ---
export const VampireInvitation: React.FC<VampireInvitationProps> = ({ onComplete, t }) => {
    const DISGUISES = useMemo(() => [
        { id: 'PIZZA', name: t('vampire.d_pizza'), icon: '🍕', bonus: t('vampire.trust'), desc: t('vampire.d_pizza_desc') },
        { id: 'CENSUS', name: t('vampire.d_census'), icon: '📋', bonus: 'Authority', desc: t('vampire.d_census_desc') },
        { id: 'LOST', name: t('vampire.d_tourist'), icon: '🗺️', bonus: 'Sympathy', desc: t('vampire.d_tourist_desc') }
    ], [t]);

    const [mode, setMode] = useState<'DISGUISE' | 'CHAT' | 'WIN' | 'LOSE'>('DISGUISE');
    const [disguise, setDisguise] = useState<typeof DISGUISES[0] | null>(null);
    const [trust, setTrust] = useState(15);
    const [suspicion, setSuspicion] = useState(10);
    const [messages, setMessages] = useState<{ role: string, content: string }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSelectDisguise = (d: typeof DISGUISES[0]) => {
        setDisguise(d);
        setMode('CHAT');
        setMessages([{ role: 'model', content: t('vampire.init_msg') }]);

        if (d.id === 'PIZZA') setTrust(25);
        if (d.id === 'LOST') setSuspicion(5);
    };

    const handleSend = async () => {
        if (!input.trim() || !disguise) return;

        const newMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, newMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await chatWithNeighbor(disguise.name, messages, newMsg.content);

            setIsLoading(false);
            setMessages(prev => [...prev, { role: 'model', content: response.text }]);
            setTrust(t => Math.min(100, Math.max(0, t + response.trustChange)));
            setSuspicion(s => Math.min(100, Math.max(0, s + response.suspicionChange)));

            if (trust + response.trustChange >= 100) {
                setTimeout(() => setMode('WIN'), 1000);
            } else if (suspicion + response.suspicionChange >= 100) {
                setTimeout(() => setMode('LOSE'), 1000);
            }
        } catch (error) {
            setIsLoading(false);
            // Fallback if AI fails
            setMessages(prev => [...prev, { role: 'model', content: "..." }]);
        }
    };

    return (
        <div className="h-full w-full relative bg-slate-950">
            {/* --- 3D BACKGROUND --- */}
            <div className="absolute inset-0 z-0">
                <Canvas shadows dpr={[1, 2]}>
                    <Suspense fallback={null}>
                        <AtmosphericScene trust={trust} />
                    </Suspense>
                </Canvas>
            </div>

            {/* --- UI OVERLAY --- */}
            <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">

                {mode === 'DISGUISE' && (
                    <div className="flex-1 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md pointer-events-auto animate-in fade-in">
                        <div className="relative mb-8">
                            <Ghost size={64} className="text-purple-400 animate-bounce" />
                            <div className="absolute inset-0 bg-purple-500/30 blur-2xl animate-pulse"></div>
                        </div>

                        <h2 className="text-5xl font-black text-white mb-2 italic tracking-tighter uppercase">{t('vampire.suck_up')}</h2>
                        <p className="text-gray-400 mb-12 text-center max-w-sm">{t('vampire.desc')}</p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl px-8">
                            {DISGUISES.map(d => (
                                <button
                                    key={d.id}
                                    onClick={() => handleSelectDisguise(d)}
                                    className="group bg-slate-900/80 border border-slate-700 hover:border-purple-500 p-6 rounded-2xl flex flex-col items-center text-center transition-all hover:scale-105 active:scale-95"
                                >
                                    <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{d.icon}</div>
                                    <div className="font-bold text-white text-xl mb-2">{d.name}</div>
                                    <div className="text-xs text-purple-400 font-bold uppercase mb-2">{t('games.vampireinvitation.bonus')}{d.bonus}</div>
                                    <p className="text-xs text-gray-500">{d.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {mode === 'CHAT' && (
                    <>
                        {/* Header Level */}
                        <div className="h-20 bg-gradient-to-b from-black/80 to-transparent p-4 flex justify-between items-start">
                            <div className="bg-black/50 backdrop-blur-md p-2 rounded-lg border border-white/10 flex gap-4 w-full max-w-md">
                                <div className="flex-1">
                                    <div className="flex justify-between text-[10px] uppercase font-bold mb-1">
                                        <span className="text-green-400">{t('vampire.trust')}</span>
                                        <span className="text-white">{Math.round(trust)}%</span>
                                    </div>
                                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${trust}%` }} />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between text-[10px] uppercase font-bold mb-1">
                                        <span className="text-red-400">{t('vampire.suspicion')}</span>
                                        <span className="text-white">{Math.round(suspicion)}%</span>
                                    </div>
                                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${suspicion}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Chat Area (Floating in 3D space visually) */}
                        <div className="flex-1 overflow-hidden relative pointer-events-auto flex flex-col justify-end pb-24 md:pb-28">
                            <div className="w-full max-w-2xl mx-auto px-4 space-y-3 overflow-y-auto max-h-[50vh] mask-image-linear-gradient-to-t">
                                {messages.map((m, i) => (
                                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in`}>
                                        <div className={`max-w-[85%] p-4 rounded-2xl text-sm md:text-base shadow-lg backdrop-blur-md border ${m.role === 'user'
                                                ? 'bg-purple-600/90 text-white rounded-br-none border-purple-400/30'
                                                : 'bg-black/70 text-gray-200 rounded-bl-none border-white/10 font-serif'
                                            }`}>
                                            {m.content}
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-black/50 text-gray-400 text-xs px-3 py-1 rounded-full animate-pulse border border-white/5">
                                            {t('games.vampireinvitation.thinking')}</div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-auto">
                            <div className="w-full max-w-2xl mx-auto flex gap-2">
                                <input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder={t('games.vampireinvitation.persuade_the_residen')}
                                    className="flex-1 bg-white/10 border border-white/10 rounded-full px-6 py-4 text-white placeholder-gray-500 focus:bg-black/80 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 backdrop-blur-md transition-all"
                                    autoFocus
                                />
                                <Button onClick={handleSend} disabled={!input || isLoading} className="rounded-full w-14 h-14 p-0 flex items-center justify-center shrink-0">
                                    <Send size={20} className={isLoading ? 'opacity-50' : ''} />
                                </Button>
                            </div>
                        </div>
                    </>
                )}

                {mode === 'WIN' && (
                    <div className="absolute inset-0 bg-green-950/90 backdrop-blur-xl pointer-events-auto flex flex-col items-center justify-center p-8 animate-in zoom-in">
                        <CheckCircle2 size={80} className="text-green-400 mb-6" />
                        <h2 className="text-4xl font-black text-white mb-2">{t('games.vampireinvitation.access_granted')}</h2>
                        <div className="text-green-200 mb-8 font-mono">{t('games.vampireinvitation.you_talked_your_way_')}</div>
                        <Button onClick={() => onComplete(100)} variant="primary" className="px-8 py-4 text-lg">
                            {t('games.vampireinvitation.enter_mansion')}</Button>
                    </div>
                )}

                {mode === 'LOSE' && (
                    <div className="absolute inset-0 bg-red-950/90 backdrop-blur-xl pointer-events-auto flex flex-col items-center justify-center p-8 animate-in zoom-in">
                        <AlertTriangle size={80} className="text-red-500 mb-6" />
                        <h2 className="text-4xl font-black text-white mb-2">{t('games.vampireinvitation.door_slammed')}</h2>
                        <div className="text-red-200 mb-8 font-mono">{t('games.vampireinvitation.they_called_the_poli')}</div>
                        <Button onClick={() => { setMode('DISGUISE'); setTrust(15); setSuspicion(10); setMessages([]); }} variant="ghost" className="px-8 py-4 text-lg border-white/20 hover:bg-white/10">
                            {t('games.vampireinvitation.try_another_disguise')}</Button>
                    </div>
                )}
            </div>
        </div>
    );
};
