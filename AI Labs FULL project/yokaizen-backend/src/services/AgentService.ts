import { Repository, In } from 'typeorm';
import { AppDataSource } from '@config/database';
import { logger } from '@config/logger';
import { Agent, AgentModel, AgentCategory } from '@entities/Agent';
import { AgentSkill } from '@entities/AgentSkill';
import { AgentSchedule } from '@entities/AgentSchedule';
import { AgentTask, TaskType, TaskStatus } from '@entities/AgentTask';
import { AgentMemory, MemoryType } from '@entities/AgentMemory';
import { User } from '@entities/User';
import { ApiError } from '@utils/errors';

export class AgentService {
    private agentRepository: Repository<Agent>;
    private skillRepository: Repository<AgentSkill>;
    private taskRepository: Repository<AgentTask>;
    private memoryRepository: Repository<AgentMemory>;
    private scheduleRepository: Repository<AgentSchedule>;
    private userRepository: Repository<User>;

    constructor() {
        this.agentRepository = AppDataSource.getRepository(Agent);
        this.skillRepository = AppDataSource.getRepository(AgentSkill);
        this.taskRepository = AppDataSource.getRepository(AgentTask);
        this.memoryRepository = AppDataSource.getRepository(AgentMemory);
        this.scheduleRepository = AppDataSource.getRepository(AgentSchedule);
        this.userRepository = AppDataSource.getRepository(User);
    }

    /**
     * Create a new agent
     */
    async createAgent(
        creatorId: string,
        data: {
            name: string;
            persona: string;
            systemInstruction: string;
            category?: AgentCategory;
            modelPref?: AgentModel;
            avatarUrl?: string;
            tags?: string[];
            isPublic?: boolean;
        }
    ): Promise<Agent> {
        const creator = await this.userRepository.findOne({ where: { id: creatorId } });
        if (!creator) {
            throw ApiError.notFound('User not found');
        }

        const agent = this.agentRepository.create({
            ...data,
            creator,
            category: data.category || AgentCategory.CUSTOM,
            modelPref: data.modelPref || AgentModel.GEMINI_FLASH,
            config: {
                temperature: 0.7,
                maxTokens: 2048
            },
            capabilities: {
                canUseTools: true // Default enabled for now
            }
        });

        await this.agentRepository.save(agent);
        logger.info('Agent created', { agentId: agent.id, creatorId });
        return agent;
    }

    /**
     * Get agent by ID
     */
    async getAgent(agentId: string, userId?: string): Promise<Agent> {
        const agent = await this.agentRepository.findOne({
            where: { id: agentId },
            relations: ['creator', 'skills', 'schedules']
        });

        if (!agent) {
            throw ApiError.notFound('Agent not found');
        }

        // Access control check if needed (e.g. private agents)
        if (!agent.isPublic && userId && agent.creatorId !== userId) {
            throw ApiError.forbidden('Agent is private');
        }

        return agent;
    }

    /**
     * List agents (public or user's own)
     */
    async listAgents(
        userId: string,
        filters: { mineOnly?: boolean; publicOnly?: boolean; category?: AgentCategory }
    ): Promise<Agent[]> {
        const query = this.agentRepository.createQueryBuilder('agent')
            .leftJoinAndSelect('agent.creator', 'creator')
            .leftJoinAndSelect('agent.skills', 'skills');

        if (filters.mineOnly) {
            query.andWhere('agent.creatorId = :userId', { userId });
        } else if (filters.publicOnly) {
            query.andWhere('agent.isPublic = :isPublic', { isPublic: true });
        } else {
            // Default: My agents OR Public agents
            query.andWhere('(agent.creatorId = :userId OR agent.isPublic = :isPublic)', { userId, isPublic: true });
        }

        if (filters.category) {
            query.andWhere('agent.category = :category', { category: filters.category });
        }

        query.orderBy('agent.updatedAt', 'DESC');

        return query.getMany();
    }

    /**
     * Update agent
     */
    async updateAgent(agentId: string, userId: string, data: Partial<Agent>): Promise<Agent> {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) {
            throw ApiError.notFound('Agent not found');
        }

        if (agent.creatorId !== userId) {
            throw ApiError.forbidden('Only the creator can update this agent');
        }

