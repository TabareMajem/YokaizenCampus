import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentUseCase } from '../../types';
import { Sparkles, ArrowRight, Zap, ChevronDown, CheckCircle2 } from 'lucide-react';

const cases: AgentUseCase[] = [
    {
        id: 1, emoji: '🎵', title: 'Drop Your Own EP', category: 'MUSIC', color: '#f97316',
        hook: "You don't need a label. You need an agent.",
        what: 'An AI agent writes your song lyrics based on your vibe, generates a beat prompt, creates cover art, uploads the track to DistroKid or SoundCloud, and posts a launch announcement to your socials — all while you sleep.',
        tokens: 120,
        wow: 'From idea → streaming on Spotify in under 2 hours',
    },
    {
        id: 2, emoji: '📱', title: 'Auto-Grow Your TikTok', category: 'CREATOR', color: '#ec4899',
        hook: 'Post smarter, not harder.',
        what: 'The agent monitors trending sounds and hashtags in your niche, writes a script for your next 5 videos, schedules optimal posting times, drafts reply comments to boost engagement — and tells you what to film next.',
        tokens: 80,
        wow: 'Your content strategy on autopilot while you live your life',
    },
    {
        id: 3, emoji: '💸', title: 'Flip Products Online', category: 'HUSTLE', color: '#4ade80',
        hook: 'Your first side income before you graduate.',
        what: 'Agent scans Facebook Marketplace, eBay, and Craigslist for underpriced items in your area, writes listings with optimized titles and descriptions, tracks your inventory, and messages buyers automatically.',
        tokens: 200,
        wow: 'Some teens make $300–800/month doing exactly this manually. Now it\'s automated.',
    },
    {
        id: 4, emoji: '🎮', title: 'Build & Launch a Game', category: 'DEV', color: '#60a5fa',
        hook: 'No coding degree needed.',
        what: 'The agent helps you design game mechanics in plain English, generates playable code, creates sprites and sound effects, writes the App Store description, and submits it — handling the boring parts so you focus on being creative.',
        tokens: 350,
        wow: 'From concept to published game. For real.',
    },
    {
        id: 5, emoji: '📚', title: 'Never Fail a Class Again', category: 'SCHOOL', color: '#a78bfa',
        hook: 'Not cheating. Studying smarter.',
        what: 'Upload your syllabus. The agent builds a personalized study schedule, creates flashcard decks, writes practice essays for you to edit, explains any concept in your style, and sends you daily reminders timed to your biology.',
        tokens: 60,
        wow: 'Students using AI study tools improve grades by an average of 1.3 letter grades',
    },
    {
        id: 6, emoji: '👟', title: 'Sneaker & Hype Drop Bot', category: 'CULTURE', color: '#facc15',
        hook: 'Be first. Every time.',
        what: 'Agent monitors Nike SNKRS, StockX, Shopify drops, and Discord channels simultaneously. The second a drop goes live it fills your cart, notifies you instantly, and can auto-checkout on configured sites — beating bots with a bot.',
        tokens: 150,
        wow: 'The same tech resellers pay thousands for. Yours with tokens.',
    },
    {
        id: 7, emoji: '🌍', title: 'Plan the Perfect Trip', category: 'TRAVEL', color: '#34d399',
        hook: "For the friend group trip you've been planning for 2 years.",
        what: 'Tell the agent your budget, dates, vibe, and who\'s coming. It researches flights, hostels, things to do, local food spots, visa requirements — builds a full itinerary as a shareable doc and finds promo codes automatically.',
        tokens: 90,
        wow: 'A travel agent in your pocket. No booking fees.',
    },
    {
        id: 8, emoji: '🏋️', title: 'Custom Fitness Coach', category: 'HEALTH', color: '#f43f5e',
        hook: "A personal trainer can't afford you? Use an agent.",
        what: 'Input your body stats, goals, and available equipment. The agent writes a 12-week program, adjusts it weekly based on your logged progress, finds YouTube tutorials for each exercise, and tracks your nutrition macros.',
        tokens: 70,
        wow: 'Personalized coaching that adapts. Not a generic PDF.',
    },
    {
        id: 9, emoji: '🎨', title: 'Sell Art Without Being an Artist', category: 'BUSINESS', color: '#fb923c',
        hook: 'Ideas are the product. AI is the brush.',
        what: 'Describe a concept. The agent generates image variations, creates a product mockup on a t-shirt or poster, sets up an Etsy or Redbubble shop, writes product descriptions, and runs a basic SEO strategy for your listings.',
        tokens: 180,
        wow: 'Print-on-demand stores with zero inventory and zero upfront cost',
    },
    {
        id: 10, emoji: '🤝', title: 'Land Your First Job or Internship', category: 'CAREER', color: '#818cf8',
        hook: 'The job market is brutal. Agents even the odds.',
        what: 'The agent scrapes job boards for roles matching your skills, tailors your resume for each application, writes custom cover letters in your voice, tracks every application in a dashboard, and preps you with likely interview questions.',
        tokens: 100,
        wow: 'Apply to 40 jobs in the time it used to take to apply to 3',
    },
];

