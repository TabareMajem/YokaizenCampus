import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Zap, Clock, Trophy, Skull, ArrowRight, ShieldCheck, Users } from 'lucide-react';
import { GauntletQuestion } from '../../types';

// ── Phases ──
const PHASES = {
    INVITE: 'invite',
    GAME: 'game',
    RESULT: 'result',
    SQUAD: 'squad',
} as const;

type Phase = typeof PHASES[keyof typeof PHASES];

// ── Default Config ──
const defaultLeader = {
    name: 'ShadowKai',
    avatar: '🐺',
    tier: 'Yokai Master',
    tierColor: '#f97316',
    squadName: 'Neon Wolves',
    members: 3,
    maxMembers: 7,
    requirements: { minScore: 650, label: '650+ to join' },
};

const defaultQuestions: GauntletQuestion[] = [
    {
        q: "An AI agent can browse the internet for you. What does that actually mean?",
        options: [
            "It searches Google and shows you results",
            "It opens a real browser, clicks, fills forms, and takes actions like a human",
            "It reads websites but can't interact with them",
            "It downloads the internet to analyze it",
        ],
        correct: 1, points: 150,
    },
    {
        q: "You ask your agent to 'find me a flight under $200 to Miami this weekend.' What's the best agent strategy?",
        options: [
            "Open one airline site and check prices",
            "Tell you to search yourself",
            "Open multiple travel sites, compare prices in real-time, and book the best option",
            "Generate a fake itinerary",
        ],
        correct: 2, points: 200,
    },
    {
        q: "What makes proactive agents different from chatbots?",
        options: [
            "They're smarter at answering questions",
            "They take real actions in the world without you doing each step",
            "They have better memory",
            "They speak multiple languages",
        ],
        correct: 1, points: 200,
    },
    {
        q: "Your agent is set to 'grow my TikTok.' Which action is actually possible?",
        options: [
            "Generate viral ideas only",
            "Post content, reply to comments, and track analytics automatically",
            "Watch other TikToks for inspiration",
            "Delete bad performing videos",
        ],
        correct: 1, points: 150,
    },
    {
        q: "Speed round: Tokens in AI Labs are used for...",
        options: [
            "Buying in-game cosmetics only",
            "Paying real money to Anthropic",
            "Activating agents to perform real tasks on the internet",
            "Unlocking chat features",
        ],
        correct: 2, points: 300, speed: true,
    },
];

