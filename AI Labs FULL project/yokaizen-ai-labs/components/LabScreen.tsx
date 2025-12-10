
import React, { useState } from 'react';
import { UserStats, Agent, CompetitionTemplate, ToolDef } from '../types';
import { Button } from './ui/Button';
import { AgentBuilder } from './tools/AgentBuilder';
import { VisionEye } from './tools/VisionEye';
import { GameCreator } from './tools/GameCreator';
import { OmniSight } from './tools/OmniSight';
import { Bot, Image as ImageIcon, Mic, Eye, Lock, Sparkles, Grid, ArrowLeft, Gamepad2, Scan, Code, Workflow, Info, X, Check, Clock, Trophy, Plus, Share2, ShoppingBag } from 'lucide-react';
import { generateMockImage, optimizeCode } from '../services/geminiService';
import { TOOLS, COMPETITION_TEMPLATES } from '../constants';
import { audio } from '../services/audioService';

interface LabScreenProps {
  user: UserStats;
  onUpdateUser: (user: UserStats) => void;
  initialTool?: string | null;
  onTriggerPaywall: () => void; 
  t: (key: string, replace?: any) => string;
}

const ToolTooltip: React.FC<{ tool: ToolDef, onClose: () => void, t: (k: string) => string }> = ({ tool, onClose, t }) => (
    <div className="absolute inset-0 z-20 bg-black/90 backdrop-blur-md p-4 flex flex-col justify-center animate-in zoom-in duration-200 rounded-2xl">
        <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-bold text-white">{t(tool.name)}</h3>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>
        <p className="text-sm text-gray-300 mb-4 leading-relaxed">{t(tool.description)}</p>
        
        <div className="space-y-2 mb-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase">Capabilities</h4>
            {tool.capabilities.map((cap, i) => (
                <div key={i} className="flex items-center text-xs text-electric">
                    <Check size={12} className="mr-2" /> {cap}
                </div>
            ))}
        </div>

        <div className="mt-auto pt-4 border-t border-white/10">
            <div className="text-[10px] text-gray-500 uppercase font-bold">Unlock Condition</div>
            <div className="text-xs text-white font-mono">{t(tool.unlockCondition)}</div>
        </div>
    </div>
);

