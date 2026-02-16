-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Entries table
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raw_text TEXT,
  audio_url VARCHAR(500),
  transcribed_text TEXT,
  life_aspects TEXT[] DEFAULT '{}',
  embedding vector(384),
  source VARCHAR(50) CHECK (source IN ('text', 'voice')),
  created_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Insights table
CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_ids UUID[] DEFAULT '{}',
  insight_text TEXT NOT NULL,
  aspect VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_entries_user_id ON entries(user_id);
CREATE INDEX idx_entries_created_at ON entries(created_at DESC);
CREATE INDEX idx_entries_life_aspects ON entries USING GIN(life_aspects);
CREATE INDEX idx_entries_deleted_at ON entries(deleted_at);
CREATE INDEX idx_insights_user_id ON insights(user_id);
CREATE INDEX idx_insights_created_at ON insights(created_at DESC);
CREATE INDEX idx_users_email ON users(email);

-- Vector similarity search index (will be created after data is populated)
-- CREATE INDEX ON entries USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
