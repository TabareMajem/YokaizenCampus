
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { User, Database, Eye, Target, ShieldAlert, Lock, Unlock, Fingerprint, Zap, Bell, Volume2, Footprints } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Language } from '../../types';

interface PlanariumHeistProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
}

// --- CONSTANTS ---
const TILE_SIZE = 60; // Increased for better detail
const MAP_WIDTH = 12; // Larger map
const MAP_HEIGHT = 12;
const PLAYER_SPEED = 4.0;
const GUARD_SPEED = 2.0;
const HACK_TIME = 1500; 

// 0: Floor, 1: Wall, 2: Terminal (Goal), 3: Decorative Pillar
const LEVEL_MAP = [
    [1,1,1,1,1,1,1,1,1,1,1,1],
    [1,2,0,0,0,1,0,0,0,0,2,1],
    [1,0,1,1,0,1,0,1,1,1,0,1],
    [1,0,1,0,0,0,0,0,0,1,0,1],
    [1,0,0,0,1,1,1,1,0,0,0,1],
    [1,0,1,0,1,0,0,1,0,1,0,1],
    [1,0,1,0,0,0,0,0,0,1,0,1],
    [1,0,1,1,1,0,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,0,1,1,1,1,0,1,1,1],
    [1,2,0,0,0,0,0,0,0,0,2,1],
    [1,1,1,1,1,1,1,1,1,1,1,1],
];

interface Actor {
    x: number; 
    y: number;
    vx: number;
    vy: number;
    dir: number; 
}

interface Guard extends Actor {
    id: number;
    path: {x: number, y: number}[];
    pathIdx: number;
    alertLevel: number; 
    lookAngle: number;
    state: 'PATROL' | 'INVESTIGATE';
    investigateTarget?: {x: number, y: number};
}

interface Particle {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
}

const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

