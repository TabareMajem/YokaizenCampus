import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, Float, Stars, PerspectiveCamera, Environment, Trail, Sparkles } from '@react-three/drei';
import { Bloom, EffectComposer, ChromaticAberration, Vignette as PostVignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Button } from '../ui/Button';
import { Scanlines, Vignette } from '../ui/Visuals'; // Overlay visuals
import { audio } from '../../services/audioService';
import { Language } from '../../types';
import { TrendingDown, AlertTriangle, Zap, Database, Skull } from 'lucide-react';

// --- TYPES ---

interface GradientSkiProps {
    onComplete: (score: number) => void;
    t: (key: string) => string;
    language?: Language;
}

interface GameState {
    score: number;
    speed: number;
    gameOver: boolean;
    lane: number;
}

// --- 3D COMPONENTS ---

const Player = ({ lane, gameOver }: { lane: number, gameOver: boolean }) => {
    const ref = useRef<THREE.Group>(null);
    const targetX = lane * 2.5; // Lane spacing

    useFrame((state, delta) => {
        if (!ref.current) return;
        // Smooth lerp to target lane
        ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, targetX, 10 * delta);
        // Banking effect
        const tilt = (ref.current.position.x - targetX) * -0.2;
        ref.current.rotation.z = THREE.MathUtils.lerp(ref.current.rotation.z, tilt, 10 * delta);

        // Float effect
        if (!gameOver) {
            ref.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 5) * 0.1;
        } else {
            ref.current.position.y = 0.2;
            ref.current.rotation.x = 0.5;
        }
    });

    return (
        <group ref={ref} position={[0, 0.5, 0]}>
            <Trail width={1} length={4} color="#06b6d4" attenuation={(t) => t * t}>
                <mesh castShadow receiveShadow>
                    <coneGeometry args={[0.3, 1, 8]} />
                    <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={2} toneMapped={false} />
                </mesh>
            </Trail>
            <pointLight distance={5} intensity={5} color="#06b6d4" />
            {/* Engine glow */}
            <mesh position={[0, -0.4, 0.2]}>
                <sphereGeometry args={[0.2]} />
                <meshBasicMaterial color="#ffffff" />
            </mesh>
        </group>
    );
};

const Terrain = ({ speed }: { speed: number }) => {
    const mesh = useRef<THREE.Mesh>(null);
    // Infinite scrolling shader or simple movement
    // We'll move the texture offset

    useFrame((state, delta) => {
        if (mesh.current) {
            // @ts-ignore
            mesh.current.material.map.offset.y -= speed * 0.005 * delta;
        }
    });

    const texture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#2e0249'; // Base
        ctx.fillRect(0, 0, 64, 64);
        ctx.strokeStyle = '#ec4899'; // Grid color
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 64, 64);
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(20, 20);
        return tex;
    }, []);

    return (
        <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, -20]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial map={texture} color="#ff00ff" roughness={0.5} metalness={0.8} />
        </mesh>
    );
};

const Obstacle = ({ type, position, hit }: { type: 'SPIKE' | 'DATA' | 'GATE', position: [number, number, number], hit: boolean }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame((state) => {
        if (!ref.current) return;
        if (type === 'DATA') {
            ref.current.rotation.y += 0.05;
            ref.current.rotation.z += 0.02;
        } else if (type === 'SPIKE') {
            ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.2;
        }
    });

    if (hit) return null;

    return (
        <group ref={ref} position={position}>
            {type === 'SPIKE' && (
                <mesh castShadow>
                    <coneGeometry args={[0.4, 1.5, 4]} />
                    <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
                </mesh>
            )}
            {type === 'DATA' && (
                <Float speed={5} rotationIntensity={1} floatIntensity={1}>
                    <mesh castShadow>
                        <octahedronGeometry args={[0.4]} />
                        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={3} wireframe />
                    </mesh>
                </Float>
            )}
            {/* Simple visual hit box check */}
        </group>
    );
};

// --- GAME LOGIC ---

