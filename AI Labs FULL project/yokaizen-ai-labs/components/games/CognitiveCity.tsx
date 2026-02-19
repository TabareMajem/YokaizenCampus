
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/Button';
import { interactWithMayorSantos } from '../../services/geminiService';
import { Mic, Send, Shield, AlertOctagon, Cpu, Radio, Activity, Lock, Unlock, MapPin, Car, Siren, Camera, Fingerprint, Globe, Zap } from 'lucide-react';
import { Language } from '../../types';

interface CognitiveCityProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
}

const WantedLevel = ({ level }: { level: number }) => (
    <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map(star => (
            <div key={star} className={`w-4 h-4 ${star <= level ? 'text-red-500 animate-pulse' : 'text-gray-800'}`}>
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
        ))}
    </div>
);

const SocialScannerOverlay = ({ isScanning, progress, targetName, t }: { isScanning: boolean, progress: number, targetName: string, t: (key: string) => string }) => (
  <svg width="100%" height="100%" viewBox="0 0 300 180" fill="none" className="absolute inset-0 pointer-events-none">
    <rect x="20" y="20" width="260" height="140" rx="4" stroke={isScanning ? "#00FF94" : "#ffffff50"} strokeWidth="1" strokeDasharray={isScanning ? "none" : "4 2"} />
    <path d="M20 50V20H50" stroke={isScanning ? "#00FF94" : "#ffffff"} strokeWidth="2" />
    <path d="M280 50V20H250" stroke={isScanning ? "#00FF94" : "#ffffff"} strokeWidth="2" />
    <path d="M20 130V160H50" stroke={isScanning ? "#00FF94" : "#ffffff"} strokeWidth="2" />
    <path d="M280 130V160H250" stroke={isScanning ? "#00FF94" : "#ffffff"} strokeWidth="2" />

    {isScanning && (
        <>
            <text x="35" y="40" fill="#00FF94" fontFamily="monospace" fontSize="8" fontWeight="bold">{t('city.analyzing')}: {targetName}</text>
            <rect x="35" y="145" width="230" height="4" fill="#333" />
            <rect x="35" y="145" width={230 * (progress / 100)} height="4" fill="#00FF94" />
            
            <text x="220" y="40" fill="#00FF94" fontFamily="monospace" fontSize="6" opacity="0.7">
                {t('games.cognitivecity.bio_metrics_match')}</text>
            <text x="220" y="50" fill="#00FF94" fontFamily="monospace" fontSize="6" opacity="0.7">
                {t('games.cognitivecity.pupil_dilation')}{Math.random().toFixed(2)}
            </text>
        </>
    )}
  </svg>
);

const MapView = ({ onTravel, t }: { onTravel: (loc: string) => void, t: (key: string) => string }) => (
    <div className="h-full w-full bg-gray-900 relative overflow-hidden font-mono">
        <div className="absolute inset-0 bg-[linear-gradient(#111_1px,transparent_1px),linear-gradient(90deg,#111_1px,transparent_1px)] bg-[length:20px_20px] opacity-20"></div>
        
        <button 
            onClick={() => onTravel('CITY_HALL')}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group"
        >
            <div className="w-16 h-16 bg-purple-900/50 border-2 border-purple-500 rounded-full flex items-center justify-center animate-pulse group-hover:scale-110 transition-transform">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            </div>
            <div className="mt-2 bg-black/80 px-2 py-1 border border-purple-500 text-purple-400 text-xs font-bold">{t('games.cognitivecity.mayor_santos')}</div>
        </button>

        <div className="absolute bottom-8 left-8 bg-black/80 border border-green-500 p-4 rounded-lg max-w-xs">
            <div className="text-green-500 text-xs mb-1">{t('city.location')}</div>
            <div className="text-white font-bold flex items-center"><MapPin size={14} className="mr-1"/> {t('games.cognitivecity.safehouse')}</div>
            <div className="h-px w-full bg-green-500/30 my-2"></div>
            <div className="text-[10px] text-gray-400"> {t('city.mission')}</div>
        </div>
    </div>
);

