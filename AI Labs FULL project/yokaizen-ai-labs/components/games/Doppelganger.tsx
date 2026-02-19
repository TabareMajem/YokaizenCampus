
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { audio } from '../../services/audioService';
import { User, Activity, ShieldAlert, Crosshair, Zap } from 'lucide-react';
import { Language } from '../../types';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { CyberpunkEffects } from '../gl/CyberpunkEffects';

interface DoppelgangerProps {
    onComplete: (score: number) => void;
    t: (key: string) => string;
    language?: Language;
}

type EntityType = 'GUEST' | 'PROP';
type GuestType = 'HUMAN' | 'AI';
type PropType = 'SERVER' | 'PLANT' | 'DRINK' | 'CURTAIN' | 'LIGHT';

interface Entity {
    id: string;
    type: EntityType;
    gridIndex: number;
    guestType?: GuestType;
    avatarSeed?: string;
    reactionState?: 'IDLE' | 'STARTLED' | 'LOOPING' | 'GLITCHING' | 'NERVOUS';
    biometrics?: { heartRate: number | 'ERROR'; temp: string; dermis: string; };
    propType?: PropType;
    isActive?: boolean;
}

interface Drone {
    id: number;
    position: number;
}

const EntityMesh = ({ entity, isScanning, isDroneNear, setHovered, setScanningTarget, interactWithProp, t }: any) => {
    const row = Math.floor(entity.gridIndex / 4);
    const col = entity.gridIndex % 4;
    const x = (col - 1.5) * 5;
    const z = (row - 1.5) * 5;
    const y = 0;

    const baseColor = isDroneNear ? '#ef4444' : isScanning ? '#22d3ee' : '#1e293b';

    return (
        <group position={[x, y, z]}>
            <mesh
                position={[0, -0.5, 0]}
                onPointerOver={() => {
                    document.body.style.cursor = 'pointer';
                    setHovered(entity.id);
                    if (entity.type === 'PROP' && entity.propType === 'CURTAIN') interactWithProp();
                }}
                onPointerOut={() => document.body.style.cursor = 'default'}
                onPointerDown={() => {
                    if (entity.type === 'GUEST') {
                        setScanningTarget(entity.id);
                        audio.playScan();
                    } else if (entity.type === 'PROP') {
                        interactWithProp();
                    }
                }}
                onPointerUp={() => setScanningTarget(null)}
                onPointerLeave={() => setScanningTarget(null)}
            >
                <boxGeometry args={[4, 1, 4]} />
                <meshStandardMaterial color={baseColor} roughness={0.3} metalness={0.8} emissive={baseColor} emissiveIntensity={isScanning || isDroneNear ? 0.3 : 0} />
            </mesh>

            {entity.type === 'GUEST' && (
                <Html position={[0, 2, 0]} center transform sprite zIndexRange={[100, 0]} pointerEvents="none">
                    <div className={`relative ${entity.reactionState === 'NERVOUS' ? 'animate-shake' : ''} ${entity.reactionState === 'STARTLED' ? 'scale-125 -translate-y-2' : ''} transition-all duration-300 pointer-events-none`}>
                        <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${entity.avatarSeed}`}
                            className="w-20 h-20 rounded-full border-4 border-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
                            style={{ filter: entity.reactionState === 'GLITCHING' ? 'hue-rotate(180deg) saturate(300%) contrast(150%) blur(1px)' : 'none' }}
                        />
                        {isScanning && <div className="absolute inset-[-15px] border-4 border-cyan-400 rounded-full animate-spin-slow border-dashed shadow-[0_0_25px_cyan]"></div>}
                        {entity.reactionState === 'GLITCHING' && <div className="absolute inset-[-5px] bg-red-500/30 mix-blend-color-burn animate-pulse rounded-full pointer-events-none"></div>}
                    </div>
                </Html>
            )}

            {entity.type === 'PROP' && (
                <mesh position={[0, 1.5, 0]} pointerEvents="none">
                    {entity.propType === 'SERVER' ? <boxGeometry args={[2, 3, 2]} /> :
                        entity.propType === 'PLANT' ? <cylinderGeometry args={[0.5, 0.8, 3]} /> :
                            entity.propType === 'DRINK' ? <sphereGeometry args={[1]} /> :
                                entity.propType === 'CURTAIN' ? <planeGeometry args={[4, 3]} /> :
                                    <coneGeometry args={[1.5, 3]} />}
                    <meshStandardMaterial
                        color={entity.isActive ? '#a855f7' : '#475569'}
                        emissive={entity.isActive ? '#a855f7' : '#000000'}
                        emissiveIntensity={entity.isActive ? 2 : 0}
                        roughness={0.2}
                        metalness={0.9}
                    />
                </mesh>
            )}
        </group>
    );
};

const ScannerDrone = ({ drones }: { drones: Drone[] }) => {
    return (
        <group>
            {drones.map(d => {
                const row = Math.floor(d.position / 4);
                const col = d.position % 4;
                const x = (col - 1.5) * 5;
                const z = (row - 1.5) * 5;
                return (
                    <group key={d.id}>
                        {/* The Drone light itself */}
                        <pointLight position={[x, 6, z]} color="#ef4444" intensity={4} distance={20} decay={2} />
                        {/* Red scanning beam graphic */}
                        <mesh position={[x, 3, z]} rotation={[0, 0, 0]}>
                            <cylinderGeometry args={[2, 4, 6, 32]} />
                            <meshBasicMaterial color="#ef4444" transparent opacity={0.15} blending={2} />
                        </mesh>
                    </group>
                );
            })}
        </group>
    );
};

export const Doppelganger: React.FC<DoppelgangerProps> = ({ onComplete, t }) => {
    const [phase, setPhase] = useState<'BRIEFING' | 'INFILTRATION' | 'RESULT'>('BRIEFING');
    const [grid, setGrid] = useState<Entity[]>([]);
    const [drones, setDrones] = useState<Drone[]>([{ id: 1, position: 0 }]);
    const [threatLevel, setThreatLevel] = useState(0);
    const [scanningTargetId, setScanningTargetId] = useState<string | null>(null);
    const [scanProgress, setScanProgress] = useState(0);
    const [revealedIntel, setRevealedIntel] = useState<Record<string, number>>({});
    const [result, setResult] = useState<{ success: boolean, msg: string, score: number } | null>(null);
    const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null);

    const loopRef = useRef<NodeJS.Timeout | null>(null);

    const resetGame = () => {
        setPhase('BRIEFING');
        setGrid([]);
        setDrones([{ id: 1, position: 0 }]);
        setThreatLevel(0);
        setScanningTargetId(null);
        setScanProgress(0);
        setRevealedIntel({});
        setResult(null);
        setHoveredEntityId(null);
        initGrid();
    };

    const initGrid = () => {
        const newGrid: Entity[] = [];
        const totalCells = 16;
        const humanIdx = Math.floor(Math.random() * totalCells);
        const propIndices = new Set<number>();
        while (propIndices.size < 6) {
            let idx = Math.floor(Math.random() * totalCells);
            if (idx !== humanIdx) propIndices.add(idx);
        }

        for (let i = 0; i < totalCells; i++) {
            if (propIndices.has(i)) {
                const pTypes: PropType[] = ['SERVER', 'PLANT', 'DRINK', 'CURTAIN', 'LIGHT'];
                const type = pTypes[Math.floor(Math.random() * pTypes.length)];
                newGrid.push({ id: `prop-${i}`, type: 'PROP', gridIndex: i, propType: type, isActive: false });
            } else {
                const isHuman = i === humanIdx;
                newGrid.push({
                    id: `guest-${i}`, type: 'GUEST', gridIndex: i, guestType: isHuman ? 'HUMAN' : 'AI', avatarSeed: `Agent${i + 100}`, reactionState: 'IDLE',
                    biometrics: isHuman ? { heartRate: 80 + Math.floor(Math.random() * 30), temp: '37.2°C', dermis: 'Organic' } : { heartRate: 0, temp: '22.0°C', dermis: 'Synthetic' }
                });
            }
        }
        setGrid(newGrid);
    };

    useEffect(() => {
        initGrid();
        return () => { if (loopRef.current) clearInterval(loopRef.current); audio.stopAmbience(); };
    }, []);

    useEffect(() => { if (phase === 'INFILTRATION') audio.startAmbience('HORROR'); else audio.stopAmbience(); }, [phase]);

    useEffect(() => {
        if (phase !== 'INFILTRATION') return;
        loopRef.current = setInterval(() => {
            setDrones(prev => prev.map(d => {
                if (Math.random() > 0.9) {
                    const row = Math.floor(d.position / 4); const col = d.position % 4; const moves = [];
                    if (row > 0) moves.push(d.position - 4); if (row < 3) moves.push(d.position + 4);
                    if (col > 0) moves.push(d.position - 1); if (col < 3) moves.push(d.position + 1);
                    return { ...d, position: moves[Math.floor(Math.random() * moves.length)] };
                }
                return d;
            }));
            setThreatLevel(tr => Math.max(0, tr - 0.2));
            setGrid(prev => prev.map(e => {
                if (e.type === 'PROP' && e.isActive && Math.random() > 0.92) return { ...e, isActive: false };
                if (e.type === 'GUEST' && e.guestType === 'HUMAN') {
                    if (hoveredEntityId === e.id && Math.random() > 0.8) return { ...e, reactionState: 'NERVOUS' };
                    if (e.reactionState === 'IDLE' && Math.random() > 0.98) return { ...e, reactionState: 'NERVOUS' };
                }
                if (e.type === 'GUEST' && e.guestType === 'AI') {
                    if (e.reactionState === 'IDLE' && Math.random() > 0.99) return { ...e, reactionState: 'GLITCHING' };
                }
                if (e.reactionState !== 'IDLE' && Math.random() > 0.85) return { ...e, reactionState: 'IDLE' };
                return e;
            }));
        }, 100);
        return () => clearInterval(loopRef.current!);
    }, [phase, hoveredEntityId]);

    const handlePropInteract = (prop: Entity) => {
        if (prop.type !== 'PROP') return;
        audio.playClick();
        const newGrid = [...grid]; const propIdx = newGrid.findIndex(e => e.id === prop.id); newGrid[propIdx].isActive = true;
        if (['SERVER', 'DRINK', 'PLANT'].includes(prop.propType || '')) {
            const pRow = Math.floor(prop.gridIndex / 4); const pCol = prop.gridIndex % 4;
            newGrid.forEach(e => {
                if (e.type === 'GUEST') {
                    const eRow = Math.floor(e.gridIndex / 4); const eCol = e.gridIndex % 4; const dist = Math.abs(pRow - eRow) + Math.abs(pCol - eCol);
                    if (dist <= 1.5) {
                        if (e.guestType === 'HUMAN') e.reactionState = 'STARTLED';
                        else if (Math.random() > 0.7) e.reactionState = 'GLITCHING';
                    }
                }
            });
        }
        setGrid(newGrid);
    };

    useEffect(() => {
        if (!scanningTargetId || phase !== 'INFILTRATION') return;
        const interval = setInterval(() => {
            const target = grid.find(g => g.id === scanningTargetId); if (!target) return;
            const isObserved = drones.some(d => {
                const dRow = Math.floor(d.position / 4); const dCol = d.position % 4; const tRow = Math.floor(target.gridIndex / 4); const tCol = target.gridIndex % 4;
                return Math.abs(dRow - tRow) <= 1 && Math.abs(dCol - tCol) <= 1;
            });
            if (isObserved) { setThreatLevel(tr => Math.min(100, tr + 4)); audio.playError(); }
            setScanProgress(p => {
                const next = Math.min(100, p + 1.5); const currentLvl = revealedIntel[scanningTargetId] || 0;
                if (next > 33 && currentLvl < 1) { setRevealedIntel(prev => ({ ...prev, [scanningTargetId]: 1 })); audio.playScan(); }
                else if (next > 66 && currentLvl < 2) { setRevealedIntel(prev => ({ ...prev, [scanningTargetId]: 2 })); audio.playScan(); }
                else if (next > 99 && currentLvl < 3) { setRevealedIntel(prev => ({ ...prev, [scanningTargetId]: 3 })); audio.playScan(); }
                return next;
            });
        }, 50);
        return () => clearInterval(interval);
    }, [scanningTargetId, drones, grid, phase, revealedIntel]);

    useEffect(() => { if (threatLevel >= 100) { setPhase('RESULT'); setResult({ success: false, msg: t('doppel.failed'), score: 0 }); onComplete(0); } }, [threatLevel]);

    const handleExtract = () => {
        if (!scanningTargetId) return;
        const target = grid.find(g => g.id === scanningTargetId); if (!target || target.type !== 'GUEST') return;
        const success = target.guestType === 'HUMAN'; const score = success ? 100 : 0;
        if (success) audio.playSuccess(); else audio.playError();
        setResult({ success, msg: success ? t('doppel.secured') : "ERROR: SYNTHETIC DECOY CAPTURED.", score });
        setPhase('RESULT'); onComplete(score);
    };

    return (
        <div className="h-full flex flex-col bg-slate-950 relative overflow-hidden font-mono select-none">
            {phase === 'INFILTRATION' && (
                <div className="absolute inset-0 z-0">
                    <Canvas orthographic camera={{ position: [20, 20, 20], zoom: 15 }}>
                        <ambientLight intensity={0.2} />
                        <pointLight position={[0, 20, 0]} intensity={1.5} color="#06b6d4" distance={50} />
                        <ScannerDrone drones={drones} />

                        {/* Floor plane */}
                        <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                            <planeGeometry args={[100, 100]} />
                            <meshStandardMaterial color="#020617" roughness={0.1} metalness={0.9} />
                        </mesh>
                        <gridHelper args={[100, 50, '#1e293b', '#0f172a']} position={[0, -0.9, 0]} />

                        {grid.map(entity => {
                            const isDroneNear = drones.some(d => { const dr = Math.floor(d.position / 4); const dc = d.position % 4; const er = Math.floor(entity.gridIndex / 4); const ec = entity.gridIndex % 4; return Math.abs(dr - er) <= 1 && Math.abs(dc - ec) <= 1; });
                            return (
                                <EntityMesh
                                    key={entity.id}
                                    entity={entity}
                                    isScanning={scanningTargetId === entity.id}
                                    isDroneNear={isDroneNear}
                                    setHovered={setHoveredEntityId}
                                    setScanningTarget={setScanningTargetId}
                                    interactWithProp={() => handlePropInteract(entity)}
                                    t={t}
                                />
                            );
                        })}
                        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} maxPolarAngle={Math.PI / 3} />
                        <CyberpunkEffects
                            bloomIntensity={threatLevel / 50 + 1}
                            glitchFactor={threatLevel > 80 ? 0.05 : threatLevel > 50 ? 0.01 : 0}
                            noiseOpacity={threatLevel > 50 ? 0.4 : 0.15}
                        />
                    </Canvas>
                </div>
            )}

            <div className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-300 bg-red-900/10 mix-blend-overlay" style={{ opacity: threatLevel / 100 }}></div>

            <div className="p-3 bg-black/80 border-b border-white/5 flex justify-between items-center z-30 backdrop-blur-md">
                <div className="flex items-center text-red-500 font-bold text-xs tracking-widest drop-shadow-[0_0_10px_red]">
                    <ShieldAlert size={14} className="mr-2 animate-pulse" />
                    {t('games.doppelganger.threat')}{Math.round(threatLevel)}%
                </div>
                <div className="text-[10px] text-cyan-500 font-mono tracking-widest">{t('games.doppelganger.gala_hall_b_audio_se')}</div>
            </div>

            {phase === 'BRIEFING' && (
                <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center p-8 text-center bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-blend-overlay">
                    <Crosshair size={80} className="text-cyan-500 mb-8 animate-spin-slow drop-shadow-[0_0_20px_cyan]" />
                    <h1 className="text-4xl font-black text-white mb-4 tracking-[0.2em]">{t('games.doppelganger.doppelg_nger')}</h1>
                    <p className="text-gray-400 max-w-sm mb-12 font-mono text-sm leading-relaxed">{t('games.doppelganger.desc')}</p>
                    <Button size="lg" variant="primary" onClick={() => { audio.init(); setPhase('INFILTRATION'); }} className="px-12 py-4 shadow-[0_0_20px_rgba(6,182,212,0.4)]">{t('doppel.start')}</Button>
                </div>
            )}

            {phase === 'RESULT' && result && (
                <div className={`absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in backdrop-blur-md ${result.success ? 'border-8 border-green-500' : 'border-8 border-red-500'}`}>
                    <h2 className="text-4xl font-black text-white mb-6 tracking-widest">{result.success ? t('doppel.secured') : t('doppel.failed')}</h2>
                    <p className="text-lg text-gray-300 mb-12 font-mono drop-shadow-md">{result.msg}</p>
                    <Button variant="primary" onClick={resetGame} className="px-12 py-4">{t('doppel.reboot')}</Button>
                </div>
            )}

            {phase === 'INFILTRATION' && (
                <div className="absolute bottom-0 inset-x-0 h-44 bg-black/90 border-t border-cyan-500/20 p-5 z-40 backdrop-blur-xl shadow-[0_-20px_50px_rgba(0,0,0,0.8)]">
                    <div className="flex h-full space-x-6">
                        <div className="flex-1 border-r border-white/5 pr-6 flex flex-col justify-center">
                            <div className="text-[10px] text-gray-500 uppercase font-bold mb-2 tracking-widest">{t('doppel.target_lock')}</div>
                            {hoveredEntityId ?
                                <div className="text-white font-mono text-lg flex items-center bg-cyan-900/20 p-2 rounded-lg border border-cyan-800"><User size={20} className="text-cyan-400 mr-3 animate-pulse" />{hoveredEntityId.toUpperCase()}</div>
                                : <div className="text-gray-600 font-mono text-sm italic py-2">{t('doppel.no_target')}</div>}
                            <div className="mt-4 w-full h-3 bg-gray-900 rounded-full border border-gray-700 overflow-hidden relative shadow-inner">
                                <div className="h-full bg-cyan-500 transition-all duration-300 shadow-[0_0_10px_cyan]" style={{ width: `${scanProgress}%` }}></div>
                            </div>
                        </div>
                        <div className="flex-[1.5] flex flex-col justify-center space-y-3 font-mono text-sm">
                            <div className="flex justify-between items-center p-3 border border-white/5 bg-gray-900/50 rounded-lg">
                                <span className="text-gray-400 flex items-center"><Activity size={16} className="mr-2 text-pink-500" /> {t('doppel.heart_rate')}</span>
                                <span className="text-white font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
                                    {revealedIntel[hoveredEntityId || ''] >= 1 ? grid.find(g => g.id === hoveredEntityId)?.biometrics?.heartRate : '---'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-3 border border-white/5 bg-gray-900/50 rounded-lg opacity-70">
                                <span className="text-gray-500">{t('doppel.temperature')}</span>
                                <span className="text-gray-400">{revealedIntel[hoveredEntityId || ''] >= 2 ? grid.find(g => g.id === hoveredEntityId)?.biometrics?.temp : '---'}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-center w-32 pl-2">
                            <button onClick={handleExtract} disabled={!scanningTargetId || scanProgress < 20} className={`w-full h-full border-2 rounded-xl flex flex-col items-center justify-center transition-all duration-300 ${scanningTargetId && scanProgress > 20 ? 'border-green-500 bg-green-900/20 text-green-400 hover:bg-green-800/40 shadow-[0_0_30px_rgba(34,197,94,0.3)]' : 'border-gray-800 bg-black/60 text-gray-700'}`}>
                                <Zap size={32} className="mb-2" />
                                <span className="text-xs font-black tracking-widest">{t('doppel.extract')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
