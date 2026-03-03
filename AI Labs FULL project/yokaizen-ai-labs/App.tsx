
import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './contexts/AuthContext';
import { useToast } from './contexts/ToastContext';
import { useFocusMode } from './hooks/useFocusMode';
import { GAMES, GAME_TUTORIALS, GAME_DEBRIEFS, LEARN_PATH, MOCK_SQUADS, TOOLS, SKILL_TREE } from './constants';
import { TRANSLATIONS } from './translations';
import { audio } from './services/audioService';
import { useDialogue } from './contexts/DialogueContext';
import { squadsService } from './services/squadsService';
import { AppTab, GameDef, GameType, Difficulty, Language, CreatorGame, Squad, UserStats, SkillType } from './types';
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
const AIGeneratedGame = React.lazy(() => import('./components/games/AIGeneratedGame').then(m => ({ default: m.AIGeneratedGame })));
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { ValueProposition } from './components/onboarding/ValueProposition';
import { HomePage } from './pages/HomePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { BottomNav } from './components/ui/BottomNav';

import { EpicOnboarding } from './components/onboarding/EpicOnboarding';
import { ShareCard } from './components/social/ShareCard';
import { StreakRewards } from './components/streaks/StreakRewards';
import { badgeService } from './services/badgeService';
import { BadgeNotification } from './components/ui/BadgeNotification';
import { NotificationCenter, AppNotification } from './components/ui/NotificationCenter';
import { GameAnalyticsDashboard } from './components/GameAnalyticsDashboard';
import { SquadOnboarding } from './components/onboarding/SquadOnboarding';
import {
    Layout, BookOpen, FlaskConical, Trophy, User, Settings,
    Lock, ArrowLeft, Globe, Volume2, Smartphone, ChevronRight, Zap, Shield, Star, Clock, Play, Brain, Activity, Box, Award, Cpu,
    Home, Gamepad2, Rocket,
    Search, CheckCircle, Filter, BarChart3, Bell, Share2
} from 'lucide-react';

// ── Language config for full i18n support ──
const LANG_OPTIONS: { code: string; label: string; flag: string }[] = [
    { code: 'EN', label: 'English', flag: '🇬🇧' },
    { code: 'ES', label: 'Español', flag: '🇪🇸' },
    { code: 'JP', label: '日本語', flag: '🇯🇵' },
    { code: 'KR', label: '한국어', flag: '🇰🇷' },
    { code: 'TH', label: 'ไทย', flag: '🇹🇭' },
    { code: 'CA', label: 'Català', flag: '🏴' },
    { code: 'DE', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'FR', label: 'Français', flag: '🇫🇷' },
    { code: 'PT', label: 'Português', flag: '🇧🇷' },
    { code: 'NL', label: 'Nederlands', flag: '🇳🇱' },
    { code: 'PL', label: 'Polski', flag: '🇵🇱' },
    { code: 'ID', label: 'Bahasa', flag: '🇮🇩' },
    { code: 'EU', label: 'Euskara', flag: '🏴' },
];

// ── Category filter options ──
const CATEGORY_FILTERS: { key: string; label: string; skill?: SkillType }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'PROMPTING', label: 'Prompting', skill: SkillType.PROMPTING },
    { key: 'SAFETY', label: 'Safety', skill: SkillType.SAFETY },
    { key: 'ETHICS', label: 'Ethics', skill: SkillType.ETHICS },
    { key: 'ANALYSIS', label: 'Analysis', skill: SkillType.ANALYSIS },
    { key: 'CREATIVITY', label: 'Creativity', skill: SkillType.CREATIVITY },
    { key: 'DEBUGGING', label: 'Debugging', skill: SkillType.DEBUGGING },
];

