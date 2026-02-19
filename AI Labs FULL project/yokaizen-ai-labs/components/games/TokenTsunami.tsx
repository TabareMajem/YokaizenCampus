
import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, Html, OrbitControls, Stars, Instance, Instances, Environment, PerspectiveCamera, Float } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Noise as DataNoise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Button } from '../ui/Button';
import { audio } from '../../services/audioService';
import { Zap, Music, Timer, Trophy, Play } from 'lucide-react';
import { Language } from '../../types';

// --- TYPES ---
interface TokenTsunamiProps {
    onComplete: (score: number) => void;
    t: (key: string) => string;
}

type NoteType = 'SIGNAL' | 'NOISE' | 'GOLD';

interface Note {
    id: number;
    lane: number; // 0-3
    z: number;    // Starts at -100, hits at 0
    type: NoteType;
    hit: boolean;
    missed: boolean;
}

// --- CONSTANTS ---
const LANES = 4;
const LANE_WIDTH = 2.5;
const SPAWN_Z = -80;
const HIT_Z = 0;
const DESPAWN_Z = 10;
const HIT_WINDOW = 3;
const GAME_DURATION = 90;
const LANE_KEYS = ['D', 'F', 'J', 'K'];
const LANE_COLORS = ['#06b6d4', '#a855f7', '#f59e0b', '#22c55e'];

// --- 3D COMPONENTS ---

const CyberGrid = ({ speed, combo }: { speed: number, combo: number }) => {
    const mesh = useRef<THREE.Mesh>(null);
    const { clock } = useThree();

    // Data texture for "flow"
    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uSpeed: { value: speed },
        uColor: { value: new THREE.Color('#06b6d4') },
        uCombo: { value: 0 }
    }), []);

    useFrame((state) => {
        if (mesh.current) {
            uniforms.uTime.value = state.clock.getElapsedTime();
            uniforms.uSpeed.value = THREE.MathUtils.lerp(uniforms.uSpeed.value, speed, 0.1);
            uniforms.uCombo.value = THREE.MathUtils.lerp(uniforms.uCombo.value, combo, 0.1);
        }
    });

    const shaderMaterial = useMemo(() => new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `
            uniform float uTime;
            uniform float uSpeed;
            varying vec2 vUv;
            varying float vElevation;

            void main() {
                vUv = uv;
                
                vec3 pos = position;
                
                // Infinite scroll effect
                float zOffset = uTime * uSpeed * 2.0;
                
                // Cyber wave deformation
                float elevation = sin(pos.x * 0.5 + uTime) * sin(pos.z * 0.2 + uTime) * 1.5;
                elevation += sin(pos.x * 2.0 - zOffset) * 0.5;
                
                pos.y += elevation;
                pos.z = mod(pos.z + zOffset, 100.0) - 80.0;
                
                vElevation = elevation;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 uColor;
            uniform float uCombo;
            varying vec2 vUv;
            varying float vElevation;

            void main() {
                // Grid pattern
                float gridX = step(0.98, fract(vUv.x * 20.0));
                float gridZ = step(0.98, fract(vUv.y * 20.0)); // UV is mapped to plane
                
                float grid = max(gridX, gridZ);
                
                // Pulse intensity based on combo
                float pulse = 0.5 + sin(vElevation * 5.0) * 0.5;
                float brightness = 0.2 + (uCombo * 0.01);
                
                // Distance fade
                float alpha = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
                
                vec3 finalColor = uColor * (grid + pulse * 0.2) * (1.0 + brightness);
                
                gl_FragColor = vec4(finalColor, alpha * (grid > 0.5 ? 0.8 : 0.05));
            }
        `,
        transparent: true,
        side: THREE.DoubleSide
    }), [uniforms]);

    return (
        <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, -20]}>
            <planeGeometry args={[40, 100, 40, 40]} />
            <primitive object={shaderMaterial} attach="material" />
        </mesh>
    );
};

