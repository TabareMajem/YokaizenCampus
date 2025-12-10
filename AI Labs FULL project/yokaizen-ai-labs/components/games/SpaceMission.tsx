
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Rocket, RefreshCw, Target, AlertTriangle, ShoppingBag } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Language, UserStats, GameType } from '../../types';
import { SkinShop } from '../ui/SkinShop';
import { GAME_SKINS } from '../../constants';

interface SpaceMissionProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
  user?: UserStats;
  onUpdateUser?: (user: UserStats) => void;
}

// Physics Constants
const G = 0.5; // Gravity constant
const PLANET_MASS = 2000;
const PLANET_RADIUS = 40;

export const SpaceMission: React.FC<SpaceMissionProps> = ({ onComplete, t, user, onUpdateUser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Game State
  const [gameState, setGameState] = useState<'PLANNING' | 'LAUNCHED' | 'CRASH' | 'ORBIT' | 'LOST'>('PLANNING');
  const [showShop, setShowShop] = useState(false);
  
  // Assets Refs
  const shipSpriteRef = useRef<HTMLImageElement | null>(null);
  const trailColorRef = useRef('#f59e0b');

  // Physics State
  const state = useRef({
      ship: { x: 100, y: 300, vx: 0, vy: 0, angle: 0 },
      planet: { x: 400, y: 300 },
      target: { angle: 0, speed: 0.02, radius: 180, x: 0, y: 0 },
      particles: [] as {x: number, y: number, vx: number, vy: number, life: number, color: string}[],
      orbitTime: 0
  });

  // Load Skins
  useEffect(() => {
      const skinId = user?.equippedSkins?.[GameType.SPACE_MISSION] || 'space_default';
      const trailId = user?.equippedSkins?.[GameType.SPACE_MISSION + '_TRAIL'] || 'trail_default';
      
      const skin = GAME_SKINS.find(s => s.id === skinId);
      const trail = GAME_SKINS.find(s => s.id === trailId);

      if (skin) {
          const img = new Image();
          img.src = skin.assetUrl;
          shipSpriteRef.current = img;
      }
      if (trail) {
          trailColorRef.current = trail.assetUrl;
      }
  }, [user?.equippedSkins]);

  // Input State
  const dragRef = useRef({ active: false, startX: 0, startY: 0, currX: 0, currY: 0 });

  useEffect(() => {
      const canvas = canvasRef.current;
      if(!canvas) return;
      
      state.current.planet = { x: canvas.width / 2, y: canvas.height / 2 };
      state.current.ship = { x: 100, y: canvas.height / 2, vx: 0, vy: 0, angle: 0 };

      const loop = () => {
          update();
          draw();
          requestRef.current = requestAnimationFrame(loop);
      };
      requestRef.current = requestAnimationFrame(loop);

      return () => cancelAnimationFrame(requestRef.current);
  }, [gameState]);

  const update = () => {
      const s = state.current;
      const width = canvasRef.current?.width || 800;
      const height = canvasRef.current?.height || 600;

      s.target.angle += s.target.speed;
      s.target.x = s.planet.x + Math.cos(s.target.angle) * s.target.radius;
      s.target.y = s.planet.y + Math.sin(s.target.angle) * s.target.radius;

      if (gameState === 'LAUNCHED') {
          const dx = s.planet.x - s.ship.x;
          const dy = s.planet.y - s.ship.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          const force = (G * PLANET_MASS) / (dist * dist);
          const ax = (dx / dist) * force;
          const ay = (dy / dist) * force;

          s.ship.vx += ax;
          s.ship.vy += ay;
          s.ship.x += s.ship.vx;
          s.ship.y += s.ship.vy;
          
          s.ship.angle = Math.atan2(s.ship.vy, s.ship.vx);

          if (Math.random() > 0.5) {
              s.particles.push({
                  x: s.ship.x, y: s.ship.y,
                  vx: -s.ship.vx * 0.5 + (Math.random() - 0.5),
                  vy: -s.ship.vy * 0.5 + (Math.random() - 0.5),
                  life: 1.0,
                  color: trailColorRef.current
              });
          }

          if (dist < PLANET_RADIUS + 5) {
              setGameState('CRASH');
              audio.playError();
              spawnExplosion(s.ship.x, s.ship.y);
          }
          if (s.ship.x < 0 || s.ship.x > width || s.ship.y < 0 || s.ship.y > height) {
              setGameState('LOST');
              audio.playError();
          }

          const tdx = s.target.x - s.ship.x;
          const tdy = s.target.y - s.ship.y;
          const tDist = Math.sqrt(tdx*tdx + tdy*tdy);
          
          if (tDist < 30) {
              s.orbitTime += 1;
              s.particles.push({
                  x: s.target.x + (Math.random()-0.5)*20,
                  y: s.target.y + (Math.random()-0.5)*20,
                  vx: 0, vy: 0, life: 0.5, color: '#10b981'
              });
              
              if (s.orbitTime > 100) { 
                  setGameState('ORBIT');
                  audio.playSuccess();
                  setTimeout(() => onComplete(100), 1500);
              }
          } else {
              s.orbitTime = Math.max(0, s.orbitTime - 0.5);
          }
      }

      s.particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.02;
      });
      s.particles = s.particles.filter(p => p.life > 0);
  };

  const spawnExplosion = (x: number, y: number) => {
      for(let i=0; i<20; i++) {
          state.current.particles.push({
              x, y,
              vx: (Math.random() - 0.5) * 5,
              vy: (Math.random() - 0.5) * 5,
              life: 1.0,
              color: '#ef4444'
          });
      }
  };

  const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const s = state.current;

      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#ffffff';
      for(let i=0; i<50; i++) {
          const x = (i * 1234) % width;
          const y = (i * 5678) % height;
          ctx.globalAlpha = Math.random() * 0.5 + 0.1;
          ctx.fillRect(x, y, 1, 1);
      }
      ctx.globalAlpha = 1;

      const grad = ctx.createRadialGradient(s.planet.x, s.planet.y, 10, s.planet.x, s.planet.y, PLANET_RADIUS * 4);
      grad.addColorStop(0, 'rgba(124, 58, 237, 0.3)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(s.planet.x, s.planet.y, PLANET_RADIUS * 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#4c1d95';
      ctx.beginPath();
      ctx.arc(s.planet.x, s.planet.y, PLANET_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(s.planet.x, s.planet.y, s.target.radius, 0, Math.PI*2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.save();
      ctx.translate(s.target.x, s.target.y);
      ctx.rotate(Date.now() / 500);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(-15, -15, 30, 30);
      ctx.stroke();
      ctx.fillStyle = `rgba(16, 185, 129, ${0.2 + (s.orbitTime/100)*0.5})`;
      ctx.fill();
      ctx.restore();

      if (dragRef.current.active && gameState === 'PLANNING') {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(s.ship.x, s.ship.y);
          ctx.lineTo(s.ship.x + (dragRef.current.startX - dragRef.current.currX), s.ship.y + (dragRef.current.startY - dragRef.current.currY));
          ctx.stroke();
          
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(s.ship.x, s.ship.y);
          let px = s.ship.x;
          let py = s.ship.y;
          let pvx = (dragRef.current.startX - dragRef.current.currX) * 0.1;
          let pvy = (dragRef.current.startY - dragRef.current.currY) * 0.1;
          for(let i=0; i<25; i++) {
              const pdx = s.planet.x - px;
              const pdy = s.planet.y - py;
              const pdist = Math.sqrt(pdx*pdx + pdy*pdy);
              const pforce = (G * PLANET_MASS) / (pdist * pdist);
              pvx += (pdx / pdist) * pforce;
              pvy += (pdy / pdist) * pforce;
              px += pvx;
              py += pvy;
              ctx.lineTo(px, py);
          }
          ctx.stroke();
          ctx.setLineDash([]);
      }

      ctx.save();
      ctx.translate(s.ship.x, s.ship.y);
      ctx.rotate(gameState === 'PLANNING' && dragRef.current.active
          ? Math.atan2(dragRef.current.startY - dragRef.current.currY, dragRef.current.startX - dragRef.current.currX) 
          : s.ship.angle
      );
      
      if (shipSpriteRef.current) {
          ctx.drawImage(shipSpriteRef.current, -16, -16, 32, 32);
      } else {
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.moveTo(12, 0);
          ctx.lineTo(-8, 6);
          ctx.lineTo(-8, -6);
          ctx.fill();
      }
      
      if (gameState === 'LAUNCHED') {
          ctx.fillStyle = trailColorRef.current;
          ctx.beginPath();
          ctx.moveTo(-10, 0);
          ctx.lineTo(-20 - Math.random()*5, 0);
          ctx.stroke();
      }
      ctx.restore();

      s.particles.forEach(p => {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI*2);
          ctx.fill();
      });
      ctx.globalAlpha = 1;
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
      if (gameState !== 'PLANNING') return;
      const pos = getPos(e);
      dragRef.current = { active: true, startX: pos.x, startY: pos.y, currX: pos.x, currY: pos.y };
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!dragRef.current.active) return;
      const pos = getPos(e);
      dragRef.current.currX = pos.x;
      dragRef.current.currY = pos.y;
  };

  const handleEnd = () => {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      
      const vx = (dragRef.current.startX - dragRef.current.currX) * 0.1;
      const vy = (dragRef.current.startY - dragRef.current.currY) * 0.1;
      
      if (Math.abs(vx) > 0.5 || Math.abs(vy) > 0.5) {
          state.current.ship.vx = vx;
          state.current.ship.vy = vy;
          setGameState('LAUNCHED');
          audio.playEngine(1000);
      }
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      const x = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const y = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      return { x: x - (rect?.left || 0), y: y - (rect?.top || 0) };
  };

  const reset = () => {
      setGameState('PLANNING');
      const canvas = canvasRef.current;
      if (canvas) {
          state.current.ship = { x: 100, y: canvas.height / 2, vx: 0, vy: 0, angle: 0 };
          state.current.orbitTime = 0;
          state.current.particles = [];
      }
  };

  return (
    <div className="h-full flex flex-col bg-black relative overflow-hidden touch-none select-none">
        
        {showShop && user && onUpdateUser && (
            <SkinShop 
                gameType={GameType.SPACE_MISSION}
                user={user}
                onUpdateUser={onUpdateUser}
                onClose={() => setShowShop(false)}
            />
        )}

        <div className="absolute top-16 left-4 z-10 flex flex-col space-y-2 pointer-events-none">
            <div className="bg-black/30 p-2 rounded backdrop-blur-sm">
                <h2 className="text-xl font-black text-white uppercase italic tracking-widest flex items-center">
                    <Rocket className="mr-2 text-orange-500" /> {t('space.injection')}
                </h2>
                <p className="text-xs text-gray-400">{t('space.instruction')}</p>
            </div>
        </div>

        {gameState === 'PLANNING' && user && onUpdateUser && (
            <div className="absolute top-16 right-4 z-20 pointer-events-auto">
                <button onClick={() => setShowShop(true)} className="bg-black/50 p-2 rounded-full border border-amber-500/50 text-amber-400 hover:text-white hover:bg-amber-900/50 transition-colors">
                    <ShoppingBag size={20} />
                </button>
            </div>
        )}

        {gameState !== 'PLANNING' && gameState !== 'LAUNCHED' && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-in zoom-in">
                {gameState === 'ORBIT' ? (
                    <div className="text-center">
                        <h3 className="text-3xl font-black text-green-500 mb-2">{t('space.orbit_stable')}</h3>
                        <Target size={64} className="text-green-500 mx-auto mb-4 animate-pulse" />
                        <p className="text-gray-300 mb-6">{t('space.satellite')}</p>
                        <Button onClick={() => onComplete(100)} variant="primary">{t('space.complete')}</Button>
                    </div>
                ) : (
                    <div className="text-center">
                        <h3 className="text-3xl font-black text-red-500 mb-2">{t('space.failed')}</h3>
                        <AlertTriangle size={64} className="text-red-500 mx-auto mb-4" />
                        <p className="text-gray-300 mb-6">{t('space.unstable')}</p>
                        <Button onClick={reset} variant="secondary"><RefreshCw className="mr-2"/> {t('space.retry')}</Button>
                    </div>
                )}
            </div>
        )}

        {gameState === 'PLANNING' && (
             <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 pointer-events-none animate-bounce text-white text-xs bg-black/50 px-3 py-1 rounded-full">
                 {t('space.drag')}
             </div>
        )}

        <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="w-full h-full object-cover cursor-crosshair"
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
        />
    </div>
  );
};