        Object.assign(agent, data);
        await this.agentRepository.save(agent);
        return agent;
    }

    /**
     * Delete agent
     */
    async deleteAgent(agentId: string, userId: string): Promise<void> {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) {
            throw ApiError.notFound('Agent not found');
        }

        if (agent.creatorId !== userId) {
            throw ApiError.forbidden('Only the creator can delete this agent');
        }

        await this.agentRepository.remove(agent);
    }

    /**
     * Add skill to agent
     */
    async addSkill(agentId: string, userId: string, skillId: string): Promise<Agent> {
        const agent = await this.agentRepository.findOne({
            where: { id: agentId },
            relations: ['skills']
        });
        if (!agent) throw ApiError.notFound('Agent not found');
        if (agent.creatorId !== userId) throw ApiError.forbidden('Access denied');

        const skill = await this.skillRepository.findOne({ where: { id: skillId } });
        if (!skill) throw ApiError.notFound('Skill not found');

        if (!agent.skills.find(s => s.id === skill.id)) {
            agent.skills.push(skill);
            await this.agentRepository.save(agent);
        }

        return agent;
    }

    /**
     * Remove skill from agent
     */
    async removeSkill(agentId: string, userId: string, skillId: string): Promise<Agent> {
        const agent = await this.agentRepository.findOne({
            where: { id: agentId },
            relations: ['skills']
        });
        if (!agent) throw ApiError.notFound('Agent not found');
        if (agent.creatorId !== userId) throw ApiError.forbidden('Access denied');

        agent.skills = agent.skills.filter(s => s.id !== skillId);
        await this.agentRepository.save(agent);

        return agent;
    }

    /**
     * Get all available skills
     */
    async listSkills(): Promise<AgentSkill[]> {
        return this.skillRepository.find({ where: { isEnabled: true } });
    }

    /**
     * Record a memory
     */
    async addMemory(agentId: string, content: string, type: MemoryType = MemoryType.EPISODIC): Promise<AgentMemory> {
        const memory = this.memoryRepository.create({
            agentId,
            content,
            type,
            metadata: { source: 'interaction' }
        });
        return this.memoryRepository.save(memory);
    }

    /**
     * Get agent tasks (activity log)
     */
    async getTasks(agentId: string, userId: string, limit = 50): Promise<AgentTask[]> {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) throw ApiError.notFound('Agent not found');

        // Access check
        if (!agent.isPublic && agent.creatorId !== userId) {
            throw ApiError.forbidden('Access denied');
        }

        return this.taskRepository.find({
            where: { agentId },
            order: { createdAt: 'DESC' },
            take: limit
        });
    }

    /**
     * Create a scheduled task
     */
    async createSchedule(
        agentId: string,
        userId: string,
        data: { cronExpression: string; description: string; input?: any }
    ): Promise<AgentSchedule> {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) throw ApiError.notFound('Agent not found');
        if (agent.creatorId !== userId) throw ApiError.forbidden('Access denied');

        const schedule = this.scheduleRepository.create({
            agentId,
            ...data,
            isActive: true
        });

        return this.scheduleRepository.save(schedule);
    }

    /**
     * Delete a scheduled task
     */
    async deleteSchedule(scheduleId: string, userId: string): Promise<void> {
        const schedule = await this.scheduleRepository.findOne({
            where: { id: scheduleId },
            relations: ['agent']
        });

        if (!schedule) throw ApiError.notFound('Schedule not found');
        if (schedule.agent.creatorId !== userId) throw ApiError.forbidden('Access denied');

        await this.scheduleRepository.remove(schedule);
    }

    /**
     * Get schedules for an agent
     */
    async getSchedules(agentId: string, userId: string): Promise<AgentSchedule[]> {
        const agent = await this.agentRepository.findOne({ where: { id: agentId } });
        if (!agent) throw ApiError.notFound('Agent not found');

        // Access check
        if (!agent.isPublic && agent.creatorId !== userId) {
            throw ApiError.forbidden('Access denied');
        }

        return this.scheduleRepository.find({
            where: { agentId },
            order: { createdAt: 'DESC' }
        });
    }
}

export const agentService = new AgentService();
