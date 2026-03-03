import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Bot, Sparkles, ChevronRight, Share, Zap, X, ShieldAlert, Cpu, Info } from 'lucide-react';
import { Button } from '../ui/Button';
import { audio } from '../../services/audioService';
import { streamAIResponse } from '../../services/geminiService';

interface OpenClawTerminalProps {
    onClose?: () => void;
    t: (key: string, replace?: any) => string;
}

interface LogEntry {
    id: string;
    type: 'USER' | 'SYSTEM' | 'AGENT' | 'ACTION' | 'ERROR';
    content: string;
    timestamp: Date;
}

export const OpenClawTerminal: React.FC<OpenClawTerminalProps> = ({ onClose, t }) => {
    const [logs, setLogs] = useState<LogEntry[]>([
        { id: 'boot', type: 'SYSTEM', content: 'OpenClaw Autonomous Kernel v5.0.0 Online', timestamp: new Date() },
        { id: 'auth', type: 'SYSTEM', content: 'Establishing neural handshake with host...', timestamp: new Date() },
        { id: 'ready', type: 'AGENT', content: 'Link established. Awaiting autonomous objective parameters.', timestamp: new Date() }
    ]);
    const [input, setInput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [streamingType, setStreamingType] = useState<LogEntry['type']>('SYSTEM');
    const [showInfo, setShowInfo] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs, streamingContent]);

    const addLog = (type: LogEntry['type'], content: string) => {
        setLogs(prev => [...prev, { id: Date.now().toString() + Math.random(), type, content, timestamp: new Date() }]);
    };

    const streamLine = async (type: LogEntry['type'], fullText: string, speed: 'fast' | 'normal' | 'slow' = 'fast') => {
        setStreamingType(type);
        setStreamingContent('');
        audio.playTyping();
        await streamAIResponse(fullText, (chunk) => setStreamingContent(chunk), speed);
        setStreamingContent('');
        addLog(type, fullText);
    };

    const handleExecute = async () => {
        if (!input.trim() || isRunning) return;
        const objective = input.trim();
        setInput('');
        addLog('USER', `Objective: ${objective}`);
        setIsRunning(true);

        // Simulated Autonomous Execution Flow (Mega Epic)
        await streamLine('SYSTEM', 'Compiling execution plan...');
        await new Promise(r => setTimeout(r, 500));

        const steps = [
            `Analyzing environment variables for objective: ${objective.substring(0, 20)}...`,
            'Spawning sub-agent threads for parallel data retrieval.',
            'Accessing external APIs via secure proxy tunnel.',
            'Bypassing cognitive load limiters...',
            'Synthesizing data into coherent strategy matrix.',
            'Executing final node actions.'
        ];

        for (let i = 0; i < steps.length; i++) {
            audio.playClick();
            await streamLine('ACTION', steps[i], 'fast');
            addLog('SYSTEM', `[Thread ${Math.floor(Math.random() * 100)}] Status: OK`);
            await new Promise(r => setTimeout(r, 300 + Math.random() * 500));
        }

        audio.playSuccess();
        await streamLine('AGENT', `Objective Complete: "${objective}". Task successfully executed via autonomous recursion.`, 'normal');
        setIsRunning(false);
    };

    return (
        <div className="absolute inset-0 bg-black z-50 flex flex-col font-mono">
            {/* Header */}
            <div className="p-3 border-b border-indigo-500/30 bg-gray-900/50 flex justify-between items-center z-10">
                <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-indigo-500/20 rounded shadow-[0_0_15px_rgba(99,102,241,0.5)] border border-indigo-500/50">
                        <Cpu className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-white font-bold tracking-widest text-sm flex items-center gap-2">
                            <span>OpenClaw</span>
                            <span className="text-indigo-400">AUTONOMOUS_KERNEL</span>
                        </h2>
                        <div className="text-[10px] text-gray-500 mt-0.5">Recursive Execution Interface</div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowInfo(true)} className="text-indigo-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded" title="Execution Strategy">
                        <Info className="w-5 h-5" />
                    </button>
                    {onClose && (
                        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 hover:bg-white/10 rounded">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Terminal Window */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-5">
                {logs.map(log => (
                    <div key={log.id} className="text-sm flex items-start gap-3">
                        <span className="text-gray-600 shrink-0 select-none">[{log.timestamp.toLocaleTimeString()}]</span>
                        <div className="flex-1">
                            {log.type === 'USER' && (
                                <div className="text-white"><span className="text-blue-400 mr-2">host@yokaizen:~$</span>{log.content}</div>
                            )}
                            {log.type === 'SYSTEM' && (
                                <div className="text-gray-400">{log.content}</div>
                            )}
                            {log.type === 'ACTION' && (
                                <div className="text-indigo-400 ml-4 border-l border-indigo-500/30 pl-3 py-0.5">
                                    <span className="animate-pulse mr-2">↳</span>{log.content}
                                </div>
                            )}
                            {log.type === 'AGENT' && (
                                <div className="text-green-400 font-bold bg-green-900/20 border border-green-500/30 p-2 rounded w-fit my-1">
                                    {log.content}
                                </div>
                            )}
                            {log.type === 'ERROR' && (
                                <div className="text-red-500 font-bold bg-red-900/20 border border-red-500/30 p-2 rounded w-fit my-1 flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4" /> {log.content}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* Active Streaming Line */}
                {streamingContent && (
                    <div className="text-sm flex items-start gap-3 animate-in fade-in">
                        <span className="text-gray-600 shrink-0 select-none">[{new Date().toLocaleTimeString()}]</span>
                        <div className="flex-1">
                            {streamingType === 'SYSTEM' && <div className="text-gray-400">{streamingContent}<span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" /></div>}
                            {streamingType === 'ACTION' && (
                                <div className="text-indigo-400 ml-4 border-l border-indigo-500/30 pl-3 py-0.5">
                                    <span className="mr-2">↳</span>{streamingContent}<span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse ml-1" />
                                </div>
                            )}
                            {streamingType === 'AGENT' && (
                                <div className="text-green-400 font-bold bg-green-900/20 border border-green-500/30 p-2 rounded w-fit my-1">
                                    {streamingContent}<span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-1" />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {isRunning && !streamingContent && (
                    <div className="text-indigo-400 text-sm py-2 ml-4 flex items-center gap-2">
                        <div className="w-2 h-4 bg-indigo-500 animate-pulse"></div>
                        <span>Processing autonomous loop...</span>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-indigo-500/30 bg-black relative">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <div className="absolute left-3 top-3 text-indigo-500 font-bold"><ChevronRight className="w-5 h-5" /></div>
                        <input
                            type="text"
                            className="w-full bg-gray-900/80 border border-indigo-900 focus:border-indigo-500 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none transition-colors shadow-inner font-mono text-sm placeholder-gray-700"
                            placeholder="State autonomous objective (e.g., 'Analyze competitor pricing models')"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleExecute();
                            }}
                            disabled={isRunning}
                            autoFocus
                        />
                    </div>
                    <Button
                        variant="primary"
                        onClick={handleExecute}
                        disabled={isRunning || !input.trim()}
                        className={`shrink-0 ${!isRunning && input.trim() ? 'bg-indigo-600 hover:bg-indigo-500 border-indigo-400' : 'bg-gray-800'}`}
                    >
                        {isRunning ? <Sparkles className="w-4 h-4 animate-spin text-gray-400" /> : 'DEPLOY'}
                    </Button>
                </div>
                <div className="text-[10px] text-gray-600 mt-2 text-center uppercase tracking-widest">
                    Caution: OpenClaw will execute recursively until objective constraints are met.
                </div>
            </div>

            {/* Strategy Modal */}
            {showInfo && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-gray-900 border border-indigo-500/50 rounded-xl max-w-lg w-full p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Cpu className="text-indigo-400" /> OpenClaw Execution Strategy</h3>
                            <button onClick={() => setShowInfo(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-4 text-sm text-gray-300">
                            <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                                <h4 className="text-indigo-400 font-bold mb-1">1. Backend Autonomy (Mobile-first)</h4>
                                <p>Once deployed, objectives execute autonomously on Yokaizen's secure cloud instances. It does NOT rely on your local connection, perfect for mobile execution.</p>
                            </div>
                            <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                                <h4 className="text-indigo-400 font-bold mb-1">2. DeepSeek & Gemini Protocols</h4>
                                <p>OpenClaw utilizes deep-reasoning APIs backed by DeepSeek & Gemini, drastically reducing token costs while maintaining frontier-level logic.</p>
                            </div>
                            <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                                <h4 className="text-indigo-400 font-bold mb-1">3. Mobile Push Notifications</h4>
                                <p>If OpenClaw requires authorization (e.g., buying a domain, paying an invoice), it pauses execution and sends a Push Notification to your phone for approval.</p>
                            </div>
                            <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                                <h4 className="text-indigo-400 font-bold mb-1">4. Human-In-The-Loop</h4>
                                <p>The terminal acts purely as a 'remote control'. You issue the command, and the agent orchestrates the sub-threads until the goal is synthesized.</p>
                            </div>
                        </div>
                        <button onClick={() => setShowInfo(false)} className="w-full mt-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors shadow-[0_0_20px_rgba(79,70,229,0.3)]">ACKNOWLEDGE</button>
                    </div>
                </div>
            )}
        </div>
    );
};
