import { Router, Request } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pool from '../config/database';
import { authMiddleware } from '../middleware/auth';
import { generateEmbedding, transcribeAudio, generateEntryResponse } from '../services/groq';

const router = Router();

// Configure multer for audio uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'audio-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio file type'));
    }
  }
});

// All routes require authentication
router.use(authMiddleware);

// Create text entry
router.post('/text', async (req: Request, res: any) => {
  try {
    const { text, life_aspect } = req.body;
    const userId = req.user?.userId;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Generate embedding
    const embedding = await generateEmbedding(text);
    
    // Format embedding as PostgreSQL vector string: [1,2,3,...]
    const embeddingString = `[${embedding.join(',')}]`;

    // Store entry
    const result = await pool.query(
      `INSERT INTO entries (user_id, raw_text, embedding, life_aspects, source, created_at) 
       VALUES ($1, $2, $3::vector, $4, $5, NOW()) 
       RETURNING id, raw_text, life_aspects, created_at`,
      [userId, text, embeddingString, life_aspect ? [life_aspect] : [], 'text']
    );

    // Generate AI response to the entry
    const aiResponse = await generateEntryResponse(text);

    res.status(201).json({
      message: 'Entry created successfully',
      entry: result.rows[0],
      ai_response: aiResponse
    });
  } catch (error) {
    console.error('Create entry error:', error);
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

// Create audio entry
router.post('/audio', upload.single('audio'), async (req: Request, res: any) => {
  try {
    const userId = req.user?.userId;
    const life_aspect = req.body.life_aspect;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const audioPath = req.file.path;
    console.log('Transcribing audio file:', audioPath);

    // Transcribe audio using Groq Whisper
    const transcribedText = await transcribeAudio(audioPath);
    console.log('Transcription complete:', transcribedText.substring(0, 100));

    // Generate embedding from transcribed text
    const embedding = await generateEmbedding(transcribedText);
    const embeddingString = `[${embedding.join(',')}]`;

    // Store entry with audio URL and transcribed text
    const audioUrl = `/uploads/${path.basename(audioPath)}`;
    const result = await pool.query(
      `INSERT INTO entries (user_id, raw_text, transcribed_text, audio_url, embedding, life_aspects, source, created_at) 
       VALUES ($1, $2, $3, $4, $5::vector, $6, $7, NOW()) 
       RETURNING id, raw_text, transcribed_text, audio_url, life_aspects, created_at`,
      [userId, transcribedText, transcribedText, audioUrl, embeddingString, life_aspect ? [life_aspect] : [], 'audio']
    );

    // Generate AI response to the transcribed entry
    const aiResponse = await generateEntryResponse(transcribedText);

    res.status(201).json({
      message: 'Audio entry created successfully',
      entry: result.rows[0],
      ai_response: aiResponse
    });
  } catch (error) {
    console.error('Create audio entry error:', error);
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Failed to delete audio file:', err);
      });
    }
    res.status(500).json({ error: 'Failed to create audio entry' });
  }
});

// Get all entries for user
router.get('/', async (req: Request, res: any) => {
  try {
    const userId = req.user?.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await pool.query(
      `SELECT id, raw_text, transcribed_text, life_aspects, source, created_at 
       FROM entries 
       WHERE user_id = $1 AND deleted_at IS NULL 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.json({
      entries: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    console.error('Get entries error:', error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// Get single entry
router.get('/:id', async (req: Request, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const result = await pool.query(
      `SELECT id, raw_text, transcribed_text, life_aspects, source, created_at 
       FROM entries 
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json({ entry: result.rows[0] });
  } catch (error) {
    console.error('Get entry error:', error);
    res.status(500).json({ error: 'Failed to fetch entry' });
  }
});

// Delete entry (soft delete)
router.delete('/:id', async (req: Request, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const result = await pool.query(
      'UPDATE entries SET deleted_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('Delete entry error:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

// RAG: Search similar entries by semantic similarity
router.post('/search', async (req: Request, res: any) => {
  try {
    const { query, limit = 5 } = req.body;
    const userId = req.user?.userId;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);
    const queryEmbeddingString = `[${queryEmbedding.join(',')}]`;

    // Use pgvector cosine distance to find similar entries
    // <=> operator computes cosine distance (lower is more similar)
    const result = await pool.query(
      `SELECT id, raw_text, transcribed_text, life_aspects, source, created_at,
              1 - (embedding <=> $1::vector) as similarity
       FROM entries 
       WHERE user_id = $2 AND deleted_at IS NULL
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      [queryEmbeddingString, userId, limit]
    );

    res.json({
      query,
      results: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Search entries error:', error);
    res.status(500).json({ error: 'Failed to search entries' });
  }
});

export default router;
