
import { AppDataSource } from './src/config/data-source';
import { seedBadges } from './src/seeds/BadgeSeeder';
import { logger } from './src/config/logger';

async function main() {
    try {
        console.log("Initializing Data Source...");
        await AppDataSource.initialize();
        console.log("Data Source initialized.");

        console.log("Running Badge Seeder...");
        await seedBadges();
        console.log("Badges seeded successfully!");

        await AppDataSource.destroy();
        process.exit(0);
    } catch (error) {
        console.error("Error seeding badges:", error);
        process.exit(1);
    }
}

main();
