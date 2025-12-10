
import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { generateGameContent } from '../../services/geminiService';
import { Gamepad2, Sparkles, Code, Play, Save } from 'lucide-react';
import { audio } from '../../services/audioService';
import { useAuth } from '../../contexts/AuthContext';
import { TRANSLATIONS } from '../../translations';
import { Language } from '../../types';

interface GameCreatorProps {
  onGameCreated: (gameData: any) => void;
}

export const GameCreator: React.FC<GameCreatorProps> = ({ onGameCreated }) => {
  const { user } = useAuth();
  const lang: Language = user?.language || 'EN';
  const t = (key: string) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS['EN']?.[key] || key;

  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedGame, setGeneratedGame] = useState<any>(null);

  const handleCreate = async () => {
      if (!topic.trim()) return;
      setIsGenerating(true);
      audio.playScan();
      
      try {
          const raw = await generateGameContent(topic);
          const gameData = JSON.parse(raw);
          setGeneratedGame(gameData);
          audio.playSuccess();
      } catch (e) {
          alert("Generation failed. Please try a simpler prompt.");
          audio.playError();
      } finally {
          setIsGenerating(false);
      }
  };

  const handleSave = () => {
      if (generatedGame) {
          onGameCreated(generatedGame);
          setTopic('');
          setGeneratedGame(null);
      }
  };

  return (
    <div className="h-full flex flex-col p-6 bg-black font-mono">
        <div className="mb-6 text-center">
            <Gamepad2 size={48} className="mx-auto text-electric mb-2" />
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{t('tool.GAME_CREATOR.name')}</h2>
            <p className="text-xs text-gray-500">{t('tool.GAME_CREATOR.desc')}</p>
        </div>

        {!generatedGame ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                <textarea 
                    className="w-full h-32 bg-gray-900 border border-gray-700 rounded-xl p-4 text-white focus:border-electric focus:outline-none resize-none text-sm placeholder-gray-600"
                    placeholder={t('creator.placeholder')}
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                />
                <Button fullWidth variant="primary" onClick={handleCreate} disabled={!topic || isGenerating} className="shadow-[0_0_20px_rgba(196,95,255,0.3)]">
                    {isGenerating ? <span className="animate-pulse">{t('creator.forging')}</span> : <><Sparkles size={16} className="mr-2"/> {t('creator.generate')}</>}
                </Button>
            </div>
        ) : (
            <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
                <div className="bg-gray-900 p-4 rounded-xl border border-electric/50 overflow-y-auto flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">{generatedGame.title}</h3>
                    <p className="text-sm text-gray-300 italic mb-4">{generatedGame.intro}</p>
                    <div className="text-xs text-gray-500 font-mono">
                        <Code size={12} className="inline mr-1"/> {generatedGame.scenes?.length || 0} Scenes Generated
                    </div>
                </div>
                <div className="flex space-x-3">
                    <Button fullWidth variant="secondary" onClick={() => setGeneratedGame(null)}>{t('ui.discard')}</Button>
                    <Button fullWidth variant="primary" onClick={handleSave}><Save size={16} className="mr-2"/> {t('ui.save')}</Button>
                </div>
            </div>
        )}
    </div>
  );
};
