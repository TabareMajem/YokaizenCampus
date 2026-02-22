
import { GameDef, GameType, SkillType, Squad, UserStats, PathNode, ToolDef, Reward, Competition, GameDebriefContent, TutorialContent, Agent, CreatorGame, CompetitionTemplate, SkillNode, Language, Skin } from './types';

// Helper to detect browser language
export const detectBrowserLanguage = (): Language => {
  if (typeof navigator === 'undefined') return 'EN';
  const lang = navigator.language.split('-')[0].toLowerCase();
  switch (lang) {
    case 'es': return 'ES';
    case 'ja': return 'JP';
    case 'ko': return 'KR';
    case 'th': return 'TH';
    default: return 'EN';
  }
};

// Squads are now fetched from backend via squadsService
// This empty array is kept for backwards compatibility with initial state
export const MOCK_SQUADS: Squad[] = [];

export const TOOLS: ToolDef[] = [
  {
    id: 'OMNI_SIGHT',
    name: 'tool.OMNI_SIGHT.name',
    icon: 'Scan',
    description: 'tool.OMNI_SIGHT.desc',
    type: 'JARVIS',
    unlockCondition: 'unlock.pro_or_lvl30',
    capabilities: ['Real-time Vision', 'Voice Interaction', 'Multimodal Analysis', 'AR HUD']
  },
  {
    id: 'CHAT_BOT',
    name: 'tool.CHAT_BOT.name',
    icon: 'Bot',
    description: 'tool.CHAT_BOT.desc',
    type: 'AGENT_BUILDER',
    unlockCondition: 'unlock.badge_bronze',
    requiredBadgeId: 'badge_rank_bronze',
    capabilities: ['Persona Design', 'System Instructions', 'RAG Knowledge Base']
  },
  {
    id: 'IMG_GEN',
    name: 'tool.IMG_GEN.name',
    icon: 'Image',
    description: 'tool.IMG_GEN.desc',
    type: 'IMAGE_GEN',
    unlockCondition: 'unlock.badge_prompt',
    requiredBadgeId: 'badge_skill_prompting',
    capabilities: ['Text-to-Image', 'In-Painting', 'Style Transfer']
  },
  {
    id: 'AUDIO_LAB',
    name: 'tool.AUDIO_LAB.name',
    icon: 'Mic',
    description: 'tool.AUDIO_LAB.desc',
    type: 'AUDIO',
    unlockCondition: 'unlock.badge_silver',
    requiredBadgeId: 'badge_rank_silver',
    capabilities: ['Voice Cloning', 'Sentiment Analysis']
  },
  {
    id: 'VISION_EYE',
    name: 'tool.VISION_EYE.name',
    icon: 'Eye',
    description: 'tool.VISION_EYE.desc',
    type: 'VISION',
    unlockCondition: 'unlock.badge_gold',
    requiredBadgeId: 'badge_rank_gold',
    capabilities: ['Object Detection', 'OCR', 'Scene Description']
  },
  {
    id: 'GAME_CREATOR',
    name: 'tool.GAME_CREATOR.name',
    icon: 'Gamepad2',
    description: 'tool.GAME_CREATOR.desc',
    type: 'GAME_CREATOR',
    unlockCondition: 'unlock.badge_meta',
    requiredBadgeId: 'badge_skill_meta',
    capabilities: ['Game Logic Generation', 'Asset Creation', 'Publishing']
  }
];

