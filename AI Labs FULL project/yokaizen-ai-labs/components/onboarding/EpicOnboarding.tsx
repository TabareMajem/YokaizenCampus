import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, Stars, MeshDistortMaterial, Float, Sparkles, Html } from '@react-three/drei';
import { CyberpunkEffects } from '../gl/CyberpunkEffects';
import * as THREE from 'three';
import { audio } from '../../services/audioService';
import { TRANSLATIONS } from '../../translations';
import { detectBrowserLanguage } from '../../constants';
import { Language } from '../../types';

interface EpicOnboardingProps {
    onComplete: (lang: Language) => void;
}

// 3D Wormhole Tunnel
const Wormhole = ({ speed }: { speed: number }) => {
    const groupRef = useRef<THREE.Group>(null);
    useFrame((_, delta) => {
        if (groupRef.current) {
            groupRef.current.position.z += speed * delta;
            if (groupRef.current.position.z > 50) groupRef.current.position.z -= 50;
            groupRef.current.rotation.z -= delta * 0.2;
        }
    });

    return (
        <group ref={groupRef} position={[0, 0, -50]}>
            {[...Array(40)].map((_, i) => (
                <mesh key={i} position={[0, 0, -i * 5]} rotation={[0, 0, (i * Math.PI) / 8]}>
                    <ringGeometry args={[10 + i * 0.5, 10.2 + i * 0.5, 32]} />
                    <meshBasicMaterial color={i % 3 === 0 ? '#c026d3' : '#06b6d4'} transparent opacity={1 - i / 40} side={THREE.DoubleSide} />
                </mesh>
            ))}
        </group>
    );
};

// Central AI Entity
const MasterEntity = ({ scale, state }: { scale: number, state: number }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame((_, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * 0.5;
            meshRef.current.rotation.x += delta * 0.2;
        }
    });

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
            <mesh ref={meshRef} scale={scale}>
                <icosahedronGeometry args={[2, 4]} />
                <MeshDistortMaterial
                    color={state === 0 ? '#4f46e5' : state === 1 ? '#06b6d4' : '#c026d3'}
                    emissive={state === 0 ? '#4f46e5' : state === 1 ? '#06b6d4' : '#c026d3'}
                    emissiveIntensity={2}
                    distort={0.3 + (state * 0.2)}
                    speed={2 + state}
                    wireframe
                />
            </mesh>
        </Float>
    );
};

export const EpicOnboarding: React.FC<EpicOnboardingProps> = ({ onComplete }) => {
    const [step, setStep] = useState(0);
    const [zoomSpeed, setZoomSpeed] = useState(20);
    const [coreScale, setCoreScale] = useState(0);
    const [detectedLang, setDetectedLang] = useState<Language>('EN');
    const [welcomeText, setWelcomeText] = useState("");

    useEffect(() => {
        // Detect language immediately
        const lang = detectBrowserLanguage();
        setDetectedLang(lang);
        const t = (key: string) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS['EN']?.[key] || key;

        audio.playScan();

        // Sequence Timeline
        const t1 = setTimeout(() => {
            setStep(1); // Show AI Hub
            setCoreScale(1);
            setZoomSpeed(5);
            setWelcomeText(t('auth.slogan_1') || "NEURAL LINK ESTABLISHED");
            audio.playSuccess();
        }, 3000);

        const t2 = setTimeout(() => {
            setStep(2); // Morph
            setWelcomeText(t('auth.slogan_2') || "REALITY IS MALLEABLE");
            audio.playHover();
        }, 7000);

        const t3 = setTimeout(() => {
            setStep(3); // Welcome
            setWelcomeText(t('auth.slogan_3') || "WELCOME TO YOKAIZEN AI LABS");
            audio.playSuccess();
        }, 11000);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, []);

    const handleEnter = () => {
        audio.playClick();
        setZoomSpeed(150); // Hyperdrive out
        setCoreScale(0);
        setTimeout(() => {
            onComplete(detectedLang);
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black overflow-hidden select-none font-mono">

            {/* 3D WebGL Background */}
            <div className="absolute inset-0">
                <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[0, 0, 0]} intensity={5} color="#c026d3" />

                    <Stars radius={100} depth={50} count={5000} factor={4} saturation={1} fade speed={2} />
                    <Wormhole speed={zoomSpeed} />

                    {step > 0 && (
                        <group>
                            <MasterEntity scale={coreScale} state={step - 1} />
                            <Sparkles count={100} scale={10} size={4} speed={0.4} opacity={0.5} color="#06b6d4" />
                        </group>
                    )}

                    <CyberpunkEffects
                        bloomIntensity={step === 0 ? 3 : zoomSpeed > 100 ? 8 : 4}
                        glitchFactor={step === 2 ? 0.05 : zoomSpeed > 100 ? 0.1 : 0}
                        noiseOpacity={0.15}
                    />
                </Canvas>
            </div>

            {/* Cinematic Text Overlays */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 pointer-events-none">
                {step === 0 && (
                    <h1 className="text-2xl md:text-4xl text-cyan-400 font-black tracking-[0.5em] uppercase animate-pulse drop-shadow-[0_0_15px_cyan]">
                        INITIALIZING PROTOCOL...
                    </h1>
                )}

                {step > 0 && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-32 text-center w-full">
                        <h2 className="text-3xl md:text-5xl text-white font-black tracking-widest uppercase animate-in fade-in slide-in-from-bottom-10 duration-1000 drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]" key={step}>
                            {welcomeText}
                        </h2>
                        {step === 1 && (
                            <p className="mt-4 text-cyan-400 text-sm tracking-[0.3em] uppercase animate-in fade-in delay-1000">
                                Language Protocol Detected: [{detectedLang}]
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Interaction */}
            {step >= 3 && (
                <div className="absolute bottom-12 inset-x-0 flex justify-center animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-500">
                    <button
                        onClick={handleEnter}
                        className="px-12 py-5 bg-white text-black font-black text-xl tracking-[0.3em] uppercase rounded-sm hover:scale-110 hover:bg-electric hover:text-white transition-all shadow-[0_0_40px_rgba(255,255,255,0.5)] active:scale-95 border-2 border-white/20"
                    >
                        ENTER NEXUS
                    </button>
                </div>
            )}
        </div>
    );
};
