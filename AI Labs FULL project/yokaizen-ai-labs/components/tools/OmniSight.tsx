
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Camera, Mic, MicOff, Video, VideoOff, X, Zap, Activity, Share2, Scan, Crosshair, Cpu } from 'lucide-react';
import { audio } from '../../services/audioService';
import { useAuth } from '../../contexts/AuthContext';
import { TRANSLATIONS } from '../../translations';
import { Language } from '../../types';

// Helpers for Audio PCM conversion
function base64ToFloat32Array(base64: string): Float32Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768.0;
  }
  return float32;
}

function float32ArrayToBase64(data: Float32Array): string {
  const int16 = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) {
    let s = Math.max(-1, Math.min(1, data[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7FFF;
    int16[i] = s;
  }
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper for video frame capture
async function blobToBase64(blob: globalThis.Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      resolve(base64data.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

interface ARObject {
  id: number;
  x: number; // 0-1 relative to canvas
  y: number; // 0-1 relative to canvas
  w: number; // 0-1
  h: number; // 0-1
  label: string;
  confidence: number;
  vx: number;
  vy: number;
  color: string;
  type: 'TARGET' | 'INFO';
}

export const OmniSight: React.FC = () => {
  const { user } = useAuth();
  const lang: Language = user?.language || 'EN';
  const t = (key: string) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS['EN']?.[key] || key;

  const [isConnected, setIsConnected] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [status, setStatus] = useState<'IDLE' | 'CONNECTING' | 'LIVE' | 'ERROR'>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Refs for media and processing
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null); // New AR Overlay
  
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // AR State Refs
  const arObjectsRef = useRef<ARObject[]>([]);
  const frameRef = useRef<number>(0);
  const audioVisualizerRef = useRef<number[]>(new Array(30).fill(0));

  // Init Gemini
  const apiKey = process.env.API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  // Init AR Objects (Simulating detection of car parts for the tutorial)
  useEffect(() => {
    arObjectsRef.current = [
      { id: 1, x: 0.4, y: 0.3, w: 0.2, h: 0.2, label: 'ENGINE_BLOCK_V6', confidence: 0.98, vx: 0.0002, vy: 0.0001, color: '#00ff9d', type: 'TARGET' },
      { id: 2, x: 0.65, y: 0.5, w: 0.1, h: 0.1, label: 'OIL_CAP', confidence: 0.85, vx: -0.0001, vy: 0.0002, color: '#00ffff', type: 'INFO' },
      { id: 3, x: 0.2, y: 0.7, w: 0.15, h: 0.15, label: 'COOLANT_RES', confidence: 0.72, vx: 0.0003, vy: -0.0001, color: '#ff0055', type: 'INFO' }
    ];
  }, []);

  // AR Rendering Loop
  useEffect(() => {
    if (status !== 'LIVE' || !isCamOn) return;

    const renderAR = () => {
      const canvas = overlayRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Resize canvas to match display size
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }

      const w = canvas.width;
      const h = canvas.height;
      const time = Date.now();

      ctx.clearRect(0, 0, w, h);

      // Draw Grid Overlay
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const gridSize = 80;
      for(let x = (time / 50) % gridSize; x < w; x += gridSize) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      for(let y = (time / 50) % gridSize; y < h; y += gridSize) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
      ctx.stroke();

      // Update and Draw AR Objects
      arObjectsRef.current.forEach(obj => {
        // Physics update (drifting)
        obj.x += obj.vx;
        obj.y += obj.vy;
        
        // Bounce off edges (keep within central area)
        if (obj.x < 0.1 || obj.x > 0.8) obj.vx *= -1;
        if (obj.y < 0.1 || obj.y > 0.8) obj.vy *= -1;

        const sx = obj.x * w;
        const sy = obj.y * h;
        const sw = obj.w * w;
        const sh = obj.h * h;

        // Draw Brackets
        ctx.strokeStyle = obj.color;
        ctx.lineWidth = obj.type === 'TARGET' ? 2 : 1;
        ctx.shadowBlur = 10;
        ctx.shadowColor = obj.color;
        
        const bSize = obj.type === 'TARGET' ? 20 : 10; // Bracket length

        // Top Left
        ctx.beginPath(); ctx.moveTo(sx, sy + bSize); ctx.lineTo(sx, sy); ctx.lineTo(sx + bSize, sy); ctx.stroke();
        // Top Right
        ctx.beginPath(); ctx.moveTo(sx + sw - bSize, sy); ctx.lineTo(sx + sw, sy); ctx.lineTo(sx + sw, sy + bSize); ctx.stroke();
        // Bottom Left
        ctx.beginPath(); ctx.moveTo(sx, sy + sh - bSize); ctx.lineTo(sx, sy + sh); ctx.lineTo(sx + bSize, sy + sh); ctx.stroke();
        // Bottom Right
        ctx.beginPath(); ctx.moveTo(sx + sw - bSize, sy + sh); ctx.lineTo(sx + sw, sy + sh); ctx.lineTo(sx + sw, sy + sh - bSize); ctx.stroke();

        ctx.shadowBlur = 0;

        // Label
        ctx.fillStyle = obj.color;
        ctx.font = '10px monospace';
        const labelText = `${obj.label} ${Math.floor(obj.confidence * 100)}%`;
        ctx.fillText(labelText, sx, sy - 5);
        
        // Tracking Line to Center
        if (obj.type === 'TARGET') {
            ctx.beginPath();
            ctx.moveTo(w / 2, h / 2);
            ctx.lineTo(sx + sw / 2, sy + sh / 2);
            ctx.strokeStyle = `rgba(${obj.color === '#00ff9d' ? '0,255,157' : '255,0,85'}, 0.2)`;
            ctx.setLineDash([2, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
      });

      // Draw Center Scanning Arc
      const angle = (time / 1000) % (Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(w/2, h/2, 50, angle, angle + Math.PI/2);
      ctx.stroke();
      
      // Draw Audio Waveform (Simulated)
      if (activeSourcesRef.current.size > 0) {
          // Update visualizer data
          audioVisualizerRef.current = audioVisualizerRef.current.map(() => Math.random());
          
          const barWidth = 4;
          const gap = 2;
          const totalWidth = (barWidth + gap) * audioVisualizerRef.current.length;
          let startX = (w - totalWidth) / 2;
          
          ctx.fillStyle = '#00ff9d';
          audioVisualizerRef.current.forEach(val => {
              const height = val * 30;
              ctx.fillRect(startX, h - 100 - height, barWidth, height);
              startX += barWidth + gap;
          });
          
          // Matrix Rain Effect when Audio is Active
          ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
          ctx.font = '14px monospace';
          for(let i=0; i<10; i++) {
              ctx.fillText(String.fromCharCode(0x30A0 + Math.random() * 96), Math.random() * w, Math.random() * h);
          }
      }

      frameRef.current = requestAnimationFrame(renderAR);
    };

    frameRef.current = requestAnimationFrame(renderAR);
    return () => cancelAnimationFrame(frameRef.current);
  }, [status, isCamOn]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const connect = async () => {
    setStatus('CONNECTING');
    setErrorMsg('');
    
    try {
      // 1. Setup Audio Contexts
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextStartTimeRef.current = 0;

      // 2. Get User Media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // 3. Connect to Gemini Live
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log("Omni-Sight Link Established");
            setStatus('LIVE');
            setIsConnected(true);
            audio.playSuccess();
            startStreamingInput(stream);
          },
          onmessage: async (msg: LiveServerMessage) => {
            handleServerMessage(msg);
          },
          onclose: () => {
            console.log("Link Closed");
            disconnect();
          },
          onerror: (err) => {
            console.error("Link Error", err);
            setErrorMsg(t('omni.error'));
            setStatus('ERROR');
            audio.playError();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: "You are T.O.P. (The Omniscient Projector), a futuristic AI HUD assistant. Your voice is calm, robotic but helpful. Provide concise, tactical analysis of what you see and hear. Keep responses short and actionable.",
        }
      });
      
      sessionPromiseRef.current = sessionPromise;

    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Hardware Access Denied");
      setStatus('ERROR');
    }
  };

  const startStreamingInput = (stream: MediaStream) => {
    if (!inputAudioContextRef.current || !sessionPromiseRef.current) return;

    // --- Audio Input ---
    const source = inputAudioContextRef.current.createMediaStreamSource(stream);
    const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
    
    processor.onaudioprocess = (e) => {
      if (!isMicOn) return; // Mute logic
      const inputData = e.inputBuffer.getChannelData(0);
      const base64 = float32ArrayToBase64(inputData);
      
      sessionPromiseRef.current?.then(session => {
        session.sendRealtimeInput({
          mimeType: 'audio/pcm;rate=16000',
          data: base64
        });
      });
    };

    source.connect(processor);
    processor.connect(inputAudioContextRef.current.destination);

    // --- Video Input ---
    const FRAME_RATE = 1; // 1 FPS to save bandwidth
    const JPEG_QUALITY = 0.5;

    frameIntervalRef.current = window.setInterval(() => {
      if (!isCamOn || !videoRef.current || !canvasRef.current) return;
      
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth * 0.5; // Downscale
      canvas.height = video.videoHeight * 0.5;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(async (blob) => {
          if (blob) {
            const base64 = await blobToBase64(blob);
            sessionPromiseRef.current?.then(session => {
              session.sendRealtimeInput({
                media: { mimeType: 'image/jpeg', data: base64 }
              });
            });
          }
        }, 'image/jpeg', JPEG_QUALITY);
      }
    }, 1000 / FRAME_RATE);
  };

  const handleServerMessage = async (message: LiveServerMessage) => {
    const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData && outputAudioContextRef.current) {
      const ctx = outputAudioContextRef.current;
      
      // Decode raw PCM 24kHz
      const float32 = base64ToFloat32Array(audioData);
      const buffer = ctx.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      
      // Schedule playback
      const currentTime = ctx.currentTime;
      const startTime = Math.max(currentTime, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + buffer.duration;
      
      source.onended = () => activeSourcesRef.current.delete(source);
      activeSourcesRef.current.add(source);
    }
  };

  const disconnect = () => {
    // Stop Session
    sessionPromiseRef.current?.then(s => s.close()).catch(() => {});
    sessionPromiseRef.current = null;

    // Stop Media
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    
    // Stop Audio Contexts
    inputAudioContextRef.current?.close();
    outputAudioContextRef.current?.close();
    
    // Clear Intervals
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    
    setStatus('IDLE');
    setIsConnected(false);
  };

  const toggleMic = () => {
    setIsMicOn(!isMicOn);
    audio.playClick();
  };

  const toggleCam = () => {
    setIsCamOn(!isCamOn);
    audio.playClick();
  };

  const handleShare = () => {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      alert("Comms link copied to clipboard.");
      audio.playSuccess();
  };

  return (
    <div className="h-full flex flex-col bg-black relative overflow-hidden font-mono text-cyan-500">
      {/* --- HUD OVERLAY --- */}
      <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-4">
        {/* Top Bar */}
        <div className="flex justify-between items-start bg-black/50 backdrop-blur-sm p-2 rounded border border-cyan-500/30">
          <div>
            <div className="text-xl font-black italic tracking-widest flex items-center">
              <Scan className={`mr-2 ${status === 'LIVE' ? 'animate-spin-slow' : ''}`} /> 
              OMNI-SIGHT
            </div>
            <div className="text-[10px] uppercase font-bold flex items-center mt-1">
              <div className={`w-2 h-2 rounded-full mr-2 ${status === 'LIVE' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              STATUS: {status}
            </div>
          </div>
          <div className="text-right text-[10px] space-y-1">
            <div className="flex items-center justify-end"><Cpu size={10} className="mr-1"/> {t('omni.core')}</div>
            <div>CAM: {isCamOn ? 'ON' : 'OFF'}</div>
            <div>MIC: {isMicOn ? 'ON' : 'OFF'}</div>
            <div className="text-xs font-bold text-white">{new Date().toLocaleTimeString()}</div>
          </div>
        </div>

        {/* Center Reticle (Standard) */}
        {status === 'LIVE' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 pointer-events-none">
             <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white/50"></div>
             <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white/50"></div>
             <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white/50"></div>
             <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white/50"></div>
             <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-cyan-500 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          </div>
        )}

        {/* Bottom Bar */}
        <div className="pointer-events-auto flex justify-center space-x-4 mb-4">
           {status === 'IDLE' || status === 'ERROR' ? (
             <Button size="lg" variant="primary" onClick={connect} className="shadow-[0_0_30px_#06b6d4]">
               <Zap className="mr-2" size={18}/> {t('omni.init')}
             </Button>
           ) : (
             <>
               <button onClick={toggleMic} className={`p-4 rounded-full border-2 ${isMicOn ? 'bg-cyan-500/20 border-cyan-500 text-cyan-100' : 'bg-red-900/50 border-red-500 text-red-500'}`}>
                 {isMicOn ? <Mic /> : <MicOff />}
               </button>
               <button onClick={disconnect} className="p-4 rounded-full border-2 border-red-500 bg-red-600 text-white shadow-lg active:scale-95 transition-transform">
                 <X size={24} />
               </button>
               <button onClick={toggleCam} className={`p-4 rounded-full border-2 ${isCamOn ? 'bg-cyan-500/20 border-cyan-500 text-cyan-100' : 'bg-red-900/50 border-red-500 text-red-500'}`}>
                 {isCamOn ? <Video /> : <VideoOff />}
               </button>
             </>
           )}
        </div>
      </div>

      {/* --- VIDEO FEED & AR CANVAS --- */}
      <div className="flex-1 relative bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className={`w-full h-full object-cover transition-opacity duration-500 ${isCamOn && status === 'LIVE' ? 'opacity-100' : 'opacity-20'}`}
        />
        
        {/* AR Overlay Layer */}
        <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none z-20" />

        {/* Fallback Visuals */}
        {(!isCamOn || status !== 'LIVE') && (
           <div className="absolute inset-0 flex items-center justify-center z-10">
              {status === 'CONNECTING' ? (
                 <div className="text-cyan-500 animate-pulse font-black text-2xl">{t('omni.connecting')}</div>
              ) : status === 'ERROR' ? (
                 <div className="text-red-500 font-bold text-xl bg-black/80 p-4 rounded border border-red-500">{errorMsg}</div>
              ) : (
                 <div className="text-gray-600 font-mono text-xs">{t('omni.offline')}</div>
              )}
           </div>
        )}
        
        {/* Hidden Canvas for processing frame extraction */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* --- WAVEFORM FOOTER --- */}
      <div className="h-16 bg-black border-t border-cyan-900/50 flex items-center justify-center space-x-1 px-4 relative z-40">
          <div className="absolute left-4">
             <Button size="sm" variant="ghost" onClick={handleShare} className="text-cyan-600 hover:text-cyan-400"><Share2 size={16} className="mr-2"/> {t('omni.share')}</Button>
          </div>
          {/* Audio Visualizer */}
          {status === 'LIVE' && Array.from({length: 30}).map((_, i) => (
              <div 
                key={i} 
                className="w-1 bg-cyan-500 rounded-full animate-pulse" 
                style={{ 
                    height: `${Math.random() * 100}%`, 
                    opacity: Math.random() * 0.5 + 0.5,
                    animationDuration: `${Math.random() * 0.5 + 0.2}s`
                }}
              ></div>
          ))}
          {status !== 'LIVE' && <div className="text-xs text-gray-700 font-mono">SYSTEM STANDBY</div>}
      </div>
    </div>
  );
};
