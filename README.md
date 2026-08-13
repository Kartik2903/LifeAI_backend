# LifeAI Backend

Backend API for LifeAI — an AI-powered personal journaling and life-tracking platform with RAG (Retrieval-Augmented Generation) capabilities. Supports text and audio entries, AI-generated insights, and a personal dashboard.

## Features

- **User Authentication** — JWT-based signup/login with bcrypt password hashing
- **Journal Entries** — Create text entries and audio entries (with transcription)
- **AI-Powered Insights** — Generate personalized insights from recent entries using Groq LLM
- **Audio Transcription** — Upload audio files and get AI transcriptions via Groq
- **RAG Pipeline** — Embeddings-based retrieval for context-aware AI responses
- **Dashboard Analytics** — Aggregated stats and trends from user entries

## Tech Stack

- **Runtime**: Node.js, TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **AI/LLM**: Groq API (transcription, embeddings, insights generation)
- **Auth**: JWT + bcrypt
- **File Uploads**: Multer

## API Endpoints

### Authentication
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login (returns JWT) |

### Entries
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/entries/text` | Create text entry |
| POST | `/api/entries/audio` | Upload and transcribe audio |
| GET | `/api/entries` | List all entries |
| GET | `/api/entries/:id` | Get single entry |
| DELETE | `/api/entries/:id` | Delete entry |

### Insights
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/insights/generate` | Generate AI insights from recent entries |

### Dashboard
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/dashboard` | Dashboard analytics |

### Health
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Server health check |

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL

### Installation

```bash
git clone https://github.com/Kartik2903/LifeAI_backend.git
cd LifeAI_backend
npm install
```

### Environment Setup

```bash
cp .env.example .env
# Fill in: DATABASE_URL, JWT_SECRET, GROQ_API_KEY
```

### Database Setup

```bash
createdb -U postgres lifeai
psql -U postgres -d lifeai -f database/schema.sql
```

### Run

```bash
npm run dev
```

Server runs on `http://localhost:3000`

## Author

**Kartik Dewnani**

