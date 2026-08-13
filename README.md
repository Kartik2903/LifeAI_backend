# LifeAI Backend

Backend API for LifeAI — an AI-powered personal journaling platform with a full RAG (Retrieval-Augmented Generation) pipeline. Users create text or voice journal entries, which are embedded into a vector space for semantic search and fed to an LLM for empathetic responses, pattern recognition, and personalized life coaching insights.

## Features

### Journal Entries
- **Text entries** — Write journal entries tagged with life aspects; each entry is embedded and stored with its vector representation
- **Audio entries** — Upload audio files (WAV, MP3, MP4, WebM, OGG, up to 25MB) transcribed in real-time using Groq Whisper Large V3
- **AI companion response** — Every entry receives an empathetic 2-4 sentence response from Llama 3.3 70B, reflecting back feelings and asking thoughtful follow-up questions
- **Soft deletes** — Entries are never permanently removed; `deleted_at` timestamp preserves data integrity

### RAG Pipeline
- **Embedding generation** — Each entry is converted to a 384-dimensional vector using HuggingFace `sentence-transformers/all-MiniLM-L6-v2`
- **Vector storage** — Embeddings stored in PostgreSQL via `pgvector` extension with `vector(384)` column type
- **Semantic search** — `POST /api/entries/search` uses pgvector's cosine distance operator (`<=>`) to find semantically similar past entries, returning similarity scores
- **GIN indexing** — Life aspects array indexed with GIN for fast tag-based queries

### AI-Powered Insights
- **Pattern analysis** — Aggregates entries from a configurable time window (default 7 days), feeds them to Llama 3.3 70B acting as a personal life coach
- **Persistent storage** — Generated insights are stored in the `insights` table with references to source entry IDs
- **Insight history** — Retrieve past insights with entry counts and timestamps

### Dashboard Analytics
- **Life aspect distribution** — Counts entries per life aspect tag using `UNNEST` aggregation
- **Daily entry trends** — Entry counts grouped by date for the selected period
- **Source breakdown** — Text vs. audio entry distribution
- **Recent insights** — Last 5 AI-generated insights with entry counts
- **Configurable period** — Query parameter controls the time window (default 30 days)

### Authentication
- **JWT-based auth** — 30-day token expiry, Bearer token scheme
- **Bcrypt password hashing** — Cost factor 10 with salt rounds
- **Auth middleware** — Extracts and validates JWT from `Authorization` header, injects `userId` and `email` into request
- **User profile** — `GET /api/auth/me` validates token and returns user data

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js, TypeScript |
| Framework | Express.js |
| Database | PostgreSQL with pgvector extension |
| LLM | Groq API — Llama 3.3 70B Versatile |
| Transcription | Groq API — Whisper Large V3 |
| Embeddings | HuggingFace Inference API — all-MiniLM-L6-v2 (384 dims) |
| Auth | JWT (jsonwebtoken) + bcrypt |
| File Uploads | Multer (disk storage) |

## API Endpoints

### Authentication
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/signup` | Public | Create account (email, password, optional name) |
| POST | `/api/auth/login` | Public | Login, returns JWT |
| GET | `/api/auth/me` | Bearer | Get current user profile |

### Entries
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/entries/text` | Bearer | Create text entry (returns AI companion response) |
| POST | `/api/entries/audio` | Bearer | Upload audio → transcribe → embed → store (returns AI response) |
| GET | `/api/entries` | Bearer | List entries (supports `?limit=` and `?offset=`) |
| GET | `/api/entries/:id` | Bearer | Get single entry |
| DELETE | `/api/entries/:id` | Bearer | Soft-delete entry |
| POST | `/api/entries/search` | Bearer | Semantic similarity search via pgvector cosine distance |

### Insights
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/insights/generate` | Bearer | Generate AI insights from recent entries (`?days=7`) |
| GET | `/api/insights` | Bearer | List past insights |

### Dashboard
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/dashboard` | Bearer | Aggregated analytics (`?days=30`) |

### Health
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/health` | Public | Server health check |

## Database Schema

```sql
-- pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

users    (id UUID, email, password_hash, name, preferences JSONB)
entries  (id UUID, user_id FK, raw_text, audio_url, transcribed_text,
          life_aspects TEXT[], embedding vector(384), source, created_at, deleted_at)
insights (id UUID, user_id FK, entry_ids UUID[], insight_text, aspect, created_at)
```

**Indexes:** user_id, created_at DESC, GIN on life_aspects, email unique, ivfflat on embedding (planned)

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL with pgvector extension

### Installation

```bash
git clone https://github.com/Kartik2903/LifeAI_backend.git
cd LifeAI_backend
npm install
```

### Environment Setup

```bash
cp .env.example .env
# Configure: DATABASE_URL, JWT_SECRET, GROQ_API_KEY, HUGGINGFACE_API_KEY
```

### Database Setup

```bash
createdb -U postgres lifeai
psql -U postgres -d lifeai -f database/schema.sql
```

### Run

```bash
npm run dev    # Development with nodemon + ts-node
npm run build  # Compile TypeScript
npm start      # Production
```

Server runs on `http://localhost:3000`

## Project Structure

```
src/
├── index.ts              — Express app setup, middleware, route mounting
├── config/database.ts    — PostgreSQL connection pool (supports DATABASE_URL and individual params)
├── middleware/auth.ts     — JWT verification middleware
├── routes/
│   ├── auth.ts           — Signup, login, profile endpoints
│   ├── entries.ts        — CRUD + audio upload + semantic search
│   ├── insights.ts       — AI insight generation and retrieval
│   └── dashboard.ts      — Aggregated analytics queries
└── services/
    └── groq.ts           — HuggingFace embeddings, Groq Whisper transcription, Llama 3.3 chat
database/
└── schema.sql            — PostgreSQL schema with pgvector
```

## Author

**Kartik Dewnani**

