






import React, { useEffect, useState } from 'react';
import { AlertTriangle, WifiOff, Database, ShieldAlert } from 'lucide-react';
import { CollapseEvent } from '../types';
import { TERMS } from '../translations';
import { Language } from '../types';

interface ChaosOverlayProps {
  event: CollapseEvent | null;
  onResolve: () => void;
  language?: Language;
}

export const ChaosOverlay: React.FC<ChaosOverlayProps> = ({ event, onResolve, language = Language.EN }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const T = TERMS[language];

  useEffect(() => {
    if (event) {
      setTimeLeft(event.duration);
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            onResolve();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [event, onResolve]);

  if (!event) return null;

  const getIcon = () => {
    switch (event.type) {
      case 'API_FAILURE': return <WifiOff className="w-16 h-16 text-red-500 animate-pulse" />;
      case 'DATA_CORRUPTION': return <Database className="w-16 h-16 text-amber-500 animate-bounce" />;
      case 'SECURITY_BREACH': return <ShieldAlert className="w-16 h-16 text-rose-600 animate-ping" />;
      default: return <AlertTriangle className="w-16 h-16 text-red-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-red-950/40 backdrop-blur-sm flex items-center justify-center pointer-events-none">
      <div className="bg-black border-4 border-red-600 p-8 max-w-lg text-center shadow-[0_0_100px_rgba(220,38,38,0.5)] animate-in zoom-in duration-200 pointer-events-auto">
        <div className="flex justify-center mb-6">
          {getIcon()}
        </div>
        <h2 className="text-4xl font-black text-red-500 tracking-widest uppercase mb-2 animate-pulse">
          {T.CHAOS_ALERT}
        </h2>
        <div className="bg-red-900/20 border border-red-500/50 p-4 mb-6">
          <p className="text-white font-mono text-lg">{event.message}</p>
        </div>
        <div className="text-red-400 font-mono text-sm mb-6">
          {T.AFFECTED_SYSTEMS}: {event.affectedNodeTypes.join(', ')}
        </div>
        
        <div className="w-full bg-red-900/30 h-4 rounded-full overflow-hidden border border-red-900">
          <div 
            className="h-full bg-red-600 transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / event.duration) * 100}%` }}
          />
        </div>
        <div className="mt-2 text-red-500 font-bold text-xs tracking-widest">
          {T.REBOOT_IN} {timeLeft}s
        </div>

        <button 
          onClick={onResolve}
          className="mt-8 px-6 py-3 bg-red-600 hover:bg-red-500 text-black font-bold uppercase tracking-widest rounded transition-all hover:scale-105"
        >
          {T.EMERGENCY_PATCH}
        </button>
      </div>
    </div>
  );
};
