-- =========================================
-- Yokaizen AI Labs - Database Initialization
-- PostgreSQL with pgvector extension
-- =========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

-- =========================================
-- Enum Types
-- =========================================

-- User-related enums
CREATE TYPE user_tier AS ENUM ('FREE', 'OPERATIVE', 'PRO_CREATOR');
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');

-- Squad-related enums
CREATE TYPE squad_tier AS ENUM ('ROOKIE', 'REGULAR', 'VETERAN', 'ELITE');

-- Game-related enums
CREATE TYPE game_type AS ENUM (
    'FOCUS_FLOW', 
    'MIND_MAZE', 
    'WORD_WARRIOR', 
    'MEMORY_MATRIX', 
    'SPEED_SAGE', 
    'PATTERN_PULSE',
    'DAILY_CHALLENGE',
    'CUSTOM'
);
CREATE TYPE game_difficulty AS ENUM ('EASY', 'MEDIUM', 'HARD', 'EXTREME');

-- Item-related enums
CREATE TYPE item_type AS ENUM ('BADGE', 'SKIN', 'TOOL', 'AVATAR_FRAME', 'BOOST', 'EMOTE', 'TITLE', 'BACKGROUND');
CREATE TYPE item_rarity AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- Skill-related enums
CREATE TYPE skill_category AS ENUM ('COGNITIVE', 'CREATIVE', 'SOCIAL', 'TECHNICAL', 'LEADERSHIP', 'WELLNESS');

-- AI-related enums
CREATE TYPE ai_model AS ENUM ('GEMINI_PRO', 'GEMINI_FLASH', 'GPT4', 'DEEPSEEK');

-- Transaction-related enums
CREATE TYPE transaction_type AS ENUM ('CREDIT_PURCHASE', 'SUBSCRIPTION', 'SQUAD_CONTRIBUTION', 'REWARD', 'REFUND');
CREATE TYPE transaction_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- Mission-related enums
CREATE TYPE mission_type AS ENUM ('XP_RACE', 'SCORE_ATTACK', 'ENDURANCE', 'COLLABORATIVE');
CREATE TYPE mission_status AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'FAILED', 'EXPIRED');

-- =========================================
-- Indexes Configuration
-- =========================================

-- Function to create standard indexes on a table
CREATE OR REPLACE FUNCTION create_standard_indexes(table_name text)
RETURNS void AS $$
BEGIN
    -- Most tables will have created_at and updated_at
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_created_at ON %s (created_at DESC)', table_name, table_name);
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- Helper Functions
-- =========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate level from XP
CREATE OR REPLACE FUNCTION calculate_level(xp BIGINT)
RETURNS INTEGER AS $$
BEGIN
    RETURN FLOOR(SQRT(xp::numeric / 100));
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- Grant Permissions
-- =========================================

-- Grant all privileges to the app user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO yokaizen;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO yokaizen;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO yokaizen;

-- Default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO yokaizen;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO yokaizen;

-- =========================================
-- Initial Seed Data (Optional)
-- =========================================

-- You can add initial seed data here for development
-- Example:
-- INSERT INTO users (id, firebase_uid, username, tier, role) 
-- VALUES ('00000000-0000-0000-0000-000000000001', 'admin_uid', 'admin', 'PRO_CREATOR', 'ADMIN');

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Yokaizen database initialized successfully!';
    RAISE NOTICE 'Extensions enabled: uuid-ossp, vector, pg_trgm';
    RAISE NOTICE 'Enum types created: user_tier, user_role, squad_tier, game_type, etc.';
END $$;