const GameScene = ({ gameState, setGameState }: { gameState: GameState, setGameState: React.Dispatch<React.SetStateAction<GameState>> }) => {
    const { lane, speed, gameOver } = gameState;
    const [obstacles, setObstacles] = useState<{ id: number, type: 'SPIKE' | 'DATA' | 'GATE', position: [number, number, number], hit: boolean }[]>([]);

    // Spawning logic
    useFrame((state, delta) => {
        if (gameOver) return;

        // Move obstacles towards player (Player is at z=0, obstacles spawn at -50)
        // Wait, standard infinite runner: Player static, world moves +z
        // Let's spawn at -50, move to +10

        const moveDist = speed * delta; // speed is like 10-50 units/sec?

        setObstacles(prev => {
            const next = prev.map(o => ({
                ...o,
                position: [o.position[0], o.position[1], o.position[2] + moveDist] as [number, number, number]
            }));

            // Collision check
            // Player is at x = lane * 2.5, z = 0
            // Hitbox: z roughly 0 (+/- 0.5), x roughly match
            const playerX = lane * 2.5;

            next.forEach(o => {
                if (!o.hit && Math.abs(o.position[2] - 0) < 0.8) {
                    // Check X
                    // Lane width is about 2.5, object width ~0.5
                    if (Math.abs(o.position[0] - playerX) < 1.0) {
                        o.hit = true;
                        if (o.type === 'SPIKE') {
                            handleCrash();
                        } else {
                            audio.playSuccess();
                            setGameState(s => ({ ...s, score: s.score + 100 }));
                        }
                    }
                }
            });

            // Cleanup
            return next.filter(o => o.position[2] < 10);
        });

        // Spawn new
        if (Math.random() < 0.05 * (speed / 10) * delta * 60) { // Normalized spawn rate
            const spawnLane = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
            const type = Math.random() > 0.3 ? 'SPIKE' : 'DATA';
            setObstacles(prev => [
                ...prev,
                {
                    id: Math.random(),
                    type,
                    position: [spawnLane * 2.5, 0.5, -60],
                    hit: false
                }
            ]);
        }

        // Update score purely by distance
        setGameState(s => ({ ...s, score: s.score + 1, speed: Math.min(50, s.speed + 0.005) }));
    });

    const handleCrash = () => {
        if (gameOver) return;
        audio.playError();
        setGameState(s => ({ ...s, gameOver: true }));
    };

    return (
        <group>
            {obstacles.map(o => (
                <Obstacle key={o.id} {...o} />
            ))}
        </group>
    );
};


// --- MAIN COMPONENT ---

