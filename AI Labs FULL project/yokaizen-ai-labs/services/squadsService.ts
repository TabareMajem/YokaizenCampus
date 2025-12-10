/**
 * Squads Service - Real Backend API Integration
 * Fetches and manages squad data from the AI Labs backend
 */

import { authService } from './authService';
import { Squad } from '../types';

// API Base URL
const API_BASE = import.meta.env.PROD
    ? 'https://ai.yokaizencampus.com/api/v1'
    : 'http://localhost:7792/api/v1';

// Default empty squads for initial state
export const DEFAULT_SQUADS: Squad[] = [];

export const squadsService = {
    /**
     * Fetch all squads
     */
    async getAllSquads(): Promise<Squad[]> {
        try {
            const token = authService.getToken();
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_BASE}/squads`, {
                headers,
            });

            if (!response.ok) {
                console.warn('Failed to fetch squads, returning empty array');
                return [];
            }

            const data = await response.json();
            return data.data.squads || [];
        } catch (error) {
            console.error('Error fetching squads:', error);
            return [];
        }
    },

    /**
     * Get a specific squad by ID
     */
    async getSquad(squadId: string): Promise<Squad | null> {
        try {
            const token = authService.getToken();

            const response = await fetch(`${API_BASE}/squads/${squadId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Error fetching squad:', error);
            return null;
        }
    },

    /**
     * Create a new squad
     */
    async createSquad(name: string, avatar: string): Promise<Squad | null> {
        const token = authService.getToken();

        if (!token) {
            throw new Error('Not authenticated');
        }

        try {
            const response = await fetch(`${API_BASE}/squads`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ name, avatar }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create squad');
            }

            const data = await response.json();
            return data.data;
        } catch (error: any) {
            console.error('Error creating squad:', error);
            throw error;
        }
    },

    /**
     * Join a squad
     */
    async joinSquad(squadId: string): Promise<boolean> {
        const token = authService.getToken();

        if (!token) {
            throw new Error('Not authenticated');
        }

        try {
            const response = await fetch(`${API_BASE}/squads/${squadId}/join`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            return response.ok;
        } catch (error) {
            console.error('Error joining squad:', error);
            return false;
        }
    },

    /**
     * Leave current squad
     */
    async leaveSquad(squadId: string): Promise<boolean> {
        const token = authService.getToken();

        if (!token) {
            throw new Error('Not authenticated');
        }

        try {
            const response = await fetch(`${API_BASE}/squads/${squadId}/leave`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            return response.ok;
        } catch (error) {
            console.error('Error leaving squad:', error);
            return false;
        }
    },

    /**
     * Get user's current squad
     */
    async getMySquad(): Promise<Squad | null> {
        const token = authService.getToken();

        if (!token) {
            return null;
        }

        try {
            const response = await fetch(`${API_BASE}/squads/my`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Error fetching user squad:', error);
            return null;
        }
    },
};
