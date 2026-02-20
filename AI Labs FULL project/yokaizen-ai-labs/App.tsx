
import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useToast } from './contexts/ToastContext';
import { GAMES, GAME_TUTORIALS, GAME_DEBRIEFS, LEARN_PATH, MOCK_SQUADS, TOOLS, SKILL_TREE } from './constants';
import { TRANSLATIONS } from './translations';
import { audio } from './services/audioService';
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
    Lock, ArrowLeft, Globe, Volume2, Smartphone, ChevronRight, Zap, Shield, Star, Clock, Play, Brain
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

// Assets to preload
const PRELOAD_ASSETS = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=CyberPunk',
    'https://grainy-gradients.vercel.app/noise.svg',
    // Add other critical game assets here
];

export const App: React.FC = () => {
    const { user, isAuthenticated, updateUser } = useAuth();
    const [isPreloading, setIsPreloading] = useState(true);
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
        setActiveGame(game);
        setGameDifficulty(game.difficulty);
        setShowTutorial(true);
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
                        default: return <div className="text-white p-10">Game Module Not Loaded</div>;
                    }
                })()}
            </ErrorBoundary>
        );
    };

    if (isPreloading) {
        return <Preloader assets={PRELOAD_ASSETS} onComplete={() => setIsPreloading(false)} />;
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
            <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title={t('settings.title')} icon={<Settings size={24} />}>
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center"><Globe size={18} className="mr-3 text-cyan-400" /> {t('settings.language')}</div>
                        <div className="flex space-x-2">
                            {['EN', 'ES', 'JP', 'KR', 'TH'].map(lang => (
                                <button
                                    key={lang}
                                    onClick={() => updateUser({ ...user, language: lang as Language })}
                                    className={`text-xs font-bold px-2 py-1 rounded border ${user.language === lang ? 'bg-cyan-500 text-black border-cyan-500' : 'bg-black border-gray-700 text-gray-500'}`}
                                >
                                    {lang}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center"><Volume2 size={18} className="mr-3 text-purple-400" /> {t('settings.audio')}</div>
                        <button onClick={() => audio.toggleMute()} className="text-xs bg-gray-800 px-3 py-1 rounded border border-gray-600 text-gray-300 hover:text-white">
                            {t('settings.toggle')}
                        </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center"><Smartphone size={18} className="mr-3 text-amber-400" /> {t('settings.haptics')}</div>
                        <button onClick={() => audio.vibrate(50)} className="text-xs bg-gray-800 px-3 py-1 rounded border border-gray-600 text-gray-300 hover:text-white">
                            {t('settings.test')}
                        </button>
                    </div>

                    {user.role === 'admin' && (
                        <Button fullWidth variant="danger" onClick={() => { setShowSettings(false); setActiveTab(AppTab.ADMIN); }}>
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
                            onClick={() => setActiveTab(tab)}
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
                        <img src={user.avatar} className="w-8 h-8 rounded-full" onClick={() => setActiveTab(AppTab.PROFILE)} />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide bg-[#050505]">
                    <ErrorBoundary>
                        {activeTab === AppTab.HOME && (
                            <div className="p-6 pb-24 max-w-7xl mx-auto animate-in fade-in">
                                {/* HERO STATUS CARD */}
                                <div className="mb-8 relative rounded-2xl overflow-hidden border border-white/10 bg-gray-900 shadow-2xl group">
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
                                        <div className="bg-black/60 border-t border-white/5 p-4 flex items-center justify-between backdrop-blur-md cursor-pointer hover:bg-white/5 transition-colors group/unlock" onClick={() => setActiveTab(AppTab.LAB)}>
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

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {GAMES.map(game => (
                                        <div key={game.id} onClick={() => handleGameLaunch(game)} className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden border border-white/5 cursor-pointer group hover:border-electric transition-all shadow-lg hover:shadow-[0_0_20px_rgba(196,95,255,0.2)] hover:scale-[1.02]">
                                            <GameCover game={game} className="opacity-60 group-hover:opacity-100 transition-opacity duration-500" iconSize={48} />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>

                                            {game.isPremium && !user.isPro && (
                                                <div className="absolute top-2 right-2 bg-black/80 text-amber-500 p-1.5 rounded-full border border-amber-500/50 z-10 shadow-lg">
                                                    <Lock size={14} />
                                                </div>
                                            )}

                                            <div className="absolute bottom-3 left-3 right-3 z-10">
                                                <div className="text-sm font-bold text-white truncate drop-shadow-md group-hover:text-electric transition-colors">
                                                    {t(`game.${game.type.toLowerCase()}.title`)}
                                                </div>
                                                <div className="text-[10px] text-gray-300 truncate opacity-80 mb-2">
                                                    {t(`game.${game.type.toLowerCase()}.desc`)}
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase border ${game.difficulty === 'Rookie' ? 'bg-green-900/40 border-green-500/30 text-green-400' :
                                                        game.difficulty === 'Pro' ? 'bg-blue-900/40 border-blue-500/30 text-blue-400' : 'bg-red-900/40 border-red-500/30 text-red-400'
                                                        }`}>
                                                        {t(`difficulty.${game.difficulty.toLowerCase()}`)}
                                                    </span>
                                                    <span className="text-[9px] text-gray-400 font-mono flex items-center">
                                                        <Clock size={10} className="mr-1" /> {game.durationMin} {t('ui.min')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Continue Learning Path Link */}
                                <div className="mt-8 p-6 bg-gradient-to-r from-blue-900/40 to-purple-900/40 rounded-2xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 group cursor-pointer hover:border-electric transition-all" onClick={() => setActiveTab(AppTab.LEARN)}>
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
                            <div className="p-6 space-y-8 animate-in fade-in pb-24">
                                <div className="flex items-center space-x-6">
                                    <div className="w-24 h-24 rounded-full border-4 border-electric p-1">
                                        <img src={user.avatar} className="w-full h-full rounded-full bg-gray-800" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-white">{user.name}</h2>
                                        <div className="text-electric font-mono mb-2">{user.title}</div>
                                        <div className="flex space-x-4 text-sm text-gray-400">
                                            <span>{t('profile.level')} {user.level}</span>
                                            <span>{user.credits} {t('ui.cr')}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-gray-900/50 p-4 rounded-xl border border-white/10 relative">
                                        <SkillRadar skills={user.skills} t={t} />
                                        <button
                                            className="absolute top-2 right-2 bg-electric/20 text-electric text-xs px-2 py-1 rounded border border-electric hover:bg-electric/40"
                                            onClick={() => setShowSkillTree(true)}
                                        >
                                            {t('ui.view_skill_tree')}
                                        </button>
                                    </div>

                                    {/* Created Games Section */}
                                    <div className="bg-gray-900/50 p-4 rounded-xl border border-white/10">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">{t('profile.created_games')}</h3>
                                        <div className="space-y-2">
                                            {(user.createdGames || []).map((g: any, i: number) => (
                                                <div key={i} className="flex justify-between items-center p-2 bg-black/40 rounded border border-white/5">
                                                    <span className="text-sm font-bold text-white">{g.title}</span>
                                                    <Button size="sm" variant="secondary" onClick={() => setActiveGeneratedGame(g)}><Play size={12} className="mr-1" /> {t('ui.play')}</Button>
                                                </div>
                                            ))}
                                            {(!user.createdGames || user.createdGames.length === 0) && (
                                                <div className="text-xs text-gray-500 italic">{t('profile.no_games')}</div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Achievements & Badges Section */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">{t('profile.badges')}</h3>
                                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                                        {user.inventory.filter(i => i.type === 'BADGE').map(b => (
                                            <div key={b.id} className="aspect-square bg-gray-800 rounded-lg flex items-center justify-center border border-gray-700 relative group animate-check-pop">
                                                {b.icon.endsWith('.svg') || b.icon.endsWith('.png') ? (
                                                    <img src={`/assets/badges/${b.icon}`} alt={b.name} className="w-10 h-10 object-contain" onError={(e) => (e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${b.name}`)} />
                                                ) : (
                                                    <span className="text-2xl">{b.icon}</span>
                                                )}
                                                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[8px] text-center p-1 transition-opacity rounded-lg">
                                                    {b.name}
                                                </div>
                                            </div>
                                        ))}
                                        {/* Locked placeholders */}
                                        {Array.from({ length: Math.max(0, 12 - user.inventory.filter(i => i.type === 'BADGE').length) }).map((_, i) => (
                                            <div key={i} className="aspect-square bg-black/30 rounded-lg border border-white/5 flex items-center justify-center">
                                                <Lock size={12} className="text-gray-700" />
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
                            <span className="text-[9px] font-bold mt-1 uppercase">{t(`nav.${tab.toLowerCase()}`).substring(0, 4)}</span>
                        </button>
                    ))}
                </div>
            </main>
        </div>
    );
};