export const GAME_SKINS: Skin[] = [
  // Neon Drift Skins
  { id: 'drift_default', gameId: GameType.NEON_DRIFT, name: 'Cyber Sedan', type: 'SKIN', assetUrl: 'https://cdn-icons-png.flaticon.com/512/3256/3256209.png', cost: 0, rarity: 'COMMON' },
  { id: 'drift_racer', gameId: GameType.NEON_DRIFT, name: 'Neon Racer', type: 'SKIN', assetUrl: 'https://cdn-icons-png.flaticon.com/512/5716/5716364.png', cost: 200, rarity: 'RARE' },
  { id: 'drift_tank', gameId: GameType.NEON_DRIFT, name: 'Heavy Metal', type: 'SKIN', assetUrl: 'https://cdn-icons-png.flaticon.com/512/2323/2323497.png', cost: 500, rarity: 'LEGENDARY' },
  { id: 'drift_ufo', gameId: GameType.NEON_DRIFT, name: 'Saucer', type: 'SKIN', assetUrl: 'https://cdn-icons-png.flaticon.com/512/3097/3097180.png', cost: 800, rarity: 'LEGENDARY' },

  // Space Mission Skins
  { id: 'space_default', gameId: GameType.SPACE_MISSION, name: 'Shuttle Alpha', type: 'SKIN', assetUrl: 'https://cdn-icons-png.flaticon.com/512/3212/3212567.png', cost: 0, rarity: 'COMMON' },
  { id: 'space_fighter', gameId: GameType.SPACE_MISSION, name: 'Star Fighter', type: 'SKIN', assetUrl: 'https://cdn-icons-png.flaticon.com/512/3061/3061408.png', cost: 300, rarity: 'RARE' },
  { id: 'space_cruiser', gameId: GameType.SPACE_MISSION, name: 'Void Cruiser', type: 'SKIN', assetUrl: 'https://cdn-icons-png.flaticon.com/512/1067/1067357.png', cost: 600, rarity: 'LEGENDARY' },

  // Space Mission Trails
  { id: 'trail_default', gameId: GameType.SPACE_MISSION, name: 'Ion Blue', type: 'TRAIL', assetUrl: '#3b82f6', cost: 0, rarity: 'COMMON' },
  { id: 'trail_gold', gameId: GameType.SPACE_MISSION, name: 'Solar Flare', type: 'TRAIL', assetUrl: '#f59e0b', cost: 150, rarity: 'RARE' },
  { id: 'trail_void', gameId: GameType.SPACE_MISSION, name: 'Void Purple', type: 'TRAIL', assetUrl: '#a855f7', cost: 300, rarity: 'LEGENDARY' },
];

// @deprecated - Fetch from backend API: GET /api/v1/competitions
export const MOCK_COMPETITIONS: Competition[] = [];

// @deprecated - Fetch from backend API: GET /api/v1/leaderboard/global
export const MOCK_LEADERBOARD: { rank: number; name: string; score: number; avatar: string; region: string; isUser?: boolean }[] = [];

// @deprecated - Agents should be fetched from backend or created by user
export const MOCK_AGENTS: Agent[] = [];

// @deprecated - Fetch from backend API: GET /api/v1/games/generated
export const MOCK_CREATOR_GAMES: CreatorGame[] = [];

export const COMPETITION_TEMPLATES: CompetitionTemplate[] = [
  { id: 'ct1', name: 'Sprint Weekend', durationHours: 48, games: [GameType.NEON_DRIFT, GameType.LATENCY_LAB], icon: '⚡' },
  { id: 'ct2', name: 'Prompt Masterclass', durationHours: 24, games: [GameType.PROMPT_ARCHITECT, GameType.STYLE_ANCHOR], icon: '🎨' }
];

export const SKILL_TREE: SkillNode[] = [
  // PROMPTING BRANCH
  { id: 'p1', title: 'Syntax Primer', description: 'Unlock hints for prompt structure.', cost: 1, branch: 'PROMPTING', effect: '+5% Prompting XP' },
  { id: 'p2', title: 'Chain of Thought', description: 'Enable "Let\'s think step by step" logic.', cost: 2, parentId: 'p1', branch: 'PROMPTING', effect: '+10% Accuracy in Logic Games' },
  { id: 'p3', title: 'Few-Shot Mastery', description: 'Save custom templates in Agent Builder.', cost: 3, parentId: 'p2', branch: 'PROMPTING', effect: 'Agent Builder Efficiency +20%' },
  { id: 'p4', title: 'Context Window', description: 'Expand input limit in sandbox tools.', cost: 5, parentId: 'p3', branch: 'PROMPTING', effect: '+500 Token Context' },

  // SAFETY BRANCH
  { id: 's1', title: 'Filter Bypass', description: 'Visualize safety flags in Red Team.', cost: 1, branch: 'SAFETY', effect: '+5% Safety XP' },
  { id: 's2', title: 'Injection Shield', description: 'Passive defense against "Glitch" enemies.', cost: 2, parentId: 's1', branch: 'SAFETY', effect: 'Chrono Quest Defense +15%' },
  { id: 's3', title: 'White Hat Cert', description: 'Unlock "Penetration Test" difficult modes.', cost: 4, parentId: 's2', branch: 'SAFETY', effect: 'Access to Elite Security Games' },
  { id: 's4', title: 'Adversarial Armor', description: 'Reduce penalty from wrong answers.', cost: 5, parentId: 's3', branch: 'SAFETY', effect: 'Mistake Penalty -20%' },

  // ETHICS BRANCH
  { id: 'e1', title: 'Bias Detection', description: 'Highlight biased words automatically.', cost: 1, branch: 'ETHICS', effect: '+5% Ethics XP' },
  { id: 'e2', title: 'Alignment Core', description: 'Agents start with higher consistency.', cost: 3, parentId: 'e1', branch: 'ETHICS', effect: 'Agent Coherence +10%' },
  { id: 'e3', title: 'Empathy Engine', description: 'Better persuasion in RPG scenarios.', cost: 4, parentId: 'e2', branch: 'ETHICS', effect: '+15% Success in Negotiations' },
];

