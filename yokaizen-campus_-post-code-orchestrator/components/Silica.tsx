import React, { useEffect, useState } from 'react';
import { PhilosophyMode, NodeStatus, Language } from '../types';
import { TERMS } from '../translations';
import { Sparkles, AlertTriangle, Coffee, Zap, MessageSquare } from 'lucide-react';

interface SilicaProps {
  mode: PhilosophyMode;
  isProcessing: boolean;
  hasWarning: boolean;
  language: Language;
}

export const Silica: React.FC<SilicaProps> = ({ mode, isProcessing, hasWarning, language }) => {
  const [message, setMessage] = useState("");
  const T = TERMS[language];

  useEffect(() => {
    if (isProcessing) {
        // Simple localization for processing state
        setMessage(T.CMD_PROCESSING);
        return;
    }

    if (hasWarning) {
      setMessage(mode === PhilosophyMode.KOREA ? T.SILICA_CRITICAL : T.SILICA_WARN);
      return;
    }

    // Default random quotes based on mode (keeping English for variety, or could map them)
    // For full localization we would move these to the dictionary, but for now we rely on the main status lines.
    switch (mode) {
      case PhilosophyMode.FINLAND:
        setMessage("Relax. Explore. There are no wrong answers.");
        break;
      case PhilosophyMode.KOREA:
        setMessage("Efficiency is key. Optimize your graph.");
        break;
      case PhilosophyMode.JAPAN:
        setMessage("Seek harmony between the agents.");
        break;
    }
  }, [mode, isProcessing, hasWarning, language, T]);

  const getStyles = () => {
    switch (mode) {
      case PhilosophyMode.FINLAND: return "bg-[#44403c] border-amber-500/30 text-amber-100 rounded-[2rem] font-serif italic shadow-xl";
      case PhilosophyMode.KOREA: return "bg-black border-red-600 text-red-500 rounded-none font-mono uppercase tracking-widest border-2 shadow-[0_0_20px_rgba(220,38,38,0.2)]";
      default: return "bg-slate-900/90 border-neon-blue/30 text-neon-blue rounded-lg backdrop-blur font-sans shadow-2xl";
    }
  };

  const getIcon = () => {
    if (hasWarning) return <AlertTriangle className="w-5 h-5 animate-bounce" />;
    switch (mode) {
      case PhilosophyMode.FINLAND: return <Coffee className="w-5 h-5" />;
      case PhilosophyMode.KOREA: return <Zap className="w-5 h-5" />;
      default: return <MessageSquare className="w-5 h-5" />;
    }
  };

  return (
    <div className={`fixed bottom-8 right-8 z-50 max-w-xs p-4 border transition-all duration-500 flex items-start gap-3 ${getStyles()}`}>
      <div className="mt-1">{getIcon()}</div>
      <div>
        <div className="text-[10px] opacity-70 mb-1">SILICA v3.0 // {mode}</div>
        <div className="text-sm leading-relaxed">{message}</div>
      </div>
    </div>
  );
};