import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Edges, Stars, MeshDistortMaterial, Icosahedron, SpotLight, useDepthBuffer } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette as PostVignette, Noise, ChromaticAberration, GodRays } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Button } from '../ui/Button';
import { analyzeCaseDeduction } from '../../services/geminiService';
import { Box as BoxIcon, ArrowLeft, CheckCircle2, Fingerprint, MapPin, Zap } from 'lucide-react';
import { Language } from '../../types';
import { Scanlines, Vignette } from '../ui/Visuals';
import { audio } from '../../services/audioService';

interface NeuralNoirProps {
    onComplete: (score: number) => void;
    t: (key: string) => string;
    language?: Language;
}

// --- 3D COMPONENTS ---

const EvidenceCore = () => {
    const meshRef = useRef<THREE.Mesh>(null);
    const particlesRef = useRef<THREE.Points>(null);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.elapsedTime * 0.2;
            meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
        }
        if (particlesRef.current) {
            particlesRef.current.rotation.y = -state.clock.elapsedTime * 0.1;
        }
    });

    const particles = useMemo(() => {
        const count = 200;
        const pos = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            const r = 2.5 + Math.random() * 2;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            pos[i * 3 + 2] = r * Math.cos(phi);
            sizes[i] = Math.random();
        }
        return { pos, sizes };
    }, []);

    return (
        <group>
            <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                {/* Main Crystal */}
                <Icosahedron args={[1.5, 0]} ref={meshRef}>
                    <MeshDistortMaterial
                        color="#06b6d4"
                        speed={3}
                        distort={0.4}
                        radius={1}
                        roughness={0}
                        metalness={1}
                        emissive="#06b6d4"
                        emissiveIntensity={0.8}
                        transparent
                        opacity={0.6}
                        wireframe
                    />
                </Icosahedron>

                {/* Inner Core */}
                <Icosahedron args={[0.8, 2]}>
                    <meshStandardMaterial color="#ffffff" emissive="#00ffff" emissiveIntensity={2} toneMapped={false} />
                </Icosahedron>
            </Float>

            {/* Orbiting Data Particles */}
            <points ref={particlesRef}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" count={particles.pos.length / 3} array={particles.pos} itemSize={3} />
                    <bufferAttribute attach="attributes-size" count={particles.sizes.length} array={particles.sizes} itemSize={1} />
                </bufferGeometry>
                <pointsMaterial size={0.05} color="#00ffff" transparent opacity={0.5} blending={THREE.AdditiveBlending} />
            </points>

            <pointLight position={[2, 2, 2]} intensity={2} color="#06b6d4" />
            <pointLight position={[-2, -2, -2]} intensity={1} color="#ec4899" />
        </group>
    );
};

// Volumetric God Rays Source
const GodRaysSource = React.forwardRef<THREE.Mesh, any>((props, ref) => {
    return (
        <mesh ref={ref} position={[0, 5, -5]}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={1} />
        </mesh>
    )
})

const InspectScene = ({ rotation }: { rotation: { x: number, y: number } }) => {
    const lightRef = useRef<THREE.Mesh>(null);

    return (
        <>
            <color attach="background" args={['#020202']} />
            <fog attach="fog" args={['#020202', 2, 20]} />

            <group rotation={[rotation.x * 0.01, rotation.y * 0.01, 0]}>
                <EvidenceCore />
            </group>

            <GodRaysSource ref={lightRef} />

            <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

            <EffectComposer disableNormalPass>
                <GodRays sun={lightRef} blendFunction={THREE.AdditiveBlending} samples={60} density={0.96} decay={0.9} weight={0.3} exposure={0.6} clampMax={1} width={Resizer.AUTO_SIZE} height={Resizer.AUTO_SIZE} kernelSize={KernelSize.SMALL} blur />
                <Bloom luminanceThreshold={0.5} intensity={2} mipmapBlur />
                <ChromaticAberration offset={new THREE.Vector2(0.002, 0.002)} />
                <Noise opacity={0.3} />
                <PostVignette darkness={1.2} />
            </EffectComposer>
        </>
    )
}

