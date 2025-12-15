import { Response } from 'express';
import { competitionService } from '@services/CompetitionService';
import { asyncHandler, ApiError } from '@utils/errors';
import { AuthenticatedRequest } from '@/types';

// Helper to create success response
const successResponse = <T>(data: T) => ({ success: true, data });

export class CompetitionController {
    /**
     * GET /competitions
     * Get all active competitions
     */
    getCompetitions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const competitions = await competitionService.getActiveCompetitions();

        // Transform for frontend format
        const transformed = competitions.map(c => ({
            id: c.id,
            title: c.title,
            description: c.description,
            timeLeft: c.getTimeLeft(),
            prize: c.prize,
            minLevel: c.minLevel,
            participants: c.participants,
            image: c.imageUrl,
            tasks: c.tasks,
            status: c.status,
        }));

        res.json(successResponse(transformed));
    });

    /**
     * GET /competitions/:id
     * Get competition by ID
     */
    getCompetition = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        const competition = await competitionService.getCompetitionById(id);

        if (!competition) {
            throw ApiError.notFound('Competition');
        }

        res.json(successResponse({
            ...competition,
            timeLeft: competition.getTimeLeft(),
        }));
    });

    /**
     * POST /competitions/:id/join
     * Join a competition
     */
    joinCompetition = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;

        if (!req.user?.id) {
            throw ApiError.unauthorized();
        }

        const success = await competitionService.joinCompetition(id, req.user.id);

        if (!success) {
            throw ApiError.badRequest('Failed to join competition');
        }

        res.json(successResponse({ message: 'Joined competition' }));
    });

    /**
     * POST /competitions/:id/score
     * Submit a score for competition
     */
    submitScore = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        const { score } = req.body;

        if (!req.user?.id) {
            throw ApiError.unauthorized();
        }

        if (typeof score !== 'number') {
            throw ApiError.badRequest('Score must be a number');
        }

        const success = await competitionService.submitScore(
            id,
            req.user.id,
            req.user.username || 'Anonymous',
            score
        );

        if (!success) {
            throw ApiError.badRequest('Failed to submit score');
        }

        res.json(successResponse({ message: 'Score submitted' }));
    });

    /**
     * GET /competitions/:id/leaderboard
     * Get competition leaderboard
     */
    getLeaderboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        const leaderboard = await competitionService.getLeaderboard(id);

        // Add rank numbers
        const ranked = leaderboard.map((entry, index) => ({
            rank: index + 1,
            ...entry,
        }));

        res.json(successResponse(ranked));
    });

    // Admin endpoints

    /**
     * POST /competitions (admin)
     * Create a new competition
     */
    createCompetition = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { title, description, startDate, endDate, prize, minLevel, imageUrl, tasks, gameTypes } = req.body;

        if (!title || !startDate || !endDate) {
            throw ApiError.badRequest('Title, startDate, and endDate are required');
        }

        const competition = await competitionService.createCompetition({
            title,
            description,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            prize,
            minLevel,
            imageUrl,
            tasks,
            gameTypes,
        });

        res.status(201).json(successResponse(competition));
    });

    /**
     * DELETE /competitions/:id (admin)
     * Delete a competition
     */
    deleteCompetition = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        await competitionService.deleteCompetition(id);
        res.json(successResponse({ message: 'Competition deleted' }));
    });
}

export const competitionController = new CompetitionController();