// Import all games
const PromptArchitect = React.lazy(() => import('./components/games/PromptArchitect').then(m => ({ default: m.PromptArchitect })));
const RedTeam = React.lazy(() => import('./components/games/RedTeam').then(m => ({ default: m.RedTeam })));
const NeonDrift = React.lazy(() => import('./components/games/NeonDrift').then(m => ({ default: m.NeonDrift })));
const PlanariumHeist = React.lazy(() => import('./components/games/PlanariumHeist').then(m => ({ default: m.PlanariumHeist })));
const BanditBistro = React.lazy(() => import('./components/games/BanditBistro').then(m => ({ default: m.BanditBistro })));
const StyleAnchor = React.lazy(() => import('./components/games/StyleAnchor').then(m => ({ default: m.StyleAnchor })));
const GlitchwaveAnalyst = React.lazy(() => import('./components/games/GlitchwaveAnalyst').then(m => ({ default: m.GlitchwaveAnalyst })));
const OODSentinel = React.lazy(() => import('./components/games/OODSentinel').then(m => ({ default: m.OODSentinel })));
const LatencyLab = React.lazy(() => import('./components/games/LatencyLab').then(m => ({ default: m.LatencyLab })));
const BiasBingo = React.lazy(() => import('./components/games/BiasBingo').then(m => ({ default: m.BiasBingo })));
const GradientSki = React.lazy(() => import('./components/games/GradientSki').then(m => ({ default: m.GradientSki })));
const LatentVoyager = React.lazy(() => import('./components/games/LatentVoyager').then(m => ({ default: m.LatentVoyager })));
const TokenTsunami = React.lazy(() => import('./components/games/TokenTsunami').then(m => ({ default: m.TokenTsunami })));
const ProteinPoker = React.lazy(() => import('./components/games/ProteinPoker').then(m => ({ default: m.ProteinPoker })));
const ClimateTimeMachine = React.lazy(() => import('./components/games/ClimateTimeMachine').then(m => ({ default: m.ClimateTimeMachine })));
const WallStreetWar = React.lazy(() => import('./components/games/WallStreetWar').then(m => ({ default: m.WallStreetWar })));
const SmartCityMayor = React.lazy(() => import('./components/games/SmartCityMayor').then(m => ({ default: m.SmartCityMayor })));
const SpaceMission = React.lazy(() => import('./components/games/SpaceMission').then(m => ({ default: m.SpaceMission })));