const LaneStandard = ({ activeLane }: { activeLane: number | null }) => {
    return (
        <group position={[0, -0.9, 0]}>
            {[-1.5, -0.5, 0.5, 1.5].map((x, i) => (
                <group key={i} position={[x * LANE_WIDTH, 0, 0]}>
                    {/* Hit Zone Ring */}
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, HIT_Z]}>
                        <ringGeometry args={[0.8, 1, 32]} />
                        <meshBasicMaterial color={activeLane === i ? '#ffffff' : LANE_COLORS[i]} transparent opacity={activeLane === i ? 1 : 0.3} />
                    </mesh>

                    {/* Active Hit Flash */}
                    {activeLane === i && (
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, HIT_Z]}>
                            <circleGeometry args={[0.8, 32]} />
                            <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
                        </mesh>
                    )}

                    {/* Laser Track Line */}
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, -40]}>
                        <planeGeometry args={[0.05, 100]} />
                        <meshBasicMaterial color={LANE_COLORS[i]} opacity={0.4} />
                    </mesh>
                </group>
            ))}
        </group>
    );
};

// Instanced Notes for Performance
const NoteInstances = ({ notes }: { notes: Note[] }) => {
    const signalData = useMemo(() => notes.filter(n => n.type === 'SIGNAL' && !n.hit), [notes]);
    const noiseData = useMemo(() => notes.filter(n => n.type === 'NOISE' && !n.hit), [notes]);
    const goldData = useMemo(() => notes.filter(n => n.type === 'GOLD' && !n.hit), [notes]);

    return (
        <group>
            <Instances range={signalData.length}>
                <boxGeometry args={[1.5, 0.2, 1.5]} />
                <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={3} toneMapped={false} />
                {signalData.map((note, i) => (
                    <Instance
                        key={note.id}
                        position={[(note.lane - 1.5) * LANE_WIDTH, 0, note.z]}
                        rotation={[0, 0, 0]}
                    />
                ))}
            </Instances>

            <Instances range={noiseData.length}>
                <dodecahedronGeometry args={[0.8, 0]} />
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={4} toneMapped={false} wireframe />
                {noiseData.map((note, i) => (
                    <Instance
                        key={note.id}
                        position={[(note.lane - 1.5) * LANE_WIDTH, 0.5, note.z]}
                        rotation={[Date.now() * 0.002, Date.now() * 0.001, 0]}
                    />
                ))}
            </Instances>

            <Instances range={goldData.length}>
                <octahedronGeometry args={[1, 0]} />
                <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={8} toneMapped={false} />
                {goldData.map((note, i) => (
                    <Instance
                        key={note.id}
                        position={[(note.lane - 1.5) * LANE_WIDTH, 1, note.z]}
                        rotation={[0, Date.now() * 0.005, 0]}
                        scale={1.2}
                    />
                ))}
            </Instances>
        </group>
    );
};

