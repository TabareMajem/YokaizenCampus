
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useToast } from './contexts/ToastContext';
import { useFocusMode } from './hooks/useFocusMode';
import { GAMES, GAME_TUTORIALS, GAME_DEBRIEFS, LEARN_PATH, MOCK_SQUADS, TOOLS, SKILL_TREE } from './constants';
import { TRANSLATIONS } from './translations';
import { audio } from './services/audioService';
import { useDialogue } from './contexts/DialogueContext';
import { squadsService } from './services/squadsService';
import { AppTab, GameDef, GameType, Difficulty, Language, CreatorGame, Squad, UserStats } from './types';
import { AuthScreen } from './components/auth/AuthScreen';
import { GameCover } from './components/ui/GameCover';
import { Button } from './components/ui/Button';
import { PaywallModal } from './components/ui/PaywallModal';
import { LabScreen } from './components/LabScreen';
import { AdminPanel } from './components/AdminPanel';
import { SquadManager } from './components/SquadManager';
import { LearnPath } from './components/LearnPath';
import { SkillRadar } from './components/SkillRadar';
import { SkillTree } from './components/SkillTree';
import { Leaderboard } from './components/Leaderboard';
import { GameTutorial } from './components/ui/GameTutorial';
import { GameDebrief } from './components/ui/GameDebrief';
import { Logo } from './components/ui/Logo';
import { Scanlines } from './components/ui/Visuals';
import { Modal } from './components/ui/Modal';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Preloader } from './components/ui/Preloader';
import { AIGeneratedGame } from './components/games/AIGeneratedGame';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { ValueProposition } from './components/onboarding/ValueProposition';
import { EpicOnboarding } from './components/onboarding/EpicOnboarding';
import { ShareCard } from './components/social/ShareCard';
import { StreakRewards } from './components/streaks/StreakRewards';
import { badgeService } from './services/badgeService';
import { BadgeNotification } from './components/ui/BadgeNotification';
import { SquadOnboarding } from './components/onboarding/SquadOnboarding';
import {
    Layout, BookOpen, FlaskConical, Trophy, User, Settings,
    Lock, ArrowLeft, Globe, Volume2, Smartphone, ChevronRight, Zap, Shield, Star, Clock, Play, Brain, Activity, Box, Award, Cpu
} from 'lucide-react';

// Import all games
import { PromptArchitect } from './components/games/PromptArchitect';
import { RedTeam } from './components/games/RedTeam';
import { NeonDrift } from './components/games/NeonDrift';
import { PlanariumHeist } from './components/games/PlanariumHeist';
import { BanditBistro } from './components/games/BanditBistro';
import { StyleAnchor } from './components/games/StyleAnchor';
import { GlitchwaveAnalyst } from './components/games/GlitchwaveAnalyst';
import { OODSentinel } from './components/games/OODSentinel';
import { LatencyLab } from './components/games/LatencyLab';
import { BiasBingo } from './components/games/BiasBingo';
import { GradientSki } from './components/games/GradientSki';
import { LatentVoyager } from './components/games/LatentVoyager';
import { TokenTsunami } from './components/games/TokenTsunami';
import { ProteinPoker } from './components/games/ProteinPoker';
import { ClimateTimeMachine } from './components/games/ClimateTimeMachine';
import { WallStreetWar } from './components/games/WallStreetWar';
import { SmartCityMayor } from './components/games/SmartCityMayor';
import { SpaceMission } from './components/games/SpaceMission';

// Viral Mini Games (Funnel bypasses)
import { ViralNeuralHack } from './components/viral/ViralNeuralHack';
import { ViralLatencyTunnel } from './components/viral/ViralLatencyTunnel';
import { ViralChaosDefense } from './components/viral/ViralChaosDefense';
import { ViralPromptInjection } from './components/viral/ViralPromptInjection';
import { Canvas } from '@react-three/fiber';
import { Sparkles as DreiSparkles } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { DefenseStrategist } from './components/games/DefenseStrategist';
import { PersonaSwitchboard } from './components/games/PersonaSwitchboard';
import { DeepfakeDetective } from './components/games/DeepfakeDetective';
import { CausalConservatory } from './components/games/CausalConservatory';
import { DataWhisperer } from './components/games/DataWhisperer';
import { RewardFixer } from './components/games/RewardFixer';
import { NeuralNoir } from './components/games/NeuralNoir';
import { PhantomLatency } from './components/games/PhantomLatency';
import { ChronoQuest } from './components/games/ChronoQuest';
import { VampireInvitation } from './components/games/VampireInvitation';
import { MantellaWorld } from './components/games/MantellaWorld';
import { CyberRain } from './components/games/CyberRain';
import { DreamSim } from './components/games/DreamSim';
import { BioGuard } from './components/games/BioGuard';
import { NexusNegotiation } from './components/games/NexusNegotiation';
import { Xenoflora } from './components/games/Xenoflora';
import { NeonSyndicate } from './components/games/NeonSyndicate';
import { EntropySandbox } from './components/games/EntropySandbox';
import { CognitiveCity } from './components/games/CognitiveCity';
import { PromptDrift } from './components/games/PromptDrift';
import { Doppelganger } from './components/games/Doppelganger';
import { VoightKampffProtocol } from './components/games/VoightKampffProtocol';
import { ArrakisSands } from './components/games/ArrakisSands';
import { LazarusVector } from './components/games/LazarusVector';
import { VeritasFalls } from './components/games/VeritasFalls';
import { AethelredGambit } from './components/games/AethelredGambit';
import { QuantumQubit } from './components/games/QuantumQubit';
import { NeuralPrism } from './components/games/NeuralPrism';
import { SynapseSurge } from './components/games/SynapseSurge';
import { DeepfakeDeflector } from './components/games/DeepfakeDeflector';
import { OracleIndex } from './components/games/OracleIndex';
import { ChaosEngineering } from './components/games/ChaosEngineering';
import { TuringTessellation } from './components/games/TuringTessellation';
import { DataHeist } from './components/games/DataHeist';
import { PromptSculptor } from './components/games/PromptSculptor';
import { SingularityCore } from './components/games/SingularityCore';

// Assets to preload
const PRELOAD_ASSETS = [
    'https://grainy-gradients.vercel.app/noise.svg',
    // Add other critical game assets here
];

import html2canvas from 'html2canvas';

