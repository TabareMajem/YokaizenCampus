import React from 'react';
import { Gamepad2, Brain, Shield, Trophy, Sparkles } from 'lucide-react';

interface ValuePropositionProps {
    t: (key: string) => string;
}

export const ValueProposition: React.FC<ValuePropositionProps> = ({ t }) => {
    const features = [
        { icon: Gamepad2, title: '47 AI Games', desc: 'Learn through play, not lectures' },
        { icon: Brain, title: '5 Skill Trees', desc: 'Prompting, Safety, Ethics & more' },
        { icon: Shield, title: 'Real AI Battles', desc: 'Red-team and defend AI systems' },
        { icon: Trophy, title: 'Earn Badges', desc: 'Show off your AI expertise' },
    ];

    return (
        <div className="w-full max-w-4xl mx-auto mt-8 px-4">
            {/* Main Value Prop */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-electric/10 border border-electric/30 rounded-full mb-4">
                    <Sparkles size={16} className="text-electric" />
                    <span className="text-electric text-sm font-bold">FREE TO PLAY</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                    Master AI Through Mini-Games
                </h2>
                <p className="text-gray-400 text-base md:text-lg max-w-md mx-auto">
                    The world's first gamified AI literacy platform.
                    No boring courses — just addictive games that teach real skills.
                </p>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {features.map((feature, i) => {
                    const Icon = feature.icon;
                    return (
                        <div
                            key={i}
                            className="group p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all cursor-default"
                        >
                            <div className="w-10 h-10 bg-electric/20 rounded-lg flex items-center justify-center mb-3 group-hover:bg-electric/30 transition-colors">
                                <Icon size={20} className="text-electric" />
                            </div>
                            <h3 className="text-white font-bold text-sm mb-1">{feature.title}</h3>
                            <p className="text-gray-500 text-xs">{feature.desc}</p>
                        </div>
                    );
                })}
            </div>

            {/* Social Proof Placeholder */}
            <div className="mt-8 text-center">
                <p className="text-gray-500 text-xs font-mono uppercase tracking-wider">
                    Trusted by 1,000+ AI learners worldwide
                </p>
            </div>
        </div>
    );
};
