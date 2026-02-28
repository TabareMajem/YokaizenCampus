import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, ChevronDown, Sparkles, ArrowRight, Share2, Users, Coins, Gamepad2, Link } from 'lucide-react';
import { ReferralStats } from '../../types';
import {
    REFERRAL_TIERS,
    getCurrentTier,
    getNextTier,
    getTotalTokensForReferrals,
    generateReferralLink,
    referralService,
} from '../../services/referralService';

const steps = [
    { icon: <Gamepad2 size={24} />, title: 'User joins & plays', desc: 'Sign up and play an AI game on AI Labs' },
    { icon: <Link size={24} />, title: 'Gets unique link', desc: 'Auto-generated referral code tied to your account' },
    { icon: <Share2 size={24} />, title: 'Invites friends', desc: 'Share on Discord, TikTok, IG, WhatsApp — wherever you live' },
    { icon: <Users size={24} />, title: 'Friend plays a game', desc: 'Referral counted only when they complete 1 game session' },
    { icon: <Coins size={24} />, title: 'Tokens drop', desc: 'Earn tokens instantly. Milestone tiers unlock bigger rewards' },
    { icon: <Sparkles size={24} />, title: 'Uses tokens', desc: 'Spend on AI agents, Open Cloud / Glow credits, or climb tiers' },
];

// Stagger animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

interface ViralDashboardProps {
    userReferralCode?: string;
    onNavigateToUseCases?: () => void;
}

