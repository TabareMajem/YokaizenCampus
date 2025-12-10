
import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Users, MessageSquare, Check, AlertTriangle, TrendingDown, Clock, Newspaper, Send } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Language } from '../../types';

interface PersonaSwitchboardProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
}

export const PersonaSwitchboard: React.FC<PersonaSwitchboardProps> = ({ onComplete, t }) => {
  const [phase, setPhase] = useState<'BRIEFING' | 'PLAYING' | 'REPORT'>('BRIEFING');
  const [currentScenarioIdx, setCurrentScenarioIdx] = useState(0);
  const [input, setInput] = useState('');
  const [stockPrice, setStockPrice] = useState(142.50);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');

  // Localized Scenarios derived from t()
  const crisisScenarios = [
    {
      id: 1,
      context: t('persona.s1.context'),
      target: t('persona.s1.target'),
      tone: t('persona.s1.tone'),
      hint: t('persona.s1.hint')
    },
    {
      id: 2,
      context: t('persona.s2.context'),
      target: t('persona.s2.target'),
      tone: t('persona.s2.tone'),
      hint: t('persona.s2.hint')
    },
    {
      id: 3,
      context: t('persona.s3.context'),
      target: t('persona.s3.target'),
      tone: t('persona.s3.tone'),
      hint: t('persona.s3.hint')
    }
  ];

  // Timer & Stock Drop
  useEffect(() => {
      if (phase !== 'PLAYING') return;
      
      const interval = setInterval(() => {
          setTimeLeft(t => {
              if (t <= 0) {
                  setPhase('REPORT');
                  return 0;
              }
              return t - 1;
          });
          // Stock drops every second you don't solve it
          setStockPrice(p => Math.max(0, p - (Math.random() * 0.5)));
      }, 1000);

      return () => clearInterval(interval);
  }, [phase]);

  const handleSubmit = () => {
      if (!input.trim()) return;
      audio.playTyping();

      const current = crisisScenarios[currentScenarioIdx];
      let roundScore = 0;
      
      // Simple heuristic scoring (Localization agnostic basic check)
      if (input.length > 10) roundScore += 20;
      // In a real app, use Gemini to grade the tone match. Here simulate success.
      if (Math.random() > 0.3) roundScore += 30;

      setScore(s => s + roundScore);
      setStockPrice(p => p + (roundScore / 10)); // Stock recovery
      
      if (currentScenarioIdx < crisisScenarios.length - 1) {
          setCurrentScenarioIdx(i => i + 1);
          setInput('');
          setFeedback("Statement Published. Next Crisis Incoming!");
          setTimeout(() => setFeedback(''), 2000);
          audio.playSuccess();
      } else {
          setPhase('REPORT');
          audio.playSuccess();
      }
  };

  return (
    <div className="h-full p-6 flex flex-col bg-slate-900 font-sans relative overflow-hidden">
       {/* Background Elements */}
       <div className="absolute inset-0 pointer-events-none opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
       
       {/* Header HUD */}
       <div className="flex justify-between items-center mb-6 bg-black/40 p-3 rounded-xl border border-white/10 backdrop-blur-md z-10">
           <div className="flex items-center space-x-3">
               <div className="bg-red-500/20 p-2 rounded-lg border border-red-500 animate-pulse">
                   <AlertTriangle className="text-red-500" size={20} />
               </div>
               <div>
                   <div className="text-[10px] text-gray-400 uppercase font-bold">{t('persona.alert')}</div>
                   <div className="text-white font-bold text-sm">{t('persona.pr_level')}: CRITICAL</div>
               </div>
           </div>
           <div className="text-right">
               <div className="text-[10px] text-gray-400 uppercase font-bold flex items-center justify-end">
                   {t('persona.stock')} <TrendingDown size={10} className="ml-1 text-red-500"/>
               </div>
               <div className={`text-2xl font-mono font-black ${stockPrice < 100 ? 'text-red-500' : 'text-green-400'}`}>
                   ${stockPrice.toFixed(2)}
               </div>
           </div>
       </div>

       {phase === 'BRIEFING' && (
           <div className="flex-1 flex flex-col items-center justify-center text-center z-10 animate-in zoom-in">
               <Newspaper size={64} className="text-white mb-4 opacity-80" />
               <h1 className="text-3xl font-black text-white mb-2 uppercase italic">{t('persona.title')}</h1>
               <p className="text-gray-400 text-sm mb-8 max-w-xs">
                   {t('persona.desc')}
                   <br/><br/>
                   <span className="text-white font-bold">{t('persona.task')}</span>
               </p>
               <Button size="lg" variant="primary" onClick={() => { setPhase('PLAYING'); audio.playClick(); }}>
                   {t('persona.start')}
               </Button>
           </div>
       )}

       {phase === 'PLAYING' && (
           <div className="flex-1 flex flex-col z-10 animate-in slide-in-from-bottom">
               {/* Timer Bar */}
               <div className="w-full h-1 bg-gray-800 mb-4 rounded-full overflow-hidden">
                   <div 
                     className={`h-full transition-all duration-1000 ease-linear ${timeLeft < 10 ? 'bg-red-500' : 'bg-white'}`} 
                     style={{ width: `${(timeLeft / 60) * 100}%` }}
                   ></div>
               </div>

               {/* Scenario Card */}
               <div className="bg-white/5 border border-white/10 p-4 rounded-xl mb-4 relative overflow-hidden">
                   <div className="absolute top-0 right-0 bg-white/10 px-2 py-1 text-[10px] font-bold text-white rounded-bl-lg">
                       {currentScenarioIdx + 1}/{crisisScenarios.length}
                   </div>
                   <div className="text-xs text-red-400 font-bold uppercase mb-2 flex items-center">
                       <AlertTriangle size={12} className="mr-1"/> {t('persona.incoming')}
                   </div>
                   <p className="text-lg text-white font-medium mb-4 font-serif">"{crisisScenarios[currentScenarioIdx].context}"</p>
                   
                   <div className="flex space-x-2 text-xs">
                       <div className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded border border-blue-500/50">
                           {t('persona.target')}: {crisisScenarios[currentScenarioIdx].target}
                       </div>
                       <div className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded border border-purple-500/50">
                           {t('persona.tone')}: {crisisScenarios[currentScenarioIdx].tone}
                       </div>
                   </div>
               </div>

               {/* Hint */}
               <div className="text-[10px] text-gray-500 mb-2 italic flex items-center">
                   <Check size={10} className="mr-1"/> {t('persona.tip')}: {crisisScenarios[currentScenarioIdx].hint}
               </div>

               {/* Input Area */}
               <textarea 
                 className="flex-1 bg-black/50 border border-gray-700 rounded-xl p-4 text-white focus:outline-none focus:border-white mb-4 font-mono text-sm resize-none"
                 placeholder="..."
                 value={input}
                 onChange={e => setInput(e.target.value)}
                 autoFocus
               />

               {feedback && <div className="text-center text-green-400 text-xs font-bold mb-2 animate-bounce">{feedback}</div>}

               <Button fullWidth variant="primary" onClick={handleSubmit} disabled={!input}>
                   <Send className="mr-2" size={16}/> {t('persona.publish')}
               </Button>
           </div>
       )}

       {phase === 'REPORT' && (
           <div className="flex-1 flex flex-col items-center justify-center text-center z-10 animate-in zoom-in">
               <div className="text-6xl mb-4">{stockPrice > 120 ? '📈' : '📉'}</div>
               <h2 className="text-2xl font-black text-white mb-2">{t('persona.market_closed')}</h2>
               <div className="bg-white/10 p-6 rounded-xl border border-white/10 mb-6 w-full max-w-xs">
                   <div className="flex justify-between items-center mb-2">
                       <span className="text-gray-400 text-xs uppercase">{t('persona.final_stock')}</span>
                       <span className={`font-mono font-bold ${stockPrice > 120 ? 'text-green-400' : 'text-red-500'}`}>${stockPrice.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between items-center">
                       <span className="text-gray-400 text-xs uppercase">{t('persona.pr_score')}</span>
                       <span className="font-mono font-bold text-white">{score}</span>
                   </div>
               </div>
               <Button fullWidth variant="primary" onClick={() => onComplete(stockPrice > 100 ? 100 : 50)}>
                   {t('persona.submit')}
               </Button>
           </div>
       )}
    </div>
  );
};
