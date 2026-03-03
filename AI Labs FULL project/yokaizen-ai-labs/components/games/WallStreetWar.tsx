import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Cylinder, Float, Text, Trail, Sparkles, Html, Line } from '@react-three/drei';
import { EffectComposer, Bloom, Glitch, Scanline } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Activity, TrendingUp, TrendingDown, DollarSign, Zap, AlertOctagon, BarChart2 } from 'lucide-react';
import { audio } from '../../services/audioService';
import { motion, AnimatePresence } from 'framer-motion';

export interface WallStreetWarProps {
    onComplete: (score: number, metrics?: any) => void;
    difficulty: string;
    t: (key: string) => string;
}

// Data Types
interface Ticker {
    symbol: string;
    price: number;
    history: number[];
    volatility: number;
    trend: number;
    color: string;
}

interface Trade {
    id: string;
    symbol: string;
    type: 'BUY' | 'SELL';
    price: number;
    amount: number;
    profit?: number;
}

const INITIAL_FUNDS = 10000;
const MAX_HISTORY = 40;

// 3D Data Stream visualization
const DataStream = ({ tickers }: { tickers: Ticker[] }) => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.position.z = (state.clock.elapsedTime * 2) % 2; // Moving forward effect
        }
    });

    return (
        <group ref={groupRef} position={[0, -2, -10]}>
            {tickers.map((ticker, i) => {
                const xPos = (i - 1.5) * 4;

                // Create line points from history
                const points = ticker.history.map((val, idx) => {
                    const normalizedVal = (val - 100) * 0.05; // Base 100 roughly
                    return new THREE.Vector3(xPos, normalizedVal, -idx * 0.5);
                });

                if (points.length < 2) return null;

                return (
                    <group key={ticker.symbol}>
                        {/* The trend line */}
                        <Line
                            points={points}
                            color={ticker.color}
                            lineWidth={3}
                            dashed={false}
                        />

                        {/* Current price indicator node */}
                        <mesh position={points[0]}>
                            <sphereGeometry args={[0.2, 16, 16]} />
                            <meshStandardMaterial color={ticker.color} emissive={ticker.color} emissiveIntensity={2} />
                        </mesh>

                        {/* Faux Data Particles streaming along the line */}
                        <Sparkles
                            count={30}
                            scale={[1, 1, 20]}
                            position={[xPos, points[0].y, -10]}
                            size={2}
                            speed={2}
                            opacity={0.5}
                            color={ticker.color}
                        />
                    </group>
                );
            })}
        </group>
    );
};