export const PlanariumHeist: React.FC<PlanariumHeistProps> = ({ onComplete, t }) => {
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'CAUGHT' | 'WIN'>('START');
  const [hackProgress, setHackProgress] = useState(0);
  const [terminalsHacked, setTerminalsHacked] = useState(0);
  const [distraction, setDistraction] = useState<{x: number, y: number, time: number} | null>(null);
  
  const playerRef = useRef<Actor>({ x: TILE_SIZE * 1.5, y: TILE_SIZE * 1.5, vx: 0, vy: 0, dir: 0 });
  const guardsRef = useRef<Guard[]>([
      { id: 1, x: TILE_SIZE * 5.5, y: TILE_SIZE * 1.5, vx: 0, vy: 0, dir: 0, path: [{x: 5, y: 1}, {x: 5, y: 5}, {x: 8, y: 5}, {x: 8, y: 1}], pathIdx: 0, alertLevel: 0, lookAngle: 0, state: 'PATROL' },
      { id: 2, x: TILE_SIZE * 1.5, y: TILE_SIZE * 8.5, vx: 0, vy: 0, dir: 0, path: [{x: 1, y: 8}, {x: 4, y: 8}, {x: 4, y: 6}, {x: 1, y: 6}], pathIdx: 0, alertLevel: 0, lookAngle: 0, state: 'PATROL' },
      { id: 3, x: TILE_SIZE * 8.5, y: TILE_SIZE * 8.5, vx: 0, vy: 0, dir: 0, path: [{x: 8, y: 8}, {x: 8, y: 4}, {x: 10, y: 4}, {x: 10, y: 8}], pathIdx: 0, alertLevel: 0, lookAngle: 0, state: 'PATROL' }
  ]);
  
  const inputRef = useRef({ x: 0, y: 0, isHacking: false });
  const [joystickPos, setJoystickPos] = useState<{start: {x:number, y:number} | null, current: {x:number, y:number} | null}>({ start: null, current: null });
  const requestRef = useRef<number>(0);
  
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0, dir: 0 });
  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const [guardsPos, setGuardsPos] = useState<Guard[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);

  const startGame = () => {
      setGameState('PLAYING');
      setHackProgress(0);
      setTerminalsHacked(0);
      setDistraction(null);
      playerRef.current = { x: TILE_SIZE * 1.5, y: TILE_SIZE * 1.5, vx: 0, vy: 0, dir: 0 };
      guardsRef.current.forEach(g => { g.state = 'PATROL'; g.alertLevel = 0; });
      setCamera({ x: TILE_SIZE * 1.5, y: TILE_SIZE * 1.5 });
      audio.playClick();
      loop();
  };

  const createDistraction = (tileX: number, tileY: number) => {
      if (distraction) return;
      setDistraction({ x: tileX, y: tileY, time: 200 });
      audio.playClick(); 
      spawnParticles(tileX * TILE_SIZE + TILE_SIZE/2, tileY * TILE_SIZE + TILE_SIZE/2, '#F59E0B', 10);
      
      const targetX = tileX * TILE_SIZE + TILE_SIZE/2;
      const targetY = tileY * TILE_SIZE + TILE_SIZE/2;
      
      guardsRef.current.forEach(g => {
          const dist = Math.sqrt(Math.pow(g.x - targetX, 2) + Math.pow(g.y - targetY, 2));
          if (dist < TILE_SIZE * 6) {
              g.state = 'INVESTIGATE';
              g.investigateTarget = { x: targetX, y: targetY };
              g.alertLevel = 50; 
          }
      });
  };

  const spawnParticles = (x: number, y: number, color: string, count: number) => {
      const newParticles: Particle[] = [];
      for(let i=0; i<count; i++) {
          newParticles.push({
              id: Math.random(),
              x: x, y: y,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              life: 1.0,
              color
          });
      }
      setParticles(prev => [...prev, ...newParticles]);
  };

  const loop = () => {
      if (gameState === 'CAUGHT' || gameState === 'WIN') return;

      const p = playerRef.current;
      const input = inputRef.current;

      if (!input.isHacking) {
          const angle = Math.PI / 4;
          const rotX = input.x * Math.cos(angle) - input.y * Math.sin(angle);
          const rotY = input.x * Math.sin(angle) + input.y * Math.cos(angle);

          p.x += rotX * PLAYER_SPEED;
          p.y += rotY * PLAYER_SPEED;
          
          checkWallCollision(p);
          
          if (Math.abs(input.x) > 0 || Math.abs(input.y) > 0) {
              const targetDir = Math.atan2(rotY, rotX);
              let diff = targetDir - p.dir;
              while (diff < -Math.PI) diff += Math.PI * 2;
              while (diff > Math.PI) diff -= Math.PI * 2;
              p.dir += diff * 0.2;
          }
      }

      setCamera(prev => ({
          x: lerp(prev.x, p.x, 0.1),
          y: lerp(prev.y, p.y, 0.1)
      }));

      guardsRef.current.forEach(g => {
          let targetX = g.x;
          let targetY = g.y;

          if (g.state === 'INVESTIGATE' && g.investigateTarget) {
              targetX = g.investigateTarget.x;
              targetY = g.investigateTarget.y;
              
              const dx = targetX - g.x;
              const dy = targetY - g.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              
              if (dist < 10) {
                  g.alertLevel -= 1;
                  if (g.alertLevel <= 0) g.state = 'PATROL';
                  g.lookAngle += 0.15;
              } else {
                  const moveX = (dx / dist) * GUARD_SPEED;
                  const moveY = (dy / dist) * GUARD_SPEED;
                  g.x += moveX;
                  g.y += moveY;
                  const targetDir = Math.atan2(moveY, moveX);
                  let diff = targetDir - g.dir;
                  while (diff < -Math.PI) diff += Math.PI * 2;
                  while (diff > Math.PI) diff -= Math.PI * 2;
                  g.dir += diff * 0.1;
              }
          } else {
              const targetTile = g.path[g.pathIdx];
              targetX = targetTile.x * TILE_SIZE + TILE_SIZE/2;
              targetY = targetTile.y * TILE_SIZE + TILE_SIZE/2;
              
              const dx = targetX - g.x;
              const dy = targetY - g.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              
              if (dist < 5) {
                  g.pathIdx = (g.pathIdx + 1) % g.path.length;
              }
              
              const moveX = (dx / dist) * GUARD_SPEED;
              const moveY = (dy / dist) * GUARD_SPEED;
              g.x += moveX;
              g.y += moveY;
              
              const targetDir = Math.atan2(moveY, moveX);
              let diff = targetDir - g.dir;
              while (diff < -Math.PI) diff += Math.PI * 2;
              while (diff > Math.PI) diff -= Math.PI * 2;
              g.dir += diff * 0.1;
              
              g.lookAngle = Math.sin(Date.now() / 800) * 0.6;
          }

          const pdx = p.x - g.x;
          const pdy = p.y - g.y;
          const pDist = Math.sqrt(pdx*pdx + pdy*pdy);
          
          if (pDist < TILE_SIZE * 3.5) { 
              const angleToPlayer = Math.atan2(pdy, pdx);
              const currentFacing = g.dir + g.lookAngle;
              
              let angleDiff = angleToPlayer - currentFacing;
              while (angleDiff > Math.PI) angleDiff -= Math.PI*2;
              while (angleDiff < -Math.PI) angleDiff += Math.PI*2;
              
              if (Math.abs(angleDiff) < Math.PI / 4) {
                  if (!raycastWall(g.x, g.y, p.x, p.y)) {
                      setGameState('CAUGHT');
                      audio.playError();
                  }
              }
          }
      });

      if (input.isHacking) {
          const tx = Math.floor(p.x / TILE_SIZE);
          const ty = Math.floor(p.y / TILE_SIZE);
          
          if (LEVEL_MAP[ty] && LEVEL_MAP[ty][tx] === 2) {
              setHackProgress(prev => {
                  const next = prev + (100 / (HACK_TIME / 16));
                  if (next >= 100) {
                      completeHack(tx, ty);
                      return 0;
                  }
                  return next;
              });
              if (Math.random() > 0.5) spawnParticles(p.x, p.y, '#10b981', 1);
          } else {
              setHackProgress(0);
          }
      } else {
          setHackProgress(0);
      }
      
      setParticles(prev => prev.map(pt => ({
          ...pt,
          x: pt.x + pt.vx,
          y: pt.y + pt.vy,
          life: pt.life - 0.05
      })).filter(pt => pt.life > 0));

      if (distraction) {
          setDistraction(prev => {
              if(!prev) return null;
              if (prev.time <= 0) return null;
              return { ...prev, time: prev.time - 1 };
          });
      }

      setPlayerPos({ x: p.x, y: p.y, dir: p.dir });
      setGuardsPos([...guardsRef.current]);

      if (gameState === 'PLAYING') {
          requestRef.current = requestAnimationFrame(loop);
      }
  };

  const checkWallCollision = (actor: Actor) => {
      const margin = 15;
      const corners = [
          {x: actor.x - margin, y: actor.y - margin},
          {x: actor.x + margin, y: actor.y - margin},
          {x: actor.x - margin, y: actor.y + margin},
          {x: actor.x + margin, y: actor.y + margin},
      ];

      for (let c of corners) {
          const tx = Math.floor(c.x / TILE_SIZE);
          const ty = Math.floor(c.y / TILE_SIZE);
          if (LEVEL_MAP[ty] && LEVEL_MAP[ty][tx] === 1) {
              actor.x = Math.max(TILE_SIZE, Math.min((MAP_WIDTH-1)*TILE_SIZE, actor.x));
              actor.y = Math.max(TILE_SIZE, Math.min((MAP_HEIGHT-1)*TILE_SIZE, actor.y));
          }
      }
  };

  const raycastWall = (x1: number, y1: number, x2: number, y2: number) => {
      const steps = 25;
      for(let i=0; i<steps; i++) {
          const tx = x1 + (x2 - x1) * (i/steps);
          const ty = y1 + (y2 - y1) * (i/steps);
          const mapX = Math.floor(tx / TILE_SIZE);
          const mapY = Math.floor(ty / TILE_SIZE);
          if (LEVEL_MAP[mapY] && LEVEL_MAP[mapY][mapX] === 1) return true;
      }
      return false;
  };

  const completeHack = (tx: number, ty: number) => {
      audio.playSuccess();
      spawnParticles(tx*TILE_SIZE+30, ty*TILE_SIZE+30, '#00FFFF', 20);
      setTerminalsHacked(h => h + 1);
      LEVEL_MAP[ty][tx] = 0;
      inputRef.current.isHacking = false;
      
      if (terminalsHacked + 1 >= 4) {
          setGameState('WIN');
          setTimeout(() => onComplete(100), 1500);
      }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
      if (gameState !== 'PLAYING') return;
      if ((e.target as HTMLElement).id === 'hack-btn') return;

      const { clientX, clientY } = e;
      setJoystickPos({ start: { x: clientX, y: clientY }, current: { x: clientX, y: clientY } });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
      if (!joystickPos.start) return;
      const { clientX, clientY } = e;
      setJoystickPos(prev => ({ ...prev, current: { x: clientX, y: clientY } }));
      
      const dx = clientX - joystickPos.start.x;
      const dy = clientY - joystickPos.start.y;
      const maxDist = 50;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const clampDist = Math.min(dist, maxDist);
      const angle = Math.atan2(dy, dx);
      const normalizedMag = clampDist / maxDist;
      
      inputRef.current.x = Math.cos(angle) * normalizedMag;
      inputRef.current.y = Math.sin(angle) * normalizedMag;
  };

  const handlePointerUp = () => {
      setJoystickPos({ start: null, current: null });
      inputRef.current.x = 0;
      inputRef.current.y = 0;
  };

  const handleMapClick = (x: number, y: number) => {
      if (gameState === 'PLAYING') createDistraction(x, y);
  };

  useEffect(() => {
      return () => cancelAnimationFrame(requestRef.current);
  }, []);

  return (
    <div 
        className="h-full flex flex-col bg-gray-950 relative overflow-hidden font-mono select-none touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
    >
      
      <div className="flex-1 relative flex items-center justify-center bg-black perspective-[1000px] overflow-hidden">
          <div 
            className="relative transform-style-3d transition-transform duration-100 ease-linear"
            style={{ 
                width: MAP_WIDTH * TILE_SIZE, 
                height: MAP_HEIGHT * TILE_SIZE,
                transform: `rotateX(60deg) rotateZ(-45deg) translate3d(${-camera.x + 150}px, ${-camera.y + 150}px, -50px)`
            }}
          >
              {LEVEL_MAP.map((row, y) => row.map((cell, x) => (
                  <div 
                    key={`${x}-${y}`}
                    className="absolute transform-style-3d"
                    style={{ left: x * TILE_SIZE, top: y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE }}
                    onPointerUp={(e) => { e.stopPropagation(); handleMapClick(x, y); }}
                  >
                      <div className={`absolute inset-0 border border-white/5 ${cell === 1 ? 'bg-transparent' : 'bg-slate-900/90 hover:bg-slate-800 transition-colors'}`}></div>
                      
                      {cell === 1 && (
                          <div className="absolute inset-0 transform translate-z-4 bg-slate-800 border border-slate-600 shadow-xl" style={{ transform: 'translateZ(40px)' }}>
                              <div className="absolute inset-0 bg-slate-700 opacity-50 transform translate-y-full origin-bottom rotate-x-90 h-10"></div>
                              <div className="absolute inset-0 bg-slate-900 opacity-50 transform translate-x-full origin-right rotate-y-90 w-10"></div>
                          </div>
                      )}

                      {cell === 2 && (
                          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ transform: 'translateZ(20px) rotateZ(45deg) rotateX(-60deg)' }}>
                              <Database className="text-green-500 drop-shadow-[0_0_10px_lime] animate-pulse" size={40} />
                              <div className="absolute -bottom-4 w-12 h-2 bg-green-500/20 rounded-full blur-md"></div>
                          </div>
                      )}

                      {distraction && distraction.x === x && distraction.y === y && (
                          <div className="absolute inset-0 flex items-center justify-center z-20" style={{ transform: 'translateZ(10px) rotateZ(45deg) rotateX(-60deg)' }}>
                              <Volume2 className="text-amber-500 animate-ping" size={32} />
                          </div>
                      )}
                  </div>
              )))}

              {gameState !== 'START' && (
                  <div 
                    className="absolute z-20 transition-transform duration-75 ease-linear will-change-transform"
                    style={{ 
                        left: playerPos.x - 20, 
                        top: playerPos.y - 20,
                        transform: `translateZ(10px)` 
                    }}
                  >
                      <div className="absolute top-8 left-0 w-8 h-8 bg-black/60 blur-md rounded-full transform rotate-45 scale-x-150"></div>
                      <div className="w-10 h-10 bg-cyan-500 rounded-full shadow-[0_0_30px_#06b6d4] flex items-center justify-center border-4 border-white relative transition-transform"
                        style={{ transform: `rotateZ(45deg) rotateX(-60deg) rotateZ(${playerPos.dir}rad)` }}>
                          <User size={20} className="text-black" />
                          <div className="absolute top-0 right-0 w-3 h-3 bg-white rounded-full animate-ping"></div>
                      </div>
                  </div>
              )}

              {gameState !== 'START' && guardsPos.map(g => (
                  <div 
                    key={g.id}
                    className="absolute z-20 transition-transform duration-75 ease-linear will-change-transform"
                    style={{ 
                        left: g.x - 20, 
                        top: g.y - 20,
                        transform: `translateZ(10px)` 
                    }}
                  >
                      {g.state === 'INVESTIGATE' && (
                          <div className="absolute -top-12 left-0 text-yellow-500 animate-bounce font-black text-2xl" style={{ transform: 'rotateZ(45deg) rotateX(-60deg)' }}>?</div>
                      )}
                      
                      <div className="w-10 h-10 bg-red-600 rounded-full border-4 border-red-900 flex items-center justify-center shadow-[0_0_20px_red]"
                        style={{ transform: 'rotateZ(45deg) rotateX(-60deg)' }}>
                          <Eye size={20} className="text-white" />
                      </div>
                      
                      <div 
                        className="absolute top-1/2 left-1/2 w-48 h-48 bg-red-500/10 pointer-events-none origin-top-left border-l-2 border-r-2 border-red-500/20"
                        style={{ 
                            transform: `rotate(${g.dir + g.lookAngle - Math.PI/4}rad)`,
                            clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                            background: 'radial-gradient(circle at 0 0, rgba(255,0,0,0.3) 0%, transparent 70%)'
                        }}
                      ></div>
                  </div>
              ))}

              {particles.map(p => (
                  <div 
                    key={p.id}
                    className="absolute w-2 h-2 rounded-full animate-float pointer-events-none"
                    style={{ 
                        left: p.x, top: p.y, backgroundColor: p.color,
                        transform: 'translateZ(20px) rotateZ(45deg) rotateX(-60deg)',
                        opacity: p.life
                    }}
                  ></div>
              ))}
          </div>
          
          <div className="absolute top-16 left-4 bg-black/80 p-3 rounded-xl border border-green-500/50 backdrop-blur pointer-events-none shadow-2xl z-30">
              <div className="text-green-400 font-mono text-xs font-bold mb-1 flex items-center"><Target size={14} className="mr-2"/> {t('heist.objective')}</div>
              <div className="text-white text-lg font-black">{terminalsHacked}/4 TERMINALS</div>
              <div className="text-[10px] text-gray-500 mt-1">{t('heist.distract')} (TAP)</div>
          </div>
      </div>

      {gameState === 'PLAYING' && (
          <>
            <div className="absolute bottom-8 right-8 z-30">
                <button
                    id="hack-btn"
                    className={`w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center transition-all active:scale-95 shadow-2xl ${
                        hackProgress > 0 
                        ? 'bg-green-600 border-green-400 animate-pulse scale-110' 
                        : 'bg-gray-800/90 border-gray-600 hover:border-white'
                    }`}
                    onPointerDown={(e) => { e.stopPropagation(); inputRef.current.isHacking = true; }}
                    onPointerUp={(e) => { e.stopPropagation(); inputRef.current.isHacking = false; }}
                    onPointerLeave={() => inputRef.current.isHacking = false}
                >
                    <Fingerprint size={40} className={hackProgress > 0 ? 'text-white' : 'text-gray-400'} />
                    <div className="text-[10px] text-white font-bold mt-1 uppercase tracking-widest">{hackProgress > 0 ? `${Math.round(hackProgress)}%` : t('heist.start_hack')}</div>
                </button>
            </div>

            {joystickPos.start && (
                <div className="absolute pointer-events-none z-30" style={{ left: joystickPos.start.x, top: joystickPos.start.y }}>
                    <div className="absolute -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-2 border-white/20 bg-white/5 backdrop-blur-sm"></div>
                    <div className="absolute -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-cyan-500 shadow-[0_0_30px_cyan]"
                        style={{ transform: `translate(${joystickPos.current!.x - joystickPos.start.x}px, ${joystickPos.current!.y - joystickPos.start.y}px)` }}></div>
                </div>
            )}
          </>
      )}

      {gameState === 'START' && (
          <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 text-center animate-in fade-in backdrop-blur-md">
              <div className="relative mb-8">
                  <Target size={100} className="text-green-500 animate-spin-slow" />
                  <div className="absolute inset-0 bg-green-500/20 blur-3xl animate-pulse"></div>
              </div>
              <h1 className="text-6xl font-black text-white mb-4 tracking-tighter italic drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">NEON <span className="text-green-500">INFILTRATOR</span></h1>
              <p className="text-gray-400 mb-8 max-w-md text-sm font-mono leading-relaxed border-l-4 border-green-500 pl-4 text-left bg-gray-900/50 p-4 rounded-r-lg">
                  {t('heist.start_desc')}<br/><br/>
                  <Footprints className="inline mr-2 text-cyan-400" size={14}/> <span className="text-cyan-400">DRAG</span> to move silently.<br/>
                  <Bell className="inline mr-2 text-amber-400" size={14}/> <span className="text-white">TAP</span> to create sound decoys.<br/>
                  <Fingerprint className="inline mr-2 text-green-400" size={14}/> <span className="text-green-400">HOLD</span> near terminals to hack.
              </p>
              <Button size="lg" variant="primary" onClick={startGame} className="shadow-[0_0_40px_rgba(34,197,94,0.4)] h-16 px-12 text-xl font-bold">
                  {t('ui.start')}
              </Button>
          </div>
      )}

      {gameState === 'CAUGHT' && (
          <div className="absolute inset-0 z-50 bg-red-950/95 flex flex-col items-center justify-center animate-in zoom-in border-[20px] border-red-900">
              <ShieldAlert size={100} className="text-white mb-6 animate-shake" />
              <h2 className="text-6xl font-black text-white mb-2 tracking-tighter glitch-text">{t('heist.detected')}</h2>
              <p className="text-red-300 mb-10 font-mono text-lg">{t('heist.contact_confirmed')}</p>
              <Button size="lg" variant="secondary" onClick={startGame} className="border-red-500 text-red-200 hover:bg-red-900/50">{t('heist.retry')}</Button>
          </div>
      )}

      {gameState === 'WIN' && (
          <div className="absolute inset-0 z-50 bg-green-950/95 flex flex-col items-center justify-center animate-in zoom-in border-[20px] border-green-900">
              <Unlock size={100} className="text-white mb-6 animate-bounce" />
              <h2 className="text-6xl font-black text-white mb-2 tracking-tighter">{t('heist.data_secured')}</h2>
              <p className="text-green-200 mb-10 font-mono text-lg">{t('heist.ghost_protocol')}</p>
              <Button size="lg" variant="primary" onClick={() => onComplete(100)} className="shadow-[0_0_30px_lime]">{t('heist.exfiltrate')}</Button>
          </div>
      )}
    </div>
  );
};