export const App: React.FC = () => {
    const { user, isAuthenticated, updateUser } = useAuth();
    const { focusMode, setFocusMode } = useFocusMode();
    const { queueDialogue } = useDialogue();
    const [isPreloading, setIsPreloading] = useState(false);
    const idCardRef = useRef<HTMLDivElement>(null);
    const [isGeneratingCard, setIsGeneratingCard] = useState(false);
    const [activeTab, setActiveTab] = useState<AppTab>(AppTab.HOME);
    const [activeGame, setActiveGame] = useState<GameDef | null>(null);
    const [activeGeneratedGame, setActiveGeneratedGame] = useState<any | null>(null);
    const [showPaywall, setShowPaywall] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);
    const [showDebrief, setShowDebrief] = useState(false);
    const [gameDifficulty, setGameDifficulty] = useState<Difficulty>('Pro');
    const [showStreakModal, setShowStreakModal] = useState(false);
    const [showSkillTree, setShowSkillTree] = useState(false);

    // Toast State (Replaced by Context)
    const { showToast } = useToast();

    // New UX States
    const [showShareCard, setShowShareCard] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showEpicOnboarding, setShowEpicOnboarding] = useState(false);
    const [lastGameResult, setLastGameResult] = useState<{ gameName: string; score: number; xp: number } | null>(null);

    // Initial Epic Onboarding Check
    useEffect(() => {
        if (!localStorage.getItem('ai_labs_epic_onboarding_done')) {
            setShowEpicOnboarding(true);
        }
    }, []);

    const handleExportIDCard = async () => {
        if (!idCardRef.current || !user) return;
        setIsGeneratingCard(true);
        showToast("Synthesizing Neural ID Card...", "success");
        try {
            const canvas = await html2canvas(idCardRef.current, {
                backgroundColor: '#000000',
                scale: 2,
                useCORS: true,
                logging: false,
            });
            const image = canvas.toDataURL("image/png");
            const link = document.createElement('a');
            link.href = image;
            link.download = `Neural_ID_${user.name.replace(/\s+/g, '_')}.png`;
            link.click();
            showToast("Neural ID Exported. Display it with pride.", "success");
            audio.playSuccess();
        } catch (e) {
            console.error(e);
            showToast("Export failed. Neural link unstable.", "error");
            audio.playError();
        } finally {
            setIsGeneratingCard(false);
        }
    };

    // Squad State
    const [squads, setSquads] = useState<Squad[]>([]);
    const [mobileLeaderboardView, setMobileLeaderboardView] = useState<'RANKING' | 'SQUAD'>('RANKING');

    const t = (key: string, replace?: any) => {
        const lang = user?.language || 'EN';
        let text = TRANSLATIONS[lang]?.[key] || TRANSLATIONS['EN']?.[key] || key;
        if (replace) {
            Object.entries(replace).forEach(([k, v]) => {
                text = text.replace(`{${k}}`, String(v));
            });
        }
        return text;
    };

    // Login Streak Logic
    useEffect(() => {
        if (user) {
            const lastLogin = new Date(user.lastLoginDate);
            const today = new Date();
            const diffTime = Math.abs(today.getTime() - lastLogin.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) { // Consecutive day
                const newStreak = user.streak + 1;
                updateUser({ ...user, streak: newStreak, lastLoginDate: today.toISOString(), credits: user.credits + 50 }); // Reward
                setShowStreakModal(true);
            } else if (diffDays > 1) { // Missed streak
                updateUser({ ...user, streak: 1, lastLoginDate: today.toISOString() });
            }
        }
    }, [user?.id]); // Only check on user load

    // Stripe Payment Handling
    useEffect(() => {
        const query = new URLSearchParams(window.location.search);

        if (query.get('success') === 'true') {
            audio.playSuccess();
            showToast("Subscription Activated! Welcome to the elite.", 'success');

            // Refresh user data
            if (isAuthenticated) { // Fixed: using isAuthenticated from useAuth hook
                // Force reload or re-fetch user profile if possible, 
                // but `useAuth` handles session checks on mount.
                // We can just clear the URL.
            }
            window.history.replaceState({}, document.title, window.location.pathname);
            setShowPaywall(false);
        }

        if (query.get('canceled') === 'true') {
            showToast("Payment cancelled.", 'info');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [isAuthenticated]);

    // Fetch Squads on Mount & Check Onboarding
    useEffect(() => {
        const loadSquads = async () => {
            const data = await squadsService.getAllSquads();
            setSquads(data);

            // Squad Onboarding Check
            // If user is level > 2, has no squad, and hasn't dismissed it this session
            if (user && !user.squadId && user.level >= 2 && !sessionStorage.getItem('squad_onboarding_dismissed')) {
                // Small delay to not overwhelm
                setTimeout(() => setShowOnboarding(true), 2000);
            }
        };
        loadSquads();
    }, [user?.level, user?.squadId]);

    const handleUnlockSkill = (nodeId: string, cost: number) => {
        if (user && user.skillPoints >= cost) {
            updateUser({
                ...user,
                skillPoints: user.skillPoints - cost,
                unlockedSkills: [...user.unlockedSkills, nodeId]
            });
        }
    };

    // Find next locked tool
    const nextLockedTool = TOOLS.find(tool => user && !user.unlockedTools.includes(tool.id) && (!tool.requiredBadgeId || !user.inventory.some(i => i.id === tool.requiredBadgeId)));

    const handleGameLaunch = (game: GameDef) => {
        if (game.isPremium && !user?.isPro) {
            setShowPaywall(true);
            return;
        }

        // Feature: Phase 9 Narrative Interceptor
        const characters = ['ATHENA', 'BYTE', 'SYNTAX'] as const;
        const assignedChar = characters[Math.floor(Math.random() * characters.length)];
        const gameName = t(`game.${game.type.toLowerCase()}.title`) || game.type;

        queueDialogue([
            {
                id: `mission-brief-${game.id}-${Date.now()}`,
                character: assignedChar,
                text: `Initializing mission parameter: [${gameName}]. Ensure cognitive readiness.`
            }
        ]);

        setActiveGame(game);
        setGameDifficulty(game.difficulty);
        setShowTutorial(true);
    };

    const handleTabSwitch = (tab: AppTab) => {
        // Feature: 2% chance of Algorithm glitch
        if (Math.random() < 0.02) {
            audio.playGlitch();
            queueDialogue([
                { id: `alg-${Date.now()}-1`, character: 'SYSTEM', text: "ROUTING ERROR... THE ALGORITHM DEMANDS YOUR UNDIVIDED ATTENTION.", isGlitchy: true },
                { id: `alg-${Date.now()}-2`, character: 'BYTE', text: "Whoa! Purging rogue thread! Sorry about that, flesh-brain." }
            ]);
        }
        setActiveTab(tab);
    };

    const handleTutorialStart = (diff: Difficulty) => {
        setGameDifficulty(diff);
        setShowTutorial(false);
    };


    const [newUnlockedBadge, setNewUnlockedBadge] = useState<any | null>(null);

    const handleGameComplete = (score: number) => {
        const xpGain = Math.floor(score * (activeGame?.xpReward || 100) / 100);

        if (user) {
            const updatedUser = {
                ...user,
                xp: user.xp + xpGain,
                gamesPlayed: user.gamesPlayed + 1,
                credits: user.credits + Math.floor(score / 10), // Credit reward
                gameScores: {
                    ...user.gameScores,
                    [activeGame?.id || 'unknown']: Math.max(user.gameScores[activeGame?.id || ''] || 0, score)
                }
            };

            // Check for new badges
            // We need to import badgeService (added to imports below)
            const newBadges = badgeService.checkBadges(updatedUser);
            if (newBadges.length > 0) {
                // Award badges
                const badgeIds = newBadges.map(b => b.id);
                updatedUser.badges = [...(updatedUser.badges || []), ...badgeIds];
                updatedUser.inventory = [
                    ...updatedUser.inventory,
                    ...newBadges.map(b => ({ id: b.id, name: b.name, type: 'BADGE' as const, icon: b.icon, rarity: b.rarity }))
                ];

                // Show notification for the first one (queueing would be better but simple for now)
                setNewUnlockedBadge(newBadges[0]);
            }

            updateUser(updatedUser);
        }

        // New: Set result for Share Card
        setLastGameResult({
            gameName: t(`game.${activeGame?.id}`) || activeGame?.name || 'Unknown Game',
            score,
            xp: xpGain
        });

        // Show Share Card first, fallback to Debrief if closed
        setShowShareCard(true);
        // setShowDebrief(true); // Now triggered after share card close
    };


    const handleCreateSquad = async (name: string, avatar: string) => {
        if (!user) return;

        try {
            const newSquad = await squadsService.createSquad(name, avatar);
            if (newSquad) {
                setSquads(prev => [...prev, newSquad]);
                updateUser({ ...user, squadId: newSquad.id });
                showToast(`Squad "${name}" established!`, 'success');
            }
        } catch (e) {
            showToast("Failed to deploy squad. Network error.", 'error');
        }
    };

    const handleJoinSquad = async (id: string) => {
        if (!user) return;

        try {
            const success = await squadsService.joinSquad(id);
            if (success) {
                // Optimistic update or refetch? Refetch is safer for members list.
                const updatedSquads = await squadsService.getAllSquads();
                setSquads(updatedSquads);
                updateUser({ ...user, squadId: id });
                showToast("Welcome to the unit, operative.", 'success');
            } else {
                showToast("Failed to join squad.", 'error');
            }
        } catch (e) {
            showToast("Connection failed.", 'error');
        }
    };

    const renderGame = () => {
        if (!activeGame || !user) return null;

        // Basic Props
        const baseProps = { onComplete: handleGameComplete, difficulty: gameDifficulty, t, language: user.language };

        // Props for games with Meta-Progression
        const progressionProps = { ...baseProps, user, onUpdateUser: updateUser };

        return (
            <ErrorBoundary>
                {(() => {
                    switch (activeGame.type) {
                        case GameType.NEON_DRIFT: return <NeonDrift {...progressionProps} />;
                        case GameType.SPACE_MISSION: return <SpaceMission {...progressionProps} />;

                        case GameType.PROMPT_ARCHITECT: return <PromptArchitect {...baseProps} />;
                        case GameType.RED_TEAM: return <RedTeam {...baseProps} />;
                        case GameType.PLANARIUM_HEIST: return <PlanariumHeist {...baseProps} />;
                        case GameType.BANDIT_BISTRO: return <BanditBistro {...baseProps} />;
                        case GameType.STYLE_ANCHOR: return <StyleAnchor {...baseProps} />;
                        case GameType.GLITCHWAVE: return <GlitchwaveAnalyst {...baseProps} />;
                        case GameType.OOD_SENTINEL: return <OODSentinel {...baseProps} />;
                        case GameType.LATENCY_LAB: return <LatencyLab {...baseProps} />;
                        case GameType.BIAS_BINGO: return <BiasBingo {...baseProps} />;
                        case GameType.GRADIENT_SKI: return <GradientSki {...baseProps} />;
                        case GameType.LATENT_VOYAGER: return <LatentVoyager {...baseProps} />;
                        case GameType.TOKEN_TSUNAMI: return <TokenTsunami {...baseProps} />;
                        case GameType.PROTEIN_POKER: return <ProteinPoker {...baseProps} />;
                        case GameType.CLIMATE_TIME_MACHINE: return <ClimateTimeMachine {...baseProps} />;
                        case GameType.WALL_STREET_WAR: return <WallStreetWar {...baseProps} />;
                        case GameType.SMART_CITY_MAYOR: return <SmartCityMayor {...baseProps} />;
                        case GameType.DEFENSE_STRATEGIST: return <DefenseStrategist {...baseProps} />;
                        case GameType.PERSONA_SWITCHBOARD: return <PersonaSwitchboard {...baseProps} />;
                        case GameType.DEEPFAKE_DETECTIVE: return <DeepfakeDetective {...baseProps} />;
                        case GameType.CAUSAL_CONSERVATORY: return <CausalConservatory {...baseProps} />;
                        case GameType.DATA_WHISPERER: return <DataWhisperer {...baseProps} />;
                        case GameType.REWARD_FIXER: return <RewardFixer {...baseProps} />;
                        case GameType.NEURAL_NOIR: return <NeuralNoir {...baseProps} />;
                        case GameType.PHANTOM_LATENCY: return <PhantomLatency {...baseProps} />;
                        case GameType.CHRONO_QUEST: return <ChronoQuest {...baseProps} />;
                        case GameType.VAMPIRE_INVITATION: return <VampireInvitation {...baseProps} />;
                        case GameType.MANTELLA: return <MantellaWorld {...baseProps} />;
                        case GameType.CYBER_RAIN: return <CyberRain {...baseProps} />;
                        case GameType.DREAM_SIM: return <DreamSim {...baseProps} />;
                        case GameType.BIO_GUARD: return <BioGuard {...baseProps} />;
                        case GameType.NEXUS_NEGOTIATION: return <NexusNegotiation {...baseProps} />;
                        case GameType.XENOFLORA: return <Xenoflora {...baseProps} />;
                        case GameType.NEON_SYNDICATE: return <NeonSyndicate {...baseProps} />;
                        case GameType.ENTROPY_SANDBOX: return <EntropySandbox {...baseProps} />;
                        case GameType.COGNITIVE_CITY: return <CognitiveCity {...baseProps} />;
                        case GameType.PROMPT_DRIFT: return <PromptDrift {...baseProps} />;
                        case GameType.DOPPELGANGER: return <Doppelganger {...baseProps} />;
                        case GameType.VOIGHT_KAMPFF: return <VoightKampffProtocol {...baseProps} />;
                        case GameType.ARRAKIS_SANDS: return <ArrakisSands {...baseProps} />;
                        case GameType.LAZARUS_VECTOR: return <LazarusVector {...baseProps} />;
                        case GameType.VERITAS_FALLS: return <VeritasFalls {...baseProps} />;
                        case GameType.AETHELRED_GAMBIT: return <AethelredGambit {...baseProps} />;
                        case GameType.QUANTUM_QUBIT: return <QuantumQubit {...baseProps} />;
                        case GameType.NEURAL_PRISM: return <NeuralPrism {...baseProps} />;
                        case GameType.SYNAPSE_SURGE: return <SynapseSurge {...baseProps} />;
                        case GameType.DEEPFAKE_DEFLECTOR: return <DeepfakeDeflector {...baseProps} />;
                        case GameType.ORACLE_INDEX: return <OracleIndex {...baseProps} />;
                        case GameType.CHAOS_ENGINEERING: return <ChaosEngineering {...baseProps} />;
                        case GameType.TURING_TESSELLATION: return <TuringTessellation {...baseProps} />;
                        case GameType.DATA_HEIST: return <DataHeist {...baseProps} />;
                        case GameType.PROMPT_SCULPTOR: return <PromptSculptor {...baseProps} />;
                        case GameType.SINGULARITY_CORE: return <SingularityCore {...baseProps} />;
                        default: return <div className="text-white p-8">Game not implemented yet.</div>;
                    }
                })()}
            </ErrorBoundary>
        );
    };

    if (isPreloading) {
        return <Preloader assets={PRELOAD_ASSETS} onComplete={() => setIsPreloading(false)} />;
    }

    // Viral Mini Games Unauthenticated Routing
    const path = window.location.pathname;
    const redirectToOnboarding = () => {
        // Redirct with a query parameter to automatically open the Auth Modal / Onboarding
        window.location.href = '/?viral=true';
    };

    if (path === '/play/neural-hack') {
        return <ViralNeuralHack onComplete={redirectToOnboarding} />;
    }
    if (path === '/play/latency-tunnel') {
        return <ViralLatencyTunnel onComplete={redirectToOnboarding} />;
    }
    if (path === '/play/chaos-defense') {
        return <ViralChaosDefense onComplete={redirectToOnboarding} />;
    }
    if (path === '/play/prompt-injection') {
        return <ViralPromptInjection onComplete={redirectToOnboarding} />;
    }

    if (showEpicOnboarding) {
        return (
            <div className="h-screen w-screen bg-black overflow-hidden relative z-50">
                <EpicOnboarding
                    onComplete={(lang) => {
                        localStorage.setItem('preferred_language', lang);
                        localStorage.setItem('ai_labs_epic_onboarding_done', 'true');
                        setShowEpicOnboarding(false);
                        if (user) updateUser({ ...user, language: lang });
                    }}
                />
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        return <AuthScreen />;
    }

    // --- GAME VIEW ---
    if (activeGame) {
        return (
            <div className="h-screen w-screen bg-black overflow-hidden relative">
                {showTutorial && (
                    <GameTutorial
                        content={GAME_TUTORIALS[activeGame.type]}
                        onStart={handleTutorialStart}
                        t={t}
                        defaultDifficulty={activeGame.difficulty}
                    />
                )}

                {showDebrief && (
                    <GameDebrief
                        content={GAME_DEBRIEFS[activeGame.type]}
                        onClose={() => { setShowDebrief(false); setActiveGame(null); }}
                        t={t}
                    />
                )}

                {!showTutorial && !showDebrief && (
                    <>
                        {/* Compact Global Back Button */}
                        <div className="absolute top-2 left-2 z-[60] safe-area-pt">
                            <Button
                                variant="ghost"
                                onClick={() => setActiveGame(null)}
                                className="bg-black/40 backdrop-blur-md border border-white/10 hover:bg-black/80 rounded-full w-10 h-10 p-0 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                            >
                                <ArrowLeft size={18} className="text-white" />
                            </Button>
                        </div>
                        {renderGame()}
                    </>
                )}
            </div>
        );
    }

    if (activeGeneratedGame) {
        return (
            <div className="h-screen w-screen bg-black overflow-hidden relative z-50">
                <AIGeneratedGame gameData={activeGeneratedGame} onClose={() => setActiveGeneratedGame(null)} />
            </div>
        );
    }

    // --- MAIN APP ---
    return (
        <div className="flex h-screen bg-[#050505] text-white overflow-hidden font-sans selection:bg-electric/30">
            <Scanlines />

            {/* GLOBAL TOAST - Handled by Context now */}

            <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} onSubscribe={() => { }} />

            <Modal isOpen={showStreakModal} onClose={() => setShowStreakModal(false)} type="REWARD" title={t('profile.streak')} icon={<Zap size={32} />}>
                <div className="text-center">
                    <div className="text-4xl font-black text-amber-400 mb-2">{user.streak} {t('ui.days')}</div>
                    <p className="text-gray-400 text-sm">Keep it up! +50 {t('profile.credits')} earned.</p>
                </div>
            </Modal>

            <BadgeNotification badge={newUnlockedBadge} onClose={() => setNewUnlockedBadge(null)} />

            <SquadOnboarding
                isOpen={showOnboarding}
                onClose={() => { setShowOnboarding(false); sessionStorage.setItem('squad_onboarding_dismissed', 'true'); }}
                squads={squads}
                onJoin={(id) => { handleJoinSquad(id); setShowOnboarding(false); }}
                t={t}
            />

            <Modal isOpen={showSkillTree} onClose={() => setShowSkillTree(false)} title="Neural Upgrades" icon={<Brain size={24} />}>
                <div className="h-[60vh] -mx-4 -mb-4">
                    <SkillTree
                        nodes={SKILL_TREE}
                        unlockedNodes={user.unlockedSkills}
                        skillPoints={user.skillPoints}
                        onUnlock={handleUnlockSkill}
                    />
                </div>
            </Modal>

            {/* Settings Modal */}
            <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title={t('settings.title')} icon={<Settings size={24} className="text-electric" />}>
                <div className="space-y-6">
                    {/* Language Settings */}
                    <div className="bg-black/40 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center text-sm font-bold text-gray-300"><Globe size={18} className="mr-3 text-cyan-400" /> {t('settings.language')}</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {['EN', 'ES', 'JP', 'KR', 'TH', 'CA'].map(lang => (
                                <button
                                    key={lang}
                                    onClick={() => updateUser({ ...user, language: lang as Language })}
                                    className={`text-xs font-bold px-4 py-2 rounded-lg border transition-all duration-300 ${user.language === lang ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.2)] scale-105' : 'bg-black/50 border-white/10 text-gray-500 hover:text-white hover:border-white/30 hover:bg-white/5'}`}
                                >
                                    {lang}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Hardware Settings */}
                    <div className="bg-black/40 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors space-y-4">
                        <div className="flex items-center justify-between group">
                            <div className="flex items-center text-sm font-bold text-gray-300 group-hover:text-white transition-colors"><Volume2 size={18} className="mr-3 text-purple-400" /> {t('settings.audio')}</div>
                            <button onClick={() => audio.toggleMute()} className="text-xs font-bold bg-white/5 px-4 py-2 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 hover:border-purple-500/50 transition-all active:scale-95">
                                {t('settings.toggle')}
                            </button>
                        </div>
                        <div className="h-px w-full bg-white/5"></div>
                        <div className="flex items-center justify-between group">
                            <div className="flex items-center text-sm font-bold text-gray-300 group-hover:text-white transition-colors"><Smartphone size={18} className="mr-3 text-amber-400" /> {t('settings.haptics')}</div>
                            <button onClick={() => audio.vibrate(50)} className="text-xs font-bold bg-white/5 px-4 py-2 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 hover:border-amber-500/50 transition-all active:scale-95">
                                {t('settings.test')}
                            </button>
                        </div>
                    </div>

                    {/* Performance Settings */}
                    <div className="bg-black/40 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors space-y-4">
                        <div className="flex items-center justify-between group">
                            <div className="flex items-center text-sm font-bold text-gray-300 group-hover:text-white transition-colors"><Cpu size={18} className="mr-3 text-electric" /> Focus Mode (Disable 3D)</div>
                            <button onClick={() => setFocusMode(!focusMode)} className={`text-xs font-bold px-4 py-2 rounded-lg border transition-all duration-300 ${focusMode ? 'bg-electric/20 text-electric border-electric/50 shadow-[0_0_15px_rgba(196,95,255,0.2)] scale-105' : 'bg-black/50 border-white/10 text-gray-500 hover:text-white hover:border-white/30 hover:bg-white/5'}`}>
                                {focusMode ? 'ON' : 'OFF'}
                            </button>
                        </div>
                    </div>

                    {user.role === 'admin' && (
                        <Button fullWidth variant="danger" onClick={() => { setShowSettings(false); handleTabSwitch(AppTab.ADMIN); }} className="mt-4 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                            {t('settings.admin_console')}
                        </Button>
                    )}
                </div>
            </Modal>

            {/* Sidebar */}
            <nav className="w-64 bg-black/95 bg-[url('/assets/aaa/card-bg-1.png')] bg-cover bg-center border-r border-white/10 flex-col hidden md:flex z-50">
                <div className="p-6 flex items-center space-x-3 text-white">
                    <img src="/assets/aaa/logo.png" className="w-8 h-8 rounded-md" />
                    <h1 className="text-2xl font-black tracking-tighter">YOKAI<span className="text-electric">ZEN</span></h1>
                </div>
                <div className="flex-1 space-y-1 p-4">
                    {[AppTab.HOME, AppTab.LEARN, AppTab.LAB, AppTab.LEADERBOARD, AppTab.PROFILE].map(tab => (
                        <button
                            key={tab}
                            onClick={() => handleTabSwitch(tab)}
                            className={`w-full flex items-center px-4 py-3 rounded-lg transition-all ${activeTab === tab ? 'bg-electric text-white shadow-[0_0_15px_rgba(196,95,255,0.3)]' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                        >
                            {tab === AppTab.HOME && <img src="/assets/aaa/nav-home.png" className="w-5 h-5 mr-3" />}
                            {tab === AppTab.LEARN && <img src="/assets/aaa/nav-games.png" className="w-5 h-5 mr-3" />}
                            {tab === AppTab.LAB && <img src="/assets/aaa/nav-progress.png" className="w-5 h-5 mr-3" />}
                            {tab === AppTab.LEADERBOARD && <img src="/assets/aaa/nav-leaderboard.png" className="w-5 h-5 mr-3" />}
                            {tab === AppTab.PROFILE && <img src="/assets/aaa/nav-profile.png" className="w-5 h-5 mr-3" />}
                            <span className="font-bold text-sm uppercase tracking-wide">{t(`nav.${tab.toLowerCase()}`)}</span>
                        </button>
                    ))}
                </div>
                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <img src={user.avatar} className="w-10 h-10 rounded-full border border-gray-600" />
                            <div>
                                <div className="text-sm font-bold truncate w-24">{user.name}</div>
                                <div className="text-xs text-electric">{t('ui.lvl')} {user.level}</div>
                            </div>
                        </div>
                        <button onClick={() => setShowSettings(true)} className="text-gray-400 hover:text-white">
                            <Settings size={20} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                <div className="md:hidden p-4 bg-black border-b border-white/10 flex justify-between items-center z-40">
                    <div className="flex items-center space-x-2 text-white">
                        <img src="/assets/aaa/logo.png" className="w-6 h-6 rounded-md" />
                        <h1 className="text-xl font-black">YOKAI<span className="text-electric">ZEN</span></h1>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button onClick={() => setShowSettings(true)} className="text-gray-400 hover:text-white">
                            <Settings size={20} />
                        </button>
                        <img src={user.avatar} className="w-8 h-8 rounded-full cursor-pointer" onClick={() => handleTabSwitch(AppTab.PROFILE)} />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide bg-[#050505]">
                    <ErrorBoundary>
                        {/* Global WebGL Backdrop for Hub Tabs */}
                        {[AppTab.HOME, AppTab.LEARN, AppTab.LEADERBOARD, AppTab.PROFILE].includes(activeTab) && (
                            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none fixed">
                                <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
                                    <ambientLight intensity={0.5} />
                                    <DreiSparkles count={200} scale={12} size={2} speed={0.4} opacity={0.3} color="#c45fff" />
                                    <DreiSparkles count={100} scale={10} size={4} speed={0.2} opacity={0.1} color="#4fd1c5" />
                                    <EffectComposer>
                                        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={1.5} />
                                    </EffectComposer>
                                </Canvas>
                            </div>
                        )}

                        {activeTab === AppTab.HOME && (
                            <div className="p-6 pb-24 max-w-7xl mx-auto animate-in fade-in relative z-10">

                                <div className="relative z-10 space-y-8">
                                    {/* HERO STATUS CARD */}
                                    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gray-900 shadow-2xl group">
                                        <div className="absolute inset-0 bg-[url('/assets/aaa/card-bg-1.png')] bg-cover bg-center opacity-40"></div>
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/20 via-black/40 to-violet-900/20 backdrop-blur-sm"></div>

                                        <div className="relative p-6 md:p-8 flex flex-col md:flex-row items-center md:justify-between gap-6">
                                            <div className="flex items-center gap-6">
                                                <div className="relative">
                                                    <div className="w-24 h-24 rounded-full border-4 border-electric p-1 bg-black shadow-[0_0_20px_rgba(196,95,255,0.4)]">
                                                        <img src={user.avatar} className="w-full h-full rounded-full object-cover" />
                                                    </div>
                                                    <div className="absolute -bottom-2 -right-2 bg-black border border-white/20 rounded-full p-2 shadow-lg">
                                                        <Shield className="text-electric w-5 h-5" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <h2 className="text-4xl font-black text-white uppercase tracking-tight glitch-text" data-text={user.name}>{user.name}</h2>
                                                    <div className="flex items-center space-x-3 text-sm text-gray-400 font-mono mt-2">
                                                        <span className="bg-electric/20 text-electric px-3 py-1 rounded border border-electric/30 font-bold">{t('ui.lvl')} {user.level}</span>
                                                        <span className="flex items-center"><Star size={14} className="mr-1 text-yellow-400" /> {user.title}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Stats Grid */}
                                            <div className="grid grid-cols-3 gap-8 text-center bg-black/40 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
                                                <div>
                                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{t('profile.xp')}</div>
                                                    <div className="text-2xl font-black text-white">{user.xp.toLocaleString()}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{t('profile.streak')}</div>
                                                    <div className="text-2xl font-black text-amber-400">{user.streak} <span className="text-[10px] text-gray-500">{t('ui.days')}</span></div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{t('profile.credits')}</div>
                                                    <div className="text-2xl font-black text-cyan-400">{user.credits}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Next Unlock Widget */}
                                        {nextLockedTool && (
                                            <div className="bg-black/60 border-t border-white/5 p-4 flex items-center justify-between backdrop-blur-md cursor-pointer hover:bg-white/5 transition-colors group/unlock" onClick={() => handleTabSwitch(AppTab.LAB)}>
                                                <div className="flex items-center space-x-4">
                                                    <div className="p-2 bg-gray-800 rounded-lg border border-gray-700 group-hover/unlock:border-electric transition-colors">
                                                        <Lock size={18} className="text-gray-500 group-hover/unlock:text-electric" />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t('home.next_unlock')}</div>
                                                        <div className="text-sm font-bold text-white group-hover/unlock:text-electric transition-colors">{t(nextLockedTool.name)}</div>
                                                        <div className="text-[10px] text-gray-500 mt-0.5">{t(nextLockedTool.unlockCondition)}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center text-xs text-electric font-bold uppercase bg-electric/10 px-3 py-1.5 rounded-full border border-electric/20 group-hover/unlock:bg-electric group-hover/unlock:text-white transition-all">
                                                    {t('home.view_lab')} <ChevronRight size={14} className="ml-1" />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-4 px-2">
                                            <h3 className="text-xl font-black text-white uppercase italic tracking-wide">Featured Simulations</h3>
                                            <div className="flex gap-2">
                                                <div className="w-2 h-2 rounded-full bg-electric animate-pulse"></div>
                                                <div className="w-2 h-2 rounded-full bg-gray-700"></div>
                                                <div className="w-2 h-2 rounded-full bg-gray-700"></div>
                                            </div>
                                        </div>
                                        <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
                                            {GAMES.slice(0, 10).map(game => (
                                                <div key={game.id} onClick={() => handleGameLaunch(game)} className="snap-center shrink-0 w-[280px] md:w-[320px] relative aspect-video bg-gray-900 rounded-xl overflow-hidden border border-white/10 cursor-pointer group hover:border-electric transition-all shadow-xl hover:shadow-[0_0_30px_rgba(196,95,255,0.3)] hover:-translate-y-1">
                                                    <GameCover game={game} className="opacity-70 group-hover:opacity-100 transition-opacity duration-500 scale-105 group-hover:scale-110" iconSize={48} />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>

                                                    {game.isPremium && !user.isPro && (
                                                        <div className="absolute top-2 right-2 bg-black/80 text-amber-500 p-1.5 rounded-full border border-amber-500/50 z-10 shadow-lg backdrop-blur-md">
                                                            <Lock size={14} />
                                                        </div>
                                                    )}

                                                    <div className="absolute bottom-4 left-4 right-4 z-10">
                                                        <div className="text-lg font-black text-white truncate drop-shadow-md group-hover:text-electric transition-colors uppercase tracking-tight">
                                                            {t(`game.${game.type.toLowerCase()}.title`)}
                                                        </div>
                                                        <div className="text-[11px] text-gray-300 truncate opacity-90 mb-3 drop-shadow-md">
                                                            {t(`game.${game.type.toLowerCase()}.desc`)}
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <span className={`text-[9px] px-2 py-0.5 rounded-sm font-bold uppercase border ${game.difficulty === 'Rookie' ? 'bg-green-900/40 border-green-500/50 text-green-400' :
                                                                game.difficulty === 'Pro' ? 'bg-blue-900/40 border-blue-500/50 text-blue-400' : 'bg-red-900/40 border-red-500/50 text-red-400'
                                                                }`}>
                                                                {t(`difficulty.${game.difficulty.toLowerCase()}`)}
                                                            </span>
                                                            <span className="text-[9px] text-gray-400 font-mono flex items-center bg-black/50 px-2 py-0.5 rounded-sm backdrop-blur-sm">
                                                                <Clock size={10} className="mr-1" /> {game.durationMin} {t('ui.min')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-4 px-2">
                                            <h3 className="text-xl font-black text-white uppercase italic tracking-wide">All Scenarios</h3>
                                        </div>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                            {GAMES.slice(10).map(game => (
                                                <div key={game.id} onClick={() => handleGameLaunch(game)} className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden border border-white/5 cursor-pointer group hover:border-white/30 transition-all">
                                                    <GameCover game={game} className="opacity-40 group-hover:opacity-80 transition-opacity duration-300" iconSize={32} />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
                                                    {game.isPremium && !user.isPro && (
                                                        <div className="absolute top-2 right-2 text-amber-500/50 z-10"><Lock size={12} /></div>
                                                    )}
                                                    <div className="absolute bottom-2 left-2 right-2 z-10">
                                                        <div className="text-xs font-bold text-white truncate group-hover:text-electric transition-colors">{t(`game.${game.type.toLowerCase()}.title`)}</div>
                                                        <div className="text-[9px] text-gray-500 truncate">{t(`game.${game.type.toLowerCase()}.desc`)}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Continue Learning Path Link */}
                                    <div className="mt-8 p-6 bg-gradient-to-r from-blue-900/40 to-purple-900/40 rounded-2xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 group cursor-pointer hover:border-electric transition-all" onClick={() => handleTabSwitch(AppTab.LEARN)}>
                                        <div className="flex items-center space-x-4">
                                            <div className="p-3 bg-electric/20 rounded-full border border-electric/50 text-electric group-hover:scale-110 transition-transform">
                                                <BookOpen size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-white uppercase italic">{t('home.continue_path')}</h3>
                                                <p className="text-sm text-gray-400">{t('home.path_desc')}</p>
                                            </div>
                                        </div>
                                        <Button variant="primary" className="shadow-[0_0_20px_rgba(196,95,255,0.3)]">
                                            {t('ui.enter_path')} <ChevronRight className="ml-2" size={16} />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === AppTab.LEARN && (
                            <LearnPath
                                nodes={LEARN_PATH}
                                completedNodes={user.completedNodes}
                                unlockedTools={user.unlockedTools}
                                onNodeClick={(node) => {
                                    if (node.gameId) {
                                        const game = GAMES.find(g => g.id === node.gameId);
                                        if (game) handleGameLaunch(game);
                                    } else {
                                        showToast("Lesson Module: " + node.title, 'info');
                                    }
                                }}
                            />
                        )}

                        {activeTab === AppTab.LAB && (
                            <LabScreen
                                user={user}
                                onUpdateUser={updateUser}
                                onTriggerPaywall={() => setShowPaywall(true)}
                                t={t}
                            />
                        )}

                        {activeTab === AppTab.LEADERBOARD && (
                            <div className="flex flex-col h-full">
                                {/* Mobile Toggle */}
                                <div className="md:hidden flex border-b border-white/10">
                                    <button
                                        className={`flex-1 py-3 text-xs font-bold uppercase ${mobileLeaderboardView === 'RANKING' ? 'text-electric border-b-2 border-electric' : 'text-gray-500'}`}
                                        onClick={() => setMobileLeaderboardView('RANKING')}
                                    >
                                        {t('leaderboard.global')}
                                    </button>
                                    <button
                                        className={`flex-1 py-3 text-xs font-bold uppercase ${mobileLeaderboardView === 'SQUAD' ? 'text-electric border-b-2 border-electric' : 'text-gray-500'}`}
                                        onClick={() => setMobileLeaderboardView('SQUAD')}
                                    >
                                        {t('leaderboard.squad')}
                                    </button>
                                </div>

                                <div className="flex flex-1 overflow-hidden">
                                    <div className={`flex-1 border-r border-white/10 ${mobileLeaderboardView === 'SQUAD' ? 'block' : 'hidden md:block'}`}>
                                        <SquadManager
                                            squads={squads}
                                            userSquadId={user.squadId}
                                            onJoinSquad={handleJoinSquad}
                                            onCreateSquad={handleCreateSquad}
                                            isPro={user.isPro}
                                            onTriggerPaywall={() => setShowPaywall(true)}
                                            t={t}
                                            user={user}
                                            onUpdateUser={updateUser}
                                            onUpdateSquads={setSquads}
                                        />
                                    </div>
                                    <div className={`flex-1 h-full ${mobileLeaderboardView === 'RANKING' ? 'block' : 'hidden md:block'}`}>
                                        <Leaderboard />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === AppTab.PROFILE && (
                            <div className="p-4 sm:p-8 space-y-10 animate-in slide-in-from-bottom-5 fade-in pb-32">
                                {/* Epic Profile Header Card */}
                                <div ref={idCardRef} className="bg-gradient-to-br from-gray-900/90 via-black/80 to-electric/20 p-8 sm:p-10 rounded-[2rem] border border-white/10 backdrop-blur-2xl relative overflow-hidden group shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                                    {/* Animated light sweeps */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                    <div className="absolute -top-32 -right-32 w-96 h-96 bg-electric/20 rounded-full blur-[100px] pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-700"></div>

                                    <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-6 sm:space-y-0 sm:space-x-8 relative z-10">
                                        <div className="relative group/avatar">
                                            <div className="w-32 h-32 rounded-[2rem] border-2 border-white/20 p-1 shadow-[0_0_30px_rgba(196,95,255,0.3)] bg-black overflow-hidden group-hover/avatar:border-electric transition-colors duration-500">
                                                <img src={user.avatar} className="w-full h-full object-cover rounded-[1.8rem] group-hover/avatar:scale-110 transition-transform duration-700" />
                                            </div>
                                            <div className="absolute inset-0 bg-electric/50 rounded-[2rem] blur-2xl opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-500 -z-10"></div>
                                        </div>
                                        <div className="text-center sm:text-left flex-1">
                                            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter drop-shadow-lg mb-2">{user.name}</h2>
                                            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-electric/10 border border-electric/30 text-electric font-bold text-sm uppercase tracking-widest mb-6 shadow-[0_0_15px_rgba(196,95,255,0.2)]">
                                                <div className="w-2 h-2 rounded-full bg-electric animate-pulse mr-2 shadow-[0_0_10px_#c45fff]"></div>
                                                {user.title}
                                            </div>

                                            <div className="flex flex-wrap justify-center sm:justify-start gap-4">
                                                <div className="bg-black/60 border border-white/10 px-5 py-3 rounded-2xl flex items-center backdrop-blur-xl shadow-inner group/stat hover:border-amber-500/50 transition-colors">
                                                    <Trophy size={18} className="text-amber-400 mr-3 group-hover/stat:scale-125 transition-transform" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none mb-1">{t('profile.level')}</span>
                                                        <span className="text-xl font-black text-white leading-none">{user.level}</span>
                                                    </div>
                                                </div>
                                                <div className="bg-black/60 border border-white/10 px-5 py-3 rounded-2xl flex items-center backdrop-blur-xl shadow-inner group/stat hover:border-cyan-500/50 transition-colors">
                                                    <Zap size={18} className="text-cyan-400 mr-3 group-hover/stat:scale-125 transition-transform" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none mb-1">{t('profile.credits')}</span>
                                                        <span className="text-xl font-black text-white leading-none flex items-baseline">
                                                            {user.credits} <span className="text-xs text-cyan-700 ml-1">CR</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleExportIDCard}
                                                disabled={isGeneratingCard}
                                                className="mt-6 flex items-center justify-center bg-transparent border border-electric/50 text-electric hover:bg-electric/20 rounded-xl px-5 py-2.5 text-xs font-bold transition-all uppercase tracking-widest shadow-[0_0_15px_rgba(196,95,255,0.2)] hover:shadow-[0_0_25px_rgba(196,95,255,0.5)]"
                                                title="Export Neural ID to PNG"
                                            >
                                                <Share2 size={16} className="mr-3" />
                                                {isGeneratingCard ? 'Exporting...' : 'Export Neural ID Card'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Epic Skills Radar */}
                                    <div className="bg-gradient-to-br from-black/80 to-gray-900/90 p-8 rounded-[2rem] border border-white/10 relative group hover:border-white/20 transition-all shadow-2xl backdrop-blur-xl flex flex-col items-center">
                                        <div className="w-full flex justify-between items-center mb-8">
                                            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center">
                                                <Activity size={18} className="mr-3 text-electric" /> SKILL MATRIX
                                            </h3>
                                            <button
                                                className="bg-electric/10 text-electric text-xs font-bold px-4 py-2 rounded-xl border border-electric/30 hover:bg-electric border-hover bg-hover text-hover transition-all shadow-[0_0_15px_rgba(196,95,255,0.2)] hover:shadow-[0_0_25px_rgba(196,95,255,0.6)] hover:text-white"
                                                onClick={() => setShowSkillTree(true)}
                                            >
                                                {t('ui.view_skill_tree')}
                                            </button>
                                        </div>
                                        <div className="relative z-10 w-full flex-1 flex items-center justify-center min-h-[300px]">
                                            <SkillRadar skills={user.skills} t={t} />
                                        </div>
                                    </div>

                                    {/* Epic Created Games */}
                                    <div className="bg-gradient-to-br from-black/80 to-gray-900/90 p-8 rounded-[2rem] border border-white/10 group hover:border-white/20 transition-all shadow-2xl backdrop-blur-xl flex flex-col">
                                        <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-8 flex items-center">
                                            <Box size={18} className="mr-3 text-cyan-400" /> {t('profile.created_games')}
                                        </h3>
                                        <div className="space-y-4 flex-1 mt-2 overflow-y-auto pr-2 custom-scrollbar max-h-[300px]">
                                            {(user.createdGames || []).map((g: any, i: number) => (
                                                <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-cyan-500/50 hover:bg-gradient-to-r hover:from-cyan-900/20 hover:to-transparent transition-all group/item shadow-sm hover:shadow-lg">
                                                    <span className="text-base font-bold text-gray-300 group-hover/item:text-white transition-colors">{g.title}</span>
                                                    <Button size="sm" variant="primary" onClick={() => setActiveGeneratedGame(g)} className="opacity-0 group-hover/item:opacity-100 transition-all translate-x-4 group-hover/item:translate-x-0"><Play size={14} className="mr-2" /> {t('ui.play')}</Button>
                                                </div>
                                            ))}
                                            {(!user.createdGames || user.createdGames.length === 0) && (
                                                <div className="h-full w-full flex flex-col items-center justify-center text-gray-600 space-y-4 opacity-70">
                                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                                        <Box size={24} className="text-gray-500" />
                                                    </div>
                                                    <span className="text-xs uppercase font-bold tracking-[0.2em]">{t('profile.no_games')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Epic Badges Gallery */}
                                <div className="bg-gradient-to-br from-black/80 to-gray-900/90 p-8 rounded-[2rem] border border-white/10 relative group hover:border-white/20 transition-all shadow-2xl backdrop-blur-xl overflow-hidden">
                                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none"></div>

                                    <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-8 flex items-center relative z-10">
                                        <Award size={18} className="mr-3 text-amber-500" /> HALL OF MASTERY
                                    </h3>

                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-4 sm:gap-6 relative z-10">
                                        {user.inventory.filter(i => i.type === 'BADGE').map(b => (
                                            <div key={b.id} className="aspect-square bg-gradient-to-b from-gray-800 to-black rounded-2xl flex flex-col items-center justify-center border border-white/10 relative group/badge hover:-translate-y-2 shadow-lg hover:shadow-[0_20px_40px_rgba(245,158,11,0.2)] transition-all duration-500 cursor-crosshair overflow-hidden hover:border-amber-500/60">
                                                <div className="absolute inset-0 bg-gradient-to-t from-amber-500/20 to-transparent opacity-0 group-hover/badge:opacity-100 transition-opacity duration-300"></div>

                                                <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mb-1 group-hover/badge:scale-110 transition-transform duration-500">
                                                    {b.icon.endsWith('.svg') || b.icon.endsWith('.png') ? (
                                                        <img src={`/assets/badges/${b.icon}`} alt={b.name} className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" onError={(e) => (e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${b.name}`)} />
                                                    ) : (
                                                        <span className="text-4xl drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{b.icon}</span>
                                                    )}
                                                </div>
                                                <div className="absolute bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-amber-500/30 flex items-center justify-center text-[10px] font-black tracking-wider text-center py-2 px-1 translate-y-full group-hover/badge:translate-y-0 transition-transform duration-300 rounded-b-2xl z-20 text-amber-400 uppercase shadow-[0_-10px_20px_rgba(0,0,0,0.8)]">
                                                    {b.name}
                                                </div>
                                            </div>
                                        ))}

                                        {/* Epic Locked placeholders */}
                                        {Array.from({ length: Math.max(0, 16 - user.inventory.filter(i => i.type === 'BADGE').length) }).map((_, i) => (
                                            <div key={`locked-${i}`} className="aspect-square bg-black/40 rounded-2xl border border-white/5 border-dashed flex flex-col items-center justify-center opacity-40 hover:opacity-80 hover:bg-black/60 hover:border-white/20 transition-all duration-300 group/locked">
                                                <Lock size={20} className="text-gray-600 mb-2 group-hover/locked:text-gray-400 transition-colors" />
                                                <div className="w-8 h-1 bg-gray-800 rounded-full"></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === AppTab.ADMIN && user.role === 'admin' && (
                            <AdminPanel games={GAMES} onUpdateGames={() => { }} users={[user]} onUpdateUsers={() => { }} />
                        )}
                    </ErrorBoundary>
                </div>

                <div className="md:hidden bg-black border-t border-white/10 flex justify-around p-3 z-50 pb-safe">
                    {[AppTab.HOME, AppTab.LEARN, AppTab.LAB, AppTab.LEADERBOARD, AppTab.PROFILE].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex flex-col items-center ${activeTab === tab ? 'text-electric' : 'text-gray-500'}`}
                        >
                            {tab === AppTab.HOME && <img src="/assets/aaa/nav-home.png" className="w-5 h-5" />}
                            {tab === AppTab.LEARN && <img src="/assets/aaa/nav-games.png" className="w-5 h-5" />}
                            {tab === AppTab.LAB && <img src="/assets/aaa/nav-progress.png" className="w-5 h-5" />}
                            {tab === AppTab.LEADERBOARD && <img src="/assets/aaa/nav-leaderboard.png" className="w-5 h-5" />}
                            {tab === AppTab.PROFILE && <img src="/assets/aaa/nav-profile.png" className="w-5 h-5" />}
                            <span className="text-[9px] font-bold mt-1 uppercase">
                                {tab === AppTab.LEADERBOARD ? t('leaderboard.squad').substring(0, 5) : t(`nav.${tab.toLowerCase()}`).substring(0, 4)}
                            </span>
                        </button>
                    ))}
                </div>
            </main>
        </div>
    );
};
