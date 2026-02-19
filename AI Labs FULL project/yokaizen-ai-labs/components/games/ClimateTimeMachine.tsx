
import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Globe, Factory, Leaf, AlertTriangle, Wind, CloudRain, Thermometer, TrendingUp, Info } from 'lucide-react';
import { Language } from '../../types';

interface ClimateTimeMachineProps {
    onComplete: (score: number) => void;
    t: (key: string) => string;
    language?: Language;
}

export const ClimateTimeMachine: React.FC<ClimateTimeMachineProps> = ({ onComplete, t }) => {
    const [year, setYear] = useState(2025);
    const [temp, setTemp] = useState(1.2); // +C
    const [co2, setCo2] = useState(420); // ppm

    // Controls
    const [industry, setIndustry] = useState(50);
    const [renewables, setRenewables] = useState(20);
    const [policies, setPolicies] = useState(0); // 0-3

    const [gameOver, setGameOver] = useState(false);
    const [history, setHistory] = useState<number[]>(Array(20).fill(1.2)); // Temp history for sparkline

    // Loop
    useEffect(() => {
        if (gameOver) return;
        const interval = setInterval(() => {
            setYear(y => {
                if (y >= 2075) { // Longer game
                    setGameOver(true);
                    return y;
                }
                return y + 1;
            });

            // Model Logic
            // Policy impacts growth rate of renewables vs industry
            const policyImpact = policies * 0.5; // Reduction multiplier

            // Economic growth drives CO2, mitigated by renewables
            // Net Emission = Industry Output - (Renewables + Carbon Capture)
            const netEmission = (industry * 0.15) - (renewables * 0.1) - policyImpact;

            setCo2(prev => Math.max(280, prev + netEmission));

            setTemp(t => {
                // Simple climate sensitivity: doubling CO2 = +3C
                // Base 280ppm = 0C anomaly
                const targetTemp = (Math.log(co2 / 280) / Math.log(2)) * 3;
                // Thermal inertia (temp lags CO2)
                return t + (targetTemp - t) * 0.05;
            });

            setHistory(prev => [...prev.slice(1), temp]);

        }, 150); // Fast ticks

        return () => clearInterval(interval);
    }, [gameOver, industry, renewables, policies, co2, temp]);

    // Visual Helpers
    const getPlanetColor = () => {
        // Map temp 1.0 (Blue/Green) -> 3.0 (Brown/Red)
        if (temp < 1.5) return 'shadow-[0_0_60px_#10b981] bg-gradient-to-br from-blue-600 via-green-500 to-blue-800'; // Healthy
        if (temp < 2.5) return 'shadow-[0_0_60px_#f59e0b] bg-gradient-to-br from-yellow-600 via-amber-700 to-orange-900'; // Warming
        return 'shadow-[0_0_80px_#ef4444] bg-gradient-to-br from-red-700 via-orange-900 to-black animate-pulse'; // Dying
    };

    const getAtmosphereOpacity = () => {
        // More smog/clouds as temp rises
        return Math.min(0.9, (temp / 5));
    };

    return (
        <div className="h-full flex flex-col bg-gray-950 relative overflow-hidden font-sans select-none">
            {/* Starfield */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_0%,#000_100%)] pointer-events-none"></div>

            {/* --- HEADER --- */}
            <div className="p-4 flex justify-between items-start z-20 relative bg-gradient-to-b from-black/90 to-transparent">
                <div>
                    <div className="text-5xl font-black text-white font-mono tracking-tighter">{year}</div>
                    <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">{t('climate.sim')}</div>
                </div>
                <div className="text-right">
                    <div className={`text-4xl font-black font-mono drop-shadow-md ${temp > 2 ? 'text-red-500' : temp > 1.5 ? 'text-amber-400' : 'text-cyan-400'}`}>
                        +{temp.toFixed(1)}{t('games.climatetimemachine.c')}</div>
                    <div className="text-xs text-gray-400 font-mono">{Math.round(co2)} {t('games.climatetimemachine.ppm_co2')}</div>
                </div>
            </div>

            {/* --- PLANET VISUALIZER --- */}
            <div className="flex-1 relative flex items-center justify-center perspective-[1200px]">
                {/* The Globe */}
                <div
                    className={`relative w-72 h-72 rounded-full transition-all duration-1000 shadow-[inset_0_-20px_50px_rgba(0,0,0,0.8)] overflow-hidden transform-style-3d group`}
                    style={{
                        backgroundColor: temp < 1.5 ? '#1e3a8a' : temp < 3.0 ? '#78350f' : '#450a0a',
                        boxShadow: temp < 1.5 ? '0 0 50px rgba(16,185,129,0.3), inset 0 -40px 100px rgba(0,0,0,0.9)' :
                            temp < 3.0 ? '0 0 50px rgba(245,158,11,0.3), inset 0 -40px 100px rgba(0,0,0,0.9)' :
                                '0 0 80px rgba(239,68,68,0.5), inset 0 -40px 100px rgba(0,0,0,0.9)'
                    }}
                >
                    {/* 1. Base Gradient (Day/Night) */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/80 pointer-events-none"></div>

                    {/* 2. Continents Overlay (Texture) */}
                    <div
                        className="absolute inset-0 opacity-80 mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] animate-spin-slow bg-repeat-x"
                        style={{ backgroundSize: '200% 100%', animationDuration: '60s' }}
                    ></div>

                    {/* 3. Clouds Layer */}
                    <div className="absolute inset-0 rounded-full overflow-hidden opacity-90 animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '90s' }}>
                        <div className="absolute top-10 left-[20%] w-40 h-10 bg-white/30 blur-xl rounded-full"></div>
                        <div className="absolute top-1/2 left-[60%] w-32 h-16 bg-white/20 blur-xl rounded-full"></div>
                        <div className="absolute bottom-20 left-[10%] w-48 h-12 bg-white/20 blur-xl rounded-full"></div>
                        {/* Storms appear at high temp */}
                        {temp > 2.0 && (
                            <>
                                <div className="absolute top-32 left-[40%] w-24 h-24 bg-gray-800/60 blur-lg rounded-full animate-pulse"></div>
                                <div className="absolute bottom-10 left-[70%] w-32 h-32 bg-gray-800/60 blur-lg rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                            </>
                        )}
                    </div>

                    {/* 4. Smog / greenhouse Layer (Based on Industry) */}
                    <div
                        className="absolute inset-0 transition-opacity duration-1000 mix-blend-hard-light"
                        style={{
                            opacity: (industry / 250) + (Math.max(0, temp - 1) * 0.2),
                            background: 'linear-gradient(to bottom, rgba(100,100,100,0.5), rgba(50,20,0,0.8))'
                        }}
                    ></div>

                    {/* 5. Heat Glow Overlay */}
                    <div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/10 to-transparent mix-blend-color-burn transition-opacity duration-500"
                        style={{ opacity: Math.max(0, (temp - 1.5)) }}
                    ></div>

                    {/* 6. Atmosphere Ring (Outer Glow) */}
                    <div className={`absolute -inset-4 rounded-full blur-xl opacity-40 transition-colors duration-1000 bg-gradient-to-tr ${temp < 1.5 ? 'from-cyan-400 to-transparent' :
                            temp < 2.5 ? 'from-amber-400 to-transparent' :
                                'from-red-600 to-transparent'
                        }`}></div>

                    {/* Rotating Shine */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/20 rounded-full pointer-events-none z-10"></div>
                </div>

                {/* Floating Stats / Orbits */}
                <div className="absolute w-80 h-80 rounded-full border border-white/5 animate-spin-slow pointer-events-none">
                    <div className="absolute top-0 left-1/2 w-2 h-2 bg-white rounded-full blur-[1px]"></div>
                </div>

                {/* Sparkline Graph */}
                <div className="absolute bottom-10 w-64 h-16 flex items-end space-x-1 opacity-50">
                    {history.map((h, i) => (
                        <div
                            key={i}
                            className={`flex-1 rounded-t-sm transition-all ${h > 2 ? 'bg-red-500' : 'bg-cyan-500'}`}
                            style={{ height: `${Math.min(100, h * 20)}%` }}
                        ></div>
                    ))}
                </div>
            </div>

            {/* --- CONTROLS DASHBOARD --- */}
            <div className="bg-black/90 border-t border-white/10 p-6 z-20 backdrop-blur-xl rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                <div className="grid grid-cols-2 gap-6 mb-6">
                    {/* Industry Slider */}
                    <div>
                        <label className="flex justify-between text-xs font-bold text-gray-400 mb-2 uppercase items-center">
                            <span className="flex items-center text-red-400"><Factory size={14} className="mr-2" /> {t('climate.industry')}</span>
                            <span className="font-mono">{industry}%</span>
                        </label>
                        <input
                            type="range" min="0" max="100"
                            value={industry}
                            onChange={e => setIndustry(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-red-500"
                            disabled={gameOver}
                        />
                    </div>

                    {/* Renewables Slider */}
                    <div>
                        <label className="flex justify-between text-xs font-bold text-gray-400 mb-2 uppercase items-center">
                            <span className="flex items-center text-green-400"><Leaf size={14} className="mr-2" /> {t('climate.green')}</span>
                            <span className="font-mono">{renewables}%</span>
                        </label>
                        <input
                            type="range" min="0" max="100"
                            value={renewables}
                            onChange={e => setRenewables(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-green-500"
                            disabled={gameOver}
                        />
                    </div>
                </div>

                {/* Policy Toggles */}
                <div className="space-y-2 mb-6">
                    <div className="text-[10px] font-bold text-gray-500 uppercase">{t('climate.policy')}</div>
                    <div className="flex justify-between space-x-2">
                        {[1, 2, 3].map(p => (
                            <button
                                key={p}
                                onClick={() => setPolicies(p === policies ? 0 : p)}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase border transition-all flex flex-col items-center justify-center ${policies >= p
                                        ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_#2563eb]'
                                        : 'bg-gray-900 border-gray-700 text-gray-500 hover:bg-gray-800'
                                    }`}
                                disabled={gameOver}
                            >
                                {p === 1 ? t('climate.tax') : p === 2 ? t('climate.reforest') : t('climate.geoeng')}
                            </button>
                        ))}
                    </div>
                </div>

                {gameOver && (
                    <div className="animate-in slide-in-from-bottom absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-6 z-50 rounded-t-3xl">
                        <div className={`text-center p-6 rounded-2xl border w-full max-w-xs mb-6 ${temp < 2.0 ? 'bg-green-900/20 border-green-500' : 'bg-red-900/20 border-red-500'}`}>
                            <div className="text-3xl mb-2">{temp < 2.0 ? '🌍' : '🔥'}</div>
                            <div className={`text-2xl font-black uppercase italic mb-1 ${temp < 2.0 ? 'text-green-400' : 'text-red-500'}`}>
                                {temp < 2.0 ? t('climate.stabilized') : t('climate.collapse')}
                            </div>
                            <p className="text-xs text-gray-300 font-mono">
                                {t('climate.final_temp')}: +{temp.toFixed(2)}{t('games.climatetimemachine.c')}<br />
                                {t('games.climatetimemachine.year')}{year}
                            </p>
                        </div>
                        <Button fullWidth variant="primary" onClick={() => onComplete(temp < 2.0 ? 100 : 50)}>
                            {t('climate.submit')}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
