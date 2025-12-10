

import React, { useState } from 'react';
import { Sparkles, BrainCircuit, X, GraduationCap, BarChart, MessageSquare, Loader2, Users } from 'lucide-react';
import { askAthena } from '../services/gemini';
import { Language } from '../types';
import { TERMS } from '../translations';

interface AITutorModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  contextData?: any; // Data from the dashboard to analyze
}

export const AITutorModal: React.FC<AITutorModalProps> = ({ isOpen, onClose, language, contextData }) => {
  const [activeResponse, setActiveResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  if (!isOpen) return null;
  const T = TERMS[language].ATHENA;

  const ACTIONS = [
    { id: 'grade', label: T.ACTIONS.GRADE, icon: GraduationCap, prompt: "Analyze the current class velocity and student status. Provide a grading summary focused on Critical Thinking skills." },
    { id: 'psych', label: T.ACTIONS.PSYCH, icon: BrainCircuit, prompt: "Analyze the 'Stuck' vs 'Flow' ratio. Identify if students are struggling with Logic or Creativity based on their agent configurations." },
    { id: 'suggest', label: T.ACTIONS.SUGGEST, icon: MessageSquare, prompt: "Generate a cryptic but helpful hint to broadcast to the class that guides them without solving the problem." },
    { id: 'predict', label: T.ACTIONS.PREDICT, icon: BarChart, prompt: "Based on current trajectory, predict how many students will complete the Quest in the next 15 minutes." },
    { id: 'groups', label: T.ACTIONS.GROUP, icon: Users, prompt: "Group the students into balanced teams of 3 based on their current status (Mix Flow with Stuck) and hypothetical Centaur Profiles." },
  ];

  const handleAction = async (actionId: string, prompt: string) => {
    setSelectedAction(actionId);
    setLoading(true);
    setActiveResponse(null);
    
    const result = await askAthena(prompt, contextData || {}, language);
    
    setActiveResponse(result);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-[#0f172a] border border-purple-500/30 rounded-2xl shadow-[0_0_50px_rgba(168,85,247,0.15)] overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-purple-500/20 bg-purple-900/10 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/50">
               <Sparkles className="w-6 h-6 text-purple-300" />
             </div>
             <div>
               <h2 className="text-xl font-bold text-white tracking-wide">{T.TITLE}</h2>
               <p className="text-xs text-purple-300 uppercase tracking-wider">{T.SUB}</p>
             </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Actions */}
          <div className="w-64 border-r border-white/5 bg-slate-900/50 p-4 space-y-2 overflow-y-auto">
             <div className="text-[10px] font-bold text-slate-500 uppercase mb-2 ml-2">{T.UI.AVAILABLE}</div>
             {ACTIONS.map(action => (
               <button
                 key={action.id}
                 onClick={() => handleAction(action.id, action.prompt)}
                 disabled={loading}
                 className={`w-full p-3 rounded-lg flex items-center gap-3 text-sm font-medium transition-all text-left
                   ${selectedAction === action.id 
                     ? 'bg-purple-600/20 border border-purple-500/50 text-white' 
                     : 'hover:bg-white/5 text-slate-400 border border-transparent'
                   }
                 `}
               >
                 <action.icon className={`w-4 h-4 ${selectedAction === action.id ? 'text-purple-300' : 'text-slate-500'}`} />
                 {action.label}
               </button>
             ))}
          </div>

          {/* Chat/Result Area */}
          <div className="flex-1 p-6 bg-[#030712] overflow-y-auto relative">
             {!selectedAction && (
               <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center opacity-60">
                 <BrainCircuit className="w-16 h-16 mb-4" />
                 <p>{T.UI.SELECT}</p>
               </div>
             )}

             {loading && (
               <div className="h-full flex flex-col items-center justify-center text-purple-400">
                 <Loader2 className="w-10 h-10 animate-spin mb-4" />
                 <p className="text-sm font-mono animate-pulse">{T.UI.ANALYZING}</p>
               </div>
             )}

             {activeResponse && (
               <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="text-[10px] uppercase text-purple-500 font-bold mb-2 tracking-widest">{T.UI.RESULT}</div>
                 <div className="prose prose-invert prose-purple max-w-none">
                   <p className="leading-relaxed whitespace-pre-wrap text-slate-200">
                     {activeResponse}
                   </p>
                 </div>
                 
                 <div className="mt-8 flex gap-3">
                   <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded transition-colors">
                     {T.UI.APPLY}
                   </button>
                   <button className="px-4 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded transition-colors">
                     {T.UI.SAVE}
                   </button>
                 </div>
               </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
};
