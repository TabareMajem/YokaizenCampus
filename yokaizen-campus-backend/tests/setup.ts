import { config } from 'dotenv';

// Load test environment
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.ENABLE_MOCK_AI = 'true';

// Increase timeout for async tests
jest.setTimeout(30000);

// Mock Redis
jest.mock('../src/utils/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    hGet: jest.fn(),
    hSet: jest.fn(),
    hGetAll: jest.fn().mockResolvedValue({}),
    hDel: jest.fn(),
    lPush: jest.fn(),
    lRange: jest.fn().mockResolvedValue([]),
    lTrim: jest.fn(),
    rPush: jest.fn(),
    expire: jest.fn(),
    quit: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG')
  },
  REDIS_KEYS: {
    classroomState: (id: string) => `classroom:${id}:state`,
    raisedHands: (id: string) => `classroom:${id}:hands`,
    session: (id: string) => `session:${id}`,
    rateLimit: (key: string) => `ratelimit:${key}`
  },
  REDIS_TTL: {
    classroomState: 3600,
    session: 86400
  }
}));

// Global teardown
afterAll(async () => {
  // Clean up any resources
});
