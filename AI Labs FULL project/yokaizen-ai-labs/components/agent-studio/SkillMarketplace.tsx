import React, { useEffect, useState } from 'react';
import { Agent, AgentSkill } from '../../types';
import { listSkills, addAgentSkill, removeAgentSkill } from '../../services/agentService';
import { Search, Globe, Database, Terminal, Shield, Cpu, Zap, Download, Check } from 'lucide-react';
import { Button } from '../ui/Button';

interface SkillMarketplaceProps {
    agent: Partial<Agent>;
    onSkillChange: (skillId: string, action: 'ADD' | 'REMOVE') => void;
    t: (key: string) => string;
}

export const SkillMarketplace: React.FC<SkillMarketplaceProps> = ({ agent, onSkillChange, t }) => {
    const [skills, setSkills] = useState<AgentSkill[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<string>('ALL');

    useEffect(() => {
        const fetchSkills = async () => {
            setIsLoading(true);
            const data = await listSkills();
            setSkills(data);
            setIsLoading(false);
        };
        fetchSkills();
    }, []);

    const filteredSkills = skills.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = category === 'ALL' || s.category === category;
        return matchesSearch && matchesCategory;
    });

    // Check if agent has skill (either in local array or backend list)
    // Note: local array stores keys/ids, backend list stores objects.
    // We need to robustly check.
    const hasSkill = (skill: AgentSkill) => {
        // If agent.skills is populated (backend object)
        if (agent.skills?.some(s => s.id === skill.id)) return true;
        // If capability string array (frontend local state before deep load)
        if (agent.capabilities?.customTools?.includes(skill.id)) return true; // checking ID
        if (agent.capabilities?.customTools?.includes(skill.key)) return true; // checking Key
        return false;
    };

    const handleInstall = async (skill: AgentSkill) => {
        onSkillChange(skill.id, hasSkill(skill) ? 'REMOVE' : 'ADD');
    };

    const categories = ['ALL', 'SEARCH', 'DATA', 'UTILITY', 'SOCIAL', 'CREATIVE'];

    const getIcon = (cat: string) => {
        switch (cat) {
            case 'SEARCH': return Globe;
            case 'DATA': return Database;
            case 'UTILITY': return Terminal;
            case 'SOCIAL': return Zap;
            case 'CREATIVE': return Cpu;
            default: return Shield;
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in">
            {/* Header / Search */}
            <div className="flex space-x-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 text-gray-500" size={16} />
                    <input
                        className="w-full bg-black border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-electric focus:outline-none text-sm"
                        placeholder="Search skills (e.g. Web, Python, Email)..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="bg-black border border-gray-800 rounded-lg px-4 py-2 text-white text-sm focus:border-electric outline-none"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-800">
                {isLoading && <div className="text-center col-span-2 text-gray-500 py-10">Loading neural marketplace...</div>}

                {!isLoading && filteredSkills.map(skill => {
                    const isInstalled = hasSkill(skill);
                    const Icon = getIcon(skill.category);

                    return (
                        <div key={skill.id} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-all flex flex-col justify-between group">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className={`p-2 rounded-lg ${isInstalled ? 'bg-electric text-white' : 'bg-gray-800 text-gray-500 group-hover:bg-gray-700 group-hover:text-white transition-colors'}`}>
                                        <Icon size={18} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-sm">{skill.name}</h4>
                                        <span className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 border border-gray-700">{skill.category}</span>
                                    </div>
                                </div>
                                {skill.isPremium && <span className="text-[10px] text-yellow-400 border border-yellow-400/30 px-1 rounded">PRO</span>}
                            </div>

                            <p className="text-xs text-gray-400 mt-2 line-clamp-2">{skill.description}</p>

                            <Button
                                size="sm"
                                variant={isInstalled ? 'secondary' : 'primary'}
                                className={`mt-3 w-full ${isInstalled ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20' : ''}`}
                                onClick={() => handleInstall(skill)}
                            >
                                {isInstalled ? (
                                    <> <Check size={14} className="mr-1" /> Installed </>
                                ) : (
                                    <> <Download size={14} className="mr-1" /> Install </>
                                )}
                            </Button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
