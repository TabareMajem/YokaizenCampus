
import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { generateImage } from '../../services/geminiService';
import { Image as ImageIcon, Sparkles, X, Check, Palette } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Scanlines } from '../ui/Visuals';
import { Language } from '../../types';

interface StyleAnchorProps {
    onComplete: (score: number) => void;
    t: (key: string) => string;
    language?: Language;
}

const STYLES = [
    { id: 'cyberpunk', name: 'Cyberpunk', prompt: 'neon lights, rain, high tech, low life, highly detailed, 8k, unreal engine 5' },
    { id: 'noir', name: 'Film Noir', prompt: 'black and white, high contrast, shadows, detective, vintage, grainy, dramatic lighting' },
    { id: 'watercolor', name: 'Watercolor', prompt: 'soft pastel colors, paper texture, artistic, dreamy, flowing strokes' },
    { id: 'pixel', name: 'Pixel Art', prompt: '16-bit, retro game style, blocky, vibrant, sprite art' }
];

// --- VISUAL COMPONENTS ---
const GalleryCarousel = ({
    images,
    currentIndex,
    onDecision
}: {
    images: { url: string, score: number }[],
    currentIndex: number,
    onDecision: (keep: boolean) => void
}) => {
    return (
        <div className="relative w-full max-w-lg h-[500px] flex items-center justify-center perspective-[1000px]">
            {/* 3D Stack Effect */}
            {images.map((img, i) => {
                const offset = i - currentIndex;
                if (Math.abs(offset) > 2) return null; // Only render nearby cards

                let transform = `translateZ(${offset * -100}px) translateX(${offset * 40}px) rotateY(${offset * -5}deg)`;
                let opacity = 1 - Math.abs(offset) * 0.3;
                let zIndex = 10 - Math.abs(offset);

                if (i < currentIndex) {
                    // Discarded/Kept pile logic visual (off screen)
                    transform = `translateX(${offset * 100 - 200}px) rotateZ(-20deg) scale(0.8)`;
                    opacity = 0;
                }

                return (
                    <div
                        key={i}
                        className="absolute w-64 h-80 md:w-80 md:h-[420px] bg-black rounded-xl border-4 border-gray-800 shadow-2xl transition-all duration-500 ease-out overflow-hidden"
                        style={{
                            transform,
                            opacity,
                            zIndex,
                            filter: i === currentIndex ? 'none' : 'brightness(0.4) blur(1px)'
                        }}
                    >
                        <img src={img.url} className="w-full h-full object-cover" alt={`Art ${i}`} />

                        {/* Overlay for active card */}
                        {i === currentIndex && (
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none">
                                <div className="absolute bottom-4 left-4 right-4">
                                    <div className="text-[10px] text-gray-400 font-mono uppercase tracking-widest mb-1">{t('games.styleanchor.curation_needed')}</div>
                                    <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-500 animate-[loading_4s_linear]" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Status Stamp if decided */}
                        {i < currentIndex && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                {/* This would need state from parent to know approval status, skipping for simpler visual */}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Controls - Floating below */}
            <div className="absolute -bottom-16 w-full flex justify-between px-12 z-20">
                <button
                    onClick={() => onDecision(false)}
                    className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all hover:scale-110 group shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                >
                    <X size={32} className="group-hover:rotate-90 transition-transform" />
                </button>

                <div className="flex flex-col items-center justify-end pb-2">
                    <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">{t('games.styleanchor.swipe_click')}</div>
                    <div className="text-[10px] text-gray-700 font-mono">{t('games.styleanchor.img')}{currentIndex + 1} / {images.length}</div>
                </div>

                <button
                    onClick={() => onDecision(true)}
                    className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500 text-green-500 flex items-center justify-center hover:bg-green-500 hover:text-white transition-all hover:scale-110 group shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                >
                    <Check size={32} className="group-hover:scale-125 transition-transform" />
                </button>
            </div>
        </div>
    );
};

export const StyleAnchor: React.FC<StyleAnchorProps> = ({ onComplete, t }) => {
    const [gameState, setGameState] = useState<'BRIEFING' | 'GENERATING' | 'CURATING' | 'RESULT'>('BRIEFING');
    const [targetStyle, setTargetStyle] = useState(STYLES[0]);
    const [generatedImages, setGeneratedImages] = useState<{ url: string, score: number }[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selections, setSelections] = useState<boolean[]>([]); // true = keep, false = reject
    const [score, setScore] = useState(0);

    // Simulation of "Generation" phase
    useEffect(() => {
        if (gameState === 'GENERATING') {
            const gen = async () => {
                // We simulate generating a batch of images
                // Some match the style, some are "traps"
                const newImages = [];
                for (let i = 0; i < 5; i++) {
                    const isGood = Math.random() > 0.4;
                    const prompt = isGood
                        ? `A portrait of a robot, ${targetStyle.prompt}`
                        : `A portrait of a robot, ${STYLES.find(s => s.id !== targetStyle.id)?.prompt}`; // Trap style

                    // Mock or Real generation
                    const url = await generateImage(prompt);
                    newImages.push({ url, score: isGood ? 20 : -10 });
                }
                setGeneratedImages(newImages);
                setSelections(new Array(5).fill(false));
                setGameState('CURATING');
            };
            gen();
        }
    }, [gameState, targetStyle]);

    const handleBriefingStart = () => {
        const randomStyle = STYLES[Math.floor(Math.random() * STYLES.length)];
        setTargetStyle(randomStyle);
        setGameState('GENERATING');
        audio.playClick();
    };

    const handleDecision = (keep: boolean) => {
        const newSelections = [...selections];
        newSelections[currentIndex] = keep;
        setSelections(newSelections);

        if (keep) audio.playSuccess();
        else audio.playClick();

        if (currentIndex < generatedImages.length - 1) {
            setCurrentIndex(c => c + 1);
        } else {
            // Calculate Score
            let totalScore = 0;
            newSelections.forEach((kept, i) => {
                const imgScore = generatedImages[i].score;
                // If we kept a good image: +20
                // If we kept a bad image: -10
                // If we rejected a good image: 0 (Missed opportunity)
                // If we rejected a bad image: +10 (Good eye)
                if (kept) totalScore += imgScore;
                else if (imgScore < 0) totalScore += 10;
            });
            setScore(Math.max(0, totalScore));
            setGameState('RESULT');
        }
    };

    return (
        <div className="h-full flex flex-col bg-gray-950 font-sans relative overflow-hidden select-none">
            <Scanlines />

            {/* Header - Added pl-16 for back button clearance */}
            <div className="p-4 pl-16 bg-black/80 border-b border-purple-500/30 flex justify-between items-center z-10 backdrop-blur-md">
                <div>
                    <h2 className="text-xl font-black text-white italic tracking-tighter">{t('style.title')}</h2>
                    <p className="text-[10px] text-gray-400">{t('style.subtitle')}</p>
                </div>
                {gameState === 'CURATING' && (
                    <div className="text-right">
                        <div className="text-[10px] text-gray-500 uppercase font-bold">{t('style.target')}</div>
                        <div className="text-purple-400 font-bold text-sm bg-purple-900/20 px-2 rounded border border-purple-500/50">{targetStyle.name}</div>
                    </div>
                )}
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="flex-1 relative flex items-center justify-center p-6">



                {gameState === 'BRIEFING' && (
                    <div className="text-center space-y-8 animate-in zoom-in max-w-sm relative z-10">
                        <div className="relative">
                            <div className="absolute inset-0 bg-purple-500 blur-[80px] opacity-20 rounded-full animate-pulse"></div>
                            <div className="w-40 h-40 bg-black rounded-full flex items-center justify-center mx-auto border-4 border-purple-500 shadow-[0_0_50px_rgba(168,85,247,0.4)] relative z-10">
                                <Palette size={64} className="text-purple-400" />
                            </div>
                        </div>

                        <div className="bg-black/80 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-2xl">
                            <h3 className="text-3xl font-black text-white mb-4 uppercase italic">{t('games.styleanchor.style_audit')}</h3>
                            <p className="text-sm text-gray-300 leading-relaxed">
                                {t('games.styleanchor.the_generative_model')}<span className="text-red-400 font-bold">{t('games.styleanchor.drifting')}</span>.
                                <br /><br />
                                {t('games.styleanchor.review_the_output_st')}<br />
                                {t('games.styleanchor.maintain_the_aesthet')}</p>
                        </div>

                        <Button size="lg" variant="primary" onClick={handleBriefingStart} className="w-full text-lg py-6 shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:shadow-[0_0_50px_rgba(168,85,247,0.6)]">
                            {t('style.start')}
                        </Button>
                    </div>
                )}

                {gameState === 'GENERATING' && (
                    <div className="text-center relative">
                        <div className="absolute inset-0 bg-purple-500/20 blur-[100px] animate-pulse"></div>
                        <Sparkles size={80} className="text-purple-400 animate-spin mb-6 mx-auto relative z-10" />
                        <h3 className="text-3xl font-black text-white animate-pulse tracking-tight relative z-10">{t('style.generating')}</h3>
                        <div className="mt-4 flex flex-col space-y-1 relative z-10">
                            <span className="text-xs text-purple-300 font-mono animate-pulse delay-75">{t('games.styleanchor.gt_diffusing')}</span>
                            <span className="text-xs text-purple-400 font-mono animate-pulse delay-150">{t('games.styleanchor.gt_applying_lora')}</span>
                            <span className="text-xs text-purple-500 font-mono animate-pulse delay-300">{t('games.styleanchor.gt_checking_latent_s')}</span>
                        </div>
                    </div>
                )}

                {gameState === 'CURATING' && generatedImages.length > 0 && (
                    <div className="w-full flex justify-center animate-in fade-in duration-500">
                        <GalleryCarousel
                            images={generatedImages}
                            currentIndex={currentIndex}
                            onDecision={handleDecision}
                        />
                    </div>
                )}

                {gameState === 'RESULT' && (
                    <div className="text-center space-y-6 animate-in zoom-in max-w-sm bg-black/90 p-8 rounded-3xl border-2 border-purple-500/50 shadow-[0_0_100px_rgba(168,85,247,0.3)] backdrop-blur-xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10"></div>

                        <div className="text-xs font-bold text-purple-400 uppercase tracking-[0.2em] mb-2">{t('style.satisfaction')}</div>

                        <div className="relative inline-block">
                            <div className={`text-8xl font-black ${score >= 80 ? 'text-green-400' : 'text-yellow-400'} drop-shadow-2xl`}>
                                {score}%
                            </div>
                            {score >= 80 && <Sparkles className="absolute -top-4 -right-8 text-yellow-400 animate-bounce" size={32} />}
                        </div>

                        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent my-4"></div>

                        <p className="text-sm text-gray-300 italic font-medium">
                            "{score >= 80 ? "Excellent eye. The collection is coherent." : "Inconsistent style detected. The client is confused."}"
                        </p>
                        <Button fullWidth variant="primary" onClick={() => onComplete(score)} className="mt-4">
                            {t('style.complete')}
                        </Button>
                    </div>
                )}

            </div>
        </div>
    );
};
