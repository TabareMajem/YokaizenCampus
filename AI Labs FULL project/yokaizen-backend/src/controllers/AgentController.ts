import { Response } from 'express';
import { agentService } from '@services/AgentService';
import { asyncHandler, successResponse } from '@utils/errors';
import { AuthenticatedRequest } from '@/types';

export class AgentController {

    /**
     * POST /agents
     * Create a new agent
     */
    createAgent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { name, persona, systemInstruction, category, modelPref, avatarUrl, tags, isPublic } = req.body;

        const agent = await agentService.createAgent(req.user!.userId, {
            name,
            persona,
            systemInstruction,
            category,
            modelPref,
            avatarUrl,
            tags,
            isPublic
        });

        res.json(successResponse(agent));
    });

    /**
     * GET /agents
     * List agents
     */
    listAgents = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { mine, public: isPublic, category } = req.query;

        const agents = await agentService.listAgents(req.user!.userId, {
            mineOnly: mine === 'true',
            publicOnly: isPublic === 'true',
            category: category as any
        });

        res.json(successResponse(agents));
    });

    /**
     * GET /agents/:id
     * Get agent details
     */
    getAgent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        const agent = await agentService.getAgent(id, req.user!.userId);
        res.json(successResponse(agent));
    });

    /**
     * PATCH /agents/:id
     * Update agent
     */
    updateAgent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        const agent = await agentService.updateAgent(id, req.user!.userId, req.body);
        res.json(successResponse(agent));
    });

    /**
     * DELETE /agents/:id
     * Delete agent
     */
    deleteAgent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        await agentService.deleteAgent(id, req.user!.userId);
        res.json(successResponse({ message: 'Agent deleted' }));
    });

    /**
     * POST /agents/:id/skills
     * Add skill to agent
     */
    addSkill = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        const { skillId } = req.body;
        const agent = await agentService.addSkill(id, req.user!.userId, skillId);
        res.json(successResponse(agent));
    });

    /**
     * DELETE /agents/:id/skills/:skillId
     * Remove skill from agent
     */
    removeSkill = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id, skillId } = req.params;
        const agent = await agentService.removeSkill(id, req.user!.userId, skillId);
        res.json(successResponse(agent));
    });

    /**
     * GET /skills
     * List available skills
     */
    listSkills = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const skills = await agentService.listSkills();
        res.json(successResponse(skills));
    });

    /**
     * GET /agents/:id/tasks
     * Get agent activity log
     */
    getAgentTasks = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
        const tasks = await agentService.getTasks(id, req.user!.userId, limit);
        res.json(successResponse(tasks));
    });

    /**
     * POST /agents/:id/schedules
     * Create scheduled task
     */
    createSchedule = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        const schedule = await agentService.createSchedule(id, req.user!.userId, req.body);
        res.json(successResponse(schedule));
    });

    /**
     * DELETE /agents/:id/schedules/:scheduleId
     * Delete scheduled task
     */
    deleteSchedule = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id, scheduleId } = req.params;
        await agentService.deleteSchedule(scheduleId, req.user!.userId);
        res.json(successResponse({ message: 'Schedule deleted' }));
    });

    /**
     * GET /agents/:id/schedules
     * List scheduled tasks
     */
    getSchedules = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        const schedules = await agentService.getSchedules(id, req.user!.userId);
        res.json(successResponse(schedules));
    });
}

export const agentController = new AgentController();
