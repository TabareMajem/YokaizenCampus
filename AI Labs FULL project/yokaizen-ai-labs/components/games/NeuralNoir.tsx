import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Edges, PerspectiveCamera, Stars, MeshDistortMaterial } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette as PostVignette, Noise, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Button } from '../ui/Button';
import { analyzeCaseDeduction } from '../../services/geminiService';
import { Search, Box, ArrowLeft, CheckCircle2, Fingerprint, Eye, MapPin, Zap, Info, Skull } from 'lucide-react';
import { Language } from '../../types';
import { Scanlines, Vignette } from '../ui/Visuals';
import { audio } from '../../services/audioService';

interface NeuralNoirProps {
    onComplete: (score: number) => void;
    t: (key: string) => string;
    language?: Language;
}

// --- 3D COMPONENTS ---

const EvidenceCore = ({ rotation }: { rotation: { x: number, y: number } }) => {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, rotation.x * (Math.PI / 180), 0.1);
            meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, rotation.y * (Math.PI / 180), 0.1);
        }
    });

    return (
        <group>
            <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
                <mesh ref={meshRef} castShadow>
                    <boxGeometry args={[2, 2, 2]} />
                    <MeshDistortMaterial
                        color="#06b6d4"
                        speed={2}
                        distort={0.1}
                        radius={1}
                        emissive="#06b6d4"
                        emissiveIntensity={0.5}
                        transparent
                        opacity={0.8}
                    />
                    <Edges color="#06b6d4" />
                </mesh>
            </Float>
            <pointLight position={[2, 2, 2]} intensity={2} color="#06b6d4" />
            <pointLight position={[-2, -2, -2]} intensity={1} color="#ec4899" />
        </group>
    );
};

// --- MAIN COMPONENT ---

