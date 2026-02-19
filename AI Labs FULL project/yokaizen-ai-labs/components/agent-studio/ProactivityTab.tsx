import React, { useState, useEffect } from 'react';
import { Agent, AgentSchedule } from '../../types';
import { createAgentSchedule, deleteAgentSchedule, getAgentSchedules } from '../../services/agentService';
import { Clock, Zap, Trash2, Plus, Info } from 'lucide-react';
import { Button } from '../ui/Button';

interface ProactivityTabProps {
    formData: Partial<Agent>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Agent>>>;
    t: (key: string) => string;
}

export const ProactivityTab: React.FC<ProactivityTabProps> = ({ formData, setFormData, t }) => {
    const [schedules, setSchedules] = useState<AgentSchedule[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // New Schedule Form
    const [newCron, setNewCron] = useState('0 9 * * *');
    const [newDesc, setNewDesc] = useState('');

    useEffect(() => {
        if (formData.id) {
            fetchSchedules();
        }
    }, [formData.id]);

    const fetchSchedules = async () => {
        if (!formData.id) return;
        setIsLoading(true);
        const data = await getAgentSchedules(formData.id);
        setSchedules(data);
        setIsLoading(false);
    };

    const handleAddSchedule = async () => {
        if (!formData.id || !newCron || !newDesc) return;
        setIsCreating(true);
        await createAgentSchedule(formData.id, {
            cronExpression: newCron,
            description: newDesc
        });
        setNewCron('0 9 * * *');
        setNewDesc('');
        setIsCreating(false);
        fetchSchedules();
    };

    const handleDeleteSchedule = async (id: string) => {
        if (!formData.id) return;
        // Optimistic update
        setSchedules(prev => prev.filter(s => s.id !== id));
        await deleteAgentSchedule(formData.id, id);
        // fetchSchedules(); // Not strictly needed if optimistic worked
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-amber-900/20 p-4 rounded-xl border border-amber-500/30 flex items-start space-x-3">
                <Zap className="text-amber-400 shrink-0 mt-0.5" size={18} />
                <div>
                    <h4 className="text-sm font-bold text-amber-300">Autonomous Mode</h4>
                    <p className="text-xs text-amber-200/70 mt-1">Agents can wake up and perform tasks without your input. Use with caution as this consumes tokens.</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white">Scheduled Triggers (Cron)</h3>
                </div>

                {/* Create Form */}
                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div className="col-span-1">
                            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Frequency (Cron)</label>
                            <input
                                className="w-full bg-black border border-gray-700 rounded px-2 py-1.5 text-xs text-white font-mono focus:border-electric outline-none"
                                placeholder="0 9 * * *"
                                value={newCron}
                                onChange={e => setNewCron(e.target.value)}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] text-gray-500 uppercase mb-1 block">Description</label>
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 bg-black border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-electric outline-none"
                                    placeholder="e.g. Daily Market Summary"
                                    value={newDesc}
                                    onChange={e => setNewDesc(e.target.value)}
                                />
                                <Button
                                    size="sm"
                                    variant="primary"
                                    disabled={!formData.id || isCreating}
                                    onClick={handleAddSchedule}
                                    className="shrink-0"
                                >
                                    {isCreating ? 'Adding...' : <><Plus size={14} className="mr-1" /> Add</>}
                                </Button>
                            </div>
                        </div>
                    </div>
                    {!formData.id && <p className="text-[10px] text-red-400 mt-1">* Save agent first to add schedules</p>}
                </div>

                {/* List */}
                <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                    {isLoading && <div className="text-center py-4 text-xs text-gray-500">Loading schedules...</div>}

                    {!isLoading && schedules.length === 0 && (
                        <div className="text-center py-8 border-2 border-dashed border-gray-800 rounded-xl">
                            <Clock className="mx-auto text-gray-600 mb-2" size={24} />
                            <p className="text-gray-500 text-xs">No active schedules.</p>
                        </div>
                    )}

                    {schedules.map(schedule => (
                        <div key={schedule.id} className="bg-gray-900 border border-gray-700 rounded-lg p-3 flex items-center justify-between group">
                            <div className="flex items-center space-x-3">
                                <div className="bg-gray-800 p-2 rounded text-gray-400">
                                    <Clock size={16} />
                                </div>
                                <div>
                                    <div className="text-xs font-mono text-electric bg-electric/10 px-1.5 rounded inline-block mb-1">{schedule.cronExpression}</div>
                                    <div className="text-sm font-bold text-white">{schedule.description}</div>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDeleteSchedule(schedule.id)}
                            >
                                <Trash2 size={14} />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="pt-4 border-t border-gray-800">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Event Triggers</label>
                    <span className="text-[10px] bg-electric/20 text-electric px-2 py-0.5 rounded-full border border-electric/30">Coming Soon</span>
                </div>
                <div className="bg-black/50 border border-gray-800 rounded-lg p-3 flex items-center justify-between opacity-50 cursor-not-allowed">
                    <span className="text-sm text-gray-400">React to new emails</span>
                    <Info size={14} className="text-gray-600" />
                </div>
            </div>
        </div>
    );
};
