
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Shield, Zap, AlertOctagon, CheckCircle2, Skull, Rocket, Activity, Crosshair, ShieldAlert } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Language } from '../../types';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Stars } from '@react-three/drei';
import { CyberpunkEffects } from '../gl/CyberpunkEffects';
import * as THREE from 'three';

interface DefenseStrategistProps {
    onComplete: (score: number) => void;
    t: (key: string) => string;
    language?: Language;
}

interface Threat {
    id: number;
    x: number; // angle 0-180
    y: number; // distance 100 -> 0
    type: 'DRONE' | 'ARMORED' | 'FAST' | 'BIRD';
    hp: number;
    scanned: boolean;
    destroyed: boolean;
}

const ThreatMesh = ({ threat }: { threat: Threat }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const isArmored = threat.type === 'ARMORED';
    const isFast = threat.type === 'FAST';
    const isBird = threat.type === 'BIRD';
    const color = threat.scanned ? (isBird ? '#22c55e' : isArmored ? '#f97316' : '#ef4444') : '#ffffff';

    useFrame((state, delta) => {
        if (meshRef.current) {
            const worldX = (threat.x / 180) * 100 - 50;
            const worldY = (threat.y / 100) * 80 - 40;
            meshRef.current.position.set(worldX, worldY, 0);
            meshRef.current.rotation.x += delta * (isFast ? 10 : 2);
            meshRef.current.rotation.y += delta * 2;
        }
    });

    return (
        <mesh ref={meshRef}>
            {isArmored ? <boxGeometry args={[4, 4, 4]} /> : isBird ? <octahedronGeometry args={[2]} /> : <tetrahedronGeometry args={[3]} />}
            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={threat.scanned ? 2 : 0.5}
                wireframe={!threat.scanned}
            />
        </mesh>
    );
};