// ── Glow Progress Bar ──
function GlowingProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
    return (
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 999, height: 8, overflow: 'hidden', position: 'relative' }}>
            <motion.div
                animate={{ width: `${Math.min((value / max) * 100, 100)}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{
                    background: color,
                    height: '100%',
                    borderRadius: 999,
                    boxShadow: `0 0 20px ${color}`,
                }}
            />
        </div>
    );
}

// ── Props ──
interface SquadGauntletProps {
    leaderName?: string;
    leaderAvatar?: string;
    squadName?: string;
    onJoinComplete?: () => void;
    onCreateOwnSquad?: () => void;
}

export function SquadGauntlet({
    leaderName,
    leaderAvatar,
    squadName,
    onJoinComplete,
    onCreateOwnSquad,
}: SquadGauntletProps) {
    const leader = {
        ...defaultLeader,
        ...(leaderName && { name: leaderName }),
        ...(leaderAvatar && { avatar: leaderAvatar }),
        ...(squadName && { squadName }),
    };
    const questions = defaultQuestions;

    const [phase, setPhase] = useState<Phase>(PHASES.INVITE);
    const [current, setCurrent] = useState(0);
    const [score, setScore] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const [answered, setAnswered] = useState(false);
    const [timeLeft, setTimeLeft] = useState(15);
    const [combo, setCombo] = useState(0);
    const [streak, setStreak] = useState(0);
    const [screenFlash, setScreenFlash] = useState<string | null>(null);
    const [shake, setShake] = useState(false);

    const required = leader.requirements.minScore;
    const accepted = score >= required;
    const maxScore = questions.reduce((a, q) => a + q.points + (q.speed ? 150 : 0) + 50, 0);

    // Timer
    useEffect(() => {
        if (phase !== PHASES.GAME || answered) return;
        if (timeLeft <= 0) {
            setAnswered(true);
            setCombo(0);
            setStreak(0);
            setScreenFlash('rgba(244, 63, 94, 0.4)'); // Red flash
            setShake(true);
            setTimeout(() => { setScreenFlash(null); setShake(false); }, 400);
            const tid = setTimeout(advance, 1500);
            return () => clearTimeout(tid);
        }
        const t = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearTimeout(t);
    }, [phase, timeLeft, answered]);

    const advance = useCallback(() => {
        if (current + 1 >= questions.length) {
            setPhase(PHASES.RESULT);
        } else {
            setCurrent(c => c + 1);
            setSelected(null);
            setAnswered(false);
            setTimeLeft(15);
            setCombo(0);
        }
    }, [current, questions.length]);

    function answer(idx: number) {
        if (answered) return;
        setSelected(idx);
        setAnswered(true);
        const q = questions[current];
        if (idx === q.correct) {
            const speedBonus = q.speed ? Math.floor(timeLeft * 10) : 0;
            const comboBonus = streak >= 2 ? 50 : 0;
            const earned = q.points + speedBonus + comboBonus;
            setScore(s => s + earned);
            setCombo(earned);
            setStreak(s => s + 1);
            setScreenFlash('rgba(74, 222, 128, 0.3)'); // Green flash
            setTimeout(() => setScreenFlash(null), 400);
        } else {
            setCombo(0);
            setStreak(0);
            setScreenFlash('rgba(244, 63, 94, 0.4)'); // Red flash
            setShake(true);
            setTimeout(() => { setScreenFlash(null); setShake(false); }, 400);
        }
        setTimeout(advance, 1800);
    }

    function resetGame() {
        setPhase(PHASES.GAME);
        setCurrent(0);
        setScore(0);
        setSelected(null);
        setAnswered(false);
        setTimeLeft(15);
        setStreak(0);
        setCombo(0);
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#040406',
            color: '#e0dbd2',
            fontFamily: "'Inter', 'Courier New', monospace",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* ── Cinematic Backgrounds ── */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                {phase === PHASES.INVITE && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-600/10 blur-[150px] rounded-full mix-blend-screen" />
                        <div className={`absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] mix-blend-overlay`} />
                    </motion.div>
                )}
                {phase === PHASES.GAME && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0">
                        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen" />
                        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/10 blur-[120px] rounded-full mix-blend-screen" />
                        <div className={`absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay`} />
                    </motion.div>
                )}
                {phase === PHASES.RESULT && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0">
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] ${accepted ? 'bg-green-600/10' : 'bg-red-600/10'} blur-[150px] rounded-full mix-blend-screen`} />
                        <div className={`absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] mix-blend-overlay`} />
                    </motion.div>
                )}
            </div>

            {/* Screen Flash Effect for Game Phase */}
            <AnimatePresence>
                {screenFlash && (
                    <motion.div
                        initial={{ opacity: 0.8 }}
                        animate={{ opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: screenFlash,
                            pointerEvents: 'none',
                            zIndex: 999,
                            mixBlendMode: 'screen'
                        }}
                    />
                )}
            </AnimatePresence>

            <motion.div
                animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
                transition={{ duration: 0.4 }}
                style={{ width: '100%', maxWidth: 560, position: 'relative', zIndex: 10 }}
            >

                {/* ════ INVITE PHASE ════ */}
                {phase === PHASES.INVITE && (
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }}>
                        <div style={{ textAlign: 'center', marginBottom: 40 }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: 999, fontSize: 10, letterSpacing: 4, color: '#aaa', marginBottom: 24, fontWeight: 700 }}>
                                <ShieldAlert size={14} className="text-orange-500" /> SQUAD INVITE · AI LABS
                            </div>
                            <motion.div
                                animate={{ scale: [1, 1.05, 1], filter: ['drop-shadow(0 0 20px rgba(249,115,22,0.2))', 'drop-shadow(0 0 40px rgba(249,115,22,0.5))', 'drop-shadow(0 0 20px rgba(249,115,22,0.2))'] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                style={{ fontSize: 72, marginBottom: 16 }}
                            >
                                {leader.avatar}
                            </motion.div>
                            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-1px', color: '#fff' }}>
                                {leader.name}
                            </div>
                            <div style={{
                                display: 'inline-block',
                                background: `linear-gradient(90deg, ${leader.tierColor}22, transparent)`,
                                border: `1px solid ${leader.tierColor}44`,
                                color: leader.tierColor,
                                fontSize: 11,
                                letterSpacing: 2,
                                padding: '6px 16px',
                                borderRadius: 999,
                                marginTop: 10,
                                fontWeight: 800,
                            }}>
                                🔥 {leader.tier.toUpperCase()}
                            </div>
                        </div>

                        <div style={{
                            background: 'rgba(20,20,30,0.6)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 24,
                            padding: 32,
                            marginBottom: 24,
                            boxShadow: '0 20px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
                        }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#888', marginBottom: 6, letterSpacing: 1 }}>
                                You&apos;ve been challenged to join
                            </div>
                            <div style={{
                                fontSize: 40,
                                fontWeight: 900,
                                background: 'linear-gradient(90deg, #f97316, #ec4899)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                letterSpacing: '-1.5px',
                                marginBottom: 32,
                                textShadow: '0 10px 30px rgba(249,115,22,0.3)'
                            }}>
                                {leader.squadName}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 32 }}>
                                {[
                                    { label: 'MEMBERS', val: `${leader.members}/${leader.maxMembers}` },
                                    { label: 'SPOTS LEFT', val: leader.maxMembers - leader.members },
                                    { label: 'MIN SCORE', val: required },
                                ].map((stat, i) => (
                                    <div key={i} style={{
                                        background: 'rgba(0,0,0,0.4)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        borderRadius: 16,
                                        padding: '16px 12px',
                                        textAlign: 'center',
                                    }}>
                                        <div style={{ fontSize: 24, fontWeight: 900, color: '#fff' }}>{stat.val}</div>
                                        <div style={{ fontSize: 10, color: '#666', letterSpacing: 2, marginTop: 4, fontWeight: 700 }}>{stat.label}</div>
                                    </div>
                                ))}
                            </div>

                            <div style={{
                                background: 'rgba(249,115,22,0.05)',
                                border: '1px solid rgba(249,115,22,0.3)',
                                borderRadius: 16,
                                padding: '20px',
                                marginBottom: 32,
                                fontSize: 14,
                                color: '#aaa',
                                lineHeight: 1.7,
                            }}>
                                <span style={{ color: '#f97316', fontWeight: 800 }}>⚠️ This is a gated squad.</span><br />
                                You must prove your AI knowledge to get in. Score <span style={{ color: '#fff', fontWeight: 800 }}>{required}+</span> on the entry test to earn your spot.
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02, boxShadow: '0 10px 30px rgba(249,115,22,0.3)' }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setPhase(PHASES.GAME)}
                                style={{
                                    width: '100%',
                                    background: 'linear-gradient(135deg, #f97316, #ec4899)',
                                    border: 'none',
                                    borderRadius: 16,
                                    padding: '20px',
                                    fontSize: 16,
                                    fontWeight: 900,
                                    color: '#fff',
                                    cursor: 'pointer',
                                    letterSpacing: 2,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: 12,
                                }}
                            >
                                ACCEPT CHALLENGE <ArrowRight size={20} />
                            </motion.button>
                        </div>
                        <div style={{ textAlign: 'center', fontSize: 12, color: '#555', letterSpacing: 1, fontWeight: 600 }}>
                            5 questions · ~2 minutes · No second chances
                        </div>
                    </motion.div>
                )}

                {/* ════ GAME PHASE ════ */}
                {phase === PHASES.GAME && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
                        {/* HUD */}
                        <div style={{
                            background: 'rgba(20,20,30,0.6)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 20,
                            padding: '20px 24px',
                            marginBottom: 24,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(10px)'
                        }}>
                            <div>
                                <div style={{ fontSize: 10, color: '#666', letterSpacing: 3, fontWeight: 700, marginBottom: 4 }}>SCORE</div>
                                <motion.div
                                    key={score}
                                    initial={{ scale: 1.4, color: '#fff' }}
                                    animate={{ scale: 1, color: '#facc15' }}
                                    style={{ fontSize: 28, fontWeight: 900, textShadow: '0 0 20px rgba(250,204,21,0.5)' }}
                                >
                                    {score.toLocaleString()}
                                </motion.div>
                            </div>

                            <div style={{ textAlign: 'center', flex: 1, margin: '0 32px' }}>
                                <div style={{ fontSize: 11, color: '#888', letterSpacing: 3, marginBottom: 8, fontWeight: 700 }}>
                                    Q {current + 1} / {questions.length}
                                </div>
                                <GlowingProgressBar value={current + 1} max={questions.length} color="#a78bfa" />
                            </div>

                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 10, color: '#666', letterSpacing: 3, fontWeight: 700, marginBottom: 4 }}>TIME</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                                    <Clock size={16} className={timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-green-400'} />
                                    <motion.div
                                        key={timeLeft}
                                        initial={{ scale: timeLeft <= 5 ? 1.3 : 1 }}
                                        animate={{ scale: 1 }}
                                        style={{
                                            fontSize: 28, fontWeight: 900,
                                            color: timeLeft <= 5 ? '#f43f5e' : '#4ade80',
                                            transition: 'color 0.3s',
                                            textShadow: timeLeft <= 5 ? '0 0 20px rgba(244,63,94,0.5)' : 'none'
                                        }}
                                    >
                                        {timeLeft}s
                                    </motion.div>
                                </div>
                            </div>
                        </div>

                        {/* Streak Banner */}
                        <div style={{ height: 40, marginBottom: 16 }}>
                            <AnimatePresence>
                                {streak >= 2 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -20, scale: 0.8 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        style={{
                                            background: 'rgba(250,204,21,0.15)',
                                            border: '1px solid rgba(250,204,21,0.4)',
                                            borderRadius: 12,
                                            padding: '8px 16px',
                                            fontSize: 12,
                                            color: '#facc15',
                                            textAlign: 'center',
                                            letterSpacing: 2,
                                            fontWeight: 800,
                                            boxShadow: '0 0 20px rgba(250,204,21,0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 8,
                                        }}
                                    >
                                        <Zap size={16} className="animate-pulse" /> {streak} STREAK — COMBO ACTIVE (+50)
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Question Card */}
                        <motion.div
                            key={current} // Retrigger animation per question
                            initial={{ opacity: 0, x: 50, filter: 'blur(10px)' }}
                            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                            style={{
                                background: 'rgba(20,20,30,0.6)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 24,
                                padding: '32px',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                                position: 'relative',
                            }}
                        >
                            {questions[current].speed && (
                                <motion.div
                                    animate={{ opacity: [1, 0.4, 1] }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#facc1522', padding: '4px 12px', borderRadius: 999, fontSize: 10, color: '#facc15', letterSpacing: 2, marginBottom: 20, fontWeight: 800 }}
                                >
                                    <Zap size={12} fill="currentColor" /> SPEED ROUND (TIME BONUS = x10)
                                </motion.div>
                            )}

                            <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.6, marginBottom: 32, color: '#fff', letterSpacing: '-0.3px' }}>
                                {questions[current].q}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {questions[current].options.map((opt, i) => {
                                    const isCorrect = i === questions[current].correct;
                                    const isSelected = i === selected;

                                    let bg = 'rgba(0,0,0,0.3)';
                                    let border = 'rgba(255,255,255,0.05)';
                                    let textColor = '#aaa';
                                    let shadow = 'none';

                                    if (answered) {
                                        if (isCorrect) {
                                            bg = 'rgba(74,222,128,0.15)';
                                            border = 'rgba(74,222,128,0.5)';
                                            textColor = '#4ade80';
                                            shadow = '0 0 30px rgba(74,222,128,0.2)';
                                        }
                                        else if (isSelected && !isCorrect) {
                                            bg = 'rgba(244,63,94,0.15)';
                                            border = 'rgba(244,63,94,0.5)';
                                            textColor = '#f43f5e';
                                            shadow = '0 0 30px rgba(244,63,94,0.2)';
                                        }
                                    } else if (isSelected) {
                                        bg = 'rgba(167,139,250,0.15)';
                                        border = 'rgba(167,139,250,0.5)';
                                        textColor = '#fff';
                                    }

                                    return (
                                        <motion.button
                                            key={i}
                                            whileHover={!answered ? { scale: 1.02, borderColor: '#a78bfa', background: 'rgba(167,139,250,0.1)' } : {}}
                                            whileTap={!answered ? { scale: 0.98 } : {}}
                                            onClick={() => answer(i)}
                                            style={{
                                                background: bg,
                                                border: `1px solid ${border}`,
                                                boxShadow: shadow,
                                                borderRadius: 14,
                                                padding: '18px 20px',
                                                textAlign: 'left',
                                                fontSize: 14,
                                                color: textColor,
                                                fontWeight: 600,
                                                cursor: answered ? 'default' : 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: 16,
                                            }}
                                        >
                                            <span style={{
                                                color: answered ? textColor : '#555',
                                                fontWeight: 900,
                                                background: 'rgba(255,255,255,0.05)',
                                                padding: '2px 8px',
                                                borderRadius: 6,
                                                fontSize: 12
                                            }}>
                                                {String.fromCharCode(65 + i)}
                                            </span>
                                            <span style={{ paddingTop: 2, lineHeight: 1.5 }}>{opt}</span>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </motion.div>

                        {/* Score feedback floating above */}
                        <AnimatePresence>
                            {answered && combo > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, y: -100, scale: 1.5 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    style={{ position: 'absolute', top: '50%', left: '50%', x: '-50%', y: '-50%', pointerEvents: 'none', zIndex: 100 }}
                                >
                                    <div style={{ fontSize: 32, fontWeight: 900, color: '#4ade80', textShadow: '0 0 40px rgba(74,222,128,0.8)' }}>
                                        +{combo}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* ════ RESULT PHASE ════ */}
                {phase === PHASES.RESULT && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, filter: 'blur(20px)' }}
                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        transition={{ type: 'spring', damping: 20 }}
                        style={{ textAlign: 'center' }}
                    >
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}
                        >
                            <div style={{
                                background: accepted ? 'rgba(74,222,128,0.1)' : 'rgba(244,63,94,0.1)',
                                border: `1px solid ${accepted ? 'rgba(74,222,128,0.3)' : 'rgba(244,63,94,0.3)'}`,
                                borderRadius: '50%',
                                width: 120, height: 120,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: `0 0 60px ${accepted ? 'rgba(74,222,128,0.3)' : 'rgba(244,63,94,0.3)'}`
                            }}>
                                {accepted ? <Trophy size={64} color="#4ade80" /> : <Skull size={64} color="#f43f5e" />}
                            </div>
                        </motion.div>

                        <div style={{ fontSize: 12, letterSpacing: 6, color: '#888', marginBottom: 16, fontWeight: 800 }}>FINAL SCORE</div>

                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
                            style={{
                                fontSize: 96,
                                fontWeight: 900,
                                color: accepted ? '#4ade80' : '#f43f5e',
                                letterSpacing: '-4px',
                                lineHeight: 1,
                                marginBottom: 12,
                                textShadow: `0 0 40px ${accepted ? 'rgba(74,222,128,0.5)' : 'rgba(244,63,94,0.5)'}`
                            }}
                        >
                            {score.toLocaleString()}
                        </motion.div>

                        <div style={{ fontSize: 13, color: '#666', marginBottom: 40, fontWeight: 600, letterSpacing: 2 }}>
                            OUT OF ~{maxScore.toLocaleString()} POSSIBLE
                        </div>

                        <div style={{
                            background: 'rgba(20,20,30,0.6)',
                            backdropFilter: 'blur(20px)',
                            border: `1px solid ${accepted ? 'rgba(74,222,128,0.2)' : 'rgba(244,63,94,0.2)'}`,
                            borderRadius: 24,
                            padding: 40,
                            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                        }}>
                            <div style={{ marginBottom: 32 }}>
                                <GlowingProgressBar value={score} max={maxScore} color={accepted ? '#4ade80' : '#f43f5e'} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#555', marginTop: 12, fontWeight: 800, letterSpacing: 1 }}>
                                    <span>0</span>
                                    <span style={{ color: accepted ? '#4ade80' : '#f97316' }}>MIN: {required}</span>
                                    <span>{maxScore}</span>
                                </div>
                            </div>

                            {accepted ? (
                                <div>
                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                                        <div style={{ fontSize: 24, fontWeight: 900, color: '#4ade80', marginBottom: 12, letterSpacing: '-0.5px' }}>
                                            ACCESS GRANTED
                                        </div>
                                        <div style={{ fontSize: 14, color: '#888', lineHeight: 1.8, marginBottom: 32 }}>
                                            You passed the test. <span style={{ color: '#fff', fontWeight: 700 }}>{leader.name}</span> will be notified.
                                            Welcome to <span style={{ color: leader.tierColor, fontWeight: 800 }}>{leader.squadName}</span>.
                                        </div>
                                    </motion.div>
                                    <motion.button
                                        whileHover={{ scale: 1.02, boxShadow: '0 10px 30px rgba(74,222,128,0.3)' }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => {
                                            setPhase(PHASES.SQUAD);
                                            onJoinComplete?.();
                                        }}
                                        style={{
                                            width: '100%',
                                            background: 'linear-gradient(135deg, #4ade80, #22d3ee)',
                                            border: 'none',
                                            borderRadius: 16,
                                            padding: '20px',
                                            fontSize: 16,
                                            fontWeight: 900,
                                            color: '#000',
                                            cursor: 'pointer',
                                            letterSpacing: 2,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 12,
                                        }}
                                    >
                                        JOIN THE SQUAD <ArrowRight size={20} />
                                    </motion.button>
                                </div>
                            ) : (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                                    <div style={{ fontSize: 24, fontWeight: 900, color: '#f43f5e', marginBottom: 12, letterSpacing: '-0.5px' }}>
                                        NOT ENOUGH. YET.
                                    </div>
                                    <div style={{ fontSize: 14, color: '#888', lineHeight: 1.8, marginBottom: 12 }}>
                                        You needed <span style={{ color: '#fff', fontWeight: 800 }}>{required}</span>.<br />
                                        You missed by <span style={{ color: '#f43f5e', fontWeight: 800 }}>{required - score} points.</span>
                                    </div>
                                    <div style={{
                                        background: 'rgba(244,63,94,0.1)',
                                        border: '1px solid rgba(244,63,94,0.2)',
                                        borderRadius: 12,
                                        padding: 16,
                                        fontSize: 12,
                                        color: '#aaa',
                                        marginBottom: 32,
                                        lineHeight: 1.6,
                                    }}>
                                        Play the AI Labs games to level up your knowledge — then come back for another shot.
                                    </div>
                                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                        <motion.button
                                            whileHover={{ background: 'rgba(244,63,94,0.1)' }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={resetGame}
                                            style={{
                                                flex: 1, minWidth: 150,
                                                background: 'transparent',
                                                border: '1px solid #f43f5e',
                                                borderRadius: 16,
                                                padding: '16px',
                                                fontSize: 13,
                                                fontWeight: 800,
                                                color: '#f43f5e',
                                                cursor: 'pointer',
                                                letterSpacing: 1,
                                            }}
                                        >
                                            TRY AGAIN
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.02, boxShadow: '0 10px 30px rgba(249,115,22,0.3)' }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={onCreateOwnSquad}
                                            style={{
                                                flex: 2, minWidth: 200,
                                                background: 'linear-gradient(135deg, #f97316, #a78bfa)',
                                                border: 'none',
                                                borderRadius: 16,
                                                padding: '16px',
                                                fontSize: 13,
                                                fontWeight: 800,
                                                color: '#fff',
                                                cursor: 'pointer',
                                                letterSpacing: 1,
                                            }}
                                        >
                                            START MY OWN SQUAD
                                        </motion.button>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* ════ SQUAD PHASE ════ */}
                {phase === PHASES.SQUAD && (
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                        <div style={{ textAlign: 'center', marginBottom: 40 }}>
                            <motion.div
                                initial={{ scale: 0, rotate: -45 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', padding: '8px 20px', borderRadius: 999, fontSize: 11, letterSpacing: 4, color: '#4ade80', marginBottom: 24, fontWeight: 800 }}
                            >
                                <ShieldCheck size={16} /> SQUAD JOINED
                            </motion.div>
                            <div style={{
                                fontSize: 48, fontWeight: 900,
                                background: 'linear-gradient(90deg, #f97316, #ec4899)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                letterSpacing: '-2px',
                                marginBottom: 8,
                            }}>
                                {leader.squadName}
                            </div>
                            <div style={{ fontSize: 13, color: '#888', fontWeight: 600, letterSpacing: 1 }}>YOU ARE MEMBER #{leader.members + 1}</div>
                        </div>

                        <div style={{
                            background: 'rgba(20,20,30,0.6)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 24,
                            padding: 32,
                            marginBottom: 24,
                            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                        }}>
                            <div style={{ fontSize: 11, color: '#666', letterSpacing: 4, marginBottom: 24, fontWeight: 800 }}>SQUAD PERKS UNLOCKED</div>
                            {[
                                { icon: '🤖', text: 'Shared agent pool — squad tokens combine for bigger tasks' },
                                { icon: '🏆', text: 'Compete in squad leaderboards for bonus token drops' },
                                { icon: '📡', text: 'See what automations your squad is running in real-time' },
                                { icon: '🔐', text: 'Private squad channel — squad leader sets the missions' },
                                { icon: '🪙', text: `+${Math.floor(score / 10)} bonus tokens for your entry score` },
                            ].map((p, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.4 + (i * 0.1) }}
                                    style={{
                                        display: 'flex', gap: 16, alignItems: 'center',
                                        padding: '14px 0',
                                        borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                    }}
                                >
                                    <span style={{ fontSize: 24, background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 12 }}>{p.icon}</span>
                                    <span style={{ fontSize: 13, color: '#aaa', lineHeight: 1.6, fontWeight: 500 }}>{p.text}</span>
                                </motion.div>
                            ))}
                        </div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1 }}
                            style={{
                                background: 'linear-gradient(135deg, rgba(249,115,22,0.1), rgba(236,72,153,0.05))',
                                border: '1px solid rgba(249,115,22,0.2)',
                                borderRadius: 16,
                                padding: '24px',
                                fontSize: 13,
                                color: '#aaa',
                                lineHeight: 1.8,
                            }}
                        >
                            <span style={{ color: '#f97316', fontWeight: 800 }}>Now build your own squad. →</span><br />
                            Invite others. Set your own minimum score. Gate your squad with any game on AI Labs. The higher your bar, the more elite your crew.
                        </motion.div>

                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.2 }}
                            whileHover={{ scale: 1.02, boxShadow: '0 10px 30px rgba(249,115,22,0.3)' }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onCreateOwnSquad}
                            style={{
                                width: '100%',
                                marginTop: 24,
                                background: 'linear-gradient(135deg, #f97316, #ec4899)',
                                border: 'none',
                                borderRadius: 16,
                                padding: '20px',
                                fontSize: 15,
                                fontWeight: 900,
                                color: '#fff',
                                cursor: 'pointer',
                                letterSpacing: 2,
                            }}
                        >
                            CREATE MY OWN SQUAD →
                        </motion.button>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}
