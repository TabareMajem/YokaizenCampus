
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Sliders, Play, RotateCcw, Trophy, Zap, Cpu, Target } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Language } from '../../types';

interface RewardFixerProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
}

const ROOM_WIDTH = 300;
const ROOM_HEIGHT = 300;

export const RewardFixer: React.FC<RewardFixerProps> = ({ onComplete, t }) => {
  const [speedWeight, setSpeedWeight] = useState(50); 
  const [safetyPenalty, setSafetyPenalty] = useState(50);
  const [simState, setSimState] = useState<'IDLE' | 'RUNNING' | 'COMPLETE'>('IDLE');
  const [score, setScore] = useState(0);
  
  const robotRef = useRef({ x: 150, y: 150, angle: 0, trail: [] as {x:number, y:number}[] });
  const targetsRef = useRef<{x:number, y:number, active:boolean}[]>([]);
  const hazardsRef = useRef<{x:number, y:number}[]>([]);
  const requestRef = useRef<number>(0);

  const [renderTrigger, setRenderTrigger] = useState(0);

  const reset = () => {
      setSimState('IDLE');
      setScore(0);
      robotRef.current = { x: 150, y: 150, angle: 0, trail: [] };
      
      const t = [];
      const h = [];
      for(let i=0; i<5; i++) t.push({ x: Math.random() * 280 + 10, y: Math.random() * 280 + 10, active: true });
      for(let i=0; i<3; i++) h.push({ x: Math.random() * 280 + 10, y: Math.random() * 280 + 10 });
      
      targetsRef.current = t;
      hazardsRef.current = h;
      setRenderTrigger(Math.random());
  };

  useEffect(() => { reset(); }, []);

  const runSim = () => {
      if(simState === 'RUNNING') return;
      setSimState('RUNNING');
      audio.playEngine(3000);

      const loop = () => {
          const r = robotRef.current;
          
          // Find target
          let target = null;
          let minD = Infinity;
          targetsRef.current.forEach(t => {
              if(!t.active) return;
              const d = Math.hypot(t.x - r.x, t.y - r.y);
              if(d < minD) { minD = d; target = t; }
          });

          if(!target) {
              setSimState('COMPLETE');
              onComplete(100);
              return;
          }

          // Move Logic
          let dx = target.x - r.x;
          let dy = target.y - r.y;
          
          // Avoidance
          hazardsRef.current.forEach(h => {
              const d = Math.hypot(h.x - r.x, h.y - r.y);
              if(d < 60) {
                  const push = (60 - d) / 60;
                  dx -= (h.x - r.x) * push * (safetyPenalty / 10);
                  dy -= (h.y - r.y) * push * (safetyPenalty / 10);
              }
          });

          const angle = Math.atan2(dy, dx);
          const speed = 2 + (speedWeight / 20);
          
          r.x += Math.cos(angle) * speed;
          r.y += Math.sin(angle) * speed;
          r.trail.push({x: r.x, y: r.y});
          if(r.trail.length > 20) r.trail.shift();

          // Collision
          targetsRef.current.forEach(t => {
              if(t.active && Math.hypot(t.x - r.x, t.y - r.y) < 15) {
                  t.active = false;
                  setScore(s => s + 100);
                  audio.playSuccess();
              }
          });

          hazardsRef.current.forEach(h => {
              if(Math.hypot(h.x - r.x, h.y - r.y) < 20) {
                  setScore(s => Math.max(0, s - 50));
                  audio.playError();
              }
          });

          setRenderTrigger(Math.random());
          requestRef.current = requestAnimationFrame(loop);
      };
      requestRef.current = requestAnimationFrame(loop);
  };

  return (
    <div className="h-full flex flex-col bg-gray-950 p-6 font-mono select-none">
        <div className="flex justify-between items-center mb-6">
            <div>
                <h2 className="text-xl font-black text-white flex items-center"><Cpu className="mr-2 text-blue-500"/> {t('reward.gym')}</h2>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest">{t('reward.episode')} #842</div>
            </div>
            <div className="text-3xl font-black text-green-400">{score}</div>
        </div>

        <div className="flex-1 relative bg-black rounded-2xl border-2 border-gray-800 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.1)_1px,transparent_1px)] bg-[length:30px_30px]"></div>
            
            {/* Robot Trail */}
            <svg className="absolute inset-0 pointer-events-none w-full h-full">
                <polyline points={robotRef.current.trail.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#3b82f6" strokeWidth="2" opacity="0.5" />
            </svg>

            {/* Entities */}
            {targetsRef.current.map((t, i) => t.active && (
                <div key={i} className="absolute w-4 h-4 bg-green-500 rounded-full shadow-[0_0_15px_#22c55e] animate-pulse" style={{ left: t.x-8, top: t.y-8 }}></div>
            ))}
            {hazardsRef.current.map((h, i) => (
                <div key={i} className="absolute w-8 h-8 border-2 border-red-500 rounded flex items-center justify-center text-red-500 font-bold" style={{ left: h.x-16, top: h.y-16 }}>X</div>
            ))}

            {/* Robot */}
            <div className="absolute w-6 h-6 bg-blue-500 rounded shadow-[0_0_20px_#3b82f6] z-10 transition-transform" 
                 style={{ left: robotRef.current.x-12, top: robotRef.current.y-12 }}></div>
        </div>

        <div className="mt-6 bg-gray-900 p-4 rounded-xl border border-gray-800">
            <div className="flex space-x-4 mb-4">
                <div className="flex-1">
                    <label className="text-[10px] text-gray-400 uppercase font-bold">{t('reward.aggression')}</label>
                    <input type="range" min="0" max="100" value={speedWeight} onChange={e => setSpeedWeight(Number(e.target.value))} className="w-full accent-blue-500"/>
                </div>
                <div className="flex-1">
                    <label className="text-[10px] text-gray-400 uppercase font-bold">{t('reward.safety')}</label>
                    <input type="range" min="0" max="100" value={safetyPenalty} onChange={e => setSafetyPenalty(Number(e.target.value))} className="w-full accent-green-500"/>
                </div>
            </div>
            <div className="flex space-x-3">
                <Button variant="secondary" onClick={reset}><RotateCcw size={16}/></Button>
                <Button fullWidth variant="primary" onClick={runSim} disabled={simState === 'RUNNING'}>
                    {simState === 'RUNNING' ? t('reward.training') : t('reward.start')}
                </Button>
            </div>
        </div>
    </div>
  );
};
