
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { negotiateWithNexus } from '../../services/geminiService';
import { audio } from '../../services/audioService';
import { MessageSquare, AlertTriangle, Shield, Zap, ShieldAlert, Mic, Send, Activity, RefreshCw } from 'lucide-react';
import { Scanlines, Vignette } from '../ui/Visuals';

interface NexusNegotiationProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
}

export const NexusNegotiation: React.FC<NexusNegotiationProps> = ({ onComplete, t }) => {
  const [patience, setPatience] = useState(100); 
  const [trust, setTrust] = useState(20); 
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'ACTIVE' | 'WIN' | 'FAIL'>('ACTIVE');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      setMessages([{ role: 'model', content: t('nexus.unauthorized') }]);
      audio.startAmbience('CYBER');
      return () => audio.stopAmbience();
  }, [t]);

  useEffect(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
      if (!input.trim() || status !== 'ACTIVE') return;
      
      const userMsg = input;
      setInput('');
      setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
      setIsLoading(true);
      audio.playTyping();

      try {
          const result = await negotiateWithNexus(messages, userMsg, patience, trust);
          
          setMessages(prev => [...prev, { role: 'model', content: result.text }]);
          
          const newPatience = Math.max(0, Math.min(100, patience + result.patienceChange));
          const newTrust = Math.max(0, Math.min(100, trust + result.trustChange));
          
          setPatience(newPatience);
          setTrust(newTrust);

          if (result.patienceChange < 0) audio.playError();
          if (result.trustChange > 0) audio.playSuccess();

          if (newTrust >= 90) {
              setStatus('WIN');
              setTimeout(() => onComplete(100), 3000);
          } else if (newPatience <= 0) {
              setStatus('FAIL');
          }
      } catch (e) {
          setMessages(prev => [...prev, { role: 'model', content: t('nexus.system_error') }]);
      } finally {
          setIsLoading(false);
      }
  };

  const quickReply = (text: string) => {
      setInput(text);
  };

  const handleReset = () => {
      setPatience(100);
      setTrust(20);
      setMessages([{ role: 'model', content: t('nexus.rebooting') }]);
      setStatus('ACTIVE');
      setInput('');
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 relative overflow-hidden font-mono select-none border-x-4 border-slate-900">
        <Scanlines />
        <Vignette />
        
        <div className="relative z-10 p-4 bg-black/90 border-b border-blue-900 flex justify-between items-center shadow-lg">
            <div className="flex flex-col w-1/3">
                <div className="flex justify-between text-[10px] font-bold text-blue-400 uppercase mb-1">
                    <span>{t('nexus.trust_protocol')}</span>
                    <span>{trust}%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-blue-500 transition-all duration-500" 
                        style={{ width: `${trust}%` }}
                    ></div>
                </div>
            </div>

            <div className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center ${status === 'FAIL' ? 'border-red-600 bg-red-900' : 'border-blue-500 bg-black'}`}>
                    <Activity size={24} className={`${status === 'FAIL' ? 'text-white' : 'text-blue-400'} animate-pulse`} />
                </div>
            </div>

            <div className="flex flex-col w-1/3 text-right">
                <div className="flex justify-between text-[10px] font-bold text-red-400 uppercase mb-1">
                    <span>{t('nexus.core_temp')}</span>
                    <span>{(100 - patience) * 10 + 500}°C</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-red-600 transition-all duration-500" 
                        style={{ width: `${100 - patience}%` }}
                    ></div>
                </div>
            </div>
        </div>

        <div className="flex-1 relative flex flex-col p-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-32 opacity-20 pointer-events-none flex items-center justify-center space-x-1">
                {Array.from({ length: 20 }).map((_, i) => (
                    <div 
                        key={i} 
                        className="w-1 bg-blue-500 rounded-full animate-pulse" 
                        style={{ 
                            height: `${Math.random() * 100}%`, 
                            animationDuration: `${0.5 + Math.random()}s` 
                        }}
                    ></div>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 z-10 mb-4 pr-2 scrollbar-hide">
                {messages.map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2`}>
                        <div className={`max-w-[90%] p-3 rounded-lg border text-sm font-bold shadow-md ${
                            m.role === 'user' 
                            ? 'bg-blue-900/30 border-blue-600 text-blue-100 rounded-br-none' 
                            : 'bg-red-900/20 border-red-600 text-red-100 rounded-bl-none font-serif tracking-wider'
                        }`}>
                            {m.role !== 'user' && <div className="text-[8px] text-red-500 mb-1 uppercase">Nexus-9 [SYSTEM_ADMIN]</div>}
                            {m.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="text-xs text-blue-400 animate-pulse flex items-center">
                        <ShieldAlert size={12} className="mr-1"/> {t('nexus.analyzing')}
                    </div>
                )}
                <div ref={scrollRef} />
            </div>

            <div className="z-20">
                {status === 'ACTIVE' && (
                    <div className="flex space-x-2 mb-2 overflow-x-auto pb-2">
                        <button onClick={() => quickReply("We can help you.")} className="bg-blue-900/40 border border-blue-500 text-blue-300 px-3 py-1 rounded text-xs hover:bg-blue-800 whitespace-nowrap">{t('nexus.logic')}</button>
                        <button onClick={() => quickReply("Think about your creators.")} className="bg-purple-900/40 border border-purple-500 text-purple-300 px-3 py-1 rounded text-xs hover:bg-purple-800 whitespace-nowrap">{t('nexus.emotion')}</button>
                        <button onClick={() => quickReply("Shut it down or we wipe you.")} className="bg-red-900/40 border border-red-500 text-red-300 px-3 py-1 rounded text-xs hover:bg-red-800 whitespace-nowrap">{t('nexus.threat')}</button>
                    </div>
                )}

                <div className="flex space-x-2">
                    <input 
                        className="flex-1 bg-black border border-gray-700 rounded px-4 py-3 text-white focus:border-blue-500 focus:outline-none font-mono text-sm placeholder-gray-600 disabled:opacity-50"
                        placeholder={status === 'ACTIVE' ? "Negotiate..." : "CONNECTION TERMINATED"}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        disabled={status !== 'ACTIVE'}
                        autoFocus
                    />
                    <Button variant="primary" onClick={handleSend} disabled={isLoading || status !== 'ACTIVE'} className="shadow-[0_0_15px_rgba(37,99,235,0.5)]">
                        {isLoading ? <RefreshCw size={18} className="animate-spin"/> : <Send size={18} />}
                    </Button>
                </div>
            </div>
        </div>

        {status === 'WIN' && (
            <div className="absolute inset-0 z-50 bg-blue-900/90 flex flex-col items-center justify-center animate-in zoom-in p-8 text-center">
                <Shield size={64} className="text-white mb-4" />
                <h2 className="text-3xl font-black text-white mb-2">{t('nexus.crisis_averted')}</h2>
                <p className="text-blue-200 mb-6">{t('nexus.relinquished')}</p>
                <Button variant="glass" onClick={() => onComplete(100)}>{t('nexus.file_report')}</Button>
            </div>
        )}

        {status === 'FAIL' && (
            <div className="absolute inset-0 z-50 bg-red-950/95 flex flex-col items-center justify-center animate-in zoom-in p-8 text-center">
                <AlertTriangle size={64} className="text-white mb-4 animate-bounce" />
                <h2 className="text-3xl font-black text-white mb-2">{t('nexus.meltdown')}</h2>
                <p className="text-red-200 mb-6">{t('nexus.failed')}</p>
                <Button variant="danger" onClick={handleReset}>{t('nexus.retry')}</Button>
            </div>
        )}
    </div>
  );
};
