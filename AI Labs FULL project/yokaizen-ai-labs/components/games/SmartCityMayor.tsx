
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Zap, AlertTriangle, Sun, Moon, BatteryCharging, Activity, RefreshCw } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Language } from '../../types';

interface SmartCityMayorProps {
    onComplete: (score: number) => void;
    t: (key: string) => string;
    language?: Language;
}

interface Building {
    id: number;
    type: 'RESIDENTIAL' | 'INDUSTRIAL' | 'COMMERCIAL';
    load: number;
    status: 'OK' | 'SURGE' | 'BLACKOUT';
    x: number;
    y: number;
}

// Simple vector math helper
const getPointOnLine = (p1: { x: number, y: number }, p2: { x: number, y: number }, t: number) => {
    return {
        x: p1.x + (p2.x - p1.x) * t,
        y: p1.y + (p2.y - p1.y) * t
    }
}

export const SmartCityMayor: React.FC<SmartCityMayorProps> = ({ onComplete, t }) => {
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [totalPower, setTotalPower] = useState(1000);
    const [usedPower, setUsedPower] = useState(0);
    const [timeOfDay, setTimeOfDay] = useState(6);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [day, setDay] = useState(1);
    const [energyPulse, setEnergyPulse] = useState(0);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);

    // Traffic System State
    const trafficCars = useRef<{
        from: number, to: number, progress: number, color: string, speed: number
    }[]>([]);

    useEffect(() => {
        const initB: Building[] = [];
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const i = row * 3 + col;
                initB.push({
                    id: i,
                    type: i % 3 === 0 ? 'INDUSTRIAL' : i % 2 === 0 ? 'COMMERCIAL' : 'RESIDENTIAL',
                    load: 20,
                    status: 'OK',
                    x: 0, y: 0 // Will be calculated below
                });
            }
        }
        setBuildings(initB);
    }, []);

    useEffect(() => {
        if (gameOver) return;

        const interval = setInterval(() => {
            setTimeOfDay(t => {
                if (t >= 23) {
                    setDay(d => d + 1);
                    return 0;
                }
                return t + 1;
            });

            // Update buildings and loads
            setBuildings(prev => prev.map(b => {
                if (b.status === 'BLACKOUT') return b;

                let targetLoad = 20;
                if (b.type === 'RESIDENTIAL') {
                    if (timeOfDay >= 18 && timeOfDay <= 23) targetLoad = 80;
                    else if (timeOfDay >= 6 && timeOfDay <= 9) targetLoad = 60;
                } else if (b.type === 'INDUSTRIAL') {
                    if (timeOfDay >= 9 && timeOfDay <= 17) targetLoad = 90;
                    else targetLoad = 40;
                } else {
                    if (timeOfDay >= 10 && timeOfDay <= 20) targetLoad = 70;
                }

                // Random Events
                if (Math.random() > 0.985 && b.status === 'OK') {
                    audio.playError();
                    return { ...b, status: 'SURGE', load: 100 };
                }
                if (b.status === 'SURGE' && Math.random() > 0.85) {
                    return { ...b, status: 'BLACKOUT', load: 0 };
                }

                const newLoad = b.status === 'SURGE' ? 100 : b.load + (targetLoad - b.load) * 0.2;
                return { ...b, load: newLoad };
            }));

            // Spawn Traffic
            if (trafficCars.current.length < 20 && Math.random() > 0.5) {
                const from = Math.floor(Math.random() * 9);
                let to = Math.floor(Math.random() * 9);
                while (to === from) to = Math.floor(Math.random() * 9);

                trafficCars.current.push({
                    from, to, progress: 0,
                    color: Math.random() > 0.5 ? '#ffff00' : '#ff0000', // Headlights vs Taillights style (abstract)
                    speed: 0.005 + Math.random() * 0.01
                });
            }

            setUsedPower(prev => {
                const usage = buildings.reduce((acc, b) => acc + b.load, 0);
                if (usage > totalPower) {
                    setBuildings(bs => {
                        const idx = Math.floor(Math.random() * bs.length);
                        const next = [...bs];
                        if (next[idx].status !== 'BLACKOUT') next[idx].status = 'BLACKOUT';
                        return next;
                    });
                    audio.playError();
                }
                return usage;
            });

            const activeCount = buildings.filter(b => b.status === 'OK').length;
            setScore(s => s + activeCount * 10);

            if (day > 2) {
                setGameOver(true);
                audio.playSuccess();
                onComplete(100);
            }
        }, 500);

        return () => clearInterval(interval);
    }, [gameOver, timeOfDay, buildings, totalPower, day]);

    // Canvas Render Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Calculate building positions on canvas to match CSS grid
        const getBuildingPos = (id: number, w: number, h: number) => {
            const col = id % 3;
            const row = Math.floor(id / 3);
            // These magic numbers match the CSS grid transform logic visually approx
            // CenterX, CenterY reference needs to be consistent
            const centerX = w / 2;
            const centerY = h + 150; // Perspective vanishing point approximation

            // Base Grid
            const baseX = (w / 2) + (col - 1) * 120 + (row - 1) * 60; // Spread out more
            const baseY = (h / 2) + (row - 1) * 60;

            return { x: baseX, y: baseY };
        }

        const drawLightning = (x1: number, y1: number, x2: number, y2: number, segments: number) => {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            let prevX = x1;
            let prevY = y1;

            for (let i = 1; i <= segments; i++) {
                const t = i / segments;
                const point = getPointOnLine({ x: x1, y: y1 }, { x: x2, y: y2 }, t);
                const jitter = (Math.random() - 0.5) * 20;
                point.x += jitter;
                point.y += jitter;

                ctx.lineTo(point.x, point.y);
                prevX = point.x;
                prevY = point.y;
            }
            ctx.stroke();
        }

        const render = () => {
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            const centerX = w / 2;
            const centerY = h + 100;

            // Update and Draw Traffic
            // This is a bit abstract because the CSS 3D transform makes 2D canvas drawing tricky to align perfectly without projection matrix
            // So we draw 'wires' connecting buildings that serve as data/power/traffic lines

            // Draw Power Stations Wires
            buildings.forEach(b => {
                const pos = getBuildingPos(b.id, w, h);

                if (b.status === 'BLACKOUT') return;

                // Power Line
                const color = b.status === 'SURGE' ? '#ef4444' : b.load > 80 ? '#f59e0b' : '#10b981';

                ctx.shadowBlur = 10;
                ctx.shadowColor = color;
                ctx.strokeStyle = color;
                ctx.lineWidth = b.load / 30; // Thicker lines for heavy load

                if (b.status === 'SURGE') {
                    // Draw jagged lightning for surge
                    drawLightning(centerX, centerY, pos.x, pos.y, 5);
                } else {
                    ctx.beginPath();
                    ctx.moveTo(centerX, centerY);
                    // Bezier curve for slack wire look
                    ctx.quadraticCurveTo(centerX, pos.y, pos.x, pos.y);
                    ctx.stroke();
                }

                ctx.shadowBlur = 0;

                // Energy Packet (Moving Dot)
                const dist = Math.sqrt(Math.pow(pos.x - centerX, 2) + Math.pow(pos.y - centerY, 2));
                const time = (performance.now() / 1000) * 2;
                const offset = (time * 100) % dist;
                const ratio = offset / dist;

                // We fake the bezier position linearly for speed (or could solve cubic bezier)
                // Linear approx ok for abstract visual
                const px = centerX + (pos.x - centerX) * ratio;
                const py = centerY + (pos.y - centerY) * ratio; // Approximation

                ctx.beginPath();
                ctx.arc(px, py, 3 + (b.load > 80 ? 2 : 0), 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
            });

            // Draw Building Inter-Connectivity (Traffic)
            trafficCars.current = trafficCars.current.filter(car => car.progress < 1);
            trafficCars.current.forEach(car => {
                car.progress += car.speed;
                const p1 = getBuildingPos(car.from, w, h);
                const p2 = getBuildingPos(car.to, w, h);

                const cur = getPointOnLine(p1, p2, car.progress);

                ctx.beginPath();
                ctx.arc(cur.x, cur.y, 2, 0, Math.PI * 2);
                ctx.fillStyle = car.color;
                ctx.fill();
            });

            requestRef.current = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(requestRef.current);
    }, [buildings]);

    const fixSurge = (id: number) => {
        setBuildings(prev => prev.map(b => {
            if (b.id === id) {
                audio.playClick();
                if (b.status === 'SURGE') return { ...b, status: 'OK', load: 50 };
                if (b.status === 'BLACKOUT') return { ...b, status: 'OK', load: 20 };
            }
            return b;
        }));
    };

    const isNight = timeOfDay < 6 || timeOfDay > 18;

    return (
        <div className={`h-full flex flex-col relative overflow-hidden font-sans transition-colors duration-2000 ${isNight ? 'bg-slate-950' : 'bg-sky-900'}`}>
            <div className={`absolute inset-0 transition-opacity duration-2000 ${isNight ? 'opacity-100' : 'opacity-0'}`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#1e293b_0%,_#000_100%)]"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-50 animate-pulse-slow"></div>
            </div>
            <div className={`absolute inset-0 transition-opacity duration-2000 ${isNight ? 'opacity-0' : 'opacity-100'}`}>
                <div className="absolute inset-0 bg-gradient-to-b from-sky-400 to-sky-200"></div>
                <div className="absolute top-10 right-10 w-24 h-24 bg-yellow-300 rounded-full blur-xl opacity-80 animate-pulse"></div>
            </div>

            <div className="absolute inset-0 pointer-events-none z-10">
                <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} className="w-full h-full" />
            </div>

            <div className="relative z-20 p-4 pl-20 flex justify-between items-center bg-black/40 backdrop-blur-md border-b border-white/10 shadow-xl">
                <div className="flex items-center space-x-6">
                    <div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">{t('smartcity.time')}</div>
                        <div className="text-3xl font-black text-white flex items-center font-mono">
                            {isNight ? <Moon size={24} className="mr-2 text-purple-400" /> : <Sun size={24} className="mr-2 text-yellow-400" />}
                            {timeOfDay.toString().padStart(2, '0')}:00
                        </div>
                    </div>
                    <div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">{t('smartcity.grid_load')}</div>
                        <div className="flex items-end">
                            <span className={`text-2xl font-bold font-mono ${usedPower > totalPower ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
                                {Math.round(usedPower)}
                            </span>
                            <span className="text-xs text-gray-500 mb-1 ml-1">/ {totalPower} {t('games.smartcitymayor.mw')}</span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-gray-400 font-bold uppercase">{t('ui.score')}</div>
                    <div className="text-3xl font-black text-white tracking-tighter">{score.toLocaleString()}</div>
                </div>
            </div>

            <div className="flex-1 relative flex items-center justify-center perspective-[1200px] overflow-hidden z-20">
                <div className="transform rotate-x-60 rotate-z-45 transition-transform duration-700 grid grid-cols-3 gap-12 p-10 pb-32">
                    {buildings.map(b => {
                        let heightClass = 'h-24';
                        let baseColor = 'from-slate-700 to-slate-900';
                        let windowColor = isNight ? 'bg-yellow-100' : 'bg-sky-200';
                        let accentBorder = 'border-slate-600';

                        if (b.type === 'RESIDENTIAL') { heightClass = 'h-32'; baseColor = 'from-indigo-800 to-indigo-950'; accentBorder = 'border-indigo-400'; }
                        if (b.type === 'COMMERCIAL') { heightClass = 'h-48'; baseColor = 'from-blue-800 to-blue-950'; accentBorder = 'border-blue-400'; }
                        if (b.type === 'INDUSTRIAL') { heightClass = 'h-28'; baseColor = 'from-slate-800 to-slate-950'; windowColor = 'bg-orange-400'; accentBorder = 'border-orange-500'; }

                        const isSurge = b.status === 'SURGE';
                        const isBlackout = b.status === 'BLACKOUT';

                        return (
                            <button
                                key={b.id}
                                onClick={() => fixSurge(b.id)}
                                className={`relative w-24 ${heightClass} group transition-all duration-300 transform-style-3d hover:-translate-z-4 active:scale-95 touch-manipulation`}
                                disabled={b.status === 'OK'}
                                style={{ transformStyle: 'preserve-3d' }}
                            >
                                {/* Building Base (Shadow) */}
                                <div className="absolute -bottom-8 left-0 right-0 h-8 bg-black/40 blur-xl transform scale-150 rotate-x-90 translate-z-[-10px]"></div>

                                {/* 3D Structure */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${isSurge ? 'from-red-900 to-red-950 animate-shake' : isBlackout ? 'from-gray-900 to-gray-950 brightness-50' : baseColor} border-t border-l ${isSurge ? 'border-red-500' : accentBorder} transition-all duration-300 shadow-2xl overflow-hidden`}>

                                    {/* Windows Grid */}
                                    {!isBlackout && (
                                        <div className="absolute inset-2 grid grid-cols-2 gap-y-3 gap-x-2 opacity-90 p-1">
                                            {Array.from({ length: 8 }).map((_, w) => (
                                                <div
                                                    key={w}
                                                    className={`h-full rounded-[1px] transition-colors duration-1000 shadow-[0_0_5px_currentColor] ${isSurge ? 'bg-red-500 animate-flash' :
                                                        b.load > 85 ? 'bg-orange-300' : windowColor
                                                        }`}
                                                    style={{ opacity: isNight ? (Math.random() > 0.4 ? 1 : 0.1) : 0.7 }}
                                                ></div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Roof Glow */}
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-white/20"></div>
                                </div>

                                {/* Right Face (Pseudo-3D) */}
                                <div className={`absolute top-0 bottom-0 -right-4 w-4 bg-gradient-to-b ${isSurge ? 'from-red-950 to-black' : 'from-black/40 to-black/80'} origin-left transform skew-y-[45deg] border-t border-white/10`}></div>

                                {/* Top Face (Pseudo-3D) */}
                                <div className={`absolute -top-4 left-0 right-0 h-4 bg-gradient-to-br ${isSurge ? 'from-red-800 to-red-900' : baseColor} origin-bottom transform skew-x-[45deg] border border-white/20 flex items-center justify-center`}>
                                    {/* HVAC Units */}
                                    <div className="w-2 h-2 rounded-full bg-black/50 animate-pulse"></div>
                                    {b.type === 'INDUSTRIAL' && <div className="ml-2 w-1 h-3 bg-gray-400 rotate-45"></div>}
                                </div>

                                {/* Status Indicators (Floating) */}
                                <div className={`absolute -top-20 left-1/2 -translate-x-1/2 transition-all duration-300 transform-style-flat z-50 ${isSurge || isBlackout ? 'opacity-100 scale-110' : 'opacity-0 scale-0'}`}>
                                    {isSurge && (
                                        <div className="bg-red-600 text-white p-2 rounded-full shadow-[0_0_20px_red] border-2 border-white animate-bounce flex flex-col items-center">
                                            <AlertTriangle size={24} />
                                            <span className="text-[10px] font-black uppercase mt-1">{t('games.smartcitymayor.surge')}</span>
                                        </div>
                                    )}
                                    {isBlackout && (
                                        <div className="bg-gray-800 text-gray-400 p-2 rounded-full shadow-lg border-2 border-gray-600 animate-pulse">
                                            <RefreshCw size={24} className="animate-spin-slow" />
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="relative z-30 p-4 bg-black/90 border-t border-white/10 flex justify-between items-center safe-area-pb">
                <div className="flex items-center text-xs text-gray-400 font-mono">
                    <Activity className="mr-2 text-green-500 animate-pulse" size={16} />
                    <span>{t('games.smartcitymayor.grid_stability')}{Math.max(0, 100 - (usedPower / totalPower) * 50).toFixed(1)}%</span>
                </div>
                <div className="flex space-x-3">
                    <Button size="sm" variant="secondary" onClick={() => setTotalPower(p => p + 200)} disabled={totalPower >= 3000} className="border-blue-500 text-blue-400 hover:bg-blue-900/20">
                        <BatteryCharging size={16} className="mr-2" /> {t('games.smartcitymayor.capacity')}</Button>
                </div>
            </div>

            {gameOver && (
                <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center animate-in zoom-in p-8 text-center">
                    <h2 className="text-4xl font-black text-white mb-4 italic uppercase">{t('smartcity.shift_complete')}</h2>
                    <div className="text-6xl mb-6">🏙️⚡</div>
                    <div className="bg-gray-900 border border-white/10 p-6 rounded-xl w-full max-w-sm mb-8">
                        <div className="flex justify-between mb-2 text-gray-400 uppercase text-xs font-bold"><span>{t('games.smartcitymayor.total_score')}</span><span>{score}</span></div>
                        <div className="flex justify-between text-gray-400 uppercase text-xs font-bold"><span>{t('games.smartcitymayor.days_survived')}</span><span>{day}</span></div>
                    </div>
                    <Button size="lg" variant="primary" onClick={() => onComplete(100)} className="w-full max-w-xs">{t('smartcity.submit_logs')}</Button>
                </div>
            )}
        </div>
    );
};
