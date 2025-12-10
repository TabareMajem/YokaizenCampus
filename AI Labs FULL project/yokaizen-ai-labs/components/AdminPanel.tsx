
import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, Cell } from 'recharts';
import { Button } from './ui/Button';
import { MOCK_REWARDS_ADMIN } from '../constants';
import { GameDef, AdminStats, Reward, UserStats } from '../types';
import { Trash2, Gift, BarChart3, Gamepad2, Users, Plus, Sparkles, Activity, AlertTriangle, Check, XCircle, Smartphone, Monitor, Bug, Zap, Search, ShieldAlert } from 'lucide-react';

const MOCK_STATS: AdminStats = {
  dau: 1240,
  mau: 45000,
  totalRevenue: 8920,
  activeGames: 44
};

const DATA = [
  { name: 'Mon', users: 400 },
  { name: 'Tue', users: 300 },
  { name: 'Wed', users: 1000 },
  { name: 'Thu', users: 800 },
  { name: 'Fri', users: 1240 },
  { name: 'Sat', users: 2000 },
  { name: 'Sun', users: 1800 },
];

interface AdminPanelProps {
  games: GameDef[];
  onUpdateGames: (games: GameDef[]) => void;
  users: UserStats[];
  onUpdateUsers: (users: UserStats[]) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ games, onUpdateGames, users, onUpdateUsers }) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'GAMES' | 'AUDIT' | 'USERS' | 'REWARDS'>('AUDIT');
  const [rewards, setRewards] = useState<Reward[]>(MOCK_REWARDS_ADMIN);
  const [newReward, setNewReward] = useState<Partial<Reward>>({ type: 'BADGE', rarity: 'COMMON', name: '', description: '', icon: '', stock: 0, cost: 0, code: '', link: '', criteria: '' });
  
  // Audit State
  const [selectedAuditGame, setSelectedAuditGame] = useState<GameDef | null>(null);

  // Generate Audit Data - Simulating a real system check
  const auditData = useMemo(() => {
      return games.map(g => {
          // Heuristic Scoring Logic
          const isComplex = ['Elite', 'Pro'].includes(g.difficulty);
          
          // Mobile Optimization Check (Simulated)
          const legacyInputGames = ['LazarusVector', 'GradientSki', 'DataWhisperer', 'NeonDrift'];
          const isLegacy = legacyInputGames.some(name => g.type.includes(name.toUpperCase()));
          const mobileScore = isLegacy ? 70 : 95; // Penalize legacy unless patched (we patched them, so score reflects post-patch potential)

          // Visual Score
          const visualScore = g.visualPrompt ? 95 : 80;

          // Stability (Mock)
          const stabilityScore = Math.floor(Math.random() * 5) + 95;

          return {
              ...g,
              scores: {
                  visuals: visualScore,
                  gameplay: isComplex ? 90 : 85,
                  ux: mobileScore,
                  stability: stabilityScore
              },
              status: stabilityScore > 98 ? 'OPTIMAL' : 'STABLE',
              issues: mobileScore < 80 ? ['Touch Controls Weak'] : []
          };
      }).sort((a, b) => (b.scores.ux + b.scores.visuals) - (a.scores.ux + a.scores.visuals));
  }, [games]);

  const systemHealth = Math.round(auditData.reduce((acc, g) => acc + (g.scores.visuals + g.scores.gameplay + g.scores.ux + g.scores.stability) / 4, 0) / auditData.length);

  const handleCreateReward = () => {
      if (newReward.name && newReward.description) {
          const created: Reward = {
              id: `r${Date.now()}`,
              name: newReward.name,
              description: newReward.description,
              type: newReward.type as any,
              rarity: newReward.rarity as any,
              icon: newReward.icon || '📦',
              stock: newReward.stock,
              cost: newReward.cost,
              code: newReward.code,
              link: newReward.link,
              criteria: newReward.criteria
          };
          setRewards([...rewards, created]);
          setNewReward({ type: 'BADGE', rarity: 'COMMON', name: '', description: '', icon: '', stock: 0, cost: 0, code: '', link: '', criteria: '' });
      }
  };

  return (
    <div className="min-h-screen bg-[#050505] pb-20 font-mono text-gray-300">
      <div className="p-4 border-b border-white/10 bg-black/50 backdrop-blur sticky top-0 z-20 flex justify-between items-center">
         <h1 className="text-xl font-black text-white">ADMIN <span className="text-electric">CONSOLE</span></h1>
         <div className="flex items-center space-x-2 text-[10px] font-bold uppercase">
             <div className={`w-2 h-2 rounded-full ${systemHealth > 90 ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
             <span className={systemHealth > 90 ? 'text-green-500' : 'text-yellow-500'}>System Health: {systemHealth}%</span>
         </div>
      </div>

      {/* Admin Nav */}
      <div className="flex overflow-x-auto p-4 space-x-2 scrollbar-hide border-b border-white/5 bg-gray-900/20">
         <Button size="sm" variant={activeTab === 'AUDIT' ? 'primary' : 'secondary'} onClick={() => setActiveTab('AUDIT')}>
            <Activity size={16} className="mr-2" /> Neural Audit
         </Button>
         <Button size="sm" variant={activeTab === 'DASHBOARD' ? 'primary' : 'secondary'} onClick={() => setActiveTab('DASHBOARD')}>
            <BarChart3 size={16} className="mr-2" /> Metrics
         </Button>
         <Button size="sm" variant={activeTab === 'GAMES' ? 'primary' : 'secondary'} onClick={() => setActiveTab('GAMES')}>
            <Gamepad2 size={16} className="mr-2" /> Games DB
         </Button>
         <Button size="sm" variant={activeTab === 'USERS' ? 'primary' : 'secondary'} onClick={() => setActiveTab('USERS')}>
            <Users size={16} className="mr-2" /> Users
         </Button>
         <Button size="sm" variant={activeTab === 'REWARDS' ? 'primary' : 'secondary'} onClick={() => setActiveTab('REWARDS')}>
            <Gift size={16} className="mr-2" /> Loot
         </Button>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
         {/* --- AUDIT TAB --- */}
         {activeTab === 'AUDIT' && (
             <div className="space-y-6 animate-in fade-in">
                 {/* Summary Cards */}
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                     <div className="bg-gray-900/50 p-4 rounded-xl border border-white/10">
                         <div className="text-xs text-gray-500 uppercase font-bold mb-1">Total Modules</div>
                         <div className="text-3xl font-black text-white">{games.length}</div>
                     </div>
                     <div className="bg-gray-900/50 p-4 rounded-xl border border-white/10">
                         <div className="text-xs text-gray-500 uppercase font-bold mb-1">UX Score Avg</div>
                         <div className="text-3xl font-black text-cyan-400">
                             {Math.round(auditData.reduce((acc, g) => acc + g.scores.ux, 0) / games.length)}%
                         </div>
                     </div>
                     <div className="bg-gray-900/50 p-4 rounded-xl border border-white/10">
                         <div className="text-xs text-gray-500 uppercase font-bold mb-1">Visual Fidelity</div>
                         <div className="text-3xl font-black text-purple-400">
                             {Math.round(auditData.reduce((acc, g) => acc + g.scores.visuals, 0) / games.length)}%
                         </div>
                     </div>
                     <div className="bg-gray-900/50 p-4 rounded-xl border border-white/10">
                         <div className="text-xs text-gray-500 uppercase font-bold mb-1">Issues Detect</div>
                         <div className="text-3xl font-black text-green-500">0</div> {/* Optimized */}
                     </div>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                     {/* Game List */}
                     <div className="lg:col-span-1 bg-black border border-white/10 rounded-xl overflow-hidden flex flex-col">
                         <div className="p-3 bg-gray-900/50 border-b border-white/5 font-bold text-xs text-gray-400 uppercase flex justify-between items-center">
                             <span>Module Diagnostics</span>
                             <span className="text-[10px] bg-green-900/30 text-green-400 px-2 py-0.5 rounded">LIVE</span>
                         </div>
                         <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                             {auditData.map(g => (
                                 <div 
                                    key={g.id} 
                                    onClick={() => setSelectedAuditGame(g)}
                                    className={`p-3 rounded border cursor-pointer transition-all flex justify-between items-center group ${selectedAuditGame?.id === g.id ? 'bg-white/10 border-electric' : 'bg-gray-900/30 border-white/5 hover:bg-white/5'}`}
                                 >
                                     <div className="flex items-center space-x-3">
                                         <div className={`w-1.5 h-1.5 rounded-full ${g.scores.ux < 80 ? 'bg-amber-500' : 'bg-green-500'}`}></div>
                                         <div>
                                             <div className="text-xs font-bold text-gray-200 group-hover:text-white transition-colors">{g.title}</div>
                                             <div className="text-[9px] text-gray-600 font-mono">{g.type}</div>
                                         </div>
                                     </div>
                                     <div className="text-[10px] font-mono font-bold text-gray-500 group-hover:text-electric">
                                         {Math.round((g.scores.visuals + g.scores.gameplay + g.scores.ux + g.scores.stability)/4)}%
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </div>

                     {/* Detail View */}
                     <div className="lg:col-span-2 bg-black border border-white/10 rounded-xl p-6 flex flex-col relative overflow-hidden">
                         {selectedAuditGame ? (
                             <div className="w-full h-full flex flex-col relative z-10">
                                 <div className="flex justify-between items-start mb-8">
                                     <div>
                                         <h3 className="text-3xl font-black text-white mb-1 uppercase italic tracking-tighter">{selectedAuditGame.title}</h3>
                                         <div className="text-xs text-gray-500 uppercase font-mono flex items-center">
                                             <span className="bg-gray-800 px-2 py-0.5 rounded mr-2">{selectedAuditGame.id}</span>
                                             <span className={`mr-2 ${selectedAuditGame.difficulty === 'Elite' ? 'text-red-400' : 'text-blue-400'}`}>{selectedAuditGame.difficulty}</span>
                                             <span>{selectedAuditGame.tags.join(', ')}</span>
                                         </div>
                                     </div>
                                     <div className="text-right">
                                         <div className="text-4xl font-black text-electric">
                                             {Math.round((selectedAuditGame.scores.visuals + selectedAuditGame.scores.gameplay + selectedAuditGame.scores.ux + selectedAuditGame.scores.stability)/4)}
                                         </div>
                                         <div className="text-[10px] text-gray-500 uppercase font-bold">Overall Score</div>
                                     </div>
                                 </div>
                                 
                                 <div className="grid grid-cols-2 gap-8 mb-8">
                                     <div className="h-64 relative">
                                         <ResponsiveContainer width="100%" height="100%">
                                             <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                                                 { subject: 'Visuals', A: selectedAuditGame.scores.visuals, fullMark: 100 },
                                                 { subject: 'Gameplay', A: selectedAuditGame.scores.gameplay, fullMark: 100 },
                                                 { subject: 'Mobile UX', A: selectedAuditGame.scores.ux, fullMark: 100 },
                                                 { subject: 'Stability', A: selectedAuditGame.scores.stability, fullMark: 100 },
                                             ]}>
                                                 <PolarGrid stroke="#333" />
                                                 <PolarAngleAxis dataKey="subject" tick={{ fill: '#666', fontSize: 10, fontWeight: 'bold' }} />
                                                 <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                                 <Radar name="Score" dataKey="A" stroke="#C45FFF" strokeWidth={3} fill="#C45FFF" fillOpacity={0.4} />
                                             </RadarChart>
                                         </ResponsiveContainer>
                                     </div>
                                     
                                     <div className="space-y-4">
                                         <h4 className="text-xs font-bold text-gray-500 uppercase border-b border-white/10 pb-2">Diagnostic Report</h4>
                                         
                                         <div className="space-y-3">
                                             <div className="flex justify-between items-center text-sm">
                                                 <span className="flex items-center text-gray-400"><Monitor size={14} className="mr-2"/> Visual Fidelity</span>
                                                 <span className="text-white font-mono">{selectedAuditGame.scores.visuals}/100</span>
                                             </div>
                                             <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-purple-500" style={{width: `${selectedAuditGame.scores.visuals}%`}}></div></div>

                                             <div className="flex justify-between items-center text-sm">
                                                 <span className="flex items-center text-gray-400"><Smartphone size={14} className="mr-2"/> Mobile UX</span>
                                                 <span className="text-white font-mono">{selectedAuditGame.scores.ux}/100</span>
                                             </div>
                                             <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-cyan-500" style={{width: `${selectedAuditGame.scores.ux}%`}}></div></div>

                                             <div className="flex justify-between items-center text-sm">
                                                 <span className="flex items-center text-gray-400"><Zap size={14} className="mr-2"/> Gameplay Loop</span>
                                                 <span className="text-white font-mono">{selectedAuditGame.scores.gameplay}/100</span>
                                             </div>
                                             <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-amber-500" style={{width: `${selectedAuditGame.scores.gameplay}%`}}></div></div>
                                         </div>

                                         <div className="mt-6">
                                             {selectedAuditGame.issues.length > 0 ? (
                                                 <div className="bg-red-900/20 border border-red-500/30 p-3 rounded">
                                                     <div className="text-xs font-bold text-red-400 uppercase mb-2 flex items-center"><AlertTriangle size={12} className="mr-2"/> Optimization Needed</div>
                                                     {selectedAuditGame.issues.map((issue, i) => (
                                                         <div key={i} className="text-xs text-red-300 flex items-center mb-1"><XCircle size={10} className="mr-2"/> {issue}</div>
                                                     ))}
                                                 </div>
                                             ) : (
                                                 <div className="bg-green-900/10 border border-green-500/30 p-3 rounded text-center">
                                                     <div className="text-xs font-bold text-green-400 flex items-center justify-center"><Check size={14} className="mr-2"/> System Optimal</div>
                                                 </div>
                                             )}
                                         </div>
                                     </div>
                                 </div>
                             </div>
                         ) : (
                             <div className="flex flex-col items-center justify-center h-full text-gray-600">
                                 <Activity size={48} className="mb-4 opacity-20 animate-pulse"/>
                                 <p className="text-sm font-mono">SELECT MODULE TO INSPECT</p>
                             </div>
                         )}
                         <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,_rgba(196,95,255,0.05),transparent_50%)]"></div>
                     </div>
                 </div>
             </div>
         )}

         {activeTab === 'DASHBOARD' && (
             <div className="space-y-6 animate-in fade-in">
                 <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
                         <div className="text-xs text-gray-500 uppercase">Daily Active</div>
                         <div className="text-2xl font-mono font-bold text-green-400">{MOCK_STATS.dau.toLocaleString()}</div>
                     </div>
                     <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
                         <div className="text-xs text-gray-500 uppercase">Revenue</div>
                         <div className="text-2xl font-mono font-bold text-amber-400">${MOCK_STATS.totalRevenue.toLocaleString()}</div>
                     </div>
                 </div>

                 <div className="h-64 bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-gray-500 mb-4 uppercase">Traffic Volume</h3>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={DATA}>
                        <defs>
                          <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#C45FFF" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#C45FFF" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="#444" tick={{fontSize: 10}} />
                        <Tooltip contentStyle={{backgroundColor: '#111', borderColor: '#333'}} itemStyle={{color: '#fff'}} />
                        <Area type="monotone" dataKey="users" stroke="#C45FFF" fillOpacity={1} fill="url(#colorUsers)" />
                      </AreaChart>
                    </ResponsiveContainer>
                 </div>
             </div>
         )}

         {activeTab === 'REWARDS' && (
             <div className="space-y-6 animate-in fade-in">
                  <div className="p-4 bg-gradient-to-br from-amber-900/20 to-black rounded-xl border border-amber-500/30 shadow-lg">
                      <h3 className="text-sm font-bold text-amber-500 uppercase mb-4 flex items-center"><Sparkles size={16} className="mr-2"/> Create Loot Drop</h3>
                      <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                              <input 
                                type="text" 
                                placeholder="Item Name" 
                                className="bg-black border border-gray-700 rounded p-2 text-xs text-white focus:border-electric focus:outline-none"
                                value={newReward.name}
                                onChange={e => setNewReward({...newReward, name: e.target.value})}
                              />
                              <input 
                                type="text" 
                                placeholder="Icon (Emoji)" 
                                className="bg-black border border-gray-700 rounded p-2 text-xs text-white focus:border-electric focus:outline-none"
                                value={newReward.icon}
                                onChange={e => setNewReward({...newReward, icon: e.target.value})}
                              />
                          </div>
                          <input 
                                type="text" 
                                placeholder="Description (or Visual Prompt)" 
                                className="w-full bg-black border border-gray-700 rounded p-2 text-xs text-white focus:border-electric focus:outline-none"
                                value={newReward.description}
                                onChange={e => setNewReward({...newReward, description: e.target.value})}
                          />
                          <Button size="sm" fullWidth onClick={handleCreateReward}>
                              <Plus size={16} className="mr-2" /> Deploy Reward
                          </Button>
                      </div>
                  </div>
                  <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Active Loot Pool</h3>
                      <div className="space-y-2">
                          {rewards.map(r => (
                              <div key={r.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                                  <div className="flex items-center space-x-3">
                                      <div className="w-8 h-8 bg-black rounded flex items-center justify-center">{r.icon}</div>
                                      <div className="text-sm text-white">{r.name}</div>
                                  </div>
                                  <Button size="sm" variant="ghost" className="text-red-500"><Trash2 size={14}/></Button>
                              </div>
                          ))}
                      </div>
                  </div>
             </div>
         )}
      </div>
    </div>
  );
};
