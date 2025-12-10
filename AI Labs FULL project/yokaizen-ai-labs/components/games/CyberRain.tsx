
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Box } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '../ui/Button';
import { interactWithCyberRain } from '../../services/geminiService';
import { Mic, Send, Terminal, Bot, MicOff } from 'lucide-react';
import { CyberRainState, Language } from '../../types';

// Fix for R3F types
declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      meshStandardMaterial: any;
      planeGeometry: any;
      points: any;
      bufferGeometry: any;
      bufferAttribute: any;
      pointsMaterial: any;
      ambientLight: any;
      pointLight: any;
      fog: any;
    }
  }
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        group: any;
        mesh: any;
        meshStandardMaterial: any;
        planeGeometry: any;
        points: any;
        bufferGeometry: any;
        bufferAttribute: any;
        pointsMaterial: any;
        ambientLight: any;
        pointLight: any;
        fog: any;
      }
    }
  }
}

interface CyberRainProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
}

// --- 3D Components ---

interface BuildingProps {
    position: [number, number, number];
    height: number;
    neonColor: string;
}

const Building: React.FC<BuildingProps> = ({ position, height, neonColor }) => {
    const hasNeon = useMemo(() => Math.random() > 0.5, []);
    return (
        <group position={position}>
            <Box args={[1, height, 1]} position={[0, height / 2, 0]}>
                <meshStandardMaterial color="#1a1a1a" roughness={0.2} metalness={0.8} />
            </Box>
            {hasNeon && (
                 <Box args={[1.05, 0.1, 1.05]} position={[0, height * 0.8, 0]}>
                     <meshStandardMaterial color={neonColor} emissive={neonColor} emissiveIntensity={2} />
                 </Box>
            )}
        </group>
    );
};

const CityScape = ({ neonColor }: { neonColor: string }) => {
    const buildings = useMemo(() => {
        const b: { position: [number, number, number]; height: number }[] = [];
        for (let x = -5; x <= 5; x++) {
            for (let z = -5; z <= 5; z++) {
                if (Math.random() > 0.3) {
                    const height = Math.random() * 4 + 1;
                    b.push({ position: [x * 2, 0, z * 2] as [number, number, number], height });
                }
            }
        }
        return b;
    }, []);

    return (
        <group>
            {buildings.map((b, i) => (
                <Building key={i} position={b.position} height={b.height} neonColor={neonColor} />
            ))}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                <planeGeometry args={[50, 50]} />
                <meshStandardMaterial color="#050505" roughness={0.1} metalness={0.9} />
            </mesh>
        </group>
    );
};

const Rain = ({ count, intensity }: { count: number, intensity: number }) => {
    const mesh = useRef<THREE.Points>(null);
    const particles = useMemo(() => {
        const temp = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            temp[i * 3] = (Math.random() - 0.5) * 40; 
            temp[i * 3 + 1] = Math.random() * 20;     
            temp[i * 3 + 2] = (Math.random() - 0.5) * 40; 
        }
        return temp;
    }, [count]);

    useFrame((state, delta) => {
        if (!mesh.current) return;
        const positions = mesh.current.geometry.attributes.position.array as Float32Array;
        const speed = 10 * intensity;
        for (let i = 0; i < count; i++) {
            positions[i * 3 + 1] -= speed * delta;
            if (positions[i * 3 + 1] < 0) {
                positions[i * 3 + 1] = 20;
            }
        }
        mesh.current.geometry.attributes.position.needsUpdate = true;
        if (mesh.current) mesh.current.visible = intensity > 0.05;
    });

    return (
        <points ref={mesh}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={particles.length / 3}
                    array={particles}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial size={0.1} color="#aaaaaa" transparent opacity={0.6} blending={THREE.AdditiveBlending} />
        </points>
    );
};

