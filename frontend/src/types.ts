// Type definitions for the Fink AI Notes app

export interface MediaContent {
  id: string;
  type: 'text' | 'audio' | 'pdf' | 'image' | 'video';
  content: string; // text content or file URL/path
  metadata?: {
    originalFilename?: string;
    fileSize?: number;
    duration?: number; // for audio/video
    dimensions?: { width: number; height: number }; // for images
    transcript?: string; // AI-generated transcript for audio/video
    summary?: string; // AI-generated summary
    extractedText?: string; // OCR text from images or PDF text
  };
  timestamp: string; // when this content was added to the note
}

export interface Note {
  id: string;
  title: string;
  contents: MediaContent[]; // Multi-modal contents array
  createdAt: string;
  updatedAt: string;
  participants?: string[];
  tags?: string[];
  meetingContext?: {
    date?: string;
    attendees?: string[];
    duration?: number;
    summary?: string;
  };
  aiInsights?: {
    keyTopics?: string[];
    actionItems?: string[];
    decisions?: string[];
    nextSteps?: string[];
  };
}

export interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface SearchResponse {
  answer: string;
  source_notes: Note[];
  notes?: Note[]; // for semantic search results
  relevantContent?: MediaContent[]; // specific content pieces that match
}

export interface SearchRequest {
  query: string;
  filters?: string[];
  includeContent?: boolean;
  includeSummary?: boolean;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface CreateNoteRequest {
  title: string;
  contents: MediaContent[];
}

export interface FileUploadResponse {
  success: boolean;
  content?: MediaContent;
  status?: 'processing' | 'completed';
  message?: string;
}

export interface UpdateNoteRequest {
  title: string;
  content: string;
}

export interface SearchRequest {
  query: string;
}