export const GradientSki: React.FC<GradientSkiProps> = ({ onComplete, t }) => {
    const [gameState, setGameState] = useState<GameState>({
        score: 0,
        speed: 15,
        gameOver: false,
        lane: 0,
    });

    const [menu, setMenu] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');

    useEffect(() => {
        if (menu === 'PLAYING') {
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'ArrowLeft' || e.key === 'a') setGameState(s => ({ ...s, lane: Math.max(-1, s.lane - 1) }));
                if (e.key === 'ArrowRight' || e.key === 'd') setGameState(s => ({ ...s, lane: Math.min(1, s.lane + 1) }));
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [menu]);

    const startGame = () => {
        setGameState({ score: 0, speed: 15, gameOver: false, lane: 0 });
        setMenu('PLAYING');
        audio.playStart();
    };

    // Watch for game over from game logic
    useEffect(() => {
        if (gameState.gameOver && menu === 'PLAYING') {
            setTimeout(() => setMenu('GAMEOVER'), 1000); // Delay for crash effect
        }
    }, [gameState.gameOver, menu]);

    return (
        <div className="h-full w-full bg-black relative overflow-hidden">
            {/* DOM OVERLAYS */}
            <Scanlines />
            <Vignette color="#000000" />

            {/* --- HUD --- */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between z-30 pointer-events-none">
                <div>
                    <div className="text-[10px] text-pink-500 font-bold uppercase italic tracking-widest mb-1">{t('ui.score')}</div>
                    <div className="text-4xl font-black text-white italic drop-shadow-[2px_2px_0px_#ec4899]">{gameState.score.toLocaleString()}</div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-cyan-500 font-bold uppercase italic tracking-widest mb-1">{t('ski.velocity')}</div>
                    <div className="text-4xl font-black text-white italic drop-shadow-[2px_2px_0px_#06b6d4]">
                        {gameState.speed.toFixed(0)} <span className="text-sm not-italic text-gray-400">EPOCHS/S</span>
                    </div>
                </div>
            </div>

            {/* --- 3D CANVAS --- */}
            <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 3, 6], fov: 60 }}>
                <color attach="background" args={['#1a0b2e']} />
                <fog attach="fog" args={['#1a0b2e', 10, 50]} />

                <ambientLight intensity={0.5} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={10} castShadow />
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                <Sparkles count={100} scale={12} size={2} speed={0.4} opacity={0.5} color="#ec4899" />

                <group>
                    <Player lane={gameState.lane} gameOver={gameState.gameOver} />
                    <Terrain speed={menu === 'PLAYING' && !gameState.gameOver ? gameState.speed : 0} />
                    {menu === 'PLAYING' && <GameScene gameState={gameState} setGameState={setGameState} />}
                </group>

                <EffectComposer>
                    <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} intensity={1.5} />
                    <ChromaticAberration offset={new THREE.Vector2(0.002, 0.002)} />
                    <PostVignette eskil={false} offset={0.1} darkness={1.1} />
                </EffectComposer>

                {/* Environment for reflections */}
                <Environment preset="night" />
            </Canvas>

            {/* --- MENUS --- */}
            {menu === 'START' && (
                <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in backdrop-blur-sm">
                    <TrendingDown size={80} className="text-pink-500 mb-6 animate-bounce" />
                    <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-400 to-pink-500 mb-2 italic tracking-tighter">
                        {t('ski.title')}
                    </h1>
                    <p className="text-gray-300 mb-10 font-mono text-sm">3D GRADIENT DESCENT SIMULATOR</p>
                    <Button size="lg" variant="primary" onClick={startGame} className="shadow-[0_0_40px_#06b6d4] h-16 w-64 text-xl border-cyan-400 text-cyan-100 font-bold tracking-widest">
                        {t('ski.jack_in')}
                    </Button>
                </div>
            )}

            {menu === 'GAMEOVER' && (
                <div className="absolute inset-0 bg-red-950/90 z-50 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in border-y-[20px] border-red-900">
                    <Skull size={80} className="text-white mb-6 animate-pulse" />
                    <h2 className="text-5xl font-black text-white italic mb-4">{t('ski.crashed')}</h2>
                    <div className="text-4xl font-mono text-white mb-8">{gameState.score}</div>
                    <div className="space-y-4 w-full max-w-xs">
                        <Button fullWidth variant="primary" onClick={startGame} className="bg-white text-red-900 hover:bg-gray-200">{t('ski.retry')}</Button>
                        <Button fullWidth variant="ghost" onClick={() => onComplete(gameState.score > 1000 ? 100 : 50)} className="text-red-300 hover:text-white">{t('ski.lobby')}</Button>
                    </div>
                </div>
            )}

            {/* Mobile Controls Overlay */}
            {menu === 'PLAYING' && (
                <div className="absolute inset-0 z-40 flex pointer-events-none">
                    <div
                        className="flex-1 pointer-events-auto active:bg-cyan-500/10"
                        onPointerDown={() => setGameState(s => ({ ...s, lane: Math.max(-1, s.lane - 1) }))}
                    />
                    <div
                        className="flex-1 pointer-events-auto active:bg-cyan-500/10"
                        onPointerDown={() => setGameState(s => ({ ...s, lane: Math.min(1, s.lane + 1) }))}
                    />
                </div>
            )}
        </div>
    );
};