export const WallStreetWar: React.FC<WallStreetWarProps> = ({ onComplete, difficulty, t }) => {
    const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'SUCCESS' | 'FAILED'>('IDLE');
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);

    // Trading State
    const [funds, setFunds] = useState(INITIAL_FUNDS);
    const [portfolio, setPortfolio] = useState<Record<string, number>>({ 'NRO': 0, 'QNT': 0, 'SYN': 0, 'AYI': 0 });
    const [activeTrades, setActiveTrades] = useState<Trade[]>([]);
    const [flashCrashWarning, setFlashCrashWarning] = useState(false);

    // Market Data
    const [tickers, setTickers] = useState<Ticker[]>([
        { symbol: 'NRO', price: 150, history: Array(MAX_HISTORY).fill(150), volatility: 2.5, trend: 1, color: '#3b82f6' },
        { symbol: 'QNT', price: 80, history: Array(MAX_HISTORY).fill(80), volatility: 4.0, trend: -0.5, color: '#8b5cf6' },
        { symbol: 'SYN', price: 210, history: Array(MAX_HISTORY).fill(210), volatility: 1.5, trend: 0.2, color: '#10b981' },
        { symbol: 'AYI', price: 45, history: Array(MAX_HISTORY).fill(45), volatility: 6.0, trend: 0, color: '#f59e0b' },
    ]);

    const startGame = () => {
        setFunds(INITIAL_FUNDS);
        setPortfolio({ 'NRO': 0, 'QNT': 0, 'SYN': 0, 'AYI': 0 });
        setScore(0);
        setTimeLeft(difficulty === 'Elite' ? 45 : 60);
        setActiveTrades([]);
        setGameState('PLAYING');
        audio.playSystemMessage({ type: 'success' });
    };

    // Market Simulation Engine
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        const tickRate = difficulty === 'Elite' ? 300 : 500; // ms per tick

        const marketInterval = setInterval(() => {
            setTickers(prevTickers => {
                const isFlashCrash = Math.random() < 0.05; // 5% chance of crash/spike event per tick globally

                if (isFlashCrash) {
                    setFlashCrashWarning(true);
                    audio.playSystemMessage({ type: 'warning' });
                    setTimeout(() => setFlashCrashWarning(false), 1000);
                }

                return prevTickers.map(t => {
                    // Random walk with drift
                    let changePercent = (Math.random() - 0.5) * t.volatility;
                    changePercent += t.trend * 0.1; // Apply slight trend

                    if (isFlashCrash) {
                        // Massive swing event
                        changePercent += (Math.random() > 0.5 ? 1 : -1) * t.volatility * 5;
                    }

                    let newPrice = t.price * (1 + changePercent / 100);
                    newPrice = Math.max(1, newPrice); // Don't go below 1

                    // Update trailing history
                    const newHistory = [newPrice, ...t.history.slice(0, MAX_HISTORY - 1)];

                    // Slight mean reversion for trend over time
                    const newTrend = t.trend + (Math.random() - 0.5) * 0.05;

                    return { ...t, price: newPrice, history: newHistory, trend: newTrend };
                });
            });
        }, tickRate);

        return () => clearInterval(marketInterval);
    }, [gameState, difficulty]);


    // Timer Loop
    useEffect(() => {
        if (gameState !== 'PLAYING') return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    endGame();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, funds, portfolio, tickers]);

    const calculateNetWorth = () => {
        let nw = funds;
        tickers.forEach(t => {
            nw += portfolio[t.symbol] * t.price;
        });
        return nw;
    };

    const endGame = () => {
        const finalNetWorth = calculateNetWorth();
        const profit = finalNetWorth - INITIAL_FUNDS;

        const isWin = profit >= 5000; // Require 50% profit to "win" the sim

        setScore(profit > 0 ? Math.floor(profit / 10) : 0);
        setGameState(isWin ? 'SUCCESS' : 'FAILED');
        setTimeout(() => onComplete(profit > 0 ? Math.floor(profit / 10) : 0, { netWorth: finalNetWorth, profit }), 3000);
    };

    const executeTrade = (symbol: string, type: 'BUY' | 'SELL') => {
        if (gameState !== 'PLAYING') return;

        const ticker = tickers.find(t => t.symbol === symbol);
        if (!ticker) return;

        const amount = 10; // Fixed block size for simplicity in this fast game
        const cost = ticker.price * amount;

        if (type === 'BUY') {
            if (funds >= cost) {
                audio.playClick();
                setFunds(f => f - cost);
                setPortfolio(p => ({ ...p, [symbol]: p[symbol] + amount }));
                addTradeLog({ id: Math.random().toString(), symbol, type, price: ticker.price, amount });
            } else {
                audio.playError();
            }
        } else {
            if (portfolio[symbol] >= amount) {
                audio.playClick(); // Maybe a different sound for sell
                setFunds(f => f + cost);
                setPortfolio(p => ({ ...p, [symbol]: p[symbol] - amount }));

                // Logic to calculate if this specific sale was profitable vs avg cost would go here
                // For now, simplistically log it
                addTradeLog({ id: Math.random().toString(), symbol, type, price: ticker.price, amount });
            } else {
                audio.playError();
            }
        }
    };

    const addTradeLog = (trade: Trade) => {
        setActiveTrades(prev => [trade, ...prev].slice(0, 5)); // Keep last 5
    };

    const netWorth = calculateNetWorth();
    const isProfitable = netWorth > INITIAL_FUNDS;

    return (
        <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 font-sans select-none shadow-[0_0_60px_rgba(0,0,0,0.8)]">

            {/* 3D Canvas Background */}
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 5, 12], fov: 50 }}>
                    <ambientLight intensity={0.2} color="#ffffff" />
                    <pointLight position={[0, 10, 0]} intensity={2} color="#ffffff" />

                    {/* Grid floor */}
                    <gridHelper args={[50, 50, '#333333', '#111111']} position={[0, -5, 0]} />

                    {gameState !== 'IDLE' && <DataStream tickers={tickers} />}

                    <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} maxPolarAngle={Math.PI / 2 - 0.1} />

                    <EffectComposer>
                        <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} />
                        <Scanline density={100} opacity={0.1} blendFunction={BlendFunction.OVERLAY} />
                        {flashCrashWarning && (
                            <Glitch delay={new THREE.Vector2(0, 0)} duration={new THREE.Vector2(0.1, 0.3)} active ratio={0.8} />
                        )}
                    </EffectComposer>
                </Canvas>
            </div>

            {/* UI Overlay */}
            {gameState !== 'IDLE' && (
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between p-6 z-10">

                    {/* Top HUD: Portfolio & Timer */}
                    <div className="flex justify-between items-start gap-4">

                        <div className="bg-black/80 backdrop-blur-xl rounded-xl p-4 border border-zinc-700 shadow-2xl flex gap-6">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-1">Net Worth</span>
                                <div className="flex items-center gap-2">
                                    <DollarSign className={`w-5 h-5 ${isProfitable ? 'text-emerald-500' : 'text-red-500'}`} />
                                    <span className={`text-3xl font-mono font-black ${isProfitable ? 'text-white' : 'text-red-500'}`}>
                                        {netWorth.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                    </span>
                                </div>
                            </div>
                            <div className="w-px h-12 bg-zinc-800" />
                            <div className="flex flex-col">
                                <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-1">Liquid Funds</span>
                                <span className="text-xl font-mono font-bold text-zinc-300">${Math.floor(funds).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="bg-black/80 backdrop-blur-xl rounded-xl p-4 border border-zinc-700 flex flex-col items-end shadow-2xl">
                            <div className="flex items-center gap-2 text-zinc-400 mb-1">
                                <AlertOctagon className="w-4 h-4" />
                                <span className="text-[10px] uppercase tracking-widest font-bold">Market Close</span>
                            </div>
                            <div className={`text-4xl font-mono ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                                0:{timeLeft.toString().padStart(2, '0')}
                            </div>
                        </div>
                    </div>

                    {flashCrashWarning && (
                        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-600/90 text-white font-black uppercase tracking-[0.3em] px-8 py-2 rounded-full border-2 border-red-400 animate-pulse text-xl drop-shadow-[0_0_20px_rgba(220,38,38,1)]">
                            VOLATILITY SPIKE DETECTED
                        </div>
                    )}

                    {/* Middle: Trade History Overlay (Subtle) */}
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-60">
                        {activeTrades.map(trade => (
                            <div key={trade.id} className="text-xs font-mono bg-black/50 px-2 py-1 rounded border border-zinc-800 flex items-center gap-2">
                                <span className={trade.type === 'BUY' ? 'text-blue-400' : 'text-red-400'}>{trade.type}</span>
                                <span className="text-white">{trade.amount} {trade.symbol}</span>
                                <span className="text-zinc-500">@ ${trade.price.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>

                    {/* Bottom HUD: Trading Terminal */}
                    <div className="w-full pointer-events-auto">
                        <div className="bg-black/90 backdrop-blur-2xl rounded-2xl p-4 border border-zinc-700 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-4 border-b border-zinc-800 pb-2">
                                <BarChart2 className="w-4 h-4" /> HFT Execution Terminal v9.2
                            </div>

                            <div className="grid grid-cols-4 gap-4">
                                {tickers.map(ticker => {
                                    const pnlColor = ticker.trend >= 0 ? 'text-emerald-400' : 'text-red-400';
                                    const PnlIcon = ticker.trend >= 0 ? TrendingUp : TrendingDown;
                                    const qtyOwned = portfolio[ticker.symbol];

                                    return (
                                        <div key={ticker.symbol} className="bg-zinc-900/50 rounded-xl p-3 border border-zinc-800 flex flex-col relative overflow-hidden group">
                                            {/* Accent banner */}
                                            <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: ticker.color }} />

                                            <div className="flex justify-between items-start mb-2 mt-1">
                                                <span className="text-lg font-black tracking-wider text-white">{ticker.symbol}</span>
                                                <div className={`flex items-center gap-1 text-xs font-bold ${pnlColor}`}>
                                                    <PnlIcon className="w-3 h-3" />
                                                    {(Math.abs(ticker.trend) * 10).toFixed(1)}%
                                                </div>
                                            </div>

                                            <div className="text-2xl font-mono text-white mb-1">
                                                ${ticker.price.toFixed(2)}
                                            </div>

                                            <div className="text-xs text-zinc-500 font-mono mb-4">
                                                POS: <span className={qtyOwned > 0 ? 'text-white font-bold' : ''}>{qtyOwned} units</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 mt-auto">
                                                <button
                                                    onClick={() => executeTrade(ticker.symbol, 'SELL')}
                                                    disabled={qtyOwned < 10}
                                                    className="bg-red-500/20 hover:bg-red-500/40 text-red-200 border border-red-500/30 py-2 rounded font-bold text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    SELL 10
                                                </button>
                                                <button
                                                    onClick={() => executeTrade(ticker.symbol, 'BUY')}
                                                    disabled={funds < ticker.price * 10}
                                                    className="bg-blue-500/20 hover:bg-blue-500/40 text-blue-200 border border-blue-500/30 py-2 rounded font-bold text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    BUY 10
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Start/End Screen Overlays */}
            <AnimatePresence>
                {gameState === 'IDLE' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/90 p-8 text-center backdrop-blur-xl">
                        <div className="max-w-md border border-zinc-800 p-10 rounded-3xl bg-black shadow-2xl">
                            <Activity className="w-16 h-16 text-blue-500 mx-auto mb-6" />
                            <h2 className="text-3xl font-black text-white mb-4 tracking-widest uppercase">Wall Street War</h2>
                            <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                                High-Frequency Trading algorithmic override required.<br /><br />
                                <span className="text-white font-bold">Goal:</span> Generate $5,000 profit before the market closes.<br />
                                <span className="text-red-400 font-bold">Warning:</span> Markets are highly volatile. Flash crashes are imminent. Buy low, sell high.
                            </p>
                            <button onClick={startGame} className="w-full py-4 bg-zinc-100 hover:bg-white text-black font-black uppercase tracking-widest rounded-xl transition-colors shadow-lg shadow-white/10">
                                Open Terminal
                            </button>
                        </div>
                    </motion.div>
                )}

                {gameState === 'SUCCESS' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-emerald-950/90 backdrop-blur-xl border-8 border-emerald-900">
                        <TrendingUp className="w-24 h-24 text-emerald-400 mb-6 drop-shadow-[0_0_30px_rgba(52,211,153,0.5)]" />
                        <h2 className="text-5xl font-black text-white mb-4 tracking-widest uppercase">Target Reached</h2>
                        <p className="text-emerald-200 text-xl font-mono mb-8 opacity-90 uppercase tracking-widest">Alpha Generated.</p>
                        <div className="text-emerald-400 text-4xl font-black font-mono bg-black/50 px-8 py-4 rounded-xl border border-emerald-900">
                            +${(calculateNetWorth() - INITIAL_FUNDS).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                    </motion.div>
                )}

                {gameState === 'FAILED' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-xl">
                        <TrendingDown className="w-24 h-24 text-red-500 mb-6 opacity-80" />
                        <h2 className="text-5xl font-black text-white mb-4 tracking-widest uppercase">Margin Call</h2>
                        <p className="text-zinc-400 text-xl font-sans mb-8">Failed to meet profit targets.</p>
                        <div className="text-white text-3xl font-bold font-mono bg-black/50 px-8 py-4 rounded-xl border border-zinc-800 flex flex-col items-center gap-2">
                            <span>Net Worth: ${calculateNetWorth().toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            <span className="text-sm text-red-500 font-sans tracking-widest uppercase">Target was ${INITIAL_FUNDS + 5000}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};
