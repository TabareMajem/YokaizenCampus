import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '../ui/Button';
import { ShieldCheck, Ban, AlertTriangle, Crosshair, Zap, Activity } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Difficulty, Language } from '../../types';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Float, Sparkles, Trail, Instance, Instances } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch, Vignette, Scanline, Noise } from '@react-three/postprocessing';
import { BlendFunction, GlitchMode } from 'postprocessing';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { useDialogue } from '../../contexts/DialogueContext';

interface OODSentinelProps {
    onComplete: (score: number) => void;
    difficulty?: Difficulty;
    t: (key: string) => string;
    language?: Language;
}

interface Packet {
    id: number;
    z: number;
    x: number;
    y: number;
    rot: number;
    type: 'SAFE' | 'ANOMALY';
    shape: 'CUBE' | 'PYRAMID' | 'ICOSAHEDRON';
    color: string;
    processed: boolean;
    action?: 'ACCEPT' | 'REJECT';
    destroyedTime?: number;
}

// Custom Grid Tunnel logic - AAA Datastream
const DatastreamTunnel = ({ speed }: { speed: number }) => {
    const gridRef = useRef<THREE.GridHelper>(null);
    const particlesRef = useRef<THREE.Points>(null);

    // Create traveling particles for sense of speed
    const particleCount = 2000;
    const [positions] = useState(() => {
        const pos = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 40;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 40;
            pos[i * 3 + 2] = Math.random() * -200;
        }
        return pos;
    });

    useFrame((state, delta) => {
        if (particlesRef.current) {
            const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
            for (let i = 0; i < particleCount; i++) {
                positions[i * 3 + 2] += speed * delta * 2;
                if (positions[i * 3 + 2] > 10) {
                    positions[i * 3 + 2] = -200;
                }
            }
            particlesRef.current.geometry.attributes.position.needsUpdate = true;
        }
    });

    return (
        <group>
            {/* Hexagonal wireframe tunnel effect */}
            {[...Array(30)].map((_, i) => (
                <mesh key={i} position={[0, 0, -i * 8]} rotation={[0, 0, i * 0.1]}>
                    <ringGeometry args={[12, 12.2, 6]} />
                    <meshBasicMaterial color="#06b6d4" transparent opacity={0.3 - (i / 30)} wireframe />
                </mesh>
            ))}

            <points ref={particlesRef}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" count={particleCount} array={positions} itemSize={3} />
                </bufferGeometry>
                <pointsMaterial size={0.1} color="#22d3ee" transparent opacity={0.6} sizeAttenuation />
            </points>
        </group>
    );
};

// Shockwave / Zap effect when action is taken
const LaserZap = ({ start, end, color, active }: { start: THREE.Vector3, end: THREE.Vector3, color: string, active: boolean }) => {
    const ref = useRef<THREE.Mesh>(null);
    const [points, setPoints] = useState<THREE.Vector3[]>([]);

    useEffect(() => {
        if (!active) return;
        const pts = [];
        pts.push(start);
        // Add random jagged points
        const distance = start.distanceTo(end);
        const segments = 5;
        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const p = new THREE.Vector3().lerpVectors(start, end, t);
            p.x += (Math.random() - 0.5) * 2;
            p.y += (Math.random() - 0.5) * 2;
            pts.push(p);
        }
        pts.push(end);
        setPoints(pts);
    }, [active, start, end]);

    if (!active || points.length === 0) return null;

    const curve = new THREE.CatmullRomCurve3(points);

    return (
        <mesh>
            <tubeGeometry args={[curve, 20, 0.1, 8, false]} />
            <meshBasicMaterial color={color} toneMapped={false} />
            <pointLight position={end} color={color} intensity={5} distance={10} />
        </mesh>
    );
};

