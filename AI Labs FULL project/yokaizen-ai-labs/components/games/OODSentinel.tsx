import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Radar, ShieldCheck, Ban, Zap, AlertTriangle, Crosshair, Hexagon } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Difficulty, Language } from '../../types';
import { Scanlines } from '../ui/Visuals';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, Environment } from '@react-three/drei';
import { CyberpunkEffects } from '../gl/CyberpunkEffects';
import * as THREE from 'three';

interface OODSentinelProps {
    onComplete: (score: number) => void;
    difficulty?: Difficulty;
    t: (key: string) => string;
    language?: Language;
}

interface Packet {
    id: number;
    z: number; // Depth (2000 to 0)
    x: number; // Horizontal offset (-1 to 1)
    rot: number; // Rotation
    type: 'SAFE' | 'ANOMALY';
    shape: 'CUBE' | 'PYRAMID' | 'ICOSAHEDRON';
    color: string;
    processed: boolean;
    action?: 'ACCEPT' | 'REJECT';
}

// Custom Grid Tunnel logic
const TunnelRings = ({ speed }: { speed: number }) => {
    const groupRef = useRef<THREE.Group>(null);
    useFrame((state, delta) => {
        if (groupRef.current) {
            groupRef.current.position.z += speed * delta * 0.1;
            if (groupRef.current.position.z > 20) groupRef.current.position.z -= 20;
        }
    });

    return (
        <group ref={groupRef}>
            {[...Array(20)].map((_, i) => (
                <mesh key={i} position={[0, 0, -i * 10]}>
                    <ringGeometry args={[10, 10.2, 32]} />
                    <meshBasicMaterial color="#06b6d4" transparent opacity={0.1 + (i / 40)} side={THREE.DoubleSide} />
                </mesh>
            ))}
        </group>
    );
};

const PacketMesh = ({ packet, isClosest }: { packet: Packet, isClosest: boolean }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const zPos = (packet.z / -20); // 2000 -> -100, 0 -> 0
    const xPos = packet.x * 4;

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        meshRef.current.rotation.x += delta * (packet.type === 'ANOMALY' ? 4 : 1);
        meshRef.current.rotation.y += delta * (packet.type === 'ANOMALY' ? 5 : 2);

        if (packet.processed) {
            const tgtX = packet.action === 'ACCEPT' ? -30 : 30;
            const tgtY = packet.action === 'REJECT' ? -10 : 10;
            meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, tgtX, delta * 10);
            meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, tgtY, delta * 10);
            meshRef.current.position.z -= delta * 100; // Shoot away
        } else {
            meshRef.current.position.z = zPos;
            meshRef.current.position.x = xPos;
        }
    });

    const isAnomaly = packet.type === 'ANOMALY';
    const color = isAnomaly ? '#ef4444' : '#3b82f6';

    return (
        <group>
            <mesh ref={meshRef} position={[xPos, 0, zPos]}>
                {packet.shape === 'CUBE' && <boxGeometry args={[1.5, 1.5, 1.5]} />}
                {packet.shape === 'PYRAMID' && <coneGeometry args={[1, 1.5, 4]} />}
                {packet.shape === 'ICOSAHEDRON' && <icosahedronGeometry args={[1]} />}
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={isClosest && !packet.processed ? 2 : 0.8}
                    wireframe
                />
            </mesh>
            {!packet.processed && zPos > -50 && (
                <Html position={[xPos, -2, zPos]} center sprite className="pointer-events-none">
                    <div className="bg-black/80 px-2 py-1 border border-white/10 rounded font-mono text-[10px] text-white">
                        {Math.floor(packet.z)}m
                    </div>
                </Html>
            )}
            {isClosest && !packet.processed && (
                <mesh position={[xPos, 0, zPos]} scale={[1.5, 1.5, 1.5]}>
                    <icosahedronGeometry args={[1.2, 1]} />
                    <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.3} blending={THREE.AdditiveBlending} />
                </mesh>
            )}
        </group>
    );
};