const categories = ['ALL', ...Array.from(new Set(cases.map(c => c.category)))];

// Animation Variants
const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.08 }
    }
};

const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { type: 'spring', stiffness: 200, damping: 20 }
    }
};

interface UseCasesShowcaseProps {
    onGetLink?: () => void;
}

export function UseCasesShowcase({ onGetLink }: UseCasesShowcaseProps) {
    const [filter, setFilter] = useState('ALL');
    const [expanded, setExpanded] = useState<number | null>(null);

    const visible = filter === 'ALL' ? cases : cases.filter(c => c.category === filter);

    return (
        <div style={{
            minHeight: '100vh',
            background: '#050508',
            color: '#e2ddd5',
            fontFamily: "'Inter', 'Courier New', monospace",
            padding: '60px 24px',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* ── Atmospheric Background ── */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-[10%] left-[-10%] w-[40%] h-[40%] bg-pink-600/10 blur-[120px] rounded-full mix-blend-screen" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
            </div>

            <div className="max-w-[1000px] mx-auto relative z-10">
                {/* ── Header ── */}
                <motion.div
                    initial={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.8 }}
                    style={{ marginBottom: 64, textAlign: 'center' }}
                >
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        padding: '8px 16px', borderRadius: 999, marginBottom: 24,
                        fontSize: 10, color: '#aaa', letterSpacing: 4, fontWeight: 700
                    }}>
                        <Sparkles size={12} className="text-pink-500" />
                        AGENT USE CASES · OPEN CLOUD
                    </div>

                    <div style={{
                        fontSize: 48,
                        fontWeight: 900,
                        lineHeight: 1.1,
                        letterSpacing: '-2px',
                        marginBottom: 20,
                        textShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    }}>
                        10 THINGS YOU CAN DO<br />
                        <span style={{
                            background: 'linear-gradient(90deg, #f97316, #ec4899, #60a5fa)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}>WITH YOUR TOKENS.</span>
                    </div>
                    <div style={{ fontSize: 15, color: '#888', maxWidth: 640, margin: '0 auto', lineHeight: 1.8, fontWeight: 500 }}>
                        These aren&apos;t tech demos. These are real things your agent will actually do on the internet —
                        browsing, clicking, filling forms, posting, and buying — for you.
                    </div>
                </motion.div>

                {/* ── Category Filter ── */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 48, justifyContent: 'center' }}>
                    {categories.map(cat => (
                        <motion.button
                            key={cat}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setFilter(cat)}
                            style={{
                                background: filter === cat ? '#fff' : 'rgba(20,20,30,0.5)',
                                color: filter === cat ? '#000' : '#888',
                                border: `1px solid ${filter === cat ? '#fff' : 'rgba(255,255,255,0.1)'}`,
                                backdropFilter: 'blur(10px)',
                                borderRadius: 999,
                                padding: '10px 24px',
                                fontSize: 11,
                                fontWeight: 800,
                                letterSpacing: 2,
                                cursor: 'pointer',
                                fontFamily: "'Courier New', monospace",
                                transition: 'all 0.3s',
                                boxShadow: filter === cat ? '0 0 20px rgba(255,255,255,0.3)' : 'none',
                            }}
                        >
                            {cat}
                        </motion.button>
                    ))}
                </div>

                {/* ── Cards Grid ── */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    key={filter} // re-trigger animation on filter change
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 20 }}
                >
                    {visible.map(c => {
                        const isOpen = expanded === c.id;
                        return (
                            <motion.div
                                key={c.id}
                                layout
                                variants={cardVariants}
                                whileHover={{ scale: isOpen ? 1 : 1.02, y: isOpen ? 0 : -5 }}
                                onClick={() => setExpanded(isOpen ? null : c.id)}
                                style={{
                                    background: isOpen ? 'rgba(25,25,35,0.8)' : 'rgba(15,15,22,0.6)',
                                    backdropFilter: 'blur(20px)',
                                    border: `1px solid ${isOpen ? c.color : 'rgba(255,255,255,0.05)'}`,
                                    borderRadius: 24,
                                    padding: '32px',
                                    cursor: 'pointer',
                                    transition: 'background 0.3s, border-color 0.3s',
                                    boxShadow: isOpen ? `0 20px 50px ${c.color}33, inset 0 1px 0 rgba(255,255,255,0.1)` : '0 10px 30px rgba(0,0,0,0.5)',
                                    gridColumn: isOpen ? 'span 2' : 'span 1',
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}
                            >
                                {/* Glow ring on hover */}
                                <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                                    <div className="absolute inset-[-1px] rounded-[24px] bg-gradient-to-tr from-transparent to-white/10 [mask-image:linear-gradient(transparent,black)]" />
                                </div>

                                {/* Card Header */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: isOpen ? 24 : 0, transition: 'margin 0.3s' }}>
                                    <div style={{
                                        fontSize: 40,
                                        background: `linear-gradient(135deg, ${c.color}22, ${c.color}05)`,
                                        boxShadow: `inset 0 0 20px ${c.color}22, 0 0 20px ${c.color}11`,
                                        border: `1px solid ${c.color}44`,
                                        borderRadius: 16,
                                        padding: '12px 16px',
                                        lineHeight: 1,
                                        flexShrink: 0,
                                    }}>{c.emoji}</div>

                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                            <span style={{ fontSize: 10, color: c.color, letterSpacing: 3, fontWeight: 800 }}>{c.category}</span>
                                        </div>
                                        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>
                                            {c.title}
                                        </div>
                                        <div style={{ fontSize: 13, color: '#888', marginTop: 6, fontWeight: 500, fontStyle: 'italic' }}>
                                            &quot;{c.hook}&quot;
                                        </div>
                                    </div>

                                    <motion.div
                                        animate={{ rotate: isOpen ? 180 : 0 }}
                                        style={{ color: isOpen ? c.color : '#555', marginTop: 8 }}
                                    >
                                        <ChevronDown size={24} />
                                    </motion.div>
                                </div>

                                {/* Expanded Details */}
                                <AnimatePresence>
                                    {isOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, paddingTop: 24, borderTop: `1px solid ${c.color}33`, overflow: 'hidden' }}
                                        >
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#888', letterSpacing: 3, marginBottom: 12, fontWeight: 700 }}>
                                                    <CheckCircle2 size={14} color={c.color} /> WHAT THE AGENT DOES
                                                </div>
                                                <div style={{ fontSize: 14, color: '#bbb', lineHeight: 1.8 }}>{c.what}</div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#888', letterSpacing: 3, marginBottom: 12, fontWeight: 700 }}>
                                                    <Zap size={14} color="#facc15" /> THE REAL IMPACT
                                                </div>
                                                <div style={{
                                                    background: `linear-gradient(135deg, ${c.color}15, transparent)`,
                                                    border: `1px solid ${c.color}33`,
                                                    borderRadius: 16,
                                                    padding: '20px',
                                                    fontSize: 16,
                                                    color: '#fff',
                                                    fontWeight: 700,
                                                    lineHeight: 1.6,
                                                    textShadow: `0 0 20px ${c.color}66`,
                                                    flex: 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                }}>
                                                    {c.wow}
                                                </div>

                                                <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div style={{
                                                        background: `${c.color}20`,
                                                        border: `1px solid ${c.color}55`,
                                                        boxShadow: `0 0 20px ${c.color}33`,
                                                        borderRadius: 12,
                                                        padding: '10px 20px',
                                                        fontSize: 14,
                                                        color: c.color,
                                                        fontWeight: 900,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                    }}>
                                                        <Coins size={16} /> {c.tokens} TOKENS
                                                    </div>
                                                    <div style={{ fontSize: 11, color: '#666', fontWeight: 600, letterSpacing: 1 }}>EST. COST</div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </motion.div>

                {/* ── Bottom CTA ── */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    whileHover={{ scale: 1.02, translateY: -5, boxShadow: '0 20px 50px rgba(249, 115, 22, 0.3)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onGetLink}
                    style={{
                        marginTop: 64,
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
                        <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: '-1.5px', marginBottom: 8, textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                            Invite 10 friends. Get 1,000 tokens.
                        </div>
                        <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
                            That&apos;s enough to launch a song, grow a TikTok, and start a side hustle. Simultaneously.
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
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                    }}>
                        GET MY LINK <ArrowRight size={18} />
                    </div>
                </motion.div>

                <div style={{ textAlign: 'center', color: '#333', fontSize: 11, letterSpacing: 4, marginTop: 48, fontWeight: 700 }}>
                    AI.YOKAIZENCAMPUS.COM — POWERED BY OPEN CLOUD
                </div>
            </div>
        </div>
    );
}
