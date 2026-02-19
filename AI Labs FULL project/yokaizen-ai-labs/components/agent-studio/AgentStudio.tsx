import React, { useState, useRef, useEffect } from 'react';
import { Agent } from '../../types';
import { Button } from '../ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { createAgent, updateAgent } from '../../services/agentService';
import { chatWithAgent, generateImage } from '../../services/geminiService';
import { Save, Send, Share2, Bot, Sparkles, Trash2, RefreshCw, User, Cpu, Zap, ArrowLeft, LayoutGrid, Activity } from 'lucide-react';
import { audio } from '../../services/audioService';
import { useAuth } from '../../contexts/AuthContext';
import { IdentityTab } from './IdentityTab';
import { SkillsTab } from './SkillsTab';
import { ProactivityTab } from './ProactivityTab';
import { AgentMonitor } from './AgentMonitor';
import { useTranslation } from '../../hooks/useTranslation';

interface AgentStudioProps {
    agent?: Agent;
    onSave: (agent: Agent) => void;
    onDelete?: (agentId: string) => void;
    onClose: () => void;
    checkCooldown?: () => boolean;
    t?: (key: string) => string;
}

export const AgentStudio: React.FC<AgentStudioProps> = ({
    agent: initialAgent,
    onSave,
    onDelete,
    onClose,
    checkCooldown,
    t: propT
}) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const { t: hookT } = useTranslation();
    const t = propT || hookT;

    // Tabs: 'IDENTITY', 'SKILLS', 'PROACTIVITY', 'MEMORY', 'MONITOR'
    const [activeTab, setActiveTab] = useState<'IDENTITY' | 'SKILLS' | 'PROACTIVITY' | 'MONITOR'>('IDENTITY');

    const [formData, setFormData] = useState<Partial<Agent>>(initialAgent || {
        name: '',
        persona: '',
        systemInstruction: '',
        knowledgeBase: '',
        avatar: '🤖', // Default avatar
        creatorId: user?.id || 'user',
        modelPref: 'GEMINI_FLASH',
        capabilities: {
            canUseTools: true,
            customTools: [] // Default skills
        }
    });

    // Avatar Gen State
    const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);

    // Chat State
    const [messages, setMessages] = useState<{ role: string, content: string, timestamp: string }[]>([
        {
            role: 'model',
            content: initialAgent
                ? t('agent.init_msg').replace('{name}', initialAgent.name)
                : t('agent.init_msg_default'),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Effects
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Handlers
    const handleSave = async () => {
        if (!formData.name) {
            showToast(t('agent.name_required'), 'error');
            audio.playError();
            return;
        }
        const agentToSave = {
            ...formData,
            systemInstruction: formData.systemInstruction || `You are ${formData.name}, a helpful AI assistant.`,
            id: formData.id || undefined, // undefined for new agents to let backend generate UUID
            creatorId: user?.id || 'user',
            modelPref: formData.modelPref || 'GEMINI_FLASH'
        } as Agent;

        try {
            let savedAgent;
            if (!formData.id) {
                // Creating new
                savedAgent = await createAgent(agentToSave);
            } else {
                // Updating
                savedAgent = await updateAgent(formData.id, agentToSave);
            }

            if (savedAgent) {
                onSave(savedAgent);
                setFormData(savedAgent); // Update local state with backend response (including ID)
                showToast(t('agent.saved_success'), 'success');
                audio.playSuccess();
            } else {
                showToast(t('agent.saved_error'), 'error');
            }
        } catch (error) {
            console.error(error);
            showToast(t('agent.connection_error'), 'error');
            audio.playError();
        }
    };

    const handleChat = async () => {
        if (!input.trim()) return;
        if (checkCooldown && !checkCooldown()) return;

        const userMsg = {
            role: 'user',
            content: input,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);
        audio.playTyping();

        try {
            const currentAgent = {
                ...formData,
                name: formData.name || 'Unknown Agent',
                systemInstruction: formData.systemInstruction || 'You are a helpful AI assistant.',
                persona: formData.persona || 'Assistant',
                knowledgeBase: formData.knowledgeBase || '',
                modelPref: formData.modelPref
            } as Agent;

            const apiHistory = messages.map(m => ({ role: m.role, content: m.content }));

            // Call service
            const responseText = await chatWithAgent(currentAgent, apiHistory, userMsg.content);

            setMessages(prev => [...prev, {
                role: 'model',
                content: responseText,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
            audio.playScan();
        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'model',
                content: t('agent.neural_link_unstable'),
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
            audio.playError();
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateAvatar = async () => {
        if (!formData.persona && !formData.name) {
            showToast(t('agent.enter_name_persona'), 'error');
            return;
        }
        setIsGeneratingAvatar(true);
        audio.playScan();
        try {
            const prompt = `A square avatar icon for an AI Agent named ${formData.name}. Persona: ${formData.persona}. Sci-fi, digital art style, minimalistic, vibrant colors.`;
            const url = await generateImage(prompt);
            setFormData(prev => ({ ...prev, avatar: url }));
            audio.playSuccess();
        } catch (e) {
            showToast(t('agent.avatar_gen_failed'), 'error');
            audio.playError();
        } finally {
            setIsGeneratingAvatar(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-6xl h-[85vh] bg-[#09090b] rounded-2xl border border-gray-800 shadow-2xl flex flex-col md:flex-row overflow-hidden relative">

                {/* Mobile Close / Back */}
                <button onClick={onClose} className="absolute top-4 right-4 z-50 md:hidden p-2 text-white bg-gray-800 rounded-full">
                    <ArrowLeft size={20} />
                </button>

                {/* LEFT COLUMN: Configuration */}
                <div className="w-full md:w-1/2 lg:w-5/12 border-r border-gray-800 flex flex-col bg-gray-900/50">
                    {/* Header */}
                    <div className="p-5 border-b border-gray-800 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center">
                                <Bot className="mr-2 text-electric" /> {t('agent.studio_title')}
                            </h2>
                            <p className="text-xs text-gray-500">{t('agent.studio_subtitle')}</p>
                        </div>
                        <div className="hidden md:block">
                            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">{t('ui.close')}</Button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex px-5 pt-4 space-x-4 border-b border-gray-800 bg-black/20 overflow-x-auto scrollbar-hide">
                        {[
                            { id: 'IDENTITY', label: t('agent.tab_identity'), icon: User },
                            { id: 'SKILLS', label: t('agent.tab_skills'), icon: Cpu },
                            { id: 'PROACTIVITY', label: t('agent.tab_proactivity'), icon: Zap },
                            { id: 'MONITOR', label: t('agent.tab_monitor'), icon: Activity },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id as any); audio.playClick(); }}
                                className={`pb-3 text-sm font-bold flex items-center space-x-2 transition-colors border-b-2 px-1 ${activeTab === tab.id
                                    ? 'text-white border-electric'
                                    : 'text-gray-500 border-transparent hover:text-gray-300'
                                    }`}
                            >
                                <tab.icon size={14} />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-gray-800">
                        {activeTab === 'IDENTITY' && (
                            <IdentityTab
                                formData={formData}
                                setFormData={setFormData}
                                handleGenerateAvatar={handleGenerateAvatar}
                                isGeneratingAvatar={isGeneratingAvatar}
                                t={t}
                            />
                        )}
                        {activeTab === 'SKILLS' && (
                            <SkillsTab
                                formData={formData}
                                setFormData={setFormData}
                                t={t}
                            />
                        )}

                        {activeTab === 'MONITOR' && formData.id && (
                            <AgentMonitor
                                agent={formData as Agent}
                                t={t}
                            />
                        )}
                        {activeTab === 'MONITOR' && !formData.id && (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <Activity size={48} className="mb-4 opacity-50" />
                                <p>{t('agent.save_monitor_hint')}</p>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-gray-800 bg-black/40 flex justify-between items-center">
                        {onDelete && formData.id && (
                            <Button variant="danger" size="sm" onClick={() => { onDelete(formData.id!); onClose(); }} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30">
                                <Trash2 size={16} />
                            </Button>
                        )}
                        <div className="flex space-x-3 ml-auto">
                            <Button variant="secondary" onClick={onClose}>{t('squad.cancel')}</Button>
                            <Button variant="primary" onClick={handleSave} className="shadow-[0_0_15px_rgba(196,95,255,0.3)]">
                                <Save size={16} className="mr-2" /> {t('agent.save')}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Preview / Chat */}
                <div className="hidden md:flex flex-1 flex-col bg-black relative">
                    {/* Simulation Header */}
                    <div className="p-3 border-b border-gray-800 bg-gray-900/30 flex justify-between items-center text-xs text-gray-500">
                        <span className="flex items-center"><LayoutGrid size={12} className="mr-1.5" /> {t('agent.simulation_env')}</span>
                        <span className="font-mono opacity-50">STATUS: {isLoading ? t('agent.status_processing') : t('agent.status_idle')}</span>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4 z-10 scrollbar-thin scrollbar-thumb-gray-800">
                        {messages.map((m, i) => {
                            const isUser = m.role === 'user';
                            return (
                                <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                                    {!isUser && (
                                        <div className="w-8 h-8 rounded-full bg-electric/20 border border-electric/40 flex items-center justify-center mr-3 mt-1 shrink-0 text-xs overflow-hidden">
                                            {formData.avatar?.startsWith('http') ? <img src={formData.avatar} className="w-full h-full object-cover" /> : formData.avatar}
                                        </div>
                                    )}
                                    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%]`}>
                                        <div className={`p-3.5 rounded-2xl text-sm shadow-md leading-relaxed ${isUser
                                            ? 'bg-electric text-white rounded-br-sm'
                                            : 'bg-gray-900 text-gray-200 rounded-bl-sm border border-gray-800'
                                            }`}>
                                            {m.content}
                                        </div>
                                        <div className="text-[9px] text-gray-600 mt-1 px-1">{m.timestamp}</div>
                                    </div>
                                </div>
                            );
                        })}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="w-8 h-8 rounded-full bg-electric/20 border border-electric/40 flex items-center justify-center mr-3 mt-1 shrink-0 text-xs overflow-hidden">
                                    {formData.avatar?.startsWith('http') ? <img src={formData.avatar} className="w-full h-full object-cover" /> : formData.avatar}
                                </div>
                                <div className="bg-gray-900 px-4 py-3 rounded-2xl rounded-bl-sm border border-gray-800 flex items-center space-x-1.5">
                                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" />
                                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-100" />
                                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-200" />
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Background Decor */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02]">
                        <Bot size={300} />
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-gray-900/30 border-t border-gray-800 z-20">
                        <div className="relative">
                            <input
                                className="w-full bg-black/50 border border-gray-700 rounded-full pl-5 pr-12 py-3 text-white focus:border-electric focus:outline-none text-sm transition-all shadow-inner"
                                placeholder={t('agent.chat_placeholder').replace('{name}', formData.name || 'Agent')}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleChat()}
                            />
                            <button
                                onClick={handleChat}
                                disabled={isLoading}
                                className="absolute right-1 top-1 h-10 w-10 bg-electric rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                            >
                                {isLoading ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