export const OODSentinel: React.FC<OODSentinelProps> = ({ onComplete, difficulty = 'Pro', t }) => {
    const [packets, setPackets] = useState<Packet[]>([]);
    const [score, setScore] = useState(0);
    const [health, setHealth] = useState(100);
    const [gameOver, setGameOver] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'GOOD' | 'BAD', text: string } | null>(null);
    const [cameraShake, setCameraShake] = useState(0);

    const resetGame = () => {
        setGameOver(false);
        setScore(0);
        setHealth(100);
        setPackets([]);
        setFeedback(null);
        setCameraShake(0);
        speedRef.current = difficulty === 'Rookie' ? 15 : difficulty === 'Elite' ? 35 : 25;
        lastSpawnRef.current = 0;
        audio.playScan();
    };

    const speedRef = useRef(difficulty === 'Rookie' ? 15 : difficulty === 'Elite' ? 35 : 25);
    const requestRef = useRef<number>(0);
    const lastSpawnRef = useRef(0);

    const spawnPacket = () => {
        const isAnomaly = Math.random() > 0.6;
        const shapes: Packet['shape'][] = ['CUBE', 'PYRAMID', 'ICOSAHEDRON'];

        const newPacket: Packet = {
            id: Date.now() + Math.random(),
            z: 2000,
            x: (Math.random() - 0.5) * 1.5,
            rot: Math.random() * 360,
            type: isAnomaly ? 'ANOMALY' : 'SAFE',
            shape: shapes[Math.floor(Math.random() * shapes.length)],
            color: isAnomaly ? '#ef4444' : '#3b82f6',
            processed: false
        };

        setPackets(prev => [...prev, newPacket]);
    };

    useEffect(() => {
        if (gameOver) return;

        let lastTime = performance.now();

        const loop = (time: number) => {
            const dt = (time - lastTime) / 16;
            lastTime = time;

            if (time - lastSpawnRef.current > (12000 / speedRef.current)) {
                spawnPacket();
                lastSpawnRef.current = time;
                speedRef.current += 0.05;
            }

            setPackets(prev => {
                const next = prev.map(p => {
                    if (p.processed) return p;
                    return { ...p, z: p.z - (speedRef.current * dt), rot: p.rot + (5 * dt) };
                });

                const missed = next.filter(p => p.z <= 0 && !p.processed);
                if (missed.length > 0) {
                    missed.forEach(m => {
                        if (m.type === 'ANOMALY') {
                            setHealth(h => Math.max(0, h - 20));
                            setFeedback({ type: 'BAD', text: t('ood.breached') });
                            setCameraShake(1);
                            audio.playError();
                        } else {
                            m.processed = true; // Auto process if safe and missed? Actually, rules say we must process them.
                            // The original game just didn't punish for missing safe packets, but let's encourage processing everything.
                        }
                        m.processed = true; // Mark missed as processed to drop off
                    });
                    if (health <= 0) setGameOver(true);
                }

                // Clean up completely processed and missed ones
                return next.filter(p => p.z > -2000);
            });

            if (cameraShake > 0) {
                setCameraShake(s => Math.max(0, s - 0.05));
            }

            requestRef.current = requestAnimationFrame(loop);
        };

        requestRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(requestRef.current);
    }, [gameOver, health, cameraShake]);

    const handleAction = (action: 'ACCEPT' | 'REJECT') => {
        const unprocessed = packets.filter(p => !p.processed);
        if (unprocessed.length === 0) return;

        const target = unprocessed.reduce((prev, curr) => prev.z < curr.z ? prev : curr);

        if (!target || target.z > 600) return;

        let success = false;
        if (action === 'ACCEPT' && target.type === 'SAFE') success = true;
        if (action === 'REJECT' && target.type === 'ANOMALY') success = true;

        setPackets(prev => prev.map(p => p.id === target.id ? { ...p, processed: true, action } : p));

        if (success) {
            setScore(s => s + 10);
            audio.playSuccess();
            setFeedback({ type: 'GOOD', text: action === 'ACCEPT' ? t('ood.verified') : t('ood.block') });
            if (score >= 300) {
                setGameOver(true);
                onComplete(100);
            }
        } else {
            setHealth(h => Math.max(0, h - 15));
            setCameraShake(0.8);
            audio.playError();
            setFeedback({ type: 'BAD', text: t('ood.error') });
            if (health <= 15) setGameOver(true);
        }

        setTimeout(() => setFeedback(null), 500);
    };

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' || e.key === 'a') handleAction('ACCEPT');
            if (e.key === 'ArrowRight' || e.key === 'd') handleAction('REJECT');
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [packets, health, score]);

    // Closest packet for highlight
    const unprocessed = packets.filter(p => !p.processed);
    const closestTarget = unprocessed.length > 0 ? unprocessed.reduce((prev, curr) => prev.z < curr.z ? prev : curr) : null;

    return (
        <div className="h-full bg-slate-950 flex flex-col relative overflow-hidden font-mono select-none"
            style={{ transform: `translate(${(Math.random() - 0.5) * cameraShake * 20}px, ${(Math.random() - 0.5) * cameraShake * 20}px)` }}
        >
            <Scanlines />

            {/* --- 3D VIEWPORT --- */}
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 2, 10], fov: 60 }}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[0, 10, 10]} intensity={2} color="#06b6d4" />

                    <TunnelRings speed={speedRef.current} />

                    {/* Shield Firewall Plane */}
                    <mesh position={[0, 0, 0]} rotation={[0, 0, 0]}>
                        <planeGeometry args={[40, 20]} />
                        <meshPhysicalMaterial
                            color={health < 30 ? '#ef4444' : '#22d3ee'}
                            transparent
                            opacity={0.15}
                            roughness={0.1}
                            transmission={0.9}
                            thickness={0.5}
                        />
                    </mesh>

                    {packets.map(p => (
                        <PacketMesh key={p.id} packet={p} isClosest={closestTarget?.id === p.id} />
                    ))}

                    <CyberpunkEffects
                        bloomIntensity={cameraShake > 0 ? 5 : 2}
                        glitchFactor={cameraShake > 0 ? 0.05 : health < 30 ? 0.02 : 0}
                        noiseOpacity={0.15 + cameraShake}
                    />
                </Canvas>
            </div>

            {/* --- HUD --- */}
            <div className="absolute top-4 left-4 z-20 flex flex-col space-y-4 pointer-events-none">
                <div className="bg-black/80 px-4 py-3 rounded-lg border border-cyan-500/50 backdrop-blur-md shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                    <div className="text-[10px] text-cyan-400 font-bold uppercase mb-1 tracking-widest">{t('ood.throughput')}</div>
                    <div className="text-3xl font-black text-white drop-shadow-[0_0_10px_white]">{score} <span className="text-sm text-cyan-500 ml-1">{t('games.oodsentinel.tb')}</span></div>
                </div>
                {/* 2D Mini Radar map projection could go here, but omitted for purer 3D experience! */}
            </div>

            <div className="absolute top-4 right-4 z-20 w-56 bg-black/80 p-4 rounded-lg border border-red-900/50 backdrop-blur-md shadow-[0_0_20px_rgba(220,38,38,0.2)] pointer-events-none">
                <div className="flex justify-between items-center text-xs text-red-500 font-bold uppercase mb-2 tracking-widest">
                    <span className="flex items-center"><ShieldCheck size={14} className="mr-2" /> {t('ood.firewall')}</span>
                    <span className="text-white drop-shadow-[0_0_5px_white]">{health}%</span>
                </div>
                <div className="w-full h-2.5 bg-black/80 rounded-full overflow-hidden border border-red-900/50 shadow-inner">
                    <div
                        className={`h-full transition-all duration-300 ${health < 30 ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-green-500'}`}
                        style={{ width: `${health}%` }}
                    ></div>
                </div>
                <div className="text-[10px] text-slate-500 mt-3 flex justify-between tracking-widest">
                    <span>{t('games.oodsentinel.intrusion_level')}</span>
                    <span className={health < 50 ? "text-red-500 animate-pulse font-bold" : "text-green-500"}>{health < 50 ? "CRITICAL" : "STABLE"}</span>
                </div>
            </div>

            {/* Floating Feedback Overlay */}
            {feedback && (
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center animate-in zoom-in slide-in-from-bottom-5 duration-200 ${feedback.type === 'BAD' ? 'text-red-500 drop-shadow-[0_0_20px_red]' : 'text-green-400 drop-shadow-[0_0_20px_lime]'} pointer-events-none`}>
                    {feedback.type === 'BAD' ? <AlertTriangle size={80} className="mb-4 animate-shake" /> : <ShieldCheck size={80} className="mb-4 animate-bounce" />}
                    <div className="text-5xl font-black tracking-[0.2em] uppercase text-center whitespace-nowrap">
                        {feedback.text}
                    </div>
                </div>
            )}

            {/* Reticle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 w-32 h-32 flex items-center justify-center opacity-50 mix-blend-screen">
                <div className="absolute inset-0 border-2 border-dashed border-cyan-500 rounded-full animate-spin-slow shadow-[0_0_15px_cyan]"></div>
                <Crosshair size={48} className="text-cyan-400 opacity-80" />
            </div>

            {/* --- CONTROLS --- */}
            <div className="absolute bottom-0 inset-x-0 h-32 bg-black/80 border-t border-slate-800 grid grid-cols-2 divide-x divide-slate-800 z-40 backdrop-blur-xl">
                <button
                    className="flex flex-col items-center justify-center active:bg-blue-900/60 transition-all hover:bg-blue-900/20 group relative overflow-hidden"
                    onPointerDown={() => handleAction('ACCEPT')}
                >
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-500"></div>
                    <ShieldCheck size={48} className="text-blue-500 mb-2 group-hover:scale-110 group-hover:drop-shadow-[0_0_20px_blue] transition-all" />
                    <span className="text-blue-400 font-black text-2xl tracking-widest uppercase">{t('ood.allow')}</span>
                    <span className="text-[10px] text-blue-300/50 font-bold mt-1 tracking-[0.2em] border border-blue-500/30 px-3 py-1 rounded-full uppercase">{t('games.oodsentinel.left') || 'A / LEFT'}</span>
                </button>
                <button
                    className="flex flex-col items-center justify-center active:bg-red-900/60 transition-all hover:bg-red-900/20 group relative overflow-hidden"
                    onPointerDown={() => handleAction('REJECT')}
                >
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-red-500"></div>
                    <Ban size={48} className="text-red-500 mb-2 group-hover:scale-110 group-hover:drop-shadow-[0_0_20px_red] transition-all" />
                    <span className="text-red-400 font-black text-2xl tracking-widest uppercase">{t('ood.block')}</span>
                    <span className="text-[10px] text-red-300/50 font-bold mt-1 tracking-[0.2em] border border-red-500/30 px-3 py-1 rounded-full uppercase">{t('games.oodsentinel.right') || 'D / RIGHT'}</span>
                </button>
            </div>

            {gameOver && (
                <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500 p-8 text-center backdrop-blur-3xl">
                    <Scanlines />
                    {score >= 300 ? (
                        <>
                            <div className="w-32 h-32 bg-green-900/20 rounded-full flex items-center justify-center mb-8 animate-pulse border-4 border-green-500 shadow-[0_0_100px_rgba(34,197,94,0.4)]">
                                <ShieldCheck size={64} className="text-green-400 drop-shadow-[0_0_15px_lime]" />
                            </div>
                            <h2 className="text-5xl md:text-7xl font-black text-green-400 mb-4 tracking-[0.3em] uppercase drop-shadow-[0_0_20px_lime]">{t('ood.secure')}</h2>
                            <div className="text-white text-lg md:text-xl font-mono mb-12 border-b border-green-500/30 pb-4 inline-block tracking-widest">{t('ood.stream_integrity')} <span className="text-green-400 font-bold">100%</span></div>
                            <Button onClick={() => onComplete(100)} variant="primary" size="lg" className="shadow-[0_0_30px_#22c55e] border-green-500 bg-green-600 px-16 py-6 text-xl tracking-widest">{t('ood.log_report')}</Button>
                        </>
                    ) : (
                        <>
                            <div className="w-32 h-32 bg-red-900/20 rounded-full flex items-center justify-center mb-8 animate-shake border-4 border-red-500 shadow-[0_0_100px_rgba(239,68,68,0.4)]">
                                <AlertTriangle size={64} className="text-red-500" />
                            </div>
                            <h2 className="text-5xl md:text-7xl font-black text-red-500 mb-4 tracking-[0.3em] uppercase drop-shadow-[0_0_20px_red]">{t('ood.breached')}</h2>
                            <div className="text-red-300 text-lg md:text-xl font-mono mb-12 border-b border-red-500/30 pb-4 inline-block tracking-widest">{t('ood.integrity_loss')}</div>
                            <Button onClick={resetGame} variant="ghost" size="lg" className="hover:bg-red-900/30 text-red-400 border border-red-500/50 px-16 py-6 text-xl tracking-widest bg-red-950/40">{t('ood.reboot')}</Button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
