
import React, { useState, useRef, useEffect } from 'react';
import { UserStats, Agent, CompetitionTemplate, ToolDef } from '../../types';
import { Button } from '../ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { AgentBuilder } from './AgentBuilder';
import { VisionEye } from './VisionEye';
import { GameCreator } from './GameCreator';
import { OmniSight } from './OmniSight';
import { Bot, Image as ImageIcon, Mic, Eye, Lock, Sparkles, Grid, ArrowLeft, Gamepad2, Scan, Code, Workflow, Info, X, Check, Clock, Trophy, Plus, Share2, ShoppingBag, RefreshCw, Zap, Star, Heart } from 'lucide-react';
import { generateMockImage, optimizeCode } from '../../services/geminiService';
import { TOOLS, COMPETITION_TEMPLATES } from '../../constants';
import { audio } from '../../services/audioService';

interface ToolSandboxProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserStats;
    onUpdateUser: (user: UserStats) => void;
    onTriggerPaywall: () => void;
    t: (key: string, replace?: any) => string;
    initialTool?: string | null;
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

const AgentShareCard: React.FC<{ agent: Agent, onClose: () => void }> = ({ agent, onClose }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const { showToast } = useToast();
    const hash = agent.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const int = (hash % 100) + 1;
    const crea = ((hash * 13) % 100) + 1;
    const emp = ((hash * 7) % 100) + 1;
    const rarity = int + crea + emp > 250 ? 'LEGENDARY' : int + crea + emp > 180 ? 'RARE' : 'COMMON';

    const handleCopyLink = () => {
        const payload = btoa(JSON.stringify(agent));
        const url = `${window.location.origin}?agent=${payload}`;
        navigator.clipboard.writeText(url);
        audio.playSuccess();
        showToast("Neural Link Copied! Share this with your squad.", 'success');
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -15;
        const rotateY = ((x - centerX) / centerX) * 15;
        cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const handleMouseLeave = () => {
        if (!cardRef.current) return;
        cardRef.current.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
    };

    const rarityColor = rarity === 'LEGENDARY' ? 'text-amber-400 border-amber-500' : rarity === 'RARE' ? 'text-cyan-400 border-cyan-500' : 'text-gray-300 border-gray-500';
    const bgGradient = rarity === 'LEGENDARY' ? 'from-amber-900/40 via-black to-amber-900/20' : 'from-cyan-900/40 via-black to-cyan-900/20';

    return (
        <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6 animate-in zoom-in duration-300 backdrop-blur-xl">
            <div className="mb-4 text-center">
                <h2 className="text-2xl font-black text-white uppercase italic tracking-wider">Neural <span className="text-electric">Collection</span></h2>
                <p className="text-gray-400 text-xs">Share your construct with the network.</p>
            </div>
            <div ref={cardRef} className={`relative w-full max-w-sm bg-gradient-to-br ${bgGradient} border-2 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.6)] transition-transform duration-100 ease-out`} style={{ transformStyle: 'preserve-3d', borderColor: rarity === 'LEGENDARY' ? '#f59e0b' : '#06b6d4' }} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
                <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_40%,rgba(255,255,255,0.1)_45%,rgba(255,255,255,0.0)_50%)] pointer-events-none z-20"></div>
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40 backdrop-blur-sm relative z-10">
                    <div className="flex items-center space-x-2">
                        <Bot className={rarity === 'LEGENDARY' ? 'text-amber-400' : 'text-cyan-400'} size={20} />
                        <span className={`text-xs font-bold uppercase tracking-widest ${rarityColor.split(' ')[0]}`}>{rarity} CLASS</span>
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono">#{agent.id.substring(0, 6).toUpperCase()}</div>
                </div>
                <div className="p-6 flex flex-col items-center text-center relative z-10">
                    <div className={`w-40 h-40 rounded-full border-4 p-1 mb-6 shadow-xl relative group ${rarity === 'LEGENDARY' ? 'border-amber-500' : 'border-cyan-500'}`}>
                        <div className="w-full h-full rounded-full overflow-hidden bg-black relative z-10">
                            {agent.avatar?.startsWith('http') ? <img src={agent.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-7xl">{agent.avatar}</div>}
                        </div>
                        <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-pulse"></div>
                    </div>
                    <h2 className="text-3xl font-black text-white mb-1 uppercase tracking-tight drop-shadow-md">{agent.name}</h2>
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-6 bg-black/50 px-3 py-1 rounded-full border border-white/10">{agent.persona}</p>
                    <div className="grid grid-cols-3 gap-2 w-full mb-6">
                        <div className="bg-black/60 p-2 rounded border border-white/10 flex flex-col items-center"><Zap size={14} className="text-yellow-400 mb-1" /><span className="text-xs font-bold text-white">{int}</span><span className="text-[8px] text-gray-500 uppercase">INTEL</span></div>
                        <div className="bg-black/60 p-2 rounded border border-white/10 flex flex-col items-center"><Star size={14} className="text-purple-400 mb-1" /><span className="text-xs font-bold text-white">{crea}</span><span className="text-[8px] text-gray-500 uppercase">CREA</span></div>
                        <div className="bg-black/60 p-2 rounded border border-white/10 flex flex-col items-center"><Heart size={14} className="text-red-400 mb-1" /><span className="text-xs font-bold text-white">{emp}</span><span className="text-[8px] text-gray-500 uppercase">EMP</span></div>
                    </div>
                    <Button fullWidth variant="primary" onClick={handleCopyLink} className="mb-3 shadow-lg font-bold tracking-wider"><Share2 size={16} className="mr-2" /> COPY NEURAL LINK</Button>
                    <button onClick={onClose} className="text-xs text-gray-500 hover:text-white underline">Close Card</button>
                </div>
            </div>
        </div>
    );
};

export const ToolSandbox: React.FC<ToolSandboxProps> = ({ isOpen, onClose, user, onUpdateUser, initialTool, onTriggerPaywall, t }) => {
    const [view, setView] = useState<string>(initialTool || 'DASHBOARD');
    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
    const { showToast } = useToast();

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

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const sharedAgent = params.get('agent');
        if (sharedAgent && view === 'DASHBOARD') {
            try {
                const decoded = JSON.parse(atob(sharedAgent));
                if (decoded && decoded.name) {
                    const newAgent = { ...decoded, id: `imported_${Date.now()}`, creatorId: 'imported' };
                    setImportAgentData(newAgent);
                    setView('CHAT_BOT');
                }
            } catch (e) { }
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [view]);

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
        setImportAgentData(null);
        audio.playSuccess();
    };

    const handleDeleteAgent = (agentId: string) => {
        if (window.confirm("Are you sure you want to delete this agent?")) {
            const newAgents = user.agents.filter(a => a.id !== agentId);
            onUpdateUser({ ...user, agents: newAgents });
            setActiveAgent(null);
            audio.playClick();
        }
    };

    const handleShareAgent = (agent: Agent) => {
        setShowShareCard(agent);
    };

    const handleGenImage = async () => {
        if (!imgPrompt) return;
        const limit = user.isPro ? (user.subscriptionTier === 'pro_creator' ? 20 : 5) : 2;

        if (dailyGenCount >= limit) {
            if (user.credits >= 50) {
                const confirm = window.confirm(`Daily limit reached (${limit}). Spend 50 Credits to generate?`);
                if (!confirm) return;
                onUpdateUser({ ...user, credits: user.credits - 50 });
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
        const currentCreated = user.createdGames || [];
        onUpdateUser({ ...user, createdGames: [...currentCreated, newGame] });
        showToast("Game Saved! Check your Profile to play it.", 'success');
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
                        className={`relative rounded-2xl border p-4 text-left flex flex-col justify-between min-h-[160px] overflow-hidden transition-all duration-300 ${unlocked
                            ? `bg-gray-900/40 border-white/10 hover:${borderClass} hover:shadow-lg cursor-pointer`
                            : 'bg-black/50 border-gray-800 opacity-80 cursor-not-allowed group'
                            }`}
                        onClick={() => { if (unlocked) { setView(tool.id); audio.playClick(); } else { audio.playError(); onTriggerPaywall(); } }}
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
            {showShareCard && (<AgentShareCard agent={showShareCard} onClose={() => setShowShareCard(null)} />)}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20 backdrop-blur sticky top-0 z-10 flex-shrink-0">
                {view === 'DASHBOARD' ? (
                    <h1 className="text-xl font-black text-white tracking-tight">{t('lab.title')} <span className="text-electric">{t('lab.subtitle')}</span></h1>
                ) : (
                    <button onClick={() => setView('DASHBOARD')} className="text-gray-400 hover:text-white flex items-center text-sm font-bold">
                        <ArrowLeft size={16} className="mr-2" /> {t('ui.back_grid')}
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
                        {importAgentData && (<div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in"><div className="bg-gray-900 border border-electric p-6 rounded-xl w-full max-w-sm text-center shadow-2xl relative overflow-hidden"><div className="absolute inset-0 bg-electric/5 animate-pulse"></div><div className="w-24 h-24 mx-auto bg-black rounded-full border-2 border-electric flex items-center justify-center overflow-hidden mb-4 shadow-[0_0_30px_rgba(196,95,255,0.4)]">{importAgentData.avatar?.startsWith('http') ? <img src={importAgentData.avatar} className="w-full h-full object-cover" /> : <span className="text-4xl">{importAgentData.avatar}</span>}</div><h3 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tighter">INCOMING SIGNAL</h3><div className="bg-black/50 p-3 rounded-lg border border-white/10 mb-6"><p className="text-white font-bold">{importAgentData.name}</p><p className="text-xs text-gray-400 font-mono">Persona: {importAgentData.persona}</p></div><div className="flex space-x-3"><Button variant="ghost" onClick={() => setImportAgentData(null)} fullWidth>REJECT</Button><Button variant="primary" onClick={() => handleSaveAgent(importAgentData)} fullWidth className="shadow-[0_0_20px_rgba(196,95,255,0.3)]">{t('agent.import')}</Button></div></div></div>)}
                        <div className="flex border-b border-white/10 bg-gray-900/50 flex-shrink-0">
                            <button
                                onClick={() => { setAgentMode('CHAT'); setActiveAgent(null); }}
                                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${agentMode === 'CHAT' ? 'bg-electric/10 text-electric border-b-2 border-electric' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Neural Link
                            </button>
                            <button
                                onClick={() => setAgentMode('BUILD')}
                                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center ${agentMode === 'BUILD'
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
                                    <div className="h-full flex flex-col min-h-0 animate-in slide-in-from-right duration-300">
                                        <div className="bg-black/20 border-b border-white/5 p-2 flex justify-between items-center flex-shrink-0">
                                            <Button size="sm" variant="ghost" onClick={() => setActiveAgent(null)} className="text-xs text-gray-400 hover:text-white">
                                                <ArrowLeft size={12} className="mr-1" /> {t('agent.back')}
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
                                                onDelete={handleDeleteAgent}
                                                checkCooldown={checkAgentCooldown}
                                                t={t}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full p-4 overflow-y-auto pb-24">
                                        <div className="grid grid-cols-3 gap-3">
                                            <button
                                                onClick={() => setAgentMode('BUILD')}
                                                className="flex flex-col items-center p-3 rounded-xl border border-dashed border-gray-700 hover:border-gray-500 hover:bg-white/5 transition-all"
                                            >
                                                <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center mb-2">
                                                    <Plus size={20} className="text-gray-500" />
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-500">{t('agent.create_new')}</span>
                                            </button>
                                            {user.agents.map(a => (
                                                <div key={a.id} className="relative group">
                                                    <button
                                                        onClick={() => setActiveAgent(a)}
                                                        className="w-full flex flex-col items-center p-3 rounded-xl bg-gray-800 border border-gray-700 hover:border-electric hover:bg-gray-700 transition-all"
                                                    >
                                                        <div className="w-12 h-12 rounded-full bg-black border border-gray-600 flex items-center justify-center text-2xl mb-2 group-hover:scale-110 transition-transform overflow-hidden">
                                                            {a.avatar?.startsWith('http') ? <img src={a.avatar} className="w-full h-full object-cover" /> : a.avatar}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-gray-300 truncate w-full text-center group-hover:text-white">{a.name}</span>
                                                        <span className="text-[8px] text-gray-500 truncate">{a.persona.substring(0, 10)}...</span>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        {user.agents.length === 0 && (
                                            <div className="mt-10 flex flex-col items-center justify-center text-gray-500 text-sm text-center opacity-50">
                                                <Bot size={48} className="mb-4" />
                                                <p>{t('agent.no_agents')}</p>
                                            </div>
                                        )}
                                    </div>
                                )
                            ) : (
                                <div className="h-full overflow-hidden min-h-0 relative animate-in slide-in-from-right duration-300">
                                    <AgentBuilder
                                        onSave={handleSaveAgent}
                                        checkCooldown={checkAgentCooldown}
                                        t={t}
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
                                <Sparkles size={16} className="mr-2" /> {t('ui.generate')}
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
                            <h3 className="text-xl font-bold text-white uppercase tracking-widest">{t('tool.AUDIO_LAB.name')}</h3>
                            <p className="text-gray-400 text-sm mt-2 font-mono">Audio Input Stream Active</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
