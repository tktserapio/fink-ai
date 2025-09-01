import OpenAI from 'openai';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Process text content with AI summarization
 */
export async function processTextContent(text) {
  try {
    const response = await openai.chat.completions.create({
      model: process.env.CHAT_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Analyze this text and provide key insights, main topics, and action items if any. Keep it concise.'
        },
        { role: 'user', content: text }
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    return {
      summary: response.choices[0].message.content.trim(),
      keyTopics: extractKeyTopics(text),
    };
  } catch (error) {
    console.error('Error processing text:', error);
    return { summary: null, keyTopics: [] };
  }
}

/**
 * Process audio file - transcription and analysis
 */
export async function processAudioFile(file) {
  try {
    console.log('Processing audio file:', file.originalname);
    
    // Save file temporarily
    const filename = `${uuidv4()}_${file.originalname}`;
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, file.buffer);

    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filepath),
      model: "whisper-1",
    });

    // Clean up temp file
    fs.unlinkSync(filepath);

    // Analyze transcript
    const analysis = await openai.chat.completions.create({
      model: process.env.CHAT_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Analyze this meeting transcript. Extract key topics, decisions made, action items, and participants mentioned. Format as a concise summary.'
        },
        { role: 'user', content: transcription.text }
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    return {
      transcript: transcription.text,
      summary: analysis.choices[0].message.content.trim(),
      duration: estimateAudioDuration(file.size),
      participants: extractParticipants(transcription.text),
      actionItems: extractActionItems(analysis.choices[0].message.content),
    };
  } catch (error) {
    console.error('Error processing audio:', error);
    return { 
      transcript: null, 
      summary: 'Audio processing failed',
      error: error.message 
    };
  }
}

/**
 * Process PDF file - basic handling (simplified for now)
 */
export async function processPdfFile(file) {
  try {
    console.log('Processing PDF file:', file.originalname);
    
    // Save the PDF file
    const filename = `${uuidv4()}_${file.originalname}`;
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, file.buffer);

    // For now, just return basic metadata - PDF text extraction requires more complex setup
    return {
      extractedText: 'PDF text extraction coming soon...',
      summary: `PDF document uploaded: ${file.originalname}`,
      pageCount: null,
      keyTopics: [],
      pdfUrl: `/uploads/${filename}`,
    };
  } catch (error) {
    console.error('Error processing PDF:', error);
    return { 
      extractedText: '', 
      summary: 'PDF processing failed',
      error: error.message 
    };
  }
}

/**
 * Process image file - AI vision analysis for whiteboards/diagrams
 */
export async function processImageFile(file) {
  try {
    console.log('Processing image file:', file.originalname);
    
    // Get image info
    const imageInfo = await sharp(file.buffer).metadata();
    
    // Save the image
    const filename = `${uuidv4()}_${file.originalname}`;
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, file.buffer);

    // Convert image to base64 for OpenAI Vision API
    const base64Image = file.buffer.toString('base64');
    const mimeType = file.mimetype || 'image/jpeg';

    // Use OpenAI Vision API to analyze the image
    let extractedText = '';
    let analysis = { summary: 'Image processed successfully' };
    
    try {
      console.log('Analyzing image with OpenAI Vision API...');
      
      // First try to extract text
      const visionResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "What's in this image? If there's any text, extract it exactly. If there's no text, describe what you see in detail."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      });

      const response = visionResponse.choices[0].message.content;
      
      // Check if the response contains text content or is just a description
      const lowerResponse = response.toLowerCase();
      const hasTextIndicators = ['text:', 'reads:', 'says:', 'written:', 'visible text'];
      const hasText = hasTextIndicators.some(indicator => lowerResponse.includes(indicator));
      
      if (hasText) {
        // Try to extract the actual text content
        const textMatch = response.match(/(?:text|reads|says|written):\s*["']?([^"'\n]+)["']?/i);
        if (textMatch) {
          extractedText = textMatch[1].trim();
          analysis.summary = `Text extracted from image: ${extractedText}`;
        } else {
          extractedText = response;
          analysis.summary = 'Text content identified in image';
        }
      } else {
        // No text found, use the description as extracted content
        extractedText = `Visual Description: ${response}`;
        analysis.summary = 'No text detected - visual description provided';
      }
      
    } catch (visionError) {
      console.error('OpenAI Vision API failed:', visionError);
      
      // Fallback analysis
      extractedText = 'AI vision analysis unavailable';
      analysis.summary = `Image uploaded successfully: ${file.originalname}. Manual review recommended for text content.`;
      
      if (visionError.message.includes('model')) {
        console.log('Note: GPT-4 Vision may not be available in your plan. Consider upgrading for image analysis features.');
      }
    }

    return {
      extractedText: extractedText,
      summary: analysis.summary,
      dimensions: {
        width: imageInfo.width,
        height: imageInfo.height
      },
      imageUrl: `/uploads/${filename}`,
      aiAnalysis: true // Flag to indicate this was processed with AI
    };
  } catch (error) {
    console.error('Error processing image:', error);
    return { 
      extractedText: '', 
      summary: 'Image processing failed',
      error: error.message 
    };
  }
}

/**
 * Process video file - basic metadata extraction
 */
export async function processVideoFile(file) {
  try {
    console.log('Processing video file:', file.originalname);
    
    // Save video file
    const filename = `${uuidv4()}_${file.originalname}`;
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, file.buffer);

    // For now, just return basic info
    // In a production system, you'd use ffmpeg to extract audio and process it
    return {
      summary: 'Video uploaded successfully. Audio extraction coming soon.',
      videoUrl: `/uploads/${filename}`,
      fileSize: file.size,
      duration: null, // Would extract with ffmpeg
    };
  } catch (error) {
    console.error('Error processing video:', error);
    return { 
      summary: 'Video processing failed',
      error: error.message 
    };
  }
}

/**
 * Generate embeddings for content
 */
export async function generateEmbeddings(content) {
  try {
    const response = await openai.embeddings.create({
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      input: content,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    return null;
  }
}

// Helper functions
function extractKeyTopics(text) {
  // Simple keyword extraction - in production, use more sophisticated NLP
  const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
  const frequencies = {};
  words.forEach(word => {
    frequencies[word] = (frequencies[word] || 0) + 1;
  });
  
  return Object.entries(frequencies)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);
}

function extractParticipants(text) {
  // Look for common name patterns in transcripts
  const namePattern = /(?:^|\s)([A-Z][a-z]+(?:\s[A-Z][a-z]+)?):|\b([A-Z][a-z]+)\s(?:said|mentioned|asked)/g;
  const participants = new Set();
  let match;
  
  while ((match = namePattern.exec(text)) !== null) {
    const name = match[1] || match[2];
    if (name && name.length > 1) {
      participants.add(name);
    }
  }
  
  return Array.from(participants).slice(0, 10); // Limit to 10 participants
}

function extractActionItems(analysisText) {
  // Look for action items in the analysis
  const actionPattern = /(?:action items?|tasks?|to-?dos?|follow[- ]?ups?):?\s*([^\.]+)/gi;
  const actionItems = [];
  let match;
  
  while ((match = actionPattern.exec(analysisText)) !== null) {
    actionItems.push(match[1].trim());
  }
  
  return actionItems;
}

function estimateAudioDuration(fileSize) {
  // Rough estimation: assume ~1MB per minute for compressed audio
  return Math.round(fileSize / (1024 * 1024)); // Duration in minutes
}
