import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from './env';

// Entity imports
import { User } from '../entities/User';
import { Squad } from '../entities/Squad';
import { Inventory } from '../entities/Inventory';
import { Skill } from '../entities/Skill';
import { GameHistory } from '../entities/GameHistory';
import { Agent } from '../entities/Agent';
import { GeneratedGame } from '../entities/GeneratedGame';
import { Transaction } from '../entities/Transaction';
import { SquadMission } from '../entities/SquadMission';
import { KnowledgeChunk } from '../entities/KnowledgeChunk';

export const entities = [
  User,
  Squad,
  Inventory,
  Skill,
  GameHistory,
  Agent,
  GeneratedGame,
  Transaction,
  SquadMission,
  KnowledgeChunk,
];

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: config.database.url,
  host: config.database.host,
  port: config.database.port,
  username: config.database.user,
  password: config.database.password,
  database: config.database.name,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
  synchronize: config.server.isDevelopment, // Auto-sync in dev only
  logging: config.server.isDevelopment ? ['error', 'warn', 'query'] : ['error'],
  entities,
  migrations: ['src/migrations/*.ts'],
  subscribers: [],
  poolSize: 20,
  extra: {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
};

export const AppDataSource = new DataSource(dataSourceOptions);

export const initializeDatabase = async (): Promise<DataSource> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connection established');

      // Enable pgvector extension for RAG
      await AppDataSource.query('CREATE EXTENSION IF NOT EXISTS vector');
      console.log('✅ pgvector extension enabled');
    }
    return AppDataSource;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log('✅ Database connection closed');
  }
};

export default AppDataSource;
