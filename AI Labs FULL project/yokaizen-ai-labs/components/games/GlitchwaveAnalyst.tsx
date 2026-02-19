
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Activity, Radio, Lock, Unlock, RefreshCw, Signal, Eye } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Scanlines, Vignette, Noise } from '../ui/Visuals';
import { Language } from '../../types';

interface GlitchwaveAnalystProps {
    onComplete: (score: number) => void;
    t: (key: string) => string;
    language?: Language;
}

export const GlitchwaveAnalyst: React.FC<GlitchwaveAnalystProps> = ({ onComplete, t }) => {
    const [gameState, setGameState] = useState<'TUNING' | 'LOCKED' | 'DECRYPTED'>('TUNING');
    const [lockProgress, setLockProgress] = useState(0);

    // Target Signal
    const targetParams = useRef({ freq: 0.05, amp: 80, phase: 0, noise: 20 });

    // Player Controls
    const [freq, setFreq] = useState(0.02);
    const [amp, setAmp] = useState(40);
    const [phase, setPhase] = useState(0);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const frameRef = useRef<number>(0);
    const timeRef = useRef<number>(0);

    // Init Target
    useEffect(() => {
        targetParams.current = {
            freq: 0.03 + Math.random() * 0.04,
            amp: 50 + Math.random() * 40,
            phase: Math.random() * 100,
            noise: 50
        };
        audio.startAmbience('CYBER');
        return () => audio.stopAmbience();
    }, []);

    // Render Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const render = () => {
            // Responsive Resize
            if (canvas.width !== container.clientWidth || canvas.height !== container.clientHeight) {
                canvas.width = container.clientWidth;
                canvas.height = container.clientHeight;
            }

            const width = canvas.width;
            const height = canvas.height;

            timeRef.current += 1;
            const t_val = timeRef.current;

            // Background (CRT Phosphor Fade - Paint semi-transparent black instead of clear)
            ctx.fillStyle = 'rgba(5, 16, 5, 0.2)';
            ctx.fillRect(0, 0, width, height);

            // Grid (Subtle)
            ctx.strokeStyle = 'rgba(10, 50, 10, 0.5)';
            ctx.lineWidth = 1;
            ctx.shadowBlur = 0; // No glow for grid
            ctx.beginPath();
            // Major grid lines
            for (let x = 0; x < width; x += 50) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
            for (let y = 0; y < height; y += 50) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
            ctx.stroke();

            // Center Crosshair
            ctx.strokeStyle = 'rgba(20, 80, 20, 0.8)';
            ctx.beginPath();
            ctx.moveTo(width / 2, 0); ctx.lineTo(width / 2, height);
            ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2);
            ctx.stroke();

            const centerY = height / 2;
            const target = targetParams.current;

            // Difference calculation
            let totalDiff = 0;
            let diffPoints = [];

            // Wave Calculation Loop
            const points = [];
            for (let x = 0; x < width; x += 2) { // Optimization: step 2
                const targetY = centerY + Math.sin((x + target.phase + t_val) * target.freq) * target.amp;
                const playerY = centerY + Math.sin((x + phase + t_val) * freq) * amp;
                const diff = Math.abs(targetY - playerY);

                totalDiff += diff;

                // Visual Noise: Proportional to difference
                const noiseAmt = (diff / 100) * target.noise;
                const noiseY = (Math.random() - 0.5) * noiseAmt * 2;

                points.push({ x, y: targetY + noiseY, diff });
                if (diff > 50) diffPoints.push({ x, y: targetY + noiseY }); // For "bad signal" sparks
            }

            // Draw Main Signal
            const accuracy = Math.max(0, 1 - (totalDiff / (width * 50))); // Normalized accuracy
            const syncColor = accuracy > 0.9 ? '#00ff00' : accuracy > 0.5 ? '#ffff00' : '#ff0000';

            ctx.lineWidth = 3;
            ctx.strokeStyle = syncColor;
            ctx.lineJoin = 'round';
            ctx.shadowBlur = 15;
            ctx.shadowColor = syncColor;

            ctx.beginPath();
            if (points.length > 0) ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.stroke();

            // Draw "Ghost" Player Signal (Guide) slightly visible when tuning
            if (gameState === 'TUNING' && accuracy < 0.8) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.shadowBlur = 0;
                ctx.lineWidth = 1;
                ctx.beginPath();
                for (let x = 0; x < width; x += 4) {
                    const playerY = centerY + Math.sin((x + phase + t_val) * freq) * amp;
                    if (x === 0) ctx.moveTo(x, playerY);
                    else ctx.lineTo(x, playerY);
                }
                ctx.stroke();
            }

            // Image Reveal Effect (Behind the wave)
            if (gameState === 'LOCKED' || accuracy > 0.2) {
                const opacity = gameState === 'LOCKED' ? 1 : accuracy * (Math.random() * 0.5 + 0.2);
                ctx.shadowBlur = 0;
                ctx.globalAlpha = opacity;
                ctx.fillStyle = '#00ff00';
                ctx.font = '20px monospace';
                const text = "SECRET_KEY: 8942-AX";
                const textWidth = ctx.measureText(text).width;
                ctx.fillText(text, width / 2 - textWidth / 2, height / 2 + 80);
                ctx.globalAlpha = 1.0;
            }

            // Lock Logic
            if (gameState === 'TUNING') {
                if (accuracy > 0.90) { // Harder threshold
                    setLockProgress(p => Math.min(100, p + 0.5));
                    if (lockProgress >= 100) handleLock();
                } else {
                    setLockProgress(p => Math.max(0, p - 1));
                }
            }

            frameRef.current = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(frameRef.current);
    }, [freq, amp, phase, gameState, lockProgress]);

    const handleLock = () => {
        setGameState('LOCKED');
        audio.playSuccess();
        setTimeout(() => {
            setGameState('DECRYPTED');
            onComplete(100);
        }, 2000);
    };

    return (
        <div className="h-full flex flex-col bg-gray-950 relative overflow-hidden font-mono select-none">
            <Scanlines />
            <Vignette color="#001000" />
            <Noise opacity={0.1} />

            {/* Header - Added padding-left for global back button */}
            <div className="p-4 pl-16 border-b border-green-900/30 flex justify-between items-center z-10 bg-black/80 backdrop-blur-sm">
                <div className="flex items-center text-green-500">
                    <Radio className="mr-2 animate-pulse" size={18} />
                    <span className="font-bold text-sm tracking-widest">{t('glitch.analyzer')}</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${lockProgress > 0 ? 'bg-green-500 animate-ping' : 'bg-red-500'}`}></div>
                    <div className="text-xs text-gray-500 font-mono">{lockProgress > 0 ? t('glitch.signal_detected') : t('glitch.scanning')}</div>
                </div>
            </div>

            {/* Screen */}
            <div className="flex-1 relative flex items-center justify-center bg-black p-4">
                <div ref={containerRef} className="relative w-full h-full max-w-4xl bg-[#020502] rounded-xl border-4 border-gray-800 shadow-[inset_0_0_50px_rgba(0,50,0,0.8)] overflow-hidden">
                    <canvas
                        ref={canvasRef}
                        className="w-full h-full object-cover"
                    />

                    {/* Overlay UI */}
                    <div className="absolute top-4 right-4 flex flex-col items-end pointer-events-none">
                        <div className="text-[10px] text-green-700 uppercase font-bold mb-1">{t('glitch.decryption_sync')}</div>
                        <div className="w-32 h-2 bg-gray-900 rounded-full overflow-hidden border border-green-900">
                            <div
                                className={`h-full transition-all duration-100 ${lockProgress > 90 ? 'bg-white animate-pulse' : 'bg-green-500'}`}
                                style={{ width: `${lockProgress}%` }}
                            ></div>
                        </div>
                    </div>

                    {gameState === 'LOCKED' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-green-900/40 animate-in zoom-in duration-300 backdrop-blur-sm">
                            <div className="text-center">
                                <Unlock size={64} className="text-white mx-auto mb-4 animate-bounce" />
                                <div className="text-3xl font-black text-white tracking-widest glitch-text">{t('glitch.signal_locked')}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="bg-gray-900 border-t border-green-900/30 p-6 z-20 safe-area-pb">
                <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
                    {/* Frequency */}
                    <div className="flex flex-col items-center space-y-2">
                        <div className="w-12 h-12 rounded-full border-2 border-green-800 flex items-center justify-center bg-black shadow-lg">
                            <Activity size={20} className="text-green-500" />
                        </div>
                        <label className="text-[9px] text-gray-500 font-bold uppercase">{t('glitch.frequency')}</label>
                        <input
                            type="range" min="0.01" max="0.1" step="0.001"
                            value={freq}
                            onChange={(e) => { setFreq(parseFloat(e.target.value)); audio.playClick(); }}
                            className="w-full accent-green-500 h-1 bg-gray-700 rounded-lg cursor-pointer"
                            disabled={gameState !== 'TUNING'}
                        />
                    </div>

                    {/* Amplitude */}
                    <div className="flex flex-col items-center space-y-2">
                        <div className="w-12 h-12 rounded-full border-2 border-green-800 flex items-center justify-center bg-black shadow-lg">
                            <Signal size={20} className="text-green-500" />
                        </div>
                        <label className="text-[9px] text-gray-500 font-bold uppercase">{t('glitch.amplitude')}</label>
                        <input
                            type="range" min="10" max="100" step="1"
                            value={amp}
                            onChange={(e) => { setAmp(parseFloat(e.target.value)); audio.playClick(); }}
                            className="w-full accent-green-500 h-1 bg-gray-700 rounded-lg cursor-pointer"
                            disabled={gameState !== 'TUNING'}
                        />
                    </div>

                    {/* Phase */}
                    <div className="flex flex-col items-center space-y-2">
                        <div className="w-12 h-12 rounded-full border-2 border-green-800 flex items-center justify-center bg-black shadow-lg">
                            <RefreshCw size={20} className="text-green-500" />
                        </div>
                        <label className="text-[9px] text-gray-500 font-bold uppercase">{t('glitch.phase')}</label>
                        <input
                            type="range" min="0" max="100" step="1"
                            value={phase}
                            onChange={(e) => { setPhase(parseFloat(e.target.value)); audio.playClick(); }}
                            className="w-full accent-green-500 h-1 bg-gray-700 rounded-lg cursor-pointer"
                            disabled={gameState !== 'TUNING'}
                        />
                    </div>
                </div>
            </div>

            {gameState === 'DECRYPTED' && (
                <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 animate-in fade-in">
                    <Eye size={64} className="text-green-500 mb-4 animate-pulse" />
                    <h2 className="text-3xl font-black text-white mb-2">{t('glitch.transmission_decoded')}</h2>
                    <div className="text-green-400 font-mono text-sm mb-8 text-center max-w-xs border border-green-900 p-4 rounded bg-green-900/10">
                        {t('games.glitchwaveanalyst.payload_received')}<br />
                        {t('games.glitchwaveanalyst.source_unknown')}<br />
                        {t('games.glitchwaveanalyst.content_ai_blueprint')}</div>
                    <Button variant="primary" onClick={() => onComplete(100)}>{t('glitch.download')}</Button>
                </div>
            )}
        </div>
    );
};