// High Performance Particle System
const ParticleSystem = ({ explosions }: { explosions: { id: number, pos: [number, number, number], color: string }[] }) => {
    // We pool particles. Each explosion uses ~20 particles.
    const MAX_PARTICLES = 500;
    const meshRef = useRef<THREE.InstancedMesh>(null);

    // State to track active particles
    const particlesRef = useRef<{
        active: boolean;
        pos: THREE.Vector3;
        vel: THREE.Vector3;
        life: number;
        color: THREE.Color;
        scale: number;
    }[]>([]);

    // Initialize pool
    useMemo(() => {
        particlesRef.current = new Array(MAX_PARTICLES).fill(0).map(() => ({
            active: false,
            pos: new THREE.Vector3(),
            vel: new THREE.Vector3(),
            life: 0,
            color: new THREE.Color(),
            scale: 0
        }));
    }, []);

    // Sanitize color string for THREE.Color
    const getColor = (c: string) => {
        if (c === 'gold') return '#f59e0b';
        if (c === 'red') return '#ef4444';
        return '#06b6d4';
    };

    // Watch for new explosions
    useEffect(() => {
        explosions.forEach(exp => {
            // Find ~20 inactive particles
            let spawned = 0;
            for (let i = 0; i < MAX_PARTICLES && spawned < 20; i++) {
                if (!particlesRef.current[i].active) {
                    const p = particlesRef.current[i];
                    p.active = true;
                    p.life = 1.0;
                    p.pos.set(exp.pos[0], exp.pos[1], exp.pos[2]);
                    // Random spherical velocity
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos((Math.random() * 2) - 1);
                    const speed = 5 + Math.random() * 10;
                    p.vel.set(
                        speed * Math.sin(phi) * Math.cos(theta),
                        speed * Math.sin(phi) * Math.sin(theta) + 5, // Upward bias
                        speed * Math.cos(phi)
                    );
                    p.color.set(getColor(exp.color));
                    p.scale = Math.random() * 0.3 + 0.1;
                    spawned++;
                }
            }
        });
    }, [explosions]);

    // Update Frame
    useFrame((_, delta) => {
        if (!meshRef.current) return;

        const dummy = new THREE.Object3D();
        let activeCount = 0;

        particlesRef.current.forEach((p, i) => {
            if (p.active) {
                p.life -= delta * 2; // Fade out speed
                if (p.life <= 0) {
                    p.active = false;
                    p.scale = 0;
                } else {
                    // Physics
                    p.vel.y -= 20 * delta; // Gravity
                    p.pos.add(p.vel.clone().multiplyScalar(delta));

                    dummy.position.copy(p.pos);
                    dummy.scale.setScalar(p.scale * p.life);
                    dummy.updateMatrix();
                    meshRef.current!.setMatrixAt(i, dummy.matrix);
                    meshRef.current!.setColorAt(i, p.color);
                    activeCount++;
                }
            } else {
                // Hide inactive
                dummy.scale.setScalar(0);
                dummy.updateMatrix();
                meshRef.current!.setMatrixAt(i, dummy.matrix);
            }
        });

        if (activeCount > 0) {
            meshRef.current.instanceMatrix.needsUpdate = true;
            if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
        }
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PARTICLES]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial toneMapped={false} transparent />
        </instancedMesh>
    );
};

const FloatingDebris = () => {
    // Background ambience particles
    const count = 100;
    return (
        <Instances range={count}>
            <tetrahedronGeometry args={[0.5, 0]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.2} />
            {Array.from({ length: count }).map((_, i) => (
                <FloatingElement key={i} />
            ))}
        </Instances>
    );
};

const FloatingElement = () => {
    const ref = useRef<THREE.Group>(null);
    const [pos] = useState(() => [
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 50 + 20,
        (Math.random() - 0.5) * 100 - 50
    ]);
    const [rot] = useState(() => [Math.random() * Math.PI, Math.random() * Math.PI, 0]);

    useFrame((state) => {
        if (ref.current) {
            ref.current.rotation.x += 0.01;
            ref.current.rotation.y += 0.01;
            ref.current.position.y += Math.sin(state.clock.elapsedTime + pos[0]) * 0.02;
        }
    });

    return (
        <group ref={ref} position={pos as [number, number, number]} rotation={rot as [number, number, number]}>
            <Instance />
        </group>
    );
};

