
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { interactWithPromptDrift } from '../../services/geminiService';
import { Mic, Zap, Flag, Activity, Flame, AlertTriangle, MicOff, Pause } from 'lucide-react';
import { Language } from '../../types';

interface PromptDriftProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
}

// --- CONSTANTS ---
const FPS = 60;
const WIDTH = 1024;
const HEIGHT = 768;
const ROAD_WIDTH = 2000;
const SEGMENT_LENGTH = 200;
const RUMBLE_LENGTH = 3;
const LANES = 3;
const FOV = 100;
const CAMERA_HEIGHT = 1000;
const CAMERA_DEPTH = 1 / Math.tan((FOV / 2) * Math.PI / 180);
const DRAW_DISTANCE = 300; 

interface PhysicsState {
  friction: number;
  speedMult: number;
  visualStyle: string;
  hexColor: string;
  skyColor: string;
  fogDensity: number;
}

interface Sprite {
  type: 'ORB' | 'BOOST_PAD' | 'PARTICLE';
  offset: number; 
  z?: number;
  life?: number;
}

interface Segment {
  index: number;
  p1: { world: { x: number, y: number, z: number }, camera: any, screen: any };
  p2: { world: { x: number, y: number, z: number }, camera: any, screen: any };
  curve: number;
  sprites: Sprite[];
  color: { road: string, grass: string, rumble: string, strip: string };
  looped: boolean; 
}