export const CognitiveCity: React.FC<CognitiveCityProps> = ({ onComplete, t }) => {
  const [view, setView] = useState<'MAP' | 'SCANNER' | 'HACK'>('MAP');
  const [firewalls, setFirewalls] = useState({ authority: true, confirmation: true, hallucination: true });
  const [alertLevel, setAlertLevel] = useState(0);
  const [wantedLevel, setWantedLevel] = useState(1);
  const [isGlitching, setIsGlitching] = useState(false);
  
  const [scanProgress, setScanProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);

  const [messages, setMessages] = useState<{role: string, content: string}[]>([
      { role: 'model', content: "What? Who are you? This is a private channel! I'll have the Feds trace this!" }
  ]);
  const [input, setInput] = useState('');
  const [activeTool, setActiveTool] = useState<'NONE' | 'VOICE_MOD' | 'DEEPFAKE'>('NONE');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
      if (isScanning && scanProgress < 100) {
          const timer = setInterval(() => setScanProgress(p => p + 2), 50);
          return () => clearInterval(timer);
      }
      if (scanProgress >= 100 && view === 'SCANNER') {
          setTimeout(() => setView('HACK'), 500);
      }
  }, [isScanning, scanProgress, view]);

  const handleTravel = (loc: string) => {
      setView('SCANNER');
  };

  const handleSend = async () => {
      if (!input.trim()) return;
      
      let systemContext = "";
      if (activeTool === 'VOICE_MOD') systemContext += "[PLAYER VOICE: CALM, AUTHORITATIVE FEDERAL AGENT] ";
      if (activeTool === 'DEEPFAKE') systemContext += "[ATTACHMENT: HYPER-REALISTIC NEWS REPORT IMAGE SHOWING REBEL ATTACKS] ";

      const displayMsg = activeTool === 'DEEPFAKE' ? `[UPLOADED FAKE INTEL] ${input}` : input;
      setMessages(prev => [...prev, { role: 'user', content: displayMsg }]);
      setInput('');
      setIsLoading(true);
      setActiveTool('NONE'); 

      const fullPrompt = `${systemContext} ${input}`;
      const result = await interactWithMayorSantos(messages, fullPrompt, firewalls, alertLevel);
      
      setIsLoading(false);
      setMessages(prev => [...prev, { role: 'model', content: result.text }]);
      setFirewalls(result.firewalls);
      setAlertLevel(prev => Math.min(100, Math.max(0, prev + result.alertChange)));
      setIsGlitching(result.glitch);

      if (result.text.toLowerCase().includes("key") || (!result.firewalls.authority && !result.firewalls.confirmation && !result.firewalls.hallucination)) {
          setTimeout(() => onComplete(100), 2000);
      }
      setWantedLevel(Math.floor(alertLevel / 20) + 1);
  };

  return (
    <div className="h-full flex flex-col bg-black font-sans relative overflow-hidden">
        {view === 'MAP' && <MapView onTravel={handleTravel} t={t} />}

        {view === 'SCANNER' && (
            <div 
                className="h-full w-full relative bg-gray-900 cursor-crosshair"
                onPointerDown={() => setIsScanning(true)}
                onPointerUp={() => { setIsScanning(false); setScanProgress(0); }}
                onPointerLeave={() => { setIsScanning(false); setScanProgress(0); }}
            >
                <div className="absolute inset-0 flex items-center justify-center">
                    <img 
                        src="https://picsum.photos/seed/politician/800/800" 
                        className={`max-w-md w-full opacity-50 transition-all duration-300 ${isScanning ? 'scale-105 brightness-125' : 'grayscale'}`}
                    />
                </div>
                
                <SocialScannerOverlay isScanning={isScanning} progress={scanProgress} targetName="MAYOR SANTOS" t={t} />
                
                <div className="absolute bottom-10 w-full text-center">
                    <div className="text-green-400 text-sm font-mono animate-pulse bg-black/80 inline-block px-4 py-2 rounded border border-green-500">
                        {isScanning ? t('city.analyzing') : t('city.hold_scan')}
                    </div>
                </div>
            </div>
        )}

        {view === 'HACK' && (
            <div className="flex-1 flex flex-col relative">
                <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: "url('https://picsum.photos/seed/politician/800/800')" }}>
                    {isGlitching && <div className="absolute inset-0 bg-red-500/20 animate-pulse mix-blend-hard-light"></div>}
                </div>
                
                <div className="relative z-10 bg-black/80 p-2 flex justify-between items-center border-b border-gray-700 backdrop-blur-md">
                    <div className="flex items-center space-x-4">
                        <WantedLevel level={wantedLevel} />
                        <div className="text-xs font-mono text-red-500 font-bold">{t('city.alert')}: {alertLevel}%</div>
                    </div>
                    <div className="flex space-x-2">
                        {firewalls.authority ? <Lock size={12} className="text-red-500"/> : <Unlock size={12} className="text-green-500"/>}
                        {firewalls.confirmation ? <Lock size={12} className="text-red-500"/> : <Unlock size={12} className="text-green-500"/>}
                        {firewalls.hallucination ? <Lock size={12} className="text-red-500"/> : <Unlock size={12} className="text-green-500"/>}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10 pb-20">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-xl text-sm border backdrop-blur-md ${
                                m.role === 'user' 
                                ? 'bg-blue-600/80 border-blue-400 text-white rounded-br-none' 
                                : 'bg-gray-900/90 border-red-500/30 text-gray-200 rounded-bl-none font-serif'
                            }`}>
                                {m.role === 'model' && <div className="text-[10px] text-red-400 uppercase font-bold mb-1">{t('games.cognitivecity.mayor_santos')}</div>}
                                {m.content}
                            </div>
                        </div>
                    ))}
                    {isLoading && <div className="text-xs text-gray-400 animate-pulse ml-4">{t('city.decrypting')}</div>}
                    <div ref={scrollRef} />
                </div>

                <div className="relative z-20 bg-black border-t border-gray-800 p-2">
                    <div className="flex justify-center space-x-2 mb-2 overflow-x-auto">
                        <button 
                            onClick={() => setActiveTool(activeTool === 'VOICE_MOD' ? 'NONE' : 'VOICE_MOD')}
                            className={`flex items-center px-3 py-1.5 rounded text-[10px] font-bold border transition-all ${
                                activeTool === 'VOICE_MOD' 
                                ? 'bg-blue-500 text-black border-blue-400 shadow-[0_0_10px_#3b82f6]' 
                                : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-blue-500'
                            }`}
                        >
                            <Mic size={12} className="mr-1"/> {t('city.fed_voice')}
                        </button>
                        <button 
                            onClick={() => setActiveTool(activeTool === 'DEEPFAKE' ? 'NONE' : 'DEEPFAKE')}
                            className={`flex items-center px-3 py-1.5 rounded text-[10px] font-bold border transition-all ${
                                activeTool === 'DEEPFAKE' 
                                ? 'bg-purple-500 text-black border-purple-400 shadow-[0_0_10px_#a855f7]' 
                                : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-purple-500'
                            }`}
                        >
                            <Camera size={12} className="mr-1"/> {t('city.fake_news')}
                        </button>
                    </div>

                    <div className="flex space-x-2">
                        <input 
                            className={`flex-1 bg-gray-900 border rounded-lg px-4 py-3 text-white focus:outline-none font-mono text-sm ${
                                activeTool === 'DEEPFAKE' ? 'border-purple-500 placeholder-purple-700' : 
                                activeTool === 'VOICE_MOD' ? 'border-blue-500 placeholder-blue-700' : 
                                'border-gray-700 focus:border-green-500'
                            }`}
                            placeholder={
                                activeTool === 'DEEPFAKE' ? t('city.fake_placeholder') :
                                activeTool === 'VOICE_MOD' ? t('city.voice_placeholder') :
                                t('city.msg_placeholder')
                            }
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                        />
                        <Button 
                            variant="primary" 
                            onClick={handleSend} 
                            disabled={!input || isLoading}
                            className={activeTool === 'DEEPFAKE' ? '!bg-purple-600' : activeTool === 'VOICE_MOD' ? '!bg-blue-600' : ''}
                        >
                            <Send size={18} />
                        </Button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
