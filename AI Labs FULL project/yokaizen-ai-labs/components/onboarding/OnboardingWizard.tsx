import React, { useState, useRef } from 'react';
import { Brain, Target, Shield, Palette, Zap, ChevronRight, Sparkles as SparklesIcon, Trophy } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles, MeshDistortMaterial, Sphere } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { useDialogue } from '../../contexts/DialogueContext';

interface OnboardingWizardProps {
    onComplete: (selectedSkills: string[]) => void;
    t: (key: string) => string;
}

const SKILLS = [
    { id: 'PROMPTING', name: 'Prompt Engineering', icon: Brain, color: 'from-cyan-500 to-blue-600', hex: '#00f0ff', desc: 'Master AI communication' },
    { id: 'SAFETY', name: 'AI Safety', icon: Shield, color: 'from-red-500 to-orange-600', hex: '#ff3366', desc: 'Break and defend AI systems' },
    { id: 'ETHICS', name: 'AI Ethics', icon: Target, color: 'from-purple-500 to-pink-600', hex: '#b026ff', desc: 'Bias detection & alignment' },
    { id: 'CREATIVITY', name: 'AI Creativity', icon: Palette, color: 'from-green-500 to-teal-600', hex: '#00ff9d', desc: 'Generate amazing content' },
];

