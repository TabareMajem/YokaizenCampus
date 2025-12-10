
import React, { useState, useEffect } from 'react';
import { GameDebriefContent } from '../../types';
import { Button } from './Button';
import { CheckCircle, Lightbulb, ArrowRight, Share2 } from 'lucide-react';

interface GameDebriefProps {
  content: GameDebriefContent;
  onClose: () => void;
  t?: (key: string) => string;
}

export const GameDebrief: React.FC<GameDebriefProps> = ({ content, onClose, t }) => {
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-progress bar (Story style)
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          // Could auto-close, but better to wait for user interaction on educational content
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 100); // 10 seconds total
    return () => clearInterval(interval);
  }, [isPaused]);

  return (
    <div className="fixed inset-0 z-[60] bg-void flex items-center justify-center animate-in slide-in-from-bottom duration-500">
       {/* Background Blur/Gradient */}
       <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-black backdrop-blur-xl"></div>
       
       <div className="relative w-full h-full max-w-md bg-black/50 flex flex-col">
          {/* Progress Bar */}
          <div className="absolute top-2 left-2 right-2 flex space-x-1 z-10">
             <div className="h-1 bg-gray-700 flex-1 rounded-full overflow-hidden">
                <div className="h-full bg-white transition-all ease-linear duration-100" style={{ width: `${progress}%` }}></div>
             </div>
          </div>

          {/* Content Container */}
          <div 
             className="flex-1 flex flex-col p-8 pt-12 overflow-y-auto"
             onPointerDown={() => setIsPaused(true)}
             onPointerUp={() => setIsPaused(false)}
          >
              <div className="mb-8 animate-in zoom-in duration-700">
                  <div className="w-16 h-16 bg-electric rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(196,95,255,0.5)] rotate-3">
                     <Lightbulb size={32} className="text-white" />
                  </div>
                  <h2 className="text-sm font-bold text-electric uppercase tracking-widest mb-2">{t ? t('debrief.protocol') : 'Debrief Protocol'}</h2>
                  <h1 className="text-3xl font-black text-white leading-tight">{content.conceptTitle}</h1>
              </div>

              <div className="space-y-8">
                  <div className="bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-md animate-in slide-in-from-bottom delay-100 duration-700">
                      <p className="text-lg text-gray-200 leading-relaxed">
                          {content.conceptDescription}
                      </p>
                  </div>

                  <div className="space-y-4 animate-in slide-in-from-bottom delay-200 duration-700">
                      <h3 className="text-xs font-bold text-gray-500 uppercase">{t ? t('debrief.takeaways') : 'Key Takeaways'}</h3>
                      {content.keyTakeaways.map((pt, i) => (
                          <div key={i} className="flex items-start space-x-3">
                              <CheckCircle className="text-green-400 mt-1 flex-shrink-0" size={18} />
                              <p className="text-sm text-gray-300">{pt}</p>
                          </div>
                      ))}
                  </div>

                  <div className="bg-gradient-to-r from-blue-900/20 to-cyan/10 p-4 rounded-xl border-l-4 border-cyan animate-in slide-in-from-bottom delay-300 duration-700">
                      <h3 className="text-xs font-bold text-cyan uppercase mb-1">{t ? t('debrief.real_world') : 'Real World Application'}</h3>
                      <p className="text-sm text-gray-300 italic">"{content.realWorldExample}"</p>
                  </div>
              </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-white/5 bg-black/80 backdrop-blur-md flex space-x-3 z-10">
              <Button variant="secondary" className="flex-1" onClick={() => alert('Shared to mock social feed!')}>
                  <Share2 size={18} className="mr-2" /> {t ? t('debrief.share') : 'Share'}
              </Button>
              <Button variant="primary" className="flex-[2]" onClick={onClose}>
                  {t ? t('debrief.continue') : 'Continue'} <ArrowRight size={18} className="ml-2" />
              </Button>
          </div>
       </div>
    </div>
  );
};
