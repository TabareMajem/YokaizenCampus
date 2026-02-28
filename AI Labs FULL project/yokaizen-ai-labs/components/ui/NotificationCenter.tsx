import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Trash2, ShieldAlert, Zap, Cpu, Award } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';

export interface AppNotification {
    id: string;
    type: 'SYSTEM' | 'AGENT' | 'REWARD' | 'ALERT';
    title: string;
    message: string;
    timestamp: Date;
    isRead: boolean;
}

interface NotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
    notifications: AppNotification[];
    onMarkAllRead: () => void;
    onClearAll: () => void;
    t: (key: string, replace?: any) => string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
    isOpen, onClose, notifications, onMarkAllRead, onClearAll, t
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Notification Center" icon={<Bell size={24} className="text-electric" />}>
            <div className="flex justify-between items-center mb-6">
                <span className="text-sm text-gray-400 font-bold uppercase tracking-widest">{notifications.length} Unread</span>
                <div className="flex gap-2">
                    <button onClick={onMarkAllRead} className="text-xs text-gray-400 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-md flex items-center gap-2">
                        <Check size={14} /> Mark Read
                    </button>
                    <button onClick={onClearAll} className="text-xs text-red-500 hover:text-red-400 transition-colors bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-md flex items-center gap-2">
                        <Trash2 size={14} /> Clear
                    </button>
                </div>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                <AnimatePresence>
                    {notifications.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 text-gray-500">
                            <Bell size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="font-bold">You're all caught up!</p>
                            <p className="text-xs mt-1">No new autonomous agent actions or rewards.</p>
                        </motion.div>
                    ) : (
                        notifications.map((notif, index) => (
                            <motion.div
                                key={notif.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ delay: index * 0.05 }}
                                className={`p-4 rounded-xl border transition-all ${notif.isRead ? 'bg-black/40 border-white/5 opacity-70' : 'bg-white/5 border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]'}`}
                            >
                                <div className="flex gap-4">
                                    <div className={`mt-1 rounded-full p-2 h-fit ${notif.type === 'SYSTEM' ? 'bg-blue-500/20 text-blue-400' :
                                            notif.type === 'AGENT' ? 'bg-indigo-500/20 text-indigo-400' :
                                                notif.type === 'REWARD' ? 'bg-amber-500/20 text-amber-400' :
                                                    'bg-red-500/20 text-red-400'
                                        }`}>
                                        {notif.type === 'SYSTEM' && <Cpu size={18} />}
                                        {notif.type === 'AGENT' && <Zap size={18} />}
                                        {notif.type === 'REWARD' && <Award size={18} />}
                                        {notif.type === 'ALERT' && <ShieldAlert size={18} />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className={`text-sm font-bold ${notif.isRead ? 'text-gray-300' : 'text-white'}`}>{notif.title}</h4>
                                            <span className="text-[10px] text-gray-500 whitespace-nowrap ml-2">
                                                {notif.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 leading-relaxed">{notif.message}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </Modal>
    );
};
