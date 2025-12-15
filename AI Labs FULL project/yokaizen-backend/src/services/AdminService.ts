import { AppDataSource } from '@config/database';
import { User, UserRole, UserTier } from '@entities/User';
import { GameHistory } from '@entities/GameHistory';
import { Transaction } from '@entities/Transaction';
import { Reward, RewardType, RewardRarity } from '@entities/Reward';
import { MoreThan, Between } from 'typeorm';

interface AdminStats {
    dau: number;
    wau: number;
    mau: number;
    totalUsers: number;
    proUsers: number;
    totalRevenue: number;
    activeGames: number;
    newUsersToday: number;
    avgSessionTime: number;
}

interface DailyData {
    name: string;
    users: number;
    date: string;
}

class AdminService {
    private get userRepo() {
        return AppDataSource.getRepository(User);
    }

    private get gameHistoryRepo() {
        return AppDataSource.getRepository(GameHistory);
    }

    private get transactionRepo() {
        return AppDataSource.getRepository(Transaction);
    }

    private get rewardRepo() {
        return AppDataSource.getRepository(Reward);
    }

    /**
     * Get admin dashboard statistics
     */
    async getStats(): Promise<AdminStats> {
        const now = new Date();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        try {
            // Get user counts
            const [totalUsers, dauCount, wauCount, mauCount, proUsers, newUsersToday] = await Promise.all([
                this.userRepo.count({ where: { isActive: true } }),
                this.userRepo.count({ where: { lastLogin: MoreThan(dayAgo) } }),
                this.userRepo.count({ where: { lastLogin: MoreThan(weekAgo) } }),
                this.userRepo.count({ where: { lastLogin: MoreThan(monthAgo) } }),
                this.userRepo.count({ where: { tier: UserTier.PRO_CREATOR } }),
                this.userRepo.count({ where: { createdAt: MoreThan(startOfDay) } }),
            ]);

            // Get revenue (sum of successful transactions)
            let totalRevenue = 0;
            try {
                const revenueResult = await this.transactionRepo
                    .createQueryBuilder('tx')
                    .select('SUM(tx.amount)', 'total')
                    .where('tx.status = :status', { status: 'COMPLETED' })
                    .andWhere('tx.type = :type', { type: 'PURCHASE' })
                    .getRawOne();
                totalRevenue = Number(revenueResult?.total) || 0;
            } catch (e) {
                // Transaction table might not have data yet
            }

            // Get active games count (unique games played in last 24h)
            let activeGames = 0;
            try {
                const activeGamesResult = await this.gameHistoryRepo
                    .createQueryBuilder('gh')
                    .select('COUNT(DISTINCT gh.gameType)', 'count')
                    .where('gh.createdAt > :dayAgo', { dayAgo })
                    .getRawOne();
                activeGames = Number(activeGamesResult?.count) || 0;
            } catch (e) {
                // GameHistory table might not have data yet
            }

            return {
                dau: dauCount,
                wau: wauCount,
                mau: mauCount,
                totalUsers,
                proUsers,
                totalRevenue,
                activeGames,
                newUsersToday,
                avgSessionTime: 25, // Placeholder - would need session tracking
            };
        } catch (error) {
            console.error('Error getting admin stats:', error);
            return {
                dau: 0,
                wau: 0,
                mau: 0,
                totalUsers: 0,
                proUsers: 0,
                totalRevenue: 0,
                activeGames: 0,
                newUsersToday: 0,
                avgSessionTime: 0,
            };
        }
    }

    /**
     * Get daily traffic data for charts
     */
    async getDailyTraffic(days: number = 7): Promise<DailyData[]> {
        const result: DailyData[] = [];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        try {
            for (let i = days - 1; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

                const count = await this.userRepo.count({
                    where: {
                        lastLogin: Between(startOfDay, endOfDay),
                    },
                });

                result.push({
                    name: dayNames[startOfDay.getDay()],
                    users: count,
                    date: startOfDay.toISOString().split('T')[0],
                });
            }
        } catch (error) {
            console.error('Error getting daily traffic:', error);
            // Return placeholder data if database query fails
            for (let i = days - 1; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                result.push({
                    name: dayNames[date.getDay()],
                    users: 0,
                    date: date.toISOString().split('T')[0],
                });
            }
        }

        return result;
    }

