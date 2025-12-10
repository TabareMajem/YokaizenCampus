

import React, { useState } from 'react';
import { ArrowRight, X, Sparkles, Command, ShieldAlert, Users } from 'lucide-react';
import { PhilosophyMode, Language } from '../types';
import { TERMS } from '../translations';

interface TutorialOverlayProps {
  onComplete: () => void;
  mode: PhilosophyMode;
  language: Language;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onComplete, mode, language }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const T = TERMS[language].TUTORIAL; 
  const TC = TERMS[language].COMMON;
  
  const STEPS = [
    {
      target: "welcome",
      title: T.STEPS[0].title,
      text: T.STEPS[0].text,
      icon: Sparkles,
      position: "center"
    },
    {
      target: "roster",
      title: T.STEPS[1].title,
      text: T.STEPS[1].text,
      icon: Users,
      position: "left-panel"
    },
    {
      target: "command",
      title: T.STEPS[2].title,
      text: T.STEPS[2].text,
      icon: Command,
      position: "bottom-center"
    },
    {
      target: "audit",
      title: T.STEPS[3].title,
      text: T.STEPS[3].text,
      icon: ShieldAlert,
      position: "top-right"
    }
  ];

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const step = STEPS[currentStep];

  const getThemeClass = () => {
    if (mode === PhilosophyMode.KOREA) return "border-red-500 bg-black/95 text-red-500 font-mono tracking-widest";
    if (mode === PhilosophyMode.FINLAND) return "border-amber-500 bg-[#292524]/95 text-amber-100 font-serif";
    return "border-neon-blue bg-slate-900/95 text-white font-sans";
  };

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none">
      <div className="absolute inset-0 bg-black/60 pointer-events-auto transition-opacity duration-500" />
      
      {/* Positioning Logic */}
      <div className={`absolute pointer-events-auto transition-all duration-500
        ${step.position === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''}
        ${step.position === 'left-panel' ? 'top-1/3 left-72' : ''}
        ${step.position === 'bottom-center' ? 'bottom-32 left-1/2 -translate-x-1/2' : ''}
        ${step.position === 'top-right' ? 'top-24 right-96' : ''}
      `}>
        <div className={`w-96 p-6 border-2 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden ${getThemeClass()}`}>
          
          {/* Background FX */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-lg bg-white/10">
                <step.icon className="w-6 h-6" />
              </div>
              <button onClick={onComplete} className="text-white/50 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <h3 className="text-xl font-bold mb-2">{step.title}</h3>
            <p className="text-sm opacity-80 leading-relaxed mb-6">
              {step.text}
            </p>

            <div className="flex justify-between items-center">
              <div className="flex gap-1">
                {STEPS.map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-current' : 'w-2 bg-white/20'}`} />
                ))}
              </div>
              
              <button 
                onClick={handleNext}
                className={`px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-white/10 transition-colors border border-white/20`}
              >
                {currentStep === STEPS.length - 1 ? TC.INITIALIZE : TC.NEXT} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};