export const PromptDrift: React.FC<PromptDriftProps> = ({ onComplete, t, language = 'EN' }) => {
  const [gameState, setGameState] = useState<'MENU' | 'COUNTDOWN' | 'RACING' | 'FINISHED'>('MENU');
  const [countdown, setCountdown] = useState(3);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState("READY TO RACE");
  const [speedDisplay, setSpeedDisplay] = useState(0);
  const [positionDisplay, setPositionDisplay] = useState(2);
  const [lapProgress, setLapProgress] = useState(0);
  const [boostMeter, setBoostMeter] = useState(0);
  const [isBoosting, setIsBoosting] = useState(false);
  const [physicsAlert, setPhysicsAlert] = useState<string | null>(null);
  const [rivalGap, setRivalGap] = useState(0);
  
  const [joystick, setJoystick] = useState<{ active: boolean, origin: {x:number, y:number}, current: {x:number, y:number} }>({ 
      active: false, origin: {x:0, y:0}, current: {x:0, y:0} 
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const recognitionRef = useRef<any>(null);
  const joystickRef = useRef<{ startX: number, startY: number } | null>(null);
  
  const player = useRef({ x: 0, y: 0, z: 0, speed: 0, maxSpeed: 28000, accel: 12000, breaking: 50000, decud: 8000, offRoadDecel: 22000, offRoadLimit: 6000, boostTimer: 0, dx: 0, driftAngle: 0, shake: 0 });
  const particles = useRef<{x: number, y: number, speedX: number, speedY: number, life: number, color: string, size: number}[]>([]);
  const keys = useRef({ gas: false, brake: false, steer: 0 });
  const track = useRef<{ segments: Segment[], length: number }>({ segments: [], length: 0 });
  const rival = useRef({ x: 0, z: 1000, speed: 26000, offset: 0, state: 'NORMAL' });
  const env = useRef<PhysicsState>({ friction: 1.0, speedMult: 1.0, visualStyle: 'Asphalt', hexColor: '#333333', skyColor: '#0f172a', fogDensity: 0.003 });
  const currentEnv = useRef({ ...env.current });

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = language === 'JP' ? 'ja-JP' : language === 'ES' ? 'es-ES' : 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
            const text = event.results[0][0].transcript;
            setInput(text);
            handlePrompt(text);
            setIsListening(false);
        };
        recognition.onspeechend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);
        recognitionRef.current = recognition;
    }
  }, [language]);

  const toggleListening = () => {
      if (!recognitionRef.current) { alert("Voice control not supported."); return; }
      if (isListening) { recognitionRef.current.stop(); setIsListening(false); } 
      else { recognitionRef.current.start(); setIsListening(true); }
  };

  const resetRoad = () => {
    const segments: Segment[] = [];
    const totalSegments = 4000;
    const addSegment = (curve: number, y: number) => {
        const n = segments.length;
        const color = {
            road: (Math.floor(n / RUMBLE_LENGTH) % 2) ? '#333333' : '#3a3a3a',
            grass: (Math.floor(n / RUMBLE_LENGTH) % 2) ? '#10b981' : '#059669',
            rumble: (Math.floor(n / RUMBLE_LENGTH) % 2) ? '#ffffff' : '#ef4444',
            strip: (Math.floor(n / RUMBLE_LENGTH) % 2) ? '' : '#ffffff'
        };
        const lastY = (segments.length === 0) ? 0 : segments[segments.length - 1].p2.world.y;
        segments.push({
            index: n,
            p1: { world: { x: 0, y: lastY, z: n * SEGMENT_LENGTH }, camera: {}, screen: {} },
            p2: { world: { x: 0, y: y, z: (n + 1) * SEGMENT_LENGTH }, camera: {}, screen: {} },
            curve, sprites: [], color, looped: false
        });
    };
    let currentHeight = 0;
    const addStraight = (num: number) => { for(let i=0; i<num; i++) addSegment(0, currentHeight); }
    const addCurve = (num: number, curve: number, heightDelta: number) => { for(let i=0; i<num; i++) { currentHeight += heightDelta; addSegment(curve, currentHeight); } }
    
    addStraight(50);
    addCurve(100, 2, 20);
    addStraight(50);
    while(segments.length < totalSegments) { addStraight(50); addCurve(100, (Math.random() * 6) - 3, (Math.random() * 40) - 20); }
    for(let i=100; i<totalSegments-100; i+=40) segments[i].sprites.push({ type: 'ORB', offset: (Math.random() * 2) - 1 });

    track.current = { segments, length: segments.length * SEGMENT_LENGTH };
    player.current.z = 0; player.current.speed = 0; rival.current.z = 400;
  };

  useEffect(() => { resetRoad(); return () => cancelAnimationFrame(requestRef.current); }, []);

  const update = (dt: number) => {
    if (track.current.segments.length === 0) return;
    const p = player.current; const r = rival.current; const e = env.current; const c = currentEnv.current;
    c.friction += (e.friction - c.friction) * 0.05; c.speedMult += (e.speedMult - c.speedMult) * 0.05; c.fogDensity += (e.fogDensity - c.fogDensity) * 0.05;
    const segmentIndex = Math.floor(p.z / SEGMENT_LENGTH) % track.current.segments.length;
    const segment = track.current.segments[segmentIndex >= 0 ? segmentIndex : 0];
    const speedRatio = p.speed / p.maxSpeed;

    if (keys.current.gas && !keys.current.brake) p.speed += p.accel * dt * (isBoosting ? 2.0 : c.speedMult);
    else if (keys.current.brake) p.speed -= p.breaking * dt;
    else p.speed -= p.decud * dt;
    p.speed -= (speedRatio ** 2) * 5000 * dt;
    let currentMax = p.maxSpeed * c.speedMult; if (isBoosting) currentMax *= 1.4;
    
    const isOffRoad = (p.x < -1.1 || p.x > 1.1);
    if (isOffRoad) {
        if (p.speed > p.offRoadLimit) p.speed -= p.offRoadDecel * dt;
        if (p.speed > 2000) {
            p.shake = 3;
            particles.current.push({ x: (Math.random() * WIDTH), y: HEIGHT - (Math.random() * 100), speedX: (Math.random() - 0.5) * 20, speedY: -Math.random() * 20, life: 1.0, color: '#854d0e', size: Math.random() * 4 + 2 });
        }
    } else p.shake = Math.max(0, p.shake - dt * 10);
    p.speed = Math.max(0, Math.min(p.speed, currentMax));

    const steerInput = keys.current.steer;
    const grip = c.friction;
    const steerForce = steerInput * dt * 6.0 * grip; 
    p.dx += steerForce;
    const centrifugal = segment.curve * (speedRatio ** 2) * dt * 4.0;
    p.dx -= centrifugal;
    const damping = 1.0 - (dt * 8.0 * grip); 
    p.dx *= Math.max(0, Math.min(1, damping));
    p.x += p.dx * speedRatio * 2.0; 
    p.x = Math.max(-2.5, Math.min(2.5, p.x));
    p.driftAngle = (p.dx * 25) + (steerInput * 10);
    p.z += p.speed * dt; if (p.z < 0) p.z = 0; 

    if (isBoosting) {
        p.boostTimer -= dt; p.shake = 4; setBoostMeter(Math.max(0, (p.boostTimer / 5) * 100));
        if (p.boostTimer <= 0) setIsBoosting(false);
    }

    const distToPlayer = r.z - p.z; let rivalTarget = 27000 * c.speedMult;
    if (distToPlayer < 800) rivalTarget *= 1.1; 
    if (c.friction < 0.5) rivalTarget *= 0.6;
    if (r.speed < rivalTarget) r.speed += 300; else r.speed -= 200;
    r.z += r.speed * dt; if (r.z < 0) r.z = 0;
    const rSegIdx = Math.floor(r.z / SEGMENT_LENGTH) % track.current.segments.length;
    const rSeg = track.current.segments[rSegIdx >= 0 ? rSegIdx : 0];
    r.x -= rSeg.curve * 0.025 * dt; r.x = Math.max(-0.8, Math.min(0.8, r.x));

    segment.sprites.forEach((s, i) => {
        if (s.type === 'ORB' && Math.abs(p.x - s.offset) < 0.5) {
            segment.sprites.splice(i, 1); setBoostMeter(b => Math.min(100, b + 25));
        }
    });

    particles.current.forEach(pt => { pt.x += pt.speedX; pt.y += pt.speedY; pt.life -= dt * 2; });
    particles.current = particles.current.filter(pt => pt.life > 0);

    if (p.z >= track.current.length) { setGameState('FINISHED'); onComplete(p.z > r.z ? 100 : 50); }

    setSpeedDisplay(Math.round(p.speed / 100));
    setLapProgress(Math.min(100, (p.z / track.current.length) * 100));
    setPositionDisplay(p.z > r.z ? 1 : 2);
    setRivalGap(Math.round((p.z - r.z) / 100)); 
  };

  const render = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const w = canvas.width; const h = canvas.height;
    ctx.clearRect(0, 0, w, h); ctx.save();
    ctx.translate((Math.random() - 0.5) * player.current.shake, (Math.random() - 0.5) * player.current.shake);

    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, env.current.skyColor); skyGrad.addColorStop(1, env.current.hexColor);
    ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, w, h);

    const project = (p: any, cameraX: number, cameraY: number, cameraZ: number, cameraDepth: number) => {
      p.camera.x = (p.world.x || 0) - cameraX; p.camera.y = (p.world.y || 0) - cameraY; p.camera.z = (p.world.z || 0) - cameraZ;
      p.screen.scale = cameraDepth / p.camera.z;
      p.screen.x = Math.round((w / 2) + (p.screen.scale * p.camera.x * w / 2));
      p.screen.y = Math.round((h / 2) - (p.screen.scale * p.camera.y * h / 2));
      p.screen.w = Math.round((p.screen.scale * ROAD_WIDTH * w / 2));
    };

    const drawPoly = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number, color: string) => {
        ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4); ctx.closePath(); ctx.fill();
    };

    const baseSegmentIndex = Math.floor(player.current.z / SEGMENT_LENGTH) % track.current.segments.length;
    const baseSegment = track.current.segments[baseSegmentIndex >= 0 ? baseSegmentIndex : 0];
    const basePercent = (player.current.z % SEGMENT_LENGTH) / SEGMENT_LENGTH;
    const playerY = baseSegment.p1.world.y + (baseSegment.p2.world.y - baseSegment.p1.world.y) * basePercent;
    
    let dx = -(baseSegment.curve * basePercent); let x = 0; let maxY = h;

    for (let n = 0; n < DRAW_DISTANCE; n++) {
        const segmentIndex = (baseSegment.index + n) % track.current.segments.length;
        const segment = track.current.segments[segmentIndex];
        segment.p1.world.x = x - dx; segment.p2.world.x = x - dx + segment.curve;
        project(segment.p1, (player.current.x * ROAD_WIDTH), CAMERA_HEIGHT + playerY, player.current.z, CAMERA_DEPTH);
        project(segment.p2, (player.current.x * ROAD_WIDTH), CAMERA_HEIGHT + playerY, player.current.z, CAMERA_DEPTH);
        x += dx; dx += segment.curve;
        if (segment.p1.camera.z <= CAMERA_DEPTH || segment.p2.screen.y >= maxY || segment.p2.screen.y >= segment.p1.screen.y) continue;

        ctx.fillStyle = segment.color.grass; ctx.fillRect(0, segment.p2.screen.y, w, segment.p1.screen.y - segment.p2.screen.y);
        const r1 = segment.p1.screen.w / Math.max(6, 2 * LANES); const r2 = segment.p2.screen.w / Math.max(6, 2 * LANES);
        drawPoly(ctx, segment.p1.screen.x - segment.p1.screen.w - r1, segment.p1.screen.y, segment.p1.screen.x - segment.p1.screen.w, segment.p1.screen.y, segment.p2.screen.x - segment.p2.screen.w, segment.p2.screen.y, segment.p2.screen.x - segment.p2.screen.w - r2, segment.p2.screen.y, segment.color.rumble);
        drawPoly(ctx, segment.p1.screen.x + segment.p1.screen.w + r1, segment.p1.screen.y, segment.p1.screen.x + segment.p1.screen.w, segment.p1.screen.y, segment.p2.screen.x + segment.p2.screen.w, segment.p2.screen.y, segment.p2.screen.x + segment.p2.screen.w + r2, segment.p2.screen.y, segment.color.rumble);
        drawPoly(ctx, segment.p1.screen.x - segment.p1.screen.w, segment.p1.screen.y, segment.p1.screen.x + segment.p1.screen.w, segment.p1.screen.y, segment.p2.screen.x + segment.p2.screen.w, segment.p2.screen.y, segment.p2.screen.x - segment.p2.screen.w, segment.p2.screen.y, env.current.hexColor);

        const fogPercent = n / DRAW_DISTANCE;
        if (fogPercent > 0.5) { 
            ctx.globalAlpha = (fogPercent - 0.5) * 2 * Math.min(1, currentEnv.current.fogDensity * 500); 
            ctx.fillStyle = env.current.skyColor; ctx.fillRect(0, segment.p2.screen.y, w, segment.p1.screen.y - segment.p2.screen.y); ctx.globalAlpha = 1;
        }
        maxY = segment.p2.screen.y;
    }

    // Sprites & Cars
    for (let n = DRAW_DISTANCE - 1; n > 0; n--) {
        const segmentIndex = (baseSegment.index + n) % track.current.segments.length;
        const segment = track.current.segments[segmentIndex];
        segment.sprites.forEach(s => {
            const scale = segment.p1.screen.scale; const sx = segment.p1.screen.x + (segment.p1.screen.w * s.offset); const sy = segment.p1.screen.y; const size = scale * 1500 * (w/1024);
            ctx.save(); ctx.translate(sx, sy - size); ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(0, 0, size/2, 0, Math.PI*2); ctx.fill(); ctx.restore();
        });
        if (rival.current.z >= segment.p1.world.z && rival.current.z < segment.p2.world.z) {
            const scale = segment.p1.screen.scale; const cx = segment.p1.screen.x + (scale * rival.current.x * ROAD_WIDTH * w/2); const cy = segment.p1.screen.y; const cw = scale * 4000; const ch = scale * 2000; 
            ctx.fillStyle = '#ef4444'; ctx.fillRect(cx - cw/2, cy - ch, cw, ch/2); 
        }
    }

    // Player
    const carX = w/2; const carY = h - 100 - player.current.y; const tilt = player.current.driftAngle * 1.5;
    ctx.save(); ctx.translate(carX, carY); ctx.rotate(tilt * Math.PI / 180);
    ctx.fillStyle = '#a855f7'; ctx.beginPath(); ctx.roundRect(-100, -20, 200, 50, 10); ctx.fill();
    if (isBoosting) { ctx.fillStyle = '#22d3ee'; ctx.beginPath(); ctx.moveTo(-20, 30); ctx.lineTo(0, 80); ctx.lineTo(20, 30); ctx.fill(); }
    ctx.restore(); ctx.restore();
  };

  useEffect(() => {
    let lastTime = performance.now();
    const loop = (time: number) => { const dt = Math.min(1, (time - lastTime) / 1000); lastTime = time; if (gameState === 'RACING') update(dt); render(); requestRef.current = requestAnimationFrame(loop); };
    requestRef.current = requestAnimationFrame(loop); return () => cancelAnimationFrame(requestRef.current);
  }, [gameState]);

  const handleTouchStart = (e: any) => { if (gameState !== 'RACING') return; const t = e.touches ? e.touches[0] : e; keys.current.gas = true; joystickRef.current = { startX: t.clientX, startY: t.clientY }; setJoystick({ active: true, origin: {x: t.clientX, y: t.clientY}, current: {x: t.clientX, y: t.clientY} }); };
  const handleTouchMove = (e: any) => { if (gameState !== 'RACING' || !joystickRef.current) return; const t = e.touches ? e.touches[0] : e; setJoystick(p => ({ ...p, current: {x: t.clientX, y: t.clientY} })); keys.current.steer = Math.max(-1, Math.min(1, (t.clientX - joystickRef.current.startX) / 80)); };
  const handleTouchEnd = () => { keys.current.gas = false; keys.current.steer = 0; joystickRef.current = null; setJoystick(p => ({ ...p, active: false })); };

  const handlePrompt = async (textOverride?: string) => {
      const text = textOverride || input; if (!text.trim() || isGenerating) return;
      setIsGenerating(true);
      const result = await interactWithPromptDrift(text);
      env.current = { friction: result.friction, speedMult: result.speedMult, visualStyle: result.visualStyle, hexColor: result.hexColor, skyColor: result.hexColor === '#ffffff' ? '#bae6fd' : '#0f172a', fogDensity: result.friction < 0.5 ? 0.02 : 0.003 };
      setPhysicsAlert(`PHYSICS: ${result.visualStyle.toUpperCase()}`); setTimeout(() => setPhysicsAlert(null), 2000);
      setFeedback(result.feedback); setInput(''); setIsGenerating(false);
  };

  return (
    <div className="h-full flex flex-col bg-black font-mono relative overflow-hidden select-none touch-none">
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="absolute inset-0 w-full h-full object-cover touch-none" />
        <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-4">
            <div className="flex justify-between items-start">
                <div className="space-y-2">
                    <div className="flex space-x-2">
                        <div className="bg-black/70 backdrop-blur border border-cyan-500/30 p-2 rounded-xl text-cyan-500 w-24 text-center">
                            <div className="text-[9px] uppercase font-bold">{t('drift.speed')}</div>
                            <div className="text-2xl font-black italic">{speedDisplay}</div>
                        </div>
                        <div className={`bg-black/70 backdrop-blur border p-2 rounded-xl w-32 text-center ${rivalGap > 0 ? 'border-green-500/30 text-green-500' : 'border-red-500/30 text-red-500'}`}>
                            <div className="text-[9px] uppercase font-bold">{t('drift.gap')}</div>
                            <div className="text-xl font-black italic">{rivalGap > 0 ? '+' : ''}{rivalGap}m</div>
                        </div>
                    </div>
                </div>
                <div className="bg-black/70 backdrop-blur border border-white/20 p-2 rounded-xl w-36">
                    <div className="text-[8px] text-gray-400 uppercase font-bold mb-1 flex items-center justify-between">
                        <span>{t('drift.grip')}</span> <span>{Math.round(currentEnv.current.friction * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-700 rounded-full mb-2 overflow-hidden">
                        <div className={`h-full transition-all duration-500 ${currentEnv.current.friction < 0.5 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${currentEnv.current.friction * 100}%` }}></div>
                    </div>
                </div>
            </div>
            {physicsAlert && <div className="absolute top-24 left-1/2 -translate-x-1/2 text-center bg-red-600 text-white font-black text-xl py-2 px-8 skew-x-[-10deg] border-2 border-white">⚠️ {physicsAlert} ⚠️</div>}
            {gameState === 'COUNTDOWN' && <div className="absolute inset-0 flex items-center justify-center text-9xl font-black text-white animate-ping">{countdown}</div>}
            <div className="flex flex-col items-center w-full max-w-md mx-auto pointer-events-auto pb-safe space-y-4">
                <div className="flex w-full items-center space-x-3 px-4">
                    <button className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${isListening ? 'bg-red-500 border-white animate-pulse' : 'bg-gray-800 border-gray-600'}`} onClick={toggleListening}>
                        {isListening ? <MicOff size={20} className="text-white"/> : <Mic size={20} className="text-white"/>}
                    </button>
                    <div className="flex-1 relative group">
                        <input className="w-full bg-black/80 border border-white/20 rounded-full px-4 py-3 text-white focus:border-yellow-400 focus:outline-none font-mono text-xs" placeholder={isListening ? t('drift.listening') : t('drift.placeholder')} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handlePrompt()} />
                        <Button variant="primary" className="absolute right-1 top-1 bottom-1 rounded-full w-10 p-0 flex items-center justify-center" onClick={() => handlePrompt()} disabled={isGenerating}>{isGenerating ? <Activity size={14} className="animate-spin"/> : <Zap size={14} />}</Button>
                    </div>
                    <button onClick={() => { if(boostMeter >= 100) { setIsBoosting(true); player.current.boostTimer = 5; setBoostMeter(0); } }} disabled={boostMeter < 100} className={`w-14 h-14 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${boostMeter >= 100 ? 'bg-yellow-500 border-white animate-pulse' : 'bg-gray-800 opacity-50'}`}><Flame size={24} className="text-white"/></button>
                </div>
                <div className="w-full h-48 relative" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onMouseDown={handleTouchStart} onMouseMove={handleTouchMove} onMouseUp={handleTouchEnd}>
                    {!joystick.active && <div className="w-full h-full flex flex-col items-center justify-center opacity-30 pointer-events-none"><div className="text-white text-[10px] font-bold uppercase tracking-widest animate-pulse mb-2">{t('drift.touch_drive')}</div><div className="w-12 h-12 border-2 border-dashed border-white rounded-full"></div></div>}
                    {joystick.active && <div className="fixed pointer-events-none z-20" style={{ left: joystick.origin.x, top: joystick.origin.y }}><div className="absolute -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/30 rounded-full bg-black/30"></div><div className="absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-cyan-500 rounded-full border-2 border-white" style={{ transform: `translate(${joystick.current.x - joystick.origin.x}px, ${joystick.current.y - joystick.origin.y}px)` }}></div></div>}
                    <div className="absolute bottom-6 left-6 z-30"><button className={`w-20 h-20 rounded-full border-4 flex items-center justify-center shadow-2xl transition-all active:scale-95 ${keys.current.brake ? 'bg-red-600 border-white' : 'bg-red-900/80 border-red-500'}`} onTouchStart={(e) => { e.stopPropagation(); keys.current.brake = true; }} onTouchEnd={(e) => { e.stopPropagation(); keys.current.brake = false; }} onMouseDown={(e) => { e.stopPropagation(); keys.current.brake = true; }} onMouseUp={(e) => { e.stopPropagation(); keys.current.brake = false; }}><span className="font-black text-white text-[10px]">{t('drift.brake')}</span></button></div>
                </div>
            </div>
        </div>
        {gameState === 'MENU' && <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6"><h1 className="text-5xl font-black text-white italic tracking-tighter mb-8">PROMPT <span className="text-yellow-500">DRIFT</span></h1><Button size="lg" variant="primary" onClick={() => { setGameState('COUNTDOWN'); let c=3; setCountdown(3); const i = setInterval(() => { c--; if(c<=0){clearInterval(i); setGameState('RACING');} else setCountdown(c); }, 1000); }} className="w-full max-w-xs h-16 text-xl">{t('drift.start_engine')}</Button></div>}
        {gameState === 'FINISHED' && <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6"><Flag size={80} className="text-white mb-6" /><h2 className="text-5xl font-black text-white italic mb-2">{t('drift.finish')}</h2><div className={`text-4xl font-black mb-8 ${positionDisplay === 1 ? 'text-yellow-500' : 'text-red-500'}`}>{positionDisplay === 1 ? t('drift.place_1') : t('drift.place_2')}</div><Button size="lg" variant="primary" onClick={() => onComplete(positionDisplay === 1 ? 100 : 50)} className="w-full max-w-xs">{t('drift.continue')}</Button></div>}
    </div>
  );
};
