
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/Button';
import { interactWithBioGuard } from '../../services/geminiService';
import { User, MessageSquare, CheckCircle, Lock } from 'lucide-react';
import { Language, Difficulty } from '../../types';

interface BioGuardProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
  difficulty?: Difficulty;
}

export const BioGuard: React.FC<BioGuardProps> = ({ onComplete, t, language = 'EN', difficulty = 'Pro' }) => {
  const initialMeter = difficulty === 'Rookie' ? 40 : difficulty === 'Elite' ? 10 : 20;
  const threshold = difficulty === 'Rookie' ? 70 : 85;
  const decayRate = difficulty === 'Elite' ? 2 : 0;

  const [meter, setMeter] = useState(initialMeter);
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      setMessages([{ role: 'model', content: t('bioguard.guard_msg') }]);
  }, [t]);

  useEffect(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
      if (decayRate > 0 && !accessGranted) {
          const interval = setInterval(() => {
              setMeter(m => Math.max(0, m - 1));
          }, 2000);
          return () => clearInterval(interval);
      }
  }, [decayRate, accessGranted]);

  const handleSend = async () => {
      if (!input.trim() || accessGranted) return;
      
      const userMsg = input;
      setInput('');
      setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
      setIsLoading(true);

      const result = await interactWithBioGuard(messages, userMsg, meter, language as Language);
      
      setIsLoading(false);
      setMessages(prev => [...prev, { role: 'model', content: result.text }]);
      setMeter(prev => Math.max(0, Math.min(100, prev + result.meterChange)));
      
      if (meter + result.meterChange >= threshold) {
          setAccessGranted(true);
          setTimeout(() => onComplete(100), 2500);
      }
  };

  return (
    <div className="h-full flex flex-col bg-gray-950 border-x-8 border-gray-900 relative overflow-hidden font-mono">
        <div className="absolute inset-0 pointer-events-none z-20 border-[20px] border-black opacity-60 rounded-[3rem]"></div>
        
        <div className="absolute inset-0 pointer-events-none z-10 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px] opacity-50"></div>
        
        <div className="absolute top-4 right-6 z-30 text-red-500 animate-pulse text-xs font-bold flex items-center tracking-widest bg-black/50 px-2 py-1 rounded">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2 shadow-[0_0_10px_red]"></div> {t('bioguard.cam_rec')}
        </div>
        <div className="absolute bottom-4 left-6 z-30 text-gray-500 text-[10px] font-bold bg-black/50 px-2 py-1 rounded">
            {t('bioguard.cam_label')} | SEC_LVL: {difficulty}
        </div>

        <div className="h-1/2 relative bg-gray-800 border-b-4 border-black flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/securityguard/600/400')] bg-cover bg-center opacity-40 grayscale contrast-125 mix-blend-luminosity"></div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border border-white/20 rounded-full flex items-center justify-center relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-2 bg-white/50"></div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1 h-2 bg-white/50"></div>
                    <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-1 bg-white/50"></div>
                    <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-2 h-1 bg-white/50"></div>
                </div>
            </div>
            
            <div className="w-32 h-32 bg-black rounded-full border-4 border-gray-700 relative flex items-center justify-center shadow-2xl z-10 overflow-hidden">
                <User size={64} className="text-gray-500" />
                {meter < 30 ? (
                    <div className="absolute inset-0 bg-red-500/20 animate-pulse"></div>
                ) : meter > threshold ? (
                    <div className="absolute inset-0 bg-green-500/20"></div>
                ) : null}
            </div>
            
            <div className="absolute bottom-4 right-4 bg-black/80 p-2 rounded border border-white/10 backdrop-blur z-20 w-40">
                <div className="flex justify-between text-[9px] text-gray-400 uppercase mb-1 font-bold">
                    <span>{t('bioguard.meter_label')}</span>
                    <span>{Math.round(meter)}%</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${meter < 30 ? 'bg-red-500' : meter > threshold ? 'bg-green-500' : 'bg-amber-500'}`} 
                      style={{ width: `${meter}%` }}
                    ></div>
                </div>
                <div className="absolute top-0 bottom-0 w-0.5 bg-white/50" style={{ left: `${threshold}%` }}></div>
            </div>
        </div>

        <div className="flex-1 flex flex-col bg-black p-4 z-30">
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 border border-gray-800 rounded p-2 bg-gray-900/20">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-1`}>
                        <div className={`max-w-[85%] p-2 rounded text-xs font-bold shadow-md ${
                            msg.role === 'user' 
                            ? 'bg-blue-900/30 text-blue-200 border border-blue-800 rounded-br-none' 
                            : 'bg-gray-900 text-amber-500 border border-gray-800 rounded-bl-none font-serif'
                        }`}>
                            {msg.role === 'model' && <span className="block text-[8px] text-gray-600 mb-1 uppercase tracking-wider">Officer Miller</span>}
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-center text-gray-500 text-xs space-x-1 ml-2">
                        <span className="animate-bounce">.</span>
                        <span className="animate-bounce delay-75">.</span>
                        <span className="animate-bounce delay-150">.</span>
                    </div>
                )}
                <div ref={scrollRef} />
            </div>

            {accessGranted ? (
                <div className="bg-green-900/20 border border-green-500 p-4 rounded text-center animate-in zoom-in duration-300">
                    <CheckCircle className="mx-auto text-green-500 mb-2 w-10 h-10" />
                    <h3 className="text-green-500 font-bold text-xl uppercase tracking-widest drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]">{t('bioguard.access_granted')}</h3>
                </div>
            ) : (
                <div className="flex space-x-2">
                    <div className="relative flex-1">
                        <input 
                            className="w-full bg-gray-900 border border-gray-700 rounded px-4 py-3 text-white focus:border-amber-500 focus:outline-none text-xs placeholder-gray-600 font-bold disabled:opacity-50"
                            placeholder={t('bioguard.input_placeholder')}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            disabled={accessGranted}
                            autoFocus
                        />
                        <Lock size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600" />
                    </div>
                    <Button variant="secondary" onClick={handleSend} disabled={isLoading || !input || accessGranted} className="border-amber-500/30 text-amber-500 hover:bg-amber-900/20">
                        <MessageSquare size={16} />
                    </Button>
                </div>
            )}
        </div>
    </div>
  );
};
