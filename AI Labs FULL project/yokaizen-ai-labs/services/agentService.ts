// AI Labs - Agent Service
// Fetches and manages AI agents from backend API
import { Agent, AIModel, AgentTask, AgentSkill, AgentSchedule } from '../types';

// API Base URL for backend
const API_BASE_URL = typeof import.meta !== 'undefined' && import.meta.env?.PROD
    ? 'https://ai.yokaizencampus.com/api/v1'
    : 'http://localhost:7792/api/v1';

export type CreateAgentRequest = Partial<Agent>;

const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('yokaizen_ailabs_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

export const getAgents = async (): Promise<Agent[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/ai/agents`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            console.warn('Agents API error, returning empty array');
            return [];
        }

        const data = await response.json();
        return data.data?.items || data.data || [];
    } catch (error) {
        console.error('Failed to fetch agents:', error);
        return [];
    }
};

export const getAgentById = async (id: string): Promise<Agent | null> => {
    try {
        const response = await fetch(`${API_BASE_URL}/ai/agents/${id}`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) return null;

        const data = await response.json();
        return data.data || null;
    } catch (error) {
        console.error('Failed to fetch agent:', error);
        return null;
    }
};

export const createAgent = async (agent: CreateAgentRequest): Promise<Agent | null> => {
    try {
        const response = await fetch(`${API_BASE_URL}/ai/agents`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(agent),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to create agent');
        }

        const data = await response.json();
        return data.data || null;
    } catch (error) {
        console.error('Failed to create agent:', error);
        throw error;
    }
};

export const updateAgent = async (id: string, updates: Partial<CreateAgentRequest>): Promise<Agent | null> => {
    try {
        const response = await fetch(`${API_BASE_URL}/ai/agents/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(updates),
        });

        if (!response.ok) return null;

        const data = await response.json();
        return data.data || null;
    } catch (error) {
        console.error('Failed to update agent:', error);
        return null;
    }
};

export const deleteAgent = async (id: string): Promise<boolean> => {
    try {
        const response = await fetch(`${API_BASE_URL}/ai/agents/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });

        return response.ok;
    } catch (error) {
        console.error('Failed to delete agent:', error);
        return false;
    }
};

export const rateAgent = async (id: string, rating: number): Promise<boolean> => {
    try {
        const response = await fetch(`${API_BASE_URL}/ai/agents/${id}/rate`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ rating }),
        });

        return response.ok;
    } catch (error) {
        console.error('Failed to rate agent:', error);
        return false;
    }
};

// Tasks
export const getAgentTasks = async (agentId: string, limit = 50): Promise<AgentTask[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/ai/agents/${agentId}/tasks?limit=${limit}`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) return [];

        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('Failed to fetch agent tasks:', error);
        return [];
    }
};

// AI Chat
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export const chatWithAgent = async (
    agentId: string | null,
    message: string,
    history: ChatMessage[] = []
): Promise<string> => {
    try {
        const response = await fetch(`${API_BASE_URL}/ai/chat`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                agentId,
                message,
                history,
                stream: false,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Chat failed');
        }

        const data = await response.json();
        return data.data?.text || '';
    } catch (error) {
        console.error('Chat failed:', error);
        throw error;
    }
};

// Knowledge Base
export const uploadKnowledge = async (agentId: string, file: File): Promise<boolean> => {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const token = localStorage.getItem('yokaizen_ailabs_token');
        const response = await fetch(`${API_BASE_URL}/ai/agents/${agentId}/knowledge`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
        });

        return response.ok;
    } catch (error) {
        console.error('Failed to upload knowledge:', error);
        return false;
    }
};

export const getKnowledgeStats = async (agentId: string): Promise<{ chunks: number; lastUpdated: string } | null> => {
    try {
        const response = await fetch(`${API_BASE_URL}/ai/agents/${agentId}/knowledge/stats`, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) return null;

        const data = await response.json();
        return data.data || null;
    } catch (error) {
        console.error('Failed to get knowledge stats:', error);
        return null;
    }
};

// Skills - Mock implementations
export const listSkills = async (): Promise<AgentSkill[]> => {
    return [];
};

export const addAgentSkill = async (agentId: string, skill: AgentSkill): Promise<boolean> => {
    return true;
};

export const removeAgentSkill = async (agentId: string, skillId: string): Promise<boolean> => {
    return true;
};
