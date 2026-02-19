import React, { useEffect, useState, useRef } from 'react';
import { Agent, AgentTask } from '../../types';
import { getAgentTasks } from '../../services/agentService';
import { Activity, Clock, AlertCircle, CheckCircle, Terminal, PlayCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

interface AgentMonitorProps {
    agent: Agent;
    t?: (key: string) => string;
}

export const AgentMonitor: React.FC<AgentMonitorProps> = ({ agent, t = (k) => k }) => {
    const [tasks, setTasks] = useState<AgentTask[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchTasks = async () => {
        setIsLoading(true);
        try {
            const data = await getAgentTasks(agent.id);
            setTasks(data);
        } catch (error) {
            console.error('Failed to load agent tasks', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();

        if (autoRefresh) {
            refreshIntervalRef.current = setInterval(fetchTasks, 3000); // Poll every 3s
        }

        return () => {
            if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
        };
    }, [agent.id, autoRefresh]);

    const toggleAutoRefresh = () => {
        setAutoRefresh(!autoRefresh);
    };

    const getStatusIcon = (status: AgentTask['status']) => {
        switch (status) {
            case 'COMPLETED': return <CheckCircle size={14} className="text-green-400" />;
            case 'FAILED': return <AlertCircle size={14} className="text-red-400" />;
            case 'RUNNING': return <RefreshCw size={14} className="text-blue-400 animate-spin" />;
            default: return <Clock size={14} className="text-gray-400" />;
        }
    };

    const getStatusColor = (status: AgentTask['status']) => {
        switch (status) {
            case 'COMPLETED': return 'text-green-400 border-green-400/30 bg-green-400/10';
            case 'FAILED': return 'text-red-400 border-red-400/30 bg-red-400/10';
            case 'RUNNING': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
            default: return 'text-gray-400 border-gray-400/30 bg-gray-400/10';
        }
    };

    return (
        <div className="h-full flex flex-col space-y-4 animate-in fade-in">
            {/* Header / Stats */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Activity className="text-electric" size={18} />
                    <span className="text-sm font-bold text-gray-300 uppercase tracking-wider">Live Activity Log</span>
                    {isLoading && !autoRefresh && <RefreshCw size={12} className="animate-spin text-gray-500" />}
                </div>
                <div className="flex space-x-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleAutoRefresh}
                        className={`text-xs ${autoRefresh ? 'text-green-400' : 'text-gray-500'}`}
                    >
                        {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={fetchTasks}><RefreshCw size={14} /></Button>
                </div>
            </div>

            {/* Terminal View */}
            <div className="flex-1 bg-black border border-gray-800 rounded-lg p-4 overflow-y-auto font-mono text-xs shadow-inner">
                {tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-600 space-y-2 opacity-50">
                        <Terminal size={32} />
                        <p>No activity recorded yet.</p>
                        <p className="text-[10px]">Trigger tasks or wait for scheduled events.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {tasks.map((task) => (
                            <div key={task.id} className="relative pl-4 border-l border-gray-800 hover:border-gray-700 transition-colors group">
                                <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-black border border-gray-700 flex items-center justify-center group-hover:border-gray-500">
                                    <div className={`w-1 h-1 rounded-full ${task.status === 'RUNNING' ? 'bg-blue-400 animate-pulse' :
                                            task.status === 'COMPLETED' ? 'bg-green-400' :
                                                task.status === 'FAILED' ? 'bg-red-400' : 'bg-gray-600'
                                        }`} />
                                </div>

                                <div className="flex items-start justify-between mb-1">
                                    <div className="flex items-center space-x-2">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold border ${getStatusColor(task.status)}`}>
                                            {task.status}
                                        </span>
                                        <span className="font-bold text-gray-300">{task.name || 'Unnamed Task'}</span>
                                        <span className="text-gray-600 text-[10px] border border-gray-800 rounded px-1">{task.type}</span>
                                    </div>
                                    <span className="text-gray-600 text-[10px]">
                                        {new Date(task.createdAt).toLocaleTimeString()}
                                    </span>
                                </div>

                                {/* Task Details */}
                                <div className="text-gray-400 space-y-1 ml-1">
                                    {task.input && (
                                        <div className="line-clamp-2 opacity-70">
                                            <span className="text-gray-600 select-none">$ </span>
                                            {typeof task.input === 'string' ? task.input : JSON.stringify(task.input)}
                                        </div>
                                    )}

                                    {task.output && (
                                        <div className="text-gray-300 mt-1 pl-2 border-l-2 border-gray-800">
                                            <span className="text-gray-600 text-[10px] uppercase block mb-0.5">Output</span>
                                            {typeof task.output === 'string' ? task.output : JSON.stringify(task.output, null, 2)}
                                        </div>
                                    )}

                                    {task.error && (
                                        <div className="text-red-400 mt-1 pl-2 border-l-2 border-red-900/50 bg-red-900/10 p-1 rounded-r">
                                            <span className="font-bold">Error:</span> {task.error}
                                        </div>
                                    )}

                                    <div className="text-[9px] text-gray-700 mt-1">
                                        Execution time: {task.executionTimeMs}ms
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
