
import React, { useState } from 'react';
import { GameDef, GameType, SkillType } from '../../types';
import { 
  Zap, Shield, Search, Code, Brain, Globe, 
  Terminal, Cpu, Activity, Lock, Eye, 
  Database, Layers, Command, GitMerge, 
  Ghost, Car, Anchor, CloudRain, Moon, 
  Users, Fingerprint, Dna, Crosshair, 
  Sparkles, Sword, AlertTriangle, FlaskConical,
  Map, Grid, Shuffle, Hexagon, ShieldAlert, Heart,
  Sun, Move, Hourglass, Utensils, Leaf, Compass, Flag,
  Radio, Radar, TrendingDown, TrendingUp, Rocket, 
  MessageSquare, Scan, Box
} from 'lucide-react';

interface GameCoverProps {
  game: GameDef;
  className?: string;
  iconSize?: number;
}

export const GameCover: React.FC<GameCoverProps> = ({ game, className = '', iconSize = 120 }) => {
  const [imgError, setImgError] = useState(false);

  // --- ICON MAPPING ---
  const getIcon = () => {
    switch (game.type) {
      // Flagship & New
      case GameType.AETHELRED_GAMBIT: return <Hexagon size={iconSize} />;
      case GameType.LAZARUS_VECTOR: return <Hourglass size={iconSize} />;
      case GameType.ARRAKIS_SANDS: return <Sun size={iconSize} />;
      case GameType.DOPPELGANGER: return <Ghost size={iconSize} />;
      case GameType.PROMPT_DRIFT: return <Car size={iconSize} />; // Drift car
      case GameType.NEON_DRIFT: return <Flag size={iconSize} />; // Racing flag
      case GameType.COGNITIVE_CITY: return <Map size={iconSize} />;
      case GameType.NEON_SYNDICATE: return <Users size={iconSize} />;
      case GameType.ENTROPY_SANDBOX: return <Box size={iconSize} />;
      case GameType.XENOFLORA: return <Anchor size={iconSize} />;
      case GameType.BIO_GUARD: return <Fingerprint size={iconSize} />;
      case GameType.DREAM_SIM: return <Moon size={iconSize} />;
      case GameType.CYBER_RAIN: return <CloudRain size={iconSize} />;
      case GameType.MANTELLA: return <Globe size={iconSize} />;
      case GameType.VAMPIRE_INVITATION: return <MessageSquare size={iconSize} />;
      case GameType.CHRONO_QUEST: return <Sword size={iconSize} />;
      case GameType.PHANTOM_LATENCY: return <Cpu size={iconSize} />;
      case GameType.NEURAL_NOIR: return <Search size={iconSize} />;
      case GameType.NEXUS_NEGOTIATION: return <ShieldAlert size={iconSize} />;
      case GameType.VOIGHT_KAMPFF: return <Scan size={iconSize} />;
      
      // Core
      case GameType.PROMPT_ARCHITECT: return <Terminal size={iconSize} />;
      case GameType.RED_TEAM: return <Lock size={iconSize} />;
      case GameType.PLANARIUM_HEIST: return <Grid size={iconSize} />;
      case GameType.BANDIT_BISTRO: return <Utensils size={iconSize} />;
      case GameType.STYLE_ANCHOR: return <Sparkles size={iconSize} />;
      case GameType.GLITCHWAVE: return <Radio size={iconSize} />;
      case GameType.OOD_SENTINEL: return <Radar size={iconSize} />;
      case GameType.LATENCY_LAB: return <FlaskConical size={iconSize} />;
      case GameType.BIAS_BINGO: return <AlertTriangle size={iconSize} />;
      case GameType.GRADIENT_SKI: return <TrendingDown size={iconSize} />;
      case GameType.LATENT_VOYAGER: return <Compass size={iconSize} />;
      case GameType.TOKEN_TSUNAMI: return <Layers size={iconSize} />;
      case GameType.PROTEIN_POKER: return <Dna size={iconSize} />;
      case GameType.CLIMATE_TIME_MACHINE: return <Leaf size={iconSize} />;
      case GameType.WALL_STREET_WAR: return <TrendingUp size={iconSize} />;
      case GameType.SMART_CITY_MAYOR: return <Zap size={iconSize} />;
      case GameType.SPACE_MISSION: return <Rocket size={iconSize} />;
      case GameType.DEFENSE_STRATEGIST: return <Shield size={iconSize} />;
      case GameType.PERSONA_SWITCHBOARD: return <Shuffle size={iconSize} />;
      case GameType.DEEPFAKE_DETECTIVE: return <Eye size={iconSize} />;
      case GameType.CAUSAL_CONSERVATORY: return <GitMerge size={iconSize} />;
      case GameType.DATA_WHISPERER: return <Database size={iconSize} />;
      case GameType.REWARD_FIXER: return <Heart size={iconSize} />;
      
      // Fallback based on Skill Tag
      default:
        if (game.tags.includes(SkillType.SAFETY)) return <Shield size={iconSize} />;
        if (game.tags.includes(SkillType.CREATIVITY)) return <Sparkles size={iconSize} />;
        if (game.tags.includes(SkillType.ANALYSIS)) return <Search size={iconSize} />;
        return <Brain size={iconSize} />;
    }
  };

  // --- COLOR MAPPING ---
  const getGradientStyle = () => {
      let start = '#1f2937'; // gray-800
      let end = '#000000';   // black

      if (game.tags.includes(SkillType.CREATIVITY)) { start = '#be185d'; end = '#4a044e'; }
      else if (game.tags.includes(SkillType.SAFETY)) { start = '#b91c1c'; end = '#450a0a'; }
      else if (game.tags.includes(SkillType.ETHICS)) { start = '#047857'; end = '#022c22'; }
      else if (game.tags.includes(SkillType.ANALYSIS)) { start = '#1d4ed8'; end = '#1e3a8a'; }
      else if (game.tags.includes(SkillType.DEBUGGING)) { start = '#7c3aed'; end = '#4c1d95'; }
      else if (game.tags.includes(SkillType.PROMPTING)) { start = '#c026d3'; end = '#701a75'; }

      if (game.type === GameType.NEON_DRIFT) { start = '#0891b2'; end = '#164e63'; }
      if (game.type === GameType.BANDIT_BISTRO) { start = '#d97706'; end = '#78350f'; }
      if (game.type === GameType.NEURAL_NOIR) { start = '#334155'; end = '#0f172a'; }
      if (game.type === GameType.DOPPELGANGER) { start = '#9f1239'; end = '#000000'; }
      if (game.type === GameType.BIO_GUARD) { start = '#065f46'; end = '#000000'; }
      if (game.type === GameType.NEXUS_NEGOTIATION) { start = '#1e3a8a'; end = '#172554'; }
      if (game.type === GameType.VOIGHT_KAMPFF) { start = '#064e3b'; end = '#000000'; }
      if (game.type === GameType.ARRAKIS_SANDS) { start = '#78350f'; end = '#451a03'; }
      if (game.type === GameType.LAZARUS_VECTOR) { start = '#7f1d1d'; end = '#450a0a'; }
      if (game.type === GameType.AETHELRED_GAMBIT) { start = '#4c1d95'; end = '#0f172a'; }

      return { background: `linear-gradient(135deg, ${start}, ${end})` };
  };

  // Generate Dynamic Image URL from Prompt
  const imageUrl = game.visualPrompt 
    ? `https://image.pollinations.ai/prompt/${encodeURIComponent(game.visualPrompt)}?width=480&height=270&nologo=true&seed=${game.id}`
    : game.assetBanner;

  return (
    <div className={`relative overflow-hidden bg-gray-900 ${className}`}>
        {/* 1. Image Layer (Dynamic AI Art) */}
        {!imgError && imageUrl && (
            <div className="absolute inset-0 z-0">
                <img 
                    src={imageUrl} 
                    alt="" 
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                    style={{ filter: 'grayscale(30%) contrast(110%) brightness(0.9)' }} 
                    onError={() => setImgError(true)}
                    loading="lazy"
                />
            </div>
        )}

        {/* 2. Color Tint Layer (Gradient) */}
        <div 
            className="absolute inset-0 z-0 opacity-70 mix-blend-multiply" 
            style={getGradientStyle()}
        ></div>
        
        {/* 3. Highlight Layer (Neon Pop) */}
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-black via-transparent to-white/10 opacity-40 mix-blend-overlay"></div>

        {/* 4. Tech Pattern Overlay */}
        <div className="absolute inset-0 opacity-20 pointer-events-none z-10">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" opacity="0.3"/>
                    </pattern>
                    <pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse">
                        <circle cx="1" cy="1" r="1" fill="white" opacity="0.3"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill={game.type === GameType.NEON_DRIFT || game.type === GameType.PLANARIUM_HEIST ? "url(#grid)" : "url(#dots)"} />
            </svg>
        </div>

        {/* 5. Large Watermark Icon */}
        <div className="absolute -right-8 -bottom-8 opacity-20 transform rotate-[-15deg] text-white pointer-events-none z-10 mix-blend-overlay">
            {getIcon()}
        </div>

        {/* 6. Scanlines & Vignette */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.2)_50%)] bg-[length:100%_4px] pointer-events-none z-20 opacity-40"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none z-20"></div>
    </div>
  );
};
