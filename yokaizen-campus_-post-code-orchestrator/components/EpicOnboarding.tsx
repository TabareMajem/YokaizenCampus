import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, MeshDistortMaterial, Float, Sparkles } from '@react-three/drei';
import { CyberpunkEffects } from './CyberpunkEffects';
import * as THREE from 'three';
import { Language } from '../types';

interface EpicOnboardingProps {
    onComplete: (lang: Language) => void;
}

const detectBrowserLanguage = (): Language => {
    const lang = navigator.language.slice(0, 2).toUpperCase();
    if (Object.values(Language).includes(lang as Language)) {
        return lang as Language;
    }
    return Language.EN;
};

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
                    <meshBasicMaterial color={i % 3 === 0 ? '#4f46e5' : '#06b6d4'} transparent opacity={1 - i / 40} side={THREE.DoubleSide} />
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
                    color={state === 0 ? '#10b981' : state === 1 ? '#06b6d4' : '#6366f1'}
                    emissive={state === 0 ? '#10b981' : state === 1 ? '#06b6d4' : '#6366f1'}
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
    const [detectedLang, setDetectedLang] = useState<Language>(Language.EN);
    const [welcomeText, setWelcomeText] = useState("");

    useEffect(() => {
        const lang = detectBrowserLanguage();
        setDetectedLang(lang);

        // Sequence
        const t1 = setTimeout(() => {
            setStep(1);
            setCoreScale(1);
            setZoomSpeed(5);
            setWelcomeText(lang === 'ES' ? "ENLACE NEURONAL ESTABLECIDO" : "NEURAL LINK ESTABLISHED");
        }, 3000);

        const t2 = setTimeout(() => {
            setStep(2);
            setWelcomeText(lang === 'ES' ? "CALIBRANDO LA REALIDAD" : "CALIBRATING REALITY");
        }, 6000);

        const t3 = setTimeout(() => {
            setStep(3);
            setWelcomeText(lang === 'ES' ? "BIENVENIDO A YOKAIZEN CAMPUS" : "WELCOME TO YOKAIZEN CAMPUS");
        }, 9000);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, []);

    const handleEnter = () => {
        setZoomSpeed(150);
        setCoreScale(0);
        setTimeout(() => {
            onComplete(detectedLang);
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-[300] bg-black overflow-hidden select-none font-mono">
            <div className="absolute inset-0">
                <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[0, 0, 0]} intensity={5} color="#06b6d4" />

                    <Stars radius={100} depth={50} count={5000} factor={4} saturation={1} fade speed={2} />
                    <Wormhole speed={zoomSpeed} />

                    {step > 0 && (
                        <group>
                            <MasterEntity scale={coreScale} state={step - 1} />
                            <Sparkles count={100} scale={10} size={4} speed={0.4} opacity={0.5} color="#10b981" />
                        </group>
                    )}

                    <CyberpunkEffects
                        bloomIntensity={step === 0 ? 3 : zoomSpeed > 100 ? 8 : 4}
                        glitchFactor={step === 2 ? 0.05 : zoomSpeed > 100 ? 0.1 : 0}
                        noiseOpacity={0.15}
                    />
                </Canvas>
            </div>

            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 pointer-events-none">
                {step === 0 && (
                    <h1 className="text-2xl md:text-4xl text-emerald-400 font-black tracking-[0.5em] uppercase animate-pulse drop-shadow-[0_0_15px_#10b981]">
                        INITIALIZING PROTOCOL...
                    </h1>
                )}

                {step > 0 && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-32 text-center w-full">
                        <h2 className="text-3xl md:text-5xl text-white font-black tracking-widest uppercase animate-in fade-in slide-in-from-bottom-10 duration-1000 drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]" key={step}>
                            {welcomeText}
                        </h2>
                        {step === 1 && (
                            <p className="mt-4 text-emerald-400 text-sm tracking-[0.3em] uppercase animate-in fade-in delay-1000">
                                Language Protocol Detected: [{detectedLang}]
                            </p>
                        )}
                    </div>
                )}
            </div>

            {step >= 3 && (
                <div className="absolute bottom-12 inset-x-0 flex justify-center animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-500">
                    <button
                        onClick={handleEnter}
                        className="px-12 py-5 bg-white text-black font-black text-xl tracking-[0.3em] uppercase rounded-sm hover:scale-110 hover:bg-emerald-400 hover:text-black transition-all shadow-[0_0_40px_rgba(255,255,255,0.5)] active:scale-95 border-2 border-white/20"
                    >
                        ENTER CAMPUS
                    </button>
                </div>
            )}
        </div>
    );
};