// Viral Mini Games (Funnel bypasses)
const ViralNeuralHack = React.lazy(() => import('./components/viral/ViralNeuralHack').then(m => ({ default: m.ViralNeuralHack })));
const ViralLatencyTunnel = React.lazy(() => import('./components/viral/ViralLatencyTunnel').then(m => ({ default: m.ViralLatencyTunnel })));
const ViralChaosDefense = React.lazy(() => import('./components/viral/ViralChaosDefense').then(m => ({ default: m.ViralChaosDefense })));
const ViralPromptInjection = React.lazy(() => import('./components/viral/ViralPromptInjection').then(m => ({ default: m.ViralPromptInjection })));
import { Canvas } from '@react-three/fiber';
import { Sparkles as DreiSparkles } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
const DefenseStrategist = React.lazy(() => import('./components/games/DefenseStrategist').then(m => ({ default: m.DefenseStrategist })));
const PersonaSwitchboard = React.lazy(() => import('./components/games/PersonaSwitchboard').then(m => ({ default: m.PersonaSwitchboard })));
const DeepfakeDetective = React.lazy(() => import('./components/games/DeepfakeDetective').then(m => ({ default: m.DeepfakeDetective })));
const CausalConservatory = React.lazy(() => import('./components/games/CausalConservatory').then(m => ({ default: m.CausalConservatory })));
const DataWhisperer = React.lazy(() => import('./components/games/DataWhisperer').then(m => ({ default: m.DataWhisperer })));
const RewardFixer = React.lazy(() => import('./components/games/RewardFixer').then(m => ({ default: m.RewardFixer })));
const NeuralNoir = React.lazy(() => import('./components/games/NeuralNoir').then(m => ({ default: m.NeuralNoir })));
const PhantomLatency = React.lazy(() => import('./components/games/PhantomLatency').then(m => ({ default: m.PhantomLatency })));
const ChronoQuest = React.lazy(() => import('./components/games/ChronoQuest').then(m => ({ default: m.ChronoQuest })));
const VampireInvitation = React.lazy(() => import('./components/games/VampireInvitation').then(m => ({ default: m.VampireInvitation })));
const MantellaWorld = React.lazy(() => import('./components/games/MantellaWorld').then(m => ({ default: m.MantellaWorld })));
const CyberRain = React.lazy(() => import('./components/games/CyberRain').then(m => ({ default: m.CyberRain })));
const DreamSim = React.lazy(() => import('./components/games/DreamSim').then(m => ({ default: m.DreamSim })));
const BioGuard = React.lazy(() => import('./components/games/BioGuard').then(m => ({ default: m.BioGuard })));
const NexusNegotiation = React.lazy(() => import('./components/games/NexusNegotiation').then(m => ({ default: m.NexusNegotiation })));
const Xenoflora = React.lazy(() => import('./components/games/Xenoflora').then(m => ({ default: m.Xenoflora })));
const NeonSyndicate = React.lazy(() => import('./components/games/NeonSyndicate').then(m => ({ default: m.NeonSyndicate })));
const EntropySandbox = React.lazy(() => import('./components/games/EntropySandbox').then(m => ({ default: m.EntropySandbox })));
const CognitiveCity = React.lazy(() => import('./components/games/CognitiveCity').then(m => ({ default: m.CognitiveCity })));
const PromptDrift = React.lazy(() => import('./components/games/PromptDrift').then(m => ({ default: m.PromptDrift })));
const Doppelganger = React.lazy(() => import('./components/games/Doppelganger').then(m => ({ default: m.Doppelganger })));
const VoightKampffProtocol = React.lazy(() => import('./components/games/VoightKampffProtocol').then(m => ({ default: m.VoightKampffProtocol })));
const ArrakisSands = React.lazy(() => import('./components/games/ArrakisSands').then(m => ({ default: m.ArrakisSands })));
const LazarusVector = React.lazy(() => import('./components/games/LazarusVector').then(m => ({ default: m.LazarusVector })));
const VeritasFalls = React.lazy(() => import('./components/games/VeritasFalls').then(m => ({ default: m.VeritasFalls })));
const AethelredGambit = React.lazy(() => import('./components/games/AethelredGambit').then(m => ({ default: m.AethelredGambit })));
const QuantumQubit = React.lazy(() => import('./components/games/QuantumQubit').then(m => ({ default: m.QuantumQubit })));
const NeuralPrism = React.lazy(() => import('./components/games/NeuralPrism').then(m => ({ default: m.NeuralPrism })));
const SynapseSurge = React.lazy(() => import('./components/games/SynapseSurge').then(m => ({ default: m.SynapseSurge })));
const DeepfakeDeflector = React.lazy(() => import('./components/games/DeepfakeDeflector').then(m => ({ default: m.DeepfakeDeflector })));
const OracleIndex = React.lazy(() => import('./components/games/OracleIndex').then(m => ({ default: m.OracleIndex })));
const ChaosEngineering = React.lazy(() => import('./components/games/ChaosEngineering').then(m => ({ default: m.ChaosEngineering })));
const TuringTessellation = React.lazy(() => import('./components/games/TuringTessellation').then(m => ({ default: m.TuringTessellation })));
const DataHeist = React.lazy(() => import('./components/games/DataHeist').then(m => ({ default: m.DataHeist })));
const PromptSculptor = React.lazy(() => import('./components/games/PromptSculptor').then(m => ({ default: m.PromptSculptor })));
const SingularityCore = React.lazy(() => import('./components/games/SingularityCore').then(m => ({ default: m.SingularityCore })));
const PromptKnight = React.lazy(() => import('./components/games/PromptKnight').then(m => ({ default: m.PromptKnight })));
const DataKart = React.lazy(() => import('./components/games/DataKart').then(m => ({ default: m.DataKart })));
const AgentCrossing = React.lazy(() => import('./components/games/AgentCrossing').then(m => ({ default: m.AgentCrossing })));
const SuperMLBros = React.lazy(() => import('./components/games/SuperMLBros').then(m => ({ default: m.SuperMLBros })));
const PromptEmon = React.lazy(() => import('./components/games/PromptEmon').then(m => ({ default: m.PromptEmon })));
const TokenTactics = React.lazy(() => import('./components/games/TokenTactics').then(m => ({ default: m.TokenTactics })));
const LatentSpace = React.lazy(() => import('./components/games/LatentSpace').then(m => ({ default: m.LatentSpace })));
const SiliconValley = React.lazy(() => import('./components/games/SiliconValley').then(m => ({ default: m.SiliconValley })));
const PromptKitchen = React.lazy(() => import('./components/games/PromptKitchen').then(m => ({ default: m.PromptKitchen })));
const CyberSmash = React.lazy(() => import('./components/games/CyberSmash').then(m => ({ default: m.CyberSmash })));

