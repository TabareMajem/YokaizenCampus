
import React from 'react';
import { PhilosophyMode, SkillStats, Language } from '../types';
import { TERMS } from '../translations';
import { Hexagon, X } from 'lucide-react';

interface CentaurProfileProps {
  stats: SkillStats;
  mode: PhilosophyMode;
  language: Language;
  onClose: () => void;
}

export const CentaurProfile: React.FC<CentaurProfileProps> = ({ stats, mode, language, onClose }) => {
  const T = TERMS[language];
  const max = 100;
  
  // Convert stats to points on a hexagon
  const skills = [
    { key: 'orchestration', label: T.SKILLS.ORCHESTRATION, value: stats.orchestration },
    { key: 'auditing', label: T.SKILLS.AUDITING, value: stats.auditing },
    { key: 'resilience', label: T.SKILLS.RESILIENCE, value: stats.resilience },
    { key: 'creativity', label: T.SKILLS.CREATIVITY, value: stats.creativity },
    { key: 'efficiency', label: T.SKILLS.EFFICIENCY, value: stats.efficiency },
    { key: 'ethics', label: T.SKILLS.ETHICS, value: stats.ethics },
  ];

  const getPoints = (scale: number) => {
    return skills.map((_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const value = (skills[i].value / max) * scale * 100; // Radius
      const x = 150 + value * Math.cos(angle);
      const y = 150 + value * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
  };

  const getContainerClass = () => {
    switch(mode) {
      case PhilosophyMode.FINLAND: return "bg-[#1c1917]/95 border-amber-600/30 font-serif text-amber-100";
      case PhilosophyMode.KOREA: return "bg-black/95 border-red-600 font-mono text-red-500 uppercase";
      default: return "bg-slate-900/95 border-neon-blue/30 font-sans text-neon-blue";
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`relative w-full max-w-lg p-8 rounded-2xl border-2 shadow-2xl overflow-hidden ${getContainerClass()}`}>
        
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors">
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-8">
           <h2 className="text-2xl font-bold tracking-widest flex items-center justify-center gap-3">
             <Hexagon className="w-6 h-6 fill-current" /> {T.PROFILE}
           </h2>
           <p className="opacity-60 text-sm mt-2">{T.PROFILE_ID}</p>
        </div>

        <div className="relative w-[300px] h-[300px] mx-auto">
          {/* Radar Chart SVG */}
          <svg viewBox="0 0 300 300" className="w-full h-full overflow-visible">
            {/* Background Webs */}
            {[0.2, 0.4, 0.6, 0.8, 1].map((scale) => (
              <polygon 
                key={scale}
                points={getPoints(scale * max / 100)} 
                fill="none" 
                stroke="currentColor" 
                strokeOpacity="0.1"
                strokeWidth="1"
              />
            ))}
            
            {/* Data Polygon */}
            <polygon 
              points={getPoints(1)} 
              fill="currentColor" 
              fillOpacity="0.2" 
              stroke="currentColor" 
              strokeWidth="2"
              className="transition-all duration-1000 ease-out"
            />

            {/* Labels */}
            {skills.map((skill, i) => {
               const angle = (Math.PI / 3) * i - Math.PI / 2;
               const radius = 130;
               const x = 150 + radius * Math.cos(angle);
               const y = 150 + radius * Math.sin(angle);
               return (
                 <text 
                   key={skill.key}
                   x={x} 
                   y={y} 
                   textAnchor="middle" 
                   fill="currentColor" 
                   fontSize="10" 
                   fontWeight="bold"
                   className="uppercase"
                 >
                   {skill.label}
                 </text>
               );
            })}
          </svg>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4">
           {skills.map(s => (
             <div key={s.key} className="flex justify-between items-center border-b border-white/10 pb-1">
               <span className="opacity-70 text-sm">{s.label}</span>
               <span className="font-bold">{s.value}</span>
             </div>
           ))}
        </div>

      </div>
    </div>
  );
};