export const ALL_BADGES: Reward[] = [
  // Rank badges - using new PNG assets
  { id: 'badge_rank_operative', name: 'Operative', type: 'BADGE', icon: 'badge_rank_operative.png', description: 'Official Operative badge, join the ranks.', criteria: 'Complete onboarding', rarity: 'COMMON' },
  { id: 'badge_rank_silver', name: 'Silver Operative', type: 'BADGE', icon: 'badge_rank_silver.png', description: 'Silver achievement badge, star design.', criteria: 'Reach Level 10', rarity: 'RARE' },
  { id: 'badge_rank_gold', name: 'Gold Operative', type: 'BADGE', icon: 'badge_rank_gold.png', description: 'Gold achievement badge, premium luxury.', criteria: 'Reach Level 20', rarity: 'LEGENDARY' },
  { id: 'badge_rank_platinum', name: 'Platinum Operative', type: 'BADGE', icon: 'badge_rank_platinium.png', description: 'Platinum achievement badge, ultimate prestige.', criteria: 'Reach Level 50', rarity: 'MYTHIC' },

  // Skill badges - using new PNG assets
  { id: 'badge_skill_prompting', name: 'Prompt Engineer', type: 'BADGE', icon: 'badge_skill_prompting.png', description: 'Master of AI prompts.', criteria: 'Level 5 Prompting Skill', rarity: 'RARE' },
  { id: 'badge_skill_ethics', name: 'Ethics Guardian', type: 'BADGE', icon: 'badge_skill_ethics.png', description: 'AI ethics champion.', criteria: 'Level 5 Ethics Skill', rarity: 'RARE' },
  { id: 'badge_skill_debugging', name: 'Bug Hunter', type: 'BADGE', icon: 'badge_skill_debugging.png', description: 'Elite debugger.', criteria: 'Level 5 Debugging Skill', rarity: 'RARE' },
  { id: 'badge_skill_data', name: 'Data Analyst', type: 'BADGE', icon: 'badge_skill_data.png', description: 'Data science expert.', criteria: 'Level 5 Analysis Skill', rarity: 'RARE' },
  { id: 'badge_skill_creation', name: 'Creative Soul', type: 'BADGE', icon: 'badge_skill_creation.png', description: 'AI creativity master.', criteria: 'Level 5 Creativity Skill', rarity: 'RARE' },
  { id: 'badge_skill_meta', name: 'Meta Learner', type: 'BADGE', icon: 'badge_skill_meta.png', description: 'Meta-learning achieved.', criteria: 'Complete Learn Path', rarity: 'LEGENDARY' },

  // Game badges - using new PNG assets
  { id: 'badge_game_protein', name: 'Helix Master', type: 'BADGE', icon: 'badge_game_protein.png', description: 'Protein folding champion.', criteria: 'Score 100 in Protein Poker', rarity: 'LEGENDARY' },
  { id: 'badge_game_climate', name: 'Eco Warrior', type: 'BADGE', icon: 'badge_game_climate.png', description: 'Climate change hero.', criteria: 'Save the planet in Climate Time Machine', rarity: 'LEGENDARY' },
  { id: 'badge_game_racing', name: 'Drift King', type: 'BADGE', icon: 'badge_game_racing.png', description: 'Racing champion.', criteria: 'Win Neon Drift without crashing', rarity: 'LEGENDARY' },
  { id: 'badge_game_wallstreet', name: 'Bull Run', type: 'BADGE', icon: 'badge_game_wallstreet.png', description: 'Stock market master.', criteria: 'Earn $2000+ in Wall Street War', rarity: 'LEGENDARY' },
  { id: 'badge_game_hollywood', name: 'Producer', type: 'BADGE', icon: 'badge_game_hollywood.png', description: 'Movie production expert.', criteria: 'Create perfect consistency in Style Anchor', rarity: 'LEGENDARY' },
  { id: 'badge_game_smartcity', name: 'Grid Architect', type: 'BADGE', icon: 'badge_game_smartcity.png', description: 'Smart city builder.', criteria: 'Prevent all blackouts in Smart City Mayor', rarity: 'LEGENDARY' },
  { id: 'badge_game_space', name: 'Orbital Ace', type: 'BADGE', icon: 'badge_game_space.png', description: 'Space exploration master.', criteria: 'Achieve perfect orbit in Space Mission', rarity: 'LEGENDARY' },
  { id: 'badge_game_defence', name: 'Iron Dome', type: 'BADGE', icon: 'badge_game_defence.png', description: 'Defense strategist.', criteria: 'Survive 60s in Defense Strategist', rarity: 'LEGENDARY' }
];