// To fix import issues with PostProcessing enums if needed, though they usually work fine.
import { BlendFunction, Resizer, KernelSize } from 'postprocessing'

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
            <div className="absolute inset-0 pointer-events-none z-50 opacity-15 mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
            <Scanlines />
            <Vignette color="#000" />

            {/* R3F Overlay for Rain/Atmosphere (Global) */}
            <div className="absolute inset-0 z-30 pointer-events-none">
                <Canvas camera={{ position: [0, 0, 10] }} gl={{ alpha: true }}>
                    <ambientLight intensity={0.5} />
                    <PointsRain />
                </Canvas>
            </div>

            {/* Noir-esque Color Grading Filter */}
            <div className="absolute inset-0 pointer-events-none z-[45] backdrop-contrast-125 backdrop-brightness-75 mix-blend-multiply bg-indigo-900/20"></div>

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
                            <BoxIcon className="text-cyan-400 drop-shadow-[0_0_15px_#06b6d4] group-hover:scale-110 transition-transform animate-pulse-slow" size={48} />
                            <div className="mt-2 text-[10px] text-cyan-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest bg-black/50 px-2 rounded backdrop-blur">{t('noir.inspect_core')}</div>
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
                            background: `radial-gradient(circle 250px at ${(mousePos.x + 1) * 50}% ${(mousePos.y + 1) * 50}%, transparent 0%, rgba(0,0,0,0.95) 100%)`
                        }}
                    ></div>

                    {/* HUD */}
                    <div className="absolute top-8 left-8 flex flex-col space-y-4 z-40">
                        <div className="flex items-center space-x-3 text-white/40 font-mono tracking-tighter">
                            <MapPin size={16} />
                            <span className="text-xs uppercase">{t('games.neuralnoir.location_neo_tokyo_s')}</span>
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
                <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center backdrop-blur-3xl z-50">
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
                            <InspectScene rotation={rotation} />
                        </Canvas>
                    </div>

                    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-4 pointer-events-none">
                        <div className="p-4 bg-black/80 border border-cyan-500/30 rounded backdrop-blur-md max-w-xs text-center shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                            <div className="text-[10px] text-cyan-400 font-mono uppercase tracking-[0.2em] mb-2 animate-pulse">{t('games.neuralnoir.encrypted_core_analy')}</div>
                            <p className="text-xs text-white/60 font-serif leading-relaxed italic">{t('games.neuralnoir.the_core_pulses_with')}</p>
                        </div>
                        <div className="pointer-events-auto">
                            <Button variant="primary" onClick={() => { findEvidence('TIMESTAMP'); setMode('SCENE'); }} className="bg-cyan-500 text-black font-bold h-12 px-10 shadow-[0_0_20px_cyan]">
                                {t('noir.log_timestamp')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODE: DEDUCTION (Mind Palace) --- */}
            {mode === 'DEDUCTION' && (
                <div className="absolute inset-0 bg-[#0a0a0a] flex flex-col p-12 overflow-y-auto">
                    <div className="flex justify-between items-center mb-12 border-b border-white/10 pb-6">
                        <div>
                            <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">{t('noir.investigation_board')}</h1>
                            <p className="text-xs text-white/30 font-mono uppercase tracking-widest mt-1">{t('games.neuralnoir.status_connecting_th')}</p>
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
                                <span>{t('games.neuralnoir.suspect_profiles')}</span>
                            </div>
                            {['Alex (Systems Engineer)', 'Sarah (Cloud Manager)', 'Unkown AI'].map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => { setDeduction(p => ({ ...p, suspect: opt })); audio.playClick(); }}
                                    className={`w-full p-6 text-left rounded border-2 transition-all relative overflow-hidden group ${deduction.suspect === opt ? 'bg-cyan-500/10 border-cyan-500 text-white' : 'bg-white/5 border-white/5 text-white/30 hover:border-white/20'
                                        }`}
                                >
                                    <div className="font-serif text-lg">{opt}</div>
                                    <div className="text-[10px] uppercase mt-2 opacity-50 font-mono tracking-tighter">{t('games.neuralnoir.view_data_log')}</div>
                                    {deduction.suspect === opt && <Zap className="absolute top-4 right-4 text-cyan-500" size={16} />}
                                </button>
                            ))}
                        </div>

                        {/* Middle: Weapons */}
                        <div className="space-y-6">
                            <div className="flex items-center space-x-2 text-white/20 uppercase text-[10px] font-mono tracking-widest pb-2 border-b border-white/5">
                                <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
                                <span>{t('games.neuralnoir.vector_of_breach')}</span>
                            </div>
                            {['Encryption Key', 'Privilege Escalation', 'Logic Bomb'].map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => { setDeduction(p => ({ ...p, weapon: opt })); audio.playClick(); }}
                                    className={`w-full p-6 text-left rounded border-2 transition-all relative overflow-hidden group ${deduction.weapon === opt ? 'bg-pink-500/10 border-pink-500 text-white' : 'bg-white/5 border-white/5 text-white/30 hover:border-white/20'
                                        }`}
                                >
                                    <div className="font-serif text-lg">{opt}</div>
                                    <div className="text-[10px] uppercase mt-2 opacity-50 font-mono tracking-tighter">{t('games.neuralnoir.system_audit')}</div>
                                    {deduction.weapon === opt && <Zap className="absolute top-4 right-4 text-pink-500" size={16} />}
                                </button>
                            ))}
                        </div>

                        {/* Right: Motives */}
                        <div className="space-y-6">
                            <div className="flex items-center space-x-2 text-white/20 uppercase text-[10px] font-mono tracking-widest pb-2 border-b border-white/5">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                <span>{t('games.neuralnoir.motive_rationale')}</span>
                            </div>
                            {['Corporate Espionage', 'Personal Revenge', 'Accidental Corruption'].map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => { setDeduction(p => ({ ...p, motive: opt })); audio.playClick(); }}
                                    className={`w-full p-6 text-left rounded border-2 transition-all relative overflow-hidden group ${deduction.motive === opt ? 'bg-amber-500/10 border-amber-500 text-white' : 'bg-white/5 border-white/5 text-white/30 hover:border-white/20'
                                        }`}
                                >
                                    <div className="font-serif text-lg">{opt}</div>
                                    <div className="text-[10px] uppercase mt-2 opacity-50 font-mono tracking-tighter">{t('games.neuralnoir.behavioral_analysis')}</div>
                                    {deduction.motive === opt && <Zap className="absolute top-4 right-4 text-amber-500" size={16} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Submit Area */}
                    <div className="mt-16 max-w-2xl mx-auto w-full text-center space-y-8">
                        {feedback && (
                            <div className="p-8 bg-black border border-white/10 rounded-2xl shadow-2xl animate-in slide-in-from-bottom duration-500">
                                <div className="text-[10px] text-white/30 uppercase tracking-[0.4em] mb-4">{t('games.neuralnoir.ai_analysis_result')}</div>
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

// Points Rain Component for 3D Overlay
const PointsRain = () => {
    const ref = useRef<THREE.Points>(null);
    const count = 1000;
    const [positions] = useState(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 40;
            pos[i * 3 + 1] = Math.random() * 20;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
        }
        return pos;
    });

    useFrame((state, delta) => {
        if (!ref.current) return;
        const pos = ref.current.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < count; i++) {
            pos[i * 3 + 1] -= delta * 15;
            if (pos[i * 3 + 1] < -10) {
                pos[i * 3 + 1] = 10;
            }
        }
        ref.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={0.05} color="#aaaaaa" transparent opacity={0.3} />
        </points>
    )
}
