
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Server, Database, Zap, Layers, ArrowRight, Thermometer, Fan, Cpu, Activity, AlertOctagon } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Scanlines } from '../ui/Visuals';
import { Language } from '../../types';

interface LatencyLabProps {
    onComplete: (score: number) => void;
    t: (key: string) => string;
    language?: Language;
}

interface Packet {
    id: number;
    progress: number; // 0 to 100
    speed: number;
    color: string;
}

export const LatencyLab: React.FC<LatencyLabProps> = ({ onComplete, t }) => {
    // Config Controls
    const [clockSpeed, setClockSpeed] = useState(1); // 1x to 3x (Overclock)
    const [cooling, setCooling] = useState(1); // 1x to 3x (Fan speed)
    const [batchSize, setBatchSize] = useState(16);

    // Sim State
    const [isRunning, setIsRunning] = useState(false);
    const [temp, setTemp] = useState(40); // Celsius
    const [buffer, setBuffer] = useState(0); // % full
    const [throughput, setThroughput] = useState(0); // RPS
    const [processedTotal, setProcessedTotal] = useState(0);
    const [packets, setPackets] = useState<Packet[]>([]);
    const [gameOver, setGameOver] = useState(false);
    const [alertMsg, setAlertMsg] = useState<string | null>(null);

    const resetGame = () => {
        setIsRunning(false);
        setTemp(40);
        setBuffer(0);
        setThroughput(0);
        setProcessedTotal(0);
        setPackets([]);
        setGameOver(false);
        setAlertMsg(null);
        setClockSpeed(1);
        setCooling(1);
        cancelAnimationFrame(requestRef.current);
    };

    const requestRef = useRef<number>(0);
    const lastTimeRef = useRef(0);

    // --- PHYSICS LOOP ---
    useEffect(() => {
        if (!isRunning || gameOver) return;

        const loop = (time: number) => {
            const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1); // Seconds
            lastTimeRef.current = time;

            // 1. Thermal Physics
            // Heat gen = Clock Speed^2 + Throughput load
            const heatGen = (clockSpeed * clockSpeed * 2) + (buffer / 20);
            // Cooling = Fan speed * Efficiency
            const heatDissipation = cooling * 3.5;

            setTemp(t => {
                const newTemp = t + (heatGen - heatDissipation) * dt;
                // Ambient floor is 30C
                return Math.max(30, newTemp);
            });

            // 2. Processing Logic
            const processRate = clockSpeed * 10; // Packets per sec
            // Incoming load (simulated traffic spike)
            const incomingRate = 5 + (processedTotal / 20); // Gets harder

            setBuffer(b => Math.max(0, b + (incomingRate - processRate) * dt));

            // Throughput visual
            setThroughput(Math.min(incomingRate, processRate) * batchSize);
            setProcessedTotal(p => p + (processRate * dt));

            // 3. Visual Packets
            if (Math.random() > 0.8) {
                setPackets(prev => [...prev, {
                    id: Date.now() + Math.random(),
                    progress: 0,
                    speed: clockSpeed * 30,
                    color: Math.random() > 0.5 ? '#a855f7' : '#3b82f6'
                }]);
            }
            setPackets(prev => prev.map(p => ({
                ...p,
                progress: p.progress + (p.speed * dt)
            })).filter(p => p.progress < 100));

            // 4. Fail States
            if (temp > 100) {
                setGameOver(true);
                setAlertMsg(t('latency.overheat'));
                audio.playError();
            }
            if (buffer > 100) {
                setGameOver(true);
                setAlertMsg(t('latency.overflow'));
                audio.playError();
            }

            // 5. Win State
            if (processedTotal > 500) {
                setGameOver(true);
                setAlertMsg(t('latency.target_met'));
                audio.playSuccess();
                setTimeout(() => onComplete(100), 2000);
            }

            requestRef.current = requestAnimationFrame(loop);
        };

        requestRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(requestRef.current);
    }, [isRunning, clockSpeed, cooling, batchSize, temp, buffer, gameOver]);

    const handleStart = () => {
        setIsRunning(true);
        lastTimeRef.current = performance.now();
        audio.playEngine(1000);
    };

    return (
        <div className="h-full flex flex-col bg-[#0f172a] relative overflow-hidden font-mono select-none">
            <Scanlines />

            {/* --- SERVER RACK VISUALIZER --- */}
            <div className="flex-1 relative flex items-center justify-center p-6 perspective-[800px]">
                <div className="relative w-64 h-96 bg-gray-900 border-4 border-slate-700 rounded-xl shadow-2xl flex flex-col p-2 overflow-hidden transform rotate-y-12">
                    {/* Status Lights */}
                    <div className="flex space-x-2 mb-4">
                        <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-700'}`}></div>
                        <div className={`w-3 h-3 rounded-full ${temp > 80 ? 'bg-red-500 animate-flash' : 'bg-gray-700'}`}></div>
                        <div className={`w-3 h-3 rounded-full ${buffer > 80 ? 'bg-amber-500 animate-flash' : 'bg-gray-700'}`}></div>
                    </div>

                    {/* Server Blades */}
                    {[1, 2, 3, 4].map(i => (
                        <div
                            key={i}
                            className="flex-1 bg-gray-950 mb-2 rounded-sm border border-slate-800 relative overflow-hidden group shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] flex flex-col justify-center px-4"
                            style={{
                                transform: `translateZ(${i * 10}px)`,
                                boxShadow: temp > 90 ? '0 0 20px rgba(255,0,0,0.3), inset 0 0 20px rgba(0,0,0,0.8)' : 'inset 0 0 20px rgba(0,0,0,0.8)'
                            }}
                        >
                            {/* Rack Ears */}
                            <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-4 bg-slate-700 rounded-sm"></div>
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-4 bg-slate-700 rounded-sm"></div>
                            <div
                                className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/20 to-red-500/0 blur-md transition-opacity duration-500 pointer-events-none"
                                style={{ opacity: Math.max(0, (temp - 50) / 100) }}
                            ></div>

                            {/* Sparks if damaging */}
                            {temp > 95 && Math.random() > 0.7 && (
                                <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-yellow-400 rounded-full blur-[1px] animate-ping" style={{ left: `${Math.random() * 100}%` }}></div>
                            )}
                        </div>
                    ))}

                    {/* Fan Visual */}
                    <div className="h-24 mt-auto relative flex justify-center items-center border-t border-slate-700 pt-2 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
                        <div className="absolute inset-0 bg-black/50"></div>
                        <div className={`w-20 h-20 rounded-full border-4 border-slate-600 flex items-center justify-center ${isRunning ? 'animate-spin' : ''}`} style={{ animationDuration: `${2000 / (1 + cooling)}ms` }}>
                            <div className="w-2 h-full bg-slate-600"></div>
                            <div className="h-2 w-full bg-slate-600"></div>
                        </div>
                        {/* RGB Fan Ring */}
                        <div className={`absolute w-20 h-20 rounded-full border-2 ${cooling > 2 ? 'border-blue-500 shadow-[0_0_15px_blue]' : 'border-slate-800'} opacity-50`}></div>
                    </div>
                </div>

                {/* Floating Packets (Particles) */}
                {
                    packets.map(p => (
                        <div
                            key={p.id}
                            className="absolute w-2 h-2 rounded-full shadow-[0_0_10px_currentColor] pointer-events-none"
                            style={{
                                left: `${p.progress}%`,
                                top: `${30 + (Math.sin(p.id) * 20)}%`,
                                backgroundColor: p.color,
                                opacity: isRunning ? 1 : 0
                            }}
                        ></div>
                    ))
                }
            </div >

            {/* --- GAUGES HUD (Moved to Bottom Right/Left to clear Top Left) --- */}
            < div className="absolute top-4 right-4 w-48 space-y-4 bg-black/80 p-4 rounded-xl border border-slate-700 backdrop-blur z-10" >
                <div>
                    <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 mb-1">
                        <span className="flex items-center"><Thermometer size={12} className="mr-1" /> {t('latency.core_temp')}</span>
                        <span className={temp > 85 ? 'text-red-500 blink' : 'text-white'}>{Math.round(temp)}{t('games.latencylab.c')}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-200 ${temp > 85 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, temp)}%` }}></div>
                    </div>
                </div>
                <div>
                    <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 mb-1">
                        <span className="flex items-center"><Layers size={12} className="mr-1" /> {t('latency.buffer_load')}</span>
                        <span className={buffer > 85 ? 'text-amber-500 blink' : 'text-white'}>{Math.round(buffer)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-200 ${buffer > 85 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, buffer)}%` }}></div>
                    </div>
                </div>
                <div className="pt-2 border-t border-slate-700">
                    <div className="text-[10px] uppercase font-bold text-slate-500">{t('latency.processed')}</div>
                    <div className="text-2xl font-black text-white">{Math.floor(processedTotal)} <span className="text-xs text-gray-500">{t('latency.req')}</span></div>
                </div>
            </div >

            {/* --- CONTROLS --- */}
            < div className="bg-slate-900 border-t border-slate-700 p-6 z-20 safe-area-pb" >
                <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="text-[10px] font-bold text-purple-400 uppercase mb-2 flex items-center justify-between">
                            <span className="flex items-center"><Cpu size={12} className="mr-1" /> {t('latency.clock_speed')}</span>
                            <span>{clockSpeed.toFixed(1)}x</span>
                        </label>
                        <input
                            type="range" min="1" max="3" step="0.1"
                            value={clockSpeed}
                            onChange={(e) => setClockSpeed(parseFloat(e.target.value))}
                            disabled={!isRunning || gameOver}
                            className="w-full accent-purple-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-blue-400 uppercase mb-2 flex items-center justify-between">
                            <span className="flex items-center"><Fan size={12} className="mr-1" /> {t('latency.cooling_fan')}</span>
                            <span>{cooling.toFixed(1)}x</span>
                        </label>
                        <input
                            type="range" min="1" max="3" step="0.1"
                            value={cooling}
                            onChange={(e) => setCooling(parseFloat(e.target.value))}
                            disabled={!isRunning || gameOver}
                            className="w-full accent-blue-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>

                {
                    !isRunning ? (
                        <Button fullWidth variant="primary" onClick={handleStart} size="lg" className="shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                            <Zap className="mr-2" size={18} /> {t('latency.boot_server')}
                        </Button>
                    ) : gameOver ? (
                        <div className="text-center animate-in zoom-in">
                            <div className={`text-xl font-black mb-2 ${alertMsg?.includes('TARGET') ? 'text-green-500' : 'text-red-500'}`}>
                                {alertMsg}
                            </div>
                            {alertMsg?.includes('TARGET') ? (
                                <p className="text-gray-400 text-xs">{t('games.latencylab.system_stable_effici')}</p>
                            ) : (
                                <Button variant="secondary" onClick={resetGame}>{t('latency.reboot')}</Button>
                            )}
                        </div>
                    ) : (
                        <div className="text-center text-xs text-gray-500 animate-pulse font-mono">
                            {t('latency.instruction')}
                        </div>
                    )
                }
            </div >
        </div >
    );
};