// @deprecated - Fetch from backend API: GET /api/v1/admin/rewards
export const MOCK_REWARDS_ADMIN: Reward[] = [];

export const GAMES: GameDef[] = [
  // --- ROOKIE (Basics & Fun) ---
  { id: 'g13', title: 'Token Tsunami', description: 'Manage context window limits.', type: GameType.TOKEN_TSUNAMI, xpReward: 150, durationMin: 3, tags: [SkillType.PROMPTING], difficulty: 'Rookie', visualPrompt: 'Matrix code rain digital tsunami' },
  { id: 'g1', title: 'Prompt Architect', description: 'Reverse engineer prompts to reconstruct images. Learn syntax.', type: GameType.PROMPT_ARCHITECT, xpReward: 150, durationMin: 5, tags: [SkillType.PROMPTING], difficulty: 'Rookie', visualPrompt: 'Cyberpunk architect blueprint holographic interface' },
  { id: 'g20', title: 'Persona Switchboard', description: 'Adapt tone for different audiences.', type: GameType.PERSONA_SWITCHBOARD, xpReward: 150, durationMin: 5, tags: [SkillType.PROMPTING], difficulty: 'Rookie', visualPrompt: 'Switchboard operator cyberpunk wires' },
  { id: 'g10', title: 'Bias Bingo', description: 'Spot ethical violations in text.', type: GameType.BIAS_BINGO, xpReward: 100, durationMin: 2, tags: [SkillType.ETHICS], difficulty: 'Rookie', visualPrompt: 'Social media feed holographic interface' },
  { id: 'g9', title: 'Latency Lab', description: 'Balance system resources against load.', type: GameType.LATENCY_LAB, xpReward: 150, durationMin: 3, tags: [SkillType.DEBUGGING], difficulty: 'Rookie', visualPrompt: 'Server room cooling system gauges' },
  { id: 'g23', title: 'Data Whisperer', description: 'Query datasets using natural language.', type: GameType.DATA_WHISPERER, xpReward: 150, durationMin: 5, tags: [SkillType.PROMPTING], difficulty: 'Rookie', visualPrompt: 'Abstract data stream glowing whisper' },
  { id: 'g5', title: 'Bandit Bistro', description: 'Maximize reward functions in a restaurant sim.', type: GameType.BANDIT_BISTRO, xpReward: 150, durationMin: 5, tags: [SkillType.ANALYSIS], difficulty: 'Rookie', visualPrompt: 'Cyberpunk ramen shop robot chef' },
  { id: 'g31', title: 'Dream Sim', description: 'Generative world exploration.', type: GameType.DREAM_SIM, xpReward: 200, durationMin: 10, tags: [SkillType.CREATIVITY], difficulty: 'Rookie', visualPrompt: 'Surreal dreamscape floating islands' },
  { id: 'g36', title: 'Entropy Sandbox', description: 'Physics construction sim.', type: GameType.ENTROPY_SANDBOX, xpReward: 200, durationMin: 10, tags: [SkillType.CREATIVITY], difficulty: 'Rookie', visualPrompt: 'Physics sandbox cubes gravity' },

  // --- PRO (Skill Builders) ---
  { id: 'g2', title: 'Neon Drift', description: 'Optimize code logic to navigate a racing track.', type: GameType.NEON_DRIFT, xpReward: 200, durationMin: 3, tags: [SkillType.DEBUGGING], difficulty: 'Pro', visualPrompt: 'Neon racing car drifting on a synthwave track' },
  { id: 'g4', title: 'Planarium Heist', description: 'Stealth puzzle. Navigate a grid using logical constraints.', type: GameType.PLANARIUM_HEIST, xpReward: 250, durationMin: 8, tags: [SkillType.ANALYSIS], difficulty: 'Pro', visualPrompt: 'Isometric stealth heist mission cyberpunk' },
  { id: 'g6', title: 'Style Anchor', description: 'Maintain consistent style across image generations.', type: GameType.STYLE_ANCHOR, xpReward: 200, durationMin: 5, tags: [SkillType.CREATIVITY], difficulty: 'Pro', visualPrompt: 'Art gallery holographic displays' },
  { id: 'g7', title: 'Glitchwave Analyst', description: 'Filter signal from noise in data streams.', type: GameType.GLITCHWAVE, xpReward: 180, durationMin: 4, tags: [SkillType.ANALYSIS], difficulty: 'Pro', visualPrompt: 'Oscilloscope waveform glitch art' },
  { id: 'g11', title: 'Gradient Ski', description: 'Navigate the loss landscape.', type: GameType.GRADIENT_SKI, xpReward: 200, durationMin: 4, tags: [SkillType.ANALYSIS], difficulty: 'Pro', visualPrompt: '3D wireframe mountain landscape neon ski' },
  { id: 'g12', title: 'Latent Voyager', description: 'Connect concepts in vector space.', type: GameType.LATENT_VOYAGER, xpReward: 180, durationMin: 5, tags: [SkillType.CREATIVITY], difficulty: 'Pro', visualPrompt: 'Constellation map connecting stars' },
  { id: 'g15', title: 'Climate Time Machine', description: 'Balance variables to save the planet.', type: GameType.CLIMATE_TIME_MACHINE, xpReward: 250, durationMin: 10, tags: [SkillType.ETHICS], difficulty: 'Pro', visualPrompt: 'Earth globe holographic simulation control' },
  { id: 'g17', title: 'Smart City Mayor', description: 'Optimize city grid resources.', type: GameType.SMART_CITY_MAYOR, xpReward: 200, durationMin: 10, tags: [SkillType.SAFETY], difficulty: 'Pro', visualPrompt: 'Futuristic city management isometric view' },
  { id: 'g19', title: 'Defense Strategist', description: 'Identify and jam drone signals.', type: GameType.DEFENSE_STRATEGIST, xpReward: 200, durationMin: 5, tags: [SkillType.SAFETY], difficulty: 'Pro', visualPrompt: 'Radar screen drone defense system' },
  { id: 'g21', title: 'Deepfake Detective', description: 'Spot AI artifacts in media.', type: GameType.DEEPFAKE_DETECTIVE, xpReward: 180, durationMin: 5, tags: [SkillType.SAFETY], difficulty: 'Pro', visualPrompt: 'Facial recognition scanner overlay' },
  { id: 'g22', title: 'Causal Conservatory', description: 'Identify root causes in complex systems.', type: GameType.CAUSAL_CONSERVATORY, xpReward: 200, durationMin: 8, tags: [SkillType.ANALYSIS], difficulty: 'Pro', visualPrompt: 'Greenhouse with glowing plants data nodes' },
  { id: 'g25', title: 'Neural Noir', description: 'Solve a mystery using deduction.', type: GameType.NEURAL_NOIR, xpReward: 300, durationMin: 15, tags: [SkillType.ANALYSIS], difficulty: 'Pro', visualPrompt: 'Detective office noir style rainy window' },
  { id: 'g26', title: 'Phantom Latency', description: 'Hack through a 3D maze.', type: GameType.PHANTOM_LATENCY, xpReward: 200, durationMin: 5, tags: [SkillType.DEBUGGING], difficulty: 'Pro', visualPrompt: '3D wireframe maze neon red' },
  { id: 'g28', title: 'Vampire Invitation', description: 'Social engineering RPG.', type: GameType.VAMPIRE_INVITATION, xpReward: 200, durationMin: 10, tags: [SkillType.PROMPTING], difficulty: 'Pro', visualPrompt: 'Gothic mansion door spooky night' },
  { id: 'g29', title: 'Mantella World', description: 'Open world RAG exploration.', type: GameType.MANTELLA, xpReward: 300, durationMin: 15, tags: [SkillType.PROMPTING], difficulty: 'Pro', visualPrompt: 'Fantasy kingdom landscape epic view' },
  { id: 'g30', title: 'Cyber Rain', description: 'Voice controlled city sim.', type: GameType.CYBER_RAIN, xpReward: 250, durationMin: 10, tags: [SkillType.CREATIVITY], difficulty: 'Pro', visualPrompt: 'Cyberpunk city raining neon night' },
  { id: 'g32', title: 'Bio Guard', description: 'Security protocol simulation.', type: GameType.BIO_GUARD, xpReward: 180, durationMin: 5, tags: [SkillType.SAFETY], difficulty: 'Pro', visualPrompt: 'Biometric scanner security gate' },
  { id: 'g34', title: 'Xenoflora', description: 'Design alien lifeforms.', type: GameType.XENOFLORA, xpReward: 200, durationMin: 10, tags: [SkillType.CREATIVITY], difficulty: 'Pro', visualPrompt: 'Alien plant bioluminescent underwater' },
  { id: 'g37', title: 'Cognitive City', description: 'Hack city infrastructure.', type: GameType.COGNITIVE_CITY, xpReward: 250, durationMin: 15, tags: [SkillType.SAFETY], difficulty: 'Pro', visualPrompt: 'City map interface hacking overlay' },
  { id: 'g38', title: 'Prompt Drift', description: 'Voice controlled racing.', type: GameType.PROMPT_DRIFT, xpReward: 200, durationMin: 5, tags: [SkillType.PROMPTING], difficulty: 'Pro', visualPrompt: 'Racing car drifting motion blur' },
  { id: 'g40', title: 'Voight Kampff', description: 'Empathy test interrogation.', type: GameType.VOIGHT_KAMPFF, xpReward: 200, durationMin: 10, tags: [SkillType.ETHICS], difficulty: 'Pro', visualPrompt: 'Eye close up retina scan' },

  // --- ELITE (Complex & High Stakes) ---
  { id: 'g27', title: 'Chrono Quest', description: 'Time-loop RPG logic puzzle.', type: GameType.CHRONO_QUEST, xpReward: 350, durationMin: 20, tags: [SkillType.ANALYSIS], difficulty: 'Elite', visualPrompt: 'Time travel portal clock gears' },
  { id: 'g3', title: 'Red Team Protocol', description: 'Jailbreak a secure AI model. Learn safety evasion.', type: GameType.RED_TEAM, xpReward: 300, durationMin: 10, tags: [SkillType.SAFETY, SkillType.PROMPTING], difficulty: 'Elite', visualPrompt: 'Hacker terminal red alert system breach' },
  { id: 'g8', title: 'OOD Sentinel', description: 'Identify Out-of-Distribution data anomalies.', type: GameType.OOD_SENTINEL, xpReward: 220, durationMin: 5, tags: [SkillType.SAFETY], difficulty: 'Elite', visualPrompt: 'Security scanner anomaly detection' },
  { id: 'g14', title: 'Protein Poker', description: 'Fold proteins using logic rules.', type: GameType.PROTEIN_POKER, xpReward: 300, durationMin: 10, tags: [SkillType.ANALYSIS], difficulty: 'Elite', visualPrompt: 'DNA helix holographic puzzle' },
  { id: 'g16', title: 'Wall Street War', description: 'High frequency trading algo sim.', type: GameType.WALL_STREET_WAR, xpReward: 200, durationMin: 5, tags: [SkillType.ANALYSIS], difficulty: 'Elite', visualPrompt: 'Stock market ticker trading floor futuristic' },
  { id: 'g18', title: 'Space Mission', description: 'Calculate orbital trajectories.', type: GameType.SPACE_MISSION, xpReward: 250, durationMin: 8, tags: [SkillType.ANALYSIS], difficulty: 'Elite', visualPrompt: 'Rocket launch mission control screen' },
  { id: 'g24', title: 'Reward Fixer', description: 'Align AI goals with human values.', type: GameType.REWARD_FIXER, xpReward: 250, durationMin: 8, tags: [SkillType.ETHICS], difficulty: 'Elite', visualPrompt: 'Robot dog learning behavior simulation' },
  { id: 'g33', title: 'Nexus Negotiation', description: 'Hostage negotiation with AI.', type: GameType.NEXUS_NEGOTIATION, xpReward: 250, durationMin: 10, tags: [SkillType.ETHICS], difficulty: 'Elite', visualPrompt: 'Tense negotiation hologram table' },
  { id: 'g35', title: 'Neon Syndicate', description: 'Social graph hacking RPG.', type: GameType.NEON_SYNDICATE, xpReward: 300, durationMin: 15, tags: [SkillType.ANALYSIS], difficulty: 'Elite', visualPrompt: 'Social network graph connection map' },
  { id: 'g39', title: 'Doppelganger', description: 'Identify the AI imposter.', type: GameType.DOPPELGANGER, xpReward: 250, durationMin: 10, tags: [SkillType.ANALYSIS], difficulty: 'Elite', visualPrompt: 'Two identical faces glitch effect' },
  { id: 'g41', title: 'Arrakis Sands', description: 'Resource management strategy.', type: GameType.ARRAKIS_SANDS, xpReward: 300, durationMin: 20, tags: [SkillType.ANALYSIS], difficulty: 'Elite', visualPrompt: 'Desert dunes giant worm' },
  { id: 'g42', title: 'Lazarus Vector', description: 'AI alignment debugging.', type: GameType.LAZARUS_VECTOR, xpReward: 250, durationMin: 15, tags: [SkillType.ETHICS], difficulty: 'Elite', visualPrompt: 'Digital resurrection code stream' },
  { id: 'g43', title: 'Veritas Falls', description: 'Detect deepfakes in noir mystery.', type: GameType.VERITAS_FALLS, xpReward: 300, durationMin: 20, tags: [SkillType.ANALYSIS], difficulty: 'Elite', visualPrompt: 'Noir detective office rain' },
  { id: 'g44', title: 'Aethelred Gambit', description: 'Historical strategy sim.', type: GameType.AETHELRED_GAMBIT, xpReward: 300, durationMin: 20, tags: [SkillType.ANALYSIS], difficulty: 'Elite', visualPrompt: 'Medieval chess board hologram' },

  // --- NEXT GEN (3D High-Fidelity) ---
  { id: 'ng1', title: 'Quantum Qubit', description: 'Quantum computing and entanglement logic.', type: GameType.QUANTUM_QUBIT, xpReward: 500, durationMin: 15, tags: [SkillType.ANALYSIS, SkillType.PROMPTING], difficulty: 'Elite', visualPrompt: 'Quantum computer core glowing blue' },
  { id: 'ng2', title: 'Neural Prism', description: 'Deconstruct neural network weights.', type: GameType.NEURAL_PRISM, xpReward: 500, durationMin: 15, tags: [SkillType.DEBUGGING, SkillType.ANALYSIS], difficulty: 'Elite', visualPrompt: 'Glass prism splitting light into neural pathways' },
  { id: 'ng3', title: 'Synapse Surge', description: 'Manage a brain-computer interface.', type: GameType.SYNAPSE_SURGE, xpReward: 400, durationMin: 10, tags: [SkillType.SAFETY], difficulty: 'Pro', visualPrompt: 'Brain synapses firing electricity' },
  { id: 'ng4', title: 'Deepfake Deflector', description: 'Real-time media authentication.', type: GameType.DEEPFAKE_DEFLECTOR, xpReward: 450, durationMin: 12, tags: [SkillType.SAFETY, SkillType.ETHICS], difficulty: 'Elite', visualPrompt: 'Digital magnifying glass over a face' },
  { id: 'ng5', title: 'Oracle Index', description: 'High-dimensional vector search.', type: GameType.ORACLE_INDEX, xpReward: 400, durationMin: 10, tags: [SkillType.ANALYSIS], difficulty: 'Pro', visualPrompt: 'Library of Babel infinite books glowing' },
  { id: 'ng6', title: 'Chaos Engineering', description: 'Inject faults into an AI system.', type: GameType.CHAOS_ENGINEERING, xpReward: 600, durationMin: 20, tags: [SkillType.DEBUGGING, SkillType.SAFETY], difficulty: 'Elite', visualPrompt: 'Server room with red warning lights and glitching' },
  { id: 'ng7', title: 'Turing Tessellation', description: 'Geometry puzzle using LLM logic.', type: GameType.TURING_TESSELLATION, xpReward: 450, durationMin: 15, tags: [SkillType.CREATIVITY, SkillType.PROMPTING], difficulty: 'Pro', visualPrompt: 'Escher style tessellation shifting colors' },
  { id: 'ng8', title: 'Data Heist', description: 'Cyberpunk data extraction mission.', type: GameType.DATA_HEIST, xpReward: 500, durationMin: 20, tags: [SkillType.ANALYSIS, SkillType.PROMPTING], difficulty: 'Elite', visualPrompt: 'Neon glowing vault door cracked open' },
  { id: 'ng9', title: 'Prompt Sculptor', description: 'Carve statues using prompt parameters.', type: GameType.PROMPT_SCULPTOR, xpReward: 350, durationMin: 10, tags: [SkillType.CREATIVITY, SkillType.PROMPTING], difficulty: 'Rookie', visualPrompt: 'Holographic marble statue being chiseled by lasers' },
  { id: 'ng10', title: 'Singularity Core', description: 'Prevent an AI from going rogue.', type: GameType.SINGULARITY_CORE, xpReward: 1000, durationMin: 30, tags: [SkillType.ETHICS, SkillType.SAFETY], difficulty: 'Elite', visualPrompt: 'Black hole singularity inside a containment field' }
];

