import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDialogue, CharacterType } from '../../contexts/DialogueContext';
import { TriangleAlert, Terminal, ShieldAlert, Cpu } from 'lucide-react';
import { audio } from '../../services/audioService';

const CHARACTERS: Record<CharacterType, { name: string, color: string, bg: string, icon: React.ReactNode }> = {
    ATHENA: { name: 'PROJECT ATHENA', color: 'text-cyan-400', bg: 'bg-cyan-900/40 border-cyan-500/50', icon: <Cpu /> },
    BYTE: { name: 'BYTE_SEC', color: 'text-red-500', bg: 'bg-red-900/40 border-red-500/50', icon: <ShieldAlert /> },
    SYNTAX: { name: 'SYNTAX', color: 'text-purple-400', bg: 'bg-purple-900/40 border-purple-500/50', icon: <Terminal /> },
    SYSTEM: { name: 'SYSTEM_OVERRIDE', color: 'text-amber-500', bg: 'bg-amber-900/40 border-amber-500/50', icon: <TriangleAlert /> },
    UNKNOWN: { name: '???', color: 'text-gray-400', bg: 'bg-gray-800/80 border-gray-600', icon: <Terminal /> }
};

const TypewriterText = ({ text, onComplete, speed = 30 }: { text: string, onComplete: () => void, speed?: number }) => {
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        let i = 0;
        setDisplayedText('');

        const intervalId = setInterval(() => {
            setDisplayedText(text.substring(0, i + 1));

            // Audio effect
            if (i % 3 === 0) {
                audio.playTyping();
            }

            i++;
            if (i >= text.length) {
                clearInterval(intervalId);
                onComplete();
            }
        }, speed);

        return () => clearInterval(intervalId);
    }, [text, speed, onComplete]);

    return <span>{displayedText}</span>;
};

export const DialogueBox: React.FC = () => {
    const { isActive, currentLine, nextLine } = useDialogue();
    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
        if (currentLine) {
            setIsTyping(true);
            if (currentLine.isGlitchy) {
                audio.playGlitch();
            }
        }
    }, [currentLine]);

    if (!isActive || !currentLine) return null;

    const charConfig = CHARACTERS[currentLine.character] || CHARACTERS.UNKNOWN;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50, rotateX: -20 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl z-[100] px-4 pointer-events-auto"
                style={{ perspective: 1000 }}
                onClick={() => {
                    if (isTyping) {
                        setIsTyping(false); // Skip typing
                    } else {
                        nextLine();
                    }
                }}
            >
                {/* Persona 5 Angular Styling with Glitch Potential */}
                <div className={`relative ${charConfig.bg} backdrop-blur-xl border-t-4 border-l-4 shadow-[20px_20px_0px_rgba(0,0,0,0.5)] p-1 ${currentLine.isGlitchy ? 'animate-pulse' : ''} cursor-pointer`}>

                    {/* Character Name Tag (Slanted) */}
                    <div className={`absolute -top-8 -left-4 ${charConfig.bg.replace('/40', '')} px-6 py-2 border font-black tracking-widest text-lg flex items-center gap-3 transform -skew-x-12 shadow-lg z-10`} style={{ backdropFilter: 'none' }}>
                        <span className={`transform skew-x-12 ${charConfig.color}`}>{charConfig.icon}</span>
                        <span className={`transform skew-x-12 ${charConfig.color} filter drop-shadow-[0_0_5px_currentColor]`}>{charConfig.name}</span>
                    </div>

                    {/* Content Area */}
                    <div className="bg-black/80 w-full h-full p-6 md:p-8 min-h-[160px] flex gap-6 relative overflow-hidden">

                        {/* Scanline Overlay */}
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20 pointer-events-none"></div>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent animate-scanline pointer-events-none"></div>

                        {/* Portrait Placeholder / Real URL */}
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl border-2 border-white/10 shrink-0 bg-slate-900 overflow-hidden relative filter grayscale contrast-125">
                            {currentLine.portraitUrl ? (
                                <img src={currentLine.portraitUrl} alt={charConfig.name} className="w-full h-full object-cover mix-blend-screen" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center opacity-30">
                                    {charConfig.icon}
                                </div>
                            )}
                            {/* Glitch Overlay on Portrait */}
                            {currentLine.isGlitchy && <div className="absolute inset-0 bg-red-500/20 mix-blend-color-burn animate-ping"></div>}
                        </div>

                        {/* Dialogue Text */}
                        <div className="flex-1 relative z-10">
                            <p className="text-xl md:text-3xl font-bold leading-relaxed text-white tracking-tight" style={{ textShadow: '2px 2px 0 #000' }}>
                                {isTyping ? (
                                    <TypewriterText text={currentLine.text} onComplete={() => setIsTyping(false)} />
                                ) : (
                                    <span>{currentLine.text}</span>
                                )}
                            </p>
                        </div>

                        {/* Next Indicator */}
                        {!isTyping && (
                            <motion.div
                                animate={{ y: [0, 5, 0] }}
                                transition={{ repeat: Infinity, duration: 1 }}
                                className={`absolute bottom-4 right-6 ${charConfig.color} font-black text-2xl`}
                            >
                                ▼
                            </motion.div>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
