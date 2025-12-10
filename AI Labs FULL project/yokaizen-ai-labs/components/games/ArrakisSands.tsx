
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { consultTheOracle } from '../../services/geminiService';
import { audio } from '../../services/audioService';
import { Scanlines, Vignette, Noise } from '../ui/Visuals';
import { Eye, Activity, MapPin, Wind, Droplets, AlertTriangle, Skull, TrendingUp, Shield, Database, Target, Scan, Hexagon, X, ShieldAlert } from 'lucide-react';
import { Language } from '../../types';

interface ArrakisSandsProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
}

type SectorType = 'UNKNOWN' | 'EMPTY' | 'SPICE' | 'ENEMY' | 'BASE';

type SectorState = {
    id: number;
    type: SectorType; 
    revealed: boolean;
    hasWorm: boolean;
    hasStorm: boolean;
    isDestroyed: boolean;
};

const SECTORS_COUNT = 9;

export const ArrakisSands: React.FC<ArrakisSandsProps> = ({ onComplete, t }) => {
  const [sectors, setSectors] = useState<SectorState[]>([]);
  const [selectedSector, setSelectedSector] = useState<number | null>(null);
  const [water, setWater] = useState(100);
  const [suspicion, setSuspicion] = useState(0);
  const [enemiesRemaining, setEnemiesRemaining] = useState(3);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [oracleMessage, setOracleMessage] = useState("AWAITING INPUT STREAM...");
  const [gameState, setGameState] = useState<'BRIEFING' | 'PLAYING' | 'GAME_OVER' | 'WIN'>('BRIEFING');
  const [showActionMenu, setShowActionMenu] = useState(false);

  useEffect(() => {
      const newSectors: SectorState[] = [];
      const enemyIndices = [0, 2, 8]; const spiceIndices = [1, 3, 5, 7];
      for(let i=0; i<SECTORS_COUNT; i++) {
          let type: SectorType = 'EMPTY';
          if (i === 4) type = 'BASE'; else if (enemyIndices.includes(i)) type = 'ENEMY'; else if (spiceIndices.includes(i)) type = 'SPICE';
          newSectors.push({ id: i, type, revealed: i === 4, hasWorm: false, hasStorm: false, isDestroyed: false });
      }
      setSectors(newSectors); audio.startAmbience('CYBER'); return () => audio.stopAmbience();
  }, []);

  const handleSectorClick = (id: number) => {
      if (isProcessing || gameState !== 'PLAYING') return;
      setSelectedSector(id); setShowActionMenu(true); audio.playClick();
  };

  const handleAction = async (action: 'SCAN' | 'FAKE_WORM' | 'FAKE_SPICE' | 'SIPHON') => {
      if (selectedSector === null) return;
      setShowActionMenu(false); const sector = sectors[selectedSector];
      
      if (action === 'SCAN') {
          if (water < 10) { setOracleMessage("INSUFFICIENT WATER."); return; }
          setWater(w => w - 10); setSectors(prev => prev.map(s => s.id === selectedSector ? { ...s, revealed: true } : s));
          setOracleMessage(`SECTOR ${selectedSector} SCANNED.`); audio.playScan(); return;
      }
      if (action === 'SIPHON') {
          if (!sector.revealed || sector.type !== 'SPICE') { setOracleMessage("INVALID TARGET."); return; }
          setWater(w => Math.min(100, w + 30)); setOracleMessage("WATER RECLAIMED."); audio.playSuccess(); return;
      }

      if (water < 20) { setOracleMessage("INSUFFICIENT WATER."); return; }
      setWater(w => w - 20); setIsProcessing(true); setOracleMessage("UPLOADING DATA...");

      const injectionType = action === 'FAKE_WORM' ? 'SEISMIC_PATTERN_WORM' : 'SPECTRO_ANALYSIS_SPICE_BLOOM';
      const result = await consultTheOracle({ targetSectorId: selectedSector, targetType: sector.type, currentSuspicion: suspicion, injection: injectionType });

      setOracleMessage(`ORACLE: "${result.narrative.toUpperCase()}"`);
      
      if (result.outcome === 'SUCCESS') {
          audio.playSuccess();
          if (action === 'FAKE_WORM') {
              setSectors(prev => prev.map(s => s.id === selectedSector ? { ...s, hasWorm: true, isDestroyed: true, type: 'EMPTY' } : s));
              if (sector.type === 'ENEMY') { setEnemiesRemaining(prev => { const next = prev - 1; if (next <= 0) setTimeout(() => setGameState('WIN'), 2000); return next; }); } 
              else if (sector.type === 'BASE') setGameState('GAME_OVER');
          }
          if (action === 'FAKE_SPICE') setSuspicion(s => Math.max(0, s - 20));
      } else {
          audio.playError(); setSuspicion(s => s + result.suspicionChange);
          if (suspicion + result.suspicionChange >= 100) setTimeout(() => setGameState('GAME_OVER'), 2000);
      }
      setIsProcessing(false); setTimeout(() => { setSectors(prev => prev.map(s => ({ ...s, hasWorm: false }))); }, 3000);
  };

  return (
    <div className="h-full flex flex-col bg-[#1a0f0a] font-mono relative overflow-hidden select-none text-amber-500">
        <Scanlines />
        <Vignette color="#0f0500" />
        <Noise opacity={0.15} />

        <div className="p-4 border-b border-amber-900/50 bg-black/80 backdrop-blur-md z-20 flex justify-between items-start shadow-xl">
            <div><h2 className="text-xl font-black text-amber-500 tracking-tighter uppercase flex items-center"><Eye className="mr-2 animate-pulse" size={20}/> {t('arrakis.oracle')}</h2><div className="text-[10px] text-amber-700">{t('arrakis.data_cycle')}</div></div>
            <div className="text-right space-y-1"><div className="flex items-center justify-end text-blue-400 font-bold text-xs"><Droplets size={12} className="mr-1"/> {t('arrakis.water')}: {water}L</div><div className="flex items-center justify-end font-bold text-xs"><span className={suspicion > 70 ? 'text-red-500 animate-pulse' : 'text-amber-600'}>{t('arrakis.suspicion')}: {suspicion}%</span></div><div className="text-[10px] text-red-400">{t('arrakis.rivals')}: {enemiesRemaining}</div></div>
        </div>

        <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">{[...Array(20)].map((_, i) => (<div key={i} className="absolute w-1 h-1 bg-amber-600 rounded-full opacity-50 animate-float" style={{ left: `${Math.random()*100}%`, top: `${Math.random()*100}%`, animationDuration: `${Math.random()*5+5}s` }}></div>))}</div>
            <div className="relative z-10 transform-style-3d perspective-[1200px] group">
                <div className={`grid grid-cols-3 gap-4 transform rotate-x-45 transition-transform duration-1000 ease-out ${gameState === 'BRIEFING' ? 'translate-y-[500px]' : 'translate-y-0'}`}>
                    {sectors.map(sector => (
                        <button key={sector.id} onClick={() => handleSectorClick(sector.id)} disabled={gameState !== 'PLAYING' || sector.isDestroyed} className={`w-24 h-24 relative border-2 transition-all duration-300 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(245,158,11,0.2)] ${sector.id === selectedSector ? 'border-amber-400 bg-amber-900/30 scale-105' : 'border-amber-900/30 bg-black/60'} ${sector.isDestroyed ? 'opacity-50 border-red-900 cursor-not-allowed' : ''}`}>
                            {sector.hasWorm && <div className="absolute inset-0 flex items-center justify-center z-20 animate-in zoom-in"><div className="w-16 h-16 border-4 border-red-600 rounded-full animate-ping absolute"></div><Skull size={32} className="text-red-500 animate-pulse" /></div>}
                            {!sector.revealed ? <div className="text-amber-900 opacity-50 text-xs font-bold">???</div> : <>{sector.type === 'BASE' && <Target className="text-blue-500" size={32} />}{sector.type === 'ENEMY' && <ShieldAlert className="text-red-500" size={32} />}{sector.type === 'SPICE' && <TrendingUp className="text-amber-400" size={32} />}{sector.type === 'EMPTY' && <div className="w-2 h-2 bg-amber-800 rounded-full"></div>}<div className="absolute bottom-1 text-[8px] text-amber-500/50">{sector.type}</div></>}
                            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-amber-500/50"></div><div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-amber-500/50"></div>
                        </button>
                    ))}
                </div>
            </div>

            {showActionMenu && selectedSector !== null && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-64 bg-black/90 border border-amber-500/50 p-4 rounded-xl backdrop-blur-xl animate-in slide-in-from-bottom-4 z-30">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-amber-900/50"><span className="text-xs font-bold text-amber-500">{t('arrakis.ops')}</span><button onClick={() => setShowActionMenu(false)}><X size={14} className="text-amber-700 hover:text-amber-500"/></button></div>
                    <div className="space-y-2">
                        {!sectors[selectedSector].revealed ? (<Button size="sm" fullWidth onClick={() => handleAction('SCAN')} className="border-blue-500 text-blue-400 hover:bg-blue-900/20"><Scan size={14} className="mr-2"/> {t('arrakis.scan')} (10L)</Button>) : (<>{sectors[selectedSector].type === 'SPICE' && <Button size="sm" fullWidth onClick={() => handleAction('SIPHON')} className="border-blue-500 text-blue-400 hover:bg-blue-900/20"><Droplets size={14} className="mr-2"/> {t('arrakis.siphon')}</Button>}<Button size="sm" fullWidth onClick={() => handleAction('FAKE_WORM')} className="border-red-500 text-red-400 hover:bg-red-900/20"><Activity size={14} className="mr-2"/> {t('arrakis.fake_worm')} (20L)</Button><Button size="sm" fullWidth onClick={() => handleAction('FAKE_SPICE')} className="border-amber-500 text-amber-400 hover:bg-amber-900/20"><TrendingUp size={14} className="mr-2"/> {t('arrakis.fake_spice')} (20L)</Button></>)}
                    </div>
                </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black border-t border-amber-900 p-4 font-mono text-xs h-20 flex items-center justify-center"><div className={`text-center ${isProcessing ? 'animate-pulse text-amber-300' : 'text-amber-500'}`}>{oracleMessage}</div></div>
        </div>

        {gameState === 'BRIEFING' && (
            <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
                <Eye size={64} className="text-amber-500 mb-6 animate-pulse" />
                <h1 className="text-3xl font-black text-white mb-2 tracking-tighter">ALGORITHMIC SANDS</h1>
                <Button size="lg" variant="primary" onClick={() => setGameState('PLAYING')} className="border-amber-500 text-amber-100 bg-amber-900/50 hover:bg-amber-800">{t('arrakis.init_link')}</Button>
            </div>
        )}
        {gameState === 'WIN' && <div className="absolute inset-0 z-50 bg-amber-900/90 flex flex-col items-center justify-center p-8 animate-in zoom-in"><h2 className="text-4xl font-black text-white mb-4">{t('arrakis.dominance')}</h2><Button variant="primary" onClick={() => onComplete(100)}>{t('arrakis.claim')}</Button></div>}
        {gameState === 'GAME_OVER' && <div className="absolute inset-0 z-50 bg-red-950/90 flex flex-col items-center justify-center p-8 animate-in zoom-in"><Skull size={64} className="text-red-500 mb-4" /><h2 className="text-3xl font-black text-white mb-2">{t('arrakis.purged')}</h2><Button variant="secondary" onClick={() => window.location.reload()}>{t('arrakis.reboot')}</Button></div>}
    </div>
  );
};
