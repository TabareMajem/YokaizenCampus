
import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Zap, Crown, Lock, CheckCircle2, Bot, Sparkles, CreditCard, ChevronRight, Loader2 } from 'lucide-react';
import { stripeService } from '../../services/stripeService';
import { useToast } from '../../contexts/ToastContext';

interface PaywallModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubscribe: () => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ isOpen, onClose, onSubscribe }) => {
    const [isProcessing, setIsProcessing] = useState<'OPERATIVE' | 'PRO_CREATOR' | null>(null);
    const { showToast } = useToast();

    const handlePayment = async (tier: 'OPERATIVE' | 'PRO_CREATOR') => {
        setIsProcessing(tier);
        const plans = stripeService.getPlans();
        const priceId = plans[tier].id;

        try {
            const redirectUrl = await stripeService.createCheckoutSession(priceId);
            window.location.href = redirectUrl;
        } catch (e: any) {
            console.error("Payment init failed:", e);
            showToast(e.message || "Payment initialization failed. Please try again.", 'error');
            setIsProcessing(null);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} type="DEFAULT">
            <div className="text-center">
                <h2 className="text-2xl font-black text-white uppercase italic tracking-wide mb-2">
                    Access <span className="text-electric">Restricted</span>
                </h2>
                <p className="text-gray-400 text-xs mb-6">
                    Choose your clearance level to unlock neural capabilities.
                </p>

                <div className="grid grid-cols-1 gap-4 mb-6">
                    {/* Tier 1: Operative */}
                    <div className="bg-gray-900/50 border border-white/10 rounded-xl p-4 hover:border-cyan/50 transition-colors text-left relative overflow-hidden group">
                        <div className="absolute top-0 right-0 bg-cyan/20 text-cyan text-[9px] font-bold px-2 py-1 rounded-bl-lg">POPULAR</div>
                        <h3 className="text-lg font-bold text-white mb-1">Operative</h3>
                        <div className="text-2xl font-mono font-bold text-cyan mb-3">$4.99<span className="text-xs text-gray-500">/mo</span></div>
                        <div className="space-y-2 mb-4">
                            <div className="flex items-center text-xs text-gray-300"><Zap size={12} className="text-cyan mr-2" /> Infinite Energy (No Limits)</div>
                            <div className="flex items-center text-xs text-gray-300"><Bot size={12} className="text-cyan mr-2" /> DeepSeek V3 Integration</div>
                            <div className="flex items-center text-xs text-gray-300"><Sparkles size={12} className="text-cyan mr-2" /> Elite Difficulty Unlocked</div>
                        </div>
                        <Button fullWidth size="sm" variant="secondary" onClick={() => handlePayment('OPERATIVE')} disabled={!!isProcessing} className="border-cyan text-cyan hover:bg-cyan/10">
                            {isProcessing === 'OPERATIVE' ? <Loader2 size={16} className="animate-spin" /> : 'Initialize Level 1'}
                        </Button>
                    </div>

                    {/* Tier 2: Pro Creator */}
                    <div className="bg-gradient-to-br from-purple-900/20 to-black border border-electric/50 rounded-xl p-4 hover:border-electric transition-colors text-left relative overflow-hidden">
                        <div className="absolute inset-0 bg-electric/5 animate-pulse pointer-events-none"></div>
                        <h3 className="text-lg font-bold text-white mb-1 flex items-center"><Crown size={16} className="text-amber-400 mr-2" /> Pro Creator</h3>
                        <div className="text-2xl font-mono font-bold text-electric mb-3">$9.99<span className="text-xs text-gray-500">/mo</span></div>
                        <div className="space-y-2 mb-4">
                            <div className="flex items-center text-xs text-gray-300"><CheckCircle2 size={12} className="text-electric mr-2" /> Everything in Operative</div>
                            <div className="flex items-center text-xs text-white font-bold"><Bot size={12} className="text-electric mr-2" /> Gemini 3 Pro (Advanced Reasoning)</div>
                            <div className="flex items-center text-xs text-white font-bold"><Lock size={12} className="text-electric mr-2" /> Game Creator Tools</div>
                        </div>
                        <Button fullWidth size="sm" variant="primary" onClick={() => handlePayment('PRO_CREATOR')} disabled={!!isProcessing} className="shadow-[0_0_20px_rgba(196,95,255,0.3)] flex items-center justify-center">
                            {isProcessing === 'PRO_CREATOR' ? <Loader2 size={16} className="animate-spin" /> : <><CreditCard size={14} className="mr-2" /> Checkout via Stripe</>}
                        </Button>
                    </div>
                </div>

                <button onClick={onClose} className="text-xs text-gray-500 underline hover:text-white">
                    Continue as Free User
                </button>
            </div>
        </Modal>
    );
};
