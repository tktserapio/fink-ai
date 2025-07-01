import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import multer from 'multer';
import { Readable } from 'stream';
import FormData from 'form-data'
import axios from 'axios';

const upload = multer();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Prisma (MongoDB)
const prisma = new PrismaClient();

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize Pinecone client and index
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);

// Health-check
app.get('/', (_req, res) => res.send('Fink AI Backend is running'));

// GET /v1/notes  – list recent notes
app.get('/v1/notes', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const notes = await prisma.note.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, title: true, content: true, createdAt: true }
    });
    res.json(notes);
  } catch (err) {
    console.error('GET /v1/notes error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /v1/ingest-note  – create note, embed, upsert
app.post('/v1/ingest-note', async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required.' });
    }
    // 1. Store note
    const note = await prisma.note.create({ data: { title, content } });
    // 2. Create embedding
    const embedRes = await openai.embeddings.create({
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      input: content,
    });
    const vector = embedRes.data[0].embedding;
    // 3. Upsert into Pinecone
    await index.upsert([
      { id: note.id, values: vector, metadata: { title, content, createdAt: note.createdAt.toISOString() } }
    ]);
    res.status(201).json(note);
  } catch (err) {
    console.error('POST /v1/ingest-note error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.post('/v1/ingest', upload.single('file'), async (req, res) => {
  try {
    const file = req.file
    if (!file) return res.status(400).json({ error: 'No file uploaded.' })

    // If it's audio, go through Whisper → GPT → note pipeline:
    if (file.mimetype.startsWith('audio/')) {
      // 1️⃣ Build multipart form for Whisper
      const form = new FormData()
      form.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      })
      form.append('model', 'whisper-1')

      // 2️⃣ Call Whisper manually
      const whisperRes = await axios.post(
        'https://api.openai.com/v1/audio/transcriptions',
        form,
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            ...form.getHeaders(),
          },
          maxBodyLength: Infinity,
        }
      )
      const transcription = whisperRes.data.text

      // 3️⃣ Generate a title
      const titleRes = await openai.chat.completions.create({
        model: process.env.CHAT_MODEL || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Generate a concise title for this transcript:' },
          { role: 'user',   content: transcription },
        ],
        temperature: 0.3,
        max_tokens: 20,
      })
      const title = titleRes.choices[0].message.content.trim()

      // 4️⃣ Store & embed as before
      const note = await prisma.note.create({ data: { title, content: transcription } })
      const embedRes = await openai.embeddings.create({
        model: process.env.EMBEDDING_MODEL,
        input: transcription,
      })
      const vector = embedRes.data[0].embedding
      await index.upsert([{ id: note.id, values: vector, metadata: { title, content: transcription, createdAt: note.createdAt.toISOString() } }])

      return res.status(201).json(note)
    }

    // … otherwise your existing “document ingest” logic goes here …

  } catch (err) {
    console.error('POST /v1/ingest error:', err)
    res.status(500).json({ error: 'Internal server error.' })
  }
});

// we structure the post like this so that 


// PUT /v1/notes/:id  – update note, re-embed, upsert
app.put('/v1/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required.' });
    }
    // 1. Update note
    const note = await prisma.note.update({ where: { id }, data: { title, content } });
    // 2. Re-generate embedding
    const embedRes = await openai.embeddings.create({
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      input: content,
    });
    const vector = embedRes.data[0].embedding;
    // 3. Upsert updated vector
    await index.upsert([
      { id: note.id, values: vector, metadata: { title, content, createdAt: note.createdAt.toISOString() } }
    ]);
    res.json(note);
  } catch (err) {
    console.error('PUT /v1/notes/:id error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /v1/notes/:id  – delete note & vector
app.delete('/v1/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.note.delete({ where: { id } });
    // Remove from Pinecone
    await index.deleteMany([id]);
    res.status(204).end();
  } catch (err) {
    console.error('DELETE /v1/notes/:id error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /v1/chat  – retrieve relevant contexts & chat
app.post('/v1/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }
    // 1. Embed query
    const embedRes = await openai.embeddings.create({
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      input: message,
    });
    const queryVector = embedRes.data[0].embedding;
    // 2. Retrieve top K contexts
    const queryResponse = await index.query({
        vector: queryVector,
        topK: 5,
        includeMetadata: true,
    });
    const contexts = queryResponse.matches
      .map(m => m.metadata.content)
      .join('\n---\n');
    // 3. Build chat messages
    const systemPrompt = `You are Fink AI, a helpful assistant. Use the following user notes to answer the question.\n\n${contexts}`;
    const chatRes = await openai.chat.completions.create({
      model: process.env.CHAT_MODEL || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: parseFloat(process.env.TEMPERATURE) || 0.7,
      max_tokens: parseInt(process.env.MAX_TOKENS) || 512,
    });
    const answer = chatRes.choices[0].message.content;
    res.json({ answer });
  } catch (err) {
    console.error('POST /v1/chat error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));