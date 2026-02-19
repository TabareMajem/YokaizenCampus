
import { useState, useEffect, useCallback } from 'react';
import { gameProgressService, GameProgress } from '../services/gameProgressService';
import { useToast } from '../contexts/ToastContext';

export const useGameSave = (gameId: string) => {
    const [progress, setProgress] = useState<GameProgress | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { showToast } = useToast();

    // Initial Load & Sync
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            // First load local instant
            const localData = gameProgressService.load(gameId);
            if (localData) setProgress(localData);

            // Then try pull from cloud (silent update)
            try {
                const cloudData = await gameProgressService.pull(gameId);
                if (cloudData) {
                    setProgress(cloudData);
                    // Only notify if cloud was significantly different (e.g. recovered save)
                    if (localData && cloudData.lastPlayed !== localData.lastPlayed) {
                        showToast("Cloud Save Synced", 'info');
                    }
                }
            } catch (e) {
                console.warn("Cloud sync failed", e);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [gameId]);

    const saveGame = useCallback((newProgress: Partial<GameProgress>) => {
        gameProgressService.save(gameId, newProgress);
        // Optimistic update of local state
        setProgress(prev => {
            if (!prev) return {
                highScore: newProgress.highScore || 0,
                gamesPlayed: 1,
                lastPlayed: new Date().toISOString(),
                ...newProgress
            } as GameProgress;

            return {
                ...prev,
                ...newProgress,
                highScore: Math.max(prev.highScore, newProgress.highScore || 0),
                gamesPlayed: prev.gamesPlayed + 1,
                lastPlayed: new Date().toISOString()
            };
        });
    }, [gameId]);

    return { progress, saveGame, isLoading };
};