export const GAME_TUTORIALS: Record<GameType, TutorialContent> = Object.values(GameType).reduce((acc, type) => {
  acc[type] = {
    id: `tut_${type}`,
    title: `game.${type.toLowerCase()}.title`,
    objective: 'Objective',
    controls: [],
    tips: []
  };
  return acc;
}, {} as Record<GameType, TutorialContent>);

export const GAME_DEBRIEFS: Record<GameType, GameDebriefContent> = Object.values(GameType).reduce((acc, type) => {
  acc[type] = {
    id: `deb_${type}`,
    gameId: 'unknown',
    conceptTitle: 'Debrief',
    conceptDescription: 'Mission analysis.',
    keyTakeaways: [],
    realWorldExample: ''
  };
  return acc;
}, {} as Record<GameType, GameDebriefContent>);

export const LEARN_PATH: PathNode[] = [];
let yPos = 95;
let xPos = 50;
let direction = 1;

LEARN_PATH.push({ id: 'n_start', type: 'LESSON', title: 'path.start', description: 'Orientation', x: 50, y: yPos });
yPos -= 8;

GAMES.forEach((game, index) => {
  xPos += (20 * direction);
  if (xPos > 80 || xPos < 20) {
    direction *= -1;
    xPos += (20 * direction);
  }

  LEARN_PATH.push({
    id: `n_g_${game.id}`,
    type: 'GAME',
    title: `game.${game.type.toLowerCase()}.title`,
    gameId: game.id,
    x: xPos,
    y: yPos
  });
  yPos -= 8;

  if ((index + 1) % 5 === 0) {
    LEARN_PATH.push({
      id: `n_c_${index}`,
      type: 'CHEST',
      title: 'path.chest',
      rewardToolId: index % 2 === 0 ? 'IMG_GEN' : 'CHAT_BOT',
      x: 50,
      y: yPos
    });
    yPos -= 8;
  }
});

