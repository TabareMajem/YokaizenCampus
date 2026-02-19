import React, { useState } from 'react';
import { Brain, Target, Shield, Palette, Zap, ChevronRight, Sparkles, Trophy } from 'lucide-react';
import { audio } from '../../services/audioService';

interface OnboardingWizardProps {
    onComplete: (selectedSkills: string[]) => void;
    t: (key: string) => string;
}

const SKILLS = [
    { id: 'PROMPTING', name: 'Prompt Engineering', icon: Brain, color: 'from-cyan-500 to-blue-600', desc: 'Master AI communication' },
    { id: 'SAFETY', name: 'AI Safety', icon: Shield, color: 'from-red-500 to-orange-600', desc: 'Break and defend AI systems' },
    { id: 'ETHICS', name: 'AI Ethics', icon: Target, color: 'from-purple-500 to-pink-600', desc: 'Bias detection & alignment' },
    { id: 'CREATIVITY', name: 'AI Creativity', icon: Palette, color: 'from-green-500 to-teal-600', desc: 'Generate amazing content' },
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, t }) => {
    const [step, setStep] = useState(1);
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [isAnimating, setIsAnimating] = useState(false);

    const handleSkillToggle = (skillId: string) => {
        audio.playClick();
        if (selectedSkills.includes(skillId)) {
            setSelectedSkills(prev => prev.filter(s => s !== skillId));
        } else if (selectedSkills.length < 2) {
            setSelectedSkills(prev => [...prev, skillId]);
        }
    };

    const handleContinue = () => {
        if (step === 1 && selectedSkills.length >= 1) {
            audio.playSuccess();
            setIsAnimating(true);
            setTimeout(() => {
                setStep(2);
                setIsAnimating(false);
            }, 300);
        } else if (step === 2) {
            audio.playSuccess();
            onComplete(selectedSkills);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
            <div className={`max-w-2xl w-full transition-all duration-300 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>

                {/* Progress Bar */}
                <div className="flex items-center justify-center mb-8 gap-2">
                    <div className={`h-1 w-16 rounded-full transition-colors ${step >= 1 ? 'bg-electric' : 'bg-white/20'}`} />
                    <div className={`h-1 w-16 rounded-full transition-colors ${step >= 2 ? 'bg-electric' : 'bg-white/20'}`} />
                </div>

                {step === 1 && (
                    <div className="text-center">
                        {/* Header */}
                        <div className="mb-8">
                            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">
                                What do you want to master?
                            </h2>
                            <p className="text-gray-400 text-lg">
                                Pick 1-2 skills to personalize your experience
                            </p>
                        </div>

                        {/* Skill Cards */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            {SKILLS.map(skill => {
                                const Icon = skill.icon;
                                const isSelected = selectedSkills.includes(skill.id);
                                return (
                                    <button
                                        key={skill.id}
                                        onClick={() => handleSkillToggle(skill.id)}
                                        onMouseEnter={() => audio.playHover()}
                                        className={`relative p-6 rounded-2xl border-2 transition-all duration-200 text-left group overflow-hidden ${isSelected
                                                ? 'border-electric bg-electric/10 scale-[1.02]'
                                                : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                                            }`}
                                    >
                                        {/* Gradient Background */}
                                        <div className={`absolute inset-0 bg-gradient-to-br ${skill.color} opacity-0 group-hover:opacity-10 transition-opacity`} />

                                        {/* Content */}
                                        <div className="relative z-10">
                                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${skill.color} flex items-center justify-center mb-4`}>
                                                <Icon size={24} className="text-white" />
                                            </div>
                                            <h3 className="text-lg font-bold text-white mb-1">{skill.name}</h3>
                                            <p className="text-sm text-gray-400">{skill.desc}</p>
                                        </div>

                                        {/* Checkbox */}
                                        {isSelected && (
                                            <div className="absolute top-4 right-4 w-6 h-6 bg-electric rounded-full flex items-center justify-center">
                                                <Zap size={14} className="text-black" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Continue Button */}
                        <button
                            onClick={handleContinue}
                            disabled={selectedSkills.length === 0}
                            className={`px-8 py-4 font-bold text-lg rounded-xl transition-all flex items-center justify-center mx-auto gap-2 ${selectedSkills.length > 0
                                    ? 'bg-electric text-black hover:bg-white'
                                    : 'bg-white/10 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            Continue <ChevronRight size={20} />
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="text-center">
                        {/* Success Animation */}
                        <div className="mb-8">
                            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-electric to-cyan-400 rounded-full flex items-center justify-center mb-6 animate-pulse shadow-[0_0_60px_rgba(0,255,255,0.4)]">
                                <Sparkles size={48} className="text-black" />
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">
                                You're all set!
                            </h2>
                            <p className="text-gray-400 text-lg mb-4">
                                Your personalized training path is ready
                            </p>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex items-center justify-center gap-8 mb-8 text-center">
                            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                <Trophy size={24} className="text-yellow-400 mx-auto mb-2" />
                                <div className="text-2xl font-bold text-white">47</div>
                                <div className="text-xs text-gray-400">Games</div>
                            </div>
                            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                <Brain size={24} className="text-electric mx-auto mb-2" />
                                <div className="text-2xl font-bold text-white">5</div>
                                <div className="text-xs text-gray-400">Skill Trees</div>
                            </div>
                            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                <Zap size={24} className="text-green-400 mx-auto mb-2" />
                                <div className="text-2xl font-bold text-white">∞</div>
                                <div className="text-xs text-gray-400">XP to Earn</div>
                            </div>
                        </div>

                        {/* Start Playing */}
                        <button
                            onClick={handleContinue}
                            className="px-10 py-5 bg-electric text-black font-black text-xl rounded-xl hover:bg-white transition-all flex items-center justify-center mx-auto gap-2 shadow-[0_0_30px_rgba(0,255,255,0.3)]"
                        >
                            Start Playing <ChevronRight size={24} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