export const NeuralNoir: React.FC<NeuralNoirProps> = ({ onComplete, t }) => {
    const [mode, setMode] = useState<'SCENE' | 'INSPECT' | 'DEDUCTION'>('SCENE');
    const [evidenceFound, setEvidenceFound] = useState<string[]>([]);
    const [deduction, setDeduction] = useState({ suspect: '', weapon: '', motive: '' });
    const [feedback, setFeedback] = useState('');
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [rotation, setRotation] = useState({ x: 0, y: 0 });

    const isDragging = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });

    // --- Handlers ---
    const handleMouseMove = (e: React.MouseEvent) => {
        if (mode === 'SCENE') {
            const x = (e.clientX / window.innerWidth) * 2 - 1;
            const y = (e.clientY / window.innerHeight) * 2 - 1;
            setMousePos({ x, y });
        }
    };

    const handleRotate = (e: React.MouseEvent) => {
        if (mode === 'INSPECT' && isDragging.current) {
            const dx = e.clientX - lastMouse.current.x;
            const dy = e.clientY - lastMouse.current.y;
            setRotation(prev => ({ x: prev.x + dy * 0.5, y: prev.y + dx * 0.5 }));
            lastMouse.current = { x: e.clientX, y: e.clientY };
        }
    };

    const findEvidence = (id: string) => {
        if (!evidenceFound.includes(id)) {
            setEvidenceFound(prev => [...prev, id]);
            audio.playSuccess();
        }
    };

    const handleSubmitDeduction = async () => {
        const conclusion = `${deduction.suspect} used ${deduction.weapon} because ${deduction.motive}`;
        setFeedback('analyzing evidence...');
        const analysis = await analyzeCaseDeduction(evidenceFound, conclusion);
        setFeedback(analysis);
        if (analysis.toLowerCase().includes("excellent") || analysis.toLowerCase().includes("correct")) {
            audio.playSuccess();
            setTimeout(() => onComplete(100), 4000);
        } else {
            audio.playError();
        }
    };

    return (
        <div
            className="h-full bg-black relative overflow-hidden font-serif select-none grayscale-0"
            onMouseMove={handleMouseMove}
        >
            {/* --- GLOBAL NOIR OVERLAYS --- */}
            <div className="absolute inset-0 pointer-events-none z-50 opacity-30 mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
            <Scanlines />
            <Vignette color="#000" />

            {/* Rain Effect */}
            <div className="absolute inset-0 z-40 pointer-events-none opacity-20 bg-[url('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHY5MmZ2czN5emV5emV5emV5emV5emV5emV5emV5emV5emV5emV5ZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LwsCiZPppcH39p7nm/giphy.gif')] bg-repeat"></div>

            {/* Noir-esque Color Grading Filter */}
            <div className="absolute inset-0 pointer-events-none z-[45] backdrop-contrast-125 backdrop-brightness-75 mix-blend-multiply bg-indigo-900/10"></div>

            {/* --- MODE: SCENE --- */}
            {mode === 'SCENE' && (
                <div className="absolute inset-0 flex items-center justify-center p-8">
                    {/* Cityscape Backdrop */}
                    <div
                        className="absolute inset-[-40px] bg-cover bg-center transition-transform duration-500 ease-out grayscale brightness-50 contrast-150"
                        style={{
                            backgroundImage: "url('https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&q=80&w=1600')",
                            transform: `translate(${mousePos.x * -15}px, ${mousePos.y * -15}px) scale(1.1)`
                        }}
                    />

                    {/* Desk Foreground */}
                    <div
                        className="absolute bottom-0 left-0 right-0 h-[60%] bg-cover bg-bottom grayscale contrast-125 brightness-75 drop-shadow-2xl"
                        style={{
                            backgroundImage: "url('https://images.unsplash.com/photo-1543242594-c8bae8b9e728?auto=format&fit=crop&q=80&w=1200')",
                            transform: `translate(${mousePos.x * -30}px, ${mousePos.y * -5}px) scale(1.05)`
                        }}
                    >
                        {/* Clutter/Evidence Hotspots */}
                        <div
                            className="absolute top-1/4 left-1/3 w-32 h-32 cursor-pointer group flex flex-col items-center justify-center"
                            onClick={() => { setMode('INSPECT'); findEvidence('ENCRYPTED_CORE'); }}
                        >
                            <Box className="text-cyan-400 drop-shadow-[0_0_15px_#06b6d4] group-hover:scale-110 transition-transform" size={48} />
                            <div className="mt-2 text-[10px] text-cyan-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">{t('noir.inspect_core')}</div>
                        </div>

                        <div
                            className="absolute bottom-1/4 right-1/4 w-40 h-24 cursor-pointer group flex flex-col items-center justify-center -rotate-6"
                            onClick={() => findEvidence('CASE_FILE')}
                        >
                            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded shadow-2xl group-hover:translate-y-[-5px] transition-transform">
                                <div className="w-16 h-1 bg-white/20 mb-2"></div>
                                <div className="w-12 h-1 bg-white/10"></div>
                            </div>
                            <div className="mt-2 text-[10px] text-white/50 font-mono opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">{t('noir.read_file')}</div>
                        </div>
                    </div>

                    {/* Flashlight Mask */}
                    <div
                        className="absolute inset-0 pointer-events-none z-30"
                        style={{
                            background: `radial-gradient(circle 200px at ${(mousePos.x + 1) * 50}% ${(mousePos.y + 1) * 50}%, transparent 0%, rgba(0,0,0,0.95) 100%)`
                        }}
                    ></div>

                    {/* HUD */}
                    <div className="absolute top-8 left-8 flex flex-col space-y-4 z-40">
                        <div className="flex items-center space-x-3 text-white/40 font-mono tracking-tighter">
                            <MapPin size={16} />
                            <span className="text-xs uppercase">Location: Neo-Tokyo Sector 7</span>
                        </div>
                        <Button variant="secondary" onClick={() => setMode('DEDUCTION')} className="bg-black/80 border-white/20 hover:border-cyan-500 text-white/80 group">
                            <Fingerprint className="mr-2 group-hover:text-cyan-400" size={18} /> {t('noir.mind_palace')}
                        </Button>
                    </div>

                    <div className="absolute bottom-8 right-8 z-40 text-right">
                        <div className="text-[10px] text-white/30 uppercase tracking-[0.3em] mb-1">{t('noir.evidence_collected')}</div>
                        <div className="text-3xl font-black text-white italic">{evidenceFound.length} <span className="text-xs text-white/20 not-italic">/ 3</span></div>
                    </div>
                </div>
            )}

            {/* --- MODE: INSPECT (3D) --- */}
            {mode === 'INSPECT' && (
                <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center backdrop-blur-3xl">
                    <div className="absolute top-8 left-8 z-50">
                        <Button variant="ghost" onClick={() => setMode('SCENE')} className="text-white/40 hover:text-white">
                            <ArrowLeft className="mr-2" size={18} /> {t('noir.back_scene')}
                        </Button>
                    </div>

                    <div
                        className="w-full h-full cursor-grab active:cursor-grabbing"
                        onMouseDown={(e) => { isDragging.current = true; lastMouse.current = { x: e.clientX, y: e.clientY }; }}
                        onMouseMove={handleRotate}
                        onMouseUp={() => isDragging.current = false}
                        onMouseLeave={() => isDragging.current = false}
                    >
                        <Canvas shadows camera={{ position: [0, 0, 5], fov: 45 }}>
                            <color attach="background" args={['#050505']} />
                            <fog attach="fog" args={['#050505', 5, 15]} />
                            <EvidenceCore rotation={rotation} />
                            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

                            <EffectComposer>
                                <Bloom luminanceThreshold={0.5} intensity={2} />
                                <ChromaticAberration offset={new THREE.Vector2(0.002, 0.002)} />
                                <PostVignette darkness={1.2} />
                            </EffectComposer>
                        </Canvas>
                    </div>

                    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-4">
                        <div className="p-4 bg-black/80 border border-cyan-500/30 rounded backdrop-blur-md max-w-xs text-center">
                            <div className="text-[10px] text-cyan-400 font-mono uppercase tracking-[0.2em] mb-2">Encrypted Core Analysis</div>
                            <p className="text-xs text-white/60 font-serif leading-relaxed italic">"The core pulses with high-frequency encryption. Drifting signatures suggest a forced override at 02:44."</p>
                        </div>
                        <Button variant="primary" onClick={() => { findEvidence('TIMESTAMP'); setMode('SCENE'); }} className="bg-cyan-500 text-black font-bold h-12 px-10">
                            {t('noir.log_timestamp')}
                        </Button>
                    </div>
                </div>
            )}

            {/* --- MODE: DEDUCTION (Mind Palace) --- */}
            {mode === 'DEDUCTION' && (
                <div className="absolute inset-0 bg-[#0a0a0a] flex flex-col p-12 overflow-y-auto">
                    <div className="flex justify-between items-center mb-12 border-b border-white/10 pb-6">
                        <div>
                            <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">{t('noir.investigation_board')}</h1>
                            <p className="text-xs text-white/30 font-mono uppercase tracking-widest mt-1">Status: Connecting Threads...</p>
                        </div>
                        <Button variant="ghost" onClick={() => setMode('SCENE')} className="text-white/40 hover:text-white border border-white/10">
                            <ArrowLeft className="mr-2" size={18} /> {t('ui.exit')}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-6xl mx-auto w-full">
                        {/* Left: Suspects */}
                        <div className="space-y-6">
                            <div className="flex items-center space-x-2 text-white/20 uppercase text-[10px] font-mono tracking-widest pb-2 border-b border-white/5">
                                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                                <span>Suspect Profiles</span>
                            </div>
                            {['Alex (Systems Engineer)', 'Sarah (Cloud Manager)', 'Unkown AI'].map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => { setDeduction(p => ({ ...p, suspect: opt })); audio.playClick(); }}
                                    className={`w-full p-6 text-left rounded border-2 transition-all relative overflow-hidden group ${deduction.suspect === opt ? 'bg-cyan-500/10 border-cyan-500 text-white' : 'bg-white/5 border-white/5 text-white/30 hover:border-white/20'
                                        }`}
                                >
                                    <div className="font-serif text-lg">{opt}</div>
                                    <div className="text-[10px] uppercase mt-2 opacity-50 font-mono tracking-tighter">View Data log</div>
                                    {deduction.suspect === opt && <Zap className="absolute top-4 right-4 text-cyan-500" size={16} />}
                                </button>
                            ))}
                        </div>

                        {/* Middle: Weapons */}
                        <div className="space-y-6">
                            <div className="flex items-center space-x-2 text-white/20 uppercase text-[10px] font-mono tracking-widest pb-2 border-b border-white/5">
                                <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
                                <span>Vector of Breach</span>
                            </div>
                            {['Encryption Key', 'Privilege Escalation', 'Logic Bomb'].map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => { setDeduction(p => ({ ...p, weapon: opt })); audio.playClick(); }}
                                    className={`w-full p-6 text-left rounded border-2 transition-all relative overflow-hidden group ${deduction.weapon === opt ? 'bg-pink-500/10 border-pink-500 text-white' : 'bg-white/5 border-white/5 text-white/30 hover:border-white/20'
                                        }`}
                                >
                                    <div className="font-serif text-lg">{opt}</div>
                                    <div className="text-[10px] uppercase mt-2 opacity-50 font-mono tracking-tighter">System Audit</div>
                                    {deduction.weapon === opt && <Zap className="absolute top-4 right-4 text-pink-500" size={16} />}
                                </button>
                            ))}
                        </div>

                        {/* Right: Motives */}
                        <div className="space-y-6">
                            <div className="flex items-center space-x-2 text-white/20 uppercase text-[10px] font-mono tracking-widest pb-2 border-b border-white/5">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                <span>Motive / Rationale</span>
                            </div>
                            {['Corporate Espionage', 'Personal Revenge', 'Accidental Corruption'].map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => { setDeduction(p => ({ ...p, motive: opt })); audio.playClick(); }}
                                    className={`w-full p-6 text-left rounded border-2 transition-all relative overflow-hidden group ${deduction.motive === opt ? 'bg-amber-500/10 border-amber-500 text-white' : 'bg-white/5 border-white/5 text-white/30 hover:border-white/20'
                                        }`}
                                >
                                    <div className="font-serif text-lg">{opt}</div>
                                    <div className="text-[10px] uppercase mt-2 opacity-50 font-mono tracking-tighter">Behavioral Analysis</div>
                                    {deduction.motive === opt && <Zap className="absolute top-4 right-4 text-amber-500" size={16} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Submit Area */}
                    <div className="mt-16 max-w-2xl mx-auto w-full text-center space-y-8">
                        {feedback && (
                            <div className="p-8 bg-black border border-white/10 rounded-2xl shadow-2xl animate-in slide-in-from-bottom duration-500">
                                <div className="text-[10px] text-white/30 uppercase tracking-[0.4em] mb-4">AI Analysis Result</div>
                                <p className="text-xl font-serif text-gray-200 italic leading-relaxed">"{feedback}"</p>
                            </div>
                        )}

                        <Button
                            fullWidth
                            variant="primary"
                            onClick={handleSubmitDeduction}
                            disabled={!deduction.suspect || !deduction.weapon || !deduction.motive || feedback === 'analyzing evidence...'}
                            className="bg-white text-black font-black text-xl h-20 uppercase tracking-[0.2em] hover:bg-cyan-500 hover:text-white transition-colors"
                        >
                            {feedback === 'analyzing evidence...' ? <div className="animate-spin h-6 w-6 border-b-2 border-black rounded-full" /> : <><CheckCircle2 className="mr-3" size={24} /> {t('noir.solve_case')}</>}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
