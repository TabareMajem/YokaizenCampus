// AI Labs - Admin Service
// Fetches admin dashboard data from backend API

// API Base URL for backend
const API_BASE_URL = typeof import.meta !== 'undefined' && import.meta.env?.PROD
    ? 'https://ai.yokaizencampus.com/api/v1'
    : 'http://localhost:7792/api/v1';

import { Reward } from '../types';

export interface AdminStats {
    dau: number;
    mau: number;
    totalRevenue: number;
    activeGames: number;
    totalUsers?: number;
    proUsers?: number;
}

export interface DailyData {
    name: string;
    users: number;
}

const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

export const getAdminStats = async (): Promise<AdminStats> => {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/stats`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            console.warn('Admin stats API error, returning defaults');
            return {
                dau: 0,
                mau: 0,
                totalRevenue: 0,
                activeGames: 0,
            };
        }

        const data = await response.json();
        return data.data || data;
    } catch (error) {
        console.error('Failed to fetch admin stats:', error);
        return {
            dau: 0,
            mau: 0,
            totalRevenue: 0,
            activeGames: 0,
        };
    }
};

export const getDailyTraffic = async (days = 7): Promise<DailyData[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/traffic?days=${days}`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) return [];

        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('Failed to fetch daily traffic:', error);
        return [];
    }
};

export const getAdminRewards = async (): Promise<Reward[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/rewards`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) return [];

        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('Failed to fetch admin rewards:', error);
        return [];
    }
};

export const createReward = async (reward: Partial<Reward>): Promise<Reward | null> => {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/rewards`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(reward),
        });

        if (!response.ok) return null;

        const data = await response.json();
        return data.data || null;
    } catch (error) {
        console.error('Failed to create reward:', error);
        return null;
    }
};

export const deleteReward = async (rewardId: string): Promise<boolean> => {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/rewards/${rewardId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });

        return response.ok;
    } catch (error) {
        console.error('Failed to delete reward:', error);
        return false;
    }
};
