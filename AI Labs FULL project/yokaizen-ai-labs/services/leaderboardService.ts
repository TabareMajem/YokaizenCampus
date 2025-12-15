// AI Labs - Leaderboard Service
// Fetches leaderboard data from backend API

// API Base URL for backend
const API_BASE_URL = typeof import.meta !== 'undefined' && import.meta.env?.PROD
    ? 'https://ai.yokaizencampus.com/api/v1'
    : 'http://localhost:7792/api/v1';

export interface LeaderboardEntry {
    rank: number;
    name: string;
    score: number;
    avatar: string;
    region: string;
    isUser?: boolean;
    userId?: string;
}

export interface LeaderboardResponse {
    success: boolean;
    data: {
        entries: LeaderboardEntry[];
        total: number;
        userRank?: LeaderboardEntry;
    };
}

const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

export const getGlobalLeaderboard = async (limit = 100, offset = 0, includeMe = true): Promise<LeaderboardEntry[]> => {
    try {
        const params = new URLSearchParams({
            limit: limit.toString(),
            offset: offset.toString(),
            ...(includeMe ? { includeMe: 'true' } : {}),
        });

        const response = await fetch(`${API_BASE_URL}/leaderboard/global?${params}`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            console.warn('Leaderboard API error, returning empty array');
            return [];
        }

        const data: LeaderboardResponse = await response.json();
        return data.data?.entries || [];
    } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        return [];
    }
};

export const getSquadLeaderboard = async (limit = 50): Promise<LeaderboardEntry[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/leaderboard/squads?limit=${limit}`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) return [];

        const data = await response.json();
        return data.data?.entries || [];
    } catch (error) {
        console.error('Failed to fetch squad leaderboard:', error);
        return [];
    }
};

export const getRegionalLeaderboard = async (region: string, limit = 100): Promise<LeaderboardEntry[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/leaderboard/regional?region=${region}&limit=${limit}`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) return [];

        const data = await response.json();
        return data.data?.entries || [];
    } catch (error) {
        console.error('Failed to fetch regional leaderboard:', error);
        return [];
    }
};

export const getTimeframedLeaderboard = async (): Promise<{
    daily: LeaderboardEntry[];
    weekly: LeaderboardEntry[];
    allTime: LeaderboardEntry[];
}> => {
    try {
        const response = await fetch(`${API_BASE_URL}/leaderboard/timeframed`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) return { daily: [], weekly: [], allTime: [] };

        const data = await response.json();
        return data.data || { daily: [], weekly: [], allTime: [] };
    } catch (error) {
        console.error('Failed to fetch timeframed leaderboard:', error);
        return { daily: [], weekly: [], allTime: [] };
    }
};
