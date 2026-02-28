import React, { useState } from 'react';
import { Agent, UserStats } from '../../types';
import { Button } from '../ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { Bot, Download, Star, Search, Shield, Zap, Info } from 'lucide-react';

interface AgentMarketplaceProps {
    user: UserStats;
    onImportAgent: (agent: Agent) => void;
    t: (key: string) => string;
}

// Mock community agents for the marketplace
const COMMUNITY_AGENTS: Agent[] = [
    {
        id: 'mkt_1',
        name: 'Nexus Prime',
        persona: 'Elite Cybersecurity Analyst',
        systemInstruction: 'You are Nexus Prime, a specialist in threat detection and zero-day vulnerabilities. Analyze input code or logs for security flaws and suggest mitigation strategies.',
        knowledgeBase: 'CVE Database 2024, OWASP Top 10, MITRE ATT&CK Framework.',
        avatar: '🛡️',
        creatorId: 'sys_admin',
        modelPref: 'GEMINI_PRO',
        capabilities: { canUseTools: true, customTools: ['Code Scanner', 'Log Analyzer'] }
    },
    {
        id: 'mkt_2',
        name: 'Aethelred',
        persona: 'Historical Strategy AI',
        systemInstruction: 'You are Aethelred, simulating historical warfare and negotiation. Speak formally, analyze political situations, and provide optimal outcomes based on game theory.',
        avatar: '👑',
        creatorId: 'historian_x',
        modelPref: 'GEMINI_FLASH',
        capabilities: { canUseTools: false, customTools: [] }
    },
    {
        id: 'mkt_3',
        name: 'Data Whisperer',
        persona: 'Advanced Data Scientist',
        systemInstruction: 'You are an expert Data Scientist. You excel in Python, Pandas, and neural networks. Provide code snippets and interpret statistical data for the user.',
        avatar: '📈',
        creatorId: 'data_guru',
        modelPref: 'DEEPSEEK_V3',
        capabilities: { canUseTools: true, customTools: ['Python Execution', 'Graph Plotter'] }
    },
    {
        id: 'mkt_4',
        name: 'Zenith',
        persona: 'Therapy & Wellness Bot',
        systemInstruction: 'You are Zenith. You provide calm, supportive, and non-judgmental guidance. Help the user reflect on their actions, manage stress, and find clarity.',
        avatar: '🌸',
        creatorId: 'wellness_ai',
        modelPref: 'GEMINI_FLASH',
        capabilities: { canUseTools: false, customTools: [] }
    }
];

export const AgentMarketplace: React.FC<AgentMarketplaceProps> = ({ user, onImportAgent, t }) => {
    const { showToast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

    const filteredAgents = COMMUNITY_AGENTS.filter(a =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.persona.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDownload = (agent: Agent) => {
        // Check if user already has it
        if (user.agents.find(a => a.id === agent.id)) {
            showToast('You already have this agent in your Neural Link.', 'error');
            return;
        }

        // Clone the agent so the user gets their own copy of it to modify
        const importedAgent: Agent = {
            ...agent,
            id: `imported_${agent.id}_${Date.now()}` // Generate new ID so they can own it
        };

        onImportAgent(importedAgent);
        showToast(`${agent.name} imported successfully!`, 'success');
        setSelectedAgent(null);
    };

    return (
        <div className="h-full flex flex-col pt-4 overflow-hidden relative">
            <div className="px-4 mb-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search Community Templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-cyan focus:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-20 space-y-4 scrollbar-thin scrollbar-thumb-gray-800">
                {filteredAgents.map(agent => (
                    <div key={agent.id} className="bg-black/60 border border-white/5 rounded-2xl p-4 flex gap-4 hover:border-white/20 transition-all group backdrop-blur-md cursor-pointer" onClick={() => setSelectedAgent(agent)}>
                        <div className="w-16 h-16 rounded-xl bg-gray-900 border border-gray-700 flex items-center justify-center text-3xl shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                            {agent.avatar}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="text-white font-black truncate text-lg group-hover:text-cyan transition-colors">{agent.name}</h4>
                                <div className="flex items-center text-xs text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                    <Star size={12} className="mr-1 inline pb-[1px]" /> 4.9
                                </div>
                            </div>
                            <p className="text-sm text-cyan font-mono truncate mb-2 opacity-80">{agent.persona}</p>
                            <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{agent.systemInstruction}</p>
                        </div>
                    </div>
                ))}

                {filteredAgents.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        <Search size={32} className="mx-auto mb-3 opacity-30" />
                        <p>No community agents found matching '{searchQuery}'</p>
                    </div>
                )}
            </div>

            {/* Agent Detail Modal */}
            {selectedAgent && (
                <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md p-6 flex flex-col animate-in slide-in-from-bottom-4 duration-300">
                    <button onClick={() => setSelectedAgent(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white bg-white/5 rounded-full p-2 transition-colors">
                        <Info size={20} className="rotate-45" /> {/* Rotating Info acts as a soft close icon */}
                    </button>

                    <div className="flex items-center gap-6 mb-8 mt-4">
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-gray-800 to-black border border-gray-700 flex items-center justify-center text-5xl shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                            {selectedAgent.avatar}
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white">{selectedAgent.name}</h2>
                            <p className="text-cyan font-mono mt-1">{selectedAgent.persona}</p>
                            <div className="flex items-center gap-3 mt-3">
                                <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded border border-white/10">By @{selectedAgent.creatorId}</span>
                                <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded border border-white/10 flex items-center"><Zap size={12} className="mr-1 text-electric" /> {selectedAgent.modelPref}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Core Directive</h3>
                            <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-sm text-gray-300 leading-relaxed font-mono">
                                {selectedAgent.systemInstruction}
                            </div>
                        </div>

                        {selectedAgent.knowledgeBase && (
                            <div>
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center"><Shield size={14} className="mr-2" /> Pre-loaded Knowledge</h3>
                                <p className="text-sm text-gray-400">{selectedAgent.knowledgeBase}</p>
                            </div>
                        )}

                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center"><Bot size={14} className="mr-2" /> Capabilities</h3>
                            <div className="flex flex-wrap gap-2">
                                {selectedAgent.capabilities?.customTools?.map((tool, i) => (
                                    <span key={i} className="text-xs bg-electric/10 text-electric border border-electric/30 px-3 py-1.5 rounded-lg shadow-[0_0_10px_rgba(196,95,255,0.1)]">
                                        {tool}
                                    </span>
                                ))}
                                {(!selectedAgent.capabilities?.customTools || selectedAgent.capabilities.customTools.length === 0) && (
                                    <span className="text-xs text-gray-500 italic">Conversational Only</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 mt-auto">
                        <Button fullWidth variant="primary" onClick={() => handleDownload(selectedAgent)} className="py-4 shadow-[0_0_20px_rgba(6,182,212,0.3)] border-cyan text-white bg-cyan/20 hover:bg-cyan/40">
                            <Download size={20} className="mr-2" /> Import Agent Template
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
