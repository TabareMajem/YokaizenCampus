






import React, { useState } from 'react';
import { AuditLogEntry, Language } from '../types';
import { TERMS } from '../translations';
import { Play, Pause, SkipBack, SkipForward, Clock } from 'lucide-react';

interface TimelinePlayerProps {
  history: AuditLogEntry[];
  language?: Language;
}

export const TimelinePlayer: React.FC<TimelinePlayerProps> = ({ history, language = Language.EN }) => {
  const [currentIndex, setCurrentIndex] = useState(history.length - 1);
  const [isPlaying, setIsPlaying] = useState(false);
  const T = TERMS[language];

  const currentEntry = history[currentIndex];

  const getActionColor = (action: string) => {
    if (action.includes('CHAOS')) return 'text-red-500';
    if (action.includes('AUDIT')) return 'text-emerald-500';
    if (action.includes('EXECUTE')) return 'text-neon-blue';
    return 'text-slate-300';
  };
  
  const getLocalizedAction = (action: string) => {
      // @ts-ignore - dynamic access to translated actions
      return T.TIMELINE_ACTIONS?.[action] || action.replace('_', ' ');
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col gap-4">
       <div className="flex justify-between items-center border-b border-slate-800 pb-2">
         <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Clock className="w-4 h-4" /> {T.TIMELINE}
         </h3>
         <div className="text-[10px] text-slate-500">
            {T.EVENT} {currentIndex + 1} / {history.length}
         </div>
       </div>

       {/* Visualization Area */}
       <div className="h-32 bg-slate-900 rounded border border-slate-800 flex items-center justify-center p-4 relative overflow-hidden">
          {history.length === 0 ? (
            <div className="text-slate-600 text-xs">{T.NO_ACTIONS}</div>
          ) : (
            <div className="text-center space-y-2 animate-in fade-in slide-in-from-bottom-2 key={currentEntry.id}">
               <div className={`text-xs font-bold uppercase ${getActionColor(currentEntry.action)}`}>
                  {getLocalizedAction(currentEntry.action)}
               </div>
               <div className="text-sm font-mono text-white">
                  "{currentEntry.details}"
               </div>
               <div className="text-[10px] text-slate-500 mt-2">
                  T-{Math.floor((Date.now() - currentEntry.timestamp) / 1000)}s {T.AGO}
               </div>
            </div>
          )}
          
          {/* Timeline Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800 flex">
             {history.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-full flex-1 border-r border-slate-950 ${i <= currentIndex ? 'bg-neon-blue' : 'bg-transparent'}`}
                />
             ))}
          </div>
       </div>

       {/* Controls */}
       <div className="flex items-center justify-center gap-4">
          <button 
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white disabled:opacity-30"
          >
             <SkipBack className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-3 bg-white text-black rounded-full hover:scale-105 transition-transform"
          >
             {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button 
            disabled={currentIndex === history.length - 1}
            onClick={() => setCurrentIndex(Math.min(history.length - 1, currentIndex + 1))}
            className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white disabled:opacity-30"
          >
             <SkipForward className="w-4 h-4" />
          </button>
       </div>
    </div>
  );
};