// --- GAME LOGIC COMPONENT ---
const GameScene = ({
    activeLane,
    notes,
    explosions,
    combo
}: {
    activeLane: number | null,
    notes: Note[],
    explosions: { id: number, pos: [number, number, number], color: string }[],
    combo: number
}) => {
    const { camera } = useThree();

    // Dynamic Camera Shake on high combo / effects
    useFrame((state) => {
        // More subtle shake
        const shake = Math.min(combo, 20) * 0.005;
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, (state.pointer.x * 2) + (Math.random() - 0.5) * shake, 0.1);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, 6 + (Math.random() - 0.5) * shake, 0.1);
        camera.lookAt(0, 0, -30);
    });

    return (
        <>
            <color attach="background" args={['#020617']} />
            <fog attach="fog" args={['#020617', 20, 100]} />

            <ambientLight intensity={0.2} />
            <pointLight position={[0, 10, -10]} intensity={2} color="#06b6d4" />
            <pointLight position={[0, 10, 10]} intensity={1} color="#a855f7" />

            <Stars radius={150} depth={50} count={3000} factor={4} saturation={1} fade speed={0.5} />
            <FloatingDebris />

            <CyberGrid speed={2 + Math.min(combo * 0.05, 10)} combo={combo} />
            <LaneStandard activeLane={activeLane} />
            <NoteInstances notes={notes} />

            <ParticleSystem explosions={explosions} />

            <EffectComposer disableNormalPass>
                <Bloom luminanceThreshold={1} mipmapBlur intensity={2.0} radius={0.6} />
                <ChromaticAberration offset={[new THREE.Vector2(0.002 + (combo * 0.0001), 0.002)]} radialModulation={false} modulationOffset={0} />
                <DataNoise opacity={0.05} />
                <Vignette eskil={false} offset={0.1} darkness={1.1} />
            </EffectComposer>
        </>
    );
};

