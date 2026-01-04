/**
 * Game Progress Service
 * Handles saving and loading game progress to localStorage
 */

export interface GameProgress {
    highScore: number;
    gamesPlayed: number;
    lastPlayed: string;
    level?: number;
    stars?: number;
    achievements?: string[];
    customData?: Record<string, unknown>;
}

const STORAGE_PREFIX = 'yokaizen_game_';

export const gameProgressService = {
    /**
     * Load progress for a specific game
     */
    load: (gameId: string): GameProgress | null => {
        try {
            const stored = localStorage.getItem(`${STORAGE_PREFIX}${gameId}`);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.error(`Failed to load progress for ${gameId}:`, error);
            return null;
        }
    },

    /**
     * Save progress for a specific game
     */
    save: (gameId: string, progress: Partial<GameProgress>): void => {
        try {
            const existing = gameProgressService.load(gameId) || {
                highScore: 0,
                gamesPlayed: 0,
                lastPlayed: new Date().toISOString(),
            };

            const updated: GameProgress = {
                ...existing,
                ...progress,
                highScore: Math.max(existing.highScore, progress.highScore || 0),
                gamesPlayed: (existing.gamesPlayed || 0) + 1,
                lastPlayed: new Date().toISOString(),
            };

            localStorage.setItem(`${STORAGE_PREFIX}${gameId}`, JSON.stringify(updated));
        } catch (error) {
            console.error(`Failed to save progress for ${gameId}:`, error);
        }
    },

    /**
     * Update just the high score without incrementing games played
     */
    updateHighScore: (gameId: string, score: number): void => {
        const existing = gameProgressService.load(gameId);
        if (!existing || score > existing.highScore) {
            gameProgressService.save(gameId, {
                ...existing,
                highScore: score,
                gamesPlayed: (existing?.gamesPlayed || 1) - 1 // Will be incremented by save
            });
        }
    },

    /**
     * Get all game progress
     */
    getAll: (): Record<string, GameProgress> => {
        const allProgress: Record<string, GameProgress> = {};
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith(STORAGE_PREFIX)) {
                    const gameId = key.replace(STORAGE_PREFIX, '');
                    const progress = gameProgressService.load(gameId);
                    if (progress) {
                        allProgress[gameId] = progress;
                    }
                }
            }
        } catch (error) {
            console.error('Failed to get all progress:', error);
        }
        return allProgress;
    },

    /**
     * Clear progress for a specific game
     */
    clear: (gameId: string): void => {
        try {
            localStorage.removeItem(`${STORAGE_PREFIX}${gameId}`);
        } catch (error) {
            console.error(`Failed to clear progress for ${gameId}:`, error);
        }
    },

    /**
     * Clear all game progress
     */
    clearAll: (): void => {
        try {
            const keys: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith(STORAGE_PREFIX)) {
                    keys.push(key);
                }
            }
            keys.forEach(key => localStorage.removeItem(key));
        } catch (error) {
            console.error('Failed to clear all progress:', error);
        }
    },

    /**
     * Get total stats across all games
     */
    getTotalStats: (): { totalGamesPlayed: number; totalHighScore: number; gamesWithProgress: number } => {
        const all = gameProgressService.getAll();
        const values = Object.values(all);
        return {
            totalGamesPlayed: values.reduce((sum, p) => sum + p.gamesPlayed, 0),
            totalHighScore: values.reduce((sum, p) => sum + p.highScore, 0),
            gamesWithProgress: values.length,
        };
    }
};

export default gameProgressService;