const PacketMesh = ({ packet, isClosest }: { packet: Packet, isClosest: boolean }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const innerRef = useRef<THREE.Mesh>(null);
    const zPos = packet.z;
    const isAnomaly = packet.type === 'ANOMALY';
    const color = isAnomaly ? '#ef4444' : '#3b82f6';

    useFrame((state, delta) => {
        if (!meshRef.current || !innerRef.current) return;

        const rotSpeedX = isAnomaly ? 3 : 1;
        const rotSpeedY = isAnomaly ? 4 : 2;

        meshRef.current.rotation.x += delta * rotSpeedX;
        meshRef.current.rotation.y += delta * rotSpeedY;
        innerRef.current.rotation.x -= delta * rotSpeedX * 1.5;
        innerRef.current.rotation.y -= delta * rotSpeedY * 1.5;

        if (packet.processed) {
            // Blow up or shoot away
            const t = (Date.now() - (packet.destroyedTime || Date.now())) / 500;
            if (t < 1) {
                const scale = 1 + t * 5;
                meshRef.current.scale.setScalar(scale);
                (meshRef.current.material as THREE.MeshStandardMaterial).opacity = 1 - t;
                innerRef.current.scale.setScalar(scale * 0.5);
                (innerRef.current.material as THREE.MeshStandardMaterial).opacity = 1 - t;
            }
        } else {
            meshRef.current.position.set(packet.x, packet.y, zPos);
            // Dynamic pulse if closest
            if (isClosest) {
                const pulse = 1 + Math.sin(state.clock.elapsedTime * 15) * 0.1;
                meshRef.current.scale.setScalar(pulse);
            } else {
                meshRef.current.scale.setScalar(1);
            }
        }
    });

    if (packet.processed && Date.now() - (packet.destroyedTime || 0) > 500) return null;

    return (
        <group>
            {/* Inner Core */}
            <mesh ref={innerRef}>
                <icosahedronGeometry args={[0.5]} />
                <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={5} transparent />
            </mesh>

            {/* Outer Shell */}
            <mesh ref={meshRef}>
                {packet.shape === 'CUBE' && <boxGeometry args={[1.5, 1.5, 1.5]} />}
                {packet.shape === 'PYRAMID' && <coneGeometry args={[1, 1.5, 4]} />}
                {packet.shape === 'ICOSAHEDRON' && <icosahedronGeometry args={[1.2]} />}
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={isClosest && !packet.processed ? 2 : 0.8}
                    wireframe
                    transparent
                />
            </mesh>

            {/* Targeting Reticle if closest */}
            {isClosest && !packet.processed && (
                <mesh position={[packet.x, packet.y, zPos]} scale={[2, 2, 2]}>
                    <ringGeometry args={[0.8, 0.9, 32]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.5} side={THREE.DoubleSide} />
                </mesh>
            )}

            {!packet.processed && zPos > -50 && (
                <Html position={[packet.x, packet.y - 2, zPos]} center sprite className="pointer-events-none">
                    <div className="bg-black/90 px-2 py-1 border border-white/20 rounded font-mono text-[9px] text-white backdrop-blur-md flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${isAnomaly ? 'bg-red-500 animate-ping' : 'bg-blue-500'}`}></div>
                        DIST: {Math.floor(Math.abs(packet.z))}M
                    </div>
                </Html>
            )}
        </group>
    );
};