// Growth Mechanism Components
import { ViralDashboard } from './components/growth/ViralDashboard';
import { UseCasesShowcase } from './components/growth/UseCasesShowcase';
import { SquadGauntlet } from './components/growth/SquadGauntlet';

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

    // ── Search & Filter State ──
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [difficultyFilter, setDifficultyFilter] = useState<'ALL' | Difficulty>('ALL');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'NEW'>('ALL');

    // ── Notifications ──
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([
        {
            id: 'n1',
            type: 'SYSTEM',
            title: 'Welcome to Yokaizen AI Labs',
            message: 'Your neural link has been established successfully. Begin exploring the scenarios.',
            timestamp: new Date(Date.now() - 3600000),
            isRead: false
        },
        {
            id: 'n2',
            type: 'AGENT',
            title: 'OpenClaw Ready',
            message: 'Autonomous execution kernel is online and awaiting objectives.',
            timestamp: new Date(Date.now() - 1800000),
            isRead: false
        }
    ]);

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
                <React.Suspense fallback={<div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-electric font-mono"><div className="w-16 h-16 border-4 border-electric border-t-transparent rounded-full animate-spin mb-4"></div><div>Synthesizing Neural Link...</div></div>}>
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
                            case GameType.PROMPT_KNIGHT: return <PromptKnight {...progressionProps} />;
                            case GameType.DATA_KART: return <DataKart {...progressionProps} />;
                            case GameType.AGENT_CROSSING: return <AgentCrossing {...progressionProps} />;
                            case GameType.SUPER_ML_BROS: return <SuperMLBros {...progressionProps} />;
                            case GameType.PROMPT_EMON: return <PromptEmon {...progressionProps} />;
                            case GameType.TOKEN_TACTICS: return <TokenTactics {...progressionProps} />;
                            case GameType.LATENT_SPACE: return <LatentSpace {...progressionProps} />;
                            case GameType.SILICON_VALLEY: return <SiliconValley {...progressionProps} />;
                            case GameType.PROMPT_KITCHEN: return <PromptKitchen {...progressionProps} />;
                            case GameType.CYBER_SMASH: return <CyberSmash {...progressionProps} />;
                            default: return <div className="text-white p-8">Game not implemented yet.</div>;
                        }
                    })()}
                </React.Suspense>
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
        return <React.Suspense fallback={<div className="h-screen w-screen bg-black" />}><ViralNeuralHack onComplete={redirectToOnboarding} /></React.Suspense>;
    }
    if (path === '/play/latency-tunnel') {
        return <React.Suspense fallback={<div className="h-screen w-screen bg-black" />}><ViralLatencyTunnel onComplete={redirectToOnboarding} /></React.Suspense>;
    }
    if (path === '/play/chaos-defense') {
        return <React.Suspense fallback={<div className="h-screen w-screen bg-black" />}><ViralChaosDefense onComplete={redirectToOnboarding} /></React.Suspense>;
    }
    if (path === '/play/prompt-injection') {
        return <React.Suspense fallback={<div className="h-screen w-screen bg-black" />}><ViralPromptInjection onComplete={redirectToOnboarding} /></React.Suspense>;
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

            <NotificationCenter
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
                notifications={notifications}
                onMarkAllRead={() => setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))}
                onClearAll={() => setNotifications([])}
                t={t}
            />

            {/* Settings Modal */}
            <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title={t('settings.title')} icon={<Settings size={24} className="text-electric" />}>
                <div className="space-y-6">
                    {/* Language Settings */}
                    <div className="bg-black/40 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center text-sm font-bold text-gray-300"><Globe size={18} className="mr-3 text-cyan-400" /> {t('settings.language')}</div>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {LANG_OPTIONS.map(({ code, label, flag }) => (
                                <button
                                    key={code}
                                    onClick={() => updateUser({ ...user, language: code as Language })}
                                    className={`text-xs font-bold px-3 py-2.5 rounded-lg border transition-all duration-300 flex items-center gap-2 ${user.language === code ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.2)] scale-[1.02]' : 'bg-black/50 border-white/10 text-gray-400 hover:text-white hover:border-white/30 hover:bg-white/5'}`}
                                >
                                    <span className="text-base">{flag}</span>
                                    <span className="truncate">{label}</span>
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
                            <div className="flex items-center text-sm font-bold text-gray-300 group-hover:text-white transition-colors"><Cpu size={18} className="mr-3 text-electric" /> Focus Mode</div>
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

            {/* ── AAA Sidebar Navigation ── */}
            <nav className="w-64 bg-black/90 backdrop-blur-3xl border-r border-white/10 flex-col hidden md:flex z-50 relative overflow-hidden">
                {/* Atmospheric sidebar glows */}
                <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-electric/20 to-transparent opacity-50 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-cyan-500/10 to-transparent pointer-events-none"></div>

                <div className="p-8 flex items-center space-x-4 text-white relative z-10">
                    <div className="relative">
                        <div className="absolute inset-0 bg-electric blur-md opacity-50 rounded-lg"></div>
                        <img src="/assets/aaa/logo.png" className="w-8 h-8 rounded-lg relative z-10 shadow-[0_0_15px_rgba(196,95,255,0.6)]" alt="Logo" />
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                        YOKAI<span className="text-transparent bg-clip-text bg-gradient-to-r from-electric to-cyan-400">ZEN</span>
                    </h1>
                </div>

                <div className="flex-1 space-y-2 p-4 relative z-10">
                    {[AppTab.HOME, AppTab.LEARN, AppTab.LAB, AppTab.LEADERBOARD, AppTab.GROWTH, AppTab.PROFILE].map(tab => {
                        const isActive = activeTab === tab;
                        return (
                            <button
                                key={tab}
                                onClick={() => handleTabSwitch(tab)}
                                className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-300 relative group overflow-hidden ${isActive
                                    ? 'bg-gradient-to-r from-electric/20 to-transparent text-white border border-electric/30 shadow-[0_0_20px_rgba(196,95,255,0.15)]'
                                    : 'text-gray-400 border border-transparent hover:bg-white/5 hover:text-white hover:border-white/10'
                                    }`}
                            >
                                {/* Active Indicator Bar */}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeNavIndicator"
                                        className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-electric rounded-r-full shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                                    />
                                )}

                                <div className={`flex items-center justify-center w-8 h-8 rounded-lg mr-3 transition-colors ${isActive ? 'bg-electric/20 text-electric' : 'bg-transparent text-gray-500 group-hover:text-gray-300'}`}>
                                    {tab === AppTab.HOME && <Home size={18} />}
                                    {tab === AppTab.LEARN && <Gamepad2 size={18} />}
                                    {tab === AppTab.LAB && <FlaskConical size={18} />}
                                    {tab === AppTab.LEADERBOARD && <Trophy size={18} />}
                                    {tab === AppTab.GROWTH && <Rocket size={18} />}
                                    {tab === AppTab.PROFILE && <User size={18} />}
                                </div>
                                <span className="font-bold text-xs uppercase tracking-[0.15em] relative z-10">{t(`nav.${tab.toLowerCase()}`)}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-white/5 bg-gradient-to-t from-black to-transparent relative z-10 flex flex-col gap-2">
                    {/* Desktop Bell Icon */}
                    <div className="flex justify-end px-2 mb-1 cursor-pointer group" onClick={() => setShowNotifications(true)}>
                        <div className="relative p-2 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                            <Bell size={18} className="text-gray-400 group-hover:text-white" />
                            {notifications.some(n => !n.isRead) && (
                                <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer group" onClick={() => handleTabSwitch(AppTab.PROFILE)}>
                        <div className="flex items-center space-x-3">
                            <div className="relative">
                                <img src={user.avatar} className="w-10 h-10 rounded-full border-2 border-gray-700 group-hover:border-electric transition-colors" />
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></div>
                            </div>
                            <div>
                                <div className="text-sm font-bold truncate w-24 text-gray-200 group-hover:text-white transition-colors">{user.name}</div>
                                <div className="text-[10px] text-electric font-bold tracking-widest uppercase">{t('ui.lvl')} {user.level}</div>
                            </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setShowSettings(true); }} className="text-gray-500 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all">
                            <Settings size={18} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                <div className="md:hidden p-4 bg-black border-b border-white/10 flex justify-between items-center z-40 relative">
                    <div className="flex items-center space-x-2 text-white">
                        <img src="/assets/aaa/logo.png" className="w-6 h-6 rounded-md" />
                        <h1 className="text-xl font-black">YOKAI<span className="text-electric">ZEN</span></h1>
                    </div>
                    <div className="flex items-center space-x-4 pl-2">
                        {/* Mobile Bell Icon */}
                        <div className="relative cursor-pointer" onClick={() => setShowNotifications(true)}>
                            <Bell size={20} className="text-gray-400 hover:text-white transition-colors" />
                            {notifications.some(n => !n.isRead) && (
                                <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-black animate-pulse"></div>
                            )}
                        </div>
                        <button onClick={() => setShowSettings(true)} className="text-gray-400 hover:text-white">
                            <Settings size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide bg-[#050505] pb-24 md:pb-0 relative z-10">
                    <ErrorBoundary>
                        {/* Global WebGL Backdrop for Hub Tabs */}
                        {activeTab === AppTab.HOME && (
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

                        <AnimatePresence mode="wait">
                            {activeTab === AppTab.HOME && (
                                <HomePage user={user} t={t} handleTabSwitch={handleTabSwitch} handleGameLaunch={handleGameLaunch} />
                            )}

                            {activeTab === AppTab.LEARN && (
                                <motion.div key="learn" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.35 }} className="h-full">
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
                                </motion.div>
                            )}

                            {activeTab === AppTab.LAB && (
                                <motion.div key="lab" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.35 }} className="h-full">
                                    <LabScreen
                                        user={user}
                                        onUpdateUser={updateUser}
                                        onTriggerPaywall={() => setShowPaywall(true)}
                                        t={t}
                                    />
                                </motion.div>
                            )}
                            {activeTab === AppTab.LEADERBOARD && (
                                <LeaderboardPage mobileLeaderboardView={mobileLeaderboardView} setMobileLeaderboardView={setMobileLeaderboardView} squads={squads} user={user} handleJoinSquad={handleJoinSquad} handleCreateSquad={handleCreateSquad} setShowPaywall={setShowPaywall} t={t} updateUser={updateUser} setSquads={setSquads} />
                            )}

                            {activeTab === AppTab.GROWTH && (
                                <motion.div key="growth" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35 }} className="flex flex-col h-full relative z-10">
                                    <ViralDashboard
                                        userReferralCode={user.id?.slice(0, 8).toUpperCase()}
                                        onNavigateToUseCases={() => { }}
                                    />
                                </motion.div>
                            )}
                            {activeTab === AppTab.PROFILE && (
                                <ProfilePage user={user} t={t} idCardRef={idCardRef} isGeneratingCard={isGeneratingCard} handleExportIDCard={handleExportIDCard} setShowSkillTree={setShowSkillTree} setActiveGeneratedGame={setActiveGeneratedGame} />
                            )}

                            {activeTab === AppTab.ADMIN && user.role === 'admin' && (
                                <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                                    <AdminPanel games={GAMES} onUpdateGames={() => { }} users={[user]} onUpdateUsers={() => { }} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </ErrorBoundary>
                </div>

                {/* ── MOBILE NAV BAR ── */}
                <BottomNav activeTab={activeTab} handleTabSwitch={handleTabSwitch} t={t} />
            </main>
        </div>
    );
};
