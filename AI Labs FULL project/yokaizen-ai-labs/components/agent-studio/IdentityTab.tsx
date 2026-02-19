import React from 'react';
import { Agent } from '../../types';
import { Sparkles, Cpu, Lock } from 'lucide-react';
import { Button } from '../ui/Button';

interface IdentityTabProps {
    formData: Partial<Agent>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Agent>>>;
    handleGenerateAvatar: () => void;
    isGeneratingAvatar: boolean;
    t: (key: string) => string;
}

export const IdentityTab: React.FC<IdentityTabProps> = ({
    formData,
    setFormData,
    handleGenerateAvatar,
    isGeneratingAvatar,
    t
}) => {
    const isUrl = (str?: string) => str?.startsWith('http');

    const models = [
        { id: 'GEMINI_FLASH', name: t('agent.model_flash'), desc: t('agent.model_flash_desc'), color: 'text-yellow-400', locked: false },
        { id: 'DEEPSEEK_V3', name: t('agent.model_deepseek'), desc: t('agent.model_deepseek_desc'), color: 'text-cyan-400', locked: false }, // Mocked unlocked
        { id: 'GEMINI_PRO', name: t('agent.model_pro'), desc: t('agent.model_pro_desc'), color: 'text-purple-400', locked: true }
    ];

    return (
        <div className="space-y-5 animate-in fade-in">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">{t('agent.name')}</label>
                        <input
                            className="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-white focus:border-electric focus:outline-none text-sm transition-all"
                            placeholder={t('agent.placeholder_name')}
                            value={formData.name || ''}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">{t('agent.persona')}</label>
                        <input
                            className="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-white focus:border-electric focus:outline-none text-sm transition-all"
                            placeholder={t('agent.placeholder_persona')}
                            value={formData.persona || ''}
                            onChange={e => setFormData({ ...formData, persona: e.target.value })}
                        />
                    </div>
                </div>

                <div className="flex flex-col items-center space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase block">{t('agent.avatar')}</label>
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-xl border-2 border-gray-700 bg-black flex items-center justify-center overflow-hidden">
                            {isGeneratingAvatar ? (
                                <Sparkles className="animate-spin text-electric" />
                            ) : isUrl(formData.avatar) ? (
                                <img src={formData.avatar} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl">{formData.avatar}</span>
                            )}
                        </div>
                        <button
                            onClick={handleGenerateAvatar}
                            disabled={isGeneratingAvatar}
                            className="absolute -bottom-2 -right-2 bg-electric text-white p-2 rounded-full shadow-lg hover:bg-purple-500 transition-colors disabled:opacity-50"
                        >
                            <Sparkles size={14} />
                        </button>
                    </div>
                    <input
                        className="w-24 bg-transparent border-b border-gray-700 text-center text-xs text-gray-400 focus:border-electric focus:text-white focus:outline-none"
                        placeholder={t('agent.placeholder_avatar')}
                        value={formData.avatar || ''}
                        onChange={e => setFormData({ ...formData, avatar: e.target.value })}
                    />
                </div>
            </div>

            <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 flex items-center"><Cpu size={12} className="mr-1" /> {t('agent.model')}</label>
                <div className="grid grid-cols-3 gap-2">
                    {models.map(m => (
                        <button
                            key={m.id}
                            onClick={() => !m.locked && setFormData({ ...formData, modelPref: m.id as any })}
                            className={`relative p-3 rounded-xl border-2 text-left transition-all ${formData.modelPref === m.id ? 'bg-gray-800 border-white/50 shadow-lg' : 'bg-black border-gray-800 opacity-80 hover:opacity-100 hover:border-gray-600'}`}
                        >
                            <div className={`text-xs font-bold text-white mb-0.5 ${m.color}`}>{m.name}</div>
                            <div className="text-[9px] text-gray-500">{m.desc}</div>
                            {m.locked && <Lock size={12} className="absolute top-2 right-2 text-gray-600" />}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">{t('agent.instructions')}</label>
                <textarea
                    className="w-full h-40 bg-black border border-gray-700 rounded-lg p-3 text-white font-mono text-xs focus:border-electric focus:outline-none resize-none leading-relaxed"
                    placeholder={t('agent.placeholder_instruction')}
                    value={formData.systemInstruction || ''}
                    onChange={e => setFormData({ ...formData, systemInstruction: e.target.value })}
                />
            </div>
        </div>
    );
};