const BackgroundCore = ({ activeColors }: { activeColors: string[] }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const primaryColor = activeColors.length > 0 ? activeColors[0] : '#444444';

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.elapsedTime * 0.2;
            meshRef.current.rotation.y = state.clock.elapsedTime * 0.15;

            // Pulse scale based on active selections
            const targetScale = 1.5 + (activeColors.length * 0.3);
            meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.05);
        }
    });

    return (
        <Float speed={2} rotationIntensity={1} floatIntensity={2}>
            <Sphere ref={meshRef} args={[1, 64, 64]}>
                <MeshDistortMaterial
                    color={primaryColor}
                    emissive={primaryColor}
                    emissiveIntensity={1.5}
                    distort={0.5}
                    speed={4}
                    roughness={0.1}
                    metalness={0.9}
                    clearcoat={1}
                />
            </Sphere>
        </Float>
    );
};

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, t }) => {
    const { queueDialogue } = useDialogue();
    const [step, setStep] = useState(1);
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [isAnimating, setIsAnimating] = useState(false);

    React.useEffect(() => {
        queueDialogue([
            {
                id: 'ob-intro-1',
                character: 'ATHENA',
                text: "Initialization sequence detected. Scanning biological interface..."
            },
            {
                id: 'ob-intro-2',
                character: 'BYTE',
                text: "Woah, hold up. You're actually letting them in without a background check? This is how you get malware in the coffee machine.",
                isGlitchy: true
            },
            {
                id: 'ob-intro-3',
                character: 'ATHENA',
                text: "Silence, Byte. The Vanguard protocol requires new blood. Human, structure your neural pathways. Choose your domains."
            }
        ]);
    }, [queueDialogue]);

    const handleSkillToggle = (skillId: string) => {
        audio.playClick();
        if (selectedSkills.includes(skillId)) {
            setSelectedSkills(prev => prev.filter(s => s !== skillId));
        } else if (selectedSkills.length < 2) {
            setSelectedSkills(prev => [...prev, skillId]);
        }
    };

    const handleContinue = () => {
        if (step === 1 && selectedSkills.length >= 1) {
            audio.playSuccess();
            setIsAnimating(true);
            setTimeout(() => {
                setStep(2);
                setIsAnimating(false);
            }, 500);
        } else if (step === 2) {
            audio.playSuccess();
            onComplete(selectedSkills);
        }
    };

    const activeHexColors = selectedSkills.map(id => SKILLS.find(s => s.id === id)?.hex || '#ffffff');

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center font-sans overflow-hidden bg-black">

            {/* 3D WebGL Background Layer */}
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={2} color={activeHexColors[0] || "#ffffff"} />
                    <pointLight position={[-10, -10, -10]} intensity={2} color={activeHexColors[1] || "#ffffff"} />

                    <BackgroundCore activeColors={activeHexColors} />

                    <Sparkles count={500} scale={15} size={3} speed={0.4} opacity={0.6} color={activeHexColors[0] || "#ffffff"} />
                    {activeHexColors[1] && <Sparkles count={300} scale={20} size={4} speed={0.6} opacity={0.8} color={activeHexColors[1]} />}

                    <EffectComposer>
                        <Bloom luminanceThreshold={0.15} luminanceSmoothing={0.9} height={300} intensity={2.5} />
                        <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.003, 0.003)} />
                    </EffectComposer>
                </Canvas>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-md"></div>
            </div>

            {/* Interactive Glassmorphism Overlay */}
            <div className={`relative z-10 w-full max-w-4xl px-4 sm:px-6 py-6 transition-all duration-500 ${isAnimating ? 'opacity-0 scale-110 blur-md' : 'opacity-100 scale-100 blur-0'}`}>

                {/* Progress Bar */}
                <div className="flex items-center justify-center mb-10 gap-3">
                    <div className={`h-1.5 w-20 sm:w-32 rounded-full transition-all duration-500 shadow-[0_0_10px_currentColor] ${step >= 1 ? 'bg-white text-white' : 'bg-white/20 text-transparent shadow-none'}`} />
                    <div className={`h-1.5 w-20 sm:w-32 rounded-full transition-all duration-500 shadow-[0_0_10px_currentColor] ${step >= 2 ? 'bg-white text-white' : 'bg-white/20 text-transparent shadow-none'}`} />
                </div>

                {step === 1 && (
                    <div className="text-center flex flex-col h-full justify-center">
                        <div className="mb-10 sm:mb-12">
                            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-4 tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                                CHOOSE YOUR MASTERY
                            </h2>
                            <p className="text-white/60 text-lg sm:text-xl tracking-widest uppercase font-bold">
                                Select up to 2 domains to initialize parameters
                            </p>
                        </div>

                        {/* Holographic Skill Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-12 max-w-3xl mx-auto">
                            {SKILLS.map(skill => {
                                const Icon = skill.icon;
                                const isSelected = selectedSkills.includes(skill.id);
                                return (
                                    <button
                                        key={skill.id}
                                        onClick={() => handleSkillToggle(skill.id)}
                                        onMouseEnter={() => audio.playHover()}
                                        className={`relative p-6 sm:p-8 rounded-3xl border-2 transition-all duration-300 text-left group overflow-hidden ${isSelected
                                            ? 'border-white bg-white/10 scale-105 shadow-[0_0_40px_rgba(255,255,255,0.2)]'
                                            : 'border-white/10 bg-black/40 hover:border-white/30 hover:bg-white/5 backdrop-blur-xl hover:scale-[1.02]'
                                            }`}
                                    >
                                        <div className={`absolute inset-0 bg-gradient-to-br ${skill.color} ${isSelected ? 'opacity-30' : 'opacity-0 group-hover:opacity-10'} transition-opacity duration-500`} />

                                        <div className="relative z-10 flex items-start gap-5">
                                            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${skill.color} flex items-center justify-center shadow-lg shadow-black/50 shrink-0`}>
                                                <Icon size={28} className="text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl sm:text-2xl font-black text-white mb-1 tracking-wide">{skill.name}</h3>
                                                <p className="text-sm sm:text-base text-white/60 font-medium">{skill.desc}</p>
                                            </div>
                                        </div>

                                        {isSelected && (
                                            <div className="absolute top-6 right-6 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-[0_0_20px_white] animate-in zoom-in duration-300">
                                                <Zap size={18} className="text-black" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={handleContinue}
                            disabled={selectedSkills.length === 0}
                            className={`px-10 py-5 sm:px-12 sm:py-6 font-black text-xl sm:text-2xl tracking-[0.2em] uppercase rounded-2xl transition-all duration-300 flex items-center justify-center mx-auto gap-4 ${selectedSkills.length > 0
                                ? 'bg-white text-black hover:scale-110 shadow-[0_0_40px_rgba(255,255,255,0.6)] hover:shadow-[0_0_60px_rgba(255,255,255,1)]'
                                : 'bg-white/10 text-white/30 cursor-not-allowed border border-white/10 backdrop-blur-md'
                                }`}
                        >
                            INITIALIZE <ChevronRight size={28} />
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="text-center flex flex-col h-full justify-center animate-in zoom-in-95 duration-700 fade-in slide-in-from-bottom-10">
                        <div className="mb-12">
                            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-white to-white/50 rounded-full flex items-center justify-center mb-8 animate-pulse shadow-[0_0_100px_rgba(255,255,255,0.6)]">
                                <SparklesIcon size={64} className="text-black" />
                            </div>
                            <h2 className="text-5xl sm:text-6xl md:text-7xl font-black text-white mb-6 tracking-tighter">
                                NEURAL LINK ESTABLISHED
                            </h2>
                            <p className="text-white/60 text-xl sm:text-2xl tracking-widest font-bold uppercase">
                                Welcome to the absolute cutting edge.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-12 max-w-4xl mx-auto">
                            {[
                                { icon: Trophy, color: 'text-yellow-400', value: '58', label: 'AAA GAMES' },
                                { icon: Brain, color: 'text-cyan-400', value: '4', label: 'SKILL DOMAINS' },
                                { icon: Zap, color: 'text-green-400', value: '∞', label: 'POTENTIAL' }
                            ].map((stat, i) => (
                                <div key={i} className="p-6 sm:p-8 bg-black/40 backdrop-blur-xl rounded-3xl border border-white/20 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                                    <stat.icon size={36} className={`${stat.color} mx-auto mb-4 drop-shadow-[0_0_15px_currentColor]`} />
                                    <div className="text-4xl sm:text-5xl font-black text-white mb-2">{stat.value}</div>
                                    <div className="text-sm font-bold text-white/50 tracking-widest uppercase">{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleContinue}
                            className="px-12 py-6 sm:px-16 sm:py-8 bg-white text-black font-black text-2xl sm:text-3xl tracking-[0.3em] uppercase rounded-2xl hover:scale-110 hover:bg-cyan-400 hover:text-black transition-all duration-300 flex items-center justify-center mx-auto gap-4 shadow-[0_0_60px_rgba(255,255,255,0.5)] active:scale-95 border-4 border-white/30"
                        >
                            DIVE IN <ChevronRight size={36} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
