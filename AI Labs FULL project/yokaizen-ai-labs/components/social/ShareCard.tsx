import React, { useRef, useState } from 'react';
import { Share2, Twitter, MessageCircle, Copy, Check, X } from 'lucide-react';

interface ShareCardProps {
    gameName: string;
    score: number;
    maxScore?: number;
    xpEarned: number;
    onClose: () => void;
}

export const ShareCard: React.FC<ShareCardProps> = ({ gameName, score, maxScore, xpEarned, onClose }) => {
    const [copied, setCopied] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    const shareText = `🎮 I scored ${score}${maxScore ? `/${maxScore}` : ''} on ${gameName} in Yokaizen AI Labs! Can you beat me? 🧠⚡`;
    const shareUrl = 'https://ai.yokaizencampus.com';

    const handleCopyLink = async () => {
        await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleTwitterShare = () => {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(twitterUrl, '_blank', 'width=600,height=400');
    };

    const handleWhatsAppShare = () => {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-[200] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <Share2 size={20} className="text-electric" />
                        <span className="font-bold text-white">Share Your Score</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X size={18} className="text-gray-400" />
                    </button>
                </div>

                {/* Score Card Preview */}
                <div ref={cardRef} className="p-6 bg-gradient-to-br from-electric/20 to-purple-600/20 border-y border-white/10">
                    <div className="text-center">
                        <div className="text-xs font-mono text-electric uppercase tracking-widest mb-2">Yokaizen AI Labs</div>
                        <h3 className="text-2xl font-black text-white mb-4">{gameName}</h3>
                        <div className="text-6xl font-black text-white mb-2">
                            {score}
                            {maxScore && <span className="text-2xl text-gray-400">/{maxScore}</span>}
                        </div>
                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-electric/20 rounded-full">
                            <span className="text-electric font-bold text-sm">+{xpEarned} XP</span>
                        </div>
                    </div>
                </div>

                {/* Share Buttons */}
                <div className="p-4 space-y-3">
                    <button
                        onClick={handleTwitterShare}
                        className="w-full flex items-center justify-center gap-3 py-3 bg-[#1DA1F2] text-white font-bold rounded-xl hover:bg-[#1a8cd8] transition-colors"
                    >
                        <Twitter size={20} />
                        Share on X (Twitter)
                    </button>

                    <button
                        onClick={handleWhatsAppShare}
                        className="w-full flex items-center justify-center gap-3 py-3 bg-[#25D366] text-white font-bold rounded-xl hover:bg-[#22c55e] transition-colors"
                    >
                        <MessageCircle size={20} />
                        Share on WhatsApp
                    </button>

                    <button
                        onClick={handleCopyLink}
                        className="w-full flex items-center justify-center gap-3 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors border border-white/20"
                    >
                        {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
                        {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                </div>

                {/* Challenge CTA */}
                <div className="p-4 pt-0">
                    <div className="text-center text-xs text-gray-500">
                        Challenge your friends to beat your score! 🔥
                    </div>
                </div>
            </div>
        </div>
    );
};
