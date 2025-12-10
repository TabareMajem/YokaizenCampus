
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
  const [candles, setCandles] = useState<{t: number, open: number, close: number, high: number, low: number}[]>([]);
  const [currentPrice, setCurrentPrice] = useState(100);
  const [sentiment, setSentiment] = useState(0); 
  const [activeEvent, setActiveEvent] = useState<{name: string, impact: number, time: number} | null>(null);
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
        {/* Ticker */}
        <div className="bg-black border-b border-gray-800 h-8 flex items-center overflow-hidden whitespace-nowrap relative z-10">
            <div className="animate-marquee text-[10px] font-bold flex space-x-8 text-gray-400">
                <span>NAS: {currentPrice.toFixed(2)}</span>
                <span className="text-green-500">BTC: +2.4%</span>
                <span className="text-red-500">ETH: -1.2%</span>
                <span>GOLD: 1950.20</span>
                <span>VIX: 18.5</span>
            </div>
        </div>

        <div className="flex-1 p-4 flex flex-col">
            
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-900 p-3 rounded-xl border border-gray-800 shadow-lg">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('wallstreet.liquid_cash')}</div>
                    <div className="text-2xl font-black text-green-400 flex items-center">
                        <DollarSign size={20} /> {cash.toFixed(0)}
                    </div>
                </div>
                <div className="bg-gray-900 p-3 rounded-xl border border-gray-800 shadow-lg relative overflow-hidden">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t('wallstreet.net_liquid')}</div>
                    <div className="text-2xl font-black text-white">
                        ${getTotalEquity().toFixed(0)}
                    </div>
                    {position !== 0 && (
                        <div className={`absolute right-2 top-2 px-2 py-1 rounded text-[10px] font-bold ${position > 0 ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                            {position > 0 ? t('wallstreet.long_pos') : t('wallstreet.short_pos')} {Math.abs(position)}
                        </div>
                    )}
                </div>
            </div>

            {/* Chart */}
            <div className="flex-1 bg-black rounded-xl border-2 border-gray-800 relative overflow-hidden mb-4 shadow-inner">
                <div className="absolute top-4 left-4 z-10">
                    <div className="text-3xl font-black text-white tracking-tighter">
                        ${currentPrice.toFixed(2)}
                    </div>
                    {insiderIntel && (
                        <div className="text-xs font-bold text-yellow-400 animate-pulse bg-yellow-900/20 px-2 py-1 rounded mt-1 border border-yellow-500">
                            INTEL: {insiderIntel}
                        </div>
                    )}
                </div>

                {activeEvent && (
                    <div className="absolute top-4 right-4 z-10 bg-red-500/20 border border-red-500 text-red-100 px-3 py-1 rounded animate-pulse">
                        <div className="text-[10px] font-bold uppercase flex items-center">
                            <AlertTriangle size={10} className="mr-1"/> {activeEvent.name}
                        </div>
                    </div>
                )}

                {/* Candlestick Visualization */}
                <div className="absolute inset-0 flex items-end justify-end p-4 space-x-1">
                    {candles.map((c, i) => {
                        const isGreen = c.close >= c.open;
                        const height = Math.max(2, Math.abs(c.close - c.open) * 2); 
                        const y = (Math.min(c.open, c.close) - 50) * 2; // Normalize approximate
                        const wickHeight = (c.high - c.low) * 2;
                        const wickY = (c.low - 50) * 2;
                        
                        return (
                            <div key={i} className="relative w-3 h-full group">
                                {/* Wick */}
                                <div className={`absolute w-0.5 left-1.5 ${isGreen ? 'bg-green-500' : 'bg-red-500'}`} style={{ height: `${wickHeight}px`, bottom: `${wickY}px` }}></div>
                                {/* Body */}
                                <div className={`absolute w-3 ${isGreen ? 'bg-green-500' : 'bg-red-500'}`} style={{ height: `${height}px`, bottom: `${y}px` }}></div>
                            </div>
                        );
                    })}
                </div>
                
                {/* Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:40px_40px] pointer-events-none"></div>
            </div>

            {/* Controls */}
            <div className="space-y-3">
                <Button fullWidth size="sm" variant="secondary" onClick={buyIntel} disabled={cash < 200} className="border-yellow-600 text-yellow-500 hover:bg-yellow-900/20">
                    <Lock size={14} className="mr-2"/> {t('wallstreet.buy_intel')}
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
