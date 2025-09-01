console.log('Starting Multi-Modal Notes Server...');

import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import {
  processTextContent,
  processAudioFile,
  processPdfFile,
  processImageFile,
  processVideoFile,
  generateEmbeddings
} from './ai-processors.js';
import helmet from 'helmet';

const upload = multer({ 
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  storage: multer.memoryStorage()
});

const app = express();

// CORS configuration
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGIN 
  ? process.env.ALLOWED_ORIGIN.split(',') 
  : ['http://localhost:3000'];

app.use(cors({ 
  origin: ALLOWED_ORIGINS, 
  credentials: true 
}));
app.use(helmet());
app.use(express.json({ limit: '50mb' }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Initialize Prisma (MongoDB)
const prisma = new PrismaClient();

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize Pinecone client and index
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);

// Health-check
app.get('/', (_req, res) => res.send('Fink AI Multi-Modal Backend is running'));

// GET /v1/notes  – list recent multi-modal notes
app.get('/v1/notes', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const notes = await prisma.note.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json(notes);
  } catch (err) {
    console.error('GET /v1/notes error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /v1/notes - Create a new multi-modal note
app.post('/v1/notes', async (req, res) => {
  try {
    const { title, contents } = req.body;
    if (!title || !contents || !Array.isArray(contents)) {
      return res.status(400).json({ error: 'Title and contents array are required.' });
    }

    // Process each content piece
    const processedContents = [];
    let allTextContent = title + ' '; // Start with title for embedding

    for (const content of contents) {
      const processedContent = {
        id: content.id || uuidv4(),
        type: content.type,
        content: content.content,
        timestamp: new Date(content.timestamp || Date.now()),
        metadata: content.metadata || {}
      };

      // Add content to embedding text
      if (content.type === 'text') {
        allTextContent += content.content + ' ';
      }

      processedContents.push(processedContent);
    }

    // Create note
    const note = await prisma.note.create({
      data: {
        title,
        contents: processedContents,
        participants: [],
        tags: [],
      }
    });

    // Generate and store embeddings
    if (allTextContent.trim()) {
      const vector = await generateEmbeddings(allTextContent);
      if (vector) {
        await index.upsert([{
          id: note.id,
          values: vector,
          metadata: {
            title: note.title,
            content: allTextContent,
            createdAt: note.createdAt.toISOString(),
            contentTypes: processedContents.map(c => c.type).join(',')
          }
        }]);
      }
    }

    res.status(201).json(note);
  } catch (err) {
    console.error('POST /v1/notes error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /v1/ingest - Enhanced multi-modal file processing
app.post('/v1/ingest', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { noteId, enableAI = 'true', extractSummary = 'true', processOnly = 'false' } = req.body;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    console.log(`Processing ${file.mimetype} file: ${file.originalname}`);

    let processedData = {};
    let contentType = 'file';

    // Process based on file type
    if (file.mimetype.startsWith('audio/')) {
      contentType = 'audio';
      processedData = await processAudioFile(file);
    } else if (file.mimetype === 'application/pdf') {
      contentType = 'pdf';
      processedData = await processPdfFile(file);
    } else if (file.mimetype.startsWith('image/')) {
      contentType = 'image';
      processedData = await processImageFile(file);
    } else if (file.mimetype.startsWith('video/')) {
      contentType = 'video';
      processedData = await processVideoFile(file);
    } else {
      return res.status(400).json({ error: 'Unsupported file type.' });
    }

    // Create MediaContent object
    const mediaContent = {
      id: uuidv4(),
      type: contentType,
      content: processedData.transcript || processedData.extractedText || processedData.summary || file.originalname,
      timestamp: new Date(),
      metadata: {
        originalFilename: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        ...processedData
      }
    };

    // If noteId is provided, add to existing note
    if (noteId) {
      try {
        const existingNote = await prisma.note.findUnique({
          where: { id: noteId }
        });

        if (!existingNote) {
          return res.status(404).json({ error: 'Note not found.' });
        }

        const updatedContents = [...existingNote.contents, mediaContent];
        
        const updatedNote = await prisma.note.update({
          where: { id: noteId },
          data: { 
            contents: updatedContents,
            updatedAt: new Date()
          }
        });

        // Update embeddings
        const allTextContent = extractAllText(updatedNote);
        if (allTextContent) {
          const vector = await generateEmbeddings(allTextContent);
          if (vector) {
            await index.upsert([{
              id: updatedNote.id,
              values: vector,
              metadata: {
                title: updatedNote.title,
                content: allTextContent,
                createdAt: updatedNote.createdAt.toISOString(),
                contentTypes: updatedNote.contents.map(c => c.type).join(',')
              }
            }]);
          }
        }

        return res.status(200).json({
          success: true,
          content: mediaContent,
          note: updatedNote,
          status: 'completed'
        });
      } catch (error) {
        console.error('Error updating note:', error);
        return res.status(500).json({ error: 'Failed to update note.' });
      }
    }

    // If processOnly is true, just return the processed content without creating a note
    if (processOnly === 'true') {
      return res.status(200).json({
        success: true,
        content: mediaContent,
        status: 'processed'
      });
    }

    // Otherwise, create a new note
    const title = generateTitleFromContent(mediaContent, processedData);
    
    const newNote = await prisma.note.create({
      data: {
        title,
        contents: [mediaContent],
        participants: processedData.participants || [],
        tags: processedData.keyTopics || [],
      }
    });

    // Generate embeddings for the new note
    const allTextContent = extractAllText(newNote);
    if (allTextContent) {
      const vector = await generateEmbeddings(allTextContent);
      if (vector) {
        await index.upsert([{
          id: newNote.id,
          values: vector,
          metadata: {
            title: newNote.title,
            content: allTextContent,
            createdAt: newNote.createdAt.toISOString(),
            contentTypes: newNote.contents.map(c => c.type).join(',')
          }
        }]);
      }
    }

    res.status(201).json({
      success: true,
      content: mediaContent,
      note: newNote,
      status: 'completed'
    });

  } catch (err) {
    console.error('POST /v1/ingest error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /v1/notes/:id  – update multi-modal note
app.put('/v1/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, contents } = req.body;
    
    if (!title || !contents) {
      return res.status(400).json({ error: 'Title and contents are required.' });
    }

    // Update note
    const note = await prisma.note.update({
      where: { id },
      data: { 
        title, 
        contents,
        updatedAt: new Date()
      }
    });

    // Re-generate embeddings
    const allTextContent = extractAllText(note);
    if (allTextContent) {
      const vector = await generateEmbeddings(allTextContent);
      if (vector) {
        await index.upsert([{
          id: note.id,
          values: vector,
          metadata: {
            title: note.title,
            content: allTextContent,
            createdAt: note.createdAt.toISOString(),
            contentTypes: note.contents.map(c => c.type).join(',')
          }
        }]);
      }
    }

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

// POST /v1/search - Enhanced semantic search across multi-modal content
app.post('/v1/search', async (req, res) => {
  try {
    const { query, filters = [], includeContent = true, includeSummary = true } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required.' });
    }

    // Generate query embedding
    const vector = await generateEmbeddings(query);
    if (!vector) {
      return res.status(500).json({ error: 'Failed to generate query embedding.' });
    }

    // Search in Pinecone
    const searchResults = await index.query({
      vector: vector,
      topK: 10,
      includeMetadata: true,
      // Add filters based on content types if specified
      filter: filters.length > 0 ? { contentTypes: { $in: filters } } : undefined
    });

    // Get full note data for matches
    const noteIds = searchResults.matches.map(m => m.id);
    const notes = await prisma.note.findMany({
      where: { id: { in: noteIds } }
    });

    // Sort notes by relevance score
    const sortedNotes = searchResults.matches
      .map(match => {
        const note = notes.find(n => n.id === match.id);
        return note ? { ...note, relevanceScore: match.score } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Find relevant content pieces within notes
    const relevantContent = [];
    for (const note of sortedNotes) {
      for (const content of note.contents) {
        if (content.type === 'text' && content.content.toLowerCase().includes(query.toLowerCase())) {
          relevantContent.push({ ...content, noteId: note.id, noteTitle: note.title });
        } else if (content.metadata?.transcript && content.metadata.transcript.toLowerCase().includes(query.toLowerCase())) {
          relevantContent.push({ ...content, noteId: note.id, noteTitle: note.title });
        } else if (content.metadata?.extractedText && content.metadata.extractedText.toLowerCase().includes(query.toLowerCase())) {
          relevantContent.push({ ...content, noteId: note.id, noteTitle: note.title });
        }
      }
    }

    res.json({
      notes: sortedNotes,
      relevantContent,
      totalResults: sortedNotes.length,
      query
    });

  } catch (err) {
    console.error('POST /v1/search error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /v1/chat  – Enhanced chat with multi-modal context
app.post('/v1/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    // Generate query embedding
    const vector = await generateEmbeddings(message);
    if (!vector) {
      return res.status(500).json({ error: 'Failed to generate query embedding.' });
    }

    // Retrieve relevant contexts
    const queryResponse = await index.query({
      vector: vector,
      topK: 5,
      includeMetadata: true,
    });

    // Get full note data for context
    const noteIds = queryResponse.matches.map(m => m.id);
    const contextNotes = await prisma.note.findMany({
      where: { id: { in: noteIds } }
    });

    // Build context from multi-modal content
    const contexts = contextNotes.map(note => {
      const textContent = extractAllText(note);
      return `Note: ${note.title}\nContent: ${textContent}\n---`;
    }).join('\n');

    // Build chat messages with enhanced context
    const systemPrompt = `You are Fink AI, a helpful assistant that can analyze multi-modal notes including text, audio transcripts, PDF content, and image text. Use the following user notes to answer the question comprehensively.\n\nRelevant Notes:\n${contexts}`;
    
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
    
    res.json({ 
      answer,
      sourceNotes: contextNotes.map(note => ({
        id: note.id,
        title: note.title,
        contentTypes: note.contents.map(c => c.type)
      }))
    });
  } catch (err) {
    console.error('POST /v1/chat error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Helper functions
function extractAllText(note) {
  let allText = note.title + ' ';
  
  for (const content of note.contents) {
    if (content.type === 'text') {
      allText += content.content + ' ';
    } else if (content.metadata?.transcript) {
      allText += content.metadata.transcript + ' ';
    } else if (content.metadata?.extractedText) {
      allText += content.metadata.extractedText + ' ';
    } else if (content.metadata?.summary) {
      allText += content.metadata.summary + ' ';
    }
  }
  
  return allText.trim();
}

function generateTitleFromContent(mediaContent, processedData) {
  switch (mediaContent.type) {
    case 'audio':
      return processedData.summary ? 
        `Meeting: ${processedData.summary.slice(0, 50)}...` : 
        `Audio Recording - ${mediaContent.metadata.originalFilename}`;
    case 'pdf':
      return processedData.summary ? 
        `Document: ${processedData.summary.slice(0, 50)}...` : 
        `PDF Document - ${mediaContent.metadata.originalFilename}`;
    case 'image':
      return processedData.extractedText ? 
        `Whiteboard: ${processedData.extractedText.slice(0, 50)}...` : 
        `Image Capture - ${mediaContent.metadata.originalFilename}`;
    case 'video':
      return `Video Recording - ${mediaContent.metadata.originalFilename}`;
    default:
      return `File - ${mediaContent.metadata.originalFilename}`;
  }
}

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Fink AI Multi-Modal Backend running on port ${PORT}`));