    /**
     * Get all rewards for admin management
     */
    async getRewards(): Promise<Reward[]> {
        try {
            return await this.rewardRepo.find({
                order: { createdAt: 'DESC' },
            });
        } catch (error) {
            console.error('Error getting rewards:', error);
            return [];
        }
    }

    /**
     * Create a new reward
     */
    async createReward(data: {
        name: string;
        description?: string;
        type: RewardType;
        rarity?: RewardRarity;
        icon?: string;
        cost?: number;
        stock?: number;
        code?: string;
        link?: string;
        criteria?: string;
    }): Promise<Reward> {
        const reward = this.rewardRepo.create({
            name: data.name,
            description: data.description,
            type: data.type,
            rarity: data.rarity || RewardRarity.COMMON,
            icon: data.icon,
            cost: data.cost,
            stock: data.stock,
            code: data.code,
            link: data.link,
            criteria: data.criteria,
            isActive: true,
        });

        return this.rewardRepo.save(reward);
    }

    /**
     * Update a reward
     */
    async updateReward(rewardId: string, data: Partial<Reward>): Promise<Reward> {
        await this.rewardRepo.update(rewardId, data);
        return this.rewardRepo.findOneOrFail({ where: { id: rewardId } });
    }

    /**
     * Delete a reward
     */
    async deleteReward(rewardId: string): Promise<void> {
        await this.rewardRepo.delete(rewardId);
    }

    /**
     * Get all users with pagination for admin view
     */
    async getUsers(options: {
        page?: number;
        limit?: number;
        role?: UserRole;
        tier?: UserTier;
        search?: string;
    }): Promise<{ users: User[]; total: number }> {
        const { page = 1, limit = 50, role, tier, search } = options;

        try {
            const qb = this.userRepo.createQueryBuilder('user');

            if (role) {
                qb.andWhere('user.role = :role', { role });
            }

            if (tier) {
                qb.andWhere('user.tier = :tier', { tier });
            }

            if (search) {
                qb.andWhere(
                    '(user.username ILIKE :search OR user.email ILIKE :search OR user.phone ILIKE :search)',
                    { search: `%${search}%` }
                );
            }

            const [users, total] = await qb
                .orderBy('user.createdAt', 'DESC')
                .skip((page - 1) * limit)
                .take(limit)
                .getManyAndCount();

            return { users, total };
        } catch (error) {
            console.error('Error getting users:', error);
            return { users: [], total: 0 };
        }
    }

    /**
     * Update user role (admin only)
     */
    async updateUserRole(userId: string, role: UserRole): Promise<User> {
        await this.userRepo.update(userId, { role });
        return this.userRepo.findOneOrFail({ where: { id: userId } });
    }

    /**
     * Ban a user
     */
    async banUser(userId: string, reason: string): Promise<User> {
        await this.userRepo.update(userId, {
            isBanned: true,
            banReason: reason,
            isActive: false,
        });
        return this.userRepo.findOneOrFail({ where: { id: userId } });
    }

    /**
     * Unban a user
     */
    async unbanUser(userId: string): Promise<User> {
        await this.userRepo.update(userId, {
            isBanned: false,
            banReason: undefined,
            isActive: true,
        });
        return this.userRepo.findOneOrFail({ where: { id: userId } });
    }

    /**
     * Check if user is admin
     */
    async isAdmin(userId: string): Promise<boolean> {
        try {
            const user = await this.userRepo.findOne({ where: { id: userId } });
            return user?.role === UserRole.ADMIN;
        } catch (error) {
            return false;
        }
    }
}

export const adminService = new AdminService();