// --- MAIN WRAPPER ---
export const TokenTsunami: React.FC<TokenTsunamiProps> = ({ onComplete, t }) => {
    // Game State
    const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'END'>('MENU');
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [multiplier, setMultiplier] = useState(1);
    const [health, setHealth] = useState(100);
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION);

    // Logic Refs
    const notesRef = useRef<Note[]>([]);
    const reqRef = useRef<number>(0);
    const lastTimeRef = useRef(0);
    const spawnTimerRef = useRef(0);
    const speedRef = useRef(40); // Units per second
    const gameTimeRef = useRef(0);

    // React State for Render
    const [renderNotes, setRenderNotes] = useState<Note[]>([]);
    const [activeLane, setActiveLane] = useState<number | null>(null);
    const [explosions, setExplosions] = useState<{ id: number, pos: [number, number, number], color: string }[]>([]);

    // --- LOOP ---
    const loop = (time: number) => {
        if (gameState !== 'PLAYING') return;

        const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1); // Cap dt
        lastTimeRef.current = time;
        gameTimeRef.current += dt;

        // Timer
        const newTime = Math.max(0, GAME_DURATION - gameTimeRef.current);
        setTimeLeft(newTime);
        if (newTime <= 0 || health <= 0) {
            endGame();
            return;
        }

        // Spawn Logic
        spawnTimerRef.current -= dt;
        if (spawnTimerRef.current <= 0) {
            // Spawn Rate increases with score
            const spawnRate = Math.max(0.15, 0.5 - (score / 10000));
            spawnTimerRef.current = spawnRate;

            const lane = Math.floor(Math.random() * LANES);
            const typeRoll = Math.random();
            let type: NoteType = 'SIGNAL';
            // Harder curve
            if (score > 2000 && typeRoll > 0.8) type = 'NOISE';
            else if (typeRoll > 0.85) type = 'NOISE';

            if (typeRoll > 0.96) type = 'GOLD';

            notesRef.current.push({
                id: Date.now() + Math.random(),
                lane,
                z: SPAWN_Z,
                type,
                hit: false,
                missed: false
            });
        }

        // Move Notes
        // Speed scaling
        const currentSpeed = speedRef.current + (combo * 0.2) + (score * 0.001);
        notesRef.current.forEach(n => {
            n.z += currentSpeed * dt;
        });

        // Check Misses
        notesRef.current.forEach(n => {
            if (n.z > DESPAWN_Z && !n.hit && !n.missed) {
                n.missed = true;
                if (n.type !== 'NOISE') {
                    setCombo(0);
                    setMultiplier(1);
                    setHealth(h => Math.max(0, h - 10));
                }
            }
        });

        // Cleanup
        notesRef.current = notesRef.current.filter(n => n.z <= DESPAWN_Z + 5);

        // Sync to React State (limit frequency for perfs?)
        // For 60fps React render, just set state
        setRenderNotes([...notesRef.current]);

        reqRef.current = requestAnimationFrame(loop);
    };

    const startGame = () => {
        setScore(0);
        setHealth(100);
        setCombo(0);
        setMultiplier(1);
        setTimeLeft(GAME_DURATION);
        notesRef.current = [];
        setExplosions([]);
        gameTimeRef.current = 0;
        setGameState('PLAYING');
        lastTimeRef.current = performance.now();
        reqRef.current = requestAnimationFrame(loop);
        audio.startAmbience('CYBER');
    };

    const endGame = () => {
        setGameState('END');
        cancelAnimationFrame(reqRef.current);
        audio.stopAmbience();
        if (score > 1000) audio.playSuccess();
        else audio.playError();
    };

    const handleHit = (lane: number) => {
        if (gameState !== 'PLAYING') return;
        setActiveLane(lane);
        setTimeout(() => setActiveLane(null), 100);

        // Hit Detection
        const candidates = notesRef.current
            .filter(n => n.lane === lane && !n.hit && Math.abs(n.z - HIT_Z) < HIT_WINDOW)
            .sort((a, b) => Math.abs(a.z) - Math.abs(b.z));

        if (candidates.length > 0) {
            const hitNote = candidates[0];
            hitNote.hit = true;

            // Trigger Explosion
            const id = Date.now() + Math.random();
            setExplosions(prev => [...prev.slice(-15), {
                id,
                pos: [(hitNote.lane - 1.5) * LANE_WIDTH, 0, 0],
                color: hitNote.type === 'GOLD' ? 'gold' : hitNote.type === 'NOISE' ? 'red' : 'cyan'
            }]);
            // Cleanup explosion trigger after delay (particles handle their own life, this is just for the hook)
            setTimeout(() => setExplosions(prev => prev.filter(e => e.id !== id)), 100);

            if (hitNote.type === 'NOISE') {
                audio.playError();
                setCombo(0);
                setMultiplier(1);
                setHealth(h => Math.max(0, h - 15));
            } else {
                audio.playClick();
                const points = hitNote.type === 'GOLD' ? 500 : 100;
                const newCombo = combo + 1;
                setCombo(newCombo);

                // Multiplier Logic
                let newMult = 1;
                if (newCombo > 50) newMult = 8;
                else if (newCombo > 25) newMult = 4;
                else if (newCombo > 10) newMult = 2;
                setMultiplier(newMult);

                setScore(s => s + (points * newMult));
                setHealth(h => Math.min(100, h + 2));
            }
        }
    };

    // Keyboard Input
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (gameState !== 'PLAYING') return;
            const k = e.key.toUpperCase();
            const idx = LANE_KEYS.indexOf(k);
            if (idx > -1) handleHit(idx);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [gameState]);

    return (
        <div className="w-full h-full relative bg-black select-none font-sans overflow-hidden">
            {/* 3D Canvas */}
            <Canvas camera={{ position: [0, 6, 10], fov: 60 }} dpr={[1, 2]} gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping }}>
                <Suspense fallback={null}>
                    <GameScene
                        activeLane={activeLane}
                        notes={renderNotes}
                        explosions={explosions}
                        combo={combo}
                    />
                </Suspense>
            </Canvas>

            {/* HUD Overlay */}
            <div className="absolute inset-0 pointer-events-none p-4 md:p-8 flex flex-col justify-between z-10">
                {/* Top Bar */}
                <div className="flex justify-between items-start">
                    <div>
                        <div className="text-4xl md:text-6xl font-black text-white italic tracking-tighter drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">
                            {score.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`text-xl md:text-2xl font-bold ${multiplier >= 8 ? 'text-yellow-400 animate-pulse' : 'text-cyan-400'}`}>
                                x{multiplier} MULTIPLIER
                            </div>
                        </div>
                    </div>

                    <div className="text-center">
                        <div className={`text-3xl md:text-4xl font-mono font-bold flex items-center gap-2 ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                            <Timer /> {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="text-4xl font-black text-white">{combo}</div>
                        <div className="text-sm font-bold text-gray-400 tracking-widest">COMBO</div>
                    </div>
                </div>

                {/* Bottom Bar: Health */}
                <div className="w-full max-w-2xl mx-auto mb-20 md:mb-0">
                    <div className="h-4 bg-gray-900 rounded-full border border-gray-700 overflow-hidden relative">
                        <div
                            className={`h-full transition-all duration-200 ${health < 30 ? 'bg-red-500' : 'bg-gradient-to-r from-cyan-500 to-blue-600'}`}
                            style={{ width: `${health}%` }}
                        />
                    </div>
                </div>

                {/* Touch Controls (Mobile) */}
                <div className="grid grid-cols-4 gap-2 pointer-events-auto h-40 md:opacity-0 opacity-50 absolute bottom-0 left-0 right-0 p-4">
                    {[0, 1, 2, 3].map(i => (
                        <div
                            key={i}
                            onPointerDown={() => handleHit(i)}
                            className="bg-white/5 border border-white/10 rounded-xl active:bg-cyan-500/50 transition-colors"
                        />
                    ))}
                </div>
            </div>

            {/* Menus */}
            {gameState === 'MENU' && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-50 animate-in fade-in">
                    <div className="w-24 h-24 bg-cyan-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                        <Music size={48} className="text-cyan-400" />
                    </div>
                    <h1 className="text-5xl md:text-8xl font-black text-white italic tracking-tighter mb-4 text-center">
                        {t('tokentsunami.title_token')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">{t('tokentsunami.title_tsunami')}</span>
                    </h1>
                    <p className="text-gray-400 max-w-md text-center mb-10 text-lg px-4">
                        {t('tokentsunami.desc')}
                    </p>
                    <Button onClick={startGame} className="px-12 py-6 text-xl font-bold rounded-full shadow-[0_0_30px_rgba(6,182,212,0.6)]">
                        <Play className="mr-2" /> {t('tokentsunami.init_link')}
                    </Button>
                </div>
            )}

            {gameState === 'END' && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-lg flex flex-col items-center justify-center z-50 animate-in zoom-in">
                    <Trophy size={64} className="text-yellow-400 mb-6" />
                    <h2 className="text-4xl font-bold text-white mb-2">{t('tokentsunami.sync_complete')}</h2>
                    <div className="text-7xl font-black text-cyan-400 mb-8">{score.toLocaleString()}</div>

                    <div className="grid grid-cols-3 gap-8 mb-10 text-center">
                        <div>
                            <div className="text-gray-500 text-xs font-bold uppercase">{t('tokentsunami.max_combo')}</div>
                            <div className="text-2xl font-bold text-white">{combo}</div>
                        </div>
                        <div>
                            <div className="text-gray-500 text-xs font-bold uppercase">{t('tokentsunami.multiplier')}</div>
                            <div className="text-2xl font-bold text-white">x{multiplier}</div>
                        </div>
                        <div>
                            <div className="text-gray-500 text-xs font-bold uppercase">{t('tokentsunami.health')}</div>
                            <div className="text-2xl font-bold text-white">{Math.round(health)}%</div>
                        </div>
                    </div>

                    <Button onClick={() => onComplete(score)}>
                        {t('tokentsunami.submit')}
                    </Button>
                </div>
            )}
        </div>
    );
};