export function ViralDashboard({ userReferralCode, onNavigateToUseCases }: ViralDashboardProps) {
    const [activeTier, setActiveTier] = useState<number | null>(null);
    const [sim, setSim] = useState(0);
    const [copied, setCopied] = useState(false);
    const [stats, setStats] = useState<ReferralStats | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        referralService.getStats().then(setStats);

        // Track mouse for dynamic glowing effects
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const currentTier = getCurrentTier(sim);
    const nextTier = getNextTier(sim);
    const totalTokens = getTotalTokensForReferrals(sim);
    const refCode = stats?.referralCode || userReferralCode || 'LOADING';
    const refLink = generateReferralLink(refCode);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(refLink).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#050508',
            color: '#e8e0d0',
            fontFamily: "'Inter', 'Courier New', monospace",
            padding: '60px 24px',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* ── Background Atmospheric Effects ── */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-600/10 blur-[120px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[150px] rounded-full mix-blend-screen" />
                <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-pink-600/5 blur-[100px] rounded-full mix-blend-screen" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
            </div>

            <div className="max-w-[1000px] mx-auto relative z-10">
                {/* ── Header ── */}
                <motion.div
                    initial={{ opacity: 0, y: -30, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    style={{ textAlign: 'center', marginBottom: 64, position: 'relative' }}
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-tr from-orange-500/20 to-purple-500/20 blur-2xl rounded-full -z-10"
                    />
                    <div style={{
                        display: 'inline-block',
                        background: 'linear-gradient(135deg, #fff 0%, #f97316 50%, #a78bfa 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontSize: 56,
                        fontWeight: 900,
                        letterSpacing: '-2.5px',
                        lineHeight: 1.1,
                        textShadow: '0 0 40px rgba(249, 115, 22, 0.2)',
                    }}>
                        YOKAI VIRAL LOOP
                    </div>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        style={{ color: '#888', fontSize: 13, marginTop: 12, letterSpacing: 4, fontWeight: 600 }}
                    >
                        REFERRAL × TOKEN ECONOMY SYSTEM
                    </motion.div>
                </motion.div>

                {/* ── Your Referral Link ── */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', damping: 20 }}
                    style={{
                        background: 'rgba(20, 20, 28, 0.6)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(249, 115, 22, 0.3)',
                        borderRadius: 24,
                        padding: '28px 32px',
                        marginBottom: 56,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 24,
                        flexWrap: 'wrap',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    {/* Dynamic sweeping glow effect inside link box */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/10 to-transparent -translate-x-[200%] animate-[shimmer_3s_infinite]" />

                    <div style={{ flex: 1, minWidth: 240, position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#f97316', letterSpacing: 2, marginBottom: 10, fontWeight: 700 }}>
                            <Sparkles size={14} /> YOUR ELITE REFERRAL LINK
                        </div>
                        <div style={{
                            fontSize: 15,
                            color: '#fff',
                            background: 'rgba(0,0,0,0.5)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 12,
                            padding: '14px 20px',
                            wordBreak: 'break-all',
                            fontFamily: 'monospace',
                            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
                        }}>
                            {refLink}
                        </div>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(249, 115, 22, 0.4)' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCopyLink}
                        style={{
                            background: copied ? '#4ade80' : 'linear-gradient(135deg, #f97316, #ec4899)',
                            border: 'none',
                            borderRadius: 14,
                            padding: '16px 32px',
                            fontSize: 14,
                            fontWeight: 800,
                            color: copied ? '#000' : '#fff',
                            cursor: 'pointer',
                            letterSpacing: 1,
                            transition: 'all 0.3s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            position: 'relative',
                            zIndex: 1,
                        }}
                    >
                        {copied ? <Check size={18} strokeWidth={3} /> : <Copy size={18} />}
                        {copied ? 'COPIED!' : 'COPY LINK'}
                    </motion.button>
                </motion.div>

                {/* ── Flow Steps ── */}
                <div style={{ marginBottom: 64 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
                        <div style={{ color: '#888', fontSize: 11, letterSpacing: 4, fontWeight: 700 }}>
                            HOW THE LOOP WORKS
                        </div>
                        <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
                    </div>

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}
                    >
                        {steps.map((s, i) => (
                            <motion.div
                                key={i}
                                variants={itemVariants}
                                whileHover={{ y: -5, borderColor: '#f97316', boxShadow: '0 10px 30px rgba(249, 115, 22, 0.15)' }}
                                style={{
                                    background: 'rgba(20, 20, 28, 0.4)',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    borderRadius: 20,
                                    padding: '24px',
                                    position: 'relative',
                                    cursor: 'default',
                                    transition: 'border-color 0.3s, box-shadow 0.3s',
                                }}
                            >
                                <div style={{
                                    width: 48, height: 48, borderRadius: 12,
                                    background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(167,139,250,0.2))',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff', marginBottom: 16,
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    {s.icon}
                                </div>
                                <div style={{
                                    position: 'absolute', top: 20, right: 20,
                                    fontSize: 14, color: 'rgba(255,255,255,0.1)', fontWeight: 900,
                                    fontFamily: 'monospace'
                                }}>0{i + 1}</div>
                                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8, color: '#fff', letterSpacing: '-0.3px' }}>{s.title}</div>
                                <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>{s.desc}</div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>

                {/* ── Tier Rewards ── */}
                <div style={{ marginBottom: 64 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
                        <div style={{ color: '#888', fontSize: 11, letterSpacing: 4, fontWeight: 700 }}>
                            MILESTONE TIERS & TOKEN REWARDS
                        </div>
                        <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 16 }}>
                        {REFERRAL_TIERS.map((t) => {
                            const isActive = activeTier === t.id;
                            return (
                                <motion.div
                                    key={t.id}
                                    layout
                                    onClick={() => setActiveTier(isActive ? null : t.id)}
                                    whileHover={{ scale: isActive ? 1 : 1.02 }}
                                    style={{
                                        background: isActive ? 'rgba(20,20,30,0.8)' : 'rgba(15,15,20,0.5)',
                                        backdropFilter: 'blur(10px)',
                                        border: `1px solid ${isActive ? t.color : 'rgba(255,255,255,0.05)'}`,
                                        borderRadius: 20,
                                        padding: '24px',
                                        cursor: 'pointer',
                                        transition: 'background 0.3s, border-color 0.3s',
                                        boxShadow: isActive ? `0 10px 40px ${t.color}33, inset 0 1px 0 rgba(255,255,255,0.1)` : 'none',
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {/* Subtle hover glow tied to mouse pos could theoretically go here, but omitted for simplicity */}
                                    {isActive && (
                                        <div className="absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full pointer-events-none" style={{ background: t.color, opacity: 0.15 }} />
                                    )}

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: isActive ? 16 : 0, transition: 'margin 0.3s' }}>
                                        <div style={{
                                            fontSize: 32,
                                            background: 'rgba(0,0,0,0.3)',
                                            width: 56, height: 56,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            borderRadius: 16,
                                            border: `1px solid ${t.color}44`
                                        }}>
                                            {t.emoji}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 18, fontWeight: 900, color: t.color, letterSpacing: '-0.5px' }}>{t.label}</div>
                                            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{t.required} referral{t.required > 1 ? 's' : ''} required</div>
                                        </div>
                                        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                            <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', textShadow: `0 0 20px ${t.color}aa` }}>
                                                +{t.reward.toLocaleString()}
                                            </div>
                                            <div style={{ fontSize: 10, color: t.color, letterSpacing: 1, fontWeight: 700 }}>TOKENS</div>
                                        </div>
                                        <motion.div animate={{ rotate: isActive ? 180 : 0 }} style={{ color: '#555', marginLeft: 8 }}>
                                            <ChevronDown size={20} />
                                        </motion.div>
                                    </div>

                                    <AnimatePresence>
                                        {isActive && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                style={{ overflow: 'hidden' }}
                                            >
                                                <div style={{ paddingTop: 16, borderTop: `1px solid ${t.color}33`, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                    {t.perks.map((p, i) => (
                                                        <motion.div
                                                            key={i}
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: 0.1 + (i * 0.05) }}
                                                            style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#bbb' }}
                                                        >
                                                            <div style={{ color: t.color, marginTop: 2 }}><ArrowRight size={14} /></div>
                                                            <span style={{ lineHeight: 1.5 }}>{p}</span>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Simulator ── */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    style={{
                        background: 'rgba(15, 15, 20, 0.6)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 24,
                        padding: '40px',
                        marginBottom: 64,
                        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    <div className="absolute top-0 right-1/4 w-64 h-64 bg-fuchsia-600/10 blur-[100px] rounded-full mix-blend-screen pointer-events-none" />

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
                        <div style={{ color: '#888', fontSize: 11, letterSpacing: 4, fontWeight: 700 }}>
                            REFERRAL SIMULATOR
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 10px #4ade80' }} />
                            <span style={{ fontSize: 10, color: '#aaa', letterSpacing: 1 }}>INTERACTIVE</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 32 }}>
                        <span style={{ fontSize: 14, color: '#888', fontWeight: 600, minWidth: 120 }}>FRIENDS INVITED:</span>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <input
                                type="range" min={0} max={25} value={sim}
                                onChange={e => setSim(Number(e.target.value))}
                                style={{
                                    width: '100%',
                                    accentColor: currentTier?.color || '#f97316',
                                    cursor: 'grab',
                                }}
                                className="custom-range" // Would need css, but inline fallback works
                            />
                        </div>
                        <motion.div
                            key={sim}
                            initial={{ scale: 1.5, color: '#fff' }}
                            animate={{ scale: 1, color: currentTier?.color || '#888' }}
                            style={{
                                fontSize: 32, fontWeight: 900,
                                minWidth: 48, textAlign: 'right',
                                textShadow: currentTier ? `0 0 20px ${currentTier.color}88` : 'none'
                            }}
                        >
                            {sim}
                        </motion.div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                        <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '24px', textAlign: 'center' }}>
                            <motion.div key={totalTokens} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ fontSize: 40, fontWeight: 900, color: '#fff', textShadow: '0 0 20px rgba(250, 204, 21, 0.4)' }}>
                                {totalTokens.toLocaleString()}
                            </motion.div>
                            <div style={{ fontSize: 11, color: '#facc15', marginTop: 8, letterSpacing: 2, fontWeight: 700 }}>TOKENS EARNED</div>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '24px', textAlign: 'center' }}>
                            <motion.div key={currentTier?.id} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ fontSize: 24, fontWeight: 900, color: currentTier?.color || '#555', marginTop: 10 }}>
                                {currentTier ? `${currentTier.emoji} ${currentTier.label}` : '—'}
                            </motion.div>
                            <div style={{ fontSize: 11, color: '#888', marginTop: 14, letterSpacing: 2, fontWeight: 700 }}>CURRENT TIER</div>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '24px', textAlign: 'center' }}>
                            <motion.div key={nextTier?.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: 24, fontWeight: 900, color: nextTier?.color || '#4ade80', marginTop: 10 }}>
                                {nextTier ? `${nextTier.required - sim} more` : 'MAX 👑'}
                            </motion.div>
                            <div style={{ fontSize: 11, color: '#888', marginTop: 14, letterSpacing: 2, fontWeight: 700 }}>TO NEXT TIER</div>
                        </div>
                    </div>
                </motion.div>

                {/* ── Token Economy Note ── */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    style={{
                        borderLeft: '4px solid #a78bfa',
                        background: 'linear-gradient(90deg, rgba(167, 139, 250, 0.1) 0%, transparent 100%)',
                        padding: '24px 32px',
                        borderRadius: '0 20px 20px 0',
                        marginBottom: 64,
                    }}
                >
                    <div style={{ fontSize: 13, color: '#aaa', lineHeight: 2 }}>
                        <div style={{ marginBottom: 16 }}>
                            <span style={{ color: '#fff', fontWeight: 800, background: '#a78bfa44', padding: '2px 8px', borderRadius: 4, marginRight: 8 }}>TOKEN UTILITY</span>
                            Credits for Open Cloud / Glow agents · Browser automation tasks · Premium game unlocks · Future: marketplace, peer tutoring, AI tool credits
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <span style={{ color: '#fff', fontWeight: 800, background: '#f43f5e44', padding: '2px 8px', borderRadius: 4, marginRight: 8 }}>ANTI-ABUSE</span>
                            Referral counted only after friend completes 1 full game session · Same device / IP = flagged · Rate limits per user per day
                        </div>
                        <div>
                            <span style={{ color: '#fff', fontWeight: 800, background: '#4ade8044', padding: '2px 8px', borderRadius: 4, marginRight: 8 }}>VIRALITY MECHANIC</span>
                            Public leaderboard + shareable &quot;Yokai Card&quot; showing tier badge drives organic social sharing
                        </div>
                    </div>
                </motion.div>

                {/* ── CTA ── */}
                {onNavigateToUseCases && (
                    <motion.div
                        whileHover={{ scale: 1.02, translateY: -5, boxShadow: '0 20px 50px rgba(249, 115, 22, 0.3)' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onNavigateToUseCases}
                        style={{
                            background: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #a78bfa 100%)',
                            borderRadius: 24,
                            padding: '40px 48px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 20,
                            cursor: 'pointer',
                            flexWrap: 'wrap',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[200%] group-hover:animate-[shimmer_2s_infinite]" />

                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-1px', marginBottom: 8, textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                                See what you can do with your tokens →
                            </div>
                            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
                                10 real-world agent use cases designed for you. Not demos. Real utility.
                            </div>
                        </div>
                        <div style={{
                            background: '#fff',
                            color: '#000',
                            borderRadius: 14,
                            padding: '16px 32px',
                            fontSize: 14,
                            fontWeight: 900,
                            letterSpacing: 2,
                            whiteSpace: 'nowrap',
                            position: 'relative',
                            zIndex: 1,
                            boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
                        }}>
                            EXPLORE
                        </div>
                    </motion.div>
                )}

                <div style={{ textAlign: 'center', color: '#333', fontSize: 11, letterSpacing: 4, marginTop: 48, fontWeight: 700 }}>
                    AI.YOKAIZENCAMPUS.COM — VIRAL ARCHITECTURE V1
                </div>
            </div>
        </div>
    );
}
