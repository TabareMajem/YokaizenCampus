import React, { useState } from 'react';
import { Agent } from '../../types';
import { Shield, Plus, ArrowLeft } from 'lucide-react';
import { SkillMarketplace } from './SkillMarketplace';
import { Button } from '../ui/Button';
import { addAgentSkill, removeAgentSkill } from '../../services/agentService';

interface SkillsTabProps {
    formData: Partial<Agent>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Agent>>>;
    t: (key: string) => string;
}

export const SkillsTab: React.FC<SkillsTabProps> = ({ formData, setFormData, t }) => {
    const [view, setView] = useState<'LIST' | 'MARKET'>('LIST');

    const handleSkillChange = async (skillId: string, action: 'ADD' | 'REMOVE') => {
        // If agent exists, call API
        if (formData.id) {
            if (action === 'ADD') {
                await addAgentSkill(formData.id, skillId);
            } else {
                await removeAgentSkill(formData.id, skillId);
            }
            // We should reload agent skills ideally, or optimistic update
            // For now optimistic update of formData.capabilities
            const currentTools = formData.capabilities?.customTools || [];
            const newTools = action === 'ADD'
                ? [...currentTools, skillId]
                : currentTools.filter(t => t !== skillId);

            setFormData({
                ...formData,
                capabilities: { ...formData.capabilities, canUseTools: true, customTools: newTools }
            });

        } else {
            // Local state only
            const currentTools = formData.capabilities?.customTools || [];
            const newTools = action === 'ADD'
                ? [...currentTools, skillId]
                : currentTools.filter(t => t !== skillId);

            setFormData({
                ...formData,
                capabilities: { ...formData.capabilities, canUseTools: true, customTools: newTools }
            });
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in h-full flex flex-col">
            <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-500/30 flex items-start space-x-3 shrink-0">
                <Shield className="text-blue-400 shrink-0 mt-0.5" size={18} />
                <div>
                    <h4 className="text-sm font-bold text-blue-300">Skill Sandbox</h4>
                    <p className="text-xs text-blue-200/70 mt-1">Skills allow agents to interact with the world. Enabled skills run in a secure sandbox.</p>
                </div>
            </div>

            {view === 'LIST' ? (
                <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-white">Installed Capabilities</h3>
                        <Button size="sm" variant="primary" onClick={() => setView('MARKET')}>
                            <Plus size={14} className="mr-1" /> Add Skills
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 overflow-y-auto">
                        {(!formData.capabilities?.customTools || formData.capabilities.customTools.length === 0) && (
                            <div className="text-center py-10 border-2 border-dashed border-gray-800 rounded-xl">
                                <p className="text-gray-500 text-sm">No skills installed.</p>
                                <Button size="sm" variant="ghost" className="mt-2 text-electric" onClick={() => setView('MARKET')}>Browse Marketplace</Button>
                            </div>
                        )}

                        {formData.capabilities?.customTools?.map(skillId => (
                            <div key={skillId} className="p-3 bg-gray-900 border border-gray-800 rounded-lg flex justify-between items-center">
                                <span className="text-sm text-gray-300 font-mono">{skillId}</span>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-400 hover:text-red-300"
                                    onClick={() => handleSkillChange(skillId, 'REMOVE')}
                                >
                                    Uninstall
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col">
                    <div className="flex items-center space-x-2 mb-4">
                        <Button size="sm" variant="ghost" onClick={() => setView('LIST')} className="p-1"><ArrowLeft size={16} /></Button>
                        <h3 className="text-sm font-bold text-white">Skill Marketplace</h3>
                    </div>
                    <SkillMarketplace agent={formData} onSkillChange={handleSkillChange} t={t} />
                </div>
            )}
        </div>
    );
};
