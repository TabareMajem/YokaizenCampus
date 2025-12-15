import { AppDataSource } from '@config/database';
import { Competition, CompetitionStatus } from '@entities/Competition';
import { MoreThan, LessThan, Between } from 'typeorm';

class CompetitionService {
    private get competitionRepo() {
        return AppDataSource.getRepository(Competition);
    }

    /**
     * Get all active and upcoming competitions
     */
    async getActiveCompetitions(): Promise<Competition[]> {
        try {
            const now = new Date();
            return this.competitionRepo.find({
                where: [
                    { status: CompetitionStatus.ACTIVE, isActive: true },
                    { status: CompetitionStatus.UPCOMING, isActive: true, startDate: MoreThan(now) },
                ],
                order: { startDate: 'ASC' },
            });
        } catch (error) {
            console.error('Error getting competitions:', error);
            return [];
        }
    }

    /**
     * Get competition by ID
     */
    async getCompetitionById(id: string): Promise<Competition | null> {
        try {
            return this.competitionRepo.findOne({ where: { id } });
        } catch (error) {
            console.error('Error getting competition:', error);
            return null;
        }
    }

    /**
     * Join a competition
     */
    async joinCompetition(competitionId: string, userId: string): Promise<boolean> {
        try {
            const competition = await this.competitionRepo.findOne({ where: { id: competitionId } });
            if (!competition) return false;

            // Increment participants
            await this.competitionRepo.update(competitionId, {
                participants: competition.participants + 1,
            });
            return true;
        } catch (error) {
            console.error('Error joining competition:', error);
            return false;
        }
    }

    /**
     * Submit score for a competition
     */
    async submitScore(competitionId: string, userId: string, username: string, score: number): Promise<boolean> {
        try {
            const competition = await this.competitionRepo.findOne({ where: { id: competitionId } });
            if (!competition) return false;

            const leaderboard = competition.leaderboard || [];

            // Check if user already has a score
            const existingIndex = leaderboard.findIndex(e => e.userId === userId);
            if (existingIndex >= 0) {
                // Only update if new score is higher
                if (score > leaderboard[existingIndex].score) {
                    leaderboard[existingIndex].score = score;
                }
            } else {
                leaderboard.push({ userId, username, score });
            }

            // Sort by score descending
            leaderboard.sort((a, b) => b.score - a.score);

            await this.competitionRepo.update(competitionId, { leaderboard });
            return true;
        } catch (error) {
            console.error('Error submitting score:', error);
            return false;
        }
    }

    /**
     * Get competition leaderboard
     */
    async getLeaderboard(competitionId: string): Promise<{ userId: string; username: string; score: number }[]> {
        try {
            const competition = await this.competitionRepo.findOne({ where: { id: competitionId } });
            return competition?.leaderboard || [];
        } catch (error) {
            console.error('Error getting leaderboard:', error);
            return [];
        }
    }

    // Admin functions

    /**
     * Create a new competition
     */
    async createCompetition(data: {
        title: string;
        description?: string;
        startDate: Date;
        endDate: Date;
        prize?: string;
        minLevel?: number;
        imageUrl?: string;
        tasks?: string[];
        gameTypes?: string[];
    }): Promise<Competition> {
        const now = new Date();
        const status = data.startDate > now ? CompetitionStatus.UPCOMING : CompetitionStatus.ACTIVE;

        const competition = this.competitionRepo.create({
            title: data.title,
            description: data.description,
            startDate: data.startDate,
            endDate: data.endDate,
            prize: data.prize,
            minLevel: data.minLevel || 1,
            imageUrl: data.imageUrl,
            tasks: data.tasks,
            gameTypes: data.gameTypes,
            status,
            isActive: true,
            participants: 0,
            leaderboard: [],
        });

        return this.competitionRepo.save(competition);
    }

    /**
     * Update competition status (cron job)
     */
    async updateCompetitionStatuses(): Promise<void> {
        const now = new Date();

        // Activate upcoming competitions that have started
        await this.competitionRepo.update(
            { status: CompetitionStatus.UPCOMING, startDate: LessThan(now) },
            { status: CompetitionStatus.ACTIVE }
        );

        // Complete active competitions that have ended
        await this.competitionRepo.update(
            { status: CompetitionStatus.ACTIVE, endDate: LessThan(now) },
            { status: CompetitionStatus.COMPLETED }
        );
    }

    /**
     * Delete a competition
     */
    async deleteCompetition(id: string): Promise<void> {
        await this.competitionRepo.delete(id);
    }
}

export const competitionService = new CompetitionService();
