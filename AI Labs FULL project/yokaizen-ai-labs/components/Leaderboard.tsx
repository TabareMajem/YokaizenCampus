
import React, { useState } from 'react';
import { MOCK_LEADERBOARD } from '../constants';
import { Trophy, Globe, Users, Shield, Medal } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { TRANSLATIONS } from '../translations';

export const Leaderboard: React.FC = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'GLOBAL' | 'SQUAD' | 'REGION'>('GLOBAL');

  const t = (key: string) => {
      const lang = user?.language || 'EN';
      return TRANSLATIONS[lang]?.[key] || key;
  };

  const filteredData = MOCK_LEADERBOARD.filter(entry => {
      if (filter === 'REGION') return true; // Mock filter logic
      if (filter === 'SQUAD') return true; // Mock logic
      return true;
  }).sort((a, b) => a.rank - b.rank);

  return (
    <div className="flex flex-col h-full bg-black/80 backdrop-blur-md rounded-2xl overflow-hidden border border-white/10 shadow-2xl animate-in fade-in">
        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-purple-900/20 to-black">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">{t('leaderboard.title')} <span className="text-electric">{t('leaderboard.subtitle')}</span></h2>
                    <p className="text-xs text-gray-400">{t('leaderboard.season')}</p>
                </div>
                <Trophy size={32} className="text-yellow-400 animate-pulse" />
            </div>
            
            <div className="flex bg-gray-900/50 p-1 rounded-lg">
                {(['GLOBAL', 'SQUAD', 'REGION'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${filter === f ? 'bg-electric text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        {t(`leaderboard.${f.toLowerCase()}`)}
                    </button>
                ))}
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {filteredData.map((entry) => (
                <div 
                    key={entry.rank} 
                    className={`flex items-center p-3 rounded-xl border transition-all hover:scale-[1.01] ${
                        entry.isUser 
                        ? 'bg-electric/10 border-electric shadow-[0_0_15px_rgba(196,95,255,0.2)]' 
                        : 'bg-gray-900/40 border-white/5 hover:bg-white/5'
                    }`}
                >
                    <div className="w-8 font-black text-lg text-gray-500 italic text-center">
                        {entry.rank <= 3 ? (
                            <Medal size={24} className={entry.rank === 1 ? 'text-yellow-400' : entry.rank === 2 ? 'text-gray-300' : 'text-amber-700'} />
                        ) : (
                            `#${entry.rank}`
                        )}
                    </div>
                    
                    <div className="mx-4 relative">
                        <img src={entry.avatar} className="w-10 h-10 rounded-full border-2 border-gray-700 bg-black" />
                        {entry.rank === 1 && <div className="absolute -top-2 -right-2 text-xl">👑</div>}
                    </div>

                    <div className="flex-1">
                        <div className={`font-bold text-sm ${entry.isUser ? 'text-electric' : 'text-white'}`}>{entry.name}</div>
                        <div className="text-[10px] text-gray-500 flex items-center">
                            <Globe size={10} className="mr-1"/> {entry.region}
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="font-mono font-black text-cyan-400">{entry.score.toLocaleString()}</div>
                        <div className="text-[8px] text-gray-600 uppercase font-bold">{t('leaderboard.score')}</div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};
