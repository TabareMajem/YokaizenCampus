
import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Terminal, RefreshCw, Trophy, AlertTriangle } from 'lucide-react';
import { audio } from '../../services/audioService';

interface AIGeneratedGameProps {
  gameData: any;
  onClose: () => void;
}

export const AIGeneratedGame: React.FC<AIGeneratedGameProps> = ({ gameData, onClose }) => {
  const [currentSceneId, setCurrentSceneId] = useState<string>('start');
  const [history, setHistory] = useState<string[]>(gameData.intro ? [gameData.intro] : []);
  const [gameOver, setGameOver] = useState(false);

  // Safety check for malformed game data
  const scenes = gameData.scenes || [];
  const currentScene = scenes.find((s: any) => s.id === currentSceneId);

  if (!currentScene && !gameOver && scenes.length > 0) {
      // Fallback if ID not found but scenes exist
      setCurrentSceneId(scenes[0].id);
  }

  const handleOption = (option: any) => {
      setHistory(prev => [...prev, `> ${option.label}`, option.outcome || ""]);
      audio.playClick();
      
      if (option.nextSceneId === 'WIN' || option.nextSceneId === 'LOSE') {
          setGameOver(true);
          if (option.nextSceneId === 'WIN') audio.playSuccess();
          else audio.playError();
      } else {
          setCurrentSceneId(option.nextSceneId);
      }
  };

  if (scenes.length === 0) {
      return (
          <div className="h-full flex flex-col bg-black items-center justify-center p-8 text-center">
              <AlertTriangle size={48} className="text-red-500 mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Corrupted Game Data</h2>
              <p className="text-gray-400 mb-6">This simulation fragment is empty or damaged.</p>
              <Button onClick={onClose} variant="secondary">Exit Simulation</Button>
          </div>
      );
  }

  return (
    <div className="h-full flex flex-col bg-black font-mono text-green-500 p-4 border border-green-900/50 shadow-[inset_0_0_50px_rgba(0,20,0,0.5)]">
        <div className="flex justify-between items-center border-b border-green-900 pb-2 mb-4">
            <h2 className="text-lg font-bold flex items-center"><Terminal size={18} className="mr-2"/> {gameData.title}</h2>
            <button onClick={onClose} className="text-xs hover:text-white">[EXIT]</button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 mb-4 custom-scrollbar">
            {history.map((text, i) => (
                <div key={i} className={`text-sm ${text.startsWith('>') ? 'text-white font-bold' : 'text-green-400'}`}>
                    {text}
                </div>
            ))}
            {!gameOver && currentScene && (
                <div className="text-sm text-green-300 animate-in fade-in pt-4 border-t border-green-900/30">
                    {currentScene.text}
                </div>
            )}
            {gameOver && (
                <div className="text-center py-8">
                    <Trophy size={48} className="mx-auto mb-4 text-yellow-500"/>
                    <h3 className="text-2xl font-bold text-white">GAME OVER</h3>
                </div>
            )}
        </div>

        <div className="grid grid-cols-1 gap-2">
            {!gameOver && currentScene?.options.map((opt: any, i: number) => (
                <button 
                    key={i}
                    onClick={() => handleOption(opt)}
                    className="text-left border border-green-700 p-3 rounded hover:bg-green-900/20 hover:border-green-500 transition-colors text-sm"
                >
                    {i + 1}. {opt.label}
                </button>
            ))}
            {gameOver && (
                <Button fullWidth variant="primary" onClick={onClose}>Return to Reality</Button>
            )}
        </div>
    </div>
  );
};
