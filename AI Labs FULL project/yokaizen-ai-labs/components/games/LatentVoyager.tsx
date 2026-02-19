
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { getRelatedConcepts } from '../../services/geminiService';
import { Rocket, Star, Zap, Network, ArrowRight } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Language } from '../../types';

interface LatentVoyagerProps {
    onComplete: (score: number) => void;
    t: (key: string) => string;
    language?: Language;
}

interface StarNode {
    id: string;
    x: number;
    y: number;
    z: number;
    word: string;
    type: 'START' | 'GOAL' | 'NODE' | 'DISTRACTOR';
    connected: boolean;
}

export const LatentVoyager: React.FC<LatentVoyagerProps> = ({ onComplete, t }) => {
    const [phase, setPhase] = useState<'LOADING' | 'PLAYING' | 'WIN'>('LOADING');
    const [stars, setStars] = useState<StarNode[]>([]);
    const [path, setPath] = useState<string[]>([]); // Array of IDs
    const [camera, setCamera] = useState({ x: 0, y: 0, z: 0 });
    const [targetWord, setTargetWord] = useState('');
    const [startWord, setStartWord] = useState('');

    useEffect(() => {
        const init = async () => {
            const sWord = t('voyager.concept_start');
            const eWord = t('voyager.concept_end');
            setStartWord(sWord);
            setTargetWord(eWord);

            // Generate semantic bridge
            // Mocking the vector space generation for reliability in this demo
            const bridge1 = await getRelatedConcepts(sWord);
            const bridge2 = await getRelatedConcepts(eWord);

            const nodes: StarNode[] = [];

            // Helper to rand
            const r = (scale: number) => (Math.random() - 0.5) * scale;

            // Start Node
            nodes.push({ id: 'start', x: 0, y: 0, z: 0, word: sWord, type: 'START', connected: true });

            // Distractors
            [...bridge1.unrelated, ...bridge2.unrelated].forEach((w, i) => {
                nodes.push({ id: `bad-${i}`, x: r(400), y: r(400), z: r(400), word: w, type: 'DISTRACTOR', connected: false });
            });

            // Correct Path Nodes (Simplified logic: just random placement but marked as nodes)
            const goodWords = ["Water", "Depth", "Abyss", "Void", "Stars"];
            let prevPos = { x: 0, y: 0, z: 0 };

            goodWords.forEach((w, i) => {
                const x = prevPos.x + (Math.random() * 100 - 20); // Drift towards +X
                const y = prevPos.y + r(100);
                const z = prevPos.z + r(100);
                nodes.push({ id: `node-${i}`, x, y, z, word: w, type: 'NODE', connected: false });
                prevPos = { x, y, z };
            });

            // Goal
            nodes.push({ id: 'goal', x: prevPos.x + 100, y: prevPos.y, z: prevPos.z, word: eWord, type: 'GOAL', connected: false });

            setStars(nodes);
            setPath(['start']);
            setPhase('PLAYING');
        };
        init();
    }, [t]);

    const handleStarClick = (star: StarNode) => {
        if (path.includes(star.id)) return;

        const lastId = path[path.length - 1];
        const lastStar = stars.find(s => s.id === lastId);

        if (!lastStar) return;

        // Distance check
        const dist = Math.sqrt(Math.pow(star.x - lastStar.x, 2) + Math.pow(star.y - lastStar.y, 2) + Math.pow(star.z - lastStar.z, 2));

        if (dist > 250) {
            audio.playError(); // Too far
            return;
        }

        setPath([...path, star.id]);
        setStars(prev => prev.map(s => s.id === star.id ? { ...s, connected: true } : s));

        // Move camera to new star
        setCamera({ x: star.x, y: star.y, z: star.z });
        audio.playSuccess();

        if (star.type === 'GOAL') {
            setPhase('WIN');
            setTimeout(() => onComplete(100), 2000);
        }
    };

    return (
        <div className="h-full bg-black relative overflow-hidden font-sans select-none perspective-[800px]">
            {/* Background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1e1b4b_0%,_#000_100%)]"></div>
            <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] animate-pulse-slow"></div>

            {/* HUD */}
            <div className="absolute top-4 left-4 z-20">
                <div className="text-xs text-indigo-400 font-bold uppercase tracking-widest mb-1">{t('voyager.mission')}</div>
                <div className="text-white font-bold text-xl flex items-center">
                    {startWord} <ArrowRight size={16} className="mx-2 text-indigo-500" /> {targetWord}
                </div>
                <p className="text-[10px] text-gray-500 mt-2 max-w-[200px]">{t('voyager.desc')}</p>
            </div>

            {/* 3D Scene */}
            <div className="absolute inset-0 flex items-center justify-center transform-style-3d transition-transform duration-1000 ease-in-out"
                style={{ transform: `rotateX(10deg) rotateY(20deg) translate3d(${-camera.x}px, ${-camera.y}px, ${-camera.z}px)` }}>

                {/* Constellation Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
                    {path.map((starId, i) => {
                        if (i === 0) return null;
                        const prev = stars.find(s => s.id === path[i - 1]);
                        const curr = stars.find(s => s.id === starId);
                        if (!prev || !curr) return null;
                        // Note: Basic SVG line drawing doesn't truly work in 3D CSS space without projection math.
                        // For a true 3D line in CSS-only engines, we use thin divs rotated in 3D space.
                        // Simplified implementation: We'll skip SVG lines and strictly use the 3D transformed nodes.
                        // A proper implementation would require a Line component that calculates rotation/length between two 3D points.
                        // Let's implement that visual approximation:
                        const dx = curr.x - prev.x;
                        const dy = curr.y - prev.y;
                        const dz = curr.z - prev.z;
                        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);

                        // Simple "beam" between points? Hard in pure CSS without complex math. 
                        // Fallback: Just highlight the nodes strongly.
                        return null;
                    })}
                </svg>

                {/* Stars */}
                {stars.map(star => {
                    const isPath = path.includes(star.id);
                    const isNext = !isPath && (() => {
                        const last = stars.find(s => s.id === path[path.length - 1]);
                        if (!last) return false;
                        const d = Math.sqrt(Math.pow(star.x - last.x, 2) + Math.pow(star.y - last.y, 2) + Math.pow(star.z - last.z, 2));
                        return d < 250;
                    })();

                    // Connection beam to previous if in path
                    let beam = null;
                    if (isPath) {
                        const prevIndex = path.indexOf(star.id) - 1;
                        if (prevIndex >= 0) {
                            const prev = stars.find(s => s.id === path[prevIndex]);
                            if (prev) {
                                // Simplified: Draw a glowing localized line/beam effect?
                            }
                        }
                    }

                    return (
                        <div
                            key={star.id}
                            className={`absolute flex flex-col items-center justify-center transition-all duration-500 transform-style-3d cursor-pointer group
                            ${isPath ? 'opacity-100 z-10' : isNext ? 'opacity-80 z-0' : 'opacity-10 blur-[2px] scale-50'}
                        `}
                            style={{ transform: `translate3d(${star.x}px, ${star.y}px, ${star.z}px)` }}
                            onClick={() => handleStarClick(star)}
                        >
                            {/* Star Core */}
                            <div className={`relative w-4 h-4 rounded-full transition-all duration-300 group-hover:scale-150
                            ${star.type === 'GOAL' ? 'bg-yellow-400 text-yellow-400 shadow-[0_0_20px_yellow]' :
                                    star.type === 'START' ? 'bg-green-400 text-green-400 shadow-[0_0_20px_lime]' :
                                        isPath ? 'bg-cyan-400 text-cyan-400 shadow-[0_0_15px_cyan]' : 'bg-white text-white shadow-[0_0_5px_white]'}
                        `}>
                                {/* Orbital Ring */}
                                {isNext && <div className="absolute inset-0 -m-2 border border-dashed border-white/30 rounded-full animate-spin-slow"></div>}
                                {(star.type === 'START' || star.type === 'GOAL') && <div className="absolute inset-0 -m-4 border border-current opacity-20 rounded-full animate-ping"></div>}
                            </div>

                            {/* Label Badge */}
                            <div className={`mt-4 px-3 py-1 rounded-full backdrop-blur-md whitespace-nowrap transition-all duration-300 border
                            ${isPath ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50 scale-110' :
                                    isNext ? 'bg-indigo-950/60 text-white border-white/20' :
                                        'bg-black/50 text-gray-500 border-transparent group-hover:text-white group-hover:border-white/30'}
                        `}>
                                <span className="text-[10px] font-bold tracking-wider">{star.word}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {phase === 'WIN' && (
                <div className="absolute inset-0 z-50 bg-indigo-950/90 flex flex-col items-center justify-center animate-in zoom-in">
                    <Network size={64} className="text-white mb-6" />
                    <h1 className="text-4xl font-black text-white tracking-widest mb-2">{t('voyager.link_established')}</h1>
                    <p className="text-indigo-200">{t('voyager.bridge_completed')}</p>
                </div>
            )}
        </div>
    );
};
