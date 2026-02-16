# LifeAI Backend

Backend API for LifeAI with RAG (Retrieval-Augmented Generation) capabilities.

## Setup

### 1. Install Dependencies
```bash
cd /mnt/Shared_Data/Kartik/LifeAI-Backend
npm install
```

### 2. Setup Environment Variables
```bash
cp .env.example .env
# Edit .env with your actual credentials
```

### 3. Create Database
```bash
# Create PostgreSQL database
createdb -U postgres lifeai

# Run schema to create tables
psql -U postgres -d lifeai -f database/schema.sql
```

### 4. Get OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Add to `.env` file as OPENAI_API_KEY

### 5. Start Development Server
```bash
npm run dev
```

Server will run on http://localhost:3000

## API Endpoints

### Auth
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login

### Entries
- `POST /api/entries/text` - Create text entry
- `GET /api/entries` - List entries
- `GET /api/entries/:id` - Get single entry
- `DELETE /api/entries/:id` - Delete entry

## Next Steps
1. Get OpenAI API key
2. Update frontend to call these APIs
3. Add audio transcription endpoint
4. Implement RAG search
