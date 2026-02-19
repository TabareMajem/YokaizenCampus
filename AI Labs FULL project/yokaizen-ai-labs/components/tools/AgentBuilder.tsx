
import React, { useState, useRef, useEffect } from 'react';
import { Agent, AIModel } from '../../types';
import { Button } from '../ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { chatWithAgent, generateImage } from '../../services/geminiService';
import { Save, Send, Share2, Edit, MessageSquare, Database, Upload, CheckCircle2, Bot, Sparkles, Trash2, Cpu, Brain, Zap, Lock, ArrowLeft, RefreshCw } from 'lucide-react';
import { audio } from '../../services/audioService';
import { useAuth } from '../../contexts/AuthContext';

interface AgentBuilderProps {
    agent?: Agent;
    onSave: (agent: Agent) => void;
    onDelete?: (agentId: string) => void;
    checkCooldown?: () => boolean;
    t?: (key: string) => string;
}

export const AgentBuilder: React.FC<AgentBuilderProps> = ({ agent: initialAgent, onSave, onDelete, checkCooldown, t = (k) => k }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [mode, setMode] = useState<'EDIT' | 'CHAT'>(initialAgent ? 'CHAT' : 'EDIT');
    const [formData, setFormData] = useState<Partial<Agent>>(initialAgent || {
        name: '',
        persona: '',
        systemInstruction: '',
        knowledgeBase: '',
        avatar: '🤖',
        creatorId: 'user',
        model: 'GEMINI_FLASH'
    });

    // KB Simulation
    const [kbFile, setKbFile] = useState<string | null>(null);

    // Avatar Gen State
    const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);

    // Chat State
    const [messages, setMessages] = useState<{ role: string, content: string, timestamp: string }[]>([
        {
            role: 'model',
            content: initialAgent ? `Neural Link Established with ${initialAgent.name}. System Online.` : "Configure agent parameters to initialize Neural Link.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (initialAgent) {
            setFormData(initialAgent);
            setMode('CHAT');
            setMessages([{
                role: 'model',
                content: `Neural Link Established with ${initialAgent.name}. System Online.`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        }
    }, [initialAgent?.id]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSave = () => {
        if (!formData.name) {
            showToast("Agent Name is required.", 'error');
            audio.playError();
            return;
        }
        const agentToSave = {
            ...formData,
            systemInstruction: formData.systemInstruction || `You are ${formData.name}, a helpful AI assistant.`,
            id: formData.id || `a${Date.now()}`,
            creatorId: 'user',
            model: formData.model || 'GEMINI_FLASH'
        } as Agent;

        onSave(agentToSave);
        setMode('CHAT');
        setMessages(prev => [...prev, {
            role: 'model',
            content: `System Update: Agent ${agentToSave.name} configuration saved. Memory banks synced.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        audio.vibrate([50, 30, 50]);
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
                model: formData.model
            } as Agent;

            const apiHistory = messages.map(m => ({ role: m.role, content: m.content }));

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
                content: "Error: Neural link unstable. Check connection.",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
            audio.playError();
        } finally {
            setIsLoading(false);
        }
    };

    const handleShare = () => {
        const payload = btoa(JSON.stringify(formData));
        const url = `${window.location.origin}?agent=${payload}`;
        navigator.clipboard.writeText(url);
        showToast("Agent Neural Key copied to clipboard! Share this URL to let others import your agent.", 'success');
        audio.playSuccess();
    };

    const handleGenerateAvatar = async () => {
        if (!formData.persona && !formData.name) {
            showToast("Please enter a Name or Persona first to generate an avatar.", 'error');
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
            showToast("Avatar generation failed. Try again.", 'error');
            audio.playError();
        } finally {
            setIsGeneratingAvatar(false);
        }
    };

    const handleFileUpload = () => {
        setKbFile("manual_v1.pdf");
        const mockContent = "Yokaizen Manual: Chrono Quest requires managing Context Tokens. Use 'Debug' to heal. 'Zero-Shot' is risky but powerful when Timeline is Stable.";
        setFormData(prev => ({ ...prev, knowledgeBase: (prev.knowledgeBase || "") + "\n\n[IMPORTED DOC]: " + mockContent }));
        audio.playDataLoad();
    };

    const handleTyping = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: keyof Agent) => {
        setFormData({ ...formData, [field]: e.target.value });
        if (Math.random() > 0.7) audio.vibrate(2);
    };

    const isUrl = (str?: string) => str?.startsWith('http');

    const availableModels: { id: AIModel, name: string, desc: string, icon: any, locked: boolean, color: string }[] = [
        { id: 'GEMINI_FLASH', name: 'Flash 2.5', desc: 'High Speed Logic', icon: Zap, locked: false, color: 'text-yellow-400' },
        { id: 'DEEPSEEK_V3', name: 'DeepSeek V3', desc: 'Reasoning Core', icon: Brain, locked: !user?.isPro, color: 'text-cyan-400' },
        { id: 'GEMINI_PRO', name: 'Gemini 3 Pro', desc: 'Creative Engine', icon: Sparkles, locked: user?.subscriptionTier !== 'pro_creator', color: 'text-purple-400' }
    ];

    return (
        <div className="h-full flex flex-col bg-gray-900/90 rounded-xl border border-white/10 overflow-hidden shadow-2xl backdrop-blur-xl">
            {/* Header */}
            <div className="p-3 border-b border-white/10 flex justify-between items-center bg-black/40 flex-shrink-0">
                <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-electric/20 flex items-center justify-center text-2xl border border-electric/50 shrink-0 overflow-hidden">
                        {isUrl(formData.avatar) ? <img src={formData.avatar} className="w-full h-full object-cover" /> : (formData.avatar || '🤖')}
                    </div>
                    <div className="min-w-0 overflow-hidden">
                        <h3 className="font-bold text-white truncate text-sm">{formData.name || 'Uninitialized Unit'}</h3>
                        <p className="text-[10px] text-gray-400 truncate">{formData.persona || 'No Persona Configured'}</p>
                    </div>
                </div>
                <div className="flex space-x-2 shrink-0">
                    <Button size="sm" variant={mode === 'EDIT' ? 'primary' : 'ghost'} onClick={() => { setMode('EDIT'); audio.playClick(); }} className="px-3"><Edit size={14} className="mr-1" /> {t('agent.config')}</Button>
                    <Button size="sm" variant={mode === 'CHAT' ? 'primary' : 'ghost'} onClick={() => { setMode('CHAT'); audio.playClick(); }} className="px-3"><MessageSquare size={14} className="mr-1" /> {t('agent.test')}</Button>
                    {formData.id && (
                        <Button size="sm" variant="secondary" onClick={handleShare} className="bg-green-600/20 text-green-400 border-green-500/50 hover:bg-green-600/30">
                            <Share2 size={14} />
                        </Button>
                    )}
                </div>
            </div>

            {mode === 'EDIT' && (
                <div className="p-4 space-y-5 overflow-y-auto flex-1 min-h-0 bg-gray-900/50 scrollbar-hide">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">{t('agent.name')}</label>
                                <input
                                    className="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-white focus:border-electric focus:outline-none text-sm transition-all"
                                    placeholder="e.g. Cyber Sage"
                                    value={formData.name}
                                    onChange={e => handleTyping(e, 'name')}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">{t('agent.persona')}</label>
                                <input
                                    className="w-full bg-black border border-gray-700 rounded-lg p-2.5 text-white focus:border-electric focus:outline-none text-sm transition-all"
                                    placeholder="e.g. A sarcastic robot from 3024."
                                    value={formData.persona}
                                    onChange={e => handleTyping(e, 'persona')}
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
                                    title="Generate with Nano Banana"
                                >
                                    <Sparkles size={14} />
                                </button>
                            </div>
                            <input
                                className="w-24 bg-transparent border-b border-gray-700 text-center text-xs text-gray-400 focus:border-electric focus:text-white focus:outline-none"
                                placeholder="Emoji/URL"
                                value={formData.avatar}
                                onChange={e => handleTyping(e, 'avatar')}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 flex items-center"><Cpu size={12} className="mr-1" /> {t('agent.model')}</label>
                        <div className="grid grid-cols-3 gap-2">
                            {availableModels.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => !m.locked && setFormData({ ...formData, model: m.id })}
                                    className={`relative p-3 rounded-xl border-2 text-left transition-all group overflow-hidden ${formData.model === m.id
                                        ? 'bg-gray-800 border-white/50 shadow-lg'
                                        : 'bg-black border-gray-800 opacity-80 hover:opacity-100 hover:border-gray-600'
                                        }`}
                                >
                                    <div className={`mb-2 ${m.color}`}>
                                        <m.icon size={20} />
                                    </div>
                                    <div className="text-xs font-bold text-white mb-0.5">{m.name}</div>
                                    <div className="text-[9px] text-gray-500">{m.desc}</div>

                                    {m.locked && (
                                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center backdrop-blur-[1px]">
                                            <Lock size={16} className="text-gray-500" />
                                        </div>
                                    )}

                                    {formData.model === m.id && (
                                        <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${m.color.replace('text-', 'bg-')} shadow-[0_0_8px_currentColor]`}></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">{t('agent.instructions')}</label>
                        <textarea
                            className="w-full h-40 bg-black border border-gray-700 rounded-lg p-3 text-white font-mono text-xs focus:border-electric focus:outline-none resize-none leading-relaxed"
                            placeholder="Define the agent's behavior, rules, and tone here. Be specific."
                            value={formData.systemInstruction}
                            onChange={e => handleTyping(e, 'systemInstruction')}
                        />
                    </div>

                    <div className="bg-gray-800/30 rounded-xl border border-dashed border-gray-700 p-4">
                        <div className="flex justify-between items-center mb-3">
                            <label className="text-[10px] font-bold text-amber-500 uppercase flex items-center"><Database size={10} className="mr-1" /> {t('agent.knowledge')}</label>
                            {kbFile && <span className="text-[10px] text-green-400 flex items-center"><CheckCircle2 size={10} className="mr-1" /> Linked</span>}
                        </div>

                        <Button size="sm" fullWidth variant="secondary" className="text-xs mb-3 h-8 bg-gray-800 border-gray-600 hover:bg-gray-700" onClick={handleFileUpload}>
                            <Upload size={12} className="mr-2" /> {t('agent.upload')}
                        </Button>

                        <textarea
                            className="w-full min-h-[80px] bg-black border border-gray-700 rounded-lg p-3 text-amber-100 font-mono text-[10px] focus:border-amber-500 focus:outline-none resize-none placeholder-gray-600 leading-relaxed"
                            placeholder="Or paste raw text content here for the agent to reference..."
                            value={formData.knowledgeBase}
                            onChange={e => handleTyping(e, 'knowledgeBase')}
                        />
                    </div>

                    <div className="pt-2 flex space-x-3">
                        {onDelete && formData.id && (
                            <Button variant="danger" onClick={() => { onDelete(formData.id!); audio.playClick(); }} className="px-3">
                                <Trash2 size={16} />
                            </Button>
                        )}
                        <Button fullWidth onClick={handleSave} variant="primary" className="shadow-[0_0_20px_rgba(196,95,255,0.3)]">
                            <Save className="mr-2" size={16} /> {t('agent.save')}
                        </Button>
                    </div>
                </div>
            )}

            {mode === 'CHAT' && (
                <div className="flex-1 flex flex-col min-h-0 relative bg-[#050509]">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                        <Bot size={200} />
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide z-10">
                        {messages.map((m, i) => {
                            const isUser = m.role === 'user';
                            return (
                                <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                                    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%]`}>
                                        <div className={`p-3.5 rounded-2xl text-sm shadow-md leading-relaxed ${isUser
                                            ? 'bg-electric text-white rounded-br-sm'
                                            : 'bg-gray-800 text-gray-100 rounded-bl-sm border border-gray-700'
                                            }`}>
                                            {m.content}
                                        </div>
                                        <div className="text-[9px] text-gray-500 mt-1 px-1 flex items-center">
                                            {m.timestamp}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm border border-gray-700 flex items-center space-x-1.5">
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75" />
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150" />
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <div className="p-3 bg-gray-900 border-t border-white/10 flex space-x-2 shrink-0 z-20">
                        <input
                            className="flex-1 bg-black border border-gray-700 rounded-full px-5 py-3 text-white focus:border-electric focus:outline-none text-sm placeholder-gray-600 transition-colors"
                            placeholder={formData.name ? `Message ${formData.name}...` : "Message..."}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleChat()}
                        />
                        <Button variant="primary" onClick={handleChat} disabled={isLoading} className="rounded-full w-12 h-12 p-0 flex items-center justify-center shadow-[0_0_15px_rgba(196,95,255,0.4)] hover:scale-105 transition-transform">
                            <Send size={18} className={isLoading ? 'opacity-0' : 'ml-0.5'} />
                            {isLoading && <RefreshCw size={18} className="absolute animate-spin" />}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
