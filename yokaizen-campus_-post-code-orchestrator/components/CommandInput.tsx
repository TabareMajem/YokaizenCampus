

import React, { useState } from 'react';
import { Send, Activity, Sparkles } from 'lucide-react';
import { PhilosophyMode, Language } from '../types';
import { TERMS } from '../translations';

interface CommandInputProps {
  onSubmit: (text: string) => void;
  isProcessing: boolean;
  mode: PhilosophyMode;
  language: Language;
}

export const CommandInput: React.FC<CommandInputProps> = ({ onSubmit, isProcessing, mode, language }) => {
  const [input, setInput] = useState('');
  const T = TERMS[language];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      onSubmit(input);
      setInput('');
    }
  };

  const getContainerStyle = () => {
    switch (mode) {
      case PhilosophyMode.FINLAND: return "bg-stone-800 border-amber-600/30 shadow-lg rounded-full";
      case PhilosophyMode.KOREA: return "bg-black border-red-600 border-2 rounded-none shadow-[0_0_20px_rgba(220,38,38,0.2)]";
      default: return "bg-slate-900 border-glass-border shadow-2xl rounded-lg";
    }
  };

  const getGradient = () => {
    switch (mode) {
      case PhilosophyMode.FINLAND: return "from-amber-600 to-orange-400";
      case PhilosophyMode.KOREA: return "from-red-600 to-black";
      default: return "from-neon-blue to-neon-purple";
    }
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50">
      <form onSubmit={handleSubmit} className="relative group">
        {/* Glow Effect */}
        <div className={`absolute -inset-0.5 bg-gradient-to-r rounded-lg opacity-30 group-hover:opacity-75 transition duration-500 blur ${getGradient()}`}></div>
        
        <div className={`relative flex items-center overflow-hidden transition-all duration-500 ${getContainerStyle()}`}>
          <div className="pl-4">
             {isProcessing ? (
                <Activity className={`w-5 h-5 animate-spin ${mode === PhilosophyMode.KOREA ? 'text-red-500' : 'text-neon-blue'}`} />
             ) : (
                <Sparkles className={`w-5 h-5 ${mode === PhilosophyMode.KOREA ? 'text-red-500' : 'text-gray-400 group-hover:text-white transition-colors'}`} />
             )}
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isProcessing ? T.CMD_PROCESSING : T.CMD_PLACEHOLDER}
            className={`w-full bg-transparent border-none text-white px-4 py-4 focus:outline-none focus:ring-0 placeholder:text-gray-600 ${mode === PhilosophyMode.KOREA ? 'font-mono tracking-wider' : 'font-sans'}`}
            disabled={isProcessing}
            autoFocus
          />
          <button 
            type="submit"
            disabled={!input.trim() || isProcessing}
            className={`mr-2 p-2 rounded-md transition-all disabled:opacity-50
              ${input.trim() 
                 ? (mode === PhilosophyMode.KOREA ? 'bg-red-600 text-black hover:bg-red-500' : 'bg-white/10 hover:bg-white/20 text-white') 
                 : 'text-gray-600'}
            `}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};
