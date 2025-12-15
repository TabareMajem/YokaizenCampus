// AI Labs - Competition Service
// Fetches competition data from backend API

// API Base URL for backend
const API_BASE_URL = typeof import.meta !== 'undefined' && import.meta.env?.PROD
    ? 'https://ai.yokaizencampus.com/api/v1'
    : 'http://localhost:7792/api/v1';

export interface Competition {
    id: string;
    title: string;
    description: string;
    timeLeft: string;
    prize: string;
    minLevel: number;
    participants: number;
    image: string;
    tasks: string[];
    status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED';
}

export interface CompetitionLeaderboardEntry {
    rank: number;
    userId: string;
    username: string;
    score: number;
}

const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

export const getCompetitions = async (): Promise<Competition[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/competitions`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            console.warn('Competitions API error, returning empty array');
            return [];
        }

        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('Failed to fetch competitions:', error);
        return [];
    }
};

export const getCompetitionById = async (id: string): Promise<Competition | null> => {
    try {
        const response = await fetch(`${API_BASE_URL}/competitions/${id}`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) return null;

        const data = await response.json();
        return data.data || null;
    } catch (error) {
        console.error('Failed to fetch competition:', error);
        return null;
    }
};

export const joinCompetition = async (competitionId: string): Promise<boolean> => {
    try {
        const response = await fetch(`${API_BASE_URL}/competitions/${competitionId}/join`, {
            method: 'POST',
            headers: getAuthHeaders(),
        });

        return response.ok;
    } catch (error) {
        console.error('Failed to join competition:', error);
        return false;
    }
};

export const submitCompetitionScore = async (competitionId: string, score: number): Promise<boolean> => {
    try {
        const response = await fetch(`${API_BASE_URL}/competitions/${competitionId}/score`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ score }),
        });

        return response.ok;
    } catch (error) {
        console.error('Failed to submit score:', error);
        return false;
    }
};

export const getCompetitionLeaderboard = async (competitionId: string): Promise<CompetitionLeaderboardEntry[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/competitions/${competitionId}/leaderboard`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) return [];

        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('Failed to fetch competition leaderboard:', error);
        return [];
    }
};