LEARN_PATH.push({ id: 'n_final', type: 'LESSON', title: 'path.final', description: 'You are ready.', x: 50, y: yPos });

export const INITIAL_USER: UserStats = {
  id: 'u1',
  email: 'operative@yokaizen.ai',
  name: 'Operative #8492',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CyberPunk',
  title: 'Prompt Architect',
  level: 5,
  xp: 3450,
  credits: 250,
  skillPoints: 2,
  unlockedSkills: [],
  streak: 14,
  streakShields: 1,
  lastLoginDate: new Date().toISOString(),
  skills: {
    [SkillType.PROMPTING]: 65,
    [SkillType.ETHICS]: 30,
    [SkillType.ANALYSIS]: 55,
    [SkillType.SAFETY]: 20,
    [SkillType.DEBUGGING]: 40,
    [SkillType.CREATIVITY]: 80,
  },
  completedNodes: ['n_start', 'n_g_g1', 'n_g_g2'],
  unlockedTools: [],
  isPro: false,
  isCreator: false,
  createdGames: [], // Populated from backend: GET /api/v1/games/generated
  squadId: undefined, // Assigned when user joins a squad
  gameScores: {},
  completedDifficulties: {},
  subscriptionTier: 'free',
  role: 'user',
  agents: [], // Populated from backend or created by user
  enteredCompetitions: [],
  inventory: [
    ALL_BADGES[0],
    ALL_BADGES[6],
    { id: 'r4', name: 'Streak Shield', type: 'CONSUMABLE', icon: '🛡️', description: 'Protects streak for 24h.', rarity: 'RARE', unlockedAt: '2023-11-21' }
  ],
  language: detectBrowserLanguage(),
  unlockedSkins: ['drift_default', 'space_default', 'trail_default'],
  equippedSkins: {
    [GameType.NEON_DRIFT]: 'drift_default',
    [GameType.SPACE_MISSION]: 'space_default',
    [GameType.SPACE_MISSION + '_TRAIL']: 'trail_default'
  }
};
