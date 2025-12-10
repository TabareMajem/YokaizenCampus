
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

  useEffect(() => {
      const initB: Building[] = [];
      for(let row=0; row<3; row++) {
          for(let col=0; col<3; col++) {
              const i = row * 3 + col;
              initB.push({
                  id: i,
                  type: i % 3 === 0 ? 'INDUSTRIAL' : i % 2 === 0 ? 'COMMERCIAL' : 'RESIDENTIAL',
                  load: 20,
                  status: 'OK',
                  x: 0, y: 0
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

              if (Math.random() > 0.98 && b.status === 'OK') {
                  audio.playError();
                  return { ...b, status: 'SURGE', load: 100 };
              }
              if (b.status === 'SURGE' && Math.random() > 0.85) {
                  return { ...b, status: 'BLACKOUT', load: 0 };
              }

              const newLoad = b.status === 'SURGE' ? 100 : b.load + (targetLoad - b.load) * 0.2;
              return { ...b, load: newLoad };
          }));

          setUsedPower(prev => {
              const usage = buildings.reduce((acc, b) => acc + b.load, 0);
              if (usage > totalPower) {
                  setBuildings(bs => {
                      const idx = Math.floor(Math.random() * bs.length);
                      const next = [...bs];
                      if(next[idx].status !== 'BLACKOUT') next[idx].status = 'BLACKOUT';
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

  useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const render = () => {
          setEnergyPulse(p => p + 0.05);
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          const centerX = w / 2;
          const centerY = h + 100;

          buildings.forEach(b => {
              const col = b.id % 3;
              const row = Math.floor(b.id / 3);
              const x = (w/2) + (col - 1) * 80 + (row - 1) * 40; 
              const y = (h/2) + (row - 1) * 80 - 50;
              
              if (b.status === 'BLACKOUT') return;

              ctx.beginPath();
              ctx.moveTo(centerX, centerY);
              ctx.lineTo(x, y);
              
              const color = b.status === 'SURGE' ? '#ef4444' : b.load > 80 ? '#f59e0b' : '#10b981';
              ctx.strokeStyle = color;
              ctx.lineWidth = b.load / 20;
              ctx.globalAlpha = 0.3;
              ctx.stroke();

              const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
              const t = (performance.now() / 1000) * 2; 
              const offset = (t * 100) % dist;
              const ratio = offset / dist;
              
              const px = centerX + (x - centerX) * ratio;
              const py = centerY + (y - centerY) * ratio;

              ctx.beginPath();
              ctx.arc(px, py, 3, 0, Math.PI * 2);
              ctx.fillStyle = '#ffffff';
              ctx.globalAlpha = 1;
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
            <div className="absolute top-10 right-10 w-24 h-24 bg-yellow-300 rounded-full blur-xl opacity-80"></div>
        </div>

        <div className="absolute inset-0 pointer-events-none z-10">
            <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} className="w-full h-full" />
        </div>

        <div className="relative z-20 p-4 pl-20 flex justify-between items-center bg-black/40 backdrop-blur-md border-b border-white/10 shadow-xl">
            <div className="flex items-center space-x-6">
                <div>
                    <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">{t('smartcity.time')}</div>
                    <div className="text-3xl font-black text-white flex items-center font-mono">
                        {isNight ? <Moon size={24} className="mr-2 text-purple-400"/> : <Sun size={24} className="mr-2 text-yellow-400"/>}
                        {timeOfDay.toString().padStart(2, '0')}:00
                    </div>
                </div>
                <div>
                    <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">{t('smartcity.grid_load')}</div>
                    <div className="flex items-end">
                        <span className={`text-2xl font-bold font-mono ${usedPower > totalPower ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
                            {Math.round(usedPower)}
                        </span>
                        <span className="text-xs text-gray-500 mb-1 ml-1">/ {totalPower} MW</span>
                    </div>
                </div>
            </div>
            <div className="text-right">
                <div className="text-[10px] text-gray-400 font-bold uppercase">{t('ui.score')}</div>
                <div className="text-3xl font-black text-white tracking-tighter">{score.toLocaleString()}</div>
            </div>
        </div>

        <div className="flex-1 relative flex items-center justify-center perspective-[1200px] overflow-hidden z-20">
            <div className="transform rotate-x-60 rotate-z-45 transition-transform duration-700 grid grid-cols-3 gap-8 p-10">
                {buildings.map(b => {
                    let height = 'h-24';
                    let baseColor = 'bg-slate-700';
                    let windowColor = isNight ? 'bg-yellow-100' : 'bg-sky-200';
                    
                    if (b.type === 'RESIDENTIAL') { height = 'h-32'; baseColor = 'bg-indigo-900'; }
                    if (b.type === 'COMMERCIAL') { height = 'h-48'; baseColor = 'bg-blue-900'; }
                    if (b.type === 'INDUSTRIAL') { height = 'h-28'; baseColor = 'bg-slate-800'; windowColor = 'bg-orange-400'; }

                    const isSurge = b.status === 'SURGE';
                    const isBlackout = b.status === 'BLACKOUT';

                    return (
                        <button
                            key={b.id}
                            onClick={() => fixSurge(b.id)}
                            className={`relative w-24 ${height} group transition-all duration-300 transform hover:-translate-y-4 active:scale-95 touch-manipulation`}
                            disabled={b.status === 'OK'}
                        >
                            <div className="absolute -bottom-4 left-0 right-0 h-4 bg-black/50 blur-md rounded-full transform scale-x-150"></div>

                            <div className={`absolute inset-0 border border-white/10 rounded-lg shadow-2xl overflow-hidden transition-all duration-300 ${
                                isBlackout ? 'bg-gray-900 border-gray-800 brightness-50' : 
                                isSurge ? 'bg-red-900 border-red-500 animate-shake shadow-[0_0_30px_red]' : 
                                baseColor
                            }`}>
                                {!isBlackout && (
                                    <div className="absolute inset-2 grid grid-cols-2 gap-2 opacity-80">
                                        {Array.from({ length: 8 }).map((_, w) => (
                                            <div 
                                                key={w} 
                                                className={`rounded-sm transition-colors duration-1000 ${
                                                    isSurge ? 'bg-red-500 animate-flash' :
                                                    b.load > 80 ? 'bg-yellow-300' : windowColor
                                                }`}
                                                style={{ opacity: isNight ? (Math.random() > 0.3 ? 1 : 0.2) : 0.6 }} 
                                            ></div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className={`absolute -top-12 left-1/2 -translate-x-1/2 transition-all duration-300 ${isSurge || isBlackout ? 'opacity-100 scale-110' : 'opacity-0 scale-0'}`}>
                                {isSurge && <div className="bg-red-600 text-white p-2 rounded-full shadow-lg border-2 border-white animate-bounce"><AlertTriangle size={24} /></div>}
                                {isBlackout && <div className="bg-gray-800 text-gray-400 p-2 rounded-full shadow-lg border-2 border-gray-600"><RefreshCw size={24} /></div>}
                            </div>

                            {!isBlackout && (
                                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-32 h-32 bg-gradient-to-t from-blue-500/20 to-transparent rounded-full blur-xl pointer-events-none transform scale-y-50" style={{ opacity: b.load / 100 }}></div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>

        <div className="relative z-30 p-4 bg-black/90 border-t border-white/10 flex justify-between items-center safe-area-pb">
            <div className="flex items-center text-xs text-gray-400 font-mono">
                <Activity className="mr-2 text-green-500 animate-pulse" size={16} />
                <span>GRID_STABILITY: {Math.max(0, 100 - (usedPower/totalPower)*50).toFixed(1)}%</span>
            </div>
            <div className="flex space-x-3">
                <Button size="sm" variant="secondary" onClick={() => setTotalPower(p => p + 200)} disabled={totalPower >= 3000} className="border-blue-500 text-blue-400 hover:bg-blue-900/20">
                    <BatteryCharging size={16} className="mr-2"/> +CAPACITY
                </Button>
            </div>
        </div>

        {gameOver && (
            <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center animate-in zoom-in p-8 text-center">
                <h2 className="text-4xl font-black text-white mb-4 italic uppercase">{t('smartcity.shift_complete')}</h2>
                <div className="text-6xl mb-6">🏙️⚡</div>
                <div className="bg-gray-900 border border-white/10 p-6 rounded-xl w-full max-w-sm mb-8">
                    <div className="flex justify-between mb-2 text-gray-400 uppercase text-xs font-bold"><span>Total Score</span><span>{score}</span></div>
                    <div className="flex justify-between text-gray-400 uppercase text-xs font-bold"><span>Days Survived</span><span>{day}</span></div>
                </div>
                <Button size="lg" variant="primary" onClick={() => onComplete(100)} className="w-full max-w-xs">{t('smartcity.submit_logs')}</Button>
            </div>
        )}
    </div>
  );
};