const DomeShield = ({ activeSector, integrity }: { activeSector: number | null, integrity: number }) => {
    const shieldRef = useRef<THREE.Mesh>(null);

    useFrame((state, delta) => {
        if (shieldRef.current) {
            shieldRef.current.rotation.z += delta * 0.1;
        }
    });

    return (
        <group position={[0, -50, 0]}>
            <mesh ref={shieldRef}>
                <sphereGeometry args={[45, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <MeshDistortMaterial
                    color="#06b6d4"
                    emissive={activeSector !== null ? "#06b6d4" : "#0891b2"}
                    emissiveIntensity={activeSector !== null ? 2 : 0.2}
                    wireframe
                    distort={integrity < 30 ? 0.4 : 0.1}
                    speed={integrity < 30 ? 5 : 1}
                    transparent
                    opacity={0.3}
                />
            </mesh>
            {/* Sector Highlight Beams */}
            {activeSector !== null && (
                <mesh position={[(activeSector - 1) * 20, 20, 0]} rotation={[0, 0, 0]}>
                    <cylinderGeometry args={[15, 0, 80, 16]} />
                    <meshBasicMaterial color="#06b6d4" transparent opacity={0.3} blending={THREE.AdditiveBlending} />
                </mesh>
            )}
        </group>
    );
};

export const DefenseStrategist: React.FC<DefenseStrategistProps> = ({ onComplete, t }) => {
    const [threats, setThreats] = useState<Threat[]>([]);
    const [energy, setEnergy] = useState(100);
    const [integrity, setIntegrity] = useState(100);
    const [gameOver, setGameOver] = useState(false);
    const [activeSector, setActiveSector] = useState<number | null>(null);
    const [empCooldown, setEmpCooldown] = useState(0);

    const frameRef = useRef(0);

    useEffect(() => {
        if (gameOver) return;

        const spawnInterval = setInterval(() => {
            const roll = Math.random();
            let type: Threat['type'] = 'DRONE';
            let hp = 1;

            if (roll > 0.85) { type = 'ARMORED'; hp = 2; }
            else if (roll > 0.7) { type = 'FAST'; hp = 1; }
            else if (roll > 0.6) { type = 'BIRD'; hp = 1; }

            const newThreat: Threat = {
                id: Date.now(),
                x: Math.random() * 180,
                y: 100,
                type,
                hp,
                scanned: false,
                destroyed: false
            };
            setThreats(prev => [...prev, newThreat]);
        }, 1200);

        const loop = () => {
            setEnergy(e => Math.min(100, e + 0.2));
            if (empCooldown > 0) setEmpCooldown(c => Math.max(0, c - 1));

            setThreats(prev => prev.map(t => {
                if (t.destroyed) return t;

                const speed = t.type === 'FAST' ? 0.8 : t.type === 'ARMORED' ? 0.3 : 0.5;
                const newY = t.y - speed;

                if (newY <= 0) {
                    if (t.type !== 'BIRD') {
                        const sector = Math.floor(t.x / 60);
                        if (activeSector === sector && energy > 5) {
                            setEnergy(e => e - 5);
                            audio.playSuccess();
                            return { ...t, destroyed: true };
                        } else {
                            setIntegrity(i => Math.max(0, i - (t.type === 'ARMORED' ? 25 : 15)));
                            audio.playError();
                            return { ...t, destroyed: true };
                        }
                    }
                    return { ...t, destroyed: true };
                }
                return { ...t, y: newY };
            }).filter(t => t.y > -5));

            if (integrity <= 0) setGameOver(true);
            frameRef.current = requestAnimationFrame(loop);
        };

        frameRef.current = requestAnimationFrame(loop);
        return () => {
            clearInterval(spawnInterval);
            cancelAnimationFrame(frameRef.current);
        };
    }, [gameOver, activeSector, energy, integrity, empCooldown]);

    const handleTapThreat = (id: number) => {
        setThreats(prev => prev.map(t => {
            if (t.id === id && !t.destroyed) {
                if (!t.scanned) {
                    audio.playScan();
                    return { ...t, scanned: true };
                }
                if (energy >= 10 && t.type !== 'BIRD') {
                    setEnergy(e => e - 10);
                    audio.playClick();
                    const newHp = t.hp - 1;
                    return { ...t, hp: newHp, destroyed: newHp <= 0 };
                }
            }
            return t;
        }));
    };

    const fireEMP = () => {
        if (empCooldown > 0 || energy < 50) return;
        setEnergy(e => e - 50);
        setEmpCooldown(300);
        audio.playGlitch();
        setThreats(prev => prev.map(t => ({ ...t, destroyed: true })));
    };

    return (
        <div className="h-full flex flex-col bg-slate-950 relative overflow-hidden select-none touch-none">
            {/* 3D WebGL Background */}
            <div className="absolute inset-0 z-0">
                <Canvas orthographic camera={{ position: [0, 0, 100], zoom: 10 }}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[0, 50, 50]} intensity={2} color="#06b6d4" />
                    <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={2} />
                    <DomeShield activeSector={activeSector} integrity={integrity} />
                    {threats.map(t => !t.destroyed && <ThreatMesh key={t.id} threat={t} />)}
                    <CyberpunkEffects
                        bloomIntensity={empCooldown > 280 ? 5 : 2}
                        glitchFactor={integrity < 30 ? 0.005 : empCooldown > 290 ? 0.02 : 0}
                    />
                </Canvas>
            </div>

            {/* DOM UI Overlays */}
            <div className="absolute top-0 w-full p-4 pl-16 flex justify-between items-start z-20 bg-gradient-to-b from-black/80 to-transparent">
                <div className="backdrop-blur-sm bg-black/40 p-2 rounded border border-white/10">
                    <div className="flex items-center text-cyan-400 font-bold text-xs mb-1"><Shield size={14} className="mr-1" /> {t('defense.integrity')}</div>
                    <div className="w-48 h-3 bg-gray-900 rounded-full border border-gray-700 overflow-hidden shadow-inner">
                        <div className={`h-full transition-all shadow-[0_0_10px_currentColor] ${integrity < 30 ? 'bg-red-500 text-red-500 animate-pulse' : 'bg-cyan-500 text-cyan-500'}`} style={{ width: `${integrity}%` }}></div>
                    </div>
                </div>
                <div className="text-right backdrop-blur-sm bg-black/40 p-2 rounded border border-white/10">
                    <div className="text-xs text-yellow-400 font-bold mb-1 flex items-center justify-end"><Zap size={14} className="mr-1 shadow-[0_0_10px_yellow]" /> {t('defense.power')}</div>
                    <div className="text-2xl font-mono font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">{Math.floor(energy)}%</div>
                </div>
            </div>

            {/* Hitboxes for Threats (Invisible HTML overlay matching 3D coords) */}
            <div className="flex-1 relative pb-20 z-10">
                {threats.map(t => {
                    if (t.destroyed) return null;
                    const left = (t.x / 180) * 100;

                    return (
                        <button
                            key={t.id}
                            onPointerDown={() => handleTapThreat(t.id)}
                            className={`absolute w-12 h-12 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all z-10 ${t.scanned ? '' : 'animate-pulse'}`}
                            style={{ left: `${left}%`, bottom: `${t.y}%` }}
                        >
                            {t.scanned ? (
                                t.type === 'BIRD' ? <span className="text-[10px] font-bold text-green-400 drop-shadow-[0_0_5px_green] bg-black/50 px-1 rounded">{t('games.defensestrategist.bio')}</span> :
                                    t.type === 'ARMORED' ? <ShieldAlert className="text-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.8)]" size={32} /> :
                                        t.type === 'FAST' ? <Rocket className="text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" size={28} /> :
                                            <AlertOctagon className="text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" size={28} />
                            ) : (
                                <Crosshair size={32} className="text-white opacity-90 drop-shadow-[0_0_5px_white]" />
                            )}
                            {t.hp > 1 && <div className="absolute -top-3 -right-2 bg-red-600 text-white font-black text-[10px] px-1.5 py-0.5 rounded shadow-lg">{t.hp}</div>}
                        </button>
                    );
                })}
            </div>

            {/* CONTROLS */}
            <div className="h-36 bg-black/90 backdrop-blur-xl grid grid-cols-3 gap-2 p-3 z-30 border-t border-cyan-500/30 shadow-[0_-10px_40px_rgba(6,182,212,0.15)] relative">
                {[0, 1, 2].map(i => (
                    <button
                        key={i}
                        className={`relative rounded-xl flex flex-col items-center justify-center border-2 transition-all active:scale-95 overflow-hidden ${activeSector === i ? 'bg-cyan-900/60 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'bg-gray-900/80 border-gray-800 text-gray-500 opacity-80 hover:opacity-100'
                            }`}
                        onPointerDown={() => setActiveSector(i)}
                        onPointerUp={() => setActiveSector(null)}
                        onPointerLeave={() => setActiveSector(null)}
                    >
                        {activeSector === i && <div className="absolute inset-0 bg-cyan-400/20 animate-pulse"></div>}
                        <Shield className="mb-1" size={isMobile ? 20 : 28} />
                        <div className="text-xl md:text-2xl font-black tracking-widest">{t('games.defensestrategist.sec')} {String.fromCharCode(65 + i)}</div>
                        <div className="text-[10px] uppercase font-bold mt-1 opacity-80">{t('defense.shield')}</div>
                    </button>
                ))}
            </div>

            <div className="absolute bottom-40 right-6 z-40">
                <button
                    onClick={fireEMP}
                    disabled={empCooldown > 0 || energy < 50}
                    className={`w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.3)] transition-all ${empCooldown > 0 || energy < 50
                        ? 'bg-gray-900 border-gray-700 text-gray-600 opacity-60'
                        : 'bg-yellow-500 border-yellow-200 text-black animate-pulse active:scale-90 hover:scale-105 hover:bg-yellow-400'
                        }`}
                >
                    <Activity size={28} className="mb-0.5" />
                    <span className="text-[10px] font-black tracking-widest">{t('games.defensestrategist.emp')}</span>
                </button>
            </div>

            {gameOver && (
                <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center animate-in zoom-in backdrop-blur-md">
                    <Skull size={80} className="text-red-500 mb-6 drop-shadow-[0_0_20px_red] animate-pulse" />
                    <h2 className="text-4xl font-black text-white tracking-[0.2em] mb-8">{t('defense.failed')}</h2>
                    <Button variant="primary" onClick={() => onComplete(0)} className="px-8 py-4 text-lg bg-red-600 hover:bg-red-500 border-red-400 shadow-[0_0_20px_rgba(220,38,38,0.5)]">{t('defense.reboot')}</Button>
                </div>
            )}
        </div>
    );
};

const isMobile = window.innerWidth < 768;
