
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { TrendingUp, TrendingDown, DollarSign, Zap, Activity, Brain, AlertTriangle, Lock, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Language } from '../../types';

interface WallStreetWarProps {
    onComplete: (score: number) => void;
    t: (key: string) => string;
    language?: Language;
}

const EVENTS = [
    { name: "ELON TWEET", impact: 1.5, duration: 20 },
    { name: "FED HIKE", impact: -1.5, duration: 20 },
    { name: "AI BREAKTHROUGH", impact: 2.0, duration: 15 },
    { name: "FLASH CRASH", impact: -3.0, duration: 5 },
    { name: "INSIDER LEAK", impact: 1.0, duration: 10 },
];

export const WallStreetWar: React.FC<WallStreetWarProps> = ({ onComplete, t }) => {
    const [cash, setCash] = useState(1000);
    const [position, setPosition] = useState(0); // Positive = Long, Negative = Short
    const [timeLeft, setTimeLeft] = useState(60);
    const [candles, setCandles] = useState<{ t: number, open: number, close: number, high: number, low: number }[]>([]);
    const [currentPrice, setCurrentPrice] = useState(100);
    const [sentiment, setSentiment] = useState(0);
    const [activeEvent, setActiveEvent] = useState<{ name: string, impact: number, time: number } | null>(null);
    const [insiderIntel, setInsiderIntel] = useState<string | null>(null);

    // Refs
    const priceRef = useRef(100);
    const candleRef = useRef({ open: 100, high: 100, low: 100, close: 100 });
    const tickCount = useRef(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 0) {
                    clearInterval(interval);
                    return 0;
                }
                return t - 1;
            });

            // Event Spawner
            if (!activeEvent && Math.random() > 0.85) {
                const evt = EVENTS[Math.floor(Math.random() * EVENTS.length)];
                setActiveEvent({ ...evt, time: evt.duration });
                audio.playScan();
            }

            if (activeEvent) {
                setActiveEvent(prev => {
                    if (!prev || prev.time <= 0) return null;
                    return { ...prev, time: prev.time - 1 };
                });
            }
        }, 1000);

        // Market Ticker
        const tick = setInterval(() => {
            // Price Move
            let change = (Math.random() - 0.5) * 2;
            setSentiment(s => Math.max(-1, Math.min(1, s + (Math.random() - 0.5) * 0.1)));
            change += sentiment;
            if (activeEvent) change += activeEvent.impact;

            priceRef.current = Math.max(10, priceRef.current + change);
            setCurrentPrice(priceRef.current);

            // Candle Logic
            candleRef.current.high = Math.max(candleRef.current.high, priceRef.current);
            candleRef.current.low = Math.min(candleRef.current.low, priceRef.current);
            candleRef.current.close = priceRef.current;

            tickCount.current++;
            if (tickCount.current >= 10) { // New candle every 10 ticks (1s)
                setCandles(prev => {
                    const newCandles = [...prev, { ...candleRef.current, t: Date.now() }];
                    if (newCandles.length > 30) newCandles.shift();
                    return newCandles;
                });
                candleRef.current = { open: priceRef.current, high: priceRef.current, low: priceRef.current, close: priceRef.current };
                tickCount.current = 0;
            }

        }, 100);

        return () => {
            clearInterval(interval);
            clearInterval(tick);
        };
    }, [activeEvent, sentiment]);

    const handleBuy = () => {
        // If short, cover first. If long/neutral, buy more.
        if (position < 0) {
            // Covering short
            const cost = Math.abs(position) * currentPrice;
            setCash(c => c - cost); // You pay to buy back
            setPosition(0);
            audio.playClick();
        } else {
            // Buying long
            if (cash >= currentPrice) {
                setCash(c => c - currentPrice);
                setPosition(p => p + 1);
                audio.playClick();
            } else {
                audio.playError();
            }
        }
    };

    const handleSell = () => {
        // If long, sell. If neutral/short, go short.
        if (position > 0) {
            // Selling long
            setCash(c => c + currentPrice);
            setPosition(p => p - 1);
            audio.playClick();
        } else {
            // Going short (Borrow and sell)
            // We get cash now, owe stock later
            // Limit shorting to roughly cash value as collateral
            if (cash + (position * currentPrice) > 0) { // Simple margin check
                setCash(c => c + currentPrice);
                setPosition(p => p - 1);
                audio.playClick();
            } else {
                audio.playError();
            }
        }
    };

    const buyIntel = () => {
        if (cash >= 200) {
            setCash(c => c - 200);
            const prediction = Math.random() > 0.5 ? "BULLISH SPIKE INCOMING" : "BEARISH CRASH IMMINENT";
            setInsiderIntel(prediction);
            // Influence market to match intel (self-fulfilling prophecy game mechanic)
            if (prediction.includes("BULLISH")) setSentiment(1);
            else setSentiment(-1);
            setTimeout(() => setInsiderIntel(null), 5000);
            audio.playSuccess();
        }
    };

    // Total Equity = Cash + (Shares * Price)
    // If Short (negative shares), (Shares * Price) subtracts from cash effectively as liability
    const getTotalEquity = () => cash + (position * currentPrice);

    if (timeLeft <= 0) {
        const equity = getTotalEquity();
        const profit = equity - 1000;
        const score = Math.min(100, Math.max(0, 50 + (profit / 20)));

        return (
            <div className="h-full flex flex-col items-center justify-center bg-black p-8 text-center font-mono animate-in zoom-in">
                <TrendingUp size={64} className={profit > 0 ? "text-green-500" : "text-red-500"} />
                <h1 className="text-4xl font-black text-white mt-4 mb-2">{t('wallstreet.closed')}</h1>

                <div className="bg-gray-900 p-6 rounded-xl border border-white/10 w-full max-w-xs mb-8 shadow-2xl">
                    <div className="flex justify-between mb-4 border-b border-gray-700 pb-2">
                        <span className="text-xs text-gray-500 uppercase">{t('wallstreet.final_pl')}</span>
                        <span className={`text-2xl font-black ${profit >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                            {profit >= 0 ? '+' : ''}{profit.toFixed(2)}
                        </span>
                    </div>
                    <Button variant="primary" onClick={() => onComplete(score)} size="lg" fullWidth>{t('wallstreet.file_report')}</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-gray-950 font-mono overflow-hidden relative select-none">
            {/* Ticker (Retro LED Style) */}
            <div className="bg-black border-b border-gray-800 h-10 flex items-center overflow-hidden whitespace-nowrap relative z-10 font-mono shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                <div className="absolute inset-0 z-20 bg-[linear-gradient(rgba(18,18,18,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none"></div>
                <div className="animate-marquee text-sm font-bold flex space-x-12 text-gray-400 opacity-90 tracking-widest leading-none py-2">
                    <span className="text-white drop-shadow-[0_0_5px_white]">{t('games.wallstreetwar.nas')}<span className={currentPrice > 100 ? "text-green-500" : "text-red-500"}>{currentPrice.toFixed(2)}</span></span>
                    <span className="flex items-center text-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]">{t('games.wallstreetwar.btc')}<TrendingUp size={12} className="mx-1" /> +2.4%</span>
                    <span className="flex items-center text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">{t('games.wallstreetwar.eth')}<TrendingDown size={12} className="mx-1" /> -1.2%</span>
                    <span className="text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]">{t('games.wallstreetwar.gold_1950_20')}</span>
                    <span className="text-purple-400">{t('games.wallstreetwar.vix')}<span className="animate-pulse">18.5</span></span>
                    <span className="text-cyan-400">{t('games.wallstreetwar.yok')}<span className="animate-pulse text-white">42.00</span></span>
                </div>
            </div>

            <div className="flex-1 p-4 flex flex-col bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-900/90 p-4 rounded-xl border border-gray-800 shadow-xl backdrop-blur-sm relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-bold flex items-center justify-between">
                            {t('wallstreet.liquid_cash')} <Lock size={10} className="text-gray-600" />
                        </div>
                        <div className="text-3xl font-black text-green-400 flex items-center tracking-tighter drop-shadow-sm">
                            <DollarSign size={24} className="mr-1 text-green-600" /> {cash.toFixed(0)}
                        </div>
                    </div>
                    <div className="bg-gray-900/90 p-4 rounded-xl border border-gray-800 shadow-xl backdrop-blur-sm relative overflow-hidden">
                        <div className={`absolute inset-0 bg-gradient-to-br transition-opacity duration-500 opacity-20 ${getTotalEquity() > 1000 ? 'from-green-500 to-transparent' : 'from-red-500 to-transparent'}`}></div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-bold">{t('wallstreet.net_liquid')}</div>
                        <div className="text-3xl font-black text-white tracking-tighter drop-shadow-md relative z-10">
                            ${getTotalEquity().toFixed(0)}
                        </div>
                        {position !== 0 && (
                            <div className={`absolute right-3 top-3 px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider shadow-lg ${position > 0 ? 'bg-green-950 border-green-500 text-green-400' : 'bg-red-950 border-red-500 text-red-400'}`}>
                                {position > 0 ? 'LONG' : 'SHORT'} {Math.abs(position)}x
                            </div>
                        )}
                    </div>
                </div>

                {/* Chart */}
                <div className="flex-1 bg-gray-950 rounded-xl border-2 border-gray-800 relative overflow-hidden mb-4 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]">
                    {/* Chart Header */}
                    <div className="absolute top-4 left-4 z-10">
                        <div className="flex items-baseline space-x-2">
                            <div className="text-4xl font-black text-white tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                                ${currentPrice.toFixed(2)}
                            </div>
                            <div className={`text-sm font-bold ${sentiment > 0.1 ? 'text-green-500' : sentiment < -0.1 ? 'text-red-500' : 'text-gray-500'}`}>
                                {sentiment > 0.1 ? '▲ BULLISH' : sentiment < -0.1 ? '▼ BEARISH' : '● NEUTRAL'}
                            </div>
                        </div>
                        {insiderIntel && (
                            <div className="text-xs font-black text-yellow-400 animate-pulse bg-yellow-950/80 px-3 py-1.5 rounded-lg mt-2 border border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)] inline-flex items-center">
                                <Zap size={12} className="mr-2 fill-yellow-400" /> {t('games.wallstreetwar.insider')}{insiderIntel}
                            </div>
                        )}
                    </div>

                    {activeEvent && (
                        <div className="absolute top-4 right-4 z-10 bg-red-950/90 border-2 border-red-500 text-red-100 px-4 py-2 rounded-lg animate-bounce shadow-[0_0_30px_rgba(239,68,68,0.4)]">
                            <div className="text-xs font-black uppercase flex items-center tracking-wider">
                                <AlertTriangle size={14} className="mr-2" /> {t('games.wallstreetwar.markets_roiled')}{activeEvent.name}
                            </div>
                        </div>
                    )}

                    {/* Candlestick Visualization */}
                    <div className="absolute inset-x-0 bottom-8 h-[80%] flex items-end justify-end px-4 space-x-[2px] opacity-90">
                        {candles.map((c, i) => {
                            const isGreen = c.close >= c.open;
                            const height = Math.max(2, Math.abs(c.close - c.open) * 3);
                            const y = (Math.min(c.open, c.close) - 50) * 3;
                            const wickHeight = (c.high - c.low) * 3;
                            const wickY = (c.low - 50) * 3;

                            return (
                                <div key={i} className="relative w-4 h-[300px] group flex justify-center hover:opacity-100 transition-opacity">
                                    {/* Wick */}
                                    <div className={`absolute w-[1px] ${isGreen ? 'bg-green-500' : 'bg-red-500'}`} style={{ height: `${wickHeight}px`, bottom: `${wickY}px` }}></div>
                                    {/* Body */}
                                    <div
                                        className={`absolute w-full rounded-[1px] ${isGreen ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]'}`}
                                        style={{ height: `${height}px`, bottom: `${y}px` }}
                                    ></div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Grid */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:40px_40px] pointer-events-none"></div>
                    <div className="absolute bottom-0 w-full h-8 bg-gradient-to-t from-gray-900 to-transparent"></div>
                </div>

                {/* Controls */}
                <div className="space-y-3">
                    <Button fullWidth size="sm" variant="secondary" onClick={buyIntel} disabled={cash < 200} className="border-yellow-600 text-yellow-500 hover:bg-yellow-900/20">
                        <Lock size={14} className="mr-2" /> {t('wallstreet.buy_intel')}
                    </Button>

                    <div className="grid grid-cols-2 gap-4 h-24">
                        <button
                            onClick={handleSell}
                            className="bg-red-600 hover:bg-red-500 active:scale-95 transition-all rounded-xl flex flex-col items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.4)] relative overflow-hidden group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                            <ArrowDownCircle size={32} className="text-white mb-1 group-hover:scale-110 transition-transform" />
                            <span className="text-white font-black uppercase text-lg">{t('wallstreet.short')}</span>
                        </button>
                        <button
                            onClick={handleBuy}
                            className="bg-green-600 hover:bg-green-500 active:scale-95 transition-all rounded-xl flex flex-col items-center justify-center shadow-[0_0_20px_rgba(22,163,74,0.4)] relative overflow-hidden group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                            <ArrowUpCircle size={32} className="text-white mb-1 group-hover:scale-110 transition-transform" />
                            <span className="text-white font-black uppercase text-lg">{t('wallstreet.long')}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