export const OODSentinel: React.FC<OODSentinelProps> = ({ onComplete, difficulty = 'Pro', t }) => {
    const { queueDialogue } = useDialogue();
    const [packets, setPackets] = useState<Packet[]>([]);
    const [score, setScore] = useState(0);
    const [health, setHealth] = useState(100);
    const [gameOver, setGameOver] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'GOOD' | 'BAD', text: string } | null>(null);
    const [cameraShake, setCameraShake] = useState(0);
    const [glitchIntensity, setGlitchIntensity] = useState(0);
    const [laserZap, setLaserZap] = useState<{ start: THREE.Vector3, end: THREE.Vector3, color: string, active: boolean }>({
        start: new THREE.Vector3(0, -5, 0),
        end: new THREE.Vector3(0, 0, -10),
        color: '#ffffff',
        active: false
    });

    useEffect(() => {
        queueDialogue([
            { id: `ood-1`, character: 'ATHENA', text: t('ood.firewall_online') || 'Sentinel Firewall initialized.' },
            { id: `ood-2`, character: 'BYTE', text: t('ood.intercept_anomalies') || 'Dodge the red, grab the blue. Easy, right?', isGlitchy: true },
        ]);
    }, [queueDialogue, t]);

    const resetGame = () => {
        setGameOver(false);
        setScore(0);
        setHealth(100);
        setPackets([]);
        setFeedback(null);
        setCameraShake(0);
        setGlitchIntensity(0);
        speedRef.current = difficulty === 'Rookie' ? 25 : difficulty === 'Elite' ? 55 : 40;
        lastSpawnRef.current = 0;
        audio.playScan();
    };

    const speedRef = useRef(difficulty === 'Rookie' ? 25 : difficulty === 'Elite' ? 55 : 40);
    const requestRef = useRef<number>(0);
    const lastSpawnRef = useRef(0);

    const spawnPacket = () => {
        const isAnomaly = Math.random() > 0.55; // 55% chance of anomaly
        const shapes: Packet['shape'][] = ['CUBE', 'PYRAMID', 'ICOSAHEDRON'];

        // Spawn slightly further away and spread out
        const depth = -150 - Math.random() * 50;
        const spreadX = (Math.random() - 0.5) * 12;
        const spreadY = (Math.random() - 0.5) * 8;

        const newPacket: Packet = {
            id: Date.now() + Math.random(),
            z: depth,
            x: spreadX,
            y: spreadY,
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
            const dt = (time - lastTime) / 1000; // in seconds
            lastTime = time;

            // Spawn logic
            if (time - lastSpawnRef.current > (10000 / speedRef.current)) {
                spawnPacket();
                lastSpawnRef.current = time;
                speedRef.current += 0.1; // Speed increases over time
            }

            setPackets(prev => {
                const next = prev.map(p => {
                    if (p.processed) return p;
                    // Move packet toward Z=0
                    return { ...p, z: p.z + (speedRef.current * dt), rot: p.rot + (5 * dt) };
                });

                // Check missed packets (passed Z=5)
                const missed = next.filter(p => p.z >= 5 && !p.processed);
                if (missed.length > 0) {
                    missed.forEach(m => {
                        if (m.type === 'ANOMALY') {
                            setHealth(h => Math.max(0, h - 20));
                            setFeedback({ type: 'BAD', text: t('ood.breached') });
                            setCameraShake(2);
                            setGlitchIntensity(0.5);
                            audio.playError();
                        }
                        m.processed = true;
                        m.destroyedTime = Date.now();
                    });
                    setHealth(h => {
                        if (h <= 0) setGameOver(true);
                        return h;
                    });
                }

                // Cleanup far behind camera
                return next.filter(p => p.z < 20);
            });

            // Dampen effects
            if (cameraShake > 0) setCameraShake(s => Math.max(0, s - dt * 5));
            if (glitchIntensity > 0) setGlitchIntensity(s => Math.max(0, s - dt * 2));

            requestRef.current = requestAnimationFrame(loop);
        };

        requestRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(requestRef.current);
    }, [gameOver, t]);

    const handleAction = (action: 'ACCEPT' | 'REJECT') => {
        const unprocessed = packets.filter(p => !p.processed);
        if (unprocessed.length === 0) return;

        // Find the packet closest to Z=0
        const target = unprocessed.reduce((prev, curr) => prev.z > curr.z ? prev : curr);

        // If it's too far away, ignore the action
        if (!target || target.z < -60) return;

        let success = false;
        if (action === 'ACCEPT' && target.type === 'SAFE') success = true;
        if (action === 'REJECT' && target.type === 'ANOMALY') success = true;

        // Visual Zap
        setLaserZap({
            start: new THREE.Vector3(action === 'ACCEPT' ? -10 : 10, -5, 5),
            end: new THREE.Vector3(target.x, target.y, target.z),
            color: action === 'ACCEPT' ? '#3b82f6' : '#ef4444',
            active: true
        });
        setTimeout(() => setLaserZap(p => ({ ...p, active: false })), 150);

        setPackets(prev => prev.map(p => p.id === target.id ? { ...p, processed: true, action, destroyedTime: Date.now() } : p));

        if (success) {
            setScore(s => s + 10);
            audio.playSuccess();
            setFeedback({ type: 'GOOD', text: action === 'ACCEPT' ? t('ood.verified') : t('ood.block') });

            // Minor camera bump for juice
            setCameraShake(0.5);

            if (score >= 300) {
                setGameOver(true);
                onComplete(100);
            }
        } else {
            setHealth(h => {
                const newH = Math.max(0, h - 25);
                if (newH <= 0) setGameOver(true);
                return newH;
            });
            setCameraShake(3);
            setGlitchIntensity(1);
            audio.playError();
            setFeedback({ type: 'BAD', text: t('ood.error') });
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
    }, [packets, score]);

    // Format numbers
    const formattedScore = score.toString().padStart(4, '0');

    // Find closest valid target for reticle
    const unprocessed = packets.filter(p => !p.processed);
    const closestTarget = unprocessed.length > 0 ? unprocessed.reduce((prev, curr) => prev.z > curr.z ? prev : curr) : null;

    return (
        <div className="h-full bg-slate-950 flex flex-col relative overflow-hidden font-mono select-none"
            style={{ transform: `translate(${(Math.random() - 0.5) * cameraShake * 10}px, ${(Math.random() - 0.5) * cameraShake * 10}px)` }}
        >
            {/* Scanlines Overlay for AAA Vibe */}
            <div className="absolute inset-0 bg-[url('/assets/aaa/scanlines.png')] opacity-30 pointer-events-none z-20 mix-blend-overlay"></div>

            {/* --- 3D VIEWPORT --- */}
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 0, 15], fov: 60 }} gl={{ antialias: false, powerPreference: "high-performance" }}>
                    <color attach="background" args={['#020008']} />
                    <fog attach="fog" args={['#020008', 5, 100]} />
                    <ambientLight intensity={0.5} />
                    <pointLight position={[0, 10, 10]} intensity={2} color="#06b6d4" />

                    <DatastreamTunnel speed={speedRef.current} />

                    {/* Threat Gateway Portal */}
                    <mesh position={[0, 0, -100]}>
                        <circleGeometry args={[20, 32]} />
                        <meshBasicMaterial color="#ef4444" transparent opacity={0.1} />
                    </mesh>

                    {/* Defense Shield Plane */}
                    <mesh position={[0, 0, 5]} rotation={[0, 0, 0]}>
                        <planeGeometry args={[60, 40]} />
                        <meshPhysicalMaterial
                            color={health < 30 ? '#ef4444' : '#22d3ee'}
                            transparent
                            opacity={0.05 + (100 - health) * 0.002}
                            roughness={0.1}
                            transmission={0.9}
                            thickness={0.5}
                            wireframe
                        />
                    </mesh>

                    {packets.map(p => (
                        <PacketMesh key={p.id} packet={p} isClosest={closestTarget?.id === p.id} />
                    ))}

                    <LaserZap start={laserZap.start} end={laserZap.end} color={laserZap.color} active={laserZap.active} />

                    <EffectComposer multisampling={0}>
                        <Bloom luminanceThreshold={0.2} mipmapBlur intensity={2 + cameraShake} radius={0.8} />
                        <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.005 + cameraShake * 0.01 + glitchIntensity * 0.05, 0.005)} />
                        {glitchIntensity > 0 && (
                            <Glitch delay={new THREE.Vector2(0, 0)} duration={new THREE.Vector2(0.1, 0.3)} mode={GlitchMode.SPORADIC} active ratio={glitchIntensity} />
                        )}
                        <Vignette eskil={false} offset={0.1} darkness={1.5} />
                    </EffectComposer>
                </Canvas>
            </div>

            {/* --- AAA HUD OVERLAYS --- */}

            {/* Top Bar - Score & Threat Level */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-30 pointer-events-none">
                {/* Score Panel */}
                <div className="bg-black/80 backdrop-blur-xl rounded-xl p-4 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                    <div className="flex items-center gap-2 text-cyan-400 mb-1">
                        <Activity className="w-4 h-4 animate-pulse" />
                        <span className="text-xs uppercase tracking-[0.3em] font-black">{t('ood.throughput')}</span>
                    </div>
                    <div className="text-4xl font-black text-white drop-shadow-lg tracking-tighter">
                        {formattedScore} <span className="text-lg text-cyan-500 font-bold ml-1 tracking-widest uppercase">TB/s</span>
                    </div>
                </div>

                {/* System Integrity / Health */}
                <div className="bg-black/80 backdrop-blur-xl rounded-xl p-4 border border-red-500/40 w-64 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                    <div className="flex justify-between items-end mb-2">
                        <div className="flex items-center gap-2 text-red-500">
                            <ShieldCheck size={16} />
                            <span className="text-xs uppercase tracking-[0.3em] font-black">{t('ood.firewall')}</span>
                        </div>
                        <span className={`text-sm font-black font-mono ${health < 30 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>{Math.round(health)}%</span>
                    </div>

                    <div className="w-full h-3 bg-black rounded-full overflow-hidden border border-white/10 relative p-0.5">
                        <div className="absolute inset-0 bg-[url('/assets/aaa/scanlines.png')] opacity-30 z-10"></div>
                        <div
                            className="h-full rounded-full transition-all duration-300 relative z-0"
                            style={{
                                width: `${Math.max(0, health)}%`,
                                background: health > 50 ? 'linear-gradient(90deg, #059669, #10b981)' : health > 25 ? 'linear-gradient(90deg, #d97706, #f59e0b)' : 'linear-gradient(90deg, #b91c1c, #ef4444)',
                                boxShadow: `0 0 15px ${health > 50 ? '#10b981' : health > 25 ? '#f59e0b' : '#ef4444'}`,
                            }}
                        />
                    </div>

                    <div className="mt-3 flex justify-between items-center text-[9px] uppercase tracking-widest font-bold">
                        <span className="text-gray-500">Status</span>
                        <span className={health < 30 ? "text-red-500 animate-pulse drop-shadow-[0_0_5px_red]" : "text-emerald-500"}>
                            {health < 30 ? "CRITICAL FAILURE IMMINENT" : "SYSTEM STABLE"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Central Targeting Reticle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 w-48 h-48 flex items-center justify-center opacity-40 mix-blend-screen">
                <div className="absolute inset-0 border border-cyan-500/50 rounded-full"></div>
                <div className="absolute inset-4 border-2 border-dashed border-cyan-400 rounded-full animate-spin-slow"></div>
                <Crosshair size={64} className="text-cyan-300 opacity-60" />

                {/* Target Lock UI */}
                {closestTarget && closestTarget.z > -80 && (
                    <motion.div
                        initial={{ scale: 1.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute -top-10 bg-cyan-900/40 border border-cyan-500/50 px-3 py-1 rounded backdrop-blur-md"
                    >
                        <span className="text-[10px] text-cyan-300 font-bold tracking-widest uppercase flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                            TARGET LOCK: {Math.floor(Math.abs(closestTarget.z))}M
                        </span>
                    </motion.div>
                )}
            </div>

            {/* Floating Action Feedback */}
            <AnimatePresence>
                {feedback && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: -20, x: '-50%' }}
                        animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
                        exit={{ opacity: 0, scale: 1.5 }}
                        className={`absolute top-1/3 left-1/2 z-30 flex flex-col items-center pointer-events-none ${feedback.type === 'BAD' ? 'text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]' : 'text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.8)]'}`}
                    >
                        <div className="text-6xl font-black tracking-[0.2em] uppercase italic bg-black/50 px-8 py-4 rounded-xl backdrop-blur-sm border border-current">
                            {feedback.text}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- ACTION CONTROLS --- */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 z-40">
                <button
                    className="w-48 bg-blue-900/60 hover:bg-blue-600/60 active:bg-blue-500/80 border-2 border-blue-500 rounded-2xl p-4 flex flex-col items-center justify-center transition-all group backdrop-blur-xl shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] transform hover:-translate-y-2 relative overflow-hidden"
                    onPointerDown={() => handleAction('ACCEPT')}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-500/20 to-transparent"></div>
                    <ShieldCheck size={40} className="text-blue-400 group-hover:text-blue-200 transition-colors mb-2 drop-shadow-[0_0_10px_blue] group-hover:scale-110" />
                    <span className="text-white font-black text-2xl tracking-[0.2em] uppercase italic drop-shadow-md">{t('ood.allow')}</span>
                    <div className="mt-2 bg-black/50 border border-blue-500/30 px-3 py-1 rounded-full flex items-center gap-2">
                        <span className="text-[10px] text-blue-300 font-bold uppercase tracking-widest">{t('games.oodsentinel.left') || 'LEFT ARROW'}</span>
                    </div>
                </button>

                <button
                    className="w-48 bg-red-900/60 hover:bg-red-600/60 active:bg-red-500/80 border-2 border-red-500 rounded-2xl p-4 flex flex-col items-center justify-center transition-all group backdrop-blur-xl shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:shadow-[0_0_40px_rgba(239,68,68,0.5)] transform hover:-translate-y-2 relative overflow-hidden"
                    onPointerDown={() => handleAction('REJECT')}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-red-500/20 to-transparent"></div>
                    <Ban size={40} className="text-red-400 group-hover:text-red-200 transition-colors mb-2 drop-shadow-[0_0_10px_red] group-hover:scale-110" />
                    <span className="text-white font-black text-2xl tracking-[0.2em] uppercase italic drop-shadow-md">{t('ood.block')}</span>
                    <div className="mt-2 bg-black/50 border border-red-500/30 px-3 py-1 rounded-full flex items-center gap-2">
                        <span className="text-[10px] text-red-300 font-bold uppercase tracking-widest">{t('games.oodsentinel.right') || 'RIGHT ARROW'}</span>
                    </div>
                </button>
            </div>

            {/* Game Over Screen */}
            <AnimatePresence>
                {gameOver && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-3xl"
                    >
                        <div className="absolute inset-0 bg-[url('/assets/aaa/grid-pattern.svg')] opacity-10 bg-repeat bg-[center_top] pointer-events-none"></div>

                        <div className={`relative p-12 w-full max-w-2xl rounded-[3rem] border bg-gradient-to-b shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden ${score >= 300
                                ? 'border-emerald-500/30 from-emerald-950/40 to-black'
                                : 'border-red-500/30 from-red-950/40 to-black'
                            }`}>

                            {/* Ambient Glows */}
                            <div className={`absolute -top-32 -left-32 w-80 h-80 rounded-full blur-[100px] opacity-30 ${score >= 300 ? 'bg-emerald-500' : 'bg-red-600'}`}></div>
                            <div className={`absolute -bottom-32 -right-32 w-80 h-80 rounded-full blur-[100px] opacity-30 ${score >= 300 ? 'bg-cyan-500' : 'bg-orange-600'}`}></div>

                            {score >= 300 ? (
                                <>
                                    <div className="relative w-32 h-32 mx-auto mb-8 bg-emerald-900/30 rounded-full flex items-center justify-center border-4 border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.5)]">
                                        <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-20"></div>
                                        <ShieldCheck size={64} className="text-emerald-400 drop-shadow-[0_0_15px_#10b981] relative z-10" />
                                    </div>
                                    <h2 className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-emerald-300 to-emerald-600 mb-4 tracking-[0.2em] uppercase drop-shadow-md">
                                        {t('ood.secure')}
                                    </h2>
                                    <div className="text-emerald-100/70 text-lg md:text-xl font-mono mb-10 tracking-widest uppercase">
                                        {t('ood.stream_integrity')} <span className="text-emerald-400 font-black ml-2 shadow-emerald-500 drop-shadow-lg">100%</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-10 text-left">
                                        <div className="bg-black/60 border border-emerald-500/20 p-4 rounded-2xl">
                                            <div className="text-[10px] text-emerald-500/70 font-bold tracking-widest uppercase mb-1">{t('ood.throughput')}</div>
                                            <div className="text-3xl font-black text-white font-mono">{score.toLocaleString()} <span className="text-sm text-emerald-500">TB/s</span></div>
                                        </div>
                                        <div className="bg-black/60 border border-emerald-500/20 p-4 rounded-2xl">
                                            <div className="text-[10px] text-emerald-500/70 font-bold tracking-widest uppercase mb-1">Status</div>
                                            <div className="text-xl font-black text-emerald-400 font-mono mt-2">OPTIMAL</div>
                                        </div>
                                    </div>

                                    <Button onClick={() => onComplete(100)} variant="primary" size="lg" className="w-full text-xl py-6 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.4)] border border-emerald-400 bg-emerald-600 hover:bg-emerald-500 uppercase tracking-widest font-black transition-all hover:scale-105">
                                        {t('ood.log_report')}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <div className="relative w-32 h-32 mx-auto mb-8 bg-red-900/30 rounded-full flex items-center justify-center border-4 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)]">
                                        <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20"></div>
                                        <AlertTriangle size={64} className="text-red-500 drop-shadow-[0_0_15px_#ef4444] relative z-10" />
                                    </div>
                                    <h2 className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-red-400 to-red-600 mb-4 tracking-[0.2em] uppercase drop-shadow-md">
                                        {t('ood.breached')}
                                    </h2>
                                    <div className="text-red-200/70 text-lg md:text-xl font-mono mb-12 tracking-widest uppercase">
                                        {t('ood.integrity_loss')}
                                    </div>

                                    <div className="bg-black/60 border border-red-500/20 p-4 rounded-2xl mb-10 text-center">
                                        <div className="text-[10px] text-red-500/70 font-bold tracking-widest uppercase mb-1">Final Throughput Before Crash</div>
                                        <div className="text-4xl font-black text-white font-mono">{score.toLocaleString()} <span className="text-sm text-red-500">TB/s</span></div>
                                    </div>

                                    <Button onClick={resetGame} variant="ghost" size="lg" className="w-full text-xl py-6 rounded-2xl shadow-[0_0_30px_rgba(239,68,68,0.2)] border border-red-500/50 bg-red-950/40 hover:bg-red-900/60 text-red-400 uppercase tracking-widest font-black transition-all hover:scale-105">
                                        {t('ood.reboot')}
                                    </Button>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
