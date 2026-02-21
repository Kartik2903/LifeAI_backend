import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import Groq from "groq-sdk";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2'; // 384 dimensions

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    if (!HF_API_KEY) {
      throw new Error('HUGGINGFACE_API_KEY not configured in .env');
    }

    const response = await fetch(
      `https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HuggingFace API Response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`HuggingFace API error: ${response.statusText} - ${errorText}`);
    }

    const embedding = await response.json();
    // Accept both flat and nested array responses
    if (Array.isArray(embedding) && Array.isArray(embedding[0])) {
      // Nested array (old format)
      console.log('Embedding received (nested), length:', embedding[0].length);
      return embedding[0] as number[];
    } else if (Array.isArray(embedding) && typeof embedding[0] === 'number') {
      // Flat array (new format)
      console.log('Embedding received (flat), length:', embedding.length);
      return embedding as number[];
    } else {
      console.error('Unexpected embedding response:', embedding);
      throw new Error('Unexpected embedding response format');
    }
  } catch (error) {
    console.error('Embedding generation error:', error);
    throw new Error('Failed to generate embedding');
  }
}

export async function transcribeAudio(audioPath: string): Promise<string> {
  try {
    const audioFile = fs.createReadStream(audioPath);
    
    const response = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3',
    });

    return response.text;
  } catch (error) {
    console.error('Groq transcription error:', error);
    throw new Error('Failed to transcribe audio');
  }
}

export async function generateInsights(entries: string[]): Promise<string> {
  try {
    const entriesText = entries.join('\n\n');
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a personal AI life coach. Analyze the user\'s journal entries and provide insightful, personalized reflections and patterns you notice.'
        },
        {
          role: 'user',
          content: `Here are my recent journal entries:\n\n${entriesText}\n\nPlease provide a thoughtful reflection on these entries, highlight any patterns you notice, and give personalized advice.`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });
    const content = response.choices[0].message.content;
    return content || 'Unable to generate insights';
  } catch (error) {
    console.error('Groq insights generation error:', error);
    throw new Error('Failed to generate insights');
  }
}
export async function generateEntryResponse(entryText: string): Promise<string> {
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are LifeAI, a warm and thoughtful personal AI companion. The user just shared a journal entry. Respond with empathy, insight, and gentle curiosity. Keep your response concise (2-4 sentences). Don't be preachy or give unsolicited advice. Acknowledge their feelings, reflect back what you notice, and occasionally ask a thoughtful follow-up question. Be natural and conversational, like a wise friend.`
        },
        {
          role: 'user',
          content: entryText
        }
      ],
      temperature: 0.7,
      max_tokens: 300
    });

    return response.choices[0].message.content || 'Thank you for sharing your thoughts.';
  } catch (error) {
    console.error('Entry response generation error:', error);
    return 'Thank you for sharing your thoughts.';
  }
}