export const LabScreen: React.FC<LabScreenProps> = ({ user, onUpdateUser, initialTool, onTriggerPaywall, t }) => {
  const [view, setView] = useState<string>(initialTool || 'DASHBOARD');
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  
  // Agent Lab State
  const [agentMode, setAgentMode] = useState<'CHAT' | 'BUILD'>('CHAT');
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [lastAgentAction, setLastAgentAction] = useState<number>(0);
  const [importAgentData, setImportAgentData] = useState<Agent | null>(null);
  const [showShareCard, setShowShareCard] = useState<Agent | null>(null);
  
  // Image Tool State
  const [imgPrompt, setImgPrompt] = useState('');
  const [genImage, setGenImage] = useState('');
  const [isGenLoading, setIsGenLoading] = useState(false);
  const [dailyGenCount, setDailyGenCount] = useState(0);

  // Updated logic: Check if user has the required badge in inventory
  const isUnlocked = (tool: ToolDef) => {
      // Legacy check or Pro override
      if (user.unlockedTools.includes(tool.id) || user.isPro) return true;
      // Special check for Omni-Sight (Level 30 gate)
      if (tool.id === 'OMNI_SIGHT' && user.level >= 30) return true;
      // Achievement check
      if (tool.requiredBadgeId) {
          return user.inventory.some(item => item.id === tool.requiredBadgeId);
      }
      return false;
  };

  const checkAgentCooldown = (): boolean => {
      if (user.isPro) return true;
      const now = Date.now();
      const COOLDOWN = 120000; 
      if (now - lastAgentAction < COOLDOWN) {
          onTriggerPaywall();
          return false;
      }
      setLastAgentAction(now);
      return true;
  };

  const handleSaveAgent = (agent: Agent) => {
      const exists = user.agents.some(a => a.id === agent.id);
      let newAgents = user.agents;
      if (exists) {
          newAgents = user.agents.map(a => a.id === agent.id ? agent : a);
      } else {
          newAgents = [...user.agents, agent];
      }
      onUpdateUser({ ...user, agents: newAgents });
      setActiveAgent(agent);
      setAgentMode('CHAT'); 
  };

  const handleShareAgent = (agent: Agent) => {
      const payload = btoa(JSON.stringify(agent));
      const url = `${window.location.origin}?agent=${payload}`;
      navigator.clipboard.writeText(url);
      alert(`Share link for ${agent.name} copied!`);
  };

  const handleGenImage = async () => {
      if (!imgPrompt) return;
      const limit = user.isPro ? (user.subscriptionTier === 'pro_creator' ? 20 : 5) : 2;
      
      if (dailyGenCount >= limit) {
          if (user.credits >= 50) {
              const confirm = window.confirm(`Daily limit reached (${limit}). Spend 50 Credits to generate?`);
              if (!confirm) return;
              onUpdateUser({...user, credits: user.credits - 50});
          } else {
              onTriggerPaywall(); 
              return;
          }
      }

      setIsGenLoading(true);
      const url = await generateMockImage(imgPrompt);
      setGenImage(url);
      setDailyGenCount(prev => prev + 1);
      setIsGenLoading(false);
  };

  const handleGameCreated = (gameData: any) => {
      const newGame: any = {
          ...gameData,
          id: `created_${Date.now()}`,
          creatorId: user.id,
          status: 'APPROVED',
          plays: 0
      };
      // For now we assume UserStats has createdGames array, or we patch it if missing in local type (it is present in updated types.ts)
      const currentCreated = user.createdGames || [];
      onUpdateUser({ ...user, createdGames: [...currentCreated, newGame] });
      alert("Game Saved! Check your Profile to play it.");
      setView('DASHBOARD');
  };

  const renderDashboard = () => (
      <div className="grid grid-cols-2 gap-4 p-4 pb-24 animate-in zoom-in duration-300">
          {TOOLS.map(tool => {
              const unlocked = isUnlocked(tool);
              
              const Icon = 
                  tool.icon === 'Bot' ? Bot : 
                  tool.icon === 'Image' ? ImageIcon : 
                  tool.icon === 'Eye' ? Eye : 
                  tool.icon === 'Mic' ? Mic :
                  tool.icon === 'Gamepad2' ? Gamepad2 :
                  tool.icon === 'Scan' ? Scan :
                  tool.icon === 'Code' ? Code : 
                  tool.icon === 'Workflow' ? Workflow :
                  Lock;

              const colorClass = 
                  tool.type === 'AGENT_BUILDER' ? 'text-electric' : 
                  tool.type === 'IMAGE_GEN' ? 'text-cyan' : 
                  tool.type === 'AUDIO' ? 'text-amber-500' : 
                  tool.type === 'GAME_CREATOR' ? 'text-pink-500' :
                  tool.type === 'JARVIS' ? 'text-green-400' :
                  'text-blue-400';

              const borderClass = 
                   tool.type === 'AGENT_BUILDER' ? 'border-electric' : 
                   tool.type === 'IMAGE_GEN' ? 'border-cyan' : 
                   tool.type === 'AUDIO' ? 'border-amber-500' : 
                   tool.type === 'GAME_CREATOR' ? 'border-pink-500' :
                   tool.type === 'JARVIS' ? 'border-green-400' :
                   'border-blue-400';

              const displayName = t(tool.name);
              const displayDesc = t(tool.description);

              return (
                  <div 
                     key={tool.id}
                     className={`relative rounded-2xl border p-4 text-left flex flex-col justify-between min-h-[160px] overflow-hidden transition-all duration-300 ${
                         unlocked 
                         ? `bg-gray-900/40 border-white/10 hover:${borderClass} hover:shadow-lg cursor-pointer` 
                         : 'bg-black/50 border-gray-800 opacity-80 cursor-not-allowed group'
                     }`}
                     onClick={() => { if(unlocked) { setView(tool.id); audio.playClick(); } else { audio.playError(); onTriggerPaywall(); } }}
                  >
                      {activeTooltip === tool.id && (
                          <ToolTooltip tool={tool} onClose={() => setActiveTooltip(null)} t={t} />
                      )}

                      <button 
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-white/5 hover:bg-white/20 text-gray-400 hover:text-white z-10 transition-colors"
                        onClick={(e) => { e.stopPropagation(); setActiveTooltip(tool.id); }}
                      >
                          <Info size={14} />
                      </button>

                      <div>
                          <div className={`p-3 rounded-xl bg-black/40 w-min mb-3 border border-white/5`}>
                              <Icon size={24} className={unlocked ? colorClass : 'text-gray-600'} />
                          </div>
                          <h3 className={`font-bold text-sm ${unlocked ? 'text-white' : 'text-gray-500'}`}>{displayName}</h3>
                          <p className="text-[10px] text-gray-400 mt-1 leading-tight">{displayDesc.substring(0, 40)}...</p>
                      </div>
                      
                      {!unlocked && (
                          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 text-center backdrop-blur-[2px] transition-opacity duration-300">
                              <Lock size={32} className="text-gray-600 mb-2 group-hover:scale-110 transition-transform" />
                              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{t('lab.locked')}</div>
                              <div className="text-[10px] text-electric bg-electric/10 border border-electric/30 px-3 py-1.5 rounded-full font-mono flex items-center justify-center text-center">
                                  {t(tool.unlockCondition)}
                              </div>
                          </div>
                      )}
                  </div>
              );
          })}
      </div>
  );

  return (
      <div className="h-full flex flex-col bg-void relative">
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20 backdrop-blur sticky top-0 z-10 flex-shrink-0">
              {view === 'DASHBOARD' ? (
                  <h1 className="text-xl font-black text-white tracking-tight">{t('lab.title')} <span className="text-electric">{t('lab.subtitle')}</span></h1>
              ) : (
                  <button onClick={() => setView('DASHBOARD')} className="text-gray-400 hover:text-white flex items-center text-sm font-bold">
                      <ArrowLeft size={16} className="mr-2" /> {t('lab.back')}
                  </button>
              )}
              <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <div className="text-[10px] font-mono text-gray-400">{t('lab.system_online')}</div>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-5">
              {view === 'DASHBOARD' && renderDashboard()}
              {view === 'VISION_EYE' && <VisionEye />}
              {view === 'GAME_CREATOR' && <GameCreator onGameCreated={handleGameCreated} />}
              {view === 'OMNI_SIGHT' && <OmniSight />}
              
              {/* Agent Builder View */}
              {view === 'CHAT_BOT' && (
                  <div className="flex-1 flex flex-col relative min-h-0">
                    <div className="flex border-b border-white/10 bg-gray-900/50 flex-shrink-0">
                         <button 
                            onClick={() => { setAgentMode('CHAT'); setActiveAgent(null); }} 
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${agentMode === 'CHAT' ? 'bg-electric/10 text-electric border-b-2 border-electric' : 'text-gray-500 hover:text-gray-300'}`}
                         >
                             Neural Link
                         </button>
                         <button 
                            onClick={() => setAgentMode('BUILD')}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center ${
                                agentMode === 'BUILD' 
                                ? 'bg-purple-500/10 text-purple-400 border-b-2 border-purple-500' 
                                : 'text-gray-500 hover:text-gray-300'
                            }`}
                         >
                             Architect Node
                         </button>
                    </div>
                    
                    <div className="flex-1 overflow-hidden relative bg-gray-900/20 flex flex-col min-h-0">
                        {agentMode === 'CHAT' ? (
                            activeAgent ? (
                                <div className="h-full flex flex-col min-h-0">
                                     <div className="bg-black/20 border-b border-white/5 p-2 flex justify-between items-center flex-shrink-0">
                                        <Button size="sm" variant="ghost" onClick={() => setActiveAgent(null)} className="text-xs text-gray-400 hover:text-white">
                                            <ArrowLeft size={12} className="mr-1"/> Back to Agents
                                        </Button>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xs font-bold text-white">{activeAgent.name}</span>
                                            <Button size="sm" variant="ghost" onClick={() => handleShareAgent(activeAgent)} className="text-gray-400 hover:text-white">
                                                <Share2 size={14} />
                                            </Button>
                                        </div>
                                     </div>
                                     <div className="flex-1 overflow-hidden min-h-0 relative">
                                        <AgentBuilder 
                                            key={activeAgent.id} 
                                            agent={activeAgent} 
                                            onSave={handleSaveAgent} 
                                            checkCooldown={checkAgentCooldown}
                                        />
                                     </div>
                                </div>
                            ) : (
                                <div className="h-full p-4 overflow-y-auto pb-24">
                                    <div className="grid grid-cols-3 gap-3">
                                        {user.agents.map(a => (
                                            <div key={a.id} className="relative group">
                                                <button 
                                                    onClick={() => setActiveAgent(a)} 
                                                    className="w-full flex flex-col items-center p-3 rounded-xl bg-gray-800 border border-gray-700 hover:border-electric hover:bg-gray-700 transition-all"
                                                >
                                                    <div className="w-12 h-12 rounded-full bg-black border border-gray-600 flex items-center justify-center text-2xl mb-2 group-hover:scale-110 transition-transform">
                                                        {a.avatar}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-gray-300 truncate w-full text-center group-hover:text-white">{a.name}</span>
                                                    <span className="text-[8px] text-gray-500 truncate">{a.persona}</span>
                                                </button>
                                            </div>
                                        ))}
                                        <button 
                                            onClick={() => setAgentMode('BUILD')}
                                            className="flex flex-col items-center p-3 rounded-xl border border-dashed border-gray-700 hover:border-gray-500 hover:bg-white/5 transition-all"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center mb-2">
                                                <Plus size={20} className="text-gray-500" />
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-500">Create New</span>
                                        </button>
                                    </div>
                                    
                                    {user.agents.length === 0 && (
                                        <div className="mt-10 flex flex-col items-center justify-center text-gray-500 text-sm text-center opacity-50">
                                            <Bot size={48} className="mb-4"/>
                                            <p>No neural links established.</p>
                                        </div>
                                    )}
                                </div>
                            )
                        ) : (
                            <div className="h-full overflow-hidden min-h-0 relative">
                                <AgentBuilder 
                                    onSave={handleSaveAgent} 
                                    checkCooldown={checkAgentCooldown}
                                />
                            </div>
                        )}
                    </div>
                  </div>
              )}
              
              {view === 'IMG_GEN' && (
                  <div className="h-full flex flex-col items-center justify-center space-y-6 p-6 pb-24 overflow-y-auto">
                        <div className="w-full aspect-square max-w-sm bg-black rounded-xl border border-white/10 p-2 flex items-center justify-center overflow-hidden relative shadow-2xl">
                            {isGenLoading ? (
                                <Sparkles className="text-cyan animate-spin" size={48} />
                            ) : genImage ? (
                                <img src={genImage} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                                <ImageIcon size={64} className="text-gray-800" />
                            )}
                        </div>
                        <div className="w-full max-w-sm space-y-3">
                            <textarea 
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan focus:outline-none resize-none font-mono text-sm"
                            rows={3}
                            placeholder="// Enter visual parameters..."
                            value={imgPrompt}
                            onChange={e => setImgPrompt(e.target.value)}
                            />
                            <Button fullWidth variant="primary" onClick={handleGenImage} disabled={!imgPrompt || isGenLoading}>
                                <Sparkles size={16} className="mr-2" /> Generate
                            </Button>
                            {!user.isPro && <p className="text-[10px] text-center text-gray-500">Free Plan: {2 - dailyGenCount > 0 ? `${2 - dailyGenCount} free left` : 'Uses Credits'} today.</p>}
                        </div>
                  </div>
              )}
              
              {view === 'AUDIO_LAB' && (
                 <div className="h-full flex flex-col items-center justify-center text-center space-y-6 p-6">
                     <div className="w-64 h-64 rounded-full border-4 border-amber-500/20 flex items-center justify-center relative">
                         <div className="absolute inset-0 rounded-full border border-amber-500/50 animate-ping opacity-50"></div>
                         <div className="absolute inset-4 rounded-full bg-amber-900/20 blur-xl"></div>
                         <Mic size={64} className="text-amber-500 relative z-10" />
                     </div>
                     <div>
                         <h3 className="text-xl font-bold text-white uppercase tracking-widest">Voice Synth</h3>
                         <p className="text-gray-400 text-sm mt-2 font-mono">Audio Input Stream Active</p>
                     </div>
                </div>
              )}
          </div>
      </div>
  );
};