const SceneController = ({ state }: { state: CyberRainState }) => {
    return (
        <>
            <ambientLight intensity={0.2} />
            <pointLight position={[10, 10, 10]} intensity={1} color={state.lightColor} />
            <pointLight position={[-10, 5, -10]} intensity={0.5} color={state.neonColor} />
            <fog attach="fog" args={[state.lightColor, 5, 15 + (1/state.fogDensity)]} />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <CityScape neonColor={state.neonColor} />
            <Rain count={2000} intensity={state.rainIntensity} />
            <OrbitControls enableZoom={false} maxPolarAngle={Math.PI / 2 - 0.1} autoRotate autoRotateSpeed={0.5} />
        </>
    );
};

// --- Main Component ---

export const CyberRain: React.FC<CyberRainProps> = ({ onComplete, t, language = 'EN' }) => {
    const [state, setState] = useState<CyberRainState>({
        rainIntensity: 0.5,
        lightColor: '#4b0082', // Indigo
        fogDensity: 0.02,
        neonColor: '#00ffff'
    });
    
    const [input, setInput] = useState('');
    const [aiFeedback, setAiFeedback] = useState(t('cyberrain.awaiting'));
    const [isProcessing, setIsProcessing] = useState(false);
    const [isListening, setIsListening] = useState(false);
    
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        setAiFeedback(t('cyberrain.awaiting'));
    }, [t]);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = language === 'JP' ? 'ja-JP' : language === 'ES' ? 'es-ES' : 'en-US';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            recognition.onresult = (event: any) => {
                const text = event.results[0][0].transcript;
                setInput(text);
                handleCommand(text); 
                setIsListening(false);
            };

            recognition.onspeechend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        }
    }, [language]);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert("Voice control not available.");
            return;
        }
        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const handleCommand = async (textOverride?: string) => {
        const text = textOverride || input;
        if (!text.trim()) return;
        setIsProcessing(true);
        
        const result = await interactWithCyberRain(state, text, language as Language);
        setState(result.newState);
        setAiFeedback(result.aiResponse);
        
        setIsProcessing(false);
        setInput('');
    };

    return (
        <div className="h-full flex flex-col bg-black relative">
            <div className="flex-1 relative">
                <Canvas camera={{ position: [5, 5, 10], fov: 60 }}>
                    <SceneController state={state} />
                </Canvas>
                
                <div className="absolute top-4 left-4 pointer-events-none">
                    <h2 className="text-2xl font-black text-white tracking-widest italic drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                        {t('cyberrain.hud_title')}
                    </h2>
                    <div className="mt-2 bg-black/50 p-2 rounded border border-white/10 backdrop-blur-sm font-mono text-[10px] text-cyan w-48">
                        <div>{t('cyberrain.atmosphere')}: {(state.rainIntensity * 100).toFixed(0)}%</div>
                        <div>{t('cyberrain.visibility')}: {((1 - state.fogDensity) * 100).toFixed(0)}%</div>
                    </div>
                </div>
            </div>

            <div className="h-1/3 bg-gray-900 border-t border-white/10 flex flex-col">
                 <div className="flex-1 p-4 overflow-y-auto font-mono text-sm space-y-2">
                     <div className="flex items-start space-x-2 text-gray-500">
                         <Terminal size={16} className="mt-0.5"/>
                         <span>{t('cyberrain.init_msg')}</span>
                     </div>
                     <div className="flex items-start space-x-2 text-electric">
                         <Bot size={16} className="mt-0.5"/>
                         <span>{aiFeedback}</span>
                     </div>
                 </div>
                 
                 <div className="p-4 bg-black border-t border-white/5 flex space-x-2">
                     <button 
                        onClick={toggleListening}
                        className={`p-3 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                     >
                         {isListening ? <MicOff size={20}/> : <Mic size={20} />}
                     </button>
                     <input 
                       className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 text-white focus:border-electric focus:outline-none font-mono text-sm"
                       placeholder={isListening ? "Listening..." : t('cyberrain.placeholder')}
                       value={input}
                       onChange={e => setInput(e.target.value)}
                       onKeyDown={e => e.key === 'Enter' && handleCommand()}
                     />
                     <Button variant="primary" onClick={() => handleCommand()} disabled={isProcessing || !input}>
                         {isProcessing ? <span className="animate-spin">...</span> : <Send size={20} />}
                     </Button>
                 </div>
            </div>
        </div>
    );
};
